/**
 * MobileDashboard — Premium mobile-native dashboard.
 * Full-bleed bg-background. All sections use bg-card cards.
 * Full web parity: every widget from the desktop, optimized for mobile.
 */
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Flame, Clock, CheckSquare, Heart, StickyNote, BookOpen, Zap,
  Calendar, ArrowRight, Target, TrendingUp, BarChart3, CalendarDays,
} from "lucide-react";
import { format, subDays } from "date-fns";
import { cn } from "@/lib/utils";
import { MobilePageHeader } from "@/components/MobilePageHeader";
import { Progress } from "@/components/ui/progress";

interface CourseStat {
  projectId: string;
  projectCode: string;
  projectName: string;
  progress: number;
  studiedCount: number;
  totalQuestions: number;
}

interface ActivityItem {
  id: string;
  type: "focus" | "task";
  text: string;
  date?: string;
}

interface Props {
  name: string;
  streak: number;
  focusMinutes: number;
  tasksDone: number;
  tasksTotal: number;
  habitsDone: number;
  habitsTotal: number;
  upcoming: { id: string; title: string; start: any; color?: string }[];
  courses?: CourseStat[];
  activity?: Record<string, number>;
  recentActivity?: ActivityItem[];
  habits?: { id: string; name: string; emoji: string; color: string; done?: boolean }[];
}

const greet = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

const CompactHeatmap = ({ data }: { data: Record<string, number> }) => {
  const cells = Array.from({ length: 49 }).map((_, i) => {
    const d = format(subDays(new Date(), 48 - i), "yyyy-MM-dd");
    const v = data[d] || 0;
    return { d, v };
  });
  const max = Math.max(1, ...cells.map(c => c.v));
  return (
    <div className="grid grid-cols-7 grid-rows-7 grid-flow-col gap-[3px]">
      {cells.map((c) => (
        <div
          key={c.d}
          className="h-3 w-3 rounded-[3px]"
          style={{
            backgroundColor: c.v === 0
              ? "hsl(var(--muted))"
              : `hsl(var(--primary) / ${0.2 + (c.v / max) * 0.8})`,
          }}
        />
      ))}
    </div>
  );
};

// Reusable section header
const SectionHeader = ({
  title, icon: Icon, to, linkLabel = "Manage",
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  to?: string;
  linkLabel?: string;
}) => (
  <div className="flex items-center justify-between mb-2.5">
    <h2 className="text-sm font-heading font-semibold flex items-center gap-1.5">
      <Icon className="h-3.5 w-3.5 text-primary" />
      {title}
    </h2>
    {to && (
      <Link to={to} className="text-[11px] text-primary font-body flex items-center gap-0.5 font-medium">
        {linkLabel} <ArrowRight className="h-3 w-3" />
      </Link>
    )}
  </div>
);

