import React from 'react';
import { Link } from 'react-router-dom';
import { UsersRound, Route, Shield } from 'lucide-react';
import { mockDepartments } from '../../data/mockData';

export const InstitutionStructureSnapshot: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Academic Departments Overview */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Academic Structure</h3>
          <Link to="/departments" className="text-primary text-xs font-semibold">Manage &rarr;</Link>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {mockDepartments.map((d) => (
            <div key={d.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{d.name}</div>
                <span className="text-muted text-xs">{d.memberCount} enrolled members</span>
              </div>
              <span className="badge badge-active">{d.status}</span>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '14px', display: 'flex', gap: '8px' }}>
          <Link to="/cohorts" className="btn btn-secondary btn-sm" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <UsersRound size={14} /> Classes & Batches
          </Link>
          <Link to="/enrollments" className="btn btn-secondary btn-sm" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <Route size={14} /> Enrollments
          </Link>
        </div>
      </div>

      {/* Multi-Tenant Governance Notice */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        padding: '16px',
        fontSize: '0.75rem',
        color: 'var(--text-secondary)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', color: 'var(--primary)', fontWeight: 700 }}>
          <Shield size={15} /> Institution Boundary Enforcement
        </div>
        <p style={{ margin: 0, lineHeight: 1.4 }}>
          All student records, faculty rosters, course materials, and grade distributions shown here are strictly isolated to this institution tenant. Cross-tenant access is restricted by policy.
        </p>
      </div>
    </div>
  );
};
