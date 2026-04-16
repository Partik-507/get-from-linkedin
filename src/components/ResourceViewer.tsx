import { useState } from "react";
import { X, ExternalLink, Maximize2, Minimize2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { PDFViewer } from "@/components/PDFViewer";

interface ResourceViewerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  url: string;
  type: string;
  htmlContent?: string;
}

const getYouTubeId = (url: string) => {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match?.[1] || null;
};

const getDriveEmbedUrl = (url: string) => {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return `https://drive.google.com/file/d/${match[1]}/preview`;
  return url;
};

export const ResourceViewer = ({ open, onClose, title, url, type, htmlContent }: ResourceViewerProps) => {
  const [fullscreen, setFullscreen] = useState(false);

  if (!open) return null;

  const youtubeId = url ? getYouTubeId(url) : null;
  const isGDrive = url?.includes("drive.google.com");
  const isPdf = type === "pdf" || url?.endsWith(".pdf");

  // PDFs get the dedicated full-window offline-aware viewer
  if (isPdf && url) {
    return <PDFViewer open={open} url={url} title={title} onClose={onClose} />;
  }

  const renderContent = () => {
    // Inline HTML / Note content
    if (htmlContent) {
      return (
        <div className="w-full h-full overflow-auto bg-card rounded-lg p-2">
          <div
            className="font-editor max-w-3xl mx-auto p-6 prose prose-sm dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        </div>
      );
    }

    if (youtubeId) {
      return (
        <iframe
          src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1`}
          className="w-full h-full rounded-lg"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      );
    }

    if (isGDrive) {
      return (
        <iframe
          src={getDriveEmbedUrl(url)}
          className="w-full h-full rounded-lg"
          allow="autoplay"
        />
      );
    }

    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-4">
        <iframe src={url} className="w-full h-full rounded-lg" />
      </div>
    );
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-xl flex flex-col"
      >
        <div
          className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-border/30"
          style={{ paddingTop: "max(0.625rem, env(safe-area-inset-top))" }}
        >
          <Button variant="ghost" size="sm" onClick={onClose} className="gap-1.5 -ml-2 h-10 md:hidden">
            <ArrowLeft className="h-5 w-5" />
            <span className="font-medium">Back</span>
          </Button>
          <h3 className="font-heading font-semibold truncate flex-1 text-sm md:text-base">{title}</h3>
          <div className="flex items-center gap-1">
            {url && (
              <Button variant="ghost" size="icon" asChild className="h-10 w-10">
                <a href={url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => setFullscreen(!fullscreen)} className="h-10 w-10 hidden md:flex">
              {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-10 w-10 hidden md:flex">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className={`flex-1 ${fullscreen ? "p-0" : "p-4"} overflow-hidden`}>
          {renderContent()}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
