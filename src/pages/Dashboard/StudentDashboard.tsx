import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, Award, BookOpen, Calendar, Clock, Flame, RefreshCw, Trophy, Video,
} from 'lucide-react';
import { GoogleMeetJoinButton, MeetingProviderBadge } from '../../components/GoogleMeet';
import { apiClient, ApiError, hasBackendAccessToken } from '../../lib/apiClient';
import { useAuthStore } from '../../lib/store';
import { useCourseStore } from '../../lib/courseStore';
import {
  mockAssessments,
  mockAttempts,
  mockCertificates,
  mockEnrollments,
  mockGamificationProfile,
  mockLiveSessions,
} from '../../data/mockData';
import type { Course, Enrollment } from '../../types';

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
    nextLesson: { id: string; title: string } | null;
  }>;
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

function getDemoDashboardData(userId: string, courses: Course[], enrollments: Enrollment[]): StudentDashboardData {
  const studentEnrollments = (enrollments.length ? enrollments : mockEnrollments)
    .filter((enrollment) => enrollment.userId === userId && enrollment.courseId);
  const coursesById = new Map(courses.map((course) => [course.id, course]));
  const enrolledCourses = studentEnrollments.flatMap((enrollment) => {
    const course = coursesById.get(enrollment.courseId!);
    if (!course) return [];
    const lessons = course.modules.flatMap((module) => module.lessons);
    const completedLessons = Math.round(lessons.length * enrollment.progress / 100);
    const nextLesson = lessons[completedLessons];
    return [{
      id: course.id,
      title: course.title,
      description: course.shortDescription || course.description,
      status: enrollment.status === 'completed' ? 'completed' : enrollment.status,
      progressPercentage: enrollment.progress,
      completedLessons,
      totalLessons: lessons.length,
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
  const [isDemoPreview, setIsDemoPreview] = useState(false);
  const [data, setData] = useState<StudentDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      setData(getDemoDashboardData(user.id, courses, enrollments));
      setIsDemoPreview(true);
      setIsLoading(false);
      return;
    }

    setIsDemoPreview(false);
    try {
      const response = await apiClient.get<StudentDashboardData>('/student/dashboard');
      setData(response.data);
    } catch (loadError) {
      setError(loadError instanceof ApiError && loadError.statusCode < 500
        ? loadError.message
        : 'Unable to load your dashboard. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [courses, enrollments, user]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

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

  const firstName = user?.firstName || 'Student';
  const activeCourse = data.courses.find((course) => course.status !== 'completed');
  const nextSession = data.sessions[0];
  const nextAssessment = data.assessments.find((assessment) => assessment.attemptsRemaining > 0);

  const metricCards = [
    { label: 'Enrolled Courses', value: data.stats.enrolledCourses, detail: `${data.stats.inProgressCourses} in progress`, icon: BookOpen, color: 'var(--primary)' },
    { label: 'In-Progress Courses', value: data.stats.inProgressCourses, detail: 'Active learning', icon: Clock, color: 'var(--accent-cyan)' },
    { label: 'Completed Courses', value: data.stats.completedCourses, detail: `${data.stats.completedCertificates} certificates earned`, icon: Award, color: 'var(--success)' },
    { label: 'Curriculum Progress', value: `${data.stats.curriculumProgressPercentage}%`, detail: `${data.stats.completedLessons} of ${data.stats.totalLessons} lessons completed`, icon: Activity, color: 'var(--accent-purple)' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
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
        }}
      >
        <div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
            <span className="badge badge-primary">{data.gamification.rank}</span>
            {isDemoPreview && <span className="badge badge-warning">Demo preview · sample data</span>}
            <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center', color: '#f59e0b', fontWeight: 700, fontSize: '0.8rem' }}>
              <Flame size={15} /> {data.gamification.streakDays} Day Streak
            </span>
          </div>
          <h1 id="student-dashboard-title" style={{ margin: '0 0 6px' }}>Welcome back, {firstName}!</h1>
          <p className="text-secondary" style={{ margin: 0 }}>Your learning progress, upcoming work, and course updates.</p>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link to="/leaderboard" className="card" style={{ minWidth: 110, padding: '12px 16px', textAlign: 'center', textDecoration: 'none' }}>
            <strong style={{ display: 'block', fontSize: '1.25rem', color: '#ffd700' }}>
              <Trophy size={15} style={{ verticalAlign: 'middle' }} /> {data.gamification.leaderboardRank ? `#${data.gamification.leaderboardRank}` : '—'}
            </strong>
            <span className="text-muted text-xs">Leaderboard Rank</span>
          </Link>
          <div className="card" style={{ minWidth: 110, padding: '12px 16px', textAlign: 'center' }}>
            <strong style={{ display: 'block', fontSize: '1.25rem', color: 'var(--primary)' }}>{data.gamification.totalPoints}</strong>
            <span className="text-muted text-xs">Total Points</span>
          </div>
          <div className="card" style={{ minWidth: 110, padding: '12px 16px', textAlign: 'center' }}>
            <strong style={{ display: 'block', fontSize: '1.25rem', color: 'var(--success)' }}>{data.gamification.badges.length}</strong>
            <span className="text-muted text-xs">Badges Earned</span>
          </div>
        </div>
      </section>

      <section aria-label="Learning statistics" className="grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 16 }}>
        {metricCards.map(({ label, value, detail, icon: Icon, color }) => (
          <article className="stat-card" key={label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="text-muted text-xs font-semibold">{label}</span>
              <Icon size={16} color={color} />
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color }}>{value}</div>
            <p className="text-secondary text-xs" style={{ margin: 0 }}>{detail}</p>
          </article>
        ))}
      </section>

      <div className="dashboard-main-grid">
        <section style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <article className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <h2 style={{ fontSize: '1.15rem', margin: 0 }}>Continue Learning</h2>
              <Link to="/my-learning" className="text-primary text-sm">View all courses</Link>
            </div>
            {activeCourse ? (
              <>
                <h3 style={{ margin: '0 0 8px' }}>{activeCourse.title}</h3>
                <p className="text-secondary text-sm" style={{ margin: '0 0 14px' }}>{activeCourse.description || 'Continue with your next lesson.'}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 6, fontSize: '0.8rem' }}>
                  <span>Syllabus Progress</span>
                  <strong>{activeCourse.completedLessons} of {activeCourse.totalLessons} lessons</strong>
                </div>
                <div className="progress-bar-bg" role="progressbar" aria-valuenow={activeCourse.progressPercentage} aria-valuemin={0} aria-valuemax={100} style={{ height: 8, marginBottom: 14 }}>
                  <div className="progress-bar-fill" style={{ width: `${activeCourse.progressPercentage}%`, height: '100%' }} />
                </div>
                {activeCourse.nextLesson && <p className="text-secondary text-sm">Up next: <strong>{activeCourse.nextLesson.title}</strong></p>}
                <Link to={`/course-player/${activeCourse.id}`} className="btn btn-primary">
                  Continue Learning
                </Link>
              </>
            ) : (
              <div className="text-secondary">
                <p>You do not have any active courses yet.</p>
                <Link to="/courses" className="btn btn-primary">Explore courses</Link>
              </div>
            )}
          </article>

          <article className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <h2 style={{ fontSize: '1.05rem', margin: 0 }}>Announcements & Alerts</h2>
              <Link to="/notifications" className="text-primary text-sm">
                View all{data.stats.unreadNotifications > 0 ? ` (${data.stats.unreadNotifications} unread)` : ''}
              </Link>
            </div>
            {data.notifications.length ? (
              <div style={{ display: 'grid', gap: 10 }}>
                {data.notifications.map((notification) => (
                  <div key={notification.id} style={{ padding: 12, borderRadius: 'var(--radius-md)', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                      <strong>{notification.title}</strong>
                      {!notification.isRead && <span className="badge badge-primary">New</span>}
                    </div>
                    <p className="text-secondary text-sm" style={{ margin: '6px 0 0' }}>{notification.message}</p>
                  </div>
                ))}
              </div>
            ) : <p className="text-secondary text-sm">You are all caught up. No announcements yet.</p>}
          </article>
        </section>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {nextSession && (
            <article className="card" style={{ borderLeft: '4px solid var(--accent-cyan)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span className="text-primary text-xs font-semibold"><Video size={14} style={{ verticalAlign: 'middle' }} /> Upcoming Live Class</span>
                <MeetingProviderBadge provider={nextSession.provider} size="sm" />
              </div>
              <h2 style={{ fontSize: '1rem', margin: '0 0 8px' }}>{nextSession.title}</h2>
              <p className="text-secondary text-xs"><Calendar size={13} style={{ verticalAlign: 'middle' }} /> {formatSessionDate(nextSession.date, nextSession.startTime)}</p>
              {nextSession.course && <p className="text-muted text-xs">{nextSession.course.title}</p>}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <Link to="/my-sessions" className="btn btn-secondary btn-sm">Timetable</Link>
                <GoogleMeetJoinButton meetingUrl={nextSession.meetingUrl || undefined} size="sm" />
              </div>
            </article>
          )}

          {nextAssessment && (
            <article className="card" style={{ borderLeft: '4px solid var(--warning)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                <span className="text-warning text-xs font-semibold">Upcoming Assessment</span>
                <span className="badge badge-warning">{nextAssessment.attemptsRemaining} attempt{nextAssessment.attemptsRemaining === 1 ? '' : 's'} left</span>
              </div>
              <h2 style={{ fontSize: '1rem', margin: '10px 0' }}>{nextAssessment.title}</h2>
              <p className="text-secondary text-xs">
                <Clock size={13} style={{ verticalAlign: 'middle' }} /> {nextAssessment.durationMinutes} mins
                {' · '}{nextAssessment.totalMarks} points
                {' · '}Pass: {nextAssessment.passingPercentage}%
              </p>
              {nextAssessment.course && <p className="text-muted text-xs">{nextAssessment.course.title}</p>}
              <Link to="/my-assessments" className="btn btn-secondary btn-sm">View assessments</Link>
            </article>
          )}

          {data.courses.length === 0 && !nextSession && !nextAssessment && (
            <article className="card">
              <h2 style={{ fontSize: '1rem' }}>Your next steps</h2>
              <p className="text-secondary text-sm">Enroll in a course to see your lessons, schedule, and assessments here.</p>
              <Link to="/courses" className="btn btn-primary">Browse courses</Link>
            </article>
          )}

          <article className="card">
            <h2 style={{ fontSize: '1rem', margin: '0 0 12px' }}>My Courses</h2>
            {data.courses.length ? (
              <div style={{ display: 'grid', gap: 12 }}>
                {data.courses.slice(0, 4).map((course) => (
                  <Link key={course.id} to={`/course-player/${course.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <strong className="text-sm">{course.title}</strong>
                      <span className="text-muted text-xs">{course.progressPercentage}%</span>
                    </div>
                    <div className="progress-bar-bg" role="progressbar" aria-label={`${course.title} progress`} aria-valuenow={course.progressPercentage} aria-valuemin={0} aria-valuemax={100} style={{ height: 5, marginTop: 6 }}>
                      <div className="progress-bar-fill" style={{ width: `${course.progressPercentage}%`, height: '100%' }} />
                    </div>
                  </Link>
                ))}
              </div>
            ) : <p className="text-secondary text-sm">No enrolled courses.</p>}
          </article>
        </section>
      </div>
    </div>
  );
};
