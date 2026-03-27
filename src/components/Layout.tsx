import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import {
  LogOut, Shield, Home, ArrowLeft, LayoutDashboard, Sun, Moon,
  PlusCircle, Menu, X, Bookmark, Focus, FileText, User,
  Flame, MessageSquareText, StickyNote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
    ...(user ? [{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard }] : []),
    { to: "/submit-question", label: "Submit", icon: PlusCircle },
    { to: "/bookmarks", label: "Bookmarks", icon: Bookmark },
    { to: "/notes", label: "Notes", icon: StickyNote },
    { to: "/focus", label: "Focus", icon: Focus },
    ...(isAdmin ? [{ to: "/admin", label: "Admin", icon: Shield }] : []),
  ];

  return (
    <div className="min-h-screen bg-background relative">
      {/* Guest banner */}
      {isGuest && (
        <div className="bg-primary/10 border-b border-primary/20 px-4 py-2 text-center">
          <p className="text-sm font-body text-primary">
            🎓 Sign in with your student email to save progress across devices.{" "}
            <button onClick={() => navigate("/auth")} className="underline font-semibold hover:text-primary/80">
              Sign In
            </button>
          </p>
        </div>
      )}

      <header
        className={cn(
          "sticky top-0 z-50 border-b transition-all duration-300",
          scrolled
            ? "bg-background/90 backdrop-blur-xl border-border/50 shadow-sm"
            : "bg-background/60 backdrop-blur-md border-transparent"
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {showBack && (
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="mr-1 text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-[hsl(280,70%,50%)] flex items-center justify-center text-primary-foreground font-bold text-sm transition-transform group-hover:scale-105">
                V
              </div>
              <span className="font-heading font-bold text-lg tracking-tight hidden sm:block">VivaVault</span>
            </Link>
            {title && (
              <>
                <span className="text-muted-foreground/30 hidden sm:block">/</span>
                <span className="text-sm text-muted-foreground hidden sm:block truncate max-w-[200px] font-body">{title}</span>
              </>
            )}
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Button
                key={link.to}
                variant="ghost"
                size="sm"
                asChild
                className={cn(
                  "gap-1.5 font-body text-sm",
                  location.pathname === link.to
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Link to={link.to}>
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </Link>
              </Button>
            ))}

            {/* Streak */}
            {streak.current > 0 && (
              <span className="text-xs font-body font-medium text-[hsl(38,92%,50%)] bg-[hsl(38,92%,50%)]/10 px-2.5 py-1 rounded-full flex items-center gap-1">
                <Flame className="h-3 w-3" /> Day {streak.current}
              </span>
            )}

            {/* Theme */}
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-muted-foreground hover:text-foreground">
              {resolvedTheme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </Button>

            {/* Feedback */}
            <Button variant="ghost" size="icon" onClick={() => window.open("https://forms.gle/feedback", "_blank")} className="text-muted-foreground hover:text-foreground" title="Feedback">
              <MessageSquareText className="h-4 w-4" />
            </Button>

            {/* Profile menu */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary to-[hsl(280,70%,50%)] flex items-center justify-center text-primary-foreground text-xs font-bold">
                      {(user.displayName || user.email || "U")[0].toUpperCase()}
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
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
              <Button variant="outline" size="sm" onClick={() => navigate("/auth")} className="border-primary/40 text-primary font-body">
                Sign In
              </Button>
            ) : null}
          </div>

          {/* Mobile */}
          <div className="flex md:hidden items-center gap-1">
            {streak.current > 0 && (
              <span className="text-xs font-body font-medium text-[hsl(38,92%,50%)] flex items-center gap-0.5 mr-1">
                <Flame className="h-3 w-3" /> {streak.current}
              </span>
            )}
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-muted-foreground">
              {resolvedTheme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-muted-foreground">
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border/50 px-4 py-3 space-y-1 bg-card/95 backdrop-blur-xl">
            {navLinks.map((link) => (
              <Button
                key={link.to}
                variant="ghost"
                className={cn("w-full justify-start gap-2 font-body", location.pathname === link.to && "bg-accent")}
                asChild
                onClick={() => setMobileMenuOpen(false)}
              >
                <Link to={link.to}>
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </Link>
              </Button>
            ))}
            {user ? (
              <>
                <Button variant="ghost" className="w-full justify-start gap-2 font-body" onClick={() => { navigate("/profile"); setMobileMenuOpen(false); }}>
                  <User className="h-4 w-4" /> Profile
                </Button>
                <Button variant="ghost" className="w-full justify-start gap-2 text-destructive font-body" onClick={() => { signOut(); setMobileMenuOpen(false); }}>
                  <LogOut className="h-4 w-4" /> Sign Out
                </Button>
              </>
            ) : isGuest ? (
              <Button variant="outline" className="w-full border-primary/40 text-primary font-body" onClick={() => { navigate("/auth"); setMobileMenuOpen(false); }}>
                Sign In
              </Button>
            ) : null}
          </div>
        )}
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
};
