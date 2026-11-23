import React from 'react';
import {
  Radio, Square, Pause, Play, UploadCloud, AlertCircle, X,
  Video, CheckCircle2, Loader2, Sparkles, Volume2, VolumeX
} from 'lucide-react';
import { RecorderState } from '../../../lib/useScreenRecorder';

interface Props {
  state: RecorderState;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onCancel: () => void;
}

export const MeetingRecorderWidget: React.FC<Props> = ({
  state,
  onPause,
  onResume,
  onStop,
  onCancel,
}) => {
  if (!state.isRecording && !state.isUploading) return null;

  const formatDuration = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStopClick = () => {
    if (state.duration < 10) {
      const ok = window.confirm(
        `Notice: Your recording is only ${state.duration} second(s) long.\n\nIf you were still in the Google Meet lobby ("Getting ready..."), saving now will only record that preview screen.\n\nDo you want to save this short recording anyway? Click Cancel to keep recording.`
      );
      if (!ok) return;
    }
    onStop();
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        background: '#0f172a',
        border: '1.5px solid rgba(239, 68, 68, 0.4)',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6), 0 0 25px rgba(239, 68, 68, 0.25)',
        borderRadius: '14px',
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        animation: 'slideUp 0.3s ease-out',
        color: '#ffffff',
        backdropFilter: 'blur(12px)',
        maxWidth: '560px',
      }}
    >
      {/* Uploading State */}
      {state.isUploading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
          <Loader2 size={24} className="animate-spin" color="var(--primary)" />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-main)' }}>
              Saving & Archiving 480p Class Recording...
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Compiling 480p SD stream & persisting to cloud storage.
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Pulsing Recording Indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: state.isPaused ? '#f59e0b' : '#ef4444',
                boxShadow: state.isPaused ? '0 0 8px #f59e0b' : '0 0 12px #ef4444',
                animation: state.isPaused ? 'none' : 'pulse 1.2s infinite',
                flexShrink: 0,
              }}
            />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: state.isPaused ? '#f59e0b' : '#ef4444', letterSpacing: '0.05em' }}>
                  {state.isPaused ? 'RECORDING PAUSED' : 'RECORDING LIVE'}
                </span>
                <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.85rem', color: '#ffffff' }}>
                  {formatDuration(state.duration)}
                </span>
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: '4px',
                    background: 'rgba(99, 102, 241, 0.25)',
                    color: '#818cf8',
                    border: '1px solid rgba(99, 102, 241, 0.5)',
                  }}
                >
                  480p SD
                </span>
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: '4px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: state.hasAudio ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                    color: state.hasAudio ? '#4ade80' : '#f87171',
                    border: `1px solid ${state.hasAudio ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                  }}
                  title={state.hasAudio ? 'Audio stream actively recording' : 'No audio detected - enable tab audio'}
                >
                  {state.hasAudio ? <Volume2 size={11} /> : <VolumeX size={11} />}
                  {state.hasAudio ? 'Audio ON' : 'No Sound'}
                </span>
              </div>
              <div
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-secondary)',
                  maxWidth: '220px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  marginTop: '2px',
                }}
              >
                {state.activeSessionTitle || 'Google Meet Stream'}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {state.isPaused ? (
              <button
                type="button"
                onClick={onResume}
                className="btn btn-secondary btn-sm"
                title="Resume Recording"
                style={{ padding: '6px 10px', gap: '5px', fontSize: '0.78rem' }}
              >
                <Play size={13} /> Resume
              </button>
            ) : (
              <button
                type="button"
                onClick={onPause}
                className="btn btn-secondary btn-sm"
                title="Pause Recording"
                style={{ padding: '6px 10px', gap: '5px', fontSize: '0.78rem' }}
              >
                <Pause size={13} /> Pause
              </button>
            )}

            <button
              type="button"
              onClick={handleStopClick}
              className="btn btn-primary btn-sm"
              title="Stop and save recording to Recorded Classes"
              style={{
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                borderColor: '#ef4444',
                padding: '6px 14px',
                gap: '6px',
                fontWeight: 700,
                fontSize: '0.8rem',
              }}
            >
              <Square size={13} fill="#ffffff" />
              <span>Finish & Save</span>
            </button>

            <button
              type="button"
              onClick={onCancel}
              className="btn btn-ghost btn-sm"
              title="Cancel recording without saving"
              style={{ padding: '6px 6px', color: 'var(--text-muted)' }}
            >
              <X size={15} />
            </button>
          </div>
        </>
      )}
    </div>
  );
};

