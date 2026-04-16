// ─── Local Version History via IndexedDB ────────────────────────────────────
// Stores the last 20 content snapshots per note locally — zero Firestore cost.

const DB_NAME = "vivavault_notes";
const STORE_NAME = "snapshots";
const DB_VERSION = 1;
const MAX_SNAPSHOTS = 20;

export interface LocalSnapshot {
  id: string; // `${noteId}_${timestamp}`
  noteId: string;
  content: string;
  wordCount: number;
  savedAt: number; // unix ms
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("noteId", "noteId", { unique: false });
        store.createIndex("savedAt", "savedAt", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveSnapshot(noteId: string, content: string): Promise<void> {
  const db = await openDB();
  const wordCount = content.replace(/<[^>]+>/g, "").split(/\s+/).filter(Boolean).length;
  const now = Date.now();
  const snapshot: LocalSnapshot = {
    id: `${noteId}_${now}`,
    noteId,
    content,
    wordCount,
    savedAt: now,
  };

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(snapshot);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  // Prune old snapshots beyond MAX_SNAPSHOTS
  await pruneSnapshots(db, noteId);
}

async function pruneSnapshots(db: IDBDatabase, noteId: string): Promise<void> {
  const all = await getSnapshotsFromDB(db, noteId);
  if (all.length <= MAX_SNAPSHOTS) return;

  const toDelete = all.slice(MAX_SNAPSHOTS);
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    for (const snap of toDelete) store.delete(snap.id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function getSnapshotsFromDB(db: IDBDatabase, noteId: string): Promise<LocalSnapshot[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const index = tx.objectStore(STORE_NAME).index("noteId");
    const req = index.getAll(noteId);
    req.onsuccess = () => {
      const results = (req.result as LocalSnapshot[]).sort((a, b) => b.savedAt - a.savedAt);
      resolve(results);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getSnapshots(noteId: string): Promise<LocalSnapshot[]> {
  const db = await openDB();
  return getSnapshotsFromDB(db, noteId);
}

export async function clearSnapshots(noteId: string): Promise<void> {
  const db = await openDB();
  const all = await getSnapshotsFromDB(db, noteId);
  if (!all.length) return;
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    for (const snap of all) store.delete(snap.id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function formatRelativeTime(ms: number): string {
  const diff = Date.now() - ms;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  if (days === 1) {
    const d = new Date(ms);
    return `yesterday at ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  }
  const d = new Date(ms);
  return d.toLocaleDateString([], { month: "short", day: "numeric" }) +
    " at " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
