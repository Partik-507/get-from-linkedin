import { useState, useEffect, useMemo } from "react";
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Layout } from "@/components/Layout";
import { EmptyState } from "@/components/EmptyState";
import { CardSkeleton } from "@/components/LoadingSkeleton";
import { ActivityHeatmap } from "@/components/ActivityHeatmap";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Clock, Flame, CheckSquare, Heart, BarChart3,
  CalendarDays, StickyNote, BookOpen, Play,
  User, Target, TrendingUp, ArrowRight, Zap,
} from "lucide-react";
import { loadActivity, loadStreak, getStudiedIds, getDueQuestions } from "@/lib/spacedRepetition";
import { GreetingBanner } from "@/components/GreetingBanner";
import { MobileDashboard } from "@/components/dashboard/MobileDashboard";
import { format, subDays } from "date-fns";
import { BarChart, Bar, ResponsiveContainer } from "recharts";

interface FocusSession {
  id: string;
  duration: number;
  mode: string;
  date: string;
  mood?: number;
  abandoned?: boolean;
}

interface CalEvent {
  id: string;
  title: string;
  start: any;
  end: any;
  color: string;
}

interface HabitItem {
  id: string;
  name: string;
  emoji: string;
  color: string;
}

interface TaskItem {
  id: string;
  title: string;
  status: string;
  dueDate?: string;
  priority: string;
}

interface ProjectStats {
  projectId: string;
  projectCode: string;
  projectName: string;
  totalQuestions: number;
  studiedCount: number;
  progress: number;
  color: string;
}

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "#ef4444", high: "#f97316", medium: "#eab308", low: "#3b82f6", none: "#6b7280",
};

const Dashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>([]);
  const [calEvents, setCalEvents] = useState<CalEvent[]>([]);
  const [habits, setHabits] = useState<HabitItem[]>([]);
  const [habitLogs, setHabitLogs] = useState<Record<string, boolean>>({});
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [projectStats, setProjectStats] = useState<ProjectStats[]>([]);

  const activity = useMemo(() => loadActivity(), []);
  const streak = useMemo(() => loadStreak(), []);
  const studied = useMemo(() => getStudiedIds(), []);
  const todayStr = format(new Date(), "yyyy-MM-dd");

  const todayFocusMinutes = useMemo(() =>
    focusSessions.filter(s => s.date === todayStr && !s.abandoned).reduce((sum, s) => sum + (s.duration || 0), 0),
    [focusSessions, todayStr]
  );

  const todayTasks = useMemo(() => tasks.filter(t => t.dueDate === todayStr), [tasks, todayStr]);
  const todayTasksDone = useMemo(() => todayTasks.filter(t => t.status === "done").length, [todayTasks]);
  const habitsCompletedToday = useMemo(() => Object.values(habitLogs).filter(Boolean).length, [habitLogs]);

  // Sparkline data for focus
  const focusSparkline = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = format(subDays(new Date(), 6 - i), "yyyy-MM-dd");
      return {
        day: format(subDays(new Date(), 6 - i), "EEE"),
        minutes: focusSessions.filter(s => s.date === d && !s.abandoned).reduce((sum, s) => sum + (s.duration || 0), 0),
      };
    });
  }, [focusSessions]);

  useEffect(() => {
    document.title = "Dashboard — VivaVault";
    if (!user) { setLoading(false); return; }

    const fetchData = async () => {
      try {
        const [focusSnap, eventSnap, habitSnap, taskSnap, projSnap, qSnap, logSnap] = await Promise.all([
          getDocs(collection(db, "users", user.uid, "focusSessions")),
          getDocs(collection(db, "users", user.uid, "calendarEvents")),
          getDocs(collection(db, "users", user.uid, "habits")),
          getDocs(collection(db, "users", user.uid, "tasks")),
          getDocs(collection(db, "projects")),
          getDocs(collection(db, "questions")),
          getDoc(doc(db, "users", user.uid, "habitLogs", todayStr)),
        ]);

        setFocusSessions(focusSnap.docs.map(d => ({ id: d.id, ...d.data() } as FocusSession)));
        setCalEvents(eventSnap.docs.map(d => ({ id: d.id, ...d.data() } as CalEvent)));
        setHabits(habitSnap.docs.map(d => ({ id: d.id, ...d.data() } as HabitItem)));
        setTasks(taskSnap.docs.map(d => ({ id: d.id, ...d.data() } as TaskItem)));
        if (logSnap.exists()) setHabitLogs(logSnap.data() as Record<string, boolean>);

        const projects = projSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
        const questions = qSnap.docs.map(d => ({ id: d.id, projectId: (d.data() as any).projectId }));

        const stats: ProjectStats[] = projects.map((p, i) => {
          const pqs = questions.filter(q => q.projectId === p.id);
          const sc = pqs.filter(q => studied.has(q.id)).length;
          return {
            projectId: p.id,
            projectCode: p.code || "—",
            projectName: p.name || "",
            totalQuestions: pqs.length,
            studiedCount: sc,
            progress: pqs.length > 0 ? Math.round((sc / pqs.length) * 100) : 0,
            color: p.color || "#7c3aed",
          };
        }).filter(s => s.totalQuestions > 0);
        setProjectStats(stats);
      } catch {
        toast.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user, todayStr]);

  if (!user) {
    return (
      <Layout title="Dashboard">
        <EmptyState
          icon={User}
          title="Sign in to view your dashboard"
          description="Your preparation progress and study data will appear here."
          action={<Button asChild variant="outline"><Link to="/auth">Sign In</Link></Button>}
        />
      </Layout>
    );
  }

  return (
    <Layout title="Dashboard">
      {/* ── MOBILE: native 4-row feed ── */}
      <MobileDashboard
        name={user?.displayName?.split(" ")[0] || "Student"}
        streak={streak.current}
        focusMinutes={todayFocusMinutes}
        tasksDone={todayTasksDone}
        tasksTotal={todayTasks.length}
        habitsDone={habitsCompletedToday}
        habitsTotal={habits.length}
        upcoming={calEvents.slice(0, 5)}
      />

      {/* ── DESKTOP: full grid ── */}
      <div className="hidden md:block w-full space-y-8">
        <GreetingBanner />
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <h1 className="text-2xl sm:text-3xl font-heading font-bold tracking-tight">
            Your <span className="text-gradient">command center</span>
          </h1>
          <p className="text-sm text-muted-foreground font-body mt-1">All systems at a glance.</p>
        </motion.div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : (
          <>
            {/* Row 1: Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }} className="vv-card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="text-xs font-body text-muted-foreground">Today's Focus</span>
                </div>
                <p className="text-2xl font-heading font-bold tabular-nums">
                  {Math.floor(todayFocusMinutes / 60)}h {todayFocusMinutes % 60}m
                </p>
                <div className="h-10 mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={focusSparkline}>
                      <Bar dataKey="minutes" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="vv-card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Flame className="h-4 w-4 text-[hsl(var(--streak))]" />
                  <span className="text-xs font-body text-muted-foreground">Study Streak</span>
                </div>
                <p className="text-2xl font-heading font-bold tabular-nums">{streak.current}d</p>
                <p className="text-xs text-muted-foreground font-body mt-1">Longest: {streak.longest}d</p>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="vv-card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <CheckSquare className="h-4 w-4 text-[hsl(var(--success))]" />
                  <span className="text-xs font-body text-muted-foreground">Tasks Today</span>
                </div>
                <p className="text-2xl font-heading font-bold tabular-nums">{todayTasksDone} of {todayTasks.length}</p>
                <Progress value={todayTasks.length > 0 ? (todayTasksDone / todayTasks.length) * 100 : 0} className="h-1.5 mt-2" />
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="vv-card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Heart className="h-4 w-4 text-pink-500" />
                  <span className="text-xs font-body text-muted-foreground">Habits Today</span>
                </div>
                <p className="text-2xl font-heading font-bold tabular-nums">{habitsCompletedToday} of {habits.length}</p>
                <div className="flex gap-1 mt-2">
                  {habits.map(h => (
                    <div key={h.id} className="h-3 w-3 rounded-full" style={{ backgroundColor: habitLogs[h.id] ? h.color : `${h.color}30` }} />
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Row 2: Heatmap + Events + Habits */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-6 vv-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-heading font-bold">Study Activity</h3>
                </div>
                <ActivityHeatmap data={activity} />
              </div>

              <div className="lg:col-span-3 vv-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-heading font-bold">Upcoming</h3>
                </div>
                {calEvents.length === 0 ? (
                  <p className="text-xs text-muted-foreground font-body">No upcoming events.</p>
                ) : (
                  <div className="space-y-2">
                    {calEvents.slice(0, 5).map(e => (
                      <div key={e.id} className="flex items-center gap-2.5">
                        <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: e.color || "hsl(var(--primary))" }} />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-body font-medium truncate">{e.title}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <Link to="/study" className="text-xs text-primary font-body flex items-center gap-1 mt-3 hover:underline">
                  View Calendar <ArrowRight className="h-3 w-3" />
                </Link>
              </div>

              <div className="lg:col-span-3 vv-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Heart className="h-4 w-4 text-pink-500" />
                  <h3 className="text-sm font-heading font-bold">Habits</h3>
                </div>
                {habits.length === 0 ? (
                  <p className="text-xs text-muted-foreground font-body">No habits yet.</p>
                ) : (
                  <div className="space-y-2">
                    {habits.map(h => (
                      <div key={h.id} className="flex items-center gap-2.5">
                        <span className="text-sm">{h.emoji}</span>
                        <span className="text-xs font-body flex-1 truncate">{h.name}</span>
                        <div className={`h-5 w-5 rounded-full border flex items-center justify-center text-[10px] ${habitLogs[h.id] ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/30"}`}>
                          {habitLogs[h.id] && "✓"}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <Link to="/study" className="text-xs text-primary font-body flex items-center gap-1 mt-3 hover:underline">
                  Manage Habits <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>

            {/* Row 3: Course Progress + Recent Notes */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-7 vv-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Target className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-heading font-bold">Course Progress</h3>
                </div>
                {projectStats.length === 0 ? (
                  <p className="text-xs text-muted-foreground font-body">No courses with questions found.</p>
                ) : (
                  <div className="space-y-4">
                    {projectStats.slice(0, 5).map(ps => (
                      <div key={ps.projectId}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                              {ps.projectCode.slice(0, 2)}
                            </div>
                            <div>
                              <p className="text-sm font-body font-medium">{ps.projectCode}</p>
                              <p className="text-[10px] text-muted-foreground font-body">{ps.projectName}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground font-body tabular-nums">{ps.studiedCount}/{ps.totalQuestions}</span>
                            <Badge variant="outline" className="text-[10px] tabular-nums">{ps.progress}%</Badge>
                          </div>
                        </div>
                        <Progress value={ps.progress} className="h-1.5" />
                      </div>
                    ))}
                    {projectStats.length > 5 && (
                      <Link to="/" className="text-xs text-primary font-body flex items-center gap-1 hover:underline">
                        View all {projectStats.length} courses <ArrowRight className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                )}
              </div>

              <div className="lg:col-span-5 vv-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <StickyNote className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-heading font-bold">Recent Notes</h3>
                </div>
                <div className="space-y-2.5">
                  <div className="text-center py-8">
                    <StickyNote className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground font-body">Open Notes OS to see recent notes here.</p>
                  </div>
                </div>
                <Link to="/notes" className="text-xs text-primary font-body flex items-center gap-1 mt-3 hover:underline">
                  Open Notes OS <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>

            {/* Row 4: Activity Feed */}
            <div className="vv-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-heading font-bold">Recent Activity</h3>
              </div>
              <div className="space-y-2">
                {focusSessions.length === 0 && tasks.length === 0 ? (
                  <div className="text-center py-8">
                    <TrendingUp className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground font-body">Start studying to see your activity here.</p>
                  </div>
                ) : (
                  <>
                    {focusSessions.slice(-8).reverse().map(s => (
                      <div key={s.id} className="flex items-center gap-3 py-2 border-b border-border/20 last:border-0">
                        <Zap className="h-4 w-4 text-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-body">
                            {s.abandoned ? "Ended" : "Completed"} a {s.duration}-minute {s.mode} focus session
                          </p>
                        </div>
                        <span className="text-[10px] text-muted-foreground font-body shrink-0">{s.date}</span>
                      </div>
                    ))}
                    {tasks.filter(t => t.status === "done").slice(-5).reverse().map(t => (
                      <div key={t.id} className="flex items-center gap-3 py-2 border-b border-border/20 last:border-0">
                        <CheckSquare className="h-4 w-4 text-[hsl(var(--success))] shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-body">Marked task "{t.title}" as done</p>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-3 flex-wrap">
              <Button asChild variant="outline" size="sm" className="font-body text-xs gap-1.5">
                <Link to="/study"><Zap className="h-3.5 w-3.5" /> Open Study OS</Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="font-body text-xs gap-1.5">
                <Link to="/notes"><StickyNote className="h-3.5 w-3.5" /> Open Notes OS</Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="font-body text-xs gap-1.5">
                <Link to="/"><BookOpen className="h-3.5 w-3.5" /> Browse Courses</Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};

export default Dashboard;
