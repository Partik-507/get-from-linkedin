import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Upload, FileJson, Plus, Trash2, Check, AlertCircle, Loader2,
  FolderPlus, BookOpen, Link2, MessageSquare, ChevronDown, ChevronUp,
  HelpCircle, CheckCircle2, FileText, ClipboardPaste, Pencil, Shield,
  StickyNote, BarChart3, GitBranch, Bell, Clock, Database, Wand2,
  Save, Download, Eye, RefreshCw, Lock, Unlock, Globe, Crown,
  Users, Settings, Activity, Hash, Focus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { FocusThemeEditor } from "@/components/admin/FocusThemeEditor";
import { extractJsonFromText, mapToQuestionSchema } from "@/lib/jsonExtractor";
import { CsvMapper } from "@/components/CsvMapper";
import {
  detectSchema, autoSuggestMappings, normalizeRecords, deduplicateRecords,
  generateFilterIndexes, generateFileHash, chunkArray,
  type DetectedField, type FieldMapping, type FieldRole, type FilterType,
} from "@/lib/schemaEngine";
import {
  getBranches, getLevels, createBranch, updateBranch, deleteBranch,
  createLevel, updateLevel, deleteLevel,
  getCourses, createCourse, updateCourse, deleteCourse,
  saveSchemaTemplate, getSchemaTemplates, deleteSchemaTemplate,
  saveFilterIndexes, checkFileHashExists, saveImportLog,
  batchWriteQuestions, logAdminAction, getAuditLogs,
  sendNotification, getNotifications, deleteNotification,
  type Branch, type Level, type Course, type AuditLogEntry,
} from "@/lib/firestoreSync";

interface Project {
  id: string;
  code: string;
  name: string;
  description: string;
  color: string;
}

type AdminSection =
  | "overview" | "branches" | "courses" | "schema_import"
  | "questions" | "question_submissions" | "resources" | "notes"
  | "notifications" | "submissions" | "audit" | "admins" | "focus_mode";

const Admin = () => {
  const { isAdmin, user } = useAuth();
  const navigate = useNavigate();
  const [section, setSection] = useState<AdminSection>("overview");
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
    { key: "overview", label: "Overview", icon: BarChart3 },
    { key: "branches", label: "Branches & Levels", icon: GitBranch },
    { key: "courses", label: "Courses & Projects", icon: BookOpen },
    { key: "schema_import", label: "Schema & Import", icon: Database },
    { key: "questions", label: "Import Questions", icon: FileJson },
    { key: "question_submissions", label: "Question Submissions", icon: HelpCircle, badge: pendingCount },
    { key: "resources", label: "Add Resource", icon: Link2 },
    { key: "notes", label: "Manage Notes", icon: FileText },
    { key: "focus_mode", label: "Focus Mode", icon: Focus },
    { key: "notifications", label: "Notifications", icon: Bell },
    { key: "submissions", label: "Submissions", icon: MessageSquare },
    { key: "audit", label: "Audit Log", icon: Clock },
    { key: "admins", label: "Admin Roles", icon: Shield },
  ];

  return (
    <Layout title="Admin Panel">
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-56 shrink-0">
          <nav className="flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
            {SECTIONS.map((s) => (
              <Button
                key={s.key}
                variant={section === s.key ? "secondary" : "ghost"}
                className={cn(
                  "justify-start gap-2 transition-all active:scale-95 relative text-xs lg:text-sm whitespace-nowrap",
                  section === s.key && "bg-secondary text-foreground"
                )}
                onClick={() => setSection(s.key)}
              >
                <s.icon className="h-4 w-4 shrink-0" />
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
          {section === "overview" && <AdminOverview projects={projects} pendingCount={pendingCount} />}
          {section === "branches" && <BranchLevelCrud />}
          {section === "courses" && <CourseCrud projects={projects} setProjects={setProjects} />}
          {section === "schema_import" && <SchemaImport projects={projects} userId={user?.uid || ""} userEmail={user?.email || ""} />}
          {section === "questions" && <ImportQuestions projects={projects} />}
          {section === "question_submissions" && (
            <QuestionSubmissions projects={projects} onCountChange={setPendingCount} />
          )}
          {section === "resources" && <AddResource projects={projects} />}
          {section === "notes" && <ManageNotes />}
          {section === "focus_mode" && <FocusThemeEditor />}
          {section === "notifications" && <NotificationsComposer userId={user?.uid || ""} userEmail={user?.email || ""} />}
          {section === "submissions" && <ManageSubmissions />}
          {section === "audit" && <AuditLogViewer />}
          {section === "admins" && <ManageAdmins />}
        </div>
      </div>
    </Layout>
  );
};

// ============ OVERVIEW DASHBOARD ============
const AdminOverview = ({ projects, pendingCount }: { projects: Project[]; pendingCount: number }) => {
  const [stats, setStats] = useState({ questions: 0, users: 0, resources: 0 });
  useEffect(() => {
    const fetch = async () => {
      try {
        const [qSnap, uSnap, rSnap] = await Promise.all([
          getDocs(collection(db, "questions")),
          getDocs(collection(db, "users")),
          getDocs(collection(db, "resources")),
        ]);
        setStats({ questions: qSnap.size, users: uSnap.size, resources: rSnap.size });
      } catch {}
    };
    fetch();
  }, []);

  const cards = [
    { label: "Courses/Projects", value: projects.length, icon: BookOpen, color: "text-primary" },
    { label: "Total Questions", value: stats.questions, icon: HelpCircle, color: "text-[hsl(var(--success))]" },
    { label: "Pending Reviews", value: pendingCount, icon: Clock, color: "text-[hsl(var(--warning))]" },
    { label: "Registered Users", value: stats.users, icon: Users, color: "text-[hsl(280,60%,50%)]" },
    { label: "Resources", value: stats.resources, icon: Link2, color: "text-[hsl(210,80%,50%)]" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold font-heading">Admin Overview</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {cards.map((c, i) => (
          <GlassCard key={i} hover={false} className="text-center py-5">
            <c.icon className={cn("h-6 w-6 mx-auto mb-2", c.color)} />
            <p className="text-2xl font-heading font-bold tabular-nums">{c.value}</p>
            <p className="text-[11px] text-muted-foreground font-body mt-1">{c.label}</p>
          </GlassCard>
        ))}
      </div>
    </div>
  );
};

