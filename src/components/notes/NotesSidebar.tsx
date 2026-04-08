import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus, FolderPlus, Search, FileText, Folder, ChevronRight, ChevronDown,
  MoreHorizontal, Trash2, Pencil, Pin, Globe, X, Upload, GripVertical,
  Star, History, Network, LayoutGrid, Table as TableIcon, Undo2,
  BookTemplate, PanelLeftClose, PanelLeft, Palette, Hash,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
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
  onOpenCommandPalette: () => void;
  onToggleTag: (tag: string) => void;
  onClearTags: () => void;
}

export const NotesSidebar = ({
  notes, folders, activeNoteId, viewMode, loading, collapsed, search, activeTags,
  onSearchChange, onSelectNote, onCreateNote, onCreateFolder, onDeleteNote, onDeleteFolder,
  onRenameNote, onRenameFolder, onTogglePin, onPublish, onMoveNote, onRestoreNote,
  onSetViewMode, onToggleCollapse, onOpenTemplate, onOpenImport, onOpenCommandPalette,
  onToggleTag, onClearTags,
}: Props) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(["root"]));
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [showTrash, setShowTrash] = useState(false);

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
      result = result.filter(n => n.title?.toLowerCase().includes(s));
    }
    if (activeTags.length > 0) {
      result = result.filter(n => activeTags.some(t => n.tags?.includes(t)));
    }
    return result;
  }, [activeNotes, search, activeTags]);

  const pinnedNotes = useMemo(() => filteredNotes.filter(n => n.isPinned), [filteredNotes]);
  const recentIds = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("vv_recent_notes") || "[]") as string[]; } catch { return []; }
  }, []);
  const recentNotes = useMemo(() => {
    return recentIds.map(id => activeNotes.find(n => n.id === id)).filter(Boolean).slice(0, 5) as NoteMetadata[];
  }, [recentIds, activeNotes]);

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

  const renderNoteItem = (note: NoteMetadata) => (
    <div
      key={note.id}
      draggable
      onDragStart={e => handleDragStart(e, note.id)}
      className={cn(
        "flex items-center gap-1.5 py-1.5 px-2 rounded-lg cursor-pointer transition-all group ml-1",
        activeNoteId === note.id
          ? "bg-primary/10 text-primary font-medium"
          : "hover:bg-accent/60 text-foreground/80"
      )}
      onClick={() => onSelectNote(note)}
    >
      <GripVertical className="h-3 w-3 text-muted-foreground/30 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
      <FileText className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
      {renamingId === note.id ? (
        <input autoFocus value={renameValue} onChange={e => setRenameValue(e.target.value)}
          onBlur={() => handleRename(note.id, "note")}
          onKeyDown={e => e.key === "Enter" && handleRename(note.id, "note")}
          className="text-xs bg-transparent border-b border-primary/40 outline-none flex-1 font-body"
          onClick={e => e.stopPropagation()} />
      ) : (
        <span className="text-xs font-body truncate flex-1">{note.icon ? `${note.icon} ` : ""}{note.title}</span>
      )}
      {note.isPinned && <Pin className="h-2.5 w-2.5 text-primary/60 shrink-0" />}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="opacity-0 group-hover:opacity-100 h-5 w-5 flex items-center justify-center text-muted-foreground hover:text-foreground transition-opacity" onClick={e => e.stopPropagation()}>
            <MoreHorizontal className="h-3 w-3" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-44">
          <DropdownMenuItem onClick={() => { setRenamingId(note.id); setRenameValue(note.title); }} className="text-xs font-body gap-2"><Pencil className="h-3 w-3" /> Rename</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onTogglePin(note.id)} className="text-xs font-body gap-2"><Pin className="h-3 w-3" /> {note.isPinned ? "Unpin" : "Pin"}</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onPublish(note.id)} className="text-xs font-body gap-2"><Globe className="h-3 w-3" /> Publish</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onDeleteNote(note.id)} className="text-xs font-body gap-2 text-destructive"><Trash2 className="h-3 w-3" /> Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  const renderFolder = (folderId: string, depth = 0) => {
    const subFolders = folders.filter(f => f.parentId === folderId);
    const folderNotes = filteredNotes.filter(n => n.folderId === folderId && !n.isPinned).sort((a, b) => a.title.localeCompare(b.title));
    const isExpanded = expandedFolders.has(folderId);
    const folder = folders.find(f => f.id === folderId);

    return (
      <div key={folderId}>
        {folderId !== "root" && (
          <div
            className={cn("flex items-center gap-1 py-1.5 px-2 rounded-lg cursor-pointer hover:bg-accent/50 transition-all group", depth > 0 && "ml-3")}
            onClick={() => toggleFolder(folderId)}
            onDragOver={e => e.preventDefault()}
            onDrop={e => handleDrop(e, folderId)}
          >
            {isExpanded ? <ChevronDown className="h-3 w-3 text-muted-foreground/60 shrink-0" /> : <ChevronRight className="h-3 w-3 text-muted-foreground/60 shrink-0" />}
            <Folder className="h-3.5 w-3.5 shrink-0" style={{ color: folder?.color || "hsl(var(--primary) / 0.6)" }} />
            {renamingId === folderId ? (
              <input autoFocus value={renameValue} onChange={e => setRenameValue(e.target.value)}
                onBlur={() => handleRename(folderId, "folder")}
                onKeyDown={e => e.key === "Enter" && handleRename(folderId, "folder")}
                className="text-xs bg-transparent border-b border-primary/40 outline-none flex-1 font-body" />
            ) : (
              <span className="text-xs font-body font-medium truncate flex-1">{folder?.icon ? `${folder.icon} ` : ""}{folder?.name}</span>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="opacity-0 group-hover:opacity-100 h-5 w-5 flex items-center justify-center text-muted-foreground hover:text-foreground transition-opacity" onClick={e => e.stopPropagation()}>
                  <MoreHorizontal className="h-3 w-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-44">
                <DropdownMenuItem onClick={() => { setRenamingId(folderId); setRenameValue(folder?.name || ""); }} className="text-xs font-body gap-2"><Pencil className="h-3 w-3" /> Rename</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onCreateNote(folderId)} className="text-xs font-body gap-2"><Plus className="h-3 w-3" /> New Note</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onCreateFolder(folderId)} className="text-xs font-body gap-2"><FolderPlus className="h-3 w-3" /> Subfolder</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onDeleteFolder(folderId)} className="text-xs font-body gap-2 text-destructive"><Trash2 className="h-3 w-3" /> Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
        {(isExpanded || folderId === "root") && (
          <div className={cn(folderId !== "root" && "ml-3")}>
            {subFolders.map(sf => renderFolder(sf.id, depth + 1))}
            {folderNotes.map(n => renderNoteItem(n))}
          </div>
        )}
      </div>
    );
  };

  if (collapsed) {
    return (
      <div className="w-12 shrink-0 border-r border-border/30 flex flex-col items-center py-3 gap-2 bg-sidebar-background sidebar-transition">
        <button onClick={onToggleCollapse} className="p-2 rounded-lg hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors">
          <PanelLeft className="h-4 w-4" />
        </button>
        <button onClick={() => onCreateNote()} className="p-2 rounded-lg hover:bg-primary/10 text-primary transition-colors">
          <Plus className="h-4 w-4" />
        </button>
        <button onClick={() => onSetViewMode("graph")} className={cn("p-2 rounded-lg transition-colors", viewMode === "graph" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}>
          <Network className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-[260px] shrink-0 border-r border-border/30 flex flex-col bg-sidebar-background sidebar-transition overflow-hidden">
      {/* Header */}
      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs font-body gap-1.5" onClick={() => onCreateNote()}>
              <Plus className="h-3.5 w-3.5" /> Note
            </Button>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onOpenTemplate} title="From template">
              <BookTemplate className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => onCreateFolder()}>
              <FolderPlus className="h-3.5 w-3.5" />
            </Button>
          </div>
          <button onClick={onToggleCollapse} className="p-1.5 rounded-md hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors">
            <PanelLeftClose className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground/60" />
          <Input value={search} onChange={e => onSearchChange(e.target.value)} placeholder="Search... ⌘K"
            className="h-7 text-xs pl-7 bg-accent/20 border-border/20 font-body rounded-lg"
            onFocus={() => { if (!search) onOpenCommandPalette(); }}
          />
        </div>
      </div>

      {/* View toggles */}
      <div className="flex gap-0.5 px-3 pb-2">
        {([
          { mode: "editor" as ViewMode, icon: FileText, label: "Editor" },
          { mode: "graph" as ViewMode, icon: Network, label: "Graph" },
          { mode: "canvas" as ViewMode, icon: LayoutGrid, label: "Canvas" },
          { mode: "database" as ViewMode, icon: TableIcon, label: "Table" },
        ]).map(v => (
          <button key={v.mode} onClick={() => onSetViewMode(v.mode)}
            className={cn("flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-[10px] font-body font-medium transition-all",
              viewMode === v.mode ? "bg-primary/10 text-primary shadow-sm" : "text-muted-foreground/70 hover:text-foreground hover:bg-accent/40"
            )}>
            <v.icon className="h-3 w-3" /> {v.label}
          </button>
        ))}
      </div>

      {/* Tags */}
      {allTags.length > 0 && (
        <div className="px-3 pb-2 flex flex-wrap gap-1">
          {allTags.slice(0, 8).map(tag => (
            <button key={tag} onClick={() => onToggleTag(tag)}
              className={cn("px-2 py-0.5 rounded-full text-[10px] font-body transition-all",
                activeTags.includes(tag) ? "bg-primary/20 text-primary" : "bg-accent/40 text-muted-foreground hover:bg-accent/60"
              )}>
              <Hash className="h-2.5 w-2.5 inline mr-0.5" />{tag}
            </button>
          ))}
          {activeTags.length > 0 && (
            <button onClick={onClearTags} className="text-[10px] text-muted-foreground hover:text-foreground font-body">Clear</button>
          )}
        </div>
      )}

      <div className="h-px bg-border/30" />

      {/* Folder tree */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5 scrollbar-none">
        {loading ? (
          <div className="space-y-2 p-2">{[1, 2, 3].map(i => <div key={i} className="h-6 skeleton-pulse" />)}</div>
        ) : (
          <>
            {pinnedNotes.length > 0 && (
              <div className="mb-3">
                <p className="text-[10px] font-body font-semibold text-muted-foreground/60 uppercase tracking-widest px-2 mb-1 flex items-center gap-1"><Star className="h-2.5 w-2.5" /> Pinned</p>
                {pinnedNotes.map(n => renderNoteItem(n))}
              </div>
            )}
            {recentNotes.length > 0 && !search && (
              <div className="mb-3">
                <p className="text-[10px] font-body font-semibold text-muted-foreground/60 uppercase tracking-widest px-2 mb-1 flex items-center gap-1"><History className="h-2.5 w-2.5" /> Recent</p>
                {recentNotes.slice(0, 3).map(n => renderNoteItem(n))}
              </div>
            )}
            <p className="text-[10px] font-body font-semibold text-muted-foreground/60 uppercase tracking-widest px-2 mb-1">All Notes</p>
            {renderFolder("root")}
            {filteredNotes.length === 0 && folders.length === 0 && (
              <div className="text-center py-10 px-4">
                <FileText className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-xs text-muted-foreground/60 font-body mb-2">No notes yet</p>
                <Button size="sm" variant="outline" className="text-xs font-body gap-1.5" onClick={() => onCreateNote()}>
                  <Plus className="h-3 w-3" /> Create your first note
                </Button>
              </div>
            )}
            {trashedNotes.length > 0 && (
              <div className="mt-4 pt-3 border-t border-border/20">
                <button onClick={() => setShowTrash(!showTrash)}
                  className="flex items-center gap-1 px-2 py-1 text-[10px] font-body font-semibold text-muted-foreground/50 uppercase tracking-widest w-full hover:text-foreground transition-colors">
                  <Trash2 className="h-2.5 w-2.5" /> Trash ({trashedNotes.length})
                  {showTrash ? <ChevronDown className="h-3 w-3 ml-auto" /> : <ChevronRight className="h-3 w-3 ml-auto" />}
                </button>
                {showTrash && trashedNotes.map(n => (
                  <div key={n.id} className="flex items-center gap-1.5 py-1 px-2 ml-3 rounded-lg text-muted-foreground/50 group">
                    <FileText className="h-3.5 w-3.5 shrink-0" />
                    <span className="text-xs font-body truncate flex-1 line-through">{n.title}</span>
                    <button onClick={() => onRestoreNote(n.id)} className="opacity-0 group-hover:opacity-100 text-primary" title="Restore">
                      <Undo2 className="h-3 w-3" />
                    </button>
                    <button onClick={() => onDeleteNote(n.id, true)} className="opacity-0 group-hover:opacity-100 text-destructive" title="Delete forever">
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
      <div className="p-2 border-t border-border/20 flex gap-1">
        <Button size="sm" variant="ghost" className="flex-1 text-[10px] font-body gap-1 h-7" onClick={onOpenImport}>
          <Upload className="h-3 w-3" /> Import
        </Button>
        <Button size="sm" variant="ghost" className="flex-1 text-[10px] font-body gap-1 h-7"
          onClick={() => setExpandedFolders(new Set(["root", ...folders.map(f => f.id)]))}>
          Expand All
        </Button>
      </div>
    </div>
  );
};
