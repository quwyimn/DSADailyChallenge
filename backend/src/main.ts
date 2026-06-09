import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { RequestLoggingInterceptor } from './common/interceptors/request-logging.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, { logger: ['log', 'warn', 'error', 'debug'] });

  const config = app.get(ConfigService);
  const port = config.get<number>('PORT') ?? 3000;
  const nodeEnv = config.get<string>('NODE_ENV') ?? 'development';
  const corsOrigins = parseCorsOrigins(config.get<string>('CORS_ORIGINS'), nodeEnv);

  // Security headers — must come before enableCors so CORS headers are not stripped
  app.use(helmet());

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,          // strip unknown properties
      forbidNonWhitelisted: true,
      transform: true,          // auto-cast to DTO types
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new RequestLoggingInterceptor());

  app.setGlobalPrefix('api');

  await app.listen(port);
  logger.log(`Running in ${nodeEnv} mode on port ${port}`);
  logger.log(`CORS origins: ${JSON.stringify(corsOrigins)}`);
}

function parseCorsOrigins(raw: string | undefined, nodeEnv: string): string | string[] | boolean {
  if (nodeEnv !== 'production') return '*';
  if (!raw) return false;
  const origins = raw.split(',').map((o) => o.trim()).filter(Boolean);
  return origins.length === 1 ? origins[0] : origins;
}

bootstrap();
