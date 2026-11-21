import React, { useEffect } from 'react';
import { Play, CheckCircle2, X, Clock, Award, ShieldCheck, User, LogOut } from 'lucide-react';

export interface ExamLifecycleToastData {
  id: string;
  type: 'start' | 'end';
  studentId: string;
  studentName: string;
  rollNo?: string;
  assessmentTitle?: string;
  assessmentId?: string;
  timestamp: string;
  reason?: string;
}

interface ExamLifecycleToastProps {
  toasts: ExamLifecycleToastData[];
  onDismiss: (id: string) => void;
  autoDismissMs?: number;
}

export const ExamLifecycleToast: React.FC<ExamLifecycleToastProps> = ({
  toasts,
  onDismiss,
  autoDismissMs = 7000,
}) => {
  useEffect(() => {
    if (toasts.length === 0) return;
    const latestToast = toasts[toasts.length - 1];
    const timer = setTimeout(() => {
      onDismiss(latestToast.id);
    }, autoDismissMs);
    return () => clearTimeout(timer);
  }, [toasts, onDismiss, autoDismissMs]);

  if (!toasts || toasts.length === 0) return null;

  return (
    <aside
      aria-label="Exam Notifications"
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column-reverse',
        gap: '12px',
        maxWidth: '430px',
        width: 'calc(100vw - 48px)',
        pointerEvents: 'none',
      }}
    >
      {toasts.map((toast) => {
        const isStart = toast.type === 'start';
        const formattedTime = new Date(toast.timestamp).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });

        return (
          <div
            key={toast.id}
            role="status"
            aria-live="polite"
            style={{
              pointerEvents: 'auto',
              background: isStart
                ? 'linear-gradient(135deg, rgba(6, 78, 59, 0.96) 0%, rgba(15, 23, 42, 0.98) 100%)'
                : 'linear-gradient(135deg, rgba(49, 46, 129, 0.96) 0%, rgba(15, 23, 42, 0.98) 100%)',
              border: isStart
                ? '1px solid rgba(16, 185, 129, 0.55)'
                : '1px solid rgba(129, 140, 248, 0.55)',
              borderRadius: '12px',
              padding: '16px',
              color: '#FFFFFF',
              boxShadow: isStart
                ? '0 12px 36px -4px rgba(16, 185, 129, 0.4), 0 0 0 1px rgba(16, 185, 129, 0.2)'
                : '0 12px 36px -4px rgba(99, 102, 241, 0.4), 0 0 0 1px rgba(129, 140, 248, 0.2)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              animation: 'slideInRight 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
              transition: 'all 0.3s ease',
            }}
          >
            {/* Top row: Icon + Status Pill + Close button */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    background: isStart
                      ? 'rgba(16, 185, 129, 0.2)'
                      : 'rgba(129, 140, 248, 0.2)',
                    border: isStart
                      ? '1px solid rgba(52, 211, 153, 0.6)'
                      : '1px solid rgba(165, 180, 252, 0.6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isStart ? '#34d399' : '#a5b4fc',
                    flexShrink: 0,
                  }}
                >
                  {isStart ? <Play size={16} fill="currentColor" /> : <CheckCircle2 size={18} />}
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        color: isStart ? '#34d399' : '#a5b4fc',
                      }}
                    >
                      {isStart ? 'Candidate Started Exam' : 'Candidate Ended Exam'}
                    </span>
                    <span
                      style={{
                        display: 'inline-block',
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        backgroundColor: isStart ? '#10b981' : '#818cf8',
                        boxShadow: isStart ? '0 0 8px #10b981' : '0 0 8px #818cf8',
                      }}
                    />
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                    {isStart ? 'Added to live proctoring wall' : 'Removed from live wall grid'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onDismiss(toast.id)}
                aria-label="Dismiss notification"
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#94a3b8',
                  padding: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                  e.currentTarget.style.color = '#ffffff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.color = '#94a3b8';
                }}
              >
                <X size={15} />
              </button>
            </div>

            {/* Candidate details row */}
            <div
              style={{
                background: 'rgba(0, 0, 0, 0.35)',
                borderRadius: '8px',
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                <User size={15} style={{ color: '#94a3b8', flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: '0.92rem',
                      color: '#ffffff',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {toast.studentName}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                    ID: {toast.rollNo || toast.studentId}
                  </div>
                </div>
              </div>

              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: isStart ? 'rgba(16, 185, 129, 0.2)' : 'rgba(99, 102, 241, 0.2)',
                  color: isStart ? '#34d399' : '#a5b4fc',
                  border: isStart ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(99, 102, 241, 0.4)',
                  whiteSpace: 'nowrap',
                }}
              >
                {isStart ? '● Writing Exam' : '✓ Finalized'}
              </span>
            </div>

            {/* Reason / Subtitle if ending */}
            {!isStart && toast.reason && (
              <div style={{ fontSize: '0.74rem', color: '#cbd5e1', lineHeight: 1.4, paddingLeft: '4px' }}>
                <span style={{ color: '#94a3b8' }}>Status:</span> {toast.reason}
              </div>
            )}

            {/* Footer with timestamp */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.7rem',
                color: '#64748b',
                paddingTop: '2px',
                borderTop: '1px solid rgba(255, 255, 255, 0.07)',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={12} /> {formattedTime}
              </span>
              <span>{toast.assessmentTitle ? toast.assessmentTitle.slice(0, 24) : 'Live Proctored Exam'}</span>
            </div>
          </div>
        );
      })}
    </aside>
  );
};
