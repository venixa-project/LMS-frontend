import React, { useEffect, useState } from 'react';
import { Sparkles, Trophy, ArrowRight, X, Crown, Check } from 'lucide-react';
import { RANK_TIERS, RankTier, getRankForPoints, getNextRank, getRankProgress } from '../../lib/gamificationConfig';
import { useGamificationStore } from '../../lib/gamificationStore';
import { RankBadge } from './RankBadge';

interface RankUpModalProps {
  studentId: string;
  onDismiss?: () => void;
}

export const RankUpModal: React.FC<RankUpModalProps> = ({ studentId, onDismiss }) => {
  const { unacknowledgedRankUps, profiles, acknowledgeRankUp } = useGamificationStore();
  const pendingRankUp = unacknowledgedRankUps[studentId];
  const profile = profiles[studentId];

  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (pendingRankUp) {
      setVisible(true);
    } else {
      setVisible(false);
    }
  }, [pendingRankUp]);

  if (!visible || !pendingRankUp || !profile) return null;

  const oldRankStr = String(pendingRankUp.previousRank || pendingRankUp.oldRank || 'Bronze').toLowerCase();
  const newRankStr = String(pendingRankUp.newRank || 'Silver').toLowerCase();
  const prevTier = RANK_TIERS.find((t) => t.id.toLowerCase() === oldRankStr || t.tier.toLowerCase() === oldRankStr) || RANK_TIERS[0];
  const newTier = RANK_TIERS.find((t) => t.id.toLowerCase() === newRankStr || t.tier.toLowerCase() === newRankStr) || RANK_TIERS[1];
  const nextTier = getNextRank(newTier.tier);
  const progress = getRankProgress(profile.totalPoints);

  const handleClose = () => {
    setVisible(false);
    acknowledgeRankUp(studentId);
    if (onDismiss) onDismiss();
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(5, 10, 24, 0.88)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        padding: '20px',
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '520px',
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 27, 75, 0.95) 100%)',
          border: `2px solid ${newTier.color}`,
          borderRadius: '26px',
          padding: '32px 24px',
          boxShadow: `0 25px 60px -10px rgba(0, 0, 0, 0.8), 0 0 50px -10px ${newTier.color}50`,
          position: 'relative',
          textAlign: 'center',
          overflow: 'hidden',
          animation: 'modalSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Confetti / Particle Embellishments */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '100%',
            pointerEvents: 'none',
            overflow: 'hidden',
          }}
        >
          {Array.from({ length: 18 }).map((_, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                top: `${(i * 19) % 90}%`,
                left: `${(i * 23) % 95}%`,
                width: `${4 + (i % 5) * 2}px`,
                height: `${4 + (i % 5) * 2}px`,
                borderRadius: i % 2 === 0 ? '50%' : '2px',
                background: i % 3 === 0 ? newTier.color : i % 3 === 1 ? '#ffd700' : '#818cf8',
                opacity: 0.6,
                transform: `rotate(${i * 25}deg)`,
              }}
            />
          ))}
        </div>

        {/* Ambient Top Glow */}
        <div
          style={{
            position: 'absolute',
            top: '-50px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '280px',
            height: '200px',
            background: `radial-gradient(circle, ${newTier.color}40 0%, transparent 70%)`,
            filter: 'blur(45px)',
            pointerEvents: 'none',
          }}
        />

        {/* Close Button */}
        <button
          onClick={handleClose}
          style={{
            position: 'absolute',
            top: '18px',
            right: '18px',
            background: 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--text-secondary, #cbd5e1)',
          }}
        >
          <X size={18} />
        </button>

        {/* Top Tag */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: `${newTier.color}25`,
            border: `1.5px solid ${newTier.color}60`,
            color: newTier.color,
            fontSize: '0.75rem',
            fontWeight: 900,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            padding: '4px 14px',
            borderRadius: '999px',
            marginBottom: '16px',
          }}
        >
          <Sparkles size={14} />
          Rank Up Celebration!
        </div>

        {/* Title */}
        <h2
          style={{
            fontSize: '2rem',
            fontWeight: 900,
            color: '#fff',
            margin: '0 0 6px 0',
            letterSpacing: '-0.02em',
            textShadow: `0 0 20px ${newTier.color}50`,
          }}
        >
          RANK PROMOTED!
        </h2>

        {/* Previous Rank to New Rank Badge Row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '20px',
            margin: '24px 0',
          }}
        >
          {/* Previous Rank */}
          <div style={{ opacity: 0.6, transform: 'scale(0.85)' }}>
            <RankBadge tier={prevTier} size="md" />
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: prevTier.color, marginTop: '6px' }}>
              {prevTier.name}
            </div>
          </div>

          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: newTier.color,
            }}
          >
            <ArrowRight size={20} />
          </div>

          {/* New Rank (Animated Highlight) */}
          <div style={{ transform: 'scale(1.15)', transition: 'transform 0.3s ease' }}>
            <RankBadge tier={newTier} size="lg" showAura={true} />
            <div
              style={{
                fontSize: '0.95rem',
                fontWeight: 900,
                color: newTier.color,
                marginTop: '8px',
                textShadow: `0 0 10px ${newTier.color}60`,
              }}
            >
              {newTier.name}
            </div>
          </div>
        </div>

        {/* Motivational message */}
        <p
          style={{
            fontSize: '0.95rem',
            color: 'var(--text-secondary, #cbd5e1)',
            maxWidth: '380px',
            margin: '0 auto 20px auto',
            lineHeight: 1.5,
          }}
        >
          Your consistent learning dedication is paying off. You have ascended to{' '}
          <strong style={{ color: newTier.color }}>{newTier.name}</strong> rank!
        </p>

        {/* Points & Next Target Card */}
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.75)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            padding: '14px 18px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-around',
          }}
        >
          <div>
            <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              Current Points
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#ffd700' }}>
              {profile.totalPoints.toLocaleString()} XP
            </div>
          </div>

          <div style={{ width: '1px', height: '32px', background: 'rgba(255, 255, 255, 0.1)' }} />

          <div>
            <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              Next Target
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: nextTier ? nextTier.color : '#ffd700' }}>
              {nextTier ? `${nextTier.name} (${progress.pointsToNextRank} pts)` : 'MAX RANK (Legend)'}
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleClose}
          className="btn btn-primary"
          style={{
            width: '100%',
            maxWidth: '280px',
            margin: '0 auto',
            padding: '12px 24px',
            borderRadius: '14px',
            background: `linear-gradient(135deg, ${newTier.color} 0%, #4f46e5 100%)`,
            color: '#fff',
            fontWeight: 800,
            fontSize: '0.95rem',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: `0 8px 25px -4px ${newTier.color}60`,
            cursor: 'pointer',
            border: 'none',
          }}
        >
          <Check size={18} /> Continue Learning
        </button>
      </div>
    </div>
  );
};
