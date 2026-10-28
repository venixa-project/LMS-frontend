import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuthStore } from '../../lib/store';
import { useLiveSessionStore } from '../../lib/liveSessionStore';
import { useCohortStore } from '../../lib/cohortStore';
import { mockCourses } from '../../data/mockData';
import { mockUsers } from '../../data/mockUsers';
import { LiveSession } from '../../types';
import {
  Download, Users, Clock, AlertTriangle, ShieldCheck,
  Search, Filter, Calendar as CalendarIcon, Video, CheckCircle2,
  X, Play, ArrowUpRight, Check, AlertCircle, Sparkles
} from 'lucide-react';

interface ParticipantParticipationRow {
  studentId: string;
  name: string;
  email: string;
  rollNo: string;
  department: string;
  avatar?: string;
  sessionTitle: string;
  sessionDate: string;
  courseTitle: string;
  cohortName: string;
  joinTime: string;
  leaveTime: string;
  durationMinutes: number;
  totalSessionDuration: number;
  participationStatus: 'present' | 'late' | 'left_early' | 'absent';
  rawJoinIso?: string;
  rawLeaveIso?: string;
}

export const AttendanceLedgerPage: React.FC = () => {
  const { user } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const { sessions } = useLiveSessionStore();
  const { cohorts } = useCohortStore();

  const isTrainer = user?.activeRole === 'trainer' || user?.activeRole === 'instructor';
  const isStudent = user?.activeRole === 'student' || user?.activeRole === 'learner';
  const isAdmin = user?.activeRole === 'org_admin' || user?.activeRole === 'platform_admin' || user?.activeRole === 'lms_admin';

  // 1. Scope sessions strictly by role permissions
  // Trainers see attendance ONLY for their assigned courses and sessions.
  // Institution Admins see authorized institution-wide live-session attendance.
  const authorizedSessions = useMemo(() => {
    if (isTrainer) {
      const trainerCourseIds = user?.eligibleCourseIds && user.eligibleCourseIds.length > 0
        ? user.eligibleCourseIds
        : ['crs-001', 'crs-002', 'crs-004']; // default assigned courses for faculty persona

      return sessions.filter((s) => {
        const matchesInstructor = s.instructorId === user?.id || s.instructorName === user?.displayName;
        const matchesAssignedCourse = s.courseId ? trainerCourseIds.includes(s.courseId) : false;
        return matchesInstructor || matchesAssignedCourse;
      });
    }

    if (isStudent) {
      const studentId = user?.id || 'u-007';
      return sessions.filter((s) =>
        s.targetStudentIds?.includes(studentId) ||
        s.attendance?.some((a) => a.userId === studentId)
      );
    }

    // Admins have institution-wide scope
    return sessions;
  }, [sessions, isTrainer, isStudent, user]);

  // Session selection state
  const querySessionId = searchParams.get('sessionId');
  const [selectedSessionId, setSelectedSessionId] = useState<string>(() => {
    if (querySessionId && authorizedSessions.some((s) => s.id === querySessionId)) {
      return querySessionId;
    }
    // Default to the most relevant session (first ended or live session with attendance records)
    const sessionWithAttendance = authorizedSessions.find(
      (s) => s.attendance && s.attendance.length > 0
    );
    return sessionWithAttendance?.id || authorizedSessions[0]?.id || 'ls-003';
  });

  // Filters state
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('all');
  const [selectedCohortFilter, setSelectedCohortFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'present' | 'late' | 'left_early' | 'absent'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Sync with URL query parameter
  useEffect(() => {
    if (querySessionId && authorizedSessions.some((s) => s.id === querySessionId)) {
      setSelectedSessionId(querySessionId);
    }
  }, [querySessionId, authorizedSessions]);

  // The active session object
  const activeSession: LiveSession | undefined = useMemo(() => {
    return authorizedSessions.find((s) => s.id === selectedSessionId) || authorizedSessions[0];
  }, [authorizedSessions, selectedSessionId]);

  // Registered students roster for the active live session
  const activeRosterData = useMemo<ParticipantParticipationRow[]>(() => {
    if (!activeSession) return [];

    const targetStudentIds = activeSession.targetStudentIds || ['st-1', 'st-2', 'st-3', 'st-4', 'st-5', 'u-007', 'u-009', 'u-010'];
    const sessionAttendance = activeSession.attendance || [];
    const courseObj = mockCourses.find((c) => c.id === activeSession.courseId);
    const cohortObj = cohorts.find((c) => c.id === activeSession.cohortId);

    const sessionDuration = activeSession.durationMinutes || activeSession.duration || 60;
    const sessionStartTime = activeSession.startTime || '09:00';
    const sessionEndTime = activeSession.endTime || '10:00';
    const sessionDate = activeSession.date || '2026-10-15';

    // Build unique participant list from target IDs and actual joined records
    const allParticipantIds = Array.from(new Set([
      ...targetStudentIds,
      ...sessionAttendance.map((a) => a.userId),
    ]));

    return allParticipantIds.map((studentId) => {
      // Find matching mock user or synthesize consistent scholar details
      const userObj = mockUsers.find((u) => u.id === studentId || u.rollNo === studentId);
      const studentName = userObj?.displayName || (
        studentId === 'st-1' ? 'Alex Rivera' :
        studentId === 'st-2' ? 'Daniel Wu' :
        studentId === 'st-3' ? 'Elena Rostova' :
        studentId === 'st-4' ? 'Kwame Mensah' :
        studentId === 'st-5' ? 'Sophia Patel' :
        studentId === 'st-6' ? 'Marcus Bell' :
        studentId === 'st-7' ? 'Aria Montgomery' :
        studentId === 'u-007' ? 'Alex Thompson' :
        studentId === 'u-009' ? 'Maria Garcia' :
        studentId === 'u-010' ? 'David Kim' : 'Enrolled Scholar'
      );
      const rollNo = userObj?.rollNo || `STU-2026-${studentId.replace(/\D/g, '').padStart(3, '0') || '001'}`;
      const email = userObj?.email || `${studentName.toLowerCase().replace(/\s+/g, '.')}@acmelearning.com`;
      const department = userObj?.departmentId || 'Computer Science & Engineering';

      // Check attendance record from actual session participation
      const record = sessionAttendance.find((a) => a.userId === studentId);

      let joinTime = '—';
      let leaveTime = '—';
      let durationMinutes = 0;
      let participationStatus: 'present' | 'late' | 'left_early' | 'absent' = 'absent';

      if (record && record.status !== 'absent') {
        if (record.joinedAt) {
          try {
            const jDate = new Date(record.joinedAt);
            joinTime = jDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          } catch {
            joinTime = sessionStartTime;
          }
        } else {
          joinTime = sessionStartTime;
        }

        if (record.leftAt) {
          try {
            const lDate = new Date(record.leftAt);
            leaveTime = lDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          } catch {
            leaveTime = sessionEndTime;
          }
        } else {
          leaveTime = activeSession.status === 'live' ? 'Active in Session' : sessionEndTime;
        }

        // Calculate attendance duration based on timestamps or session duration
        if (record.joinedAt && record.leftAt) {
          try {
            const diffMs = new Date(record.leftAt).getTime() - new Date(record.joinedAt).getTime();
            durationMinutes = Math.max(1, Math.min(sessionDuration, Math.round(diffMs / (1000 * 60))));
          } catch {
            durationMinutes = sessionDuration;
          }
        } else if (record.status === 'late') {
          durationMinutes = Math.max(15, sessionDuration - 18);
        } else {
          durationMinutes = sessionDuration;
        }

        // Determine derived participation status
        if (record.status === 'late') {
          participationStatus = 'late';
        } else if (durationMinutes < sessionDuration * 0.75 && activeSession.status === 'ended') {
          participationStatus = 'left_early';
        } else {
          participationStatus = 'present';
        }
      } else {
        participationStatus = 'absent';
        joinTime = 'Did Not Join';
        leaveTime = 'Did Not Join';
        durationMinutes = 0;
      }

      return {
        studentId,
        name: studentName,
        email,
        rollNo,
        department,
        avatar: userObj?.avatar,
        sessionTitle: activeSession.title,
        sessionDate,
        courseTitle: activeSession.courseTitle || courseObj?.title || 'Advanced Software Architecture',
        cohortName: activeSession.cohortName || cohortObj?.name || 'Full Stack Web Dev - Cohort Alpha',
        joinTime,
        leaveTime,
        durationMinutes,
        totalSessionDuration: sessionDuration,
        participationStatus,
        rawJoinIso: record?.joinedAt,
        rawLeaveIso: record?.leftAt,
      };
    });
  }, [activeSession, cohorts]);

  // Filtered roster according to UI search and status filters
  const filteredRoster = useMemo(() => {
    return activeRosterData.filter((row) => {
      // Status filter
      if (statusFilter !== 'all' && row.participationStatus !== statusFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = row.name.toLowerCase().includes(q);
        const matchesRoll = row.rollNo.toLowerCase().includes(q);
        const matchesEmail = row.email.toLowerCase().includes(q);
        if (!matchesName && !matchesRoll && !matchesEmail) return false;
      }

      return true;
    });
  }, [activeRosterData, statusFilter, searchQuery]);

  // Summary Metrics for the Active Live Session
  const sessionStats = useMemo(() => {
    const totalRegistered = activeRosterData.length;
    const joinedParticipants = activeRosterData.filter((r) => r.participationStatus !== 'absent');
    const presentCount = activeRosterData.filter((r) => r.participationStatus === 'present').length;
    const lateCount = activeRosterData.filter((r) => r.participationStatus === 'late').length;
    const leftEarlyCount = activeRosterData.filter((r) => r.participationStatus === 'left_early').length;
    const absentCount = activeRosterData.filter((r) => r.participationStatus === 'absent').length;

    const participationRate = totalRegistered > 0
      ? Math.round((joinedParticipants.length / totalRegistered) * 100)
      : 0;

    const avgMinutes = joinedParticipants.length > 0
      ? Math.round(joinedParticipants.reduce((acc, curr) => acc + curr.durationMinutes, 0) / joinedParticipants.length)
      : 0;

    return {
      totalRegistered,
      joinedCount: joinedParticipants.length,
      presentCount,
      lateCount,
      leftEarlyCount,
      absentCount,
      participationRate,
      avgMinutes,
    };
  }, [activeRosterData]);

  // Overall Statistics across all authorized sessions for the top strip
  const overallStats = useMemo(() => {
    const totalSessions = authorizedSessions.length;
    let totalJoinedCount = 0;
    let totalCapacityCount = 0;

    authorizedSessions.forEach((s) => {
      const reg = s.targetStudentIds?.length || s.enrolledCount || 20;
      const joined = s.attendance?.filter((a) => a.status === 'present' || a.status === 'late').length || 0;
      totalCapacityCount += reg;
      totalJoinedCount += joined;
    });

    const avgAttendance = totalCapacityCount > 0
      ? Math.round((totalJoinedCount / totalCapacityCount) * 100)
      : 88;

    return {
      totalSessions,
      totalCapacityCount,
      totalJoinedCount,
      avgAttendance,
    };
  }, [authorizedSessions]);

  // Export Live Session Attendance Records to CSV
  const handleExportCSV = () => {
    if (!activeSession) return;

    const headers = [
      'Session Title',
      'Session Date',
      'Course',
      'Cohort/Batch',
      'Student Roll No',
      'Student Name',
      'Student Email',
      'Join Time',
      'Leave Time',
      'Duration Attended (Minutes)',
      'Total Session Duration',
      'Live Participation Status',
    ];

    const rows = filteredRoster.map((r) => [
      `"${r.sessionTitle.replace(/"/g, '""')}"`,
      r.sessionDate,
      `"${r.courseTitle.replace(/"/g, '""')}"`,
      `"${r.cohortName.replace(/"/g, '""')}"`,
      r.rollNo,
      `"${r.name.replace(/"/g, '""')}"`,
      r.email,
      r.joinTime,
      r.leaveTime,
      r.durationMinutes,
      r.totalSessionDuration,
      r.participationStatus === 'present' ? 'Attended (Present)' :
      r.participationStatus === 'late' ? 'Joined Late' :
      r.participationStatus === 'left_early' ? 'Left Early' : 'Did Not Join (Absent)',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `LiveSession_Attendance_${activeSession.id}_${activeSession.date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setExportNotice(`Exported ${filteredRoster.length} live attendance records for "${activeSession.title}" to CSV.`);
    setTimeout(() => setExportNotice(null), 4500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '40px' }}>
      {/* Toast Notification Banner */}
      {exportNotice && (
        <div
          style={{
            background: 'var(--success-bg, rgba(16, 185, 129, 0.15))',
            border: '1px solid var(--success-border, rgba(16, 185, 129, 0.4))',
            color: 'var(--success)',
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
            <CheckCircle2 size={18} />
            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{exportNotice}</span>
          </div>
          <button
            onClick={() => setExportNotice(null)}
            style={{ color: 'var(--text-muted)', cursor: 'pointer', background: 'transparent', border: 'none' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span className="badge badge-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Video size={13} /> Live Classroom Attendance
            </span>
            <span className="badge badge-secondary" style={{ fontSize: '0.72rem' }}>
              {isTrainer ? 'Trainer Scope: Assigned Sessions' : isAdmin ? 'Institution-Wide Audit' : 'Student Participation'}
            </span>
            {isTrainer && (
              <span className="text-muted text-xs">
                {user?.displayName || 'Dr. James Wilson'} &bull; Assigned Courses
              </span>
            )}
          </div>
          <h1 style={{ fontSize: '1.85rem', margin: '0 0 4px 0', fontWeight: 800 }}>
            Live Session Attendance
          </h1>
          <p className="text-secondary text-sm" style={{ margin: 0, maxWidth: '820px' }}>
            Track attendance derived exclusively from live classroom session participation, join and leave timestamps, and active engagement duration.
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={handleExportCSV}
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
            title="Download CSV export of live session attendance"
          >
            <Download size={14} /> Export Live Attendance CSV
          </button>

          <Link
            to="/live-sessions"
            className="btn btn-primary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
          >
            <Video size={14} /> Live Sessions Hub &rarr;
          </Link>
        </div>
      </div>

      {/* Top 4 Overall Statistics Cards */}
      <div className="grid-4" style={{ gap: '16px' }}>
        <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid var(--primary)', margin: 0 }}>
          <div className="text-muted text-xs font-semibold" style={{ marginBottom: '4px', textTransform: 'uppercase' }}>
            Tracked Live Sessions
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)' }}>
            {overallStats.totalSessions}
          </div>
          <div className="text-muted text-xs" style={{ marginTop: '4px' }}>
            {isTrainer ? 'In your assigned courses' : 'Institution-wide catalog'}
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #6366f1', margin: 0 }}>
          <div className="text-muted text-xs font-semibold" style={{ marginBottom: '4px', textTransform: 'uppercase' }}>
            Registered Cohort Scholars
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)' }}>
            {sessionStats.totalRegistered}
          </div>
          <div className="text-muted text-xs" style={{ marginTop: '4px' }}>
            Target audience for active session
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid var(--success)', margin: 0 }}>
          <div className="text-muted text-xs font-semibold" style={{ marginBottom: '4px', textTransform: 'uppercase' }}>
            Joined Live Session
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--success)' }}>
            {sessionStats.joinedCount} / {sessionStats.totalRegistered}
          </div>
          <div className="text-muted text-xs" style={{ marginTop: '4px' }}>
            {sessionStats.presentCount} on-time &bull; {sessionStats.lateCount} late
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #ec4899', margin: 0 }}>
          <div className="text-muted text-xs font-semibold" style={{ marginBottom: '4px', textTransform: 'uppercase' }}>
            Live Participation Rate
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ec4899' }}>
            {sessionStats.participationRate}%
          </div>
          <div className="text-muted text-xs" style={{ marginTop: '4px' }}>
            Avg {sessionStats.avgMinutes} mins attended
          </div>
        </div>
      </div>

      {/* Selected Live Session Snapshot Banner */}
      {activeSession && (
        <div
          className="card"
          style={{
            padding: '20px 24px',
            background: 'linear-gradient(135deg, var(--bg-surface) 0%, rgba(99, 102, 241, 0.06) 100%)',
            border: '1px solid var(--border-light)',
            margin: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                <span className={`badge ${
                  activeSession.status === 'live' ? 'badge-danger' :
                  activeSession.status === 'ended' ? 'badge-success' : 'badge-primary'
                }`} style={{ fontWeight: 800, fontSize: '0.72rem' }}>
                  {activeSession.status === 'live' ? '● BROADCASTING LIVE' :
                   activeSession.status === 'ended' ? '✓ SESSION CONCLUDED' : 'SCHEDULED'}
                </span>
                <span className="badge badge-secondary">{activeSession.provider || 'VeniLearn Live'}</span>
                <span className="text-muted text-xs font-semibold">Session ID: {activeSession.id}</span>
              </div>

              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0 0 6px 0' }}>
                {activeSession.title}
              </h2>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: 'var(--text-secondary)', fontSize: '0.85rem', flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <CalendarIcon size={14} color="var(--primary)" />
                  <strong>Date:</strong> {activeSession.date} ({activeSession.startTime} – {activeSession.endTime})
                </span>
                <span>&bull;</span>
                <span>
                  <strong>Course:</strong> {activeSession.courseTitle || 'Enrolled Course'}
                </span>
                <span>&bull;</span>
                <span>
                  <strong>Cohort:</strong> {activeSession.cohortName || 'Cohort Alpha'}
                </span>
                <span>&bull;</span>
                <span>
                  <strong>Instructor:</strong> {activeSession.instructorName || 'Dr. James Wilson'}
                </span>
              </div>
            </div>

            {/* Attendance Progress Meter */}
            <div style={{ minWidth: '220px', background: 'var(--bg-input)', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span className="text-muted text-xs font-semibold">ATTENDANCE COMPLIANCE</span>
                <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '0.9rem' }}>
                  {sessionStats.participationRate}%
                </span>
              </div>
              <div className="progress-bar-bg" style={{ height: '7px' }}>
                <div
                  className="progress-bar-fill"
                  style={{
                    width: `${sessionStats.participationRate}%`,
                    background: sessionStats.participationRate >= 75 ? 'var(--success)' : 'var(--warning)',
                  }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <span>{sessionStats.joinedCount} Joined</span>
                <span>{sessionStats.absentCount} Absent</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Control Filter Bar */}
      <div
        className="card"
        style={{
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
          margin: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', flex: 1 }}>
          {/* Select Live Session Dropdown */}
          <div style={{ minWidth: '280px', flex: '1 1 280px' }}>
            <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 700 }}>
              SELECT LIVE SESSION
            </label>
            <select
              className="input"
              value={selectedSessionId}
              onChange={(e) => {
                setSelectedSessionId(e.target.value);
                setSearchParams({ sessionId: e.target.value });
              }}
              style={{ width: '100%', height: '38px', fontSize: '0.85rem' }}
            >
              {authorizedSessions.map((s) => (
                <option key={s.id} value={s.id}>
                  [{s.date}] {s.title} ({s.status.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          {/* Search Input */}
          <div style={{ width: '240px' }}>
            <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 700 }}>
              SEARCH SCHOLAR
            </label>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="input"
                placeholder="Name, roll number, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '32px', height: '38px', fontSize: '0.82rem', width: '100%' }}
              />
            </div>
          </div>

          {/* Status Filter Tabs */}
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 700 }}>
              PARTICIPATION STATUS
            </label>
            <div
              style={{
                display: 'inline-flex',
                background: 'var(--bg-input)',
                padding: '3px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              {[
                { id: 'all', label: 'All Scholars' },
                { id: 'present', label: 'Attended' },
                { id: 'late', label: 'Late' },
                { id: 'left_early', label: 'Left Early' },
                { id: 'absent', label: 'Did Not Join' },
              ].map((st) => (
                <button
                  key={st.id}
                  onClick={() => setStatusFilter(st.id as any)}
                  className={`btn btn-sm ${statusFilter === st.id ? 'btn-primary' : 'btn-ghost'}`}
                  style={{
                    fontSize: '0.75rem',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    fontWeight: statusFilter === st.id ? 700 : 500,
                  }}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Live Session Participation Roster Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', margin: 0 }}>
        <div
          style={{
            padding: '14px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'var(--bg-card)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700 }}>
              {activeSession?.title || 'Live Classroom Session'} — Scholar Attendance Roster
            </h3>
            <span className="text-secondary text-xs">
              Showing {filteredRoster.length} of {activeRosterData.length} registered students for this session
            </span>
          </div>
          <span className="badge badge-primary" style={{ fontSize: '0.72rem' }}>
            Live Stream Participation Data
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '12px 18px', fontWeight: 700 }}>Scholar</th>
                <th style={{ padding: '12px 18px', fontWeight: 700 }}>Roll Number</th>
                <th style={{ padding: '12px 18px', fontWeight: 700 }}>Course & Cohort</th>
                <th style={{ padding: '12px 18px', fontWeight: 700 }}>Join Time</th>
                <th style={{ padding: '12px 18px', fontWeight: 700 }}>Leave Time</th>
                <th style={{ padding: '12px 18px', fontWeight: 700 }}>Time Attended</th>
                <th style={{ padding: '12px 18px', fontWeight: 700, textAlign: 'right' }}>Participation Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredRoster.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No participant records match the active search or status filter.
                  </td>
                </tr>
              ) : (
                filteredRoster.map((row) => (
                  <tr
                    key={row.studentId}
                    style={{ borderBottom: '1px solid var(--border-subtle)' }}
                    className="table-row-hover"
                  >
                    <td style={{ padding: '12px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, var(--primary), #818cf8)',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.78rem',
                            flexShrink: 0,
                          }}
                        >
                          {row.name.charAt(0)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{row.name}</div>
                          <div className="text-secondary text-xs">{row.email}</div>
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '12px 18px', fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      {row.rollNo}
                    </td>

                    <td style={{ padding: '12px 18px' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>{row.courseTitle}</div>
                      <div className="text-muted text-xs">{row.cohortName}</div>
                    </td>

                    <td style={{ padding: '12px 18px', color: row.joinTime === 'Did Not Join' ? 'var(--text-muted)' : 'var(--text-main)', fontWeight: 500 }}>
                      {row.joinTime}
                    </td>

                    <td style={{ padding: '12px 18px', color: row.leaveTime === 'Did Not Join' ? 'var(--text-muted)' : 'var(--text-main)', fontWeight: 500 }}>
                      {row.leaveTime}
                    </td>

                    <td style={{ padding: '12px 18px' }}>
                      {row.durationMinutes > 0 ? (
                        <div>
                          <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                            {row.durationMinutes} mins
                          </span>
                          <span className="text-muted text-xs"> / {row.totalSessionDuration}m</span>
                          <div className="progress-bar-bg" style={{ height: '4px', width: '90px', marginTop: '4px' }}>
                            <div
                              className="progress-bar-fill"
                              style={{
                                width: `${Math.round((row.durationMinutes / row.totalSessionDuration) * 100)}%`,
                                background: row.durationMinutes >= row.totalSessionDuration * 0.8
                                  ? 'var(--success)'
                                  : 'var(--warning)',
                              }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted text-xs">0 mins</span>
                      )}
                    </td>

                    <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                      {row.participationStatus === 'present' ? (
                        <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle2 size={12} /> Attended (Present)
                        </span>
                      ) : row.participationStatus === 'late' ? (
                        <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={12} /> Joined Late
                        </span>
                      ) : row.participationStatus === 'left_early' ? (
                        <span className="badge badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          Left Early
                        </span>
                      ) : (
                        <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          Did Not Join (Absent)
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
