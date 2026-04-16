import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Upload, FileArchive, FolderTree, ChevronRight, ChevronDown, FileText, AlertTriangle, Check } from "lucide-react";
import JSZip from "jszip";
import { marked } from "marked";

interface Props {
  open: boolean;
  onClose: () => void;
  onImportPage: (title: string, content: string, parentId?: string, folderId?: string) => Promise<{ id: string; title: string } | null>;
  onCreateFolder: (name: string, parentId?: string) => Promise<string | null>;
}

interface ParsedPage {
  path: string;
  title: string;
  content: string;
  children: ParsedPage[];
  isFolder: boolean;
}

type ImportStep = "upload" | "preview" | "importing" | "done";

function cleanNotionTitle(filename: string): string {
  // Notion exports append a 32-char UUID-like hash to filenames
  return filename
    .replace(/\.[^.]+$/, "") // remove extension
    .replace(/\s+[a-f0-9]{32}$/i, "") // remove Notion hash
    .replace(/_/g, " ")
    .trim() || "Untitled";
}

async function convertMarkdownToHtml(md: string): Promise<string> {
  try {
    // Clean up Notion-specific markdown
    let cleaned = md
      .replace(/^# .+\n/, "") // Remove first H1 (we use it as title)
      .replace(/%20/g, " ")
      .replace(/\[([^\]]+)\]\(([^)]+\.md)\)/g, "[[$1]]") // Convert md links to wikilinks
      .trim();
    
    const html = await marked(cleaned, { breaks: true, gfm: true });
    return typeof html === "string" ? html : "";
  } catch {
    return `<p>${md}</p>`;
  }
}

function csvToHtmlTable(csv: string): string {
  const lines = csv.split("\n").filter(l => l.trim());
  if (lines.length === 0) return "";
  
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
  const rows = lines.slice(1).map(l => l.split(",").map(c => c.trim().replace(/^"|"$/g, "")));
  
  let html = "<table><thead><tr>";
  headers.forEach(h => { html += `<th>${h}</th>`; });
  html += "</tr></thead><tbody>";
  rows.forEach(row => {
    html += "<tr>";
    row.forEach(cell => { html += `<td>${cell}</td>`; });
    html += "</tr>";
  });
  html += "</tbody></table>";
  return html;
}

function buildTree(files: { path: string; content: string; type: "md" | "csv" | "html" }[]): ParsedPage[] {
  const root: ParsedPage[] = [];
  const map = new Map<string, ParsedPage>();

  // Sort files to ensure parent dirs are processed first
  files.sort((a, b) => a.path.localeCompare(b.path));

  for (const file of files) {
    const parts = file.path.split("/").filter(p => p);
    const filename = parts[parts.length - 1];
    const title = cleanNotionTitle(filename);
    
    const page: ParsedPage = {
      path: file.path,
      title,
      content: file.content,
      children: [],
      isFolder: false,
    };

    // Find parent
    if (parts.length > 1) {
      // Look for parent directory
      const parentPath = parts.slice(0, -1).join("/");
      let parent = map.get(parentPath);
      
      if (!parent) {
        // Create folder placeholder
        parent = {
          path: parentPath,
          title: cleanNotionTitle(parts[parts.length - 2]),
          content: "",
          children: [],
          isFolder: true,
        };
        map.set(parentPath, parent);
        
        // Attach folder to its parent or root
        if (parts.length > 2) {
          const grandParentPath = parts.slice(0, -2).join("/");
          const grandParent = map.get(grandParentPath);
          if (grandParent) {
            grandParent.children.push(parent);
          } else {
            root.push(parent);
          }
        } else {
          root.push(parent);
        }
      }
      parent.children.push(page);
    } else {
      root.push(page);
    }
    
    map.set(file.path.replace(/\.[^.]+$/, ""), page);
  }

  return root;
}

const TreePreview = ({ pages, depth = 0 }: { pages: ParsedPage[]; depth?: number }) => {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  
  return (
    <div>
      {pages.map(page => {
        const hasChildren = page.children.length > 0;
        const isOpen = expanded.has(page.path);
        
        return (
          <div key={page.path}>
            <div
              className="flex items-center gap-1.5 py-1 px-2 rounded-md hover:bg-muted/50 cursor-pointer text-sm font-body"
              style={{ paddingLeft: `${8 + depth * 16}px` }}
              onClick={() => {
                if (hasChildren) {
                  setExpanded(prev => {
                    const next = new Set(prev);
                    next.has(page.path) ? next.delete(page.path) : next.add(page.path);
                    return next;
                  });
                }
              }}
            >
              {hasChildren ? (
                isOpen ? <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" /> : <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
              ) : (
                <span className="w-3 shrink-0" />
              )}
              {page.isFolder ? (
                <FolderTree className="h-3.5 w-3.5 text-primary shrink-0" />
              ) : (
                <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              )}
              <span className="truncate">{page.title}</span>
            </div>
            {hasChildren && isOpen && (
              <TreePreview pages={page.children} depth={depth + 1} />
            )}
          </div>
        );
      })}
    </div>
  );
};

