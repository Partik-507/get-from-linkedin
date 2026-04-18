/**
 * CalendarView — Full Google Calendar-quality calendar implementation
 * Sidebar removed (merged into StudyMode sidebar via exported MiniCalendar + CalendarList)
 */

import {
  useState, useEffect, useCallback, useMemo, useRef,
  forwardRef, useImperativeHandle,
} from "react";
import { AnimatePresence } from "framer-motion";
import {
  format, startOfWeek, endOfWeek, addDays, addWeeks, subWeeks,
  startOfMonth, endOfMonth, addMonths, subMonths,
  isSameDay, isSameMonth, isToday,
  differenceInMinutes, startOfDay, addHours, getHours, getMinutes,
  eachDayOfInterval, subDays,
} from "date-fns";
import {
  ChevronLeft, ChevronRight, Plus, CheckSquare,
  Globe, Cake, Calendar as CalendarIcon, EyeOff, Wifi,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { GoogleCalendarBanner } from "@/components/GoogleCalendarBanner";
import { CalendarEventPopover, type PopoverEvent } from "@/components/CalendarEventPopover";
import { CalendarCreateModal, type CreateEventData } from "@/components/CalendarCreateModal";
import type { CalendarConnectionState } from "@/hooks/useGoogleCalendar";
import type { CalendarStatus } from "@/lib/googleCalendar";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface CalViewEvent {
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
}

interface CalendarViewProps {
  events: CalViewEvent[];
  gcalState: CalendarConnectionState;
  gcalStatus: CalendarStatus | null;
  gcalSyncing: boolean;
  gcalLastSync: Date | null;
  gcalConnected: boolean;
  onGcalConnect: () => Promise<void>;
  onGcalDisconnect: () => Promise<void>;
  onGcalRefetch: () => Promise<void>;
  onCreateEvent: (data: CreateEventData) => Promise<void>;
  onDeleteEvent: (id: string) => Promise<void>;
  onEditEvent: (event: CalViewEvent) => void;
  initialView?: "week" | "day" | "month" | "year" | "agenda";
  // Controlled state for sidebar sync
  currentDate?: Date;
  onDateChange?: (date: Date) => void;
  showHolidays?: boolean;
  onToggleHolidays?: (val: boolean) => void;
}

export interface CalendarViewHandle {
  openCreate: (date?: Date) => void;
}

type ViewType = "week" | "day" | "month" | "year" | "agenda";

const HOUR_HEIGHT = 56;
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function formatHour(h: number) {
  if (h === 0) return "12 AM";
  if (h < 12) return `${h} AM`;
  if (h === 12) return "12 PM";
  return `${h - 12} PM`;
}

// ── Overlap layout ─────────────────────────────────────────────────────────────
interface LayoutEvent extends CalViewEvent {
  _col: number; _cols: number; _top: number; _height: number;
}

function computeOverlapLayout(events: CalViewEvent[]): LayoutEvent[] {
  if (!events.length) return [];
  const sorted = [...events].sort((a, b) => a.start.getTime() - b.start.getTime());
  const result: LayoutEvent[] = [];
  const groups: CalViewEvent[][] = [];
  for (const ev of sorted) {
    let placed = false;
    for (const group of groups) {
      if (ev.start < group[group.length - 1].end) { group.push(ev); placed = true; break; }
    }
    if (!placed) groups.push([ev]);
  }
  for (const group of groups) {
    const cols = group.length;
    group.forEach((ev, i) => {
      const startMin = getHours(ev.start) * 60 + getMinutes(ev.start);
      const endMin = getHours(ev.end) * 60 + getMinutes(ev.end);
      result.push({ ...ev, _col: i, _cols: cols, _top: (startMin / 60) * HOUR_HEIGHT, _height: (Math.max(endMin - startMin, 30) / 60) * HOUR_HEIGHT - 2 });
    });
  }
  return result;
}

// ── MiniCalendar (exported for StudyMode sidebar) ─────────────────────────────
export const MiniCalendar = ({
  currentDate, onSelect, events,
}: { currentDate: Date; onSelect: (d: Date) => void; events: CalViewEvent[] }) => {
  const [miniDate, setMiniDate] = useState(() => new Date(currentDate.getFullYear(), currentDate.getMonth(), 1));
  useEffect(() => { setMiniDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)); }, [currentDate.getMonth(), currentDate.getFullYear()]);
  const start = startOfWeek(startOfMonth(miniDate), { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start, end: addDays(start, 41) });
  const hasEvent = (d: Date) => events.some((e) => isSameDay(e.start, d));

  return (
    <div className="p-3 select-none">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-body font-semibold">{format(miniDate, "MMMM yyyy")}</span>
        <div className="flex">
          <button className="p-1 rounded hover:bg-muted/60" onClick={() => setMiniDate((d) => subMonths(d, 1))}><ChevronLeft className="h-3 w-3" /></button>
          <button className="p-1 rounded hover:bg-muted/60" onClick={() => setMiniDate((d) => addMonths(d, 1))}><ChevronRight className="h-3 w-3" /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-px mb-1">
        {["S","M","T","W","T","F","S"].map((d, i) => (
          <div key={i} className="text-[9px] text-center text-muted-foreground font-body py-0.5">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px">
        {days.map((day) => (
          <button
            key={day.toISOString()}
            onClick={() => onSelect(day)}
            className={cn(
              "h-6 w-6 mx-auto flex flex-col items-center justify-center rounded-full text-[10px] font-body transition-colors relative",
              !isSameMonth(day, miniDate) && "opacity-20",
              isToday(day) && "bg-primary text-primary-foreground font-bold",
              isSameDay(day, currentDate) && !isToday(day) && "bg-primary/15 text-primary font-semibold",
              !isToday(day) && !isSameDay(day, currentDate) && "hover:bg-muted/60"
            )}
          >
            {format(day, "d")}
            {hasEvent(day) && !isToday(day) && (
              <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-primary" />
            )}
          </button>
        ))}
      </div>
      <button className="mt-2 text-[10px] font-body text-primary hover:underline" onClick={() => onSelect(new Date())}>Today</button>
    </div>
  );
};

// ── CalendarList (exported for StudyMode sidebar) ──────────────────────────────
export const CalendarList = ({
  gcalConnected, gcalEmail, showHolidays, onToggleHolidays,
}: { gcalConnected: boolean; gcalEmail?: string; showHolidays: boolean; onToggleHolidays: () => void }) => (
  <div className="px-3 py-2 space-y-3">
    <p className="text-[9px] font-body font-semibold text-muted-foreground uppercase tracking-widest">My calendars</p>
    <div className="space-y-1.5">
      <label className="flex items-center gap-2 cursor-pointer group">
        <span className="h-3 w-3 rounded-sm shrink-0" style={{ backgroundColor: "#7c3aed" }} />
        <span className="text-xs font-body">My Calendar</span>
      </label>
      {gcalConnected && (
        <label className="flex items-center gap-2 cursor-pointer group">
          <span className="h-3 w-3 rounded-sm shrink-0" style={{ backgroundColor: "#4285F4" }} />
          <span className="text-xs font-body truncate max-w-[110px]">{gcalEmail || "Google Calendar"}</span>
          <Wifi className="h-2.5 w-2.5 text-green-500 ml-auto shrink-0" />
        </label>
      )}
    </div>
    <p className="text-[9px] font-body font-semibold text-muted-foreground uppercase tracking-widest">Other calendars</p>
    <div className="space-y-1.5">
      <label className="flex items-center gap-2 cursor-pointer" onClick={onToggleHolidays}>
        <span className="h-3 w-3 rounded-sm shrink-0" style={{ backgroundColor: "#0F9D58", opacity: showHolidays ? 1 : 0.3 }} />
        <span className={cn("text-xs font-body", !showHolidays && "opacity-40")}>Holidays in India</span>
        {!showHolidays && <EyeOff className="h-2.5 w-2.5 text-muted-foreground ml-auto" />}
      </label>
      <label className="flex items-center gap-2 cursor-pointer">
        <Cake className="h-3 w-3 shrink-0 text-[#DB4437]" />
        <span className="text-xs font-body">Birthdays</span>
      </label>
    </div>
  </div>
);

// ── All-day row ────────────────────────────────────────────────────────────────
const AllDayRow = ({ days, events, onEventClick }: {
  days: Date[]; events: CalViewEvent[];
  onEventClick: (e: CalViewEvent, rect: DOMRect) => void;
}) => {
  const allDayEvents = events.filter((e) => e.allDay);
  return (
    <div className="flex border-b border-border/40 bg-muted/20">
      <div className="w-16 shrink-0 text-right pr-2 py-1">
        <span className="text-[9px] text-muted-foreground font-body">ALL DAY</span>
      </div>
      {days.map((day) => {
        const dayEvents = allDayEvents.filter((e) => isSameDay(e.start, day));
        return (
          <div key={day.toISOString()} className={cn("flex-1 border-l border-border/30 min-h-[28px] py-0.5 px-0.5", isToday(day) && "bg-primary/[0.03]")}>
            {dayEvents.map((ev) => (
              <button key={ev.id}
                className="w-full text-left text-[10px] font-body rounded px-1.5 py-0.5 mb-0.5 truncate transition-all hover:brightness-110"
                style={{ backgroundColor: `${ev.color}30`, color: ev.color, borderLeft: `2px solid ${ev.color}` }}
                onClick={(e) => { e.stopPropagation(); onEventClick(ev, (e.target as HTMLElement).getBoundingClientRect()); }}
              >
                {ev.source === "holiday" && "🎌 "}{ev.source === "birthday" && "🎂 "}{ev.title}
              </button>
            ))}
          </div>
        );
      })}
    </div>
  );
};

// ── Time grid ──────────────────────────────────────────────────────────────────
const TimeGrid = ({ days, events, onSlotClick, onEventClick }: {
  days: Date[]; events: CalViewEvent[];
  onSlotClick: (day: Date, hour: number) => void;
  onEventClick: (e: CalViewEvent, rect: DOMRect) => void;
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const now = new Date();
  const currentMinute = getHours(now) * 60 + getMinutes(now);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = Math.max(0, (currentMinute - 60) * (HOUR_HEIGHT / 60));
  }, []);

  return (
    <div className="flex-1 overflow-y-auto" ref={scrollRef}>
      <div className="relative" style={{ minHeight: `${24 * HOUR_HEIGHT}px` }}>
        {HOURS.map((hour) => (
          <div key={hour} className="flex absolute left-0 right-0" style={{ top: `${hour * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}>
            <div className="w-16 shrink-0 text-right pr-2 -mt-2 select-none pointer-events-none">
              <span className="text-[10px] text-muted-foreground font-body">{hour !== 0 ? formatHour(hour) : ""}</span>
            </div>
            <div className="flex-1 border-t border-border/20" />
          </div>
        ))}
        {HOURS.map((hour) => (
          <div key={`${hour}-half`} className="absolute left-16 right-0 border-t border-border/10 border-dashed pointer-events-none" style={{ top: `${hour * HOUR_HEIGHT + HOUR_HEIGHT / 2}px` }} />
        ))}
        <div className="absolute inset-0 flex ml-16">
          {days.map((day) => {
            const laidOut = computeOverlapLayout(events.filter((e) => !e.allDay && isSameDay(e.start, day)));
            return (
              <div key={day.toISOString()}
                className={cn("flex-1 relative border-l border-border/20 cursor-pointer", isToday(day) && "bg-primary/[0.015]")}
                onClick={(e) => { const rect = (e.currentTarget as HTMLElement).getBoundingClientRect(); onSlotClick(day, Math.max(0, Math.min(23, Math.floor((e.clientY - rect.top) / HOUR_HEIGHT)))); }}
              >
                {laidOut.map((ev) => (
                  <button key={ev.id}
                    className="absolute z-10 text-left overflow-hidden transition-all hover:brightness-110 active:scale-[0.98] rounded-md px-1.5 py-0.5"
                    style={{ top: `${ev._top}px`, height: `${Math.max(ev._height, 20)}px`, left: `${(100 / ev._cols) * ev._col + 0.5}%`, width: `${100 / ev._cols - 1}%`, backgroundColor: `${ev.color}25`, borderLeft: `3px solid ${ev.color}` }}
                    onClick={(e) => { e.stopPropagation(); onEventClick(ev, (e.currentTarget as HTMLElement).getBoundingClientRect()); }}
                  >
                    <p className="text-[11px] font-body font-semibold truncate leading-tight" style={{ color: ev.color }}>
                      {ev.source === "task" && <CheckSquare className="h-2.5 w-2.5 inline mr-0.5 -mt-px" />}
                      {ev.title}
                    </p>
                    {ev._height > 28 && <p className="text-[9px] font-body opacity-70 truncate">{format(ev.start, "h:mm")} – {format(ev.end, "h:mm a")}</p>}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
        {days.some((d) => isToday(d)) && (
          <div className="absolute left-16 right-0 z-20 pointer-events-none flex items-center" style={{ top: `${(currentMinute / 60) * HOUR_HEIGHT}px` }}>
            <div className="h-2.5 w-2.5 rounded-full bg-red-500 -ml-1.5 shrink-0 shadow-sm" />
            <div className="flex-1 h-[2px] bg-red-500 shadow-sm" />
          </div>
        )}
      </div>
    </div>
  );
};

// ── MobileDayView ─────────────────────────────────────────────────────────────
// Vertical hourly day-list optimised for touch. Horizontal swipe → ±1 day.
const MobileDayView = ({ currentDate, events, onSlotClick, onEventClick, onChangeDay }: {
  currentDate: Date;
  events: CalViewEvent[];
  onSlotClick: (day: Date, hour: number) => void;
  onEventClick: (e: CalViewEvent, rect: DOMRect) => void;
  onChangeDay: (delta: number) => void;
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const dayEvents = useMemo(
    () => events.filter((e) => isSameDay(e.start, currentDate) && !e.allDay)
      .sort((a, b) => a.start.getTime() - b.start.getTime()),
    [events, currentDate]
  );
  const allDay = useMemo(() => events.filter((e) => e.allDay && isSameDay(e.start, currentDate)), [events, currentDate]);
  const now = new Date();
  const currentMinute = getHours(now) * 60 + getMinutes(now);
  const isCurrent = isToday(currentDate);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = Math.max(0, (currentMinute - 90) * (HOUR_HEIGHT / 60));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate.toDateString()]);

  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (startX.current == null || startY.current == null) return;
    const dx = e.changedTouches[0].clientX - startX.current;
    const dy = e.changedTouches[0].clientY - startY.current;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      onChangeDay(dx < 0 ? 1 : -1);
    }
    startX.current = null;
    startY.current = null;
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {/* Compact day header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/30 shrink-0">
        <button onClick={() => onChangeDay(-1)} className="h-9 w-9 -ml-2 rounded-full flex items-center justify-center text-muted-foreground active:bg-muted/40">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="text-center">
          <p className={cn("text-[11px] font-body uppercase tracking-wider", isCurrent ? "text-primary font-semibold" : "text-muted-foreground")}>{format(currentDate, "EEEE")}</p>
          <p className={cn("text-base font-heading font-bold leading-tight", isCurrent && "text-primary")}>{format(currentDate, "MMMM d")}</p>
        </div>
        <button onClick={() => onChangeDay(1)} className="h-9 w-9 -mr-2 rounded-full flex items-center justify-center text-muted-foreground active:bg-muted/40">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* All-day pills */}
      {allDay.length > 0 && (
        <div className="px-4 py-2 border-b border-border/20 flex flex-wrap gap-1.5 shrink-0">
          {allDay.map((ev) => (
            <button key={ev.id}
              className="text-[11px] font-body rounded-full px-2.5 py-1 truncate max-w-[60%]"
              style={{ backgroundColor: `${ev.color}25`, color: ev.color }}
              onClick={(e) => onEventClick(ev, (e.currentTarget as HTMLElement).getBoundingClientRect())}
            >
              {ev.source === "holiday" && "🎌 "}{ev.source === "birthday" && "🎂 "}{ev.title}
            </button>
          ))}
        </div>
      )}

      {/* Hourly timeline */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain">
        <div className="relative" style={{ minHeight: `${24 * HOUR_HEIGHT}px` }}>
          {HOURS.map((hour) => (
            <button
              key={hour}
              type="button"
              className="absolute left-0 right-0 flex active:bg-muted/30 transition-colors"
              style={{ top: `${hour * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}
              onClick={() => onSlotClick(currentDate, hour)}
            >
              <div className="w-14 shrink-0 text-right pr-2 -mt-2 select-none pointer-events-none">
                <span className="text-[10px] text-muted-foreground font-body">{hour !== 0 ? formatHour(hour) : ""}</span>
              </div>
              <div className="flex-1 border-t border-border/20" />
            </button>
          ))}

          {/* Events */}
          <div className="absolute inset-y-0 left-14 right-2 pointer-events-none">
            {dayEvents.map((ev) => {
              const startMin = getHours(ev.start) * 60 + getMinutes(ev.start);
              const endMin = getHours(ev.end) * 60 + getMinutes(ev.end);
              const top = (startMin / 60) * HOUR_HEIGHT;
              const height = Math.max(((endMin - startMin) / 60) * HOUR_HEIGHT - 2, 24);
              return (
                <button
                  key={ev.id}
                  className="absolute left-0 right-0 text-left rounded-lg px-2.5 py-1.5 active:scale-[0.98] transition-transform pointer-events-auto"
                  style={{ top, height, backgroundColor: `${ev.color}20`, borderLeft: `3px solid ${ev.color}` }}
                  onClick={(e) => { e.stopPropagation(); onEventClick(ev, (e.currentTarget as HTMLElement).getBoundingClientRect()); }}
                >
                  <p className="text-[12px] font-body font-semibold truncate leading-tight" style={{ color: ev.color }}>
                    {ev.source === "task" && <CheckSquare className="h-2.5 w-2.5 inline mr-0.5 -mt-px" />}
                    {ev.title}
                  </p>
                  {height > 32 && (
                    <p className="text-[10px] font-body opacity-70 truncate">{format(ev.start, "h:mm")} – {format(ev.end, "h:mm a")}</p>
                  )}
                </button>
              );
            })}
          </div>

          {/* Now indicator */}
          {isCurrent && (
            <div className="absolute left-14 right-0 z-20 pointer-events-none flex items-center" style={{ top: `${(currentMinute / 60) * HOUR_HEIGHT}px` }}>
              <div className="h-2.5 w-2.5 rounded-full bg-red-500 -ml-1.5 shrink-0 shadow-sm" />
              <div className="flex-1 h-[2px] bg-red-500 shadow-sm" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const MonthView = ({ currentDate, events, onDayClick, onEventClick, onCreateClick }: {
  currentDate: Date; events: CalViewEvent[];
  onDayClick: (d: Date) => void; onEventClick: (e: CalViewEvent, rect: DOMRect) => void; onCreateClick: (d: Date) => void;
}) => {
  const gridStart = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: gridStart, end: addDays(gridStart, 41) });
  const getEventsForDay = (d: Date) => events.filter((e) => isSameDay(e.start, d));

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <div className="grid grid-cols-7 border-b border-border/40 shrink-0">
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => (
          <div key={d} className="py-2 text-center">
            <span className="text-[10px] font-body text-muted-foreground uppercase font-medium">{d}</span>
          </div>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-7 h-full" style={{ gridAutoRows: "minmax(90px, 1fr)" }}>
          {days.map((day) => {
            const dayEvs = getEventsForDay(day);
            const visible = dayEvs.slice(0, 3);
            const overflow = dayEvs.length - 3;
            return (
              <div key={day.toISOString()}
                className={cn("border-r border-b border-border/20 p-1 relative cursor-pointer transition-colors hover:bg-muted/30", !isSameMonth(day, currentDate) && "bg-muted/10", isToday(day) && "bg-primary/[0.04]")}
                onClick={() => onCreateClick(day)}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <button
                    className={cn("h-6 w-6 flex items-center justify-center rounded-full text-xs font-body font-medium transition-colors", isToday(day) && "bg-primary text-primary-foreground", !isToday(day) && isSameMonth(day, currentDate) && "hover:bg-muted", !isSameMonth(day, currentDate) && "text-muted-foreground")}
                    onClick={(e) => { e.stopPropagation(); onDayClick(day); }}
                  >{format(day, "d")}</button>
                </div>
                <div className="space-y-0.5">
                  {visible.map((ev) => (
                    <button key={ev.id}
                      className="w-full text-left text-[10px] font-body truncate rounded px-1.5 py-0.5 transition-all hover:brightness-110"
                      style={{ backgroundColor: ev.allDay ? ev.color : `${ev.color}25`, color: ev.allDay ? "#fff" : ev.color, borderLeft: ev.allDay ? "none" : `2px solid ${ev.color}` }}
                      onClick={(e) => { e.stopPropagation(); onEventClick(ev, (e.currentTarget as HTMLElement).getBoundingClientRect()); }}
                    >
                      {ev.source === "holiday" && "🎌 "}{ev.source === "birthday" && "🎂 "}
                      {!ev.allDay && <span className="opacity-70 mr-0.5">{format(ev.start, "h:mm")}</span>}
                      {ev.title}
                    </button>
                  ))}
                  {overflow > 0 && (
                    <button className="text-[10px] text-primary font-body hover:underline pl-1" onClick={(e) => { e.stopPropagation(); onDayClick(day); }}>+{overflow} more</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ── Agenda view ────────────────────────────────────────────────────────────────
const AgendaView = ({ events, onEventClick, onCreateClick }: {
  events: CalViewEvent[]; onEventClick: (e: CalViewEvent, rect: DOMRect) => void; onCreateClick: () => void;
}) => {
  const upcoming = useMemo(() => events.filter((e) => e.start >= startOfDay(new Date())).sort((a, b) => a.start.getTime() - b.start.getTime()), [events]);
  const grouped = useMemo(() => {
    const g: Record<string, CalViewEvent[]> = {};
    upcoming.forEach((e) => { const k = format(e.start, "yyyy-MM-dd"); g[k] = [...(g[k] || []), e]; });
    return g;
  }, [upcoming]);

  if (!Object.keys(grouped).length) return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center py-20">
      <CalendarIcon className="h-12 w-12 text-muted-foreground/20" />
      <div>
        <p className="text-sm font-body font-medium">No upcoming events</p>
        <p className="text-xs text-muted-foreground font-body mt-1">Click + Create to add one</p>
      </div>
      <Button variant="outline" size="sm" className="font-body gap-1" onClick={onCreateClick}><Plus className="h-3.5 w-3.5" /> Create Event</Button>
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto">
      {Object.entries(grouped).map(([dateStr, dayEvents]) => {
        const date = new Date(dateStr);
        const todayFlag = isToday(date);
        return (
          <div key={dateStr} className="flex border-b border-border/20">
            <div className={cn("w-24 shrink-0 p-4 flex flex-col items-center", todayFlag && "text-primary")}>
              <span className="text-[11px] font-body text-muted-foreground uppercase">{format(date, "EEE")}</span>
              <span className={cn("text-2xl font-heading font-bold leading-none mt-0.5", todayFlag && "text-primary")}>{format(date, "d")}</span>
              <span className="text-[10px] text-muted-foreground font-body mt-0.5">{format(date, "MMM")}</span>
            </div>
            <div className="flex-1 py-2 pr-4">
              {dayEvents.map((ev) => (
                <button key={ev.id} className="w-full text-left flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/40 transition-colors"
                  onClick={(e) => onEventClick(ev, (e.currentTarget as HTMLElement).getBoundingClientRect())}
                >
                  <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: ev.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-body font-medium truncate">
                      {ev.source === "holiday" && "🎌 "}{ev.source === "birthday" && "🎂 "}
                      {ev.source === "task" && <CheckSquare className="h-3 w-3 inline mr-1" />}
                      {ev.title}
                    </p>
                    <p className="text-xs text-muted-foreground font-body">
                      {ev.allDay ? "All day" : `${format(ev.start, "h:mm a")} – ${format(ev.end, "h:mm a")}`}
                      {ev.location && ` · ${ev.location}`}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ── Year view ──────────────────────────────────────────────────────────────────
const YearView = ({ currentDate, events, onMonthClick }: {
  currentDate: Date; events: CalViewEvent[]; onMonthClick: (d: Date) => void;
}) => {
  const getEventsForDay = (d: Date) => events.filter((e) => isSameDay(e.start, d));
  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
        {Array.from({ length: 12 }, (_, i) => {
          const md = new Date(currentDate.getFullYear(), i, 1);
          const start = startOfWeek(md, { weekStartsOn: 0 });
          const days = eachDayOfInterval({ start, end: addDays(startOfWeek(endOfMonth(md), { weekStartsOn: 0 }), 6) }).slice(0, 42);
          return (
            <div key={i} className="cursor-pointer hover:bg-muted/30 rounded-xl p-2.5 transition-colors" onClick={() => onMonthClick(md)}>
              <h4 className={cn("text-xs font-body font-semibold text-center mb-2", i === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear() && "text-primary")}>
                {format(md, "MMMM")}
              </h4>
              <div className="grid grid-cols-7 gap-px">
                {days.map((d) => (
                  <div key={d.toISOString()} className={cn("h-3.5 w-3.5 text-[7px] flex items-center justify-center rounded-full mx-auto", !isSameMonth(d, md) && "opacity-0", isToday(d) && "bg-primary text-primary-foreground font-bold", isSameMonth(d, md) && !isToday(d) && getEventsForDay(d).length > 0 && "bg-primary/20 text-primary")}>
                    {isSameMonth(d, md) ? format(d, "d") : ""}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Main CalendarView export ───────────────────────────────────────────────────
export const CalendarView = forwardRef<CalendarViewHandle, CalendarViewProps>(({
  events, gcalState, gcalStatus, gcalSyncing, gcalLastSync, gcalConnected,
  onGcalConnect, onGcalDisconnect, onGcalRefetch,
  onCreateEvent, onDeleteEvent, onEditEvent, initialView = "week",
  currentDate: propDate, onDateChange, showHolidays: propHolidays, onToggleHolidays,
}, ref) => {
  const [internalDate, setInternalDate] = useState(new Date());
  const currentDate = propDate || internalDate;
  const setCurrentDate = onDateChange || setInternalDate;

  // Mobile detection — force day view, full-bleed, no toolbar shortcuts
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const [view, setView] = useState<ViewType>(isMobile ? "day" : initialView);
  // Force day view when entering mobile
  useEffect(() => { if (isMobile) setView("day"); }, [isMobile]);

  const [showWeekends, setShowWeekends] = useState(true);
  
  const [internalHolidays, setInternalHolidays] = useState(true);
  const showHolidays = propHolidays !== undefined ? propHolidays : internalHolidays;
  const setShowHolidays = (val: boolean) => {
    if (onToggleHolidays) onToggleHolidays(val);
    else setInternalHolidays(val);
  };

  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const [popoverEvent, setPopoverEvent] = useState<{ event: PopoverEvent; rect: DOMRect } | null>(null);
  const [createModal, setCreateModal] = useState<{ open: boolean; date?: Date; hour?: number }>({ open: false });

  useImperativeHandle(ref, () => ({ openCreate: (date?: Date) => setCreateModal({ open: true, date }) }));

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const k = e.key.toUpperCase();
      if (k === "D") setView("day");
      else if (k === "W") setView("week");
      else if (k === "M") setView("month");
      else if (k === "Y") setView("year");
      else if (k === "A") setView("agenda");
      else if (k === "T") setCurrentDate(new Date());
      else if (e.key === "ArrowLeft") navigate(-1);
      else if (e.key === "ArrowRight") navigate(1);
      else if (e.key === "Escape") setPopoverEvent(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [view, currentDate]);

  const navigate = useCallback((delta: number) => {
    setCurrentDate((d) => {
      if (view === "week") return delta > 0 ? addWeeks(d, 1) : subWeeks(d, 1);
      if (view === "month") return delta > 0 ? addMonths(d, 1) : subMonths(d, 1);
      if (view === "year") return new Date(d.getFullYear() + delta, d.getMonth(), 1);
      return delta > 0 ? addDays(d, 1) : subDays(d, 1);
    });
  }, [view]);

  const visibleEvents = useMemo(() =>
    events.filter((e) => showHolidays || (e.source !== "holiday" && e.source !== "birthday")),
    [events, showHolidays]
  );

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekDays = useMemo(() => {
    const days = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });
    return showWeekends ? days : days.filter((d) => d.getDay() !== 0 && d.getDay() !== 6);
  }, [weekStart, showWeekends]);

  const dateLabel = useMemo(() => {
    if (view === "week") return `${format(weekStart, "MMMM d")} – ${format(addDays(weekStart, 6), "d, yyyy")}`;
    if (view === "day") return format(currentDate, "EEEE, MMMM d, yyyy");
    if (view === "year") return format(currentDate, "yyyy");
    return format(currentDate, "MMMM yyyy");
  }, [view, currentDate, weekStart]);

  const handleSlotClick = useCallback((day: Date, hour: number) => setCreateModal({ open: true, date: day, hour }), []);
  const handleEventClick = useCallback((ev: CalViewEvent, rect: DOMRect) => setPopoverEvent({ event: ev as PopoverEvent, rect }), []);
  const handleCreateFromDay = useCallback((day: Date) => { setView("day"); setCurrentDate(day); }, []);
  const handleSaveEvent = useCallback(async (data: CreateEventData) => { await onCreateEvent(data); setCreateModal({ open: false }); }, [onCreateEvent]);
  const handleChangeDay = useCallback((delta: number) => setCurrentDate((d) => addDays(d, delta)), []);

  const VIEW_OPTIONS = [
    { id: "day" as ViewType, label: "Day", key: "D" },
    { id: "week" as ViewType, label: "Week", key: "W" },
    { id: "month" as ViewType, label: "Month", key: "M" },
    { id: "year" as ViewType, label: "Year", key: "Y" },
    { id: "agenda" as ViewType, label: "Schedule", key: "A" },
  ];

  // ── MOBILE BRANCH — Edge-to-edge day view, no toolbar, FAB instead of Create button ──
  if (isMobile) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden h-full min-w-0 bg-background relative">
        <MobileDayView
          currentDate={currentDate}
          events={visibleEvents}
          onSlotClick={handleSlotClick}
          onEventClick={handleEventClick}
          onChangeDay={handleChangeDay}
        />

        {/* FAB — Create event */}
        <button
          onClick={() => setCreateModal({ open: true, date: currentDate })}
          className="fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] z-30 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 active:scale-95 transition-transform flex items-center justify-center"
          aria-label="Create event"
        >
          <Plus className="h-6 w-6" />
        </button>

        {/* Event popover */}
        <AnimatePresence>
          {popoverEvent && (
            <CalendarEventPopover
              event={popoverEvent.event} anchorRect={popoverEvent.rect}
              onClose={() => setPopoverEvent(null)}
              onEdit={(ev) => { setPopoverEvent(null); onEditEvent(ev as CalViewEvent); }}
              onDelete={async (id) => { setPopoverEvent(null); await onDeleteEvent(id); }}
            />
          )}
        </AnimatePresence>
        <AnimatePresence>
          {createModal.open && (
            <CalendarCreateModal
              open={createModal.open} initialDate={createModal.date} initialHour={createModal.hour}
              onClose={() => setCreateModal({ open: false })}
              onSave={handleSaveEvent} gcalConnected={gcalConnected}
            />
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden h-full min-w-0">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/40 bg-background/80 backdrop-blur-sm shrink-0 gap-2">
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" className="font-body text-xs h-8 px-3" onClick={() => setCurrentDate(new Date())}>Today</Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(1)}><ChevronRight className="h-4 w-4" /></Button>
          <h2 className="text-sm md:text-base font-heading font-bold ml-1 hidden sm:block">{dateLabel}</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => setCreateModal({ open: true })}
            className="hidden md:flex h-8 rounded-xl bg-primary text-primary-foreground font-body text-xs font-medium gap-1.5 px-3 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
            Create
          </Button>
          <GoogleCalendarBanner connectionState={gcalState} calendarStatus={gcalStatus} isSyncing={gcalSyncing} lastSyncedAt={gcalLastSync} onConnect={onGcalConnect} onDisconnect={onGcalDisconnect} onRefetch={onGcalRefetch} />
          <div className="relative">
            <Button variant="outline" size="sm" className="hidden md:flex font-body text-xs h-8 gap-1" onClick={() => setViewMenuOpen((o) => !o)}>
              {VIEW_OPTIONS.find((v) => v.id === view)?.label}
              <ChevronLeft className="h-3 w-3 rotate-[-90deg]" />
            </Button>
            {viewMenuOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setViewMenuOpen(false)} />
                <div className="absolute right-0 top-10 z-40 w-48 bg-card border border-border/50 rounded-xl shadow-xl p-1.5">
                  {VIEW_OPTIONS.map((v) => (
                    <button key={v.id}
                      className={cn("w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-body transition-colors", view === v.id ? "bg-primary/10 text-primary" : "hover:bg-muted/50")}
                      onClick={() => { setView(v.id); setViewMenuOpen(false); }}
                    >
                      <span>{v.label}</span>
                      <kbd className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{v.key}</kbd>
                    </button>
                  ))}
                  <div className="border-t border-border/50 mt-1.5 pt-1.5">
                    <label className="flex items-center gap-2 px-3 py-1.5 text-sm font-body cursor-pointer">
                      <Checkbox checked={showWeekends} onCheckedChange={(c) => setShowWeekends(!!c)} />
                      Show weekends
                    </label>
                  </div>
                </div>
              </>
            )}
          </div>
          <Button size="icon" className="md:hidden h-8 w-8" onClick={() => setCreateModal({ open: true })}><Plus className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* View content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {view === "week" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex border-b border-border/40 shrink-0">
              <div className="w-16 shrink-0" />
              {weekDays.map((day) => (
                <div key={day.toISOString()}
                  className={cn("flex-1 py-2 text-center border-l border-border/30 cursor-pointer hover:bg-muted/30 transition-colors", isToday(day) && "bg-primary/[0.04]")}
                  onClick={() => { setCurrentDate(day); setView("day"); }}
                >
                  <p className="text-[10px] text-muted-foreground font-body uppercase">{format(day, "EEE")}</p>
                  <p className={cn("text-lg font-heading font-bold leading-none mt-0.5", isToday(day) && "h-8 w-8 mx-auto flex items-center justify-center rounded-full bg-primary text-primary-foreground text-base")}>
                    {format(day, "d")}
                  </p>
                </div>
              ))}
            </div>
            <AllDayRow days={weekDays} events={visibleEvents} onEventClick={handleEventClick} />
            <TimeGrid days={weekDays} events={visibleEvents} onSlotClick={handleSlotClick} onEventClick={handleEventClick} />
          </div>
        )}

        {view === "day" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex border-b border-border/40 shrink-0">
              <div className="w-16 shrink-0" />
              <div className={cn("flex-1 py-3 text-center border-l border-border/30", isToday(currentDate) && "bg-primary/[0.04]")}>
                <p className="text-[10px] text-muted-foreground font-body uppercase">{format(currentDate, "EEEE")}</p>
                <p className={cn("text-2xl font-heading font-bold leading-none mt-0.5", isToday(currentDate) && "text-primary")}>{format(currentDate, "d")}</p>
              </div>
            </div>
            <AllDayRow days={[currentDate]} events={visibleEvents} onEventClick={handleEventClick} />
            <TimeGrid days={[currentDate]} events={visibleEvents} onSlotClick={handleSlotClick} onEventClick={handleEventClick} />
          </div>
        )}

        {view === "month" && (
          <MonthView currentDate={currentDate} events={visibleEvents}
            onDayClick={handleCreateFromDay} onEventClick={handleEventClick}
            onCreateClick={(d) => setCreateModal({ open: true, date: d })}
          />
        )}

        {view === "year" && (
          <YearView currentDate={currentDate} events={visibleEvents} onMonthClick={(d) => { setCurrentDate(d); setView("month"); }} />
        )}

        {view === "agenda" && (
          <AgendaView events={visibleEvents} onEventClick={handleEventClick} onCreateClick={() => setCreateModal({ open: true })} />
        )}
      </div>

      {/* Event detail popover */}
      <AnimatePresence>
        {popoverEvent && (
          <CalendarEventPopover
            event={popoverEvent.event} anchorRect={popoverEvent.rect}
            onClose={() => setPopoverEvent(null)}
            onEdit={(ev) => { setPopoverEvent(null); onEditEvent(ev as CalViewEvent); }}
            onDelete={async (id) => { setPopoverEvent(null); await onDeleteEvent(id); }}
          />
        )}
      </AnimatePresence>

      {/* Create modal */}
      <AnimatePresence>
        {createModal.open && (
          <CalendarCreateModal
            open={createModal.open} initialDate={createModal.date} initialHour={createModal.hour}
            onClose={() => setCreateModal({ open: false })}
            onSave={handleSaveEvent} gcalConnected={gcalConnected}
          />
        )}
      </AnimatePresence>
    </div>
  );
});

CalendarView.displayName = "CalendarView";
