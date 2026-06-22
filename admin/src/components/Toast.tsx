import { useEffect, useState } from 'react';
import { subscribeToasts } from '../services/toast';
import type { ToastItem } from '../services/toast';

export function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => subscribeToasts(setItems), []);

  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[2000] flex w-[calc(100%-2rem)] max-w-[360px] flex-col gap-2 sm:w-auto">
      {items.map((t) => (
        <div
          key={t.id}
          className={`rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${
            t.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
