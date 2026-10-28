// ============================================================
// LMS - Centralized Gamification & Rank Configuration
// Defines Bronze to Legend rank tiers, thresholds, metallic visual tokens,
// daily login rewards, consecutive streak bonuses, and quiz award rules.
// ============================================================

export type RankTier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond' | 'Master' | 'Legend';

export interface RankTierConfig {
  tier: RankTier;
  id: string; // 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'master' | 'legend'
  name: string; // 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond' | 'Master' | 'Legend'
  minPoints: number;
  maxPoints: number | null; // null represents Legend (no cap)
  label: string;
  color: string;
  secondaryColor: string;
  bgGradient: string;
  borderColor: string;
  textColor: string;
  badgeIcon: string;
  auraGlow: string;
  description: string;
  perks: string[];
}

export const RANK_TIERS: RankTierConfig[] = [
  {
    tier: 'Bronze',
    id: 'bronze',
    name: 'Bronze',
    minPoints: 0,
    maxPoints: 499,
    label: 'Bronze Scholar',
    color: '#cd7f32',
    secondaryColor: '#8c501e',
    bgGradient: 'linear-gradient(135deg, rgba(205, 127, 50, 0.22) 0%, rgba(15, 23, 42, 0.88) 100%)',
    borderColor: 'rgba(205, 127, 50, 0.55)',
    textColor: '#e09858',
    badgeIcon: '🥉',
    auraGlow: '0 0 20px rgba(205, 127, 50, 0.3)',
    description: 'Starting rank for all aspiring academy scholars.',
    perks: ['Platform Access', 'Daily Login Rewards', 'Course Enrollment'],
  },
  {
    tier: 'Silver',
    id: 'silver',
    name: 'Silver',
    minPoints: 500,
    maxPoints: 1199,
    label: 'Silver Scholar',
    color: '#cbd5e1',
    secondaryColor: '#94a3b8',
    bgGradient: 'linear-gradient(135deg, rgba(203, 213, 225, 0.22) 0%, rgba(15, 23, 42, 0.88) 100%)',
    borderColor: 'rgba(203, 213, 225, 0.55)',
    textColor: '#f1f5f9',
    badgeIcon: '🥈',
    auraGlow: '0 0 22px rgba(203, 213, 225, 0.32)',
    description: 'Proven consistent study habits and active quiz engagement.',
    perks: ['Silver Rank Badge', 'Cohort Velocity Insights', 'Avatar Customization'],
  },
  {
    tier: 'Gold',
    id: 'gold',
    name: 'Gold',
    minPoints: 1200,
    maxPoints: 2499,
    label: 'Gold Scholar',
    color: '#ffd700',
    secondaryColor: '#f59e0b',
    bgGradient: 'linear-gradient(135deg, rgba(255, 215, 0, 0.22) 0%, rgba(15, 23, 42, 0.88) 100%)',
    borderColor: 'rgba(255, 215, 0, 0.6)',
    textColor: '#ffd700',
    badgeIcon: '🥇',
    auraGlow: '0 0 26px rgba(255, 215, 0, 0.38)',
    description: 'Dedicated academic performer demonstrating subject excellence.',
    perks: ['Gold Metallic Ring', 'Top Achiever Spotlight', 'Honor Roll Candidate'],
  },
  {
    tier: 'Platinum',
    id: 'platinum',
    name: 'Platinum',
    minPoints: 2500,
    maxPoints: 4499,
    label: 'Platinum Specialist',
    color: '#e2e8f0',
    secondaryColor: '#38bdf8',
    bgGradient: 'linear-gradient(135deg, rgba(56, 189, 248, 0.24) 0%, rgba(15, 23, 42, 0.88) 100%)',
    borderColor: 'rgba(56, 189, 248, 0.65)',
    textColor: '#38bdf8',
    badgeIcon: '💠',
    auraGlow: '0 0 30px rgba(56, 189, 248, 0.42)',
    description: 'Mastery across multiple courses, assessments, and continuous streaks.',
    perks: ['Platinum Holographic Halo', 'Peer Tutoring Badge', 'Assessment Fast-Track'],
  },
  {
    tier: 'Diamond',
    id: 'diamond',
    name: 'Diamond',
    minPoints: 4500,
    maxPoints: 6999,
    label: 'Diamond Adept',
    color: '#38bdf8',
    secondaryColor: '#0ea5e9',
    bgGradient: 'linear-gradient(135deg, rgba(14, 165, 233, 0.26) 0%, rgba(15, 23, 42, 0.9) 100%)',
    borderColor: 'rgba(14, 165, 233, 0.7)',
    textColor: '#7dd3fc',
    badgeIcon: '💎',
    auraGlow: '0 0 34px rgba(14, 165, 233, 0.48)',
    description: 'Top-tier academic champion with superior curriculum mastery.',
    perks: ['Diamond Crystalline Aura', 'Academy Showcase Feature', 'Direct Faculty Mentorship'],
  },
  {
    tier: 'Master',
    id: 'master',
    name: 'Master',
    minPoints: 7000,
    maxPoints: 9999,
    label: 'Master Scholar',
    color: '#c084fc',
    secondaryColor: '#9333ea',
    bgGradient: 'linear-gradient(135deg, rgba(192, 132, 252, 0.28) 0%, rgba(15, 23, 42, 0.92) 100%)',
    borderColor: 'rgba(192, 132, 252, 0.75)',
    textColor: '#e9d5ff',
    badgeIcon: '🔮',
    auraGlow: '0 0 40px rgba(192, 132, 252, 0.55)',
    description: 'Elite scholar standing among the top academic minds in the institution.',
    perks: ['Master Imperial Crown', 'Capstone Project Exemption', 'Alumni Fellowship Invitation'],
  },
  {
    tier: 'Legend',
    id: 'legend',
    name: 'Legend',
    minPoints: 10000,
    maxPoints: null,
    label: 'Legendary Pioneer',
    color: '#fbbf24',
    secondaryColor: '#ec4899',
    bgGradient: 'linear-gradient(135deg, rgba(251, 191, 36, 0.3) 0%, rgba(236, 72, 153, 0.22) 50%, rgba(15, 23, 42, 0.94) 100%)',
    borderColor: 'rgba(251, 191, 36, 0.85)',
    textColor: '#fef08a',
    badgeIcon: '👑',
    auraGlow: '0 0 46px rgba(251, 191, 36, 0.65)',
    description: 'The pinnacle of academy achievement. Renowned across the institution.',
    perks: ['Legend Permanent Hall of Fame', 'VIP Research Grant', 'Dean Honors Citation'],
  },
];

