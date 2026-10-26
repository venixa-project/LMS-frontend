import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../lib/store';
import { useCohortStore } from '../../lib/cohortStore';
import {
  Download, CheckCircle2, X, Sparkles,
  Users, Check, Clock, AlertTriangle, ShieldCheck,
  Search, Filter, Calendar as CalendarIcon, UserCheck
} from 'lucide-react';

interface StudentRosterItem {
  id: string;
  name: string;
  email: string;
  rollNo: string;
  overallAttendance: string;
  avatar?: string;
  department?: string;
}

export const AttendanceLedgerPage: React.FC = () => {
  const { user } = useAuthStore();
  const [searchParams] = useSearchParams();
  const { cohorts } = useCohortStore();

  const isTrainer = user?.activeRole === 'trainer' || user?.activeRole === 'instructor';
  const isStudent = user?.activeRole === 'student' || user?.activeRole === 'learner';
  const isAdmin = user?.activeRole === 'org_admin' || user?.activeRole === 'platform_admin' || user?.activeRole === 'lms_admin';

  // Filters State
  const initialCohort = searchParams.get('cohortId') || 'coh-001';
  const [attendanceDate, setAttendanceDate] = useState('2026-10-17');
  const [attendanceCohort, setAttendanceCohort] = useState(initialCohort);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'present' | 'late' | 'absent' | 'excused'>('all');
  const [attendanceSaveNotice, setAttendanceSaveNotice] = useState<string | null>(null);

  // Synchronize when query param changes
  useEffect(() => {
    const qCohort = searchParams.get('cohortId');
    if (qCohort) {
      setAttendanceCohort(qCohort);
    }
  }, [searchParams]);

  // Preserved & enriched student roster
  const initialRoster: StudentRosterItem[] = useMemo(() => [
    { id: 'st-1', name: 'Alex Rivera', email: 'alex@lms.demo', rollNo: 'STU-2026-001', overallAttendance: '96.2%', department: 'Computer Science' },
    { id: 'st-2', name: 'Daniel Wu', email: 'daniel.wu@acmelearning.com', rollNo: 'STU-2026-002', overallAttendance: '94.0%', department: 'Software Engineering' },
    { id: 'st-3', name: 'Elena Rostova', email: 'elena.r@acmelearning.com', rollNo: 'STU-2026-003', overallAttendance: '88.5%', department: 'Computer Science' },
    { id: 'st-4', name: 'Kwame Mensah', email: 'kwame.m@acmelearning.com', rollNo: 'STU-2026-004', overallAttendance: '71.2%', department: 'Cloud Computing' },
    { id: 'st-5', name: 'Sophia Patel', email: 'sophia.p@acmelearning.com', rollNo: 'STU-2026-005', overallAttendance: '98.5%', department: 'Data Science' },
    { id: 'st-6', name: 'Marcus Bell', email: 'marcus.b@acmelearning.com', rollNo: 'STU-2026-006', overallAttendance: '93.0%', department: 'Software Engineering' },
    { id: 'st-7', name: 'Aria Montgomery', email: 'aria.m@acmelearning.com', rollNo: 'STU-2026-007', overallAttendance: '91.8%', department: 'Computer Science' },
    { id: 'st-8', name: 'Zack Taylor', email: 'zack.t@acmelearning.com', rollNo: 'STU-2026-008', overallAttendance: '85.4%', department: 'Cloud Computing' },
  ], []);

  // Per-student attendance status state for this session date
  const [rosterAttendance, setRosterAttendance] = useState<Record<string, 'present' | 'late' | 'absent' | 'excused'>>({
    'st-1': 'present',
    'st-2': 'present',
    'st-3': 'late',
    'st-4': 'absent',
    'st-5': 'present',
    'st-6': 'present',
    'st-7': 'present',
    'st-8': 'excused',
  });

  // Current cohort object
  const activeCohortObj = useMemo(() => {
    return cohorts.find((c) => c.id === attendanceCohort) || {
      id: attendanceCohort,
      name: attendanceCohort === 'coh-001' ? 'Full Stack Web Dev - Cohort Alpha' : 'Batch 2026 Section A',
      code: 'FSWD-2026-A',
    };
  }, [cohorts, attendanceCohort]);

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return initialRoster.filter((st) => {
      const currentStatus = rosterAttendance[st.id] || 'present';
      if (statusFilter !== 'all' && currentStatus !== statusFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = st.name.toLowerCase().includes(q);
        const matchEmail = st.email.toLowerCase().includes(q);
        const matchRoll = st.rollNo.toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchRoll) return false;
      }
      return true;
    });
  }, [initialRoster, rosterAttendance, statusFilter, searchQuery]);

  // Summary Metrics
  const stats = useMemo(() => {
    const total = initialRoster.length;
    let presentCount = 0;
    let lateCount = 0;
    let absentCount = 0;
    let excusedCount = 0;

    initialRoster.forEach((st) => {
      const s = rosterAttendance[st.id] || 'present';
      if (s === 'present') presentCount++;
      else if (s === 'late') lateCount++;
      else if (s === 'absent') absentCount++;
      else if (s === 'excused') excusedCount++;
    });

    const attendanceRate = total > 0 ? (((presentCount + lateCount) / total) * 100).toFixed(1) : '100.0';

    return { total, presentCount, lateCount, absentCount, excusedCount, attendanceRate };
  }, [initialRoster, rosterAttendance]);

  // Mark all present quick action
  const handleMarkAllPresent = () => {
    const updated: Record<string, 'present' | 'late' | 'absent' | 'excused'> = {};
    initialRoster.forEach((st) => {
      updated[st.id] = 'present';
    });
    setRosterAttendance(updated);
    setAttendanceSaveNotice('All enrolled scholars marked as Present for this date.');
    setTimeout(() => setAttendanceSaveNotice(null), 4000);
  };

  // Export report simulation
  const handleExportCSV = () => {
    const rows = [
      ['Roll Number', 'Student Name', 'Email', 'Batch', 'Date', 'Status', 'Historical Rate'],
      ...initialRoster.map((st) => [
        st.rollNo,
        st.name,
        st.email,
        activeCohortObj.name,
        attendanceDate,
        rosterAttendance[st.id] || 'present',
        st.overallAttendance,
      ]),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Attendance_${activeCohortObj.id}_${attendanceDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setAttendanceSaveNotice(`Exported attendance ledger for ${activeCohortObj.name} (${attendanceDate}) to CSV.`);
    setTimeout(() => setAttendanceSaveNotice(null), 5000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '40px' }}>
      {/* Toast Notification Banner */}
      {attendanceSaveNotice && (
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--success-border)',
            borderLeft: '4px solid var(--success)',
            padding: '12px 18px',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: 'var(--shadow-md)',
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem' }}>
            <CheckCircle2 size={16} color="var(--success)" />
            <span style={{ fontWeight: 600 }}>{attendanceSaveNotice}</span>
          </div>
          <button
            onClick={() => setAttendanceSaveNotice(null)}
            style={{ color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Header & Primary Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', margin: '0 0 4px 0', fontWeight: 800 }}>
            Attendance Ledger & Tracking
          </h1>
          <p className="text-secondary text-sm" style={{ margin: 0 }}>
            Daily attendance roster, biometric reconciliation, and compliance statements for batches.
          </p>
        </div>

        {/* Action Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            className="btn btn-secondary"
            onClick={handleExportCSV}
            style={{ gap: '8px', fontWeight: 600 }}
          >
            <Download size={16} /> Export Attendance Report
          </button>

          {!isStudent && (
            <button
              className="btn btn-primary"
              onClick={() => {
                setAttendanceSaveNotice(`Attendance verified and saved for ${activeCohortObj.name} on ${attendanceDate}.`);
                setTimeout(() => setAttendanceSaveNotice(null), 5000);
              }}
              style={{ gap: '8px', fontWeight: 700 }}
            >
              <Check size={16} /> Save Attendance Ledger
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Metric Cards */}
      <div className="grid-4" style={{ gap: '14px' }}>
        <div className="stat-card" style={{ padding: '16px 18px', borderLeft: '4px solid var(--primary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span className="text-muted text-xs font-semibold">Total Scholars</span>
            <Users size={16} color="var(--primary)" />
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-main)' }}>
            {stats.total}
          </div>
        </div>

        <div className="stat-card" style={{ padding: '16px 18px', borderLeft: '4px solid var(--success)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span className="text-muted text-xs font-semibold">Present Today</span>
            <span className="badge badge-active" style={{ fontSize: '0.65rem' }}>{stats.attendanceRate}%</span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--success)' }}>
            {stats.presentCount}
          </div>
        </div>

        <div className="stat-card" style={{ padding: '16px 18px', borderLeft: '4px solid var(--warning)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span className="text-muted text-xs font-semibold">Late Arrivals</span>
            <Clock size={16} color="var(--warning)" />
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--warning)' }}>
            {stats.lateCount}
          </div>
        </div>

        <div className="stat-card" style={{ padding: '16px 18px', borderLeft: '4px solid var(--danger)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span className="text-muted text-xs font-semibold">Absent Scholars</span>
            <AlertTriangle size={16} color="var(--danger)" />
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--danger)' }}>
            {stats.absentCount}
          </div>
        </div>
      </div>

      {/* Date & Batch Filter Toolbar */}
      <div
        className="card"
        style={{
          padding: '16px',
          background: 'var(--bg-surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Date Picker */}
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '3px', fontWeight: 600 }}>
              Session Date
            </label>
            <input
              type="date"
              className="input"
              value={attendanceDate}
              onChange={(e) => setAttendanceDate(e.target.value)}
              style={{ width: '160px', height: '36px', fontSize: '0.82rem' }}
            />
          </div>

          {/* Batch Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '3px', fontWeight: 600 }}>
              Class / Cohort Batch
            </label>
            <select
              className="input"
              value={attendanceCohort}
              onChange={(e) => setAttendanceCohort(e.target.value)}
              style={{ width: '240px', height: '36px', fontSize: '0.82rem' }}
            >
              {cohorts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
              <option value="Spring 2026 Engineering">Spring 2026 Engineering</option>
              <option value="Summer 2026 Cloud">Summer 2026 Cloud</option>
            </select>
          </div>

          {/* Search Input */}
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '3px', fontWeight: 600 }}>
              Search Scholar
            </label>
            <div style={{ position: 'relative', width: '200px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="input"
                placeholder="Name or roll no..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '32px', height: '36px', fontSize: '0.82rem', width: '100%' }}
              />
            </div>
          </div>
        </div>

        {/* Quick Batch Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', alignSelf: 'flex-end' }}>
          {!isStudent && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleMarkAllPresent}
              style={{ height: '36px', fontSize: '0.8rem', fontWeight: 600, gap: '6px' }}
            >
              <UserCheck size={14} /> Mark All Present
            </button>
          )}

          {/* Status Filter Tabs */}
          <div
            style={{
              display: 'inline-flex',
              background: 'var(--bg-card)',
              padding: '3px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            {(['all', 'present', 'late', 'absent', 'excused'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`btn btn-sm ${statusFilter === st ? 'btn-primary' : 'btn-ghost'}`}
                style={{
                  textTransform: 'capitalize',
                  fontSize: '0.75rem',
                  padding: '4px 10px',
                  borderRadius: '4px',
                }}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Attendance Roster Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', background: 'var(--bg-surface)' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700 }}>
              {activeCohortObj.name} — Student Attendance Record
            </h3>
            <span className="text-secondary text-xs">
              Showing {filteredStudents.length} of {initialRoster.length} enrolled scholars for {attendanceDate}
            </span>
          </div>
          <span className="badge badge-primary" style={{ fontSize: '0.72rem' }}>
            Biometric Synchronized
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '12px 18px', fontWeight: 700 }}>Student Scholar</th>
                <th style={{ padding: '12px 18px', fontWeight: 700 }}>Roll Number</th>
                <th style={{ padding: '12px 18px', fontWeight: 700 }}>Academic Department</th>
                <th style={{ padding: '12px 18px', fontWeight: 700 }}>Overall Compliance</th>
                <th style={{ padding: '12px 18px', fontWeight: 700 }}>Status ({attendanceDate})</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No student records match the active search or status filters.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((st) => {
                  const currentStatus = rosterAttendance[st.id] || 'present';
                  return (
                    <tr
                      key={st.id}
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
                              background: 'linear-gradient(135deg, #6366f1, #3b82f6)',
                              color: '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.78rem',
                              flexShrink: 0,
                            }}
                          >
                            {st.name.charAt(0)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{st.name}</div>
                            <div className="text-secondary text-xs">{st.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 18px', fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        {st.rollNo}
                      </td>
                      <td style={{ padding: '12px 18px', color: 'var(--text-muted)' }}>
                        {st.department || 'Computer Science'}
                      </td>
                      <td style={{ padding: '12px 18px' }}>
                        <span className="badge badge-active" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                          {st.overallAttendance}
                        </span>
                      </td>
                      <td style={{ padding: '12px 18px' }}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {(['present', 'late', 'absent', 'excused'] as const).map((stat) => {
                            const isSel = currentStatus === stat;
                            return (
                              <button
                                key={stat}
                                type="button"
                                disabled={isStudent}
                                onClick={() => setRosterAttendance((prev) => ({ ...prev, [st.id]: stat }))}
                                className="btn btn-sm"
                                style={{
                                  textTransform: 'capitalize',
                                  fontSize: '0.74rem',
                                  padding: '4px 10px',
                                  fontWeight: isSel ? 700 : 500,
                                  background: isSel
                                    ? stat === 'present'
                                      ? 'var(--success)'
                                      : stat === 'late'
                                      ? 'var(--warning)'
                                      : stat === 'absent'
                                      ? 'var(--danger)'
                                      : 'var(--primary)'
                                    : 'var(--bg-card)',
                                  color: isSel ? '#ffffff' : 'var(--text-secondary)',
                                  border: isSel ? 'none' : '1px solid var(--border-subtle)',
                                  cursor: isStudent ? 'default' : 'pointer',
                                }}
                              >
                                {stat}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
