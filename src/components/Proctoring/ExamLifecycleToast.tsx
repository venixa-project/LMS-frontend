import React, { useEffect } from 'react';
import { Play, CheckCircle2, X, Clock, Award, ShieldCheck, User, LogOut, AlertTriangle, Send, UserX, Eye } from 'lucide-react';

export interface ExamLifecycleToastData {
  id: string;
  type: 'start' | 'end' | 'violation';
  studentId: string;
  studentName: string;
  rollNo?: string;
  assessmentTitle?: string;
  assessmentId?: string;
  timestamp: string;
  reason?: string;
  violationType?: string;
  severity?: 'warning' | 'critical' | 'informational';
  evidenceSnapshot?: string;
  onSendWarning?: () => void;
  onStopExam?: () => void;
  onInspect?: () => void;
}

interface ExamLifecycleToastProps {
  toasts: ExamLifecycleToastData[];
  onDismiss: (id: string) => void;
  autoDismissMs?: number;
}

export const ExamLifecycleToast: React.FC<ExamLifecycleToastProps> = ({
  toasts,
  onDismiss,
  autoDismissMs = 12000,
}) => {
  useEffect(() => {
    if (toasts.length === 0) return;
    const latestToast = toasts[toasts.length - 1];
    // Violation toasts stay visible longer (18 seconds) so the proctor has ample time to react
    const timeout = latestToast.type === 'violation' ? 18000 : autoDismissMs;
    const timer = setTimeout(() => {
      onDismiss(latestToast.id);
    }, timeout);
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
        maxWidth: '460px',
        width: 'calc(100vw - 48px)',
        pointerEvents: 'none',
      }}
    >
      {toasts.map((toast) => {
        const isStart = toast.type === 'start';
        const isViolation = toast.type === 'violation';
        const formattedTime = new Date(toast.timestamp).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });

        const bgGradient = isViolation
          ? 'linear-gradient(135deg, rgba(88, 28, 28, 0.98) 0%, rgba(15, 23, 42, 0.98) 100%)'
          : isStart
          ? 'linear-gradient(135deg, rgba(6, 78, 59, 0.96) 0%, rgba(15, 23, 42, 0.98) 100%)'
          : 'linear-gradient(135deg, rgba(49, 46, 129, 0.96) 0%, rgba(15, 23, 42, 0.98) 100%)';

        const borderColor = isViolation
          ? 'rgba(239, 68, 68, 0.85)'
          : isStart
          ? 'rgba(16, 185, 129, 0.55)'
          : 'rgba(129, 140, 248, 0.55)';

        const boxShadow = isViolation
          ? '0 12px 38px -4px rgba(239, 68, 68, 0.5), 0 0 0 1px rgba(239, 68, 68, 0.3)'
          : isStart
          ? '0 12px 36px -4px rgba(16, 185, 129, 0.4), 0 0 0 1px rgba(16, 185, 129, 0.2)'
          : '0 12px 36px -4px rgba(99, 102, 241, 0.4), 0 0 0 1px rgba(129, 140, 248, 0.2)';

        return (
          <div
            key={toast.id}
            role="status"
            aria-live="polite"
            style={{
              pointerEvents: 'auto',
              background: bgGradient,
              border: `1px solid ${borderColor}`,
              borderRadius: '12px',
              padding: '16px',
              color: '#FFFFFF',
              boxShadow,
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
                    background: isViolation
                      ? 'rgba(239, 68, 68, 0.25)'
                      : isStart
                      ? 'rgba(16, 185, 129, 0.2)'
                      : 'rgba(129, 140, 248, 0.2)',
                    border: isViolation
                      ? '1px solid rgba(248, 113, 113, 0.8)'
                      : isStart
                      ? '1px solid rgba(52, 211, 153, 0.6)'
                      : '1px solid rgba(165, 180, 252, 0.6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isViolation ? '#f87171' : isStart ? '#34d399' : '#a5b4fc',
                    flexShrink: 0,
                  }}
                >
                  {isViolation ? <AlertTriangle size={18} /> : isStart ? <Play size={16} fill="currentColor" /> : <CheckCircle2 size={18} />}
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        color: isViolation ? '#f87171' : isStart ? '#34d399' : '#a5b4fc',
                      }}
                    >
                      {isViolation ? 'AI Proctoring Detection Alert' : isStart ? 'Candidate Started Exam' : 'Candidate Ended Exam'}
                    </span>
                    <span
                      style={{
                        display: 'inline-block',
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        backgroundColor: isViolation ? '#ef4444' : isStart ? '#10b981' : '#818cf8',
                        boxShadow: isViolation ? '0 0 10px #ef4444' : isStart ? '0 0 8px #10b981' : '0 0 8px #818cf8',
                        animation: isViolation ? 'pulse 1.2s infinite' : undefined,
                      }}
                    />
                  </div>
                  <div style={{ fontSize: '0.72rem', color: isViolation ? '#fca5a5' : '#94a3b8' }}>
                    {isViolation ? 'Integrity violation flagged by AI telemetry' : isStart ? 'Writing proctored examination' : 'Removed from live wall grid'}
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
                background: 'rgba(0, 0, 0, 0.45)',
                border: isViolation ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '8px',
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                {toast.evidenceSnapshot ? (
                  <img
                    src={toast.evidenceSnapshot}
                    alt="Evidence Snapshot"
                    style={{
                      width: '44px',
                      height: '34px',
                      objectFit: 'cover',
                      borderRadius: '4px',
                      border: '1px solid rgba(239, 68, 68, 0.6)',
                      flexShrink: 0,
                    }}
                  />
                ) : (
                  <User size={16} style={{ color: '#94a3b8', flexShrink: 0 }} />
                )}
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
                  fontWeight: 800,
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: isViolation ? 'rgba(239, 68, 68, 0.25)' : isStart ? 'rgba(16, 185, 129, 0.2)' : 'rgba(99, 102, 241, 0.2)',
                  color: isViolation ? '#f87171' : isStart ? '#34d399' : '#a5b4fc',
                  border: isViolation ? '1px solid rgba(239, 68, 68, 0.5)' : isStart ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(99, 102, 241, 0.4)',
                  whiteSpace: 'nowrap',
                }}
              >
                {isViolation ? '⚠️ Flagged Violation' : isStart ? '● Writing Exam' : '✓ Finalized'}
              </span>
            </div>

            {/* Violation Description Banner */}
            {isViolation && toast.reason && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.12)',
                  borderLeft: '3px solid #ef4444',
                  padding: '8px 10px',
                  borderRadius: '4px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: '#fee2e2',
                  lineHeight: 1.35,
                }}
              >
                {toast.reason}
              </div>
            )}

            {/* QUICK ACTIONS FOR PROCTOR / TRAINER (ONLY FOR VIOLATIONS) */}
            {isViolation && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: toast.onInspect ? '1.2fr 1.2fr 0.8fr' : '1fr 1fr',
                  gap: '8px',
                  marginTop: '4px',
                  paddingTop: '6px',
                }}
              >
                {toast.onSendWarning && (
                  <button
                    type="button"
                    onClick={() => {
                      toast.onSendWarning?.();
                      onDismiss(toast.id);
                    }}
                    style={{
                      background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)',
                      border: '1px solid rgba(255, 255, 255, 0.25)',
                      borderRadius: '6px',
                      color: '#ffffff',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      padding: '7px 8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(59, 130, 246, 0.35)',
                    }}
                  >
                    <Send size={13} /> Send Warning Popup
                  </button>
                )}

                {toast.onStopExam && (
                  <button
                    type="button"
                    onClick={() => {
                      toast.onStopExam?.();
                      onDismiss(toast.id);
                    }}
                    style={{
                      background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                      border: '1px solid rgba(255, 255, 255, 0.25)',
                      borderRadius: '6px',
                      color: '#ffffff',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      padding: '7px 8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(220, 38, 38, 0.35)',
                    }}
                  >
                    <UserX size={13} /> Stop & Submit Exam
                  </button>
                )}

                {toast.onInspect && (
                  <button
                    type="button"
                    onClick={() => {
                      toast.onInspect?.();
                      onDismiss(toast.id);
                    }}
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '6px',
                      color: '#e2e8f0',
                      fontSize: '0.74rem',
                      fontWeight: 600,
                      padding: '7px 6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    <Eye size={13} /> View
                  </button>
                )}
              </div>
            )}

            {/* Reason / Subtitle if ending */}
            {!isStart && !isViolation && toast.reason && (
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
