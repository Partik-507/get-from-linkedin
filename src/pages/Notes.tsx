import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, serverTimestamp, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Layout } from "@/components/Layout";
import { EmptyState } from "@/components/EmptyState";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ResourceViewer } from "@/components/ResourceViewer";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  FileText, ExternalLink, Eye, Search, BookOpen, File, Link2, Plus,
} from "lucide-react";

interface Note {
  id: string;
  title: string;
  type: string;
  description: string;
  url?: string;
  content?: string;
  status?: string;
  submittedBy?: string;
  createdAt: any;
}

const TYPE_ICONS: Record<string, any> = {
  pdf: FileText,
  doc: File,
  html: Link2,
  link: ExternalLink,
  note: BookOpen,
};

const Notes = () => {
  const { user, isAdmin } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [submitOpen, setSubmitOpen] = useState(false);
  const [form, setForm] = useState({ title: "", type: "note", description: "", url: "" });
  const [submitting, setSubmitting] = useState(false);
  const [viewer, setViewer] = useState<{ open: boolean; title: string; url: string; type: string }>({
    open: false, title: "", url: "", type: "",
  });

  useEffect(() => {
    document.title = "Notes — VivaVault";
    const fetchNotes = async () => {
      try {
        const snap = await getDocs(collection(db, "notes"));
        const all = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Note));
        // Regular users see only approved (or notes without status for backward compat)
        // Admins see all
        if (isAdmin) {
          setNotes(all);
        } else {
          setNotes(all.filter((n) => !n.status || n.status === "approved"));
        }
      } catch {
        toast.error("Failed to load notes");
      } finally {
        setLoading(false);
      }
    };
    fetchNotes();
  }, [isAdmin]);

  const filtered = notes.filter((n) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return n.title?.toLowerCase().includes(s) || n.description?.toLowerCase().includes(s);
  });

  const handleSubmit = async () => {
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    setSubmitting(true);
    try {
      await addDoc(collection(db, "notes"), {
        ...form,
        status: "pending",
        submittedBy: user?.email || "anonymous",
        createdAt: serverTimestamp(),
      });
      toast.success("Note submitted for review! An admin will approve it shortly.");
      setSubmitOpen(false);
      setForm({ title: "", type: "note", description: "", url: "" });
    } catch {
      toast.error("Failed to submit note");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout title="Notes">
      <div className="mb-8 animate-fade-in">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-heading font-extrabold tracking-tight mb-2">
              <span className="text-gradient">Study Notes</span>
            </h1>
            <p className="text-muted-foreground font-body">Your collection of study materials, PDFs, and reference docs</p>
          </div>
          <Button onClick={() => setSubmitOpen(true)} className="btn-premium btn-premium-glow font-body gap-2 bg-gradient-to-r from-primary to-[hsl(280,60%,50%)] text-primary-foreground hover:scale-105 active:scale-95 transition-all duration-200">
            <Plus className="h-4 w-4" /> Submit Note
          </Button>
        </div>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search notes..."
          className="pl-10 h-11 rounded-xl bg-secondary/20 border-border/30 font-body"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 rounded-xl bg-secondary/30 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No notes yet"
          description="Notes will appear here once added. Submit your own or check back soon!"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((note, i) => {
            const Icon = TYPE_ICONS[note.type?.toLowerCase()] || FileText;
            return (
              <motion.div
                key={note.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, duration: 0.5 }}
              >
                <GlassCard className="h-full flex flex-col">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-heading font-semibold line-clamp-2 leading-snug">{note.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px] capitalize">{note.type || "note"}</Badge>
                        {note.status === "pending" && (
                          <Badge className="text-[10px] bg-[hsl(38,92%,50%)]/10 text-[hsl(38,92%,50%)]">Pending</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  {note.description && (
                    <p className="text-sm text-muted-foreground font-body line-clamp-3 mb-4 flex-1">{note.description}</p>
                  )}
                  <div className="flex gap-2 mt-auto">
                    {note.url && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 font-body flex-1"
                          onClick={() => setViewer({ open: true, title: note.title, url: note.url!, type: note.type })}
                        >
                          <Eye className="h-3.5 w-3.5" /> View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 font-body flex-1"
                          onClick={() => window.open(note.url, "_blank", "noopener,noreferrer")}
                        >
                          <ExternalLink className="h-3.5 w-3.5" /> Open
                        </Button>
                      </>
                    )}
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      )}

      <ResourceViewer
        open={viewer.open}
        onClose={() => setViewer({ open: false, title: "", url: "", type: "" })}
        title={viewer.title}
        url={viewer.url}
        type={viewer.type}
      />

      {/* Submit Note Dialog */}
      <Dialog open={submitOpen} onOpenChange={setSubmitOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">Submit a Note</DialogTitle>
            <DialogDescription className="font-body">
              Your note will be reviewed by an admin before it becomes visible to everyone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="font-body">Title</Label>
              <Input
                placeholder="Note title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="bg-secondary/30 border-border/40 font-body"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-body">Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                <SelectTrigger className="bg-secondary/30 border-border/40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["note", "pdf", "doc", "html", "link"].map((t) => (
                    <SelectItem key={t} value={t} className="capitalize font-body">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-body">URL (optional)</Label>
              <Input
                placeholder="https://..."
                value={form.url}
                onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                className="bg-secondary/30 border-border/40 font-body"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-body">Description</Label>
              <Textarea
                placeholder="Describe the note content..."
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="bg-secondary/30 border-border/40 font-body resize-none"
                rows={3}
              />
            </div>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full btn-premium font-body gap-2 bg-gradient-to-r from-primary to-[hsl(280,60%,50%)] text-primary-foreground"
            >
              {submitting ? "Submitting..." : "Submit for Review"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Notes;