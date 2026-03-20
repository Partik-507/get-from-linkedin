import React, { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { auth, googleProvider, ADMIN_EMAIL } from "@/lib/firebase";

interface AuthContextType {
  user: User | null;
  isGuest: boolean;
  isAdmin: boolean;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  continueAsGuest: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const guestFlag = sessionStorage.getItem("vivavault_guest");
    if (guestFlag === "true") setIsGuest(true);

    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) setIsGuest(false);
      setLoading(false);
    });
    return unsub;
  }, []);

  const isAdmin = user?.email === ADMIN_EMAIL;

  const signInWithGoogle = async () => {
    await signInWithPopup(auth, googleProvider);
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

  const continueAsGuest = () => {
    setIsGuest(true);
    sessionStorage.setItem("vivavault_guest", "true");
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setIsGuest(false);
    sessionStorage.removeItem("vivavault_guest");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isGuest,
        isAdmin,
        loading,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        continueAsGuest,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
