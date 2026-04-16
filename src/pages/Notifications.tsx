import { useState, useEffect } from "react";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Layout } from "@/components/Layout";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { getUserNotificationReads, markNotificationRead, type Notification } from "@/lib/firestoreSync";
import { Bell, Check, CheckCheck, PartyPopper } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const Notifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Notifications — VivaVault";
    const fetchData = async () => {
      try {
        const snap = await getDocs(query(collection(db, "notifications"), orderBy("createdAt", "desc")));
        setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() } as Notification)));
        if (user) {
          const reads = await getUserNotificationReads(user.uid);
          setReadIds(reads);
        }
      } catch {} finally { setLoading(false); }
    };
    fetchData();
  }, [user]);

  const handleMarkAll = async () => {
    if (!user) return;
    for (const n of notifications) {
      if (!readIds.has(n.id)) await markNotificationRead(user.uid, n.id);
    }
    setReadIds(new Set(notifications.map(n => n.id)));
  };

  const formatTime = (ts: any) => {
    if (!ts?.toDate) return "";
    return ts.toDate().toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const unreadCount = notifications.filter(n => !readIds.has(n.id)).length;

  return (
    <Layout title="Notifications">
      <div className="w-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-heading font-extrabold tracking-tight">Notifications</h1>
            <p className="text-muted-foreground font-body mt-1">
              {unreadCount > 0 ? `${unreadCount} unread` : "All caught up!"}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarkAll} className="gap-2 font-body">
              <CheckCheck className="h-4 w-4" /> Mark all read
            </Button>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-20 skeleton-pulse rounded-2xl" />)}
          </div>
        ) : notifications.length === 0 ? (
          <EmptyState
            icon={PartyPopper}
            title="You're all caught up!"
            description="No notifications yet. Admin announcements will appear here."
          />
        ) : (
          <div className="space-y-2">
            {notifications.map((n, i) => (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className={cn(
                  "vv-card p-4 flex items-start gap-3",
                  !readIds.has(n.id) && "border-l-2 border-l-primary bg-primary/[0.03]"
                )}
              >
                <div className={cn(
                  "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                  !readIds.has(n.id) ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                )}>
                  <Bell className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-body font-medium text-sm">{n.title}</p>
                  <p className="text-xs text-muted-foreground font-body mt-0.5">{n.message}</p>
                  <p className="text-[10px] text-muted-foreground/60 font-body mt-1.5">{formatTime(n.createdAt)}</p>
                </div>
                {!readIds.has(n.id) && user && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-primary"
                    onClick={async () => {
                      await markNotificationRead(user.uid, n.id);
                      setReadIds(prev => new Set([...prev, n.id]));
                    }}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Notifications;
