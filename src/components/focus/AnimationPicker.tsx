/**
 * AnimationPicker — same UI as ThemePicker / MusicPicker, for overlay animations.
 *
 *  - Horizontal strip of 80×80 gradient previews
 *  - Tap to apply, "None" to disable
 *  - Auto-dismiss after 5s
 */
import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { FOCUS_ANIMATIONS, type AnimationKey } from "@/lib/focusAnimationLibrary";

interface AnimationPickerProps {
  open: boolean;
  selectedKey: AnimationKey;
  onSelect: (k: AnimationKey) => void;
  onClose: () => void;
  autoDismissMs?: number;
}

export const AnimationPicker = ({
  open, selectedKey, onSelect, onClose, autoDismissMs = 5000,
}: AnimationPickerProps) => {
  const idleTimer = useRef<ReturnType<typeof setTimeout>>();

  const resetIdle = () => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (autoDismissMs > 0 && open) idleTimer.current = setTimeout(onClose, autoDismissMs);
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
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] max-w-[min(720px,calc(100vw-16px))]"
        >
          <div className="bg-black/75 backdrop-blur-2xl rounded-2xl border border-white/15 p-3 shadow-2xl">
            <div className="flex items-center justify-between mb-2 px-1">
              <div className="flex items-center gap-1.5 text-white/90 text-xs font-medium">
                <Sparkles className="h-3.5 w-3.5" />
                Animations
              </div>
              <button onClick={onClose} className="h-7 w-7 grid place-items-center rounded-full text-white/70 hover:bg-white/10" aria-label="Close">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto no-scrollbar">
              <div className="flex gap-2 min-w-max pb-1">
                {FOCUS_ANIMATIONS.map((a) => {
                  const active = a.key === selectedKey;
                  return (
                    <button
                      key={a.key}
                      onClick={() => { onSelect(a.key); resetIdle(); }}
                      className={cn(
                        "relative h-20 w-20 rounded-xl overflow-hidden shrink-0 transition-all border-2",
                        active ? "border-primary scale-105 shadow-lg" : "border-white/15 hover:border-white/40 hover:scale-[1.02]"
                      )}
                      style={{ background: a.preview }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                      <div className="absolute inset-0 grid place-items-center">
                        <span className="text-2xl drop-shadow">{a.emoji}</span>
                      </div>
                      <div className="absolute bottom-1 left-1 right-1 text-left">
                        <div className="text-[9px] text-white/95 font-semibold leading-tight truncate">{a.label}</div>
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
