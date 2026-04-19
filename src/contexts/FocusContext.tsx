import {
  createContext, useContext, useState, useCallback, useEffect,
  type ReactNode,
} from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

export interface FocusPrefs {
  timerStyle?: string;
  music?: string;
  animation?: string;
  theme?: string;
  volume?: number;
}

interface FocusContextValue {
  isFocusModeActive: boolean;
  activateFocusMode: () => void;
  exitFocusMode: () => void;
  prefs: FocusPrefs;
  updatePrefs: (patch: Partial<FocusPrefs>) => void;
}

const FocusContext = createContext<FocusContextValue>({
  isFocusModeActive: false,
  activateFocusMode: () => {},
  exitFocusMode: () => {},
  prefs: {},
  updatePrefs: () => {},
});

const LS_KEY = "vv_focus_prefs";

export const FocusProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [isFocusModeActive, setIsFocusModeActive] = useState(false);
  const [prefs, setPrefs] = useState<FocusPrefs>(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}"); } catch { return {}; }
  });

  // Hydrate from Firestore on auth ready
  useEffect(() => {
    if (!user?.uid) return;
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "users", user.uid, "prefs", "focus"));
        if (!cancelled && snap.exists()) {
          const data = snap.data() as FocusPrefs;
          setPrefs((p) => ({ ...p, ...data }));
          try { localStorage.setItem(LS_KEY, JSON.stringify({ ...prefs, ...data })); } catch {}
        }
      } catch { /* offline ok */ }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  const updatePrefs = useCallback((patch: Partial<FocusPrefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch {}
      if (user?.uid) {
        setDoc(doc(db, "users", user.uid, "prefs", "focus"), next, { merge: true }).catch(() => {});
      }
      return next;
    });
  }, [user?.uid]);

  const activateFocusMode = useCallback(() => {
    setIsFocusModeActive(true);
    try { document.documentElement.requestFullscreen?.(); } catch {}
  }, []);

  const exitFocusMode = useCallback(() => {
    setIsFocusModeActive(false);
    try { if (document.fullscreenElement) document.exitFullscreen?.(); } catch {}
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFocusModeActive) exitFocusMode();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isFocusModeActive, exitFocusMode]);

  return (
    <FocusContext.Provider value={{ isFocusModeActive, activateFocusMode, exitFocusMode, prefs, updatePrefs }}>
      {children}
    </FocusContext.Provider>
  );
};

export const useFocusMode = () => useContext(FocusContext);
