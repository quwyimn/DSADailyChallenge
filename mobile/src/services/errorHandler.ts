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
    const data = error.response?.data as { message?: string | string[] } | undefined;
    const raw = data?.message;
    const msg = Array.isArray(raw) ? raw.join(', ') : (raw ?? error.message);
    return { message: msg, statusCode: status };
  }
  if (error instanceof Error) {
    return { message: error.message };
  }
  return { message: 'An unexpected error occurred.' };
}
