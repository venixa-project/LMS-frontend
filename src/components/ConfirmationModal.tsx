import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

export interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  icon?: 'trash' | 'warning';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  isDestructive = true,
  icon = 'warning',
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      style={{
        zIndex: 9999,
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        background: 'rgba(5, 8, 16, 0.75)',
        backdropFilter: 'blur(6px)',
        animation: 'fadeIn 0.15s ease-out',
      }}
      onClick={onCancel}
    >
      <div
        className="card"
        style={{
          maxWidth: '460px',
          width: '100%',
          padding: '24px',
          background: 'var(--bg-surface, #111827)',
          border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))',
          borderRadius: '16px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
          animation: 'scaleUp 0.18s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '16px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: isDestructive ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
              border: isDestructive ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)',
              color: isDestructive ? 'var(--danger, #ef4444)' : 'var(--warning, #f59e0b)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {icon === 'trash' || isDestructive ? <Trash2 size={22} /> : <AlertTriangle size={22} />}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ fontSize: '1.1rem', margin: '0 0 6px', fontWeight: 800, color: 'var(--text-main, #f8fafc)' }}>
              {title}
            </h3>
            <p style={{ margin: 0, fontSize: '0.875rem', lineHeight: 1.5, color: 'var(--text-secondary, #94a3b8)' }}>
              {message}
            </p>
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="btn btn-secondary btn-sm"
            style={{
              padding: '6px',
              borderRadius: '8px',
              color: 'var(--text-muted)',
              lineHeight: 1,
            }}
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
            borderTop: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
            paddingTop: '16px',
            marginTop: '8px',
          }}
        >
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
            style={{
              fontSize: '0.875rem',
              fontWeight: 600,
              padding: '8px 18px',
              borderRadius: '8px',
            }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={isDestructive ? 'btn btn-danger' : 'btn btn-primary'}
            onClick={() => {
              onConfirm();
              onCancel();
            }}
            style={{
              fontSize: '0.875rem',
              fontWeight: 700,
              padding: '8px 20px',
              borderRadius: '8px',
              background: isDestructive ? 'var(--danger, #ef4444)' : 'var(--primary, #3b82f6)',
              color: '#ffffff',
              boxShadow: isDestructive ? '0 2px 10px rgba(239, 68, 68, 0.35)' : '0 2px 10px rgba(59, 130, 246, 0.35)',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

