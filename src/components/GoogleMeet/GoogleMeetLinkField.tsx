import React, { useState, useEffect } from 'react';
import { ExternalLink, Copy, Check, AlertCircle, CheckCircle2 } from 'lucide-react';
import { GoogleMeetIcon } from './GoogleMeetIcon';
import { validateGoogleMeetUrl, openGoogleMeetSession, copyGoogleMeetLink } from '../../lib/googleMeet';

interface Props {
  value: string;
  onChange: (val: string) => void;
  required?: boolean;
  label?: string;
  placeholder?: string;
  helperText?: string;
  allowQuickTest?: boolean;
  error?: string;
}

export const GoogleMeetLinkField: React.FC<Props> = ({
  value,
  onChange,
  required = false,
  label = 'Google Meet Link',
  placeholder = 'https://meet.google.com/abc-defg-hij',
  helperText = 'Paste your Google Meet room link. Scholars will open this URL in a new tab when joining.',
  allowQuickTest = true,
  error: externalError,
}) => {
  const [internalError, setInternalError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!value || !value.trim()) {
      setInternalError(required ? 'Google Meet link is required.' : null);
      return;
    }
    const res = validateGoogleMeetUrl(value, required);
    setInternalError(res.isValid ? null : (res.error || 'Invalid Google Meet URL'));
  }, [value, required]);

  const activeError = externalError || internalError;
  const isInputValid = Boolean(value.trim()) && !activeError;

  const handleCopy = async () => {
    if (!value.trim()) return;
    const ok = await copyGoogleMeetLink(value);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleTestLink = () => {
    openGoogleMeetSession(value);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <label
          style={{
            fontSize: '0.84rem',
            fontWeight: 700,
            color: 'var(--text-main)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            margin: 0,
          }}
        >
          <GoogleMeetIcon size={16} />
          <span>{label}</span>
          {required && <span style={{ color: 'var(--danger)' }}>*</span>}
        </label>

        {isInputValid && allowQuickTest && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={handleCopy}
              className="btn btn-ghost btn-sm"
              title="Copy Meeting Link"
              style={{ fontSize: '0.72rem', padding: '2px 8px', gap: '4px', height: '26px' }}
            >
              {copied ? <Check size={12} color="var(--success)" /> : <Copy size={12} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              type="button"
              onClick={handleTestLink}
              className="btn btn-ghost btn-sm"
              title="Test Open in New Tab"
              style={{ fontSize: '0.72rem', padding: '2px 8px', gap: '4px', height: '26px', color: '#38bdf8' }}
            >
              <ExternalLink size={12} />
              <span>Test Link</span>
            </button>
          </div>
        )}
      </div>

      <div style={{ position: 'relative' }}>
        <input
          type="url"
          className="form-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            paddingLeft: '38px',
            paddingRight: isInputValid ? '36px' : '12px',
            borderColor: activeError ? 'var(--danger)' : isInputValid ? '#22c55e' : undefined,
            fontSize: '0.85rem',
            fontFamily: 'monospace',
          }}
        />

        <div
          style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <GoogleMeetIcon size={16} />
        </div>

        {isInputValid && (
          <div
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#22c55e',
              pointerEvents: 'none',
            }}
          >
            <CheckCircle2 size={16} />
          </div>
        )}
      </div>

      {activeError ? (
        <div
          style={{
            fontSize: '0.74rem',
            color: 'var(--danger)',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
          }}
        >
          <AlertCircle size={13} />
          <span>{activeError}</span>
        </div>
      ) : (
        <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          {helperText}
        </p>
      )}
    </div>
  );
};
