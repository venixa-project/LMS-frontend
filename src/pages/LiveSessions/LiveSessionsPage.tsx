import React, { useState } from 'react';
import { mockLiveSessions, mockCohorts } from '../../data/mockData';
import { LiveSession } from '../../types';
import { useAuthStore } from '../../lib/store';
import {
  Video, Plus, Calendar, Clock, Users, ExternalLink,
  Edit2, X, CheckCircle2, AlertTriangle, Play, Radio,
  ShieldCheck, FileText, Check, AlertCircle
} from 'lucide-react';

export const LiveSessionsPage: React.FC = () => {
  const { user } = useAuthStore();
  const [sessions, setSessions] = useState<LiveSession[]>(mockLiveSessions);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'calendar'>('upcoming');

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

  // Instructor attendance roster state
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

  const handleUpdateAttendance = (id: string, newStatus: 'present' | 'late' | 'absent') => {
    setAttendanceList(attendanceList.map((a) => a.id === id ? { ...a, status: newStatus } : a));
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '4px' }}>Live Classes & Interactive Webinars</h1>
          <p className="text-secondary text-sm">Virtual classrooms, timezone coordination, attendance rosters, and governed recordings</p>
        </div>

        <button className="btn btn-primary" onClick={() => setIsScheduleModalOpen(true)}>
          <Plus size={16} /> Schedule Live Session
        </button>
      </div>

      {/* Tabs */}
      <div className="tabs-nav">
        <button
          className={`tab-btn ${activeTab === 'upcoming' ? 'active' : ''}`}
          onClick={() => setActiveTab('upcoming')}
        >
          <Calendar size={16} />
          Upcoming Sessions ({sessions.filter((s) => s.status === 'scheduled').length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'past' ? 'active' : ''}`}
          onClick={() => setActiveTab('past')}
        >
          <Clock size={16} />
          Past Sessions & Recordings
        </button>
      </div>

      {/* Sessions Grid */}
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
                  fontSize: '0.85rem',
                  marginBottom: '16px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calendar size={14} color="var(--primary)" />
                    <span>{new Date(s.startTime).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={14} color="var(--primary)" />
                    <span>{new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (UTC)</span>
                  </div>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setRecordingPolicyModal(s)}
                    >
                      <ShieldCheck size={13} /> Recording Policy
                    </button>

                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setActiveConsoleSession(s)}
                    >
                      <Users size={13} /> Instructor Console
                    </button>
                  </div>

                  <a
                    href={s.meetingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-primary btn-sm"
                    onClick={(e) => {
                      e.preventDefault();
                      alert(`Opening simulated ${s.provider.toUpperCase()} meeting room: ${s.meetingUrl}`);
                    }}
                  >
                    <ExternalLink size={14} /> Join Meeting
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Schedule Live Session Modal */}
      {isScheduleModalOpen && (
        <div className="modal-overlay" onClick={() => setIsScheduleModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '580px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Schedule Live Webinar / Class</h3>
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
                    placeholder="e.g. Distributed State & Concurrency Workshop"
                    className="form-input"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Target Cohort</label>
                  <select className="form-select" value={cohortId} onChange={(e) => setCohortId(e.target.value)}>
                    {mockCohorts.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
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
                    <select
                      className="form-select"
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(parseInt(e.target.value))}
                    >
                      <option value={30}>30 Minutes</option>
                      <option value={45}>45 Minutes</option>
                      <option value={60}>60 Minutes (1 hr)</option>
                      <option value={90}>90 Minutes (1.5 hrs)</option>
                      <option value={120}>120 Minutes (2 hrs)</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Conferencing Provider (Placeholder)</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    {[
                      { id: 'zoom', name: 'Zoom Meeting' },
                      { id: 'teams', name: 'MS Teams' },
                      { id: 'meet', name: 'Google Meet' },
                    ].map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setProvider(p.id as any)}
                        className={`btn ${provider === p.id ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.825rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={recordSession}
                      onChange={(e) => setRecordSession(e.target.checked)}
                      style={{ accentColor: 'var(--primary)' }}
                    />
                    <span>Automatically record session to Cloud Storage with retention policy</span>
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsScheduleModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Publish Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Instructor Live Console Modal */}
      {activeConsoleSession && (
        <div className="modal-overlay" onClick={() => setActiveConsoleSession(null)}>
          <div className="modal-card" style={{ maxWidth: '720px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Video size={20} color="var(--primary)" />
                <div>
                  <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Instructor Control Room</h3>
                  <p className="text-muted text-xs">{activeConsoleSession.title}</p>
                </div>
              </div>
              <button onClick={() => setActiveConsoleSession(null)} style={{ color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              {/* Broadcast state bar */}
              <div style={{
                background: sessionLiveStatus === 'broadcasting' ? 'var(--danger-bg)' : 'var(--bg-input)',
                border: sessionLiveStatus === 'broadcasting' ? '1px solid var(--danger-border)' : '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '20px'
              }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                    Broadcast State: {sessionLiveStatus === 'broadcasting' ? 'LIVE ON AIR 🔴' : 'Standby / Scheduled'}
                  </div>
                  <div className="text-muted text-xs">
                    4 Students waiting in lobby &bull; Audio/Video checks operational
                  </div>
                </div>

                <button
                  className={`btn ${sessionLiveStatus === 'broadcasting' ? 'btn-danger' : 'btn-success'}`}
                  onClick={() => setSessionLiveStatus(sessionLiveStatus === 'broadcasting' ? 'ended' : 'broadcasting')}
                >
                  {sessionLiveStatus === 'broadcasting' ? 'End Session' : 'Start Live Stream'}
                </button>
              </div>

              {/* Roster & Attendance Check */}
              <h4 style={{ fontSize: '0.95rem', marginBottom: '10px' }}>Student Attendance Roster</h4>
              <div className="table-container" style={{ maxHeight: '240px' }}>
                <table className="table" style={{ fontSize: '0.825rem' }}>
                  <thead>
                    <tr>
                      <th>Learner</th>
                      <th>Status</th>
                      <th>Mark Attendance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceList.map((a) => (
                      <tr key={a.id}>
                        <td style={{ fontWeight: 600 }}>{a.name}</td>
                        <td>
                          <span className={`badge ${a.status === 'present' ? 'badge-active' : a.status === 'late' ? 'badge-warning' : 'badge-failed'}`}>
                            {a.status}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              className={`btn ${a.status === 'present' ? 'btn-success' : 'btn-secondary'} btn-sm`}
                              style={{ padding: '3px 8px', fontSize: '0.7rem' }}
                              onClick={() => handleUpdateAttendance(a.id, 'present')}
                            >
                              Present
                            </button>
                            <button
                              className={`btn ${a.status === 'late' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                              style={{ padding: '3px 8px', fontSize: '0.7rem' }}
                              onClick={() => handleUpdateAttendance(a.id, 'late')}
                            >
                              Late
                            </button>
                            <button
                              className={`btn ${a.status === 'absent' ? 'btn-danger' : 'btn-secondary'} btn-sm`}
                              style={{ padding: '3px 8px', fontSize: '0.7rem' }}
                              onClick={() => handleUpdateAttendance(a.id, 'absent')}
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
