import React from 'react';
import { Link } from 'react-router-dom';
import { Network, UsersRound, ArrowUpRight, Building2 } from 'lucide-react';
import { mockDepartments, mockCohorts } from '../../data/mockData';

export const InstitutionStructureOverview: React.FC = () => {
  const activeCohorts = mockCohorts.filter((c) => c.status === 'active');

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div className="dashboard-card-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="badge badge-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Network size={11} /> Academic Hierarchy
            </span>
            <span className="text-muted text-xs">Org Snapshot</span>
          </div>
          <h3 style={{ fontSize: '1.15rem', margin: 0, fontWeight: 700 }}>Academic Structure Overview</h3>
          <p className="text-secondary text-xs" style={{ margin: '2px 0 0 0' }}>
            Faculty departments and active class batch cohorts
          </p>
        </div>

        <Link
          to="/departments"
          className="btn btn-secondary btn-sm"
          style={{ fontSize: '0.75rem', padding: '5px 12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
        >
          Manage Structure <ArrowUpRight size={12} />
        </Link>
      </div>

      {/* Mini Summary Chips */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
        <div style={{ background: 'var(--bg-input)', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
            <span className="text-muted text-xs font-semibold">Departments</span>
            <Building2 size={13} color="var(--primary)" />
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main)' }}>
            {mockDepartments.length}
          </div>
          <span className="text-muted" style={{ fontSize: '0.675rem' }}>Active teaching faculties</span>
        </div>

        <div style={{ background: 'var(--bg-input)', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
            <span className="text-muted text-xs font-semibold">Active Batches</span>
            <UsersRound size={13} color="var(--accent-cyan)" />
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>
            {activeCohorts.length}
          </div>
          <span className="text-muted" style={{ fontSize: '0.675rem' }}>Enrolled student cohorts</span>
        </div>
      </div>

      {/* Key Departments List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
          Key Departments
        </div>
        {mockDepartments.slice(0, 3).map((dept) => (
          <div
            key={dept.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              background: 'var(--bg-input)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.8rem'
            }}
          >
            <div>
              <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{dept.name}</div>
              <span className="text-muted" style={{ fontSize: '0.675rem' }}>{dept.memberCount} enrolled members</span>
            </div>
            <span className="badge badge-active" style={{ fontSize: '0.65rem' }}>
              {dept.status}
            </span>
          </div>
        ))}
      </div>

      {/* Action Navigation Row */}
      <div style={{ marginTop: '14px', display: 'flex', gap: '8px' }}>
        <Link
          to="/departments"
          className="btn btn-secondary btn-sm"
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '0.75rem' }}
        >
          <Building2 size={12} /> Departments
        </Link>
        <Link
          to="/cohorts"
          className="btn btn-secondary btn-sm"
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '0.75rem' }}
        >
          <UsersRound size={12} /> Classes & Batches
        </Link>
      </div>
    </div>
  );
};
