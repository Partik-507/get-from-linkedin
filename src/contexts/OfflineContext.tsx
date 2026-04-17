import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { flushQueue, runIdle, fetchManifest, type QueuedOp } from "@/lib/syncEngine";
import { offlineDB } from "@/lib/offlineDB";

interface OfflineContextValue {
  isOnline: boolean;
  isOfflineReady: boolean;
  lastSyncAt: number | null;
  syncing: boolean;
  syncProgress: { done: number; total: number } | null;
  triggerSync: () => Promise<void>;
  registerReplayer: (fn: (op: QueuedOp) => Promise<void>) => void;
}

const OfflineContext = createContext<OfflineContextValue>({
  isOnline: true,
  isOfflineReady: false,
  lastSyncAt: null,
  syncing: false,
  syncProgress: null,
  triggerSync: async () => {},
  registerReplayer: () => {},
});

export const useOffline = () => useContext(OfflineContext);

const LAST_SYNC_KEY = "itm_last_sync_at";

export const OfflineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [isOfflineReady, setIsOfflineReady] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(() => {
    const v = localStorage.getItem(LAST_SYNC_KEY);
    return v ? Number(v) : null;
  });
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{ done: number; total: number } | null>(null);
  const replayerRef = useRef<((op: QueuedOp) => Promise<void>) | null>(null);

  const registerReplayer = useCallback((fn: (op: QueuedOp) => Promise<void>) => {
    replayerRef.current = fn;
  }, []);

  // Online/offline listeners
  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  // Mark offline-ready when we have manifest data
  useEffect(() => {
    if (!user?.uid) { setIsOfflineReady(false); return; }
    offlineDB.getAll(user.uid, "manifest").then((m) => {
      setIsOfflineReady(m.length > 0);
    }).catch(() => setIsOfflineReady(false));
  }, [user?.uid, lastSyncAt]);

  const triggerSync = useCallback(async () => {
    if (!user?.uid || !navigator.onLine) return;
    setSyncing(true);
    try {
      // Flush any queued mutations first
      if (replayerRef.current) {
        await flushQueue(user.uid, replayerRef.current);
      }
      // Pull latest manifest (cheap; deduped server-side)
      try {
        const entries = await fetchManifest(user.uid);
        if (entries.length > 0) setSyncProgress({ done: entries.length, total: entries.length });
      } catch {/* manifest is best-effort */}
      const now = Date.now();
      localStorage.setItem(LAST_SYNC_KEY, String(now));
      setLastSyncAt(now);
    } finally {
      setSyncing(false);
      setSyncProgress(null);
    }
  }, [user?.uid]);

  // Auto-flush queue when reconnecting
  useEffect(() => {
    if (isOnline && user?.uid) {
      runIdle(() => { void triggerSync(); });
    }
  }, [isOnline, user?.uid, triggerSync]);

  // First-login sync: if no lastSyncAt, immediately fetch manifest to populate IndexedDB
  useEffect(() => {
    if (!user?.uid) return;
    if (lastSyncAt) return;
    if (!navigator.onLine) return;
    runIdle(() => { void triggerSync(); }, 4000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  return (
    <OfflineContext.Provider
      value={{ isOnline, isOfflineReady, lastSyncAt, syncing, syncProgress, triggerSync, registerReplayer }}
    >
      {children}
    </OfflineContext.Provider>
  );
};
