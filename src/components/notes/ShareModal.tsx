import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Globe, Lock, Copy, Check, Link2, Users, Eye, Edit3, X, Share2,
} from "lucide-react";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface Props {
  open: boolean;
  onClose: () => void;
  note: { id: string; title: string; icon?: string };
  userId: string;
  content: string;
}

function generateSlug(len = 12): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export const ShareModal = ({ open, onClose, note, userId, content }: Props) => {
  const [published, setPublished] = useState(false);
  const [slug, setSlug] = useState("");
  const [customSlug, setCustomSlug] = useState("");
  const [useCustomSlug, setUseCustomSlug] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [sharedEmails, setSharedEmails] = useState<{ email: string; role: "view" | "edit" }[]>([]);

  const activeSlug = useCustomSlug && customSlug ? customSlug : slug;
  const shareUrl = `${window.location.origin}/share/${activeSlug}`;

  const handlePublish = async () => {
    setPublishing(true);
    try {
      const newSlug = useCustomSlug && customSlug ? customSlug : generateSlug();
      await setDoc(doc(db, "publicShares", newSlug), {
        pageId: note.id,
        userId,
        title: note.title,
        icon: note.icon || "📄",
        content,
        type: "note", // Explicit type so SharedView can branch on note vs canvas
        revoked: false,
        deleted: false,
        views: 0,
        publishedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setSlug(newSlug);
      setPublished(true);
      toast.success("Page published — anyone with the link can view");
    } catch (err) {
      toast.error("Failed to publish. Check Firebase rules.");
    } finally {
      setPublishing(false);
    }
  };

  const handleUnpublish = async () => {
    if (slug) {
      try {
        await setDoc(doc(db, "publicShares", slug), { revoked: true, updatedAt: serverTimestamp() }, { merge: true });
      } catch { /* ignore */ }
    }
    setPublished(false);
    setSlug("");
    toast.success("Link revoked — visitors will see a not-available message");
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddEmail = () => {
    const email = emailInput.trim();
    if (!email || !email.includes("@")) return;
    if (sharedEmails.some(s => s.email === email)) return;
    setSharedEmails(prev => [...prev, { email, role: "view" }]);
    setEmailInput("");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md font-body">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading text-base">
            <Share2 className="h-4 w-4 text-primary" />
            Share Page
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-1">
          {/* Page title */}
          <div className="flex items-center gap-2 px-3 py-2 bg-accent/20 rounded-xl border border-border/30">
            <span className="text-xl">{note.icon || "📄"}</span>
            <span className="text-sm font-body font-medium truncate">{note.title || "Untitled"}</span>
          </div>

          {/* Publish to web toggle */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-body font-medium">Publish to web</p>
                  <p className="text-[11px] text-muted-foreground">Anyone with the link can view</p>
                </div>
              </div>
              <button
                onClick={published ? handleUnpublish : handlePublish}
                disabled={publishing}
                className={cn(
                  "relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none",
                  published ? "bg-primary" : "bg-muted"
                )}
              >
                <span className={cn(
                  "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-background shadow transition-transform duration-200",
                  published ? "translate-x-5" : "translate-x-0"
                )} />
              </button>
            </div>

            {published && (
              <div className="space-y-3 mt-3">
                {/* Share URL */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center gap-2 bg-secondary/40 border border-border/40 rounded-lg px-3 py-2">
                    <Link2 className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                    <span className="text-xs font-body text-muted-foreground truncate flex-1">{shareUrl}</span>
                  </div>
                  <Button size="sm" variant="outline" onClick={handleCopy} className="shrink-0 text-xs gap-1">
                    {copied ? <><Check className="h-3.5 w-3.5 text-green-600" /> Copied</> : <><Copy className="h-3.5 w-3.5" /> Copy</>}
                  </Button>
                </div>

                {/* Custom slug */}
                <div>
                  <label className="text-[10px] font-body text-muted-foreground uppercase tracking-wider mb-1 block">
                    Custom URL path (optional)
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground shrink-0">/share/</span>
                    <input
                      value={customSlug}
                      onChange={e => { setCustomSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-")); setUseCustomSlug(true); }}
                      placeholder={slug}
                      className="flex-1 text-xs bg-secondary/40 border border-border/40 rounded-lg px-3 py-2 outline-none focus:border-primary/50 font-body text-foreground placeholder:text-muted-foreground/50"
                    />
                  </div>
                </div>
              </div>
            )}

            {!published && (
              <div className="flex items-center gap-2 mt-2 text-[11px] text-muted-foreground font-body">
                <Lock className="h-3 w-3" />
                Private — visible only to you
              </div>
            )}
          </div>

          <div className="border-t border-border/50" />

          {/* Share with users */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-body font-medium">Share with people</p>
            </div>

            <div className="flex gap-2 mb-3">
              <input
                value={emailInput}
                onChange={e => setEmailInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAddEmail()}
                placeholder="Enter email address..."
                className="flex-1 text-xs bg-secondary/40 border border-border/40 rounded-lg px-3 py-2 outline-none focus:border-primary/50 font-body text-foreground placeholder:text-muted-foreground/50"
              />
              <Button size="sm" onClick={handleAddEmail} className="text-xs shrink-0">Invite</Button>
            </div>

            {sharedEmails.length > 0 && (
              <div className="space-y-1.5">
                {sharedEmails.map(({ email, role }) => (
                  <div key={email} className="flex items-center gap-2 px-3 py-2 bg-secondary/40 rounded-lg border border-border/40">
                    <div className="h-6 w-6 rounded-full bg-gradient-to-br from-primary to-purple-400 flex items-center justify-center text-primary-foreground text-[10px] font-bold shrink-0">
                      {email[0].toUpperCase()}
                    </div>
                    <span className="text-xs font-body text-foreground truncate flex-1">{email}</span>
                    <select
                      value={role}
                      onChange={e => setSharedEmails(prev => prev.map(s => s.email === email ? { ...s, role: e.target.value as "view" | "edit" } : s))}
                      className="text-[10px] border border-border/40 rounded bg-secondary px-1 py-0.5 font-body text-muted-foreground"
                    >
                      <option value="view">View</option>
                      <option value="edit">Edit</option>
                    </select>
                    <button onClick={() => setSharedEmails(prev => prev.filter(s => s.email !== email))}
                      className="text-muted-foreground hover:text-destructive transition-colors">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
