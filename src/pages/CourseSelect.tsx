import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Layout } from "@/components/Layout";
import { motion } from "framer-motion";
import { BookOpen, FolderOpen, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const CourseSelect = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState<{ code?: string; name?: string; description?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Choose Path — VivaVault";
    if (!courseId) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "projects", courseId));
        if (snap.exists()) setCourse(snap.data() as any);
      } finally { setLoading(false); }
    })();
  }, [courseId]);

  return (
    <Layout title={course?.code || "Course"} showBack>
      <div className="max-w-4xl mx-auto py-8">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <h1 className="text-3xl font-heading font-bold tracking-tight">
            {loading ? "Loading…" : (course?.code || "Course")}
          </h1>
          {course?.name && <p className="text-base text-muted-foreground font-body mt-2">{course.name}</p>}
          <p className="text-sm text-muted-foreground/80 font-body mt-4">Choose where you'd like to start.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <motion.button
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            onClick={() => navigate(`/project/${courseId}/viva`)}
            className="vv-card p-8 text-left group hover:border-primary/40"
          >
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/15 transition-colors">
              <BookOpen className="h-7 w-7 text-primary" />
            </div>
            <h2 className="text-xl font-heading font-bold mb-2">Question Bank</h2>
            <p className="text-sm text-muted-foreground font-body mb-5">
              Practice with curated questions, flashcards, and viva prep material.
            </p>
            <span className="inline-flex items-center gap-1.5 text-sm font-body text-primary font-medium">
              Start practicing <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </motion.button>

          <motion.button
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            onClick={() => navigate(`/project/${courseId}/resources`)}
            className="vv-card p-8 text-left group hover:border-primary/40"
          >
            <div className="h-14 w-14 rounded-2xl bg-[hsl(210,80%,50%)]/10 flex items-center justify-center mb-5 group-hover:bg-[hsl(210,80%,50%)]/15 transition-colors">
              <FolderOpen className="h-7 w-7 text-[hsl(210,80%,50%)]" />
            </div>
            <h2 className="text-xl font-heading font-bold mb-2">Resources</h2>
            <p className="text-sm text-muted-foreground font-body mb-5">
              Access study materials: PDFs, videos, links, and notes for this course.
            </p>
            <span className="inline-flex items-center gap-1.5 text-sm font-body text-[hsl(210,80%,50%)] font-medium">
              Browse resources <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </motion.button>
        </div>

        <div className="text-center mt-8">
          <Button variant="ghost" onClick={() => navigate(-1)} className="font-body text-muted-foreground gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to courses
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default CourseSelect;
