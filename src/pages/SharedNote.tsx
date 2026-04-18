/**
 * SharedView — public read-only viewer for /share/:shareId and /shared/:noteId
 *
 * Resolves a `publicShares/{shareId}` mapping written by ShareModal and renders
 * the linked content (note or canvas) in read-only mode without authentication.
 *
 * Edge cases:
 *   - missing shareId → "Not found"
 *   - doc absent     → "Not found"
 *   - revoked: true  → "This link has been revoked"
 *   - deleted: true  → "Page no longer available"
 */
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, increment, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { FileText, ArrowLeft, ExternalLink, Lock, AlertTriangle } from "lucide-react";
import { safeHtml } from "@/lib/sanitize";
import { useAuth } from "@/contexts/AuthContext";

interface ShareDoc {
  pageId: string;
  userId: string;
  title: string;
  icon?: string;
  content: string;
  type?: "note" | "canvas";
  canvasNodes?: any[];
  authorName?: string;
  publishedAt?: any;
  revoked?: boolean;
  deleted?: boolean;
  views?: number;
}

const Loading = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-[hsl(240,70%,50%)] animate-pulse" />
  </div>
);

const ErrorView = ({ icon: Icon, title, body }: { icon: any; title: string; body: string }) => (
  <div className="min-h-screen bg-background flex items-center justify-center px-6">
    <div className="text-center max-w-sm">
      <div className="h-16 w-16 rounded-2xl bg-muted/30 mx-auto mb-4 flex items-center justify-center">
        <Icon className="h-7 w-7 text-muted-foreground/60" />
      </div>
      <h1 className="text-xl font-heading font-semibold mb-1.5">{title}</h1>
      <p className="text-sm text-muted-foreground font-body">{body}</p>
    </div>
  </div>
);

const SharedView = () => {
  // Accept BOTH route params (legacy /shared/:noteId and new /share/:shareId)
  const params = useParams();
  const shareId = params.shareId || params.noteId;
  const navigate = useNavigate();
  const { user } = useAuth();

  const [data, setData] = useState<ShareDoc | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "notfound" | "revoked" | "deleted">("loading");

  useEffect(() => {
    if (!shareId) { setState("notfound"); return; }
    let mounted = true;
    (async () => {
      try {
        // 1. New shape — publicShares/{slug}
        let snap = await getDoc(doc(db, "publicShares", shareId));
        // 2. Legacy fallback — published_notes/{noteId}
        if (!snap.exists()) {
          snap = await getDoc(doc(db, "published_notes", shareId));
        }
        if (!mounted) return;
        if (!snap.exists()) { setState("notfound"); return; }
        const d = snap.data() as ShareDoc;
        if (d.revoked) { setState("revoked"); return; }
        if (d.deleted) { setState("deleted"); return; }
        setData(d);
        setState("ok");
        // Best-effort view counter — silent on failure (rules might block)
        try {
          await updateDoc(doc(db, "publicShares", shareId), { views: increment(1) });
        } catch { /* ignore */ }
      } catch {
        if (mounted) setState("notfound");
      }
    })();
    return () => { mounted = false; };
  }, [shareId]);

  if (state === "loading") return <Loading />;
  if (state === "notfound") return <ErrorView icon={FileText} title="Page not found" body="This share link is invalid or no longer exists." />;
  if (state === "revoked") return <ErrorView icon={Lock} title="Link revoked" body="The author has disabled this share link." />;
  if (state === "deleted") return <ErrorView icon={AlertTriangle} title="Page no longer available" body="This page has been deleted by the author." />;
  if (!data) return null;

  const isCanvas = data.type === "canvas";

  return (
    <div className="min-h-screen bg-background">
      {/* Top banner */}
      <div className="sticky top-0 z-30 border-b border-border/40 bg-background/90 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-12 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary to-[hsl(240,70%,50%)] flex items-center justify-center text-primary-foreground text-xs font-bold shrink-0">V</div>
            <div className="min-w-0">
              <p className="text-[11px] font-body text-muted-foreground leading-none">Shared (read-only)</p>
              <p className="text-xs font-body font-medium truncate">{data.authorName || "Anonymous"}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {user ? (
              <button
                onClick={() => navigate("/notes")}
                className="text-xs font-body text-primary hover:underline flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-primary/10"
              >
                <ExternalLink className="h-3 w-3" /> Open in workspace
              </button>
            ) : (
              <button
                onClick={() => navigate("/auth")}
                className="text-xs font-body text-primary hover:underline px-2 py-1 rounded-lg hover:bg-primary/10"
              >
                Sign in
              </button>
            )}
          </div>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <header className="mb-6">
          <div className="flex items-center gap-2.5 mb-3">
            <span className="text-3xl">{data.icon || (isCanvas ? "🎨" : "📄")}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-heading font-bold tracking-tight">{data.title || "Untitled"}</h1>
        </header>

        {isCanvas ? (
          <div className="rounded-2xl border border-border/40 bg-card/50 overflow-hidden">
            <div className="aspect-[4/3] flex items-center justify-center bg-muted/20">
              <div className="text-center px-6">
                <div className="h-14 w-14 rounded-2xl bg-muted/40 mx-auto mb-3 flex items-center justify-center">
                  <span className="text-2xl">🎨</span>
                </div>
                <p className="text-sm font-body font-medium mb-1">Canvas board</p>
                <p className="text-xs text-muted-foreground font-body">
                  {data.canvasNodes?.length || 0} node{data.canvasNodes?.length === 1 ? "" : "s"} · Open in workspace to view interactively
                </p>
              </div>
            </div>
          </div>
        ) : (
          <article
            className="prose prose-sm sm:prose-base dark:prose-invert max-w-none font-body"
            dangerouslySetInnerHTML={{ __html: safeHtml(data.content || "") }}
          />
        )}

        <footer className="mt-12 pt-6 border-t border-border/30 flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="text-xs font-body text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <ArrowLeft className="h-3 w-3" /> Back to VivaVault
          </button>
          {data.views != null && (
            <span className="text-[10px] font-body text-muted-foreground/60">{data.views} view{data.views === 1 ? "" : "s"}</span>
          )}
        </footer>
      </main>
    </div>
  );
};

export default SharedView;
