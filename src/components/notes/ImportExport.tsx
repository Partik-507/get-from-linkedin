import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileText, FileCode, FileType } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  onImport: (title: string, content: string) => void;
}

const mdToHtml = (md: string): string => {
  return md
    .replace(/^#### (.+)$/gm, "<h4>$1</h4>")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`)
    .replace(/^\d+\. (.+)$/gm, "<li>$1</li>")
    .replace(/^> (.+)$/gm, "<blockquote><p>$1</p></blockquote>")
    .replace(/---/g, "<hr>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/^(?!<[hluobr])(.+)$/gm, "<p>$1</p>");
};

export const ImportExportModal = ({ open, onClose, onImport }: Props) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pasteText, setPasteText] = useState("");

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      let content = ev.target?.result as string;
      const title = file.name.replace(/\.\w+$/, "");
      if (file.name.endsWith(".md")) {
        content = mdToHtml(content);
      } else if (file.name.endsWith(".html") || file.name.endsWith(".htm")) {
        // Keep HTML as-is
      } else {
        content = content.split("\n").map(l => `<p>${l}</p>`).join("");
      }
      onImport(title, content);
      onClose();
      toast.success(`Imported: ${title}`);
    };
    reader.readAsText(file);
  };

  const handlePaste = () => {
    if (!pasteText.trim()) return;
    const content = pasteText.split("\n").map(l => `<p>${l}</p>`).join("");
    onImport("Imported Note", content);
    setPasteText("");
    onClose();
    toast.success("Imported from clipboard!");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2"><Upload className="h-4 w-4 text-primary" /> Import Notes</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-xs text-muted-foreground font-body mb-2">Upload a file</p>
            <div className="grid grid-cols-3 gap-2">
              <Button variant="outline" size="sm" className="flex-col h-16 text-xs font-body gap-1" onClick={() => fileInputRef.current?.click()}>
                <FileText className="h-5 w-5 text-primary" />
                Markdown
              </Button>
              <Button variant="outline" size="sm" className="flex-col h-16 text-xs font-body gap-1" onClick={() => fileInputRef.current?.click()}>
                <FileCode className="h-5 w-5 text-primary" />
                HTML
              </Button>
              <Button variant="outline" size="sm" className="flex-col h-16 text-xs font-body gap-1" onClick={() => fileInputRef.current?.click()}>
                <FileType className="h-5 w-5 text-primary" />
                Plain Text
              </Button>
            </div>
            <input ref={fileInputRef} type="file" accept=".md,.html,.htm,.txt" onChange={handleFile} className="hidden" />
          </div>
          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border/30" /></div>
            <div className="relative flex justify-center"><span className="bg-popover px-3 text-[10px] text-muted-foreground font-body">or paste text</span></div>
          </div>
          <textarea
            value={pasteText}
            onChange={e => setPasteText(e.target.value)}
            placeholder="Paste your content here..."
            className="w-full h-24 text-xs font-body bg-accent/20 border border-border/30 rounded-lg p-3 resize-none outline-none focus:border-primary/40"
          />
          <Button onClick={handlePaste} disabled={!pasteText.trim()} className="w-full font-body text-xs">
            Import Pasted Text
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
