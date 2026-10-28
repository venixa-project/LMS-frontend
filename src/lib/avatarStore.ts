// ============================================================
// LMS - Animated Avatar Archetypes & User Preference Store
// ============================================================

import { useState, useEffect, useCallback } from 'react';

export const USER_AVATAR_STORAGE_KEY = 'venilearn_user_avatar';

export interface AvatarArchetype {
  id: string;
  name: string;
  title: string;
  category: string;
  flavor: string;
  themeColor: string;
  ringGradient: string;
  bgGradient: string;
  accessories: string[];
}

export const AVATAR_ARCHETYPES: Record<string, AvatarArchetype> = {
  alex: {
    id: 'alex',
    name: 'Cyber Prodigy',
    title: 'AI & Full-Stack Scholar',
    category: 'Cyber Tech',
    flavor: 'Holographic cyan scanning visor with high-frequency audio headset.',
    themeColor: '#38bdf8',
    ringGradient: 'conic-gradient(from 0deg, #38bdf8, #818cf8, #c084fc, #38bdf8)',
    bgGradient: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0369a1 100%)',
    accessories: ['Holo-Visor', 'Tech Collar', 'Audio Headset'],
  },
  priya: {
    id: 'priya',
    name: 'Solar Champion',
    title: 'Quantum & Architecture Lead',
    category: 'Champion Tier',
    flavor: 'Golden victory tiara with radiating quantum circuitry and amber optics.',
    themeColor: '#ffd700',
    ringGradient: 'conic-gradient(from 0deg, #ffd700, #f59e0b, #fbbf24, #ffd700)',
    bgGradient: 'linear-gradient(135deg, #1c1917 0%, #451a03 50%, #78350f 100%)',
    accessories: ['Golden Crown', 'Quantum Spectacles', 'Royal High-Collar'],
  },
  marcus: {
    id: 'marcus',
    name: 'Systems Titan',
    title: 'Cloud & Distributed Systems',
    category: 'Elite Architect',
    flavor: 'Platinum communications headset with holographic data monocle.',
    themeColor: '#cbd5e1',
    ringGradient: 'conic-gradient(from 0deg, #e2e8f0, #94a3b8, #64748b, #e2e8f0)',
    bgGradient: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
    accessories: ['Platinum Headset', 'Data Monocle', 'Cyber Blazer'],
  },
  elena: {
    id: 'elena',
    name: 'Cloud Visionary',
    title: 'Data Science & Neural ML',
    category: 'Analytics Pioneer',
    flavor: 'Neural interface earpiece with high-tech amber spectacles.',
    themeColor: '#f97316',
    ringGradient: 'conic-gradient(from 0deg, #fb923c, #f97316, #ea580c, #fb923c)',
    bgGradient: 'linear-gradient(135deg, #18181b 0%, #2e1065 50%, #431407 100%)',
    accessories: ['Neural Earpiece', 'Amber Specs', 'Circuit Choker'],
  },
  daniel: {
    id: 'daniel',
    name: 'Matrix Engineer',
    title: 'Deep Learning & Algorithms',
    category: 'Machine Intelligence',
    flavor: 'Emerald geometric optic frames with high-density data turtleneck.',
    themeColor: '#10b981',
    ringGradient: 'conic-gradient(from 0deg, #34d399, #10b981, #059669, #34d399)',
    bgGradient: 'linear-gradient(135deg, #022c22 0%, #064e3b 50%, #0f172a 100%)',
    accessories: ['Matrix Frames', 'Cyber Turtleneck', 'Smart Mic'],
  },
  sophia: {
    id: 'sophia',
    name: 'Security Sentinel',
    title: 'Cybersecurity & Defense',
    category: 'Information Security',
    flavor: 'Ultraviolet scanning goggles with high-frequency communications gear.',
    themeColor: '#c084fc',
    ringGradient: 'conic-gradient(from 0deg, #e879f9, #c084fc, #9333ea, #e879f9)',
    bgGradient: 'linear-gradient(135deg, #1e1b4b 0%, #3b0764 50%, #172554 100%)',
    accessories: ['UV Goggles', 'Neon Streak', 'Comms Collar'],
  },
  kwame: {
    id: 'kwame',
    name: 'DevOps Maestro',
    title: 'Container & CI/CD Specialist',
    category: 'Infrastructure',
    flavor: 'Teal cyber vest with dual-focus tech frames and low-latency antenna.',
    themeColor: '#14b8a6',
    ringGradient: 'conic-gradient(from 0deg, #2dd4bf, #14b8a6, #0d9488, #2dd4bf)',
    bgGradient: 'linear-gradient(135deg, #042f2e 0%, #115e59 50%, #0f172a 100%)',
    accessories: ['Teal Vest', 'Dual Focus Frames', 'Sub-Mic'],
  },
  chloe: {
    id: 'chloe',
    name: 'Algorithm Master',
    title: 'Statistical Modeling & Data',
    category: 'Mathematics & Data',
    flavor: 'Electric magenta bob with neon audio shades and precision optics.',
    themeColor: '#f43f5e',
    ringGradient: 'conic-gradient(from 0deg, #fb7185, #f43f5e, #be123c, #fb7185)',
    bgGradient: 'linear-gradient(135deg, #1c1917 0%, #4c0519 50%, #1e1b4b 100%)',
    accessories: ['Audio Shades', 'Magenta Bob', 'Quantum Collar'],
  },
  liam: {
    id: 'liam',
    name: 'Mobile Pioneer',
    title: 'Cross-Platform App Architect',
    category: 'Mobile & Devices',
    flavor: 'Reversed tech cap with solar-powered audio earbuds.',
    themeColor: '#f59e0b',
    ringGradient: 'conic-gradient(from 0deg, #fcd34d, #f59e0b, #d97706, #fcd34d)',
    bgGradient: 'linear-gradient(135deg, #18181b 0%, #451a03 50%, #1e293b 100%)',
    accessories: ['Reversed Cap', 'Solar Earbuds', 'Tech Jacket'],
  },
  aisha: {
    id: 'aisha',
    name: 'Quantum Researcher',
    title: 'Qubit Algorithms & Cryptography',
    category: 'Quantum Computing',
    flavor: 'Royal navy veil with gold circuit traces and smart ocular lens.',
    themeColor: '#38bdf8',
    ringGradient: 'conic-gradient(from 0deg, #38bdf8, #ffd700, #818cf8, #38bdf8)',
    bgGradient: 'linear-gradient(135deg, #0b0f19 0%, #172554 50%, #1e1b4b 100%)',
    accessories: ['Circuit Headwrap', 'Ocular Lens', 'Gold Accents'],
  },
};

