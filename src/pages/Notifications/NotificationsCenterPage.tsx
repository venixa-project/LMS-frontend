import React, { useState } from 'react';
import { useAuthStore } from '../../lib/store';
import { mockNotificationTemplates } from '../../data/mockData';
import { NotificationTemplate } from '../../types';
import {
  Bell, Mail, MessageSquare, Send, CheckCircle2, Clock,
  Edit2, Eye, Plus, ShieldCheck, X, Megaphone, AlertCircle, Trash2, Calendar
} from 'lucide-react';

interface Announcement {
  id: string;
  title: string;
  content: string;
  targetAudience: string;
  priority: 'normal' | 'important' | 'urgent';
  createdAt: string;
  author: string;
  channels: string[];
}

export const NotificationsCenterPage: React.FC = () => {
  const { user } = useAuthStore();
  const isOrgAdmin = user?.activeRole === 'org_admin';
  const isFaculty = user?.activeRole === 'instructor';
  const isLearner = user?.activeRole === 'learner';

  const [activeTab, setActiveTab] = useState<'announcements' | 'alerts' | 'templates' | 'logs' | 'channels'>(
    'announcements'
  );
  const [templates, setTemplates] = useState<NotificationTemplate[]>(mockNotificationTemplates);
  const [previewTemplate, setPreviewTemplate] = useState<NotificationTemplate | null>(null);

  // Institution announcements state
  const [announcements, setAnnouncements] = useState<Announcement[]>([
    {
      id: 'ann-1',
      title: 'Fall Semester 2026 Midterm Exam Schedule Released',
      content: 'The official schedule for midterm proctored assessments has been published. All students must ensure their system checks are completed 48 hours prior to examination start.',
      targetAudience: 'All Students & Faculty',
      priority: 'urgent',
      createdAt: '2026-10-16 10:00 AM',
      author: 'Academic Dean Office',
      channels: ['In-App Banner', 'Email Broadcast']
    },
    {
      id: 'ann-2',
      title: 'Campus Cloud Computing Lab Maintenance Window',
      content: 'Virtual sandbox environments and Docker runner nodes will undergo routine maintenance on Saturday, Oct 24th from 01:00 AM to 05:00 AM EST.',
      targetAudience: 'Computer Science Department',
      priority: 'important',
      createdAt: '2026-10-15 02:30 PM',
      author: 'IT Infrastructure Team',
      channels: ['In-App Banner']
    },
    {
      id: 'ann-3',
      title: 'Industry Guest Speaker Series: AI in Enterprise Systems',
      content: 'Join Dr. Emily Chen, Principal AI Architect, this Thursday at 4 PM for an interactive live webinar on transformer fine-tuning.',
      targetAudience: 'All Students',
      priority: 'normal',
      createdAt: '2026-10-14 11:15 AM',
      author: 'Student Affairs',
      channels: ['In-App Banner', 'Email Broadcast']
    }
  ]);

  // Modal state
  const [isNewAnnouncementOpen, setIsNewAnnouncementOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newAudience, setNewAudience] = useState(isFaculty ? 'All Assigned Students & Batches' : 'All Students & Faculty');
  const [newPriority, setNewPriority] = useState<'normal' | 'important' | 'urgent'>('normal');
  const [newInApp, setNewInApp] = useState(true);
  const [newEmail, setNewEmail] = useState(true);
  const [annSuccessMessage, setAnnSuccessMessage] = useState('');

  // Delivery logs mock
  const [deliveryLogs] = useState([
    { id: 'log-1', recipient: 'alex@lms.demo', event: 'course_enrollment', channel: 'email', status: 'delivered', attempts: 1, timestamp: '2026-10-16 09:30:12' },
    { id: 'log-2', recipient: 'alex@lms.demo', event: 'live_session_reminder', channel: 'in_app', status: 'delivered', attempts: 1, timestamp: '2026-10-16 08:00:00' },
    { id: 'log-3', recipient: 'daniel.wu@acmelearning.com', event: 'assessment_due_soon', channel: 'email', status: 'sent', attempts: 1, timestamp: '2026-10-15 16:45:00' },
    { id: 'log-4', recipient: 'kwame.m@acmelearning.com', event: 'invitation_issued', channel: 'email', status: 'delivered', attempts: 1, timestamp: '2026-10-15 11:20:15' },
  ]);

  const handleCreateAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    const channels: string[] = [];
    if (newInApp) channels.push('In-App Banner');
    if (newEmail) channels.push('Email Broadcast');

    const created: Announcement = {
      id: `ann-${Date.now()}`,
      title: newTitle.trim(),
      content: newContent.trim(),
      targetAudience: newAudience,
      priority: newPriority,
      createdAt: 'Just now',
      author: user?.displayName || (user ? `${user.firstName} ${user.lastName}` : 'Faculty Instructor'),
      channels: channels.length > 0 ? channels : ['In-App Banner']
    };

    setAnnouncements([created, ...announcements]);
    setIsNewAnnouncementOpen(false);
    setNewTitle('');
    setNewContent('');
    setAnnSuccessMessage(isFaculty ? 'Course announcement posted to assigned students (session demo)!' : 'Institution announcement broadcasted successfully (session demo)!');
    setTimeout(() => setAnnSuccessMessage(''), 4000);
  };

  const handleDeleteAnnouncement = (id: string) => {
    setAnnouncements(announcements.filter(a => a.id !== id));
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="badge badge-primary">Acme Learning Corp</span>
            {isOrgAdmin && <span className="badge badge-draft">Admin Operations</span>}
            {isFaculty && <span className="badge badge-success">Faculty Operations</span>}
            {isLearner && <span className="badge badge-active">Alex Thompson</span>}
          </div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '4px' }}>
            {isFaculty
              ? 'Teaching Announcements & Notifications'
              : isLearner
              ? 'Campus Announcements & Reminders'
              : 'Announcements & Notifications Hub'}
          </h1>
          <p className="text-secondary text-sm">
            {isFaculty
              ? 'Course bulletins, teaching alerts, and notifications for your assigned courses and batches.'
              : isLearner
              ? 'Campus bulletins, course announcements from faculty, and upcoming academic deadlines.'
              : 'Institution broadcast bulletins, automated event triggers, and delivery logs.'}
          </p>
        </div>

        {activeTab === 'announcements' && !isLearner && (
          <button
            className="btn btn-primary"
            onClick={() => setIsNewAnnouncementOpen(true)}
          >
            <Megaphone size={16} /> {isFaculty ? 'Broadcast Course Announcement' : 'Broadcast Announcement'}
          </button>
        )}

        {activeTab === 'templates' && !isFaculty && !isLearner && (
          <button
            className="btn btn-primary"
            onClick={() => alert("Creating custom notification trigger rule template (demo)")}
          >
            <Plus size={16} /> New Notification Trigger
          </button>
        )}
      </div>

      {annSuccessMessage && (
        <div style={{
          background: 'var(--success-bg)',
          border: '1px solid var(--success-border)',
          color: 'var(--success)',
          padding: '10px 16px',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.875rem',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <CheckCircle2 size={16} />
          <span>{annSuccessMessage}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs-nav">
        <button
          className={`tab-btn ${activeTab === 'announcements' ? 'active' : ''}`}
          onClick={() => setActiveTab('announcements')}
        >
          <Megaphone size={16} />
          {isLearner
            ? `Campus & Course Bulletins (${announcements.length})`
            : isFaculty
            ? `Course & Campus Bulletins (${announcements.length})`
            : `Institution Announcements (${announcements.length})`}
        </button>

        {isFaculty ? (
          <button
            className={`tab-btn ${activeTab === 'alerts' ? 'active' : ''}`}
            onClick={() => setActiveTab('alerts')}
          >
            <Bell size={16} />
            Class & Teaching Alerts (4)
          </button>
        ) : isLearner ? (
          <button
            className={`tab-btn ${activeTab === 'alerts' ? 'active' : ''}`}
            onClick={() => setActiveTab('alerts')}
          >
            <Bell size={16} />
            My Academic Reminders (4)
          </button>
        ) : (
          <>
            <button
              className={`tab-btn ${activeTab === 'templates' ? 'active' : ''}`}
              onClick={() => setActiveTab('templates')}
            >
              <Mail size={16} />
              Notification Templates ({templates.length})
            </button>
            <button
              className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
              onClick={() => setActiveTab('logs')}
            >
              <Send size={16} />
              Delivery Logs
            </button>
            <button
              className={`tab-btn ${activeTab === 'channels' ? 'active' : ''}`}
              onClick={() => setActiveTab('channels')}
            >
              <Bell size={16} />
              Channel Providers
            </button>
          </>
        )}
      </div>

      {/* TAB 1: ANNOUNCEMENTS */}
      {activeTab === 'announcements' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{
            background: 'rgba(59, 130, 246, 0.08)',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <Bell size={18} style={{ color: 'var(--primary)', flexShrink: 0 }} />
            <div>
              {isFaculty ? (
                <span><strong>Faculty Notice Board:</strong> View campus announcements from administration and publish course bulletins to your assigned student rosters.</span>
              ) : (
                <span><strong>Campus-Wide Communications:</strong> Announcements published here appear instantly on student & faculty dashboard notification feeds across Acme Learning Corp.</span>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
            {announcements.map((ann) => {
              const canDelete = !isLearner && (isOrgAdmin || ann.author === user?.displayName || ann.author.includes('Wilson') || ann.author === 'Faculty Instructor');
              return (
                <div key={ann.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <span className={`badge badge-${ann.priority === 'urgent' ? 'error' : ann.priority === 'important' ? 'warning' : 'primary'}`}>
                        {ann.priority.toUpperCase()}
                      </span>
                      {canDelete && (
                        <button
                          className="btn-icon"
                          onClick={() => handleDeleteAnnouncement(ann.id)}
                          title="Delete Announcement"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>

                    <h3 style={{ fontSize: '1.05rem', marginBottom: '8px', lineHeight: 1.4 }}>
                      {ann.title}
                    </h3>
                    <p className="text-secondary text-sm" style={{ marginBottom: '16px', lineHeight: 1.5 }}>
                      {ann.content}
                    </p>
                  </div>

                  <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.775rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                      <span>Target: <strong>{ann.targetAudience}</strong></span>
                      <span>{ann.createdAt}</span>
                    </div>

                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {ann.channels.map((ch) => (
                        <span key={ch} className="badge badge-draft" style={{ fontSize: '0.7rem' }}>
                          {ch}
                        </span>
                      ))}
                      <span className="text-muted text-xs" style={{ marginLeft: 'auto', alignSelf: 'center' }}>
                        By {ann.author}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB: ACADEMIC REMINDERS (STUDENT ONLY) */}
      {activeTab === 'alerts' && isLearner && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
            <div className="card" style={{ borderLeft: '4px solid var(--warning)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <span className="badge badge-warning">Assignment Due Soon</span>
                <span className="text-muted text-xs" style={{ marginLeft: 'auto' }}>Due Oct 31, 2026</span>
              </div>
              <h4 style={{ fontSize: '1rem', marginBottom: '6px' }}>Advanced React State Management Capstone</h4>
              <p className="text-secondary text-sm" style={{ marginBottom: '12px' }}>
                Your capstone deliverable (Offline Kanban Board) is due in 14 days. Deliverable format: GitHub repository with automated tests.
              </p>
              <a href="/assignments" className="btn btn-secondary btn-sm" style={{ width: 'fit-content' }}>
                View Assignment & Submit &rarr;
              </a>
            </div>

            <div className="card" style={{ borderLeft: '4px solid var(--primary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <span className="badge badge-primary">Upcoming Live Lecture</span>
                <span className="text-muted text-xs" style={{ marginLeft: 'auto' }}>Tomorrow 09:00 AM</span>
              </div>
              <h4 style={{ fontSize: '1rem', marginBottom: '6px' }}>Docker Container Orchestration & Health Checks</h4>
              <p className="text-secondary text-sm" style={{ marginBottom: '12px' }}>
                Live session led by Dr. James Wilson for Distributed Systems & Cloud Architecture. Room link verified on Zoom.
              </p>
              <a href="/my-sessions" className="btn btn-secondary btn-sm" style={{ width: 'fit-content' }}>
                Open Timetable & Join Room &rarr;
              </a>
            </div>

            <div className="card" style={{ borderLeft: '4px solid var(--success)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <span className="badge badge-success">Result Published</span>
                <span className="text-muted text-xs" style={{ marginLeft: 'auto' }}>Oct 15, 2026</span>
              </div>
              <h4 style={{ fontSize: '1rem', marginBottom: '6px' }}>Distributed Systems Capstone: 92/100 (Grade A)</h4>
              <p className="text-secondary text-sm" style={{ marginBottom: '12px' }}>
                Dr. James Wilson has evaluated your microservices submission. Faculty feedback and points are ready for review.
              </p>
              <a href="/my-results" className="btn btn-secondary btn-sm" style={{ width: 'fit-content' }}>
                Inspect Evaluation & Feedback &rarr;
              </a>
            </div>

            <div className="card" style={{ borderLeft: '4px solid var(--info)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <span className="badge badge-info">Proctoring Notice</span>
                <span className="text-muted text-xs" style={{ marginLeft: 'auto' }}>System Check</span>
              </div>
              <h4 style={{ fontSize: '1rem', marginBottom: '6px' }}>Midterm Exam Window Opening</h4>
              <p className="text-secondary text-sm" style={{ marginBottom: '12px' }}>
                Midterm assessments will require verified camera and screen recording authorization. Complete your system check beforehand.
              </p>
              <a href="/my-assessments" className="btn btn-secondary btn-sm" style={{ width: 'fit-content' }}>
                Assessments Portal &rarr;
              </a>
            </div>
          </div>
        </div>
      )}

      {/* TAB: TEACHING ALERTS (FACULTY ONLY) */}
      {activeTab === 'alerts' && isFaculty && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
            <div className="card" style={{ borderLeft: '4px solid var(--warning)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <span className="badge badge-warning">Grading SLA</span>
                <span className="text-muted text-xs" style={{ marginLeft: 'auto' }}>48h remaining</span>
              </div>
              <h4 style={{ fontSize: '1rem', marginBottom: '6px' }}>3 Submissions Awaiting Evaluation</h4>
              <p className="text-secondary text-sm" style={{ marginBottom: '12px' }}>
                Advanced React Capstone submissions submitted by Alex Thompson and 2 others are ready for scoring against the course rubric.
              </p>
              <a href="/grading" className="btn btn-secondary btn-sm" style={{ width: 'fit-content' }}>
                Open Grading Queue &rarr;
              </a>
            </div>

            <div className="card" style={{ borderLeft: '4px solid var(--primary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <span className="badge badge-primary">Lecture Schedule</span>
                <span className="text-muted text-xs" style={{ marginLeft: 'auto' }}>Tomorrow 10:00 AM</span>
              </div>
              <h4 style={{ fontSize: '1rem', marginBottom: '6px' }}>Live Class: State Machines & Async Hooks</h4>
              <p className="text-secondary text-sm" style={{ marginBottom: '12px' }}>
                Scheduled session for Spring 2026 Engineering cohort. Zoom room is verified and attendee roster contains 28 registered learners.
              </p>
              <a href="/live-sessions" className="btn btn-secondary btn-sm" style={{ width: 'fit-content' }}>
                View Timetable & Link &rarr;
              </a>
            </div>

            <div className="card" style={{ borderLeft: '4px solid var(--danger)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <span className="badge badge-danger">Attendance Check</span>
                <span className="text-muted text-xs" style={{ marginLeft: 'auto' }}>Action Needed</span>
              </div>
              <h4 style={{ fontSize: '1rem', marginBottom: '6px' }}>Attendance Warning: Summer 2026 Batch</h4>
              <p className="text-secondary text-sm" style={{ marginBottom: '12px' }}>
                2 learners have attendance rates below the institution 75% threshold in Cloud Infrastructure Engineering.
              </p>
              <a href="/attendance" className="btn btn-secondary btn-sm" style={{ width: 'fit-content' }}>
                Review Batch Attendance &rarr;
              </a>
            </div>

            <div className="card" style={{ borderLeft: '4px solid var(--success)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <span className="badge badge-success">Milestone</span>
                <span className="text-muted text-xs" style={{ marginLeft: 'auto' }}>Completed</span>
              </div>
              <h4 style={{ fontSize: '1rem', marginBottom: '6px' }}>Module 3 Quiz Completion Rate &gt;90%</h4>
              <p className="text-secondary text-sm" style={{ marginBottom: '12px' }}>
                24 of 26 students in Spring 2026 Engineering have completed the TypeScript Architecture Quiz with an average score of 89.4%.
              </p>
              <a href="/assessments" className="btn btn-secondary btn-sm" style={{ width: 'fit-content' }}>
                View Assessment Results &rarr;
              </a>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TEMPLATES */}
      {activeTab === 'templates' && (
        <div className="card">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Template Name</th>
                  <th>Event Trigger</th>
                  <th>Default Channels</th>
                  <th>Subject Line / Heading</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {templates.map((tpl) => (
                  <tr key={tpl.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{tpl.name}</div>
                      <div className="text-muted text-xs">ID: {tpl.id} &bull; v{tpl.version}</div>
                    </td>
                    <td>
                      <code style={{ fontSize: '0.8rem', background: 'var(--bg-input)', padding: '2px 6px', borderRadius: '4px' }}>
                        {tpl.eventTrigger}
                      </code>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {(tpl.channels || [tpl.channel || 'email']).map((ch) => (
                          <span key={ch} className="badge badge-primary" style={{ textTransform: 'capitalize' }}>
                            {ch}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>{tpl.subject}</td>
                    <td>
                      <span className={`badge badge-${tpl.enabled ?? tpl.isEnabled ?? true ? 'active' : 'draft'}`}>
                        {tpl.enabled ?? tpl.isEnabled ?? true ? 'Enabled' : 'Disabled'}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setPreviewTemplate(tpl)}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Eye size={14} /> Preview
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: LOGS */}
      {activeTab === 'logs' && (
        <div className="card">
          <div className="table-container">
            <table className="table" style={{ fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Event Type</th>
                  <th>Recipient</th>
                  <th>Channel</th>
                  <th>Delivery Status</th>
                </tr>
              </thead>
              <tbody>
                {deliveryLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="text-muted text-xs">{log.timestamp}</td>
                    <td><code>{log.event}</code></td>
                    <td>{log.recipient}</td>
                    <td><span className="badge badge-primary">{log.channel}</span></td>
                    <td>
                      <span className="badge badge-active" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle2 size={12} /> {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: CHANNELS */}
      {activeTab === 'channels' && (
        <div className="grid-3">
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <Mail size={24} color="var(--primary)" />
              <span className="badge badge-active">Active</span>
            </div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '6px' }}>Transactional Email (SendGrid / SMTP)</h3>
            <p className="text-secondary text-sm" style={{ marginBottom: '16px' }}>
              High-deliverability campus mail gateway with DKIM and SPF verification.
            </p>
            <button className="btn btn-secondary btn-sm">Configure Preferences</button>
          </div>

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <Bell size={24} color="var(--primary)" />
              <span className="badge badge-active">Active</span>
            </div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '6px' }}>In-App Web Push & Socket Alerts</h3>
            <p className="text-secondary text-sm" style={{ marginBottom: '16px' }}>
              Instant reactive notifications delivered directly to browser tabs in real-time.
            </p>
            <button className="btn btn-secondary btn-sm">Configure Preferences</button>
          </div>

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <MessageSquare size={24} color="var(--warning)" />
              <span className="badge badge-draft">Disabled</span>
            </div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '6px' }}>SMS & WhatsApp Notifications (Twilio)</h3>
            <p className="text-secondary text-sm" style={{ marginBottom: '16px' }}>
              High-priority live session start notifications and exam security codes.
            </p>
            <button className="btn btn-secondary btn-sm" onClick={() => alert("Enable in Integrations catalog")}>
              Connect Twilio
            </button>
          </div>
        </div>
      )}

      {/* Broadcast Announcement Modal */}
      {isNewAnnouncementOpen && (
        <div className="modal-overlay" onClick={() => setIsNewAnnouncementOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '620px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Megaphone size={18} style={{ color: 'var(--primary)' }} />
                <h3 style={{ fontSize: '1.15rem', margin: 0 }}>
                  {isFaculty ? 'Publish Course Announcement' : 'Broadcast Institution Announcement'}
                </h3>
              </div>
              <button onClick={() => setIsNewAnnouncementOpen(false)} style={{ color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateAnnouncement}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Announcement Title / Headline *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder={isFaculty ? "e.g. Lab Session 4 Extension & Solution Guide" : "e.g. End-of-Term Examination Protocols"}
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Target Audience *</label>
                    <select
                      className="form-select"
                      value={newAudience}
                      onChange={(e) => setNewAudience(e.target.value)}
                    >
                      {isFaculty ? (
                        <>
                          <option value="All Assigned Students & Batches">All Assigned Students & Batches</option>
                          <option value="Course: Advanced React & TypeScript Architecture">Course: Advanced React & TypeScript Architecture</option>
                          <option value="Course: JavaScript Fundamentals v3">Course: JavaScript Fundamentals v3</option>
                          <option value="Class: Spring 2026 Engineering">Class: Spring 2026 Engineering</option>
                          <option value="Class: Summer 2026 Cloud Architects">Class: Summer 2026 Cloud Architects</option>
                        </>
                      ) : (
                        <>
                          <option value="All Students & Faculty">All Students & Faculty</option>
                          <option value="All Students">All Students Only</option>
                          <option value="All Faculty">All Faculty Only</option>
                          <option value="Computer Science Department">Computer Science Department</option>
                          <option value="Data Science & AI Department">Data Science & AI Department</option>
                          <option value="Cybersecurity Cohort 2026">Cybersecurity Cohort 2026</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Priority Level *</label>
                    <select
                      className="form-select"
                      value={newPriority}
                      onChange={(e) => setNewPriority(e.target.value as any)}
                    >
                      <option value="normal">Normal Information</option>
                      <option value="important">Important Bulletin</option>
                      <option value="urgent">Urgent / Action Required</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Announcement Message Content *</label>
                  <textarea
                    className="form-textarea"
                    rows={4}
                    placeholder="Provide full details, deadlines, and instructions for campus members..."
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Broadcast Channels</label>
                  <div style={{ display: 'flex', gap: '20px', marginTop: '6px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                      <input
                        type="checkbox"
                        checked={newInApp}
                        onChange={(e) => setNewInApp(e.target.checked)}
                      />
                      <span>In-App Notification Banner</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                      <input
                        type="checkbox"
                        checked={newEmail}
                        onChange={(e) => setNewEmail(e.target.checked)}
                      />
                      <span>Email Blast to Roster</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsNewAnnouncementOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <Send size={16} /> Broadcast Now
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewTemplate && (
        <div className="modal-overlay" onClick={() => setPreviewTemplate(null)}>
          <div className="modal-card" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1rem', margin: 0 }}>Template Preview: {previewTemplate.name}</h3>
              <button onClick={() => setPreviewTemplate(null)} style={{ color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ background: 'var(--bg-input)', padding: '16px', borderRadius: 'var(--radius-md)', marginBottom: '16px' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Subject Preview:</div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>{previewTemplate.subject}</div>
              </div>
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', padding: '20px', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Rendered Body Content:</div>
                <p style={{ fontSize: '0.875rem', lineHeight: 1.6, margin: 0 }}>
                  {(previewTemplate.bodyTemplate || previewTemplate.body || '').replace('{{userName}}', 'Alex Rivera').replace('{{courseTitle}}', 'Fullstack React Architecture')}
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setPreviewTemplate(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
