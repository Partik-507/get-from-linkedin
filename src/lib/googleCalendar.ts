/**
 * Google Calendar Integration — GIS Token Model
 *
 * Architecture: Google Identity Services (GIS) popup-based token flow.
 *
 * Why this instead of PKCE/Authorization Code:
 *  ✓ NO client_secret required (safe for frontend)
 *  ✓ NO redirect URI matching issues
 *  ✓ NO server-side token exchange
 *  ✓ Popup-based — user never leaves the page
 *  ✓ Official Google recommendation for browser-only SPAs
 *  Docs: https://developers.google.com/identity/oauth2/web/guides/use-token-model
 *
 * Security:
 *  - Access tokens stored in Firestore at users/{uid}/integrations/googleCalendar
 *  - Protected by Firestore security rules (uid isolation)
 *  - Tokens are NEVER stored in localStorage or sessionStorage
 *  - Revocation clears Firestore on disconnect
 */

import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

// ── Config ────────────────────────────────────────────────────────────────────
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly",
].join(" ");
const GOOGLE_CALENDAR_BASE = "https://www.googleapis.com/calendar/v3";

// ── Firestore path ────────────────────────────────────────────────────────────
const tokenRef = (uid: string) =>
  doc(db, "users", uid, "integrations", "googleCalendar");

// ── GIS type shim ─────────────────────────────────────────────────────────────
declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (cfg: GISTokenConfig) => GISTokenClient;
          revoke: (token: string, done: () => void) => void;
        };
      };
    };
  }
}

interface GISTokenConfig {
  client_id: string;
  scope: string;
  prompt?: string;
  callback: (resp: GISTokenResponse) => void;
  error_callback?: (err: { type: string }) => void;
}

interface GISTokenClient {
  requestAccessToken: (opts?: { prompt?: string }) => void;
}

interface GISTokenResponse {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

// ── Load GIS script (once) ────────────────────────────────────────────────────
let _gisPromise: Promise<void> | null = null;

function loadGIS(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (_gisPromise) return _gisPromise;

  _gisPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => {
      _gisPromise = null;
      reject(new Error("Could not load Google Identity Services. Check network connection."));
    };
    document.head.appendChild(s);
  });

  return _gisPromise;
}

// ── Token storage types ───────────────────────────────────────────────────────
export interface StoredGCalTokens {
  accessToken: string;
  expiresAt: number; // unix ms
  email: string;
  connectedAt: number;
}

export interface CalendarStatus {
  connected: boolean;
  email?: string;
  connectedAt?: number;
}

// ── Connect — opens Google popup, stores token in Firestore ───────────────────
export async function connectGoogleCalendar(
  uid: string,
  onSuccess: (email: string) => void,
  onError: (err: Error) => void
): Promise<void> {
  if (!GOOGLE_CLIENT_ID) {
    onError(new Error("VITE_GOOGLE_CLIENT_ID is not set in .env"));
    return;
  }

  try {
    await loadGIS();
  } catch (e: any) {
    onError(e);
    return;
  }

  const client = window.google!.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: SCOPES,
    callback: async (resp: GISTokenResponse) => {
      if (resp.error || !resp.access_token) {
        onError(new Error(resp.error_description || resp.error || "Authorization denied"));
        return;
      }

      try {
        // Get the user's email with the new token
        const infoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
          headers: { Authorization: `Bearer ${resp.access_token}` },
        });
        const { email = "" } = await infoRes.json();

        // Persist to Firestore — never to localStorage
        const tokens: StoredGCalTokens = {
          accessToken: resp.access_token,
          expiresAt: Date.now() + (resp.expires_in || 3600) * 1000,
          email,
          connectedAt: Date.now(),
        };

        await setDoc(tokenRef(uid), tokens);
        onSuccess(email);
      } catch (e: any) {
        onError(new Error(e?.message || "Failed to store tokens"));
      }
    },
    error_callback: (err) => {
      if (err.type === "popup_closed") {
        onError(new Error("Popup was closed. Please try again."));
      } else {
        onError(new Error(`Authorization error: ${err.type}`));
      }
    },
  });

  // Show Google consent popup
  client.requestAccessToken({ prompt: "consent" });
}

// ── Silent token refresh (no popup if already consented) ─────────────────────
export function silentRefreshGCalToken(uid: string): Promise<string | null> {
  return new Promise(async (resolve) => {
    try {
      await loadGIS();
    } catch {
      resolve(null);
      return;
    }

    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: SCOPES,
      prompt: "",
      callback: async (resp: GISTokenResponse) => {
        if (!resp.access_token || resp.error) {
          resolve(null);
          return;
        }
        // Update stored token in Firestore
        try {
          const snap = await getDoc(tokenRef(uid));
          if (snap.exists()) {
            await setDoc(tokenRef(uid), {
              ...(snap.data() as StoredGCalTokens),
              accessToken: resp.access_token,
              expiresAt: Date.now() + (resp.expires_in || 3600) * 1000,
            });
          }
          resolve(resp.access_token);
        } catch {
          resolve(null);
        }
      },
    });

    client.requestAccessToken({ prompt: "" });
  });
}

// ── Get a valid access token (auto-refreshes silently) ────────────────────────
export async function getValidAccessToken(uid: string): Promise<string> {
  const snap = await getDoc(tokenRef(uid));
  if (!snap.exists()) throw new Error("Google Calendar not connected.");

  const tokens = snap.data() as StoredGCalTokens;
  const needsRefresh = tokens.expiresAt < Date.now() + 5 * 60 * 1000;

  if (!needsRefresh) return tokens.accessToken;

  // Attempt silent refresh
  const refreshed = await silentRefreshGCalToken(uid);
  if (refreshed) return refreshed;

  // Silent refresh failed — clear stale token
  await deleteDoc(tokenRef(uid));
  throw new Error("SESSION_EXPIRED");
}

