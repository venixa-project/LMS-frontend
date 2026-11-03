import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, Award, BookOpen, Calendar, Clock, Flame, RefreshCw, Trophy, Video,
  UsersRound, UserCheck, Play, ArrowRight, ShieldCheck, Sparkles, Star, ChevronLeft,
  ChevronRight, CheckCircle2, Check, Zap, Layers, HelpCircle
} from 'lucide-react';
import { GoogleMeetJoinButton, MeetingProviderBadge } from '../../components/GoogleMeet';
import { apiClient, ApiError, hasBackendAccessToken } from '../../lib/apiClient';
import { useAuthStore } from '../../lib/store';
import { useCourseStore } from '../../lib/courseStore';
import { useCohortStore } from '../../lib/cohortStore';
import { usePeopleStore } from '../../lib/peopleStore';
import {
  mockAssessments,
  mockAttempts,
  mockCertificates,
  mockCourses,
  mockEnrollments,
  mockGamificationProfile,
  mockLiveSessions,
} from '../../data/mockData';
import { mockUsers } from '../../data/mockUsers';
import type { Course, Enrollment, Cohort } from '../../types';

interface StudentDashboardData {
  stats: {
    enrolledCourses: number;
    inProgressCourses: number;
    completedCourses: number;
    completedCertificates: number;
    totalLessons: number;
    completedLessons: number;
    curriculumProgressPercentage: number;
    unreadNotifications: number;
  };
  courses: Array<{
    id: string;
    title: string;
    description: string | null;
    status: string;
    progressPercentage: number;
    completedLessons: number;
    totalLessons: number;
    nextLesson: { id: string; title: string; type?: string; durationMinutes?: number } | null;
  }>;
  cohorts?: Array<{
    id: string;
    name: string;
    code: string;
    department?: string;
    startDate?: string;
    endDate?: string;
    capacity?: number;
    learnerCount?: number;
    status?: string;
    role?: string;
    courseId?: string | null;
    courseTitle?: string | null;
    trainers?: string[];
    leadTrainer?: string;
  }>;
  academicClass?: {
    id: string;
    name: string;
    code: string;
    academicYear?: string;
    department?: string;
    status?: string;
  } | null;
  section?: {
    id: string;
    name: string;
    code: string;
    roomNumber?: string | null;
    facultyName: string;
    facultyEmail?: string | null;
  } | null;
  upcomingActivities?: Array<{
    id: string;
    title: string;
    type: 'live_session' | 'quiz' | 'exam' | 'assignment' | 'deadline';
    courseName: string;
    courseId?: string | null;
    date: string;
    startTime?: string | null;
    endTime?: string | null;
    durationMinutes?: number;
    totalMarks?: number;
    passingPercentage?: number;
    attemptsRemaining?: number;
    status: string;
    actionLabel: string;
    actionUrl: string;
  }>;
  continueLearning?: {
    courseId: string;
    courseTitle: string;
    courseThumbnail?: string | null;
    category?: string;
    progressPercentage: number;
    completedLessons: number;
    totalLessons: number;
    nextLesson: { id: string; title: string; type?: string; durationMinutes?: number } | null;
    actionUrl: string;
  } | null;
  assessments: Array<{
    id: string;
    title: string;
    course: { id: string; title: string } | null;
    durationMinutes: number;
    totalMarks: number;
    passingPercentage: number;
    attemptsRemaining: number;
  }>;
  sessions: Array<{
    id: string;
    title: string;
    course: { id: string; title: string } | null;
    date: string;
    startTime: string;
    endTime: string | null;
    provider: string;
    meetingUrl: string | null;
    status: string;
  }>;
  notifications: Array<{
    id: string;
    title: string;
    message: string;
    category: string;
    linkUrl: string | null;
    isRead: boolean;
    createdAt: string;
  }>;
  gamification: {
    totalPoints: number;
    rank: string;
    streakDays: number;
    badges: unknown[];
    leaderboardRank: number | null;
  };
}