export const NotionImportModal = ({ open, onClose, onImportPage, onCreateFolder }: Props) => {
  const [step, setStep] = useState<ImportStep>("upload");
  const [tree, setTree] = useState<ParsedPage[]>([]);
  const [progress, setProgress] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [importedCount, setImportedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const resetState = () => {
    setStep("upload");
    setTree([]);
    setProgress(0);
    setTotalPages(0);
    setImportedCount(0);
    setError(null);
  };

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith(".zip")) {
      setError("Please upload a .zip file");
      return;
    }

    try {
      setError(null);
      const jsZip = new JSZip();
      const zip = await jsZip.loadAsync(file);
      const files: { path: string; content: string; type: "md" | "csv" | "html" }[] = [];

      for (const [path, zipEntry] of Object.entries(zip.files)) {
        if (zipEntry.dir) continue;
        
        const ext = path.split(".").pop()?.toLowerCase();
        if (ext === "md" || ext === "csv" || ext === "html") {
          const content = await zipEntry.async("text");
          let processedContent = content;
          
          if (ext === "md") {
            processedContent = await convertMarkdownToHtml(content);
          } else if (ext === "csv") {
            processedContent = csvToHtmlTable(content);
          }
          
          files.push({ path, content: processedContent, type: ext as "md" | "csv" | "html" });
        }
      }

      if (files.length === 0) {
        setError("No importable files found in ZIP");
        return;
      }

      const pageTree = buildTree(files);
      setTree(pageTree);
      setTotalPages(files.length);
      setStep("preview");
    } catch (err: any) {
      setError(err?.message || "Failed to parse ZIP file");
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const countPages = (pages: ParsedPage[]): number => {
    let count = 0;
    for (const p of pages) {
      if (!p.isFolder || p.content) count++;
      count += countPages(p.children);
    }
    return count;
  };

  const doImport = async () => {
    setStep("importing");
    const total = countPages(tree);
    setTotalPages(total);
    let imported = 0;

    const importChildren = async (pages: ParsedPage[], parentId?: string, folderId?: string) => {
      for (const page of pages) {
        if (page.isFolder && !page.content) {
          // Create a folder-like page or actual folder
          const result = await onImportPage(page.title, page.content || "<p></p>", parentId, folderId);
          if (result && page.children.length > 0) {
            await importChildren(page.children, result.id, folderId);
          }
        } else {
          const result = await onImportPage(page.title, page.content, parentId, folderId);
          imported++;
          setImportedCount(imported);
          setProgress(Math.round((imported / total) * 100));
          
          if (result && page.children.length > 0) {
            await importChildren(page.children, result.id, folderId);
          }
        }
      }
    };

    try {
      await importChildren(tree);
      setStep("done");
    } catch (err: any) {
      setError(err?.message || "Import failed");
      setStep("preview");
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => { onClose(); setTimeout(resetState, 300); }}>
      <DialogContent className="max-w-lg modal-shadow" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="font-heading text-xl flex items-center gap-2">
            <FileArchive className="h-5 w-5 text-primary" />
            Import from Notion
          </DialogTitle>
        </DialogHeader>

        {/* UPLOAD STEP */}
        {step === "upload" && (
          <div className="space-y-4 py-2">
            <p className="text-sm font-body text-muted-foreground">
              Upload your Notion export ZIP file. Go to Notion → Settings → Export all workspace content → Markdown & CSV.
            </p>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={cn(
                "border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer",
                dragOver ? "border-primary bg-primary/5" : "border-border/50 hover:border-primary/30 hover:bg-muted/20"
              )}
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = ".zip";
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) handleFile(file);
                };
                input.click();
              }}
            >
              <Upload className="h-10 w-10 text-primary/50 mx-auto mb-3" />
              <p className="text-sm font-body font-medium text-foreground">Drop your Notion ZIP here</p>
              <p className="text-xs text-muted-foreground font-body mt-1">or click to browse</p>
            </div>
            {error && (
              <div className="flex items-center gap-2 text-destructive text-sm font-body">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}
          </div>
        )}

        {/* PREVIEW STEP */}
        {step === "preview" && (
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-body text-muted-foreground">
                Found <span className="font-semibold text-foreground">{totalPages} pages</span> to import
              </p>
              <Button variant="ghost" size="sm" className="text-xs font-body" onClick={resetState}>
                Choose different file
              </Button>
            </div>
            <div className="max-h-[300px] overflow-y-auto border border-border/40 rounded-xl p-2 bg-muted/10">
              <TreePreview pages={tree} />
            </div>
            {error && (
              <div className="flex items-center gap-2 text-destructive text-sm font-body">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}
            <Button className="w-full font-body gap-2" onClick={doImport}>
              <Upload className="h-4 w-4" /> Import {totalPages} Pages
            </Button>
          </div>
        )}

        {/* IMPORTING STEP */}
        {step === "importing" && (
          <div className="space-y-4 py-6 text-center">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto animate-pulse">
              <FileArchive className="h-8 w-8 text-primary" />
            </div>
            <p className="text-sm font-body font-medium">Importing pages...</p>
            <Progress value={progress} className="h-2" />
            <p className="text-xs font-body text-muted-foreground">
              {importedCount} / {totalPages} pages imported
            </p>
          </div>
        )}

        {/* DONE STEP */}
        {step === "done" && (
          <div className="space-y-4 py-6 text-center">
            <div className="h-16 w-16 rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto">
              <Check className="h-8 w-8 text-green-500" />
            </div>
            <p className="text-sm font-body font-semibold text-foreground">Import Complete!</p>
            <p className="text-xs font-body text-muted-foreground">
              Successfully imported {importedCount} pages into your workspace.
            </p>
            <Button className="w-full font-body" onClick={() => { onClose(); setTimeout(resetState, 300); }}>
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
