import { Button } from "@/components/ui/button";
import { Crown, Lock, Sparkles } from "lucide-react";

interface Props {
  feature: string;
  description?: string;
  blurred?: boolean;
  children?: React.ReactNode;
}

export const UpgradePrompt = ({ feature, description, blurred, children }: Props) => {
  if (blurred && children) {
    return (
      <div className="relative flex-1">
        <div className="blur-sm pointer-events-none">{children}</div>
        <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <div className="text-center p-6 max-w-sm">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <Crown className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-heading font-bold mb-1">{feature}</h3>
            <p className="text-xs text-muted-foreground font-body mb-4">{description || "Upgrade to unlock this feature"}</p>
            <Button className="font-body gap-2" size="sm">
              <Sparkles className="h-3.5 w-3.5" /> Upgrade Plan
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/10">
      <Lock className="h-3.5 w-3.5 text-primary/60" />
      <span className="text-xs text-muted-foreground font-body">{feature} — </span>
      <button className="text-xs text-primary font-body font-medium hover:underline">Upgrade</button>
    </div>
  );
};
