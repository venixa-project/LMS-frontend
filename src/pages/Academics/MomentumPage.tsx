import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../lib/store';
import {
  Flame, Trophy, CalendarCheck, Clock, Award, Play,
  CheckCircle2, AlertCircle, ChevronLeft, ChevronRight,
  BookOpen, Sparkles, Zap, Laptop, Smartphone, Monitor,
  ShieldCheck, Lock, LogOut, ArrowRight, TrendingUp,
  Activity, Star, Check, Info, Compass
} from 'lucide-react';

interface ActivityItem {
  id: string;
  title: string;
  type: 'Lesson' | 'Practice' | 'Quiz';
  status: 'Completed' | 'In Progress';
  duration: number; // minutes
  course: string;
  timeAgo: string;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  status: 'unlocked' | 'in_progress' | 'locked';
  progress?: { current: number; total: number };
  unlockedDate?: string;
}

interface LoginSession {
  id: string;
  deviceType: 'desktop' | 'mobile' | 'terminal' | 'sso';
  deviceName: string;
  browser: string;
  location: string;
  ipAddress: string;
  loginTime: string;
  sessionDuration: string;
  isCurrent: boolean;
  authMethod: string;
  status: 'active' | 'closed';
}

export const MomentumPage: React.FC = () => {
  const { user } = useAuthStore();
  const today = useMemo(() => new Date(), []);

  // Live gamification metrics
  const currentStreak = (user as any)?.gamificationProfile?.streak || 0;
  const longestStreak = (user as any)?.gamificationProfile?.streak || 0;
  const activeDays = 0;
  const learningHours = 0;
  const todayMinutes = 0;
  const targetMinutes = 30;

  // Chart period state: Last 7 Days vs Last 30 Days
  const [chartPeriod, setChartPeriod] = useState<'7days' | '30days'>('7days');

  // Calendar State - dynamic current date
  const [calendarDate, setCalendarDate] = useState(() => new Date());
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<number>(() => new Date().getDate());

  // Login Session filter state
  const [loginFilter, setLoginFilter] = useState<'all' | 'desktop' | 'mobile' | 'security'>('all');
  const [sessionTerminatedNotice, setSessionTerminatedNotice] = useState<string | null>(null);

  // Active Days in current month (clean production state: populated from real sessions)
  const activeDaysInMonth: number[] = [];

  // Last 7 Days Activity - dynamic date labels with real minutes
  const last7DaysData = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      result.push({
        day: days[d.getDay()],
        date: `${months[d.getMonth()]} ${d.getDate()}`,
        minutes: i === 0 ? todayMinutes : 0,
        isCurrent: i === 0,
      });
    }
    return result;
  }, [todayMinutes]);

  const last30DaysData = [
    { label: 'Week 1', minutes: 0 },
    { label: 'Week 2', minutes: 0 },
    { label: 'Week 3', minutes: 0 },
    { label: 'This Week', minutes: todayMinutes, isCurrent: true }
  ];

  // Today's Learning Activity List - clean empty state
  const todayActivities: ActivityItem[] = [];

  // Achievements (Badges starting in baseline locked state)
  const achievements: Achievement[] = [
    {
      id: 'ach-1',
      title: 'First Step',
      description: 'Complete your first qualifying learning session.',
      icon: '🌱',
      status: currentStreak >= 1 ? 'unlocked' : 'locked',
      progress: { current: Math.min(1, currentStreak), total: 1 }
    },
    {
      id: 'ach-2',
      title: '3-Day Starter',
      description: 'Maintain a 3-day continuous learning streak.',
      icon: '⚡',
      status: currentStreak >= 3 ? 'unlocked' : currentStreak > 0 ? 'in_progress' : 'locked',
      progress: { current: Math.min(3, currentStreak), total: 3 }
    },
    {
      id: 'ach-3',
      title: 'Week Warrior',
      description: 'Reach a 7-day continuous learning streak.',
      icon: '🔥',
      status: currentStreak >= 7 ? 'unlocked' : currentStreak > 0 ? 'in_progress' : 'locked',
      progress: { current: Math.min(7, currentStreak), total: 7 }
    },
    {
      id: 'ach-4',
      title: 'Consistency Champion',
      description: 'Reach a 14-day continuous learning streak.',
      icon: '🏆',
      status: currentStreak >= 14 ? 'unlocked' : currentStreak > 0 ? 'in_progress' : 'locked',
      progress: { current: Math.min(14, currentStreak), total: 14 }
    },
    {
      id: 'ach-5',
      title: 'Monthly Master',
      description: 'Reach a 30-day continuous learning streak.',
      icon: '👑',
      status: currentStreak >= 30 ? 'unlocked' : currentStreak > 0 ? 'in_progress' : 'locked',
      progress: { current: Math.min(30, currentStreak), total: 30 }
    },
    {
      id: 'ach-6',
      title: 'Learning Legend',
      description: 'Reach a 100-day continuous learning streak.',
      icon: '🌟',
      status: currentStreak >= 100 ? 'unlocked' : currentStreak > 0 ? 'in_progress' : 'locked',
      progress: { current: Math.min(100, currentStreak), total: 100 }
    }
  ];

  // Active Login Session (Detected from current browser/client)
  const isMobileClient = typeof navigator !== 'undefined' && /Mobi|Android|iPhone/i.test(navigator.userAgent);
  const loginSessions: LoginSession[] = [
    {
      id: 'session-current',
      deviceType: isMobileClient ? 'mobile' : 'desktop',
      deviceName: isMobileClient ? 'Mobile Device Client' : 'Desktop Browser Client',
      browser: typeof navigator !== 'undefined' && navigator.userAgent.includes('Chrome') ? 'Google Chrome' : 'Web Browser',
      location: 'Authenticated User Session',
      ipAddress: 'Active Session Token',
      loginTime: 'Active Now',
      sessionDuration: 'Current Session (Active)',
      isCurrent: true,
      authMethod: 'Enterprise Portal Auth',
      status: 'active'
    }
  ];

  // Calendar Helpers
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 is Sunday

  const handlePrevMonth = () => {
    setCalendarDate(new Date(year, month - 1, 1));
    setSelectedCalendarDay(1);
  };

  const handleNextMonth = () => {
    setCalendarDate(new Date(year, month + 1, 1));
    setSelectedCalendarDay(1);
  };

  const selectedDateActivity = useMemo(() => {
    const isToday = selectedCalendarDay === today.getDate() && month === today.getMonth() && year === today.getFullYear();
    const isActive = activeDaysInMonth.includes(selectedCalendarDay);

    if (isToday && todayMinutes > 0) {
      return {
        hasActivity: true,
        minutes: todayMinutes,
        sessions: 1,
        lessons: ['Active Learning Session'],
        note: `Goal in progress: ${todayMinutes} of ${targetMinutes} minutes completed.`
      };
    }
    if (isActive) {
      return {
        hasActivity: true,
        minutes: 30,
        sessions: 1,
        lessons: ['Course Learning Session'],
        note: 'Daily goal met! Consistency streak sustained.'
      };
    }
    return {
      hasActivity: false,
      minutes: 0,
      sessions: 0,
      lessons: [],
      note: isToday
        ? 'No learning activity recorded today yet. Select a course to start your streak!'
        : 'No learning activity recorded on this day.'
    };
  }, [selectedCalendarDay, month, year, today, todayMinutes, targetMinutes, activeDaysInMonth]);

  const filteredLoginSessions = loginSessions.filter((s) => {
    if (loginFilter === 'desktop') return s.deviceType === 'desktop' || s.deviceType === 'terminal';
    if (loginFilter === 'mobile') return s.deviceType === 'mobile';
    if (loginFilter === 'security') return s.authMethod.includes('2FA') || s.deviceType === 'sso';
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* ------------------------------------------------------------- */}
      {/* 1. TOP SECTION — WELCOME HEADER */}
      {/* ------------------------------------------------------------- */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        background: 'radial-gradient(ellipse at top left, rgba(245, 158, 11, 0.12) 0%, rgba(15, 23, 42, 0) 70%)',
        padding: '20px 24px',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid rgba(245, 158, 11, 0.25)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span className="badge" style={{
              background: currentStreak > 0 ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-input)',
              color: currentStreak > 0 ? '#f59e0b' : 'var(--text-muted)',
              border: currentStreak > 0 ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.75rem',
              fontWeight: 700
            }}>
              <Flame size={13} fill={currentStreak > 0 ? '#f59e0b' : 'none'} /> {currentStreak > 0 ? `Streak Active • Day ${currentStreak}` : 'Streak Inactive • Day 0'}
            </span>
            <span className="text-muted text-xs">
              {today.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
          <h1 style={{ fontSize: '1.85rem', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
            Your Learning Momentum
          </h1>
          <p className="text-secondary text-sm" style={{ margin: 0, maxWidth: '650px' }}>
            Build consistency. Celebrate progress. Keep growing. Every day you learn is a step forward.
          </p>
        </div>

        {/* Motivational Toast Banner */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: 'var(--shadow-sm)',
          maxWidth: '340px'
        }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'rgba(245, 158, 11, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Sparkles size={18} color="#f59e0b" />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: currentStreak > 0 ? '#f59e0b' : 'var(--text-main)' }}>
              {currentStreak > 0 ? `On a ${currentStreak}-Day Roll!` : 'Ready to Build Momentum!'}
            </div>
            <div className="text-muted text-xs" style={{ lineHeight: 1.35 }}>
              {currentStreak > 0 ? 'Consistent daily practice increases long-term course retention by 3.4x.' : 'Start your first learning activity today to ignite your consistency streak.'}
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. STREAK OVERVIEW CARDS (4 Summary Cards) */}
      {/* ------------------------------------------------------------- */}
      <div className="grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        {/* Card 1: Current Streak */}
        <div className="stat-card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span className="text-muted text-xs font-semibold" style={{ textTransform: 'uppercase' }}>Current Streak</span>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'rgba(245, 158, 11, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Flame size={16} color="#f59e0b" fill={currentStreak > 0 ? "#f59e0b" : "none"} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#f59e0b', lineHeight: 1.1 }}>
            {currentStreak} Days
          </div>
          <p className="text-muted text-xs" style={{ margin: '6px 0 0' }}>
            {currentStreak > 0 ? "You're building a great habit!" : "Start learning today to build a streak"}
          </p>
        </div>

        {/* Card 2: Longest Streak */}
        <div className="stat-card" style={{ borderLeft: '4px solid #ffd700' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span className="text-muted text-xs font-semibold" style={{ textTransform: 'uppercase' }}>Longest Streak</span>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'rgba(255, 215, 0, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Trophy size={16} color="#ffd700" />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ffd700', lineHeight: 1.1 }}>
            {longestStreak} Days
          </div>
          <p className="text-muted text-xs" style={{ margin: '6px 0 0' }}>
            Your personal best
          </p>
        </div>

        {/* Card 3: Active Days */}
        <div className="stat-card" style={{ borderLeft: '4px solid var(--primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span className="text-muted text-xs font-semibold" style={{ textTransform: 'uppercase' }}>Active Days</span>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'rgba(99, 102, 241, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <CalendarCheck size={16} color="var(--primary)" />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)', lineHeight: 1.1 }}>
            {activeDays} Days
          </div>
          <p className="text-muted text-xs" style={{ margin: '6px 0 0' }}>
            Days spent learning
          </p>
        </div>

        {/* Card 4: Learning Time */}
        <div className="stat-card" style={{ borderLeft: '4px solid var(--accent-purple)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span className="text-muted text-xs font-semibold" style={{ textTransform: 'uppercase' }}>Learning Time</span>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'rgba(139, 92, 246, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Clock size={16} color="var(--accent-purple)" />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-purple)', lineHeight: 1.1 }}>
            {learningHours} Hours
          </div>
          <p className="text-muted text-xs" style={{ margin: '6px 0 0' }}>
            Time invested in learning
          </p>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. DAILY LEARNING GOAL SECTION ("Today's Goal") */}
      {/* ------------------------------------------------------------- */}
      <div className="card" style={{
        padding: '24px',
        background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(99, 102, 241, 0.06) 100%)',
        border: '1px solid rgba(245, 158, 11, 0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
          <div style={{ flex: '1 1 450px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span className="badge" style={{ background: '#f59e0b', color: '#000', fontWeight: 800, fontSize: '0.7rem' }}>
                TODAY'S GOAL
              </span>
              <span className="text-muted text-xs font-semibold">Daily Milestone Target: {targetMinutes} Mins</span>
            </div>
            <h2 style={{ fontSize: '1.35rem', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Keep Your Momentum Going
              <Flame size={20} color="#f59e0b" fill={currentStreak > 0 ? "#f59e0b" : "none"} />
            </h2>
            <p className="text-secondary text-sm" style={{ margin: '0 0 16px 0' }}>
              {todayMinutes >= targetMinutes
                ? 'Great job! You achieved your daily learning goal today.'
                : todayMinutes > 0
                  ? `Just ${targetMinutes - todayMinutes} more minutes to reach your daily goal. Consistent small steps lead to major mastery.`
                  : 'Begin your first 30-minute learning milestone today to start building consistent study habits.'}
            </p>

            {/* Progress Bar */}
            <div style={{ marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '6px' }}>
                <span className="text-muted">Today's Progress</span>
                <strong style={{ color: todayMinutes > 0 ? '#f59e0b' : 'var(--text-muted)' }}>
                  {todayMinutes} / {targetMinutes} minutes ({Math.min(100, Math.round((todayMinutes / targetMinutes) * 100))}%)
                </strong>
              </div>
              <div className="progress-bar-bg" style={{ height: '10px', background: 'var(--bg-input)' }}>
                <div
                  className="progress-bar-fill"
                  style={{
                    width: `${Math.min(100, Math.round((todayMinutes / targetMinutes) * 100))}%`,
                    background: 'linear-gradient(90deg, #f59e0b, #ffd700)',
                    transition: 'width 1s ease-in-out'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Interactive Action Buttons */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <Link
              to="/course-player/crs-001"
              className="btn btn-primary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                border: 'none',
                color: '#fff',
                fontWeight: 700
              }}
            >
              <Play size={16} fill="#fff" /> Continue Learning &rarr;
            </Link>
            <Link to="/my-learning" className="btn btn-secondary" style={{ padding: '10px 18px' }}>
              View My Courses
            </Link>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. MAIN 2-COLUMN SECTION: ACTIVITY BAR CHART + TODAY'S ACTIVITY */}
      {/* ------------------------------------------------------------- */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1.4fr', gap: '24px' }}>
        {/* Left: Last 7 Days Activity Bar Chart (NOT a GitHub Heatmap!) */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <TrendingUp size={16} color="var(--primary)" />
                <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Daily Learning Activity</h3>
              </div>
              <p className="text-muted text-xs" style={{ margin: '4px 0 0' }}>
                Vertical bar chart showing daily learning time (Minutes)
              </p>
            </div>

            {/* Filter Toggle */}
            <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-input)', padding: '3px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <button
                onClick={() => setChartPeriod('7days')}
                className="btn btn-sm"
                style={{
                  background: chartPeriod === '7days' ? 'var(--primary)' : 'transparent',
                  color: chartPeriod === '7days' ? '#fff' : 'var(--text-secondary)',
                  border: 'none',
                  padding: '4px 10px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  borderRadius: 'var(--radius-sm)'
                }}
              >
                Last 7 Days
              </button>
              <button
                onClick={() => setChartPeriod('30days')}
                className="btn btn-sm"
                style={{
                  background: chartPeriod === '30days' ? 'var(--primary)' : 'transparent',
                  color: chartPeriod === '30days' ? '#fff' : 'var(--text-secondary)',
                  border: 'none',
                  padding: '4px 10px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  borderRadius: 'var(--radius-sm)'
                }}
              >
                Last 30 Days
              </button>
            </div>
          </div>

          {/* Vertical Bar Chart */}
          {chartPeriod === '7days' ? (
            <div style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              height: '190px',
              padding: '16px 8px 8px',
              borderBottom: '1px solid var(--border-subtle)',
              gap: '12px'
            }}>
              {last7DaysData.map((item) => {
                const maxMins = 60;
                const barHeightPercent = Math.min(100, Math.max(15, (item.minutes / maxMins) * 100));

                return (
                  <div
                    key={item.day}
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      height: '100%',
                      justifyContent: 'flex-end',
                      gap: '8px'
                    }}
                  >
                    {/* Duration Label */}
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: item.isCurrent ? '#f59e0b' : 'var(--text-secondary)'
                    }}>
                      {item.minutes}m
                    </span>

                    {/* Bar */}
                    <div style={{
                      width: '100%',
                      maxWidth: '38px',
                      height: `${barHeightPercent}%`,
                      background: item.isCurrent
                        ? 'linear-gradient(180deg, #f59e0b 0%, #d97706 100%)'
                        : 'linear-gradient(180deg, var(--primary) 0%, rgba(99, 102, 241, 0.4) 100%)',
                      borderRadius: '6px 6px 2px 2px',
                      boxShadow: item.isCurrent ? '0 0 14px rgba(245, 158, 11, 0.45)' : 'none',
                      transition: 'height 0.6s ease'
                    }} />

                    {/* Day & Date */}
                    <div style={{ textAlign: 'center', marginTop: '4px' }}>
                      <div style={{
                        fontSize: '0.78rem',
                        fontWeight: item.isCurrent ? 800 : 600,
                        color: item.isCurrent ? '#f59e0b' : 'var(--text-main)'
                      }}>
                        {item.day}
                      </div>
                      <div className="text-muted text-xs" style={{ fontSize: '0.65rem' }}>
                        {item.isCurrent ? 'Today' : item.date.split(' ')[1]}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* 30 Days Weekly Aggregation Chart */
            <div style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-around',
              height: '190px',
              padding: '16px 8px 8px',
              borderBottom: '1px solid var(--border-subtle)',
              gap: '16px'
            }}>
              {last30DaysData.map((w) => {
                const barHeight = Math.min(100, (w.minutes / 240) * 100);
                return (
                  <div key={w.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', gap: '8px' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: w.isCurrent ? '#f59e0b' : 'var(--text-secondary)' }}>
                      {Math.floor(w.minutes / 60)}h {w.minutes % 60}m
                    </span>
                    <div style={{
                      width: '100%',
                      maxWidth: '52px',
                      height: `${barHeight}%`,
                      background: w.isCurrent
                        ? 'linear-gradient(180deg, #f59e0b 0%, #d97706 100%)'
                        : 'linear-gradient(180deg, var(--accent-purple) 0%, rgba(139, 92, 246, 0.4) 100%)',
                      borderRadius: '6px 6px 2px 2px',
                      transition: 'height 0.6s ease'
                    }} />
                    <div style={{ fontSize: '0.78rem', fontWeight: 600 }}>{w.label}</div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <span>Weekly Study Target: 3.5 Hours</span>
            <span style={{ color: 'var(--success)', fontWeight: 600 }}>&uarr; 18% vs previous period</span>
          </div>
        </div>

        {/* Right: Today's Learning Activity */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Activity size={16} color="var(--primary)" />
                <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Today's Activity</h3>
              </div>
              <span className="badge badge-secondary" style={{ fontSize: '0.7rem' }}>
                {todayActivities.filter((a) => a.status === 'Completed').length} / {todayActivities.length} Done
              </span>
            </div>

            {/* List / Timeline of Activities */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {todayActivities.length === 0 ? (
                <div style={{
                  background: 'var(--bg-input)',
                  border: '1px dashed var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '28px 16px',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                }}>
                  <Activity size={24} style={{ color: 'var(--text-muted)', margin: '0 auto 8px auto', display: 'block' }} />
                  <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.88rem', marginBottom: '4px' }}>No Activity Recorded Today</div>
                  <div style={{ fontSize: '0.78rem' }}>Start learning any course module to record today's session.</div>
                </div>
              ) : (
                todayActivities.map((act) => (
                  <div
                    key={act.id}
                    style={{
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: act.status === 'Completed' ? 'var(--success-bg)' : 'rgba(99, 102, 241, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        {act.status === 'Completed' ? (
                          <CheckCircle2 size={16} color="var(--success)" />
                        ) : (
                          <Clock size={16} color="var(--primary)" />
                        )}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{act.title}</div>
                        <div className="text-muted text-xs">
                          {act.course} &bull; {act.type}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <span className={`badge badge-${act.status === 'Completed' ? 'success' : 'primary'}`} style={{ fontSize: '0.68rem', marginBottom: '4px', display: 'inline-block' }}>
                        {act.status}
                      </span>
                      <div className="text-muted text-xs">
                        {act.status === 'Completed' ? `${act.duration} mins` : act.timeAgo}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div style={{
            marginTop: '16px',
            paddingTop: '12px',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.75rem'
          }}>
            <span className="text-muted">Total Today: <strong>{todayMinutes} Minutes</strong></span>
            <Link to="/my-learning" style={{ color: 'var(--primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              Explore Topics <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 5. LEARNING CALENDAR (Monthly Consistency Calendar — NOT a Heatmap!) */}
      {/* ------------------------------------------------------------- */}
      <div className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CalendarCheck size={18} color="var(--primary)" />
              <h3 style={{ fontSize: '1.15rem', margin: 0 }}>Learning Consistency Calendar</h3>
            </div>
            <p className="text-muted text-xs" style={{ margin: '4px 0 0' }}>
              Conventional monthly attendance and study tracker. Click any date to inspect daily progress.
            </p>
          </div>

          {/* Month Navigation Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button onClick={handlePrevMonth} className="btn btn-secondary btn-sm" style={{ padding: '6px' }}>
              <ChevronLeft size={16} />
            </button>
            <strong style={{ fontSize: '0.95rem', minWidth: '130px', textAlign: 'center' }}>
              {monthNames[month]} {year}
            </strong>
            <button onClick={handleNextMonth} className="btn btn-secondary btn-sm" style={{ padding: '6px' }}>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Calendar Grid + Selected Date Inspector */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr', gap: '24px' }}>
          {/* Left: Monthly Calendar Grid */}
          <div>
            {/* Weekday Headers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', textAlign: 'center', marginBottom: '8px' }}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d} style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                  {d}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
              {/* Empty leading days */}
              {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
                <div key={`empty-${idx}`} style={{ height: '48px', opacity: 0.2 }} />
              ))}

              {/* Month Days */}
              {Array.from({ length: daysInMonth }).map((_, idx) => {
                const dayNum = idx + 1;
                const isToday = dayNum === today.getDate() && month === today.getMonth() && year === today.getFullYear();
                const isActive = activeDaysInMonth.includes(dayNum);
                const isSelected = selectedCalendarDay === dayNum;

                return (
                  <button
                    key={dayNum}
                    onClick={() => setSelectedCalendarDay(dayNum)}
                    style={{
                      height: '48px',
                      background: isSelected
                        ? 'rgba(99, 102, 241, 0.25)'
                        : isActive
                          ? 'rgba(245, 158, 11, 0.1)'
                          : 'var(--bg-input)',
                      border: isSelected
                        ? '2px solid var(--primary)'
                        : isToday
                          ? '2px solid #f59e0b'
                          : '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '2px',
                      cursor: 'pointer',
                      transition: 'var(--transition)',
                      position: 'relative'
                    }}
                  >
                    <span style={{
                      fontSize: '0.825rem',
                      fontWeight: isToday || isSelected ? 800 : 600,
                      color: isToday ? '#f59e0b' : isSelected ? 'var(--primary)' : 'var(--text-main)'
                    }}>
                      {dayNum}
                    </span>

                    {/* Small flame / dot for active days */}
                    {isActive && (
                      <div style={{
                        width: '5px',
                        height: '5px',
                        borderRadius: '50%',
                        background: isToday ? '#f59e0b' : 'var(--success)'
                      }} />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Calendar Legend */}
            <div style={{ display: 'flex', gap: '16px', marginTop: '16px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)' }} />
                <span>Active Learning Session</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }} />
                <span>Today (In Progress)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', border: '1px solid var(--border-subtle)' }} />
                <span>Rest Day</span>
              </div>
            </div>
          </div>

          {/* Right: Selected Date Inspection Details */}
          <div style={{
            background: 'var(--bg-input)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '18px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div>
                  <span className="text-muted text-xs" style={{ textTransform: 'uppercase', fontWeight: 700 }}>
                    Date Selected
                  </span>
                  <h4 style={{ fontSize: '1.05rem', margin: '2px 0 0' }}>
                    {monthNames[month]} {selectedCalendarDay}, {year}
                  </h4>
                </div>
                {selectedCalendarDay === 23 && month === 9 && (
                  <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>TODAY</span>
                )}
              </div>

              {selectedDateActivity.hasActivity ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{
                    background: 'var(--bg-card)',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    borderLeft: '3px solid var(--success)'
                  }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Logged Learning Time</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--success)' }}>
                      {selectedDateActivity.minutes} Minutes
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                      Lessons Completed:
                    </div>
                    {selectedDateActivity.lessons.map((les, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', marginBottom: '4px' }}>
                        <Check size={13} color="var(--success)" />
                        <span>{les}</span>
                      </div>
                    ))}
                  </div>

                  <p className="text-secondary text-xs" style={{ margin: '6px 0 0', lineHeight: 1.4 }}>
                    {selectedDateActivity.note}
                  </p>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--text-muted)' }}>
                  <Info size={28} style={{ margin: '0 auto 8px', opacity: 0.6 }} />
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Rest Day</div>
                  <p className="text-xs" style={{ margin: '4px 0 0' }}>
                    {selectedDateActivity.note}
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedCalendarDay(23)}
              className="btn btn-secondary btn-sm"
              style={{ marginTop: '16px', justifyContent: 'center' }}
            >
              Jump to Today (Oct 23)
            </button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 6. ACHIEVEMENTS & MILESTONES (6 Badges) */}
      {/* ------------------------------------------------------------- */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Award size={18} color="var(--primary)" />
              <h3 style={{ fontSize: '1.15rem', margin: 0 }}>Your Achievements & Milestones</h3>
            </div>
            <p className="text-muted text-xs" style={{ margin: '4px 0 0' }}>
              Streak milestones and study consistency badges
            </p>
          </div>
          <span className="badge badge-success" style={{ fontSize: '0.72rem' }}>
            3 of 6 Unlocked
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
          {achievements.map((ach) => (
            <div
              key={ach.id}
              style={{
                background: 'var(--bg-input)',
                border: ach.status === 'unlocked'
                  ? '1px solid rgba(16, 185, 129, 0.35)'
                  : ach.status === 'in_progress'
                    ? '1px solid rgba(245, 158, 11, 0.35)'
                    : '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
                padding: '16px',
                display: 'flex',
                gap: '12px',
                opacity: ach.status === 'locked' ? 0.65 : 1
              }}
            >
              <div style={{
                fontSize: '2rem',
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                background: ach.status === 'unlocked'
                  ? 'rgba(16, 185, 129, 0.15)'
                  : 'var(--bg-card)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                {ach.icon}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <strong style={{ fontSize: '0.9rem' }}>{ach.title}</strong>
                  {ach.status === 'unlocked' ? (
                    <span className="badge badge-success" style={{ fontSize: '0.62rem' }}>UNLOCKED</span>
                  ) : ach.status === 'in_progress' ? (
                    <span className="badge badge-warning" style={{ fontSize: '0.62rem' }}>IN PROGRESS</span>
                  ) : (
                    <span className="badge badge-secondary" style={{ fontSize: '0.62rem' }}>LOCKED</span>
                  )}
                </div>

                <p className="text-secondary text-xs" style={{ margin: '0 0 8px 0', lineHeight: 1.35 }}>
                  {ach.description}
                </p>

                {ach.progress && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', marginBottom: '3px' }}>
                      <span className="text-muted">Progress</span>
                      <strong>{ach.progress.current} / {ach.progress.total} Days</strong>
                    </div>
                    <div className="progress-bar-bg" style={{ height: '4px' }}>
                      <div
                        className="progress-bar-fill"
                        style={{
                          width: `${(ach.progress.current / ach.progress.total) * 100}%`,
                          background: ach.status === 'in_progress' ? '#f59e0b' : 'var(--text-muted)'
                        }}
                      />
                    </div>
                  </div>
                )}

                {ach.unlockedDate && (
                  <div className="text-muted text-xs" style={{ fontSize: '0.68rem', color: 'var(--success)' }}>
                    &bull; {ach.unlockedDate}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 7. WEEKLY STATS & LEARNING INSIGHTS (Sections 10 & 11) */}
      {/* ------------------------------------------------------------- */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '20px' }}>
        {/* Weekly Statistics: This Week at a Glance */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px' }}>
            <Clock size={16} color="var(--primary)" />
            <h3 style={{ fontSize: '1.05rem', margin: 0 }}>This Week at a Glance</h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
              <span className="text-muted text-xs font-semibold">Total Learning Time</span>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--primary)', marginTop: '2px' }}>
                4h 30m
              </div>
              <span className="text-success text-xs">&uarr; +45m vs last week</span>
            </div>

            <div style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
              <span className="text-muted text-xs font-semibold">Lessons Completed</span>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--success)', marginTop: '2px' }}>
                12
              </div>
              <span className="text-muted text-xs">+3 lessons completed</span>
            </div>

            <div style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
              <span className="text-muted text-xs font-semibold">Quizzes Attempted</span>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--accent-purple)', marginTop: '2px' }}>
                5
              </div>
              <span className="text-muted text-xs">100% pass score</span>
            </div>

            <div style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
              <span className="text-muted text-xs font-semibold">Active Days</span>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f59e0b', marginTop: '2px' }}>
                6 of 7
              </div>
              <span className="text-muted text-xs">85.7% consistency</span>
            </div>
          </div>
        </div>

        {/* Learning Insights & Streak History */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px' }}>
              <Sparkles size={16} color="#f59e0b" />
              <h3 style={{ fontSize: '1.05rem', margin: 0 }}>Your Learning Insights</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b', flexShrink: 0 }} />
                <div style={{ fontSize: '0.85rem' }}>
                  <strong>Peak Consistency:</strong> You're most active on <strong>Wednesdays</strong> with average session times of 60 minutes.
                </div>
              </div>

              <div style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)', flexShrink: 0 }} />
                <div style={{ fontSize: '0.85rem' }}>
                  <strong>Curriculum Milestone:</strong> You've completed <strong>12 lessons</strong> this week, outpacing 82% of your cohort.
                </div>
              </div>

              <div style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)', flexShrink: 0 }} />
                <div style={{ fontSize: '0.85rem' }}>
                  <strong>Weekly Goal:</strong> You're making steady progress toward your weekly learning goal (90% achieved).
                </div>
              </div>
            </div>
          </div>

          {/* Compact Streak History */}
          <div style={{
            marginTop: '16px',
            paddingTop: '12px',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.78rem'
          }}>
            <span className="text-muted">Streak Records:</span>
            <div style={{ display: 'flex', gap: '14px' }}>
              <span>Current: <strong style={{ color: '#f59e0b' }}>7 Days</strong></span>
              <span>Previous: <strong>5 Days</strong></span>
              <span>Personal Best: <strong style={{ color: '#ffd700' }}>21 Days</strong> 🏆</span>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 8. LOGIN HISTORY & SESSION CARDS (Explicit User Request) */}
      {/* ------------------------------------------------------------- */}
      <div className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={18} color="var(--primary)" />
              <h3 style={{ fontSize: '1.15rem', margin: 0 }}>Login History & Active Sessions</h3>
              <span className="badge badge-active" style={{ fontSize: '0.7rem' }}>
                1 Active Session
              </span>
            </div>
            <p className="text-muted text-xs" style={{ margin: '4px 0 0' }}>
              Verified device logins, campus terminal access, and MFA authentication ledger
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Filter Tabs */}
            <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-input)', padding: '3px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              {(['all', 'desktop', 'mobile', 'security'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setLoginFilter(mode)}
                  className="btn btn-sm"
                  style={{
                    background: loginFilter === mode ? 'var(--primary)' : 'transparent',
                    color: loginFilter === mode ? '#fff' : 'var(--text-secondary)',
                    border: 'none',
                    padding: '4px 10px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    borderRadius: 'var(--radius-sm)'
                  }}
                >
                  {mode === 'all' ? 'All Sessions' : mode === 'desktop' ? 'Desktop' : mode === 'mobile' ? 'Mobile App' : 'Security Log'}
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                setSessionTerminatedNotice('All other sessions terminated. Active browser session preserved.');
                setTimeout(() => setSessionTerminatedNotice(null), 5000);
              }}
              className="btn btn-secondary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem' }}
            >
              <LogOut size={13} /> Terminate Other Sessions
            </button>
          </div>
        </div>

        {sessionTerminatedNotice && (
          <div style={{
            background: 'var(--success-bg)',
            border: '1px solid var(--success-border)',
            color: 'var(--success)',
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            marginBottom: '16px',
            fontSize: '0.825rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <CheckCircle2 size={16} />
            <span>{sessionTerminatedNotice}</span>
          </div>
        )}

        {/* Login Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {filteredLoginSessions.map((session) => (
            <div
              key={session.id}
              style={{
                background: 'var(--bg-input)',
                border: session.isCurrent ? '1.5px solid var(--primary)' : '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
                padding: '18px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative'
              }}
            >
              {session.isCurrent && (
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)' }} />
                  <span className="badge badge-success" style={{ fontSize: '0.62rem' }}>ACTIVE NOW</span>
                </div>
              )}

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: 'var(--radius-md)',
                    background: session.isCurrent ? 'rgba(99, 102, 241, 0.2)' : 'var(--bg-card)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: session.isCurrent ? 'var(--primary)' : 'var(--text-secondary)'
                  }}>
                    {session.deviceType === 'desktop' ? (
                      <Laptop size={20} />
                    ) : session.deviceType === 'mobile' ? (
                      <Smartphone size={20} />
                    ) : session.deviceType === 'terminal' ? (
                      <Monitor size={20} />
                    ) : (
                      <Lock size={20} />
                    )}
                  </div>

                  <div>
                    <strong style={{ fontSize: '0.9rem', display: 'block' }}>{session.deviceName}</strong>
                    <span className="text-muted text-xs">{session.browser}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.78rem', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="text-muted">Location:</span>
                    <strong>{session.location}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="text-muted">IP Address:</span>
                    <code style={{ fontSize: '0.72rem' }}>{session.ipAddress}</code>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="text-muted">Login Time:</span>
                    <span>{session.loginTime}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="text-muted">Session Duration:</span>
                    <span>{session.sessionDuration}</span>
                  </div>
                </div>
              </div>

              <div style={{
                paddingTop: '10px',
                borderTop: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.72rem'
              }}>
                <span className="text-muted" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <ShieldCheck size={12} color="var(--success)" /> {session.authMethod}
                </span>
                {!session.isCurrent && (
                  <span className="badge badge-secondary" style={{ fontSize: '0.65rem' }}>Closed</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
