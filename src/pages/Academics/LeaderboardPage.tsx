import React, { useState, useMemo } from 'react';
import { useAuthStore } from '../../lib/store';
import { Link } from 'react-router-dom';
import {
  Trophy, Award, Medal, Crown, Sparkles, BookOpen,
  CheckCircle2, Flame, Search, Filter, TrendingUp,
  BarChart3, Users, ChevronDown, ChevronUp, ArrowRight,
  GraduationCap, Clock, Star, Zap, Eye
} from 'lucide-react';

interface LeaderboardMember {
  id: string;
  name: string;
  email: string;
  rollNo: string;
  avatarInitials: string;
  cohort: string;
  coursesEnrolled: number;
  coursesCompleted: number;
  overallCompletionRate: number; // percentage
  points: number;
  certificates: number;
  weeklyStudyHours: number;
  badgesEarned: number;
  streakDays: number;
  recentCourseFinished: string;
  isCurrentUser?: boolean;
}

const mockLeaderboardData: LeaderboardMember[] = [
  {
    id: 'st-008',
    name: 'Priya Sharma',
    email: 'priya.s@acmelearning.com',
    rollNo: 'STU-2026-008',
    avatarInitials: 'PS',
    cohort: 'Spring 2026 Engineering',
    coursesEnrolled: 6,
    coursesCompleted: 6,
    overallCompletionRate: 98.5,
    points: 4850,
    certificates: 6,
    weeklyStudyHours: 34,
    badgesEarned: 8,
    streakDays: 42,
    recentCourseFinished: 'Full-Stack Web Development Bootcamp'
  },
  {
    id: 'st-006',
    name: 'Marcus Bell',
    email: 'marcus.b@acmelearning.com',
    rollNo: 'STU-2026-006',
    avatarInitials: 'MB',
    cohort: 'Summer 2026 Cloud Architects',
    coursesEnrolled: 6,
    coursesCompleted: 5,
    overallCompletionRate: 92.4,
    points: 4320,
    certificates: 5,
    weeklyStudyHours: 29,
    badgesEarned: 7,
    streakDays: 31,
    recentCourseFinished: 'Docker, Kubernetes & Cloud Architecture'
  },
  {
    id: 'st-003',
    name: 'Elena Rostova',
    email: 'elena.r@acmelearning.com',
    rollNo: 'STU-2026-003',
    avatarInitials: 'ER',
    cohort: 'Fall 2026 Data Science',
    coursesEnrolled: 5,
    coursesCompleted: 4,
    overallCompletionRate: 89.0,
    points: 3980,
    certificates: 4,
    weeklyStudyHours: 26,
    badgesEarned: 6,
    streakDays: 28,
    recentCourseFinished: 'Python for Data Science & Machine Learning'
  },
  {
    id: 'u-007',
    name: 'Alex Thompson (You)',
    email: 'alex@lms.demo',
    rollNo: 'STU-2026-001',
    avatarInitials: 'AT',
    cohort: 'Spring 2026 Engineering',
    coursesEnrolled: 4,
    coursesCompleted: 3,
    overallCompletionRate: 84.5,
    points: 3420,
    certificates: 3,
    weeklyStudyHours: 24,
    badgesEarned: 5,
    streakDays: 19,
    recentCourseFinished: 'TypeScript Mastery & Enterprise Design Patterns',
    isCurrentUser: true
  },
  {
    id: 'st-002',
    name: 'Daniel Wu',
    email: 'daniel.wu@acmelearning.com',
    rollNo: 'STU-2026-002',
    avatarInitials: 'DW',
    cohort: 'Spring 2026 Engineering',
    coursesEnrolled: 5,
    coursesCompleted: 3,
    overallCompletionRate: 81.2,
    points: 3190,
    certificates: 3,
    weeklyStudyHours: 22,
    badgesEarned: 5,
    streakDays: 15,
    recentCourseFinished: 'JavaScript Fundamentals'
  },
  {
    id: 'st-005',
    name: 'Sophia Patel',
    email: 'sophia.p@acmelearning.com',
    rollNo: 'STU-2026-005',
    avatarInitials: 'SP',
    cohort: 'Summer 2026 Cloud Architects',
    coursesEnrolled: 4,
    coursesCompleted: 2,
    overallCompletionRate: 77.8,
    points: 2750,
    certificates: 2,
    weeklyStudyHours: 20,
    badgesEarned: 4,
    streakDays: 14,
    recentCourseFinished: 'Cloud Infrastructure & Networking'
  },
  {
    id: 'st-004',
    name: 'Kwame Mensah',
    email: 'kwame.m@acmelearning.com',
    rollNo: 'STU-2026-004',
    avatarInitials: 'KM',
    cohort: 'Spring 2026 Engineering',
    coursesEnrolled: 4,
    coursesCompleted: 2,
    overallCompletionRate: 71.5,
    points: 2410,
    certificates: 2,
    weeklyStudyHours: 18,
    badgesEarned: 4,
    streakDays: 11,
    recentCourseFinished: 'Database Optimization & SQL'
  },
  {
    id: 'st-007',
    name: 'Chloe Bennett',
    email: 'chloe.b@acmelearning.com',
    rollNo: 'STU-2026-007',
    avatarInitials: 'CB',
    cohort: 'Fall 2026 Data Science',
    coursesEnrolled: 3,
    coursesCompleted: 2,
    overallCompletionRate: 68.0,
    points: 2180,
    certificates: 2,
    weeklyStudyHours: 16,
    badgesEarned: 3,
    streakDays: 9,
    recentCourseFinished: 'Exploratory Data Analysis'
  },
  {
    id: 'st-009',
    name: 'Liam O\'Connor',
    email: 'liam.oc@acmelearning.com',
    rollNo: 'STU-2026-009',
    avatarInitials: 'LO',
    cohort: 'Summer 2026 Cloud Architects',
    coursesEnrolled: 3,
    coursesCompleted: 1,
    overallCompletionRate: 62.5,
    points: 1890,
    certificates: 1,
    weeklyStudyHours: 14,
    badgesEarned: 3,
    streakDays: 7,
    recentCourseFinished: 'Linux Server Administration'
  },
  {
    id: 'st-010',
    name: 'Aisha Al-Mansoor',
    email: 'aisha.m@acmelearning.com',
    rollNo: 'STU-2026-010',
    avatarInitials: 'AA',
    cohort: 'Spring 2026 Engineering',
    coursesEnrolled: 3,
    coursesCompleted: 1,
    overallCompletionRate: 58.0,
    points: 1620,
    certificates: 1,
    weeklyStudyHours: 12,
    badgesEarned: 2,
    streakDays: 5,
    recentCourseFinished: 'Modern HTML5 & Responsive CSS'
  }
];

