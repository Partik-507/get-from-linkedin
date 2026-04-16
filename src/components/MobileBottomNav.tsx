import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, StickyNote, Timer, LayoutDashboard, User, Zap } from "lucide-react";
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
  const navigate = useNavigate();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[200] md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="bg-card/98 backdrop-blur-xl border-t border-border/60 flex items-stretch h-14">
        {NAV_ITEMS.map(item => {
          const active = item.to === "/"
            ? location.pathname === "/"
            : location.pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 py-1 transition-colors relative",
                active ? "text-primary" : "text-muted-foreground/70"
              )}
            >
              {active && (
                <span className="absolute top-0 inset-x-3 h-0.5 rounded-b-full bg-primary" />
              )}
              <item.icon className={cn("h-5 w-5", active && "text-primary")} />
              <span className="text-[10px] font-medium font-body">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
