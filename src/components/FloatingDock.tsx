/**
 * FloatingDock — Unified single-element draggable + resizable command center
 *
 * ONE container: collapses to a small draggable icon, expands to full panel.
 * Toggle icon lives INSIDE the panel (at bottom). No separate floating element.
 *
 * Drag:  collapsed → drag whole icon anywhere
 *        expanded  → drag by grabbing the header [data-drag-handle]
 * Resize: edges + corners when expanded. Supports both width and height.
 * Persist: position, size, open state — all in localStorage.
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

// ═══════════════════════════════════════════════════════════════════════════════
// Persistence
// ═══════════════════════════════════════════════════════════════════════════════

const KEYS = {
  pos: "vv_dock_pos",
  panelSize: "vv_dock_panel_size",
  panelOpen: "vv_dock_panel_open",
  mode: "vv_dock_mode",
};

interface Pos { x: number; y: number }
interface Size { w: number; h: number }

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

function save(key: string, val: unknown) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

const ICON_W = 48;
const ICON_H = 48;

function clampPos(pos: Pos, w: number, h: number): Pos {
  const maxX = Math.max(0, window.innerWidth - 56);
  const maxY = Math.max(0, window.innerHeight - 56);
  return {
    x: Math.max(-(w - 56), Math.min(pos.x, maxX)),
    y: Math.max(0, Math.min(pos.y, maxY)),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// useDrag — native pointer drag. Returns a ref that is true for ~150ms after a drag ends.
// ═══════════════════════════════════════════════════════════════════════════════

function useDrag(
  ref: React.RefObject<HTMLElement | null>,
  onMove: (pos: Pos) => void,
  onEnd: (pos: Pos) => void,
  handleSelector?: string,
) {
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });
  const lastPos = useRef({ x: 0, y: 0 });
  const startMouse = useRef({ x: 0, y: 0 });
  const wasDragged = useRef(false);
  /** Stays true for ~150ms after drag ends — use in onClick to suppress panel toggle */
  const justDragged = useRef(false);
  const rafId = useRef<number | null>(null);
  const queued = useRef<Pos | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const target = handleSelector
      ? (el.querySelector(handleSelector) as HTMLElement | null)
      : el;
    if (!target) return;

    const onDown = (e: PointerEvent) => {
      if (handleSelector && !(e.target as HTMLElement)?.closest?.(handleSelector)) return;
      dragging.current = true;
      wasDragged.current = false;
      startMouse.current = { x: e.clientX, y: e.clientY };
      const rect = el.getBoundingClientRect();
      offset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      try { target.setPointerCapture(e.pointerId); } catch {}
      e.preventDefault();
    };

    const onMoveHandler = (e: PointerEvent) => {
      if (!dragging.current) return;
      const dx = e.clientX - startMouse.current.x;
      const dy = e.clientY - startMouse.current.y;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) wasDragged.current = true;
      const pos = { x: e.clientX - offset.current.x, y: e.clientY - offset.current.y };
      lastPos.current = pos;
      queued.current = pos;
      if (rafId.current == null) {
        rafId.current = window.requestAnimationFrame(() => {
          rafId.current = null;
          if (queued.current) onMove(queued.current);
        });
      }
    };

    const onUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      if (rafId.current != null) { window.cancelAnimationFrame(rafId.current); rafId.current = null; }
      const didDrag = wasDragged.current;
      wasDragged.current = false;
      if (didDrag) {
        justDragged.current = true;
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => { justDragged.current = false; }, 150);
        onEnd(lastPos.current);
      }
    };

    target.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMoveHandler);
    window.addEventListener("pointerup", onUp);

    return () => {
      target.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMoveHandler);
      window.removeEventListener("pointerup", onUp);
      if (rafId.current != null) { window.cancelAnimationFrame(rafId.current); rafId.current = null; }
    };
  }, [ref, onMove, onEnd, handleSelector]);

  return justDragged;
}

// ═══════════════════════════════════════════════════════════════════════════════
// useResize — multi-handle resize (edges + corners)
// ═══════════════════════════════════════════════════════════════════════════════

type ResizeDir = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

