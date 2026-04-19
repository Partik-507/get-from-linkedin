/**
 * FocusMusicEditor — Admin CRUD for ambient focus tracks.
 *
 * Stores in Firestore `focusMusic/{id}`. On save, hydrates the
 * runtime music library so users see the new tracks immediately.
 */
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GlassCard } from "@/components/GlassCard";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, Upload, Pencil, Music as MusicIcon } from "lucide-react";
import { fetchAdminTracks, saveAdminTrack, deleteAdminTrack, hydrateMusic, type AdminFocusTrack } from "@/lib/adminFocusMusic";
import { uploadFocusAsset } from "@/lib/adminFocusThemes";
import { useAuth } from "@/contexts/AuthContext";
import type { MusicMood, MusicSeason } from "@/lib/focusMusicLibrary";

const newId = () => "trk_" + Math.random().toString(36).slice(2, 10);
const MOODS: MusicMood[] = ["rain", "nature", "lofi", "classical", "binaural", "noise", "café", "cosmic"];
const SEASONS: MusicSeason[] = ["any", "spring", "summer", "autumn", "winter", "night"];

export const FocusMusicEditor = () => {
  const { user } = useAuth();
  const [tracks, setTracks] = useState<AdminFocusTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<AdminFocusTrack | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { fetchAdminTracks().then(setTracks).finally(() => setLoading(false)); }, []);

  const startCreate = () => setEditing({
    id: newId(), name: "", url: "", mood: "lofi", season: "any",
    emoji: "🎵", cover: "linear-gradient(135deg,#7c3aed,#3b82f6)", createdBy: user?.uid,
  });

  const handleSave = async () => {
    if (!editing || !editing.name || !editing.url) {
      toast.error("Name and audio URL are required");
      return;
    }
    try {
      await saveAdminTrack(editing);
      setTracks((p) => {
        const i = p.findIndex((t) => t.id === editing.id);
        if (i >= 0) { const n = [...p]; n[i] = editing; return n; }
        return [...p, editing];
      });
      await hydrateMusic();
      setEditing(null);
      toast.success("Track saved");
    } catch { toast.error("Save failed"); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this track?")) return;
    try {
      await deleteAdminTrack(id);
      setTracks((p) => p.filter((t) => t.id !== id));
      await hydrateMusic();
      toast.success("Deleted");
    } catch { toast.error("Delete failed"); }
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadFocusAsset(file, "audio");
      if (editing) setEditing({ ...editing, url });
      toast.success("Uploaded");
    } catch { toast.error("Upload failed"); }
    finally { setUploading(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-heading">Focus Music</h2>
          <p className="text-sm text-muted-foreground font-body mt-1">
            Curate ambient tracks. Built-in 20-track library is always available.
          </p>
        </div>
        <Button onClick={startCreate} className="gap-2"><Plus className="h-4 w-4" /> New Track</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {tracks.map((t) => (
          <GlassCard key={t.id} hover={false} className="p-3 flex items-center gap-3">
            <div className="h-14 w-14 rounded-xl shrink-0 grid place-items-center text-2xl"
                 style={{ background: t.cover }}>
              {t.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-heading font-semibold text-sm truncate">{t.name}</p>
              <div className="flex gap-1 mt-1">
                <Badge variant="secondary" className="text-[10px]">{t.mood}</Badge>
                <Badge variant="outline" className="text-[10px]">{t.season}</Badge>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(t)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(t.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </GlassCard>
        ))}
        {tracks.length === 0 && (
          <div className="col-span-full text-center py-16 text-muted-foreground font-body text-sm">
            No custom tracks yet. Built-in library has 20 tracks ready.
          </div>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <GlassCard hover={false} className="w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-heading font-semibold">
                {tracks.some((t) => t.id === editing.id) ? "Edit track" : "New track"}
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>Cancel</Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Name *</Label>
                <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Lo-fi Café" />
              </div>
              <div>
                <Label>Emoji</Label>
                <Input value={editing.emoji} onChange={(e) => setEditing({ ...editing, emoji: e.target.value })} maxLength={4} />
              </div>
              <div>
                <Label>Cover gradient (CSS)</Label>
                <Input value={editing.cover} onChange={(e) => setEditing({ ...editing, cover: e.target.value })} />
              </div>
              <div>
                <Label>Mood</Label>
                <Select value={editing.mood} onValueChange={(v) => setEditing({ ...editing, mood: v as MusicMood })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{MOODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Season</Label>
                <Select value={editing.season} onValueChange={(v) => setEditing({ ...editing, season: v as MusicSeason })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SEASONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="flex items-center gap-1.5"><MusicIcon className="h-3.5 w-3.5" />Audio URL *</Label>
              <div className="flex gap-2 mt-1.5">
                <Input value={editing.url} onChange={(e) => setEditing({ ...editing, url: e.target.value })} placeholder="https://… mp3 / ogg" />
                <Button variant="outline" size="sm" disabled={uploading} asChild>
                  <label className="cursor-pointer gap-1">
                    {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                    Upload
                    <input type="file" accept="audio/*" className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
                  </label>
                </Button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={handleSave}>Save track</Button>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
};
