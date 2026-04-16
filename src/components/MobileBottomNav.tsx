import { Link, useLocation } from "react-router-dom";
import { Home, StickyNote, Timer, LayoutDashboard, User, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/dashboard", icon: LayoutDashboard, label: "Dash" },
  { to: "/study", icon: Timer, label: "Study" },
  { to: "/notes", icon: StickyNote, label: "Notes" },
  { to: "/resources", icon: Link2, label: "Library" },
  { to: "/profile", icon: User, label: "Me" },
];

export const MobileBottomNav = () => {
  const location = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[200] md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="bg-card/98 backdrop-blur-xl border-t border-border/60 flex items-stretch h-16">
        {NAV_ITEMS.map(item => {
          const active = item.to === "/"
            ? location.pathname === "/"
            : location.pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 py-1 relative tap-44 press",
                active ? "text-primary" : "text-muted-foreground/70"
              )}
            >
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-b-full bg-primary shadow-[0_0_8px_hsl(var(--primary))]" />
              )}
              <item.icon className={cn("h-[22px] w-[22px] transition-transform", active && "scale-110")} />
              <span className="text-[10px] font-medium font-body leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
