import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  BookOpen, Brain, FileText, Bookmark, TrendingUp, Layers,
  Focus, Zap, GraduationCap, ArrowRight, Sparkles, Timer,
} from "lucide-react";

const features = [
  { icon: BookOpen, title: "Question Library", desc: "Browse curated Q&A sets organized by project and topic" },
  { icon: Layers, title: "Flashcard Mode", desc: "Flip-card study sessions with spaced repetition tracking" },
  { icon: Brain, title: "Quiz Mode", desc: "Test yourself with randomized quizzes and instant feedback" },
  { icon: FileText, title: "Export PDF", desc: "Download study sheets as clean, formatted PDF documents" },
  { icon: Bookmark, title: "Smart Bookmarks", desc: "Save questions to custom collections for quick review" },
  { icon: TrendingUp, title: "Progress Analytics", desc: "Track streaks, heatmaps, and mastery across all projects" },
  { icon: Focus, title: "Focus Mode", desc: "Distraction-free study sessions with strict or timer modes" },
  { icon: GraduationCap, title: "Resource Hub", desc: "Access curated learning materials, docs, and guides" },
];

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-[hsl(280,70%,50%)] flex items-center justify-center text-primary-foreground font-bold text-sm">
              V
            </div>
            <span className="font-heading font-bold text-lg tracking-tight">VivaVault</span>
          </Link>
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm" className="font-body">
              <Link to="/auth">Sign In</Link>
            </Button>
            <Button asChild size="sm" className="font-body gap-1.5">
              <Link to="/auth">
                Get Started <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-1/4 w-96 h-96 rounded-full bg-primary/8 blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full bg-primary/5 blur-[100px]" />
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-20 pb-24 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-body font-medium mb-6">
              <Sparkles className="h-3.5 w-3.5" /> Your complete study companion
            </div>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-heading font-extrabold tracking-tight leading-[1.1] mb-6">
              Study smarter,{" "}
              <span className="text-gradient">score higher</span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto font-body leading-relaxed mb-10">
              The all-in-one platform for exam preparation. Flashcards, quizzes, progress tracking,
              focus sessions, and curated resources — everything you need in one place.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="font-body text-base gap-2 h-12 px-8 rounded-xl shadow-lg shadow-primary/25">
                <Link to="/auth">
                  <Zap className="h-4 w-4" /> Start Studying Free
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="font-body text-base gap-2 h-12 px-8 rounded-xl">
                <Link to="/auth">
                  <Timer className="h-4 w-4" /> Browse as Guest
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-secondary/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-heading font-extrabold tracking-tight mb-4">
              Everything you need to ace your exams
            </h2>
            <p className="text-muted-foreground font-body text-lg max-w-xl mx-auto">
              A complete study hub designed for focused, organized, and effective preparation.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06, duration: 0.5 }}
                className="bg-card border border-border/50 rounded-xl p-6 hover:border-primary/30 hover:shadow-lg transition-all duration-300"
              >
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-heading font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground font-body leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl font-heading font-extrabold mb-4">Ready to boost your grades?</h2>
          <p className="text-muted-foreground font-body text-lg mb-8">
            Join students who are already using VivaVault to prepare smarter and score higher.
          </p>
          <Button asChild size="lg" className="font-body text-base gap-2 h-12 px-8 rounded-xl">
            <Link to="/auth">
              Get Started <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-gradient-to-br from-primary to-[hsl(280,70%,50%)] flex items-center justify-center text-primary-foreground font-bold text-[10px]">
              V
            </div>
            <span className="text-sm text-muted-foreground font-body">VivaVault © {new Date().getFullYear()}</span>
          </div>
          <p className="text-xs text-muted-foreground font-body">Built for students, by students.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
