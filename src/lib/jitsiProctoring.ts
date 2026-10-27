/**
 * Jitsi Meet Live Video Proctoring Integration
 * Enables real-time two-way audio, video feed, and screen share monitoring
 * through Jitsi Meet (meet.jit.si or custom Jitsi deployment).
 */

export interface JitsiProctoringParams {
  assessmentId: string;
  assessmentTitle: string;
  candidateId: string;
  candidateName: string;
  candidateEmail?: string;
  role?: 'candidate' | 'proctor' | 'instructor';
  serverDomain?: string; // Default: 'meet.jit.si'
}

export interface JitsiProctoringEndpoints {
  roomName: string;
  webUrl: string;
  appUrl: string;
  embedUrl: string;
  proctorWebUrl: string;
}

/**
 * Generate a safe, deterministic Jitsi Meet room name for the assessment candidate.
 */
export function generateJitsiRoomName(assessmentId: string, candidateIdentifier: string): string {
  const cleanAsm = (assessmentId || 'assessment').replace(/[^a-zA-Z0-9]/g, '');
  const cleanCand = (candidateIdentifier || 'candidate').replace(/[^a-zA-Z0-9]/g, '');
  return `VeniGuard_Exam_${cleanAsm}_${cleanCand}`;
}

/**
 * Build all necessary URLs and hash parameters for joining Jitsi Meet.
 * Passes candidate identity, auto-enables audio and video, bypasses pre-join,
 * and sets up proctoring configuration.
 */
export function buildJitsiUrls(params: JitsiProctoringParams): JitsiProctoringEndpoints {
  const domain = params.serverDomain || 'meet.jit.si';
  const roomName = generateJitsiRoomName(params.assessmentId, params.candidateName || params.candidateId);

  const roleLabel = params.role === 'proctor' || params.role === 'instructor' ? 'Proctor' : 'Candidate';
  const displayName = `${params.candidateName || 'Student'} (${roleLabel} - VeniLearn)`;
  const email = params.candidateEmail || 'student@venilearn.org';
  const subject = `${params.assessmentTitle} - VeniGuard Live Proctoring`;

  // Candidate Jitsi Configuration (Audio Unmuted, Video Unmuted, No prejoin splash)
  const candidateConfigParams = [
    `userInfo.displayName=${encodeURIComponent(displayName)}`,
    `userInfo.email=${encodeURIComponent(email)}`,
    'config.prejoinPageEnabled=false',
    'config.startWithAudioMuted=false',
    'config.startWithVideoMuted=false',
    'config.disableDeepLinking=true',
    'config.enableWelcomePage=false',
    'config.requireDisplayName=false',
    'config.resolution=720',
    `config.subject=${encodeURIComponent(subject)}`,
  ].join('&');

  // Proctor/Faculty Jitsi Configuration
  const proctorConfigParams = [
    `userInfo.displayName=${encodeURIComponent('Faculty Proctor (VeniLearn)')}`,
    'config.prejoinPageEnabled=false',
    'config.startWithAudioMuted=true', // Proctors can join muted to not disturb
    'config.startWithVideoMuted=false',
    'config.disableDeepLinking=true',
    'config.enableWelcomePage=false',
    `config.subject=${encodeURIComponent(subject)}`,
  ].join('&');

  const webUrl = `https://${domain}/${roomName}#${candidateConfigParams}`;
  const embedUrl = `https://${domain}/${roomName}#${candidateConfigParams}`;
  const proctorWebUrl = `https://${domain}/${roomName}#${proctorConfigParams}`;
  const appUrl = `jitsi-meet://${domain}/${roomName}`;

  return {
    roomName,
    webUrl,
    appUrl,
    embedUrl,
    proctorWebUrl,
  };
}

/**
 * Launch Jitsi Meet in a dedicated companion window or popup.
 */
export function launchJitsiConference(webUrl: string, windowName = 'VeniGuard_Jitsi_Companion'): Window | null {
  if (typeof window === 'undefined') return null;

  const width = 1120;
  const height = 740;
  const left = Math.max(0, (window.screen.width - width) / 2);
  const top = Math.max(0, (window.screen.height - height) / 2);

  const windowFeatures = `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes`;
  const conferenceWindow = window.open(webUrl, windowName, windowFeatures);

  if (conferenceWindow) {
    conferenceWindow.focus();
  } else {
    // If popups are blocked, fallback to opening a regular new tab
    window.open(webUrl, '_blank');
  }

  return conferenceWindow;
}

/**
 * Copy Jitsi Meet conference room URL to the clipboard.
 */
export async function copyJitsiRoomLink(url: string): Promise<boolean> {
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
