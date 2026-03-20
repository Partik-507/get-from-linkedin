import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Layout } from "@/components/Layout";
import { GlassCard } from "@/components/GlassCard";
import { EmptyState } from "@/components/EmptyState";
import { GridSkeleton } from "@/components/LoadingSkeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  ExternalLink, Youtube, Github, FileText, BookOpen, FolderOpen,
  Link2, HardDrive, Bookmark,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Resource {
  id: string;
  title: string;
  url: string;
  type: string;
  category: string;
  description: string;
}

const CATEGORY_TABS = ["All", "Guidelines", "Milestones", "YouTube", "GitHub", "Docs", "Drive", "Other"];

const TYPE_CONFIG: Record<string, { icon: any; color: string }> = {
  youtube: { icon: Youtube, color: "text-red-400 bg-red-400/10" },
  github: { icon: Github, color: "text-foreground bg-muted" },
  pdf: { icon: FileText, color: "text-red-400 bg-red-400/10" },
  drive: { icon: HardDrive, color: "text-emerald-400 bg-emerald-400/10" },
  docs: { icon: BookOpen, color: "text-blue-400 bg-blue-400/10" },
  other: { icon: Link2, color: "text-muted-foreground bg-muted" },
};

const Resources = () => {
  const { projectId } = useParams();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("All");

  useEffect(() => {
    document.title = "Resources — VivaVault";
    const fetch = async () => {
      try {
        const q = query(collection(db, "resources"), where("projectId", "==", projectId));
        const snap = await getDocs(q);
        setResources(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Resource)));
      } catch {
        toast.error("Failed to load resources");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [projectId]);

  const filtered = activeTab === "All"
    ? resources
    : resources.filter((r) => r.category?.toLowerCase() === activeTab.toLowerCase() || r.type?.toLowerCase() === activeTab.toLowerCase());

  return (
    <Layout title="Resources" showBack>
      <div className="mb-8 animate-fade-in">
        <h1 className="text-3xl font-bold mb-2">Resources</h1>
        <p className="text-muted-foreground">Curated links and materials to help you prepare</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-none">
        {CATEGORY_TABS.map((tab) => (
          <Badge
            key={tab}
            variant={activeTab === tab ? "default" : "outline"}
            className={cn(
              "cursor-pointer whitespace-nowrap text-sm px-4 py-1.5 transition-all duration-150 active:scale-95 shrink-0",
              activeTab === tab
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "hover:bg-muted"
            )}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </Badge>
        ))}
      </div>

      {loading ? (
        <GridSkeleton />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title="No resources yet"
          description="Resources for this project will be added soon. Check back later!"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((r, i) => {
            const config = TYPE_CONFIG[r.type?.toLowerCase()] || TYPE_CONFIG.other;
            const Icon = config.icon;
            return (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ delay: Math.min(i * 0.06, 0.4), duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              >
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block group"
                >
                  <GlassCard className="h-full flex flex-col transition-transform duration-200 group-hover:scale-[1.02] group-active:scale-[0.98]">
                    <div className="flex items-start gap-3 mb-3">
                      <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", config.color)}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold truncate group-hover:text-primary transition-colors">{r.title}</h3>
                        <p className="text-xs text-muted-foreground capitalize">{r.type || r.category}</p>
                      </div>
                    </div>
                    {r.description && (
                      <p className="text-sm text-muted-foreground mb-4 flex-1 line-clamp-2">{r.description}</p>
                    )}
                    <div className="flex justify-end mt-auto">
                      <Button size="sm" variant="outline" className="gap-1.5 transition-all active:scale-95">
                        Open <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </GlassCard>
                </a>
              </motion.div>
            );
          })}
        </div>
      )}
    </Layout>
  );
};

export default Resources;
