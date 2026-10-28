/**
 * Google Meet Utility & URL Validation Service
 * VeniLearn LMS - Frontend-Only Meeting Integration
 */

export interface GoogleMeetValidationResult {
  isValid: boolean;
  error?: string;
  normalizedUrl?: string;
}

/**
 * Validates whether a provided string is a valid Google Meet URL.
 * 
 * Rules:
 * 1. If required is false and url is empty/blank => valid.
 * 2. If required is true and url is empty => invalid with clear message.
 * 3. Must use HTTPS protocol.
 * 4. Must target meet.google.com domain.
 * 5. Must have a valid Google Meet meeting code (e.g. abc-defg-hij or alphanumerics).
 * 6. Rejects arbitrary non-Google sites.
 */
export function validateGoogleMeetUrl(
  url?: string | null,
  required: boolean = false
): GoogleMeetValidationResult {
  const trimmed = (url || '').trim();

  if (!trimmed) {
    if (required) {
      return {
        isValid: false,
        error: 'Google Meet link is required for scheduled online sessions.',
      };
    }
    return { isValid: true, normalizedUrl: '' };
  }

  // Must start with https://
  if (!/^https:\/\//i.test(trimmed)) {
    return {
      isValid: false,
      error: 'Google Meet link must start with a secure "https://" protocol.',
    };
  }

  try {
    const parsed = new URL(trimmed);

    // Hostname must be meet.google.com
    const hostname = parsed.hostname.toLowerCase();
    if (hostname !== 'meet.google.com') {
      return {
        isValid: false,
        error: 'Invalid meeting provider. The link must be hosted on "meet.google.com" (e.g., https://meet.google.com/abc-defg-hij).',
      };
    }

    // Path must contain a valid meeting code: typically /xxx-yyyy-zzz or /lookup/... or alphanumeric code
    const path = parsed.pathname.replace(/^\/+/, '').trim();
    if (!path || path === '/') {
      return {
        isValid: false,
        error: 'Google Meet link must include a meeting room code (e.g., https://meet.google.com/abc-defg-hij).',
      };
    }

    // Standard Google Meet meeting code check (3-4-3 letters with dashes or alphanumeric room identifier)
    const codePattern = /^[a-z0-9_-]{3,24}$/i;
    const segments = path.split('/');
    const roomCode = segments[0];

    if (!codePattern.test(roomCode)) {
      return {
        isValid: false,
        error: 'Invalid meeting code format. Standard Google Meet codes contain lowercase letters (e.g., abc-defg-hij).',
      };
    }

    return {
      isValid: true,
      normalizedUrl: `https://meet.google.com/${roomCode.toLowerCase()}`,
    };
  } catch {
    return {
      isValid: false,
      error: 'The provided meeting URL is malformed. Please enter a valid URL (e.g., https://meet.google.com/abc-defg-hij).',
    };
  }
}

/**
 * Returns true if the URL is a recognized valid Google Meet link.
 */
export function isValidGoogleMeetUrl(url?: string | null): boolean {
  if (!url) return false;
  return validateGoogleMeetUrl(url, true).isValid;
}

/**
 * Safe external link launcher for Google Meet.
 * Opens the verified Google Meet URL in a separate browser tab with security rel attributes.
 * Keeps the VeniLearn LMS intact in the current tab.
 */
export function openGoogleMeetSession(
  url?: string | null,
  options?: {
    onMissing?: () => void;
    onInvalid?: (errorMsg: string) => void;
  }
): boolean {
  if (!url || !url.trim()) {
    if (options?.onMissing) {
      options.onMissing();
    } else {
      alert('This session does not have a Google Meet link configured yet.');
    }
    return false;
  }

  const validation = validateGoogleMeetUrl(url, true);
  if (!validation.isValid) {
    const errorMsg = validation.error || 'Invalid Google Meet URL.';
    if (options?.onInvalid) {
      options.onInvalid(errorMsg);
    } else {
      alert(errorMsg);
    }
    return false;
  }

  // Open in new tab with noopener, noreferrer
  const targetUrl = validation.normalizedUrl || url.trim();
  const openedWindow = window.open(targetUrl, '_blank', 'noopener,noreferrer');
  if (openedWindow) {
    openedWindow.opener = null;
  }
  return true;
}

/**
 * Copy meeting link helper with fallback.
 */
export async function copyGoogleMeetLink(url?: string | null): Promise<boolean> {
  if (!url || !url.trim()) return false;
  try {
    await navigator.clipboard.writeText(url.trim());
    return true;
  } catch {
    return false;
  }
}
