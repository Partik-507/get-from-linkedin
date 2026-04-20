/**
 * QuickActionSheet — Premium contextual quick-create bottom sheet.
 *
 * Single brand-purple→indigo gradient on every tile (no rainbow).
 * Secondary tiles use a subtle glass / muted surface for hierarchy.
 * Detects the current route to surface the most relevant action set.
 */
import { useNavigate, useLocation } from "react-router-dom";
import { MobileSheet } from "@/components/MobileSheet";
import { motion } from "framer-motion";
import {
  StickyNote, FilePlus, FolderPlus, LayoutGrid,
  CheckSquare, CalendarPlus, Zap, Heart,
  Upload, BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type Variant = "primary" | "secondary";

interface Tile {
  icon: LucideIcon;
  label: string;
  variant?: Variant;
  onClick: () => void;
}

interface QuickActionSheetProps {
  open: boolean;
  onClose: () => void;
}

export const QuickActionSheet = ({ open, onClose }: QuickActionSheetProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;

  const dispatch = (eventName: string) => {
    window.dispatchEvent(new CustomEvent(eventName));
    onClose();
  };
  const go = (to: string) => { navigate(to); onClose(); };

  let tiles: Tile[] = [];
  let title = "Quick Add";

  if (path.startsWith("/notes")) {
    title = "Create";
    tiles = [
      { icon: FilePlus,    label: "New Page",   variant: "primary",   onClick: () => dispatch("notes-create-note") },
      { icon: LayoutGrid,  label: "New Canvas", variant: "secondary", onClick: () => dispatch("notes-create-canvas") },
      { icon: FolderPlus,  label: "New Folder", variant: "secondary", onClick: () => dispatch("notes-create-folder") },
      { icon: BookOpen,    label: "Templates",  variant: "secondary", onClick: () => dispatch("notes-open-templates") },
    ];
  } else if (path.startsWith("/study")) {
    title = "Quick Add";
    tiles = [
      { icon: CheckSquare, label: "New Task",    variant: "primary",   onClick: () => dispatch("study-new-task") },
      { icon: CalendarPlus,label: "New Event",   variant: "primary",   onClick: () => dispatch("study-new-event") },
      { icon: Zap,         label: "Quick Focus", variant: "secondary", onClick: () => go("/focus") },
      { icon: Heart,       label: "New Habit",   variant: "secondary", onClick: () => dispatch("study-new-habit") },
    ];
  } else if (path.startsWith("/resources")) {
    title = "Library";
    tiles = [
      { icon: Upload,      label: "Upload",     variant: "primary",   onClick: () => dispatch("resources-upload") },
      { icon: FolderPlus,  label: "New Folder", variant: "secondary", onClick: () => dispatch("resources-new-folder") },
    ];
  } else {
    tiles = [
      { icon: StickyNote,  label: "New Note",    variant: "primary",   onClick: () => go("/notes") },
      { icon: Zap,         label: "Quick Focus", variant: "primary",   onClick: () => go("/focus") },
      { icon: CheckSquare, label: "New Task",    variant: "secondary", onClick: () => go("/study") },
      { icon: Heart,       label: "New Habit",   variant: "secondary", onClick: () => go("/study") },
    ];
  }

  return (
    <MobileSheet open={open} onClose={onClose} snap="auto" title={title}>
      <div className="px-5 pt-3 pb-7 grid grid-cols-2 gap-3">
        {tiles.map((t, i) => {
          const Icon = t.icon;
          const primary = t.variant !== "secondary";
          return (
            <motion.button
              key={t.label}
              whileTap={{ scale: 0.97 }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0, transition: { delay: i * 0.04 } }}
              onClick={t.onClick}
              className={cn(
                "h-24 rounded-2xl p-4 flex flex-col items-start justify-between text-left",
                "transition-[filter,background-color] duration-150 active:brightness-95",
                primary
                  ? "bg-gradient-to-br from-primary to-[hsl(240_70%_50%)] text-primary-foreground shadow-[0_6px_20px_-6px_hsl(var(--primary)/0.5)]"
                  : "bg-muted/60 text-foreground border border-border/60 hover:bg-muted/80",
              )}
            >
              <Icon className={cn("h-5 w-5", primary ? "drop-shadow" : "text-primary")} />
              <span className="font-heading font-semibold text-[13px] leading-tight">{t.label}</span>
            </motion.button>
          );
        })}
      </div>
    </MobileSheet>
  );
};
