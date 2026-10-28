// ============================================================
// LMS - Premium Straight-Line Rank Progression Roadmap
// Displays 7 competitive tiers: Bronze -> Silver -> Gold -> Platinum -> Diamond -> Master -> Legend
// Features: Connected horizontal timeline with completed fill,
// "YOU ARE HERE" indicator, interactive milestone detail popovers,
// responsive contained scroll, and progress info panel below.
// ============================================================

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  CheckCircle2, Check, Lock, Crown, Sparkles, Award, Shield,
  Zap, Trophy, MapPin, X, Info, ArrowRight, ChevronRight, Star
} from 'lucide-react';
import {
  RANK_TIERS,
  RankTier,
  RankTierConfig,
  getRankForPoints,
  getNextRank,
  getRankProgress
} from '../../lib/gamificationConfig';
import { useGamificationStore } from '../../lib/gamificationStore';

export interface RankRoadmapProps {
  points?: number;
  studentId?: string;
  currentTier?: RankTier | RankTierConfig | string;
  className?: string;
  compact?: boolean;
}

export const RankRoadmap: React.FC<RankRoadmapProps> = ({
  points,
  studentId = 'u-007',
  currentTier,
  className = '',
  compact = false,
}) => {
  const { profiles, getUnacknowledgedRankUp, acknowledgeRankUp } = useGamificationStore();
  const profile = profiles[studentId] || profiles['u-007'];

  // Resolve total eligible points from props or store profile safely
  const effectivePoints = useMemo(() => {
    if (typeof points === 'number') {
      return Math.max(0, Math.floor(points));
    }
    if (profile?.totalPoints !== undefined) {
      return Math.max(0, Math.floor(profile.totalPoints));
    }
    return 0;
  }, [points, profile?.totalPoints]);

  // Determine current tier configuration
  const activeTierConfig: RankTierConfig = useMemo(() => {
    if (currentTier) {
      if (typeof currentTier === 'object' && currentTier !== null && 'tier' in currentTier) {
        return currentTier as RankTierConfig;
      }
      const tierStr = String(currentTier).toLowerCase();
      const match = RANK_TIERS.find((r) => r.tier.toLowerCase() === tierStr || r.id === tierStr);
      if (match) return match;
    }
    return getRankForPoints(effectivePoints);
  }, [currentTier, effectivePoints]);

  // Next rank tier & progress metrics
  const nextTierConfig = useMemo(() => {
    return getNextRank(activeTierConfig.tier);
  }, [activeTierConfig]);

  const isLegend = activeTierConfig.id === 'legend' || !nextTierConfig;

  // Exact math according to specifications:
  // progressPercentage = (current points - current-rank min) / (next-rank threshold - current-rank min) * 100
  // pointsRemaining = next-rank threshold - current points
  const progressMetrics = useMemo(() => {
    if (isLegend) {
      return {
        progressPercent: 100,
        pointsRemaining: 0,
        tierFloor: activeTierConfig.minPoints,
        tierCeil: null,
      };
    }

    const currentMin = activeTierConfig.minPoints;
    const nextMin = nextTierConfig.minPoints;
    const range = nextMin - currentMin;
    const pointsInTier = Math.max(0, effectivePoints - currentMin);
    const rawPercent = range > 0 ? (pointsInTier / range) * 100 : 0;
    const progressPercent = Math.min(100, Math.max(0, Math.round(rawPercent * 10) / 10));
    const pointsRemaining = Math.max(0, nextMin - effectivePoints);

    return {
      progressPercent,
      pointsRemaining,
      tierFloor: currentMin,
      tierCeil: nextMin,
    };
  }, [effectivePoints, activeTierConfig, nextTierConfig, isLegend]);

  // Milestone Detail Popover state
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setSelectedMilestoneId(null);
      }
    };
    if (selectedMilestoneId) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [selectedMilestoneId]);

  // Check for genuine unacknowledged rankup promotion
  const unackRankUp = useMemo(() => {
    return getUnacknowledgedRankUp(studentId);
  }, [studentId, getUnacknowledgedRankUp]);

  const [showCelebrationBanner, setShowCelebrationBanner] = useState(false);

  useEffect(() => {
    if (unackRankUp) {
      setShowCelebrationBanner(true);
    }
  }, [unackRankUp]);

  const handleDismissCelebration = () => {
    setShowCelebrationBanner(false);
    if (studentId) {
      acknowledgeRankUp(studentId);
    }
  };

  // Current tier index in the 7-tier scale (0 = Bronze, 6 = Legend)
  const currentTierIndex = useMemo(() => {
    return RANK_TIERS.findIndex((t) => t.id === activeTierConfig.id);
  }, [activeTierConfig]);

  // Calculate the horizontal line filled percentage between nodes (0% to 100%)
  const trackLineFillPercent = useMemo(() => {
    if (isLegend) return 100;
    const totalSegments = RANK_TIERS.length - 1; // 6 segments
    const completedSegments = Math.max(0, currentTierIndex);
    const intraSegmentProgress = progressMetrics.progressPercent / 100;
    const overallFraction = (completedSegments + intraSegmentProgress) / totalSegments;
    return Math.min(100, Math.max(0, Math.round(overallFraction * 1000) / 10));
  }, [currentTierIndex, progressMetrics.progressPercent, isLegend]);

  // Helper to render milestone icon
  const renderMilestoneIcon = (tierId: string, color: string) => {
    switch (tierId) {
      case 'bronze':
        return <Award size={20} color={color} strokeWidth={2.4} />;
      case 'silver':
        return <Shield size={20} color={color} strokeWidth={2.4} />;
      case 'gold':
        return <Trophy size={20} color={color} strokeWidth={2.4} />;
      case 'platinum':
        return <Sparkles size={20} color={color} strokeWidth={2.4} />;
      case 'diamond':
        return <Zap size={20} color={color} strokeWidth={2.4} />;
      case 'master':
        return <Crown size={20} color={color} strokeWidth={2.4} />;
      case 'legend':
        return <Crown size={22} color={color} strokeWidth={2.8} />;
      default:
        return <Star size={20} color={color} strokeWidth={2.4} />;
    }
  };

  return (
    <div
      className={`card rank-roadmap-card ${className}`}
      style={{
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.96) 0%, rgba(30, 27, 75, 0.65) 100%)',
        border: '1px solid rgba(129, 140, 248, 0.25)',
        borderRadius: '16px',
        padding: compact ? '14px 16px' : '18px 22px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 8px 28px -4px rgba(0, 0, 0, 0.45)',
      }}
    >
      {/* Background Ambient Glow */}
      <div
        style={{
          position: 'absolute',
          top: '-40px',
          left: '15%',
          width: '360px',
          height: '200px',
          background: `radial-gradient(circle, ${activeTierConfig.color}20 0%, transparent 70%)`,
          filter: 'blur(50px)',
          pointerEvents: 'none',
        }}
      />

      {/* Optional Genuine Rank-Up Celebration Toast Banner */}
      {showCelebrationBanner && unackRankUp && (
        <div
          style={{
            background: `linear-gradient(90deg, rgba(251, 191, 36, 0.22) 0%, rgba(99, 102, 241, 0.22) 100%)`,
            border: '1px solid rgba(251, 191, 36, 0.55)',
            borderRadius: '12px',
            padding: '12px 16px',
            marginBottom: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            boxShadow: '0 4px 16px rgba(251, 191, 36, 0.25)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: '#fbbf24',
                color: '#0f172a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
              }}
            >
              <Crown size={18} />
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#fef08a' }}>
                🎉 Genuine Rank Promotion Achieved!
              </div>
              <div style={{ fontSize: '0.74rem', color: '#f1f5f9' }}>
                Congratulations, you advanced from <strong>{unackRankUp.oldRank}</strong> to{' '}
                <strong style={{ color: activeTierConfig.color }}>{unackRankUp.newRank}</strong> with{' '}
                {effectivePoints.toLocaleString()} points!
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDismissCelebration}
            className="btn btn-sm btn-ghost"
            style={{ color: '#fef08a', padding: '4px 8px', fontSize: '0.75rem' }}
          >
            Acknowledge &times;
          </button>
        </div>
      )}

      {/* 1. TOP HEADER & SUMMARY PILLS */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '14px',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '12px',
              background: 'rgba(99, 102, 241, 0.16)',
              border: '1px solid rgba(129, 140, 248, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary)',
            }}
          >
            <Crown size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3
                style={{
                  margin: 0,
                  fontSize: compact ? '1rem' : '1.15rem',
                  fontWeight: 800,
                  color: '#ffffff',
                  letterSpacing: '-0.01em',
                }}
              >
                Rank Progress Roadmap
              </h3>
              <span
                className="badge"
                style={{
                  background: 'rgba(56, 189, 248, 0.12)',
                  color: '#38bdf8',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  fontSize: '0.66rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '999px',
                }}
              >
                7 Tiers
              </span>
            </div>
            <p
              style={{
                margin: '2px 0 0',
                fontSize: '0.74rem',
                color: 'var(--text-muted, #94a3b8)',
              }}
            >
              Bronze to Legend progression based on verified learning points
            </p>
          </div>
        </div>

        {/* Header Right Standing Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 12px',
              borderRadius: '999px',
              background: `${activeTierConfig.color}16`,
              border: `1px solid ${activeTierConfig.color}45`,
              color: activeTierConfig.color,
              fontSize: '0.75rem',
              fontWeight: 800,
            }}
          >
            <Sparkles size={13} />
            <span>{activeTierConfig.name.toUpperCase()} SCHOLAR</span>
            <span style={{ color: 'rgba(255, 255, 255, 0.4)', margin: '0 2px' }}>&bull;</span>
            <span style={{ color: '#ffffff' }}>{effectivePoints.toLocaleString()} PTS</span>
          </div>

          <span
            style={{
              fontSize: '0.72rem',
              color: 'var(--text-muted, #94a3b8)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Info size={12} />
            Click any rank to inspect requirements
          </span>
        </div>
      </div>

      {/* 2. STRAIGHT-LINE HORIZONTAL PROGRESSION TRACK */}
      <div
        className="rank-roadmap-scroll"
        style={{
          width: '100%',
          overflowX: 'auto',
          paddingBottom: '14px',
          paddingTop: '6px',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <div
          style={{
            minWidth: '760px',
            position: 'relative',
            padding: '24px 16px 20px',
          }}
        >
          {/* Base Track Line (Uncompleted / Remaining Portion) */}
          <div
            style={{
              position: 'absolute',
              top: '50px',
              left: '52px',
              right: '52px',
              height: '4px',
              borderRadius: '2px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderTop: '1px dashed rgba(255, 255, 255, 0.15)',
              zIndex: 1,
            }}
          />

          {/* Active Completed Segment of the Track Line */}
          <div
            style={{
              position: 'absolute',
              top: '50px',
              left: '52px',
              width: `calc((100% - 104px) * ${trackLineFillPercent / 100})`,
              height: '4px',
              borderRadius: '2px',
              background: 'linear-gradient(90deg, #cd7f32 0%, #cbd5e1 20%, #ffd700 40%, #38bdf8 60%, #c084fc 80%, #fbbf24 100%)',
              boxShadow: `0 0 10px ${activeTierConfig.color}90`,
              zIndex: 2,
              transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          />

          {/* 7 Horizontal Milestone Nodes */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              position: 'relative',
              zIndex: 3,
            }}
          >
            {RANK_TIERS.map((tier, index) => {
              const isPassed = effectivePoints >= (tier.maxPoints ? tier.maxPoints + 1 : 10000);
              const isCurrent = activeTierConfig.id === tier.id;
              const isNext = nextTierConfig?.id === tier.id;
              const isLocked = !isPassed && !isCurrent;
              const isSelected = selectedMilestoneId === tier.id;

              return (
                <div
                  key={tier.id}
                  tabIndex={0}
                  role="button"
                  aria-label={`${tier.name} Rank milestone. Minimum ${tier.minPoints} points. Status: ${
                    isCurrent ? 'Current rank' : isPassed ? 'Achieved' : 'Upcoming'
                  }`}
                  onClick={() =>
                    setSelectedMilestoneId((prev) => (prev === tier.id ? null : tier.id))
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedMilestoneId((prev) => (prev === tier.id ? null : tier.id));
                    }
                  }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    cursor: 'pointer',
                    outline: 'none',
                    padding: '0 4px',
                    transition: 'transform 0.2s ease',
                  }}
                >
                  {/* Milestone Circular Badge Node */}
                  <div
                    style={{
                      width: '52px',
                      height: '52px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      background: isCurrent
                        ? tier.bgGradient
                        : isPassed
                        ? `linear-gradient(135deg, ${tier.color}35 0%, rgba(15, 23, 42, 0.95) 100%)`
                        : 'rgba(15, 23, 42, 0.75)',
                      border: isSelected
                        ? '3px solid #ffffff'
                        : isCurrent
                        ? `2.5px solid ${tier.color}`
                        : isPassed
                        ? `2px solid ${tier.color}`
                        : '1.5px solid rgba(255, 255, 255, 0.12)',
                      boxShadow: isCurrent
                        ? `0 0 18px ${tier.color}80, inset 0 0 10px ${tier.color}40`
                        : isSelected
                        ? '0 0 16px rgba(255, 255, 255, 0.5)'
                        : isPassed
                        ? '0 2px 10px rgba(0, 0, 0, 0.35)'
                        : 'none',
                      opacity: isLocked && !isNext ? 0.6 : 1,
                      transition: 'all 0.25s ease',
                    }}
                  >
                    {/* Icon inside the node */}
                    {renderMilestoneIcon(tier.id, isCurrent || isPassed ? tier.color : '#94a3b8')}

                    {/* Pin Status Marker (Top-Right) */}
                    <div
                      style={{
                        position: 'absolute',
                        top: '-3px',
                        right: '-3px',
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: isPassed
                          ? '#10b981'
                          : isCurrent
                          ? tier.color
                          : isNext
                          ? 'rgba(56, 189, 248, 0.3)'
                          : 'rgba(30, 41, 59, 0.9)',
                        border: '1.5px solid #0f172a',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                      }}
                    >
                      {isPassed ? (
                        <Check size={11} strokeWidth={3.5} color="#ffffff" />
                      ) : isCurrent ? (
                        <Sparkles size={10} color="#0f172a" strokeWidth={3} />
                      ) : isNext ? (
                        <ArrowRight size={10} color="#38bdf8" strokeWidth={3} />
                      ) : (
                        <Lock size={9} color="rgba(255, 255, 255, 0.45)" strokeWidth={2.5} />
                      )}
                    </div>
                  </div>

                  {/* Rank Name */}
                  <span
                    style={{
                      fontSize: '0.825rem',
                      fontWeight: 800,
                      color: isCurrent
                        ? tier.color
                        : isPassed
                        ? '#ffffff'
                        : 'var(--text-secondary, #cbd5e1)',
                      marginTop: '10px',
                      letterSpacing: '0.01em',
                    }}
                  >
                    {tier.name}
                  </span>

                  {/* Minimum Points Required */}
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      color: isCurrent ? tier.color : 'var(--text-muted, #94a3b8)',
                      marginTop: '1px',
                    }}
                  >
                    {tier.minPoints.toLocaleString()} {tier.id === 'legend' ? '+ pts' : 'pts'}
                  </span>

                  {/* "YOU ARE HERE" Indicator for Current Rank */}
                  {isCurrent ? (
                    <div
                      style={{
                        marginTop: '6px',
                        background: tier.color,
                        color: '#040711',
                        fontSize: '0.58rem',
                        fontWeight: 900,
                        padding: '2px 8px',
                        borderRadius: '999px',
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                        boxShadow: `0 2px 8px ${tier.color}60`,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <MapPin size={9} strokeWidth={3} /> YOU ARE HERE
                    </div>
                  ) : isPassed ? (
                    <span
                      style={{
                        fontSize: '0.62rem',
                        fontWeight: 700,
                        color: '#34d399',
                        marginTop: '4px',
                      }}
                    >
                      Achieved &check;
                    </span>
                  ) : isNext ? (
                    <span
                      style={{
                        fontSize: '0.62rem',
                        fontWeight: 700,
                        color: tier.color,
                        marginTop: '4px',
                        background: `${tier.color}15`,
                        padding: '1px 6px',
                        borderRadius: '4px',
                        border: `1px solid ${tier.color}35`,
                      }}
                    >
                      Next Target
                    </span>
                  ) : (
                    <span
                      style={{
                        fontSize: '0.62rem',
                        fontWeight: 500,
                        color: 'rgba(255, 255, 255, 0.3)',
                        marginTop: '4px',
                      }}
                    >
                      Locked
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. INTERACTIVE MILESTONE DETAIL POPOVER */}
      {selectedMilestoneId && (() => {
        const selectedTier = RANK_TIERS.find((t) => t.id === selectedMilestoneId);
        if (!selectedTier) return null;

        const isPassed = effectivePoints >= (selectedTier.maxPoints ? selectedTier.maxPoints + 1 : 10000);
        const isCurrent = activeTierConfig.id === selectedTier.id;
        const ptsNeeded = Math.max(0, selectedTier.minPoints - effectivePoints);

        return (
          <div
            ref={popoverRef}
            style={{
              background: 'rgba(15, 23, 42, 0.98)',
              border: `1.5px solid ${selectedTier.borderColor}`,
              borderRadius: '16px',
              padding: '16px 20px',
              marginTop: '12px',
              marginBottom: '16px',
              boxShadow: `0 8px 28px rgba(0, 0, 0, 0.5), 0 0 20px ${selectedTier.color}25`,
              position: 'relative',
            }}
          >
            <button
              type="button"
              onClick={() => setSelectedMilestoneId(null)}
              aria-label="Close milestone details"
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                color: 'var(--text-muted, #94a3b8)',
                borderRadius: '6px',
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <X size={14} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: selectedTier.bgGradient,
                  border: `1px solid ${selectedTier.borderColor}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {renderMilestoneIcon(selectedTier.id, selectedTier.color)}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: selectedTier.color }}>
                    {selectedTier.name} Tier &mdash; {selectedTier.label}
                  </h4>
                  <span
                    className="badge"
                    style={{
                      background: isCurrent
                        ? `${selectedTier.color}25`
                        : isPassed
                        ? 'rgba(16, 185, 129, 0.2)'
                        : 'rgba(255, 255, 255, 0.08)',
                      color: isCurrent
                        ? selectedTier.color
                        : isPassed
                        ? '#34d399'
                        : 'var(--text-muted, #94a3b8)',
                      fontSize: '0.66rem',
                      fontWeight: 700,
                    }}
                  >
                    {isCurrent ? 'Current Active Rank' : isPassed ? 'Rank Achieved ✓' : 'Upcoming Rank'}
                  </span>
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary, #cbd5e1)', marginTop: '2px' }}>
                  Threshold:{' '}
                  <strong style={{ color: '#fff' }}>
                    {selectedTier.minPoints.toLocaleString()}
                    {selectedTier.maxPoints ? ` – ${selectedTier.maxPoints.toLocaleString()} pts` : '+ pts'}
                  </strong>
                  {!isPassed && !isCurrent && (
                    <span style={{ color: 'var(--primary)', marginLeft: '8px' }}>
                      ({ptsNeeded.toLocaleString()} points needed to unlock)
                    </span>
                  )}
                </div>
              </div>
            </div>

            <p style={{ margin: '6px 0 10px', fontSize: '0.78rem', color: 'var(--text-muted, #94a3b8)', lineHeight: 1.4 }}>
              {selectedTier.description}
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Tier Perks:
              </span>
              {selectedTier.perks.map((perk, pIdx) => (
                <span
                  key={pIdx}
                  style={{
                    fontSize: '0.7rem',
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    padding: '2px 8px',
                    color: 'var(--text-secondary, #cbd5e1)',
                  }}
                >
                  &bull; {perk}
                </span>
              ))}
            </div>
          </div>
        );
      })()}

      {/* 4. INFORMATION PROGRESS PANEL BELOW ROADMAP (Requirement 4 & 5) */}
      <div
        style={{
          background: 'rgba(15, 23, 42, 0.78)',
          border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
          borderRadius: '14px',
          padding: '14px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        {/* Top Split: Left Side (Your Rank) vs Right Side (Next Rank or Legend Message) */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          {/* Left Side — Your Rank */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '14px',
                background: activeTierConfig.bgGradient,
                border: `2px solid ${activeTierConfig.borderColor}`,
                boxShadow: activeTierConfig.auraGlow,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {renderMilestoneIcon(activeTierConfig.id, activeTierConfig.color)}
            </div>
            <div>
              <div
                style={{
                  fontSize: '0.68rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'var(--text-muted, #94a3b8)',
                  fontWeight: 700,
                }}
              >
                Your Current Rank
              </div>
              <div
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  color: activeTierConfig.color,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  lineHeight: 1.2,
                }}
              >
                <span>{activeTierConfig.name}</span>
                <span
                  style={{
                    background: `${activeTierConfig.color}22`,
                    color: activeTierConfig.color,
                    border: `1px solid ${activeTierConfig.color}50`,
                    fontSize: '0.66rem',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '6px',
                  }}
                >
                  {activeTierConfig.label}
                </span>
              </div>
              <div
                style={{
                  fontSize: '0.825rem',
                  color: '#ffffff',
                  fontWeight: 700,
                  marginTop: '3px',
                }}
              >
                {effectivePoints.toLocaleString()}{' '}
                <span style={{ color: 'var(--text-muted, #94a3b8)', fontWeight: 500, fontSize: '0.74rem' }}>
                  Total Eligible Points
                </span>
              </div>
            </div>
          </div>

          {/* Right Side — Next Rank or Legend Message */}
          {!isLegend && nextTierConfig ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                textAlign: 'right',
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: '0.68rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: 'var(--text-muted, #94a3b8)',
                    fontWeight: 700,
                  }}
                >
                  Next Rank Target
                </div>
                <div
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    color: nextTierConfig.color,
                    lineHeight: 1.2,
                  }}
                >
                  {nextTierConfig.name}
                </div>
                <div
                  style={{
                    fontSize: '0.8rem',
                    color: 'var(--text-secondary, #cbd5e1)',
                    fontWeight: 600,
                    marginTop: '3px',
                  }}
                >
                  Requires{' '}
                  <strong style={{ color: nextTierConfig.color }}>
                    {nextTierConfig.minPoints.toLocaleString()}
                  </strong>{' '}
                  pts
                </div>
              </div>
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '14px',
                  background: nextTierConfig.bgGradient,
                  border: `2px solid ${nextTierConfig.borderColor}`,
                  boxShadow: nextTierConfig.auraGlow,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {renderMilestoneIcon(nextTierConfig.id, nextTierConfig.color)}
              </div>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                background: 'rgba(251, 191, 36, 0.12)',
                border: '1px solid rgba(251, 191, 36, 0.35)',
                padding: '10px 16px',
                borderRadius: '12px',
              }}
            >
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: '#fbbf24',
                  color: '#040711',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Crown size={22} strokeWidth={2.8} />
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#fef08a' }}>
                  Pinnacle of Academic Excellence
                </div>
                <div style={{ fontSize: '0.73rem', color: '#fde68a' }}>
                  You have achieved the highest rank in VeniLearn LMS!
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Progress Bar & Numerical Metrics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* Stats row above bar */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.78rem',
            }}
          >
            <span style={{ color: 'var(--text-secondary, #cbd5e1)', fontWeight: 600 }}>
              {isLegend ? (
                <span style={{ color: '#fbbf24', fontWeight: 700 }}>
                  Legend Tier Fully Mastered
                </span>
              ) : (
                <>
                  Progress toward <strong style={{ color: nextTierConfig?.color }}>{nextTierConfig?.name}</strong>
                </>
              )}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span
                style={{
                  fontWeight: 800,
                  color: isLegend ? '#fbbf24' : '#ffffff',
                  fontSize: '0.85rem',
                }}
              >
                {progressMetrics.progressPercent}%
              </span>
              <span style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '0.75rem' }}>
                ({effectivePoints.toLocaleString()} /{' '}
                {isLegend
                  ? effectivePoints.toLocaleString()
                  : nextTierConfig?.minPoints.toLocaleString()}{' '}
                pts)
              </span>
            </div>
          </div>

          {/* Progress Bar Container */}
          <div
            style={{
              height: '10px',
              background: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '999px',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <div
              className="rank-roadmap-progress-fill"
              style={{
                width: `${progressMetrics.progressPercent}%`,
                height: '100%',
                background: isLegend
                  ? 'linear-gradient(90deg, #fbbf24, #f59e0b)'
                  : `linear-gradient(90deg, ${activeTierConfig.color}, ${nextTierConfig?.color || '#ffffff'})`,
                borderRadius: '999px',
                transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: `0 0 10px ${isLegend ? '#fbbf24' : activeTierConfig.color}80`,
              }}
            />
          </div>

          {/* Remaining points text */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.74rem',
              flexWrap: 'wrap',
              gap: '6px',
            }}
          >
            <span style={{ color: 'var(--text-muted, #94a3b8)' }}>
              {isLegend
                ? 'Permanent Hall of Fame Member'
                : `Tier Minimum: ${activeTierConfig.minPoints.toLocaleString()} pts`}
            </span>
            <span
              style={{
                fontWeight: 700,
                color: isLegend ? '#34d399' : 'var(--primary, #818cf8)',
              }}
            >
              {isLegend
                ? 'Maximum Rank Attained'
                : `${progressMetrics.pointsRemaining.toLocaleString()} points remaining to reach ${nextTierConfig?.name}`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
