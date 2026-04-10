import { doc, getDoc, setDoc, collection, getDocs, addDoc, deleteDoc, updateDoc, serverTimestamp, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PublicWorkspaceNote {
  id: string;
  title: string;
  parentId: string; // "root" or parent note id
  icon?: string;
  coverImage?: string;
  order: number;
  createdAt: any;
  updatedAt: any;
  createdBy: string;
}

export interface PublicWorkspaceSubmission {
  id: string;
  title: string;
  content: string;
  subject: string;
  branch: string;
  authorId: string;
  authorName: string;
  status: "pending" | "approved" | "rejected";
  createdAt: any;
}

// ─── Permission Check ───────────────────────────────────────────────────────

export const checkEditorPermission = async (uid: string): Promise<boolean> => {
  try {
    const settingsDoc = await getDoc(doc(db, "publicWorkspace", "settings"));
    if (!settingsDoc.exists()) return false;
    const data = settingsDoc.data();
    const allowedEditors: string[] = data?.allowedEditors || [];
    return allowedEditors.includes(uid);
  } catch {
    return false;
  }
};

// ─── Notes CRUD ─────────────────────────────────────────────────────────────

export const fetchPublicWorkspaceNotes = async (): Promise<PublicWorkspaceNote[]> => {
  try {
    const snap = await getDocs(collection(db, "publicWorkspace", "data", "notes"));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as PublicWorkspaceNote));
  } catch { return []; }
};

export const fetchPublicWorkspaceContent = async (noteId: string): Promise<string> => {
  try {
    const contentDoc = await getDoc(doc(db, "publicWorkspace", "data", "notes", noteId, "content", "body"));
    if (contentDoc.exists()) return contentDoc.data().content || "";
    return "";
  } catch { return ""; }
};

export const createPublicWorkspaceNote = async (
  uid: string,
  title: string,
  parentId = "root",
  order = 0
): Promise<PublicWorkspaceNote> => {
  const noteData = {
    title,
    parentId,
    icon: "",
    coverImage: "",
    order,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: uid,
  };
  const ref = await addDoc(collection(db, "publicWorkspace", "data", "notes"), noteData);
  return { id: ref.id, ...noteData } as PublicWorkspaceNote;
};

export const savePublicWorkspaceContent = async (noteId: string, content: string) => {
  await setDoc(doc(db, "publicWorkspace", "data", "notes", noteId, "content", "body"), { content });
  await updateDoc(doc(db, "publicWorkspace", "data", "notes", noteId), { updatedAt: serverTimestamp() });
};

export const updatePublicWorkspaceNote = async (noteId: string, data: Partial<PublicWorkspaceNote>) => {
  await updateDoc(doc(db, "publicWorkspace", "data", "notes", noteId), { ...data, updatedAt: serverTimestamp() });
};

export const deletePublicWorkspaceNote = async (noteId: string) => {
  try { await deleteDoc(doc(db, "publicWorkspace", "data", "notes", noteId, "content", "body")); } catch {}
  await deleteDoc(doc(db, "publicWorkspace", "data", "notes", noteId));
};

// ─── Submissions ────────────────────────────────────────────────────────────

export const submitNote = async (
  uid: string,
  authorName: string,
  data: { title: string; content: string; subject: string; branch: string }
): Promise<string> => {
  const ref = await addDoc(collection(db, "publicWorkspace", "submissions", "items"), {
    ...data,
    authorId: uid,
    authorName,
    status: "pending",
    createdAt: serverTimestamp(),
  });
  return ref.id;
};

export const fetchSubmissions = async (): Promise<PublicWorkspaceSubmission[]> => {
  try {
    const snap = await getDocs(collection(db, "publicWorkspace", "submissions", "items"));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as PublicWorkspaceSubmission));
  } catch { return []; }
};

export const approveSubmission = async (submissionId: string, noteId: string) => {
  await updateDoc(doc(db, "publicWorkspace", "submissions", "items", submissionId), { status: "approved" });
};

export const rejectSubmission = async (submissionId: string) => {
  await updateDoc(doc(db, "publicWorkspace", "submissions", "items", submissionId), { status: "rejected" });
};

// ─── Sharing ────────────────────────────────────────────────────────────────

export const shareNote = async (
  noteId: string,
  title: string,
  content: string,
  authorName: string
): Promise<string> => {
  const shareId = noteId;
  await setDoc(doc(db, "sharedNotes", shareId), {
    title,
    content,
    authorName,
    sharedAt: serverTimestamp(),
  });
  return shareId;
};

// ─── Version History (Public Workspace) ─────────────────────────────────────

export const savePublicVersion = async (noteId: string, content: string, title: string) => {
  const versionId = Date.now().toString();
  await setDoc(doc(db, "publicWorkspace", "data", "notes", noteId, "versions", versionId), {
    content, title, savedAt: serverTimestamp(),
  });
};

export const getPublicVersions = async (noteId: string) => {
  try {
    const snap = await getDocs(collection(db, "publicWorkspace", "data", "notes", noteId, "versions"));
    return snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => parseInt(b.id) - parseInt(a.id));
  } catch { return []; }
};
