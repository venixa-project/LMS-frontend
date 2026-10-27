import React, { useState } from 'react';
import { ProctoringPolicy } from '../../../types';
import {
  Shield, Monitor, Mic, Camera, Wifi, WifiOff,
  Radio, HelpCircle, CheckCircle2, AlertCircle, X, LifeBuoy,
  Video
} from 'lucide-react';
import { GoogleMeetIcon } from '../../../components/GoogleMeet';

interface Props {
  policy: ProctoringPolicy;
  isScreenSharing: boolean;
  isMicActive: boolean;
  isWebcamActive: boolean;
  isOnline: boolean;
  recordingSeconds: number;
  jitsiRoomName?: string;
  onOpenJitsi?: () => void;
  onReportIncident?: () => void;
}

export const VeniGuardStatusPanel: React.FC<Props> = ({
  policy,
  isScreenSharing,
  isMicActive,
  isWebcamActive,
  isOnline,
  recordingSeconds,
  jitsiRoomName,
  onOpenJitsi,
  onReportIncident,
}) => {
  const [showSupportModal, setShowSupportModal] = useState(false);

  const formatRecDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}
      >
        {/* Left: Branding & Recording Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Shield size={16} color="#3B82F6" />
            <span style={{ fontWeight: 800, fontSize: '0.85rem', letterSpacing: '0.3px' }}>
              VeniGuard
            </span>
            <span
              className="badge badge-secondary"
              style={{ fontSize: '0.65rem', textTransform: 'uppercase', padding: '2px 6px' }}
            >
              {policy.level}
            </span>
          </div>

          {/* Recording active badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '3px 10px',
              borderRadius: '12px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#F472B6',
              fontSize: '0.72rem',
              fontWeight: 700,
            }}
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: '#EF4444',
                animation: 'pulse 1.5s infinite',
              }}
            />
            <span>REC {formatRecDuration(recordingSeconds)}</span>
          </div>
        </div>

        {/* Center: Live Monitoring Status Chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Screen */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '0.75rem',
              color: isScreenSharing ? 'var(--text-main)' : 'var(--danger)',
              fontWeight: 500,
            }}
            title={isScreenSharing ? 'Screen capture active' : 'Screen share interrupted'}
          >
            <Monitor size={14} color={isScreenSharing ? '#3B82F6' : 'var(--danger)'} />
            <span>Screen:</span>
            <span style={{ fontWeight: 700, color: isScreenSharing ? 'var(--success)' : 'var(--danger)' }}>
              {isScreenSharing ? 'Active' : 'Offline'}
            </span>
          </div>

          {/* Mic */}
          {policy.requireMicrophone && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '0.75rem',
                color: isMicActive ? 'var(--text-main)' : 'var(--danger)',
                fontWeight: 500,
              }}
            >
              <Mic size={14} color={isMicActive ? '#818CF8' : 'var(--danger)'} />
              <span>Mic:</span>
              <span style={{ fontWeight: 700, color: isMicActive ? 'var(--success)' : 'var(--danger)' }}>
                {isMicActive ? 'Active' : 'Offline'}
              </span>
            </div>
          )}

          {/* Webcam */}
          {policy.requireWebcam && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '0.75rem',
                color: isWebcamActive ? 'var(--text-main)' : 'var(--danger)',
                fontWeight: 500,
              }}
            >
              <Camera size={14} color={isWebcamActive ? '#EC4899' : 'var(--danger)'} />
              <span>Cam:</span>
              <span style={{ fontWeight: 700, color: isWebcamActive ? 'var(--success)' : 'var(--danger)' }}>
                {isWebcamActive ? 'Active' : 'Offline'}
              </span>
            </div>
          )}

          {/* Network */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '0.75rem',
              color: isOnline ? 'var(--text-main)' : 'var(--danger)',
              fontWeight: 500,
            }}
          >
            {isOnline ? <Wifi size={14} color="var(--success)" /> : <WifiOff size={14} color="var(--danger)" />}
            <span>Sync:</span>
            <span style={{ fontWeight: 700, color: isOnline ? 'var(--success)' : 'var(--danger)' }}>
              {isOnline ? 'Online' : 'Reconnecting...'}
            </span>
          </div>

          {/* Google Meet Bridge */}
          {jitsiRoomName && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '0.75rem',
                color: '#34D399',
                fontWeight: 600,
                cursor: onOpenJitsi ? 'pointer' : 'default',
                padding: '2px 8px',
                borderRadius: '6px',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
              }}
              onClick={onOpenJitsi}
              title={`Connected to Google Meet session: ${jitsiRoomName}. Click to open in a new tab.`}
            >
              <GoogleMeetIcon size={13} />
              <span>Google Meet:</span>
              <span style={{ fontWeight: 700, color: '#10B981' }}>Live</span>
            </div>
          )}
        </div>

        {/* Right: Technical Support Action */}
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => setShowSupportModal(true)}
          style={{ fontSize: '0.72rem', padding: '4px 10px', gap: '5px' }}
        >
          <LifeBuoy size={13} color="#3B82F6" />
          Technical Support
        </button>
      </div>

      {/* Technical Support Modal */}
      {showSupportModal && (
        <div className="modal-overlay" onClick={() => setShowSupportModal(false)}>
          <div className="modal-card" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <LifeBuoy size={18} color="#3B82F6" />
                VeniGuard Technical Incident Support
              </h3>
              <button onClick={() => setShowSupportModal(false)} style={{ color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              <div style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: 'var(--radius-md)', marginBottom: '14px' }}>
                <div style={{ fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                  Your Answers are Protected
                </div>
                VeniLearn continuously autosaves your selected answers locally and in the secure store. If your internet disconnects or your browser crashes, your answers will not be lost.
              </div>

              <div style={{ marginBottom: '12px' }}>
                <strong>If you experience a technical interruption:</strong>
                <ol style={{ margin: '6px 0 0 16px', padding: 0 }}>
                  <li>Do not panic — accidental interruptions will not fail your exam.</li>
                  <li>Click <em>Resume Screen Sharing</em> or <em>Test Connection</em> on the recovery screen.</li>
                  <li>After submission, you can submit an explanation on your <strong>My Proctoring Report</strong> page.</li>
                </ol>
              </div>

              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Emergency Desk: <strong>support@venilearn.org</strong> (Ref: {policy.name})
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary btn-sm" onClick={() => setShowSupportModal(false)}>
                Return to Assessment
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
