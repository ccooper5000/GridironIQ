import React, { createContext, useContext, useState, useCallback } from 'react';

type Toast = { id: number; msg: string };

const ToastCtx = createContext<{ push: (m: string) => void } | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((msg: string) => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, msg }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000);
  }, []);

  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="fixed bottom-4 right-4 space-y-2 z-[9999]">
        {toasts.map(t => (
          <div
            key={t.id}
            className="bg-slate-900 text-white px-4 py-2 rounded shadow-lg max-w-sm"
            role="status"
            aria-live="polite"
          >
            {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
};
