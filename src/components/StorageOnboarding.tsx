import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStorage } from "@/contexts/StorageContext";
import { Cloud, HardDrive, FolderOpen, ArrowRight, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface StorageOnboardingProps {
  onComplete: () => void;
}

export const StorageOnboarding = ({ onComplete }: StorageOnboardingProps) => {
  const { chooseCloud, chooseLocal } = useStorage();
  const [selected, setSelected] = useState<"cloud" | "local" | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"choose" | "success">("choose");

  const handleChooseCloud = async () => {
    setSelected("cloud");
    setLoading(true);
    await new Promise(r => setTimeout(r, 300));
    chooseCloud();
    setStep("success");
    setLoading(false);
    setTimeout(onComplete, 800);
  };

  const handleChooseLocal = async () => {
    setSelected("local");
    setLoading(true);
    const ok = await chooseLocal();
    setLoading(false);
    if (ok) {
      setStep("success");
      setTimeout(onComplete, 800);
    } else {
      setSelected(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-background gradient-mesh"
    >
      {/* Background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary/8 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-[hsl(240,70%,55%)]/6 blur-3xl" />
      </div>

      <AnimatePresence mode="wait">
        {step === "choose" ? (
          <motion.div
            key="choose"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -24 }}
            transition={{ duration: 0.35 }}
            className="relative z-10 max-w-xl w-full mx-4"
          >
            {/* Logo + title */}
            <div className="text-center mb-10">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-[hsl(240,70%,50%)] flex items-center justify-center text-primary-foreground font-bold text-2xl mx-auto mb-5 shadow-lg shadow-primary/20">
                V
              </div>
              <h1 className="text-3xl font-heading font-bold tracking-tight mb-2">
                Where should we store your notes?
              </h1>
              <p className="text-muted-foreground font-body text-sm leading-relaxed">
                Choose how VivaVault saves your workspace. You can change this later in settings.
              </p>
            </div>

            {/* Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              {/* Cloud */}
              <button
                onClick={handleChooseCloud}
                disabled={loading}
                className={cn(
                  "group relative p-6 rounded-2xl border-2 text-left transition-all duration-200 hover:scale-[1.02]",
                  selected === "cloud"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40 bg-card"
                )}
              >
                {selected === "cloud" && (
                  <div className="absolute top-3 right-3 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                )}
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
                  <Cloud className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-heading font-bold text-lg mb-1">VivaVault Cloud</h3>
                <p className="text-sm text-muted-foreground font-body leading-relaxed">
                  Sync across all devices automatically. Access from anywhere with your account.
                </p>
                <div className="mt-4 flex items-center gap-1.5 text-xs text-primary font-body font-medium">
                  <Sparkles className="h-3.5 w-3.5" />
                  Recommended
                </div>
              </button>

              {/* Local */}
              <button
                onClick={handleChooseLocal}
                disabled={loading}
                className={cn(
                  "group relative p-6 rounded-2xl border-2 text-left transition-all duration-200 hover:scale-[1.02]",
                  selected === "local"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40 bg-card"
                )}
              >
                {selected === "local" && (
                  <div className="absolute top-3 right-3 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                )}
                <div className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center mb-4 group-hover:bg-secondary/70 transition-colors">
                  <HardDrive className="h-6 w-6 text-foreground/70" />
                </div>
                <h3 className="font-heading font-bold text-lg mb-1">Local Storage</h3>
                <p className="text-sm text-muted-foreground font-body leading-relaxed">
                  Keep everything on your device. Full privacy, works offline. No cloud required.
                </p>
                <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground font-body">
                  <FolderOpen className="h-3.5 w-3.5" />
                  Choose a folder on your device
                </div>
              </button>
            </div>

            {loading && (
              <div className="text-center text-sm text-muted-foreground font-body animate-pulse">
                {selected === "local" ? "Opening folder picker…" : "Setting up cloud sync…"}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative z-10 text-center max-w-sm mx-4"
          >
            <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5 animate-celebration">
              <Check className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-2xl font-heading font-bold mb-2">All set!</h2>
            <p className="text-muted-foreground font-body text-sm">
              {selected === "cloud" ? "VivaVault Cloud is ready." : "Local vault connected."}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
