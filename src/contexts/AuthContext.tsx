import React, { createContext, useContext, useEffect, useState } from "react";
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

interface AuthContextType {
  user: User | null;
  isGuest: boolean;
  isAdmin: boolean;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithGithub: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  continueAsGuest: () => void;
  adminShortcut: (password: string) => boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkAdmin = async (email: string | null) => {
    if (!email) { setIsAdmin(false); return; }
    try {
      const q = query(collection(db, "admins"), where("email", "==", email));
      const snap = await getDocs(q);
      setIsAdmin(!snap.empty);
    } catch {
      // Fallback: check hardcoded
      setIsAdmin(email === "partik" || email === "partik@mail.com" || email === "kunal77x@gmail.com");
    }
  };

  const adminShortcut = (pwd: string): boolean => {
    if (pwd === "#Qkecy@5739x") {
      setIsAdmin(true);
      setIsGuest(false);
      sessionStorage.setItem("vivavault_admin_shortcut", "true");
      sessionStorage.removeItem("vivavault_guest");
      return true;
    }
    return false;
  };

  useEffect(() => {
    const guestFlag = sessionStorage.getItem("vivavault_guest");
    if (guestFlag === "true") setIsGuest(true);

    const adminFlag = sessionStorage.getItem("vivavault_admin_shortcut");
    if (adminFlag === "true") {
      setIsAdmin(true);
      setLoading(false);
    }

    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        setIsGuest(false);
        await checkAdmin(u.email);
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const signInWithGoogle = async () => {
    await signInWithPopup(auth, googleProvider);
    sessionStorage.removeItem("vivavault_guest");
  };

  const signInWithGithub = async () => {
    await signInWithPopup(auth, githubProvider);
    sessionStorage.removeItem("vivavault_guest");
  };

  const signInWithEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
    sessionStorage.removeItem("vivavault_guest");
  };

  const signUpWithEmail = async (email: string, password: string) => {
    await createUserWithEmailAndPassword(auth, email, password);
    sessionStorage.removeItem("vivavault_guest");
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const continueAsGuest = () => {
    setIsGuest(true);
    sessionStorage.setItem("vivavault_guest", "true");
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setIsGuest(false);
    setIsAdmin(false);
    sessionStorage.removeItem("vivavault_guest");
    sessionStorage.removeItem("vivavault_admin_shortcut");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isGuest,
        isAdmin,
        loading,
        signInWithGoogle,
        signInWithGithub,
        signInWithEmail,
        signUpWithEmail,
        resetPassword,
        continueAsGuest,
        adminShortcut,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
