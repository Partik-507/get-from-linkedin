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
import { cn } from "@/lib/utils";

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
  collegeId?: string;
}

interface QuestionMeta {
  id: string;
  projectId: string;
}

const Index = () => {
  const { user, isGuest, isDemo, isAdmin, userProfile } = useAuth();
  const selectedCollegeId = userProfile?.selectedCollegeId || (typeof window !== "undefined" ? localStorage.getItem("vv_selected_college") : null);
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
        // Multi-tenant scoping: only show projects for the active college (or those with no college tag = global)
        // Super-admin sees everything.
        const scoped = isAdmin
          ? allProjects
          : allProjects.filter(p => !selectedCollegeId || !p.collegeId || p.collegeId === selectedCollegeId);
        // Filter out private courses for non-admin
        setProjects(scoped.filter(p => p.accessType !== "private" || isAdmin));
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
  }, [user, selectedCollegeId, isAdmin]);

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

  const getPrimaryProjectId = () => {
    const enrolled = user ? Object.keys(enrollments || {}) : [];
    if (enrolled.length > 0) return enrolled[0];
    return filteredProjects[0]?.id || projects[0]?.id || null;
  };

  const openQuizPractice = () => {
    window.open("https://quizpractice.space/", "_blank");
  };

  const openAceGrade = () => {
    window.open("https://acegrade.in/", "_blank");
  };

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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 mb-10">
        {/* Left Panel - 40% */}
        <div className="lg:col-span-4 space-y-5">
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
          <div className="space-y-2 ">
            <div className="flex flex-wrap gap-2 mt-10">
              <Select value={branchFilter} onValueChange={setBranchFilter}>
                <SelectTrigger className="w-[150px] h-12 text-md font-body  bg-card border-border/60">
                  <SelectValue placeholder="All Branches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="font-body text-xs">All Branches</SelectItem>
                  {branches.map(b => <SelectItem key={b.id} value={b.id} className="font-body text-xs">{b.name}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={levelFilter} onValueChange={setLevelFilter}>
                <SelectTrigger className="w-[150px] h-12 text-md font-body bg-card border-border/60">
                  <SelectValue placeholder="All Levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="font-body text-xs">All Levels</SelectItem>
                  {filteredLevels.map(l => <SelectItem key={l.id} value={l.id} className="font-body text-xs">{l.name}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[120px] h-12 text-md font-body bg-card border-border/60">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="font-body text-xs">All</SelectItem>
                  <SelectItem value="course" className="font-body text-xs">Courses</SelectItem>
                  <SelectItem value="project" className="font-body text-xs">Projects</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
          </div>
        </div>

        {/* Right Panel - 60% */}
        <div className="lg:col-span-8">
          <div className="vv-card p-5 bg-primary/[0.02] dark:bg-primary/[0.03]">
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
              {/* Main 4 feature cards */}
              <div className="xl:col-span-6">
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { icon: Timer, label: "Study OS", sub: "Plan & track sessions", to: "/study" },
                    { icon: StickyNote, label: "Notes OS", sub: "Knowledge workspace", to: "/notes" },
                    { icon: Link2, label: "Resources", sub: "Study materials", to: "/resources" },
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
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 ml-auto shrink-0 group-hover:text-primary/60 transition-colors" />
                    </Link>
                  ))}
                </div>

                {/* Utility tiles */}
                <div className="grid grid-cols-2 gap-2.5 mt-2.5">
                  <button
                    onClick={openQuizPractice}
                    className="flex items-center gap-2.5 p-3 rounded-xl bg-background border border-border/40 hover:border-primary/30 hover:bg-primary/[0.03] transition-all group text-left"
                  >
                    <div className="h-9 w-9 rounded-lg bg-muted/20 flex items-center justify-center shrink-0 group-hover:bg-muted/30 transition-colors overflow-hidden">
                      <img src="/img/quiz.png" alt="Quiz Practice" className="h-6 w-6 object-contain" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-body font-medium leading-tight">Quiz Practice</p>
                      <p className="text-[10px] text-muted-foreground font-body">Timed quizzes & weak spots</p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 ml-auto shrink-0 group-hover:text-primary/60 transition-colors" />
                  </button>
                  <button
                    onClick={openAceGrade}
                    className="flex items-center gap-2.5 p-3 rounded-xl bg-background border border-border/40 hover:border-primary/30 hover:bg-primary/[0.03] transition-all group text-left"
                  >
                    <div className="h-9 w-9 rounded-lg bg-muted/20 flex items-center justify-center shrink-0 group-hover:bg-muted/30 transition-colors overflow-hidden">
                      <img src="/img/ace.png" alt="Ace Grade" className="h-6 w-6 object-contain" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-body font-medium leading-tight">Ace Grade</p>
                      <p className="text-[10px] text-muted-foreground font-body">Flashcards & mastery loop</p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 ml-auto shrink-0 group-hover:text-primary/60 transition-colors" />
                  </button>
                </div>
              </div>

              {/* Right action stack */}
              <div className="xl:col-span-6 flex gap-3">
                <div className="flex-[5] rounded-2xl border border-border/40 bg-background p-3">
                  <p className="text-[10px] font-body font-semibold text-muted-foreground/70 uppercase tracking-widest ">Contribute</p>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { icon: HelpCircle, label: "Submit Questions", sub: "Help everyone practice", to: "/submit-question" },
                      { icon: Pencil, label: "Share Notes", sub: "Publish your pages", to: "/notes" },
                      { icon: FileText, label: "Share Resources", sub: "Add links & docs", to: "/resources" },
                    ].map((a) => (
                      <button
                        key={a.label}
                        onClick={() => navigate(a.to)}
                        className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-muted/40 transition-colors text-left"
                      >
                        <div className="h-8 w-8 rounded-xl bg-muted/30 flex items-center justify-center">
                          <a.icon className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-body font-medium leading-tight">{a.label}</p>
                          <p className="text-[10px] text-muted-foreground font-body">{a.sub}</p>
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex-[2] flex flex-col gap-3">
                  <ShareDropdown className="flex-1 w-full justify-center h-full text-xs py-3 rounded-2xl" />
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 w-full gap-2 font-body text-xs py-3 rounded-2xl"
                    onClick={() => setFeedbackOpen(true)}
                  >
                    <MessageSquare className="h-3.5 w-3.5" /> Feedback
                  </Button>
                </div>
              </div>
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
        <div  className="flex gap-2.5" >
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
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
