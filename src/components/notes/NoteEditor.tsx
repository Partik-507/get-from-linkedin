import { useState, useEffect, useCallback, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
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
import Typography from "@tiptap/extension-typography";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SlashCommandMenu } from "./SlashCommandMenu";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code, Highlighter,
  Link as LinkIcon, AlignLeft, AlignCenter, AlignRight, Pin, History,
  Download, PanelRightOpen, PanelRightClose, Maximize, Minimize,
  X, Hash, Share2, Type as TypeIcon, ChevronDown,
} from "lucide-react";

const lowlight = createLowlight(common);

// ─── Font Options ───────────────────────────────────────────────────────────

const FONTS = [
  "DM Sans", "Lora", "Merriweather", "Inter", "Playfair Display",
  "Source Serif 4", "Plus Jakarta Sans", "Nunito", "Raleway",
  "Inconsolata", "Space Mono", "Bitter", "Libre Baskerville",
  "EB Garamond", "Fira Code",
];

// ─── Types ──────────────────────────────────────────────────────────────────

interface NoteData {
  id: string;
  title: string;
  icon?: string;
  coverImage?: string;
  tags?: string[];
  isPinned?: boolean;
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
  showBacklinks?: boolean;
  focusMode?: boolean;
  onToggleFocus?: () => void;
  readOnly?: boolean;
  font?: string;
  onFontChange?: (font: string) => void;
  onIconChange?: (icon: string) => void;
  onCoverChange?: (cover: string) => void;
}

