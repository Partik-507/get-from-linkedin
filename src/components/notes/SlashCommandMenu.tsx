import { useState, useEffect, useCallback, useRef } from "react";
import { Editor } from "@tiptap/react";
import { cn } from "@/lib/utils";
import {
  Type, Heading1, Heading2, Heading3, Heading4, List, ListOrdered,
  CheckSquare, Quote, Code, Minus, Table, Image, Youtube, ToggleRight,
  AlertTriangle, Calculator, Link2, FileText, Database, Columns,
} from "lucide-react";

interface SlashCommand {
  label: string;
  description: string;
  icon: React.ElementType;
  action: (editor: Editor) => void;
  keywords: string[];
  shortcut?: string;
  category: string;
}

const commands: SlashCommand[] = [
  // Basic blocks
  { label: "Text", description: "Plain paragraph", icon: Type, keywords: ["text", "paragraph", "p"], shortcut: "", category: "Basic", action: (e) => e.chain().focus().setParagraph().run() },
  { label: "Heading 1", description: "Large section heading", icon: Heading1, keywords: ["h1", "heading", "title"], shortcut: "⌘⌥1", category: "Basic", action: (e) => e.chain().focus().toggleHeading({ level: 1 }).run() },
  { label: "Heading 2", description: "Medium heading", icon: Heading2, keywords: ["h2", "heading"], shortcut: "⌘⌥2", category: "Basic", action: (e) => e.chain().focus().toggleHeading({ level: 2 }).run() },
  { label: "Heading 3", description: "Small heading", icon: Heading3, keywords: ["h3", "heading"], shortcut: "⌘⌥3", category: "Basic", action: (e) => e.chain().focus().toggleHeading({ level: 3 }).run() },
  { label: "Heading 4", description: "Tiny heading", icon: Heading4, keywords: ["h4", "heading"], shortcut: "⌘⌥4", category: "Basic", action: (e) => e.chain().focus().toggleHeading({ level: 4 }).run() },
  
  // Lists
  { label: "Bullet List", description: "Unordered list", icon: List, keywords: ["bullet", "list", "ul", "-"], shortcut: "⌘⇧8", category: "Lists", action: (e) => e.chain().focus().toggleBulletList().run() },
  { label: "Numbered List", description: "Ordered list", icon: ListOrdered, keywords: ["number", "ordered", "ol", "1."], shortcut: "⌘⇧7", category: "Lists", action: (e) => e.chain().focus().toggleOrderedList().run() },
  { label: "Task List", description: "Checklist with checkboxes", icon: CheckSquare, keywords: ["todo", "task", "check", "checkbox"], shortcut: "⌘⇧9", category: "Lists", action: (e) => e.chain().focus().toggleTaskList().run() },
  
  // Content blocks
  { label: "Quote", description: "Block quote", icon: Quote, keywords: ["quote", "blockquote", ">"], shortcut: "⌘⇧B", category: "Content", action: (e) => e.chain().focus().toggleBlockquote().run() },
  { label: "Code Block", description: "Syntax highlighted code", icon: Code, keywords: ["code", "pre", "snippet", "```"], shortcut: "⌘⇧C", category: "Content", action: (e) => e.chain().focus().toggleCodeBlock().run() },
  { label: "Callout", description: "Highlighted info box", icon: AlertTriangle, keywords: ["callout", "info", "warning", "tip", "note", "alert"], category: "Content", action: (e) => {
    e.chain().focus().insertContent('<blockquote><p>💡 <strong>Note:</strong> Write your callout content here</p></blockquote>').run();
  }},
  { label: "Toggle", description: "Collapsible section", icon: ToggleRight, keywords: ["toggle", "collapse", "accordion", "details", "expand"], category: "Content", action: (e) => {
    e.chain().focus().insertContent('<details><summary>Click to expand</summary><p>Content here...</p></details>').run();
  }},
  { label: "Math Block", description: "LaTeX equation (KaTeX)", icon: Calculator, keywords: ["math", "latex", "equation", "formula", "katex"], category: "Content", action: (e) => {
    e.chain().focus().insertContent('<pre><code class="language-latex">E = mc^2</code></pre>').run();
  }},
  
  // Media
  { label: "Image", description: "Upload or paste an image", icon: Image, keywords: ["image", "picture", "img", "photo", "upload"], category: "Media", action: (e) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const url = ev.target?.result as string;
        (e.chain().focus() as any).setImage({ src: url }).run();
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }},
  { label: "YouTube", description: "Embed a YouTube video", icon: Youtube, keywords: ["youtube", "video", "embed"], category: "Media", action: (e) => {
    // We'll insert a placeholder and the editor will handle URL input inline
    const url = window.prompt("YouTube URL:");
    if (url) {
      const videoId = url.match(/(?:youtu\.be\/|v=)([^&\s]+)/)?.[1];
      if (videoId) {
        e.chain().focus().insertContent(`<div data-youtube="${videoId}" class="youtube-embed"><iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen style="width:100%;aspect-ratio:16/9;border-radius:8px;margin:8px 0"></iframe></div>`).run();
      }
    }
  }},
  
  // Structure
  { label: "Divider", description: "Horizontal line", icon: Minus, keywords: ["divider", "hr", "line", "separator", "---"], category: "Structure", action: (e) => e.chain().focus().setHorizontalRule().run() },
  { label: "Table", description: "Insert a 3×3 table", icon: Table, keywords: ["table", "grid", "spreadsheet"], category: "Structure", action: (e) => (e.chain().focus() as any).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
  
  // Links
  { label: "Note Link", description: "Link to another note [[]]", icon: Link2, keywords: ["link", "backlink", "reference", "wikilink", "[["], category: "Links", action: (e) => {
    e.chain().focus().insertContent("[[]]").run();
    // Move cursor inside brackets
    const { from } = e.state.selection;
    e.chain().focus().setTextSelection(from - 2).run();
  }},
  
  // Pages & Database
  { label: "Page", description: "Create a sub-page", icon: FileText, keywords: ["page", "subpage", "nested", "child"], category: "Advanced", action: (e) => {
    // This will be handled by the parent component via onCreateSubPage callback
    const event = new CustomEvent("notes-create-subpage");
    window.dispatchEvent(event);
  }},
  { label: "Database", description: "Inline table database", icon: Database, keywords: ["database", "db", "inline", "table"], category: "Advanced", action: (e) => {
    e.chain().focus().insertContent('<table><tr><th>Name</th><th>Type</th><th>Status</th></tr><tr><td></td><td></td><td></td></tr><tr><td></td><td></td><td></td></tr></table>').run();
  }},
];

