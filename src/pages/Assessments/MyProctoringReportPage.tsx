import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuthStore } from '../../lib/store';
import { useProctoringStore } from '../../lib/proctoringStore';
import { ProctoringEvent, ProctoringSeverity, ProctoringSession } from '../../types';
import {
  Shield, Clock, Calendar, CheckCircle2, AlertTriangle, AlertCircle,
  Info, ArrowLeft, Send, FileText, Monitor, Check, ExternalLink,
  MessageSquare, User, Eye, Sparkles
} from 'lucide-react';

export const MyProctoringReportPage: React.FC = () => {
  const { user } = useAuthStore();
  const { sessionId } = useParams<{ sessionId: string }>();
  const {
    sessions,
    getSessionsForLearner,
    submitStudentExplanation,
    submitStudentAppeal,
  } = useProctoringStore();

  // Filter sessions for currently authenticated student
  const studentSessions = user ? getSessionsForLearner(user.id) : sessions;
  const currentSession = sessionId
    ? sessions.find((s) => s.id === sessionId)
    : studentSessions[0] || sessions[0];

  // Selected session in case learner has multiple attempts
  const [activeSession, setActiveSession] = useState<ProctoringSession | undefined>(currentSession);

  // Explanation submission form state
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [explanationText, setExplanationText] = useState('');
  const [appealText, setAppealText] = useState('');
  const [submissionSuccess, setSubmissionSuccess] = useState<string | null>(null);

  const displaySession = activeSession || currentSession;

  const handleExplanationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!displaySession || !selectedEventId || !explanationText.trim()) return;

    submitStudentExplanation(displaySession.id, selectedEventId, explanationText.trim());
    setSubmissionSuccess('Your context and explanation have been attached to this event for instructor review.');
    setExplanationText('');
    setSelectedEventId(null);
    setTimeout(() => setSubmissionSuccess(null), 5000);
  };

  const handleAppealSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!displaySession || !appealText.trim()) return;

    submitStudentAppeal(displaySession.id, appealText.trim());
    setSubmissionSuccess('Formal explanation and appeal registered. Your instructor will review the telemetry.');
    setAppealText('');
    setTimeout(() => setSubmissionSuccess(null), 5000);
  };

  const getOverallStatusBadge = (session: ProctoringSession) => {
    if (session.status === 'reviewed' && session.reviewDecision) {
      const outcome = session.reviewDecision.outcome;
      if (outcome === 'no_violation' || outcome === 'technical_incident_accepted') {
        return <span className="badge badge-active">Review Completed &bull; Cleared</span>;
      }
      if (outcome === 'warning_issued') {
        return <span className="badge badge-warning">Review Completed &bull; Advisory Issued</span>;
      }
      return <span className="badge badge-failed">Policy Review Completed</span>;
    }

    if (session.studentAppeal && session.studentAppeal.status === 'pending') {
      return <span className="badge badge-primary">Explanation Submitted &bull; Awaiting Instructor</span>;
    }

    const nonTimingEvents = session.events.filter((e) => e.category !== 'timing_event');
    if (nonTimingEvents.length === 0) {
      return <span className="badge badge-active">No Anomalies Recorded &bull; Clean</span>;
    }

    return <span className="badge badge-warning">Events Logged &bull; Awaiting Review</span>;
  };

  const getSeverityBadge = (severity: ProctoringSeverity) => {
    switch (severity) {
      case 'critical':
        return <span className="badge badge-failed">Critical Interruption</span>;
      case 'warning':
        return <span className="badge badge-warning">Advisory Notice</span>;
      case 'review_required':
        return <span className="badge badge-primary">Requires Review</span>;
      case 'informational':
      default:
        return <span className="badge badge-secondary">Telemetry Info</span>;
    }
  };

  if (!displaySession) {
    return (
      <div style={{ maxWidth: '800px', margin: '40px auto', textAlign: 'center' }}>
        <div className="card" style={{ padding: '40px' }}>
          <Shield size={48} color="#3B82F6" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '1.4rem', marginBottom: '8px' }}>No Proctoring Reports Found</h2>
          <p className="text-secondary text-sm" style={{ marginBottom: '24px' }}>
            You haven't completed any proctored assessments yet.
          </p>
          <Link to="/assessments" className="btn btn-primary">
            Browse Assessments
          </Link>
        </div>
      </div>
    );
  }

  const eventsList = displaySession.events || [];
  const nonTimingCount = eventsList.filter((e) => e.category !== 'timing_event').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Link to="/assessments" className="btn btn-ghost btn-sm" style={{ padding: '4px 8px' }}>
              <ArrowLeft size={16} />
            </Link>
            <h1 style={{ fontSize: '1.75rem', margin: 0, fontWeight: 800 }}>My Proctoring Report</h1>
            <span className="badge badge-primary" style={{ textTransform: 'uppercase', fontSize: '0.7rem' }}>
              VeniGuard
            </span>
          </div>
          <p className="text-secondary text-sm">
            Explainable telemetry timeline, recording logs, and fair review appeal portal
          </p>
        </div>

        {/* Attempt Switcher if multiple */}
        {studentSessions.length > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="text-muted text-xs font-semibold">Select Session:</span>
            <select
              value={displaySession.id}
              onChange={(e) => {
                const s = studentSessions.find((sess) => sess.id === e.target.value);
                if (s) setActiveSession(s);
              }}
              style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-main)',
                padding: '6px 12px',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.85rem',
              }}
            >
              {studentSessions.map((sess) => (
                <option key={sess.id} value={sess.id}>
                  {sess.assessmentTitle} ({new Date(sess.startedAt).toLocaleDateString()})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Fairness & Transparency Principle Banner */}
      <div
        style={{
          background: 'rgba(37, 99, 235, 0.08)',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '14px',
        }}
      >
        <Shield size={24} color="#3B82F6" style={{ marginTop: '2px', flexShrink: 0 }} />
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)', marginBottom: '4px' }}>
            Explainable Proctoring & Fair Review Guarantee
          </div>
          <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            VeniGuard never labels a student as having cheated solely because a browser event occurred. Signal events (such as OS notifications, network drops, or window focus changes) are logged transparently so you can submit your explanation for an instructor's human evaluation.
          </p>
        </div>
      </div>

      {/* Submission Success Toast */}
      {submissionSuccess && (
        <div
          style={{
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            color: 'var(--success)',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: 600,
          }}
        >
          <CheckCircle2 size={18} />
          <span>{submissionSuccess}</span>
        </div>
      )}

      {/* Session Metadata Card */}
      <div className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '1.3rem', margin: 0, fontWeight: 700 }}>{displaySession.assessmentTitle}</h2>
              {getOverallStatusBadge(displaySession)}
            </div>
            <div className="text-muted text-xs" style={{ marginTop: '4px' }}>
              Session ID: <code style={{ color: '#818CF8' }}>{displaySession.id}</code> &bull; Policy: {displaySession.policy.name} ({displaySession.policy.level})
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div className="text-muted text-xs">Date of Assessment</div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
              {new Date(displaySession.startedAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} at{' '}
              {new Date(displaySession.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>

        {/* 4 Stat Boxes */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '14px',
            background: 'var(--bg-input)',
            padding: '16px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div>
            <div className="text-muted text-xs font-semibold">Active Monitoring</div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#3B82F6', marginTop: '4px' }}>
              {displaySession.policy.requireScreenShare ? 'Screen Stream Active' : 'Basic Timer'}
            </div>
          </div>
          <div>
            <div className="text-muted text-xs font-semibold">Duration Logged</div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', marginTop: '4px' }}>
              {displaySession.totalDurationSeconds
                ? `${Math.round(displaySession.totalDurationSeconds / 60)} Mins`
                : 'Completed'}
            </div>
          </div>
          <div>
            <div className="text-muted text-xs font-semibold">Telemetry Anomalies</div>
            <div
              style={{
                fontWeight: 700,
                fontSize: '0.9rem',
                color: nonTimingCount === 0 ? 'var(--success)' : 'var(--warning)',
                marginTop: '4px',
              }}
            >
              {nonTimingCount === 0 ? '0 (Clean Session)' : `${nonTimingCount} Event(s) Logged`}
            </div>
          </div>
          <div>
            <div className="text-muted text-xs font-semibold">Data Retention</div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', marginTop: '4px' }}>
              Purges in {displaySession.policy.retentionDays} Days
            </div>
          </div>
          <div>
            <div className="text-muted text-xs font-semibold">Video Conference</div>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#10B981', marginTop: '4px' }}>
              {displaySession.jitsiRoomName ? 'Google Meet Connected' : 'Google Meet Bridge'}
            </div>
          </div>
        </div>
      </div>

      {/* Instructor Decision Banner if Reviewed */}
      {displaySession.reviewDecision && (
        <div
          className="card"
          style={{
            padding: '20px 24px',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(37, 99, 235, 0.05) 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <CheckCircle2 size={20} color="var(--success)" />
            <h3 style={{ fontSize: '1.05rem', margin: 0, fontWeight: 700 }}>
              Official Instructor Review Outcome
            </h3>
            <span className="badge badge-active" style={{ textTransform: 'capitalize' }}>
              {displaySession.reviewDecision.outcome.replace(/_/g, ' ')}
            </span>
          </div>

          <p style={{ margin: '0 0 10px 0', fontSize: '0.88rem', color: 'var(--text-main)', lineHeight: 1.5 }}>
            "{displaySession.reviewDecision.explanation}"
          </p>

          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Reviewed by <strong>{displaySession.reviewDecision.reviewerName}</strong> on{' '}
            {new Date(displaySession.reviewDecision.timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
          </div>
        </div>
      )}

      {/* Event Timeline */}
      <div className="card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1.15rem', marginBottom: '16px', fontWeight: 700 }}>
          Detailed Telemetry & Event Timeline
        </h3>

        {eventsList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
            No recorded telemetry events for this session.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {eventsList.map((evt, index) => {
              const isSelectedForExplanation = selectedEventId === evt.id;

              return (
                <div
                  key={evt.id}
                  style={{
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '16px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className="badge badge-secondary" style={{ fontFamily: 'monospace', fontSize: '0.72rem' }}>
                        +{evt.relativeSeconds}s
                      </span>
                      <strong style={{ fontSize: '0.92rem', color: 'var(--text-main)' }}>{evt.title}</strong>
                      {getSeverityBadge(evt.severity)}
                    </div>

                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </div>
                  </div>

                  <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {evt.description}
                  </p>

                  {/* Technical Metadata if present */}
                  {evt.technicalMetadata && Object.keys(evt.technicalMetadata).length > 0 && (
                    <div
                      style={{
                        background: 'rgba(0,0,0,0.2)',
                        padding: '6px 12px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.72rem',
                        color: 'var(--text-muted)',
                        fontFamily: 'monospace',
                      }}
                    >
                      Metadata: {JSON.stringify(evt.technicalMetadata)}
                    </div>
                  )}

                  {/* Evidence Snapshot if present */}
                  {evt.evidenceSnapshot && (
                    <div style={{ marginTop: '4px' }}>
                      <div className="text-muted text-xs" style={{ marginBottom: '4px' }}>
                        Associated Frame Evidence:
                      </div>
                      <img
                        src={evt.evidenceSnapshot}
                        alt="Evidence snapshot"
                        style={{
                          maxHeight: '140px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-subtle)',
                        }}
                      />
                    </div>
                  )}

                  {/* Student Submitted Explanation */}
                  {evt.studentExplanation && (
                    <div
                      style={{
                        background: 'rgba(84, 71, 255, 0.08)',
                        border: '1px solid rgba(84, 71, 255, 0.25)',
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.8rem',
                      }}
                    >
                      <strong style={{ color: '#818CF8' }}>Your Context Note: </strong>
                      <span style={{ color: 'var(--text-main)' }}>{evt.studentExplanation}</span>
                      <div className="text-muted text-xs" style={{ marginTop: '4px' }}>
                        Submitted {new Date(evt.studentExplanationSubmittedAt || evt.timestamp).toLocaleString()}
                      </div>
                    </div>
                  )}

                  {/* Provide Context Action for non-timing events */}
                  {evt.category !== 'timing_event' && !evt.studentExplanation && (
                    <div style={{ marginTop: '4px' }}>
                      {!isSelectedForExplanation ? (
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setSelectedEventId(evt.id);
                            setExplanationText('');
                          }}
                          style={{ fontSize: '0.75rem', gap: '6px' }}
                        >
                          <MessageSquare size={13} /> Add Explanation for Instructor
                        </button>
                      ) : (
                        <form onSubmit={handleExplanationSubmit} style={{ marginTop: '8px' }}>
                          <div style={{ fontSize: '0.78rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-main)' }}>
                            Explain what happened during this event:
                          </div>
                          <textarea
                            value={explanationText}
                            onChange={(e) => setExplanationText(e.target.value)}
                            placeholder="e.g., Windows Update notification popped up, accidental shortcut, anti-virus alert..."
                            rows={3}
                            style={{
                              width: '100%',
                              padding: '10px',
                              background: 'var(--bg-app)',
                              border: '1px solid var(--border-subtle)',
                              borderRadius: 'var(--radius-md)',
                              color: 'var(--text-main)',
                              fontSize: '0.82rem',
                              marginBottom: '8px',
                            }}
                            required
                          />
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button type="submit" className="btn btn-primary btn-sm" style={{ gap: '6px' }}>
                              <Send size={12} /> Submit Explanation
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => setSelectedEventId(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* General Student Appeal / Review Request Form */}
      <div className="card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1.15rem', marginBottom: '8px', fontWeight: 700 }}>
          Overall Session Explanation & Appeal
        </h3>
        <p className="text-secondary text-sm" style={{ marginBottom: '16px' }}>
          If you experienced hardware disruptions, power cuts, or unusual operating system anomalies during this examination, submit an overall appeal for your instructor.
        </p>

        {displaySession.studentAppeal ? (
          <div
            style={{
              background: 'rgba(84, 71, 255, 0.08)',
              border: '1px solid rgba(84, 71, 255, 0.25)',
              padding: '16px',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <strong style={{ color: '#818CF8', fontSize: '0.85rem' }}>Your Registered Appeal:</strong>
              <span className={`badge ${displaySession.studentAppeal.status === 'reviewed' ? 'badge-active' : 'badge-warning'}`}>
                {displaySession.studentAppeal.status === 'reviewed' ? 'Reviewed by Faculty' : 'Under Review'}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: 1.5 }}>
              "{displaySession.studentAppeal.explanation}"
            </p>
            <div className="text-muted text-xs" style={{ marginTop: '6px' }}>
              Submitted on {new Date(displaySession.studentAppeal.submittedAt).toLocaleString()}
            </div>
          </div>
        ) : (
          <form onSubmit={handleAppealSubmit}>
            <textarea
              value={appealText}
              onChange={(e) => setAppealText(e.target.value)}
              placeholder="Describe any technical, hardware, or external environment challenges you faced during this assessment..."
              rows={4}
              style={{
                width: '100%',
                padding: '12px',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-main)',
                fontSize: '0.85rem',
                marginBottom: '14px',
              }}
              required
            />
            <button type="submit" className="btn btn-primary" style={{ gap: '8px', fontWeight: 700 }}>
              <Send size={15} /> Submit Formal Explanation to Faculty
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