// ============ BRANCH & LEVEL CRUD ============
const BranchLevelCrud = () => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [loading, setLoading] = useState(true);
  const [branchForm, setBranchForm] = useState({ name: "", shortName: "", color: "#6366f1" });
  const [levelForm, setLevelForm] = useState({ name: "", branchId: "", order: 0 });
  const [editingBranch, setEditingBranch] = useState<string | null>(null);
  const [editingLevel, setEditingLevel] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      const [b, l] = await Promise.all([getBranches(), getLevels()]);
      setBranches(b);
      setLevels(l);
      setLoading(false);
    };
    fetch();
  }, []);

  const handleAddBranch = async () => {
    if (!branchForm.name) { toast.error("Name required"); return; }
    try {
      if (editingBranch) {
        await updateBranch(editingBranch, branchForm);
        setBranches(prev => prev.map(b => b.id === editingBranch ? { ...b, ...branchForm } : b));
        setEditingBranch(null);
        toast.success("Branch updated");
      } else {
        const id = await createBranch(branchForm);
        setBranches(prev => [...prev, { id, ...branchForm }]);
        toast.success("Branch created");
      }
      setBranchForm({ name: "", shortName: "", color: "#6366f1" });
    } catch { toast.error("Failed"); }
  };

  const handleAddLevel = async () => {
    if (!levelForm.name || !levelForm.branchId) { toast.error("Name and branch required"); return; }
    try {
      if (editingLevel) {
        await updateLevel(editingLevel, levelForm);
        setLevels(prev => prev.map(l => l.id === editingLevel ? { ...l, ...levelForm } : l));
        setEditingLevel(null);
        toast.success("Level updated");
      } else {
        const id = await createLevel(levelForm);
        setLevels(prev => [...prev, { id, ...levelForm }]);
        toast.success("Level created");
      }
      setLevelForm({ name: "", branchId: "", order: levels.length });
    } catch { toast.error("Failed"); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold font-heading">Branches & Levels</h2>

      {/* Branches */}
      <GlassCard hover={false}>
        <h3 className="font-semibold mb-4 font-heading">
          {editingBranch ? "Edit Branch" : "Add Branch"}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div className="space-y-2">
            <Label className="font-body">Name</Label>
            <Input value={branchForm.name} onChange={e => setBranchForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g., Data Science" className="bg-secondary/30 border-border/40" />
          </div>
          <div className="space-y-2">
            <Label className="font-body">Short Name</Label>
            <Input value={branchForm.shortName} onChange={e => setBranchForm(f => ({ ...f, shortName: e.target.value }))} placeholder="e.g., DS" className="bg-secondary/30 border-border/40" />
          </div>
          <div className="space-y-2">
            <Label className="font-body">Color</Label>
            <div className="flex gap-2 items-center">
              <input type="color" value={branchForm.color} onChange={e => setBranchForm(f => ({ ...f, color: e.target.value }))} className="h-9 w-12 rounded border border-border cursor-pointer" />
              <span className="text-xs text-muted-foreground font-body">{branchForm.color}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleAddBranch} className="font-body gap-2">
            {editingBranch ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {editingBranch ? "Update" : "Add Branch"}
          </Button>
          {editingBranch && (
            <Button variant="ghost" onClick={() => { setEditingBranch(null); setBranchForm({ name: "", shortName: "", color: "#6366f1" }); }} className="font-body">Cancel</Button>
          )}
        </div>
      </GlassCard>

      {branches.length > 0 && (
        <GlassCard hover={false}>
          <h3 className="font-semibold mb-3 font-heading">Existing Branches</h3>
          <div className="space-y-2">
            {branches.map(b => (
              <div key={b.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                <div className="flex items-center gap-3">
                  <span className="h-4 w-4 rounded-full" style={{ backgroundColor: b.color }} />
                  <span className="font-medium font-body">{b.name}</span>
                  <Badge variant="outline" className="text-xs font-body">{b.shortName}</Badge>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => { setEditingBranch(b.id); setBranchForm({ name: b.name, shortName: b.shortName, color: b.color }); }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="text-destructive" onClick={async () => {
                    if (!confirm("Delete branch?")) return;
                    await deleteBranch(b.id);
                    setBranches(prev => prev.filter(x => x.id !== b.id));
                    toast.success("Branch deleted");
                  }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Levels */}
      <GlassCard hover={false}>
        <h3 className="font-semibold mb-4 font-heading">{editingLevel ? "Edit Level" : "Add Level"}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div className="space-y-2">
            <Label className="font-body">Name</Label>
            <Input value={levelForm.name} onChange={e => setLevelForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g., Foundation" className="bg-secondary/30 border-border/40" />
          </div>
          <div className="space-y-2">
            <Label className="font-body">Branch</Label>
            <Select value={levelForm.branchId} onValueChange={v => setLevelForm(f => ({ ...f, branchId: v }))}>
              <SelectTrigger className="bg-secondary/30 border-border/40"><SelectValue placeholder="Select branch" /></SelectTrigger>
              <SelectContent>
                {branches.map(b => <SelectItem key={b.id} value={b.id} className="font-body">{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="font-body">Order</Label>
            <Input type="number" value={levelForm.order} onChange={e => setLevelForm(f => ({ ...f, order: parseInt(e.target.value) || 0 }))} className="bg-secondary/30 border-border/40" />
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleAddLevel} className="font-body gap-2">
            {editingLevel ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {editingLevel ? "Update" : "Add Level"}
          </Button>
          {editingLevel && (
            <Button variant="ghost" onClick={() => { setEditingLevel(null); setLevelForm({ name: "", branchId: "", order: levels.length }); }} className="font-body">Cancel</Button>
          )}
        </div>
      </GlassCard>

      {levels.length > 0 && (
        <GlassCard hover={false}>
          <h3 className="font-semibold mb-3 font-heading">Existing Levels</h3>
          <div className="space-y-2">
            {levels.map(l => {
              const branch = branches.find(b => b.id === l.branchId);
              return (
                <div key={l.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                  <div className="flex items-center gap-3">
                    <span className="font-medium font-body">{l.name}</span>
                    {branch && <Badge variant="outline" className="text-xs font-body">{branch.shortName}</Badge>}
                    <span className="text-xs text-muted-foreground font-body">Order: {l.order}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => { setEditingLevel(l.id); setLevelForm({ name: l.name, branchId: l.branchId, order: l.order }); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={async () => {
                      if (!confirm("Delete level?")) return;
                      await deleteLevel(l.id);
                      setLevels(prev => prev.filter(x => x.id !== l.id));
                      toast.success("Level deleted");
                    }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      )}
    </div>
  );
};

// ============ COURSE CRUD (Enhanced) ============
const CourseCrud = ({ projects, setProjects }: { projects: Project[]; setProjects: React.Dispatch<React.SetStateAction<Project[]>> }) => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [form, setForm] = useState({
    code: "", name: "", description: "", type: "course" as "course" | "project",
    branchId: "", levelId: "", accessType: "public" as "public" | "private" | "premium",
    status: "active" as "active" | "draft" | "archived", iconColor: "#6366f1",
    loginRequired: false, subscriptionRequired: false,
  });
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      const [b, l] = await Promise.all([getBranches(), getLevels()]);
      setBranches(b);
      setLevels(l);
    };
    fetch();
  }, []);

  const filteredLevels = levels.filter(l => !form.branchId || l.branchId === form.branchId);

  const handleSubmit = async () => {
    if (!form.code || !form.name) { toast.error("Code and name required"); return; }
    setAdding(true);
    try {
      const data: any = {
        code: form.code, name: form.name, description: form.description,
        type: form.type, branchId: form.branchId, levelId: form.levelId,
        accessType: form.accessType, status: form.status, iconColor: form.iconColor,
        color: form.iconColor,
        unlockConditions: { loginRequired: form.loginRequired, subscriptionRequired: form.subscriptionRequired },
      };
      if (editingId) {
        await updateCourse(editingId, data);
        setProjects(prev => prev.map(p => p.id === editingId ? { ...p, ...data } : p));
        setEditingId(null);
        toast.success("Course updated");
      } else {
        const id = await createCourse(data);
        setProjects(prev => [...prev, { id, ...data }]);
        toast.success("Course created");
      }
      setForm({ code: "", name: "", description: "", type: "course", branchId: "", levelId: "", accessType: "public", status: "active", iconColor: "#6366f1", loginRequired: false, subscriptionRequired: false });
    } catch { toast.error("Failed"); }
    finally { setAdding(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this course?")) return;
    await deleteCourse(id);
    setProjects(prev => prev.filter(p => p.id !== id));
    toast.success("Course deleted");
  };

  const accessIcon = (t: string) => t === "public" ? <Globe className="h-3 w-3" /> : t === "private" ? <Lock className="h-3 w-3" /> : <Crown className="h-3 w-3" />;

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold font-heading">Courses & Projects</h2>
      <GlassCard hover={false}>
        <h3 className="font-semibold mb-4 font-heading">{editingId ? "Edit Course" : "Add Course/Project"}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
          <div className="space-y-2">
            <Label className="font-body">Code</Label>
            <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="MAD1" className="bg-secondary/30 border-border/40" />
          </div>
          <div className="space-y-2">
            <Label className="font-body">Name</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Modern App Dev I" className="bg-secondary/30 border-border/40" />
          </div>
          <div className="space-y-2">
            <Label className="font-body">Type</Label>
            <Select value={form.type} onValueChange={(v: any) => setForm(f => ({ ...f, type: v }))}>
              <SelectTrigger className="bg-secondary/30 border-border/40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="course">Course</SelectItem>
                <SelectItem value="project">Project</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="font-body">Branch</Label>
            <Select value={form.branchId || undefined} onValueChange={v => setForm(f => ({ ...f, branchId: v === "none" ? "" : v, levelId: "" }))}>
              <SelectTrigger className="bg-secondary/30 border-border/40"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="font-body">Level</Label>
            <Select value={form.levelId || undefined} onValueChange={v => setForm(f => ({ ...f, levelId: v === "none" ? "" : v }))}>
              <SelectTrigger className="bg-secondary/30 border-border/40"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {filteredLevels.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="font-body">Access Type</Label>
            <Select value={form.accessType} onValueChange={(v: any) => setForm(f => ({ ...f, accessType: v }))}>
              <SelectTrigger className="bg-secondary/30 border-border/40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="public"><span className="flex items-center gap-2"><Globe className="h-3 w-3" /> Public</span></SelectItem>
                <SelectItem value="private"><span className="flex items-center gap-2"><Lock className="h-3 w-3" /> Private</span></SelectItem>
                <SelectItem value="premium"><span className="flex items-center gap-2"><Crown className="h-3 w-3" /> Premium</span></SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="font-body">Status</Label>
            <Select value={form.status} onValueChange={(v: any) => setForm(f => ({ ...f, status: v }))}>
              <SelectTrigger className="bg-secondary/30 border-border/40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="font-body">Icon Color</Label>
            <div className="flex gap-2 items-center">
              <input type="color" value={form.iconColor} onChange={e => setForm(f => ({ ...f, iconColor: e.target.value }))} className="h-9 w-12 rounded border border-border cursor-pointer" />
              <span className="text-xs text-muted-foreground font-body">{form.iconColor}</span>
            </div>
          </div>
          <div className="space-y-2 sm:col-span-2 lg:col-span-3">
            <Label className="font-body">Description</Label>
            <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description..." className="bg-secondary/30 border-border/40 resize-none" rows={2} />
          </div>
          {form.accessType === "premium" && (
            <div className="sm:col-span-2 lg:col-span-3 flex gap-6 p-3 rounded-lg bg-accent/30">
              <label className="flex items-center gap-2 text-sm font-body cursor-pointer">
                <Switch checked={form.loginRequired} onCheckedChange={v => setForm(f => ({ ...f, loginRequired: v }))} />
                Login Required
              </label>
              <label className="flex items-center gap-2 text-sm font-body cursor-pointer">
                <Switch checked={form.subscriptionRequired} onCheckedChange={v => setForm(f => ({ ...f, subscriptionRequired: v }))} />
                Subscription Required
              </label>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSubmit} disabled={adding} className="font-body gap-2">
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : editingId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {editingId ? "Update Course" : "Add Course"}
          </Button>
          {editingId && (
            <Button variant="ghost" onClick={() => { setEditingId(null); setForm({ code: "", name: "", description: "", type: "course", branchId: "", levelId: "", accessType: "public", status: "active", iconColor: "#6366f1", loginRequired: false, subscriptionRequired: false }); }} className="font-body">Cancel</Button>
          )}
        </div>
      </GlassCard>

      {projects.length > 0 && (
        <GlassCard hover={false}>
          <h3 className="font-semibold mb-3 font-heading">Existing ({projects.length})</h3>
          <div className="space-y-2">
            {projects.map(p => {
              const pa = p as any;
              return (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: pa.iconColor || p.color || "#6366f1" }} />
                    <span className="font-semibold font-body">{pa.code || p.code}</span>
                    <span className="text-sm text-muted-foreground font-body truncate">{p.name}</span>
                    {pa.accessType && (
                      <Badge variant="outline" className="text-[10px] font-body gap-1 shrink-0">
                        {accessIcon(pa.accessType)} {pa.accessType}
                      </Badge>
                    )}
                    {pa.status && pa.status !== "active" && (
                      <Badge variant="outline" className="text-[10px] font-body capitalize shrink-0">{pa.status}</Badge>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" onClick={() => {
                      setEditingId(p.id);
                      setForm({
                        code: pa.code || p.code, name: p.name, description: p.description || "",
                        type: pa.type || "course", branchId: pa.branchId || "", levelId: pa.levelId || "",
                        accessType: pa.accessType || "public", status: pa.status || "active",
                        iconColor: pa.iconColor || p.color || "#6366f1",
                        loginRequired: pa.unlockConditions?.loginRequired || false,
                        subscriptionRequired: pa.unlockConditions?.subscriptionRequired || false,
                      });
                    }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDelete(p.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      )}
    </div>
  );
};

// ============ SCHEMA & IMPORT ============
const SchemaImport = ({ projects, userId, userEmail }: { projects: Project[]; userId: string; userEmail: string }) => {
  const [step, setStep] = useState(1);
  const [rawText, setRawText] = useState("");
  const [parsedRecords, setParsedRecords] = useState<Record<string, any>[]>([]);
  const [detectedFields, setDetectedFields] = useState<DetectedField[]>([]);
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [templateName, setTemplateName] = useState("");
  const [targetProject, setTargetProject] = useState("");
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileHash, setFileHash] = useState("");
  const [hashWarning, setHashWarning] = useState("");
  const [dedupResult, setDedupResult] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { getSchemaTemplates().then(setTemplates); }, []);

  // Step 1: Parse JSON
  const handleParse = () => {
    if (!rawText.trim()) { toast.error("Paste JSON data first"); return; }
    const { items, errors } = extractJsonFromText(rawText);
    if (items.length === 0) { toast.error(errors[0] || "No valid JSON found"); return; }
    setParsedRecords(items);
    const hash = generateFileHash(rawText);
    setFileHash(hash);
    checkFileHashExists(hash).then(r => {
      if (r.exists) setHashWarning(`This data was already imported on ${r.importedAt}`);
      else setHashWarning("");
    });
    // Detect schema
    const fields = detectSchema(items);
    setDetectedFields(fields);
    const suggested = autoSuggestMappings(fields);
    setMappings(suggested);
    setStep(2);
    toast.success(`Parsed ${items.length} records, detected ${fields.length} fields`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setRawText(ev.target?.result as string);
    };
    reader.readAsText(file);
  };

  // Update mapping
  const updateMapping = (index: number, field: string, value: any) => {
    setMappings(prev => prev.map((m, i) => i === index ? { ...m, [field]: value } : m));
  };

  // Step 3: Preview normalization & dedup
  const handlePreview = () => {
    const normalized = normalizeRecords(parsedRecords, mappings);
    const primaryFields = mappings.filter(m => m.role === "question" || m.role === "primary_id" || m.role === "display_title").map(m => m.targetKey);
    const mergeFields = mappings.filter(m => m.isMultiSelect).map(m => m.targetKey);
    const result = deduplicateRecords(normalized, primaryFields.length > 0 ? primaryFields : ["question"], undefined, mergeFields);
    setDedupResult(result);
    setStep(3);
  };

  // Step 4: Import
  const handleImport = async () => {
    if (!targetProject) { toast.error("Select target project"); return; }
    if (!dedupResult) return;
    setImporting(true);
    setProgress(0);
    try {
      const { success, failed } = await batchWriteQuestions(
        targetProject, dedupResult.clean,
        (done, total) => setProgress(Math.round((done / total) * 100))
      );

      // Save filter indexes
      const filterIndexes = generateFilterIndexes(dedupResult.clean, mappings);
      if (filterIndexes.length > 0) {
        await saveFilterIndexes(targetProject, filterIndexes);
      }

      // Save import log
      await saveImportLog({
        fileHash, projectId: targetProject, recordCount: success,
        duplicatesSkipped: dedupResult.duplicates.length,
        mergedCount: dedupResult.merged.length,
        invalidCount: dedupResult.invalid.length,
        importedBy: userEmail,
      });

      // Audit log
      await logAdminAction({
        userId, userEmail, action: "import", entityType: "questions",
        entityId: targetProject,
        details: `Imported ${success} questions (${dedupResult.duplicates.length} dupes skipped)`,
      });

      toast.success(`Imported ${success} records${failed > 0 ? `, ${failed} failed` : ""}`);
      setStep(4);
    } catch (e: any) {
      toast.error("Import failed: " + e.message);
    } finally {
      setImporting(false);
    }
  };

  // Save template
  const handleSaveTemplate = async () => {
    if (!templateName) { toast.error("Enter template name"); return; }
    const id = await saveSchemaTemplate({ name: templateName, fieldMappings: mappings, createdBy: userEmail });
    setTemplates(prev => [...prev, { id, name: templateName, fieldMappings: mappings }]);
    setTemplateName("");
    toast.success("Template saved");
  };

  const loadTemplate = (t: any) => {
    setMappings(t.fieldMappings);
    toast.success(`Loaded template "${t.name}"`);
  };

  const ROLES: { value: FieldRole; label: string }[] = [
    { value: "primary_id", label: "Primary ID" },
    { value: "question", label: "Question" },
    { value: "answer", label: "Answer" },
    { value: "display_title", label: "Display Title" },
    { value: "description", label: "Description" },
    { value: "grouping", label: "Grouping" },
    { value: "filterable", label: "Filterable" },
    { value: "searchable", label: "Searchable" },
    { value: "sortable", label: "Sortable" },
    { value: "metadata", label: "Metadata" },
    { value: "skip", label: "Skip" },
  ];

  const FILTER_TYPES: { value: FilterType; label: string }[] = [
    { value: "dropdown", label: "Dropdown" },
    { value: "multi_select", label: "Multi-Select" },
    { value: "range", label: "Range" },
    { value: "date_picker", label: "Date Picker" },
    { value: "hierarchical", label: "Hierarchical" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold font-heading">Schema & Import</h2>
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4].map(s => (
            <div key={s} className={cn("h-2 w-8 rounded-full transition-colors", step >= s ? "bg-primary" : "bg-secondary/50")} />
          ))}
        </div>
      </div>

      {/* Step 1: Parse */}
      {step === 1 && (
        <GlassCard hover={false}>
          <h3 className="font-semibold mb-3 font-heading flex items-center gap-2"><Database className="h-4 w-4" /> Step 1: Paste or Upload JSON</h3>
          <Textarea
            value={rawText}
            onChange={e => setRawText(e.target.value)}
            placeholder="Paste your JSON data here — arrays, objects, or any format with JSON embedded..."
            className="bg-secondary/20 border-border/30 font-mono text-sm min-h-[200px] resize-y mb-3"
            rows={10}
          />
          <div className="flex gap-3">
            <Button onClick={handleParse} disabled={!rawText.trim()} className="font-body gap-2">
              <Wand2 className="h-4 w-4" /> Detect Schema
            </Button>
            <Button variant="outline" onClick={() => fileRef.current?.click()} className="font-body gap-2">
              <Upload className="h-4 w-4" /> Upload File
            </Button>
            <input ref={fileRef} type="file" accept=".json,.txt,.js,.py" className="hidden" onChange={handleFileUpload} />
          </div>
        </GlassCard>
      )}

      {/* Step 2: Schema mapping */}
      {step === 2 && (
        <>
          {hashWarning && (
            <div className="p-3 rounded-lg bg-[hsl(var(--warning))]/10 border border-[hsl(var(--warning))]/20 flex items-center gap-2 text-sm">
              <AlertCircle className="h-4 w-4 text-[hsl(var(--warning))]" />
              <span className="font-body text-[hsl(var(--warning))]">{hashWarning}</span>
            </div>
          )}
          <GlassCard hover={false}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold font-heading flex items-center gap-2"><Settings className="h-4 w-4" /> Step 2: Map Fields ({detectedFields.length} detected)</h3>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setMappings(autoSuggestMappings(detectedFields))} className="font-body gap-1.5 text-xs">
                  <Wand2 className="h-3 w-3" /> Auto-Suggest
                </Button>
                {templates.length > 0 && (
                  <Select onValueChange={v => { const t = templates.find(x => x.id === v); if (t) loadTemplate(t); }}>
                    <SelectTrigger className="w-[160px] h-8 text-xs font-body bg-secondary/30"><SelectValue placeholder="Load Template" /></SelectTrigger>
                    <SelectContent>
                      {templates.map(t => (
                        <SelectItem key={t.id} value={t.id} className="text-xs font-body">{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Field</TableHead>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs">Samples</TableHead>
                    <TableHead className="text-xs">Unique</TableHead>
                    <TableHead className="text-xs">Role</TableHead>
                    <TableHead className="text-xs">Map To</TableHead>
                    <TableHead className="text-xs">Filter Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mappings.map((m, i) => {
                    const field = detectedFields.find(f => f.path === m.sourceKey);
                    return (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-xs">{m.sourceKey}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">{field?.type || "?"}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                          {field?.sampleValues.slice(0, 3).join(", ")}
                        </TableCell>
                        <TableCell className="text-xs tabular-nums">{field?.uniqueCount || 0}</TableCell>
                        <TableCell>
                          <Select value={m.role} onValueChange={v => updateMapping(i, "role", v)}>
                            <SelectTrigger className="h-7 w-[120px] text-[11px] bg-secondary/30"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {ROLES.map(r => <SelectItem key={r.value} value={r.value} className="text-xs">{r.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={m.targetKey}
                            onChange={e => updateMapping(i, "targetKey", e.target.value)}
                            className="h-7 w-[120px] text-[11px] bg-secondary/30 border-border/30"
                          />
                        </TableCell>
                        <TableCell>
                          {m.role === "filterable" && (
                            <Select value={m.filterType || "dropdown"} onValueChange={v => updateMapping(i, "filterType", v)}>
                              <SelectTrigger className="h-7 w-[110px] text-[11px] bg-secondary/30"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {FILTER_TYPES.map(ft => <SelectItem key={ft.value} value={ft.value} className="text-xs">{ft.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Save template */}
            <div className="flex gap-3 mt-4 pt-4 border-t border-border/30">
              <Input
                value={templateName}
                onChange={e => setTemplateName(e.target.value)}
                placeholder="Template name..."
                className="h-8 text-xs max-w-[200px] bg-secondary/30 border-border/30 font-body"
              />
              <Button size="sm" variant="outline" onClick={handleSaveTemplate} disabled={!templateName} className="font-body gap-1.5 text-xs">
                <Save className="h-3 w-3" /> Save Template
              </Button>
            </div>

            <div className="flex gap-3 mt-4">
              <Button variant="outline" onClick={() => setStep(1)} className="font-body">Back</Button>
              <Button onClick={handlePreview} className="font-body gap-2">
                <Eye className="h-4 w-4" /> Preview & Deduplicate
              </Button>
            </div>
          </GlassCard>
        </>
      )}

      {/* Step 3: Preview / Dedup */}
      {step === 3 && dedupResult && (
        <GlassCard hover={false}>
          <h3 className="font-semibold mb-4 font-heading flex items-center gap-2"><Activity className="h-4 w-4" /> Step 3: Normalization Report</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: "Clean Records", value: dedupResult.clean.length, color: "text-[hsl(var(--success))]" },
              { label: "Duplicates", value: dedupResult.duplicates.length, color: "text-[hsl(var(--warning))]" },
              { label: "Merged", value: dedupResult.merged.length, color: "text-primary" },
              { label: "Invalid", value: dedupResult.invalid.length, color: "text-destructive" },
            ].map((s, i) => (
              <div key={i} className="p-3 rounded-lg bg-secondary/30 text-center">
                <p className={cn("text-2xl font-heading font-bold tabular-nums", s.color)}>{s.value}</p>
                <p className="text-[10px] text-muted-foreground font-body">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="space-y-3 mb-4">
            <Label className="font-body">Import into project</Label>
            <Select value={targetProject} onValueChange={setTargetProject}>
              <SelectTrigger className="bg-secondary/30 border-border/40"><SelectValue placeholder="Select project" /></SelectTrigger>
              <SelectContent>
                {projects.map(p => <SelectItem key={p.id} value={p.id} className="font-body">{p.code} — {p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {importing && (
            <div className="mb-4">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1 tabular-nums font-body">{progress}%</p>
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(2)} className="font-body">Back</Button>
            <Button onClick={handleImport} disabled={importing || !targetProject} className="font-body gap-2 bg-gradient-to-r from-primary to-[hsl(263,70%,55%)]">
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Confirm Import ({dedupResult.clean.length} records)
            </Button>
          </div>
        </GlassCard>
      )}

      {/* Step 4: Complete */}
      {step === 4 && (
        <GlassCard hover={false}>
          <div className="text-center py-8">
            <CheckCircle2 className="h-12 w-12 text-[hsl(var(--success))] mx-auto mb-4" />
            <h3 className="text-xl font-heading font-bold mb-2">Import Complete</h3>
            <p className="text-sm text-muted-foreground font-body mb-6">Data has been imported and filter indexes generated.</p>
            <Button onClick={() => { setStep(1); setRawText(""); setParsedRecords([]); setDetectedFields([]); setMappings([]); setDedupResult(null); setFileHash(""); setHashWarning(""); }} className="font-body gap-2">
              <RefreshCw className="h-4 w-4" /> Start New Import
            </Button>
          </div>
        </GlassCard>
      )}
    </div>
  );
};

// ============ NOTIFICATIONS COMPOSER ============
const NotificationsComposer = ({ userId, userEmail }: { userId: string; userEmail: string }) => {
  const [form, setForm] = useState({ title: "", message: "", targetAll: true, targetCourseId: "" });
  const [sending, setSending] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getNotifications().then(n => { setNotifications(n); setLoading(false); });
  }, []);

  const handleSend = async () => {
    if (!form.title || !form.message) { toast.error("Title and message required"); return; }
    setSending(true);
    try {
      await sendNotification({
        title: form.title, message: form.message,
        targetAll: form.targetAll, targetCourseId: form.targetCourseId || undefined,
        createdAt: null, createdBy: userEmail,
      });
      await logAdminAction({ userId, userEmail, action: "create", entityType: "notification", details: form.title });
      setNotifications(await getNotifications());
      setForm({ title: "", message: "", targetAll: true, targetCourseId: "" });
      toast.success("Notification sent!");
    } catch { toast.error("Failed to send"); }
    finally { setSending(false); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold font-heading">Notifications</h2>
      <GlassCard hover={false}>
        <h3 className="font-semibold mb-4 font-heading">Compose Notification</h3>
        <div className="space-y-3 mb-4">
          <div className="space-y-2">
            <Label className="font-body">Title</Label>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Notification title" className="bg-secondary/30 border-border/40" />
          </div>
          <div className="space-y-2">
            <Label className="font-body">Message</Label>
            <Textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} placeholder="Write your notification message..." className="bg-secondary/30 border-border/40 resize-none" rows={3} />
          </div>
          <label className="flex items-center gap-2 text-sm font-body cursor-pointer">
            <Switch checked={form.targetAll} onCheckedChange={v => setForm(f => ({ ...f, targetAll: v }))} />
            Send to all users
          </label>
        </div>
        <Button onClick={handleSend} disabled={sending} className="font-body gap-2">
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
          Send Notification
        </Button>
      </GlassCard>

      {notifications.length > 0 && (
        <GlassCard hover={false}>
          <h3 className="font-semibold mb-3 font-heading">History ({notifications.length})</h3>
          <div className="space-y-2">
            {notifications.map(n => (
              <div key={n.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm font-body">{n.title}</p>
                  <p className="text-xs text-muted-foreground font-body line-clamp-1">{n.message}</p>
                  <p className="text-[10px] text-muted-foreground font-body mt-1">
                    {n.createdAt?.toDate?.()?.toLocaleDateString?.() || "—"} · by {n.createdBy || "admin"}
                  </p>
                </div>
                <Button size="icon" variant="ghost" className="text-destructive shrink-0" onClick={async () => {
                  await deleteNotification(n.id);
                  setNotifications(prev => prev.filter(x => x.id !== n.id));
                  toast.success("Deleted");
                }}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
};

// ============ AUDIT LOG VIEWER ============
const AuditLogViewer = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAuditLogs(200).then(l => { setLogs(l); setLoading(false); });
  }, []);

  const actionColors: Record<string, string> = {
    create: "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]",
    update: "bg-primary/10 text-primary",
    delete: "bg-destructive/10 text-destructive",
    import: "bg-[hsl(280,60%,50%)]/10 text-[hsl(280,60%,50%)]",
    approve: "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]",
    reject: "bg-destructive/10 text-destructive",
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold font-heading">Audit Log</h2>
      {loading ? (
        <p className="text-muted-foreground font-body">Loading...</p>
      ) : logs.length === 0 ? (
        <EmptyState icon={Clock} title="No audit logs" description="Admin actions will be recorded here." />
      ) : (
        <GlassCard hover={false} className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Time</TableHead>
                <TableHead className="text-xs">User</TableHead>
                <TableHead className="text-xs">Action</TableHead>
                <TableHead className="text-xs">Entity</TableHead>
                <TableHead className="text-xs">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map(log => (
                <TableRow key={log.id}>
                  <TableCell className="text-xs text-muted-foreground tabular-nums font-body whitespace-nowrap">
                    {log.timestamp?.toDate?.()?.toLocaleString?.() || "—"}
                  </TableCell>
                  <TableCell className="text-xs font-body">{log.userEmail || log.userId}</TableCell>
                  <TableCell>
                    <Badge className={cn("text-[10px] capitalize", actionColors[log.action] || "bg-secondary text-muted-foreground")}>
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs font-body capitalize">{log.entityType}</TableCell>
                  <TableCell className="text-xs text-muted-foreground font-body max-w-[300px] truncate">{log.details || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </GlassCard>
      )}
    </div>
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
        <EmptyState icon={HelpCircle} title="No pending submissions" description="Student-submitted questions will appear here for review." />
      ) : (
        <div className="space-y-4">
          {submissions.map((sub) => (
            <GlassCard key={sub.id} hover={false} className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <Badge variant="outline" className="text-xs">{getProjectCode(sub.projectId)}</Badge>
                    <Badge variant="outline" className="text-xs">{sub.category || "General"}</Badge>
                  </div>
                  <p className="font-medium leading-relaxed">{sub.question}</p>
                  {sub.answer && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{sub.answer}</p>}
                  <p className="text-xs text-muted-foreground mt-2">by {sub.submittedBy || "Anonymous"}</p>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDelete(sub.id)}>
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                </Button>
                <Button size="sm" onClick={() => handleApprove(sub)} className="bg-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/90 text-white">
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

// ============ IMPORT QUESTIONS (Legacy) ============
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
      if (items.length === 0) { toast.error(errors[0] || "No valid JSON found in file"); return; }
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
      <h2 className="text-2xl font-bold font-heading">Import Questions (Legacy)</h2>

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

      {csvData && (
        <GlassCard hover={false}>
          <CsvMapper headers={csvData.headers} rows={csvData.rows} onMap={handleCsvMapped} onCancel={() => { setCsvData(null); setImportMode("file"); }} />
        </GlassCard>
      )}

      {importMode === "paste" && !csvData && (
        <GlassCard hover={false}>
          <Label className="font-heading font-semibold text-base mb-2 block">Universal Paste Box</Label>
          <p className="text-sm text-muted-foreground font-body mb-3">Paste anything — JSON, JavaScript, Python, HTML, any code.</p>
          <Textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder="Paste anything here..."
            className="bg-secondary/20 border-border/30 font-mono text-sm min-h-[200px] resize-y"
            rows={10}
          />
          <Button onClick={handlePaste} className="mt-3 font-body gap-2" disabled={!pasteText.trim()}>
            <FileText className="h-4 w-4" /> Extract & Preview
          </Button>
        </GlassCard>
      )}

      {importMode === "file" && !csvData && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={cn("border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors duration-200", "border-border hover:border-primary/50 hover:bg-primary/5")}
        >
          <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-medium mb-1 font-heading">Drop any file here</p>
          <p className="text-sm text-muted-foreground font-body">Supports .json, .js, .py, .txt, .csv, and any text file</p>
          <input ref={fileRef} type="file" accept=".json,.js,.ts,.py,.txt,.csv,.html,.css,.java,.xml,.yaml,.yml,.md" className="hidden" onChange={(e) => e.target.files?.[0] && parseFile(e.target.files[0])} />
        </div>
      )}

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
            <div className="mt-4 p-4 rounded-lg bg-[hsl(var(--success))]/10 border border-[hsl(var(--success))]/20">
              <div className="flex items-center gap-2 text-[hsl(var(--success))] mb-2">
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

// ============ ADD RESOURCE ============
const AddResource = ({ projects }: { projects: Project[] }) => {
  const [form, setForm] = useState({ projectId: "", title: "", url: "", type: "", category: "", description: "" });
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!form.projectId || !form.title || !form.url) { toast.error("Project, title, and URL are required"); return; }
    setAdding(true);
    try {
      await addDoc(collection(db, "resources"), { ...form, createdAt: serverTimestamp() });
      setForm({ projectId: form.projectId, title: "", url: "", type: "", category: "", description: "" });
      toast.success("Resource added!");
    } catch { toast.error("Failed to add resource"); }
    finally { setAdding(false); }
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
              <SelectContent>{projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.code}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
              <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>{["youtube", "github", "pdf", "drive", "docs", "other"].map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Title</Label>
            <Input placeholder="Resource title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="bg-secondary border-border" />
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Input placeholder="e.g. Guidelines" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className="bg-secondary border-border" />
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
      } catch { toast.error("Failed to load submissions"); }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this submission?")) return;
    try {
      await deleteDoc(doc(db, "submissions", id));
      setSubmissions((prev) => prev.filter((s) => s.id !== id));
      toast.success("Submission deleted");
    } catch { toast.error("Failed to delete"); }
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

// ============ MANAGE ADMINS ============
const ManageAdmins = () => {
  const [admins, setAdmins] = useState<any[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const fetch = async () => {
      try {
        const snap = await getDocs(collection(db, "admins"));
        setAdmins(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch { toast.error("Failed to load admins"); }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  const handleAdd = async () => {
    if (!newEmail.trim()) { toast.error("Enter an email"); return; }
    setAdding(true);
    try {
      const ref = await addDoc(collection(db, "admins"), {
        email: newEmail.trim().toLowerCase(),
        grantedBy: user?.email || "unknown",
        grantedAt: serverTimestamp(),
      });
      setAdmins((prev) => [...prev, { id: ref.id, email: newEmail.trim().toLowerCase(), grantedBy: user?.email }]);
      setNewEmail("");
      toast.success("Admin added!");
    } catch { toast.error("Failed to add admin"); }
    finally { setAdding(false); }
  };

  const handleRemove = async (id: string) => {
    if (!confirm("Remove this admin?")) return;
    try {
      await deleteDoc(doc(db, "admins", id));
      setAdmins((prev) => prev.filter((a) => a.id !== id));
      toast.success("Admin removed");
    } catch { toast.error("Failed to remove admin"); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold font-heading">Admin Role Management</h2>
      <GlassCard hover={false}>
        <h3 className="font-semibold mb-4">Add New Admin</h3>
        <div className="flex gap-3">
          <Input placeholder="user@email.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="bg-secondary border-border flex-1" onKeyDown={(e) => e.key === "Enter" && handleAdd()} />
          <Button onClick={handleAdd} disabled={adding}>
            {adding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            Add Admin
          </Button>
        </div>
      </GlassCard>
      <GlassCard hover={false}>
        <h3 className="font-semibold mb-4">Current Admins</h3>
        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : admins.length === 0 ? (
          <p className="text-muted-foreground text-sm">No admins configured.</p>
        ) : (
          <div className="space-y-2">
            {admins.map((a) => (
              <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                <div>
                  <span className="font-medium">{a.email}</span>
                  {a.grantedBy && <span className="text-xs text-muted-foreground ml-2">added by {a.grantedBy}</span>}
                </div>
                <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleRemove(a.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
};

// ============ MANAGE NOTES ============
const ManageNotes = () => {
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: "", type: "note", description: "", url: "" });
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const snap = await getDocs(collection(db, "notes"));
        setNotes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch { toast.error("Failed to load notes"); }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  const handleAdd = async () => {
    if (!form.title) { toast.error("Title is required"); return; }
    setAdding(true);
    try {
      const ref = await addDoc(collection(db, "notes"), { ...form, status: "approved", createdAt: serverTimestamp() });
      setNotes((prev) => [...prev, { id: ref.id, ...form, status: "approved" }]);
      setForm({ title: "", type: "note", description: "", url: "" });
      toast.success("Note added!");
    } catch { toast.error("Failed to add note"); }
    finally { setAdding(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this note?")) return;
    try {
      await deleteDoc(doc(db, "notes", id));
      setNotes((prev) => prev.filter((n) => n.id !== id));
      toast.success("Note deleted");
    } catch { toast.error("Failed to delete"); }
  };

  const handleApprove = async (id: string) => {
    try {
      await updateDoc(doc(db, "notes", id), { status: "approved" });
      setNotes((prev) => prev.map((n) => n.id === id ? { ...n, status: "approved" } : n));
      toast.success("Note approved!");
    } catch { toast.error("Failed to approve"); }
  };

  const pendingNotes = notes.filter((n) => n.status === "pending");
  const approvedNotes = notes.filter((n) => n.status !== "pending");

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold font-heading">Manage Notes</h2>
      {pendingNotes.length > 0 && (
        <GlassCard hover={false}>
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            Pending Submissions
            <Badge className="bg-destructive text-destructive-foreground">{pendingNotes.length}</Badge>
          </h3>
          <div className="space-y-3">
            {pendingNotes.map((n) => (
              <div key={n.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 gap-3">
                <div className="min-w-0 flex-1">
                  <span className="font-medium">{n.title}</span>
                  <span className="text-xs text-muted-foreground ml-2 capitalize">{n.type}</span>
                  {n.submittedBy && <span className="text-xs text-muted-foreground ml-2">by {n.submittedBy}</span>}
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" onClick={() => handleApprove(n.id)} className="bg-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/90 text-white text-xs">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Approve
                  </Button>
                  <Button size="icon" variant="ghost" className="text-destructive h-8 w-8" onClick={() => handleDelete(n.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      <GlassCard hover={false}>
        <h3 className="font-semibold mb-4">Add Note</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input placeholder="Note title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="bg-secondary border-border" />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
              <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
              <SelectContent>{["note", "pdf", "doc", "html", "link"].map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>URL (optional)</Label>
            <Input placeholder="https://..." value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} className="bg-secondary border-border" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Description</Label>
            <Textarea placeholder="Description..." value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="bg-secondary border-border resize-none" rows={2} />
          </div>
        </div>
        <Button onClick={handleAdd} disabled={adding}>
          {adding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
          Add Note
        </Button>
      </GlassCard>
      {approvedNotes.length > 0 && (
        <GlassCard hover={false}>
          <h3 className="font-semibold mb-4">Existing Notes ({approvedNotes.length})</h3>
          <div className="space-y-2">
            {approvedNotes.map((n) => (
              <div key={n.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                <div className="min-w-0 flex-1">
                  <span className="font-medium">{n.title}</span>
                  <span className="text-xs text-muted-foreground ml-2 capitalize">{n.type}</span>
                </div>
                <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDelete(n.id)}>
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

export default Admin;