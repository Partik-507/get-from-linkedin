import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, where } from "firebase/firestore";
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
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import {
  Calendar, Clock, Plus, Play, Pause, Square, Check, ChevronLeft, ChevronRight,
  Flame, Target, TrendingUp, BarChart3, Timer, Lock, X, AlertTriangle,
  Sun, Moon, Music, Upload, Volume2, Image, Pencil, Trash2, RotateCcw,
  CalendarDays, LayoutGrid, List, Zap, Trophy,
} from "lucide-react";

interface StudyBlock {
  id: string;
  title: string;
  description: string;
  courseId: string;
  topic: string;
  sessionType: string;
  startTime: string;
  endTime: string;
  duration: number; // minutes
  priority: string;
  tags: string[];
  status: string;
  actualDuration?: number;
  date: string;
}

interface StudyGoal {
  id: string;
  title: string;
  targetMinutes: number;
  completedMinutes: number;
  period: string;
}

type CalendarView = "day" | "week" | "month";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const SESSION_TYPES = ["study", "review", "quiz", "flashcard", "project", "notes", "break"];
const PRIORITIES = ["low", "normal", "high"];

const formatTime = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h > 0 ? `${h}:` : ""}${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
};

const BUILT_IN_MUSIC = [
  { name: "Lo-fi Beats", url: "https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3" },
  { name: "Rain Sounds", url: "https://cdn.pixabay.com/audio/2022/03/10/audio_4dedf5bf94.mp3" },
  { name: "Nature Ambient", url: "https://cdn.pixabay.com/audio/2022/08/23/audio_d16737dc28.mp3" },
];

const MOTIVATIONAL = [
  "Stay focused! Every minute of study brings you closer to mastery. 📚",
  "You're doing amazing! Don't break the flow now. 🔥",
  "Champions are made in moments like these. Keep pushing! 💪",
];

