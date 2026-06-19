'use client';

import { useEffect } from 'react';

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface Props {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  action?: ToastAction;
  onDismiss: (id: string) => void;
  duration?: number; // ms, 0 = never auto-dismiss
}

const styles = {
  success: 'bg-emerald-500 border-emerald-600',
  error: 'bg-red-500 border-red-600',
  info: 'bg-blue-500 border-blue-600',
  warning: 'bg-amber-500 border-amber-600',
};

const icons = {
  success: '✓',
  error: '⚠',
  info: 'ℹ',
  warning: '⚠',
};

export function Toast({ id, message, type, action, onDismiss, duration = 4000 }: Props) {
  useEffect(() => {
    if (duration === 0 || action) return;
    const timer = setTimeout(() => onDismiss(id), duration);
    return () => clearTimeout(timer);
  }, [id, duration, action, onDismiss]);

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-white shadow-lg border ${styles[type]} min-w-[280px] max-w-sm`}
      role="alert"
    >
      <span className="text-lg leading-none">{icons[type]}</span>
      <p className="flex-1 text-sm font-medium">{message}</p>
      {action && (
        <button
          onClick={() => {
            action.onClick();
            onDismiss(id);
          }}
          className="text-sm font-bold underline underline-offset-2 hover:no-underline flex-shrink-0"
        >
          {action.label}
        </button>
      )}
      <button
        onClick={() => onDismiss(id)}
        className="flex-shrink-0 text-white/70 hover:text-white transition-colors"
        aria-label="Dismiss"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

/** Container that stacks toasts in bottom-right */
export function ToastContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 items-end">
      {children}
    </div>
  );
}
