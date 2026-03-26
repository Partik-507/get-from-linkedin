import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Layout } from "@/components/Layout";
import { GridSkeleton } from "@/components/LoadingSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { BookOpen, ExternalLink, FolderOpen, Brain, Flame } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { getDueQuestions, getStudiedIds, loadStreak } from "@/lib/spacedRepetition";

interface Project {
  id: string;
  code: string;
  name: string;
  description: string;
  color: string;
  photoUrl?: string;
}

interface QuestionMeta {
  id: string;
  projectId: string;
}

const PROJECT_COLORS = [
  "from-primary to-[hsl(280,60%,45%)]",
  "from-[hsl(210,80%,50%)] to-[hsl(230,70%,45%)]",
  "from-[hsl(340,70%,50%)] to-[hsl(320,60%,45%)]",
  "from-[hsl(160,70%,40%)] to-[hsl(180,60%,35%)]",
  "from-[hsl(30,80%,50%)] to-[hsl(15,70%,45%)]",
  "from-[hsl(190,70%,45%)] to-[hsl(210,60%,40%)]",
];

const Index = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [questionMeta, setQuestionMeta] = useState<QuestionMeta[]>([]);
  const [loading, setLoading] = useState(true);

  const studied = useMemo(() => getStudiedIds(), []);
  const streak = useMemo(() => loadStreak(), []);

  useEffect(() => {
    document.title = "VivaVault — IITM BS Viva Prep";
    const fetchData = async () => {
      try {
        const [projSnap, qSnap] = await Promise.all([
          getDocs(collection(db, "projects")),
          getDocs(collection(db, "questions")),
        ]);
        setProjects(projSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Project)));
        setQuestionMeta(qSnap.docs.map((d) => ({ id: d.id, projectId: (d.data() as any).projectId })));
      } catch {
        toast.error("Failed to load projects");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const dueCount = useMemo(() => {
    return getDueQuestions(questionMeta.map((q) => q.id)).length;
  }, [questionMeta]);

  const getProjectProgress = (projectId: string) => {
    const pQuestions = questionMeta.filter((q) => q.projectId === projectId);
    if (pQuestions.length === 0) return { total: 0, studied: 0, percent: 0 };
    const studiedCount = pQuestions.filter((q) => studied.has(q.id)).length;
    return { total: pQuestions.length, studied: studiedCount, percent: Math.round((studiedCount / pQuestions.length) * 100) };
  };

  return (
    <Layout>
      <div className="mb-10 animate-fade-in">
        <h1 className="text-4xl sm:text-5xl font-heading font-extrabold tracking-tight mb-3">
          <span className="text-gradient">VivaVault</span>
        </h1>
        <p className="text-muted-foreground text-lg max-w-xl font-body">
          Your premium preparation companion for IITM BS project vivas. Choose a project to begin.
        </p>

        {/* Streak + Due Today */}
        <div className="flex flex-wrap gap-3 mt-5">
          {streak.current > 0 && (
            <Badge variant="outline" className="gap-1.5 px-3 py-1.5 text-sm font-body border-[hsl(38,92%,50%)]/30">
              <Flame className="h-3.5 w-3.5 text-[hsl(38,92%,50%)]" />
              {streak.current} day streak
            </Badge>
          )}
          {dueCount > 0 && (
            <Button asChild variant="outline" size="sm" className="gap-2 font-body border-primary/30 hover:border-primary/50">
              <Link to="/progress">
                <Brain className="h-3.5 w-3.5 text-primary" />
                {dueCount} questions due for review
              </Link>
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <GridSkeleton />
      ) : projects.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="No projects yet"
          description="Projects will appear here once an admin adds them."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project, i) => {
            const prog = getProjectProgress(project.id);
            return (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 16, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ delay: i * 0.08, duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
              >
                <div className="obsidian-card flex flex-col overflow-hidden h-full">
                  {project.photoUrl && (
                    <div className="h-40 w-full overflow-hidden">
                      <img src={project.photoUrl} alt={project.name} className="w-full h-full object-cover" loading="lazy" />
                    </div>
                  )}
                  <div className="p-6 flex flex-col flex-1">
                    <div className="flex items-start gap-4 mb-4">
                      <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${PROJECT_COLORS[i % PROJECT_COLORS.length]} flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-lg`}>
                        {project.code?.slice(0, 2) || "P"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h2 className="text-xl font-heading font-bold tracking-tight">{project.code}</h2>
                        <p className="text-sm text-muted-foreground truncate font-body">{project.name}</p>
                      </div>
                      {prog.total > 0 && (
                        <Badge variant="outline" className="text-[10px] font-body tabular-nums shrink-0">
                          {prog.total} Q
                        </Badge>
                      )}
                    </div>

                    <p className="text-sm text-muted-foreground mb-4 flex-1 line-clamp-2 font-body">
                      {project.description || "Prepare for your viva with curated questions and community experiences."}
                    </p>

                    {/* Progress bar */}
                    {prog.total > 0 && (
                      <div className="mb-4">
                        <div className="flex items-center justify-between text-xs text-muted-foreground font-body mb-1">
                          <span>{prog.studied} studied</span>
                          <span>{prog.percent}%</span>
                        </div>
                        <Progress value={prog.percent} className="h-1" />
                      </div>
                    )}

                    <div className="flex gap-3">
                      <Button asChild className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-200 active:scale-[0.97] font-body">
                        <Link to={`/project/${project.id}/viva`}>
                          <BookOpen className="h-4 w-4 mr-1.5" /> Viva Prep
                        </Link>
                      </Button>
                      <Button asChild variant="outline" className="transition-all duration-200 active:scale-[0.97] font-body border-border/50">
                        <Link to={`/project/${project.id}/resources`}>
                          <ExternalLink className="h-4 w-4 mr-1.5" /> Resources
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </Layout>
  );
};

export default Index;
