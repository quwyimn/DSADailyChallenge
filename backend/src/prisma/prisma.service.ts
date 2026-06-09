import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const isDev = process.env['NODE_ENV'] !== 'production';

@Injectable()
export class PrismaService
  extends PrismaClient<Prisma.PrismaClientOptions, 'warn' | 'error'>
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const dbUrl = process.env['DATABASE_URL'];
    if (!dbUrl) throw new Error('DATABASE_URL is not set');

    const adapter = new PrismaPg(dbUrl);
    super({
      adapter,
      log: isDev
        ? [
            { emit: 'event', level: 'warn' },
            { emit: 'event', level: 'error' },
          ]
        : [
            { emit: 'event', level: 'warn' },
            { emit: 'event', level: 'error' },
          ],
    });
  }

  async onModuleInit() {
    this.$on('warn', (e: Prisma.LogEvent) => this.logger.warn(e.message));
    this.$on('error', (e: Prisma.LogEvent) => this.logger.error(e.message));

    await this.$connect();
    this.logger.log('Database connected');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
