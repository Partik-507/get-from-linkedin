import { doc, getDoc, setDoc, collection, getDocs, addDoc, deleteDoc, updateDoc, serverTimestamp, query, orderBy, limit as firestoreLimit, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";

// ============ TYPES ============
export interface NoteMetadata {
  id: string;
  title: string;
  folderId: string;
  parentNoteId?: string;
  tags: string[];
  type: "document" | "canvas" | "table";
  wordCount: number;
  characterCount: number;
  isPinned: boolean;
  isPublic: boolean;
  status: string;
  icon?: string;
  coverImage?: string;
  publishedNoteId?: string;
  linkedNoteIds?: string[];
  properties?: Record<string, any>;
  version: number;
  isArchived?: boolean;
  deletedAt?: any;
  courseId?: string;
  createdAt: any;
  updatedAt: any;
  lastOpenedAt?: any;
}

export interface FolderItem {
  id: string;
  name: string;
  parentId: string;
  order: number;
  color?: string;
  icon?: string;
}

export interface PublicNote {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  title: string;
  description: string;
  tags: string[];
  subject?: string;
  branch?: string;
  level?: string;
  likes: number;
  views: number;
  saves: number;
  forksCount: number;
  publishedAt: any;
  updatedAt: any;
  status: "pending" | "approved" | "published";
  adminCreated: boolean;
  coverImage?: string;
}

export interface VersionSnapshot {
  id: string;
  content: string;
  title: string;
  savedAt: any;
  version: number;
}

export interface CanvasData {
  id: string;
  name: string;
  nodes: Array<{ noteId: string; x: number; y: number; width: number; height: number; type?: string; content?: string }>;
  edges: Array<{ from: string; to: string }>;
  createdAt: any;
  updatedAt: any;
}

// ============ CACHE HELPERS ============
const CACHE_PREFIX = "note_content_";
const RECENT_KEY = "vv_recent_notes";

export const getCachedContent = (noteId: string, updatedAt: string): string | null => {
  try {
    const key = `${CACHE_PREFIX}${noteId}`;
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    const parsed = JSON.parse(cached);
    if (parsed.updatedAt === updatedAt) return parsed.content;
    return null;
  } catch { return null; }
};

export const setCachedContent = (noteId: string, content: string, updatedAt: string) => {
  try {
    localStorage.setItem(`${CACHE_PREFIX}${noteId}`, JSON.stringify({ content, updatedAt }));
  } catch { /* quota exceeded, ignore */ }
};

export const getRecentNoteIds = (): string[] => {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); } catch { return []; }
};

export const pushRecentNoteId = (id: string) => {
  const r = getRecentNoteIds().filter(x => x !== id);
  r.unshift(id);
  localStorage.setItem(RECENT_KEY, JSON.stringify(r.slice(0, 10)));
};

// ============ NOTES CRUD ============
export const fetchNoteMetadata = async (uid: string): Promise<NoteMetadata[]> => {
  try {
    const snap = await getDocs(collection(db, "users", uid, "notes"));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as NoteMetadata));
  } catch { return []; }
};

export const fetchNoteContent = async (uid: string, noteId: string): Promise<string> => {
  try {
    const contentDoc = await getDoc(doc(db, "users", uid, "notes", noteId, "content", "body"));
    if (contentDoc.exists()) return contentDoc.data().content || "";
    // Fallback: check if content is inline on the note doc itself (legacy)
    const noteDoc = await getDoc(doc(db, "users", uid, "notes", noteId));
    if (noteDoc.exists() && noteDoc.data().content) return noteDoc.data().content;
    return "";
  } catch { return ""; }
};

export const createNote = async (uid: string, data: Partial<NoteMetadata>, content = ""): Promise<NoteMetadata> => {
  const noteData: any = {
    title: data.title || "Untitled",
    folderId: data.folderId || "root",
    tags: data.tags || [],
    type: data.type || "document",
    wordCount: content.replace(/<[^>]+>/g, "").split(/\s+/).filter(Boolean).length,
    characterCount: content.replace(/<[^>]+>/g, "").length,
    isPinned: false,
    isPublic: false,
    status: "draft",
    icon: data.icon || "",
    coverImage: data.coverImage || "",
    linkedNoteIds: [],
    properties: data.properties || {},
    version: 0,
    isArchived: false,
    courseId: data.courseId || "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastOpenedAt: serverTimestamp(),
  };
  const ref = await addDoc(collection(db, "users", uid, "notes"), noteData);
  // Save content in subcollection
  if (content) {
    await setDoc(doc(db, "users", uid, "notes", ref.id, "content", "body"), { content });
  }
  return { id: ref.id, ...noteData } as NoteMetadata;
};

