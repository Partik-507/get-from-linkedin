/**
 * FloatingDock — Command Center v3
 *
 * Two visual modes (single state machine):
 *   - "expanded" : full panel, draggable by header, fully resizable (8 handles)
 *   - "slab"     : low-opacity edge-attached strip, draggable along edge, click expands
 *
 * Persistence (localStorage):
 *   - vv_dock_pos        : {x,y}      panel top-left (when expanded)
 *   - vv_dock_size       : {w,h}      panel size
 *   - vv_dock_open       : boolean    expanded vs slab
 *   - vv_dock_slab_edge  : "top"|"bottom"|"left"|"right"
 *   - vv_dock_slab_offset: number     px along the edge
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import {
  Home, LayoutDashboard, Timer, StickyNote, Link2, User,
  Zap, Bell, Shield, Sun, Moon, LogOut, Search,
  RotateCcw, Maximize2, Flame, Calendar,
  Command, Clock, ChevronDown,
} from "lucide-react";
import { loadStreak } from "@/lib/spacedRepetition";

// ─── Persistence helpers ─────────────────────────────────────────────────────
const KEYS = {
  pos: "vv_dock_pos",
  size: "vv_dock_size",
  open: "vv_dock_open",
  slabEdge: "vv_dock_slab_edge",
  slabOffset: "vv_dock_slab_offset",
  mode: "vv_dock_mode",
};

interface Pos { x: number; y: number; }
interface Size { w: number; h: number; }
type Edge = "top" | "bottom" | "left" | "right";

function load<T>(key: string, fallback: T): T {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : fallback; }
  catch { return fallback; }
}
function save(key: string, val: unknown) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

const MIN_PANEL: Size = { w: 48, h: 48 };
const MAX_PANEL: Size = { w: 900, h: 1100 };
const DEFAULT_SIZE: Size = { w: 280, h: 480 };
const SLAB_LEN = 140;
const SLAB_THICK = 12;

function clampPanel(pos: Pos, size: Size): Pos {
  return {
    x: Math.max(8 - size.w + 56, Math.min(pos.x, window.innerWidth - 56)),
    y: Math.max(0, Math.min(pos.y, window.innerHeight - 56)),
  };
}

function nearestEdge(p: Pos): { edge: Edge; offset: number } {
  const W = window.innerWidth, H = window.innerHeight;
  const dists: Record<Edge, number> = { top: p.y, bottom: H - p.y, left: p.x, right: W - p.x };
  let edge: Edge = "right";
  let min = Infinity;
  (Object.keys(dists) as Edge[]).forEach((k) => { if (dists[k] < min) { min = dists[k]; edge = k; } });
  const e = edge as Edge;
  const horizontal: boolean = (e as string) === "top" || (e as string) === "bottom";
  const offset = horizontal
    ? Math.max(0, Math.min(W - SLAB_LEN, p.x - SLAB_LEN / 2))
    : Math.max(0, Math.min(H - SLAB_LEN, p.y - SLAB_LEN / 2));
  return { edge, offset };
}

function slabStyle(edge: Edge, offset: number): React.CSSProperties {
  const horizontal = edge === "top" || edge === "bottom";
  const style: Record<string, string | number> = {
    position: "fixed",
    width: horizontal ? SLAB_LEN : SLAB_THICK,
    height: horizontal ? SLAB_THICK : SLAB_LEN,
  };
  style[edge] = 0;
  style[horizontal ? "left" : "top"] = offset;
  return style as React.CSSProperties;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface FloatingDockProps {
  isFullBleed?: boolean;
  onRestoreNavbar?: () => void;
}

export const FloatingDock = ({ onRestoreNavbar }: FloatingDockProps) => {
  const { user, isGuest, isAdmin, signOut } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState<boolean>(() => load(KEYS.open, false));
  const [pos, setPos] = useState<Pos>({ x: -9999, y: -9999 });
  const [size, setSize] = useState<Size>(DEFAULT_SIZE);
  const [slabEdge, setSlabEdge] = useState<Edge>("right");
  const [slabOffset, setSlabOffset] = useState<number>(120);
  const [slabHover, setSlabHover] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Refs for drag/resize without causing re-renders
  const containerRef = useRef<HTMLDivElement>(null);
  const posRef = useRef(pos);
  const sizeRef = useRef(size);
  const slabRef = useRef({ edge: slabEdge, offset: slabOffset });

  useEffect(() => { posRef.current = pos; }, [pos]);
  useEffect(() => { sizeRef.current = size; }, [size]);
  useEffect(() => { slabRef.current = { edge: slabEdge, offset: slabOffset }; }, [slabEdge, slabOffset]);

  const streak = useMemo(() => loadStreak(), []);

  const NAV_ITEMS = useMemo(() => [
    { to: "/", icon: Home, label: "Home", color: "text-blue-500" },
    { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard", color: "text-emerald-500" },
    { to: "/study", icon: Timer, label: "Study OS", color: "text-amber-500" },
    { to: "/notes", icon: StickyNote, label: "Notes OS", color: "text-violet-500" },
    { to: "/resources", icon: Link2, label: "Resources", color: "text-cyan-500" },
    { to: "/profile", icon: User, label: "Profile", color: "text-pink-500" },
    ...(isAdmin ? [{ to: "/admin", icon: Shield, label: "Admin", color: "text-red-500" }] : []),
  ], [isAdmin]);

  const QUICK_ACTIONS = useMemo(() => [
    { icon: Zap, label: "Focus", action: () => navigate("/focus"), color: "text-amber-400" },
    { icon: Calendar, label: "Calendar", action: () => navigate("/study"), color: "text-blue-400" },
    { icon: Bell, label: "Alerts", action: () => navigate("/notifications"), color: "text-rose-400" },
    { icon: Command, label: "⌘K", action: () => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true })), color: "text-violet-400" },
  ], [navigate]);

  // ── Mount: restore state ───────────────────────────────────────────────────
  useEffect(() => {
    const sz = load<Size>(KEYS.size, DEFAULT_SIZE);
    const p = load<Pos>(KEYS.pos, {
      x: window.innerWidth - sz.w - 24,
      y: 80,
    });
    const e = load<Edge>(KEYS.slabEdge, "right");
    const o = load<number>(KEYS.slabOffset, 120);
    setSize(sz);
    setPos(clampPanel(p, sz));
    setSlabEdge(e);
    setSlabOffset(o);
    setMounted(true);
  }, []);

  // ── Re-clamp on viewport resize ────────────────────────────────────────────
  useEffect(() => {
    const h = () => {
      setPos((p) => clampPanel(p, sizeRef.current));
      // re-clamp slab
      const W = window.innerWidth, H = window.innerHeight;
      setSlabOffset((o) => {
        const max = (slabRef.current.edge === "top" || slabRef.current.edge === "bottom") ? W - SLAB_LEN : H - SLAB_LEN;
        return Math.max(0, Math.min(o, max));
      });
    };
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  // ── Toggle (open ↔ slab). Always works. ────────────────────────────────────
  const toggle = useCallback(() => {
    setOpen((prev) => {
      const next = !prev;
      save(KEYS.open, next);
      return next;
    });
  }, []);

  // ── Keyboard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "/") { e.preventDefault(); toggle(); }
      if (e.key === "Escape" && open) toggle();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, toggle]);

  // ── Universal pointer drag for panel header ───────────────────────────────
  useEffect(() => {
    if (!open) return;
    const el = containerRef.current;
    if (!el) return;

    let dragging = false;
    let startMouse = { x: 0, y: 0 };
    let startPos = { x: 0, y: 0 };
    let raf: number | null = null;

    const onDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t?.closest?.("[data-drag-handle]")) return;
      if (t.closest?.("button, input, [data-resize-dir]")) return;
      dragging = true;
      startMouse = { x: e.clientX, y: e.clientY };
      startPos = { ...posRef.current };
      try { (e.target as HTMLElement).setPointerCapture(e.pointerId); } catch {}
      e.preventDefault();
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const next = {
        x: startPos.x + (e.clientX - startMouse.x),
        y: startPos.y + (e.clientY - startMouse.y),
      };
      if (raf == null) {
        raf = requestAnimationFrame(() => {
          raf = null;
          setPos(next);
        });
      }
    };
    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      const clamped = clampPanel(posRef.current, sizeRef.current);
      setPos(clamped);
      save(KEYS.pos, clamped);
    };

    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      if (raf != null) cancelAnimationFrame(raf);
    };
  }, [open]);

  // ── Resize handles (panel only) ───────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const el = containerRef.current;
    if (!el) return;

    let dir: string | null = null;
    let startMouse = { x: 0, y: 0 };
    let startPos = { x: 0, y: 0 };
    let startSize = { w: 0, h: 0 };
    let raf: number | null = null;

    const onDown = (e: PointerEvent) => {
      const handle = (e.target as HTMLElement | null)?.closest?.("[data-resize-dir]") as HTMLElement | null;
      if (!handle) return;
      dir = handle.dataset.resizeDir!;
      startMouse = { x: e.clientX, y: e.clientY };
      startPos = { ...posRef.current };
      startSize = { ...sizeRef.current };
      try { handle.setPointerCapture(e.pointerId); } catch {}
      e.preventDefault();
      e.stopPropagation();
    };

    const onMove = (e: PointerEvent) => {
      if (!dir) return;
      const dx = e.clientX - startMouse.x;
      const dy = e.clientY - startMouse.y;
      let { w, h } = startSize;
      let { x, y } = startPos;
      if (dir.includes("e")) w = startSize.w + dx;
      if (dir.includes("s")) h = startSize.h + dy;
      if (dir.includes("w")) { w = startSize.w - dx; x = startPos.x + dx; }
      if (dir.includes("n")) { h = startSize.h - dy; y = startPos.y + dy; }
      const newW = Math.max(MIN_PANEL.w, Math.min(MAX_PANEL.w, w));
      const newH = Math.max(MIN_PANEL.h, Math.min(MAX_PANEL.h, h));
      // adjust pos if w/h was clamped on west/north resize
      if (dir.includes("w")) x = startPos.x + (startSize.w - newW);
      if (dir.includes("n")) y = startPos.y + (startSize.h - newH);
      const newSize = { w: newW, h: newH };
      const newPos = { x, y };
      if (raf == null) {
        raf = requestAnimationFrame(() => {
          raf = null;
          setSize(newSize);
          setPos(newPos);
        });
      }
    };

    const onUp = () => {
      if (!dir) return;
      dir = null;
      const clamped = clampPanel(posRef.current, sizeRef.current);
      setPos(clamped);
      save(KEYS.pos, clamped);
      save(KEYS.size, sizeRef.current);
    };

    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      if (raf != null) cancelAnimationFrame(raf);
    };
  }, [open]);

  // ── Slab drag (when collapsed) ────────────────────────────────────────────
  const slabDragRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (open) return;
    const el = slabDragRef.current;
    if (!el) return;

    let dragging = false;
    let moved = false;
    let startMouse = { x: 0, y: 0 };
    let raf: number | null = null;

    const onDown = (e: PointerEvent) => {
      dragging = true;
      moved = false;
      startMouse = { x: e.clientX, y: e.clientY };
      try { el.setPointerCapture(e.pointerId); } catch {}
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      // 5px deadzone — anything below counts as a tap, not a drag
      if (Math.abs(e.clientX - startMouse.x) > 5 || Math.abs(e.clientY - startMouse.y) > 5) moved = true;
      if (!moved) return;
      if (raf == null) {
        raf = requestAnimationFrame(() => {
          raf = null;
          const { edge, offset } = nearestEdge({ x: e.clientX, y: e.clientY });
          setSlabEdge(edge);
          setSlabOffset(offset);
        });
      }
    };
    const onUp = (_e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      if (moved) {
        save(KEYS.slabEdge, slabRef.current.edge);
        save(KEYS.slabOffset, slabRef.current.offset);
      } else {
        // tap → expand (the onClick fallback also covers cases where pointerup misses)
        toggle();
      }
    };

    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      if (raf != null) cancelAnimationFrame(raf);
    };
  }, [open, toggle]);

  const resetPanel = useCallback(() => {
    const sz = DEFAULT_SIZE;
    const p = clampPanel({ x: window.innerWidth - sz.w - 24, y: 80 }, sz);
    setSize(sz);
    setPos(p);
    save(KEYS.size, sz);
    save(KEYS.pos, p);
  }, []);

  // Guards
  if (!user && !isGuest) return null;
  if (!mounted) return null;

  // Panel mostly desktop; on small screens, hide entirely (mobile uses bottom nav)
  // BUT slab is shown on all screens when collapsed (so user can always access it).

  const filteredNav = searchQuery
    ? NAV_ITEMS.filter((i) => i.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : NAV_ITEMS;

  const panelBg = resolvedTheme === "dark"
    ? "rgba(18, 18, 26, 0.96)"
    : "rgba(255, 255, 255, 0.97)";

  // ── SLAB MODE ─────────────────────────────────────────────────────────────
  // Slab is visible on ALL screens (incl. mobile) so the dock is always reachable.
  if (!open) {
    const horizontal = slabEdge === "top" || slabEdge === "bottom";
    return (
      <div
        ref={slabDragRef}
        onClick={(e) => {
          // Click fallback (in case pointer events miss): only toggle if not currently dragging.
          // The pointer-event flow above already handles drag-then-tap; this catches simple clicks.
          if (e.detail > 0) toggle();
        }}
        className={cn(
          "z-[2147483647] select-none touch-none cursor-pointer rounded-full",
          "bg-gradient-to-r from-primary to-[hsl(240,70%,50%)] shadow-lg shadow-primary/30",
          "transition-opacity duration-200 pointer-events-auto",
        )}
        style={{
          ...slabStyle(slabEdge, slabOffset),
          opacity: slabHover ? 0.95 : 0.55,
        }}
        onPointerEnter={() => setSlabHover(true)}
        onPointerLeave={() => setSlabHover(false)}
        title="Open Command Center (drag to move, tap to open)"
        aria-label="Open command center"
      >
        <span className="sr-only">Command center slab</span>
      </div>
    );
  }

  // ── EXPANDED PANEL ────────────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      className="fixed z-[2147483647] select-none touch-none pointer-events-auto hidden md:block"
      style={{ left: pos.x, top: pos.y }}
    >
      <div
        className={cn(
          "relative rounded-2xl overflow-hidden",
          "border border-border/40",
          "shadow-2xl shadow-black/20",
          "flex flex-col",
        )}
        style={{
          width: size.w,
          height: size.h,
          background: panelBg,
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
        }}
      >
        {/* Header (drag handle) */}
        <div
          data-drag-handle
          className="flex items-center justify-between px-3 py-2 border-b border-border/20 cursor-grab active:cursor-grabbing shrink-0"
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-5 w-5 rounded-md bg-gradient-to-br from-primary to-[hsl(240,70%,50%)] flex items-center justify-center text-primary-foreground font-bold text-[8px] shrink-0">V</div>
            {size.w >= 160 && (
              <span className="text-xs font-heading font-bold text-foreground/80 truncate">VivaVault</span>
            )}
            {size.w >= 220 && streak.current > 0 && (
              <span className="text-[10px] font-body font-medium text-[hsl(var(--streak))] bg-[hsl(var(--streak))]/10 px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shrink-0">
                <Flame className="h-2.5 w-2.5" /> {streak.current}d
              </span>
            )}
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); resetPanel(); }}
              className="h-6 w-6 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
              title="Reset size & position"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); toggleTheme(); }}
              className="h-6 w-6 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
              title="Toggle theme"
            >
              {resolvedTheme === "dark" ? <Moon className="h-3 w-3" /> : <Sun className="h-3 w-3" />}
            </button>
            {onRestoreNavbar && (
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); onRestoreNavbar(); toggle(); }}
                className="h-6 w-6 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                title="Show full navbar"
              >
                <Maximize2 className="h-3 w-3" />
              </button>
            )}
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); toggle(); }}
              className="h-6 w-6 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
              title="Collapse to slab (Ctrl+/)"
            >
              <ChevronDown className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Body — only show full content when not in icon-only mode */}
        {size.w >= 180 && size.h >= 180 ? (
          <>
            {/* Search */}
            <div className="px-2.5 py-2 shrink-0">
              <div className="flex items-center gap-2 h-8 px-2.5 rounded-xl bg-muted/40 border border-border/20 transition-colors focus-within:border-primary/40 focus-within:bg-muted/60">
                <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <input
                  type="text"
                  placeholder="Search or jump to…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent text-xs font-body text-foreground placeholder:text-muted-foreground/60 outline-none"
                  autoComplete="off"
                />
                {size.w >= 240 && (
                  <kbd className="text-[9px] text-muted-foreground/50 bg-muted/60 px-1 py-0.5 rounded font-mono">⌘/</kbd>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            {size.w >= 220 && (
              <div className="px-2.5 pb-1.5 shrink-0">
                <div className="grid grid-cols-4 gap-1">
                  {QUICK_ACTIONS.map((qa) => (
                    <button
                      key={qa.label}
                      type="button"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => { e.stopPropagation(); qa.action(); }}
                      className="flex flex-col items-center gap-1 py-2 rounded-xl hover:bg-muted/40 transition-colors group"
                    >
                      <div className="h-8 w-8 rounded-xl bg-muted/30 flex items-center justify-center group-hover:bg-primary/10 group-hover:scale-105 transition-all">
                        <qa.icon className={cn("h-3.5 w-3.5", qa.color)} />
                      </div>
                      <span className="text-[9px] font-body text-muted-foreground group-hover:text-foreground transition-colors">{qa.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-1.5 py-1 min-h-0">
              {size.w >= 200 && (
                <p className="text-[9px] font-body font-semibold text-muted-foreground/60 uppercase tracking-widest px-2 mb-1">Navigation</p>
              )}
              {filteredNav.map((item) => {
                const active = item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to);
                return (
                  <button
                    key={item.to}
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => { e.stopPropagation(); navigate(item.to); }}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-2.5 py-[7px] rounded-xl text-left transition-all duration-100 text-[13px] font-body",
                      active ? "bg-primary/10 text-primary font-medium" : "text-foreground/70 hover:bg-muted/40 hover:text-foreground"
                    )}
                  >
                    <item.icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : item.color)} />
                    {size.w >= 180 && <span className="truncate flex-1">{item.label}</span>}
                    {active && size.w >= 180 && <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />}
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            {size.h >= 320 && (
              <div className="border-t border-border/20 px-2.5 py-2 flex items-center gap-2 shrink-0">
                {user ? (
                  <>
                    <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary to-[hsl(240,70%,50%)] flex items-center justify-center text-primary-foreground text-[10px] font-bold shrink-0">
                      {(user.displayName || user.email || "U")[0].toUpperCase()}
                    </div>
                    {size.w >= 220 && (
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-body font-medium truncate">{user.displayName || "Student"}</p>
                        <p className="text-[9px] font-body text-muted-foreground/60 truncate">{user.email}</p>
                      </div>
                    )}
                    <button
                      type="button"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => { e.stopPropagation(); signOut(); }}
                      className="h-6 w-6 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                      title="Sign out"
                    >
                      <LogOut className="h-3 w-3" />
                    </button>
                  </>
                ) : isGuest ? (
                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => { e.stopPropagation(); navigate("/auth"); }}
                    className="w-full h-8 rounded-xl bg-primary text-primary-foreground text-xs font-body font-medium hover:bg-primary/90 transition-colors"
                  >
                    Sign In
                  </button>
                ) : null}
              </div>
            )}
          </>
        ) : (
          // ─── Icon-only mode (very small) ───
          <div className="flex-1 flex flex-col items-center gap-1 py-2 overflow-y-auto">
            {NAV_ITEMS.slice(0, 5).map((item) => {
              const active = item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to);
              return (
                <button
                  key={item.to}
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); navigate(item.to); }}
                  className={cn(
                    "h-8 w-8 rounded-xl flex items-center justify-center transition-colors",
                    active ? "bg-primary/15 text-primary" : "text-foreground/70 hover:bg-muted/40"
                  )}
                  title={item.label}
                >
                  <item.icon className={cn("h-4 w-4", active ? "text-primary" : item.color)} />
                </button>
              );
            })}
          </div>
        )}

        {/* Resize handles — edges */}
        <div data-resize-dir="n"  className="absolute left-2 right-2 top-0 h-1.5 cursor-ns-resize touch-none z-[2]" />
        <div data-resize-dir="s"  className="absolute left-2 right-2 bottom-0 h-1.5 cursor-ns-resize touch-none z-[2]" />
        <div data-resize-dir="w"  className="absolute top-2 bottom-2 left-0 w-1.5 cursor-ew-resize touch-none z-[2]" />
        <div data-resize-dir="e"  className="absolute top-2 bottom-2 right-0 w-1.5 cursor-ew-resize touch-none z-[2]" />
        {/* Corners */}
        <div data-resize-dir="nw" className="absolute left-0 top-0    w-3.5 h-3.5 cursor-nwse-resize touch-none z-[3]" />
        <div data-resize-dir="ne" className="absolute right-0 top-0   w-3.5 h-3.5 cursor-nesw-resize touch-none z-[3]" />
        <div data-resize-dir="sw" className="absolute left-0 bottom-0 w-3.5 h-3.5 cursor-nesw-resize touch-none z-[3]" />
        <div data-resize-dir="se" className="absolute right-0 bottom-0 w-3.5 h-3.5 cursor-nwse-resize touch-none z-[3]" />
      </div>
    </div>
  );
};

// ─── useDockMode ──────────────────────────────────────────────────────────────
// Persists "dock" vs "navbar" mode and dispatches a window resize on switch
// so child pages (Notes, StudyMode) recompute 100dvh-based heights.
export function useDockMode() {
  const [mode, setMode] = useState<"dock" | "navbar">(() => load<"dock" | "navbar">(KEYS.mode, "dock"));
  const switchToDock = useCallback(() => {
    setMode("dock");
    save(KEYS.mode, "dock");
    setTimeout(() => window.dispatchEvent(new Event("resize")), 50);
  }, []);
  const switchToNavbar = useCallback(() => {
    setMode("navbar");
    save(KEYS.mode, "navbar");
    setTimeout(() => window.dispatchEvent(new Event("resize")), 50);
  }, []);
  return { mode, switchToDock, switchToNavbar };
}
