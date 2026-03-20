import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Chrome, Mail, UserX, Eye, EyeOff, Loader2 } from "lucide-react";

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
    <div className="min-h-screen gradient-mesh gradient-mesh-animated flex items-center justify-center px-4">
      {/* Background decorations */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-primary/5 blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-primary/3 blur-3xl animate-float" style={{ animationDelay: "3s" }} />
      </div>

      <GlassCard className="w-full max-w-md relative" hover={false}>
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-[hsl(263,70%,58%)] to-[hsl(230,80%,55%)] flex items-center justify-center text-white font-bold text-2xl mb-4 shadow-[0_0_40px_-5px_hsla(263,70%,58%,0.4)]">
            V
          </div>
          <h1 className="text-2xl font-bold tracking-tight">VivaVault</h1>
          <p className="text-muted-foreground text-sm mt-1">Premium IITM BS Viva Preparation</p>
        </div>

        {/* Google Sign In */}
        <Button
          variant="outline"
          className="w-full h-12 text-base mb-4 transition-transform duration-150 active:scale-[0.98]"
          onClick={handleGoogle}
          disabled={!!loading}
        >
          {loading === "google" ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Chrome className="h-5 w-5 mr-2" />}
          Sign in with Google
        </Button>

        {/* Divider */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground uppercase tracking-wider">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Email/Password */}
        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="w-full mb-4 bg-secondary">
            <TabsTrigger value="signin" className="flex-1">Sign In</TabsTrigger>
            <TabsTrigger value="signup" className="flex-1">Sign Up</TabsTrigger>
          </TabsList>

          {(["signin", "signup"] as const).map((mode) => (
            <TabsContent key={mode} value={mode} className="space-y-4 mt-0">
              <div className="space-y-2">
                <Label htmlFor={`${mode}-email`}>Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id={`${mode}-email`}
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-11 bg-secondary border-border"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${mode}-password`}>Password</Label>
                <div className="relative">
                  <Input
                    id={`${mode}-password`}
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 pr-10 bg-secondary border-border"
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
                className="w-full h-11 bg-gradient-to-r from-[hsl(263,70%,58%)] to-[hsl(230,80%,55%)] hover:opacity-90 transition-all duration-150 active:scale-[0.98]"
                onClick={() => handleEmail(mode)}
                disabled={!!loading}
              >
                {loading === mode && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {mode === "signin" ? "Sign In" : "Create Account"}
              </Button>
            </TabsContent>
          ))}
        </Tabs>

        {/* Divider */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground uppercase tracking-wider">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Guest */}
        <Button
          variant="ghost"
          className="w-full h-11 text-muted-foreground hover:text-foreground transition-all duration-150 active:scale-[0.98]"
          onClick={handleGuest}
          disabled={!!loading}
        >
          <UserX className="h-4 w-4 mr-2" />
          Continue as Guest
        </Button>
      </GlassCard>
    </div>
  );
};

export default Auth;
