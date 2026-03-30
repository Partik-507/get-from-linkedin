import { Link, useLocation } from "react-router-dom";
import { Home, StickyNote, Timer, LayoutDashboard, User } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/study", icon: Timer, label: "Study" },
  { to: "/notes", icon: StickyNote, label: "Notes" },
  { to: "/profile", icon: User, label: "Profile" },
];

export const MobileBottomNav = () => {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card/95 backdrop-blur-xl border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-14">
        {NAV_ITEMS.map(item => {
          const active = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5", active && "text-primary")} />
              <span className="text-[10px] font-body font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
