import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuthStore } from '../../lib/store';
import { mockProctoringIncidents } from '../../data/mockData';
import { ProctoringIncident } from '../../types';
import { JitsiProctorDashboard } from './components/JitsiProctorDashboard';
import {
  Shield, Eye, AlertTriangle, CheckCircle2, Clock, X,
  Filter, UserCheck, ShieldAlert, FileText, Camera, Video, Monitor, Lock
} from 'lucide-react';

export const ProctoringPage: React.FC = () => {
  const { user } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as 'live_monitor' | 'queue' | 'policy' | 'appeals' | null;
  const assessmentIdParam = searchParams.get('assessmentId') || undefined;

  const isLearner = user?.activeRole === 'student' || user?.activeRole === 'learner';

  const [incidents, setIncidents] = useState<ProctoringIncident[]>(mockProctoringIncidents);
  const [selectedIncident, setSelectedIncident] = useState<ProctoringIncident | null>(null);
  const [activeTab, setActiveTab] = useState<'live_monitor' | 'queue' | 'policy' | 'appeals'>(
    tabParam || 'live_monitor'
  );
  const [severityFilter, setSeverityFilter] = useState<string>('all');

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
            The Proctoring Center and Live Jitsi Monitoring Console are restricted to authorized exam creators, assigned proctors, and institution administrators. Student accounts cannot view peer session telemetry, moderation tools, or incident logs.
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

  const filteredIncidents = incidents.filter((i) => {
    if (severityFilter === 'all') return true;
    return i.severity === severityFilter;
  });

  const handleUpdateStatus = (id: string, newStatus: 'cleared' | 'escalated' | 'confirmed') => {
    setIncidents(incidents.map((i) => i.id === id ? { ...i, status: newStatus } : i));
    setSelectedIncident(null);
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
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '4px' }}>Proctoring Center & Live Monitor</h1>
          <p className="text-secondary text-sm">Real-time Jitsi video stream observation, telemetry indicators, false-alarm dismissal, and proctor interventions</p>
        </div>

        <div style={{
          background: 'rgba(245, 158, 11, 0.15)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          color: '#fbbf24',
          padding: '6px 14px',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.8rem',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontWeight: 600
        }}>
          <AlertTriangle size={14} />
          <span>Policy Rule: Signals are review indicators, never autonomous cheating verdicts.</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-nav" style={{ marginBottom: '24px' }}>
        <button
          className={`tab-btn ${activeTab === 'live_monitor' ? 'active' : ''}`}
          onClick={() => handleTabChange('live_monitor')}
        >
          <Video size={16} />
          Live Proctoring & Jitsi Room Monitor
        </button>
        <button
          className={`tab-btn ${activeTab === 'queue' ? 'active' : ''}`}
          onClick={() => handleTabChange('queue')}
        >
          <ShieldAlert size={16} />
          Flagged Incident Review Queue ({incidents.filter((i) => i.status !== 'cleared').length})
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
          Learner Appeals (1)
        </button>
      </div>

      {/* TAB 1: LIVE PROCTORING & JITSI MONITOR */}
      {activeTab === 'live_monitor' && (
        <JitsiProctorDashboard initialAssessmentId={assessmentIdParam} />
      )}

      {activeTab === 'queue' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Severity Quick Filter */}
          <div className="card" style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <span className="text-sm font-semibold">Filter by Severity:</span>
              <button
                className={`btn ${severityFilter === 'all' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                onClick={() => setSeverityFilter('all')}
              >
                All Signals
              </button>
              <button
                className={`btn ${severityFilter === 'high' ? 'btn-danger' : 'btn-secondary'} btn-sm`}
                onClick={() => setSeverityFilter('high')}
              >
                High Severity
              </button>
              <button
                className={`btn ${severityFilter === 'medium' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                onClick={() => setSeverityFilter('medium')}
              >
                Medium Severity
              </button>
              <button
                className={`btn ${severityFilter === 'low' ? 'btn-secondary' : 'btn-secondary'} btn-sm`}
                onClick={() => setSeverityFilter('low')}
              >
                Low (Informational)
              </button>
            </div>

            <span className="text-muted text-xs font-semibold">{filteredIncidents.length} Incidents</span>
          </div>

          {/* Incidents Table */}
          <div className="card">
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Learner</th>
                    <th>Assessment</th>
                    <th>Signal Event Type</th>
                    <th>Severity</th>
                    <th>Review Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredIncidents.map((i) => (
                    <tr key={i.id}>
                      <td className="text-muted text-xs">
                        {new Date(i.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{i.learnerName}</div>
                      </td>
                      <td>{i.assessmentTitle}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {i.eventType === 'tab_switch' && <Monitor size={14} color="var(--primary)" />}
                          {i.eventType === 'face_not_visible' && <Camera size={14} color="var(--warning)" />}
                          {i.eventType === 'audio_spike' && <Clock size={14} color="var(--accent-cyan)" />}
                          <span style={{ fontWeight: 500, textTransform: 'capitalize' }}>
                            {i.eventType.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className={`badge badge-${i.severity === 'high' ? 'failed' : i.severity === 'medium' ? 'warning' : 'primary'}`}>
                          {i.severity}
                        </span>
                      </td>
                      <td>
                        <span className={`badge badge-${i.status}`}>
                          {i.status}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setSelectedIncident(i)}
                        >
                          <Eye size={13} /> Inspect Evidence
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Policy Tab */}
      {activeTab === 'policy' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '12px' }}>Proctoring Telemetry Policy</h3>
            <p className="text-secondary text-sm" style={{ marginBottom: '16px' }}>
              Defines permitted monitoring channels and signal sensitivity thresholds.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ padding: '12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Webcam Presence Interval</div>
                  <div className="text-muted text-xs">Sample periodic face presence every 10 seconds</div>
                </div>
                <span className="badge badge-active">Active</span>
              </div>

              <div style={{ padding: '12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Browser Tab Blur / Window Switch</div>
                  <div className="text-muted text-xs">Flag when browser loses window focus &gt; 3 seconds</div>
                </div>
                <span className="badge badge-active">Active</span>
              </div>

              <div style={{ padding: '12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Ambient Audio Spike Threshold</div>
                  <div className="text-muted text-xs">Record 5-second audio snippet when &gt; 75dB is sustained</div>
                </div>
                <span className="badge badge-active">Active</span>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '12px' }}>Privacy & Data Retention Schedule</h3>
            <p className="text-secondary text-sm" style={{ marginBottom: '16px' }}>
              GDPR/FERPA compliance safeguards for biometric and video frame snapshots.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span className="text-muted">Evidence Snapshot Retention:</span>
                <span className="font-semibold">30 Days (Automated Cloud Purge)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span className="text-muted">Access Authorization:</span>
                <span className="font-semibold">Assigned Grader & Org Admin Only</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span className="text-muted">Alternative Accommodations:</span>
                <span className="font-semibold">In-person or Proctored Oral Exam</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Appeals Tab */}
      {activeTab === 'appeals' && (
        <div className="card">
          <h3 style={{ fontSize: '1.1rem', marginBottom: '14px' }}>Learner Proctoring Appeal Docket</h3>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Appeal ID</th>
                  <th>Learner</th>
                  <th>Assessment</th>
                  <th>Reason for Appeal</th>
                  <th>Status</th>
                  <th>Decision</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>APP-104</td>
                  <td style={{ fontWeight: 600 }}>Elena Rostova</td>
                  <td>Advanced React Patterns Quiz</td>
                  <td>Browser window lost focus briefly due to operating system security notification popup.</td>
                  <td><span className="badge badge-warning">Under Review</span></td>
                  <td>
                    <button className="btn btn-primary btn-sm" onClick={() => alert("Marked appeal as Approved: False positive cleared.")}>
                      Clear Incident & Approve
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Inspect Evidence Modal */}
      {selectedIncident && (
        <div className="modal-overlay" onClick={() => setSelectedIncident(null)}>
          <div className="modal-card" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Incident Review: #{selectedIncident.id}</h3>
                <p className="text-muted text-xs">{selectedIncident.learnerName} &bull; {selectedIncident.assessmentTitle}</p>
              </div>
              <button onClick={() => setSelectedIncident(null)} style={{ color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              {/* Telemetry frame mockup */}
              <div style={{
                height: '240px',
                borderRadius: 'var(--radius-md)',
                background: '#040711',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
                position: 'relative'
              }}>
                <Camera size={40} color="var(--primary)" style={{ opacity: 0.6, marginBottom: '8px' }} />
                <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Snapshot Telemetry Captured</div>
                <div className="text-muted text-xs">Event: {selectedIncident.eventType.replace('_', ' ')} &bull; {new Date(selectedIncident.timestamp).toLocaleTimeString()}</div>

                <div style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px'
                }}>
                  <span className={`badge badge-${selectedIncident.severity === 'high' ? 'failed' : 'warning'}`}>
                    {selectedIncident.severity} Severity Signal
                  </span>
                </div>
              </div>

              <div style={{
                background: 'var(--bg-input)',
                borderRadius: 'var(--radius-md)',
                padding: '14px',
                marginBottom: '16px',
                fontSize: '0.85rem'
              }}>
                <div className="text-muted text-xs font-semibold" style={{ marginBottom: '4px' }}>Incident Telemetry Description:</div>
                <p style={{ margin: 0 }}>{selectedIncident.description}</p>
              </div>

              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                Reviewer Guideline: Evaluate whether the signal reflects malicious intent or an involuntary environment disturbance (e.g. pet/family member, browser alert).
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => handleUpdateStatus(selectedIncident.id, 'cleared')}
              >
                Mark as False Positive (Clear)
              </button>
              <button
                className="btn btn-danger"
                onClick={() => handleUpdateStatus(selectedIncident.id, 'escalated')}
              >
                Escalate to Academic Integrity Board
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
