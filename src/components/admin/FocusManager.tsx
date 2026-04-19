/**
 * FocusManager — Admin command center for the focus engine.
 * Tabs: Themes · Music · Animations.
 */
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Palette, Music, Sparkles } from "lucide-react";
import { FocusThemeEditor } from "./FocusThemeEditor";
import { FocusMusicEditor } from "./FocusMusicEditor";
import { FocusAnimationEditor } from "./FocusAnimationEditor";

type Tab = "themes" | "music" | "animations";

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: "themes",     label: "Themes",     icon: Palette },
  { id: "music",      label: "Music",      icon: Music },
  { id: "animations", label: "Animations", icon: Sparkles },
];

export const FocusManager = () => {
  const [tab, setTab] = useState<Tab>("themes");
  return (
    <div className="space-y-6">
      <div className="inline-flex items-center gap-1 p-1 rounded-2xl bg-muted/40 border border-border/40">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-1.5 px-4 h-9 rounded-xl text-sm font-body font-medium transition-all",
                active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "themes" && <FocusThemeEditor />}
      {tab === "music" && <FocusMusicEditor />}
      {tab === "animations" && <FocusAnimationEditor />}
    </div>
  );
};
