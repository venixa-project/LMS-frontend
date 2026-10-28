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
  GraduationCap, Clock, Star, Zap, X, Mail, Eye, Building2,
  ShieldCheck, Shield
} from 'lucide-react';
import {
  TimeframeFilter,
  LeaderboardMember,
  TIMEFRAME_DATA,
  computeMemberBadges,
  ACHIEVEMENT_DEFINITIONS,
} from './leaderboardData';
import { mockUsers } from '../../data/mockUsers';
import { mockDepartments, mockCohorts } from '../../data/mockData';
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

  // Role checks: Trainer vs Admin vs Student
  const userRole = user?.activeRole || 'student';
  const isTrainer = userRole === 'trainer' || userRole === 'instructor' || userRole === 'assessment_author' || userRole === 'grader';
  const isAdmin = userRole === 'platform_admin' || userRole === 'org_admin' || userRole === 'lms_admin' || (userRole as string) === 'admin' || (userRole as string) === 'industrial_admin';
  const isStudent = userRole === 'student' || userRole === 'learner';

  // Trainer Authorized Cohorts (Trainers can only view students in their assigned cohorts/classes)
  const trainerAuthorizedCohorts = useMemo<string[] | null>(() => {
    if (!isTrainer) return null; // Admin or student - not restricted
    const currentUserId = user?.id || '';
    const userEmail = user?.email || '';

    const isWilson = currentUserId === 'u-004' || userEmail === 'trainer@lms.demo';
    const isSharma = currentUserId === 'u-003' || userEmail === 'priya.sharma@lms.demo';
    const isRodriguez = currentUserId === 'u-005' || userEmail === 'emily.rodriguez@lms.demo';
    const isRostova = currentUserId === 'u-014' || userEmail === 'elena.rostova@lms.demo';
    const isBell = currentUserId === 'u-012' || userEmail === 'marcus.bell@lms.demo';

    const authorized = new Set<string>();

    if (isWilson || isBell) {
      authorized.add('Spring 2026 Engineering');
    }
    if (isSharma) {
      authorized.add('Fall 2026 Data Science');
    }
    if (isRostova) {
      authorized.add('Summer 2026 Cloud Architects');
    }
    if (isRodriguez) {
      authorized.add('Spring 2026 Engineering');
    }

    // Dynamic mockCohorts inspection
    mockCohorts.forEach((coh) => {
      const teaches =
        (coh.instructors && coh.instructors.includes(currentUserId)) ||
        (coh.instructorIds && coh.instructorIds.includes(currentUserId));
      if (teaches) {
        if (coh.name.includes('Engineering') || coh.name.includes('React') || coh.code.includes('ENG')) {
          authorized.add('Spring 2026 Engineering');
        }
        if (coh.name.includes('Data Science') || coh.name.includes('Python') || coh.code.includes('DS') || coh.code.includes('PY')) {
          authorized.add('Fall 2026 Data Science');
        }
        if (coh.name.includes('Cloud') || coh.code.includes('CLOUD')) {
          authorized.add('Summer 2026 Cloud Architects');
        }
      }
    });

    if (authorized.size === 0) {
      const userRec = mockUsers.find((u) => u.id === currentUserId || u.email === userEmail);
      if (userRec?.departmentId === 'dep-003') {
        authorized.add('Fall 2026 Data Science');
      } else if (userRec?.departmentId === 'dep-005') {
        authorized.add('Summer 2026 Cloud Architects');
      } else {
        authorized.add('Spring 2026 Engineering');
      }
    }

    return Array.from(authorized);
  }, [isTrainer, user?.id, user?.email]);

  // Available cohorts for filter dropdown
  const availableCohorts = useMemo(() => {
    if (isTrainer && trainerAuthorizedCohorts) {
      return trainerAuthorizedCohorts;
    }
    return ['Spring 2026 Engineering', 'Summer 2026 Cloud Architects', 'Fall 2026 Data Science'];
  }, [isTrainer, trainerAuthorizedCohorts]);

  // Synchronize selectedCohort if switching to a role with restricted cohorts
  useEffect(() => {
    if (selectedCohort !== 'all' && !availableCohorts.includes(selectedCohort)) {
      setSelectedCohort('all');
    }
  }, [availableCohorts, selectedCohort]);

  // Helper: Look up student department from mockUsers & mockDepartments
  const getStudentDepartment = (member: LeaderboardMember): string | undefined => {
    const userRecord = mockUsers.find(
      (u) => u.id === member.id || u.rollNo === member.rollNo || u.email === member.email
    );
    if (userRecord?.departmentId) {
      const dept = mockDepartments.find((d) => d.id === userRecord.departmentId);
      if (dept) return dept.name;
    }
    if (member.cohort.includes('Engineering')) return 'Engineering';
    if (member.cohort.includes('Data Science')) return 'Data Science';
    if (member.cohort.includes('Cloud')) return 'Cloud Architecture';
    return undefined;
  };

  // Focus restoration & modal accessibility tracking
  const lastTriggeredBtnRef = useRef<HTMLButtonElement | null>(null);
  const viewButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const handleOpenMemberModal = (member: LeaderboardMember, btnEl?: HTMLButtonElement | null) => {
    if (btnEl) {
      lastTriggeredBtnRef.current = btnEl;
    }
    setSelectedMember(member);
  };

  const handleCloseMemberModal = () => {
    setSelectedMember(null);
    setTimeout(() => {
      lastTriggeredBtnRef.current?.focus();
    }, 50);
  };

  // Keyboard accessibility: Escape key to close modal
  useEffect(() => {
    if (!selectedMember) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCloseMemberModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedMember]);

  // Compute sorted member list based on active timeframe, role scoping, cohort filter, search query
  const sortedMembers = useMemo(() => {
    // Clone base data for timeframe
    let baseList = TIMEFRAME_DATA[timeframe].map((m) => {
      const isCurrent = isStudent && (user?.id ? m.id === user.id || (user.id === 'u-007' && m.id === 'u-007') : m.isCurrentUser);
      return {
        ...m,
        isCurrentUser: isCurrent,
        name: isCurrent ? m.name : m.name.replace(' (You)', ''),
      };
    });

    // Trainer access restriction: ONLY students belonging to trainer's assigned cohorts
    if (isTrainer && trainerAuthorizedCohorts) {
      baseList = baseList.filter((m) => trainerAuthorizedCohorts.includes(m.cohort));
    }

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
  }, [timeframe, selectedCohort, searchQuery, isStudent, isTrainer, trainerAuthorizedCohorts, user?.id]);

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0, width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
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

      {/* Role-Based Scope Notification Banner */}
      {isTrainer && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 16px',
            background: 'rgba(37, 99, 235, 0.08)',
            border: '1px solid rgba(37, 99, 235, 0.25)',
            borderRadius: '12px',
            fontSize: '0.825rem',
            color: 'var(--text-main)',
          }}
        >
          <ShieldCheck size={18} color="var(--primary)" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <strong>Trainer View:</strong> Leaderboard participants and academic dossiers are scoped strictly to your assigned cohorts and courses (
            <span style={{ color: 'var(--primary)', fontWeight: 600 }}>
              {trainerAuthorizedCohorts?.join(', ')}
            </span>
            ). Unrelated students are protected and excluded per institutional access policies.
          </div>
        </div>
      )}

      {isAdmin && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 16px',
            background: 'rgba(99, 102, 241, 0.06)',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            borderRadius: '12px',
            fontSize: '0.825rem',
            color: 'var(--text-main)',
          }}
        >
          <ShieldCheck size={18} color="var(--accent-purple)" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <strong>Institution Admin View:</strong> You have full institution-wide oversight of all student leaderboard rankings, syllabus mastery velocity, and verified credentials across all departments and cohorts.
          </div>
        </div>
      )}

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
                <option value="all">
                  {isTrainer ? `All Assigned Cohorts (${availableCohorts.length})` : 'All Cohorts & Batches'}
                </option>
                {availableCohorts.map((coh) => (
                  <option key={coh} value={coh}>
                    {coh}
                  </option>
                ))}
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
          onInspect={() => currentUser && handleOpenMemberModal(currentUser)}
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* 5. PREMIUM TOP-THREE PODIUM                                   */}
      {/* ------------------------------------------------------------- */}
      <Podium
        firstPlace={firstPlace}
        secondPlace={secondPlace}
        thirdPlace={thirdPlace}
        onSelectMember={(m) => handleOpenMemberModal(m)}
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
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    padding: '4px 6px',
                    borderRadius: '8px',
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
      <div className="card" style={{ padding: '18px 20px', minWidth: 0, width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
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
          <div
            className="table-container"
            style={{
              marginTop: '10px',
              width: '100%',
              maxWidth: '100%',
              minWidth: 0,
              overflowX: 'auto',
              WebkitOverflowScrolling: 'touch',
              border: '1px solid var(--border-subtle)',
              borderRadius: '12px',
              background: 'var(--bg-card)',
            }}
          >
            <table
              className="table leaderboard-table"
              style={{
                width: '100%',
                minWidth: '820px',
                tableLayout: 'auto',
                borderCollapse: 'collapse',
              }}
            >
              <thead>
                <tr>
                  <th style={{ width: '55px', minWidth: '55px', textAlign: 'center' }}>Rank</th>
                  <th style={{ width: '75px', minWidth: '75px', textAlign: 'center' }}>Movement</th>
                  <th style={{ minWidth: '180px' }}>Scholar Name</th>
                  <th style={{ width: '150px', minWidth: '130px' }}>Cohort</th>
                  <th style={{ width: '85px', minWidth: '80px' }}>Badges</th>
                  <th style={{ width: '85px', minWidth: '80px', textAlign: 'center' }}>Courses</th>
                  <th style={{ minWidth: '120px', maxWidth: '160px' }}>Syllabus Mastery</th>
                  <th style={{ width: '70px', minWidth: '65px', textAlign: 'center' }}>Streak</th>
                  <th style={{ width: '90px', minWidth: '90px', textAlign: 'center', whiteSpace: 'nowrap' }}>Action</th>
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
                      style={{
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
                      <td style={{ width: '55px', minWidth: '55px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
                      <td style={{ width: '75px', minWidth: '75px', textAlign: 'center' }}>
                        {rankDelta > 0 ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '3px',
                              background: 'rgba(16, 185, 129, 0.15)',
                              border: '1px solid rgba(16, 185, 129, 0.35)',
                              color: '#10b981',
                              padding: '2px 7px',
                              borderRadius: '999px',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <TrendingUp size={12} /> +{rankDelta}
                          </span>
                        ) : rankDelta < 0 ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '3px',
                              background: 'rgba(244, 63, 94, 0.15)',
                              border: '1px solid rgba(244, 63, 94, 0.35)',
                              color: '#f43f5e',
                              padding: '2px 7px',
                              borderRadius: '999px',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <TrendingDown size={12} /> {rankDelta}
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '2px',
                              color: 'var(--text-muted)',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                            }}
                          >
                            <Minus size={12} /> —
                          </span>
                        )}
                      </td>

                      {/* Scholar Info */}
                      <td style={{ minWidth: '180px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                          <AnimatedAvatar
                            avatarId={m.avatarId}
                            name={m.name}
                            size={34}
                            rank={rank}
                            isCurrentUser={m.isCurrentUser}
                            interactive={true}
                          />
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              <strong style={{ fontSize: '0.85rem', color: m.isCurrentUser ? 'var(--primary)' : 'var(--text-main)', wordBreak: 'break-word' }}>
                                {m.name.replace(' (You)', '')}
                              </strong>
                              {m.isCurrentUser && (
                                <span className="badge badge-primary" style={{ fontSize: '0.6rem', padding: '1px 5px' }}>YOU</span>
                              )}
                              <div style={{ display: 'inline-flex', alignItems: 'center' }}>
                                <RankBadge tier={getRankForPoints(m.points)} size="xs" />
                              </div>
                            </div>
                            <div className="text-muted text-xs" style={{ fontSize: '0.72rem' }}>
                              {m.rollNo}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Cohort */}
                      <td className="text-secondary text-xs" style={{ minWidth: '130px', maxWidth: '160px' }}>
                        <span
                          className="badge badge-secondary"
                          style={{
                            fontSize: '0.7rem',
                            whiteSpace: 'normal',
                            lineHeight: '1.25',
                            wordBreak: 'break-word',
                            display: 'inline-block',
                          }}
                        >
                          {m.cohort}
                        </span>
                      </td>

                      {/* Badges preview */}
                      <td style={{ width: '85px', minWidth: '80px' }}>
                        <div style={{ display: 'flex', gap: '3px', flexWrap: 'nowrap' }}>
                          {badges.map((b) => (
                            <span
                              key={b.id}
                              title={`${b.name}: ${b.description}`}
                              style={{
                                fontSize: '0.85rem',
                                cursor: 'help',
                                background: 'rgba(255, 255, 255, 0.06)',
                                borderRadius: '50%',
                                padding: '2px 3px',
                              }}
                            >
                              {b.icon}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Courses Completed */}
                      <td style={{ textAlign: 'center', width: '85px', minWidth: '80px' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          <GraduationCap size={14} color={rank === 1 ? '#ffd700' : 'var(--primary)'} />
                          <span style={{ fontWeight: 800, fontSize: '0.85rem' }}>
                            {m.coursesCompleted} / {m.coursesEnrolled}
                          </span>
                        </div>
                      </td>

                      {/* Syllabus Mastery */}
                      <td style={{ minWidth: '120px', maxWidth: '160px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
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
                      <td style={{ textAlign: 'center', width: '70px', minWidth: '65px' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: '#f97316', fontWeight: 700 }}>
                          <Flame size={13} color="#f97316" />
                          <span>{m.streakDays}d</span>
                        </div>
                      </td>

                      {/* Action: Exactly One View Button per Row */}
                      <td style={{ textAlign: 'center', width: '90px', minWidth: '90px', whiteSpace: 'nowrap', padding: '8px 6px' }}>
                        <button
                          ref={(el) => {
                            viewButtonRefs.current[m.id] = el;
                          }}
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleOpenMemberModal(m, viewButtonRefs.current[m.id])}
                          aria-label={`View academic profile for ${m.name.replace(' (You)', '')}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '5px',
                            fontSize: '0.75rem',
                            padding: '5px 12px',
                            borderRadius: '8px',
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                            minWidth: '68px',
                          }}
                        >
                          <Eye size={13} style={{ flexShrink: 0 }} />
                          <span>View</span>
                        </button>
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
        const isAuthorizedForTrainer =
          !isTrainer || !trainerAuthorizedCohorts || trainerAuthorizedCohorts.includes(selectedMember.cohort);

        const memberRankIndex = sortedMembers.findIndex((m) => m.id === selectedMember.id);
        const memberRank = memberRankIndex >= 0 ? memberRankIndex + 1 : 1;
        const memberTier = getRankForPoints(selectedMember.points);
        const memberBadges = computeMemberBadges(selectedMember, memberRank);
        const memberProfile = profiles[selectedMember.id];
        const memberBestStreak = memberProfile?.bestStreak || Math.max(selectedMember.streakDays, 14);
        const department = getStudentDepartment(selectedMember);

        return (
          <div
            className="modal-overlay"
            onClick={handleCloseMemberModal}
            style={{ backdropFilter: 'blur(8px)', zIndex: 1100 }}
          >
            <div
              className="modal-card"
              style={{
                maxWidth: '680px',
                width: '95%',
                borderRadius: '16px',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-card)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
                overflow: 'hidden',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
              }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="student-modal-title"
            >
              {/* Modal Header */}
              <div
                style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'var(--bg-card-subtle)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <AnimatedAvatar
                    avatarId={selectedMember.avatarId}
                    name={selectedMember.name}
                    size={48}
                    rank={memberRank}
                    isCurrentUser={selectedMember.isCurrentUser}
                  />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <h3
                        id="student-modal-title"
                        style={{ fontSize: '1.15rem', margin: 0, fontWeight: 800, color: 'var(--text-main)' }}
                      >
                        {selectedMember.name.replace(' (You)', '')}
                      </h3>
                      {selectedMember.isCurrentUser && (
                        <span className="badge badge-primary" style={{ fontSize: '0.62rem' }}>YOU</span>
                      )}
                      <RankBadge tier={memberTier} size="xs" showAura={true} />
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Student ID: <strong style={{ color: 'var(--text-secondary)' }}>{selectedMember.rollNo}</strong>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCloseMemberModal}
                  className="btn btn-secondary btn-sm"
                  aria-label="Close dialog"
                  style={{ width: '32px', height: '32px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px' }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Modal Body */}
              <div
                style={{
                  padding: '18px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  overflowY: 'auto',
                }}
              >
                {!isAuthorizedForTrainer ? (
                  <div
                    style={{
                      padding: '24px',
                      textAlign: 'center',
                      background: 'rgba(239, 68, 68, 0.08)',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      borderRadius: '12px',
                    }}
                  >
                    <Shield size={36} color="#ef4444" style={{ margin: '0 auto 12px' }} />
                    <h4 style={{ margin: '0 0 6px', color: '#ef4444', fontWeight: 700 }}>
                      Access Restricted
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      You are only authorized to view academic profiles of students enrolled in your assigned cohorts.
                      This student belongs to <strong>{selectedMember.cohort}</strong>.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* SECTION 1: PERSONAL DETAILS */}
                    <div
                      style={{
                        background: 'var(--bg-input)',
                        padding: '14px 16px',
                        borderRadius: '12px',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          color: 'var(--text-muted)',
                          marginBottom: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <Users size={14} color="var(--primary)" />
                        <span>Personal Details</span>
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                          gap: '12px',
                        }}
                      >
                        {/* Student Name */}
                        <div>
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block' }}>Student Name</span>
                          <strong style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>
                            {selectedMember.name.replace(' (You)', '')}
                          </strong>
                        </div>

                        {/* Student ID */}
                        <div>
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block' }}>Student ID</span>
                          <strong style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>{selectedMember.rollNo}</strong>
                        </div>

                        {/* Email Address (Hide if missing) */}
                        {selectedMember.email && (
                          <div>
                            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block' }}>Email Address</span>
                            <a
                              href={`mailto:${selectedMember.email}`}
                              style={{
                                fontSize: '0.85rem',
                                color: 'var(--primary)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                textDecoration: 'none',
                                fontWeight: 500,
                              }}
                            >
                              <Mail size={12} />
                              <span>{selectedMember.email}</span>
                            </a>
                          </div>
                        )}

                        {/* Assigned Cohort / Batch */}
                        <div>
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block' }}>Assigned Cohort / Batch</span>
                          <span className="badge badge-secondary" style={{ fontSize: '0.72rem', marginTop: '2px' }}>
                            {selectedMember.cohort}
                          </span>
                        </div>

                        {/* Department (Hide if not available) */}
                        {department && (
                          <div>
                            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block' }}>Department</span>
                            <strong style={{ fontSize: '0.85rem', color: 'var(--text-main)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <Building2 size={12} color="var(--primary)" />
                              {department}
                            </strong>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* SECTION 2: ACADEMIC DETAILS */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          color: 'var(--text-muted)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <GraduationCap size={14} color="var(--primary)" />
                        <span>Academic Details &amp; Performance</span>
                      </div>

                      {/* 6-Card Metric Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))', gap: '8px' }}>
                        {/* Leaderboard Rank */}
                        <div style={{ background: 'var(--bg-input)', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block' }}>Leaderboard Rank</span>
                          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: memberRank <= 3 ? '#ffd700' : 'var(--text-main)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Trophy size={14} color={memberRank <= 3 ? '#ffd700' : 'var(--text-muted)'} />
                            #{memberRank}
                          </div>
                          <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>of {sortedMembers.length} scholars</span>
                        </div>

                        {/* Courses Completed / Enrolled */}
                        <div style={{ background: 'var(--bg-input)', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block' }}>Courses Cleared</span>
                          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <GraduationCap size={14} />
                            {selectedMember.coursesCompleted} / {selectedMember.coursesEnrolled}
                          </div>
                          <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>enrolled courses</span>
                        </div>

                        {/* Course Completion Rate / Syllabus Mastery */}
                        <div style={{ background: 'var(--bg-input)', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block' }}>Syllabus Mastery</span>
                          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: selectedMember.overallCompletionRate >= 80 ? 'var(--success)' : 'var(--text-main)', marginTop: '2px' }}>
                            {selectedMember.overallCompletionRate}%
                          </div>
                          <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>curriculum coverage</span>
                        </div>

                        {/* Points / XP */}
                        <div style={{ background: 'var(--bg-input)', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block' }}>Total Learning XP</span>
                          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f59e0b', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Sparkles size={14} color="#f59e0b" />
                            {selectedMember.points.toLocaleString()}
                          </div>
                          <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>gamification points</span>
                        </div>

                        {/* Learning Streak */}
                        <div style={{ background: 'var(--bg-input)', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block' }}>Study Streak</span>
                          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f97316', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Flame size={14} color="#f97316" />
                            {selectedMember.streakDays}d
                          </div>
                          <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>best: {memberBestStreak}d</span>
                        </div>

                        {/* Certificates Issued */}
                        <div style={{ background: 'var(--bg-input)', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block' }}>Certificates Issued</span>
                          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--accent-purple, #c084fc)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Award size={14} />
                            {selectedMember.certificates}
                          </div>
                          <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>verified credentials</span>
                        </div>
                      </div>

                      {/* Detailed Syllabus Mastery Progress Bar & Assessment Result */}
                      <div style={{ background: 'var(--bg-input)', padding: '14px 16px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)' }}>
                            Curriculum Completion Progress
                          </span>
                          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary)' }}>
                            {selectedMember.overallCompletionRate}%
                          </span>
                        </div>
                        <div className="progress-bar-bg" style={{ height: '8px', background: 'var(--border-subtle)' }}>
                          <div
                            className="progress-bar-fill"
                            style={{
                              width: `${selectedMember.overallCompletionRate}%`,
                              background: 'linear-gradient(90deg, var(--primary), var(--accent-purple))',
                            }}
                          />
                        </div>
                        {selectedMember.recentCourseFinished && (
                          <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px', fontSize: '0.75rem' }}>
                            <span className="text-muted">
                              Latest Completed Track: <strong style={{ color: 'var(--text-main)' }}>{selectedMember.recentCourseFinished}</strong>
                            </span>
                            <span style={{ color: 'var(--success)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <CheckCircle2 size={13} /> Passed Assessment
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Awarded Achievement Badges */}
                      {memberBadges.length > 0 && (
                        <div style={{ background: 'var(--bg-input)', padding: '14px 16px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                          <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '10px' }}>
                            Awarded Achievement Badges ({memberBadges.length})
                          </div>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {memberBadges.map((b) => (
                              <div
                                key={b.id}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  background: 'var(--bg-card)',
                                  padding: '6px 12px',
                                  borderRadius: '8px',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  color: b.color,
                                  border: `1px solid ${b.color}40`,
                                }}
                              >
                                <span style={{ fontSize: '1rem' }}>{b.icon}</span>
                                <div>
                                  <div>{b.name}</div>
                                  <div style={{ fontSize: '0.64rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                                    {b.description}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Modal Footer */}
              <div
                style={{
                  padding: '12px 20px',
                  borderTop: '1px solid var(--border-subtle)',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '10px',
                  background: 'var(--bg-card-subtle)',
                }}
              >
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCloseMemberModal}
                  style={{ fontSize: '0.8rem', padding: '6px 16px' }}
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
