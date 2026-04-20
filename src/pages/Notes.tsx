import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useStorage } from "@/contexts/StorageContext";
import { Layout } from "@/components/Layout";
import {
  localFetchNoteMetadata, localFetchNoteContent, localSaveNoteContent,
  localCreateNote, localUpdateNoteMetadata, localDeleteNote,
  localRestoreNote, localFetchFolders, localCreateFolder,
  localUpdateFolder, localDeleteFolder,
} from "@/lib/notesLocalFS";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { FileText, Globe, Plus, BookOpen, PanelLeftOpen, Lock, Users, ChevronRight, FolderOpen, Loader2, Menu, Search, MoreHorizontal } from "lucide-react";
import { MobilePageHeader, MobileHeaderIconBtn, MobileSearchBar, MobileSegmentControl } from "@/components/MobilePageHeader";
import { NotesSidebar } from "@/components/notes/NotesSidebar";
import { NoteEditor } from "@/components/notes/NoteEditor";
import { CommandPalette } from "@/components/notes/CommandPalette";
import { GraphView } from "@/components/notes/GraphView";
import { CanvasView } from "@/components/notes/CanvasView";
import { DatabaseView } from "@/components/notes/DatabaseView";
import { DetailsPanel } from "@/components/notes/DetailsPanel";
import { TemplatePickerModal } from "@/components/notes/TemplatePickerModal";
import { VersionHistory } from "@/components/notes/VersionHistory";
import { PublicLibrary } from "@/components/notes/PublicLibrary";
import { PublicWorkspace } from "@/components/notes/PublicWorkspace";
import { PublishModal } from "@/components/notes/PublishModal";
import { ImportExportModal } from "@/components/notes/ImportExport";
import { ShareModal } from "@/components/notes/ShareModal";
import { NotionImportModal } from "@/components/notes/NotionImportModal";
import {
  fetchNoteMetadata, fetchNoteContent, saveNoteContent, pushRecentNoteId,
  createNote as createNoteFS, updateNoteMetadata, deleteNote as deleteNoteFS,
  restoreNote as restoreNoteFS, fetchFolders, createFolder as createFolderFS,
  updateFolder, deleteFolder as deleteFolderFS, publishNote as publishNoteFS,
  extractNoteLinks,
  type NoteMetadata, type FolderItem,
} from "@/lib/notesFirestore";
import { saveSnapshot } from "@/lib/indexedDB";

type ViewMode = "editor" | "graph" | "canvas" | "database";
type World = "my" | "public" | "space";
interface CanvasNode { noteId: string; x: number; y: number; width: number; height: number; }

