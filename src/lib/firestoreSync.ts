import { doc, getDoc, setDoc, collection, getDocs, addDoc, deleteDoc, query, where, onSnapshot, serverTimestamp, updateDoc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { SchemaTemplate, FilterIndex, ImportLog } from "@/lib/schemaEngine";

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

export const getNotifications = async (): Promise<Notification[]> => {
  try {
    const snap = await getDocs(collection(db, "notifications"));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Notification));
  } catch { return []; }
};

export const deleteNotification = async (id: string) => {
  await deleteDoc(doc(db, "notifications", id));
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

// ============ COURSES / PROJECTS (Enhanced CRUD) ============
export interface Course {
  id: string;
  code: string;
  name: string;
  description: string;
  color: string;
  type?: "course" | "project";
  branchId?: string;
  levelId?: string;
  accessType?: "public" | "private" | "premium";
  status?: "active" | "draft" | "archived";
  iconColor?: string;
  unlockConditions?: { loginRequired?: boolean; subscriptionRequired?: boolean };
  createdAt?: any;
  updatedAt?: any;
}

export const getCourses = async (): Promise<Course[]> => {
  try {
    const snap = await getDocs(collection(db, "projects"));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Course));
  } catch { return []; }
};

export const createCourse = async (data: Omit<Course, "id">) => {
  const ref = await addDoc(collection(db, "projects"), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
};

export const updateCourse = async (id: string, data: Partial<Course>) => {
  await updateDoc(doc(db, "projects", id), { ...data, updatedAt: serverTimestamp() });
};

export const deleteCourse = async (id: string) => {
  await deleteDoc(doc(db, "projects", id));
};

// ============ QUESTIONS CRUD ============
export const createQuestion = async (data: Record<string, any>) => {
  const ref = await addDoc(collection(db, "questions"), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
};

export const updateQuestion = async (id: string, data: Record<string, any>) => {
  await updateDoc(doc(db, "questions", id), { ...data, updatedAt: serverTimestamp() });
};

export const deleteQuestion = async (id: string) => {
  await deleteDoc(doc(db, "questions", id));
};

export const getQuestionsByProject = async (projectId: string): Promise<any[]> => {
  try {
    const q = query(collection(db, "questions"), where("projectId", "==", projectId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch { return []; }
};

// ============ RESOURCES CRUD ============
export const createResource = async (data: Record<string, any>) => {
  const ref = await addDoc(collection(db, "resources"), { ...data, status: data.status || "approved", createdAt: serverTimestamp() });
  return ref.id;
};

export const updateResource = async (id: string, data: Record<string, any>) => {
  await updateDoc(doc(db, "resources", id), { ...data, updatedAt: serverTimestamp() });
};

export const deleteResource = async (id: string) => {
  await deleteDoc(doc(db, "resources", id));
};

// ============ SCHEMA TEMPLATES ============
export const saveSchemaTemplate = async (template: Omit<SchemaTemplate, "id">) => {
  const ref = await addDoc(collection(db, "schema_templates"), {
    ...template,
    createdAt: serverTimestamp(),
  });
  return ref.id;
};

export const getSchemaTemplates = async (): Promise<SchemaTemplate[]> => {
  try {
    const snap = await getDocs(collection(db, "schema_templates"));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as SchemaTemplate));
  } catch { return []; }
};

export const deleteSchemaTemplate = async (id: string) => {
  await deleteDoc(doc(db, "schema_templates", id));
};

// ============ FILTER INDEXES ============
export const saveFilterIndexes = async (projectId: string, indexes: FilterIndex[]) => {
  await setDoc(doc(db, "filter_indexes", projectId), {
    indexes,
    updatedAt: serverTimestamp(),
  });
};

export const getFilterIndexes = async (projectId: string): Promise<FilterIndex[]> => {
  try {
    const snap = await getDoc(doc(db, "filter_indexes", projectId));
    return snap.exists() ? (snap.data().indexes || []) : [];
  } catch { return []; }
};

// ============ IMPORT LOGS ============
export const saveImportLog = async (log: Omit<ImportLog, "id">) => {
  const ref = await addDoc(collection(db, "import_logs"), {
    ...log,
    importedAt: serverTimestamp(),
  });
  return ref.id;
};

export const getImportLogs = async (): Promise<ImportLog[]> => {
  try {
    const snap = await getDocs(collection(db, "import_logs"));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as ImportLog));
  } catch { return []; }
};

export const checkFileHashExists = async (fileHash: string): Promise<{ exists: boolean; importedAt?: string }> => {
  try {
    const q = query(collection(db, "import_logs"), where("fileHash", "==", fileHash));
    const snap = await getDocs(q);
    if (snap.empty) return { exists: false };
    const data = snap.docs[0].data();
    return { exists: true, importedAt: data.importedAt?.toDate?.()?.toLocaleDateString?.() || "unknown" };
  } catch { return { exists: false }; }
};

// ============ AUDIT LOG ============
export interface AuditLogEntry {
  id?: string;
  userId: string;
  userEmail?: string;
  action: "create" | "update" | "delete" | "import" | "approve" | "reject";
  entityType: string;
  entityId?: string;
  details?: string;
  timestamp?: any;
}

export const logAdminAction = async (entry: Omit<AuditLogEntry, "id">) => {
  try {
    await addDoc(collection(db, "audit_logs"), {
      ...entry,
      timestamp: serverTimestamp(),
    });
  } catch (e) { console.error("Failed to log admin action:", e); }
};

export const getAuditLogs = async (limit = 100): Promise<AuditLogEntry[]> => {
  try {
    const snap = await getDocs(collection(db, "audit_logs"));
    const logs = snap.docs.map(d => ({ id: d.id, ...d.data() } as AuditLogEntry));
    return logs.sort((a, b) => {
      const aT = a.timestamp?.toDate?.()?.getTime?.() || 0;
      const bT = b.timestamp?.toDate?.()?.getTime?.() || 0;
      return bT - aT;
    }).slice(0, limit);
  } catch { return []; }
};

// ============ BATCHED ATOMIC WRITE ============
export const batchWriteQuestions = async (
  projectId: string,
  records: Record<string, any>[],
  onProgress?: (done: number, total: number) => void
): Promise<{ success: number; failed: number; failedIndexes: number[] }> => {
  const BATCH_SIZE = 450; // Stay under 500 limit
  let success = 0;
  let failed = 0;
  const failedIndexes: number[] = [];

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const chunk = records.slice(i, i + BATCH_SIZE);
    try {
      const batch = writeBatch(db);
      for (const record of chunk) {
        const ref = doc(collection(db, "questions"));
        batch.set(ref, {
          projectId,
          ...record,
          _raw: undefined, // Don't store raw in DB
          createdAt: serverTimestamp(),
        });
      }
      await batch.commit();
      success += chunk.length;
    } catch (e) {
      console.error(`Batch write failed at index ${i}:`, e);
      failed += chunk.length;
      for (let j = i; j < i + chunk.length; j++) failedIndexes.push(j);
    }
    onProgress?.(Math.min(i + chunk.length, records.length), records.length);
  }

  return { success, failed, failedIndexes };
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

export const getAccessRequests = async (): Promise<any[]> => {
  try {
    const q = query(collection(db, "access_requests"), where("status", "==", "pending"));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch { return []; }
};

export const resolveAccessRequest = async (id: string, status: "approved" | "rejected") => {
  await updateDoc(doc(db, "access_requests", id), { status, resolvedAt: serverTimestamp() });
};

// ============ FEEDBACK ============
export const submitFeedback = async (feedback: { type: string; message: string; email?: string; userId?: string }) => {
  await addDoc(collection(db, "feedback"), {
    ...feedback,
    createdAt: serverTimestamp(),
  });
};
