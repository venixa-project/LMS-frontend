// ============================================================
// LMS - Metallic Rank Badge Component
// Renders Bronze, Silver, Gold, Platinum, Diamond, Master, Legend
// with metallic borders, custom gradients, and aura glows.
// ============================================================

import React from 'react';
import { RankTier, RankTierConfig, RANK_TIERS, getRankForPoints } from '../../lib/gamificationConfig';
import { Sparkles, Crown, Shield, Award, Zap } from 'lucide-react';

export interface RankBadgeProps {
  tier?: RankTier | RankTierConfig | string;
  points?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showLabel?: boolean;
  showPoints?: boolean;
  showAura?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const RankBadge: React.FC<RankBadgeProps> = ({
  tier,
  points,
  size = 'md',
  showLabel = true,
  showPoints = false,
  showAura = false,
  className = '',
  style = {},
}) => {
  // Resolve tier either directly or from points
  const resolvedTierConfig: RankTierConfig = React.useMemo(() => {
    if (tier) {
      if (typeof tier === 'object' && tier !== null && 'tier' in tier) {
        return tier as RankTierConfig;
      }
      const tierStr = String(tier).toLowerCase();
      const match = RANK_TIERS.find((r) => r.tier.toLowerCase() === tierStr || r.id === tierStr);
      if (match) return match;
    }
    if (typeof points === 'number') {
      return getRankForPoints(points);
    }
    return RANK_TIERS[0];
  }, [tier, points]);

  const sizeStyles = {
    xs: { padding: '2px 8px', fontSize: '0.68rem', iconSize: 10, gap: '4px', borderRadius: '6px' },
    sm: { padding: '3px 10px', fontSize: '0.74rem', iconSize: 12, gap: '5px', borderRadius: '8px' },
    md: { padding: '5px 14px', fontSize: '0.82rem', iconSize: 14, gap: '6px', borderRadius: '999px' },
    lg: { padding: '8px 18px', fontSize: '0.92rem', iconSize: 16, gap: '8px', borderRadius: '999px' },
    xl: { padding: '12px 24px', fontSize: '1.15rem', iconSize: 22, gap: '10px', borderRadius: '16px' },
  }[size];

  return (
    <div
      className={`rank-badge ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: sizeStyles.gap,
        padding: sizeStyles.padding,
        borderRadius: sizeStyles.borderRadius,
        background: resolvedTierConfig.bgGradient,
        border: `1.5px solid ${resolvedTierConfig.borderColor}`,
        color: resolvedTierConfig.textColor,
        fontWeight: 800,
        fontSize: sizeStyles.fontSize,
        letterSpacing: '0.04em',
        boxShadow: showAura ? resolvedTierConfig.auraGlow : '0 2px 8px rgba(0,0,0,0.2)',
        position: 'relative',
        textTransform: 'uppercase',
        userSelect: 'none',
        whiteSpace: 'nowrap',
        ...style,
      }}
      title={`${resolvedTierConfig.label} (${resolvedTierConfig.description})`}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center' }}>
        {resolvedTierConfig.tier === 'Legend' ? (
          <Crown size={sizeStyles.iconSize} color="#fef08a" strokeWidth={2.5} />
        ) : resolvedTierConfig.tier === 'Master' ? (
          <Sparkles size={sizeStyles.iconSize} color="#e9d5ff" strokeWidth={2.5} />
        ) : resolvedTierConfig.tier === 'Diamond' ? (
          <Zap size={sizeStyles.iconSize} color="#7dd3fc" strokeWidth={2.5} />
        ) : (
          <Award size={sizeStyles.iconSize} color={resolvedTierConfig.textColor} strokeWidth={2.2} />
        )}
      </span>

      {showLabel && <span>{resolvedTierConfig.tier}</span>}

      {showPoints && typeof points === 'number' && (
        <span
          style={{
            fontSize: '0.85em',
            fontWeight: 700,
            opacity: 0.85,
            paddingLeft: '4px',
            borderLeft: `1px solid ${resolvedTierConfig.borderColor}`,
          }}
        >
          {points.toLocaleString()} XP
        </span>
      )}
    </div>
  );
};
