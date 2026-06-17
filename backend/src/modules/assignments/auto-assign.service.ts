import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const WEEKLY_SCHEDULE: Record<number, [string, string]> = {
  1: ['bubble_sort', 'stack_ops'],
  2: ['linked_list', 'queue_ops'],
  3: ['binary_search', 'bubble_sort'],
  4: ['stack_ops', 'linked_list'],
  5: ['queue_ops', 'binary_search'],
  6: ['bubble_sort', 'linked_list'],
  0: ['binary_search', 'stack_ops'],
};

const DIFFICULTIES = ['easy', 'medium', 'hard'];

@Injectable()
export class AutoAssignService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureTodayAssigned(date: Date): Promise<void> {
    const hcmDate = new Date(date.getTime() + 7 * 60 * 60 * 1000);
    const dow = hcmDate.getUTCDay();
    const types = WEEKLY_SCHEDULE[dow];
    if (!types) return;

    const dateStr = hcmDate.toISOString().slice(0, 10);
    const seed = dateStr.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);

    // Check if we already have exactly the right assignments for today
    const existing = await this.prisma.dailyAssignment.findMany({
      where: { date },
      include: { task: { select: { type: true } } },
    });

    const existingTypes = existing.map((a) => a.task.type);
    const hasAllCorrect =
      types.every((t) => existingTypes.includes(t)) &&
      existing.length === 6 &&
      existing.every((a) => types.includes(a.task.type));

    if (hasAllCorrect) return;

    // Remove any assignments that don't belong to today's schedule
    const wrongIds = existing
      .filter((a) => !types.includes(a.task.type))
      .map((a) => a.id);
    if (wrongIds.length > 0) {
      await this.prisma.dailyAssignment.deleteMany({ where: { id: { in: wrongIds } } });
    }

    // Pick one task per type x difficulty and insert missing ones
    const existingTaskIds = new Set(existing.filter((a) => types.includes(a.task.type)).map((a) => a.taskId));
    const toCreate: { taskId: number; date: Date }[] = [];

    for (const type of types) {
      for (const difficulty of DIFFICULTIES) {
        const tasks = await this.prisma.task.findMany({
          where: { type, difficulty },
          orderBy: { id: 'asc' },
          select: { id: true },
        });
        if (tasks.length === 0) continue;
        const picked = tasks[seed % tasks.length];
        if (!existingTaskIds.has(picked.id)) {
          toCreate.push({ taskId: picked.id, date });
        }
      }
    }

    if (toCreate.length > 0) {
      await this.prisma.dailyAssignment.createMany({ data: toCreate, skipDuplicates: true });
    }
  }
}
