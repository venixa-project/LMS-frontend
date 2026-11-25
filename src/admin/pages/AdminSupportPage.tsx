import React, { useState, useEffect, useRef } from 'react';
import {
  LifeBuoy,
  Mail,
  Send,
  Upload,
  X,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Image as ImageIcon,
  Layers,
  ShieldAlert,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { useAuthStore } from '../../lib/store';
import { apiClient } from '../../lib/apiClient';
import { SUPPORT_ROLE_PATH_MAP } from '../data/supportNavigationMap';

interface SubmittedTicket {
  ticketId: string;
  issuePath: string;
  subject: string;
  priority: string;
  screenshotUrl: string | null;
  supportEmail: string;
  emailSent: boolean;
  emailStatus: string;
  createdAt: string;
}

export const AdminSupportPage: React.FC = () => {
  const { user } = useAuthStore();
  const [supportEmail, setSupportEmail] = useState('support@venilearn.com');

  // Step 1 -> Step 2 -> Step 3 cascading issue path
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [selectedScreenId, setSelectedScreenId] = useState('');
  const [selectedSubNavId, setSelectedSubNavId] = useState('');

  // Issue details
  const [category, setCategory] = useState('Bug / Technical Issue');
  const [priority, setPriority] = useState('Medium');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');

  // Screenshot upload
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSubmitted, setLastSubmitted] = useState<SubmittedTicket | null>(null);
  const [recentTickets, setRecentTickets] = useState<SubmittedTicket[]>([]);

  useEffect(() => {
    apiClient
      .get<{ supportEmail: string }>('/support/config')
      .then((res) => {
        const email = (res as any)?.data?.supportEmail || (res as any)?.supportEmail;
        if (email) setSupportEmail(email);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    return () => {
      if (screenshotPreview) URL.revokeObjectURL(screenshotPreview);
    };
  }, [screenshotPreview]);

  const selectedRole = SUPPORT_ROLE_PATH_MAP.find((r) => r.id === selectedRoleId) || null;
  const availableScreens = selectedRole?.screens || [];
  const selectedScreen = availableScreens.find((s) => s.id === selectedScreenId) || null;
  const availableSubNavs = selectedScreen?.subNavs || [];
  const selectedSubNav = availableSubNavs.find((sn) => sn.id === selectedSubNavId) || null;

  const handleRoleChange = (roleId: string) => {
    setSelectedRoleId(roleId);
    setSelectedScreenId('');
    setSelectedSubNavId('');
  };

  const handleScreenChange = (screenId: string) => {
    setSelectedScreenId(screenId);
    setSelectedSubNavId('');
  };

  const handleFileChange = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image screenshot (PNG, JPG, JPEG, or WebP).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Screenshot size must be 10 MB or smaller.');
      return;
    }
    setError(null);
    if (screenshotPreview) URL.revokeObjectURL(screenshotPreview);
    setScreenshotFile(file);
    setScreenshotPreview(URL.createObjectURL(file));
  };

  const clearScreenshot = () => {
    if (screenshotPreview) URL.revokeObjectURL(screenshotPreview);
    setScreenshotFile(null);
    setScreenshotPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLastSubmitted(null);

    if (!selectedRole || !selectedScreen || !selectedSubNav) {
      setError('Please complete all 3 issue path dropdowns: Role, Screen, and Sub-Nav.');
      return;
    }
    if (!subject.trim() || !description.trim()) {
      setError('Please enter a subject and describe the problem you are facing.');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('roleLabel', selectedRole.label);
      formData.append('screenLabel', selectedScreen.label);
      formData.append('subNavLabel', selectedSubNav.label);
      formData.append('category', category);
      formData.append('priority', priority);
      formData.append('subject', subject.trim());
      formData.append('description', description.trim());
      formData.append('adminName', user?.displayName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Admin');
      if (screenshotFile) {
        formData.append('screenshot', screenshotFile);
      }

      const payload = await apiClient.post<SubmittedTicket>('/support/tickets', formData);
      const data = (payload as any)?.data || payload;
      const submitted: SubmittedTicket = {
        ticketId: data.ticketId,
        issuePath: data.issuePath,
        subject: subject.trim(),
        priority,
        screenshotUrl: data.screenshotUrl || null,
        supportEmail: data.supportEmail || supportEmail,
        emailSent: Boolean(data.emailSent),
        emailStatus: data.emailStatus || 'Logged',
        createdAt: data.createdAt || new Date().toISOString(),
      };

      setLastSubmitted(submitted);
      setRecentTickets((prev) => [submitted, ...prev]);
      setSubject('');
      setDescription('');
      clearScreenshot();
    } catch (err: any) {
      setError(err?.message || 'Unable to submit support request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const buildMailtoLink = (ticket?: SubmittedTicket) => {
    const pathText = ticket?.issuePath || [selectedRole?.label, selectedScreen?.label, selectedSubNav?.label].filter(Boolean).join(' > ');
    const mailSubject = encodeURIComponent(`[VeniLearn Support${ticket ? ` #${ticket.ticketId}` : ''}] ${ticket?.subject || subject}`);
    const mailBody = encodeURIComponent(
      `Reported By: ${user?.displayName || 'Admin'} (${user?.email || ''})\nIssue Path: ${pathText}\nPriority: ${ticket?.priority || priority}\n${ticket?.screenshotUrl ? `Screenshot: ${ticket.screenshotUrl}\n` : ''}\nDetails:\n${description}`
    );
    return `mailto:${supportEmail}?subject=${mailSubject}&body=${mailBody}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', width: '100%' }}>
      {/* Hero Header */}
      <div
        className="kpi-card-animated"
        style={{
          background: 'linear-gradient(120deg, #4f46e5 0%, #7c3aed 50%, #ec4899 100%)',
          borderRadius: '18px',
          padding: '24px 28px',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: '0 12px 30px rgba(79, 70, 229, 0.25)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '14px',
              background: 'rgba(255, 255, 255, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <LifeBuoy size={26} color="#ffffff" />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', opacity: 0.9 }}>
              Admin Support Desk
            </div>
            <h1 style={{ margin: '2px 0 4px', fontSize: '1.5rem', fontWeight: 800, color: '#ffffff' }}>
              Report an Issue &amp; Contact Support
            </h1>
            <p style={{ margin: 0, fontSize: '0.86rem', color: 'rgba(255,255,255,0.9)' }}>
              Pinpoint the exact Role, Screen, and Sub-Navigation where the issue occurred and attach a screenshot.
            </p>
          </div>
        </div>

        <a
          href={buildMailtoLink()}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '999px',
            background: '#ffffff',
            color: '#4f46e5',
            fontWeight: 700,
            fontSize: '0.84rem',
            textDecoration: 'none',
            boxShadow: '0 6px 16px rgba(15, 23, 42, 0.16)',
          }}
        >
          <Mail size={16} />
          {supportEmail}
        </a>
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.65fr) minmax(280px, 1fr)', gap: '22px', alignItems: 'start' }}>
        {/* Left: Support Form */}
        <form onSubmit={handleSubmit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {error && (
            <div
              role="alert"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 16px',
                borderRadius: '10px',
                background: 'var(--danger-bg, rgba(239, 68, 68, 0.12))',
                border: '1px solid var(--danger-border, rgba(239, 68, 68, 0.35))',
                color: 'var(--danger, #ef4444)',
                fontSize: '0.88rem',
                fontWeight: 600,
              }}
            >
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {lastSubmitted && (
            <div
              style={{
                padding: '14px 16px',
                borderRadius: '12px',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                color: '#10b981',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, fontSize: '0.92rem' }}>
                <CheckCircle2 size={18} />
                <span>Ticket {lastSubmitted.ticketId} submitted!</span>
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-main)' }}>
                <strong>Path:</strong> {lastSubmitted.issuePath} &bull; <strong>Email Status:</strong> {lastSubmitted.emailStatus}
              </div>
              {!lastSubmitted.emailSent && (
                <div>
                  <a
                    href={buildMailtoLink(lastSubmitted)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700, color: '#4f46e5' }}
                  >
                    Open in your Mail App to send directly <ExternalLink size={13} />
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Step 1-3: Cascading Issue Path */}
          <div
            style={{
              padding: '18px',
              borderRadius: '14px',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={18} color="var(--primary)" />
              <h3 style={{ margin: 0, fontSize: '1.02rem', fontWeight: 700 }}>
                1. Where are you facing the problem?
              </h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '14px' }}>
              {/* Dropdown 1: Role */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontWeight: 700 }}>Step 1: Select Role *</label>
                <select
                  className="form-select"
                  value={selectedRoleId}
                  onChange={(e) => handleRoleChange(e.target.value)}
                  required
                >
                  <option value="">-- Choose Role --</option>
                  {SUPPORT_ROLE_PATH_MAP.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dropdown 2: Screen */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontWeight: 700 }}>Step 2: Select Screen *</label>
                <select
                  className="form-select"
                  value={selectedScreenId}
                  onChange={(e) => handleScreenChange(e.target.value)}
                  disabled={!selectedRole}
                  required
                >
                  <option value="">
                    {selectedRole ? '-- Choose Screen --' : 'Select a Role first'}
                  </option>
                  {availableScreens.map((sc) => (
                    <option key={sc.id} value={sc.id}>
                      {sc.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dropdown 3: Sub-Nav */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontWeight: 700 }}>Step 3: Select Sub-Nav *</label>
                <select
                  className="form-select"
                  value={selectedSubNavId}
                  onChange={(e) => setSelectedSubNavId(e.target.value)}
                  disabled={!selectedScreen}
                  required
                >
                  <option value="">
                    {selectedScreen ? '-- Choose Sub-Nav --' : 'Select a Screen first'}
                  </option>
                  {availableSubNavs.map((sn) => (
                    <option key={sn.id} value={sn.id}>
                      {sn.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Live Issue Path Breadcrumb */}
            {(selectedRole || selectedScreen || selectedSubNav) && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  flexWrap: 'wrap',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  background: 'rgba(79, 70, 229, 0.08)',
                  border: '1px solid rgba(79, 70, 229, 0.25)',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: 'var(--primary)',
                }}
              >
                <span>Issue Path:</span>
                {selectedRole && <span>{selectedRole.label}</span>}
                {selectedScreen && (
                  <>
                    <ChevronRight size={14} />
                    <span>{selectedScreen.label}</span>
                  </>
                )}
                {selectedSubNav && (
                  <>
                    <ChevronRight size={14} />
                    <span>{selectedSubNav.label}</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Issue Details */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontWeight: 700 }}>Issue Category</label>
              <select className="form-select" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="Bug / Technical Issue">Bug / Technical Issue</option>
                <option value="UI / Layout Problem">UI / Layout Problem</option>
                <option value="Data / Sync Issue">Data / Sync Issue</option>
                <option value="Performance / Slow Load">Performance / Slow Load</option>
                <option value="Access / Permissions">Access / Permissions</option>
                <option value="Feature Request">Feature Request</option>
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontWeight: 700 }}>Severity / Priority</label>
              <select className="form-select" value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="Low">Low (Minor visual / question)</option>
                <option value="Medium">Medium (Workflow impaired)</option>
                <option value="High">High (Feature blocked)</option>
                <option value="Critical">Critical (System down / urgent)</option>
              </select>
            </div>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontWeight: 700 }}>Subject *</label>
            <input
              type="text"
              className="form-input"
              placeholder="Brief summary of the issue (e.g. Export Excel button not downloading)"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontWeight: 700 }}>Describe the Issue *</label>
            <textarea
              className="form-input"
              rows={4}
              placeholder="Explain what happened, steps to reproduce, and what you expected..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              style={{ resize: 'vertical' }}
            />
          </div>

          {/* Screenshot Upload */}
          <div>
            <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ImageIcon size={15} /> Attach Screenshot of the Issue
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
              style={{ display: 'none' }}
            />

            {!screenshotPreview ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  handleFileChange(e.dataTransfer.files?.[0] || null);
                }}
                style={{
                  border: '2px dashed var(--border-subtle)',
                  borderRadius: '14px',
                  padding: '24px 16px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: 'var(--bg-input)',
                  transition: 'border-color 0.2s ease',
                }}
              >
                <Upload size={24} color="var(--primary)" style={{ marginBottom: '8px' }} />
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                  Click to upload or drag &amp; drop a screenshot
                </div>
                <div className="text-muted text-xs" style={{ marginTop: '4px' }}>
                  PNG, JPG, or WebP up to 10 MB (saved securely to S3 &amp; attached to support email)
                </div>
              </div>
            ) : (
              <div
                style={{
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '14px',
                  padding: '12px',
                  background: 'var(--bg-input)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700 }}>
                    {screenshotFile?.name} ({Math.round((screenshotFile?.size || 0) / 1024)} KB)
                  </span>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={clearScreenshot}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <X size={14} /> Remove
                  </button>
                </div>
                <img
                  src={screenshotPreview}
                  alt="Issue screenshot preview"
                  style={{ maxHeight: '220px', objectFit: 'contain', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}
                />
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 22px', fontWeight: 700 }}
            >
              <Send size={16} />
              {isSubmitting ? 'Sending to Support...' : 'Send Support Request'}
            </button>
          </div>
        </form>

        {/* Right: Context & Recent Tickets */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldAlert size={18} color="var(--primary)" />
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Reporter Context</h3>
            </div>
            <div style={{ fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-muted">Admin:</span>
                <strong>{user?.displayName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim()}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-muted">Email:</span>
                <strong>{user?.email}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-muted">Active Role:</span>
                <span className="badge badge-primary" style={{ textTransform: 'capitalize' }}>
                  {user?.activeRole?.replace('_', ' ')}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-muted">Support Desk:</span>
                <strong>{supportEmail}</strong>
              </div>
            </div>
          </div>

          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={18} color="#ec4899" />
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Recent Submissions</h3>
            </div>
            {recentTickets.length === 0 ? (
              <p className="text-muted text-xs" style={{ margin: 0 }}>
                Tickets submitted in this session will appear here with their tracking ID and issue path.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {recentTickets.map((t) => (
                  <div
                    key={t.ticketId}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '10px',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '0.8rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}>
                      <span style={{ color: 'var(--primary)' }}>{t.ticketId}</span>
                      <span className="badge badge-active" style={{ fontSize: '0.68rem' }}>{t.priority}</span>
                    </div>
                    <div style={{ fontWeight: 700, marginTop: '4px' }}>{t.subject}</div>
                    <div className="text-muted text-xs" style={{ marginTop: '2px' }}>{t.issuePath}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
