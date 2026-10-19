import React, { useState } from 'react';
import { useAuthStore } from '../../lib/store';
import { mockAuditLog } from '../../data/mockData';
import { AuditEntry } from '../../types';
import {
  Settings, Shield, Activity, Lock, Database, RefreshCw,
  Server, CheckCircle2, AlertTriangle, Save, Sliders, History,
  Building2, GraduationCap, Calendar, Clock, Globe, Mail, Phone, MapPin, Check
} from 'lucide-react';

export const PlatformSettingsPage: React.FC = () => {
  const { user } = useAuthStore();

  // Unified Platform Admin tabs
  const [platformTab, setPlatformTab] = useState<'general' | 'institution' | 'academic' | 'status' | 'audit'>('general');

  // Platform settings state (Platform Admin)
  const [platformName, setPlatformName] = useState('Acuity Enterprise LMS');
  const [sessionTimeoutMinutes, setSessionTimeoutMinutes] = useState(60);
  const [enableGamification, setEnableGamification] = useState(true);
  const [enableAiAssistance, setEnableAiAssistance] = useState(true);
  const [enableProctoring, setEnableProctoring] = useState(true);

  // Institution settings state
  const [institutionName, setInstitutionName] = useState('Acme Learning Corp');
  const [institutionCode, setInstitutionCode] = useState('ORG-001');
  const [institutionDomain, setInstitutionDomain] = useState('acmelearning.com');
  const [contactEmail, setContactEmail] = useState('admin@acmelearning.com');
  const [phone, setPhone] = useState('+1 (555) 019-2834');
  const [campusAddress, setCampusAddress] = useState('100 Innovation Way, Suite 400, Cambridge, MA 02142');
  const [timezone, setTimezone] = useState('America/New_York (EST)');
  
  // Academic policies
  const [academicYear, setAcademicYear] = useState('AY 2026-2027');
  const [activeTerm, setActiveTerm] = useState('Fall Semester 2026');
  const [termStartDate, setTermStartDate] = useState('2026-08-25');
  const [termEndDate, setTermEndDate] = useState('2026-12-18');
  const [minAttendancePercent, setMinAttendancePercent] = useState(75);
  const [passingGradePercent, setPassingGradePercent] = useState(60);
  const [allowFacultyAttendance, setAllowFacultyAttendance] = useState(true);
  const [autoIssueCertificates, setAutoIssueCertificates] = useState(true);
  const [gracePeriodHours, setGracePeriodHours] = useState(24);

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const [auditLogs] = useState<AuditEntry[]>(mockAuditLog);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveMessage('Platform settings and institutional policies updated successfully!');
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 4000);
  };

  const handleReset = () => {
    setInstitutionName('Acme Learning Corp');
    setAcademicYear('AY 2026-2027');
    setActiveTerm('Fall Semester 2026');
    setMinAttendancePercent(75);
    setPassingGradePercent(60);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="badge badge-error">Global Platform Scope</span>
            <span className="badge badge-primary">Platform Administrator</span>
          </div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '4px' }}>Platform Settings & System Telemetry</h1>
          <p className="text-secondary text-sm">
            Unified governance console: security controls, AI & proctoring policies, multi-tenant institutional profile, academic calendars, and live telemetry.
          </p>
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
            <span>{saveMessage}</span>
          </div>
        )}
      </div>

      <div className="tabs-nav">
        <button
          className={`tab-btn ${platformTab === 'general' ? 'active' : ''}`}
          onClick={() => setPlatformTab('general')}
        >
          <Sliders size={16} />
          Global Security & AI
        </button>
        <button
          className={`tab-btn ${platformTab === 'institution' ? 'active' : ''}`}
          onClick={() => setPlatformTab('institution')}
        >
          <Building2 size={16} />
          Institution Profile
        </button>
        <button
          className={`tab-btn ${platformTab === 'academic' ? 'active' : ''}`}
          onClick={() => setPlatformTab('academic')}
        >
          <GraduationCap size={16} />
          Academic Calendar & Policies
        </button>
        <button
          className={`tab-btn ${platformTab === 'status' ? 'active' : ''}`}
          onClick={() => setPlatformTab('status')}
        >
          <Activity size={16} />
          System Health Telemetry
        </button>
        <button
          className={`tab-btn ${platformTab === 'audit' ? 'active' : ''}`}
          onClick={() => setPlatformTab('audit')}
        >
          <History size={16} />
          Security Audit Trail ({auditLogs.length})
        </button>
      </div>

      {/* TAB 1: Global Security & AI */}
      {platformTab === 'general' && (
        <div className="card" style={{ maxWidth: '820px' }}>
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
              <span className="text-muted text-xs">Shown in navbar, student portal headers, and automated communication digests.</span>
            </div>

            <div className="form-group">
              <label className="form-label">Admin Session Idle Timeout (Minutes)</label>
              <input
                type="number"
                className="form-input"
                value={sessionTimeoutMinutes}
                onChange={(e) => setSessionTimeoutMinutes(parseInt(e.target.value))}
                min="15"
                max="480"
              />
              <span className="text-muted text-xs">Inactive browser sessions will require re-authentication.</span>
            </div>

            <div style={{
              background: 'var(--bg-input)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              margin: '20px 0'
            }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Feature Gate Flags & Services</div>

              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Enable Student Gamification Engine</div>
                  <div className="text-muted text-xs">XP point boosts, levels, scholar study streaks, and leaderboard awards</div>
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
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>AI Learning & Grading Assistant</div>
                  <div className="text-muted text-xs">Automated grading recommendations for Trainers, student study summaries, and AI help chatbot</div>
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
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Automated Assessment Proctoring Engine</div>
                  <div className="text-muted text-xs">Webcam verification, tab-switch tracking, multi-face alerts, and incident review queue</div>
                </div>
                <input
                  type="checkbox"
                  checked={enableProctoring}
                  onChange={(e) => setEnableProctoring(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                />
              </label>
            </div>

            <button type="submit" className="btn btn-primary">
              <Save size={16} /> Save Security Policies
            </button>
          </form>
        </div>
      )}

      {/* TAB 2: Institution Profile & Identity */}
      {platformTab === 'institution' && (
        <div className="card" style={{ maxWidth: '820px' }}>
          <h3 style={{ fontSize: '1.15rem', marginBottom: '16px' }}>Multi-Tenant Institution Profile & Campus Info</h3>

          <form onSubmit={handleSaveSettings}>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Institution / Campus Legal Name *</label>
                <input
                  type="text"
                  className="form-input"
                  value={institutionName}
                  onChange={(e) => setInstitutionName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Institution Code / Identifier *</label>
                <input
                  type="text"
                  className="form-input"
                  value={institutionCode}
                  onChange={(e) => setInstitutionCode(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Primary Educational Domain *</label>
                <div style={{ position: 'relative' }}>
                  <Globe size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    className="form-input"
                    style={{ paddingLeft: '36px' }}
                    value={institutionDomain}
                    onChange={(e) => setInstitutionDomain(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Administrative Contact Email *</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }} />
                  <input
                    type="email"
                    className="form-input"
                    style={{ paddingLeft: '36px' }}
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Helpline / Campus Phone</label>
                <div style={{ position: 'relative' }}>
                  <Phone size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    className="form-input"
                    style={{ paddingLeft: '36px' }}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Default Campus Timezone</label>
                <select
                  className="form-select"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                >
                  <option value="America/New_York (EST)">America/New_York (EST / EDT)</option>
                  <option value="America/Chicago (CST)">America/Chicago (CST / CDT)</option>
                  <option value="America/Los_Angeles (PST)">America/Los_Angeles (PST / PDT)</option>
                  <option value="Europe/London (GMT)">Europe/London (GMT / BST)</option>
                  <option value="Asia/Kolkata (IST)">Asia/Kolkata (IST)</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Campus Physical Address</label>
              <div style={{ position: 'relative' }}>
                <MapPin size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '36px' }}
                  value={campusAddress}
                  onChange={(e) => setCampusAddress(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
              <button type="button" className="btn btn-secondary" onClick={handleReset}>
                Reset to Defaults
              </button>
              <button type="submit" className="btn btn-primary">
                <Save size={16} /> Save Institution Profile
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: Academic Calendar & Policies */}
      {platformTab === 'academic' && (
        <div className="card" style={{ maxWidth: '820px' }}>
          <h3 style={{ fontSize: '1.15rem', marginBottom: '16px' }}>Academic Calendar & Performance Thresholds</h3>

          <form onSubmit={handleSaveSettings}>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Active Academic Year *</label>
                <input
                  type="text"
                  className="form-input"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  placeholder="e.g. AY 2026-2027"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Current Term / Semester *</label>
                <input
                  type="text"
                  className="form-input"
                  value={activeTerm}
                  onChange={(e) => setActiveTerm(e.target.value)}
                  placeholder="e.g. Fall Semester 2026"
                  required
                />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Term Start Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={termStartDate}
                  onChange={(e) => setTermStartDate(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Term End Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={termEndDate}
                  onChange={(e) => setTermEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="grid-2" style={{ marginTop: '12px' }}>
              <div className="form-group">
                <label className="form-label">
                  Minimum Attendance for Exam Eligibility ({minAttendancePercent}%)
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input
                    type="range"
                    min="50"
                    max="95"
                    step="5"
                    value={minAttendancePercent}
                    onChange={(e) => setMinAttendancePercent(parseInt(e.target.value))}
                    style={{ flex: 1 }}
                  />
                  <span className="badge badge-primary" style={{ width: '50px', textAlign: 'center' }}>
                    {minAttendancePercent}%
                  </span>
                </div>
                <span className="text-muted text-xs">Students below this threshold trigger automated at-risk warnings.</span>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Passing Grade Benchmark ({passingGradePercent}%)
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input
                    type="range"
                    min="40"
                    max="85"
                    step="5"
                    value={passingGradePercent}
                    onChange={(e) => setPassingGradePercent(parseInt(e.target.value))}
                    style={{ flex: 1 }}
                  />
                  <span className="badge badge-primary" style={{ width: '50px', textAlign: 'center' }}>
                    {passingGradePercent}%
                  </span>
                </div>
                <span className="text-muted text-xs">Threshold required to earn completion certificates.</span>
              </div>
            </div>

            {/* Policy Toggles */}
            <div style={{
              background: 'var(--bg-input)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              marginTop: '16px',
              marginBottom: '20px'
            }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                Institutional Academic Policies & Controls
              </div>

              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Trainer Attendance Self-Reporting</div>
                  <div className="text-muted text-xs">Permit course trainers to submit and amend attendance rosters directly</div>
                </div>
                <input
                  type="checkbox"
                  checked={allowFacultyAttendance}
                  onChange={(e) => setAllowFacultyAttendance(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                />
              </label>

              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Auto-Issue Verified Certificates on Course Completion</div>
                  <div className="text-muted text-xs">Automatically generate digitally signed certificates when passing grade is reached</div>
                </div>
                <input
                  type="checkbox"
                  checked={autoIssueCertificates}
                  onChange={(e) => setAutoIssueCertificates(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                />
              </label>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Assessment Late Submission Grace Window</div>
                  <div className="text-muted text-xs">Allow submission within a grace period with automatic late tag</div>
                </div>
                <select
                  className="form-select"
                  style={{ width: '140px' }}
                  value={gracePeriodHours}
                  onChange={(e) => setGracePeriodHours(parseInt(e.target.value))}
                >
                  <option value={0}>0 Hours (Strict)</option>
                  <option value={12}>12 Hours</option>
                  <option value={24}>24 Hours</option>
                  <option value={48}>48 Hours</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button type="button" className="btn btn-secondary" onClick={handleReset}>
                Reset
              </button>
              <button type="submit" className="btn btn-primary">
                <Save size={16} /> Save Academic Policies
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 4: System Health Telemetry */}
      {platformTab === 'status' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="grid-4">
            <div className="stat-card">
              <span className="stat-label">Core API Cluster</span>
              <span className="stat-val text-success">99.98%</span>
              <span className="text-muted text-xs">12 Pods Active (Multi-region)</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Database Primary</span>
              <span className="stat-val text-success">Operational</span>
              <span className="text-muted text-xs">p99 Query Latency: 12ms</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Realtime WebSockets</span>
              <span className="stat-val text-primary">Connected</span>
              <span className="text-muted text-xs">1,842 Active Sessions</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">AI Inference Engine</span>
              <span className="stat-val text-warning">Degraded</span>
              <span className="text-muted text-xs">Fallback queue operating</span>
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontSize: '1.15rem', marginBottom: '16px' }}>Service Health Breakdown</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { name: 'Auth & Identity Provider (OAuth2 / SAML)', latency: '34ms', uptime: '100%', status: 'Healthy' },
                { name: 'PostgreSQL Distributed Database', latency: '8ms', uptime: '99.99%', status: 'Healthy' },
                { name: 'S3 Course Asset & Video Storage', latency: '65ms', uptime: '99.95%', status: 'Healthy' },
                { name: 'Live Streaming WebRTC Gateway', latency: '42ms', uptime: '99.90%', status: 'Healthy' },
                { name: 'AI Proctoring & Vision Pipeline', latency: '310ms', uptime: '98.50%', status: 'Degraded' },
                { name: 'Notification Dispatch Queue', latency: '18ms', uptime: '99.99%', status: 'Healthy' },
              ].map((svc) => (
                <div key={svc.name} className="stat-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{svc.name}</div>
                    <div className="text-muted text-xs">Latency: {svc.latency} • Uptime: {svc.uptime}</div>
                  </div>
                  <span className={`badge ${svc.status === 'Healthy' ? 'badge-active' : 'badge-warning'}`}>
                    {svc.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: Security Audit Trail */}
      {platformTab === 'audit' && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Immutable Security Audit Trail</h3>
              <p className="text-secondary text-sm">
                Chronological ledger of administrative mutations, role grants, grade submissions, and security authentications
              </p>
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
                      <code style={{ background: 'var(--bg-input)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.8rem' }}>
                        {entry.action}
                      </code>
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
