import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import {
  LogOut, Shield, Home, ArrowLeft, LayoutDashboard, Sun, Moon,
  User, Flame, StickyNote, Timer, BookOpen, Link2, Zap,
  X, Download, Monitor, Apple, Terminal, Minimize2, Maximize, Building2, Menu,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { NotificationBell } from "@/components/NotificationBell";
import { FloatingDock, useDockMode } from "@/components/FloatingDock";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";
import { loadStreak } from "@/lib/spacedRepetition";
import { AnimatePresence, motion } from "framer-motion";

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  showBack?: boolean;
  fullBleed?: boolean;
  hideBottomNav?: boolean;
}

// PWA Install button — shows only when browser fires beforeinstallprompt
const PWAInstallButton = () => {
  const [prompt, setPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); setPrompt(e); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!prompt) return null;

  return (
    <Button
      size="sm"
      variant="outline"
      className="h-7 text-[11px] font-body gap-1.5 border-primary/30 text-primary hidden md:flex"
      onClick={async () => { prompt.prompt(); setPrompt(null); }}
    >
      <Download className="h-3 w-3" />
      Install App
    </Button>
  );
};

// Desktop App download button
const DesktopAppButton = () => {
  const [os, setOs] = useState<"win" | "mac" | "linux" | null>(null);
  const [prompt, setPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); setPrompt(e); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  useEffect(() => {
    const ua = navigator.userAgent;
    if (ua.includes("Win")) setOs("win");
    else if (ua.includes("Mac")) setOs("mac");
    else if (ua.includes("Linux")) setOs("linux");
  }, []);

  const osLabel = os === "win" ? "Windows" : os === "mac" ? "macOS" : "Linux";
  const osIcon = os === "mac" ? Apple : os === "linux" ? Terminal : Monitor;
  const OsIcon = osIcon;

  if (!os) return null;

  const handleInstallClick = async () => {
    if (prompt) {
      prompt.prompt();
      setPrompt(null);
    } else {
      alert("App is either already installed, or PWA is not supported on this device. Look for an install icon in your URL bar!");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="ghost" className="h-7 text-[11px] font-body gap-1 text-muted-foreground hidden md:flex">
          <Download className="h-3 w-3" />
          Desktop App
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52 dropdown-shadow">
        <div className="px-3 py-2">
          <p className="text-xs font-body text-muted-foreground">Download for {osLabel}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="gap-2 font-body text-xs cursor-pointer" onClick={handleInstallClick}>
          <OsIcon className="h-3.5 w-3.5" />
          Download for {osLabel}
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2 font-body text-xs cursor-pointer" onClick={handleInstallClick}>
          <Monitor className="h-3.5 w-3.5" />
          All platforms
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export const Layout = ({ children, title, showBack, fullBleed, hideBottomNav }: LayoutProps) => {
  const { user, isGuest, isAdmin, isDemo, demoTimeLeft, signOut, userProfile, updateUserProfile } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { mode, switchToDock, switchToNavbar } = useDockMode();

  const collegeName = userProfile?.selectedCollegeName ||
    (typeof window !== "undefined" ? localStorage.getItem("vv_selected_college_name") : null);

  const handleSwitchCollege = async () => {
    try {
      if (user) await updateUserProfile({ selectedCollegeId: "", selectedCollegeName: "" } as any);
    } catch { /* ignore */ }
    localStorage.removeItem("vv_selected_college");
    localStorage.removeItem("vv_selected_college_name");
    window.location.href = "/";
  };

  const streak = useMemo(() => loadStreak(), []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setMobileMenuOpen(false); }, [location.pathname]);

  const navLinks = [
    { to: "/", label: "Home", icon: Home },
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/study", label: "Study OS", icon: Timer },
    { to: "/notes", label: "Notes OS", icon: StickyNote },
    { to: "/resources", label: "Resources", icon: Link2 },
    ...(isAdmin ? [{ to: "/admin", label: "Admin", icon: Shield }] : []),
  ];

  const formatDemoTime = (ms: number) => {
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  // Determine if we should show the classic navbar
  // In dock mode: navbar is hidden, floating dock is shown
  // In navbar mode: navbar is shown normally
  // On fullBleed pages: navbar is always hidden on mobile, dock is always shown
  const showNavbar = mode === "navbar";
  const showDock = mode === "dock" || fullBleed;

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      // Ignore (some browsers/embeds may block)
    }
  };

  return (
    <div className="min-h-screen bg-background gradient-mesh relative flex flex-col">
      {/* Guest banner */}
      {isGuest && !isDemo && (
        <div className="bg-primary/8 border-b border-primary/15 px-4 py-2 text-center">
          <p className="text-sm font-body text-foreground/80">
            🎓 Sign in with your student email to save progress across devices.{" "}
            <button onClick={() => navigate("/auth")} className="underline font-semibold text-primary hover:text-primary/80">
              Sign In
            </button>
          </p>
        </div>
      )}

      {/* Demo timer banner */}
      {isDemo && (
        <div className="bg-[hsl(var(--warning))]/10 border-b border-[hsl(var(--warning))]/20 px-4 py-2 text-center">
          <p className="text-sm font-body text-foreground/80">
            ⏱️ Demo Session: <span className="font-semibold text-[hsl(var(--warning))] tabular-nums">{formatDemoTime(demoTimeLeft)}</span> remaining.{" "}
            <button onClick={() => navigate("/auth")} className="underline font-semibold text-primary hover:text-primary/80">
              Sign In to save progress
            </button>
          </p>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          CLASSIC NAVBAR (visible only in "navbar" mode, hidden on fullBleed mobile)
          ═══════════════════════════════════════════════════════════════ */}
      {showNavbar && (
        <header
          className={cn(
            "sticky top-0 z-50 border-b transition-all duration-200",
            "hidden md:block", // mobile: classic navbar fully suppressed; replaced by status strip + bottom nav
            scrolled
              ? "bg-background/95 backdrop-blur-xl border-border/60 shadow-sm"
              : "bg-background/70 backdrop-blur-md border-transparent"
          )}
        >
          <div className="px-4 sm:px-6 md:px-8 lg:px-10 h-14 flex items-center justify-between w-full">
            {/* Left: Logo */}
            <div className="flex items-center gap-3">
              {showBack && (
                <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="mr-1 text-muted-foreground hover:text-foreground h-8 w-8">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <Link to="/" className="flex items-center gap-2 group">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-[hsl(240,70%,50%)] flex items-center justify-center text-primary-foreground font-bold text-sm transition-transform group-hover:scale-105 shadow-sm shadow-primary/20">
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
            <nav className="hidden md:flex items-center gap-0.5">
              {navLinks.map((link) => {
                const active = location.pathname === link.to || (link.to !== "/" && location.pathname.startsWith(link.to));
                return (
                  <Button
                    key={link.to + link.label}
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
            </nav>

            {/* Right: Actions */}
            <div className="hidden md:flex items-center gap-1">
              {/* Focus Mode button */}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2.5 gap-1 text-[11px] font-body text-muted-foreground hover:text-primary"
                onClick={() => navigate("/focus")}
                title="Enter Focus Mode"
              >
                <Zap className="h-3.5 w-3.5" />
                Focus
              </Button>

              {/* Fullscreen button (browser fullscreen API) */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleFullscreen}
                className="text-muted-foreground hover:text-primary h-8 w-8"
                title="Toggle fullscreen"
              >
                <Maximize className="h-4 w-4" />
              </Button>

              {/* Streak */}
              {streak.current > 0 && (
                <span className="text-xs font-body font-medium text-[hsl(var(--streak))] bg-[hsl(var(--streak))]/10 px-2.5 py-1 rounded-full flex items-center gap-1">
                  <Flame className="h-3 w-3" /> {streak.current}d
                </span>
              )}

              <PWAInstallButton />
              <DesktopAppButton />

              {/* Theme */}
              <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-muted-foreground hover:text-foreground h-8 w-8">
                {resolvedTheme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              </Button>

              {/* Notifications */}
              {(user || isGuest) && <NotificationBell />}

              {/* Switch to Dock button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={switchToDock}
                className="text-muted-foreground hover:text-primary h-8 w-8"
                title="Switch to floating dock"
              >
                <Minimize2 className="h-3.5 w-3.5" />
              </Button>

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
                    <DropdownMenuItem onClick={handleSwitchCollege} className="gap-2 font-body">
                      <Building2 className="h-4 w-4" />
                      <span className="flex-1">Switch Institution</span>
                      {collegeName && <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">{collegeName}</span>}
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
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-muted-foreground h-8 w-8"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </Button>
            </div>
          </div>

          {/* Mobile slide-down menu */}
          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="md:hidden overflow-hidden border-t border-border/50 bg-card/98 backdrop-blur-xl"
              >
                <div className="px-4 py-3 space-y-1">
                  {navLinks.map((link) => (
                    <Button
                      key={link.to + link.label}
                      variant="ghost"
                      className={cn("w-full justify-start gap-2 font-body h-10",
                        location.pathname === link.to && "bg-primary/10 text-primary"
                      )}
                      asChild
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Link to={link.to}>
                        <link.icon className="h-4 w-4" />
                        {link.label}
                      </Link>
                    </Button>
                  ))}
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2 font-body h-10 text-primary"
                    onClick={() => { navigate("/focus"); setMobileMenuOpen(false); }}
                  >
                    <Zap className="h-4 w-4" /> Focus Mode
                  </Button>
                  {/* Switch to dock */}
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2 font-body h-10 text-muted-foreground"
                    onClick={() => { switchToDock(); setMobileMenuOpen(false); }}
                  >
                    <Minimize2 className="h-4 w-4" /> Use Floating Dock
                  </Button>
                  {user && (
                    <>
                      <div className="h-px bg-border/50 my-1" />
                      <Button variant="ghost" className="w-full justify-start gap-2 font-body" onClick={() => { navigate("/profile"); setMobileMenuOpen(false); }}>
                        <User className="h-4 w-4" /> Profile
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
              </motion.div>
            )}
          </AnimatePresence>
        </header>
      )}

      {fullBleed ? (
        <main className="flex-1 flex flex-col overflow-hidden w-full max-w-none animate-in fade-in duration-200">
          {children}
        </main>
      ) : (
        <main
          className={cn(
            "w-full max-w-none flex-1 animate-in fade-in duration-200",
            "px-4 sm:px-6 md:px-8 lg:px-10 py-6 pb-6",
          )}
        >
          {children}
        </main>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          FLOATING DOCK — visible in dock mode or on fullBleed pages
          ═══════════════════════════════════════════════════════════════ */}
      {(user || isGuest) && showDock && (
        <FloatingDock
          isFullBleed={fullBleed}
          onRestoreNavbar={switchToNavbar}
        />
      )}
    </div>
  );
};
