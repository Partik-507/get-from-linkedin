/**
 * localSearch — Fuse.js-powered offline search across IndexedDB stores.
 */

import Fuse from "fuse.js";
import { offlineDB, type StoreName } from "./offlineDB";

export interface SearchResult<T = any> {
  item: T;
  score: number;
  store: StoreName;
}

const KEYS_BY_STORE: Record<string, string[]> = {
  questions: ["question", "answer", "title", "tags"],
  notes: ["title", "content", "tags"],
  resources: ["title", "description", "url", "tags"],
  answers: ["text", "content"],
};

export async function searchAll<T = any>(
  userId: string,
  query: string,
  stores: StoreName[] = ["questions", "notes", "resources"],
  limit = 50,
): Promise<SearchResult<T>[]> {
  if (!query.trim()) return [];
  const results: SearchResult<T>[] = [];
  for (const store of stores) {
    const items = await offlineDB.getAll<T>(userId, store);
    if (!items.length) continue;
    const fuse = new Fuse(items, {
      keys: KEYS_BY_STORE[store] || ["title", "name"],
      threshold: 0.35,
      includeScore: true,
      ignoreLocation: true,
    });
    const hits = fuse.search(query, { limit });
    for (const h of hits) {
      results.push({ item: h.item, score: h.score ?? 1, store });
    }
  }
  return results.sort((a, b) => a.score - b.score).slice(0, limit);
}
