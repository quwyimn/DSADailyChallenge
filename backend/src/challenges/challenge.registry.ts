import type { ChallengeStrategy } from './challenge.interface';

export type { ChallengeStrategy };

const registry = new Map<string, ChallengeStrategy>();

export function registerStrategy(type: string, strategy: ChallengeStrategy): void {
  registry.set(type, strategy);
}

export function resolveStrategy(type: string): ChallengeStrategy {
  const strategy = registry.get(type);
  if (!strategy) throw new Error(`Unknown challenge type: "${type}"`);
  return strategy;
}

export function isKnownType(type: string): boolean {
  return registry.has(type);
}

export function listTypes(): string[] {
  return [...registry.keys()];
}
