import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ActivityHeatmapProps {
  data: Record<string, number>; // "YYYY-MM-DD" -> count
  defaultDays?: number;
}

export const ActivityHeatmap = ({ data, defaultDays = 365 }: ActivityHeatmapProps) => {
  const [days, setDays] = useState(defaultDays);
  const cells = useMemo(() => {
    const result: { date: string; count: number; dayOfWeek: number }[] = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      result.push({
        date: dateStr,
        count: data[dateStr] || 0,
        dayOfWeek: d.getDay(),
      });
    }
    return result;
  }, [data, days]);

  const maxCount = Math.max(1, ...Object.values(data));

  const getColor = (count: number) => {
    if (count === 0) return "bg-muted/30";
    const intensity = count / maxCount;
    if (intensity <= 0.25) return "bg-primary/20";
    if (intensity <= 0.5) return "bg-primary/40";
    if (intensity <= 0.75) return "bg-primary/60";
    return "bg-primary/90";
  };

  // Group by weeks
  const weeks: typeof cells[] = [];
  let currentWeek: typeof cells = [];

  // Pad first week
  if (cells.length > 0) {
    for (let i = 0; i < cells[0].dayOfWeek; i++) {
      currentWeek.push({ date: "", count: 0, dayOfWeek: i });
    }
  }

  for (const cell of cells) {
    currentWeek.push(cell);
    if (cell.dayOfWeek === 6) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) weeks.push(currentWeek);

  const months = useMemo(() => {
    const m: { label: string; col: number }[] = [];
    let lastMonth = -1;
    weeks.forEach((week, wi) => {
      const validCell = week.find((c) => c.date);
      if (validCell) {
        const month = new Date(validCell.date).getMonth();
        if (month !== lastMonth) {
          lastMonth = month;
          m.push({
            label: new Date(validCell.date).toLocaleString("default", { month: "short" }),
            col: wi,
          });
        }
      }
    });
    return m;
  }, [weeks]);

  return (
    <div className="flex flex-col">
      <div className="flex justify-end mb-2 mr-2">
        <div className="flex bg-muted/50 rounded-lg p-0.5">
          {[
            { label: "3M", val: 90 },
            { label: "6M", val: 180 },
            { label: "1Y", val: 365 }
          ].map(opt => (
            <button
              key={opt.val}
              onClick={() => setDays(opt.val)}
              className={cn(
                "px-2.5 py-1 text-[10px] font-body font-medium rounded-md transition-colors",
                days === opt.val ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto w-full">
        {/* Month labels */}
        <div className="flex gap-[3px] mb-1 ml-7">
        {months.map((m, i) => (
          <span
            key={i}
            className="text-[10px] text-muted-foreground font-body"
            style={{ marginLeft: i === 0 ? m.col * 13 : (m.col - (months[i - 1]?.col || 0) - 1) * 13 }}
          >
            {m.label}
          </span>
        ))}
      </div>

      <div className="flex gap-[3px]">
        {/* Day labels */}
        <div className="flex flex-col gap-[3px] mr-1">
          {["", "M", "", "W", "", "F", ""].map((d, i) => (
            <span key={i} className="text-[9px] text-muted-foreground h-[10px] leading-[10px] font-body">
              {d}
            </span>
          ))}
        </div>

        {/* Grid */}
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {week.map((cell, ci) => (
              <Tooltip key={ci}>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      "h-[10px] w-[10px] rounded-[2px] transition-colors",
                      cell.date ? getColor(cell.count) : "bg-transparent"
                    )}
                  />
                </TooltipTrigger>
                {cell.date && (
                  <TooltipContent className="text-xs">
                    <p className="font-body">
                      {cell.count} question{cell.count !== 1 ? "s" : ""} on {cell.date}
                    </p>
                  </TooltipContent>
                )}
              </Tooltip>
            ))}
          </div>
        ))}
      </div>
      </div>
    </div>
  );
};