const RECOMMENDED_COURSES = [
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
    description: 'Convolutional neural networks, vision transformers, transfer learning, and deploying computer vision models with TorchScript.',
    accentColor: 'linear-gradient(135deg, #5447FF 0%, #2563EB 100%)',
    courseId: 'crs-003'
  }
];

function formatSessionDate(value: string, startTime: string) {
  const date = new Date(`${value.slice(0, 10)}T${startTime}:00`);
  if (Number.isNaN(date.getTime())) return `${value} ${startTime}`;
  return date.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getDemoDashboardData(
  userId: string,
  userEmail: string | undefined,
  courses: Course[],
  enrollments: Enrollment[],
  studentCohorts: Cohort[]
): StudentDashboardData {
  const isDemo = userId === 'u-001' || userEmail === 'student@lms.demo';
  const cohortCourseIds = new Set(studentCohorts.map((c) => c.courseId).filter(Boolean) as string[]);

  const studentEnrollments = (enrollments.length ? enrollments : mockEnrollments)
    .filter((enrollment) => (enrollment.userId === userId || (isDemo && enrollment.userId === 'u-001')) && enrollment.courseId);

  const coursesById = new Map(courses.map((course) => [course.id, course]));
  mockCourses.forEach((c) => {
    if (!coursesById.has(c.id)) coursesById.set(c.id, c);
  });

  const enrolledCourseIdSet = new Set<string>([
    ...studentEnrollments.map((e) => e.courseId!),
    ...cohortCourseIds,
    ...(isDemo ? ['crs-001', 'crs-002', 'crs-004'] : [])
  ]);

  const enrolledCourses = Array.from(enrolledCourseIdSet).flatMap((cId) => {
    const course = coursesById.get(cId);
    if (!course) return [];
    const directEnrollment = studentEnrollments.find((e) => e.courseId === cId);
    const progress = directEnrollment ? directEnrollment.progress : 20;
    const lessons = course.modules?.flatMap((module) => module.lessons) || [];
    const completedLessons = Math.round((lessons.length || 10) * progress / 100);
    const nextLesson = lessons[completedLessons] || lessons[0];
    return [{
      id: course.id,
      title: course.title,
      description: course.shortDescription || course.description,
      status: (directEnrollment?.status === 'completed') ? 'completed' : 'in_progress',
      progressPercentage: progress,
      completedLessons,
      totalLessons: lessons.length || 10,
      nextLesson: nextLesson ? { id: nextLesson.id, title: nextLesson.title } : null,
    }];
  });

  const courseIds = new Set(enrolledCourses.map((course) => course.id));
  const assessments = mockAssessments.filter((assessment) =>
    assessment.status === 'published' && assessment.courseId && courseIds.has(assessment.courseId)
  ).map((assessment) => {
    const course = coursesById.get(assessment.courseId!);
    const attemptsUsed = mockAttempts.filter((attempt) =>
      attempt.learnerId === userId && attempt.assessmentId === assessment.id
    ).length;
    return {
      id: assessment.id,
      title: assessment.title,
      course: course ? { id: course.id, title: course.title } : null,
      durationMinutes: assessment.durationMinutes || assessment.duration || 0,
      totalMarks: assessment.totalMarks,
      passingPercentage: assessment.passmark || 0,
      attemptsRemaining: Math.max(0, (assessment.maxAttempts || assessment.attempts || 1) - attemptsUsed),
    };
  });

  const upcomingSessions = mockLiveSessions.flatMap((session) => {
    if (
      !session.courseId ||
      !session.date ||
      !courseIds.has(session.courseId) ||
      (session.status !== 'scheduled' && session.status !== 'live') ||
      session.date < new Date().toISOString().slice(0, 10)
    ) return [];
    const course = coursesById.get(session.courseId);
    return [{
      id: session.id,
      title: session.title,
      course: course ? { id: course.id, title: course.title } : null,
      date: session.date,
      startTime: session.startTime,
      endTime: session.endTime || null,
      provider: session.provider,
      meetingUrl: session.meetingUrl || session.joinLink || null,
      status: session.status,
    }];
  });

  const completedCourses = enrolledCourses.filter((course) => course.status === 'completed').length;
  const totalLessons = enrolledCourses.reduce((total, course) => total + course.totalLessons, 0);
  const completedLessons = enrolledCourses.reduce((total, course) => total + course.completedLessons, 0);
  const certificates = mockCertificates.filter((certificate) =>
    certificate.learnerId === userId && certificate.status === 'active'
  );
  const gamification = mockGamificationProfile.userId === userId ? mockGamificationProfile : null;

  return {
    stats: {
      enrolledCourses: enrolledCourses.length,
      inProgressCourses: enrolledCourses.filter((course) => course.status !== 'completed').length,
      completedCourses,
      completedCertificates: certificates.length,
      totalLessons,
      completedLessons,
      curriculumProgressPercentage: totalLessons ? Math.round(completedLessons / totalLessons * 100) : 0,
      unreadNotifications: 0,
    },
    courses: enrolledCourses,
    assessments,
    sessions: upcomingSessions,
    notifications: [],
    gamification: {
      totalPoints: gamification?.totalPoints ?? 0,
      rank: gamification ? 'Gold Scholar' : 'Novice',
      streakDays: gamification?.streak ?? 0,
      badges: gamification?.badges ?? [],
      leaderboardRank: null,
    },
  };
}

export const StudentDashboard: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const courses = useCourseStore((state) => state.courses);
  const enrollments = useCourseStore((state) => state.enrollments);
  const { enrollCourse } = useCourseStore();
  const { cohorts, fetchCohorts } = useCohortStore();
  const { users: peopleUsers, fetchPeople } = usePeopleStore();

  const [isDemoPreview, setIsDemoPreview] = useState(false);
  const [data, setData] = useState<StudentDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Recommended courses horizontal slider state
  const [recommendedCategory, setRecommendedCategory] = useState<'all' | 'web' | 'data' | 'cloud' | 'ai'>('all');
  const [enrolledNotice, setEnrolledNotice] = useState<string | null>(null);
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
    const scrollAmount = 338;
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
  }, [recommendedCategory, data]);

  const filteredRecommendedCourses = useMemo(() => {
    if (recommendedCategory === 'all') return RECOMMENDED_COURSES;
    return RECOMMENDED_COURSES.filter((course) => course.category === recommendedCategory);
  }, [recommendedCategory]);

  useEffect(() => {
    fetchCohorts();
    fetchPeople();
  }, [fetchCohorts, fetchPeople]);

  // Derive cohorts this student is enrolled in
  const studentCohorts = useMemo(() => {
    if (!user) return [];
    const uid = user.id;
    const uemail = user.email?.toLowerCase();
    const uroll = user.rollNo?.toLowerCase();
    const uname = user.displayName?.toLowerCase();

    return cohorts.filter((c) => {
      const studentList = c.studentIds || [];
      const inStudentList = studentList.some((sid) => {
        const sLower = sid.toLowerCase();
        return (
          sid === uid ||
          (uemail && sLower === uemail) ||
          (uroll && sLower === uroll) ||
          (uname && sLower === uname)
        );
      });
      const isDemoMatch = (uid === 'u-001' || uemail === 'student@lms.demo') && (c.id === 'coh-001' || studentList.includes('u-001'));
      return inStudentList || isDemoMatch;
    });
  }, [cohorts, user]);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    if (!hasBackendAccessToken()) {
      if (!user) {
        setData(null);
        setError('Sign in to view your student dashboard.');
        setIsLoading(false);
        return;
      }
      setData(getDemoDashboardData(user.id, user.email, courses, enrollments, studentCohorts));
      setIsDemoPreview(true);
      setIsLoading(false);
      return;
    }

    setIsDemoPreview(false);
    try {
      const response = await apiClient.get<StudentDashboardData>('/student/dashboard');
      const backendData = response.data;
      if (!backendData.courses || backendData.courses.length === 0) {
        const fallback = getDemoDashboardData(user?.id || '', user?.email, courses, enrollments, studentCohorts);
        backendData.courses = fallback.courses;
        backendData.stats = {
          ...backendData.stats,
          enrolledCourses: fallback.stats.enrolledCourses,
          inProgressCourses: fallback.stats.inProgressCourses,
          curriculumProgressPercentage: fallback.stats.curriculumProgressPercentage,
        };
      }
      setData(backendData);
    } catch (loadError) {
      if (user) {
        setData(getDemoDashboardData(user.id, user.email, courses, enrollments, studentCohorts));
      } else {
        setError(loadError instanceof ApiError && loadError.statusCode < 500
          ? loadError.message
          : 'Unable to load your dashboard. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [courses, enrollments, studentCohorts, user]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const displayCohorts = useMemo(() => {
    if (data?.cohorts && data.cohorts.length > 0) {
      return data.cohorts;
    }
    return studentCohorts;
  }, [data?.cohorts, studentCohorts]);

  if (isLoading) {
    return (
      <div role="status" aria-live="polite" style={{ display: 'grid', placeItems: 'center', minHeight: '50vh' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <div className="pulse-indicator" style={{ width: 14, height: 14, margin: '0 auto 12px' }} />
          Loading your learning dashboard...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="card" role="alert" style={{ maxWidth: 680, margin: '48px auto', textAlign: 'center' }}>
        <h2>Dashboard unavailable</h2>
        <p className="text-secondary">{error || 'Your dashboard data could not be loaded.'}</p>
        <button type="button" className="btn btn-primary" onClick={() => void loadDashboard()}>
          <RefreshCw size={15} /> Try again
        </button>
      </div>
    );
  }

  const firstName = user?.firstName || user?.displayName?.split(' ')[0] || 'Student';

  const displayContinueLearning = data?.continueLearning || null;
  const activeCourse = displayContinueLearning
    ? {
      id: displayContinueLearning.courseId,
      title: displayContinueLearning.courseTitle,
      description: null,
      status: 'in_progress',
      progressPercentage: displayContinueLearning.progressPercentage,
      completedLessons: displayContinueLearning.completedLessons,
      totalLessons: displayContinueLearning.totalLessons,
      nextLesson: displayContinueLearning.nextLesson,
      actionUrl: displayContinueLearning.actionUrl,
    }
    : (data.courses.find((course) => course.status !== 'completed') || data.courses[0]);

  const nextSession = data.sessions[0];
  const nextAssessment = data.assessments.find((assessment) => assessment.attemptsRemaining > 0);
  const upcomingActivities = data.upcomingActivities || [];

  const metricCards = [
    { label: 'Enrolled Courses', value: data.stats.enrolledCourses, detail: `${data.stats.inProgressCourses} in progress`, icon: BookOpen, color: 'var(--primary)' },
    { label: 'In-Progress Courses', value: data.stats.inProgressCourses, detail: 'Active curriculum tracks', icon: Clock, color: 'var(--accent-cyan)' },
    { label: 'Completed Courses', value: data.stats.completedCourses, detail: `${data.stats.completedCertificates} certificates earned`, icon: Award, color: 'var(--success)' },
    { label: 'Curriculum Progress', value: `${data.stats.curriculumProgressPercentage}%`, detail: `${data.stats.completedLessons} of ${data.stats.totalLessons} lessons completed`, icon: Activity, color: 'var(--accent-purple)' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* 1. Header Welcome Banner */}
      <section
        className="card"
        aria-labelledby="student-dashboard-title"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 20,
          background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.22), rgba(84, 71, 255, 0.18), rgba(244, 114, 182, 0.15))',
          borderColor: 'rgba(129, 140, 248, 0.32)',
          padding: '22px 24px'
        }}
      >
        <div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
            <span className="badge badge-primary">{data.gamification.rank}</span>
            {isDemoPreview && <span className="badge badge-warning">Demo Preview</span>}
            <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center', color: '#f59e0b', fontWeight: 700, fontSize: '0.8rem' }}>
              <Flame size={15} /> {data.gamification.streakDays} Day Streak
            </span>
          </div>
          <h1 id="student-dashboard-title" style={{ margin: '0 0 4px', fontSize: '1.65rem', fontWeight: 800 }}>
            Welcome back, {firstName}!
          </h1>
          <p className="text-secondary text-sm" style={{ margin: 0 }}>
            Overview of your active cohort batches, coursework, and milestones.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link to="/leaderboard" className="card" style={{ minWidth: 110, padding: '10px 16px', textAlign: 'center', textDecoration: 'none' }}>
            <strong style={{ display: 'block', fontSize: '1.25rem', color: '#ffd700' }}>
              <Trophy size={15} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              {data.gamification.leaderboardRank ? `#${data.gamification.leaderboardRank}` : '—'}
            </strong>
            <span className="text-muted text-xs">Leaderboard Rank</span>
          </Link>
          <div className="card" style={{ minWidth: 110, padding: '10px 16px', textAlign: 'center' }}>
            <strong style={{ display: 'block', fontSize: '1.25rem', color: 'var(--primary)' }}>
              {data.gamification.totalPoints}
            </strong>
            <span className="text-muted text-xs">Total Points</span>
          </div>
          <div className="card" style={{ minWidth: 110, padding: '10px 16px', textAlign: 'center' }}>
            <strong style={{ display: 'block', fontSize: '1.25rem', color: 'var(--success)' }}>
              {data.gamification.badges.length}
            </strong>
            <span className="text-muted text-xs">Badges Earned</span>
          </div>
        </div>
      </section>

      {/* 2. Key Metrics Row */}
      <section aria-label="Learning statistics" className="grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        {metricCards.map(({ label, value, detail, icon: Icon, color }) => (
          <article className="stat-card" key={label} style={{ minHeight: '94px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="text-muted text-xs font-semibold">{label}</span>
              <Icon size={16} color={color} />
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color }}>{value}</div>
            <p className="text-secondary text-xs" style={{ margin: 0 }}>{detail}</p>
          </article>
        ))}
      </section>

      {/* 3. Balanced 2x2 Main Grid (All cards identical height & symmetric) */}
      <div className="student-dashboard-grid">
        {/* ROW 1 - LEFT: My Enrolled Cohorts & Classes */}
        <article className="card" style={{ borderLeft: '4px solid var(--primary)', padding: '22px' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <UsersRound size={18} color="var(--primary)" />
                <h2 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 700 }}>My Enrolled Cohorts & Classes</h2>
              </div>
              <span className="badge badge-primary" style={{ fontSize: '0.72rem' }}>
                {displayCohorts.length} Active {displayCohorts.length === 1 ? 'Batch' : 'Batches'}
              </span>
            </div>

            {data?.academicClass && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, padding: '8px 12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', fontSize: '0.78rem' }}>
                <strong style={{ color: 'var(--primary)' }}>{data.academicClass.name}</strong>
                {data.section && <span className="text-secondary">&bull; Section {data.section.name}</span>}
                {data.section?.facultyName && <span className="text-muted">&bull; Lead: {data.section.facultyName}</span>}
              </div>
            )}

            {displayCohorts.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {displayCohorts.slice(0, 2).map((co: any) => {
                  const courseTitle = co.courseTitle || co.course?.title || courses.find((c) => c.id === co.courseId)?.title || mockCourses.find((c) => c.id === co.courseId)?.title;
                  const trainerName = co.leadTrainer || (co.trainers && co.trainers[0]) || (co.instructors?.[0] ? (peopleUsers?.find((u) => u.id === co.instructors[0])?.displayName || mockUsers.find((u) => u.id === co.instructors[0])?.displayName) : 'Assigned Faculty');

                  return (
                    <div
                      key={co.id}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                          <span className="badge badge-primary" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>
                            {co.code}
                          </span>
                          <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {co.name}
                          </strong>
                        </div>
                        <span className="badge badge-active" style={{ fontSize: '0.62rem' }}>Enrolled</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {courseTitle && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <BookOpen size={12} color="var(--primary)" /> {courseTitle}
                          </span>
                        )}
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <UserCheck size={12} color="var(--success)" /> Faculty: {trainerName}
                        </span>
                        {co.startDate && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <Calendar size={12} />
                            {new Date(co.startDate).toLocaleDateString([], { month: 'short', year: 'numeric' })}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: '24px 16px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-subtle)', textAlign: 'center', margin: 'auto 0' }}>
                <UsersRound size={26} color="var(--text-muted)" style={{ margin: '0 auto 8px', opacity: 0.6 }} />
                <p style={{ margin: '0 0 4px', fontSize: '0.875rem', fontWeight: 600 }}>No active cohort batches assigned</p>
                <p className="text-secondary text-xs" style={{ margin: 0 }}>
                  Once your institution allocates you to an academic batch, your schedule and assigned faculty will appear here.
                </p>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 10, borderTop: '1px solid var(--border-subtle)' }}>
            <span className="text-muted text-xs">Assigned cohorts sync automatically</span>
            {displayCohorts.length > 0 && displayCohorts[0].courseId ? (
              <Link
                to={`/course-player/${displayCohorts[0].courseId}`}
                className="btn btn-primary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.78rem' }}
              >
                <Play size={12} /> Open Batch Course
              </Link>
            ) : null}
          </div>
        </article>

        {/* ROW 1 - RIGHT: Upcoming Assessment & Live Schedule */}
        <article className="card" style={{ borderLeft: '4px solid var(--accent-cyan)', padding: '22px' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Clock size={18} color="var(--accent-cyan)" />
                <h2 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 700 }}>Upcoming Schedule & Tasks</h2>
              </div>
              <span className="badge badge-secondary" style={{ fontSize: '0.72rem' }}>
                {upcomingActivities.length > 0 || nextAssessment || nextSession ? 'Action Required' : 'All Caught Up'}
              </span>
            </div>

            {upcomingActivities.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {upcomingActivities.slice(0, 2).map((act) => {
                  const isLive = act.type === 'live_session';
                  const isExam = act.type === 'exam';
                  const isQuiz = act.type === 'quiz';
                  const badgeColor = isLive ? 'var(--accent-cyan)' : isExam ? 'var(--warning)' : isQuiz ? 'var(--accent-purple)' : 'var(--primary)';
                  const badgeLabel = isLive ? 'Live Class' : isExam ? 'Timed Exam' : isQuiz ? 'Quiz' : 'Assignment';

                  return (
                    <div
                      key={act.id}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                        <span className="badge" style={{ fontSize: '0.65rem', fontWeight: 700, color: badgeColor, border: `1px solid ${badgeColor}` }}>
                          {badgeLabel}
                        </span>
                        <span className="text-muted text-xs">
                          {act.startTime ? `${act.date} • ${act.startTime}` : act.date}
                        </span>
                      </div>
                      <h3 style={{ fontSize: '0.92rem', margin: 0, fontWeight: 700, lineHeight: 1.35 }}>
                        {act.title}
                      </h3>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        <span>{act.courseName}</span>
                        <Link
                          to={act.actionUrl}
                          className="btn btn-primary btn-sm"
                          style={{ padding: '2px 8px', fontSize: '0.72rem' }}
                        >
                          {act.actionLabel}
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : nextAssessment ? (
              <div style={{ padding: '12px 14px', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', marginBottom: nextSession ? 10 : 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span className="badge badge-warning" style={{ fontSize: '0.65rem', fontWeight: 700 }}>
                    EXAM &bull; {nextAssessment.attemptsRemaining} ATTEMPT LEFT
                  </span>
                  <span className="text-muted text-xs">{nextAssessment.durationMinutes} mins</span>
                </div>
                <h3 style={{ fontSize: '0.95rem', margin: '0 0 6px 0', lineHeight: 1.35 }}>
                  {nextAssessment.title}
                </h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  <span>{nextAssessment.course?.title || 'Core Assessment'}</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Pass: {nextAssessment.passingPercentage}%</span>
                </div>
              </div>
            ) : nextSession ? (
              <div style={{ padding: '12px 14px', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Video size={13} color="var(--accent-cyan)" />
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>Live Class</span>
                  </div>
                  <MeetingProviderBadge provider={nextSession.provider} size="sm" />
                </div>
                <h3 style={{ fontSize: '0.92rem', margin: '0 0 4px 0' }}>{nextSession.title}</h3>
                <p className="text-muted text-xs" style={{ margin: 0 }}>
                  <Calendar size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                  {formatSessionDate(nextSession.date, nextSession.startTime)}
                </p>
              </div>
            ) : (
              <div style={{ padding: '24px 16px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-subtle)', textAlign: 'center', margin: 'auto 0' }}>
                <CheckCircle2 size={26} color="var(--success)" style={{ margin: '0 auto 8px', opacity: 0.8 }} />
                <p style={{ margin: '0 0 4px', fontSize: '0.875rem', fontWeight: 600 }}>All assessments & classes up to date</p>
                <p className="text-secondary text-xs" style={{ margin: 0 }}>
                  No pending exams or scheduled live sessions at this time.
                </p>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 10, borderTop: '1px solid var(--border-subtle)' }}>
            <Link to="/weekly-timetable" className="text-secondary text-xs font-medium" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              My Timetable <ArrowRight size={12} />
            </Link>
            <Link to="/my-assessments" className="btn btn-secondary btn-sm" style={{ fontSize: '0.78rem' }}>
              View Assessments
            </Link>
          </div>
        </article>

        {/* ROW 2 - LEFT: Continue Learning (Active Syllabus Track) */}
        <article className="card" style={{ padding: '22px' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Play size={18} color="var(--primary)" />
                <h2 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 700 }}>Continue Learning</h2>
              </div>
              <span className="badge badge-active" style={{ fontSize: '0.72rem' }}>In Progress</span>
            </div>

            {activeCourse ? (
              <>
                <h3 style={{ margin: '0 0 6px', fontSize: '1.05rem', lineHeight: 1.35 }}>{activeCourse.title}</h3>
                <p className="text-secondary text-xs" style={{ margin: '0 0 14px', lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {activeCourse.description || 'Resume your active curriculum and syllabus modules.'}
                </p>

                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 6, fontSize: '0.78rem' }}>
                    <span className="text-secondary font-medium">Syllabus Progress</span>
                    <strong style={{ color: 'var(--text-main)' }}>
                      {activeCourse.completedLessons} of {activeCourse.totalLessons} lessons ({activeCourse.progressPercentage}%)
                    </strong>
                  </div>
                  <div className="progress-bar-bg" role="progressbar" aria-valuenow={activeCourse.progressPercentage} aria-valuemin={0} aria-valuemax={100} style={{ height: 7, borderRadius: 4 }}>
                    <div className="progress-bar-fill" style={{ width: `${activeCourse.progressPercentage}%`, height: '100%', borderRadius: 4 }} />
                  </div>
                </div>

                {activeCourse.nextLesson && (
                  <div style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    Up next: <strong style={{ color: 'var(--text-main)' }}>{activeCourse.nextLesson.title}</strong>
                  </div>
                )}
              </>
            ) : (
              <div style={{ padding: '24px 16px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-subtle)', textAlign: 'center', margin: 'auto 0' }}>
                <BookOpen size={26} color="var(--text-muted)" style={{ margin: '0 auto 8px', opacity: 0.6 }} />
                <p style={{ margin: '0 0 4px', fontSize: '0.875rem', fontWeight: 600 }}>No active courses in progress</p>
                <p className="text-secondary text-xs" style={{ margin: 0 }}>Enroll in a course below to kickstart your learning journey.</p>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 10, borderTop: '1px solid var(--border-subtle)' }}>
            <Link to="/my-learning" className="text-secondary text-xs font-medium" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              My Learning <ArrowRight size={12} />
            </Link>
            {activeCourse ? (
              <Link
                to={(activeCourse as any).actionUrl || `/course-player/${activeCourse.id}${(activeCourse as any).nextLesson ? `?lesson=${(activeCourse as any).nextLesson.id}` : ''}`}
                className="btn btn-primary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.78rem' }}
              >
                <Play size={12} /> Resume Lesson
              </Link>
            ) : (
              <Link to="/courses" className="btn btn-primary btn-sm" style={{ fontSize: '0.78rem' }}>
                Explore Courses
              </Link>
            )}
          </div>
        </article>

        {/* ROW 2 - RIGHT: My Enrolled Courses Overview */}
        <article className="card" style={{ padding: '22px' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Layers size={18} color="var(--accent-purple)" />
                <h2 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 700 }}>My Enrolled Courses</h2>
              </div>
              <span className="badge badge-secondary" style={{ fontSize: '0.72rem' }}>
                {data.courses.length} {data.courses.length === 1 ? 'Track' : 'Tracks'}
              </span>
            </div>

            {data.courses.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {data.courses.slice(0, 3).map((course) => (
                  <Link
                    key={course.id}
                    to={`/course-player/${course.id}`}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      textDecoration: 'none',
                      color: 'inherit',
                      display: 'block',
                      transition: 'border-color 0.18s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                      <strong style={{ fontSize: '0.85rem', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {course.title}
                      </strong>
                      <span className="text-muted text-xs" style={{ fontWeight: 600 }}>{course.progressPercentage}%</span>
                    </div>
                    <div className="progress-bar-bg" role="progressbar" aria-valuenow={course.progressPercentage} aria-valuemin={0} aria-valuemax={100} style={{ height: 5, borderRadius: 3 }}>
                      <div className="progress-bar-fill" style={{ width: `${course.progressPercentage}%`, height: '100%', borderRadius: 3 }} />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div style={{ padding: '24px 16px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-subtle)', textAlign: 'center', margin: 'auto 0' }}>
                <BookOpen size={26} color="var(--text-muted)" style={{ margin: '0 auto 8px', opacity: 0.6 }} />
                <p style={{ margin: '0 0 4px', fontSize: '0.875rem', fontWeight: 600 }}>No enrolled courses</p>
                <p className="text-secondary text-xs" style={{ margin: 0 }}>Discover courses and programs in the catalog.</p>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 10, borderTop: '1px solid var(--border-subtle)' }}>
            <Link to="/courses" className="text-secondary text-xs font-medium" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              Full Catalog <ArrowRight size={12} />
            </Link>
            <Link to="/my-learning" className="btn btn-secondary btn-sm" style={{ fontSize: '0.78rem' }}>
              View All Enrolled
            </Link>
          </div>
        </article>
      </div>

      {/* 4. Horizontal Course Carousel: Recommended & Most Popular Courses */}
      <section className="card" style={{ padding: '24px' }}>
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
            <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Recommended & Trending Courses</h2>
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

                <h3 style={{ fontSize: '1.02rem', margin: '0 0 8px 0', lineHeight: 1.35, minHeight: '2.7rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {course.title}
                </h3>
                <p className="text-secondary text-xs" style={{ margin: '0 0 14px 0', lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: '2.4rem' }}>
                  {course.description}
                </p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <BookOpen size={12} color="var(--primary)" /> {course.learnersCount} enrolled
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={12} /> {course.duration}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Activity size={12} /> {course.modulesCount} modules
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
                      setEnrolledNotice(`Successfully enrolled in "${course.title}"! Added to My Enrolled Courses.`);
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
      </section>
    </div>
  );
};
