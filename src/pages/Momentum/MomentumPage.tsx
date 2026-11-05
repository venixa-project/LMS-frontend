import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../lib/store';
import { useCourseStore } from '../../lib/courseStore';
import { useMomentumStore } from '../../lib/momentumStore';
import {
  Flame, Award, Trophy, Zap, Clock, Calendar, CheckCircle2,
  ArrowRight, Target, TrendingUp,
  Play, BookOpen, Star, BarChart2, ChevronLeft, ChevronRight,
  CalendarDays, Check, HelpCircle, Square, Timer, RefreshCw
} from 'lucide-react';
import {
  DayStudyRecord,
  formatDate,
  formatDuration,
  parseDate,
  calculateStreak,
  get28DayWindow,
  getMonthCalendarGrid,
  getWeeklyLearningSummary,
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
    isLoading,
    activeSession,
    fetchMomentum,
    setSelectedDate,
    updateGoals,
    startSession,
    tickSession,
    endSession,
  } = useMomentumStore();

  const dailyGoalMinutes = settings.dailyGoalMinutes || 45;
  const weeklyGoalHours = settings.weeklyGoalHours || 10;

  // Calendar View State: '28-day' vs 'month'
  const [calendarView, setCalendarView] = useState<'28-day' | 'month'>('month');
  const [periodOffset28, setPeriodOffset28] = useState<number>(0);

  // Month navigation: dynamically initialized to current year and month
  const now = new Date();
  const [monthNav, setMonthNav] = useState<{ year: number; monthIndex: number }>({
    year: now.getFullYear(),
    monthIndex: now.getMonth(),
  });

  // Session input title
  const [sessionTitleInput, setSessionTitleInput] = useState<string>('');
  const [isStartingSession, setIsStartingSession] = useState<boolean>(false);

  // Fetch initial momentum data from backend
  useEffect(() => {
    fetchMomentum();
  }, [fetchMomentum]);

  // Active study session timer tick
  useEffect(() => {
    if (!activeSession) return;
    const interval = setInterval(() => {
      tickSession();
    }, 1000);
    return () => clearInterval(interval);
  }, [activeSession, tickSession]);

  // Today's record
  const todayRecord: DayStudyRecord = studyDatabase[todayDate] || {
    date: todayDate,
    dayName: parseDate(todayDate).toLocaleDateString('en-US', { weekday: 'short' }),
    dayNumber: parseDate(todayDate).getDate(),
    minutes: 0,
    dailyGoalMinutes,
    goalReached: false,
    goalExceeded: false,
    level: 0,
    isToday: true,
    isFuture: false,
    activities: [],
  };

  // Streak calculation (falls back to local calculator if backend metrics null)
  const streakData = useMemo(() => {
    if (backendMetrics && backendMetrics.currentStreak !== undefined) {
      return {
        currentStreak: backendMetrics.currentStreak,
        personalBest: backendMetrics.personalBestStreak,
      };
    }
    return calculateStreak(studyDatabase, 20);
  }, [backendMetrics, studyDatabase]);

  // 28-Day Window Data
  const window28Data = useMemo(() => {
    return get28DayWindow(studyDatabase, periodOffset28, parseDate(todayDate));
  }, [studyDatabase, periodOffset28, todayDate]);

  // Month View Data (Google Calendar style dynamic month grid)
  const monthData = useMemo(() => {
    return getMonthCalendarGrid(monthNav.year, monthNav.monthIndex, studyDatabase, parseDate(todayDate));
  }, [monthNav, studyDatabase, todayDate]);

  // Weekly Summary Data
  const weeklySummary = useMemo(() => {
    return getWeeklyLearningSummary(studyDatabase, dailyGoalMinutes, weeklyGoalHours, parseDate(todayDate));
  }, [studyDatabase, dailyGoalMinutes, weeklyGoalHours, todayDate]);

  // Selected Day Record
  const selectedDayRecord: DayStudyRecord = studyDatabase[selectedDateStr] || {
    date: selectedDateStr,
    dayName: parseDate(selectedDateStr).toLocaleDateString('en-US', { weekday: 'short' }),
    dayNumber: parseDate(selectedDateStr).getDate(),
    minutes: 0,
    dailyGoalMinutes,
    goalReached: false,
    goalExceeded: false,
    level: 0,
    isToday: selectedDateStr === todayDate,
    isFuture: selectedDateStr > todayDate,
    activities: [],
  };

  // Consistency calculation over the current 28-day window
  const consistencyStats = useMemo(() => {
    if (backendMetrics && backendMetrics.consistencyPercent !== undefined) {
      return {
        percent: backendMetrics.consistencyPercent,
        reachedDays: backendMetrics.consistencyDaysReached,
        totalTracked: backendMetrics.consistencyTotalTrackedDays,
      };
    }
    const days = window28Data.days;
    const trackedDays = days.filter((d) => !d.isFuture);
    const reachedDays = trackedDays.filter((d) => d.minutes >= dailyGoalMinutes);
    const percent = trackedDays.length > 0 ? Math.round((reachedDays.length / trackedDays.length) * 100) : 0;
    return {
      percent,
      reachedDays: reachedDays.length,
      totalTracked: trackedDays.length,
    };
  }, [backendMetrics, window28Data, dailyGoalMinutes]);

  // Handle changing daily goal
  const handleSelectDailyGoal = async (mins: number) => {
    await updateGoals(mins);
  };

  // Navigation handlers for 28-day view
  const handlePrev28 = () => {
    setPeriodOffset28((prev) => prev - 1);
  };

  const handleNext28 = () => {
    setPeriodOffset28((prev) => prev + 1);
  };

  const handleCurrent28 = () => {
    setPeriodOffset28(0);
    setSelectedDate(todayDate);
  };

  // Google Calendar Month Navigation handlers
  const handlePrevMonth = () => {
    setMonthNav((prev) => {
      if (prev.monthIndex === 0) {
        return { year: prev.year - 1, monthIndex: 11 };
      }
      return { year: prev.year, monthIndex: prev.monthIndex - 1 };
    });
  };

  const handleNextMonth = () => {
    setMonthNav((prev) => {
      if (prev.monthIndex === 11) {
        return { year: prev.year + 1, monthIndex: 0 };
      }
      return { year: prev.year, monthIndex: prev.monthIndex + 1 };
    });
  };

  const handleCurrentMonth = () => {
    const cur = new Date();
    setMonthNav({ year: cur.getFullYear(), monthIndex: cur.getMonth() });
    setSelectedDate(todayDate);
  };

  // Select a date card
  const handleSelectDate = (dateStr: string) => {
    setSelectedDate(dateStr);
  };

  // Start study session handler
  const handleStartSession = async () => {
    setIsStartingSession(true);
    const title = sessionTitleInput.trim() || 'Core Curriculum Study Session';
    await startSession(title);
    setSessionTitleInput('');
    setIsStartingSession(false);
  };

  // Format elapsed time MM:SS
  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Modern Dark Cosmic Level Styling
  const levelStyles: Record<
    0 | 1 | 2 | 3,
    {
      cardBg: string;
      cardBorder: string;
      weekdayColor: string;
      dayNumberColor: string;
      badgeBg: string;
      badgeColor: string;
      badgeBorder: string;
      glowShadow: string;
      label: string;
      barColor: string;
    }
  > = {
    0: {
      cardBg: 'rgba(15, 23, 42, 0.45)',
      cardBorder: '1px dashed rgba(255, 255, 255, 0.08)',
      weekdayColor: '#64748b',
      dayNumberColor: '#94a3b8',
      badgeBg: 'rgba(255, 255, 255, 0.04)',
      badgeColor: '#64748b',
      badgeBorder: '1px solid rgba(255, 255, 255, 0.08)',
      glowShadow: 'none',
      label: 'Rest Day (0m)',
      barColor: 'rgba(255, 255, 255, 0.06)',
    },
    1: {
      cardBg: 'linear-gradient(180deg, rgba(245, 158, 11, 0.09) 0%, rgba(15, 23, 42, 0.8) 100%)',
      cardBorder: '1px solid rgba(245, 158, 11, 0.28)',
      weekdayColor: '#cbd5e1',
      dayNumberColor: '#ffffff',
      badgeBg: 'rgba(245, 158, 11, 0.16)',
      badgeColor: '#fbbf24',
      badgeBorder: '1px solid rgba(245, 158, 11, 0.32)',
      glowShadow: '0 4px 12px rgba(245, 158, 11, 0.08)',
      label: `In Progress (<${dailyGoalMinutes}m)`,
      barColor: '#f59e0b',
    },
    2: {
      cardBg: 'linear-gradient(180deg, rgba(16, 185, 129, 0.15) 0%, rgba(15, 23, 42, 0.85) 100%)',
      cardBorder: '1px solid rgba(16, 185, 129, 0.42)',
      weekdayColor: '#a7f3d0',
      dayNumberColor: '#ffffff',
      badgeBg: 'rgba(16, 185, 129, 0.2)',
      badgeColor: '#34d399',
      badgeBorder: '1px solid rgba(16, 185, 129, 0.4)',
      glowShadow: '0 4px 14px rgba(16, 185, 129, 0.12)',
      label: `Goal Met (${dailyGoalMinutes}m+)`,
      barColor: '#10b981',
    },
    3: {
      cardBg: 'linear-gradient(135deg, rgba(16, 185, 129, 0.22) 0%, rgba(99, 102, 241, 0.18) 100%)',
      cardBorder: '1.5px solid rgba(52, 211, 153, 0.55)',
      weekdayColor: '#34d399',
      dayNumberColor: '#ffffff',
      badgeBg: 'linear-gradient(135deg, rgba(16, 185, 129, 0.35), rgba(99, 102, 241, 0.35))',
      badgeColor: '#f0fdf4',
      badgeBorder: '1px solid rgba(52, 211, 153, 0.5)',
      glowShadow: '0 4px 16px rgba(16, 185, 129, 0.22), 0 0 10px rgba(99, 102, 241, 0.15)',
      label: `Supercharged (${Math.round(dailyGoalMinutes * 1.5)}m+)`,
      barColor: 'linear-gradient(180deg, #34d399 0%, #10b981 100%)',
    },
  };

  // Format today's remaining time
  const todayProgressPercent = Math.min(100, Math.round((todayRecord.minutes / dailyGoalMinutes) * 100));
  const todayRemainingMinutes = Math.max(0, dailyGoalMinutes - todayRecord.minutes);

  // Selected date formatted text (e.g. "Tuesday, 4 November 2026")
  const selectedDateFormatted = useMemo(() => {
    const d = parseDate(selectedDateStr);
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, [selectedDateStr]);

  const todayDateFormatted = useMemo(() => {
    const d = parseDate(todayDate);
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, [todayDate]);

  const selectedProgressPercent = Math.min(100, Math.round((selectedDayRecord.minutes / dailyGoalMinutes) * 100));
  const selectedRemainingMinutes = Math.max(0, dailyGoalMinutes - selectedDayRecord.minutes);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 1. EXECUTIVE MOMENTUM HEADER */}
      <div
        className="card"
        style={{
          background: 'radial-gradient(ellipse at top right, rgba(84, 71, 255, 0.14) 0%, rgba(16, 185, 129, 0.08) 50%, var(--bg-surface) 100%)',
          border: '1px solid var(--border-subtle)',
          padding: '24px 28px',
          borderRadius: 'var(--radius-xl)',
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '18px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <span className="badge badge-primary" style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <Calendar size={13} /> {todayDateFormatted}
              </span>
              {isLoading && (
                <span className="badge badge-neutral" style={{ fontSize: '0.72rem', gap: '4px' }}>
                  <RefreshCw size={11} className="animate-spin" /> Syncing...
                </span>
              )}
            </div>

            <h1 style={{ fontSize: '1.9rem', fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '-0.02em', color: 'var(--text-main)' }}>
              Learning Momentum
            </h1>
            <p className="text-secondary text-sm" style={{ maxWidth: '640px', margin: 0, lineHeight: 1.5 }}>
              Track daily study progress, consistency milestones, and course velocity.
            </p>
          </div>

          {/* Clean Target Setting Controller */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                background: 'var(--bg-input)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <Target size={15} color="var(--primary)" />
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Daily Target:</span>
              <div style={{ display: 'flex', gap: '4px' }}>
                {[15, 30, 45, 60].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => handleSelectDailyGoal(mins)}
                    style={{
                      padding: '3px 8px',
                      borderRadius: '4px',
                      border: dailyGoalMinutes === mins ? '1px solid var(--primary)' : '1px solid transparent',
                      background: dailyGoalMinutes === mins ? 'var(--primary)' : 'transparent',
                      color: dailyGoalMinutes === mins ? '#ffffff' : 'var(--text-secondary)',
                      fontWeight: 700,
                      fontSize: '0.72rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {mins}m
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* LIVE STUDY TRACKER BAR */}
        <div
          style={{
            marginTop: '20px',
            padding: '14px 18px',
            background: activeSession
              ? 'linear-gradient(90deg, rgba(16, 185, 129, 0.18) 0%, rgba(15, 23, 42, 0.85) 100%)'
              : 'rgba(15, 23, 42, 0.55)',
            border: activeSession ? '1.5px solid #10b981' : '1px solid var(--border-subtle)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '14px',
          }}
        >
          {activeSession ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    background: 'rgba(16, 185, 129, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#10b981',
                  }}
                >
                  <Timer size={20} className="animate-pulse" />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#10b981' }}>
                      ● Active Study Session
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Auto-recording to database</span>
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>
                    {activeSession.title}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'monospace', color: '#34d399' }}>
                    {formatTimer(activeSession.elapsedSeconds)}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Elapsed Study Time</div>
                </div>
                <button
                  type="button"
                  onClick={() => endSession()}
                  className="btn btn-sm"
                  style={{
                    background: '#ef4444',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 700,
                    padding: '8px 14px',
                    gap: '6px',
                  }}
                >
                  <Square size={13} fill="#ffffff" /> End & Save Session
                </button>
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Zap size={18} color="var(--primary)" />
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    Study Session Tracker
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Start a focused session right now to automatically advance today&apos;s momentum.
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, maxWidth: '440px', justifyContent: 'flex-end' }}>
                <input
                  type="text"
                  placeholder="Session focus (e.g. Algorithms Review)..."
                  value={sessionTitleInput}
                  onChange={(e) => setSessionTitleInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleStartSession();
                  }}
                  style={{
                    fontSize: '0.78rem',
                    padding: '7px 12px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '6px',
                    color: 'var(--text-main)',
                    flex: 1,
                  }}
                />
                <button
                  type="button"
                  onClick={handleStartSession}
                  disabled={isStartingSession}
                  className="btn btn-primary btn-sm"
                  style={{ fontWeight: 700, gap: '6px', whiteSpace: 'nowrap' }}
                >
                  <Play size={13} /> Start Live Session
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 2. FOUR SUMMARY CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        {/* CARD 1: STUDY STREAK */}
        <div className="card stat-card" style={{ borderLeft: '4px solid #f59e0b', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="text-muted text-xs font-semibold">Study Streak</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#f59e0b', fontSize: '0.75rem', fontWeight: 700 }}>
              <Flame size={14} fill="#f59e0b" /> {streakData.currentStreak > 0 ? 'ACTIVE' : 'READY'}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', margin: '6px 0 2px' }}>
            <span style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
              {streakData.currentStreak}
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.88rem', fontWeight: 600 }}>days in a row</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
            Personal best: <strong style={{ color: 'var(--text-main)' }}>{streakData.personalBest} days</strong>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', background: 'var(--bg-input)', padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
            Requires at least 20 mins of study activity per day.
          </div>
        </div>

        {/* CARD 2: STUDY TIME THIS WEEK */}
        <div className="card stat-card" style={{ borderLeft: '4px solid var(--primary)', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="text-muted text-xs font-semibold">Study Time This Week</span>
            <span className="badge badge-primary" style={{ fontSize: '0.68rem', fontWeight: 700 }}>
              {weeklySummary.goalPercent}% of goal
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', margin: '6px 0 2px' }}>
            <span style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
              {formatDuration(weeklySummary.totalMinutes)}
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.88rem', fontWeight: 600 }}>/ {weeklyGoalHours}h goal</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
            Active days: <strong style={{ color: 'var(--text-main)' }}>{weeklySummary.activeDaysCount} of 7 days</strong>
          </div>
          <div className="progress-bar-bg" style={{ height: '6px' }}>
            <div className="progress-bar-fill" style={{ width: `${Math.min(100, weeklySummary.goalPercent)}%` }} />
          </div>
        </div>

        {/* CARD 3: 28-DAY CONSISTENCY */}
        <div className="card stat-card" style={{ borderLeft: '4px solid #10b981', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="text-muted text-xs font-semibold">28-Day Consistency</span>
            <span className="badge badge-success" style={{ fontSize: '0.68rem', fontWeight: 700 }}>
              {consistencyStats.percent}%
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', margin: '6px 0 2px' }}>
            <span style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
              {consistencyStats.reachedDays}
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.88rem', fontWeight: 600 }}>/ {consistencyStats.totalTracked} tracked days</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
            Days target reached ({dailyGoalMinutes}m+) in current window
          </div>
          <div className="progress-bar-bg" style={{ height: '6px' }}>
            <div className="progress-bar-fill" style={{ width: `${consistencyStats.percent}%`, background: '#10b981' }} />
          </div>
        </div>

        {/* CARD 4: TODAY'S STUDY DURATION */}
        <div className="card stat-card" style={{ borderLeft: '4px solid #8b5cf6', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="text-muted text-xs font-semibold">Today&apos;s Study Time</span>
            <span className={`badge badge-${todayRecord.goalReached ? 'success' : 'warning'}`} style={{ fontSize: '0.68rem', fontWeight: 700 }}>
              {todayRecord.goalReached ? 'Target Reached' : `${todayRemainingMinutes}m left`}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', margin: '6px 0 2px' }}>
            <span style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
              {formatDuration(todayRecord.minutes)}
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.88rem', fontWeight: 600 }}>/ {dailyGoalMinutes}m target</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
            {todayRecord.activities.length} activity item{todayRecord.activities.length === 1 ? '' : 's'} recorded today
          </div>
          <div className="progress-bar-bg" style={{ height: '6px' }}>
            <div className="progress-bar-fill" style={{ width: `${todayProgressPercent}%`, background: todayRecord.goalReached ? '#10b981' : '#8b5cf6' }} />
          </div>
        </div>
      </div>

      {/* 3. INTERACTIVE STUDY CONSISTENCY CALENDAR */}
      <div className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CalendarDays size={20} color="var(--primary)" />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                Study Consistency Calendar
              </h2>
            </div>
            <p className="text-secondary text-xs" style={{ margin: '3px 0 0 0' }}>
              Inspect daily study duration, lesson completions, and goal achievement history.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {/* View Switcher: 28-Day View vs Month View */}
            <div style={{ display: 'flex', background: 'var(--bg-input)', padding: '3px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <button
                type="button"
                onClick={() => setCalendarView('28-day')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  border: 'none',
                  background: calendarView === '28-day' ? 'var(--primary)' : 'transparent',
                  color: calendarView === '28-day' ? '#ffffff' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                28-Day View
              </button>
              <button
                type="button"
                onClick={() => setCalendarView('month')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  border: 'none',
                  background: calendarView === 'month' ? 'var(--primary)' : 'transparent',
                  color: calendarView === 'month' ? '#ffffff' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                Month View
              </button>
            </div>

            {/* Google Calendar Style Dynamic Navigation Controls */}
            {calendarView === '28-day' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handlePrev28}
                  style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                  title="Previous 28 days"
                >
                  <ChevronLeft size={14} /> Prev
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleCurrent28}
                  disabled={periodOffset28 === 0}
                  style={{ padding: '6px 10px', fontSize: '0.75rem', fontWeight: 600 }}
                  title="Return to current 28 days"
                >
                  Current Window
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleNext28}
                  style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                  title="Next 28 days"
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handlePrevMonth}
                  style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                  title="Previous month"
                >
                  <ChevronLeft size={14} /> Prev
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleCurrentMonth}
                  style={{ padding: '6px 10px', fontSize: '0.75rem', fontWeight: 600 }}
                  title="Return to today"
                >
                  Today
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleNextMonth}
                  style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                  title="Next month"
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Date Range Badge & Legend */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            padding: '10px 14px',
            background: 'var(--bg-input)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)' }}>
              {calendarView === '28-day' ? (
                <>Period: {window28Data.startDate} &mdash; {window28Data.endDate} ({periodOffset28 === 0 ? 'Current 28 Days' : 'Historical Window'})</>
              ) : (
                <>{monthData.monthName} {monthData.year}</>
              )}
            </span>
          </div>

          {/* Accessible Visible Legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', fontSize: '0.73rem', color: 'var(--text-muted)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: levelStyles[0].cardBg, border: levelStyles[0].cardBorder }} />
              <span>Rest Day (0m)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'rgba(245, 158, 11, 0.25)', border: '1px solid #f59e0b' }} />
              <span>In Progress (&lt;{dailyGoalMinutes}m)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'rgba(16, 185, 129, 0.25)', border: '1px solid #10b981' }} />
              <span>Goal Achieved ({dailyGoalMinutes}m+)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.4), rgba(99, 102, 241, 0.4))', border: '1px solid #34d399' }} />
              <span>Supercharged ({Math.round(dailyGoalMinutes * 1.5)}m+)</span>
            </div>
          </div>
        </div>

        {/* VIEW A: 28-DAY STUDY CALENDAR */}
        {calendarView === '28-day' && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '10px',
            }}
          >
            {window28Data.days.map((item) => {
              const isSelected = selectedDateStr === item.date;
              const isToday = item.date === todayDate;
              const style = levelStyles[item.level];
              const pctOfGoal = Math.min(100, Math.round((item.minutes / dailyGoalMinutes) * 100));

              return (
                <div
                  key={item.date}
                  tabIndex={0}
                  role="button"
                  aria-label={`${item.date}, ${item.dayName}: ${item.minutes} minutes studied. ${style.label}`}
                  onClick={() => handleSelectDate(item.date)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSelectDate(item.date);
                    }
                  }}
                  style={{
                    background: isToday
                      ? 'linear-gradient(180deg, rgba(56, 189, 248, 0.16) 0%, rgba(15, 23, 42, 0.9) 100%)'
                      : style.cardBg,
                    border: isSelected
                      ? '2.5px solid #ffffff'
                      : isToday
                        ? '2px solid #38bdf8'
                        : style.cardBorder,
                    borderRadius: '12px',
                    padding: '12px 10px',
                    minHeight: '86px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    boxShadow: isSelected
                      ? '0 0 18px rgba(255,255,255,0.45)'
                      : isToday
                        ? '0 0 16px rgba(56, 189, 248, 0.45), inset 0 0 10px rgba(56, 189, 248, 0.1)'
                        : style.glowShadow,
                    position: 'relative',
                    outline: 'none',
                    backdropFilter: 'blur(8px)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {isToday && (
                    <span
                      style={{
                        position: 'absolute',
                        top: '-8px',
                        background: '#38bdf8',
                        color: '#040711',
                        fontSize: '0.62rem',
                        fontWeight: 900,
                        padding: '1px 6px',
                        borderRadius: '4px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        boxShadow: '0 2px 8px rgba(56, 189, 248, 0.5)',
                      }}
                    >
                      Today
                    </span>
                  )}

                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      color: style.weekdayColor,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {item.dayName}
                  </span>

                  <span
                    style={{
                      fontSize: '1.15rem',
                      fontWeight: 800,
                      color: isToday ? '#38bdf8' : style.dayNumberColor,
                      lineHeight: 1.1,
                    }}
                  >
                    {item.dayNumber}
                  </span>

                  {item.minutes > 0 ? (
                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          background: style.badgeBg,
                          color: style.badgeColor,
                          border: style.badgeBorder,
                          padding: '2px 7px',
                          borderRadius: '5px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                        }}
                      >
                        {item.minutes}m {item.level === 3 ? '★' : item.level === 2 ? '✓' : ''}
                      </span>

                      {item.level === 1 && (
                        <div
                          style={{
                            width: '80%',
                            height: '3px',
                            background: 'rgba(255, 255, 255, 0.08)',
                            borderRadius: '2px',
                            overflow: 'hidden',
                          }}
                          title={`${pctOfGoal}% of daily target (${dailyGoalMinutes - item.minutes}m remaining)`}
                        >
                          <div
                            style={{
                              width: `${pctOfGoal}%`,
                              height: '100%',
                              background: '#f59e0b',
                              borderRadius: '2px',
                            }}
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <span
                      style={{
                        fontSize: '0.67rem',
                        color: '#64748b',
                        background: style.badgeBg,
                        border: style.badgeBorder,
                        padding: '1px 6px',
                        borderRadius: '4px',
                      }}
                    >
                      Rest
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* VIEW B: MONTHLY STUDY CALENDAR (Google Calendar Grid Style) */}
        {calendarView === 'month' && (
          <div>
            {/* Weekday Column Headers */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: '8px',
                textAlign: 'center',
                marginBottom: '8px',
              }}
            >
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                <div key={day} style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                  {day}
                </div>
              ))}
            </div>

            {/* Monthly Calendar Cells Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: '8px',
              }}
            >
              {monthData.cells.map((cell) => {
                const isSelected = selectedDateStr === cell.date;
                const isToday = cell.date === todayDate;
                const rec = cell.record;
                const style = levelStyles[rec.level];

                return (
                  <div
                    key={cell.date}
                    tabIndex={cell.isCurrentMonth ? 0 : -1}
                    role="button"
                    aria-label={`${cell.date}: ${rec.minutes} mins studied. ${style.label}`}
                    onClick={() => handleSelectDate(cell.date)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSelectDate(cell.date);
                      }
                    }}
                    style={{
                      minHeight: '74px',
                      background: isToday
                        ? 'linear-gradient(180deg, rgba(56, 189, 248, 0.16) 0%, rgba(15, 23, 42, 0.9) 100%)'
                        : cell.isCurrentMonth
                          ? style.cardBg
                          : 'rgba(15, 23, 42, 0.2)',
                      border: isSelected
                        ? '2.5px solid #ffffff'
                        : isToday
                          ? '2px solid #38bdf8'
                          : cell.isCurrentMonth
                            ? style.cardBorder
                            : '1px solid rgba(255, 255, 255, 0.04)',
                      borderRadius: '10px',
                      padding: '8px 10px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      opacity: cell.isCurrentMonth ? 1 : 0.4,
                      boxShadow: isSelected
                        ? '0 0 16px rgba(255,255,255,0.45)'
                        : isToday
                          ? '0 0 16px rgba(56, 189, 248, 0.4)'
                          : style.glowShadow,
                      position: 'relative',
                      outline: 'none',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span
                        style={{
                          fontSize: '0.88rem',
                          fontWeight: isToday ? 800 : 700,
                          color: isToday ? '#38bdf8' : '#ffffff',
                        }}
                      >
                        {cell.dayNumber}
                      </span>
                      {isToday && (
                        <span
                          style={{
                            background: '#38bdf8',
                            color: '#040711',
                            fontSize: '0.58rem',
                            fontWeight: 800,
                            padding: '1px 5px',
                            borderRadius: '3px',
                          }}
                        >
                          Today
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
                      {rec.minutes > 0 ? (
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            background: style.badgeBg,
                            color: style.badgeColor,
                            border: style.badgeBorder,
                            padding: '1px 5px',
                            borderRadius: '4px',
                          }}
                        >
                          {rec.minutes}m {rec.level === 3 ? '★' : rec.level === 2 ? '✓' : ''}
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.67rem', color: '#64748b' }}>—</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 4. SELECTED-DAY DETAILS + TODAY'S STUDY GOAL */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1.1fr)', gap: '20px' }}>
        {/* SELECTED-DAY DETAILS DRAWER */}
        <div className="card" style={{ padding: '22px', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={18} color="var(--primary)" />
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                  Your Study Activity
                </h3>
                <span className="text-secondary text-xs" style={{ fontWeight: 600 }}>
                  {selectedDateFormatted} {selectedDayRecord.isToday && '(Today)'}
                </span>
              </div>
            </div>

            {selectedDayRecord.goalReached ? (
              <span className="badge badge-success" style={{ fontWeight: 700, gap: '4px' }}>
                <CheckCircle2 size={13} /> {selectedDayRecord.goalExceeded ? 'Goal Exceeded!' : 'Goal Achieved'}
              </span>
            ) : selectedDayRecord.minutes > 0 ? (
              <span className="badge badge-warning" style={{ fontWeight: 700 }}>
                In Progress ({selectedRemainingMinutes}m left)
              </span>
            ) : (
              <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>
                Rest Day
              </span>
            )}
          </div>

          {/* Day Metrics Overview */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '10px',
              padding: '12px',
              background: 'var(--bg-input)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              marginBottom: '16px',
            }}
          >
            <div>
              <div className="text-muted text-xs">Study Recorded</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
                {formatDuration(selectedDayRecord.minutes)}
              </div>
            </div>
            <div>
              <div className="text-muted text-xs">Daily Goal</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
                {dailyGoalMinutes}m
              </div>
            </div>
            <div>
              <div className="text-muted text-xs">Goal Progress</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: selectedDayRecord.goalReached ? '#10b981' : 'var(--primary)' }}>
                {selectedProgressPercent}%
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ marginBottom: '16px' }}>
            <div className="progress-bar-bg" style={{ height: '7px' }}>
              <div
                className="progress-bar-fill"
                style={{
                  width: `${selectedProgressPercent}%`,
                  background: selectedDayRecord.goalReached ? '#10b981' : 'var(--primary)',
                }}
              />
            </div>
          </div>

          {/* Detailed Activity Breakdown for Selected Day */}
          <div>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, margin: '0 0 10px 0', color: 'var(--text-secondary)' }}>
              Recorded Learning Events ({selectedDayRecord.activities.length}):
            </h4>

            {selectedDayRecord.activities.length === 0 ? (
              <div
                style={{
                  padding: '24px 16px',
                  background: 'var(--bg-input)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px dashed var(--border-subtle)',
                  textAlign: 'center',
                }}
              >
                <Clock size={24} color="var(--text-muted)" style={{ margin: '0 auto 8px' }} />
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  No study activity is recorded for this date.
                </p>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-placeholder)', display: 'block', marginTop: '4px' }}>
                  Use the Study Session Tracker above or complete lessons in your course player to log activity!
                </span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {selectedDayRecord.activities.map((act) => (
                  <div
                    key={act.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '9px 12px',
                      background: 'var(--bg-input)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                      gap: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                      <CheckCircle2 size={15} color="#10b981" style={{ flexShrink: 0 }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {act.title}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          {act.courseTitle} &bull; {act.type.replace('_', ' ')}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                      {act.score && (
                        <span className="badge badge-success" style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                          Score: {act.score}
                        </span>
                      )}
                      <span className="badge badge-neutral" style={{ fontSize: '0.68rem' }}>
                        {act.durationMinutes}m
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* TODAY'S STUDY GOAL CARD */}
        <div className="card" style={{ padding: '22px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Target size={18} color="var(--primary)" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                  Today’s Study Goal
                </h3>
              </div>
              <span className={`badge badge-${todayProgressPercent >= 100 ? 'success' : 'primary'}`}>
                {todayProgressPercent}% Complete
              </span>
            </div>

            {/* Target Preset Selector Buttons */}
            <div style={{ marginBottom: '16px' }}>
              <div className="text-muted text-xs" style={{ marginBottom: '6px' }}>Customize Daily Study Target:</div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {[15, 30, 45, 60].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => handleSelectDailyGoal(mins)}
                    style={{
                      flex: 1,
                      padding: '6px 4px',
                      borderRadius: '6px',
                      border: dailyGoalMinutes === mins ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                      background: dailyGoalMinutes === mins ? 'var(--primary)' : 'var(--bg-input)',
                      color: dailyGoalMinutes === mins ? '#ffffff' : 'var(--text-secondary)',
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {mins}m
                  </button>
                ))}
              </div>
            </div>

            {/* Goal Progress Bar & Metrics */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                <span style={{ fontWeight: 700 }}>{todayRecord.minutes} of {dailyGoalMinutes} mins completed</span>
                <span className="text-muted" style={{ fontWeight: 600 }}>
                  {todayRemainingMinutes > 0 ? `${todayRemainingMinutes} mins remaining` : '🎉 Goal Met!'}
                </span>
              </div>
              <div className="progress-bar-bg" style={{ height: '9px' }}>
                <div
                  className="progress-bar-fill"
                  style={{
                    width: `${todayProgressPercent}%`,
                    background: todayProgressPercent >= 100 ? '#10b981' : 'linear-gradient(90deg, var(--primary) 0%, #10b981 100%)',
                  }}
                />
              </div>
            </div>

            {/* Quick Status */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={15} color={todayRecord.minutes > 0 ? '#10b981' : '#64748b'} />
                <span>Active Study Today: {todayRecord.minutes} minutes</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Flame size={15} color={streakData.currentStreak > 0 ? '#f59e0b' : '#64748b'} />
                <span>Consecutive Streak: {streakData.currentStreak} day{streakData.currentStreak === 1 ? '' : 's'}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <Link
              to="/my-learning"
              className="btn btn-primary"
              style={{ flex: 1, justifyContent: 'center', fontSize: '0.85rem', gap: '6px', fontWeight: 700 }}
            >
              <Play size={14} /> Continue Learning &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* 5. WEEKLY LEARNING SUMMARY */}
      <div className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart2 size={18} color="var(--primary)" />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                Your Week at a Glance
              </h2>
            </div>
            <p className="text-secondary text-xs" style={{ margin: '3px 0 0 0' }}>
              Monday to Sunday study hours distribution and consistency velocity.
            </p>
          </div>

          <span className="badge badge-primary" style={{ fontWeight: 700 }}>
            {weeklySummary.goalPercent}% of Weekly Target ({weeklyGoalHours}h Goal)
          </span>
        </div>

        {/* 6 Key Weekly Metrics */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '12px',
            marginBottom: '20px',
          }}
        >
          <div style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div className="text-muted text-xs">Total Study Time</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>
              {formatDuration(weeklySummary.totalMinutes)}
            </div>
          </div>

          <div style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div className="text-muted text-xs">Active Study Days</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>
              {weeklySummary.activeDaysCount} of 7 days
            </div>
          </div>

          <div style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div className="text-muted text-xs">Lessons Finished</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#3B82F6', marginTop: '2px' }}>
              {weeklySummary.lessonsCount} lessons
            </div>
          </div>

          <div style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div className="text-muted text-xs">Quizzes Completed</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>
              {weeklySummary.quizzesCount} quizzes
            </div>
          </div>

          <div style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div className="text-muted text-xs">Goal Met Days</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10b981', marginTop: '2px' }}>
              {weeklySummary.goalDaysCount} days
            </div>
          </div>

          <div style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div className="text-muted text-xs">Weekly Goal Pace</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: weeklySummary.goalPercent >= 100 ? '#10b981' : 'var(--primary)', marginTop: '2px' }}>
              {weeklySummary.goalPercent}%
            </div>
          </div>
        </div>

        {/* Daily Study Time Visual Bar Chart */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
              Daily Study Minutes (Dashed Line = {dailyGoalMinutes}m Target):
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '12px',
              alignItems: 'flex-end',
              height: '160px',
              padding: '16px 12px 10px',
              background: 'var(--bg-input)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              position: 'relative',
            }}
          >
            {/* Goal threshold dashed reference line */}
            <div
              style={{
                position: 'absolute',
                left: '12px',
                right: '12px',
                bottom: `${Math.min(130, Math.round((dailyGoalMinutes / 90) * 120) + 26)}px`,
                borderTop: '1.5px dashed rgba(16, 185, 129, 0.65)',
                pointerEvents: 'none',
                zIndex: 1,
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '-16px',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  color: '#10b981',
                  background: 'var(--bg-input)',
                  padding: '1px 4px',
                  borderRadius: '3px',
                }}
              >
                Target: {dailyGoalMinutes}m
              </span>
            </div>

            {weeklySummary.days.map((day) => {
              const maxScale = Math.max(90, dailyGoalMinutes * 1.5);
              const heightPx = Math.min(120, Math.max(8, Math.round((day.minutes / maxScale) * 110)));
              const isToday = day.date === todayDate;
              const color = day.minutes >= dailyGoalMinutes ? '#10b981' : day.minutes > 0 ? '#f59e0b' : 'rgba(255,255,255,0.08)';

              return (
                <div
                  key={day.date}
                  onClick={() => handleSelectDate(day.date)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    zIndex: 2,
                  }}
                  title={`${day.dayName}, ${day.date}: ${day.minutes} mins studied`}
                >
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                    {day.minutes > 0 ? `${day.minutes}m` : '0'}
                  </span>

                  <div
                    style={{
                      width: '100%',
                      maxWidth: '38px',
                      height: `${heightPx}px`,
                      background: color,
                      borderRadius: '4px 4px 2px 2px',
                      border: isToday ? '2px solid #38bdf8' : 'none',
                      boxShadow: isToday ? '0 0 10px rgba(56, 189, 248, 0.4)' : 'none',
                      transition: 'all 0.2s ease',
                    }}
                  />

                  <div style={{ textAlign: 'center', marginTop: '2px' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: isToday ? 800 : 600, color: isToday ? '#38bdf8' : 'var(--text-secondary)' }}>
                      {day.dayName}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                      {day.dayNumber}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
