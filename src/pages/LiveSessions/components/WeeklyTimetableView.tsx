import React, { useState, useMemo } from 'react';
import { useAuthStore } from '../../../lib/store';
import { useCohortStore } from '../../../lib/cohortStore';
import { mockCourses } from '../../../data/mockData';
import { LiveSession } from '../../../types';
import {
  Calendar, Clock, Users, Video, Search, ChevronLeft, ChevronRight,
  Download, Filter, Plus, Building2, UserCheck, CheckCircle2,
  CalendarDays, Layers, Sparkles, BookOpen, ExternalLink, Printer
} from 'lucide-react';
import { GoogleMeetIcon, GoogleMeetJoinButton } from '../../../components/GoogleMeet';

interface Props {
  sessions: LiveSession[];
  onSelectSession: (session: LiveSession) => void;
  onLaunchLiveRoom: (session: LiveSession) => void;
  onOpenScheduleModal?: () => void;
  showNotice?: (msg: string) => void;
}

export const WeeklyTimetableView: React.FC<Props> = ({
  sessions,
  onSelectSession,
  onLaunchLiveRoom,
  onOpenScheduleModal,
  showNotice = () => {},
}) => {
  const { user } = useAuthStore();
  const { cohorts } = useCohortStore();

  const isTrainer = user?.activeRole === 'trainer' || user?.activeRole === 'instructor';
  const isStudent = user?.activeRole === 'student' || user?.activeRole === 'learner';
  const isAdmin = user?.activeRole === 'org_admin' || user?.activeRole === 'platform_admin' || user?.activeRole === 'lms_admin';

  // Filters and Modes
  const [timetableMode, setTimetableMode] = useState<'week' | 'day' | 'list'>('week');
  const [currentWeekDate, setCurrentWeekDate] = useState<Date>(() => new Date('2026-10-19T00:00:00'));
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCohort, setSelectedCohort] = useState('all');
  const [myClassesOnly, setMyClassesOnly] = useState(isStudent || isTrainer);

  // Student Cohorts
  const studentCohortIds = useMemo(() => {
    return ['coh-001', 'coh-002', 'coh-004'];
  }, []);

  // Determine weekday helper
  const getSessionWeekday = (s: LiveSession): string => {
    if (s.dayOfWeek) return s.dayOfWeek;
    if (s.date) {
      try {
        const parsed = new Date(`${s.date}T00:00:00`);
        if (!isNaN(parsed.getTime())) {
          return parsed.toLocaleDateString('en-US', { weekday: 'long' });
        }
      } catch {
        // fallback
      }
    }
    return 'Monday';
  };

  // Week calculation helpers
  const getWeekDates = (base: Date) => {
    const current = new Date(base);
    const day = current.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(current);
    monday.setDate(current.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);

    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const nextDay = new Date(monday);
      nextDay.setDate(monday.getDate() + i);
      days.push(nextDay);
    }
    return days;
  };

  const weekDates = useMemo(() => getWeekDates(currentWeekDate), [currentWeekDate]);

  const weekRangeText = useMemo(() => {
    const start = weekDates[0];
    const end = weekDates[weekDates.length - 1];
    const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
    const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
    const startDay = start.getDate();
    const endDay = end.getDate();
    const year = end.getFullYear();

    if (startMonth === endMonth) {
      return `${startMonth} ${startDay} – ${endDay}, ${year}`;
    }
    return `${startMonth} ${startDay} – ${endMonth} ${endDay}, ${year}`;
  }, [weekDates]);

  const goToToday = () => {
    setCurrentWeekDate(new Date('2026-10-19T00:00:00'));
  };

  const goToPrevWeek = () => {
    setCurrentWeekDate((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() - 7);
      return next;
    });
  };

  const goToNextWeek = () => {
    setCurrentWeekDate((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + 7);
      return next;
    });
  };

  // Filter timetable sessions
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      // Role & personalization filter
      if (myClassesOnly) {
        if (isStudent) {
          const sId = user?.id || 'u-007';
          const isTargeted = s.targetStudentIds && s.targetStudentIds.includes(sId);
          const isInCohort = s.cohortId && studentCohortIds.includes(s.cohortId);
          if (!isTargeted && !isInCohort) return false;
        } else if (isTrainer) {
          const tId = user?.id || 'u-004';
          const isInstructor = s.instructorId === tId || s.createdBy === tId;
          const isTargetedStaff = s.targetStaffIds && s.targetStaffIds.includes(tId);
          if (!isInstructor && !isTargetedStaff) return false;
        }
      }

      // Cohort filter
      if (selectedCohort !== 'all') {
        const cohortObj = cohorts.find((c) => c.id === s.cohortId || c.name === s.cohortId);
        const matchesCohort =
          s.cohortId === selectedCohort ||
          s.cohortName?.toLowerCase() === selectedCohort.toLowerCase() ||
          cohortObj?.name.toLowerCase() === selectedCohort.toLowerCase() ||
          cohortObj?.id.toLowerCase() === selectedCohort.toLowerCase();
        if (!matchesCohort) return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = s.title.toLowerCase().includes(q);
        const matchesFaculty = s.instructorName?.toLowerCase().includes(q);
        const matchesCourse = (s.courseTitle || '').toLowerCase().includes(q);
        const matchesRoom = (s.room || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesFaculty && !matchesCourse && !matchesRoom) return false;
      }

      return true;
    });
  }, [sessions, myClassesOnly, isStudent, isTrainer, user?.id, studentCohortIds, selectedCohort, cohorts, searchQuery]);

  // Unique deduplicated sessions
  const uniqueSessions = useMemo(() => {
    const seen = new Set<string>();
    return filteredSessions.filter((s) => {
      if (seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    });
  }, [filteredSessions]);

  const weekdaysList = useMemo(() => {
    const hasWeekend = uniqueSessions.some((s) => {
      const d = getSessionWeekday(s);
      return d === 'Saturday' || d === 'Sunday';
    });
    return hasWeekend
      ? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
      : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  }, [uniqueSessions]);

  const weeklySchedule = useMemo(() => {
    return weekdaysList.map((day) => {
      const slots = uniqueSessions
        .filter((s) => getSessionWeekday(s) === day)
        .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))
        .map((s) => {
          const cohortObj = cohorts.find((c) => c.id === s.cohortId);
          const cohortDisplayName = s.cohortName || cohortObj?.name || (s.cohortId ? s.cohortId : 'All Cohorts');
          return {
            id: s.id,
            time: s.startTime && s.endTime ? `${s.startTime} - ${s.endTime}` : s.startTime || 'TBA',
            title: s.title,
            cohort: cohortDisplayName,
            cohortId: s.cohortId,
            faculty: s.instructorName || 'Faculty Trainer',
            instructorId: s.instructorId,
            room: s.room || (s.meetingUrl ? 'Virtual Room' : 'Campus Hall'),
            status: s.status,
            rawSession: s,
          };
        });
      return { day, slots };
    });
  }, [weekdaysList, uniqueSessions, cohorts]);

  // Course Color Helper
  const getCourseColor = (courseId?: string, title?: string): string => {
    if (courseId === 'crs-001' || title?.toLowerCase().includes('javascript')) return '#6366f1';
    if (courseId === 'crs-002' || title?.toLowerCase().includes('react')) return '#06b6d4';
    if (courseId === 'crs-003' || title?.toLowerCase().includes('python')) return '#10b981';
    if (courseId === 'crs-004' || title?.toLowerCase().includes('typescript')) return '#8b5cf6';
    if (courseId === 'crs-005' || title?.toLowerCase().includes('cloud') || title?.toLowerCase().includes('aws')) return '#f59e0b';
    return '#3b82f6';
  };

  // Stats
  const totalClassesThisWeek = uniqueSessions.length;
  const totalMinutesThisWeek = uniqueSessions.reduce((acc, curr) => acc + (curr.durationMinutes || curr.duration || 60), 0);
  const totalHoursText = `${(totalMinutesThisWeek / 60).toFixed(1)} hrs`;
  const liveCount = uniqueSessions.filter((s) => s.status === 'live').length;

  // Export timetable as .ics calendar file
  const handleExportCalendar = () => {
    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//VeniLearn LMS//Weekly Timetable//EN',
      'CALSCALE:GREGORIAN',
    ];

    uniqueSessions.forEach((s) => {
      const dateStr = (s.date || '2026-10-19').replace(/-/g, '');
      const startClean = (s.startTime || '09:00').replace(':', '') + '00';
      const endClean = (s.endTime || '10:30').replace(':', '') + '00';

      icsContent.push('BEGIN:VEVENT');
      icsContent.push(`UID:session-${s.id}@venilearn.com`);
      icsContent.push(`DTSTAMP:${dateStr}T${startClean}Z`);
      icsContent.push(`DTSTART:${dateStr}T${startClean}`);
      icsContent.push(`DTEND:${dateStr}T${endClean}`);
      icsContent.push(`SUMMARY:${s.title}`);
      icsContent.push(`DESCRIPTION:${s.courseTitle || 'Course Lecture'} - Instructor: ${s.instructorName || 'Faculty'}`);
      icsContent.push(`LOCATION:${s.room || s.meetingUrl || 'Campus'}`);
      icsContent.push('END:VEVENT');
    });

    icsContent.push('END:VCALENDAR');

    const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `VeniLearn_Weekly_Timetable_${weekRangeText.replace(/[^a-zA-Z0-9]/g, '_')}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showNotice('Weekly timetable exported (.ics file downloaded)! Import into Google Calendar, Apple Calendar or Outlook.');
  };

  // Print timetable
  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Metric Highlights Strip */}
      <div className="grid-4" style={{ gap: '16px' }}>
        <div className="stat-card" style={{ borderLeft: '4px solid var(--primary)', padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span className="text-secondary text-xs font-semibold">Classes This Week</span>
            <Calendar size={18} color="var(--primary)" />
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-main)' }}>
            {totalClassesThisWeek}
          </div>
          <span className="text-xs text-secondary">Spread across {weekdaysList.length} weekdays</span>
        </div>

        <div className="stat-card" style={{ borderLeft: '4px solid var(--sky-blue)', padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span className="text-secondary text-xs font-semibold">Total Scheduled Time</span>
            <Clock size={18} color="var(--sky-blue)" />
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--sky-blue)' }}>
            {totalHoursText}
          </div>
          <span className="text-xs text-secondary">Weekly dedicated instructional time</span>
        </div>

        <div className="stat-card" style={{ borderLeft: '4px solid var(--success)', padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span className="text-secondary text-xs font-semibold">Enrolled Cohort</span>
            <Users size={18} color="var(--success)" />
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px' }}>
            Spring 2026 Eng.
          </div>
          <span className="text-xs text-secondary">Batch 1 • Computer Science</span>
        </div>

        <div className="stat-card" style={{ borderLeft: '4px solid #F232A9', padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span className="text-secondary text-xs font-semibold">Live Broadcasting</span>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: liveCount > 0 ? '#F232A9' : 'var(--text-muted)',
                boxShadow: liveCount > 0 ? '0 0 10px #F232A9' : 'none',
              }}
            />
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: liveCount > 0 ? '#F232A9' : 'var(--text-main)' }}>
            {liveCount}
          </div>
          <span className="text-xs text-secondary">{liveCount > 0 ? 'Class currently in session' : 'No active live stream'}</span>
        </div>
      </div>

      {/* Control Toolbar */}
      <div
        className="card"
        style={{
          padding: '14px 18px',
          background: 'var(--bg-surface)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          {/* Week Date Navigator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={goToToday}
              style={{ fontWeight: 600, fontSize: '0.8rem', padding: '6px 14px' }}
            >
              Current Week
            </button>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                background: 'var(--bg-card)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                overflow: 'hidden',
              }}
            >
              <button
                className="btn btn-icon btn-sm"
                onClick={goToPrevWeek}
                title="Previous week"
                style={{ border: 'none', background: 'transparent', padding: '6px 10px', borderRadius: 0 }}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                className="btn btn-icon btn-sm"
                onClick={goToNextWeek}
                title="Next week"
                style={{ border: 'none', background: 'transparent', padding: '6px 10px', borderRadius: 0 }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
            <span style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CalendarDays size={16} color="var(--primary)" />
              {weekRangeText}
            </span>
          </div>

          {/* Action Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* My Classes Only Toggle */}
            {(isStudent || isTrainer) && (
              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: myClassesOnly ? 'rgba(99, 102, 241, 0.1)' : 'var(--bg-card)',
                  border: myClassesOnly ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                  color: myClassesOnly ? 'var(--primary)' : 'var(--text-secondary)',
                }}
              >
                <input
                  type="checkbox"
                  checked={myClassesOnly}
                  onChange={(e) => setMyClassesOnly(e.target.checked)}
                  style={{ accentColor: 'var(--primary)', cursor: 'pointer' }}
                />
                <span>My Classes Only</span>
              </label>
            )}

            {/* View Switcher: Week | Day | List */}
            <div
              style={{
                display: 'inline-flex',
                background: 'var(--bg-card)',
                padding: '3px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <button
                className={`btn btn-sm ${timetableMode === 'week' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setTimetableMode('week')}
                style={{
                  padding: '5px 14px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: timetableMode === 'week' ? '#ffffff' : 'var(--text-secondary)',
                }}
              >
                Week View
              </button>
              <button
                className={`btn btn-sm ${timetableMode === 'day' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setTimetableMode('day')}
                style={{
                  padding: '5px 14px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: timetableMode === 'day' ? '#ffffff' : 'var(--text-secondary)',
                }}
              >
                Day
              </button>
              <button
                className={`btn btn-sm ${timetableMode === 'list' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setTimetableMode('list')}
                style={{
                  padding: '5px 14px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: timetableMode === 'list' ? '#ffffff' : 'var(--text-secondary)',
                }}
              >
                Agenda List
              </button>
            </div>

            {/* Export & Print */}
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleExportCalendar}
              title="Export calendar file to sync with Google / Outlook"
              style={{ gap: '6px', fontSize: '0.8rem', color: 'var(--text-main)' }}
            >
              <Download size={14} /> Export (.ics)
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={handlePrint}
              title="Print timetable"
              style={{ padding: '6px 10px', color: 'var(--text-main)' }}
            >
              <Printer size={15} />
            </button>

            {/* Admin or Trainer Create Button */}
            {(isAdmin || isTrainer) && onOpenScheduleModal && (
              <button
                className="btn btn-primary btn-sm"
                onClick={onOpenScheduleModal}
                style={{ gap: '6px', fontWeight: 700 }}
              >
                <Plus size={15} /> Add Class
              </button>
            )}
          </div>
        </div>

        {/* Second Row: Search and Cohort Filter */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', paddingTop: '4px', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: '380px' }}>
            <Search
              size={14}
              style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
            />
            <input
              type="text"
              className="input"
              placeholder="Search by class name, course or instructor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '32px', height: '36px', fontSize: '0.82rem', width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <select
              className="input"
              value={selectedCohort}
              onChange={(e) => setSelectedCohort(e.target.value)}
              style={{ height: '36px', fontSize: '0.82rem', width: 'auto' }}
            >
              <option value="all">All Cohorts / Batches</option>
              {cohorts.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
              <option value="Spring 2026 Engineering">Spring 2026 Engineering</option>
              <option value="Summer 2026 Cloud">Summer 2026 Cloud</option>
              <option value="Fall 2026 Data Science">Fall 2026 Data Science</option>
            </select>

            {(searchQuery.trim() !== '' || selectedCohort !== 'all' || !myClassesOnly) && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCohort('all');
                  setMyClassesOnly(true);
                }}
                style={{ fontSize: '0.78rem' }}
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* TIMETABLE CONTENT */}
      {uniqueSessions.length === 0 ? (
        <div className="card" style={{ padding: '48px 24px', textAlign: 'center', background: 'var(--bg-surface)' }}>
          <Calendar size={48} color="var(--text-muted)" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', fontWeight: 700 }}>No Timetable Classes Found</h3>
          <p className="text-secondary text-sm" style={{ maxWidth: '460px', margin: '0 auto 20px' }}>
            No scheduled classes match your current search, cohort filter, or enrollments.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setSearchQuery('');
                setSelectedCohort('all');
                setMyClassesOnly(false);
              }}
            >
              Show All Cohort Classes
            </button>
            {(isAdmin || isTrainer) && onOpenScheduleModal && (
              <button className="btn btn-primary btn-sm" onClick={onOpenScheduleModal}>
                <Plus size={14} /> Schedule a Class
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* WEEK GRID VIEW */}
          {timetableMode === 'week' && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${weekdaysList.length}, minmax(210px, 1fr))`,
                gap: '14px',
                alignItems: 'start',
                overflowX: 'auto',
                paddingBottom: '12px',
              }}
            >
              {weeklySchedule.map((dayPlan, dayIdx) => {
                const dayDate = weekDates[dayIdx];
                const isToday = dayDate
                  ? dayDate.toDateString() === new Date('2026-10-19T00:00:00').toDateString() ||
                    dayDate.toDateString() === new Date().toDateString()
                  : dayIdx === 0;

                return (
                  <div
                    key={dayPlan.day}
                    className="card"
                    style={{
                      padding: '14px',
                      background: 'var(--bg-surface)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      minHeight: '380px',
                      border: isToday ? '1.5px solid var(--primary)' : '1px solid var(--border-subtle)',
                      boxShadow: isToday ? '0 0 16px var(--primary-glow)' : 'var(--shadow-sm)',
                      borderRadius: 'var(--radius-lg)',
                    }}
                  >
                    {/* Day Column Header */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderBottom: isToday ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
                        paddingBottom: '10px',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 800, fontSize: '1rem', color: isToday ? 'var(--primary)' : 'var(--text-main)' }}>
                            {dayPlan.day}
                          </span>
                          {isToday && (
                            <span
                              style={{
                                background: 'var(--primary)',
                                color: '#ffffff',
                                fontSize: '0.65rem',
                                fontWeight: 800,
                                padding: '1px 6px',
                                borderRadius: '10px',
                              }}
                            >
                              TODAY
                            </span>
                          )}
                        </div>
                        {dayDate && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px', fontWeight: 500 }}>
                            {dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </div>
                        )}
                      </div>
                      <span
                        className="badge badge-secondary"
                        style={{ fontSize: '0.7rem', fontWeight: 800 }}
                      >
                        {dayPlan.slots.length} {dayPlan.slots.length === 1 ? 'class' : 'classes'}
                      </span>
                    </div>

                    {/* Classes in Day */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {dayPlan.slots.length === 0 ? (
                        <div
                          style={{
                            padding: '36px 12px',
                            textAlign: 'center',
                            color: 'var(--text-secondary)',
                            fontSize: '0.8rem',
                            border: '1px dashed var(--border-subtle)',
                            borderRadius: '8px',
                            background: 'var(--bg-card)',
                          }}
                        >
                          No classes scheduled
                        </div>
                      ) : (
                        dayPlan.slots.map((slot) => {
                          const courseColor = getCourseColor(slot.rawSession.courseId, slot.title);
                          const isLive = slot.rawSession.status === 'live';

                          return (
                            <div
                              key={slot.id}
                              onClick={() => onSelectSession(slot.rawSession)}
                              style={{
                                padding: '12px',
                                background: 'var(--bg-card)',
                                border: isLive ? '1.5px solid #F232A9' : '1px solid var(--border-subtle)',
                                borderLeft: `5px solid ${courseColor}`,
                                borderRadius: '8px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                cursor: 'pointer',
                                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                                position: 'relative',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = 'none';
                              }}
                            >
                              {/* Time & Status */}
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '0.74rem',
                                    fontWeight: 700,
                                    color: 'var(--sky-blue)',
                                  }}
                                >
                                  <Clock size={12} />
                                  {slot.time}
                                </span>
                                {isLive && (
                                  <span
                                    className="badge badge-active"
                                    style={{ background: '#F232A9', color: '#fff', fontSize: '0.62rem', padding: '1px 5px', fontWeight: 800 }}
                                  >
                                    LIVE NOW
                                  </span>
                                )}
                              </div>

                              {/* Title */}
                              <div
                                style={{
                                  fontWeight: 800,
                                  fontSize: '0.86rem',
                                  color: 'var(--text-main)',
                                  lineHeight: 1.35,
                                }}
                              >
                                {slot.title}
                              </div>

                              {/* Course */}
                              <div
                                style={{
                                  fontSize: '0.72rem',
                                  color: 'var(--text-secondary)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <BookOpen size={11} color="var(--primary)" />
                                <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                  {slot.rawSession.courseTitle || mockCourses.find((c) => c.id === slot.rawSession.courseId)?.title || 'Core Subject'}
                                </span>
                              </div>

                              {/* Instructor & Location */}
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  paddingTop: '6px',
                                  borderTop: '1px solid var(--border-subtle)',
                                  fontSize: '0.72rem',
                                  color: 'var(--text-secondary)',
                                }}
                              >
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  <UserCheck size={11} color="var(--sky-blue)" />
                                  {slot.faculty}
                                </span>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                                  {slot.rawSession.meetingUrl ? (
                                    <span style={{ color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                      <GoogleMeetIcon size={11} /> Google Meet
                                    </span>
                                  ) : (
                                    <span>{slot.room}</span>
                                  )}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* DAY AGENDA VIEW */}
          {timetableMode === 'day' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Day Selector Tabs */}
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                {weekdaysList.map((dayName, idx) => {
                  const dateObj = weekDates[idx] || weekDates[0];
                  const isSelected = selectedDayIndex === idx;
                  const dayClasses = uniqueSessions.filter((s) => getSessionWeekday(s) === dayName);

                  return (
                    <button
                      key={dayName}
                      onClick={() => setSelectedDayIndex(idx)}
                      className={`btn ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '2px',
                        padding: '10px 18px',
                        borderRadius: 'var(--radius-md)',
                        minWidth: '130px',
                      }}
                    >
                      <span style={{ fontSize: '0.74rem', fontWeight: 600, opacity: isSelected ? 0.95 : 0.75 }}>
                        {dayName.slice(0, 3)}, {dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                      <span style={{ fontSize: '0.9rem', fontWeight: 800 }}>
                        {dayClasses.length} {dayClasses.length === 1 ? 'class' : 'classes'}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Day Agenda Slots */}
              {(() => {
                const activeDayName = weekdaysList[selectedDayIndex] || weekdaysList[0];
                const daySlots = uniqueSessions
                  .filter((s) => getSessionWeekday(s) === activeDayName)
                  .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

                if (daySlots.length === 0) {
                  return (
                    <div className="card" style={{ padding: '40px', textAlign: 'center', background: 'var(--bg-surface)' }}>
                      <Clock size={36} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
                      <h4 style={{ margin: '0 0 6px', fontSize: '1rem', fontWeight: 700 }}>
                        No classes scheduled for {activeDayName}
                      </h4>
                      <p className="text-secondary text-xs" style={{ margin: 0 }}>
                        Take time to review recorded classes or prepare assignments for upcoming sessions.
                      </p>
                    </div>
                  );
                }

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {daySlots.map((s) => {
                      const courseColor = getCourseColor(s.courseId, s.title);
                      const isLive = s.status === 'live';

                      return (
                        <div
                          key={s.id}
                          onClick={() => onSelectSession(s)}
                          className="card"
                          style={{
                            padding: '16px 20px',
                            background: 'var(--bg-surface)',
                            border: isLive ? '1.5px solid #ef4444' : '1px solid var(--border-subtle)',
                            borderLeft: `5px solid ${courseColor}`,
                            borderRadius: 'var(--radius-md)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '16px',
                            cursor: 'pointer',
                            transition: 'var(--transition)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                            {/* Time Block */}
                            <div style={{ minWidth: '130px' }}>
                              <span style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <Clock size={15} />
                                {s.startTime && s.endTime ? `${s.startTime} - ${s.endTime}` : s.startTime || 'TBA'}
                              </span>
                              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>
                                {s.durationMinutes || s.duration || 60} mins lecture
                              </span>
                            </div>

                            {/* Details */}
                            <div>
                              <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-main)', marginBottom: '4px' }}>
                                {s.title}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                <span>
                                  <strong>Course:</strong> {s.courseTitle || mockCourses.find((c) => c.id === s.courseId)?.title || 'General Curriculum'}
                                </span>
                                <span>•</span>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  <UserCheck size={12} color="var(--primary)" />
                                  {s.instructorName || 'Faculty Trainer'}
                                </span>
                                <span>•</span>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  {s.meetingUrl ? <GoogleMeetIcon size={12} /> : <Building2 size={12} />}
                                  {s.room || (s.meetingUrl ? 'Google Meet' : 'Campus Hall')}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Action Button */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                            {s.meetingUrl ? (
                              <GoogleMeetJoinButton
                                meetingUrl={s.meetingUrl || s.joinLink}
                                label={isLive ? 'Join with Google Meet' : 'Open Google Meet'}
                                size="sm"
                              />
                            ) : (
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectSession(s);
                                }}
                              >
                                Class Details
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {/* AGENDA LIST VIEW */}
          {timetableMode === 'list' && (
            <div
              className="card"
              style={{
                padding: 0,
                overflow: 'hidden',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-subtle)' }}>
                      <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-secondary)' }}>Day & Time</th>
                      <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-secondary)' }}>Subject / Class Title</th>
                      <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-secondary)' }}>Course</th>
                      <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-secondary)' }}>Instructor</th>
                      <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-secondary)' }}>Room / Virtual</th>
                      <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-secondary)' }}>Status</th>
                      <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-secondary)', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uniqueSessions.map((s) => {
                      const dayName = getSessionWeekday(s);
                      const isLive = s.status === 'live';

                      return (
                        <tr
                          key={s.id}
                          onClick={() => onSelectSession(s)}
                          style={{
                            borderBottom: '1px solid var(--border-subtle)',
                            cursor: 'pointer',
                            transition: 'background 0.15s',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-card)')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--primary)' }}>
                            <div>{dayName}</div>
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                              {s.startTime && s.endTime ? `${s.startTime} - ${s.endTime}` : s.startTime || 'TBA'}
                            </div>
                          </td>
                          <td style={{ padding: '14px 16px', fontWeight: 800, color: 'var(--text-main)' }}>
                            {s.title}
                          </td>
                          <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                            {s.courseTitle || mockCourses.find((c) => c.id === s.courseId)?.title || 'General Curriculum'}
                          </td>
                          <td style={{ padding: '14px 16px', color: 'var(--text-main)' }}>
                            {s.instructorName || 'Faculty Trainer'}
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            {s.meetingUrl ? (
                              <span style={{ color: '#10b981', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                <GoogleMeetIcon size={13} /> Google Meet
                              </span>
                            ) : (
                              <span>{s.room || 'Campus Hall'}</span>
                            )}
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            {isLive ? (
                              <span className="badge badge-active" style={{ background: '#ef4444', color: '#fff', fontSize: '0.7rem' }}>
                                ● LIVE NOW
                              </span>
                            ) : s.status === 'ended' ? (
                              <span className="badge badge-secondary" style={{ fontSize: '0.7rem' }}>Completed</span>
                            ) : (
                              <span className="badge badge-published" style={{ fontSize: '0.7rem' }}>Scheduled</span>
                            )}
                          </td>
                          <td style={{ padding: '14px 16px', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                            {s.meetingUrl ? (
                              <GoogleMeetJoinButton
                                meetingUrl={s.meetingUrl || s.joinLink}
                                label={isLive ? 'Join' : 'Meet'}
                                size="sm"
                              />
                            ) : (
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectSession(s);
                                }}
                                style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                              >
                                View
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
