import { useState, useEffect, useRef, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { FileText, Plus, Network, LayoutGrid, Search } from "lucide-react";
import type { NoteMetadata } from "@/lib/notesFirestore";

interface Props {
  open: boolean;
  onClose: () => void;
  notes: NoteMetadata[];
  onSelectNote: (note: NoteMetadata) => void;
  onCreateNote: () => void;
  onSetView: (view: string) => void;
}

export const CommandPalette = ({ open, onClose, notes, onSelectNote, onCreateNote, onSetView }: Props) => {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) { setQuery(""); setSelected(0); setTimeout(() => inputRef.current?.focus(), 50); }
  }, [open]);

  const activeNotes = useMemo(() => notes.filter(n => !n.deletedAt && !n.isArchived), [notes]);
  const actions = [
    { id: "new", label: "New Note", icon: Plus, description: "Create a new note", action: () => { onCreateNote(); onClose(); } },
    { id: "graph", label: "Graph View", icon: Network, description: "Open graph view", action: () => { onSetView("graph"); onClose(); } },
    { id: "canvas", label: "Canvas View", icon: LayoutGrid, description: "Open canvas view", action: () => { onSetView("canvas"); onClose(); } },
  ];

  const filteredNotes = useMemo(() => {
    if (!query) return activeNotes.slice(0, 8);
    const q = query.toLowerCase();
    return activeNotes.filter(n => n.title.toLowerCase().includes(q)).slice(0, 10);
  }, [activeNotes, query]);

  const filteredActions = useMemo(() => {
    if (!query) return actions;
    return actions.filter(a => a.label.toLowerCase().includes(query.toLowerCase()));
  }, [query]);

  const allItems = [...filteredActions.map(a => ({ type: "action" as const, ...a })), ...filteredNotes.map(n => ({ type: "note" as const, ...n }))];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelected(s => Math.min(s + 1, allItems.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      const item = allItems[selected];
      if (!item) return;
      if (item.type === "action") (item as any).action();
      else { onSelectNote(item as any); onClose(); }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30">
          <Search className="h-4 w-4 text-muted-foreground/50" />
          <input ref={inputRef} value={query} onChange={e => { setQuery(e.target.value); setSelected(0); }} onKeyDown={handleKeyDown}
            placeholder="Search notes or type a command..." className="flex-1 bg-transparent outline-none text-sm font-body" />
          <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-accent/50 text-muted-foreground/60 font-body">ESC</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filteredActions.length > 0 && (
            <>
              <p className="text-[10px] text-muted-foreground/40 font-body uppercase tracking-widest px-2 mb-1">Actions</p>
              {filteredActions.map((a, i) => (
                <button key={a.id} onClick={a.action}
                  className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all",
                    selected === i ? "bg-primary/10" : "hover:bg-accent/40")}>
                  <a.icon className="h-4 w-4 text-primary/60" />
                  <div><p className="text-sm font-body font-medium">{a.label}</p><p className="text-[10px] text-muted-foreground/50 font-body">{a.description}</p></div>
                </button>
              ))}
            </>
          )}
          {filteredNotes.length > 0 && (
            <>
              <p className="text-[10px] text-muted-foreground/40 font-body uppercase tracking-widest px-2 mb-1 mt-2">Notes</p>
              {filteredNotes.map((n, i) => (
                <button key={n.id} onClick={() => { onSelectNote(n); onClose(); }}
                  className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all",
                    selected === filteredActions.length + i ? "bg-primary/10" : "hover:bg-accent/40")}>
                  <FileText className="h-4 w-4 text-muted-foreground/50" />
                  <p className="text-sm font-body font-medium truncate">{n.icon ? `${n.icon} ` : ""}{n.title}</p>
                </button>
              ))}
            </>
          )}
          {allItems.length === 0 && <p className="text-center py-8 text-sm text-muted-foreground/40 font-body">No results</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
};
