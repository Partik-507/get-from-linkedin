import { useState, useEffect, useCallback, useRef } from "react";
import { Editor } from "@tiptap/react";
import { cn } from "@/lib/utils";
import {
  Type, Heading1, Heading2, Heading3, List, ListOrdered,
  CheckSquare, Quote, Code, Minus, Table, Image,
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
  { label: "Heading 2", description: "Medium heading", icon: Heading2, keywords: ["h2", "heading", "subtitle"], action: (e) => e.chain().focus().toggleHeading({ level: 2 }).run() },
  { label: "Heading 3", description: "Small heading", icon: Heading3, keywords: ["h3", "heading"], action: (e) => e.chain().focus().toggleHeading({ level: 3 }).run() },
  { label: "Bullet List", description: "Unordered list", icon: List, keywords: ["bullet", "list", "ul"], action: (e) => e.chain().focus().toggleBulletList().run() },
  { label: "Numbered List", description: "Ordered list", icon: ListOrdered, keywords: ["number", "ordered", "ol"], action: (e) => e.chain().focus().toggleOrderedList().run() },
  { label: "Checklist", description: "Task list with checkboxes", icon: CheckSquare, keywords: ["todo", "task", "check"], action: (e) => e.chain().focus().toggleTaskList().run() },
  { label: "Quote", description: "Block quote", icon: Quote, keywords: ["quote", "blockquote"], action: (e) => e.chain().focus().toggleBlockquote().run() },
  { label: "Code Block", description: "Code snippet", icon: Code, keywords: ["code", "pre", "snippet"], action: (e) => e.chain().focus().toggleCodeBlock().run() },
  { label: "Divider", description: "Horizontal rule", icon: Minus, keywords: ["divider", "hr", "line"], action: (e) => e.chain().focus().setHorizontalRule().run() },
  { label: "Table", description: "Insert table", icon: Table, keywords: ["table", "grid"], action: (e) => e.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
  { label: "Image", description: "Embed image by URL", icon: Image, keywords: ["image", "picture", "img"], action: (e) => { const url = prompt("Image URL:"); if (url) e.chain().focus().setImage({ src: url }).run(); } },
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
    const editorRect = editor.view.dom.closest(".flex-1")?.getBoundingClientRect();
    if (editorRect) {
      setPosition({ top: coords.bottom - editorRect.top + 4, left: coords.left - editorRect.left });
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
            // Delete the "/" and query text
            const { from } = editor.state.selection;
            const textBefore = editor.state.doc.textBetween(Math.max(0, from - query.length - 1), from, "\n");
            if (textBefore.startsWith("/")) {
              editor.chain().focus().deleteRange({ from: from - query.length - 1, to: from }).run();
            }
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
        // Check it's at start of line or after whitespace
        const before = from >= 2 ? editor.state.doc.textBetween(from - 2, from - 1) : "\n";
        if (before === "\n" || before === " " || from === 1) {
          handleSlash();
        }
      }
    };

    editor.on("transaction", handleTransaction);
    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      editor.off("transaction", handleTransaction);
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [editor, open, query, selected, filtered, handleSlash]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (!open || filtered.length === 0) return null;

  return (
    <div
      ref={menuRef}
      className="absolute z-50 bg-popover border border-border rounded-lg shadow-lg py-1 w-56 max-h-72 overflow-y-auto"
      style={{ top: position.top, left: position.left }}
    >
      {query && (
        <div className="px-3 py-1 text-[10px] text-muted-foreground font-body border-b border-border/40 mb-1">
          Filtering: "{query}"
        </div>
      )}
      {filtered.map((cmd, i) => (
        <button
          key={cmd.label}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 text-left transition-colors",
            i === selected ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
          )}
          onMouseEnter={() => setSelected(i)}
          onClick={() => {
            const { from } = editor.state.selection;
            editor.chain().focus().deleteRange({ from: from - query.length - 1, to: from }).run();
            cmd.action(editor);
            setOpen(false);
          }}
        >
          <cmd.icon className="h-4 w-4 text-muted-foreground shrink-0" />
          <div>
            <div className="text-sm font-body font-medium">{cmd.label}</div>
            <div className="text-[10px] text-muted-foreground font-body">{cmd.description}</div>
          </div>
        </button>
      ))}
    </div>
  );
};
