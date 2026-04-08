import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Layout } from "@/components/Layout";
import { EmptyState } from "@/components/EmptyState";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import {
  Calendar, Clock, Plus, Play, Pause, Square, Check, ChevronLeft, ChevronRight,
  Flame, Target, TrendingUp, BarChart3, Timer, Lock, X, AlertTriangle,
  Sun, Moon, Music, Upload, Volume2, Image, Pencil, Trash2, RotateCcw,
  CalendarDays, LayoutGrid, List, Zap, Trophy, Inbox, FolderKanban,
  ArrowRight, Repeat, MapPin, Link2, SkipForward, Maximize, Minimize,
  Heart, Brain, Sparkles, Eye, Coffee, Dumbbell, Wind,
  CheckCircle2, Circle, CircleDot, Hash, ChevronDown, ChevronUp,
  Search, PanelLeftClose, PanelLeft, Settings, Bell,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

type SystemView = "calendar" | "tasks" | "habits" | "focus" | "analytics";
type CalendarView = "day" | "week" | "month" | "agenda";
type TaskView = "today" | "inbox" | "projects" | "upcoming";
type Priority = "none" | "low" | "medium" | "high" | "urgent";
type EventType = "study" | "assignment" | "exam" | "lecture" | "meeting" | "personal" | "break" | "custom";
type TaskStatus = "todo" | "in_progress" | "done" | "cancelled";
type EnergyLevel = "low" | "medium" | "high";
type TimerStyle = "minimal" | "ring" | "flip";

interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  startTime: string; // ISO UTC
  endTime: string;
  allDay: boolean;
  eventType: EventType;
  color: string;
  recurrenceRule?: { frequency: string; interval: number; daysOfWeek?: number[]; endDate?: string };
  recurrenceExceptions?: Record<string, Partial<CalendarEvent>>;
  linkedTaskId?: string;
  focusModeEnabled: boolean;
  focusMode: "strict" | "normal";
  reminders: number[];
  locationOrUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  dueDate?: string;
  dueTime?: string;
  priority: Priority;
  status: TaskStatus;
  projectId?: string;
  tags: string[];
  estimatedDuration: number;
  energyLevel: EnergyLevel;
  subtasks: { title: string; completed: boolean }[];
  linkedEventId?: string;
  createdAt: string;
  completedAt?: string;
  position: number;
}

interface Project {
  id: string;
  name: string;
  description: string;
  color: string;
  deadline?: string;
  sections: string[];
  archived: boolean;
}

interface Habit {
  id: string;
  name: string;
  icon: string;
  color: string;
  frequency: "daily" | "specific_days" | "x_per_week" | "x_per_month";
  daysOfWeek: number[];
  timesPerPeriod: number;
  timeOfDay: "morning" | "afternoon" | "evening" | "anytime";
  streakCount: number;
  longestStreak: number;
  archived: boolean;
  createdAt: string;
}

interface HabitLog {
  [habitId: string]: boolean;
}

interface FocusSession {
  id: string;
  linkedEventId?: string;
  linkedTaskId?: string;
  startTime: string;
  endTime?: string;
  plannedDuration: number;
  actualDuration: number;
  mode: "strict" | "normal";
  abandoned: boolean;
  moodRating?: number;
  note?: string;
  soundscape?: string;
  wallpaper?: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAYS_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const EVENT_COLORS: Record<EventType, string> = {
  study: "hsl(263, 70%, 55%)",
  assignment: "hsl(38, 92%, 50%)",
  exam: "hsl(0, 72%, 51%)",
  lecture: "hsl(200, 70%, 50%)",
  meeting: "hsl(142, 71%, 45%)",
  personal: "hsl(280, 60%, 50%)",
  break: "hsl(200, 15%, 50%)",
  custom: "hsl(263, 40%, 55%)",
};

const PRIORITY_COLORS: Record<Priority, string> = {
  none: "text-muted-foreground",
  low: "text-[hsl(var(--badge-low-text))]",
  medium: "text-[hsl(var(--badge-med-text))]",
  high: "text-[hsl(var(--badge-hot-text))]",
  urgent: "text-destructive",
};

const SOUNDSCAPES = [
  { name: "Lo-fi Beats", url: "https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3", icon: "🎵" },
  { name: "Rain", url: "https://cdn.pixabay.com/audio/2022/03/10/audio_4dedf5bf94.mp3", icon: "🌧️" },
  { name: "Nature", url: "https://cdn.pixabay.com/audio/2022/08/23/audio_d16737dc28.mp3", icon: "🌿" },
];

const MOTIVATIONAL_MESSAGES = [
  "The people who master discomfort will master their domain.",
  "You started this session for a reason. The reason has not changed.",
  "Discipline is choosing between what you want now and what you want most.",
  "Every minute you stay focused is a minute your competition does not.",
  "This discomfort is temporary. The knowledge you gain is permanent.",
  "The best time to give up was never. Keep going.",
  "Your future self is watching. Make them proud.",
  "Small daily improvements are the key to staggering long-term results.",
  "Focus is not about saying yes. It is about saying no to everything else.",
  "Champions train when they do not feel like it. That is what makes them champions.",
];

const formatTime = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h > 0 ? `${h}:` : ""}${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
};

