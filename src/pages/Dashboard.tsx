import { useState, useEffect } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Layout } from "@/components/Layout";
import { GlassCard } from "@/components/GlassCard";
import { EmptyState } from "@/components/EmptyState";
import { CardSkeleton } from "@/components/LoadingSkeleton";
import { StarRating } from "@/components/StarRating";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  BarChart3, Bookmark, History, BookOpen, Target,
  TrendingUp, CheckCircle2, Clock, User,
} from "lucide-react";

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

interface Bookmark {
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
  viewedQuestions: number;
}

const Dashboard = () => {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [projectStats, setProjectStats] = useState<ProjectStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Dashboard — VivaVault";
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch user's submissions
        const subQuery = query(
          collection(db, "submissions"),
          where("userId", "==", user.uid)
        );
        const subSnap = await getDocs(subQuery);
        setSubmissions(
          subSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Submission))
        );

        // Fetch user's bookmarks
        const bmQuery = query(
          collection(db, "bookmarks"),
          where("userId", "==", user.uid)
        );
        const bmSnap = await getDocs(bmQuery);
        setBookmarks(
          bmSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Bookmark))
        );

        // Fetch projects for stats
        const projSnap = await getDocs(collection(db, "projects"));
        const projects = projSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as any[];

        // Fetch question counts per project
        const stats: ProjectStats[] = [];
        for (const proj of projects) {
          const qQuery = query(
            collection(db, "questions"),
            where("projectId", "==", proj.id)
          );
          const qSnap = await getDocs(qQuery);
          stats.push({
            projectId: proj.id,
            projectCode: proj.code || "—",
            projectName: proj.name || "",
            totalQuestions: qSnap.size,
            viewedQuestions: 0,
          });
        }
        setProjectStats(stats.filter((s) => s.totalQuestions > 0));
      } catch (e: any) {
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
          description="Your preparation progress, bookmarks, and submissions will appear here once you're signed in."
          action={
            <Button asChild variant="outline">
              <Link to="/auth">Sign In</Link>
            </Button>
          }
        />
      </Layout>
    );
  }

  const totalQuestions = projectStats.reduce((s, p) => s + p.totalQuestions, 0);

  return (
    <Layout title="Dashboard" showBack>
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <motion.div
          className="animate-fade-in"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">
            Welcome back, <span className="text-gradient">{user.displayName?.split(" ")[0] || "Student"}</span>
          </h1>
          <p className="text-muted-foreground">
            Track your viva preparation progress and revisit saved content.
          </p>
        </motion.div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <>
            {/* Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <GlassCard hover={false} transition={{ delay: 0.05 }}>
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

              <GlassCard hover={false} transition={{ delay: 0.1 }}>
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

              <GlassCard hover={false} transition={{ delay: 0.15 }}>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                    <History className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold tabular-nums">{submissions.length}</p>
                    <p className="text-xs text-muted-foreground">Submissions Shared</p>
                  </div>
                </div>
              </GlassCard>
            </div>

            {/* Preparation Progress */}
            <GlassCard hover={false}>
              <div className="flex items-center gap-2 mb-5">
                <Target className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Preparation Progress</h2>
              </div>

              {projectStats.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No projects with questions found. Ask an admin to import questions.
                </p>
              ) : (
                <div className="space-y-5">
                  {projectStats.map((ps, i) => (
                    <motion.div
                      key={ps.projectId}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        delay: 0.1 + i * 0.06,
                        duration: 0.4,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Link
                          to={`/project/${ps.projectId}/viva`}
                          className="flex items-center gap-2 hover:text-primary transition-colors group"
                        >
                          <BookOpen className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                          <span className="font-medium">{ps.projectCode}</span>
                          <span className="text-sm text-muted-foreground hidden sm:inline">
                            {ps.projectName}
                          </span>
                        </Link>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {ps.totalQuestions} questions
                        </span>
                      </div>
                      <Progress value={0} className="h-1.5" />
                    </motion.div>
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
                  <p className="text-sm text-muted-foreground">
                    No bookmarks yet. Tap the bookmark icon on any question to save it here.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {bookmarks.map((bm, i) => (
                    <motion.div
                      key={bm.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04, duration: 0.3 }}
                      className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{bm.questionText}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{bm.category}</p>
                      </div>
                      <Button size="sm" variant="ghost" asChild>
                        <Link to={`/project/${bm.projectId}/viva`}>
                          <BookOpen className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </motion.div>
                  ))}
                </div>
              )}
            </GlassCard>

            {/* Submission History */}
            <GlassCard hover={false}>
              <div className="flex items-center gap-2 mb-5">
                <History className="h-5 w-5 text-emerald-400" />
                <h2 className="text-lg font-semibold">Your Submissions</h2>
              </div>

              {submissions.length === 0 ? (
                <div className="text-center py-6">
                  <History className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground mb-3">
                    You haven't shared any viva experiences yet.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    After your viva, share your experience to help others prepare!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {submissions.map((sub, i) => (
                    <motion.div
                      key={sub.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05, duration: 0.4 }}
                      className="p-4 rounded-lg bg-secondary/30 space-y-2"
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className="text-xs bg-primary/10 text-primary/80 border-primary/20"
                          >
                            {sub.projectId}
                          </Badge>
                          {sub.proctorId && (
                            <Badge variant="outline" className="text-xs">
                              {sub.proctorId}
                            </Badge>
                          )}
                          {sub.level && (
                            <span className="text-xs text-muted-foreground font-medium">
                              {sub.level}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {sub.date && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {sub.date}
                            </span>
                          )}
                          {sub.duration && <span>· {sub.duration}</span>}
                        </div>
                      </div>

                      {sub.questionsAsked && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {sub.questionsAsked}
                        </p>
                      )}

                      <div className="flex gap-4">
                        {sub.difficultyRating > 0 && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] uppercase tracking-wider text-red-400">
                              Diff
                            </span>
                            <StarRating
                              value={sub.difficultyRating}
                              readonly
                              size="sm"
                              color="text-red-400"
                            />
                          </div>
                        )}
                        {sub.friendlinessRating > 0 && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] uppercase tracking-wider text-amber-400">
                              Friendly
                            </span>
                            <StarRating
                              value={sub.friendlinessRating}
                              readonly
                              size="sm"
                            />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </GlassCard>
          </>
        )}
      </div>
    </Layout>
  );
};

export default Dashboard;
