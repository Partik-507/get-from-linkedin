/**
 * MobileSheet — Native-feeling bottom sheet for mobile.
 *
 * Replaces ad-hoc Dialog-as-mobile-modal usage. Features:
 *  - Drag handle + drag-to-dismiss with velocity threshold
 *  - Backdrop tap to dismiss
 *  - Snap heights: "auto" | "half" (50vh) | "tall" (80vh) | "full" (100dvh)
 *  - Spring entry/exit (300ms)
 *  - Respects safe-area inset
 *  - Locks body scroll while open
 *
 * Use only on mobile (`md:hidden`). Pair with a Dialog on desktop.
 */
import { ReactNode, useEffect } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { cn } from "@/lib/utils";

type Snap = "auto" | "half" | "tall" | "full";

interface MobileSheetProps {
  open: boolean;
  onClose: () => void;
  snap?: Snap;
  title?: string;
  children: ReactNode;
  className?: string;
  /** Hide the drag handle (e.g. for full-screen forms with their own header) */
  hideHandle?: boolean;
}

const SNAP_CLASSES: Record<Snap, string> = {
  auto: "max-h-[80dvh]",
  half: "h-[50dvh]",
  tall: "h-[80dvh]",
  full: "h-[100dvh] rounded-none",
};

export const MobileSheet = ({
  open,
  onClose,
  snap = "auto",
  title,
  children,
  className,
  hideHandle = false,
}: MobileSheetProps) => {
  // Lock body scroll while sheet is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.y > 120 || info.velocity.y > 500) onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[300] md:hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320, mass: 0.8 }}
            drag={snap === "full" ? false : "y"}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={handleDragEnd}
            className={cn(
              "absolute bottom-0 left-0 right-0 bg-card text-card-foreground",
              "rounded-t-3xl shadow-2xl border-t border-border/60",
              "flex flex-col overflow-hidden",
              SNAP_CLASSES[snap],
              className,
            )}
            style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
          >
            {!hideHandle && (
              <div className="flex justify-center pt-2.5 pb-1 shrink-0">
                <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
              </div>
            )}
            {title && (
              <div className="px-5 py-3 border-b border-border/50 shrink-0">
                <h2 className="font-heading font-semibold text-base text-center">{title}</h2>
              </div>
            )}
            <div className="flex-1 overflow-y-auto overscroll-contain">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
