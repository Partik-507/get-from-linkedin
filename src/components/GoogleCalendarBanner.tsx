/**
 * GoogleCalendarBanner — Connection / Status strip for the calendar toolbar
 *
 * Renders as a thin, dismissible bar showing:
 * - "Not connected" empty state with connect button (if disconnected)
 * - Syncing indicator while loading events
 * - Last synced timestamp and disconnect menu (if connected)
 * - Error state with retry option
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import {
  RefreshCw, Unplug, AlertTriangle, ChevronDown, ExternalLink,
  Calendar, Loader2, CheckCircle, Wifi, WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { CalendarConnectionState } from "@/hooks/useGoogleCalendar";
import type { CalendarStatus } from "@/lib/googleCalendar";

interface GoogleCalendarBannerProps {
  connectionState: CalendarConnectionState;
  calendarStatus: CalendarStatus | null;
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  onConnect: () => Promise<void>;
  onDisconnect: () => Promise<void>;
  onRefetch: () => Promise<void>;
}

export const GoogleCalendarBanner = ({
  connectionState,
  calendarStatus,
  isSyncing,
  lastSyncedAt,
  onConnect,
  onDisconnect,
  onRefetch,
}: GoogleCalendarBannerProps) => {
  const [connectPopoverOpen, setConnectPopoverOpen] = useState(false);
  const [statusPopoverOpen, setStatusPopoverOpen] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    setConnectPopoverOpen(false);
    setConnecting(true);
    try {
      await onConnect(); // opens GIS popup, resolves when done
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await onDisconnect();
    } finally {
      setDisconnecting(false);
      setStatusPopoverOpen(false);
    }
  };

  if (connectionState === "idle" || connectionState === "checking") {
    return (
      <div className="flex items-center gap-2 px-2">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground/40" />
      </div>
    );
  }

  // ── CONNECTING STATE (GIS popup open) ─────────────────────────────────────
  if (connectionState === "connecting" || connecting) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-body text-primary bg-primary/8 border border-primary/20">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Approve in popup…</span>
      </div>
    );
  }
  if (connectionState === "disconnected") {
    return (
      <Popover open={connectPopoverOpen} onOpenChange={setConnectPopoverOpen}>
        <PopoverTrigger asChild>
          <button
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-body text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-dashed border-border/50 hover:border-primary/30 transition-all"
          >
            <Calendar className="h-3 w-3" />
            <span>Connect Google Calendar</span>
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-80 p-4 space-y-4"
          align="end"
          sideOffset={6}
        >
          {/* Header */}
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#4285F4] to-[#34A853] flex items-center justify-center shrink-0">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-body font-semibold">Google Calendar</p>
              <p className="text-[11px] text-muted-foreground font-body mt-0.5 leading-relaxed">
                Sync your real calendar events directly into Study OS.
              </p>
            </div>
          </div>

          {/* Permission explanation */}
          <div className="bg-muted/40 rounded-xl p-3 space-y-2">
            <p className="text-[11px] font-body font-medium text-muted-foreground uppercase tracking-wider">
              Permissions requested
            </p>
            {[
              "View your calendar events",
              "Create and edit events",
            ].map((perm) => (
              <div key={perm} className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-[hsl(var(--success))] shrink-0" />
                <span className="text-xs font-body">{perm}</span>
              </div>
            ))}
          </div>

          {/* Privacy note */}
          <div className="flex items-start gap-2 text-[11px] text-muted-foreground font-body">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-[hsl(var(--warning))]" />
            <p className="leading-relaxed">
              Your tokens are stored securely in Firebase and never exposed to third parties.
              You can disconnect at any time.
            </p>
          </div>

          <Button
            className="w-full font-body gap-2 text-sm"
            onClick={handleConnect}
            disabled={connecting}
          >
            {connecting ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Connecting…</>
            ) : (
              <><Calendar className="h-4 w-4" /> Connect Google Calendar</>
            )}
          </Button>
        </PopoverContent>
      </Popover>
    );
  }

  // ── ERROR STATE ────────────────────────────────────────────────────────────
  if (connectionState === "error") {
    return (
      <button
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-body text-destructive hover:bg-destructive/10 border border-destructive/20 transition-all"
        onClick={onRefetch}
      >
        <AlertTriangle className="h-3 w-3" />
        <span>Sync error · Retry</span>
      </button>
    );
  }

  // ── CONNECTED STATE ────────────────────────────────────────────────────────
  return (
    <Popover open={statusPopoverOpen} onOpenChange={setStatusPopoverOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-body transition-all",
            isSyncing
              ? "text-primary bg-primary/8 border border-primary/20"
              : "text-[hsl(var(--success))] bg-[hsl(var(--success))]/8 border border-[hsl(var(--success))]/20 hover:bg-[hsl(var(--success))]/15"
          )}
        >
          <AnimatePresence mode="wait">
            {isSyncing ? (
              <motion.span
                key="syncing"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <Loader2 className="h-3 w-3 animate-spin" />
              </motion.span>
            ) : (
              <motion.span
                key="connected"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <Wifi className="h-3 w-3" />
              </motion.span>
            )}
          </AnimatePresence>
          <span>
            {isSyncing ? "Syncing…" : "Google Calendar"}
          </span>
          <ChevronDown className="h-2.5 w-2.5 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3 space-y-3" align="end" sideOffset={6}>
        {/* Account info */}
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#4285F4] to-[#34A853] flex items-center justify-center shrink-0">
            <Calendar className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-body font-medium truncate">
              {calendarStatus?.email || "Google Calendar"}
            </p>
            <p className="text-[10px] text-muted-foreground font-body">
              Connected{calendarStatus?.connectedAt
                ? ` ${format(new Date(calendarStatus.connectedAt), "MMM d, yyyy")}`
                : ""}
            </p>
          </div>
          <Badge variant="outline" className="text-[9px] ml-auto text-[hsl(var(--success))] border-[hsl(var(--success))]/30 shrink-0">
            Active
          </Badge>
        </div>

        {/* Last sync */}
        {lastSyncedAt && (
          <p className="text-[10px] text-muted-foreground font-body">
            Last synced: {format(lastSyncedAt, "h:mm a")}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 font-body text-xs gap-1.5 h-8"
            onClick={() => { onRefetch(); setStatusPopoverOpen(false); }}
            disabled={isSyncing}
          >
            <RefreshCw className={cn("h-3 w-3", isSyncing && "animate-spin")} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 font-body text-xs gap-1.5 h-8 text-destructive hover:text-destructive border-destructive/20 hover:border-destructive/40"
            onClick={handleDisconnect}
            disabled={disconnecting}
          >
            {disconnecting
              ? <Loader2 className="h-3 w-3 animate-spin" />
              : <WifiOff className="h-3 w-3" />
            }
            Disconnect
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