// ============================================================
// Configurable Learning Point Rewards
// ============================================================
export const GAMIFICATION_CONFIG = {
  // Daily login reward points
  dailyLoginReward: 5,
  dailyLoginPoints: 5,

  // Consecutive streak milestones
  streakMilestones: [
    { days: 3, bonusPoints: 10, bonus: 10, label: '3-Day Momentum' },
    { days: 7, bonusPoints: 25, bonus: 25, label: '7-Day Scholar Streak' },
    { days: 14, bonusPoints: 50, bonus: 50, label: 'Fortnight Dedication' },
    { days: 30, bonusPoints: 100, bonus: 100, label: 'Monthly Master Streak' },
  ],

  // Quiz rewards
  quizRewards: {
    completionPoints: 15,
    score80Bonus: 10,  // Score >= 80%
    score95Bonus: 15,  // Score >= 95%
  },

  // Academic point award reasons for Trainers & Admins
  academicAwardReasons: [
    'Excellent classroom participation',
    'Outstanding project contribution',
    'Assignment excellence',
    'Consistent academic effort',
    'Special learning achievement',
    'Trainer-defined academic recognition',
  ] as const,

  academicReasons: [
    'Excellent classroom participation',
    'Outstanding project contribution',
    'Assignment excellence',
    'Consistent academic effort',
    'Special learning achievement',
    'Trainer-defined academic recognition',
  ] as const,

  // Point presets for quick trainer/admin actions
  academicPointPresets: [10, 25, 50, 100, 200],
};

/**
 * Returns the next streak milestone object or null if current streak is at or past maximum.
 */
export function getNextStreakMilestone(currentStreak: number) {
  const milestone = GAMIFICATION_CONFIG.streakMilestones.find((m) => m.days > currentStreak);
  return milestone || null;
}

// ============================================================
// Point Event Categories
// ============================================================
export type PointEventCategory =
  | 'Daily Login'
  | 'Login Streak'
  | 'Login Milestone'
  | 'Quiz Completion'
  | 'Quiz Achievement'
  | 'Trainer Award'
  | 'Admin Award'
  | 'Learning Milestone';

export interface PointAwardEvent {
  id: string;
  studentId: string;
  category: PointEventCategory;
  activityId?: string;
  points: number;
  description: string;
  reason?: string;
  awardedAt: string; // ISO date string
  timestamp?: string;
  source: string;
  awardingSource?: string;
  awardedByUserId?: string;
  awardedByName?: string;
  awardedByRole?: 'system' | 'trainer' | 'admin';
  note?: string;
}

