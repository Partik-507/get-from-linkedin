import { useState, useEffect, useCallback, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import TiptapImage from "@tiptap/extension-image";
import { Table as TiptapTable } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Color from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import { FontFamily } from "@tiptap/extension-font-family";
import Typography from "@tiptap/extension-typography";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SlashCommandMenu } from "./SlashCommandMenu";
import { MobileEditorAccessoryBar } from "./MobileEditorAccessoryBar";
import { CalloutExtension } from "./extensions/CalloutExtension";
import { ToggleExtension } from "./extensions/ToggleExtension";
import { MathBlockExtension, MathInlineExtension } from "./extensions/MathExtension";
import { PageLinkExtension } from "./extensions/PageLinkExtension";
import { toast } from "sonner";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code, Highlighter,
  Link as LinkIcon, AlignLeft, AlignCenter, AlignRight, Pin, History,
  Download, PanelRightOpen, PanelRightClose, Maximize, Minimize,
  X, Hash, Share2, Type as TypeIcon, ChevronDown, Check, ExternalLink, Copy,
  Palette, MoreHorizontal, FileText, Globe,
} from "lucide-react";

const lowlight = createLowlight(common);

// ─── Fonts ───────────────────────────────────────────────────────────────────
const FONTS = [
  "DM Sans", "Lora", "Merriweather", "Inter", "Playfair Display",
  "Source Serif 4", "Plus Jakarta Sans", "Nunito", "Raleway",
  "Inconsolata", "Space Mono", "Bitter", "Libre Baskerville",
  "EB Garamond", "Fira Code",
];

const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32];

const COVER_GRADIENTS = [
  "linear-gradient(135deg,#6D28D9,#2563EB)",
  "linear-gradient(135deg,#059669,#0891B2)",
  "linear-gradient(135deg,#DC2626,#D97706)",
  "linear-gradient(135deg,#7C3AED,#EC4899)",
  "linear-gradient(135deg,#0EA5E9,#6366F1)",
  "linear-gradient(135deg,#F59E0B,#EF4444)",
  "linear-gradient(135deg,#10B981,#3B82F6)",
  "linear-gradient(135deg,#8B5CF6,#F472B6)",
  "linear-gradient(135deg,#1E3A5F,#0F766E)",
  "linear-gradient(135deg,#374151,#6B7280)",
  "linear-gradient(135deg,#92400E,#B45309)",
  "linear-gradient(135deg,#BE185D,#7C3AED)",
];

const QUICK_EMOJIS = ["📝", "📚", "💡", "🎯", "🔬", "📊", "🎨", "🧪", "📐", "🌍", "💻", "🎓", "⚡", "🔥", "🌟", "🏆", "📌", "🗒️", "✏️", "📖", "🔑", "💎"];

const HIGHLIGHT_COLORS = [
  { label: "Yellow", value: "#FEF08A" },
  { label: "Green", value: "#BBF7D0" },
  { label: "Blue", value: "#BFDBFE" },
  { label: "Pink", value: "#FBCFE8" },
  { label: "Purple", value: "#DDD6FE" },
];

