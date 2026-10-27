import React from 'react';
import {
  PauseCircle, AlertOctagon, RefreshCw, CheckCircle2,
  Monitor, Wifi, Maximize, ShieldAlert, LifeBuoy
} from 'lucide-react';

interface Props {
  reasonTitle: string;
  reasonMessage: string;
  isScreenNeeded: boolean;
  isScreenActive: boolean;
  isNetActive: boolean;
  isFullscreenNeeded: boolean;
  isFullscreenActive: boolean;
  isRecovering: boolean;
  onRetryScreenShare: () => void;
  onRetryFullscreen: () => void;
  onRetryConnection: () => void;
  onResumeExam: () => void;
  answeredCount: number;
  totalQuestions: number;
}

export const VeniGuardPauseOverlay: React.FC<Props> = ({
  reasonTitle,
  reasonMessage,
  isScreenNeeded,
  isScreenActive,
  isNetActive,
  isFullscreenNeeded,
  isFullscreenActive,
  isRecovering,
  onRetryScreenShare,
  onRetryFullscreen,
  onRetryConnection,
  onResumeExam,
  answeredCount,
  totalQuestions,
}) => {
  const canResume =
    (!isScreenNeeded || isScreenActive) &&
    isNetActive &&
    (!isFullscreenNeeded || isFullscreenActive) &&
    !isRecovering;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 8, 22, 0.94)',
        backdropFilter: 'blur(8px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        className="card"
        style={{
          maxWidth: '560px',
          width: '100%',
          padding: '32px',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7), 0 0 30px rgba(239, 68, 68, 0.15)',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '20px',
            background: 'rgba(239, 68, 68, 0.15)',
            color: 'var(--danger)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
          }}
        >
          <PauseCircle size={36} />
        </div>

        <span className="badge badge-failed" style={{ marginBottom: '12px', fontSize: '0.75rem' }}>
          Exam Session Paused
        </span>

        <h2 style={{ fontSize: '1.4rem', marginBottom: '8px', fontWeight: 800 }}>
          {reasonTitle}
        </h2>

        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '20px' }}>
          {reasonMessage}
        </p>

        {/* Answers Preserved Assurance Pill */}
        <div
          style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 16px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontSize: '0.82rem',
            color: 'var(--success)',
            fontWeight: 600,
          }}
        >
          <CheckCircle2 size={16} />
          <span>
            Your progress is safe: {answeredCount} of {totalQuestions} answers preserved in memory and store.
          </span>
        </div>

        {/* Action Checklist to recover */}
        <div
          style={{
            background: 'var(--bg-input)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            marginBottom: '24px',
            textAlign: 'left',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
            Required steps to resume examination:
          </div>

          {/* Screen Check */}
          {isScreenNeeded && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem' }}>
                <Monitor size={16} color={isScreenActive ? 'var(--success)' : 'var(--danger)'} />
                <span>Screen Sharing Stream</span>
              </div>
              {isScreenActive ? (
                <span className="badge badge-active">Active</span>
              ) : (
                <button className="btn btn-primary btn-sm" onClick={onRetryScreenShare} style={{ fontSize: '0.75rem' }}>
                  Restore Screen Share
                </button>
              )}
            </div>
          )}

          {/* Network Check */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem' }}>
              <Wifi size={16} color={isNetActive ? 'var(--success)' : 'var(--danger)'} />
              <span>Internet Connection</span>
            </div>
            {isNetActive ? (
              <span className="badge badge-active">Connected</span>
            ) : (
              <button className="btn btn-secondary btn-sm" onClick={onRetryConnection} style={{ fontSize: '0.75rem' }}>
                <RefreshCw size={12} /> Test Sync
              </button>
            )}
          </div>

          {/* Fullscreen Check */}
          {isFullscreenNeeded && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem' }}>
                <Maximize size={16} color={isFullscreenActive ? 'var(--success)' : 'var(--warning)'} />
                <span>Full-Screen Focus</span>
              </div>
              {isFullscreenActive ? (
                <span className="badge badge-active">Active</span>
              ) : (
                <button className="btn btn-secondary btn-sm" onClick={onRetryFullscreen} style={{ fontSize: '0.75rem' }}>
                  Re-enter Full-Screen
                </button>
              )}
            </div>
          )}
        </div>

        {/* Resume Button */}
        <button
          className="btn btn-primary btn-lg"
          disabled={!canResume}
          onClick={onResumeExam}
          style={{
            width: '100%',
            fontWeight: 800,
            background: canResume ? 'linear-gradient(135deg, #2563EB 0%, #5447FF 50%, #EC4899 100%)' : undefined,
          }}
        >
          {canResume ? 'Prerequisites Verified &bull; Resume Assessment' : 'Awaiting Required Re-verification...'}
        </button>

        <p style={{ marginTop: '14px', marginBottom: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Policy Rule: Technical interruptions are recorded with timestamps for fair human instructor review.
        </p>
      </div>
    </div>
  );
};
