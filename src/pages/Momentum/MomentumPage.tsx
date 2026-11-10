import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../lib/store';
import { useCourseStore } from '../../lib/courseStore';
import { useMomentumStore } from '../../lib/momentumStore';
import { useGamificationStore } from '../../lib/gamificationStore';
import {
  BookOpen, Clock, Trophy, Flame, BarChart2, Calendar,
  Zap, Timer, Play, Pause, Square, Info, ChevronLeft,
  ChevronRight, Check, ArrowRight, FileText
} from 'lucide-react';
import {
  DayStudyRecord,
  formatDate,
  formatDuration,
  getMonthCalendarGrid,
} from './momentumData';

export const MomentumPage: React.FC = () => {
  const { user } = useAuthStore();
  const userName = user?.displayName || (user as any)?.name || user?.firstName || 'Learner';
  const { courses } = useCourseStore();

  const {
    days: studyDatabase,
    metrics: backendMetrics,
    settings,
    todayDate,
    selectedDateStr,
    activeSession,
    fetchMomentum,
    setSelectedDate,
    startSession,
    tickSession,
    endSession,
  } = useMomentumStore();

  const [timeFilter, setTimeFilter] = useState<'This Month' | 'This Week' | 'All Time'>('This Month');
  const [showTimeFilterMenu, setShowTimeFilterMenu] = useState(false);

  // Month navigation state: defaults to current month/year
  const today = new Date();
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonthIndex, setCurrentMonthIndex] = useState<number>(today.getMonth());

  // Local study timer state for standalone display when active session starts
  const [isTimerPaused, setIsTimerPaused] = useState<boolean>(false);
  const [localSeconds, setLocalSeconds] = useState<number>(0);

  // Gamification profile & badges
  const { profiles, leaderboard, fetchLeaderboard } = useGamificationStore();

  // Load momentum metrics and gamification from backend on mount
  useEffect(() => {
    fetchMomentum();
    fetchLeaderboard();
  }, [fetchMomentum, fetchLeaderboard]);

  // Handle active session ticks
  useEffect(() => {
    if (!activeSession || isTimerPaused) return;
    const interval = setInterval(() => {
      tickSession();
      setLocalSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeSession, isTimerPaused, tickSession]);

  // Sync local seconds if activeSession exists
  useEffect(() => {
    if (activeSession) {
      setLocalSeconds(activeSession.elapsedSeconds || 0);
    } else {
      setLocalSeconds(0);
      setIsTimerPaused(false);
    }
  }, [activeSession]);

  // Timer controls
  const handleStartTimer = async () => {
    if (!activeSession) {
      await startSession('Self Study');
      setIsTimerPaused(false);
    } else if (isTimerPaused) {
      setIsTimerPaused(false);
    } else {
      setIsTimerPaused(true);
    }
  };

  const handlePauseTimer = () => {
    if (activeSession) {
      setIsTimerPaused(true);
    }
  };

  const handleEndTimer = async () => {
    if (activeSession) {
      await endSession();
      setIsTimerPaused(false);
      setLocalSeconds(0);
    }
  };

  // Format timer as HH:MM:SS
  const formatTimerDisplay = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate Course Progress metrics dynamically from backend API
  const completedLessons = backendMetrics?.completedLessons ?? 0;
  const totalLessons = backendMetrics?.totalLessons ?? 0;
  const progressPercent = backendMetrics?.lessonsPercent ?? (totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0);

  // In-progress and not started derived counts
  const inProgressLessons = Math.max(0, Math.min(1, totalLessons - completedLessons));
  const notStartedLessons = Math.max(0, totalLessons - completedLessons - inProgressLessons);

  // Weekly study time and progress metrics
  const weekTotalMins = backendMetrics?.weekTotalMinutes ?? 0;
  const formattedStudyTime = formatDuration(weekTotalMins) || (weekTotalMins > 0 ? `${weekTotalMins}m` : '0m');
  const weekGoalMinutes = backendMetrics?.weekGoalMinutes ?? (settings?.weeklyGoalHours ? settings.weeklyGoalHours * 60 : 600);
  const weekPercent = backendMetrics?.weekPercent ?? (weekGoalMinutes > 0 ? Math.min(100, Math.round((weekTotalMins / weekGoalMinutes) * 100)) : 0);

  // Streak data from real activity timestamps
  const streakDays = backendMetrics?.currentStreak ?? 0;

  // Real Badges count from gamification store
  const activeStudentId = user?.id || '';
  const currentMember = leaderboard.find(
    (m: any) =>
      m.userId === activeStudentId ||
      (user?.email && m.email && m.email.toLowerCase() === user.email.toLowerCase())
  );
  const badgesCount =
    currentMember?.badgesCount ||
    (activeStudentId && profiles[activeStudentId]?.claimedMilestones?.length) ||
    0;

  // Month navigation handlers
  const handlePrevMonth = () => {
    if (currentMonthIndex === 0) {
      setCurrentMonthIndex(11);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonthIndex((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonthIndex === 11) {
      setCurrentMonthIndex(0);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonthIndex((prev) => prev + 1);
    }
  };

  // Calendar cells for current month grid
  const calendarData = useMemo(() => {
    return getMonthCalendarGrid(currentYear, currentMonthIndex, studyDatabase);
  }, [currentYear, currentMonthIndex, studyDatabase]);

  const monthNameShort = new Date(currentYear, currentMonthIndex, 1).toLocaleDateString('en-US', { month: 'short' });

  // Selected date record (without fake 45m fallback!)
  const selectedRecord: DayStudyRecord | undefined = studyDatabase[selectedDateStr];
  const selectedMinutes = selectedRecord?.minutes ?? (studyDatabase[selectedDateStr]?.minutes ?? 0);

  // Dynamic Chart Points based on timeFilter ('This Month' | 'This Week' | 'All Time')
  const chartPoints = useMemo(() => {
    const xCoords = [40, 75, 110, 145, 180, 215, 250];

    if (timeFilter === 'This Week') {
      const now = new Date();
      const dayOfWeek = now.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(now);
      monday.setDate(now.getDate() + mondayOffset);
      monday.setHours(0, 0, 0, 0);

      const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

      return dayLabels.map((label, idx) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + idx);
        const dateStr = formatDate(d);
        const rec = studyDatabase[dateStr];
        const minutes = rec?.minutes ?? 0;
        const dailyGoal = rec?.dailyGoalMinutes || settings?.dailyGoalMinutes || 45;
        const percent = Math.min(100, Math.round((minutes / Math.max(1, dailyGoal)) * 100));
        const y = 160 - (percent / 100) * 140;

        return {
          label,
          dateStr,
          minutes,
          percent,
          x: xCoords[idx],
          y,
        };
      });
    }

    if (timeFilter === 'This Month') {
      const daysInMonth = new Date(currentYear, currentMonthIndex + 1, 0).getDate();
      const step = Math.max(1, Math.floor(daysInMonth / 6));

      return [0, 1, 2, 3, 4, 5, 6].map((idx) => {
        const dayNum = Math.min(daysInMonth, 1 + idx * step);
        const d = new Date(currentYear, currentMonthIndex, dayNum);
        const dateStr = formatDate(d);
        const rec = studyDatabase[dateStr];
        const minutes = rec?.minutes ?? 0;
        const dailyGoal = rec?.dailyGoalMinutes || settings?.dailyGoalMinutes || 45;
        const percent = Math.min(100, Math.round((minutes / Math.max(1, dailyGoal)) * 100));
        const y = 160 - (percent / 100) * 140;

        return {
          label: `${monthNameShort} ${dayNum}`,
          dateStr,
          minutes,
          percent,
          x: xCoords[idx],
          y,
        };
      });
    }

    // All Time / Trend: 7 weekly progress buckets
    const now = new Date();
    return [6, 5, 4, 3, 2, 1, 0].map((weeksAgo, idx) => {
      const d = new Date(now);
      d.setDate(now.getDate() - weeksAgo * 7);
      const dateStr = formatDate(d);
      const rec = studyDatabase[dateStr];
      const minutes = rec?.minutes ?? 0;
      const dailyGoal = rec?.dailyGoalMinutes || settings?.dailyGoalMinutes || 45;
      const percent = Math.min(100, Math.round((minutes / Math.max(1, dailyGoal)) * 100));
      const y = 160 - (percent / 100) * 140;

      return {
        label: weeksAgo === 0 ? 'Now' : `-${weeksAgo}w`,
        dateStr,
        minutes,
        percent,
        x: xCoords[idx],
        y,
      };
    });
  }, [timeFilter, studyDatabase, settings, currentYear, currentMonthIndex, monthNameShort]);

  // Compute smooth SVG paths
  const { linePath, areaPath } = useMemo(() => {
    if (!chartPoints || chartPoints.length === 0) {
      return { linePath: '', areaPath: '' };
    }

    let d = `M ${chartPoints[0].x} ${chartPoints[0].y}`;
    for (let i = 1; i < chartPoints.length; i++) {
      const prev = chartPoints[i - 1];
      const curr = chartPoints[i];
      const midX = (prev.x + curr.x) / 2;
      d += ` C ${midX} ${prev.y}, ${midX} ${curr.y}, ${curr.x} ${curr.y}`;
    }

    const firstX = chartPoints[0].x;
    const lastX = chartPoints[chartPoints.length - 1].x;
    const area = `${d} L ${lastX} 160 L ${firstX} 160 Z`;

    return { linePath: d, areaPath: area };
  }, [chartPoints]);

  // Real recent activities from backend studyDatabase
  const displayedActivities = useMemo(() => {
    if (selectedRecord?.activities && selectedRecord.activities.length > 0) {
      return selectedRecord.activities;
    }

    const allActs: any[] = [];
    Object.values(studyDatabase).forEach((d) => {
      if (d.activities && d.activities.length > 0) {
        allActs.push(...d.activities);
      }
    });

    return allActs.sort((a, b) => {
      const tA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const tB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return tB - tA;
    }).slice(0, 5);
  }, [selectedRecord, studyDatabase]);

  // SVG Circular Ring calculation helper
  const renderCircleRing = (percentage: number, color: string, size = 64, strokeWidth = 5) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (Math.min(100, Math.max(0, percentage)) / 100) * circumference;

    return (
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
          style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}
        />
      </svg>
    );
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      color: '#ffffff',
      fontFamily: 'var(--font-sans)',
      paddingBottom: '32px'
    }}>
      {/* 1. HERO BANNER */}
      <div style={{
        position: 'relative',
        width: '100%',
        minHeight: '150px',
        background: 'linear-gradient(135deg, #0d1238 0%, #171b4a 45%, #24144e 100%)',
        border: '1px solid rgba(139, 92, 246, 0.35)',
        boxShadow: '0 8px 32px rgba(124, 58, 237, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.12)',
        borderRadius: '20px',
        padding: '24px 36px',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {/* Background Cosmic Glows and Light Arcs */}
        <div style={{
          position: 'absolute',
          top: '-50%',
          right: '15%',
          width: '320px',
          height: '320px',
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.28) 0%, rgba(37, 99, 235, 0.12) 50%, transparent 70%)',
          pointerEvents: 'none',
          borderRadius: '50%'
        }} />

        <svg style={{ position: 'absolute', top: 0, right: 0, width: '600px', height: '100%', pointerEvents: 'none', opacity: 0.7 }} viewBox="0 0 600 160" fill="none">
          <path d="M50 160C180 80 340 40 600 20" stroke="url(#heroArc1)" strokeWidth="1.5" strokeDasharray="4 4" />
          <path d="M120 160C260 70 420 20 600 0" stroke="url(#heroArc2)" strokeWidth="2" />
          <defs>
            <linearGradient id="heroArc1" x1="50" y1="160" x2="600" y2="20" gradientUnits="userSpaceOnUse">
              <stop stopColor="#818cf8" stopOpacity="0.1" />
              <stop offset="0.6" stopColor="#c084fc" stopOpacity="0.5" />
              <stop offset="1" stopColor="#38bdf8" stopOpacity="0.8" />
            </linearGradient>
            <linearGradient id="heroArc2" x1="120" y1="160" x2="600" y2="0" gradientUnits="userSpaceOnUse">
              <stop stopColor="#a855f7" stopOpacity="0.1" />
              <stop offset="0.5" stopColor="#818cf8" stopOpacity="0.6" />
              <stop offset="1" stopColor="#60a5fa" stopOpacity="0.9" />
            </linearGradient>
          </defs>
        </svg>

        {/* Banner Left Content */}
        <div style={{ position: 'relative', zIndex: 2, maxWidth: '560px' }}>
          <h1 style={{
            fontSize: '1.75rem',
            fontWeight: 800,
            margin: 0,
            color: '#ffffff',
            letterSpacing: '-0.02em',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap'
          }}>
            <span>Your Learning</span>
            <span style={{
              background: 'linear-gradient(90deg, #c084fc 0%, #f472b6 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              display: 'inline-block'
            }}>
              Momentum
            </span>
            <span style={{ display: 'inline-block' }}>🚀</span>
          </h1>
          <p style={{
            fontSize: '0.9rem',
            color: '#a5b4fc',
            margin: '8px 0 0 0',
            lineHeight: 1.5,
            fontWeight: 400
          }}>
            Keep going! You're making great progress in your learning journey.
          </p>
        </div>

        {/* Banner Right Artwork: Boy with Laptop & Glowing Portal Trophy */}
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: '16px', height: '120px' }}>
          <svg width="220" height="120" viewBox="0 0 220 120" fill="none">
            {/* Glowing circular portal */}
            <circle cx="170" cy="58" r="46" fill="url(#portalGrad)" />
            <circle cx="170" cy="58" r="44" stroke="url(#portalBorder)" strokeWidth="2.5" />
            <circle cx="170" cy="58" r="40" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="1" strokeDasharray="3 3" />

            {/* Glowing Golden Trophy inside Portal */}
            <g transform="translate(150, 32)">
              {/* Glow filter */}
              <circle cx="20" cy="24" r="22" fill="#fbbf24" opacity="0.18" />
              {/* Trophy Cup */}
              <path d="M10 8h20v14c0 6-4 11-10 11s-10-5-10-11V8z" fill="url(#trophyGrad)" stroke="#f59e0b" strokeWidth="1" />
              {/* Trophy Handles */}
              <path d="M10 12c-4 0-6 3-6 7s2 7 6 7M30 12c4 0 6 3 6 7s-2 7-6 7" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
              {/* Trophy Stem & Base */}
              <path d="M18 33h4v8h-4z" fill="#d97706" />
              <path d="M13 41h14v4H13z" fill="#b45309" rx="1" />
              {/* Trophy #1 star badge */}
              <circle cx="20" cy="18" r="6" fill="#ffffff" />
              <text x="20" y="21" textAnchor="middle" fontSize="8" fontWeight="800" fill="#d97706">1</text>
            </g>

            {/* Student Studying with Laptop */}
            <g transform="translate(25, 20)">
              {/* Glow from screen onto face and body */}
              <ellipse cx="68" cy="72" rx="30" ry="12" fill="rgba(56, 189, 248, 0.2)" />
              {/* Boy Head */}
              <ellipse cx="45" cy="24" rx="12" ry="14" fill="#fed7aa" />
              {/* Boy Dark Hair */}
              <path d="M33 22c1-8 6-14 14-14 7 0 12 4 13 9 1 3-1 6-3 7-3-2-6-1-10-1-4 0-9 2-14-1z" fill="#1e1b4b" />
              {/* Boy Eye / Focus */}
              <circle cx="49" cy="24" r="1.5" fill="#1e1b4b" />
              {/* Purple/Blue Hoodie Body */}
              <path d="M30 42c3-4 8-6 15-6s12 2 15 6l8 32H22l8-32z" fill="#4338ca" />
              <path d="M38 36c4 3 10 3 14 0l-2 14c-3 2-7 2-10 0l-2-14z" fill="#6366f1" />
              {/* Arm & Hands typing */}
              <path d="M52 46l18 16-6 4-16-14z" fill="#4338ca" />
              <circle cx="68" cy="64" r="3.5" fill="#fed7aa" />
              {/* Laptop Screen & Base */}
              <path d="M64 54l16-6 4 18-16 5z" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.2" />
              {/* Laptop Screen Glow */}
              <polygon points="66,54 78,49 81,63 69,67" fill="#e0f2fe" opacity="0.9" />
              {/* Laptop Base */}
              <polygon points="62,72 82,68 86,74 65,77" fill="#334155" />
            </g>

            <defs>
              <linearGradient id="portalGrad" x1="124" y1="12" x2="216" y2="104" gradientUnits="userSpaceOnUse">
                <stop stopColor="#3b82f6" stopOpacity="0.4" />
                <stop offset="0.6" stopColor="#7c3aed" stopOpacity="0.5" />
                <stop offset="1" stopColor="#1e1b4b" stopOpacity="0.9" />
              </linearGradient>
              <linearGradient id="portalBorder" x1="124" y1="12" x2="216" y2="104" gradientUnits="userSpaceOnUse">
                <stop stopColor="#38bdf8" />
                <stop offset="0.5" stopColor="#a855f7" />
                <stop offset="1" stopColor="#f472b6" />
              </linearGradient>
              <linearGradient id="trophyGrad" x1="10" y1="8" x2="30" y2="33" gradientUnits="userSpaceOnUse">
                <stop stopColor="#fef08a" />
                <stop offset="0.4" stopColor="#facc15" />
                <stop offset="1" stopColor="#eab308" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      {/* 2. FOUR SUMMARY CARDS IN ONE ROW */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '16px'
      }}>
        {/* Card 1: Course Progress */}
        <div style={{
          background: 'rgba(13, 19, 51, 0.92)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '18px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative'
        }}>
          {/* Left: Circular Ring with Percentage */}
          <div style={{ position: 'relative', width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {renderCircleRing(progressPercent, '#00d2ff', 64, 5)}
            <span style={{ position: 'absolute', fontSize: '15px', fontWeight: 700, color: '#ffffff' }}>
              {progressPercent}%
            </span>
          </div>

          {/* Right: Info & Mini Progress Bar */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, marginLeft: '16px', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff' }}>Course Progress</span>
              <BookOpen size={16} color="#3b82f6" />
            </div>
            <span style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
              {completedLessons} / {totalLessons} Lessons
            </span>
            <div style={{
              width: '100%',
              height: '4px',
              background: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '2px',
              marginTop: '8px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${progressPercent}%`,
                height: '100%',
                background: '#00d2ff',
                borderRadius: '2px',
                transition: 'width 0.4s ease'
              }} />
            </div>
          </div>
        </div>

        {/* Card 2: Study Time */}
        <div style={{
          background: 'rgba(13, 19, 51, 0.92)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '18px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative'
        }}>
          {/* Left: Circular Ring with Duration */}
          <div style={{ position: 'relative', width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {renderCircleRing(weekPercent, '#10b981', 64, 5)}
            <span style={{ position: 'absolute', fontSize: '11px', fontWeight: 700, color: '#ffffff', textAlign: 'center' }}>
              {formattedStudyTime}
            </span>
          </div>

          {/* Right: Info & Trend */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, marginLeft: '16px', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff' }}>Study Time</span>
              <Clock size={16} color="#06b6d4" />
            </div>
            <span style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
              This Week
            </span>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#10b981', marginTop: '6px' }}>
              {weekPercent}% of weekly goal
            </span>
          </div>
        </div>

        {/* Card 3: Achievements */}
        <div style={{
          background: 'rgba(13, 19, 51, 0.92)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '18px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative'
        }}>
          {/* Left: Circular Purple Ring with Trophy */}
          <div style={{ position: 'relative', width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {renderCircleRing(badgesCount > 0 ? Math.min(100, badgesCount * 25) : 0, '#8b5cf6', 64, 5)}
            <div style={{ position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Trophy size={20} color="#c084fc" />
            </div>
          </div>

          {/* Right: Info */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, marginLeft: '16px', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff' }}>Achievements</span>
              <Trophy size={16} color="#8b5cf6" />
            </div>
            <span style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
              Verified Credentials
            </span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#c084fc', marginTop: '6px' }}>
              {badgesCount} {badgesCount === 1 ? 'Badge' : 'Badges'}
            </span>
          </div>
        </div>

        {/* Card 4: Study Streak */}
        <div style={{
          background: 'rgba(13, 19, 51, 0.92)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '18px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative'
        }}>
          {/* Left: Circular Ring with Streak Days */}
          <div style={{ position: 'relative', width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {renderCircleRing(streakDays > 0 ? Math.min(100, streakDays * 20) : 0, '#f97316', 64, 5)}
            <span style={{ position: 'absolute', fontSize: '18px', fontWeight: 800, color: '#ffffff' }}>
              {streakDays}
            </span>
          </div>

          {/* Right: Info */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, marginLeft: '16px', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff' }}>Study Streak</span>
              <Flame size={16} color="#f97316" />
            </div>
            <span style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
              Days
            </span>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#fb923c', marginTop: '6px' }}>
              Active Streak 🔥
            </span>
          </div>
        </div>
      </div>

      {/* 3. MIDDLE ROW: LEARNING PROGRESS & LEARNING CALENDAR */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.55fr 1fr',
        gap: '16px',
        alignItems: 'stretch'
      }}>
        {/* Card 1: Learning Progress */}
        <div style={{
          background: 'rgba(13, 19, 51, 0.92)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '22px 24px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                background: 'rgba(37, 99, 235, 0.18)',
                color: '#3b82f6',
                padding: '6px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <BarChart2 size={18} />
              </div>
              <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#ffffff' }}>Learning Progress</h2>
            </div>

            {/* Time Filter Pill */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setShowTimeFilterMenu((prev) => !prev)}
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '20px',
                  padding: '6px 14px',
                  color: '#cbd5e1',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>{timeFilter}</span>
                <span style={{ fontSize: '10px' }}>∨</span>
              </button>

              {showTimeFilterMenu && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '6px',
                  background: '#151b40',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '10px',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
                  zIndex: 20,
                  overflow: 'hidden',
                  minWidth: '120px'
                }}>
                  {(['This Month', 'This Week', 'All Time'] as const).map((filter) => (
                    <div
                      key={filter}
                      onClick={() => {
                        setTimeFilter(filter);
                        setShowTimeFilterMenu(false);
                      }}
                      style={{
                        padding: '8px 14px',
                        fontSize: '12px',
                        color: timeFilter === filter ? '#38bdf8' : '#cbd5e1',
                        cursor: 'pointer',
                        background: timeFilter === filter ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      {filter}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Main Content: Split Donut + Line Chart */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1.35fr',
            gap: '24px',
            alignItems: 'center',
            flex: 1
          }}>
            {/* Left: Donut Chart & Legend */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ position: 'relative', width: 140, height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {(() => {
                  const circumference = 2 * Math.PI * 54;
                  const safeTotal = Math.max(1, totalLessons);
                  const completedRatio = Math.min(1, Math.max(0, completedLessons / safeTotal));
                  const inProgressRatio = Math.min(1 - completedRatio, Math.max(0, inProgressLessons / safeTotal));
                  const notStartedRatio = Math.max(0, 1 - completedRatio - inProgressRatio);

                  const greenDash = circumference * completedRatio;
                  const blueDash = circumference * inProgressRatio;
                  const purpleDash = circumference * notStartedRatio;

                  const greenRot = 0;
                  const blueRot = completedRatio * 360;
                  const purpleRot = (completedRatio + inProgressRatio) * 360;

                  return (
                    <svg width="140" height="140" viewBox="0 0 140 140" style={{ transform: 'rotate(-90deg)' }}>
                      {/* Background Track */}
                      <circle cx="70" cy="70" r="54" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="12" fill="none" />
                      {/* Green segment (Completed Lessons) */}
                      {greenDash > 0 && (
                        <circle
                          cx="70"
                          cy="70"
                          r="54"
                          stroke="#10b981"
                          strokeWidth="12"
                          strokeDasharray={`${greenDash} ${circumference}`}
                          strokeDashoffset={0}
                          strokeLinecap="round"
                          fill="none"
                        />
                      )}
                      {/* Blue segment (In Progress) */}
                      {blueDash > 0 && (
                        <circle
                          cx="70"
                          cy="70"
                          r="54"
                          stroke="#00d2ff"
                          strokeWidth="12"
                          strokeDasharray={`${blueDash} ${circumference}`}
                          strokeDashoffset={0}
                          transform={`rotate(${blueRot} 70 70)`}
                          strokeLinecap="round"
                          fill="none"
                        />
                      )}
                      {/* Purple segment (Not Started) */}
                      {purpleDash > 0 && (
                        <circle
                          cx="70"
                          cy="70"
                          r="54"
                          stroke="#a855f7"
                          strokeWidth="12"
                          strokeDasharray={`${purpleDash} ${circumference}`}
                          strokeDashoffset={0}
                          transform={`rotate(${purpleRot} 70 70)`}
                          strokeLinecap="round"
                          fill="none"
                        />
                      )}
                    </svg>
                  );
                })()}

                <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                  <span style={{ fontSize: '24px', fontWeight: 800, color: '#ffffff', lineHeight: 1 }}>{progressPercent}%</span>
                  <span style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px' }}>Overall Progress</span>
                </div>
              </div>

              {/* Legend */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', marginTop: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
                    <span style={{ color: '#cbd5e1' }}>Completed Lessons</span>
                  </div>
                  <span style={{ fontWeight: 600, color: '#ffffff' }}>{completedLessons} / {totalLessons}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00d2ff' }} />
                    <span style={{ color: '#cbd5e1' }}>In Progress</span>
                  </div>
                  <span style={{ fontWeight: 600, color: '#ffffff' }}>{inProgressLessons} / {totalLessons}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#a855f7' }} />
                    <span style={{ color: '#cbd5e1' }}>Not Started</span>
                  </div>
                  <span style={{ fontWeight: 600, color: '#ffffff' }}>{notStartedLessons} / {totalLessons}</span>
                </div>
              </div>
            </div>

            {/* Right: Line Chart */}
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center' }}>
              <div style={{ position: 'relative', width: '100%', height: '180px' }}>
                <svg width="100%" height="100%" viewBox="0 0 280 180" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="blueLineArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00d2ff" stopOpacity="0.32" />
                      <stop offset="100%" stopColor="#00d2ff" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Gridlines & Y-Axis Labels */}
                  {[
                    { label: '100%', y: 20 },
                    { label: '75%', y: 55 },
                    { label: '50%', y: 90 },
                    { label: '25%', y: 125 },
                    { label: '0%', y: 160 },
                  ].map((grid, idx) => (
                    <g key={idx}>
                      <text x="0" y={grid.y + 3} fill="#64748b" fontSize="9" fontWeight="500">
                        {grid.label}
                      </text>
                      <line x1="30" y1={grid.y} x2="280" y2={grid.y} stroke="rgba(255, 255, 255, 0.06)" strokeWidth="1" />
                    </g>
                  ))}

                  {/* Area fill under curve */}
                  {areaPath && (
                    <path
                      d={areaPath}
                      fill="url(#blueLineArea)"
                    />
                  )}

                  {/* Glowing Blue Line Path */}
                  {linePath && (
                    <path
                      d={linePath}
                      fill="none"
                      stroke="#00d2ff"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      style={{ filter: 'drop-shadow(0 0 6px rgba(0, 210, 255, 0.6))' }}
                    />
                  )}

                  {/* Data Points on Line */}
                  {chartPoints.map((pt, i) => (
                    <circle
                      key={i}
                      cx={pt.x}
                      cy={pt.y}
                      r={pt.minutes > 0 ? 5 : 3.5}
                      fill={pt.minutes > 0 ? '#00d2ff' : '#64748b'}
                      stroke="#ffffff"
                      strokeWidth={pt.minutes > 0 ? 1.5 : 1}
                    >
                      <title>{`${pt.label} (${pt.dateStr}): ${pt.minutes}m studied (${pt.percent}% of daily goal)`}</title>
                    </circle>
                  ))}
                </svg>

                {/* X-Axis Dynamic Labels */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingLeft: '32px',
                  paddingRight: '12px',
                  marginTop: '4px'
                }}>
                  {chartPoints.map((pt, idx) => (
                    <span key={idx} style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 500 }}>
                      {pt.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Learning Calendar */}
        <div style={{
          background: 'rgba(13, 19, 51, 0.92)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '22px 24px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                background: 'rgba(37, 99, 235, 0.18)',
                color: '#3b82f6',
                padding: '6px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Calendar size={18} />
              </div>
              <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#ffffff' }}>Learning Calendar</h2>
            </div>

            {/* Navigation: < Month Year > */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                onClick={handlePrevMonth}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <ChevronLeft size={16} />
              </button>

              <span style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '4px' }}>
                {monthNameShort} {currentYear} <span style={{ fontSize: '10px', color: '#94a3b8' }}>∨</span>
              </span>

              <button
                type="button"
                onClick={handleNextMonth}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Calendar Table Grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
            {/* Weekday Column Headers */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              textAlign: 'center',
              fontSize: '11px',
              fontWeight: 600,
              color: '#64748b'
            }}>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
              <span>Sun</span>
            </div>

            {/* Dates Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '4px',
              rowGap: '6px'
            }}>
              {calendarData.cells.slice(0, 35).map((cell, idx) => {
                const isSelected = cell.date === selectedDateStr || (selectedDateStr === todayDate && cell.record.isToday);
                const hasActivity = cell.record.minutes > 0 || cell.record.activities.length > 0;

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedDate(cell.date)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      height: '32px'
                    }}
                  >
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: isSelected ? 700 : (cell.isCurrentMonth ? 500 : 400),
                      color: isSelected ? '#ffffff' : (cell.isCurrentMonth ? '#cbd5e1' : 'rgba(255, 255, 255, 0.25)'),
                      background: isSelected ? '#2563eb' : 'transparent',
                      boxShadow: isSelected ? '0 0 10px rgba(37, 99, 235, 0.7)' : 'none',
                      transition: 'all 0.15s ease'
                    }}>
                      {cell.dayNumber}
                    </div>

                    {/* Small dot below for dates with study activity */}
                    {hasActivity && !isSelected && (
                      <div style={{
                        width: '3px',
                        height: '3px',
                        borderRadius: '50%',
                        background: '#00d2ff',
                        marginTop: '1px'
                      }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Encouraging Banner */}
          <div style={{
            background: selectedMinutes > 0 ? 'rgba(16, 185, 129, 0.08)' : 'rgba(56, 189, 248, 0.06)',
            border: `1px solid ${selectedMinutes > 0 ? 'rgba(16, 185, 129, 0.22)' : 'rgba(56, 189, 248, 0.16)'}`,
            borderRadius: '12px',
            padding: '12px 14px',
            marginTop: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div style={{
              background: selectedMinutes > 0 ? '#10b981' : '#38bdf8',
              color: '#ffffff',
              borderRadius: '50%',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              {selectedMinutes > 0 ? <Check size={14} strokeWidth={3} /> : <Zap size={14} strokeWidth={2.5} />}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>
                {selectedMinutes > 0
                  ? `You studied ${formatDuration(selectedMinutes)} ${selectedDateStr === todayDate ? 'today' : 'on ' + new Date(selectedDateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}!`
                  : selectedDateStr === todayDate
                  ? 'No study recorded yet today.'
                  : `No study recorded on ${new Date(selectedDateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}.`}
              </span>
              <span style={{ fontSize: '11px', color: selectedMinutes > 0 ? '#a7f3d0' : '#94a3b8', marginTop: '2px' }}>
                {selectedMinutes > 0
                  ? 'Keep the momentum going! 🚀'
                  : selectedDateStr === todayDate
                  ? 'Start a lesson or the study timer below to build your streak! ⏳'
                  : 'Select an active date with a dot to view recorded sessions.'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. BOTTOM ROW: RECENT ACTIVITY & STUDY TIMER */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.55fr 1fr',
        gap: '16px',
        alignItems: 'stretch'
      }}>
        {/* Card 1: Recent Activity */}
        <div style={{
          background: 'rgba(13, 19, 51, 0.92)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '22px 24px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                background: 'rgba(234, 179, 8, 0.18)',
                color: '#eab308',
                padding: '6px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Zap size={18} />
              </div>
              <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#ffffff' }}>Recent Activity</h2>
            </div>

            <Link
              to="/my-learning"
              style={{
                color: '#60a5fa',
                fontSize: '13px',
                fontWeight: 600,
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span>View All</span>
              <span>→</span>
            </Link>
          </div>

          {/* Timeline Items */}
          {displayedActivities.length > 0 ? (
            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '18px', paddingLeft: '8px' }}>
              {/* Connecting Vertical Line */}
              <div style={{
                position: 'absolute',
                left: '21px',
                top: '16px',
                bottom: '16px',
                width: '2px',
                background: 'rgba(255, 255, 255, 0.08)',
                zIndex: 1
              }} />

              {displayedActivities.map((act: any, index: number) => {
                const isLesson = act.type === 'lesson';
                const isQuiz = act.type === 'quiz' || act.type === 'assignment';
                const isStudy = act.type === 'study';

                const iconBg = isLesson ? '#10b981' : isQuiz ? '#0284c7' : isStudy ? '#06b6d4' : '#8b5cf6';
                const dateLabel = act.timestamp
                  ? new Date(act.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })
                  : 'Logged';
                const timeLabel = act.timestamp
                  ? new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : '';

                return (
                  <div key={act.id || index} style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: iconBg,
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {isLesson ? (
                        <Check size={16} strokeWidth={2.5} />
                      ) : isQuiz ? (
                        <FileText size={14} strokeWidth={2.5} />
                      ) : isStudy ? (
                        <Timer size={14} strokeWidth={2.5} />
                      ) : (
                        <Play size={14} fill="#ffffff" strokeWidth={0} />
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {act.title}
                      </span>
                      <span style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                        {act.courseTitle ? `${act.courseTitle} • ` : ''}{dateLabel}{timeLabel ? ` ${timeLabel}` : ''} • {formatDuration(act.durationMinutes || 15)}{act.score ? ` • Score: ${act.score}` : ''}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{
              padding: '28px 16px',
              textAlign: 'center',
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: '12px',
              border: '1px dashed rgba(255, 255, 255, 0.08)',
              margin: 'auto 0'
            }}>
              <Clock size={24} color="#64748b" style={{ margin: '0 auto 8px', opacity: 0.7 }} />
              <p style={{ margin: '0 0 4px', fontSize: '13px', fontWeight: 600, color: '#ffffff' }}>
                No study activity recorded {selectedDateStr === todayDate ? 'today' : 'on this date'}
              </p>
              <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>
                Complete a course lesson or start the study timer to record your learning momentum.
              </p>
            </div>
          )}
        </div>

        {/* Card 2: Study Timer */}
        <div style={{
          background: 'rgba(13, 19, 51, 0.92)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '22px 24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          {/* Header */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                background: 'rgba(37, 99, 235, 0.18)',
                color: '#3b82f6',
                padding: '6px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Timer size={18} />
              </div>
              <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#ffffff' }}>Study Timer</h2>
            </div>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: '4px 0 0 0' }}>
              Track your study time manually
            </p>
          </div>

          {/* Clock Display & Buttons */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            margin: '20px 0'
          }}>
            {/* Clock Digits */}
            <div style={{
              fontFamily: 'var(--font-mono), monospace',
              fontSize: '32px',
              fontWeight: 800,
              color: '#ffffff',
              letterSpacing: '1.5px'
            }}>
              {formatTimerDisplay(localSeconds)}
            </div>

            {/* Controls: Start, Pause, End with labels underneath */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {/* Start / Pause Toggle */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={handleStartTimer}
                  title={activeSession && !isTimerPaused ? 'Pause Timer' : 'Start Timer'}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: '#2563eb',
                    border: 'none',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 0 12px rgba(37, 99, 235, 0.6)',
                    transition: 'transform 0.15s ease'
                  }}
                >
                  {activeSession && !isTimerPaused ? (
                    <Pause size={16} fill="#ffffff" />
                  ) : (
                    <Play size={16} fill="#ffffff" style={{ marginLeft: '2px' }} />
                  )}
                </button>
                <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                  {activeSession && !isTimerPaused ? 'Pause' : 'Start'}
                </span>
              </div>

              {/* Pause Button */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={handlePauseTimer}
                  disabled={!activeSession || isTimerPaused}
                  title="Pause Timer"
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: activeSession && !isTimerPaused ? '#ffffff' : '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: activeSession && !isTimerPaused ? 'pointer' : 'default',
                    opacity: activeSession && !isTimerPaused ? 1 : 0.6,
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Pause size={16} />
                </button>
                <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                  Pause
                </span>
              </div>

              {/* End Button */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={handleEndTimer}
                  disabled={!activeSession}
                  title="End Session"
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: activeSession ? '#ffffff' : '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: activeSession ? 'pointer' : 'default',
                    opacity: activeSession ? 1 : 0.6,
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Square size={14} fill={activeSession ? '#ffffff' : '#64748b'} strokeWidth={0} />
                </button>
                <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                  End
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Info Banner */}
          <div style={{
            background: 'rgba(37, 99, 235, 0.12)',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            borderRadius: '10px',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <Info size={16} color="#60a5fa" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: '12px', color: '#93c5fd', fontWeight: 500 }}>
              Your study time helps grow your learning momentum!
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
