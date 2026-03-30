import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
} from "firebase/auth";
import { collection, getDocs, query, where } from "firebase/firestore";
import { auth, googleProvider, githubProvider, db } from "@/lib/firebase";
import { getUserProfile, createUserProfile, updateUserProfile as updateProfile, type UserProfile } from "@/lib/firestoreSync";

interface AuthContextType {
  user: User | null;
  isGuest: boolean;
  isAdmin: boolean;
  isDemo: boolean;
  demoTimeLeft: number;
  loading: boolean;
  userProfile: UserProfile | null;
  signInWithGoogle: () => Promise<void>;
  signInWithGithub: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  continueAsGuest: () => void;
  startDemo: () => void;
  adminShortcut: (password: string) => boolean;
  signOut: () => Promise<void>;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

const DEMO_DURATION = 10 * 60 * 1000; // 10 minutes

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [demoTimeLeft, setDemoTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const checkAdmin = async (email: string | null) => {
    if (!email) { setIsAdmin(false); return; }
    try {
      const q = query(collection(db, "admins"), where("email", "==", email));
      const snap = await getDocs(q);
      setIsAdmin(!snap.empty);
    } catch {
      setIsAdmin(email === "partik" || email === "partik@mail.com" || email === "kunal77x@gmail.com");
    }
  };

  const loadProfile = async (u: User) => {
    let profile = await getUserProfile(u.uid);
    if (!profile) {
      await createUserProfile(u.uid, {
        name: u.displayName || "",
        email: u.email || "",
      });
      profile = await getUserProfile(u.uid);
    }
    setUserProfile(profile);
  };

  const adminShortcut = (pwd: string): boolean => {
    if (pwd === "#Qkecy@5739x") {
      setIsAdmin(true);
      setIsGuest(false);
      setIsDemo(false);
      sessionStorage.setItem("vivavault_admin_shortcut", "true");
      sessionStorage.removeItem("vivavault_guest");
      sessionStorage.removeItem("vivavault_demo_start");
      return true;
    }
    return false;
  };

  // Demo timer
  useEffect(() => {
    if (!isDemo) return;
    const interval = setInterval(() => {
      const startStr = sessionStorage.getItem("vivavault_demo_start");
      if (!startStr) { setIsDemo(false); return; }
      const elapsed = Date.now() - parseInt(startStr);
      const remaining = Math.max(0, DEMO_DURATION - elapsed);
      setDemoTimeLeft(remaining);
      if (remaining <= 0) {
        setIsDemo(false);
        setIsGuest(false);
        sessionStorage.removeItem("vivavault_demo_start");
        sessionStorage.removeItem("vivavault_guest");
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isDemo]);

  useEffect(() => {
    const guestFlag = sessionStorage.getItem("vivavault_guest");
    if (guestFlag === "true") setIsGuest(true);

    const demoStart = sessionStorage.getItem("vivavault_demo_start");
    if (demoStart) {
      const elapsed = Date.now() - parseInt(demoStart);
      if (elapsed < DEMO_DURATION) {
        setIsDemo(true);
        setIsGuest(true);
        setDemoTimeLeft(DEMO_DURATION - elapsed);
      } else {
        sessionStorage.removeItem("vivavault_demo_start");
        sessionStorage.removeItem("vivavault_guest");
      }
    }

    const adminFlag = sessionStorage.getItem("vivavault_admin_shortcut");
    if (adminFlag === "true") {
      setIsAdmin(true);
      setLoading(false);
    }

    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        setIsGuest(false);
        setIsDemo(false);
        sessionStorage.removeItem("vivavault_demo_start");
        await checkAdmin(u.email);
        await loadProfile(u);
      } else {
        setIsAdmin(false);
        setUserProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const signInWithGoogle = async () => {
    await signInWithPopup(auth, googleProvider);
    sessionStorage.removeItem("vivavault_guest");
    sessionStorage.removeItem("vivavault_demo_start");
  };

  const signInWithGithub = async () => {
    await signInWithPopup(auth, githubProvider);
    sessionStorage.removeItem("vivavault_guest");
    sessionStorage.removeItem("vivavault_demo_start");
  };

  const signInWithEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
    sessionStorage.removeItem("vivavault_guest");
    sessionStorage.removeItem("vivavault_demo_start");
  };

  const signUpWithEmail = async (email: string, password: string) => {
    await createUserWithEmailAndPassword(auth, email, password);
    sessionStorage.removeItem("vivavault_guest");
    sessionStorage.removeItem("vivavault_demo_start");
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const continueAsGuest = () => {
    setIsGuest(true);
    sessionStorage.setItem("vivavault_guest", "true");
  };

  const startDemo = () => {
    setIsGuest(true);
    setIsDemo(true);
    sessionStorage.setItem("vivavault_guest", "true");
    sessionStorage.setItem("vivavault_demo_start", String(Date.now()));
    setDemoTimeLeft(DEMO_DURATION);
  };

  const handleUpdateProfile = async (data: Partial<UserProfile>) => {
    if (!user) return;
    await updateProfile(user.uid, data);
    setUserProfile(prev => prev ? { ...prev, ...data } : null);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setIsGuest(false);
    setIsAdmin(false);
    setIsDemo(false);
    setUserProfile(null);
    sessionStorage.removeItem("vivavault_guest");
    sessionStorage.removeItem("vivavault_admin_shortcut");
    sessionStorage.removeItem("vivavault_demo_start");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isGuest,
        isAdmin,
        isDemo,
        demoTimeLeft,
        loading,
        userProfile,
        signInWithGoogle,
        signInWithGithub,
        signInWithEmail,
        signUpWithEmail,
        resetPassword,
        continueAsGuest,
        startDemo,
        adminShortcut,
        signOut,
        updateUserProfile: handleUpdateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