// ─── Load Google Font dynamically ────────────────────────────────────────────
function loadGoogleFont(fontName: string) {
  const id = `gf-${fontName.replace(/\s+/g, "-")}`;
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap`;
  document.head.appendChild(link);
}

// ─── Smart paste: HTML → TipTap nodes ────────────────────────────────────────
function parseHtmlToContent(html: string): any[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const nodes: any[] = [];

  function parseInline(el: Node): any[] {
    const items: any[] = [];
    el.childNodes.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent || "";
        if (text) items.push({ type: "text", text });
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const tag = (child as Element).tagName.toLowerCase();
        const inner = parseInline(child);
        const marks: any[] = [];
        if (["strong", "b"].includes(tag)) marks.push({ type: "bold" });
        if (["em", "i"].includes(tag)) marks.push({ type: "italic" });
        if (tag === "u") marks.push({ type: "underline" });
        if (["s", "strike", "del"].includes(tag)) marks.push({ type: "strike" });
        if (tag === "code") marks.push({ type: "code" });
        if (tag === "a") marks.push({ type: "link", attrs: { href: (child as HTMLAnchorElement).href } });
        if (marks.length > 0) {
          inner.forEach((n) => {
            if (n.type === "text") n.marks = [...(n.marks || []), ...marks];
          });
        }
        items.push(...inner);
      }
    });
    return items;
  }

  function parseEl(el: Element): any | null {
    const tag = el.tagName.toLowerCase();
    if (["h1", "h2", "h3", "h4", "h5", "h6"].includes(tag)) {
      return { type: "heading", attrs: { level: parseInt(tag[1]) }, content: parseInline(el) };
    }
    if (tag === "p" || tag === "div") {
      const content = parseInline(el);
      return content.length > 0 ? { type: "paragraph", content } : null;
    }
    if (tag === "ul") {
      return { type: "bulletList", content: [...el.children].map(li => ({ type: "listItem", content: [{ type: "paragraph", content: parseInline(li) }] })) };
    }
    if (tag === "ol") {
      return { type: "orderedList", content: [...el.children].map(li => ({ type: "listItem", content: [{ type: "paragraph", content: parseInline(li) }] })) };
    }
    if (tag === "blockquote") {
      return { type: "blockquote", content: [{ type: "paragraph", content: parseInline(el) }] };
    }
    if (tag === "pre") {
      const code = el.querySelector("code");
      const lang = code?.className.match(/language-(\w+)/)?.[1] || "";
      return { type: "codeBlock", attrs: { language: lang }, content: [{ type: "text", text: (code || el).textContent || "" }] };
    }
    if (tag === "hr") return { type: "horizontalRule" };
    if (tag === "img") return { type: "image", attrs: { src: (el as HTMLImageElement).src, alt: (el as HTMLImageElement).alt } };
    if (tag === "table") {
      const rows = [...el.querySelectorAll("tr")].map((row, ri) => ({
        type: "tableRow",
        content: [...row.querySelectorAll("th,td")].map((cell) => ({
          type: ri === 0 ? "tableHeader" : "tableCell",
          content: [{ type: "paragraph", content: parseInline(cell) }],
        })),
      }));
      return { type: "table", content: rows };
    }
    return null;
  }

  doc.body.childNodes.forEach((child) => {
    if (child.nodeType === Node.ELEMENT_NODE) {
      const node = parseEl(child as Element);
      if (node) nodes.push(node);
    }
  });

  return nodes.length > 0 ? nodes : [{ type: "paragraph", content: [{ type: "text", text: doc.body.textContent || "" }] }];
}

function parseMarkdownToContent(text: string): any[] {
  const paragraphs = text.split(/\n{2,}/);
  const nodes: any[] = [];

  for (const para of paragraphs) {
    const lines = para.trim().split("\n");
    if (!lines.length || !lines[0]) continue;

    if (lines[0].startsWith("# ")) nodes.push({ type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: lines[0].slice(2) }] });
    else if (lines[0].startsWith("## ")) nodes.push({ type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: lines[0].slice(3) }] });
    else if (lines[0].startsWith("### ")) nodes.push({ type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: lines[0].slice(4) }] });
    else if (lines.every(l => l.match(/^[-*] /))) {
      nodes.push({ type: "bulletList", content: lines.map(l => ({ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: l.slice(2) }] }] })) });
    } else if (lines.every(l => l.match(/^\d+\. /))) {
      nodes.push({ type: "orderedList", content: lines.map(l => ({ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: l.replace(/^\d+\. /, "") }] }] })) });
    } else if (lines[0].startsWith("> ")) {
      nodes.push({ type: "blockquote", content: [{ type: "paragraph", content: [{ type: "text", text: lines.map(l => l.slice(2)).join("\n") }] }] });
    } else if (para.startsWith("```")) {
      const lang = lines[0].slice(3).trim();
      const code = lines.slice(1, -1).join("\n");
      nodes.push({ type: "codeBlock", attrs: { language: lang }, content: [{ type: "text", text: code }] });
    } else {
      nodes.push({ type: "paragraph", content: [{ type: "text", text: lines.join("\n") }] });
    }
  }

  return nodes.length > 0 ? nodes : [{ type: "paragraph" }];
}

// ─── Types ───────────────────────────────────────────────────────────────────
interface NoteData {
  id: string;
  title: string;
  icon?: string;
  coverImage?: string;
  tags?: string[];
  isPinned?: boolean;
  createdAt?: any;
  updatedAt?: any;
  wordCount?: number;
}

interface Props {
  note: NoteData;
  content: string;
  onContentChange: (html: string) => void;
  onTitleChange: (title: string) => void;
  onAddTag?: (tag: string) => void;
  onRemoveTag?: (tag: string) => void;
  onTogglePin?: () => void;
  onOpenHistory?: () => void;
  onExportPdf?: () => void;
  onExportMd?: () => void;
  onToggleBacklinks?: () => void;
  onShare?: () => void;
  onNavigateToNote?: (noteId: string) => void;
  showBacklinks?: boolean;
  focusMode?: boolean;
  onToggleFocus?: () => void;
  readOnly?: boolean;
  font?: string;
  onFontChange?: (font: string) => void;
  onIconChange?: (icon: string) => void;
  onCoverChange?: (cover: string) => void;
  allNotes?: { id: string; title: string }[];
  savedIndicator?: boolean;
  isFullWidth?: boolean;
  onToggleFullWidth?: () => void;
  onCreateSubpage?: (parentId?: string) => Promise<{ id: string; title: string } | null>;
}

