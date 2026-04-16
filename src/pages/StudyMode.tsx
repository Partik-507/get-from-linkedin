import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar";
import { CalendarView, type CalViewEvent, type CalendarViewHandle, MiniCalendar, CalendarList } from "@/components/CalendarView";
import { Layout } from "@/components/Layout";
import { FocusSessionComplete } from "@/components/FocusSessionComplete";
import { TimeWheelPicker } from "@/components/TimeWheelPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Calendar as CalendarWidget } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays, CheckSquare, Flame, Zap, BarChart3,
  ChevronLeft, ChevronRight, Search, Clock,
  Plus, MoreHorizontal, Trash2, Edit2, Play, Pause, X,
  Square, Volume2, Image, Maximize, Minimize,
  Sun, Moon, CloudRain, Coffee, TreePine, Waves,
  Music, Headphones, ArrowRight, GripVertical,
  Inbox, FolderKanban, CalendarRange, Circle,
  Heart, Target, TrendingUp, AlertTriangle, Menu, PanelLeftClose,
} from "lucide-react";
import {
  format, startOfWeek, endOfWeek, addDays, addWeeks, subWeeks,
  startOfMonth, endOfMonth, addMonths, subMonths,
  isSameDay, isSameMonth, isToday, setHours, setMinutes,
  differenceInMinutes, startOfDay, addHours, getHours, getMinutes,
  eachDayOfInterval, subDays, parseISO,
} from "date-fns";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line, Tooltip as RechartsTooltip, CartesianGrid } from "recharts";

// ============ TYPES ============
interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  color: string;
  allDay?: boolean;
  description?: string;
  location?: string;
  calendarId?: string;
  recurrence?: string;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  dueTime?: string;
  priority: "none" | "low" | "medium" | "high" | "urgent";
  status: "todo" | "in-progress" | "done" | "cancelled";
  project?: string;
  tags?: string[];
  estimatedMinutes?: number;
  energy?: "low" | "medium" | "high";
  subtasks?: { id: string; title: string; done: boolean }[];
  createdAt?: string;
}

interface Habit {
  id: string;
  name: string;
  emoji: string;
  color: string;
  frequency: "daily" | "weekly";
  timeOfDay: "morning" | "afternoon" | "evening" | "anytime";
  streak: number;
  createdAt?: string;
}

interface FocusSession {
  id: string;
  duration: number;
  mode: "normal" | "strict";
  date: string;
  startTime?: string;
  mood?: number;
  note?: string;
  abandoned?: boolean;
  soundscape?: string;
  taskId?: string;
}

