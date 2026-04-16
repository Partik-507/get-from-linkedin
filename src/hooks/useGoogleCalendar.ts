/**
 * useGoogleCalendar — React hook for Google Calendar (GIS Token Model)
 *
 * Connection is popup-based — no redirect, no client_secret.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import {
  getCalendarConnectionStatus,
  connectGoogleCalendar,
  disconnectGoogleCalendar,
  fetchGoogleCalendarEvents,
  createGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
  updateGoogleCalendarEvent,
  googleEventToAppEvent,
  type AppCalendarEvent,
  type CalendarStatus,
  type CreateGoogleEventPayload,
} from "@/lib/googleCalendar";

export type CalendarConnectionState =
  | "idle"
  | "checking"
  | "connected"
  | "disconnected"
  | "connecting"
  | "error"
  | "syncing";

interface UseGoogleCalendarOptions {
  uid: string | null;
  rangeStart: Date;
  rangeEnd: Date;
  onEventsLoaded?: (events: AppCalendarEvent[]) => void;
}

interface UseGoogleCalendarReturn {
  connectionState: CalendarConnectionState;
  calendarStatus: CalendarStatus | null;
  googleEvents: AppCalendarEvent[];
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  refetch: () => Promise<void>;
  createEvent: (payload: CreateGoogleEventPayload) => Promise<AppCalendarEvent | null>;
  deleteEvent: (googleEventId: string) => Promise<void>;
  updateEvent: (googleEventId: string, payload: Partial<CreateGoogleEventPayload>) => Promise<AppCalendarEvent | null>;
}

const MIN_FETCH_INTERVAL = 30_000; // 30s between fetches

export function useGoogleCalendar({
  uid,
  rangeStart,
  rangeEnd,
  onEventsLoaded,
}: UseGoogleCalendarOptions): UseGoogleCalendarReturn {
  const [connectionState, setConnectionState] = useState<CalendarConnectionState>("idle");
  const [calendarStatus, setCalendarStatus] = useState<CalendarStatus | null>(null);
  const [googleEvents, setGoogleEvents] = useState<AppCalendarEvent[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const lastFetchRef = useRef<number>(0);
  const rangeStartStr = rangeStart.toDateString();
  const rangeEndStr = rangeEnd.toDateString();

  // ── Check status on mount / uid change ──────────────────────────────────
  const checkStatus = useCallback(async () => {
    if (!uid) {
      setConnectionState("disconnected");
      setCalendarStatus(null);
      return;
    }
    setConnectionState("checking");
    try {
      const status = await getCalendarConnectionStatus(uid);
      setCalendarStatus(status);
      setConnectionState(status.connected ? "connected" : "disconnected");
    } catch {
      setConnectionState("error");
      setCalendarStatus(null);
    }
  }, [uid]);

  useEffect(() => { checkStatus(); }, [checkStatus]);

  // ── Fetch events when connected ──────────────────────────────────────────
  const fetchEvents = useCallback(async (force = false) => {
    if (!uid || connectionState !== "connected") return;

    const now = Date.now();
    if (!force && now - lastFetchRef.current < MIN_FETCH_INTERVAL) return;
    lastFetchRef.current = now;

    setIsSyncing(true);
    try {
      const raw = await fetchGoogleCalendarEvents(uid, rangeStart, rangeEnd);
      const mapped = raw.map(googleEventToAppEvent);
      setGoogleEvents(mapped);
      setLastSyncedAt(new Date());
      onEventsLoaded?.(mapped);
    } catch (err: any) {
      const msg: string = err?.message || "";
      if (msg === "SESSION_EXPIRED") {
        setConnectionState("disconnected");
        setCalendarStatus(null);
        setGoogleEvents([]);
        toast.error("Google Calendar session expired. Please reconnect.");
      } else {
        toast.error(msg || "Failed to sync Google Calendar.");
      }
    } finally {
      setIsSyncing(false);
    }
  }, [uid, connectionState, rangeStart, rangeEnd, onEventsLoaded]);

  useEffect(() => {
    if (connectionState === "connected") fetchEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionState, rangeStartStr, rangeEndStr]);

  // ── Connect — opens GIS popup ────────────────────────────────────────────
  const connect = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      if (!uid) {
        toast.error("Please sign in before connecting Google Calendar.");
        resolve();
        return;
      }

      setConnectionState("connecting");

      connectGoogleCalendar(
        uid,
        (email) => {
          // Success
          setCalendarStatus({ connected: true, email, connectedAt: Date.now() });
          setConnectionState("connected");
          toast.success(`Google Calendar connected as ${email}`);
          resolve();
        },
        (err) => {
          // Error or user closed popup
          const msg = err?.message || "Failed to connect.";
          if (!msg.includes("closed")) {
            toast.error(msg);
          }
          setConnectionState("disconnected");
          resolve();
        }
      );
    });
  }, [uid]);

  // ── Disconnect ───────────────────────────────────────────────────────────
  const disconnect = useCallback(async () => {
    if (!uid) return;
    try {
      await disconnectGoogleCalendar(uid);
      setGoogleEvents([]);
      setCalendarStatus(null);
      setLastSyncedAt(null);
      setConnectionState("disconnected");
      toast.success("Google Calendar disconnected.");
    } catch {
      toast.error("Failed to disconnect. Please try again.");
    }
  }, [uid]);

  // ── Refetch ──────────────────────────────────────────────────────────────
  const refetch = useCallback(() => fetchEvents(true), [fetchEvents]);

  // ── Create event ─────────────────────────────────────────────────────────
  const createEvent = useCallback(
    async (payload: CreateGoogleEventPayload): Promise<AppCalendarEvent | null> => {
      if (!uid) return null;
      try {
        const ge = await createGoogleCalendarEvent(uid, payload);
        const ae = googleEventToAppEvent(ge);
        setGoogleEvents((prev) => [...prev, ae]);
        return ae;
      } catch (err: any) {
        toast.error(err?.message || "Failed to create event.");
        return null;
      }
    },
    [uid]
  );

  // ── Delete event ─────────────────────────────────────────────────────────
  const deleteEvent = useCallback(
    async (googleEventId: string): Promise<void> => {
      if (!uid) return;
      try {
        await deleteGoogleCalendarEvent(uid, googleEventId);
        setGoogleEvents((prev) => prev.filter((e) => e.googleEventId !== googleEventId));
      } catch (err: any) {
        toast.error(err?.message || "Failed to delete event.");
      }
    },
    [uid]
  );

  // ── Update event ─────────────────────────────────────────────────────────
  const updateEvent = useCallback(
    async (
      googleEventId: string,
      payload: Partial<CreateGoogleEventPayload>
    ): Promise<AppCalendarEvent | null> => {
      if (!uid) return null;
      try {
        const ge = await updateGoogleCalendarEvent(uid, googleEventId, payload);
        const ae = googleEventToAppEvent(ge);
        setGoogleEvents((prev) => prev.map((e) => (e.googleEventId === googleEventId ? ae : e)));
        return ae;
      } catch (err: any) {
        toast.error(err?.message || "Failed to update event.");
        return null;
      }
    },
    [uid]
  );

  return {
    connectionState,
    calendarStatus,
    googleEvents,
    isSyncing,
    lastSyncedAt,
    connect,
    disconnect,
    refetch,
    createEvent,
    deleteEvent,
    updateEvent,
  };
}
