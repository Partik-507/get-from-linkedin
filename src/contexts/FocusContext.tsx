import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

interface FocusContextValue {
  isFocusModeActive: boolean;
  activateFocusMode: () => void;
  exitFocusMode: () => void;
}

const FocusContext = createContext<FocusContextValue>({
  isFocusModeActive: false,
  activateFocusMode: () => {},
  exitFocusMode: () => {},
});

export const FocusProvider = ({ children }: { children: ReactNode }) => {
  const [isFocusModeActive, setIsFocusModeActive] = useState(false);

  const activateFocusMode = useCallback(() => {
    setIsFocusModeActive(true);
    try { document.documentElement.requestFullscreen?.(); } catch {}
  }, []);

  const exitFocusMode = useCallback(() => {
    setIsFocusModeActive(false);
    try { if (document.fullscreenElement) document.exitFullscreen?.(); } catch {}
  }, []);

  // Esc key always exits
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFocusModeActive) exitFocusMode();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isFocusModeActive, exitFocusMode]);

  return (
    <FocusContext.Provider value={{ isFocusModeActive, activateFocusMode, exitFocusMode }}>
      {children}
    </FocusContext.Provider>
  );
};

export const useFocusMode = () => useContext(FocusContext);
