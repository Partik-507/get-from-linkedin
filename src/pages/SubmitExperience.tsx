import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
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
import { StarRating } from "@/components/StarRating";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Send, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";

const SubmitExperience = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    name: user?.displayName || "",
    rollNumber: "",
    isAnonymous: false,
    proctorId: "",
    level: "",
    date: "",
    duration: "",
    questionsAsked: "",
    codeChanges: "",
    tips: "",
    difficultyRating: 0,
    friendlinessRating: 0,
  });

  const update = (field: string, value: any) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await addDoc(collection(db, "submissions"), {
        ...form,
        projectId,
        userId: user?.uid || null,
        createdAt: serverTimestamp(),
      });
      setSuccess(true);
      toast.success("Experience submitted! Thank you for helping others.");
      setTimeout(() => navigate(`/project/${projectId}/viva`), 3000);
    } catch (e: any) {
      toast.error(e.message || "Failed to submit experience");
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
            className="text-center"
          >
            <div className="h-20 w-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-10 w-10 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Thank You!</h2>
            <p className="text-muted-foreground">Your experience has been submitted. Redirecting...</p>
          </motion.div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Share Your Experience" showBack>
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 animate-fade-in">
          <h1 className="text-3xl font-bold mb-3">Share Your Viva Experience</h1>
          <p className="text-muted-foreground">Help fellow students prepare by sharing what happened in your viva.</p>
          <Badge className="mt-3 bg-emerald-500/15 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20">
            <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />
            All fields are optional — share only what you're comfortable with
          </Badge>
        </div>

        <div className="space-y-8 animate-fade-in" style={{ animationDelay: "100ms" }}>
          {/* About You */}
          <GlassCard hover={false}>
            <h3 className="text-lg font-semibold mb-4">About You</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <div className="space-y-2">
                <Label>Roll Number</Label>
                <Input
                  placeholder="e.g. 21f1000123"
                  value={form.rollNumber}
                  onChange={(e) => update("rollNumber", e.target.value)}
                  className="bg-secondary border-border"
                  disabled={form.isAnonymous}
                />
              </div>
            </div>
            <div className="flex items-center gap-3 mt-4">
              <Switch checked={form.isAnonymous} onCheckedChange={(v) => update("isAnonymous", v)} />
              <Label>Submit anonymously</Label>
            </div>
          </GlassCard>

          {/* Viva Details */}
          <GlassCard hover={false}>
            <h3 className="text-lg font-semibold mb-4">Viva Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Proctor ID</Label>
                <Input
                  placeholder="e.g. P001"
                  value={form.proctorId}
                  onChange={(e) => update("proctorId", e.target.value)}
                  className="bg-secondary border-border"
                />
              </div>
              <div className="space-y-2">
                <Label>Level</Label>
                <Select value={form.level} onValueChange={(v) => update("level", v)}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Diploma">Diploma</SelectItem>
                    <SelectItem value="BSc">BSc</SelectItem>
                    <SelectItem value="BS">BS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => update("date", e.target.value)}
                  className="bg-secondary border-border"
                />
              </div>
              <div className="space-y-2">
                <Label>Duration</Label>
                <Input
                  placeholder="e.g. 15 minutes"
                  value={form.duration}
                  onChange={(e) => update("duration", e.target.value)}
                  className="bg-secondary border-border"
                />
              </div>
            </div>
          </GlassCard>

          {/* Questions */}
          <GlassCard hover={false}>
            <h3 className="text-lg font-semibold mb-4">What Was Asked</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Questions Asked</Label>
                <Textarea
                  placeholder="List the questions you were asked (one per line)..."
                  value={form.questionsAsked}
                  onChange={(e) => update("questionsAsked", e.target.value)}
                  rows={5}
                  className="bg-secondary border-border resize-none"
                />
              </div>
              <div className="space-y-2">
                <Label>Code Changes</Label>
                <Textarea
                  placeholder="Were you asked to make any code changes? Describe them..."
                  value={form.codeChanges}
                  onChange={(e) => update("codeChanges", e.target.value)}
                  rows={3}
                  className="bg-secondary border-border resize-none"
                />
              </div>
            </div>
          </GlassCard>

          {/* Tips */}
          <GlassCard hover={false}>
            <h3 className="text-lg font-semibold mb-4">Your Tips</h3>
            <Textarea
              placeholder="Any advice for students who are about to give this viva..."
              value={form.tips}
              onChange={(e) => update("tips", e.target.value)}
              rows={4}
              className="bg-secondary border-border resize-none"
            />
          </GlassCard>

          {/* Ratings */}
          <GlassCard hover={false}>
            <h3 className="text-lg font-semibold mb-4">Ratings</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-red-400">Difficulty</Label>
                <StarRating value={form.difficultyRating} onChange={(v) => update("difficultyRating", v)} size="lg" color="text-red-400" />
              </div>
              <div className="space-y-2">
                <Label className="text-amber-400">Proctor Friendliness</Label>
                <StarRating value={form.friendlinessRating} onChange={(v) => update("friendlinessRating", v)} size="lg" />
              </div>
            </div>
          </GlassCard>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full h-14 text-lg bg-gradient-to-r from-[hsl(263,70%,58%)] to-[hsl(230,80%,55%)] hover:opacity-90 transition-all duration-150 active:scale-[0.98] rounded-xl"
          >
            {loading ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Send className="h-5 w-5 mr-2" />}
            Submit Experience
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default SubmitExperience;
