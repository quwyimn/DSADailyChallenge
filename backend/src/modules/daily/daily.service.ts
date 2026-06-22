import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ChallengeRegistryService } from '../../challenges/challenge-registry.service';
import { getHcmToday, getHcmDayUtcRange } from '../../common/utils/hcm-date';
import { AutoAssignService } from '../assignments/auto-assign.service';

const DIFFICULTY_ORDER: Record<string, number> = { easy: 0, medium: 1, hard: 2 };

// Derives a display label from a snake_case challenge type,
// e.g. "binary_search" -> "Binary Search".
function toLabel(type: string): string {
  return type
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export interface DailyTaskView {
  id: number;
  title: string;
  type: string;
  config: Record<string, unknown>;
  difficulty: string;
  attemptsToday: number;
}

export interface DailySubjectView {
  type: string;
  label: string;
  tasks: DailyTaskView[];
}

@Injectable()
export class DailyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly challengeRegistry: ChallengeRegistryService,
    private readonly autoAssign: AutoAssignService,
  ) {}

  async getTodayTasks(userId: number): Promise<DailySubjectView[]> {
    const today = getHcmToday();
    await this.autoAssign.ensureTodayAssigned(today);

    const assignments = await this.prisma.dailyAssignment.findMany({
      where: { date: today },
      include: { task: true },
      orderBy: { id: 'asc' },
    });

    const taskIds = assignments.map((a) => a.taskId);
    const { start, end } = getHcmDayUtcRange(today);
    const counts = taskIds.length
      ? await this.prisma.submission.groupBy({
          by: ['taskId'],
          where: { userId, taskId: { in: taskIds }, createdAt: { gte: start, lt: end } },
          _count: { _all: true },
        })
      : [];
    const countByTask = new Map(counts.map((c) => [c.taskId, c._count._all]));

    // Group tasks by challenge type, preserving each subject's 3 tasks.
    const byType = new Map<string, DailyTaskView[]>();
    for (const { task } of assignments) {
      const view: DailyTaskView = {
        id: task.id,
        title: task.title,
        type: task.type,
        config: task.config as unknown as Record<string, unknown>,
        difficulty: task.difficulty ?? '',
        attemptsToday: countByTask.get(task.id) ?? 0,
      };
      const list = byType.get(task.type) ?? [];
      list.push(view);
      byType.set(task.type, list);
    }

    // Within each subject, order tasks easy -> medium -> hard.
    for (const tasks of byType.values()) {
      tasks.sort(
        (a, b) => (DIFFICULTY_ORDER[a.difficulty] ?? 99) - (DIFFICULTY_ORDER[b.difficulty] ?? 99),
      );
    }

    // Order subjects by the registry's type order (stable, e.g.
    // bubble_sort, linked_list, binary_search).
    return this.challengeRegistry
      .listTypes()
      .filter((type) => byType.has(type))
      .map((type) => ({ type, label: toLabel(type), tasks: byType.get(type) as DailyTaskView[] }));
  }
}
