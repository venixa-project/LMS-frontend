import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, PenTool, AlertCircle } from 'lucide-react';

export const PlatformOperationalAlerts: React.FC = () => {
  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Pending Approvals & Operational Alerts</h3>
          <p className="text-muted text-xs">Action items requiring administrative oversight or policy review</p>
        </div>
        <span className="badge badge-warning">3 Items Requiring Action</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BookOpen size={18} color="var(--warning)" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>2 Courses Pending Approval</div>
              <div className="text-muted text-xs">Submitted by faculty for catalog publication</div>
            </div>
          </div>
          <Link to="/courses" className="btn btn-secondary btn-sm">
            Review Courses &rarr;
          </Link>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <PenTool size={18} color="var(--primary)" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>18 Grading Tasks in Backlog</div>
              <div className="text-muted text-xs">Submissions awaiting trainer evaluation across active cohorts</div>
            </div>
          </div>
          <Link to="/grading" className="btn btn-secondary btn-sm">
            Open Grading Queue &rarr;
          </Link>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertCircle size={18} color="var(--danger)" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>2 Proctoring Incidents Flagged</div>
              <div className="text-muted text-xs">Candidate attempts flagged with suspicious audio/focus anomaly</div>
            </div>
          </div>
          <Link to="/proctoring" className="btn btn-secondary btn-sm">
            Inspect Incidents &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
};
