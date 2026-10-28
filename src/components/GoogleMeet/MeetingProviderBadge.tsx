import React from 'react';
import { GoogleMeetIcon } from './GoogleMeetIcon';

interface Props {
  provider?: string;
  variant?: 'pill' | 'compact' | 'subtle';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  isConfigured?: boolean;
  hasLink?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

export const MeetingProviderBadge: React.FC<Props> = ({
  provider = 'Google Meet',
  variant = 'pill',
  size = 'md',
  showLabel = true,
  isConfigured = true,
  hasLink,
  style,
  className = '',
}) => {
  const configured = hasLink !== undefined ? hasLink : isConfigured;
  const iconSize = size === 'sm' ? 12 : size === 'lg' ? 16 : 13;
  const fontSize = size === 'sm' ? '0.68rem' : size === 'lg' ? '0.8rem' : '0.72rem';
  const padding = size === 'sm' ? '2px 7px' : size === 'lg' ? '4px 12px' : '3px 9px';

  if (variant === 'compact') {
    return (
      <span
        className={className}
        title={configured ? `Provider: ${provider} (Configured)` : `${provider} link not configured`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          fontSize,
          fontWeight: 700,
          color: configured ? '#34d399' : 'var(--text-muted)',
          ...style,
        }}
      >
        <GoogleMeetIcon size={iconSize} />
        {showLabel && <span>{provider || 'Google Meet'}</span>}
      </span>
    );
  }

  return (
    <span
      className={`badge ${className}`.trim()}
      title={configured ? `${provider} Conference Provider` : `${provider} link missing`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding,
        borderRadius: '999px',
        background: configured ? 'rgba(0, 172, 71, 0.12)' : 'rgba(148, 163, 184, 0.1)',
        border: configured ? '1px solid rgba(0, 172, 71, 0.35)' : '1px solid rgba(148, 163, 184, 0.25)',
        color: configured ? '#22c55e' : 'var(--text-muted)',
        fontSize,
        fontWeight: 700,
        letterSpacing: '0.02em',
        ...style,
      }}
    >
      <GoogleMeetIcon size={iconSize} />
      {showLabel && <span>{provider || 'Google Meet'}</span>}
      {!configured && <span style={{ fontSize: '0.65rem', opacity: 0.8 }}>(No link)</span>}
    </span>
  );
};
