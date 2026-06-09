import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { getHcmWeekRange } from '../../common/utils/hcm-date';

export interface LeaderboardEntry {
  rank: number;
  userId: number;
  name: string;
  className: string;
  totalPoints: number;
  isCurrentUser: boolean;
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
  constructor(private readonly prisma: PrismaService) {}

  async getWeekly(currentUserId: number): Promise<LeaderboardResponse> {
    const { weekStart, weekEnd, weekStartStr, weekEndStr } = getHcmWeekRange();

    // Sum points per user for all submissions in the current HCM week
    const grouped = await this.prisma.submission.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: weekStart, lte: weekEnd } },
      _sum: { points: true },
      orderBy: { _sum: { points: 'desc' } },
    });

    if (grouped.length === 0) {
      return { weekStart: weekStartStr, weekEnd: weekEndStr, currentUserRank: null, entries: [] };
    }

    // Fetch user details in one query
    const userIds = grouped.map((g) => g.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, class: { select: { name: true } } },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    let currentUserRank: number | null = null;
    const allEntries: LeaderboardEntry[] = grouped.map((g, idx) => {
      const rank = idx + 1;
      const user = userMap.get(g.userId);
      if (g.userId === currentUserId) currentUserRank = rank;
      return {
        rank,
        userId: g.userId,
        name: user?.name ?? 'Unknown',
        className: user?.class?.name ?? '',
        totalPoints: g._sum.points ?? 0,
        isCurrentUser: g.userId === currentUserId,
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
