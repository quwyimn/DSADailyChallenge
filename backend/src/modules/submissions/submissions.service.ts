import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ChallengeRegistryService } from '../../challenges/challenge-registry.service';
import { StreakService } from '../streak/streak.service';
import { BadgeService } from '../badges/badge.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { getHcmToday, getHcmDayUtcRange } from '../../common/utils/hcm-date';

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
    const task = await this.prisma.task.findUnique({ where: { id: dto.taskId } });
    if (!task) throw new NotFoundException('Task not found');

    // 2. Verify the task is assigned for today (Asia/Ho_Chi_Minh date)
    const today = getHcmToday();
    const assignment = await this.prisma.dailyAssignment.findFirst({
      where: { taskId: dto.taskId, date: today },
    });
    if (!assignment) {
      throw new BadRequestException('This task is not assigned for today');
    }

    // 3. One scored submission per (userId, taskId, HCM day)
    const { start, end } = getHcmDayUtcRange(today);
    const existing = await this.prisma.submission.findFirst({
      where: { userId, taskId: dto.taskId, createdAt: { gte: start, lt: end } },
    });
    if (existing) throw new ConflictException('Already submitted today');

    // 4 + 5. Grade via the strategy
    let strategy: ReturnType<typeof this.registry.resolve>;
    try {
      strategy = this.registry.resolve(task.type);
    } catch {
      throw new BadRequestException(`Challenge type '${task.type}' is not yet supported for submission`);
    }
    const config = task.config as Record<string, unknown>;
    const { isCorrect, points, correctAnswer } = strategy.grade(config, dto.actions);

    // 6. Persist (UTC timestamp set by Prisma default)
    const submission = await this.prisma.submission.create({
      data: {
        userId,
        taskId: dto.taskId,
        // unknown[] → InputJsonValue cast isolated here
        actions: dto.actions as unknown as Prisma.InputJsonValue,
        isCorrect,
        points,
      },
    });

    // 7. Update streak and award badges (fire-and-forget style — errors logged, not rethrown)
    const { current: streakCurrent } = await this.streak.checkAndUpdate(userId).catch((e: unknown) => {
      console.error('[StreakService] checkAndUpdate failed:', e);
      return { current: 0, longest: 0 };
    });
    await this.badge.checkAndAward(userId, streakCurrent).catch((e: unknown) => {
      console.error('[BadgeService] checkAndAward failed:', e);
    });

    return { id: submission.id, isCorrect, points };
  }

  async getTodaySubmissions(userId: number) {
    const { start, end } = getHcmDayUtcRange(getHcmToday());
    return this.prisma.submission.findMany({
      where: { userId, createdAt: { gte: start, lt: end } },
      select: { taskId: true, isCorrect: true, points: true },
    });
  }
}
