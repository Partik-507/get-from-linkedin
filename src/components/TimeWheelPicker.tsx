import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

interface TimeWheelPickerProps {
  onConfirm: (totalSeconds: number) => void;
  initialMinutes?: number;
}

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;
const HALF = Math.floor(VISIBLE_ITEMS / 2);

const WheelColumn = ({
  items,
  value,
  onChange,
  label,
}: {
  items: number[];
  value: number;
  onChange: (v: number) => void;
  label: string;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrolling = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const scrollToIndex = useCallback(
    (index: number, smooth = true) => {
      if (!containerRef.current) return;
      containerRef.current.scrollTo({
        top: index * ITEM_HEIGHT,
        behavior: smooth ? "smooth" : "auto",
      });
    },
    []
  );

  useEffect(() => {
    const idx = items.indexOf(value);
    if (idx >= 0) scrollToIndex(idx, false);
  }, []);

  const handleScroll = () => {
    if (!containerRef.current) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    isScrolling.current = true;

    timeoutRef.current = setTimeout(() => {
      if (!containerRef.current) return;
      const scrollTop = containerRef.current.scrollTop;
      const index = Math.round(scrollTop / ITEM_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(items.length - 1, index));
      scrollToIndex(clampedIndex);
      onChange(items[clampedIndex]);
      isScrolling.current = false;
    }, 80);
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[10px] font-body text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
      <div
        className="relative overflow-hidden"
        style={{ height: ITEM_HEIGHT * VISIBLE_ITEMS }}
      >
        {/* Highlight bar */}
        <div
          className="absolute left-0 right-0 pointer-events-none z-10 border-y-2 border-primary/30 bg-primary/[0.06] rounded-lg"
          style={{ top: HALF * ITEM_HEIGHT, height: ITEM_HEIGHT }}
        />
        {/* Gradient masks */}
        <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-background to-transparent z-20 pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background to-transparent z-20 pointer-events-none" />

        <div
          ref={containerRef}
          className="h-full overflow-y-auto scrollbar-none snap-y snap-mandatory"
          onScroll={handleScroll}
          style={{
            scrollSnapType: "y mandatory",
            paddingTop: HALF * ITEM_HEIGHT,
            paddingBottom: HALF * ITEM_HEIGHT,
          }}
        >
          {items.map((item) => {
            const isSelected = item === value;
            return (
              <div
                key={item}
                className={cn(
                  "flex items-center justify-center snap-center transition-all duration-150",
                  isSelected
                    ? "text-foreground font-bold scale-110"
                    : "text-muted-foreground/50 scale-90"
                )}
                style={{ height: ITEM_HEIGHT }}
                onClick={() => {
                  const idx = items.indexOf(item);
                  scrollToIndex(idx);
                  onChange(item);
                }}
              >
                <span
                  className={cn(
                    "text-2xl font-mono tabular-nums transition-all",
                    isSelected ? "text-foreground" : "text-muted-foreground/40"
                  )}
                >
                  {String(item).padStart(2, "0")}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const TimeWheelPicker = ({
  onConfirm,
  initialMinutes = 25,
}: TimeWheelPickerProps) => {
  const initH = Math.floor(initialMinutes / 60);
  const initM = initialMinutes % 60;

  const [hours, setHours] = useState(initH);
  const [minutes, setMinutes] = useState(initM);
  const [seconds, setSeconds] = useState(0);

  const totalSeconds = hours * 3600 + minutes * 60 + seconds;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const displayStr =
    hours > 0
      ? `${hours}h ${minutes}m ${seconds}s`
      : minutes > 0
      ? `${minutes}m ${seconds}s`
      : `${seconds}s`;

  const hourItems = Array.from({ length: 24 }, (_, i) => i);
  const minuteItems = Array.from({ length: 60 }, (_, i) => i);
  const secondItems = Array.from({ length: 60 }, (_, i) => i);

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="flex items-center gap-4">
        <WheelColumn items={hourItems} value={hours} onChange={setHours} label="Hours" />
        <span className="text-3xl font-bold text-muted-foreground/30 mt-5">:</span>
        <WheelColumn items={minuteItems} value={minutes} onChange={setMinutes} label="Min" />
        <span className="text-3xl font-bold text-muted-foreground/30 mt-5">:</span>
        <WheelColumn items={secondItems} value={seconds} onChange={setSeconds} label="Sec" />
      </div>

      <div className="text-center">
        <p className="text-sm font-body text-muted-foreground">
          Duration: <span className="font-semibold text-foreground">{displayStr}</span>
        </p>
      </div>

      <button
        onClick={() => {
          if (totalSeconds < 60) return;
          onConfirm(totalSeconds);
        }}
        disabled={totalSeconds < 60}
        className={cn(
          "w-full h-11 rounded-xl font-body font-medium text-sm transition-all flex items-center justify-center gap-2",
          totalSeconds >= 60
            ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20"
            : "bg-muted text-muted-foreground cursor-not-allowed"
        )}
      >
        ⚡ Start {totalMinutes > 0 ? `${totalMinutes}-minute` : ""} Session
      </button>
      {totalSeconds < 60 && (
        <p className="text-[10px] text-muted-foreground/60 font-body -mt-3">
          Minimum 1 minute required
        </p>
      )}
    </div>
  );
};
