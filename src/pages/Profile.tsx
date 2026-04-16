import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { updateProfile } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import {
  User, Mail, Flame, Calendar, Save, Loader2, LogOut, Trash2, Shield,
  ChevronRight, Building2, Bell, Moon, Sun, Palette, HelpCircle, FileText, Lock,
} from "lucide-react";
import { loadStreak, loadActivity } from "@/lib/spacedRepetition";
import { useTheme } from "@/contexts/ThemeContext";

const BRANCH_OPTIONS = ["Data Science", "Electronic Systems", "Computational Science"];
const LEVEL_OPTIONS = ["Foundation", "Diploma", "BSc", "BS"];

const Profile = () => {
  const { user, isAdmin, signOut, userProfile, updateUserProfile } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [branch, setBranch] = useState(userProfile?.branch || "");
  const [level, setLevel] = useState(userProfile?.level || "");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  const streak = useMemo(() => loadStreak(), []);
  const activity = useMemo(() => loadActivity(), []);
  const totalReviews = useMemo(() => Object.values(activity).reduce((a, b) => a + b, 0), [activity]);
  const daysActive = useMemo(() => Object.keys(activity).length, [activity]);

  const collegeName = userProfile?.selectedCollegeName ||
    (typeof window !== "undefined" ? localStorage.getItem("vv_selected_college_name") : null);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateProfile(user, { displayName: displayName.trim() });
      await updateUserProfile({ name: displayName.trim(), branch, level });
      toast.success("Profile updated!");
      setEditing(false);
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleSwitchCollege = async () => {
    try {
      if (user) await updateUserProfile({ selectedCollegeId: "", selectedCollegeName: "" } as any);
    } catch {}
    localStorage.removeItem("vv_selected_college");
    localStorage.removeItem("vv_selected_college_name");
    window.location.href = "/";
  };

  if (!user) {
    return (
      <Layout title="Profile">
        <div className="text-center py-20">
          <p className="text-muted-foreground font-body">Sign in to view your profile.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Profile" showBack>
      {/* ═══════════ MOBILE: iOS-style grouped settings ═══════════ */}
      <div className="md:hidden">
        {/* Hero */}
        <div className="flex flex-col items-center text-center pt-4 pb-6 px-4">
          <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-primary to-[hsl(240,70%,50%)] flex items-center justify-center text-primary-foreground font-bold text-3xl shadow-xl shadow-primary/25 mb-3">
            {(user.displayName || user.email || "U")[0].toUpperCase()}
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-heading font-bold">{user.displayName || "Student"}</h1>
            {isAdmin && <Badge className="bg-primary/10 text-primary text-[10px] font-body"><Shield className="h-2.5 w-2.5 mr-1" />Admin</Badge>}
          </div>
          <p className="text-sm text-muted-foreground font-body mt-0.5">{user.email}</p>
        </div>

        {/* Stats strip */}
        <div className="px-4 mb-5">
          <div className="grid grid-cols-4 gap-2">
            {[
              { icon: Flame, value: streak.current, label: "Streak", color: "text-[hsl(var(--streak))]" },
              { icon: Flame, value: streak.longest, label: "Best", color: "text-primary" },
              { icon: Calendar, value: daysActive, label: "Days", color: "text-[hsl(var(--success))]" },
              { icon: User, value: totalReviews, label: "Reviews", color: "text-[hsl(210,80%,50%)]" },
            ].map(s => (
              <div key={s.label} className="bg-card rounded-2xl py-3 text-center border border-border/50">
                <s.icon className={`h-4 w-4 mx-auto mb-1 ${s.color}`} />
                <p className="text-base font-heading font-bold tabular-nums leading-none">{s.value}</p>
                <p className="text-[9px] text-muted-foreground font-body mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Account group */}
        <div className="px-4 mb-4">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-body font-medium px-3 mb-1.5">Account</p>
          <div className="ios-group">
            <button onClick={() => setEditing(true)} className="ios-row w-full press">
              <User className="h-[18px] w-[18px] text-primary" />
              <span className="flex-1 text-left font-body text-[15px]">Edit Profile</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
            <div className="ios-row">
              <Mail className="h-[18px] w-[18px] text-[hsl(210,80%,50%)]" />
              <span className="flex-1 font-body text-[15px]">Email</span>
              <span className="text-[13px] text-muted-foreground font-body truncate max-w-[140px]">{user.email}</span>
            </div>
            <button onClick={handleSwitchCollege} className="ios-row w-full press">
              <Building2 className="h-[18px] w-[18px] text-[hsl(280,70%,50%)]" />
              <span className="flex-1 text-left font-body text-[15px]">Institution</span>
              {collegeName && <span className="text-[13px] text-muted-foreground font-body truncate max-w-[120px]">{collegeName}</span>}
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Preferences group */}
        <div className="px-4 mb-4">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-body font-medium px-3 mb-1.5">Preferences</p>
          <div className="ios-group">
            <button onClick={toggleTheme} className="ios-row w-full press">
              {resolvedTheme === "dark" ? <Moon className="h-[18px] w-[18px] text-[hsl(280,70%,50%)]" /> : <Sun className="h-[18px] w-[18px] text-[hsl(var(--warning))]" />}
              <span className="flex-1 text-left font-body text-[15px]">Theme</span>
              <span className="text-[13px] text-muted-foreground font-body capitalize">{resolvedTheme}</span>
            </button>
            <button onClick={() => navigate("/notifications")} className="ios-row w-full press">
              <Bell className="h-[18px] w-[18px] text-[hsl(var(--warning))]" />
              <span className="flex-1 text-left font-body text-[15px]">Notifications</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
            <button onClick={() => navigate("/bookmarks")} className="ios-row w-full press">
              <FileText className="h-[18px] w-[18px] text-[hsl(142,71%,45%)]" />
              <span className="flex-1 text-left font-body text-[15px]">Bookmarks</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Admin group */}
        {isAdmin && (
          <div className="px-4 mb-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-body font-medium px-3 mb-1.5">Admin</p>
            <div className="ios-group">
              <button onClick={() => navigate("/admin")} className="ios-row w-full press">
                <Shield className="h-[18px] w-[18px] text-primary" />
                <span className="flex-1 text-left font-body text-[15px]">Admin Console</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </div>
        )}

        {/* Danger group */}
        <div className="px-4 mb-8">
          <div className="ios-group">
            <button onClick={signOut} className="ios-row w-full press">
              <LogOut className="h-[18px] w-[18px] text-destructive" />
              <span className="flex-1 text-left font-body text-[15px] text-destructive">Sign Out</span>
            </button>
          </div>
        </div>

        {/* Mobile edit drawer */}
        {editing && (
          <div className="fixed inset-0 z-[300] bg-black/50 backdrop-blur-sm flex items-end" onClick={() => setEditing(false)}>
            <div className="w-full bg-background rounded-t-3xl pb-8 animate-in slide-in-from-bottom duration-300" onClick={e => e.stopPropagation()}>
              <div className="mobile-sheet-handle" />
              <div className="px-5 pt-2 pb-4">
                <h2 className="text-xl font-heading font-bold mb-4">Edit Profile</h2>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="font-body text-xs">Display Name</Label>
                    <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" className="h-12 text-base bg-secondary/30 border-border/40" />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-body text-xs">Branch</Label>
                    <Select value={branch} onValueChange={setBranch}>
                      <SelectTrigger className="bg-secondary/30 border-border/40 h-12 text-base"><SelectValue placeholder="Select branch" /></SelectTrigger>
                      <SelectContent>{BRANCH_OPTIONS.map(b => <SelectItem key={b} value={b} className="font-body">{b}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-body text-xs">Level</Label>
                    <Select value={level} onValueChange={setLevel}>
                      <SelectTrigger className="bg-secondary/30 border-border/40 h-12 text-base"><SelectValue placeholder="Select level" /></SelectTrigger>
                      <SelectContent>{LEVEL_OPTIONS.map(l => <SelectItem key={l} value={l} className="font-body">{l}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleSave} disabled={saving} className="w-full h-12 text-base font-body gap-2">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save Changes
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════ DESKTOP: original layout ═══════════ */}
      <div className="hidden md:block">
        <div className="max-w-2xl mx-auto space-y-6">
          <h1 className="text-3xl font-heading font-extrabold tracking-tight">Your Profile</h1>

          <div className="vv-card p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-[hsl(240,70%,50%)] flex items-center justify-center text-primary-foreground font-bold text-2xl shadow-lg">
                {(user.displayName || user.email || "U")[0].toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-heading font-bold">{user.displayName || "Student"}</h2>
                  {isAdmin && <Badge className="bg-primary/10 text-primary text-[10px] font-body"><Shield className="h-2.5 w-2.5 mr-1" />Admin</Badge>}
                </div>
                <p className="text-sm text-muted-foreground font-body">{user.email}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="font-body text-xs">Display Name</Label>
                <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" className="bg-secondary/30 border-border/40 h-9" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-body text-xs">Branch</Label>
                  <Select value={branch} onValueChange={setBranch}>
                    <SelectTrigger className="bg-secondary/30 border-border/40 h-9 text-sm"><SelectValue placeholder="Select branch" /></SelectTrigger>
                    <SelectContent>{BRANCH_OPTIONS.map(b => <SelectItem key={b} value={b} className="font-body text-sm">{b}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="font-body text-xs">Level</Label>
                  <Select value={level} onValueChange={setLevel}>
                    <SelectTrigger className="bg-secondary/30 border-border/40 h-9 text-sm"><SelectValue placeholder="Select level" /></SelectTrigger>
                    <SelectContent>{LEVEL_OPTIONS.map(l => <SelectItem key={l} value={l} className="font-body text-sm">{l}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="font-body text-xs">Email</Label>
                <Input value={user.email || ""} disabled className="bg-secondary/30 border-border/40 opacity-60 h-9" />
              </div>
              <Button onClick={handleSave} disabled={saving} className="font-body gap-2 h-9 text-sm">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Changes
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: Flame, label: "Current Streak", value: streak.current, color: "text-[hsl(var(--streak))]" },
              { icon: Flame, label: "Best Streak", value: streak.longest, color: "text-primary" },
              { icon: Calendar, label: "Days Active", value: daysActive, color: "text-[hsl(var(--success))]" },
              { icon: User, label: "Total Reviews", value: totalReviews, color: "text-[hsl(210,80%,50%)]" },
            ].map(s => (
              <div key={s.label} className="vv-card p-4 text-center">
                <s.icon className={`h-4 w-4 mx-auto mb-2 ${s.color}`} />
                <p className="text-xl font-heading font-bold tabular-nums">{s.value}</p>
                <p className="text-[10px] text-muted-foreground font-body mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="vv-card p-5 border-destructive/20">
            <h3 className="font-heading font-semibold text-sm mb-3 text-destructive">Danger Zone</h3>
            <div className="flex gap-3">
              <Button variant="outline" size="sm" onClick={signOut} className="gap-2 font-body text-xs border-destructive/30 text-destructive hover:bg-destructive/10">
                <LogOut className="h-3.5 w-3.5" /> Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Profile;
