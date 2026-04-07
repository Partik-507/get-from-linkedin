import { useState, useEffect, useCallback, useRef } from "react";
import { Editor } from "@tiptap/react";
import { cn } from "@/lib/utils";
import {
  Type, Heading1, Heading2, Heading3, Heading4, List, ListOrdered,
  CheckSquare, Quote, Code, Minus, Table, Image, Youtube, ToggleRight,
  AlertTriangle, Calculator, Link2,
} from "lucide-react";

interface SlashCommand {
  label: string;
  description: string;
  icon: React.ElementType;
  action: (editor: Editor) => void;
  keywords: string[];
}

const commands: SlashCommand[] = [
  { label: "Text", description: "Plain text block", icon: Type, keywords: ["text", "paragraph"], action: (e) => e.chain().focus().setParagraph().run() },
  { label: "Heading 1", description: "Large heading", icon: Heading1, keywords: ["h1", "heading", "title"], action: (e) => e.chain().focus().toggleHeading({ level: 1 }).run() },
  { label: "Heading 2", description: "Medium heading", icon: Heading2, keywords: ["h2", "heading"], action: (e) => e.chain().focus().toggleHeading({ level: 2 }).run() },
  { label: "Heading 3", description: "Small heading", icon: Heading3, keywords: ["h3", "heading"], action: (e) => e.chain().focus().toggleHeading({ level: 3 }).run() },
  { label: "Heading 4", description: "Tiny heading", icon: Heading4, keywords: ["h4", "heading"], action: (e) => e.chain().focus().toggleHeading({ level: 4 }).run() },
  { label: "Bullet List", description: "Unordered list", icon: List, keywords: ["bullet", "list", "ul"], action: (e) => e.chain().focus().toggleBulletList().run() },
  { label: "Numbered List", description: "Ordered list", icon: ListOrdered, keywords: ["number", "ordered", "ol"], action: (e) => e.chain().focus().toggleOrderedList().run() },
  { label: "Checklist", description: "Task list with checkboxes", icon: CheckSquare, keywords: ["todo", "task", "check"], action: (e) => e.chain().focus().toggleTaskList().run() },
  { label: "Quote", description: "Block quote", icon: Quote, keywords: ["quote", "blockquote"], action: (e) => e.chain().focus().toggleBlockquote().run() },
  { label: "Code Block", description: "Syntax highlighted code", icon: Code, keywords: ["code", "pre", "snippet"], action: (e) => e.chain().focus().toggleCodeBlock().run() },
  { label: "Divider", description: "Horizontal separator", icon: Minus, keywords: ["divider", "hr", "line", "separator"], action: (e) => e.chain().focus().setHorizontalRule().run() },
  { label: "Table", description: "Insert 3×3 table", icon: Table, keywords: ["table", "grid", "spreadsheet"], action: (e) => (e.chain().focus() as any).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
  { label: "Image", description: "Embed image by URL", icon: Image, keywords: ["image", "picture", "img", "photo"], action: (e) => { const url = prompt("Image URL:"); if (url) (e.chain().focus() as any).setImage({ src: url }).run(); } },
  { label: "YouTube Video", description: "Embed YouTube video", icon: Youtube, keywords: ["youtube", "video", "embed"], action: (e) => {
    const url = prompt("YouTube URL:");
    if (url) {
      const videoId = url.match(/(?:youtu\.be\/|v=)([^&\s]+)/)?.[1];
      if (videoId) {
        e.chain().focus().insertContent(`<div class="youtube-embed" data-youtube="${videoId}"><iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen style="width:100%;aspect-ratio:16/9;border-radius:8px;margin:8px 0"></iframe></div>`).run();
      }
    }
  }},
  { label: "Callout", description: "Highlighted info box", icon: AlertTriangle, keywords: ["callout", "info", "warning", "tip", "note"], action: (e) => {
    e.chain().focus().insertContent('<blockquote><p>💡 <strong>Note:</strong> Write your callout content here</p></blockquote>').run();
  }},
  { label: "Toggle", description: "Collapsible section", icon: ToggleRight, keywords: ["toggle", "collapse", "accordion", "details"], action: (e) => {
    e.chain().focus().insertContent('<details><summary>Click to expand</summary><p>Hidden content here...</p></details>').run();
  }},
  { label: "Math", description: "LaTeX equation", icon: Calculator, keywords: ["math", "latex", "equation", "formula", "katex"], action: (e) => {
    e.chain().focus().insertContent('<code>$$E = mc^2$$</code>').run();
  }},
  { label: "Note Link", description: "Link to another note [[]]", icon: Link2, keywords: ["link", "backlink", "reference", "wikilink"], action: (e) => {
    e.chain().focus().insertContent('[[').run();
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
  const menuRef = useRef<HTMLDivElement>(null);

  const filtered = commands.filter(c =>
    !query || c.label.toLowerCase().includes(query.toLowerCase()) ||
    c.keywords.some(k => k.includes(query.toLowerCase()))
  );

  const handleSlash = useCallback(() => {
    const { from } = editor.state.selection;
    const coords = editor.view.coordsAtPos(from);
    const editorRect = editor.view.dom.closest(".tiptap-editor")?.getBoundingClientRect() ||
                       editor.view.dom.closest(".flex-1")?.getBoundingClientRect();
    if (editorRect) {
      setPosition({ top: coords.bottom - editorRect.top + 4, left: Math.min(coords.left - editorRect.left, editorRect.width - 240) });
    } else {
      setPosition({ top: coords.bottom + 4, left: coords.left });
    }
    setOpen(true);
    setQuery("");
    setSelected(0);
  }, [editor]);

  useEffect(() => {
    if (!editor) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (open) {
        if (e.key === "ArrowDown") { e.preventDefault(); setSelected(s => Math.min(s + 1, filtered.length - 1)); }
        else if (e.key === "ArrowUp") { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
        else if (e.key === "Enter") {
          e.preventDefault();
          if (filtered[selected]) {
            const { from } = editor.state.selection;
            const deleteFrom = Math.max(0, from - query.length - 1);
            editor.chain().focus().deleteRange({ from: deleteFrom, to: from }).run();
            filtered[selected].action(editor);
            setOpen(false);
          }
        }
        else if (e.key === "Escape") { setOpen(false); }
        else if (e.key === "Backspace") {
          if (query.length === 0) setOpen(false);
          else setQuery(q => q.slice(0, -1));
        }
        else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
          setQuery(q => q + e.key);
          setSelected(0);
        }
      }
    };

    const handleTransaction = () => {
      if (open) return;
      const { from } = editor.state.selection;
      if (from < 1) return;
      const char = editor.state.doc.textBetween(from - 1, from);
      if (char === "/") {
        const before = from >= 2 ? editor.state.doc.textBetween(from - 2, from - 1) : "\n";
        if (before === "\n" || before === " " || from === 1) handleSlash();
      }
    };

    editor.on("transaction", handleTransaction);
    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      editor.off("transaction", handleTransaction);
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [editor, open, query, selected, filtered, handleSlash]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Scroll selected item into view
  useEffect(() => {
    if (!menuRef.current) return;
    const el = menuRef.current.querySelector(`[data-index="${selected}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  if (!open || filtered.length === 0) return null;

  return (
    <div
      ref={menuRef}
      className="absolute z-50 bg-popover/95 backdrop-blur-lg border border-border/60 rounded-xl shadow-xl py-1.5 w-60 max-h-80 overflow-y-auto"
      style={{ top: position.top, left: position.left }}
    >
      {query && (
        <div className="px-3 py-1 text-[10px] text-muted-foreground/50 font-body border-b border-border/20 mb-1">
          Filtering: <span className="text-foreground/70">"{query}"</span>
        </div>
      )}
      {filtered.map((cmd, i) => (
        <button
          key={cmd.label}
          data-index={i}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 text-left transition-all",
            i === selected ? "bg-primary/10 text-foreground" : "hover:bg-accent/40 text-foreground/80"
          )}
          onMouseEnter={() => setSelected(i)}
          onClick={() => {
            const { from } = editor.state.selection;
            editor.chain().focus().deleteRange({ from: Math.max(0, from - query.length - 1), to: from }).run();
            cmd.action(editor);
            setOpen(false);
          }}
        >
          <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
            i === selected ? "bg-primary/15 text-primary" : "bg-accent/30 text-muted-foreground/60"
          )}>
            <cmd.icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-body font-medium truncate">{cmd.label}</div>
            <div className="text-[10px] text-muted-foreground/50 font-body truncate">{cmd.description}</div>
          </div>
        </button>
      ))}
    </div>
  );
};
