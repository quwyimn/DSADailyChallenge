import type { ChallengeStrategy, GradeResult } from '../challenge.interface';

interface BubbleSortConfig {
  array: number[];
  stepsToPredict: number;
}

interface BubbleSortStep {
  array: number[];
  swapped: boolean;
  i: number;
  j: number;
}

function computeBubbleSortSteps(arr: number[], steps: number): BubbleSortStep[] {
  const result: BubbleSortStep[] = [];
  const a = [...arr];
  const n = a.length;

  outer: for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - 1 - i; j++) {
      const swapped = a[j] > a[j + 1];
      if (swapped) [a[j], a[j + 1]] = [a[j + 1], a[j]];
      result.push({ array: [...a], swapped, i, j });
      if (result.length >= steps) break outer;
    }
  }

  return result;
}

export const bubbleSortStrategy: ChallengeStrategy = {
  generateConfig() {
    const len = 5 + Math.floor(Math.random() * 3); // 5–7 elements
    const array = Array.from({ length: len }, () => Math.floor(Math.random() * 20) + 1);
    return { array, stepsToPredict: 3 } satisfies BubbleSortConfig;
  },

  validateConfig(config) {
    if (typeof config !== 'object' || config === null || Array.isArray(config)) return false;
    const c = config as Record<string, unknown>;
    return (
      Array.isArray(c['array']) &&
      (c['array'] as unknown[]).length > 0 &&
      (c['array'] as unknown[]).every((v) => typeof v === 'number' && Number.isFinite(v)) &&
      typeof c['stepsToPredict'] === 'number' &&
      Number.isInteger(c['stepsToPredict']) &&
      (c['stepsToPredict'] as number) >= 1
    );
  },

  computeAnswer(config) {
    const { array, stepsToPredict } = config as unknown as BubbleSortConfig;
    return computeBubbleSortSteps(array, stepsToPredict);
  },

  validate(config, submission) {
    const correct = this.computeAnswer(config) as BubbleSortStep[];
    const sub = submission as BubbleSortStep[];
    if (!Array.isArray(sub) || sub.length !== correct.length) return false;
    return correct.every((step, idx) => {
      const s = sub[idx];
      return (
        s?.swapped === step.swapped &&
        Array.isArray(s?.array) &&
        s.array.every((v: number, i: number) => v === step.array[i])
      );
    });
  },

  // actions: [{ step: number; didSwap: boolean }] — user predicts whether each comparison swaps.
  // config.points defaults to 10 if not set.
  grade(config, actions): GradeResult {
    const { array, stepsToPredict } = config as unknown as BubbleSortConfig;
    const configPoints = (config as { points?: unknown })['points'];
    const maxPoints = typeof configPoints === 'number' ? configPoints : 10;

    const correctSteps = computeBubbleSortSteps(array, stepsToPredict);
    const userActions = actions as { step: number; didSwap: boolean }[];

    if (!Array.isArray(userActions) || userActions.length !== correctSteps.length) {
      return { isCorrect: false, points: 0, correctAnswer: correctSteps };
    }

    // Each prediction is correct iff the user's didSwap matches the actual swap at that step
    const isCorrect = correctSteps.every(
      (step, idx) => typeof userActions[idx]?.didSwap === 'boolean' && userActions[idx].didSwap === step.swapped,
    );

    return { isCorrect, points: isCorrect ? maxPoints : 0, correctAnswer: correctSteps };
  },
};
