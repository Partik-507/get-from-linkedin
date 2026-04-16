import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  Plus, Search, FileText, Folder, ChevronRight, ChevronDown,
  MoreHorizontal, Trash2, Pencil, Pin, Globe, Star, Undo2,
  FolderOpen, Settings, Upload, Hash, GripVertical, X,
  PanelLeftClose, PanelLeftOpen, BookTemplate, Network,
  Table as TableIcon, History as HistoryIcon, FileArchive,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import type { NoteMetadata, FolderItem } from "@/lib/notesFirestore";

type ViewMode = "editor" | "graph" | "canvas" | "database";

interface Props {
  notes: NoteMetadata[];
  folders: FolderItem[];
  activeNoteId: string | null;
  viewMode: ViewMode;
  loading: boolean;
  collapsed: boolean;
  search: string;
  activeTags: string[];
  onSearchChange: (s: string) => void;
  onSelectNote: (note: NoteMetadata) => void;
  onCreateNote: (folderId?: string) => void;
  onCreateFolder: (parentId?: string) => void;
  onDeleteNote: (id: string, permanent?: boolean) => void;
  onDeleteFolder: (id: string) => void;
  onRenameNote: (id: string, name: string) => void;
  onRenameFolder: (id: string, name: string) => void;
  onTogglePin: (id: string) => void;
  onPublish: (id: string) => void;
  onMoveNote: (noteId: string, folderId: string) => void;
  onRestoreNote: (id: string) => void;
  onSetViewMode: (mode: ViewMode) => void;
  onToggleCollapse: () => void;
  onOpenTemplate: () => void;
  onOpenImport: () => void;
  onOpenNotionImport?: () => void;
  onOpenCommandPalette: () => void;
  onToggleTag: (tag: string) => void;
  onClearTags: () => void;
  readOnly?: boolean;
}

