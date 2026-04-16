import { useState } from "react";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface FocusSessionCompleteProps {
  focusDuration: number;
  focusMode: string;
  onSave: (mood: number, note: string) => void;
}

export const FocusSessionComplete = ({ focusDuration, focusMode, onSave }: FocusSessionCompleteProps) => {
  const [sessionMood, setSessionMood] = useState(0);
  const [sessionNote, setSessionNote] = useState("");

  return (
    <div className="fixed inset-0 z-[9998] bg-background flex items-center justify-center animate-focus-fade">
      <div className="max-w-sm w-full mx-4">
        <div className="rounded-2xl border border-border/50 bg-card p-8 text-center modal-shadow">
          <Zap className="h-10 w-10 text-primary mx-auto mb-4" />
          <h2 className="text-xl font-heading font-bold mb-2">Session Complete!</h2>
          <p className="text-muted-foreground font-body text-sm mb-6">
            {focusDuration} minutes · {focusMode} mode
          </p>
          <div className="flex justify-center gap-4 mb-6">
            {[
              { emoji: "😤", label: "Struggled", value: 1 },
              { emoji: "😊", label: "Okay", value: 2 },
              { emoji: "🌊", label: "Flow State", value: 3 },
            ].map(m => (
              <button
                key={m.value}
                onClick={() => setSessionMood(m.value)}
                className={cn(
                  "flex flex-col items-center gap-1 p-3 rounded-xl transition-all",
                  sessionMood === m.value ? "bg-primary/10 ring-1 ring-primary/30" : "hover:bg-secondary/50"
                )}
              >
                <span className="text-2xl">{m.emoji}</span>
                <span className="text-[10px] font-body text-muted-foreground">{m.label}</span>
              </button>
            ))}
          </div>
          <Textarea
            placeholder="One sentence about this session..."
            value={sessionNote}
            onChange={e => setSessionNote(e.target.value)}
            className="mb-4 text-sm font-body resize-none"
            rows={2}
          />
          <Button className="w-full font-body" onClick={() => onSave(sessionMood, sessionNote)}>
            Save & Close
          </Button>
        </div>
      </div>
    </div>
  );
};
