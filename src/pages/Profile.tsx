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
import { User, Mail, Flame, Calendar, Save, Loader2, LogOut, Trash2, Shield } from "lucide-react";
import { loadStreak, loadActivity } from "@/lib/spacedRepetition";

const BRANCH_OPTIONS = ["Data Science", "Electronic Systems", "Computational Science"];
const LEVEL_OPTIONS = ["Foundation", "Diploma", "BSc", "BS"];

const Profile = () => {
  const { user, isAdmin, signOut, userProfile, updateUserProfile } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [branch, setBranch] = useState(userProfile?.branch || "");
  const [level, setLevel] = useState(userProfile?.level || "");
  const [saving, setSaving] = useState(false);

  const streak = useMemo(() => loadStreak(), []);
  const activity = useMemo(() => loadActivity(), []);
  const totalReviews = useMemo(() => Object.values(activity).reduce((a, b) => a + b, 0), [activity]);
  const daysActive = useMemo(() => Object.keys(activity).length, [activity]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateProfile(user, { displayName: displayName.trim() });
      await updateUserProfile({ name: displayName.trim(), branch, level });
      toast.success("Profile updated!");
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
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
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-3xl font-heading font-extrabold tracking-tight">Your Profile</h1>

        {/* Profile card */}
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
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                className="bg-secondary/30 border-border/40 h-9"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-body text-xs">Branch</Label>
                <Select value={branch} onValueChange={setBranch}>
                  <SelectTrigger className="bg-secondary/30 border-border/40 h-9 text-sm"><SelectValue placeholder="Select branch" /></SelectTrigger>
                  <SelectContent>
                    {BRANCH_OPTIONS.map(b => <SelectItem key={b} value={b} className="font-body text-sm">{b}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-body text-xs">Level</Label>
                <Select value={level} onValueChange={setLevel}>
                  <SelectTrigger className="bg-secondary/30 border-border/40 h-9 text-sm"><SelectValue placeholder="Select level" /></SelectTrigger>
                  <SelectContent>
                    {LEVEL_OPTIONS.map(l => <SelectItem key={l} value={l} className="font-body text-sm">{l}</SelectItem>)}
                  </SelectContent>
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

        {/* Stats */}
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

        {/* Danger zone */}
        <div className="vv-card p-5 border-destructive/20">
          <h3 className="font-heading font-semibold text-sm mb-3 text-destructive">Danger Zone</h3>
          <div className="flex gap-3">
            <Button variant="outline" size="sm" onClick={signOut} className="gap-2 font-body text-xs border-destructive/30 text-destructive hover:bg-destructive/10">
              <LogOut className="h-3.5 w-3.5" /> Sign Out
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Profile;
