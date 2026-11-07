import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuthStore } from '../../lib/store';
import { useLiveSessionStore } from '../../lib/liveSessionStore';
import { useCohortStore } from '../../lib/cohortStore';
import { useCourseStore } from '../../lib/courseStore';
import { LiveSession } from '../../types';
import { apiClient } from '../../lib/apiClient';
import {
  Download, Users, Clock, Search, Calendar as CalendarIcon,
  Video, CheckCircle2, X, RefreshCw
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
  const { sessions, fetchSessions } = useLiveSessionStore();
  const { cohorts } = useCohortStore();

  const isTrainer = user?.activeRole === 'trainer' || user?.activeRole === 'instructor';
  const isStudent = user?.activeRole === 'student' || user?.activeRole === 'learner';

  // 1. Fetch live sessions on mount and keep polling every 15s
  useEffect(() => {
    fetchSessions();
    const interval = setInterval(() => {
      fetchSessions();
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchSessions]);

  // 2. Scope sessions strictly by role permissions
  const authorizedSessions = useMemo(() => {
    if (isTrainer) {
      const trainerCourseIds = user?.eligibleCourseIds && user.eligibleCourseIds.length > 0
        ? user.eligibleCourseIds
        : ['crs-001', 'crs-002', 'crs-004'];

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
    const sessionWithAttendance = authorizedSessions.find(
      (s) => s.attendance && s.attendance.length > 0
    );
    return sessionWithAttendance?.id || authorizedSessions[0]?.id || '';
  });

  // Keep selectedSessionId synced when sessions list loads
  useEffect(() => {
    if (querySessionId && authorizedSessions.some((s) => s.id === querySessionId)) {
      setSelectedSessionId(querySessionId);
    } else if (!selectedSessionId && authorizedSessions.length > 0) {
      setSelectedSessionId(authorizedSessions[0].id);
    }
  }, [querySessionId, authorizedSessions, selectedSessionId]);

  // Filters state
  const [statusFilter, setStatusFilter] = useState<'all' | 'present' | 'late' | 'left_early' | 'absent'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [dbRoster, setDbRoster] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // The active session object
  const activeSession: LiveSession | undefined = useMemo(() => {
    return authorizedSessions.find((s) => s.id === selectedSessionId) || authorizedSessions[0];
  }, [authorizedSessions, selectedSessionId]);

  // Fetch actual attendance roster from database API and poll every 8 seconds
  const loadAttendanceRoster = useCallback(() => {
    if (!activeSession?.id) return;
    setIsRefreshing(true);
    apiClient
      .get(`/live-sessions/${activeSession.id}/attendance`)
      .then((res) => {
        if (res && res.data) {
          const data = Array.isArray(res.data) ? res.data : (res.data as any).roster || [];
          setDbRoster(data);
        }
      })
      .catch(() => {})
      .finally(() => setIsRefreshing(false));
  }, [activeSession?.id]);

  useEffect(() => {
    loadAttendanceRoster();
    const interval = setInterval(loadAttendanceRoster, 8000);
    return () => clearInterval(interval);
  }, [loadAttendanceRoster]);

  // Registered students roster for the active live session
  const activeRosterData = useMemo<ParticipantParticipationRow[]>(() => {
    if (!activeSession) return [];

    const sessionDuration = activeSession.durationMinutes || 60;
    const sessionStartTime = activeSession.startTime || '10:00';
    const sessionEndTime = activeSession.endTime || '11:00';
    const sessionDate = activeSession.date
      ? (typeof activeSession.date === 'string' ? activeSession.date.slice(0, 10) : new Date(activeSession.date).toISOString().slice(0, 10))
      : new Date().toISOString().slice(0, 10);
    const courseTitle = activeSession.courseTitle || 'Live Academic Course';
    const cohortName = activeSession.cohortName || 'Target Cohort';

    // If backend dbRoster returned records, prioritize them directly
    if (dbRoster && dbRoster.length > 0) {
      return dbRoster.map((item) => {
        let joinTime = 'Did Not Join';
        let leaveTime = 'Did Not Join';
        let durationMinutes = 0;
        let participationStatus: 'present' | 'late' | 'left_early' | 'absent' = (item.status as any) || 'absent';

        if (item.status && item.status !== 'absent') {
          if (item.joinedAt) {
            try {
              const jDate = new Date(item.joinedAt);
              joinTime = jDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            } catch {
              joinTime = sessionStartTime;
            }
          } else {
            joinTime = sessionStartTime;
          }

          if (item.leftAt) {
            try {
              const lDate = new Date(item.leftAt);
              leaveTime = lDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            } catch {
              leaveTime = sessionEndTime;
            }
          } else {
            leaveTime = activeSession.status === 'live'
              ? 'Active in Session'
              : (activeSession.status === 'ended' ? 'Session Concluded' : sessionEndTime);
          }

          if (item.joinedAt && item.leftAt) {
            try {
              const diffMs = new Date(item.leftAt).getTime() - new Date(item.joinedAt).getTime();
              durationMinutes = Math.max(1, Math.min(sessionDuration, Math.round(diffMs / (1000 * 60))));
            } catch {
              durationMinutes = sessionDuration;
            }
          } else if (item.joinedAt && activeSession.status === 'live') {
            const diffMs = Date.now() - new Date(item.joinedAt).getTime();
            durationMinutes = Math.max(1, Math.min(sessionDuration, Math.round(diffMs / (1000 * 60))));
          } else {
            durationMinutes = sessionDuration;
          }
        }

        return {
          studentId: item.userId,
          name: item.name || 'Scholar',
          email: item.email || '',
          rollNo: item.rollNo || 'STU-001',
          department: item.department || 'Computer Science & Engineering',
          avatar: item.avatarUrl,
          sessionTitle: activeSession.title,
          sessionDate,
          courseTitle,
          cohortName,
          joinTime,
          leaveTime,
          durationMinutes,
          totalSessionDuration: sessionDuration,
          participationStatus,
          rawJoinIso: item.joinedAt,
          rawLeaveIso: item.leftAt,
        };
      });
    }

    // Fallback if dbRoster is loading or empty
    const sessionAttendance = activeSession.attendance || [];
    if (sessionAttendance.length > 0) {
      return sessionAttendance.map((att) => {
        return {
          studentId: att.userId,
          name: (att as any).user?.displayName || 'Scholar',
          email: (att as any).user?.email || '',
          rollNo: (att as any).user?.rollNo || 'STU-001',
          department: 'Computer Science & Engineering',
          avatar: (att as any).user?.avatarUrl,
          sessionTitle: activeSession.title,
          sessionDate,
          courseTitle,
          cohortName,
          joinTime: att.joinedAt ? new Date(att.joinedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : sessionStartTime,
          leaveTime: activeSession.status === 'live' ? 'Active in Session' : (activeSession.status === 'ended' ? 'Session Concluded' : sessionEndTime),
          durationMinutes: sessionDuration,
          totalSessionDuration: sessionDuration,
          participationStatus: (att.status as any) || 'present',
          rawJoinIso: att.joinedAt,
          rawLeaveIso: att.leftAt,
        };
      });
    }

    return [];
  }, [activeSession, dbRoster]);

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
      const reg = (s.enrolledCount && s.enrolledCount > 0) ? s.enrolledCount : 2;
      const joined = s.attendance?.filter((a) => a.status === 'present' || a.status === 'late').length || ((s as any)._count?.attendance || 0);
      totalCapacityCount += reg;
      totalJoinedCount += joined;
    });

    const avgAttendance = totalCapacityCount > 0
      ? Math.round((totalJoinedCount / totalCapacityCount) * 100)
      : 0;

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
      `"${r.email.replace(/"/g, '""')}"`,
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

    setExportNotice(`Exported ${filteredRoster.length} attendance records for "${activeSession.title}" to CSV.`);
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
            <span className="badge badge-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <Video size={13} /> Live Attendance Ledger
            </span>
          </div>
          <h1 style={{ fontSize: '1.85rem', margin: '0 0 4px 0', fontWeight: 800 }}>
            Live Session Attendance
          </h1>
          <p className="text-secondary text-sm" style={{ margin: 0, maxWidth: '780px' }}>
            Real-time participation tracking and attendance compliance for scheduled live sessions.
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={loadAttendanceRoster}
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
            title="Refresh attendance records"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} /> Refresh
          </button>

          <button
            onClick={handleExportCSV}
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
            title="Download CSV export of live session attendance"
          >
            <Download size={14} /> Export CSV
          </button>

          <Link
            to="/live_sessions"
            className="btn btn-primary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
          >
            <Video size={14} /> Live Sessions &rarr;
          </Link>
        </div>
      </div>

      {/* Top 4 Overall Statistics Cards */}
      <div className="grid-4" style={{ gap: '16px' }}>
        <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid var(--primary)', margin: 0 }}>
          <div className="text-muted text-xs font-semibold" style={{ marginBottom: '4px', textTransform: 'uppercase' }}>
            Tracked Sessions
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)' }}>
            {overallStats.totalSessions}
          </div>
          <div className="text-muted text-xs" style={{ marginTop: '4px' }}>
            Scheduled & conducted
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #6366f1', margin: 0 }}>
          <div className="text-muted text-xs font-semibold" style={{ marginBottom: '4px', textTransform: 'uppercase' }}>
            Cohort Scholars
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)' }}>
            {sessionStats.totalRegistered}
          </div>
          <div className="text-muted text-xs" style={{ marginTop: '4px' }}>
            Target audience for session
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
            {sessionStats.presentCount} on-time{sessionStats.lateCount > 0 ? ` • ${sessionStats.lateCount} late` : ''}
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #ec4899', margin: 0 }}>
          <div className="text-muted text-xs font-semibold" style={{ marginBottom: '4px', textTransform: 'uppercase' }}>
            Participation Rate
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ec4899' }}>
            {sessionStats.participationRate}%
          </div>
          <div className="text-muted text-xs" style={{ marginTop: '4px' }}>
            {sessionStats.avgMinutes > 0 ? `Avg ${sessionStats.avgMinutes} mins in room` : 'Session attendance compliance'}
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
                  {activeSession.status === 'live' ? '● LIVE NOW' :
                   activeSession.status === 'ended' ? '✓ CONCLUDED' : 'UPCOMING'}
                </span>
                <span className="badge badge-secondary">{activeSession.provider || 'Google Meet'}</span>
                <span className="text-muted text-xs font-mono">ID: {activeSession.id.slice(0, 8)}...</span>
              </div>

              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0 0 6px 0' }}>
                {activeSession.title}
              </h2>

              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', color: 'var(--text-secondary)', fontSize: '0.85rem', flexWrap: 'wrap' }}>
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
                  <strong>Instructor:</strong> {activeSession.instructorName || 'Faculty'}
                </span>
              </div>
            </div>

            {/* Attendance Compliance Meter */}
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
                { id: 'all', label: `All Scholars (${activeRosterData.length})` },
                { id: 'present', label: `Attended (${sessionStats.presentCount})` },
                { id: 'late', label: `Late (${sessionStats.lateCount})` },
                { id: 'absent', label: `Did Not Join (${sessionStats.absentCount})` },
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
              {activeSession?.title || 'Live Classroom Session'} — Attendance Roster
            </h3>
            <span className="text-secondary text-xs">
              Showing {filteredRoster.length} of {activeRosterData.length} registered students
            </span>
          </div>
          <span className="badge badge-primary" style={{ fontSize: '0.72rem' }}>
            Live Attendance
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
