import React, { useState } from 'react';
import {
  Video, ExternalLink, Copy, Check, ChevronDown, ChevronUp,
  Mic, Camera, Monitor, Shield, Users, Radio
} from 'lucide-react';
import { JitsiProctoringEndpoints, launchJitsiConference, copyJitsiRoomLink } from '../../../lib/jitsiProctoring';

interface Props {
  endpoints: JitsiProctoringEndpoints;
  candidateName: string;
  assessmentTitle: string;
  isMicActive: boolean;
  isWebcamActive: boolean;
  isScreenSharing: boolean;
}

export const VeniGuardJitsiDock: React.FC<Props> = ({
  endpoints,
  candidateName,
  assessmentTitle,
  isMicActive,
  isWebcamActive,
  isScreenSharing,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleOpenWindow = () => {
    launchJitsiConference(endpoints.webUrl);
  };

  const handleCopyLink = async () => {
    const ok = await copyJitsiRoomLink(endpoints.webUrl);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, rgba(21, 19, 41, 0.95) 0%, rgba(11, 11, 42, 0.95) 100%)',
        border: '1px solid rgba(129, 140, 248, 0.35)',
        borderRadius: 'var(--radius-md)',
        boxShadow: '0 8px 32px rgba(5, 8, 22, 0.65)',
        backdropFilter: 'blur(12px)',
        overflow: 'hidden',
        transition: 'all 0.3s ease',
      }}
    >
      {/* Top Banner / Dock Bar */}
      <div
        style={{
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        {/* Left: Jitsi Branding & Live Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #5447FF 0%, #EC4899 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              boxShadow: '0 2px 10px rgba(84, 71, 255, 0.4)',
            }}
          >
            <Video size={17} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#FFFFFF', letterSpacing: '0.2px' }}>
                Jitsi Meet Live Proctoring
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  color: '#10B981',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                }}
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#10B981',
                    boxShadow: '0 0 8px #10B981',
                  }}
                />
                Live Connected
              </span>
            </div>
            <div style={{ fontSize: '0.74rem', color: '#818CF8', marginTop: '1px' }}>
              Room: <span style={{ fontFamily: 'monospace', color: '#F472B6' }}>{endpoints.roomName}</span>
            </div>
          </div>
        </div>

        {/* Center: Stream status pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              borderRadius: '6px',
              background: isWebcamActive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
              color: isWebcamActive ? '#10B981' : '#EF4444',
              fontSize: '0.7rem',
              fontWeight: 600,
            }}
          >
            <Camera size={12} /> Cam Feed {isWebcamActive ? 'Active' : 'Offline'}
          </span>

          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              borderRadius: '6px',
              background: isMicActive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
              color: isMicActive ? '#10B981' : '#EF4444',
              fontSize: '0.7rem',
              fontWeight: 600,
            }}
          >
            <Mic size={12} /> Mic {isMicActive ? 'Transmitting' : 'Muted'}
          </span>

          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              borderRadius: '6px',
              background: isScreenSharing ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
              color: isScreenSharing ? '#10B981' : '#EF4444',
              fontSize: '0.7rem',
              fontWeight: 600,
            }}
          >
            <Monitor size={12} /> Screen {isScreenSharing ? 'Shared' : 'Not Shared'}
          </span>
        </div>

        {/* Right: Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleOpenWindow}
            title="Open in Jitsi Meet Web or Desktop App"
            style={{
              fontSize: '0.75rem',
              padding: '5px 11px',
              fontWeight: 700,
              gap: '5px',
              background: 'linear-gradient(135deg, #2563EB 0%, #5447FF 100%)',
              border: 'none',
              boxShadow: '0 2px 10px rgba(37, 99, 235, 0.35)',
            }}
          >
            <ExternalLink size={13} />
            <span>Open Jitsi Web/App</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleCopyLink}
            title="Copy Jitsi Room link"
            style={{
              fontSize: '0.75rem',
              padding: '5px 10px',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#FFFFFF',
            }}
          >
            {copied ? <Check size={13} color="#10B981" /> : <Copy size={13} />}
            <span>{copied ? 'Copied' : 'Link'}</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setIsExpanded(!isExpanded)}
            style={{
              fontSize: '0.75rem',
              padding: '5px 10px',
              background: isExpanded ? 'rgba(84, 71, 255, 0.25)' : 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#FFFFFF',
              gap: '4px',
            }}
          >
            <span>{isExpanded ? 'Hide Video' : 'Embed Video'}</span>
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Expandable Embedded Jitsi Iframe */}
      {isExpanded && (
        <div
          style={{
            borderTop: '1px solid rgba(129, 140, 248, 0.2)',
            background: '#050816',
            padding: '12px 16px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '8px',
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Shield size={14} color="#818CF8" />
              <span>
                Embedded Jitsi Conference Feed &bull; Transmitting live camera and microphone to proctors.
              </span>
            </div>
            <span style={{ fontSize: '0.72rem', color: '#EC4899', fontWeight: 600 }}>
              Candidate: {candidateName}
            </span>
          </div>

          <div
            style={{
              width: '100%',
              height: '340px',
              borderRadius: '8px',
              overflow: 'hidden',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              background: '#000000',
              position: 'relative',
            }}
          >
            <iframe
              src={endpoints.embedUrl}
              allow="camera; microphone; display-capture; autoplay; clipboard-write"
              title="VeniGuard Jitsi Live Proctoring"
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
