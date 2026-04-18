import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { reviewQuestion, recordActivity } from "@/lib/spacedRepetition";
import { safeHtml } from "@/lib/sanitize";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check, X, RotateCcw, Trophy, ChevronRight,
  ArrowRight, HelpCircle, Lightbulb,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Question {
  id: string;
  question: string;
  answer: string;
  category: string;
  frequency: string;
  choices?: string[];
  tip: string;
}

interface QuizAnswer {
  questionId: string;
  question: string;
  correctAnswer: string;
  userAnswer: string;
  isCorrect: boolean;
}

const Quiz = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const [userInput, setUserInput] = useState("");
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [quizComplete, setQuizComplete] = useState(false);
  const [retryWrongOnly, setRetryWrongOnly] = useState(false);

  useEffect(() => {
    document.title = "Quiz Mode — VivaVault";
    const fetchData = async () => {
      try {
        const q = query(collection(db, "questions"), where("projectId", "==", projectId));
        const snap = await getDocs(q);
        const qs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Question));
        setQuestions(qs);
        startQuiz(qs);
      } catch {
        toast.error("Failed to load questions");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [projectId]);

  const startQuiz = (qs: Question[], wrongOnly?: QuizAnswer[]) => {
    let pool = qs;
    if (wrongOnly) {
      const wrongIds = new Set(wrongOnly.filter((a) => !a.isCorrect).map((a) => a.questionId));
      pool = qs.filter((q) => wrongIds.has(q.id));
    }
    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, 20);
    setQuizQuestions(shuffled);
    setCurrentIndex(0);
    setAnswers([]);
    setUserInput("");
    setSelectedChoice(null);
    setShowResult(false);
    setQuizComplete(false);
  };

  const currentQ = quizQuestions[currentIndex];
  const isMultipleChoice = currentQ?.choices && currentQ.choices.length > 0;

  const checkAnswer = () => {
    if (!currentQ) return;

    const userAnswer = isMultipleChoice ? (selectedChoice || "") : userInput.trim();
    if (!userAnswer) {
      toast.error("Please provide an answer");
      return;
    }

    // For free text, do a simple fuzzy match
    const correctAnswer = currentQ.answer || "";
    let isCorrect = false;

    if (isMultipleChoice) {
      // The first choice is correct, or the one marked with *
      const correctChoice = currentQ.choices!.find((c) => c.startsWith("*"))?.replace("*", "") || currentQ.choices![0];
      isCorrect = userAnswer.replace("*", "") === correctChoice;
    } else {
      // Simple similarity check for free text
      const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
      const correct = normalize(correctAnswer);
      const user = normalize(userAnswer);
      isCorrect = correct.includes(user) || user.includes(correct) || user.length > 3 && correct.includes(user.substring(0, Math.ceil(user.length * 0.7)));
    }

    const answer: QuizAnswer = {
      questionId: currentQ.id,
      question: currentQ.question,
      correctAnswer: isMultipleChoice
        ? (currentQ.choices!.find((c) => c.startsWith("*"))?.replace("*", "") || currentQ.choices![0])
        : correctAnswer,
      userAnswer,
      isCorrect,
    };

    setAnswers((prev) => [...prev, answer]);
    setShowResult(true);

    // Update SM-2
    reviewQuestion(currentQ.id, isCorrect ? 4 : 1);
    recordActivity(1);

    // Save to localStorage
    const key = `vv_quiz_${projectId}`;
    try {
      const existing = JSON.parse(localStorage.getItem(key) || "[]");
      existing.push({ ...answer, timestamp: Date.now() });
      localStorage.setItem(key, JSON.stringify(existing.slice(-100)));
    } catch { /* ignore */ }
  };

  const nextQuestion = () => {
    if (currentIndex < quizQuestions.length - 1) {
      setCurrentIndex((i) => i + 1);
      setUserInput("");
      setSelectedChoice(null);
      setShowResult(false);
    } else {
      setQuizComplete(true);
    }
  };

  const score = answers.filter((a) => a.isCorrect).length;
  const progressPercent = quizQuestions.length > 0
    ? Math.round(((currentIndex + (quizComplete ? 1 : 0)) / quizQuestions.length) * 100)
    : 0;

  if (loading) {
    return (
      <Layout title="Quiz" showBack>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-[hsl(280,60%,45%)] animate-pulse" />
        </div>
      </Layout>
    );
  }

  if (questions.length === 0) {
    return (
      <Layout title="Quiz" showBack>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <p className="text-muted-foreground font-body">No questions available for quiz.</p>
          <Button asChild variant="outline" className="mt-4 font-body">
            <Link to={`/project/${projectId}/viva`}>Back to Questions</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  // Quiz Complete Summary
  if (quizComplete) {
    const wrongAnswers = answers.filter((a) => !a.isCorrect);
    const percentage = Math.round((score / answers.length) * 100);

    return (
      <Layout title="Quiz Results" showBack>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto py-8"
        >
          <div className="text-center mb-8">
            <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary to-[hsl(280,60%,45%)] flex items-center justify-center mx-auto mb-6">
              <Trophy className="h-10 w-10 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-heading font-extrabold mb-2">Quiz Complete!</h1>
            <p className="text-5xl font-heading font-bold mt-4">
              <span className={percentage >= 70 ? "text-[hsl(142,71%,45%)]" : percentage >= 40 ? "text-[hsl(38,92%,50%)]" : "text-destructive"}>
                {percentage}%
              </span>
            </p>
            <p className="text-muted-foreground font-body mt-2">
              {score} of {answers.length} correct
            </p>
          </div>

          <div className="flex gap-3 justify-center mb-8">
            <Button variant="outline" onClick={() => startQuiz(questions)} className="font-body gap-2">
              <RotateCcw className="h-4 w-4" /> Retry All
            </Button>
            {wrongAnswers.length > 0 && (
              <Button onClick={() => startQuiz(questions, answers)} className="font-body gap-2">
                <RotateCcw className="h-4 w-4" /> Retry Wrong ({wrongAnswers.length})
              </Button>
            )}
          </div>

          {/* Answer Review */}
          <div className="space-y-3">
            {answers.map((a, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className={cn(
                  "obsidian-card p-4",
                  a.isCorrect ? "ring-1 ring-[hsl(142,71%,45%)]/30" : "ring-1 ring-destructive/30"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "h-6 w-6 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                    a.isCorrect ? "bg-[hsl(142,71%,45%)]/10 text-[hsl(142,71%,45%)]" : "bg-destructive/10 text-destructive"
                  )}>
                    {a.isCorrect ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-sm font-medium mb-1">{a.question}</p>
                    <p className="text-xs text-muted-foreground font-body">
                      Your answer: <span className={a.isCorrect ? "text-[hsl(142,71%,45%)]" : "text-destructive"}>{a.userAnswer}</span>
                    </p>
                    {!a.isCorrect && (
                      <p className="text-xs text-muted-foreground font-body mt-0.5">
                        Correct: <span className="text-[hsl(142,71%,45%)]">{a.correctAnswer.substring(0, 200)}</span>
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </Layout>
    );
  }

  return (
    <Layout title="Quiz Mode" showBack>
      <div className="max-w-2xl mx-auto">
        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm font-body text-muted-foreground mb-2">
            <span>Question {currentIndex + 1} of {quizQuestions.length}</span>
            <span>{score}/{answers.length} correct</span>
          </div>
          <Progress value={progressPercent} className="h-1.5" />
        </div>

        {/* Question */}
        {currentQ && (
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="obsidian-card p-6 sm:p-8 mb-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="outline" className="text-xs font-body">{currentQ.category}</Badge>
              {currentQ.frequency && (
                <Badge variant="outline" className={cn("text-xs font-body capitalize",
                  currentQ.frequency === "hot" && "badge-hot",
                  currentQ.frequency === "medium" && "badge-med",
                  currentQ.frequency === "low" && "badge-low",
                )}>{currentQ.frequency}</Badge>
              )}
            </div>

            <h2 className="text-lg font-heading font-semibold leading-relaxed mb-6">
              {currentQ.question}
            </h2>

            {!showResult && (
              <>
                {isMultipleChoice ? (
                  <div className="space-y-2">
                    {currentQ.choices!.map((choice, ci) => {
                      const cleanChoice = choice.replace(/^\*/, "");
                      return (
                        <button
                          key={ci}
                          onClick={() => setSelectedChoice(choice)}
                          className={cn(
                            "w-full text-left p-4 rounded-xl border font-body text-sm transition-all duration-200",
                            selectedChoice === choice
                              ? "border-primary bg-primary/10 text-foreground"
                              : "border-border/40 hover:border-border hover:bg-accent/30 text-muted-foreground"
                          )}
                        >
                          <span className="font-semibold mr-2 text-primary">{String.fromCharCode(65 + ci)}.</span>
                          {cleanChoice}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div>
                    <Input
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      placeholder="Type your answer..."
                      className="h-12 bg-secondary/20 border-border/30 font-body"
                      onKeyDown={(e) => e.key === "Enter" && checkAnswer()}
                    />
                  </div>
                )}

                <Button onClick={checkAnswer} className="mt-4 w-full font-body gap-2" disabled={!userInput && !selectedChoice}>
                  Submit Answer <ArrowRight className="h-4 w-4" />
                </Button>
              </>
            )}

            {showResult && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                {answers[answers.length - 1]?.isCorrect ? (
                  <div className="flex items-center gap-2 text-[hsl(142,71%,45%)]">
                    <Check className="h-5 w-5" />
                    <span className="font-heading font-semibold">Correct!</span>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2 text-destructive mb-2">
                      <X className="h-5 w-5" />
                      <span className="font-heading font-semibold">Incorrect</span>
                    </div>
                    <div className="text-sm text-muted-foreground font-body p-3 rounded-lg bg-secondary/30">
                      <p className="text-xs text-muted-foreground mb-1">Correct answer:</p>
                      <div dangerouslySetInnerHTML={{ __html: safeHtml(currentQ.answer?.substring(0, 500) || "—") }} />
                    </div>
                  </div>
                )}

                {currentQ.tip && (
                  <div className="tip-box rounded-lg p-3">
                    <div className="flex items-center gap-1.5 mb-1" style={{ color: "hsl(var(--tip-border))" }}>
                      <Lightbulb className="h-3.5 w-3.5" />
                      <span className="text-xs font-semibold font-body">Tip</span>
                    </div>
                    <p className="text-xs text-muted-foreground font-body">{currentQ.tip}</p>
                  </div>
                )}

                <Button onClick={nextQuestion} className="w-full font-body gap-2">
                  {currentIndex < quizQuestions.length - 1 ? (
                    <>Next Question <ChevronRight className="h-4 w-4" /></>
                  ) : (
                    <>See Results <Trophy className="h-4 w-4" /></>
                  )}
                </Button>
              </motion.div>
            )}
          </motion.div>
        )}
      </div>
    </Layout>
  );
};

export default Quiz;