const StudyMode = () => {
  const { user } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const userId = user?.uid;

  // Calendar state
  const [calView, setCalView] = useState<CalendarView>("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [blocks, setBlocks] = useState<StudyBlock[]>([]);
  const [goals, setGoals] = useState<StudyGoal[]>([]);
  const [loading, setLoading] = useState(true);

  // Create/edit modal
  const [createOpen, setCreateOpen] = useState(false);
  const [editBlock, setEditBlock] = useState<StudyBlock | null>(null);
  const [form, setForm] = useState({ title: "", description: "", courseId: "", topic: "", sessionType: "study", startTime: "09:00", endTime: "10:00", duration: 60, priority: "normal", tags: "", date: new Date().toISOString().slice(0, 10) });

  // Session drawer
  const [drawerBlock, setDrawerBlock] = useState<StudyBlock | null>(null);

  // Active timer
  const [activeSession, setActiveSession] = useState<StudyBlock | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [strictMode, setStrictMode] = useState(false);
  const [exitRequested, setExitRequested] = useState(false);
  const [exitCountdown, setExitCountdown] = useState(10);

  // Music & wallpaper
  const [currentTrack, setCurrentTrack] = useState<string | null>(null);
  const [volume, setVolume] = useState(50);
  const [wallpaper, setWallpaper] = useState<string | null>(() => localStorage.getItem("vv_study_wallpaper"));
  const [controlsVisible, setControlsVisible] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const wallpaperInputRef = useRef<HTMLInputElement>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Habit stats
  const [streak, setStreak] = useState(0);

  useEffect(() => { document.title = "Study OS — VivaVault"; }, []);

  // Load data
  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    const fetchData = async () => {
      try {
        const [blocksSnap, goalsSnap] = await Promise.all([
          getDocs(collection(db, "users", userId, "studySessions")),
          getDocs(collection(db, "users", userId, "studyGoals")),
        ]);
        setBlocks(blocksSnap.docs.map(d => ({ id: d.id, ...d.data() } as StudyBlock)));
        setGoals(goalsSnap.docs.map(d => ({ id: d.id, ...d.data() } as StudyGoal)));

        // Calculate streak
        let s = 0;
        const today = new Date();
        for (let i = 0; i < 365; i++) {
          const d = new Date(today);
          d.setDate(d.getDate() - i);
          const dateStr = d.toISOString().slice(0, 10);
          const hasBlock = blocksSnap.docs.some(doc => doc.data().date === dateStr && doc.data().status === "completed");
          if (hasBlock) s++;
          else if (i > 0) break;
        }
        setStreak(s);
      } catch { toast.error("Failed to load study data"); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [userId]);

  // Timer
  useEffect(() => {
    if (!timerRunning) return;
    const interval = setInterval(() => setTimerSeconds(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [timerRunning]);

  // Exit countdown
  useEffect(() => {
    if (!exitRequested || exitCountdown <= 0) return;
    const timer = setTimeout(() => setExitCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [exitRequested, exitCountdown]);

  // Volume
  useEffect(() => { if (audioRef.current) audioRef.current.volume = volume / 100; }, [volume]);

  // Auto-hide controls
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

  // Create study block
  const handleCreate = async () => {
    if (!userId || !form.title) { toast.error("Title is required"); return; }
    try {
      const block: Partial<StudyBlock> = {
        ...form,
        tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
        status: "planned",
        actualDuration: 0,
      };
      const ref = await addDoc(collection(db, "users", userId, "studySessions"), { ...block, createdAt: serverTimestamp() });
      setBlocks(prev => [...prev, { id: ref.id, ...block } as StudyBlock]);
      setCreateOpen(false);
      setForm({ title: "", description: "", courseId: "", topic: "", sessionType: "study", startTime: "09:00", endTime: "10:00", duration: 60, priority: "normal", tags: "", date: new Date().toISOString().slice(0, 10) });
      toast.success("Study block created!");
    } catch { toast.error("Failed to create"); }
  };

  // Start session
  const startSession = (block: StudyBlock, strict = false) => {
    setActiveSession(block);
    setTimerSeconds(0);
    setTimerRunning(true);
    setStrictMode(strict);
    setExitRequested(false);
    if (strict) document.documentElement.requestFullscreen?.().catch(() => {});
  };

  // Complete session
  const completeSession = async () => {
    if (!activeSession || !userId) return;
    stopMusic();
    if (strictMode) document.exitFullscreen?.().catch(() => {});
    try {
      await updateDoc(doc(db, "users", userId, "studySessions", activeSession.id), {
        status: "completed",
        actualDuration: Math.round(timerSeconds / 60),
      });
      setBlocks(prev => prev.map(b => b.id === activeSession.id ? { ...b, status: "completed", actualDuration: Math.round(timerSeconds / 60) } : b));
      toast.success(`Session completed! ${formatTime(timerSeconds)} studied`);
    } catch { toast.error("Failed to save session"); }
    setActiveSession(null);
    setTimerRunning(false);
    setStrictMode(false);
    setExitRequested(false);
  };

  const requestExit = () => {
    if (strictMode) { setExitRequested(true); setExitCountdown(10); }
    else completeSession();
  };

  const deleteBlock = async (id: string) => {
    if (!userId) return;
    await deleteDoc(doc(db, "users", userId, "studySessions", id));
    setBlocks(prev => prev.filter(b => b.id !== id));
    toast.success("Block deleted");
  };

  // Calendar navigation
  const navigate = (dir: number) => {
    const d = new Date(currentDate);
    if (calView === "day") d.setDate(d.getDate() + dir);
    else if (calView === "week") d.setDate(d.getDate() + dir * 7);
    else d.setMonth(d.getMonth() + dir);
    setCurrentDate(d);
  };

  const goToday = () => setCurrentDate(new Date());

  // Get blocks for a specific date
  const getBlocksForDate = (dateStr: string) => blocks.filter(b => b.date === dateStr);

  // Week dates
  const weekDates = useMemo(() => {
    const start = new Date(currentDate);
    start.setDate(start.getDate() - start.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [currentDate]);

  // Month dates
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
  const completedToday = blocks.filter(b => b.date === new Date().toISOString().slice(0, 10) && b.status === "completed").length;
  const totalMinutesToday = blocks.filter(b => b.date === new Date().toISOString().slice(0, 10) && b.status === "completed").reduce((acc, b) => acc + (b.actualDuration || 0), 0);
  const plannedToday = blocks.filter(b => b.date === new Date().toISOString().slice(0, 10)).length;

  const todayStr = new Date().toISOString().slice(0, 10);

  // Fullscreen timer overlay
  if (activeSession && strictMode) {
    const bgStyle = wallpaper ? { backgroundImage: `url(${wallpaper})`, backgroundSize: "cover", backgroundPosition: "center" } : {};
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center" style={bgStyle} onMouseMove={resetHideTimer}>
        {wallpaper && <div className="absolute inset-0 bg-black/50" />}
        {!wallpaper && <div className="absolute inset-0 bg-background" />}

        <div className={cn("absolute top-4 right-4 flex items-center gap-2 z-10 transition-opacity duration-300", controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none")}>
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-foreground/70 h-8 w-8">
            {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => wallpaperInputRef.current?.click()} className="text-foreground/70 h-8 w-8">
            <Image className="h-4 w-4" />
          </Button>
          <input ref={wallpaperInputRef} type="file" accept="image/*" className="hidden" onChange={handleWallpaper} />
        </div>

        <div className="relative z-10 w-full max-w-md px-6">
          <AnimatePresence mode="wait">
            {exitRequested ? (
              <motion.div key="exit" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
                <AlertTriangle className="h-12 w-12 text-[hsl(var(--warning))] mx-auto mb-4" />
                <h2 className="text-2xl font-heading font-bold mb-3 text-foreground">Wait! Don't go yet</h2>
                <p className="text-muted-foreground font-body mb-6">{MOTIVATIONAL[Math.floor(Math.random() * MOTIVATIONAL.length)]}</p>
                <p className="text-sm text-muted-foreground font-body mb-6">Studied for <span className="text-primary font-semibold">{formatTime(timerSeconds)}</span></p>
                <div className="flex gap-3 justify-center">
                  <Button variant="outline" onClick={() => setExitRequested(false)} className="font-body gap-2"><Flame className="h-4 w-4" /> Keep Studying</Button>
                  <Button variant="destructive" onClick={completeSession} disabled={exitCountdown > 0} className="font-body">{exitCountdown > 0 ? `Wait ${exitCountdown}s` : "End Session"}</Button>
                </div>
              </motion.div>
            ) : (
              <motion.div key="timer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
                <Lock className="h-8 w-8 text-primary mx-auto mb-4 animate-pulse" />
                <p className="text-sm text-muted-foreground font-body mb-2">{activeSession.title}</p>
                <div className="text-7xl font-heading font-extrabold tabular-nums mb-8 text-gradient">{formatTime(timerSeconds)}</div>

                <div className={cn("mb-6 space-y-3 transition-opacity duration-300", controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none")}>
                  <div className="flex items-center gap-2 justify-center"><Music className="h-4 w-4 text-muted-foreground" /><span className="text-sm font-body text-muted-foreground">Study Music</span></div>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {BUILT_IN_MUSIC.map(m => (
                      <button key={m.name} onClick={() => currentTrack === m.url ? stopMusic() : playTrack(m.url)} className={cn("px-3 py-1.5 rounded-full text-xs font-body transition-all", currentTrack === m.url ? "bg-primary text-primary-foreground" : "bg-secondary/60 text-muted-foreground hover:text-foreground")}>
                        {currentTrack === m.url ? "⏸ " : "▶ "}{m.name}
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

                <div className={cn("transition-opacity duration-300", controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none")}>
                  <Button variant="ghost" size="sm" onClick={requestExit} className="text-muted-foreground font-body"><X className="h-4 w-4 mr-1" /> End Session</Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  return (
    <Layout title="Study OS">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-heading font-extrabold tracking-tight"><span className="text-gradient">Study OS</span></h1>
            <p className="text-muted-foreground font-body text-sm mt-1">Plan, track, and execute your study sessions</p>
          </div>
          <div className="flex items-center gap-2">
            {streak > 0 && (
              <Badge variant="outline" className="gap-1.5 px-3 py-1.5 text-xs font-body border-[hsl(var(--streak))]/30 text-[hsl(var(--streak))]">
                <Flame className="h-3 w-3" /> {streak} day streak
              </Badge>
            )}
            <Button onClick={() => { setEditBlock(null); setCreateOpen(true); }} className="gap-2 font-body bg-gradient-to-r from-primary to-[hsl(280,60%,50%)] text-primary-foreground">
              <Plus className="h-4 w-4" /> New Session
            </Button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Today's Sessions", value: `${completedToday}/${plannedToday}`, icon: Target, color: "text-primary" },
            { label: "Time Today", value: `${totalMinutesToday}m`, icon: Clock, color: "text-[hsl(var(--success))]" },
            { label: "Current Streak", value: `${streak}d`, icon: Flame, color: "text-[hsl(var(--streak))]" },
            { label: "Total Sessions", value: blocks.filter(b => b.status === "completed").length, icon: Trophy, color: "text-[hsl(var(--warning))]" },
          ].map((stat, i) => (
            <GlassCard key={i} hover={false} className="text-center py-4">
              <stat.icon className={cn("h-5 w-5 mx-auto mb-1.5", stat.color)} />
              <p className="text-xl font-heading font-bold tabular-nums">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground font-body mt-0.5">{stat.label}</p>
            </GlassCard>
          ))}
        </div>

        {/* Calendar toolbar */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="h-8 w-8 p-0"><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" onClick={goToday} className="h-8 text-xs font-body">Today</Button>
            <Button variant="outline" size="sm" onClick={() => navigate(1)} className="h-8 w-8 p-0"><ChevronRight className="h-4 w-4" /></Button>
            <h2 className="text-lg font-heading font-bold ml-2">
              {currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric", ...(calView === "day" ? { day: "numeric" } : {}) })}
            </h2>
          </div>
          <div className="flex gap-0.5 bg-secondary/40 rounded-lg p-0.5">
            {([
              { view: "day" as CalendarView, icon: List, label: "Day" },
              { view: "week" as CalendarView, icon: CalendarDays, label: "Week" },
              { view: "month" as CalendarView, icon: LayoutGrid, label: "Month" },
            ]).map(v => (
              <button
                key={v.view}
                onClick={() => setCalView(v.view)}
                className={cn("px-3 py-1.5 rounded-md text-xs font-body flex items-center gap-1.5 transition-all", calView === v.view ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
              >
                <v.icon className="h-3 w-3" /> {v.label}
              </button>
            ))}
          </div>
        </div>

        {/* Calendar content */}
        {loading ? (
          <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 bg-secondary/30 rounded-xl animate-pulse" />)}</div>
        ) : calView === "month" ? (
          <div className="vv-card p-4">
            <div className="grid grid-cols-7 gap-1 mb-2">
              {DAYS.map(d => <div key={d} className="text-center text-[10px] font-body text-muted-foreground font-medium py-1">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {monthDates.map((date, i) => {
                if (!date) return <div key={i} />;
                const dateStr = date.toISOString().slice(0, 10);
                const dayBlocks = getBlocksForDate(dateStr);
                const isToday = dateStr === todayStr;
                return (
                  <button
                    key={i}
                    onClick={() => { setCurrentDate(date); setCalView("day"); }}
                    className={cn(
                      "p-2 rounded-lg text-xs font-body min-h-[70px] text-left transition-colors",
                      isToday ? "bg-primary/10 border border-primary/30" : "hover:bg-accent/50",
                    )}
                  >
                    <span className={cn("font-medium", isToday && "text-primary")}>{date.getDate()}</span>
                    {dayBlocks.slice(0, 2).map(b => (
                      <div key={b.id} className={cn("mt-0.5 px-1 py-0.5 rounded text-[9px] truncate", b.status === "completed" ? "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]" : "bg-primary/10 text-primary")}>{b.title}</div>
                    ))}
                    {dayBlocks.length > 2 && <div className="text-[9px] text-muted-foreground mt-0.5">+{dayBlocks.length - 2} more</div>}
                  </button>
                );
              })}
            </div>
          </div>
        ) : calView === "week" ? (
          <div className="vv-card p-4 overflow-x-auto">
            <div className="grid grid-cols-7 gap-2 min-w-[600px]">
              {weekDates.map(date => {
                const dateStr = date.toISOString().slice(0, 10);
                const dayBlocks = getBlocksForDate(dateStr);
                const isToday = dateStr === todayStr;
                return (
                  <div key={dateStr} className={cn("rounded-lg p-2 min-h-[200px]", isToday && "bg-primary/5 border border-primary/20")}>
                    <div className="text-center mb-2">
                      <p className="text-[10px] text-muted-foreground font-body">{DAYS[date.getDay()]}</p>
                      <p className={cn("text-lg font-heading font-bold", isToday && "text-primary")}>{date.getDate()}</p>
                    </div>
                    <div className="space-y-1.5">
                      {dayBlocks.map(b => (
                        <button
                          key={b.id}
                          onClick={() => setDrawerBlock(b)}
                          className={cn(
                            "w-full text-left p-2 rounded-lg text-xs font-body transition-all hover:scale-[1.02]",
                            b.status === "completed" ? "bg-[hsl(var(--success))]/10 border border-[hsl(var(--success))]/20" :
                            b.status === "in-progress" ? "bg-primary/10 border border-primary/20" :
                            "bg-secondary/50 border border-border/30"
                          )}
                        >
                          <p className="font-medium truncate">{b.title}</p>
                          <p className="text-muted-foreground">{b.startTime} - {b.endTime}</p>
                          {b.status === "completed" && <Check className="h-3 w-3 text-[hsl(var(--success))] mt-0.5" />}
                        </button>
                      ))}
                      <button
                        onClick={() => { setForm(f => ({ ...f, date: dateStr })); setCreateOpen(true); }}
                        className="w-full py-1.5 rounded-lg border border-dashed border-border/40 text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors text-xs font-body flex items-center justify-center gap-1"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          // Day view
          <div className="vv-card p-4">
            <div className="space-y-1">
              {HOURS.map(hour => {
                const hourStr = String(hour).padStart(2, "0");
                const dateStr = currentDate.toISOString().slice(0, 10);
                const hourBlocks = getBlocksForDate(dateStr).filter(b => b.startTime?.startsWith(hourStr));
                return (
                  <div key={hour} className="flex gap-3 min-h-[48px] group">
                    <span className="text-[10px] text-muted-foreground font-body w-10 shrink-0 pt-1 tabular-nums">{hourStr}:00</span>
                    <div className="flex-1 border-t border-border/20 pt-1 relative">
                      {hourBlocks.map(b => (
                        <button
                          key={b.id}
                          onClick={() => setDrawerBlock(b)}
                          className={cn(
                            "w-full text-left p-2 rounded-lg text-xs font-body mb-1 transition-all hover:scale-[1.01]",
                            b.status === "completed" ? "bg-[hsl(var(--success))]/10 border border-[hsl(var(--success))]/20" :
                            "bg-primary/10 border border-primary/20"
                          )}
                        >
                          <span className="font-medium">{b.title}</span>
                          <span className="text-muted-foreground ml-2">{b.startTime} - {b.endTime}</span>
                        </button>
                      ))}
                      <button
                        onClick={() => { setForm(f => ({ ...f, date: dateStr, startTime: `${hourStr}:00`, endTime: `${String(hour + 1).padStart(2, "0")}:00` })); setCreateOpen(true); }}
                        className="absolute inset-x-0 top-0 bottom-0 opacity-0 group-hover:opacity-100 flex items-center justify-center text-muted-foreground hover:text-primary transition-opacity"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Active session (non-strict) */}
        {activeSession && !strictMode && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50">
            <div className="vv-card p-4 flex items-center gap-4 shadow-xl bg-card/95 backdrop-blur-xl">
              <div>
                <p className="text-xs text-muted-foreground font-body">{activeSession.title}</p>
                <p className="text-2xl font-heading font-bold tabular-nums text-gradient">{formatTime(timerSeconds)}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant={timerRunning ? "outline" : "default"} onClick={() => setTimerRunning(!timerRunning)} className="h-9 w-9 p-0">
                  {timerRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <Button size="sm" variant="outline" onClick={completeSession} className="h-9 font-body text-xs gap-1">
                  <Check className="h-3 w-3" /> Done
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* FAB */}
        {!activeSession && (
          <button
            onClick={() => setCreateOpen(true)}
            className="fixed bottom-20 md:bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-gradient-to-br from-primary to-[hsl(280,60%,50%)] text-primary-foreground shadow-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
          >
            <Plus className="h-6 w-6" />
          </button>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">New Study Session</DialogTitle>
            <DialogDescription className="font-body">Plan your study block</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label className="font-body">Title</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g., Study MAD1 Chapter 3" className="font-body bg-secondary/30 border-border/40" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="font-body">Date</Label>
                <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="font-body bg-secondary/30 border-border/40" />
              </div>
              <div className="space-y-2">
                <Label className="font-body">Type</Label>
                <Select value={form.sessionType} onValueChange={v => setForm(f => ({ ...f, sessionType: v }))}>
                  <SelectTrigger className="font-body bg-secondary/30 border-border/40"><SelectValue /></SelectTrigger>
                  <SelectContent>{SESSION_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize font-body">{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="font-body">Start Time</Label>
                <Input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} className="font-body bg-secondary/30 border-border/40" />
              </div>
              <div className="space-y-2">
                <Label className="font-body">End Time</Label>
                <Input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} className="font-body bg-secondary/30 border-border/40" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="font-body">Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger className="font-body bg-secondary/30 border-border/40"><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p} className="capitalize font-body">{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-body">Duration (min)</Label>
                <Input type="number" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: parseInt(e.target.value) || 60 }))} className="font-body bg-secondary/30 border-border/40" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="font-body">Topic</Label>
              <Input value={form.topic} onChange={e => setForm(f => ({ ...f, topic: e.target.value }))} placeholder="Chapter, concept..." className="font-body bg-secondary/30 border-border/40" />
            </div>
            <div className="space-y-2">
              <Label className="font-body">Description</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What you plan to study..." rows={2} className="font-body bg-secondary/30 border-border/40 resize-none" />
            </div>
            <Button onClick={handleCreate} className="w-full font-body gap-2 bg-gradient-to-r from-primary to-[hsl(280,60%,50%)] text-primary-foreground">
              <Plus className="h-4 w-4" /> Create Study Block
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Session Drawer */}
      <Sheet open={!!drawerBlock} onOpenChange={() => setDrawerBlock(null)}>
        <SheetContent className="w-full sm:max-w-md">
          {drawerBlock && (
            <>
              <SheetHeader>
                <SheetTitle className="font-heading">{drawerBlock.title}</SheetTitle>
              </SheetHeader>
              <div className="space-y-4 mt-4">
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs font-body capitalize">{drawerBlock.sessionType}</Badge>
                  <Badge variant="outline" className="text-xs font-body capitalize">{drawerBlock.priority} priority</Badge>
                  <Badge variant={drawerBlock.status === "completed" ? "default" : "outline"} className={cn("text-xs font-body capitalize", drawerBlock.status === "completed" && "bg-[hsl(var(--success))] text-white")}>{drawerBlock.status}</Badge>
                </div>
                <div className="space-y-2 text-sm font-body">
                  <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span>{drawerBlock.date}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Time</span><span>{drawerBlock.startTime} - {drawerBlock.endTime}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Planned Duration</span><span>{drawerBlock.duration}m</span></div>
                  {drawerBlock.actualDuration != null && <div className="flex justify-between"><span className="text-muted-foreground">Actual Duration</span><span className="text-[hsl(var(--success))]">{drawerBlock.actualDuration}m</span></div>}
                  {drawerBlock.topic && <div className="flex justify-between"><span className="text-muted-foreground">Topic</span><span>{drawerBlock.topic}</span></div>}
                </div>
                {drawerBlock.description && <p className="text-sm text-muted-foreground font-body">{drawerBlock.description}</p>}
                {drawerBlock.status !== "completed" && (
                  <div className="space-y-2 pt-2">
                    <Button onClick={() => { startSession(drawerBlock, false); setDrawerBlock(null); }} className="w-full font-body gap-2">
                      <Play className="h-4 w-4" /> Start Normal Session
                    </Button>
                    <Button onClick={() => { startSession(drawerBlock, true); setDrawerBlock(null); }} variant="outline" className="w-full font-body gap-2 border-primary/30 text-primary">
                      <Lock className="h-4 w-4" /> Start Strict Mode
                    </Button>
                  </div>
                )}
                <Button variant="ghost" size="sm" className="w-full text-destructive font-body gap-2" onClick={() => { deleteBlock(drawerBlock.id); setDrawerBlock(null); }}>
                  <Trash2 className="h-4 w-4" /> Delete Session
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </Layout>
  );
};

export default StudyMode;
