import { create } from 'zustand';
import type { LeaderboardResponse } from '../services/api';

interface DailyTask {
  id: number;
  type: string;
  title: string;
  description: string | null;
  config: Record<string, unknown>;
}

interface CacheState {
  todayTasks: DailyTask[];
  leaderboardData: LeaderboardResponse | null;
  lastFetchedDate: string | null; // ISO date string
  setTodayTasks: (tasks: DailyTask[], date: string) => void;
  setLeaderboardData: (data: LeaderboardResponse) => void;
  clearCache: () => void;
}

export const useCacheStore = create<CacheState>((set) => ({
  todayTasks: [],
  leaderboardData: null,
  lastFetchedDate: null,

  setTodayTasks: (todayTasks, lastFetchedDate) => set({ todayTasks, lastFetchedDate }),
  setLeaderboardData: (leaderboardData) => set({ leaderboardData }),
  clearCache: () => set({ todayTasks: [], leaderboardData: null, lastFetchedDate: null }),
}));
