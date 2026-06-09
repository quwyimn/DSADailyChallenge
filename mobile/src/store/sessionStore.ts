import { create } from 'zustand';

interface SessionState {
  activeTaskId: number | null;
  activeTaskType: string | null;
  capturedActions: unknown[];
  setActiveTask: (taskId: number, taskType: string) => void;
  appendAction: (action: unknown) => void;
  clearSession: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  activeTaskId: null,
  activeTaskType: null,
  capturedActions: [],

  setActiveTask: (activeTaskId, activeTaskType) =>
    set({ activeTaskId, activeTaskType, capturedActions: [] }),

  appendAction: (action) =>
    set((state) => ({ capturedActions: [...state.capturedActions, action] })),

  clearSession: () => set({ activeTaskId: null, activeTaskType: null, capturedActions: [] }),
}));
