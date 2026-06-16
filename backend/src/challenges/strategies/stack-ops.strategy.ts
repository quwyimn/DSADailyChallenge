import type { ChallengeStrategy, GradeResult } from '../challenge.interface';

interface StackOp {
  op: 'push' | 'pop';
  value?: number;
}

interface StackOpsConfig {
  operations: StackOp[];
  stepsToPredict: number;
}

interface StackSnapshot {
  stack: number[];
  operation: StackOp;
}

function simulateStack(operations: StackOp[], steps: number): StackSnapshot[] {
  const result: StackSnapshot[] = [];
  const stack: number[] = [];

  for (const op of operations) {
    if (result.length >= steps) break;
    if (op.op === 'push' && op.value !== undefined) {
      stack.push(op.value);
    } else if (op.op === 'pop' && stack.length > 0) {
      stack.pop();
    }
    result.push({ stack: [...stack], operation: op });
  }

  return result;
}

export const stackOpsStrategy: ChallengeStrategy = {
  generateConfig() {
    const count = 4 + Math.floor(Math.random() * 3); // 4–6 operations
    const operations: StackOp[] = [];
    let stackSize = 0;

    for (let i = 0; i < count; i++) {
      // First 2 are always push to guarantee the stack is never empty for early pops
      const forcePush = i < 2;
      const canPop = !forcePush && stackSize > 0;
      const doPush = forcePush || !canPop || Math.random() < 0.55;

      if (doPush) {
        const value = Math.floor(Math.random() * 20) + 1;
        operations.push({ op: 'push', value });
        stackSize++;
      } else {
        operations.push({ op: 'pop' });
        stackSize--;
      }
    }

    return { operations, stepsToPredict: 3 } satisfies StackOpsConfig;
  },

  validateConfig(config) {
    if (typeof config !== 'object' || config === null || Array.isArray(config)) return false;
    const c = config as Record<string, unknown>;
    if (!Array.isArray(c['operations']) || (c['operations'] as unknown[]).length < 3) return false;
    if (typeof c['stepsToPredict'] !== 'number' || !Number.isInteger(c['stepsToPredict'] as number) || (c['stepsToPredict'] as number) < 1) return false;

    return (c['operations'] as unknown[]).every((op) => {
      if (typeof op !== 'object' || op === null) return false;
      const o = op as Record<string, unknown>;
      if (o['op'] !== 'push' && o['op'] !== 'pop') return false;
      if (o['op'] === 'push') return typeof o['value'] === 'number' && Number.isFinite(o['value'] as number);
      return true;
    });
  },

  computeAnswer(config) {
    const { operations, stepsToPredict } = config as unknown as StackOpsConfig;
    return simulateStack(operations, stepsToPredict);
  },

  validate(config, submission) {
    const correct = this.computeAnswer(config) as StackSnapshot[];
    const sub = submission as StackSnapshot[];
    if (!Array.isArray(sub) || sub.length !== correct.length) return false;
    return correct.every((snap, idx) => {
      const s = sub[idx];
      return (
        Array.isArray(s?.stack) &&
        s.stack.length === snap.stack.length &&
        s.stack.every((v: number, i: number) => v === snap.stack[i])
      );
    });
  },

  // actions: [{ step: number; stack: number[] }] — user predicts stack contents after each op.
  grade(config, actions): GradeResult {
    const { operations, stepsToPredict } = config as unknown as StackOpsConfig;
    const configPoints = (config as { points?: unknown })['points'];
    const maxPoints = typeof configPoints === 'number' ? configPoints : 10;

    const correctSteps = simulateStack(operations, stepsToPredict);
    const userActions = actions as { step: number; stack: number[] }[];

    if (!Array.isArray(userActions) || userActions.length !== correctSteps.length) {
      return { isCorrect: false, points: 0, correctAnswer: correctSteps };
    }

    const isCorrect = correctSteps.every((snap, idx) => {
      const ua = userActions[idx];
      return (
        Array.isArray(ua?.stack) &&
        ua.stack.length === snap.stack.length &&
        ua.stack.every((v: number, i: number) => v === snap.stack[i])
      );
    });

    return { isCorrect, points: isCorrect ? maxPoints : 0, correctAnswer: correctSteps };
  },
};
