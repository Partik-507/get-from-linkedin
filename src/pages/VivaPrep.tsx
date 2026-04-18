import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import {
  collection, getDocs, query, where, doc, updateDoc, increment as firestoreIncrement, orderBy, getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Layout } from "@/components/Layout";
import { EmptyState } from "@/components/EmptyState";
import { QuestionSkeleton, CardSkeleton } from "@/components/LoadingSkeleton";
import { StarRating } from "@/components/StarRating";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, ChevronDown, Heart, Pencil, Save, X, MessageSquare,
  Lightbulb, GraduationCap, Copy, Check, HelpCircle, Users, Plus, Loader2,
  ArrowUp, Share2, BookCheck, Bookmark, BookmarkCheck, SlidersHorizontal,
  Sparkles, BookOpen, StickyNote, Tag,
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { cn } from "@/lib/utils";
import type { FilterIndex } from "@/lib/schemaEngine";

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
  customFields?: Record<string, string>;
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

type BookmarkCollections = Record<string, string[]>;

const FREQUENCIES = ["All", "Hot", "Medium", "Low"];
const FREQ_COLORS: Record<string, string> = {
  hot: "badge-hot",
  medium: "badge-med",
  low: "badge-low",
};
const SORT_OPTIONS = ["Latest", "Most Voted", "Difficulty"] as const;

const hashColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 65%, 55%)`;
};

const loadBookmarks = (): BookmarkCollections => {
  try { return JSON.parse(localStorage.getItem("vv_bookmarks") || "{}"); } catch { return {}; }
};
const saveBookmarks = (b: BookmarkCollections) => { localStorage.setItem("vv_bookmarks", JSON.stringify(b)); };
const isBookmarked = (bookmarks: BookmarkCollections, qId: string) => Object.values(bookmarks).some((ids) => ids.includes(qId));

// ─── Bookmark Popover ───
const BookmarkPopover = ({ questionId, bookmarks, setBookmarks }: { questionId: string; bookmarks: BookmarkCollections; setBookmarks: (b: BookmarkCollections) => void }) => {
  const [newName, setNewName] = useState("");
  const collections = Object.keys(bookmarks);
  const saved = isBookmarked(bookmarks, questionId);

  const toggleCollection = (name: string) => {
    const next = { ...bookmarks };
    if (!next[name]) next[name] = [];
    if (next[name].includes(questionId)) {
      next[name] = next[name].filter((id) => id !== questionId);
      if (next[name].length === 0) delete next[name];
    } else {
      next[name].push(questionId);
    }
    setBookmarks(next);
    saveBookmarks(next);
  };

  const createCollection = () => {
    const name = newName.trim();
    if (!name) return;
    const next = { ...bookmarks, [name]: [...(bookmarks[name] || []), questionId] };
    setBookmarks(next);
    saveBookmarks(next);
    setNewName("");
    toast.success(`Saved to "${name}"`);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className={cn("flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-body transition-all duration-200", saved ? "bg-primary/15 text-primary" : "bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary")}>
          {saved ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
          {saved ? "Saved" : "Bookmark"}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <p className="text-sm font-semibold mb-2 font-body">Save to collection</p>
        {collections.length > 0 && (
          <div className="space-y-1 mb-3 max-h-32 overflow-y-auto">
            {collections.map((name) => (
              <label key={name} className="flex items-center gap-2 text-sm font-body cursor-pointer hover:bg-accent/50 rounded px-2 py-1 transition-colors">
                <Checkbox checked={bookmarks[name]?.includes(questionId)} onCheckedChange={() => toggleCollection(name)} />
                <span className="truncate">{name}</span>
                <span className="text-muted-foreground text-xs ml-auto">{bookmarks[name]?.length || 0}</span>
              </label>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New collection..." className="h-8 text-xs bg-secondary/30 border-border/40" onKeyDown={(e) => e.key === "Enter" && createCollection()} />
          <Button size="sm" className="h-8 px-3 text-xs" onClick={createCollection} disabled={!newName.trim()}>
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

// ─── Question Card ───
const QuestionCard = ({ q, onUpvote, isUpvoted, isStudied, onToggleStudied, bookmarks, setBookmarks }: {
  q: Question; onUpvote: (id: string) => void; isUpvoted: boolean; isStudied: boolean; onToggleStudied: (id: string) => void; bookmarks: BookmarkCollections; setBookmarks: (b: BookmarkCollections) => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);

  const editor = useEditor({
    extensions: [StarterKit, Placeholder.configure({ placeholder: "Type your answer here..." })],
    content: q.answer || "",
    editable: editing,
  });

  useEffect(() => {
    if (editor) { editor.setEditable(editing); if (editing) editor.commands.focus(); }
  }, [editing, editor]);

  const handleSave = async () => {
    if (!editor) return;
    try {
      await updateDoc(doc(db, "questions", q.id), { answer: editor.getHTML() });
      setEditing(false);
      toast.success("Answer saved!");
    } catch { toast.error("Failed to save answer"); }
  };

  const copyCode = () => { navigator.clipboard.writeText(q.codeExample); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const shareQuestion = () => { navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}#q-${q.id}`); toast.success("Link copied!"); };

  return (
    <div className={cn("obsidian-card overflow-hidden group", isStudied && "ring-1 ring-[hsl(142,71%,45%)]/30")} id={`q-${q.id}`}>
      <div onClick={() => setExpanded(!expanded)} className="w-full text-left p-5 sm:p-6 flex items-start gap-3 transition-colors duration-200 hover:bg-accent/20 cursor-pointer">
        <div className="flex-1 min-w-0">
          <p className="font-mono-dm font-medium leading-relaxed pr-2 text-foreground text-[15px] sm:text-base">{q.question}</p>
          <div className="flex flex-wrap gap-2 mt-3">
            {q.frequency && <span className={cn("text-xs px-2.5 py-1 rounded-full font-semibold font-body", FREQ_COLORS[q.frequency?.toLowerCase()] || FREQ_COLORS.low)}>{q.frequency}</span>}
            {q.category && <span className="text-xs px-2.5 py-1 rounded-full bg-secondary text-muted-foreground font-body">{q.category}</span>}
            {q.proctors?.map((p) => (
              <span key={p} className="text-xs px-2.5 py-1 rounded-full border border-primary/30 text-primary font-body inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full inline-block" style={{ backgroundColor: hashColor(p) }} />
                {p}
              </span>
            ))}
            {q.customFields && Object.entries(q.customFields).map(([key, val]) => (
              <span key={key} className="text-xs px-2.5 py-1 rounded-full bg-accent text-accent-foreground font-body">{key}: {val}</span>
            ))}
            {isStudied && <span className="text-xs px-2 py-1 rounded-full bg-[hsl(142,71%,45%)]/10 text-[hsl(142,71%,45%)] font-body inline-flex items-center gap-1"><Check className="h-3 w-3" /> Studied</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 pt-0.5">
          <button onClick={(e) => { e.stopPropagation(); onUpvote(q.id); }} className={cn("flex items-center gap-1 transition-all duration-200", isUpvoted ? "text-destructive" : "text-muted-foreground hover:text-destructive")}>
            <Heart className={cn("h-4 w-4 transition-all", isUpvoted && "fill-current scale-110")} />
            <span className="text-xs tabular-nums font-body">{q.upvotes || 0}</span>
          </button>
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-300", expanded && "rotate-180")} />
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }} className="overflow-hidden">
            <div className="px-5 sm:px-6 pb-5 border-t border-border/30 pt-4">
              <div className="border-l-2 border-primary/40 pl-4">
                <div className="relative">
                  {editing ? (
                    <div className="space-y-3">
                      <div className="tiptap-editor rounded-lg border border-border p-4 bg-secondary/20 min-h-[120px]">
                        <EditorContent editor={editor} />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="ghost" onClick={() => setEditing(false)} className="font-body"><X className="h-3.5 w-3.5 mr-1" /> Cancel</Button>
                        <Button size="sm" onClick={handleSave} className="bg-primary hover:bg-primary/90 font-body"><Save className="h-3.5 w-3.5 mr-1" /> Save</Button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {q.answer && <div className="prose prose-sm dark:prose-invert max-w-none mb-4 text-muted-foreground font-body leading-relaxed" dangerouslySetInnerHTML={{ __html: safeHtml(q.answer) }} />}
                      {q.tip && (
                        <div className="tip-box rounded-r-lg p-4 mb-4">
                          <div className="flex items-center gap-2 mb-2" style={{ color: "hsl(var(--tip-border))" }}>
                            <Lightbulb className="h-4 w-4" /><span className="text-sm font-semibold font-body">Interview Tip</span>
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed font-body">{q.tip}</p>
                        </div>
                      )}
                      {q.projectTip && (
                        <div className="project-tip-box rounded-r-lg p-4 mb-4">
                          <div className="flex items-center gap-2 mb-2" style={{ color: "hsl(var(--project-tip-border))" }}>
                            <GraduationCap className="h-4 w-4" /><span className="text-sm font-semibold font-body">In Your Project</span>
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed font-body">{q.projectTip}</p>
                        </div>
                      )}
                      {q.codeExample && (
                        <div className="relative rounded-lg overflow-hidden mb-4">
                          <div className="flex items-center justify-between px-4 py-2 border-b border-border/30" style={{ background: "hsl(var(--code-bg))" }}>
                            <span className="text-xs font-mono-dm" style={{ color: "hsl(var(--code-text))" }}>{q.codeLanguage || "code"}</span>
                            <button onClick={copyCode} className="text-xs flex items-center gap-1 transition-colors font-body" style={{ color: "hsl(var(--code-text))" }}>
                              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}{copied ? "Copied" : "Copy"}
                            </button>
                          </div>
                          <pre className="p-4 overflow-x-auto text-sm font-mono-dm" style={{ background: "hsl(var(--code-bg))", color: "hsl(var(--code-text))" }}><code>{q.codeExample}</code></pre>
                        </div>
                      )}
                      {q.followUps && q.followUps.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-4">
                          <span className="text-xs text-muted-foreground mr-1 font-body">Follow-ups:</span>
                          {q.followUps.map((f, i) => <Badge key={i} variant="outline" className="text-xs cursor-pointer hover:bg-accent transition-colors font-body">{f}</Badge>)}
                        </div>
                      )}
                      {!q.answer && !q.tip && !q.projectTip && !q.codeExample && (
                        <p className="text-sm text-muted-foreground italic font-body">No answer yet. Click Edit to add one.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border/20 flex-wrap">
                <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary font-body transition-all duration-200"><Pencil className="h-3.5 w-3.5" /> Edit</button>
                <button onClick={shareQuestion} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary font-body transition-all duration-200"><Share2 className="h-3.5 w-3.5" /> Share</button>
                <BookmarkPopover questionId={q.id} bookmarks={bookmarks} setBookmarks={setBookmarks} />
                <button onClick={() => onToggleStudied(q.id)} className={cn("flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-body transition-all duration-200", isStudied ? "bg-[hsl(142,71%,45%)]/10 text-[hsl(142,71%,45%)]" : "bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary")}>
                  <BookCheck className="h-3.5 w-3.5" />{isStudied ? "Studied ✓" : "Mark Studied"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Submission Card ───
const SubmissionCard = ({ s }: { s: Submission }) => (
  <div className="obsidian-card p-5 sm:p-6 space-y-3">
    <div className="flex items-center justify-between flex-wrap gap-2">
      <div className="flex items-center gap-2">
        <span className="font-heading font-semibold">{s.isAnonymous ? "Anonymous" : s.name || "Anonymous"}</span>
        {s.proctorId && (
          <span className="text-xs px-2 py-0.5 rounded-full border border-primary/30 text-primary font-body inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: hashColor(s.proctorId) }} />{s.proctorId}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground font-body">
        {s.level && <span className="font-medium text-foreground">{s.level}</span>}
        {s.date && <span>{s.date}</span>}
        {s.duration && <span>{s.duration}</span>}
      </div>
    </div>
    {s.questionsAsked && (
      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider font-body">Questions Asked</p>
        <ul className="text-sm space-y-1 list-disc pl-4 text-muted-foreground font-body">
          {s.questionsAsked.split("\n").filter(Boolean).map((line, i) => <li key={i}>{line.replace(/^[-•*]\s*/, "")}</li>)}
        </ul>
      </div>
    )}
    {s.codeChanges && (
      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider font-body">Code Changes</p>
        <p className="text-sm text-muted-foreground font-body">{s.codeChanges}</p>
      </div>
    )}
    {s.tips && (
      <div className="tip-box rounded-lg p-3">
        <p className="text-xs font-semibold uppercase tracking-wider mb-1 font-body" style={{ color: "hsl(var(--tip-border))" }}>Tips</p>
        <p className="text-sm text-muted-foreground font-body">{s.tips}</p>
      </div>
    )}
    <div className="flex items-center gap-6 pt-1">
      {s.difficultyRating > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-destructive font-body">Difficulty</span>
          <StarRating value={s.difficultyRating} readonly size="sm" color="text-destructive" />
        </div>
      )}
      {s.friendlinessRating > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-body" style={{ color: "hsl(var(--tip-border))" }}>Friendliness</span>
          <StarRating value={s.friendlinessRating} readonly size="sm" />
        </div>
      )}
    </div>
  </div>
);

// ─── Dynamic Filter Component (Schema-Driven) ───
const DynamicFilterControl = ({ index, value, onChange }: { index: FilterIndex; value: string | string[]; onChange: (v: string | string[]) => void }) => {
  if (index.filterType === "dropdown") {
    return (
      <Select value={typeof value === "string" ? value : "All"} onValueChange={v => onChange(v)}>
        <SelectTrigger className="w-[160px] h-10 bg-secondary/20 border-border/30 font-body text-sm">
          <SelectValue placeholder={index.fieldLabel} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="All" className="font-body">All</SelectItem>
          {index.values.map(v => (
            <SelectItem key={v.value} value={v.value} className="font-body">
              {v.value} ({v.count})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (index.filterType === "multi_select") {
    const selected = Array.isArray(value) ? value : [];
    return (
      <div className="flex flex-wrap gap-1.5">
        {index.values.slice(0, 12).map(v => {
          const isActive = selected.includes(v.value);
          return (
            <button
              key={v.value}
              onClick={() => {
                if (isActive) onChange(selected.filter(x => x !== v.value));
                else onChange([...selected, v.value]);
              }}
              className={cn(
                "px-2.5 py-1.5 rounded-full text-xs font-body transition-all duration-200",
                isActive ? "bg-primary text-primary-foreground" : "bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              {v.value}
            </button>
          );
        })}
      </div>
    );
  }

  if (index.filterType === "range") {
    const nums = index.values.map(v => parseFloat(v.value)).filter(n => !isNaN(n));
    const min = Math.min(...nums);
    const max = Math.max(...nums);
    const current = typeof value === "string" ? parseFloat(value) || min : min;
    return (
      <div className="w-[200px] space-y-1">
        <Slider value={[current]} onValueChange={([v]) => onChange(String(v))} min={min} max={max} step={1} />
        <div className="flex justify-between text-[10px] text-muted-foreground font-body">
          <span>{min}</span><span>{current}</span><span>{max}</span>
        </div>
      </div>
    );
  }

  // Default: date_picker or fallback dropdown
  return (
    <Select value={typeof value === "string" ? value : "All"} onValueChange={v => onChange(v)}>
      <SelectTrigger className="w-[160px] h-10 bg-secondary/20 border-border/30 font-body text-sm">
        <SelectValue placeholder={index.fieldLabel} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="All" className="font-body">All</SelectItem>
        {index.values.map(v => <SelectItem key={v.value} value={v.value} className="font-body">{v.value}</SelectItem>)}
      </SelectContent>
    </Select>
  );
};

// ─── Filter Panel ───
const FilterPanel = ({
  questions, categories, proctors, dynamicFilters, schemaFilters,
  selectedCategory, setSelectedCategory, selectedFrequency, setSelectedFrequency,
  selectedProctor, setSelectedProctor, selectedDynamic, setSelectedDynamic,
  schemaFilterValues, setSchemaFilterValues,
}: {
  questions: Question[]; categories: string[]; proctors: string[];
  dynamicFilters: Map<string, Set<string>>; schemaFilters: FilterIndex[];
  selectedCategory: string; setSelectedCategory: (v: string) => void;
  selectedFrequency: string; setSelectedFrequency: (v: string) => void;
  selectedProctor: string; setSelectedProctor: (v: string) => void;
  selectedDynamic: Record<string, Set<string>>; setSelectedDynamic: (v: Record<string, Set<string>>) => void;
  schemaFilterValues: Record<string, string | string[]>; setSchemaFilterValues: (v: Record<string, string | string[]>) => void;
}) => {
  const activeCount = [
    selectedFrequency !== "All" ? 1 : 0,
    selectedCategory !== "All" ? 1 : 0,
    selectedProctor !== "All" ? 1 : 0,
    ...Object.values(selectedDynamic).map((s) => s.size),
    ...Object.values(schemaFilterValues).map(v => {
      if (Array.isArray(v)) return v.length;
      return v && v !== "All" ? 1 : 0;
    }),
  ].reduce((a, b) => a + b, 0);

  const clearAll = () => {
    setSelectedFrequency("All");
    setSelectedCategory("All");
    setSelectedProctor("All");
    setSelectedDynamic({});
    setSchemaFilterValues({});
  };

  const toggleDynamic = (key: string, val: string) => {
    const next = { ...selectedDynamic };
    if (!next[key]) next[key] = new Set();
    else next[key] = new Set(next[key]);
    if (next[key].has(val)) next[key].delete(val);
    else next[key].add(val);
    if (next[key].size === 0) delete next[key];
    setSelectedDynamic(next);
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 font-body relative border-border/50 hover:border-primary/40">
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {activeCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 h-5 min-w-[20px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
              {activeCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-heading flex items-center justify-between">
            <span>All Filters</span>
            {activeCount > 0 && <Button variant="ghost" size="sm" onClick={clearAll} className="text-xs text-muted-foreground font-body">Clear All</Button>}
          </SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-120px)] mt-4 pr-2">
          <div className="space-y-6">
            {/* Difficulty */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 font-body">Difficulty</p>
              <div className="flex flex-wrap gap-2">
                {FREQUENCIES.map((f) => (
                  <button key={f} onClick={() => setSelectedFrequency(f)} className={cn("px-3.5 py-2 rounded-full text-xs font-semibold font-body transition-all duration-200", selectedFrequency === f ? "bg-primary text-primary-foreground shadow-[0_0_12px_-2px_hsl(263,70%,55%/0.4)]" : "bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary")}>{f}</button>
                ))}
              </div>
            </div>

            {/* Category */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 font-body">Category</p>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button key={cat} onClick={() => setSelectedCategory(cat)} className={cn("px-3 py-2 rounded-full text-xs font-body whitespace-nowrap transition-all duration-200", selectedCategory === cat ? "bg-primary text-primary-foreground" : "bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary")}>{cat}</button>
                ))}
              </div>
            </div>

            {/* Proctor */}
            {proctors.length > 1 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 font-body">Proctor</p>
                <div className="flex flex-wrap gap-2">
                  {proctors.map((p) => (
                    <button key={p} onClick={() => setSelectedProctor(p)} className={cn("px-3 py-2 rounded-full text-xs font-body whitespace-nowrap transition-all duration-200 inline-flex items-center gap-1.5", selectedProctor === p ? "bg-primary text-primary-foreground" : "bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary")}>
                      {p !== "All" && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: hashColor(p) }} />}{p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Schema-driven filters */}
            {schemaFilters.map(sf => (
              <div key={sf.fieldKey}>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 font-body">{sf.fieldLabel}</p>
                <DynamicFilterControl index={sf} value={schemaFilterValues[sf.fieldKey] || (sf.filterType === "multi_select" ? [] : "All")} onChange={v => setSchemaFilterValues({ ...schemaFilterValues, [sf.fieldKey]: v })} />
              </div>
            ))}

            {/* Dynamic filters from customFields */}
            {Array.from(dynamicFilters.entries()).map(([key, values]) => (
              <div key={key}>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 font-body">{key}</p>
                <div className="space-y-1">
                  {Array.from(values).sort().map((val) => (
                    <label key={val} className="flex items-center gap-2.5 text-sm font-body cursor-pointer hover:bg-accent/50 rounded-lg px-2 py-1.5 transition-colors">
                      <Checkbox checked={selectedDynamic[key]?.has(val) || false} onCheckedChange={() => toggleDynamic(key, val)} />
                      <span>{val}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

// ─── Main Page ───
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
  const [selectedProctor, setSelectedProctor] = useState("All");
  const [selectedDynamic, setSelectedDynamic] = useState<Record<string, Set<string>>>({});
  const [selectedTag, setSelectedTag] = useState("All");
  const [sortBy, setSortBy] = useState<typeof SORT_OPTIONS[number]>("Latest");
  const [subFilter, setSubFilter] = useState("");
  const [visibleSubs, setVisibleSubs] = useState(10);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [bookmarks, setBookmarks] = useState<BookmarkCollections>(loadBookmarks);

  // Schema-driven filters
  const [schemaFilters, setSchemaFilters] = useState<FilterIndex[]>([]);
  const [schemaFilterValues, setSchemaFilterValues] = useState<Record<string, string | string[]>>({});

  const [upvotedIds, setUpvotedIds] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem("vv_upvoted") || "[]")); } catch { return new Set(); }
  });
  const [studiedIds, setStudiedIds] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem("vv_studied") || "[]")); } catch { return new Set(); }
  });

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => { document.title = `Viva Prep — VivaVault`; }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        document.getElementById("viva-search")?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    const handler = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  // Fetch questions + schema filter indexes
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [qSnap] = await Promise.all([
          getDocs(query(collection(db, "questions"), where("projectId", "==", projectId))),
        ]);
        setQuestions(qSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Question)));

        // Try to load schema-driven filter indexes
        try {
          const indexDoc = await getDoc(doc(db, "filter_indexes", projectId!));
          if (indexDoc.exists()) {
            const indexes = indexDoc.data()?.indexes || [];
            setSchemaFilters(indexes);
          }
        } catch { /* No filter indexes — use hardcoded fallback */ }
      } catch { toast.error("Failed to load questions"); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [projectId]);

  useEffect(() => {
    const fetchSubs = async () => {
      try {
        const q = query(collection(db, "submissions"), where("projectId", "==", projectId), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        setSubmissions(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Submission)));
      } catch {} finally { setSubLoading(false); }
    };
    fetchSubs();
  }, [projectId]);

  const categories = useMemo(() => {
    const cats = new Set(questions.map((q) => q.category || "General"));
    return ["All", ...Array.from(cats).sort()];
  }, [questions]);

  const proctors = useMemo(() => {
    const set = new Set<string>();
    questions.forEach((q) => q.proctors?.forEach((p) => set.add(p)));
    return ["All", ...Array.from(set).sort()];
  }, [questions]);

  const dynamicFilters = useMemo(() => {
    const map = new Map<string, Set<string>>();
    questions.forEach((q) => {
      if (q.customFields) {
        Object.entries(q.customFields).forEach(([key, val]) => {
          if (!map.has(key)) map.set(key, new Set());
          if (val) map.get(key)!.add(val);
        });
      }
    });
    return map;
  }, [questions]);

  const tags = useMemo(() => {
    const set = new Set<string>();
    questions.forEach((q) => {
      const qAny = q as any;
      if (Array.isArray(qAny.tags)) qAny.tags.forEach((t: string) => set.add(t));
    });
    return ["All", ...Array.from(set).sort()];
  }, [questions]);

  const studiedCount = useMemo(() => questions.filter((q) => studiedIds.has(q.id)).length, [questions, studiedIds]);

  const activeFilters = useMemo(() => {
    const chips: { label: string; clear: () => void }[] = [];
    if (selectedFrequency !== "All") chips.push({ label: selectedFrequency, clear: () => setSelectedFrequency("All") });
    if (selectedCategory !== "All") chips.push({ label: selectedCategory, clear: () => setSelectedCategory("All") });
    if (selectedProctor !== "All") chips.push({ label: selectedProctor, clear: () => setSelectedProctor("All") });
    Object.entries(selectedDynamic).forEach(([key, vals]) => {
      vals.forEach((val) => {
        chips.push({
          label: `${key}: ${val}`,
          clear: () => {
            const next = { ...selectedDynamic };
            next[key] = new Set(next[key]);
            next[key].delete(val);
            if (next[key].size === 0) delete next[key];
            setSelectedDynamic(next);
          },
        });
      });
    });
    // Schema filter chips
    Object.entries(schemaFilterValues).forEach(([key, val]) => {
      const label = schemaFilters.find(f => f.fieldKey === key)?.fieldLabel || key;
      if (Array.isArray(val)) {
        val.forEach(v => chips.push({ label: `${label}: ${v}`, clear: () => {
          const next = { ...schemaFilterValues };
          next[key] = (next[key] as string[]).filter(x => x !== v);
          if ((next[key] as string[]).length === 0) delete next[key];
          setSchemaFilterValues(next);
        }}));
      } else if (val && val !== "All") {
        chips.push({ label: `${label}: ${val}`, clear: () => {
          const next = { ...schemaFilterValues };
          delete next[key];
          setSchemaFilterValues(next);
        }});
      }
    });
    if (selectedTag !== "All") chips.push({ label: `Tag: ${selectedTag}`, clear: () => setSelectedTag("All") });
    if (debouncedSearch) chips.push({ label: `"${debouncedSearch}"`, clear: () => { setSearch(""); setDebouncedSearch(""); } });
    return chips;
  }, [selectedFrequency, selectedCategory, selectedProctor, selectedDynamic, selectedTag, debouncedSearch, schemaFilterValues, schemaFilters]);

  const filtered = useMemo(() => {
    let result = questions.filter((q) => {
      if (selectedCategory !== "All" && q.category !== selectedCategory) return false;
      if (selectedFrequency !== "All" && q.frequency?.toLowerCase() !== selectedFrequency.toLowerCase()) return false;
      if (selectedProctor !== "All" && !q.proctors?.includes(selectedProctor)) return false;
      if (selectedTag !== "All" && !(q as any).tags?.includes(selectedTag)) return false;
      for (const [key, vals] of Object.entries(selectedDynamic)) {
        if (vals.size > 0 && (!q.customFields || !vals.has(q.customFields[key]))) return false;
      }
      // Schema-driven filter matching
      for (const [key, val] of Object.entries(schemaFilterValues)) {
        if (!val || (typeof val === "string" && val === "All") || (Array.isArray(val) && val.length === 0)) continue;
        const qVal = (q as any)[key] || q.customFields?.[key];
        if (Array.isArray(val)) {
          if (Array.isArray(qVal)) {
            if (!val.some(v => qVal.includes(v))) return false;
          } else {
            if (!val.includes(String(qVal || ""))) return false;
          }
        } else {
          if (Array.isArray(qVal)) {
            if (!qVal.includes(val)) return false;
          } else {
            if (String(qVal || "") !== val) return false;
          }
        }
      }
      if (debouncedSearch) {
        const s = debouncedSearch.toLowerCase();
        const inCustom = q.customFields ? Object.values(q.customFields).some((v) => v.toLowerCase().includes(s)) : false;
        return q.question?.toLowerCase().includes(s) || q.answer?.toLowerCase().includes(s) || q.category?.toLowerCase().includes(s) || q.proctors?.some((p) => p.toLowerCase().includes(s)) || inCustom;
      }
      return true;
    });

    if (sortBy === "Most Voted") result = [...result].sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));
    else if (sortBy === "Difficulty") {
      const order: Record<string, number> = { hot: 3, medium: 2, low: 1 };
      result = [...result].sort((a, b) => (order[b.frequency?.toLowerCase()] || 0) - (order[a.frequency?.toLowerCase()] || 0));
    }

    return result;
  }, [questions, selectedCategory, selectedFrequency, selectedProctor, selectedTag, selectedDynamic, schemaFilterValues, debouncedSearch, sortBy]);

  const filteredSubs = useMemo(() => {
    if (!subFilter) return submissions;
    const s = subFilter.toLowerCase();
    return submissions.filter((sub) => sub.proctorId?.toLowerCase().includes(s) || sub.level?.toLowerCase().includes(s));
  }, [submissions, subFilter]);

  const handleUpvote = async (id: string) => {
    if (upvotedIds.has(id)) return;
    try {
      await updateDoc(doc(db, "questions", id), { upvotes: firestoreIncrement(1) });
      setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, upvotes: (q.upvotes || 0) + 1 } : q)));
      const next = new Set(upvotedIds).add(id);
      setUpvotedIds(next);
      localStorage.setItem("vv_upvoted", JSON.stringify([...next]));
    } catch { toast.error("Failed to upvote"); }
  };

  const toggleStudied = (id: string) => {
    const next = new Set(studiedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setStudiedIds(next);
    localStorage.setItem("vv_studied", JSON.stringify([...next]));
  };

  const diffDist = useMemo(() => {
    const counts = { hot: 0, medium: 0, low: 0 };
    questions.forEach((q) => {
      const f = q.frequency?.toLowerCase() as keyof typeof counts;
      if (f in counts) counts[f]++;
    });
    return counts;
  }, [questions]);

  return (
    <Layout title="Viva Prep" showBack>
      {/* Hero */}
      <div className="mb-8 animate-fade-in">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl sm:text-4xl font-heading font-extrabold tracking-tight">Viva Prep Questions</h1>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-semibold font-body">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />{questions.length}
          </span>
        </div>
        <p className="text-muted-foreground font-body text-sm sm:text-base">Filter, study, and upvote the questions that matter</p>

        <div className="flex flex-wrap gap-3 mt-5">
          <Button asChild className="btn-premium btn-premium-glow font-body gap-2 bg-gradient-to-r from-primary to-[hsl(280,60%,50%)] text-primary-foreground shadow-md hover:shadow-lg hover:scale-105 active:scale-95 h-11 px-5 rounded-xl transition-all duration-200">
            <Link to={`/project/${projectId}/flashcards`}><Sparkles className="h-4 w-4" /> Flashcard Mode</Link>
          </Button>
          <Button asChild className="btn-premium font-body gap-2 bg-gradient-to-r from-[hsl(38,92%,45%)] to-[hsl(30,90%,50%)] text-white shadow-md hover:shadow-lg hover:scale-105 active:scale-95 h-11 px-5 rounded-xl transition-all duration-200">
            <Link to={`/project/${projectId}/quiz`}><GraduationCap className="h-4 w-4" /> Quiz Mode</Link>
          </Button>
          <Button
            className="btn-premium font-body gap-2 bg-gradient-to-r from-[hsl(142,71%,40%)] to-[hsl(160,60%,38%)] text-white shadow-md hover:shadow-lg hover:scale-105 active:scale-95 h-11 px-5 rounded-xl transition-all duration-200"
            onClick={() => {
              import("jspdf").then(({ default: jsPDF }) => {
                const d = new jsPDF();
                d.setFontSize(20);
                d.text("Viva Prep Study Sheet", 14, 22);
                d.setFontSize(10);
                d.setTextColor(128);
                d.text(`${questions.length} questions`, 14, 30);
                let y = 40;
                questions.forEach((q, i) => {
                  if (y > 270) { d.addPage(); y = 20; }
                  d.setFontSize(11);
                  d.setTextColor(0);
                  d.text(`${i + 1}. ${q.question}`, 14, y, { maxWidth: 180 });
                  const qLines = d.splitTextToSize(`${i + 1}. ${q.question}`, 180);
                  y += qLines.length * 5 + 3;
                  if (q.answer) {
                    d.setFontSize(9);
                    d.setTextColor(80);
                    const plain = q.answer.replace(/<[^>]+>/g, "").substring(0, 300);
                    const aLines = d.splitTextToSize(`A: ${plain}`, 175);
                    d.text(aLines, 18, y);
                    y += aLines.length * 4 + 2;
                  }
                  y += 6;
                });
                d.save(`viva-prep-${projectId}.pdf`);
                toast.success("PDF downloaded!");
              });
            }}
          >
            <BookCheck className="h-4 w-4" /> Export PDF
          </Button>
          <Button asChild variant="outline" className="font-body gap-2 h-11 px-5 rounded-xl border-[hsl(210,80%,50%)]/30 hover:border-[hsl(210,80%,50%)]/50 hover:scale-105 active:scale-95 transition-all duration-200">
            <Link to={`/project/${projectId}/resources`}><BookOpen className="h-4 w-4 text-[hsl(210,80%,50%)]" /> Resources</Link>
          </Button>
          <Button asChild variant="outline" className="font-body gap-2 h-11 px-5 rounded-xl border-[hsl(280,60%,50%)]/30 hover:border-[hsl(280,60%,50%)]/50 hover:scale-105 active:scale-95 transition-all duration-200">
            <Link to="/notes"><StickyNote className="h-4 w-4 text-[hsl(280,60%,50%)]" /> Notes</Link>
          </Button>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="space-y-3 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input id="viva-search" placeholder="Search questions, topics, or proctors... (press /)" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 h-12 rounded-xl bg-secondary/20 border-border/30 font-body text-sm focus:border-primary/50 focus:ring-primary/20" />
          </div>
          <div className="flex gap-2 items-center">
            <FilterPanel
              questions={questions} categories={categories} proctors={proctors}
              dynamicFilters={dynamicFilters} schemaFilters={schemaFilters}
              selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory}
              selectedFrequency={selectedFrequency} setSelectedFrequency={setSelectedFrequency}
              selectedProctor={selectedProctor} setSelectedProctor={setSelectedProctor}
              selectedDynamic={selectedDynamic} setSelectedDynamic={setSelectedDynamic}
              schemaFilterValues={schemaFilterValues} setSchemaFilterValues={setSchemaFilterValues}
            />
            <div className="flex gap-1.5">
              {FREQUENCIES.map((f) => (
                <button key={f} onClick={() => setSelectedFrequency(f)} className={cn("px-3.5 py-2 rounded-full text-xs font-semibold font-body transition-all duration-200", selectedFrequency === f ? "bg-primary text-primary-foreground shadow-[0_0_12px_-2px_hsl(263,70%,55%/0.4)]" : "bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary")}>{f}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Row 2: Dropdown filters — hardcoded fallbacks + schema-driven */}
        <div className="flex flex-wrap gap-3">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[160px] h-10 bg-secondary/20 border-border/30 font-body text-sm"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>{categories.map((cat) => <SelectItem key={cat} value={cat} className="font-body">{cat}</SelectItem>)}</SelectContent>
          </Select>

          {proctors.length > 1 && (
            <Select value={selectedProctor} onValueChange={setSelectedProctor}>
              <SelectTrigger className="w-[160px] h-10 bg-secondary/20 border-border/30 font-body text-sm"><SelectValue placeholder="Proctor" /></SelectTrigger>
              <SelectContent>{proctors.map((p) => <SelectItem key={p} value={p} className="font-body">{p}</SelectItem>)}</SelectContent>
            </Select>
          )}

          {tags.length > 1 && (
            <Select value={selectedTag} onValueChange={setSelectedTag}>
              <SelectTrigger className="w-[160px] h-10 bg-secondary/20 border-border/30 font-body text-sm">
                <div className="flex items-center gap-1.5"><Tag className="h-3.5 w-3.5 text-muted-foreground" /><SelectValue placeholder="Tag" /></div>
              </SelectTrigger>
              <SelectContent>{tags.map((t) => <SelectItem key={t} value={t} className="font-body">{t}</SelectItem>)}</SelectContent>
            </Select>
          )}

          {/* Schema-driven inline filters (dropdowns only) */}
          {schemaFilters.filter(sf => sf.filterType === "dropdown" && !["category", "frequency", "proctors", "tags"].includes(sf.fieldKey)).map(sf => (
            <DynamicFilterControl
              key={sf.fieldKey}
              index={sf}
              value={schemaFilterValues[sf.fieldKey] || "All"}
              onChange={v => setSchemaFilterValues({ ...schemaFilterValues, [sf.fieldKey]: v })}
            />
          ))}
        </div>
      </div>

      {/* Active filter chips */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {activeFilters.map((f) => (
            <span key={f.label} className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-body">
              {f.label}
              <button onClick={f.clear} className="hover:text-foreground"><X className="h-3 w-3" /></button>
            </span>
          ))}
          <button onClick={() => { setSelectedFrequency("All"); setSelectedCategory("All"); setSelectedProctor("All"); setSelectedTag("All"); setSelectedDynamic({}); setSchemaFilterValues({}); setSearch(""); }} className="text-xs text-muted-foreground hover:text-foreground font-body">Clear all</button>
        </div>
      )}

      {/* Stats bar */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <p className="text-sm text-muted-foreground font-body tabular-nums">
            Showing <span className="text-foreground font-medium">{filtered.length}</span> of {questions.length}
          </p>
          {studiedCount > 0 && <span className="text-xs text-[hsl(142,71%,45%)] font-body flex items-center gap-1"><Check className="h-3 w-3" /> {studiedCount} studied</span>}
          {questions.length > 0 && (
            <div className="hidden sm:flex items-center gap-1">
              {diffDist.hot > 0 && <span className="h-2 rounded-full badge-hot" style={{ width: Math.max(8, (diffDist.hot / questions.length) * 60) }} />}
              {diffDist.medium > 0 && <span className="h-2 rounded-full badge-med" style={{ width: Math.max(8, (diffDist.medium / questions.length) * 60) }} />}
              {diffDist.low > 0 && <span className="h-2 rounded-full badge-low" style={{ width: Math.max(8, (diffDist.low / questions.length) * 60) }} />}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 bg-secondary/40 rounded-lg p-0.5">
          {SORT_OPTIONS.map((opt) => (
            <button key={opt} onClick={() => setSortBy(opt)} className={cn("px-3 py-1.5 rounded-md text-xs font-body transition-all duration-200", sortBy === opt ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>{opt}</button>
          ))}
        </div>
      </div>

      {/* Questions */}
      {loading ? (
        <div className="space-y-4">{Array.from({ length: 5 }).map((_, i) => <QuestionSkeleton key={i} />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={HelpCircle} title="No questions found" description={questions.length === 0 ? "No questions have been imported for this project yet." : "No questions match your current filters."} />
      ) : (
        <div className="space-y-3">
          {filtered.map((q, i) => (
            <motion.div key={q.id} initial={{ opacity: 0, y: 12, filter: "blur(4px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.5, ease: [0.4, 0, 0.2, 1] }}>
              <QuestionCard q={q} onUpvote={handleUpvote} isUpvoted={upvotedIds.has(q.id)} isStudied={studiedIds.has(q.id)} onToggleStudied={toggleStudied} bookmarks={bookmarks} setBookmarks={setBookmarks} />
            </motion.div>
          ))}
        </div>
      )}

      {/* Community Section */}
      <div className="mt-16">
        <div className="h-px bg-border/30 mb-10" />
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-heading font-bold flex items-center gap-2"><Users className="h-6 w-6 text-primary" /> Community Experiences</h2>
            <p className="text-sm text-muted-foreground mt-1 font-body">Real viva experiences shared by students</p>
          </div>
          <div className="flex gap-3">
            <Input placeholder="Filter by proctor or level..." value={subFilter} onChange={(e) => setSubFilter(e.target.value)} className="w-56 bg-secondary/30 border-border/40 h-9 text-sm font-body" />
            <Button asChild className="bg-primary hover:bg-primary/90 transition-all active:scale-[0.97] font-body">
              <Link to={`/project/${projectId}/submit`}><Plus className="h-4 w-4 mr-1.5" /> Share Experience</Link>
            </Button>
          </div>
        </div>

        {subLoading ? (
          <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}</div>
        ) : filteredSubs.length === 0 ? (
          <EmptyState icon={MessageSquare} title="No experiences shared yet" description="Be the first to share your viva experience!"
            action={<Button asChild variant="outline" className="font-body"><Link to={`/project/${projectId}/submit`}>Share Your Experience</Link></Button>} />
        ) : (
          <div className="space-y-4">
            {filteredSubs.slice(0, visibleSubs).map((s, i) => (
              <motion.div key={s.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.06, 0.5), duration: 0.5 }}>
                <SubmissionCard s={s} />
              </motion.div>
            ))}
            {visibleSubs < filteredSubs.length && (
              <div className="text-center pt-4">
                <Button variant="outline" onClick={() => setVisibleSubs((v) => v + 10)} className="font-body">Load More ({filteredSubs.length - visibleSubs} remaining)</Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating Submit Button */}
      <Link to="/submit-question" className="fixed bottom-6 right-6 z-50 inline-flex items-center gap-2 px-5 py-3 rounded-full bg-primary text-primary-foreground font-semibold font-body text-sm shadow-[0_0_30px_-5px_hsl(263,70%,55%/0.4)] hover:shadow-[0_0_40px_-5px_hsl(263,70%,55%/0.5)] transition-all duration-300 hover:scale-105 active:scale-95">
        <Plus className="h-4 w-4" /> Submit Question
      </Link>

      {/* Scroll to top */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="fixed bottom-6 left-6 z-50 h-10 w-10 rounded-full bg-card border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shadow-lg">
            <ArrowUp className="h-4 w-4" />
          </motion.button>
        )}
      </AnimatePresence>
    </Layout>
  );
};

export default VivaPrep;