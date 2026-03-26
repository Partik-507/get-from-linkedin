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

type AdminSection = "projects" | "questions" | "resources" | "submissions" | "question_submissions";

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
    { key: "submissions", label: "Submissions", icon: MessageSquare },
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

  const parseFile = useCallback((f: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        let data = JSON.parse(e.target?.result as string);
        if (!Array.isArray(data)) {
          data = data.questions || data.data || data.items || [];
        }
        if (!Array.isArray(data)) throw new Error("Could not find questions array in JSON");
        setPreview(data.slice(0, 5));
        setTotal(data.length);
        setFile(f);
        setResult(null);
        setLog([]);

        const firstProjectId = data[0]?.projectId;
        if (firstProjectId) {
          const found = projects.find((p) => p.id === firstProjectId || p.code?.toLowerCase() === firstProjectId.toLowerCase());
          if (found) setTargetProject(found.id);
        }
      } catch (err: any) {
        toast.error(`Invalid JSON: ${err.message}`);
      }
    };
    reader.readAsText(f);
  }, [projects]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) parseFile(f);
  }, [parseFile]);

  const handleImport = async () => {
    if (!targetProject) {
      toast.error("Please select a target project");
      return;
    }
    setImporting(true);
    setProgress(0);
    setLog([]);
    setResult(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        let data = JSON.parse(e.target?.result as string);
        if (!Array.isArray(data)) data = data.questions || data.data || data.items || [];

        let success = 0;
        let skipped = 0;
        const logs: string[] = [];

        for (let i = 0; i < data.length; i++) {
          const item = data[i];
          try {
            const question = String(item.question || item.q || "").trim();
            const answer = String(item.answer || item.a || "").trim();

            if (!question) {
              logs.push(`#${i + 1}: Skipped — missing question text`);
              skipped++;
              continue;
            }

            // Extract known fields, everything else goes into customFields
            const KNOWN_KEYS = new Set([
              "question", "q", "answer", "a", "category", "cat", "frequency", "freq",
              "tip", "interviewTip", "projectTip", "codeExample", "code", "codeLanguage", "lang",
              "proctors", "upvotes", "followUps", "projectId",
            ]);
            const customFields: Record<string, string> = {};
            Object.keys(item).forEach((k) => {
              if (!KNOWN_KEYS.has(k) && typeof item[k] === "string") {
                customFields[k] = item[k];
              }
            });

            await addDoc(collection(db, "questions"), {
              projectId: targetProject,
              question,
              answer,
              category: String(item.category || item.cat || "General"),
              frequency: String(item.frequency || item.freq || "medium").toLowerCase(),
              tip: String(item.tip || item.interviewTip || ""),
              projectTip: String(item.projectTip || ""),
              codeExample: String(item.codeExample || item.code || ""),
              codeLanguage: String(item.codeLanguage || item.lang || ""),
              proctors: Array.isArray(item.proctors) ? item.proctors.map(String) : [],
              upvotes: 0,
              followUps: Array.isArray(item.followUps) ? item.followUps : [],
              customFields,
              createdAt: serverTimestamp(),
            });

            success++;
            logs.push(`#${i + 1}: ✓ "${question.slice(0, 50)}..."`);
          } catch (err: any) {
            logs.push(`#${i + 1}: Failed — ${err.message}`);
            skipped++;
          }

          setProgress(Math.round(((i + 1) / data.length) * 100));
        }

        setLog(logs);
        setResult({ success, skipped });
        toast.success(`Imported ${success} questions${skipped > 0 ? `, skipped ${skipped}` : ""}`);
      } catch (err: any) {
        toast.error(`Import failed: ${err.message}`);
      } finally {
        setImporting(false);
      }
    };
    reader.readAsText(file!);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold">Import Questions</h2>

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
        <p className="text-lg font-medium mb-1">Drop your JSON file here</p>
        <p className="text-sm text-muted-foreground">or click to browse</p>
        <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={(e) => e.target.files?.[0] && parseFile(e.target.files[0])} />
      </div>

      {preview.length > 0 && (
        <GlassCard hover={false}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Preview ({total} questions found)</h3>
            <Badge variant="outline">{file?.name}</Badge>
          </div>

          <div className="overflow-x-auto mb-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="min-w-[300px]">Question</TableHead>
                  <TableHead>Frequency</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.map((q, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                    <TableCell><span className="text-xs bg-secondary px-2 py-0.5 rounded">{q.category || "General"}</span></TableCell>
                    <TableCell className="text-sm">{String(q.question || q.q || "—").slice(0, 80)}</TableCell>
                    <TableCell><span className="text-xs capitalize">{q.frequency || "medium"}</span></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {total > 5 && (
            <p className="text-xs text-muted-foreground mb-4">...and {total - 5} more</p>
          )}

          <div className="flex items-end gap-4">
            <div className="flex-1 space-y-2">
              <Label>Import into project</Label>
              <Select value={targetProject} onValueChange={setTargetProject}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.code} — {p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleImport}
              disabled={importing || !targetProject}
              className="h-10 bg-gradient-to-r from-primary to-[hsl(263,70%,55%)] hover:opacity-90 active:scale-[0.97]"
            >
              {importing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              Import All ({total})
            </Button>
          </div>

          {importing && (
            <div className="mt-4">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1 tabular-nums">{progress}%</p>
            </div>
          )}

          {result && (
            <div className="mt-4 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <div className="flex items-center gap-2 text-emerald-500 mb-2">
                <Check className="h-4 w-4" />
                <span className="font-semibold">Import Complete</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {result.success} questions imported successfully
                {result.skipped > 0 && `, ${result.skipped} skipped`}
              </p>
            </div>
          )}

          {log.length > 0 && (
            <div className="mt-4">
              <button
                onClick={() => setShowLog(!showLog)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {showLog ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                {showLog ? "Hide" : "Show"} import log
              </button>
              {showLog && (
                <div className="mt-2 max-h-64 overflow-y-auto rounded-lg bg-secondary/50 p-3 text-xs font-mono space-y-0.5">
                  {log.map((l, i) => (
                    <p key={i} className={cn(l.includes("Skipped") || l.includes("Failed") ? "text-destructive" : "text-muted-foreground")}>
                      {l}
                    </p>
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
