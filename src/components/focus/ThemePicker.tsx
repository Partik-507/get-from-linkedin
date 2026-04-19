/**
 * ThemePicker — horizontal thumbnail strip for switching focus themes.
 *
 * - 80×80 thumbnails, scrollable strip
 * - Battery-safe toggle pill
 * - Cross-fade 400ms when switching (handled by SceneEngine)
 * - Auto-dismiss after 5s of no interaction (controlled via `onAutoDismiss`)
 */

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Battery, Palette, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAllThemes } from "@/lib/focusThemes";

interface ThemePickerProps {
  open: boolean;
  selectedId: string;
  battery: boolean;
  onSelect: (id: string) => void;
  onToggleBattery: () => void;
  onClose: () => void;
  autoDismissMs?: number;
}

export const ThemePicker = ({
  open, selectedId, battery, onSelect, onToggleBattery, onClose,
  autoDismissMs = 5000,
}: ThemePickerProps) => {
  const idleTimer = useRef<ReturnType<typeof setTimeout>>();
  const themes = getAllThemes();

  const resetIdle = () => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (autoDismissMs > 0 && open) {
      idleTimer.current = setTimeout(onClose, autoDismissMs);
    }
  };

  useEffect(() => {
    resetIdle();
    return () => { if (idleTimer.current) clearTimeout(idleTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: 200, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 200, opacity: 0 }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
          onMouseMove={resetIdle}
          onTouchStart={resetIdle}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 max-w-[min(720px,calc(100vw-16px))]"
        >
          <div className="bg-black/70 backdrop-blur-xl rounded-2xl border border-white/15 p-3 shadow-2xl">
            <div className="flex items-center justify-between mb-2 px-1">
              <div className="flex items-center gap-1.5 text-white/90 text-xs font-medium">
                <Palette className="h-3.5 w-3.5" />
                Themes
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={onToggleBattery}
                  className={cn(
                    "h-7 px-2.5 rounded-full text-[11px] font-medium inline-flex items-center gap-1 transition",
                    battery
                      ? "bg-amber-500/30 text-amber-200 border border-amber-400/40"
                      : "bg-white/10 text-white/70 border border-white/15 hover:bg-white/15",
                  )}
                >
                  <Battery className="h-3 w-3" />
                  Battery-safe
                </button>
                <button
                  onClick={onClose}
                  className="h-7 w-7 grid place-items-center rounded-full text-white/70 hover:bg-white/10"
                  aria-label="Close"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto no-scrollbar">
              <div className="flex gap-2 min-w-max pb-1">
                {themes.map((t) => {
                  const active = t.id === selectedId;
                  return (
                    <button
                      key={t.id}
                      onClick={() => { onSelect(t.id); resetIdle(); }}
                      className={cn(
                        "relative h-20 w-20 rounded-xl overflow-hidden shrink-0 group",
                        "transition-all border-2",
                        active
                          ? "border-primary scale-105 shadow-lg"
                          : "border-white/15 hover:border-white/40 hover:scale-[1.02]",
                      )}
                    >
                      <img
                        src={t.baseImage}
                        alt={t.name}
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      <div className="absolute bottom-1 left-1 right-1 text-left">
                        <div className="text-[9px] text-white/95 font-semibold leading-tight truncate">
                          {t.emoji} {t.name}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
