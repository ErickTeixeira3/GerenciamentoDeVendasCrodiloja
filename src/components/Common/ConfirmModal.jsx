import React, { useState, useEffect } from 'react';
import { AlertTriangle, HelpCircle, X } from 'lucide-react';

let openDialogHandler = null;

export const confirmDialog = (options) => {
  return new Promise((resolve) => {
    if (openDialogHandler) {
      openDialogHandler({
        isOpen: true,
        title: options.title || 'Confirmação',
        message: options.message || 'Tem certeza que deseja prosseguir?',
        confirmText: options.confirmText || 'Confirmar',
        cancelText: options.cancelText || 'Cancelar',
        danger: options.danger !== false,
        resolve
      });
    } else {
      console.warn('ConfirmModal não está montado.');
      resolve(false);
    }
  });
};

export default function ConfirmModal() {
  const [dialog, setDialog] = useState(null);

  useEffect(() => {
    openDialogHandler = setDialog;
    return () => {
      openDialogHandler = null;
    };
  }, []);

  // Fecha com ESC
  useEffect(() => {
    if (!dialog || !dialog.isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        dialog.resolve(false);
        setDialog(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dialog]);

  if (!dialog || !dialog.isOpen) return null;

  const handleConfirm = () => {
    dialog.resolve(true);
    setDialog(null);
  };

  const handleCancel = () => {
    dialog.resolve(false);
    setDialog(null);
  };

  return (
    <div 
      onClick={handleCancel}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.72)',
        backdropFilter: 'blur(4px)',
        zIndex: 9998,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-strong)',
          borderRadius: '20px',
          padding: '24px',
          maxWidth: '430px',
          width: '100%',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.35)',
          animation: 'toast-enter 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Header com ícone e fechar */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: 'var(--radius-md)',
              background: dialog.danger ? 'rgba(239, 68, 68, 0.15)' : 'rgba(56, 189, 248, 0.15)',
              color: dialog.danger ? 'var(--danger)' : 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              {dialog.danger ? <AlertTriangle size={22} /> : <HelpCircle size={22} />}
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, lineHeight: 1.25 }}>
              {dialog.title}
            </h3>
          </div>
          <button
            onClick={handleCancel}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Mensagem */}
        <p style={{
          color: 'var(--text-secondary)',
          fontSize: '14px',
          lineHeight: '1.5',
          margin: '0 0 22px 0',
          whiteSpace: 'pre-line'
        }}>
          {dialog.message}
        </p>

        {/* Botões de Ação */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            type="button"
            onClick={handleCancel}
            style={{
              background: 'var(--bg-surface-elevated)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-strong)',
              padding: '10px 16px',
              borderRadius: 'var(--radius-md)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            {dialog.cancelText}
          </button>
          <button
            type="button"
            autoFocus
            onClick={handleConfirm}
            style={{
              background: dialog.danger ? 'var(--danger)' : 'var(--primary)',
              color: '#fff',
              border: 'none',
              padding: '10px 20px',
              borderRadius: 'var(--radius-md)',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: dialog.danger 
                ? '0 4px 14px rgba(239, 68, 68, 0.35)' 
                : '0 4px 14px rgba(56, 189, 248, 0.35)'
            }}
          >
            {dialog.confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
