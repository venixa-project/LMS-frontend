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
import { StudentDashboard } from './StudentDashboard';

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
    return <StudentDashboard />;
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
