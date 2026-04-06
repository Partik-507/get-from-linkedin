import { useState, useEffect, useMemo, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Search, FileText, FolderPlus, Plus, Network, LayoutGrid } from "lucide-react";

interface NoteRef {
  id: string;
  title: string;
  content: string;
  folderId: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notes: NoteRef[];
  onSelectNote: (id: string) => void;
  onCreateNote: () => void;
  onCreateFolder: () => void;
  onToggleGraph: () => void;
  onToggleCanvas: () => void;
  recentIds: string[];
}

export const CommandPalette = ({
  open, onOpenChange, notes, onSelectNote, onCreateNote,
  onCreateFolder, onToggleGraph, onToggleCanvas, recentIds,
}: Props) => {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) { setQuery(""); setSelected(0); setTimeout(() => inputRef.current?.focus(), 50); }
  }, [open]);

  const actions = useMemo(() => [
    { id: "_new", label: "New Note", icon: Plus, type: "action" as const },
    { id: "_folder", label: "New Folder", icon: FolderPlus, type: "action" as const },
    { id: "_graph", label: "Toggle Graph View", icon: Network, type: "action" as const },
    { id: "_canvas", label: "Toggle Canvas View", icon: LayoutGrid, type: "action" as const },
  ], []);

  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    const noteResults = notes
      .filter(n => !q || n.title.toLowerCase().includes(q) || n.content?.replace(/<[^>]+>/g, "").toLowerCase().includes(q))
      .sort((a, b) => {
        const aRecent = recentIds.indexOf(a.id);
        const bRecent = recentIds.indexOf(b.id);
        if (!q) {
          if (aRecent >= 0 && bRecent >= 0) return aRecent - bRecent;
          if (aRecent >= 0) return -1;
          if (bRecent >= 0) return 1;
        }
        return 0;
      })
      .slice(0, 10)
      .map(n => ({ id: n.id, label: n.title || "Untitled", icon: FileText, type: "note" as const }));

    const filteredActions = actions.filter(a => !q || a.label.toLowerCase().includes(q));
    return [...filteredActions, ...noteResults];
  }, [query, notes, actions, recentIds]);

  const execute = (item: (typeof results)[0]) => {
    onOpenChange(false);
    if (item.id === "_new") onCreateNote();
    else if (item.id === "_folder") onCreateFolder();
    else if (item.id === "_graph") onToggleGraph();
    else if (item.id === "_canvas") onToggleCanvas();
    else onSelectNote(item.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
    else if (e.key === "Enter" && results[selected]) { e.preventDefault(); execute(results[selected]); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 gap-0 max-w-lg overflow-hidden border-border/60">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setSelected(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Search notes, actions..."
            className="flex-1 bg-transparent outline-none text-sm font-body placeholder:text-muted-foreground"
          />
          <kbd className="hidden sm:inline text-[10px] text-muted-foreground px-1.5 py-0.5 rounded bg-muted font-mono">ESC</kbd>
        </div>
        <div className="max-h-72 overflow-y-auto py-1">
          {results.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-6 font-body">No results found</p>
          )}
          {results.map((item, i) => (
            <button
              key={item.id}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                i === selected ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
              )}
              onMouseEnter={() => setSelected(i)}
              onClick={() => execute(item)}
            >
              <item.icon className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm font-body truncate">{item.label}</span>
              {item.type === "action" && (
                <span className="ml-auto text-[10px] text-muted-foreground font-body">Action</span>
              )}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
