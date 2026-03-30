import { doc, getDoc, setDoc, collection, getDocs, addDoc, deleteDoc, query, where, onSnapshot, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

// ============ USER PROFILE ============
export interface UserProfile {
  name: string;
  email: string;
  role: string;
  branch: string;
  level: string;
  streak: number;
  lastStudied: string;
  createdAt: any;
}

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    return snap.exists() ? (snap.data() as UserProfile) : null;
  } catch { return null; }
};

export const createUserProfile = async (uid: string, data: Partial<UserProfile>) => {
  try {
    await setDoc(doc(db, "users", uid), {
      name: data.name || "",
      email: data.email || "",
      role: "student",
      branch: "",
      level: "",
      streak: 0,
      lastStudied: "",
      createdAt: serverTimestamp(),
      ...data,
    }, { merge: true });
  } catch (e) { console.error("Failed to create profile:", e); }
};

export const updateUserProfile = async (uid: string, data: Partial<UserProfile>) => {
  try {
    await setDoc(doc(db, "users", uid), data, { merge: true });
  } catch (e) { console.error("Failed to update profile:", e); }
};

// ============ ENROLLMENTS ============
export interface Enrollment {
  courseId: string;
  enrolledAt: any;
  progress: number;
  lastStudied: string;
  studiedCount: number;
}

export const enrollInCourse = async (uid: string, courseId: string) => {
  await setDoc(doc(db, "users", uid, "enrollments", courseId), {
    courseId,
    enrolledAt: serverTimestamp(),
    progress: 0,
    lastStudied: "",
    studiedCount: 0,
  });
};

export const unenrollFromCourse = async (uid: string, courseId: string) => {
  await deleteDoc(doc(db, "users", uid, "enrollments", courseId));
};

export const getUserEnrollments = async (uid: string): Promise<Record<string, Enrollment>> => {
  try {
    const snap = await getDocs(collection(db, "users", uid, "enrollments"));
    const enrollments: Record<string, Enrollment> = {};
    snap.docs.forEach(d => { enrollments[d.id] = d.data() as Enrollment; });
    return enrollments;
  } catch { return {}; }
};

// ============ BOOKMARKS (Firestore) ============
export const saveBookmarksToFirestore = async (uid: string, bookmarks: Record<string, string[]>) => {
  try {
    await setDoc(doc(db, "users", uid, "data", "bookmarks"), { collections: bookmarks });
  } catch (e) { console.error("Failed to save bookmarks:", e); }
};

export const loadBookmarksFromFirestore = async (uid: string): Promise<Record<string, string[]>> => {
  try {
    const snap = await getDoc(doc(db, "users", uid, "data", "bookmarks"));
    return snap.exists() ? (snap.data().collections || {}) : {};
  } catch { return {}; }
};

// ============ ACTIVITY & STREAK (Firestore) ============
export const saveActivityToFirestore = async (uid: string, activity: Record<string, number>) => {
  try {
    await setDoc(doc(db, "users", uid, "data", "activity"), { data: activity });
  } catch (e) { console.error("Failed to save activity:", e); }
};

export const loadActivityFromFirestore = async (uid: string): Promise<Record<string, number>> => {
  try {
    const snap = await getDoc(doc(db, "users", uid, "data", "activity"));
    return snap.exists() ? (snap.data().data || {}) : {};
  } catch { return {}; }
};

export const saveStreakToFirestore = async (uid: string, streak: { current: number; longest: number; lastDate: string }) => {
  try {
    await setDoc(doc(db, "users", uid, "data", "streak"), streak);
  } catch (e) { console.error("Failed to save streak:", e); }
};

export const loadStreakFromFirestore = async (uid: string): Promise<{ current: number; longest: number; lastDate: string }> => {
  try {
    const snap = await getDoc(doc(db, "users", uid, "data", "streak"));
    return snap.exists() ? snap.data() as any : { current: 0, longest: 0, lastDate: "" };
  } catch { return { current: 0, longest: 0, lastDate: "" }; }
};

// ============ FOCUS SESSIONS ============
export const saveFocusSession = async (uid: string, session: { duration: number; mode: string; date: string }) => {
  try {
    await addDoc(collection(db, "users", uid, "focusSessions"), {
      ...session,
      createdAt: serverTimestamp(),
    });
  } catch (e) { console.error("Failed to save focus session:", e); }
};

// ============ NOTIFICATIONS ============
export interface Notification {
  id: string;
  title: string;
  message: string;
  targetAll: boolean;
  targetCourseId?: string;
  createdAt: any;
  createdBy?: string;
}

export const sendNotification = async (notif: Omit<Notification, "id">) => {
  await addDoc(collection(db, "notifications"), {
    ...notif,
    createdAt: serverTimestamp(),
  });
};

export const markNotificationRead = async (uid: string, notifId: string) => {
  await setDoc(doc(db, "users", uid, "notificationReads", notifId), { readAt: serverTimestamp() });
};

export const getUserNotificationReads = async (uid: string): Promise<Set<string>> => {
  try {
    const snap = await getDocs(collection(db, "users", uid, "notificationReads"));
    return new Set(snap.docs.map(d => d.id));
  } catch { return new Set(); }
};

// ============ BRANCHES & LEVELS ============
export interface Branch {
  id: string;
  name: string;
  shortName: string;
  color: string;
}

export interface Level {
  id: string;
  name: string;
  branchId: string;
  order: number;
}

export const getBranches = async (): Promise<Branch[]> => {
  try {
    const snap = await getDocs(collection(db, "branches"));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Branch));
  } catch { return []; }
};

export const getLevels = async (): Promise<Level[]> => {
  try {
    const snap = await getDocs(collection(db, "levels"));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Level));
  } catch { return []; }
};

export const createBranch = async (data: Omit<Branch, "id">) => {
  const ref = await addDoc(collection(db, "branches"), { ...data, createdAt: serverTimestamp() });
  return ref.id;
};

export const updateBranch = async (id: string, data: Partial<Branch>) => {
  await updateDoc(doc(db, "branches", id), data);
};

export const deleteBranch = async (id: string) => {
  await deleteDoc(doc(db, "branches", id));
};

export const createLevel = async (data: Omit<Level, "id">) => {
  const ref = await addDoc(collection(db, "levels"), { ...data, createdAt: serverTimestamp() });
  return ref.id;
};

export const updateLevel = async (id: string, data: Partial<Level>) => {
  await updateDoc(doc(db, "levels", id), data);
};

export const deleteLevel = async (id: string) => {
  await deleteDoc(doc(db, "levels", id));
};

// ============ FEEDBACK ============
export const submitFeedback = async (feedback: { type: string; message: string; email?: string; userId?: string }) => {
  await addDoc(collection(db, "feedback"), {
    ...feedback,
    createdAt: serverTimestamp(),
  });
};

// ============ ACCESS REQUESTS ============
export const requestCourseAccess = async (uid: string, courseId: string, message: string) => {
  await addDoc(collection(db, "access_requests"), {
    userId: uid,
    courseId,
    message,
    status: "pending",
    createdAt: serverTimestamp(),
  });
};