function useResize(options: {
  panelRef: React.RefObject<HTMLElement | null>;
  onResize: (next: { pos: Pos; size: Size }) => void;
  onEnd: (next: { pos: Pos; size: Size }) => void;
  getStart: () => { pos: Pos; size: Size };
  min: Size;
  max: Size;
  enabled: boolean;
}) {
  const { panelRef, onResize, onEnd, getStart, min, max, enabled } = options;
  const activeDir = useRef<ResizeDir | null>(null);
  const resizing = useRef(false);
  const startMouse = useRef({ x: 0, y: 0 });
  const start = useRef<{ pos: Pos; size: Size }>({ pos: { x: 0, y: 0 }, size: { w: 280, h: 480 } });
  const last = useRef<{ pos: Pos; size: Size }>(start.current);
  const rafId = useRef<number | null>(null);
  const queued = useRef<{ pos: Pos; size: Size } | null>(null);

  const apply = useCallback((next: { pos: Pos; size: Size }) => {
    queued.current = next;
    if (rafId.current == null) {
      rafId.current = window.requestAnimationFrame(() => {
        rafId.current = null;
        if (queued.current) onResize(queued.current);
      });
    }
  }, [onResize]);

  useEffect(() => {
    if (!enabled) return;
    const el = panelRef.current;
    if (!el) return;

    const onDown = (e: PointerEvent) => {
      const handle = (e.target as HTMLElement | null)?.closest?.("[data-resize-dir]") as HTMLElement | null;
      const dir = (handle?.dataset?.resizeDir as ResizeDir | undefined) ?? null;
      if (!dir) return;
      resizing.current = true;
      activeDir.current = dir;
      startMouse.current = { x: e.clientX, y: e.clientY };
      start.current = getStart();
      last.current = start.current;
      handle.setPointerCapture(e.pointerId);
      e.preventDefault();
      e.stopPropagation();
    };

    const onMove = (e: PointerEvent) => {
      if (!resizing.current || !activeDir.current) return;
      const dx = e.clientX - startMouse.current.x;
      const dy = e.clientY - startMouse.current.y;
      const dir = activeDir.current;

      let { x, y } = start.current.pos;
      let { w, h } = start.current.size;

      if (dir.includes("e")) w = start.current.size.w + dx;
      if (dir.includes("w")) { w = start.current.size.w - dx; x = start.current.pos.x + dx; }
      if (dir.includes("s")) h = start.current.size.h + dy;
      if (dir.includes("n")) { h = start.current.size.h - dy; y = start.current.pos.y + dy; }

      const nextSize: Size = {
        w: Math.max(min.w, Math.min(max.w, w)),
        h: Math.max(min.h, Math.min(max.h, h)),
      };
      const nextPos: Pos = { x, y };
      if (dir.includes("w")) nextPos.x = start.current.pos.x + (start.current.size.w - nextSize.w);
      if (dir.includes("n")) nextPos.y = start.current.pos.y + (start.current.size.h - nextSize.h);

      const next = { pos: nextPos, size: nextSize };
      last.current = next;
      apply(next);
    };

    const onUp = () => {
      if (!resizing.current) return;
      resizing.current = false;
      activeDir.current = null;
      if (rafId.current != null) { window.cancelAnimationFrame(rafId.current); rafId.current = null; }
      onEnd(last.current);
    };

    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      if (rafId.current != null) { window.cancelAnimationFrame(rafId.current); rafId.current = null; }
    };
  }, [panelRef, apply, onEnd, getStart, min.h, min.w, max.h, max.w, enabled]);
}

// ═══════════════════════════════════════════════════════════════════════════════
// FloatingDock Component
// ═══════════════════════════════════════════════════════════════════════════════

interface FloatingDockProps {
  isFullBleed?: boolean;
  onRestoreNavbar?: () => void;
}

const DEFAULT_PANEL_SIZE: Size = { w: 280, h: 480 };
const MIN_PANEL: Size = { w: 200, h: 300 };
const MAX_PANEL: Size = { w: 720, h: 900 };

