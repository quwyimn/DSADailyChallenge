import axios from 'axios';
import type { AxiosInstance } from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

export const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

let _onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: () => void) {
  _onUnauthorized = fn;
}

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401 && _onUnauthorized) _onUnauthorized();
    return Promise.reject(err);
  },
);

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

export function setAuthToken(token: string | null) {
  if (token) {
    localStorage.setItem('admin_token', token);
  } else {
    localStorage.removeItem('admin_token');
  }
}

export function extractErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const msg = (err.response?.data as { message?: string } | undefined)?.message;
    if (typeof msg === 'string') return msg;
  }
  return '';
}

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export const TASK_TYPES = [
  'bubble_sort',
  'linked_list',
  'binary_search',
  'stack_ops',
  'queue_ops',
] as const;
export type TaskType = (typeof TASK_TYPES)[number];

export interface Task {
  id: number;
  type: string;
  title: string;
  description: string | null;
  config: Record<string, unknown>;
  createdAt: string;
}

export interface Assignment {
  id: number;
  date: string;
  task: { id: number; type: string; title: string; config: Record<string, unknown> };
}

export interface ClassItem {
  id: number;
  name: string;
  grade: string;
}

export interface ClassStat {
  classId: number;
  className: string;
  grade: string;
  totalStudents: number;
  studentsCompleted: number;
  completionRate: number;
  totalSubmissions: number;
  totalPoints: number;
}

// ---------------------------------------------------------------------------
// Typed API helpers
// ---------------------------------------------------------------------------

export const tasksApi = {
  list: () => api.get<Task[]>('/tasks').then((r) => r.data),
  create: (payload: { type: string; title: string; description?: string; config: Record<string, unknown> }) =>
    api.post<Task>('/tasks', payload).then((r) => r.data),
  update: (
    id: number,
    payload: { type?: string; title?: string; description?: string; config?: Record<string, unknown> },
  ) => api.patch<Task>(`/tasks/${id}`, payload).then((r) => r.data),
  remove: (id: number) => api.delete(`/tasks/${id}`),
};

export const classesApi = {
  list: () => api.get<ClassItem[]>('/classes').then((r) => r.data),
  create: (payload: { name: string; grade: string }) =>
    api.post<ClassItem>('/classes', payload).then((r) => r.data),
  update: (id: number, payload: { name?: string; grade?: string }) =>
    api.patch<ClassItem>(`/classes/${id}`, payload).then((r) => r.data),
  remove: (id: number) => api.delete(`/classes/${id}`),
};

export const assignmentsApi = {
  listByDate: (date?: string) =>
    api.get<Assignment[]>('/assignments', { params: date ? { date } : {} }).then((r) => r.data),
  create: (taskId: number, date: string) =>
    api.post<Assignment>('/assignments', { taskId, date }).then((r) => r.data),
  remove: (id: number) => api.delete(`/assignments/${id}`),
  generate: (date: string) => api.post('/assignments/generate', { date }).then((r) => r.data),
};

export const statsApi = {
  get: () => api.get<ClassStat[]>('/stats').then((r) => r.data),
};
