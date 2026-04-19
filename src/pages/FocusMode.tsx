import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { TimeWheelPicker } from "@/components/TimeWheelPicker";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { saveFocusSession } from "@/lib/firestoreSync";
import {
  Focus, Timer, Lock, Flame, AlertTriangle,
  ArrowLeft, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SceneEngine } from "@/components/focus/SceneEngine";
import { getThemeById, DEFAULT_THEME_ID } from "@/lib/focusThemes";
import { ThemePicker } from "@/components/focus/ThemePicker";
import { MusicPicker } from "@/components/focus/MusicPicker";
import { AnimationPicker } from "@/components/focus/AnimationPicker";
import { TimerStylePicker, type TimerStyle } from "@/components/focus/TimerStylePicker";
import { TimerCanvas } from "@/components/focus/TimerCanvas";
import { FocusHub, type FocusHubAction } from "@/components/focus/FocusHub";
import { SessionGreeting } from "@/components/focus/SessionGreeting";
import { FocusSessionComplete } from "@/components/FocusSessionComplete";
import { getTrackById, getAllTracks } from "@/lib/focusMusicLibrary";
import { cacheAsset } from "@/lib/focusAssetCache";

const MOTIVATIONAL = [
  "Stay focused. Every minute matters.",
  "Don't break the flow now.",
  "Champions are made in moments like these.",
  "Consistency is key. You've got this.",
  "Stay committed.",
];

type Step = "choose" | "pick_time" | "greeting" | "active" | "complete";
type SessionMode = "strict" | "normal";

