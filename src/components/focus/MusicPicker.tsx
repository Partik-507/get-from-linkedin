/**
 * MusicPicker — same UI pattern as ThemePicker, but for ambient tracks.
 *
 *  - Horizontal strip of 80×80 cover thumbnails (gradient + emoji)
 *  - Mood filter chips
 *  - Volume slider + play/pause for selected track
 *  - Auto-dismiss after 5s of no interaction
 */
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Music, Volume2, X, Pause, Play } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { getAllTracks, MOOD_LABELS, type MusicMood } from "@/lib/focusMusicLibrary";

interface MusicPickerProps {
  open: boolean;
  selectedId: string | null;
  volume: number;
  isPlaying: boolean;
  onSelect: (id: string) => void;
  onTogglePlay: () => void;
  onVolumeChange: (v: number) => void;
  onClose: () => void;
  autoDismissMs?: number;
}

const MOODS: (MusicMood | "all")[] = ["all", "rain", "nature", "lofi", "café", "binaural", "noise", "classical", "cosmic"];

export const MusicPicker = ({
  open, selectedId, volume, isPlaying, onSelect, onTogglePlay, onVolumeChange, onClose,
  autoDismissMs = 6000,
}: MusicPickerProps) => {
  const idleTimer = useRef<ReturnType<typeof setTimeout>>();
  const [activeMood, setActiveMood] = useState<MusicMood | "all">("all");
  const tracks = getAllTracks();
  const filtered = activeMood === "all" ? tracks : tracks.filter((t) => t.mood === activeMood);

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
          initial={{ y: 240, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 240, opacity: 0 }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
          onMouseMove={resetIdle}
          onTouchStart={resetIdle}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] max-w-[min(720px,calc(100vw-16px))] w-full"
        >
          <div className="bg-black/75 backdrop-blur-2xl rounded-2xl border border-white/15 p-3 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-2 px-1">
              <div className="flex items-center gap-1.5 text-white/90 text-xs font-medium">
                <Music className="h-3.5 w-3.5" />
                Music
              </div>
              <div className="flex items-center gap-2">
                {selectedId && (
                  <button
                    onClick={() => { onTogglePlay(); resetIdle(); }}
                    className="h-7 w-7 grid place-items-center rounded-full bg-white/15 hover:bg-white/25 text-white"
                    aria-label={isPlaying ? "Pause" : "Play"}
                  >
                    {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  </button>
                )}
                <button onClick={onClose} className="h-7 w-7 grid place-items-center rounded-full text-white/70 hover:bg-white/10" aria-label="Close">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Mood chips */}
            <div className="overflow-x-auto no-scrollbar mb-2">
              <div className="flex gap-1.5 min-w-max">
                {MOODS.map((m) => (
                  <button
                    key={m}
                    onClick={() => { setActiveMood(m); resetIdle(); }}
                    className={cn(
                      "h-6 px-2.5 rounded-full text-[10px] font-medium transition shrink-0",
                      activeMood === m
                        ? "bg-primary text-primary-foreground"
                        : "bg-white/8 text-white/70 hover:bg-white/15"
                    )}
                  >
                    {m === "all" ? "All" : MOOD_LABELS[m]}
                  </button>
                ))}
              </div>
            </div>

            {/* Track strip */}
            <div className="overflow-x-auto no-scrollbar">
              <div className="flex gap-2 min-w-max pb-1">
                {filtered.map((t) => {
                  const active = t.id === selectedId;
                  return (
                    <button
                      key={t.id}
                      onClick={() => { onSelect(t.id); resetIdle(); }}
                      className={cn(
                        "relative h-20 w-20 rounded-xl overflow-hidden shrink-0 transition-all border-2",
                        active ? "border-primary scale-105 shadow-lg" : "border-white/15 hover:border-white/40 hover:scale-[1.02]"
                      )}
                      style={{ background: t.cover }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                      <div className="absolute inset-0 grid place-items-center">
                        <span className="text-2xl drop-shadow">{t.emoji}</span>
                      </div>
                      {active && isPlaying && (
                        <div className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary animate-pulse" />
                      )}
                      <div className="absolute bottom-1 left-1 right-1 text-left">
                        <div className="text-[9px] text-white/95 font-semibold leading-tight truncate">{t.name}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Volume */}
            {selectedId && (
              <div className="mt-2 flex items-center gap-2 px-1">
                <Volume2 className="h-3.5 w-3.5 text-white/70 shrink-0" />
                <Slider
                  value={[volume]}
                  onValueChange={([v]) => { onVolumeChange(v); resetIdle(); }}
                  max={100} step={1}
                  className="flex-1"
                />
                <span className="text-[10px] tabular-nums text-white/60 w-7 text-right">{volume}</span>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
