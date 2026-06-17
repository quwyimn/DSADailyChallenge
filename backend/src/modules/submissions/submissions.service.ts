import {
  Injectable,
  NotFoundException,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ChallengeRegistryService } from '../../challenges/challenge-registry.service';
import { StreakService } from '../streak/streak.service';
import { BadgeService } from '../badges/badge.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { getHcmToday, getHcmDayUtcRange } from '../../common/utils/hcm-date';

const MAX_ATTEMPTS = 3;

@Injectable()
export class SubmissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: ChallengeRegistryService,
    private readonly streak: StreakService,
    private readonly badge: BadgeService,
  ) {}

  async create(userId: number, dto: CreateSubmissionDto) {
    // 1. Verify task exists
    const task = await this.prisma.task.findUnique({
      where: { id: dto.taskId },
    });
    if (!task) throw new NotFoundException('Task not found');

    // 2. Verify the task is assigned for today (Asia/Ho_Chi_Minh date)
    const today = getHcmToday();
    const assignment = await this.prisma.dailyAssignment.findFirst({
      where: { taskId: dto.taskId, date: today },
    });
    if (!assignment) {
      throw new BadRequestException('This task is not assigned for today');
    }

    // 3. Count today's attempts on this task — max 3 per day, then locked
    const { start, end } = getHcmDayUtcRange(today);
    const attemptsToday = await this.prisma.submission.count({
      where: { userId, taskId: dto.taskId, createdAt: { gte: start, lt: end } },
    });
    if (attemptsToday >= MAX_ATTEMPTS) {
      throw new HttpException(
        {
          message: 'Maximum attempts reached for today',
          attemptsUsed: MAX_ATTEMPTS,
          maxAttempts: MAX_ATTEMPTS,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // 4 + 5. Grade via the strategy
    let strategy: ReturnType<typeof this.registry.resolve>;
    try {
      strategy = this.registry.resolve(task.type);
    } catch {
      throw new BadRequestException(
        `Challenge type '${task.type}' is not yet supported for submission`,
      );
    }
    const config = task.config as Record<string, unknown>;
    const { isCorrect, points } = strategy.grade(config, dto.actions);

    // 6. Persist (UTC timestamp set by Prisma default). isScored is no longer used
    // for scoring decisions — the best of up to MAX_ATTEMPTS attempts is resolved
    // at read time via resolveScore(), not at write time.
    const submission = await this.prisma.submission.create({
      data: {
        userId,
        taskId: dto.taskId,
        // unknown[] → InputJsonValue cast isolated here
        actions: dto.actions as unknown as Prisma.InputJsonValue,
        isCorrect,
        isScored: false,
        points,
      },
    });

    // 7. Streak/badge check after every attempt. StreakService.checkAndUpdate is
    // idempotent (increments at most once per GMT+7 day via its lastUpdated check),
    // so re-running it on retries is safe.
    const { current: streakCurrent } = await this.streak
      .checkAndUpdate(userId)
      .catch((e: unknown) => {
        console.error('[StreakService] checkAndUpdate failed:', e);
        return { current: 0, longest: 0 };
      });
    await this.badge
      .checkAndAward(userId, streakCurrent)
      .catch((e: unknown) => {
        console.error('[BadgeService] checkAndAward failed:', e);
      });

    const attemptHistory = await this.getAttemptHistory(userId, dto.taskId, today);

    return {
      id: submission.id,
      isCorrect,
      points,
      attemptsUsed: attemptsToday + 1,
      maxAttempts: MAX_ATTEMPTS,
      scored: false,
      attemptHistory,
    };
  }

  /** Returns every attempt for (userId, taskId) on the given Asia/Ho_Chi_Minh
   *  calendar day, oldest first, numbered from 1. The highest-points attempt is
   *  flagged `isBest` (ties go to the earliest attempt — same rule as resolveScore). */
  private async getAttemptHistory(userId: number, taskId: number, date: Date) {
    const { start, end } = getHcmDayUtcRange(date);
    const submissions = await this.prisma.submission.findMany({
      where: { userId, taskId, createdAt: { gte: start, lt: end } },
      orderBy: { id: 'asc' },
      select: { isCorrect: true, points: true },
    });

    const bestPoints = Math.max(...submissions.map((s) => s.points));
    let bestFound = false;
    return submissions.map((s, idx) => {
      const isBest = !bestFound && s.points === bestPoints;
      if (isBest) bestFound = true;
      return { attemptNumber: idx + 1, isCorrect: s.isCorrect, points: s.points, isBest };
    });
  }

  /** Returns the highest-scoring submission for (userId, taskId) on the given
   *  Asia/Ho_Chi_Minh calendar day, or null if there are none. Ties go to the
   *  earliest attempt. This is the "best of up to MAX_ATTEMPTS" used by the
   *  leaderboard and (indirectly) by streak completion checks instead of isScored. */
  async resolveScore(userId: number, taskId: number, date: Date) {
    const { start, end } = getHcmDayUtcRange(date);
    const [best] = await this.prisma.submission.findMany({
      where: { userId, taskId, createdAt: { gte: start, lt: end } },
      orderBy: [{ points: 'desc' }, { id: 'asc' }],
      take: 1,
    });
    return best ?? null;
  }

  async getTodaySummary(userId: number): Promise<{
    pointsToday: number;
    breakdown: Array<{ taskId: number; title: string; type: string; points: number; isCorrect: boolean }>;
  }> {
    const today = getHcmToday();
    const { start, end } = getHcmDayUtcRange(today);
    const submissions = await this.prisma.submission.findMany({
      where: { userId, createdAt: { gte: start, lt: end } },
      select: { taskId: true, points: true, isCorrect: true, task: { select: { title: true, type: true } } },
    });
    const bestByTask = new Map<number, number>();
    for (const s of submissions) {
      const prev = bestByTask.get(s.taskId);
      if (prev === undefined || s.points > prev) bestByTask.set(s.taskId, s.points);
    }
    const pointsToday = [...bestByTask.values()].reduce((sum, p) => sum + p, 0);
    const breakdown = [...bestByTask.entries()].map(([taskId, bestPoints]) => {
      const s = submissions.find((sub) => sub.taskId === taskId)!;
      return { taskId, title: s.task.title, type: s.task.type, points: bestPoints, isCorrect: bestPoints > 0 };
    });
    return { pointsToday, breakdown };
  }

  async getTodaySubmissions(userId: number) {
    const today = getHcmToday();
    const { start, end } = getHcmDayUtcRange(today);
    const attempted = await this.prisma.submission.findMany({
      where: { userId, createdAt: { gte: start, lt: end } },
      select: { taskId: true },
      distinct: ['taskId'],
    });
    const best = await Promise.all(
      attempted.map(({ taskId }) => this.resolveScore(userId, taskId, today)),
    );
    return best
      .filter((s): s is NonNullable<typeof s> => s !== null)
      .map((s) => ({ taskId: s.taskId, isCorrect: s.isCorrect, points: s.points }));
  }
}
