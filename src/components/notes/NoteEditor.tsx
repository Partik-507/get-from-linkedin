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
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SlashCommandMenu } from "./SlashCommandMenu";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code, Highlighter,
  Link as LinkIcon, AlignLeft, AlignCenter, AlignRight, Pin, History,
  Download, ChevronRight, PanelRightOpen, PanelRightClose, Maximize,
  Minimize, X, Hash, Plus, ImageIcon, Save,
} from "lucide-react";
import type { NoteMetadata } from "@/lib/notesFirestore";
import { countWords, estimateReadingTime } from "@/lib/notesFirestore";

interface Props {
  note: NoteMetadata;
  content: string;
  onContentChange: (html: string) => void;
  onTitleChange: (title: string) => void;
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  onTogglePin: () => void;
  onOpenHistory: () => void;
  onExportPdf: () => void;
  onExportMd: () => void;
  onToggleBacklinks: () => void;
  showBacklinks: boolean;
  allNotes: NoteMetadata[];
  focusMode: boolean;
  onToggleFocus: () => void;
}

export const NoteEditor = ({
  note, content, onContentChange, onTitleChange, onAddTag, onRemoveTag,
  onTogglePin, onOpenHistory, onExportPdf, onExportMd, onToggleBacklinks,
  showBacklinks, allNotes, focusMode, onToggleFocus,
}: Props) => {
  const [tagInput, setTagInput] = useState("");
  const [title, setTitle] = useState(note.title);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setTitle(note.title); }, [note.id]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4] } }),
      Placeholder.configure({ placeholder: 'Start writing... Type "/" for commands' }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "text-primary underline cursor-pointer" } }),
      TiptapImage.configure({ inline: false, allowBase64: true }),
      TiptapTable.configure({ resizable: true }),
      TableRow, TableCell, TableHeader,
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyle,
      Color,
      Typography,
    ],
    content: content || "",
    editable: true,
    onUpdate: ({ editor: e }) => {
      onContentChange(e.getHTML());
    },
  }, [note.id]);

  // Sync content when switching notes
  useEffect(() => {
    if (editor && content !== undefined) {
      const currentHtml = editor.getHTML();
      if (currentHtml !== content) {
        editor.commands.setContent(content || "");
      }
    }
  }, [note.id, content]);

  const handleTitleBlur = () => {
    if (title !== note.title) onTitleChange(title);
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && tagInput.trim()) {
      onAddTag(tagInput.trim());
      setTagInput("");
    }
  };

  const wordCount = countWords(content || "");
  const readingTime = estimateReadingTime(wordCount);

  if (!editor) return null;

  return (
    <div className={cn("flex-1 flex flex-col overflow-hidden", focusMode && "max-w-3xl mx-auto w-full")}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-1.5 border-b border-border/20 bg-card/20 shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="flex items-center text-[10px] text-muted-foreground/50 font-body gap-1">
            <span>{wordCount} words</span>
            <span>·</span>
            <span>{readingTime}</span>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={onTogglePin} title={note.isPinned ? "Unpin" : "Pin"}>
            <Pin className={cn("h-3 w-3", note.isPinned && "text-primary fill-primary")} />
          </Button>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={onOpenHistory} title="Version history">
            <History className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={onToggleBacklinks} title="Backlinks">
            {showBacklinks ? <PanelRightClose className="h-3 w-3" /> : <PanelRightOpen className="h-3 w-3" />}
          </Button>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={onToggleFocus} title="Focus mode">
            {focusMode ? <Minimize className="h-3 w-3" /> : <Maximize className="h-3 w-3" />}
          </Button>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={onExportMd} title="Export Markdown">
            <Download className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Editor area */}
      <div className="flex-1 overflow-y-auto">
        <div className={cn("max-w-3xl mx-auto px-8 py-6", focusMode && "px-4")}>
          {/* Title */}
          <input
            ref={titleRef}
            value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); editor.commands.focus(); } }}
            placeholder="Untitled"
            className="w-full text-3xl font-heading font-bold bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/30 mb-1"
          />

          {/* Tags */}
          <div className="flex flex-wrap items-center gap-1.5 mb-4">
            {note.tags?.map(tag => (
              <Badge key={tag} variant="secondary" className="text-[10px] font-body gap-1 px-2 py-0 h-5 cursor-pointer hover:bg-destructive/10" onClick={() => onRemoveTag(tag)}>
                <Hash className="h-2.5 w-2.5" />{tag}
                <X className="h-2 w-2" />
              </Badge>
            ))}
            <input
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder="Add tag..."
              className="text-[11px] font-body bg-transparent outline-none text-muted-foreground/60 placeholder:text-muted-foreground/30 w-20"
            />
          </div>

          {/* Inline formatting toolbar */}
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
            <button onClick={() => editor.chain().focus().setTextAlign("left").run()} title="Align left"
              className={cn("p-1.5 rounded-md hover:bg-accent/60 transition-colors", editor.isActive({ textAlign: "left" }) && "bg-accent text-primary")}>
              <AlignLeft className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => editor.chain().focus().setTextAlign("center").run()} title="Align center"
              className={cn("p-1.5 rounded-md hover:bg-accent/60 transition-colors", editor.isActive({ textAlign: "center" }) && "bg-accent text-primary")}>
              <AlignCenter className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => {
              const url = window.prompt("Link URL:");
              if (url) editor.chain().focus().setLink({ href: url }).run();
            }} title="Link"
              className={cn("p-1.5 rounded-md hover:bg-accent/60 transition-colors", editor.isActive("link") && "bg-accent text-primary")}>
              <LinkIcon className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => {
              const url = window.prompt("Image URL:");
              if (url) (editor.chain().focus() as any).setImage({ src: url }).run();
            }} title="Image"
              className="p-1.5 rounded-md hover:bg-accent/60 transition-colors">
              <ImageIcon className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* TipTap Editor */}
          <div className="tiptap-editor relative prose-notes">
            <EditorContent editor={editor} />
            <SlashCommandMenu editor={editor} />
          </div>
        </div>
      </div>
    </div>
  );
};
