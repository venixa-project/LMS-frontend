import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../lib/store';
import { useCourseStore } from '../../lib/courseStore';
import {
  Flame, Award, Trophy, Zap, Clock, Calendar, CheckCircle2,
  ArrowRight, Target, TrendingUp,
  Play, BookOpen, Star, BarChart2, ChevronLeft, ChevronRight,
  CalendarDays, Check, HelpCircle
} from 'lucide-react';
import {
  DayStudyRecord,
  TODAY_DATE_STR,
  generateInitialStudyDatabase,
  calculateStreak,
  get28DayWindow,
  getMonthCalendarGrid,
  getWeeklyLearningSummary,
  formatDuration,
  parseDate
} from './momentumData';

export const MomentumPage: React.FC = () => {
  const { user } = useAuthStore();
  const userName = user?.displayName || user?.firstName || 'Alex';
  const { courses } = useCourseStore();

  // Core Study Settings & State
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState<number>(45);
  const [weeklyGoalHours, setWeeklyGoalHours] = useState<number>(10);
  const [studyDatabase, setStudyDatabase] = useState<Record<string, DayStudyRecord>>(() =>
    generateInitialStudyDatabase(45)
  );

  // Calendar View State: '28-day' vs 'month'
  const [calendarView, setCalendarView] = useState<'28-day' | 'month'>('28-day');
  const [periodOffset28, setPeriodOffset28] = useState<number>(0); // 0 = current 28 days, -1 = previous
  const [monthNav, setMonthNav] = useState<{ year: number; monthIndex: number }>({
    year: 2026,
    monthIndex: 9 // 0-indexed: 9 = October
  });

  // Selected date for details drawer (default to today)
  const [selectedDateStr, setSelectedDateStr] = useState<string>(TODAY_DATE_STR);

  // Today's record
  const todayRecord = studyDatabase[TODAY_DATE_STR] || {
    date: TODAY_DATE_STR,
    dayName: 'Tue',
    dayNumber: 27,
    minutes: 35,
    dailyGoalMinutes,
    goalReached: false,
    goalExceeded: false,
    level: 1,
    isToday: true,
    isFuture: false,
    activities: []
  };

  // Streak calculation (automatically derived from study history with min 20m requirement)
  const streakData = useMemo(() => {
    return calculateStreak(studyDatabase, 20);
  }, [studyDatabase]);

  // 28-Day Window Data
  const window28Data = useMemo(() => {
    return get28DayWindow(studyDatabase, periodOffset28);
  }, [studyDatabase, periodOffset28]);

  // Month View Data
  const monthData = useMemo(() => {
    return getMonthCalendarGrid(monthNav.year, monthNav.monthIndex, studyDatabase);
  }, [monthNav, studyDatabase]);

  // Weekly Summary Data
  const weeklySummary = useMemo(() => {
    return getWeeklyLearningSummary(studyDatabase, dailyGoalMinutes, weeklyGoalHours);
  }, [studyDatabase, dailyGoalMinutes, weeklyGoalHours]);

  // Selected Day Record
  const selectedDayRecord = studyDatabase[selectedDateStr] || {
    date: selectedDateStr,
    dayName: parseDate(selectedDateStr).toLocaleDateString('en-US', { weekday: 'short' }),
    dayNumber: parseDate(selectedDateStr).getDate(),
    minutes: 0,
    dailyGoalMinutes,
    goalReached: false,
    goalExceeded: false,
    level: 0,
    isToday: selectedDateStr === TODAY_DATE_STR,
    isFuture: selectedDateStr > TODAY_DATE_STR,
    activities: []
  };

  // Consistency calculation over the current 28-day window
  const consistencyStats = useMemo(() => {
    const days = window28Data.days;
    const trackedDays = days.filter((d) => !d.isFuture);
    const reachedDays = trackedDays.filter((d) => d.minutes >= dailyGoalMinutes);
    const percent = trackedDays.length > 0 ? Math.round((reachedDays.length / trackedDays.length) * 100) : 0;
    return {
      percent,
      reachedDays: reachedDays.length,
      totalTracked: trackedDays.length
    };
  }, [window28Data, dailyGoalMinutes]);

  // Handle changing daily goal
  const handleSelectDailyGoal = (mins: number) => {
    setDailyGoalMinutes(mins);
    // Recompute levels for existing database
    setStudyDatabase((prev) => {
      const updated: Record<string, DayStudyRecord> = {};
      Object.keys(prev).forEach((dateKey) => {
        const item = prev[dateKey];
        const goalReached = item.minutes >= mins;
        const goalExceeded = item.minutes >= Math.round(mins * 1.5);
        let level: 0 | 1 | 2 | 3 = 0;
        if (item.minutes === 0) level = 0;
        else if (goalExceeded) level = 3;
        else if (goalReached) level = 2;
        else level = 1;

        updated[dateKey] = {
          ...item,
          dailyGoalMinutes: mins,
          goalReached,
          goalExceeded,
          level
        };
      });
      return updated;
    });
  };

  // Navigation handlers for 28-day view
  const handlePrev28 = () => {
    setPeriodOffset28((prev) => prev - 1);
  };

  const handleNext28 = () => {
    if (periodOffset28 < 0) {
      setPeriodOffset28((prev) => prev + 1);
    }
  };

  const handleCurrent28 = () => {
    setPeriodOffset28(0);
    setSelectedDateStr(TODAY_DATE_STR);
  };

  // Navigation handlers for Month view
  const handlePrevMonth = () => {
    setMonthNav((prev) => {
      if (prev.monthIndex === 0) {
        return { year: prev.year - 1, monthIndex: 11 };
      }
      return { year: prev.year, monthIndex: prev.monthIndex - 1 };
    });
  };

  const handleNextMonth = () => {
    if (monthNav.year === 2026 && monthNav.monthIndex >= 9) return;
    setMonthNav((prev) => {
      if (prev.monthIndex === 11) {
        return { year: prev.year + 1, monthIndex: 0 };
      }
      return { year: prev.year, monthIndex: prev.monthIndex + 1 };
    });
  };

  const handleCurrentMonth = () => {
    setMonthNav({ year: 2026, monthIndex: 9 });
    setSelectedDateStr(TODAY_DATE_STR);
  };

  // Select a date card
  const handleSelectDate = (dateStr: string) => {
    setSelectedDateStr(dateStr);
  };

  // Modern Dark Cosmic Level Styling (No flat overpowering green blocks)
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
      barColor: 'rgba(255, 255, 255, 0.06)'
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
      barColor: '#f59e0b'
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
      barColor: '#10b981'
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
      barColor: 'linear-gradient(180deg, #34d399 0%, #10b981 100%)'
    }
  };

  // Format today's remaining time
  const todayProgressPercent = Math.min(100, Math.round((todayRecord.minutes / dailyGoalMinutes) * 100));
  const todayRemainingMinutes = Math.max(0, dailyGoalMinutes - todayRecord.minutes);

  // Selected date formatted text (e.g. "Tuesday, 27 October 2026")
  const selectedDateFormatted = useMemo(() => {
    const d = parseDate(selectedDateStr);
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }, [selectedDateStr]);

  const selectedProgressPercent = Math.min(100, Math.round((selectedDayRecord.minutes / dailyGoalMinutes) * 100));
  const selectedRemainingMinutes = Math.max(0, dailyGoalMinutes - selectedDayRecord.minutes);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 1. CLEAN EXECUTIVE MOMENTUM HEADER */}
      <div
        className="card"
        style={{
          background: 'radial-gradient(ellipse at top right, rgba(84, 71, 255, 0.14) 0%, rgba(16, 185, 129, 0.08) 50%, var(--bg-surface) 100%)',
          border: '1px solid var(--border-subtle)',
          padding: '24px 28px',
          borderRadius: 'var(--radius-xl)',
          position: 'relative'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '18px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <span className="badge badge-secondary" style={{ fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Calendar size={12} /> Tuesday, 27 October 2026
              </span>
              <span
                className="badge"
                style={{
                  background: 'rgba(56, 189, 248, 0.12)',
                  color: '#38bdf8',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  fontSize: '0.72rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Clock size={12} /> Auto-Tracked from Course Player
              </span>
              <span
                className="badge"
                style={{
                  background: 'rgba(16, 185, 129, 0.12)',
                  color: '#10b981',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  fontSize: '0.72rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Flame size={12} fill="#10b981" /> Min. 20m Daily to Maintain Streak
              </span>
            </div>

            <h1 style={{ fontSize: '1.9rem', fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '-0.02em', color: 'var(--text-main)' }}>
              Momentum
            </h1>
            <p className="text-secondary text-sm" style={{ maxWidth: '640px', margin: 0, lineHeight: 1.5 }}>
              Track your study habits, understand your progress, and see what to do next.
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
                border: '1px solid var(--border-subtle)'
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
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {mins}m
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. FOUR SUMMARY CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        {/* CARD 1: STUDY STREAK */}
        <div className="card stat-card" style={{ borderLeft: '4px solid #f59e0b', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="text-muted text-xs font-semibold">Study Streak</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#f59e0b', fontSize: '0.75rem', fontWeight: 700 }}>
              <Flame size={14} fill="#f59e0b" /> ACTIVE
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', margin: '6px 0 2px' }}>
            <span style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
              {streakData.currentStreak}
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.88rem', fontWeight: 600 }}>days in a row</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
            Personal best: <strong style={{ color: 'var(--text-main)' }}>{streakData.personalBest} days</strong> (June 2026)
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', background: 'var(--bg-input)', padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
            Requires at least 20 mins of verified study per day.
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
            <span style={{ color: 'var(--text-muted)', fontSize: '0.88rem', fontWeight: 600 }}>studied</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
            Weekly goal: <strong style={{ color: 'var(--text-main)' }}>{weeklyGoalHours}h 00m</strong>
          </div>
          <div className="progress-bar-bg" style={{ height: '6px', marginTop: '6px' }}>
            <div
              className="progress-bar-fill"
              style={{
                width: `${Math.min(100, weeklySummary.goalPercent)}%`,
                background: weeklySummary.goalPercent >= 100 ? '#10b981' : 'var(--primary)'
              }}
            />
          </div>
        </div>

        {/* CARD 3: LESSONS COMPLETED */}
        <div className="card stat-card" style={{ borderLeft: '4px solid #3B82F6', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="text-muted text-xs font-semibold">Lessons Completed</span>
            <span className="badge badge-secondary" style={{ fontSize: '0.68rem' }}>65% complete</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', margin: '6px 0 2px' }}>
            <span style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
              28
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.88rem', fontWeight: 600 }}>of 43 lessons</span>
          </div>
          <div className="progress-bar-bg" style={{ height: '6px', margin: '6px 0 10px' }}>
            <div className="progress-bar-fill" style={{ width: '65%', background: '#3B82F6' }} />
          </div>
          <Link
            to="/course-player/crs-001"
            className="btn btn-secondary btn-sm"
            style={{ width: '100%', justifyContent: 'center', gap: '6px', fontSize: '0.78rem', padding: '5px 8px' }}
          >
            <Play size={12} color="var(--primary)" /> Continue Learning &rarr;
          </Link>
        </div>

        {/* CARD 4: STUDY GOAL CONSISTENCY */}
        <div className="card stat-card" style={{ borderLeft: '4px solid #10b981', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="text-muted text-xs font-semibold">Study Goal Consistency</span>
            <span className="badge badge-success" style={{ fontSize: '0.68rem', fontWeight: 700 }}>
              Past 28 Days
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', margin: '6px 0 2px' }}>
            <span style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
              {consistencyStats.percent}%
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.88rem', fontWeight: 600 }}>target met</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
            Achieved {dailyGoalMinutes}m target on <strong style={{ color: 'var(--text-main)' }}>{consistencyStats.reachedDays} of {consistencyStats.totalTracked} days</strong>.
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', background: 'var(--bg-input)', padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
            Formula: (Target Met Days ÷ Eligible Tracked Days) × 100.
          </div>
        </div>
      </div>

      {/* 3. HYBRID STUDY CONSISTENCY CALENDAR (WOW Dark Theme & Visual Depth) */}
      <div className="card" style={{ padding: '24px' }}>
        {/* Calendar Header with View Switcher & Navigation Controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '18px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CalendarDays size={18} color="var(--primary)" />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                Study Consistency Calendar
              </h2>
            </div>
            <p className="text-secondary text-xs" style={{ margin: '4px 0 0 0' }}>
              Inspect daily study duration, lesson completions, and goal achievement history.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {/* View Switcher: [ 28-Day View ] [ Month View ] */}
            <div
              style={{
                display: 'inline-flex',
                background: 'var(--bg-input)',
                padding: '3px',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)'
              }}
            >
              <button
                type="button"
                className={`btn btn-sm ${calendarView === '28-day' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setCalendarView('28-day')}
                style={{
                  padding: '5px 14px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  borderRadius: '6px',
                  color: calendarView === '28-day' ? '#ffffff' : 'var(--text-secondary)'
                }}
              >
                28-Day View
              </button>
              <button
                type="button"
                className={`btn btn-sm ${calendarView === 'month' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setCalendarView('month')}
                style={{
                  padding: '5px 14px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  borderRadius: '6px',
                  color: calendarView === 'month' ? '#ffffff' : 'var(--text-secondary)'
                }}
              >
                Month View
              </button>
            </div>

            {/* Navigation Controls */}
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
                  disabled={periodOffset28 >= 0}
                  style={{ padding: '6px 10px', fontSize: '0.75rem', opacity: periodOffset28 >= 0 ? 0.5 : 1 }}
                  title="Next 28 days (disabled for future dates)"
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
                  disabled={monthNav.year === 2026 && monthNav.monthIndex === 9}
                  style={{ padding: '6px 10px', fontSize: '0.75rem', fontWeight: 600 }}
                  title="Current month (October 2026)"
                >
                  Current Month
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleNextMonth}
                  disabled={monthNav.year === 2026 && monthNav.monthIndex >= 9}
                  style={{ padding: '6px 10px', fontSize: '0.75rem', opacity: monthNav.year === 2026 && monthNav.monthIndex >= 9 ? 0.5 : 1 }}
                  title="Next month (disabled for future unrecorded periods)"
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Date Range Badge & Visible Legend */}
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
            marginBottom: '16px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)' }}>
              {calendarView === '28-day' ? (
                <>Period: {window28Data.startDate} &mdash; {window28Data.endDate} ({periodOffset28 === 0 ? 'Current 28 Days' : 'Historical Period'})</>
              ) : (
                <>{monthData.monthName} {monthData.year}</>
              )}
            </span>
          </div>

          {/* Accessible Visible Legend with Accurate Harmonized Colors */}
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

        {/* VIEW A: 28-DAY STUDY CALENDAR (WOW Dark Glass Theme) */}
        {calendarView === '28-day' && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '10px'
            }}
          >
            {window28Data.days.map((item) => {
              const isSelected = selectedDateStr === item.date;
              const isToday = item.date === TODAY_DATE_STR;
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
                    backdropFilter: 'blur(8px)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {/* Today Badge */}
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
                        boxShadow: '0 2px 8px rgba(56, 189, 248, 0.5)'
                      }}
                    >
                      Today
                    </span>
                  )}

                  {/* Weekday Label */}
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      color: style.weekdayColor,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em'
                    }}
                  >
                    {item.dayName}
                  </span>

                  {/* Date Number */}
                  <span
                    style={{
                      fontSize: '1.15rem',
                      fontWeight: 800,
                      color: isToday ? '#38bdf8' : style.dayNumberColor,
                      lineHeight: 1.1
                    }}
                  >
                    {item.dayNumber}
                  </span>

                  {/* Achievement Pill / Progress */}
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
                          gap: '3px'
                        }}
                      >
                        {item.minutes}m {item.level === 3 ? '★' : item.level === 2 ? '✓' : ''}
                      </span>

                      {/* Mini Progress Bar for In-Progress Days */}
                      {item.level === 1 && (
                        <div
                          style={{
                            width: '80%',
                            height: '3px',
                            background: 'rgba(255, 255, 255, 0.08)',
                            borderRadius: '2px',
                            overflow: 'hidden'
                          }}
                          title={`${pctOfGoal}% of daily target (${dailyGoalMinutes - item.minutes}m remaining)`}
                        >
                          <div
                            style={{
                              width: `${pctOfGoal}%`,
                              height: '100%',
                              background: '#f59e0b',
                              borderRadius: '2px'
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
                        borderRadius: '4px'
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

        {/* VIEW B: MONTHLY STUDY CALENDAR (WOW Dark Theme) */}
        {calendarView === 'month' && (
          <div>
            {/* Weekday Column Headers (Monday to Sunday) */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: '8px',
                textAlign: 'center',
                marginBottom: '8px'
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
                gap: '8px'
              }}
            >
              {monthData.cells.map((cell) => {
                const isSelected = selectedDateStr === cell.date;
                const isToday = cell.date === TODAY_DATE_STR;
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
                      transition: 'all 0.15s ease'
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
                          color: isToday ? '#38bdf8' : '#ffffff'
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
                            borderRadius: '3px'
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
                            borderRadius: '4px'
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

      {/* 4. SELECTED-DAY DETAILS (Left) + TODAY'S STUDY GOAL (Right) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1.1fr)', gap: '20px' }}>
        {/* SELECTED-DAY DETAILS DRAWER / PANEL */}
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
              marginBottom: '16px'
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
                  background: selectedDayRecord.goalReached ? '#10b981' : 'var(--primary)'
                }}
              />
            </div>
          </div>

          {/* Detailed Activity Breakdown for Selected Day */}
          <div>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, margin: '0 0 10px 0', color: 'var(--text-secondary)' }}>
              Completed Curriculum Items ({selectedDayRecord.activities.length}):
            </h4>

            {selectedDayRecord.activities.length === 0 ? (
              <div
                style={{
                  padding: '24px 16px',
                  background: 'var(--bg-input)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px dashed var(--border-subtle)',
                  textAlign: 'center'
                }}
              >
                <Clock size={24} color="var(--text-muted)" style={{ margin: '0 auto 8px' }} />
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  No study activity is recorded for this date.
                </p>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-placeholder)', display: 'block', marginTop: '4px' }}>
                  Missing data does not necessarily prove that no offline studying occurred.
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
                      gap: '10px'
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

        {/* TODAY'S STUDY GOAL CARD (Automated Live Progress) */}
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

            {/* Target Preset Selector Buttons (15m, 30m, 45m, 60m) */}
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
                      transition: 'all 0.15s ease'
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
                    background: todayProgressPercent >= 100 ? '#10b981' : 'linear-gradient(90deg, var(--primary) 0%, #10b981 100%)'
                  }}
                />
              </div>
            </div>

            {/* Completed Activities & Up Next Checklist */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={15} color="#10b981" />
                <span>Reviewed Lesson 3: Asynchronous Loops (20 mins)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={15} color="#10b981" />
                <span>Submitted React Fundamentals Practice Quiz (15 mins)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                <div style={{ width: '15px', height: '15px', borderRadius: '50%', border: '1.5px dashed var(--border-subtle)', margin: '0 0 0 1px' }} />
                <span>Next: Complete Lesson 4 interactive lab (10 mins)</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <Link
              to="/course-player/crs-001"
              className="btn btn-primary"
              style={{ flex: 1, justifyContent: 'center', fontSize: '0.85rem', gap: '6px', fontWeight: 700 }}
            >
              <Play size={14} /> Continue Learning &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* 5. WEEKLY LEARNING SUMMARY ("Your Week at a Glance") */}
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
            marginBottom: '20px'
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

        {/* Daily Study Time Visual Bar Chart (Monday to Sunday) */}
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
              position: 'relative'
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
                zIndex: 1
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
                  borderRadius: '3px'
                }}
              >
                Target: {dailyGoalMinutes}m
              </span>
            </div>

            {weeklySummary.days.map((day) => {
              const maxScale = 90;
              const heightPx = Math.min(120, Math.max(8, Math.round((day.minutes / maxScale) * 110)));
              const isToday = day.date === TODAY_DATE_STR;
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
                    zIndex: 2
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
                      transition: 'all 0.2s ease'
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

      {/* 6. RECOMMENDED NEXT STEP */}
      <div
        className="card"
        style={{
          padding: '20px 24px',
          background: 'radial-gradient(ellipse at top left, rgba(37, 99, 235, 0.12) 0%, var(--bg-surface) 100%)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-xl)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: 'rgba(37, 99, 235, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary)',
                flexShrink: 0
              }}
            >
              <Zap size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--primary)' }}>
                Your Next Step
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '2px 0', color: 'var(--text-main)' }}>
                {todayRecord.minutes < dailyGoalMinutes ? (
                  <>You have {todayRemainingMinutes} minutes left to reach today&apos;s study goal!</>
                ) : (
                  <>🎉 You&apos;ve reached today&apos;s {dailyGoalMinutes}-minute target!</>
                )}
              </h3>
              <p className="text-secondary text-xs" style={{ margin: 0 }}>
                Continue &ldquo;JavaScript Fundamentals&rdquo; &mdash; Module 1: Lesson 4 (Asynchronous Promises).
              </p>
            </div>
          </div>

          <Link
            to="/course-player/crs-001"
            className="btn btn-primary"
            style={{ gap: '6px', fontWeight: 700, padding: '10px 18px' }}
          >
            <Play size={14} /> Resume Lesson 4 &rarr;
          </Link>
        </div>
      </div>

      {/* 7. GAMIFICATION STREAK MILESTONES */}
      <div className="card" style={{ padding: '22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
              Habit Streaks & Milestone Badges
            </h3>
            <p className="text-secondary text-xs" style={{ margin: '2px 0 0 0' }}>
              Earn badges and verified credentials by sustaining your daily learning velocity.
            </p>
          </div>
          <span className="badge badge-secondary">Gamification Engine Active</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px' }}>
          {/* Badge 1 */}
          <div
            style={{
              background: 'var(--bg-input)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '12px',
              padding: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px'
              }}
            >
              🔥
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main)' }}>7-Day Streak</div>
              <div style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 600 }}>Unlocked &bull; 100 XP</div>
            </div>
          </div>

          {/* Badge 2 */}
          <div
            style={{
              background: 'var(--bg-input)',
              border: '1.5px solid var(--primary)',
              borderRadius: '12px',
              padding: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              boxShadow: '0 0 12px var(--primary-glow)'
            }}
          >
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: 'var(--primary-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px'
              }}
            >
              ⚡
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main)' }}>14-Day Velocity</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 700 }}>2 Days Away (86%)</div>
            </div>
          </div>

          {/* Badge 3 */}
          <div
            style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '12px',
              padding: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              opacity: 0.75
            }}
          >
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px'
              }}
            >
              🏆
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main)' }}>30-Day Legend</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>18 Days to unlock</div>
            </div>
          </div>

          {/* Badge 4 */}
          <div
            style={{
              background: 'var(--bg-input)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '12px',
              padding: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px'
              }}
            >
              🎓
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main)' }}>Live Class Pro</div>
              <div style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 600 }}>Unlocked &bull; 95%+ Turnout</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
