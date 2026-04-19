/**
 * FolderDrawer — Mobile slide-in folder tree for the Library page.
 *
 * 290px wide drawer, dark backdrop, infinite nesting via FolderNode tree.
 * - Tap folder → filter library to that folder (calls onSelect).
 * - "+ New Folder" at top (admin in public, all users in private).
 * - Long-press folder → context menu (Rename / Delete).
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Folder, FolderOpen, Plus, Pencil, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { buildFolderTree, type LibraryFolder, type FolderNode } from "@/lib/resourcesFolders";

interface FolderDrawerProps {
  open: boolean;
  onClose: () => void;
  folders: LibraryFolder[];
  selectedId: string;
  onSelect: (id: string) => void;
  canEdit: boolean;
  onCreate: (parentId: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  scopeLabel: string;
}

const FolderRow = ({
  node, selectedId, onSelect, canEdit, onCreate, onRename, onDelete, expanded, toggle,
}: {
  node: FolderNode;
  selectedId: string;
  onSelect: (id: string) => void;
  canEdit: boolean;
  onCreate: (parentId: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  expanded: Set<string>;
  toggle: (id: string) => void;
}) => {
  const [menu, setMenu] = useState(false);
  const isOpen = expanded.has(node.id);
  const isSelected = node.id === selectedId;
  const hasChildren = node.children.length > 0;

  let pressTimer: ReturnType<typeof setTimeout>;
  const onPressStart = () => {
    if (!canEdit) return;
    pressTimer = setTimeout(() => setMenu(true), 500);
  };
  const onPressEnd = () => clearTimeout(pressTimer);

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1.5 h-11 px-2 rounded-lg cursor-pointer select-none",
          "transition-colors",
          isSelected ? "bg-primary/15 text-primary" : "hover:bg-accent",
        )}
        style={{ paddingLeft: 8 + node.depth * 14 }}
        onClick={() => onSelect(node.id)}
        onTouchStart={onPressStart}
        onTouchEnd={onPressEnd}
        onContextMenu={(e) => { e.preventDefault(); if (canEdit) setMenu(true); }}
      >
        {hasChildren ? (
          <button
            onClick={(e) => { e.stopPropagation(); toggle(node.id); }}
            className="h-5 w-5 grid place-items-center"
          >
            <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", isOpen && "rotate-90")} />
          </button>
        ) : (
          <span className="w-5" />
        )}
        {isOpen && hasChildren ? (
          <FolderOpen className="h-4 w-4 shrink-0" />
        ) : (
          <Folder className="h-4 w-4 shrink-0" />
        )}
        <span className="text-sm font-body truncate flex-1">{node.name}</span>
      </div>

      {menu && (
        <div className="ml-8 my-1 p-1 rounded-md bg-popover border border-border shadow-md text-xs flex gap-1">
          <button
            className="px-2 py-1 hover:bg-accent rounded inline-flex items-center gap-1"
            onClick={() => { setMenu(false); onCreate(node.id); }}
          ><Plus className="h-3 w-3" />Sub</button>
          <button
            className="px-2 py-1 hover:bg-accent rounded inline-flex items-center gap-1"
            onClick={() => {
              const n = prompt("Rename folder", node.name);
              if (n && n.trim()) onRename(node.id, n.trim());
              setMenu(false);
            }}
          ><Pencil className="h-3 w-3" />Rename</button>
          <button
            className="px-2 py-1 hover:bg-destructive/15 text-destructive rounded inline-flex items-center gap-1"
            onClick={() => {
              if (confirm(`Delete "${node.name}"? Subfolders will be orphaned.`)) onDelete(node.id);
              setMenu(false);
            }}
          ><Trash2 className="h-3 w-3" />Delete</button>
          <button
            className="px-2 py-1 hover:bg-accent rounded"
            onClick={() => setMenu(false)}
          ><X className="h-3 w-3" /></button>
        </div>
      )}

      {isOpen && hasChildren && (
        <div>
          {node.children.map((c) => (
            <FolderRow
              key={c.id}
              node={c}
              selectedId={selectedId}
              onSelect={onSelect}
              canEdit={canEdit}
              onCreate={onCreate}
              onRename={onRename}
              onDelete={onDelete}
              expanded={expanded}
              toggle={toggle}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const FolderDrawer = ({
  open, onClose, folders, selectedId, onSelect,
  canEdit, onCreate, onRename, onDelete, scopeLabel,
}: FolderDrawerProps) => {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["root"]));
  const tree = buildFolderTree(folders);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 280 }}
            className="fixed top-0 left-0 bottom-0 w-[290px] bg-card border-r border-border z-50 flex flex-col"
          >
            <div className="p-3 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-sm font-heading font-semibold">Folders</h3>
                <p className="text-[11px] text-muted-foreground font-body">{scopeLabel}</p>
              </div>
              {canEdit && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => onCreate("root")}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              <button
                className={cn(
                  "w-full flex items-center gap-1.5 h-11 px-3 rounded-lg cursor-pointer text-sm font-body",
                  "transition-colors",
                  selectedId === "root"
                    ? "bg-primary/15 text-primary"
                    : "hover:bg-accent",
                )}
                onClick={() => onSelect("root")}
              >
                <FolderOpen className="h-4 w-4" />
                All resources
              </button>
              <div className="mt-1">
                {tree.map((n) => (
                  <FolderRow
                    key={n.id}
                    node={n}
                    selectedId={selectedId}
                    onSelect={onSelect}
                    canEdit={canEdit}
                    onCreate={onCreate}
                    onRename={onRename}
                    onDelete={onDelete}
                    expanded={expanded}
                    toggle={toggle}
                  />
                ))}
              </div>
              {tree.length === 0 && (
                <div className="py-8 text-center text-xs text-muted-foreground font-body">
                  No folders yet{canEdit ? " — tap + to create one" : ""}
                </div>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};