export interface StudentGamificationRecord {
  studentId: string;
  totalPoints: number;
  currentRank: RankTier;
  currentStreak: number;
  bestStreak: number;
  lastLoginDate: string | null; // YYYY-MM-DD
  history: PointAwardEvent[];
  events?: PointAwardEvent[]; // compatibility alias for history
  streakData?: {
    currentStreak: number;
    bestStreak: number;
    lastLoginDate: string | null;
  };
  claimedMilestones: number[]; // e.g. [3, 7]
  completedQuizzes: Record<string, { completedAt: string; score: number; pointsAwarded: number }>;
}

// ============================================================
// Rank & Progress Calculation Helpers
// ============================================================

/**
 * Returns the RankTierConfig for a given point total.
 * Handles negative, zero, and arbitrarily large points correctly.
 */
export function getRankForPoints(points: number): RankTierConfig {
  const safePoints = Math.max(0, Math.floor(points));
  for (let i = RANK_TIERS.length - 1; i >= 0; i--) {
    const tier = RANK_TIERS[i];
    if (safePoints >= tier.minPoints) {
      return tier;
    }
  }
  return RANK_TIERS[0]; // Bronze fallback
}

/**
 * Returns the next RankTierConfig, or null if currently at Legend.
 * Accepts RankTier, RankTierConfig, or tier id/name string.
 */
export function getNextRank(currentTier: RankTier | RankTierConfig | string): RankTierConfig | null {
  const tierName = typeof currentTier === 'object' && currentTier !== null ? currentTier.tier : String(currentTier);
  const currentLower = tierName.toLowerCase();
  const currentIndex = RANK_TIERS.findIndex(
    (r) => r.tier.toLowerCase() === currentLower || r.id.toLowerCase() === currentLower
  );
  if (currentIndex >= 0 && currentIndex < RANK_TIERS.length - 1) {
    return RANK_TIERS[currentIndex + 1];
  }
  return null;
}

/**
 * Calculates current rank, next rank, progress percent clamped 0..100,
 * and points needed.
 */
export function getRankProgress(points: number): {
  currentTier: RankTierConfig;
  nextTier: RankTierConfig | null;
  progressPercent: number;
  pointsNeeded: number;
  pointsToNextRank: number;
  currentRank: RankTier;
  nextRank: RankTier | null;
  isMaxRank: boolean;
  tierFloorPoints: number;
  tierCeilPoints: number | null;
} {
  const safePoints = Math.max(0, Math.floor(points));
  const currentTier = getRankForPoints(safePoints);
  const nextTier = getNextRank(currentTier.tier);

  if (!nextTier) {
    return {
      currentTier,
      nextTier: null,
      progressPercent: 100,
      pointsNeeded: 0,
      pointsToNextRank: 0,
      currentRank: currentTier.tier,
      nextRank: null,
      isMaxRank: true,
      tierFloorPoints: currentTier.minPoints,
      tierCeilPoints: null,
    };
  }

  const range = nextTier.minPoints - currentTier.minPoints;
  const progressInsideTier = safePoints - currentTier.minPoints;
  const rawPercent = (progressInsideTier / range) * 100;
  const progressPercent = Math.min(100, Math.max(0, Math.round(rawPercent * 10) / 10));
  const pointsNeeded = Math.max(0, nextTier.minPoints - safePoints);

  return {
    currentTier,
    nextTier,
    progressPercent,
    pointsNeeded,
    pointsToNextRank: pointsNeeded,
    currentRank: currentTier.tier,
    nextRank: nextTier.tier,
    isMaxRank: false,
    tierFloorPoints: currentTier.minPoints,
    tierCeilPoints: nextTier.minPoints,
  };
}

// ============================================================
// Date & Streak Utilities
// ============================================================

/**
 * Returns date in YYYY-MM-DD format for local date calculations.
 */
export function getLocalCalendarDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns true if date1 and date2 fall on the exact same calendar day.
 */
export function isSameDay(date1: string | null | undefined, date2: string = getLocalCalendarDateString()): boolean {
  if (!date1) return false;
  return date1.slice(0, 10) === date2.slice(0, 10);
}

/**
 * Returns true if candidateDate is exactly the consecutive day following previousDate.
 * E.g., 2026-10-28 is consecutive to 2026-10-27.
 */
export function isConsecutiveDay(previousDateStr: string | null | undefined, currentDateStr: string = getLocalCalendarDateString()): boolean {
  if (!previousDateStr) return false;
  const prev = new Date(`${previousDateStr.slice(0, 10)}T00:00:00`);
  const curr = new Date(`${currentDateStr.slice(0, 10)}T00:00:00`);

  // Difference in milliseconds
  const diffTime = curr.getTime() - prev.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  return diffDays === 1;
}