const Notes = () => {
  const { user, isAdmin, isGuest } = useAuth();
  const { storageMode, localVault, isStorageChosen, isRestoringLocal, chooseCloud, chooseLocal, reconnectLocal } = useStorage();
  const isLocal = storageMode === "local";
  const dirHandle = localVault?.dirHandle ?? null;

  // ── State ────────────────────────────────────────────────────────────────────
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    try { return parseInt(localStorage.getItem("vv_notes_sidebar_width") || "260", 10); } 
    catch { return 260; }
  });
  const [isResizing, setIsResizing] = useState(false);
  const [notes, setNotes] = useState<NoteMetadata[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [contents, setContents] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [openTabIds, setOpenTabIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("editor");
  const [world, setWorld] = useState<World>("my");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showHistory, setHistoryOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [canvasNodes, setCanvasNodes] = useState<CanvasNode[]>([]);
  const [cmdPaletteOpen, setCmdPaletteOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [notionImportOpen, setNotionImportOpen] = useState(false);
  const [publishNoteId, setPublishNoteId] = useState<string | null>(null);
  const [shareNoteId, setShareNoteId] = useState<string | null>(null);
  const [savedIndicator, setSavedIndicator] = useState(false);
  const [editorFont, setEditorFont] = useState("Lora");
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  // Public workspace data (admin notes shown read-only)
  const [publicNotes, setPublicNotes] = useState<NoteMetadata[]>([]);
  const [publicFolders, setPublicFolders] = useState<FolderItem[]>([]);
  const [publicContents, setPublicContents] = useState<Record<string, string>>({});
  const touchStartX = useRef(0);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const userId = user?.uid;

  const selectedNote = useMemo(() => notes.find(n => n.id === selectedNoteId) || null, [notes, selectedNoteId]);
  const activeNotes = useMemo(() => notes.filter(n => !n.deletedAt && !n.isArchived), [notes]);
  const allNotesForLinks = useMemo(() => activeNotes.map(n => ({ id: n.id, title: n.title })), [activeNotes]);

  // Derived: current display data based on workspace mode
  const isReadOnly = world !== "my";
  const displayNotes = world === "my" ? notes : publicNotes;
  const displayFolders = world === "my" ? folders : publicFolders;
  const displayContents = world === "my" ? contents : publicContents;
  const displayActiveNotes = useMemo(
    () => displayNotes.filter(n => !n.deletedAt && !n.isArchived),
    [displayNotes]
  );

  // ── Load data ──────────────────────────────────────────────────────────────
  useEffect(() => {
    document.title = "Notes OS — VivaVault";
    if (isLocal) {
      if (!dirHandle) { setLoading(false); return; }
      const load = async () => {
        try {
          const [notesData, foldersData] = await Promise.all([
            localFetchNoteMetadata(dirHandle),
            localFetchFolders(dirHandle),
          ]);
          setNotes(notesData);
          setFolders(foldersData);
        } catch { toast.error("Failed to load local notes"); }
        finally { setLoading(false); }
      };
      load();
    } else {
      if (!userId) { setLoading(false); return; }
      const load = async () => {
        try {
          const [notesData, foldersData] = await Promise.all([fetchNoteMetadata(userId), fetchFolders(userId)]);
          setNotes(notesData);
          setFolders(foldersData);
        } catch { toast.error("Failed to load notes"); }
        finally { setLoading(false); }
      };
      load();
    }
  }, [userId, isLocal, dirHandle]);

  // ── Resizable Sidebar ──────────────────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem("vv_notes_sidebar_width", sidebarWidth.toString());
  }, [sidebarWidth]);

  useEffect(() => {
    if (!isResizing) return;
    const handleMouseMove = (e: MouseEvent) => {
      let newWidth = e.clientX - 8;
      if (newWidth < 200) newWidth = 200;
      if (newWidth > 600) newWidth = 600;
      setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = "default";
    };
    document.body.style.cursor = "col-resize";
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "default";
    };
  }, [isResizing]);

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "k") { e.preventDefault(); setCmdPaletteOpen(true); }
      if (mod && e.key === "n") { e.preventDefault(); handleCreateNote(); }
      if (mod && e.key === "s") { e.preventDefault(); handleForceSave(); }
      if (mod && e.key === "g") { e.preventDefault(); setViewMode(v => v === "graph" ? "editor" : "graph"); }
      if (mod && e.key === "\\") { e.preventDefault(); setSidebarCollapsed(c => !c); }
      if (e.key === "Escape" && focusMode) setFocusMode(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [focusMode]);

  // ── PageLink navigation ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: Event) => {
      const pageId = (e as CustomEvent).detail;
      const note = displayNotes.find(n => n.id === pageId);
      if (note) { openNote(note); }
    };
    window.addEventListener("notes-navigate-page", handler);
    return () => window.removeEventListener("notes-navigate-page", handler);
  }, [displayNotes]);

  // ── Quick Action FAB events ────────────────────────────────────────────────
  useEffect(() => {
    const onCreate = () => handleCreateNote();
    const onCanvas = async () => {
      const created = await handleCreateNote("root", { title: "Canvas", content: "", tags: [] });
      if (created && userId) {
        const props = { isCanvas: true, canvasNodes: [] };
        await updateNoteMetadata(userId, created.id, { properties: props } as any);
        setNotes(prev => prev.map(n => n.id === created.id ? { ...n, properties: props } : n));
      }
    };
    const onFolder = () => handleCreateFolder("root");
    const onTpl = () => setTemplateOpen(true);
    window.addEventListener("notes-create-note", onCreate);
    window.addEventListener("notes-create-canvas", onCanvas);
    window.addEventListener("notes-create-folder", onFolder);
    window.addEventListener("notes-open-templates", onTpl);
    return () => {
      window.removeEventListener("notes-create-note", onCreate);
      window.removeEventListener("notes-create-canvas", onCanvas);
      window.removeEventListener("notes-create-folder", onFolder);
      window.removeEventListener("notes-open-templates", onTpl);
    };
  }, [userId]);

  // ── Autosave ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedNoteId) return;
    const content = contents[selectedNoteId];
    if (content === undefined) return;
    const timer = setTimeout(async () => {
      try {
        if (isLocal && dirHandle) {
          await localSaveNoteContent(dirHandle, selectedNoteId, content);
        } else if (userId) {
          await saveNoteContent(userId, selectedNoteId, content);
        }
        await saveSnapshot(selectedNoteId, content);
        const linkedIds = extractNoteLinks(content, notes);
        if (JSON.stringify(linkedIds) !== JSON.stringify(selectedNote?.linkedNoteIds || [])) {
          if (isLocal && dirHandle) {
            await localUpdateNoteMetadata(dirHandle, selectedNoteId, { linkedNoteIds: linkedIds } as any);
          } else if (userId) {
            await updateNoteMetadata(userId, selectedNoteId, { linkedNoteIds: linkedIds } as any);
          }
          setNotes(prev => prev.map(n => n.id === selectedNoteId ? { ...n, linkedNoteIds: linkedIds } : n));
        }
        setSavedIndicator(true);
        if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
        savedTimerRef.current = setTimeout(() => setSavedIndicator(false), 2000);
      } catch { /* silent */ }
    }, 1500);
    return () => clearTimeout(timer);
  }, [contents[selectedNoteId as string]]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleForceSave = async () => {
    if (!selectedNoteId) return;
    const c = contents[selectedNoteId] || "";
    if (isLocal && dirHandle) {
      await localSaveNoteContent(dirHandle, selectedNoteId, c);
    } else if (userId) {
      await saveNoteContent(userId, selectedNoteId, c);
    }
    await saveSnapshot(selectedNoteId, c);
    toast.success("Saved!");
  };

  const loadContent = async (noteId: string) => {
    if (contents[noteId] !== undefined) return;
    let content = "";
    if (isLocal && dirHandle) {
      content = await localFetchNoteContent(dirHandle, noteId);
    } else if (userId) {
      content = await fetchNoteContent(userId, noteId);
    }
    setContents(prev => ({ ...prev, [noteId]: content }));
  };

  const openNote = async (note: NoteMetadata) => {
    setSelectedNoteId(note.id);
    if (!openTabIds.includes(note.id)) setOpenTabIds(prev => [...prev, note.id]);
    setViewMode("editor");
    pushRecentNoteId(note.id);
    await loadContent(note.id);
  };

  const closeTab = (noteId: string) => {
    const newTabs = openTabIds.filter(id => id !== noteId);
    setOpenTabIds(newTabs);
    if (selectedNoteId === noteId) setSelectedNoteId(newTabs.length > 0 ? newTabs[newTabs.length - 1] : null);
  };

  const handleCreateNote = async (folderId = "root", templateData?: { title: string; content: string; tags: string[] }, parentId?: string): Promise<{ id: string; title: string } | null> => {
    if (!isLocal && !userId) { toast.error("Sign in to create notes"); return null; }
    if (isReadOnly) { toast.error("This workspace is read-only"); return null; }
    try {
      const properties = parentId ? { parentId } : {};
      let note: NoteMetadata;
      if (isLocal && dirHandle) {
        note = await localCreateNote(dirHandle, { title: templateData?.title || "Untitled", folderId, tags: templateData?.tags || [], properties }, templateData?.content || "");
      } else {
        note = await createNoteFS(userId!, { title: templateData?.title || "Untitled", folderId, tags: templateData?.tags || [], properties }, templateData?.content || "");
      }
      setNotes(prev => [...prev, note]);
      setContents(prev => ({ ...prev, [note.id]: templateData?.content || "" }));
      openNote(note);
      toast.success("Page created");
      return { id: note.id, title: note.title };
    } catch { toast.error("Failed to create page"); return null; }
  };

  const handleCreateSubpage = async (parentId?: string) => {
    return await handleCreateNote("root", undefined, parentId);
  };

  const handleCreateFolder = async (parentId = "root") => {
    if (!isLocal && !userId) return;
    try {
      let folder: FolderItem;
      if (isLocal && dirHandle) {
        folder = await localCreateFolder(dirHandle, "New Folder", parentId, folders.length);
      } else {
        folder = await createFolderFS(userId!, "New Folder", parentId, folders.length);
      }
      setFolders(prev => [...prev, folder]);
    } catch { toast.error("Failed to create folder"); }
  };

  const handleDeleteNote = async (noteId: string, permanent = false) => {
    if (!isLocal && !userId) return;
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    if (permanent || note.deletedAt) {
      if (!confirm("Permanently delete this page?")) return;
      if (isLocal && dirHandle) {
        await localDeleteNote(dirHandle, noteId, true);
      } else {
        await deleteNoteFS(userId!, noteId, true);
      }
      setNotes(prev => prev.filter(n => n.id !== noteId));
      closeTab(noteId);
      toast.success("Permanently deleted");
    } else {
      if (isLocal && dirHandle) {
        await localDeleteNote(dirHandle, noteId, false);
      } else {
        await deleteNoteFS(userId!, noteId, false);
      }
      setNotes(prev => prev.map(n => n.id === noteId ? { ...n, deletedAt: new Date() } : n));
      closeTab(noteId);
      toast.success("Moved to trash");
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    if ((!isLocal && !userId) || !confirm("Delete this folder and all pages?")) return;
    if (isLocal && dirHandle) {
      for (const n of notes.filter(n => n.folderId === folderId)) await localDeleteNote(dirHandle, n.id, true);
      await localDeleteFolder(dirHandle, folderId);
    } else {
      for (const n of notes.filter(n => n.folderId === folderId)) await deleteNoteFS(userId!, n.id, true);
      await deleteFolderFS(userId!, folderId);
    }
    setFolders(prev => prev.filter(f => f.id !== folderId));
    setNotes(prev => prev.filter(n => n.folderId !== folderId));
    toast.success("Folder deleted");
  };

  const handleRenameNote = async (id: string, name: string) => {
    if (isLocal && dirHandle) {
      await localUpdateNoteMetadata(dirHandle, id, { title: name } as any);
    } else if (userId) {
      await updateNoteMetadata(userId, id, { title: name } as any);
    }
    setNotes(prev => prev.map(n => n.id === id ? { ...n, title: name } : n));
  };

  const handleRenameFolder = async (id: string, name: string) => {
    if (isLocal && dirHandle) {
      await localUpdateFolder(dirHandle, id, { name });
    } else if (userId) {
      await updateFolder(userId, id, { name });
    }
    setFolders(prev => prev.map(f => f.id === id ? { ...f, name } : f));
  };

  const handleTogglePin = async (id: string) => {
    const note = notes.find(n => n.id === id);
    if (!note) return;
    if (isLocal && dirHandle) {
      await localUpdateNoteMetadata(dirHandle, id, { isPinned: !note.isPinned } as any);
    } else if (userId) {
      await updateNoteMetadata(userId, id, { isPinned: !note.isPinned } as any);
    }
    setNotes(prev => prev.map(n => n.id === id ? { ...n, isPinned: !n.isPinned } : n));
  };

  const handleMoveNote = async (noteId: string, folderId: string) => {
    if (isLocal && dirHandle) {
      await localUpdateNoteMetadata(dirHandle, noteId, { folderId } as any);
    } else if (userId) {
      await updateNoteMetadata(userId, noteId, { folderId } as any);
    }
    setNotes(prev => prev.map(n => n.id === noteId ? { ...n, folderId } : n));
  };

  const handleRestoreNote = async (id: string) => {
    if (isLocal && dirHandle) {
      await localRestoreNote(dirHandle, id);
    } else if (userId) {
      await restoreNoteFS(userId, id);
    }
    setNotes(prev => prev.map(n => n.id === id ? { ...n, deletedAt: null } : n));
    toast.success("Restored");
  };

  const handleAddTag = async (tag: string) => {
    if (!selectedNoteId) return;
    const note = notes.find(n => n.id === selectedNoteId);
    if (!note) return;
    const tags = [...new Set([...(note.tags || []), tag])];
    if (isLocal && dirHandle) {
      await localUpdateNoteMetadata(dirHandle, selectedNoteId, { tags } as any);
    } else if (userId) {
      await updateNoteMetadata(userId, selectedNoteId, { tags } as any);
    }
    setNotes(prev => prev.map(n => n.id === selectedNoteId ? { ...n, tags } : n));
  };

  const handleRemoveTag = async (tag: string) => {
    if (!selectedNoteId) return;
    const note = notes.find(n => n.id === selectedNoteId);
    if (!note) return;
    const tags = (note.tags || []).filter(t => t !== tag);
    if (isLocal && dirHandle) {
      await localUpdateNoteMetadata(dirHandle, selectedNoteId, { tags } as any);
    } else if (userId) {
      await updateNoteMetadata(userId, selectedNoteId, { tags } as any);
    }
    setNotes(prev => prev.map(n => n.id === selectedNoteId ? { ...n, tags } : n));
  };

  const handleContentChange = (html: string) => {
    if (!selectedNoteId) return;
    setContents(prev => ({ ...prev, [selectedNoteId]: html }));
  };

  const handleIconChange = async (icon: string) => {
    if (!selectedNoteId) return;
    if (isLocal && dirHandle) {
      await localUpdateNoteMetadata(dirHandle, selectedNoteId, { icon } as any);
    } else if (userId) {
      await updateNoteMetadata(userId, selectedNoteId, { icon } as any);
    }
    setNotes(prev => prev.map(n => n.id === selectedNoteId ? { ...n, icon } : n));
  };

  const handleCoverChange = async (cover: string) => {
    if (!selectedNoteId) return;
    if (isLocal && dirHandle) {
      await localUpdateNoteMetadata(dirHandle, selectedNoteId, { coverImage: cover } as any);
    } else if (userId) {
      await updateNoteMetadata(userId, selectedNoteId, { coverImage: cover } as any);
    }
    setNotes(prev => prev.map(n => n.id === selectedNoteId ? { ...n, coverImage: cover } : n));
  };

  const handlePublish = async (data: { description: string; subject: string; branch: string; level: string; tags: string[] }) => {
    if (!userId || !publishNoteId) return;
    const note = notes.find(n => n.id === publishNoteId);
    if (!note) return;
    await publishNoteFS(userId, publishNoteId, contents[publishNoteId] || "", {
      title: note.title, description: data.description, tags: data.tags,
      subject: data.subject, branch: data.branch, level: data.level,
      authorName: user?.email || "Anonymous",
    });
    setNotes(prev => prev.map(n => n.id === publishNoteId ? { ...n, isPublic: true } : n));
  };

  const handleExportMd = () => {
    if (!selectedNote) return;
    const plain = (contents[selectedNoteId!] || "").replace(/<[^>]+>/g, "");
    const blob = new Blob([`# ${selectedNote.title}\n\n${plain}`], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `${selectedNote.title}.md`; a.click();
  };

  const handleExportPdf = async () => {
    if (!selectedNote) return;
    const { default: jsPDF } = await import("jspdf");
    const d = new jsPDF();
    d.setFontSize(18); d.text(selectedNote.title, 14, 20);
    d.setFontSize(11);
    const plain = (contents[selectedNoteId!] || "").replace(/<[^>]+>/g, "");
    d.text(d.splitTextToSize(plain, 180), 14, 35);
    d.save(`${selectedNote.title}.pdf`);
  };

  const handleRestore = (content: string) => {
    if (!selectedNoteId) return;
    setContents(prev => ({ ...prev, [selectedNoteId]: content }));
  };

  const navigateToNote = (id: string) => {
    const n = displayNotes.find(x => x.id === id);
    if (n) openNote(n);
  };

  // ── Sidebar props — always same UI, read-only flag changes ────────────────
  const noop = () => {};
  const guardEdit = <T extends (...args: any[]) => any>(fn: T) =>
    isReadOnly ? ((() => { toast.error("Public Workspace is read-only"); }) as unknown as T) : fn;

  const sidebarProps = {
    notes: displayNotes,
    folders: displayFolders,
    activeNoteId: selectedNoteId,
    viewMode, loading, collapsed: sidebarCollapsed,
    search, activeTags,
    readOnly: isReadOnly,
    onSearchChange: setSearch,
    onSelectNote: (n: NoteMetadata) => { openNote(n); setMobileDrawerOpen(false); },
    onCreateNote: guardEdit(handleCreateNote),
    onCreateFolder: guardEdit(handleCreateFolder),
    onDeleteNote: guardEdit(handleDeleteNote),
    onDeleteFolder: guardEdit(handleDeleteFolder),
    onRenameNote: guardEdit(handleRenameNote),
    onRenameFolder: guardEdit(handleRenameFolder),
    onTogglePin: guardEdit(handleTogglePin),
    onPublish: guardEdit((id: string) => setPublishNoteId(id)),
    onMoveNote: guardEdit(handleMoveNote),
    onRestoreNote: guardEdit(handleRestoreNote),
    onSetViewMode: setViewMode,
    onToggleCollapse: () => setSidebarCollapsed(c => !c),
    onOpenTemplate: isReadOnly ? noop : () => setTemplateOpen(true),
    onOpenImport: isReadOnly ? noop : () => setImportOpen(true),
    onOpenNotionImport: isReadOnly ? noop : () => setNotionImportOpen(true),
    onOpenCommandPalette: () => setCmdPaletteOpen(true),
    onToggleTag: (t: string) => setActiveTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]),
    onClearTags: () => setActiveTags([]),
  };

  if (!user && !isGuest) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <EmptyState icon={FileText} title="Sign in to access Notes OS" description="Your personal knowledge workspace awaits." />
        </div>
      </Layout>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  // My Workspace: show storage selection if not configured yet
  if (world === "my" && (user || isGuest) && !isStorageChosen) {
    return (
      <Layout fullBleed hideBottomNav>
        <div className="h-[calc(100dvh-60px-env(safe-area-inset-bottom,0px))] md:h-[calc(100dvh-57px)] flex items-center justify-center bg-background">
          <div className="w-full max-w-xl px-4">
            <div className="text-center mb-8">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-[hsl(240,70%,50%)] flex items-center justify-center text-primary-foreground font-bold text-2xl mx-auto mb-5 shadow-lg shadow-primary/20">V</div>
              <h1 className="text-2xl font-heading font-bold">Where should we store your notes?</h1>
              <p className="text-muted-foreground font-body text-sm mt-2">Choose how VivaVault saves your workspace. You can change this in settings.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button onClick={chooseCloud}
                className="p-6 rounded-2xl border-2 border-primary/20 bg-primary/5 text-left hover:border-primary hover:bg-primary/10 transition-all group">
                <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Globe className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-heading font-semibold text-base mb-1">VivaVault Cloud</h3>
                <p className="text-xs font-body text-muted-foreground">Sync across all devices. Automatic backups. Works everywhere.</p>
                <span className="text-[10px] font-body text-primary font-medium mt-2 block">⭐ Recommended</span>
              </button>
              <button onClick={async () => {
                const ok = await chooseLocal();
                if (!ok) toast.error("Folder access denied. Try Chrome/Edge or choose Cloud.");
              }}
                className="p-6 rounded-2xl border-2 border-border/50 text-left hover:border-primary/50 hover:bg-muted/20 transition-all group">
                <div className="h-10 w-10 bg-muted rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <FolderOpen className="h-5 w-5 text-muted-foreground" />
                </div>
                <h3 className="font-heading font-semibold text-base mb-1">Local Folder</h3>
                <p className="text-xs font-body text-muted-foreground">Store files on your device. Full privacy. Requires Chrome/Edge.</p>
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Local mode but browser lost handle permission — show reconnect overlay
  if (world === "my" && isLocal && !dirHandle && !isRestoringLocal) {
    return (
      <Layout fullBleed hideBottomNav>
        <div className="h-[calc(100dvh-60px-env(safe-area-inset-bottom,0px))] md:h-[calc(100dvh-57px)] flex items-center justify-center bg-background">
          <div className="w-full max-w-md px-4 text-center">
            <div className="h-16 w-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-5">
              <FolderOpen className="h-8 w-8 text-amber-500" />
            </div>
            <h1 className="text-xl font-heading font-bold mb-2">Reconnect Your Local Vault</h1>
            <p className="text-sm font-body text-muted-foreground mb-6">Your browser needs permission to access the local folder again. Click below to reconnect.</p>
            <Button className="font-body gap-2" size="lg" onClick={async () => {
              const ok = await reconnectLocal();
              if (!ok) toast.error("Access denied. Select the same folder or choose Cloud.");
            }}>
              <FolderOpen className="h-4 w-4" /> Grant Access
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  // Restoring local handle — show spinner
  if (world === "my" && isLocal && isRestoringLocal) {
    return (
      <Layout fullBleed hideBottomNav>
        <div className="h-[calc(100dvh-60px-env(safe-area-inset-bottom,0px))] md:h-[calc(100dvh-57px)] flex items-center justify-center bg-background">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
            <p className="text-sm font-body text-muted-foreground">Reconnecting local vault…</p>
          </div>
        </div>
      </Layout>
    );
  }
  return (
    <Layout fullBleed hideBottomNav>
      <div className={cn(
        "flex overflow-hidden bg-transparent",
        "h-[calc(100dvh-60px-env(safe-area-inset-bottom,0px))] md:h-[calc(100dvh-57px)]"
      )}>

        {/* ════════════════════════════════════════
            SIDEBAR
            Desktop: fixed 260px width, collapsible to icon strip
            Mobile: full-screen when mobilePanel === "sidebar"
        ════════════════════════════════════════ */}
        {/* ── MOBILE OVERLAY DRAWER ── */}
        <AnimatePresence>
          {mobileDrawerOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
                className="fixed inset-0 z-[100] bg-black/40 md:hidden"
                onClick={() => setMobileDrawerOpen(false)}
              />
              <motion.aside
                initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="fixed left-0 top-0 bottom-0 z-[110] w-[285px] bg-card border-r border-border flex flex-col md:hidden shadow-xl"
                onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
                onTouchMove={(e) => {
                  const touchX = e.touches[0].clientX;
                  if (touchStartX.current - touchX > 50) setMobileDrawerOpen(false);
                }}
              >
                <NotesSidebar {...sidebarProps} />
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* ════════════════════════════════════════
            DESKTOP SIDEBAR
        ════════════════════════════════════════ */}
        <aside 
          style={(!sidebarCollapsed) ? { "--sidebar-width": `${sidebarWidth}px` } as React.CSSProperties : undefined}
          className={cn(
            "hidden md:flex shrink-0 overflow-hidden transition-all duration-200 ease-in-out os-panel flex-col m-3 mr-1.5",
            isResizing && "transition-none",
            focusMode && "!hidden",
            !sidebarCollapsed ? "w-[var(--sidebar-width,260px)]" : "w-14"
          )}>
          {sidebarCollapsed ? (
            // Minimal icon strip (desktop)
            <div className="flex flex-col items-center py-3 gap-2 w-14">
              <button onClick={() => setSidebarCollapsed(false)}
                className="p-2 rounded-xl hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                title="Expand sidebar (⌘\)">
                <PanelLeftOpen className="h-4 w-4" />
              </button>
              <button onClick={() => handleCreateNote()}
                className="p-2 rounded-xl hover:bg-primary/10 text-primary transition-colors"
                title="New page (⌘N)">
                <Plus className="h-4 w-4" />
              </button>
              <div className="w-8 h-px bg-border/40 my-1" />
              <button onClick={() => setCmdPaletteOpen(true)}
                className="p-2 rounded-xl hover:bg-sidebar-accent text-muted-foreground hover:text-foreground transition-colors"
                title="Search (⌘K)">
                <FileText className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <NotesSidebar {...sidebarProps} />
          )}
        </aside>

        {/* RESIZER */}
        {!focusMode && !sidebarCollapsed && (
          <div
            className="hidden md:block w-3 mx-[-6px] z-10 cursor-col-resize hover:bg-primary/10 transition-colors group relative"
            onMouseDown={(e) => { e.preventDefault(); setIsResizing(true); }}
          >
            <div className={cn(
              "absolute inset-y-0 left-1/2 -translate-x-1/2 w-0.5 transition-colors duration-200",
              isResizing ? "bg-primary/50" : "bg-transparent group-hover:bg-primary/30"
            )} />
          </div>
        )}

        {/* MAIN CONTENT */}
        <main
          className={cn(
            "flex-1 flex flex-col overflow-hidden min-w-0 md:m-3 md:ml-1.5 md:os-panel transition-all duration-200",
            focusMode ? "m-0 md:rounded-none md:border-none" : ""
          )}
          onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
          onTouchMove={(e) => {
            const touchX = e.touches[0].clientX;
            if (touchX - touchStartX.current > 50 && touchStartX.current < 40) setMobileDrawerOpen(true);
          }}
        >

          {/* Mobile: full-bleed header — hamburger | title | search | three-dot */}
          {!focusMode && (
            <MobilePageHeader>
              {/* Row 1: hamburger | "Notes OS" | search | three-dot */}
              <div className="px-4 pt-3 pb-2 flex items-center gap-2">
                <MobileHeaderIconBtn onClick={() => setMobileDrawerOpen(true)} label="Open menu" className="-ml-2">
                  <Menu className="h-5 w-5" />
                </MobileHeaderIconBtn>

                <span className="font-heading font-bold text-[22px] leading-none shrink-0">Notes OS</span>

                <MobileSearchBar
                  value={search}
                  onChange={setSearch}
                  placeholder="Search notes…"
                  className="flex-1 min-w-0"
                />

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <MobileHeaderIconBtn label="Switch workspace">
                      <MoreHorizontal className="h-5 w-5" />
                    </MobileHeaderIconBtn>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40 font-body">
                    <DropdownMenuItem onClick={() => setWorld("my")}>
                      Mine {world === "my" && <span className="ml-auto text-primary">✓</span>}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setWorld("public")}>
                      Public {world === "public" && <span className="ml-auto text-primary">✓</span>}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setWorld("space")}>
                      Space {world === "space" && <span className="ml-auto text-primary">✓</span>}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Row 2: left[New Page] | right[Mine/Public/Space switcher] */}
              <div className="px-4 pb-3 flex items-center gap-2">
                <button
                  onClick={() => handleCreateNote()}
                  className="h-8 px-3 rounded-lg text-[11px] font-body font-medium inline-flex items-center gap-1.5 shrink-0 bg-primary text-primary-foreground active:scale-[0.97] transition-all"
                >
                  <Plus className="h-3 w-3" strokeWidth={2.4} />
                  New Page
                </button>

                <div className="flex-1" />

                {/* Mine/Public/Space segment control */}
                <div className="flex items-center shrink-0 h-8 bg-muted/60 rounded-lg p-0.5 gap-0.5 border border-border/30">
                  {(["my", "public", "space"] as const).map((w) => (
                    <button
                      key={w}
                      onClick={() => setWorld(w)}
                      className={cn(
                        "h-7 px-2.5 rounded-md text-[11px] font-body font-medium transition-all whitespace-nowrap",
                        world === w
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground/80"
                      )}
                    >
                      {w === "my" ? "Mine" : w === "public" ? "Public" : "Space"}
                    </button>
                  ))}
                </div>
              </div>
            </MobilePageHeader>
          )}

          {/* Desktop: top tab bar — tabs LEFT, workspace switcher FAR RIGHT */}
          {!focusMode && (
            <div className="hidden md:flex items-center h-10 border-b border-border/30 bg-muted/20 shrink-0 px-2 gap-2">
              {/* Open tabs — flex-1 takes all space first */}
              <div className="flex items-center flex-1 overflow-x-auto scrollbar-none gap-0.5">
                {openTabIds.length > 1 && openTabIds.map(tabId => {
                  const tabNote = displayNotes.find(n => n.id === tabId);
                  if (!tabNote) return null;
                  const isActive = selectedNoteId === tabId;
                  return (
                    <div key={tabId}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 h-7 text-[11px] font-body cursor-pointer min-w-0 max-w-[160px] group transition-all shrink-0 rounded-md",
                        isActive
                          ? "bg-background text-foreground shadow-sm border border-border/50"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                      )}
                      onClick={() => openNote(tabNote)}>
                      <span className="text-[11px] shrink-0">{tabNote.icon || "📄"}</span>
                      <span className="truncate flex-1">{tabNote.title || "Untitled"}</span>
                      <button onClick={e => { e.stopPropagation(); closeTab(tabId); }}
                        className="opacity-0 group-hover:opacity-100 shrink-0 hover:text-destructive transition-all text-sm leading-none ml-0.5 w-3.5 h-3.5 flex items-center justify-center rounded">
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
              {/* Workspace switcher — far RIGHT, always visible */}
              {isReadOnly && (
                <span className="text-[10px] font-body text-amber-500 font-semibold flex items-center gap-1 shrink-0">
                  <Lock className="h-3 w-3" /> Read-only
                </span>
              )}
              <div className="flex items-center shrink-0 bg-muted/50 rounded-lg p-0.5 gap-0.5 border border-border/30">
                {([
                  { id: "my" as const, label: "My Workspace", icon: null },
                  { id: "public" as const, label: "Public", icon: Users },
                  { id: "space" as const, label: "Space", icon: Globe },
                ] as const).map(w => {
                  const Icon = w.icon;
                  return (
                    <button key={w.id} onClick={() => setWorld(w.id)}
                      className={cn(
                        "px-2.5 py-1 text-[11px] font-body font-medium transition-all rounded-md flex items-center gap-1 whitespace-nowrap",
                        world === w.id
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}>
                      {Icon && <Icon className="h-3 w-3" />}
                      {w.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Content area — unified layout, only data + permissions change */}
          <div className="flex-1 flex overflow-hidden">
            <AnimatePresence mode="wait">

              {/* PUBLIC SPACE — browse published library */}
              {world === "space" ? (
                <motion.div key="space" className="flex-1 overflow-y-auto pb-16 md:pb-4"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                  <PublicLibrary externalSearch={search} />
                </motion.div>

              /* GRAPH VIEW */
              ) : viewMode === "graph" ? (
                <motion.div key="graph" className="flex-1 overflow-hidden"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                  <GraphView notes={displayActiveNotes} contents={displayContents} onSelectNote={navigateToNote} />
                </motion.div>

              /* CANVAS VIEW */
              ) : viewMode === "canvas" ? (
                <motion.div key="canvas" className="flex-1 overflow-hidden"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                  <CanvasView notes={displayActiveNotes} canvasNodes={canvasNodes} onUpdateNodes={setCanvasNodes}
                    onSelectNote={navigateToNote} contents={displayContents} />
                </motion.div>

              /* DATABASE VIEW */
              ) : viewMode === "database" ? (
                <motion.div key="database" className="flex-1 overflow-hidden"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                  <DatabaseView notes={displayActiveNotes} onSelectNote={navigateToNote}
                    onUpdateProperty={(noteId, key, val) => {
                      if (!userId || isReadOnly) return;
                      const note = notes.find(n => n.id === noteId);
                      if (!note) return;
                      const properties = { ...(note.properties || {}), [key]: val };
                      updateNoteMetadata(userId, noteId, { properties } as any);
                      setNotes(prev => prev.map(n => n.id === noteId ? { ...n, properties } : n));
                    }} />
                </motion.div>

              /* CANVAS PAGE — note has isCanvas:true property */
              ) : selectedNote && selectedNote.properties?.isCanvas ? (
                <motion.div key={`canvas-${selectedNote.id}`} className="flex-1 overflow-hidden"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                  <CanvasView
                    notes={displayActiveNotes}
                    canvasNodes={(selectedNote.properties?.canvasNodes as CanvasNode[]) || []}
                    onUpdateNodes={async (nodes) => {
                      if (isReadOnly) return;
                      const props = { ...(selectedNote.properties || {}), isCanvas: true, canvasNodes: nodes };
                      if (isLocal && dirHandle) await localUpdateNoteMetadata(dirHandle, selectedNote.id, { properties: props } as any);
                      else if (userId) await updateNoteMetadata(userId, selectedNote.id, { properties: props } as any);
                      setNotes(prev => prev.map(n => n.id === selectedNote.id ? { ...n, properties: props } : n));
                    }}
                    onSelectNote={navigateToNote}
                    contents={displayContents}
                    readOnly={isReadOnly}
                  />
                </motion.div>

              /* EDITOR — note selected */
              ) : selectedNote ? (
                <motion.div key={selectedNote.id} className="flex-1 flex overflow-hidden"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>

                  <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                    <NoteEditor
                      note={selectedNote}
                      content={displayContents[selectedNoteId!] || ""}
                      onContentChange={isReadOnly ? () => {} : handleContentChange}
                      onTitleChange={isReadOnly ? () => {} : title => handleRenameNote(selectedNoteId!, title)}
                      onAddTag={isReadOnly ? undefined : handleAddTag}
                      onRemoveTag={isReadOnly ? undefined : handleRemoveTag}
                      onTogglePin={isReadOnly ? undefined : () => handleTogglePin(selectedNoteId!)}
                      onOpenHistory={isReadOnly ? undefined : () => setHistoryOpen(true)}
                      onExportPdf={handleExportPdf}
                      onExportMd={handleExportMd}
                      onToggleBacklinks={() => setShowDetails(d => !d)}
                      onShare={() => setShareNoteId(selectedNoteId)}
                      onNavigateToNote={navigateToNote}
                      showBacklinks={showDetails}
                      focusMode={focusMode}
                      onToggleFocus={() => setFocusMode(f => !f)}
                      readOnly={isReadOnly}
                      font={editorFont}
                      onFontChange={isReadOnly ? undefined : setEditorFont}
                      onIconChange={isReadOnly ? undefined : handleIconChange}
                      onCoverChange={isReadOnly ? undefined : handleCoverChange}
                      allNotes={allNotesForLinks}
                      savedIndicator={savedIndicator}
                      isFullWidth={!!selectedNote.properties?.isFullWidth}
                      onToggleFullWidth={isReadOnly ? undefined : () => {
                        if (!userId) return;
                        const newProperties = { ...(selectedNote.properties || {}), isFullWidth: !selectedNote.properties?.isFullWidth };
                        updateNoteMetadata(userId, selectedNote.id, { properties: newProperties } as any);
                        setNotes(prev => prev.map(n => n.id === selectedNote.id ? { ...n, properties: newProperties } : n));
                      }}
                      onCreateSubpage={isReadOnly ? undefined : handleCreateSubpage}
                    />
                  </div>

                  {/* Right slide-in panels (desktop) */}
                  <AnimatePresence>
                    {showHistory && (
                      <motion.div key="hist"
                        initial={{ width: 0, opacity: 0 }} animate={{ width: 280, opacity: 1 }} exit={{ width: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }} className="shrink-0 border-l border-border/40 overflow-hidden hidden md:block">
                        <VersionHistory open onClose={() => setHistoryOpen(false)}
                          noteId={selectedNoteId!} currentContent={contents[selectedNoteId!] || ""} onRestore={handleRestore} />
                      </motion.div>
                    )}
                    {showDetails && !showHistory && (
                      <motion.div key="det"
                        initial={{ width: 0, opacity: 0 }} animate={{ width: 260, opacity: 1 }} exit={{ width: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }} className="shrink-0 border-l border-border/40 overflow-hidden hidden md:block">
                        <DetailsPanel note={selectedNote} content={contents[selectedNoteId!] || ""}
                          allNotes={activeNotes} onClose={() => setShowDetails(false)} onSelectNote={navigateToNote} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

              /* EMPTY STATE */
              ) : (
                <motion.div key="empty" className="flex-1 flex items-center justify-center pb-16 md:pb-4"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                  <div className="text-center max-w-sm px-6">
                    <div className="h-24 w-24 rounded-[2rem] bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto mb-6 shadow-inner">
                      <BookOpen className="h-12 w-12 text-primary/70" />
                    </div>
                    <h2 className="font-heading font-bold text-2xl mb-2 tracking-tight">Your workspace is ready</h2>
                    <p className="text-sm text-muted-foreground font-body mb-6 leading-relaxed">
                      {loading
                        ? "Loading your pages..."
                        : "Select a page from the sidebar or create a brand-new one to get started."
                      }
                    </p>
                    {!loading && (
                      <div className="flex gap-3 justify-center flex-wrap">
                        <Button onClick={() => { handleCreateNote(); }}
                          className="gap-2 font-body shadow-md shadow-primary/20">
                          <Plus className="h-4 w-4" /> New Page
                        </Button>
                        <Button variant="outline" onClick={() => setMobileDrawerOpen(true)}
                          className="gap-2 font-body md:hidden">
                          Open Sidebar
                        </Button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      <CommandPalette open={cmdPaletteOpen} onClose={() => setCmdPaletteOpen(false)}
        notes={activeNotes} onSelectNote={n => { openNote(n); }}
        onCreateNote={() => handleCreateNote()} onSetView={v => setViewMode(v as ViewMode)} />

      <TemplatePickerModal open={templateOpen} onClose={() => setTemplateOpen(false)}
        onSelect={t => { handleCreateNote("root", t); }} />

      {publishNoteId && (
        <PublishModal open={!!publishNoteId} onClose={() => setPublishNoteId(null)}
          onPublish={handlePublish}
          noteTitle={notes.find(n => n.id === publishNoteId)?.title || ""}
          existingTags={notes.find(n => n.id === publishNoteId)?.tags || []} />
      )}

      {shareNoteId && selectedNote && userId && (
        <ShareModal open={!!shareNoteId} onClose={() => setShareNoteId(null)}
          note={{ id: shareNoteId, title: selectedNote.title, icon: selectedNote.icon }}
          userId={userId} content={contents[shareNoteId] || ""} />
      )}

      <ImportExportModal open={importOpen} onClose={() => setImportOpen(false)}
        onImport={(title, content) => handleCreateNote("root", { title, content, tags: [] })} />

      <NotionImportModal
        open={notionImportOpen}
        onClose={() => setNotionImportOpen(false)}
        onImportPage={async (title, content, parentId, folderId) => {
          return await handleCreateNote(folderId || "root", { title, content, tags: [] }, parentId);
        }}
        onCreateFolder={async (name, parentId) => {
          await handleCreateFolder(parentId || "root");
          return null;
        }}
      />
    </Layout>
  );
};

export default Notes;
