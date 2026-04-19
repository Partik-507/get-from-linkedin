/**
 * FocusThemeEditor — Admin UI to manage Focus Mode themes.
 *
 * Admins can:
 *   - Create / edit / delete themes
 *   - Upload background image, audio, and optional video
 *   - Pick overlay animation type (snow, rain, blossom, etc.)
 *
 * Themes are stored in Firestore `focusThemes/{id}` and hydrated globally
 * via adminFocusThemes.hydrateThemes() on app boot.
 */

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GlassCard } from "@/components/GlassCard";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, Upload, Music, Video, Image as ImageIcon, Pencil } from "lucide-react";
import {
  fetchAdminThemes, saveAdminTheme, deleteAdminTheme,
  uploadFocusAsset, OVERLAY_OPTIONS, type AdminFocusTheme,
} from "@/lib/adminFocusThemes";
import type { OverlayType } from "@/lib/focusThemes";
import { useAuth } from "@/contexts/AuthContext";

const newId = () => "thm_" + Math.random().toString(36).slice(2, 10);

export const FocusThemeEditor = () => {
  const { user } = useAuth();
  const [themes, setThemes] = useState<AdminFocusTheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<AdminFocusTheme | null>(null);
  const [uploading, setUploading] = useState<"image" | "audio" | "video" | null>(null);

  useEffect(() => {
    fetchAdminThemes()
      .then(setThemes)
      .finally(() => setLoading(false));
  }, []);

  const startCreate = () => setEditing({
    id: newId(), name: "", description: "", emoji: "✨",
    baseImage: "", overlays: [{ type: "dust", intensity: 0.4 }],
    perfProfile: "medium", createdBy: user?.uid,
  });

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.name || !editing.baseImage) {
      toast.error("Name and background image are required");
      return;
    }
    try {
      await saveAdminTheme(editing);
      setThemes((prev) => {
        const idx = prev.findIndex((t) => t.id === editing.id);
        if (idx >= 0) {
          const next = [...prev]; next[idx] = editing; return next;
        }
        return [...prev, editing];
      });
      setEditing(null);
      toast.success("Theme saved");
    } catch (e) {
      toast.error("Save failed");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this theme? This affects all users.")) return;
    try {
      await deleteAdminTheme(id);
      setThemes((prev) => prev.filter((t) => t.id !== id));
      toast.success("Deleted");
    } catch {
      toast.error("Delete failed");
    }
  };

  const handleUpload = async (kind: "image" | "audio" | "video", file: File) => {
    setUploading(kind);
    try {
      const url = await uploadFocusAsset(file, kind);
      if (!editing) return;
      if (kind === "image") setEditing({ ...editing, baseImage: url });
      else if (kind === "audio") setEditing({ ...editing, audio: { url, label: file.name } });
      else setEditing({ ...editing, videoUrl: url });
      toast.success(`${kind} uploaded`);
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(null);
    }
  };

  const updateOverlay = (idx: number, patch: Partial<{ type: OverlayType; intensity: number; speed: number }>) => {
    if (!editing) return;
    const overlays = editing.overlays.map((o, i) => (i === idx ? { ...o, ...patch } : o));
    setEditing({ ...editing, overlays });
  };

  const addOverlay = () => {
    if (!editing) return;
    setEditing({ ...editing, overlays: [...editing.overlays, { type: "dust", intensity: 0.4 }] });
  };

  const removeOverlay = (idx: number) => {
    if (!editing) return;
    setEditing({ ...editing, overlays: editing.overlays.filter((_, i) => i !== idx) });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-heading">Focus Mode Manager</h2>
          <p className="text-sm text-muted-foreground font-body mt-1">
            Manage themes — backgrounds, audio, video, and animation overlays.
          </p>
        </div>
        <Button onClick={startCreate} className="gap-2">
          <Plus className="h-4 w-4" /> New Theme
        </Button>
      </div>

      {/* Theme grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {themes.map((t) => (
          <GlassCard key={t.id} hover={false} className="overflow-hidden p-0">
            <div className="aspect-video relative bg-muted">
              {t.baseImage && (
                <img src={t.baseImage} alt={t.name} className="absolute inset-0 w-full h-full object-cover" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                <span className="text-white text-sm font-semibold drop-shadow">
                  {t.emoji} {t.name}
                </span>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-white hover:bg-white/20"
                    onClick={() => setEditing(t)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-white hover:bg-destructive/40"
                    onClick={() => handleDelete(t.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
            <div className="p-3 space-y-1.5">
              <p className="text-xs text-muted-foreground line-clamp-2 font-body">{t.description}</p>
              <div className="flex flex-wrap gap-1">
                {t.overlays.map((o, i) => (
                  <Badge key={i} variant="secondary" className="text-[10px] py-0">{o.type}</Badge>
                ))}
                {t.audio && <Badge variant="outline" className="text-[10px] py-0">🎵 audio</Badge>}
                {t.videoUrl && <Badge variant="outline" className="text-[10px] py-0">🎬 video</Badge>}
              </div>
            </div>
          </GlassCard>
        ))}

        {themes.length === 0 && (
          <div className="col-span-full text-center py-16 text-muted-foreground font-body text-sm">
            No custom themes yet. Click <strong>New Theme</strong> to add one.
            <br />Built-in themes (Lo-fi Room, Night City, etc.) are always available to users.
          </div>
        )}
      </div>

      {/* Editor modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <GlassCard hover={false} className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-heading font-semibold">
                  {themes.some((t) => t.id === editing.id) ? "Edit theme" : "New theme"}
                </h3>
                <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>Cancel</Button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Name *</Label>
                  <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Cozy Cabin" />
                </div>
                <div>
                  <Label>Emoji</Label>
                  <Input value={editing.emoji} onChange={(e) => setEditing({ ...editing, emoji: e.target.value })} placeholder="✨" maxLength={4} />
                </div>
              </div>

              <div>
                <Label>Description</Label>
                <Input value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} placeholder="Warm fireplace, snow outside" />
              </div>

              {/* Background image */}
              <div>
                <Label className="flex items-center gap-1.5"><ImageIcon className="h-3.5 w-3.5" />Background image *</Label>
                <div className="flex gap-2 mt-1.5">
                  <Input value={editing.baseImage} onChange={(e) => setEditing({ ...editing, baseImage: e.target.value })} placeholder="https://… or upload" />
                  <Button variant="outline" size="sm" disabled={uploading === "image"} asChild>
                    <label className="cursor-pointer gap-1">
                      {uploading === "image" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                      Upload
                      <input type="file" accept="image/*" className="hidden"
                        onChange={(e) => e.target.files?.[0] && handleUpload("image", e.target.files[0])} />
                    </label>
                  </Button>
                </div>
                {editing.baseImage && <img src={editing.baseImage} alt="" className="mt-2 w-full aspect-video object-cover rounded-md border" />}
              </div>

              {/* Audio */}
              <div>
                <Label className="flex items-center gap-1.5"><Music className="h-3.5 w-3.5" />Ambient audio</Label>
                <div className="flex gap-2 mt-1.5">
                  <Input value={editing.audio?.url || ""} onChange={(e) => setEditing({ ...editing, audio: { url: e.target.value, label: editing.audio?.label || "Audio" } })} placeholder="https://… or upload" />
                  <Button variant="outline" size="sm" disabled={uploading === "audio"} asChild>
                    <label className="cursor-pointer gap-1">
                      {uploading === "audio" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                      Upload
                      <input type="file" accept="audio/*" className="hidden"
                        onChange={(e) => e.target.files?.[0] && handleUpload("audio", e.target.files[0])} />
                    </label>
                  </Button>
                </div>
              </div>

              {/* Video (optional) */}
              <div>
                <Label className="flex items-center gap-1.5"><Video className="h-3.5 w-3.5" />Video background (optional)</Label>
                <div className="flex gap-2 mt-1.5">
                  <Input value={editing.videoUrl || ""} onChange={(e) => setEditing({ ...editing, videoUrl: e.target.value })} placeholder="https://… or upload" />
                  <Button variant="outline" size="sm" disabled={uploading === "video"} asChild>
                    <label className="cursor-pointer gap-1">
                      {uploading === "video" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                      Upload
                      <input type="file" accept="video/*" className="hidden"
                        onChange={(e) => e.target.files?.[0] && handleUpload("video", e.target.files[0])} />
                    </label>
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground font-body mt-1">
                  If a video is set, users see it instead of the static image.
                </p>
              </div>

              {/* Overlays */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Animation overlays</Label>
                  <Button size="sm" variant="outline" onClick={addOverlay} className="h-7 text-xs">
                    <Plus className="h-3 w-3 mr-1" /> Add layer
                  </Button>
                </div>
                <div className="space-y-2">
                  {editing.overlays.map((o, i) => (
                    <div key={i} className="flex gap-2 items-center p-2 rounded-md bg-muted/30 border">
                      <Select value={o.type} onValueChange={(v) => updateOverlay(i, { type: v as OverlayType })}>
                        <SelectTrigger className="h-8 flex-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {OVERLAY_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number" step="0.1" min="0" max="1"
                        value={o.intensity ?? 0.5}
                        onChange={(e) => updateOverlay(i, { intensity: parseFloat(e.target.value) })}
                        className="h-8 w-20" placeholder="Intensity"
                      />
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeOverlay(i)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label>Performance profile</Label>
                <Select value={editing.perfProfile} onValueChange={(v) => setEditing({ ...editing, perfProfile: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low (mobile-friendly)</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High (desktop only)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                <Button onClick={handleSave}>Save theme</Button>
              </div>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
};
