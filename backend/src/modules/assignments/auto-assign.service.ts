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

  /**
   * Idempotently fills in today's 2 scheduled topics (one task per
   * difficulty each = up to 6 rows) in `daily_assignments`, without ever
   * deleting or duplicating existing rows.
   *
   * `date` must already be a GMT+7 calendar-day marker — UTC midnight whose
   * Y-M-D equals the target HCM date (see `getHcmToday()`). Callers must not
   * pass a raw "now" timestamp; this function does no timezone shifting of
   * its own, so its weekday/date math stays consistent with every other
   * caller of `daily_assignments` (DailyService, AssignmentsService).
   *
   * Only ever ADDS rows for (type, difficulty) slots that are completely
   * empty. A slot already filled by ANY task — whether previously
   * auto-assigned or manually assigned by an admin — is left untouched, and
   * non-scheduled-type assignments (e.g. an admin's 3rd-topic override) are
   * never removed. Manual admin assignments always take priority.
   */
  async ensureTodayAssigned(date: Date): Promise<void> {
    const dow = date.getUTCDay();
    const types = WEEKLY_SCHEDULE[dow];
    if (!types) return;

    const dateStr = date.toISOString().slice(0, 10);
    const seed = dateStr.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);

    const existing = await this.prisma.dailyAssignment.findMany({
      where: { date },
      include: { task: { select: { type: true, difficulty: true } } },
    });
    const filledSlots = new Set(existing.map((a) => `${a.task.type}:${a.task.difficulty}`));

    const toCreate: { taskId: number; date: Date }[] = [];
    for (const type of types) {
      for (const difficulty of DIFFICULTIES) {
        if (filledSlots.has(`${type}:${difficulty}`)) continue;

        const tasks = await this.prisma.task.findMany({
          where: { type, difficulty },
          orderBy: { id: 'asc' },
          select: { id: true },
        });
        if (tasks.length === 0) continue;

        const picked = tasks[seed % tasks.length];
        toCreate.push({ taskId: picked.id, date });
      }
    }

    if (toCreate.length > 0) {
      await this.prisma.dailyAssignment.createMany({ data: toCreate, skipDuplicates: true });
    }
  }
}
