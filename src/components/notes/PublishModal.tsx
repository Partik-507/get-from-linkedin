import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Globe, Hash, X } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  onPublish: (data: { description: string; subject: string; branch: string; level: string; tags: string[] }) => Promise<void>;
  noteTitle: string;
  existingTags: string[];
}

export const PublishModal = ({ open, onClose, onPublish, noteTitle, existingTags }: Props) => {
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("");
  const [branch, setBranch] = useState("");
  const [level, setLevel] = useState("");
  const [tags, setTags] = useState<string[]>(existingTags);
  const [tagInput, setTagInput] = useState("");
  const [publishing, setPublishing] = useState(false);

  const handlePublish = async () => {
    if (!description.trim()) { toast.error("Add a description"); return; }
    setPublishing(true);
    try {
      await onPublish({ description, subject, branch, level, tags });
      onClose();
      toast.success("Note published to Public Library!");
    } catch { toast.error("Failed to publish"); }
    finally { setPublishing(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2"><Globe className="h-4 w-4 text-primary" /> Publish to Public Library</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-xs text-muted-foreground font-body mb-1">Note</p>
            <p className="text-sm font-body font-medium">{noteTitle}</p>
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-body mb-1 block">Description (max 200 chars)</label>
            <Input value={description} onChange={e => setDescription(e.target.value.slice(0, 200))}
              placeholder="Brief description of this note..." className="text-sm font-body" />
            <p className="text-[10px] text-muted-foreground/50 mt-1">{description.length}/200</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-muted-foreground font-body mb-1 block">Subject</label>
              <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Math" className="text-xs font-body h-8" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-body mb-1 block">Branch</label>
              <Input value={branch} onChange={e => setBranch(e.target.value)} placeholder="e.g. BSc" className="text-xs font-body h-8" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-body mb-1 block">Level</label>
              <Input value={level} onChange={e => setLevel(e.target.value)} placeholder="e.g. L1" className="text-xs font-body h-8" />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-body mb-1 block">Tags</label>
            <div className="flex flex-wrap gap-1 mb-1.5">
              {tags.map(t => (
                <Badge key={t} variant="secondary" className="text-[10px] font-body gap-1 cursor-pointer" onClick={() => setTags(tags.filter(x => x !== t))}>
                  <Hash className="h-2.5 w-2.5" />{t} <X className="h-2 w-2" />
                </Badge>
              ))}
            </div>
            <Input value={tagInput} onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && tagInput.trim()) { setTags([...new Set([...tags, tagInput.trim()])]); setTagInput(""); } }}
              placeholder="Add tag + Enter" className="text-xs font-body h-8" />
          </div>
          <Button onClick={handlePublish} disabled={publishing} className="w-full font-body gap-2">
            <Globe className="h-4 w-4" /> {publishing ? "Publishing..." : "Publish Note"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
