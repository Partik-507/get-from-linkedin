import { useState } from "react";
import { X, ExternalLink, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

interface ResourceViewerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  url: string;
  type: string;
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

export const ResourceViewer = ({ open, onClose, title, url, type }: ResourceViewerProps) => {
  const [fullscreen, setFullscreen] = useState(false);

  if (!open) return null;

  const youtubeId = getYouTubeId(url);
  const isGDrive = url.includes("drive.google.com");
  const isPdf = type === "pdf" || url.endsWith(".pdf");

  const renderContent = () => {
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

    if (isPdf) {
      return (
        <iframe
          src={url}
          className="w-full h-full rounded-lg"
        />
      );
    }

    // Generic iframe with fallback
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-4">
        <iframe
          src={url}
          className="w-full h-full rounded-lg"
          onError={() => {}}
        />
      </div>
    );
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-background/90 backdrop-blur-xl flex flex-col"
      >
        {/* Title bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
          <h3 className="font-heading font-semibold truncate">{title}</h3>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" asChild>
              <a href={url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setFullscreen(!fullscreen)}>
              {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className={`flex-1 ${fullscreen ? "p-0" : "p-4"}`}>
          {renderContent()}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
