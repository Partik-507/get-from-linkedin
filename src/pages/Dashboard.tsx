import { useState, useEffect, useMemo } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Layout } from "@/components/Layout";
import { GlassCard } from "@/components/GlassCard";
import { EmptyState } from "@/components/EmptyState";
import { CardSkeleton } from "@/components/LoadingSkeleton";
import { StarRating } from "@/components/StarRating";
import { ActivityHeatmap } from "@/components/ActivityHeatmap";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  BarChart3, Bookmark, History, BookOpen, Target,
  TrendingUp, CheckCircle2, Clock, User, Flame, Trophy,
  Brain, Eye, Calendar, Check, Sparkles,
} from "lucide-react";
import {
  loadActivity, loadStreak, getStudiedIds, getDueQuestions, loadSM2,
} from "@/lib/spacedRepetition";

interface Submission {
  id: string;
  projectId: string;
  name: string;
  isAnonymous: boolean;
  proctorId: string;
  level: string;
  date: string;
  duration: string;
  questionsAsked: string;
  tips: string;
  difficultyRating: number;
  friendlinessRating: number;
  createdAt: any;
}

interface BookmarkItem {
  id: string;
  questionId: string;
  questionText: string;
  projectId: string;
  category: string;
  createdAt: any;
}

interface ProjectStats {
  projectId: string;
  projectCode: string;
  projectName: string;
  totalQuestions: number;
  studiedCount: number;
  progress: number;
}

const STREAK_MESSAGES: Record<number, string> = {
  1: "🎉 Day 1! Every journey starts with a single step. Keep it up!",
  7: "🔥 One week streak! You're building a powerful study habit!",
  14: "⚡ Two weeks strong! Consistency is your superpower!",
  30: "🏆 30-day streak! You're a study machine! Incredible dedication!",
  60: "💎 60 days! You're in the top tier of dedicated learners!",
  100: "👑 100 DAYS! Absolute legend. Nothing can stop you!",
};

