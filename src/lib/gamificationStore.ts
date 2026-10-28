// ============================================================
// LMS - Centralized Gamification Store (Zustand + LocalStorage)
// Manages student point-award events, daily login rewards, consecutive streaks,
// quiz completion/achievement rewards, and trainer/admin academic points.
// ============================================================

import { create } from 'zustand';
import {
  RankTier,
  PointAwardEvent,
  PointEventCategory,
  StudentGamificationRecord,
  GAMIFICATION_CONFIG,
  getRankForPoints,
  getRankProgress,
  getLocalCalendarDateString,
  isSameDay,
  isConsecutiveDay,
} from './gamificationConfig';
import { useAuthStore } from './store';

const STORAGE_KEY_GAMIFICATION_PROFILES = 'venilearn_gamification_student_records';
const STORAGE_KEY_UNACK_RANKUPS = 'venilearn_unacknowledged_rankups';

export interface AwardAcademicPointsParams {
  studentId: string;
  points: number;
  reason: string;
  note?: string;
  awardedByUserId?: string;
  awardedByName?: string;
  awardedByRole?: 'trainer' | 'admin';
  awardingRole?: 'trainer' | 'admin';
  awardingUserId?: string;
  awardingUserName?: string;
}

export interface RankUpPayload {
  studentId: string;
  oldRank: RankTier;
  previousRank?: RankTier;
  newRank: RankTier;
  totalPoints: number;
  promotedAt: string;
}

export interface DailyLoginRewardResult {
  awarded: boolean;
  pointsAwarded: number;
  dailyPoints: number;
  newStreak: number;
  streak: number;
  bestStreak: number;
  milestoneAchieved?: { days: number; bonus: number; label: string };
  milestoneBonus?: number;
  milestoneDays?: number;
  message: string;
  isAlreadyAwardedToday: boolean;
}

export interface QuizRewardResult {
  awarded: boolean;
  completionAwarded?: boolean;
  scoreBonusAwarded?: boolean;
  pointsAwarded: number;
  bonusPoints: number;
  totalAwarded: number;
  newPoints: number;
  currentRank: string;
  rankChanged: boolean;
  isDuplicate: boolean;
  message: string;
}

interface GamificationStoreState {
  profiles: Record<string, StudentGamificationRecord>;
  unacknowledgedRankUps: Record<string, RankUpPayload>;

  // Student Selectors & Core Actions
  getStudentProfile: (studentId?: string) => StudentGamificationRecord;
  getRankProgressForStudent: (studentId?: string) => ReturnType<typeof getRankProgress>;
  getAllStudentProfiles: () => StudentGamificationRecord[];

  // Daily Login & Streak
  recordDailyLogin: (studentId?: string) => DailyLoginRewardResult;

  // Quiz Points
  recordQuizSubmission: (studentId: string, quizId: string, quizTitle: string, score: number) => QuizRewardResult;

  // Academic Points Award (Trainer / Admin controlled)
  awardAcademicPoints: (params: AwardAcademicPointsParams) => {
    success: boolean;
    pointsAwarded: number;
    newTotal: number;
    newPoints: number;
    oldRank: RankTier;
    newRank: RankTier;
    currentRank: string;
    rankUpOccurred: boolean;
    rankChanged: boolean;
    message: string;
  };

  // Rank-up celebration handling
  getUnacknowledgedRankUp: (studentId?: string) => RankUpPayload | null;
  acknowledgeRankUp: (studentId: string) => void;

  // Admin / Analytics Aggregations
  getRankDistribution: () => Record<RankTier, number>;
  getPointsByCategory: () => Record<PointEventCategory, number>;
  getRecentAwardEvents: (limit?: number) => PointAwardEvent[];

  // Backwards Compatibility for existing components
  getTotalPoints: () => number;
  getStreak: () => number;
  getPointsHistory: () => PointAwardEvent[];
  awardPoints: (params: { userId: string; points: number; source: string; activity: string }) => {
    success: boolean;
    pointsAwarded: number;
    totalPoints: number;
    isDuplicate: boolean;
    message: string;
  };
  resetToDefault: () => void;
}

