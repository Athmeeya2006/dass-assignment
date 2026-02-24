import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

const ToastCtx = createContext(null);

const ICONS = {
  success: <CheckCircle size={16} className="text-success shrink-0" />,
  error:   <XCircle   size={16} className="text-error   shrink-0" />,
  info:    <Info      size={16} className="text-accent-tertiary shrink-0" />,
};

const ACCENT_COLORS = {
  success: 'border-l-success',
  error:   'border-l-error',
  info:    'border-l-accent-tertiary',
};

const PROGRESS_COLORS = {
  success: 'bg-success',
  error:   'bg-error',
  info:    'bg-accent-tertiary',
};

let _id = 0;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const remove = useCallback((id) => {
    clearTimeout(timers.current[id]);
    setToasts(t => t.filter(x => x.id !== id));
  }, []);

  const toast = useCallback((message, type = 'info', duration = 3500) => {
    const id = ++_id;
    setToasts(t => [...t.slice(-4), { id, message, type, duration }]);
    timers.current[id] = setTimeout(() => remove(id), duration);
    return id;
  }, [remove]);

  return (
    <ToastCtx.Provider value={{ toast, success: (m) => toast(m, 'success'), error: (m) => toast(m, 'error'), info: (m) => toast(m, 'info') }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 items-end pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`
              relative overflow-hidden
              flex items-start gap-3 px-4 py-3
              bg-surface border border-border border-l-[3px] ${ACCENT_COLORS[t.type]}
              min-w-[260px] max-w-sm pointer-events-auto animate-slide-in
              shadow-[0_8px_32px_rgba(0,0,0,0.5)]
            `}
          >
            {ICONS[t.type]}
            <span className="font-mono text-[12px] text-text-primary flex-1 leading-relaxed">{t.message}</span>
            <button onClick={() => remove(t.id)} className="text-text-muted hover:text-text-primary transition-colors shrink-0 mt-0.5">
              <X size={12} />
            </button>
            {/* Progress bar */}
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-border">
              <div
                className={`h-full ${PROGRESS_COLORS[t.type]} toast-progress`}
                style={{ animationDuration: `${t.duration}ms` }}
              />
            </div>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};
