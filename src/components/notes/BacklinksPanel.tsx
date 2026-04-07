import { useMemo } from "react";
import { Link2, ArrowUpRight } from "lucide-react";
import type { NoteMetadata } from "@/lib/notesFirestore";

interface Props {
  currentNoteId: string;
  notes: NoteMetadata[];
  contents: Record<string, string>;
  onSelectNote: (id: string) => void;
}

export const BacklinksPanel = ({ currentNoteId, notes, contents, onSelectNote }: Props) => {
  const currentNote = notes.find(n => n.id === currentNoteId);
  const incomingLinks = useMemo(() => {
    if (!currentNote) return [];
    return notes.filter(n => {
      if (n.id === currentNoteId) return false;
      const content = contents[n.id] || "";
      return new RegExp(`\\[\\[${currentNote.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]\\]`, 'i').test(content);
    });
  }, [currentNote, notes, contents, currentNoteId]);

  const outgoingLinks = useMemo(() => {
    if (!currentNote) return [];
    const content = contents[currentNoteId] || "";
    const matches = content.match(/\[\[([^\]]+)\]\]/g) || [];
    const linked: NoteMetadata[] = [];
    matches.forEach(m => {
      const title = m.replace(/\[\[|\]\]/g, "").trim();
      const target = notes.find(n => n.title.toLowerCase() === title.toLowerCase() && n.id !== currentNoteId);
      if (target && !linked.find(l => l.id === target.id)) linked.push(target);
    });
    return linked;
  }, [currentNote, notes, contents, currentNoteId]);

  return (
    <div className="w-[260px] shrink-0 border-l border-border/30 bg-sidebar-background overflow-y-auto p-4 space-y-4">
      <h3 className="text-xs font-heading font-semibold text-muted-foreground/60 uppercase tracking-widest flex items-center gap-1.5"><Link2 className="h-3.5 w-3.5" /> Backlinks</h3>
      <div>
        <p className="text-[10px] text-muted-foreground/40 font-body uppercase tracking-widest mb-2">Incoming ({incomingLinks.length})</p>
        {incomingLinks.length === 0 ? <p className="text-[10px] text-muted-foreground/30 font-body italic">No notes link here</p> :
          incomingLinks.map(n => (
            <button key={n.id} onClick={() => onSelectNote(n.id)} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-accent/40 text-left transition-colors">
              <ArrowUpRight className="h-3 w-3 text-primary/40 shrink-0" /><span className="text-xs font-body truncate">{n.title}</span>
            </button>
          ))}
      </div>
      <div>
        <p className="text-[10px] text-muted-foreground/40 font-body uppercase tracking-widest mb-2">Outgoing ({outgoingLinks.length})</p>
        {outgoingLinks.length === 0 ? <p className="text-[10px] text-muted-foreground/30 font-body italic">No links in this note</p> :
          outgoingLinks.map(n => (
            <button key={n.id} onClick={() => onSelectNote(n.id)} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-accent/40 text-left transition-colors">
              <ArrowUpRight className="h-3 w-3 text-muted-foreground/40 shrink-0 rotate-180" /><span className="text-xs font-body truncate">{n.title}</span>
            </button>
          ))}
      </div>
    </div>
  );
};
