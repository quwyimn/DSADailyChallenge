import type { ChallengeStrategy, GradeResult } from '../challenge.interface';

interface BinarySearchConfig {
  array: number[];
  target: number;
  targetExists: boolean;
  points?: number;
}

type Eliminated = 'left' | 'right' | 'none';

interface BinarySearchStep {
  low: number;
  high: number;
  mid: number;
  value: number;
  found: boolean;
  eliminated: Eliminated;
}

// Simulates the standard iterative binary search over config.array for config.target.
// Returns one step per comparison, stopping as soon as the target is found or low > high.
function computeBinarySearchSteps(array: number[], target: number): BinarySearchStep[] {
  const steps: BinarySearchStep[] = [];
  let low = 0;
  let high = array.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const value = array[mid];

    if (value === target) {
      steps.push({ low, high, mid, value, found: true, eliminated: 'none' });
      break;
    }

    if (value < target) {
      steps.push({ low, high, mid, value, found: false, eliminated: 'left' });
      low = mid + 1;
    } else {
      steps.push({ low, high, mid, value, found: false, eliminated: 'right' });
      high = mid - 1;
    }
  }

  return steps;
}

// Worked example (from the task spec):
//   array = [1, 3, 5, 7, 9, 11, 13], target = 7
//   step 1: low=0, high=6, mid=3, value=7 -> found
//   mid sequence = [3], found at index 3
//
// A non-found example for the same array, target = 7 but searching for 11 instead:
//   array = [1, 3, 5, 7, 9, 11, 13], target = 11
//   step 1: low=0, high=6, mid=3, value=7  -> 7 < 11, eliminate left, low=4
//   step 2: low=4, high=6, mid=5, value=11 -> found
//   mid sequence = [3, 5], found at index 5
//
// The task spec's "[3, 5, 4]" example corresponds to an absent target where the
// final mid (4) is checked and low > high afterwards, e.g. target = 10 on the
// same array:
//   step 1: low=0, high=6, mid=3, value=7  -> 7 < 10, eliminate left, low=4
//   step 2: low=4, high=6, mid=5, value=11 -> 11 > 10, eliminate right, high=4
//   step 3: low=4, high=4, mid=4, value=9  -> 9 < 10, eliminate left, low=5 (low > high, stop)
//   mid sequence = [3, 5, 4], not found

export const binarySearchStrategy: ChallengeStrategy = {
  generateConfig() {
    const len = 5 + Math.floor(Math.random() * 11); // 5–15 elements

    // Generate `len` unique numbers in 1-99, sorted ascending.
    const pool = new Set<number>();
    while (pool.size < len) {
      pool.add(Math.floor(Math.random() * 99) + 1);
    }
    const array = Array.from(pool).sort((a, b) => a - b);

    const targetExists = Math.random() < 0.7;
    let target: number;
    if (targetExists) {
      target = array[Math.floor(Math.random() * array.length)];
    } else {
      do {
        target = Math.floor(Math.random() * 99) + 1;
      } while (array.includes(target));
    }

    return { array, target, targetExists, points: 10 } satisfies BinarySearchConfig;
  },

  validateConfig(config) {
    if (typeof config !== 'object' || config === null || Array.isArray(config)) return false;
    const c = config as Record<string, unknown>;

    const array = c['array'];
    if (
      !Array.isArray(array) ||
      array.length === 0 ||
      !array.every((v) => typeof v === 'number' && Number.isFinite(v))
    ) {
      return false;
    }
    for (let i = 1; i < array.length; i++) {
      if (array[i] <= array[i - 1]) return false; // must be strictly ascending (sorted, no duplicates)
    }

    if (typeof c['target'] !== 'number' || !Number.isFinite(c['target'])) return false;
    if (typeof c['targetExists'] !== 'boolean') return false;

    return true;
  },

  computeAnswer(config) {
    const { array, target } = config as unknown as BinarySearchConfig;
    return computeBinarySearchSteps(array, target);
  },

  validate(config, submission) {
    const correct = this.computeAnswer(config) as BinarySearchStep[];
    const sub = submission as BinarySearchStep[];
    if (!Array.isArray(sub) || sub.length !== correct.length) return false;
    return correct.every((step, idx) => {
      const s = sub[idx];
      return (
        s?.mid === step.mid &&
        s?.found === step.found &&
        s?.eliminated === step.eliminated &&
        s?.low === step.low &&
        s?.high === step.high
      );
    });
  },

  // actions: [{ mid: number }] — user submits the sequence of mid indices they
  // predict binary search will visit. config.points defaults to 10 if not set.
  grade(config, actions): GradeResult {
    const { array, target } = config as unknown as BinarySearchConfig;
    const configPoints = (config as { points?: unknown })['points'];
    const maxPoints = typeof configPoints === 'number' ? configPoints : 10;

    const correctSteps = computeBinarySearchSteps(array, target);
    const userActions = actions as { mid: number }[];

    const isCorrect =
      Array.isArray(userActions) &&
      userActions.length === correctSteps.length &&
      correctSteps.every((step, idx) => userActions[idx]?.mid === step.mid);

    return { isCorrect, points: isCorrect ? maxPoints : 0, correctAnswer: correctSteps };
  },
};
