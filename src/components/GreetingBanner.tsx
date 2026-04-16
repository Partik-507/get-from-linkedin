import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Sparkles, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { loadStreak } from "@/lib/spacedRepetition";

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

const MILESTONES = [3, 7, 14, 30, 50, 100, 365];

export const GreetingBanner = () => {
  const { user, isGuest } = useAuth();
  const streak = useMemo(() => loadStreak(), []);
  const [showMilestone, setShowMilestone] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const isMilestone = MILESTONES.includes(streak.current);

  useEffect(() => {
    if (!isMilestone) return;
    const key = `vv_milestone_${streak.current}_${new Date().toISOString().slice(0, 10)}`;
    if (localStorage.getItem(key)) return;
    setShowMilestone(true);
    localStorage.setItem(key, "1");
  }, [isMilestone, streak.current]);

  if (dismissed) return null;

  const name = user?.displayName?.split(" ")[0] || (isGuest ? "Guest" : "Student");
  const greeting = getGreeting();

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="vv-card p-5 mb-6 flex items-center gap-4 relative overflow-hidden"
      >
        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-[hsl(240,70%,50%)] flex items-center justify-center text-primary-foreground font-bold text-lg shrink-0">
          {name[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-heading font-bold text-lg leading-tight">
            {greeting}, <span className="text-gradient">{name}</span>
          </h2>
          <p className="text-sm text-muted-foreground font-body mt-0.5">
            {streak.current > 0
              ? <>You're on a <span className="text-[hsl(var(--streak))] font-semibold inline-flex items-center gap-1"><Flame className="h-3 w-3" />{streak.current}-day streak</span> — keep it going!</>
              : "Start a focus session today to begin your streak."}
          </p>
        </div>
        {streak.current > 0 && (
          <div className="hidden sm:flex items-center gap-2 text-xs font-body text-muted-foreground">
            <span>Longest: <span className="text-foreground font-semibold tabular-nums">{streak.longest}d</span></span>
          </div>
        )}
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-2 right-2 h-6 w-6 flex items-center justify-center text-muted-foreground/50 hover:text-foreground rounded-md hover:bg-muted/40"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </motion.div>

      <AnimatePresence>
        {showMilestone && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowMilestone(false)}
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9 }}
              className="bg-card rounded-2xl p-8 max-w-sm w-full text-center relative shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-[hsl(var(--streak))] to-amber-500 flex items-center justify-center mx-auto mb-4">
                <Flame className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-heading font-bold mb-2">{streak.current} day streak!</h3>
              <p className="text-sm text-muted-foreground font-body mb-6">
                <Sparkles className="inline h-4 w-4 text-[hsl(var(--gold))] mr-1" />
                You're building serious momentum. Keep showing up!
              </p>
              <button
                onClick={() => setShowMilestone(false)}
                className="bg-primary text-primary-foreground rounded-lg px-6 py-2.5 font-body font-medium text-sm hover:bg-primary/90 transition-colors"
              >
                Keep going
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
