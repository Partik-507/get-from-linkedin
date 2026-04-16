import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { get, set, del } from "idb-keyval";

type StorageMode = "cloud" | "local" | null;

interface LocalVaultHandle {
  dirHandle: FileSystemDirectoryHandle;
  path: string;
}

interface StorageContextValue {
  storageMode: StorageMode;
  localVault: LocalVaultHandle | null;
  isStorageChosen: boolean;
  /** true while we're restoring a cached dirHandle on mount */
  isRestoringLocal: boolean;
  chooseCloud: () => void;
  chooseLocal: () => Promise<boolean>;
  /** Re-prompt for the folder (when browser drops permission) */
  reconnectLocal: () => Promise<boolean>;
  resetStorage: () => void;
}

const StorageContext = createContext<StorageContextValue>({
  storageMode: null,
  localVault: null,
  isStorageChosen: false,
  isRestoringLocal: false,
  chooseCloud: () => {},
  chooseLocal: async () => false,
  reconnectLocal: async () => false,
  resetStorage: () => {},
});

const STORAGE_KEY = "vv_storage_mode";
const VAULT_PATH_KEY = "vv_vault_path";
const IDB_DIR_HANDLE_KEY = "vv_local_dir_handle";

export const StorageProvider = ({ children }: { children: ReactNode }) => {
  const [storageMode, setStorageMode] = useState<StorageMode>(() => {
    try { return (localStorage.getItem(STORAGE_KEY) as StorageMode) || null; } catch { return null; }
  });
  const [localVault, setLocalVault] = useState<LocalVaultHandle | null>(null);
  const [isRestoringLocal, setIsRestoringLocal] = useState(false);

  const isStorageChosen = storageMode !== null;

  // ── On mount: restore cached dirHandle from IndexedDB ──────────────────────
  useEffect(() => {
    if (storageMode !== "local") return;
    let cancelled = false;
    setIsRestoringLocal(true);

    (async () => {
      try {
        const cached = await get<FileSystemDirectoryHandle>(IDB_DIR_HANDLE_KEY);
        if (!cached || cancelled) { setIsRestoringLocal(false); return; }

        // Verify we still have permission
        // @ts-ignore – queryPermission is behind a flag in TS types
        const perm = await cached.queryPermission({ mode: "readwrite" });
        if (perm === "granted") {
          setLocalVault({ dirHandle: cached, path: cached.name });
          setIsRestoringLocal(false);
          return;
        }

        // Try requesting permission silently (Chrome may auto-grant)
        // @ts-ignore
        const req = await cached.requestPermission({ mode: "readwrite" });
        if (req === "granted") {
          setLocalVault({ dirHandle: cached, path: cached.name });
        }
        // If denied, localVault stays null — Notes.tsx will show "Reconnect" button
      } catch {
        // Handle lost/corrupt, user will need to re-pick
      } finally {
        if (!cancelled) setIsRestoringLocal(false);
      }
    })();

    return () => { cancelled = true; };
  }, [storageMode]);

  const chooseCloud = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "cloud");
    setStorageMode("cloud");
    setLocalVault(null);
  }, []);

  const chooseLocal = useCallback(async (): Promise<boolean> => {
    try {
      // @ts-ignore — File System Access API
      const dirHandle: FileSystemDirectoryHandle = await window.showDirectoryPicker({ mode: "readwrite" });
      const path = dirHandle.name;
      localStorage.setItem(STORAGE_KEY, "local");
      localStorage.setItem(VAULT_PATH_KEY, path);
      // Persist dirHandle in IndexedDB so it survives page reload
      await set(IDB_DIR_HANDLE_KEY, dirHandle);
      setLocalVault({ dirHandle, path });
      setStorageMode("local");
      return true;
    } catch {
      return false;
    }
  }, []);

  /** Re-pick folder when browser lost permission */
  const reconnectLocal = useCallback(async (): Promise<boolean> => {
    try {
      // First try using the cached handle
      const cached = await get<FileSystemDirectoryHandle>(IDB_DIR_HANDLE_KEY);
      if (cached) {
        // @ts-ignore
        const req = await cached.requestPermission({ mode: "readwrite" });
        if (req === "granted") {
          setLocalVault({ dirHandle: cached, path: cached.name });
          return true;
        }
      }
      // If that fails, prompt for a new directory
      return await chooseLocal();
    } catch {
      return false;
    }
  }, [chooseLocal]);

  const resetStorage = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(VAULT_PATH_KEY);
    del(IDB_DIR_HANDLE_KEY).catch(() => {});
    setStorageMode(null);
    setLocalVault(null);
  }, []);

  return (
    <StorageContext.Provider value={{
      storageMode, localVault, isStorageChosen, isRestoringLocal,
      chooseCloud, chooseLocal, reconnectLocal, resetStorage,
    }}>
      {children}
    </StorageContext.Provider>
  );
};

export const useStorage = () => useContext(StorageContext);
