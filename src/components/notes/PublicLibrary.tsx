import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Heart, Eye, BookOpen, Copy, ArrowLeft, User, Hash, Shield } from "lucide-react";
import { fetchPublicNotes, fetchPublicNoteContent, likePublicNote, forkPublicNote, type PublicNote } from "@/lib/notesFirestore";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { NoteEditor } from "@/components/notes/NoteEditor";

// Hash-based gradient generator
const hashGradient = (id: string): string => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash) + id.charCodeAt(i);
  const hue1 = Math.abs(hash) % 360;
  const hue2 = (hue1 + 40) % 360;
  return `linear-gradient(135deg, hsl(${hue1}, 60%, 50%), hsl(${hue2}, 70%, 40%))`;
};

export const PublicLibrary = ({ externalSearch = "" }: { externalSearch?: string }) => {
  const { user } = useAuth();
  const [notes, setNotes] = useState<PublicNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedNote, setSelectedNote] = useState<PublicNote | null>(null);
  const [noteContent, setNoteContent] = useState("");
  const [activeSubject, setActiveSubject] = useState<string | null>(null);

  // Use external search (from top bar) if provided
  const effectiveSearch = externalSearch || search;

  useEffect(() => {
    const load = async () => {
      const data = await fetchPublicNotes();
      setNotes(data.filter(n => n.status === "published"));
      setLoading(false);
    };
    load();
  }, []);

  const subjects = useMemo(() => {
    const set = new Set<string>();
    notes.forEach(n => { if (n.subject) set.add(n.subject); n.tags?.forEach(t => set.add(t)); });
    return ["Official", ...[...set].slice(0, 10)];
  }, [notes]);

  const filtered = useMemo(() => {
    let result = notes;
    if (effectiveSearch) {
      const s = effectiveSearch.toLowerCase();
      result = result.filter(n =>
        n.title.toLowerCase().includes(s) || n.description?.toLowerCase().includes(s) ||
        n.tags?.some(t => t.toLowerCase().includes(s)) || n.authorName?.toLowerCase().includes(s)
      );
    }
    if (activeSubject) {
      if (activeSubject === "Official") {
        result = result.filter(n => n.adminCreated);
      } else {
        result = result.filter(n => n.subject === activeSubject || n.tags?.includes(activeSubject));
      }
    }
    return result;
  }, [notes, search, activeSubject]);

  const openNote = async (note: PublicNote) => {
    setSelectedNote(note);
    const content = await fetchPublicNoteContent(note.id);
    setNoteContent(content);
  };

  const handleFork = async (noteId: string) => {
    if (!user) { toast.error("Sign in to save notes"); return; }
    try {
      await forkPublicNote(user.uid, noteId);
      toast.success("Note saved to your workspace!");
    } catch { toast.error("Failed to fork"); }
  };

  const handleLike = async (noteId: string) => {
    if (!user) { toast.error("Sign in to like notes"); return; }
    try {
      await likePublicNote(user.uid, noteId);
      toast.success("Liked!");
    } catch {}
  };

  // Reading view
  if (selectedNote) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-8">
          <button onClick={() => setSelectedNote(null)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground font-body mb-6 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Library
          </button>

          {/* Cover */}
          <div className="h-32 rounded-xl mb-6" style={{ background: selectedNote.coverImage || hashGradient(selectedNote.id) }} />

          {/* Author */}
          <div className="flex items-center gap-3 mb-4">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-body font-medium">{selectedNote.authorName}</p>
              <p className="text-[10px] text-muted-foreground font-body">
                {selectedNote.publishedAt?.toDate?.()?.toLocaleDateString?.() || "Recently"}
              </p>
            </div>
            {selectedNote.adminCreated && (
              <Badge className="text-[10px] font-body gap-1 bg-primary/10 text-primary border-0">
                <Shield className="h-2.5 w-2.5" /> VivaVault Official
              </Badge>
            )}
          </div>

          <h1 className="text-3xl font-heading font-bold mb-3">{selectedNote.title}</h1>
          {selectedNote.description && <p className="text-muted-foreground font-body mb-4">{selectedNote.description}</p>}

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 mb-6">
            {selectedNote.tags?.map(t => (
              <Badge key={t} variant="secondary" className="text-[10px] font-body"><Hash className="h-2.5 w-2.5 mr-0.5" />{t}</Badge>
            ))}
          </div>

          {/* Content */}
          <div className="mt-8 relative -mx-4 md:-mx-8">
            <NoteEditor
              note={selectedNote as any}
              content={noteContent}
              onContentChange={() => {}}
              onTitleChange={() => {}}
              readOnly={true}
              isFullWidth={false}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 mt-8 pt-6 border-t border-border/30">
            <Button variant="outline" size="sm" className="font-body text-xs gap-1.5" onClick={() => handleLike(selectedNote.id)}>
              <Heart className="h-3.5 w-3.5" /> Like
            </Button>
            <Button variant="default" size="sm" className="font-body text-xs gap-1.5" onClick={() => handleFork(selectedNote.id)}>
              <Copy className="h-3.5 w-3.5" /> Save to Workspace
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Browse view
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-6">
        <div className="text-center mb-5">
          <h1 className="text-xl font-heading font-bold mb-1">Public Library</h1>
          <p className="text-xs text-muted-foreground font-body">Discover notes shared by the community</p>
        </div>

        {/* Subject filters */}
        {subjects.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 mb-5">
            {subjects.map(s => (
              <button key={s} onClick={() => setActiveSubject(activeSubject === s ? null : s)}
                className={cn("px-3 py-1 rounded-lg text-xs font-body transition-all border",
                  activeSubject === s
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border/50 text-muted-foreground hover:border-primary/30"
                )}>{s}</button>
            ))}
          </div>
        )}

        {/* Grid — 2-col on mobile, 3-col on desktop */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-44 skeleton-pulse rounded-2xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground font-body">No public notes found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {filtered.map(note => (
              <div
                key={note.id}
                className="bg-card rounded-2xl border border-border/40 overflow-hidden cursor-pointer active:scale-[0.97] transition-transform"
                onClick={() => openNote(note)}
              >
                {/* Gradient cover — compact */}
                <div className="h-16 relative" style={{ background: note.coverImage || hashGradient(note.id) }}>
                  {note.adminCreated && (
                    <div className="absolute top-1.5 right-1.5">
                      <Badge className="text-[9px] font-body gap-0.5 bg-background/80 text-foreground border-0 backdrop-blur-sm px-1.5 py-0.5">
                        <Shield className="h-2.5 w-2.5" /> Official
                      </Badge>
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="text-[13px] font-heading font-semibold mb-1 line-clamp-2 leading-snug">{note.title}</h3>
                  <p className="text-[11px] text-muted-foreground font-body line-clamp-1 mb-2">{note.description || "No description"}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground/60 font-body min-w-0">
                      <User className="h-2.5 w-2.5 shrink-0" />
                      <span className="truncate">{note.authorName}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60 font-body shrink-0">
                      <span className="flex items-center gap-0.5"><Heart className="h-2.5 w-2.5" />{note.likes || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