// ============ CONSTANTS ============
const EVENT_COLORS = ["#7c3aed", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#06b6d4", "#8b5cf6"];
const PRIORITY_COLORS: Record<string, string> = {
  urgent: "#ef4444", high: "#f97316", medium: "#eab308", low: "#3b82f6", none: "#6b7280",
};
const HABIT_COLORS = ["#7c3aed", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#06b6d4", "#f97316"];

const MOTIVATIONAL_MESSAGES = [
  "You started this for a reason. The reason has not changed.",
  "The people who master discomfort will master their domain.",
  "Every minute you stay is a vote for the person you are becoming.",
  "Comfort is the enemy of achievement. Stay.",
  "Discipline is choosing between what you want now and what you want most.",
  "The pain of discipline weighs ounces. The pain of regret weighs tons.",
  "You don't have to feel like it. You just have to do it.",
  "Winners embrace hard work. They love the discipline of it.",
  "The difference between who you are and who you want to be is what you do.",
  "Success is nothing more than a few simple disciplines practiced every day.",
  "Your future self is watching you right now through memories.",
  "The only way to guarantee failure is to quit.",
  "Hard choices, easy life. Easy choices, hard life.",
  "You are one session away from a better mood.",
  "Showing up is 90% of success. You already showed up.",
  "The grind is the glory. Stay in it.",
  "This moment of resistance is exactly where growth happens.",
  "Champions don't show up to get everything they want. They show up to give everything they have.",
  "If it were easy, everyone would do it. That's why it matters.",
  "The mountain doesn't care if you're tired. Keep climbing.",
  "Greatness is not born. It is built. Session by session.",
  "Your commitment is being tested. Pass the test.",
  "The person you admire most didn't quit when it got hard.",
  "Right now, your competitors are studying. Will you stop?",
  "This discomfort is temporary. Regret is permanent.",
  "You don't need motivation. You need discipline.",
  "Be stronger than your excuses.",
  "The sessions you don't want to do are the ones that matter most.",
  "Consistency beats intensity. Stay consistent.",
  "Small daily improvements lead to stunning long-term results.",
  "Your brain is lying to you. You can keep going.",
  "Average people quit. You are not average.",
  "This is where ordinary people stop and extraordinary people keep going.",
  "Imagine how you'll feel after completing this session.",
  "Discipline equals freedom. This session is your freedom.",
  "The best time to quit was before you started. You already started.",
  "What you do today determines who you'll be tomorrow.",
  "Fall in love with the process, and the results will come.",
  "Pain is weakness leaving the body. Discomfort is mediocrity leaving the mind.",
  "You've survived 100% of your worst days. This session is nothing.",
];

const SOUNDSCAPES = [
  { id: "lofi", name: "Lo-fi beats", icon: Music },
  { id: "brown", name: "Brown noise", icon: Headphones },
  { id: "rain", name: "Rain", icon: CloudRain },
  { id: "cafe", name: "Café", icon: Coffee },
  { id: "forest", name: "Forest", icon: TreePine },
  { id: "ocean", name: "Ocean", icon: Waves },
  { id: "binaural", name: "Binaural", icon: Headphones },
  { id: "classical", name: "Classical", icon: Music },
];

const WALLPAPER_PRESETS = [
  { id: "dark-abstract", name: "Dark Abstract", gradient: "linear-gradient(135deg, #0a0a1a 0%, #1a0a2e 50%, #0a1a2e 100%)" },
  { id: "deep-purple", name: "Deep Purple", gradient: "linear-gradient(135deg, #1a0533 0%, #2d1b69 50%, #0d0221 100%)" },
  { id: "midnight", name: "Midnight Blue", gradient: "linear-gradient(135deg, #020024 0%, #090979 50%, #00d4ff 100%)" },
  { id: "forest-night", name: "Forest Night", gradient: "linear-gradient(135deg, #0a1a0a 0%, #1a3a1a 50%, #0a2a1a 100%)" },
  { id: "sunset", name: "Warm Sunset", gradient: "linear-gradient(135deg, #1a0a0a 0%, #4a1a1a 50%, #2a0a2a 100%)" },
  { id: "cosmos", name: "Cosmos", gradient: "linear-gradient(135deg, #000428 0%, #004e92 50%, #000428 100%)" },
];

// ============ HELPER: NLP TASK PARSING ============
function parseNaturalLanguageTask(input: string): Partial<Task> {
  const result: Partial<Task> = { title: input, priority: "none" };
  const priorities = ["urgent", "high", "medium", "low"];
  for (const p of priorities) {
    if (input.toLowerCase().includes(p)) {
      result.priority = p as Task["priority"];
      result.title = input.replace(new RegExp(`\\s*${p}\\s*`, "i"), " ").trim();
      break;
    }
  }
  const tomorrow = /tomorrow/i;
  const todayRe = /today/i;
  const timeRe = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i;

  if (tomorrow.test(input)) {
    const d = addDays(new Date(), 1);
    result.dueDate = format(d, "yyyy-MM-dd");
    result.title = (result.title || "").replace(tomorrow, "").trim();
  } else if (todayRe.test(input)) {
    result.dueDate = format(new Date(), "yyyy-MM-dd");
    result.title = (result.title || "").replace(todayRe, "").trim();
  }

  const tm = timeRe.exec(input);
  if (tm) {
    let h = parseInt(tm[1]);
    const m = tm[2] ? parseInt(tm[2]) : 0;
    if (tm[3].toLowerCase() === "pm" && h < 12) h += 12;
    if (tm[3].toLowerCase() === "am" && h === 12) h = 0;
    result.dueTime = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    result.title = (result.title || "").replace(timeRe, "").trim();
  }

  result.title = (result.title || "").replace(/\s+/g, " ").trim();
  return result;
}

// ============ MAIN COMPONENT ============
const StudyMode = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  // Layout state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    try { return parseInt(localStorage.getItem("vv_study_sidebar_width") || "220", 10); } catch { return 220; }
  });
  const [isResizing, setIsResizing] = useState(false);
  const [activeSection, setActiveSection] = useState<"calendar" | "tasks" | "habits" | "focus" | "analytics">("calendar");
  const [searchQuery, setSearchQuery] = useState("");

  // Calendar state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState<"day" | "week" | "month" | "year" | "agenda">("week");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [quickCreateSlot, setQuickCreateSlot] = useState<{ date: Date; hour: number } | null>(null);
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventColor, setNewEventColor] = useState(EVENT_COLORS[0]);
  const [newEventAllDay, setNewEventAllDay] = useState(false);
  const [newEventStart, setNewEventStart] = useState("");
  const [newEventEnd, setNewEventEnd] = useState("");
  const [newEventDesc, setNewEventDesc] = useState("");
  const [newEventLocation, setNewEventLocation] = useState("");
  const [newEventRecurrence, setNewEventRecurrence] = useState("none");
  const [showWeekends, setShowWeekends] = useState(true);
  const [viewDropdownOpen, setViewDropdownOpen] = useState(false);

  const [showHolidays, setShowHolidays] = useState(true);
  const calendarRef = useRef<CalendarViewHandle>(null);

  // Task state
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskView, setTaskView] = useState<"today" | "inbox" | "projects" | "upcoming">("today");
  const [showQuickCapture, setShowQuickCapture] = useState(false);
  const [quickCaptureInput, setQuickCaptureInput] = useState("");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");

  // Habit state
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitLogs, setHabitLogs] = useState<Record<string, Record<string, boolean>>>({});
  const [showNewHabit, setShowNewHabit] = useState(false);
  const [newHabitName, setNewHabitName] = useState("");
  const [newHabitEmoji, setNewHabitEmoji] = useState("📚");
  const [newHabitColor, setNewHabitColor] = useState(HABIT_COLORS[0]);
  const [showDailyCheckIn, setShowDailyCheckIn] = useState(false);

  // Focus state
  const [focusActive, setFocusActive] = useState(false);
  const [focusDuration, setFocusDuration] = useState(25);
  const [focusMode, setFocusMode] = useState<"normal" | "strict">("normal");
  const [focusTimeLeft, setFocusTimeLeft] = useState(0);
  const [focusPaused, setFocusPaused] = useState(false);
  const [showQuickFocus, setShowQuickFocus] = useState(false);
  const [soundscape, setSoundscape] = useState("lofi");
  const [wallpaper, setWallpaper] = useState("dark-abstract");
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>([]);
  const [showStrictExit, setShowStrictExit] = useState(false);
  const [strictCountdown, setStrictCountdown] = useState(15);
  const [showBreak, setShowBreak] = useState(false);
  const [showPostSession, setShowPostSession] = useState(false);
  const [sessionMood, setSessionMood] = useState(0);
  const [sessionNote, setSessionNote] = useState("");
  const [timerStyle, setTimerStyle] = useState<"digits" | "ring" | "flip">("digits");
  const [controlsVisible, setControlsVisible] = useState(true);
  const mouseTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const focusTimerRef = useRef<ReturnType<typeof setInterval>>();
  const [breathPhase, setBreathPhase] = useState<"inhale" | "exhale">("inhale");
  const [motMessageIndex] = useState(() => Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length));

  const todayStr = format(new Date(), "yyyy-MM-dd");

  // ── Google Calendar integration ────────────────────────────────────────
  // Compute a date range for the current view (±3 months)
  const gcalRangeStart = useMemo(() => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() - 1);
    d.setDate(1);
    return d;
  }, [currentDate]);
  const gcalRangeEnd = useMemo(() => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() + 2);
    d.setDate(0);
    return d;
  }, [currentDate]);

  const {
    connectionState: gcalState,
    calendarStatus: gcalStatus,
    googleEvents,
    isSyncing: gcalSyncing,
    lastSyncedAt: gcalLastSync,
    connect: gcalConnect,
    disconnect: gcalDisconnect,
    refetch: gcalRefetch,
    createEvent: gcalCreateEvent,
    deleteEvent: gcalDeleteEvent,
  } = useGoogleCalendar({
    uid: user?.uid ?? null,
    rangeStart: gcalRangeStart,
    rangeEnd: gcalRangeEnd,
  });



  // Handle redirect back from Google OAuth (URL param gcal=connected)
  useEffect(() => {
    if (searchParams.get("gcal") === "connected") {
      setActiveSection("calendar");
    }
  }, [searchParams]);



  useEffect(() => {
    document.title = "Study OS — VivaVault";
    const lastCheckIn = localStorage.getItem("vv_last_checkin");
    if (lastCheckIn !== todayStr && habits.length > 0) {
      setShowDailyCheckIn(true);
    }
  }, [todayStr, habits.length]);

  // Load data from Firestore
  useEffect(() => {
    if (!user) return;
    const loadData = async () => {
      try {
        const [evSnap, taskSnap, habitSnap, focusSnap] = await Promise.all([
          getDocs(collection(db, "users", user.uid, "calendarEvents")),
          getDocs(collection(db, "users", user.uid, "tasks")),
          getDocs(collection(db, "users", user.uid, "habits")),
          getDocs(collection(db, "users", user.uid, "focusSessions")),
        ]);
        setEvents(evSnap.docs.map(d => {
          const data = d.data();
          return {
            id: d.id, title: data.title,
            start: data.start?.toDate?.() || new Date(data.start),
            end: data.end?.toDate?.() || new Date(data.end),
            color: data.color || EVENT_COLORS[0],
            allDay: data.allDay || false, description: data.description || "",
            location: data.location || "", recurrence: data.recurrence || "none",
          };
        }));
        setTasks(taskSnap.docs.map(d => ({ id: d.id, ...d.data() } as Task)));
        setHabits(habitSnap.docs.map(d => ({ id: d.id, ...d.data() } as Habit)));
        setFocusSessions(focusSnap.docs.map(d => ({ id: d.id, ...d.data() } as FocusSession)));
        
        const logSnap = await getDoc(doc(db, "users", user.uid, "habitLogs", todayStr));
        if (logSnap.exists()) {
          setHabitLogs(prev => ({ ...prev, [todayStr]: logSnap.data() as Record<string, boolean> }));
        }
      } catch (e) {
        console.error("Failed to load Study OS data:", e);
      }
    };
    loadData();
  }, [user, todayStr]);

  // Persist sidebar width
  useEffect(() => {
    localStorage.setItem("vv_study_sidebar_width", sidebarWidth.toString());
  }, [sidebarWidth]);

  // Resizable sidebar drag
  useEffect(() => {
    if (!isResizing) return;
    const handleMouseMove = (e: MouseEvent) => {
      let w = e.clientX - 8;
      if (w < 180) w = 180;
      if (w > 480) w = 480;
      setSidebarWidth(w);
    };
    const handleMouseUp = () => { setIsResizing(false); document.body.style.cursor = "default"; };
    document.body.style.cursor = "col-resize";
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => { document.removeEventListener("mousemove", handleMouseMove); document.removeEventListener("mouseup", handleMouseUp); document.body.style.cursor = "default"; };
  }, [isResizing]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (focusActive) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const keyMap: Record<string, typeof activeSection> = { "1": "calendar", "2": "tasks", "3": "habits", "4": "focus", "5": "analytics" };
      if (keyMap[e.key]) { setActiveSection(keyMap[e.key]); setMobileDrawerOpen(false); }
      if (e.key === "t" || e.key === "T") { e.preventDefault(); setShowQuickCapture(true); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [focusActive]);

  // Focus timer
  useEffect(() => {
    if (!focusActive || focusPaused) return;
    focusTimerRef.current = setInterval(() => {
      setFocusTimeLeft(prev => {
        if (prev <= 1) { clearInterval(focusTimerRef.current!); handleFocusComplete(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(focusTimerRef.current!);
  }, [focusActive, focusPaused]);

  // Auto-hide controls in focus mode
  useEffect(() => {
    if (!focusActive) return;
    const handleMouseMove = () => {
      setControlsVisible(true);
      clearTimeout(mouseTimerRef.current);
      mouseTimerRef.current = setTimeout(() => setControlsVisible(false), 3000);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => { window.removeEventListener("mousemove", handleMouseMove); clearTimeout(mouseTimerRef.current); };
  }, [focusActive]);

  // Strict exit countdown
  useEffect(() => {
    if (!showStrictExit || strictCountdown <= 0) return;
    const t = setTimeout(() => setStrictCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [showStrictExit, strictCountdown]);

  // Break breathing
  useEffect(() => {
    if (!showBreak) return;
    const t = setInterval(() => setBreathPhase(prev => prev === "inhale" ? "exhale" : "inhale"), 5000);
    return () => clearInterval(t);
  }, [showBreak]);

  // ============ COMPUTED ============
  const todayTasks = useMemo(() => tasks.filter(t => t.dueDate === todayStr && t.status !== "done"), [tasks, todayStr]);
  const overdueTasks = useMemo(() => tasks.filter(t => t.dueDate && t.dueDate < todayStr && t.status !== "done"), [tasks, todayStr]);
  const inboxTasks = useMemo(() => tasks.filter(t => !t.dueDate && t.status !== "done"), [tasks]);
  const todayFocusMinutes = useMemo(() => focusSessions.filter(s => s.date === todayStr && !s.abandoned).reduce((sum, s) => sum + (s.duration || 0), 0), [focusSessions, todayStr]);
  const currentStreak = useMemo(() => {
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = format(subDays(today, i), "yyyy-MM-dd");
      if (focusSessions.some(s => s.date === d && !s.abandoned) || tasks.some(t => t.dueDate === d && t.status === "done")) streak++;
      else if (i > 0) break;
    }
    return streak;
  }, [focusSessions, tasks]);


  // ============ HANDLERS ============

  // Bridge for CalendarView's CreateEventData shape
  const handleCreateEventFromModal = async (data: { title: string; start: Date; end: Date; allDay: boolean; color: string; description: string; location: string; recurrence: string; }) => {
    if (!user) return;
    const eventData = { title: data.title, start: data.start, end: data.end, color: data.color, allDay: data.allDay, description: data.description, location: data.location, recurrence: data.recurrence };
    try {
      if (gcalState === "connected") {
        await gcalCreateEvent({ summary: data.title, description: data.description, location: data.location, start: data.start, end: data.end, allDay: data.allDay });
        toast.success("Event added to Google Calendar");
        return;
      }
      const ref = await addDoc(collection(db, "users", user.uid, "calendarEvents"), eventData);
      setEvents(prev => [...prev, { ...eventData, id: ref.id }]);
      toast.success("Event created");
    } catch { toast.error("Failed to create event"); }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!user) return;
    try {
      // Check if this is a Google Calendar event (id starts with "gcal_")
      if (eventId.startsWith("gcal_")) {
        const googleEventId = eventId.replace("gcal_", "");
        await gcalDeleteEvent(googleEventId);
        toast.success("Event removed from Google Calendar");
        return;
      }
      // Local Firestore event
      await deleteDoc(doc(db, "users", user.uid, "calendarEvents", eventId));
      setEvents(prev => prev.filter(e => e.id !== eventId));
      toast.success("Event deleted");
    } catch { toast.error("Failed to delete event"); }
  };

  const handleCreateTask = async (parsed?: Partial<Task>) => {
    if (!user) return;
    const taskData: Omit<Task, "id"> = { title: parsed?.title || newTaskTitle || "Untitled task", priority: parsed?.priority || "none", status: "todo", dueDate: parsed?.dueDate, dueTime: parsed?.dueTime, createdAt: new Date().toISOString() };
    try {
      const ref = await addDoc(collection(db, "users", user.uid, "tasks"), taskData);
      setTasks(prev => [...prev, { ...taskData, id: ref.id }]);
      setNewTaskTitle(""); setQuickCaptureInput(""); setShowQuickCapture(false);
      toast.success("Task added");
    } catch { toast.error("Failed to create task"); }
  };

  const handleToggleTask = async (taskId: string) => {
    if (!user) return;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const newStatus = task.status === "done" ? "todo" : "done";
    try { await updateDoc(doc(db, "users", user.uid, "tasks", taskId), { status: newStatus }); setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t)); } catch { toast.error("Failed to update task"); }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!user) return;
    try { await deleteDoc(doc(db, "users", user.uid, "tasks", taskId)); setTasks(prev => prev.filter(t => t.id !== taskId)); toast.success("Task deleted"); } catch { toast.error("Failed to delete task"); }
  };

  const handleCreateHabit = async () => {
    if (!user || !newHabitName.trim()) return;
    const habitData = { name: newHabitName, emoji: newHabitEmoji, color: newHabitColor, frequency: "daily" as const, timeOfDay: "anytime" as const, streak: 0 };
    try { const ref = await addDoc(collection(db, "users", user.uid, "habits"), habitData); setHabits(prev => [...prev, { ...habitData, id: ref.id }]); setNewHabitName(""); setShowNewHabit(false); toast.success("Habit created"); } catch { toast.error("Failed to create habit"); }
  };

  const handleToggleHabit = async (habitId: string) => {
    if (!user) return;
    const currentLogs = habitLogs[todayStr] || {};
    const updatedLogs = { ...currentLogs, [habitId]: !currentLogs[habitId] };
    try { await setDoc(doc(db, "users", user.uid, "habitLogs", todayStr), updatedLogs, { merge: true }); setHabitLogs(prev => ({ ...prev, [todayStr]: updatedLogs })); if (!currentLogs[habitId]) toast.success("Habit logged! 🎉"); } catch { toast.error("Failed to log habit"); }
  };

  const startFocusSession = () => {
    setFocusTimeLeft(focusDuration * 60); setFocusActive(true); setFocusPaused(false); setShowQuickFocus(false); setControlsVisible(true);
    try { document.documentElement.requestFullscreen?.(); } catch {}
  };

  const handleFocusComplete = async () => {
    setFocusActive(false);
    try { document.exitFullscreen?.(); } catch {}
    if (user) setShowPostSession(true);
  };

  const saveFocusSessionData = async (mood: number, note: string) => {
    if (!user) return;
    const sessionData = { duration: focusDuration, mode: focusMode, date: todayStr, mood, note, abandoned: false, soundscape };
    try { const ref = await addDoc(collection(db, "users", user.uid, "focusSessions"), sessionData); setFocusSessions(prev => [...prev, { ...sessionData, id: ref.id }]); setShowPostSession(false); setSessionMood(0); setSessionNote(""); toast.success("Session saved! Great work 🎉"); } catch { toast.error("Failed to save session"); }
  };

  const handleStrictExit = () => {
    if (focusMode === "strict") { setShowStrictExit(true); setStrictCountdown(15); }
    else { setFocusActive(false); try { document.exitFullscreen?.(); } catch {} handleFocusComplete(); }
  };

  const forceEndSession = async () => {
    setShowStrictExit(false); setFocusActive(false);
    try { document.exitFullscreen?.(); } catch {}
    if (!user) return;
    try { const ref = await addDoc(collection(db, "users", user.uid, "focusSessions"), { duration: focusDuration, mode: focusMode, date: todayStr, abandoned: true, soundscape }); setFocusSessions(prev => [...prev, { duration: focusDuration, mode: focusMode, date: todayStr, abandoned: true, soundscape, id: ref.id }]); toast("Session ended early"); } catch {}
  };

  const formatTime = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;


  const SECTION_TABS = [
    { id: "calendar" as const, icon: CalendarDays, label: "Calendar", shortcut: "1" },
    { id: "tasks" as const, icon: CheckSquare, label: "Tasks", shortcut: "2" },
    { id: "habits" as const, icon: Flame, label: "Habits", shortcut: "3" },
    { id: "focus" as const, icon: Zap, label: "Focus", shortcut: "4" },
    { id: "analytics" as const, icon: BarChart3, label: "Analytics", shortcut: "5" },
  ];

  // Analytics data
  const heatmapData = useMemo(() => {
    const data: { date: string; minutes: number; sessions: number }[] = [];
    const today = new Date();
    for (let i = 364; i >= 0; i--) {
      const d = format(subDays(today, i), "yyyy-MM-dd");
      const ds = focusSessions.filter(s => s.date === d && !s.abandoned);
      data.push({ date: d, minutes: ds.reduce((sum, s) => sum + (s.duration || 0), 0), sessions: ds.length });
    }
    return data;
  }, [focusSessions]);

  const dailyPatterns = useMemo(() => Array.from({ length: 24 }, (_, h) => ({ hour: h, label: h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`, avgMinutes: Math.round(Math.random() * 30) })), []);

  const taskCompletionData = useMemo(() => {
    return Array.from({ length: 8 }, (_, i) => {
      const ws = subWeeks(new Date(), 7 - i);
      return { week: format(ws, "MMM d"), created: Math.round(Math.random() * 8 + 2), completed: Math.round(Math.random() * 6 + 1) };
    });
  }, []);

  const allCalendarEvents = useMemo<CalViewEvent[]>(() => [
    ...events.map(e => ({ ...e, source: "local" as const })),
    ...googleEvents.map(ge => ({
      id: ge.id,
      title: ge.title,
      start: ge.start,
      end: ge.end,
      color: ge.color,
      allDay: ge.allDay,
      description: ge.description,
      location: ge.location,
      recurrence: ge.recurrence,
      googleEventId: ge.googleEventId,
      source: (ge.source || "google") as CalViewEvent["source"],
    })),
  ], [events, googleEvents]);

  // ============ RENDER: CALENDAR ============
  const renderCalendar = () => {
    return (
      <CalendarView
        ref={calendarRef}
        events={allCalendarEvents}
        gcalState={gcalState}
        gcalStatus={gcalStatus}
        gcalSyncing={gcalSyncing}
        gcalLastSync={gcalLastSync}
        gcalConnected={gcalState === "connected"}
        onGcalConnect={gcalConnect}
        onGcalDisconnect={gcalDisconnect}
        onGcalRefetch={gcalRefetch}
        onCreateEvent={handleCreateEventFromModal}
        onDeleteEvent={handleDeleteEvent}
        onEditEvent={(ev) => setEditingEvent(ev as any)}
        currentDate={currentDate}
        onDateChange={setCurrentDate}
        showHolidays={showHolidays}
        onToggleHolidays={setShowHolidays}
      />
    );
  };

  // ============ RENDER: TASKS ============
  const renderTasks = () => {
    const taskViews = [
      { id: "today" as const, label: "Today", icon: Target },
      { id: "inbox" as const, label: "Inbox", icon: Inbox },
      { id: "projects" as const, label: "Projects", icon: FolderKanban },
      { id: "upcoming" as const, label: "Upcoming", icon: CalendarRange },
    ];
    let displayTasks: Task[] = [];
    switch (taskView) {
      case "today": displayTasks = [...overdueTasks, ...todayTasks]; break;
      case "inbox": displayTasks = inboxTasks; break;
      case "upcoming": displayTasks = tasks.filter(t => t.dueDate && t.dueDate > todayStr && t.status !== "done").sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || "")); break;
      default: displayTasks = tasks.filter(t => t.status !== "done");
    }

    return (
      <div className="flex-1 flex flex-col md:flex-row view-fade-enter">
        <div className="w-full md:w-48 border-b md:border-b-0 md:border-r border-border/50 p-2 md:p-3 flex md:flex-col overflow-x-auto scrollbar-none gap-2 shrink-0">
          {taskViews.map(v => (
            <button key={v.id} onClick={() => setTaskView(v.id)} className={cn("md:w-full shrink-0 flex items-center gap-2 px-3 py-1.5 md:py-2 rounded-full md:rounded-lg text-sm font-body transition-colors", taskView === v.id ? "bg-primary/10 text-primary font-medium shadow-sm" : "text-muted-foreground hover:bg-secondary/50 border border-border/50 md:border-none")}>
              <v.icon className="h-4 w-4 shrink-0" /><span>{v.label}</span>
              {v.id === "today" && todayTasks.length > 0 && <Badge variant="secondary" className="ml-0.5 md:ml-auto text-[10px] h-5 px-1.5">{todayTasks.length}</Badge>}
              {v.id === "inbox" && inboxTasks.length > 0 && <Badge variant="secondary" className="ml-0.5 md:ml-auto text-[10px] h-5 px-1.5">{inboxTasks.length}</Badge>}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-muted-foreground font-body">{displayTasks.length} tasks{taskView === "today" ? ` · est. ${Math.round(displayTasks.reduce((s, t) => s + (t.estimatedMinutes || 30), 0) / 60)}h` : ""}</p>
          </div>
          <div className="mb-4 flex gap-2">
            <Input placeholder='Add a task... press T anywhere' value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && newTaskTitle.trim()) { handleCreateTask(parseNaturalLanguageTask(newTaskTitle)); } }}
              className="h-9 text-sm font-body bg-secondary/30 border-border/30" />
            <Button size="sm" className="h-9 shrink-0" onClick={() => { if (newTaskTitle.trim()) handleCreateTask(parseNaturalLanguageTask(newTaskTitle)); }}><Plus className="h-3.5 w-3.5" /></Button>
          </div>
          {displayTasks.length === 0 ? (
            <div className="text-center py-12"><CheckSquare className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" /><p className="text-sm text-muted-foreground font-body">{taskView === "inbox" ? "Your inbox is clear. Press T to add a task." : "No tasks here."}</p></div>
          ) : (
            <div className="space-y-1">
              {taskView === "today" && overdueTasks.length > 0 && <p className="text-xs font-body font-medium text-destructive mb-2">Overdue ({overdueTasks.length})</p>}
              {displayTasks.map(task => (
                <motion.div key={task.id} layout initial={{ opacity: 0, y: 4 }} animate={{ opacity: task.status === "done" ? 0.5 : 1, y: 0 }}
                  className={cn("flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/30 transition-all group cursor-pointer", task.status === "done" && "line-through opacity-50")}
                  onClick={() => setSelectedTask(task)}>
                  <button className={cn("h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all", task.status === "done" ? "bg-primary border-primary" : "border-muted-foreground/40 hover:border-primary")}
                    onClick={(e) => { e.stopPropagation(); handleToggleTask(task.id); }}>
                    {task.status === "done" && <CheckSquare className="h-3 w-3 text-primary-foreground" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-body font-medium truncate">{task.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {task.dueTime && <span className="text-[10px] text-muted-foreground font-body">{task.dueTime}</span>}
                      {task.project && <Badge variant="outline" className="text-[9px] py-0 h-4">{task.project}</Badge>}
                    </div>
                  </div>
                  <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: PRIORITY_COLORS[task.priority] }} />
                  <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }}>
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ============ RENDER: HABITS ============
  const renderHabits = () => {
    const todayLogs = habitLogs[todayStr] || {};
    const last7 = Array.from({ length: 7 }, (_, i) => format(subDays(new Date(), 6 - i), "yyyy-MM-dd"));
    return (
      <div className="flex-1 overflow-y-auto p-6 view-fade-enter">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-heading font-bold">Habits</h2>
          <Button size="sm" className="h-8 gap-1 font-body text-xs" onClick={() => setShowNewHabit(true)}><Plus className="h-3.5 w-3.5" /> New Habit</Button>
        </div>
        {habits.length === 0 ? (
          <div className="text-center py-16"><Heart className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" /><p className="text-sm text-muted-foreground font-body">No habits yet. Build your first one.</p>
            <Button variant="outline" size="sm" className="mt-3 font-body text-xs" onClick={() => setShowNewHabit(true)}><Plus className="h-3 w-3 mr-1" /> Create Habit</Button></div>
        ) : (
          <div className="space-y-3">
            {habits.map(habit => (
              <div key={habit.id} className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border/50 hover:border-primary/20 transition-all">
                <div className="h-10 w-10 rounded-full flex items-center justify-center text-lg shrink-0" style={{ backgroundColor: `${habit.color}20` }}>{habit.emoji}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-body font-semibold">{habit.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">{(habit.streak || 0) >= 7 && <span className="text-xs">🔥</span>}<span className="text-xs text-muted-foreground font-body">{habit.streak || 0} day streak</span></div>
                </div>
                <div className="flex items-center gap-1.5">
                  {last7.map((dateStr, i) => {
                    const logs = habitLogs[dateStr] || {};
                    const done = logs[habit.id];
                    const isLast = i === 6;
                    return (
                      <button key={dateStr} onClick={() => isLast ? handleToggleHabit(habit.id) : undefined}
                        className={cn("rounded-full border-2 flex items-center justify-center transition-all", isLast ? "h-7 w-7 cursor-pointer" : "h-5 w-5", done ? "bg-primary border-primary" : "border-muted-foreground/30 hover:border-primary/50")}>
                        {done && <CheckSquare className={cn("text-primary-foreground", isLast ? "h-3.5 w-3.5" : "h-2.5 w-2.5")} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ============ RENDER: FOCUS ============
  const renderFocusSection = () => (
    <div className="flex-1 overflow-y-auto p-5 view-fade-enter">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-heading font-bold">Focus Engine</h2>
          <p className="text-xs text-muted-foreground font-body mt-0.5">Deep work sessions with soundscapes, wallpapers &amp; discipline tools.</p>
        </div>
        {focusSessions.length > 0 && (
          <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/10">
            <Zap className="h-3 w-3 text-primary" />
            <span className="text-xs font-body font-medium text-primary tabular-nums">{focusSessions.filter(s => !s.abandoned).length} sessions</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* ── Left column: Session launcher ── */}
        <div className="lg:col-span-3 space-y-4">

          {/* Launcher card */}
          <div className="vv-card p-5 bg-primary/[0.02]">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Zap className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-heading font-semibold">Start a Session</p>
                <p className="text-[11px] text-muted-foreground font-body">Choose duration and mode</p>
              </div>
            </div>

            {/* Duration presets */}
            <p className="text-xs font-body font-medium text-muted-foreground mb-2">Duration</p>
            <div className="flex gap-2 mb-3">
              {[25, 50, 90].map(d => (
                <button key={d} onClick={() => setFocusDuration(d)}
                  className={cn("flex-1 h-9 rounded-xl text-xs font-body font-medium transition-all border",
                    focusDuration === d
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-card border-border/50 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                  )}>
                  {d}m
                </button>
              ))}
              <input type="number" min={5} max={240} value={focusDuration}
                onChange={e => setFocusDuration(parseInt(e.target.value) || 25)}
                className="w-16 h-9 text-xs font-body text-center bg-card border border-border/50 rounded-xl outline-none focus:border-primary/50 text-foreground"
              />
            </div>

            {/* Mode selector */}
            <p className="text-xs font-body font-medium text-muted-foreground mb-2">Mode</p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {[{ id: "normal" as const, label: "Normal", desc: "Pause & exit freely", icon: "🌿" }, { id: "strict" as const, label: "Strict", desc: "Locked — exit penalty", icon: "🔒" }].map(m => (
                <button key={m.id} onClick={() => setFocusMode(m.id)}
                  className={cn("p-3 rounded-xl border-2 text-left transition-all",
                    focusMode === m.id ? "border-primary bg-primary/5" : "border-border/40 hover:border-primary/30"
                  )}>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm">{m.icon}</span>
                    <p className="text-xs font-body font-semibold">{m.label}</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground font-body">{m.desc}</p>
                </button>
              ))}
            </div>

            <Button className="w-full font-body gap-2 btn-premium" size="lg" onClick={() => setShowQuickFocus(true)}>
              <Zap className="h-4 w-4" /> Start Focus Session
            </Button>
          </div>

          {/* Recent sessions */}
          {focusSessions.length > 0 && (
            <div className="vv-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-heading font-semibold">Recent Sessions</h3>
              </div>
              <div className="space-y-1.5">
                {focusSessions.slice(-6).reverse().map(s => (
                  <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors">
                    <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center shrink-0", s.abandoned ? "bg-destructive/10" : "bg-[hsl(var(--success))]/10")}>
                      {s.abandoned ? <X className="h-3.5 w-3.5 text-destructive" /> : <Zap className="h-3.5 w-3.5 text-[hsl(var(--success))]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-body font-medium">{s.duration} min · <span className="text-muted-foreground capitalize">{s.mode}</span></p>
                      <p className="text-[10px] text-muted-foreground font-body">{s.date}</p>
                    </div>
                    {s.mood && <span className="text-sm shrink-0">{s.mood === 1 ? "😤" : s.mood === 2 ? "😊" : "🌊"}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Right column: Tools ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Today's stats */}
          <div className="vv-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Target className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-heading font-semibold">Today</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Focus time", value: `${Math.floor(todayFocusMinutes / 60)}h ${todayFocusMinutes % 60}m`, icon: Clock },
                { label: "Day streak", value: `${currentStreak}d`, icon: Flame },
                { label: "Tasks done", value: `${tasks.filter(t => t.dueDate === todayStr && t.status === "done").length}`, icon: CheckSquare },
                { label: "Total focus", value: `${focusSessions.filter(s => !s.abandoned).length} sessions`, icon: BarChart3 },
              ].map(stat => (
                <div key={stat.label} className="bg-secondary/30 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <stat.icon className="h-3 w-3 text-primary" />
                    <p className="text-[10px] text-muted-foreground font-body">{stat.label}</p>
                  </div>
                  <p className="text-sm font-heading font-bold tabular-nums">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Soundscape picker */}
          <div className="vv-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Volume2 className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-heading font-semibold">Soundscape</h3>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {SOUNDSCAPES.map(s => (
                <button key={s.id} onClick={() => setSoundscape(s.id)}
                  className={cn("flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-body transition-all",
                    soundscape === s.id ? "bg-primary/10 text-primary" : "hover:bg-secondary/50 text-muted-foreground hover:text-foreground"
                  )}>
                  <s.icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{s.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Wallpaper picker */}
          <div className="vv-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Image className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-heading font-semibold">Wallpaper</h3>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {WALLPAPER_PRESETS.map(wp => (
                <button key={wp.id} onClick={() => setWallpaper(wp.id)}
                  className={cn("h-12 rounded-xl transition-all", wallpaper === wp.id ? "ring-2 ring-primary ring-offset-2 ring-offset-card" : "opacity-70 hover:opacity-100")}
                  style={{ background: wp.gradient }}
                  title={wp.name}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ============ RENDER: ANALYTICS ============
  const renderAnalytics = () => {
    const completionRate = tasks.length > 0 ? Math.round((tasks.filter(t => t.status === "done").length / tasks.length) * 100) : 0;
    return (
      <div className="flex-1 overflow-y-auto p-6 space-y-6 view-fade-enter">
        {/* Focus Heatmap */}
        <div className="rounded-2xl border border-border/50 bg-card p-5">
          <h3 className="text-base font-heading font-bold mb-4 flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" /> Focus Heatmap</h3>
          <div className="overflow-x-auto">
            <div className="flex gap-[2px]">
              {(() => {
                const weeks: typeof heatmapData[] = [];
                let cw: typeof heatmapData = [];
                heatmapData.forEach((d, i) => { cw.push(d); if (new Date(d.date).getDay() === 6 || i === heatmapData.length - 1) { weeks.push(cw); cw = []; } });
                return weeks.map((week, wi) => (
                  <div key={wi} className="flex flex-col gap-[2px]">
                    {week.map(d => (
                      <Tooltip key={d.date}><TooltipTrigger asChild>
                        <div className="h-[14px] w-[14px] rounded-[3px] transition-colors" style={{ backgroundColor: d.minutes === 0 ? "hsla(var(--muted-foreground), 0.05)" : d.minutes <= 30 ? "hsla(263, 70%, 58%, 0.25)" : d.minutes <= 90 ? "hsla(263, 70%, 58%, 0.5)" : d.minutes <= 180 ? "hsla(263, 70%, 58%, 0.75)" : "hsl(263, 70%, 58%)" }} />
                      </TooltipTrigger><TooltipContent className="text-xs font-body">{format(new Date(d.date), "MMM d")} — {d.minutes}m, {d.sessions} sessions</TooltipContent></Tooltip>
                    ))}
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>

        {/* Daily Patterns */}
        <div className="rounded-2xl border border-border/50 bg-card p-5">
          <h3 className="text-base font-heading font-bold mb-4 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> Daily Focus Patterns</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyPatterns}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" interval={2} />
                <YAxis tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                <RechartsTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="avgMinutes" fill="hsl(263, 70%, 58%)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-muted-foreground font-body italic mt-2">Your peak focus hours are 9 AM to 11 AM. Schedule your hardest tasks then.</p>
        </div>

        {/* Task Completion Rate */}
        <div className="rounded-2xl border border-border/50 bg-card p-5">
          <h3 className="text-base font-heading font-bold mb-4 flex items-center gap-2"><Target className="h-4 w-4 text-primary" /> Task Completion Rate</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={taskCompletionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="week" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                <RechartsTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="created" fill="hsl(var(--muted-foreground))" radius={[3, 3, 0, 0]} name="Created" />
                <Bar dataKey="completed" fill="hsl(263, 70%, 58%)" radius={[3, 3, 0, 0]} name="Completed" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-3 mt-3">
            <span className="text-2xl font-heading font-bold">{completionRate}%</span>
            <span className="text-xs text-muted-foreground font-body">overall completion rate</span>
          </div>
          {completionRate < 60 && (
            <div className="mt-3 p-3 rounded-xl bg-[hsl(var(--warning))]/10 border border-[hsl(var(--warning))]/20">
              <p className="text-xs text-[hsl(var(--warning))] font-body flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5" />Your completion rate is low. Consider scheduling fewer tasks per day.</p>
            </div>
          )}
        </div>

        {/* Habit Consistency */}
        <div className="rounded-2xl border border-border/50 bg-card p-5">
          <h3 className="text-base font-heading font-bold mb-4 flex items-center gap-2"><Flame className="h-4 w-4 text-primary" /> Habit Consistency</h3>
          {habits.length === 0 ? <p className="text-sm text-muted-foreground font-body">No habits to track yet.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full"><thead><tr>
                <th className="text-left text-xs font-body text-muted-foreground pb-2 pr-4">Habit</th>
                {Array.from({ length: 8 }, (_, i) => <th key={i} className="text-center text-[9px] font-body text-muted-foreground pb-2 px-1">{format(subWeeks(new Date(), 7 - i), "MMM d")}</th>)}
              </tr></thead><tbody>
                {habits.map(habit => (
                  <tr key={habit.id}><td className="text-sm font-body py-1.5 pr-4">{habit.emoji} {habit.name}</td>
                    {Array.from({ length: 8 }, (_, i) => <td key={i} className="text-center py-1.5 px-1"><div className="h-6 w-6 mx-auto rounded-md" style={{ backgroundColor: `hsl(263, 70%, 58%, ${Math.random() * 0.8 + 0.1})` }} /></td>)}
                  </tr>
                ))}
              </tbody></table>
            </div>
          )}
        </div>

        {/* Session Quality */}
        <div className="rounded-2xl border border-border/50 bg-card p-5">
          <h3 className="text-base font-heading font-bold mb-4 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> Session Quality Trends</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={Array.from({ length: 30 }, (_, i) => ({ date: format(subDays(new Date(), 29 - i), "MMM d"), focus: Math.round(Math.random() * 120 + 30), mood: Math.round(Math.random() * 2 + 1) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 8 }} stroke="hsl(var(--muted-foreground))" interval={4} />
                <YAxis yAxisId="left" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" domain={[0, 3]} />
                <RechartsTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Line yAxisId="left" type="monotone" dataKey="focus" stroke="hsl(263, 70%, 58%)" strokeWidth={2} dot={false} name="Focus (min)" />
                <Line yAxisId="right" type="monotone" dataKey="mood" stroke="#f59e0b" strokeWidth={2} dot={false} name="Mood" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-muted-foreground font-body mt-2">Purple = focus time · Orange = mood rating (1-3)</p>
        </div>
      </div>
    );
  };

  // ============ FOCUS ENGINE FULLSCREEN ============
  if (focusActive) {
    const wp = WALLPAPER_PRESETS.find(w => w.id === wallpaper) || WALLPAPER_PRESETS[0];
    const progress = 1 - focusTimeLeft / (focusDuration * 60);
    return (
      <div className="fixed inset-0 z-[9999] animate-focus-fade" style={{ background: wp.gradient }}>
        <div className="absolute inset-0 bg-black/45" />
        {showBreak && (
          <div className="absolute inset-0 z-[10000] bg-black/80 flex items-center justify-center">
            <div className="text-center max-w-md">
              <motion.div animate={{ scale: breathPhase === "inhale" ? 1.5 : 1 }} transition={{ duration: breathPhase === "inhale" ? 4 : 6, ease: "easeInOut" }} className="h-32 w-32 rounded-full bg-primary/30 mx-auto mb-6 flex items-center justify-center">
                <span className="text-sm font-body text-primary-foreground">{breathPhase === "inhale" ? "Inhale" : "Exhale"}</span>
              </motion.div>
              <p className="text-lg font-body text-foreground/80 mb-6">Take a moment to breathe and reset.</p>
              {focusMode !== "strict" && <Button variant="outline" size="sm" onClick={() => { setShowBreak(false); setFocusPaused(false); }}>Skip Break</Button>}
              <Button className="ml-3" onClick={() => { setShowBreak(false); setFocusPaused(false); }}>Continue Session</Button>
            </div>
          </div>
        )}
        {showStrictExit && (
          <div className="absolute inset-0 z-[10001] bg-black/90 flex items-center justify-center">
            <div className="text-center max-w-lg p-8">
              <p className="text-6xl font-heading font-bold text-foreground mb-6 tabular-nums">{strictCountdown}</p>
              <p className="text-lg font-body text-foreground/80 mb-8 leading-relaxed">{MOTIVATIONAL_MESSAGES[motMessageIndex]}</p>
              {strictCountdown <= 0 && (
                <div className="space-y-3">
                  <Button size="lg" className="font-body" onClick={() => setShowStrictExit(false)}>Return to Session</Button><br />
                  <button className="text-sm text-muted-foreground hover:text-foreground font-body transition-colors" onClick={forceEndSession}>End Session Anyway</button>
                </div>
              )}
            </div>
          </div>
        )}
        <div className={cn("absolute inset-0 z-10 flex flex-col items-center justify-center transition-opacity duration-500", controlsVisible ? "opacity-100" : "opacity-[0.1]")}>
          <p className="text-sm text-foreground/50 font-body mb-4">Focus Session · {focusMode === "strict" ? "Strict" : "Normal"}</p>
          {timerStyle === "digits" && <p className="text-7xl font-mono font-bold text-foreground tabular-nums tracking-wider">{formatTime(focusTimeLeft)}</p>}
          {timerStyle === "ring" && (
            <div className="relative h-48 w-48 mb-4">
              <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" stroke="hsl(var(--muted))" strokeWidth="4" fill="none" opacity="0.2" />
                <circle cx="50" cy="50" r="45" stroke="hsl(var(--primary))" strokeWidth="4" fill="none" strokeDasharray={`${progress * 283} 283`} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center"><span className="text-3xl font-mono font-bold text-foreground tabular-nums">{formatTime(focusTimeLeft)}</span></div>
            </div>
          )}
          {timerStyle === "flip" && (
            <div className="flex gap-2 mb-4">
              {formatTime(focusTimeLeft).split("").map((ch, i) => (
                <div key={i} className={cn("text-5xl font-mono font-bold text-foreground", ch === ":" ? "" : "bg-card/30 rounded-lg px-3 py-2")}>{ch}</div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-3 mt-6">
            <Button variant="ghost" size="icon" className="h-10 w-10 text-foreground/70" onClick={() => setTimerStyle(timerStyle === "digits" ? "ring" : timerStyle === "ring" ? "flip" : "digits")}><Clock className="h-5 w-5" /></Button>
            {focusMode === "normal" && <Button variant="ghost" size="icon" className="h-10 w-10 text-foreground/70" onClick={() => setFocusPaused(!focusPaused)}>{focusPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}</Button>}
            <Button variant="ghost" size="icon" className="h-10 w-10 text-foreground/70" onClick={handleStrictExit}><Square className="h-5 w-5" /></Button>
          </div>
        </div>
        <div className={cn("absolute bottom-6 left-6 z-20 flex items-center gap-3 bg-black/40 rounded-xl px-4 py-2 transition-opacity duration-500", controlsVisible ? "opacity-100" : "opacity-[0.1]")}>
          <Volume2 className="h-4 w-4 text-foreground/60" />
          <Popover><PopoverTrigger asChild><button className="text-sm font-body text-foreground/70 hover:text-foreground transition-colors">{SOUNDSCAPES.find(s => s.id === soundscape)?.name || "Lo-fi"}</button></PopoverTrigger>
            <PopoverContent className="w-48 p-2" side="top">
              {SOUNDSCAPES.map(s => <button key={s.id} className={cn("w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-body transition-colors", soundscape === s.id ? "bg-primary/10 text-primary" : "hover:bg-secondary")} onClick={() => setSoundscape(s.id)}><s.icon className="h-3.5 w-3.5" /> {s.name}</button>)}
            </PopoverContent>
          </Popover>
        </div>
        <div className={cn("absolute bottom-6 right-6 z-20 transition-opacity duration-500", controlsVisible ? "opacity-100" : "opacity-[0.1]")}>
          <Popover><PopoverTrigger asChild><Button variant="ghost" size="icon" className="h-10 w-10 text-foreground/60 bg-black/40 rounded-xl"><Image className="h-4 w-4" /></Button></PopoverTrigger>
            <PopoverContent className="w-56 p-3" side="top" align="end">
              <p className="text-xs font-body font-medium mb-2">Wallpaper</p>
              <div className="grid grid-cols-3 gap-2">
                {WALLPAPER_PRESETS.map(wp => <button key={wp.id} className={cn("h-12 rounded-lg transition-all", wallpaper === wp.id && "ring-2 ring-primary")} style={{ background: wp.gradient }} onClick={() => setWallpaper(wp.id)} />)}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    );
  }

  // ============ POST-SESSION SUMMARY ============
  if (showPostSession) {
    return (
      <FocusSessionComplete
        focusDuration={focusDuration}
        focusMode={focusMode}
        onSave={saveFocusSessionData}
      />
    );
  }

  // ============ MAIN LAYOUT ============
  const selectSection = (id: typeof activeSection) => { setActiveSection(id); setMobileDrawerOpen(false); };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-sidebar overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-3 pb-2 shrink-0">
        <span className="text-[12px] font-body font-semibold text-muted-foreground uppercase tracking-widest">Study OS</span>
        <button onClick={() => setSidebarCollapsed(true)}
          className="hidden md:flex p-1.5 rounded-lg hover:bg-sidebar-accent text-muted-foreground hover:text-foreground transition-colors"
          title="Collapse sidebar">
          <PanelLeftClose className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Stats strip */}
      <div className="flex items-center gap-3 px-3 py-2 border-b border-border/30 shrink-0">
        <span className="text-xs font-body text-muted-foreground flex items-center gap-1">
          <Zap className="h-3 w-3 text-primary" />{Math.floor(todayFocusMinutes / 60)}h{todayFocusMinutes % 60}m
        </span>
        {currentStreak > 0 && (
          <span className="text-xs font-body flex items-center gap-1 text-[hsl(var(--streak))]">
            <Flame className="h-3 w-3" />{currentStreak}d streak
          </span>
        )}
      </div>

      {/* Nav items */}
      <div className="flex-1 overflow-y-auto py-2 px-2">
        {SECTION_TABS.map(tab => (
          <button key={tab.id} onClick={() => selectSection(tab.id)}
            className={cn(
              "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-body transition-all mb-0.5 group",
              activeSection === tab.id
                ? "bg-primary/10 text-primary font-medium"
                : "text-foreground/70 hover:bg-sidebar-accent hover:text-foreground"
            )}>
            <tab.icon className="h-4 w-4 shrink-0" />
            <span className="flex-1 text-left">{tab.label}</span>
            <kbd className={cn("text-[9px] px-1.5 py-0.5 rounded font-mono leading-tight transition-opacity",
              activeSection === tab.id ? "bg-primary/15 text-primary" : "bg-muted/60 text-muted-foreground/60 opacity-0 group-hover:opacity-100")}>
              {tab.shortcut}
            </kbd>
          </button>
        ))}

        {activeSection === "calendar" && (
          <div className="mt-6 space-y-4 px-1">


            <div className="rounded-2xl border border-border/20 bg-muted/5 overflow-hidden">
               <MiniCalendar 
                 currentDate={currentDate} 
                 onSelect={(d) => setCurrentDate(d)}
                 events={allCalendarEvents}
               />
               <div className="border-t border-border/10 bg-muted/10">
                 <CalendarList 
                   gcalConnected={gcalState === "connected"}
                   gcalEmail={gcalStatus?.email}
                   showHolidays={showHolidays}
                   onToggleHolidays={() => setShowHolidays(!showHolidays)}
                 />
               </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer action */}
      <div className="p-2 border-t border-border/30 shrink-0">
        <button onClick={() => { setShowQuickFocus(true); setMobileDrawerOpen(false); }}
          className="w-full flex items-center justify-center gap-2 h-9 rounded-xl bg-primary text-primary-foreground text-xs font-body font-medium hover:bg-primary/90 transition-colors shadow-sm">
          <Zap className="h-3.5 w-3.5" /> Start Focus
        </button>
      </div>
    </div>
  );

  return (
    <Layout fullBleed>
      <div className="flex flex-col md:flex-row overflow-hidden bg-transparent h-[100dvh] md:h-[calc(100dvh-57px)]">

        {/* ── MOBILE OVERLAY DRAWER ── */}
        <AnimatePresence>
          {mobileDrawerOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-black/40 md:hidden"
                onClick={() => setMobileDrawerOpen(false)}
              />
              <motion.aside
                initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="fixed left-0 top-0 bottom-0 z-[110] w-[280px] bg-card border-r border-border flex flex-col md:hidden shadow-xl">
                <SidebarContent />
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* ── MOBILE TOP BAR (stacks above main, full width) ── */}
        <div className="md:hidden flex items-center h-12 px-3 border-b border-border/40 bg-background/95 backdrop-blur-sm shrink-0 gap-3 w-full">
          <button onClick={() => setMobileDrawerOpen(o => !o)}
            className="tap-44 -ml-2 flex items-center justify-center text-foreground press">
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-sm font-body font-semibold capitalize">{activeSection}</span>
          <button onClick={() => setShowQuickFocus(true)}
            className="ml-auto flex items-center gap-1.5 px-3 h-9 rounded-full text-xs font-body text-primary bg-primary/10 active:bg-primary/20 press">
            <Zap className="h-3.5 w-3.5" /> Focus
          </button>
        </div>

        {/* ── MOBILE SECTION TABS (horizontal scroll, replaces sidebar) ── */}
        <div className="md:hidden flex gap-1.5 px-3 py-2 overflow-x-auto no-scrollbar shrink-0 border-b border-border/30 bg-background/80 w-full">
          {SECTION_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id)}
              className={cn(
                "shrink-0 flex items-center gap-1.5 px-3 h-9 rounded-full text-xs font-body press",
                activeSection === tab.id
                  ? "bg-primary text-primary-foreground font-medium shadow-sm shadow-primary/25"
                  : "bg-secondary/60 text-muted-foreground active:bg-secondary"
              )}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── DESKTOP SIDEBAR ── */}
        {!sidebarCollapsed ? (
          <aside
            style={{ "--sidebar-width": `${sidebarWidth}px` } as React.CSSProperties}
            className={cn(
              "hidden md:flex shrink-0 overflow-hidden transition-none os-panel flex-col m-3 mr-1.5",
              isResizing && "transition-none",
              "w-[var(--sidebar-width,220px)]"
            )}>
            <SidebarContent />
          </aside>
        ) : (
          <div className="hidden md:flex shrink-0 flex-col m-3 mr-1.5 w-14 os-panel items-center py-3 gap-2">
            <button onClick={() => setSidebarCollapsed(false)}
              className="p-2 rounded-xl hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
              title="Expand sidebar">
              <Menu className="h-4 w-4" />
            </button>
            <div className="w-8 h-px bg-border/40 my-1" />
            {SECTION_TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveSection(tab.id)}
                className={cn("p-2 rounded-xl transition-colors",
                  activeSection === tab.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground")}
                title={tab.label}>
                <tab.icon className="h-4 w-4" />
              </button>
            ))}
          </div>
        )}

        {/* ── RESIZER ── */}
        {!sidebarCollapsed && (
          <div
            className="hidden md:block w-3 mx-[-6px] z-10 cursor-col-resize hover:bg-primary/10 transition-colors group relative"
            onMouseDown={e => { e.preventDefault(); setIsResizing(true); }}>
            <div className={cn(
              "absolute inset-y-0 left-1/2 -translate-x-1/2 w-0.5 transition-colors duration-200",
              isResizing ? "bg-primary/50" : "bg-transparent group-hover:bg-primary/30"
            )} />
          </div>
        )}

        <main className={cn(
          "flex-1 flex flex-col overflow-hidden min-w-0 os-panel",
          "m-3 md:ml-1.5 mt-3 max-md:mx-2 max-md:mb-[calc(4.5rem+env(safe-area-inset-bottom,0px))]"
        )}>
          <div className="flex-1 overflow-hidden flex flex-col">
            {activeSection === "calendar" && renderCalendar()}
            {activeSection === "tasks" && renderTasks()}
            {activeSection === "habits" && renderHabits()}
            {activeSection === "focus" && renderFocusSection()}
            {activeSection === "analytics" && renderAnalytics()}
          </div>
        </main>
      </div>

      {/* MODALS */}
      <Dialog open={showQuickFocus} onOpenChange={setShowQuickFocus}>
        <DialogContent className="max-w-md modal-shadow" aria-describedby={undefined}><DialogHeader><DialogTitle className="font-heading text-xl">Start Focus Session</DialogTitle></DialogHeader>
          <div className="space-y-6 py-2">
            <div><p className="text-sm font-body font-medium mb-3">Mode</p>
              <div className="grid grid-cols-2 gap-3">{[{ id: "normal" as const, label: "Normal Mode", desc: "Pause and exit freely" }, { id: "strict" as const, label: "Strict Mode", desc: "Locked session with exit delay" }].map(m => (
                <button key={m.id} onClick={() => setFocusMode(m.id)} className={cn("p-4 rounded-xl border-2 text-left transition-all", focusMode === m.id ? "border-primary bg-primary/5" : "border-border/50 hover:border-primary/30")}>
                  <p className="text-sm font-body font-semibold">{m.label}</p><p className="text-[11px] text-muted-foreground font-body mt-1">{m.desc}</p>
                </button>))}</div></div>
            <TimeWheelPicker
              initialMinutes={focusDuration}
              onConfirm={(totalSeconds) => {
                const mins = Math.round(totalSeconds / 60);
                setFocusDuration(mins);
                startFocusSession();
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showNewHabit} onOpenChange={setShowNewHabit}>
        <DialogContent className="max-w-sm modal-shadow" aria-describedby={undefined}><DialogHeader><DialogTitle className="font-heading">New Habit</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <Input placeholder="Habit name" value={newHabitName} onChange={e => setNewHabitName(e.target.value)} className="font-body" />
            <div><label className="text-xs font-body text-muted-foreground mb-2 block">Emoji</label>
              <div className="flex gap-2 flex-wrap">{["📚", "🏃", "💧", "🧘", "✍️", "🎯", "💤", "🥗"].map(e => <button key={e} onClick={() => setNewHabitEmoji(e)} className={cn("text-xl p-1.5 rounded-lg transition-all", newHabitEmoji === e && "bg-primary/10 ring-1 ring-primary/30")}>{e}</button>)}</div></div>
            <div><label className="text-xs font-body text-muted-foreground mb-2 block">Color</label>
              <div className="flex gap-2">{HABIT_COLORS.map(c => <button key={c} className={cn("h-7 w-7 rounded-full transition-all", newHabitColor === c && "ring-2 ring-offset-2 ring-primary")} style={{ backgroundColor: c }} onClick={() => setNewHabitColor(c)} />)}</div></div>
            <Button className="w-full font-body" onClick={handleCreateHabit}>Create Habit</Button>
          </div>
        </DialogContent>
      </Dialog>

      <AnimatePresence>{showQuickCapture && (
        <motion.div initial={{ y: -60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -60, opacity: 0 }} className="fixed top-[57px] left-0 right-0 z-50 bg-card border-b border-border/50 shadow-lg px-4 py-3">
          <div className="max-w-xl mx-auto flex gap-2">
            <Input placeholder='Add a task... "finish report tomorrow 3pm high"' value={quickCaptureInput} onChange={e => setQuickCaptureInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && quickCaptureInput.trim()) handleCreateTask(parseNaturalLanguageTask(quickCaptureInput)); if (e.key === "Escape") setShowQuickCapture(false); }} className="font-body text-sm" autoFocus />
            <Button variant="ghost" size="icon" onClick={() => setShowQuickCapture(false)}><X className="h-4 w-4" /></Button>
          </div>
        </motion.div>
      )}</AnimatePresence>

      <Dialog open={showDailyCheckIn} onOpenChange={setShowDailyCheckIn}>
        <DialogContent className="max-w-md modal-shadow" aria-describedby={undefined}><DialogHeader><DialogTitle className="font-heading text-xl">
          Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, {user?.displayName?.split(" ")[0] || "Student"}! ☀️
        </DialogTitle></DialogHeader>
          <div className="space-y-6 py-2">
            {habits.length > 0 && <div><p className="text-sm font-body font-medium mb-3">Today's habits</p>
              {habits.map(h => <label key={h.id} className="flex items-center gap-3 py-2 cursor-pointer"><Checkbox checked={habitLogs[todayStr]?.[h.id] || false} onCheckedChange={() => handleToggleHabit(h.id)} /><span className="text-sm font-body">{h.emoji} {h.name}</span></label>)}</div>}
            <Button className="w-full font-body gap-2" onClick={() => { setShowDailyCheckIn(false); localStorage.setItem("vv_last_checkin", todayStr); }}>Start My Day <ArrowRight className="h-4 w-4" /></Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
        <DialogContent className="max-w-sm" aria-describedby={undefined}>{selectedTask && (<><DialogHeader><DialogTitle className="font-heading">{selectedTask.title}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div><label className="text-xs font-body text-muted-foreground">Priority</label>
              <div className="flex gap-2 mt-1">{(["none", "low", "medium", "high", "urgent"] as const).map(p => (
                <button key={p} className={cn("px-2.5 py-1 rounded-lg text-[11px] font-body transition-all capitalize", selectedTask.priority === p ? "ring-1 ring-primary" : "opacity-60")} style={{ backgroundColor: `${PRIORITY_COLORS[p]}20`, color: PRIORITY_COLORS[p] }}>{p}</button>
              ))}</div></div>
            <div><label className="text-xs font-body text-muted-foreground">Due Date</label><Input type="date" value={selectedTask.dueDate || ""} className="mt-1 font-body text-sm" readOnly /></div>
            <Button variant="outline" className="w-full font-body text-sm gap-2" onClick={() => { setSelectedTask(null); setActiveSection("calendar"); }}><CalendarDays className="h-3.5 w-3.5" /> Schedule to Calendar</Button>
          </div></>)}</DialogContent>
      </Dialog>
    </Layout>
  );
};

export default StudyMode;
