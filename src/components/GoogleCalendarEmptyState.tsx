/**
 * GoogleCalendarEmptyState — Full-panel empty state shown when:
 * - Google Calendar is not connected
 * - After disconnection
 *
 * Shows a clean, trust-building explanation and a single clear CTA.
 */

import { motion } from "framer-motion";
import { Calendar, CheckCircle, Shield, Lock, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface GoogleCalendarEmptyStateProps {
  onConnect: () => Promise<void>;
  /** Whether the calendar section already has local events */
  hasLocalEvents?: boolean;
}

const FEATURES = [
  { icon: Calendar, text: "See your real Google Calendar events here" },
  { icon: CheckCircle, text: "Create events that sync to your Google Calendar" },
  { icon: Shield, text: "Tokens stored securely in Firebase — never shared" },
  { icon: Lock, text: "Disconnect anytime with one click" },
];

export const GoogleCalendarEmptyState = ({
  onConnect,
  hasLocalEvents,
}: GoogleCalendarEmptyStateProps) => {
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      await onConnect(); // redirects — code below won't execute
    } finally {
      setConnecting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="flex flex-col items-center justify-center py-16 px-6 text-center max-w-sm mx-auto"
    >
      {/* Icon cluster */}
      <div className="relative mb-6">
        <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-[#4285F4] to-[#34A853] flex items-center justify-center shadow-lg shadow-[#4285F4]/20">
          <Calendar className="h-10 w-10 text-white" />
        </div>
        <div className="absolute -bottom-2 -right-2 h-9 w-9 rounded-2xl bg-[hsl(var(--card))] border-2 border-[hsl(var(--success))]/40 flex items-center justify-center">
          <span className="text-lg">📅</span>
        </div>
      </div>

      {/* Heading */}
      <h3 className="text-xl font-heading font-bold mb-2">
        Connect Google Calendar
      </h3>
      <p className="text-sm text-muted-foreground font-body leading-relaxed mb-6">
        Sync your real schedule directly into Study OS. Events you create here
        will appear in Google Calendar — and vice versa.
      </p>

      {/* Feature list */}
      <div className="w-full space-y-2.5 mb-7">
        {FEATURES.map(({ icon: Icon, text }) => (
          <div key={text} className="flex items-center gap-3 text-left">
            <div className="h-7 w-7 rounded-lg bg-primary/8 flex items-center justify-center shrink-0">
              <Icon className="h-3.5 w-3.5 text-primary" />
            </div>
            <p className="text-xs font-body text-foreground/80">{text}</p>
          </div>
        ))}
      </div>

      {/* Privacy note */}
      <p className="text-[11px] text-muted-foreground font-body mb-5 leading-relaxed">
        We only request permission to read and manage  calendar events.
        Your data stays in your Firebase account and is never sold or shared.
      </p>

      {/* CTA */}
      <Button
        className="w-full font-body gap-2 btn-premium btn-premium-glow"
        size="lg"
        onClick={handleConnect}
        disabled={connecting}
      >
        {connecting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Approve in popup…
          </>
        ) : (
          <>
            <Calendar className="h-4 w-4" />
            Connect Google Calendar
          </>
        )}
      </Button>

      {hasLocalEvents && (
        <p className="text-[11px] text-muted-foreground font-body mt-3">
          Your existing local events will remain untouched.
        </p>
      )}
    </motion.div>
  );
};
