import { cn } from "@/lib/utils";
import { Tag, X } from "lucide-react";

interface Props {
  allTags: string[];
  activeTags: string[];
  onToggleTag: (tag: string) => void;
  onClear: () => void;
}

export const TagFilter = ({ allTags, activeTags, onToggleTag, onClear }: Props) => {
  if (allTags.length === 0) return null;

  return (
    <div className="flex items-center gap-1 flex-wrap px-2 py-1.5">
      <Tag className="h-3 w-3 text-muted-foreground shrink-0" />
      {allTags.slice(0, 15).map(tag => (
        <button
          key={tag}
          onClick={() => onToggleTag(tag)}
          className={cn(
            "px-2 py-0.5 rounded-full text-[10px] font-body transition-colors border",
            activeTags.includes(tag)
              ? "bg-primary/15 text-primary border-primary/30"
              : "bg-accent/30 text-muted-foreground border-transparent hover:border-border"
          )}
        >
          {tag}
        </button>
      ))}
      {activeTags.length > 0 && (
        <button onClick={onClear} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
};
