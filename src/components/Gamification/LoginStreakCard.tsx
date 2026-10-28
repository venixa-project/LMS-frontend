import React from 'react';
import { Flame, Trophy, Calendar, Gift, Sparkles, CheckCircle2 } from 'lucide-react';
import { GAMIFICATION_CONFIG, getNextStreakMilestone } from '../../lib/gamificationConfig';

interface LoginStreakCardProps {
  currentStreak: number;
  bestStreak: number;
  todayRewarded?: boolean;
  className?: string;
  compact?: boolean;
}

export const LoginStreakCard: React.FC<LoginStreakCardProps> = ({
  currentStreak,
  bestStreak,
  todayRewarded = true,
  className = '',
  compact = false,
}) => {
  const nextMilestoneObj = getNextStreakMilestone(currentStreak);
  const nextMilestoneDays = nextMilestoneObj ? nextMilestoneObj.days : null;
  const daysToNext = nextMilestoneDays ? Math.max(0, nextMilestoneDays - currentStreak) : 0;
  const milestoneBonus = nextMilestoneObj ? (nextMilestoneObj.bonusPoints || nextMilestoneObj.bonus) : 0;

  // Calculate progress to next milestone
  let progressPercent = 100;
  if (nextMilestoneDays) {
    const milestones = [0, 3, 7, 14, 30];
    const prevMilestone = [...milestones].reverse().find((m) => m <= currentStreak) || 0;
    const range = nextMilestoneDays - prevMilestone;
    const progressInRange = currentStreak - prevMilestone;
    progressPercent = Math.min(100, Math.max(0, Math.round((progressInRange / range) * 100)));
  }

  // Motivational message
  let motivationalMessage = 'Consistent daily learning accelerates your ranking!';
  if (daysToNext === 1) {
    motivationalMessage = 'Just one more qualifying day to unlock the milestone bonus!';
  } else if (currentStreak >= 30) {
    motivationalMessage = 'Incredible dedication! You are a master of daily consistency.';
  } else if (currentStreak >= 7) {
    motivationalMessage = 'On fire! Your daily momentum is compounding your points.';
  } else if (currentStreak >= 3) {
    motivationalMessage = 'Great rhythm! Keep checking in every day to claim milestone bonuses.';
  }

  return (
    <div
      className={`card ${className}`}
      style={{
        background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.85) 0%, rgba(15, 23, 42, 0.95) 100%)',
        border: '1.5px solid rgba(249, 115, 22, 0.35)',
        borderRadius: '20px',
        padding: compact ? '16px' : '22px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 8px 30px -6px rgba(249, 115, 22, 0.15)',
      }}
    >
      {/* Background Flame Aura */}
      <div
        style={{
          position: 'absolute',
          top: '-30px',
          right: '-20px',
          width: '180px',
          height: '180px',
          background: 'radial-gradient(circle, rgba(249, 115, 22, 0.18) 0%, transparent 70%)',
          filter: 'blur(35px)',
          pointerEvents: 'none',
        }}
      />

      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '14px',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '10px',
              background: 'rgba(249, 115, 22, 0.15)',
              border: '1px solid rgba(249, 115, 22, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#f97316',
            }}
          >
            <Flame size={18} />
          </div>
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#f97316',
            }}
          >
            Your Login Streak
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {todayRewarded ? (
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                color: '#10b981',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                padding: '2px 8px',
                borderRadius: '999px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <CheckCircle2 size={12} /> Today: +{GAMIFICATION_CONFIG.dailyLoginPoints} pts claimed
            </span>
          ) : (
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                color: '#f59e0b',
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                padding: '2px 8px',
                borderRadius: '999px',
              }}
            >
              Today's Reward Pending
            </span>
          )}
        </div>
      </div>

      {/* Main Stats Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: compact ? '1fr 1fr' : '1.2fr 1fr',
          gap: '14px',
          alignItems: 'center',
          marginBottom: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span
              style={{
                fontSize: compact ? '1.8rem' : '2.3rem',
                fontWeight: 900,
                color: '#fff',
                lineHeight: 1,
                letterSpacing: '-0.02em',
              }}
            >
              {currentStreak}
            </span>
            <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#f97316' }}>
              {currentStreak === 1 ? 'Day in a Row' : 'Days in a Row'}
            </span>
          </div>
          <div
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-muted, #94a3b8)',
              marginTop: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Trophy size={13} color="#ffd700" />
            Best Streak: <strong style={{ color: '#fff' }}>{bestStreak} Days</strong>
          </div>
        </div>

        {/* Next Milestone Box */}
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.65)',
            border: '1px solid rgba(249, 115, 22, 0.2)',
            borderRadius: '12px',
            padding: '10px 12px',
            textAlign: 'center',
          }}
        >
          {nextMilestoneDays ? (
            <>
              <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: 'var(--text-muted, #94a3b8)', fontWeight: 700 }}>
                Next Milestone
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#fb923c', marginTop: '1px' }}>
                {nextMilestoneDays} Days
              </div>
              <div style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 700 }}>
                +{milestoneBonus} Bonus Points
              </div>
            </>
          ) : (
            <div style={{ fontSize: '0.78rem', color: '#ffd700', fontWeight: 800 }}>
              Max Milestone Mastered!
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar toward next milestone */}
      {nextMilestoneDays && (
        <div style={{ marginBottom: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: '5px' }}>
            <span style={{ color: 'var(--text-secondary, #cbd5e1)' }}>
              {daysToNext === 0
                ? 'Milestone achieved!'
                : `${daysToNext} more ${daysToNext === 1 ? 'day' : 'days'} to milestone`}
            </span>
            <span style={{ color: '#f97316', fontWeight: 800 }}>
              {progressPercent}%
            </span>
          </div>
          <div
            style={{
              height: '6px',
              background: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '999px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${progressPercent}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #ea580c, #f97316, #fbbf24)',
                borderRadius: '999px',
                transition: 'width 0.8s ease',
                boxShadow: '0 0 10px rgba(249, 115, 22, 0.5)',
              }}
            />
          </div>
        </div>
      )}

      {/* Motivational message footer */}
      <div
        style={{
          fontSize: '0.73rem',
          color: 'var(--text-secondary, #cbd5e1)',
          background: 'rgba(255, 255, 255, 0.03)',
          borderLeft: '2px solid #f97316',
          padding: '6px 10px',
          borderRadius: '0 8px 8px 0',
          fontStyle: 'italic',
        }}
      >
        {motivationalMessage}
      </div>
    </div>
  );
};
