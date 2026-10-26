import React from 'react';
import { ProctoringSeverity } from '../../../types';
import {
  AlertTriangle, AlertCircle, Info, ShieldAlert,
  X, ArrowRight, RefreshCw
} from 'lucide-react';

export interface AlertNotification {
  id: string;
  title: string;
  message: string;
  severity: ProctoringSeverity;
  timestamp: string;
  actionLabel?: string;
  onAction?: () => void;
  recordedForReview?: boolean;
}

interface Props {
  alert: AlertNotification | null;
  onDismiss: () => void;
}

export const VeniGuardAlertToast: React.FC<Props> = ({ alert, onDismiss }) => {
  if (!alert) return null;

  const getSeverityStyles = (sev: ProctoringSeverity) => {
    switch (sev) {
      case 'critical':
        return {
          bg: '#151329',
          border: '1px solid rgba(239, 68, 68, 0.6)',
          iconColor: 'var(--danger)',
          badgeColor: 'badge-failed',
          badgeText: 'Critical Interruption',
        };
      case 'warning':
        return {
          bg: '#151329',
          border: '1px solid rgba(245, 158, 11, 0.6)',
          iconColor: 'var(--warning)',
          badgeColor: 'badge-warning',
          badgeText: 'Notice',
        };
      case 'review_required':
        return {
          bg: '#151329',
          border: '1px solid rgba(236, 72, 153, 0.6)',
          iconColor: '#EC4899',
          badgeColor: 'badge-primary',
          badgeText: 'Logged for Review',
        };
      case 'informational':
      default:
        return {
          bg: '#151329',
          border: '1px solid rgba(59, 130, 246, 0.5)',
          iconColor: '#3B82F6',
          badgeColor: 'badge-secondary',
          badgeText: 'Telemetry Info',
        };
    }
  };

  const style = getSeverityStyles(alert.severity);

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        maxWidth: '440px',
        width: 'calc(100% - 48px)',
        zIndex: 9999,
        background: style.bg,
        border: style.border,
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5), 0 0 20px rgba(84, 71, 255, 0.2)',
        padding: '16px 18px',
        animation: 'slideUp 0.3s ease-out',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {alert.severity === 'critical' ? (
            <AlertCircle size={20} color={style.iconColor} />
          ) : alert.severity === 'warning' ? (
            <AlertTriangle size={20} color={style.iconColor} />
          ) : (
            <Info size={20} color={style.iconColor} />
          )}
          <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-main)' }}>
            {alert.title}
          </span>
        </div>

        <button
          onClick={onDismiss}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '2px',
          }}
          aria-label="Dismiss alert"
        >
          <X size={16} />
        </button>
      </div>

      <p style={{ margin: '0 0 12px 0', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
        {alert.message}
      </p>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          <span className={`badge ${style.badgeColor}`} style={{ fontSize: '0.65rem' }}>
            {style.badgeText}
          </span>
          {alert.recordedForReview !== false && (
            <span>Event timestamped &bull; Human review eligible</span>
          )}
        </div>

        {alert.actionLabel && alert.onAction && (
          <button
            className="btn btn-primary btn-sm"
            onClick={() => {
              alert.onAction?.();
              onDismiss();
            }}
            style={{ fontSize: '0.75rem', padding: '4px 12px', gap: '6px' }}
          >
            <span>{alert.actionLabel}</span>
            <ArrowRight size={13} />
          </button>
        )}
      </div>
    </div>
  );
};
