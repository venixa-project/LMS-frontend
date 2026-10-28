import React, { useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuthStore } from '../../lib/store';
import { mockProctoringIncidents } from '../../data/mockData';
import { ProctoringIncident } from '../../types';
import {
  useProctoringStore,
  ProctoringSession,
  ProctoringPolicyLevel,
} from '../../lib/proctoringStore';
import { JitsiProctorDashboard } from './components/JitsiProctorDashboard';
import {
  Shield, Eye, AlertTriangle, CheckCircle2, Clock, X,
  Filter, UserCheck, ShieldAlert, FileText, Camera, Video, Monitor, Lock,
  Search, Check, ExternalLink, Pause, Play, AlertCircle
} from 'lucide-react';
import { generateJitsiRoomName } from '../../lib/jitsiProctoring';
import { GoogleMeetIcon } from '../../components/GoogleMeet';

export const ProctoringPage: React.FC = () => {
  const { user } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as 'live_monitor' | 'queue' | 'policy' | 'appeals' | null;

  const {
    sessions,
    policies,
    submitInstructorDecision,
    updatePolicy,
  } = useProctoringStore();

  const [activeTab, setActiveTab] = useState<'live_monitor' | 'queue' | 'policy' | 'appeals'>(
    tabParam && ['live_monitor', 'queue', 'policy', 'appeals'].includes(tabParam) ? tabParam : 'queue'
  );
  const [selectedSession, setSelectedSession] = useState<ProctoringSession | null>(null);
  const [selectedOutcome, setSelectedOutcome] = useState<
    | 'no_violation'
    | 'warning_issued'
    | 'further_review'
    | 'violation_confirmed'
    | 'technical_incident_accepted'
  >('no_violation');
  const [instructorNotes, setInstructorNotes] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [activeVideoTime, setActiveVideoTime] = useState<number>(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState<boolean>(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [assessmentFilter, setAssessmentFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const isLearner =
    user?.activeRole === 'student' ||
    user?.activeRole === 'learner' ||
    user?.roles?.some((r) => r.name === 'student' || r.name === 'learner');

  // Security Check: Students are not permitted to access proctor dashboard or other students' monitoring details
  if (isLearner) {
    return (
      <div style={{ maxWidth: '640px', margin: '60px auto', textAlign: 'center' }}>
        <div className="card" style={{ padding: '36px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'var(--danger-bg)',
            color: 'var(--danger)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px'
          }}>
            <Lock size={32} />
          </div>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '8px' }}>Authorized Personnel Only</h2>
          <p className="text-secondary text-sm" style={{ marginBottom: '24px', lineHeight: 1.6 }}>
            The Proctoring Center and Live Google Meet Monitoring Console are restricted to authorized exam creators, assigned proctors, and institution administrators. Student accounts cannot view peer session telemetry, moderation tools, or incident logs.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <Link to="/my-assessments" className="btn btn-primary">
              Return to My Assessments
            </Link>
            <Link to="/dashboard" className="btn btn-secondary">
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Unique assessments for dropdown
  const uniqueAssessments = useMemo(() => {
    const map = new Map<string, string>();
    sessions.forEach((s) => map.set(s.assessmentId, s.assessmentTitle));
    return Array.from(map.entries());
  }, [sessions]);

  // Filtered Sessions
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesLearner = s.learnerName.toLowerCase().includes(q);
        const matchesTitle = s.assessmentTitle.toLowerCase().includes(q);
        const matchesId = s.id.toLowerCase().includes(q);
        if (!matchesLearner && !matchesTitle && !matchesId) return false;
      }

      // Assessment
      if (assessmentFilter !== 'all' && s.assessmentId !== assessmentFilter) {
        return false;
      }

      // Severity
      if (severityFilter !== 'all') {
        const hasSeverity = s.events.some((e) => e.severity === severityFilter);
        if (!hasSeverity) return false;
      }

      // Category
      if (categoryFilter !== 'all') {
        const hasCategory = s.events.some((e) => e.category === categoryFilter);
        if (!hasCategory) return false;
      }

      // Review Status
      if (statusFilter !== 'all') {
        if (statusFilter === 'pending') {
          if (s.status === 'reviewed') return false;
        } else if (statusFilter === 'reviewed') {
          if (s.status !== 'reviewed') return false;
        } else if (statusFilter === 'appealed') {
          if (!s.studentAppeal) return false;
        }
      }

      return true;
    });
  }, [sessions, searchQuery, assessmentFilter, severityFilter, categoryFilter, statusFilter]);

  // Statistics
  const totalSessions = sessions.length;
  const sessionsWithEvents = sessions.filter((s) => s.events.some((e) => e.category !== 'timing_event')).length;
  const pendingReviews = sessions.filter((s) => s.status !== 'reviewed' && s.events.some((e) => e.category !== 'timing_event')).length;
  const clearedSessions = sessions.filter((s) => s.reviewDecision?.outcome === 'no_violation').length;
  const acceptedTechnical = sessions.filter((s) => s.reviewDecision?.outcome === 'technical_incident_accepted').length;
  const pendingAppeals = sessions.filter((s) => s.studentAppeal && s.studentAppeal.status === 'pending').length;

  const handleOpenInspection = (session: ProctoringSession) => {
    setSelectedSession(session);
    setSelectedOutcome(session.reviewDecision?.outcome || 'no_violation');
    setInstructorNotes(session.reviewDecision?.explanation || '');
    setFormError(null);
    setActiveVideoTime(0);
    setIsVideoPlaying(false);
  };

  const handleSaveDecision = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSession) return;

    // Require explanation for adverse decisions
    if (
      (selectedOutcome === 'warning_issued' || selectedOutcome === 'violation_confirmed') &&
      !instructorNotes.trim()
    ) {
      setFormError('An explanation is mandatory when confirming policy violations or issuing formal warnings.');
      return;
    }

    submitInstructorDecision(selectedSession.id, {
      reviewerId: user?.id || 'u-004',
      reviewerName: user?.displayName || (user ? `${user.firstName} ${user.lastName}`.trim() : 'Dr. James Wilson (Instructor)'),
      outcome: selectedOutcome,
      explanation: instructorNotes.trim() || 'Reviewed in accordance with institutional proctoring guidelines.',
    });

    setSelectedSession(null);
  };

  const getOutcomeBadge = (outcome?: string) => {
    switch (outcome) {
      case 'no_violation':
        return <span className="badge badge-active">No Violation Established</span>;
      case 'warning_issued':
        return <span className="badge badge-warning">Advisory / Warning Issued</span>;
      case 'further_review':
        return <span className="badge badge-primary">Escalated for Board Review</span>;
      case 'violation_confirmed':
        return <span className="badge badge-failed">Exam Policy Violation</span>;
      case 'technical_incident_accepted':
        return <span className="badge badge-active">Technical Incident Accepted</span>;
      default:
        return <span className="badge badge-warning">Awaiting Review</span>;
    }
  };

  const handleTabChange = (tab: 'live_monitor' | 'queue' | 'policy' | 'appeals') => {
    setActiveTab(tab);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', tab);
      return next;
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <h1 style={{ fontSize: '1.75rem', margin: 0, fontWeight: 800 }}>
              Proctoring Center & Incident Review
            </h1>
            <span className="badge badge-primary" style={{ textTransform: 'uppercase', fontSize: '0.72rem' }}>
              VeniGuard Enterprise
            </span>
          </div>
          <p className="text-secondary text-sm">
            Explainable telemetry verification, false-positive protection, and human evidence moderation
          </p>
        </div >

        <div
          style={{
            background: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            color: '#fbbf24',
            padding: '8px 16px',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: 600,
          }}
        >
          <AlertTriangle size={16} />
          <span>Policy Rule: Signals are review indicators, never autonomous cheating verdicts.</span>
        </div>
      </div >

      {/* KPI Overview Cards */}
      < div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '16px',
        }}
      >
        <div className="card" style={{ padding: '18px' }}>
          <div className="text-muted text-xs font-semibold">Total Monitored Sessions</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '4px', color: 'var(--text-main)' }}>
            {totalSessions}
          </div>
          <div className="text-muted text-xs" style={{ marginTop: '2px' }}>
            Across all course cohorts
          </div>
        </div>

        <div className="card" style={{ padding: '18px' }}>
          <div className="text-muted text-xs font-semibold">Sessions with Signals</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '4px', color: '#F472B6' }}>
            {sessionsWithEvents}
          </div>
          <div className="text-muted text-xs" style={{ marginTop: '2px' }}>
            Telemetry flagged for review
          </div>
        </div>

        <div className="card" style={{ padding: '18px' }}>
          <div className="text-muted text-xs font-semibold">Pending Faculty Review</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '4px', color: 'var(--warning)' }}>
            {pendingReviews}
          </div>
          <div className="text-muted text-xs" style={{ marginTop: '2px' }}>
            Awaiting decision
          </div>
        </div>

        <div className="card" style={{ padding: '18px' }}>
          <div className="text-muted text-xs font-semibold">Cleared (False Positives)</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '4px', color: 'var(--success)' }}>
            {clearedSessions}
          </div>
          <div className="text-muted text-xs" style={{ marginTop: '2px' }}>
            No violation established
          </div>
        </div>

        <div className="card" style={{ padding: '18px' }}>
          <div className="text-muted text-xs font-semibold">Technical Disruptions Accepted</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '4px', color: '#3B82F6' }}>
            {acceptedTechnical}
          </div>
          <div className="text-muted text-xs" style={{ marginTop: '2px' }}>
            Hardware / ISP drops excused
          </div>
        </div>
      </div >

      {/* Tabs */}
      < div className="tabs-nav" style={{ marginBottom: '24px' }}>
        <button
          className={`tab-btn ${activeTab === 'live_monitor' ? 'active' : ''}`}
          onClick={() => handleTabChange('live_monitor')}
        >
          <Video size={16} />
          Live Proctoring & Google Meet Monitor
        </button>
        <button
          className={`tab-btn ${activeTab === 'queue' ? 'active' : ''}`}
          onClick={() => handleTabChange('queue')}
        >
          <ShieldAlert size={16} />
          Flagged Incident Review Queue ({pendingReviews})
        </button>
        <button
          className={`tab-btn ${activeTab === 'policy' ? 'active' : ''}`}
          onClick={() => handleTabChange('policy')}
        >
          <Shield size={16} />
          Proctoring & Privacy Policies
        </button>
        <button
          className={`tab-btn ${activeTab === 'appeals' ? 'active' : ''}`}
          onClick={() => handleTabChange('appeals')}
        >
          <UserCheck size={16} />
          Learner Explanations & Appeals ({pendingAppeals})
        </button>
      </div >

      {/* Tab 1: Queue */}
      {
        activeTab === 'queue' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Multi-Dimensional Filter Bar */}
            <div
              className="card"
              style={{
                padding: '16px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                {/* Search Box */}
                <div style={{ position: 'relative', flex: '1 1 240px' }}>
                  <Search
                    size={16}
                    style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
                  />
                  <input
                    type="text"
                    placeholder="Search by student name, assessment, or session ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px 8px 36px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-main)',
                      fontSize: '0.85rem',
                    }}
                  />
                </div>

                {/* Assessment Filter */}
                <select
                  value={assessmentFilter}
                  onChange={(e) => setAssessmentFilter(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-main)',
                    fontSize: '0.85rem',
                  }}
                >
                  <option value="all">All Assessments</option>
                  {uniqueAssessments.map(([aid, title]) => (
                    <option key={aid} value={aid}>{title}</option>
                  ))}
                </select>

                {/* Category Filter */}
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-main)',
                    fontSize: '0.85rem',
                  }}
                >
                  <option value="all">All Signal Categories</option>
                  <option value="tab_visibility">Tab Visibility / Window Focus</option>
                  <option value="fullscreen_exit">Full-Screen Exit</option>
                  <option value="screen_share_interruption">Screen Sharing Interruption</option>
                  <option value="network_interruption">Internet / Network Drop</option>
                  <option value="mic_interruption">Microphone Disconnection</option>
                  <option value="webcam_interruption">Webcam Disconnection</option>
                </select>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-main)',
                    fontSize: '0.85rem',
                  }}
                >
                  <option value="all">All Review States</option>
                  <option value="pending">Awaiting Review</option>
                  <option value="reviewed">Review Completed</option>
                  <option value="appealed">Has Student Explanation/Appeal</option>
                </select>
              </div>

              {/* Severity Pills Bar */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span className="text-muted text-xs font-semibold">Severity:</span>
                  <button
                    className={`btn ${severityFilter === 'all' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                    onClick={() => setSeverityFilter('all')}
                    style={{ fontSize: '0.75rem', padding: '3px 10px' }}
                  >
                    All Signals
                  </button>
                  <button
                    className={`btn ${severityFilter === 'critical' ? 'btn-danger' : 'btn-secondary'} btn-sm`}
                    onClick={() => setSeverityFilter('critical')}
                    style={{ fontSize: '0.75rem', padding: '3px 10px' }}
                  >
                    Critical Drops
                  </button>
                  <button
                    className={`btn ${severityFilter === 'warning' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                    onClick={() => setSeverityFilter('warning')}
                    style={{ fontSize: '0.75rem', padding: '3px 10px' }}
                  >
                    Warnings
                  </button>
                  <button
                    className={`btn ${severityFilter === 'informational' ? 'btn-secondary' : 'btn-secondary'} btn-sm`}
                    onClick={() => setSeverityFilter('informational')}
                    style={{ fontSize: '0.75rem', padding: '3px 10px' }}
                  >
                    Informational
                  </button>
                </div>

                <span className="text-muted text-xs font-semibold">
                  Showing {filteredSessions.length} of {sessions.length} Sessions
                </span>
              </div>
            </div>

            {/* Sessions & Incidents Table */}
            <div className="card">
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Learner</th>
                      <th>Assessment</th>
                      <th>Policy</th>
                      <th>Signal Events</th>
                      <th>Student Context</th>
                      <th>Review Outcome</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSessions.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                          No examination sessions match your filter criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredSessions.map((session) => {
                        const nonTimingEvents = session.events.filter((e) => e.category !== 'timing_event');
                        const latestEvent = session.events[session.events.length - 1];

                        return (
                          <tr key={session.id}>
                            <td className="text-muted text-xs" style={{ whiteSpace: 'nowrap' }}>
                              {new Date(session.startedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                            </td>
                            <td>
                              <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{session.learnerName}</div>
                              <div className="text-muted text-xs">{session.learnerId}</div>
                            </td>
                            <td>
                              <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{session.assessmentTitle}</div>
                              <div className="text-muted text-xs">{session.id}</div>
                            </td>
                            <td>
                              <span
                                className={`badge ${session.policy.level === 'strict'
                                  ? 'badge-failed'
                                  : session.policy.level === 'monitored'
                                    ? 'badge-primary'
                                    : 'badge-secondary'
                                  }`}
                                style={{ textTransform: 'uppercase', fontSize: '0.65rem' }}
                              >
                                {session.policy.level}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                {nonTimingEvents.length === 0 ? (
                                  <span className="badge badge-active" style={{ fontSize: '0.72rem' }}>
                                    0 Events (Clean)
                                  </span>
                                ) : (
                                  nonTimingEvents.map((evt) => (
                                    <span
                                      key={evt.id}
                                      className={`badge ${evt.severity === 'critical'
                                        ? 'badge-failed'
                                        : evt.severity === 'warning'
                                          ? 'badge-warning'
                                          : 'badge-secondary'
                                        }`}
                                      style={{ fontSize: '0.68rem' }}
                                      title={evt.description}
                                    >
                                      {evt.category.replace(/_/g, ' ')}
                                    </span>
                                  ))
                                )}
                              </div>
                            </td>
                            <td>
                              {session.studentAppeal ? (
                                <span className="badge badge-primary" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <FileText size={11} /> Appeal Registered
                                </span>
                              ) : session.events.some((e) => e.studentExplanation) ? (
                                <span className="badge badge-active" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <Check size={11} /> Note Attached
                                </span>
                              ) : (
                                <span className="text-muted text-xs">None provided</span>
                              )}
                            </td>
                            <td>{getOutcomeBadge(session.reviewDecision?.outcome)}</td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <button
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => handleOpenInspection(session)}
                                  style={{ gap: '5px', fontSize: '0.75rem', padding: '4px 8px' }}
                                >
                                  <Eye size={13} color="#3B82F6" />
                                  Inspect
                                </button>
                                 <a
                                  href={`https://meet.google.com/${(session.jitsiRoomName || generateJitsiRoomName(session.assessmentId, session.learnerName)).toLowerCase()}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn btn-primary btn-sm"
                                  style={{
                                    gap: '5px',
                                    fontSize: '0.75rem',
                                    padding: '4px 8px',
                                    background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
                                    border: 'none',
                                  }}
                                  title="Join candidate's live Google Meet video proctoring session"
                                >
                                  <GoogleMeetIcon size={13} />
                                  <span>Meet</span>
                                </a>
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
        )
      }

      {/* Tab 2: Policy Management */}
      {
        activeTab === 'policy' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="card" style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '8px', fontWeight: 800 }}>
                Assessment Monitoring Policy Matrix
              </h2>
              <p className="text-secondary text-sm" style={{ marginBottom: '20px' }}>
                Configure institutional proctoring thresholds. Requirements declared here are automatically disclosed to students before starting an examination.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                {(['basic', 'monitored', 'strict'] as ProctoringPolicyLevel[]).map((level) => {
                  const pol = policies[level];

                  return (
                    <div
                      key={level}
                      style={{
                        background: 'var(--bg-input)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-lg)',
                        padding: '20px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                          <span
                            className={`badge ${level === 'strict'
                              ? 'badge-failed'
                              : level === 'monitored'
                                ? 'badge-primary'
                                : 'badge-secondary'
                              }`}
                            style={{ textTransform: 'uppercase', fontSize: '0.72rem' }}
                          >
                            {pol.level} Level
                          </span>
                          <span className="text-muted text-xs">Retention: {pol.retentionDays} Days</span>
                        </div>

                        <h3 style={{ fontSize: '1.1rem', margin: '0 0 6px 0', fontWeight: 700 }}>{pol.name}</h3>
                        <p style={{ margin: '0 0 16px 0', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                          {pol.description}
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.78rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span className="text-muted">Screen Sharing:</span>
                            <span style={{ fontWeight: 600, color: pol.requireScreenShare ? 'var(--success)' : 'var(--text-muted)' }}>
                              {pol.requireScreenShare ? 'Required' : 'Disabled'}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span className="text-muted">Full-Screen Lock:</span>
                            <span style={{ fontWeight: 600, color: pol.requireFullscreen ? 'var(--success)' : 'var(--text-muted)' }}>
                              {pol.requireFullscreen ? 'Required' : 'Disabled'}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span className="text-muted">Microphone Audio:</span>
                            <span style={{ fontWeight: 600, color: pol.requireMicrophone ? 'var(--success)' : 'var(--text-muted)' }}>
                              {pol.requireMicrophone ? 'Required' : 'Disabled'}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span className="text-muted">Webcam Video Feed:</span>
                            <span style={{ fontWeight: 600, color: pol.requireWebcam ? 'var(--success)' : 'var(--text-muted)' }}>
                              {pol.requireWebcam ? 'Required' : 'Disabled'}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span className="text-muted">Pause on Screen Loss:</span>
                            <span style={{ fontWeight: 600, color: pol.pauseOnScreenShareLoss ? 'var(--warning)' : 'var(--text-muted)' }}>
                              {pol.pauseOnScreenShareLoss ? 'Yes (Smart Pause)' : 'No'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div style={{ marginTop: '20px', paddingTop: '14px', borderTop: '1px solid var(--border-subtle)' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ width: '100%', justifyContent: 'center' }}
                          onClick={() => {
                            const newDays = pol.retentionDays === 30 ? 60 : 30;
                            updatePolicy(level, { retentionDays: newDays });
                          }}
                        >
                          Toggle Retention Window ({pol.retentionDays}d)
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )
      }

      {/* Tab 3: Learner Appeals Docket */}
      {
        activeTab === 'appeals' && (
          <div className="card" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '8px', fontWeight: 800 }}>
              Learner Proctoring Appeals & Explanations Docket
            </h2>
            <p className="text-secondary text-sm" style={{ marginBottom: '20px' }}>
              Direct access to student explanations and mitigating context regarding recorded assessment interruptions.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {sessions
                .filter((s) => s.studentAppeal || s.events.some((e) => e.studentExplanation))
                .map((sess) => {
                  const appeal = sess.studentAppeal;

                  return (
                    <div
                      key={sess.id}
                      style={{
                        background: 'var(--bg-input)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        padding: '18px 20px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                        <div>
                          <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>{sess.learnerName}</strong>
                          <span className="text-muted text-xs" style={{ marginLeft: '8px' }}>
                            Assessment: <strong>{sess.assessmentTitle}</strong> ({new Date(sess.startedAt).toLocaleDateString()})
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className={`badge ${appeal?.status === 'reviewed' ? 'badge-active' : 'badge-warning'}`}>
                            {appeal?.status === 'reviewed' ? 'Reviewed by Grader' : 'Pending Review'}
                          </span>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleOpenInspection(sess)}
                            style={{ fontSize: '0.75rem' }}
                          >
                            Review & Decide &rarr;
                          </button>
                        </div>
                      </div>

                      {appeal && (
                        <div
                          style={{
                            background: 'rgba(37, 99, 235, 0.08)',
                            border: '1px solid rgba(59, 130, 246, 0.25)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '10px 14px',
                            fontSize: '0.84rem',
                            color: 'var(--text-main)',
                          }}
                        >
                          <strong style={{ color: '#3B82F6' }}>Student Appeal Statement: </strong>
                          "{appeal.explanation}"
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        )
      }

      {/* Deep Evidence Inspection Modal */}
      {
        selectedSession && (
          <div className="modal-overlay" onClick={() => setSelectedSession(null)}>
            <div
              className="modal-card"
              style={{ maxWidth: '880px', width: '95%', maxHeight: '92vh', overflowY: 'auto' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="modal-header">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 800 }}>
                      Evidence Moderation: {selectedSession.assessmentTitle}
                    </h3>
                    <span className="badge badge-secondary" style={{ fontSize: '0.7rem' }}>
                      {selectedSession.id}
                    </span>
                  </div>
                  <p className="text-muted text-xs" style={{ marginTop: '2px' }}>
                    Student: <strong>{selectedSession.learnerName}</strong> ({selectedSession.learnerId}) &bull; Policy:{' '}
                    {selectedSession.policy.name}
                  </p>
                </div>
                <button onClick={() => setSelectedSession(null)} style={{ color: 'var(--text-muted)' }}>
                  <X size={20} />
                </button>
              </div>

              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Live Jitsi Video Proctoring Room for Faculty */}
                <div
                  style={{
                    background: 'linear-gradient(135deg, rgba(84, 71, 255, 0.12) 0%, rgba(236, 72, 153, 0.12) 100%)',
                    border: '1px solid rgba(84, 71, 255, 0.35)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '8px',
                        background: 'linear-gradient(135deg, #5447FF 0%, #EC4899 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#FFFFFF',
                      }}
                    >
                      <Video size={16} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.86rem', color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <GoogleMeetIcon size={15} />
                        Google Meet Live Video Proctoring Bridge
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#818CF8' }}>
                        Google Meet Room:{' '}
                        <strong style={{ color: '#34D399', fontFamily: 'monospace' }}>
                          {(selectedSession.jitsiRoomName || generateJitsiRoomName(selectedSession.assessmentId, selectedSession.learnerName)).toLowerCase()}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <a
                    href={`https://meet.google.com/${(selectedSession.jitsiRoomName || generateJitsiRoomName(selectedSession.assessmentId, selectedSession.learnerName)).toLowerCase()}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary btn-sm"
                    style={{
                      background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
                      border: 'none',
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      padding: '6px 14px',
                      gap: '6px',
                    }}
                  >
                    <ExternalLink size={13} />
                    <span>Open Google Meet Session &rarr;</span>
                  </a>
                </div>

                {/* Media Recording Player Simulation */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Video size={16} color="#EC4899" />
                      Session Screen Recording Playback
                      {selectedSession.isSimulatedRecording && (
                        <span className="badge badge-secondary" style={{ fontSize: '0.65rem' }}>
                          Simulated Archive
                        </span>
                      )}
                    </div>

                    <span className="text-muted text-xs">
                      Recorded Duration: {Math.round((selectedSession.recordingDuration || selectedSession.totalDurationSeconds || 2400) / 60)} Mins
                    </span>
                  </div>

                  <div
                    style={{
                      height: '240px',
                      borderRadius: 'var(--radius-md)',
                      background: '#040711',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    <Monitor size={48} color="#2563EB" style={{ opacity: 0.6, marginBottom: '12px' }} />
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>
                      Secure Exam Screen Telemetry Stream
                    </div>
                    <div className="text-muted text-xs" style={{ marginTop: '4px' }}>
                      Timestamp Bookmark: {activeVideoTime}s into exam
                    </div>

                    {/* Play / Pause overlay button */}
                    <button
                      onClick={() => setIsVideoPlaying(!isVideoPlaying)}
                      style={{
                        position: 'absolute',
                        bottom: '16px',
                        left: '16px',
                        background: 'rgba(37, 99, 235, 0.85)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '6px 14px',
                        fontSize: '0.78rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      {isVideoPlaying ? <Pause size={14} /> : <Play size={14} />}
                      {isVideoPlaying ? 'Pause Playback' : 'Play Capture Stream'}
                    </button>
                  </div>
                </div>

                {/* Event Timeline with Jump-to-Timestamp */}
                <div>
                  <h4 style={{ fontSize: '0.95rem', marginBottom: '12px', fontWeight: 700 }}>
                    Recorded Event Telemetry ({selectedSession.events.length} Items)
                  </h4>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {selectedSession.events.map((evt) => (
                      <div
                        key={evt.id}
                        style={{
                          background: 'var(--bg-input)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-md)',
                          padding: '12px 16px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: '0.7rem', padding: '2px 8px', fontFamily: 'monospace' }}
                              onClick={() => setActiveVideoTime(evt.relativeSeconds)}
                            >
                              <Play size={10} /> +{evt.relativeSeconds}s
                            </button>
                            <strong style={{ fontSize: '0.88rem', color: 'var(--text-main)' }}>{evt.title}</strong>
                            <span
                              className={`badge ${evt.severity === 'critical'
                                ? 'badge-failed'
                                : evt.severity === 'warning'
                                  ? 'badge-warning'
                                  : 'badge-secondary'
                                }`}
                              style={{ fontSize: '0.65rem' }}
                            >
                              {evt.severity}
                            </span>
                          </div>

                          <div className="text-muted text-xs">
                            {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </div>
                        </div>

                        <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                          {evt.description}
                        </p>

                        {evt.studentExplanation && (
                          <div
                            style={{
                              background: 'rgba(84, 71, 255, 0.08)',
                              border: '1px solid rgba(84, 71, 255, 0.25)',
                              padding: '8px 12px',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: '0.78rem',
                              marginTop: '4px',
                            }}
                          >
                            <strong style={{ color: '#818CF8' }}>Student Context Note: </strong>
                            "{evt.studentExplanation}"
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Student Appeal if submitted */}
                {selectedSession.studentAppeal && (
                  <div
                    style={{
                      background: 'rgba(37, 99, 235, 0.08)',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      borderRadius: 'var(--radius-md)',
                      padding: '14px 18px',
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#3B82F6', marginBottom: '4px' }}>
                      Student Formal Appeal & Explanation
                    </div>
                    <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-main)', lineHeight: 1.5 }}>
                      "{selectedSession.studentAppeal.explanation}"
                    </p>
                  </div>
                )}

                {/* Instructor Decision Form */}
                <form onSubmit={handleSaveDecision} style={{ marginTop: '10px' }}>
                  <h4 style={{ fontSize: '1rem', marginBottom: '8px', fontWeight: 800 }}>
                    Instructor Review Decision & Verdict
                  </h4>
                  <p className="text-secondary text-xs" style={{ marginBottom: '14px' }}>
                    Decisions must be based strictly on available evidence and institutional policy.
                  </p>

                  {formError && (
                    <div
                      style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                        borderRadius: 'var(--radius-md)',
                        padding: '10px 14px',
                        color: 'var(--danger)',
                        fontSize: '0.82rem',
                        marginBottom: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <AlertCircle size={16} />
                      <span>{formError}</span>
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px', marginBottom: '16px' }}>
                    {[
                      {
                        id: 'no_violation',
                        label: 'No Violation Established',
                        desc: 'Benign telemetry signal, external alert, or accidental OS notification with immediate recovery.',
                      },
                      {
                        id: 'technical_incident_accepted',
                        label: 'Technical Incident Accepted',
                        desc: 'Legitimate ISP network disconnection, power reboot, or hardware drop accepted with fair consideration.',
                      },
                      {
                        id: 'warning_issued',
                        label: 'Advisory Warning Issued',
                        desc: 'Minor non-compliance noted. Formative guidance issued to student without academic grade penalty.',
                      },
                      {
                        id: 'further_review',
                        label: 'Escalate for Academic Integrity Board Review',
                        desc: 'Signal pattern requires formal secondary review by institutional department committee.',
                      },
                      {
                        id: 'violation_confirmed',
                        label: 'Exam Policy Violation Confirmed',
                        desc: 'Clear, substantiated unauthorized assistance or intentional circumventing of monitoring.',
                      },
                    ].map((opt) => (
                      <label
                        key={opt.id}
                        onClick={() => setSelectedOutcome(opt.id as any)}
                        style={{
                          padding: '12px 16px',
                          borderRadius: 'var(--radius-md)',
                          background: selectedOutcome === opt.id ? 'rgba(37, 99, 235, 0.12)' : 'var(--bg-input)',
                          border: selectedOutcome === opt.id ? '2px solid #2563EB' : '1px solid var(--border-subtle)',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '12px',
                          cursor: 'pointer',
                        }}
                      >
                        <input
                          type="radio"
                          name="outcome"
                          checked={selectedOutcome === opt.id}
                          onChange={() => { }}
                          style={{ accentColor: '#2563EB', marginTop: '2px' }}
                        />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main)' }}>
                            {opt.label}
                          </div>
                          <div className="text-muted text-xs" style={{ marginTop: '2px' }}>
                            {opt.desc}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px' }}>
                      Instructor Explanatory Notes & Feedback:
                    </label>
                    <textarea
                      value={instructorNotes}
                      onChange={(e) => setInstructorNotes(e.target.value)}
                      placeholder="Provide specific notes and justification for your decision..."
                      rows={3}
                      style={{
                        width: '100%',
                        padding: '12px',
                        background: 'var(--bg-input)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--text-main)',
                        fontSize: '0.85rem',
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setSelectedSession(null)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" style={{ fontWeight: 700 }}>
                      Record Official Decision
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
};
