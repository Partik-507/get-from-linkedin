/**
 * adminFocusAnimations — Firestore CRUD for admin-defined animation overlays.
 * Combined with built-in registry from focusAnimationLibrary.
 */
import { collection, doc, getDocs, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { AnimationKey } from "@/lib/focusAnimationLibrary";

const COLL = "focusAnimations";

export interface AdminFocusAnimation {
  id: string;
  key: AnimationKey;
  label: string;
  emoji: string;
  preview: string;
  overlayType?: string;
  intensity?: number;
  createdBy?: string;
  createdAt?: any;
}

export const fetchAdminAnimations = async (): Promise<AdminFocusAnimation[]> => {
  const snap = await getDocs(collection(db, COLL));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AdminFocusAnimation, "id">) }));
};

export const saveAdminAnimation = async (a: AdminFocusAnimation) => {
  await setDoc(doc(db, COLL, a.id), { ...a, createdAt: a.createdAt || serverTimestamp() }, { merge: true });
};

export const deleteAdminAnimation = async (id: string) => {
  await deleteDoc(doc(db, COLL, id));
};
