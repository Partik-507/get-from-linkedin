import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, query, orderBy, limit, serverTimestamp, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { History, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Version {
  id: string;
  content: string;
  title: string;
  savedAt: any;
  version: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  noteId: string;
  currentContent: string;
  currentTitle: string;
  onRestore: (content: string) => void;
}

export const VersionHistory = ({ open, onOpenChange, userId, noteId, currentContent, currentTitle, onRestore }: Props) => {
  const [versions, setVersions] = useState<Version[]>([]);
  const [selected, setSelected] = useState<Version | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !userId || !noteId) return;
    setLoading(true);
    const fetchVersions = async () => {
      try {
        const snap = await getDocs(collection(db, "users", userId, "notes", noteId, "versions"));
        const v = snap.docs.map(d => ({ id: d.id, ...d.data() } as Version));
        v.sort((a, b) => (b.version || 0) - (a.version || 0));
        setVersions(v.slice(0, 20));
      } catch { /* silent */ }
      setLoading(false);
    };
    fetchVersions();
  }, [open, userId, noteId]);

  const handleRestore = () => {
    if (!selected) return;
    onRestore(selected.content);
    onOpenChange(false);
    toast.success(`Restored version ${selected.version}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <History className="h-4 w-4" /> Version History
          </DialogTitle>
          <DialogDescription className="font-body">{currentTitle}</DialogDescription>
        </DialogHeader>
        <div className="flex gap-4 flex-1 min-h-0 overflow-hidden">
          {/* Version list */}
          <div className="w-48 shrink-0 overflow-y-auto border-r border-border/40 pr-3 space-y-1">
            {loading ? (
              <p className="text-xs text-muted-foreground font-body p-2">Loading...</p>
            ) : versions.length === 0 ? (
              <p className="text-xs text-muted-foreground font-body p-2">No versions saved yet</p>
            ) : (
              versions.map(v => (
                <button
                  key={v.id}
                  onClick={() => setSelected(v)}
                  className={cn(
                    "w-full text-left px-2 py-2 rounded-md transition-colors text-xs font-body",
                    selected?.id === v.id ? "bg-primary/10 text-primary" : "hover:bg-accent/50"
                  )}
                >
                  <div className="font-medium">Version {v.version}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {v.savedAt?.toDate?.()?.toLocaleString?.() || "Unknown date"}
                  </div>
                </button>
              ))
            )}
          </div>
          {/* Preview */}
          <div className="flex-1 overflow-y-auto">
            {selected ? (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-body font-medium">Version {selected.version} Preview</h4>
                  <Button size="sm" variant="outline" className="text-xs font-body gap-1" onClick={handleRestore}>
                    <RotateCcw className="h-3 w-3" /> Restore
                  </Button>
                </div>
                <div
                  className="prose prose-sm dark:prose-invert max-w-none font-body text-xs border border-border/40 rounded-lg p-4"
                  dangerouslySetInnerHTML={{ __html: selected.content }}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground font-body">
                Select a version to preview
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Helper to save a version snapshot
export const saveVersionSnapshot = async (
  userId: string,
  noteId: string,
  content: string,
  title: string,
  version: number
) => {
  try {
    const versionsRef = collection(db, "users", userId, "notes", noteId, "versions");
    await addDoc(versionsRef, {
      content,
      title,
      version,
      savedAt: serverTimestamp(),
    });
    // Cleanup: keep only last 20
    const snap = await getDocs(versionsRef);
    const sorted = snap.docs
      .map(d => ({ id: d.id, version: d.data().version || 0 }))
      .sort((a, b) => b.version - a.version);
    if (sorted.length > 20) {
      const toDelete = sorted.slice(20);
      for (const old of toDelete) {
        await deleteDoc(doc(db, "users", userId, "notes", noteId, "versions", old.id));
      }
    }
  } catch (e) {
    console.error("Failed to save version:", e);
  }
};
