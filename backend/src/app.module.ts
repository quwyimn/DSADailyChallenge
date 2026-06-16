import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ClassesModule } from './modules/classes/classes.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { DailyModule } from './modules/daily/daily.module';
import { AssignmentsModule } from './modules/assignments/assignments.module';
import { SubmissionsModule } from './modules/submissions/submissions.module';
import { StreakModule } from './modules/streak/streak.module';
import { BadgeModule } from './modules/badges/badge.module';
import { LeaderboardModule } from './modules/leaderboard/leaderboard.module';
import { StatsModule } from './modules/stats/stats.module';
import { RotationModule } from './modules/rotation/rotation.module';
import { ChallengesModule } from './challenges/challenges.module';
import { HealthModule } from './health/health.module';

const REQUIRED_VARS = ['DATABASE_URL', 'JWT_SECRET'];

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: `.env.${process.env['NODE_ENV'] ?? 'development'}`,
      isGlobal: true,
      cache: true,
      validate(config: Record<string, unknown>) {
        for (const key of REQUIRED_VARS) {
          if (!config[key])
            throw new Error(`Missing required environment variable: ${key}`);
        }
        return config;
      },
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    PrismaModule,
    ChallengesModule,
    HealthModule,
    AuthModule,
    UsersModule,
    ClassesModule,
    TasksModule,
    DailyModule,
    AssignmentsModule,
    SubmissionsModule,
    StreakModule,
    BadgeModule,
    LeaderboardModule,
    StatsModule,
    RotationModule,
  ],
})
export class AppModule {}
