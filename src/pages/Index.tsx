import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Layout } from "@/components/Layout";
import { GridSkeleton } from "@/components/LoadingSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { BookOpen, ExternalLink, FolderOpen } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface Project {
  id: string;
  code: string;
  name: string;
  description: string;
  color: string;
  photoUrl?: string;
}

const PROJECT_COLORS = [
  "from-primary to-[hsl(280,60%,45%)]",
  "from-[hsl(210,80%,50%)] to-[hsl(230,70%,45%)]",
  "from-[hsl(340,70%,50%)] to-[hsl(320,60%,45%)]",
  "from-[hsl(160,70%,40%)] to-[hsl(180,60%,35%)]",
  "from-[hsl(30,80%,50%)] to-[hsl(15,70%,45%)]",
  "from-[hsl(190,70%,45%)] to-[hsl(210,60%,40%)]",
];

const Index = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "VivaVault — IITM BS Viva Prep";
    const fetchProjects = async () => {
      try {
        const snap = await getDocs(collection(db, "projects"));
        setProjects(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Project)));
      } catch {
        toast.error("Failed to load projects");
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  return (
    <Layout>
      <div className="mb-10 animate-fade-in">
        <h1 className="text-4xl sm:text-5xl font-heading font-extrabold tracking-tight mb-3">
          <span className="text-gradient">VivaVault</span>
        </h1>
        <p className="text-muted-foreground text-lg max-w-xl font-body">
          Your premium preparation companion for IITM BS project vivas. Choose a project to begin.
        </p>
      </div>

      {loading ? (
        <GridSkeleton />
      ) : projects.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="No projects yet"
          description="Projects will appear here once an admin adds them."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project, i) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 16, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ delay: i * 0.08, duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
            >
              <div className="obsidian-card flex flex-col overflow-hidden h-full">
                {/* Project Photo */}
                {project.photoUrl && (
                  <div className="h-40 w-full overflow-hidden">
                    <img
                      src={project.photoUrl}
                      alt={project.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                )}
                <div className="p-6 flex flex-col flex-1">
                  <div className="flex items-start gap-4 mb-4">
                    <div
                      className={`h-12 w-12 rounded-xl bg-gradient-to-br ${PROJECT_COLORS[i % PROJECT_COLORS.length]} flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-lg`}
                    >
                      {project.code?.slice(0, 2) || "P"}
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-xl font-heading font-bold tracking-tight">{project.code}</h2>
                      <p className="text-sm text-muted-foreground truncate font-body">{project.name}</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-6 flex-1 line-clamp-2 font-body">
                    {project.description || "Prepare for your viva with curated questions and community experiences."}
                  </p>
                  <div className="flex gap-3">
                    <Button
                      asChild
                      className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-200 active:scale-[0.97] font-body"
                    >
                      <Link to={`/project/${project.id}/viva`}>
                        <BookOpen className="h-4 w-4 mr-1.5" /> Viva Prep
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="transition-all duration-200 active:scale-[0.97] font-body border-border/50">
                      <Link to={`/project/${project.id}/resources`}>
                        <ExternalLink className="h-4 w-4 mr-1.5" /> Resources
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </Layout>
  );
};

export default Index;