import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, setDoc, serverTimestamp } from "firebase/firestore";
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
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { Table as TiptapTable } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import { cn } from "@/lib/utils";
import {
  Plus, FolderPlus, Search, FileText, Folder, ChevronRight, ChevronDown,
  MoreHorizontal, Trash2, Pencil, Pin, Globe, X, Download, Copy, Star,
  Network, LayoutGrid, History, Upload, GripVertical, BookTemplate,
  PanelRightOpen, PanelRightClose, Tag, Table as TableIcon, Undo2,
  Highlighter, Link as LinkIcon, CheckSquare, ImageIcon,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SlashCommandMenu } from "@/components/notes/SlashCommandMenu";
import { CommandPalette } from "@/components/notes/CommandPalette";
import { BacklinksPanel } from "@/components/notes/BacklinksPanel";
import { GraphView } from "@/components/notes/GraphView";
import { CanvasView } from "@/components/notes/CanvasView";
import { TemplatePickerModal } from "@/components/notes/TemplatePickerModal";
import { VersionHistory, saveVersionSnapshot } from "@/components/notes/VersionHistory";
import { TagFilter } from "@/components/notes/TagFilter";
import { DatabaseView } from "@/components/notes/DatabaseView";

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
  parentNoteId?: string;
  linkedNoteIds?: string[];
  icon?: string;
  properties?: Record<string, any>;
  version?: number;
  isArchived?: boolean;
  deletedAt?: any;
}

interface FolderItem {
  id: string;
  name: string;
  parentId: string;
  order: number;
}

