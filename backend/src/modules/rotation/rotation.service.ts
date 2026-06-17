import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ChallengeRegistryService } from '../../challenges/challenge-registry.service';
import { getHcmToday } from '../../common/utils/hcm-date';

const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;

@Injectable()
export class RotationService implements OnModuleInit {
  private readonly logger = new Logger(RotationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly challengeRegistry: ChallengeRegistryService,
  ) {}

  // Self-healing: if the app was down at 00:00 GMT+7, today's assignments
  // get created as soon as it comes back up.
  async onModuleInit() {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await this.ensureTodayAssignments();
  }

  // 17:00 UTC = 00:00 GMT+7 (Asia/Ho_Chi_Minh, UTC+7, no DST).
  @Cron('0 17 * * *', { name: 'ensure-daily-assignments', timeZone: 'UTC' })
  async handleDailyRotation(): Promise<void> {
    await this.ensureTodayAssignments();
  }

  /**
   * Idempotently ensures today's (GMT+7) daily_assignments exist: one task per
   * (challenge type × difficulty) — e.g. 3 types × easy/medium/hard = 9 tasks —
   * each picked via a no-repeat-until-exhausted rotation scoped to that
   * (type, difficulty) pair.
   *
   * No-op if today already has the full expected set. If a partial set is found
   * (e.g. leftover rows from old code that only created 1 per type), wipes them
   * and regenerates from scratch so users always get 3 tasks per subject.
   */
  async ensureTodayAssignments(date: Date = getHcmToday()): Promise<void> {
    const today = date;
    const dateStr = today.toISOString().slice(0, 10);

    const types = this.challengeRegistry.listTypes();
    const expectedCount = types.length * DIFFICULTIES.length;

    const existing = await this.prisma.dailyAssignment.count({
      where: { date: today },
    });

    if (existing >= expectedCount) {
      this.logger.debug(
        `Daily assignments for ${dateStr} already complete (${existing}) — skipping`,
      );
      return;
    }

    if (existing > 0) {
      this.logger.warn(
        `Partial daily assignments for ${dateStr} (${existing}/${expectedCount}) — wiping and regenerating`,
      );
      await this.prisma.dailyAssignment.deleteMany({ where: { date: today } });
    }

    // Rotation reads (findMany + findUnique) and the rotation-cursor upsert run
    // outside the transaction — on Supabase's pooler, a cold connection made
    // these sequential per-(type, difficulty) round trips slow enough that
    // wrapping all of them in one $transaction blew past Prisma's timeout
    // (P2028). The transaction below now only does the actual inserts.
    const picks: { taskId: number; type: string; difficulty: string }[] = [];
    for (const type of types) {
      for (const difficulty of DIFFICULTIES) {
        const taskId = await this.pickNextTaskOutsideTx(type, difficulty);
        if (taskId === null) {
          this.logger.warn(
            `No tasks found with type "${type}" and difficulty "${difficulty}" — skipping`,
          );
          continue;
        }
        picks.push({ taskId, type, difficulty });
      }
    }

    const created: string[] = [];

    await this.prisma.$transaction(
      async (tx) => {
        for (const { taskId, type, difficulty } of picks) {
          await tx.dailyAssignment.upsert({
            where: { taskId_date: { taskId, date: today } },
            create: { taskId, date: today },
            update: {},
          });
          created.push(`${type}:${difficulty}:${taskId}`);
        }
      },
      { timeout: 30000 },
    );

    this.logger.log(
      `Created daily assignments for ${dateStr} (${created.join(', ')})`,
    );
  }

  // Picks the next task for a (type, difficulty) pair from its rotation,
  // advancing the cursor. Reshuffles and restarts from 0 once the rotation is
  // exhausted, or if the eligible task pool changed since the rotation was
  // last built (e.g. tasks were added/removed for that type+difficulty).
  //
  // Rotation rows are keyed by "type:difficulty" (e.g. "bubble_sort:easy"),
  // stored in TaskRotation.difficulty (still a plain unique String column —
  // no schema change, just a different string format for the key).
  private async pickNextTaskInTx(
    tx: Prisma.TransactionClient,
    type: string,
    difficulty: string,
  ): Promise<number | null> {
    const tasks = await tx.task.findMany({
      where: { type, difficulty },
      select: { id: true },
      orderBy: { id: 'asc' },
    });
    if (tasks.length === 0) return null;

    const taskIds = tasks.map((t) => t.id);
    const rotationKey = `${type}:${difficulty}`;
    const rotation = await tx.taskRotation.findUnique({
      where: { difficulty: rotationKey },
    });
    const storedOrder = rotation?.taskOrder as unknown as number[] | undefined;
    const storedCursor = rotation?.cursor ?? 0;

    let order: number[];
    let cursor: number;
    if (
      storedOrder &&
      Array.isArray(storedOrder) &&
      storedOrder.length > 0 &&
      storedCursor < storedOrder.length &&
      sameTaskSet(storedOrder, taskIds)
    ) {
      order = storedOrder;
      cursor = storedCursor;
    } else {
      order = shuffle(taskIds);
      cursor = 0;
    }

    const taskId = order[cursor];

    await tx.taskRotation.upsert({
      where: { difficulty: rotationKey },
      create: { difficulty: rotationKey, taskOrder: order, cursor: cursor + 1 },
      update: { taskOrder: order, cursor: cursor + 1 },
    });

    return taskId;
  }

  // Same rotation logic as pickNextTaskInTx, but reads/upserts via the plain
  // PrismaService client instead of a $transaction's tx client — see the
  // comment above the picks loop in ensureTodayAssignments for why.
  private async pickNextTaskOutsideTx(
    type: string,
    difficulty: string,
  ): Promise<number | null> {
    const tasks = await this.prisma.task.findMany({
      where: { type, difficulty },
      select: { id: true },
      orderBy: { id: 'asc' },
    });
    if (tasks.length === 0) return null;

    const taskIds = tasks.map((t) => t.id);
    const rotationKey = `${type}:${difficulty}`;
    const rotation = await this.prisma.taskRotation.findUnique({
      where: { difficulty: rotationKey },
    });
    const storedOrder = rotation?.taskOrder as unknown as number[] | undefined;
    const storedCursor = rotation?.cursor ?? 0;

    let order: number[];
    let cursor: number;
    if (
      storedOrder &&
      Array.isArray(storedOrder) &&
      storedOrder.length > 0 &&
      storedCursor < storedOrder.length &&
      sameTaskSet(storedOrder, taskIds)
    ) {
      order = storedOrder;
      cursor = storedCursor;
    } else {
      order = shuffle(taskIds);
      cursor = 0;
    }

    const taskId = order[cursor];

    await this.prisma.taskRotation.upsert({
      where: { difficulty: rotationKey },
      create: { difficulty: rotationKey, taskOrder: order, cursor: cursor + 1 },
      update: { taskOrder: order, cursor: cursor + 1 },
    });

    return taskId;
  }
}

// Fisher-Yates shuffle.
function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// True if both arrays contain exactly the same set of task IDs (order
// ignored). A stored rotation order is only reusable while the eligible
// task pool hasn't changed since it was built.
function sameTaskSet(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort((x, y) => x - y);
  const sortedB = [...b].sort((x, y) => x - y);
  return sortedA.every((v, i) => v === sortedB[i]);
}
