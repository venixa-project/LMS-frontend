import React from 'react';
import { Link } from 'react-router-dom';
import { PlatformKPIGrid } from '../components/PlatformKPIGrid';
import { PlatformAnalyticsChart } from '../components/PlatformAnalyticsChart';
import { PlatformOperationalAlerts } from '../components/PlatformOperationalAlerts';
import { PlatformHealthTelemetry } from '../components/PlatformHealthTelemetry';
import { PlatformActivityAuditFeed } from '../components/PlatformActivityAuditFeed';

export const PlatformDashboardPage: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Top Header & Context Metadata */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="badge badge-primary">
              Platform Admin Perspective
            </span>
            <span className="text-muted text-xs">Global Controller &bull; Multi-Tenant Operations</span>
          </div>
          <h1 style={{ fontSize: '1.8rem', margin: 0 }}>Platform Administration & Operations Center</h1>
          <p className="text-secondary text-sm">
            System-wide multi-tenancy, academic hierarchy, user directory, global RBAC policies, and health telemetry
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <Link to="/reports" className="btn btn-secondary">
            Analytics & Reports
          </Link>
        </div>
      </div>

      {/* Prioritized Platform KPI Cards */}
      <PlatformKPIGrid />

      {/* Main Two Column Platform Layout */}
      <div className="dashboard-main-grid">
        {/* Left Column: Analytics Chart + Operational Alerts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <PlatformAnalyticsChart />
          <PlatformOperationalAlerts />
        </div>

        {/* Right Column: Platform Health & Telemetry + Live Audit Trail */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <PlatformHealthTelemetry />
          <PlatformActivityAuditFeed />
        </div>
      </div>
    </div>
  );
};
