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
 * Validates whether a provided string is a valid Google Meet URL or room code.
 *
 * Rules:
 * 1. If required is false and url is empty/blank => valid.
 * 2. If required is true and url is empty => invalid with clear message.
 * 3. Supports direct meeting codes (e.g., "abc-defg-hij" or "abcdefghij").
 * 4. Supports full URLs (e.g., "https://meet.google.com/abc-defg-hij" or "https://meet.google.com/new").
 * 5. Rejects arbitrary non-Google sites.
 * 6. Valid Google codes are 3-4-3 letters (or "new" for instant meeting creation).
 */
export function validateGoogleMeetUrl(
  url?: string | null,
  required: boolean = false
): GoogleMeetValidationResult {
  let trimmed = (url || '').trim();

  if (!trimmed) {
    if (required) {
      return {
        isValid: false,
        error: 'Google Meet link is required for scheduled online sessions.',
      };
    }
    return { isValid: true, normalizedUrl: '' };
  }

  // If user pasted just a 3-4-3 code or 10-char code without https://
  if (/^[a-z]{3}-[a-z]{4}-[a-z]{3}$/i.test(trimmed)) {
    return {
      isValid: true,
      normalizedUrl: `https://meet.google.com/${trimmed.toLowerCase()}`,
    };
  }

  if (/^[a-z]{10}$/i.test(trimmed)) {
    const formatted = `${trimmed.slice(0, 3)}-${trimmed.slice(3, 7)}-${trimmed.slice(7)}`.toLowerCase();
    return {
      isValid: true,
      normalizedUrl: `https://meet.google.com/${formatted}`,
    };
  }

  if (trimmed.toLowerCase() === 'new') {
    return {
      isValid: false,
      error: 'Cannot use "new" as a meeting link. A specific 3-4-3 Google Meet code (e.g., abc-defg-hij) is required.',
    };
  }

  // Prepend https:// if user entered meet.google.com/... without protocol
  if (/^meet\.google\.com/i.test(trimmed)) {
    trimmed = `https://${trimmed}`;
  }

  // Must start with https://
  if (!/^https:\/\//i.test(trimmed)) {
    return {
      isValid: false,
      error: 'Google Meet link must start with "https://" or be a valid meeting code (e.g., abc-defg-hij).',
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

    // Path must contain a valid meeting code
    const path = parsed.pathname.replace(/^\/+/, '').trim();
    if (!path || path === '/') {
      return {
        isValid: false,
        error: 'Google Meet link must include a meeting room code (e.g., https://meet.google.com/abc-defg-hij).',
      };
    }

    const segments = path.split('/');
    const roomCode = segments[0].toLowerCase();

    // Check for "new" instant meeting room
    if (roomCode === 'new') {
      return {
        isValid: false,
        error: 'Cannot use "new" as a meeting link. A specific 3-4-3 Google Meet code (e.g., abc-defg-hij) is required so all attendees join the same room.',
      };
    }

    // Standard Google Meet meeting code check (3-4-3 format: abc-defg-hij)
    const standardPattern = /^[a-z]{3}-[a-z]{4}-[a-z]{3}$/;
    if (standardPattern.test(roomCode)) {
      return {
        isValid: true,
        normalizedUrl: `https://meet.google.com/${roomCode}`,
      };
    }

    // 10 continuous letters without hyphens: auto-insert hyphens
    if (/^[a-z]{10}$/.test(roomCode)) {
      const formatted = `${roomCode.slice(0, 3)}-${roomCode.slice(3, 7)}-${roomCode.slice(7)}`;
      return {
        isValid: true,
        normalizedUrl: `https://meet.google.com/${formatted}`,
      };
    }

    // If it starts with 'ven-' (old generated mock slug) or invalid short code like 'gvhjkl'
    if (roomCode.startsWith('ven-') || roomCode.length < 10) {
      return {
        isValid: false,
        error: 'Invalid meeting code. Google Meet requires a 3-4-3 format code (e.g., abc-defg-hij) or use https://meet.google.com/new.',
      };
    }

    // General fallback for Workspace custom aliases (alphanumeric, min 3 chars)
    const generalPattern = /^[a-z0-9_-]{3,30}$/;
    if (generalPattern.test(roomCode)) {
      return {
        isValid: true,
        normalizedUrl: `https://meet.google.com/${roomCode}`,
      };
    }

    return {
      isValid: false,
      error: 'Invalid meeting code format. Standard Google Meet codes contain 10 letters in 3-4-3 format (e.g., abc-defg-hij).',
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
  const trimmed = url.trim().toLowerCase();
  const knownSyntheticCodes = [
    'gdf-yzfn-ixm',
    'ihp-cfao-nvi',
    'pow-ewjd-mdv',
    'chu-igkj-xce',
    'fdp-ctgx-gpx',
    'tcy-gdcw-okz',
    'ijb-bzoi-kyy',
    'qch-uobk-kgu',
  ];
  if (knownSyntheticCodes.some((code) => trimmed.includes(code))) return false;
  return validateGoogleMeetUrl(url, true).isValid;
}

/**
 * Safe external link launcher for Google Meet.
 * Opens the verified Google Meet URL in a separate browser tab with security rel attributes.
 * NEVER falls back to meet.google.com/new, which creates isolated, separate meeting rooms.
 */
export function openGoogleMeetSession(
  url?: string | null,
  options?: {
    onMissing?: () => void;
    onInvalid?: (errorMsg: string) => void;
  }
): boolean {
  if (!url || !url.trim()) {
    options?.onMissing?.();
    return false;
  }

  const trimmed = url.trim();
  if (trimmed === 'https://meet.google.com/new' || trimmed.toLowerCase() === 'new' || trimmed.includes('/ven-')) {
    options?.onInvalid?.('Cannot join an unconfigured or temporary meeting link. Please contact the administrator.');
    return false;
  }

  const validation = validateGoogleMeetUrl(trimmed, false);
  if (!validation.isValid || !validation.normalizedUrl) {
    options?.onInvalid?.(validation.error || 'Invalid Google Meet URL format.');
    return false;
  }

  const targetUrl = validation.normalizedUrl;
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
  if (!url || !url.trim() || url.includes('/new')) return false;
  try {
    await navigator.clipboard.writeText(url.trim());
    return true;
  } catch {
    return false;
  }
}
