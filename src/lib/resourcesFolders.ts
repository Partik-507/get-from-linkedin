/**
 * resourcesFolders — Firestore CRUD for Library (Resources) folder tree.
 *
 * Public folders: only admins can create/rename/delete.
 * Private folders: scoped per-user under `users/{uid}/resourceFolders`.
 *
 * Each folder has: { id, name, parentId, ownerId, scope, order, createdAt }
 */

import {
  collection, doc, getDocs, addDoc, updateDoc, deleteDoc,
  serverTimestamp, query, where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export type FolderScope = "public" | "private";

export interface LibraryFolder {
  id: string;
  name: string;
  parentId: string;       // "root" for top-level
  scope: FolderScope;
  ownerId?: string | null;
  order: number;
  createdAt?: any;
}

const PUBLIC_COLL = "resourceFolders";
const PRIVATE_COLL = (uid: string) => `users/${uid}/resourceFolders`;

export const fetchPublicFolders = async (): Promise<LibraryFolder[]> => {
  const snap = await getDocs(collection(db, PUBLIC_COLL));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<LibraryFolder, "id">), scope: "public" }));
};

export const fetchPrivateFolders = async (uid: string): Promise<LibraryFolder[]> => {
  const snap = await getDocs(collection(db, PRIVATE_COLL(uid)));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<LibraryFolder, "id">), scope: "private" }));
};

export const createFolder = async (
  scope: FolderScope,
  name: string,
  parentId: string,
  uid?: string | null,
): Promise<LibraryFolder> => {
  const collPath = scope === "public" ? PUBLIC_COLL : PRIVATE_COLL(uid!);
  const ref = await addDoc(collection(db, collPath), {
    name, parentId, scope, ownerId: uid || null, order: Date.now(),
    createdAt: serverTimestamp(),
  });
  return { id: ref.id, name, parentId, scope, ownerId: uid || null, order: Date.now() };
};

export const renameFolder = async (
  scope: FolderScope, id: string, name: string, uid?: string | null,
) => {
  const collPath = scope === "public" ? PUBLIC_COLL : PRIVATE_COLL(uid!);
  await updateDoc(doc(db, collPath, id), { name });
};

export const deleteFolder = async (
  scope: FolderScope, id: string, uid?: string | null,
) => {
  const collPath = scope === "public" ? PUBLIC_COLL : PRIVATE_COLL(uid!);
  await deleteDoc(doc(db, collPath, id));
};

export const moveFolder = async (
  scope: FolderScope, id: string, newParentId: string, uid?: string | null,
) => {
  const collPath = scope === "public" ? PUBLIC_COLL : PRIVATE_COLL(uid!);
  await updateDoc(doc(db, collPath, id), { parentId: newParentId });
};

/** Build hierarchical tree from flat folder list */
export interface FolderNode extends LibraryFolder {
  children: FolderNode[];
  depth: number;
}

export const buildFolderTree = (folders: LibraryFolder[]): FolderNode[] => {
  const map = new Map<string, FolderNode>();
  folders.forEach((f) => map.set(f.id, { ...f, children: [], depth: 0 }));
  const roots: FolderNode[] = [];
  folders.forEach((f) => {
    const node = map.get(f.id)!;
    if (f.parentId === "root" || !map.has(f.parentId)) {
      roots.push(node);
    } else {
      const parent = map.get(f.parentId)!;
      node.depth = parent.depth + 1;
      parent.children.push(node);
    }
  });
  const sortRec = (nodes: FolderNode[]) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name));
    nodes.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);
  return roots;
};
