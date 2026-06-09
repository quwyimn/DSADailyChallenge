import { create } from 'zustand';
import type { SubmissionResult } from '../services/api';

interface SessionState {
  activeTaskId: number | null;
  activeTaskType: string | null;
  capturedActions: unknown[];
  submissionResult: SubmissionResult | null;
  setActiveTask: (taskId: number, taskType: string) => void;
  appendAction: (action: unknown) => void;
  setSubmissionResult: (result: SubmissionResult) => void;
  clearSession: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  activeTaskId: null,
  activeTaskType: null,
  capturedActions: [],
  submissionResult: null,

  setActiveTask: (activeTaskId, activeTaskType) =>
    set({ activeTaskId, activeTaskType, capturedActions: [], submissionResult: null }),

  appendAction: (action) =>
    set((state) => ({ capturedActions: [...state.capturedActions, action] })),

  setSubmissionResult: (submissionResult) => set({ submissionResult }),

  clearSession: () =>
    set({ activeTaskId: null, activeTaskType: null, capturedActions: [], submissionResult: null }),
}));
