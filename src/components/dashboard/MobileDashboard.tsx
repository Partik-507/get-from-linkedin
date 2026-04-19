/**
 * MobileDashboard — Native 4-row vertical feed.
 *
 *  Row 1 — Greeting + streak ring
 *  Row 2 — Today's plan (next 3 events, swipeable cards)
 *  Row 3 — Quick stats (3 tiles: focus mins · tasks done · habits)
 *  Row 4 — Quick actions (Notes / Library / Focus / Study)
 *
 * Full-bleed, no card-in-card, native list rhythm. Uses semantic tokens.
 */
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Flame, Clock, CheckSquare, Heart, StickyNote, BookOpen, Zap, Calendar, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Props {
  name: string;
  streak: number;
  focusMinutes: number;
  tasksDone: number;
  tasksTotal: number;
  habitsDone: number;
  habitsTotal: number;
  upcoming: { id: string; title: string; start: any; color?: string }[];
}

const greet = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

const StreakRing = ({ value }: { value: number }) => {
  const cap = Math.min(value, 30);
  const pct = (cap / 30) * 100;
  const C = 2 * Math.PI * 28;
  return (
    <div className="relative h-[72px] w-[72px] shrink-0">
      <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90">
        <circle cx="32" cy="32" r="28" fill="none" stroke="hsl(var(--muted))" strokeWidth="5" />
        <motion.circle
          cx="32" cy="32" r="28" fill="none" stroke="url(#streakGrad)" strokeWidth="5"
          strokeLinecap="round" strokeDasharray={C}
          initial={{ strokeDashoffset: C }}
          animate={{ strokeDashoffset: C - (C * pct) / 100 }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
        <defs>
          <linearGradient id="streakGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="#e11d48" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <Flame className="h-5 w-5 text-primary" fill="currentColor" />
      </div>
    </div>
  );
};

export const MobileDashboard = ({
  name, streak, focusMinutes, tasksDone, tasksTotal, habitsDone, habitsTotal, upcoming,
}: Props) => {
  const stats = [
    { icon: Clock, label: "Focus", value: `${Math.floor(focusMinutes / 60)}h ${focusMinutes % 60}m`, tint: "text-primary", bg: "bg-primary/10" },
    { icon: CheckSquare, label: "Tasks", value: `${tasksDone}/${tasksTotal}`, tint: "text-emerald-500", bg: "bg-emerald-500/10" },
    { icon: Heart, label: "Habits", value: `${habitsDone}/${habitsTotal}`, tint: "text-pink-500", bg: "bg-pink-500/10" },
  ];

  const actions = [
    { to: "/notes",    icon: StickyNote, label: "Notes",   gradient: "from-violet-500 to-fuchsia-500" },
    { to: "/focus",    icon: Zap,        label: "Focus",   gradient: "from-amber-500 to-orange-500" },
    { to: "/study",    icon: Calendar,   label: "Study",   gradient: "from-sky-500 to-blue-500" },
    { to: "/resources",icon: BookOpen,   label: "Library", gradient: "from-emerald-500 to-teal-500" },
  ];

  return (
    <div className="md:hidden flex flex-col gap-5 px-4 pt-4 pb-[calc(5rem+env(safe-area-inset-bottom,0px))]">
      {/* Row 1 — Greeting + streak ring */}
      <motion.section
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4"
      >
        <StreakRing value={streak} />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground font-body">{greet()}</p>
          <h1 className="text-xl font-heading font-bold tracking-tight truncate">{name}</h1>
          <p className="text-[11px] text-muted-foreground font-body mt-0.5">
            {streak > 0 ? `🔥 ${streak} day streak — keep going` : "Start a streak today"}
          </p>
        </div>
      </motion.section>

      {/* Row 2 — Today's plan (horizontally swipeable) */}
      <motion.section
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.05 } }}
      >
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-sm font-heading font-semibold">Today's Plan</h2>
          <Link to="/study" className="text-[11px] text-primary font-body flex items-center gap-1">
            All <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {upcoming.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/60 px-4 py-6 text-center">
            <Calendar className="h-5 w-5 text-muted-foreground/60 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground font-body">Nothing scheduled. Enjoy the calm.</p>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4 snap-x snap-mandatory">
            {upcoming.slice(0, 5).map((e) => {
              const start = e.start?.toDate ? e.start.toDate() : new Date(e.start);
              return (
                <Link
                  key={e.id}
                  to="/study"
                  className="snap-start shrink-0 w-[78%] rounded-2xl bg-card border border-border/60 p-4 active:scale-[0.98] transition-transform"
                >
                  <div className="h-1 w-10 rounded-full mb-3" style={{ backgroundColor: e.color || "hsl(var(--primary))" }} />
                  <p className="font-heading font-semibold text-sm leading-tight line-clamp-2">{e.title}</p>
                  <p className="text-[11px] text-muted-foreground font-body mt-1.5 tabular-nums">
                    {isNaN(start.getTime?.()) ? "—" : format(start, "EEE · h:mm a")}
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </motion.section>

      {/* Row 3 — Quick stats */}
      <motion.section
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.1 } }}
      >
        <h2 className="text-sm font-heading font-semibold mb-2.5">At a Glance</h2>
        <div className="grid grid-cols-3 gap-2.5">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="rounded-2xl bg-card border border-border/60 p-3 flex flex-col gap-1.5">
                <div className={cn("h-7 w-7 rounded-xl grid place-items-center", s.bg)}>
                  <Icon className={cn("h-3.5 w-3.5", s.tint)} />
                </div>
                <p className="text-[10px] text-muted-foreground font-body">{s.label}</p>
                <p className="text-sm font-heading font-bold tabular-nums leading-none">{s.value}</p>
              </div>
            );
          })}
        </div>
      </motion.section>

      {/* Row 4 — Quick actions */}
      <motion.section
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.15 } }}
      >
        <h2 className="text-sm font-heading font-semibold mb-2.5">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-2.5">
          {actions.map((a) => {
            const Icon = a.icon;
            return (
              <Link
                key={a.to}
                to={a.to}
                className={cn(
                  "h-20 rounded-2xl p-3 flex flex-col items-start justify-between text-white",
                  "bg-gradient-to-br shadow-md active:scale-[0.97] transition-transform",
                  a.gradient,
                )}
              >
                <Icon className="h-5 w-5 drop-shadow" />
                <span className="font-heading font-semibold text-sm">{a.label}</span>
              </Link>
            );
          })}
        </div>
      </motion.section>
    </div>
  );
};
