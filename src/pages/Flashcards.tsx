import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { FlipCard } from "@/components/FlipCard";
import { reviewQuestion, recordActivity } from "@/lib/spacedRepetition";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, ChevronRight, Check, RotateCcw, Trophy,
  Eye, Shuffle, Lightbulb,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Question {
  id: string;
  question: string;
  answer: string;
  category: string;
  frequency: string;
  tip: string;
}

type CardStatus = "unseen" | "known" | "review";

const Flashcards = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [statuses, setStatuses] = useState<Map<string, CardStatus>>(new Map());
  const [deck, setDeck] = useState<Question[]>([]);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [reviewRound, setReviewRound] = useState(false);

  useEffect(() => {
    document.title = "Flashcards — VivaVault";
    const fetchData = async () => {
      try {
        const q = query(collection(db, "questions"), where("projectId", "==", projectId));
        const snap = await getDocs(q);
        const qs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Question));
        setQuestions(qs);
        setDeck([...qs].sort(() => Math.random() - 0.5));
      } catch {
        toast.error("Failed to load questions");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [projectId]);

  const goNext = useCallback(() => {
    if (currentIndex < deck.length - 1) {
      setCurrentIndex((i) => i + 1);
      setFlipped(false);
    } else {
      const reviewCards = deck.filter((q) => statuses.get(q.id) === "review");
      if (reviewCards.length > 0 && !reviewRound) {
        setDeck(reviewCards.sort(() => Math.random() - 0.5));
        setCurrentIndex(0);
        setFlipped(false);
        setReviewRound(true);
        toast.info(`Reviewing ${reviewCards.length} flagged cards`);
      } else {
        setSessionComplete(true);
      }
    }
  }, [currentIndex, deck, statuses, reviewRound]);

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
      setFlipped(false);
    }
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (sessionComplete) return;
    if (e.key === " " || e.key === "Enter") { e.preventDefault(); setFlipped((f) => !f); }
    else if (e.key === "ArrowRight") goNext();
    else if (e.key === "ArrowLeft") goPrev();
  }, [sessionComplete, goNext]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const markCard = (status: CardStatus) => {
    const q = deck[currentIndex];
    if (!q) return;
    setStatuses((prev) => { const next = new Map(prev); next.set(q.id, status); return next; });
    const quality = status === "known" ? 4 : 1;
    reviewQuestion(q.id, quality);
    recordActivity(1);
    setTimeout(goNext, 300);
  };

  const resetSession = () => {
    setDeck([...questions].sort(() => Math.random() - 0.5));
    setStatuses(new Map());
    setCurrentIndex(0);
    setFlipped(false);
    setSessionComplete(false);
    setReviewRound(false);
  };

  const knownCount = [...statuses.values()].filter((s) => s === "known").length;
  const reviewCount = [...statuses.values()].filter((s) => s === "review").length;
  const progressPercent = deck.length > 0 ? Math.round(((currentIndex + (sessionComplete ? 1 : 0)) / deck.length) * 100) : 0;
  const currentQuestion = deck[currentIndex];

  if (loading) {
    return (
      <Layout title="Flashcards" showBack>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-[hsl(280,60%,45%)] animate-pulse" />
        </div>
      </Layout>
    );
  }

  if (questions.length === 0) {
    return (
      <Layout title="Flashcards" showBack>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <p className="text-muted-foreground font-body">No questions available for flashcards.</p>
          <Button asChild variant="outline" className="mt-4 font-body">
            <Link to={`/project/${projectId}/viva`}>Back to Questions</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  if (sessionComplete) {
    return (
      <Layout title="Flashcards" showBack>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-lg mx-auto text-center py-16">
          <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary to-[hsl(280,60%,45%)] flex items-center justify-center mx-auto mb-6">
            <Trophy className="h-10 w-10 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-heading font-extrabold mb-3">Session Complete!</h1>
          <p className="text-muted-foreground font-body mb-8">Great work!</p>
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-card border border-border/50 rounded-xl p-6 text-center">
              <p className="text-3xl font-heading font-bold text-[hsl(142,71%,45%)]">{knownCount}</p>
              <p className="text-sm text-muted-foreground font-body mt-1">Known</p>
            </div>
            <div className="bg-card border border-border/50 rounded-xl p-6 text-center">
              <p className="text-3xl font-heading font-bold text-[hsl(38,92%,50%)]">{reviewCount}</p>
              <p className="text-sm text-muted-foreground font-body mt-1">Review</p>
            </div>
          </div>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={resetSession} className="font-body gap-2">
              <RotateCcw className="h-4 w-4" /> Try Again
            </Button>
            <Button asChild className="font-body gap-2">
              <Link to={`/project/${projectId}/quiz`}>Take Quiz</Link>
            </Button>
          </div>
        </motion.div>
      </Layout>
    );
  }

  return (
    <Layout title="Flashcards" showBack>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm font-body text-muted-foreground mb-2">
            <span>
              Card {currentIndex + 1} of {deck.length}
              {reviewRound && <Badge className="ml-2 text-[10px] bg-[hsl(38,92%,50%)] text-background">Review Round</Badge>}
            </span>
            <span>{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-1.5" />
        </div>

        <div className="flex justify-center gap-6 mb-6 text-sm font-body">
          <span className="text-[hsl(142,71%,45%)] flex items-center gap-1"><Check className="h-3.5 w-3.5" /> {knownCount} Known</span>
          <span className="text-[hsl(38,92%,50%)] flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {reviewCount} Review</span>
        </div>

        {currentQuestion && (
          <FlipCard
            flipped={flipped}
            onFlip={() => setFlipped(!flipped)}
            className="h-[400px] sm:h-[450px] mb-6"
            front={
              <div className="text-center">
                <span className="text-xs text-muted-foreground font-body mb-4 block">{currentQuestion.category}</span>
                <p className="text-lg sm:text-xl font-heading font-semibold leading-relaxed">{currentQuestion.question}</p>
                <p className="text-xs text-muted-foreground font-body mt-6 flex items-center gap-1 justify-center">
                  <Shuffle className="h-3 w-3" /> Click or press Space to flip
                </p>
              </div>
            }
            back={
              <div>
                <span className="text-xs text-primary font-body mb-3 block">Answer</span>
                {currentQuestion.answer ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none font-body leading-relaxed">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {currentQuestion.answer.replace(/<[^>]+>/g, "")}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-muted-foreground italic font-body">No answer provided yet.</p>
                )}
                {currentQuestion.tip && (
                  <div className="tip-box rounded-lg p-3 mt-4">
                    <div className="flex items-center gap-1.5 mb-1" style={{ color: "hsl(var(--tip-border))" }}>
                      <Lightbulb className="h-3.5 w-3.5" />
                      <span className="text-xs font-semibold font-body">Tip</span>
                    </div>
                    <p className="text-xs text-muted-foreground font-body">{currentQuestion.tip}</p>
                  </div>
                )}
              </div>
            }
          />
        )}

        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" size="icon" onClick={goPrev} disabled={currentIndex === 0} className="h-12 w-12 rounded-full">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button variant="outline" onClick={() => markCard("review")} className="h-12 px-6 rounded-full font-body gap-2 border-[hsl(38,92%,50%)]/40 text-[hsl(38,92%,50%)] hover:bg-[hsl(38,92%,50%)]/10">
            <Eye className="h-4 w-4" /> Review Later
          </Button>
          <Button onClick={() => markCard("known")} className="h-12 px-6 rounded-full font-body gap-2 bg-[hsl(142,71%,45%)] hover:bg-[hsl(142,71%,40%)] text-background">
            <Check className="h-4 w-4" /> Known
          </Button>
          <Button variant="outline" size="icon" onClick={goNext} disabled={currentIndex >= deck.length - 1} className="h-12 w-12 rounded-full">
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
        <p className="text-center text-xs text-muted-foreground font-body mt-4">Use ← → arrows to navigate, Space to flip</p>
      </div>
    </Layout>
  );
};

export default Flashcards;
