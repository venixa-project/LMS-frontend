import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus,
  Search, Filter, RotateCcw, Clock, CheckCircle2, AlertCircle,
  Bell, BellRing, Sparkles, BookOpen, GraduationCap,
  ArrowUpRight, UsersRound, Video, Award, PenTool, Check,
  ExternalLink, Layers, X, Eye, CheckSquare, CalendarDays,
  ListOrdered, Flag, ArrowRight, Flame, Play
} from 'lucide-react';
import {
  PlannerActivity,
  PlannerActivityType,
  PlannerPriority,
  PlannerStatus,
  PlannerSource
} from '../../types/planner';
import {
  getAllPlannerActivities,
  expandRecurringActivities,
  getTopFocusTasks,
  getOverdueReminders,
  toggleTaskCompleted,
  addPlannerActivity,
  updatePlannerActivity,
  deletePlannerActivity,
  formatLocalDate,
  requestWebNotificationPermission,
  getWebNotificationStatus,
  dispatchWebNotification
} from '../../lib/plannerStore';
import { AddEditActivityModal } from '../../admin/components/AddEditActivityModal';
import { useAuthStore } from '../../lib/store';

export const AdminPlannerPage: React.FC = () => {
  const { user } = useAuthStore();
  const isTrainer = user?.activeRole === 'trainer';
  const isAdmin = !isTrainer;

  // Calendar view mode
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');

  // Currently focused date (defaults to Monday, Oct 26, 2026)
  const [currentDate, setCurrentDate] = useState<Date>(new Date(2026, 9, 26)); // Month is 0-indexed: 9 = October
  const [selectedDateStr, setSelectedDateStr] = useState<string>('2026-10-26');

  // Activity data
  const [activities, setActivities] = useState<PlannerActivity[]>([]);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<PlannerActivityType | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<PlannerPriority | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<PlannerStatus | 'all'>('all');
  const [courseFilter, setCourseFilter] = useState<string>('all');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<PlannerActivity | null>(null);

  // +N more popup dialog for a crowded date
  const [moreActivitiesDate, setMoreActivitiesDate] = useState<string | null>(null);

  // Notification state
  const [notifStatus, setNotifStatus] = useState<{ supported: boolean; permission: string }>({
    supported: false,
    permission: 'default'
  });
  const [notifMessage, setNotifMessage] = useState<string | null>(null);

  // Reload activities
  const loadActivities = () => {
    setActivities(getAllPlannerActivities());
  };

  useEffect(() => {
    loadActivities();
    const status = getWebNotificationStatus();
    setNotifStatus(status);
  }, []);

  // Request desktop notification permission
  const handleEnableDesktopAlerts = async () => {
    const res = await requestWebNotificationPermission();
    setNotifStatus({ supported: true, permission: res });
    if (res === 'granted') {
      dispatchWebNotification('VeniLearn Academic Calendar', 'Reminders & alerts are active for your scheduled activities.');
      setNotifMessage('Academic reminders successfully enabled!');
    } else {
      setNotifMessage('Desktop alerts disabled. In-app alerts will be displayed.');
    }
    setTimeout(() => setNotifMessage(null), 4000);
  };

  // Date navigation helpers
  const handlePrev = () => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      if (viewMode === 'month') {
        d.setMonth(d.getMonth() - 1);
      } else if (viewMode === 'week') {
        d.setDate(d.getDate() - 7);
      } else {
        d.setDate(d.getDate() - 1);
      }
      setSelectedDateStr(formatLocalDate(d));
      return d;
    });
  };

  const handleNext = () => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      if (viewMode === 'month') {
        d.setMonth(d.getMonth() + 1);
      } else if (viewMode === 'week') {
        d.setDate(d.getDate() + 7);
      } else {
        d.setDate(d.getDate() + 1);
      }
      setSelectedDateStr(formatLocalDate(d));
      return d;
    });
  };

  const handleToday = () => {
    const today = new Date(2026, 9, 26);
    setCurrentDate(today);
    setSelectedDateStr(formatLocalDate(today));
  };

  // Calculate Month Boundaries
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-11

  // Expanded recurring activities within viewed month window
  const monthStartBuffer = new Date(year, month, -6);
  const monthEndBuffer = new Date(year, month + 1, 7);

  const expandedAll = useMemo(() => {
    return expandRecurringActivities(
      activities,
      formatLocalDate(monthStartBuffer),
      formatLocalDate(monthEndBuffer)
    );
  }, [activities, year, month]);

  // Extract distinct courses/cohorts for Course/Batch filter dropdown
  const availableCourses = useMemo(() => {
    const map = new Map<string, string>();
    for (const act of activities) {
      if (act.relatedLmsTitle) {
        map.set(act.relatedLmsTitle, act.relatedLmsTitle);
      }
    }
    return Array.from(map.values()).sort();
  }, [activities]);

  // Apply search & filters
  const filteredActivities = useMemo(() => {
    return expandedAll.filter((act) => {
      // Type
      if (typeFilter !== 'all' && act.type !== typeFilter) return false;
      // Priority
      if (priorityFilter !== 'all' && act.priority !== priorityFilter) return false;
      // Status
      if (statusFilter !== 'all' && act.status !== statusFilter) return false;
      // Course / Target
      if (courseFilter !== 'all' && act.relatedLmsTitle !== courseFilter) return false;
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          act.title.toLowerCase().includes(q) ||
          (act.description && act.description.toLowerCase().includes(q)) ||
          (act.relatedLmsTitle && act.relatedLmsTitle.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [expandedAll, typeFilter, priorityFilter, statusFilter, courseFilter, searchQuery]);

  const isFiltered =
    typeFilter !== 'all' ||
    priorityFilter !== 'all' ||
    statusFilter !== 'all' ||
    courseFilter !== 'all' ||
    searchQuery.trim().length > 0;

  const clearAllFilters = () => {
    setTypeFilter('all');
    setPriorityFilter('all');
    setStatusFilter('all');
    setCourseFilter('all');
    setSearchQuery('');
  };

  // Map activities by date string (YYYY-MM-DD)
  const activitiesByDate = useMemo(() => {
    const map: Record<string, PlannerActivity[]> = {};
    for (const a of filteredActivities) {
      if (!map[a.date]) map[a.date] = [];
      map[a.date].push(a);
    }
    return map;
  }, [filteredActivities]);

  // Overdue Reminders
  const overdueReminders = useMemo(() => {
    return getOverdueReminders('2026-10-26');
  }, [activities]);

  // Dynamic calculations for "Today's Priorities"
  const todayDateKey = '2026-10-26';
  const todayActivities = activitiesByDate[todayDateKey] || [];

  // Trainer Priority Calculations
  const trainerTodayClassesCount = useMemo(() => {
    return todayActivities.filter(
      (a) => a.type === 'meeting' || a.type === 'lms_event' || a.relatedLmsType === 'live_session'
    ).length;
  }, [todayActivities]);

  const trainerUpcomingDeadlinesCount = useMemo(() => {
    return activities.filter(
      (a) => (a.type === 'deadline' || a.relatedLmsType === 'assessment') &&
             a.status !== 'completed' &&
             a.date >= todayDateKey
    ).length;
  }, [activities, todayDateKey]);

  const trainerAssessmentsNeedingAttentionCount = useMemo(() => {
    return activities.filter(
      (a) => (a.relatedLmsType === 'grading' || a.relatedLmsType === 'assessment') &&
             a.status === 'pending'
    ).length;
  }, [activities]);

  const trainerPendingTasksCount = useMemo(() => {
    return activities.filter(
      (a) => a.type === 'task' && a.status === 'pending'
    ).length;
  }, [activities]);

  // Admin Priority Calculations
  const adminPendingTasksCount = useMemo(() => {
    return activities.filter(
      (a) => a.type === 'task' && a.status === 'pending'
    ).length;
  }, [activities]);

  const adminUpcomingDeadlinesCount = useMemo(() => {
    return activities.filter(
      (a) => a.type === 'deadline' && a.status !== 'completed' && a.date >= todayDateKey
    ).length;
  }, [activities, todayDateKey]);

  const adminScheduledMeetingsCount = useMemo(() => {
    return activities.filter(
      (a) => a.type === 'meeting' && a.status !== 'completed' && a.date >= todayDateKey
    ).length;
  }, [activities, todayDateKey]);

  const adminOverdueCount = overdueReminders.length;

  // Selected date activities
  const selectedDateActivities = activitiesByDate[selectedDateStr] || [];

  // Toggle complete
  const handleToggleComplete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    toggleTaskCompleted(id);
    loadActivities();
  };

  // Add / Edit actions
  const handleOpenAddForDate = (dateStr: string) => {
    setSelectedDateStr(dateStr);
    setSelectedActivity(null);
    setIsModalOpen(true);
  };

  const handleEditActivity = (act: PlannerActivity) => {
    setSelectedActivity(act);
    setIsModalOpen(true);
  };

  const handleSaveModal = (data: Omit<PlannerActivity, 'id' | 'createdAt' | 'updatedAt' | 'source'>) => {
    if (selectedActivity) {
      updatePlannerActivity(selectedActivity.id, data);
    } else {
      addPlannerActivity(data);
    }
    loadActivities();
  };

  const handleDeleteModal = (id: string) => {
    deletePlannerActivity(id);
    loadActivities();
  };

  // Category Configuration and Styles
  const getCategoryConfig = (type: PlannerActivityType) => {
    switch (type) {
      case 'lms_event':
        return {
          label: 'Class',
          color: '#38bdf8',
          bg: 'rgba(6, 182, 212, 0.15)',
          border: 'rgba(6, 182, 212, 0.4)',
          icon: Video
        };
      case 'deadline':
        return {
          label: 'Deadline',
          color: '#fb7185',
          bg: 'rgba(244, 63, 94, 0.15)',
          border: 'rgba(244, 63, 94, 0.4)',
          icon: Clock
        };
      case 'meeting':
        return {
          label: 'Meeting',
          color: '#a78bfa',
          bg: 'rgba(139, 92, 246, 0.15)',
          border: 'rgba(139, 92, 246, 0.4)',
          icon: UsersRound
        };
      case 'reminder':
        return {
          label: 'Reminder',
          color: '#fbbf24',
          bg: 'rgba(245, 158, 11, 0.15)',
          border: 'rgba(245, 158, 11, 0.4)',
          icon: Bell
        };
      default: // task
        return {
          label: 'Task',
          color: '#34d399',
          bg: 'rgba(16, 185, 129, 0.15)',
          border: 'rgba(16, 185, 129, 0.4)',
          icon: CheckSquare
        };
    }
  };

  // Render priority dot
  const renderPriorityDot = (priority: PlannerPriority) => {
    const color = priority === 'high' ? 'var(--danger)' : priority === 'medium' ? 'var(--warning)' : 'var(--success)';
    return (
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: color,
          display: 'inline-block',
          flexShrink: 0
        }}
        title={`Priority: ${priority}`}
      />
    );
  };

  // Render Category Badge
  const renderCategoryBadge = (type: PlannerActivityType) => {
    const config = getCategoryConfig(type);
    const IconComponent = config.icon;
    return (
      <span
        style={{
          fontSize: '0.625rem',
          padding: '1px 6px',
          borderRadius: '4px',
          background: config.bg,
          border: `1px solid ${config.border}`,
          color: config.color,
          fontWeight: 700,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '3px'
        }}
      >
        <IconComponent size={9} />
        {config.label}
      </span>
    );
  };

  // Generate Month Grid Days
  const calendarDays = useMemo(() => {
    const days: { date: Date; dateStr: string; isCurrentMonth: boolean; isToday: boolean }[] = [];
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sunday
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

    // Previous month filler days
    const prevMonthEnd = new Date(year, month, 0).getDate();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthEnd - i);
      days.push({
        date: d,
        dateStr: formatLocalDate(d),
        isCurrentMonth: false,
        isToday: formatLocalDate(d) === '2026-10-26'
      });
    }

    // Current month days
    for (let i = 1; i <= totalDaysInMonth; i++) {
      const d = new Date(year, month, i);
      days.push({
        date: d,
        dateStr: formatLocalDate(d),
        isCurrentMonth: true,
        isToday: formatLocalDate(d) === '2026-10-26'
      });
    }

    // Next month filler days to complete grid (multiples of 7)
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      days.push({
        date: d,
        dateStr: formatLocalDate(d),
        isCurrentMonth: false,
        isToday: formatLocalDate(d) === '2026-10-26'
      });
    }

    return days;
  }, [year, month]);

  // Generate Week Grid Days
  const weekDays = useMemo(() => {
    const days: { date: Date; dateStr: string; isToday: boolean }[] = [];
    const curr = new Date(currentDate);
    const dayOfWeek = curr.getDay(); // 0 = Sunday
    const weekStart = new Date(curr);
    weekStart.setDate(curr.getDate() - dayOfWeek);

    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      days.push({
        date: d,
        dateStr: formatLocalDate(d),
        isToday: formatLocalDate(d) === '2026-10-26'
      });
    }
    return days;
  }, [currentDate]);

  // Formatted date string for selected date display
  const formattedSelectedDate = useMemo(() => {
    const [y, m, d] = selectedDateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }, [selectedDateStr]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', maxWidth: '100%' }}>
      
      {/* 1. Header with Breadcrumbs, Title, Subtitle, and Top Actions */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '14px'
      }}>
        <div>
          <nav aria-label="Breadcrumb" style={{ marginBottom: '4px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.75rem',
              color: 'var(--text-muted)'
            }}>
              <Link to="/dashboard" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
                Home
              </Link>
              <span>/</span>
              <span>Schedule &amp; Attendance</span>
              <span>/</span>
              <span style={{ color: 'var(--primary)', fontWeight: 600 }}>Activity Planner</span>
            </div>
          </nav>

          <h1 style={{
            fontSize: '1.6rem',
            margin: 0,
            fontWeight: 800,
            letterSpacing: '-0.02em',
            color: 'var(--text-main)'
          }}>
            Academic Calendar
          </h1>
          <p style={{
            margin: '3px 0 0',
            fontSize: '0.825rem',
            color: 'var(--text-muted)'
          }}>
            Manage classes, assessments, deadlines, and academic activities in one place.
          </p>
        </div>

        {/* Header Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleEnableDesktopAlerts}
            className="btn btn-secondary btn-sm"
            style={{
              fontSize: '0.775rem',
              padding: '6px 14px',
              borderRadius: 'var(--radius-md)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: notifStatus.permission === 'granted' ? '#34d399' : 'var(--text-main)'
            }}
          >
            {notifStatus.permission === 'granted' ? <BellRing size={14} /> : <Bell size={14} />}
            <span>{notifStatus.permission === 'granted' ? 'Reminders Active' : 'Enable Reminders'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenAddForDate(selectedDateStr)}
            className="btn btn-primary btn-sm"
            style={{
              fontSize: '0.8rem',
              padding: '7px 16px',
              borderRadius: 'var(--radius-md)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 600,
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
            }}
          >
            <Plus size={15} /> Add Activity
          </button>
        </div>
      </div>

      {/* Notification Toast Message */}
      {notifMessage && (
        <div style={{
          background: 'rgba(99, 102, 241, 0.12)',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          borderRadius: 'var(--radius-md)',
          padding: '8px 14px',
          fontSize: '0.8rem',
          color: 'var(--text-main)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Bell size={14} color="var(--primary)" /> {notifMessage}
        </div>
      )}

      {/* 2. TOP EXECUTIVE METRIC CARDS (Exact Theme & Styling from Pic 1) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '14px'
      }}>
        {/* CARD 1: PENDING TASKS (Amber Accent, matching Study Streak) */}
        <div className="card stat-card" style={{ borderLeft: '4px solid #f59e0b', padding: '16px 20px', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="text-muted text-xs font-semibold" style={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {isTrainer ? 'Trainer Action Queue' : 'Pending Tasks'}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#f59e0b', fontSize: '0.72rem', fontWeight: 700 }}>
              <Flame size={13} fill="#f59e0b" /> ACTIVE
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', margin: '8px 0 3px' }}>
            <span style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em', lineHeight: 1 }}>
              {isTrainer ? trainerPendingTasksCount : adminPendingTasksCount}
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>tasks to review</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
            Action items: <strong style={{ color: 'var(--text-main)' }}>{isTrainer ? 'Session preparation' : 'Faculty certifications'}</strong>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', background: 'var(--bg-input)', padding: '5px 8px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
            Requires admin action or trainer verification.
          </div>
        </div>

        {/* CARD 2: ASSESSMENT DEADLINES (Primary Indigo Accent, matching Study Time) */}
        <div className="card stat-card" style={{ borderLeft: '4px solid var(--primary)', padding: '16px 20px', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="text-muted text-xs font-semibold" style={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Assessment Deadlines
            </span>
            <span className="badge badge-primary" style={{ fontSize: '0.68rem', fontWeight: 700 }}>
              {isTrainer ? `${trainerUpcomingDeadlinesCount} milestones` : `${adminUpcomingDeadlinesCount} milestones`}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', margin: '8px 0 3px' }}>
            <span style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em', lineHeight: 1 }}>
              {isTrainer ? trainerUpcomingDeadlinesCount : adminUpcomingDeadlinesCount}
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>upcoming</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
            Next deadline: <strong style={{ color: 'var(--text-main)' }}>React Capstone (16:00)</strong>
          </div>
          <div className="progress-bar-bg" style={{ height: '6px', marginTop: '6px' }}>
            <div className="progress-bar-fill" style={{ width: '75%', background: 'var(--primary)' }} />
          </div>
        </div>

        {/* CARD 3: SCHEDULED SESSIONS & MEETINGS (Blue Accent, matching Lessons Completed) */}
        <div className="card stat-card" style={{ borderLeft: '4px solid #3B82F6', padding: '16px 20px', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="text-muted text-xs font-semibold" style={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {isTrainer ? "Today's Live Sessions" : 'Leadership Meetings'}
            </span>
            <span className="badge badge-secondary" style={{ fontSize: '0.68rem' }}>On Schedule</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', margin: '8px 0 3px' }}>
            <span style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em', lineHeight: 1 }}>
              {isTrainer ? trainerTodayClassesCount : adminScheduledMeetingsCount}
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>scheduled</span>
          </div>
          <div className="progress-bar-bg" style={{ height: '6px', margin: '6px 0 10px' }}>
            <div className="progress-bar-fill" style={{ width: '85%', background: '#3B82F6' }} />
          </div>
          <Link
            to={isTrainer ? '/live-sessions' : '/departments'}
            className="btn btn-secondary btn-sm"
            style={{ width: '100%', justifyContent: 'center', gap: '6px', fontSize: '0.76rem', padding: '4px 8px' }}
          >
            <Play size={11} color="var(--primary)" /> View In Live Sessions &rarr;
          </Link>
        </div>

        {/* CARD 4: OVERDUE AUDITS & GRADING (Emerald Accent, matching Consistency) */}
        <div className="card stat-card" style={{ borderLeft: '4px solid #10b981', padding: '16px 20px', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="text-muted text-xs font-semibold" style={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {isTrainer ? 'Pending Grading' : 'Overdue Audits'}
            </span>
            <span className="badge badge-success" style={{ fontSize: '0.68rem', fontWeight: 700 }}>
              {adminOverdueCount > 0 ? `${adminOverdueCount} past-due` : 'All Clear'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', margin: '8px 0 3px' }}>
            <span style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em', lineHeight: 1 }}>
              {isTrainer ? trainerAssessmentsNeedingAttentionCount : adminOverdueCount}
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>items</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
            Status: <strong style={{ color: 'var(--text-main)' }}>{adminOverdueCount > 0 ? 'Requires attention' : 'Turnout certified'}</strong>
          </div>
          <Link
            to="/attendance"
            className="btn btn-secondary btn-sm"
            style={{ width: '100%', justifyContent: 'center', gap: '6px', fontSize: '0.76rem', padding: '4px 8px' }}
          >
            Audit Attendance Ledger &rarr;
          </Link>
        </div>
      </div>

      {/* 3. MAIN SIDE-BY-SIDE LAYOUT (Calendar gets maximum space, Schedule box is compact) */}
      <div className="planner-calendar-layout">
        
        {/* ==================== LEFT COLUMN: THEMED CALENDAR (Pic 1 Style) ==================== */}
        <div className="card" style={{
          padding: '22px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)'
        }}>
          {/* Calendar Header with View Switcher & Navigation Controls (matching Pic 1) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '14px'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CalendarDays size={18} color="var(--primary)" />
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                  Academic Activity Calendar
                </h2>
              </div>
              <p className="text-secondary text-xs" style={{ margin: '4px 0 0 0' }}>
                Inspect and schedule classes, assessments, deadlines, and cohort events.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {/* View Switcher: [ Month View ] [ Week View ] [ Day View ] (Pill segmented control) */}
              <div
                style={{
                  display: 'inline-flex',
                  background: 'var(--bg-input)',
                  padding: '3px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                {(['month', 'week', 'day'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    className={`btn btn-sm ${viewMode === mode ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setViewMode(mode)}
                    style={{
                      padding: '5px 14px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      borderRadius: '6px',
                      textTransform: 'capitalize',
                      color: viewMode === mode ? '#ffffff' : 'var(--text-secondary)'
                    }}
                  >
                    {mode} View
                  </button>
                ))}
              </div>

              {/* Navigation Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handlePrev}
                  style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                  title="Previous period"
                >
                  <ChevronLeft size={14} /> Prev
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleToday}
                  style={{ padding: '6px 10px', fontSize: '0.75rem', fontWeight: 600 }}
                  title="Current Window"
                >
                  Today
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleNext}
                  style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                  title="Next period"
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Period Range Badge & Visible Legend (Exact matching Pic 1) */}
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
              border: '1px solid var(--border-subtle)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Period: {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })} (Current Academic Term)
              </span>
            </div>

            {/* Harmonized Category Legend */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'rgba(6, 182, 212, 0.25)', border: '1px solid #38bdf8' }} />
                <span>Classes &amp; Sessions</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'rgba(244, 63, 94, 0.25)', border: '1px solid #fb7185' }} />
                <span>Deadlines &amp; Exams</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'rgba(139, 92, 246, 0.25)', border: '1px solid #a78bfa' }} />
                <span>Leadership Meetings</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'rgba(16, 185, 129, 0.25)', border: '1px solid #10b981' }} />
                <span>Tasks</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'rgba(245, 158, 11, 0.25)', border: '1px solid #fbbf24' }} />
                <span>Reminders</span>
              </div>
            </div>
          </div>

          {/* Compact Search & Filter Toolbar */}
          <div style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            flexWrap: 'wrap'
          }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '160px' }}>
              <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search activities, courses, or notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '30px', fontSize: '0.76rem', height: '30px' }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer'
                  }}
                >
                  <X size={12} />
                </button>
              )}
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="form-select"
              style={{ width: 'auto', fontSize: '0.74rem', height: '30px', padding: '2px 8px' }}
            >
              <option value="all">All Types</option>
              <option value="task">Tasks</option>
              <option value="lms_event">Classes</option>
              <option value="meeting">Meetings</option>
              <option value="deadline">Deadlines</option>
              <option value="reminder">Reminders</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as any)}
              className="form-select"
              style={{ width: 'auto', fontSize: '0.74rem', height: '30px', padding: '2px 8px' }}
            >
              <option value="all">All Priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="form-select"
              style={{ width: 'auto', fontSize: '0.74rem', height: '30px', padding: '2px 8px' }}
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>

            {isFiltered && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="btn btn-secondary btn-sm"
                style={{
                  fontSize: '0.72rem',
                  height: '30px',
                  color: 'var(--danger)',
                  borderColor: 'rgba(239, 68, 68, 0.3)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <RotateCcw size={11} /> Reset
              </button>
            )}
          </div>

          {/* VIEW A: MONTH CALENDAR (WOW Dark Glass Tiles matching Pic 1) */}
          {viewMode === 'month' && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: '8px',
                width: '100%'
              }}
            >
              {calendarDays.map((day) => {
                const dayActivities = activitiesByDate[day.dateStr] || [];
                const isSelected = day.dateStr === selectedDateStr;
                const isToday = day.isToday;
                const weekdayAbbr = day.date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
                const hasActivities = dayActivities.length > 0;

                // Category-specific badge styling matching Pic 1
                const hasDeadline = dayActivities.some((a) => a.type === 'deadline');
                const hasClass = dayActivities.some((a) => a.type === 'lms_event');
                const hasMeeting = dayActivities.some((a) => a.type === 'meeting');
                const hasTask = dayActivities.some((a) => a.type === 'task');

                const badgeColor = hasDeadline
                  ? '#fb7185'
                  : hasClass
                  ? '#38bdf8'
                  : hasMeeting
                  ? '#a78bfa'
                  : hasTask
                  ? '#34d399'
                  : '#fbbf24';
                const badgeBg = hasDeadline
                  ? 'rgba(244, 63, 94, 0.16)'
                  : hasClass
                  ? 'rgba(6, 182, 212, 0.16)'
                  : hasMeeting
                  ? 'rgba(139, 92, 246, 0.16)'
                  : hasTask
                  ? 'rgba(16, 185, 129, 0.16)'
                  : 'rgba(245, 158, 11, 0.16)';
                const badgeBorder = hasDeadline
                  ? 'rgba(244, 63, 94, 0.35)'
                  : hasClass
                  ? 'rgba(6, 182, 212, 0.35)'
                  : hasMeeting
                  ? 'rgba(139, 92, 246, 0.35)'
                  : hasTask
                  ? 'rgba(16, 185, 129, 0.35)'
                  : 'rgba(245, 158, 11, 0.35)';
                const badgeSuffix = hasDeadline ? '★' : '✓';

                return (
                  <div
                    key={day.dateStr}
                    tabIndex={0}
                    role="button"
                    onClick={() => setSelectedDateStr(day.dateStr)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedDateStr(day.dateStr);
                      }
                    }}
                    style={{
                      background: isToday
                        ? 'linear-gradient(180deg, rgba(56, 189, 248, 0.18) 0%, rgba(15, 23, 42, 0.9) 100%)'
                        : isSelected
                        ? 'linear-gradient(180deg, rgba(99, 102, 241, 0.25) 0%, rgba(15, 23, 42, 0.9) 100%)'
                        : day.isCurrentMonth
                        ? hasActivities
                          ? 'rgba(15, 23, 42, 0.85)'
                          : 'rgba(15, 23, 42, 0.65)'
                        : 'rgba(15, 23, 42, 0.25)',
                      border: isSelected
                        ? '2.5px solid #ffffff'
                        : isToday
                        ? '2px solid #38bdf8'
                        : hasActivities
                        ? '1px solid rgba(56, 189, 248, 0.28)'
                        : '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '10px',
                      padding: '8px 6px',
                      minHeight: '82px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                      boxShadow: isSelected
                        ? '0 0 18px rgba(255, 255, 255, 0.5)'
                        : isToday
                        ? '0 0 14px rgba(56, 189, 248, 0.45), inset 0 0 8px rgba(56, 189, 248, 0.1)'
                        : 'none',
                      position: 'relative',
                      outline: 'none',
                      opacity: day.isCurrentMonth ? 1 : 0.35,
                      backdropFilter: 'blur(8px)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    {/* Today Badge pinned to top (Pic 1 Style) */}
                    {isToday && (
                      <span
                        style={{
                          position: 'absolute',
                          top: '-8px',
                          background: '#38bdf8',
                          color: '#040711',
                          fontSize: '0.6rem',
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

                    {/* Weekday Label (WED, THU, FRI... Pic 1 Style) */}
                    <span
                      style={{
                        fontSize: '0.66rem',
                        fontWeight: 700,
                        color: isToday ? '#38bdf8' : isSelected ? '#ffffff' : 'var(--text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em'
                      }}
                    >
                      {weekdayAbbr}
                    </span>

                    {/* Date Number (Big Bold Pic 1 Style) */}
                    <span
                      style={{
                        fontSize: '1.22rem',
                        fontWeight: 800,
                        color: isToday ? '#38bdf8' : isSelected ? '#ffffff' : 'var(--text-main)',
                        lineHeight: 1
                      }}
                    >
                      {day.date.getDate()}
                    </span>

                    {/* Activity Achievement Pill / Indicator (Pic 1 Style) */}
                    {hasActivities ? (
                      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                        <span
                          style={{
                            fontSize: '0.66rem',
                            fontWeight: 700,
                            background: isSelected ? 'rgba(255, 255, 255, 0.2)' : badgeBg,
                            color: isSelected ? '#ffffff' : badgeColor,
                            border: isSelected ? '1px solid rgba(255, 255, 255, 0.45)' : `1px solid ${badgeBorder}`,
                            padding: '1px 6px',
                            borderRadius: '5px',
                            whiteSpace: 'nowrap',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}
                        >
                          {dayActivities.length} item{dayActivities.length > 1 ? 's' : ''} {badgeSuffix}
                        </span>

                        {/* Colored Bottom Indicator Line (Exact Pic 1 Style) */}
                        <div
                          style={{
                            width: '68%',
                            height: '3px',
                            borderRadius: '2px',
                            background: badgeColor,
                            boxShadow: `0 0 8px ${badgeColor}`,
                            marginTop: '1px'
                          }}
                        />
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.65rem', color: 'rgba(255, 255, 255, 0.18)', fontWeight: 600 }}>
                        &mdash;
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* VIEW B: WEEK VIEW */}
          {viewMode === 'week' && (
            <div style={{ width: '100%', overflowX: 'auto' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, minmax(100px, 1fr))',
                gap: '8px',
                minWidth: '600px'
              }}>
                {weekDays.map((wDay) => {
                  const wActivities = activitiesByDate[wDay.dateStr] || [];
                  const isSelected = wDay.dateStr === selectedDateStr;

                  return (
                    <div
                      key={wDay.dateStr}
                      onClick={() => setSelectedDateStr(wDay.dateStr)}
                      style={{
                        background: isSelected ? 'rgba(99, 102, 241, 0.1)' : 'var(--bg-input)',
                        border: isSelected ? '2px solid #ffffff' : '1px solid var(--border-subtle)',
                        borderRadius: '10px',
                        padding: '10px 8px',
                        minHeight: '340px',
                        display: 'flex',
                        flexDirection: 'column',
                        cursor: 'pointer',
                        gap: '8px'
                      }}
                    >
                      <div style={{ textAlign: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px' }}>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                          {wDay.date.toLocaleDateString('default', { weekday: 'short' })}
                        </div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: wDay.isToday ? '#38bdf8' : 'var(--text-main)', marginTop: '2px' }}>
                          {wDay.date.getDate()}
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                        {wActivities.map((act) => {
                          const config = getCategoryConfig(act.type);
                          return (
                            <div
                              key={act.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDateStr(wDay.dateStr);
                                handleEditActivity(act);
                              }}
                              style={{
                                background: 'var(--bg-card)',
                                borderLeft: `3px solid ${config.color}`,
                                border: '1px solid var(--border-subtle)',
                                borderRadius: '4px',
                                padding: '6px 8px',
                                fontSize: '0.68rem'
                              }}
                            >
                              <div style={{ fontWeight: 600, color: 'var(--text-main)', lineHeight: 1.2 }}>
                                {act.title}
                              </div>
                              <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                {act.startTime || 'All day'}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* VIEW C: DAY VIEW */}
          {viewMode === 'day' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
                Timeline for {currentDate.toLocaleDateString('default', { weekday: 'long', month: 'short', day: 'numeric' })}
              </div>
              {(activitiesByDate[selectedDateStr] || []).map((act) => {
                const config = getCategoryConfig(act.type);
                const isDone = act.status === 'completed';
                return (
                  <div
                    key={act.id}
                    onClick={() => handleEditActivity(act)}
                    style={{
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                      <button
                        type="button"
                        onClick={(e) => handleToggleComplete(e, act.id)}
                        style={{
                          background: isDone ? 'var(--success)' : 'transparent',
                          border: `1px solid ${isDone ? 'var(--success)' : 'var(--text-muted)'}`,
                          color: '#fff',
                          width: '18px',
                          height: '18px',
                          borderRadius: '3px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          flexShrink: 0
                        }}
                      >
                        {isDone && <Check size={12} strokeWidth={3} />}
                      </button>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', textDecoration: isDone ? 'line-through' : 'none' }}>
                        {act.title}
                      </span>
                    </div>
                    {renderCategoryBadge(act.type)}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ==================== RIGHT COLUMN: SCHEDULE FOR [DATE] BOX (Compact 290px) ==================== */}
        <div className="card" style={{
          padding: '14px 14px',
          position: 'sticky',
          top: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
          maxWidth: '290px',
          width: '100%'
        }}>
          {/* Header for Selected Date Schedule */}
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '8px',
            borderBottom: '1px solid var(--border-subtle)',
            paddingBottom: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                background: 'rgba(99, 102, 241, 0.15)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <CalendarDays size={14} color="var(--primary)" />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <span style={{
                  fontSize: '0.62rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: 'var(--text-muted)',
                  fontWeight: 700,
                  display: 'block'
                }}>
                  Daily Schedule
                </span>
                <h3 style={{
                  margin: 0,
                  fontSize: '0.825rem',
                  fontWeight: 800,
                  color: 'var(--text-main)',
                  letterSpacing: '-0.01em',
                  lineHeight: 1.2,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }} title={`Schedule for ${formattedSelectedDate}`}>
                  Schedule for {formattedSelectedDate}
                </h3>
                <span style={{ fontSize: '0.675rem', color: 'var(--text-muted)' }}>
                  {selectedDateActivities.length} scheduled item{selectedDateActivities.length === 1 ? '' : 's'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleOpenAddForDate(selectedDateStr)}
              className="btn btn-primary btn-sm"
              style={{
                fontSize: '0.7rem',
                padding: '4px 8px',
                borderRadius: '4px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                flexShrink: 0
              }}
            >
              <Plus size={11} /> Add
            </button>
          </div>

          {/* Activity Cards List */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            maxHeight: 'calc(100vh - 280px)',
            minHeight: '320px',
            overflowY: 'auto',
            paddingRight: '2px'
          }}>
            {selectedDateActivities.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '36px 14px',
                background: 'var(--bg-input)',
                borderRadius: '8px',
                border: '1px dashed var(--border-subtle)',
                margin: 'auto 0'
              }}>
                <CalendarIcon size={26} color="var(--text-muted)" style={{ margin: '0 auto 6px' }} />
                <div style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  No activities scheduled
                </div>
                <p style={{ margin: '4px 0 12px', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  No sessions or tasks on this date.
                </p>
                <button
                  type="button"
                  onClick={() => handleOpenAddForDate(selectedDateStr)}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.72rem' }}
                >
                  <Plus size={11} style={{ marginRight: '3px' }} /> Schedule Activity
                </button>
              </div>
            ) : (
              selectedDateActivities.map((act) => {
                const isDone = act.status === 'completed';
                const config = getCategoryConfig(act.type);

                return (
                  <div
                    key={act.id}
                    onClick={() => handleEditActivity(act)}
                    style={{
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      padding: '10px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      transition: 'border-color 0.15s ease',
                      borderLeft: `3px solid ${config.color}`
                    }}
                  >
                    {/* Top Row: Checkbox, Title & Category */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', minWidth: 0, flex: 1 }}>
                        <button
                          type="button"
                          onClick={(e) => handleToggleComplete(e, act.id)}
                          style={{
                            background: isDone ? 'var(--success)' : 'transparent',
                            border: `1px solid ${isDone ? 'var(--success)' : 'var(--text-muted)'}`,
                            color: '#fff',
                            width: '16px',
                            height: '16px',
                            borderRadius: '3px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            flexShrink: 0,
                            marginTop: '2px'
                          }}
                          title={isDone ? 'Mark pending' : 'Mark completed'}
                        >
                          {isDone && <Check size={11} strokeWidth={3} />}
                        </button>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <span style={{
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            color: 'var(--text-main)',
                            textDecoration: isDone ? 'line-through' : 'none',
                            lineHeight: 1.25,
                            display: 'block'
                          }}>
                            {act.title}
                          </span>
                        </div>
                      </div>
                      {renderCategoryBadge(act.type)}
                    </div>

                    {/* Description snippet */}
                    {act.description && (
                      <p style={{
                        margin: 0,
                        fontSize: '0.7rem',
                        color: 'var(--text-muted)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        lineHeight: 1.3
                      }}>
                        {act.description}
                      </p>
                    )}

                    {/* Bottom Row: Time, Priority, and LMS Action */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.675rem',
                      color: 'var(--text-muted)',
                      borderTop: '1px solid var(--border-subtle)',
                      paddingTop: '5px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {renderPriorityDot(act.priority)}
                        <span>{act.startTime || 'All day'}{act.endTime ? ` – ${act.endTime}` : ''}</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {act.relatedLmsUrl && (
                          <Link
                            to={act.relatedLmsUrl}
                            onClick={(e) => e.stopPropagation()}
                            className="text-primary"
                            style={{ fontWeight: 600, textDecoration: 'none' }}
                          >
                            Open &rarr;
                          </Link>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditActivity(act);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            padding: '1px'
                          }}
                          title="Edit activity"
                        >
                          <PenTool size={11} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* Add / Edit Activity Modal */}
      <AddEditActivityModal
        isOpen={isModalOpen}
        activityToEdit={selectedActivity}
        initialDate={selectedDateStr}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveModal}
        onDelete={handleDeleteModal}
      />
    </div>
  );
};
