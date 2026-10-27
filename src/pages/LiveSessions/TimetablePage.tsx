import React, { useState, useMemo } from 'react';
import { useAuthStore } from '../../lib/store';
import { useLiveSessionStore } from '../../lib/liveSessionStore';
import { useCohortStore } from '../../lib/cohortStore';
import { mockCourses } from '../../data/mockData';
import { mockUsers } from '../../data/mockUsers';
import { LiveSession } from '../../types';
import {
  Plus, Calendar, Clock, Users,
  Edit2, X, Play, Video,
  ChevronRight, ChevronLeft, Search,
  Trash2, Sparkles, Building2, UserCheck
} from 'lucide-react';

import { ScheduleLiveSessionModal } from './components/ScheduleLiveSessionModal';
import { LiveClassroomDemoModal } from './components/LiveClassroomDemoModal';
import { GoogleMeetIcon, GoogleMeetJoinButton, MeetingProviderBadge } from '../../components/GoogleMeet';

export const TimetablePage: React.FC = () => {
  const { user } = useAuthStore();

  const isTrainer = user?.activeRole === 'trainer' || user?.activeRole === 'instructor';
  const isStudent = user?.activeRole === 'student' || user?.activeRole === 'learner';
  const isAdmin = user?.activeRole === 'org_admin' || user?.activeRole === 'platform_admin' || user?.activeRole === 'lms_admin';

  const {
    sessions,
    deleteSession,
  } = useLiveSessionStore();

  const { cohorts } = useCohortStore();

  // Modals & Notices
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [sessionToEdit, setSessionToEdit] = useState<LiveSession | null>(null);
  const [selectedDetailSession, setSelectedDetailSession] = useState<LiveSession | null>(null);
  const [activeLiveRoomSession, setActiveLiveRoomSession] = useState<LiveSession | null>(null);
  const [noticeBanner, setNoticeBanner] = useState<string | null>(null);

  const showNotice = (msg: string) => {
    setNoticeBanner(msg);
    setTimeout(() => setNoticeBanner(null), 6000);
  };

  // Timetable Filters & Mode
  const [timetableCohort, setTimetableCohort] = useState('all');
  const [timetableTrainer, setTimetableTrainer] = useState('all');
  const [timetableSearch, setTimetableSearch] = useState('');
  const [timetableMode, setTimetableMode] = useState<'week' | 'day' | 'list'>('week');
  const [currentWeekDate, setCurrentWeekDate] = useState<Date>(() => new Date('2026-10-19T00:00:00'));
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);

  // Student Cohorts
  const studentCohortIds = useMemo(() => {
    if (!isStudent) return [];
    return ['coh-001', 'coh-002', 'coh-004'];
  }, [isStudent]);

  // Helper to determine weekday for a session
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

  // Synchronized Role-Based Timetable Sessions
  const timetableSessions = useMemo(() => {
    return sessions.filter((s) => {
      // 1. Role-based visibility
      if (isAdmin) {
        if (timetableTrainer !== 'all' && s.instructorId !== timetableTrainer) {
          return false;
        }
      } else if (isTrainer) {
        const tId = user?.id || 'u-004';
        const isAssignedTrainer = s.instructorId === tId;
        const isCreator = s.createdBy === tId;
        const isTargetedStaff = Boolean(s.targetStaffIds && s.targetStaffIds.includes(tId));
        const isFacultyWide = (s.targetAudienceType === 'all_faculty' || s.targetAudienceType === 'faculty_all');
        if (!isAssignedTrainer && !isCreator && !isTargetedStaff && !isFacultyWide) {
          return false;
        }
      } else if (isStudent) {
        const sId = user?.id || 'u-007';
        if (s.audienceScope === 'faculty' || s.targetAudienceType === 'faculty_only') {
          return false;
        }
        const isTargetedStudent = s.targetStudentIds && s.targetStudentIds.includes(sId);
        const isInCohort = s.cohortId && studentCohortIds.includes(s.cohortId);
        if (!isTargetedStudent && !isInCohort) {
          return false;
        }
      }

      // 2. Cohort filter
      if (timetableCohort !== 'all') {
        const cohortObj = cohorts.find((c) => c.id === s.cohortId || c.name === s.cohortId);
        const matchesCohort =
          s.cohortId === timetableCohort ||
          s.cohortName?.toLowerCase() === timetableCohort.toLowerCase() ||
          cohortObj?.name.toLowerCase() === timetableCohort.toLowerCase() ||
          cohortObj?.id.toLowerCase() === timetableCohort.toLowerCase();
        if (!matchesCohort) return false;
      }

      // 3. Search query
      if (timetableSearch.trim()) {
        const q = timetableSearch.toLowerCase();
        const matchesTitle = s.title.toLowerCase().includes(q);
        const matchesFaculty = s.instructorName?.toLowerCase().includes(q);
        const matchesRoom = s.room?.toLowerCase().includes(q);
        const cohortObj = cohorts.find((c) => c.id === s.cohortId);
        const matchesCohort = (s.cohortName || cohortObj?.name || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesFaculty && !matchesRoom && !matchesCohort) return false;
      }

      return true;
    });
  }, [sessions, isAdmin, isTrainer, isStudent, user?.id, timetableTrainer, timetableCohort, timetableSearch, cohorts, studentCohortIds]);

  // Deduplicate sessions
  const uniqueTimetableSessions = useMemo(() => {
    const seen = new Set<string>();
    return timetableSessions.filter((s) => {
      if (seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    });
  }, [timetableSessions]);

  const weekdaysList = useMemo(() => {
    const hasWeekend = uniqueTimetableSessions.some((s) => {
      const d = getSessionWeekday(s);
      return d === 'Saturday' || d === 'Sunday';
    });
    return hasWeekend
      ? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
      : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  }, [uniqueTimetableSessions]);

  const weeklySchedule = useMemo(() => {
    return weekdaysList.map((day) => {
      const slots = uniqueTimetableSessions
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
            createdBy: s.createdBy,
            createdRole: s.createdRole,
            rawSession: s,
          };
        });
      return { day, slots };
    });
  }, [weekdaysList, uniqueTimetableSessions, cohorts]);

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

  const getCourseColor = (courseId?: string, title?: string): string => {
    if (courseId === 'crs-001' || title?.toLowerCase().includes('javascript')) return '#6366f1';
    if (courseId === 'crs-002' || title?.toLowerCase().includes('react')) return '#06b6d4';
    if (courseId === 'crs-003' || title?.toLowerCase().includes('python')) return '#10b981';
    if (courseId === 'crs-004' || title?.toLowerCase().includes('typescript')) return '#8b5cf6';
    if (courseId === 'crs-005' || title?.toLowerCase().includes('cloud') || title?.toLowerCase().includes('aws')) return '#f59e0b';
    if (title?.toLowerCase().includes('database') || title?.toLowerCase().includes('sql')) return '#ec4899';
    return '#3b82f6';
  };

  const formatSessionDate = (s: LiveSession) => {
    const weekday = s.dayOfWeek || getSessionWeekday(s);
    if (s.date) {
      try {
        const d = new Date(`${s.date}T00:00:00`);
        if (!isNaN(d.getTime())) {
          return `${weekday.slice(0, 3)}, ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        }
      } catch {
        // fallback
      }
      return `${weekday.slice(0, 3)}, ${s.date}`;
    }
    return weekday;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '40px' }}>
      {/* Toast Notification Banner */}
      {noticeBanner && (
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--primary)',
            borderLeft: '4px solid var(--primary)',
            padding: '12px 18px',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sparkles size={18} color="var(--primary)" />
            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{noticeBanner}</span>
          </div>
          <button onClick={() => setNoticeBanner(null)} style={{ color: 'var(--text-muted)', cursor: 'pointer', background: 'transparent', border: 'none' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Header & Primary Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', margin: '0 0 4px 0', fontWeight: 800 }}>
            Classes & Timetable
          </h1>
          <p className="text-secondary text-sm" style={{ margin: 0 }}>
            View and manage class schedules, cohorts, and timetable assignments.
          </p>
        </div>

        {/* Action Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {(isAdmin || isTrainer) && (
            <button
              className="btn btn-primary"
              onClick={() => {
                setSessionToEdit(null);
                setIsScheduleModalOpen(true);
              }}
              style={{ gap: '8px', padding: '10px 20px', fontWeight: 700 }}
            >
              <Plus size={18} /> Create Schedule
            </button>
          )}
        </div>
      </div>

      {/* Timetable Controls Container */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Top Timetable Controls (One Compact Row) */}
        <div
          className="card"
          style={{
            padding: '10px 16px',
            background: 'var(--bg-surface)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
            border: '1px solid var(--border-subtle)',
          }}
        >
          {/* Left: Navigation and Date Range */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={goToToday}
              style={{ fontWeight: 600, fontSize: '0.8rem', padding: '6px 12px' }}
            >
              Today
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
                style={{ border: 'none', background: 'transparent', padding: '6px 8px', borderRadius: 0 }}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                className="btn btn-icon btn-sm"
                onClick={goToNextWeek}
                title="Next week"
                style={{ border: 'none', background: 'transparent', padding: '6px 8px', borderRadius: 0 }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
            <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main)', paddingLeft: '4px' }}>
              {weekRangeText}
            </span>
          </div>

          {/* Right: View Switcher, Search, Cohort Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', flex: '1 1 auto', justifyContent: 'flex-end' }}>
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
                style={{ padding: '4px 12px', fontSize: '0.8rem', fontWeight: 600, borderRadius: '4px' }}
              >
                Week
              </button>
              <button
                className={`btn btn-sm ${timetableMode === 'day' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setTimetableMode('day')}
                style={{ padding: '4px 12px', fontSize: '0.8rem', fontWeight: 600, borderRadius: '4px' }}
              >
                Day
              </button>
              <button
                className={`btn btn-sm ${timetableMode === 'list' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setTimetableMode('list')}
                style={{ padding: '4px 12px', fontSize: '0.8rem', fontWeight: 600, borderRadius: '4px' }}
              >
                List
              </button>
            </div>

            {/* Search by course or class name */}
            <div style={{ position: 'relative', width: '210px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="input"
                placeholder="Search course or class..."
                value={timetableSearch}
                onChange={(e) => setTimetableSearch(e.target.value)}
                style={{ paddingLeft: '32px', height: '34px', fontSize: '0.8rem', width: '100%' }}
              />
            </div>

            {/* Simple cohort/class filter */}
            <div style={{ width: '170px' }}>
              <select
                className="input"
                value={timetableCohort}
                onChange={(e) => setTimetableCohort(e.target.value)}
                style={{ height: '34px', fontSize: '0.8rem', width: '100%' }}
              >
                <option value="all">All Cohorts</option>
                {cohorts.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
                <option value="Spring 2026 Engineering">Spring 2026 Engineering</option>
                <option value="Summer 2026 Cloud">Summer 2026 Cloud</option>
                <option value="Fall 2026 Data Science">Fall 2026 Data Science</option>
              </select>
            </div>

            {(timetableCohort !== 'all' || timetableSearch.trim() !== '') && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setTimetableCohort('all');
                  setTimetableSearch('');
                }}
                style={{ height: '34px', fontSize: '0.78rem' }}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Timetable Content */}
        {uniqueTimetableSessions.length === 0 ? (
          <div className="card" style={{ padding: '48px 24px', textAlign: 'center', background: 'var(--bg-surface)' }}>
            <Calendar size={40} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
            <h4 style={{ margin: '0 0 6px', fontSize: '1.05rem', fontWeight: 700 }}>No Timetable Classes Found</h4>
            <p className="text-secondary text-sm" style={{ maxWidth: '440px', margin: '0 auto 18px' }}>
              There are no scheduled classes matching your current filter criteria or permissions.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
              {(timetableCohort !== 'all' || timetableSearch.trim() !== '') && (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setTimetableCohort('all');
                    setTimetableSearch('');
                  }}
                >
                  Reset Filters
                </button>
              )}
              {(isAdmin || isTrainer) && (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    setSessionToEdit(null);
                    setIsScheduleModalOpen(true);
                  }}
                >
                  <Plus size={14} /> Create Schedule
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* WEEK VIEW */}
            {timetableMode === 'week' && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${weekdaysList.length}, minmax(180px, 1fr))`,
                  gap: '12px',
                  alignItems: 'start',
                  overflowX: 'auto',
                  paddingBottom: '8px',
                }}
              >
                {weeklySchedule.map((dayPlan, dayIdx) => {
                  const dayDate = weekDates[dayIdx];
                  return (
                    <div
                      key={dayPlan.day}
                      className="card"
                      style={{
                        padding: '12px',
                        background: 'var(--bg-surface)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                        minHeight: '260px',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      {/* Day Column Header */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          borderBottom: '2px solid var(--primary)',
                          paddingBottom: '8px',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                            {dayPlan.day}
                          </div>
                          {dayDate && (
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              {dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </div>
                          )}
                        </div>
                        <span
                          className="badge badge-secondary"
                          style={{ fontSize: '0.68rem', fontWeight: 700 }}
                        >
                          {dayPlan.slots.length}
                        </span>
                      </div>

                      {/* Slots */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {dayPlan.slots.length === 0 ? (
                          <div
                            style={{
                              padding: '24px 10px',
                              textAlign: 'center',
                              color: 'var(--text-muted)',
                              fontSize: '0.75rem',
                              border: '1px dashed var(--border-subtle)',
                              borderRadius: '6px',
                              background: 'var(--bg-card)',
                            }}
                          >
                            No classes
                          </div>
                        ) : (
                          dayPlan.slots.map((slot) => {
                            const courseColor = getCourseColor(slot.rawSession.courseId, slot.title);
                            return (
                              <div
                                key={slot.id}
                                onClick={() => setSelectedDetailSession(slot.rawSession)}
                                style={{
                                  padding: '10px 12px',
                                  background: 'var(--bg-card)',
                                  border: '1px solid var(--border-subtle)',
                                  borderLeft: `4px solid ${courseColor}`,
                                  borderRadius: '6px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '6px',
                                  cursor: 'pointer',
                                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
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
                                {/* Start and end time */}
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    color: 'var(--primary)',
                                  }}
                                >
                                  <Clock size={12} />
                                  <span>{slot.time}</span>
                                </div>

                                {/* Class title */}
                                <div
                                  style={{
                                    fontWeight: 700,
                                    fontSize: '0.84rem',
                                    color: 'var(--text-main)',
                                    lineHeight: 1.3,
                                  }}
                                >
                                  {slot.title}
                                </div>

                                {/* Course or subject */}
                                <div
                                  style={{
                                    fontSize: '0.72rem',
                                    color: 'var(--text-secondary)',
                                    fontWeight: 500,
                                  }}
                                >
                                  {slot.rawSession.courseTitle ||
                                    mockCourses.find((c) => c.id === slot.rawSession.courseId)?.title ||
                                    'Core Subject'}
                                </div>

                                {/* Assigned trainer */}
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '0.72rem',
                                    color: 'var(--text-muted)',
                                  }}
                                >
                                  <UserCheck size={11} color="var(--primary)" />
                                  <span>{slot.faculty}</span>
                                </div>

                                {/* Room or meeting link */}
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '0.72rem',
                                    color: 'var(--text-muted)',
                                  }}
                                >
                                  {slot.rawSession.meetingUrl ? (
                                    <>
                                      <GoogleMeetIcon size={12} />
                                      <span style={{ color: '#10b981', fontWeight: 600 }}>Google Meet</span>
                                    </>
                                  ) : (
                                    <>
                                      <Building2 size={11} />
                                      <span>{slot.room}</span>
                                    </>
                                  )}
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

            {/* DAY VIEW */}
            {timetableMode === 'day' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Day Picker Tabs */}
                <div
                  style={{
                    display: 'flex',
                    gap: '8px',
                    overflowX: 'auto',
                    paddingBottom: '4px',
                  }}
                >
                  {weekdaysList.map((dayName, idx) => {
                    const dateObj = weekDates[idx] || weekDates[0];
                    const isSelected = selectedDayIndex === idx;
                    const dayClasses = uniqueTimetableSessions.filter((s) => getSessionWeekday(s) === dayName);
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
                          padding: '8px 16px',
                          borderRadius: 'var(--radius-md)',
                          minWidth: '120px',
                        }}
                      >
                        <span style={{ fontSize: '0.74rem', fontWeight: 600, opacity: isSelected ? 0.95 : 0.75 }}>
                          {dayName.slice(0, 3)}, {dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>
                          {dayClasses.length} {dayClasses.length === 1 ? 'class' : 'classes'}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Day Schedule Timeline */}
                {(() => {
                  const activeDayName = weekdaysList[selectedDayIndex] || weekdaysList[0];
                  const daySlots = uniqueTimetableSessions
                    .filter((s) => getSessionWeekday(s) === activeDayName)
                    .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

                  if (daySlots.length === 0) {
                    return (
                      <div className="card" style={{ padding: '36px', textAlign: 'center', background: 'var(--bg-surface)' }}>
                        <Clock size={32} color="var(--text-muted)" style={{ margin: '0 auto 10px' }} />
                        <h4 style={{ margin: '0 0 4px', fontSize: '0.95rem', fontWeight: 700 }}>
                          No classes scheduled for {activeDayName}
                        </h4>
                        <p className="text-secondary text-xs" style={{ margin: 0 }}>
                          Enjoy the break or schedule a new class for this day.
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {daySlots.map((s) => {
                        const courseColor = getCourseColor(s.courseId, s.title);
                        const cohortObj = cohorts.find((c) => c.id === s.cohortId);
                        const cohortName = s.cohortName || cohortObj?.name || (s.cohortId ? s.cohortId : 'All Cohorts');
                        const roomDisplay = s.room || (s.meetingUrl ? 'Virtual Room' : 'Campus Hall');

                        return (
                          <div
                            key={s.id}
                            onClick={() => setSelectedDetailSession(s)}
                            className="card"
                            style={{
                              padding: '14px 18px',
                              background: 'var(--bg-surface)',
                              border: '1px solid var(--border-subtle)',
                              borderLeft: `5px solid ${courseColor}`,
                              borderRadius: 'var(--radius-md)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              flexWrap: 'wrap',
                              gap: '14px',
                              cursor: 'pointer',
                              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                              {/* Time block */}
                              <div
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'flex-start',
                                  minWidth: '130px',
                                }}
                              >
                                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                  <Clock size={14} />
                                  {s.startTime && s.endTime ? `${s.startTime} - ${s.endTime}` : s.startTime || 'TBA'}
                                </span>
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                  {activeDayName}
                                </span>
                              </div>

                              {/* Class details */}
                              <div>
                                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-main)', marginBottom: '3px' }}>
                                  {s.title}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                  <span>
                                    <strong>Course:</strong> {s.courseTitle || mockCourses.find((c) => c.id === s.courseId)?.title || 'Core Subject'}
                                  </span>
                                  <span>•</span>
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    <UserCheck size={12} color="var(--primary)" />
                                    {s.instructorName || 'Faculty Trainer'}
                                  </span>
                                  <span>•</span>
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    <Users size={12} color="var(--accent-purple)" />
                                    {cohortName}
                                  </span>
                                  <span>•</span>
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    {s.meetingUrl ? <GoogleMeetIcon size={12} /> : <Building2 size={12} />}
                                    {s.meetingUrl ? 'Google Meet' : roomDisplay}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Status badge */}
                            <div>
                              {s.status === 'live' ? (
                                <span className="badge badge-active" style={{ background: '#ef4444', color: '#fff', fontSize: '0.7rem' }}>
                                  ● LIVE NOW
                                </span>
                              ) : s.status === 'ended' ? (
                                <span className="badge badge-secondary" style={{ fontSize: '0.7rem' }}>Ended</span>
                              ) : (
                                <span className="badge badge-published" style={{ fontSize: '0.7rem' }}>Scheduled</span>
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

            {/* LIST VIEW */}
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
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-card)' }}>
                        <th style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--text-secondary)' }}>Date</th>
                        <th style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--text-secondary)' }}>Time</th>
                        <th style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--text-secondary)' }}>Class / Course</th>
                        <th style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--text-secondary)' }}>Trainer</th>
                        <th style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--text-secondary)' }}>Cohort</th>
                        <th style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--text-secondary)' }}>Room</th>
                        <th style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--text-secondary)' }}>Status</th>
                        <th style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--text-secondary)', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {uniqueTimetableSessions.map((s) => {
                        const cohortObj = cohorts.find((c) => c.id === s.cohortId);
                        const cohortName = s.cohortName || cohortObj?.name || (s.cohortId ? s.cohortId : 'All Cohorts');
                        const courseColor = getCourseColor(s.courseId, s.title);
                        const canEdit = isAdmin || s.instructorId === user?.id || s.createdBy === user?.id;
                        const canDelete = isAdmin || s.createdBy === user?.id;

                        return (
                          <tr
                            key={s.id}
                            style={{
                              borderBottom: '1px solid var(--border-subtle)',
                              cursor: 'pointer',
                              transition: 'background 0.15s ease',
                            }}
                            className="table-row-hover"
                            onClick={() => setSelectedDetailSession(s)}
                          >
                            <td style={{ padding: '12px 14px', fontWeight: 600 }}>
                              {formatSessionDate(s)}
                            </td>
                            <td style={{ padding: '12px 14px', color: 'var(--primary)', fontWeight: 700, whiteSpace: 'nowrap' }}>
                              {s.startTime && s.endTime ? `${s.startTime} - ${s.endTime}` : s.startTime || 'TBA'}
                            </td>
                            <td style={{ padding: '12px 14px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: courseColor, flexShrink: 0 }} />
                                <div>
                                  <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{s.title}</div>
                                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                    {s.courseTitle || mockCourses.find((c) => c.id === s.courseId)?.title || 'Core Subject'}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>
                              {s.instructorName || 'Faculty Trainer'}
                            </td>
                            <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>
                              {cohortName}
                            </td>
                            <td style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>
                              {s.meetingUrl ? (
                                <span style={{ color: '#10b981', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                  <GoogleMeetIcon size={13} /> Google Meet
                                </span>
                              ) : (
                                <span>{s.room || 'Campus Hall'}</span>
                              )}
                            </td>
                            <td style={{ padding: '12px 14px' }}>
                              {s.status === 'live' ? (
                                <span className="badge badge-active" style={{ background: '#ef4444', color: '#fff', fontSize: '0.65rem' }}>
                                  LIVE
                                </span>
                              ) : s.status === 'ended' ? (
                                <span className="badge badge-secondary" style={{ fontSize: '0.65rem' }}>Ended</span>
                              ) : (
                                <span className="badge badge-published" style={{ fontSize: '0.65rem' }}>Scheduled</span>
                              )}
                            </td>
                            <td style={{ padding: '12px 14px', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                              <div style={{ display: 'inline-flex', gap: '4px' }}>
                                <button
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => setSelectedDetailSession(s)}
                                  title="View Details"
                                  style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                                >
                                  View
                                </button>
                                {canEdit && (
                                  <button
                                    className="btn btn-icon btn-sm"
                                    title="Edit Schedule"
                                    onClick={() => {
                                      setSessionToEdit(s);
                                      setIsScheduleModalOpen(true);
                                    }}
                                    style={{ padding: '4px 6px' }}
                                  >
                                    <Edit2 size={12} />
                                  </button>
                                )}
                                {canDelete && (
                                  <button
                                    className="btn btn-icon btn-sm"
                                    title="Delete Schedule"
                                    onClick={() => {
                                      if (confirm(`Remove "${s.title}" from timetable?`)) {
                                        deleteSession(s.id);
                                        showNotice(`Removed "${s.title}" from timetable.`);
                                      }
                                    }}
                                    style={{ padding: '4px 6px' }}
                                  >
                                    <Trash2 size={12} color="var(--danger)" />
                                  </button>
                                )}
                              </div>
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

      {/* SCHEDULE MODAL */}
      <ScheduleLiveSessionModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        sessionToEdit={sessionToEdit}
        onSuccess={showNotice}
      />

      {/* SESSION DETAILS MODAL */}
      {selectedDetailSession && (
        <div
          className="modal-overlay"
          onClick={() => setSelectedDetailSession(null)}
          style={{
            zIndex: 65,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            className="card"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '520px',
              padding: '24px',
              borderRadius: '14px',
              boxShadow: 'var(--shadow-xl)',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '16px' }}>
              <div>
                <span
                  style={{
                    display: 'inline-block',
                    width: '32px',
                    height: '4px',
                    borderRadius: '2px',
                    background: getCourseColor(selectedDetailSession.courseId, selectedDetailSession.title),
                    marginBottom: '8px',
                  }}
                />
                <h3 style={{ margin: '0 0 4px 0', fontSize: '1.25rem', fontWeight: 800 }}>
                  {selectedDetailSession.title}
                </h3>
                <p className="text-secondary text-xs" style={{ margin: 0 }}>
                  {selectedDetailSession.courseTitle ||
                    mockCourses.find((c) => c.id === selectedDetailSession.courseId)?.title ||
                    'General Curriculum'}
                </p>
              </div>
              <button
                className="btn btn-icon btn-sm"
                onClick={() => setSelectedDetailSession(null)}
                style={{ color: 'var(--text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Details Grid */}
            <div
              style={{
                background: 'var(--bg-card)',
                padding: '16px',
                borderRadius: '8px',
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '12px',
                marginBottom: '16px',
                fontSize: '0.82rem',
              }}
            >
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.72rem', marginBottom: '2px' }}>
                  Date & Day
                </span>
                <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                  {formatSessionDate(selectedDetailSession)}
                </span>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.72rem', marginBottom: '2px' }}>
                  Time Slot
                </span>
                <span style={{ fontWeight: 700, color: 'var(--primary)' }}>
                  {selectedDetailSession.startTime && selectedDetailSession.endTime
                    ? `${selectedDetailSession.startTime} - ${selectedDetailSession.endTime}`
                    : selectedDetailSession.startTime || 'TBA'}
                </span>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.72rem', marginBottom: '2px' }}>
                  Assigned Trainer
                </span>
                <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                  {selectedDetailSession.instructorName || 'Faculty Trainer'}
                </span>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.72rem', marginBottom: '2px' }}>
                  Cohort / Class
                </span>
                <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                  {selectedDetailSession.cohortName ||
                    cohorts.find((c) => c.id === selectedDetailSession.cohortId)?.name ||
                    selectedDetailSession.cohortId ||
                    'All Cohorts'}
                </span>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.72rem', marginBottom: '2px' }}>
                  Room / Location
                </span>
                <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                  {selectedDetailSession.room || (selectedDetailSession.meetingUrl ? 'Google Meet' : 'Campus Hall')}
                </span>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.72rem', marginBottom: '2px' }}>
                  Meeting Provider
                </span>
                <MeetingProviderBadge provider={selectedDetailSession.provider || 'Google Meet'} hasLink={Boolean(selectedDetailSession.meetingUrl || selectedDetailSession.joinLink)} />
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.72rem', marginBottom: '2px' }}>
                  Status
                </span>
                <span>
                  {selectedDetailSession.status === 'live' ? (
                    <span className="badge badge-active" style={{ background: '#ef4444', color: '#fff', fontSize: '0.68rem' }}>
                      ● LIVE NOW
                    </span>
                  ) : selectedDetailSession.status === 'ended' ? (
                    <span className="badge badge-secondary" style={{ fontSize: '0.68rem' }}>Ended</span>
                  ) : (
                    <span className="badge badge-published" style={{ fontSize: '0.68rem' }}>Scheduled</span>
                  )}
                </span>
              </div>
            </div>

            {selectedDetailSession.description && (
              <div style={{ marginBottom: '16px' }}>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.72rem', marginBottom: '4px' }}>
                  Session Objectives / Agenda
                </span>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  {selectedDetailSession.description}
                </p>
              </div>
            )}

            {/* Actions Toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                {(isAdmin || selectedDetailSession.instructorId === user?.id || selectedDetailSession.createdBy === user?.id) && (
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      const toEdit = selectedDetailSession;
                      setSelectedDetailSession(null);
                      setSessionToEdit(toEdit);
                      setIsScheduleModalOpen(true);
                    }}
                    style={{ gap: '4px' }}
                  >
                    <Edit2 size={13} /> Edit Schedule
                  </button>
                )}

                {(isAdmin || selectedDetailSession.createdBy === user?.id) && (
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      if (confirm(`Delete "${selectedDetailSession.title}" from timetable?`)) {
                        deleteSession(selectedDetailSession.id);
                        showNotice(`Deleted "${selectedDetailSession.title}".`);
                        setSelectedDetailSession(null);
                      }
                    }}
                    style={{ color: 'var(--danger)', gap: '4px' }}
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                {(selectedDetailSession.status === 'live' || selectedDetailSession.status === 'scheduled') && (
                  <GoogleMeetJoinButton
                    meetingUrl={selectedDetailSession.meetingUrl || selectedDetailSession.joinLink}
                    role={isTrainer || isAdmin ? 'instructor' : 'student'}
                    size="sm"
                  />
                )}
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setSelectedDetailSession(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LIVE CLASSROOM DEMO MODAL */}
      <LiveClassroomDemoModal
        session={activeLiveRoomSession}
        isOpen={Boolean(activeLiveRoomSession)}
        onClose={() => setActiveLiveRoomSession(null)}
        onSessionEnded={() => showNotice('Live broadcast concluded and video recorded.')}
      />
    </div>
  );
};
