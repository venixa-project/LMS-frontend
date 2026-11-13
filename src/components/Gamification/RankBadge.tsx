// ============================================================
// LMS - Metallic Rank Badge Component
// Renders Bronze, Silver, Gold, Platinum, Diamond, Master, Legend
// with metallic borders, custom gradients, and aura glows.
// ============================================================

import React from 'react';
import { RankTier, RankTierConfig, RANK_TIERS, getRankForPoints } from '../../lib/gamificationConfig';
import { Sparkles, Crown, Shield, Award, Zap } from 'lucide-react';
import { useThemeStore } from '../../lib/themeStore';

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
  const { resolvedTheme } = useThemeStore();
  const isLight = resolvedTheme === 'light';

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

  const lightTierStyles: Record<string, { bg: string; border: string; text: string; shadow: string }> = {
    bronze: { bg: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)', border: '#fdba74', text: '#9a3412', shadow: '0 1px 3px rgba(154, 52, 18, 0.12)' },
    silver: { bg: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', border: '#cbd5e1', text: '#334155', shadow: '0 1px 3px rgba(51, 65, 85, 0.1)' },
    gold: { bg: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)', border: '#fcd34d', text: '#b45309', shadow: '0 1px 3px rgba(180, 83, 9, 0.15)' },
    platinum: { bg: 'linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%)', border: '#5eead4', text: '#0f766e', shadow: '0 1px 3px rgba(15, 118, 110, 0.15)' },
    diamond: { bg: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)', border: '#7dd3fc', text: '#0369a1', shadow: '0 1px 3px rgba(3, 105, 161, 0.15)' },
    master: { bg: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)', border: '#d8b4fe', text: '#7e22ce', shadow: '0 1px 3px rgba(126, 34, 206, 0.15)' },
    legend: { bg: 'linear-gradient(135deg, #fefce8 0%, #fef08a 100%)', border: '#facc15', text: '#854d0e', shadow: '0 1px 3px rgba(133, 77, 14, 0.2)' },
  };

  const currentTierKey = resolvedTierConfig.tier.toLowerCase();
  const lightConfig = isLight ? (lightTierStyles[currentTierKey] || lightTierStyles.bronze) : null;

  const bgStyle = lightConfig ? lightConfig.bg : resolvedTierConfig.bgGradient;
  const borderStyle = lightConfig ? `1.5px solid ${lightConfig.border}` : `1.5px solid ${resolvedTierConfig.borderColor}`;
  const textStyle = lightConfig ? lightConfig.text : resolvedTierConfig.textColor;
  const shadowStyle = lightConfig ? lightConfig.shadow : (showAura ? resolvedTierConfig.auraGlow : '0 2px 8px rgba(0,0,0,0.2)');

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
        background: bgStyle,
        border: borderStyle,
        color: textStyle,
        fontWeight: 800,
        fontSize: sizeStyles.fontSize,
        letterSpacing: '0.04em',
        boxShadow: shadowStyle,
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
          <Crown size={sizeStyles.iconSize} color={isLight ? '#854d0e' : '#fef08a'} strokeWidth={2.5} />
        ) : resolvedTierConfig.tier === 'Master' ? (
          <Sparkles size={sizeStyles.iconSize} color={isLight ? '#7e22ce' : '#e9d5ff'} strokeWidth={2.5} />
        ) : resolvedTierConfig.tier === 'Diamond' ? (
          <Zap size={sizeStyles.iconSize} color={isLight ? '#0369a1' : '#7dd3fc'} strokeWidth={2.5} />
        ) : (
          <Award size={sizeStyles.iconSize} color={textStyle} strokeWidth={2.2} />
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
            borderLeft: lightConfig ? `1px solid ${lightConfig.border}` : `1px solid ${resolvedTierConfig.borderColor}`,
          }}
        >
          {points.toLocaleString()} XP
        </span>
      )}
    </div>
  );
};
