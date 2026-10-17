import React, { useState } from 'react';
import { mockAuditLog } from '../../data/mockData';
import { AuditEntry } from '../../types';
import {
  Settings, Shield, Activity, Lock, Database, RefreshCw,
  Server, CheckCircle2, AlertTriangle, Save, Sliders, History
} from 'lucide-react';

export const PlatformSettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'general' | 'status' | 'audit'>('general');
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>(mockAuditLog);

  // Settings state
  const [platformName, setPlatformName] = useState('Acuity Enterprise LMS');
  const [sessionTimeoutMinutes, setSessionTimeoutMinutes] = useState(60);
  const [enableGamification, setEnableGamification] = useState(true);
  const [enableAiAssistance, setEnableAiAssistance] = useState(true);
  const [enableProctoring, setEnableProctoring] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '4px' }}>Platform Settings & System Telemetry</h1>
          <p className="text-secondary text-sm">Global security configurations, multi-tenant governance, system health, and audit logs</p>
        </div>

        {savedSuccess && (
          <div style={{
            background: 'var(--success-bg)',
            border: '1px solid var(--success-border)',
            color: 'var(--success)',
            padding: '8px 16px',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <CheckCircle2 size={16} />
            <span>Settings saved successfully!</span>
          </div>
        )}
      </div>

      <div className="tabs-nav">
        <button
          className={`tab-btn ${activeTab === 'general' ? 'active' : ''}`}
          onClick={() => setActiveTab('general')}
        >
          <Sliders size={16} />
          Global Configuration
        </button>
        <button
          className={`tab-btn ${activeTab === 'status' ? 'active' : ''}`}
          onClick={() => setActiveTab('status')}
        >
          <Activity size={16} />
          System Health Telemetry
        </button>
        <button
          className={`tab-btn ${activeTab === 'audit' ? 'active' : ''}`}
          onClick={() => setActiveTab('audit')}
        >
          <History size={16} />
          Security Audit Trail ({auditLogs.length})
        </button>
      </div>

      {activeTab === 'general' && (
        <div className="card" style={{ maxWidth: '780px' }}>
          <h3 style={{ fontSize: '1.15rem', marginBottom: '16px' }}>Platform Security & Policy Controls</h3>

          <form onSubmit={handleSaveSettings}>
            <div className="form-group">
              <label className="form-label">Platform Display Name</label>
              <input
                type="text"
                className="form-input"
                value={platformName}
                onChange={(e) => setPlatformName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Session Idle Timeout (Minutes)</label>
              <select
                className="form-select"
                value={sessionTimeoutMinutes}
                onChange={(e) => setSessionTimeoutMinutes(parseInt(e.target.value))}
              >
                <option value={15}>15 Minutes (High Security)</option>
                <option value={30}>30 Minutes</option>
                <option value={60}>60 Minutes (Default)</option>
                <option value={120}>120 Minutes (Extended)</option>
              </select>
            </div>

            <div style={{
              background: 'var(--bg-input)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              marginTop: '20px',
              marginBottom: '24px'
            }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '4px' }}>
                Enterprise Feature Toggles (Global)
              </div>

              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Gamification Engine (Points, Badges, Streaks)</div>
                  <div className="text-muted text-xs">Enable learner achievement levels and leaderboards</div>
                </div>
                <input
                  type="checkbox"
                  checked={enableGamification}
                  onChange={(e) => setEnableGamification(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                />
              </label>

              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>BOT / AI Assisted Scoring & Feedback</div>
                  <div className="text-muted text-xs">Allow instructors and graders to use preliminary AI recommendations</div>
                </div>
                <input
                  type="checkbox"
                  checked={enableAiAssistance}
                  onChange={(e) => setEnableAiAssistance(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                />
              </label>

              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Automated Proctoring Subsystem</div>
                  <div className="text-muted text-xs">Permit courses and assessments to activate webcam and window monitoring</div>
                </div>
                <input
                  type="checkbox"
                  checked={enableProctoring}
                  onChange={(e) => setEnableProctoring(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                />
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary">
                <Save size={16} /> Save Platform Policies
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'status' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'var(--success-bg)',
                color: 'var(--success)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <CheckCircle2 size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', margin: 0 }}>All Systems Fully Operational</h3>
                <p className="text-muted text-xs">Simulated Real-Time Infrastructure Monitoring (99.98% SLA)</p>
              </div>
            </div>

            <span className="badge badge-active">Operational</span>
          </div>

          <div className="grid-3">
            {[
              { name: 'Core API Gateway', latency: '24ms', uptime: '99.99%', status: 'Healthy' },
              { name: 'Course Delivery & Video CDN', latency: '42ms', uptime: '99.95%', status: 'Healthy' },
              { name: 'Real-Time Proctoring Stream', latency: '68ms', uptime: '99.92%', status: 'Healthy' },
              { name: 'AI Reasoning Pipeline', latency: '340ms', uptime: '99.88%', status: 'Healthy' },
              { name: 'PostgreSQL Multi-Tenant Cluster', latency: '12ms', uptime: '100%', status: 'Healthy' },
              { name: 'Notification Dispatch Queue', latency: '18ms', uptime: '99.99%', status: 'Healthy' },
            ].map((svc) => (
              <div key={svc.name} className="stat-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{svc.name}</span>
                  <span className="badge badge-active">{svc.status}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <span>Latency: {svc.latency}</span>
                  <span>Uptime: {svc.uptime}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Immutable Security Audit Trail</h3>
              <p className="text-secondary text-sm">Records all administrative mutations, role grants, and assessment grade submissions</p>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => alert("Downloading audit log CSV archive...")}>
              Export Audit Trail
            </button>
          </div>

          <div className="table-container">
            <table className="table" style={{ fontSize: '0.825rem' }}>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Resource Target</th>
                  <th>Outcome</th>
                  <th>Client IP / User Agent</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((entry) => (
                  <tr key={entry.id}>
                    <td className="text-muted text-xs">
                      {new Date(entry.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{entry.actorName}</div>
                      <div className="text-muted text-xs">{entry.actorEmail}</div>
                    </td>
                    <td>
                      <code>{entry.action}</code>
                    </td>
                    <td>
                      <div>{entry.resourceType}</div>
                      <div className="text-muted text-xs font-mono">{entry.resourceId}</div>
                    </td>
                    <td>
                      <span className="badge badge-active">SUCCESS</span>
                    </td>
                    <td className="text-muted text-xs font-mono">
                      192.168.1.42 (Edge-SSL)
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
