/**
 * AnimatedAvatar — Pure SVG/CSS smiley face.
 * - Round face with primary→purple gradient
 * - Two eyes that periodically blink
 * - Mouth that morphs between smile / open-smile / smirk every ~6s
 * - No nose, accessible, respects prefers-reduced-motion
 */
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface AnimatedAvatarProps {
  size?: number;
  className?: string;
  ariaLabel?: string;
}

const MOUTHS = [
  // smile
  "M 30 60 Q 50 78 70 60",
  // open smile
  "M 30 58 Q 50 82 70 58 Q 50 70 30 58",
  // smirk
  "M 32 64 Q 50 72 68 58",
  // grin
  "M 30 60 Q 50 80 70 60",
];

export const AnimatedAvatar = ({ size = 32, className, ariaLabel = "Profile" }: AnimatedAvatarProps) => {
  const [mouthIdx, setMouthIdx] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(m.matches);
    const h = (e: MediaQueryListEvent) => setReduced(e.matches);
    m.addEventListener?.("change", h);
    return () => m.removeEventListener?.("change", h);
  }, []);

  useEffect(() => {
    if (reduced) return;
    const i = setInterval(() => setMouthIdx((p) => (p + 1) % MOUTHS.length), 6000);
    return () => clearInterval(i);
  }, [reduced]);

  return (
    <div
      role="img"
      aria-label={ariaLabel}
      className={cn("inline-block relative", className)}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className="block"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="aa-face" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(263 70% 65%)" />
          </linearGradient>
          <radialGradient id="aa-shine" cx="35%" cy="30%" r="50%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.35)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
        </defs>
        {/* Face */}
        <circle cx="50" cy="50" r="48" fill="url(#aa-face)" />
        <circle cx="50" cy="50" r="48" fill="url(#aa-shine)" />
        {/* Eyes */}
        <g fill="white" className={reduced ? "" : "aa-blink"}>
          <ellipse cx="35" cy="42" rx="5" ry="6" />
          <ellipse cx="65" cy="42" rx="5" ry="6" />
        </g>
        <g fill="hsl(var(--primary-foreground))" opacity="0.95">
          <circle cx="35" cy="43" r="2" />
          <circle cx="65" cy="43" r="2" />
        </g>
        {/* Mouth */}
        <path
          d={MOUTHS[mouthIdx]}
          fill="none"
          stroke="white"
          strokeWidth="3.5"
          strokeLinecap="round"
          style={{ transition: "d 0.5s cubic-bezier(.4,0,.2,1)" }}
        />
      </svg>
      <style>{`
        @keyframes aa-blink-kf {
          0%, 92%, 100% { transform: scaleY(1); }
          94%, 97% { transform: scaleY(0.1); }
        }
        .aa-blink {
          transform-origin: center 42px;
          animation: aa-blink-kf 4.5s infinite;
        }
      `}</style>
    </div>
  );
};

export default AnimatedAvatar;
