import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  ChallengeStrategy,
  registerStrategy,
  resolveStrategy,
  isKnownType,
  listTypes,
} from './challenge.registry';
import { bubbleSortStrategy } from './strategies/bubble-sort.strategy';

@Injectable()
export class ChallengeRegistryService implements OnModuleInit {
  // Registration happens here — not as side-effects in strategy files —
  // so it is explicit, testable, and happens in the NestJS lifecycle.
  onModuleInit(): void {
    registerStrategy('bubble_sort', bubbleSortStrategy);
  }

  isKnownType(type: string): boolean {
    return isKnownType(type);
  }

  resolve(type: string): ChallengeStrategy {
    return resolveStrategy(type);
  }

  listTypes(): string[] {
    return listTypes();
  }
}
