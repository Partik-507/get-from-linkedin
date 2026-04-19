import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, StickyNote, Timer, LayoutDashboard, User, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { QuickActionSheet } from "@/components/QuickActionSheet";

const NAV_ITEMS_LEFT = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/dashboard", icon: LayoutDashboard, label: "Dash" },
];

const NAV_ITEMS_RIGHT = [
  { to: "/notes", icon: StickyNote, label: "Notes" },
  { to: "/profile", icon: User, label: "Me" },
];

/**
 * MobileBottomNav — Native-feeling tab bar with raised center FAB.
 *
 *  Layout:  [Home] [Dash]  [+ FAB]  [Notes] [Me]
 *
 * - Frosted glass blur (Apple/Material 3)
 * - Sliding pill highlight for active tab
 * - Center FAB raised 12px, purple glow
 * - FAB opens contextual QuickActionSheet (different per route)
 */
export const MobileBottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
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
        <div className="relative bg-card/85 backdrop-blur-2xl border-t border-border/60 flex items-stretch h-[58px] supports-[backdrop-filter]:bg-card/70">
          {/* Left items */}
          {NAV_ITEMS_LEFT.map((item) => {
            const active = isActive(item.to);
            const Icon = item.icon;
            return (
              <Link key={item.to} to={item.to} aria-current={active ? "page" : undefined}
                    className="flex-1 relative flex items-center justify-center">
                <motion.div
                  whileTap={{ scale: 0.88 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className="flex flex-col items-center justify-center gap-0.5 py-1.5 px-3 rounded-2xl relative"
                >
                  {active && (
                    <motion.span layoutId="mobile-nav-pill"
                      className="absolute inset-0 bg-primary/12 rounded-2xl"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }} />
                  )}
                  <Icon className={cn("h-[22px] w-[22px] relative transition-colors",
                    active ? "text-primary" : "text-muted-foreground/70")}
                    strokeWidth={active ? 2.4 : 1.8} />
                  <span className={cn("text-[10px] font-medium font-body leading-none relative transition-colors",
                    active ? "text-primary" : "text-muted-foreground/70")}>
                    {item.label}
                  </span>
                </motion.div>
              </Link>
            );
          })}

          {/* Center FAB spacer */}
          <div className="w-[68px] shrink-0 relative">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setQuickOpen(true)}
              className={cn(
                "absolute left-1/2 -translate-x-1/2 -top-5",
                "h-14 w-14 rounded-full grid place-items-center",
                "bg-gradient-to-br from-primary to-fuchsia-600 text-primary-foreground",
                "shadow-[0_8px_24px_-4px_hsl(var(--primary)/0.55),0_0_0_4px_hsl(var(--background))]",
                "border-2 border-background"
              )}
              aria-label="Quick add"
            >
              <Plus className="h-6 w-6" strokeWidth={2.6} />
            </motion.button>
          </div>

          {/* Study tab (sits between FAB and right items, sized like others) */}
          <Link to="/study" aria-current={isActive("/study") ? "page" : undefined}
                className="flex-1 relative flex items-center justify-center -ml-[68px] order-2">
            {/* spacer overlay handled by negative margin to align under FAB area */}
          </Link>

          {/* Right items */}
          {NAV_ITEMS_RIGHT.map((item) => {
            const active = isActive(item.to);
            const Icon = item.icon;
            return (
              <Link key={item.to} to={item.to} aria-current={active ? "page" : undefined}
                    className="flex-1 relative flex items-center justify-center">
                <motion.div
                  whileTap={{ scale: 0.88 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className="flex flex-col items-center justify-center gap-0.5 py-1.5 px-3 rounded-2xl relative"
                >
                  {active && (
                    <motion.span layoutId="mobile-nav-pill"
                      className="absolute inset-0 bg-primary/12 rounded-2xl"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }} />
                  )}
                  <Icon className={cn("h-[22px] w-[22px] relative transition-colors",
                    active ? "text-primary" : "text-muted-foreground/70")}
                    strokeWidth={active ? 2.4 : 1.8} />
                  <span className={cn("text-[10px] font-medium font-body leading-none relative transition-colors",
                    active ? "text-primary" : "text-muted-foreground/70")}>
                    {item.label}
                  </span>
                </motion.div>
              </Link>
            );
          })}
        </div>
      </nav>

      <QuickActionSheet open={quickOpen} onClose={() => setQuickOpen(false)} />
    </>
  );
};
