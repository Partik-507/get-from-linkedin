import { useState, useEffect, useMemo } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Layout } from "@/components/Layout";
import { ActivityHeatmap } from "@/components/ActivityHeatmap";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  loadActivity, loadStreak, getStudiedIds, getDueQuestions, loadSM2,
} from "@/lib/spacedRepetition";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  BookOpen, Check, Eye, Flame, Trophy, Calendar, Brain,
  TrendingUp, Target,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface Project {
  id: string;
  code: string;
  name: string;
}

interface QuestionMeta {
  id: string;
  projectId: string;
}

const ProgressPage = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [questionMeta, setQuestionMeta] = useState<QuestionMeta[]>([]);
  const [loading, setLoading] = useState(true);

  const activity = useMemo(() => loadActivity(), []);
  const streak = useMemo(() => loadStreak(), []);
  const studied = useMemo(() => getStudiedIds(), []);
  const sm2 = useMemo(() => loadSM2(), []);

  useEffect(() => {
    document.title = "Progress — VivaVault";
    const fetchData = async () => {
      try {
        const [projSnap, qSnap] = await Promise.all([
          getDocs(collection(db, "projects")),
          getDocs(collection(db, "questions")),
        ]);
        setProjects(projSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Project)));
        setQuestionMeta(qSnap.docs.map((d) => ({ id: d.id, projectId: (d.data() as any).projectId })));
      } catch {
        toast.error("Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const totalQuestions = questionMeta.length;
  const totalStudied = studied.size;
  const totalFlagged = Object.values(sm2).filter((d) => d.reps === 0 && d.interval === 1).length;
  const totalDue = getDueQuestions(questionMeta.map((q) => q.id)).length;
  const totalActivity = Object.values(activity).reduce((a, b) => a + b, 0);

  const projectStats = useMemo(() => {
    return projects.map((p) => {
      const pQuestions = questionMeta.filter((q) => q.projectId === p.id);
      const pStudied = pQuestions.filter((q) => studied.has(q.id)).length;
      const progress = pQuestions.length > 0 ? Math.round((pStudied / pQuestions.length) * 100) : 0;
      return { ...p, total: pQuestions.length, studied: pStudied, progress };
    }).filter((p) => p.total > 0);
  }, [projects, questionMeta, studied]);

  if (loading) {
    return (
      <Layout title="Progress">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-[hsl(280,60%,45%)] animate-pulse" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Progress">
      <div className="mb-8 animate-fade-in">
        <h1 className="text-3xl sm:text-4xl font-heading font-extrabold tracking-tight mb-2">
          <span className="text-gradient">Your Progress</span>
        </h1>
        <p className="text-muted-foreground font-body">Track your study habits and performance</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Studied", value: totalStudied, icon: Check, color: "text-[hsl(142,71%,45%)]" },
          { label: "Due Today", value: totalDue, icon: Target, color: "text-primary" },
          { label: "Current Streak", value: `${streak.current}d`, icon: Flame, color: "text-[hsl(38,92%,50%)]" },
          { label: "Total Reviews", value: totalActivity, icon: Brain, color: "text-[hsl(280,60%,55%)]" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="obsidian-card p-5 text-center"
          >
            <stat.icon className={`h-5 w-5 mx-auto mb-2 ${stat.color}`} />
            <p className="text-2xl font-heading font-bold">{stat.value}</p>
            <p className="text-xs text-muted-foreground font-body mt-1">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Additional stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
        <div className="obsidian-card p-5 text-center">
          <Trophy className="h-5 w-5 mx-auto mb-2 text-[hsl(38,92%,50%)]" />
          <p className="text-2xl font-heading font-bold">{streak.longest}d</p>
          <p className="text-xs text-muted-foreground font-body mt-1">Longest Streak</p>
        </div>
        <div className="obsidian-card p-5 text-center">
          <Eye className="h-5 w-5 mx-auto mb-2 text-destructive" />
          <p className="text-2xl font-heading font-bold">{totalFlagged}</p>
          <p className="text-xs text-muted-foreground font-body mt-1">Flagged for Review</p>
        </div>
        <div className="obsidian-card p-5 text-center sm:col-span-1 col-span-2">
          <TrendingUp className="h-5 w-5 mx-auto mb-2 text-primary" />
          <p className="text-2xl font-heading font-bold">
            {totalQuestions > 0 ? Math.round((totalStudied / totalQuestions) * 100) : 0}%
          </p>
          <p className="text-xs text-muted-foreground font-body mt-1">Overall Mastery</p>
        </div>
      </div>

      {/* Activity Heatmap */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="obsidian-card p-6 mb-8"
      >
        <h2 className="text-lg font-heading font-bold mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" /> Study Activity
        </h2>
        <ActivityHeatmap data={activity} />
      </motion.div>

      {/* Per-Project Progress */}
      {projectStats.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="obsidian-card p-6"
        >
          <h2 className="text-lg font-heading font-bold mb-4 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" /> Project Progress
          </h2>
          <div className="space-y-4">
            {projectStats.map((p) => (
              <div key={p.id}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-heading font-semibold text-sm">{p.code}</span>
                    <span className="text-xs text-muted-foreground font-body">{p.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-body tabular-nums">
                      {p.studied}/{p.total}
                    </span>
                    <Badge variant="outline" className="text-[10px] font-body tabular-nums">
                      {p.progress}%
                    </Badge>
                  </div>
                </div>
                <Progress value={p.progress} className="h-1.5" />
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Due Today CTA */}
      {totalDue > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-center"
        >
          <p className="text-muted-foreground font-body mb-3">
            You have <span className="text-primary font-semibold">{totalDue}</span> questions due for review today
          </p>
          <Button asChild className="font-body gap-2">
            <Link to="/">
              <Brain className="h-4 w-4" /> Start Smart Review
            </Link>
          </Button>
        </motion.div>
      )}
    </Layout>
  );
};

export default ProgressPage;
