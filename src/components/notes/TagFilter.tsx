import { cn } from "@/lib/utils";
import { Hash, X } from "lucide-react";

interface Props { allTags: string[]; activeTags: string[]; onToggleTag: (t: string) => void; onClear: () => void; }

export const TagFilter = ({ allTags, activeTags, onToggleTag, onClear }: Props) => {
  if (allTags.length === 0) return null;
  return (
    <div className="px-3 py-2 flex flex-wrap gap-1 items-center">
      {allTags.slice(0, 8).map(tag => (
        <button key={tag} onClick={() => onToggleTag(tag)}
          className={cn("px-2 py-0.5 rounded-full text-[10px] font-body transition-all flex items-center gap-0.5",
            activeTags.includes(tag) ? "bg-primary/15 text-primary" : "bg-accent/30 text-muted-foreground/60 hover:bg-accent/50"
          )}><Hash className="h-2 w-2"/>{tag}</button>
      ))}
      {activeTags.length > 0 && <button onClick={onClear} className="text-[10px] text-muted-foreground/40 hover:text-foreground font-body flex items-center gap-0.5"><X className="h-2.5 w-2.5"/> Clear</button>}
    </div>
  );
};
