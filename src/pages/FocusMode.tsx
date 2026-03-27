import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { Focus, Timer, Lock, X, Flame, ArrowRight, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const MOTIVATIONAL = [
  "Stay focused! Every minute of study brings you closer to mastery. 📚",
  "You're doing amazing! Don't break the flow now. 🔥",
  "Champions are made in moments like these. Keep pushing! 💪",
  "Consistency is key. You've got this! 🌟",
  "The best investment you can make is in yourself. Stay committed! 🎯",
];

const FocusMode = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"choose" | "strict" | null>("choose");
  const [strictActive, setStrictActive] = useState(false);
  const [exitRequested, setExitRequested] = useState(false);
  const [exitCountdown, setExitCountdown] = useState(10);
  const [studyTimer, setStudyTimer] = useState(0);
  const [motivationalMsg, setMotivationalMsg] = useState("");

  // Strict mode timer
  useEffect(() => {
    if (!strictActive) return;
    const interval = setInterval(() => setStudyTimer((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [strictActive]);

  // Exit countdown
  useEffect(() => {
    if (!exitRequested) return;
    if (exitCountdown <= 0) return;
    const timer = setTimeout(() => setExitCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [exitRequested, exitCountdown]);

  const startStrict = useCallback(() => {
    setMode(null);
    setStrictActive(true);
    setStudyTimer(0);
    document.documentElement.requestFullscreen?.().catch(() => {});
  }, []);

  const requestExit = () => {
    setMotivationalMsg(MOTIVATIONAL[Math.floor(Math.random() * MOTIVATIONAL.length)]);
    setExitRequested(true);
    setExitCountdown(10);
  };

  const confirmExit = () => {
    document.exitFullscreen?.().catch(() => {});
    setStrictActive(false);
    setExitRequested(false);
  };

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h > 0 ? `${h}:` : ""}${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  // Strict mode fullscreen overlay
  if (strictActive) {
    return (
      <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center">
        <AnimatePresence>
          {exitRequested ? (
            <motion.div
              key="exit"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="text-center max-w-md px-6"
            >
              <AlertTriangle className="h-12 w-12 text-[hsl(38,92%,50%)] mx-auto mb-4" />
              <h2 className="text-2xl font-heading font-bold mb-3">Wait! Don't go yet</h2>
              <p className="text-muted-foreground font-body mb-6 leading-relaxed">{motivationalMsg}</p>
              <p className="text-sm text-muted-foreground font-body mb-6">
                You've studied for <span className="text-primary font-semibold">{formatTime(studyTimer)}</span>
              </p>
              <div className="flex gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={() => setExitRequested(false)}
                  className="font-body gap-2"
                >
                  <Flame className="h-4 w-4" /> Keep Studying
                </Button>
                <Button
                  variant="destructive"
                  onClick={confirmExit}
                  disabled={exitCountdown > 0}
                  className="font-body gap-2"
                >
                  {exitCountdown > 0 ? `Wait ${exitCountdown}s` : "Exit Session"}
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="study"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center"
            >
              <div className="mb-8">
                <Lock className="h-8 w-8 text-primary mx-auto mb-4 animate-pulse" />
                <h1 className="text-4xl font-heading font-extrabold mb-2">Focus Session</h1>
                <p className="text-muted-foreground font-body">Stay committed. You're doing great.</p>
              </div>
              <div className="text-7xl font-heading font-extrabold tabular-nums mb-8 text-gradient">
                {formatTime(studyTimer)}
              </div>
              <p className="text-sm text-muted-foreground font-body mb-4">
                Press Escape or click below to request exit
              </p>
              <Button variant="ghost" size="sm" onClick={requestExit} className="text-muted-foreground font-body">
                <X className="h-4 w-4 mr-1" /> End Session
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <Layout title="Focus Mode">
      <div className="max-w-2xl mx-auto py-12">
        <div className="text-center mb-12">
          <Focus className="h-12 w-12 text-primary mx-auto mb-4" />
          <h1 className="text-3xl sm:text-4xl font-heading font-extrabold tracking-tight mb-3">Focus Mode</h1>
          <p className="text-muted-foreground font-body text-lg">Choose your study intensity</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Strict Mode */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={startStrict}
            className="text-left p-8 rounded-2xl border-2 border-primary/30 bg-card hover:border-primary/60 transition-all group"
          >
            <Lock className="h-8 w-8 text-primary mb-4" />
            <h3 className="text-xl font-heading font-bold mb-2">Strict Mode</h3>
            <p className="text-sm text-muted-foreground font-body leading-relaxed mb-4">
              Full-screen lockdown. No easy exit. A 10-second cool-down before you can leave.
              Maximum commitment for maximum results.
            </p>
            <span className="inline-flex items-center gap-1.5 text-primary text-sm font-body font-medium">
              Enter Strict Mode <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
            </span>
          </motion.button>

          {/* Normal Mode */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate("/timer")}
            className="text-left p-8 rounded-2xl border-2 border-border/50 bg-card hover:border-primary/30 transition-all group"
          >
            <Timer className="h-8 w-8 text-[hsl(38,92%,50%)] mb-4" />
            <h3 className="text-xl font-heading font-bold mb-2">Normal Mode</h3>
            <p className="text-sm text-muted-foreground font-body leading-relaxed mb-4">
              A simple timer with ambient study music. Light or dark theme.
              Minimal and distraction-free.
            </p>
            <span className="inline-flex items-center gap-1.5 text-[hsl(38,92%,50%)] text-sm font-body font-medium">
              Open Timer <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
            </span>
          </motion.button>
        </div>
      </div>
    </Layout>
  );
};

export default FocusMode;
