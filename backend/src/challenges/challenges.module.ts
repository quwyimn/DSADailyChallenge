import { Global, Module } from '@nestjs/common';
import { ChallengeRegistryService } from './challenge-registry.service';

// @Global so ChallengeRegistryService is available in every module (daily, submissions, tasks)
// without each one needing to import ChallengesModule explicitly.
@Global()
@Module({
  providers: [ChallengeRegistryService],
  exports: [ChallengeRegistryService],
})
export class ChallengesModule {}
