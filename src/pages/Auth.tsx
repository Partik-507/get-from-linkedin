import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Chrome, Mail, Eye, EyeOff, Loader2, Zap, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const Auth = () => {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, continueAsGuest } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);

  const handleGoogle = async () => {
    setLoading("google");
    try {
      await signInWithGoogle();
      toast.success("Welcome to VivaVault!");
      navigate("/");
    } catch (e: any) {
      toast.error(e.message || "Failed to sign in with Google");
    } finally {
      setLoading(null);
    }
  };

  const handleEmail = async (mode: "signin" | "signup") => {
    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }
    setLoading(mode);
    try {
      if (mode === "signin") {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password);
      }
      toast.success("Welcome to VivaVault!");
      navigate("/");
    } catch (e: any) {
      toast.error(e.message || `Failed to ${mode === "signin" ? "sign in" : "sign up"}`);
    } finally {
      setLoading(null);
    }
  };

  const handleGuest = () => {
    continueAsGuest();
    toast.success("Welcome! You're browsing as a guest.");
    navigate("/");
  };

  return (
    <div className="min-h-screen obsidian-bg relative flex items-center justify-center px-4">
      {/* Animated mesh background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full bg-primary/10 blur-[100px] animate-float" />
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 rounded-full bg-primary/5 blur-[120px] animate-float" style={{ animationDelay: "3s" }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-[hsl(280,70%,50%)] flex items-center justify-center text-primary-foreground font-bold text-2xl mb-4 shadow-[0_0_40px_-5px_hsl(263,70%,55%/0.5)]">
            V
          </div>
          <h1 className="text-3xl font-heading font-extrabold tracking-tight">VivaVault</h1>
          <p className="text-muted-foreground text-sm mt-1 font-body">Premium IITM BS Viva Preparation</p>
        </div>

        {/* HERO CTA: Continue as Guest */}
        <button
          onClick={handleGuest}
          disabled={!!loading}
          className="w-full group relative mb-6 overflow-hidden rounded-2xl p-[1px] transition-all duration-300 hover:shadow-[0_0_30px_-5px_hsl(263,70%,55%/0.3)]"
        >
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary via-[hsl(280,70%,50%)] to-primary opacity-80 group-hover:opacity-100 transition-opacity" />
          <div className="relative flex items-center justify-between rounded-[15px] bg-card px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div className="text-left">
                <span className="block font-heading font-bold text-lg text-foreground">Browse as Guest</span>
                <span className="block text-xs text-muted-foreground font-body">No account needed — jump right in</span>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-primary group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

        {/* Auth card */}
        <div className="obsidian-card p-6 space-y-5">
          {/* Google Sign In */}
          <Button
            variant="outline"
            className="w-full h-12 text-base transition-all duration-200 active:scale-[0.98] font-body border-border/60"
            onClick={handleGoogle}
            disabled={!!loading}
          >
            {loading === "google" ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Chrome className="h-5 w-5 mr-2" />}
            Sign in with Google
          </Button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-body">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

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
                    <Input
                      id={`${mode}-email`}
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-11 bg-secondary/30 border-border/40 font-body"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${mode}-password`} className="font-body text-sm">Password</Label>
                  <div className="relative">
                    <Input
                      id={`${mode}-password`}
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-11 pr-10 bg-secondary/30 border-border/40 font-body"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button
                  className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-200 active:scale-[0.98] font-body font-semibold"
                  onClick={() => handleEmail(mode)}
                  disabled={!!loading}
                >
                  {loading === mode && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {mode === "signin" ? "Sign In" : "Create Account"}
                </Button>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;