export const updateNoteMetadata = async (uid: string, noteId: string, data: Partial<NoteMetadata>) => {
  await updateDoc(doc(db, "users", uid, "notes", noteId), { ...data, updatedAt: serverTimestamp() });
};

export const saveNoteContent = async (uid: string, noteId: string, content: string) => {
  await setDoc(doc(db, "users", uid, "notes", noteId, "content", "body"), { content });
  // Update word/char count on metadata
  const plainText = content.replace(/<[^>]+>/g, "");
  const wordCount = plainText.split(/\s+/).filter(Boolean).length;
  const characterCount = plainText.length;
  await updateDoc(doc(db, "users", uid, "notes", noteId), {
    wordCount, characterCount, updatedAt: serverTimestamp(),
  });
};

export const deleteNote = async (uid: string, noteId: string, permanent = false) => {
  if (permanent) {
    await deleteDoc(doc(db, "users", uid, "notes", noteId));
    try { await deleteDoc(doc(db, "users", uid, "notes", noteId, "content", "body")); } catch {}
  } else {
    await updateDoc(doc(db, "users", uid, "notes", noteId), { deletedAt: serverTimestamp() });
  }
};

export const restoreNote = async (uid: string, noteId: string) => {
  await updateDoc(doc(db, "users", uid, "notes", noteId), { deletedAt: null });
};

// ============ FOLDERS ============
export const fetchFolders = async (uid: string): Promise<FolderItem[]> => {
  try {
    const snap = await getDocs(collection(db, "users", uid, "noteFolders"));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as FolderItem));
  } catch { return []; }
};

export const createFolder = async (uid: string, name: string, parentId = "root", order = 0): Promise<FolderItem> => {
  const ref = await addDoc(collection(db, "users", uid, "noteFolders"), {
    name, parentId, order, color: "", icon: "",
  });
  return { id: ref.id, name, parentId, order };
};

export const updateFolder = async (uid: string, folderId: string, data: Partial<FolderItem>) => {
  await updateDoc(doc(db, "users", uid, "noteFolders", folderId), data);
};

export const deleteFolder = async (uid: string, folderId: string) => {
  await deleteDoc(doc(db, "users", uid, "noteFolders", folderId));
};

// ============ VERSIONS ============
export const saveVersionSnapshot = async (uid: string, noteId: string, content: string, title: string, version: number) => {
  const versionId = Date.now().toString();
  await setDoc(doc(db, "users", uid, "notes", noteId, "versions", versionId), {
    content, title, savedAt: serverTimestamp(), version,
  });
  // Clean old versions (keep last 20)
  try {
    const snap = await getDocs(collection(db, "users", uid, "notes", noteId, "versions"));
    const versions = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => {
      return (b.savedAt?.toDate?.()?.getTime?.() || parseInt(b.id)) - (a.savedAt?.toDate?.()?.getTime?.() || parseInt(a.id));
    });
    if (versions.length > 20) {
      for (const v of versions.slice(20)) {
        await deleteDoc(doc(db, "users", uid, "notes", noteId, "versions", v.id));
      }
    }
  } catch {}
};

export const getVersionSnapshots = async (uid: string, noteId: string): Promise<VersionSnapshot[]> => {
  try {
    const snap = await getDocs(collection(db, "users", uid, "notes", noteId, "versions"));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as VersionSnapshot))
      .sort((a, b) => parseInt(b.id) - parseInt(a.id));
  } catch { return []; }
};

// ============ PUBLIC LIBRARY ============
export const fetchPublicNotes = async (): Promise<PublicNote[]> => {
  try {
    const snap = await getDocs(collection(db, "publicNotes"));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as PublicNote));
  } catch { return []; }
};

export const fetchPublicNoteContent = async (noteId: string): Promise<string> => {
  try {
    const contentDoc = await getDoc(doc(db, "publicNotes", noteId, "content", "body"));
    if (contentDoc.exists()) return contentDoc.data().content || "";
    // Fallback
    const noteDoc = await getDoc(doc(db, "publicNotes", noteId));
    if (noteDoc.exists()) return noteDoc.data().content || "";
    return "";
  } catch { return ""; }
};

