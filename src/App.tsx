import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { StorageProvider, useStorage } from "@/contexts/StorageContext";
import { FocusProvider } from "@/contexts/FocusContext";
import { OfflineProvider } from "@/contexts/OfflineContext";
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
import StudyMode from "./pages/StudyMode";
import Notes from "./pages/Notes";
import Notifications from "./pages/Notifications";
import NotFound from "./pages/NotFound";
import SharedNote from "./pages/SharedNote";
import GoogleCalendarCallback from "./pages/GoogleCalendarCallback";
import FocusMode from "./pages/FocusMode";
import CourseSelect from "./pages/CourseSelect";
import { CollegeSelect } from "./pages/CollegeSelect";
import { hydrateThemes } from "./lib/adminFocusThemes";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

// Hydrate admin-managed focus themes once on app boot (silent fallback to built-ins)
hydrateThemes();


const AuthGate = ({ children }: { children: React.ReactNode }) => {
  const { user, isGuest, isAdmin, isDemo, loading, userProfile } = useAuth();
  const [collegeId, setCollegeId] = React.useState<string | null>(
    () => localStorage.getItem("vv_selected_college")
  );

  React.useEffect(() => {
    if (userProfile?.selectedCollegeId) {
      setCollegeId(userProfile.selectedCollegeId);
      localStorage.setItem("vv_selected_college", userProfile.selectedCollegeId);
      if (userProfile.selectedCollegeName) {
        localStorage.setItem("vv_selected_college_name", userProfile.selectedCollegeName);
      }
    }
  }, [userProfile?.selectedCollegeId, userProfile?.selectedCollegeName]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-[hsl(240,70%,50%)] animate-pulse" />
      </div>
    );
  }

  if (!user && !isGuest && !isAdmin && !isDemo) {
    return <Auth />;
  }

  // Post-login college gate (logged-in users only; guests/admins skip)
  if (user && !isAdmin && !collegeId) {
    return <CollegeSelect onSelected={(id) => setCollegeId(id)} />;
  }

  return <>{children}</>;
};

const LandingGate = () => {
  const { user, isGuest, isDemo, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-[hsl(240,70%,50%)] animate-pulse" />
      </div>
    );
  }
  if (user || isGuest || isDemo) return <Index />;
  return <Landing />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <StorageProvider>
        <FocusProvider>
          <TooltipProvider>
            <Toaster richColors position="bottom-right" />
            <BrowserRouter>
              <AuthProvider>
                <OfflineProvider>
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
                    <Route path="/course/:courseId/select" element={<AuthGate><CourseSelect /></AuthGate>} />
                    <Route path="/course/:courseId/questions" element={<AuthGate><VivaPrep /></AuthGate>} />
                    <Route path="/course/:courseId/resources" element={<AuthGate><Resources /></AuthGate>} />
                    <Route path="/project/:projectId/flashcards" element={<AuthGate><Flashcards /></AuthGate>} />
                    <Route path="/project/:projectId/quiz" element={<AuthGate><Quiz /></AuthGate>} />
                    <Route path="/bookmarks" element={<AuthGate><Bookmarks /></AuthGate>} />
                    <Route path="/notes" element={<AuthGate><Notes /></AuthGate>} />
                    <Route path="/resources" element={<AuthGate><Resources /></AuthGate>} />
                    <Route path="/study" element={<AuthGate><StudyMode /></AuthGate>} />
                    <Route path="/focus" element={<AuthGate><FocusMode /></AuthGate>} />
                    <Route path="/timer" element={<Navigate to="/focus" replace />} />
                    <Route path="/notifications" element={<AuthGate><Notifications /></AuthGate>} />
                    <Route path="/admin" element={<AuthGate><Admin /></AuthGate>} />
                    <Route path="/progress" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/shared/:noteId" element={<SharedNote />} />
                    <Route path="/share/:shareId" element={<SharedNote />} />
                    <Route path="/oauth/google/callback" element={<GoogleCalendarCallback />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </OfflineProvider>
              </AuthProvider>
            </BrowserRouter>
          </TooltipProvider>
        </FocusProvider>
      </StorageProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
