/**
 * MobileEditorAccessoryBar — Floats above the keyboard on mobile.
 *
 * Listens to `window.visualViewport.resize` to detect keyboard open/close
 * (heuristic: viewport height shrinks by >150px). When open, sticks to the
 * top of the keyboard via `bottom: keyboardHeight`. When closed, hides.
 *
 * Provides the most-used formatting tools horizontally scrollable.
 * Extra actions live behind the 3-dot menu in MobileNoteHeader.
 */
import { useEffect, useState } from "react";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code,
  Highlighter, Link as LinkIcon, List, ListOrdered, CheckSquare,
  Heading1, Heading2, Quote, Undo2, Redo2, Hash, AtSign,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Editor } from "@tiptap/react";

interface Props {
  editor: Editor | null;
  onAddTag?: () => void;
  onAddPageLink?: () => void;
}

export const MobileEditorAccessoryBar = ({ editor, onAddTag, onAddPageLink }: Props) => {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;
    const vv = window.visualViewport;
    const compute = () => {
      const h = window.innerHeight - vv.height - vv.offsetTop;
      // Guard rail: only treat as "open" if shrunk by >100px
      setKeyboardHeight(h > 100 ? h : 0);
    };
    compute();
    vv.addEventListener("resize", compute);
    vv.addEventListener("scroll", compute);
    return () => {
      vv.removeEventListener("resize", compute);
      vv.removeEventListener("scroll", compute);
    };
  }, []);

  if (!editor || keyboardHeight === 0) return null;

  const tools = [
    { icon: Undo2,        run: () => editor.chain().focus().undo().run(),                   active: false, label: "Undo" },
    { icon: Redo2,        run: () => editor.chain().focus().redo().run(),                   active: false, label: "Redo" },
    { icon: AtSign,       run: () => onAddPageLink?.(),                                     active: false, label: "Link page" },
    { icon: Hash,         run: () => onAddTag?.(),                                          active: false, label: "Tag" },
    { icon: Heading1,     run: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), active: editor.isActive("heading", { level: 1 }), label: "H1" },
    { icon: Heading2,     run: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: editor.isActive("heading", { level: 2 }), label: "H2" },
    { icon: Bold,         run: () => editor.chain().focus().toggleBold().run(),             active: editor.isActive("bold"), label: "Bold" },
    { icon: Italic,       run: () => editor.chain().focus().toggleItalic().run(),           active: editor.isActive("italic"), label: "Italic" },
    { icon: UnderlineIcon,run: () => editor.chain().focus().toggleUnderline().run(),        active: editor.isActive("underline"), label: "Underline" },
    { icon: Strikethrough,run: () => editor.chain().focus().toggleStrike().run(),           active: editor.isActive("strike"), label: "Strike" },
    { icon: Highlighter,  run: () => editor.chain().focus().toggleHighlight({ color: "#FEF08A" }).run(), active: editor.isActive("highlight"), label: "Highlight" },
    { icon: Code,         run: () => editor.chain().focus().toggleCode().run(),             active: editor.isActive("code"), label: "Code" },
    { icon: LinkIcon,     run: () => {
        const url = window.prompt("URL");
        if (url) editor.chain().focus().setLink({ href: url }).run();
      },                                                                                    active: editor.isActive("link"), label: "Link" },
    { icon: List,         run: () => editor.chain().focus().toggleBulletList().run(),       active: editor.isActive("bulletList"), label: "Bullets" },
    { icon: ListOrdered,  run: () => editor.chain().focus().toggleOrderedList().run(),      active: editor.isActive("orderedList"), label: "Numbered" },
    { icon: CheckSquare,  run: () => editor.chain().focus().toggleTaskList().run(),         active: editor.isActive("taskList"), label: "Todo" },
    { icon: Quote,        run: () => editor.chain().focus().toggleBlockquote().run(),       active: editor.isActive("blockquote"), label: "Quote" },
  ];

  return (
    <div
      className="fixed left-0 right-0 z-[120] md:hidden"
      style={{ bottom: `${keyboardHeight}px` }}
    >
      <div className="bg-card/95 backdrop-blur-2xl border-t border-border/60 supports-[backdrop-filter]:bg-card/80">
        <div className="overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-0.5 px-2 py-1.5 min-w-max">
            {tools.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.label}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()} /* keep editor focused */
                  onClick={t.run}
                  aria-label={t.label}
                  title={t.label}
                  className={cn(
                    "h-9 w-9 grid place-items-center rounded-lg shrink-0 active:bg-muted/80",
                    t.active ? "bg-primary/15 text-primary" : "text-foreground/80",
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" strokeWidth={t.active ? 2.4 : 1.8} />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
