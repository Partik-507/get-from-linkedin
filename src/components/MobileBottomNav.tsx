import { Link, useLocation } from "react-router-dom";
import { Home, StickyNote, Timer, LayoutDashboard, User, Link2 } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/dashboard", icon: LayoutDashboard, label: "Dash" },
  { to: "/study", icon: Timer, label: "Study" },
  { to: "/notes", icon: StickyNote, label: "Notes" },
  { to: "/resources", icon: Link2, label: "Library" },
  { to: "/profile", icon: User, label: "Me" },
];

/**
 * MobileBottomNav — Native-feeling tab bar for iOS/Android web app.
 *
 * • Frosted glass blur (matches Apple/Material 3)
 * • Active state uses sliding pill (no jank)
 * • Tap feedback: scale 0.92 + 100ms (haptic-feel)
 * • Safe-area inset respected
 * • Hidden on desktop (`md:hidden`)
 */
export const MobileBottomNav = () => {
  const location = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[200] md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label="Primary"
    >
      <div className="relative bg-card/85 backdrop-blur-2xl border-t border-border/60 flex items-stretch h-[58px] supports-[backdrop-filter]:bg-card/70">
        {NAV_ITEMS.map(item => {
          const active = item.to === "/"
            ? location.pathname === "/"
            : location.pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-current={active ? "page" : undefined}
              className="flex-1 relative flex items-center justify-center"
            >
              <motion.div
                whileTap={{ scale: 0.88 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="flex flex-col items-center justify-center gap-0.5 py-1.5 px-3 rounded-2xl relative"
              >
                {active && (
                  <motion.span
                    layoutId="mobile-nav-pill"
                    className="absolute inset-0 bg-primary/12 rounded-2xl"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <Icon
                  className={cn(
                    "h-[22px] w-[22px] relative transition-colors",
                    active ? "text-primary" : "text-muted-foreground/70",
                    active && "drop-shadow-[0_0_4px_hsl(var(--primary)/0.3)]"
                  )}
                  strokeWidth={active ? 2.4 : 1.8}
                />
                <span
                  className={cn(
                    "text-[10px] font-medium font-body leading-none relative transition-colors",
                    active ? "text-primary" : "text-muted-foreground/70"
                  )}
                >
                  {item.label}
                </span>
              </motion.div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
