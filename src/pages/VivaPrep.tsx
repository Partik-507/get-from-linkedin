import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import {
  collection, getDocs, query, where, doc, updateDoc, increment as firestoreIncrement, orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Layout } from "@/components/Layout";
import { GlassCard } from "@/components/GlassCard";
import { EmptyState } from "@/components/EmptyState";
import { QuestionSkeleton, CardSkeleton } from "@/components/LoadingSkeleton";
import { StarRating } from "@/components/StarRating";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, ChevronDown, Heart, Pencil, Save, X, MessageSquare,
  Lightbulb, GraduationCap, Copy, Check, HelpCircle, Users, Plus, Loader2,
} from "lucide-react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { cn } from "@/lib/utils";

interface Question {
  id: string;
  question: string;
  answer: string;
  category: string;
  frequency: string;
  tip: string;
  projectTip: string;
  codeExample: string;
  codeLanguage: string;
  proctors: string[];
  upvotes: number;
  followUps?: string[];
}

interface Submission {
  id: string;
  name: string;
  isAnonymous: boolean;
  proctorId: string;
  level: string;
  date: string;
  duration: string;
  questionsAsked: string;
  codeChanges: string;
  tips: string;
  difficultyRating: number;
  friendlinessRating: number;
  createdAt: any;
}

const FREQUENCIES = ["All", "Hot", "Medium", "Low"];
const FREQ_COLORS: Record<string, string> = {
  hot: "badge-hot",
  medium: "badge-med",
  low: "bg-muted text-muted-foreground",
};

