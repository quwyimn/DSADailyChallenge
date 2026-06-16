import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  ChallengeStrategy,
  registerStrategy,
  resolveStrategy,
  isKnownType,
  listTypes,
} from './challenge.registry';
import { bubbleSortStrategy } from './strategies/bubble-sort.strategy';
import { linkedListStrategy } from './strategies/linked-list.strategy';
import { binarySearchStrategy } from './strategies/binary-search.strategy';

@Injectable()
export class ChallengeRegistryService implements OnModuleInit {
  // Registration happens here — not as side-effects in strategy files —
  // so it is explicit, testable, and happens in the NestJS lifecycle.
  onModuleInit(): void {
    registerStrategy('bubble_sort', bubbleSortStrategy);
    registerStrategy('linked_list', linkedListStrategy);
    registerStrategy('binary_search', binarySearchStrategy);
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
