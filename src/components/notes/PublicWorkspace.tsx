import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { NoteMetadata, extractNoteLinks } from "@/lib/notesFirestore";
// Re-using NoteEditor from existing component
import { NoteEditor } from "@/components/notes/NoteEditor"; 
import { DetailsPanel } from "@/components/notes/DetailsPanel";
import { GraphView } from "@/components/notes/GraphView";
import { Layout } from "@/components/Layout";
// Re-using NotesSidebar but we'll need to disable CRUD for non-admin inside it
import { NotesSidebar } from "@/components/notes/NotesSidebar";

export const PublicWorkspace = () => {
  const { isAdmin } = useAuth();
  
  // Fake state to simulate standard workspace structure
  const [notes, setNotes] = useState<NoteMetadata[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [contents, setContents] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"editor" | "graph" | "canvas" | "database">("editor");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(260);

  const selectedNote = useMemo(() => notes.find(n => n.id === selectedNoteId) || null, [notes, selectedNoteId]);
  const activeNotes = useMemo(() => notes.filter(n => !n.deletedAt && !n.isArchived), [notes]);

  useEffect(() => {
    // In a real implementation this fetches from 'publicWorkspaceNotes' collection
    // For now we'll simulate fetching
    setLoading(true);
    setTimeout(() => {
      setNotes([]);
      setLoading(false);
    }, 500);
  }, []);

  const openNote = (n: NoteMetadata) => {
    setSelectedNoteId(n.id);
  };

  // Prevent actions if not admin
  const guard = (fn: Function) => (...args: any[]) => {
    if (!isAdmin) {
      toast.error("Public Workspace is read-only. Only admins can edit.");
      return;
    }
    return fn(...args);
  };

  return (
    <div className="flex flex-1 overflow-hidden h-full">
      {/* ── SIDEBAR ── */}
      <div className="hidden md:flex relative shrink-0 border-r border-border/40 transition-all duration-300 h-full"
           style={{ width: sidebarCollapsed ? 0 : sidebarWidth, opacity: sidebarCollapsed ? 0 : 1 }}>
        <NotesSidebar 
          notes={notes}
          folders={folders}
          activeNoteId={selectedNoteId}
          viewMode={viewMode}
          loading={loading}
          collapsed={sidebarCollapsed}
          search={search}
          activeTags={activeTags}
          onSearchChange={setSearch}
          onSelectNote={openNote}
          onCreateNote={guard(() => {})}
          onCreateFolder={guard(() => {})}
          onDeleteNote={guard(() => {})}
          onDeleteFolder={guard(() => {})}
          onRenameNote={guard(() => {})}
          onRenameFolder={guard(() => {})}
          onTogglePin={guard(() => {})}
          onPublish={guard(() => {})}
          onMoveNote={guard(() => {})}
          onRestoreNote={guard(() => {})}
          onSetViewMode={setViewMode}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          onOpenTemplate={guard(() => {})}
          onOpenImport={guard(() => {})}
          onOpenCommandPalette={() => {}}
          onToggleTag={(t) => setActiveTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])}
          onClearTags={() => setActiveTags([])}
        />
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 flex overflow-hidden">
        {selectedNote ? (
          viewMode === "graph" ? (
            <GraphView notes={activeNotes} contents={contents} onSelectNote={id => {
              const n = notes.find(x => x.id === id);
              if (n) openNote(n);
            }} />
          ) : (
            <div className="flex-1 flex overflow-hidden">
              <NoteEditor 
                note={selectedNote} 
                content={contents[selectedNoteId!] || ""} 
                allNotes={activeNotes}
                readOnly={!isAdmin}
                onChange={guard(() => {})}
                onSave={guard(() => {})}
                onTitleChange={guard(() => {})}
                onIconChange={guard(() => {})}
                onCoverChange={guard(() => {})}
                onTogglePin={guard(() => {})}
                onCopyLink={() => {
                  navigator.clipboard.writeText(window.location.origin + "/share/" + selectedNote.id);
                  toast.success("Link copied!");
                }}
                onOpenHistory={() => {}}
                onOpenDetails={() => setShowDetails(!showDetails)}
              />
              
              {showDetails && (
                <DetailsPanel 
                  note={selectedNote}
                  content={contents[selectedNote.id] || ""}
                  allNotes={activeNotes}
                  onClose={() => setShowDetails(false)}
                  onUpdateMetadata={guard(() => {})}
                  onOpenNote={id => {
                    const linked = activeNotes.find(n => n.id === id);
                    if (linked) openNote(linked);
                  }}
                />
              )}
            </div>
          )
        ) : (
          <div className="flex-1 flex items-center justify-center bg-card">
            <div className="text-center">
              <div className="h-16 w-16 mx-auto bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-4">
                <Globe className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-heading font-semibold text-foreground">Welcome to Public Workspace</h2>
              <p className="text-muted-foreground text-sm font-body mt-2">
                {isAdmin ? "You are an admin. You can edit content here." : "This workspace is read-only."}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
import { Globe } from "lucide-react";
