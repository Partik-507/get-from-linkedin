import { FileText, ArrowLeft, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface NoteRef {
  id: string;
  title: string;
  content: string;
}

interface Props {
  currentNoteId: string;
  notes: NoteRef[];
  onSelectNote: (id: string) => void;
}

export const BacklinksPanel = ({ currentNoteId, notes, onSelectNote }: Props) => {
  const currentNote = notes.find(n => n.id === currentNoteId);

  // Find notes that link TO this note via [[title]] pattern
  const incomingLinks = notes.filter(n => {
    if (n.id === currentNoteId || !n.content) return false;
    const matches = n.content.match(/\[\[([^\]]+)\]\]/g) || [];
    return matches.some(m => {
      const title = m.replace(/\[\[|\]\]/g, "");
      return currentNote && currentNote.title.toLowerCase() === title.toLowerCase();
    });
  });

  // Find notes THIS note links to
  const outgoingLinks: NoteRef[] = [];
  if (currentNote?.content) {
    const matches = currentNote.content.match(/\[\[([^\]]+)\]\]/g) || [];
    matches.forEach(m => {
      const title = m.replace(/\[\[|\]\]/g, "");
      const target = notes.find(n => n.title.toLowerCase() === title.toLowerCase() && n.id !== currentNoteId);
      if (target && !outgoingLinks.find(o => o.id === target.id)) outgoingLinks.push(target);
    });
  }

  if (incomingLinks.length === 0 && outgoingLinks.length === 0) {
    return (
      <div className="p-4 text-center">
        <Link2 className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-xs text-muted-foreground font-body">No links yet</p>
        <p className="text-[10px] text-muted-foreground/60 font-body mt-1">Use [[Note Title]] to link notes</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-3">
      {incomingLinks.length > 0 && (
        <div>
          <h4 className="text-[10px] font-body font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" /> Incoming ({incomingLinks.length})
          </h4>
          <div className="space-y-1">
            {incomingLinks.map(n => (
              <button
                key={n.id}
                onClick={() => onSelectNote(n.id)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent/50 transition-colors text-left"
              >
                <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="text-xs font-body truncate">{n.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {outgoingLinks.length > 0 && (
        <div>
          <h4 className="text-[10px] font-body font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
            <Link2 className="h-3 w-3" /> Outgoing ({outgoingLinks.length})
          </h4>
          <div className="space-y-1">
            {outgoingLinks.map(n => (
              <button
                key={n.id}
                onClick={() => onSelectNote(n.id)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent/50 transition-colors text-left"
              >
                <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="text-xs font-body truncate">{n.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
