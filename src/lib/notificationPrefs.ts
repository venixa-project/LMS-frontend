export interface NotificationPreferences {
  emailAlerts: boolean;
  inAppAlerts: boolean;
}

const DEFAULT_PREFS: NotificationPreferences = {
  emailAlerts: true,
  inAppAlerts: true,
};

function getStorageKey(userId?: string): string {
  return `venilearn_notif_prefs_${userId || 'default'}`;
}

export function getNotificationPreferences(userId?: string): NotificationPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(getStorageKey(userId));
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw);
    return {
      emailAlerts: parsed.emailAlerts !== false,
      inAppAlerts: parsed.inAppAlerts !== false,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function saveNotificationPreferences(
  prefs: NotificationPreferences,
  userId?: string
): NotificationPreferences {
  const normalized: NotificationPreferences = {
    emailAlerts: prefs.emailAlerts !== false,
    inAppAlerts: prefs.inAppAlerts !== false,
  };
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(getStorageKey(userId), JSON.stringify(normalized));
    } catch {
      // ignore storage quota errors
    }
  }
  return normalized;
}

/**
 * Plays a gentle two-tone chime via Web Audio API when in-app alerts & sound are enabled.
 * Strictly respects the user's inAppAlerts preference.
 */
export function playNotificationSound(userId?: string): void {
  const prefs = getNotificationPreferences(userId);
  if (!prefs.inAppAlerts || typeof window === 'undefined') return;

  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const playTone = (freq: number, startOffset: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + startOffset);
      gain.gain.setValueAtTime(0.001, now + startOffset);
      gain.gain.exponentialRampToValueAtTime(0.08, now + startOffset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + startOffset + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + startOffset);
      osc.stop(now + startOffset + duration);
    };

    playTone(587.33, 0, 0.14); // D5
    playTone(880.0, 0.1, 0.22); // A5
    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 500);
  } catch {
    // Audio playback blocked by browser autoplay policy or unsupported
  }
}
