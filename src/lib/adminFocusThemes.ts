/**
 * adminFocusThemes — Firestore CRUD for admin-managed Focus themes.
 *
 * Admins can add custom themes (background image, overlay type, audio).
 * Themes are stored in `focusThemes/{id}` and hydrated into the local
 * registry (focusThemes.ts) on app boot.
 */

import {
  collection, doc, getDocs, setDoc, deleteDoc, serverTimestamp,
} from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { setDynamicThemes, type FocusTheme, type OverlayType } from "@/lib/focusThemes";

const COLL = "focusThemes";

export interface AdminFocusTheme extends FocusTheme {
  videoUrl?: string;
  createdBy?: string;
  createdAt?: any;
}

export const fetchAdminThemes = async (): Promise<AdminFocusTheme[]> => {
  const snap = await getDocs(collection(db, COLL));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AdminFocusTheme, "id">) }));
};

export const hydrateThemes = async () => {
  try {
    const themes = await fetchAdminThemes();
    setDynamicThemes(themes.map((t) => ({ ...t, custom: true })));
  } catch {
    // silently fall back to built-in themes
  }
};

export const saveAdminTheme = async (theme: AdminFocusTheme) => {
  const ref = doc(db, COLL, theme.id);
  await setDoc(ref, { ...theme, createdAt: theme.createdAt || serverTimestamp() }, { merge: true });
};

export const deleteAdminTheme = async (id: string) => {
  await deleteDoc(doc(db, COLL, id));
};

export const uploadFocusAsset = async (
  file: File,
  kind: "image" | "audio" | "video",
): Promise<string> => {
  const ext = file.name.split(".").pop() || "bin";
  const path = `focus-themes/${kind}s/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const ref = storageRef(storage, path);
  await uploadBytes(ref, file);
  return await getDownloadURL(ref);
};

export const OVERLAY_OPTIONS: { value: OverlayType; label: string }[] = [
  { value: "snow", label: "❄️ Snow" },
  { value: "rain", label: "🌧️ Rain" },
  { value: "dust", label: "✨ Dust" },
  { value: "glow", label: "🔆 Glow" },
  { value: "blossom", label: "🌸 Blossom" },
  { value: "leaves", label: "🍂 Leaves" },
  { value: "fireflies", label: "🪲 Fireflies" },
  { value: "gradient-drift", label: "🌊 Gradient Drift" },
  { value: "candle", label: "🕯️ Candle Flicker" },
];
