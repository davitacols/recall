import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircleIcon, XCircleIcon, InformationCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const ToastContext = createContext();

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', options = {}) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type, ...options }]);
    if (!options.persistent) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 4000);
    }
  }, []);

  const success = useCallback((message) => addToast(message, 'success'), [addToast]);
  const error = useCallback((message) => addToast(message, 'error'), [addToast]);
  const info = useCallback((message) => addToast(message, 'info'), [addToast]);
  const warning = useCallback((message) => addToast(message, 'warning'), [addToast]);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const confirm = useCallback((message, onConfirm) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type: 'confirm', onConfirm, persistent: true }]);
  }, []);

  const icons = {
    success: CheckCircleIcon,
    error: XCircleIcon,
    info: InformationCircleIcon,
    warning: ExclamationTriangleIcon
  };

  const colors = {
    success: 'bg-green-600 text-white border-green-600',
    error: 'bg-red-600 text-white border-red-600',
    info: 'bg-blue-600 text-white border-blue-600',
    warning: 'bg-yellow-600 text-white border-yellow-600'
  };

  return (
    <ToastContext.Provider value={{ addToast, success, error, info, warning, confirm }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map(toast => {
          if (toast.type === 'confirm') {
            return (
              <div
                key={toast.id}
                className="px-4 py-3 rounded-lg shadow-lg border min-w-[320px] animate-slideIn bg-gray-800 text-white border-gray-700"
              >
                <p className="font-medium mb-3">{toast.message}</p>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => removeToast(toast.id)}
                    className="px-3 py-1.5 text-sm border border-gray-600 rounded hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      toast.onConfirm();
                      removeToast(toast.id);
                    }}
                    className="px-3 py-1.5 text-sm bg-red-600 border border-red-600 rounded hover:bg-red-700 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          }
          const Icon = icons[toast.type];
          return (
            <div
              key={toast.id}
              className={`px-4 py-3 rounded-lg shadow-lg border min-w-[320px] animate-slideIn flex items-center gap-3 ${colors[toast.type]}`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="flex-1 font-medium">{toast.message}</span>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-current hover:opacity-70 flex-shrink-0"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}
