/**
 * Focus Asset Cache — fetches & stores remote assets in the browser Cache Storage
 * once, then returns a local Blob URL so the Focus Room runs fully offline.
 *
 * Cache name: "focus-assets-v1"
 * Strategy:   cache-first; on cache-miss → fetch → cache.put → return blob URL.
 *             If fetch fails (offline + uncached), returns the original URL as
 *             a graceful fallback.
 */

const CACHE_NAME = "focus-assets-v1";

const memoryBlobs = new Map<string, string>();

const supportsCache = typeof caches !== "undefined";

export async function cacheAsset(url: string): Promise<string> {
  if (!url) return url;
  if (memoryBlobs.has(url)) return memoryBlobs.get(url)!;
  if (!supportsCache) return url;

  try {
    const cache = await caches.open(CACHE_NAME);
    let resp = await cache.match(url);
    if (!resp) {
      const fetched = await fetch(url, { mode: "cors" });
      if (!fetched.ok) throw new Error(`fetch failed ${fetched.status}`);
      // Clone & cache (Response can only be consumed once)
      try { await cache.put(url, fetched.clone()); } catch { /* ignore quota */ }
      resp = fetched;
    }
    const blob = await resp.blob();
    const blobUrl = URL.createObjectURL(blob);
    memoryBlobs.set(url, blobUrl);
    return blobUrl;
  } catch {
    // Offline + not cached → just return original (browser may still serve it)
    return url;
  }
}

export async function preloadAssets(urls: string[]): Promise<void> {
  await Promise.allSettled(urls.map(cacheAsset));
}

export function revokeAll() {
  for (const url of memoryBlobs.values()) {
    try { URL.revokeObjectURL(url); } catch { /* ignore */ }
  }
  memoryBlobs.clear();
}
