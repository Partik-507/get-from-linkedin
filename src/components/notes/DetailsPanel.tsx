import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { X, Hash, Link2, FileText, Clock, Calendar, BarChart2 } from "lucide-react";
import type { NoteMetadata } from "@/lib/notesFirestore";

interface Props {
  note: NoteMetadata;
  content: string;
  allNotes: NoteMetadata[];
  onClose: () => void;
  onSelectNote: (id: string) => void;
}

export const DetailsPanel = ({ note, content, allNotes, onClose, onSelectNote }: Props) => {
  const wordCount = useMemo(() =>
    (content || "").replace(/<[^>]+>/g, "").split(/\s+/).filter(Boolean).length,
    [content]);
  const charCount = useMemo(() =>
    (content || "").replace(/<[^>]+>/g, "").length,
    [content]);
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  const createdAt = note.createdAt?.toDate?.() as Date | undefined;
  const updatedAt = note.updatedAt?.toDate?.() as Date | undefined;

  const fmt = (d?: Date) =>
    d ? d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) + " " +
      d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";

  // Backlinks: notes that link to this note
  const backlinks = useMemo(() =>
    allNotes.filter(n => n.id !== note.id && n.linkedNoteIds?.includes(note.id)),
    [allNotes, note.id]);

  return (
    <div className="w-[260px] shrink-0 border-l border-[#E5E7EB] bg-white flex flex-col overflow-hidden dark:bg-sidebar-background sidebar-transition">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E7EB]">
        <span className="text-xs font-body font-semibold text-[#6B7280] uppercase tracking-wider">Page Details</span>
        <button onClick={onClose} className="h-5 w-5 flex items-center justify-center rounded hover:bg-[#F5F3FF] text-[#9CA3AF] hover:text-[#6D28D9] transition-colors">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-5 scrollbar-none">
        {/* Stats */}
        <div>
          <p className="text-[10px] font-body font-semibold text-[#9CA3AF] uppercase tracking-widest mb-2 flex items-center gap-1">
            <BarChart2 className="h-3 w-3" /> Statistics
          </p>
          <div className="space-y-1.5">
            {[
              { label: "Words", value: wordCount.toLocaleString() },
              { label: "Characters", value: charCount.toLocaleString() },
              { label: "Reading time", value: `${readingTime} min` },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between">
                <span className="text-xs text-[#6B7280] font-body">{item.label}</span>
                <span className="text-xs font-body font-medium text-[#111827] tabular-nums">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Dates */}
        <div>
          <p className="text-[10px] font-body font-semibold text-[#9CA3AF] uppercase tracking-widest mb-2 flex items-center gap-1">
            <Calendar className="h-3 w-3" /> Dates
          </p>
          <div className="space-y-1.5">
            <div>
              <p className="text-[10px] text-[#9CA3AF] font-body">Created</p>
              <p className="text-xs font-body text-[#111827]">{fmt(createdAt)}</p>
            </div>
            <div>
              <p className="text-[10px] text-[#9CA3AF] font-body">Last modified</p>
              <p className="text-xs font-body text-[#111827]">{fmt(updatedAt)}</p>
            </div>
          </div>
        </div>

        {/* Tags */}
        {(note.tags?.length ?? 0) > 0 && (
          <div>
            <p className="text-[10px] font-body font-semibold text-[#9CA3AF] uppercase tracking-widest mb-2 flex items-center gap-1">
              <Hash className="h-3 w-3" /> Tags
            </p>
            <div className="flex flex-wrap gap-1.5">
              {note.tags?.map(tag => (
                <span key={tag}
                  className="px-2 py-0.5 rounded-full text-[10px] font-body bg-[#EDE9FE] text-[#6D28D9] flex items-center gap-0.5">
                  <Hash className="h-2.5 w-2.5" />{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Backlinks */}
        <div>
          <p className="text-[10px] font-body font-semibold text-[#9CA3AF] uppercase tracking-widest mb-2 flex items-center gap-1">
            <Link2 className="h-3 w-3" /> Backlinks <span className="ml-auto text-[#9CA3AF] normal-case tracking-normal">{backlinks.length}</span>
          </p>
          {backlinks.length === 0 ? (
            <p className="text-[11px] text-[#9CA3AF] font-body italic">No pages link here yet</p>
          ) : (
            <div className="space-y-1">
              {backlinks.map(n => (
                <button key={n.id}
                  onClick={() => onSelectNote(n.id)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[#F5F3FF] text-left transition-colors group">
                  <FileText className="h-3 w-3 text-[#9CA3AF] shrink-0" />
                  <span className="text-xs font-body text-[#111827] truncate flex-1">{n.title || "Untitled"}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Page ID */}
        <div>
          <p className="text-[10px] font-body font-semibold text-[#9CA3AF] uppercase tracking-widest mb-1">Page ID</p>
          <p className="text-[10px] font-mono text-[#9CA3AF] break-all select-all">{note.id}</p>
        </div>
      </div>
    </div>
  );
};