export const publishNote = async (
  uid: string, noteId: string, content: string,
  meta: { title: string; description: string; tags: string[]; subject?: string; branch?: string; level?: string; authorName: string; authorAvatar?: string }
) => {
  const publicId = noteId;
  await setDoc(doc(db, "publicNotes", publicId), {
    authorId: uid,
    authorName: meta.authorName,
    authorAvatar: meta.authorAvatar || "",
    title: meta.title,
    description: meta.description,
    tags: meta.tags,
    subject: meta.subject || "",
    branch: meta.branch || "",
    level: meta.level || "",
    likes: 0, views: 0, saves: 0, forksCount: 0,
    publishedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    status: "published",
    adminCreated: false,
  });
  await setDoc(doc(db, "publicNotes", publicId, "content", "body"), { content });
  await updateDoc(doc(db, "users", uid, "notes", noteId), { isPublic: true, publishedNoteId: publicId });
  return publicId;
};

export const unpublishNote = async (uid: string, noteId: string) => {
  try {
    await deleteDoc(doc(db, "publicNotes", noteId, "content", "body"));
    await deleteDoc(doc(db, "publicNotes", noteId));
    await updateDoc(doc(db, "users", uid, "notes", noteId), { isPublic: false, publishedNoteId: null });
  } catch {}
};

export const likePublicNote = async (uid: string, noteId: string) => {
  await setDoc(doc(db, "publicNotes", noteId, "likes", uid), { likedAt: serverTimestamp() });
};

export const unlikePublicNote = async (uid: string, noteId: string) => {
  await deleteDoc(doc(db, "publicNotes", noteId, "likes", uid));
};

export const checkIfLiked = async (uid: string, noteId: string): Promise<boolean> => {
  try {
    const snap = await getDoc(doc(db, "publicNotes", noteId, "likes", uid));
    return snap.exists();
  } catch { return false; }
};

export const forkPublicNote = async (uid: string, publicNoteId: string): Promise<NoteMetadata> => {
  const content = await fetchPublicNoteContent(publicNoteId);
  const pubDoc = await getDoc(doc(db, "publicNotes", publicNoteId));
  const pubData = pubDoc.data() as PublicNote;
  const note = await createNote(uid, {
    title: `${pubData.title} (Forked)`,
    tags: pubData.tags,
  }, content);
  // Increment fork count
  try {
    await updateDoc(doc(db, "publicNotes", publicNoteId), { forksCount: (pubData.forksCount || 0) + 1 });
  } catch {}
  return note;
};

export const savePublicNote = async (uid: string, noteId: string) => {
  await setDoc(doc(db, "users", uid, "savedPublicNotes", noteId), { savedAt: serverTimestamp() });
};

// ============ CANVASES ============
export const fetchCanvases = async (uid: string): Promise<CanvasData[]> => {
  try {
    const snap = await getDocs(collection(db, "users", uid, "canvases"));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as CanvasData));
  } catch { return []; }
};

export const createCanvas = async (uid: string, name: string): Promise<CanvasData> => {
  const ref = await addDoc(collection(db, "users", uid, "canvases"), {
    name, nodes: [], edges: [], createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });
  return { id: ref.id, name, nodes: [], edges: [], createdAt: null, updatedAt: null };
};

export const updateCanvas = async (uid: string, canvasId: string, data: Partial<CanvasData>) => {
  await updateDoc(doc(db, "users", uid, "canvases", canvasId), { ...data, updatedAt: serverTimestamp() });
};

// ============ NOTE LINK EXTRACTION ============
export const extractNoteLinks = (content: string, allNotes: NoteMetadata[]): string[] => {
  const matches = content.match(/\[\[([^\]]+)\]\]/g) || [];
  const linkedIds: string[] = [];
  matches.forEach(m => {
    const title = m.replace(/\[\[|\]\]/g, "").trim();
    const target = allNotes.find(n => n.title.toLowerCase() === title.toLowerCase());
    if (target) linkedIds.push(target.id);
  });
  return [...new Set(linkedIds)];
};

// ============ WORD COUNT HELPERS ============
export const countWords = (html: string): number => {
  const text = html.replace(/<[^>]+>/g, "");
  return text.split(/\s+/).filter(Boolean).length;
};

export const countChars = (html: string): number => {
  return html.replace(/<[^>]+>/g, "").length;
};

export const estimateReadingTime = (wordCount: number): string => {
  const minutes = Math.max(1, Math.ceil(wordCount / 200));
  return `${minutes} min read`;
};
