import { useState, useCallback, useRef } from 'react';
import { parseApiError } from '../services/errorHandler';

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseApiReturn<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  // Run any async function; stores it so retry() can replay it
  execute: (fn: () => Promise<T>) => Promise<T | null>;
  // Re-run the most recent execute call
  retry: () => void;
  clearError: () => void;
}

export function useApi<T>(): UseApiReturn<T> {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const lastFn = useRef<(() => Promise<T>) | null>(null);

  const execute = useCallback(async (fn: () => Promise<T>): Promise<T | null> => {
    lastFn.current = fn;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await fn();
      setState({ data, loading: false, error: null });
      return data;
    } catch (err) {
      const { message } = parseApiError(err);
      setState((s) => ({ ...s, loading: false, error: message }));
      return null;
    }
  }, []);

  const retry = useCallback(() => {
    if (lastFn.current) execute(lastFn.current);
  }, [execute]);

  const clearError = useCallback(() => {
    setState((s) => ({ ...s, error: null }));
  }, []);

  return { ...state, execute, retry, clearError };
}
