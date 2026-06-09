import axios, { AxiosError, AxiosInstance } from 'axios';
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
  const token = await SecureStore.getItemAsync('auth_token');
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
// Token persistence (SecureStore)
// ---------------------------------------------------------------------------

export async function persistToken(token: string): Promise<void> {
  await SecureStore.setItemAsync('auth_token', token);
}

export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync('auth_token');
}

export async function getStoredToken(): Promise<string | null> {
  return SecureStore.getItemAsync('auth_token');
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
  description: string | null;
  config: Record<string, unknown>;
}

export interface SubmissionResult {
  isCorrect: boolean;
  points: number;
}

export interface LeaderboardEntry {
  userId: number;
  name: string;
  points: number;
  rank: number;
}

export interface UserProfile extends AuthUser {
  streak: { current: number; longest: number } | null;
  badges: { key: string; name: string; description: string; iconUrl: string | null }[];
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
  getTodayTasks: () => api.get<DailyTask[]>('/daily').then((r) => r.data),
};

export const submissionsApi = {
  submit: (taskId: number, actions: unknown) =>
    api
      .post<SubmissionResult>('/submissions', { taskId, actions })
      .then((r) => r.data),
};

export const leaderboardApi = {
  getWeekly: () => api.get<LeaderboardEntry[]>('/leaderboard').then((r) => r.data),
};