export const NotesSidebar = ({
  notes, folders, activeNoteId, viewMode, loading, search, activeTags,
  onSearchChange, onSelectNote, onCreateNote, onCreateFolder, onDeleteNote, onDeleteFolder,
  onRenameNote, onRenameFolder, onTogglePin, onPublish, onMoveNote, onRestoreNote,
  onSetViewMode, onToggleCollapse, onOpenTemplate, onOpenImport, onOpenNotionImport, onOpenCommandPalette,
  onToggleTag, onClearTags, readOnly = false, collapsed = false,
}: Props) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(["root"]));
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [showTrash, setShowTrash] = useState(false);
  const [showFavorites, setShowFavorites] = useState(true);
  const [showAllPages, setShowAllPages] = useState(true);
  const [showRecents, setShowRecents] = useState(true);

  const activeNotes = useMemo(() => notes.filter(n => !n.deletedAt && !n.isArchived), [notes]);
  const trashedNotes = useMemo(() => notes.filter(n => n.deletedAt), [notes]);
  const pinnedNotes = useMemo(() => activeNotes.filter(n => n.isPinned), [activeNotes]);

  const recentIds = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("vv_recent_notes") || "[]") as string[]; }
    catch { return []; }
  }, []);
  const recentNotes = useMemo(() =>
    recentIds.map(id => activeNotes.find(n => n.id === id)).filter(Boolean).slice(0, 7) as NoteMetadata[],
    [recentIds, activeNotes]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    activeNotes.forEach(n => n.tags?.forEach(t => set.add(t)));
    return [...set].sort();
  }, [activeNotes]);

  const filteredNotes = useMemo(() => {
    let result = activeNotes;
    if (search) result = result.filter(n => n.title?.toLowerCase().includes(search.toLowerCase()));
    if (activeTags.length > 0) result = result.filter(n => activeTags.some(t => n.tags?.includes(t)));
    return result;
  }, [activeNotes, search, activeTags]);

  const toggleFolder = (id: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleRename = (id: string, type: "note" | "folder") => {
    if (!renameValue.trim()) { setRenamingId(null); return; }
    if (type === "note") onRenameNote(id, renameValue);
    else onRenameFolder(id, renameValue);
    setRenamingId(null);
  };

  const handleDragStart = (e: React.DragEvent, noteId: string) => e.dataTransfer.setData("noteId", noteId);
  const handleDrop = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    const noteId = e.dataTransfer.getData("noteId");
    if (noteId) onMoveNote(noteId, folderId);
  };

  // ── Note context menu ──────────────────────────────────────────────────────
  const NoteMenu = ({ note }: { note: NoteMetadata }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="opacity-0 group-hover:opacity-100 h-6 w-6 flex items-center justify-center rounded-md hover:bg-sidebar-accent text-muted-foreground hover:text-foreground transition-all ml-auto shrink-0"
          onClick={e => e.stopPropagation()}>
          <MoreHorizontal className="h-3.5 w-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48 font-body text-xs">
        <DropdownMenuItem onClick={() => onSelectNote(note)} className="gap-2 text-xs">Open</DropdownMenuItem>
        <DropdownMenuItem onClick={() => { setRenamingId(note.id); setRenameValue(note.title); }} className="gap-2 text-xs">
          <Pencil className="h-3 w-3" /> Rename
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onTogglePin(note.id)} className="gap-2 text-xs">
          <Pin className="h-3 w-3" /> {note.isPinned ? "Unpin" : "Add to Favourites"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="gap-2 text-xs"><FolderOpen className="h-3 w-3" /> Move to</DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-40 font-body">
            <DropdownMenuItem className="text-xs" onClick={() => onMoveNote(note.id, "root")}>Root level</DropdownMenuItem>
            {folders.map(f => (
              <DropdownMenuItem key={f.id} className="text-xs" onClick={() => onMoveNote(note.id, f.id)}>{f.name}</DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem onClick={() => onPublish(note.id)} className="gap-2 text-xs">
          <Globe className="h-3 w-3" /> Publish
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onDeleteNote(note.id)} className="gap-2 text-xs text-destructive">
          <Trash2 className="h-3 w-3" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // ── Note row ───────────────────────────────────────────────────────────────
  const renderNoteRow = (note: NoteMetadata, depth = 0) => {
    const childNotes = filteredNotes
      .filter(n => n.properties?.parentId === note.id)
      .sort((a, b) => a.title.localeCompare(b.title));
    const hasChildren = childNotes.length > 0;
    const isExpanded = expandedFolders.has(note.id);

    return (
      <div key={note.id}>
        <div
          draggable
          onDragStart={e => handleDragStart(e, note.id)}
          className={cn(
            "flex items-center gap-1.5 min-h-[32px] px-2 cursor-pointer transition-colors duration-100 group relative rounded-lg mx-1 select-none",
            activeNoteId === note.id
              ? "bg-primary/10 text-primary"
              : "text-foreground/80 hover:bg-sidebar-accent hover:text-foreground"
          )}
          style={{ paddingLeft: `${8 + depth * 10}px` }}
          onClick={() => onSelectNote(note)}
        >
          {hasChildren ? (
            <button
              onClick={(e) => { e.stopPropagation(); toggleFolder(note.id); }}
              className="h-4 w-4 shrink-0 flex items-center justify-center text-muted-foreground/60 hover:text-foreground hover:bg-muted/50 rounded"
            >
              {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </button>
          ) : (
            <span className="w-4 shrink-0" />
          )}
          <span className="shrink-0 text-sm leading-none">{note.icon || "📄"}</span>
          {renamingId === note.id ? (
            <input autoFocus value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              onBlur={() => handleRename(note.id, "note")}
              onKeyDown={e => e.key === "Enter" && handleRename(note.id, "note")}
              className="text-sm bg-transparent border-b border-primary outline-none flex-1 font-body"
              onClick={e => e.stopPropagation()} />
          ) : (
            <span className="text-sm font-body truncate flex-1">{note.title || "Untitled"}</span>
          )}
          {note.isPinned && <Star className="h-2.5 w-2.5 text-amber-400 shrink-0 fill-amber-400" />}
          <NoteMenu note={note} />
          <button
            onClick={e => { e.stopPropagation(); onCreateNote(note.folderId || "root"); }}
            className="opacity-0 group-hover:opacity-100 h-6 w-6 flex items-center justify-center rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all shrink-0">
            <Plus className="h-3 w-3" />
          </button>
        </div>
        
        {/* Render child notes */}
        {hasChildren && isExpanded && (
          <div className="border-l border-border/20 ml-3">
            {childNotes.map(child => renderNoteRow(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // ── Folder row ─────────────────────────────────────────────────────────────
  const renderFolder = (folderId: string, depth = 0): React.ReactNode => {
    const subFolders = folders.filter(f => f.parentId === folderId);
    // Only show top-level notes here — nested notes are handled by renderNoteRow
    const folderNotes = filteredNotes
      .filter(n => n.folderId === folderId && !n.properties?.parentId)
      .sort((a, b) => a.title.localeCompare(b.title));
    const isExpanded = expandedFolders.has(folderId);
    const folder = folders.find(f => f.id === folderId);

    return (
      <div key={folderId}>
        {folderId !== "root" && (
          <div
            className={cn(
              "flex items-center gap-1.5 min-h-[36px] px-2 cursor-pointer transition-colors duration-100 group hover:bg-sidebar-accent rounded-lg mx-1 select-none"
            )}
            style={{ paddingLeft: `${8 + depth * 10}px` }}
            onClick={() => toggleFolder(folderId)}
            onDragOver={e => e.preventDefault()}
            onDrop={e => handleDrop(e, folderId)}
          >
            <span className="h-4 w-4 shrink-0 flex items-center justify-center text-muted-foreground/60">
              {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </span>
            {isExpanded
              ? <FolderOpen className="h-3.5 w-3.5 shrink-0" style={{ color: folder?.color || "hsl(var(--primary))" }} />
              : <Folder className="h-3.5 w-3.5 shrink-0" style={{ color: folder?.color || "hsl(var(--primary))" }} />}

            {renamingId === folderId ? (
              <input autoFocus value={renameValue}
                onChange={e => setRenameValue(e.target.value)}
                onBlur={() => handleRename(folderId, "folder")}
                onKeyDown={e => e.key === "Enter" && handleRename(folderId, "folder")}
                className="text-sm bg-transparent border-b border-primary outline-none flex-1 font-body" />
            ) : (
              <span className="text-sm font-body font-medium truncate flex-1 text-foreground/80">
                {folder?.icon ? `${folder.icon} ` : ""}{folder?.name}
              </span>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="opacity-0 group-hover:opacity-100 h-6 w-6 flex items-center justify-center rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all shrink-0"
                  onClick={e => e.stopPropagation()}>
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-44 font-body">
                <DropdownMenuItem onClick={() => onCreateNote(folderId)} className="text-xs gap-2"><Plus className="h-3 w-3" /> New page inside</DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setRenamingId(folderId); setRenameValue(folder?.name || ""); }} className="text-xs gap-2"><Pencil className="h-3 w-3" /> Rename</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onCreateFolder(folderId)} className="text-xs gap-2"><FolderOpen className="h-3 w-3" /> New subfolder</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onDeleteFolder(folderId)} className="text-xs gap-2 text-destructive"><Trash2 className="h-3 w-3" /> Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <button
              onClick={e => { e.stopPropagation(); onCreateNote(folderId); }}
              className="opacity-0 group-hover:opacity-100 h-6 w-6 flex items-center justify-center rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all shrink-0">
              <Plus className="h-3 w-3" />
            </button>
          </div>
        )}

        {(isExpanded || folderId === "root") && (
          <div className={cn(folderId !== "root" && "border-l border-border/20 ml-[14px]")}>
            {subFolders.map(sf => renderFolder(sf.id, depth + 1))}
            {folderNotes.map(n => renderNoteRow(n, folderId !== "root" ? depth + 1 : 0))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-sidebar overflow-hidden">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-3 pt-3 pb-2 shrink-0">
        <span className="text-[12px] font-body font-semibold text-muted-foreground uppercase tracking-widest">Notes OS</span>
        <button onClick={onToggleCollapse}
          className="hidden md:flex p-1.5 rounded-lg hover:bg-sidebar-accent text-muted-foreground hover:text-foreground transition-colors"
          title="Collapse sidebar">
          <PanelLeftClose className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* ── Action buttons ───────────────────────────────────────────────────── */}
      <div className="flex gap-1.5 px-3 pb-2 shrink-0">
        {!readOnly && (
          <>
            <button onClick={() => onCreateNote()}
              className="flex-1 flex items-center justify-center gap-1.5 h-8 bg-primary text-primary-foreground text-xs font-body font-medium rounded-lg hover:bg-primary/90 transition-colors shadow-sm">
              <Plus className="h-3.5 w-3.5" />
              New Page
            </button>
            <button onClick={() => onCreateFolder("root")} title="New Folder"
              className="flex items-center justify-center w-8 h-8 border border-border/50 rounded-lg hover:bg-sidebar-accent text-muted-foreground hover:text-foreground transition-colors">
              <Folder className="h-3.5 w-3.5" />
            </button>
            <button onClick={onOpenImport} title="Import"
              className="flex items-center justify-center w-8 h-8 border border-border/50 rounded-lg hover:bg-sidebar-accent text-muted-foreground hover:text-foreground transition-colors">
              <Upload className="h-3.5 w-3.5" />
            </button>
          </>
        )}
        <button onClick={onOpenCommandPalette} title="Search (⌘K)"
          className={cn("flex items-center justify-center h-8 border border-border/50 rounded-lg hover:bg-sidebar-accent text-muted-foreground hover:text-foreground transition-colors",
            readOnly ? "flex-1 gap-1.5 px-3" : "w-8")}>
          <Search className="h-3.5 w-3.5" />
          {readOnly && <span className="text-xs font-body">Search</span>}
        </button>
      </div>

      {/* ── Search bar ──────────────────────────────────────────────────────── */}
      <div className="relative px-3 pb-3 shrink-0">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground/50" />
        <input
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Filter pages..."
          className="w-full h-8 text-xs pl-7 pr-3 bg-muted/40 rounded-lg outline-none focus:bg-muted/70 font-body text-foreground placeholder:text-muted-foreground/50 transition-colors"
        />
      </div>

      {/* ── View mode tabs ───────────────────────────────────────────────────── */}
      <div className="flex px-3 gap-0.5 pb-3 shrink-0">
        {[
          { id: "editor" as const, icon: FileText, label: "Pages" },
          { id: "graph" as const, icon: Network, label: "Graph" },
          { id: "database" as const, icon: TableIcon, label: "Table" },
        ].map(tab => (
          <button key={tab.id}
            onClick={() => onSetViewMode(tab.id)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-body transition-colors",
              viewMode === tab.id
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground/70 hover:text-muted-foreground hover:bg-muted/40"
            )}>
            <tab.icon className="h-3 w-3" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tag chips ────────────────────────────────────────────────────────── */}
      {allTags.length > 0 && (
        <div className="px-3 pb-2 flex gap-1.5 overflow-x-auto scrollbar-none shrink-0">
          <button onClick={onClearTags}
            className={cn("px-2 py-0.5 rounded-full text-[10px] font-body whitespace-nowrap transition-all shrink-0",
              activeTags.length === 0 ? "bg-primary/10 text-primary" : "bg-muted/40 text-muted-foreground hover:bg-primary/10")}>
            All
          </button>
          {allTags.slice(0, 8).map(tag => (
            <button key={tag} onClick={() => onToggleTag(tag)}
              className={cn("px-2 py-0.5 rounded-full text-[10px] font-body whitespace-nowrap flex items-center gap-0.5 transition-all shrink-0",
                activeTags.includes(tag) ? "bg-primary/10 text-primary" : "bg-muted/40 text-muted-foreground hover:bg-primary/10")}>
              <Hash className="h-2 w-2" />{tag}
            </button>
          ))}
        </div>
      )}

      {/* ── Scrollable content ───────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto min-h-0 pb-16 md:pb-2">

        {loading ? (
          <div className="space-y-1 px-3 py-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-9 rounded-lg bg-muted/30 animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* RECENTS */}
            {recentNotes.length > 0 && !search && (
              <div className="mb-3">
                <button onClick={() => setShowRecents(!showRecents)}
                  className="flex items-center justify-between w-full px-3 py-1.5 text-[10px] font-body font-semibold text-muted-foreground/60 uppercase tracking-widest hover:text-muted-foreground transition-colors">
                  <span>Recents</span>
                  {showRecents ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                </button>
                {showRecents && (
                  <div className="flex gap-2 px-3 py-1.5 overflow-x-auto scrollbar-none">
                    {recentNotes.map(note => (
                      <button key={note.id} onClick={() => onSelectNote(note)}
                        className={cn(
                          "flex-none w-[80px] h-[100px] rounded-xl border flex flex-col items-start p-2.5 transition-all text-left hover:border-primary/40",
                          activeNoteId === note.id
                            ? "border-primary/50 bg-primary/5"
                            : "border-border/40 bg-muted/30 hover:bg-muted/50"
                        )}>
                        <span className="text-lg leading-none">{note.icon || "📄"}</span>
                        <p className="text-[9px] font-body text-muted-foreground line-clamp-3 leading-tight mt-auto w-full">
                          {note.title || "Untitled"}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* FAVOURITES */}
            {pinnedNotes.length > 0 && (
              <div className="mb-2">
                <button onClick={() => setShowFavorites(!showFavorites)}
                  className="flex items-center gap-1 w-full px-3 py-1.5 text-[10px] font-body font-semibold text-muted-foreground/60 uppercase tracking-widest hover:text-muted-foreground transition-colors">
                  <Star className="h-2.5 w-2.5 text-amber-400 fill-amber-400" />
                  <span className="flex-1 text-left">Favourites</span>
                  {showFavorites ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                </button>
                {showFavorites && pinnedNotes.map(note => renderNoteRow(note, 0))}
              </div>
            )}

            {/* ALL PAGES / TREE */}
            <div>
              <button onClick={() => setShowAllPages(!showAllPages)}
                className="flex items-center gap-1 w-full px-3 py-1.5 text-[10px] font-body font-semibold text-muted-foreground/60 uppercase tracking-widest hover:text-muted-foreground transition-colors">
                <FileText className="h-2.5 w-2.5" />
                <span className="flex-1 text-left">Pages</span>
                {showAllPages ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </button>

              {showAllPages && renderFolder("root")}

              {showAllPages && filteredNotes.length === 0 && folders.length === 0 && (
                <div className="text-center py-8 px-4">
                  <FileText className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground/50 font-body mb-3">No pages yet</p>
                  <button onClick={() => onCreateNote()}
                    className="text-xs font-body text-primary hover:underline flex items-center gap-1 mx-auto">
                    <Plus className="h-3 w-3" /> Create your first page
                  </button>
                </div>
              )}
            </div>

            {/* TRASH */}
            {trashedNotes.length > 0 && (
              <div className="mt-3 pt-2 border-t border-border/30">
                <button onClick={() => setShowTrash(!showTrash)}
                  className="flex items-center justify-between w-full px-3 py-1.5 text-[10px] font-body font-semibold text-muted-foreground/60 uppercase tracking-widest hover:text-muted-foreground transition-colors">
                  <span className="flex items-center gap-1">
                    <Trash2 className="h-2.5 w-2.5" /> Trash ({trashedNotes.length})
                  </span>
                  {showTrash ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                </button>
                {showTrash && trashedNotes.map(n => (
                  <div key={n.id} className="flex items-center gap-1.5 min-h-[36px] px-3 mx-1 text-muted-foreground/50 group hover:bg-muted/30 rounded-lg transition-colors">
                    <FileText className="h-3.5 w-3.5 shrink-0" />
                    <span className="text-xs font-body truncate flex-1 line-through">{n.title}</span>
                    <button onClick={() => onRestoreNote(n.id)} className="opacity-0 group-hover:opacity-100 text-primary hover:bg-primary/10 rounded p-0.5 transition-all" title="Restore">
                      <FileText className="h-3 w-3" />
                    </button>
                    <button onClick={() => onDeleteNote(n.id, true)} className="opacity-0 group-hover:opacity-100 text-destructive hover:bg-destructive/10 rounded p-0.5 transition-all" title="Delete forever">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <div className="p-2 border-t border-border/30 flex items-center gap-1 shrink-0">
        <button onClick={onOpenImport}
          className="flex-1 flex items-center justify-center gap-1.5 h-7 text-[10px] font-body text-muted-foreground hover:text-foreground hover:bg-muted/40 rounded-lg transition-colors">
          <Upload className="h-3 w-3" /> Import
        </button>
        {onOpenNotionImport && (
          <button onClick={onOpenNotionImport}
            className="flex-1 flex items-center justify-center gap-1.5 h-7 text-[10px] font-body text-muted-foreground hover:text-foreground hover:bg-muted/40 rounded-lg transition-colors">
            <FileArchive className="h-3 w-3" /> Notion
          </button>
        )}
        <button className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/40 rounded-lg transition-colors" title="Settings">
          <Settings className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
