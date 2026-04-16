/**
 * CalendarEventPopover — Google Calendar-style event detail card
 *
 * Shows when clicking any event: full details, edit, delete, source badge.
 * Positioned near the click point like Google Calendar's popover.
 */

import { format } from "date-fns";
import { motion } from "framer-motion";
import {
  X, Edit2, Trash2, Clock, MapPin, AlignLeft,
  Calendar, CheckSquare, Cake, Globe, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface PopoverEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  color: string;
  allDay?: boolean;
  description?: string;
  location?: string;
  recurrence?: string;
  source?: "local" | "google" | "holiday" | "birthday" | "task";
  googleEventId?: string;
  calendarName?: string;
}

interface CalendarEventPopoverProps {
  event: PopoverEvent;
  anchorRect?: DOMRect | null;
  onClose: () => void;
  onEdit: (event: PopoverEvent) => void;
  onDelete: (eventId: string) => void;
}

const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  google: { label: "Google Calendar", color: "#4285F4" },
  holiday: { label: "Holidays in India", color: "#0F9D58" },
  birthday: { label: "Birthdays", color: "#DB4437" },
  task: { label: "Tasks", color: "#F4B400" },
  local: { label: "My Calendar", color: "#7c3aed" },
};

export const CalendarEventPopover = ({
  event,
  anchorRect,
  onClose,
  onEdit,
  onDelete,
}: CalendarEventPopoverProps) => {
  const src = event.source || "local";
  const sourceInfo = SOURCE_LABELS[src] || SOURCE_LABELS.local;
  const isReadOnly = src === "holiday" || src === "birthday";
  const isAllDay = event.allDay;

  const formatEventTime = () => {
    if (isAllDay) {
      return format(event.start, "EEEE, MMMM d");
    }
    const sameDay = format(event.start, "yyyy-MM-dd") === format(event.end, "yyyy-MM-dd");
    if (sameDay) {
      return `${format(event.start, "EEEE, MMMM d · h:mm")} – ${format(event.end, "h:mm a")}`;
    }
    return `${format(event.start, "MMMM d, h:mm a")} – ${format(event.end, "MMMM d, h:mm a")}`;
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />
      
      {/* Popover card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -4 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="fixed z-50 w-80 bg-card rounded-2xl border border-border/60 shadow-2xl overflow-hidden"
        style={{
          top: anchorRect
            ? Math.min(anchorRect.bottom + 8, window.innerHeight - 360)
            : "50%",
          left: anchorRect
            ? Math.min(
                Math.max(anchorRect.left, 8),
                window.innerWidth - 336
              )
            : "50%",
          transform: anchorRect ? undefined : "translate(-50%, -50%)",
        }}
      >
        {/* Color stripe header */}
        <div className="px-4 pt-4 pb-3" style={{ borderTop: `4px solid ${event.color}` }}>
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-heading font-semibold leading-tight">{event.title}</h3>
            </div>
            <div className="flex items-center gap-1 shrink-0 -mr-1 -mt-1">
              {!isReadOnly && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={() => { onClose(); onEdit(event); }}
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
              )}
              {!isReadOnly && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => { onDelete(event.id); onClose(); }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground"
                onClick={onClose}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="px-4 pb-4 space-y-3">
          {/* Time */}
          <div className="flex items-start gap-3">
            <Clock className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-body">{formatEventTime()}</p>
              {event.recurrence && event.recurrence !== "none" && (
                <p className="text-xs text-muted-foreground font-body mt-0.5 capitalize">
                  Repeats {event.recurrence}
                </p>
              )}
            </div>
          </div>

          {/* Location */}
          {event.location && (
            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-sm font-body">{event.location}</p>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <div className="flex items-start gap-3">
              <AlignLeft className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-sm font-body text-muted-foreground leading-relaxed line-clamp-3">
                {event.description}
              </p>
            </div>
          )}

          {/* Calendar source */}
          <div className="flex items-center gap-3">
            {src === "birthday" ? (
              <Cake className="h-4 w-4 shrink-0" style={{ color: sourceInfo.color }} />
            ) : src === "holiday" ? (
              <Globe className="h-4 w-4 shrink-0" style={{ color: sourceInfo.color }} />
            ) : src === "task" ? (
              <CheckSquare className="h-4 w-4 shrink-0" style={{ color: sourceInfo.color }} />
            ) : (
              <div
                className="h-3.5 w-3.5 rounded-sm shrink-0"
                style={{ backgroundColor: event.color }}
              />
            )}
            <p className="text-xs font-body text-muted-foreground">{sourceInfo.label}</p>
          </div>
        </div>
      </motion.div>
    </>
  );
};
