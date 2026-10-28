import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../lib/store';
import { useLiveSessionStore } from '../../lib/liveSessionStore';
import { useCohortStore } from '../../lib/cohortStore';
import { mockDepartments, mockCourses } from '../../data/mockData';
import { LiveSession } from '../../types';
import {
  Video, Plus, Calendar, Clock, Users, ExternalLink,
  Edit2, X, CheckCircle2, AlertTriangle, Play, Radio,
  ShieldCheck, FileText, Check, AlertCircle, Download,
  Filter, UserCheck, Shield, ChevronRight, ChevronLeft, Search, Share2,
  Trash2, PhoneCall, Sparkles, LayoutList, CalendarDays,
  Copy, BookOpen, GraduationCap, Building2, List, MapPin, Eye
} from 'lucide-react';

import { ScheduleLiveSessionModal } from './components/ScheduleLiveSessionModal';
import { LiveClassroomDemoModal } from './components/LiveClassroomDemoModal';
import { LiveRecordingPlayerModal } from './components/LiveRecordingPlayerModal';
import { SessionRosterModal } from './components/SessionRosterModal';
import { WeeklyTimetableView } from './components/WeeklyTimetableView';
import { RecordedClassesView } from './components/RecordedClassesView';
import { MeetingProviderBadge, GoogleMeetJoinButton, GoogleMeetIcon } from '../../components/GoogleMeet';

// Dedicated Sub-Pages for Backward Compatibility & Direct Routing
import { TimetablePage } from './TimetablePage';
import { AttendanceLedgerPage } from './AttendanceLedgerPage';

export { TimetablePage, AttendanceLedgerPage };

interface Props {
  defaultTab?: 'live_sessions' | 'timetable' | 'recordings' | 'attendance' | 'upcoming' | 'past';
}

