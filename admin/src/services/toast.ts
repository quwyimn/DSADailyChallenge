export type ToastType = 'success' | 'error';

export interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

let toasts: ToastItem[] = [];
let listeners: ((items: ToastItem[]) => void)[] = [];
let nextId = 1;

function notify() {
  for (const listener of listeners) listener(toasts);
}

export function showToast(message: string, type: ToastType = 'success') {
  const id = nextId++;
  toasts = [...toasts, { id, message, type }];
  notify();
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    notify();
  }, 3000);
}

export function subscribeToasts(listener: (items: ToastItem[]) => void): () => void {
  listeners.push(listener);
  listener(toasts);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}