// ── Status check ──────────────────────────────────────────────────────────────
export async function getCalendarConnectionStatus(uid: string): Promise<CalendarStatus> {
  try {
    const snap = await getDoc(tokenRef(uid));
    if (!snap.exists()) return { connected: false };
    const data = snap.data() as StoredGCalTokens;
    return { connected: true, email: data.email, connectedAt: data.connectedAt };
  } catch {
    return { connected: false };
  }
}

// ── Disconnect — revoke + clear Firestore ────────────────────────────────────
export async function disconnectGoogleCalendar(uid: string): Promise<void> {
  const snap = await getDoc(tokenRef(uid));
  if (!snap.exists()) return;

  const { accessToken } = snap.data() as StoredGCalTokens;

  // Best-effort revocation via GIS
  try {
    await loadGIS();
    window.google?.accounts.oauth2.revoke(accessToken, () => {});
  } catch { /* non-fatal */ }

  await deleteDoc(tokenRef(uid));
}

// ── Google Calendar API ───────────────────────────────────────────────────────
export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  colorId?: string;
  source: "google";
}

const COLOR_MAP: Record<string, string> = {
  "1": "#7986CB", "2": "#33B679", "3": "#8E24AA", "4": "#E67C73",
  "5": "#F6BF26", "6": "#F4511E", "7": "#039BE5", "8": "#616161",
  "9": "#3F51B5", "10": "#0B8043", "11": "#D50000",
};

export function googleColorToHex(colorId?: string): string {
  return colorId ? (COLOR_MAP[colorId] ?? "#4285F4") : "#4285F4";
}

export async function fetchGoogleCalendarEvents(
  uid: string,
  timeMin: Date,
  timeMax: Date
): Promise<GoogleCalendarEvent[]> {
  const token = await getValidAccessToken(uid);

  const res = await fetch(
    `${GOOGLE_CALENDAR_BASE}/calendars/primary/events?` +
      new URLSearchParams({
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: "true",
        orderBy: "startTime",
        maxResults: "250",
      }),
    { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || res.statusText);
  }

  const data = await res.json();
  return (data.items || []).map((e: any) => ({ ...e, source: "google" as const }));
}

export interface CreateGoogleEventPayload {
  summary: string;
  description?: string;
  location?: string;
  start: Date;
  end: Date;
  allDay?: boolean;
}

export async function createGoogleCalendarEvent(
  uid: string,
  payload: CreateGoogleEventPayload
): Promise<GoogleCalendarEvent> {
  const token = await getValidAccessToken(uid);
  const fmt = (d: Date) => d.toISOString().split("T")[0];
  const body: any = {
    summary: payload.summary,
    description: payload.description || "",
    location: payload.location || "",
    start: payload.allDay ? { date: fmt(payload.start) } : { dateTime: payload.start.toISOString() },
    end: payload.allDay ? { date: fmt(payload.end) } : { dateTime: payload.end.toISOString() },
  };

  const res = await fetch(`${GOOGLE_CALENDAR_BASE}/calendars/primary/events`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || res.statusText);
  }

  return { ...(await res.json()), source: "google" as const };
}

export async function updateGoogleCalendarEvent(
  uid: string,
  eventId: string,
  payload: Partial<CreateGoogleEventPayload>
): Promise<GoogleCalendarEvent> {
  const token = await getValidAccessToken(uid);
  const fmt = (d: Date) => d.toISOString().split("T")[0];
  const body: any = {};
  if (payload.summary !== undefined) body.summary = payload.summary;
  if (payload.description !== undefined) body.description = payload.description;
  if (payload.location !== undefined) body.location = payload.location;
  if (payload.start && payload.end) {
    body.start = payload.allDay ? { date: fmt(payload.start) } : { dateTime: payload.start.toISOString() };
    body.end = payload.allDay ? { date: fmt(payload.end) } : { dateTime: payload.end.toISOString() };
  }

  const res = await fetch(
    `${GOOGLE_CALENDAR_BASE}/calendars/primary/events/${encodeURIComponent(eventId)}`,
    {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || res.statusText);
  }

  return { ...(await res.json()), source: "google" as const };
}

export async function deleteGoogleCalendarEvent(uid: string, eventId: string): Promise<void> {
  const token = await getValidAccessToken(uid);
  const res = await fetch(
    `${GOOGLE_CALENDAR_BASE}/calendars/primary/events/${encodeURIComponent(eventId)}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok && res.status !== 410) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || res.statusText);
  }
}

// ── App event shape converter ─────────────────────────────────────────────────
export interface AppCalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  color: string;
  allDay: boolean;
  description: string;
  location: string;
  recurrence: string;
  googleEventId?: string;
  source: "local" | "google";
}

export function googleEventToAppEvent(ge: GoogleCalendarEvent): AppCalendarEvent {
  const allDay = !ge.start.dateTime;
  const parse = (s?: string, fb = new Date()) => {
    if (!s) return fb;
    const d = new Date(s);
    return isNaN(d.getTime()) ? fb : d;
  };
  const start = parse(ge.start.dateTime || ge.start.date);
  const end = parse(ge.end.dateTime || ge.end.date, new Date(start.getTime() + 3600_000));

  return {
    id: `gcal_${ge.id}`,
    title: ge.summary || "(No title)",
    start,
    end,
    color: googleColorToHex(ge.colorId),
    allDay,
    description: ge.description || "",
    location: ge.location || "",
    recurrence: "none",
    googleEventId: ge.id,
    source: "google",
  };
}
