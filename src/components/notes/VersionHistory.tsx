import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { History, RotateCcw, Eye, X, Clock, FileText, ChevronRight } from "lucide-react";
import { getSnapshots, saveSnapshot, formatRelativeTime, type LocalSnapshot } from "@/lib/indexedDB";

interface Props {
  open: boolean;
  onClose: () => void;
  noteId: string;
  currentContent: string;
  onRestore: (content: string) => void;
}

export const VersionHistory = ({ open, onClose, noteId, currentContent, onRestore }: Props) => {
  const [snapshots, setSnapshots] = useState<LocalSnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<LocalSnapshot | null>(null);

  useEffect(() => {
    if (!open || !noteId) return;
    setLoading(true);
    setPreview(null);
    getSnapshots(noteId).then(s => { setSnapshots(s); setLoading(false); });
  }, [open, noteId]);

  const handleRestore = (snap: LocalSnapshot) => {
    // Save current state as new snapshot before restoring
    saveSnapshot(noteId, currentContent);
    onRestore(snap.content);
    onClose();
  };

  if (!open) return null;

  return (
    /* Slide-in panel from right */
    <div className="w-[280px] shrink-0 border-l border-border/50 bg-card/30 flex flex-col overflow-hidden sidebar-transition">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <span className="text-xs font-body font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <History className="h-3.5 w-3.5" /> Version History
        </span>
        <button onClick={onClose} className="h-5 w-5 flex items-center justify-center rounded hover:bg-primary/5 text-muted-foreground hover:text-primary transition-colors">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="p-3 border-b border-border/50">
        <p className="text-[10px] font-body text-muted-foreground">
          Last {snapshots.length > 0 ? snapshots.length : "—"} auto-saved versions (local, max 20)
        </p>
      </div>

      {/* Snapshot list */}
      <div className="flex-1 overflow-y-auto scrollbar-none">
        {loading ? (
          <div className="space-y-2 p-3">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-14 skeleton-pulse rounded-lg" />)}
          </div>
        ) : snapshots.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 px-4 text-center">
            <Clock className="h-8 w-8 text-muted-foreground/20 mb-2" />
            <p className="text-xs text-muted-foreground font-body">No snapshots yet.</p>
            <p className="text-[10px] text-muted-foreground/70 font-body mt-1">Snapshots are saved automatically as you type.</p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {/* Current state */}
            <div className="px-3 py-2.5 rounded-xl border-2 border-primary bg-primary/5 mb-2">
              <div className="flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-body font-semibold text-primary">Current version</p>
                  <p className="text-[10px] text-muted-foreground font-body">
                    {(currentContent || "").replace(/<[^>]+>/g, "").split(/\s+/).filter(Boolean).length} words
                  </p>
                </div>
                <span className="text-[9px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full font-body font-medium">Now</span>
              </div>
            </div>

            {snapshots.map(snap => (
              <button
                key={snap.id}
                onClick={() => setPreview(prev => prev?.id === snap.id ? null : snap)}
                className={cn(
                  "w-full text-left px-3 py-2.5 rounded-xl transition-all group",
                  preview?.id === snap.id
                    ? "bg-primary/10 ring-1 ring-primary/30"
                    : "hover:bg-secondary/40"
                )}
              >
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-body font-medium text-foreground truncate">
                      {formatRelativeTime(snap.savedAt)}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-body tabular-nums">
                      {snap.wordCount} words · {new Date(snap.savedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <ChevronRight className={cn("h-3.5 w-3.5 text-muted-foreground/60 transition-transform", preview?.id === snap.id && "rotate-90")} />
                </div>

                {/* Preview + restore inline */}
                {preview?.id === snap.id && (
                  <div className="mt-3 pt-3 border-t border-border/50" onClick={e => e.stopPropagation()}>
                    <div className="max-h-32 overflow-y-auto text-[11px] text-muted-foreground font-body mb-3 tiptap-editor prose-notes rounded-lg bg-secondary/30 p-2 border border-border/40"
                      dangerouslySetInnerHTML={{ __html: snap.content.slice(0, 1000) }} />
                    <Button size="sm" className="w-full text-xs font-body gap-1 h-7"
                      onClick={() => handleRestore(snap)}>
                      <RotateCcw className="h-3 w-3" /> Restore this version
                    </Button>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Re-export saveVersionSnapshot as alias for backwards compat
export { saveSnapshot as saveVersionSnapshot } from "@/lib/indexedDB";
