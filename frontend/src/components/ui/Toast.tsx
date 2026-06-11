import React from 'react';
import { useUIStore } from '../../store/uiStore.js';
import { X, CheckCircle, AlertTriangle, Info } from 'lucide-react';

export const ToastNotification: React.FC = () => {
  const { toasts, removeToast } = useUIStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-start justify-between p-4 rounded-lg shadow-xl border glass-panel transition-all duration-300 animate-slide-in ${
            t.type === 'success'
              ? 'border-muted-green-600 bg-muted-green-50 text-muted-green-800'
              : t.type === 'error'
              ? 'border-film-red/50 bg-red-50 text-film-red'
              : 'border-vintage-gold/50 bg-vintage-sepia-100 text-vintage-sepia-900'
          }`}
        >
          <div className="flex gap-3">
            <span className="mt-0.5">
              {t.type === 'success' && <CheckCircle size={18} />}
              {t.type === 'error' && <AlertTriangle size={18} />}
              {t.type === 'info' && <Info size={18} />}
            </span>
            <p className="text-sm font-medium">{t.message}</p>
          </div>
          <button
            onClick={() => removeToast(t.id)}
            className="text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
};
