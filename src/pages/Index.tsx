import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Layout } from "@/components/Layout";
import { GridSkeleton } from "@/components/LoadingSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { CourseCard, type CourseStatus } from "@/components/CourseCard";
import { ShareDropdown } from "@/components/ShareDropdown";
import { FeedbackModal } from "@/components/FeedbackModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BookOpen, Brain, Flame, FolderOpen, Search, StickyNote, Link2, Pencil, MessageSquare, ArrowRight, Plus, HelpCircle, FileText, Timer, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { getDueQuestions, getStudiedIds, loadStreak } from "@/lib/spacedRepetition";
import { getUserEnrollments, enrollInCourse, getBranches, getLevels, type Branch, type Level } from "@/lib/firestoreSync";

interface Project {
  id: string;
  code: string;
  name: string;
  description: string;
  color: string;
  photoUrl?: string;
  branchId?: string;
  levelId?: string;
  type?: string;
  status?: string;
  isLocked?: boolean;
  accessType?: string;
}

interface QuestionMeta {
  id: string;
  projectId: string;
}

const Index = () => {
  const { user, isGuest, isDemo } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [questionMeta, setQuestionMeta] = useState<QuestionMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrollments, setEnrollments] = useState<Record<string, any>>({});
  const [branches, setBranches] = useState<Branch[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showEnrolled, setShowEnrolled] = useState(false);
  const [sortBy, setSortBy] = useState("newest");
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const studied = useMemo(() => getStudiedIds(), []);
  const streak = useMemo(() => loadStreak(), []);

  useEffect(() => {
    document.title = "VivaVault — IITM BS Study Hub";
    const fetchData = async () => {
      try {
        const [projSnap, qSnap, branchData, levelData] = await Promise.all([
          getDocs(collection(db, "projects")),
          getDocs(collection(db, "questions")),
          getBranches(),
          getLevels(),
        ]);
        const allProjects = projSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Project));
        // Filter out private courses for non-admin
        setProjects(allProjects.filter(p => p.accessType !== "private" || false));
        setQuestionMeta(qSnap.docs.map((d) => ({ id: d.id, projectId: (d.data() as any).projectId })));
        setBranches(branchData);
        setLevels(levelData);
        if (user) {
          const enr = await getUserEnrollments(user.uid);
          setEnrollments(enr);
        }
      } catch {
        toast.error("Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  // Cascading filter: reset level when branch changes
  useEffect(() => {
    setLevelFilter("all");
  }, [branchFilter]);

  const dueCount = useMemo(() => getDueQuestions(questionMeta.map((q) => q.id)).length, [questionMeta]);

  const filteredLevels = useMemo(() => {
    if (branchFilter === "all") return levels;
    return levels.filter(l => l.branchId === branchFilter);
  }, [levels, branchFilter]);

  const getProjectProgress = (projectId: string) => {
    const pQuestions = questionMeta.filter((q) => q.projectId === projectId);
    if (pQuestions.length === 0) return { total: 0, studied: 0, percent: 0 };
    const studiedCount = pQuestions.filter((q) => studied.has(q.id)).length;
    return { total: pQuestions.length, studied: studiedCount, percent: Math.round((studiedCount / pQuestions.length) * 100) };
  };

  const getCourseStatus = (project: Project): CourseStatus => {
    if (isGuest || isDemo) return "guest";
    if (project.status === "coming-soon") return "coming-soon";
    if (project.isLocked || project.accessType === "premium") return "locked";
    const prog = getProjectProgress(project.id);
    if (enrollments[project.id]) {
      return prog.percent >= 100 ? "completed" : "enrolled";
    }
    return "not-enrolled";
  };

  const handleEnroll = async (projectId: string) => {
    if (!user) { navigate("/auth"); return; }
    try {
      await enrollInCourse(user.uid, projectId);
      setEnrollments(prev => ({ ...prev, [projectId]: { courseId: projectId, progress: 0 } }));
      toast.success("Enrolled! Start studying now.");
    } catch {
      toast.error("Failed to enroll");
    }
  };

  const filteredProjects = useMemo(() => {
    let result = [...projects];
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(p => p.code?.toLowerCase().includes(s) || p.name?.toLowerCase().includes(s));
    }
    if (branchFilter !== "all") result = result.filter(p => p.branchId === branchFilter);
    if (levelFilter !== "all") result = result.filter(p => p.levelId === levelFilter);
    if (typeFilter !== "all") result = result.filter(p => (p.type || "course") === typeFilter);
    if (showEnrolled && user) result = result.filter(p => enrollments[p.id]);
    if (sortBy === "a-z") result.sort((a, b) => (a.code || "").localeCompare(b.code || ""));
    else if (sortBy === "questions") result.sort((a, b) => getProjectProgress(b.id).total - getProjectProgress(a.id).total);
    return result;
  }, [projects, search, branchFilter, levelFilter, typeFilter, showEnrolled, sortBy, enrollments, questionMeta, user]);

  return (
    <Layout>
      {/* Global Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search courses, projects, questions..."
            className="pl-11 h-11 rounded-xl bg-card border-border/50 font-body text-sm shadow-sm"
          />
        </div>
      </div>

      {/* Top Section: Two columns - 40/60 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-10">
        {/* Left Panel - 40% */}
        <div className="lg:col-span-5 space-y-5">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="text-3xl sm:text-4xl font-heading font-extrabold tracking-tight leading-tight">
              <span className="text-gradient">VivaVault</span>
            </h1>
            <p className="text-muted-foreground text-sm font-body mt-1.5">
              {user
                ? `Welcome back, ${user.displayName?.split(" ")[0] || "Student"}! Continue where you left off.`
                : "Your premium preparation companion for IITM BS project vivas."}
            </p>
          </motion.div>

          {/* Stats pills */}
          {(streak.current > 0 || dueCount > 0) && (
            <div className="flex flex-wrap gap-2">
              {streak.current > 0 && (
                <Badge variant="outline" className="gap-1.5 px-3 py-1.5 text-xs font-body border-[hsl(var(--streak))]/30 text-[hsl(var(--streak))]">
                  <Flame className="h-3 w-3" /> {streak.current} day streak
                </Badge>
              )}
              {dueCount > 0 && (
                <Badge variant="outline" className="gap-1.5 px-3 py-1.5 text-xs font-body border-primary/30 text-primary">
                  <Brain className="h-3 w-3" /> {dueCount} due for review
                </Badge>
              )}
            </div>
          )}

          {/* Cascading Filters */}
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <Select value={branchFilter} onValueChange={setBranchFilter}>
                <SelectTrigger className="w-[150px] h-9 text-xs font-body bg-card border-border/60">
                  <SelectValue placeholder="All Branches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="font-body text-xs">All Branches</SelectItem>
                  {branches.map(b => <SelectItem key={b.id} value={b.id} className="font-body text-xs">{b.name}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={levelFilter} onValueChange={setLevelFilter}>
                <SelectTrigger className="w-[150px] h-9 text-xs font-body bg-card border-border/60">
                  <SelectValue placeholder="All Levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="font-body text-xs">All Levels</SelectItem>
                  {filteredLevels.map(l => <SelectItem key={l.id} value={l.id} className="font-body text-xs">{l.name}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[120px] h-9 text-xs font-body bg-card border-border/60">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="font-body text-xs">All</SelectItem>
                  <SelectItem value="course" className="font-body text-xs">Courses</SelectItem>
                  <SelectItem value="project" className="font-body text-xs">Projects</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {user && (
              <Button
                variant={showEnrolled ? "secondary" : "outline"}
                size="sm"
                className="h-8 text-xs font-body"
                onClick={() => setShowEnrolled(!showEnrolled)}
              >
                {showEnrolled ? "Show All" : "Enrolled Only"}
              </Button>
            )}
          </div>
        </div>

        {/* Right Panel - 60% */}
        <div className="lg:col-span-7">
          <div className="vv-card p-5 space-y-4 bg-primary/[0.02] dark:bg-primary/[0.03]">
            {/* Quick Action Grid 2x2 */}
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { icon: Timer, label: "Study OS", sub: "Plan & track sessions", to: "/study" },
                { icon: StickyNote, label: "Notes OS", sub: "Knowledge workspace", to: "/notes" },
                { icon: Link2, label: "Resources", sub: "Study materials", to: "/notes" },
                { icon: BookOpen, label: "Dashboard", sub: "Your progress", to: "/dashboard" },
              ].map((action) => (
                <Link
                  key={action.label}
                  to={action.to}
                  className="flex items-center gap-2.5 p-3 rounded-xl bg-background border border-border/40 hover:border-primary/30 hover:bg-primary/[0.03] transition-all group"
                >
                  <div className="h-9 w-9 rounded-lg bg-primary/8 flex items-center justify-center shrink-0 group-hover:bg-primary/12 transition-colors">
                    <action.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-body font-medium leading-tight">{action.label}</p>
                    <p className="text-[10px] text-muted-foreground font-body">{action.sub}</p>
                  </div>
                </Link>
              ))}
            </div>

            {/* Contribution dropdown + share/feedback */}
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 font-body text-xs flex-1 justify-between bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20 hover:border-primary/40">
                    <span className="flex items-center gap-1.5"><Plus className="h-3.5 w-3.5 text-primary" /> Contribute</span>
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuItem onClick={() => navigate("/submit-question")} className="gap-2 font-body text-xs">
                    <HelpCircle className="h-3.5 w-3.5" /> Submit Questions
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/notes")} className="gap-2 font-body text-xs">
                    <Pencil className="h-3.5 w-3.5" /> Share Notes
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/notes")} className="gap-2 font-body text-xs">
                    <FileText className="h-3.5 w-3.5" /> Share Resources
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <ShareDropdown />
              <Button variant="outline" size="sm" className="gap-2 font-body text-xs" onClick={() => setFeedbackOpen(true)}>
                <MessageSquare className="h-3.5 w-3.5" /> Feedback
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Course Grid Section */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-heading font-bold">
            {showEnrolled ? "Enrolled Courses" : "All Courses & Projects"}
          </h2>
          <Badge variant="secondary" className="text-xs font-body">{filteredProjects.length} items</Badge>
        </div>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[130px] h-8 text-xs font-body">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest" className="font-body text-xs">Newest</SelectItem>
            <SelectItem value="a-z" className="font-body text-xs">A-Z</SelectItem>
            <SelectItem value="questions" className="font-body text-xs">Most Questions</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <GridSkeleton />
      ) : filteredProjects.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="No courses found"
          description={search ? "Try adjusting your search or filters." : "Projects will appear here once an admin adds them."}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProjects.map((project, i) => {
            const prog = getProjectProgress(project.id);
            const status = getCourseStatus(project);
            const branch = branches.find(b => b.id === project.branchId);
            const level = levels.find(l => l.id === project.levelId);

            return (
              <CourseCard
                key={project.id}
                id={project.id}
                code={project.code}
                name={project.name}
                description={project.description}
                questionCount={prog.total}
                status={status}
                progress={prog.percent}
                studiedCount={prog.studied}
                index={i}
                branchTag={branch?.name}
                levelTag={level?.name}
                photoUrl={project.photoUrl}
                onEnroll={() => handleEnroll(project.id)}
                onSignIn={() => navigate("/auth")}
              />
            );
          })}
        </div>
      )}

      <FeedbackModal open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </Layout>
  );
};

export default Index;
