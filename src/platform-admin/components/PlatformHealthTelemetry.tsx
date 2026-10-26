import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { mockOrganizations } from '../../data/mockData';

export const PlatformHealthTelemetry: React.FC = () => {
  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Platform Health & Telemetry</h3>
          <p className="text-muted text-xs">Verified infrastructure & security status</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--success)' }}>
          <span className="pulse-indicator" /> Operational
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={16} color="var(--success)" />
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Multi-Tenant Isolation</span>
          </div>
          <span className="badge badge-active">{mockOrganizations.length} Orgs Active</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={16} color="var(--success)" />
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Global RBAC Matrix</span>
          </div>
          <span className="badge badge-active">Enforced</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={16} color="var(--success)" />
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Database & Cache Health</span>
          </div>
          <span className="badge badge-active">24ms Latency</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={16} color="var(--success)" />
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>AI Evaluation Engine</span>
          </div>
          <span className="badge badge-primary">Online</span>
        </div>
      </div>

      <div style={{ marginTop: '16px' }}>
        <Link to="/settings" className="btn btn-secondary btn-sm" style={{ width: '100%' }}>
          View Platform Settings & System Telemetry &rarr;
        </Link>
      </div>
    </div>
  );
};
