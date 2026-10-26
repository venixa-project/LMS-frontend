import React from 'react';
import { useOrganisation } from '../context/OrganisationContext';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useOrganisation();

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        maxWidth: '420px',
        pointerEvents: 'none',
      }}
    >
      {toasts.map((toast) => {
        const Icon =
          toast.type === 'success'
            ? CheckCircle2
            : toast.type === 'warning'
            ? AlertTriangle
            : toast.type === 'error'
            ? AlertCircle
            : Info;

        const iconColor =
          toast.type === 'success'
            ? '#059669'
            : toast.type === 'warning'
            ? '#d97706'
            : toast.type === 'error'
            ? '#dc2626'
            : '#2563eb';

        const borderColor =
          toast.type === 'success'
            ? '#a7f3d0'
            : toast.type === 'warning'
            ? '#fde68a'
            : toast.type === 'error'
            ? '#fecaca'
            : '#bfdbfe';

        const bgColor =
          toast.type === 'success'
            ? '#f0fdf4'
            : toast.type === 'warning'
            ? '#fffbeb'
            : toast.type === 'error'
            ? '#fef2f2'
            : '#eff6ff';

        return (
          <div
            key={toast.id}
            style={{
              pointerEvents: 'auto',
              background: bgColor,
              border: `1px solid ${borderColor}`,
              borderRadius: '12px',
              padding: '12px 16px',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Icon size={18} color={iconColor} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>
                {toast.message}
              </span>
            </div>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '2px',
              }}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
