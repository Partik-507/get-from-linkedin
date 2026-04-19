import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { collection, getDocs, query, where, doc, getDoc, addDoc, deleteDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { ref as storageRef, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Layout } from "@/components/Layout";
import { GridSkeleton } from "@/components/LoadingSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { ResourceViewer } from "@/components/ResourceViewer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { MobileSheet } from "@/components/MobileSheet";
import { FolderDrawer } from "@/components/resources/FolderDrawer";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  getResourceFolders, createResourceFolder, deleteResourceFolder,
  getResourceCategories, createResourceCategory,
  type ResourceFolder, type ResourceCategory,
} from "@/lib/firestoreSync";
import type { LibraryFolder } from "@/lib/resourcesFolders";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Plus, FolderOpen, Folder, ChevronRight, ChevronDown, FileText,
  ExternalLink, Eye, Trash2, Pencil, Upload, Link2, Code, StickyNote,
  Grid3x3, List, Youtube, Github, HardDrive, BookOpen, Bookmark, X, Loader2,
  SlidersHorizontal, ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Resource {
  id: string;
  title: string;
  description?: string;
  url?: string;
  type: string;
  category?: string;
  categoryId?: string;
  projectId?: string;
  folderId?: string;
  source?: "url" | "file" | "html" | "note";
  fileUrl?: string;
  fileName?: string;
  filePath?: string;
  fileSize?: number;
  htmlContent?: string;
  noteContent?: string;
  isPinned?: boolean;
  collegeId?: string;
  createdAt?: any;
}

interface Course { id: string; code: string; name: string; }

const PREDEFINED_TYPES = ["pdf", "video", "youtube", "github", "drive", "docs", "html", "note", "link", "other"];
const PREDEFINED_CATEGORIES = ["Guidelines", "Milestones", "Lectures", "Assignments", "Past Papers", "References", "Other"];

const TYPE_ICON: Record<string, any> = {
  youtube: Youtube, video: Youtube, github: Github, pdf: FileText, drive: HardDrive,
  docs: BookOpen, html: Code, note: StickyNote, link: Link2, other: Link2, file: FileText,
};
const TYPE_COLOR: Record<string, string> = {
  youtube: "text-red-400 bg-red-400/10", video: "text-red-400 bg-red-400/10",
  github: "text-foreground bg-muted", pdf: "text-red-400 bg-red-400/10",
  drive: "text-[hsl(142,71%,45%)] bg-[hsl(142,71%,45%)]/10",
  docs: "text-[hsl(210,80%,50%)] bg-[hsl(210,80%,50%)]/10",
  html: "text-amber-500 bg-amber-500/10", note: "text-primary bg-primary/10",
  link: "text-muted-foreground bg-muted", other: "text-muted-foreground bg-muted",
  file: "text-primary bg-primary/10",
};

const PAGE_SIZE = 12;

