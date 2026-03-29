import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { submitFeedback } from "@/lib/firestoreSync";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { MessageSquare, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const TYPES = ["Bug", "Suggestion", "Compliment", "Other"] as const;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const FeedbackModal = ({ open, onOpenChange }: Props) => {
  const { user } = useAuth();
  const [type, setType] = useState<string>("Suggestion");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim()) { toast.error("Please describe your feedback"); return; }
    setSubmitting(true);
    try {
      await submitFeedback({
        type,
        message: message.trim(),
        email: email.trim() || undefined,
        userId: user?.uid,
      });
      toast.success("Thank you for your feedback!");
      setMessage("");
      setEmail("");
      onOpenChange(false);
    } catch {
      toast.error("Failed to submit feedback");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md modal-shadow">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" /> Send Feedback
          </DialogTitle>
          <DialogDescription className="font-body">
            Help us improve VivaVault with your thoughts.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            {TYPES.map(t => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-body transition-all",
                  type === t
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                )}
              >
                {t}
              </button>
            ))}
          </div>
          <Textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Describe your feedback..."
            className="bg-secondary/30 border-border/40 font-body resize-none"
            rows={4}
          />
          <Input
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Email (optional)"
            type="email"
            className="bg-secondary/30 border-border/40 font-body"
          />
          <Button onClick={handleSubmit} disabled={submitting} className="w-full font-body gap-2">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
            Submit Feedback
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
