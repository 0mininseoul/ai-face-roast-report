"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

interface ToastValue {
  show: (message: string) => void;
}

const ToastContext = createContext<ToastValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);

  const show = useCallback((next: string) => {
    setMessage(next);
    window.setTimeout(() => setMessage(null), 2200);
  }, []);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {message && (
        <div className="fixed bottom-8 left-1/2 z-[90] -translate-x-1/2 rounded-md border border-border bg-bg-card px-4 py-3 text-sm text-text-primary shadow-panel">
          {message}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const value = useContext(ToastContext);
  if (!value) throw new Error("useToast must be used inside ToastProvider");
  return value;
}
