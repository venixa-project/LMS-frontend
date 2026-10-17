import React, { useState } from 'react';
import { mockIntegrations } from '../../data/mockData';
import { Integration } from '../../types';
import {
  Plug, CheckCircle2, AlertCircle, RefreshCw, KeyRound,
  Shield, ExternalLink, Code2, Copy, Eye, EyeOff, Plus, X
} from 'lucide-react';

export const IntegrationsPage: React.FC = () => {
  const [integrations, setIntegrations] = useState<Integration[]>(mockIntegrations);
  const [activeTab, setActiveTab] = useState<'catalog' | 'webhooks' | 'apikeys'>('catalog');
  const [testingId, setTestingId] = useState<string | null>(null);

  // Webhook state
  const [webhookUrl, setWebhookUrl] = useState('https://enterprise.company.com/webhooks/lms-events');
  const [secretMasked, setSecretMasked] = useState(true);

  const handleTestConnection = (id: string) => {
    setTestingId(id);
    setTimeout(() => {
      setTestingId(null);
      alert('Simulated Ping Success: Integration endpoint verified healthy with latency 42ms.');
    }, 1200);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '4px' }}>Integrations, Webhooks & APIs</h1>
          <p className="text-secondary text-sm">Connect enterprise identity providers, conferencing tools, AI reasoning models, and outward webhooks</p>
        </div>

        <div style={{
          background: 'rgba(99, 102, 241, 0.15)',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          color: 'var(--primary)',
          padding: '6px 14px',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.8rem',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontWeight: 600
        }}>
          <Plug size={14} />
          <span>Integration Sandbox Mode (All API keys masked & synthetic)</span>
        </div>
      </div>

      <div className="tabs-nav">
        <button
          className={`tab-btn ${activeTab === 'catalog' ? 'active' : ''}`}
          onClick={() => setActiveTab('catalog')}
        >
          <Plug size={16} />
          Integration Directory ({integrations.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'webhooks' ? 'active' : ''}`}
          onClick={() => setActiveTab('webhooks')}
        >
          <Code2 size={16} />
          Outbound Webhooks
        </button>
        <button
          className={`tab-btn ${activeTab === 'apikeys' ? 'active' : ''}`}
          onClick={() => setActiveTab('apikeys')}
        >
          <KeyRound size={16} />
          API Keys & Access Tokens
        </button>
      </div>

      {activeTab === 'catalog' && (
        <div className="grid-2">
          {integrations.map((item) => (
            <div
              key={item.id}
              className="card"
              style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span className="badge badge-primary" style={{ textTransform: 'capitalize' }}>
                    {item.type}
                  </span>
                  <span className={`badge badge-${item.status === 'healthy' || item.status === 'configured' ? 'active' : 'draft'}`}>
                    {item.status.replace('_', ' ')}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.2rem', marginBottom: '6px' }}>{item.name}</h3>
                <p className="text-secondary text-sm" style={{ marginBottom: '16px' }}>
                  {item.description}
                </p>

                <div style={{
                  background: 'var(--bg-input)',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.8rem',
                  marginBottom: '16px'
                }}>
                  <div>
                    <span className="text-muted text-xs">Environment:</span>
                    <div style={{ fontWeight: 600 }}>Production</div>
                  </div>
                  <div>
                    <span className="text-muted text-xs">Last Ping Check:</span>
                    <div style={{ fontWeight: 600 }}>
                      {item.lastSync ? new Date(item.lastSync).toLocaleDateString() : 'Never'}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--border-subtle)', paddingTop: '14px' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ flex: 1 }}
                  disabled={testingId === item.id}
                  onClick={() => handleTestConnection(item.id)}
                >
                  <RefreshCw size={13} className={testingId === item.id ? 'spin' : ''} />
                  {testingId === item.id ? 'Testing...' : 'Test Connection'}
                </button>

                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => alert(`Configuring credential scopes for ${item.name}`)}
                >
                  Configure
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'webhooks' && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Subscribed Event Webhooks</h3>
              <p className="text-secondary text-sm">Dispatches HMAC SHA-256 signed event payloads to your internal servers</p>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => alert("Add webhook endpoint dialog")}>
              <Plus size={14} /> Add Endpoint
            </button>
          </div>

          <div style={{
            background: 'var(--bg-input)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            marginBottom: '16px'
          }}>
            <div className="form-group">
              <label className="form-label">Endpoint URL</label>
              <input
                type="text"
                className="form-input"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Webhook Signing Secret</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type={secretMasked ? 'password' : 'text'}
                  disabled
                  className="form-input"
                  value="whsec_9f82b7c4a10e8d3170a45b6f"
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}
                />
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setSecretMasked(!secretMasked)}
                >
                  {secretMasked ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => alert("Copied signing secret to clipboard")}
                >
                  <Copy size={14} />
                </button>
              </div>
            </div>

            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Subscribed Events: <code>course.completed</code>, <code>assessment.submitted</code>, <code>user.enrolled</code>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'apikeys' && (
        <div className="card">
          <h3 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>Service Account API Keys</h3>
          <p className="text-secondary text-sm" style={{ marginBottom: '16px' }}>
            Use bearer tokens to access headless LMS APIs, enroll users programmatically, or export analytics.
          </p>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Key Name</th>
                  <th>Prefix / Identifier</th>
                  <th>Scope</th>
                  <th>Created</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>HRIS Synchronization Worker</td>
                  <td><code>lms_live_48f9...</code></td>
                  <td><span className="badge badge-primary">read:users, write:enrollments</span></td>
                  <td className="text-muted text-xs">2026-08-10</td>
                  <td>
                    <button className="btn btn-secondary btn-sm" onClick={() => alert("Rotated key secret.")}>
                      Rotate Key
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
