import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Layout } from "@/components/Layout";
import { EmptyState } from "@/components/EmptyState";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ResourceViewer } from "@/components/ResourceViewer";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  FileText, ExternalLink, Eye, Search, BookOpen, File, Link2,
} from "lucide-react";

interface Note {
  id: string;
  title: string;
  type: string;
  description: string;
  url?: string;
  content?: string;
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
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [viewer, setViewer] = useState<{ open: boolean; title: string; url: string; type: string }>({
    open: false, title: "", url: "", type: "",
  });

  useEffect(() => {
    document.title = "Notes — VivaVault";
    const fetch = async () => {
      try {
        const snap = await getDocs(collection(db, "notes"));
        setNotes(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Note)));
      } catch {
        toast.error("Failed to load notes");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const filtered = notes.filter((n) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return n.title?.toLowerCase().includes(s) || n.description?.toLowerCase().includes(s);
  });

  return (
    <Layout title="Notes">
      <div className="mb-8 animate-fade-in">
        <h1 className="text-3xl font-heading font-extrabold tracking-tight mb-2">
          <span className="text-gradient">Study Notes</span>
        </h1>
        <p className="text-muted-foreground font-body">Your collection of study materials, PDFs, and reference docs</p>
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
          description="Notes will appear here once an admin adds them. Check back soon!"
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
                      <Badge variant="outline" className="text-[10px] mt-1 capitalize">{note.type || "note"}</Badge>
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
    </Layout>
  );
};

export default Notes;
