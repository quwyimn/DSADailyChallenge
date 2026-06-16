import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { getHcmToday, getHcmDayUtcRange } from '../../common/utils/hcm-date';

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
  async getStreak(userId: number): Promise<{ current: number; longest: number; lastUpdated: string | null }> {
    const streak = await this.prisma.streak.findUnique({ where: { userId } });
    if (!streak) return { current: 0, longest: 0, lastUpdated: null };
    return {
      current: streak.current,
      longest: streak.longest,
      lastUpdated: streak.lastUpdated.toISOString(),
    };
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
