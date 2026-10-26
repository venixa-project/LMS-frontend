// ============================================================
// VeniGuard - Proctoring Media & Hardware Telemetry Service
// Safe Web API wrappers for DisplayMedia, UserMedia, Fullscreen,
// MediaRecorder, and connection health probes.
// ============================================================

export interface BrowserCapabilityReport {
  hasGetDisplayMedia: boolean;
  hasGetUserMedia: boolean;
  hasFullscreen: boolean;
  hasMediaRecorder: boolean;
  isSecureContext: boolean;
  browserName: string;
  osName: string;
  isCompatible: boolean;
  notes: string[];
}

/**
 * Probes browser capabilities and security context
 */
export function checkBrowserCapabilities(): BrowserCapabilityReport {
  const isSecure = typeof window !== 'undefined' ? window.isSecureContext : false;
  const hasDisplay = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getDisplayMedia;
  const hasUser = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
  const hasFull = typeof document !== 'undefined' && !!(
    document.fullscreenEnabled ||
    (document as any).webkitFullscreenEnabled ||
    (document as any).mozFullScreenEnabled
  );
  const hasRec = typeof window !== 'undefined' && typeof (window as any).MediaRecorder !== 'undefined';

  let browserName = 'Modern Browser';
  let osName = 'Desktop OS';

  if (typeof navigator !== 'undefined') {
    const ua = navigator.userAgent;
    if (ua.includes('Edg/')) browserName = 'Microsoft Edge';
    else if (ua.includes('Chrome/')) browserName = 'Google Chrome';
    else if (ua.includes('Firefox/')) browserName = 'Mozilla Firefox';
    else if (ua.includes('Safari/') && !ua.includes('Chrome/')) browserName = 'Apple Safari';

    if (ua.includes('Windows')) osName = 'Windows';
    else if (ua.includes('Mac OS')) osName = 'macOS';
    else if (ua.includes('Linux')) osName = 'Linux';
    else if (ua.includes('CrOS')) osName = 'ChromeOS';
  }

  const notes: string[] = [];
  if (!isSecure) {
    notes.push('Browser is not running in a secure context (HTTPS/localhost). Media capture may be restricted.');
  }
  if (!hasDisplay) {
    notes.push('DisplayMedia API is unsupported or disabled by browser permissions policy.');
  }

  const isCompatible = hasFull && (hasDisplay || !isSecure);

  return {
    hasGetDisplayMedia: hasDisplay,
    hasGetUserMedia: hasUser,
    hasFullscreen: hasFull,
    hasMediaRecorder: hasRec,
    isSecureContext: isSecure,
    browserName,
    osName,
    isCompatible,
    notes,
  };
}

/**
 * Initiates user-prompted screen capture stream
 */
export async function requestScreenCapture(
  onEnded?: () => void
): Promise<{ stream: MediaStream; track: MediaStreamTrack }> {
  if (!navigator.mediaDevices?.getDisplayMedia) {
    throw new Error('Screen sharing is not supported by your current browser.');
  }

  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        displaySurface: 'monitor',
      } as any,
      audio: false,
    });

    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) {
      throw new Error('No video track available from selected screen capture source.');
    }

    if (onEnded) {
      videoTrack.addEventListener('ended', onEnded);
    }

    return { stream, track: videoTrack };
  } catch (err: any) {
    if (err.name === 'NotAllowedError') {
      throw new Error('Screen sharing permission was cancelled or denied by the user.');
    }
    throw new Error(err.message || 'Failed to initialize screen sharing stream.');
  }
}

/**
 * Initiates user-prompted microphone and/or webcam stream
 */
export async function requestUserMedia(
  options: { audio?: boolean; video?: boolean },
  onEnded?: () => void
): Promise<{ stream: MediaStream }> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Media input devices are not supported by your current browser.');
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: options.audio ?? false,
      video: options.video ? { width: { ideal: 640 }, height: { ideal: 480 } } : false,
    });

    if (onEnded) {
      stream.getTracks().forEach((track) => {
        track.addEventListener('ended', onEnded);
      });
    }

    return { stream };
  } catch (err: any) {
    if (err.name === 'NotAllowedError') {
      throw new Error('Camera/Microphone access was denied in browser settings.');
    }
    if (err.name === 'NotFoundError') {
      throw new Error('Required camera or microphone hardware was not found on this system.');
    }
    throw new Error(err.message || 'Failed to access camera or microphone.');
  }
}

/**
 * Requests browser fullscreen mode
 */
export async function enterFullscreen(): Promise<boolean> {
  try {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      await elem.requestFullscreen();
      return true;
    }
    if ((elem as any).webkitRequestFullscreen) {
      await (elem as any).webkitRequestFullscreen();
      return true;
    }
    if ((elem as any).mozRequestFullScreen) {
      await (elem as any).mozRequestFullScreen();
      return true;
    }
    return false;
  } catch (err) {
    console.warn('Failed to enter fullscreen:', err);
    return false;
  }
}

/**
 * Checks whether document is currently in fullscreen mode
 */
export function isCurrentlyFullscreen(): boolean {
  if (typeof document === 'undefined') return false;
  return !!(
    document.fullscreenElement ||
    (document as any).webkitFullscreenElement ||
    (document as any).mozFullScreenElement
  );
}

/**
 * Performs quick network ping check to verify live internet roundtrip
 */
export async function probeConnectionHealth(): Promise<{ online: boolean; latencyMs: number }> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { online: false, latencyMs: 0 };
  }

  const start = performance.now();
  try {
    // Ping with small non-caching fetch
    await fetch('/favicon.ico', { method: 'HEAD', cache: 'no-store' });
    const latencyMs = Math.round(performance.now() - start);
    return { online: true, latencyMs };
  } catch {
    // Fallback: if browser says online, treat as online with default latency
    const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
    return { online, latencyMs: 40 };
  }
}

/**
 * Safely stops all tracks in a MediaStream
 */
export function stopAllMediaTracks(stream: MediaStream | null | undefined): void {
  if (!stream) return;
  try {
    stream.getTracks().forEach((track) => {
      try {
        track.stop();
      } catch {}
    });
  } catch {}
}
