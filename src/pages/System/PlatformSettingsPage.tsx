import React, { useState } from 'react';
import { useAuthStore } from '../../lib/store';
import { mockAuditLog } from '../../data/mockData';
import { AuditEntry } from '../../types';
import {
  Settings, Shield, Activity, Lock, Database, RefreshCw,
  Server, CheckCircle2, AlertTriangle, Save, Sliders, History,
  Building2, GraduationCap, Calendar, Clock, Globe, Mail, Phone, MapPin, X
} from 'lucide-react';

export const PlatformSettingsPage: React.FC = () => {
  const { user } = useAuthStore();
  const isOrgAdmin = user?.activeRole === 'org_admin';

  // Platform admin tab
  const [platformTab, setPlatformTab] = useState<'general' | 'status' | 'audit'>('general');

  // Institution admin tab
  const [orgTab, setOrgTab] = useState<'profile' | 'academic' | 'audit'>('profile');

  // Platform settings state (Platform Admin)
  const [platformName, setPlatformName] = useState('Acuity Enterprise LMS');
  const [sessionTimeoutMinutes, setSessionTimeoutMinutes] = useState(60);
  const [enableGamification, setEnableGamification] = useState(true);
  const [enableAiAssistance, setEnableAiAssistance] = useState(true);
  const [enableProctoring, setEnableProctoring] = useState(true);

  // Institution settings state (Org Admin)
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

  // Institution-scoped audit logs (only Acme Learning Corp / org-001)
  const institutionAuditLogs = auditLogs.filter(
    (log) => log.actorEmail?.includes('acme') || log.actorEmail?.includes('admin@lms.demo') || log.resourceType !== 'platform_settings'
  );

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveMessage(isOrgAdmin ? 'Institution configuration updated (in-memory demo state)!' : 'Platform policies updated!');
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

  // ==========================================
  // INSTITUTION ADMIN (org_admin) VIEW
  // ==========================================
  if (isOrgAdmin) {
    return (
      <div>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="badge badge-primary">Institution Context</span>
              <span className="badge badge-draft">Acme Learning Corp (ORG-001)</span>
            </div>
            <h1 style={{ fontSize: '1.75rem', marginBottom: '4px' }}>Institution Settings & Academic Configuration</h1>
            <p className="text-secondary text-sm">
              Manage institution identity, academic year calendars, attendance policies, and campus audit logs.
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

        {/* Demo banner */}
        <div style={{
          background: 'rgba(59, 130, 246, 0.08)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '0.85rem'
        }}>
          <Shield size={18} style={{ color: 'var(--primary)', flexShrink: 0 }} />
          <div>
            <strong>Multi-Tenant Institutional Scope:</strong> You are managing settings exclusively for <strong>Acme Learning Corp</strong>. Changes made here apply only to this institution's students, faculty, and academic terms.
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="tabs-nav">
          <button
            className={`tab-btn ${orgTab === 'profile' ? 'active' : ''}`}
            onClick={() => setOrgTab('profile')}
          >
            <Building2 size={16} />
            Institution Profile & Identity
          </button>
          <button
            className={`tab-btn ${orgTab === 'academic' ? 'active' : ''}`}
            onClick={() => setOrgTab('academic')}
          >
            <GraduationCap size={16} />
            Academic Calendar & Governance
          </button>
          <button
            className={`tab-btn ${orgTab === 'audit' ? 'active' : ''}`}
            onClick={() => setOrgTab('audit')}
          >
            <History size={16} />
            Institution Activity History ({institutionAuditLogs.length})
          </button>
        </div>

        {/* TAB 1: Profile & Identity */}
        {orgTab === 'profile' && (
          <div className="card" style={{ maxWidth: '820px' }}>
            <h3 style={{ fontSize: '1.15rem', marginBottom: '16px' }}>Institution Profile & Contact Details</h3>

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

        {/* TAB 2: Academic Governance */}
        {orgTab === 'academic' && (
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
                  Institution Policies & Controls
                </div>

                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Faculty Attendance Self-Reporting</div>
                    <div className="text-muted text-xs">Permit course instructors to submit and amend attendance rosters directly</div>
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

        {/* TAB 3: Scoped Activity Trail */}
        {orgTab === 'audit' && (
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Institution Audit & Activity History</h3>
                <p className="text-secondary text-sm">
                  Chronological trail of administrative actions, course updates, and roster modifications within Acme Learning Corp
                </p>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => alert("Exporting Acme Learning Corp audit log archive...")}>
                Export Institution Log
              </button>
            </div>

            <div className="table-container">
              <table className="table" style={{ fontSize: '0.825rem' }}>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Actor</th>
                    <th>Action</th>
                    <th>Target Resource</th>
                    <th>Status</th>
                    <th>Multi-Tenant Scope</th>
                  </tr>
                </thead>
                <tbody>
                  {institutionAuditLogs.map((entry) => (
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
                      <td>
                        <span className="badge badge-primary">Acme Learning Corp (org-001)</span>
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
  }

  // ==========================================
  // PLATFORM ADMINISTRATOR (platform_admin) VIEW
  // ==========================================
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="badge badge-error">Global Platform Scope</span>
            <span className="badge badge-draft">System Wide</span>
          </div>
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
          className={`tab-btn ${platformTab === 'general' ? 'active' : ''}`}
          onClick={() => setPlatformTab('general')}
        >
          <Sliders size={16} />
          Global Configuration
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

      {platformTab === 'general' && (
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

      {platformTab === 'status' && (
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

      {platformTab === 'audit' && (
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
