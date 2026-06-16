import type { ChallengeStrategy, GradeResult } from '../challenge.interface';

type LinkedListOperation =
  | 'delete_head'
  | 'delete_tail'
  | 'delete_at'
  | 'delete_middle'
  | 'insert_head'
  | 'insert_tail'
  | 'insert_at'
  | 'reverse';

interface LinkedListConfig {
  nodes: number[];
  operation: LinkedListOperation;
  targetIndex?: number;
  insertValue?: number;
  points?: number;
}

const OPERATIONS: LinkedListOperation[] = [
  'delete_head',
  'delete_tail',
  'delete_at',
  'delete_middle',
  'insert_head',
  'insert_tail',
  'insert_at',
  'reverse',
];

const INSERT_OPS = new Set<LinkedListOperation>(['insert_head', 'insert_tail', 'insert_at']);
const TARGET_INDEX_OPS = new Set<LinkedListOperation>(['delete_at', 'insert_at']);

// Applies config.operation to config.nodes and returns the resulting node order.
function applyOperation(config: LinkedListConfig): number[] {
  const { nodes, operation, targetIndex, insertValue } = config;
  const result = [...nodes];

  switch (operation) {
    case 'delete_head':
      result.shift();
      break;
    case 'delete_tail':
      result.pop();
      break;
    case 'delete_at':
      result.splice(targetIndex as number, 1);
      break;
    case 'delete_middle':
      result.splice(Math.floor(result.length / 2), 1);
      break;
    case 'insert_head':
      result.unshift(insertValue as number);
      break;
    case 'insert_tail':
      result.push(insertValue as number);
      break;
    case 'insert_at':
      result.splice(targetIndex as number, 0, insertValue as number);
      break;
    case 'reverse':
      result.reverse();
      break;
  }

  return result;
}

export const linkedListStrategy: ChallengeStrategy = {
  generateConfig() {
    const len = 3 + Math.floor(Math.random() * 4); // 3–6 nodes
    const nodes = Array.from({ length: len }, () => Math.floor(Math.random() * 90) + 10);
    const operation = OPERATIONS[Math.floor(Math.random() * OPERATIONS.length)];

    const config: LinkedListConfig = { nodes, operation, points: 10 };
    if (TARGET_INDEX_OPS.has(operation)) {
      const maxIndex = operation === 'insert_at' ? len : len - 1;
      config.targetIndex = Math.floor(Math.random() * (maxIndex + 1));
    }
    if (INSERT_OPS.has(operation)) {
      config.insertValue = Math.floor(Math.random() * 90) + 10;
    }

    return config as unknown as Record<string, unknown>;
  },

  validateConfig(config) {
    if (typeof config !== 'object' || config === null || Array.isArray(config)) return false;
    const c = config as Record<string, unknown>;

    const nodes = c['nodes'];
    if (
      !Array.isArray(nodes) ||
      nodes.length === 0 ||
      !nodes.every((v) => typeof v === 'number' && Number.isFinite(v))
    ) {
      return false;
    }

    const operation = c['operation'];
    if (typeof operation !== 'string' || !OPERATIONS.includes(operation as LinkedListOperation)) {
      return false;
    }
    const op = operation as LinkedListOperation;

    if (INSERT_OPS.has(op) && typeof c['insertValue'] !== 'number') {
      return false;
    }

    if (TARGET_INDEX_OPS.has(op)) {
      const targetIndex = c['targetIndex'];
      if (typeof targetIndex !== 'number' || !Number.isInteger(targetIndex)) return false;
      const maxIndex = op === 'insert_at' ? nodes.length : nodes.length - 1;
      if (targetIndex < 0 || targetIndex > maxIndex) return false;
    }

    return true;
  },

  computeAnswer(config) {
    return applyOperation(config as unknown as LinkedListConfig);
  },

  validate(config, submission) {
    const correct = this.computeAnswer(config) as number[];
    const sub = submission as number[];
    if (!Array.isArray(sub) || sub.length !== correct.length) return false;
    return correct.every((v, i) => v === sub[i]);
  },

  // actions: [{ result: number[] }] — user submits their predicted final node order as one action.
  // config.points defaults to 10 if not set.
  grade(config, actions): GradeResult {
    const configPoints = (config as { points?: unknown })['points'];
    const maxPoints = typeof configPoints === 'number' ? configPoints : 10;
    const correctAnswer = this.computeAnswer(config) as number[];

    const userActions = Array.isArray(actions) ? (actions as { result?: unknown }[]) : [];
    const result = userActions[0]?.result;

    const isCorrect =
      Array.isArray(result) &&
      result.length === correctAnswer.length &&
      result.every((v: unknown, i: number) => v === correctAnswer[i]);

    return { isCorrect, points: isCorrect ? maxPoints : 0, correctAnswer };
  },
};
