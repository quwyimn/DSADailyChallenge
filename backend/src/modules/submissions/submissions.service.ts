import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ChallengeRegistryService } from '../../challenges/challenge-registry.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { getHcmToday, getHcmDayUtcRange } from '../../common/utils/hcm-date';

@Injectable()
export class SubmissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: ChallengeRegistryService,
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
    const strategy = this.registry.resolve(task.type);
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

    // 7. Return — correctAnswer is intentionally revealed here (post-submission only)
    return { id: submission.id, isCorrect, points, correctAnswer };
  }

  async getTodaySubmissions(userId: number) {
    const { start, end } = getHcmDayUtcRange(getHcmToday());
    return this.prisma.submission.findMany({
      where: { userId, createdAt: { gte: start, lt: end } },
      select: { taskId: true, isCorrect: true, points: true },
    });
  }
}