/**
 * Reads user avatar choice from localStorage with 'alex' as default.
 */
export function getUserAvatar(): string {
  try {
    const saved = localStorage.getItem(USER_AVATAR_STORAGE_KEY);
    if (saved && AVATAR_ARCHETYPES[saved]) {
      return saved;
    }
  } catch {}
  return 'alex';
}

/**
 * Persists user avatar choice and triggers global change event.
 */
export function setUserAvatar(avatarId: string): void {
  try {
    if (!AVATAR_ARCHETYPES[avatarId]) return;
    localStorage.setItem(USER_AVATAR_STORAGE_KEY, avatarId);
    window.dispatchEvent(new CustomEvent('venilearn_avatar_change', { detail: { avatarId } }));
  } catch (e) {
    console.error('Failed to save avatar choice:', e);
  }
}

/**
 * React hook for consuming and updating the user's active animated avatar.
 */
export function useUserAvatar() {
  const [avatarId, setAvatarIdState] = useState<string>(getUserAvatar);

  useEffect(() => {
    const handleAvatarChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ avatarId: string }>;
      if (customEvent.detail?.avatarId) {
        setAvatarIdState(customEvent.detail.avatarId);
      } else {
        setAvatarIdState(getUserAvatar());
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === USER_AVATAR_STORAGE_KEY && e.newValue) {
        setAvatarIdState(e.newValue);
      }
    };

    window.addEventListener('venilearn_avatar_change', handleAvatarChange);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('venilearn_avatar_change', handleAvatarChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const setAvatar = useCallback((id: string) => {
    setUserAvatar(id);
    setAvatarIdState(id);
  }, []);

  const avatarMeta = AVATAR_ARCHETYPES[avatarId] || AVATAR_ARCHETYPES.alex;

  return {
    avatarId,
    setAvatar,
    avatarMeta,
    allArchetypes: Object.values(AVATAR_ARCHETYPES),
  };
}