const Resources = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  const [resources, setResources] = useState<Resource[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [folders, setFolders] = useState<ResourceFolder[]>([]);
  const [categories, setCategories] = useState<ResourceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState<string>(projectId || "all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [activeFolderId, setActiveFolderId] = useState<string>("root");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [page, setPage] = useState(1);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(["root"]));
  const [viewer, setViewer] = useState<{ open: boolean; title: string; url: string; type: string; html?: string }>({
    open: false, title: "", url: "", type: "",
  });
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Resource | null>(null);
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [folderParent, setFolderParent] = useState<string>("root");

  // Add form state
  const [form, setForm] = useState<Partial<Resource>>({ source: "url", type: "link" });
  const [customType, setCustomType] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = "Resources — VivaVault";
    const load = async () => {
      try {
        const [resSnap, projSnap, foldersData, catsData] = await Promise.all([
          getDocs(collection(db, "resources")),
          getDocs(collection(db, "projects")),
          getResourceFolders(),
          getResourceCategories(),
        ]);
        setResources(resSnap.docs.map(d => ({ id: d.id, ...d.data() } as Resource)));
        setCourses(projSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
        setFolders(foldersData);
        setCategories(catsData);
      } catch {
        toast.error("Failed to load resources");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    let result = [...resources];
    if (courseFilter !== "all") result = result.filter(r => r.projectId === courseFilter);
    if (categoryFilter !== "all") result = result.filter(r => r.categoryId === categoryFilter || r.category === categoryFilter);
    if (activeFolderId !== "root") result = result.filter(r => r.folderId === activeFolderId);
    else result = result.filter(r => !r.folderId || r.folderId === "root");
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(r => r.title?.toLowerCase().includes(s) || r.description?.toLowerCase().includes(s));
    }
    return result.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
  }, [resources, courseFilter, categoryFilter, activeFolderId, search]);

  const paged = useMemo(() => filtered.slice(0, page * PAGE_SIZE), [filtered, page]);
  const hasMore = paged.length < filtered.length;

  const renderFolderTree = (parentId: string, depth = 0): React.ReactNode => {
    const subs = folders.filter(f => f.parentId === parentId && (courseFilter === "all" || !f.courseId || f.courseId === courseFilter));
    return subs.map(folder => {
      const isExp = expandedFolders.has(folder.id);
      const hasChildren = folders.some(f => f.parentId === folder.id);
      return (
        <div key={folder.id}>
          <button
            onClick={() => setActiveFolderId(folder.id)}
            className={cn(
              "flex items-center gap-1.5 w-full px-2 py-1.5 rounded-md text-xs font-body transition-colors group",
              activeFolderId === folder.id ? "bg-primary/10 text-primary" : "text-foreground/80 hover:bg-muted/50"
            )}
            style={{ paddingLeft: `${8 + depth * 12}px` }}
          >
            {hasChildren ? (
              <span onClick={e => { e.stopPropagation(); setExpandedFolders(p => { const n = new Set(p); n.has(folder.id) ? n.delete(folder.id) : n.add(folder.id); return n; }); }} className="shrink-0">
                {isExp ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </span>
            ) : <span className="w-3 shrink-0" />}
            {isExp ? <FolderOpen className="h-3.5 w-3.5 shrink-0" /> : <Folder className="h-3.5 w-3.5 shrink-0" />}
            <span className="truncate flex-1 text-left">{folder.name}</span>
            {isAdmin && (
              <button
                onClick={e => { e.stopPropagation(); if (confirm(`Delete folder "${folder.name}"?`)) { deleteResourceFolder(folder.id); setFolders(p => p.filter(f => f.id !== folder.id)); } }}
                className="opacity-0 group-hover:opacity-100 text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </button>
          {isExp && renderFolderTree(folder.id, depth + 1)}
        </div>
      );
    });
  };

  const openResource = (r: Resource) => {
    if (r.source === "html") {
      setViewer({ open: true, title: r.title, url: "", type: "html", html: r.htmlContent });
      return;
    }
    if (r.source === "note") {
      setViewer({ open: true, title: r.title, url: "", type: "note", html: `<div class="prose dark:prose-invert max-w-none p-6"><h1>${r.title}</h1><div>${(r.noteContent || "").replace(/\n/g, "<br/>")}</div></div>` });
      return;
    }
    const url = r.fileUrl || r.url || "";
    if (!url) { toast.error("No content to display"); return; }
    setViewer({ open: true, title: r.title, url, type: r.type });
  };

  const handleDelete = async (r: Resource) => {
    if (!confirm(`Delete "${r.title}"?`)) return;
    try {
      if (r.filePath) {
        try { await deleteObject(storageRef(storage, r.filePath)); } catch {}
      }
      await deleteDoc(doc(db, "resources", r.id));
      setResources(p => p.filter(x => x.id !== r.id));
      toast.success("Deleted");
    } catch { toast.error("Failed to delete"); }
  };

  const openAddModal = (resource?: Resource) => {
    if (resource) {
      setEditing(resource);
      setForm(resource);
    } else {
      setEditing(null);
      setForm({ source: "url", type: "link", projectId: courseFilter !== "all" ? courseFilter : undefined, folderId: activeFolderId !== "root" ? activeFolderId : undefined });
    }
    setUploadFile(null);
    setCustomType("");
    setCustomCategory("");
    setAddOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.title?.trim()) { toast.error("Title required"); return; }
    setSubmitting(true);
    try {
      const data: any = {
        title: form.title,
        description: form.description || "",
        type: customType.trim() || form.type || "link",
        category: customCategory.trim() || form.category || "Other",
        categoryId: form.categoryId || "",
        projectId: form.projectId || "",
        folderId: form.folderId || "",
        source: form.source || "url",
        url: form.url || "",
        htmlContent: form.htmlContent || "",
        noteContent: form.noteContent || "",
        isPinned: form.isPinned || false,
        collegeId: localStorage.getItem("vv_selected_college") || "",
      };

      // Save custom category
      if (customCategory.trim() && !categories.find(c => c.name === customCategory.trim())) {
        const id = await createResourceCategory({ name: customCategory.trim() });
        setCategories(p => [...p, { id, name: customCategory.trim() }]);
        data.categoryId = id;
        data.category = customCategory.trim();
      }

      // Upload file if needed
      if (form.source === "file" && uploadFile) {
        const path = `resources/${Date.now()}_${uploadFile.name}`;
        const sRef = storageRef(storage, path);
        const upload = uploadBytesResumable(sRef, uploadFile);
        await new Promise<void>((resolve, reject) => {
          upload.on("state_changed",
            snap => setUploadProgress((snap.bytesTransferred / snap.totalBytes) * 100),
            reject,
            async () => {
              data.fileUrl = await getDownloadURL(upload.snapshot.ref);
              data.fileName = uploadFile.name;
              data.filePath = path;
              data.fileSize = uploadFile.size;
              if (uploadFile.type.includes("pdf")) data.type = "pdf";
              resolve();
            }
          );
        });
      }

      if (editing) {
        await updateDoc(doc(db, "resources", editing.id), { ...data, updatedAt: serverTimestamp() });
        setResources(p => p.map(r => r.id === editing.id ? { ...r, ...data } : r));
        toast.success("Updated");
      } else {
        const ref = await addDoc(collection(db, "resources"), { ...data, status: "approved", createdAt: serverTimestamp() });
        setResources(p => [...p, { id: ref.id, ...data }]);
        toast.success("Resource added");
      }
      setAddOpen(false);
      setUploadProgress(0);
    } catch (e) {
      console.error(e);
      toast.error("Failed to save resource");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateFolder = async () => {
    const name = prompt("Folder name?");
    if (!name?.trim()) return;
    try {
      const id = await createResourceFolder({
        name: name.trim(),
        parentId: folderParent,
        courseId: courseFilter !== "all" ? courseFilter : undefined,
        order: folders.length,
      });
      setFolders(p => [...p, { id, name: name.trim(), parentId: folderParent, order: folders.length }]);
      toast.success("Folder created");
    } catch { toast.error("Failed to create folder"); }
  };

  return (
    <Layout title="Resources" showBack>
      <div className="flex flex-col lg:flex-row gap-6 min-h-[70vh]">
        {/* Sidebar — Folders */}
        <aside className="lg:w-60 shrink-0">
          <div className="vv-card p-3 sticky top-20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-body font-semibold text-muted-foreground uppercase tracking-widest">Folders</span>
              {isAdmin && (
                <button onClick={() => { setFolderParent("root"); handleCreateFolder(); }}
                  className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-primary/10 text-primary">
                  <Plus className="h-3 w-3" />
                </button>
              )}
            </div>
            <button
              onClick={() => setActiveFolderId("root")}
              className={cn("flex items-center gap-1.5 w-full px-2 py-1.5 rounded-md text-xs font-body",
                activeFolderId === "root" ? "bg-primary/10 text-primary" : "text-foreground/80 hover:bg-muted/50")}
            >
              <FolderOpen className="h-3.5 w-3.5" /> All
            </button>
            <div className="mt-1 space-y-0.5">{renderFolderTree("root")}</div>
          </div>
        </aside>

        {/* Main */}
        <div className="flex-1 min-w-0">
          {/* Header controls */}
          <div className="mb-6 space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search resources…"
                  className="pl-10 h-10 rounded-xl font-body" />
              </div>
              <Select value={courseFilter} onValueChange={setCourseFilter}>
                <SelectTrigger className="w-full sm:w-[200px] h-10 font-body text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="font-body">All Courses</SelectItem>
                  {courses.map(c => <SelectItem key={c.id} value={c.id} className="font-body">{c.code} — {c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-[160px] h-10 font-body text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="font-body">All Categories</SelectItem>
                  {[...PREDEFINED_CATEGORIES, ...categories.map(c => c.name)].filter((v, i, a) => a.indexOf(v) === i).map(c =>
                    <SelectItem key={c} value={c} className="font-body">{c}</SelectItem>
                  )}
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setView(v => v === "grid" ? "list" : "grid")}
                  className="h-10 px-3" aria-label="Toggle view">
                  {view === "grid" ? <List className="h-4 w-4" /> : <Grid3x3 className="h-4 w-4" />}
                </Button>
                {isAdmin && (
                  <Button onClick={() => openAddModal()} size="sm" className="h-10 gap-2 font-body">
                    <Plus className="h-4 w-4" /> Add Resource
                  </Button>
                )}
              </div>
            </div>
            {!isAdmin && (
              <Badge variant="outline" className="font-body text-[10px]">Read-only · Sign in as admin to manage</Badge>
            )}
          </div>

          {loading ? (
            <GridSkeleton />
          ) : filtered.length === 0 ? (
            <EmptyState icon={Bookmark} title="No resources here yet"
              description={isAdmin ? "Click 'Add Resource' to get started." : "Resources will appear here once added."} />
          ) : (
            <>
              <div className={cn(
                view === "grid" ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" : "space-y-2"
              )}>
                {paged.map((r, i) => {
                  const Icon = TYPE_ICON[r.type?.toLowerCase()] || TYPE_ICON.other;
                  const color = TYPE_COLOR[r.type?.toLowerCase()] || TYPE_COLOR.other;
                  return view === "grid" ? (
                    <motion.div key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.03, 0.3) }}
                      className="vv-card p-5 flex flex-col group">
                      <div className="flex items-start gap-3 mb-3">
                        <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", color)}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-heading font-semibold text-sm leading-snug line-clamp-2">{r.title}</h3>
                          <p className="text-[10px] text-muted-foreground capitalize font-body mt-0.5">{r.type} {r.category && `· ${r.category}`}</p>
                        </div>
                      </div>
                      {r.description && <p className="text-xs text-muted-foreground line-clamp-2 font-body mb-4 flex-1">{r.description}</p>}
                      <div className="flex gap-2 mt-auto">
                        <Button size="sm" variant="outline" className="gap-1.5 font-body flex-1" onClick={() => openResource(r)}>
                          <Eye className="h-3.5 w-3.5" /> View
                        </Button>
                        {(r.url || r.fileUrl) && (
                          <Button size="sm" variant="ghost" className="gap-1.5 font-body" onClick={() => window.open(r.fileUrl || r.url, "_blank")}>
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {isAdmin && (
                          <>
                            <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100" onClick={() => openAddModal(r)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 text-destructive" onClick={() => handleDelete(r)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div key={r.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: Math.min(i * 0.02, 0.2) }}
                      className="vv-card p-3 flex items-center gap-3 group">
                      <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", color)}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-body font-medium text-sm truncate">{r.title}</p>
                        <p className="text-[10px] text-muted-foreground font-body">{r.type} {r.category && `· ${r.category}`}</p>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => openResource(r)} className="font-body gap-1">
                        <Eye className="h-3.5 w-3.5" /> View
                      </Button>
                      {isAdmin && (
                        <>
                          <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100" onClick={() => openAddModal(r)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 text-destructive" onClick={() => handleDelete(r)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </motion.div>
                  );
                })}
              </div>
              {hasMore && (
                <div className="flex justify-center mt-6">
                  <Button variant="outline" onClick={() => setPage(p => p + 1)} className="font-body">Load more</Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Add / Edit Modal */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">{editing ? "Edit Resource" : "Add Resource"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-body font-medium mb-1.5 block">Title *</label>
              <Input value={form.title || ""} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Resource title" className="font-body" />
            </div>
            <div>
              <label className="text-xs font-body font-medium mb-1.5 block">Description</label>
              <Textarea value={form.description || ""} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Brief description (optional)" className="font-body min-h-[60px]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-body font-medium mb-1.5 block">Course</label>
                <Select value={form.projectId || "none"} onValueChange={v => setForm({ ...form, projectId: v === "none" ? "" : v })}>
                  <SelectTrigger className="font-body"><SelectValue placeholder="Select course" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="font-body">— No course —</SelectItem>
                    {courses.map(c => <SelectItem key={c.id} value={c.id} className="font-body">{c.code}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-body font-medium mb-1.5 block">Folder</label>
                <Select value={form.folderId || "root"} onValueChange={v => setForm({ ...form, folderId: v === "root" ? "" : v })}>
                  <SelectTrigger className="font-body"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="root" className="font-body">— Root —</SelectItem>
                    {folders.map(f => <SelectItem key={f.id} value={f.id} className="font-body">{f.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-body font-medium mb-1.5 block">Type</label>
                <Select value={form.type || "link"} onValueChange={v => setForm({ ...form, type: v })}>
                  <SelectTrigger className="font-body"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PREDEFINED_TYPES.map(t => <SelectItem key={t} value={t} className="font-body capitalize">{t}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input value={customType} onChange={e => setCustomType(e.target.value)} placeholder="Or custom type…" className="font-body mt-2 text-xs h-8" />
              </div>
              <div>
                <label className="text-xs font-body font-medium mb-1.5 block">Category</label>
                <Select value={form.category || "Other"} onValueChange={v => setForm({ ...form, category: v })}>
                  <SelectTrigger className="font-body"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[...PREDEFINED_CATEGORIES, ...categories.map(c => c.name)].filter((v,i,a)=>a.indexOf(v)===i).map(c =>
                      <SelectItem key={c} value={c} className="font-body">{c}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <Input value={customCategory} onChange={e => setCustomCategory(e.target.value)} placeholder="Or custom category…" className="font-body mt-2 text-xs h-8" />
              </div>
            </div>
            <div>
              <label className="text-xs font-body font-medium mb-1.5 block">Source</label>
              <div className="grid grid-cols-4 gap-2">
                {([
                  { v: "url", label: "External Link", icon: Link2 },
                  { v: "file", label: "File Upload", icon: Upload },
                  { v: "html", label: "HTML Content", icon: Code },
                  { v: "note", label: "Note Text", icon: StickyNote },
                ] as const).map(opt => (
                  <button key={opt.v} type="button" onClick={() => setForm({ ...form, source: opt.v })}
                    className={cn(
                      "p-3 rounded-lg border text-xs font-body transition-all flex flex-col items-center gap-1.5",
                      form.source === opt.v ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/30"
                    )}>
                    <opt.icon className="h-4 w-4" />
                    <span className="text-center leading-tight">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
            {form.source === "url" && (
              <div>
                <label className="text-xs font-body font-medium mb-1.5 block">URL *</label>
                <Input value={form.url || ""} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="https://…" className="font-body" />
              </div>
            )}
            {form.source === "file" && (
              <div>
                <label className="text-xs font-body font-medium mb-1.5 block">File {editing?.fileName && `(current: ${editing.fileName})`}</label>
                <Input type="file" onChange={e => setUploadFile(e.target.files?.[0] || null)}
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg,.webp,.html,.txt,.md" className="font-body" />
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="mt-2">
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary transition-all" style={{ width: `${uploadProgress}%` }} />
                    </div>
                    <p className="text-[10px] text-muted-foreground font-body mt-1">{Math.round(uploadProgress)}%</p>
                  </div>
                )}
              </div>
            )}
            {form.source === "html" && (
              <div>
                <label className="text-xs font-body font-medium mb-1.5 block">HTML Content *</label>
                <Textarea value={form.htmlContent || ""} onChange={e => setForm({ ...form, htmlContent: e.target.value })}
                  placeholder="<h1>Your HTML…</h1>" className="font-body min-h-[120px] font-mono text-xs" />
              </div>
            )}
            {form.source === "note" && (
              <div>
                <label className="text-xs font-body font-medium mb-1.5 block">Note Text *</label>
                <Textarea value={form.noteContent || ""} onChange={e => setForm({ ...form, noteContent: e.target.value })}
                  placeholder="Write your note here…" className="font-body min-h-[120px]" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} className="font-body">Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting} className="font-body gap-2">
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {editing ? "Save changes" : "Add resource"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ResourceViewer
        open={viewer.open}
        onClose={() => setViewer({ open: false, title: "", url: "", type: "" })}
        title={viewer.title}
        url={viewer.url}
        type={viewer.type}
        htmlContent={viewer.html}
      />
    </Layout>
  );
};

export default Resources;
