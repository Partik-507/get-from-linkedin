import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { History, RotateCcw, Eye } from "lucide-react";
import { getVersionSnapshots, saveVersionSnapshot as _save, type VersionSnapshot } from "@/lib/notesFirestore";

export const saveVersionSnapshot = _save;

interface Props { open: boolean; onClose: () => void; userId: string; noteId: string; currentContent: string; onRestore: (content: string) => void; }

export const VersionHistory = ({ open, onClose, userId, noteId, onRestore }: Props) => {
  const [versions, setVersions] = useState<VersionSnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<VersionSnapshot|null>(null);

  useEffect(() => {
    if (!open||!userId||!noteId) return;
    setLoading(true);
    getVersionSnapshots(userId, noteId).then(v=>{setVersions(v);setLoading(false);});
  }, [open, userId, noteId]);

  const fmt=(v:VersionSnapshot)=>{try{return(v.savedAt?.toDate?.()||new Date(parseInt(v.id))).toLocaleString();}catch{return v.id;}};

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader><DialogTitle className="font-heading flex items-center gap-2"><History className="h-4 w-4 text-primary"/> Version History</DialogTitle></DialogHeader>
        <div className="flex gap-4 flex-1 min-h-0 overflow-hidden">
          <div className="w-48 shrink-0 overflow-y-auto border-r border-border/30 pr-3 space-y-1">
            {loading?<div className="space-y-2">{[1,2,3].map(i=><div key={i} className="h-10 skeleton-pulse"/>)}</div>:
            versions.length===0?<p className="text-xs text-muted-foreground/40 font-body">No versions</p>:
            versions.map(v=>(
              <button key={v.id} onClick={()=>setPreview(v)} className={cn("w-full text-left p-2 rounded-lg text-xs font-body",preview?.id===v.id?"bg-primary/10 text-primary":"hover:bg-accent/40")}>
                <p className="font-medium truncate">{v.title||"Untitled"}</p>
                <p className="text-[10px] text-muted-foreground/50">{fmt(v)}</p>
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto">
            {preview?(
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-muted-foreground font-body flex items-center gap-1"><Eye className="h-3 w-3"/> Preview</p>
                  <Button size="sm" className="text-xs font-body gap-1" onClick={()=>{onRestore(preview.content);onClose();}}><RotateCcw className="h-3 w-3"/> Restore</Button>
                </div>
                <div className="tiptap-editor prose-notes text-sm" dangerouslySetInnerHTML={{__html:preview.content}}/>
              </div>
            ):<div className="flex items-center justify-center h-full"><p className="text-xs text-muted-foreground/30 font-body">Select a version</p></div>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
