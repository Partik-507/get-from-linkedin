import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { saveFocusSession } from "@/lib/firestoreSync";
import { Play, Pause, RotateCcw, Sun, Moon, Music, Upload, ArrowLeft, Volume2, Image } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCallback } from "react";

const BUILT_IN_MUSIC = [
  { name: "Lo-fi Beats", url: "https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3" },
  { name: "Rain Sounds", url: "https://cdn.pixabay.com/audio/2022/03/10/audio_4dedf5bf94.mp3" },
  { name: "Nature Ambient", url: "https://cdn.pixabay.com/audio/2022/08/23/audio_d16737dc28.mp3" },
];

const TimerMode = () => {
  const navigate = useNavigate();
  const { resolvedTheme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const [seconds, setSeconds] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [initialTime, setInitialTime] = useState(25);
  const [currentTrack, setCurrentTrack] = useState<string | null>(null);
  const [volume, setVolume] = useState(50);
  const [wallpaper, setWallpaper] = useState<string | null>(() => localStorage.getItem("vv_focus_wallpaper"));
  const [controlsVisible, setControlsVisible] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const wallpaperInputRef = useRef<HTMLInputElement>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sessionStartRef = useRef<number>(0);

  useEffect(() => {
    if (!isRunning) return;
    if (seconds <= 0) {
      setIsRunning(false);
      // Save session
      if (user) {
        const elapsed = initialTime * 60;
        saveFocusSession(user.uid, { duration: elapsed, mode: "normal", date: new Date().toISOString().split("T")[0] });
      }
      return;
    }
    const interval = setInterval(() => setSeconds((s) => s - 1), 1000);
    return () => clearInterval(interval);
  }, [isRunning, seconds, user, initialTime]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume / 100;
  }, [volume]);

  // Auto-hide controls
  const resetHideTimer = useCallback(() => {
    setControlsVisible(true);
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    hideTimeoutRef.current = setTimeout(() => setControlsVisible(false), 3000);
  }, []);

  useEffect(() => {
    const handleMouseMove = () => resetHideTimer();
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("touchstart", handleMouseMove);
    resetHideTimer();
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchstart", handleMouseMove);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, [resetHideTimer]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const reset = () => { setIsRunning(false); setSeconds(initialTime * 60); };

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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const progress = initialTime > 0 ? ((initialTime * 60 - seconds) / (initialTime * 60)) * 100 : 0;
  const circumference = 2 * Math.PI * 140;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const bgStyle = wallpaper
    ? { backgroundImage: `url(${wallpaper})`, backgroundSize: "cover", backgroundPosition: "center" }
    : {};

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 transition-colors relative" style={bgStyle}>
      {wallpaper && <div className="absolute inset-0 bg-black/40" />}
      {!wallpaper && <div className="absolute inset-0 bg-background" />}

      {/* Top bar - auto-hide */}
      <div className={cn(
        "fixed top-4 left-4 right-4 flex justify-between items-center z-10 transition-opacity duration-300",
        controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none"
      )}>
        <Button variant="ghost" size="icon" onClick={() => { stopMusic(); navigate("/focus"); }} className="h-8 w-8">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => wallpaperInputRef.current?.click()} className="h-8 w-8">
            <Image className="h-4 w-4" />
          </Button>
          {wallpaper && (
            <Button variant="ghost" size="sm" onClick={clearWallpaper} className="text-xs font-body h-8">
              Clear BG
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-8 w-8">
            {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
        <input ref={wallpaperInputRef} type="file" accept="image/*" className="hidden" onChange={handleWallpaper} />
      </div>

      {/* Timer circle */}
      <div className="relative mb-10 z-[1]">
        <svg width="320" height="320" viewBox="0 0 320 320" className="transform -rotate-90">
          <circle cx="160" cy="160" r="140" fill="none" stroke="hsl(var(--border))" strokeWidth="5" opacity={wallpaper ? 0.3 : 0.6} />
          <circle cx="160" cy="160" r="140" fill="none" stroke="hsl(var(--primary))" strokeWidth="5" strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} className="transition-all duration-1000" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("text-6xl font-heading font-extrabold tabular-nums", wallpaper && "text-white drop-shadow-lg")}>{formatTime(seconds)}</span>
          <span className={cn("text-sm font-body mt-2", wallpaper ? "text-white/70" : "text-muted-foreground")}>
            {isRunning ? "Studying..." : "Ready"}
          </span>
        </div>
      </div>

      {/* Duration picker */}
      {!isRunning && seconds === initialTime * 60 && (
        <div className={cn("flex gap-2 mb-6 z-[1] transition-opacity duration-300", controlsVisible ? "opacity-100" : "opacity-0")}>
          {[15, 25, 45, 60].map((m) => (
            <button key={m} onClick={() => { setInitialTime(m); setSeconds(m * 60); }}
              className={cn("px-4 py-2 rounded-full text-sm font-body transition-all",
                initialTime === m ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground")}>
              {m}m
            </button>
          ))}
        </div>
      )}

      {/* Controls */}
      <div className={cn("flex items-center gap-4 mb-10 z-[1] transition-opacity duration-300", controlsVisible ? "opacity-100" : "opacity-0")}>
        <Button variant="outline" size="icon" onClick={reset} className="h-12 w-12 rounded-full">
          <RotateCcw className="h-5 w-5" />
        </Button>
        <Button size="icon" onClick={() => { if (!isRunning) sessionStartRef.current = Date.now(); setIsRunning(!isRunning); }}
          className="h-16 w-16 rounded-full bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
          {isRunning ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-0.5" />}
        </Button>
      </div>

      {/* Music */}
      <div className={cn("w-full max-w-sm space-y-4 z-[1] transition-opacity duration-300", controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none")}>
        <div className="flex items-center gap-2 justify-center">
          <Music className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-body text-muted-foreground">Study Music</span>
        </div>
        <div className="flex flex-wrap gap-2 justify-center">
          {BUILT_IN_MUSIC.map((m) => (
            <button key={m.name} onClick={() => currentTrack === m.url ? stopMusic() : playTrack(m.url)}
              className={cn("px-4 py-2 rounded-full text-xs font-body transition-all",
                currentTrack === m.url ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground")}>
              {currentTrack === m.url ? "⏸ " : "▶ "}{m.name}
            </button>
          ))}
          <button onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 rounded-full text-xs font-body bg-secondary text-muted-foreground hover:text-foreground transition-all flex items-center gap-1.5">
            <Upload className="h-3 w-3" /> Your Music
          </button>
          <input ref={fileInputRef} type="file" accept="audio/*" className="hidden" onChange={handleFileUpload} />
        </div>
        {currentTrack && (
          <div className="flex items-center gap-3 px-4">
            <Volume2 className="h-4 w-4 text-muted-foreground shrink-0" />
            <Slider value={[volume]} onValueChange={([v]) => setVolume(v)} max={100} step={1} className="flex-1" />
          </div>
        )}
      </div>
    </div>
  );
};

export default TimerMode;
