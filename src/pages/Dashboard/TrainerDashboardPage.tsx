import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../lib/store';
import { useCourseStore } from '../../lib/courseStore';
import { useLiveSessionStore } from '../../lib/liveSessionStore';
import {
  mockCohorts,
  mockAssessments,
  mockGradingTasks,
  mockLiveSessions
} from '../../data/mockData';
import {
  BookOpen,
  UsersRound,
  Users,
  PenTool,
  Video,
  Calendar,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  Clock,
  ArrowRight,
  GraduationCap,
  FileCheck,
  Award,
  AlertCircle
} from 'lucide-react';
import { GoogleMeetIcon } from '../../components/GoogleMeet';

// ============================================================================
// Types & Helper Functions
// ============================================================================

type DateFilterOption = 'all' | 'today' | '7days' | '30days' | 'custom';

interface ActivityItem {
  id: string;
  title: string;
  description: string;
  courseName: string;
  courseId: string;
  timestamp: string;
  rawDate: string;
  type: 'submission' | 'ai_grade' | 'live_session' | 'completion' | 'progress' | 'announcement';
  linkUrl: string;
  statusBadge: string;
  statusVariant: 'success' | 'warning' | 'info' | 'primary';
}

const getCourseGlyph = (category?: string, title?: string): { glyph: string; gradient: string } => {
  const t = (title || '').toLowerCase();
  const c = (category || '').toLowerCase();

  if (t.includes('react') || c.includes('react')) {
    return { glyph: 'REACT', gradient: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0284c7 100%)' };
  }
  if (t.includes('typescript') || c.includes('typescript')) {
    return { glyph: 'TS', gradient: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)' };
  }
  if (t.includes('python') || c.includes('data')) {
    return { glyph: 'PY', gradient: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #059669 100%)' };
  }
  if (t.includes('javascript') || c.includes('web')) {
    return { glyph: 'JS', gradient: 'linear-gradient(135deg, #18181b 0%, #27272a 50%, #d97706 100%)' };
  }
  return { glyph: 'LMS', gradient: 'linear-gradient(135deg, #1e1b4b 0%, #3730a3 50%, #4f46e5 100%)' };
};

// Simulated base reference time for demo consistency (October 2026)
const REFERENCE_TIME = new Date('2026-10-18T10:00:00Z').getTime();

const isDateWithinRange = (
  dateStr: string | undefined,
  range: DateFilterOption,
  customStart?: string,
  customEnd?: string
): boolean => {
  if (range === 'all') return true;
  if (!dateStr) return true;

  const itemTime = new Date(dateStr).getTime();
  if (isNaN(itemTime)) return true;

  const itemDateDay = new Date(itemTime).toISOString().slice(0, 10);
  const refDateDay = new Date(REFERENCE_TIME).toISOString().slice(0, 10);

  if (range === 'today') {
    const diffHours = Math.abs(itemTime - REFERENCE_TIME) / (1000 * 60 * 60);
    return itemDateDay === refDateDay || diffHours <= 24;
  }
  if (range === '7days') {
    const diffDays = Math.abs(itemTime - REFERENCE_TIME) / (1000 * 60 * 60 * 24);
    return diffDays <= 7;
  }
  if (range === '30days') {
    const diffDays = Math.abs(itemTime - REFERENCE_TIME) / (1000 * 60 * 60 * 24);
    return diffDays <= 30;
  }
  if (range === 'custom') {
    if (customStart && itemDateDay < customStart) return false;
    if (customEnd && itemDateDay > customEnd) return false;
    return true;
  }
  return true;
};

// ============================================================================
// Trainer Dashboard Component
// ============================================================================

export const TrainerDashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const allCourses = useCourseStore((s) => s.courses);
  const storeSessions = useLiveSessionStore((s) => s.sessions);

  const trainerId = user?.id || 'u-004';
  const trainerName = user?.displayName || (user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Dr. James Wilson');

  // --- Filter State ---
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [selectedCohort, setSelectedCohort] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateFilterOption>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  const isFiltered =
    selectedCourse !== 'all' ||
    selectedCohort !== 'all' ||
    dateRange !== 'all' ||
    customStartDate !== '' ||
    customEndDate !== '';

  const handleResetFilters = () => {
    setSelectedCourse('all');
    setSelectedCohort('all');
    setDateRange('all');
    setCustomStartDate('');
    setCustomEndDate('');
  };

  // --- 1. Authorized Courses for this Trainer ---
  const assignedCourses = useMemo(() => {
    return allCourses.filter((c) =>
      c.instructors?.includes(trainerId) ||
      c.createdBy === trainerId ||
      user?.eligibleCourseIds?.includes(c.id) ||
      ['crs-001', 'crs-002', 'crs-004'].includes(c.id)
    );
  }, [allCourses, trainerId, user]);

  const assignedCourseIds = useMemo(() => new Set(assignedCourses.map((c) => c.id)), [assignedCourses]);

  // --- 2. Authorized Cohorts / Classes for this Trainer ---
  const assignedCohorts = useMemo(() => {
    return mockCohorts.filter((c) =>
      c.instructors?.includes(trainerId) ||
      c.instructorIds?.includes(trainerId) ||
      (c.courseId && assignedCourseIds.has(c.courseId)) ||
      ['coh-001', 'coh-002'].includes(c.id)
    );
  }, [trainerId, assignedCourseIds]);

  const assignedCohortIds = useMemo(() => new Set(assignedCohorts.map((c) => c.id)), [assignedCohorts]);

  // --- 3. Filtered Courses ---
  const filteredCourses = useMemo(() => {
    if (selectedCourse !== 'all') {
      return assignedCourses.filter((c) => c.id === selectedCourse);
    }
    if (selectedCohort !== 'all') {
      const cohort = assignedCohorts.find((co) => co.id === selectedCohort);
      if (cohort?.courseId) {
        return assignedCourses.filter((c) => c.id === cohort.courseId);
      }
    }
    return assignedCourses;
  }, [assignedCourses, selectedCourse, selectedCohort, assignedCohorts]);

  // --- 4. Filtered Cohorts ---
  const filteredCohorts = useMemo(() => {
    let result = assignedCohorts;
    if (selectedCohort !== 'all') {
      result = result.filter((c) => c.id === selectedCohort);
    }
    if (selectedCourse !== 'all') {
      result = result.filter((c) => c.courseId === selectedCourse);
    }
    return result;
  }, [assignedCohorts, selectedCohort, selectedCourse]);

  // --- 5. Teaching Schedule & Live Sessions ---
  const rawSessions = storeSessions?.length ? storeSessions : mockLiveSessions;
  const trainerSessions = useMemo(() => {
    return rawSessions.filter((s) =>
      s.instructorId === trainerId ||
      (s.courseId && assignedCourseIds.has(s.courseId)) ||
      (s.cohortId && assignedCohortIds.has(s.cohortId))
    );
  }, [rawSessions, trainerId, assignedCourseIds, assignedCohortIds]);

  const filteredSessions = useMemo(() => {
    return trainerSessions.filter((s) => {
      if (selectedCourse !== 'all' && s.courseId !== selectedCourse) return false;
      if (selectedCohort !== 'all' && s.cohortId !== selectedCohort) return false;
      const sessionDate = s.date || s.createdAt;
      return isDateWithinRange(sessionDate, dateRange, customStartDate, customEndDate);
    });
  }, [trainerSessions, selectedCourse, selectedCohort, dateRange, customStartDate, customEndDate]);

  // --- 6. Pending Grading Queue ---
  const trainerGradingTasks = useMemo(() => {
    return mockGradingTasks.filter((t) => {
      const assessment = mockAssessments.find((a) => a.id === t.assessmentId);
      const isCourseMatch = assessment?.courseId ? assignedCourseIds.has(assessment.courseId) : false;
      const isTrainerMatch = t.graderId === trainerId;
      const isDefaultAuthorized = ['asm-001', 'asm-002', 'asm-004'].includes(t.assessmentId);
      return (isCourseMatch || isTrainerMatch || isDefaultAuthorized) && t.status !== 'completed';
    });
  }, [assignedCourseIds, trainerId]);

  const filteredGradingTasks = useMemo(() => {
    return trainerGradingTasks.filter((t) => {
      const assessment = mockAssessments.find((a) => a.id === t.assessmentId);
      if (selectedCourse !== 'all' && assessment?.courseId !== selectedCourse) return false;
      if (selectedCohort !== 'all') {
        const cohort = assignedCohorts.find((c) => c.id === selectedCohort);
        if (cohort && assessment?.courseId !== cohort.courseId) return false;
      }
      const taskDate = t.createdAt || t.dueDate;
      return isDateWithinRange(taskDate, dateRange, customStartDate, customEndDate);
    });
  }, [trainerGradingTasks, selectedCourse, selectedCohort, assignedCohorts, dateRange, customStartDate, customEndDate]);

  // --- 7. Assessment Deadlines ---
  const trainerAssessments = useMemo(() => {
    return mockAssessments.filter((a) => a.courseId && assignedCourseIds.has(a.courseId));
  }, [assignedCourseIds]);

  const filteredAssessments = useMemo(() => {
    const list = trainerAssessments.filter((a) => {
      if (selectedCourse !== 'all' && a.courseId !== selectedCourse) return false;
      if (selectedCohort !== 'all') {
        const cohort = assignedCohorts.find((c) => c.id === selectedCohort);
        if (cohort && a.courseId !== cohort.courseId) return false;
      }
      const deadlineDate = a.availabilityEnd || a.createdAt;
      return isDateWithinRange(deadlineDate, dateRange, customStartDate, customEndDate);
    });

    // Sort by nearest deadline
    return [...list].sort((a, b) => {
      const dateA = new Date(a.availabilityEnd || '2026-12-31').getTime();
      const dateB = new Date(b.availabilityEnd || '2026-12-31').getTime();
      return dateA - dateB;
    });
  }, [trainerAssessments, selectedCourse, selectedCohort, assignedCohorts, dateRange, customStartDate, customEndDate]);

  // --- 8. Recent Course Activity Feed ---
  const trainerActivities: ActivityItem[] = useMemo(() => [
    {
      id: 'act-1',
      title: 'Capstone Submission Received',
      description: 'Alex Thompson submitted final project for Advanced React Patterns',
      courseName: 'Advanced React Patterns',
      courseId: 'crs-002',
      timestamp: '18 mins ago',
      rawDate: '2026-10-18T09:42:00Z',
      type: 'submission',
      linkUrl: '/grading',
      statusBadge: 'Submission',
      statusVariant: 'warning',
    },
    {
      id: 'act-2',
      title: 'AI Evaluation Ready for Approval',
      description: 'AI Grader generated provisional score (18/25) for David Kim — Awaiting trainer sign-off',
      courseName: 'JavaScript Fundamentals',
      courseId: 'crs-001',
      timestamp: '42 mins ago',
      rawDate: '2026-10-18T09:18:00Z',
      type: 'ai_grade',
      linkUrl: '/grading',
      statusBadge: 'AI Ready',
      statusVariant: 'primary',
    },
    {
      id: 'act-3',
      title: 'Live Workshop Scheduled',
      description: 'Advanced TypeScript Patterns Workshop scheduled for Cohort REACT-ADV',
      courseName: 'TypeScript Mastery',
      courseId: 'crs-004',
      timestamp: '2 hours ago',
      rawDate: '2026-10-18T08:00:00Z',
      type: 'live_session',
      linkUrl: '/live-sessions',
      statusBadge: 'Live Class',
      statusVariant: 'info',
    },
    {
      id: 'act-4',
      title: 'Assessment Completed',
      description: 'Maria Garcia completed JavaScript Fundamentals Quiz with score 25/25',
      courseName: 'JavaScript Fundamentals',
      courseId: 'crs-001',
      timestamp: '4 hours ago',
      rawDate: '2026-10-18T06:00:00Z',
      type: 'completion',
      linkUrl: '/assessments',
      statusBadge: 'Passed',
      statusVariant: 'success',
    },
    {
      id: 'act-5',
      title: 'Syllabus Milestone Reached',
      description: 'Cohort ENG-Q4-26 completed Module 2: Control Flow syllabus checkpoint',
      courseName: 'JavaScript Fundamentals',
      courseId: 'crs-001',
      timestamp: '1 day ago',
      rawDate: '2026-10-17T11:00:00Z',
      type: 'progress',
      linkUrl: '/courses',
      statusBadge: 'Milestone',
      statusVariant: 'primary',
    },
    {
      id: 'act-6',
      title: 'Rubric Updated',
      description: 'Capstone Rubric rub-001 synced for upcoming Advanced React evaluation cycle',
      courseName: 'Advanced React Patterns',
      courseId: 'crs-002',
      timestamp: '2 days ago',
      rawDate: '2026-10-16T14:30:00Z',
      type: 'announcement',
      linkUrl: '/assessments',
      statusBadge: 'Updated',
      statusVariant: 'info',
    },
  ], []);

  const filteredActivities = useMemo(() => {
    return trainerActivities.filter((act) => {
      if (selectedCourse !== 'all' && act.courseId !== selectedCourse) return false;
      return isDateWithinRange(act.rawDate, dateRange, customStartDate, customEndDate);
    });
  }, [trainerActivities, selectedCourse, dateRange, customStartDate, customEndDate]);

  // --- 9. Summary Counts for KPI Cards ---
  const totalStudentsEnrolled = useMemo(() => {
    const studentIds = new Set<string>();
    filteredCohorts.forEach((c) => {
      (c.studentIds || []).forEach((id) => studentIds.add(id));
    });
    return studentIds.size > 0 ? studentIds.size : filteredCohorts.reduce((sum, c) => sum + (c.learnerCount || 0), 0) || 68;
  }, [filteredCohorts]);

  const upcomingSessionsCount = useMemo(() => {
    return filteredSessions.filter((s) => s.status === 'scheduled' || s.status === 'live').length;
  }, [filteredSessions]);

  return (
    <div className="trainer-dashboard-container">
      {/* ================================================================= */}
      {/* 1. TOP HEADER & COMPACT RESPONSIVE FILTER BAR                     */}
      {/* ================================================================= */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
          width: '100%',
          minWidth: 0,
        }}
      >
        <div style={{ minWidth: 0, flex: '1 1 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
            <span
              className="badge badge-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}
            >
              <GraduationCap size={13} /> Trainer Portal &bull; Faculty Center
            </span>
          </div>

          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 800,
              margin: 0,
              letterSpacing: '-0.02em',
              color: 'var(--text-main)',
              lineHeight: 1.25,
            }}
          >
            Welcome back, {trainerName}
          </h1>
        </div>

        {/* Global Dashboard Filters */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '6px 12px',
            boxShadow: 'var(--shadow-sm)',
            maxWidth: '100%',
            minWidth: 0,
            boxSizing: 'border-box',
          }}
        >
          {/* Course Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0 }}>
            <BookOpen size={13} color="var(--primary)" style={{ flexShrink: 0 }} />
            <select
              className="form-select"
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              style={{
                fontSize: '0.8rem',
                padding: '4px 8px',
                minWidth: '130px',
                maxWidth: '180px',
                height: '32px',
              }}
              title="Filter by Assigned Course"
            >
              <option value="all">All Assigned Courses ({assignedCourses.length})</option>
              {assignedCourses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          {/* Class / Cohort / Batch Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0 }}>
            <UsersRound size={13} color="var(--accent-purple, #8b5cf6)" style={{ flexShrink: 0 }} />
            <select
              className="form-select"
              value={selectedCohort}
              onChange={(e) => setSelectedCohort(e.target.value)}
              style={{
                fontSize: '0.8rem',
                padding: '4px 8px',
                minWidth: '130px',
                maxWidth: '175px',
                height: '32px',
              }}
              title="Filter by Batch / Class"
            >
              <option value="all">All Classes / Batches ({assignedCohorts.length})</option>
              {assignedCohorts.map((co) => (
                <option key={co.id} value={co.id}>
                  {co.code ? `${co.code} - ${co.name}` : co.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0 }}>
            <Calendar size={13} color="var(--primary)" style={{ flexShrink: 0 }} />
            <select
              className="form-select"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateFilterOption)}
              style={{
                fontSize: '0.8rem',
                padding: '4px 8px',
                minWidth: '115px',
                height: '32px',
              }}
              title="Filter by Date Range"
            >
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {/* Custom Date Pickers */}
          {dateRange === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
              <input
                type="date"
                className="form-input"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                style={{ fontSize: '0.78rem', padding: '3px 6px', height: '32px', width: '120px' }}
                title="Start Date"
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>to</span>
              <input
                type="date"
                className="form-input"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                style={{ fontSize: '0.78rem', padding: '3px 6px', height: '32px', width: '120px' }}
                title="End Date"
              />
            </div>
          )}

          {/* Reset Filters */}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleResetFilters}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.78rem',
              padding: '4px 10px',
              height: '32px',
              color: isFiltered ? 'var(--primary)' : 'var(--text-secondary)',
              borderColor: isFiltered ? 'var(--primary)' : undefined,
              fontWeight: isFiltered ? 700 : 500,
              flexShrink: 0,
            }}
            title="Reset filters to default"
          >
            <RotateCcw size={12} />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* ================================================================= */}
      {/* 2. FIVE MEANINGFUL SUMMARY KPI CARDS                              */}
      {/* ================================================================= */}
      <div className="dashboard-kpi-grid trainer-kpi-grid">
        {/* KPI 1: Assigned Courses */}
        <Link to="/courses" className="stat-card stat-card-link" style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
            <span className="text-muted text-xs font-semibold stat-card-title">Assigned Courses</span>
            <BookOpen size={18} color="var(--primary)" style={{ flexShrink: 0 }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
            <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
              {filteredCourses.length}
            </span>
            <span className="text-success text-xs font-semibold">Active</span>
          </div>
          <p className="text-muted text-xs" style={{ margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Teaching modules
          </p>
        </Link>

        {/* KPI 2: Assigned Classes / Batches */}
        <Link to="/cohorts" className="stat-card stat-card-link" style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
            <span className="text-muted text-xs font-semibold stat-card-title">Assigned Classes</span>
            <UsersRound size={18} color="var(--accent-purple, #8b5cf6)" style={{ flexShrink: 0 }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
            <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
              {filteredCohorts.length}
            </span>
            <span className="text-muted text-xs font-medium">Batches</span>
          </div>
          <p className="text-muted text-xs" style={{ margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Active cohorts
          </p>
        </Link>

        {/* KPI 3: Assigned Students */}
        <Link to="/students" className="stat-card stat-card-link" style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
            <span className="text-muted text-xs font-semibold stat-card-title">Assigned Students</span>
            <Users size={18} color="var(--accent-cyan, #06b6d4)" style={{ flexShrink: 0 }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
            <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
              {totalStudentsEnrolled}
            </span>
            <span className="text-success text-xs font-semibold">Enrolled</span>
          </div>
          <p className="text-muted text-xs" style={{ margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Directly mentored
          </p>
        </Link>

        {/* KPI 4: Pending Evaluations */}
        <Link to="/grading" className="stat-card stat-card-link" style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
            <span className="text-muted text-xs font-semibold stat-card-title">Pending Evaluations</span>
            <PenTool size={18} color="var(--warning, #f59e0b)" style={{ flexShrink: 0 }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
            <span
              style={{
                fontSize: '1.8rem',
                fontWeight: 800,
                color: filteredGradingTasks.length > 0 ? 'var(--warning, #f59e0b)' : 'var(--text-main)',
                letterSpacing: '-0.02em',
              }}
            >
              {filteredGradingTasks.length}
            </span>
            <span
              className="badge"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                fontSize: '0.625rem',
                background: 'rgba(99, 102, 241, 0.12)',
                color: 'var(--primary)',
                borderColor: 'var(--primary)',
                padding: '1px 5px',
              }}
            >
              <Sparkles size={9} /> AI Ready
            </span>
          </div>
          <p className="text-muted text-xs" style={{ margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Awaiting approval
          </p>
        </Link>

        {/* KPI 5: Upcoming Live Sessions */}
        <Link to="/live-sessions" className="stat-card stat-card-link" style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
            <span className="text-muted text-xs font-semibold stat-card-title">Upcoming Live Sessions</span>
            <Video size={18} color="var(--info, #3b82f6)" style={{ flexShrink: 0 }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
            <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
              {upcomingSessionsCount}
            </span>
            <span className="text-muted text-xs font-medium">Scheduled</span>
          </div>
          <p className="text-muted text-xs" style={{ margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Synchronous classes
          </p>
        </Link>
      </div>

      {/* ================================================================= */}
      {/* 3. ROW 1: SCHEDULE (SECTION A) + PENDING GRADING (SECTION B)      */}
      {/* ================================================================= */}
      <div className="dashboard-split-grid trainer-schedule-split-grid">
        {/* SECTION A: Today's & Upcoming Teaching Schedule */}
        <div className="card trainer-card" style={{ display: 'flex', flexDirection: 'column', minWidth: 0, height: 'fit-content', alignSelf: 'start', overflow: 'hidden' }}>
          <div className="dashboard-card-header">
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                Today's & Upcoming Teaching Schedule
              </h2>
              <p className="text-secondary text-xs" style={{ margin: '2px 0 0' }}>
                Synchronous live workshops, interactive classes, and office hours
              </p>
            </div>
            <Link
              to="/weekly-timetable"
              className="btn btn-secondary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', flexShrink: 0 }}
            >
              View Full Timetable <ArrowRight size={12} />
            </Link>
          </div>

          {filteredSessions.length === 0 ? (
            <div
              style={{
                padding: '24px 16px',
                textAlign: 'center',
                background: 'var(--bg-input)',
                border: '1px dashed var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Calendar size={28} color="var(--text-muted)" />
              <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9rem' }}>
                No sessions found
              </div>
              <p className="text-secondary text-xs" style={{ maxWidth: '300px', margin: 0 }}>
                No live classes match your active filters. Try adjusting course or date selections.
              </p>
              {isFiltered && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleResetFilters}
                  style={{ marginTop: '4px', fontSize: '0.75rem' }}
                >
                  <RotateCcw size={11} /> Clear Filters
                </button>
              )}
            </div>
          ) : (
            <div className="table-container trainer-table-container">
              <table className="table trainer-schedule-table">
                <thead>
                  <tr>
                    <th className="col-datetime">Date & Time</th>
                    <th className="col-title">Session Title</th>
                    <th className="col-cohort">Cohort</th>
                    <th className="col-status">Status</th>
                    <th className="col-actions">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSessions.slice(0, 5).map((s, idx) => {
                    const cohort = assignedCohorts.find((c) => c.id === s.cohortId);
                    const cohortLabel = cohort?.code || (idx === 0 ? 'REACT-ADV' : idx === 1 ? 'ENG-Q4-26' : 'TS-2026');
                    const isLive = s.status === 'live';
                    const meetUrl = s.joinLink || s.meetingUrl || 'https://meet.google.com/abc-demo-xyz';

                    return (
                      <tr key={s.id}>
                        <td className="col-datetime">
                          <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                            {s.date ? new Date(s.date).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Today'},{' '}
                            {s.startTime || '10:00 AM'}
                          </div>
                          <span className="text-muted text-xs">
                            {s.duration || s.durationMinutes || 90} mins
                          </span>
                        </td>
                        <td className="col-title">
                          <div
                            style={{
                              fontWeight: 600,
                              color: 'var(--text-main)',
                              lineHeight: 1.35,
                              wordBreak: 'normal',
                              overflowWrap: 'break-word',
                            }}
                          >
                            {s.title}
                          </div>
                          <span
                            className="text-muted text-xs"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '3px' }}
                          >
                            <GoogleMeetIcon size={12} /> Google Meet
                          </span>
                        </td>
                        <td className="col-cohort">
                          <span className="badge badge-primary" style={{ fontSize: '0.72rem' }}>
                            {cohortLabel}
                          </span>
                        </td>
                        <td className="col-status">
                          <span
                            className={
                              isLive ? 'badge badge-active' : s.status === 'scheduled' ? 'badge badge-primary' : 'badge badge-neutral'
                            }
                            style={{ fontSize: '0.72rem' }}
                          >
                            {isLive ? 'In Progress' : s.status === 'scheduled' ? 'Scheduled' : 'Concluded'}
                          </span>
                        </td>
                        <td className="col-actions">
                          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                            <a
                              href={meetUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-primary btn-sm"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                fontSize: '0.75rem',
                                padding: '4px 10px',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              <GoogleMeetIcon size={13} /> {isLive ? 'Join Live' : 'Join Session'}
                            </a>
                            <Link
                              to="/live-sessions"
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: '0.75rem', padding: '4px 8px', whiteSpace: 'nowrap' }}
                              title="View Session Details"
                            >
                              Details
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* SECTION B: Pending Grading Queue */}
        <div className="card trainer-card" style={{ display: 'flex', flexDirection: 'column', minWidth: 0, height: 'fit-content', alignSelf: 'start' }}>
          <div className="dashboard-card-header">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                  Pending Grading Queue
                </h2>
                <span
                  className="chart-stat-chip"
                  style={{
                    color: 'var(--primary)',
                    borderColor: 'rgba(99, 102, 241, 0.3)',
                    fontSize: '0.7rem',
                    padding: '2px 6px',
                  }}
                >
                  <Sparkles size={11} /> AI Assisted
                </span>
              </div>
              <p className="text-secondary text-xs" style={{ margin: '2px 0 0' }}>
                Submissions awaiting trainer evaluation and final grade confirmation
              </p>
            </div>
            <Link
              to="/grading"
              className="btn btn-secondary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', flexShrink: 0 }}
            >
              View All ({filteredGradingTasks.length}) <ArrowRight size={12} />
            </Link>
          </div>

          {filteredGradingTasks.length === 0 ? (
            <div
              style={{
                padding: '24px 16px',
                textAlign: 'center',
                background: 'var(--bg-input)',
                border: '1px dashed var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <CheckCircle2 size={28} color="var(--success)" />
              <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9rem' }}>
                All submissions reviewed
              </div>
              <p className="text-secondary text-xs" style={{ maxWidth: '300px', margin: 0 }}>
                No pending student submissions require your evaluation right now.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>
              {filteredGradingTasks.slice(0, 4).map((t) => {
                const assessment = mockAssessments.find((a) => a.id === t.assessmentId);
                const course = assignedCourses.find((c) => c.id === assessment?.courseId);
                const hasAiSuggestion = !!t.aiSuggestion || t.status === 'unassigned';

                return (
                  <div
                    key={t.id}
                    style={{
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '10px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      flexWrap: 'wrap',
                      minWidth: 0,
                    }}
                  >
                    <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-main)' }}>
                          {t.learnerName || 'Alex Thompson'}
                        </span>
                        {hasAiSuggestion ? (
                          <span
                            className="badge"
                            style={{
                              background: 'rgba(99, 102, 241, 0.12)',
                              color: 'var(--primary)',
                              border: '1px solid rgba(99, 102, 241, 0.3)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              fontSize: '0.65rem',
                              padding: '1px 6px',
                            }}
                          >
                            <Sparkles size={10} /> AI Suggestion Ready
                          </span>
                        ) : (
                          <span className="badge badge-warning" style={{ fontSize: '0.65rem', padding: '1px 6px' }}>
                            Needs Review
                          </span>
                        )}
                      </div>

                      <div
                        style={{
                          fontSize: '0.78rem',
                          color: 'var(--text-secondary)',
                          fontWeight: 500,
                          lineHeight: 1.3,
                          overflowWrap: 'break-word',
                        }}
                      >
                        {t.assessmentTitle || 'Advanced React Capstone'}
                      </div>

                      <div
                        className="text-muted text-xs"
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px', flexWrap: 'wrap' }}
                      >
                        <span>{course?.title || 'Advanced React Patterns'}</span>
                        <span>&bull;</span>
                        <span>Submitted Oct 16, 12:00 PM</span>
                      </div>
                    </div>

                    <Link
                      to="/grading"
                      className="btn btn-primary btn-sm"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        fontSize: '0.78rem',
                        padding: '5px 12px',
                        flexShrink: 0,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <CheckCircle2 size={13} /> Review Submission
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ================================================================= */}
      {/* 4. ROW 2: COURSES & SYLLABUS (C) + ASSESSMENT DEADLINES (D)       */}
      {/* ================================================================= */}
      <div className="dashboard-split-grid trainer-secondary-split-grid">
        {/* SECTION C: Assigned Courses & Syllabus Completion */}
        <div className="card trainer-card" style={{ display: 'flex', flexDirection: 'column', minWidth: 0, height: 'fit-content', alignSelf: 'start' }}>
          <div className="dashboard-card-header">
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                Assigned Courses & Syllabus Completion
              </h2>
              <p className="text-secondary text-xs" style={{ margin: '2px 0 0' }}>
                Curriculum progression and syllabus milestones across assigned courses
              </p>
            </div>
            <Link
              to="/courses"
              className="btn btn-secondary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', flexShrink: 0 }}
            >
              View All Courses <ArrowRight size={12} />
            </Link>
          </div>

          {filteredCourses.length === 0 ? (
            <div
              style={{
                padding: '24px 16px',
                textAlign: 'center',
                background: 'var(--bg-input)',
                border: '1px dashed var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <BookOpen size={28} color="var(--text-muted)" />
              <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9rem' }}>
                No courses match filters
              </div>
              <p className="text-secondary text-xs" style={{ maxWidth: '300px', margin: 0 }}>
                Try selecting "All Assigned Courses" to inspect full syllabus completion.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: 0 }}>
              {filteredCourses.map((c) => {
                const totalLessons = c.modules?.reduce((acc, m) => acc + (m.lessons?.length || 0), 0) || 16;
                const completionPct = c.completionRate || 68;
                const completedLessons = Math.min(totalLessons, Math.round(totalLessons * (completionPct / 100)));
                const { glyph, gradient } = getCourseGlyph(c.category, c.title);

                return (
                  <div
                    key={c.id}
                    style={{
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      flexWrap: 'wrap',
                      minWidth: 0,
                    }}
                  >
                    {/* Thumbnail / Visual Glyph */}
                    <div
                      style={{
                        width: '74px',
                        height: '48px',
                        borderRadius: 'var(--radius-sm)',
                        background: gradient,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        boxShadow: 'var(--shadow-sm)',
                        overflow: 'hidden',
                      }}
                    >
                      {c.thumbnail ? (
                        <img
                          src={c.thumbnail}
                          alt={c.title}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#fff', letterSpacing: '0.05em' }}>
                          {glyph}
                        </span>
                      )}
                    </div>

                    {/* Course Info & Progress */}
                    <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontWeight: 700,
                              fontSize: '0.9rem',
                              color: 'var(--text-main)',
                              lineHeight: 1.3,
                              overflowWrap: 'break-word',
                            }}
                          >
                            {c.title}
                          </div>
                          <div className="text-muted text-xs" style={{ marginTop: '2px' }}>
                            {c.category} &bull; {completedLessons} of {totalLessons} Lessons Completed
                          </div>
                        </div>

                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--primary)' }}>
                            {completionPct}%
                          </span>
                          <div className="text-muted text-xs">Syllabus</div>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div
                        style={{
                          width: '100%',
                          height: '7px',
                          background: 'var(--bg-surface)',
                          borderRadius: '4px',
                          overflow: 'hidden',
                          marginTop: '8px',
                        }}
                      >
                        <div
                          style={{
                            width: `${completionPct}%`,
                            height: '100%',
                            background:
                              completionPct >= 75
                                ? 'linear-gradient(90deg, var(--primary) 0%, var(--success) 100%)'
                                : 'linear-gradient(90deg, var(--primary) 0%, var(--accent-purple, #8b5cf6) 100%)',
                            borderRadius: '4px',
                            transition: 'width 0.4s ease',
                          }}
                        />
                      </div>
                    </div>

                    {/* Manage Link */}
                    <div style={{ flexShrink: 0 }}>
                      <Link
                        to={`/course-builder?edit=${c.id}`}
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.75rem', padding: '4px 10px', whiteSpace: 'nowrap' }}
                      >
                        Manage Course
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* SECTION D: Assessment Deadlines */}
        <div className="card trainer-card" style={{ display: 'flex', flexDirection: 'column', minWidth: 0, height: 'fit-content', alignSelf: 'start' }}>
          <div className="dashboard-card-header">
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                Assessment Deadlines
              </h2>
              <p className="text-secondary text-xs" style={{ margin: '2px 0 0' }}>
                Upcoming quizzes, rubrics, and project submission cut-offs
              </p>
            </div>
            <Link
              to="/assessments"
              className="btn btn-secondary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', flexShrink: 0 }}
            >
              Manage <ArrowRight size={12} />
            </Link>
          </div>

          {filteredAssessments.length === 0 ? (
            <div
              style={{
                padding: '24px 16px',
                textAlign: 'center',
                background: 'var(--bg-input)',
                border: '1px dashed var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Award size={28} color="var(--text-muted)" />
              <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9rem' }}>
                No deadlines found
              </div>
              <p className="text-secondary text-xs" style={{ maxWidth: '300px', margin: 0 }}>
                No assessment deadlines match current filter parameters.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>
              {filteredAssessments.slice(0, 4).map((a, idx) => {
                const course = assignedCourses.find((c) => c.id === a.courseId);
                const deadlineDate = a.availabilityEnd ? new Date(a.availabilityEnd) : new Date(REFERENCE_TIME + (idx + 2) * 86400000);
                const isDueSoon = deadlineDate.getTime() - REFERENCE_TIME < 3 * 86400000;
                const isClosed = deadlineDate.getTime() < REFERENCE_TIME;

                const statusLabel = isClosed ? 'Closed' : isDueSoon ? 'Due Soon' : 'Upcoming';
                const statusBadgeClass = isClosed ? 'badge-neutral' : isDueSoon ? 'badge-warning' : 'badge-primary';

                return (
                  <div
                    key={a.id}
                    style={{
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '10px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      flexWrap: 'wrap',
                      minWidth: 0,
                    }}
                  >
                    <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-main)', overflowWrap: 'break-word' }}>
                          {a.title}
                        </span>
                        <span className={`badge ${statusBadgeClass}`} style={{ fontSize: '0.65rem', padding: '1px 6px' }}>
                          {statusLabel}
                        </span>
                      </div>

                      <div
                        className="text-muted text-xs"
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}
                      >
                        <span>{course?.title || 'Assigned Course'}</span>
                        <span>&bull;</span>
                        <span>Due {deadlineDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        <span>&bull;</span>
                        <span>{a.totalMarks || 100} Marks</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                      <span className="badge badge-draft" style={{ fontSize: '0.7rem' }}>
                        {a.proctoringRequired ? 'Proctored' : 'Standard'}
                      </span>
                      <Link
                        to="/assessments"
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.75rem', padding: '4px 8px', whiteSpace: 'nowrap' }}
                      >
                        Manage
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ================================================================= */}
      {/* 5. ROW 3: RECENT COURSE ACTIVITY FEED (SECTION E)                 */}
      {/* ================================================================= */}
      <div className="card trainer-card" style={{ minWidth: 0, height: 'fit-content' }}>
        <div className="dashboard-card-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                Recent Course Activity
              </h2>
              <span
                className="badge badge-primary"
                style={{ fontSize: '0.68rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              >
                Live Stream
              </span>
            </div>
            <p className="text-secondary text-xs" style={{ margin: '2px 0 0' }}>
              Chronological updates across student submissions, AI scoring evaluations, and curriculum milestones
            </p>
          </div>
        </div>

        {filteredActivities.length === 0 ? (
          <div
            style={{
              padding: '24px 16px',
              textAlign: 'center',
              background: 'var(--bg-input)',
              border: '1px dashed var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Clock size={28} color="var(--text-muted)" />
            <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9rem' }}>
              No recent activity
            </div>
            <p className="text-secondary text-xs" style={{ maxWidth: '300px', margin: 0 }}>
              No logged events match the selected course and date criteria.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>
            {filteredActivities.map((act) => {
              const IconComponent =
                act.type === 'submission'
                  ? FileCheck
                  : act.type === 'ai_grade'
                  ? Sparkles
                  : act.type === 'live_session'
                  ? Video
                  : act.type === 'completion'
                  ? CheckCircle2
                  : act.type === 'progress'
                  ? BookOpen
                  : Award;

              const iconColor =
                act.type === 'submission'
                  ? 'var(--warning, #f59e0b)'
                  : act.type === 'ai_grade'
                  ? 'var(--primary)'
                  : act.type === 'live_session'
                  ? 'var(--info, #3b82f6)'
                  : act.type === 'completion'
                  ? 'var(--success, #10b981)'
                  : 'var(--accent-purple, #8b5cf6)';

              return (
                <div
                  key={act.id}
                  style={{
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    flexWrap: 'wrap',
                    minWidth: 0,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: '1 1 240px', minWidth: 0 }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: 'var(--bg-card)',
                        border: `2px solid ${iconColor}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        boxShadow: 'var(--shadow-sm)',
                        marginTop: '2px',
                      }}
                    >
                      <IconComponent size={14} color={iconColor} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '2px' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-main)', overflowWrap: 'break-word' }}>
                          {act.title}
                        </span>
                        <span
                          className={
                            act.statusVariant === 'success'
                              ? 'badge badge-active'
                              : act.statusVariant === 'warning'
                              ? 'badge badge-warning'
                              : 'badge badge-primary'
                          }
                          style={{ fontSize: '0.625rem', padding: '1px 6px' }}
                        >
                          {act.statusBadge}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4, overflowWrap: 'break-word' }}>
                        {act.description}
                      </div>

                      <div className="text-muted text-xs" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 500, color: 'var(--primary)' }}>{act.courseName}</span>
                        <span>&bull;</span>
                        <span>{act.timestamp}</span>
                      </div>
                    </div>
                  </div>

                  <Link
                    to={act.linkUrl}
                    className="btn btn-secondary btn-sm"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.75rem',
                      padding: '4px 10px',
                      flexShrink: 0,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    View <ArrowRight size={11} />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
