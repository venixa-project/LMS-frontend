// ============================================================
// LMS - Gamified Leaderboard Data Engine & Multi-Timeframe Store
// ============================================================

export type TimeframeFilter = 'weekly' | 'monthly' | 'all_time';

export type AchievementId = 'champion' | 'top_performer' | 'fast_riser' | 'consistency' | 'milestone';

export interface AchievementBadge {
  id: AchievementId;
  name: string;
  icon: string;
  description: string;
  color: string;
}

export const ACHIEVEMENT_DEFINITIONS: Record<AchievementId, AchievementBadge> = {
  champion: {
    id: 'champion',
    name: 'Champion',
    icon: '🏆',
    description: 'Reached 1st place on the academy leaderboard',
    color: '#ffd700',
  },
  top_performer: {
    id: 'top_performer',
    name: 'Top Performer',
    icon: '⭐',
    description: 'Secured a spot in the top 3 podium',
    color: '#38bdf8',
  },
  fast_riser: {
    id: 'fast_riser',
    name: 'Fast Riser',
    icon: '🚀',
    description: 'Gained 2 or more positions in this ranking cycle',
    color: '#10b981',
  },
  consistency: {
    id: 'consistency',
    name: 'Consistency Star',
    icon: '🔥',
    description: 'Maintained a verified 10+ day study streak',
    color: '#f97316',
  },
  milestone: {
    id: 'milestone',
    name: 'Milestone Master',
    icon: '🎯',
    description: 'Surpassed 3,000 XP or completed 3+ full courses',
    color: '#a855f7',
  },
};

export interface LeaderboardMember {
  id: string;
  name: string;
  email: string;
  rollNo: string;
  avatarInitials: string;
  avatarId?: string;
  avatarBg?: string;
  cohort: string;
  coursesEnrolled: number;
  coursesCompleted: number;
  overallCompletionRate: number; // percentage (0..100)
  points: number;
  previousRank: number; // For calculating rank change delta
  certificates: number;
  weeklyStudyHours: number;
  badgesEarned: number;
  streakDays: number;
  recentCourseFinished: string;
  isCurrentUser?: boolean;
}

// -------------------------------------------------------------
// Base Member Profiles
// -------------------------------------------------------------
export const TIMEFRAME_DATA: Record<TimeframeFilter, LeaderboardMember[]> = {
  all_time: [],
  monthly: [],
  weekly: [],
};

// -------------------------------------------------------------
// Helper to compute badges earned by a member based on rank and stats
// -------------------------------------------------------------
export function computeMemberBadges(member: LeaderboardMember, currentRank: number): AchievementBadge[] {
  const badges: AchievementBadge[] = [];

  // Champion
  if (currentRank === 1) {
    badges.push(ACHIEVEMENT_DEFINITIONS.champion);
  }

  // Top Performer
  if (currentRank <= 3) {
    badges.push(ACHIEVEMENT_DEFINITIONS.top_performer);
  }

  // Fast Riser: gained 2+ positions
  const positionsGained = member.previousRank - currentRank;
  if (positionsGained >= 2) {
    badges.push(ACHIEVEMENT_DEFINITIONS.fast_riser);
  }

  // Consistency Star: 10+ streak days
  if (member.streakDays >= 10) {
    badges.push(ACHIEVEMENT_DEFINITIONS.consistency);
  }

  // Milestone Master: points >= 3000 or coursesCompleted >= 3
  if (member.points >= 3000 || member.coursesCompleted >= 3) {
    badges.push(ACHIEVEMENT_DEFINITIONS.milestone);
  }

  return badges;
}