/**
 * Creates seed records for demo students based on baseline data.
 */
function createInitialDemoProfiles(): Record<string, StudentGamificationRecord> {
  const now = new Date().toISOString();
  const yesterday = new Date(Date.now() - 86400000);
  const yesterdayStr = getLocalCalendarDateString(yesterday);

  return {
    // Alex Thompson (Canonical student user)
    'u-007': {
      studentId: 'u-007',
      totalPoints: 2150, // Gold Scholar
      currentRank: 'Gold',
      currentStreak: 6,
      bestStreak: 12,
      lastLoginDate: yesterdayStr,
      claimedMilestones: [3],
      completedQuizzes: {
        'asm-001': { completedAt: '2026-10-16T09:35:00Z', score: 92, pointsAwarded: 25 },
      },
      history: [
        {
          id: 'pe-001',
          studentId: 'u-007',
          category: 'Daily Login',
          points: 5,
          description: 'Daily login bonus',
          awardedAt: '2026-10-27T08:15:00Z',
          source: 'daily_login:2026-10-27',
          awardedByRole: 'system',
        },
        {
          id: 'pe-002',
          studentId: 'u-007',
          category: 'Login Milestone',
          points: 10,
          description: 'Reached 3-Day Login Streak milestone',
          awardedAt: '2026-10-24T09:00:00Z',
          source: 'streak_milestone:3',
          awardedByRole: 'system',
        },
        {
          id: 'pe-003',
          studentId: 'u-007',
          category: 'Quiz Completion',
          points: 15,
          description: 'Completed JavaScript Fundamentals Assessment',
          awardedAt: '2026-10-16T09:35:00Z',
          source: 'quiz_completion:asm-001',
          awardedByRole: 'system',
        },
        {
          id: 'pe-004',
          studentId: 'u-007',
          category: 'Quiz Achievement',
          points: 10,
          description: 'Scored 92% (Threshold >= 80%) on JS Fundamentals Assessment',
          awardedAt: '2026-10-16T09:35:00Z',
          source: 'quiz_score_80:asm-001',
          awardedByRole: 'system',
        },
        {
          id: 'pe-005',
          studentId: 'u-007',
          category: 'Trainer Award',
          points: 100,
          description: 'Outstanding project contribution on TypeScript design patterns capstone',
          awardedAt: '2026-10-20T14:30:00Z',
          source: 'trainer_award:u-004',
          awardedByUserId: 'u-004',
          awardedByName: 'Dr. James Wilson',
          awardedByRole: 'trainer',
          note: 'Demonstrated exemplary clean architecture principles.',
        },
        {
          id: 'pe-006',
          studentId: 'u-007',
          category: 'Admin Award',
          points: 200,
          description: 'Special learning achievement: Campus Hackathon Finalist',
          awardedAt: '2026-10-10T11:00:00Z',
          source: 'admin_award:u-001',
          awardedByUserId: 'u-001',
          awardedByName: 'Sarah Chen',
          awardedByRole: 'admin',
          note: 'Recognized by academic leadership.',
        },
      ],
    },

    // Maria Garcia
    'u-009': {
      studentId: 'u-009',
      totalPoints: 750, // Silver Scholar
      currentRank: 'Silver',
      currentStreak: 4,
      bestStreak: 8,
      lastLoginDate: yesterdayStr,
      claimedMilestones: [3],
      completedQuizzes: {},
      history: [
        {
          id: 'pe-mg-001',
          studentId: 'u-009',
          category: 'Daily Login',
          points: 5,
          description: 'Daily login bonus',
          awardedAt: '2026-10-27T09:00:00Z',
          source: 'daily_login:2026-10-27',
          awardedByRole: 'system',
        },
        {
          id: 'pe-mg-002',
          studentId: 'u-009',
          category: 'Trainer Award',
          points: 50,
          description: 'Consistent academic effort in UI/UX Design System workshop',
          awardedAt: '2026-10-22T16:00:00Z',
          source: 'trainer_award:u-005',
          awardedByUserId: 'u-005',
          awardedByName: 'Emily Rodriguez',
          awardedByRole: 'trainer',
        },
      ],
    },

    // David Kim
    'u-010': {
      studentId: 'u-010',
      totalPoints: 320, // Bronze Scholar
      currentRank: 'Bronze',
      currentStreak: 2,
      bestStreak: 5,
      lastLoginDate: yesterdayStr,
      claimedMilestones: [],
      completedQuizzes: {},
      history: [
        {
          id: 'pe-dk-001',
          studentId: 'u-010',
          category: 'Daily Login',
          points: 5,
          description: 'Daily login bonus',
          awardedAt: '2026-10-27T10:00:00Z',
          source: 'daily_login:2026-10-27',
          awardedByRole: 'system',
        },
      ],
    },
  };
}