const FocusMode = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [step, setStep] = useState<Step>("choose");
  const [sessionMode, setSessionMode] = useState<SessionMode>("strict");
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [exitRequested, setExitRequested] = useState(false);
  const [exitCountdown, setExitCountdown] = useState(10);
  const [motivationalMsg, setMotivationalMsg] = useState("");

  // Theme / music / animation / timer style — all persisted
  const [themeId, setThemeId] = useState<string>(() => localStorage.getItem("vv_focus_theme") || DEFAULT_THEME_ID);
  const [batterySafe, setBatterySafe] = useState<boolean>(() => localStorage.getItem("vv_focus_battery") === "1");
  const [trackId, setTrackId] = useState<string | null>(() => localStorage.getItem("vv_focus_track"));
  const [volume, setVolume] = useState<number>(() => parseInt(localStorage.getItem("vv_focus_volume") || "50", 10));
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [timerStyle, setTimerStyleState] = useState<TimerStyle>(() => (localStorage.getItem("vv_focus_timerStyle") as TimerStyle) || "ring");
  const [uiHidden, setUiHidden] = useState(false);

  // Picker visibility
  const [pickerOpen, setPickerOpen] = useState<null | "theme" | "music" | "animation" | "timer">(null);

  // Draggable timer position
  const [timerPos, setTimerPos] = useState<{ x: number; y: number }>(() => {
    try { return JSON.parse(localStorage.getItem("vv_focus_timerPos") || "{}") as any; } catch { return { x: 0, y: 0 }; }
  });

  useEffect(() => { localStorage.setItem("vv_focus_theme", themeId); }, [themeId]);
  useEffect(() => { localStorage.setItem("vv_focus_battery", batterySafe ? "1" : "0"); }, [batterySafe]);
  useEffect(() => { if (trackId) localStorage.setItem("vv_focus_track", trackId); }, [trackId]);
  useEffect(() => { localStorage.setItem("vv_focus_volume", String(volume)); }, [volume]);
  useEffect(() => { localStorage.setItem("vv_focus_timerStyle", timerStyle); }, [timerStyle]);
  useEffect(() => { localStorage.setItem("vv_focus_timerPos", JSON.stringify(timerPos)); }, [timerPos]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sessionStartTime = useRef<number>(0);

  // Countdown
  useEffect(() => {
    if (step !== "active" || paused || exitRequested) return;
    const id = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) { clearInterval(id); handleSessionComplete(); return 0; }
        return r - 1;
      });
      setElapsed((e) => e + 1);
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, paused, exitRequested]);

  // Exit countdown
  useEffect(() => {
    if (!exitRequested || exitCountdown <= 0) return;
    const t = setTimeout(() => setExitCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [exitRequested, exitCountdown]);

  // Audio engine
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume / 100;
  }, [volume]);

  const playTrack = useCallback(async (id: string) => {
    const track = getTrackById(id);
    if (!track) return;
    audioRef.current?.pause();
    const localUrl = await cacheAsset(track.url);
    const audio = new Audio(localUrl);
    audio.loop = true;
    audio.volume = volume / 100;
    audio.play().then(() => setMusicPlaying(true)).catch(() => setMusicPlaying(false));
    audioRef.current = audio;
  }, [volume]);

  const stopMusic = () => {
    audioRef.current?.pause();
    setMusicPlaying(false);
  };

  const handleSelectTrack = (id: string) => {
    setTrackId(id);
    playTrack(id);
  };

  const handleToggleMusic = () => {
    if (!audioRef.current) {
      if (trackId) playTrack(trackId);
      return;
    }
    if (audioRef.current.paused) {
      audioRef.current.play().then(() => setMusicPlaying(true)).catch(() => {});
    } else {
      audioRef.current.pause();
      setMusicPlaying(false);
    }
  };

  // Handlers
  const handleModeSelect = (mode: SessionMode) => {
    setSessionMode(mode);
    setStep("pick_time");
  };

  const handleTimeConfirm = (secs: number) => {
    setTotalSeconds(secs);
    setRemaining(secs);
    setElapsed(0);
    setPaused(false);
    setStep("greeting");
    sessionStartTime.current = Date.now();
    if (sessionMode === "strict") {
      document.documentElement.requestFullscreen?.().catch(() => {});
    }
    if (trackId) playTrack(trackId);
  };

  const handleGreetingDone = () => setStep("active");

  const handleSessionComplete = async () => {
    stopMusic();
    document.exitFullscreen?.().catch(() => {});
    setStep("complete");
  };

  const handleSaveComplete = async (_mood: number, _note: string) => {
    if (user && elapsed > 10) {
      await saveFocusSession(user.uid, {
        duration: elapsed, mode: sessionMode,
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
    setExitRequested(false);
    setStep("complete");
  };

  const handleHubAction = (a: FocusHubAction) => {
    if (a === "toggle-hide") setUiHidden((h) => !h);
    else setPickerOpen(a as any);
  };

  const progressPct = totalSeconds > 0 ? ((totalSeconds - remaining) / totalSeconds) * 100 : 0;

  // ── ACTIVE / GREETING / COMPLETE ──
  if (step === "greeting") {
    return <SessionGreeting userName={user?.displayName?.split(" ")[0]} onComplete={handleGreetingDone} />;
  }

  if (step === "complete") {
    return (
      <FocusSessionComplete
        focusDuration={Math.floor(elapsed / 60)}
        focusMode={sessionMode}
        onSave={handleSaveComplete}
      />
    );
  }

  if (step === "active") {
    const theme = getThemeById(themeId) || getThemeById(DEFAULT_THEME_ID)!;
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden">
        <SceneEngine theme={theme} battery={batterySafe} intro />

        {/* Progress arc */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-white/10 z-10">
          <motion.div className="h-full bg-primary" style={{ width: `${progressPct}%` }} transition={{ duration: 0.5 }} />
        </div>

        {/* Mode badge */}
        <div className={cn("absolute top-4 left-4 z-10 px-3 py-1 rounded-full backdrop-blur-md text-[11px] font-body uppercase tracking-widest flex items-center gap-1.5",
          uiHidden ? "opacity-10" : "opacity-100",
          "bg-black/40 text-white/90 border border-white/15"
        )}>
          {sessionMode === "strict" ? <Lock className="h-3 w-3" /> : <Timer className="h-3 w-3" />}
          {sessionMode}
        </div>

        {/* Draggable timer */}
        <motion.div
          drag
          dragMomentum={false}
          dragConstraints={{ left: -window.innerWidth / 2 + 100, right: window.innerWidth / 2 - 100, top: -window.innerHeight / 2 + 100, bottom: window.innerHeight / 2 - 200 }}
          initial={{ x: timerPos.x || 0, y: timerPos.y || 0 }}
          onDragEnd={(_, info) => setTimerPos({ x: info.point.x, y: info.point.y })}
          className="relative z-10 cursor-grab active:cursor-grabbing"
        >
          <TimerCanvas style={timerStyle} remaining={remaining} total={totalSeconds} hidden={uiHidden} />
        </motion.div>

        {/* End session button */}
        {!uiHidden && !exitRequested && (
          <button
            onClick={requestExit}
            className="absolute top-4 right-4 z-10 h-8 px-3 rounded-full bg-black/40 backdrop-blur-md border border-white/15 text-white/80 text-xs font-body hover:bg-black/60"
          >
            End
          </button>
        )}

        {/* Exit confirmation */}
        <AnimatePresence>
          {exitRequested && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-30 grid place-items-center bg-black/60 backdrop-blur-sm px-6"
            >
              <div className="max-w-sm w-full bg-card rounded-3xl p-6 text-center border border-border/60 shadow-2xl">
                <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
                <h2 className="text-xl font-heading font-bold mb-2">Hold on!</h2>
                <p className="text-muted-foreground font-body text-sm mb-5">{motivationalMsg}</p>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setExitRequested(false)}>
                    <Flame className="h-4 w-4 mr-1" /> Keep going
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    disabled={sessionMode === "strict" && exitCountdown > 0}
                    onClick={confirmExit}
                  >
                    {sessionMode === "strict" && exitCountdown > 0 ? `Wait ${exitCountdown}s` : "End"}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating control hub */}
        <FocusHub uiHidden={uiHidden} onAction={handleHubAction} />

        {/* Pickers */}
        <ThemePicker
          open={pickerOpen === "theme"}
          selectedId={themeId}
          battery={batterySafe}
          onSelect={setThemeId}
          onToggleBattery={() => setBatterySafe((b) => !b)}
          onClose={() => setPickerOpen(null)}
        />
        <MusicPicker
          open={pickerOpen === "music"}
          selectedId={trackId}
          volume={volume}
          isPlaying={musicPlaying}
          onSelect={handleSelectTrack}
          onTogglePlay={handleToggleMusic}
          onVolumeChange={setVolume}
          onClose={() => setPickerOpen(null)}
        />
        <AnimationPicker
          open={pickerOpen === "animation"}
          selectedKey="none"
          onSelect={() => { /* hook in when SceneEngine accepts dynamic overlays */ }}
          onClose={() => setPickerOpen(null)}
        />
        <TimerStylePicker
          open={pickerOpen === "timer"}
          selectedStyle={timerStyle}
          onSelect={setTimerStyleState}
          onClose={() => setPickerOpen(null)}
        />
      </div>
    );
  }

  // ── TIME PICKER ──
  if (step === "pick_time") {
    return (
      <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center px-5">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-background pointer-events-none" />
        <div className="relative z-10 w-full max-w-sm">
          <button onClick={() => setStep("choose")} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm font-body mb-8">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <div className="text-center mb-8">
            <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg",
              sessionMode === "strict" ? "bg-primary/10 shadow-primary/20" : "bg-amber-500/10")}>
              {sessionMode === "strict" ? <Lock className="h-7 w-7 text-primary" /> : <Timer className="h-7 w-7 text-amber-500" />}
            </div>
            <h1 className="text-2xl font-heading font-bold mb-1">Set Your Duration</h1>
            <p className="text-sm text-muted-foreground font-body">
              {sessionMode === "strict" ? "You won't be able to exit immediately." : "Take breaks whenever you need."}
            </p>
          </div>
          <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-xl">
            <TimeWheelPicker onConfirm={handleTimeConfirm} initialMinutes={sessionMode === "strict" ? 25 : 30} />
          </div>
        </div>
      </div>
    );
  }

  // ── MODE SELECTION ──
  return (
    <Layout title="Focus Mode">
      <div className="max-w-2xl mx-auto py-8 md:py-12 px-4">
        <div className="text-center mb-10">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-primary/10">
            <Focus className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-heading font-extrabold tracking-tight mb-2">Focus Mode</h1>
          <p className="text-muted-foreground font-body">Choose your intensity, then set your duration.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => handleModeSelect("strict")}
            className="text-left p-6 rounded-2xl border-2 border-primary/20 bg-card hover:border-primary/50 hover:bg-primary/5 transition-all group relative overflow-hidden"
          >
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
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => handleModeSelect("normal")}
            className="text-left p-6 rounded-2xl border-2 border-border/50 bg-card hover:border-amber-400/40 hover:bg-amber-500/5 transition-all group relative overflow-hidden"
          >
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
          </motion.button>
        </div>
      </div>
    </Layout>
  );
};

export default FocusMode;
