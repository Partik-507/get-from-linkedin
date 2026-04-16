import { useOffline } from "@/contexts/OfflineContext";
import { Wifi, WifiOff, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export const OfflineIndicator = ({ className }: { className?: string }) => {
  const { isOnline, syncing, lastSyncAt, isOfflineReady } = useOffline();

  let label = "Online";
  let Icon: any = Wifi;
  let tone = "text-emerald-600 bg-emerald-500/10 border-emerald-500/30";

  if (syncing) {
    label = "Syncing…";
    Icon = Loader2;
    tone = "text-blue-600 bg-blue-500/10 border-blue-500/30";
  } else if (!isOnline) {
    label = isOfflineReady ? "Offline · cached" : "Offline";
    Icon = WifiOff;
    tone = "text-amber-600 bg-amber-500/10 border-amber-500/30";
  } else if (lastSyncAt) {
    label = `Synced ${timeAgo(lastSyncAt)}`;
    Icon = CheckCircle2;
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        tone,
        className,
      )}
      title={lastSyncAt ? `Last sync: ${new Date(lastSyncAt).toLocaleString()}` : undefined}
    >
      <Icon className={cn("h-3.5 w-3.5", syncing && "animate-spin")} />
      <span className="hidden sm:inline">{label}</span>
    </div>
  );
};