export const MobileDashboard = ({
  name, streak, focusMinutes, tasksDone, tasksTotal,
  habitsDone, habitsTotal, upcoming,
  courses = [], activity = {}, recentActivity = [],
  habits = [],
}: Props) => {

  const stats = [
    { icon: Clock, label: "Focus", value: `${Math.floor(focusMinutes / 60)}h ${focusMinutes % 60}m`, tint: "text-primary", bg: "bg-primary/10" },
    { icon: CheckSquare, label: "Tasks", value: `${tasksDone}/${tasksTotal}`, tint: "text-[hsl(var(--success))]", bg: "bg-[hsl(var(--success))]/10" },
    { icon: Heart, label: "Habits", value: `${habitsDone}/${habitsTotal}`, tint: "text-[hsl(var(--streak))]", bg: "bg-[hsl(var(--streak))]/10" },
  ];

  return (
    <div className="md:hidden flex flex-col bg-background pb-[calc(5rem+env(safe-area-inset-bottom,0px))]">

      {/* Sticky header */}
      <MobilePageHeader>
        <div className="px-4 pt-3 pb-3">
          <span className="font-heading font-bold text-[22px] leading-none text-foreground">Dashboard</span>
        </div>
      </MobilePageHeader>

      <div className="flex flex-col gap-5 px-4 pt-4">

        {/* 1 — Greeting card */}
        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/15">
            <div className="h-14 w-14 rounded-full bg-gradient-to-br from-primary to-[hsl(240,70%,50%)] flex items-center justify-center text-primary-foreground font-heading font-bold text-xl shrink-0 shadow-md shadow-primary/20">
              {name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] text-muted-foreground font-body">{greet()}</p>
              <h2 className="text-[18px] font-heading font-bold tracking-tight truncate">{name}</h2>
              <div className="flex items-center gap-1.5 mt-1">
                {streak > 0 ? (
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[hsl(var(--streak))]/10 border border-[hsl(var(--streak))]/20">
                    <Flame className="h-3 w-3 text-[hsl(var(--streak))]" />
                    <span className="text-[11px] font-body font-semibold text-[hsl(var(--streak))]">{streak} day streak</span>
                  </div>
                ) : (
                  <span className="text-[11px] text-muted-foreground font-body">Start a streak today 🎯</span>
                )}
              </div>
            </div>
          </div>
        </motion.section>

        {/* 2 — At a Glance */}
        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.04 } }}>
          <SectionHeader title="At a Glance" icon={BarChart3} />
          <div className="grid grid-cols-3 gap-2.5">
            {stats.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="rounded-2xl bg-card border border-border/50 p-3 flex flex-col gap-1.5">
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

        {/* 3 — Habits + Upcoming in 2-col */}
        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.07 } }}>
          <div className="grid grid-cols-2 gap-3">
            {/* Habits card */}
            <div className="rounded-2xl bg-card border border-border/50 p-3.5 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <Heart className="h-3.5 w-3.5 text-pink-500" />
                  <span className="text-xs font-heading font-semibold">Habits</span>
                </div>
                <Link to="/study" className="text-[10px] text-primary font-body font-medium">Manage</Link>
              </div>
              {habits.length === 0 ? (
                <p className="text-[11px] text-muted-foreground font-body flex-1">No habits yet.</p>
              ) : (
                <div className="space-y-2 flex-1">
                  {habits.slice(0, 4).map((h) => (
                    <div key={h.id} className="flex items-center gap-2">
                      <span className="text-sm shrink-0">{h.emoji}</span>
                      <span className="text-[11px] font-body flex-1 truncate">{h.name}</span>
                      <div className={cn(
                        "h-4 w-4 rounded-full border flex items-center justify-center text-[8px] shrink-0",
                        h.done ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/30"
                      )}>
                        {h.done && "✓"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Upcoming card */}
            <div className="rounded-2xl bg-card border border-border/50 p-3.5 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-heading font-semibold">Upcoming</span>
                </div>
                <Link to="/study" className="text-[10px] text-primary font-body font-medium">Manage</Link>
              </div>
              {upcoming.length === 0 ? (
                <p className="text-[11px] text-muted-foreground font-body flex-1">Nothing scheduled.</p>
              ) : (
                <div className="space-y-2 flex-1">
                  {upcoming.slice(0, 4).map((e) => {
                    const start = e.start?.toDate ? e.start.toDate() : new Date(e.start);
                    return (
                      <div key={e.id} className="flex items-start gap-2">
                        <div className="h-2 w-2 rounded-full mt-1 shrink-0" style={{ backgroundColor: e.color || "hsl(var(--primary))" }} />
                        <div className="min-w-0">
                          <p className="text-[11px] font-body font-medium leading-tight line-clamp-1">{e.title}</p>
                          <p className="text-[10px] text-muted-foreground font-body tabular-nums">
                            {isNaN(start.getTime?.()) ? "—" : format(start, "EEE h:mm a")}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </motion.section>

        {/* 4 — Course Progress */}
        {courses.length > 0 && (
          <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.1 } }}>
            <SectionHeader title="Course Progress" icon={Target} to="/" linkLabel="All courses" />
            <div className="rounded-2xl bg-card border border-border/50 divide-y divide-border/40">
              {courses.slice(0, 4).map((c) => (
                <div key={c.projectId} className="px-4 py-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                        {c.projectCode.slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-body font-semibold truncate">{c.projectCode}</p>
                        <p className="text-[10px] text-muted-foreground font-body truncate">{c.projectName}</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-body tabular-nums text-muted-foreground shrink-0 ml-2">
                      {c.studiedCount}/{c.totalQuestions} · {c.progress}%
                    </span>
                  </div>
                  <Progress value={c.progress} className="h-1.5" />
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {/* 5 — Recent Notes */}
        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.12 } }}>
          <SectionHeader title="Recent Notes" icon={StickyNote} to="/notes" linkLabel="Open Notes" />
          <div className="rounded-2xl bg-card border border-border/50 p-4 text-center">
            <StickyNote className="h-7 w-7 text-muted-foreground/20 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground font-body">Open Notes OS to see recent pages here.</p>
          </div>
        </motion.section>

        {/* 6 — Activity Heatmap */}
        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.14 } }}>
          <SectionHeader title="Study Activity" icon={BarChart3} />
          <div className="rounded-2xl bg-card border border-border/50 p-4 flex items-center gap-4">
            <CompactHeatmap data={activity} />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-muted-foreground font-body leading-relaxed">
                Each square = a study day. Darker = more reviews.
              </p>
              <p className="text-xs font-body font-semibold mt-1.5">
                {Object.values(activity).reduce((a, b) => a + b, 0)} total reviews
              </p>
            </div>
          </div>
        </motion.section>

        {/* 7 — Recent Activity */}
        {recentActivity.length > 0 && (
          <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.16 } }}>
            <SectionHeader title="Recent Activity" icon={TrendingUp} />
            <div className="rounded-2xl bg-card border border-border/50 divide-y divide-border/40">
              {recentActivity.slice(0, 6).map((a) => {
                const Icon = a.type === "focus" ? Zap : CheckSquare;
                const tint = a.type === "focus" ? "text-primary" : "text-[hsl(var(--success))]";
                return (
                  <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                    <Icon className={cn("h-4 w-4 shrink-0", tint)} />
                    <p className="flex-1 text-xs font-body truncate">{a.text}</p>
                    {a.date && <span className="text-[10px] text-muted-foreground font-body shrink-0">{a.date}</span>}
                  </div>
                );
              })}
            </div>
          </motion.section>
        )}

        {/* 8 — Quick nav */}
        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.18 } }}>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { to: "/study", icon: CalendarDays, label: "Study OS", sub: "Calendar & tasks", grad: "from-primary to-[hsl(240,70%,50%)]" },
              { to: "/notes", icon: StickyNote, label: "Notes OS", sub: "Your workspace", grad: "from-[hsl(210,80%,50%)] to-primary" },
              { to: "/resources", icon: BookOpen, label: "Library", sub: "Resources", grad: "from-[hsl(142,71%,45%)] to-[hsl(180,70%,45%)]" },
              { to: "/focus", icon: Zap, label: "Focus", sub: "Deep work", grad: "from-[hsl(var(--streak))] to-[hsl(38,92%,50%)]" },
            ].map((a) => {
              const Icon = a.icon;
              return (
                <Link
                  key={a.to}
                  to={a.to}
                  className={cn(
                    "h-[72px] rounded-2xl p-3.5 flex flex-col items-start justify-between text-primary-foreground",
                    "bg-gradient-to-br shadow-sm active:scale-[0.97] transition-transform",
                    a.grad,
                  )}
                >
                  <Icon className="h-4 w-4 drop-shadow" />
                  <div>
                    <p className="font-heading font-semibold text-[13px] leading-none">{a.label}</p>
                    <p className="text-[10px] opacity-80 font-body mt-0.5">{a.sub}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </motion.section>

      </div>
    </div>
  );
};