interface Props {
  editor: Editor;
}

export const SlashCommandMenu = ({ editor }: Props) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [slashPos, setSlashPos] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const filtered = commands.filter(c =>
    !query || c.label.toLowerCase().includes(query.toLowerCase()) ||
    c.keywords.some(k => k.includes(query.toLowerCase()))
  );

  // Group by category
  const grouped = filtered.reduce((acc, cmd) => {
    if (!acc[cmd.category]) acc[cmd.category] = [];
    acc[cmd.category].push(cmd);
    return acc;
  }, {} as Record<string, SlashCommand[]>);

  const flatFiltered = Object.values(grouped).flat();

  const executeCommand = useCallback((cmd: SlashCommand) => {
    if (slashPos !== null) {
      const { from } = editor.state.selection;
      editor.chain().focus().deleteRange({ from: slashPos, to: from }).run();
    }
    cmd.action(editor);
    setOpen(false);
    setQuery("");
    setSlashPos(null);
  }, [editor, slashPos]);

  const handleSlash = useCallback(() => {
    const { from } = editor.state.selection;
    const coords = editor.view.coordsAtPos(from);
    const editorEl = editor.view.dom.closest(".tiptap-editor");
    const rect = editorEl?.getBoundingClientRect() || editor.view.dom.getBoundingClientRect();
    
    setPosition({
      top: coords.bottom - rect.top + 4,
      left: Math.min(Math.max(coords.left - rect.left, 0), rect.width - 280),
    });
    setOpen(true);
    setQuery("");
    setSelected(0);
    setSlashPos(from - 1);
  }, [editor]);

  useEffect(() => {
    if (!editor) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;
      
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelected(s => Math.min(s + 1, flatFiltered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelected(s => Math.max(s - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (flatFiltered[selected]) executeCommand(flatFiltered[selected]);
      } else if (e.key === "Escape") {
        setOpen(false);
        setQuery("");
        setSlashPos(null);
      } else if (e.key === "Backspace") {
        if (query.length === 0) {
          setOpen(false);
          setSlashPos(null);
        } else {
          setQuery(q => q.slice(0, -1));
          setSelected(0);
        }
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
        setQuery(q => q + e.key);
        setSelected(0);
      }
    };

    const handleTransaction = () => {
      if (open) return;
      const { from, empty } = editor.state.selection;
      if (!empty || from < 1) return;
      
      const char = editor.state.doc.textBetween(from - 1, from);
      if (char !== "/") return;
      
      // Check: slash at start of line or after whitespace
      if (from === 1) {
        handleSlash();
        return;
      }
      
      const before = editor.state.doc.textBetween(from - 2, from - 1);
      // Allow slash after newline, space, or at position 1 in a block
      if (before === "\n" || before === " " || before === "\u00A0") {
        handleSlash();
        return;
      }
      
      // Check if at start of a text block
      const $pos = editor.state.doc.resolve(from - 1);
      if ($pos.parentOffset === 0) {
        handleSlash();
      }
    };

    editor.on("transaction", handleTransaction);
    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      editor.off("transaction", handleTransaction);
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [editor, open, query, selected, flatFiltered, handleSlash, executeCommand]);

  // Click outside to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
        setSlashPos(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Scroll selected into view
  useEffect(() => {
    if (!menuRef.current) return;
    const el = menuRef.current.querySelector(`[data-idx="${selected}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  if (!open || flatFiltered.length === 0) return null;

  let globalIdx = 0;

  return (
    <div
      ref={menuRef}
      className="absolute z-50 bg-popover/98 backdrop-blur-xl border border-border/50 rounded-xl shadow-xl py-1 w-72 max-h-[380px] overflow-y-auto modal-shadow"
      style={{ top: position.top, left: position.left }}
    >
      {query && (
        <div className="px-3 py-1.5 text-[10px] text-muted-foreground/50 font-body border-b border-border/20 mb-0.5">
          Search: <span className="text-foreground/70 font-medium">"{query}"</span>
        </div>
      )}
      {Object.entries(grouped).map(([category, cmds]) => (
        <div key={category}>
          <div className="px-3 py-1 text-[9px] font-body font-semibold text-muted-foreground/40 uppercase tracking-widest">
            {category}
          </div>
          {cmds.map((cmd) => {
            const idx = globalIdx++;
            return (
              <button
                key={cmd.label}
                data-idx={idx}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 text-left transition-all",
                  idx === selected ? "bg-primary/10 text-foreground" : "hover:bg-accent/40 text-foreground/80"
                )}
                onMouseEnter={() => setSelected(idx)}
                onClick={() => executeCommand(cmd)}
              >
                <div className={cn(
                  "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                  idx === selected ? "bg-primary/15 text-primary" : "bg-accent/30 text-muted-foreground/60"
                )}>
                  <cmd.icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-body font-medium">{cmd.label}</div>
                  <div className="text-[10px] text-muted-foreground/50 font-body">{cmd.description}</div>
                </div>
                {cmd.shortcut && (
                  <span className="text-[9px] text-muted-foreground/30 font-mono shrink-0">{cmd.shortcut}</span>
                )}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
};
