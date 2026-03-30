import { useState, useEffect, useMemo } from "react";
import { collection, getDocs, query, where, documentId } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Layout } from "@/components/Layout";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Bookmark, Trash2, ExternalLink, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { loadBookmarksFromFirestore, saveBookmarksToFirestore } from "@/lib/firestoreSync";

type BookmarkCollections = Record<string, string[]>;

interface Question {
  id: string;
  question: string;
  category: string;
  frequency: string;
  projectId: string;
}

const loadLocalBookmarks = (): BookmarkCollections => {
  try { return JSON.parse(localStorage.getItem("vv_bookmarks") || "{}"); } catch { return {}; }
};

const Bookmarks = () => {
  const { user } = useAuth();
  const [bookmarks, setBookmarks] = useState<BookmarkCollections>({});
  const [questions, setQuestions] = useState<Map<string, Question>>(new Map());
  const [loading, setLoading] = useState(true);

  // Load bookmarks from Firestore (signed in) or localStorage (guest)
  useEffect(() => {
    document.title = "Bookmarks — VivaVault";
    const loadData = async () => {
      let bm: BookmarkCollections;
      if (user) {
        bm = await loadBookmarksFromFirestore(user.uid);
        // Merge local bookmarks if any exist
        const local = loadLocalBookmarks();
        if (Object.keys(local).length > 0) {
          Object.entries(local).forEach(([name, ids]) => {
            if (!bm[name]) bm[name] = [];
            ids.forEach(id => { if (!bm[name].includes(id)) bm[name].push(id); });
          });
          await saveBookmarksToFirestore(user.uid, bm);
          localStorage.removeItem("vv_bookmarks");
        }
      } else {
        bm = loadLocalBookmarks();
      }
      setBookmarks(bm);

      // Fetch questions
      const allIds = new Set<string>();
      Object.values(bm).forEach(arr => arr.forEach(id => allIds.add(id)));
      if (allIds.size === 0) { setLoading(false); return; }

      try {
        const chunks: string[][] = [];
        const idArr = Array.from(allIds);
        for (let i = 0; i < idArr.length; i += 30) chunks.push(idArr.slice(i, i + 30));
        const map = new Map<string, Question>();
        for (const chunk of chunks) {
          const snap = await getDocs(query(collection(db, "questions"), where(documentId(), "in", chunk)));
          snap.docs.forEach(d => map.set(d.id, { id: d.id, ...d.data() } as Question));
        }
        setQuestions(map);
      } catch { toast.error("Failed to load bookmarked questions"); }
      finally { setLoading(false); }
    };
    loadData();
  }, [user]);

  const saveBookmarks = async (bm: BookmarkCollections) => {
    setBookmarks(bm);
    if (user) await saveBookmarksToFirestore(user.uid, bm);
    else localStorage.setItem("vv_bookmarks", JSON.stringify(bm));
  };

  const removeFromCollection = (collName: string, qId: string) => {
    const next = { ...bookmarks };
    next[collName] = next[collName].filter(id => id !== qId);
    if (next[collName].length === 0) delete next[collName];
    saveBookmarks(next);
  };

  const deleteCollection = (name: string) => {
    const next = { ...bookmarks };
    delete next[name];
    saveBookmarks(next);
    toast.success(`Deleted "${name}"`);
  };

  const collections = Object.entries(bookmarks);

  return (
    <Layout title="Bookmarks">
      <div className="mb-8 animate-fade-in">
        <h1 className="text-3xl sm:text-4xl font-heading font-extrabold tracking-tight flex items-center gap-3">
          <Bookmark className="h-8 w-8 text-primary" /> Bookmarks
        </h1>
        <p className="text-muted-foreground font-body mt-2">Your saved question collections</p>
      </div>

      {loading ? (
        <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="obsidian-card p-6 animate-pulse"><div className="h-4 bg-secondary rounded w-1/4 mb-4" /><div className="h-3 bg-secondary rounded w-3/4" /></div>)}</div>
      ) : collections.length === 0 ? (
        <EmptyState icon={FolderOpen} title="No bookmarks yet" description="Save questions from Viva Prep to create collections for focused study." />
      ) : (
        <div className="space-y-8">
          {collections.map(([name, ids], ci) => (
            <motion.div key={name} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: ci * 0.1, duration: 0.4 }}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-heading font-bold flex items-center gap-2">
                  <FolderOpen className="h-5 w-5 text-primary" /> {name}
                  <Badge variant="outline" className="text-xs font-body">{ids.length}</Badge>
                </h2>
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive text-xs" onClick={() => deleteCollection(name)}>
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                </Button>
              </div>
              <div className="space-y-2">
                {ids.map(qId => {
                  const q = questions.get(qId);
                  return (
                    <div key={qId} className="obsidian-card p-4 flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-mono-dm text-sm truncate text-foreground">{q?.question || "Question not found"}</p>
                        {q && q.category && <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground font-body mt-1.5 inline-block">{q.category}</span>}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {q?.projectId && (
                          <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                            <Link to={`/project/${q.projectId}/viva#q-${qId}`}><ExternalLink className="h-3.5 w-3.5" /></Link>
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => removeFromCollection(name, qId)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </Layout>
  );
};

export default Bookmarks;
