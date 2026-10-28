// ============================================================
// LMS - Animated Gamified Leaderboard & Victory Moments
// ============================================================

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAuthStore } from '../../lib/store';
import { Link, useNavigate } from 'react-router-dom';
import {
  Trophy, Award, Crown, Sparkles, BookOpen,
  CheckCircle2, Flame, Search, Filter, TrendingUp, TrendingDown,
  Minus, BarChart3, Users, ChevronDown, ChevronUp, ArrowRight,
  GraduationCap, Clock, Star, Zap
} from 'lucide-react';
import {
  TimeframeFilter,
  LeaderboardMember,
  TIMEFRAME_DATA,
  computeMemberBadges,
  ACHIEVEMENT_DEFINITIONS,
} from './leaderboardData';
import { Podium } from './components/Podium';
import { PersonalRankCard } from './components/PersonalRankCard';
import { VictoryCelebrationModal } from './components/VictoryCelebrationModal';
import { AnimatedAvatar } from '../../components/AnimatedAvatar';
import { useGamificationStore } from '../../lib/gamificationStore';
import { getRankForPoints } from '../../lib/gamificationConfig';
import { RankRoadmap } from '../../components/Gamification/RankRoadmap';
import { LoginStreakCard } from '../../components/Gamification/LoginStreakCard';
import { RankBadge } from '../../components/Gamification/RankBadge';

