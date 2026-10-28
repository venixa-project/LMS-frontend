import React from 'react';
import {
  Trophy, TrendingUp, TrendingDown, Minus, Flame,
  CheckCircle2, BookOpen, Zap, Award, ArrowUpRight, Crown
} from 'lucide-react';
import { LeaderboardMember } from '../leaderboardData';
import { AnimatedAvatar } from '../../../components/AnimatedAvatar';
import { useGamificationStore } from '../../../lib/gamificationStore';
import { getRankForPoints, getNextRank, getRankProgress } from '../../../lib/gamificationConfig';
import { RankBadge } from '../../../components/Gamification/RankBadge';

interface PersonalRankCardProps {
  currentUser: LeaderboardMember | null;
  currentRank: number;
  nextRankMember: LeaderboardMember | null;
  totalMembers: number;
  timeframeLabel: string;
  onInspect?: () => void;
}

export const PersonalRankCard: React.FC<PersonalRankCardProps> = ({
  currentUser,
  currentRank,
  nextRankMember,
  totalMembers,
  timeframeLabel,
  onInspect,
}) => {
  if (!currentUser) return null;

  const { profiles } = useGamificationStore();
  const studentProfile = profiles[currentUser.id] || profiles['u-007'];

  // Total points and competitive rank tier calculation
  const totalPoints = studentProfile ? studentProfile.totalPoints : currentUser.points;
  const rankTier = getRankForPoints(totalPoints);
  const nextTier = getNextRank(rankTier.tier);
  const rankProgress = getRankProgress(totalPoints);
  const currentStreak = studentProfile
    ? (studentProfile.streakData?.currentStreak ?? studentProfile.currentStreak)
    : currentUser.streakDays;
  const totalRewardsEarned = studentProfile
    ? (studentProfile.events?.length ?? studentProfile.history?.length ?? 0)
    : 12;

  const isFirstPlace = currentRank === 1;
  const rankDelta = currentUser.previousRank - currentRank; // positive = gained ranks

  return (
    <div
      className="card"
      style={{
        padding: '16px 20px',
        background: isFirstPlace
          ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(15, 23, 42, 0.85) 65%)'
          : 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(15, 23, 42, 0.85) 65%)',
        border: isFirstPlace
          ? '1.5px solid rgba(255, 215, 0, 0.5)'
          : '1.5px solid rgba(129, 140, 248, 0.35)',
        borderRadius: '16px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: isFirstPlace
          ? '0 8px 24px -4px rgba(245, 158, 11, 0.2)'
          : '0 8px 24px -4px rgba(99, 102, 241, 0.15)',
        transition: 'all 0.4s ease',
      }}
    >
      {/* Background Glow */}
      <div
        style={{
          position: 'absolute',
          top: '-40px',
          right: '-40px',
          width: '200px',
          height: '200px',
          borderRadius: '50%',
          background: isFirstPlace
            ? 'radial-gradient(circle, rgba(255, 215, 0, 0.18) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(99, 102, 241, 0.2) 0%, transparent 70%)',
          filter: 'blur(35px)',
          pointerEvents: 'none',
        }}
      />

      {/* Top Header Label */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontSize: '0.7rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: isFirstPlace ? '#ffd700' : 'var(--primary-light, #818cf8)',
              background: isFirstPlace ? 'rgba(255, 215, 0, 0.12)' : 'rgba(99, 102, 241, 0.14)',
              border: isFirstPlace ? '1px solid rgba(255, 215, 0, 0.35)' : '1px solid rgba(129, 140, 248, 0.25)',
              padding: '2px 8px',
              borderRadius: '999px',
            }}
          >
            Your Performance &bull; {timeframeLabel}
          </span>
          {isFirstPlace && (
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 800,
                color: '#0f172a',
                background: '#ffd700',
                padding: '2px 8px',
                borderRadius: '999px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              👑 Current Leader
            </span>
          )}
        </div>

        <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
          Ranked against <strong>{totalMembers} Active Scholars</strong>
        </div>
      </div>

      {/* Main Grid: Profile Info & Key Metrics */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(250px, 1.2fr) minmax(280px, 1.8fr)',
          gap: '16px',
          alignItems: 'center',
        }}
      >
        {/* Left Column: Avatar & Identification (Clickable to Inspect) */}
        <div
          onClick={onInspect}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            cursor: onInspect ? 'pointer' : 'default',
            padding: '4px 8px',
            borderRadius: '14px',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            if (onInspect) {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
            }
          }}
          onMouseLeave={(e) => {
            if (onInspect) {
              e.currentTarget.style.background = 'transparent';
            }
          }}
          title={onInspect ? 'Click to inspect your scholar analytics' : undefined}
        >
          {/* Avatar with Rank Pill */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <AnimatedAvatar
              avatarId={currentUser.avatarId}
              name={currentUser.name.replace(' (You)', '')}
              size={54}
              rank={currentRank}
              showRankBadge={true}
              isCurrentUser={true}
              interactive={true}
            />
          </div>

          {/* User Details & Quick Stats */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#fff' }}>
                {currentUser.name.replace(' (You)', '')}
              </h3>
              <span className="badge badge-primary" style={{ fontSize: '0.62rem' }}>YOU</span>
            </div>
            <div className="text-secondary text-xs" style={{ marginBottom: '6px' }}>
              {currentUser.cohort} &bull; {currentUser.rollNo}
            </div>

            {/* Micro Stats Row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <RankBadge tier={rankTier} size="xs" />
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: rankTier.color }}>
                  {rankTier.name}
                </span>
              </div>

              <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>&bull;</span>

              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.76rem',
                  color: '#f97316',
                  fontWeight: 700,
                }}
              >
                <Flame size={13} color="#f97316" />
                {currentStreak}d Streak
              </span>

              <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>&bull;</span>

              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.76rem',
                  color: '#10b981',
                  fontWeight: 600,
                }}
              >
                <Award size={12} color="#10b981" />
                {totalRewardsEarned} Rewards
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Points, Rank Movement, & Next Rank Progress */}
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
            borderRadius: '14px',
            padding: '12px 16px',
          }}
        >
          {/* Top row: Points & Movement */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="text-muted text-xs" style={{ textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
                  MY LEARNING RANK &bull;
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: 900, color: rankTier.color, textTransform: 'uppercase' }}>
                  {rankTier.name}
                </span>
              </div>
              <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#ffd700', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Zap size={18} color="#ffd700" />
                {totalPoints.toLocaleString()} Learning Points
              </div>
            </div>

            {/* Leaderboard Standing & Movement Indicator */}
            <div style={{ textAlign: 'right' }}>
              <span className="text-muted text-xs" style={{ textTransform: 'uppercase', fontWeight: 600 }}>
                Leaderboard Position
              </span>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px', marginTop: '2px' }}>
                <span style={{ fontSize: '0.95rem', fontWeight: 900, color: '#fff' }}>
                  #{currentRank}
                </span>
                {rankDelta > 0 ? (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '2px',
                      background: 'rgba(16, 185, 129, 0.15)',
                      border: '1px solid rgba(16, 185, 129, 0.35)',
                      color: '#10b981',
                      padding: '2px 6px',
                      borderRadius: '999px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                    }}
                  >
                    <TrendingUp size={12} /> +{rankDelta}
                  </span>
                ) : rankDelta < 0 ? (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '2px',
                      background: 'rgba(244, 63, 94, 0.15)',
                      border: '1px solid rgba(244, 63, 94, 0.35)',
                      color: '#f43f5e',
                      padding: '2px 6px',
                      borderRadius: '999px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                    }}
                  >
                    <TrendingDown size={12} /> {rankDelta}
                  </span>
                ) : (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '2px',
                      background: 'rgba(148, 163, 184, 0.15)',
                      border: '1px solid rgba(148, 163, 184, 0.25)',
                      color: '#94a3b8',
                      padding: '2px 6px',
                      borderRadius: '999px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                    }}
                  >
                    <Minus size={12} /> Stable
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Progress Bar toward Next Rank */}
          <div>
            {rankTier.id === 'legend' ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#ffd700', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Crown size={15} color="#ffd700" /> MAX RANK REACHED (Legendary Scholar)
                  </span>
                  <span style={{ fontSize: '0.78rem', color: '#ffd700', fontWeight: 800 }}>100% Champion</span>
                </div>
                <div style={{ height: '8px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '999px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      background: 'linear-gradient(90deg, #f59e0b, #ffd700, #ec4899)',
                      borderRadius: '999px',
                      boxShadow: '0 0 12px rgba(255, 215, 0, 0.6)',
                    }}
                  />
                </div>
              </div>
            ) : nextTier ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Progress to <strong style={{ color: nextTier.color }}>{nextTier.name}</strong>: <strong>{rankProgress.progressPercent}%</strong>
                  </span>
                  <span style={{ fontSize: '0.78rem', color: nextTier.color, fontWeight: 800 }}>
                    {rankProgress.pointsToNextRank.toLocaleString()} Points Needed
                  </span>
                </div>
                <div style={{ height: '8px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '999px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${rankProgress.progressPercent}%`,
                      height: '100%',
                      background: `linear-gradient(90deg, ${rankTier.color}, ${nextTier.color})`,
                      borderRadius: '999px',
                      transition: 'width 0.8s ease',
                      boxShadow: `0 0 10px ${rankTier.color}60`,
                    }}
                  />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
