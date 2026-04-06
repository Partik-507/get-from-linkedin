import { useState } from "react";
import { FileText } from "lucide-react";

interface NoteRef {
  id: string;
  title: string;
  content: string;
}

interface Props {
  title: string;
  notes: NoteRef[];
  onSelectNote: (id: string) => void;
  children: React.ReactNode;
}

export const NotePreviewPopover = ({ title, notes, onSelectNote, children }: Props) => {
  const [show, setShow] = useState(false);
  const target = notes.find(n => n.title.toLowerCase() === title.toLowerCase());

  if (!target) return <>{children}</>;

  const snippet = target.content?.replace(/<[^>]+>/g, "").slice(0, 200) || "Empty note";

  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <span
        className="text-primary cursor-pointer underline decoration-primary/30 hover:decoration-primary transition-colors"
        onClick={() => onSelectNote(target.id)}
      >
        {children}
      </span>
      {show && (
        <div className="absolute z-50 bottom-full left-0 mb-2 w-64 bg-popover border border-border rounded-lg shadow-lg p-3 pointer-events-none">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="h-3 w-3 text-primary" />
            <span className="text-sm font-body font-medium truncate">{target.title}</span>
          </div>
          <p className="text-[10px] text-muted-foreground font-body line-clamp-4">{snippet}</p>
        </div>
      )}
    </span>
  );
};