export const NoteEditor = ({
  note, content, onContentChange, onTitleChange, onAddTag, onRemoveTag,
  onTogglePin, onOpenHistory, onExportPdf, onExportMd, onToggleBacklinks,
  onShare, showBacklinks, focusMode, onToggleFocus, readOnly,
  font = "Lora", onFontChange, onIconChange, onCoverChange,
}: Props) => {
  const [tagInput, setTagInput] = useState("");
  const [title, setTitle] = useState(note.title);
  const [linkUrl, setLinkUrl] = useState("");
  const [showLinkPopover, setShowLinkPopover] = useState(false);
  const [showFontMenu, setShowFontMenu] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setTitle(note.title); }, [note.id]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        codeBlock: false,
      }),
      CodeBlockLowlight.configure({ lowlight }),
      Placeholder.configure({ placeholder: 'Start writing... Type "/" for commands' }),
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
        HTMLAttributes: {
          class: "rounded-xl shadow-md max-w-full mx-auto my-4",
        },
      }),
      TiptapTable.configure({ resizable: true }),
      TableRow, TableCell, TableHeader,
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyle,
      Color,
      Typography,
    ],
    content: content || "",
    editable: !readOnly,
    editorProps: {
      attributes: {
        class: "outline-none min-h-[200px]",
        style: `font-family: '${font}', serif; font-size: 16px; line-height: 1.8; letter-spacing: -0.01em;`,
      },
      handlePaste: (view, event) => {
        // Handle image paste
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
        return false;
      },
    },
    onUpdate: ({ editor: e }) => {
      onContentChange(e.getHTML());
    },
  }, [note.id, readOnly]);

  // Sync content when switching notes
  useEffect(() => {
    if (editor && content !== undefined) {
      const currentHtml = editor.getHTML();
      if (currentHtml !== content) {
        editor.commands.setContent(content || "");
      }
    }
  }, [note.id, content]);

  // Update font on editor
  useEffect(() => {
    if (editor) {
      editor.view.dom.style.fontFamily = `'${font}', serif`;
    }
  }, [font, editor]);

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
      editor.chain().focus().setLink({ href: linkUrl }).run();
      setLinkUrl("");
      setShowLinkPopover(false);
    }
  };

  const wordCount = (content || "").replace(/<[^>]+>/g, "").split(/\s+/).filter(Boolean).length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  if (!editor) return null;

  // Emoji picker for note icon
  const QUICK_EMOJIS = ["📝", "📚", "💡", "🎯", "🔬", "📊", "🎨", "🧪", "📐", "🌍", "💻", "🎓"];

  return (
    <div className={cn("flex-1 flex flex-col overflow-hidden", focusMode && "max-w-3xl mx-auto w-full")}>
      {/* Top toolbar */}
      <div className="flex items-center justify-between px-4 py-1.5 border-b border-border/20 bg-card/20 shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[10px] text-muted-foreground/50 font-body tabular-nums">
            {wordCount} words · {readingTime} min read
          </span>
          {readOnly && (
            <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-primary/30 text-primary">Read Only</Badge>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          {onTogglePin && (
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={onTogglePin}>
              <Pin className={cn("h-3 w-3", note.isPinned && "text-primary fill-primary")} />
            </Button>
          )}
          {onShare && (
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={onShare}>
              <Share2 className="h-3 w-3" />
            </Button>
          )}
          {onOpenHistory && (
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={onOpenHistory}>
              <History className="h-3 w-3" />
            </Button>
          )}
          {onToggleBacklinks && (
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={onToggleBacklinks}>
              {showBacklinks ? <PanelRightClose className="h-3 w-3" /> : <PanelRightOpen className="h-3 w-3" />}
            </Button>
          )}
          {onToggleFocus && (
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={onToggleFocus}>
              {focusMode ? <Minimize className="h-3 w-3" /> : <Maximize className="h-3 w-3" />}
            </Button>
          )}
          {onExportMd && (
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={onExportMd}>
              <Download className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Editor area */}
      <div className="flex-1 overflow-y-auto">
        <div className={cn("max-w-[720px] mx-auto px-8 py-6", focusMode && "px-4")}>
          {/* Cover image */}
          {note.coverImage && (
            <div className="w-full h-40 rounded-xl overflow-hidden mb-4 relative group">
              <img src={note.coverImage} alt="" className="w-full h-full object-cover" />
              {!readOnly && onCoverChange && (
                <button onClick={() => onCoverChange("")}
                  className="absolute top-2 right-2 bg-black/50 text-white rounded-lg px-2 py-1 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">
                  Remove
                </button>
              )}
            </div>
          )}

          {/* Icon + Title */}
          <div className="flex items-start gap-2 mb-1">
            {!readOnly && onIconChange && (
              <Popover>
                <PopoverTrigger asChild>
                  <button className="text-3xl hover:bg-accent/30 rounded-lg p-1 transition-colors shrink-0 mt-0.5">
                    {note.icon || "📄"}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2" align="start">
                  <div className="grid grid-cols-6 gap-1">
                    {QUICK_EMOJIS.map(e => (
                      <button key={e} onClick={() => onIconChange(e)}
                        className="text-xl p-1.5 rounded-lg hover:bg-accent/50 transition-colors">{e}</button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            )}
            <input
              ref={titleRef}
              value={title}
              onChange={e => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); editor.commands.focus(); } }}
              placeholder="Untitled"
              readOnly={readOnly}
              className="w-full text-3xl font-heading font-bold bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/30"
            />
          </div>

          {/* Tags */}
          {(note.tags?.length || !readOnly) && (
            <div className="flex flex-wrap items-center gap-1.5 mb-4">
              {note.tags?.map(tag => (
                <Badge key={tag} variant="secondary" className="text-[10px] font-body gap-1 px-2 py-0 h-5 cursor-pointer hover:bg-destructive/10"
                  onClick={() => !readOnly && onRemoveTag?.(tag)}>
                  <Hash className="h-2.5 w-2.5" />{tag}
                  {!readOnly && <X className="h-2 w-2" />}
                </Badge>
              ))}
              {!readOnly && (
                <input
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  placeholder="Add tag..."
                  className="text-[11px] font-body bg-transparent outline-none text-muted-foreground/60 placeholder:text-muted-foreground/30 w-20"
                />
              )}
            </div>
          )}

          {/* Formatting toolbar */}
          {!readOnly && (
            <div className="flex items-center gap-0.5 mb-3 flex-wrap">
              {[
                { action: () => editor.chain().focus().toggleBold().run(), active: editor.isActive("bold"), icon: Bold, label: "Bold" },
                { action: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive("italic"), icon: Italic, label: "Italic" },
                { action: () => editor.chain().focus().toggleUnderline().run(), active: editor.isActive("underline"), icon: UnderlineIcon, label: "Underline" },
                { action: () => editor.chain().focus().toggleStrike().run(), active: editor.isActive("strike"), icon: Strikethrough, label: "Strike" },
                { action: () => editor.chain().focus().toggleCode().run(), active: editor.isActive("code"), icon: Code, label: "Code" },
                { action: () => editor.chain().focus().toggleHighlight().run(), active: editor.isActive("highlight"), icon: Highlighter, label: "Highlight" },
              ].map(b => (
                <button key={b.label} onClick={b.action} title={b.label}
                  className={cn("p-1.5 rounded-md hover:bg-accent/60 transition-colors", b.active && "bg-accent text-primary")}>
                  <b.icon className="h-3.5 w-3.5" />
                </button>
              ))}
              
              <div className="w-px h-4 bg-border/30 mx-1" />
              
              {/* Alignment */}
              <button onClick={() => editor.chain().focus().setTextAlign("left").run()} title="Align left"
                className={cn("p-1.5 rounded-md hover:bg-accent/60 transition-colors", editor.isActive({ textAlign: "left" }) && "bg-accent text-primary")}>
                <AlignLeft className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => editor.chain().focus().setTextAlign("center").run()} title="Align center"
                className={cn("p-1.5 rounded-md hover:bg-accent/60 transition-colors", editor.isActive({ textAlign: "center" }) && "bg-accent text-primary")}>
                <AlignCenter className="h-3.5 w-3.5" />
              </button>
              
              <div className="w-px h-4 bg-border/30 mx-1" />
              
              {/* Link (inline popover, not prompt) */}
              <Popover open={showLinkPopover} onOpenChange={setShowLinkPopover}>
                <PopoverTrigger asChild>
                  <button title="Link"
                    className={cn("p-1.5 rounded-md hover:bg-accent/60 transition-colors", editor.isActive("link") && "bg-accent text-primary")}>
                    <LinkIcon className="h-3.5 w-3.5" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-3" align="start">
                  <div className="space-y-2">
                    <input
                      value={linkUrl}
                      onChange={e => setLinkUrl(e.target.value)}
                      placeholder="Paste a link..."
                      className="w-full text-sm font-body bg-accent/20 border border-border/30 rounded-lg px-3 py-2 outline-none focus:border-primary/40"
                      onKeyDown={e => { if (e.key === "Enter") handleSetLink(); }}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSetLink} className="text-xs font-body flex-1">
                        Confirm
                      </Button>
                      {editor.isActive("link") && (
                        <Button size="sm" variant="outline" onClick={() => { editor.chain().focus().unsetLink().run(); setShowLinkPopover(false); }}
                          className="text-xs font-body text-destructive">
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              
              <div className="w-px h-4 bg-border/30 mx-1" />
              
              {/* Font selector */}
              <Popover open={showFontMenu} onOpenChange={setShowFontMenu}>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-accent/60 transition-colors text-[11px] font-body text-muted-foreground">
                    <TypeIcon className="h-3 w-3" />
                    <span className="hidden sm:inline">{font}</span>
                    <ChevronDown className="h-2.5 w-2.5" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-1 max-h-64 overflow-y-auto" align="start">
                  {FONTS.map(f => (
                    <button key={f} onClick={() => { onFontChange?.(f); setShowFontMenu(false); }}
                      className={cn("w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                        font === f ? "bg-primary/10 text-primary" : "hover:bg-accent/40"
                      )}
                      style={{ fontFamily: `'${f}', serif` }}>
                      {f}
                    </button>
                  ))}
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* Bubble Menu (appears on text selection) */}
          {editor && !readOnly && (
            <BubbleMenu editor={editor} tippyOptions={{ duration: 150 }}
              className="flex items-center gap-0.5 bg-popover/98 backdrop-blur-xl border border-border/50 rounded-lg shadow-xl px-1 py-0.5">
              <button onClick={() => editor.chain().focus().toggleBold().run()}
                className={cn("p-1.5 rounded hover:bg-accent/60", editor.isActive("bold") && "bg-accent text-primary")}>
                <Bold className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => editor.chain().focus().toggleItalic().run()}
                className={cn("p-1.5 rounded hover:bg-accent/60", editor.isActive("italic") && "bg-accent text-primary")}>
                <Italic className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => editor.chain().focus().toggleUnderline().run()}
                className={cn("p-1.5 rounded hover:bg-accent/60", editor.isActive("underline") && "bg-accent text-primary")}>
                <UnderlineIcon className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => editor.chain().focus().toggleCode().run()}
                className={cn("p-1.5 rounded hover:bg-accent/60", editor.isActive("code") && "bg-accent text-primary")}>
                <Code className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => editor.chain().focus().toggleHighlight().run()}
                className={cn("p-1.5 rounded hover:bg-accent/60", editor.isActive("highlight") && "bg-accent text-primary")}>
                <Highlighter className="h-3.5 w-3.5" />
              </button>
            </BubbleMenu>
          )}

          {/* TipTap Editor */}
          <div className="tiptap-editor relative prose-notes">
            <EditorContent editor={editor} />
            {!readOnly && <SlashCommandMenu editor={editor} />}
          </div>
        </div>
      </div>
    </div>
  );
};
