import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  readonly?: boolean;
  size?: "sm" | "md" | "lg";
  color?: string;
}

export const StarRating = ({ value, onChange, readonly, size = "md", color = "text-amber-400" }: StarRatingProps) => {
  const sizes = { sm: "h-4 w-4", md: "h-6 w-6", lg: "h-8 w-8" };

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star)}
          className={cn(
            "transition-transform duration-150",
            !readonly && "hover:scale-110 active:scale-95 cursor-pointer",
            readonly && "cursor-default"
          )}
        >
          <Star
            className={cn(
              sizes[size],
              star <= value ? cn(color, "fill-current") : "text-muted-foreground/30"
            )}
          />
        </button>
      ))}
    </div>
  );
};
