import React, { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../../lib/store';
import { useCourseStore } from '../../lib/courseStore';
import { Link } from 'react-router-dom';
import {
  adminDashboardMetrics, learnerDashboardMetrics, mockCourses,
  mockLiveSessions, mockAssessments, mockGradingTasks, mockGamificationProfile,
  mockDepartments, mockCohorts, mockOrganizations, mockAuditEntries
} from '../../data/mockData';
import { mockUsers } from '../../data/mockUsers';
import {
  TrendingUp, TrendingDown, Users, BookOpen, Video, Award,
  ClipboardCheck, Clock, ArrowRight, Play, CheckCircle2,
  AlertCircle, Sparkles, Flame, Plus, Shield, PenTool,
  GraduationCap, Calendar, Network, Bell, FileText, Activity,
  Layers, Check, UserCheck, UsersRound, Route, HelpCircle, Building2,
  Star, Zap, ChevronLeft, ChevronRight, Trophy
} from 'lucide-react';
import { PlatformDashboardPage } from '../../platform-admin/pages/PlatformDashboardPage';
import { InstitutionDashboardPage } from '../../admin/pages/InstitutionDashboardPage';
import { TrainerDashboardPage } from './TrainerDashboardPage';
import { GoogleMeetIcon, MeetingProviderBadge, GoogleMeetJoinButton } from '../../components/GoogleMeet';

export const DashboardPage: React.FC = () => {
  const { user, isLoading, notifications, markNotificationRead } = useAuthStore();
  const { enrollCourse } = useCourseStore();
  const [adminScope, setAdminScope] = useState<'platform' | 'institution'>('platform');
  const [recommendedCategory, setRecommendedCategory] = useState<'all' | 'web' | 'data' | 'cloud' | 'ai'>('all');
  const [enrolledNotice, setEnrolledNotice] = useState<string | null>(null);

  // Horizontal course carousel slider state and controls
  const sliderRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScrollState = () => {
    if (!sliderRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = sliderRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  };

  const handleSliderScroll = (direction: 'left' | 'right') => {
    if (!sliderRef.current) return;
    const scrollAmount = 338; // card width (320px) + gap (18px)
    sliderRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

  useEffect(() => {
    const el = sliderRef.current;
    if (!el) return;
    checkScrollState();
    el.addEventListener('scroll', checkScrollState, { passive: true });
    window.addEventListener('resize', checkScrollState);
    return () => {
      el.removeEventListener('scroll', checkScrollState);
      window.removeEventListener('resize', checkScrollState);
    };
  }, [recommendedCategory]);

  if (isLoading || !user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="pulse-indicator" style={{ width: '14px', height: '14px', margin: '0 auto 12px' }} />
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Loading dashboard...</div>
        </div>
      </div>
    );
  }

  const rawRole = user.activeRole;
  const role = (rawRole === 'trainer' || rawRole === 'instructor' || rawRole === 'assessment_author' || rawRole === 'grader')
    ? 'trainer'
    : (rawRole === 'student' || rawRole === 'learner' || rawRole === 'guest')
      ? 'student'
      : (rawRole === 'org_admin' || rawRole === 'lms_admin')
        ? 'org_admin'
        : rawRole === 'platform_admin'
          ? 'platform_admin'
          : 'org_admin';

  // -------------------------------------------------------------
  // 1. STUDENT DASHBOARD VIEW
  // -------------------------------------------------------------
  if (role === 'student') {
    const activeCourse = mockCourses[0];
    const nextSession = mockLiveSessions.find((s) => s.status === 'scheduled');
    const dueAssessment = mockAssessments[0];

    // Helper to format live session date and time cleanly
    const formatLiveSessionTime = (session: typeof mockLiveSessions[0]) => {
      if (!session) return '';
      try {
        const dateStr = session.date || '2026-10-17';
        const timeStr = session.startTime || '10:00';
        const parts = dateStr.split('-').map(Number);
        const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
        const dayFormatted = isNaN(dateObj.getTime())
          ? dateStr
          : dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

        const timeParts = timeStr.split(':').map(Number);
        const startH = timeParts[0] ?? 10;
        const startM = timeParts[1] ?? 0;
        const startPeriod = startH >= 12 ? 'PM' : 'AM';
        const startHour12 = startH % 12 || 12;
        const timeFormatted = `${startHour12}:${startM.toString().padStart(2, '0')} ${startPeriod}`;

        return `${dayFormatted} • ${timeFormatted}`;
      } catch {
        return `${session.date || ''} • ${session.startTime || ''}`;
      }
    };

    const recommendedCourses = [
      {
        id: 'rec-001',
        title: 'Full-Stack Web Development Bootcamp',
        category: 'web',
        categoryName: 'Web Development',
        badge: '🔥 #1 Most Popular',
        badgeColor: 'var(--danger)',
        rating: '4.9',
        ratingCount: 512,
        learnersCount: 412,
        duration: '48 Hours',
        modulesCount: 14,
        level: 'Intermediate',
        instructor: 'Dr. James Wilson',
        description: 'Master modern full-stack JavaScript, React 19, Node.js microservices, and PostgreSQL with capstone projects.',
        accentColor: 'linear-gradient(135deg, #2563EB 0%, #EC4899 100%)',
        courseId: 'crs-004'
      },
      {
        id: 'rec-002',
        title: 'Python for Data Science & Machine Learning',
        category: 'data',
        categoryName: 'Data Science',
        badge: '⭐ Top Rated',
        badgeColor: 'var(--warning)',
        rating: '4.8',
        ratingCount: 384,
        learnersCount: 328,
        duration: '36 Hours',
        modulesCount: 10,
        level: 'Beginner to Intermediate',
        instructor: 'Dr. Marcus Bell',
        description: 'Practical data science with Pandas, NumPy, statistical modeling, and machine learning algorithms on real-world datasets.',
        accentColor: 'linear-gradient(135deg, #5447FF 0%, #F232A9 100%)',
        courseId: 'crs-003'
      },
      {
        id: 'rec-003',
        title: 'Docker, Kubernetes & Cloud Architecture',
        category: 'cloud',
        categoryName: 'Cloud & DevOps',
        badge: '🚀 Trending Track',
        badgeColor: 'var(--accent-purple)',
        rating: '4.9',
        ratingCount: 295,
        learnersCount: 295,
        duration: '28 Hours',
        modulesCount: 8,
        level: 'Advanced',
        instructor: 'Prof. Elena Rostova',
        description: 'Container orchestration, production Kubernetes clusters, Helm charts, and CI/CD automated deployment pipelines.',
        accentColor: 'linear-gradient(135deg, #2563EB 0%, #F472B6 100%)',
        courseId: 'crs-001'
      },
      {
        id: 'rec-004',
        title: 'TypeScript Mastery & Enterprise Design Patterns',
        category: 'web',
        categoryName: 'Web Development',
        badge: '⚡ High Demand',
        badgeColor: 'var(--accent-cyan)',
        rating: '4.8',
        ratingCount: 220,
        learnersCount: 240,
        duration: '20 Hours',
        modulesCount: 6,
        level: 'Intermediate',
        instructor: 'Dr. James Wilson',
        description: 'Advanced generics, mapped types, conditional typing, decorator patterns, and building bulletproof scalable APIs.',
        accentColor: 'linear-gradient(135deg, #2563EB 0%, #818CF8 50%, #F472B6 100%)',
        courseId: 'crs-004'
      },
      {
        id: 'rec-005',
        title: 'Generative AI & LLM Application Engineering',
        category: 'ai',
        categoryName: 'AI & Machine Learning',
        badge: '🤖 New Release',
        badgeColor: 'var(--brand-indigo)',
        rating: '5.0',
        ratingCount: 618,
        learnersCount: 520,
        duration: '32 Hours',
        modulesCount: 9,
        level: 'Intermediate',
        instructor: 'Dr. Sarah Lin',
        description: 'Build enterprise LLM agents, RAG architectures, prompt pipelines, and embeddings with LangChain and vector databases.',
        accentColor: 'linear-gradient(135deg, #5447FF 0%, #3B82F6 100%)',
        courseId: 'crs-003'
      },
      {
        id: 'rec-006',
        title: 'Next.js 15 & Fullstack React Architecture',
        category: 'web',
        categoryName: 'Web Development',
        badge: '⚡ Fast Track',
        badgeColor: 'var(--primary)',
        rating: '4.9',
        ratingCount: 340,
        learnersCount: 310,
        duration: '24 Hours',
        modulesCount: 8,
        level: 'Intermediate to Advanced',
        instructor: 'Dr. James Wilson',
        description: 'Server Components, App Router, Server Actions, streaming SSR, and edge deployments with maximum performance.',
        accentColor: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)',
        courseId: 'crs-002'
      },
      {
        id: 'rec-007',
        title: 'AWS Cloud Solutions & Serverless Architecture',
        category: 'cloud',
        categoryName: 'Cloud & DevOps',
        badge: '⭐ Enterprise Choice',
        badgeColor: 'var(--warning)',
        rating: '4.8',
        ratingCount: 280,
        learnersCount: 290,
        duration: '34 Hours',
        modulesCount: 11,
        level: 'Intermediate',
        instructor: 'Prof. Elena Rostova',
        description: 'Design resilient distributed systems on AWS utilizing Lambda, DynamoDB, API Gateway, and CloudFront CDN caching.',
        accentColor: 'linear-gradient(135deg, #f59e0b 0%, #EC4899 100%)',
        courseId: 'crs-001'
      },
      {
        id: 'rec-008',
        title: 'Deep Learning with PyTorch & Computer Vision',
        category: 'data',
        categoryName: 'Data Science',
        badge: '🚀 Advanced Track',
        badgeColor: 'var(--accent-purple)',
        rating: '4.9',
        ratingCount: 195,
        learnersCount: 215,
        duration: '42 Hours',
        modulesCount: 12,
        level: 'Advanced',
        instructor: 'Dr. Marcus Bell',
        description: 'Convolutional neural networks, transfer learning, image segmentation, and real-time model inference pipelines.',
        accentColor: 'linear-gradient(135deg, #818CF8 0%, #DB2777 100%)',
        courseId: 'crs-003'
      }
    ];

    const filteredRecommendedCourses = recommendedCourses.filter(
      (c) => recommendedCategory === 'all' || c.category === recommendedCategory
    );

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
        {/* Welcome & Gamification Banner */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.22) 0%, rgba(84, 71, 255, 0.18) 50%, rgba(244, 114, 182, 0.15) 100%)',
          border: '1px solid rgba(129, 140, 248, 0.32)',
          borderRadius: 'var(--radius-xl)',
          padding: '24px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '20px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span className="badge badge-primary">Level 4 Scholar</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: '#f59e0b', fontWeight: 700 }}>
                <Flame size={16} fill="#f59e0b" /> {mockGamificationProfile.streak} Day Streak
              </span>
            </div>
            <h1 style={{ fontSize: '1.6rem', marginBottom: '6px' }}>
              Welcome back, {user?.firstName}!
            </h1>
            <p className="text-secondary text-sm">
              You are making great progress in your Engineering Track. Keep it up!
            </p>
          </div>

          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: '12px 18px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary)' }}>
                {mockGamificationProfile.totalPoints}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                Total Points
              </div>
            </div>

            <div
              onClick={() => window.dispatchEvent(new CustomEvent('open-student-leaderboard-popup'))}
              style={{
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.16) 0%, rgba(15, 23, 42, 0.85) 100%)',
                border: '1.5px solid rgba(255, 215, 0, 0.45)',
                borderRadius: 'var(--radius-lg)',
                padding: '12px 18px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 14px rgba(245, 158, 11, 0.25)',
              }}
              title="Click to view your Leaderboard Standing & Pop-Up"
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#ffd700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                <Trophy size={17} color="#ffd700" /> #4
              </div>
              <div style={{ fontSize: '0.7rem', color: '#f59e0b', textTransform: 'uppercase', fontWeight: 700 }}>
                Leaderboard Rank
              </div>
            </div>

            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: '12px 18px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--success)' }}>
                {mockGamificationProfile.badges.length}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                Badges Earned
              </div>
            </div>
          </div>
        </div>

        {/* Student Metric KPIs */}
        <div className="grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          <div className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="text-muted text-xs font-semibold">Enrolled Courses</span>
              <BookOpen size={16} color="var(--primary)" />
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)' }}>3</div>
            <p className="text-secondary text-xs" style={{ margin: 0 }}>2 In Progress &bull; 1 Completed</p>
          </div>

          <div className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="text-muted text-xs font-semibold">In-Progress Courses</span>
              <Clock size={16} color="var(--accent-cyan)" />
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>2</div>
            <p className="text-secondary text-xs" style={{ margin: 0 }}>Active curriculum tracks</p>
          </div>

          <div className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="text-muted text-xs font-semibold">Completed Courses</span>
              <Award size={16} color="var(--success)" />
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--success)' }}>1</div>
            <p className="text-success text-xs font-medium" style={{ margin: 0 }}>Certificate earned</p>
          </div>

          <div className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="text-muted text-xs font-semibold">Curriculum Progress</span>
              <Activity size={16} color="var(--accent-purple)" />
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--accent-purple)' }}>65.0%</div>
            <p className="text-secondary text-xs" style={{ margin: 0 }}>28 of 43 lessons completed</p>
          </div>
        </div>

        {/* Main 2-Column Section */}
        <div className="dashboard-main-grid">
          {/* Left Column: Active Course Hero + Learning History + Announcements */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Continue Learning Active Course Hero */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                  <span className="badge badge-active" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                    In Progress &bull; 65% Completed
                  </span>
                  <span className="text-muted text-xs" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={12} /> Estimated: 35 mins left
                  </span>
                </div>

                <h2 style={{ fontSize: '1.35rem', margin: '0 0 8px 0', lineHeight: 1.3 }}>{activeCourse.title}</h2>
                <p className="text-secondary text-sm" style={{ margin: '0 0 16px 0', lineHeight: 1.5 }}>
                  {activeCourse.description}
                </p>

                <div style={{ marginBottom: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '6px' }}>
                    <span className="text-secondary font-medium">Syllabus Progress</span>
                    <strong style={{ color: 'var(--text-main)' }}>8 of 12 Lessons Completed</strong>
                  </div>
                  <div className="progress-bar-bg" style={{ height: '8px', borderRadius: '4px' }}>
                    <div className="progress-bar-fill" style={{ width: '65%', borderRadius: '4px' }} />
                  </div>
                </div>

                <div style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '14px',
                  flexWrap: 'wrap'
                }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>
                      Up Next in Syllabus
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '0.925rem', color: 'var(--text-main)' }}>
                      Lesson 4: Functions & Arrow Functions (Interactive Lab)
                    </div>
                  </div>
                  <Link to="/course-player/crs-001" className="btn btn-primary" style={{ gap: '6px', flexShrink: 0, padding: '7px 16px', fontSize: '0.85rem' }}>
                    <Play size={14} /> Continue Learning &rarr;
                  </Link>
                </div>
              </div>

              <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <span className="text-muted text-xs">Lead Faculty: <strong>Dr. James Wilson</strong> &bull; Cohort: Spring 2026 Engineering</span>
                <Link to="/my-learning" style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  View All My Courses <ArrowRight size={14} />
                </Link>
              </div>
            </div>

            {/* In-Progress Secondary Course */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BookOpen size={16} color="var(--primary)" />
                  <h3 style={{ fontSize: '1rem', margin: 0 }}>Advanced React Patterns</h3>
                </div>
                <span className="badge badge-active">30% Complete</span>
              </div>
              <p className="text-secondary text-xs" style={{ marginBottom: '10px', lineHeight: 1.5 }}>
                Custom hook patterns, Zustand store architectures, and TanStack Query integration.
              </p>
              <div className="progress-bar-bg" style={{ height: '6px', marginBottom: '12px', borderRadius: '3px' }}>
                <div className="progress-bar-fill" style={{ width: '30%', borderRadius: '3px' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="text-muted text-xs">4 of 12 Lessons Completed</span>
                <Link to="/course-player/crs-002" className="btn btn-secondary btn-sm" style={{ fontSize: '0.78rem' }}>
                  Resume Course &rarr;
                </Link>
              </div>
            </div>

            {/* Campus & Course Announcements Feed */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Bell size={16} color="var(--primary)" />
                  <h3 style={{ fontSize: '1rem', margin: 0 }}>Recent Announcements & Notices</h3>
                </div>
                <Link to="/notifications" className="text-muted text-xs">View Hub</Link>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* Received Course Invitations for Student */}
                {notifications.filter(n => n.category === 'course' && !n.isRead).map(inv => (
                  <div
                    key={inv.id}
                    style={{
                      background: 'rgba(99, 102, 241, 0.12)',
                      border: '1px solid rgba(99, 102, 241, 0.35)',
                      padding: '14px',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="badge badge-primary" style={{ fontSize: '0.675rem' }}>Course Invitation</span>
                        <strong style={{ fontSize: '0.875rem' }}>{inv.title}</strong>
                      </div>
                      <span className="badge badge-active" style={{ fontSize: '0.65rem' }}>NEW INVITATION</span>
                    </div>
                    <p className="text-secondary text-xs" style={{ margin: 0, lineHeight: 1.4 }}>
                      {inv.message}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                      <span className="text-muted text-xs">
                        {new Date(inv.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {inv.link && (
                        <Link
                          to={inv.link}
                          onClick={() => markNotificationRead(inv.id)}
                          className="btn btn-primary btn-sm"
                          style={{ fontSize: '0.75rem', padding: '3px 10px' }}
                        >
                          View Course & Join &rarr;
                        </Link>
                      )}
                    </div>
                  </div>
                ))}

                <div style={{ background: 'var(--bg-input)', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <strong style={{ fontSize: '0.85rem' }}>Midterm Proctored Exam Window Announced</strong>
                    <span className="badge badge-error" style={{ fontSize: '0.65rem' }}>URGENT</span>
                  </div>
                  <p className="text-secondary text-xs" style={{ margin: 0, lineHeight: 1.4 }}>
                    Official schedule published for Spring 2026 Engineering. Ensure system checks are complete 48h prior.
                  </p>
                </div>

                <div style={{ background: 'var(--bg-input)', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <strong style={{ fontSize: '0.85rem' }}>Cloud Lab Maintenance Window</strong>
                    <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>IMPORTANT</span>
                  </div>
                  <p className="text-secondary text-xs" style={{ margin: 0, lineHeight: 1.4 }}>
                    Docker runner sandbox nodes undergo maintenance this Saturday 01:00 AM - 05:00 AM.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Next Live Class + Pending Assignments + Published Results */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Live Class */}
            {nextSession && (
              <div className="card" style={{ borderLeft: '4px solid var(--accent-cyan)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Video size={16} color="var(--accent-cyan)" />
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-cyan)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Upcoming Live Class
                    </span>
                  </div>
                  <MeetingProviderBadge provider={nextSession.provider || 'Google Meet'} size="sm" />
                </div>
                <h3 style={{ fontSize: '1rem', margin: '0 0 6px 0', lineHeight: 1.35 }}>{nextSession.title}</h3>
                <p className="text-secondary text-xs" style={{ margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={13} className="text-muted" />
                  <span>{formatLiveSessionTime(nextSession)}</span>
                  <span className="text-muted">&bull;</span>
                  <span>Faculty: <strong>Dr. James Wilson</strong></span>
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span className="badge badge-secondary" style={{ fontSize: '0.7rem' }}>Cohort: ENG-Q4-26</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Link to="/my-sessions" className="btn btn-secondary btn-sm" style={{ fontSize: '0.78rem' }}>
                      Timetable
                    </Link>
                    <GoogleMeetJoinButton meetingUrl={nextSession.meetingUrl} size="sm" />
                  </div>
                </div>
              </div>
            )}

            {/* Pending Assignments */}
            <div className="card" style={{ borderLeft: '4px solid var(--warning)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ClipboardCheck size={16} color="var(--warning)" />
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--warning)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Pending Assignment
                  </span>
                </div>
                <span className="badge badge-warning" style={{ fontSize: '0.65rem', fontWeight: 700 }}>DUE IN 14 DAYS</span>
              </div>
              <h3 style={{ fontSize: '0.95rem', margin: '0 0 10px 0', lineHeight: 1.35 }}>
                Advanced React State Management & Custom Hooks Implementation
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px', fontSize: '0.75rem' }}>
                <span className="badge badge-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Award size={12} /> 100 Points
                </span>
                <span className="badge badge-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={12} /> Due Oct 31, 2026
                </span>
                <span className="badge badge-secondary">GitHub Repo</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="text-muted text-xs">Status: <strong>Not Submitted</strong></span>
                <Link to="/assignments" className="btn btn-primary btn-sm" style={{ fontSize: '0.78rem' }}>
                  Submit Deliverable &rarr;
                </Link>
              </div>
            </div>

            {/* Upcoming Assessment */}
            {dueAssessment && (
              <div className="card" style={{ borderLeft: '4px solid var(--primary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <HelpCircle size={16} color="var(--primary)" />
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Scheduled Assessment
                    </span>
                  </div>
                  <span className="badge badge-primary" style={{ fontSize: '0.65rem', fontWeight: 700 }}>QUIZ</span>
                </div>
                <h3 style={{ fontSize: '0.95rem', margin: '0 0 10px 0', lineHeight: 1.35 }}>{dueAssessment.title}</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px', fontSize: '0.75rem' }}>
                  <span className="badge badge-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={12} /> {dueAssessment.durationMinutes || dueAssessment.duration || 45} Mins
                  </span>
                  <span className="badge badge-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Award size={12} /> {dueAssessment.totalMarks} Points
                  </span>
                  <span className="badge badge-secondary">Pass: {dueAssessment.passingMarks || 70}%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="text-muted text-xs">Attempts Left: <strong>2</strong></span>
                  <Link to="/my-assessments" className="btn btn-secondary btn-sm" style={{ fontSize: '0.78rem' }}>
                    View Instructions
                  </Link>
                </div>
              </div>
            )}

            {/* Recently Published Results */}
            <div className="card" style={{ borderLeft: '4px solid var(--success)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <Award size={16} color="var(--success)" />
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--success)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Recently Published Result
                </span>
                <span className="badge badge-success" style={{ marginLeft: 'auto', fontSize: '0.65rem', fontWeight: 700 }}>PASSED</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
                <h4 style={{ fontSize: '0.95rem', margin: 0 }}>JavaScript Fundamentals Quiz</h4>
                <strong style={{ fontSize: '1.15rem', color: 'var(--success)', fontWeight: 800 }}>25 / 25 (100%)</strong>
              </div>
              <p className="text-secondary text-xs" style={{ margin: '0 0 12px 0', lineHeight: 1.4 }}>
                Feedback: "Excellent work! Perfect score across all sections."
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="text-muted text-xs">Completed Oct 16, 2026</span>
                <Link to="/my-results" className="btn btn-secondary btn-sm" style={{ fontSize: '0.78rem' }}>
                  View Full Breakdown
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Recommended & Most Popular Courses Section - Horizontal Slide Carousel */}
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '14px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span className="badge badge-primary" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Sparkles size={12} /> Recommended For You
                </span>
                <span className="badge badge-warning" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Flame size={12} /> Popular Courses
                </span>
                <span className="text-muted text-xs" style={{ fontWeight: 600 }}>
                  ({filteredRecommendedCourses.length} Courses)
                </span>
              </div>
              <h3 style={{ fontSize: '1.25rem', margin: 0 }}>Recommended & Most Popular Courses</h3>
              <p className="text-secondary text-xs" style={{ margin: '4px 0 0 0' }}>
                Explore top-rated courses and trending specializations curated for your learning path
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {/* Category Filter Pills */}
              <div style={{ display: 'flex', gap: '6px', background: 'var(--bg-input)', padding: '4px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', flexWrap: 'wrap' }}>
                {([
                  { id: 'all', label: 'All Tracks' },
                  { id: 'web', label: 'Web Dev' },
                  { id: 'data', label: 'Data Science' },
                  { id: 'cloud', label: 'Cloud & DevOps' },
                  { id: 'ai', label: 'AI & ML' },
                ] as const).map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setRecommendedCategory(cat.id);
                      sliderRef.current?.scrollTo({ left: 0, behavior: 'smooth' });
                    }}
                    className="btn btn-sm"
                    style={{
                      background: recommendedCategory === cat.id ? 'var(--primary)' : 'transparent',
                      color: recommendedCategory === cat.id ? '#fff' : 'var(--text-secondary)',
                      padding: '4px 10px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      borderRadius: 'var(--radius-sm)',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'var(--transition)'
                    }}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Horizontal Slider Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  className="slider-nav-btn"
                  onClick={() => handleSliderScroll('left')}
                  disabled={!canScrollLeft}
                  title="Slide left"
                  aria-label="Previous courses"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  className="slider-nav-btn"
                  onClick={() => handleSliderScroll('right')}
                  disabled={!canScrollRight}
                  title="Slide right"
                  aria-label="Next courses"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              <Link to="/courses" className="btn btn-secondary btn-sm" style={{ gap: '6px' }}>
                Explore Catalog <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          {enrolledNotice && (
            <div style={{
              background: 'var(--success-bg)',
              border: '1px solid var(--success-border)',
              color: 'var(--success)',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              marginBottom: '16px',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <CheckCircle2 size={16} />
              <span>{enrolledNotice}</span>
            </div>
          )}

          {/* Horizontal Slide Carousel Track */}
          <div ref={sliderRef} className="horizontal-course-slider">
            {filteredRecommendedCourses.map((course) => (
              <div
                key={course.id}
                className="course-carousel-card"
              >
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  background: course.accentColor
                }} />

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span className="badge" style={{
                      background: `${course.badgeColor}20`,
                      color: course.badgeColor,
                      border: `1px solid ${course.badgeColor}40`,
                      fontSize: '0.68rem',
                      fontWeight: 700
                    }}>
                      {course.badge}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.78rem', fontWeight: 700, color: '#f59e0b' }}>
                      <Star size={13} fill="#f59e0b" color="#f59e0b" />
                      <span>{course.rating}</span>
                      <span className="text-muted text-xs" style={{ fontWeight: 400 }}>({course.ratingCount})</span>
                    </div>
                  </div>

                  <h4 style={{ fontSize: '1.02rem', margin: '0 0 8px 0', lineHeight: 1.35, minHeight: '2.7rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {course.title}
                  </h4>
                  <p className="text-secondary text-xs" style={{ margin: '0 0 14px 0', lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: '2.4rem' }}>
                    {course.description}
                  </p>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Users size={12} color="var(--primary)" /> {course.learnersCount} enrolled
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} /> {course.duration}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <BookOpen size={12} /> {course.modulesCount} modules
                    </span>
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)', marginBottom: '12px', fontSize: '0.75rem' }}>
                    <span className="text-muted text-xs">Instructor: <strong style={{ color: 'var(--text-main)' }}>{course.instructor}</strong></span>
                    <span className="badge badge-secondary" style={{ fontSize: '0.68rem' }}>{course.level}</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <Link
                      to={`/course-player/${course.courseId}`}
                      className="btn btn-secondary btn-sm"
                      style={{ textAlign: 'center', justifyContent: 'center', fontSize: '0.75rem' }}
                    >
                      Syllabus
                    </Link>
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ textAlign: 'center', justifyContent: 'center', fontSize: '0.75rem' }}
                      onClick={() => {
                        enrollCourse(course.courseId);
                        setEnrolledNotice(`Successfully enrolled in "${course.title}"! Added to My Learning.`);
                        setTimeout(() => setEnrolledNotice(null), 5000);
                      }}
                    >
                      Quick Enroll
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Carousel Slide Helper Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)', fontSize: '0.75rem', color: 'var(--text-muted)', flexWrap: 'wrap', gap: '8px' }}>
            <span>Horizontal slider &bull; Slide with arrows, touch swipe, or shift+wheel</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => handleSliderScroll('left')}
                disabled={!canScrollLeft}
                style={{ fontSize: '0.75rem', color: canScrollLeft ? 'var(--primary)' : 'var(--text-muted)', cursor: canScrollLeft ? 'pointer' : 'default', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}
              >
                &larr; Previous
              </button>
              <span>|</span>
              <button
                type="button"
                onClick={() => handleSliderScroll('right')}
                disabled={!canScrollRight}
                style={{ fontSize: '0.75rem', color: canScrollRight ? 'var(--primary)' : 'var(--text-muted)', cursor: canScrollRight ? 'pointer' : 'default', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}
              >
                Next &rarr;
              </button>
            </div>
          </div>
        </div>

        {/* Recent Achievements & Badges */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Recent Achievements & Badges</h3>
            <span className="text-muted text-xs">Badges & Milestones</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '20px' }}>
            {mockGamificationProfile.badges.map((b) => (
              <div
                key={b.id}
                style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}
              >
                <span style={{ fontSize: '1.8rem' }}>{b.icon}</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{b.name}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{b.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 2. TRAINER / FACULTY DASHBOARD VIEW
  // -------------------------------------------------------------
  if (role === 'trainer') {
    return <TrainerDashboardPage />;
  }


  // -------------------------------------------------------------
  // 3. PLATFORM ADMINISTRATOR COMMAND CENTER
  // -------------------------------------------------------------
  if (role === 'platform_admin') {
    return <PlatformDashboardPage />;
  }

  // -------------------------------------------------------------
  // 4. REGULAR ADMIN / INSTITUTION ADMIN COMMAND CENTER
  // -------------------------------------------------------------
  return <InstitutionDashboardPage />;
};
