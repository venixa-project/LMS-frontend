// ============================================================
// LMS - Student Leaderboard Welcome Pop-Up Modal
// Displays gamified student rank, XP velocity, streak days,
// podium preview, and progress to the next rank upon login.
// ============================================================

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Trophy, Flame, Sparkles, X, ArrowRight, Zap, Award,
  TrendingUp, BookOpen, Clock, Target, ChevronRight, CheckCircle2
} from 'lucide-react';
import { useAuthStore } from '../lib/store';
import { TIMEFRAME_DATA, LeaderboardMember } from '../pages/Academics/leaderboardData';
import { AnimatedAvatar } from './AnimatedAvatar';

export interface StudentLeaderboardWelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  rotation: number;
  rotationSpeed: number;
}

export const StudentLeaderboardWelcomeModal: React.FC<StudentLeaderboardWelcomeModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dontShowToday, setDontShowToday] = useState(false);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleDismiss();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Compute student leaderboard data & standing
  const { studentMember, currentRank, prevRank, rankDelta, nextRankMember, pointsToNext, topThree } = useMemo(() => {
    const allMembers = [...TIMEFRAME_DATA.all_time];

    // Find student in leaderboard data or fallback to Alex Thompson
    const matched = allMembers.find(
      (m) => m.id === user?.id || (user?.email && m.email.toLowerCase() === user.email.toLowerCase()) || m.isCurrentUser
    );

    const student: LeaderboardMember = matched
      ? {
          ...matched,
          name: user?.displayName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || matched.name,
          email: user?.email || matched.email,
        }
      : {
          id: user?.id || 'u-007',
          name: user?.displayName || `${user?.firstName || 'Student'} ${user?.lastName || ''}`.trim() || 'Alex Thompson',
          email: user?.email || 'student@lms.demo',
          rollNo: user?.rollNo || 'STU-2026-007',
          avatarInitials: 'AT',
          cohort: 'Spring 2026 Engineering',
          coursesEnrolled: 4,
          coursesCompleted: 3,
          overallCompletionRate: 84.5,
          points: 3420,
          previousRank: 6,
          certificates: 3,
          weeklyStudyHours: 24,
          badgesEarned: 5,
          streakDays: 12,
          recentCourseFinished: 'TypeScript Mastery & Enterprise Design Patterns',
          isCurrentUser: true,
        };

    // Sort list by points descending
    const sorted = [...allMembers].sort((a, b) => b.points - a.points);
    const rankIndex = sorted.findIndex((m) => m.id === student.id || m.email === student.email);
    const rank = rankIndex >= 0 ? rankIndex + 1 : 4;
    const pRank = student.previousRank || 6;
    const delta = pRank - rank; // positive = gained ranks

    const nextMember = rankIndex > 0 ? sorted[rankIndex - 1] : null;
    const ptsToNext = nextMember ? Math.max(10, nextMember.points - student.points + 20) : 0;
    const top3 = sorted.slice(0, 3);

    return {
      studentMember: student,
      currentRank: rank,
      prevRank: pRank,
      rankDelta: delta,
      nextRankMember: nextMember,
      pointsToNext: ptsToNext,
      topThree: top3,
    };
  }, [user]);

  // Particle celebration canvas effect
  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = (canvas.width = canvas.offsetWidth || 620);
    const height = (canvas.height = 140);

    const colors = ['#ffd700', '#f59e0b', '#38bdf8', '#818cf8', '#10b981', '#ec4899'];
    const particles: Particle[] = Array.from({ length: 45 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 1.5,
      vy: Math.random() * 0.8 + 0.3,
      size: Math.random() * 4 + 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: Math.random() * 0.7 + 0.3,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.05,
    }));

    let animId: number;
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;

        if (p.y > height) {
          p.y = -10;
          p.x = Math.random() * width;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      });

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isOpen]);

  const handleDismiss = () => {
    if (dontShowToday) {
      const todayStr = new Date().toISOString().slice(0, 10);
      localStorage.setItem('venilearn_dismiss_leaderboard_popup', todayStr);
    }
    sessionStorage.removeItem('show_student_leaderboard_popup');
    onClose();
  };

  const handleGoToLeaderboard = () => {
    handleDismiss();
    navigate('/leaderboard');
  };

  const handleGoToCourses = () => {
    handleDismiss();
    navigate('/courses');
  };

  if (!isOpen) return null;

  const firstName = studentMember.name.split(' ')[0] || 'Scholar';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1060,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        backgroundColor: 'rgba(7, 11, 22, 0.82)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        animation: 'fadeIn 0.25s ease-out',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleDismiss();
        }
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '620px',
          maxHeight: '92vh',
          overflowY: 'auto',
          background: 'linear-gradient(150deg, #131b2e 0%, #0d121f 100%)',
          border: '1.5px solid rgba(255, 215, 0, 0.35)',
          borderRadius: '24px',
          padding: '0',
          position: 'relative',
          boxShadow: '0 25px 60px -10px rgba(0, 0, 0, 0.75), 0 0 45px rgba(245, 158, 11, 0.15)',
          color: '#f8fafc',
        }}
      >
        {/* Canvas Confetti Particles Header */}
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '140px',
            pointerEvents: 'none',
            zIndex: 1,
            borderRadius: '24px 24px 0 0',
          }}
        />

        {/* Close Button */}
        <button
          type="button"
          onClick={handleDismiss}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: '#94a3b8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 10,
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
            e.currentTarget.style.color = '#fff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
            e.currentTarget.style.color = '#94a3b8';
          }}
          aria-label="Close Leaderboard Modal"
        >
          <X size={18} />
        </button>

        {/* Modal Content */}
        <div style={{ padding: '28px 24px 20px', position: 'relative', zIndex: 2 }}>
          {/* Header Badge & Greeting */}
          <div style={{ textAlign: 'center', marginBottom: '18px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 14px',
                borderRadius: '999px',
                background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.18), rgba(245, 158, 11, 0.08))',
                border: '1px solid rgba(255, 215, 0, 0.4)',
                color: '#ffd700',
                fontSize: '0.75rem',
                fontWeight: 800,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                marginBottom: '10px',
              }}
            >
              <Trophy size={14} color="#ffd700" />
              <span>Academy Leaderboard Standing</span>
            </div>

            <h2
              style={{
                fontSize: '1.65rem',
                fontWeight: 800,
                margin: '0 0 6px',
                letterSpacing: '-0.02em',
                background: 'linear-gradient(135deg, #ffffff 40%, #ffd700 80%, #f59e0b 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Welcome back, {firstName}! 🚀
            </h2>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.4 }}>
              Here is your latest academic standing, study velocity, and ranking update today.
            </p>
          </div>

          {/* Hero Ranking Card */}
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)',
              border: '1px solid rgba(255, 215, 0, 0.25)',
              borderRadius: '18px',
              padding: '18px',
              marginBottom: '16px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
              {/* Avatar + Name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <AnimatedAvatar
                  size={58}
                  isCurrentUser={true}
                  name={studentMember.name}
                  rank={currentRank}
                  showRankBadge={true}
                />
                <div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff', marginBottom: '2px' }}>
                    {studentMember.name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    {studentMember.cohort}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#cbd5e1', marginTop: '3px' }}>
                    Roll No: <strong>{studentMember.rollNo}</strong>
                  </div>
                </div>
              </div>

              {/* Rank Position Pill */}
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
                  Current Rank
                </div>
                <div
                  style={{
                    fontSize: '2rem',
                    fontWeight: 900,
                    lineHeight: 1.1,
                    color: currentRank === 1 ? '#ffd700' : currentRank <= 3 ? '#38bdf8' : '#818cf8',
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: '4px',
                    justifyContent: 'flex-end',
                  }}
                >
                  <span>#{currentRank}</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#94a3b8' }}>/ 120</span>
                </div>

                {/* Trend Badge */}
                {rankDelta > 0 ? (
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: '#10b981',
                      background: 'rgba(16, 185, 129, 0.15)',
                      padding: '2px 8px',
                      borderRadius: '999px',
                      marginTop: '4px',
                    }}
                  >
                    <TrendingUp size={11} />
                    <span>↑ {rankDelta} Ranks Climbed!</span>
                  </div>
                ) : rankDelta === 0 ? (
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      color: '#38bdf8',
                      background: 'rgba(56, 189, 248, 0.12)',
                      padding: '2px 8px',
                      borderRadius: '999px',
                      marginTop: '4px',
                    }}
                  >
                    <span>↔ Maintaining Position</span>
                  </div>
                ) : (
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      color: '#f59e0b',
                      background: 'rgba(245, 158, 11, 0.12)',
                      padding: '2px 8px',
                      borderRadius: '999px',
                      marginTop: '4px',
                    }}
                  >
                    <span>↓ {Math.abs(rankDelta)} Ranks</span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Metrics Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '8px',
                marginTop: '16px',
                paddingTop: '14px',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <div style={{ textAlign: 'center', padding: '6px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                  <Zap size={11} color="#ffd700" /> Total XP
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ffd700', marginTop: '2px' }}>
                  {studentMember.points.toLocaleString()}
                </div>
              </div>

              <div style={{ textAlign: 'center', padding: '6px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                  <Flame size={11} color="#f97316" /> Streak
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#f97316', marginTop: '2px' }}>
                  {studentMember.streakDays} Days
                </div>
              </div>

              <div style={{ textAlign: 'center', padding: '6px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                  <BookOpen size={11} color="#38bdf8" /> Courses
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#38bdf8', marginTop: '2px' }}>
                  {studentMember.coursesCompleted} of {studentMember.coursesEnrolled}
                </div>
              </div>

              <div style={{ textAlign: 'center', padding: '6px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                  <Clock size={11} color="#a855f7" /> Study Time
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#a855f7', marginTop: '2px' }}>
                  {studentMember.weeklyStudyHours}h / wk
                </div>
              </div>
            </div>
          </div>

          {/* Next Rank Challenge Target */}
          {nextRankMember && currentRank > 1 && (
            <div
              style={{
                background: 'rgba(99, 102, 241, 0.08)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                borderRadius: '14px',
                padding: '12px 16px',
                marginBottom: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 700, color: '#818cf8' }}>
                  <Target size={14} color="#818cf8" />
                  <span>Next Rank Milestone: #{currentRank - 1} {nextRankMember.name}</span>
                </div>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#ffd700' }}>
                  {pointsToNext} XP needed
                </span>
              </div>

              {/* Progress Bar */}
              <div
                style={{
                  height: '7px',
                  borderRadius: '999px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${Math.min(96, Math.max(25, Math.round((studentMember.points / nextRankMember.points) * 100)))}%`,
                    background: 'linear-gradient(90deg, #6366f1, #f59e0b)',
                    borderRadius: '999px',
                    transition: 'width 0.8s ease',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px', fontSize: '0.68rem', color: '#94a3b8' }}>
                <span>You: {studentMember.points} XP</span>
                <span>Target: {nextRankMember.points} XP</span>
              </div>
            </div>
          )}

          {/* Top 3 Champions Mini-Podium */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
              Current Academy Leaders
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {topThree.map((leader, idx) => {
                const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉';
                const medalColor = idx === 0 ? '#ffd700' : idx === 1 ? '#cbd5e1' : '#b45309';
                return (
                  <div
                    key={leader.id}
                    style={{
                      background: 'rgba(15, 23, 42, 0.65)',
                      border: `1px solid ${idx === 0 ? 'rgba(255, 215, 0, 0.3)' : 'rgba(255, 255, 255, 0.08)'}`,
                      borderRadius: '12px',
                      padding: '10px 8px',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '1rem', marginBottom: '2px' }}>{medal}</div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {leader.name}
                    </div>
                    <div style={{ fontSize: '0.68rem', fontWeight: 700, color: medalColor, marginTop: '2px' }}>
                      {leader.points.toLocaleString()} XP
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
            <button
              type="button"
              onClick={handleGoToLeaderboard}
              className="btn btn-primary"
              style={{
                flex: 1,
                padding: '12px 18px',
                fontSize: '0.88rem',
                fontWeight: 800,
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                border: 'none',
                color: '#0f172a',
                boxShadow: '0 4px 16px rgba(245, 158, 11, 0.4)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              <Trophy size={16} />
              <span>View Full Leaderboard</span>
            </button>

            <button
              type="button"
              onClick={handleGoToCourses}
              className="btn btn-secondary"
              style={{
                flex: 1,
                padding: '12px 18px',
                fontSize: '0.88rem',
                fontWeight: 700,
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                color: '#f8fafc',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.14)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)')}
            >
              <span>Continue Learning</span>
              <ArrowRight size={15} />
            </button>
          </div>

          {/* Footer: Dismiss options */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: '#94a3b8', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={dontShowToday}
                onChange={(e) => setDontShowToday(e.target.checked)}
                style={{ accentColor: '#f59e0b', cursor: 'pointer' }}
              />
              <span>Don't show this pop-up again today</span>
            </label>

            <button
              type="button"
              onClick={handleDismiss}
              style={{
                background: 'none',
                border: 'none',
                color: '#64748b',
                fontSize: '0.72rem',
                cursor: 'pointer',
                padding: '2px 4px',
                textDecoration: 'underline',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#94a3b8')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#64748b')}
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
