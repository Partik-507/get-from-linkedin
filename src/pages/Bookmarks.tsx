import { useState, useEffect, useMemo } from "react";
import { collection, getDocs, query, where, documentId } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Layout } from "@/components/Layout";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Bookmark, Trash2, ExternalLink, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

type BookmarkCollections = Record<string, string[]>;

interface Question {
  id: string;
  question: string;
  category: string;
  frequency: string;
  projectId: string;
}

const loadBookmarks = (): BookmarkCollections => {
  try { return JSON.parse(localStorage.getItem("vv_bookmarks") || "{}"); } catch { return {}; }
};

const Bookmarks = () => {
  const [bookmarks, setBookmarks] = useState<BookmarkCollections>(loadBookmarks);
  const [questions, setQuestions] = useState<Map<string, Question>>(new Map());
  const [loading, setLoading] = useState(true);

  const allIds = useMemo(() => {
    const ids = new Set<string>();
    Object.values(bookmarks).forEach((arr) => arr.forEach((id) => ids.add(id)));
    return Array.from(ids);
  }, [bookmarks]);

  useEffect(() => {
    document.title = "Bookmarks — VivaVault";
    if (allIds.length === 0) { setLoading(false); return; }

    const fetchQuestions = async () => {
      try {
        // Firestore 'in' query supports max 30 items
        const chunks: string[][] = [];
        for (let i = 0; i < allIds.length; i += 30) {
          chunks.push(allIds.slice(i, i + 30));
        }
        const map = new Map<string, Question>();
        for (const chunk of chunks) {
          const snap = await getDocs(query(collection(db, "questions"), where(documentId(), "in", chunk)));
          snap.docs.forEach((d) => map.set(d.id, { id: d.id, ...d.data() } as Question));
        }
        setQuestions(map);
      } catch {
        toast.error("Failed to load bookmarked questions");
      } finally {
        setLoading(false);
      }
    };
    fetchQuestions();
  }, [allIds]);

  const removeFromCollection = (collName: string, qId: string) => {
    const next = { ...bookmarks };
    next[collName] = next[collName].filter((id) => id !== qId);
    if (next[collName].length === 0) delete next[collName];
    setBookmarks(next);
    localStorage.setItem("vv_bookmarks", JSON.stringify(next));
  };

  const deleteCollection = (name: string) => {
    const next = { ...bookmarks };
    delete next[name];
    setBookmarks(next);
    localStorage.setItem("vv_bookmarks", JSON.stringify(next));
    toast.success(`Deleted "${name}"`);
  };

  const collections = Object.entries(bookmarks);

  return (
    <Layout title="Bookmarks">
      <div className="mb-8 animate-fade-in">
        <h1 className="text-3xl sm:text-4xl font-heading font-extrabold tracking-tight flex items-center gap-3">
          <Bookmark className="h-8 w-8 text-primary" />
          Bookmarks
        </h1>
        <p className="text-muted-foreground font-body mt-2">Your saved question collections</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="obsidian-card p-6 animate-pulse">
              <div className="h-4 bg-secondary rounded w-1/4 mb-4" />
              <div className="h-3 bg-secondary rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : collections.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="No bookmarks yet"
          description="Save questions from Viva Prep to create collections for focused study."
        />
      ) : (
        <div className="space-y-8">
          {collections.map(([name, ids], ci) => (
            <motion.div
              key={name}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: ci * 0.1, duration: 0.4 }}
            >
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-heading font-bold flex items-center gap-2">
                  <FolderOpen className="h-5 w-5 text-primary" />
                  {name}
                  <Badge variant="outline" className="text-xs font-body">{ids.length}</Badge>
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive text-xs"
                  onClick={() => deleteCollection(name)}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                </Button>
              </div>
              <div className="space-y-2">
                {ids.map((qId) => {
                  const q = questions.get(qId);
                  return (
                    <div key={qId} className="obsidian-card p-4 flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-mono-dm text-sm truncate text-foreground">
                          {q?.question || "Question not found"}
                        </p>
                        {q && (
                          <div className="flex gap-2 mt-1.5">
                            {q.category && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground font-body">{q.category}</span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {q?.projectId && (
                          <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                            <Link to={`/project/${q.projectId}/viva#q-${qId}`}>
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => removeFromCollection(name, qId)}
                        >
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
