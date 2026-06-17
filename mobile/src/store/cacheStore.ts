import { create } from 'zustand';
import type { DailySubject, DailyHistoryEntry, LeaderboardResponse, BadgeItem } from '../services/api';

interface CacheState {
  todayTasks: DailySubject[];
  leaderboardData: LeaderboardResponse | null;
  lastFetchedDate: string | null; // ISO date string
  pointsToday: number | null;
  streakCurrent: number | null;
  dailyHistory: DailyHistoryEntry[] | null;
  latestBadge: BadgeItem | null;
  allTasksCompletedToday: boolean;
  refreshTodayTasks: (() => void) | null;
  setTodayTasks: (tasks: DailySubject[], date: string) => void;
  setLeaderboardData: (data: LeaderboardResponse) => void;
  setPointsToday: (v: number) => void;
  setStreakCurrent: (v: number) => void;
  setDailyHistory: (history: DailyHistoryEntry[]) => void;
  setLatestBadge: (badge: BadgeItem | null) => void;
  setAllTasksCompletedToday: (v: boolean) => void;
  setRefreshTodayTasks: (fn: (() => void) | null) => void;
  addPoints: (points: number) => void;
  incrementAttempts: (taskId: number) => void;
  clearCache: () => void;
  reset: () => void;
}

export const useCacheStore = create<CacheState>((set) => ({
  todayTasks: [],
  leaderboardData: null,
  lastFetchedDate: null,
  pointsToday: null,
  streakCurrent: null,
  dailyHistory: null,
  latestBadge: null,
  allTasksCompletedToday: false,
  refreshTodayTasks: null,

  setTodayTasks: (todayTasks, lastFetchedDate) => set({ todayTasks, lastFetchedDate }),
  setLeaderboardData: (leaderboardData) => set({ leaderboardData }),
  setPointsToday: (pointsToday) => set({ pointsToday }),
  setStreakCurrent: (streakCurrent) => set({ streakCurrent }),
  setDailyHistory: (dailyHistory) => set({ dailyHistory }),
  setLatestBadge: (latestBadge) => set({ latestBadge }),
  setAllTasksCompletedToday: (allTasksCompletedToday) => set({ allTasksCompletedToday }),
  setRefreshTodayTasks: (refreshTodayTasks) => set({ refreshTodayTasks }),
  addPoints: (points) => set((state) => ({ pointsToday: (state.pointsToday ?? 0) + points })),
  incrementAttempts: (taskId) =>
    set((state) => ({
      todayTasks: state.todayTasks.map((subject) => ({
        ...subject,
        tasks: subject.tasks.map((t) =>
          t.id === taskId ? { ...t, attemptsToday: t.attemptsToday + 1 } : t,
        ),
      })),
    })),
  clearCache: () => set({
    todayTasks: [],
    leaderboardData: null,
    lastFetchedDate: null,
    pointsToday: null,
    streakCurrent: null,
    dailyHistory: null,
    allTasksCompletedToday: false,
  }),
  reset: () => set({
    todayTasks: [],
    leaderboardData: null,
    lastFetchedDate: null,
    pointsToday: null,
    streakCurrent: null,
    dailyHistory: null,
    allTasksCompletedToday: false,
  }),
}));
