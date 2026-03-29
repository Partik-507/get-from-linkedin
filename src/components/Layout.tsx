import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import {
  LogOut, Shield, Home, ArrowLeft, LayoutDashboard, Sun, Moon,
  Menu, X, Bookmark, Focus, User, Flame, StickyNote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { NotificationBell } from "@/components/NotificationBell";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { loadStreak } from "@/lib/spacedRepetition";

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  showBack?: boolean;
}

export const Layout = ({ children, title, showBack }: LayoutProps) => {
  const { user, isGuest, isAdmin, signOut } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const streak = useMemo(() => loadStreak(), []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { to: "/", label: "Home", icon: Home },
    { to: "/notes", label: "Notes", icon: StickyNote },
    { to: "/bookmarks", label: "Bookmarks", icon: Bookmark },
    { to: "/focus", label: "Focus", icon: Focus },
    ...(isAdmin ? [{ to: "/admin", label: "Admin", icon: Shield }] : []),
  ];

  return (
    <div className="min-h-screen bg-background relative">
      {/* Guest banner */}
      {isGuest && (
        <div className="bg-primary/8 border-b border-primary/15 px-4 py-2 text-center">
          <p className="text-sm font-body text-foreground/80">
            🎓 Sign in with your student email to save progress across devices.{" "}
            <button onClick={() => navigate("/auth")} className="underline font-semibold text-primary hover:text-primary/80">
              Sign In
            </button>
          </p>
        </div>
      )}

      <header
        className={cn(
          "sticky top-0 z-50 border-b transition-all duration-200",
          scrolled
            ? "bg-background/95 backdrop-blur-xl border-border/60 shadow-sm"
            : "bg-background/70 backdrop-blur-md border-transparent"
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          {/* Left: Logo */}
          <div className="flex items-center gap-3">
            {showBack && (
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="mr-1 text-muted-foreground hover:text-foreground h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <Link to="/" className="flex items-center gap-2 group">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-[hsl(240,70%,50%)] flex items-center justify-center text-primary-foreground font-bold text-sm transition-transform group-hover:scale-105">
                V
              </div>
              <span className="font-heading font-bold text-lg tracking-tight hidden sm:block">VivaVault</span>
            </Link>
            {title && (
              <>
                <span className="text-border hidden sm:block">/</span>
                <span className="text-sm text-muted-foreground hidden sm:block truncate max-w-[200px] font-body">{title}</span>
              </>
            )}
          </div>

          {/* Center: Nav links (desktop) */}
          <div className="hidden md:flex items-center gap-0.5">
            {navLinks.map((link) => {
              const active = location.pathname === link.to;
              return (
                <Button
                  key={link.to}
                  variant="ghost"
                  size="sm"
                  asChild
                  className={cn(
                    "gap-1.5 font-body text-sm h-8 px-3 rounded-lg",
                    active
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Link to={link.to}>
                    <link.icon className="h-3.5 w-3.5" />
                    {link.label}
                  </Link>
                </Button>
              );
            })}
          </div>

          {/* Right: Actions */}
          <div className="hidden md:flex items-center gap-1">
            {/* Streak */}
            {streak.current > 0 && (
              <span className="text-xs font-body font-medium text-[hsl(var(--streak))] bg-[hsl(var(--streak))]/10 px-2.5 py-1 rounded-full flex items-center gap-1">
                <Flame className="h-3 w-3" /> {streak.current}d
              </span>
            )}

            {/* Theme */}
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-muted-foreground hover:text-foreground h-8 w-8">
              {resolvedTheme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </Button>

            {/* Notifications */}
            {(user || isGuest) && <NotificationBell />}

            {/* Profile menu */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full h-8 w-8">
                    <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary to-[hsl(240,70%,50%)] flex items-center justify-center text-primary-foreground text-xs font-bold">
                      {(user.displayName || user.email || "U")[0].toUpperCase()}
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 dropdown-shadow">
                  <div className="px-3 py-2">
                    <p className="font-body font-medium text-sm">{user.displayName || "Student"}</p>
                    <p className="text-xs text-muted-foreground font-body">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/profile")} className="gap-2 font-body">
                    <User className="h-4 w-4" /> Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/dashboard")} className="gap-2 font-body">
                    <LayoutDashboard className="h-4 w-4" /> Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut} className="gap-2 text-destructive font-body">
                    <LogOut className="h-4 w-4" /> Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : isGuest ? (
              <Button variant="outline" size="sm" onClick={() => navigate("/auth")} className="border-primary/30 text-primary font-body text-xs h-8">
                Sign In
              </Button>
            ) : null}
          </div>

          {/* Mobile right */}
          <div className="flex md:hidden items-center gap-1">
            {streak.current > 0 && (
              <span className="text-xs font-body font-medium text-[hsl(var(--streak))] flex items-center gap-0.5 mr-1">
                <Flame className="h-3 w-3" /> {streak.current}
              </span>
            )}
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-muted-foreground h-8 w-8">
              {resolvedTheme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </Button>
            {(user || isGuest) && <NotificationBell />}
            <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-muted-foreground h-8 w-8">
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border/50 px-4 py-3 space-y-1 bg-card/95 backdrop-blur-xl">
            {navLinks.map((link) => (
              <Button
                key={link.to}
                variant="ghost"
                className={cn("w-full justify-start gap-2 font-body", location.pathname === link.to && "bg-primary/10 text-primary")}
                asChild
                onClick={() => setMobileMenuOpen(false)}
              >
                <Link to={link.to}>
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </Link>
              </Button>
            ))}
            {user && (
              <>
                <Button variant="ghost" className="w-full justify-start gap-2 font-body" onClick={() => { navigate("/dashboard"); setMobileMenuOpen(false); }}>
                  <LayoutDashboard className="h-4 w-4" /> Dashboard
                </Button>
                <Button variant="ghost" className="w-full justify-start gap-2 text-destructive font-body" onClick={() => { signOut(); setMobileMenuOpen(false); }}>
                  <LogOut className="h-4 w-4" /> Sign Out
                </Button>
              </>
            )}
            {isGuest && (
              <Button variant="outline" className="w-full border-primary/30 text-primary font-body" onClick={() => { navigate("/auth"); setMobileMenuOpen(false); }}>
                Sign In
              </Button>
            )}
          </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 md:pb-8">
        {children}
      </main>

      {/* Mobile bottom nav */}
      {(user || isGuest || isAdmin) && <MobileBottomNav />}
    </div>
  );
};
