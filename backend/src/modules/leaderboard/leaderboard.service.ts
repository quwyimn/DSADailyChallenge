import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { getHcmWeekRange, toHcmDateString } from '../../common/utils/hcm-date';

export interface LeaderboardEntry {
  rank: number;
  userId: number;
  name: string;
  className: string;
  totalPoints: number;
  isCurrentUser: boolean;
  avatarUrl: string | null;
}

export interface LeaderboardResponse {
  weekStart: string;
  weekEnd: string;
  currentUserRank: number | null;
  entries: LeaderboardEntry[];
}

const MAX_ENTRIES = 50;

@Injectable()
export class LeaderboardService {
  constructor(private readonly prisma: PrismaService) { }

  async getWeekly(currentUserId: number): Promise<LeaderboardResponse> {
    const { weekStart, weekEnd, weekStartStr, weekEndStr } = getHcmWeekRange();

    // Best-of-3: each (user, task, HCM day) counts its highest-scoring attempt,
    // not every submission. Reduce the week's submissions to best-per-day before
    // summing per user.
    const submissions = await this.prisma.submission.findMany({
      where: { createdAt: { gte: weekStart, lte: weekEnd } },
      select: { userId: true, taskId: true, points: true, createdAt: true },
    });

    const bestByDay = new Map<string, number>();
    for (const s of submissions) {
      const key = `${s.userId}:${s.taskId}:${toHcmDateString(s.createdAt)}`;
      const prev = bestByDay.get(key);
      if (prev === undefined || s.points > prev) bestByDay.set(key, s.points);
    }

    const totals = new Map<number, number>();
    for (const [key, points] of bestByDay) {
      const userId = Number(key.split(':')[0]);
      totals.set(userId, (totals.get(userId) ?? 0) + points);
    }

    if (totals.size === 0) {
      return { weekStart: weekStartStr, weekEnd: weekEndStr, currentUserRank: null, entries: [] };
    }

    const sorted = [...totals.entries()].sort((a, b) => b[1] - a[1]);

    // Fetch user details in one query
    const userIds = sorted.map(([userId]) => userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, avatarUrl: true, class: { select: { name: true } } },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    let currentUserRank: number | null = null;
    const allEntries: LeaderboardEntry[] = sorted.map(([userId, totalPoints], idx) => {
      const rank = idx + 1;
      const user = userMap.get(userId);
      if (userId === currentUserId) currentUserRank = rank;
      return {
        rank,
        userId,
        name: user?.name ?? 'Unknown',
        className: user?.class?.name ?? '',
        totalPoints,
        isCurrentUser: userId === currentUserId,
        avatarUrl: user?.avatarUrl ?? null,
      };
    });

    return {
      weekStart: weekStartStr,
      weekEnd: weekEndStr,
      currentUserRank,
      entries: allEntries.slice(0, MAX_ENTRIES),
    };
  }
}
