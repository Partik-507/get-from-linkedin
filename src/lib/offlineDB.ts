/**
 * offlineDB — Per-user IndexedDB wrapper for offline-first data.
 * Each user gets their own DB: `itm_hub_${userId}` so data never leaks between accounts.
 */

const DB_VERSION = 1;
const STORES = [
  "questions",
  "answers",
  "resources",
  "notes",
  "progress",
  "bookmarks",
  "manifest",
  "syncQueue",
  "fileBlobs",
  "session",
] as const;

export type StoreName = (typeof STORES)[number];

const dbCache = new Map<string, Promise<IDBDatabase>>();

function dbName(userId: string) {
  return `itm_hub_${userId || "guest"}`;
}

export function openDB(userId: string): Promise<IDBDatabase> {
  const name = dbName(userId);
  if (dbCache.has(name)) return dbCache.get(name)!;
  const p = new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(name, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const s of STORES) {
        if (!db.objectStoreNames.contains(s)) {
          const store = db.createObjectStore(s, { keyPath: "id" });
          if (s === "questions" || s === "resources" || s === "notes") {
            store.createIndex("courseId", "courseId", { unique: false });
            store.createIndex("updatedAt", "updatedAt", { unique: false });
          }
          if (s === "syncQueue") {
            store.createIndex("ts", "ts", { unique: false });
          }
        }
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  dbCache.set(name, p);
  return p;
}

async function tx<T>(userId: string, store: StoreName, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | Promise<T>): Promise<T> {
  const db = await openDB(userId);
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    const r = fn(s);
    if (r instanceof Promise) {
      r.then(resolve).catch(reject);
    } else {
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    }
  });
}

export const offlineDB = {
  put: <T extends { id: string }>(userId: string, store: StoreName, value: T) =>
    tx(userId, store, "readwrite", (s) => s.put(value)),

  get: <T = any>(userId: string, store: StoreName, id: string): Promise<T | undefined> =>
    tx(userId, store, "readonly", (s) => s.get(id)),

  getAll: <T = any>(userId: string, store: StoreName): Promise<T[]> =>
    tx(userId, store, "readonly", (s) => s.getAll() as IDBRequest<T[]>),

  delete: (userId: string, store: StoreName, id: string) =>
    tx(userId, store, "readwrite", (s) => s.delete(id)),

  clearStore: (userId: string, store: StoreName) =>
    tx(userId, store, "readwrite", (s) => s.clear()),

  bulkPut: async <T extends { id: string }>(userId: string, store: StoreName, items: T[]) => {
    const db = await openDB(userId);
    return new Promise<void>((resolve, reject) => {
      const t = db.transaction(store, "readwrite");
      const s = t.objectStore(store);
      for (const it of items) s.put(it);
      t.oncomplete = () => resolve();
      t.onerror = () => reject(t.error);
    });
  },

  queryByIndex: async <T = any>(userId: string, store: StoreName, indexName: string, value: any): Promise<T[]> => {
    const db = await openDB(userId);
    return new Promise<T[]>((resolve, reject) => {
      const t = db.transaction(store, "readonly");
      const idx = t.objectStore(store).index(indexName);
      const r = idx.getAll(value);
      r.onsuccess = () => resolve(r.result as T[]);
      r.onerror = () => reject(r.error);
    });
  },

  /** Wipe all data for this user (e.g. on full reset). */
  destroy: async (userId: string) => {
    const name = dbName(userId);
    dbCache.delete(name);
    return new Promise<void>((resolve, reject) => {
      const r = indexedDB.deleteDatabase(name);
      r.onsuccess = () => resolve();
      r.onerror = () => reject(r.error);
    });
  },
};
