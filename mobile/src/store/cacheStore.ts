import { create } from 'zustand';

interface DailyTask {
  id: number;
  type: string;
  title: string;
  description: string | null;
  config: Record<string, unknown>;
}

interface LeaderboardEntry {
  userId: number;
  name: string;
  points: number;
  rank: number;
}

interface CacheState {
  todayTasks: DailyTask[];
  leaderboard: LeaderboardEntry[];
  lastFetchedDate: string | null; // ISO date string
  setTodayTasks: (tasks: DailyTask[], date: string) => void;
  setLeaderboard: (entries: LeaderboardEntry[]) => void;
  clearCache: () => void;
}

export const useCacheStore = create<CacheState>((set) => ({
  todayTasks: [],
  leaderboard: [],
  lastFetchedDate: null,

  setTodayTasks: (todayTasks, lastFetchedDate) => set({ todayTasks, lastFetchedDate }),
  setLeaderboard: (leaderboard) => set({ leaderboard }),
  clearCache: () => set({ todayTasks: [], leaderboard: [], lastFetchedDate: null }),
}));
