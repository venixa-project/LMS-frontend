// ============================================================
// LMS - Gamification & Rewards Store (Zustand + LocalStorage)
// Manages learner experience points (XP), achievement badges,
// deduplicated point awards for course and assessment completions,
// and real-time gamification event auditing.
// ============================================================
import { create } from 'zustand';
import { GamificationProfile, PointsEvent, Badge } from '../types';
import { mockGamificationProfile } from '../data/mockData';
import { useAuthStore } from './store';

const STORAGE_KEY_GAMIFICATION = 'venilearn_gamification_profile';

interface AwardPointsParams {
  userId: string;
  points: number;
  source: string; // e.g. "course_completion:crs-001" or "assessment_pass:asm-001"
  activity: string; // e.g. "Completed JavaScript Fundamentals (100% syllabus)"
}

interface GamificationState {
  profile: GamificationProfile;

  // Selectors
  getTotalPoints: () => number;
  getLevel: () => number;
  getStreak: () => number;
  getBadges: () => Badge[];
  getPointsHistory: () => PointsEvent[];
  hasAwardedForSource: (source: string) => boolean;

  // Actions
  awardPoints: (params: AwardPointsParams) => {
    success: boolean;
    pointsAwarded: number;
    totalPoints: number;
    isDuplicate: boolean;
    message: string;
  };
  addBadge: (badge: Omit<Badge, 'id' | 'earnedAt'>) => void;
  resetToDefault: () => void;
}

function loadInitialProfile(): GamificationProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_GAMIFICATION);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.totalPoints === 'number' && Array.isArray(parsed.pointsHistory)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to load gamification profile from localStorage:', err);
  }
  return mockGamificationProfile;
}

function persistProfile(profile: GamificationProfile): void {
  try {
    localStorage.setItem(STORAGE_KEY_GAMIFICATION, JSON.stringify(profile));
  } catch (err) {
    console.warn('Failed to persist gamification profile:', err);
  }
}

export const useGamificationStore = create<GamificationState>((set, get) => ({
  profile: loadInitialProfile(),

  getTotalPoints: () => get().profile.totalPoints,
  getLevel: () => get().profile.level,
  getStreak: () => get().profile.streak,
  getBadges: () => get().profile.badges,
  getPointsHistory: () => get().profile.pointsHistory,

  hasAwardedForSource: (source: string) => {
    const { profile } = get();
    return profile.pointsHistory.some((pe) => pe.source === source);
  },

  awardPoints: ({ userId, points, source, activity }) => {
    const { profile } = get();

    // 1. Enforce strict deduplication: points must NEVER be awarded twice for the same achievement
    const alreadyAwarded = profile.pointsHistory.some((pe) => pe.source === source);
    if (alreadyAwarded) {
      return {
        success: false,
        pointsAwarded: 0,
        totalPoints: profile.totalPoints,
        isDuplicate: true,
        message: `Reward points already granted for this achievement (${source}).`,
      };
    }

    if (points <= 0) {
      return {
        success: false,
        pointsAwarded: 0,
        totalPoints: profile.totalPoints,
        isDuplicate: false,
        message: 'Points value must be a positive integer.',
      };
    }

    // 2. Generate new points event record
    const newEvent: PointsEvent = {
      id: `pe-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      activity,
      points,
      earnedAt: new Date().toISOString(),
      source,
    };

    const nextPoints = profile.totalPoints + points;
    // Calculate level progression (every 250 XP advances 1 level)
    const nextLevel = Math.max(1, Math.floor(nextPoints / 250) + 1);

    const updatedProfile: GamificationProfile = {
      ...profile,
      userId,
      totalPoints: nextPoints,
      level: nextLevel,
      pointsHistory: [newEvent, ...profile.pointsHistory],
    };

    set({ profile: updatedProfile });
    persistProfile(updatedProfile);

    // 3. Dispatch in-app notification if learner is logged in
    try {
      const authStore = useAuthStore.getState();
      const notifId = `notif-pts-${newEvent.id}`;
      const notif = {
        id: notifId,
        userId,
        title: `+${points} Reward Points Unlocked!`,
        message: `You earned ${points} XP: "${activity}". Total score: ${nextPoints} XP.`,
        category: 'gamification',
        link: '/leaderboard',
        isRead: false,
        timestamp: new Date().toISOString(),
      };
      const nextNotifs = [notif, ...authStore.notifications];
      useAuthStore.setState({
        notifications: nextNotifs,
        unreadNotifications: nextNotifs.filter((n) => !n.isRead).length,
      });
    } catch (e) {
      console.warn('Failed to dispatch gamification notification:', e);
    }

    return {
      success: true,
      pointsAwarded: points,
      totalPoints: nextPoints,
      isDuplicate: false,
      message: `Successfully awarded +${points} points for "${activity}".`,
    };
  },

  addBadge: (badgeData) => {
    const { profile } = get();
    const newBadge: Badge = {
      id: `b-${Date.now().toString(36)}`,
      ...badgeData,
      earnedAt: new Date().toISOString(),
    };
    const updatedProfile = {
      ...profile,
      badges: [newBadge, ...profile.badges],
    };
    set({ profile: updatedProfile });
    persistProfile(updatedProfile);
  },

  resetToDefault: () => {
    set({ profile: mockGamificationProfile });
    persistProfile(mockGamificationProfile);
  },
}));
