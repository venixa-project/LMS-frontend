import React, { useState } from 'react';
import { mockNotificationTemplates } from '../../data/mockData';
import { NotificationTemplate } from '../../types';
import {
  Bell, Mail, MessageSquare, Send, CheckCircle2, Clock,
  Edit2, Eye, Plus, ShieldCheck, X
} from 'lucide-react';

export const NotificationsCenterPage: React.FC = () => {
  const [templates, setTemplates] = useState<NotificationTemplate[]>(mockNotificationTemplates);
  const [activeTab, setActiveTab] = useState<'templates' | 'logs' | 'channels'>('templates');
  const [previewTemplate, setPreviewTemplate] = useState<NotificationTemplate | null>(null);

  // Delivery logs mock
  const [deliveryLogs] = useState([
    { id: 'log-1', recipient: 'alex@lms.demo', event: 'course_enrollment', channel: 'email', status: 'delivered', attempts: 1, timestamp: '2026-10-16 09:30:12' },
    { id: 'log-2', recipient: 'alex@lms.demo', event: 'live_session_reminder', channel: 'in_app', status: 'delivered', attempts: 1, timestamp: '2026-10-16 08:00:00' },
    { id: 'log-3', recipient: 'daniel.wu@acmelearning.com', event: 'assessment_due_soon', channel: 'email', status: 'sent', attempts: 1, timestamp: '2026-10-15 16:45:00' },
    { id: 'log-4', recipient: 'kwame.m@acmelearning.com', event: 'invitation_issued', channel: 'email', status: 'delivered', attempts: 1, timestamp: '2026-10-15 11:20:15' },
  ]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '4px' }}>Notification Center & Delivery Hub</h1>
          <p className="text-secondary text-sm">Automated transactional email templates, in-app alerts, and provider delivery logs</p>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => alert("Creating custom notification trigger rule template")}
        >
          <Plus size={16} /> New Notification Trigger
        </button>
      </div>

      <div className="tabs-nav">
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
      </div>

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
                      >
                        <Eye size={13} /> Test Preview
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="card">
          <h3 style={{ fontSize: '1.1rem', marginBottom: '14px' }}>Real-Time Dispatch & Delivery Logs</h3>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Recipient</th>
                  <th>Event Trigger</th>
                  <th>Channel</th>
                  <th>Attempts</th>
                  <th>Delivery Status</th>
                </tr>
              </thead>
              <tbody>
                {deliveryLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="text-muted text-xs">{log.timestamp}</td>
                    <td style={{ fontWeight: 600 }}>{log.recipient}</td>
                    <td><code>{log.event}</code></td>
                    <td><span className="badge badge-primary">{log.channel}</span></td>
                    <td>{log.attempts} attempt</td>
                    <td>
                      <span className={`badge badge-${log.status === 'delivered' ? 'active' : 'primary'}`}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'channels' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <Mail size={24} color="var(--primary)" />
              <span className="badge badge-active">Connected (Mock)</span>
            </div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '6px' }}>Transactional Email (SendGrid / AWS SES)</h3>
            <p className="text-secondary text-sm" style={{ marginBottom: '16px' }}>
              Dispatches account invites, assignment due dates, and grading score release notices.
            </p>
            <button className="btn btn-secondary btn-sm" onClick={() => alert("Simulated SendGrid API test passed.")}>
              Test Provider Ping
            </button>
          </div>

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <Bell size={24} color="var(--accent-cyan)" />
              <span className="badge badge-active">Active</span>
            </div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '6px' }}>In-App WebSocket Alerts</h3>
            <p className="text-secondary text-sm" style={{ marginBottom: '16px' }}>
              Real-time badge counter and browser desktop toasts for instant classroom alerts.
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
