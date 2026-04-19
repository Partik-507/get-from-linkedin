import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { TimeWheelPicker } from "@/components/TimeWheelPicker";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { saveFocusSession } from "@/lib/firestoreSync";
import {
  Focus, Timer, Lock, X, Flame, AlertTriangle,
  Sun, Moon, Music, Upload, Volume2, Image, ArrowLeft, Play,
  ChevronRight, Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SceneEngine } from "@/components/focus/SceneEngine";
import { getThemeById, DEFAULT_THEME_ID } from "@/lib/focusThemes";
import { ThemePicker } from "@/components/focus/ThemePicker";

// Inline wrapper to keep theme lookup tidy
const SceneEngineWrapper = ({ themeId, battery, intro }: { themeId: string; battery: boolean; intro?: boolean }) => {
  const theme = getThemeById(themeId) || getThemeById(DEFAULT_THEME_ID)!;
  return <SceneEngine theme={theme} battery={battery} intro={intro} />;
};

const MOTIVATIONAL = [
  "Stay focused! Every minute of study brings you closer to mastery. 📚",
  "You're doing amazing! Don't break the flow now. 🔥",
  "Champions are made in moments like these. Keep pushing! 💪",
  "Consistency is key. You've got this! 🌟",
  "The best investment you can make is in yourself. Stay committed! 🎯",
];

const BUILT_IN_MUSIC = [
  { name: "Lo-fi Beats", url: "https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3" },
  { name: "Rain Sounds", url: "https://cdn.pixabay.com/audio/2022/03/10/audio_4dedf5bf94.mp3" },
  { name: "Nature Ambient", url: "https://cdn.pixabay.com/audio/2022/08/23/audio_d16737dc28.mp3" },
];

type Step = "choose" | "pick_time" | "active";
type SessionMode = "strict" | "normal";

const formatTime = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h > 0 ? `${h}:` : ""}${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
};

