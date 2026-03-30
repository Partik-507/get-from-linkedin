import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, serverTimestamp, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Layout } from "@/components/Layout";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { cn } from "@/lib/utils";
import {
  Plus, FolderPlus, Search, FileText, Folder, ChevronRight, ChevronDown,
  MoreHorizontal, Trash2, Pencil, Pin, Globe, X, Download, Copy, Star,
  Network, LayoutGrid, History, Upload, File, GripVertical,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NoteItem {
  id: string;
  title: string;
  content: string;
  folderId: string;
  tags: string[];
  courseId: string;
  isPinned: boolean;
  isPublic: boolean;
  status: string;
  createdAt: any;
  updatedAt: any;
}

interface FolderItem {
  id: string;
  name: string;
  parentId: string;
  order: number;
}

type ViewMode = "editor" | "graph" | "canvas";

const Notes = () => {
  const { user, isGuest } = useAuth();
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedNote, setSelectedNote] = useState<NoteItem | null>(null);
  const [openTabs, setOpenTabs] = useState<NoteItem[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(["root"]));
  const [viewMode, setViewMode] = useState<ViewMode>("editor");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const userId = user?.uid;

  // TipTap editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({ placeholder: 'Start writing... Type "/" for commands' }),
    ],
    content: selectedNote?.content || "",
    editable: true,
    onUpdate: ({ editor: e }) => {
      if (selectedNote) {
        setSelectedNote(prev => prev ? { ...prev, content: e.getHTML() } : null);
        setNotes(prev => prev.map(n => n.id === selectedNote.id ? { ...n, content: e.getHTML() } : n));
      }
    },
  });

  // Slash command handler
  useEffect(() => {
    if (!editor) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && editor.isFocused) {
        // Simple slash commands
        setTimeout(() => {
          const text = editor.getText();
          if (text.endsWith("/")) {
            // We'll handle this via a simple approach
          }
        }, 0);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editor]);

  // Load notes and folders
  useEffect(() => {
    document.title = "Notes OS — VivaVault";
    if (!userId && !isGuest) { setLoading(false); return; }
    const fetchData = async () => {
      try {
        if (userId) {
          const [notesSnap, foldersSnap] = await Promise.all([
            getDocs(collection(db, "users", userId, "notes")),
            getDocs(collection(db, "users", userId, "noteFolders")),
          ]);
          setNotes(notesSnap.docs.map(d => ({ id: d.id, ...d.data() } as NoteItem)));
          setFolders(foldersSnap.docs.map(d => ({ id: d.id, ...d.data() } as FolderItem)));
        }
      } catch {
        toast.error("Failed to load notes");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userId, isGuest]);

  // Sync editor content when switching tabs
  useEffect(() => {
    if (editor && selectedNote) {
      const currentContent = editor.getHTML();
      if (currentContent !== selectedNote.content) {
        editor.commands.setContent(selectedNote.content || "");
      }
    }
  }, [activeTabId]);

  // Auto-save
  useEffect(() => {
    if (!selectedNote || !userId) return;
    const timer = setTimeout(async () => {
      try {
        await updateDoc(doc(db, "users", userId, "notes", selectedNote.id), {
          content: selectedNote.content,
          updatedAt: serverTimestamp(),
        });
      } catch { /* silent */ }
    }, 2000);
    return () => clearTimeout(timer);
  }, [selectedNote?.content]);

  const createNote = async (folderId = "root") => {
    if (!userId) { toast.error("Sign in to create notes"); return; }
    try {
      const newNote: Partial<NoteItem> = {
        title: "Untitled",
        content: "",
        folderId,
        tags: [],
        courseId: "",
        isPinned: false,
        isPublic: false,
        status: "draft",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      const ref = await addDoc(collection(db, "users", userId, "notes"), newNote);
      const note = { id: ref.id, ...newNote } as NoteItem;
      setNotes(prev => [...prev, note]);
      openNote(note);
      toast.success("Note created");
    } catch { toast.error("Failed to create note"); }
  };

  const createFolder = async (parentId = "root") => {
    if (!userId) return;
    try {
      const ref = await addDoc(collection(db, "users", userId, "noteFolders"), {
        name: "New Folder",
        parentId,
        order: folders.length,
      });
      const folder = { id: ref.id, name: "New Folder", parentId, order: folders.length };
      setFolders(prev => [...prev, folder]);
      setExpandedFolders(prev => new Set([...prev, parentId]));
      setRenamingId(ref.id);
      setRenameValue("New Folder");
    } catch { toast.error("Failed to create folder"); }
  };

  const openNote = (note: NoteItem) => {
    setSelectedNote(note);
    setActiveTabId(note.id);
    if (!openTabs.find(t => t.id === note.id)) {
      setOpenTabs(prev => [...prev, note]);
    }
    setViewMode("editor");
  };

  const closeTab = (noteId: string) => {
    const newTabs = openTabs.filter(t => t.id !== noteId);
    setOpenTabs(newTabs);
    if (activeTabId === noteId) {
      if (newTabs.length > 0) {
        const last = newTabs[newTabs.length - 1];
        setSelectedNote(last);
        setActiveTabId(last.id);
      } else {
        setSelectedNote(null);
        setActiveTabId(null);
      }
    }
  };

  const deleteNote = async (noteId: string) => {
    if (!userId || !confirm("Delete this note?")) return;
    try {
      await deleteDoc(doc(db, "users", userId, "notes", noteId));
      setNotes(prev => prev.filter(n => n.id !== noteId));
      closeTab(noteId);
      toast.success("Note deleted");
    } catch { toast.error("Failed to delete"); }
  };

  const deleteFolder = async (folderId: string) => {
    if (!userId || !confirm("Delete this folder and all notes in it?")) return;
    try {
      // Delete notes in folder
      const notesInFolder = notes.filter(n => n.folderId === folderId);
      for (const n of notesInFolder) {
        await deleteDoc(doc(db, "users", userId, "notes", n.id));
      }
      await deleteDoc(doc(db, "users", userId, "noteFolders", folderId));
      setFolders(prev => prev.filter(f => f.id !== folderId));
      setNotes(prev => prev.filter(n => n.folderId !== folderId));
      toast.success("Folder deleted");
    } catch { toast.error("Failed to delete folder"); }
  };

  const renameItem = async (id: string, type: "note" | "folder") => {
    if (!userId || !renameValue.trim()) return;
    try {
      if (type === "note") {
        await updateDoc(doc(db, "users", userId, "notes", id), { title: renameValue });
        setNotes(prev => prev.map(n => n.id === id ? { ...n, title: renameValue } : n));
        if (selectedNote?.id === id) setSelectedNote(prev => prev ? { ...prev, title: renameValue } : null);
        setOpenTabs(prev => prev.map(t => t.id === id ? { ...t, title: renameValue } : t));
      } else {
        await updateDoc(doc(db, "users", userId, "noteFolders", id), { name: renameValue });
        setFolders(prev => prev.map(f => f.id === id ? { ...f, name: renameValue } : f));
      }
    } catch { toast.error("Failed to rename"); }
    setRenamingId(null);
  };

  const togglePin = async (noteId: string) => {
    if (!userId) return;
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    const newVal = !note.isPinned;
    await updateDoc(doc(db, "users", userId, "notes", noteId), { isPinned: newVal });
    setNotes(prev => prev.map(n => n.id === noteId ? { ...n, isPinned: newVal } : n));
  };

  const sharePublicly = async (noteId: string) => {
    if (!userId) return;
    try {
      const note = notes.find(n => n.id === noteId);
      if (!note) return;
      await addDoc(collection(db, "notes"), {
        title: note.title,
        content: note.content,
        type: "note",
        description: note.content.replace(/<[^>]+>/g, "").substring(0, 200),
        status: "pending",
        submittedBy: user?.email || "anonymous",
        createdAt: serverTimestamp(),
      });
      toast.success("Note submitted for public review!");
    } catch { toast.error("Failed to submit"); }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const text = ev.target?.result as string;
      let content = text;
      if (file.name.endsWith(".md")) {
        // Basic markdown to HTML
        content = text
          .replace(/^### (.+)$/gm, "<h3>$1</h3>")
          .replace(/^## (.+)$/gm, "<h2>$1</h2>")
          .replace(/^# (.+)$/gm, "<h1>$1</h1>")
          .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
          .replace(/\*(.+?)\*/g, "<em>$1</em>")
          .replace(/^- (.+)$/gm, "<li>$1</li>")
          .replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`)
          .replace(/\n\n/g, "</p><p>")
          .replace(/^(?!<[hul])/gm, "<p>")
          .replace(/(?<![>])$/gm, "</p>");
      }
      if (!userId) return;
      const ref = await addDoc(collection(db, "users", userId, "notes"), {
        title: file.name.replace(/\.\w+$/, ""),
        content,
        folderId: "root",
        tags: [],
        courseId: "",
        isPinned: false,
        isPublic: false,
        status: "draft",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      const note = { id: ref.id, title: file.name.replace(/\.\w+$/, ""), content, folderId: "root", tags: [], courseId: "", isPinned: false, isPublic: false, status: "draft", createdAt: null, updatedAt: null } as NoteItem;
      setNotes(prev => [...prev, note]);
      openNote(note);
      toast.success("File imported!");
      setImportOpen(false);
    };
    reader.readAsText(file);
  };

  const exportPdf = async () => {
    if (!selectedNote) return;
    const { default: jsPDF } = await import("jspdf");
    const d = new jsPDF();
    d.setFontSize(18);
    d.text(selectedNote.title, 14, 20);
    d.setFontSize(11);
    const plain = selectedNote.content.replace(/<[^>]+>/g, "");
    const lines = d.splitTextToSize(plain, 180);
    d.text(lines, 14, 35);
    d.save(`${selectedNote.title}.pdf`);
    toast.success("PDF exported!");
  };

  const filteredNotes = useMemo(() => {
    if (!search) return notes;
    const s = search.toLowerCase();
    return notes.filter(n => n.title?.toLowerCase().includes(s) || n.content?.toLowerCase().includes(s));
  }, [notes, search]);

  const toggleFolder = (id: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Drag-and-drop
  const handleDragStart = (e: React.DragEvent, noteId: string) => {
    e.dataTransfer.setData("noteId", noteId);
  };
  const handleDrop = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    const noteId = e.dataTransfer.getData("noteId");
    if (!noteId || !userId) return;
    updateDoc(doc(db, "users", userId, "notes", noteId), { folderId });
    setNotes(prev => prev.map(n => n.id === noteId ? { ...n, folderId } : n));
  };

  // Sidebar folder tree
  const renderFolder = (folderId: string, depth = 0) => {
    const subFolders = folders.filter(f => f.parentId === folderId);
    const folderNotes = filteredNotes
      .filter(n => n.folderId === folderId)
      .sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
    const isExpanded = expandedFolders.has(folderId);

    return (
      <div key={folderId}>
        {folderId !== "root" && (
          <div
            className={cn("flex items-center gap-1 py-1 px-2 rounded-lg cursor-pointer hover:bg-accent/50 transition-colors group", depth > 0 && "ml-3")}
            onClick={() => toggleFolder(folderId)}
            onDragOver={e => e.preventDefault()}
            onDrop={e => handleDrop(e, folderId)}
          >
            {isExpanded ? <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" /> : <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />}
            <Folder className="h-3.5 w-3.5 text-primary/60 shrink-0" />
            {renamingId === folderId ? (
              <input
                autoFocus
                value={renameValue}
                onChange={e => setRenameValue(e.target.value)}
                onBlur={() => renameItem(folderId, "folder")}
                onKeyDown={e => e.key === "Enter" && renameItem(folderId, "folder")}
                className="text-xs bg-transparent border-b border-primary/30 outline-none flex-1 font-body"
              />
            ) : (
              <span className="text-xs font-body font-medium truncate flex-1">{folders.find(f => f.id === folderId)?.name}</span>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="opacity-0 group-hover:opacity-100 h-5 w-5 flex items-center justify-center text-muted-foreground hover:text-foreground transition-opacity" onClick={e => e.stopPropagation()}>
                  <MoreHorizontal className="h-3 w-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-40">
                <DropdownMenuItem onClick={() => { setRenamingId(folderId); setRenameValue(folders.find(f => f.id === folderId)?.name || ""); }} className="text-xs font-body gap-2"><Pencil className="h-3 w-3" /> Rename</DropdownMenuItem>
                <DropdownMenuItem onClick={() => createNote(folderId)} className="text-xs font-body gap-2"><Plus className="h-3 w-3" /> New Note</DropdownMenuItem>
                <DropdownMenuItem onClick={() => createFolder(folderId)} className="text-xs font-body gap-2"><FolderPlus className="h-3 w-3" /> New Subfolder</DropdownMenuItem>
                <DropdownMenuItem onClick={() => deleteFolder(folderId)} className="text-xs font-body gap-2 text-destructive"><Trash2 className="h-3 w-3" /> Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
        {(isExpanded || folderId === "root") && (
          <div className={cn(folderId !== "root" && "ml-3")}>
            {subFolders.map(sf => renderFolder(sf.id, depth + 1))}
            {folderNotes.map(note => (
              <div
                key={note.id}
                draggable
                onDragStart={e => handleDragStart(e, note.id)}
                className={cn(
                  "flex items-center gap-1.5 py-1 px-2 rounded-lg cursor-pointer transition-colors group ml-3",
                  activeTabId === note.id ? "bg-primary/10 text-primary" : "hover:bg-accent/50 text-foreground"
                )}
                onClick={() => openNote(note)}
              >
                <GripVertical className="h-3 w-3 text-muted-foreground/40 shrink-0 opacity-0 group-hover:opacity-100" />
                <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                {renamingId === note.id ? (
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    onBlur={() => renameItem(note.id, "note")}
                    onKeyDown={e => e.key === "Enter" && renameItem(note.id, "note")}
                    className="text-xs bg-transparent border-b border-primary/30 outline-none flex-1 font-body"
                    onClick={e => e.stopPropagation()}
                  />
                ) : (
                  <span className="text-xs font-body truncate flex-1">{note.title}</span>
                )}
                {note.isPinned && <Pin className="h-2.5 w-2.5 text-primary shrink-0" />}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="opacity-0 group-hover:opacity-100 h-5 w-5 flex items-center justify-center text-muted-foreground hover:text-foreground transition-opacity" onClick={e => e.stopPropagation()}>
                      <MoreHorizontal className="h-3 w-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-40">
                    <DropdownMenuItem onClick={() => { setRenamingId(note.id); setRenameValue(note.title); }} className="text-xs font-body gap-2"><Pencil className="h-3 w-3" /> Rename</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => togglePin(note.id)} className="text-xs font-body gap-2"><Pin className="h-3 w-3" /> {note.isPinned ? "Unpin" : "Pin"}</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => sharePublicly(note.id)} className="text-xs font-body gap-2"><Globe className="h-3 w-3" /> Share Publicly</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => deleteNote(note.id)} className="text-xs font-body gap-2 text-destructive"><Trash2 className="h-3 w-3" /> Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Graph view - simple SVG
  const GraphView = () => {
    const nodeRadius = 24;
    const w = 600, h = 400;
    const positions = useMemo(() => {
      return notes.map((n, i) => ({
        id: n.id,
        title: n.title,
        x: 60 + (i % 5) * 120 + Math.random() * 20,
        y: 60 + Math.floor(i / 5) * 100 + Math.random() * 20,
      }));
    }, [notes]);

    // Find links by checking [[title]] patterns
    const links = useMemo(() => {
      const result: { from: string; to: string }[] = [];
      notes.forEach(n => {
        const matches = n.content?.match(/\[\[([^\]]+)\]\]/g) || [];
        matches.forEach(m => {
          const title = m.replace(/\[\[|\]\]/g, "");
          const target = notes.find(t => t.title.toLowerCase() === title.toLowerCase());
          if (target) result.push({ from: n.id, to: target.id });
        });
      });
      return result;
    }, [notes]);

    return (
      <div className="flex-1 flex items-center justify-center bg-accent/20 rounded-xl overflow-hidden">
        <svg width={w} height={h} className="w-full h-full">
          {links.map((link, i) => {
            const from = positions.find(p => p.id === link.from);
            const to = positions.find(p => p.id === link.to);
            if (!from || !to) return null;
            return <line key={i} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="hsl(var(--primary))" strokeWidth={1.5} opacity={0.3} />;
          })}
          {positions.map(p => (
            <g key={p.id} onClick={() => { const n = notes.find(x => x.id === p.id); if (n) openNote(n); }} className="cursor-pointer">
              <circle cx={p.x} cy={p.y} r={nodeRadius} fill="hsl(var(--card))" stroke="hsl(var(--primary))" strokeWidth={2} />
              <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize={9} fill="hsl(var(--foreground))" className="font-body">{p.title.slice(0, 8)}</text>
            </g>
          ))}
        </svg>
      </div>
    );
  };

  if (!user && !isGuest) {
    return (
      <Layout title="Notes OS">
        <EmptyState icon={FileText} title="Sign in to access Notes OS" description="Your personal knowledge workspace awaits." />
      </Layout>
    );
  }

  return (
    <Layout title="Notes OS">
      <div className="flex h-[calc(100vh-8rem)] gap-0 -mx-4 sm:-mx-6 lg:-mx-8">
        {/* Left Sidebar */}
        <div className="w-64 shrink-0 border-r border-border/50 flex flex-col bg-card/50">
          {/* Sidebar header */}
          <div className="p-3 border-b border-border/40 space-y-2">
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" className="flex-1 justify-start gap-2 text-xs font-body h-8" onClick={() => createNote()}>
                <Plus className="h-3.5 w-3.5" /> New Note
              </Button>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => createFolder()}>
                <FolderPlus className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search notes..."
                className="h-7 text-xs pl-7 bg-accent/30 border-border/30 font-body"
              />
            </div>
          </div>

          {/* View toggles */}
          <div className="flex gap-0.5 p-2 border-b border-border/30">
            {([
              { mode: "editor" as ViewMode, icon: FileText, label: "Editor" },
              { mode: "graph" as ViewMode, icon: Network, label: "Graph" },
            ]).map(v => (
              <button
                key={v.mode}
                onClick={() => setViewMode(v.mode)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1 py-1 rounded text-[10px] font-body transition-colors",
                  viewMode === v.mode ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <v.icon className="h-3 w-3" /> {v.label}
              </button>
            ))}
          </div>

          {/* Folder tree */}
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {loading ? (
              <div className="space-y-2 p-2">
                {[1, 2, 3].map(i => <div key={i} className="h-6 bg-accent/30 rounded animate-pulse" />)}
              </div>
            ) : (
              <>
                {renderFolder("root")}
                {filteredNotes.filter(n => !n.folderId || n.folderId === "root").length === 0 && folders.length === 0 && (
                  <div className="text-center py-8 px-3">
                    <FileText className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground font-body">No notes yet</p>
                    <Button size="sm" variant="ghost" className="mt-2 text-xs font-body gap-1" onClick={() => createNote()}>
                      <Plus className="h-3 w-3" /> Create your first note
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Sidebar footer */}
          <div className="p-2 border-t border-border/40 flex gap-1">
            <Button size="sm" variant="ghost" className="flex-1 text-xs font-body gap-1 h-7" onClick={() => setImportOpen(true)}>
              <Upload className="h-3 w-3" /> Import
            </Button>
            <Button size="sm" variant="ghost" className="flex-1 text-xs font-body gap-1 h-7" onClick={() => setExpandedFolders(new Set(["root", ...folders.map(f => f.id)]))}>
              Expand All
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Tabs */}
          {openTabs.length > 0 && (
            <div className="flex items-center border-b border-border/40 bg-card/30 overflow-x-auto">
              {openTabs.map(tab => (
                <div
                  key={tab.id}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 text-xs font-body cursor-pointer border-r border-border/30 min-w-0 max-w-[180px] group transition-colors",
                    activeTabId === tab.id ? "bg-background text-foreground border-b-2 border-b-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent/30"
                  )}
                  onClick={() => { setSelectedNote(notes.find(n => n.id === tab.id) || tab); setActiveTabId(tab.id); }}
                >
                  <FileText className="h-3 w-3 shrink-0" />
                  <span className="truncate">{tab.title}</span>
                  <button
                    onClick={e => { e.stopPropagation(); closeTab(tab.id); }}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground shrink-0"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Content area */}
          {viewMode === "graph" ? (
            <GraphView />
          ) : selectedNote ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Note toolbar */}
              <div className="flex items-center justify-between px-4 py-2 border-b border-border/30 bg-card/20">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-heading font-semibold truncate max-w-[300px]">{selectedNote.title}</h2>
                  {selectedNote.isPinned && <Pin className="h-3 w-3 text-primary" />}
                  {selectedNote.status === "pending" && <Badge className="text-[9px] bg-amber-500/10 text-amber-500">Pending Review</Badge>}
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" className="h-7 text-xs font-body gap-1" onClick={() => togglePin(selectedNote.id)}>
                    <Pin className="h-3 w-3" /> {selectedNote.isPinned ? "Unpin" : "Pin"}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs font-body gap-1" onClick={exportPdf}>
                    <Download className="h-3 w-3" /> PDF
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs font-body gap-1" onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success("Link copied!"); }}>
                    <Copy className="h-3 w-3" /> Link
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs font-body gap-1" onClick={() => sharePublicly(selectedNote.id)}>
                    <Globe className="h-3 w-3" /> Share
                  </Button>
                </div>
              </div>

              {/* Editor toolbar */}
              {editor && (
                <div className="flex items-center gap-0.5 px-4 py-1.5 border-b border-border/20 bg-card/10 flex-wrap">
                  {[
                    { action: () => editor.chain().focus().toggleBold().run(), active: editor.isActive("bold"), label: "B", style: "font-bold" },
                    { action: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive("italic"), label: "I", style: "italic" },
                    { action: () => editor.chain().focus().toggleStrike().run(), active: editor.isActive("strike"), label: "S", style: "line-through" },
                    { action: () => editor.chain().focus().toggleCode().run(), active: editor.isActive("code"), label: "<>", style: "font-mono text-[10px]" },
                  ].map((btn, i) => (
                    <button
                      key={i}
                      onClick={btn.action}
                      className={cn(
                        "h-7 w-7 rounded flex items-center justify-center text-xs transition-colors",
                        btn.active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                      )}
                    >
                      <span className={btn.style}>{btn.label}</span>
                    </button>
                  ))}
                  <div className="h-4 w-px bg-border/40 mx-1" />
                  {[1, 2, 3].map(level => (
                    <button
                      key={level}
                      onClick={() => editor.chain().focus().toggleHeading({ level: level as 1 | 2 | 3 }).run()}
                      className={cn(
                        "h-7 px-1.5 rounded flex items-center justify-center text-[10px] font-body transition-colors",
                        editor.isActive("heading", { level }) ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                      )}
                    >
                      H{level}
                    </button>
                  ))}
                  <div className="h-4 w-px bg-border/40 mx-1" />
                  <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={cn("h-7 w-7 rounded flex items-center justify-center text-xs", editor.isActive("bulletList") ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent/50")}>•</button>
                  <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={cn("h-7 w-7 rounded flex items-center justify-center text-xs", editor.isActive("orderedList") ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent/50")}>1.</button>
                  <button onClick={() => editor.chain().focus().toggleBlockquote().run()} className={cn("h-7 w-7 rounded flex items-center justify-center text-xs", editor.isActive("blockquote") ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent/50")}>"</button>
                  <button onClick={() => editor.chain().focus().toggleCodeBlock().run()} className={cn("h-7 px-1.5 rounded flex items-center justify-center text-[10px] font-mono", editor.isActive("codeBlock") ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent/50")}>{"{ }"}</button>
                  <button onClick={() => editor.chain().focus().setHorizontalRule().run()} className="h-7 w-7 rounded flex items-center justify-center text-xs text-muted-foreground hover:text-foreground hover:bg-accent/50">—</button>
                </div>
              )}

              {/* Editor content */}
              <div className="flex-1 overflow-y-auto">
                <div className="max-w-3xl mx-auto px-8 py-6">
                  <div className="prose prose-sm dark:prose-invert max-w-none font-body [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[400px] [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-muted-foreground [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0 [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none">
                    <EditorContent editor={editor} />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <FileText className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground font-body">Select a note or create a new one</p>
                <Button size="sm" variant="outline" className="mt-3 font-body gap-2 text-xs" onClick={() => createNote()}>
                  <Plus className="h-3 w-3" /> New Note
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Import dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading">Import Notes</DialogTitle>
            <DialogDescription className="font-body">Import .md or .html files</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Button variant="outline" className="w-full font-body gap-2" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4" /> Choose File
            </Button>
            <input ref={fileInputRef} type="file" accept=".md,.html,.txt" className="hidden" onChange={handleImport} />
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Notes;
