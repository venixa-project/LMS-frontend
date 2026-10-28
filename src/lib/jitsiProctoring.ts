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
 */
export function buildGoogleMeetUrls(params: GoogleMeetProctoringParams): GoogleMeetProctoringEndpoints {
  const roomName = generateGoogleMeetRoomCode(params.assessmentId, params.candidateName || params.candidateId);
  const webUrl = `https://meet.google.com/${roomName}`;

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
 * Safely launch Google Meet in a new browser tab with noopener, noreferrer.
 */
export function launchGoogleMeetConference(webUrl: string): Window | null {
  if (typeof window === 'undefined') return null;
  return window.open(webUrl, '_blank', 'noopener,noreferrer');
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

