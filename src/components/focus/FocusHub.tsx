/**
 * FocusHub — single floating control button for Focus Mode.
 *
 * Replaces all top-bar scattered controls. Tap → 5 radial options:
 *   🎨 Theme · 🎵 Music · ✨ Animation · ⏱️ Timer Style · 👁️ Hide UI
 *
 * Auto-collapses 4s after last interaction. Always visible (does not hide
 * with the rest of the UI) so users can always re-show controls.
 */
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Image as ImageIcon, Music, Sparkles, Clock, Eye, EyeOff, Settings2, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type FocusHubAction = "theme" | "music" | "animation" | "timer" | "toggle-hide";

interface FocusHubProps {
  uiHidden: boolean;
  onAction: (a: FocusHubAction) => void;
  className?: string;
}

const ACTIONS = [
  { key: "theme",       icon: ImageIcon, label: "Theme",     color: "from-violet-500 to-fuchsia-500" },
  { key: "music",       icon: Music,     label: "Music",     color: "from-emerald-500 to-teal-500" },
  { key: "animation",   icon: Sparkles,  label: "Animation", color: "from-amber-500 to-orange-500" },
  { key: "timer",       icon: Clock,     label: "Timer",     color: "from-sky-500 to-blue-500" },
] as const;

export const FocusHub = ({ uiHidden, onAction, className }: FocusHubProps) => {
  const [open, setOpen] = useState(false);
  const [pulseHint, setPulseHint] = useState(true);
  const idleRef = useRef<ReturnType<typeof setTimeout>>();

  // Stop the first-time pulse hint after the user opens it once
  useEffect(() => {
    if (open) setPulseHint(false);
  }, [open]);

  // Auto-collapse after inactivity
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    idleRef.current = setTimeout(close, 5000);
    return () => { if (idleRef.current) clearTimeout(idleRef.current); };
  }, [open]);

  const reset = () => {
    if (idleRef.current) clearTimeout(idleRef.current);
    idleRef.current = setTimeout(() => setOpen(false), 5000);
  };

  return (
    <div
      className={cn(
        "fixed left-1/2 -translate-x-1/2 z-[80] flex flex-col items-center gap-3",
        className
      )}
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)" }}
      onMouseMove={reset}
      onTouchStart={reset}
    >
      {/* Radial menu items */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex items-center gap-2 px-2 py-2 rounded-full bg-black/70 backdrop-blur-2xl border border-white/15 shadow-2xl"
          >
            {ACTIONS.map((a) => {
              const Icon = a.icon;
              return (
                <button
                  key={a.key}
                  onClick={() => { onAction(a.key as FocusHubAction); reset(); }}
                  className={cn(
                    "h-11 w-11 rounded-full grid place-items-center text-white",
                    "bg-gradient-to-br shadow-lg active:scale-95 transition-transform",
                    a.color
                  )}
                  aria-label={a.label}
                  title={a.label}
                >
                  <Icon className="h-5 w-5" />
                </button>
              );
            })}
            <button
              onClick={() => { onAction("toggle-hide"); reset(); }}
              className={cn(
                "h-11 w-11 rounded-full grid place-items-center text-white",
                "bg-gradient-to-br from-zinc-700 to-zinc-900 shadow-lg active:scale-95 transition-transform"
              )}
              aria-label={uiHidden ? "Show UI" : "Hide UI"}
              title={uiHidden ? "Show UI" : "Hide UI"}
            >
              {uiHidden ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trigger */}
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "h-14 w-14 rounded-full grid place-items-center",
          "bg-gradient-to-br from-primary to-fuchsia-600",
          "border-2 border-white/30 shadow-[0_8px_32px_rgba(124,58,237,0.5)]",
          "text-white",
          pulseHint && !open && "animate-[pulse-slow_2.4s_ease-in-out_infinite]"
        )}
        aria-label="Focus controls"
      >
        {open ? <X className="h-6 w-6" /> : <Settings2 className="h-6 w-6" />}
      </motion.button>
    </div>
  );
};
