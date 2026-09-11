'use client';

import { useCallback, useState } from 'react';

interface ToastItem { id: number; message: string; type?: 'success' | 'error'; }

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string, type?: 'success' | 'error') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const ToastHost = useCallback(() => (
    <div id="toast-container">
      {toasts.map((t) => <div key={t.id} className={`toast ${t.type ?? ''}`}>{t.message}</div>)}
    </div>
  ), [toasts]);

  return { toast, ToastHost };
}
