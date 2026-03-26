// SM-2 Spaced Repetition Algorithm
// All data stored in localStorage under 'vv_sm2'

export interface SM2Data {
  ef: number;       // Easiness Factor (min 1.3)
  interval: number; // Days until next review
  reps: number;     // Successful repetitions in a row
  nextReview: string; // ISO date string
}

export type SM2Store = Record<string, SM2Data>;

const STORAGE_KEY = "vv_sm2";
const ACTIVITY_KEY = "vv_activity";
const STREAK_KEY = "vv_streak";

export const loadSM2 = (): SM2Store => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
};

export const saveSM2 = (store: SM2Store) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
};

export const getQuestionSM2 = (questionId: string): SM2Data => {
  const store = loadSM2();
  return store[questionId] || { ef: 2.5, interval: 1, reps: 0, nextReview: new Date().toISOString().split("T")[0] };
};

/**
 * Update SM-2 data after a review
 * @param quality 0-5 rating (0-2 = fail, 3-5 = pass)
 */
export const reviewQuestion = (questionId: string, quality: number): SM2Data => {
  const store = loadSM2();
  const current = store[questionId] || { ef: 2.5, interval: 1, reps: 0, nextReview: "" };

  let { ef, interval, reps } = current;

  if (quality >= 3) {
    // Correct
    if (reps === 0) interval = 1;
    else if (reps === 1) interval = 6;
    else interval = Math.round(interval * ef);
    reps++;
  } else {
    // Incorrect — reset
    reps = 0;
    interval = 1;
  }

  // Update easiness factor
  ef = ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (ef < 1.3) ef = 1.3;

  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + interval);
  const nextReview = nextDate.toISOString().split("T")[0];

  const updated: SM2Data = { ef, interval, reps, nextReview };
  store[questionId] = updated;
  saveSM2(store);

  return updated;
};

export const getDueQuestions = (questionIds: string[]): string[] => {
  const store = loadSM2();
  const today = new Date().toISOString().split("T")[0];
  return questionIds.filter((id) => {
    const data = store[id];
    if (!data) return true; // Never reviewed = due
    return data.nextReview <= today;
  });
};

// Activity tracking
export type ActivityData = Record<string, number>; // "YYYY-MM-DD" -> count

export const loadActivity = (): ActivityData => {
  try {
    return JSON.parse(localStorage.getItem(ACTIVITY_KEY) || "{}");
  } catch {
    return {};
  }
};

export const recordActivity = (count: number = 1) => {
  const data = loadActivity();
  const today = new Date().toISOString().split("T")[0];
  data[today] = (data[today] || 0) + count;
  localStorage.setItem(ACTIVITY_KEY, JSON.stringify(data));
  updateStreak();
};

// Streak tracking
export interface StreakData {
  current: number;
  longest: number;
  lastDate: string;
}

export const loadStreak = (): StreakData => {
  try {
    return JSON.parse(localStorage.getItem(STREAK_KEY) || '{"current":0,"longest":0,"lastDate":""}');
  } catch {
    return { current: 0, longest: 0, lastDate: "" };
  }
};

const updateStreak = () => {
  const streak = loadStreak();
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  if (streak.lastDate === today) return; // Already counted today

  if (streak.lastDate === yesterday) {
    streak.current++;
  } else if (streak.lastDate !== today) {
    streak.current = 1;
  }

  streak.lastDate = today;
  if (streak.current > streak.longest) streak.longest = streak.current;
  localStorage.setItem(STREAK_KEY, JSON.stringify(streak));
};

// Progress helpers
export const getStudiedIds = (): Set<string> => {
  try {
    return new Set(JSON.parse(localStorage.getItem("vv_studied") || "[]"));
  } catch {
    return new Set();
  }
};

export const getProjectProgress = (projectQuestionIds: string[]): number => {
  const studied = getStudiedIds();
  if (projectQuestionIds.length === 0) return 0;
  const count = projectQuestionIds.filter((id) => studied.has(id)).length;
  return Math.round((count / projectQuestionIds.length) * 100);
};
