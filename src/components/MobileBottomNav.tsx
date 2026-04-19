/**
 * MobileBottomNav — Production-grade native tab bar.
 *
 *  Layout:  [Home] [Dashboard] [Study]  ⊕FAB  [Notes] [Resources] [Me]
 *
 * Design rules (from user feedback):
 *  - 7 visible items including the FAB (the FAB IS the center "tab").
 *  - FAB is `absolute` centered, NOT a flex child → cannot shift on tap.
 *  - Single premium purple→indigo gradient. No multi-color rainbow.
 *  - No scale-on-tap for FAB (kills "moving" feel). Brightness only.
 *  - Active state: 4px purple dot below the icon (no jiggle pill).
 *  - Renders on every mobile route. Layout no longer hides it.
 */
import { Link, useLocation } from "react-router-dom";
import {
  Home, LayoutDashboard, Timer, StickyNote, Link2, User, Plus,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { QuickActionSheet } from "@/components/QuickActionSheet";
import type { LucideIcon } from "lucide-react";

interface NavItem { to: string; icon: LucideIcon; label: string; }

const LEFT: NavItem[] = [
  { to: "/",          icon: Home,            label: "Home" },
  { to: "/dashboard", icon: LayoutDashboard, label: "Dash" },
  { to: "/study",     icon: Timer,           label: "Study" },
];
const RIGHT: NavItem[] = [
  { to: "/notes",     icon: StickyNote,      label: "Notes" },
  { to: "/resources", icon: Link2,           label: "Library" },
  { to: "/profile",   icon: User,            label: "Me" },
];

const Tab = ({ item, active }: { item: NavItem; active: boolean }) => {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      aria-current={active ? "page" : undefined}
      className="flex-1 h-full flex flex-col items-center justify-center gap-0.5 relative active:opacity-70 transition-opacity"
    >
      <Icon
        className={cn(
          "h-[22px] w-[22px] transition-colors",
          active ? "text-primary" : "text-muted-foreground/70",
        )}
        strokeWidth={active ? 2.4 : 1.8}
      />
      <span
        className={cn(
          "text-[10px] font-medium font-body leading-none transition-colors",
          active ? "text-primary" : "text-muted-foreground/70",
        )}
      >
        {item.label}
      </span>
      {/* Active dot — sits below label, no layout-shift animation */}
      <span
        className={cn(
          "absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-primary transition-opacity",
          active ? "opacity-100" : "opacity-0",
        )}
      />
    </Link>
  );
};

export const MobileBottomNav = () => {
  const location = useLocation();
  const [quickOpen, setQuickOpen] = useState(false);
  const isActive = (to: string) =>
    to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-[200] md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        aria-label="Primary"
      >
        <div className="relative h-[60px] bg-card/85 backdrop-blur-2xl border-t border-border/60 supports-[backdrop-filter]:bg-card/70 flex items-stretch">
          {/* Left tabs */}
          {LEFT.map((it) => <Tab key={it.to} item={it} active={isActive(it.to)} />)}

          {/* Center spacer (matches FAB footprint so flex tabs balance) */}
          <div className="w-[64px] shrink-0" aria-hidden="true" />

          {/* Right tabs */}
          {RIGHT.map((it) => <Tab key={it.to} item={it} active={isActive(it.to)} />)}

          {/* FAB — absolutely centered. Never moves on press. */}
          <button
            onClick={() => setQuickOpen(true)}
            aria-label="Quick add"
            className={cn(
              "absolute left-1/2 -translate-x-1/2 -top-5",
              "h-14 w-14 rounded-full grid place-items-center",
              "bg-gradient-to-br from-primary to-[hsl(240_70%_50%)] text-primary-foreground",
              "shadow-[0_8px_24px_-4px_hsl(var(--primary)/0.55)]",
              "border-[3px] border-background",
              "active:brightness-90 transition-[filter] duration-150",
              "focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/30",
            )}
          >
            <Plus className="h-6 w-6" strokeWidth={2.6} />
          </button>
        </div>
      </nav>

      <QuickActionSheet open={quickOpen} onClose={() => setQuickOpen(false)} />
    </>
  );
};
