import { useState, useEffect, useCallback, useRef } from "react";
import { Editor } from "@tiptap/react";
import { cn } from "@/lib/utils";
import {
  Type, Heading1, Heading2, Heading3, Heading4, List, ListOrdered,
  CheckSquare, Quote, Code, Minus, Table, Image, Youtube, ToggleRight,
  AlertTriangle, Calculator, Link2, FileText, Database, Columns2, Columns,
  Bookmark, Info, CheckCircle, XCircle, Lightbulb, Hash, AtSign,
  LayoutList, GripHorizontal, FilePlus, ExternalLink,
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

interface Props {
  editor: Editor;
  allNotes?: { id: string; title: string }[];
  onCreateSubpage?: (parentId?: string) => Promise<{ id: string; title: string } | null>;
  currentNoteId?: string;
}

const makeCommands = (
  allNotes: { id: string; title: string }[] = [],
  onCreateSubpage?: Props["onCreateSubpage"],
  currentNoteId?: string,
): SlashCommand[] => [
  // ── Basic Blocks ──────────────────────────────────────────────────────────
  { label: "Text", description: "Plain paragraph", icon: Type, keywords: ["text", "paragraph", "p"], shortcut: "", category: "Basic", action: e => e.chain().focus().setParagraph().run() },
  { label: "Heading 1", description: "Large section heading", icon: Heading1, keywords: ["h1", "heading", "title"], shortcut: "⌘⌥1", category: "Basic", action: e => e.chain().focus().toggleHeading({ level: 1 }).run() },
  { label: "Heading 2", description: "Medium heading", icon: Heading2, keywords: ["h2", "heading"], shortcut: "⌘⌥2", category: "Basic", action: e => e.chain().focus().toggleHeading({ level: 2 }).run() },
  { label: "Heading 3", description: "Small heading", icon: Heading3, keywords: ["h3", "heading"], shortcut: "⌘⌥3", category: "Basic", action: e => e.chain().focus().toggleHeading({ level: 3 }).run() },
  { label: "Heading 4", description: "Tiny heading", icon: Heading4, keywords: ["h4", "heading"], category: "Basic", action: e => e.chain().focus().toggleHeading({ level: 4 }).run() },
  { label: "Bullet List", description: "Unordered list", icon: List, keywords: ["bullet", "list", "ul", "-"], shortcut: "⌘⇧8", category: "Basic", action: e => e.chain().focus().toggleBulletList().run() },
  { label: "Numbered List", description: "Ordered list", icon: ListOrdered, keywords: ["number", "ordered", "ol", "1."], shortcut: "⌘⇧7", category: "Basic", action: e => e.chain().focus().toggleOrderedList().run() },
  { label: "Task List", description: "Checklist with checkboxes", icon: CheckSquare, keywords: ["todo", "task", "check", "checkbox"], category: "Basic", action: e => e.chain().focus().toggleTaskList().run() },
  { label: "Toggle", description: "Collapsible section", icon: ToggleRight, keywords: ["toggle", "collapse", "accordion"], category: "Basic", action: e => (e.chain().focus() as any).setToggle().run() },
  { label: "Quote", description: "Block quote", icon: Quote, keywords: ["quote", "blockquote", ">"], category: "Basic", action: e => e.chain().focus().toggleBlockquote().run() },
  { label: "Divider", description: "Horizontal line", icon: Minus, keywords: ["divider", "hr", "line", "---"], category: "Basic", action: e => e.chain().focus().setHorizontalRule().run() },
  { label: "Code Block", description: "Syntax highlighted code", icon: Code, keywords: ["code", "pre", "snippet", "```"], category: "Basic", action: e => e.chain().focus().toggleCodeBlock().run() },

  // ── Pages ─────────────────────────────────────────────────────────────────
  {
    label: "New Sub-page",
    description: "Create a nested page here",
    icon: FilePlus,
    keywords: ["page", "subpage", "nested", "child", "create"],
    category: "Pages",
    action: async (e) => {
      if (!onCreateSubpage) return;
      const newPage = await onCreateSubpage(currentNoteId);
      if (newPage) {
        (e.chain().focus() as any).setPageLink(newPage.id, newPage.title).run();
      }
    },
  },
  ...allNotes.slice(0, 12).map(n => ({
    label: n.title || "Untitled",
    description: "Insert link to this page",
    icon: ExternalLink as React.ElementType,
    keywords: ["link", "page", (n.title || "").toLowerCase()],
    category: "Link to Page",
    action: (e: Editor) => (e.chain().focus() as any).setPageLink(n.id, n.title).run(),
  })),

  // ── Callouts ──────────────────────────────────────────────────────────────
  { label: "Callout (Info)", description: "Blue info box", icon: Info, keywords: ["callout", "info", "note", "alert"], category: "Callouts", action: e => (e.chain().focus() as any).setCallout("info").run() },
  { label: "Callout (Warning)", description: "Yellow warning box", icon: AlertTriangle, keywords: ["callout", "warning", "caution"], category: "Callouts", action: e => (e.chain().focus() as any).setCallout("warning").run() },
  { label: "Callout (Success)", description: "Green success box", icon: CheckCircle, keywords: ["callout", "success", "done", "ok"], category: "Callouts", action: e => (e.chain().focus() as any).setCallout("success").run() },
  { label: "Callout (Error)", description: "Red error box", icon: XCircle, keywords: ["callout", "error", "danger"], category: "Callouts", action: e => (e.chain().focus() as any).setCallout("error").run() },
  { label: "Callout (Tip)", description: "Purple tip box", icon: Lightbulb, keywords: ["callout", "tip", "hint", "pro"], category: "Callouts", action: e => (e.chain().focus() as any).setCallout("tip").run() },

  // ── Content ───────────────────────────────────────────────────────────────
  { label: "Image", description: "Upload or paste an image", icon: Image, keywords: ["image", "picture", "img", "photo"], category: "Content", action: e => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = "image/*";
    input.onchange = () => {
      const file = input.files?.[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => (e.chain().focus() as any).setImage({ src: ev.target?.result }).run();
      reader.readAsDataURL(file);
    };
    input.click();
  }},
  { label: "YouTube", description: "Embed a YouTube video", icon: Youtube, keywords: ["youtube", "video", "embed"], category: "Content", action: e => {
    const url = window.prompt("YouTube URL:");
    if (url) {
      const videoId = url.match(/(?:youtu\.be\/|v=)([^&\s]+)/)?.[1];
      if (videoId) e.chain().focus().insertContent(`<div class="youtube-embed" style="margin:12px 0"><iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen style="width:100%;aspect-ratio:16/9;border-radius:8px"></iframe></div>`).run();
    }
  }},
  { label: "Math Block", description: "LaTeX equation (KaTeX)", icon: Calculator, keywords: ["math", "latex", "equation", "formula", "katex"], category: "Content", action: e => (e.chain().focus() as any).setMathBlock().run() },
  { label: "Table", description: "Insert a table", icon: Table, keywords: ["table", "grid"], category: "Content", action: e => (e.chain().focus() as any).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
  { label: "Bookmark", description: "Paste a URL as a card", icon: Bookmark, keywords: ["bookmark", "url", "link", "card"], category: "Content", action: e => {
    const url = window.prompt("URL:");
    if (url) e.chain().focus().insertContent(`<div data-bookmark="${url}" style="border:1px solid hsl(var(--border));border-radius:8px;padding:12px 16px;margin:8px 0;background:hsl(var(--muted));"><a href="${url}" target="_blank" style="font-size:14px;font-weight:500">${url}</a></div>`).run();
  }},

  // ── Layout ────────────────────────────────────────────────────────────────
  { label: "2 Columns", description: "Split into two columns", icon: Columns2, keywords: ["columns", "layout", "grid", "2col"], category: "Layout", action: e => {
    e.chain().focus().insertContent('<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:8px 0"><div style="border:1px dashed hsl(var(--border));border-radius:8px;padding:12px;min-height:60px"><p>Column 1</p></div><div style="border:1px dashed hsl(var(--border));border-radius:8px;padding:12px;min-height:60px"><p>Column 2</p></div></div>').run();
  }},
  { label: "3 Columns", description: "Split into three columns", icon: Columns, keywords: ["columns", "layout", "grid", "3col"], category: "Layout", action: e => {
    e.chain().focus().insertContent('<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin:8px 0"><div style="border:1px dashed hsl(var(--border));border-radius:8px;padding:12px;min-height:60px"><p>Col 1</p></div><div style="border:1px dashed hsl(var(--border));border-radius:8px;padding:12px;min-height:60px"><p>Col 2</p></div><div style="border:1px dashed hsl(var(--border));border-radius:8px;padding:12px;min-height:60px"><p>Col 3</p></div></div>').run();
  }},
];

export const SlashCommandMenu = ({ editor, allNotes = [], onCreateSubpage, currentNoteId }: Props) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [slashFrom, setSlashFrom] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  // Track query length independently so keydown handler always sees fresh state
  const queryRef = useRef("");

  const commands = makeCommands(allNotes, onCreateSubpage, currentNoteId);

  const filtered = commands.filter(c =>
    !queryRef.current ||
    c.label.toLowerCase().includes(queryRef.current.toLowerCase()) ||
    c.keywords.some(k => k.includes(queryRef.current.toLowerCase()))
  );

  const grouped = filtered.reduce((acc, cmd) => {
    if (!acc[cmd.category]) acc[cmd.category] = [];
    acc[cmd.category].push(cmd);
    return acc;
  }, {} as Record<string, SlashCommand[]>);

  const flatFiltered = Object.values(grouped).flat();

  const closeMenu = useCallback(() => {
    setOpen(false);
    setQuery("");
    queryRef.current = "";
    setSlashFrom(null);
  }, []);

  const executeCommand = useCallback((cmd: SlashCommand) => {
    // Delete the slash + query text
    if (slashFrom !== null) {
      const { from } = editor.state.selection;
      // slashFrom is where "/" was inserted; delete from there to current cursor
      const deleteFrom = slashFrom - 1; // "/" itself
      const deleteTo = from;
      if (deleteFrom >= 0 && deleteTo > deleteFrom) {
        editor.chain().focus().deleteRange({ from: deleteFrom, to: deleteTo }).run();
      }
    }
    cmd.action(editor);
    closeMenu();
  }, [editor, slashFrom, closeMenu]);

  const openMenu = useCallback(() => {
    const { from } = editor.state.selection;
    // Position menu at cursor
    try {
      const coords = editor.view.coordsAtPos(from);
      const vw = window.innerWidth;
      const menuW = 300;
      let left = coords.left;
      if (left + menuW > vw - 8) left = vw - menuW - 8;
      if (left < 8) left = 8;
      const top = coords.bottom + window.scrollY + 6;
      setPosition({ top, left });
    } catch {
      setPosition({ top: 200, left: 100 });
    }
    setSlashFrom(from); // cursor is right AFTER the slash
    setQuery("");
    queryRef.current = "";
    setSelected(0);
    setOpen(true);
  }, [editor]);

  useEffect(() => {
    if (!editor) return;

    // Watch editor transactions to detect "/"  typed anywhere
    const handleUpdate = () => {
      if (open) return;
      const { from, empty } = editor.state.selection;
      if (!empty || from < 1) return;
      // Get the character just typed
      const char = editor.state.doc.textBetween(Math.max(0, from - 1), from);
      if (char === "/") {
        openMenu();
      }
    };

    editor.on("update", handleUpdate);
    return () => { editor.off("update", handleUpdate); };
  }, [editor, open, openMenu]);

  // Keyboard navigation — intercept BEFORE the editor gets the keys
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;

      if (e.key === "ArrowDown") {
        e.preventDefault(); e.stopPropagation();
        setSelected(s => Math.min(s + 1, flatFiltered.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault(); e.stopPropagation();
        setSelected(s => Math.max(s - 1, 0));
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault(); e.stopPropagation();
        if (flatFiltered[selected]) executeCommand(flatFiltered[selected]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault(); e.stopPropagation();
        closeMenu();
        return;
      }
      if (e.key === "Backspace") {
        e.stopPropagation();
        if (queryRef.current.length === 0) {
          closeMenu();
        } else {
          const next = queryRef.current.slice(0, -1);
          queryRef.current = next;
          setQuery(next);
          setSelected(0);
        }
        return;
      }
      // Printable characters update the search query
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.stopPropagation();
        const next = queryRef.current + e.key;
        queryRef.current = next;
        setQuery(next);
        setSelected(0);
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [open, flatFiltered, selected, executeCommand, closeMenu]);

  // Click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) closeMenu();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, closeMenu]);

  // Scroll selected item into view
  useEffect(() => {
    if (!menuRef.current) return;
    const el = menuRef.current.querySelector(`[data-idx="${selected}"]`) as HTMLElement;
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selected]);

  if (!open) return null;

  let globalIdx = 0;

  return (
    <div
      ref={menuRef}
      className="fixed z-[500] bg-popover/98 backdrop-blur-xl border border-border/50 rounded-xl shadow-2xl py-1.5 w-[300px] max-h-[400px] overflow-y-auto modal-shadow animate-slide-up"
      style={{ top: position.top, left: position.left }}
    >
      {/* Search indicator */}
      {query && (
        <div className="px-3 py-1.5 text-[10px] text-muted-foreground/60 font-body border-b border-border/20 mb-1 flex items-center gap-1.5">
          <span className="text-foreground/50">Searching:</span>
          <span className="font-medium text-foreground/70 bg-primary/10 px-1.5 py-0.5 rounded font-mono">{query}</span>
        </div>
      )}

      {flatFiltered.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm text-muted-foreground/50 font-body">
          No commands match "{query}"
        </div>
      ) : (
        Object.entries(grouped).map(([category, cmds]) => (
          <div key={category}>
            <div className="px-3 pt-2 pb-0.5 text-[9px] font-body font-semibold text-muted-foreground/40 uppercase tracking-widest">
              {category}
            </div>
            {cmds.map((cmd) => {
              const idx = globalIdx++;
              const isSelected = idx === selected;
              return (
                <button
                  key={cmd.label}
                  data-idx={idx}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 text-left transition-all duration-75",
                    isSelected
                      ? "bg-primary/10 text-foreground"
                      : "hover:bg-accent/50 text-foreground/80"
                  )}
                  onMouseEnter={() => setSelected(idx)}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); executeCommand(cmd); }}
                >
                  <div className={cn(
                    "h-7 w-7 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                    isSelected ? "bg-primary/15 text-primary" : "bg-accent/40 text-muted-foreground/60"
                  )}>
                    <cmd.icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-body font-medium leading-tight">{cmd.label}</div>
                    <div className="text-[10px] text-muted-foreground/50 font-body leading-tight">{cmd.description}</div>
                  </div>
                  {cmd.shortcut && (
                    <span className="text-[9px] text-muted-foreground/30 font-mono shrink-0">{cmd.shortcut}</span>
                  )}
                </button>
              );
            })}
          </div>
        ))
      )}

      {/* Footer hint */}
      <div className="px-3 py-1.5 border-t border-border/20 mt-1 flex items-center gap-2 text-[9px] text-muted-foreground/30 font-body">
        <span>↑↓ navigate</span>
        <span>·</span>
        <span>↵ select</span>
        <span>·</span>
        <span>Esc dismiss</span>
      </div>
    </div>
  );
};
