/**
 * TimerStylePicker — pick from 12 visual timer styles.
 * Same horizontal strip UI as the other pickers.
 */
import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type TimerStyle =
  | "minimal" | "ring" | "flip" | "pixel" | "analog"
  | "liquid" | "hourglass" | "orbit" | "pulse"
  | "premium-black" | "constellation" | "vinyl";

export interface TimerStyleDef {
  key: TimerStyle;
  label: string;
  preview: string;
}

export const TIMER_STYLES: TimerStyleDef[] = [
  { key: "minimal",        label: "Minimal Mono",   preview: "linear-gradient(135deg,#1f1f1f,#000)" },
  { key: "ring",           label: "Ring Arc",       preview: "linear-gradient(135deg,#7c3aed,#3b0764)" },
  { key: "flip",           label: "Flip Card",      preview: "linear-gradient(135deg,#37474f,#0a0e10)" },
  { key: "pixel",          label: "Pixel LED",      preview: "linear-gradient(135deg,#ef4444,#1a0000)" },
  { key: "analog",         label: "Analog Clock",   preview: "linear-gradient(135deg,#bfa46f,#3b2a0a)" },
  { key: "liquid",         label: "Liquid Fill",    preview: "linear-gradient(135deg,#06b6d4,#0a2a35)" },
  { key: "hourglass",      label: "Hourglass",      preview: "linear-gradient(135deg,#f59e0b,#3b1f00)" },
  { key: "orbit",          label: "Orbit",          preview: "linear-gradient(135deg,#1e3a5f,#000)" },
  { key: "pulse",          label: "Pulse Ring",     preview: "linear-gradient(135deg,#ec4899,#3b0a25)" },
  { key: "premium-black",  label: "Premium Black",  preview: "linear-gradient(135deg,#000,#1a1a1a)" },
  { key: "constellation",  label: "Constellation",  preview: "linear-gradient(135deg,#1a1f3a,#000)" },
  { key: "vinyl",          label: "Vinyl",          preview: "linear-gradient(135deg,#212121,#000)" },
];

interface TimerStylePickerProps {
  open: boolean;
  selectedStyle: TimerStyle;
  onSelect: (s: TimerStyle) => void;
  onClose: () => void;
  autoDismissMs?: number;
}

export const TimerStylePicker = ({
  open, selectedStyle, onSelect, onClose, autoDismissMs = 5000,
}: TimerStylePickerProps) => {
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
                <Clock className="h-3.5 w-3.5" />
                Timer Style
              </div>
              <button onClick={onClose} className="h-7 w-7 grid place-items-center rounded-full text-white/70 hover:bg-white/10" aria-label="Close">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="overflow-x-auto no-scrollbar">
              <div className="flex gap-2 min-w-max pb-1">
                {TIMER_STYLES.map((s) => {
                  const active = s.key === selectedStyle;
                  return (
                    <button
                      key={s.key}
                      onClick={() => { onSelect(s.key); resetIdle(); }}
                      className={cn(
                        "relative h-20 w-20 rounded-xl overflow-hidden shrink-0 transition-all border-2",
                        active ? "border-primary scale-105 shadow-lg" : "border-white/15 hover:border-white/40 hover:scale-[1.02]"
                      )}
                      style={{ background: s.preview }}
                    >
                      <div className="absolute inset-0 grid place-items-center">
                        <span className="text-white/80 font-mono text-[11px] font-bold">25:00</span>
                      </div>
                      <div className="absolute bottom-1 left-1 right-1 text-left">
                        <div className="text-[9px] text-white/95 font-semibold leading-tight truncate">{s.label}</div>
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