const QuestionCard = ({ q, onUpvote }: { q: Question; onUpvote: (id: string) => void }) => {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: "Type / for commands... Write your answer here." }),
    ],
    content: q.answer || "",
    editable: editing,
  });

  useEffect(() => {
    if (editor) {
      editor.setEditable(editing);
      if (editing) editor.commands.focus();
    }
  }, [editing, editor]);

  const handleSave = async () => {
    if (!editor) return;
    try {
      await updateDoc(doc(db, "questions", q.id), { answer: editor.getHTML() });
      setEditing(false);
      toast.success("Answer saved!");
    } catch {
      toast.error("Failed to save answer");
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(q.codeExample);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <GlassCard className="!p-0 overflow-hidden" hover={false}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-5 flex items-start gap-3 transition-colors hover:bg-accent/50"
      >
        <div className="flex-1 min-w-0">
          <p className="font-medium leading-relaxed pr-2">{q.question}</p>
          <div className="flex flex-wrap gap-2 mt-2.5">
            <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", FREQ_COLORS[q.frequency] || FREQ_COLORS.low)}>
              {q.frequency}
            </span>
            {q.proctors?.map((p) => (
              <Badge key={p} variant="outline" className="text-xs">
                {p}
              </Badge>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onUpvote(q.id); }}
            className="flex items-center gap-1 text-muted-foreground hover:text-destructive transition-colors"
          >
            <Heart className="h-4 w-4" />
            <span className="text-xs tabular-nums">{q.upvotes || 0}</span>
          </button>
          <ChevronDown
            className={cn("h-4 w-4 text-muted-foreground transition-transform duration-300", expanded && "rotate-180")}
          />
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 border-t border-border/50 pt-4">
              <div className="group relative">
                {!editing && (
                  <button
                    onClick={() => setEditing(true)}
                    className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                )}

                {editing ? (
                  <div className="space-y-3">
                    <div className="tiptap-editor rounded-lg border border-border p-4 bg-secondary/30 min-h-[120px]">
                      <EditorContent editor={editor} />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                        <X className="h-3.5 w-3.5 mr-1" /> Cancel
                      </Button>
                      <Button size="sm" onClick={handleSave} className="bg-primary hover:bg-primary/90">
                        <Save className="h-3.5 w-3.5 mr-1" /> Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {q.answer && (
                      <div className="prose prose-sm dark:prose-invert max-w-none mb-4" dangerouslySetInnerHTML={{ __html: q.answer }} />
                    )}

                    {q.tip && (
                      <div className="tip-box rounded-r-lg p-4 mb-4">
                        <div className="flex items-center gap-2 mb-2" style={{ color: "hsl(var(--tip-border))" }}>
                          <Lightbulb className="h-4 w-4" />
                          <span className="text-sm font-semibold">Interview Tip</span>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">{q.tip}</p>
                      </div>
                    )}

                    {q.projectTip && (
                      <div className="project-tip-box rounded-r-lg p-4 mb-4">
                        <div className="flex items-center gap-2 mb-2" style={{ color: "hsl(var(--project-tip-border))" }}>
                          <GraduationCap className="h-4 w-4" />
                          <span className="text-sm font-semibold">In Your Project</span>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">{q.projectTip}</p>
                      </div>
                    )}

                    {q.codeExample && (
                      <div className="relative rounded-lg overflow-hidden mb-4">
                        <div className="flex items-center justify-between px-4 py-2 border-b border-border" style={{ background: "hsl(var(--code-bg))" }}>
                          <span className="text-xs font-mono" style={{ color: "hsl(var(--code-text))" }}>{q.codeLanguage || "code"}</span>
                          <button onClick={copyCode} className="text-xs flex items-center gap-1 transition-colors" style={{ color: "hsl(var(--code-text))" }}>
                            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                            {copied ? "Copied" : "Copy"}
                          </button>
                        </div>
                        <pre className="p-4 overflow-x-auto text-sm font-mono" style={{ background: "hsl(var(--code-bg))", color: "hsl(var(--code-text))" }}>
                          <code>{q.codeExample}</code>
                        </pre>
                      </div>
                    )}

                    {q.followUps && q.followUps.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-4">
                        <span className="text-xs text-muted-foreground mr-1">Follow-ups:</span>
                        {q.followUps.map((f, i) => (
                          <Badge key={i} variant="outline" className="text-xs cursor-pointer hover:bg-accent transition-colors">
                            {f}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {!q.answer && !q.tip && !q.projectTip && !q.codeExample && (
                      <p className="text-sm text-muted-foreground italic">
                        No answer yet. Click the edit icon to add one — everyone can contribute!
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  );
};

const SubmissionCard = ({ s }: { s: Submission }) => (
  <GlassCard className="space-y-3">
    <div className="flex items-center justify-between flex-wrap gap-2">
      <div className="flex items-center gap-2">
        <span className="font-medium">{s.isAnonymous ? "Anonymous" : s.name || "Anonymous"}</span>
        {s.proctorId && (
          <Badge variant="outline" className="text-xs">{s.proctorId}</Badge>
        )}
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        {s.level && <span className="font-medium text-foreground">{s.level}</span>}
        {s.date && <span>{s.date}</span>}
        {s.duration && <span>{s.duration}</span>}
      </div>
    </div>

    {s.questionsAsked && (
      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Questions Asked</p>
        <ul className="text-sm space-y-1 list-disc pl-4 text-muted-foreground">
          {s.questionsAsked.split("\n").filter(Boolean).map((line, i) => (
            <li key={i}>{line.replace(/^[-•*]\s*/, "")}</li>
          ))}
        </ul>
      </div>
    )}

    {s.codeChanges && (
      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Code Changes</p>
        <p className="text-sm text-muted-foreground">{s.codeChanges}</p>
      </div>
    )}

    {s.tips && (
      <div className="tip-box rounded-lg p-3">
        <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "hsl(var(--tip-border))" }}>Tips</p>
        <p className="text-sm text-muted-foreground">{s.tips}</p>
      </div>
    )}

    <div className="flex items-center gap-6 pt-1">
      {s.difficultyRating > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-destructive">Difficulty</span>
          <StarRating value={s.difficultyRating} readonly size="sm" color="text-destructive" />
        </div>
      )}
      {s.friendlinessRating > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: "hsl(var(--tip-border))" }}>Friendliness</span>
          <StarRating value={s.friendlinessRating} readonly size="sm" />
        </div>
      )}
    </div>
  </GlassCard>
);

const VivaPrep = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [subLoading, setSubLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedFrequency, setSelectedFrequency] = useState("All");
  const [subFilter, setSubFilter] = useState("");
  const [visibleSubs, setVisibleSubs] = useState(10);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    document.title = `Viva Prep — VivaVault`;
  }, []);

  useEffect(() => {
    const fetch = async () => {
      try {
        const q = query(collection(db, "questions"), where("projectId", "==", projectId));
        const snap = await getDocs(q);
        setQuestions(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Question)));
      } catch {
        toast.error("Failed to load questions");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [projectId]);

  useEffect(() => {
    const fetch = async () => {
      try {
        const q = query(collection(db, "submissions"), where("projectId", "==", projectId), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        setSubmissions(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Submission)));
      } catch {
        // May fail if no index yet
      } finally {
        setSubLoading(false);
      }
    };
    fetch();
  }, [projectId]);

  const categories = useMemo(() => {
    const cats = new Set(questions.map((q) => q.category || "General"));
    return ["All", ...Array.from(cats).sort()];
  }, [questions]);

  const filtered = useMemo(() => {
    return questions.filter((q) => {
      if (selectedCategory !== "All" && q.category !== selectedCategory) return false;
      if (selectedFrequency !== "All" && q.frequency?.toLowerCase() !== selectedFrequency.toLowerCase()) return false;
      if (debouncedSearch) {
        const s = debouncedSearch.toLowerCase();
        return q.question.toLowerCase().includes(s) || q.answer?.toLowerCase().includes(s);
      }
      return true;
    });
  }, [questions, selectedCategory, selectedFrequency, debouncedSearch]);

  const filteredSubs = useMemo(() => {
    if (!subFilter) return submissions;
    const s = subFilter.toLowerCase();
    return submissions.filter(
      (sub) => sub.proctorId?.toLowerCase().includes(s) || sub.level?.toLowerCase().includes(s)
    );
  }, [submissions, subFilter]);

  const handleUpvote = async (id: string) => {
    try {
      await updateDoc(doc(db, "questions", id), { upvotes: firestoreIncrement(1) });
      setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, upvotes: (q.upvotes || 0) + 1 } : q)));
    } catch {
      toast.error("Failed to upvote");
    }
  };

  return (
    <Layout title="Viva Prep" showBack>
      {/* Filter Bar */}
      <div className="sticky top-16 z-40 glass-strong -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search questions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-secondary border-border h-10"
            />
          </div>
          <div className="flex gap-2">
            {FREQUENCIES.map((f) => (
              <Button
                key={f}
                size="sm"
                variant={selectedFrequency === f ? "default" : "outline"}
                onClick={() => setSelectedFrequency(f)}
                className={cn(
                  "transition-all duration-150 active:scale-95",
                  selectedFrequency === f && "bg-primary hover:bg-primary/90"
                )}
              >
                {f}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <Badge
              key={cat}
              variant={selectedCategory === cat ? "default" : "outline"}
              className={cn(
                "cursor-pointer whitespace-nowrap transition-all duration-150 active:scale-95 shrink-0",
                selectedCategory === cat
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "hover:bg-accent"
              )}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </Badge>
          ))}
        </div>

        <p className="text-xs text-muted-foreground mt-2 tabular-nums">
          {filtered.length} question{filtered.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Questions */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => <QuestionSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={HelpCircle}
          title="No questions found"
          description={
            questions.length === 0
              ? "No questions have been imported for this project yet. Ask an admin to import questions."
              : "No questions match your current filters. Try adjusting your search or filters."
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((q, i) => (
            <motion.div
              key={q.id}
              initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ delay: Math.min(i * 0.04, 0.4), duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <QuestionCard q={q} onUpvote={handleUpvote} />
            </motion.div>
          ))}
        </div>
      )}

      {/* Community Section */}
      <div className="mt-16">
        <div className="h-px bg-border mb-10" />
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" /> Community Experiences
            </h2>
            <p className="text-sm text-muted-foreground mt-1">Real viva experiences shared by students</p>
          </div>
          <div className="flex gap-3">
            <Input
              placeholder="Filter by proctor or level..."
              value={subFilter}
              onChange={(e) => setSubFilter(e.target.value)}
              className="w-56 bg-secondary border-border h-9 text-sm"
            />
            <Button asChild className="bg-gradient-to-r from-primary to-[hsl(263,70%,55%)] hover:opacity-90 transition-all active:scale-[0.97]">
              <Link to={`/project/${projectId}/submit`}>
                <Plus className="h-4 w-4 mr-1.5" /> Share Your Experience
              </Link>
            </Button>
          </div>
        </div>

        {subLoading ? (
          <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}</div>
        ) : filteredSubs.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="No experiences shared yet"
            description="Be the first to share your viva experience and help fellow students!"
            action={
              <Button asChild variant="outline">
                <Link to={`/project/${projectId}/submit`}>Share Your Experience</Link>
              </Button>
            }
          />
        ) : (
          <div className="space-y-4">
            {filteredSubs.slice(0, visibleSubs).map((s, i) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.06, 0.5), duration: 0.5 }}
              >
                <SubmissionCard s={s} />
              </motion.div>
            ))}
            {visibleSubs < filteredSubs.length && (
              <div className="text-center pt-4">
                <Button variant="outline" onClick={() => setVisibleSubs((v) => v + 10)}>
                  Load More ({filteredSubs.length - visibleSubs} remaining)
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default VivaPrep;
