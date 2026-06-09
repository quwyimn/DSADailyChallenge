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
}
