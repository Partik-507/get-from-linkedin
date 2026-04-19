/**
 * MobileTopBar — Flipkart-inspired native mobile header.
 *
 * Layout:
 *   ┌──────────────────────────────────────┐
 *   │ avatar  username           ⋯  ☰     │  ← profile row (28px)
 *   │ ┌────────────────────────────────┐ │
 *   │ │ 🔍  Search …                   │ │  ← search pill (44px)
 *   │ └────────────────────────────────┘ │
 *   │ Calendar · Tasks · Habits · Focus   │  ← scrollable nav chips (36px)
 *   └──────────────────────────────────────┘
 *
 * Auto-hides on scroll-down via the `hidden` prop (parent supplies it
 * from useScrollDirection).
 */

import { ReactNode } from "react";
import { Search, Menu, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

export interface NavChip {
  id: string;
  label: string;
  icon?: ReactNode;
}

interface MobileTopBarProps {
  username?: string;
  avatarUrl?: string | null;
  searchValue?: string;
  searchPlaceholder?: string;
  onSearchChange?: (v: string) => void;
  onSearchFocus?: () => void;
  onMenuClick?: () => void;
  onMoreClick?: () => void;
  chips?: NavChip[];
  activeChipId?: string;
  onChipSelect?: (id: string) => void;
  hidden?: boolean;
  rightSlot?: ReactNode;
  className?: string;
}

export const MobileTopBar = ({
  username,
  avatarUrl,
  searchValue = "",
  searchPlaceholder = "Search…",
  onSearchChange,
  onSearchFocus,
  onMenuClick,
  onMoreClick,
  chips,
  activeChipId,
  onChipSelect,
  hidden = false,
  rightSlot,
  className,
}: MobileTopBarProps) => {
  const initials = (username || "U").charAt(0).toUpperCase();
  return (
    <div
      className={cn(
        "sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border/40",
        "transition-transform duration-200 will-change-transform",
        hidden ? "-translate-y-full" : "translate-y-0",
        className,
      )}
    >
      {/* Profile row */}
      <div className="flex items-center gap-2 px-3 pt-2 pb-1.5">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="h-7 w-7 grid place-items-center rounded-full hover:bg-accent active:scale-95 transition"
            aria-label="Open menu"
          >
            <Menu className="h-4 w-4" />
          </button>
        )}
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-6 w-6 rounded-full object-cover" />
          ) : (
            <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground grid place-items-center text-[11px] font-semibold">
              {initials}
            </div>
          )}
          {username && (
            <span className="text-xs font-body text-muted-foreground truncate">
              Hi, <span className="text-foreground font-medium">{username}</span>
            </span>
          )}
        </div>
        {rightSlot}
        {onMoreClick && (
          <button
            onClick={onMoreClick}
            className="h-7 w-7 grid place-items-center rounded-full hover:bg-accent active:scale-95 transition"
            aria-label="More"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Search pill */}
      {onSearchChange !== undefined && (
        <div className="px-3 pb-2">
          <div className="relative h-11 rounded-[22px] bg-muted/70 border border-border/40 flex items-center px-4 gap-2 focus-within:ring-2 focus-within:ring-primary/40 transition">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              onFocus={onSearchFocus}
              placeholder={searchPlaceholder}
              className="bg-transparent outline-none flex-1 text-sm font-body placeholder:text-muted-foreground"
            />
          </div>
        </div>
      )}

      {/* Nav chips */}
      {chips && chips.length > 0 && (
        <div className="overflow-x-auto no-scrollbar">
          <div className="flex gap-2 px-3 pb-2 min-w-max">
            {chips.map((c) => {
              const active = c.id === activeChipId;
              return (
                <button
                  key={c.id}
                  onClick={() => onChipSelect?.(c.id)}
                  className={cn(
                    "h-9 px-3.5 rounded-full text-xs font-medium font-body inline-flex items-center gap-1.5",
                    "transition-all active:scale-95 whitespace-nowrap shrink-0",
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted/60 text-foreground hover:bg-muted",
                  )}
                >
                  {c.icon}
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
