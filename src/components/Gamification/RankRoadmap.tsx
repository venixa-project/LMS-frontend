import React from 'react';
import { CheckCircle2, Lock, ArrowRight, Sparkles, Crown } from 'lucide-react';
import { RANK_TIERS, RankTier, RankTierConfig, getRankForPoints, getNextRank, getRankProgress } from '../../lib/gamificationConfig';
import { RankBadge } from './RankBadge';

interface RankRoadmapProps {
  points: number;
  currentTier?: RankTier | RankTierConfig | string;
  className?: string;
  compact?: boolean;
}

export const RankRoadmap: React.FC<RankRoadmapProps> = ({
  points,
  currentTier,
  className = '',
  compact = false,
}) => {
  const activeTier: RankTierConfig = React.useMemo(() => {
    if (currentTier) {
      if (typeof currentTier === 'object' && currentTier !== null && 'tier' in currentTier) {
        return currentTier as RankTierConfig;
      }
      const tierStr = String(currentTier).toLowerCase();
      const match = RANK_TIERS.find((r) => r.tier.toLowerCase() === tierStr || r.id === tierStr);
      if (match) return match;
    }
    return getRankForPoints(points);
  }, [currentTier, points]);

  const nextTier = getNextRank(activeTier.tier);
  const progress = getRankProgress(points);

  return (
    <div
      className={`card ${className}`}
      style={{
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 27, 75, 0.7) 100%)',
        border: '1px solid rgba(129, 140, 248, 0.25)',
        borderRadius: '20px',
        padding: compact ? '16px' : '24px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background Ambient Glow */}
      <div
        style={{
          position: 'absolute',
          top: '-30px',
          left: '20%',
          width: '300px',
          height: '180px',
          background: `radial-gradient(circle, ${activeTier.color}25 0%, transparent 70%)`,
          filter: 'blur(45px)',
          pointerEvents: 'none',
        }}
      />

      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: compact ? '12px' : '20px',
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
              background: 'rgba(99, 102, 241, 0.15)',
              border: '1px solid rgba(129, 140, 248, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#818cf8',
            }}
          >
            <Crown size={18} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: compact ? '0.95rem' : '1.05rem', fontWeight: 800, color: '#fff' }}>
              Rank Progression Roadmap
            </h4>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>
              7 competitive tiers from Bronze to Legend
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 800,
              padding: '4px 10px',
              borderRadius: '999px',
              background: `${activeTier.color}20`,
              color: activeTier.color,
              border: `1px solid ${activeTier.color}40`,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Sparkles size={12} />
            {activeTier.name.toUpperCase()} &bull; {points.toLocaleString()} Points
          </span>
          {nextTier && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>
              Next: <strong style={{ color: nextTier.color }}>{nextTier.name}</strong> ({progress.pointsToNextRank.toLocaleString()} pts needed)
            </span>
          )}
        </div>
      </div>

      {/* Roadmap Track Container */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '12px',
          position: 'relative',
        }}
      >
        {RANK_TIERS.map((tier, index) => {
          const isPassed = points >= (tier.maxPoints ? tier.maxPoints + 1 : 10000);
          const isCurrent = activeTier.id === tier.id;
          const isNext = nextTier?.id === tier.id;
          const isLocked = !isPassed && !isCurrent;

          return (
            <div
              key={tier.id}
              style={{
                position: 'relative',
                borderRadius: '16px',
                padding: '14px 10px',
                textAlign: 'center',
                transition: 'all 0.3s ease',
                background: isCurrent
                  ? `linear-gradient(145deg, ${tier.color}25 0%, rgba(15, 23, 42, 0.95) 75%)`
                  : isPassed
                  ? 'rgba(30, 41, 59, 0.65)'
                  : 'rgba(15, 23, 42, 0.45)',
                border: isCurrent
                  ? `2px solid ${tier.color}`
                  : isPassed
                  ? '1px solid rgba(16, 185, 129, 0.35)'
                  : isNext
                  ? `1px dashed ${tier.color}70`
                  : '1px solid rgba(255, 255, 255, 0.06)',
                boxShadow: isCurrent
                  ? `0 8px 24px -4px ${tier.color}40, inset 0 0 16px ${tier.color}20`
                  : 'none',
                opacity: isLocked && !isNext ? 0.65 : 1,
              }}
            >
              {/* Status Indicator Chip */}
              <div
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                }}
              >
                {isPassed ? (
                  <CheckCircle2 size={15} color="#10b981" />
                ) : isCurrent ? (
                  <span
                    style={{
                      fontSize: '0.6rem',
                      fontWeight: 900,
                      color: '#0f172a',
                      background: tier.color,
                      padding: '2px 6px',
                      borderRadius: '999px',
                      letterSpacing: '0.04em',
                    }}
                  >
                    YOU
                  </span>
                ) : isNext ? (
                  <span
                    style={{
                      fontSize: '0.6rem',
                      fontWeight: 800,
                      color: tier.color,
                      background: `${tier.color}20`,
                      padding: '2px 6px',
                      borderRadius: '999px',
                      border: `1px solid ${tier.color}40`,
                    }}
                  >
                    NEXT
                  </span>
                ) : (
                  <Lock size={13} color="rgba(255, 255, 255, 0.3)" />
                )}
              </div>

              {/* Rank Badge Visual */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
                <RankBadge tier={tier} size="md" showAura={isCurrent} />
              </div>

              {/* Tier Name */}
              <div
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  color: isCurrent ? tier.color : isPassed ? '#fff' : 'var(--text-secondary, #cbd5e1)',
                  marginBottom: '2px',
                  letterSpacing: '0.02em',
                }}
              >
                {tier.name}
              </div>

              {/* Threshold info */}
              <div
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  color: isCurrent ? tier.color : 'var(--text-muted, #94a3b8)',
                }}
              >
                {tier.maxPoints
                  ? `${tier.minPoints.toLocaleString()} - ${tier.maxPoints.toLocaleString()} pts`
                  : `${tier.minPoints.toLocaleString()}+ pts`}
              </div>

              {/* Current Progress bar inside card if current */}
              {isCurrent && (
                <div style={{ marginTop: '10px' }}>
                  <div
                    style={{
                      height: '4px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '999px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${progress.progressPercent}%`,
                        height: '100%',
                        background: `linear-gradient(90deg, ${tier.color}, #fff)`,
                        borderRadius: '999px',
                      }}
                    />
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginTop: '4px',
                      fontSize: '0.62rem',
                      color: 'var(--text-muted, #94a3b8)',
                      fontWeight: 700,
                    }}
                  >
                    <span>{progress.progressPercent}%</span>
                    <span>
                      {tier.id === 'legend' ? 'MAX' : `${progress.pointsToNextRank} to go`}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
