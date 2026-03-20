import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, addDoc, getDocs, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Layout } from "@/components/Layout";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Send, CheckCircle2, Loader2, ShieldCheck, Flame, TrendingUp, Minus, Code2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Project {
  id: string;
  code: string;
  name: string;
}

const FREQUENCIES = [
  { value: "hot", label: "Hot", desc: "Asked very often", icon: Flame, color: "badge-hot border border-[hsl(var(--badge-hot-text))]/20" },
  { value: "medium", label: "Medium", desc: "Asked sometimes", icon: TrendingUp, color: "badge-med border border-[hsl(var(--badge-med-text))]/20" },
  { value: "low", label: "Low", desc: "Rarely asked", icon: Minus, color: "bg-muted text-muted-foreground border border-border" },
];

const CODE_LANGUAGES = ["Python", "JavaScript", "HTML", "CSS", "SQL", "Other"];

const SubmitQuestion = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showCode, setShowCode] = useState(false);

  const [form, setForm] = useState({
    projectId: "",
    category: "",
    question: "",
    answer: "",
    tip: "",
    projectTip: "",
    codeExample: "",
    codeLanguage: "",
    proctors: "",
    tags: "",
    name: user?.displayName || "",
    isAnonymous: false,
    frequency: "medium",
  });

  useEffect(() => {
    document.title = "Submit Question — VivaVault";
    const fetchProjects = async () => {
      try {
        const snap = await getDocs(collection(db, "projects"));
        setProjects(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Project)));
      } catch {
        // silent
      }
    };
    fetchProjects();
  }, []);

  const update = (field: string, value: any) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async () => {
    if (!form.question.trim()) {
      toast.error("Please enter a question");
      return;
    }
    setLoading(true);
    try {
      await addDoc(collection(db, "question_submissions"), {
        projectId: form.projectId || null,
        category: form.category || "General",
        question: form.question.trim(),
        answer: form.answer,
        tip: form.tip,
        projectTip: form.projectTip,
        codeExample: showCode ? form.codeExample : "",
        codeLanguage: showCode ? form.codeLanguage : "",
        proctors: form.proctors ? form.proctors.split(",").map((s) => s.trim()).filter(Boolean) : [],
        tags: form.tags ? form.tags.split(",").map((s) => s.trim()).filter(Boolean) : [],
        submittedBy: form.isAnonymous ? "Anonymous" : form.name || "Anonymous",
        isAnonymous: form.isAnonymous,
        userId: user?.uid || null,
        frequency: form.frequency,
        status: "pending",
        createdAt: serverTimestamp(),
      });
      setSuccess(true);
      toast.success("Question submitted for review!");
    } catch (e: any) {
      toast.error(e.message || "Failed to submit question");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Layout showBack>
        <div className="flex items-center justify-center min-h-[60vh]">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", duration: 0.6 }}
            className="text-center max-w-md"
          >
            <div className="h-20 w-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Thank You for Contributing!</h2>
            <p className="text-muted-foreground">Your question will be reviewed and added to the bank soon.</p>
            <Button variant="outline" className="mt-6" onClick={() => navigate("/")}>
              Back to Home
            </Button>
          </motion.div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Submit Question" showBack>
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 animate-fade-in">
          <h1 className="text-3xl font-bold mb-3">Help Build the Question Bank</h1>
          <p className="text-muted-foreground">
            Share a question you were asked or an answer you think could help others.
          </p>
          <Badge className="mt-3 bg-emerald-500/15 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20">
            <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />
            Everything is optional except the question itself
          </Badge>
        </div>

        <div className="space-y-8 animate-fade-in" style={{ animationDelay: "100ms" }}>
          {/* The Question */}
          <GlassCard hover={false}>
            <h3 className="text-lg font-semibold mb-4">The Question</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Question Text <span className="text-destructive">*</span></Label>
                <Textarea
                  placeholder="What question were you asked, or what question should be in the bank?"
                  value={form.question}
                  onChange={(e) => update("question", e.target.value)}
                  rows={4}
                  className="bg-secondary border-border resize-none text-base"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Project</Label>
                  <Select value={form.projectId} onValueChange={(v) => update("projectId", v)}>
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.code} — {p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Input
                    placeholder="e.g. ORM & Database, HTTP & REST"
                    value={form.category}
                    onChange={(e) => update("category", e.target.value)}
                    className="bg-secondary border-border"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>How often is this asked?</Label>
                <div className="grid grid-cols-3 gap-3">
                  {FREQUENCIES.map((f) => {
                    const Icon = f.icon;
                    return (
                      <button
                        key={f.value}
                        type="button"
                        onClick={() => update("frequency", f.value)}
                        className={cn(
                          "p-3 rounded-xl text-center transition-all duration-200 active:scale-[0.97]",
                          form.frequency === f.value
                            ? `${f.color} ring-2 ring-primary/30`
                            : "bg-secondary border border-border hover:border-primary/30"
                        )}
                      >
                        <Icon className="h-4 w-4 mx-auto mb-1" />
                        <p className="text-sm font-medium">{f.label}</p>
                        <p className="text-[10px] text-muted-foreground">{f.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </GlassCard>

          {/* The Answer */}
          <GlassCard hover={false}>
            <h3 className="text-lg font-semibold mb-4">The Answer</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Simple Answer</Label>
                <Textarea
                  placeholder="Plain English explanation of the answer..."
                  value={form.answer}
                  onChange={(e) => update("answer", e.target.value)}
                  rows={4}
                  className="bg-secondary border-border resize-none"
                />
              </div>
              <div className="space-y-2">
                <Label>Interview Tip</Label>
                <Textarea
                  placeholder="What to say in the interview — phrasing tips, keywords to use..."
                  value={form.tip}
                  onChange={(e) => update("tip", e.target.value)}
                  rows={3}
                  className="bg-secondary border-border resize-none"
                />
              </div>
              <div className="space-y-2">
                <Label>Project Tip</Label>
                <Textarea
                  placeholder="How to relate this to your MAD1/MAD2/etc. project..."
                  value={form.projectTip}
                  onChange={(e) => update("projectTip", e.target.value)}
                  rows={3}
                  className="bg-secondary border-border resize-none"
                />
              </div>
            </div>
          </GlassCard>

          {/* Code Example */}
          <GlassCard hover={false}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Code2 className="h-5 w-5" /> Code Example
              </h3>
              <div className="flex items-center gap-2">
                <Label className="text-sm text-muted-foreground">Include code</Label>
                <Switch checked={showCode} onCheckedChange={setShowCode} />
              </div>
            </div>
            {showCode && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label>Language</Label>
                  <Select value={form.codeLanguage} onValueChange={(v) => update("codeLanguage", v)}>
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      {CODE_LANGUAGES.map((l) => (
                        <SelectItem key={l} value={l.toLowerCase()}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Code</Label>
                  <Textarea
                    placeholder="Paste or type your code example..."
                    value={form.codeExample}
                    onChange={(e) => update("codeExample", e.target.value)}
                    rows={6}
                    className="bg-secondary border-border resize-none font-mono text-sm"
                  />
                </div>
              </motion.div>
            )}
          </GlassCard>

          {/* Additional Details */}
          <GlassCard hover={false}>
            <h3 className="text-lg font-semibold mb-4">Additional Details</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Proctor IDs</Label>
                <Input
                  placeholder="e.g. level3_25, level2_142"
                  value={form.proctors}
                  onChange={(e) => update("proctors", e.target.value)}
                  className="bg-secondary border-border"
                />
                <p className="text-xs text-muted-foreground">Enter proctor codes separated by commas</p>
              </div>
              <div className="space-y-2">
                <Label>Tags</Label>
                <Input
                  placeholder="e.g. flask, jinja, database"
                  value={form.tags}
                  onChange={(e) => update("tags", e.target.value)}
                  className="bg-secondary border-border"
                />
                <p className="text-xs text-muted-foreground">Enter tags separated by commas</p>
              </div>
            </div>
          </GlassCard>

          {/* About You */}
          <GlassCard hover={false}>
            <h3 className="text-lg font-semibold mb-4">About You</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  placeholder="Your name"
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  className="bg-secondary border-border"
                  disabled={form.isAnonymous}
                />
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={form.isAnonymous} onCheckedChange={(v) => update("isAnonymous", v)} />
                <Label>Submit anonymously</Label>
              </div>
            </div>
          </GlassCard>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full h-14 text-lg bg-gradient-to-r from-primary to-[hsl(263,70%,55%)] hover:opacity-90 transition-all duration-150 active:scale-[0.98] rounded-xl"
          >
            {loading ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Send className="h-5 w-5 mr-2" />}
            Submit Question
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default SubmitQuestion;
