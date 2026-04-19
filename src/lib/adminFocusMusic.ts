/**
 * adminFocusMusic — Firestore CRUD for admin-curated focus music tracks.
 * Hydrates into focusMusicLibrary on app boot.
 */
import { collection, doc, getDocs, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { setDynamicTracks, type FocusTrack } from "@/lib/focusMusicLibrary";

const COLL = "focusMusic";

export interface AdminFocusTrack extends FocusTrack {
  createdBy?: string;
  createdAt?: any;
}

export const fetchAdminTracks = async (): Promise<AdminFocusTrack[]> => {
  const snap = await getDocs(collection(db, COLL));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AdminFocusTrack, "id">) }));
};

export const hydrateMusic = async () => {
  try {
    const tracks = await fetchAdminTracks();
    setDynamicTracks(tracks.map((t) => ({ ...t, custom: true })));
  } catch { /* fall back silently */ }
};

export const saveAdminTrack = async (t: AdminFocusTrack) => {
  await setDoc(doc(db, COLL, t.id), { ...t, createdAt: t.createdAt || serverTimestamp() }, { merge: true });
};

export const deleteAdminTrack = async (id: string) => {
  await deleteDoc(doc(db, COLL, id));
};
