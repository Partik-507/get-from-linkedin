/**
 * QuickActionSheet — contextual quick-create bottom sheet triggered by FAB.
 *
 * Detects current route and shows the most relevant action tiles:
 *  - /notes      → New Page · New Canvas · New Folder · Templates
 *  - /study      → New Task · New Event · Quick Focus · New Habit
 *  - /resources  → Upload Resource · New Folder
 *  - /           → New Note · Quick Focus · New Task · Open Library
 */
import { useNavigate, useLocation } from "react-router-dom";
import { MobileSheet } from "@/components/MobileSheet";
import { motion } from "framer-motion";
import {
  StickyNote, FilePlus, FolderPlus, LayoutGrid,
  CheckSquare, CalendarPlus, Zap, Heart,
  Upload, BookOpen, Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface Tile {
  icon: LucideIcon;
  label: string;
  color: string; // tailwind gradient
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
      { icon: FilePlus,    label: "New Page",    color: "from-violet-500 to-fuchsia-500", onClick: () => dispatch("notes-create-note") },
      { icon: LayoutGrid,  label: "New Canvas",  color: "from-sky-500 to-blue-500",       onClick: () => dispatch("notes-create-canvas") },
      { icon: FolderPlus,  label: "New Folder",  color: "from-amber-500 to-orange-500",   onClick: () => dispatch("notes-create-folder") },
      { icon: BookOpen,    label: "Templates",   color: "from-emerald-500 to-teal-500",   onClick: () => dispatch("notes-open-templates") },
    ];
  } else if (path.startsWith("/study")) {
    title = "Quick Add";
    tiles = [
      { icon: CheckSquare, label: "New Task",    color: "from-emerald-500 to-teal-500",   onClick: () => dispatch("study-new-task") },
      { icon: CalendarPlus,label: "New Event",   color: "from-sky-500 to-blue-500",       onClick: () => dispatch("study-new-event") },
      { icon: Zap,         label: "Quick Focus", color: "from-violet-500 to-fuchsia-500", onClick: () => go("/focus") },
      { icon: Heart,       label: "New Habit",   color: "from-pink-500 to-rose-500",      onClick: () => dispatch("study-new-habit") },
    ];
  } else if (path.startsWith("/resources")) {
    title = "Library";
    tiles = [
      { icon: Upload,      label: "Upload",      color: "from-violet-500 to-fuchsia-500", onClick: () => dispatch("resources-upload") },
      { icon: FolderPlus,  label: "New Folder",  color: "from-amber-500 to-orange-500",   onClick: () => dispatch("resources-new-folder") },
    ];
  } else {
    tiles = [
      { icon: StickyNote,  label: "New Note",    color: "from-violet-500 to-fuchsia-500", onClick: () => go("/notes") },
      { icon: Zap,         label: "Quick Focus", color: "from-amber-500 to-orange-500",   onClick: () => go("/focus") },
      { icon: CheckSquare, label: "New Task",    color: "from-emerald-500 to-teal-500",   onClick: () => go("/study") },
      { icon: BookOpen,    label: "Library",     color: "from-sky-500 to-blue-500",       onClick: () => go("/resources") },
    ];
  }

  return (
    <MobileSheet open={open} onClose={onClose} snap="auto" title={title}>
      <div className="px-5 pt-3 pb-6 grid grid-cols-2 gap-3">
        {tiles.map((t, i) => {
          const Icon = t.icon;
          return (
            <motion.button
              key={t.label}
              whileTap={{ scale: 0.96 }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0, transition: { delay: i * 0.04 } }}
              onClick={t.onClick}
              className={cn(
                "h-28 rounded-2xl p-4 flex flex-col items-start justify-between",
                "bg-gradient-to-br text-white shadow-lg",
                t.color
              )}
            >
              <Icon className="h-6 w-6 drop-shadow" />
              <span className="font-heading font-semibold text-sm">{t.label}</span>
            </motion.button>
          );
        })}
      </div>
    </MobileSheet>
  );
};
