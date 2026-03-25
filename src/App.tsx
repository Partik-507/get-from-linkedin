import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ScrollToTop } from "@/components/ScrollToTop";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import VivaPrep from "./pages/VivaPrep";
import SubmitExperience from "./pages/SubmitExperience";
import SubmitQuestion from "./pages/SubmitQuestion";
import Resources from "./pages/Resources";
import Admin from "./pages/Admin";
import Bookmarks from "./pages/Bookmarks";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AuthGate = ({ children }: { children: React.ReactNode }) => {
  const { user, isGuest, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen gradient-mesh flex items-center justify-center">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-[hsl(263,70%,55%)] animate-pulse" />
      </div>
    );
  }

  if (!user && !isGuest) {
    return <Auth />;
  }

  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster richColors position="top-right" />
        <BrowserRouter>
          <AuthProvider>
            <ScrollToTop />
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/" element={<AuthGate><Index /></AuthGate>} />
              <Route path="/dashboard" element={<AuthGate><Dashboard /></AuthGate>} />
              <Route path="/submit-question" element={<AuthGate><SubmitQuestion /></AuthGate>} />
              <Route path="/project/:projectId/viva" element={<AuthGate><VivaPrep /></AuthGate>} />
              <Route path="/project/:projectId/submit" element={<AuthGate><SubmitExperience /></AuthGate>} />
              <Route path="/project/:projectId/resources" element={<AuthGate><Resources /></AuthGate>} />
              <Route path="/admin" element={<AuthGate><Admin /></AuthGate>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
