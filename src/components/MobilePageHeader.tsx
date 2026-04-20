/**
 * MobilePageHeader — Single unified mobile header for all VivaVault pages.
 *
 * Design system rules:
 * - Always bg-background/85 backdrop-blur-2xl — matches bottom nav surface
 * - Always sticky top-0 z-30 with safe-area-inset-top padding
 * - Always border-b border-border/50
 * - Search bar: h-11 rounded-full bg-muted/50 border border-border/40
 * - Icon buttons: h-10 w-10 rounded-xl hover:bg-accent
 * - Segment control: bg-muted/60 rounded-full animated pill
 *
 * Variants:
 *   "default"  — title + optional search + optional right action
 *   "search"   — title inline with search bar + right action (Notes OS, Library)
 *   "tabs"     — title row + search row + horizontal tab strip (Study OS)
 *   "back"     — back button + title + optional action (Detail pages)
 */

import { ReactNode } from "react";
import { ArrowLeft, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

// ─── Shared sub-components ────────────────────────────────────────────────────

export const MobileHeaderIconBtn = ({
  onClick,
  label,
  children,
  className,
}: {
  onClick?: () => void;
  label: string;
  children: ReactNode;
  className?: string;
}) => (
  <button
    onClick={onClick}
    aria-label={label}
    className={cn(
      "h-10 w-10 flex items-center justify-center rounded-xl",
      "hover:bg-accent active:scale-95 transition-all shrink-0",
      className,
    )}
  >
    {children}
  </button>
);

export const MobileSearchBar = ({
  value,
  onChange,
  placeholder = "Search…",
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) => (
  <div className={cn("relative", className)}>
    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="pl-10 pr-4 h-11 rounded-lg bg-muted/50 border border-transparent font-body text-[15px] focus-visible:bg-card focus-visible:border-primary/40 focus-visible:ring-0"
    />
  </div>
);

// ─── Segment control (animated sliding pill) ──────────────────────────────────

export const MobileSegmentControl = <T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) => {
  const idx = options.findIndex((o) => o.value === value);
  const pct = 100 / options.length;
  return (
    <div className={cn("bg-muted/60 rounded-full p-1 flex relative h-10", className)}>
      <motion.div
        layout
        transition={{ type: "spring", stiffness: 380, damping: 32 }}
        className="absolute top-1 bottom-1 bg-card rounded-full shadow-sm"
        style={{
          width: `calc(${pct}% - 4px)`,
          left: idx === 0 ? "4px" : `calc(${pct * idx}%)`,
        }}
      />
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "relative flex-1 text-sm font-body font-medium z-10 transition-colors",
            value === opt.value ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
};

// ─── Tab strip (VS Code style) ────────────────────────────────────────────────

export interface MobileTab {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const MobileTabStrip = ({
  tabs,
  activeId,
  onSelect,
  className,
}: {
  tabs: MobileTab[];
  activeId: string;
  onSelect: (id: string) => void;
  className?: string;
}) => (
  <div className={cn("border-t border-border/30 overflow-x-auto no-scrollbar", className)}>
    <div className="flex min-w-max">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = tab.id === activeId;
        return (
          <button
            key={tab.id}
            onClick={() => onSelect(tab.id)}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 px-4 py-2.5 min-w-[68px] relative transition-all",
              active ? "text-primary" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-[18px] w-[18px]" />
            <span className="text-[10px] font-body font-medium whitespace-nowrap leading-none">
              {tab.label}
            </span>
            {active && (
              <motion.div
                layoutId="mobileTabIndicator"
                className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-primary"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
          </button>
        );
      })}
    </div>
  </div>
);

// ─── Root header shell ────────────────────────────────────────────────────────

interface MobilePageHeaderProps {
  children: ReactNode;
  className?: string;
}

export const MobilePageHeader = ({ children, className }: MobilePageHeaderProps) => (
  <header
    className={cn(
      "sticky top-0 z-30 md:hidden",
      "bg-background/85 backdrop-blur-2xl",
      "border-b border-border/50",
      className,
    )}
    style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
  >
    {children}
  </header>
);

// ─── Convenience: title row ───────────────────────────────────────────────────

export const MobileHeaderTitleRow = ({
  left,
  title,
  right,
  className,
}: {
  left?: ReactNode;
  title?: ReactNode;
  right?: ReactNode;
  className?: string;
}) => (
  <div className={cn("px-4 pt-3 pb-2 flex items-center gap-2 min-h-[52px]", className)}>
    {left}
    {title && (
      <span className="font-heading font-bold text-[22px] leading-none shrink-0">{title}</span>
    )}
    {right}
  </div>
);
