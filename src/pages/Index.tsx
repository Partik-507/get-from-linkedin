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
import { useIsMobile } from "@/hooks/use-mobile";

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
  const isMobile = useIsMobile();
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

  // ── Quick-links tile data ─────────────────────────────────────────────────
  const quickLinks = [
    { icon: "/img/iitm.png", label: "IITM BS Portal", sub: "Student portal", href: "https://ds.study.iitm.ac.in/" },
    { icon: "/img/looks.svg", label: "Data Studio", sub: "Analytics & reports", href: "https://datastudio.google.com/navigation/reporting" },
    { icon: "/img/iitm.png", label: "Course Planner", sub: "Plan your courses", href: "https://course-planner-140256174016.asia-south1.run.app/" },
    { icon: "/img/ace.png", label: "Ace Grade", sub: "Flashcards & mastery", onClick: openAceGrade },
    { icon: "/img/iitm.png", label: "Discourse", sub: "Community forums", href: "https://discourse.onlinedegree.iitm.ac.in/" },
    { icon: "/img/quiz.png", label: "Quiz Practice", sub: "Timed quizzes", onClick: openQuizPractice },
  ];

  const contributeActions = [
    { icon: HelpCircle, label: "Submit Questions", sub: "Help everyone practice", to: "/submit-question" },
    { icon: Pencil, label: "Share Notes", sub: "Publish your pages", to: "/notes" },
    { icon: FileText, label: "Share Resources", sub: "Add links & docs", to: "/resources" },
  ];

  // ── Shared sub-sections ───────────────────────────────────────────────────

  /** Quick-links grid — 2-col on mobile, 2-col on desktop (inside the panel) */
  const QuickLinksGrid = ({ compact = false }: { compact?: boolean }) => (
    <div className={cn("grid gap-2", compact ? "grid-cols-2" : "grid-cols-2 xl:grid-cols-2")}>
      {quickLinks.map((item) => {
        const inner = (
          <>
            <div className={cn(
              "rounded-lg bg-muted/20 flex items-center justify-center shrink-0 overflow-hidden",
              compact ? "h-8 w-8" : "h-9 w-9"
            )}>
              <img src={item.icon} alt={item.label} className={cn("object-contain", compact ? "h-5 w-5" : "h-6 w-6")} />
            </div>
            <div className="min-w-0 flex-1">
              <p className={cn("font-body font-medium leading-tight truncate", compact ? "text-[11px]" : "text-xs")}>{item.label}</p>
              {!compact && <p className="text-[10px] text-muted-foreground font-body truncate">{item.sub}</p>}
            </div>
            <ArrowRight className="h-3 w-3 text-muted-foreground/40 ml-auto shrink-0" />
          </>
        );
        const cls = cn(
          "flex items-center gap-2 rounded-xl bg-background border border-border/40 hover:border-primary/30 hover:bg-primary/[0.03] transition-all group text-left",
          compact ? "p-2" : "p-3"
        );
        return item.href ? (
          <a key={item.label} href={item.href} target="_blank" rel="noopener noreferrer" className={cls}>{inner}</a>
        ) : (
          <button key={item.label} onClick={item.onClick} className={cls}>{inner}</button>
        );
      })}
    </div>
  );

  /** Contribute + Share + Feedback row */
  const ActionRow = ({ compact = false }: { compact?: boolean }) => (
    <div className={cn("flex gap-2", compact ? "items-center" : "")}>
      {/* Contribute dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className={cn(
            "flex items-center gap-2 rounded-xl bg-background border border-border/40 hover:border-primary/30 hover:bg-primary/[0.03] transition-all font-body font-medium",
            compact ? "px-3 h-9 text-xs flex-1" : "p-3 text-xs flex-1"
          )}>
            <Plus className={cn("shrink-0 text-primary", compact ? "h-3.5 w-3.5" : "h-4 w-4")} />
            Contribute
            <ChevronDown className="h-3 w-3 ml-auto text-muted-foreground/60" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48 font-body">
          {contributeActions.map(a => (
            <DropdownMenuItem key={a.label} onClick={() => navigate(a.to)} className="gap-2">
              <a.icon className="h-4 w-4 text-primary" />
              {a.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <ShareDropdown className={cn(
        "rounded-xl border border-border/40 font-body font-medium",
        compact ? "h-9 px-3 text-xs" : "px-3 py-2.5 text-xs"
      )} />

      <Button
        variant="outline"
        size="sm"
        className={cn("rounded-xl font-body font-medium border-border/40", compact ? "h-9 px-3 text-xs" : "px-3 py-2.5 text-xs h-auto")}
        onClick={() => setFeedbackOpen(true)}
      >
        <MessageSquare className="h-3.5 w-3.5 mr-1.5" /> Feedback
      </Button>
    </div>
  );

  /** Courses section header with search + filters */
  const CoursesHeader = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={cn("space-y-2", mobile ? "px-0" : "mb-6")}>
      {/* Title row + search */}
      <div className="flex items-center gap-2">
        <h2 className={cn("font-heading font-bold shrink-0", mobile ? "text-base" : "text-xl")}>Courses</h2>
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search courses…"
            className={cn("pl-8 rounded-full bg-card border-border/50 font-body", mobile ? "h-8 text-xs" : "h-9 text-sm")}
          />
        </div>
      </div>

      {/* Filters row */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {/* Left: enrolled toggle */}
        {user && (
          <button
            onClick={() => setShowEnrolled(!showEnrolled)}
            className={cn(
              "h-7 px-2.5 rounded-full text-[11px] font-body font-medium shrink-0 border transition-colors",
              showEnrolled
                ? "bg-primary/10 text-primary border-primary/30"
                : "bg-muted/60 text-muted-foreground border-border/40"
            )}
          >
            {showEnrolled ? "Enrolled" : "Show All"}
          </button>
        )}

        <div className="flex-1" />

        {/* Right: compact dropdowns */}
        <Select value={branchFilter} onValueChange={setBranchFilter}>
          <SelectTrigger className="h-7 px-2.5 text-[11px] font-body w-auto min-w-[90px] rounded-full bg-muted/60 border-border/40">
            <SelectValue placeholder="Branch" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="font-body text-xs">All Branches</SelectItem>
            {branches.map(b => <SelectItem key={b.id} value={b.id} className="font-body text-xs">{b.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={levelFilter} onValueChange={setLevelFilter}>
          <SelectTrigger className="h-7 px-2.5 text-[11px] font-body w-auto min-w-[80px] rounded-full bg-muted/60 border-border/40">
            <SelectValue placeholder="Level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="font-body text-xs">All Levels</SelectItem>
            {filteredLevels.map(l => <SelectItem key={l.id} value={l.id} className="font-body text-xs">{l.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-7 px-2.5 text-[11px] font-body w-auto min-w-[70px] rounded-full bg-muted/60 border-border/40">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="font-body text-xs">All</SelectItem>
            <SelectItem value="course" className="font-body text-xs">Courses</SelectItem>
            <SelectItem value="project" className="font-body text-xs">Projects</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  // ── MOBILE LAYOUT ─────────────────────────────────────────────────────────
  if (isMobile) {
    const GRADIENTS = [
      "from-violet-500 to-purple-600",
      "from-blue-500 to-indigo-600",
      "from-rose-500 to-pink-600",
      "from-emerald-500 to-teal-600",
      "from-orange-500 to-amber-600",
      "from-cyan-500 to-sky-600",
    ];
    return (
      <Layout fullBleed>
        <div className="min-h-[100dvh] bg-background pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]">

          {/* ── Sticky header — same pattern as Notes OS / Library ── */}
          <header
            className="sticky top-0 z-30 bg-background/85 backdrop-blur-2xl border-b border-border/50"
            style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
          >
            <div className="px-4 pt-3 pb-3 flex items-center gap-2">
              {/* Title */}
              <span className="font-heading font-bold text-[22px] leading-none shrink-0 text-foreground">
                VivaVault
              </span>

              {/* Search bar — flex-1, same style as Notes OS */}
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search courses…"
                  className="pl-10 pr-3 h-10 rounded-lg bg-muted/50 border border-transparent font-body text-sm focus-visible:bg-card focus-visible:border-primary/40 focus-visible:ring-0"
                />
              </div>

              {/* Streak flame — bare icon, streak color, no background */}
              {streak.current > 0 && (
                <div className="flex items-center gap-1 shrink-0">
                  <Flame className="h-5 w-5 text-[hsl(var(--streak))]" />
                  <span className="text-[13px] font-body font-semibold text-[hsl(var(--streak))]">{streak.current}</span>
                </div>
              )}
            </div>
          </header>

          {/* ── Quick-links + Contribute — exact desktop card style ── */}
          <div className="px-4 pt-4">
            <div className="vv-card p-4 bg-primary/[0.02]">

              {/* 2-col grid: logo left + name/desc right — exact desktop tile format */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                {quickLinks.map((item) => {
                  const inner = (
                    <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-background border border-border/40 active:border-primary/30 active:bg-primary/[0.03] transition-all group">
                      <div className="h-9 w-9 rounded-lg bg-muted/20 flex items-center justify-center shrink-0 overflow-hidden">
                        <img src={item.icon} alt={item.label} className="h-6 w-6 object-contain" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-body font-medium leading-tight truncate">{item.label}</p>
                        <p className="text-[10px] text-muted-foreground font-body truncate">{item.sub}</p>
                      </div>
                      <ArrowRight className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                    </div>
                  );
                  return item.href ? (
                    <a key={item.label} href={item.href} target="_blank" rel="noopener noreferrer">{inner}</a>
                  ) : (
                    <button key={item.label} onClick={item.onClick} className="text-left w-full">{inner}</button>
                  );
                })}
              </div>

              {/* 3 action buttons: Contribute (bigger) + Share + Feedback */}
              <div className="flex gap-2">
                {/* Contribute — wider, primary style, has dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex-[2] flex items-center justify-center gap-1.5 h-9 rounded-lg bg-primary text-primary-foreground text-xs font-body font-semibold active:scale-[0.97] transition-all">
                      <Plus className="h-3.5 w-3.5" />
                      Contribute
                      <ChevronDown className="h-3 w-3 opacity-70" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-52 font-body rounded-xl p-1">
                    {contributeActions.map(a => (
                      <DropdownMenuItem key={a.label} onClick={() => navigate(a.to)} className="gap-3 py-2.5 px-3 rounded-lg cursor-pointer">
                        <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <a.icon className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <div>
                          <p className="text-[13px] font-semibold leading-tight">{a.label}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{a.sub}</p>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Share */}
                <ShareDropdown className="flex-1 h-9 text-xs rounded-lg border border-border/50 font-body font-medium justify-center" />

                {/* Feedback */}
                <Button variant="outline" className="flex-1 h-9 text-xs rounded-lg border-border/50 font-body font-medium gap-1" onClick={() => setFeedbackOpen(true)}>
                  <MessageSquare className="h-3.5 w-3.5" /> Feedback
                </Button>
              </div>
            </div>
          </div>

          {/* ── Courses section ── */}
          <div className="px-4 pt-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-xl font-heading font-bold">
                  {showEnrolled ? "Enrolled Courses" : "All Courses & Projects"}
                </h2>
                <p className="text-[12px] text-muted-foreground font-body mt-0.5">{filteredProjects.length} items</p>
              </div>
              {user && (
                <button
                  onClick={() => setShowEnrolled(!showEnrolled)}
                  className={cn(
                    "h-8 px-3.5 rounded-lg text-[12px] font-body font-semibold border transition-all",
                    showEnrolled
                      ? "bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/20"
                      : "bg-card text-muted-foreground border-border/60"
                  )}
                >
                  Enrolled Only
                </button>
              )}
            </div>

            {/* Filter chips */}
            <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar pb-0.5">
              {[
                { value: branchFilter, onChange: setBranchFilter, placeholder: "Branch", options: [{ value: "all", label: "All Branches" }, ...branches.map(b => ({ value: b.id, label: b.name }))] },
                { value: levelFilter, onChange: setLevelFilter, placeholder: "Level", options: [{ value: "all", label: "All Levels" }, ...filteredLevels.map(l => ({ value: l.id, label: l.name }))] },
                { value: typeFilter, onChange: setTypeFilter, placeholder: "Type", options: [{ value: "all", label: "All Types" }, { value: "course", label: "Courses" }, { value: "project", label: "Projects" }] },
              ].map((f) => (
                <Select key={f.placeholder} value={f.value} onValueChange={f.onChange}>
                  <SelectTrigger className={cn(
                    "h-8 px-3 text-[12px] font-body font-medium w-auto rounded-lg shrink-0 border transition-colors",
                    f.value !== "all" ? "bg-primary/10 text-primary border-primary/30" : "bg-card border-border/60 text-muted-foreground"
                  )}>
                    <SelectValue placeholder={f.placeholder} />
                  </SelectTrigger>
                  <SelectContent className="font-body rounded-xl">
                    {f.options.map(o => <SelectItem key={o.value} value={o.value} className="text-[13px]">{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              ))}
            </div>

            {/* Course cards */}
            {loading ? (
              <GridSkeleton />
            ) : filteredProjects.length === 0 ? (
              <EmptyState icon={FolderOpen} title="No courses found" description={search ? "Try adjusting your search or filters." : "Projects will appear here once added."} />
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {filteredProjects.map((project, i) => {
                  const prog = getProjectProgress(project.id);
                  const status = getCourseStatus(project);
                  const grad = GRADIENTS[i % GRADIENTS.length];
                  const isEnrolled = status === "enrolled" || status === "completed";

                  return (
                    <motion.div
                      key={project.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: Math.min(i * 0.04, 0.3), duration: 0.3 }}
                      className="h-full"
                    >
                      <div className={cn(
                        "bg-card rounded-2xl border border-border/40 overflow-hidden flex flex-col h-full",
                        "transition-opacity active:opacity-70",
                        status === "locked" && "opacity-50"
                      )}>
                        <div className="p-3.5 flex flex-col flex-1 gap-3">

                          {/* Logo + course code row */}
                          <div className="flex items-center gap-2">
                            {/* Gradient logo — same as desktop CourseCard */}
                            <div className={cn(
                              "h-8 w-8 rounded-lg bg-gradient-to-br flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm",
                              grad
                            )}>
                              {project.code?.slice(0, 2) || "P"}
                            </div>
                            <span className="text-[11px] font-body font-bold tracking-wider uppercase text-muted-foreground truncate">
                              {project.code}
                            </span>
                            {prog.total > 0 && (
                              <span className="text-[10px] font-body text-muted-foreground/50 tabular-nums ml-auto shrink-0">
                                {prog.total}Q
                              </span>
                            )}
                          </div>

                          {/* Course name */}
                          <p className="text-[13px] font-heading font-semibold leading-snug line-clamp-3 text-foreground flex-1">
                            {project.name}
                          </p>

                          {/* Progress bar */}
                          {isEnrolled && prog.total > 0 && (
                            <div className="space-y-1.5">
                              <div className="h-1 rounded-full bg-muted overflow-hidden">
                                <div
                                  className={cn("h-full rounded-full bg-gradient-to-r opacity-80", grad)}
                                  style={{ width: `${prog.percent}%` }}
                                />
                              </div>
                              <span className="text-[10px] font-body text-muted-foreground/70 tabular-nums">
                                {prog.percent}% complete
                              </span>
                            </div>
                          )}

                          {/* CTA */}
                          <div>
                            {status === "not-enrolled" && (
                              <button
                                onClick={() => handleEnroll(project.id)}
                                className="w-full h-8 rounded-lg bg-foreground/5 text-foreground text-[12px] font-body font-medium active:scale-[0.97] transition-all border border-border/40"
                              >
                                Enroll
                              </button>
                            )}
                            {isEnrolled && (
                              <Link
                                to={`/course/${project.id}/select`}
                                className="block w-full h-8 rounded-lg bg-primary text-primary-foreground text-[12px] font-body font-medium text-center leading-8 active:scale-[0.97] transition-all"
                              >
                                Continue
                              </Link>
                            )}
                            {status === "guest" && (
                              <button
                                onClick={() => navigate("/auth")}
                                className="w-full h-8 rounded-lg border border-border/50 text-muted-foreground text-[12px] font-body font-medium active:scale-[0.97] transition-all"
                              >
                                Sign in
                              </button>
                            )}
                            {(status === "locked" || status === "coming-soon") && (
                              <div className="w-full h-8 rounded-lg bg-muted/50 text-muted-foreground/60 text-[12px] font-body font-medium flex items-center justify-center">
                                {status === "locked" ? "Premium" : "Soon"}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <FeedbackModal open={feedbackOpen} onOpenChange={setFeedbackOpen} />
      </Layout>
    );
  }

  // ── DESKTOP LAYOUT (unchanged) ────────────────────────────────────────────
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
              {/* Main 6 tiles — col1: IITM BS Portal, Course Planner, Discourse | col2: Data Studio, Ace Grade, Quiz Practice */}
              <div className="xl:col-span-6">
                <div className="grid grid-cols-2 gap-2.5">
                  {/* Col 1 */}
                  <a href="https://ds.study.iitm.ac.in/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 p-3 rounded-xl bg-background border border-border/40 hover:border-primary/30 hover:bg-primary/[0.03] transition-all group">
                    <div className="h-9 w-9 rounded-lg bg-muted/20 flex items-center justify-center shrink-0 group-hover:bg-muted/30 transition-colors overflow-hidden">
                      <img src="/img/iitm.png" alt="IITM BS Portal" className="h-6 w-6 object-contain" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-body font-medium leading-tight">IITM BS Portal</p>
                      <p className="text-[10px] text-muted-foreground font-body">Student portal</p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 ml-auto shrink-0 group-hover:text-primary/60 transition-colors" />
                  </a>
                  {/* Col 2 */}
                  <a href="https://datastudio.google.com/navigation/reporting" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 p-3 rounded-xl bg-background border border-border/40 hover:border-primary/30 hover:bg-primary/[0.03] transition-all group">
                    <div className="h-9 w-9 rounded-lg bg-muted/20 flex items-center justify-center shrink-0 group-hover:bg-muted/30 transition-colors overflow-hidden">
                      <img src="/img/looks.svg" alt="Data Studio" className="h-6 w-6 object-contain" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-body font-medium leading-tight">Data Studio</p>
                      <p className="text-[10px] text-muted-foreground font-body">Analytics & reports</p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 ml-auto shrink-0 group-hover:text-primary/60 transition-colors" />
                  </a>
                  {/* Col 1 */}
                  <a href="https://course-planner-140256174016.asia-south1.run.app/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 p-3 rounded-xl bg-background border border-border/40 hover:border-primary/30 hover:bg-primary/[0.03] transition-all group">
                    <div className="h-9 w-9 rounded-lg bg-muted/20 flex items-center justify-center shrink-0 group-hover:bg-muted/30 transition-colors overflow-hidden">
                      <img src="/img/iitm.png" alt="Course Planner" className="h-6 w-6 object-contain" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-body font-medium leading-tight">Course Planner</p>
                      <p className="text-[10px] text-muted-foreground font-body">Plan your courses</p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 ml-auto shrink-0 group-hover:text-primary/60 transition-colors" />
                  </a>
                  {/* Col 2 */}
                  <button onClick={openAceGrade} className="flex items-center gap-2.5 p-3 rounded-xl bg-background border border-border/40 hover:border-primary/30 hover:bg-primary/[0.03] transition-all group text-left">
                    <div className="h-9 w-9 rounded-lg bg-muted/20 flex items-center justify-center shrink-0 group-hover:bg-muted/30 transition-colors overflow-hidden">
                      <img src="/img/ace.png" alt="Ace Grade" className="h-6 w-6 object-contain" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-body font-medium leading-tight">Ace Grade</p>
                      <p className="text-[10px] text-muted-foreground font-body">Flashcards & mastery loop</p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 ml-auto shrink-0 group-hover:text-primary/60 transition-colors" />
                  </button>
                  {/* Col 1 */}
                  <a href="https://discourse.onlinedegree.iitm.ac.in/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 p-3 rounded-xl bg-background border border-border/40 hover:border-primary/30 hover:bg-primary/[0.03] transition-all group">
                    <div className="h-9 w-9 rounded-lg bg-muted/20 flex items-center justify-center shrink-0 group-hover:bg-muted/30 transition-colors overflow-hidden">
                      <img src="/img/iitm.png" alt="Discourse" className="h-6 w-6 object-contain" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-body font-medium leading-tight">Discourse</p>
                      <p className="text-[10px] text-muted-foreground font-body">Community forums</p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 ml-auto shrink-0 group-hover:text-primary/60 transition-colors" />
                  </a>
                  {/* Col 2 */}
                  <button onClick={openQuizPractice} className="flex items-center gap-2.5 p-3 rounded-xl bg-background border border-border/40 hover:border-primary/30 hover:bg-primary/[0.03] transition-all group text-left">
                    <div className="h-9 w-9 rounded-lg bg-muted/20 flex items-center justify-center shrink-0 group-hover:bg-muted/30 transition-colors overflow-hidden">
                      <img src="/img/quiz.png" alt="Quiz Practice" className="h-6 w-6 object-contain" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-body font-medium leading-tight">Quiz Practice</p>
                      <p className="text-[10px] text-muted-foreground font-body">Timed quizzes & weak spots</p>
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
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0 ml-0" />
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