export const LeaderboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { profiles } = useGamificationStore();

  // Active filters
  const [timeframe, setTimeframe] = useState<TimeframeFilter>('all_time');
  const [selectedCohort, setSelectedCohort] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllMembers, setShowAllMembers] = useState(true);
  const [selectedMember, setSelectedMember] = useState<LeaderboardMember | null>(null);

  // Victory Celebration Modal state
  const [isVictoryModalOpen, setIsVictoryModalOpen] = useState(false);

  // Row highlight animation tracking
  const [highlightedRowId, setHighlightedRowId] = useState<string | null>(null);

  // Track previous rank of current user to detect genuine transition into #1
  const prevRankRef = useRef<number | null>(null);

  // Timeframe labels for display
  const timeframeLabels: Record<TimeframeFilter, string> = {
    weekly: "This Week's Velocity",
    monthly: 'October 2026',
    all_time: 'All-Time Champions',
  };

  // Compute sorted member list based on active timeframe, cohort filter, search query, and demo boost
  const sortedMembers = useMemo(() => {
    // Clone base data for timeframe
    const baseList = TIMEFRAME_DATA[timeframe].map((m) => ({ ...m }));

    // Cohort filtering
    let list = baseList;
    if (selectedCohort !== 'all') {
      list = list.filter((m) => m.cohort === selectedCohort);
    }

    // Search query filtering
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q) ||
          m.rollNo.toLowerCase().includes(q)
      );
    }

    // Sort descending by points, then by coursesCompleted, then overallCompletionRate
    list.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.coursesCompleted !== a.coursesCompleted) return b.coursesCompleted - a.coursesCompleted;
      return b.overallCompletionRate - a.overallCompletionRate;
    });

    return list;
  }, [timeframe, selectedCohort, searchQuery]);

  // Current logged in user (Alex Thompson)
  const currentUserIndex = sortedMembers.findIndex((m) => m.isCurrentUser);
  const currentUser = currentUserIndex >= 0 ? sortedMembers[currentUserIndex] : null;
  const currentRank = currentUserIndex >= 0 ? currentUserIndex + 1 : 4;
  const nextRankMember = currentUserIndex > 0 ? sortedMembers[currentUserIndex - 1] : null;

  // Top 3 for the Olympic Podium
  const firstPlace = sortedMembers[0] || null;
  const secondPlace = sortedMembers[1] || null;
  const thirdPlace = sortedMembers[2] || null;

  // Controlled transition detection: trigger victory celebration ONLY on genuine transition into #1
  useEffect(() => {
    if (prevRankRef.current !== null && prevRankRef.current > 1 && currentRank === 1) {
      // Transitioned into #1!
      setIsVictoryModalOpen(true);
      setHighlightedRowId('u-007');
      const timer = setTimeout(() => setHighlightedRowId(null), 3000);
      return () => clearTimeout(timer);
    }
    prevRankRef.current = currentRank;
  }, [currentRank]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '26px' }}>
      {/* ------------------------------------------------------------- */}
      {/* 1. TOP PAGE HEADER & SUMMARY STATS PILL                       */}
      {/* ------------------------------------------------------------- */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span className="badge badge-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <Trophy size={13} /> Academics & Gamification
            </span>
            <span className="badge badge-active" style={{ fontSize: '0.72rem' }}>
              Live Ranks Active
            </span>
          </div>
          <h1 style={{ fontSize: '1.85rem', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '10px', color: '#fff', fontWeight: 800 }}>
            Academic Leaderboard & Top Achievers
          </h1>
          <p className="text-secondary text-sm" style={{ margin: 0, maxWidth: '750px', color: '#94a3b8' }}>
            Compete, track syllabus velocity, maintain study streaks, and celebrate your journey to the top of the academy.
          </p>
        </div>

        {/* Global Summary Stats Pill */}
        <div
          style={{
            display: 'flex',
            gap: '16px',
            background: 'var(--bg-card)',
            padding: '12px 20px',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <span className="text-muted text-xs" style={{ textTransform: 'uppercase', fontWeight: 600 }}>Active Learners</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>342</div>
          </div>
          <div style={{ width: '1px', background: 'var(--border-subtle)' }} />
          <div style={{ textAlign: 'center' }}>
            <span className="text-muted text-xs" style={{ textTransform: 'uppercase', fontWeight: 600 }}>Avg. Completion</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--success)' }}>78.4%</div>
          </div>
          <div style={{ width: '1px', background: 'var(--border-subtle)' }} />
          <div style={{ textAlign: 'center' }}>
            <span className="text-muted text-xs" style={{ textTransform: 'uppercase', fontWeight: 600 }}>Diplomas Issued</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-purple)' }}>142</div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. TIMEFRAME FILTERS & COHORT SELECTOR                        */}
      {/* ------------------------------------------------------------- */}
      <div
        className="card"
        style={{
          padding: '10px 14px',
          background: 'var(--bg-card)',
          borderRadius: '16px',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          {/* Main 3 Timeframe Tabs: Weekly, Monthly, All-Time */}
          <div
            style={{
              display: 'flex',
              gap: '6px',
              background: 'var(--bg-input)',
              padding: '4px',
              borderRadius: '12px',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <button
              onClick={() => setTimeframe('weekly')}
              className="btn btn-sm"
              style={{
                background: timeframe === 'weekly' ? 'linear-gradient(135deg, #2563eb, #3b82f6)' : 'transparent',
                color: timeframe === 'weekly' ? '#fff' : 'var(--text-secondary)',
                border: 'none',
                padding: '7px 16px',
                fontSize: '0.825rem',
                fontWeight: 700,
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <Flame size={14} color={timeframe === 'weekly' ? '#f97316' : 'currentColor'} />
              <span>Weekly Velocity</span>
            </button>

            <button
              onClick={() => setTimeframe('monthly')}
              className="btn btn-sm"
              style={{
                background: timeframe === 'monthly' ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent',
                color: timeframe === 'monthly' ? '#fff' : 'var(--text-secondary)',
                border: 'none',
                padding: '7px 16px',
                fontSize: '0.825rem',
                fontWeight: 700,
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <BarChart3 size={14} />
              <span>Monthly Standings</span>
            </button>

            <button
              onClick={() => setTimeframe('all_time')}
              className="btn btn-sm"
              style={{
                background: timeframe === 'all_time' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'transparent',
                color: timeframe === 'all_time' ? '#0f172a' : 'var(--text-secondary)',
                border: 'none',
                padding: '7px 16px',
                fontSize: '0.825rem',
                fontWeight: 800,
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <Crown size={14} color={timeframe === 'all_time' ? '#78350f' : 'currentColor'} />
              <span>All-Time Champions</span>
            </button>
          </div>

          {/* Right Controls: Cohort Select & Member Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Filter size={14} color="var(--primary)" />
              <select
                className="form-select"
                value={selectedCohort}
                onChange={(e) => setSelectedCohort(e.target.value)}
                style={{ fontSize: '0.8rem', padding: '6px 10px', width: 'auto' }}
              >
                <option value="all">All Cohorts & Batches</option>
                <option value="Spring 2026 Engineering">Spring 2026 Engineering</option>
                <option value="Summer 2026 Cloud Architects">Summer 2026 Cloud Architects</option>
                <option value="Fall 2026 Data Science">Fall 2026 Data Science</option>
              </select>
            </div>

            <div style={{ position: 'relative' }}>
              <Search
                size={14}
                style={{
                  position: 'absolute',
                  left: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                type="text"
                className="form-input"
                placeholder="Search scholar name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '32px', fontSize: '0.8rem', width: '180px' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. PREMIUM TOP-THREE PODIUM (Center Gold, Left Silver, Right Bronze) */}
      {/* ------------------------------------------------------------- */}
      <Podium
        firstPlace={firstPlace}
        secondPlace={secondPlace}
        thirdPlace={thirdPlace}
        onSelectMember={(m) => setSelectedMember(m)}
        timeframeLabel={timeframeLabels[timeframe]}
      />

      {/* ------------------------------------------------------------- */}
      {/* 5. PERSONAL RANK CARD ("YOUR PERFORMANCE")                    */}
      {/* ------------------------------------------------------------- */}
      <PersonalRankCard
        currentUser={currentUser}
        currentRank={currentRank}
        nextRankMember={nextRankMember}
        totalMembers={sortedMembers.length}
        timeframeLabel={timeframeLabels[timeframe]}
        onInspect={() => currentUser && setSelectedMember(currentUser)}
      />

      {/* ------------------------------------------------------------- */}
      {/* 5B. GAMIFICATION PROGRESSION: LOGIN STREAK & RANK ROADMAP     */}
      {/* ------------------------------------------------------------- */}
      {(() => {
        const activeStudentId = user?.id || 'u-007';
        const studentProfile = profiles[activeStudentId] || profiles['u-007'];
        const studentPoints = studentProfile ? studentProfile.totalPoints : (currentUser?.points || 2150);
        const studentStreak = studentProfile ? (studentProfile.streakData?.currentStreak ?? studentProfile.currentStreak) : (currentUser?.streakDays || 6);
        const studentBestStreak = studentProfile ? (studentProfile.streakData?.bestStreak ?? studentProfile.bestStreak) : 14;
        const studentLastLogin = studentProfile ? (studentProfile.streakData?.lastLoginDate ?? studentProfile.lastLoginDate) : null;
        const todayRewarded = studentLastLogin === new Date().toISOString().split('T')[0];

        return (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            <LoginStreakCard
              currentStreak={studentStreak}
              bestStreak={studentBestStreak}
              todayRewarded={todayRewarded}
            />
            <RankRoadmap points={studentPoints} />
          </div>
        );
      })()}

      {/* ------------------------------------------------------------- */}
      {/* 6. COMPARISON GRAPHS & RADIAL DISTRIBUTION                    */}
      {/* ------------------------------------------------------------- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {/* Left: Top 6 Performers Comparative Progress Bar Chart */}
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <BarChart3 size={16} color="var(--primary)" />
                <h3 style={{ fontSize: '1.05rem', margin: 0, fontWeight: 800 }}>
                  Top Performers: Learning Volume Comparison
                </h3>
              </div>
              <p className="text-muted text-xs" style={{ margin: '4px 0 0' }}>
                XP distribution and syllabus mastery velocity across top scholars
              </p>
            </div>
            <span className="badge badge-secondary" style={{ fontSize: '0.7rem' }}>Top 6 Ranked</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '10px' }}>
            {sortedMembers.slice(0, 6).map((m, idx) => {
              const maxXP = sortedMembers[0]?.points || 5000;
              const barPercent = Math.min(100, Math.max(12, Math.round((m.points / maxXP) * 100)));

              return (
                <div
                  key={m.id}
                  onClick={() => setSelectedMember(m)}
                  title={`Click to inspect ${m.name.replace(' (You)', '')}'s analytics`}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    cursor: 'pointer',
                    padding: '4px 6px',
                    borderRadius: '8px',
                    transition: 'background 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          width: '22px',
                          height: '22px',
                          borderRadius: '50%',
                          background: idx === 0 ? '#ffd700' : idx === 1 ? '#cbd5e1' : idx === 2 ? '#d97706' : 'var(--bg-input)',
                          color: idx <= 2 ? '#0f172a' : 'var(--text-secondary)',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {idx + 1}
                      </span>
                      <strong style={{ color: m.isCurrentUser ? 'var(--primary)' : 'var(--text-main)' }}>
                        {m.name.replace(' (You)', '')}
                      </strong>
                      {m.isCurrentUser && <span className="badge badge-primary" style={{ fontSize: '0.62rem' }}>YOU</span>}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 800, color: '#ffd700', fontSize: '0.825rem' }}>
                        {m.points.toLocaleString()} XP
                      </span>
                      <span className="text-muted text-xs">({m.overallCompletionRate}%)</span>
                    </div>
                  </div>

                  {/* Visual Bar representation */}
                  <div className="progress-bar-bg" style={{ height: '9px', background: 'var(--bg-input)' }}>
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: `${barPercent}%`,
                        background:
                          idx === 0
                            ? 'linear-gradient(90deg, #f59e0b, #ffd700)'
                            : idx === 1
                            ? 'linear-gradient(90deg, #64748b, #cbd5e1)'
                            : idx === 2
                            ? 'linear-gradient(90deg, #b45309, #d97706)'
                            : 'linear-gradient(90deg, #2563eb, #818cf8)',
                        transition: 'width 0.6s ease',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Milestone Distribution & Badges Legend */}
        <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <Award size={16} color="var(--accent-purple)" />
              <h3 style={{ fontSize: '1.05rem', margin: 0, fontWeight: 800 }}>Achievement Badges Legend</h3>
            </div>
            <p className="text-muted text-xs" style={{ margin: 0 }}>
              Official recognition badges automatically awarded based on performance criteria
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
              {Object.values(ACHIEVEMENT_DEFINITIONS).map((ach) => (
                <div
                  key={ach.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '8px 12px',
                    background: 'var(--bg-input)',
                    borderRadius: '10px',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <span style={{ fontSize: '1.3rem' }}>{ach.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.82rem', color: ach.color }}>
                      {ach.name}
                    </div>
                    <div className="text-muted text-xs">{ach.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 7. FULL LEADERBOARD TABLE WITH ANIMATED RANK MOVEMENTS        */}
      {/* ------------------------------------------------------------- */}
      <div className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={18} color="var(--primary)" />
              <h3 style={{ fontSize: '1.15rem', margin: 0, fontWeight: 800 }}>
                Academy Leaderboard Roster &bull; {timeframeLabels[timeframe]}
              </h3>
              <span className="badge badge-secondary" style={{ fontSize: '0.7rem' }}>
                {sortedMembers.length} Scholars
              </span>
            </div>
            <p className="text-muted text-xs" style={{ margin: '4px 0 0' }}>
              Live rankings including rank movements, syllabus progress, and verified credential milestones. Click any scholar's profile to inspect analytics.
            </p>
          </div>

          <button
            onClick={() => setShowAllMembers(!showAllMembers)}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}
          >
            {showAllMembers ? (
              <>
                <ChevronUp size={15} /> Show Less
              </>
            ) : (
              <>
                <ChevronDown size={15} /> View Full Roster ({sortedMembers.length})
              </>
            )}
          </button>
        </div>

        {/* Full Table */}
        {showAllMembers && (
          <div className="table-container" style={{ marginTop: '10px' }}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '85px' }}>Rank</th>
                  <th style={{ width: '110px' }}>Movement</th>
                  <th>Scholar Name</th>
                  <th>Cohort</th>
                  <th>Badges</th>
                  <th style={{ textAlign: 'center' }}>Courses</th>
                  <th style={{ minWidth: '160px' }}>Syllabus Mastery</th>
                  <th>Streak</th>
                  <th style={{ textAlign: 'right' }}>Total XP</th>
                </tr>
              </thead>
              <tbody>
                {sortedMembers.map((m, index) => {
                  const rank = index + 1;
                  const isTop3 = rank <= 3;
                  const rankDelta = m.previousRank - rank; // > 0 means improved
                  const badges = computeMemberBadges(m, rank);
                  const isRowHighlighted = highlightedRowId === m.id;

                  return (
                    <tr
                      key={m.id}
                      onClick={() => setSelectedMember(m)}
                      title={`Click to inspect ${m.name.replace(' (You)', '')}'s scholar performance`}
                      style={{
                        cursor: 'pointer',
                        background: isRowHighlighted
                          ? 'rgba(255, 215, 0, 0.15)'
                          : m.isCurrentUser
                          ? 'rgba(99, 102, 241, 0.14)'
                          : isTop3
                          ? 'rgba(255, 215, 0, 0.03)'
                          : 'inherit',
                        borderLeft: m.isCurrentUser
                          ? '4px solid var(--primary)'
                          : isTop3
                          ? `4px solid ${rank === 1 ? '#ffd700' : rank === 2 ? '#cbd5e1' : '#d97706'}`
                          : '4px solid transparent',
                        transition: 'background 0.25s ease, border-left 0.25s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = isRowHighlighted
                          ? 'rgba(255, 215, 0, 0.22)'
                          : m.isCurrentUser
                          ? 'rgba(99, 102, 241, 0.22)'
                          : 'rgba(255, 255, 255, 0.05)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = isRowHighlighted
                          ? 'rgba(255, 215, 0, 0.15)'
                          : m.isCurrentUser
                          ? 'rgba(99, 102, 241, 0.14)'
                          : isTop3
                          ? 'rgba(255, 215, 0, 0.03)'
                          : 'transparent';
                      }}
                    >
                      {/* Rank Position */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {rank === 1 ? (
                            <span style={{ fontSize: '1.25rem' }}>🥇</span>
                          ) : rank === 2 ? (
                            <span style={{ fontSize: '1.25rem' }}>🥈</span>
                          ) : rank === 3 ? (
                            <span style={{ fontSize: '1.25rem' }}>🥉</span>
                          ) : (
                            <span
                              style={{
                                width: '26px',
                                height: '26px',
                                borderRadius: '50%',
                                background: 'var(--bg-input)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 800,
                                fontSize: '0.8rem',
                                color: 'var(--text-muted)',
                              }}
                            >
                              #{rank}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Rank Movement (Animated Delta) */}
                      <td>
                        {rankDelta > 0 ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              background: 'rgba(16, 185, 129, 0.15)',
                              border: '1px solid rgba(16, 185, 129, 0.35)',
                              color: '#10b981',
                              padding: '2px 8px',
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
                              gap: '3px',
                              background: 'rgba(244, 63, 94, 0.15)',
                              border: '1px solid rgba(244, 63, 94, 0.35)',
                              color: '#f43f5e',
                              padding: '2px 8px',
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
                              color: 'var(--text-muted)',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              paddingLeft: '6px',
                            }}
                          >
                            <Minus size={12} /> —
                          </span>
                        )}
                      </td>

                      {/* Scholar Info */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <AnimatedAvatar
                            avatarId={m.avatarId}
                            name={m.name}
                            size={38}
                            rank={rank}
                            isCurrentUser={m.isCurrentUser}
                            interactive={true}
                          />
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <strong style={{ fontSize: '0.88rem', color: m.isCurrentUser ? 'var(--primary)' : 'var(--text-main)' }}>
                                {m.name.replace(' (You)', '')}
                              </strong>
                              {m.isCurrentUser && (
                                <span className="badge badge-primary" style={{ fontSize: '0.62rem' }}>YOU</span>
                              )}
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', marginLeft: '4px' }}>
                                <RankBadge tier={getRankForPoints(m.points)} size="xs" />
                                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: getRankForPoints(m.points).color }}>
                                  {getRankForPoints(m.points).name}
                                </span>
                              </div>
                            </div>
                            <div className="text-muted text-xs">
                              {m.rollNo} &bull; {m.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Cohort */}
                      <td className="text-secondary text-xs">
                        <span className="badge badge-secondary" style={{ fontSize: '0.7rem' }}>
                          {m.cohort}
                        </span>
                      </td>

                      {/* Badges preview */}
                      <td>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {badges.map((b) => (
                            <span
                              key={b.id}
                              title={`${b.name}: ${b.description}`}
                              style={{
                                fontSize: '0.9rem',
                                cursor: 'help',
                                background: 'rgba(255, 255, 255, 0.06)',
                                borderRadius: '50%',
                                padding: '2px 4px',
                              }}
                            >
                              {b.icon}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Courses Completed */}
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <GraduationCap size={15} color={rank === 1 ? '#ffd700' : 'var(--primary)'} />
                          <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>
                            {m.coursesCompleted} / {m.coursesEnrolled}
                          </span>
                        </div>
                      </td>

                      {/* Syllabus Mastery */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                            <span className="text-muted">Mastery:</span>
                            <strong style={{ color: m.overallCompletionRate >= 80 ? 'var(--success)' : 'var(--text-main)' }}>
                              {m.overallCompletionRate}%
                            </strong>
                          </div>
                          <div className="progress-bar-bg" style={{ height: '6px', background: 'var(--bg-input)' }}>
                            <div
                              className="progress-bar-fill"
                              style={{
                                width: `${m.overallCompletionRate}%`,
                                background:
                                  m.overallCompletionRate >= 90
                                    ? 'linear-gradient(90deg, #10b981, #06b6d4)'
                                    : 'linear-gradient(90deg, var(--primary), var(--accent-purple))',
                              }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Streak */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: '#f97316', fontWeight: 700 }}>
                          <Flame size={13} color="#f97316" />
                          <span>{m.streakDays}d</span>
                        </div>
                      </td>

                      {/* Total Points */}
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Zap size={14} color="#ffd700" />
                          <strong style={{ color: '#ffd700', fontSize: '0.85rem' }}>
                            {m.points.toLocaleString()} XP
                          </strong>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 8. FIRST-PLACE VICTORY CELEBRATION MODAL                      */}
      {/* ------------------------------------------------------------- */}
      <VictoryCelebrationModal
        isOpen={isVictoryModalOpen}
        onClose={() => setIsVictoryModalOpen(false)}
        studentName={currentUser?.name?.replace(' (You)', '') || 'Alex Thompson'}
        points={currentUser?.points || 5120}
        onContinueLearning={() => {
          setIsVictoryModalOpen(false);
          navigate('/courses/my-learning');
        }}
      />

      {/* ------------------------------------------------------------- */}
      {/* 9. MEMBER INSPECTION DETAILS DRAWER/MODAL                     */}
      {/* ------------------------------------------------------------- */}
      {selectedMember && (
        <div className="modal-overlay" onClick={() => setSelectedMember(null)}>
          <div className="modal-card" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <AnimatedAvatar
                  avatarId={selectedMember.avatarId}
                  name={selectedMember.name}
                  size={52}
                  isCurrentUser={selectedMember.isCurrentUser}
                />
                <div>
                  <h3 style={{ fontSize: '1.15rem', margin: 0, fontWeight: 800 }}>{selectedMember.name}</h3>
                  <p className="text-muted text-xs">{selectedMember.rollNo} &bull; {selectedMember.cohort}</p>
                </div>
              </div>
              <button onClick={() => setSelectedMember(null)} className="btn btn-secondary btn-sm" aria-label="Close dialog">
                ✕
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
                  <span className="text-muted text-xs">Courses Completed</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary)', marginTop: '2px' }}>
                    {selectedMember.coursesCompleted} of {selectedMember.coursesEnrolled}
                  </div>
                </div>
                <div style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
                  <span className="text-muted text-xs">Completion Rate</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--success)', marginTop: '2px' }}>
                    {selectedMember.overallCompletionRate}%
                  </div>
                </div>
                <div style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
                  <span className="text-muted text-xs">Total Learning Points</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffd700', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Zap size={18} color="#ffd700" /> {selectedMember.points.toLocaleString()} XP
                  </div>
                </div>
                <div style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
                  <span className="text-muted text-xs">Verified Diplomas</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-purple)', marginTop: '2px' }}>
                    {selectedMember.certificates} Issued
                  </div>
                </div>
              </div>

              {/* Achievements awarded */}
              <div style={{ background: 'var(--bg-input)', padding: '14px', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 700, textTransform: 'uppercase' }}>
                  Awarded Achievement Badges
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {computeMemberBadges(selectedMember, sortedMembers.findIndex((m) => m.id === selectedMember.id) + 1).map((b) => (
                    <div
                      key={b.id}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'rgba(255, 255, 255, 0.08)',
                        padding: '4px 10px',
                        borderRadius: '999px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: b.color,
                        border: `1px solid ${b.color}40`,
                      }}
                    >
                      <span>{b.icon}</span>
                      <span>{b.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background: 'var(--bg-input)', padding: '14px', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Latest Milestone Finished:</div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                  {selectedMember.recentCourseFinished}
                </div>
                <div className="text-muted text-xs" style={{ marginTop: '4px' }}>
                  Weekly Study Velocity: {selectedMember.weeklyStudyHours} Hours &bull; Active Streak: {selectedMember.streakDays} Days
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedMember(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
