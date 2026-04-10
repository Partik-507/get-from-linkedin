import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Layout } from "@/components/Layout";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { FileText, X, Globe, BookOpen } from "lucide-react";
import { NotesSidebar } from "@/components/notes/NotesSidebar";
import { NoteEditor } from "@/components/notes/NoteEditor";
import { CommandPalette } from "@/components/notes/CommandPalette";
import { GraphView } from "@/components/notes/GraphView";
import { CanvasView } from "@/components/notes/CanvasView";
import { DatabaseView } from "@/components/notes/DatabaseView";
import { BacklinksPanel } from "@/components/notes/BacklinksPanel";
import { TemplatePickerModal } from "@/components/notes/TemplatePickerModal";
import { VersionHistory, saveVersionSnapshot } from "@/components/notes/VersionHistory";
import { PublicLibrary } from "@/components/notes/PublicLibrary";
import { PublishModal } from "@/components/notes/PublishModal";
import { ImportExportModal } from "@/components/notes/ImportExport";
import {
  fetchNoteMetadata, fetchNoteContent, saveNoteContent, pushRecentNoteId,
  createNote as createNoteFS, updateNoteMetadata, deleteNote as deleteNoteFS,
  restoreNote as restoreNoteFS, fetchFolders, createFolder as createFolderFS,
  updateFolder, deleteFolder as deleteFolderFS, publishNote as publishNoteFS,
  extractNoteLinks, saveVersionSnapshot as saveVersion,
  type NoteMetadata, type FolderItem,
} from "@/lib/notesFirestore";

type ViewMode = "editor" | "graph" | "canvas" | "database";
type World = "workspace" | "library";

interface CanvasNode { noteId: string; x: number; y: number; width: number; height: number; }

