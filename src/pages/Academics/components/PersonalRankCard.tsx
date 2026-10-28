import React from 'react';
import {
  Trophy, TrendingUp, TrendingDown, Minus, Flame,
  CheckCircle2, BookOpen, Zap, Award, ArrowUpRight
} from 'lucide-react';
import { LeaderboardMember } from '../leaderboardData';
import { AnimatedAvatar } from '../../../components/AnimatedAvatar';

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

  const isFirstPlace = currentRank === 1;
  const rankDelta = currentUser.previousRank - currentRank; // positive = gained ranks

  // Progress to next rank calculation
  let progressPercent = 100;
  let pointsNeeded = 0;

  if (!isFirstPlace && nextRankMember) {
    pointsNeeded = Math.max(0, nextRankMember.points - currentUser.points + 10);
    // Calculate progress between a sensible baseline or direct ratio
    const currentPts = currentUser.points;
    const targetPts = nextRankMember.points;
    if (targetPts > 0) {
      progressPercent = Math.min(99, Math.max(10, Math.round((currentPts / targetPts) * 100)));
    } else {
      progressPercent = 50;
    }
  }

  return (
    <div
      className="card"
      style={{
        padding: '24px',
        background: isFirstPlace
          ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(15, 23, 42, 0.85) 65%)'
          : 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(15, 23, 42, 0.85) 65%)',
        border: isFirstPlace
          ? '1.5px solid rgba(255, 215, 0, 0.5)'
          : '1.5px solid rgba(129, 140, 248, 0.35)',
        borderRadius: '20px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: isFirstPlace
          ? '0 10px 30px -5px rgba(245, 158, 11, 0.2)'
          : '0 10px 30px -5px rgba(99, 102, 241, 0.15)',
        transition: 'all 0.4s ease',
      }}
    >
      {/* Background Glow */}
      <div
        style={{
          position: 'absolute',
          top: '-40px',
          right: '-40px',
          width: '240px',
          height: '240px',
          borderRadius: '50%',
          background: isFirstPlace
            ? 'radial-gradient(circle, rgba(255, 215, 0, 0.18) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(99, 102, 241, 0.2) 0%, transparent 70%)',
          filter: 'blur(35px)',
          pointerEvents: 'none',
        }}
      />

      {/* Top Header Label */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: isFirstPlace ? '#ffd700' : 'var(--primary-light, #818cf8)',
              background: isFirstPlace ? 'rgba(255, 215, 0, 0.12)' : 'rgba(99, 102, 241, 0.14)',
              border: isFirstPlace ? '1px solid rgba(255, 215, 0, 0.35)' : '1px solid rgba(129, 140, 248, 0.25)',
              padding: '3px 10px',
              borderRadius: '999px',
            }}
          >
            Your Performance &bull; {timeframeLabel}
          </span>
          {isFirstPlace && (
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                color: '#0f172a',
                background: '#ffd700',
                padding: '3px 10px',
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

        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Ranked against <strong>{totalMembers} Active Scholars</strong>
        </div>
      </div>

      {/* Main Grid: Profile Info & Key Metrics */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(250px, 1.2fr) minmax(280px, 1.8fr)',
          gap: '24px',
          alignItems: 'center',
        }}
      >
        {/* Left Column: Avatar & Identification (Clickable to Inspect) */}
        <div
          onClick={onInspect}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            cursor: onInspect ? 'pointer' : 'default',
            padding: '6px 10px',
            borderRadius: '16px',
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
              size={68}
              rank={currentRank}
              showRankBadge={true}
              isCurrentUser={true}
              interactive={true}
            />
          </div>

          {/* User Details & Quick Stats */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#fff' }}>
                {currentUser.name.replace(' (You)', '')}
              </h3>
              <span className="badge badge-primary" style={{ fontSize: '0.62rem' }}>YOU</span>
            </div>
            <div className="text-secondary text-xs" style={{ marginBottom: '8px' }}>
              {currentUser.cohort} &bull; {currentUser.rollNo}
            </div>

            {/* Micro Stats Row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.78rem',
                  color: '#f97316',
                  fontWeight: 700,
                }}
              >
                <Flame size={14} color="#f97316" />
                {currentUser.streakDays}d Streak
              </span>

              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>&bull;</span>

              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.78rem',
                  color: '#38bdf8',
                  fontWeight: 600,
                }}
              >
                <BookOpen size={13} color="#38bdf8" />
                {currentUser.coursesCompleted} of {currentUser.coursesEnrolled} Courses (84%)
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Points, Rank Movement, & Next Rank Progress */}
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
            borderRadius: '16px',
            padding: '16px 20px',
          }}
        >
          {/* Top row: Points & Movement */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <span className="text-muted text-xs" style={{ textTransform: 'uppercase', fontWeight: 600 }}>Total Learning Points</span>
              <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#ffd700', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Zap size={18} color="#ffd700" />
                {currentUser.points.toLocaleString()} XP
              </div>
            </div>

            {/* Rank Movement Indicator */}
            <div style={{ textAlign: 'right' }}>
              <span className="text-muted text-xs" style={{ textTransform: 'uppercase', fontWeight: 600 }}>Rank Movement</span>
              <div style={{ marginTop: '2px' }}>
                {rankDelta > 0 ? (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: 'rgba(16, 185, 129, 0.15)',
                      border: '1px solid rgba(16, 185, 129, 0.35)',
                      color: '#10b981',
                      padding: '3px 10px',
                      borderRadius: '999px',
                      fontSize: '0.8rem',
                      fontWeight: 800,
                    }}
                  >
                    <TrendingUp size={14} /> +{rankDelta} {rankDelta === 1 ? 'position' : 'positions'}
                  </span>
                ) : rankDelta < 0 ? (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: 'rgba(244, 63, 94, 0.15)',
                      border: '1px solid rgba(244, 63, 94, 0.35)',
                      color: '#f43f5e',
                      padding: '3px 10px',
                      borderRadius: '999px',
                      fontSize: '0.8rem',
                      fontWeight: 800,
                    }}
                  >
                    <TrendingDown size={14} /> {rankDelta} positions
                  </span>
                ) : (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: 'rgba(148, 163, 184, 0.15)',
                      border: '1px solid rgba(148, 163, 184, 0.25)',
                      color: '#94a3b8',
                      padding: '3px 10px',
                      borderRadius: '999px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                    }}
                  >
                    <Minus size={14} /> Stable
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Progress Bar toward Next Rank */}
          <div>
            {isFirstPlace ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#ffd700', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Trophy size={14} color="#ffd700" /> You're at the top! Outstanding Achievement
                  </span>
                  <span style={{ fontSize: '0.78rem', color: '#ffd700', fontWeight: 800 }}>100% Champion</span>
                </div>
                <div style={{ height: '8px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '999px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      background: 'linear-gradient(90deg, #f59e0b, #ffd700)',
                      borderRadius: '999px',
                      boxShadow: '0 0 12px rgba(255, 215, 0, 0.6)',
                    }}
                  />
                </div>
              </div>
            ) : nextRankMember ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Next Rank: <strong style={{ color: '#fff' }}>#{currentRank - 1} {nextRankMember.name}</strong> ({nextRankMember.points.toLocaleString()} XP)
                  </span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--primary)', fontWeight: 800 }}>
                    {pointsNeeded.toLocaleString()} XP needed
                  </span>
                </div>
                <div style={{ height: '8px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '999px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${progressPercent}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #2563eb, #818cf8)',
                      borderRadius: '999px',
                      transition: 'width 0.8s ease',
                      boxShadow: '0 0 10px rgba(99, 102, 241, 0.5)',
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
