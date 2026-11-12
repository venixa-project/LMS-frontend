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
        background: 'rgba(5, 8, 22, 0.85)',
        backdropFilter: 'blur(8px)',
        animation: 'fadeIn 0.15s ease-out',
      }}
      onClick={onCancel}
    >
      <div
        className="modal-card"
        style={{
          maxWidth: '460px',
          width: '100%',
          background: '#0B0B2A',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: isDestructive
            ? '0 25px 60px rgba(0, 0, 0, 0.85), 0 0 35px rgba(225, 29, 72, 0.25)'
            : '0 25px 60px rgba(0, 0, 0, 0.85), 0 0 35px rgba(84, 71, 255, 0.25)',
          animation: 'scaleUp 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Banner matching the user's exact popup aesthetic */}
        <div
          style={{
            background: isDestructive
              ? 'linear-gradient(135deg, #E11D48 0%, #DB2777 50%, #EC4899 100%)'
              : 'linear-gradient(135deg, #2563EB 0%, #5447FF 50%, #EC4899 100%)',
            padding: '18px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: '1.15rem',
              fontWeight: 800,
              color: '#FFFFFF',
              letterSpacing: '-0.2px',
            }}
          >
            {title}
          </h3>
          <button
            type="button"
            onClick={onCancel}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.85)',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
            }}
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body with dark background */}
        <div style={{ padding: '24px 24px 20px', background: '#0B0B2A' }}>
          <p
            style={{
              margin: 0,
              fontSize: '0.94rem',
              lineHeight: 1.6,
              color: '#F1F5F9',
              fontWeight: 500,
            }}
          >
            {message}
          </p>

          {/* Action Buttons matching the user's screenshot */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              marginTop: '26px',
            }}
          >
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onCancel}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                color: '#FFFFFF',
                borderRadius: '8px',
                padding: '9px 24px',
                fontSize: '0.88rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
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
                background: isDestructive
                  ? '#E11D48'
                  : 'linear-gradient(135deg, #2563EB 0%, #5447FF 50%, #EC4899 100%)',
                border: 'none',
                color: '#FFFFFF',
                borderRadius: '8px',
                padding: '9px 24px',
                fontSize: '0.88rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: isDestructive
                  ? '0 4px 14px rgba(225, 29, 72, 0.4)'
                  : '0 4px 14px rgba(84, 71, 255, 0.4)',
                transition: 'all 0.2s ease',
              }}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

