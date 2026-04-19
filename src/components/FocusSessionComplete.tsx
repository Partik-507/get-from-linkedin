import { useEffect, useRef, useState } from "react";
import { Zap, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface FocusSessionCompleteProps {
  focusDuration: number;     // in minutes
  focusMode: string;
  weekTotalMinutes?: number; // optional rollup stat
  streak?: number;           // current focus streak (days)
  onSave: (mood: number, note: string) => void;
}

/**
 * FocusSessionComplete — celebration screen after a session ends.
 *
 *  - 2s confetti burst from center (pure canvas)
 *  - Stats card slides up
 *  - Mood emoji row (1-3)
 *  - Quick journal input + save
 */
export const FocusSessionComplete = ({
  focusDuration, focusMode, weekTotalMinutes, streak, onSave,
}: FocusSessionCompleteProps) => {
  const [mood, setMood] = useState(0);
  const [note, setNote] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Confetti burst
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const cx = canvas.width / 2, cy = canvas.height / 2.5;

    const colors = ["#7c3aed", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#fff"];
    const particles = Array.from({ length: 140 }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 4 + Math.random() * 8;
      return {
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        size: 4 + Math.random() * 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        rot: Math.random() * Math.PI,
        vRot: (Math.random() - 0.5) * 0.3,
        life: 1,
      };
    });

    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = (now - start) / 1000;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.vy += 0.18;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vRot;
        p.life = Math.max(0, 1 - t / 2.6);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.5);
        ctx.restore();
      }
      if (t < 2.8) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="fixed inset-0 z-[9998] bg-background/95 backdrop-blur-md flex items-center justify-center px-4">
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />
      <motion.div
        initial={{ y: 40, opacity: 0, scale: 0.96 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ type: "spring", damping: 22, stiffness: 240 }}
        className="relative max-w-sm w-full"
      >
        <div className="rounded-3xl border border-border/60 bg-card p-7 text-center shadow-2xl">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/20 to-fuchsia-500/20 flex items-center justify-center mx-auto mb-3">
            <Sparkles className="h-7 w-7 text-primary" />
          </div>
          <h2 className="text-2xl font-heading font-bold mb-1">Beautiful work.</h2>
          <p className="text-muted-foreground font-body text-sm mb-5">
            {focusDuration} min · {focusMode} mode
          </p>

          {/* Stats row */}
          {(weekTotalMinutes !== undefined || streak !== undefined) && (
            <div className="flex items-center justify-center gap-2 mb-5">
              {streak !== undefined && (
                <div className="px-3 py-2 rounded-xl bg-secondary/60 flex-1">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-body">Streak</p>
                  <p className="text-lg font-heading font-bold tabular-nums">{streak}d 🔥</p>
                </div>
              )}
              {weekTotalMinutes !== undefined && (
                <div className="px-3 py-2 rounded-xl bg-secondary/60 flex-1">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-body">This week</p>
                  <p className="text-lg font-heading font-bold tabular-nums">
                    {Math.floor(weekTotalMinutes / 60)}h {weekTotalMinutes % 60}m
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Mood */}
          <div className="flex justify-center gap-3 mb-5">
            {[
              { emoji: "😤", label: "Hard", value: 1 },
              { emoji: "😊", label: "Good", value: 2 },
              { emoji: "🌊", label: "Flow", value: 3 },
            ].map((m) => (
              <button
                key={m.value}
                onClick={() => setMood(m.value)}
                className={cn(
                  "flex flex-col items-center gap-1 p-3 rounded-2xl transition-all flex-1",
                  mood === m.value ? "bg-primary/10 ring-2 ring-primary/40 scale-105" : "bg-secondary/40 hover:bg-secondary/70"
                )}
              >
                <span className="text-2xl">{m.emoji}</span>
                <span className="text-[10px] font-body text-muted-foreground">{m.label}</span>
              </button>
            ))}
          </div>

          <Textarea
            placeholder="Quick reflection (optional)…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="mb-4 text-sm font-body resize-none rounded-xl"
            rows={2}
          />
          <Button className="w-full font-body h-11 rounded-xl" onClick={() => onSave(mood, note)}>
            Save & Close
          </Button>
        </div>
      </motion.div>
    </div>
  );
};
