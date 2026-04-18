/**
 * AudioEngine — preloads & plays a focus track from local Cache Storage.
 * Falls back silently if fetch fails. Crossfades between tracks (200ms).
 */
import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX, Play, Pause } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { cacheAsset } from "@/lib/focusAssetCache";
import { cn } from "@/lib/utils";

interface Props {
  url?: string;
  label?: string;
  initialVolume?: number; // 0..100
  className?: string;
  autoPlay?: boolean;
}

export const AudioEngine = ({ url, label, initialVolume = 40, className, autoPlay = false }: Props) => {
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(initialVolume);
  const [muted, setMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Build / swap audio element when url changes
  useEffect(() => {
    let cancelled = false;
    if (!url) return;
    (async () => {
      const localUrl = await cacheAsset(url);
      if (cancelled) return;
      // Crossfade-out previous
      const prev = audioRef.current;
      if (prev) {
        const fade = setInterval(() => {
          prev.volume = Math.max(0, prev.volume - 0.1);
          if (prev.volume <= 0.01) { clearInterval(fade); prev.pause(); }
        }, 20);
      }
      const audio = new Audio(localUrl);
      audio.loop = true;
      audio.volume = 0;
      audio.preload = "auto";
      audioRef.current = audio;
      if (autoPlay) {
        audio.play().then(() => {
          setPlaying(true);
          // Fade-in
          const target = muted ? 0 : volume / 100;
          const fade = setInterval(() => {
            if (!audioRef.current) { clearInterval(fade); return; }
            audioRef.current.volume = Math.min(target, audioRef.current.volume + 0.05);
            if (audioRef.current.volume >= target - 0.01) clearInterval(fade);
          }, 20);
        }).catch(() => { /* user gesture required */ });
      }
    })();
    return () => {
      cancelled = true;
      audioRef.current?.pause();
      audioRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  // Sync volume / mute
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = muted ? 0 : volume / 100;
  }, [volume, muted]);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) { a.play().then(() => setPlaying(true)).catch(() => {}); }
    else { a.pause(); setPlaying(false); }
  };

  if (!url) return null;

  return (
    <div className={cn("flex items-center gap-2.5 px-3 py-2 rounded-full bg-black/30 backdrop-blur border border-white/10 text-white/90", className)}>
      <button
        onClick={toggle}
        className="h-7 w-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
        aria-label={playing ? "Pause" : "Play"}
      >
        {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
      </button>
      {label && <span className="text-[11px] font-body max-w-[80px] truncate">{label}</span>}
      <button onClick={() => setMuted((m) => !m)} className="text-white/70 hover:text-white">
        {muted || volume === 0 ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
      </button>
      <div className="w-20">
        <Slider value={[muted ? 0 : volume]} onValueChange={([v]) => { setVolume(v); setMuted(false); }} max={100} step={1} />
      </div>
    </div>
  );
};