function loadStoredProfiles(): Record<string, StudentGamificationRecord> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_GAMIFICATION_PROFILES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to parse gamification records from storage:', e);
  }
  return createInitialDemoProfiles();
}

function persistProfiles(profiles: Record<string, StudentGamificationRecord>): void {
  try {
    localStorage.setItem(STORAGE_KEY_GAMIFICATION_PROFILES, JSON.stringify(profiles));
  } catch (e) {
    console.warn('Failed to persist gamification records:', e);
  }
}

function loadStoredRankUps(): Record<string, RankUpPayload> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_UNACK_RANKUPS);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}
  return {};
}

function persistRankUps(rankUps: Record<string, RankUpPayload>): void {
  try {
    localStorage.setItem(STORAGE_KEY_UNACK_RANKUPS, JSON.stringify(rankUps));
  } catch {}
}

export const useGamificationStore = create<GamificationStoreState>((set, get) => ({
  profiles: loadStoredProfiles(),
  unacknowledgedRankUps: loadStoredRankUps(),

  getStudentProfile: (studentId?: string) => {
    const authUser = useAuthStore.getState().user;
    const targetId = studentId || authUser?.id || 'u-007';
    const existing = get().profiles[targetId];

    if (existing) {
      // Re-verify rank integrity based on current points
      const actualRank = getRankForPoints(existing.totalPoints).tier;
      if (actualRank !== existing.currentRank) {
        existing.currentRank = actualRank;
      }
      return {
        ...existing,
        events: existing.events || existing.history,
        streakData: existing.streakData || {
          currentStreak: existing.currentStreak,
          bestStreak: existing.bestStreak,
          lastLoginDate: existing.lastLoginDate,
        },
      };
    }

    // Initialize clean Bronze profile for newly discovered student
    const newProfile: StudentGamificationRecord = {
      studentId: targetId,
      totalPoints: 0,
      currentRank: 'Bronze',
      currentStreak: 0,
      bestStreak: 0,
      lastLoginDate: null,
      history: [],
      events: [],
      streakData: {
        currentStreak: 0,
        bestStreak: 0,
        lastLoginDate: null,
      },
      claimedMilestones: [],
      completedQuizzes: {},
    };

    set((state) => {
      const updated = { ...state.profiles, [targetId]: newProfile };
      persistProfiles(updated);
      return { profiles: updated };
    });

    return newProfile;
  },

  getRankProgressForStudent: (studentId?: string) => {
    const profile = get().getStudentProfile(studentId);
    return getRankProgress(profile.totalPoints);
  },

  getAllStudentProfiles: () => {
    return Object.values(get().profiles).map((p) => ({
      ...p,
      events: p.events || p.history,
      streakData: p.streakData || {
        currentStreak: p.currentStreak,
        bestStreak: p.bestStreak,
        lastLoginDate: p.lastLoginDate,
      },
    }));
  },

  recordDailyLogin: (studentId?: string) => {
    const authUser = useAuthStore.getState().user;
    const targetId = studentId || authUser?.id || 'u-007';
    const profile = get().getStudentProfile(targetId);
    const todayStr = getLocalCalendarDateString();

    // 1. Guard against duplicate awards on the same calendar day
    if (isSameDay(profile.lastLoginDate, todayStr)) {
      return {
        awarded: false,
        pointsAwarded: 0,
        dailyPoints: 0,
        newStreak: profile.currentStreak,
        streak: profile.currentStreak,
        bestStreak: profile.bestStreak,
        milestoneBonus: 0,
        milestoneDays: undefined,
        isAlreadyAwardedToday: true,
        message: 'Daily login reward already granted for today.',
      };
    }

    // 2. Calculate consecutive streak
    let nextStreak = 1;
    if (profile.lastLoginDate) {
      if (isConsecutiveDay(profile.lastLoginDate, todayStr)) {
        nextStreak = profile.currentStreak + 1;
      } else {
        // Missed a calendar day -> streak resets to 1
        nextStreak = 1;
      }
    }

    const nextBestStreak = Math.max(profile.bestStreak, nextStreak);
    const dailyPoints = GAMIFICATION_CONFIG.dailyLoginReward;

    // Create daily login event
    const dailyEvent: PointAwardEvent = {
      id: `pe-daily-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      studentId: targetId,
      category: 'Daily Login',
      points: dailyPoints,
      description: `Daily login reward (${todayStr})`,
      awardedAt: new Date().toISOString(),
      source: `daily_login:${todayStr}`,
      awardedByRole: 'system',
    };

    let totalAwarded = dailyPoints;
    const newHistory = [dailyEvent, ...profile.history];

    // 3. Check for consecutive login streak milestones
    let milestoneAchieved: { days: number; bonus: number; label: string } | undefined;
    const claimed = [...profile.claimedMilestones];

    const eligibleMilestone = GAMIFICATION_CONFIG.streakMilestones.find(
      (m) => m.days === nextStreak && !claimed.includes(m.days)
    );

    if (eligibleMilestone) {
      milestoneAchieved = {
        days: eligibleMilestone.days,
        bonus: eligibleMilestone.bonusPoints,
        label: eligibleMilestone.label,
      };
      claimed.push(eligibleMilestone.days);
      totalAwarded += eligibleMilestone.bonusPoints;

      const milestoneEvent: PointAwardEvent = {
        id: `pe-streak-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        studentId: targetId,
        category: 'Login Milestone',
        points: eligibleMilestone.bonusPoints,
        description: `Consecutive Login Milestone: ${eligibleMilestone.label} (${eligibleMilestone.days} days in a row)`,
        awardedAt: new Date().toISOString(),
        source: `streak_milestone:${eligibleMilestone.days}`,
        awardedByRole: 'system',
      };
      newHistory.unshift(milestoneEvent);
    }

    const nextTotalPoints = profile.totalPoints + totalAwarded;
    const oldRank = profile.currentRank;
    const nextRank = getRankForPoints(nextTotalPoints).tier;

    const updatedProfile: StudentGamificationRecord = {
      ...profile,
      totalPoints: nextTotalPoints,
      currentRank: nextRank,
      currentStreak: nextStreak,
      bestStreak: nextBestStreak,
      lastLoginDate: todayStr,
      history: newHistory,
      claimedMilestones: claimed,
    };

    // Check for rank-up promotion
    if (nextRank !== oldRank && getRankForPoints(nextTotalPoints).minPoints > getRankForPoints(profile.totalPoints).minPoints) {
      const rankUpPayload: RankUpPayload = {
        studentId: targetId,
        oldRank,
        previousRank: oldRank,
        newRank: nextRank,
        totalPoints: nextTotalPoints,
        promotedAt: new Date().toISOString(),
      };
      set((state) => {
        const nextRankUps = { ...state.unacknowledgedRankUps, [targetId]: rankUpPayload };
        persistRankUps(nextRankUps);
        return { unacknowledgedRankUps: nextRankUps };
      });
    }

    set((state) => {
      const nextProfiles = { ...state.profiles, [targetId]: updatedProfile };
      persistProfiles(nextProfiles);
      return { profiles: nextProfiles };
    });

    return {
      awarded: true,
      pointsAwarded: totalAwarded,
      dailyPoints,
      newStreak: nextStreak,
      streak: nextStreak,
      bestStreak: nextBestStreak,
      milestoneAchieved,
      milestoneBonus: milestoneAchieved?.bonus,
      milestoneDays: milestoneAchieved?.days,
      isAlreadyAwardedToday: false,
      message: milestoneAchieved
        ? `Welcome back! +${dailyPoints} points + ${milestoneAchieved.bonus} bonus points for a ${nextStreak}-day streak!`
        : `Welcome back! +${dailyPoints} learning points added to your score.`,
    };
  },

  recordQuizSubmission: (studentId: string, quizId: string, quizTitle: string, score: number) => {
    const profile = get().getStudentProfile(studentId);

    // Enforce deduplication: completion points awarded only once per quiz
    if (profile.completedQuizzes[quizId]) {
      return {
        awarded: false,
        completionAwarded: false,
        scoreBonusAwarded: false,
        pointsAwarded: 0,
        bonusPoints: 0,
        totalAwarded: 0,
        newPoints: profile.totalPoints,
        currentRank: profile.currentRank,
        rankChanged: false,
        isDuplicate: true,
        message: `Quiz "${quizTitle}" rewards have already been granted for this student.`,
      };
    }

    const completionPoints = GAMIFICATION_CONFIG.quizRewards.completionPoints;
    let bonusPoints = 0;

    if (score >= 95) {
      bonusPoints = GAMIFICATION_CONFIG.quizRewards.score95Bonus;
    } else if (score >= 80) {
      bonusPoints = GAMIFICATION_CONFIG.quizRewards.score80Bonus;
    }

    const totalPointsAwarded = completionPoints + bonusPoints;
    const events: PointAwardEvent[] = [];

    // 1. Completion Event
    events.push({
      id: `pe-quiz-${Date.now()}-c`,
      studentId,
      category: 'Quiz Completion',
      activityId: quizId,
      points: completionPoints,
      description: `Completed and submitted "${quizTitle}"`,
      awardedAt: new Date().toISOString(),
      source: `quiz_completion:${quizId}`,
      awardedByRole: 'system',
    });

    // 2. Score Achievement Event (if eligible)
    if (bonusPoints > 0) {
      events.push({
        id: `pe-quiz-${Date.now()}-s`,
        studentId,
        category: 'Quiz Achievement',
        activityId: quizId,
        points: bonusPoints,
        description: `Achieved ${score}% (Threshold >= ${score >= 95 ? '95%' : '80%'}) on "${quizTitle}"`,
        awardedAt: new Date().toISOString(),
        source: `quiz_score_bonus:${quizId}`,
        awardedByRole: 'system',
      });
    }

    const nextTotalPoints = profile.totalPoints + totalPointsAwarded;
    const oldRank = profile.currentRank;
    const nextRank = getRankForPoints(nextTotalPoints).tier;

    const updatedProfile: StudentGamificationRecord = {
      ...profile,
      totalPoints: nextTotalPoints,
      currentRank: nextRank,
      completedQuizzes: {
        ...profile.completedQuizzes,
        [quizId]: {
          completedAt: new Date().toISOString(),
          score,
          pointsAwarded: totalPointsAwarded,
        },
      },
      history: [...events, ...profile.history],
    };

    // Rank-up promotion check
    if (nextRank !== oldRank && getRankForPoints(nextTotalPoints).minPoints > getRankForPoints(profile.totalPoints).minPoints) {
      const rankUpPayload: RankUpPayload = {
        studentId,
        oldRank,
        previousRank: oldRank,
        newRank: nextRank,
        totalPoints: nextTotalPoints,
        promotedAt: new Date().toISOString(),
      };
      set((state) => {
        const nextRankUps = { ...state.unacknowledgedRankUps, [studentId]: rankUpPayload };
        persistRankUps(nextRankUps);
        return { unacknowledgedRankUps: nextRankUps };
      });
    }

    set((state) => {
      const nextProfiles = { ...state.profiles, [studentId]: updatedProfile };
      persistProfiles(nextProfiles);
      return { profiles: nextProfiles };
    });

    return {
      awarded: true,
      completionAwarded: true,
      scoreBonusAwarded: bonusPoints > 0,
      pointsAwarded: completionPoints,
      bonusPoints,
      totalAwarded: totalPointsAwarded,
      newPoints: nextTotalPoints,
      currentRank: nextRank,
      rankChanged: nextRank !== oldRank,
      isDuplicate: false,
      message: bonusPoints > 0
        ? `Quiz submitted! +${completionPoints} points + ${bonusPoints} excellence bonus (${score}%)!`
        : `Quiz submitted! +${completionPoints} completion points awarded.`,
    };
  },

  awardAcademicPoints: (params: AwardAcademicPointsParams) => {
    const studentId = params.studentId;
    const points = params.points;
    const reason = params.reason;
    const note = params.note;
    const awardedByRole = params.awardingRole || params.awardedByRole || 'trainer';
    const awardedByUserId = params.awardingUserId || params.awardedByUserId || 'u-001';
    const awardedByName = params.awardingUserName || params.awardedByName || 'Faculty';

    if (points <= 0) {
      return {
        success: false,
        pointsAwarded: 0,
        newTotal: 0,
        newPoints: 0,
        oldRank: 'Bronze',
        newRank: 'Bronze',
        currentRank: 'Bronze',
        rankUpOccurred: false,
        rankChanged: false,
        message: 'Points awarded must be a positive integer greater than zero.',
      };
    }

    const profile = get().getStudentProfile(studentId);
    const category: PointEventCategory = awardedByRole === 'admin' ? 'Admin Award' : 'Trainer Award';

    const awardEvent: PointAwardEvent = {
      id: `pe-academic-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      studentId,
      category,
      points,
      description: reason,
      reason,
      note: note?.trim() || undefined,
      awardedAt: new Date().toISOString(),
      timestamp: new Date().toISOString(),
      source: `${awardedByRole}_award:${awardedByUserId}:${Date.now()}`,
      awardingSource: `${awardedByRole === 'admin' ? 'Administration' : 'Trainer'}: ${awardedByName}`,
      awardedByUserId,
      awardedByName,
      awardedByRole,
    };

    const nextTotalPoints = profile.totalPoints + points;
    const oldRank = profile.currentRank;
    const nextRank = getRankForPoints(nextTotalPoints).tier;
    const rankUpOccurred = nextRank !== oldRank && getRankForPoints(nextTotalPoints).minPoints > getRankForPoints(profile.totalPoints).minPoints;

    const updatedProfile: StudentGamificationRecord = {
      ...profile,
      totalPoints: nextTotalPoints,
      currentRank: nextRank,
      history: [awardEvent, ...profile.history],
    };

    if (rankUpOccurred) {
      const rankUpPayload: RankUpPayload = {
        studentId,
        oldRank,
        previousRank: oldRank,
        newRank: nextRank,
        totalPoints: nextTotalPoints,
        promotedAt: new Date().toISOString(),
      };
      set((state) => {
        const nextRankUps = { ...state.unacknowledgedRankUps, [studentId]: rankUpPayload };
        persistRankUps(nextRankUps);
        return { unacknowledgedRankUps: nextRankUps };
      });
    }

    set((state) => {
      const nextProfiles = { ...state.profiles, [studentId]: updatedProfile };
      persistProfiles(nextProfiles);
      return { profiles: nextProfiles };
    });

    return {
      success: true,
      pointsAwarded: points,
      newTotal: nextTotalPoints,
      newPoints: nextTotalPoints,
      oldRank,
      newRank: nextRank,
      currentRank: nextRank,
      rankUpOccurred,
      rankChanged: rankUpOccurred,
      message: `Successfully awarded +${points} academic points to student.`,
    };
  },

  getUnacknowledgedRankUp: (studentId?: string) => {
    const authUser = useAuthStore.getState().user;
    const targetId = studentId || authUser?.id || 'u-007';
    return get().unacknowledgedRankUps[targetId] || null;
  },

  acknowledgeRankUp: (studentId: string) => {
    set((state) => {
      const updated = { ...state.unacknowledgedRankUps };
      delete updated[studentId];
      persistRankUps(updated);
      return { unacknowledgedRankUps: updated };
    });
  },

  getRankDistribution: () => {
    const profiles = Object.values(get().profiles);
    const dist: Record<RankTier, number> = {
      Bronze: 0,
      Silver: 0,
      Gold: 0,
      Platinum: 0,
      Diamond: 0,
      Master: 0,
      Legend: 0,
    };
    profiles.forEach((p) => {
      dist[p.currentRank] = (dist[p.currentRank] || 0) + 1;
    });
    return dist;
  },

  getPointsByCategory: () => {
    const profiles = Object.values(get().profiles);
    const totals: Record<PointEventCategory, number> = {
      'Daily Login': 0,
      'Login Streak': 0,
      'Login Milestone': 0,
      'Quiz Completion': 0,
      'Quiz Achievement': 0,
      'Trainer Award': 0,
      'Admin Award': 0,
      'Learning Milestone': 0,
    };
    profiles.forEach((p) => {
      p.history.forEach((h) => {
        totals[h.category] = (totals[h.category] || 0) + h.points;
      });
    });
    return totals;
  },

  getRecentAwardEvents: (limit: number = 10) => {
    const profiles = Object.values(get().profiles);
    const allEvents: PointAwardEvent[] = [];
    profiles.forEach((p) => allEvents.push(...p.history));
    return allEvents
      .sort((a, b) => new Date(b.awardedAt).getTime() - new Date(a.awardedAt).getTime())
      .slice(0, limit);
  },

  // Backwards-compatibility methods
  getTotalPoints: () => {
    const authUser = useAuthStore.getState().user;
    return get().getStudentProfile(authUser?.id).totalPoints;
  },

  getStreak: () => {
    const authUser = useAuthStore.getState().user;
    return get().getStudentProfile(authUser?.id).currentStreak;
  },

  getPointsHistory: () => {
    const authUser = useAuthStore.getState().user;
    return get().getStudentProfile(authUser?.id).history;
  },

  awardPoints: ({ userId, points, source, activity }) => {
    const profile = get().getStudentProfile(userId);
    const alreadyAwarded = profile.history.some((h) => h.source === source);

    if (alreadyAwarded) {
      return {
        success: false,
        pointsAwarded: 0,
        totalPoints: profile.totalPoints,
        isDuplicate: true,
        message: `Reward points already granted for this activity (${source}).`,
      };
    }

    if (points <= 0) {
      return {
        success: false,
        pointsAwarded: 0,
        totalPoints: profile.totalPoints,
        isDuplicate: false,
        message: 'Points must be positive.',
      };
    }

    const event: PointAwardEvent = {
      id: `pe-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      studentId: userId,
      category: 'Learning Milestone',
      points,
      description: activity,
      awardedAt: new Date().toISOString(),
      source,
      awardedByRole: 'system',
    };

    const nextPoints = profile.totalPoints + points;
    const nextRank = getRankForPoints(nextPoints).tier;

    const updated = {
      ...profile,
      totalPoints: nextPoints,
      currentRank: nextRank,
      history: [event, ...profile.history],
    };

    set((state) => {
      const nextProfiles = { ...state.profiles, [userId]: updated };
      persistProfiles(nextProfiles);
      return { profiles: nextProfiles };
    });

    return {
      success: true,
      pointsAwarded: points,
      totalPoints: nextPoints,
      isDuplicate: false,
      message: `Awarded +${points} points for "${activity}".`,
    };
  },

  resetToDefault: () => {
    const initial = createInitialDemoProfiles();
    set({ profiles: initial, unacknowledgedRankUps: {} });
    persistProfiles(initial);
    persistRankUps({});
  },
}));
