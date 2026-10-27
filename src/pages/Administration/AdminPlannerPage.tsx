import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus,
  Search, Filter, RotateCcw, Clock, CheckCircle2, AlertCircle,
  Bell, BellRing, Sparkles, BookOpen, GraduationCap,
  ArrowUpRight, UsersRound, Video, Award, PenTool, Check,
  ExternalLink, Layers, X
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
  getUpcoming7Days,
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

export const AdminPlannerPage: React.FC = () => {
  // Calendar view mode
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');

  // Currently focused date (defaults to Oct 22, 2026)
  const [currentDate, setCurrentDate] = useState<Date>(new Date(2026, 9, 22)); // Month is 0-indexed: 9 = October
  const [selectedDateStr, setSelectedDateStr] = useState<string>('2026-10-22');

  // Activity data
  const [activities, setActivities] = useState<PlannerActivity[]>([]);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<PlannerActivityType | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<PlannerPriority | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<PlannerStatus | 'all'>('all');
  const [sourceFilter, setSourceFilter] = useState<PlannerSource | 'all'>('all');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<PlannerActivity | null>(null);

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
      dispatchWebNotification('VeniLearn Academic Planner', 'Desktop alerts are enabled for your scheduled activities.');
      setNotifMessage('Desktop alerts successfully enabled!');
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
    const today = new Date(2026, 9, 22);
    setCurrentDate(today);
    setSelectedDateStr(formatLocalDate(today));
  };

  // Calculate Month Boundaries
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-11

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Get start of month & end of month
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);

  // Expanded recurring activities within viewed month window (plus buffer for grid days)
  const monthStartBuffer = new Date(year, month, -6);
  const monthEndBuffer = new Date(year, month + 1, 7);

  const expandedAll = useMemo(() => {
    return expandRecurringActivities(
      activities,
      formatLocalDate(monthStartBuffer),
      formatLocalDate(monthEndBuffer)
    );
  }, [activities, year, month]);

  // Apply search & filters
  const filteredActivities = useMemo(() => {
    return expandedAll.filter((act) => {
      // Type
      if (typeFilter !== 'all' && act.type !== typeFilter) return false;
      // Priority
      if (priorityFilter !== 'all' && act.priority !== priorityFilter) return false;
      // Status
      if (statusFilter !== 'all' && act.status !== statusFilter) return false;
      // Source
      if (sourceFilter !== 'all' && act.source !== sourceFilter) return false;
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
  }, [expandedAll, typeFilter, priorityFilter, statusFilter, sourceFilter, searchQuery]);

  const isFiltered =
    typeFilter !== 'all' ||
    priorityFilter !== 'all' ||
    statusFilter !== 'all' ||
    sourceFilter !== 'all' ||
    searchQuery.trim().length > 0;

  const clearAllFilters = () => {
    setTypeFilter('all');
    setPriorityFilter('all');
    setStatusFilter('all');
    setSourceFilter('all');
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

  // Top Focus & Overdue
  const topFocus = getTopFocusTasks('2026-10-22');
  const overdueReminders = getOverdueReminders('2026-10-22');
  const upcomingWeek = getUpcoming7Days('2026-10-22');

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
      />
    );
  };

  // Render Type Badge
  const renderTypeBadge = (type: PlannerActivityType) => {
    switch (type) {
      case 'meeting':
        return <span className="badge badge-primary" style={{ fontSize: '0.625rem', padding: '1px 5px' }}>Meeting</span>;
      case 'deadline':
        return <span className="badge badge-error" style={{ fontSize: '0.625rem', padding: '1px 5px' }}>Deadline</span>;
      case 'reminder':
        return <span className="badge badge-warning" style={{ fontSize: '0.625rem', padding: '1px 5px' }}>Reminder</span>;
      case 'lms_event':
        return <span className="badge badge-success" style={{ fontSize: '0.625rem', padding: '1px 5px' }}>LMS Event</span>;
      default:
        return <span className="badge badge-secondary" style={{ fontSize: '0.625rem', padding: '1px 5px' }}>Task</span>;
    }
  };

  // Generate Month Grid Days
  const calendarDays = useMemo(() => {
    const days: { date: Date; dateStr: string; isCurrentMonth: boolean; isToday: boolean }[] = [];
    const firstDayIndex = monthStart.getDay(); // 0 = Sunday
    const totalDaysInMonth = monthEnd.getDate();

    // Previous month filler days
    const prevMonthEnd = new Date(year, month, 0).getDate();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthEnd - i);
      days.push({
        date: d,
        dateStr: formatLocalDate(d),
        isCurrentMonth: false,
        isToday: formatLocalDate(d) === '2026-10-22'
      });
    }

    // Current month days
    for (let i = 1; i <= totalDaysInMonth; i++) {
      const d = new Date(year, month, i);
      days.push({
        date: d,
        dateStr: formatLocalDate(d),
        isCurrentMonth: true,
        isToday: formatLocalDate(d) === '2026-10-22'
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
        isToday: formatLocalDate(d) === '2026-10-22'
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
        isToday: formatLocalDate(d) === '2026-10-22'
      });
    }
    return days;
  }, [currentDate]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. Header with Breadcrumbs, Title, Navigation, and Action Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="badge badge-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <CalendarIcon size={12} /> Institution Academic Planner
            </span>
          </div>
          <h1 style={{ fontSize: '1.75rem', margin: 0, fontWeight: 800 }}>
            Academic Activity & Calendar Planner
          </h1>
          <p className="text-secondary text-sm" style={{ margin: '3px 0 0' }}>
            Organize administrative deadlines, faculty sessions, live webinars, cohort milestones, and reminders
          </p>
        </div>

        {/* Top Right Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Notification Button */}
          {notifStatus.supported && (
            <button
              type="button"
              onClick={handleEnableDesktopAlerts}
              className="btn btn-secondary btn-sm"
              style={{
                fontSize: '0.75rem',
                padding: '6px 10px',
                color: notifStatus.permission === 'granted' ? 'var(--success)' : 'var(--text-muted)'
              }}
              title={notifStatus.permission === 'granted' ? 'Desktop alerts enabled' : 'Click to enable desktop alerts'}
            >
              {notifStatus.permission === 'granted' ? <BellRing size={13} style={{ marginRight: '4px' }} /> : <Bell size={13} style={{ marginRight: '4px' }} />}
              {notifStatus.permission === 'granted' ? 'Desktop Alerts Active' : 'Enable Alerts'}
            </button>
          )}

          <button
            type="button"
            onClick={() => handleOpenAddForDate(selectedDateStr)}
            className="btn btn-primary btn-sm"
            style={{ fontSize: '0.8rem', padding: '6px 14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={15} /> Add Activity
          </button>
        </div>
      </div>

      {/* Notification Toast Message */}
      {notifMessage && (
        <div style={{
          background: 'rgba(99, 102, 241, 0.15)',
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

      {/* 2. Overdue Reminders Alert Banner (if any) */}
      {overdueReminders.length > 0 && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertCircle size={20} color="var(--danger)" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--danger)' }}>
                {overdueReminders.length} Overdue Reminder{overdueReminders.length > 1 ? 's' : ''} Awaiting Attention
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Past-due administrative reviews: {overdueReminders.map(o => o.title).join(', ')}
              </div>
            </div>
          </div>
          <Link to="/attendance" className="btn btn-secondary btn-sm" style={{ fontSize: '0.725rem' }}>
            Review In Ledger &rarr;
          </Link>
        </div>
      )}

      {/* 3. Top Focus Area: 3 Top Tasks */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(6, 182, 212, 0.08))',
        border: '1px solid rgba(99, 102, 241, 0.25)',
        borderRadius: 'var(--radius-lg)',
        padding: '14px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={15} color="var(--primary)" />
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, color: 'var(--primary)', textTransform: 'uppercase' }}>
              Today's Focus: Top Admin Actions
            </h3>
          </div>
          <span className="text-muted text-xs">Thursday, Oct 22, 2026</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px' }}>
          {topFocus.map((task) => {
            const isDone = task.status === 'completed';
            return (
              <div
                key={task.id}
                style={{
                  background: 'var(--bg-card)',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 12px',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  opacity: isDone ? 0.6 : 1
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                  <button
                    type="button"
                    onClick={(e) => handleToggleComplete(e, task.id)}
                    style={{
                      background: isDone ? 'var(--success)' : 'transparent',
                      border: `1px solid ${isDone ? 'var(--success)' : 'var(--text-muted)'}`,
                      color: '#fff',
                      width: '18px',
                      height: '18px',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      flexShrink: 0
                    }}
                    title={isDone ? 'Mark as pending' : 'Mark as completed'}
                  >
                    {isDone && <Check size={12} strokeWidth={3} />}
                  </button>

                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{
                      fontSize: '0.825rem',
                      fontWeight: 600,
                      color: 'var(--text-main)',
                      textDecoration: isDone ? 'line-through' : 'none',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {task.title}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {renderPriorityDot(task.priority)}
                      <span>{task.startTime || 'All Day'}</span>
                      {task.relatedLmsTitle && (
                        <span>&bull; {task.relatedLmsTitle}</span>
                      )}
                    </div>
                  </div>
                </div>

                {task.relatedLmsUrl && (
                  <Link
                    to={task.relatedLmsUrl}
                    className="text-primary text-xs"
                    style={{ fontWeight: 600, flexShrink: 0, textDecoration: 'none' }}
                  >
                    Open &rarr;
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Controls Bar: View Toggle, Navigation & Filters */}
      <div className="card" style={{ padding: '14px 18px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '14px'
        }}>
          {/* Navigation Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                type="button"
                onClick={handlePrev}
                className="btn btn-secondary btn-sm"
                style={{ padding: '5px 8px' }}
                aria-label="Previous period"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="btn btn-secondary btn-sm"
                style={{ padding: '5px 8px' }}
                aria-label="Next period"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <button
              type="button"
              onClick={handleToday}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.775rem', fontWeight: 600 }}
            >
              Today
            </button>

            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, minWidth: '170px' }}>
              {viewMode === 'day'
                ? currentDate.toLocaleDateString('default', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
                : monthName}
            </h2>
          </div>

          {/* View Mode Switcher */}
          <div style={{
            display: 'flex',
            background: 'var(--bg-input)',
            borderRadius: 'var(--radius-md)',
            padding: '2px',
            border: '1px solid var(--border-subtle)'
          }}>
            {(['month', 'week', 'day'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                style={{
                  background: viewMode === mode ? 'var(--primary)' : 'transparent',
                  color: viewMode === mode ? '#fff' : 'var(--text-muted)',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  padding: '5px 12px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  textTransform: 'capitalize',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {mode} View
              </button>
            ))}
          </div>
        </div>

        {/* Filters Bar */}
        <div style={{
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          flexWrap: 'wrap',
          borderTop: '1px solid var(--border-subtle)',
          paddingTop: '12px'
        }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: 1, minWidth: '170px' }}>
            <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search activity title, notes, or LMS course..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '28px', fontSize: '0.75rem', height: '30px' }}
            />
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="form-select"
            style={{ width: 'auto', fontSize: '0.75rem', height: '30px', padding: '3px 8px' }}
          >
            <option value="all">All Activity Types</option>
            <option value="task">Tasks</option>
            <option value="reminder">Reminders</option>
            <option value="meeting">Meetings</option>
            <option value="deadline">Deadlines</option>
            <option value="lms_event">LMS Events</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as any)}
            className="form-select"
            style={{ width: 'auto', fontSize: '0.75rem', height: '30px', padding: '3px 8px' }}
          >
            <option value="all">All Priorities</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="form-select"
            style={{ width: 'auto', fontSize: '0.75rem', height: '30px', padding: '3px 8px' }}
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>

          {/* Source Filter */}
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value as any)}
            className="form-select"
            style={{ width: 'auto', fontSize: '0.75rem', height: '30px', padding: '3px 8px' }}
          >
            <option value="all">All Sources</option>
            <option value="manual">Admin Created</option>
            <option value="lms_auto">LMS Auto Synced</option>
          </select>

          {isFiltered && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.725rem', height: '30px', color: 'var(--danger)', borderColor: 'var(--danger-border)' }}
            >
              <RotateCcw size={11} style={{ marginRight: '3px' }} /> Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* 5. Calendar Body Layout (Main Calendar + Sidebar Agenda) */}
      <div className={`planner-main-grid ${viewMode === 'month' ? 'has-sidebar' : 'no-sidebar'}`}>
        {/* Main View Area */}
        <div className="card" style={{ padding: '16px', overflow: 'hidden' }}>
          
          {/* A. MONTH VIEW */}
          {viewMode === 'month' && (
            <div>
              {/* Day of Week Headers */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', marginBottom: '8px' }}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                  <div key={d} style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', padding: '6px 0' }}>
                    {d}
                  </div>
                ))}
              </div>

              {/* Month Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                {calendarDays.map((day) => {
                  const dayActivities = activitiesByDate[day.dateStr] || [];
                  const isSelected = day.dateStr === selectedDateStr;

                  return (
                    <div
                      key={day.dateStr}
                      onClick={() => setSelectedDateStr(day.dateStr)}
                      className="planner-month-cell"
                      style={{
                        background: isSelected
                          ? 'rgba(99, 102, 241, 0.12)'
                          : day.isCurrentMonth
                            ? 'var(--bg-input)'
                            : 'rgba(255, 255, 255, 0.02)',
                        border: isSelected
                          ? '2px solid var(--primary)'
                          : day.isToday
                            ? '2px solid var(--accent-cyan)'
                            : '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        opacity: day.isCurrentMonth ? 1 : 0.45,
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: day.isToday ? 800 : 600,
                          color: day.isToday ? 'var(--accent-cyan)' : 'var(--text-main)',
                          background: day.isToday ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
                          padding: '1px 4px',
                          borderRadius: '3px'
                        }}>
                          {day.date.getDate()}
                        </span>

                        {dayActivities.length > 0 && (
                          <span className="badge badge-secondary" style={{ fontSize: '0.6rem', padding: '0 4px', fontWeight: 700 }}>
                            {dayActivities.length}
                          </span>
                        )}
                      </div>

                      {/* Desktop mini event text tags */}
                      <div className="planner-month-cell-title" style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px' }}>
                        {dayActivities.slice(0, 2).map((a) => (
                          <div
                            key={a.id}
                            title={`${a.title} (${a.startTime || 'All day'})`}
                            style={{
                              fontSize: '0.625rem',
                              padding: '1px 3px',
                              borderRadius: '2px',
                              background: a.priority === 'high' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                              color: a.priority === 'high' ? 'var(--danger)' : 'var(--primary)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              lineHeight: 1.2
                            }}
                          >
                            {a.title}
                          </div>
                        ))}
                        {dayActivities.length > 2 && (
                          <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>
                            +{dayActivities.length - 2} more
                          </span>
                        )}
                      </div>

                      {/* Mobile compact dot indicators */}
                      <div className="planner-month-cell-dots" style={{ gap: '3px', justifyContent: 'center', alignItems: 'center', marginTop: '4px', flexWrap: 'wrap' }}>
                        {dayActivities.slice(0, 3).map((a) => (
                          <span
                            key={a.id}
                            style={{
                              width: '5px',
                              height: '5px',
                              borderRadius: '50%',
                              backgroundColor: a.priority === 'high' ? 'var(--danger)' : 'var(--primary)'
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* B. WEEK VIEW */}
          {viewMode === 'week' && (
            <div className="planner-week-scroll">
              <div className="planner-week-grid">
                {weekDays.map((wDay) => {
                  const wActivities = activitiesByDate[wDay.dateStr] || [];
                  const isSelected = wDay.dateStr === selectedDateStr;

                  return (
                    <div
                      key={wDay.dateStr}
                      onClick={() => setSelectedDateStr(wDay.dateStr)}
                      style={{
                        background: isSelected ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-input)',
                        border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border-subtle)'}`,
                        borderRadius: 'var(--radius-md)',
                        padding: '10px',
                        minHeight: '380px',
                        display: 'flex',
                        flexDirection: 'column',
                        cursor: 'pointer'
                      }}
                    >
                    {/* Header */}
                    <div style={{
                      textAlign: 'center',
                      borderBottom: '1px solid var(--border-subtle)',
                      paddingBottom: '8px',
                      marginBottom: '8px'
                    }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                        {wDay.date.toLocaleDateString('default', { weekday: 'short' })}
                      </div>
                      <div style={{
                        fontSize: '1rem',
                        fontWeight: 800,
                        color: wDay.isToday ? 'var(--accent-cyan)' : 'var(--text-main)',
                        marginTop: '2px'
                      }}>
                        {wDay.date.getDate()}
                      </div>
                    </div>

                    {/* Week Day Activities */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                      {wActivities.map((act) => (
                        <div
                          key={act.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditActivity(act);
                          }}
                          style={{
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '6px 8px',
                            fontSize: '0.725rem'
                          }}
                        >
                          <div style={{ fontWeight: 600, color: 'var(--text-main)', lineHeight: 1.2 }}>
                            {act.title}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                            {renderPriorityDot(act.priority)}
                            <span>{act.startTime || 'All day'}</span>
                          </div>
                        </div>
                      ))}

                      {wActivities.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '20px 4px', color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                          No activities
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              </div>
            </div>
          )}

          {/* C. DAY VIEW */}
          {viewMode === 'day' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <h3 style={{ fontSize: '1.1rem', margin: 0 }}>
                  Agenda for {currentDate.toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </h3>
                <button
                  type="button"
                  onClick={() => handleOpenAddForDate(selectedDateStr)}
                  className="btn btn-primary btn-sm"
                  style={{ fontSize: '0.75rem' }}
                >
                  <Plus size={12} style={{ marginRight: '4px' }} /> Add to Day
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {(activitiesByDate[selectedDateStr] || []).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 16px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
                    <CalendarIcon size={28} color="var(--text-muted)" style={{ margin: '0 auto 8px' }} />
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>No activities scheduled for this day</div>
                    <p className="text-muted text-xs" style={{ margin: '4px 0 12px' }}>
                      Add a task, session, or reminder to plan your administrative workflow.
                    </p>
                    <button
                      type="button"
                      onClick={() => handleOpenAddForDate(selectedDateStr)}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.75rem' }}
                    >
                      <Plus size={12} style={{ marginRight: '4px' }} /> Schedule Activity
                    </button>
                  </div>
                ) : (
                  (activitiesByDate[selectedDateStr] || []).map((act) => (
                    <div
                      key={act.id}
                      onClick={() => handleEditActivity(act)}
                      style={{
                        background: 'var(--bg-input)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        padding: '12px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                        <button
                          type="button"
                          onClick={(e) => handleToggleComplete(e, act.id)}
                          style={{
                            background: act.status === 'completed' ? 'var(--success)' : 'transparent',
                            border: `1px solid ${act.status === 'completed' ? 'var(--success)' : 'var(--text-muted)'}`,
                            color: '#fff',
                            width: '20px',
                            height: '20px',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            flexShrink: 0
                          }}
                        >
                          {act.status === 'completed' && <Check size={13} strokeWidth={3} />}
                        </button>

                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{
                              fontWeight: 600,
                              fontSize: '0.9rem',
                              color: 'var(--text-main)',
                              textDecoration: act.status === 'completed' ? 'line-through' : 'none'
                            }}>
                              {act.title}
                            </span>
                            {renderTypeBadge(act.type)}
                            {act.source === 'lms_auto' && (
                              <span className="badge badge-secondary" style={{ fontSize: '0.625rem', padding: '1px 4px' }}>
                                LMS Auto
                              </span>
                            )}
                          </div>
                          {act.description && (
                            <p className="text-secondary text-xs" style={{ margin: '4px 0 0' }}>
                              {act.description}
                            </p>
                          )}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                            {renderPriorityDot(act.priority)}
                            <Clock size={11} /> {act.startTime || 'All Day'}{act.endTime ? ` - ${act.endTime}` : ''}
                            {act.reminder !== 'none' && (
                              <span>&bull; Reminder: {act.reminder.replace('_', ' ')}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {act.relatedLmsUrl && (
                        <Link
                          to={act.relatedLmsUrl}
                          onClick={(e) => e.stopPropagation()}
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                        >
                          Open &rarr;
                        </Link>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar: Selected Date Agenda Details & Quick Summary */}
        {viewMode === 'month' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Selected Date Card */}
            <div className="card" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '1rem', margin: 0, fontWeight: 700 }}>
                    {selectedDateStr === '2026-10-22' ? "Today's Agenda" : `Agenda for ${selectedDateStr}`}
                  </h3>
                  <span className="text-muted text-xs">
                    {selectedDateActivities.length} scheduled item{selectedDateActivities.length === 1 ? '' : 's'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenAddForDate(selectedDateStr)}
                  className="btn btn-primary btn-sm"
                  style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                  title="Add activity for this date"
                >
                  <Plus size={12} /> Add
                </button>
              </div>

              {/* Items for selected date */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '360px', overflowY: 'auto' }}>
                {selectedDateActivities.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '24px 10px',
                    background: 'var(--bg-input)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px dashed var(--border-subtle)'
                  }}>
                    <CalendarIcon size={20} color="var(--text-muted)" style={{ margin: '0 auto 6px' }} />
                    <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>No activities on this date</div>
                    <button
                      type="button"
                      onClick={() => handleOpenAddForDate(selectedDateStr)}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.7rem', marginTop: '6px' }}
                    >
                      <Plus size={11} style={{ marginRight: '3px' }} /> Create Activity
                    </button>
                  </div>
                ) : (
                  selectedDateActivities.map((act) => (
                    <div
                      key={act.id}
                      onClick={() => handleEditActivity(act)}
                      style={{
                        background: 'var(--bg-input)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '8px 10px',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                          <button
                            type="button"
                            onClick={(e) => handleToggleComplete(e, act.id)}
                            style={{
                              background: act.status === 'completed' ? 'var(--success)' : 'transparent',
                              border: `1px solid ${act.status === 'completed' ? 'var(--success)' : 'var(--text-muted)'}`,
                              color: '#fff',
                              width: '16px',
                              height: '16px',
                              borderRadius: '3px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              flexShrink: 0
                            }}
                          >
                            {act.status === 'completed' && <Check size={11} strokeWidth={3} />}
                          </button>
                          <span style={{
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            color: 'var(--text-main)',
                            textDecoration: act.status === 'completed' ? 'line-through' : 'none',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {act.title}
                          </span>
                        </div>
                        {renderTypeBadge(act.type)}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.675rem', color: 'var(--text-muted)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {renderPriorityDot(act.priority)}
                          <span>{act.startTime || 'All day'}</span>
                        </div>
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
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Upcoming 7 Days Quick Overview */}
            <div className="card" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 700, margin: 0 }}>
                  Next 7 Days Ahead
                </h4>
                <span className="badge badge-secondary" style={{ fontSize: '0.65rem' }}>
                  {upcomingWeek.length} items
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '240px', overflowY: 'auto' }}>
                {upcomingWeek.slice(0, 5).map((up) => (
                  <div
                    key={up.id}
                    onClick={() => {
                      setSelectedDateStr(up.date);
                      handleEditActivity(up);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.75rem',
                      padding: '6px 8px',
                      background: 'var(--bg-input)',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {up.title}
                      </div>
                      <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)' }}>
                        {up.date} &bull; {up.startTime || 'All day'}
                      </div>
                    </div>
                    {renderTypeBadge(up.type)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
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
