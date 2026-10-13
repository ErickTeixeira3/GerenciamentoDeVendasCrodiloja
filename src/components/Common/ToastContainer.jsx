import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

// Sistema simples e desacoplado de eventos para disparar toasts de qualquer lugar
const listeners = new Set();

export const toast = {
  show: (message, type = 'info', duration = 4000) => {
    listeners.forEach((listener) => listener({ id: Date.now() + Math.random(), message, type, duration }));
  },
  success: (message, duration = 3500) => {
    toast.show(message, 'success', duration);
  },
  error: (message, duration = 4500) => {
    toast.show(message, 'error', duration);
  },
  warning: (message, duration = 4000) => {
    toast.show(message, 'warning', duration);
  },
  info: (message, duration = 3500) => {
    toast.show(message, 'info', duration);
  }
};

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handleAdd = (newToast) => {
      setToasts((prev) => [...prev, newToast]);

      if (newToast.duration > 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
        }, newToast.duration);
      }
    };

    listeners.add(handleAdd);
    return () => listeners.delete(handleAdd);
  }, []);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '18px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      width: '90%',
      maxWidth: '440px',
      pointerEvents: 'none'
    }}>
      {toasts.map((t) => {
        let bg = 'var(--bg-surface)';
        let borderColor = 'var(--border-strong)';
        let iconColor = 'var(--primary)';
        let Icon = Info;

        if (t.type === 'success') {
          bg = 'var(--bg-surface-elevated)';
          borderColor = 'rgba(34, 197, 94, 0.4)';
          iconColor = '#22c55e';
          Icon = CheckCircle2;
        } else if (t.type === 'error') {
          bg = 'var(--bg-surface-elevated)';
          borderColor = 'rgba(239, 68, 68, 0.45)';
          iconColor = 'var(--danger)';
          Icon = AlertCircle;
        } else if (t.type === 'warning') {
          bg = 'var(--bg-surface-elevated)';
          borderColor = 'rgba(245, 158, 11, 0.45)';
          iconColor = '#f59e0b';
          Icon = AlertTriangle;
        }

        return (
          <div
            key={t.id}
            style={{
              background: bg,
              color: 'var(--text-primary)',
              border: `1px solid ${borderColor}`,
              borderRadius: 'var(--radius-md)',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
              backdropFilter: 'blur(8px)',
              pointerEvents: 'auto',
              animation: 'toast-enter 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
              <Icon size={20} style={{ color: iconColor, flexShrink: 0 }} />
              <span style={{
                fontSize: '13px',
                fontWeight: 600,
                lineHeight: 1.35,
                color: 'var(--text-primary)',
                wordBreak: 'break-word'
              }}>
                {t.message}
              </span>
            </div>

            <button
              onClick={() => removeToast(t.id)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '4px'
              }}
              title="Fechar"
            >
              <X size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
