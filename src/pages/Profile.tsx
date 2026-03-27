import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlassCard } from "@/components/GlassCard";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { updateProfile } from "firebase/auth";
import { User, Mail, Flame, Calendar, Save, Loader2 } from "lucide-react";
import { loadStreak, loadActivity } from "@/lib/spacedRepetition";
import { useMemo } from "react";

const Profile = () => {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName || "");
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

        <GlassCard hover={false}>
          <div className="flex items-center gap-4 mb-6">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-[hsl(280,70%,50%)] flex items-center justify-center text-primary-foreground font-bold text-2xl">
              {(user.displayName || user.email || "U")[0].toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-heading font-bold">{user.displayName || "Student"}</h2>
              <p className="text-sm text-muted-foreground font-body">{user.email}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="font-body">Display Name</Label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                className="bg-secondary/30 border-border/40"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-body">Email</Label>
              <Input value={user.email || ""} disabled className="bg-secondary/30 border-border/40 opacity-60" />
            </div>
            <Button onClick={handleSave} disabled={saving} className="font-body gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Changes
            </Button>
          </div>
        </GlassCard>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <GlassCard hover={false} className="text-center">
            <Flame className="h-5 w-5 mx-auto mb-2 text-[hsl(38,92%,50%)]" />
            <p className="text-2xl font-heading font-bold">{streak.current}</p>
            <p className="text-xs text-muted-foreground font-body">Current Streak</p>
          </GlassCard>
          <GlassCard hover={false} className="text-center">
            <Flame className="h-5 w-5 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-heading font-bold">{streak.longest}</p>
            <p className="text-xs text-muted-foreground font-body">Best Streak</p>
          </GlassCard>
          <GlassCard hover={false} className="text-center">
            <Calendar className="h-5 w-5 mx-auto mb-2 text-[hsl(142,71%,45%)]" />
            <p className="text-2xl font-heading font-bold">{daysActive}</p>
            <p className="text-xs text-muted-foreground font-body">Days Active</p>
          </GlassCard>
          <GlassCard hover={false} className="text-center">
            <User className="h-5 w-5 mx-auto mb-2 text-[hsl(210,80%,50%)]" />
            <p className="text-2xl font-heading font-bold">{totalReviews}</p>
            <p className="text-xs text-muted-foreground font-body">Total Reviews</p>
          </GlassCard>
        </div>
      </div>
    </Layout>
  );
};

export default Profile;
