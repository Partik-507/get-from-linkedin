/**
 * CalendarCreateModal — Google Calendar-style full event creation form
 *
 * Features:
 * - Title, all-day toggle, start/end date+time pickers
 * - Repeat dropdown (none/daily/weekly/monthly/yearly)
 * - Location, description
 * - Color picker (8 colors)
 * - Calendar selector (My Calendar / Google Calendar)
 * - Guest / notification fields (UI only — extensible)
 */

import { useState, useEffect } from "react";
import { format, addHours, setHours, setMinutes } from "date-fns";
import {
  X, MapPin, AlignLeft, Clock, ChevronDown,
  Calendar, Repeat, Users, Bell, Palette,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileSheet } from "@/components/MobileSheet";
import { TimeWheelPicker } from "@/components/TimeWheelPicker";

const EVENT_COLORS = [
  { hex: "#7c3aed", name: "Grape" },
  { hex: "#3b82f6", name: "Blueberry" },
  { hex: "#10b981", name: "Sage" },
  { hex: "#f59e0b", name: "Banana" },
  { hex: "#ef4444", name: "Tomato" },
  { hex: "#ec4899", name: "Flamingo" },
  { hex: "#06b6d4", name: "Peacock" },
  { hex: "#f97316", name: "Tangerine" },
];

export interface CreateEventData {
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  color: string;
  description: string;
  location: string;
  recurrence: string;
}

interface CalendarCreateModalProps {
  open: boolean;
  initialDate?: Date;
  initialHour?: number;
  onClose: () => void;
  onSave: (data: CreateEventData) => Promise<void>;
  gcalConnected?: boolean;
}

const timeOptions = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? "00" : "30";
  const ampm = h < 12 ? "AM" : "PM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return { value: `${String(h).padStart(2, "0")}:${m}`, label: `${h12}:${m} ${ampm}` };
});