const Dashboard = () => {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [projectStats, setProjectStats] = useState<ProjectStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [streakPopup, setStreakPopup] = useState<string | null>(null);

  const activity = useMemo(() => loadActivity(), []);
  const streak = useMemo(() => loadStreak(), []);
  const studied = useMemo(() => getStudiedIds(), []);
  const sm2 = useMemo(() => loadSM2(), []);
  const [questionMeta, setQuestionMeta] = useState<{ id: string; projectId: string }[]>([]);

  const totalStudied = studied.size;
  const totalDue = useMemo(() => getDueQuestions(questionMeta.map((q) => q.id)).length, [questionMeta]);
  const totalActivity = useMemo(() => Object.values(activity).reduce((a, b) => a + b, 0), [activity]);
  const totalFlagged = useMemo(() => Object.values(sm2).filter((d) => d.reps === 0 && d.interval === 1).length, [sm2]);
  const totalQuestions = questionMeta.length;
  const mastery = totalQuestions > 0 ? Math.round((totalStudied / totalQuestions) * 100) : 0;

  useEffect(() => {
    document.title = "Dashboard — VivaVault";

    // Check streak milestone popup
    const milestones = [1, 7, 14, 30, 60, 100];
    if (milestones.includes(streak.current)) {
      const lastPopup = localStorage.getItem("vv_streak_popup_last");
      const today = new Date().toISOString().slice(0, 10);
      if (lastPopup !== `${streak.current}-${today}`) {
        setStreakPopup(STREAK_MESSAGES[streak.current] || null);
        localStorage.setItem("vv_streak_popup_last", `${streak.current}-${today}`);
      }
    }

    if (!user) { setLoading(false); return; }

    const fetchData = async () => {
      try {
        const [subSnap, bmSnap, projSnap, qSnap] = await Promise.all([
          getDocs(query(collection(db, "submissions"), where("userId", "==", user.uid))),
          getDocs(query(collection(db, "bookmarks"), where("userId", "==", user.uid))),
          getDocs(collection(db, "projects")),
          getDocs(collection(db, "questions")),
        ]);

        setSubmissions(subSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Submission)));
        setBookmarks(bmSnap.docs.map((d) => ({ id: d.id, ...d.data() } as BookmarkItem)));

        const projects = projSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
        const questions = qSnap.docs.map((d) => ({ id: d.id, projectId: (d.data() as any).projectId }));
        setQuestionMeta(questions);

        const stats: ProjectStats[] = projects.map((p) => {
          const pqs = questions.filter((q) => q.projectId === p.id);
          const sc = pqs.filter((q) => studied.has(q.id)).length;
          return {
            projectId: p.id,
            projectCode: p.code || "—",
            projectName: p.name || "",
            totalQuestions: pqs.length,
            studiedCount: sc,
            progress: pqs.length > 0 ? Math.round((sc / pqs.length) * 100) : 0,
          };
        }).filter((s) => s.totalQuestions > 0);

        setProjectStats(stats);
      } catch {
        toast.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  if (!user) {
    return (
      <Layout title="Dashboard">
        <EmptyState
          icon={User}
          title="Sign in to view your dashboard"
          description="Your preparation progress, bookmarks, and submissions will appear here."
          action={<Button asChild variant="outline"><Link to="/auth">Sign In</Link></Button>}
        />
      </Layout>
    );
  }

  return (
    <Layout title="Dashboard" showBack>
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Streak milestone popup */}
        <Dialog open={!!streakPopup} onOpenChange={() => setStreakPopup(null)}>
          <DialogContent className="max-w-sm text-center">
            <DialogHeader>
              <DialogTitle className="font-heading text-2xl">Streak Milestone!</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Flame className="h-12 w-12 text-[hsl(38,92%,50%)] mx-auto mb-4" />
              <p className="text-lg font-body leading-relaxed">{streakPopup}</p>
            </div>
            <Button onClick={() => setStreakPopup(null)} className="font-body">Keep Going! 🚀</Button>
          </DialogContent>
        </Dialog>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">
            Welcome back, <span className="text-gradient">{user.displayName?.split(" ")[0] || "Student"}</span>
          </h1>
          <p className="text-muted-foreground font-body">Your complete study hub — track, review, and grow.</p>
        </motion.div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Total Studied", value: totalStudied, icon: Check, color: "text-[hsl(142,71%,45%)]" },
                { label: "Due Today", value: totalDue, icon: Target, color: "text-primary" },
                { label: "Current Streak", value: `${streak.current}d`, icon: Flame, color: "text-[hsl(38,92%,50%)]" },
                { label: "Total Reviews", value: totalActivity, icon: Brain, color: "text-[hsl(280,60%,55%)]" },
              ].map((stat, i) => (
                <motion.div key={stat.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                  <GlassCard hover={false} className="text-center py-5">
                    <stat.icon className={`h-5 w-5 mx-auto mb-2 ${stat.color}`} />
                    <p className="text-2xl font-heading font-bold tabular-nums">{stat.value}</p>
                    <p className="text-xs text-muted-foreground font-body mt-1">{stat.label}</p>
                  </GlassCard>
                </motion.div>
              ))}
            </div>

            {/* Secondary stats */}
            <div className="grid grid-cols-3 gap-4">
              <GlassCard hover={false} className="text-center py-5">
                <Trophy className="h-5 w-5 mx-auto mb-2 text-[hsl(38,92%,50%)]" />
                <p className="text-2xl font-heading font-bold">{streak.longest}d</p>
                <p className="text-xs text-muted-foreground font-body mt-1">Longest Streak</p>
              </GlassCard>
              <GlassCard hover={false} className="text-center py-5">
                <Eye className="h-5 w-5 mx-auto mb-2 text-destructive" />
                <p className="text-2xl font-heading font-bold">{totalFlagged}</p>
                <p className="text-xs text-muted-foreground font-body mt-1">Flagged</p>
              </GlassCard>
              <GlassCard hover={false} className="text-center py-5">
                <TrendingUp className="h-5 w-5 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-heading font-bold">{mastery}%</p>
                <p className="text-xs text-muted-foreground font-body mt-1">Mastery</p>
              </GlassCard>
            </div>

            {/* Activity Heatmap */}
            <GlassCard hover={false}>
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-heading font-bold">Study Activity</h2>
              </div>
              <ActivityHeatmap data={activity} />
            </GlassCard>

            {/* Active Projects + Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <GlassCard hover={false}>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center">
                    <BarChart3 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold tabular-nums">{projectStats.length}</p>
                    <p className="text-xs text-muted-foreground">Active Projects</p>
                  </div>
                </div>
              </GlassCard>
              <GlassCard hover={false}>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
                    <Bookmark className="h-5 w-5 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold tabular-nums">{bookmarks.length}</p>
                    <p className="text-xs text-muted-foreground">Bookmarked Questions</p>
                  </div>
                </div>
              </GlassCard>
              <GlassCard hover={false}>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                    <History className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold tabular-nums">{submissions.length}</p>
                    <p className="text-xs text-muted-foreground">Submissions</p>
                  </div>
                </div>
              </GlassCard>
            </div>

            {/* Preparation Progress */}
            <GlassCard hover={false}>
              <div className="flex items-center gap-2 mb-5">
                <Target className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Project Progress</h2>
              </div>
              {projectStats.length === 0 ? (
                <p className="text-sm text-muted-foreground">No projects with questions found.</p>
              ) : (
                <div className="space-y-4">
                  {projectStats.map((ps) => (
                    <div key={ps.projectId}>
                      <div className="flex items-center justify-between mb-1.5">
                        <Link to={`/project/${ps.projectId}/viva`} className="flex items-center gap-2 hover:text-primary transition-colors group">
                          <BookOpen className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                          <span className="font-medium">{ps.projectCode}</span>
                          <span className="text-sm text-muted-foreground hidden sm:inline">{ps.projectName}</span>
                        </Link>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground tabular-nums">{ps.studiedCount}/{ps.totalQuestions}</span>
                          <Badge variant="outline" className="text-[10px] tabular-nums">{ps.progress}%</Badge>
                        </div>
                      </div>
                      <Progress value={ps.progress} className="h-1.5" />
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>

            {/* Bookmarked Questions */}
            <GlassCard hover={false}>
              <div className="flex items-center gap-2 mb-5">
                <Bookmark className="h-5 w-5 text-amber-400" />
                <h2 className="text-lg font-semibold">Bookmarked Questions</h2>
              </div>
              {bookmarks.length === 0 ? (
                <div className="text-center py-6">
                  <Bookmark className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No bookmarks yet. Tap the bookmark icon on any question to save it.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {bookmarks.slice(0, 8).map((bm) => (
                    <div key={bm.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{bm.questionText}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{bm.category}</p>
                      </div>
                      <Button size="sm" variant="ghost" asChild>
                        <Link to={`/project/${bm.projectId}/viva`}><BookOpen className="h-3.5 w-3.5" /></Link>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>

            {/* Submissions */}
            <GlassCard hover={false}>
              <div className="flex items-center gap-2 mb-5">
                <History className="h-5 w-5 text-emerald-400" />
                <h2 className="text-lg font-semibold">Your Submissions</h2>
              </div>
              {submissions.length === 0 ? (
                <div className="text-center py-6">
                  <History className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">You haven't shared any viva experiences yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {submissions.slice(0, 5).map((sub) => (
                    <div key={sub.id} className="p-4 rounded-lg bg-secondary/30 space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs bg-primary/10 text-primary/80 border-primary/20">
                            {sub.projectId}
                          </Badge>
                          {sub.level && <span className="text-xs text-muted-foreground font-medium">{sub.level}</span>}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {sub.date && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {sub.date}</span>}
                        </div>
                      </div>
                      {sub.questionsAsked && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{sub.questionsAsked}</p>
                      )}
                      <div className="flex gap-4">
                        {sub.difficultyRating > 0 && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] uppercase tracking-wider text-red-400">Diff</span>
                            <StarRating value={sub.difficultyRating} readonly size="sm" color="text-red-400" />
                          </div>
                        )}
                        {sub.friendlinessRating > 0 && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] uppercase tracking-wider text-amber-400">Friendly</span>
                            <StarRating value={sub.friendlinessRating} readonly size="sm" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>

            {/* Due today CTA */}
            {totalDue > 0 && (
              <div className="text-center py-4">
                <p className="text-muted-foreground font-body mb-3">
                  You have <span className="text-primary font-semibold">{totalDue}</span> questions due for review
                </p>
                <Button asChild className="font-body gap-2">
                  <Link to="/"><Brain className="h-4 w-4" /> Start Smart Review</Link>
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
};

export default Dashboard;