interface CanvasNode {
  noteId: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

type ViewMode = "editor" | "graph" | "canvas" | "database";

const RECENT_KEY = "vv_recent_notes";
const getRecent = (): string[] => {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); } catch { return []; }
};
const pushRecent = (id: string) => {
  const r = getRecent().filter(x => x !== id);
  r.unshift(id);
  localStorage.setItem(RECENT_KEY, JSON.stringify(r.slice(0, 10)));
};

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
  const [importOpen, setImportOpen] = useState(false);
  const [cmdPaletteOpen, setCmdPaletteOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [showBacklinks, setShowBacklinks] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [canvasNodes, setCanvasNodes] = useState<CanvasNode[]>([]);
  const [recentIds] = useState<string[]>(getRecent());
  const [lastSavedHash, setLastSavedHash] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const userId = user?.uid;

  // TipTap editor with all extensions
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Placeholder.configure({ placeholder: 'Start writing... Type "/" for commands' }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "text-primary underline" } }),
      Image.configure({ inline: false }),
      TiptapTable.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
    ],
    content: selectedNote?.content || "",
    editable: true,
    onUpdate: ({ editor: e }) => {
      if (selectedNote) {
        const html = e.getHTML();
        setSelectedNote(prev => prev ? { ...prev, content: html } : null);
        setNotes(prev => prev.map(n => n.id === selectedNote.id ? { ...n, content: html } : n));
      }
    },
  });

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "k") { e.preventDefault(); setCmdPaletteOpen(true); }
      if (mod && e.key === "n") { e.preventDefault(); createNote(); }
      if (mod && e.key === "s") { e.preventDefault(); forceSave(); toast.success("Saved!"); }
      if (mod && e.key === "g") { e.preventDefault(); setViewMode(v => v === "graph" ? "editor" : "graph"); }
      if (mod && e.key === "\\") { e.preventDefault(); /* sidebar toggle could be added */ }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

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
      } catch { toast.error("Failed to load notes"); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [userId, isGuest]);

  // Sync editor when switching tabs
  useEffect(() => {
    if (editor && selectedNote) {
      const cur = editor.getHTML();
      if (cur !== selectedNote.content) editor.commands.setContent(selectedNote.content || "");
    }
  }, [activeTabId]);

  // Auto-save with version snapshots
  useEffect(() => {
    if (!selectedNote || !userId) return;
    const timer = setTimeout(async () => {
      try {
        const hash = selectedNote.content?.length.toString() || "0";
        await updateDoc(doc(db, "users", userId, "notes", selectedNote.id), {
          content: selectedNote.content,
          updatedAt: serverTimestamp(),
        });
        // Save version if content changed significantly
        if (hash !== lastSavedHash && Math.abs(parseInt(hash) - parseInt(lastSavedHash || "0")) > 50) {
          const v = (selectedNote.version || 0) + 1;
          await saveVersionSnapshot(userId, selectedNote.id, selectedNote.content, selectedNote.title, v);
          setNotes(prev => prev.map(n => n.id === selectedNote.id ? { ...n, version: v } : n));
          setLastSavedHash(hash);
        }
      } catch { /* silent */ }
    }, 2000);
    return () => clearTimeout(timer);
  }, [selectedNote?.content]);

  const forceSave = async () => {
    if (!selectedNote || !userId) return;
    await updateDoc(doc(db, "users", userId, "notes", selectedNote.id), {
      content: selectedNote.content,
      title: selectedNote.title,
      updatedAt: serverTimestamp(),
    });
  };

  const createNote = async (folderId = "root", templateData?: { title: string; content: string; tags: string[] }) => {
    if (!userId) { toast.error("Sign in to create notes"); return; }
    try {
      const newNote: Partial<NoteItem> = {
        title: templateData?.title || "Untitled",
        content: templateData?.content || "",
        folderId,
        tags: templateData?.tags || [],
        courseId: "",
        isPinned: false,
        isPublic: false,
        status: "draft",
        properties: {},
        version: 0,
        isArchived: false,
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
        name: "New Folder", parentId, order: folders.length,
      });
      setFolders(prev => [...prev, { id: ref.id, name: "New Folder", parentId, order: folders.length }]);
      setExpandedFolders(prev => new Set([...prev, parentId]));
      setRenamingId(ref.id);
      setRenameValue("New Folder");
    } catch { toast.error("Failed to create folder"); }
  };

  const openNote = (note: NoteItem) => {
    setSelectedNote(note);
    setActiveTabId(note.id);
    if (!openTabs.find(t => t.id === note.id)) setOpenTabs(prev => [...prev, note]);
    setViewMode("editor");
    pushRecent(note.id);
    setLastSavedHash(note.content?.length.toString() || "0");
  };

  const closeTab = (noteId: string) => {
    const newTabs = openTabs.filter(t => t.id !== noteId);
    setOpenTabs(newTabs);
    if (activeTabId === noteId) {
      if (newTabs.length > 0) {
        const last = newTabs[newTabs.length - 1];
        setSelectedNote(last);
        setActiveTabId(last.id);
      } else { setSelectedNote(null); setActiveTabId(null); }
    }
  };

  const deleteNote = async (noteId: string, permanent = false) => {
    if (!userId) return;
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    if (permanent || note.deletedAt) {
      if (!confirm("Permanently delete this note?")) return;
      await deleteDoc(doc(db, "users", userId, "notes", noteId));
      setNotes(prev => prev.filter(n => n.id !== noteId));
      closeTab(noteId);
      toast.success("Permanently deleted");
    } else {
      await updateDoc(doc(db, "users", userId, "notes", noteId), { deletedAt: serverTimestamp() });
      setNotes(prev => prev.map(n => n.id === noteId ? { ...n, deletedAt: new Date() } : n));
      closeTab(noteId);
      toast.success("Moved to trash");
    }
  };

  const restoreNote = async (noteId: string) => {
    if (!userId) return;
    await updateDoc(doc(db, "users", userId, "notes", noteId), { deletedAt: null });
    setNotes(prev => prev.map(n => n.id === noteId ? { ...n, deletedAt: null } : n));
    toast.success("Note restored");
  };

  const deleteFolder = async (folderId: string) => {
    if (!userId || !confirm("Delete this folder and all notes in it?")) return;
    const notesInFolder = notes.filter(n => n.folderId === folderId);
    for (const n of notesInFolder) await deleteDoc(doc(db, "users", userId, "notes", n.id));
    await deleteDoc(doc(db, "users", userId, "noteFolders", folderId));
    setFolders(prev => prev.filter(f => f.id !== folderId));
    setNotes(prev => prev.filter(n => n.folderId !== folderId));
    toast.success("Folder deleted");
  };

  const renameItem = async (id: string, type: "note" | "folder") => {
    if (!userId || !renameValue.trim()) return;
    if (type === "note") {
      await updateDoc(doc(db, "users", userId, "notes", id), { title: renameValue });
      setNotes(prev => prev.map(n => n.id === id ? { ...n, title: renameValue } : n));
      if (selectedNote?.id === id) setSelectedNote(prev => prev ? { ...prev, title: renameValue } : null);
      setOpenTabs(prev => prev.map(t => t.id === id ? { ...t, title: renameValue } : t));
    } else {
      await updateDoc(doc(db, "users", userId, "noteFolders", id), { name: renameValue });
      setFolders(prev => prev.map(f => f.id === id ? { ...f, name: renameValue } : f));
    }
    setRenamingId(null);
  };

  const togglePin = async (noteId: string) => {
    if (!userId) return;
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    await updateDoc(doc(db, "users", userId, "notes", noteId), { isPinned: !note.isPinned });
    setNotes(prev => prev.map(n => n.id === noteId ? { ...n, isPinned: !n.isPinned } : n));
  };

  const publishNote = async (noteId: string) => {
    if (!userId) return;
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    try {
      await setDoc(doc(db, "published_notes", noteId), {
        title: note.title,
        content: note.content,
        authorName: user?.email || "Anonymous",
        publishedAt: serverTimestamp(),
        noteId,
      });
      toast.success("Note published! Share link: /shared/" + noteId);
    } catch { toast.error("Failed to publish"); }
  };

  const updateNoteProperty = async (noteId: string, key: string, value: any) => {
    if (!userId) return;
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    const props = { ...(note.properties || {}), [key]: value };
    await updateDoc(doc(db, "users", userId, "notes", noteId), { properties: props });
    setNotes(prev => prev.map(n => n.id === noteId ? { ...n, properties: props } : n));
  };

  const addTag = async (noteId: string, tag: string) => {
    if (!userId || !tag.trim()) return;
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    const tags = [...new Set([...(note.tags || []), tag.trim()])];
    await updateDoc(doc(db, "users", userId, "notes", noteId), { tags });
    setNotes(prev => prev.map(n => n.id === noteId ? { ...n, tags } : n));
    if (selectedNote?.id === noteId) setSelectedNote(prev => prev ? { ...prev, tags } : null);
  };

  const removeTag = async (noteId: string, tag: string) => {
    if (!userId) return;
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    const tags = (note.tags || []).filter(t => t !== tag);
    await updateDoc(doc(db, "users", userId, "notes", noteId), { tags });
    setNotes(prev => prev.map(n => n.id === noteId ? { ...n, tags } : n));
    if (selectedNote?.id === noteId) setSelectedNote(prev => prev ? { ...prev, tags } : null);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      let content = ev.target?.result as string;
      if (file.name.endsWith(".md")) {
        content = content
          .replace(/^### (.+)$/gm, "<h3>$1</h3>")
          .replace(/^## (.+)$/gm, "<h2>$1</h2>")
          .replace(/^# (.+)$/gm, "<h1>$1</h1>")
          .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
          .replace(/\*(.+?)\*/g, "<em>$1</em>")
          .replace(/^- (.+)$/gm, "<li>$1</li>")
          .replace(/\n\n/g, "<br/>");
      }
      const ref = await addDoc(collection(db, "users", userId, "notes"), {
        title: file.name.replace(/\.\w+$/, ""), content, folderId: "root",
        tags: [], courseId: "", isPinned: false, isPublic: false, status: "draft",
        properties: {}, version: 0, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      });
      const note = { id: ref.id, title: file.name.replace(/\.\w+$/, ""), content, folderId: "root", tags: [], courseId: "", isPinned: false, isPublic: false, status: "draft", properties: {}, version: 0, createdAt: null, updatedAt: null } as NoteItem;
      setNotes(prev => [...prev, note]);
      openNote(note);
      toast.success("Imported!");
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
    d.text(d.splitTextToSize(plain, 180), 14, 35);
    d.save(`${selectedNote.title}.pdf`);
  };

  const exportMd = () => {
    if (!selectedNote) return;
    const plain = selectedNote.content.replace(/<[^>]+>/g, "");
    const blob = new Blob([`# ${selectedNote.title}\n\n${plain}`], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${selectedNote.title}.md`;
    a.click();
  };

  // Filter notes
  const activeNotes = useMemo(() => notes.filter(n => !n.deletedAt && !n.isArchived), [notes]);
  const trashedNotes = useMemo(() => notes.filter(n => n.deletedAt), [notes]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    activeNotes.forEach(n => n.tags?.forEach(t => set.add(t)));
    return [...set].sort();
  }, [activeNotes]);

  const filteredNotes = useMemo(() => {
    let result = activeNotes;
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(n => n.title?.toLowerCase().includes(s) || n.content?.replace(/<[^>]+>/g, "").toLowerCase().includes(s));
    }
    if (activeTags.length > 0) {
      result = result.filter(n => activeTags.some(t => n.tags?.includes(t)));
    }
    return result;
  }, [activeNotes, search, activeTags]);

  const toggleFolder = (id: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Canvas edges
  const canvasEdges = useMemo(() => {
    const result: { from: string; to: string }[] = [];
    notes.forEach(n => {
      const matches = n.content?.match(/\[\[([^\]]+)\]\]/g) || [];
      matches.forEach(m => {
        const title = m.replace(/\[\[|\]\]/g, "");
        const target = notes.find(t => t.title.toLowerCase() === title.toLowerCase() && t.id !== n.id);
        if (target) result.push({ from: n.id, to: target.id });
      });
    });
    return result;
  }, [notes]);

  // DnD
  const handleDragStart = (e: React.DragEvent, noteId: string) => e.dataTransfer.setData("noteId", noteId);
  const handleDrop = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    const noteId = e.dataTransfer.getData("noteId");
    if (!noteId || !userId) return;
    updateDoc(doc(db, "users", userId, "notes", noteId), { folderId });
    setNotes(prev => prev.map(n => n.id === noteId ? { ...n, folderId } : n));
  };

  // Pinned notes
  const pinnedNotes = useMemo(() => filteredNotes.filter(n => n.isPinned), [filteredNotes]);

  // Recent notes
  const recentNotes = useMemo(() => {
    return recentIds.map(id => activeNotes.find(n => n.id === id)).filter(Boolean).slice(0, 5) as NoteItem[];
  }, [recentIds, activeNotes]);

  // Sidebar folder tree
  const renderFolder = (folderId: string, depth = 0) => {
    const subFolders = folders.filter(f => f.parentId === folderId);
    const folderNotes = filteredNotes
      .filter(n => n.folderId === folderId && !n.isPinned)
      .sort((a, b) => a.title.localeCompare(b.title));
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
              <input autoFocus value={renameValue} onChange={e => setRenameValue(e.target.value)}
                onBlur={() => renameItem(folderId, "folder")} onKeyDown={e => e.key === "Enter" && renameItem(folderId, "folder")}
                className="text-xs bg-transparent border-b border-primary/30 outline-none flex-1 font-body" />
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
                <DropdownMenuItem onClick={() => createFolder(folderId)} className="text-xs font-body gap-2"><FolderPlus className="h-3 w-3" /> Subfolder</DropdownMenuItem>
                <DropdownMenuItem onClick={() => deleteFolder(folderId)} className="text-xs font-body gap-2 text-destructive"><Trash2 className="h-3 w-3" /> Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
        {(isExpanded || folderId === "root") && (
          <div className={cn(folderId !== "root" && "ml-3")}>
            {subFolders.map(sf => renderFolder(sf.id, depth + 1))}
            {folderNotes.map(note => renderNoteItem(note))}
          </div>
        )}
      </div>
    );
  };

  const renderNoteItem = (note: NoteItem) => (
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
        <input autoFocus value={renameValue} onChange={e => setRenameValue(e.target.value)}
          onBlur={() => renameItem(note.id, "note")} onKeyDown={e => e.key === "Enter" && renameItem(note.id, "note")}
          className="text-xs bg-transparent border-b border-primary/30 outline-none flex-1 font-body" onClick={e => e.stopPropagation()} />
      ) : (
        <span className="text-xs font-body truncate flex-1">{note.icon ? `${note.icon} ` : ""}{note.title}</span>
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
          <DropdownMenuItem onClick={() => publishNote(note.id)} className="text-xs font-body gap-2"><Globe className="h-3 w-3" /> Publish</DropdownMenuItem>
          <DropdownMenuItem onClick={() => deleteNote(note.id)} className="text-xs font-body gap-2 text-destructive"><Trash2 className="h-3 w-3" /> Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  // Tag input state
  const [tagInput, setTagInput] = useState("");

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
          {/* Header */}
          <div className="p-3 border-b border-border/40 space-y-2">
            <div className="flex items-center gap-1">
              <Button size="sm" variant="ghost" className="flex-1 justify-start gap-2 text-xs font-body h-8" onClick={() => createNote()}>
                <Plus className="h-3.5 w-3.5" /> Note
              </Button>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setTemplateOpen(true)} title="From template">
                <BookTemplate className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => createFolder()}>
                <FolderPlus className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search notes... (⌘K)"
                className="h-7 text-xs pl-7 bg-accent/30 border-border/30 font-body"
                onFocus={() => { if (!search) setCmdPaletteOpen(true); }}
              />
            </div>
          </div>

          {/* View toggles */}
          <div className="flex gap-0.5 p-2 border-b border-border/30">
            {([
              { mode: "editor" as ViewMode, icon: FileText, label: "Editor" },
              { mode: "graph" as ViewMode, icon: Network, label: "Graph" },
              { mode: "canvas" as ViewMode, icon: LayoutGrid, label: "Canvas" },
              { mode: "database" as ViewMode, icon: TableIcon, label: "Table" },
            ]).map(v => (
              <button key={v.mode} onClick={() => setViewMode(v.mode)}
                className={cn("flex-1 flex items-center justify-center gap-1 py-1 rounded text-[10px] font-body transition-colors",
                  viewMode === v.mode ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                )}>
                <v.icon className="h-3 w-3" /> {v.label}
              </button>
            ))}
          </div>

          {/* Tags filter */}
          {allTags.length > 0 && (
            <div className="border-b border-border/30">
              <TagFilter allTags={allTags} activeTags={activeTags}
                onToggleTag={t => setActiveTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])}
                onClear={() => setActiveTags([])}
              />
            </div>
          )}

          {/* Folder tree */}
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {loading ? (
              <div className="space-y-2 p-2">{[1, 2, 3].map(i => <div key={i} className="h-6 bg-accent/30 rounded animate-pulse" />)}</div>
            ) : (
              <>
                {/* Pinned */}
                {pinnedNotes.length > 0 && (
                  <div className="mb-2">
                    <p className="text-[10px] font-body font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-1 flex items-center gap-1"><Star className="h-3 w-3" /> Pinned</p>
                    {pinnedNotes.map(n => renderNoteItem(n))}
                  </div>
                )}
                {/* Recent */}
                {recentNotes.length > 0 && !search && (
                  <div className="mb-2">
                    <p className="text-[10px] font-body font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-1 flex items-center gap-1"><History className="h-3 w-3" /> Recent</p>
                    {recentNotes.slice(0, 3).map(n => renderNoteItem(n))}
                  </div>
                )}
                {/* All folders */}
                <p className="text-[10px] font-body font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-1">All Notes</p>
                {renderFolder("root")}
                {filteredNotes.length === 0 && folders.length === 0 && (
                  <div className="text-center py-8 px-3">
                    <FileText className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground font-body">No notes yet</p>
                    <Button size="sm" variant="ghost" className="mt-2 text-xs font-body gap-1" onClick={() => createNote()}>
                      <Plus className="h-3 w-3" /> Create your first note
                    </Button>
                  </div>
                )}

                {/* Trash */}
                {trashedNotes.length > 0 && (
                  <div className="mt-4 pt-2 border-t border-border/30">
                    <button onClick={() => setShowTrash(!showTrash)}
                      className="flex items-center gap-1 px-2 py-1 text-[10px] font-body font-semibold text-muted-foreground uppercase tracking-wider w-full hover:text-foreground transition-colors">
                      <Trash2 className="h-3 w-3" /> Trash ({trashedNotes.length})
                      {showTrash ? <ChevronDown className="h-3 w-3 ml-auto" /> : <ChevronRight className="h-3 w-3 ml-auto" />}
                    </button>
                    {showTrash && trashedNotes.map(n => (
                      <div key={n.id} className="flex items-center gap-1.5 py-1 px-2 ml-3 rounded-lg text-muted-foreground group">
                        <FileText className="h-3.5 w-3.5 shrink-0" />
                        <span className="text-xs font-body truncate flex-1 line-through">{n.title}</span>
                        <button onClick={() => restoreNote(n.id)} className="opacity-0 group-hover:opacity-100 text-xs font-body text-primary" title="Restore">
                          <Undo2 className="h-3 w-3" />
                        </button>
                        <button onClick={() => deleteNote(n.id, true)} className="opacity-0 group-hover:opacity-100 text-xs text-destructive" title="Delete forever">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="p-2 border-t border-border/40 flex gap-1">
            <Button size="sm" variant="ghost" className="flex-1 text-xs font-body gap-1 h-7" onClick={() => setImportOpen(true)}>
              <Upload className="h-3 w-3" /> Import
            </Button>
            <Button size="sm" variant="ghost" className="flex-1 text-xs font-body gap-1 h-7"
              onClick={() => setExpandedFolders(new Set(["root", ...folders.map(f => f.id)]))}>
              Expand All
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 relative">
          {/* Tabs */}
          {openTabs.length > 0 && (
            <div className="flex items-center border-b border-border/40 bg-card/30 overflow-x-auto">
              {openTabs.map(tab => (
                <div key={tab.id}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 text-xs font-body cursor-pointer border-r border-border/30 min-w-0 max-w-[180px] group transition-colors",
                    activeTabId === tab.id ? "bg-background text-foreground border-b-2 border-b-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent/30"
                  )}
                  onClick={() => { setSelectedNote(notes.find(n => n.id === tab.id) || tab); setActiveTabId(tab.id); setViewMode("editor"); }}
                >
                  <FileText className="h-3 w-3 shrink-0" />
                  <span className="truncate">{tab.title}</span>
                  <button onClick={e => { e.stopPropagation(); closeTab(tab.id); }}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground shrink-0">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Content area */}
          {viewMode === "graph" ? (
            <GraphView notes={activeNotes} onSelectNote={id => { const n = notes.find(x => x.id === id); if (n) openNote(n); }} />
          ) : viewMode === "canvas" ? (
            <CanvasView
              notes={activeNotes}
              canvasNodes={canvasNodes}
              onUpdateNodes={setCanvasNodes}
              onSelectNote={id => { const n = notes.find(x => x.id === id); if (n) openNote(n); }}
              edges={canvasEdges}
            />
          ) : viewMode === "database" ? (
            <DatabaseView
              notes={activeNotes.map(n => ({ id: n.id, title: n.title, properties: n.properties || {} }))}
              onUpdateProperty={updateNoteProperty}
              onSelectNote={id => { const n = notes.find(x => x.id === id); if (n) openNote(n); }}
            />
          ) : selectedNote ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Note toolbar */}
              <div className="flex items-center justify-between px-4 py-2 border-b border-border/30 bg-card/20">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-heading font-semibold truncate max-w-[300px]">{selectedNote.title}</h2>
                  {selectedNote.isPinned && <Pin className="h-3 w-3 text-primary" />}
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" className="h-7 text-xs font-body gap-1" onClick={() => togglePin(selectedNote.id)}>
                    <Pin className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs font-body gap-1" onClick={() => setHistoryOpen(true)}>
                    <History className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs font-body gap-1" onClick={() => setShowBacklinks(!showBacklinks)}>
                    {showBacklinks ? <PanelRightClose className="h-3 w-3" /> : <PanelRightOpen className="h-3 w-3" />}
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="ghost" className="h-7 text-xs font-body gap-1"><Download className="h-3 w-3" /> Export</Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={exportPdf} className="text-xs font-body gap-2">PDF</DropdownMenuItem>
                      <DropdownMenuItem onClick={exportMd} className="text-xs font-body gap-2">Markdown</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button size="sm" variant="ghost" className="h-7 text-xs font-body gap-1" onClick={() => publishNote(selectedNote.id)}>
                    <Globe className="h-3 w-3" /> Publish
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
                    <button key={i} onClick={btn.action}
                      className={cn("h-7 w-7 rounded flex items-center justify-center text-xs transition-colors",
                        btn.active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                      )}>
                      <span className={btn.style}>{btn.label}</span>
                    </button>
                  ))}
                  <div className="h-4 w-px bg-border/40 mx-1" />
                  {[1, 2, 3].map(level => (
                    <button key={level}
                      onClick={() => editor.chain().focus().toggleHeading({ level: level as 1 | 2 | 3 }).run()}
                      className={cn("h-7 px-1.5 rounded flex items-center justify-center text-[10px] font-body transition-colors",
                        editor.isActive("heading", { level }) ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                      )}>
                      H{level}
                    </button>
                  ))}
                  <div className="h-4 w-px bg-border/40 mx-1" />
                  <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={cn("h-7 w-7 rounded flex items-center justify-center text-xs", editor.isActive("bulletList") ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent/50")}>•</button>
                  <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={cn("h-7 w-7 rounded flex items-center justify-center text-xs", editor.isActive("orderedList") ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent/50")}>1.</button>
                  <button onClick={() => editor.chain().focus().toggleTaskList().run()} className={cn("h-7 w-7 rounded flex items-center justify-center", editor.isActive("taskList") ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent/50")}><CheckSquare className="h-3.5 w-3.5" /></button>
                  <button onClick={() => editor.chain().focus().toggleBlockquote().run()} className={cn("h-7 w-7 rounded flex items-center justify-center text-xs", editor.isActive("blockquote") ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent/50")}>"</button>
                  <button onClick={() => editor.chain().focus().toggleCodeBlock().run()} className={cn("h-7 px-1.5 rounded flex items-center justify-center text-[10px] font-mono", editor.isActive("codeBlock") ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent/50")}>{"{ }"}</button>
                  <button onClick={() => editor.chain().focus().toggleHighlight().run()} className={cn("h-7 w-7 rounded flex items-center justify-center", editor.isActive("highlight") ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent/50")}><Highlighter className="h-3.5 w-3.5" /></button>
                  <button onClick={() => editor.chain().focus().setHorizontalRule().run()} className="h-7 w-7 rounded flex items-center justify-center text-xs text-muted-foreground hover:text-foreground hover:bg-accent/50">—</button>
                </div>
              )}

              <div className="flex flex-1 overflow-hidden">
                {/* Editor content */}
                <div className="flex-1 overflow-y-auto">
                  {/* Tags bar */}
                  {selectedNote && (
                    <div className="flex items-center gap-1 px-8 pt-4 flex-wrap">
                      {selectedNote.tags?.map(tag => (
                        <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-body">
                          {tag}
                          <button onClick={() => removeTag(selectedNote.id, tag)}><X className="h-2.5 w-2.5" /></button>
                        </span>
                      ))}
                      <div className="flex items-center gap-1">
                        <input value={tagInput} onChange={e => setTagInput(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter" && tagInput) { addTag(selectedNote.id, tagInput); setTagInput(""); } }}
                          placeholder="+ tag" className="text-[10px] font-body bg-transparent outline-none w-16 text-muted-foreground" />
                      </div>
                    </div>
                  )}
                  <div className="max-w-3xl mx-auto px-8 py-4">
                    <div className="prose prose-sm dark:prose-invert max-w-none font-body [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[400px] [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-muted-foreground [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0 [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none [&_.ProseMirror_ul[data-type=taskList]]:list-none [&_.ProseMirror_ul[data-type=taskList]]:pl-0 [&_.ProseMirror_ul[data-type=taskList]_li]:flex [&_.ProseMirror_ul[data-type=taskList]_li]:items-start [&_.ProseMirror_ul[data-type=taskList]_li]:gap-2 [&_.ProseMirror_table]:border-collapse [&_.ProseMirror_td]:border [&_.ProseMirror_td]:border-border/50 [&_.ProseMirror_td]:p-2 [&_.ProseMirror_th]:border [&_.ProseMirror_th]:border-border/50 [&_.ProseMirror_th]:p-2 [&_.ProseMirror_th]:bg-accent/30 [&_.ProseMirror_mark]:bg-yellow-200 [&_.ProseMirror_mark]:dark:bg-yellow-800">
                      {editor && <SlashCommandMenu editor={editor} />}
                      <EditorContent editor={editor} />
                    </div>
                  </div>
                </div>

                {/* Backlinks panel */}
                {showBacklinks && selectedNote && (
                  <div className="w-56 shrink-0 border-l border-border/40 bg-card/30 overflow-y-auto">
                    <div className="p-3 border-b border-border/30">
                      <h3 className="text-xs font-body font-semibold text-muted-foreground flex items-center gap-1">
                        <LinkIcon className="h-3 w-3" /> Backlinks
                      </h3>
                    </div>
                    <BacklinksPanel
                      currentNoteId={selectedNote.id}
                      notes={activeNotes}
                      onSelectNote={id => { const n = notes.find(x => x.id === id); if (n) openNote(n); }}
                    />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <FileText className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground font-body">Select a note or create a new one</p>
                <div className="flex items-center gap-2 justify-center mt-3">
                  <Button size="sm" variant="outline" className="font-body gap-2 text-xs" onClick={() => createNote()}>
                    <Plus className="h-3 w-3" /> New Note
                  </Button>
                  <Button size="sm" variant="outline" className="font-body gap-2 text-xs" onClick={() => setTemplateOpen(true)}>
                    <BookTemplate className="h-3 w-3" /> From Template
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground/60 font-body mt-4">⌘K to search · ⌘N new note · ⌘G graph</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <CommandPalette open={cmdPaletteOpen} onOpenChange={setCmdPaletteOpen}
        notes={activeNotes} recentIds={recentIds}
        onSelectNote={id => { const n = notes.find(x => x.id === id); if (n) openNote(n); setCmdPaletteOpen(false); }}
        onCreateNote={() => createNote()} onCreateFolder={() => createFolder()}
        onToggleGraph={() => setViewMode(v => v === "graph" ? "editor" : "graph")}
        onToggleCanvas={() => setViewMode(v => v === "canvas" ? "editor" : "canvas")}
      />

      <TemplatePickerModal open={templateOpen} onOpenChange={setTemplateOpen}
        onSelect={t => createNote("root", t)}
      />

      {selectedNote && userId && (
        <VersionHistory open={historyOpen} onOpenChange={setHistoryOpen}
          userId={userId} noteId={selectedNote.id}
          currentContent={selectedNote.content} currentTitle={selectedNote.title}
          onRestore={content => {
            if (!selectedNote) return;
            setSelectedNote(prev => prev ? { ...prev, content } : null);
            setNotes(prev => prev.map(n => n.id === selectedNote.id ? { ...n, content } : n));
            editor?.commands.setContent(content);
          }}
        />
      )}

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading">Import Notes</DialogTitle>
            <DialogDescription className="font-body">Import .md, .html, or .txt files</DialogDescription>
          </DialogHeader>
          <Button variant="outline" className="w-full font-body gap-2" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4" /> Choose File
          </Button>
          <input ref={fileInputRef} type="file" accept=".md,.html,.txt,.json" className="hidden" onChange={handleImport} />
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Notes;
