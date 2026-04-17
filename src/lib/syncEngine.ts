/**
 * syncEngine — Smart sync orchestrator.
 * - Manifest-based diff sync (only download changed items)
 * - File dedup by hash via Cache Storage
 * - Offline mutation queue with replay on reconnect
 */

import { offlineDB } from "./offlineDB";

export interface ManifestEntry {
  id: string;
  type: "question" | "resource" | "note" | "file";
  courseId?: string;
  hash: string;
  version: number;
  url?: string;
  updatedAt: number;
}

export interface QueuedOp {
  id: string;
  ts: number;
  kind: "put" | "delete";
  collection: string;
  docId: string;
  payload?: any;
}

const FILE_CACHE = "itm-files-v1";

export async function sha256(input: string | ArrayBuffer): Promise<string> {
  const buf = typeof input === "string" ? new TextEncoder().encode(input) : input;
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Download a file once and stash in Cache Storage; returns blob URL. */
export async function downloadFile(url: string, _hash?: string): Promise<Blob> {
  const cache = await caches.open(FILE_CACHE);
  const cached = await cache.match(url);
  if (cached) return cached.blob();
  const res = await fetch(url, { mode: "cors" });
  if (!res.ok) throw new Error(`Failed to fetch ${url}`);
  // Clone before consuming
  await cache.put(url, res.clone());
  return res.blob();
}

/** Get a cached blob URL synchronously (returns null if not cached). */
export async function getCachedFileURL(url: string): Promise<string | null> {
  try {
    const cache = await caches.open(FILE_CACHE);
    const hit = await cache.match(url);
    if (!hit) return null;
    const b = await hit.blob();
    return URL.createObjectURL(b);
  } catch {
    return null;
  }
}

/** Diff a remote manifest against the local one and return entries needing sync. */
export async function diffManifest(userId: string, remote: ManifestEntry[]): Promise<ManifestEntry[]> {
  const local = await offlineDB.getAll<ManifestEntry>(userId, "manifest");
  const localMap = new Map(local.map((l) => [l.id, l]));
  return remote.filter((r) => {
    const l = localMap.get(r.id);
    return !l || l.hash !== r.hash || l.version < r.version;
  });
}

/** Apply manifest changes after items are downloaded and stored. */
export async function commitManifest(userId: string, entries: ManifestEntry[]) {
  await offlineDB.bulkPut(userId, "manifest", entries);
}

// ── Offline mutation queue ────────────────────────────────────────────────────
export async function queueEdit(userId: string, op: Omit<QueuedOp, "id" | "ts">) {
  const full: QueuedOp = { ...op, id: crypto.randomUUID(), ts: Date.now() };
  await offlineDB.put(userId, "syncQueue", full);
}

export async function getQueue(userId: string): Promise<QueuedOp[]> {
  const all = await offlineDB.getAll<QueuedOp>(userId, "syncQueue");
  return all.sort((a, b) => a.ts - b.ts);
}

export async function clearQueueItem(userId: string, id: string) {
  await offlineDB.delete(userId, "syncQueue", id);
}

/**
 * Flush the queue when online. Caller provides a replayer fn that knows how to
 * actually persist the op (e.g. write to Firestore). Returns count of ops flushed.
 */
export async function flushQueue(
  userId: string,
  replay: (op: QueuedOp) => Promise<void>,
): Promise<number> {
  if (!navigator.onLine) return 0;
  const ops = await getQueue(userId);
  let count = 0;
  for (const op of ops) {
    try {
      await replay(op);
      await clearQueueItem(userId, op.id);
      count++;
    } catch (e) {
      // Stop on first failure; will retry next time
      console.warn("[syncEngine] replay failed for", op.id, e);
      break;
    }
  }
  return count;
}

// ── Manifest fetch (Firestore-backed) ────────────────────────────────────────
/**
 * Fetch the user's allowed-content manifest from Firestore.
 * Looks for `manifests/{userId}` doc with `entries: ManifestEntry[]`.
 * Falls back to aggregating from `users/{userId}/allowedContent` collection.
 * Stores result in IndexedDB on success.
 */
export async function fetchManifest(userId: string): Promise<ManifestEntry[]> {
  if (!userId) return [];
  try {
    const { db } = await import("./firebase");
    const { doc, getDoc, collection, getDocs } = await import("firebase/firestore");

    let entries: ManifestEntry[] = [];

    // Try aggregated doc first (cheapest read)
    try {
      const snap = await getDoc(doc(db, "manifests", userId));
      if (snap.exists()) {
        const data = snap.data();
        if (Array.isArray(data.entries)) entries = data.entries as ManifestEntry[];
      }
    } catch { /* ignore, fall through */ }

    // Fallback: per-user allowedContent collection
    if (entries.length === 0) {
      try {
        const colSnap = await getDocs(collection(db, "users", userId, "allowedContent"));
        entries = colSnap.docs.map((d) => {
          const data = d.data() as Partial<ManifestEntry>;
          return {
            id: d.id,
            type: (data.type ?? "resource") as ManifestEntry["type"],
            courseId: data.courseId,
            hash: data.hash ?? "",
            version: data.version ?? 1,
            url: data.url,
            updatedAt: data.updatedAt ?? Date.now(),
          };
        });
      } catch { /* ignore */ }
    }

    if (entries.length > 0) {
      await commitManifest(userId, entries);
    }
    return entries;
  } catch (e) {
    console.warn("[syncEngine] fetchManifest failed", e);
    return [];
  }
}

/** Schedule heavy work in idle time, fall back to setTimeout. */
export function runIdle(fn: () => void, timeout = 2000) {
  const ric = (window as any).requestIdleCallback as
    | ((cb: () => void, opts?: { timeout: number }) => number)
    | undefined;
  if (ric) ric(fn, { timeout });
  else setTimeout(fn, 0);
}
