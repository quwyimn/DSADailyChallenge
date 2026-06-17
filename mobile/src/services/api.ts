import axios, { AxiosError, AxiosInstance } from 'axios';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// ---------------------------------------------------------------------------
// Base client
// ---------------------------------------------------------------------------

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api';

export const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach stored token to every request
api.interceptors.request.use(async (config) => {
  const token = await getStoredToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 401 → call the registered logout handler (registered from App.tsx to avoid circular imports)
let _onUnauthorized: (() => void) | null = null;

export function registerUnauthorizedHandler(handler: () => void): void {
  _onUnauthorized = handler;
}

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      _onUnauthorized?.();
    }
    return Promise.reject(error);
  },
);

// ---------------------------------------------------------------------------
// Token persistence (SecureStore on native; expo-secure-store has no web
// implementation — its web module is a stub `{}`, so every call throws
// "ExpoSecureStore.default.getValueWithKeyAsync is not a function". Fall
// back to localStorage on web.)
// ---------------------------------------------------------------------------

const TOKEN_KEY = 'auth_token';

export async function persistToken(token: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.setItem(TOKEN_KEY, token);
    return;
  }
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.removeItem(TOKEN_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function getStoredToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return localStorage.getItem(TOKEN_KEY);
  }
  return SecureStore.getItemAsync(TOKEN_KEY);
}

// ---------------------------------------------------------------------------
// Shared response types
// ---------------------------------------------------------------------------

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: 'user' | 'admin';
  classId: number | null;
  avatarUrl?: string | null;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface ClassItem {
  id: number;
  name: string;
  grade: string;
}

export interface DailyTask {
  id: number;
  type: string;
  title: string;
  config: Record<string, unknown>;
  difficulty: string;
  attemptsToday: number;
}

export interface DailySubject {
  type: string;
  label: string;
  tasks: DailyTask[];
}

export interface AttemptHistoryEntry {
  attemptNumber: number;
  isCorrect: boolean;
  points: number;
  isBest: boolean;
}

export interface SubmissionResult {
  isCorrect: boolean;
  points: number;
  attemptsUsed: number;
  maxAttempts: number;
  scored?: boolean;
  attemptHistory: AttemptHistoryEntry[];
}

export interface LeaderboardEntry {
  rank: number;
  userId: number;
  name: string;
  className: string;
  totalPoints: number;
  isCurrentUser: boolean;
  avatarUrl?: string | null;
}

export interface LeaderboardResponse {
  weekStart: string;
  weekEnd: string;
  currentUserRank: number | null;
  entries: LeaderboardEntry[];
}

export interface UserProfile extends AuthUser {
  streak: { current: number; longest: number } | null;
  badges: { key: string; name: string; description: string; iconUrl: string | null }[];
}

export interface DailyHistoryEntry {
  date: string;
  completed: boolean;
}

export interface StreakData {
  current: number;
  longest: number;
  lastUpdated: string | null;
  daily_history?: DailyHistoryEntry[];
}

export interface BadgeItem {
  key: string;
  name: string;
  description: string;
  iconUrl: string | null;
  awardedAt: string;
}

export interface BreakdownItem {
  taskId: number;
  title: string;
  type: string;
  points: number;
  isCorrect: boolean;
}

export interface TodaySummary {
  pointsToday: number;
  breakdown: BreakdownItem[];
}

// ---------------------------------------------------------------------------
// Typed endpoint functions
// ---------------------------------------------------------------------------

export const authApi = {
  login: (email: string, password: string) =>
    api.post<AuthResponse>('/auth/login', { email, password }).then((r) => r.data),

  register: (email: string, password: string, name: string, classId?: number) =>
    api
      .post<AuthResponse>('/auth/register', { email, password, name, classId })
      .then((r) => r.data),

  me: () => api.get<AuthUser>('/auth/me').then((r) => r.data),
};

export const classesApi = {
  list: () => api.get<ClassItem[]>('/classes').then((r) => r.data),
};

export const usersApi = {
  me: () => api.get<AuthUser>('/users/me').then((r) => r.data),
  profile: (userId: number) =>
    api.get<UserProfile>(`/users/${userId}/profile`).then((r) => r.data),
};

export const dailyApi = {
  getTodayTasks: () => api.get<DailySubject[]>('/daily').then((r) => r.data),
};

export const submissionsApi = {
  submit: (taskId: number, actions: unknown) =>
    api
      .post<SubmissionResult>('/submissions', { taskId, actions })
      .then((r) => r.data),
  todaySummary: () =>
    api.get<TodaySummary>('/submissions/today-summary').then((r) => r.data),
};

export const streakApi = {
  get: () => api.get<StreakData>('/streak').then((r) => r.data),
};

export const badgesApi = {
  get: () => api.get<BadgeItem[]>('/badges').then((r) => r.data),
};

export const leaderboardApi = {
  get: () => api.get<LeaderboardResponse>('/leaderboard').then((r) => r.data),
};
