export interface GradeResult {
  isCorrect: boolean;
  points: number;
  // The correct answer — returned to the user only after they submit, never before.
  correctAnswer: unknown;
}

export interface ChallengeStrategy {
  // Returns a config object for a new challenge — never includes the answer.
  generateConfig(): Record<string, unknown>;

  // Returns true when the given config has the correct shape for this strategy.
  // Called at task-creation/update time so bad configs are rejected early.
  validateConfig(config: unknown): boolean;

  // Computes the correct answer from config (server-side only, never sent to client).
  computeAnswer(config: Record<string, unknown>): unknown;

  // Returns true when the submission matches the correct answer.
  validate(config: Record<string, unknown>, submission: unknown): boolean;

  // Grades user actions against the correct answer. Returns isCorrect, points, and
  // the correct answer (to be revealed to the user after submission).
  grade(config: Record<string, unknown>, actions: unknown): GradeResult;
}
