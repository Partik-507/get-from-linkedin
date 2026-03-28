import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/contexts/ThemeContext";
import {
  Focus, Timer, Lock, X, Flame, ArrowRight, AlertTriangle,
  Sun, Moon, Music, Upload, Volume2, Image,
} from "lucide-react";
import { cn } from "@/lib/utils";

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

const FocusMode = () => {
  const navigate = useNavigate();
  const { resolvedTheme, toggleTheme } = useTheme();
  const [mode, setMode] = useState<"choose" | "strict" | null>("choose");
  const [strictActive, setStrictActive] = useState(false);
  const [exitRequested, setExitRequested] = useState(false);
  const [exitCountdown, setExitCountdown] = useState(10);
  const [studyTimer, setStudyTimer] = useState(0);
  const [motivationalMsg, setMotivationalMsg] = useState("");
  const [currentTrack, setCurrentTrack] = useState<string | null>(null);
  const [volume, setVolume] = useState(50);
  const [wallpaper, setWallpaper] = useState<string | null>(() => localStorage.getItem("vv_focus_wallpaper"));
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const wallpaperInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!strictActive) return;
    const interval = setInterval(() => setStudyTimer((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [strictActive]);

  useEffect(() => {
    if (!exitRequested) return;
    if (exitCountdown <= 0) return;
    const timer = setTimeout(() => setExitCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [exitRequested, exitCountdown]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume / 100;
  }, [volume]);

  const startStrict = useCallback(() => {
    setMode(null);
    setStrictActive(true);
    setStudyTimer(0);
    document.documentElement.requestFullscreen?.().catch(() => {});
  }, []);

  const requestExit = () => {
    setMotivationalMsg(MOTIVATIONAL[Math.floor(Math.random() * MOTIVATIONAL.length)]);
    setExitRequested(true);
    setExitCountdown(10);
  };

  const confirmExit = () => {
    stopMusic();
    document.exitFullscreen?.().catch(() => {});
    setStrictActive(false);
    setExitRequested(false);
  };

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h > 0 ? `${h}:` : ""}${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const playTrack = (url: string) => {
    if (audioRef.current) audioRef.current.pause();
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

  // Strict mode fullscreen overlay
  if (strictActive) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center" style={bgStyle}>
        {wallpaper && <div className="absolute inset-0 bg-black/50" />}
        {!wallpaper && <div className="absolute inset-0 bg-background" />}

        {/* Top bar controls */}
        <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-foreground/70 hover:text-foreground">
            {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => wallpaperInputRef.current?.click()} className="text-foreground/70 hover:text-foreground">
            <Image className="h-4 w-4" />
          </Button>
          {wallpaper && (
            <Button variant="ghost" size="sm" onClick={clearWallpaper} className="text-foreground/70 hover:text-foreground text-xs font-body">
              Clear BG
            </Button>
          )}
          <input ref={wallpaperInputRef} type="file" accept="image/*" className="hidden" onChange={handleWallpaper} />
        </div>

        <div className="relative z-10 w-full max-w-md px-6">
          <AnimatePresence>
            {exitRequested ? (
              <motion.div
                key="exit"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="text-center"
              >
                <AlertTriangle className="h-12 w-12 text-[hsl(38,92%,50%)] mx-auto mb-4" />
                <h2 className="text-2xl font-heading font-bold mb-3 text-foreground">Wait! Don't go yet</h2>
                <p className="text-muted-foreground font-body mb-6 leading-relaxed">{motivationalMsg}</p>
                <p className="text-sm text-muted-foreground font-body mb-6">
                  You've studied for <span className="text-primary font-semibold">{formatTime(studyTimer)}</span>
                </p>
                <div className="flex gap-3 justify-center">
                  <Button variant="outline" onClick={() => setExitRequested(false)} className="font-body gap-2">
                    <Flame className="h-4 w-4" /> Keep Studying
                  </Button>
                  <Button variant="destructive" onClick={confirmExit} disabled={exitCountdown > 0} className="font-body gap-2">
                    {exitCountdown > 0 ? `Wait ${exitCountdown}s` : "Exit Session"}
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div key="study" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
                <div className="mb-8">
                  <Lock className="h-8 w-8 text-primary mx-auto mb-4 animate-pulse" />
                  <h1 className="text-4xl font-heading font-extrabold mb-2 text-foreground">Focus Session</h1>
                  <p className="text-muted-foreground font-body">Stay committed. You're doing great.</p>
                </div>
                <div className="text-7xl font-heading font-extrabold tabular-nums mb-8 text-gradient">
                  {formatTime(studyTimer)}
                </div>

                {/* Music controls */}
                <div className="mb-6 space-y-3">
                  <div className="flex items-center gap-2 justify-center">
                    <Music className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-body text-muted-foreground">Study Music</span>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {BUILT_IN_MUSIC.map((m) => (
                      <button
                        key={m.name}
                        onClick={() => currentTrack === m.url ? stopMusic() : playTrack(m.url)}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-xs font-body transition-all",
                          currentTrack === m.url
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary/60 text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {currentTrack === m.url ? "⏸ " : "▶ "}{m.name}
                      </button>
                    ))}
                    <button onClick={() => fileInputRef.current?.click()} className="px-3 py-1.5 rounded-full text-xs font-body bg-secondary/60 text-muted-foreground hover:text-foreground transition-all flex items-center gap-1">
                      <Upload className="h-3 w-3" /> Your Music
                    </button>
                    <input ref={fileInputRef} type="file" accept="audio/*" className="hidden" onChange={handleMusicUpload} />
                  </div>
                  {currentTrack && (
                    <div className="flex items-center gap-3 px-8 max-w-xs mx-auto">
                      <Volume2 className="h-4 w-4 text-muted-foreground shrink-0" />
                      <Slider value={[volume]} onValueChange={([v]) => setVolume(v)} max={100} step={1} className="flex-1" />
                    </div>
                  )}
                </div>

                <p className="text-sm text-muted-foreground font-body mb-4">
                  Press Escape or click below to request exit
                </p>
                <Button variant="ghost" size="sm" onClick={requestExit} className="text-muted-foreground font-body">
                  <X className="h-4 w-4 mr-1" /> End Session
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  return (
    <Layout title="Focus Mode">
      <div className="max-w-2xl mx-auto py-12">
        <div className="text-center mb-12">
          <Focus className="h-12 w-12 text-primary mx-auto mb-4" />
          <h1 className="text-3xl sm:text-4xl font-heading font-extrabold tracking-tight mb-3">Focus Mode</h1>
          <p className="text-muted-foreground font-body text-lg">Choose your study intensity</p>
        </div>

        {/* Wallpaper picker */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <Button variant="outline" size="sm" onClick={() => wallpaperInputRef.current?.click()} className="font-body gap-2 text-xs">
            <Image className="h-3.5 w-3.5" /> {wallpaper ? "Change Wallpaper" : "Set Wallpaper"}
          </Button>
          {wallpaper && (
            <Button variant="ghost" size="sm" onClick={clearWallpaper} className="font-body text-xs text-muted-foreground">
              Remove
            </Button>
          )}
          <input ref={wallpaperInputRef} type="file" accept="image/*" className="hidden" onChange={handleWallpaper} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={startStrict}
            className="text-left p-8 rounded-2xl border-2 border-primary/30 bg-card hover:border-primary/60 transition-all group"
          >
            <Lock className="h-8 w-8 text-primary mb-4" />
            <h3 className="text-xl font-heading font-bold mb-2">Strict Mode</h3>
            <p className="text-sm text-muted-foreground font-body leading-relaxed mb-4">
              Full-screen lockdown with music. No easy exit. A 10-second cool-down before you can leave.
            </p>
            <span className="inline-flex items-center gap-1.5 text-primary text-sm font-body font-medium">
              Enter Strict Mode <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
            </span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate("/timer")}
            className="text-left p-8 rounded-2xl border-2 border-border/50 bg-card hover:border-primary/30 transition-all group"
          >
            <Timer className="h-8 w-8 text-[hsl(38,92%,50%)] mb-4" />
            <h3 className="text-xl font-heading font-bold mb-2">Normal Mode</h3>
            <p className="text-sm text-muted-foreground font-body leading-relaxed mb-4">
              A simple timer with ambient study music and wallpaper support. Minimal and distraction-free.
            </p>
            <span className="inline-flex items-center gap-1.5 text-[hsl(38,92%,50%)] text-sm font-body font-medium">
              Open Timer <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
            </span>
          </motion.button>
        </div>
      </div>
    </Layout>
  );
};

export default FocusMode;