import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, Zap, ArrowRight, Mail, KeyRound, Shield, Timer } from "lucide-react";
import { motion } from "framer-motion";

const Auth = () => {
  const { signInWithGoogle, signInWithGithub, signInWithEmail, signUpWithEmail, resetPassword, continueAsGuest, startDemo, adminShortcut } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminPwd, setAdminPwd] = useState("");

  const handleGoogle = async () => {
    setLoading("google");
    try { await signInWithGoogle(); toast.success("Welcome to VivaVault!"); navigate("/"); }
    catch (e: any) { toast.error(e.message || "Failed to sign in with Google"); }
    finally { setLoading(null); }
  };

  const handleGithub = async () => {
    setLoading("github");
    try { await signInWithGithub(); toast.success("Welcome to VivaVault!"); navigate("/"); }
    catch (e: any) { toast.error(e.message || "Failed to sign in with GitHub"); }
    finally { setLoading(null); }
  };

  const handleEmail = async (mode: "signin" | "signup") => {
    if (!email || !password) { toast.error("Please enter email and password"); return; }
    setLoading(mode);
    try {
      if (mode === "signin") await signInWithEmail(email, password);
      else await signUpWithEmail(email, password);
      toast.success("Welcome to VivaVault!");
      navigate("/");
    } catch (e: any) { toast.error(e.message || `Failed to ${mode === "signin" ? "sign in" : "sign up"}`); }
    finally { setLoading(null); }
  };

  const handleForgotPassword = async () => {
    if (!resetEmail) { toast.error("Enter your email address"); return; }
    setLoading("reset");
    try { await resetPassword(resetEmail); toast.success("Password reset email sent!"); setForgotOpen(false); }
    catch (e: any) { toast.error(e.message || "Failed to send reset email"); }
    finally { setLoading(null); }
  };

  const handleGuest = () => { continueAsGuest(); toast.success("Welcome! Browsing as guest."); navigate("/"); };

  const handleDemo = () => { startDemo(); toast.success("Demo started! You have 10 minutes to explore."); navigate("/"); };

  const handleAdminShortcut = () => {
    if (adminShortcut(adminPwd)) { toast.success("Admin access granted!"); setAdminOpen(false); setAdminPwd(""); navigate("/admin"); }
    else toast.error("Incorrect password. Access denied.");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full bg-primary/8 blur-[100px]" />
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 rounded-full bg-primary/5 blur-[120px]" />
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-[hsl(280,70%,50%)] flex items-center justify-center text-primary-foreground font-bold text-2xl mb-4 shadow-lg shadow-primary/25">V</div>
          <h1 className="text-3xl font-heading font-extrabold tracking-tight">VivaVault</h1>
          <p className="text-muted-foreground text-sm mt-1 font-body">Your study companion</p>
        </div>

        {/* Auth card */}
        <div className="bg-card border border-border/50 rounded-2xl p-6 space-y-5 shadow-sm">
          {/* Google */}
          <Button variant="outline" className="w-full h-12 text-base font-body border-border/60 gap-3 hover:bg-secondary/50" onClick={handleGoogle} disabled={!!loading}>
            {loading === "google" ? <Loader2 className="h-5 w-5 animate-spin" /> : (
              <svg className="h-5 w-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            )}
            Sign in with Google
          </Button>

          {/* GitHub */}
          <Button variant="outline" className="w-full h-12 text-base font-body border-border/60 gap-3 bg-[hsl(0,0%,12%)] text-white hover:bg-[hsl(0,0%,18%)] dark:bg-foreground dark:text-background dark:hover:bg-foreground/90" onClick={handleGithub} disabled={!!loading}>
            {loading === "github" ? <Loader2 className="h-5 w-5 animate-spin" /> : (
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222 0 1.606-.015 2.896-.015 3.286 0 .315.216.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12z"/></svg>
            )}
            Sign in with GitHub
          </Button>

          <div className="flex items-center gap-3"><div className="flex-1 h-px bg-border" /><span className="text-xs text-muted-foreground uppercase tracking-wider font-body">or</span><div className="flex-1 h-px bg-border" /></div>

          {/* Email/Password */}
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="w-full mb-4 bg-secondary/50">
              <TabsTrigger value="signin" className="flex-1 font-body">Sign In</TabsTrigger>
              <TabsTrigger value="signup" className="flex-1 font-body">Sign Up</TabsTrigger>
            </TabsList>
            {(["signin", "signup"] as const).map((mode) => (
              <TabsContent key={mode} value={mode} className="space-y-4 mt-0">
                <div className="space-y-2">
                  <Label htmlFor={`${mode}-email`} className="font-body text-sm">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id={`${mode}-email`} type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 h-11 bg-secondary/30 border-border/40 font-body" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`${mode}-password`} className="font-body text-sm">Password</Label>
                    {mode === "signin" && <button type="button" onClick={() => { setResetEmail(email); setForgotOpen(true); }} className="text-xs text-primary hover:text-primary/80 font-body">Forgot password?</button>}
                  </div>
                  <div className="relative">
                    <Input id={`${mode}-password`} type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 pr-10 bg-secondary/30 border-border/40 font-body" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                  </div>
                </div>
                <Button className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-body font-semibold" onClick={() => handleEmail(mode)} disabled={!!loading}>
                  {loading === mode && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {mode === "signin" ? "Sign In" : "Create Account"}
                </Button>
              </TabsContent>
            ))}
          </Tabs>
        </div>

        {/* Bottom options */}
        <div className="mt-5 space-y-3">
          {/* Try Demo */}
          <button onClick={handleDemo} disabled={!!loading} className="w-full group relative overflow-hidden rounded-xl p-[1px] transition-all duration-300 hover:shadow-lg hover:shadow-[hsl(var(--warning))]/20">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-[hsl(var(--warning))] to-[hsl(30,90%,50%)] opacity-80 group-hover:opacity-100 transition-opacity" />
            <div className="relative flex items-center justify-between rounded-[11px] bg-card px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-[hsl(var(--warning))]/10 flex items-center justify-center">
                  <Timer className="h-5 w-5 text-[hsl(var(--warning))]" />
                </div>
                <div className="text-left">
                  <span className="block font-heading font-bold text-foreground">Try Demo</span>
                  <span className="block text-[10px] text-muted-foreground font-body">10-minute preview — no account needed</span>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-[hsl(var(--warning))] group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          {/* Guest */}
          <button onClick={handleGuest} disabled={!!loading} className="w-full group relative overflow-hidden rounded-xl p-[1px] transition-all duration-300 hover:shadow-lg hover:shadow-primary/20">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary via-[hsl(280,70%,50%)] to-primary opacity-80 group-hover:opacity-100 transition-opacity" />
            <div className="relative flex items-center justify-between rounded-[11px] bg-card px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <span className="block font-heading font-bold text-foreground">Browse as Guest</span>
                  <span className="block text-[10px] text-muted-foreground font-body">No account needed — jump right in</span>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-primary group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          {/* Admin Shortcut */}
          <button onClick={() => setAdminOpen(true)} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border/40 text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 transition-all font-body">
            <Shield className="h-4 w-4" /> Admin Shortcut
          </button>
        </div>
      </motion.div>

      {/* Forgot Password Dialog */}
      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading">Reset Password</DialogTitle>
            <DialogDescription className="font-body">Enter your email and we'll send you a reset link.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="email" placeholder="your@email.com" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} className="pl-10 bg-secondary/30 border-border/40 font-body" /></div>
            <Button onClick={handleForgotPassword} disabled={loading === "reset"} className="w-full font-body gap-2">{loading === "reset" ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}Send Reset Link</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Admin Dialog */}
      <Dialog open={adminOpen} onOpenChange={(o) => { setAdminOpen(o); if (!o) setAdminPwd(""); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2"><Shield className="h-5 w-5 text-primary" /> Admin Access</DialogTitle>
            <DialogDescription className="font-body">Enter the admin password.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input type="password" placeholder="Enter admin password" value={adminPwd} onChange={(e) => setAdminPwd(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAdminShortcut()} className="h-11 bg-secondary/30 border-border/40 font-body" autoFocus />
            <Button onClick={handleAdminShortcut} className="w-full font-body gap-2 bg-primary hover:bg-primary/90"><Shield className="h-4 w-4" />Unlock Admin</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Auth;
