import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HardDrive, Cloud, AlertTriangle, ShieldCheck, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onSelectLocal: () => Promise<boolean>;
  onSelectCloud: () => void;
}

export const StorageSelectionModal = ({ open, onSelectLocal, onSelectCloud }: Props) => {
  const [loadingLocal, setLoadingLocal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLocalClick = async () => {
    setLoadingLocal(true);
    setError(null);
    try {
      const success = await onSelectLocal();
      if (!success) {
        setError("Failed to access local folder. Please use a Chromium browser (Chrome/Edge) or select Cloud storage.");
      }
    } catch (err: any) {
      setError(err?.message || "Folder access denied.");
    } finally {
      setLoadingLocal(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-xl modal-shadow" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl text-center">Where do you want to save your notes?</DialogTitle>
          <p className="text-center text-sm font-body text-muted-foreground mt-2">
            Choose how VivaVault stores your personal workspace data. You can always change this later in settings.
          </p>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-4 py-4">
          
          {/* LOCAL STORAGE CARD */}
          <button
            onClick={handleLocalClick}
            disabled={loadingLocal}
            className={cn(
              "flex flex-col text-left p-5 rounded-2xl border-2 transition-all h-full relative overflow-hidden group",
              "border-border/50 hover:border-primary/50 hover:bg-primary/[0.02]"
            )}
          >
            <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-orange-500/10 text-orange-500 mb-4 shrink-0 transition-transform group-hover:scale-110">
              <HardDrive className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-heading font-semibold text-foreground mb-1">Local Folder</h3>
            <p className="text-xs font-body text-muted-foreground mb-4 flex-1">
              Store all files continuously in a folder on your computer. Fully offline.
            </p>
            <div className="space-y-2 mt-auto">
              <div className="flex items-center gap-2 text-[11px] font-body text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-green-500" /> Complete privacy (data never leaves your device)
              </div>
              <div className="flex items-center gap-2 text-[11px] font-body text-muted-foreground">
                <Zap className="h-3.5 w-3.5 text-amber-500" /> Access files as standard Markdown
              </div>
              <div className="flex items-center gap-2 text-[11px] font-body text-muted-foreground">
                <AlertTriangle className="h-3.5 w-3.5 text-destructive" /> Requires Chrome or Edge browser
              </div>
            </div>
            {loadingLocal && (
              <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center">
                <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </button>

          {/* CLOUD STORAGE CARD */}
          <button
            onClick={onSelectCloud}
            className={cn(
              "flex flex-col text-left p-5 rounded-2xl border-2 transition-all h-full relative overflow-hidden group",
              "border-border/50 hover:border-primary border-primary/20 bg-primary/[0.03]"
            )}
          >
            <div className="absolute top-4 right-4 bg-primary text-primary-foreground text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full">
              Recommended
            </div>
            <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-primary/10 text-primary mb-4 shrink-0 transition-transform group-hover:scale-110">
              <Cloud className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-heading font-semibold text-foreground mb-1">Cloud Sync</h3>
            <p className="text-xs font-body text-muted-foreground mb-4 flex-1">
              Store files securely in Firebase. Sync automatically across all your devices.
            </p>
            <div className="space-y-2 mt-auto">
              <div className="flex items-center gap-2 text-[11px] font-body text-muted-foreground">
                <Zap className="h-3.5 w-3.5 text-amber-500" /> Seamless multi-device sync
              </div>
              <div className="flex items-center gap-2 text-[11px] font-body text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-green-500" /> Automatic backups
              </div>
              <div className="flex items-center gap-2 text-[11px] font-body text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0 opacity-0" /> Works on any browser (including Mobile)
              </div>
            </div>
          </button>

        </div>

        {error && (
          <div className="p-3 bg-destructive/10 text-destructive text-xs font-body rounded-lg flex gap-2 items-start">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
