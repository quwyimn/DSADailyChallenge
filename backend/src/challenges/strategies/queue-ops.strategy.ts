import type { ChallengeStrategy, GradeResult } from '../challenge.interface';

interface QueueOp {
  op: 'enqueue' | 'dequeue';
  value?: number;
}

interface QueueOpsConfig {
  operations: QueueOp[];
  stepsToPredict: number;
}

interface QueueSnapshot {
  queue: number[];
  operation: QueueOp;
}

function simulateQueue(operations: QueueOp[], steps: number): QueueSnapshot[] {
  const result: QueueSnapshot[] = [];
  const queue: number[] = [];

  for (const op of operations) {
    if (result.length >= steps) break;
    if (op.op === 'enqueue' && op.value !== undefined) {
      queue.push(op.value); // FIFO: enqueue adds to back
    } else if (op.op === 'dequeue') {
      queue.shift(); // FIFO: dequeue removes from front
    }
    result.push({ queue: [...queue], operation: op });
  }

  return result;
}

export const queueOpsStrategy: ChallengeStrategy = {
  generateConfig() {
    const count = 4 + Math.floor(Math.random() * 3); // 4–6 ops
    const operations: QueueOp[] = [];
    let queueSize = 0;

    // First 2 must be enqueue so the queue is never empty for dequeue
    for (let i = 0; i < 2; i++) {
      operations.push({ op: 'enqueue', value: Math.floor(Math.random() * 20) + 1 });
      queueSize++;
    }

    for (let i = 2; i < count; i++) {
      const canDequeue = queueSize > 0;
      const op = canDequeue && Math.random() < 0.5 ? 'dequeue' : 'enqueue';
      if (op === 'enqueue') {
        operations.push({ op: 'enqueue', value: Math.floor(Math.random() * 20) + 1 });
        queueSize++;
      } else {
        operations.push({ op: 'dequeue' });
        queueSize--;
      }
    }

    return { operations, stepsToPredict: 3 } satisfies QueueOpsConfig;
  },

  validateConfig(config) {
    if (typeof config !== 'object' || config === null || Array.isArray(config)) return false;
    const c = config as Record<string, unknown>;
    if (!Array.isArray(c['operations']) || (c['operations'] as unknown[]).length < 1) return false;
    if (
      typeof c['stepsToPredict'] !== 'number' ||
      !Number.isInteger(c['stepsToPredict']) ||
      (c['stepsToPredict'] as number) < 1
    )
      return false;
    return (c['operations'] as unknown[]).every((op) => {
      if (typeof op !== 'object' || op === null) return false;
      const o = op as Record<string, unknown>;
      if (o['op'] !== 'enqueue' && o['op'] !== 'dequeue') return false;
      if (o['op'] === 'enqueue' && typeof o['value'] !== 'number') return false;
      return true;
    });
  },

  computeAnswer(config) {
    const { operations, stepsToPredict } = config as unknown as QueueOpsConfig;
    return simulateQueue(operations, stepsToPredict);
  },

  validate(config, submission) {
    const correct = this.computeAnswer(config) as QueueSnapshot[];
    const sub = submission as number[][];
    if (!Array.isArray(sub) || sub.length !== correct.length) return false;
    return correct.every((snapshot, idx) => {
      const predicted = sub[idx];
      if (!Array.isArray(predicted) || predicted.length !== snapshot.queue.length) return false;
      return predicted.every((v, i) => v === snapshot.queue[i]);
    });
  },

  grade(config, actions): GradeResult {
    const configPoints = (config as { points?: unknown })['points'];
    const maxPoints = typeof configPoints === 'number' ? configPoints : 10;

    const correct = this.computeAnswer(config) as QueueSnapshot[];
    const userActions = actions as number[][];

    if (!Array.isArray(userActions) || userActions.length !== correct.length) {
      return { isCorrect: false, points: 0, correctAnswer: correct };
    }

    const isCorrect = correct.every((snapshot, idx) => {
      const predicted = userActions[idx];
      if (!Array.isArray(predicted) || predicted.length !== snapshot.queue.length) return false;
      return predicted.every((v, i) => v === snapshot.queue[i]);
    });

    return { isCorrect, points: isCorrect ? maxPoints : 0, correctAnswer: correct };
  },
};