// ─── Component ───────────────────────────────────────────────────────────────
export const NoteEditor = ({
  note, content, onContentChange, onTitleChange, onAddTag, onRemoveTag,
  onTogglePin, onOpenHistory, onExportPdf, onExportMd, onToggleBacklinks,
  onShare, onNavigateToNote, showBacklinks, focusMode, onToggleFocus, readOnly,
  font = "Lora", onFontChange, onIconChange, onCoverChange,
  allNotes = [], savedIndicator, isFullWidth = false, onToggleFullWidth, onCreateSubpage,
}: Props) => {
  const [tagInput, setTagInput] = useState("");
  const [title, setTitle] = useState(note.title);
  const [linkUrl, setLinkUrl] = useState("");
  const [showLinkPopover, setShowLinkPopover] = useState(false);
  const [showFontMenu, setShowFontMenu] = useState(false);
  const [showSizeMenu, setShowSizeMenu] = useState(false);
  const [fontSize, setFontSize] = useState(16);
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [urlPastePopover, setUrlPastePopover] = useState<{ url: string; x: number; y: number } | null>(null);
  const [urlPasteTimer, setUrlPasteTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const editorAreaRef = useRef<HTMLDivElement>(null);
  const dragCounter = useRef(0);

  useEffect(() => { setTitle(note.title); }, [note.id]);

  // Load font on mount and change
  useEffect(() => { loadGoogleFont(font); }, [font]);

  // Listen for page-link navigation
  useEffect(() => {
    const handler = (e: Event) => {
      const pageId = (e as CustomEvent).detail;
      onNavigateToNote?.(pageId);
    };
    window.addEventListener("notes-navigate-page", handler);
    return () => window.removeEventListener("notes-navigate-page", handler);
  }, [onNavigateToNote]);


  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        codeBlock: false,
      }),
      CodeBlockLowlight.configure({ lowlight, defaultLanguage: "plaintext" }),
      Placeholder.configure({ placeholder: 'Write something, or type "/" for commands...' }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-primary underline underline-offset-2 cursor-pointer hover:text-primary/80 transition-colors" },
      }),
      TiptapImage.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: { class: "rounded-xl shadow-md max-w-full mx-auto my-4" },
      }),
      TiptapTable.configure({ resizable: true }),
      TableRow, TableCell, TableHeader,
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyle,
      Color,
      FontFamily,
      Typography,
      CalloutExtension,
      ToggleExtension,
      MathBlockExtension,
      MathInlineExtension,
      PageLinkExtension.configure({
        onNavigate: (pageId) => onNavigateToNote?.(pageId),
      }),
    ],
    content: content || "",
    editable: !readOnly,
    editorProps: {
      attributes: {
        class: "outline-none min-h-[200px]",
      },
      handlePaste: (view, event) => {
        // 1. Image file paste
        const items = event.clipboardData?.items;
        if (items) {
          for (const item of items) {
            if (item.type.startsWith("image/")) {
              event.preventDefault();
              const file = item.getAsFile();
              if (!file) return false;
              const reader = new FileReader();
              reader.onload = (ev) => {
                const url = ev.target?.result as string;
                editor?.chain().focus().setImage({ src: url }).run();
              };
              reader.readAsDataURL(file);
              return true;
            }
          }
        }

        // 2. HTML paste
        const htmlData = event.clipboardData?.getData("text/html") || "";
        if (htmlData && /<[a-z][\s\S]*>/i.test(htmlData)) {
          event.preventDefault();
          const nodes = parseHtmlToContent(htmlData);
          const count = nodes.length;
          editor?.chain().focus().insertContent(nodes).run();
          toast.success(`✅ Pasted and formatted ${count} block${count !== 1 ? "s" : ""}`);
          return true;
        }

        // 3. Plain text with markdown hints
        const plainText = event.clipboardData?.getData("text/plain") || "";
        if (plainText) {
          // URL paste
          const urlRegex = /^https?:\/\/\S+$/;
          if (urlRegex.test(plainText.trim())) {
            event.preventDefault();
            const coords = view.coordsAtPos(view.state.selection.from);
            setUrlPastePopover({ url: plainText.trim(), x: coords.left, y: coords.bottom + 8 });
            // Auto-dismiss after 3s → plain link  
            const timer = setTimeout(() => {
              editor?.chain().focus().setLink({ href: plainText.trim() }).insertContent(plainText.trim()).run();
              setUrlPastePopover(null);
            }, 3000);
            setUrlPasteTimer(timer);
            return true;
          }

          // Markdown text
          if (plainText.includes("\n") || plainText.startsWith("#") || plainText.startsWith("- ") || plainText.startsWith("> ")) {
            event.preventDefault();
            const nodes = parseMarkdownToContent(plainText);
            const count = nodes.length;
            editor?.chain().focus().insertContent(nodes).run();
            if (count > 1) toast.success(`✅ Pasted and formatted ${count} blocks`);
            return true;
          }
        }

        return false;
      },
    },
    onUpdate: ({ editor: e }) => {
      onContentChange(e.getHTML());
    },
  }, [note.id, readOnly]);

  // ─── Drag-and-Drop ingestion ────────────────────────────────────────────────
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setDragOver(false);
    if (readOnly || !editor) return;

    const { files, items } = e.dataTransfer;

    // 1. Files
    if (files && files.length > 0) {
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop()?.toLowerCase() || "";

        // Image
        if (file.type.startsWith("image/")) {
          const reader = new FileReader();
          reader.onload = (ev) => {
            const src = ev.target?.result as string;
            editor.chain().focus().insertContent(`<img src="${src}" alt="${file.name}" />`).run();
          };
          reader.readAsDataURL(file);
          continue;
        }

        // Code file
        const codeLangs: Record<string, string> = {
          js: "javascript", ts: "typescript", tsx: "typescript",
          jsx: "javascript", py: "python", json: "json",
          html: "html", css: "css", md: "markdown", sh: "bash",
        };
        if (codeLangs[ext]) {
          const text = await file.text();
          editor.chain().focus().insertContent(
            `<pre><code class="language-${codeLangs[ext]}">${text.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</code></pre>`
          ).run();
          continue;
        }

        // Markdown / plain text
        if (["md", "txt"].includes(ext) || file.type === "text/plain") {
          const text = await file.text();
          // Basic markdown → paragraph conversion
          const html = text
            .split("\n\n")
            .map(p => p.trim() ? `<p>${p.replace(/\n/g, "<br/>")}</p>` : "")
            .join("");
          editor.chain().focus().insertContent(html).run();
          continue;
        }

        // Fallback: file attachment card
        const sizeStr = file.size > 1024 * 1024
          ? `${(file.size / 1024 / 1024).toFixed(1)} MB`
          : `${Math.round(file.size / 1024)} KB`;
        editor.chain().focus().insertContent(
          `<div style="display:inline-flex;align-items:center;gap:8px;border:1px solid #E5E7EB;border-radius:8px;padding:8px 14px;background:#F9FAFB;font-size:13px;">📎 <strong>${file.name}</strong> <span style="color:#9CA3AF;font-size:11px;">(${sizeStr})</span></div>`
        ).run();
      }
      return;
    }

    // 2. URL from address bar drag
    const urlItem = Array.from(items).find(it => it.kind === "string" && it.type === "text/uri-list");
    const textItem = Array.from(items).find(it => it.kind === "string" && it.type === "text/plain");
    if (urlItem) {
      urlItem.getAsString(url => {
        if (!url.trim()) return;
        editor.chain().focus().insertContent(
          `<p><a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a></p>`
        ).run();
      });
      return;
    }
    if (textItem) {
      textItem.getAsString(text => {
        if (!text.trim()) return;
        const isUrl = /^https?:\/\//i.test(text.trim());
        if (isUrl) {
          editor.chain().focus().insertContent(
            `<p><a href="${text.trim()}" target="_blank" rel="noopener noreferrer">${text.trim()}</a></p>`
          ).run();
        } else {
          editor.chain().focus().insertContent(`<p>${text}</p>`).run();
        }
      });
    }
  }, [editor, readOnly]);

  // Sync content when switching notes
  useEffect(() => {
    if (editor && content !== undefined) {
      const currentHtml = editor.getHTML();
      if (currentHtml !== content) {
        editor.commands.setContent(content || "");
      }
    }
  }, [note.id]);

  // Apply font via CSS custom property — reliable, doesn't disrupt selection
  useEffect(() => {
    if (font) loadGoogleFont(font);
  }, [font]);

  const handleTitleBlur = () => {
    if (title !== note.title) onTitleChange(title);
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && tagInput.trim()) {
      onAddTag?.(tagInput.trim());
      setTagInput("");
    }
  };

  const handleSetLink = () => {
    if (linkUrl && editor) {
      if (editor.state.selection.empty) {
        editor.chain().focus().insertContent(`<a href="${linkUrl}">${linkUrl}</a>`).run();
      } else {
        editor.chain().focus().setLink({ href: linkUrl }).run();
      }
      setLinkUrl("");
      setShowLinkPopover(false);
    }
  };

  const handleFontChange = (f: string) => {
    loadGoogleFont(f);
    onFontChange?.(f);
    setShowFontMenu(false);
  };

  const handleFontSizeChange = (size: number) => {
    setFontSize(size);
    setShowSizeMenu(false);
    // Apply via CSS var — reliable global change
  };

  const wordCount = (content || "").replace(/<[^>]+>/g, "").split(/\s+/).filter(Boolean).length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));
  const createdDate = note.createdAt?.toDate?.() ? note.createdAt.toDate().toLocaleDateString() : "";
  const updatedDate = note.updatedAt?.toDate?.() ? note.updatedAt.toDate().toLocaleDateString() : "";

  if (!editor) return null;

  return (
    <div
      className={cn("flex-1 flex flex-col overflow-hidden bg-background", focusMode && "max-w-3xl mx-auto w-full")}
      style={{
        // Apply font & size globally via CSS inheritance — no text-selection disruption
        "--editor-font": `'${font}', 'Lora', Georgia, serif`,
        "--editor-size": `${fontSize}px`,
      } as React.CSSProperties}
    >
      {/* ── Top toolbar (DESKTOP ONLY — mobile uses keyboard accessory bar) ─ */}
      {!readOnly && (
        <div className="hidden md:flex items-center justify-between px-4 py-1.5 border-b border-border/20 bg-card/30 shrink-0 gap-2 flex-wrap">
          {/* Left: formatting */}
          <div className="flex items-center gap-0.5 flex-wrap">
            {/* Font picker */}
            <Popover open={showFontMenu} onOpenChange={setShowFontMenu}>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-accent/60 transition-colors text-[11px] font-body text-muted-foreground max-w-[90px]">
                  <TypeIcon className="h-3 w-3 shrink-0" />
                  <span className="truncate">{font}</span>
                  <ChevronDown className="h-2.5 w-2.5 shrink-0" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-52 p-1 max-h-60 overflow-y-auto" align="start">
                {FONTS.map(f => (
                  <button key={f} onClick={() => handleFontChange(f)}
                    className={cn("w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors",
                      font === f ? "bg-primary/10 text-primary" : "hover:bg-accent/40")}
                    style={{ fontFamily: `'${f}', serif` }}>
                    {f}
                  </button>
                ))}
              </PopoverContent>
            </Popover>

            {/* Font size */}
            <Popover open={showSizeMenu} onOpenChange={setShowSizeMenu}>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-0.5 px-1.5 py-1 rounded-md hover:bg-accent/60 transition-colors text-[11px] font-body text-muted-foreground tabular-nums">
                  {fontSize}
                  <ChevronDown className="h-2 w-2" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-20 p-1" align="start">
                {FONT_SIZES.map(s => (
                  <button key={s} onClick={() => handleFontSizeChange(s)}
                    className={cn("w-full text-left px-2 py-1 rounded text-xs", fontSize === s ? "bg-primary/10 text-primary" : "hover:bg-accent/40")}>
                    {s}
                  </button>
                ))}
              </PopoverContent>
            </Popover>

            <div className="w-px h-4 bg-border/30 mx-1" />

            {/* Text formatting */}
            {[
              { action: () => editor.chain().focus().toggleBold().run(), active: editor.isActive("bold"), icon: Bold, label: "Bold" },
              { action: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive("italic"), icon: Italic, label: "Italic" },
              { action: () => editor.chain().focus().toggleUnderline().run(), active: editor.isActive("underline"), icon: UnderlineIcon, label: "Underline" },
              { action: () => editor.chain().focus().toggleStrike().run(), active: editor.isActive("strike"), icon: Strikethrough, label: "Strike" },
              { action: () => editor.chain().focus().toggleCode().run(), active: editor.isActive("code"), icon: Code, label: "Code" },
            ].map(b => (
              <button key={b.label} onClick={b.action} title={b.label}
                className={cn("p-1.5 rounded-md hover:bg-accent/60 transition-colors", b.active && "bg-accent text-primary")}>
                <b.icon className="h-3.5 w-3.5" />
              </button>
            ))}

            {/* Highlight color */}
            <Popover open={showHighlightPicker} onOpenChange={setShowHighlightPicker}>
              <PopoverTrigger asChild>
                <button title="Highlight"
                  className={cn("p-1.5 rounded-md hover:bg-accent/60 transition-colors", editor.isActive("highlight") && "bg-accent text-primary")}>
                  <Highlighter className="h-3.5 w-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2" align="start">
                <div className="flex gap-1.5">
                  {HIGHLIGHT_COLORS.map(c => (
                    <button key={c.value} onClick={() => { editor.chain().focus().setHighlight({ color: c.value }).run(); setShowHighlightPicker(false); }}
                      title={c.label}
                      className="w-6 h-6 rounded-full border-2 border-white shadow hover:scale-110 transition-transform"
                      style={{ background: c.value }} />
                  ))}
                  <button onClick={() => { editor.chain().focus().unsetHighlight().run(); setShowHighlightPicker(false); }}
                    className="w-6 h-6 rounded-full border-2 border-border flex items-center justify-center hover:bg-accent/40">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </PopoverContent>
            </Popover>

            <div className="w-px h-4 bg-border/30 mx-1" />

            {/* Alignment */}
            <button onClick={() => editor.chain().focus().setTextAlign("left").run()} title="Left"
              className={cn("p-1.5 rounded-md hover:bg-accent/60 transition-colors", editor.isActive({ textAlign: "left" }) && "bg-accent text-primary")}>
              <AlignLeft className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => editor.chain().focus().setTextAlign("center").run()} title="Center"
              className={cn("p-1.5 rounded-md hover:bg-accent/60 transition-colors", editor.isActive({ textAlign: "center" }) && "bg-accent text-primary")}>
              <AlignCenter className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => editor.chain().focus().setTextAlign("right").run()} title="Right"
              className={cn("p-1.5 rounded-md hover:bg-accent/60 transition-colors", editor.isActive({ textAlign: "right" }) && "bg-accent text-primary")}>
              <AlignRight className="h-3.5 w-3.5" />
            </button>

            <div className="w-px h-4 bg-border/30 mx-1" />

            {/* Link */}
            <Popover open={showLinkPopover} onOpenChange={setShowLinkPopover}>
              <PopoverTrigger asChild>
                <button title="Link"
                  className={cn("p-1.5 rounded-md hover:bg-accent/60 transition-colors", editor.isActive("link") && "bg-accent text-primary")}>
                  <LinkIcon className="h-3.5 w-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-3" align="start">
                <div className="space-y-2">
                  <p className="text-xs font-body text-muted-foreground">Paste or type a URL</p>
                  <input value={linkUrl} onChange={e => setLinkUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full text-sm font-body bg-accent/20 border border-border/30 rounded-lg px-3 py-2 outline-none focus:border-primary/40"
                    onKeyDown={e => { if (e.key === "Enter") handleSetLink(); }}
                    autoFocus />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSetLink} className="text-xs font-body flex-1">Confirm</Button>
                    {editor.isActive("link") && (
                      <><Button size="sm" variant="outline" onClick={() => { editor.chain().focus().unsetLink().run(); setShowLinkPopover(false); }}
                        className="text-xs font-body">Unlink</Button>
                        <Button size="sm" variant="ghost" className="text-xs font-body px-2"
                          onClick={() => window.open(editor.getAttributes("link").href, "_blank")}>
                          <ExternalLink className="h-3 w-3" />
                        </Button></>
                    )}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Right: meta actions */}
          <div className="flex items-center gap-0.5">
            <span className="text-[10px] text-muted-foreground/40 font-body tabular-nums mr-1 hidden sm:block">
              {wordCount}w · {readingTime}m
            </span>
            {savedIndicator && (
              <span className="text-[10px] text-success flex items-center gap-0.5 font-body mr-1">
                <Check className="h-3 w-3" /> Saved
              </span>
            )}
            {readOnly && <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-primary/30 text-primary mr-1">Read Only</Badge>}
            {onToggleFullWidth && (
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={onToggleFullWidth} title={isFullWidth ? "Default width" : "Full width"}>
                {isFullWidth ? <PanelRightClose className="h-3 w-3" /> : <PanelRightOpen className="h-3 w-3" />}
              </Button>
            )}
            {onTogglePin && (
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={onTogglePin} title="Pin">
                <Pin className={cn("h-3 w-3", note.isPinned && "text-primary fill-primary")} />
              </Button>
            )}
            {onShare && (
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={onShare} title="Share">
                <Share2 className="h-3 w-3" />
              </Button>
            )}
            {onOpenHistory && (
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={onOpenHistory} title="Version History">
                <History className="h-3 w-3" />
              </Button>
            )}
            {onToggleBacklinks && (
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={onToggleBacklinks} title="Details">
                {showBacklinks ? <PanelRightClose className="h-3 w-3" /> : <PanelRightOpen className="h-3 w-3" />}
              </Button>
            )}
            {onToggleFocus && (
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={onToggleFocus} title="Focus mode">
                {focusMode ? <Minimize className="h-3 w-3" /> : <Maximize className="h-3 w-3" />}
              </Button>
            )}

            {/* Export menu */}
            <Popover open={showMoreMenu} onOpenChange={setShowMoreMenu}>
              <PopoverTrigger asChild>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" title="More">
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-44 p-1" align="end">
                <button onClick={() => { onExportMd?.(); setShowMoreMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-body hover:bg-accent/40 rounded-md">
                  <Download className="h-3 w-3" /> Export Markdown
                </button>
                <button onClick={() => {
                  if (!note) return;
                  const content2 = editor.getHTML();
                  const blob = new Blob([`<html><body>${content2}</body></html>`], { type: "text/html" });
                  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${note.title}.html`; a.click();
                  setShowMoreMenu(false);
                }} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-body hover:bg-accent/40 rounded-md">
                  <Globe className="h-3 w-3" /> Export HTML
                </button>
                <button onClick={() => { window.print(); setShowMoreMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-body hover:bg-accent/40 rounded-md">
                  <FileText className="h-3 w-3" /> Export PDF (Print)
                </button>
                {onExportPdf && (
                  <button onClick={() => { onExportPdf(); setShowMoreMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-body hover:bg-accent/40 rounded-md">
                    <Download className="h-3 w-3" /> Export jsPDF
                  </button>
                )}
              </PopoverContent>
            </Popover>
          </div>
        </div>
      )}

      {/* ── Editor content area ──────────────────────────────────────────── */}
      <div
        className="flex-1 overflow-y-auto relative"
        ref={editorAreaRef}
        style={{ fontFamily: "var(--editor-font)", fontSize: "var(--editor-size)" }}
        onDragEnter={e => { if (!readOnly) { e.preventDefault(); dragCounter.current++; setDragOver(true); } }}
        onDragLeave={() => { dragCounter.current--; if (dragCounter.current <= 0) { dragCounter.current = 0; setDragOver(false); } }}
        onDragOver={e => { e.preventDefault(); }}
        onDrop={handleDrop}
      >
        {/* Drop overlay */}
        {dragOver && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-primary/10 border-2 border-dashed border-primary rounded-lg pointer-events-none">
            <div className="bg-card/90 backdrop-blur rounded-2xl px-6 py-4 text-center shadow-xl">
              <div className="text-3xl mb-2">📥</div>
              <p className="font-body font-semibold text-sm text-foreground">Drop to insert</p>
              <p className="font-body text-xs text-muted-foreground mt-0.5">Images, code, text, URLs</p>
            </div>
          </div>
        )}
        <div className={cn(
          "mx-auto px-8 pt-[60px] pb-[120px]",
          focusMode ? "px-4 max-w-[860px]" : isFullWidth ? "max-w-full px-12" : "max-w-[720px]"
        )}>

          {/* Cover image */}
          {note.coverImage ? (
            <div className="w-full h-[200px] rounded-xl overflow-hidden mb-6 relative group -mx-8 max-w-[calc(100%+4rem)] w-[calc(100%+4rem)]">
              <div className="w-full h-full" style={{ background: note.coverImage }} />
              {!readOnly && onCoverChange && (
                <button onClick={() => onCoverChange("")}
                  className="absolute top-3 right-3 bg-black/50 text-white rounded-lg px-3 py-1 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity font-body">
                  Remove Cover
                </button>
              )}
            </div>
          ) : !readOnly && onCoverChange ? (
            <div className="group relative mb-2">
              <button onClick={() => setShowCoverPicker(true)}
                className="opacity-0 group-hover:opacity-100 text-[10px] text-muted-foreground/40 hover:text-muted-foreground font-body transition-opacity px-1 py-0.5">
                + Add cover
              </button>
            </div>
          ) : null}

          {/* Cover picker */}
          {showCoverPicker && (
            <div className="mb-4 p-3 bg-card border border-border/30 rounded-xl shadow-lg">
              <p className="text-[10px] font-body text-muted-foreground/60 mb-2">Choose a gradient</p>
              <div className="grid grid-cols-6 gap-2 mb-3">
                {COVER_GRADIENTS.map((g, i) => (
                  <button key={i} onClick={() => { onCoverChange?.(g); setShowCoverPicker(false); }}
                    className="h-8 rounded-lg hover:scale-105 transition-transform border-2 border-transparent hover:border-primary/40"
                    style={{ background: g }} />
                ))}
              </div>
              <div className="flex gap-2">
                <input type="file" accept="image/*" id="cover-upload" className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]; if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => { onCoverChange?.(ev.target?.result as string); setShowCoverPicker(false); };
                    reader.readAsDataURL(file);
                  }} />
                <Button size="sm" variant="outline" className="text-xs font-body"
                  onClick={() => document.getElementById("cover-upload")?.click()}>
                  Upload Image
                </Button>
                <Button size="sm" variant="ghost" className="text-xs font-body" onClick={() => setShowCoverPicker(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Icon + Title */}
          <div className="flex items-start gap-2 mb-1">
            {!readOnly && onIconChange ? (
              <Popover>
                <PopoverTrigger asChild>
                  <button className="text-4xl hover:bg-accent/30 rounded-lg p-1 transition-colors shrink-0 mt-0.5 leading-none">
                    {note.icon || "📄"}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2" align="start">
                  <div className="grid grid-cols-8 gap-1">
                    {QUICK_EMOJIS.map(e => (
                      <button key={e} onClick={() => onIconChange(e)}
                        className="text-xl p-1.5 rounded-lg hover:bg-accent/50 transition-colors">
                        {e}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            ) : (
              <span className="text-4xl leading-none mt-0.5 shrink-0">{note.icon || "📄"}</span>
            )}
            <input
              ref={titleRef}
              value={title}
              onChange={e => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={e => { if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); editor.commands.focus(); } }}
              placeholder="Untitled"
              readOnly={readOnly}
              className="w-full text-[32px] font-heading font-bold bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/30 leading-tight"
            />
          </div>

          {/* Meta line */}
          {(createdDate || updatedDate) && (
            <p className="text-[11px] font-body text-muted-foreground/40 mb-3 ml-1">
              {createdDate && `Created ${createdDate}`}
              {createdDate && updatedDate && " · "}
              {updatedDate && `Updated ${updatedDate}`}
            </p>
          )}

          {/* Tags */}
          {(note.tags?.length || !readOnly) && (
            <div className="flex flex-wrap items-center gap-1.5 mb-5">
              {note.tags?.map(tag => (
                <Badge key={tag} variant="secondary"
                  className="text-[10px] font-body gap-1 px-2 py-0 h-5 cursor-pointer hover:bg-destructive/10 rounded-full"
                  onClick={() => !readOnly && onRemoveTag?.(tag)}>
                  <Hash className="h-2.5 w-2.5" />{tag}
                  {!readOnly && <X className="h-2 w-2" />}
                </Badge>
              ))}
              {!readOnly && (
                <input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={handleTagKeyDown}
                  placeholder="Add tag..."
                  className="text-[11px] font-body bg-transparent outline-none text-muted-foreground/60 placeholder:text-muted-foreground/30 w-20" />
              )}
            </div>
          )}

          {/* ── Bubble Menu ────────────────────────────────────────────── */}
          <BubbleMenu editor={editor}
            shouldShow={({ state }) => !state.selection.empty}>
            <div className="flex items-center gap-0.5 bg-popover/98 border border-border/40 rounded-lg shadow-xl p-1 backdrop-blur-xl">
              {[
                { action: () => editor.chain().focus().toggleBold().run(), active: editor.isActive("bold"), icon: Bold },
                { action: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive("italic"), icon: Italic },
                { action: () => editor.chain().focus().toggleUnderline().run(), active: editor.isActive("underline"), icon: UnderlineIcon },
                { action: () => editor.chain().focus().toggleStrike().run(), active: editor.isActive("strike"), icon: Strikethrough },
                { action: () => editor.chain().focus().toggleCode().run(), active: editor.isActive("code"), icon: Code },
              ].map((b, i) => (
                <button key={i} onClick={b.action}
                  className={cn("p-1.5 rounded hover:bg-accent/60 transition-colors", b.active && "bg-accent text-primary")}>
                  <b.icon className="h-3.5 w-3.5" />
                </button>
              ))}
              <div className="w-px h-4 bg-border/30 mx-0.5" />
              {HIGHLIGHT_COLORS.slice(0, 3).map(c => (
                <button key={c.value} onClick={() => editor.chain().focus().setHighlight({ color: c.value }).run()}
                  className="w-4 h-4 rounded-full hover:scale-110 transition-transform border border-white/40"
                  title={c.label} style={{ background: c.value }} />
              ))}
              <div className="w-px h-4 bg-border/30 mx-0.5" />
              <button onClick={() => setShowLinkPopover(true)}
                className={cn("p-1.5 rounded hover:bg-accent/60 transition-colors", editor.isActive("link") && "text-primary")}>
                <LinkIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          </BubbleMenu>

          {/* ── TipTap Editor ──────────────────────────────────────────── */}
          <div className="tiptap-editor relative prose-notes" style={{ fontFamily: `'${font}', serif`, fontSize: `${fontSize}px`, lineHeight: "1.8" }}>
            <EditorContent editor={editor} />
            {!readOnly && (
              <SlashCommandMenu
                editor={editor}
                allNotes={allNotes}
                onCreateSubpage={onCreateSubpage}
                currentNoteId={note.id}
              />
            )}
          </div>
        </div>
      </div>

      {/* ── URL Paste Popover ──────────────────────────────────────────── */}
      {urlPastePopover && (
        <div
          className="fixed z-50 bg-popover border border-border/40 rounded-xl shadow-xl p-3 w-72 font-body"
          style={{ top: urlPastePopover.y, left: Math.min(urlPastePopover.x, window.innerWidth - 300) }}>
          <p className="text-xs text-muted-foreground mb-2 truncate">{urlPastePopover.url}</p>
          <div className="flex gap-2">
            <button onClick={() => {
              if (urlPasteTimer) clearTimeout(urlPasteTimer);
              editor.chain().focus().setLink({ href: urlPastePopover.url }).insertContent(urlPastePopover.url).run();
              setUrlPastePopover(null);
            }} className="flex-1 text-xs py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
              Keep as link
            </button>
            <button onClick={() => {
              if (urlPasteTimer) clearTimeout(urlPasteTimer);
              // Simple bookmark card insertion
              editor.chain().focus().insertContent(`<div data-bookmark="${urlPastePopover.url}" style="border:1px solid #E5E7EB;border-radius:8px;padding:12px 16px;margin:8px 0;display:flex;gap:12px;align-items:center;background:#F9FAFB;"><div style="flex:1;min-width:0;"><p style="margin:0;font-weight:500;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"><a href="${urlPastePopover.url}" target="_blank">${urlPastePopover.url}</a></p></div></div>`).run();
              setUrlPastePopover(null);
            }} className="flex-1 text-xs py-1.5 rounded-lg bg-accent text-foreground hover:bg-accent/80 transition-colors">
              Bookmark
            </button>
            <button onClick={() => {
              if (urlPasteTimer) clearTimeout(urlPasteTimer);
              setUrlPastePopover(null);
            }} className="text-xs py-1.5 px-2 rounded-lg hover:bg-accent/40 transition-colors text-muted-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground/40 mt-1.5">Auto-selecting "Keep as link" in 3s...</p>
        </div>
      )}

      {/* Mobile keyboard accessory bar — floats above the keyboard */}
      {!readOnly && <MobileEditorAccessoryBar editor={editor} />}
    </div>
  );
};
