import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  BookOpen, Brain, FileText, Bookmark, TrendingUp, Layers,
  Focus, Zap, GraduationCap, ArrowRight, Sparkles, Timer,
  Users, HelpCircle,
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

const stats = [
  { label: "Active Students", value: "500+", icon: Users },
  { label: "Questions", value: "2,000+", icon: HelpCircle },
  { label: "Projects Covered", value: "15+", icon: BookOpen },
];

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-xl border-b border-border/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-[hsl(240,70%,50%)] flex items-center justify-center text-primary-foreground font-bold text-sm">
              V
            </div>
            <span className="font-heading font-bold text-lg tracking-tight">VivaVault</span>
          </Link>
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm" className="font-body text-sm">
              <Link to="/auth">Sign In</Link>
            </Button>
            <Button asChild size="sm" className="font-body gap-1.5 text-sm rounded-lg">
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
          <div className="absolute top-20 left-1/4 w-[500px] h-[500px] rounded-full bg-primary/6 blur-[140px]" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full bg-primary/4 blur-[120px]" />
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-20 pb-24 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/8 text-primary text-sm font-body font-medium mb-8">
              <Sparkles className="h-3.5 w-3.5" /> Your complete study companion
            </div>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-heading font-extrabold tracking-tight leading-[1.08] mb-6">
              Study smarter,{" "}
              <span className="text-gradient">score higher</span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto font-body leading-relaxed mb-10">
              The all-in-one platform for IITM BS exam preparation. Flashcards, quizzes, progress tracking,
              focus sessions, and curated resources — everything you need in one place.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild size="lg" className="font-body text-base gap-2 h-12 px-8 rounded-xl shadow-lg shadow-primary/20 btn-premium btn-premium-glow">
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

      {/* Social Proof */}
      <section className="py-10 border-y border-border/30 bg-secondary/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-3 gap-6">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <s.icon className="h-5 w-5 text-primary mx-auto mb-2" />
                <p className="text-2xl sm:text-3xl font-heading font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground font-body mt-1">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-heading font-extrabold tracking-tight mb-4">
              Everything you need to ace your exams
            </h2>
            <p className="text-muted-foreground font-body text-lg max-w-xl mx-auto">
              A complete study hub designed for focused, organized, and effective preparation.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05, duration: 0.5 }}
                className="vv-card p-5 group"
              >
                <div className="h-10 w-10 rounded-xl bg-primary/8 flex items-center justify-center mb-4 group-hover:bg-primary/12 transition-colors">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-heading font-semibold text-sm mb-1.5">{f.title}</h3>
                <p className="text-xs text-muted-foreground font-body leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-secondary/20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl font-heading font-extrabold mb-4">Ready to boost your grades?</h2>
          <p className="text-muted-foreground font-body text-lg mb-8">
            Join hundreds of IITM BS students who are already studying smarter with VivaVault.
          </p>
          <Button asChild size="lg" className="font-body text-base gap-2 h-12 px-8 rounded-xl btn-premium btn-premium-glow">
            <Link to="/auth">
              Get Started <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/30 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-gradient-to-br from-primary to-[hsl(240,70%,50%)] flex items-center justify-center text-primary-foreground font-bold text-[10px]">
              V
            </div>
            <span className="text-sm text-muted-foreground font-body">VivaVault © {new Date().getFullYear()}</span>
          </div>
          <p className="text-xs text-muted-foreground font-body">Built for IITM BS students.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