export const LeaderboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const [activeLeaderboardType, setActiveLeaderboardType] = useState<'most_completed' | 'progress_volume'>('most_completed');
  const [selectedCohort, setSelectedCohort] = useState<string>('all');
  const [timeframe, setTimeframe] = useState<'all_time' | 'semester' | 'month'>('all_time');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllMembers, setShowAllMembers] = useState(false);
  const [selectedMember, setSelectedMember] = useState<LeaderboardMember | null>(null);

  // Sorted list based on chosen Leaderboard Type
  const sortedMembers = useMemo(() => {
    let list = [...mockLeaderboardData];

    // Cohort filtering
    if (selectedCohort !== 'all') {
      list = list.filter((m) => m.cohort === selectedCohort);
    }

    // Search query filtering
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((m) =>
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.rollNo.toLowerCase().includes(q)
      );
    }

    // Sort order
    if (activeLeaderboardType === 'most_completed') {
      // 1. Who completed the most number of courses
      list.sort((a, b) => {
        if (b.coursesCompleted !== a.coursesCompleted) {
          return b.coursesCompleted - a.coursesCompleted;
        }
        if (b.overallCompletionRate !== a.overallCompletionRate) {
          return b.overallCompletionRate - a.overallCompletionRate;
        }
        return b.points - a.points;
      });
    } else {
      // 2. Course volume and completion progress (how many courses enrolled vs completed progress rate)
      list.sort((a, b) => {
        const scoreA = (a.coursesCompleted * 100) + a.overallCompletionRate + (a.coursesEnrolled * 10);
        const scoreB = (b.coursesCompleted * 100) + b.overallCompletionRate + (b.coursesEnrolled * 10);
        return scoreB - scoreA;
      });
    }

    return list;
  }, [activeLeaderboardType, selectedCohort, searchQuery]);

  // Top 3 for the podium graphic
  const top3 = sortedMembers.slice(0, 3);
  const firstPlace = top3[0];
  const secondPlace = top3[1];
  const thirdPlace = top3[2];

  // Members below top 3
  const restOfMembers = sortedMembers.slice(3);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Top Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span className="badge badge-primary" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Trophy size={13} /> Academics & Learning
            </span>
            <span className="text-muted text-xs">Acme Learning Academy &bull; AY 2026–2027</span>
            <span className="simulation-pill">Live Leaderboard</span>
          </div>
          <h1 style={{ fontSize: '1.85rem', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            Academic Leaderboard & Top Achievers
          </h1>
          <p className="text-secondary text-sm" style={{ margin: 0, maxWidth: '750px' }}>
            Honoring academy members with the highest course completion volume, learning progress, and verified credential milestones.
          </p>
        </div>

        {/* Global Stats Pill */}
        <div style={{
          display: 'flex',
          gap: '16px',
          background: 'var(--bg-card)',
          padding: '12px 20px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ textAlign: 'center' }}>
            <span className="text-muted text-xs" style={{ textTransform: 'uppercase', fontWeight: 600 }}>Total Learners</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>342</div>
          </div>
          <div style={{ width: '1px', background: 'var(--border-subtle)' }} />
          <div style={{ textAlign: 'center' }}>
            <span className="text-muted text-xs" style={{ textTransform: 'uppercase', fontWeight: 600 }}>Avg. Completion</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--success)' }}>78.4%</div>
          </div>
          <div style={{ width: '1px', background: 'var(--border-subtle)' }} />
          <div style={{ textAlign: 'center' }}>
            <span className="text-muted text-xs" style={{ textTransform: 'uppercase', fontWeight: 600 }}>Certificates</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-purple)' }}>142</div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* LEADERBOARD TYPE SWITCHER TABS (2 Types as requested) */}
      {/* ------------------------------------------------------------- */}
      <div className="card" style={{ padding: '8px 12px', background: 'var(--bg-surface)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          {/* Main 2 Options Toggle */}
          <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-input)', padding: '4px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <button
              onClick={() => setActiveLeaderboardType('most_completed')}
              className="btn btn-sm"
              style={{
                background: activeLeaderboardType === 'most_completed' ? 'var(--gradient-royal-hot-pink)' : 'transparent',
                color: activeLeaderboardType === 'most_completed' ? '#fff' : 'var(--text-secondary)',
                border: 'none',
                padding: '8px 16px',
                fontSize: '0.85rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                borderRadius: 'var(--radius-sm)',
                boxShadow: activeLeaderboardType === 'most_completed' ? '0 4px 14px rgba(37, 99, 235, 0.4)' : 'none',
                cursor: 'pointer',
                transition: 'var(--transition)'
              }}
            >
              <Crown size={16} color={activeLeaderboardType === 'most_completed' ? '#ffd700' : 'currentColor'} />
              <span>Leaderboard 1: Most Courses Completed</span>
              <span className="badge" style={{
                background: activeLeaderboardType === 'most_completed' ? 'rgba(255,255,255,0.2)' : 'var(--bg-card)',
                color: activeLeaderboardType === 'most_completed' ? '#fff' : 'var(--text-muted)',
                fontSize: '0.7rem'
              }}>
                Course Finishers
              </span>
            </button>

            <button
              onClick={() => setActiveLeaderboardType('progress_volume')}
              className="btn btn-sm"
              style={{
                background: activeLeaderboardType === 'progress_volume' ? 'var(--gradient-electric-neon-pink)' : 'transparent',
                color: activeLeaderboardType === 'progress_volume' ? '#fff' : 'var(--text-secondary)',
                border: 'none',
                padding: '8px 16px',
                fontSize: '0.85rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                borderRadius: 'var(--radius-sm)',
                boxShadow: activeLeaderboardType === 'progress_volume' ? '0 4px 14px rgba(242, 50, 169, 0.4)' : 'none',
                cursor: 'pointer',
                transition: 'var(--transition)'
              }}
            >
              <BarChart3 size={16} />
              <span>Leaderboard 2: Course Volume & Completion Depth</span>
              <span className="badge" style={{
                background: activeLeaderboardType === 'progress_volume' ? 'rgba(255,255,255,0.2)' : 'var(--bg-card)',
                color: activeLeaderboardType === 'progress_volume' ? '#fff' : 'var(--text-muted)',
                fontSize: '0.7rem'
              }}>
                Enrolled vs Done %
              </span>
            </button>
          </div>

          {/* Timeframe & Cohort Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Filter size={14} color="var(--primary)" />
              <select
                className="form-select"
                value={selectedCohort}
                onChange={(e) => setSelectedCohort(e.target.value)}
                style={{ fontSize: '0.8rem', padding: '6px 10px', width: 'auto' }}
              >
                <option value="all">All Cohorts / Batches</option>
                <option value="Spring 2026 Engineering">Spring 2026 Engineering</option>
                <option value="Summer 2026 Cloud Architects">Summer 2026 Cloud Architects</option>
                <option value="Fall 2026 Data Science">Fall 2026 Data Science</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <select
                className="form-select"
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value as any)}
                style={{ fontSize: '0.8rem', padding: '6px 10px', width: 'auto' }}
              >
                <option value="all_time">All-Time Champions</option>
                <option value="semester">Fall Semester 2026</option>
                <option value="month">Current Month (October)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 1. GRAPHICAL PODIUM: TOP 3 ACHIEVERS (Olympic-style 3D Visualizer) */}
      {/* ------------------------------------------------------------- */}
      <div className="card" style={{
        padding: '32px 24px 24px',
        background: 'radial-gradient(ellipse at top, rgba(99, 102, 241, 0.12) 0%, rgba(13, 18, 31, 0.95) 75%)',
        border: '1px solid rgba(99, 102, 241, 0.3)',
        overflow: 'hidden',
        position: 'relative'
      }}>
        {/* Subtle Ambient Glow */}
        <div style={{
          position: 'absolute',
          top: '-60px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '320px',
          height: '140px',
          background: activeLeaderboardType === 'most_completed'
            ? 'radial-gradient(circle, rgba(255, 215, 0, 0.25) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(168, 85, 247, 0.25) 0%, transparent 70%)',
          filter: 'blur(35px)',
          pointerEvents: 'none'
        }} />

        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(255, 215, 0, 0.12)',
            border: '1px solid rgba(255, 215, 0, 0.35)',
            color: '#fbbf24',
            padding: '4px 14px',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.78rem',
            fontWeight: 700,
            marginBottom: '8px'
          }}>
            <Sparkles size={14} />
            {activeLeaderboardType === 'most_completed'
              ? 'Top 3 Course Completion Champions'
              : 'Top 3 Highest Learning Volume & Syllabus Mastery'}
          </div>
          <h2 style={{ fontSize: '1.45rem', margin: 0 }}>
            {activeLeaderboardType === 'most_completed'
              ? 'Hall of Fame: Maximum Courses Completed'
              : 'Course Volume vs Completion Rate Honor Roll'}
          </h2>
          <p className="text-secondary text-xs" style={{ margin: '6px 0 0' }}>
            Exclusive spotlight recognizing the top 3 overall performers in Acme Learning Academy
          </p>
        </div>

        {/* 3D-Styled Olympic Podium */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          alignItems: 'flex-end',
          gap: '20px',
          maxWidth: '920px',
          margin: '0 auto',
          paddingBottom: '10px'
        }}>
          {/* #2 SILVER (Left) */}
          {secondPlace && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              {/* Avatar & Medal */}
              <div style={{ position: 'relative', marginBottom: '12px' }}>
                <div style={{
                  width: '68px',
                  height: '68px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #94a3b8, #475569)',
                  border: '3px solid #cbd5e1',
                  boxShadow: '0 0 16px rgba(203, 213, 225, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.3rem',
                  fontWeight: 800,
                  color: '#fff'
                }}>
                  {secondPlace.avatarInitials}
                </div>
                <div style={{
                  position: 'absolute',
                  bottom: '-6px',
                  right: '-6px',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: '#cbd5e1',
                  color: '#0f172a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.9rem',
                  fontWeight: 900,
                  border: '2px solid var(--bg-surface)'
                }}>
                  🥈
                </div>
              </div>

              <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '2px' }}>{secondPlace.name}</div>
              <div className="text-muted text-xs" style={{ marginBottom: '8px' }}>{secondPlace.cohort}</div>

              {/* Pedestal Block */}
              <div style={{
                width: '100%',
                height: '145px',
                background: 'linear-gradient(180deg, rgba(203, 213, 225, 0.22) 0%, rgba(71, 85, 105, 0.35) 100%)',
                border: '1px solid rgba(203, 213, 225, 0.4)',
                borderBottom: 'none',
                borderTopLeftRadius: 'var(--radius-lg)',
                borderTopRightRadius: 'var(--radius-lg)',
                padding: '16px 12px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
              }}>
                <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#e2e8f0', letterSpacing: '1px' }}>2nd</div>
                <div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#e2e8f0' }}>
                    {activeLeaderboardType === 'most_completed'
                      ? `${secondPlace.coursesCompleted} Courses`
                      : `${secondPlace.overallCompletionRate}%`}
                  </div>
                  <div className="text-muted text-xs" style={{ fontSize: '0.7rem' }}>
                    {activeLeaderboardType === 'most_completed'
                      ? `${secondPlace.certificates} Certificates &bull; ${secondPlace.points} XP`
                      : `${secondPlace.coursesEnrolled} Enrolled &bull; ${secondPlace.coursesCompleted} Finished`}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* #1 GOLD (Center, Tallest) */}
          {firstPlace && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', zIndex: 2 }}>
              {/* Crown & Avatar */}
              <Crown size={32} color="#ffd700" style={{ marginBottom: '4px', filter: 'drop-shadow(0 0 10px rgba(255, 215, 0, 0.6))' }} />
              <div style={{ position: 'relative', marginBottom: '12px' }}>
                <div style={{
                  width: '84px',
                  height: '84px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #f59e0b, #b45309)',
                  border: '4px solid #ffd700',
                  boxShadow: '0 0 24px rgba(255, 215, 0, 0.55)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.6rem',
                  fontWeight: 900,
                  color: '#fff'
                }}>
                  {firstPlace.avatarInitials}
                </div>
                <div style={{
                  position: 'absolute',
                  bottom: '-6px',
                  right: '-6px',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: '#ffd700',
                  color: '#78350f',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.1rem',
                  fontWeight: 900,
                  border: '2px solid var(--bg-surface)'
                }}>
                  🥇
                </div>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: 800,
                fontSize: '1.05rem',
                color: '#fff',
                marginBottom: '2px'
              }}>
                <span>{firstPlace.name}</span>
                <span className="badge badge-warning" style={{ fontSize: '0.62rem' }}>CHAMPION</span>
              </div>
              <div className="text-muted text-xs" style={{ marginBottom: '10px' }}>{firstPlace.cohort}</div>

              {/* Pedestal Block (Tallest) */}
              <div style={{
                width: '100%',
                height: '190px',
                background: 'linear-gradient(180deg, rgba(255, 215, 0, 0.28) 0%, rgba(180, 83, 9, 0.45) 100%)',
                border: '2px solid rgba(255, 215, 0, 0.65)',
                borderBottom: 'none',
                borderTopLeftRadius: 'var(--radius-lg)',
                borderTopRightRadius: 'var(--radius-lg)',
                padding: '20px 14px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 12px 30px rgba(245, 158, 11, 0.35)'
              }}>
                <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#ffd700', letterSpacing: '1px' }}>1st</div>
                <div>
                  <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#ffd700' }}>
                    {activeLeaderboardType === 'most_completed'
                      ? `${firstPlace.coursesCompleted} Courses Finished`
                      : `${firstPlace.overallCompletionRate}% Overall Progress`}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#fef3c7', marginTop: '4px' }}>
                    {activeLeaderboardType === 'most_completed'
                      ? `${firstPlace.certificates} Diplomas Verified &bull; ${firstPlace.points} XP`
                      : `${firstPlace.coursesEnrolled} Courses Enrolled &bull; ${firstPlace.coursesCompleted} Completed (100%)`}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* #3 BRONZE (Right) */}
          {thirdPlace && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              {/* Avatar & Medal */}
              <div style={{ position: 'relative', marginBottom: '12px' }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #b45309, #78350f)',
                  border: '3px solid #d97706',
                  boxShadow: '0 0 16px rgba(217, 119, 6, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  color: '#fff'
                }}>
                  {thirdPlace.avatarInitials}
                </div>
                <div style={{
                  position: 'absolute',
                  bottom: '-6px',
                  right: '-6px',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: '#d97706',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.9rem',
                  fontWeight: 900,
                  border: '2px solid var(--bg-surface)'
                }}>
                  🥉
                </div>
              </div>

              <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '2px' }}>{thirdPlace.name}</div>
              <div className="text-muted text-xs" style={{ marginBottom: '8px' }}>{thirdPlace.cohort}</div>

              {/* Pedestal Block */}
              <div style={{
                width: '100%',
                height: '115px',
                background: 'linear-gradient(180deg, rgba(217, 119, 6, 0.22) 0%, rgba(120, 53, 15, 0.35) 100%)',
                border: '1px solid rgba(217, 119, 6, 0.4)',
                borderBottom: 'none',
                borderTopLeftRadius: 'var(--radius-lg)',
                borderTopRightRadius: 'var(--radius-lg)',
                padding: '14px 10px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
              }}>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#f59e0b', letterSpacing: '1px' }}>3rd</div>
                <div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f59e0b' }}>
                    {activeLeaderboardType === 'most_completed'
                      ? `${thirdPlace.coursesCompleted} Courses`
                      : `${thirdPlace.overallCompletionRate}%`}
                  </div>
                  <div className="text-muted text-xs" style={{ fontSize: '0.7rem' }}>
                    {activeLeaderboardType === 'most_completed'
                      ? `${thirdPlace.certificates} Certificates &bull; ${thirdPlace.points} XP`
                      : `${thirdPlace.coursesEnrolled} Enrolled &bull; ${thirdPlace.coursesCompleted} Finished`}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. GRAPHICAL COMPARISON CHARTS & METRICS (Pure SVG/Visuals) */}
      {/* ------------------------------------------------------------- */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1.3fr', gap: '20px' }}>
        {/* Left: Interactive Comparative Bar Chart */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <BarChart3 size={16} color="var(--primary)" />
                <h3 style={{ fontSize: '1.05rem', margin: 0 }}>
                  {activeLeaderboardType === 'most_completed'
                    ? 'Top Performers: Courses Completed Comparison'
                    : 'Course Enrollment vs Completion Progress Rate (%)'}
                </h3>
              </div>
              <p className="text-muted text-xs" style={{ margin: '4px 0 0' }}>
                {activeLeaderboardType === 'most_completed'
                  ? 'Visual volume comparison of finished curriculum courses across top rankers'
                  : 'Comparing total courses enrolled against syllabus completion depth'}
              </p>
            </div>
            <span className="badge badge-secondary" style={{ fontSize: '0.7rem' }}>Top 6 Ranked</span>
          </div>

          {/* SVG / Styled Bar Visualizer */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '10px' }}>
            {sortedMembers.slice(0, 6).map((m, idx) => {
              const maxVal = activeLeaderboardType === 'most_completed' ? 6 : 100;
              const primaryBarWidth = activeLeaderboardType === 'most_completed'
                ? (m.coursesCompleted / maxVal) * 100
                : m.overallCompletionRate;
              const secondaryBarWidth = (m.coursesEnrolled / 6) * 100;

              return (
                <div key={m.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: idx === 0 ? '#ffd700' : idx === 1 ? '#cbd5e1' : idx === 2 ? '#d97706' : 'var(--bg-card)',
                        color: idx <= 2 ? '#0f172a' : 'var(--text-secondary)',
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {idx + 1}
                      </span>
                      <strong style={{ color: m.isCurrentUser ? 'var(--primary)' : 'var(--text-main)' }}>
                        {m.name}
                      </strong>
                      {m.isCurrentUser && <span className="badge badge-primary" style={{ fontSize: '0.62rem' }}>YOU</span>}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {activeLeaderboardType === 'most_completed' ? (
                        <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '0.85rem' }}>
                          {m.coursesCompleted} / {m.coursesEnrolled} Courses Completed
                        </span>
                      ) : (
                        <div style={{ display: 'flex', gap: '8px', fontSize: '0.75rem' }}>
                          <span className="text-muted">Enrolled: <strong>{m.coursesEnrolled}</strong></span>
                          <span style={{ fontWeight: 800, color: 'var(--success)' }}>{m.overallCompletionRate}% Done</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Visual Bar representation */}
                  {activeLeaderboardType === 'most_completed' ? (
                    <div className="progress-bar-bg" style={{ height: '10px', background: 'var(--bg-input)' }}>
                      <div
                        className="progress-bar-fill"
                        style={{
                          width: `${primaryBarWidth}%`,
                          background: idx === 0
                            ? 'linear-gradient(90deg, #f59e0b, #ffd700)'
                            : idx === 1
                              ? 'linear-gradient(90deg, #64748b, #cbd5e1)'
                              : idx === 2
                                ? 'linear-gradient(90deg, #b45309, #d97706)'
                                : 'linear-gradient(90deg, var(--primary), var(--accent-purple))',
                          transition: 'width 0.8s ease-in-out'
                        }}
                      />
                    </div>
                  ) : (
                    /* Dual Bar Graphic for Option 2 */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="text-muted text-xs" style={{ width: '60px', fontSize: '0.65rem' }}>Progress:</span>
                        <div className="progress-bar-bg" style={{ height: '7px', flex: 1, background: 'var(--bg-input)' }}>
                          <div
                            className="progress-bar-fill"
                            style={{
                              width: `${primaryBarWidth}%`,
                              background: 'linear-gradient(90deg, #10b981, #06b6d4)',
                              transition: 'width 0.8s ease'
                            }}
                          />
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="text-muted text-xs" style={{ width: '60px', fontSize: '0.65rem' }}>Enrolled:</span>
                        <div className="progress-bar-bg" style={{ height: '5px', flex: 1, background: 'var(--bg-input)' }}>
                          <div
                            className="progress-bar-fill"
                            style={{
                              width: `${secondaryBarWidth}%`,
                              background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                              transition: 'width 0.8s ease'
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            <span>Graph updates automatically with learner quiz and final module submissions</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Zap size={12} color="var(--warning)" /> Real-Time Gamification Sync
            </span>
          </div>
        </div>

        {/* Right: Academy Course Completion Radial Distribution */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <TrendingUp size={16} color="var(--success)" />
              <h3 style={{ fontSize: '1.05rem', margin: 0 }}>Completion Tier Distribution</h3>
            </div>
            <p className="text-muted text-xs" style={{ margin: 0 }}>
              Learners grouped by course completion milestone volume
            </p>

            {/* Visual Circular Radar Meter */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '24px',
              padding: '20px 0'
            }}>
              <div style={{ position: 'relative', width: '130px', height: '130px' }}>
                <svg width="130" height="130" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="var(--bg-input)" strokeWidth="10" />
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke="url(#gradient-success)"
                    strokeWidth="10"
                    strokeDasharray="264"
                    strokeDashoffset="58"
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)"
                  />
                  <defs>
                    <linearGradient id="gradient-success" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>
                  </defs>
                </svg>
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-main)', lineHeight: 1 }}>78.4%</div>
                  <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Avg Rate</div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.78rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ffd700' }} />
                    <strong>Master (4+ Finished)</strong>
                  </div>
                  <div className="text-muted text-xs" style={{ paddingLeft: '14px' }}>24% of academy learners</div>
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-purple)' }} />
                    <strong>Advanced (2–3 Finished)</strong>
                  </div>
                  <div className="text-muted text-xs" style={{ paddingLeft: '14px' }}>46% of academy learners</div>
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-cyan)' }} />
                    <strong>In Progress (1 Finished)</strong>
                  </div>
                  <div className="text-muted text-xs" style={{ paddingLeft: '14px' }}>30% of academy learners</div>
                </div>
              </div>
            </div>
          </div>

          {/* Current User Snapshot Card */}
          <div style={{
            background: 'var(--bg-input)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: 'var(--primary)',
                color: '#fff',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.9rem'
              }}>
                AT
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>Your Rank: #4 Overall</div>
                <div className="text-muted text-xs">3 of 4 courses finished &bull; 84.5% complete</div>
              </div>
            </div>

            <button
              onClick={() => setShowAllMembers(true)}
              className="btn btn-primary btn-sm"
              style={{ fontSize: '0.72rem' }}
            >
              View Standing
            </button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. SEE MORE OPTION: ALL MEMBERS BELOW TOP 3 (As requested) */}
      {/* ------------------------------------------------------------- */}
      <div className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={18} color="var(--primary)" />
              <h3 style={{ fontSize: '1.15rem', margin: 0 }}>Academy Leaderboard Roster</h3>
              <span className="badge badge-secondary" style={{ fontSize: '0.7rem' }}>
                {sortedMembers.length} Members
              </span>
            </div>
            <p className="text-muted text-xs" style={{ margin: '4px 0 0' }}>
              Showing {showAllMembers ? 'all academy members' : 'top 3 podium winners'}. Click "See More" to expand full member rankings.
            </p>
          </div>

          {/* Search Box */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-input"
                placeholder="Search member name or roll..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '32px', fontSize: '0.8rem', width: '220px' }}
              />
            </div>

            {/* Toggle See More Button */}
            <button
              onClick={() => setShowAllMembers(!showAllMembers)}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.825rem' }}
            >
              {showAllMembers ? (
                <>
                  <ChevronUp size={16} /> Show Top 3 Only
                </>
              ) : (
                <>
                  <ChevronDown size={16} /> See More Members Below Top 3 ({restOfMembers.length})
                </>
              )}
            </button>
          </div>
        </div>

        {/* If See More is collapsed, show helpful notice */}
        {!showAllMembers && (
          <div style={{
            background: 'var(--bg-input)',
            border: '1px dashed var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px'
          }}>
            <Trophy size={32} color="var(--primary)" />
            <div>
              <h4 style={{ fontSize: '1rem', margin: '0 0 4px' }}>Top 3 Finishers Displayed Above</h4>
              <p className="text-muted text-xs" style={{ margin: 0 }}>
                {restOfMembers.length} additional academy members are ranked below the podium.
              </p>
            </div>
            <button
              onClick={() => setShowAllMembers(true)}
              className="btn btn-secondary btn-sm"
              style={{ gap: '6px' }}
            >
              <ChevronDown size={14} /> Click to See More Members (Ranks #4 to #{sortedMembers.length})
            </button>
          </div>
        )}

        {/* Expandable Table for All Members */}
        {showAllMembers && (
          <div className="table-container" style={{ marginTop: '10px' }}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '70px' }}>Rank</th>
                  <th>Member Name</th>
                  <th>Cohort / Batch</th>
                  <th style={{ textAlign: 'center' }}>
                    {activeLeaderboardType === 'most_completed' ? 'Courses Completed' : 'Courses Enrolled'}
                  </th>
                  <th style={{ minWidth: '180px' }}>Completion Progress %</th>
                  <th>Certificates</th>
                  <th>Total Points</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedMembers.map((m, index) => {
                  const rank = index + 1;
                  const isTop3 = rank <= 3;

                  return (
                    <tr
                      key={m.id}
                      style={{
                        background: m.isCurrentUser
                          ? 'rgba(99, 102, 241, 0.12)'
                          : isTop3
                            ? 'rgba(255, 215, 0, 0.03)'
                            : 'inherit',
                        borderLeft: m.isCurrentUser
                          ? '4px solid var(--primary)'
                          : isTop3
                            ? `4px solid ${rank === 1 ? '#ffd700' : rank === 2 ? '#cbd5e1' : '#d97706'}`
                            : '4px solid transparent'
                      }}
                    >
                      {/* Rank Position */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {rank === 1 ? (
                            <span style={{ fontSize: '1.1rem' }}>🥇</span>
                          ) : rank === 2 ? (
                            <span style={{ fontSize: '1.1rem' }}>🥈</span>
                          ) : rank === 3 ? (
                            <span style={{ fontSize: '1.1rem' }}>🥉</span>
                          ) : (
                            <span style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              background: 'var(--bg-input)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.78rem',
                              color: 'var(--text-muted)'
                            }}>
                              #{rank}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Name & Details */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: rank === 1 ? '#ffd700' : rank === 2 ? '#cbd5e1' : rank === 3 ? '#d97706' : 'var(--bg-input)',
                            color: rank <= 3 ? '#0f172a' : 'var(--text-main)',
                            fontWeight: 800,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.8rem',
                            flexShrink: 0
                          }}>
                            {m.avatarInitials}
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <strong style={{ fontSize: '0.88rem' }}>{m.name}</strong>
                              {m.isCurrentUser && (
                                <span className="badge badge-primary" style={{ fontSize: '0.62rem' }}>YOU</span>
                              )}
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

                      {/* Courses Completed / Enrolled */}
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <GraduationCap size={15} color={rank === 1 ? '#ffd700' : 'var(--primary)'} />
                          <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>
                            {activeLeaderboardType === 'most_completed'
                              ? `${m.coursesCompleted} of ${m.coursesEnrolled}`
                              : `${m.coursesEnrolled} Courses`}
                          </span>
                        </div>
                      </td>

                      {/* Progress Bar & Percentage */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                            <span className="text-muted">Syllabus Mastery:</span>
                            <strong style={{ color: m.overallCompletionRate >= 80 ? 'var(--success)' : 'var(--text-main)' }}>
                              {m.overallCompletionRate}%
                            </strong>
                          </div>
                          <div className="progress-bar-bg" style={{ height: '6px', background: 'var(--bg-input)' }}>
                            <div
                              className="progress-bar-fill"
                              style={{
                                width: `${m.overallCompletionRate}%`,
                                background: m.overallCompletionRate >= 90
                                  ? 'linear-gradient(90deg, #10b981, #06b6d4)'
                                  : 'linear-gradient(90deg, var(--primary), var(--accent-purple))'
                              }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Certificates */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}>
                          <Award size={14} color="var(--accent-purple)" />
                          <span>{m.certificates} Issued</span>
                        </div>
                      </td>

                      {/* Total Points */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Zap size={14} color="var(--warning)" />
                          <strong style={{ color: 'var(--warning)', fontSize: '0.85rem' }}>{m.points} XP</strong>
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => setSelectedMember(m)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '3px 8px', fontSize: '0.72rem', gap: '4px' }}
                        >
                          <Eye size={12} /> Inspect
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

      {/* Member Details Modal */}
      {selectedMember && (
        <div className="modal-overlay" onClick={() => setSelectedMember(null)}>
          <div className="modal-card" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: 'var(--primary)',
                  color: '#fff',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1rem'
                }}>
                  {selectedMember.avatarInitials}
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', margin: 0 }}>{selectedMember.name}</h3>
                  <p className="text-muted text-xs">{selectedMember.rollNo} &bull; {selectedMember.cohort}</p>
                </div>
              </div>
              <button onClick={() => setSelectedMember(null)} className="btn btn-secondary btn-sm">✕</button>
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
                  <span className="text-muted text-xs">Total Gamification XP</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--warning)', marginTop: '2px' }}>
                    {selectedMember.points} XP
                  </div>
                </div>
                <div style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
                  <span className="text-muted text-xs">Verified Certificates</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-purple)', marginTop: '2px' }}>
                    {selectedMember.certificates}
                  </div>
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
              <button className="btn btn-secondary" onClick={() => setSelectedMember(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
