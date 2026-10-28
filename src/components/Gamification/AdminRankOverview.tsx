import React, { useState } from 'react';
import {
  Trophy, Users, Award, Zap, Flame, Filter,
  ArrowUpRight, BarChart3, Search, Calendar, ChevronRight
} from 'lucide-react';
import { RANK_TIERS, RankTier, getRankForPoints } from '../../lib/gamificationConfig';
import { useGamificationStore } from '../../lib/gamificationStore';
import { RankBadge } from './RankBadge';

interface AdminRankOverviewProps {
  onOpenAwardModal?: (studentId?: string) => void;
  onViewStudent?: (studentId: string) => void;
  className?: string;
}

export const AdminRankOverview: React.FC<AdminRankOverviewProps> = ({
  onOpenAwardModal,
  onViewStudent,
  className = '',
}) => {
  const { profiles, getRankDistribution, getPointsByCategory } = useGamificationStore();

  const [filterRank, setFilterRank] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const rankDistribution = getRankDistribution();
  const categoryTotals = getPointsByCategory();

  const studentIds = Object.keys(profiles);
  const totalStudents = studentIds.length;
  const totalAllPoints = Object.values(profiles).reduce((acc, p) => acc + p.totalPoints, 0);

  // Collect all events across profiles for the recent audit feed
  const allEvents = Object.entries(profiles).flatMap(([sId, profile]) => {
    const list = profile.events || profile.history || [];
    return list.map((e) => ({ ...e, studentId: sId }));
  });
  allEvents.sort(
    (a, b) =>
      new Date(b.timestamp || b.awardedAt).getTime() -
      new Date(a.timestamp || a.awardedAt).getTime()
  );
  const recentEvents = allEvents.slice(0, 5);

  // Filtered student list for quick overview
  const filteredStudents = studentIds
    .map((id) => {
      const prof = profiles[id];
      const tier = getRankForPoints(prof.totalPoints);
      return {
        id,
        points: prof.totalPoints,
        streak: prof.streakData?.currentStreak ?? prof.currentStreak ?? 0,
        tier,
      };
    })
    .filter((s) => {
      if (filterRank !== 'all' && s.tier.id !== filterRank) return false;
      if (searchQuery && !s.id.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => b.points - a.points);

  return (
    <div
      className={`card ${className}`}
      style={{
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 27, 75, 0.8) 100%)',
        border: '1.5px solid rgba(129, 140, 248, 0.3)',
        borderRadius: '24px',
        padding: '24px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffd700',
            }}
          >
            <Trophy size={20} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>
              Gamification & Rank Overview
            </h3>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted, #94a3b8)' }}>
              Cross-institutional scholar progression, engagement tiers & audit statistics
            </span>
          </div>
        </div>

        {onOpenAwardModal && (
          <button
            onClick={() => onOpenAwardModal()}
            className="btn btn-primary"
            style={{
              borderRadius: '12px',
              padding: '8px 18px',
              fontSize: '0.82rem',
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Award size={16} /> Award Points
          </button>
        )}
      </div>

      {/* High-level KPI grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '14px',
          marginBottom: '22px',
        }}
      >
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.65)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            padding: '14px 16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#818cf8', marginBottom: '4px' }}>
            <Users size={16} />
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700 }}>Active Scholars</span>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fff' }}>
            {totalStudents}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Registered in points system</div>
        </div>

        <div
          style={{
            background: 'rgba(15, 23, 42, 0.65)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            padding: '14px 16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ffd700', marginBottom: '4px' }}>
            <Zap size={16} />
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700 }}>Total Learning Points</span>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#ffd700' }}>
            {totalAllPoints.toLocaleString()} XP
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Accumulated across all activities</div>
        </div>

        <div
          style={{
            background: 'rgba(15, 23, 42, 0.65)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            padding: '14px 16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', marginBottom: '4px' }}>
            <Award size={16} />
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700 }}>Academic Staff Awards</span>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#10b981' }}>
            {(((categoryTotals as any)['Trainer Award'] || 0) + ((categoryTotals as any)['Admin Award'] || 0) + ((categoryTotals as any).academic_award || 0)).toLocaleString()} XP
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Granted by trainers & admins</div>
        </div>

        <div
          style={{
            background: 'rgba(15, 23, 42, 0.65)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            padding: '14px 16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8', marginBottom: '4px' }}>
            <BarChart3 size={16} />
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700 }}>Quiz Rewards</span>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#38bdf8' }}>
            {(((categoryTotals as any)['Quiz Completion'] || 0) + ((categoryTotals as any)['Quiz Achievement'] || 0) + ((categoryTotals as any).quiz_completion || 0) + ((categoryTotals as any).quiz_score_bonus || 0)).toLocaleString()} XP
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Completion & score bonuses</div>
        </div>
      </div>

      {/* Rank Distribution Breakdown Bar */}
      <div
        style={{
          background: 'rgba(15, 23, 42, 0.7)',
          border: '1px solid rgba(129, 140, 248, 0.2)',
          borderRadius: '18px',
          padding: '18px',
          marginBottom: '22px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: '#fff' }}>
            Rank Distribution Across Active Scholars
          </h4>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Calculated dynamically from real scholar profiles
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
            gap: '8px',
          }}
        >
          {RANK_TIERS.map((tier) => {
            const count = (rankDistribution as any)[tier.id] ?? (rankDistribution as any)[tier.tier] ?? 0;
            const pct = totalStudents > 0 ? Math.round((count / totalStudents) * 100) : 0;
            const isFilter = filterRank === tier.id;

            return (
              <div
                key={tier.id}
                onClick={() => setFilterRank(isFilter ? 'all' : tier.id)}
                style={{
                  background: isFilter ? `${tier.color}25` : 'rgba(255, 255, 255, 0.03)',
                  border: isFilter ? `1.5px solid ${tier.color}` : '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '12px',
                  padding: '10px 8px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '4px' }}>
                  <RankBadge tier={tier} size="xs" />
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: tier.color }}>
                  {tier.name}
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#fff', marginTop: '2px' }}>
                  {count}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                  {pct}% of cohort
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dual Column: Filtered Scholars & Recent Event Audit Log */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '20px',
        }}
      >
        {/* Left: Scholar Rank Roster */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#fff' }}>
              Scholar Standing ({filteredStudents.length})
            </span>
            {filterRank !== 'all' && (
              <button
                onClick={() => setFilterRank('all')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#818cf8',
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Reset Filter
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredStudents.map((s) => (
              <div
                key={s.id}
                style={{
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <RankBadge tier={s.tier} size="xs" />
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>
                      {s.id === 'u-007' ? 'Alex Thompson (u-007)' : `Scholar ${s.id}`}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      🔥 {s.streak}d Streak &bull; Tier: <strong style={{ color: s.tier.color }}>{s.tier.name}</strong>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#ffd700' }}>
                    {s.points.toLocaleString()} XP
                  </span>
                  {onOpenAwardModal && (
                    <button
                      onClick={() => onOpenAwardModal(s.id)}
                      className="btn btn-secondary"
                      style={{ padding: '4px 8px', fontSize: '0.7rem', borderRadius: '8px' }}
                      title="Award points to scholar"
                    >
                      + Award
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Recent Points Audit Log */}
        <div>
          <div style={{ marginBottom: '10px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#fff' }}>
              Recent Gamification Audit Feed
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {recentEvents.length === 0 ? (
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', padding: '12px' }}>
                No points events recorded yet.
              </div>
            ) : (
              recentEvents.map((e) => (
                <div
                  key={e.id}
                  style={{
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '12px',
                    padding: '10px 14px',
                    fontSize: '0.78rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 700, color: '#fff' }}>
                      {e.reason || e.description}
                    </span>
                    <span style={{ fontWeight: 800, color: '#10b981' }}>
                      +{e.points} XP
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                    <span>
                      Scholar: <strong style={{ color: '#818cf8' }}>{e.studentId}</strong> &bull; {e.awardingSource || e.source || e.category}
                    </span>
                    <span>
                      {new Date(e.timestamp || e.awardedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
