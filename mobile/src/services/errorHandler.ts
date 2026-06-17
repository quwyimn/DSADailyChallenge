import { AxiosError } from 'axios';

export interface ApiError {
  message: string;
  statusCode?: number;
}

// Parse an unknown thrown value into a user-readable message + status code.
// 401 auto-logout is handled at the axios interceptor level (see api.ts),
// so this function is a pure message extractor with no side-effects.
export function parseApiError(error: unknown): ApiError {
  if (error instanceof AxiosError) {
    const status = error.response?.status;
    if (status === 401) {
      return { message: 'Session expired. Please log in again.', statusCode: 401 };
    }
    const data = error.response?.data as { message?: unknown } | undefined;
    const msg = extractMessage(data?.message) ?? error.message;
    return { message: msg, statusCode: status };
  }
  if (error instanceof Error) {
    return { message: error.message };
  }
  return { message: 'An unexpected error occurred.' };
}

// NestJS's built-in HttpExceptions (e.g. ConflictException('foo')) serialize
// to { statusCode, message: 'foo', error: 'Conflict' }, and GlobalExceptionFilter
// nests that whole object as the response body's `message` field. Unwrap that
// nesting so callers always get a plain string, never an object.
function extractMessage(raw: unknown): string | undefined {
  if (typeof raw === 'string') return raw;
  if (Array.isArray(raw)) return raw.map(String).join(', ');
  if (raw && typeof raw === 'object' && 'message' in raw) {
    return extractMessage((raw as { message?: unknown }).message);
  }
  return undefined;
}
