import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ScrollToTop } from "@/components/ScrollToTop";
import Landing from "./pages/Landing";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import VivaPrep from "./pages/VivaPrep";
import SubmitExperience from "./pages/SubmitExperience";
import SubmitQuestion from "./pages/SubmitQuestion";
import Resources from "./pages/Resources";
import Admin from "./pages/Admin";
import Bookmarks from "./pages/Bookmarks";
import Flashcards from "./pages/Flashcards";
import Quiz from "./pages/Quiz";
import Profile from "./pages/Profile";
import FocusMode from "./pages/FocusMode";
import TimerMode from "./pages/TimerMode";
import Notes from "./pages/Notes";
import Notifications from "./pages/Notifications";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AuthGate = ({ children }: { children: React.ReactNode }) => {
  const { user, isGuest, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-[hsl(240,70%,50%)] animate-pulse" />
      </div>
    );
  }

  if (!user && !isGuest && !isAdmin) {
    return <Auth />;
  }

  return <>{children}</>;
};

const LandingGate = () => {
  const { user, isGuest, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-[hsl(240,70%,50%)] animate-pulse" />
      </div>
    );
  }
  if (user || isGuest) return <Index />;
  return <Landing />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster richColors position="bottom-right" />
        <BrowserRouter>
          <AuthProvider>
            <ScrollToTop />
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/" element={<LandingGate />} />
              <Route path="/dashboard" element={<AuthGate><Dashboard /></AuthGate>} />
              <Route path="/profile" element={<AuthGate><Profile /></AuthGate>} />
              <Route path="/submit-question" element={<AuthGate><SubmitQuestion /></AuthGate>} />
              <Route path="/project/:projectId/viva" element={<AuthGate><VivaPrep /></AuthGate>} />
              <Route path="/project/:projectId/submit" element={<AuthGate><SubmitExperience /></AuthGate>} />
              <Route path="/project/:projectId/resources" element={<AuthGate><Resources /></AuthGate>} />
              <Route path="/project/:projectId/flashcards" element={<AuthGate><Flashcards /></AuthGate>} />
              <Route path="/project/:projectId/quiz" element={<AuthGate><Quiz /></AuthGate>} />
              <Route path="/bookmarks" element={<AuthGate><Bookmarks /></AuthGate>} />
              <Route path="/notes" element={<AuthGate><Notes /></AuthGate>} />
              <Route path="/focus" element={<AuthGate><FocusMode /></AuthGate>} />
              <Route path="/timer" element={<AuthGate><TimerMode /></AuthGate>} />
              <Route path="/notifications" element={<AuthGate><Notifications /></AuthGate>} />
              <Route path="/admin" element={<AuthGate><Admin /></AuthGate>} />
              <Route path="/progress" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