export const FloatingDock = ({ isFullBleed, onRestoreNavbar }: FloatingDockProps) => {
  const { user, isGuest, isAdmin, signOut } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  // ── State ──────────────────────────────────────────────────────────────────
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<Pos>({ x: -200, y: -200 });
  const [panelSize, setPanelSize] = useState<Size>(DEFAULT_PANEL_SIZE);
  const [panelOpen, setPanelOpen] = useState(false);
  const [idle, setIdle] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const posRef = useRef<Pos>({ x: 0, y: 0 });
  const panelSizeRef = useRef<Size>(DEFAULT_PANEL_SIZE);
  const containerRef = useRef<HTMLDivElement>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout>>();

  const streak = useMemo(() => loadStreak(), []);

  // ── NAV ─────────────────────────────────────────────────────────────────────
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

  const recentIds = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("vv_recent_notes") || "[]") as string[]; }
    catch { return []; }
  }, []);

  // ── Mount: restore persisted state ────────────────────────────────────────
  useEffect(() => {
    const savedPos = load<Pos>(KEYS.pos, {
      x: window.innerWidth - 68,
      y: window.innerHeight - 100,
    });
    const savedSize = load<Size>(KEYS.panelSize, DEFAULT_PANEL_SIZE);
    const savedOpen = load<boolean>(KEYS.panelOpen, false);

    const clamped = clampPos(savedPos, savedSize.w, savedSize.h);
    setPos(clamped);
    posRef.current = clamped;
    setPanelSize(savedSize);
    panelSizeRef.current = savedSize;
    setPanelOpen(savedOpen);
    setMounted(true);
  }, []);

  // ── Viewport resize: re-clamp ────────────────────────────────────────────
  useEffect(() => {
    const handler = () => {
      const clamped = clampPos(posRef.current, panelSizeRef.current.w, panelSizeRef.current.h);
      setPos(clamped);
      posRef.current = clamped;
    };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  // ── Idle fade ────────────────────────────────────────────────────────────
  const resetIdle = useCallback(() => {
    setIdle(false);
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setIdle(true), 5000);
  }, []);

  useEffect(() => {
    resetIdle();
    const events = ["mousemove", "touchstart", "keydown", "scroll"];
    events.forEach(e => window.addEventListener(e, resetIdle, { passive: true }));
    return () => {
      events.forEach(e => window.removeEventListener(e, resetIdle));
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [resetIdle]);

  // ── Keyboard: Ctrl+/ toggle, Esc close ──────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "/") {
        e.preventDefault();
        setPanelOpen(p => { const next = !p; save(KEYS.panelOpen, next); return next; });
      }
      if (e.key === "Escape" && panelOpen) {
        setPanelOpen(false);
        save(KEYS.panelOpen, false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [panelOpen]);

  // ── Drag ─────────────────────────────────────────────────────────────────
  const handleMove = useCallback((p: Pos) => {
    setPos(p);
    posRef.current = p;
  }, []);

  const handleEnd = useCallback((p: Pos) => {
    const clamped = clampPos(p, panelSizeRef.current.w, panelSizeRef.current.h);
    setPos(clamped);
    posRef.current = clamped;
    save(KEYS.pos, clamped);
  }, []);

  // When collapsed: drag whole container. When open: drag via header only.
  const justDragged = useDrag(
    containerRef,
    handleMove,
    handleEnd,
    panelOpen ? "[data-drag-handle]" : undefined,
  );

  // ── Resize ────────────────────────────────────────────────────────────────
  const getResizeStart = useCallback(() => ({
    pos: posRef.current,
    size: panelSizeRef.current,
  }), []);

  useResize({
    panelRef: containerRef,
    min: MIN_PANEL,
    max: MAX_PANEL,
    getStart: getResizeStart,
    enabled: panelOpen,
    onResize: ({ pos: p, size: s }) => {
      setPanelSize(s);
      setPos(p);
      panelSizeRef.current = s;
      posRef.current = p;
    },
    onEnd: ({ pos: p, size: s }) => {
      const clamped = clampPos(p, s.w, s.h);
      setPanelSize(s);
      setPos(clamped);
      panelSizeRef.current = s;
      posRef.current = clamped;
      save(KEYS.panelSize, s);
      save(KEYS.pos, clamped);
    },
  });

  // ── Handlers ──────────────────────────────────────────────────────────────
  const toggle = useCallback(() => {
    setPanelOpen(p => { const next = !p; save(KEYS.panelOpen, next); return next; });
  }, []);

  const resetPanel = useCallback(() => {
    const size = DEFAULT_PANEL_SIZE;
    const p = clampPos({ x: window.innerWidth - size.w - 24, y: 80 }, size.w, size.h);
    setPanelSize(size);
    setPos(p);
    panelSizeRef.current = size;
    posRef.current = p;
    save(KEYS.panelSize, size);
    save(KEYS.pos, p);
  }, []);

  const handleNav = useCallback((to: string) => { navigate(to); }, [navigate]);

  // ── Guard ─────────────────────────────────────────────────────────────────
  if (!user && !isGuest) return null;
  if (!mounted) return null;

  const filteredNav = searchQuery
    ? NAV_ITEMS.filter(i => i.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : NAV_ITEMS;

  // ── Background blur/tint shared ───────────────────────────────────────────
  const panelBg = resolvedTheme === "dark"
    ? "rgba(18, 18, 26, 0.96)"
    : "rgba(255, 255, 255, 0.97)";

  return (
    <div
      ref={containerRef}
      className="fixed z-[2147483647] select-none touch-none pointer-events-auto"
      style={{ left: pos.x, top: pos.y }}
    >
      {!panelOpen ? (
        /* ══════════ COLLAPSED ICON ══════════ */
        <button
          className={cn(
            "h-12 w-12 rounded-2xl flex items-center justify-center",
            "bg-gradient-to-br from-primary to-[hsl(240,70%,50%)]",
            "text-primary-foreground",
            "shadow-xl shadow-primary/25",
            "transition-all duration-300 ease-out",
            "hover:shadow-primary/50 hover:scale-110 active:scale-95",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
            idle ? "opacity-35" : "opacity-100",
          )}
          style={{ cursor: "grab" }}
          onClick={() => {
            if (justDragged.current) return;
            toggle();
          }}
          aria-label="Open command center"
          title="Command Center (Ctrl+/)"
        >
          <span className="font-bold text-sm select-none pointer-events-none">V</span>
        </button>
      ) : (
        /* ══════════ EXPANDED PANEL ══════════ */
        <div
          className={cn(
            "rounded-2xl overflow-hidden",
            "border border-border/40",
            "shadow-2xl shadow-black/20",
            "flex flex-col",
          )}
          style={{
            width: panelSize.w,
            height: panelSize.h,
            background: panelBg,
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
          }}
        >
          {/* Header — drag handle */}
          <div
            data-drag-handle
            className="flex items-center justify-between px-3 py-2 border-b border-border/20 cursor-grab active:cursor-grabbing shrink-0"
          >
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded-md bg-gradient-to-br from-primary to-[hsl(240,70%,50%)] flex items-center justify-center text-primary-foreground font-bold text-[8px] shrink-0">V</div>
              <span className="text-xs font-heading font-bold text-foreground/80">VivaVault</span>
              {streak.current > 0 && (
                <span className="text-[10px] font-body font-medium text-[hsl(var(--streak))] bg-[hsl(var(--streak))]/10 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                  <Flame className="h-2.5 w-2.5" /> {streak.current}d
                </span>
              )}
            </div>
            <div className="flex items-center gap-0.5">
              <button
                onClick={resetPanel}
                className="h-6 w-6 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                title="Reset size & position"
              >
                <RotateCcw className="h-3 w-3" />
              </button>
              <button
                onClick={toggleTheme}
                className="h-6 w-6 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                title="Toggle theme"
              >
                {resolvedTheme === "dark" ? <Moon className="h-3 w-3" /> : <Sun className="h-3 w-3" />}
              </button>
              {onRestoreNavbar && (
                <button
                  onClick={() => { onRestoreNavbar(); toggle(); }}
                  className="h-6 w-6 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                  title="Show full navbar"
                >
                  <Maximize2 className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {/* Search */}
          <div className="px-2.5 py-2 shrink-0">
            <div className="flex items-center gap-2 h-8 px-2.5 rounded-xl bg-muted/40 border border-border/20 transition-colors focus-within:border-primary/40 focus-within:bg-muted/60">
              <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <input
                type="text"
                placeholder="Search or jump to…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-xs font-body text-foreground placeholder:text-muted-foreground/60 outline-none"
                autoComplete="off"
              />
              <kbd className="text-[9px] text-muted-foreground/50 bg-muted/60 px-1 py-0.5 rounded font-mono hidden sm:block">⌘/</kbd>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="px-2.5 pb-1.5 shrink-0">
            <div className="grid grid-cols-4 gap-1">
              {QUICK_ACTIONS.map((qa) => (
                <button
                  key={qa.label}
                  onClick={qa.action}
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

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-1.5 py-1 min-h-0">
            <p className="text-[9px] font-body font-semibold text-muted-foreground/60 uppercase tracking-widest px-2 mb-1">Navigation</p>
            {filteredNav.map((item) => {
              const active = item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to);
              return (
                <button
                  key={item.to}
                  onClick={() => handleNav(item.to)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-2.5 py-[7px] rounded-xl text-left transition-all duration-100",
                    "text-[13px] font-body",
                    active
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-foreground/70 hover:bg-muted/40 hover:text-foreground"
                  )}
                >
                  <item.icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : item.color)} />
                  <span className="truncate flex-1">{item.label}</span>
                  {active && <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />}
                </button>
              );
            })}

            {recentIds.length > 0 && (
              <>
                <p className="text-[9px] font-body font-semibold text-muted-foreground/60 uppercase tracking-widest px-2 mt-3 mb-1">Recent Notes</p>
                {recentIds.slice(0, 3).map((id) => (
                  <button
                    key={id}
                    onClick={() => navigate("/notes")}
                    className="w-full flex items-center gap-2.5 px-2.5 py-[7px] rounded-xl text-left text-[13px] font-body text-foreground/60 hover:bg-muted/40 hover:text-foreground transition-colors"
                  >
                    <Clock className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                    <span className="truncate flex-1 text-xs">Note {id.slice(0, 8)}…</span>
                  </button>
                ))}
              </>
            )}
          </div>

          {/* User footer */}
          <div className="border-t border-border/20 px-2.5 py-2 flex items-center gap-2 shrink-0">
            {user ? (
              <>
                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary to-[hsl(240,70%,50%)] flex items-center justify-center text-primary-foreground text-[10px] font-bold shrink-0">
                  {(user.displayName || user.email || "U")[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-body font-medium truncate">{user.displayName || "Student"}</p>
                  <p className="text-[9px] font-body text-muted-foreground/60 truncate">{user.email}</p>
                </div>
                <button
                  onClick={() => { signOut(); toggle(); }}
                  className="h-6 w-6 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                  title="Sign out"
                >
                  <LogOut className="h-3 w-3" />
                </button>
              </>
            ) : isGuest ? (
              <button
                onClick={() => handleNav("/auth")}
                className="w-full h-8 rounded-xl bg-primary text-primary-foreground text-xs font-body font-medium hover:bg-primary/90 transition-colors"
              >
                Sign In
              </button>
            ) : null}
          </div>

          {/* Toggle / Collapse button — lives inside panel at bottom */}
          <div className="border-t border-border/20 shrink-0">
            <button
              onClick={toggle}
              className="w-full flex items-center justify-center gap-1.5 py-2 text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors text-[10px] font-body"
              title="Collapse (Ctrl+/)"
            >
              <ChevronDown className="h-3 w-3" />
              Collapse
            </button>
          </div>

          {/* Resize handles — edges */}
          <div data-resize-dir="n" className="absolute left-2 right-2 top-0 h-1.5 cursor-ns-resize touch-none z-10" />
          <div data-resize-dir="s" className="absolute left-2 right-2 bottom-0 h-1.5 cursor-ns-resize touch-none z-10" />
          <div data-resize-dir="w" className="absolute top-2 bottom-2 left-0 w-1.5 cursor-ew-resize touch-none z-10" />
          <div data-resize-dir="e" className="absolute top-2 bottom-2 right-0 w-1.5 cursor-ew-resize touch-none z-10" />
          {/* Corners */}
          <div data-resize-dir="nw" className="absolute left-0 top-0 w-3.5 h-3.5 cursor-nwse-resize touch-none z-10" />
          <div data-resize-dir="ne" className="absolute right-0 top-0 w-3.5 h-3.5 cursor-nesw-resize touch-none z-10" />
          <div data-resize-dir="sw" className="absolute left-0 bottom-0 w-3.5 h-3.5 cursor-nesw-resize touch-none z-10" />
          <div data-resize-dir="se" className="absolute right-0 bottom-0 w-3.5 h-3.5 cursor-nwse-resize touch-none z-10" />
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// useDockMode
// ═══════════════════════════════════════════════════════════════════════════════

export function useDockMode() {
  const [mode, setMode] = useState<"dock" | "navbar">(() => load<"dock" | "navbar">(KEYS.mode, "dock"));

  const switchToDock = useCallback(() => { setMode("dock"); save(KEYS.mode, "dock"); }, []);
  const switchToNavbar = useCallback(() => { setMode("navbar"); save(KEYS.mode, "navbar"); }, []);

  return { mode, switchToDock, switchToNavbar };
}
