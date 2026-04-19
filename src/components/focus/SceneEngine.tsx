/**
 * SceneEngine — layered focus-room renderer.
 *
 *   <img>   = pre-cached high-quality background
 *   <canvas> = real-time particle overlays (rain / snow / dust / glow)
 *
 * Targets 60fps, auto-throttles to 30fps when frame budget exceeds 25ms.
 * In "battery" mode the canvas is paused entirely (static image only).
 */
import { useEffect, useRef, useState } from "react";
import type { FocusTheme, OverlayConfig } from "@/lib/focusThemes";
import { cacheAsset } from "@/lib/focusAssetCache";
import { cn } from "@/lib/utils";

interface Props {
  theme: FocusTheme;
  battery?: boolean;
  className?: string;
  /** Show a soft entrance vignette + greeting overlay for the first ~1.5s */
  intro?: boolean;
}

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  size: number;
  alpha: number;
  phase?: number;
}

export const SceneEngine = ({ theme, battery = false, className, intro = false }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [bgUrl, setBgUrl] = useState<string>(theme.baseImage);
  const [bgLoaded, setBgLoaded] = useState(false);
  const [showIntro, setShowIntro] = useState(intro);

  // Cache background on mount
  useEffect(() => {
    let cancelled = false;
    cacheAsset(theme.baseImage).then((url) => { if (!cancelled) setBgUrl(url); });
    return () => { cancelled = true; };
  }, [theme.baseImage]);

  // Hide intro after delay
  useEffect(() => {
    if (!intro) return;
    setShowIntro(true);
    const t = setTimeout(() => setShowIntro(false), 1800);
    return () => clearTimeout(t);
  }, [intro, theme.id]);

  // Particle system
  useEffect(() => {
    if (battery) return; // Battery mode → no animation
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let particles: { layer: OverlayConfig; items: Particle[] }[] = [];
    let lastFrame = performance.now();
    let throttle = 1; // 1 = 60fps, 2 = 30fps
    let frameSkip = 0;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const sizeCanvas = () => {
      const { clientWidth, clientHeight } = canvas;
      canvas.width = clientWidth * dpr;
      canvas.height = clientHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    sizeCanvas();

    const initParticles = () => {
      const W = canvas.clientWidth;
      const H = canvas.clientHeight;
      particles = theme.overlays.map((layer) => {
        const intensity = layer.intensity ?? 0.5;
        let count = 0;
        if (layer.type === "rain") count = Math.floor(W * H / 4500 * intensity);
        else if (layer.type === "snow") count = Math.floor(W * H / 8000 * intensity);
        else if (layer.type === "dust") count = Math.floor(W * H / 18000 * intensity);
        else if (layer.type === "blossom") count = Math.floor(W * H / 12000 * intensity);
        else if (layer.type === "leaves") count = Math.floor(W * H / 14000 * intensity);
        else if (layer.type === "fireflies") count = Math.floor(W * H / 16000 * intensity);
        else count = 1; // glow / gradient-drift / candle = single layer
        const items: Particle[] = [];
        for (let i = 0; i < count; i++) {
          const speed = layer.speed ?? 1;
          if (layer.type === "rain") {
            items.push({ x: Math.random() * W, y: Math.random() * H, vx: -1.2 * speed, vy: 14 * speed, size: 1 + Math.random() * 1, alpha: 0.3 + Math.random() * 0.4 });
          } else if (layer.type === "snow") {
            items.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 0.6 * speed, vy: 0.6 + Math.random() * 1.2 * speed, size: 1.5 + Math.random() * 2.5, alpha: 0.5 + Math.random() * 0.5, phase: Math.random() * Math.PI * 2 });
          } else if (layer.type === "dust") {
            items.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 0.3, vy: -0.2 - Math.random() * 0.4, size: 0.8 + Math.random() * 1.4, alpha: 0.15 + Math.random() * 0.3, phase: Math.random() * Math.PI * 2 });
          } else if (layer.type === "blossom") {
            items.push({ x: Math.random() * W, y: Math.random() * H, vx: -0.6 * speed, vy: 0.5 + Math.random() * 0.8 * speed, size: 3 + Math.random() * 3, alpha: 0.6 + Math.random() * 0.3, phase: Math.random() * Math.PI * 2 });
          } else if (layer.type === "leaves") {
            items.push({ x: Math.random() * W, y: Math.random() * H, vx: -0.8 * speed, vy: 0.7 + Math.random() * 1.0 * speed, size: 4 + Math.random() * 4, alpha: 0.55 + Math.random() * 0.35, phase: Math.random() * Math.PI * 2 });
          } else if (layer.type === "fireflies") {
            items.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 0.4 * speed, vy: (Math.random() - 0.5) * 0.4 * speed, size: 1.5 + Math.random() * 1.5, alpha: 0.5 + Math.random() * 0.5, phase: Math.random() * Math.PI * 2 });
          } else {
            items.push({ x: W / 2, y: H / 2, vx: 0, vy: 0, size: Math.max(W, H) * 0.6, alpha: 0, phase: 0 });
          }
        }
        return { layer, items };
      });
    };

    initParticles();

    const onResize = () => { sizeCanvas(); initParticles(); };
    window.addEventListener("resize", onResize);

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      const dt = now - lastFrame;
      lastFrame = now;
      frameSkip++;
      if (frameSkip < throttle) return;
      frameSkip = 0;

      // Auto-throttle if rendering is heavy
      if (dt > 28 && throttle === 1) throttle = 2;
      else if (dt < 18 && throttle === 2) throttle = 1;

      const W = canvas.clientWidth;
      const H = canvas.clientHeight;
      ctx.clearRect(0, 0, W, H);

      for (const { layer, items } of particles) {
        if (layer.type === "rain") {
          ctx.strokeStyle = layer.color || "rgba(180, 200, 230, 0.45)";
          ctx.lineWidth = 1;
          for (const p of items) {
            ctx.globalAlpha = p.alpha;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x + p.vx * 1.5, p.y + p.vy * 1.5);
            ctx.stroke();
            p.x += p.vx;
            p.y += p.vy;
            if (p.y > H) { p.y = -10; p.x = Math.random() * W; }
            if (p.x < -10) p.x = W + 10;
          }
        } else if (layer.type === "snow") {
          ctx.fillStyle = layer.color || "rgba(255, 255, 255, 0.85)";
          for (const p of items) {
            p.phase = (p.phase || 0) + 0.02;
            ctx.globalAlpha = p.alpha;
            ctx.beginPath();
            ctx.arc(p.x + Math.sin(p.phase) * 8, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            p.x += p.vx;
            p.y += p.vy;
            if (p.y > H + 5) { p.y = -5; p.x = Math.random() * W; }
            if (p.x < -10) p.x = W + 10;
            else if (p.x > W + 10) p.x = -10;
          }
        } else if (layer.type === "dust") {
          ctx.fillStyle = layer.color || "rgba(255, 220, 180, 0.5)";
          for (const p of items) {
            p.phase = (p.phase || 0) + 0.012;
            ctx.globalAlpha = p.alpha * (0.5 + Math.sin(p.phase) * 0.5);
            ctx.beginPath();
            ctx.arc(p.x + Math.cos(p.phase) * 4, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            p.x += p.vx;
            p.y += p.vy;
            if (p.y < -5) p.y = H + 5;
            if (p.x < -5) p.x = W + 5;
            else if (p.x > W + 5) p.x = -5;
          }
        } else if (layer.type === "glow") {
          for (const p of items) {
            p.phase = (p.phase || 0) + 0.008;
            const pulse = 0.7 + Math.sin(p.phase) * 0.3;
            const grad = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, p.size * pulse);
            grad.addColorStop(0, layer.color || "rgba(255, 200, 120, 0.25)");
            grad.addColorStop(1, "rgba(0,0,0,0)");
            ctx.globalAlpha = 1;
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, W, H);
          }
        } else if (layer.type === "blossom") {
          ctx.fillStyle = layer.color || "rgba(255, 192, 203, 0.85)";
          for (const p of items) {
            p.phase = (p.phase || 0) + 0.025;
            ctx.globalAlpha = p.alpha;
            const sx = p.x + Math.sin(p.phase) * 12;
            ctx.beginPath();
            // 5-petal flower
            for (let i = 0; i < 5; i++) {
              const a = (i / 5) * Math.PI * 2 + p.phase * 0.3;
              ctx.ellipse(sx + Math.cos(a) * p.size * 0.6, p.y + Math.sin(a) * p.size * 0.6,
                p.size * 0.5, p.size * 0.3, a, 0, Math.PI * 2);
            }
            ctx.fill();
            p.x += p.vx;
            p.y += p.vy;
            if (p.y > H + 10) { p.y = -10; p.x = Math.random() * W; }
            if (p.x < -20) p.x = W + 20;
          }
        } else if (layer.type === "leaves") {
          for (const p of items) {
            p.phase = (p.phase || 0) + 0.018;
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = layer.color || (p.size > 6 ? "rgba(220, 130, 50, 0.85)" : "rgba(200, 160, 60, 0.8)");
            const sx = p.x + Math.sin(p.phase) * 18;
            ctx.save();
            ctx.translate(sx, p.y);
            ctx.rotate(p.phase * 0.7);
            ctx.beginPath();
            ctx.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            p.x += p.vx;
            p.y += p.vy;
            if (p.y > H + 10) { p.y = -10; p.x = Math.random() * W; }
            if (p.x < -20) p.x = W + 20;
          }
        } else if (layer.type === "fireflies") {
          for (const p of items) {
            p.phase = (p.phase || 0) + 0.04;
            const flicker = 0.4 + Math.abs(Math.sin(p.phase)) * 0.6;
            ctx.globalAlpha = p.alpha * flicker;
            const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4);
            grad.addColorStop(0, layer.color || "rgba(255, 240, 150, 1)");
            grad.addColorStop(1, "rgba(255, 240, 150, 0)");
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2);
            ctx.fill();
            p.x += p.vx + Math.sin(p.phase * 0.7) * 0.3;
            p.y += p.vy + Math.cos(p.phase * 0.5) * 0.3;
            if (p.x < 0) p.x = W;
            if (p.x > W) p.x = 0;
            if (p.y < 0) p.y = H;
            if (p.y > H) p.y = 0;
          }
        } else if (layer.type === "gradient-drift") {
          for (const p of items) {
            p.phase = (p.phase || 0) + 0.003 * (layer.speed ?? 1);
            const cx = W / 2 + Math.cos(p.phase) * W * 0.3;
            const cy = H / 2 + Math.sin(p.phase * 1.3) * H * 0.25;
            const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.7);
            grad.addColorStop(0, layer.color || "rgba(120, 80, 200, 0.35)");
            grad.addColorStop(1, "rgba(0,0,0,0)");
            ctx.globalAlpha = (layer.intensity ?? 0.5);
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, W, H);
          }
        } else if (layer.type === "candle") {
          for (const p of items) {
            p.phase = (p.phase || 0) + 0.08 + Math.random() * 0.04;
            const flicker = 0.7 + Math.abs(Math.sin(p.phase * 3)) * 0.3;
            const cx = W * 0.85;
            const cy = H * 0.7;
            const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 240 * flicker);
            grad.addColorStop(0, "rgba(255, 180, 80, 0.6)");
            grad.addColorStop(0.4, "rgba(255, 140, 60, 0.25)");
            grad.addColorStop(1, "rgba(0,0,0,0)");
            ctx.globalAlpha = (layer.intensity ?? 0.5);
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, W, H);
          }
        }
      }
      ctx.globalAlpha = 1;
    };

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [theme, battery]);

  return (
    <div className={cn("absolute inset-0 overflow-hidden", className)}>
      {/* Base image */}
      <img
        src={bgUrl}
        alt=""
        onLoad={() => setBgLoaded(true)}
        className={cn(
          "absolute inset-0 w-full h-full object-cover transition-opacity duration-700",
          bgLoaded ? "opacity-100" : "opacity-0"
        )}
        draggable={false}
      />
      {/* Vignette tint for legibility */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/50 pointer-events-none" />

      {/* Particle canvas */}
      {!battery && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />
      )}

      {/* Intro greeting */}
      {showIntro && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center bg-black/30 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="text-center animate-in zoom-in-95 duration-500">
            <p className="text-5xl mb-3">{theme.emoji}</p>
            <p className="text-white/90 font-heading font-semibold text-xl tracking-wide">{theme.name}</p>
            <p className="text-white/60 font-body text-sm mt-1">{theme.description}</p>
          </div>
        </div>
      )}
    </div>
  );
};
