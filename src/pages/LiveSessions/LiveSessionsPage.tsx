import React, { useState } from 'react';
import { mockLiveSessions, mockCohorts, mockCourses } from '../../data/mockData';
import { LiveSession } from '../../types';
import { useAuthStore } from '../../lib/store';
import {
  Video, Plus, Calendar, Clock, Users, ExternalLink,
  Edit2, X, CheckCircle2, AlertTriangle, Play, Radio,
  ShieldCheck, FileText, Check, AlertCircle, Download,
  Filter, UserCheck, Shield, ChevronRight
} from 'lucide-react';

interface Props {
  defaultTab?: 'upcoming' | 'past' | 'timetable' | 'attendance';
}

export const LiveSessionsPage: React.FC<Props> = ({ defaultTab = 'upcoming' }) => {
  const { user } = useAuthStore();
  const isFaculty = user?.activeRole === 'trainer' || user?.activeRole === 'instructor';
  const isLearner = user?.activeRole === 'student' || user?.activeRole === 'learner';
  const facultyCohorts = mockCohorts.filter((c) => ['coh-001', 'coh-002', 'coh-004'].includes(c.id));
  const availableCohorts = isFaculty ? facultyCohorts : mockCohorts;

  const [sessions, setSessions] = useState<LiveSession[]>(mockLiveSessions);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'timetable' | 'attendance'>(defaultTab);

  // Modals
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [activeConsoleSession, setActiveConsoleSession] = useState<LiveSession | null>(null);
  const [recordingPolicyModal, setRecordingPolicyModal] = useState<LiveSession | null>(null);

  // Form states for new session
  const [title, setTitle] = useState('');
  const [cohortId, setCohortId] = useState('coh-001');
  const [startTime, setStartTime] = useState('2026-10-20T10:00');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [provider, setProvider] = useState<'zoom' | 'teams' | 'meet'>('zoom');
  const [recordSession, setRecordSession] = useState(true);

  // Timetable filter
  const [timetableCohort, setTimetableCohort] = useState('all');
  const [facultyOnlyTimetable, setFacultyOnlyTimetable] = useState(isFaculty);

  // Attendance tab state
  const [attendanceDate, setAttendanceDate] = useState('2026-10-17');
  const [attendanceCohort, setAttendanceCohort] = useState('coh-001');
  const [attendanceSaveNotice, setAttendanceSaveNotice] = useState<string | null>(null);
  const [selectedStudentCourseFilter, setSelectedStudentCourseFilter] = useState('all');

  // Student Personal Attendance Records
  const studentAttendanceHistory = [
    { id: 'att-1', date: '2026-10-17', course: 'Distributed Systems & Cloud Architecture', topic: 'Docker Container Orchestration & Health Checks', faculty: 'Dr. James Wilson', time: '09:00 - 10:30 AM', status: 'present', method: 'Biometric Lab Terminal' },
    { id: 'att-2', date: '2026-10-15', course: 'Advanced React & Component Design Patterns', topic: 'Optimistic State Mutation & Offline TanStack Query', faculty: 'Dr. James Wilson', time: '11:00 - 12:30 PM', status: 'present', method: 'Zoom In-App Telemetry (88m)' },
    { id: 'att-3', date: '2026-10-13', course: 'Distributed Systems & Cloud Architecture', topic: 'Kafka Consumer Group Rebalancing & Dead Letter Queues', faculty: 'Dr. James Wilson', time: '09:00 - 10:30 AM', status: 'late', method: 'Zoom Telemetry (Joined 12m late)' },
    { id: 'att-4', date: '2026-10-10', course: 'Full-Stack Web Development Bootcamp', topic: 'TypeScript Advanced Generics & Mapped Types Lab', faculty: 'Dr. James Wilson', time: '02:00 - 03:30 PM', status: 'present', method: 'Biometric Lab Terminal' },
    { id: 'att-5', date: '2026-10-08', course: 'Distributed Systems & Cloud Architecture', topic: 'Distributed Tracing with OpenTelemetry', faculty: 'Dr. James Wilson', time: '09:00 - 10:30 AM', status: 'present', method: 'Zoom In-App Telemetry (90m)' },
    { id: 'att-6', date: '2026-10-06', course: 'Advanced React & Component Design Patterns', topic: 'Compound Components & Context Architecture', faculty: 'Dr. James Wilson', time: '11:00 - 12:30 PM', status: 'excused', method: 'Medical Absence Verified by Dean' },
    { id: 'att-7', date: '2026-10-03', course: 'Distributed Systems & Cloud Architecture', topic: 'gRPC Protobuf Service Definition & Codegen', faculty: 'Dr. James Wilson', time: '09:00 - 10:30 AM', status: 'present', method: 'Biometric Lab Terminal' },
    { id: 'att-8', date: '2026-10-01', course: 'Full-Stack Web Development Bootcamp', topic: 'RESTful API Design & OpenAPI Spec Review', faculty: 'Dr. James Wilson', time: '02:00 - 03:30 PM', status: 'present', method: 'Faculty Roster Verified' },
  ];
  const [rosterAttendance, setRosterAttendance] = useState<Record<string, 'present' | 'late' | 'absent' | 'excused'>>({
    'st-1': 'present',
    'st-2': 'present',
    'st-3': 'late',
    'st-4': 'absent',
    'st-5': 'present',
    'st-6': 'present',
  });

  // Simulated export message
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Instructor attendance roster state (console modal)
  const [attendanceList, setAttendanceList] = useState<{ id: string; name: string; status: 'present' | 'late' | 'absent' }[]>([
    { id: '1', name: 'Alex Rivera (alex@lms.demo)', status: 'present' },
    { id: '2', name: 'Daniel Wu', status: 'present' },
    { id: '3', name: 'Elena Rostova', status: 'late' },
    { id: '4', name: 'Kwame Mensah', status: 'absent' },
  ]);

  const [sessionLiveStatus, setSessionLiveStatus] = useState<'idle' | 'broadcasting' | 'ended'>('idle');

  const filteredSessions = sessions.filter((s) => {
    if (activeTab === 'upcoming') return s.status === 'scheduled' || s.status === 'live';
    if (activeTab === 'past') return s.status === 'ended' || s.status === 'cancelled';
    return true;
  });

  const handleCreateSession = (e: React.FormEvent) => {
    e.preventDefault();
    const newSession: LiveSession = {
      id: `ls-${Date.now()}`,
      title,
      courseId: 'c-001',
      cohortId,
      instructorId: user?.id || 'u-004',
      startTime: new Date(startTime).toISOString(),
      durationMinutes,
      status: 'scheduled',
      meetingUrl: 'https://zoom.us/j/demo-session-room',
      provider,
      recordingEnabled: recordSession,
      recordingUrl: undefined,
      attendance: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setSessions([newSession, ...sessions]);
    setIsScheduleModalOpen(false);
  };

  const handleUpdateConsoleAttendance = (id: string, newStatus: 'present' | 'late' | 'absent') => {
    setAttendanceList(attendanceList.map((a) => a.id === id ? { ...a, status: newStatus } : a));
  };

  const handleMarkStudentAttendance = (studentId: string, status: 'present' | 'late' | 'absent' | 'excused') => {
    setRosterAttendance({ ...rosterAttendance, [studentId]: status });
  };

  const handleSaveAttendance = () => {
    const counts = Object.values(rosterAttendance).reduce((acc, st) => {
      acc[st] = (acc[st] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const cohortName = availableCohorts.find((c) => c.id === attendanceCohort)?.name || 'Class Roster';
    setAttendanceSaveNotice(
      `Attendance saved for ${cohortName} on ${attendanceDate}: ${counts['present'] || 0} Present, ${counts['late'] || 0} Late, ${counts['absent'] || 0} Absent, ${counts['excused'] || 0} Excused. (Demo state updated — changes will not persist across browser refresh)`
    );
    setTimeout(() => setAttendanceSaveNotice(null), 6000);
  };

  const handleExportAttendanceReport = () => {
    setExportNotice('Exporting verified attendance report (CSV minimized per privacy policy)...');
    setTimeout(() => {
      setExportNotice(null);
      const header = 'Student Name,Roll Number,Email,Status,Date,Overall Attendance\n';
      const rows = mockStudentsRoster.map(s => `"${s.name}","${s.rollNo}","${s.email}","${rosterAttendance[s.id] || 'present'}","${attendanceDate}","${s.overallAttendance}"`).join('\n');
      const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `attendance_report_${attendanceDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 600);
  };

  // Mock student roster for Attendance tab
  const mockStudentsRoster = [
    { id: 'st-1', name: 'Alex Rivera', email: 'alex@lms.demo', rollNo: 'STU-2026-001', overallAttendance: '96.2%' },
    { id: 'st-2', name: 'Daniel Wu', email: 'daniel.wu@acmelearning.com', rollNo: 'STU-2026-002', overallAttendance: '94.0%' },
    { id: 'st-3', name: 'Elena Rostova', email: 'elena.r@acmelearning.com', rollNo: 'STU-2026-003', overallAttendance: '88.5%' },
    { id: 'st-4', name: 'Kwame Mensah', email: 'kwame.m@acmelearning.com', rollNo: 'STU-2026-004', overallAttendance: '71.2%' },
    { id: 'st-5', name: 'Sophia Patel', email: 'sophia.p@acmelearning.com', rollNo: 'STU-2026-005', overallAttendance: '98.5%' },
    { id: 'st-6', name: 'Marcus Bell', email: 'marcus.b@acmelearning.com', rollNo: 'STU-2026-006', overallAttendance: '93.0%' },
  ];

  // Timetable Weekly Slots Data
  const weeklySchedule = [
    {
      day: 'Monday',
      slots: [
        { time: '09:00 - 10:30 AM', title: 'React Hooks & State Architecture', cohort: 'Spring 2026 Engineering', faculty: 'Dr. James Wilson', room: 'Hall 101' },
        { time: '02:00 - 03:30 PM', title: 'Microservices with Go & Docker', cohort: 'Summer 2026 Cloud', faculty: 'Prof. Elena Rostova', room: 'Lab B' },
      ]
    },
    {
      day: 'Tuesday',
      slots: [
        { time: '11:00 - 12:30 PM', title: 'Machine Learning Pipelines & Data Prep', cohort: 'Fall 2026 Data Science', faculty: 'Dr. Marcus Bell', room: 'Virtual Room A' },
        { time: '04:00 - 05:30 PM', title: 'Database Optimization & Indexing', cohort: 'Spring 2026 Engineering', faculty: 'Dr. James Wilson', room: 'Hall 102' },
      ]
    },
    {
      day: 'Wednesday',
      slots: [
        { time: '09:00 - 10:30 AM', title: 'React Hooks & State Architecture (Lab)', cohort: 'Spring 2026 Engineering', faculty: 'Dr. James Wilson', room: 'Lab A' },
        { time: '02:00 - 03:30 PM', title: 'Kubernetes Cluster Deployment', cohort: 'Summer 2026 Cloud', faculty: 'Prof. Elena Rostova', room: 'Virtual Room B' },
      ]
    },
    {
      day: 'Thursday',
      slots: [
        { time: '11:00 - 12:30 PM', title: 'Neural Networks & PyTorch Fundamentals', cohort: 'Fall 2026 Data Science', faculty: 'Dr. Marcus Bell', room: 'Hall 201' },
      ]
    },
    {
      day: 'Friday',
      slots: [
        { time: '10:00 - 11:30 AM', title: 'Engineering Track Weekly Capstone Review', cohort: 'Spring 2026 Engineering', faculty: 'Dr. James Wilson', room: 'Auditorium' },
        { time: '03:00 - 04:30 PM', title: 'Faculty Office Hours & Student Q&A', cohort: 'All Cohorts', faculty: 'All Faculty', room: 'Faculty Lounge' },
      ]
    }
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="badge badge-primary">
              {isLearner ? 'Student Academic Operations' : 'Operations'}
            </span>
            <span className="text-muted text-xs">Acme Learning Academy &bull; AY 2026–2027</span>
            {isLearner && <span className="badge badge-active">Alex Thompson</span>}
          </div>
          <h1 style={{ fontSize: '1.75rem', margin: 0 }}>
            {isLearner ? 'My Timetable & Attendance Record' : 'Attendance & Timetable Coordination'}
          </h1>
          <p className="text-secondary text-sm">
            {isLearner
              ? 'Personal weekly lecture schedule, upcoming live class rooms, verified attendance record, and compliance'
              : 'Institution class schedules, weekly timetable grid, daily attendance rosters, and compliance summaries'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={handleExportAttendanceReport}>
            <Download size={16} /> {isLearner ? 'Download Attendance Statement' : 'Export Attendance Report'}
          </button>
          {!isLearner && (
            <button className="btn btn-primary" onClick={() => setIsScheduleModalOpen(true)}>
              <Plus size={16} /> Schedule Live Session
            </button>
          )}
        </div>
      </div>

      {exportNotice && (
        <div style={{
          background: 'var(--info-bg)',
          border: '1px solid var(--info-border)',
          color: 'var(--info)',
          padding: '12px 18px',
          borderRadius: 'var(--radius-md)',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '0.85rem'
        }}>
          <Clock size={18} />
          <span>{exportNotice}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs-nav" style={{ marginBottom: '20px' }}>
        <button
          className={`tab-btn ${activeTab === 'upcoming' ? 'active' : ''}`}
          onClick={() => setActiveTab('upcoming')}
        >
          <Video size={16} />
          {isLearner ? 'Upcoming Live Classes' : 'Live Classes'} ({sessions.filter((s) => s.status === 'scheduled').length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'timetable' ? 'active' : ''}`}
          onClick={() => setActiveTab('timetable')}
        >
          <Calendar size={16} />
          {isLearner ? 'My Weekly Timetable' : 'Weekly Timetable & Schedule'}
        </button>
        <button
          className={`tab-btn ${activeTab === 'attendance' ? 'active' : ''}`}
          onClick={() => setActiveTab('attendance')}
        >
          <UserCheck size={16} />
          {isLearner ? 'My Attendance History (96.2%)' : 'Attendance Rosters & Compliance'}
        </button>
        <button
          className={`tab-btn ${activeTab === 'past' ? 'active' : ''}`}
          onClick={() => setActiveTab('past')}
        >
          <Clock size={16} />
          {isLearner ? 'Recorded Classes' : 'Past & Recorded'} ({sessions.filter((s) => s.status === 'ended').length})
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 1. TIMETABLE & CLASS SCHEDULE TAB */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'timetable' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Timetable Header Filter */}
          <div className="card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Calendar size={18} color="var(--primary)" />
                <div>
                  <h3 style={{ fontSize: '1rem', margin: 0 }}>Weekly Class Timetable &bull; Fall Semester 2026</h3>
                  <span className="text-muted text-xs">Standard academic slot intervals &bull; 90 min lectures</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                {isFaculty && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={facultyOnlyTimetable}
                      onChange={(e) => setFacultyOnlyTimetable(e.target.checked)}
                    />
                    <span>My Assigned Lectures Only</span>
                  </label>
                )}

                {isLearner ? (
                  <span className="badge badge-primary">Cohort: Spring 2026 Engineering</span>
                ) : (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span className="text-muted text-xs font-semibold">Filter Batch:</span>
                    <select
                      className="form-select"
                      value={timetableCohort}
                      onChange={(e) => setTimetableCohort(e.target.value)}
                      style={{ width: 'auto' }}
                    >
                      <option value="all">{isFaculty ? 'All Assigned Batches' : 'All Cohorts / Classes'}</option>
                      {availableCohorts.map((co) => (
                        <option key={co.id} value={co.name}>{co.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Timetable Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
            {weeklySchedule.map((daySchedule) => (
              <div
                key={daySchedule.day}
                className="card"
                style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}
              >
                <div style={{
                  paddingBottom: '10px',
                  borderBottom: '2px solid var(--primary)',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span>{daySchedule.day}</span>
                  <span className="text-muted text-xs">{daySchedule.slots.length} Classes</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {daySchedule.slots.map((slot, sIdx) => {
                    const isMatch = isLearner
                      ? (slot.cohort === 'Spring 2026 Engineering' || slot.cohort === 'All Cohorts')
                      : (timetableCohort === 'all' || slot.cohort.includes(timetableCohort) || slot.cohort === 'All Cohorts');
                    if (!isMatch) return null;
                    if (isFaculty && facultyOnlyTimetable && !slot.faculty.includes('Wilson')) return null;

                    return (
                      <div
                        key={sIdx}
                        style={{
                          background: 'var(--bg-input)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-md)',
                          padding: '12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 700 }}>
                          <Clock size={12} /> {slot.time}
                        </div>
                        <div style={{ fontWeight: 600, fontSize: '0.825rem', lineHeight: 1.25 }}>
                          {slot.title}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {slot.cohort}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', fontSize: '0.7rem' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>{slot.faculty}</span>
                          <span className="badge badge-secondary" style={{ fontSize: '0.65rem' }}>{slot.room}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Shield size={16} color="var(--primary)" />
            <span><strong>Demo Interaction Notice:</strong> Timetable slots and room allocations are maintained in frontend simulation state.</span>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. ATTENDANCE ROSTERS & COMPLIANCE TAB */}
      {activeTab === 'attendance' && (
        isLearner ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Student Personal Attendance KPI Cards */}
            <div className="grid-4">
              <div className="stat-card">
                <span className="text-muted text-xs font-semibold">My Attendance Rate</span>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--success)' }}>96.2%</div>
                <p className="text-success text-xs">&uarr; 21.2% above policy requirement (75%)</p>
              </div>
              <div className="stat-card">
                <span className="text-muted text-xs font-semibold">Total Classes Logged</span>
                <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>26</div>
                <p className="text-muted text-xs">AY 2026-2027 to date</p>
              </div>
              <div className="stat-card">
                <span className="text-muted text-xs font-semibold">Attended & Punctual</span>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)' }}>25 Classes</div>
                <p className="text-muted text-xs">23 Present &bull; 2 Late Arrivals</p>
              </div>
              <div className="stat-card">
                <span className="text-muted text-xs font-semibold">Excused Absences</span>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--info)' }}>1</div>
                <p className="text-muted text-xs">Dean approved & documented</p>
              </div>
            </div>

            {/* Course Filter & Attendance Ledger */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Personal Attendance Record & Verification Ledger</h3>
                  <p className="text-muted text-xs">Immutable attendance logs recorded by biometric terminal and classroom telemetry</p>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Filter size={15} color="var(--primary)" />
                    <span className="text-muted text-xs font-semibold">Filter Course:</span>
                  </div>
                  <select
                    className="form-select"
                    value={selectedStudentCourseFilter}
                    onChange={(e) => setSelectedStudentCourseFilter(e.target.value)}
                    style={{ padding: '6px 10px', fontSize: '0.8rem', width: 'auto' }}
                  >
                    <option value="all">All Enrolled Courses (3)</option>
                    <option value="Distributed Systems & Cloud Architecture">Distributed Systems & Cloud Architecture</option>
                    <option value="Advanced React & Component Design Patterns">Advanced React & Component Design Patterns</option>
                    <option value="Full-Stack Web Development Bootcamp">Full-Stack Web Development Bootcamp</option>
                  </select>
                </div>
              </div>

              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Course</th>
                      <th>Session Topic</th>
                      <th>Faculty</th>
                      <th>Time Slot</th>
                      <th>Status</th>
                      <th>Verification Method</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentAttendanceHistory
                      .filter((att) => selectedStudentCourseFilter === 'all' || att.course === selectedStudentCourseFilter)
                      .map((att) => (
                        <tr key={att.id}>
                          <td style={{ fontWeight: 600 }}>{att.date}</td>
                          <td>{att.course}</td>
                          <td className="text-secondary text-sm">{att.topic}</td>
                          <td>{att.faculty}</td>
                          <td className="text-muted text-xs">{att.time}</td>
                          <td>
                            <span className={`badge badge-${att.status === 'present' ? 'success' : att.status === 'late' ? 'warning' : 'info'}`}>
                              {att.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="text-muted text-xs font-mono">
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <ShieldCheck size={13} color="var(--success)" />
                              {att.method}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              <div style={{
                marginTop: '18px',
                padding: '14px',
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid var(--success-border)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontSize: '0.8rem'
              }}>
                <CheckCircle2 size={20} color="var(--success)" style={{ flexShrink: 0 }} />
                <div>
                  <strong>Academic Standing: Exemplary (96.2%).</strong> Your attendance exceeds the 75% institutional threshold required to sit for final semester examinations. Attendance records are verified and finalized by institution faculty.
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Attendance KPI Cards */}
          <div className="grid-4">
            <div className="stat-card">
              <span className="text-muted text-xs font-semibold">Institution Attendance</span>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--success)' }}>94.6%</div>
              <p className="text-success text-xs">&uarr; 1.4% vs policy requirement (75%)</p>
            </div>
            <div className="stat-card">
              <span className="text-muted text-xs font-semibold">Total Sessions Logged</span>
              <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>24</div>
              <p className="text-muted text-xs">AY 2026-2027 to date</p>
            </div>
            <div className="stat-card">
              <span className="text-muted text-xs font-semibold">Present Students</span>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)' }}>96.0%</div>
              <p className="text-muted text-xs">Average student turnout</p>
            </div>
            <div className="stat-card">
              <span className="text-muted text-xs font-semibold">At-Risk (&lt; 75% Attendance)</span>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--danger)' }}>7</div>
              <p className="text-danger text-xs">Flagged for academic warning</p>
            </div>
          </div>

          {/* Class-wise Attendance Performance */}
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>Class-wise Attendance Rates</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              <div style={{ background: 'var(--bg-input)', padding: '14px', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Spring 2026 Engineering</span>
                  <strong style={{ color: 'var(--success)' }}>96.2%</strong>
                </div>
                <div className="progress-bar-bg" style={{ height: '6px' }}>
                  <div className="progress-bar-fill" style={{ width: '96.2%' }} />
                </div>
                <span className="text-muted text-xs" style={{ marginTop: '4px', display: 'block' }}>58 / 60 learners in good standing</span>
              </div>

              <div style={{ background: 'var(--bg-input)', padding: '14px', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Summer 2026 Cloud Architects</span>
                  <strong style={{ color: 'var(--info)' }}>93.8%</strong>
                </div>
                <div className="progress-bar-bg" style={{ height: '6px' }}>
                  <div className="progress-bar-fill" style={{ width: '93.8%' }} />
                </div>
                <span className="text-muted text-xs" style={{ marginTop: '4px', display: 'block' }}>45 / 48 learners in good standing</span>
              </div>

              <div style={{ background: 'var(--bg-input)', padding: '14px', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Fall 2026 Data Science</span>
                  <strong style={{ color: 'var(--success)' }}>95.1%</strong>
                </div>
                <div className="progress-bar-bg" style={{ height: '6px' }}>
                  <div className="progress-bar-fill" style={{ width: '95.1%' }} />
                </div>
                <span className="text-muted text-xs" style={{ marginTop: '4px', display: 'block' }}>39 / 41 learners in good standing</span>
              </div>
            </div>
          </div>

          {/* Daily Attendance Sheet & Interactive Roster */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Daily Student Attendance Roster</h3>
                <p className="text-muted text-xs">Verify daily presence for selected class and date</p>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="text-muted text-xs font-semibold">Date:</span>
                  <input
                    type="date"
                    className="form-input"
                    value={attendanceDate}
                    onChange={(e) => setAttendanceDate(e.target.value)}
                    style={{ padding: '4px 8px', fontSize: '0.8rem', width: 'auto' }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="text-muted text-xs font-semibold">Class:</span>
                  <select
                    className="form-select"
                    value={attendanceCohort}
                    onChange={(e) => setAttendanceCohort(e.target.value)}
                    style={{ padding: '4px 8px', fontSize: '0.8rem', width: 'auto' }}
                  >
                    {availableCohorts.map((co) => (
                      <option key={co.id} value={co.id}>{co.name}</option>
                    ))}
                  </select>
                </div>

                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleSaveAttendance}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <CheckCircle2 size={14} /> Save Attendance Roster
                </button>
              </div>
            </div>

            {attendanceSaveNotice && (
              <div style={{
                background: 'var(--success-bg)',
                border: '1px solid var(--success-border)',
                color: 'var(--success)',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                marginBottom: '16px',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <CheckCircle2 size={16} />
                <span>{attendanceSaveNotice}</span>
              </div>
            )}

            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Roll Number</th>
                    <th>Overall Rate</th>
                    <th>Mark Attendance</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {mockStudentsRoster.map((st) => {
                    const currentStatus = rosterAttendance[st.id] || 'present';

                    return (
                      <tr key={st.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{st.name}</div>
                          <div className="text-muted text-xs">{st.email}</div>
                        </td>
                        <td>
                          <code>{st.rollNo}</code>
                        </td>
                        <td>
                          <span style={{
                            fontWeight: 700,
                            color: parseFloat(st.overallAttendance) < 75 ? 'var(--danger)' : 'var(--success)'
                          }}>
                            {st.overallAttendance}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              onClick={() => handleMarkStudentAttendance(st.id, 'present')}
                              className="btn btn-sm"
                              style={{
                                background: currentStatus === 'present' ? 'var(--success)' : 'var(--bg-input)',
                                color: currentStatus === 'present' ? '#fff' : 'var(--text-secondary)',
                                padding: '3px 8px',
                                fontSize: '0.72rem'
                              }}
                            >
                              Present
                            </button>

                            <button
                              onClick={() => handleMarkStudentAttendance(st.id, 'late')}
                              className="btn btn-sm"
                              style={{
                                background: currentStatus === 'late' ? 'var(--warning)' : 'var(--bg-input)',
                                color: currentStatus === 'late' ? '#fff' : 'var(--text-secondary)',
                                padding: '3px 8px',
                                fontSize: '0.72rem'
                              }}
                            >
                              Late
                            </button>

                            <button
                              onClick={() => handleMarkStudentAttendance(st.id, 'absent')}
                              className="btn btn-sm"
                              style={{
                                background: currentStatus === 'absent' ? 'var(--danger)' : 'var(--bg-input)',
                                color: currentStatus === 'absent' ? '#fff' : 'var(--text-secondary)',
                                padding: '3px 8px',
                                fontSize: '0.72rem'
                              }}
                            >
                              Absent
                            </button>

                            <button
                              onClick={() => handleMarkStudentAttendance(st.id, 'excused')}
                              className="btn btn-sm"
                              style={{
                                background: currentStatus === 'excused' ? 'var(--info)' : 'var(--bg-input)',
                                color: currentStatus === 'excused' ? '#fff' : 'var(--text-secondary)',
                                padding: '3px 8px',
                                fontSize: '0.72rem'
                              }}
                            >
                              Excused
                            </button>
                          </div>
                        </td>
                        <td>
                          <span className={`badge badge-${currentStatus === 'present' ? 'active' : currentStatus === 'late' ? 'warning' : currentStatus === 'absent' ? 'danger' : 'info'}`}>
                            {currentStatus}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{
              marginTop: '16px',
              padding: '12px',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.75rem',
              color: 'var(--text-muted)'
            }}>
              <strong>Frontend Demo Roster:</strong> Attendance markings are recorded in local demo state. Permanent persistence requires backend sync integration.
            </div>
          </div>
        </div>
        )
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. SESSIONS GRID (UPCOMING & PAST) */}
      {/* ------------------------------------------------------------- */}
      {(activeTab === 'upcoming' || activeTab === 'past') && (
        <div className="grid-2">
          {filteredSessions.map((s) => {
            const isLive = s.status === 'live';

            return (
              <div
                key={s.id}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  borderLeft: isLive ? '4px solid var(--danger)' : '1px solid var(--border-subtle)'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {isLive ? (
                        <span className="badge badge-failed" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Radio size={12} className="pulse" /> LIVE NOW
                        </span>
                      ) : (
                        <span className={`badge badge-${s.status}`}>{s.status}</span>
                      )}
                      <span className="badge badge-primary" style={{ textTransform: 'uppercase' }}>
                        {s.provider}
                      </span>
                    </div>

                    <span className="text-muted text-xs font-semibold">
                      {s.durationMinutes} Minutes
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>{s.title}</h3>
                  <p className="text-secondary text-sm" style={{ marginBottom: '16px' }}>
                    Cohort: Spring 2026 Engineering Track &bull; Hosted by Dr. James Wilson
                  </p>

                  <div style={{
                    background: 'var(--bg-input)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    marginBottom: '16px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Calendar size={16} color="var(--primary)" />
                      <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                        {new Date(s.startTime).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Clock size={16} color="var(--accent-cyan)" />
                      <span style={{ fontSize: '0.85rem' }}>
                        {new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '14px' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setRecordingPolicyModal(s)}
                    style={{ fontSize: '0.75rem' }}
                  >
                    <ShieldCheck size={14} /> Retention Policy
                  </button>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setActiveConsoleSession(s)}
                    >
                      Instructor Console
                    </button>

                    <a
                      href={s.meetingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-primary btn-sm"
                    >
                      <ExternalLink size={14} /> Launch Zoom
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Schedule Live Session Modal */}
      {isScheduleModalOpen && (
        <div className="modal-overlay" onClick={() => setIsScheduleModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '580px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Schedule Live Interactive Class</h3>
              <button onClick={() => setIsScheduleModalOpen(false)} style={{ color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateSession}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Session Topic / Title <span className="required">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Advanced Distributed Tracing with OpenTelemetry"
                    className="form-input"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Target Cohort</label>
                    <select
                      className="form-select"
                      value={cohortId}
                      onChange={(e) => setCohortId(e.target.value)}
                    >
                      {mockCohorts.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Provider Integration</label>
                    <select
                      className="form-select"
                      value={provider}
                      onChange={(e) => setProvider(e.target.value as any)}
                    >
                      <option value="zoom">Zoom Video SDK</option>
                      <option value="teams">Microsoft Teams</option>
                      <option value="meet">Google Meet</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Date & Time</label>
                    <input
                      type="datetime-local"
                      required
                      className="form-input"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Duration (Minutes)</label>
                    <input
                      type="number"
                      min="15"
                      step="15"
                      className="form-input"
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 60)}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 0' }}>
                  <input
                    type="checkbox"
                    id="recPolicy"
                    checked={recordSession}
                    onChange={(e) => setRecordSession(e.target.checked)}
                  />
                  <label htmlFor="recPolicy" style={{ fontSize: '0.85rem', cursor: 'pointer' }}>
                    Enable Cloud Recording with Automated 90-Day Enterprise Retention
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsScheduleModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Schedule Class
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Instructor Console Modal */}
      {activeConsoleSession && (
        <div className="modal-overlay" onClick={() => setActiveConsoleSession(null)}>
          <div className="modal-card" style={{ maxWidth: '680px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: '1.15rem', margin: 0 }}>Instructor Live Console</h3>
                <p className="text-muted text-xs">{activeConsoleSession.title}</p>
              </div>
              <button onClick={() => setActiveConsoleSession(null)} style={{ color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{
                background: 'var(--bg-input)',
                borderRadius: 'var(--radius-lg)',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Current Broadcast Status</div>
                  <div style={{ fontWeight: 800, fontSize: '1.2rem', textTransform: 'uppercase', color: sessionLiveStatus === 'broadcasting' ? 'var(--danger)' : 'var(--text-main)' }}>
                    {sessionLiveStatus}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  {sessionLiveStatus !== 'broadcasting' ? (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => setSessionLiveStatus('broadcasting')}
                    >
                      <Radio size={14} /> Start Broadcast
                    </button>
                  ) : (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setSessionLiveStatus('ended')}
                      style={{ color: 'var(--danger)' }}
                    >
                      End Broadcast
                    </button>
                  )}
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h4 style={{ fontSize: '0.95rem', margin: 0 }}>Student Live Attendance Roster</h4>
                  <span className="text-muted text-xs">{attendanceList.length} Connected</span>
                </div>

                <table className="table">
                  <thead>
                    <tr>
                      <th>Participant</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceList.map((a) => (
                      <tr key={a.id}>
                        <td style={{ fontWeight: 600 }}>{a.name}</td>
                        <td>
                          <span className={`badge badge-${a.status === 'present' ? 'active' : a.status === 'late' ? 'warning' : 'danger'}`}>
                            {a.status}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button
                              onClick={() => handleUpdateConsoleAttendance(a.id, 'present')}
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '2px 6px', fontSize: '0.7rem' }}
                            >
                              Present
                            </button>
                            <button
                              onClick={() => handleUpdateConsoleAttendance(a.id, 'late')}
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '2px 6px', fontSize: '0.7rem' }}
                            >
                              Late
                            </button>
                            <button
                              onClick={() => handleUpdateConsoleAttendance(a.id, 'absent')}
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '2px 6px', fontSize: '0.7rem' }}
                            >
                              Absent
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setActiveConsoleSession(null)}>Close Console</button>
            </div>
          </div>
        </div>
      )}

      {/* Recording Policy Modal */}
      {recordingPolicyModal && (
        <div className="modal-overlay" onClick={() => setRecordingPolicyModal(null)}>
          <div className="modal-card" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Session Recording & Privacy Policy</h3>
              <button onClick={() => setRecordingPolicyModal(null)} style={{ color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span className="text-muted">Recording Status</span>
                <span className="badge badge-active">{recordingPolicyModal.recordingEnabled ? 'Enabled' : 'Disabled'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span className="text-muted">Retention Schedule</span>
                <span className="font-semibold">90 Days (Automated Cloud Purge)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span className="text-muted">Access Scope</span>
                <span className="font-semibold">Enrolled Cohort Members Only</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                <span className="text-muted">Consent Capture</span>
                <span className="font-semibold">Participant opt-in recorded at join</span>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary btn-sm" onClick={() => setRecordingPolicyModal(null)}>
                Acknowledged
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
