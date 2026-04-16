import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Upload, FileText, Code2, FolderArchive, Check, Loader2, X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onImport: (title: string, content: string) => void;
}

type Tab = "markdown" | "html" | "notion";

// ─── Markdown → TipTap HTML conversion ───────────────────────────────────────
function markdownToHtml(md: string): string {
  const lines = md.split("\n");
  const html: string[] = [];
  let inCode = false;
  let codeLang = "";
  let codeLines: string[] = [];
  let inUl = false;
  let inOl = false;

  const closeList = () => {
    if (inUl) { html.push("</ul>"); inUl = false; }
    if (inOl) { html.push("</ol>"); inOl = false; }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code block
    if (line.startsWith("```")) {
      if (!inCode) {
        closeList();
        inCode = true;
        codeLang = line.slice(3).trim();
        codeLines = [];
      } else {
        html.push(`<pre><code class="language-${codeLang || "plaintext"}">${codeLines.join("\n")}</code></pre>`);
        inCode = false;
      }
      continue;
    }
    if (inCode) { codeLines.push(line.replace(/</g, "&lt;").replace(/>/g, "&gt;")); continue; }

    // Headings
    const hMatch = line.match(/^(#{1,6})\s+(.*)/);
    if (hMatch) {
      closeList();
      const level = hMatch[1].length;
      html.push(`<h${level}>${inlineFormat(hMatch[2])}</h${level}>`);
      continue;
    }

    // Blockquote
    if (line.startsWith("> ")) {
      closeList();
      html.push(`<blockquote><p>${inlineFormat(line.slice(2))}</p></blockquote>`);
      continue;
    }

    // Horizontal rule
    if (/^[-*]{3,}$/.test(line.trim())) {
      closeList();
      html.push("<hr>");
      continue;
    }

    // Unordered list
    const ulMatch = line.match(/^[-*+]\s+(.*)/);
    if (ulMatch) {
      if (!inUl) { closeList(); html.push("<ul>"); inUl = true; }
      html.push(`<li>${inlineFormat(ulMatch[1])}</li>`);
      continue;
    }

    // Ordered list
    const olMatch = line.match(/^\d+\.\s+(.*)/);
    if (olMatch) {
      if (!inOl) { closeList(); html.push("<ol>"); inOl = true; }
      html.push(`<li>${inlineFormat(olMatch[1])}</li>`);
      continue;
    }

    // Empty line
    if (!line.trim()) {
      closeList();
      if (html.length && !html[html.length - 1].endsWith(">")) html.push("");
      continue;
    }

    // Paragraph
    closeList();
    html.push(`<p>${inlineFormat(line)}</p>`);
  }

  closeList();
  return html.join("\n");
}

function inlineFormat(text: string): string {
  return text
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/~~(.+?)~~/g, "<s>$1</s>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}

// ─── HTML DOM → clean HTML ────────────────────────────────────────────────────
function cleanHtml(raw: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(raw, "text/html");
  // Remove scripts, styles, meta
  doc.querySelectorAll("script,style,meta,link").forEach(el => el.remove());
  return doc.body.innerHTML;
}

// ─── Component ───────────────────────────────────────────────────────────────
export const ImportExportModal = ({ open, onClose, onImport }: Props) => {
  const [activeTab, setActiveTab] = useState<Tab>("markdown");
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [importedFiles, setImportedFiles] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const tabs: { key: Tab; label: string; icon: React.ElementType; accept: string; hint: string }[] = [
    { key: "markdown", label: "Markdown", icon: FileText, accept: ".md,.txt", hint: "Drop .md or .txt files here" },
    { key: "html",     label: "HTML",     icon: Code2,    accept: ".html",    hint: "Drop .html files here" },
    { key: "notion",   label: "Notion Export", icon: FolderArchive, accept: ".zip", hint: "Drop Notion .zip export here" },
  ];

  const currentTab = tabs.find(t => t.key === activeTab)!;

  const processFile = async (file: File) => {
    setProcessing(true);
    try {
      const name = file.name.replace(/\.[^.]+$/, "");

      if (activeTab === "markdown" || file.name.endsWith(".md") || file.name.endsWith(".txt")) {
        const text = await file.text();
        const html = markdownToHtml(text);
        onImport(name, html);
        setImportedFiles(prev => [...prev, file.name]);
        toast.success(`Imported "${name}"`);
      }

      else if (activeTab === "html" || file.name.endsWith(".html")) {
        const text = await file.text();
        const html = cleanHtml(text);
        onImport(name, html);
        setImportedFiles(prev => [...prev, file.name]);
        toast.success(`Imported "${name}"`);
      }

      else if (activeTab === "notion" || file.name.endsWith(".zip")) {
        const JSZipLib = await import("jszip");
        const JSZip = JSZipLib.default || JSZipLib;
        const jsZipInstance = new (JSZip as any)();
        const zip = await jsZipInstance.loadAsync(file);
        const pages: { title: string; html: string }[] = [];

        await Promise.all(
          Object.entries(zip.files).map(async ([path, zipEntry]) => {
            if (zipEntry.dir) return;
            const fileName = path.split("/").pop() || path;
            const baseName = fileName.replace(/\.[^.]+$/, "");

            if (fileName.endsWith(".md")) {
              const text = await zipEntry.async("string");
              pages.push({ title: baseName, html: markdownToHtml(text) });
            } else if (fileName.endsWith(".html")) {
              const text = await zipEntry.async("string");
              pages.push({ title: baseName, html: cleanHtml(text) });
            }
          })
        );

        for (const page of pages) onImport(page.title, page.html);
        setImportedFiles(prev => [...prev, ...pages.map(p => p.title)]);
        toast.success(`Imported ${pages.length} pages from Notion export`);
      }

    } catch (err) {
      toast.error("Failed to import file. Please check the format.");
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(processFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleClose = () => {
    setImportedFiles([]);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg font-body">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading text-base">
            <Upload className="h-4 w-4 text-primary" />
            Import Pages
          </DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex border-b border-[#E5E7EB] -mx-6 px-6">
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-1.5 px-3 pb-2 text-xs font-body transition-all border-b-2 -mb-px",
                activeTab === tab.key
                  ? "border-[#6D28D9] text-[#6D28D9] font-medium"
                  : "border-transparent text-[#6B7280] hover:text-[#111827]"
              )}>
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Drop zone */}
        <div
          onDragEnter={() => setDragging(true)}
          onDragLeave={() => setDragging(false)}
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={cn(
            "border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all",
            dragging
              ? "border-[#6D28D9] bg-[#EDE9FE]/30"
              : "border-[#E5E7EB] hover:border-[#6D28D9]/50 hover:bg-[#F9FAFB]"
          )}
        >
          <input ref={fileRef} type="file" multiple accept={currentTab.accept}
            className="hidden" onChange={e => handleFiles(e.target.files)} />

          {processing ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-10 w-10 text-[#6D28D9] animate-spin" />
              <p className="text-sm font-body text-[#6B7280]">Processing...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="h-14 w-14 rounded-2xl bg-[#EDE9FE] flex items-center justify-center">
                <currentTab.icon className="h-7 w-7 text-[#6D28D9]" />
              </div>
              <div>
                <p className="text-sm font-body font-medium text-[#111827]">{currentTab.hint}</p>
                <p className="text-xs text-[#9CA3AF] font-body mt-1">or click to browse files</p>
              </div>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {currentTab.accept.split(",").map(ext => (
                  <span key={ext} className="px-2 py-0.5 bg-[#F3F4F6] text-[#6B7280] rounded-full text-[10px] font-body font-medium">
                    {ext}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Format notes */}
        <div className="text-[11px] text-[#9CA3AF] font-body space-y-0.5 -mt-1">
          {activeTab === "markdown" && <p>Supports headings, lists, code blocks, blockquotes, bold, italic, and links.</p>}
          {activeTab === "html" && <p>HTML files are parsed and cleaned. Scripts and styles are removed.</p>}
          {activeTab === "notion" && <p>Export your Notion workspace as HTML/Markdown, then drop the .zip here. All pages and nested content will be imported.</p>}
        </div>

        {/* Imported files list */}
        {importedFiles.length > 0 && (
          <div className="max-h-32 overflow-y-auto space-y-1 border border-[#E5E7EB] rounded-xl p-2">
            <p className="text-[10px] font-body font-semibold text-[#9CA3AF] uppercase tracking-wider px-1 mb-2">Imported ({importedFiles.length})</p>
            {importedFiles.map((f, i) => (
              <div key={i} className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-[#F9FAFB]">
                <Check className="h-3 w-3 text-green-500 shrink-0" />
                <span className="text-xs font-body text-[#111827] truncate">{f}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={handleClose} className="text-xs font-body">
            {importedFiles.length > 0 ? "Done" : "Cancel"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
