/**
 * TimerCanvas — renders the timer in the user's selected style.
 *
 * - 12 styles, all pure SVG/CSS
 * - Adaptive contrast: uses CSS `mix-blend-mode: difference` so text is
 *   ALWAYS legible over any background image / theme.
 * - Tabular numerals everywhere for stable digit width.
 */
import { motion } from "framer-motion";
import type { TimerStyle } from "./TimerStylePicker";
import { cn } from "@/lib/utils";

interface TimerCanvasProps {
  style: TimerStyle;
  remaining: number;       // seconds
  total: number;           // seconds
  hidden?: boolean;        // dim to ~5% when "Hide UI"
  className?: string;
}

const fmt = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h > 0 ? `${h}:` : ""}${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
};

export const TimerCanvas = ({ style, remaining, total, hidden, className }: TimerCanvasProps) => {
  const text = fmt(remaining);
  const pct = total > 0 ? (total - remaining) / total : 0;
  const baseClass = cn(
    "select-none transition-opacity duration-500",
    hidden ? "opacity-[0.06]" : "opacity-100",
    className
  );

  if (style === "minimal" || style === "premium-black") {
    return (
      <div className={cn(baseClass, "text-center")}
           style={{ mixBlendMode: "difference", color: "white" }}>
        <div className={cn("font-mono font-extrabold tabular-nums tracking-tight",
          style === "premium-black" ? "text-[120px] leading-none" : "text-[88px] leading-none")}>
          {text}
        </div>
        {style === "minimal" && (
          <div className="text-[11px] uppercase tracking-[0.3em] mt-2 opacity-80">focus</div>
        )}
      </div>
    );
  }

  if (style === "ring") {
    const R = 110, C = 2 * Math.PI * R;
    return (
      <div className={cn(baseClass, "relative w-[260px] h-[260px]")}>
        <svg viewBox="0 0 260 260" className="absolute inset-0 -rotate-90">
          <circle cx="130" cy="130" r={R} stroke="rgba(255,255,255,0.15)" strokeWidth="6" fill="none" />
          <motion.circle
            cx="130" cy="130" r={R}
            stroke="hsl(var(--primary))" strokeWidth="6" fill="none" strokeLinecap="round"
            strokeDasharray={C} strokeDashoffset={C * (1 - pct)}
            transition={{ duration: 0.5 }}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center" style={{ mixBlendMode: "difference", color: "white" }}>
          <div className="text-5xl font-mono font-bold tabular-nums">{text}</div>
        </div>
      </div>
    );
  }

  if (style === "flip") {
    return (
      <div className={cn(baseClass, "flex gap-2")} style={{ mixBlendMode: "difference", color: "white" }}>
        {text.split("").map((ch, i) => (
          <motion.div
            key={i + ch}
            initial={{ rotateX: -90, opacity: 0 }}
            animate={{ rotateX: 0, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className={cn(
              "rounded-md font-mono font-bold tabular-nums",
              ch === ":" ? "text-5xl px-1" : "text-6xl bg-black/30 px-3 py-1 border border-white/10"
            )}
          >
            {ch}
          </motion.div>
        ))}
      </div>
    );
  }

  if (style === "pixel") {
    return (
      <div className={cn(baseClass, "px-4 py-3 rounded-lg bg-black/60 border border-red-500/40")}>
        <div className="font-mono font-extrabold tabular-nums text-[64px] leading-none text-red-400"
             style={{ textShadow: "0 0 12px rgba(239,68,68,0.6), 0 0 4px rgba(239,68,68,0.8)" }}>
          {text}
        </div>
      </div>
    );
  }

  if (style === "analog") {
    const seconds = remaining % 60;
    const minutes = Math.floor(remaining / 60) % 60;
    const hours = Math.floor(remaining / 3600);
    const sa = (seconds / 60) * 360;
    const ma = (minutes / 60) * 360 + (seconds / 60) * 6;
    const ha = (hours / 12) * 360 + (minutes / 60) * 30;
    return (
      <div className={cn(baseClass, "relative w-[260px] h-[260px] rounded-full")}>
        <div className="absolute inset-0 rounded-full bg-black/40 backdrop-blur-md border border-white/20" />
        {/* tick marks */}
        {Array.from({ length: 12 }).map((_, i) => {
          const a = (i / 12) * 360;
          return <div key={i} className="absolute left-1/2 top-2 w-0.5 h-3 bg-white/60 origin-bottom"
            style={{ transform: `translateX(-50%) rotate(${a}deg) translateY(0)` }} />;
        })}
        {/* hour */}
        <div className="absolute left-1/2 top-1/2 w-1.5 h-16 bg-white origin-top rounded-full"
             style={{ transform: `translate(-50%,0) rotate(${ha}deg)` }} />
        {/* minute */}
        <div className="absolute left-1/2 top-1/2 w-1 h-24 bg-white origin-top rounded-full"
             style={{ transform: `translate(-50%,0) rotate(${ma}deg)` }} />
        {/* second */}
        <div className="absolute left-1/2 top-1/2 w-0.5 h-28 bg-primary origin-top rounded-full"
             style={{ transform: `translate(-50%,0) rotate(${sa}deg)` }} />
        <div className="absolute left-1/2 top-1/2 w-3 h-3 bg-primary rounded-full -translate-x-1/2 -translate-y-1/2" />
      </div>
    );
  }

  if (style === "liquid") {
    return (
      <div className={cn(baseClass, "relative w-[180px] h-[260px] rounded-3xl border-4 border-white/40 overflow-hidden")}>
        <motion.div
          className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-cyan-400 to-cyan-200"
          animate={{ height: `${(1 - pct) * 100}%` }}
          transition={{ duration: 0.7 }}
        />
        <div className="absolute inset-0 grid place-items-center" style={{ mixBlendMode: "difference", color: "white" }}>
          <div className="text-3xl font-mono font-bold tabular-nums">{text}</div>
        </div>
      </div>
    );
  }

  if (style === "hourglass") {
    const top = 1 - pct, bot = pct;
    return (
      <div className={cn(baseClass, "relative w-[180px] h-[260px]")}>
        <svg viewBox="0 0 180 260" className="absolute inset-0">
          <path d="M30 20 H150 L100 130 L150 240 H30 L80 130 Z" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.5)" strokeWidth="2" />
          <rect x="40" y={20 + (110 * pct)} width="100" height={110 * top} fill="rgba(245,158,11,0.7)" clipPath="path('M30 20 H150 L100 130 L150 240 H30 L80 130 Z')" />
          <rect x="40" y="130" width="100" height={110 * bot} fill="rgba(245,158,11,0.7)" clipPath="path('M30 20 H150 L100 130 L150 240 H30 L80 130 Z')" />
        </svg>
        <div className="absolute -bottom-10 left-0 right-0 text-center font-mono text-2xl font-bold tabular-nums" style={{ mixBlendMode: "difference", color: "white" }}>
          {text}
        </div>
      </div>
    );
  }

  if (style === "orbit") {
    const angle = pct * 360;
    return (
      <div className={cn(baseClass, "relative w-[260px] h-[260px]")}>
        <div className="absolute inset-0 rounded-full border border-white/20" />
        <div className="absolute inset-6 rounded-full border border-white/15" />
        <div className="absolute inset-12 rounded-full border border-white/10" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 origin-center"
             style={{ transform: `translate(-50%,-50%) rotate(${angle}deg) translateY(-110px)` }}>
          <div className="h-3 w-3 rounded-full bg-primary shadow-[0_0_12px_hsl(var(--primary))]" />
        </div>
        <div className="absolute inset-0 grid place-items-center" style={{ mixBlendMode: "difference", color: "white" }}>
          <div className="text-4xl font-mono font-bold tabular-nums">{text}</div>
        </div>
      </div>
    );
  }

  if (style === "pulse") {
    return (
      <div className={cn(baseClass, "relative w-[260px] h-[260px] grid place-items-center")}>
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute rounded-full border-2 border-pink-400/40"
            initial={{ width: 80, height: 80, opacity: 0.8 }}
            animate={{ width: 240, height: 240, opacity: 0 }}
            transition={{ duration: 3, repeat: Infinity, delay: i * 1, ease: "easeOut" }}
          />
        ))}
        <div style={{ mixBlendMode: "difference", color: "white" }}>
          <div className="text-5xl font-mono font-bold tabular-nums">{text}</div>
        </div>
      </div>
    );
  }

  if (style === "constellation") {
    return (
      <div className={cn(baseClass, "relative")}>
        <div className="text-[88px] font-mono font-extrabold tabular-nums leading-none"
             style={{ mixBlendMode: "difference", color: "white",
                      textShadow: "0 0 20px rgba(255,255,255,0.4)" }}>
          {text}
        </div>
        {/* faint star dots */}
        {Array.from({ length: 18 }).map((_, i) => (
          <div key={i} className="absolute w-1 h-1 rounded-full bg-white/60 animate-pulse"
            style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    );
  }

  if (style === "vinyl") {
    return (
      <div className={cn(baseClass, "relative w-[260px] h-[260px]")}>
        <motion.div
          className="absolute inset-0 rounded-full bg-gradient-to-br from-zinc-900 via-black to-zinc-800 border-2 border-white/10"
          animate={{ rotate: 360 }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
        >
          <div className="absolute inset-4 rounded-full border border-white/15" />
          <div className="absolute inset-12 rounded-full border border-white/10" />
          <div className="absolute inset-1/4 rounded-full bg-primary/80 grid place-items-center">
            <div className="h-3 w-3 rounded-full bg-black" />
          </div>
        </motion.div>
        <div className="absolute -bottom-10 left-0 right-0 text-center" style={{ mixBlendMode: "difference", color: "white" }}>
          <div className="text-3xl font-mono font-bold tabular-nums">{text}</div>
        </div>
      </div>
    );
  }

  // fallback
  return (
    <div className={cn(baseClass, "text-center")} style={{ mixBlendMode: "difference", color: "white" }}>
      <div className="text-[88px] font-mono font-extrabold tabular-nums leading-none">{text}</div>
    </div>
  );
};
