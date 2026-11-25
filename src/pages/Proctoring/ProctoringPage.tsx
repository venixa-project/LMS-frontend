import React, { useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuthStore } from '../../lib/store';

import { ProctoringIncident, ProctoringEvent } from '../../types';
import {
  useProctoringStore,
  ProctoringSession,
  ProctoringPolicyLevel,
} from '../../lib/proctoringStore';
import { JitsiProctorDashboard } from './components/JitsiProctorDashboard';
import {
  Shield, Eye, AlertTriangle, CheckCircle2, Clock, X,
  Filter, UserCheck, ShieldAlert, FileText, Camera, Video, Monitor, Lock,
  Search, Check, ExternalLink, Pause, Play, AlertCircle, RefreshCw
} from 'lucide-react';
import { generateJitsiRoomName } from '../../lib/jitsiProctoring';
import { GoogleMeetIcon } from '../../components/GoogleMeet';
import { proctoringSuites, PROCTORING_MODEL_SUITES, ProctoringSuiteType } from '../../lib/proctoringSuites';

export const ProctoringPage: React.FC = () => {
  const { user } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as 'live_monitor' | 'queue' | 'policy' | 'appeals' | null;
  const assessmentIdParam = searchParams.get('assessmentId');

  const {
    sessions,
    participants,
    policies,
    submitInstructorDecision,
    updatePolicy,
    dashboardStats,
    isLoadingStats,
    isLoadingQueue,
    queueTotal,
    appeals,
    isLoadingAppeals,
    isSavingDecision,
    fetchStatistics,
    fetchQueueSessions,
    fetchPolicies,
    fetchAppeals,
    reviewAppeal,
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
  const [activeVideoSource, setActiveVideoSource] = useState<string | null>(null);
  const [activeVideoTitle, setActiveVideoTitle] = useState<string>('Exam Video Telemetry');
  const videoPlayerRef = React.useRef<HTMLVideoElement | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [assessmentFilter, setAssessmentFilter] = useState<string>(
    assessmentIdParam || 'all'
  );
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // AI Proctoring Model Suites (Recommended vs Alternative)
  const [selectedSuite, setSelectedSuite] = useState<ProctoringSuiteType>(proctoringSuites.getActiveSuite());
  const [suiteTestStatus, setSuiteTestStatus] = useState<string | null>(null);
  const [isTestingSuite, setIsTestingSuite] = useState<boolean>(false);

  const handleTestEndpoint = async (suite: ProctoringSuiteType) => {
    setIsTestingSuite(true);
    setSuiteTestStatus(`Testing /api/v1/proctoring/analyze/${suite}...`);
    try {
      const res = suite === 'recommended' 
        ? await proctoringSuites.analyzeRecommended({ sessionId: 'health-check', timestamp: Date.now() })
        : await proctoringSuites.analyzeAlternative({ sessionId: 'health-check', timestamp: Date.now() });
      setSuiteTestStatus(`Success! Engine: ${res.runtime} (${res.pipeline}). Telemetry: ${res.telemetry?.faceCount ?? 0} faces, Violations: ${res.violations?.length ?? 0}`);
    } catch (err: any) {
      setSuiteTestStatus(`Endpoint test error: ${err.message || 'Failed'}`);
    } finally {
      setIsTestingSuite(false);
    }
  };

  React.useEffect(() => {
    if (tabParam && ['live_monitor', 'queue', 'policy', 'appeals'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  React.useEffect(() => {
    if (assessmentIdParam) {
      setAssessmentFilter(assessmentIdParam);
    }
  }, [assessmentIdParam]);

  React.useEffect(() => {
    fetchStatistics(assessmentFilter !== 'all' ? assessmentFilter : undefined);
    fetchPolicies();
    fetchAppeals(assessmentFilter !== 'all' ? assessmentFilter : undefined);
  }, [assessmentFilter]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      fetchQueueSessions({
        search: searchQuery.trim() || undefined,
        assessmentId: assessmentFilter !== 'all' ? assessmentFilter : undefined,
        severity: severityFilter !== 'all' ? severityFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
      });
    }, 150);
    return () => clearTimeout(timer);
  }, [activeTab, searchQuery, assessmentFilter, severityFilter, statusFilter, categoryFilter]);

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
    participants.forEach((p) => {
      if (p.assessmentId && !map.has(p.assessmentId)) {
        map.set(p.assessmentId, `Assessment (${p.assessmentId.slice(0, 8)}...)`);
      }
    });
    if (assessmentIdParam && !map.has(assessmentIdParam)) {
      map.set(assessmentIdParam, `Assessment (${assessmentIdParam.slice(0, 8)}...)`);
    }
    return Array.from(map.entries());
  }, [sessions, participants, assessmentIdParam]);

  // Filtered Sessions
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesLearner = (s.learnerName || '').toLowerCase().includes(q);
        const matchesTitle = (s.assessmentTitle || '').toLowerCase().includes(q);
        const matchesId = (s.id || '').toLowerCase().includes(q);
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
        const catLower = categoryFilter.toLowerCase();
        const hasCategory = s.events.some((e) => (e.category || '').toLowerCase().includes(catLower));
        if (!hasCategory) return false;
      }

      // Review Status
      if (statusFilter !== 'all') {
        if (statusFilter === 'pending') {
          if (s.status === 'reviewed' || s.reviewDecision?.outcome) return false;
        } else if (statusFilter === 'reviewed') {
          if (s.status !== 'reviewed' && !s.reviewDecision?.outcome) return false;
        } else if (statusFilter === 'appealed') {
          if (!s.studentAppeal) return false;
        }
      }

      return true;
    });
  }, [sessions, searchQuery, assessmentFilter, severityFilter, categoryFilter, statusFilter]);

  // Statistics from real PostgreSQL DB aggregation with reactive fallback
  const targetSessions = assessmentFilter !== 'all'
    ? sessions.filter((s) => s.assessmentId === assessmentFilter)
    : sessions;
  const assessmentParticipants = assessmentFilter !== 'all'
    ? participants.filter((p) => p.assessmentId === assessmentFilter)
    : participants;

  const localTotalSessions = Math.max(targetSessions.length, assessmentParticipants.length);
  const localSessionsWithEvents = targetSessions.filter((s) => s.events.some((e) => e.category !== 'timing_event')).length;
  const localPendingReviews = targetSessions.filter((s) => s.status !== 'reviewed' && s.events.some((e) => e.category !== 'timing_event')).length;
  const localClearedSessions = targetSessions.filter((s) => s.reviewDecision?.outcome === 'no_violation').length;
  const localAcceptedTechnical = targetSessions.filter((s) => s.reviewDecision?.outcome === 'technical_incident_accepted').length;
  const localPendingAppeals = targetSessions.filter((s) => s.studentAppeal && s.studentAppeal.status === 'pending').length;

  const totalSessions = (dashboardStats && dashboardStats.totalSessions > 0) ? dashboardStats.totalSessions : localTotalSessions;
  const sessionsWithEvents = (dashboardStats && dashboardStats.sessionsWithSignals > 0) ? dashboardStats.sessionsWithSignals : localSessionsWithEvents;
  const pendingReviews = (dashboardStats && dashboardStats.pendingReviews > 0) ? dashboardStats.pendingReviews : localPendingReviews;
  const clearedSessions = (dashboardStats && dashboardStats.clearedSessions > 0) ? dashboardStats.clearedSessions : localClearedSessions;
  const acceptedTechnical = (dashboardStats && dashboardStats.acceptedTechnical > 0) ? dashboardStats.acceptedTechnical : localAcceptedTechnical;
  const pendingAppeals = (dashboardStats && dashboardStats.pendingAppeals > 0) ? dashboardStats.pendingAppeals : (appeals.length > 0 ? appeals.filter((a: any) => a.appealStatus === 'pending').length : localPendingAppeals);

  const handleOpenInspection = (session: ProctoringSession) => {
    setSelectedSession(session);
    setSelectedOutcome(session.reviewDecision?.outcome || 'no_violation');
    setInstructorNotes(session.reviewDecision?.explanation || '');
    setFormError(null);
    setActiveVideoTime(0);
    setIsVideoPlaying(false);

    // Identify first available warning video (15s pre-warning incident proof) or recording
    const warningVideoEvent = session.events.find(
      (e) =>
        e.evidenceSnapshot &&
        (e.evidenceSnapshot.includes('.webm') ||
          e.evidenceSnapshot.includes('.mp4') ||
          e.evidenceSnapshot.includes('warning') ||
          e.category === 'warning_strike_video')
    );
    const videoUrl = warningVideoEvent?.evidenceSnapshot || session.recordingUrl || null;
    setActiveVideoSource(videoUrl);
    setActiveVideoTitle(warningVideoEvent ? `15s Pre-Warning Proof: ${warningVideoEvent.title}` : 'Exam Telemetry Stream');
  };

  const handleSaveDecision = async (e: React.FormEvent) => {
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

    await submitInstructorDecision(selectedSession.id, {
      reviewerId: user?.id || 'u-004',
      reviewerName: user?.displayName || (user ? `${user.firstName} ${user.lastName}`.trim() : 'Dr. James Wilson (Instructor)'),
      outcome: selectedOutcome,
      explanation: instructorNotes.trim() || 'Reviewed in accordance with institutional proctoring guidelines.',
    });

    setSelectedSession(null);
    fetchStatistics(assessmentFilter !== 'all' ? assessmentFilter : undefined);
    fetchQueueSessions({
      search: searchQuery.trim() || undefined,
      assessmentId: assessmentFilter !== 'all' ? assessmentFilter : undefined,
      severity: severityFilter !== 'all' ? severityFilter : undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      category: categoryFilter !== 'all' ? categoryFilter : undefined,
    });
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

  const getCategoryMeta = (category: string) => {
    const cat = category.toLowerCase();
    if (cat.includes('phone') || cat.includes('mobile')) {
      return { icon: '📱', label: 'Phone', priority: 1, severity: 'critical' as const };
    }
    if (cat.includes('mismatch')) {
      return { icon: '👤', label: 'Mismatch', priority: 2, severity: 'critical' as const };
    }
    if (cat.includes('multiple_face') || cat.includes('multi_face')) {
      return { icon: '👥', label: 'Multi-Face', priority: 3, severity: 'critical' as const };
    }
    if (cat.includes('not_detected') || cat.includes('absent') || cat.includes('absence')) {
      return { icon: '👁️', label: 'Absence', priority: 4, severity: 'warning' as const };
    }
    if (cat.includes('warning') || cat.includes('strike')) {
      return { icon: '🚨', label: 'Warning', priority: 5, severity: 'warning' as const };
    }
    if (cat.includes('tab') || cat.includes('screen') || cat.includes('fullscreen')) {
      return { icon: '🔄', label: 'Tab Switch', priority: 6, severity: 'warning' as const };
    }
    if (cat.includes('audio') || cat.includes('speech') || cat.includes('mic')) {
      return { icon: '🎙️', label: 'Audio', priority: 7, severity: 'warning' as const };
    }
    return {
      icon: '⚠️',
      label: category.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      priority: 10,
      severity: 'informational' as const,
    };
  };

  const renderCompactSignalEvents = (events: ProctoringEvent[]) => {
    const nonTiming = events.filter((e) => e.category !== 'timing_event');
    if (nonTiming.length === 0) {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '3px 9px',
            borderRadius: '12px',
            fontSize: '0.73rem',
            fontWeight: 600,
            background: 'rgba(34, 197, 94, 0.1)',
            color: '#22c55e',
            border: '1px solid rgba(34, 197, 94, 0.25)',
            whiteSpace: 'nowrap',
          }}
        >
          <CheckCircle2 size={12} /> Clean (0 signals)
        </span>
      );
    }

    // Group events by category
    const groups = new Map<string, { count: number; meta: ReturnType<typeof getCategoryMeta>; descriptions: string[]; maxSeverity: string }>();

    nonTiming.forEach((evt) => {
      const meta = getCategoryMeta(evt.category);
      const existing = groups.get(meta.label);
      const currentSeverity = evt.severity || meta.severity;
      if (existing) {
        existing.count += 1;
        existing.descriptions.push(evt.description || evt.title);
        if (currentSeverity === 'critical' || (currentSeverity === 'warning' && existing.maxSeverity !== 'critical')) {
          existing.maxSeverity = currentSeverity;
        }
      } else {
        groups.set(meta.label, {
          count: 1,
          meta,
          descriptions: [evt.description || evt.title],
          maxSeverity: currentSeverity,
        });
      }
    });

    const sorted = Array.from(groups.values()).sort((a, b) => a.meta.priority - b.meta.priority);
    const displayLimit = 2;
    const visible = sorted.slice(0, displayLimit);
    const remainingCount = sorted.slice(displayLimit).reduce((sum, g) => sum + g.count, 0);

    const fullSummary = nonTiming
      .map((e) => `• ${e.title || e.category.replace(/_/g, ' ')} (${e.severity || 'warning'})`)
      .join('\n');

    return (
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          flexWrap: 'wrap',
          maxWidth: '240px',
        }}
        title={fullSummary}
      >
        {visible.map((group, idx) => {
          const isCritical = group.maxSeverity === 'critical';
          const isWarning = group.maxSeverity === 'warning';

          return (
            <span
              key={idx}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '0.71rem',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                background: isCritical
                  ? 'rgba(239, 68, 68, 0.12)'
                  : isWarning
                    ? 'rgba(245, 158, 11, 0.12)'
                    : 'rgba(99, 102, 241, 0.12)',
                color: isCritical
                  ? '#ef4444'
                  : isWarning
                    ? '#f59e0b'
                    : '#818cf8',
                border: `1px solid ${
                  isCritical
                    ? 'rgba(239, 68, 68, 0.3)'
                    : isWarning
                      ? 'rgba(245, 158, 11, 0.3)'
                      : 'rgba(99, 102, 241, 0.25)'
                }`,
              }}
            >
              <span>{group.meta.icon}</span>
              <span>{group.meta.label}</span>
              {group.count > 1 && (
                <span
                  style={{
                    background: isCritical
                      ? 'rgba(239, 68, 68, 0.25)'
                      : isWarning
                        ? 'rgba(245, 158, 11, 0.25)'
                        : 'rgba(99, 102, 241, 0.25)',
                    padding: '1px 5px',
                    borderRadius: '10px',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                  }}
                >
                  {group.count}
                </span>
              )}
            </span>
          );
        })}

        {remainingCount > 0 && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '2px 6px',
              borderRadius: '12px',
              fontSize: '0.69rem',
              fontWeight: 700,
              background: 'var(--bg-input)',
              color: 'var(--text-muted)',
              border: '1px solid var(--border-subtle)',
              cursor: 'help',
              whiteSpace: 'nowrap',
            }}
            title={fullSummary}
          >
            +{remainingCount} more
          </span>
        )}
      </div>
    );
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
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '16px',
        }}
      >
        {[
          { label: 'Total Monitored Sessions', value: totalSessions, sub: 'Across all course cohorts', color: '#5447FF', bg: 'linear-gradient(145deg, rgba(84, 71, 255, 0.08) 0%, var(--bg-card) 65%)', border: 'rgba(84, 71, 255, 0.28)' },
          { label: 'Sessions with Signals', value: sessionsWithEvents, sub: 'Telemetry flagged for review', color: '#EC4899', bg: 'linear-gradient(145deg, rgba(236, 72, 153, 0.08) 0%, var(--bg-card) 65%)', border: 'rgba(236, 72, 153, 0.28)' },
          { label: 'Pending Faculty Review', value: pendingReviews, sub: 'Awaiting decision', color: '#F59E0B', bg: 'linear-gradient(145deg, rgba(245, 158, 11, 0.09) 0%, var(--bg-card) 65%)', border: 'rgba(245, 158, 11, 0.3)' },
          { label: 'Cleared (False Positives)', value: clearedSessions, sub: 'No violation established', color: '#10B981', bg: 'linear-gradient(145deg, rgba(16, 185, 129, 0.08) 0%, var(--bg-card) 65%)', border: 'rgba(16, 185, 129, 0.28)' },
          { label: 'Technical Disruptions Accepted', value: acceptedTechnical, sub: 'Hardware / ISP drops excused', color: '#2563EB', bg: 'linear-gradient(145deg, rgba(37, 99, 235, 0.08) 0%, var(--bg-card) 65%)', border: 'rgba(37, 99, 235, 0.28)' },
        ].map((card, idx) => (
          <div
            key={card.label}
            className="card kpi-card-animated"
            style={{
              padding: '16px 18px',
              background: card.bg,
              border: `1px solid ${card.border}`,
              borderTop: `3px solid ${card.color}`,
              borderRadius: '14px',
              animationDelay: `${idx * 60}ms`,
            }}
          >
            <div style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>{card.label}</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '6px', color: card.color }}>
              {card.value}
            </div>
            <div className="text-muted text-xs" style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: card.color, flexShrink: 0 }} />
              <span>{card.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tabs-nav" style={{ marginBottom: '24px' }}>
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
      </div>

      {/* Live Proctoring & Google Meet Monitor (Launched via "Monitor Live" button in Assessments) */}
      {activeTab === 'live_monitor' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--bg-surface)',
              padding: '12px 18px',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'rgba(99, 102, 241, 0.15)',
                  color: '#6366f1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Video size={17} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h4 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 800 }}>
                    Live Examination Proctoring Room
                  </h4>
                  <span
                    style={{
                      background: 'rgba(34, 197, 94, 0.15)',
                      color: '#22c55e',
                      border: '1px solid rgba(34, 197, 94, 0.3)',
                      fontSize: '0.65rem',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '12px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e' }} />
                    LIVE STREAMING
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Dedicated multi-candidate live proctoring stream launched from Assessments Monitor Live.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleTabChange('queue')}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <ShieldAlert size={14} /> Incident Review Queue
              </button>
              <Link to="/assessments" className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                Back to Assessments
              </Link>
            </div>
          </div>

          <JitsiProctorDashboard
            initialAssessmentId={assessmentIdParam || (assessmentFilter !== 'all' ? assessmentFilter : undefined)}
          />
        </div>
      )}

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

                <span className="text-muted text-xs font-semibold" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  {isLoadingQueue && (
                    <RefreshCw size={12} className="animate-spin text-primary" />
                  )}
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
                      <th style={{ minWidth: '180px', maxWidth: '240px' }}>Signal Events</th>
                      <th>Student Context</th>
                      <th>Review Outcome</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoadingQueue && filteredSessions.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
                            <div className="spinner-border spinner-border-sm" role="status" style={{ width: '1rem', height: '1rem', borderWidth: '2px' }} />
                            <span>Loading live & recorded proctoring sessions from database...</span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredSessions.length === 0 ? (
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
                              <div style={{ fontWeight: 700, color: 'var(--text-main)' }} title={session.learnerId}>
                                {session.learnerName}
                              </div>
                            </td>
                            <td>
                              <div style={{ fontWeight: 600, fontSize: '0.88rem' }} title={`Session ID: ${session.id}`}>
                                {session.assessmentTitle}
                              </div>
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
                            <td style={{ minWidth: '180px', maxWidth: '240px' }}>
                              {renderCompactSignalEvents(session.events)}
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

            {/* AI Proctoring Architecture & Dual Model Suite Console */}
            <div className="card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h2 style={{ fontSize: '1.25rem', margin: '0 0 4px 0', fontWeight: 800 }}>
                    AI Proctoring Architecture: Dual Model Suites (Primary + Standby Failover)
                  </h2>
                  <p className="text-secondary text-sm" style={{ margin: 0 }}>
                    Enterprise proctoring computer vision matrix. <strong>Recommended Suite</strong> is the primary active engine; <strong>Alternative Suite</strong> is maintained on standby for instantaneous auto-failover if needed.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className={`btn btn-sm ${selectedSuite === 'recommended' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => {
                      proctoringSuites.restorePrimarySuite();
                      setSelectedSuite('recommended');
                    }}
                  >
                    Recommended (Primary Active)
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${selectedSuite === 'alternative' ? 'btn-warning' : 'btn-secondary'}`}
                    onClick={() => {
                      proctoringSuites.triggerManualFailover('Faculty proctor manual failover switch');
                      setSelectedSuite('alternative');
                    }}
                  >
                    Alternative (Standby Failover)
                  </button>
                </div>
              </div>

              {/* Operational Strategy Indicator */}
              <div
                style={{
                  background: selectedSuite === 'recommended' ? 'rgba(37, 99, 235, 0.08)' : 'rgba(217, 119, 6, 0.08)',
                  border: `1px solid ${selectedSuite === 'recommended' ? 'rgba(37, 99, 235, 0.25)' : 'rgba(217, 119, 6, 0.25)'}`,
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 14px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.82rem',
                }}
              >
                <div>
                  <strong>Active State: </strong>
                  {selectedSuite === 'recommended' ? (
                    <span style={{ color: 'var(--primary)', fontWeight: 700 }}>
                      Primary Recommended Suite Active (YuNet + AdaFace + ByteTrack + YOLO + ONNX Runtime)
                    </span>
                  ) : (
                    <span style={{ color: '#d97706', fontWeight: 700 }}>
                      Standby Alternative Suite Engaged (SCRFD + ArcFace + SORT + RT-DETR + OpenVINO)
                    </span>
                  )}
                  <div className="text-secondary text-xs" style={{ marginTop: '2px' }}>
                    {selectedSuite === 'recommended'
                      ? 'Alternative Model Suite is kept aside on standby and will auto-engage if Recommended fails.'
                      : 'Proctoring is currently routed through the Alternative Suite.'}
                  </div>
                </div>
                {selectedSuite === 'alternative' && (
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={() => {
                      proctoringSuites.restorePrimarySuite();
                      setSelectedSuite('recommended');
                    }}
                  >
                    Restore Primary Suite
                  </button>
                )}
              </div>

              {/* Suite Component Comparison Grid */}
              <div style={{ overflowX: 'auto', marginBottom: '20px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border-subtle)', background: 'var(--bg-input)' }}>
                      <th style={{ textAlign: 'left', padding: '10px 14px' }}>Component</th>
                      <th style={{ textAlign: 'left', padding: '10px 14px', color: selectedSuite === 'recommended' ? 'var(--primary)' : 'var(--text-secondary)' }}>
                        Recommended model {selectedSuite === 'recommended' ? '(Primary Active)' : '(Primary)'}
                      </th>
                      <th style={{ textAlign: 'left', padding: '10px 14px', color: selectedSuite === 'alternative' ? '#d97706' : 'var(--text-secondary)' }}>
                        Alternative {selectedSuite === 'alternative' ? '(Standby Engaged)' : '(Standby Aside)'}
                      </th>
                      <th style={{ textAlign: 'left', padding: '10px 14px' }}>API Endpoint</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 600 }}>Face detection</td>
                      <td style={{ padding: '10px 14px', fontWeight: selectedSuite === 'recommended' ? 700 : 400 }}>YuNet</td>
                      <td style={{ padding: '10px 14px', fontWeight: selectedSuite === 'alternative' ? 700 : 400 }}>SCRFD</td>
                      <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-muted)' }}>POST /proctoring/analyze/:suite</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 600 }}>Face recognition</td>
                      <td style={{ padding: '10px 14px', fontWeight: selectedSuite === 'recommended' ? 700 : 400 }}>AdaFace</td>
                      <td style={{ padding: '10px 14px', fontWeight: selectedSuite === 'alternative' ? 700 : 400 }}>ArcFace</td>
                      <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-muted)' }}>POST /proctoring/analyze/:suite</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 600 }}>Face alignment</td>
                      <td style={{ padding: '10px 14px', fontWeight: selectedSuite === 'recommended' ? 700 : 400 }}>5-point landmarks</td>
                      <td style={{ padding: '10px 14px', fontWeight: selectedSuite === 'alternative' ? 700 : 400 }}>RetinaFace landmarks</td>
                      <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-muted)' }}>112x112 similarity transform</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 600 }}>Face tracking</td>
                      <td style={{ padding: '10px 14px', fontWeight: selectedSuite === 'recommended' ? 700 : 400 }}>ByteTrack</td>
                      <td style={{ padding: '10px 14px', fontWeight: selectedSuite === 'alternative' ? 700 : 400 }}>SORT</td>
                      <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Two-stage vs Kalman-Hungarian</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 600 }}>Face liveness</td>
                      <td style={{ padding: '10px 14px', fontWeight: selectedSuite === 'recommended' ? 700 : 400 }}>MiniFASNet</td>
                      <td style={{ padding: '10px 14px', fontWeight: selectedSuite === 'alternative' ? 700 : 400 }}>Other validated anti-spoof model</td>
                      <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Micro-texture & Fourier PAD</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 600 }}>Head pose</td>
                      <td style={{ padding: '10px 14px', fontWeight: selectedSuite === 'recommended' ? 700 : 400 }}>MediaPipe Face Landmarker</td>
                      <td style={{ padding: '10px 14px', fontWeight: selectedSuite === 'alternative' ? 700 : 400 }}>6DRepNet</td>
                      <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Yaw/Pitch/Roll 3D vs 6D Rotation</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 600 }}>Object detection</td>
                      <td style={{ padding: '10px 14px', fontWeight: selectedSuite === 'recommended' ? 700 : 400 }}>YOLO</td>
                      <td style={{ padding: '10px 14px', fontWeight: selectedSuite === 'alternative' ? 700 : 400 }}>RT-DETR</td>
                      <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Mobile phones, books, tablets</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '10px 14px', fontWeight: 600 }}>Inference engine</td>
                      <td style={{ padding: '10px 14px', fontWeight: selectedSuite === 'recommended' ? 700 : 400 }}>ONNX Runtime</td>
                      <td style={{ padding: '10px 14px', fontWeight: selectedSuite === 'alternative' ? 700 : 400 }}>OpenVINO</td>
                      <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Execution provider abstraction</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Endpoint Live Test Bar */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={isTestingSuite}
                    onClick={() => handleTestEndpoint('recommended')}
                  >
                    Test Recommended API (YuNet+AdaFace+YOLO)
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={isTestingSuite}
                    onClick={() => handleTestEndpoint('alternative')}
                  >
                    Test Alternative API (SCRFD+ArcFace+RT-DETR)
                  </button>
                </div>
                {suiteTestStatus && (
                  <span style={{ fontSize: '0.8rem', color: suiteTestStatus.includes('error') || suiteTestStatus.includes('Failed') ? 'var(--danger)' : 'var(--success)' }}>
                    {suiteTestStatus}
                  </span>
                )}
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
              {isLoadingAppeals ? (
                <div style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
                    <div className="spinner-border spinner-border-sm" role="status" style={{ width: '1rem', height: '1rem', borderWidth: '2px' }} />
                    <span>Loading student appeals from database...</span>
                  </div>
                </div>
              ) : sessions.filter((s) => s.studentAppeal || s.events.some((e) => e.studentExplanation)).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                  No learner appeals or explanations currently pending review.
                </div>
              ) : (
                sessions
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
                  })
              )}
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
                  <p className="text-muted text-xs" style={{ marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span>
                      Student: <strong>{selectedSession.learnerName}</strong> ({selectedSession.learnerId}) &bull; Policy:{' '}
                      {selectedSession.policy.name}
                    </span>
                    {selectedSession.events.some(e => e.category === 'mobile_phone_detected' || e.title.includes('Mobile')) ? (
                      <span className="badge badge-failed" style={{ fontSize: '0.65rem', padding: '2px 7px' }}>
                        📱 Mobile Phone Incident Detected
                      </span>
                    ) : (
                      <span className="badge badge-active" style={{ fontSize: '0.65rem', padding: '2px 7px' }}>
                        ✓ Clean Device Scan
                      </span>
                    )}
                    {selectedSession.events.some(e => e.category === 'face_mismatch' || e.title.includes('Mismatch')) ? (
                      <span className="badge badge-failed" style={{ fontSize: '0.65rem', padding: '2px 7px' }}>
                        👤 ArcFace Identity Mismatch
                      </span>
                    ) : selectedSession.events.some(e => e.category === 'multiple_faces_detected' || e.title.includes('Multiple Faces')) ? (
                      <span className="badge badge-failed" style={{ fontSize: '0.65rem', padding: '2px 7px' }}>
                        👥 Multiple Faces Detected
                      </span>
                    ) : selectedSession.events.some(e => e.category === 'face_not_detected' || e.title.includes('Absent')) ? (
                      <span className="badge badge-warning" style={{ fontSize: '0.65rem', padding: '2px 7px' }}>
                        ⚠️ Face Absent (&gt;5s)
                      </span>
                    ) : (
                      <span className="badge badge-active" style={{ fontSize: '0.65rem', padding: '2px 7px' }}>
                        👤 ArcFace Verified
                      </span>
                    )}
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

                {/* Media Recording & 15-Second Pre-Warning Video Player */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Video size={16} color="#EC4899" />
                      <span>{activeVideoTitle || 'Session Telemetry Video Playback'}</span>
                      {selectedSession.isSimulatedRecording && (
                        <span className="badge badge-secondary" style={{ fontSize: '0.65rem' }}>
                          Simulated Archive
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="text-muted text-xs">
                        Recorded Duration: {Math.round((selectedSession.recordingDuration || selectedSession.totalDurationSeconds || 2400) / 60)} Mins
                      </span>
                    </div>
                  </div>

                  {/* 15-Second Pre-Warning Incident Quick Selector Bar */}
                  {selectedSession.events.some(
                    (e) =>
                      e.evidenceSnapshot &&
                      (e.evidenceSnapshot.includes('.webm') ||
                        e.evidenceSnapshot.includes('.mp4') ||
                        e.evidenceSnapshot.includes('warning') ||
                        e.category === 'warning_strike_video')
                  ) && (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
                      {selectedSession.events
                        .filter(
                          (e) =>
                            e.evidenceSnapshot &&
                            (e.evidenceSnapshot.includes('.webm') ||
                              e.evidenceSnapshot.includes('.mp4') ||
                              e.evidenceSnapshot.includes('warning') ||
                              e.category === 'warning_strike_video')
                        )
                        .map((vEvt, idx) => {
                          const isActive = activeVideoSource === vEvt.evidenceSnapshot;
                          return (
                            <button
                              key={vEvt.id || idx}
                              type="button"
                              className={`btn btn-sm ${isActive ? 'btn-primary' : 'btn-secondary'}`}
                              style={{ fontSize: '0.72rem', padding: '3px 10px', display: 'flex', alignItems: 'center', gap: '5px' }}
                              onClick={() => {
                                setActiveVideoSource(vEvt.evidenceSnapshot!);
                                setActiveVideoTitle(`15s Pre-Warning Proof: ${vEvt.title}`);
                                setIsVideoPlaying(true);
                              }}
                            >
                              <Video size={12} color={isActive ? '#fff' : '#EC4899'} />
                              <span>{vEvt.title.replace(/of 3:/g, '')} (15s Pre-Roll)</span>
                            </button>
                          );
                        })}
                      {selectedSession.recordingUrl && (
                        <button
                          type="button"
                          className={`btn btn-sm ${activeVideoSource === selectedSession.recordingUrl ? 'btn-primary' : 'btn-secondary'}`}
                          style={{ fontSize: '0.72rem', padding: '3px 10px' }}
                          onClick={() => {
                            setActiveVideoSource(selectedSession.recordingUrl!);
                            setActiveVideoTitle('Full Session Screen Recording');
                            setIsVideoPlaying(true);
                          }}
                        >
                          Full Exam Stream
                        </button>
                      )}
                    </div>
                  )}

                  <div
                    style={{
                      height: '280px',
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
                    {activeVideoSource ? (
                      <video
                        ref={videoPlayerRef}
                        key={activeVideoSource}
                        src={activeVideoSource}
                        controls
                        autoPlay={isVideoPlaying}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                          background: '#000',
                        }}
                      />
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
                        <Monitor size={48} color="#2563EB" style={{ opacity: 0.6, marginBottom: '12px' }} />
                        <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#fff' }}>
                          Candidate Proctored Video Telemetry
                        </div>
                        <p style={{ margin: '6px 0 0 0', fontSize: '0.78rem', color: 'var(--text-muted)', maxWidth: '420px', lineHeight: 1.5 }}>
                          When a candidate incurs a proctoring violation warning, the 15 seconds of webcam video prior to the event are automatically recorded and playable here.
                        </p>
                        <div className="text-muted text-xs" style={{ marginTop: '8px' }}>
                          Timestamp Bookmark: {activeVideoTime}s into exam
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Event Timeline with Jump-to-Timestamp */}
                <div>
                  <h4 style={{ fontSize: '0.95rem', marginBottom: '12px', fontWeight: 700 }}>
                    Recorded Event Telemetry ({selectedSession.events.length} Items)
                  </h4>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {selectedSession.events.map((evt) => {
                      const isVideoEvidence =
                        evt.evidenceSnapshot &&
                        (evt.evidenceSnapshot.includes('.webm') ||
                          evt.evidenceSnapshot.includes('.mp4') ||
                          evt.evidenceSnapshot.includes('warning-video') ||
                          evt.evidenceSnapshot.startsWith('data:video/') ||
                          evt.category === 'warning_strike_video');

                      const isAudioEvidence =
                        evt.evidenceSnapshot &&
                        (evt.evidenceSnapshot.includes('.mp3') ||
                          evt.evidenceSnapshot.includes('.wav') ||
                          evt.evidenceSnapshot.includes('audio-incident') ||
                          evt.evidenceSnapshot.startsWith('data:audio/'));

                      return (
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

                          {/* 15-Second Pre-Warning Video Evidence Player */}
                          {evt.evidenceSnapshot && isVideoEvidence && (
                            <div style={{ marginTop: '10px', padding: '12px', background: 'rgba(0, 0, 0, 0.45)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239, 68, 68, 0.35)' }}>
                              <div style={{ fontSize: '0.78rem', color: '#F87171', marginBottom: '8px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <Video size={14} color="#EF4444" />
                                  15-Second Pre-Warning Incident Video Clip (15s pre-roll leading to violation)
                                </span>
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm"
                                  style={{ fontSize: '0.7rem', padding: '2px 8px' }}
                                  onClick={() => {
                                    setActiveVideoSource(evt.evidenceSnapshot!);
                                    setActiveVideoTitle(`15s Pre-Warning Proof: ${evt.title}`);
                                    setIsVideoPlaying(true);
                                  }}
                                >
                                  <Play size={10} /> Play in Main Screen
                                </button>
                              </div>
                              <video
                                src={evt.evidenceSnapshot}
                                controls
                                preload="metadata"
                                style={{
                                  width: '100%',
                                  maxHeight: '260px',
                                  borderRadius: '6px',
                                  background: '#000',
                                  display: 'block',
                                }}
                              />
                            </div>
                          )}

                          {/* Audio Evidence Player */}
                          {evt.evidenceSnapshot && isAudioEvidence && (
                            <div style={{ marginTop: '8px', padding: '10px', background: 'rgba(0, 0, 0, 0.25)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                              <div style={{ fontSize: '0.74rem', color: '#93C5FD', marginBottom: '6px', fontWeight: 600 }}>
                                Sustained Audio Speech Incident Evidence:
                              </div>
                              <audio src={evt.evidenceSnapshot} controls style={{ width: '100%' }} />
                            </div>
                          )}

                          {/* Static Snapshot Evidence */}
                          {evt.evidenceSnapshot && !isVideoEvidence && !isAudioEvidence && (
                            <div style={{ marginTop: '8px', padding: '8px', background: 'rgba(0, 0, 0, 0.25)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                              <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginBottom: '6px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <Camera size={13} color="#F59E0B" />
                                Captured AI Video Frame & Evidence Snapshot:
                              </div>
                              <img
                                src={evt.evidenceSnapshot}
                                alt="Proctoring Incident Snapshot"
                                style={{
                                  maxWidth: '340px',
                                  maxHeight: '200px',
                                  borderRadius: '4px',
                                  border: '1px solid rgba(255, 255, 255, 0.1)',
                                  display: 'block',
                                  objectFit: 'contain',
                                  background: '#000',
                                }}
                              />
                            </div>
                          )}

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
                      );
                    })}
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
                        label: 'No Violation Established / Dismiss False Detection',
                        desc: 'Benign telemetry signal, external alert, false positive detection, or accidental movement with immediate recovery.',
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
                        label: 'Mark for Investigation / Escalated for Review',
                        desc: 'Flagged for formal department or academic integrity review board audit.',
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