const FocusMode = () => {
  const navigate = useNavigate();
  const { resolvedTheme, toggleTheme } = useTheme();
  const { user } = useAuth();

  // Step machine
  const [step, setStep] = useState<Step>("choose");
  const [sessionMode, setSessionMode] = useState<SessionMode>("strict");

  // Session state
  const [totalSeconds, setTotalSeconds] = useState(0);     // chosen duration
  const [remaining, setRemaining] = useState(0);            // countdown
  const [elapsed, setElapsed] = useState(0);                // elapsed (for paused normal)
  const [paused, setPaused] = useState(false);

  // Exit flow
  const [exitRequested, setExitRequested] = useState(false);
  const [exitCountdown, setExitCountdown] = useState(10);
  const [motivationalMsg, setMotivationalMsg] = useState("");

  // Media
  const [currentTrack, setCurrentTrack] = useState<string | null>(null);
  const [volume, setVolume] = useState(50);
  const [wallpaper, setWallpaper] = useState<string | null>(() => localStorage.getItem("vv_focus_wallpaper"));
  const [controlsVisible, setControlsVisible] = useState(true);
  const [themeId, setThemeId] = useState<string>(() => localStorage.getItem("vv_focus_theme") || DEFAULT_THEME_ID);
  const [batterySafe, setBatterySafe] = useState<boolean>(() => localStorage.getItem("vv_focus_battery") === "1");
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => { localStorage.setItem("vv_focus_theme", themeId); }, [themeId]);
  useEffect(() => { localStorage.setItem("vv_focus_battery", batterySafe ? "1" : "0"); }, [batterySafe]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const wallpaperInputRef = useRef<HTMLInputElement>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sessionStartTime = useRef<number>(0);

  // ─── Countdown timer ────────────────────────────────────────────────────────
  useEffect(() => {
    if (step !== "active" || paused || exitRequested) return;
    const id = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) {
          clearInterval(id);
          handleSessionComplete();
          return 0;
        }
        return r - 1;
      });
      setElapsed(e => e + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [step, paused, exitRequested]);

  // ─── Exit countdown ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!exitRequested || exitCountdown <= 0) return;
    const t = setTimeout(() => setExitCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [exitRequested, exitCountdown]);

  // ─── Volume sync ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume / 100;
  }, [volume]);

  // ─── Auto-hide controls ─────────────────────────────────────────────────────
  const resetHideTimer = useCallback(() => {
    setControlsVisible(true);
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    if (sessionMode === "strict") {
      hideTimeoutRef.current = setTimeout(() => setControlsVisible(false), 3500);
    }
  }, [sessionMode]);

  useEffect(() => {
    if (step !== "active") return;
    const move = () => resetHideTimer();
    window.addEventListener("mousemove", move);
    window.addEventListener("touchstart", move);
    resetHideTimer();
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("touchstart", move);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, [step, resetHideTimer]);

  // ─── Handlers ───────────────────────────────────────────────────────────────
  const handleModeSelect = (mode: SessionMode) => {
    setSessionMode(mode);
    setStep("pick_time");
  };

  const handleTimeConfirm = (secs: number) => {
    setTotalSeconds(secs);
    setRemaining(secs);
    setElapsed(0);
    setPaused(false);
    setStep("active");
    sessionStartTime.current = Date.now();
    if (sessionMode === "strict") {
      document.documentElement.requestFullscreen?.().catch(() => {});
    }
  };

  const handleSessionComplete = async () => {
    stopMusic();
    document.exitFullscreen?.().catch(() => {});
    if (user && elapsed > 10) {
      await saveFocusSession(user.uid, {
        duration: elapsed,
        mode: sessionMode,
        date: new Date().toISOString().split("T")[0],
      });
    }
    setStep("choose");
  };

  const requestExit = () => {
    setMotivationalMsg(MOTIVATIONAL[Math.floor(Math.random() * MOTIVATIONAL.length)]);
    setExitRequested(true);
    setExitCountdown(sessionMode === "strict" ? 10 : 0);
  };

  const confirmExit = async () => {
    stopMusic();
    document.exitFullscreen?.().catch(() => {});
    if (user && elapsed > 10) {
      await saveFocusSession(user.uid, {
        duration: elapsed,
        mode: sessionMode,
        date: new Date().toISOString().split("T")[0],
      });
    }
    setStep("choose");
    setExitRequested(false);
  };

  const playTrack = (url: string) => {
    audioRef.current?.pause();
    const audio = new Audio(url);
    audio.loop = true;
    audio.volume = volume / 100;
    audio.play().catch(() => {});
    audioRef.current = audio;
    setCurrentTrack(url);
  };

  const stopMusic = () => {
    audioRef.current?.pause();
    audioRef.current = null;
    setCurrentTrack(null);
  };

  const handleMusicUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    playTrack(URL.createObjectURL(file));
  };

  const handleWallpaper = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setWallpaper(dataUrl);
      try { localStorage.setItem("vv_focus_wallpaper", dataUrl); } catch {}
    };
    reader.readAsDataURL(file);
  };

  const clearWallpaper = () => {
    setWallpaper(null);
    localStorage.removeItem("vv_focus_wallpaper");
  };

  const bgStyle = wallpaper
    ? { backgroundImage: `url(${wallpaper})`, backgroundSize: "cover", backgroundPosition: "center" }
    : {};

  const progressPct = totalSeconds > 0 ? ((totalSeconds - remaining) / totalSeconds) * 100 : 0;

  // ─── ACTIVE SESSION ─────────────────────────────────────────────────────────
  if (step === "active") {
    return (
      <div
        className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
        onMouseMove={resetHideTimer}
        onTouchStart={resetHideTimer}
      >
        {/* Layered scene engine OR custom wallpaper fallback */}
        {wallpaper ? (
          <>
            <div className="absolute inset-0" style={bgStyle} />
            <div className="absolute inset-0 bg-black/50" />
          </>
        ) : (
          <SceneEngineWrapper themeId={themeId} battery={batterySafe} intro />
        )}

        {/* Top-right controls */}
        <div className={cn(
          "absolute top-4 right-4 flex items-center gap-2 z-20 transition-opacity duration-300",
          controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none"
        )}>
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-foreground/70 h-8 w-8">
            {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => wallpaperInputRef.current?.click()} className="text-foreground/70 h-8 w-8">
            <Image className="h-4 w-4" />
          </Button>
          {wallpaper && (
            <Button variant="ghost" size="sm" onClick={clearWallpaper} className="text-foreground/60 text-xs h-8 font-body">
              Clear BG
            </Button>
          )}
          <input ref={wallpaperInputRef} type="file" accept="image/*" className="hidden" onChange={handleWallpaper} />
        </div>

        {/* Progress arc */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-border/20">
          <motion.div
            className="h-full bg-primary"
            style={{ width: `${progressPct}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>

        <div className="relative z-10 w-full max-w-sm px-6 text-center">
          <AnimatePresence mode="wait">
            {exitRequested ? (
              <motion.div key="exit" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                <AlertTriangle className="h-12 w-12 text-amber-400 mx-auto mb-4" />
                <h2 className="text-2xl font-heading font-bold mb-2 text-foreground">Hold on!</h2>
                <p className="text-muted-foreground font-body mb-4 text-sm leading-relaxed">{motivationalMsg}</p>
                <p className="text-sm text-muted-foreground font-body mb-6">
                  Studied: <span className="text-primary font-semibold">{formatTime(elapsed)}</span>
                </p>
                <div className="flex gap-3 justify-center">
                  <Button variant="outline" onClick={() => setExitRequested(false)} className="font-body gap-2">
                    <Flame className="h-4 w-4" /> Keep Going
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={confirmExit}
                    disabled={sessionMode === "strict" && exitCountdown > 0}
                    className="font-body gap-2"
                  >
                    {sessionMode === "strict" && exitCountdown > 0 ? `Wait ${exitCountdown}s` : "End Session"}
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div key="session" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="mb-4">
                  {sessionMode === "strict"
                    ? <Lock className="h-7 w-7 text-primary mx-auto mb-3 animate-pulse" />
                    : <Clock className="h-7 w-7 text-primary mx-auto mb-3" />
                  }
                  <p className="text-sm font-body text-muted-foreground font-medium uppercase tracking-widest">
                    {sessionMode === "strict" ? "Strict" : "Normal"} Focus
                  </p>
                </div>

                {/* Big countdown */}
                <div className="text-[72px] leading-none font-heading font-extrabold tabular-nums mb-2 text-gradient">
                  {formatTime(remaining)}
                </div>
                <p className="text-xs text-muted-foreground/60 font-body mb-8">
                  of {formatTime(totalSeconds)} · {Math.round(progressPct)}% complete
                </p>

                {/* Normal mode: pause button */}
                {sessionMode === "normal" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPaused(p => !p)}
                    className={cn("font-body gap-2 mb-6", controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none")}
                  >
                    {paused ? <Play className="h-4 w-4" /> : <Timer className="h-4 w-4" />}
                    {paused ? "Resume" : "Pause"}
                  </Button>
                )}

                {/* Music */}
                <div className={cn(
                  "mb-6 space-y-3 transition-opacity duration-300",
                  controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none"
                )}>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {BUILT_IN_MUSIC.map(m => (
                      <button
                        key={m.name}
                        onClick={() => currentTrack === m.url ? stopMusic() : playTrack(m.url)}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-xs font-body transition-all",
                          currentTrack === m.url
                            ? "bg-primary text-primary-foreground shadow-md shadow-primary/30"
                            : "bg-card/60 backdrop-blur text-muted-foreground hover:text-foreground border border-border/40"
                        )}
                      >
                        {currentTrack === m.url ? "⏸ " : "▶ "}{m.name}
                      </button>
                    ))}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-full text-xs font-body bg-card/60 backdrop-blur text-muted-foreground hover:text-foreground border border-border/40 transition-all flex items-center gap-1"
                    >
                      <Upload className="h-3 w-3" /> Your Music
                    </button>
                    <input ref={fileInputRef} type="file" accept="audio/*" className="hidden" onChange={handleMusicUpload} />
                  </div>
                  {currentTrack && (
                    <div className="flex items-center gap-3 px-6 max-w-xs mx-auto">
                      <Volume2 className="h-4 w-4 text-muted-foreground shrink-0" />
                      <Slider value={[volume]} onValueChange={([v]) => setVolume(v)} max={100} step={1} className="flex-1" />
                    </div>
                  )}
                </div>

                <div className={cn("transition-opacity duration-300", controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none")}>
                  <Button variant="ghost" size="sm" onClick={requestExit} className="text-muted-foreground font-body">
                    <X className="h-4 w-4 mr-1" /> End Session
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // ─── TIME PICKER ────────────────────────────────────────────────────────────
  if (step === "pick_time") {
    return (
      <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center px-5">
        {/* Ambient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-background pointer-events-none" />

        <div className="relative z-10 w-full max-w-sm">
          {/* Back button */}
          <button
            onClick={() => setStep("choose")}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm font-body mb-8 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>

          {/* Header */}
          <div className="text-center mb-8">
            <div className={cn(
              "h-14 w-14 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg",
              sessionMode === "strict"
                ? "bg-primary/10 shadow-primary/20"
                : "bg-amber-500/10 shadow-amber-500/20"
            )}>
              {sessionMode === "strict"
                ? <Lock className="h-7 w-7 text-primary" />
                : <Timer className="h-7 w-7 text-amber-500" />
              }
            </div>
            <h1 className="text-2xl font-heading font-bold mb-1">Set Your Duration</h1>
            <p className="text-sm text-muted-foreground font-body">
              {sessionMode === "strict"
                ? "You won't be able to exit immediately once you start."
                : "Take breaks whenever you need."}
            </p>
          </div>

          {/* Time wheel */}
          <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-xl">
            <TimeWheelPicker
              onConfirm={handleTimeConfirm}
              initialMinutes={sessionMode === "strict" ? 25 : 30}
            />
          </div>
        </div>
      </div>
    );
  }

  // ─── MODE SELECTION ─────────────────────────────────────────────────────────
  return (
    <Layout title="Focus Mode">
      <div className="max-w-2xl mx-auto py-8 md:py-12 px-4">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-primary/10">
            <Focus className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-heading font-extrabold tracking-tight mb-2">Focus Mode</h1>
          <p className="text-muted-foreground font-body">Choose your intensity, then set your duration.</p>
        </div>

        {/* Wallpaper controls */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <Button variant="outline" size="sm" onClick={() => wallpaperInputRef.current?.click()} className="font-body gap-2 text-xs h-8">
            <Image className="h-3.5 w-3.5" /> {wallpaper ? "Change Wallpaper" : "Set Wallpaper"}
          </Button>
          {wallpaper && (
            <Button variant="ghost" size="sm" onClick={clearWallpaper} className="font-body text-xs text-muted-foreground h-8">
              Remove
            </Button>
          )}
          <input ref={wallpaperInputRef} type="file" accept="image/*" className="hidden" onChange={handleWallpaper} />
        </div>

        {/* Mode cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => handleModeSelect("strict")}
            className="text-left p-6 rounded-2xl border-2 border-primary/20 bg-card hover:border-primary/50 hover:bg-primary/5 transition-all group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <Lock className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-lg font-heading font-bold mb-1.5">Strict Mode</h3>
              <p className="text-xs text-muted-foreground font-body leading-relaxed mb-4">
                Full-screen lockdown. No easy exit — 10-second cool-down enforced. Best for deep work.
              </p>
              <span className="inline-flex items-center gap-1.5 text-primary text-xs font-body font-semibold">
                Select & set timer <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
              </span>
            </div>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => handleModeSelect("normal")}
            className="text-left p-6 rounded-2xl border-2 border-border/50 bg-card hover:border-amber-400/40 hover:bg-amber-500/5 transition-all group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="h-11 w-11 rounded-xl bg-amber-500/10 flex items-center justify-center mb-4">
                <Timer className="h-5 w-5 text-amber-500" />
              </div>
              <h3 className="text-lg font-heading font-bold mb-1.5">Normal Mode</h3>
              <p className="text-xs text-muted-foreground font-body leading-relaxed mb-4">
                Countdown timer with pause support and ambient music. Relaxed, no penalties for breaks.
              </p>
              <span className="inline-flex items-center gap-1.5 text-amber-500 text-xs font-body font-semibold">
                Select & set timer <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
              </span>
            </div>
          </motion.button>
        </div>
      </div>
    </Layout>
  );
};

export default FocusMode;
