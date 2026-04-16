import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Download, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadFile, getCachedFileURL } from "@/lib/syncEngine";
import { toast } from "sonner";

interface PDFViewerProps {
  open: boolean;
  url: string;
  title?: string;
  onClose: () => void;
}

export const PDFViewer = ({ open, url, title, onClose }: PDFViewerProps) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fromCache, setFromCache] = useState(false);

  useEffect(() => {
    if (!open || !url) return;
    let revoked: string | null = null;
    let cancelled = false;
    setLoading(true);
    setBlobUrl(null);

    (async () => {
      try {
        const cached = await getCachedFileURL(url);
        if (cached && !cancelled) {
          setBlobUrl(cached);
          setFromCache(true);
          revoked = cached;
          setLoading(false);
          return;
        }
        const blob = await downloadFile(url);
        if (cancelled) return;
        const u = URL.createObjectURL(blob);
        revoked = u;
        setBlobUrl(u);
        setFromCache(false);
      } catch (e) {
        if (!cancelled) {
          // Fall back to direct URL
          setBlobUrl(url);
          toast.error("Couldn't cache file — viewing live");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (revoked && revoked.startsWith("blob:")) URL.revokeObjectURL(revoked);
    };
  }, [open, url]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] bg-background flex flex-col"
      >
        {/* Top bar */}
        <div
          className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-border/40 bg-card/80 backdrop-blur"
          style={{ paddingTop: "max(0.625rem, env(safe-area-inset-top))" }}
        >
          <Button variant="ghost" size="sm" onClick={onClose} className="gap-1.5 -ml-2 h-10">
            <ArrowLeft className="h-5 w-5" />
            <span className="font-medium">Back</span>
          </Button>
          <h3 className="flex-1 text-center text-sm font-semibold truncate px-2">
            {title || "Document"}
          </h3>
          <div className="flex items-center gap-1">
            {url && (
              <>
                <Button variant="ghost" size="icon" asChild className="h-10 w-10">
                  <a href={url} download>
                    <Download className="h-4 w-4" />
                  </a>
                </Button>
                <Button variant="ghost" size="icon" asChild className="h-10 w-10">
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 bg-neutral-200 dark:bg-neutral-900 relative">
          {loading && (
            <div className="absolute inset-0 grid place-items-center">
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="text-xs">Loading document…</span>
              </div>
            </div>
          )}
          {blobUrl && (
            <iframe
              src={blobUrl}
              title={title || "PDF"}
              className="w-full h-full bg-white"
            />
          )}
          {fromCache && !loading && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-wider text-muted-foreground bg-card/90 px-2 py-1 rounded-full border border-border/40">
              Offline copy
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