export const LiveSessionsPage: React.FC<Props> = ({ defaultTab = 'live_sessions' }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  // If the route or prop specifies Attendance, render AttendanceLedgerPage
  if (defaultTab === 'attendance' || currentPath === '/attendance' || currentPath === '/attendance-ledger') {
    return <AttendanceLedgerPage />;
  }

  const { user } = useAuthStore();
  const isTrainer = user?.activeRole === 'trainer' || user?.activeRole === 'instructor';
  const isStudent = user?.activeRole === 'student' || user?.activeRole === 'learner';
  const isAdmin = user?.activeRole === 'org_admin' || user?.activeRole === 'platform_admin' || user?.activeRole === 'lms_admin';

  const [searchParams, setSearchParams] = useSearchParams();

  // Determine initial active tab from props or URL
  const determineInitialTab = (): 'live_sessions' | 'timetable' | 'recordings' => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'timetable' || tabParam === 'weekly-timetable') return 'timetable';
    if (tabParam === 'recordings' || tabParam === 'recorded-classes') return 'recordings';
    if (tabParam === 'live' || tabParam === 'live-sessions') return 'live_sessions';
    if (defaultTab === 'timetable' || currentPath === '/timetable' || currentPath === '/weekly-timetable' || currentPath === '/classes-timetable') {
      return 'timetable';
    }
    if (defaultTab === 'recordings' || currentPath === '/recorded-classes' || currentPath === '/recordings') {
      return 'recordings';
    }
    return 'live_sessions';
  };

  const [activeTab, setActiveTab] = useState<'live_sessions' | 'timetable' | 'recordings'>(determineInitialTab);

  useEffect(() => {
    setActiveTab(determineInitialTab());
  }, [currentPath, searchParams]);


  // Live Sessions from centralized store
  const {
    sessions,
    startBroadcast,
    endSession,
    cancelSession,
    deleteSession,
  } = useLiveSessionStore();

  const { cohorts } = useCohortStore();

  // Sub-filter for Live Sessions
  const [statusFilter, setStatusFilter] = useState<'all' | 'live' | 'upcoming' | 'ended' | 'cancelled'>('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [courseFilter, setCourseFilter] = useState('all');
  const [cohortFilter, setCohortFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  // Modals State
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [sessionToEdit, setSessionToEdit] = useState<LiveSession | null>(null);
  const [selectedDetailSession, setSelectedDetailSession] = useState<LiveSession | null>(null);
  const [activeLiveRoomSession, setActiveLiveRoomSession] = useState<LiveSession | null>(null);
  const [recordingModalSession, setRecordingModalSession] = useState<LiveSession | null>(null);
  const [rosterModalSession, setRosterModalSession] = useState<LiveSession | null>(null);

  // Cancellation Modal
  const [cancelModalSession, setCancelModalSession] = useState<LiveSession | null>(null);
  const [cancelReason, setCancelReason] = useState('Faculty schedule conflict & curriculum rescheduling');

  // Notification Banner
  const [noticeBanner, setNoticeBanner] = useState<string | null>(null);
  const [copiedSessionId, setCopiedSessionId] = useState<string | null>(null);

  // Check URL query param for sessionId
  useEffect(() => {
    const sessionIdParam = searchParams.get('sessionId');
    if (sessionIdParam) {
      const found = sessions.find((s) => s.id === sessionIdParam);
      if (found) {
        if (found.status === 'live') {
          setActiveLiveRoomSession(found);
        } else if (found.status === 'ended' && found.recordingUrl) {
          setRecordingModalSession(found);
        } else {
          setNoticeBanner(`Loaded session details for "${found.title}".`);
        }
      }
    }
  }, [searchParams, sessions]);

  const showNotice = (msg: string) => {
    setNoticeBanner(msg);
    setTimeout(() => setNoticeBanner(null), 6000);
  };

  // Student Cohorts & Courses
  const studentCohortIds = useMemo(() => {
    if (!isStudent) return [];
    return ['coh-001', 'coh-002', 'coh-004'];
  }, [isStudent]);

  const studentCourseIds = useMemo(() => {
    if (!isStudent) return [];
    return ['crs-001', 'crs-002', 'crs-004'];
  }, [isStudent]);

  // Filtered Sessions for the current role
  const roleFilteredSessions = useMemo(() => {
    if (isStudent) {
      const sId = user?.id || 'u-007';
      return sessions.filter((s) => {
        if (
          s.audienceScope === 'faculty' ||
          s.targetAudienceType === 'faculty_only' ||
          s.targetAudienceType === 'faculty_all' ||
          s.targetAudienceType === 'faculty_selected'
        ) {
          return false;
        }
        if (s.targetStudentIds && s.targetStudentIds.includes(sId)) return true;
        if (s.cohortId && studentCohortIds.includes(s.cohortId)) {
          if (s.targetAudienceType === 'selected_students') {
            return s.targetStudentIds?.includes(sId);
          }
          return true;
        }
        if (s.courseId && studentCourseIds.includes(s.courseId) && !s.cohortId) {
          return true;
        }
        return false;
      });
    }

    if (isTrainer) {
      const tId = user?.id || 'u-004';
      return sessions.filter((s) => {
        const isAssignedTrainer = s.instructorId === tId;
        const isCreator = s.createdBy === tId;
        const isTargetedStaff = Boolean(s.targetStaffIds && s.targetStaffIds.includes(tId));
        const isFacultyWide = (s.targetAudienceType === 'all_faculty' || s.targetAudienceType === 'faculty_all');
        return isAssignedTrainer || isCreator || isTargetedStaff || isFacultyWide;
      });
    }

    // Admins see all sessions
    return sessions;
  }, [sessions, isStudent, isTrainer, user?.id, studentCohortIds, studentCourseIds]);

  // Apply Search and Dropdown Filters
  const displayedSessions = useMemo(() => {
    return roleFilteredSessions.filter((s) => {
      if (statusFilter === 'live' && s.status !== 'live') return false;
      if (statusFilter === 'upcoming' && s.status !== 'scheduled') return false;
      if (statusFilter === 'ended' && s.status !== 'ended') return false;
      if (statusFilter === 'cancelled' && s.status !== 'cancelled') return false;

      if (deptFilter !== 'all' && s.departmentId !== deptFilter) return false;
      if (courseFilter !== 'all' && s.courseId !== courseFilter) return false;
      if (cohortFilter !== 'all' && s.cohortId !== cohortFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = s.title.toLowerCase().includes(q);
        const matchTrainer = s.instructorName?.toLowerCase().includes(q);
        const matchDesc = s.description?.toLowerCase().includes(q);
        if (!matchTitle && !matchTrainer && !matchDesc) return false;
      }

      return true;
    });
  }, [roleFilteredSessions, statusFilter, deptFilter, courseFilter, cohortFilter, searchQuery]);

  // Metric Stats
  const stats = useMemo(() => {
    const liveCount = roleFilteredSessions.filter((s) => s.status === 'live').length;
    const upcomingCount = roleFilteredSessions.filter((s) => s.status === 'scheduled').length;
    const endedCount = roleFilteredSessions.filter((s) => s.status === 'ended').length;
    const totalEnrolled = roleFilteredSessions.reduce((acc, curr) => acc + (curr.enrolledCount || 0), 0);
    return { liveCount, upcomingCount, endedCount, totalEnrolled };
  }, [roleFilteredSessions]);

  // Copy Meeting Link
  const handleCopyLink = (session: LiveSession) => {
    const link = session.meetingUrl || session.joinLink;
    if (!link) {
      showNotice('This session does not have a Google Meet link configured yet.');
      return;
    }
    navigator.clipboard.writeText(link);
    setCopiedSessionId(session.id);
    showNotice(`Google Meet link copied: ${link}`);
    setTimeout(() => setCopiedSessionId(null), 3000);
  };

  // Launch Broadcast / Open Google Meet
  const handleStartBroadcast = (sessionId: string) => {
    startBroadcast(sessionId);
    const updated = sessions.find((s) => s.id === sessionId);
    if (updated) {
      const meetUrl = updated.meetingUrl || updated.joinLink;
      if (meetUrl) {
        window.open(meetUrl, '_blank', 'noopener,noreferrer');
        showNotice(`Session is now LIVE NOW on Google Meet! Meeting opened in a new tab.`);
      } else {
        showNotice('This session does not have a Google Meet link configured yet.');
      }
    }
  };

  // Confirm Cancellation
  const handleConfirmCancel = () => {
    if (!cancelModalSession) return;
    cancelSession(cancelModalSession.id, cancelReason, true);
    showNotice(`Session "${cancelModalSession.title}" has been cancelled and students notified.`);
    setCancelModalSession(null);
  };

  // Time until start formatter
  const getTimeUntilStart = (dateStr?: string, timeStr?: string) => {
    if (!dateStr || !timeStr) return 'Upcoming';
    try {
      const targetDate = new Date(`${dateStr}T${timeStr}:00`);
      const now = new Date();
      const diffMs = targetDate.getTime() - now.getTime();

      if (diffMs <= 0) return 'Starting imminently';
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffDays > 0) return `Starts in ${diffDays}d ${diffHours % 24}h`;
      if (diffHours > 0) return `Starts in ${diffHours}h ${diffMins % 60}m`;
      return `Starts in ${diffMins} minutes`;
    } catch {
      return 'Upcoming';
    }
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
            {activeTab === 'timetable'
              ? 'My Weekly Timetable'
              : activeTab === 'recordings'
              ? 'Recorded Classes & Lectures'
              : 'Live Sessions & Broadcasts'}
          </h1>
          <p className="text-secondary text-sm" style={{ margin: 0 }}>
            {activeTab === 'timetable'
              ? 'Personalized weekly schedule, time slots, room locations, and class calendar.'
              : activeTab === 'recordings'
              ? 'On-demand video lecture library with AI transcripts, chapter bookmarks, and downloadable slide materials.'
              : 'Schedule and manage live classes, broadcasts, and interactive webinars.'}
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {!isStudent && (
            <button
              className="btn btn-primary"
              onClick={() => {
                setSessionToEdit(null);
                setIsScheduleModalOpen(true);
              }}
              style={{ gap: '8px', padding: '10px 20px', fontWeight: 700 }}
            >
              <Plus size={18} /> {activeTab === 'timetable' ? 'Create Schedule' : 'Schedule Live Session'}
            </button>
          )}
        </div>
      </div>


      {/* 1. MY WEEKLY TIMETABLE TAB CONTENT */}
      {activeTab === 'timetable' && (
        <WeeklyTimetableView
          sessions={sessions}
          onSelectSession={(session) => setSelectedDetailSession(session)}
          onLaunchLiveRoom={(session) => setActiveLiveRoomSession(session)}
          onOpenScheduleModal={() => {
            setSessionToEdit(null);
            setIsScheduleModalOpen(true);
          }}
          showNotice={showNotice}
        />
      )}

      {/* 2. RECORDED CLASSES TAB CONTENT */}
      {activeTab === 'recordings' && (
        <RecordedClassesView
          sessions={roleFilteredSessions}
          onPlayRecording={(session) => setRecordingModalSession(session)}
          showNotice={showNotice}
        />
      )}

      {/* 3. LIVE SESSIONS HUB */}
      {activeTab === 'live_sessions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Simplified 4 Summary Metric Cards */}
          <div className="grid-4" style={{ gap: '16px' }}>
          <div className="stat-card" style={{ borderLeft: '4px solid #ef4444', padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span className="text-muted text-xs font-semibold">Live Now</span>
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: stats.liveCount > 0 ? '#ef4444' : '#94a3b8',
                  boxShadow: stats.liveCount > 0 ? '0 0 8px #ef4444' : 'none',
                  animation: stats.liveCount > 0 ? 'pulse 1.5s infinite' : 'none',
                }}
              />
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: stats.liveCount > 0 ? '#ef4444' : 'var(--text-main)' }}>
              {stats.liveCount}
            </div>
          </div>

          <div className="stat-card" style={{ borderLeft: '4px solid var(--primary)', padding: '16px 18px' }}>
            <span className="text-muted text-xs font-semibold" style={{ display: 'block', marginBottom: '4px' }}>Upcoming</span>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--primary)' }}>
              {stats.upcomingCount}
            </div>
          </div>

          <div className="stat-card" style={{ borderLeft: '4px solid var(--success)', padding: '16px 18px' }}>
            <span className="text-muted text-xs font-semibold" style={{ display: 'block', marginBottom: '4px' }}>Completed</span>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--success)' }}>
              {stats.endedCount}
            </div>
          </div>

          <div className="stat-card" style={{ borderLeft: '4px solid var(--accent-purple)', padding: '16px 18px' }}>
            <span className="text-muted text-xs font-semibold" style={{ display: 'block', marginBottom: '4px' }}>Total Enrolled</span>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-main)' }}>
              {stats.totalEnrolled}
            </div>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div
          className="card"
          style={{
            padding: '16px',
            background: 'var(--bg-surface)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {/* Top Row: Search & Dropdowns */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: '400px' }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                type="text"
                className="input"
                placeholder="Search live sessions by title, trainer or topic..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '38px', height: '40px' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {/* Dept filter */}
              <select
                className="input"
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                style={{ width: 'auto', height: '40px', fontSize: '0.85rem' }}
              >
                <option value="all">All Departments</option>
                {mockDepartments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>

              {/* Course filter */}
              <select
                className="input"
                value={courseFilter}
                onChange={(e) => setCourseFilter(e.target.value)}
                style={{ width: 'auto', height: '40px', fontSize: '0.85rem' }}
              >
                <option value="all">All Courses</option>
                {mockCourses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>

              {/* Cohort filter */}
              <select
                className="input"
                value={cohortFilter}
                onChange={(e) => setCohortFilter(e.target.value)}
                style={{ width: 'auto', height: '40px', fontSize: '0.85rem' }}
              >
                <option value="all">All Cohorts / Batches</option>
                {cohorts.map((coh) => (
                  <option key={coh.id} value={coh.id}>
                    {coh.name}
                  </option>
                ))}
              </select>

              {/* View Switcher: List vs Calendar */}
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
                  className={`btn btn-sm ${viewMode === 'list' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setViewMode('list')}
                  style={{
                    padding: '6px 12px',
                    gap: '6px',
                    color: viewMode === 'list' ? '#ffffff' : 'var(--text-secondary)',
                  }}
                >
                  <List size={14} /> List
                </button>
                <button
                  className={`btn btn-sm ${viewMode === 'calendar' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setViewMode('calendar')}
                  style={{
                    padding: '6px 12px',
                    gap: '6px',
                    color: viewMode === 'calendar' ? '#ffffff' : 'var(--text-secondary)',
                  }}
                >
                  <Calendar size={14} /> Calendar
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Row: Status Filter Badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', paddingTop: '4px' }}>
            <span className="text-muted text-xs" style={{ fontWeight: 600 }}>Filter by status:</span>
            {(['all', 'live', 'upcoming', 'ended', 'cancelled'] as const).map((stat) => (
              <button
                key={stat}
                onClick={() => setStatusFilter(stat)}
                className={`btn btn-sm ${statusFilter === stat ? 'btn-primary' : 'btn-secondary'}`}
                style={{
                  textTransform: 'capitalize',
                  fontSize: '0.78rem',
                  padding: '4px 12px',
                  borderRadius: '20px',
                }}
              >
                {stat === 'all' ? 'All Sessions' : stat === 'live' ? 'Live Now' : stat === 'upcoming' ? 'Upcoming' : stat === 'ended' ? 'Completed' : 'Cancelled'}
              </button>
            ))}
          </div>
        </div>

        {/* Live Sessions Content: Cards or Calendar View */}
        {displayedSessions.length === 0 ? (
          <div className="card" style={{ padding: '48px 24px', textAlign: 'center', background: 'var(--bg-surface)' }}>
            <Video size={48} color="var(--text-muted)" style={{ margin: '0 auto 16px' }} />
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', fontWeight: 700 }}>No Live Sessions Found</h3>
            <p className="text-secondary text-sm" style={{ maxWidth: '460px', margin: '0 auto 20px' }}>
              There are no live or scheduled sessions matching your current filter criteria.
            </p>
            {!isStudent && (
              <button
                className="btn btn-primary"
                onClick={() => {
                  setSessionToEdit(null);
                  setIsScheduleModalOpen(true);
                }}
              >
                <Plus size={16} /> Schedule a Session
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
            {displayedSessions.map((s) => {
              const isLive = s.status === 'live';
              const isScheduled = s.status === 'scheduled';
              const isEnded = s.status === 'ended';
              const isCancelled = s.status === 'cancelled';
              const isCreatorOrAdmin = isAdmin || s.createdBy === user?.id || s.instructorId === user?.id;

              return (
                <div
                  key={s.id}
                  className="card session-card"
                  style={{
                    padding: '20px',
                    background: 'var(--bg-surface)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '16px',
                    border: isLive ? '1.5px solid #ef4444' : '1px solid var(--border-subtle)',
                    boxShadow: isLive ? '0 0 16px rgba(239, 68, 68, 0.18)' : 'var(--shadow-sm)',
                    position: 'relative',
                  }}
                >
                  {/* Top Bar: Status Badge & Target Info */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '10px' }}>
                      {isLive && (
                        <span
                          className="badge"
                          style={{
                            background: '#ef4444',
                            color: '#fff',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontWeight: 800,
                            fontSize: '0.75rem',
                          }}
                        >
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fff' }} />
                          LIVE NOW
                        </span>
                      )}
                      {isScheduled && (
                        <span className="badge badge-published" style={{ fontSize: '0.75rem' }}>
                          Upcoming
                        </span>
                      )}
                      {isEnded && (
                        <span className="badge badge-secondary" style={{ fontSize: '0.75rem' }}>
                          Completed
                        </span>
                      )}
                      {isCancelled && (
                        <span className="badge badge-danger" style={{ fontSize: '0.75rem' }}>
                          Cancelled
                        </span>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <MeetingProviderBadge provider={s.provider || 'Google Meet'} hasLink={Boolean(s.meetingUrl || s.joinLink)} />
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                          {s.audienceScope === 'faculty' ? 'Faculty Internal' : s.cohortName || 'Enrolled Students'}
                        </span>
                      </div>
                    </div>

                    {/* Session Title */}
                    <h3 style={{ margin: '0 0 6px 0', fontSize: '1.15rem', fontWeight: 800, lineHeight: 1.35 }}>
                      {s.title}
                    </h3>

                    {/* Course Title if assigned */}
                    {s.courseTitle && (
                      <div
                        style={{
                          fontSize: '0.78rem',
                          color: 'var(--primary)',
                          fontWeight: 600,
                          marginBottom: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <BookOpen size={13} />
                        <span>{s.courseTitle}</span>
                      </div>
                    )}

                    {/* Description preview */}
                    {s.description && (
                      <p
                        className="text-secondary text-xs"
                        style={{
                          margin: '0 0 14px 0',
                          lineHeight: 1.5,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {s.description}
                      </p>
                    )}

                    {/* Metadata Grid */}
                    <div
                      style={{
                        background: 'var(--bg-card)',
                        padding: '12px',
                        borderRadius: 'var(--radius-md)',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: '8px 12px',
                        fontSize: '0.78rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                        <Calendar size={13} color="var(--primary)" />
                        <span>{s.date || 'Weekly'}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                        <Clock size={13} color="var(--primary)" />
                        <span>{s.startTime} - {s.endTime}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                        <UserCheck size={13} color="var(--accent-green)" />
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {s.instructorName || 'Lead Trainer'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                        <Users size={13} color="var(--accent-purple)" />
                        <span>{s.enrolledCount || 0} enrolled</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Toolbar */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
                    {/* Primary Action Button */}
                    {isLive && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <GoogleMeetJoinButton
                          meetingUrl={s.meetingUrl || s.joinLink}
                          role={isCreatorOrAdmin ? 'instructor' : 'student'}
                          label={isCreatorOrAdmin ? 'Open Google Meet' : 'Join with Google Meet'}
                          size="md"
                          style={{ flex: 1, justifyContent: 'center' }}
                        />
                        {isCreatorOrAdmin && (
                          <button
                            className="btn btn-secondary"
                            onClick={() => {
                              endSession(s.id);
                              showNotice(`Broadcast ended for "${s.title}". Recording will be available shortly.`);
                            }}
                            title="End live broadcast"
                            style={{ padding: '8px 12px', color: 'var(--danger)' }}
                          >
                            End Stream
                          </button>
                        )}
                      </div>
                    )}

                    {isScheduled && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {isCreatorOrAdmin ? (
                          <button
                            className="btn btn-primary"
                            onClick={() => handleStartBroadcast(s.id)}
                            style={{ flex: 1, justifyContent: 'center', gap: '6px', fontWeight: 700 }}
                          >
                            <GoogleMeetIcon size={16} /> Open Google Meet
                          </button>
                        ) : (
                          <GoogleMeetJoinButton
                            meetingUrl={s.meetingUrl || s.joinLink}
                            role="student"
                            label="Join with Google Meet"
                            size="md"
                            style={{ flex: 1, justifyContent: 'center' }}
                          />
                        )}
                        <button
                          className="btn btn-secondary"
                          onClick={() => handleCopyLink(s)}
                          title="Copy Meeting Link"
                          style={{ padding: '8px 12px' }}
                        >
                          {copiedSessionId === s.id ? <Check size={15} color="var(--success)" /> : <Copy size={15} />}
                        </button>
                      </div>
                    )}

                    {isEnded && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {s.recordingUrl ? (
                          <button
                            className="btn btn-primary"
                            onClick={() => setRecordingModalSession(s)}
                            style={{ flex: 1, justifyContent: 'center', gap: '6px' }}
                          >
                            <Play size={15} /> Watch Recording
                          </button>
                        ) : (
                          <div style={{ flex: 1, textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)', padding: '8px' }}>
                            Recording processing
                          </div>
                        )}
                      </div>
                    )}

                    {/* Secondary Action Toolbar */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => setRosterModalSession(s)}
                        style={{ fontSize: '0.75rem', padding: '4px 8px', gap: '4px' }}
                      >
                        <Users size={13} /> View Roster
                      </button>

                      {isCreatorOrAdmin && !isEnded && !isCancelled && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => {
                              setSessionToEdit(s);
                              setIsScheduleModalOpen(true);
                            }}
                            title="Edit live session details"
                            style={{ padding: '4px 8px' }}
                          >
                            <Edit2 size={13} />
                          </button>

                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => setCancelModalSession(s)}
                            title="Cancel session and notify scholars"
                            style={{ padding: '4px 8px', color: 'var(--danger)' }}
                          >
                            <AlertTriangle size={13} />
                          </button>
                        </div>
                      )}

                      {isCreatorOrAdmin && (isEnded || isCancelled) && (
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => {
                            if (confirm(`Permanently remove record for "${s.title}"?`)) {
                              deleteSession(s.id);
                              showNotice(`Session removed from archives.`);
                            }
                          }}
                          style={{ padding: '4px 8px', color: 'var(--danger)', gap: '4px' }}
                        >
                          <Trash2 size={13} /> Delete Record
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      )}

      {/* MODAL 1: SCHEDULE / EDIT LIVE SESSION */}
      <ScheduleLiveSessionModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        sessionToEdit={sessionToEdit}
        onSuccess={showNotice}
      />

      {/* MODAL 2: INTERACTIVE LIVE CLASSROOM STREAM DEMO */}
      <LiveClassroomDemoModal
        session={activeLiveRoomSession}
        isOpen={Boolean(activeLiveRoomSession)}
        onClose={() => setActiveLiveRoomSession(null)}
        onSessionEnded={() => showNotice('Live broadcast concluded and video recorded.')}
      />

      {/* MODAL 3: RECORDED SESSION PLAYER */}
      <LiveRecordingPlayerModal
        session={recordingModalSession}
        isOpen={Boolean(recordingModalSession)}
        onClose={() => setRecordingModalSession(null)}
      />

      {/* MODAL 4: SESSION TARGET AUDIENCE & ROSTER */}
      <SessionRosterModal
        session={rosterModalSession}
        isOpen={Boolean(rosterModalSession)}
        onClose={() => setRosterModalSession(null)}
      />

      {/* MODAL 5: CANCEL SESSION CONFIRMATION */}
      {cancelModalSession && (
        <div
          className="modal-overlay"
          onClick={() => setCancelModalSession(null)}
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
              maxWidth: '480px',
              padding: '24px',
              borderRadius: '14px',
              boxShadow: 'var(--shadow-xl)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', color: 'var(--danger)' }}>
              <AlertTriangle size={24} />
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>
                Cancel Live Session
              </h3>
            </div>

            <p className="text-secondary text-sm" style={{ margin: '0 0 16px 0', lineHeight: 1.5 }}>
              Are you sure you want to cancel <strong>"{cancelModalSession.title}"</strong> scheduled for{' '}
              {cancelModalSession.date} at {cancelModalSession.startTime}?
            </p>

            <div style={{ marginBottom: '20px' }}>
              <label className="label" style={{ fontWeight: 600 }}>
                Reason for Cancellation (included in student alert)
              </label>
              <textarea
                className="input"
                rows={2}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn btn-secondary" onClick={() => setCancelModalSession(null)}>
                Keep Session
              </button>
              <button className="btn btn-danger" onClick={handleConfirmCancel}>
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: TIMETABLE CLASS DETAILS */}
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
                    background: '#6366f1',
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
                  {selectedDetailSession.dayOfWeek || 'Scheduled Day'}, {selectedDetailSession.date || 'Weekly'}
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
                  Assigned Instructor
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
                  {selectedDetailSession.cohortName || 'Spring 2026 Engineering'}
                </span>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.72rem', marginBottom: '2px' }}>
                  Meeting Provider
                </span>
                <MeetingProviderBadge provider={selectedDetailSession.provider || 'Google Meet'} hasLink={Boolean(selectedDetailSession.meetingUrl || selectedDetailSession.joinLink)} />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.72rem', marginBottom: '4px' }}>
                  Google Meet Link
                </span>
                {selectedDetailSession.meetingUrl || selectedDetailSession.joinLink ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <a
                      href={selectedDetailSession.meetingUrl || selectedDetailSession.joinLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: '#38bdf8',
                        fontSize: '0.8rem',
                        fontFamily: 'monospace',
                        textDecoration: 'underline',
                        wordBreak: 'break-all'
                      }}
                    >
                      {selectedDetailSession.meetingUrl || selectedDetailSession.joinLink}
                    </a>
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                      onClick={() => handleCopyLink(selectedDetailSession)}
                    >
                      <Copy size={12} /> Copy
                    </button>
                  </div>
                ) : (
                  <span style={{ fontSize: '0.78rem', color: '#f59e0b', fontStyle: 'italic' }}>
                    This session does not have a Google Meet link configured yet.
                  </span>
                )}
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
                    <span className="badge badge-secondary" style={{ fontSize: '0.68rem' }}>Completed</span>
                  ) : (
                    <span className="badge badge-published" style={{ fontSize: '0.68rem' }}>Scheduled</span>
                  )}
                </span>
              </div>
            </div>

            {selectedDetailSession.description && (
              <div style={{ marginBottom: '16px' }}>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.72rem', marginBottom: '4px' }}>
                  Objectives & Curriculum Agenda
                </span>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  {selectedDetailSession.description}
                </p>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
              <div>
                {selectedDetailSession.recordingUrl && (
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      const toPlay = selectedDetailSession;
                      setSelectedDetailSession(null);
                      setRecordingModalSession(toPlay);
                    }}
                    style={{ gap: '6px' }}
                  >
                    <Play size={13} /> Watch Replay
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
    </div>
  );
};
