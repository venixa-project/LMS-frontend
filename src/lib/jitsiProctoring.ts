/**
 * Google Meet Live Video Proctoring Integration
 * Enables real-time two-way audio, video feed, and invigilation monitoring
 * through Google Meet.
 */

export interface GoogleMeetProctoringParams {
  assessmentId: string;
  assessmentTitle: string;
  candidateId: string;
  candidateName: string;
  candidateEmail?: string;
  role?: 'candidate' | 'proctor' | 'instructor';
  serverDomain?: string; // Default: 'meet.google.com'
  customMeetUrl?: string;
  jitsiRoomId?: string;
}

export type JitsiProctoringParams = GoogleMeetProctoringParams;

export interface GoogleMeetProctoringEndpoints {
  roomName: string;
  webUrl: string;
  appUrl: string;
  embedUrl: string;
  proctorWebUrl: string;
}

export type JitsiProctoringEndpoints = GoogleMeetProctoringEndpoints;

/**
 * Validates whether a string is a standard Google Meet 10-character code (xxx-yyyy-zzz)
 */
export function isValidGoogleMeetCode(code: string): boolean {
  if (!code) return false;
  const clean = code.trim().toLowerCase();
  return /^[a-z]{3}-[a-z]{4}-[a-z]{3}$/.test(clean);
}

/**
 * Generate a clean, deterministic Google Meet format code for an assessment candidate (e.g. ven-asm-cand).
 */
export function generateGoogleMeetRoomCode(assessmentId: string, candidateIdentifier: string): string {
  const cleanAsm = (assessmentId || 'asm').replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(-3).padStart(3, 'x');
  const cleanCand = (candidateIdentifier || 'stu').replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(-4).padStart(4, 'y');
  return `ven-${cleanAsm}-${cleanCand}`;
}

export const generateJitsiRoomName = generateGoogleMeetRoomCode;

/**
 * Build all necessary URLs for launching and monitoring live Google Meet proctoring sessions.
 * If no valid Google Meet room code is supplied by instructor, directs to https://meet.google.com/new
 * to ensure a real live session is created without "Check your meeting code" errors.
 */
export function buildGoogleMeetUrls(params: GoogleMeetProctoringParams): GoogleMeetProctoringEndpoints {
  const custom = (params.customMeetUrl || params.jitsiRoomId || '').trim();
  let webUrl = '';
  let roomName = '';

  const isMeetUrl = custom.includes('meet.google.com');
  const isStandardCode = isValidGoogleMeetCode(custom);

  if (isMeetUrl) {
    webUrl = custom.startsWith('http') ? custom : `https://${custom}`;
    const cleanUrl = webUrl.split('?')[0].replace(/\/$/, '');
    const parts = cleanUrl.split('/');
    roomName = parts[parts.length - 1] || 'google-meet';
  } else if (isStandardCode) {
    roomName = custom.toLowerCase();
    webUrl = `https://meet.google.com/${roomName}`;
  } else if (custom && !custom.startsWith('vl-exam-') && !custom.startsWith('ven-') && !custom.startsWith('asm-') && /^[a-zA-Z0-9_-]{8,30}$/.test(custom)) {
    roomName = custom;
    webUrl = `https://meet.google.com/${custom}`;
  } else {
    // When no specific real Google Meet code has been provided by the instructor,
    // open Google Meet instant meeting creator (https://meet.google.com/new).
    // This creates an authenticated, real live meeting room where camera & mic connect instantly.
    webUrl = 'https://meet.google.com/new';
    roomName = 'Instant Google Meet';
  }

  return {
    roomName,
    webUrl,
    appUrl: webUrl,
    embedUrl: webUrl,
    proctorWebUrl: webUrl,
  };
}

export const buildJitsiUrls = buildGoogleMeetUrls;

/**
 * Safely launch Google Meet in a new browser tab.
 */
export function launchGoogleMeetConference(webUrl: string): Window | null {
  if (typeof window === 'undefined') return null;
  const target = webUrl && webUrl.trim() ? webUrl.trim() : 'https://meet.google.com/new';
  return window.open(target, '_blank');
}

export const launchJitsiConference = launchGoogleMeetConference;

/**
 * Copy Google Meet conference link to clipboard.
 */
export async function copyGoogleMeetRoomLink(url: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(url);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

export const copyJitsiRoomLink = copyGoogleMeetRoomLink;
