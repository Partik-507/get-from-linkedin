import { useState, useEffect, useRef, useCallback } from "react";
import {
  collection, getDocs, addDoc, deleteDoc, doc, serverTimestamp, updateDoc,
  query, where, orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Layout } from "@/components/Layout";
import { GlassCard } from "@/components/GlassCard";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Upload, FileJson, Plus, Trash2, Check, AlertCircle, Loader2,
  FolderPlus, BookOpen, Link2, MessageSquare, ChevronDown, ChevronUp,
  HelpCircle, CheckCircle2, FileText, ClipboardPaste, Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { extractJsonFromText, mapToQuestionSchema } from "@/lib/jsonExtractor";
import { CsvMapper } from "@/components/CsvMapper";

interface Project {
  id: string;
  code: string;
  name: string;
  description: string;
  color: string;
}

type AdminSection = "projects" | "questions" | "resources" | "submissions" | "question_submissions" | "admins" | "notes";

const Admin = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [section, setSection] = useState<AdminSection>("questions");
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    document.title = "Admin — VivaVault";
    if (!isAdmin) {
      toast.error("Access denied");
      navigate("/");
      return;
    }
    const fetch = async () => {
      try {
        const [projSnap, pendingSnap] = await Promise.all([
          getDocs(collection(db, "projects")),
          getDocs(query(collection(db, "question_submissions"), where("status", "==", "pending"))),
        ]);
        setProjects(projSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Project)));
        setPendingCount(pendingSnap.size);
      } catch {
        toast.error("Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [isAdmin, navigate]);

  if (!isAdmin) return null;

  const SECTIONS: { key: AdminSection; label: string; icon: any; badge?: number }[] = [
    { key: "projects", label: "Projects", icon: FolderPlus },
    { key: "questions", label: "Import Questions", icon: FileJson },
    { key: "question_submissions", label: "Question Submissions", icon: HelpCircle, badge: pendingCount },
    { key: "resources", label: "Add Resource", icon: Link2 },
    { key: "notes", label: "Manage Notes", icon: FileText },
    { key: "submissions", label: "Submissions", icon: MessageSquare },
    { key: "admins", label: "Admin Roles", icon: Shield },
  ];

  return (
    <Layout title="Admin Panel">
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-56 shrink-0">
          <nav className="flex lg:flex-col gap-2">
            {SECTIONS.map((s) => (
              <Button
                key={s.key}
                variant={section === s.key ? "secondary" : "ghost"}
                className={cn(
                  "justify-start gap-2 transition-all active:scale-95 relative",
                  section === s.key && "bg-secondary text-foreground"
                )}
                onClick={() => setSection(s.key)}
              >
                <s.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{s.label}</span>
                {s.badge != null && s.badge > 0 && (
                  <Badge className="ml-auto h-5 min-w-[20px] px-1.5 text-[10px] bg-destructive text-destructive-foreground">
                    {s.badge}
                  </Badge>
                )}
              </Button>
            ))}
          </nav>
        </div>

        <div className="flex-1 min-w-0">
          {section === "questions" && <ImportQuestions projects={projects} />}
          {section === "projects" && <ManageProjects projects={projects} setProjects={setProjects} />}
          {section === "resources" && <AddResource projects={projects} />}
          {section === "submissions" && <ManageSubmissions />}
          {section === "question_submissions" && (
            <QuestionSubmissions projects={projects} onCountChange={setPendingCount} />
          )}
          {section === "admins" && <ManageAdmins />}
          {section === "notes" && <ManageNotes />}
        </div>
      </div>
    </Layout>
  );
};

// ============ QUESTION SUBMISSIONS ============
const QuestionSubmissions = ({
  projects,
  onCountChange,
}: {
  projects: Project[];
  onCountChange: (n: number) => void;
}) => {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const snap = await getDocs(
          query(collection(db, "question_submissions"), where("status", "==", "pending"))
        );
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setSubmissions(data);
        onCountChange(data.length);
      } catch {
        toast.error("Failed to load question submissions");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [onCountChange]);

  const handleApprove = async (sub: any) => {
    try {
      // Create real question
      await addDoc(collection(db, "questions"), {
        projectId: sub.projectId || "",
        question: sub.question,
        answer: sub.answer || "",
        category: sub.category || "General",
        frequency: sub.frequency || "medium",
        tip: sub.tip || "",
        projectTip: sub.projectTip || "",
        codeExample: sub.codeExample || "",
        codeLanguage: sub.codeLanguage || "",
        proctors: sub.proctors || [],
        upvotes: 0,
        followUps: [],
        createdAt: serverTimestamp(),
      });
      // Mark as approved
      await updateDoc(doc(db, "question_submissions", sub.id), { status: "approved" });
      setSubmissions((prev) => {
        const next = prev.filter((s) => s.id !== sub.id);
        onCountChange(next.length);
        return next;
      });
      toast.success("Question approved and added to bank!");
    } catch {
      toast.error("Failed to approve question");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this submission permanently?")) return;
    try {
      await deleteDoc(doc(db, "question_submissions", id));
      setSubmissions((prev) => {
        const next = prev.filter((s) => s.id !== id);
        onCountChange(next.length);
        return next;
      });
      toast.success("Submission deleted");
    } catch {
      toast.error("Failed to delete");
    }
  };

  const getProjectCode = (pid: string) => {
    const p = projects.find((pr) => pr.id === pid);
    return p?.code || pid || "—";
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <h2 className="text-2xl font-bold">Question Submissions</h2>
        {submissions.length > 0 && (
          <Badge className="bg-destructive text-destructive-foreground">{submissions.length} pending</Badge>
        )}
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : submissions.length === 0 ? (
        <EmptyState
          icon={HelpCircle}
          title="No pending submissions"
          description="Student-submitted questions will appear here for review."
        />
      ) : (
        <div className="space-y-4">
          {submissions.map((sub) => (
            <GlassCard key={sub.id} hover={false} className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <Badge variant="outline" className="text-xs">{getProjectCode(sub.projectId)}</Badge>
                    <Badge variant="outline" className="text-xs">{sub.category || "General"}</Badge>
                    <Badge variant="outline" className={cn("text-xs capitalize",
                      sub.frequency === "hot" && "badge-hot",
                      sub.frequency === "medium" && "badge-med"
                    )}>
                      {sub.frequency || "medium"}
                    </Badge>
                  </div>
                  <p className="font-medium leading-relaxed">{sub.question}</p>
                  {sub.answer && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{sub.answer}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    by {sub.submittedBy || "Anonymous"} · {sub.createdAt?.toDate?.()?.toLocaleDateString?.() || "—"}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleDelete(sub.id)}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleApprove(sub)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve & Add
                </Button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
};

// ============ IMPORT QUESTIONS ============
const ImportQuestions = ({ projects }: { projects: Project[] }) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [targetProject, setTargetProject] = useState("");
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [showLog, setShowLog] = useState(false);
  const [result, setResult] = useState<{ success: number; skipped: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pasteText, setPasteText] = useState("");
  const [importMode, setImportMode] = useState<"file" | "paste" | "csv">("file");
  const [csvData, setCsvData] = useState<{ headers: string[]; rows: string[][] } | null>(null);

  const processExtracted = (items: Record<string, any>[]) => {
    const mapped = mapToQuestionSchema(items);
    setPreview(mapped.slice(0, 10));
    setTotal(mapped.length);
    setResult(null);
    setLog([]);
    const firstProjectId = items[0]?.projectId;
    if (firstProjectId) {
      const found = projects.find((p) => p.id === firstProjectId || p.code?.toLowerCase() === String(firstProjectId).toLowerCase());
      if (found) setTargetProject(found.id);
    }
  };

  const parseFile = useCallback((f: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (f.name.endsWith(".csv")) {
        const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
        if (lines.length > 1) {
          const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
          const rows = lines.slice(1).map((l) => l.split(",").map((c) => c.trim().replace(/^"|"$/g, "")));
          setCsvData({ headers, rows });
          setImportMode("csv");
          setFile(f);
          return;
        }
      }
      const { items, errors } = extractJsonFromText(text);
      if (items.length === 0) {
        toast.error(errors[0] || "No valid JSON found in file");
        return;
      }
      setFile(f);
      processExtracted(items);
      toast.success(`Found ${items.length} items`);
    };
    reader.readAsText(f);
  }, [projects]);

  const handlePaste = () => {
    if (!pasteText.trim()) { toast.error("Please paste some content first"); return; }
    const { items, errors } = extractJsonFromText(pasteText);
    if (items.length === 0) { toast.error(errors[0] || "No valid JSON found"); return; }
    processExtracted(items);
    toast.success(`Extracted ${items.length} questions`);
  };

  const handleCsvMapped = (mappedData: Record<string, any>[]) => {
    setCsvData(null);
    setImportMode("file");
    processExtracted(mappedData);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) parseFile(f);
  }, [parseFile]);

  const removePreviewItem = (index: number) => {
    setPreview((prev) => {
      const next = prev.filter((_, i) => i !== index);
      setTotal((t) => t - 1);
      return next;
    });
  };

  const handleImport = async () => {
    if (!targetProject) { toast.error("Please select a target project"); return; }
    setImporting(true);
    setProgress(0);
    setLog([]);
    setResult(null);

    let allItems: any[];
    if (pasteText && preview.length > 0 && !file) {
      const { items } = extractJsonFromText(pasteText);
      allItems = mapToQuestionSchema(items);
    } else if (file) {
      const text = await file.text();
      const { items } = extractJsonFromText(text);
      allItems = mapToQuestionSchema(items);
    } else {
      allItems = preview;
    }

    let success = 0;
    let skipped = 0;
    const logs: string[] = [];

    for (let i = 0; i < allItems.length; i++) {
      const item = allItems[i];
      try {
        const question = String(item.question || "").trim();
        if (!question) { logs.push(`#${i + 1}: Skipped — missing question`); skipped++; continue; }
        const KNOWN = new Set(["question","answer","category","frequency","tip","projectTip","codeExample","codeLanguage","proctors","upvotes","followUps","projectId","questionId","tips","tags","subCategory","relatedIds","source","choices","_raw","customFields"]);
        const customFields: Record<string, string> = { ...(item.customFields || {}) };
        Object.keys(item).forEach((k) => { if (!KNOWN.has(k) && typeof item[k] === "string") customFields[k] = item[k]; });

        await addDoc(collection(db, "questions"), {
          projectId: targetProject,
          question,
          answer: String(item.answer || ""),
          category: String(item.category || "General"),
          frequency: String(item.frequency || "medium").toLowerCase(),
          tip: String(item.tip || ""),
          projectTip: String(item.projectTip || ""),
          codeExample: String(item.codeExample || ""),
          codeLanguage: String(item.codeLanguage || ""),
          proctors: Array.isArray(item.proctors) ? item.proctors.map(String) : [],
          upvotes: 0,
          followUps: Array.isArray(item.followUps) ? item.followUps : [],
          tags: Array.isArray(item.tags) ? item.tags : [],
          choices: item.choices || null,
          customFields,
          createdAt: serverTimestamp(),
        });
        success++;
        logs.push(`#${i + 1}: ✓ "${question.slice(0, 50)}..."`);
      } catch (err: any) {
        logs.push(`#${i + 1}: Failed — ${err.message}`);
        skipped++;
      }
      setProgress(Math.round(((i + 1) / allItems.length) * 100));
    }

    setLog(logs);
    setResult({ success, skipped });
    toast.success(`Imported ${success} questions${skipped > 0 ? `, skipped ${skipped}` : ""}`);
    setImporting(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold font-heading">Import Questions</h2>

      {/* Import mode tabs */}
      <div className="flex gap-1 bg-secondary/30 rounded-lg p-1 w-fit">
        {[
          { key: "file" as const, label: "File Upload", icon: Upload },
          { key: "paste" as const, label: "Paste Content", icon: ClipboardPaste },
        ].map((m) => (
          <button
            key={m.key}
            onClick={() => setImportMode(m.key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-body transition-all",
              importMode === m.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <m.icon className="h-4 w-4" />
            {m.label}
          </button>
        ))}
      </div>

      {/* CSV Mapper */}
      {csvData && (
        <GlassCard hover={false}>
          <CsvMapper headers={csvData.headers} rows={csvData.rows} onMap={handleCsvMapped} onCancel={() => { setCsvData(null); setImportMode("file"); }} />
        </GlassCard>
      )}

      {/* Universal Paste Box */}
      {importMode === "paste" && !csvData && (
        <GlassCard hover={false}>
          <Label className="font-heading font-semibold text-base mb-2 block">Universal Paste Box</Label>
          <p className="text-sm text-muted-foreground font-body mb-3">
            Paste anything — JSON, JavaScript, Python, HTML, any code. We'll automatically find and extract the JSON.
          </p>
          <Textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder="Paste anything here — JSON, JavaScript, Python, HTML, any code, any language. We will automatically find and extract the JSON."
            className="bg-secondary/20 border-border/30 font-mono text-sm min-h-[200px] resize-y"
            rows={10}
          />
          <Button onClick={handlePaste} className="mt-3 font-body gap-2" disabled={!pasteText.trim()}>
            <FileText className="h-4 w-4" /> Extract & Preview
          </Button>
        </GlassCard>
      )}

      {/* File Upload */}
      {importMode === "file" && !csvData && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={cn(
            "border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors duration-200",
            "border-border hover:border-primary/50 hover:bg-primary/5"
          )}
        >
          <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-medium mb-1 font-heading">Drop any file here</p>
          <p className="text-sm text-muted-foreground font-body">Supports .json, .js, .py, .txt, .csv, and any text file</p>
          <input ref={fileRef} type="file" accept=".json,.js,.ts,.py,.txt,.csv,.html,.css,.java,.xml,.yaml,.yml,.md" className="hidden" onChange={(e) => e.target.files?.[0] && parseFile(e.target.files[0])} />
        </div>
      )}

      {/* Preview Table */}
      {preview.length > 0 && !csvData && (
        <GlassCard hover={false}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold font-heading">Preview ({total} questions found)</h3>
            {file && <Badge variant="outline" className="font-body">{file.name}</Badge>}
          </div>
          <div className="overflow-x-auto mb-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="min-w-[300px]">Question</TableHead>
                  <TableHead>Difficulty</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.map((q, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                    <TableCell><span className="text-xs bg-secondary px-2 py-0.5 rounded font-body">{q.category || "General"}</span></TableCell>
                    <TableCell className="text-sm font-body">{String(q.question || "—").slice(0, 80)}</TableCell>
                    <TableCell><span className="text-xs capitalize font-body">{q.frequency || "medium"}</span></TableCell>
                    <TableCell>
                      <button onClick={() => removePreviewItem(i)} className="text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {total > 10 && <p className="text-xs text-muted-foreground mb-4 font-body">...and {total - 10} more</p>}
          <div className="flex items-end gap-4">
            <div className="flex-1 space-y-2">
              <Label className="font-body">Import into project</Label>
              <Select value={targetProject} onValueChange={setTargetProject}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Select project" /></SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.code} — {p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleImport} disabled={importing || !targetProject} className="h-10 bg-gradient-to-r from-primary to-[hsl(263,70%,55%)] hover:opacity-90 active:scale-[0.97] font-body">
              {importing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              Import All ({total})
            </Button>
          </div>
          {importing && (
            <div className="mt-4">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1 tabular-nums font-body">{progress}%</p>
            </div>
          )}
          {result && (
            <div className="mt-4 p-4 rounded-lg bg-[hsl(142,71%,45%)]/10 border border-[hsl(142,71%,45%)]/20">
              <div className="flex items-center gap-2 text-[hsl(142,71%,45%)] mb-2">
                <Check className="h-4 w-4" />
                <span className="font-semibold font-heading">Import Complete</span>
              </div>
              <p className="text-sm text-muted-foreground font-body">{result.success} imported{result.skipped > 0 && `, ${result.skipped} skipped`}</p>
            </div>
          )}
          {log.length > 0 && (
            <div className="mt-4">
              <button onClick={() => setShowLog(!showLog)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors font-body">
                {showLog ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                {showLog ? "Hide" : "Show"} import log
              </button>
              {showLog && (
                <div className="mt-2 max-h-64 overflow-y-auto rounded-lg bg-secondary/50 p-3 text-xs font-mono space-y-0.5">
                  {log.map((l, i) => (
                    <p key={i} className={cn(l.includes("Skipped") || l.includes("Failed") ? "text-destructive" : "text-muted-foreground")}>{l}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </GlassCard>
      )}
    </div>
  );
};

// ============ MANAGE PROJECTS ============
const ManageProjects = ({
  projects,
  setProjects,
}: {
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
}) => {
  const [form, setForm] = useState({ code: "", name: "", description: "" });
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!form.code || !form.name) {
      toast.error("Code and name are required");
      return;
    }
    setAdding(true);
    try {
      const ref = await addDoc(collection(db, "projects"), {
        ...form,
        color: "",
        createdAt: serverTimestamp(),
      });
      setProjects((prev) => [...prev, { id: ref.id, ...form, color: "" }]);
      setForm({ code: "", name: "", description: "" });
      toast.success("Project added!");
    } catch {
      toast.error("Failed to add project");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this project? This won't delete associated questions/submissions.")) return;
    try {
      await deleteDoc(doc(db, "projects", id));
      setProjects((prev) => prev.filter((p) => p.id !== id));
      toast.success("Project deleted");
    } catch {
      toast.error("Failed to delete project");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold">Manage Projects</h2>

      <GlassCard hover={false}>
        <h3 className="font-semibold mb-4">Add New Project</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div className="space-y-2">
            <Label>Project Code</Label>
            <Input placeholder="e.g. MAD1" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} className="bg-secondary border-border" />
          </div>
          <div className="space-y-2">
            <Label>Project Name</Label>
            <Input placeholder="e.g. Modern Application Development I" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="bg-secondary border-border" />
          </div>
        </div>
        <div className="space-y-2 mb-4">
          <Label>Description</Label>
          <Textarea placeholder="Short description..." value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="bg-secondary border-border resize-none" rows={2} />
        </div>
        <Button onClick={handleAdd} disabled={adding} className="active:scale-[0.97]">
          {adding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
          Add Project
        </Button>
      </GlassCard>

      {projects.length > 0 && (
        <GlassCard hover={false}>
          <h3 className="font-semibold mb-4">Existing Projects</h3>
          <div className="space-y-2">
            {projects.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                <div>
                  <span className="font-semibold mr-2">{p.code}</span>
                  <span className="text-sm text-muted-foreground">{p.name}</span>
                </div>
                <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDelete(p.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
};

// ============ ADD RESOURCE ============
const AddResource = ({ projects }: { projects: Project[] }) => {
  const [form, setForm] = useState({
    projectId: "",
    title: "",
    url: "",
    type: "",
    category: "",
    description: "",
  });
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!form.projectId || !form.title || !form.url) {
      toast.error("Project, title, and URL are required");
      return;
    }
    setAdding(true);
    try {
      await addDoc(collection(db, "resources"), { ...form, createdAt: serverTimestamp() });
      setForm({ projectId: form.projectId, title: "", url: "", type: "", category: "", description: "" });
      toast.success("Resource added!");
    } catch {
      toast.error("Failed to add resource");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold">Add Resource</h2>
      <GlassCard hover={false}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div className="space-y-2">
            <Label>Project</Label>
            <Select value={form.projectId} onValueChange={(v) => setForm((f) => ({ ...f, projectId: v }))}>
              <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Select project" /></SelectTrigger>
              <SelectContent>
                {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.code}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
              <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>
                {["youtube", "github", "pdf", "drive", "docs", "other"].map((t) => (
                  <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Title</Label>
            <Input placeholder="Resource title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="bg-secondary border-border" />
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Input placeholder="e.g. Guidelines, Milestones" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className="bg-secondary border-border" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>URL</Label>
            <Input placeholder="https://..." value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} className="bg-secondary border-border" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Description</Label>
            <Textarea placeholder="Brief description..." value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="bg-secondary border-border resize-none" rows={2} />
          </div>
        </div>
        <Button onClick={handleAdd} disabled={adding} className="active:scale-[0.97]">
          {adding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
          Add Resource
        </Button>
      </GlassCard>
    </div>
  );
};

// ============ MANAGE SUBMISSIONS ============
const ManageSubmissions = () => {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const snap = await getDocs(collection(db, "submissions"));
        setSubmissions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch {
        toast.error("Failed to load submissions");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this submission?")) return;
    try {
      await deleteDoc(doc(db, "submissions", id));
      setSubmissions((prev) => prev.filter((s) => s.id !== id));
      toast.success("Submission deleted");
    } catch {
      toast.error("Failed to delete");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold">Submissions</h2>
      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : submissions.length === 0 ? (
        <EmptyState icon={MessageSquare} title="No submissions" description="Student submissions will appear here" />
      ) : (
        <GlassCard hover={false} className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Proctor</TableHead>
                <TableHead>Level</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {submissions.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.isAnonymous ? "Anonymous" : s.name || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{s.projectId}</TableCell>
                  <TableCell>{s.proctorId || "—"}</TableCell>
                  <TableCell>{s.level || "—"}</TableCell>
                  <TableCell>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDelete(s.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </GlassCard>
      )}
    </div>
  );
};

export default Admin;
