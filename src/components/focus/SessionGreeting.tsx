/**
 * SessionGreeting — full-screen pre-session intro.
 *
 * "Take a breath. Let's begin." + 3-2-1 ring + personalized welcome.
 * Auto-fades after the countdown completes.
 */
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const QUOTES = [
  "Discipline is freedom.",
  "Small steps, every day.",
  "The work writes itself when you show up.",
  "Calm mind, sharp focus.",
  "You are exactly where you need to be.",
  "Begin again. Always begin again.",
  "Depth over distraction.",
  "One breath. One task. One step.",
];

interface SessionGreetingProps {
  userName?: string;
  sessionCount?: number;
  onComplete: () => void;
}

export const SessionGreeting = ({ userName, sessionCount, onComplete }: SessionGreetingProps) => {
  const [count, setCount] = useState(3);
  const [quote] = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)]);

  useEffect(() => {
    if (count <= 0) {
      const t = setTimeout(onComplete, 600);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [count, onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-[200] grid place-items-center bg-black/85 backdrop-blur-2xl"
    >
      <div className="text-center px-6 max-w-md">
        <AnimatePresence mode="wait">
          {count > 0 ? (
            <motion.div
              key={count}
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.6, opacity: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <div className="relative w-40 h-40 mx-auto mb-8">
                <svg viewBox="0 0 160 160" className="absolute inset-0 -rotate-90">
                  <circle cx="80" cy="80" r="72" stroke="rgba(255,255,255,0.1)" strokeWidth="3" fill="none" />
                  <motion.circle
                    cx="80" cy="80" r="72"
                    stroke="hsl(var(--primary))" strokeWidth="3" fill="none"
                    strokeLinecap="round" strokeDasharray={2 * Math.PI * 72}
                    initial={{ strokeDashoffset: 0 }}
                    animate={{ strokeDashoffset: 2 * Math.PI * 72 }}
                    transition={{ duration: 1, ease: "linear" }}
                  />
                </svg>
                <div className="absolute inset-0 grid place-items-center text-7xl font-heading font-extrabold text-white tabular-nums">
                  {count}
                </div>
              </div>
              <p className="text-white/70 font-body text-sm">Take a breath. Let's begin.</p>
            </motion.div>
          ) : (
            <motion.div
              key="welcome"
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.4 }}
            >
              <p className="text-white text-2xl font-heading font-semibold mb-2">
                {userName ? `Welcome back, ${userName}.` : "Welcome back."}
              </p>
              {sessionCount && sessionCount > 0 && (
                <p className="text-white/60 font-body text-sm mb-4">
                  Your {sessionCount}{sessionCount === 1 ? "st" : sessionCount === 2 ? "nd" : sessionCount === 3 ? "rd" : "th"} session.
                </p>
              )}
              <p className="text-white/80 font-body italic text-base mt-3">"{quote}"</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
