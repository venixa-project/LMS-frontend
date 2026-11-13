import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../lib/store';
import { useLiveSessionStore } from '../../lib/liveSessionStore';
import { useCohortStore } from '../../lib/cohortStore';
import { useDepartmentStore } from '../../lib/departmentStore';
import { useCourseStore } from '../../lib/courseStore';
import { LiveSession } from '../../types';
import {
  Video, Plus, Calendar, Clock, Users, ExternalLink,
  Edit2, X, CheckCircle2, AlertTriangle, Play, Radio,
  ShieldCheck, FileText, Check, AlertCircle, Download,
  Filter, UserCheck, Shield, ChevronRight, ChevronLeft, Search, Share2,
  Trash2, PhoneCall, Sparkles, LayoutList, CalendarDays,
  Copy, BookOpen, GraduationCap, Building2, List, MapPin, Eye, Settings,
  Square, UploadCloud
} from 'lucide-react';

import { ScheduleLiveSessionModal } from './components/ScheduleLiveSessionModal';
import { CreateTimetablePeriodModal } from './components/CreateTimetablePeriodModal';
import { LiveClassroomDemoModal } from './components/LiveClassroomDemoModal';
import { LiveRecordingPlayerModal } from './components/LiveRecordingPlayerModal';
import { SessionRosterModal } from './components/SessionRosterModal';
import { WeeklyTimetableView } from './components/WeeklyTimetableView';
import { RecordedClassesView } from './components/RecordedClassesView';
import { MeetingRecorderWidget } from './components/MeetingRecorderWidget';
import { useScreenRecorder } from '../../lib/useScreenRecorder';
import { MeetingProviderBadge, GoogleMeetJoinButton, GoogleMeetIcon } from '../../components/GoogleMeet';
import { openGoogleMeetSession, isValidGoogleMeetUrl } from '../../lib/googleMeet';
import { ConfirmationModal } from '../../components/ConfirmationModal';

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

  const { user } = useAuthStore();
  const isTrainer = user?.activeRole === 'trainer' || user?.activeRole === 'instructor';
  const isStudent = user?.activeRole === 'student' || user?.activeRole === 'learner';
  const isAdmin = user?.activeRole === 'org_admin' || user?.activeRole === 'platform_admin' || user?.activeRole === 'lms_admin';

  const [searchParams, setSearchParams] = useSearchParams();

  // Determine initial active tab from props or URL
  const determineInitialTab = (): 'live_sessions' | 'timetable' | 'recordings' => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'timetable' || tabParam === 'weekly-timetable') return 'timetable';
    if (tabParam === 'recordings' || tabParam === 'recorded-classes' || tabParam === 'recorded_classes') return 'recordings';
    if (tabParam === 'live' || tabParam === 'live-sessions') return 'live_sessions';
    if (defaultTab === 'timetable' || currentPath === '/timetable' || currentPath === '/weekly-timetable' || currentPath === '/classes-timetable') {
      return 'timetable';
    }
    if (defaultTab === 'recordings' || currentPath === '/recorded-classes' || currentPath === '/recorded_classes' || currentPath === '/recordings') {
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
    fetchSessions,
    startBroadcast,
    endSession,
    cancelSession,
    deleteSession,
    generateGoogleMeet,
    attachGoogleMeet,
    defaultMeetUrl,
    fetchDefaultMeetUrl,
    setDefaultMeetUrl,
  } = useLiveSessionStore();

  const { cohorts, fetchCohorts } = useCohortStore();
  const { courses, enrollments, fetchCourses } = useCourseStore();

  useEffect(() => {
    fetchSessions();
    fetchCohorts();
    fetchCourses();
    const interval = setInterval(() => {
      fetchSessions();
    }, 30000);
    const handleFocus = () => {
      fetchSessions();
      fetchCohorts();
      fetchCourses();
    };
    window.addEventListener('focus', handleFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchSessions, fetchCohorts, fetchCourses]);

  // Sub-filter for Live Sessions
  const [statusFilter, setStatusFilter] = useState<'all' | 'live' | 'upcoming' | 'ended' | 'cancelled'>('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [courseFilter, setCourseFilter] = useState('all');
  const [cohortFilter, setCohortFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  // Modals State
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isTimetablePeriodModalOpen, setIsTimetablePeriodModalOpen] = useState(false);
  const [attachMeetSession, setAttachMeetSession] = useState<LiveSession | null>(null);
  const [attachMeetUrlInput, setAttachMeetUrlInput] = useState('');
  const [attachMeetError, setAttachMeetError] = useState<string | null>(null);
  const [isGeneratingMeet, setIsGeneratingMeet] = useState(false);
  const [sessionToEdit, setSessionToEdit] = useState<LiveSession | null>(null);
  const [selectedDetailSession, setSelectedDetailSession] = useState<LiveSession | null>(null);
  const [activeLiveRoomSession, setActiveLiveRoomSession] = useState<LiveSession | null>(null);
  const [recordingModalSession, setRecordingModalSession] = useState<LiveSession | null>(null);
  const [rosterModalSession, setRosterModalSession] = useState<LiveSession | null>(null);
  const [concludeModalSession, setConcludeModalSession] = useState<LiveSession | null>(null);
  const [meetLaunchedNotice, setMeetLaunchedNotice] = useState(false);

  // Institutional Default Google Meet State
  const [isDefaultMeetModalOpen, setIsDefaultMeetModalOpen] = useState(false);
  const [defaultMeetInput, setDefaultMeetInput] = useState('');
  const [defaultMeetError, setDefaultMeetError] = useState<string | null>(null);
  const [saveAsDefaultRoom, setSaveAsDefaultRoom] = useState(true);

  useEffect(() => {
    fetchDefaultMeetUrl();
  }, [fetchDefaultMeetUrl]);

  // Cancellation Modal
  const [cancelModalSession, setCancelModalSession] = useState<LiveSession | null>(null);
  const [cancelReason, setCancelReason] = useState('Faculty schedule conflict & curriculum rescheduling');
  const [deleteSessionModal, setDeleteSessionModal] = useState<{ id: string; title: string } | null>(null);

  // Screen & Google Meet In-Browser Recorder
  const {
    state: recorderState,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    cancelRecording,
  } = useScreenRecorder();

  const handleStartMeetingRecording = async (s: LiveSession) => {
    const res = await startRecording({ id: s.id, title: s.title, withMic: true });
    if (res.success) {
      showNotice(`Screen recorder active! In Chrome's popup, select the Google Meet tab to capture your webcam, motions & audio.`);
    } else if (res.error) {
      showNotice(`Recording error: ${res.error}`);
    }
  };

  const handleStopAndSaveRecorder = async () => {
    const res = await stopRecording();
    if (res.success) {
      await fetchSessions();
      showNotice(`Live class recording saved and uploaded successfully! Students can now replay it in Recorded Classes.`);
    } else if (res.error) {
      showNotice(`Failed to upload recording: ${res.error}`);
    }
  };

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

  // Student Cohorts & Courses (dynamically resolved)
  const studentCohorts = useMemo(() => {
    if (!isStudent || !user) return [];
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
  }, [isStudent, cohorts, user]);

  const studentCohortIds = useMemo(() => {
    if (!isStudent) return [];
    const fromUser = user?.departmentId ? [user.departmentId] : [];
    const fromEnrollments = enrollments.map((e) => e.cohortId).filter(Boolean) as string[];
    const fromCohorts = studentCohorts.map((c) => c.id);
    return Array.from(new Set([...fromUser, ...fromEnrollments, ...fromCohorts]));
  }, [isStudent, user?.departmentId, enrollments, studentCohorts]);

  const studentCohortNames = useMemo(() => {
    if (!isStudent) return [];
    return studentCohorts.map((c) => c.name.toLowerCase());
  }, [isStudent, studentCohorts]);

  const studentCourseIds = useMemo(() => {
    if (!isStudent) return [];
    const fromUser = user?.eligibleCourseIds || [];
    const fromEnrollments = enrollments.map((e) => e.courseId).filter(Boolean);
    const fromCohorts = studentCohorts.map((c) => c.courseId).filter(Boolean) as string[];
    return Array.from(new Set([...fromUser, ...fromEnrollments, ...fromCohorts]));
  }, [isStudent, user?.eligibleCourseIds, enrollments, studentCohorts]);

  const studentCourseTitles = useMemo(() => {
    if (!isStudent) return [];
    return courses
      .filter((c) => studentCourseIds.includes(c.id) || studentCourseIds.includes(c.slug || ''))
      .map((c) => c.title.toLowerCase());
  }, [isStudent, studentCourseIds, courses]);

  // Filtered Sessions for the current role
  const roleFilteredSessions = useMemo(() => {
    if (isStudent) {
      const sId = user?.id || '';
      return sessions.filter((s) => {
        // Exclude faculty internal meetings
        if (
          s.audienceScope === 'faculty' ||
          s.targetAudienceType === 'faculty_only' ||
          s.targetAudienceType === 'faculty_all' ||
          s.targetAudienceType === 'faculty_selected'
        ) {
          return false;
        }

        // If explicitly assigned in targeted student IDs
        if (s.targetStudentIds && s.targetStudentIds.length > 0) {
          if (s.targetStudentIds.includes(sId)) return true;
          if (s.targetAudienceType === 'selected_students') return false;
        }

        // Match by Cohort ID or Cohort Name
        if (s.cohortId && studentCohortIds.includes(s.cohortId)) return true;
        if (s.cohortName && studentCohortNames.includes(s.cohortName.toLowerCase())) return true;

        // Match by Course ID or Course Title
        if (s.courseId && studentCourseIds.includes(s.courseId)) return true;
        if (
          s.courseTitle &&
          studentCourseTitles.some(
            (t) =>
              s.courseTitle?.toLowerCase().includes(t) ||
              t.includes(s.courseTitle?.toLowerCase() || '')
          )
        ) {
          return true;
        }

        // General student session (open to all students in institution / combined)
        if (
          s.targetAudienceType === 'all_cohort' ||
          s.targetAudienceType === 'all_enrolled' ||
          s.targetAudienceType === 'combined' ||
          !s.targetAudienceType ||
          s.audienceScope === 'students' ||
          s.audienceScope === 'both'
        ) {
          if (!s.courseId && !s.cohortId) return true;
          if (studentCourseIds.length === 0 && studentCohortIds.length === 0) return true;
          if (s.courseId && (studentCourseIds.length === 0 || studentCourseIds.includes(s.courseId))) return true;
          if (s.cohortId && (studentCohortIds.length === 0 || studentCohortIds.includes(s.cohortId))) return true;
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
  }, [sessions, isStudent, isTrainer, user?.id, studentCohortIds, studentCohortNames, studentCourseIds, studentCourseTitles]);

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
    showNotice(`Google Meet link copied successfully.`);
    setTimeout(() => setCopiedSessionId(null), 3000);
  };

  // Share Meeting Link via Web Share API or Clipboard Fallback
  const handleShareLink = async (session: LiveSession) => {
    const link = session.meetingUrl || session.joinLink;
    if (!link) {
      showNotice('This session does not have a Google Meet link configured yet.');
      return;
    }
    const shareData = {
      title: session.title,
      text: `Join the live class session "${session.title}" on Google Meet:`,
      url: link,
    };
    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        showNotice('Session link shared successfully.');
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }
    }
    navigator.clipboard.writeText(link);
    setCopiedSessionId(session.id);
    showNotice(`Google Meet link copied to clipboard: ${link}`);
    setTimeout(() => setCopiedSessionId(null), 3000);
  };

  // Generate canonical Google Meet link
  const handleGenerateMeet = async (sessionId: string) => {
    const res = await generateGoogleMeet(sessionId);
    if (res.success && res.meetingUrl) {
      showNotice(`Google Meet room created and saved: ${res.meetingUrl}`);
    } else {
      showNotice(res.message || 'Failed to generate Google Meet room.');
    }
  };

  // Check if session is within the permitted 15-minute join window (and not ended)
  const isJoinWindowOpen = (session: LiveSession) => {
    if (session.status === 'live') return true;
    if (session.status === 'ended' || session.status === 'cancelled') return false;
    if (!session.date || !session.startTime) return false;
    try {
      const datePart = typeof session.date === 'string'
        ? session.date.slice(0, 10)
        : new Date(session.date).toISOString().slice(0, 10);

      const [startH, startM] = (session.startTime || '10:00').split(':').map(Number);
      const sessionStart = new Date(`${datePart}T${String(startH || 0).padStart(2, '0')}:${String(startM || 0).padStart(2, '0')}:00`);

      let sessionEnd: Date;
      if (session.endTime) {
        const [endH, endM] = session.endTime.split(':').map(Number);
        sessionEnd = new Date(`${datePart}T${String(endH || 0).padStart(2, '0')}:${String(endM || 0).padStart(2, '0')}:00`);
      } else {
        sessionEnd = new Date(sessionStart.getTime() + 90 * 60 * 1000);
      }

      if (isNaN(sessionStart.getTime())) return true;

      const now = new Date();
      const windowStart = new Date(sessionStart.getTime() - 15 * 60 * 1000);

      // Permitted join window: 15 minutes before scheduled start time until scheduled end time
      return now >= windowStart && now <= sessionEnd;
    } catch {
      return true;
    }
  };

  // Launch Broadcast / Open Google Meet
  const handleStartBroadcast = async (sessionId: string) => {
    let currentSession = sessions.find((s) => s.id === sessionId);
    if (!currentSession?.meetingUrl || !isValidGoogleMeetUrl(currentSession.meetingUrl)) {
      const res = await generateGoogleMeet(sessionId);
      if (res?.meetingUrl && isValidGoogleMeetUrl(res.meetingUrl)) {
        currentSession = { ...currentSession, meetingUrl: res.meetingUrl } as LiveSession;
      } else {
        // No valid meeting room configured yet. Open meet.google.com/new and prompt 1-click sync
        window.open('https://meet.google.com/new', '_blank', 'noopener,noreferrer');
        if (currentSession) {
          setAttachMeetSession(currentSession);
          setAttachMeetUrlInput('');
          setAttachMeetError(null);
          setMeetLaunchedNotice(true);
        }
        await startBroadcast(sessionId);
        showNotice('Google Meet opened in a new tab! Copy your room link and paste it in the sync modal.');
        return;
      }
    }
    await startBroadcast(sessionId);
    const updated = sessions.find((s) => s.id === sessionId) || currentSession;
    if (updated) {
      const meetUrl = updated.meetingUrl || updated.joinLink;
      if (meetUrl && isValidGoogleMeetUrl(meetUrl)) {
        openGoogleMeetSession(meetUrl);
        showNotice(`Session is now LIVE on Google Meet! Meeting room opened in a new tab.`);
      } else {
        showNotice('Session is now LIVE.');
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

  if (defaultTab === 'attendance' || currentPath === '/attendance' || currentPath === '/attendance-ledger') {
    return <AttendanceLedgerPage />;
  }

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
                if (activeTab === 'timetable') {
                  setIsTimetablePeriodModalOpen(true);
                } else {
                  setSessionToEdit(null);
                  setIsScheduleModalOpen(true);
                }
              }}
              style={{ gap: '8px', padding: '10px 20px', fontWeight: 700 }}
            >
              <Plus size={18} /> {activeTab === 'timetable' ? 'Add Class Period' : 'Schedule Live Session'}
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
            setIsTimetablePeriodModalOpen(true);
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
          {/* Institutional Permanent Google Meet Status Banner */}
          {!isStudent && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                padding: '12px 18px',
                borderRadius: '10px',
                background: defaultMeetUrl
                  ? 'linear-gradient(135deg, rgba(0, 172, 71, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%)'
                  : 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.05) 100%)',
                border: defaultMeetUrl
                  ? '1.5px solid rgba(0, 172, 71, 0.35)'
                  : '1.5px dashed rgba(59, 130, 246, 0.4)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <GoogleMeetIcon size={22} />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 800 }}>
                      Institutional Google Meet Room
                    </span>
                    {defaultMeetUrl ? (
                      <span className="badge badge-published" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>
                        Active & Verified
                      </span>
                    ) : (
                      <span className="badge badge-warning" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>
                        Setup Recommended
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {defaultMeetUrl ? (
                      <span>
                        All scheduled sessions automatically link to:{' '}
                        <strong style={{ fontFamily: 'monospace', color: '#22c55e' }}>{defaultMeetUrl}</strong>
                      </span>
                    ) : (
                      <span>
                        Save a permanent Google Meet room so all live classes connect instantly with zero "Check meeting code" errors.
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {defaultMeetUrl && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      navigator.clipboard.writeText(defaultMeetUrl);
                      showNotice('Default meeting link copied to clipboard!');
                    }}
                    style={{ fontSize: '0.75rem', gap: '4px' }}
                  >
                    <Copy size={12} /> Copy Link
                  </button>
                )}
                <button
                  type="button"
                  className={defaultMeetUrl ? 'btn btn-secondary btn-sm' : 'btn btn-primary btn-sm'}
                  onClick={() => {
                    setDefaultMeetInput(defaultMeetUrl || '');
                    setDefaultMeetError(null);
                    setIsDefaultMeetModalOpen(true);
                  }}
                  style={{ fontSize: '0.78rem', gap: '6px', fontWeight: 700 }}
                >
                  <Sparkles size={14} />
                  <span>{defaultMeetUrl ? 'Change Room' : 'Set Permanent Room'}</span>
                </button>
              </div>
            </div>
          )}

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
                  {useDepartmentStore.getState().departments.map((d) => (
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
                  {useCourseStore.getState().courses.map((c) => (
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
                            {s.audienceScope === 'faculty' ? 'Faculty Internal' : s.cohortName ? `Cohort: ${s.cohortName}` : 'All Enrolled'}
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
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <GoogleMeetJoinButton
                              sessionId={s.id}
                              meetingUrl={s.meetingUrl || s.joinLink}
                              role={isCreatorOrAdmin ? 'instructor' : 'student'}
                              label={isCreatorOrAdmin ? 'Open Google Meet' : 'Join Now'}
                              size="md"
                              style={{ flex: 1, justifyContent: 'center' }}
                            />
                            {isCreatorOrAdmin && (
                              <button
                                className="btn btn-secondary"
                                onClick={() => setConcludeModalSession(s)}
                                title="Conclude live broadcast and save recording"
                                style={{ padding: '8px 12px', color: 'var(--danger)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                              >
                                End Stream
                              </button>
                            )}
                          </div>

                          {/* Companion Screen & Video Recorder for Google Meet */}
                          {isCreatorOrAdmin && (
                            <div style={{ display: 'flex', gap: '8px' }}>
                              {recorderState.isRecording && recorderState.activeSessionId === s.id ? (
                                <button
                                  type="button"
                                  className="btn btn-sm"
                                  onClick={handleStopAndSaveRecorder}
                                  style={{
                                    flex: 1,
                                    background: 'rgba(239, 68, 68, 0.15)',
                                    border: '1.5px solid #ef4444',
                                    color: '#ef4444',
                                    fontWeight: 700,
                                    justifyContent: 'center',
                                    gap: '6px',
                                    fontSize: '0.8rem',
                                  }}
                                >
                                  <Square size={13} fill="#ef4444" />
                                  <span>Stop & Save Recording ({Math.floor(recorderState.duration / 60)}:{(recorderState.duration % 60).toString().padStart(2, '0')})</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => handleStartMeetingRecording(s)}
                                  style={{
                                    flex: 1,
                                    justifyContent: 'center',
                                    gap: '6px',
                                    color: '#ef4444',
                                    borderColor: 'rgba(239, 68, 68, 0.4)',
                                    fontWeight: 700,
                                    fontSize: '0.8rem',
                                  }}
                                  title="Capture and record your Google Meet video, movements, audio, and presentation in Full HD"
                                >
                                  <Radio size={14} color="#ef4444" />
                                  <span>Record Google Meet Tab & Cam</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {isScheduled && (
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {isCreatorOrAdmin ? (
                            <>
                              <button
                                className="btn btn-primary"
                                onClick={() => handleStartBroadcast(s.id)}
                                style={{ flex: 1, justifyContent: 'center', gap: '6px', fontWeight: 700 }}
                              >
                                <GoogleMeetIcon size={16} /> Open Google Meet
                              </button>
                              <button
                                className="btn btn-secondary"
                                onClick={() => {
                                  setAttachMeetSession(s);
                                  setAttachMeetUrlInput(s.meetingUrl || '');
                                  setAttachMeetError(null);
                                }}
                                title="Google Meet Settings & Room Link"
                                style={{ padding: '8px 10px' }}
                              >
                                <Settings size={15} />
                              </button>
                              <button
                                className="btn btn-secondary"
                                onClick={() => setConcludeModalSession(s)}
                                title="Conclude class and archive recording for students"
                                style={{ padding: '8px 12px', fontSize: '0.78rem', whiteSpace: 'nowrap' }}
                              >
                                Conclude Class
                              </button>
                            </>
                          ) : (
                            isJoinWindowOpen(s) ? (
                              <GoogleMeetJoinButton
                                sessionId={s.id}
                                meetingUrl={s.meetingUrl || s.joinLink}
                                role="student"
                                label="Join Now"
                                size="md"
                                style={{ flex: 1, justifyContent: 'center' }}
                              />
                            ) : (
                              <button
                                type="button"
                                disabled
                                className="btn btn-secondary"
                                style={{ flex: 1, justifyContent: 'center', opacity: 0.75, cursor: 'not-allowed', fontSize: '0.82rem' }}
                                title="Meeting room opens 15 minutes before scheduled start time."
                              >
                                Scheduled &bull; Opens {s.startTime}
                              </button>
                            )
                          )}
                          {s.meetingUrl && (
                            <button
                              className="btn btn-secondary"
                              onClick={() => handleShareLink(s)}
                              title="Share Meeting Link"
                              style={{ padding: '8px 12px' }}
                            >
                              <Share2 size={15} />
                            </button>
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
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <button
                            className="btn btn-primary"
                            onClick={() => setRecordingModalSession(s)}
                            style={{ flex: 1, justifyContent: 'center', gap: '6px', fontWeight: 700 }}
                          >
                            <Play size={15} /> Watch Recording
                          </button>
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
                              setDeleteSessionModal({ id: s.id, title: s.title });
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

      {/* MODAL 1.5: TIMETABLE PERIOD-WISE CLASS SCHEDULE MODAL */}
      <CreateTimetablePeriodModal
        isOpen={isTimetablePeriodModalOpen}
        onClose={() => setIsTimetablePeriodModalOpen(false)}
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
      {recordingModalSession && (
        <LiveRecordingPlayerModal
          session={recordingModalSession}
          isOpen={Boolean(recordingModalSession)}
          onClose={() => setRecordingModalSession(null)}
        />
      )}

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
                    useCourseStore.getState().courses.find((c) => c.id === selectedDetailSession.courseId)?.title ||
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
                    sessionId={selectedDetailSession.id}
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

      {/* Configure / Attach Google Meet Modal */}
      {attachMeetSession && (
        <div className="modal-backdrop" style={{ zIndex: 1100 }}>
          <div className="modal-content" style={{ maxWidth: '520px', width: '92%' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <GoogleMeetIcon size={20} />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
                  Configure Google Meet Room
                </h3>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setAttachMeetSession(null)}
                style={{ padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px 0' }}>
              <div>
                <h4 style={{ margin: '0 0 4px', fontSize: '0.95rem', fontWeight: 600 }}>
                  {attachMeetSession.title}
                </h4>
                <p className="text-secondary text-xs" style={{ margin: 0 }}>
                  {attachMeetSession.date} &bull; {attachMeetSession.startTime} - {attachMeetSession.endTime} ({attachMeetSession.timezone || 'Asia/Kolkata'})
                </p>
              </div>

              {attachMeetError && (
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: 'var(--danger)',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span>{attachMeetError}</span>
                </div>
              )}

              {/* Primary Action: Launch Genuine Google Meet in New Tab */}
              <div style={{
                padding: '14px 16px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, rgba(0, 172, 71, 0.1) 0%, rgba(0, 131, 45, 0.05) 100%)',
                border: '1.5px solid rgba(0, 172, 71, 0.35)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#22c55e', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <GoogleMeetIcon size={18} />
                      <span>Google Meet Virtual Classroom</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Auto-generate a persistent room, or launch instant room under your Google account.
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {defaultMeetUrl && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          setAttachMeetUrlInput(defaultMeetUrl);
                          setAttachMeetError(null);
                          showNotice(`Loaded default room: ${defaultMeetUrl}`);
                        }}
                        style={{ gap: '6px', fontWeight: 700 }}
                      >
                        <Sparkles size={14} color="var(--primary)" />
                        <span>Use Default Room</span>
                      </button>
                    )}

                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        window.open('https://meet.google.com/new', '_blank', 'noopener,noreferrer');
                        setMeetLaunchedNotice(true);
                        setAttachMeetError(null);
                      }}
                      style={{
                        background: 'linear-gradient(135deg, #00ac47 0%, #00832d 100%)',
                        borderColor: '#00ac47',
                        color: '#ffffff',
                        fontWeight: 700,
                        gap: '6px',
                      }}
                    >
                      <GoogleMeetIcon size={14} /> Launch Google Meet
                    </button>
                  </div>
                </div>

                {meetLaunchedNotice && (
                  <div style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    background: 'rgba(34, 197, 94, 0.15)',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    fontSize: '0.78rem',
                    color: '#86efac',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}>
                    <CheckCircle2 size={14} color="#22c55e" />
                    <span>Google Meet opened in your new tab! Copy the meeting URL from that tab's address bar and click Paste below:</span>
                  </div>
                )}
              </div>

              {/* Paste & Confirm Real Meeting URL */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Google Meet Room URL:
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="url"
                    className="form-input"
                    placeholder="https://meet.google.com/abc-defg-hij"
                    value={attachMeetUrlInput}
                    onChange={(e) => {
                      setAttachMeetUrlInput(e.target.value);
                      setAttachMeetError(null);
                    }}
                    style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.85rem' }}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={async () => {
                      try {
                        const clipText = await navigator.clipboard.readText();
                        if (clipText) {
                          setAttachMeetUrlInput(clipText.trim());
                          setAttachMeetError(null);
                        }
                      } catch (e) {
                        // ignore
                      }
                    }}
                    title="Paste from clipboard"
                    style={{ padding: '8px 12px', fontSize: '0.78rem', gap: '4px' }}
                  >
                    <Copy size={13} /> Paste
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={!attachMeetUrlInput.trim()}
                    onClick={async () => {
                      setAttachMeetError(null);
                      const res = await attachGoogleMeet(attachMeetSession.id, attachMeetUrlInput, saveAsDefaultRoom);
                      if (res.success) {
                        showNotice(`Google Meet link saved & broadcast to students: ${res.meetingUrl}`);
                        setAttachMeetSession(null);
                        setMeetLaunchedNotice(false);
                      } else {
                        setAttachMeetError(res.message || 'Failed to save meeting link.');
                      }
                    }}
                    style={{ whiteSpace: 'nowrap', fontWeight: 700 }}
                  >
                    Save & Open for Students
                  </button>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.82rem', marginTop: '4px' }}>
                  <input
                    type="checkbox"
                    checked={saveAsDefaultRoom}
                    onChange={(e) => setSaveAsDefaultRoom(e.target.checked)}
                  />
                  <span>Save as permanent default Google Meet room for all future classes</span>
                </label>

                <span className="text-muted text-xs">
                  This room link is saved in PostgreSQL and immediately accessible to all enrolled students without "Check your meeting code" errors.
                </span>
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '12px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setAttachMeetSession(null);
                  setMeetLaunchedNotice(false);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Record Confirmation Modal matching user screenshot */}
      <ConfirmationModal
        isOpen={Boolean(deleteSessionModal)}
        title="Delete Session Record"
        message={`Are you sure you want to permanently remove the record for "${deleteSessionModal?.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isDestructive={true}
        onConfirm={() => {
          if (deleteSessionModal) {
            deleteSession(deleteSessionModal.id);
            showNotice('Session removed from archives.');
            setDeleteSessionModal(null);
          }
        }}
        onCancel={() => setDeleteSessionModal(null)}
      />
      {/* Set Default Google Meet Room Modal */}
      {isDefaultMeetModalOpen && (
        <div className="modal-backdrop" style={{ zIndex: 1200 }}>
          <div className="modal-content" style={{ maxWidth: '500px', width: '92%' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <GoogleMeetIcon size={20} />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
                  Permanent Institutional Google Meet
                </h3>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setIsDefaultMeetModalOpen(false)}
                style={{ padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px 0' }}>
              <p className="text-secondary text-xs" style={{ margin: 0, lineHeight: 1.5 }}>
                Configure a permanent, reusable Google Meet link for your institution. All upcoming and new live classes will automatically use this room, ensuring students and trainers join without code errors.
              </p>

              {defaultMeetError && (
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: 'var(--danger)',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span>{defaultMeetError}</span>
                </div>
              )}

              <div style={{
                padding: '12px 14px',
                borderRadius: '8px',
                background: 'rgba(0, 172, 71, 0.08)',
                border: '1px solid rgba(0, 172, 71, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
              }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Don't have a room yet? Create one now on Google Meet:
                </span>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => window.open('https://meet.google.com/new', '_blank', 'noopener,noreferrer')}
                  style={{ gap: '6px', fontWeight: 700, fontSize: '0.78rem', whiteSpace: 'nowrap' }}
                >
                  <ExternalLink size={13} /> Launch meet.new
                </button>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px' }}>
                  Google Meet Room URL:
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="url"
                    className="form-input"
                    placeholder="https://meet.google.com/abc-defg-hij"
                    value={defaultMeetInput}
                    onChange={(e) => {
                      setDefaultMeetInput(e.target.value);
                      setDefaultMeetError(null);
                    }}
                    style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.85rem' }}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={async () => {
                      try {
                        const clipText = await navigator.clipboard.readText();
                        if (clipText) {
                          setDefaultMeetInput(clipText.trim());
                          setDefaultMeetError(null);
                        }
                      } catch {}
                    }}
                    title="Paste from clipboard"
                    style={{ padding: '8px 12px', fontSize: '0.78rem', gap: '4px' }}
                  >
                    <Copy size={13} /> Paste
                  </button>
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '12px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsDefaultMeetModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!defaultMeetInput.trim()}
                onClick={async () => {
                  setDefaultMeetError(null);
                  const res = await setDefaultMeetUrl(defaultMeetInput.trim());
                  if (res.success) {
                    showNotice('Institutional Google Meet room successfully saved and active!');
                    setIsDefaultMeetModalOpen(false);
                  } else {
                    setDefaultMeetError(res.message || 'Failed to save default room.');
                  }
                }}
                style={{ fontWeight: 700 }}
              >
                Save Permanent Room
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: CONCLUDE LIVE CLASS & ARCHIVE TO RECORDED CLASSES */}
      {concludeModalSession && (
        <div
          className="modal-overlay"
          onClick={() => setConcludeModalSession(null)}
          style={{ zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)' }}
        >
          <div
            className="card"
            onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', maxWidth: '460px', padding: '24px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--danger)' }}>
                  <Radio size={18} />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  Conclude Live Class
                </h3>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setConcludeModalSession(null)}
                style={{ borderRadius: '50%', width: '32px', height: '32px', padding: 0 }}
              >
                <X size={16} />
              </button>
            </div>

            <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Are you sure you want to conclude the live broadcast for <strong>"{concludeModalSession.title}"</strong>?
            </p>

            <div style={{
              padding: '12px 14px',
              borderRadius: '8px',
              background: 'rgba(56, 189, 248, 0.08)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
            }}>
              <CheckCircle2 size={16} color="#38bdf8" style={{ marginTop: '2px', flexShrink: 0 }} />
              <div style={{ fontSize: '0.8rem', color: 'var(--text-main)', lineHeight: 1.4 }}>
                The session will automatically transfer to <strong>Recorded Classes</strong> so any students who missed or were absent can replay the lecture recording, chapters, slides, and attendance roll call.
              </div>
            </div>

            {/* Active Recording Notice */}
            {recorderState.isRecording && recorderState.activeSessionId === concludeModalSession.id && (
              <div style={{
                padding: '10px 14px',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}>
                <Radio size={16} color="#ef4444" />
                <div style={{ fontSize: '0.8rem', color: '#fca5a5', lineHeight: 1.4 }}>
                  <strong>Active HD Recording Detected:</strong> The recorded Google Meet stream will be automatically compiled, finalized, and uploaded as the official class recording.
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setConcludeModalSession(null)}
              >
                Keep Live
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ background: 'var(--danger)', borderColor: 'var(--danger)', color: '#ffffff', fontWeight: 700 }}
                onClick={async () => {
                  const s = concludeModalSession;
                  setConcludeModalSession(null);
                  let finalRecUrl: string | undefined = undefined;

                  // If this session has an active recording running, finalize it and upload now
                  if (recorderState.isRecording && recorderState.activeSessionId === s.id) {
                    showNotice(`Finalizing and uploading recorded Google Meet stream...`);
                    const recRes = await stopRecording();
                    if (recRes.success && recRes.recordingUrl) {
                      finalRecUrl = recRes.recordingUrl;
                    }
                  }

                  await endSession(s.id, finalRecUrl);
                  await fetchSessions();
                  showNotice(`Live class "${s.title}" concluded and archived in Recorded Classes.`);
                }}
              >
                Conclude & Archive Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING IN-APP MEETING RECORDER WIDGET */}
      <MeetingRecorderWidget
        state={recorderState}
        onPause={pauseRecording}
        onResume={resumeRecording}
        onStop={handleStopAndSaveRecorder}
        onCancel={cancelRecording}
      />
    </div>
  );
};