function toTimeValue(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${d.getMinutes() < 30 ? "00" : "30"}`;
}

function applyTime(base: Date, timeValue: string): Date {
  const [h, m] = timeValue.split(":").map(Number);
  const d = new Date(base);
  d.setHours(h, m, 0, 0);
  return d;
}

import { createPortal } from "react-dom";

export const CalendarCreateModal = ({
  open,
  initialDate,
  initialHour,
  onClose,
  onSave,
  gcalConnected,
}: CalendarCreateModalProps) => {
  const [title, setTitle] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const d = initialDate ? new Date(initialDate) : new Date();
    if (initialHour !== undefined) {
      d.setHours(initialHour, 0, 0, 0);
    }
    return d;
  });
  const [endDate, setEndDate] = useState(() => {
    const d = initialDate ? new Date(initialDate) : new Date();
    const h = initialHour !== undefined ? initialHour + 1 : new Date().getHours() + 1;
    d.setHours(Math.min(h, 23), 0, 0, 0);
    return d;
  });
  const [startTime, setStartTime] = useState(() =>
    toTimeValue(initialDate || setHours(new Date(), initialHour ?? new Date().getHours()))
  );
  const [endTime, setEndTime] = useState(() => {
    const h = (initialHour ?? new Date().getHours()) + 1;
    return `${String(Math.min(h, 23)).padStart(2, "0")}:00`;
  });
  const [recurrence, setRecurrence] = useState("none");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(EVENT_COLORS[0].hex);
  const [calendarTarget, setCalendarTarget] = useState<"local" | "google">(
    gcalConnected ? "google" : "local"
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle("");
      setAllDay(false);
      setRecurrence("none");
      setLocation("");
      setDescription("");
      setColor(EVENT_COLORS[0].hex);
      setSaving(false);
      setCalendarTarget(gcalConnected ? "google" : "local");

      const base = initialDate ? new Date(initialDate) : new Date();
      const h = initialHour ?? new Date().getHours();
      const s = new Date(base);
      s.setHours(h, 0, 0, 0);
      const e = new Date(base);
      e.setHours(Math.min(h + 1, 23), 0, 0, 0);
      setStartDate(s);
      setEndDate(e);
      setStartTime(toTimeValue(s));
      setEndTime(toTimeValue(e));
    }
  }, [open, initialDate, initialHour, gcalConnected]);

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const finalStart = allDay ? startDate : applyTime(startDate, startTime);
      const finalEnd = allDay ? endDate : applyTime(endDate, endTime);
      await onSave({
        title: title.trim(),
        start: finalStart,
        end: finalEnd < finalStart ? addHours(finalStart, 1) : finalEnd,
        allDay,
        color,
        description,
        location,
        recurrence,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative z-10 w-full max-w-lg bg-card rounded-2xl border border-border shadow-2xl overflow-hidden glass-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ height: 4, backgroundColor: color }} />
        
        <div className="flex items-center justify-between px-6 pt-5 pb-2">
          <h2 className="text-xl font-heading font-bold text-foreground">Create Event</h2>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="px-6 pb-6 space-y-5 max-h-[85vh] overflow-y-auto custom-scrollbar">
          <Input
            autoFocus
            placeholder="Event title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && title.trim()) handleSave();
              if (e.key === "Escape") onClose();
            }}
            className="text-lg font-body border-0 border-b border-border/60 rounded-none px-0 focus-visible:ring-0 placeholder:text-muted-foreground/30 font-medium bg-transparent"
          />

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer group">
              <Checkbox checked={allDay} onCheckedChange={(c) => setAllDay(!!c)} />
              <span className="text-sm font-body text-muted-foreground group-hover:text-foreground transition-colors font-medium">All day</span>
            </label>
            
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Select value={calendarTarget} onValueChange={(v) => setCalendarTarget(v as any)}>
                <SelectTrigger className="h-7 text-xs font-body border-none bg-muted/40 px-3 rounded-full min-w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[1001]">
                  <SelectItem value="local">My Calendar</SelectItem>
                  {gcalConnected && <SelectItem value="google">Google Calendar</SelectItem>}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3 bg-muted/30 p-4 rounded-2xl border border-border/10">
            <div className="flex items-center gap-4">
              <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 flex items-center gap-2 flex-wrap">
                <input
                  type="date"
                  value={format(startDate, "yyyy-MM-dd")}
                  onChange={(e) => {
                    const [y, m, d] = e.target.value.split("-").map(Number);
                    const nd = new Date(startDate);
                    nd.setFullYear(y, m - 1, d);
                    setStartDate(nd);
                  }}
                  className="text-sm font-body bg-transparent border-0 focus:outline-none cursor-pointer text-foreground hover:text-primary transition-colors font-medium"
                />
                {!allDay && (
                  <Select value={startTime} onValueChange={setStartTime}>
                    <SelectTrigger className="w-[105px] h-7 text-xs font-body bg-background/50 border-border/60 rounded-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[1001] max-h-64">
                      {timeOptions.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
                <span className="text-muted-foreground text-xs font-body">to</span>
                {!allDay && (
                  <Select value={endTime} onValueChange={setEndTime}>
                    <SelectTrigger className="w-[105px] h-7 text-xs font-body bg-background/50 border-border/60 rounded-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[1001] max-h-64">
                      {timeOptions.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
                <input
                  type="date"
                  value={format(endDate, "yyyy-MM-dd")}
                  onChange={(e) => {
                    const [y, m, d] = e.target.value.split("-").map(Number);
                    const nd = new Date(endDate);
                    nd.setFullYear(y, m - 1, d);
                    setEndDate(nd);
                  }}
                  className="text-sm font-body bg-transparent border-0 focus:outline-none cursor-pointer text-foreground hover:text-primary transition-colors font-medium"
                />
              </div>
            </div>

            <div className="flex items-center gap-4 pl-8">
              <Repeat className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <Select value={recurrence} onValueChange={setRecurrence}>
                <SelectTrigger className="h-7 text-xs font-body bg-transparent border-none p-0 w-auto hover:text-primary transition-colors font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[1001]">
                  <SelectItem value="none">Does not repeat</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
              <Input
                placeholder="Add location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="h-10 text-sm font-body border-border/60 bg-muted/10 focus:bg-background/80 transition-all rounded-xl"
              />
            </div>

            <div className="flex items-start gap-4">
              <AlignLeft className="h-4 w-4 text-muted-foreground shrink-0 mt-3" />
              <Textarea
                placeholder="Add description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="text-sm font-body border-border/60 bg-muted/10 focus:bg-background/80 transition-all min-h-[100px] rounded-xl"
              />
            </div>
          </div>

          <div className="flex items-center gap-4 pt-2">
            <Palette className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex items-center gap-2">
              {EVENT_COLORS.map((c) => (
                <button
                  key={c.hex}
                  className={cn(
                    "h-6 w-6 rounded-full transition-all hover:scale-125 border-2",
                    color === c.hex ? "border-foreground ring-2 ring-foreground/20 scale-125" : "border-transparent"
                  )}
                  style={{ backgroundColor: c.hex }}
                  onClick={() => setColor(c.hex)}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 py-5 flex gap-3 justify-end bg-muted/30 border-t border-border/10">
          <Button variant="ghost" className="font-body hover:bg-muted/50 rounded-xl px-5" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            className="font-body gap-2 px-8 rounded-xl shadow-lg shadow-primary/25 bg-primary hover:bg-primary/90"
            disabled={!title.trim() || saving}
            onClick={handleSave}
          >
            {saving ? "Saving..." : "Save Event"}
          </Button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
};
