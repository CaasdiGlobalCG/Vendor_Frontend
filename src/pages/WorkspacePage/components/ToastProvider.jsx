import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
};

let toastIdCounter = 0;

const ICONS = {
  success: <CheckCircle className="w-4 h-4 text-emerald-500" />,
  error: <AlertCircle className="w-4 h-4 text-red-500" />,
  info: <Info className="w-4 h-4 text-blue-500" />,
};

const STYLES = {
  success: 'border-emerald-200 bg-emerald-50',
  error: 'border-red-200 bg-red-50',
  info: 'border-blue-200 bg-blue-50',
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 3000, options = {}) => {
    const id = ++toastIdCounter;
    setToasts(prev => [...prev, { id, message, type, duration, ...options }]);
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback((message, type = 'info', duration = 3000, options = {}) => {
    return addToast(message, type, duration, options);
  }, [addToast]);

  toast.success = (msg, dur, options) => addToast(msg, 'success', dur, options);
  toast.error = (msg, dur, options) => addToast(msg, 'error', dur, options);
  toast.info = (msg, dur, options) => addToast(msg, 'info', dur, options);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-6 right-6 z-[200] flex flex-col-reverse gap-2 pointer-events-none" aria-live="polite">
        {toasts.map(t => (
          <Toast key={t.id} {...t} onDismiss={() => removeToast(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

const Toast = ({ id, message, type, duration, actionLabel, onAction, onDismiss }) => {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (duration <= 0) return;
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(onDismiss, 200);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  const handleDismiss = () => {
    setExiting(true);
    setTimeout(onDismiss, 200);
  };

  return (
    <div
      className={`pointer-events-auto flex items-center gap-2.5 px-4 py-2.5 rounded-lg border shadow-lg text-sm text-gray-800 transition-all duration-200 ${STYLES[type] || STYLES.info} ${exiting ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'}`}
      style={{ animation: exiting ? undefined : 'toast-in 0.2s ease-out' }}
      role="alert"
    >
      {ICONS[type] || ICONS.info}
      <span className="flex-1">{message}</span>
      {actionLabel && typeof onAction === 'function' && (
        <button
          onClick={() => {
            onAction();
            handleDismiss();
          }}
          className="px-2 py-0.5 text-xs font-medium rounded border border-gray-300 bg-white hover:bg-gray-50 transition-colors"
        >
          {actionLabel}
        </button>
      )}
      <button onClick={handleDismiss} className="p-0.5 text-gray-400 hover:text-gray-600 rounded transition-colors" aria-label="Dismiss">
        <X className="w-3.5 h-3.5" />
      </button>
      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateX(16px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};

export default ToastProvider;
