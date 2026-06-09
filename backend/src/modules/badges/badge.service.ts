import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// Maps badge keys to the conditions that trigger them.
// Submission-count badges fire exactly when count reaches the threshold.
// Streak badges fire exactly when current streak hits the threshold.
const SUBMISSION_THRESHOLDS: Record<number, string> = {
  1: 'first_submit',
  10: 'submissions_10',
  50: 'submissions_50',
  100: 'submissions_100',
};

const STREAK_THRESHOLDS: Record<number, string> = {
  3: 'streak_3',
  7: 'streak_7',
  30: 'streak_30',
};

@Injectable()
export class BadgeService {
  constructor(private readonly prisma: PrismaService) {}

  /** Called after every submission + streak update.
   *  Awards any newly-earned badges; silently skips already-awarded ones. */
  async checkAndAward(userId: number, streakCurrent: number): Promise<void> {
    const totalCount = await this.prisma.submission.count({ where: { userId } });

    const keysToCheck: string[] = [];
    if (SUBMISSION_THRESHOLDS[totalCount]) keysToCheck.push(SUBMISSION_THRESHOLDS[totalCount]);
    if (STREAK_THRESHOLDS[streakCurrent]) keysToCheck.push(STREAK_THRESHOLDS[streakCurrent]);

    if (keysToCheck.length === 0) return;

    const badges = await this.prisma.badge.findMany({
      where: { key: { in: keysToCheck } },
      select: { id: true },
    });

    await Promise.all(
      badges.map((badge) =>
        this.prisma.userBadge.create({ data: { userId, badgeId: badge.id } }).catch((e: unknown) => {
          // P2002 = unique constraint violation — badge already awarded, skip silently
          if ((e as { code?: string }).code !== 'P2002') throw e;
        }),
      ),
    );
  }

  /** Returns all badges the user has earned, for GET /api/badges. */
  async getUserBadges(userId: number) {
    const userBadges = await this.prisma.userBadge.findMany({
      where: { userId },
      include: { badge: true },
      orderBy: { awardedAt: 'asc' },
    });
    return userBadges.map((ub) => ({
      key: ub.badge.key,
      name: ub.badge.name,
      description: ub.badge.description,
      iconUrl: ub.badge.iconUrl,
      awardedAt: ub.awardedAt.toISOString(),
    }));
  }
}
