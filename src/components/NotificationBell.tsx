import { useState, useEffect } from "react";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { getUserNotificationReads, markNotificationRead, type Notification } from "@/lib/firestoreSync";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Bell, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

export const NotificationBell = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);

  // Gate the listener on auth — Firestore rules require an authenticated user
  // Subscribing without a user causes "Missing or insufficient permissions" errors
  // and noisy aborted-channel reconnect loops.
  useEffect(() => {
    if (!user?.uid) {
      setNotifications([]);
      return;
    }
    const q = query(collection(db, "notifications"), orderBy("createdAt", "desc"), limit(20));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() } as Notification)));
      },
      (err) => {
        // Silently swallow permission errors during sign-out / role transitions
        if (err?.code !== "permission-denied") {
          console.warn("notifications listener:", err.message);
        }
      }
    );
    return () => { try { unsub(); } catch { /* noop */ } };
  }, [user?.uid]);

  useEffect(() => {
    if (!user) return;
    getUserNotificationReads(user.uid).then(setReadIds);
  }, [user]);

  const unreadCount = notifications.filter(n => !readIds.has(n.id)).length;

  const handleMarkRead = async (notifId: string) => {
    if (!user) return;
    await markNotificationRead(user.uid, notifId);
    setReadIds(prev => new Set([...prev, notifId]));
  };

  const formatTime = (ts: any) => {
    if (!ts?.toDate) return "";
    const d = ts.toDate();
    const now = new Date();
    const diff = (now.getTime() - d.getTime()) / 1000;
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return d.toLocaleDateString();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center animate-notif-pulse">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 dropdown-shadow">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="font-heading font-semibold text-sm">Notifications</h3>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="py-8 text-center">
              <Bell className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground font-body">No notifications yet</p>
            </div>
          ) : (
            notifications.slice(0, 5).map(n => (
              <div
                key={n.id}
                className={cn(
                  "px-4 py-3 border-b border-border/50 last:border-0 transition-colors",
                  !readIds.has(n.id) && "bg-primary/5 border-l-2 border-l-primary"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium font-body leading-tight">{n.title}</p>
                    <p className="text-xs text-muted-foreground font-body mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground/60 font-body mt-1">{formatTime(n.createdAt)}</p>
                  </div>
                  {!readIds.has(n.id) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0 text-muted-foreground hover:text-primary"
                      onClick={() => handleMarkRead(n.id)}
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
        {notifications.length > 0 && (
          <div className="px-4 py-2 border-t border-border">
            <Link
              to="/notifications"
              className="text-xs text-primary hover:text-primary/80 font-body font-medium"
              onClick={() => setOpen(false)}
            >
              View all notifications →
            </Link>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};