const Notes = () => {
  const { user, isGuest } = useAuth();
  const [notes, setNotes] = useState<NoteMetadata[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [contents, setContents] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [openTabIds, setOpenTabIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("editor");
  const [world, setWorld] = useState<World>("workspace");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showBacklinks, setShowBacklinks] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [canvasNodes, setCanvasNodes] = useState<CanvasNode[]>([]);
  const [cmdPaletteOpen, setCmdPaletteOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [publishNoteId, setPublishNoteId] = useState<string | null>(null);
  const [lastSavedHash, setLastSavedHash] = useState("");
  const userId = user?.uid;

  const selectedNote = useMemo(() => notes.find(n => n.id === selectedNoteId) || null, [notes, selectedNoteId]);
  const activeNotes = useMemo(() => notes.filter(n => !n.deletedAt && !n.isArchived), [notes]);

  // Load data
  useEffect(() => {
    document.title = "Notes OS — VivaVault";
    if (!userId && !isGuest) { setLoading(false); return; }
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
  }, [userId, isGuest]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "k") { e.preventDefault(); setCmdPaletteOpen(true); }
      if (mod && e.key === "n") { e.preventDefault(); handleCreateNote(); }
      if (mod && e.key === "s") { e.preventDefault(); handleForceSave(); toast.success("Saved!"); }
      if (mod && e.key === "g") { e.preventDefault(); setViewMode(v => v === "graph" ? "editor" : "graph"); }
      if (mod && e.key === "\\") { e.preventDefault(); setSidebarCollapsed(c => !c); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Auto-save with debounce
  useEffect(() => {
    if (!selectedNoteId || !userId) return;
    const content = contents[selectedNoteId];
    if (content === undefined) return;
    const timer = setTimeout(async () => {
      try {
        const hash = (content?.length || 0).toString();
        await saveNoteContent(userId, selectedNoteId, content);
        // Version snapshot if significant change
        if (hash !== lastSavedHash && Math.abs(parseInt(hash) - parseInt(lastSavedHash || "0")) > 50) {
          const note = notes.find(n => n.id === selectedNoteId);
          const v = (note?.version || 0) + 1;
          await saveVersion(userId, selectedNoteId, content, note?.title || "", v);
          setNotes(prev => prev.map(n => n.id === selectedNoteId ? { ...n, version: v } : n));
          setLastSavedHash(hash);
        }
        // Update linked note IDs
        const linkedIds = extractNoteLinks(content, notes);
        if (JSON.stringify(linkedIds) !== JSON.stringify(selectedNote?.linkedNoteIds || [])) {
          await updateNoteMetadata(userId, selectedNoteId, { linkedNoteIds: linkedIds } as any);
          setNotes(prev => prev.map(n => n.id === selectedNoteId ? { ...n, linkedNoteIds: linkedIds } : n));
        }
      } catch { /* silent */ }
    }, 1500);
    return () => clearTimeout(timer);
  }, [contents[selectedNoteId]]);

  const handleForceSave = async () => {
    if (!selectedNoteId || !userId) return;
    const content = contents[selectedNoteId] || "";
    await saveNoteContent(userId, selectedNoteId, content);
  };

  const loadContent = async (noteId: string) => {
    if (contents[noteId] !== undefined || !userId) return;
    const content = await fetchNoteContent(userId, noteId);
    setContents(prev => ({ ...prev, [noteId]: content }));
  };

  const openNote = async (note: NoteMetadata) => {
    setSelectedNoteId(note.id);
    if (!openTabIds.includes(note.id)) setOpenTabIds(prev => [...prev, note.id]);
    setViewMode("editor");
    pushRecentNoteId(note.id);
    await loadContent(note.id);
    setLastSavedHash((contents[note.id]?.length || 0).toString());
  };

  const closeTab = (noteId: string) => {
    const newTabs = openTabIds.filter(id => id !== noteId);
    setOpenTabIds(newTabs);
    if (selectedNoteId === noteId) {
      if (newTabs.length > 0) {
        const lastId = newTabs[newTabs.length - 1];
        setSelectedNoteId(lastId);
      } else { setSelectedNoteId(null); }
    }
  };

  const handleCreateNote = async (folderId = "root", templateData?: { title: string; content: string; tags: string[] }) => {
    if (!userId) { toast.error("Sign in to create notes"); return; }
    try {
      const note = await createNoteFS(userId, {
        title: templateData?.title || "Untitled",
        folderId,
        tags: templateData?.tags || [],
      }, templateData?.content || "");
      setNotes(prev => [...prev, note]);
      setContents(prev => ({ ...prev, [note.id]: templateData?.content || "" }));
      openNote(note);
      toast.success("Note created");
    } catch { toast.error("Failed to create note"); }
  };

  const handleCreateFolder = async (parentId = "root") => {
    if (!userId) return;
    try {
      const folder = await createFolderFS(userId, "New Folder", parentId, folders.length);
      setFolders(prev => [...prev, folder]);
    } catch { toast.error("Failed to create folder"); }
  };

  const handleDeleteNote = async (noteId: string, permanent = false) => {
    if (!userId) return;
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    if (permanent || note.deletedAt) {
      if (!confirm("Permanently delete this note?")) return;
      await deleteNoteFS(userId, noteId, true);
      setNotes(prev => prev.filter(n => n.id !== noteId));
      closeTab(noteId);
      toast.success("Permanently deleted");
    } else {
      await deleteNoteFS(userId, noteId, false);
      setNotes(prev => prev.map(n => n.id === noteId ? { ...n, deletedAt: new Date() } : n));
      closeTab(noteId);
      toast.success("Moved to trash");
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!userId || !confirm("Delete this folder and all notes?")) return;
    const notesInFolder = notes.filter(n => n.folderId === folderId);
    for (const n of notesInFolder) await deleteNoteFS(userId, n.id, true);
    await deleteFolderFS(userId, folderId);
    setFolders(prev => prev.filter(f => f.id !== folderId));
    setNotes(prev => prev.filter(n => n.folderId !== folderId));
    toast.success("Folder deleted");
  };

  const handleRenameNote = async (id: string, name: string) => {
    if (!userId) return;
    await updateNoteMetadata(userId, id, { title: name } as any);
    setNotes(prev => prev.map(n => n.id === id ? { ...n, title: name } : n));
  };

  const handleRenameFolder = async (id: string, name: string) => {
    if (!userId) return;
    await updateFolder(userId, id, { name });
    setFolders(prev => prev.map(f => f.id === id ? { ...f, name } : f));
  };

  const handleTogglePin = async (id: string) => {
    if (!userId) return;
    const note = notes.find(n => n.id === id);
    if (!note) return;
    await updateNoteMetadata(userId, id, { isPinned: !note.isPinned } as any);
    setNotes(prev => prev.map(n => n.id === id ? { ...n, isPinned: !n.isPinned } : n));
  };

  const handleMoveNote = async (noteId: string, folderId: string) => {
    if (!userId) return;
    await updateNoteMetadata(userId, noteId, { folderId } as any);
    setNotes(prev => prev.map(n => n.id === noteId ? { ...n, folderId } : n));
  };

  const handleRestoreNote = async (id: string) => {
    if (!userId) return;
    await restoreNoteFS(userId, id);
    setNotes(prev => prev.map(n => n.id === id ? { ...n, deletedAt: null } : n));
    toast.success("Restored");
  };

  const handleAddTag = async (tag: string) => {
    if (!selectedNoteId || !userId) return;
    const note = notes.find(n => n.id === selectedNoteId);
    if (!note) return;
    const tags = [...new Set([...(note.tags || []), tag])];
    await updateNoteMetadata(userId, selectedNoteId, { tags } as any);
    setNotes(prev => prev.map(n => n.id === selectedNoteId ? { ...n, tags } : n));
  };

  const handleRemoveTag = async (tag: string) => {
    if (!selectedNoteId || !userId) return;
    const note = notes.find(n => n.id === selectedNoteId);
    if (!note) return;
    const tags = (note.tags || []).filter(t => t !== tag);
    await updateNoteMetadata(userId, selectedNoteId, { tags } as any);
    setNotes(prev => prev.map(n => n.id === selectedNoteId ? { ...n, tags } : n));
  };

  const handleContentChange = (html: string) => {
    if (!selectedNoteId) return;
    setContents(prev => ({ ...prev, [selectedNoteId]: html }));
  };

  const handlePublish = async (data: { description: string; subject: string; branch: string; level: string; tags: string[] }) => {
    if (!userId || !publishNoteId) return;
    const note = notes.find(n => n.id === publishNoteId);
    if (!note) return;
    const content = contents[publishNoteId] || "";
    await publishNoteFS(userId, publishNoteId, content, {
      title: note.title, description: data.description, tags: data.tags,
      subject: data.subject, branch: data.branch, level: data.level,
      authorName: user?.email || "Anonymous",
    });
    setNotes(prev => prev.map(n => n.id === publishNoteId ? { ...n, isPublic: true } : n));
  };

  const handleExportMd = () => {
    if (!selectedNote) return;
    const content = contents[selectedNoteId!] || "";
    const plain = content.replace(/<[^>]+>/g, "");
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

  const handleImport = (title: string, content: string) => {
    handleCreateNote("root", { title, content, tags: [] });
  };

  const handleRestore = (content: string) => {
    if (!selectedNoteId) return;
    setContents(prev => ({ ...prev, [selectedNoteId]: content }));
  };

  const handleUpdateProperty = async (noteId: string, key: string, value: any) => {
    if (!userId) return;
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    const props = { ...(note.properties || {}), [key]: value };
    await updateNoteMetadata(userId, noteId, { properties: props } as any);
    setNotes(prev => prev.map(n => n.id === noteId ? { ...n, properties: props } : n));
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

  return (
    <Layout fullBleed hideBottomNav>
    <div className="flex-1 flex flex-col bg-background overflow-hidden">
      {/* Top bar */}
      {!focusMode && (
        <div className="h-10 shrink-0 border-b border-border/30 flex items-center justify-between px-4 bg-card/30">
          <div className="flex items-center gap-2 text-xs font-body text-muted-foreground/60">
            <FileText className="h-3.5 w-3.5" />
            <span>Notes OS</span>
            {selectedNote && (
              <>
                <span className="text-muted-foreground/30">/</span>
                <span className="text-foreground/80">{selectedNote.title}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setWorld("workspace")}
              className={cn("px-3 py-1 rounded-l-lg text-xs font-body transition-all",
                world === "workspace" ? "bg-primary text-primary-foreground" : "bg-accent/30 text-muted-foreground hover:bg-accent/50"
              )}
            >My Workspace</button>
            <button
              onClick={() => setWorld("library")}
              className={cn("px-3 py-1 rounded-r-lg text-xs font-body transition-all",
                world === "library" ? "bg-primary text-primary-foreground" : "bg-accent/30 text-muted-foreground hover:bg-accent/50"
              )}
            ><Globe className="h-3 w-3 inline mr-1" />Public Library</button>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        <AnimatePresence mode="wait">
          {world === "library" ? (
            <motion.div key="library" className="flex-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <PublicLibrary />
            </motion.div>
          ) : (
            <motion.div key="workspace" className="flex-1 flex" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              {/* Sidebar */}
              {!focusMode && (
                <NotesSidebar
                  notes={notes} folders={folders} activeNoteId={selectedNoteId}
                  viewMode={viewMode} loading={loading} collapsed={sidebarCollapsed}
                  search={search} activeTags={activeTags}
                  onSearchChange={setSearch}
                  onSelectNote={n => openNote(n)}
                  onCreateNote={(fid) => handleCreateNote(fid)}
                  onCreateFolder={(pid) => handleCreateFolder(pid)}
                  onDeleteNote={handleDeleteNote}
                  onDeleteFolder={handleDeleteFolder}
                  onRenameNote={handleRenameNote}
                  onRenameFolder={handleRenameFolder}
                  onTogglePin={handleTogglePin}
                  onPublish={(id) => setPublishNoteId(id)}
                  onMoveNote={handleMoveNote}
                  onRestoreNote={handleRestoreNote}
                  onSetViewMode={setViewMode}
                  onToggleCollapse={() => setSidebarCollapsed(c => !c)}
                  onOpenTemplate={() => setTemplateOpen(true)}
                  onOpenImport={() => setImportOpen(true)}
                  onOpenCommandPalette={() => setCmdPaletteOpen(true)}
                  onToggleTag={t => setActiveTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])}
                  onClearTags={() => setActiveTags([])}
                />
              )}

              {/* Main area */}
              <div className="flex-1 flex flex-col min-w-0">
                {/* Tabs */}
                {openTabIds.length > 0 && viewMode === "editor" && !focusMode && (
                  <div className="flex items-center border-b border-border/20 bg-card/20 overflow-x-auto shrink-0">
                    {openTabIds.map(tabId => {
                      const note = notes.find(n => n.id === tabId);
                      if (!note) return null;
                      return (
                        <div key={tabId}
                          className={cn(
                            "flex items-center gap-2 px-3 py-1.5 text-xs font-body cursor-pointer border-r border-border/20 min-w-0 max-w-[180px] group transition-all",
                            selectedNoteId === tabId ? "bg-background text-foreground border-b-2 border-b-primary" : "text-muted-foreground/60 hover:text-foreground hover:bg-accent/20"
                          )}
                          onClick={() => openNote(note)}
                        >
                          <FileText className="h-3 w-3 shrink-0" />
                          <span className="truncate">{note.title}</span>
                          <button onClick={e => { e.stopPropagation(); closeTab(tabId); }}
                            className="opacity-0 group-hover:opacity-100 shrink-0">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Views */}
                {viewMode === "graph" ? (
                  <GraphView notes={activeNotes} contents={contents} onSelectNote={id => { const n = notes.find(x => x.id === id); if (n) openNote(n); }} />
                ) : viewMode === "canvas" ? (
                  <CanvasView notes={activeNotes} canvasNodes={canvasNodes} onUpdateNodes={setCanvasNodes}
                    onSelectNote={id => { const n = notes.find(x => x.id === id); if (n) openNote(n); }} contents={contents} />
                ) : viewMode === "database" ? (
                  <DatabaseView notes={activeNotes}
                    onSelectNote={id => { const n = notes.find(x => x.id === id); if (n) openNote(n); }}
                    onUpdateProperty={handleUpdateProperty} />
                ) : selectedNote ? (
                  <NoteEditor
                    note={selectedNote}
                    content={contents[selectedNoteId!] || ""}
                    onContentChange={handleContentChange}
                    onTitleChange={(title: string) => handleRenameNote(selectedNoteId!, title)}
                    onAddTag={handleAddTag}
                    onRemoveTag={handleRemoveTag}
                    onTogglePin={() => handleTogglePin(selectedNoteId!)}
                    onOpenHistory={() => setHistoryOpen(true)}
                    onExportPdf={handleExportPdf}
                    onExportMd={handleExportMd}
                    onToggleBacklinks={() => setShowBacklinks(b => !b)}
                    showBacklinks={showBacklinks}
                    focusMode={focusMode}
                    onToggleFocus={() => setFocusMode(f => !f)}
                  />
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <FileText className="h-12 w-12 text-muted-foreground/15 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground/40 font-body">Select a note or create a new one</p>
                      <Button size="sm" variant="outline" className="mt-3 text-xs font-body" onClick={() => handleCreateNote()}>
                        Create Note
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Backlinks panel */}
              {showBacklinks && selectedNoteId && viewMode === "editor" && (
                <BacklinksPanel
                  currentNoteId={selectedNoteId}
                  notes={activeNotes}
                  contents={contents}
                  onSelectNote={id => { const n = notes.find(x => x.id === id); if (n) openNote(n); }}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modals */}
      <CommandPalette open={cmdPaletteOpen} onClose={() => setCmdPaletteOpen(false)}
        notes={activeNotes} onSelectNote={n => openNote(n)} onCreateNote={() => handleCreateNote()}
        onSetView={v => setViewMode(v as ViewMode)} />

      <TemplatePickerModal open={templateOpen} onClose={() => setTemplateOpen(false)}
        onSelect={t => handleCreateNote("root", t)} />

      {historyOpen && selectedNoteId && userId && (
        <VersionHistory open={historyOpen} onClose={() => setHistoryOpen(false)}
          userId={userId} noteId={selectedNoteId}
          currentContent={contents[selectedNoteId] || ""}
          onRestore={handleRestore} />
      )}

      {publishNoteId && (
        <PublishModal open={!!publishNoteId} onClose={() => setPublishNoteId(null)}
          onPublish={handlePublish}
          noteTitle={notes.find(n => n.id === publishNoteId)?.title || ""}
          existingTags={notes.find(n => n.id === publishNoteId)?.tags || []} />
      )}

      <ImportExportModal open={importOpen} onClose={() => setImportOpen(false)} onImport={handleImport} />
    </div>
    </Layout>
  );
};

export default Notes;
