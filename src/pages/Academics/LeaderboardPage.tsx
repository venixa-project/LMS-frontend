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
  GraduationCap, Clock, Star, Zap, X, Mail
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

  // Role check: Only students/learners have personal performance cards & roadmaps
  const isStudent = user?.activeRole === 'student' || user?.activeRole === 'learner';

  // Compute sorted member list based on active timeframe, cohort filter, search query, and demo boost
  const sortedMembers = useMemo(() => {
    // Clone base data for timeframe
    const baseList = TIMEFRAME_DATA[timeframe].map((m) => {
      const isCurrent = isStudent && (user?.id ? m.id === user.id || (user.id === 'u-007' && m.id === 'u-007') : m.isCurrentUser);
      return {
        ...m,
        isCurrentUser: isCurrent,
        name: isCurrent ? m.name : m.name.replace(' (You)', ''),
      };
    });

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
  }, [timeframe, selectedCohort, searchQuery, isStudent, user?.id]);

  // Current logged in user (only applicable for student)
  const currentUserIndex = isStudent ? sortedMembers.findIndex((m) => m.isCurrentUser) : -1;
  const currentUser = currentUserIndex >= 0 ? sortedMembers[currentUserIndex] : null;
  const currentRank = currentUserIndex >= 0 ? currentUserIndex + 1 : 0;
  const nextRankMember = currentUserIndex > 0 ? sortedMembers[currentUserIndex - 1] : null;

  // Top 3 for the Olympic Podium
  const firstPlace = sortedMembers[0] || null;
  const secondPlace = sortedMembers[1] || null;
  const thirdPlace = sortedMembers[2] || null;

  // Controlled transition detection: trigger victory celebration ONLY for students on genuine transition into #1
  useEffect(() => {
    if (!isStudent) return;
    if (prevRankRef.current !== null && prevRankRef.current > 1 && currentRank === 1) {
      // Transitioned into #1!
      setIsVictoryModalOpen(true);
      setHighlightedRowId('u-007');
      const timer = setTimeout(() => setHighlightedRowId(null), 3000);
      return () => clearTimeout(timer);
    }
    prevRankRef.current = currentRank;
  }, [currentRank, isStudent]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* ------------------------------------------------------------- */}
      {/* 1. TOP PAGE HEADER & SUMMARY STATS PILL                       */}
      {/* ------------------------------------------------------------- */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="badge badge-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem' }}>
              <Trophy size={12} /> Academics & Gamification
            </span>
            <span className="badge badge-active" style={{ fontSize: '0.7rem' }}>
              Live Ranks Active
            </span>
          </div>
          <h1 style={{ fontSize: '1.5rem', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', fontWeight: 800 }}>
            Academic Leaderboard & Top Achievers
          </h1>
          <p className="text-secondary text-sm" style={{ margin: 0, maxWidth: '750px', color: '#94a3b8', fontSize: '0.825rem' }}>
            Compete, track syllabus velocity, maintain study streaks, and celebrate your journey to the top of the academy.
          </p>
        </div>

        {/* Global Summary Stats Pill */}
        <div
          style={{
            display: 'flex',
            gap: '14px',
            background: 'var(--bg-card)',
            padding: '8px 16px',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <span className="text-muted text-xs" style={{ textTransform: 'uppercase', fontWeight: 600, fontSize: '0.68rem' }}>Active Learners</span>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary)' }}>342</div>
          </div>
          <div style={{ width: '1px', background: 'var(--border-subtle)' }} />
          <div style={{ textAlign: 'center' }}>
            <span className="text-muted text-xs" style={{ textTransform: 'uppercase', fontWeight: 600, fontSize: '0.68rem' }}>Avg. Completion</span>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--success)' }}>78.4%</div>
          </div>
          <div style={{ width: '1px', background: 'var(--border-subtle)' }} />
          <div style={{ textAlign: 'center' }}>
            <span className="text-muted text-xs" style={{ textTransform: 'uppercase', fontWeight: 600, fontSize: '0.68rem' }}>Diplomas Issued</span>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--accent-purple)' }}>142</div>
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
      {/* 4. PERSONAL RANK CARD ("YOUR PERFORMANCE") - ONLY FOR STUDENTS */}
      {/* ------------------------------------------------------------- */}
      {isStudent && currentUser && (
        <PersonalRankCard
          currentUser={currentUser}
          currentRank={currentRank}
          nextRankMember={nextRankMember}
          totalMembers={sortedMembers.length}
          timeframeLabel={timeframeLabels[timeframe]}
          onInspect={() => currentUser && setSelectedMember(currentUser)}
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* 5. PREMIUM TOP-THREE PODIUM                                   */}
      {/* ------------------------------------------------------------- */}
      <Podium
        firstPlace={firstPlace}
        secondPlace={secondPlace}
        thirdPlace={thirdPlace}
        onSelectMember={(m) => setSelectedMember(m)}
        timeframeLabel={timeframeLabels[timeframe]}
      />

      {/* ------------------------------------------------------------- */}
      {/* 5B. GAMIFICATION PROGRESSION: RANK ROADMAP - ONLY FOR STUDENTS */}
      {/* ------------------------------------------------------------- */}
      {isStudent && (() => {
        const activeStudentId = user?.id || 'u-007';
        const studentProfile = profiles[activeStudentId] || profiles['u-007'];
        const studentPoints = studentProfile ? studentProfile.totalPoints : (currentUser?.points || 2150);

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* 7-Tier Straight-Line Rank Progression Roadmap */}
            <RankRoadmap points={studentPoints} studentId={activeStudentId} />
          </div>
        );
      })()}

      {/* ------------------------------------------------------------- */}
      {/* 6. COMPARISON GRAPHS & RADIAL DISTRIBUTION                    */}
      {/* ------------------------------------------------------------- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
        {/* Left: Top 6 Performers Comparative Progress Bar Chart */}
        <div className="card" style={{ padding: '18px 20px' }}>
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
        <div className="card" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
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
      <div className="card" style={{ padding: '18px 20px' }}>
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
          <div className="table-container" style={{ marginTop: '10px', overflowX: 'hidden' }}>
            <table className="table" style={{ width: '100%', minWidth: 'unset', tableLayout: 'auto' }}>
              <thead>
                <tr>
                  <th style={{ width: '65px' }}>Rank</th>
                  <th style={{ width: '90px' }}>Movement</th>
                  <th>Scholar Name</th>
                  <th style={{ width: '180px' }}>Cohort</th>
                  <th style={{ width: '110px' }}>Badges</th>
                  <th style={{ width: '85px', textAlign: 'center' }}>Courses</th>
                  <th style={{ minWidth: '140px' }}>Syllabus Mastery</th>
                  <th style={{ width: '75px' }}>Streak</th>
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
                              <div style={{ display: 'inline-flex', alignItems: 'center', marginLeft: '6px' }}>
                                <RankBadge tier={getRankForPoints(m.points)} size="xs" />
                              </div>
                            </div>
                            <div className="text-muted text-xs">
                              {m.rollNo}
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
      {/* 9. COMPREHENSIVE SCHOLAR PROFILE & ANALYTICS DOSSIER MODAL   */}
      {/* ------------------------------------------------------------- */}
      {selectedMember && (() => {
        const memberRankIndex = sortedMembers.findIndex((m) => m.id === selectedMember.id);
        const memberRank = memberRankIndex >= 0 ? memberRankIndex + 1 : 1;
        const memberTier = getRankForPoints(selectedMember.points);
        const memberBadges = computeMemberBadges(selectedMember, memberRank);
        const memberProfile = profiles[selectedMember.id];
        const memberBestStreak = memberProfile?.bestStreak || Math.max(selectedMember.streakDays, 14);

        return (
          <div className="modal-overlay" onClick={() => setSelectedMember(null)} style={{ backdropFilter: 'blur(6px)' }}>
            <div
              className="modal-card"
              style={{
                maxWidth: '620px',
                width: '95%',
                borderRadius: '16px',
                border: '1px solid rgba(129, 140, 248, 0.3)',
                background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 27, 75, 0.94) 100%)',
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
                overflow: 'hidden',
                animation: 'modalSlideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div
                style={{
                  padding: '14px 18px',
                  borderBottom: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'rgba(255, 255, 255, 0.02)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <AnimatedAvatar
                    avatarId={selectedMember.avatarId}
                    name={selectedMember.name}
                    size={46}
                    rank={memberRank}
                    isCurrentUser={selectedMember.isCurrentUser}
                  />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 800, color: '#ffffff' }}>
                        {selectedMember.name.replace(' (You)', '')}
                      </h3>
                      {selectedMember.isCurrentUser && (
                        <span className="badge badge-primary" style={{ fontSize: '0.62rem' }}>YOU</span>
                      )}
                      <RankBadge tier={memberTier} size="xs" showAura={true} />
                    </div>
                    {/* Scholar Roll, Email, and Cohort */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px', fontSize: '0.74rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600 }}>{selectedMember.rollNo}</span>
                      <span>&bull;</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#38bdf8', fontWeight: 500 }}>
                        <Mail size={12} />
                        {selectedMember.email}
                      </span>
                      <span>&bull;</span>
                      <span className="badge badge-secondary" style={{ fontSize: '0.66rem' }}>{selectedMember.cohort}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedMember(null)}
                  className="btn btn-secondary btn-sm"
                  aria-label="Close dialog"
                  style={{ width: '30px', height: '30px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px' }}
                >
                  <X size={15} />
                </button>
              </div>

              {/* Modal Body */}
              <div
                style={{
                  padding: '16px 18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  maxHeight: '82vh',
                  overflowY: 'auto'
                }}
              >
                {/* 1. Academic Performance 6-Tile Grid (Compact 3x2) */}
                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Academic Standing &amp; Velocity
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    {/* Rank Position */}
                    <div style={{ background: 'var(--bg-input)', padding: '8px 10px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block' }}>Leaderboard Rank</span>
                      <div style={{ fontSize: '1.15rem', fontWeight: 800, color: memberRank <= 3 ? '#ffd700' : 'var(--text-main)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Trophy size={14} color={memberRank <= 3 ? '#ffd700' : 'var(--text-muted)'} />
                        #{memberRank}
                      </div>
                      <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>of {sortedMembers.length} scholars</span>
                    </div>

                    {/* Courses */}
                    <div style={{ background: 'var(--bg-input)', padding: '8px 10px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block' }}>Curriculum Completed</span>
                      <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <GraduationCap size={14} />
                        {selectedMember.coursesCompleted} / {selectedMember.coursesEnrolled}
                      </div>
                      <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>courses cleared</span>
                    </div>

                    {/* Mastery */}
                    <div style={{ background: 'var(--bg-input)', padding: '8px 10px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block' }}>Syllabus Mastery</span>
                      <div style={{ fontSize: '1.15rem', fontWeight: 800, color: selectedMember.overallCompletionRate >= 80 ? 'var(--success)' : 'var(--text-main)', marginTop: '2px' }}>
                        {selectedMember.overallCompletionRate}%
                      </div>
                      <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>syllabus coverage</span>
                    </div>

                    {/* Study Streak */}
                    <div style={{ background: 'var(--bg-input)', padding: '8px 10px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block' }}>Verified Streak</span>
                      <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f97316', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Flame size={14} color="#f97316" />
                        {selectedMember.streakDays}d
                      </div>
                      <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>personal best: {memberBestStreak}d</span>
                    </div>

                    {/* Study Volume */}
                    <div style={{ background: 'var(--bg-input)', padding: '8px 10px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block' }}>Weekly Velocity</span>
                      <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#38bdf8', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={14} />
                        {selectedMember.weeklyStudyHours}h
                      </div>
                      <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>study time this week</span>
                    </div>

                    {/* Verified Diplomas */}
                    <div style={{ background: 'var(--bg-input)', padding: '8px 10px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block' }}>Diplomas Issued</span>
                      <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--accent-purple, #c084fc)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Award size={14} />
                        {selectedMember.certificates}
                      </div>
                      <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>verified certificates</span>
                    </div>
                  </div>
                </div>

                {/* 2. Detailed Syllabus Mastery Breakdown */}
                <div style={{ background: 'var(--bg-input)', padding: '12px 14px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#ffffff' }}>
                      Academic Curriculum Progress
                    </span>
                    <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--primary)' }}>
                      {selectedMember.overallCompletionRate}%
                    </span>
                  </div>
                  <div className="progress-bar-bg" style={{ height: '7px', background: 'rgba(255, 255, 255, 0.08)' }}>
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: `${selectedMember.overallCompletionRate}%`,
                        background: 'linear-gradient(90deg, var(--primary), #38bdf8)',
                      }}
                    />
                  </div>
                  <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    <span>Latest Finished Track: <strong style={{ color: 'var(--text-main)' }}>{selectedMember.recentCourseFinished}</strong></span>
                    <span style={{ color: 'var(--success)', fontWeight: 600 }}>&bull; Passed Assessment</span>
                  </div>
                </div>

                {/* 3. Achievements & Badges Earned */}
                <div style={{ background: 'var(--bg-input)', padding: '12px 14px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    Awarded Achievement Badges ({memberBadges.length})
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {memberBadges.map((b) => (
                      <div
                        key={b.id}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: 'rgba(255, 255, 255, 0.06)',
                          padding: '4px 10px',
                          borderRadius: '8px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          color: b.color,
                          border: `1px solid ${b.color}40`,
                        }}
                      >
                        <span style={{ fontSize: '0.9rem' }}>{b.icon}</span>
                        <div>
                          <div>{b.name}</div>
                          <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                            {b.description}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div
                style={{
                  padding: '10px 18px',
                  borderTop: '1px solid var(--border-subtle)',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '10px',
                  background: 'rgba(255, 255, 255, 0.02)'
                }}
              >
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setSelectedMember(null)}
                  style={{ fontSize: '0.78rem', padding: '5px 14px' }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
