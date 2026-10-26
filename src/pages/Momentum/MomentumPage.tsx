import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../lib/store';
import {
  Flame, Award, Trophy, Zap, Clock, Calendar, CheckCircle2,
  ArrowRight, Shield, Target, TrendingUp, Sparkles, AlertCircle,
  Play, BookOpen, Star, RefreshCw, BarChart2, ShieldCheck, ChevronRight
} from 'lucide-react';

interface DayActivity {
  date: string;
  dayName: string;
  dayNumber: number;
  minutes: number;
  lessons: number;
  level: 0 | 1 | 2 | 3 | 4; // 0: none, 1: 15m, 2: 30m, 3: 45m, 4: 60m+
  isToday?: boolean;
}

export const MomentumPage: React.FC = () => {
  const { user } = useAuthStore();
  const userName = user?.displayName || user?.firstName || 'Alex';

  // State
  const [currentStreak, setCurrentStreak] = useState(12);
  const [hasCheckedInToday, setHasCheckedInToday] = useState(false);
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState(45);
  const [todayStudiedMinutes, setTodayStudiedMinutes] = useState(35);
  const [streakFreezes, setStreakFreezes] = useState(1);
  const [celebrationNotice, setCelebrationNotice] = useState<string | null>(null);
  const [selectedActivityDay, setSelectedActivityDay] = useState<DayActivity | null>(null);

  // Generate 28-day historical matrix leading up to today
  const [activityHistory, setActivityHistory] = useState<DayActivity[]>(() => {
    const days: DayActivity[] = [];
    const baseDate = new Date('2026-10-26T00:00:00'); // Today

    const presets = [
      { min: 45, l: 3 }, { min: 60, l: 4 }, { min: 30, l: 2 }, { min: 90, l: 5 },
      { min: 40, l: 2 }, { min: 50, l: 3 }, { min: 75, l: 4 }, { min: 20, l: 1 },
      { min: 60, l: 3 }, { min: 45, l: 2 }, { min: 80, l: 4 }, { min: 35, l: 2 },
      { min: 90, l: 5 }, { min: 40, l: 2 }, { min: 55, l: 3 }, { min: 65, l: 4 },
      { min: 30, l: 2 }, { min: 85, l: 4 }, { min: 45, l: 3 }, { min: 50, l: 3 },
      { min: 70, l: 4 }, { min: 60, l: 3 }, { min: 40, l: 2 }, { min: 75, l: 4 },
      { min: 50, l: 3 }, { min: 90, l: 5 }, { min: 60, l: 3 }, { min: 35, l: 2 },
    ];

    for (let i = 27; i >= 0; i--) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() - i);
      const isToday = i === 0;
      const preset = presets[27 - i] || { min: 40, l: 2 };
      const minutes = isToday ? 35 : preset.min;
      const lessons = isToday ? 2 : preset.l;

      let level: 0 | 1 | 2 | 3 | 4 = 1;
      if (minutes >= 75) level = 4;
      else if (minutes >= 50) level = 3;
      else if (minutes >= 30) level = 2;
      else if (minutes > 0) level = 1;
      else level = 0;

      days.push({
        date: d.toISOString().split('T')[0],
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNumber: d.getDate(),
        minutes,
        lessons,
        level,
        isToday,
      });
    }
    return days;
  });

  const handleQuickCheckin = () => {
    if (hasCheckedInToday) return;
    setHasCheckedInToday(true);
    setCurrentStreak((prev) => prev + 1);
    setTodayStudiedMinutes((prev) => prev + 15);
    setCelebrationNotice(`🎉 Streak Extended! You are on a ${currentStreak + 1}-Day Learning Streak! +50 XP bonus earned.`);
    setTimeout(() => setCelebrationNotice(null), 6000);

    // Update today's activity block
    setActivityHistory((prev) => {
      const updated = [...prev];
      const todayIdx = updated.findIndex((d) => d.isToday);
      if (todayIdx !== -1) {
        const current = updated[todayIdx];
        const newMins = current.minutes + 15;
        updated[todayIdx] = {
          ...current,
          minutes: newMins,
          lessons: current.lessons + 1,
          level: newMins >= 75 ? 4 : newMins >= 50 ? 3 : 2,
        };
      }
      return updated;
    });
  };

  const handleUseStreakFreeze = () => {
    if (streakFreezes <= 0) return;
    setStreakFreezes((prev) => prev - 1);
    setCelebrationNotice('🛡️ Streak Freeze Activated! Your 12-day streak is safely locked and protected against missed study sessions for the next 24 hours.');
    setTimeout(() => setCelebrationNotice(null), 6000);
  };

  const progressPercentage = Math.min(100, Math.round((todayStudiedMinutes / dailyGoalMinutes) * 100));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Toast Alert Notice */}
      {celebrationNotice && (
        <div style={{
          position: 'fixed',
          top: '80px',
          right: '24px',
          zIndex: 9999,
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
          border: '1.5px solid #818cf8',
          color: '#ffffff',
          padding: '14px 20px',
          borderRadius: '12px',
          boxShadow: '0 12px 30px rgba(99, 102, 241, 0.4)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          maxWidth: '480px',
          animation: 'slideIn 0.3s ease-out'
        }}>
          <Sparkles size={20} color="#fbbf24" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: '0.875rem', fontWeight: 600, lineHeight: 1.4 }}>
            {celebrationNotice}
          </span>
        </div>
      )}

      {/* Hero Banner with Streak Flame */}
      <div
        className="card"
        style={{
          background: 'radial-gradient(ellipse at top right, rgba(242, 50, 169, 0.22) 0%, rgba(84, 71, 255, 0.16) 50%, var(--bg-surface) 100%)',
          border: '1px solid var(--border-subtle)',
          padding: '28px',
          borderRadius: 'var(--radius-xl)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span
                className="badge"
                style={{
                  background: 'rgba(242, 50, 169, 0.15)',
                  color: '#F472B6',
                  border: '1px solid rgba(242, 50, 169, 0.35)',
                  fontWeight: 700,
                  gap: '5px'
                }}
              >
                <Flame size={14} fill="#F232A9" color="#F232A9" /> Learning Velocity & Habit Tracker
              </span>
              <span className="badge badge-secondary" style={{ fontSize: '0.72rem' }}>Level 4 Scholar</span>
            </div>

            <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 8px 0', letterSpacing: '-0.02em', color: 'var(--text-main)' }}>
              Keep Up The Momentum, {userName}!
            </h1>
            <p className="text-secondary text-sm" style={{ maxWidth: '600px', margin: 0, lineHeight: 1.5 }}>
              Consistent daily study is the fastest predictor of technical mastery. Complete your daily goal of {dailyGoalMinutes} minutes to maintain your active streak.
            </p>
          </div>

          {/* Quick Check-in CTA Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              className="btn btn-secondary"
              onClick={handleUseStreakFreeze}
              disabled={streakFreezes <= 0}
              style={{
                gap: '8px',
                fontSize: '0.85rem',
                opacity: streakFreezes > 0 ? 1 : 0.6
              }}
              title="Protects your streak if you miss a calendar day"
            >
              <ShieldCheck size={16} color="var(--primary)" />
              <span>Streak Freeze ({streakFreezes})</span>
            </button>

            <button
              className="btn btn-primary"
              onClick={handleQuickCheckin}
              disabled={hasCheckedInToday}
              style={{
                gap: '8px',
                fontWeight: 700,
                fontSize: '0.9rem',
                padding: '10px 20px',
                background: hasCheckedInToday
                  ? 'var(--success)'
                  : 'linear-gradient(135deg, #5447FF 0%, #F232A9 100%)',
                borderColor: hasCheckedInToday ? 'var(--success)' : '#F232A9',
                boxShadow: hasCheckedInToday
                  ? '0 0 16px rgba(16, 185, 129, 0.3)'
                  : '0 4px 18px rgba(242, 50, 169, 0.4)'
              }}
            >
              <Flame size={18} fill={hasCheckedInToday ? '#ffffff' : '#ffffff'} />
              <span>{hasCheckedInToday ? 'Today Locked In ✓' : 'Log Today’s Check-in (+15m)'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Primary Momentum Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        {/* Card 1: Active Streak */}
        <div className="card stat-card" style={{ borderLeft: '4px solid #EC4899' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="text-muted text-xs font-semibold">Active Streak</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#EC4899', fontSize: '0.75rem', fontWeight: 700 }}>
              <Flame size={14} fill="#EC4899" /> ON FIRE
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', margin: '4px 0' }}>
            <span style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
              {currentStreak}
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600 }}>Consecutive Days</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Personal Record: <strong style={{ color: 'var(--text-main)' }}>21 Days</strong> (June 2026)
          </div>
        </div>

        {/* Card 2: Weekly Time Invested */}
        <div className="card stat-card" style={{ borderLeft: '4px solid var(--primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="text-muted text-xs font-semibold">Time Invested (Week)</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--success)', fontSize: '0.75rem', fontWeight: 700 }}>
              <TrendingUp size={14} /> +3.2h vs Last Wk
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', margin: '4px 0' }}>
            <span style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
              14.8
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600 }}>Hours</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Weekly Goal: 10 hrs &bull; <strong style={{ color: 'var(--success)' }}>148% Accomplished</strong>
          </div>
        </div>

        {/* Card 3: Lessons & Topics Completed */}
        <div className="card stat-card" style={{ borderLeft: '4px solid #3B82F6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="text-muted text-xs font-semibold">Lessons Mastered</span>
            <span className="badge badge-secondary" style={{ fontSize: '0.68rem' }}>Course Curriculum</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', margin: '4px 0' }}>
            <span style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
              28
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600 }}>of 43 Completed</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Overall Syllabus Completion: <strong style={{ color: '#3B82F6' }}>65.0%</strong>
          </div>
        </div>

        {/* Card 4: Attendance & Practice Consistency */}
        <div className="card stat-card" style={{ borderLeft: '4px solid #10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="text-muted text-xs font-semibold">Habit Consistency</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10b981', fontSize: '0.75rem', fontWeight: 700 }}>
              <Star size={13} fill="#10b981" /> Top 5%
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', margin: '4px 0' }}>
            <span style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
              94.6%
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600 }}>Punctuality</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Live Class Turnout: <strong style={{ color: 'var(--text-main)' }}>18 / 19 Sessions</strong>
          </div>
        </div>
      </div>

      {/* Main Two-Column Row: Activity Heatmap (Left) + Today's Goal Tracker (Right) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) minmax(0, 1.2fr)', gap: '20px' }}>
        {/* Left: 28-Day Activity Heatmap Matrix */}
        <div className="card" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                28-Day Consistency Matrix
              </h3>
              <p className="text-secondary text-xs" style={{ margin: '2px 0 0 0' }}>
                Daily study hours, interactive labs, and live classroom attendance history
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              <span>Less</span>
              <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'rgba(255,255,255,0.06)' }} />
              <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#064e3b' }} />
              <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#047857' }} />
              <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#10b981' }} />
              <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#34d399' }} />
              <span>More</span>
            </div>
          </div>

          {/* Grid of 28 Days (4 rows of 7 days) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '8px',
            marginBottom: '16px'
          }}>
            {activityHistory.map((item, idx) => {
              const bgColors = {
                0: 'rgba(255,255,255,0.06)',
                1: '#064e3b',
                2: '#047857',
                3: '#10b981',
                4: '#34d399',
              };
              const isSelected = selectedActivityDay?.date === item.date;

              return (
                <div
                  key={idx}
                  onClick={() => setSelectedActivityDay(item)}
                  style={{
                    background: bgColors[item.level],
                    border: item.isToday
                      ? '2px solid #ef4444'
                      : isSelected
                      ? '2px solid #ffffff'
                      : '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    padding: '10px 8px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                    boxShadow: item.isToday ? '0 0 10px rgba(239,68,68,0.4)' : 'none',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <span style={{ fontSize: '0.68rem', fontWeight: 600, color: item.level >= 2 ? '#ffffff' : 'var(--text-muted)' }}>
                    {item.dayName}
                  </span>
                  <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#ffffff', marginTop: '2px' }}>
                    {item.dayNumber}
                  </span>
                  <span style={{ fontSize: '0.65rem', color: item.level >= 3 ? '#ecfdf5' : '#cbd5e1', marginTop: '2px' }}>
                    {item.minutes}m
                  </span>
                </div>
              );
            })}
          </div>

          {/* Activity Day Details Drawer / Popover */}
          <div style={{
            background: 'var(--bg-input)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.825rem'
          }}>
            {selectedActivityDay ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Calendar size={15} color="var(--primary)" />
                  <span>
                    <strong>{selectedActivityDay.date}</strong> &bull; {selectedActivityDay.minutes} minutes active &bull; {selectedActivityDay.lessons} lessons completed
                  </span>
                </div>
                <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>Goal Achieved</span>
              </>
            ) : (
              <div style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={15} color="#f59e0b" />
                <span>Click any block above to inspect daily study breakdown and completed labs.</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Today's Daily Target Progress Card */}
        <div className="card" style={{ padding: '22px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Target size={18} color="var(--primary)" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                  Today’s Study Target
                </h3>
              </div>
              <span className="badge badge-primary">{progressPercentage}% Done</span>
            </div>

            {/* Target Preset Selector Buttons */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '18px' }}>
              {[15, 30, 45, 60].map((mins) => (
                <button
                  key={mins}
                  onClick={() => setDailyGoalMinutes(mins)}
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

            {/* Circular or Linear Progress Bar */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                <span style={{ fontWeight: 600 }}>{todayStudiedMinutes} mins completed</span>
                <span className="text-muted">{dailyGoalMinutes} mins target</span>
              </div>
              <div style={{ width: '100%', height: '10px', background: 'var(--bg-input)', borderRadius: '5px', overflow: 'hidden' }}>
                <div style={{
                  width: `${progressPercentage}%`,
                  height: '100%',
                  background: progressPercentage >= 100
                    ? 'var(--success)'
                    : 'linear-gradient(90deg, var(--primary) 0%, #a855f7 100%)',
                  borderRadius: '5px',
                  transition: 'width 0.4s ease'
                }} />
              </div>
            </div>

            {/* Daily Focus Summary Checklist */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={14} color="var(--success)" />
                <span>Reviewed Lesson 3: Asynchronous Loops (20 mins)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={14} color="var(--success)" />
                <span>Submitted React Fundamentals Practice Quiz (15 mins)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                <div style={{ width: '14px', height: '14px', borderRadius: '50%', border: '1.5px dashed var(--border-subtle)', margin: '0 0 0 1px' }} />
                <span>Up next: Complete Lesson 4 interactive lab (10 mins)</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <Link
              to="/courses"
              className="btn btn-primary"
              style={{ flex: 1, justifyContent: 'center', fontSize: '0.85rem', gap: '6px' }}
            >
              <Play size={14} /> Resume Course
            </Link>
            <Link
              to="/my-sessions"
              className="btn btn-secondary"
              style={{ flex: 1, justifyContent: 'center', fontSize: '0.85rem', gap: '6px' }}
            >
              <Calendar size={14} /> View Timetable
            </Link>
          </div>
        </div>
      </div>

      {/* Milestone Badges & Achievements Row */}
      <div className="card" style={{ padding: '22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
              Momentum Streaks & Milestones
            </h3>
            <p className="text-secondary text-xs" style={{ margin: '2px 0 0 0' }}>
              Earn badges, XP multipliers, and certificates by building uninterrupted learning habits
            </p>
          </div>
          <span className="badge badge-secondary">Gamification Engine Active</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px' }}>
          {/* Badge 1 */}
          <div style={{
            background: 'var(--bg-input)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '12px',
            padding: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px'
            }}>
              🔥
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main)' }}>7-Day Streak</div>
              <div style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 600 }}>Unlocked &bull; 100 XP</div>
            </div>
          </div>

          {/* Badge 2 */}
          <div style={{
            background: 'var(--bg-input)',
            border: '1.5px solid var(--primary)',
            borderRadius: '12px',
            padding: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 0 12px var(--primary-glow)'
          }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: 'var(--primary-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px'
            }}>
              ⚡
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main)' }}>14-Day Velocity</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 700 }}>2 Days Away (86%)</div>
            </div>
          </div>

          {/* Badge 3 */}
          <div style={{
            background: 'var(--bg-input)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            opacity: 0.75
          }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px'
            }}>
              🏆
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main)' }}>30-Day Legend</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>18 Days to unlock</div>
            </div>
          </div>

          {/* Badge 4 */}
          <div style={{
            background: 'var(--bg-input)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '12px',
            padding: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px'
            }}>
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
