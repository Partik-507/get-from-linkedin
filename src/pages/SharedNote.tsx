import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { FileText } from "lucide-react";

const SharedNote = () => {
  const { noteId } = useParams();
  const [note, setNote] = useState<{ title: string; content: string; authorName: string; publishedAt: any } | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!noteId) { setNotFound(true); setLoading(false); return; }
    const fetch = async () => {
      try {
        const snap = await getDoc(doc(db, "published_notes", noteId));
        if (snap.exists()) setNote(snap.data() as any);
        else setNotFound(true);
      } catch { setNotFound(true); }
      setLoading(false);
    };
    fetch();
  }, [noteId]);

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="h-8 w-8 rounded-lg bg-primary/20 animate-pulse" />
    </div>
  );

  if (notFound || !note) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
        <h1 className="text-lg font-heading font-semibold">Note not found</h1>
        <p className="text-sm text-muted-foreground font-body mt-1">This note may have been unpublished.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40 px-6 py-4 max-w-3xl mx-auto">
        <p className="text-xs text-muted-foreground font-body">Published by {note.authorName || "Anonymous"}</p>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-heading font-bold mb-6">{note.title}</h1>
        <div
          className="prose prose-sm dark:prose-invert max-w-none font-body"
          dangerouslySetInnerHTML={{ __html: note.content }}
        />
      </main>
    </div>
  );
};

export default SharedNote;
