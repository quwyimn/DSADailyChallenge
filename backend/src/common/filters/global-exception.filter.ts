import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

// Prisma error codes we translate to HTTP statuses
const PRISMA_UNIQUE_VIOLATION = 'P2002';
const PRISMA_NOT_FOUND = 'P2025';

interface PrismaClientError {
  code: string;
  meta?: Record<string, unknown>;
  message: string;
}

function isPrismaError(e: unknown): e is PrismaClientError {
  return (
    typeof e === 'object' &&
    e !== null &&
    'code' in e &&
    typeof (e as PrismaClientError).code === 'string'
  );
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const { status, message } = this.resolve(exception);

    if (status >= 500) {
      const stack = exception instanceof Error ? exception.stack : String(exception);
      this.logger.error(`${req.method} ${req.url} → ${status}: ${message}`, stack);
    } else {
      this.logger.warn(`${req.method} ${req.url} → ${status}: ${JSON.stringify(message)}`);
    }

    res.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: req.url,
      message,
    });
  }

  private resolve(exception: unknown): { status: number; message: unknown } {
    if (exception instanceof HttpException) {
      return {
        status: exception.getStatus(),
        message: exception.getResponse(),
      };
    }

    if (isPrismaError(exception)) {
      if (exception.code === PRISMA_UNIQUE_VIOLATION) {
        const field = (exception.meta?.['target'] as string[] | undefined)?.join(', ') ?? 'field';
        return { status: HttpStatus.CONFLICT, message: `Duplicate value for: ${field}` };
      }
      if (exception.code === PRISMA_NOT_FOUND) {
        return { status: HttpStatus.NOT_FOUND, message: 'Record not found' };
      }
    }

    return { status: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Internal server error' };
  }
}
