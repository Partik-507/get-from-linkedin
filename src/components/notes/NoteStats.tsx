import { countWords, countChars, estimateReadingTime } from "@/lib/notesFirestore";
import { BarChart2, Type, AlignLeft, Clock, Hash } from "lucide-react";

interface Props {
  content: string;
  createdAt?: any;
  updatedAt?: any;
}

export const NoteStats = ({ content, createdAt, updatedAt }: Props) => {
  const text = content.replace(/<[^>]+>/g, "");
  const words = countWords(content);
  const chars = countChars(content);
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0).length;
  const readTime = estimateReadingTime(words);

  const formatDate = (d: any) => {
    if (!d) return "—";
    try { return d.toDate?.()?.toLocaleDateString?.() || new Date(d).toLocaleDateString(); } catch { return "—"; }
  };

  return (
    <div className="p-4 space-y-3">
      <h3 className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-widest">Note Statistics</h3>
      <div className="grid grid-cols-2 gap-2">
        {[
          { icon: Type, label: "Words", value: words.toLocaleString() },
          { icon: Hash, label: "Characters", value: chars.toLocaleString() },
          { icon: AlignLeft, label: "Sentences", value: sentences },
          { icon: BarChart2, label: "Paragraphs", value: paragraphs },
          { icon: Clock, label: "Reading time", value: readTime },
        ].map(s => (
          <div key={s.label} className="flex items-center gap-2 p-2 rounded-lg bg-accent/20">
            <s.icon className="h-3.5 w-3.5 text-muted-foreground/50" />
            <div>
              <p className="text-[10px] text-muted-foreground/60 font-body">{s.label}</p>
              <p className="text-xs font-body font-medium">{s.value}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="pt-2 border-t border-border/20 space-y-1">
        <p className="text-[10px] text-muted-foreground/50 font-body">Created: {formatDate(createdAt)}</p>
        <p className="text-[10px] text-muted-foreground/50 font-body">Modified: {formatDate(updatedAt)}</p>
      </div>
    </div>
  );
};