const formatTimeShort = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m > 0 ? `${m}m` : ""}` : `${m}m`;
};

const getDateStr = (d: Date) => d.toISOString().slice(0, 10);
const todayStr = () => getDateStr(new Date());

const parseNaturalLanguage = (input: string): Partial<Task> => {
  const result: Partial<Task> = { title: input, priority: "none" as Priority };
  const today = new Date();
  
  if (/\btomorrow\b/i.test(input)) {
    const d = new Date(today); d.setDate(d.getDate() + 1);
    result.dueDate = getDateStr(d);
    result.title = input.replace(/\btomorrow\b/i, "").trim();
  } else if (/\btoday\b/i.test(input)) {
    result.dueDate = todayStr();
    result.title = input.replace(/\btoday\b/i, "").trim();
  } else if (/\bnext\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.test(input)) {
    const match = input.match(/\bnext\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i);
    if (match) {
      const dayIndex = DAYS_FULL.findIndex(d => d.toLowerCase() === match[1].toLowerCase());
      const d = new Date(today);
      const diff = ((dayIndex - d.getDay()) + 7) % 7 || 7;
      d.setDate(d.getDate() + diff);
      result.dueDate = getDateStr(d);
      result.title = input.replace(match[0], "").trim();
    }
  }

  const timeMatch = input.match(/\bat\s+(\d{1,2})(:\d{2})?\s*(am|pm)?\b/i);
  if (timeMatch) {
    let h = parseInt(timeMatch[1]);
    if (timeMatch[3]?.toLowerCase() === "pm" && h < 12) h += 12;
    if (timeMatch[3]?.toLowerCase() === "am" && h === 12) h = 0;
    result.dueTime = `${String(h).padStart(2, "0")}:${timeMatch[2]?.slice(1) || "00"}`;
    result.title = (result.title || "").replace(timeMatch[0], "").trim();
  }

  if (/\bhigh\s*priority\b/i.test(input)) {
    result.priority = "high";
    result.title = (result.title || "").replace(/\bhigh\s*priority\b/i, "").trim();
  } else if (/\burgent\b/i.test(input)) {
    result.priority = "urgent";
    result.title = (result.title || "").replace(/\burgent\b/i, "").trim();
  } else if (/\blow\s*priority\b/i.test(input)) {
    result.priority = "low";
    result.title = (result.title || "").replace(/\blow\s*priority\b/i, "").trim();
  }

  return result;
};

// ─── Mini Month Calendar ────────────────────────────────────────────────────

const MiniMonthCalendar = ({ currentDate, onDateClick, events }: { currentDate: Date; onDateClick: (d: Date) => void; events: CalendarEvent[] }) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = todayStr();

  const eventDates = useMemo(() => {
    const set = new Set<string>();
    events.forEach(e => {
      const d = e.startTime.slice(0, 10);
      set.add(d);
    });
    return set;
  }, [events]);

  return (
    <div className="px-3 py-2">
      <p className="text-[10px] font-body font-semibold text-muted-foreground/60 uppercase tracking-widest mb-1.5">
        {MONTHS[month]} {year}
      </p>
      <div className="grid grid-cols-7 gap-0">
        {DAYS_SHORT.map(d => (
          <div key={d} className="text-center text-[8px] font-body text-muted-foreground/40 py-0.5">{d[0]}</div>
        ))}
        {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const d = new Date(year, month, i + 1);
          const ds = getDateStr(d);
          const isToday = ds === today;
          const hasEvents = eventDates.has(ds);
          return (
            <button
              key={i}
              onClick={() => onDateClick(d)}
              className={cn(
                "text-[10px] font-body py-0.5 rounded-md transition-colors relative",
                isToday ? "bg-primary/20 text-primary font-bold" : "hover:bg-accent/40 text-foreground/70"
              )}
            >
              {i + 1}
              {hasEvents && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ─── Focus Timer Ring ───────────────────────────────────────────────────────

const TimerRing = ({ seconds, totalSeconds }: { seconds: number; totalSeconds: number }) => {
  const r = 80;
  const c = 2 * Math.PI * r;
  const progress = totalSeconds > 0 ? (seconds / totalSeconds) : 0;
  const offset = c * (1 - progress);
  return (
    <div className="relative w-48 h-48 mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
        <circle cx="100" cy="100" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="6" opacity="0.3" />
        <circle cx="100" cy="100" r={r} fill="none" stroke="hsl(var(--primary))" strokeWidth="6"
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
          className="transition-all duration-1000 ease-linear" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-4xl font-heading font-extrabold tabular-nums text-gradient">{formatTime(seconds)}</span>
      </div>
    </div>
  );
};

// ─── Main Component ─────────────────────────────────────────────────────────

const StudyMode = () => {
  const { user } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const userId = user?.uid;

  // System state
  const [activeSystem, setActiveSystem] = useState<SystemView>("calendar");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Calendar state
  const [calView, setCalView] = useState<CalendarView>("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Tasks state
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [taskView, setTaskView] = useState<TaskView>("today");
  const [quickCaptureOpen, setQuickCaptureOpen] = useState(false);
  const [quickCaptureText, setQuickCaptureText] = useState("");

  // Habits state
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitLogs, setHabitLogs] = useState<Record<string, HabitLog>>({});

  // Focus state
  const [activeSession, setActiveSession] = useState<FocusSession | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [strictMode, setStrictMode] = useState(false);
  const [exitRequested, setExitRequested] = useState(false);
  const [exitCountdown, setExitCountdown] = useState(15);
  const [timerStyle, setTimerStyle] = useState<TimerStyle>("ring");
  const [currentTrack, setCurrentTrack] = useState<string | null>(null);
  const [volume, setVolume] = useState(50);
  const [wallpaper, setWallpaper] = useState<string | null>(() => localStorage.getItem("vv_study_wallpaper"));
  const [controlsVisible, setControlsVisible] = useState(true);
  const [showPostSummary, setShowPostSummary] = useState(false);
  const [sessionMood, setSessionMood] = useState<number | null>(null);
  const [sessionNote, setSessionNote] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wallpaperInputRef = useRef<HTMLInputElement>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sessions for analytics
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>([]);

  // Create/edit modals
  const [createEventOpen, setCreateEventOpen] = useState(false);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [createHabitOpen, setCreateHabitOpen] = useState(false);
  const [drawerEvent, setDrawerEvent] = useState<CalendarEvent | null>(null);

  // Event form
  const [eventForm, setEventForm] = useState({
    title: "", description: "", date: todayStr(), startTime: "09:00", endTime: "10:00",
    allDay: false, eventType: "study" as EventType, focusModeEnabled: true, focusMode: "normal" as "strict" | "normal",
    locationOrUrl: "",
  });

  // Task form
  const [taskForm, setTaskForm] = useState({
    title: "", description: "", dueDate: "", dueTime: "", priority: "none" as Priority,
    estimatedDuration: 30, energyLevel: "medium" as EnergyLevel, projectId: "",
    tags: "",
  });

  // Habit form
  const [habitForm, setHabitForm] = useState({
    name: "", icon: "📚", color: "hsl(263, 70%, 55%)", frequency: "daily" as Habit["frequency"],
    timeOfDay: "morning" as Habit["timeOfDay"],
  });

  // Morning briefing
  const [showBriefing, setShowBriefing] = useState(false);

  // ─── Data Loading ─────────────────────────────────────────────────────────

  useEffect(() => { document.title = "Study OS — VivaVault"; }, []);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    const fetchAll = async () => {
      try {
        const [evSnap, taskSnap, projSnap, habitSnap, sessSnap] = await Promise.all([
          getDocs(collection(db, "users", userId, "calendarEvents")),
          getDocs(collection(db, "users", userId, "tasks")),
          getDocs(collection(db, "users", userId, "projects")),
          getDocs(collection(db, "users", userId, "habits")),
          getDocs(collection(db, "users", userId, "focusSessions")),
        ]);
        setEvents(evSnap.docs.map(d => ({ id: d.id, ...d.data() } as CalendarEvent)));
        setTasks(taskSnap.docs.map(d => ({ id: d.id, ...d.data() } as Task)));
        setProjects(projSnap.docs.map(d => ({ id: d.id, ...d.data() } as Project)));
        setHabits(habitSnap.docs.map(d => ({ id: d.id, ...d.data() } as Habit)));
        setFocusSessions(sessSnap.docs.map(d => ({ id: d.id, ...d.data() } as FocusSession)));

        // Load last 7 days habit logs
        const today = new Date();
        const logPromises = [];
        for (let i = 0; i < 7; i++) {
          const d = new Date(today); d.setDate(d.getDate() - i);
          const ds = getDateStr(d);
          logPromises.push(
            getDocs(collection(db, "users", userId, "habitLogs")).then(snap => {
              const logDoc = snap.docs.find(dd => dd.id === ds);
              return { date: ds, data: logDoc?.data() as HabitLog | undefined };
            })
          );
        }
        const logs = await Promise.all(logPromises);
        const logMap: Record<string, HabitLog> = {};
        logs.forEach(l => { if (l.data) logMap[l.date] = l.data; });
        setHabitLogs(logMap);

        // Morning briefing check
        const lastBriefing = localStorage.getItem("vv_last_briefing");
        if (lastBriefing !== todayStr()) {
          setShowBriefing(true);
        }
      } catch { toast.error("Failed to load Study OS data"); }
      finally { setLoading(false); }
    };
    fetchAll();
  }, [userId]);

  // ─── Timer Logic ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!timerRunning) return;
    const interval = setInterval(() => setTimerSeconds(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [timerRunning]);

  useEffect(() => {
    if (!exitRequested || exitCountdown <= 0) return;
    const timer = setTimeout(() => setExitCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [exitRequested, exitCountdown]);

  useEffect(() => { if (audioRef.current) audioRef.current.volume = volume / 100; }, [volume]);

  // Quick capture keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "t" && !e.metaKey && !e.ctrlKey && !e.altKey && !(e.target as HTMLElement).closest("input, textarea, [contenteditable]")) {
        e.preventDefault();
        setQuickCaptureOpen(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        // Could open search — for now toggle quick capture
      }
      // Number keys to switch views
      if (!e.metaKey && !e.ctrlKey && !(e.target as HTMLElement).closest("input, textarea, [contenteditable]")) {
        const views: SystemView[] = ["calendar", "tasks", "habits", "focus", "analytics"];
        const idx = parseInt(e.key) - 1;
        if (idx >= 0 && idx < views.length) {
          setActiveSystem(views[idx]);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // ─── Focus Engine ─────────────────────────────────────────────────────────

  const resetHideTimer = useCallback(() => {
    setControlsVisible(true);
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    hideTimeoutRef.current = setTimeout(() => setControlsVisible(false), 3000);
  }, []);

  const playTrack = (url: string) => {
    if (audioRef.current) audioRef.current.pause();
    const audio = new Audio(url);
    audio.loop = true;
    audio.volume = volume / 100;
    audio.play().catch(() => {});
    audioRef.current = audio;
    setCurrentTrack(url);
  };

  const stopMusic = () => { audioRef.current?.pause(); audioRef.current = null; setCurrentTrack(null); };

  const handleWallpaper = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { const url = ev.target?.result as string; setWallpaper(url); try { localStorage.setItem("vv_study_wallpaper", url); } catch {} };
    reader.readAsDataURL(file);
  };

  const startFocusSession = (title: string, mode: "strict" | "normal", linkedTaskId?: string, linkedEventId?: string, duration = 25) => {
    const session: FocusSession = {
      id: `temp_${Date.now()}`,
      linkedTaskId, linkedEventId,
      startTime: new Date().toISOString(),
      plannedDuration: duration,
      actualDuration: 0,
      mode,
      abandoned: false,
    };
    setActiveSession(session);
    setTimerSeconds(0);
    setTimerRunning(true);
    setStrictMode(mode === "strict");
    setExitRequested(false);
    setShowPostSummary(false);
    setSessionMood(null);
    setSessionNote("");
    if (mode === "strict") document.documentElement.requestFullscreen?.().catch(() => {});
  };

  const completeSession = async () => {
    if (!activeSession || !userId) return;
    stopMusic();
    if (strictMode) document.exitFullscreen?.().catch(() => {});
    setTimerRunning(false);

    const finalSession: FocusSession = {
      ...activeSession,
      endTime: new Date().toISOString(),
      actualDuration: Math.round(timerSeconds / 60),
      abandoned: false,
    };

    try {
      const ref = await addDoc(collection(db, "users", userId, "focusSessions"), {
        ...finalSession, id: undefined, createdAt: serverTimestamp(),
      });
      setFocusSessions(prev => [...prev, { ...finalSession, id: ref.id }]);

      // Mark linked task as done
      if (activeSession.linkedTaskId) {
        const task = tasks.find(t => t.id === activeSession.linkedTaskId);
        if (task) {
          await updateDoc(doc(db, "users", userId, "tasks", task.id), { status: "done", completedAt: new Date().toISOString() });
          setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: "done" as TaskStatus, completedAt: new Date().toISOString() } : t));
        }
      }
    } catch { toast.error("Failed to save session"); }

    setShowPostSummary(true);
  };

  const savePostSummary = async () => {
    setShowPostSummary(false);
    setActiveSession(null);
    setStrictMode(false);
    setExitRequested(false);
    toast.success(`Focus session complete! ${formatTime(timerSeconds)}`);
  };

  const abandonSession = async () => {
    if (!activeSession || !userId) return;
    stopMusic();
    if (strictMode) document.exitFullscreen?.().catch(() => {});
    setTimerRunning(false);

    try {
      await addDoc(collection(db, "users", userId, "focusSessions"), {
        ...activeSession, id: undefined,
        endTime: new Date().toISOString(),
        actualDuration: Math.round(timerSeconds / 60),
        abandoned: true,
        createdAt: serverTimestamp(),
      });
    } catch {}

    setActiveSession(null);
    setStrictMode(false);
    setExitRequested(false);
    toast("Session ended early");
  };

  const requestExit = () => {
    if (strictMode) { setExitRequested(true); setExitCountdown(15); }
    else completeSession();
  };

  // ─── Event CRUD ───────────────────────────────────────────────────────────

  const handleCreateEvent = async () => {
    if (!userId || !eventForm.title) { toast.error("Title required"); return; }
    const ev: Partial<CalendarEvent> = {
      title: eventForm.title,
      description: eventForm.description,
      startTime: `${eventForm.date}T${eventForm.startTime}:00.000Z`,
      endTime: `${eventForm.date}T${eventForm.endTime}:00.000Z`,
      allDay: eventForm.allDay,
      eventType: eventForm.eventType,
      color: EVENT_COLORS[eventForm.eventType],
      focusModeEnabled: eventForm.focusModeEnabled,
      focusMode: eventForm.focusMode,
      reminders: [15],
      locationOrUrl: eventForm.locationOrUrl,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    try {
      const ref = await addDoc(collection(db, "users", userId, "calendarEvents"), ev);
      setEvents(prev => [...prev, { id: ref.id, ...ev } as CalendarEvent]);
      setCreateEventOpen(false);
      setEventForm({ title: "", description: "", date: todayStr(), startTime: "09:00", endTime: "10:00", allDay: false, eventType: "study", focusModeEnabled: true, focusMode: "normal", locationOrUrl: "" });
      toast.success("Event created");
    } catch { toast.error("Failed to create event"); }
  };

  const deleteEvent = async (id: string) => {
    if (!userId) return;
    await deleteDoc(doc(db, "users", userId, "calendarEvents", id));
    setEvents(prev => prev.filter(e => e.id !== id));
    toast.success("Event deleted");
  };

  // ─── Task CRUD ────────────────────────────────────────────────────────────

  const handleCreateTask = async () => {
    if (!userId || !taskForm.title) { toast.error("Title required"); return; }
    const task: Partial<Task> = {
      title: taskForm.title,
      description: taskForm.description,
      dueDate: taskForm.dueDate || undefined,
      dueTime: taskForm.dueTime || undefined,
      priority: taskForm.priority,
      status: "todo",
      projectId: taskForm.projectId || undefined,
      tags: taskForm.tags.split(",").map(t => t.trim()).filter(Boolean),
      estimatedDuration: taskForm.estimatedDuration,
      energyLevel: taskForm.energyLevel,
      subtasks: [],
      createdAt: new Date().toISOString(),
      position: tasks.length,
    };
    try {
      const ref = await addDoc(collection(db, "users", userId, "tasks"), task);
      setTasks(prev => [...prev, { id: ref.id, ...task } as Task]);
      setCreateTaskOpen(false);
      setTaskForm({ title: "", description: "", dueDate: "", dueTime: "", priority: "none", estimatedDuration: 30, energyLevel: "medium", projectId: "", tags: "" });
      toast.success("Task created");
    } catch { toast.error("Failed to create task"); }
  };

  const handleQuickCapture = async () => {
    if (!userId || !quickCaptureText.trim()) return;
    const parsed = parseNaturalLanguage(quickCaptureText);
    const task: Partial<Task> = {
      title: parsed.title || quickCaptureText,
      description: "",
      dueDate: parsed.dueDate,
      dueTime: parsed.dueTime,
      priority: parsed.priority || "none",
      status: "todo",
      tags: [],
      estimatedDuration: 30,
      energyLevel: "medium",
      subtasks: [],
      createdAt: new Date().toISOString(),
      position: tasks.length,
    };
    try {
      const ref = await addDoc(collection(db, "users", userId, "tasks"), task);
      setTasks(prev => [...prev, { id: ref.id, ...task } as Task]);
      setQuickCaptureOpen(false);
      setQuickCaptureText("");
      toast.success("Task captured!");
    } catch { toast.error("Failed"); }
  };

  const toggleTaskDone = async (taskId: string) => {
    if (!userId) return;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const newStatus: TaskStatus = task.status === "done" ? "todo" : "done";
    await updateDoc(doc(db, "users", userId, "tasks", taskId), {
      status: newStatus,
      completedAt: newStatus === "done" ? new Date().toISOString() : null,
    });
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus, completedAt: newStatus === "done" ? new Date().toISOString() : undefined } : t));
  };

  const deleteTask = async (id: string) => {
    if (!userId) return;
    await deleteDoc(doc(db, "users", userId, "tasks", id));
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  // ─── Habit CRUD ───────────────────────────────────────────────────────────

  const handleCreateHabit = async () => {
    if (!userId || !habitForm.name) { toast.error("Name required"); return; }
    const habit: Partial<Habit> = {
      name: habitForm.name,
      icon: habitForm.icon,
      color: habitForm.color,
      frequency: habitForm.frequency,
      daysOfWeek: [],
      timesPerPeriod: 1,
      timeOfDay: habitForm.timeOfDay,
      streakCount: 0,
      longestStreak: 0,
      archived: false,
      createdAt: new Date().toISOString(),
    };
    try {
      const ref = await addDoc(collection(db, "users", userId, "habits"), habit);
      setHabits(prev => [...prev, { id: ref.id, ...habit } as Habit]);
      setCreateHabitOpen(false);
      setHabitForm({ name: "", icon: "📚", color: "hsl(263, 70%, 55%)", frequency: "daily", timeOfDay: "morning" });
      toast.success("Habit created");
    } catch { toast.error("Failed"); }
  };

  const toggleHabit = async (habitId: string, dateStr: string) => {
    if (!userId) return;
    const existing = habitLogs[dateStr] || {};
    const newVal = !existing[habitId];
    const newLog = { ...existing, [habitId]: newVal };
    await setDoc(doc(db, "users", userId, "habitLogs", dateStr), newLog, { merge: true });
    setHabitLogs(prev => ({ ...prev, [dateStr]: newLog }));

    // Update streak
    if (newVal) {
      const habit = habits.find(h => h.id === habitId);
      if (habit) {
        const newStreak = habit.streakCount + 1;
        const longest = Math.max(habit.longestStreak, newStreak);
        await updateDoc(doc(db, "users", userId, "habits", habitId), { streakCount: newStreak, longestStreak: longest });
        setHabits(prev => prev.map(h => h.id === habitId ? { ...h, streakCount: newStreak, longestStreak: longest } : h));
      }
    }
  };

  // ─── Calendar Navigation ──────────────────────────────────────────────────

  const navigateCalendar = (dir: number) => {
    const d = new Date(currentDate);
    if (calView === "day") d.setDate(d.getDate() + dir);
    else if (calView === "week") d.setDate(d.getDate() + dir * 7);
    else d.setMonth(d.getMonth() + dir);
    setCurrentDate(d);
  };

  const goToday = () => setCurrentDate(new Date());

  // ─── Computed Data ────────────────────────────────────────────────────────

  const getEventsForDate = useCallback((dateStr: string) => {
    return events.filter(e => e.startTime?.slice(0, 10) === dateStr);
  }, [events]);

  const weekDates = useMemo(() => {
    const start = new Date(currentDate);
    start.setDate(start.getDate() - start.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start); d.setDate(d.getDate() + i); return d;
    });
  }, [currentDate]);

  const monthDates = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const dates: (Date | null)[] = [];
    for (let i = 0; i < firstDay; i++) dates.push(null);
    for (let i = 1; i <= daysInMonth; i++) dates.push(new Date(year, month, i));
    return dates;
  }, [currentDate]);

  // Stats
  const today = todayStr();
  const todayTasks = useMemo(() => tasks.filter(t => t.dueDate === today), [tasks, today]);
  const overdueTasks = useMemo(() => tasks.filter(t => t.dueDate && t.dueDate < today && t.status !== "done" && t.status !== "cancelled"), [tasks, today]);
  const inboxTasks = useMemo(() => tasks.filter(t => !t.dueDate && t.status === "todo"), [tasks]);
  const completedToday = useMemo(() => tasks.filter(t => t.completedAt?.slice(0, 10) === today).length, [tasks, today]);
  const totalFocusToday = useMemo(() => focusSessions.filter(s => s.startTime?.slice(0, 10) === today).reduce((acc, s) => acc + (s.actualDuration || 0), 0), [focusSessions, today]);

  const streak = useMemo(() => {
    let s = 0;
    const d = new Date();
    for (let i = 0; i < 365; i++) {
      const ds = getDateStr(d);
      const hasFocus = focusSessions.some(sess => sess.startTime?.slice(0, 10) === ds && !sess.abandoned);
      if (hasFocus) s++;
      else if (i > 0) break;
      d.setDate(d.getDate() - 1);
    }
    return s;
  }, [focusSessions]);

  // Analytics: heatmap data
  const heatmapData = useMemo(() => {
    const map: Record<string, number> = {};
    focusSessions.forEach(s => {
      const ds = s.startTime?.slice(0, 10);
      if (ds) map[ds] = (map[ds] || 0) + (s.actualDuration || 0);
    });
    return map;
  }, [focusSessions]);

  // Analytics: hourly patterns
  const hourlyPatterns = useMemo(() => {
    const hours = new Array(24).fill(0);
    const counts = new Array(24).fill(0);
    focusSessions.forEach(s => {
      const h = parseInt(s.startTime?.slice(11, 13) || "0");
      hours[h] += s.actualDuration || 0;
      counts[h]++;
    });
    return hours.map((total, i) => ({ hour: i, avgMinutes: counts[i] > 0 ? Math.round(total / counts[i]) : 0 }));
  }, [focusSessions]);

  const peakHour = useMemo(() => {
    const best = hourlyPatterns.reduce((max, h) => h.avgMinutes > max.avgMinutes ? h : max, { hour: 0, avgMinutes: 0 });
    return best.hour;
  }, [hourlyPatterns]);

  // ─── Fullscreen Focus Engine ──────────────────────────────────────────────

  if (activeSession && !showPostSummary) {
    const bgStyle = wallpaper ? { backgroundImage: `url(${wallpaper})`, backgroundSize: "cover", backgroundPosition: "center" } : {};
    const plannedSeconds = activeSession.plannedDuration * 60;

    if (strictMode && exitRequested) {
      return (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background" style={bgStyle}>
          {wallpaper && <div className="absolute inset-0 bg-black/60" />}
          <div className="relative z-10 w-full max-w-md px-6 text-center animate-focus-fade">
            <AlertTriangle className="h-12 w-12 text-[hsl(var(--warning))] mx-auto mb-4" />
            <h2 className="text-2xl font-heading font-bold mb-3">Wait! Don't leave</h2>
            <p className="text-muted-foreground font-body mb-4 italic">
              "{MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)]}"
            </p>
            <p className="text-sm text-muted-foreground font-body mb-6">
              You've focused for <span className="text-primary font-semibold">{formatTime(timerSeconds)}</span>
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => setExitRequested(false)} className="font-body gap-2 bg-gradient-to-r from-primary to-[hsl(280,60%,50%)]">
                <Flame className="h-4 w-4" /> Return to Session
              </Button>
              <Button variant="ghost" size="sm" onClick={abandonSession} disabled={exitCountdown > 0} className="font-body text-muted-foreground">
                {exitCountdown > 0 ? `Wait ${exitCountdown}s` : "End Anyway"}
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center" style={bgStyle} onMouseMove={resetHideTimer}>
        {wallpaper && <div className="absolute inset-0 bg-black/50" />}
        {!wallpaper && <div className="absolute inset-0 bg-background" />}

        {/* Top controls */}
        <div className={cn("absolute top-4 right-4 flex items-center gap-2 z-10 transition-opacity duration-300", controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none")}>
          <Button variant="ghost" size="icon" onClick={() => wallpaperInputRef.current?.click()} className="text-foreground/50 h-8 w-8">
            <Image className="h-4 w-4" />
          </Button>
          <input ref={wallpaperInputRef} type="file" accept="image/*" className="hidden" onChange={handleWallpaper} />
        </div>

        <div className="relative z-10 w-full max-w-md px-6 text-center">
          {strictMode && <Lock className="h-6 w-6 text-primary/60 mx-auto mb-3 animate-pulse" />}
          <p className="text-sm text-muted-foreground/80 font-body mb-4">{activeSession.linkedTaskId ? tasks.find(t => t.id === activeSession.linkedTaskId)?.title : "Focus Session"}</p>

          {/* Timer display */}
          {timerStyle === "ring" ? (
            <TimerRing seconds={timerSeconds} totalSeconds={plannedSeconds} />
          ) : (
            <div className="text-7xl font-heading font-extrabold tabular-nums mb-8 text-gradient">
              {formatTime(timerSeconds)}
            </div>
          )}

          {/* Soundscapes */}
          <div className={cn("mb-6 space-y-3 transition-opacity duration-300", controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none")}>
            <div className="flex flex-wrap gap-2 justify-center">
              {SOUNDSCAPES.map(m => (
                <button key={m.name} onClick={() => currentTrack === m.url ? stopMusic() : playTrack(m.url)}
                  className={cn("px-3 py-1.5 rounded-full text-xs font-body transition-all",
                    currentTrack === m.url ? "bg-primary text-primary-foreground" : "bg-secondary/60 text-muted-foreground hover:text-foreground"
                  )}>
                  {m.icon} {m.name}
                </button>
              ))}
            </div>
            {currentTrack && (
              <div className="flex items-center gap-3 px-8 max-w-xs mx-auto">
                <Volume2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <Slider value={[volume]} onValueChange={([v]) => setVolume(v)} max={100} step={1} className="flex-1" />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className={cn("flex gap-3 justify-center transition-opacity duration-300", controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none")}>
            {!strictMode && (
              <Button variant="ghost" size="sm" onClick={() => setTimerRunning(!timerRunning)} className="font-body gap-1 text-muted-foreground">
                {timerRunning ? <><Pause className="h-3.5 w-3.5" /> Pause</> : <><Play className="h-3.5 w-3.5" /> Resume</>}
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => setTimerSeconds(s => s + 300)} className="font-body gap-1 text-muted-foreground">
              <SkipForward className="h-3.5 w-3.5" /> +5 min
            </Button>
            <Button variant="ghost" size="sm" onClick={requestExit} className="font-body gap-1 text-muted-foreground">
              <X className="h-3.5 w-3.5" /> End
            </Button>
          </div>

          {/* Session counter */}
          <p className="text-[10px] text-muted-foreground/40 font-body mt-6">
            Session {focusSessions.filter(s => s.startTime?.slice(0, 10) === today).length + 1} today
          </p>
        </div>
      </div>
    );
  }

  // ─── Post-Session Summary ─────────────────────────────────────────────────

  if (showPostSummary) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-xl animate-focus-fade">
        <div className="w-full max-w-sm p-6 text-center">
          <div className="h-16 w-16 rounded-full bg-[hsl(var(--success))]/10 flex items-center justify-center mx-auto mb-4">
            <Check className="h-8 w-8 text-[hsl(var(--success))]" />
          </div>
          <h2 className="text-2xl font-heading font-bold mb-1">Session Complete!</h2>
          <p className="text-muted-foreground font-body mb-6">{formatTime(timerSeconds)} of focused work</p>

          <div className="space-y-4">
            <div>
              <p className="text-sm font-body text-muted-foreground mb-2">How did it feel?</p>
              <div className="flex gap-4 justify-center">
                {[
                  { val: 1, emoji: "😣", label: "Struggled" },
                  { val: 2, emoji: "😐", label: "Okay" },
                  { val: 3, emoji: "🧠", label: "Flow State" },
                ].map(m => (
                  <button key={m.val} onClick={() => setSessionMood(m.val)}
                    className={cn("flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all",
                      sessionMood === m.val ? "bg-primary/10 border border-primary/30" : "hover:bg-accent/50"
                    )}>
                    <span className="text-2xl">{m.emoji}</span>
                    <span className="text-[10px] font-body text-muted-foreground">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Input value={sessionNote} onChange={e => setSessionNote(e.target.value)}
                placeholder="Quick note about this session..."
                className="font-body text-sm bg-secondary/30 border-border/30" />
            </div>
            <Button onClick={savePostSummary} className="w-full font-body gap-2 bg-gradient-to-r from-primary to-[hsl(280,60%,50%)]">
              <Check className="h-4 w-4" /> Done
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Morning Briefing ─────────────────────────────────────────────────────

  if (showBriefing) {
    const now = new Date();
    const hour = now.getHours();
    const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
    const todayEvents = getEventsForDate(today);
    const firstSession = todayEvents.find(e => e.focusModeEnabled);

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background animate-focus-fade cursor-pointer"
        onClick={() => { setShowBriefing(false); localStorage.setItem("vv_last_briefing", today); }}>
        <div className="text-center max-w-md px-6">
          <p className="text-lg text-muted-foreground font-body mb-2">{greeting} 👋</p>
          <h1 className="text-4xl font-heading font-extrabold mb-6">
            {DAYS_FULL[now.getDay()]}, {MONTHS[now.getMonth()]} {now.getDate()}
          </h1>
          <div className="space-y-3 text-sm font-body text-muted-foreground">
            <p>{todayTasks.length} tasks due today • {todayEvents.length} events scheduled</p>
            {firstSession && <p>First session: <span className="text-primary font-medium">{firstSession.title}</span> at {firstSession.startTime.slice(11, 16)}</p>}
            {streak > 0 && <p className="text-[hsl(var(--streak))]">🔥 {streak} day focus streak</p>}
            {habits.filter(h => !h.archived).length > 0 && <p>{habits.filter(h => !h.archived).length} habits to check off</p>}
          </div>
          <p className="text-[10px] text-muted-foreground/30 font-body mt-8">Press any key or click to continue</p>
        </div>
      </div>
    );
  }

  // ─── Main Layout ──────────────────────────────────────────────────────────

  if (!user) {
    return (
      <Layout>
        <EmptyState icon={Calendar} title="Sign in to access Study OS" description="Plan, track, and execute your study sessions." />
      </Layout>
    );
  }

  const renderCalendar = () => (
    <div className="space-y-4 view-fade-enter">
      {/* Calendar toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigateCalendar(-1)} className="h-8 w-8 p-0"><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={goToday} className="h-8 text-xs font-body">Today</Button>
          <Button variant="outline" size="sm" onClick={() => navigateCalendar(1)} className="h-8 w-8 p-0"><ChevronRight className="h-4 w-4" /></Button>
          <h2 className="text-lg font-heading font-bold ml-2">
            {currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric", ...(calView === "day" ? { day: "numeric" } : {}) })}
          </h2>
        </div>
        <div className="flex gap-0.5 bg-secondary/40 rounded-lg p-0.5">
          {([
            { view: "day" as CalendarView, icon: List, label: "Day" },
            { view: "week" as CalendarView, icon: CalendarDays, label: "Week" },
            { view: "month" as CalendarView, icon: LayoutGrid, label: "Month" },
            { view: "agenda" as CalendarView, icon: BarChart3, label: "Agenda" },
          ]).map(v => (
            <button key={v.view} onClick={() => setCalView(v.view)}
              className={cn("px-3 py-1.5 rounded-md text-xs font-body flex items-center gap-1.5 transition-all",
                calView === v.view ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}>
              <v.icon className="h-3 w-3" /> {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar views */}
      {calView === "month" ? (
        <div className="vv-card p-4">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAYS_SHORT.map(d => <div key={d} className="text-center text-[10px] font-body text-muted-foreground font-medium py-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {monthDates.map((date, i) => {
              if (!date) return <div key={i} />;
              const ds = getDateStr(date);
              const dayEvents = getEventsForDate(ds);
              const isToday = ds === today;
              return (
                <button key={i} onClick={() => { setCurrentDate(date); setCalView("day"); }}
                  className={cn("p-2 rounded-lg text-xs font-body min-h-[70px] text-left transition-colors",
                    isToday ? "bg-primary/10 border border-primary/30" : "hover:bg-accent/50")}>
                  <span className={cn("font-medium", isToday && "text-primary")}>{date.getDate()}</span>
                  {dayEvents.slice(0, 2).map(e => (
                    <div key={e.id} className="mt-0.5 px-1 py-0.5 rounded text-[9px] truncate"
                      style={{ background: `${e.color}20`, color: e.color, borderLeft: `2px solid ${e.color}` }}>
                      {e.title}
                    </div>
                  ))}
                  {dayEvents.length > 2 && <div className="text-[9px] text-muted-foreground mt-0.5">+{dayEvents.length - 2}</div>}
                </button>
              );
            })}
          </div>
        </div>
      ) : calView === "week" ? (
        <div className="vv-card p-4 overflow-x-auto">
          <div className="grid grid-cols-7 gap-2 min-w-[600px]">
            {weekDates.map(date => {
              const ds = getDateStr(date);
              const dayEvents = getEventsForDate(ds);
              const isToday = ds === today;
              return (
                <div key={ds} className={cn("rounded-lg p-2 min-h-[200px]", isToday && "bg-primary/5 border border-primary/20")}>
                  <div className="text-center mb-2">
                    <p className="text-[10px] text-muted-foreground font-body">{DAYS_SHORT[date.getDay()]}</p>
                    <p className={cn("text-lg font-heading font-bold", isToday && "text-primary")}>{date.getDate()}</p>
                  </div>
                  <div className="space-y-1.5">
                    {dayEvents.map(e => (
                      <button key={e.id} onClick={() => setDrawerEvent(e)}
                        className="w-full text-left p-2 rounded-lg text-xs font-body transition-all hover:scale-[1.02]"
                        style={{ background: `${e.color}15`, borderLeft: `3px solid ${e.color}` }}>
                        <p className="font-medium truncate">{e.title}</p>
                        <p className="text-muted-foreground">{e.startTime.slice(11, 16)} - {e.endTime.slice(11, 16)}</p>
                      </button>
                    ))}
                    <button onClick={() => { setEventForm(f => ({ ...f, date: ds })); setCreateEventOpen(true); }}
                      className="w-full py-1.5 rounded-lg border border-dashed border-border/40 text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors text-xs font-body flex items-center justify-center gap-1">
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : calView === "agenda" ? (
        <div className="space-y-4">
          {Array.from({ length: 14 }, (_, i) => {
            const d = new Date(); d.setDate(d.getDate() + i);
            const ds = getDateStr(d);
            const dayEvents = getEventsForDate(ds);
            if (dayEvents.length === 0 && i > 0) return null;
            return (
              <div key={ds}>
                <p className="text-xs font-body font-semibold text-muted-foreground mb-2">
                  {ds === today ? "Today" : d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                </p>
                {dayEvents.length === 0 ? (
                  <p className="text-xs text-muted-foreground/40 font-body pl-4">No events</p>
                ) : dayEvents.map(e => (
                  <button key={e.id} onClick={() => setDrawerEvent(e)}
                    className="w-full text-left p-3 rounded-xl mb-1.5 transition-all hover:bg-accent/30 flex items-center gap-3">
                    <div className="w-1 h-8 rounded-full shrink-0" style={{ background: e.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="font-body font-medium text-sm truncate">{e.title}</p>
                      <p className="text-xs text-muted-foreground font-body">{e.startTime.slice(11, 16)} - {e.endTime.slice(11, 16)}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-body capitalize shrink-0">{e.eventType}</Badge>
                  </button>
                ))}
              </div>
            );
          }).filter(Boolean)}
        </div>
      ) : (
        // Day view
        <div className="vv-card p-4">
          <div className="space-y-0">
            {HOURS.map(hour => {
              const hourStr = String(hour).padStart(2, "0");
              const ds = getDateStr(currentDate);
              const hourEvents = getEventsForDate(ds).filter(e => e.startTime?.slice(11, 13) === hourStr);
              const now = new Date();
              const isCurrentHour = ds === today && now.getHours() === hour;
              return (
                <div key={hour} className={cn("flex gap-3 min-h-[48px] group relative", isCurrentHour && "bg-primary/5 -mx-4 px-4 rounded-lg")}>
                  {isCurrentHour && <div className="absolute left-0 right-0 h-px bg-destructive" style={{ top: `${(now.getMinutes() / 60) * 100}%` }} />}
                  <span className="text-[10px] text-muted-foreground font-body w-10 shrink-0 pt-1 tabular-nums">{hourStr}:00</span>
                  <div className="flex-1 border-t border-border/20 pt-1 relative">
                    {hourEvents.map(e => (
                      <button key={e.id} onClick={() => setDrawerEvent(e)}
                        className="w-full text-left p-2 rounded-lg text-xs font-body mb-1 transition-all hover:scale-[1.01]"
                        style={{ background: `${e.color}15`, borderLeft: `3px solid ${e.color}` }}>
                        <span className="font-medium">{e.title}</span>
                        <span className="text-muted-foreground ml-2">{e.startTime.slice(11, 16)} - {e.endTime.slice(11, 16)}</span>
                      </button>
                    ))}
                    <button onClick={() => { setEventForm(f => ({ ...f, date: ds, startTime: `${hourStr}:00`, endTime: `${String(hour + 1).padStart(2, "0")}:00` })); setCreateEventOpen(true); }}
                      className="absolute inset-x-0 top-0 bottom-0 opacity-0 group-hover:opacity-100 flex items-center justify-center text-muted-foreground hover:text-primary transition-opacity">
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  const renderTasks = () => {
    const getFilteredTasks = () => {
      switch (taskView) {
        case "today": return [...overdueTasks, ...todayTasks].sort((a, b) => {
          const pa = ["urgent", "high", "medium", "low", "none"].indexOf(a.priority);
          const pb = ["urgent", "high", "medium", "low", "none"].indexOf(b.priority);
          return pa - pb;
        });
        case "inbox": return inboxTasks;
        case "upcoming": return tasks.filter(t => t.dueDate && t.dueDate >= today && t.status !== "done" && t.status !== "cancelled")
          .sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""));
        default: return tasks.filter(t => t.status !== "cancelled");
      }
    };

    const filtered = getFilteredTasks();

    return (
      <div className="space-y-4 view-fade-enter">
        {/* Task view tabs */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex gap-0.5 bg-secondary/40 rounded-lg p-0.5">
            {([
              { view: "today" as TaskView, icon: Sun, label: "Today", count: todayTasks.length + overdueTasks.length },
              { view: "inbox" as TaskView, icon: Inbox, label: "Inbox", count: inboxTasks.length },
              { view: "projects" as TaskView, icon: FolderKanban, label: "Projects" },
              { view: "upcoming" as TaskView, icon: CalendarDays, label: "Upcoming" },
            ]).map(v => (
              <button key={v.view} onClick={() => setTaskView(v.view)}
                className={cn("px-3 py-1.5 rounded-md text-xs font-body flex items-center gap-1.5 transition-all",
                  taskView === v.view ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}>
                <v.icon className="h-3 w-3" /> {v.label}
                {v.count !== undefined && v.count > 0 && (
                  <span className="bg-primary/20 text-primary text-[10px] px-1.5 rounded-full">{v.count}</span>
                )}
              </button>
            ))}
          </div>
          <Button size="sm" onClick={() => setCreateTaskOpen(true)} className="gap-1.5 text-xs font-body h-8">
            <Plus className="h-3.5 w-3.5" /> New Task
          </Button>
        </div>

        {/* Summary */}
        {taskView === "today" && (
          <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
            <p className="text-sm font-body text-foreground">
              You have <span className="font-semibold text-primary">{todayTasks.length + overdueTasks.length}</span> tasks today
              {overdueTasks.length > 0 && <span className="text-destructive ml-1">({overdueTasks.length} overdue)</span>}
              , estimated <span className="font-semibold">{formatTimeShort(filtered.reduce((a, t) => a + (t.estimatedDuration || 0), 0))}</span> of work.
            </p>
          </div>
        )}

        {/* Task list */}
        <div className="space-y-1">
          {filtered.map(task => (
            <div key={task.id} className={cn("flex items-start gap-3 px-3 py-2.5 rounded-xl transition-all group hover:bg-accent/30",
              task.status === "done" && "opacity-50")}>
              <button onClick={() => toggleTaskDone(task.id)} className="mt-0.5 shrink-0">
                {task.status === "done" ? (
                  <CheckCircle2 className="h-4.5 w-4.5 text-[hsl(var(--success))]" />
                ) : (
                  <Circle className={cn("h-4.5 w-4.5", PRIORITY_COLORS[task.priority])} />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <p className={cn("text-sm font-body font-medium", task.status === "done" && "line-through text-muted-foreground")}>
                  {task.title}
                </p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {task.dueDate && task.dueDate < today && task.status !== "done" && (
                    <span className="text-[10px] font-body text-destructive">Overdue</span>
                  )}
                  {task.dueDate && (
                    <span className="text-[10px] font-body text-muted-foreground">{task.dueDate}</span>
                  )}
                  {task.estimatedDuration > 0 && (
                    <span className="text-[10px] font-body text-muted-foreground">{formatTimeShort(task.estimatedDuration)}</span>
                  )}
                  {task.tags?.map(t => (
                    <Badge key={t} variant="outline" className="text-[9px] px-1.5 py-0 h-4">{t}</Badge>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                  startFocusSession(task.title, "normal", task.id);
                }}><Play className="h-3 w-3" /></Button>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteTask(task.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-12">
              <CheckCircle2 className="h-10 w-10 text-muted-foreground/15 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground/40 font-body">
                {taskView === "today" ? "All caught up! 🎉" : taskView === "inbox" ? "Inbox zero! 🎯" : "No tasks"}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderHabits = () => {
    const activeHabits = habits.filter(h => !h.archived);
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i));
      return { date: d, str: getDateStr(d) };
    });

    return (
      <div className="space-y-4 view-fade-enter">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-heading font-bold">Habits</h2>
          <Button size="sm" onClick={() => setCreateHabitOpen(true)} className="gap-1.5 text-xs font-body h-8">
            <Plus className="h-3.5 w-3.5" /> New Habit
          </Button>
        </div>

        <div className="space-y-2">
          {activeHabits.map(habit => (
            <div key={habit.id} className="vv-card p-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{habit.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-body font-medium text-sm">{habit.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {habit.streakCount > 0 && (
                      <span className={cn("text-[10px] font-body font-medium flex items-center gap-0.5",
                        habit.streakCount >= 7 ? "text-[hsl(var(--streak))]" : "text-muted-foreground"
                      )}>
                        {habit.streakCount >= 7 && "🔥"} {habit.streakCount}d streak
                      </span>
                    )}
                    <span className="text-[10px] font-body text-muted-foreground capitalize">{habit.frequency}</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  {last7Days.map(day => {
                    const completed = habitLogs[day.str]?.[habit.id];
                    const isToday = day.str === today;
                    const canToggle = isToday || day.str === getDateStr((() => { const d = new Date(); d.setDate(d.getDate() - 1); return d; })());
                    return (
                      <button key={day.str} onClick={() => canToggle && toggleHabit(habit.id, day.str)}
                        disabled={!canToggle}
                        className={cn("w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center",
                          completed ? "border-[hsl(var(--success))] bg-[hsl(var(--success))]/20" : "border-border/40",
                          isToday && !completed && "border-primary/40",
                          canToggle && "cursor-pointer hover:scale-110"
                        )}
                        title={day.date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                      >
                        {completed && <Check className="h-3 w-3 text-[hsl(var(--success))]" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
          {activeHabits.length === 0 && (
            <div className="text-center py-12">
              <Target className="h-10 w-10 text-muted-foreground/15 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground/40 font-body">No habits yet. Build your daily routine!</p>
              <Button size="sm" variant="outline" className="mt-3 text-xs font-body" onClick={() => setCreateHabitOpen(true)}>
                Create First Habit
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderFocusLauncher = () => (
    <div className="space-y-6 view-fade-enter">
      <div className="text-center py-8">
        <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary to-[hsl(280,60%,50%)] flex items-center justify-center mx-auto mb-4 shadow-xl">
          <Zap className="h-10 w-10 text-primary-foreground" />
        </div>
        <h2 className="text-2xl font-heading font-bold mb-2">Focus Engine</h2>
        <p className="text-muted-foreground font-body text-sm mb-6">Start a focus session to enter deep work mode</p>
        <div className="flex gap-3 justify-center">
          <Button onClick={() => startFocusSession("Focus Session", "normal")}
            className="gap-2 font-body bg-gradient-to-r from-primary to-[hsl(280,60%,50%)]">
            <Play className="h-4 w-4" /> Quick Focus
          </Button>
          <Button variant="outline" onClick={() => startFocusSession("Strict Focus", "strict")}
            className="gap-2 font-body border-primary/30 text-primary">
            <Lock className="h-4 w-4" /> Strict Mode
          </Button>
        </div>
      </div>

      {/* Recent sessions */}
      <div>
        <h3 className="text-sm font-heading font-semibold mb-3">Recent Sessions</h3>
        <div className="space-y-2">
          {focusSessions.slice(-5).reverse().map(s => (
            <div key={s.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-card border border-border/30">
              <div className={cn("h-2 w-2 rounded-full shrink-0", s.abandoned ? "bg-destructive" : "bg-[hsl(var(--success))]")} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-body truncate">{s.startTime?.slice(0, 10)}</p>
              </div>
              <span className="text-xs font-body text-muted-foreground tabular-nums">{s.actualDuration}m</span>
              <span className="text-xs">{s.moodRating === 3 ? "🧠" : s.moodRating === 2 ? "😐" : s.moodRating === 1 ? "😣" : "—"}</span>
            </div>
          ))}
          {focusSessions.length === 0 && (
            <p className="text-xs text-muted-foreground/40 font-body text-center py-6">No sessions yet</p>
          )}
        </div>
      </div>
    </div>
  );

  const renderAnalytics = () => {
    // Heatmap: last 365 days
    const heatmapDays = Array.from({ length: 365 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (364 - i));
      return { date: d, str: getDateStr(d) };
    });

    const maxFocusDay = Math.max(...Object.values(heatmapData), 1);

    const getHeatColor = (minutes: number) => {
      if (minutes === 0) return "bg-muted/30";
      if (minutes <= 30) return "bg-primary/20";
      if (minutes <= 90) return "bg-primary/40";
      if (minutes <= 180) return "bg-primary/70";
      return "bg-primary";
    };

    const taskCompletionRate = useMemo(() => {
      const total = tasks.length;
      const done = tasks.filter(t => t.status === "done").length;
      return total > 0 ? Math.round((done / total) * 100) : 0;
    }, [tasks]);

    return (
      <div className="space-y-6 view-fade-enter">
        <h2 className="text-lg font-heading font-bold">Analytics</h2>

        {/* Stats overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Focus Today", value: formatTimeShort(totalFocusToday), icon: Timer, color: "text-primary" },
            { label: "Streak", value: `${streak}d`, icon: Flame, color: "text-[hsl(var(--streak))]" },
            { label: "Tasks Done", value: `${taskCompletionRate}%`, icon: Target, color: "text-[hsl(var(--success))]" },
            { label: "Total Sessions", value: focusSessions.filter(s => !s.abandoned).length, icon: Trophy, color: "text-[hsl(var(--warning))]" },
          ].map((stat, i) => (
            <GlassCard key={i} hover={false} className="text-center py-4">
              <stat.icon className={cn("h-5 w-5 mx-auto mb-1.5", stat.color)} />
              <p className="text-xl font-heading font-bold tabular-nums">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground font-body mt-0.5">{stat.label}</p>
            </GlassCard>
          ))}
        </div>

        {/* Focus Heatmap */}
        <div className="vv-card p-4">
          <h3 className="text-sm font-heading font-semibold mb-3">Focus Heatmap</h3>
          <div className="flex flex-wrap gap-[2px]">
            {heatmapDays.map(day => {
              const minutes = heatmapData[day.str] || 0;
              return (
                <div key={day.str} className={cn("w-3 h-3 rounded-[2px] transition-colors", getHeatColor(minutes))}
                  title={`${day.date.toLocaleDateString()}: ${minutes}m`} />
              );
            })}
          </div>
          <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground font-body">
            <span>Less</span>
            <div className="w-3 h-3 rounded-[2px] bg-muted/30" />
            <div className="w-3 h-3 rounded-[2px] bg-primary/20" />
            <div className="w-3 h-3 rounded-[2px] bg-primary/40" />
            <div className="w-3 h-3 rounded-[2px] bg-primary/70" />
            <div className="w-3 h-3 rounded-[2px] bg-primary" />
            <span>More</span>
          </div>
        </div>

        {/* Daily Patterns */}
        <div className="vv-card p-4">
          <h3 className="text-sm font-heading font-semibold mb-3">Daily Patterns</h3>
          <div className="flex items-end gap-1 h-32">
            {hourlyPatterns.map(h => {
              const maxH = Math.max(...hourlyPatterns.map(p => p.avgMinutes), 1);
              const height = maxH > 0 ? (h.avgMinutes / maxH) * 100 : 0;
              return (
                <div key={h.hour} className="flex-1 flex flex-col items-center gap-1">
                  <div className={cn("w-full rounded-t-sm transition-all", h.hour === peakHour ? "bg-primary" : "bg-primary/30")}
                    style={{ height: `${Math.max(height, 2)}%` }}
                    title={`${h.hour}:00 — avg ${h.avgMinutes}m`} />
                  {h.hour % 4 === 0 && <span className="text-[8px] text-muted-foreground font-body">{h.hour}</span>}
                </div>
              );
            })}
          </div>
          {peakHour > 0 && (
            <p className="text-xs text-muted-foreground font-body mt-3 italic">
              💡 You focus best around {peakHour}:00. Schedule your hardest tasks then.
            </p>
          )}
        </div>

        {/* Habit Consistency */}
        <div className="vv-card p-4">
          <h3 className="text-sm font-heading font-semibold mb-3">Habit Consistency</h3>
          <div className="space-y-2">
            {habits.filter(h => !h.archived).map(habit => {
              const last7 = Array.from({ length: 7 }, (_, i) => {
                const d = new Date(); d.setDate(d.getDate() - (6 - i));
                return habitLogs[getDateStr(d)]?.[habit.id] || false;
              });
              const completionRate = Math.round((last7.filter(Boolean).length / 7) * 100);
              return (
                <div key={habit.id} className="flex items-center gap-3">
                  <span className="text-lg shrink-0">{habit.icon}</span>
                  <span className="text-xs font-body flex-1 truncate">{habit.name}</span>
                  <div className="w-24">
                    <Progress value={completionRate} className="h-1.5" />
                  </div>
                  <span className="text-[10px] font-body text-muted-foreground w-8 text-right">{completionRate}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Layout title="Study OS">
      <div className="flex gap-6 min-h-[calc(100vh-8rem)]">
        {/* Sidebar */}
        <div className={cn("shrink-0 transition-all duration-200", sidebarCollapsed ? "w-12" : "w-[220px]")}>
          <div className="sticky top-20 space-y-3">
            {/* Collapse toggle */}
            <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 rounded-lg hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors">
              {sidebarCollapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </button>

            {/* Nav links */}
            <nav className="space-y-0.5">
              {([
                { view: "calendar" as SystemView, icon: Calendar, label: "Calendar", shortcut: "1" },
                { view: "tasks" as SystemView, icon: CheckCircle2, label: "Tasks", shortcut: "2" },
                { view: "habits" as SystemView, icon: Target, label: "Habits", shortcut: "3" },
                { view: "focus" as SystemView, icon: Zap, label: "Focus", shortcut: "4" },
                { view: "analytics" as SystemView, icon: BarChart3, label: "Analytics", shortcut: "5" },
              ]).map(v => (
                <button key={v.view} onClick={() => setActiveSystem(v.view)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-body transition-all",
                    activeSystem === v.view
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
                  )}>
                  <v.icon className="h-4 w-4 shrink-0" />
                  {!sidebarCollapsed && (
                    <>
                      <span className="flex-1 text-left">{v.label}</span>
                      <span className="text-[10px] text-muted-foreground/40">{v.shortcut}</span>
                    </>
                  )}
                </button>
              ))}
            </nav>

            {/* Mini calendar */}
            {!sidebarCollapsed && (
              <>
                <div className="h-px bg-border/30" />
                <MiniMonthCalendar currentDate={currentDate} onDateClick={d => { setCurrentDate(d); setActiveSystem("calendar"); setCalView("day"); }} events={events} />

                {/* Today's top tasks */}
                <div className="h-px bg-border/30" />
                <div className="px-3 py-2">
                  <p className="text-[10px] font-body font-semibold text-muted-foreground/60 uppercase tracking-widest mb-1.5">Today's Tasks</p>
                  {todayTasks.slice(0, 3).map(task => (
                    <div key={task.id} className="flex items-center gap-2 py-1">
                      <button onClick={() => toggleTaskDone(task.id)} className="shrink-0">
                        {task.status === "done" ? <CheckCircle2 className="h-3.5 w-3.5 text-[hsl(var(--success))]" /> : <Circle className="h-3.5 w-3.5 text-muted-foreground/40" />}
                      </button>
                      <span className={cn("text-[11px] font-body truncate", task.status === "done" && "line-through text-muted-foreground/40")}>{task.title}</span>
                    </div>
                  ))}
                  {todayTasks.length === 0 && <p className="text-[10px] text-muted-foreground/30 font-body">No tasks today</p>}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-heading font-extrabold tracking-tight">
                <span className="text-gradient">Study OS</span>
              </h1>
              <p className="text-xs text-muted-foreground font-body mt-0.5">
                {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {streak > 0 && (
                <Badge variant="outline" className="gap-1 px-2.5 py-1 text-xs font-body border-[hsl(var(--streak))]/30 text-[hsl(var(--streak))]">
                  <Flame className="h-3 w-3" /> {streak}d
                </Badge>
              )}
              {totalFocusToday > 0 && (
                <Badge variant="outline" className="gap-1 px-2.5 py-1 text-xs font-body">
                  <Timer className="h-3 w-3" /> {formatTimeShort(totalFocusToday)}
                </Badge>
              )}
              <Button size="sm" onClick={() => startFocusSession("Quick Focus", "normal")}
                className="gap-1.5 text-xs font-body h-8 bg-gradient-to-r from-primary to-[hsl(280,60%,50%)]">
                <Zap className="h-3.5 w-3.5" /> Quick Focus
              </Button>
            </div>
          </div>

          {/* Active view */}
          <AnimatePresence mode="wait">
            <motion.div key={activeSystem} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              {activeSystem === "calendar" && renderCalendar()}
              {activeSystem === "tasks" && renderTasks()}
              {activeSystem === "habits" && renderHabits()}
              {activeSystem === "focus" && renderFocusLauncher()}
              {activeSystem === "analytics" && renderAnalytics()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Quick capture overlay */}
      <AnimatePresence>
        {quickCaptureOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/40 backdrop-blur-sm"
            onClick={() => setQuickCaptureOpen(false)}>
            <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
              className="w-full max-w-lg bg-card border border-border/40 rounded-2xl shadow-2xl p-4"
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3">
                <Plus className="h-5 w-5 text-primary shrink-0" />
                <Input value={quickCaptureText} onChange={e => setQuickCaptureText(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleQuickCapture(); if (e.key === "Escape") setQuickCaptureOpen(false); }}
                  placeholder='Type task... e.g. "submit assignment tomorrow at 5pm high priority"'
                  className="border-none bg-transparent text-base font-body shadow-none focus-visible:ring-0 p-0"
                  autoFocus />
              </div>
              <p className="text-[10px] text-muted-foreground/40 font-body mt-2 ml-8">
                Supports: today, tomorrow, next monday, at 5pm, high/low priority
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Event Modal */}
      <Dialog open={createEventOpen} onOpenChange={setCreateEventOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">New Event</DialogTitle>
            <DialogDescription className="font-body">Schedule a calendar event</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label className="font-body">Title</Label>
              <Input value={eventForm.title} onChange={e => setEventForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g., Study MAD1 Chapter 3" className="font-body bg-secondary/30 border-border/40" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="font-body">Date</Label>
                <Input type="date" value={eventForm.date} onChange={e => setEventForm(f => ({ ...f, date: e.target.value }))}
                  className="font-body bg-secondary/30 border-border/40" />
              </div>
              <div className="space-y-2">
                <Label className="font-body">Type</Label>
                <Select value={eventForm.eventType} onValueChange={(v: EventType) => setEventForm(f => ({ ...f, eventType: v }))}>
                  <SelectTrigger className="font-body bg-secondary/30 border-border/40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(["study", "assignment", "exam", "lecture", "meeting", "personal", "break", "custom"] as EventType[]).map(t => (
                      <SelectItem key={t} value={t} className="capitalize font-body">{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="font-body">Start</Label>
                <Input type="time" value={eventForm.startTime} onChange={e => setEventForm(f => ({ ...f, startTime: e.target.value }))}
                  className="font-body bg-secondary/30 border-border/40" />
              </div>
              <div className="space-y-2">
                <Label className="font-body">End</Label>
                <Input type="time" value={eventForm.endTime} onChange={e => setEventForm(f => ({ ...f, endTime: e.target.value }))}
                  className="font-body bg-secondary/30 border-border/40" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={eventForm.focusModeEnabled}
                onCheckedChange={(v) => setEventForm(f => ({ ...f, focusModeEnabled: !!v }))} id="focus-mode" />
              <Label htmlFor="focus-mode" className="font-body text-sm">Enable Focus Mode</Label>
            </div>
            {eventForm.focusModeEnabled && (
              <Select value={eventForm.focusMode} onValueChange={(v: "strict" | "normal") => setEventForm(f => ({ ...f, focusMode: v }))}>
                <SelectTrigger className="font-body bg-secondary/30 border-border/40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal" className="font-body">Normal Mode</SelectItem>
                  <SelectItem value="strict" className="font-body">Strict Mode 🔒</SelectItem>
                </SelectContent>
              </Select>
            )}
            <div className="space-y-2">
              <Label className="font-body">Description</Label>
              <Textarea value={eventForm.description} onChange={e => setEventForm(f => ({ ...f, description: e.target.value }))}
                rows={2} className="font-body bg-secondary/30 border-border/40 resize-none" />
            </div>
            <Button onClick={handleCreateEvent} className="w-full font-body gap-2 bg-gradient-to-r from-primary to-[hsl(280,60%,50%)]">
              <Plus className="h-4 w-4" /> Create Event
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Task Modal */}
      <Dialog open={createTaskOpen} onOpenChange={setCreateTaskOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">New Task</DialogTitle>
            <DialogDescription className="font-body">Add a task to your list</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label className="font-body">Title</Label>
              <Input value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))}
                placeholder="What needs to be done?" className="font-body bg-secondary/30 border-border/40" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="font-body">Due Date</Label>
                <Input type="date" value={taskForm.dueDate} onChange={e => setTaskForm(f => ({ ...f, dueDate: e.target.value }))}
                  className="font-body bg-secondary/30 border-border/40" />
              </div>
              <div className="space-y-2">
                <Label className="font-body">Priority</Label>
                <Select value={taskForm.priority} onValueChange={(v: Priority) => setTaskForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger className="font-body bg-secondary/30 border-border/40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(["none", "low", "medium", "high", "urgent"] as Priority[]).map(p => (
                      <SelectItem key={p} value={p} className="capitalize font-body">{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="font-body">Duration (min)</Label>
                <Input type="number" value={taskForm.estimatedDuration}
                  onChange={e => setTaskForm(f => ({ ...f, estimatedDuration: parseInt(e.target.value) || 30 }))}
                  className="font-body bg-secondary/30 border-border/40" />
              </div>
              <div className="space-y-2">
                <Label className="font-body">Energy</Label>
                <Select value={taskForm.energyLevel} onValueChange={(v: EnergyLevel) => setTaskForm(f => ({ ...f, energyLevel: v }))}>
                  <SelectTrigger className="font-body bg-secondary/30 border-border/40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(["low", "medium", "high"] as EnergyLevel[]).map(e => (
                      <SelectItem key={e} value={e} className="capitalize font-body">{e}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="font-body">Description</Label>
              <Textarea value={taskForm.description} onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))}
                rows={2} className="font-body bg-secondary/30 border-border/40 resize-none" />
            </div>
            <Button onClick={handleCreateTask} className="w-full font-body gap-2 bg-gradient-to-r from-primary to-[hsl(280,60%,50%)]">
              <Plus className="h-4 w-4" /> Create Task
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Habit Modal */}
      <Dialog open={createHabitOpen} onOpenChange={setCreateHabitOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading">New Habit</DialogTitle>
            <DialogDescription className="font-body">Build your daily routine</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="font-body">Name</Label>
              <Input value={habitForm.name} onChange={e => setHabitForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g., Read 30 minutes" className="font-body bg-secondary/30 border-border/40" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="font-body">Icon</Label>
                <Input value={habitForm.icon} onChange={e => setHabitForm(f => ({ ...f, icon: e.target.value }))}
                  className="font-body bg-secondary/30 border-border/40 text-center text-xl" maxLength={2} />
              </div>
              <div className="space-y-2">
                <Label className="font-body">Time</Label>
                <Select value={habitForm.timeOfDay} onValueChange={(v: Habit["timeOfDay"]) => setHabitForm(f => ({ ...f, timeOfDay: v }))}>
                  <SelectTrigger className="font-body bg-secondary/30 border-border/40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(["morning", "afternoon", "evening", "anytime"] as const).map(t => (
                      <SelectItem key={t} value={t} className="capitalize font-body">{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleCreateHabit} className="w-full font-body gap-2 bg-gradient-to-r from-primary to-[hsl(280,60%,50%)]">
              <Plus className="h-4 w-4" /> Create Habit
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Event Drawer */}
      <Sheet open={!!drawerEvent} onOpenChange={() => setDrawerEvent(null)}>
        <SheetContent className="w-full sm:max-w-md">
          {drawerEvent && (
            <>
              <SheetHeader>
                <SheetTitle className="font-heading">{drawerEvent.title}</SheetTitle>
              </SheetHeader>
              <div className="space-y-4 mt-4">
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs font-body capitalize">{drawerEvent.eventType}</Badge>
                  {drawerEvent.focusModeEnabled && (
                    <Badge variant="outline" className="text-xs font-body gap-1 border-primary/30 text-primary">
                      <Zap className="h-2.5 w-2.5" /> Focus {drawerEvent.focusMode}
                    </Badge>
                  )}
                </div>
                <div className="space-y-2 text-sm font-body">
                  <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span>{drawerEvent.startTime.slice(0, 10)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Time</span><span>{drawerEvent.startTime.slice(11, 16)} - {drawerEvent.endTime.slice(11, 16)}</span></div>
                  {drawerEvent.locationOrUrl && <div className="flex justify-between"><span className="text-muted-foreground">Location</span><span className="truncate ml-4">{drawerEvent.locationOrUrl}</span></div>}
                </div>
                {drawerEvent.description && <p className="text-sm text-muted-foreground font-body">{drawerEvent.description}</p>}
                {drawerEvent.focusModeEnabled && (
                  <div className="space-y-2 pt-2">
                    <Button onClick={() => { startFocusSession(drawerEvent.title, "normal", undefined, drawerEvent.id, 60); setDrawerEvent(null); }}
                      className="w-full font-body gap-2"><Play className="h-4 w-4" /> Start Session</Button>
                    <Button onClick={() => { startFocusSession(drawerEvent.title, "strict", undefined, drawerEvent.id, 60); setDrawerEvent(null); }}
                      variant="outline" className="w-full font-body gap-2 border-primary/30 text-primary"><Lock className="h-4 w-4" /> Strict Mode</Button>
                  </div>
                )}
                <Button variant="ghost" size="sm" className="w-full text-destructive font-body gap-2"
                  onClick={() => { deleteEvent(drawerEvent.id); setDrawerEvent(null); }}>
                  <Trash2 className="h-4 w-4" /> Delete Event
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* FAB */}
      {!activeSession && (
        <button onClick={() => activeSystem === "calendar" ? setCreateEventOpen(true) : activeSystem === "tasks" ? setCreateTaskOpen(true) : activeSystem === "habits" ? setCreateHabitOpen(true) : startFocusSession("Quick Focus", "normal")}
          className="fixed bottom-20 md:bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-gradient-to-br from-primary to-[hsl(280,60%,50%)] text-primary-foreground shadow-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all btn-premium-glow">
          <Plus className="h-6 w-6" />
        </button>
      )}
    </Layout>
  );
};

export default StudyMode;