import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';

// ChallengeRegistryService is available via the global ChallengesModule in app.module.ts

@Module({
  controllers: [TasksController],
  providers: [TasksService],
})
export class TasksModule {}
