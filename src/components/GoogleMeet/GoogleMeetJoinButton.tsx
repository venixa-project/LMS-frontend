import React, { useState } from 'react';
import { ExternalLink, AlertCircle } from 'lucide-react';
import { GoogleMeetIcon } from './GoogleMeetIcon';
import { openGoogleMeetSession, isValidGoogleMeetUrl } from '../../lib/googleMeet';

interface Props {
  meetingUrl?: string | null;
  label?: string;
  isHost?: boolean;
  isLive?: boolean;
  role?: string;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  variant?: 'primary' | 'secondary' | 'live';
  onLinkMissing?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export const GoogleMeetJoinButton: React.FC<Props> = ({
  meetingUrl,
  label,
  isHost = false,
  isLive = false,
  role,
  size = 'md',
  fullWidth = false,
  variant = isLive ? 'live' : 'primary',
  onLinkMissing,
  className = '',
  style,
}) => {
  const [missingNotice, setMissingNotice] = useState<string | null>(null);

  const effectiveHost = isHost || (role ? ['instructor', 'trainer', 'faculty', 'host', 'admin', 'org_admin'].includes(role.toLowerCase()) : false);

  const defaultLabel = label
    ? label
    : effectiveHost
    ? 'Open Google Meet'
    : 'Join with Google Meet';

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!meetingUrl || !meetingUrl.trim()) {
      if (onLinkMissing) {
        onLinkMissing();
      } else {
        setMissingNotice('This session does not have a Google Meet link configured yet.');
        setTimeout(() => setMissingNotice(null), 3800);
      }
      return;
    }

    openGoogleMeetSession(meetingUrl, {
      onMissing: () => {
        if (onLinkMissing) onLinkMissing();
        setMissingNotice('This session does not have a Google Meet link configured yet.');
        setTimeout(() => setMissingNotice(null), 3800);
      },
      onInvalid: (msg) => {
        setMissingNotice(msg);
        setTimeout(() => setMissingNotice(null), 4000);
      },
    });
  };

  const isConfigured = isValidGoogleMeetUrl(meetingUrl);

  const getPaddingAndFont = () => {
    switch (size) {
      case 'sm':
        return { padding: '5px 12px', fontSize: '0.78rem', iconSize: 14 };
      case 'lg':
        return { padding: '12px 24px', fontSize: '0.95rem', iconSize: 20 };
      default:
        return { padding: '8px 16px', fontSize: '0.84rem', iconSize: 16 };
    }
  };

  const { padding, fontSize, iconSize } = getPaddingAndFont();

  const getBackgroundAndBorder = () => {
    if (variant === 'live') {
      return {
        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        color: '#ffffff',
        border: '1px solid #ef4444',
        boxShadow: '0 2px 10px rgba(239, 68, 68, 0.35)',
      };
    }
    if (variant === 'secondary') {
      return {
        background: 'rgba(255, 255, 255, 0.06)',
        color: 'var(--text-main)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'none',
      };
    }
    // Google Meet green accent button
    return {
      background: 'linear-gradient(135deg, #00ac47 0%, #00832d 100%)',
      color: '#ffffff',
      border: '1px solid rgba(0, 172, 71, 0.6)',
      boxShadow: '0 2px 12px rgba(0, 172, 71, 0.3)',
    };
  };

  const bgStyles = getBackgroundAndBorder();

  return (
    <div style={{ display: fullWidth ? 'block' : 'inline-block', position: 'relative' }}>
      <button
        type="button"
        onClick={handleClick}
        className={`btn ${className}`}
        title={isConfigured ? `Open Google Meet: ${meetingUrl}` : 'No Google Meet link configured'}
        style={{
          width: fullWidth ? '100%' : 'auto',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          fontWeight: 700,
          borderRadius: '8px',
          padding,
          fontSize,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          ...bgStyles,
          ...style,
        }}
      >
        <GoogleMeetIcon size={iconSize} />
        <span>{defaultLabel}</span>
        <ExternalLink size={iconSize - 3} style={{ opacity: 0.8 }} />
      </button>

      {missingNotice && (
        <div
          role="alert"
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 8px)',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(15, 23, 42, 0.98)',
            border: '1px solid #f59e0b',
            color: '#fef08a',
            padding: '7px 12px',
            borderRadius: '8px',
            fontSize: '0.75rem',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            zIndex: 1000,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            pointerEvents: 'none',
          }}
        >
          <AlertCircle size={13} color="#f59e0b" />
          <span>{missingNotice}</span>
        </div>
      )}
    </div>
  );
};
