import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { getHcmToday, getHcmDayUtcRange, toHcmDateString } from '../../common/utils/hcm-date';

@Injectable()
export class StreakService {
  constructor(private readonly prisma: PrismaService) {}

  /** Called after every submission. Updates the streak if the user has
   *  submitted to ALL tasks assigned today (Asia/Ho_Chi_Minh date).
   *  Always returns the user's current streak so the caller can do badge checks. */
  async checkAndUpdate(userId: number): Promise<{ current: number; longest: number }> {
    const todayMidnightUtc = getHcmToday();

    // Only increment when the user has completed every task for today
    const allDone = await this.hasCompletedAllTasksToday(userId, todayMidnightUtc);
    if (!allDone) {
      const streak = await this.prisma.streak.findUnique({ where: { userId } });
      return { current: streak?.current ?? 0, longest: streak?.longest ?? 0 };
    }

    const streak = await this.prisma.streak.findUnique({ where: { userId } });

    // No record yet — first time completing all tasks
    if (!streak) {
      await this.prisma.streak.create({
        data: { userId, current: 1, longest: 1, lastUpdated: todayMidnightUtc },
      });
      return { current: 1, longest: 1 };
    }

    // Already updated today — idempotent (two submissions finishing the last task)
    if (streak.lastUpdated.getTime() === todayMidnightUtc.getTime()) {
      return { current: streak.current, longest: streak.longest };
    }

    // Was yesterday → consecutive → increment; otherwise reset to 1
    const yesterdayMidnightUtc = new Date(todayMidnightUtc.getTime() - 24 * 60 * 60 * 1000);
    const isConsecutive = streak.lastUpdated.getTime() === yesterdayMidnightUtc.getTime();

    const newCurrent = isConsecutive ? streak.current + 1 : 1;
    const newLongest = Math.max(streak.longest, newCurrent);

    await this.prisma.streak.update({
      where: { userId },
      data: { current: newCurrent, longest: newLongest, lastUpdated: todayMidnightUtc },
    });
    return { current: newCurrent, longest: newLongest };
  }

  /** Returns the user's streak for GET /api/streak. */
  async getStreak(
    userId: number,
  ): Promise<{
    current: number;
    longest: number;
    lastUpdated: string | null;
    daily_history: { date: string; completed: boolean }[];
  }> {
    const streak = await this.prisma.streak.findUnique({ where: { userId } });

    const daily_history = await this.getDailyHistory(userId);

    return {
      current: streak?.current ?? 0,
      longest: streak?.longest ?? 0,
      lastUpdated: streak ? streak.lastUpdated.toISOString() : null,
      daily_history,
    };
  }

  /** Computes completion status for each of the last 7 GMT+7 days (oldest first).
   *  A day is "completed" if the user had at least one correct submission that day. */
  private async getDailyHistory(userId: number): Promise<{ date: string; completed: boolean }[]> {
    const todayMidnightUtc = getHcmToday();

    // Build the 7-day list oldest→newest. Each hcmDay is a "UTC midnight" marker
    // whose UTC date components equal the HCM calendar date (see getHcmToday).
    const days = Array.from({ length: 7 }, (_, i) => {
      const hcmDay = new Date(todayMidnightUtc.getTime() - (6 - i) * 24 * 60 * 60 * 1000);
      return { hcmDay, dateStr: toHcmDateString(hcmDay) };
    });

    // Single query covering the full 7-day window
    const { start: windowStart } = getHcmDayUtcRange(days[0].hcmDay);
    const { end: windowEnd } = getHcmDayUtcRange(days[days.length - 1].hcmDay);

    const correctSubs = await this.prisma.submission.findMany({
      where: { userId, isCorrect: true, createdAt: { gte: windowStart, lt: windowEnd } },
      select: { createdAt: true },
    });

    const datesWithCorrect = new Set(correctSubs.map((s) => toHcmDateString(s.createdAt)));

    return days.map(({ dateStr }) => ({ date: dateStr, completed: datesWithCorrect.has(dateStr) }));
  }

  /** True when the user has at least one submission for every task assigned today. */
  private async hasCompletedAllTasksToday(userId: number, todayMidnightUtc: Date): Promise<boolean> {
    const { start, end } = getHcmDayUtcRange(todayMidnightUtc);

    const [assignments, submissions] = await Promise.all([
      this.prisma.dailyAssignment.findMany({
        where: { date: todayMidnightUtc },
        select: { taskId: true },
      }),
      this.prisma.submission.findMany({
        // "Completed" = at least one attempt today, regardless of score —
        // isScored is no longer used for scoring decisions (best-of-3 model).
        where: { userId, createdAt: { gte: start, lt: end } },
        select: { taskId: true },
      }),
    ]);

    if (assignments.length === 0) return false;

    const submittedIds = new Set(submissions.map((s) => s.taskId));
    return assignments.every((a) => submittedIds.has(a.taskId));
  }
}
