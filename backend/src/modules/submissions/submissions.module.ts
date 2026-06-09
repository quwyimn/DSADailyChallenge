import { Module } from '@nestjs/common';
import { SubmissionsService } from './submissions.service';
import { SubmissionsController } from './submissions.controller';
import { StreakModule } from '../streak/streak.module';
import { BadgeModule } from '../badges/badge.module';

// ChallengeRegistryService is available via the global ChallengesModule in app.module.ts

@Module({
  imports: [StreakModule, BadgeModule],
  controllers: [SubmissionsController],
  providers: [SubmissionsService],
})
export class SubmissionsModule {}
