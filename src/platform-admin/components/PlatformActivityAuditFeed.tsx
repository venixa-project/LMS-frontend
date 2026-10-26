import React from 'react';
import { Link } from 'react-router-dom';
import { Activity } from 'lucide-react';
import { mockAuditEntries } from '../../data/mockData';

export const PlatformActivityAuditFeed: React.FC = () => {
  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Recent Platform Activity</h3>
          <p className="text-muted text-xs">Live governance and audit event stream</p>
        </div>
        <span className="text-muted text-xs font-semibold">Audit Stream</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {mockAuditEntries.slice(0, 5).map((entry) => (
          <div key={entry.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.825rem' }}>
            <div
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '6px',
                background: 'var(--primary-light)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: '2px',
                flexShrink: 0
              }}
            >
              <Activity size={13} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: 'var(--text-main)', lineHeight: 1.35, wordBreak: 'break-word' }}>
                <strong style={{ color: 'var(--text-main)' }}>{entry.actorName}</strong>: {entry.changeSummary}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                <span className="text-muted text-xs">
                  {entry.timestamp ? new Date(entry.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recently'}
                </span>
                <span className="badge badge-active" style={{ fontSize: '0.6rem', padding: '1px 5px' }}>
                  {entry.outcome}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
        <Link to="/reports" className="btn btn-secondary btn-sm" style={{ width: '100%' }}>
          View Full Audit & Activity Log &rarr;
        </Link>
      </div>
    </div>
  );
};
