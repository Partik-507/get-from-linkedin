/**
 * FocusAnimationEditor — Admin CRUD for overlay animations.
 *
 * Maps custom keys onto the built-in SceneEngine overlay engine.
 * Lottie file uploads can be referenced via overlayType="lottie" + url.
 */
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GlassCard } from "@/components/GlassCard";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, Pencil, Sparkles } from "lucide-react";
import {
  fetchAdminAnimations, saveAdminAnimation, deleteAdminAnimation,
  type AdminFocusAnimation,
} from "@/lib/adminFocusAnimations";
import { useAuth } from "@/contexts/AuthContext";
import type { AnimationKey } from "@/lib/focusAnimationLibrary";

const newId = () => "anim_" + Math.random().toString(36).slice(2, 10);
const OVERLAY_TYPES = ["snow", "rain", "blossom", "leaves", "fireflies", "dust", "candle", "glow", "gradient-drift"];

export const FocusAnimationEditor = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<AdminFocusAnimation[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<AdminFocusAnimation | null>(null);

  useEffect(() => { fetchAdminAnimations().then(setItems).finally(() => setLoading(false)); }, []);

  const startCreate = () => setEditing({
    id: newId(), key: "snow" as AnimationKey, label: "", emoji: "✨",
    preview: "linear-gradient(135deg,#7c3aed,#3b82f6)", overlayType: "snow", intensity: 0.5,
    createdBy: user?.uid,
  });

  const handleSave = async () => {
    if (!editing || !editing.label) { toast.error("Label is required"); return; }
    try {
      await saveAdminAnimation(editing);
      setItems((p) => {
        const i = p.findIndex((a) => a.id === editing.id);
        if (i >= 0) { const n = [...p]; n[i] = editing; return n; }
        return [...p, editing];
      });
      setEditing(null);
      toast.success("Animation saved");
    } catch { toast.error("Save failed"); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this animation?")) return;
    try {
      await deleteAdminAnimation(id);
      setItems((p) => p.filter((a) => a.id !== id));
      toast.success("Deleted");
    } catch { toast.error("Delete failed"); }
  };

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-heading">Focus Animations</h2>
          <p className="text-sm text-muted-foreground font-body mt-1">
            Custom overlay animations. Built-in 20-pack always available.
          </p>
        </div>
        <Button onClick={startCreate} className="gap-2"><Plus className="h-4 w-4" /> New Animation</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {items.map((a) => (
          <GlassCard key={a.id} hover={false} className="p-3">
            <div className="aspect-square rounded-xl grid place-items-center text-3xl mb-2"
                 style={{ background: a.preview }}>
              {a.emoji}
            </div>
            <p className="text-sm font-heading font-semibold truncate">{a.label}</p>
            <p className="text-[11px] text-muted-foreground font-body">{a.overlayType}</p>
            <div className="flex gap-1 mt-2">
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditing(a)}>
                <Pencil className="h-3 w-3" />
              </Button>
              <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => handleDelete(a.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </GlassCard>
        ))}
        {items.length === 0 && (
          <div className="col-span-full text-center py-16 text-muted-foreground font-body text-sm">
            No custom animations yet. The built-in 20-animation library is ready.
          </div>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <GlassCard hover={false} className="w-full max-w-lg p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-heading font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                {items.some((a) => a.id === editing.id) ? "Edit animation" : "New animation"}
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>Cancel</Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Label *</Label>
                <Input value={editing.label} onChange={(e) => setEditing({ ...editing, label: e.target.value })} placeholder="Magical Sparkles" />
              </div>
              <div>
                <Label>Emoji</Label>
                <Input value={editing.emoji} onChange={(e) => setEditing({ ...editing, emoji: e.target.value })} maxLength={4} />
              </div>
              <div>
                <Label>Preview gradient</Label>
                <Input value={editing.preview} onChange={(e) => setEditing({ ...editing, preview: e.target.value })} />
              </div>
              <div>
                <Label>Overlay type</Label>
                <Select value={editing.overlayType || "snow"}
                  onValueChange={(v) => setEditing({ ...editing, overlayType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{OVERLAY_TYPES.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Intensity</Label>
                <Input type="number" step="0.05" min="0" max="1"
                  value={editing.intensity ?? 0.5}
                  onChange={(e) => setEditing({ ...editing, intensity: parseFloat(e.target.value) })} />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={handleSave}>Save</Button>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
};
