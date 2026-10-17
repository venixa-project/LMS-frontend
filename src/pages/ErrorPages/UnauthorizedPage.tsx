import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Home, Shield } from 'lucide-react';
import { useAuthStore } from '../../lib/store';

export const UnauthorizedPage: React.FC = () => {
  const { user } = useAuthStore();

  return (
    <div style={{
      minHeight: '70vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: '24px'
    }}>
      <div style={{ maxWidth: '520px' }}>
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          background: 'var(--danger-bg)',
          color: 'var(--danger)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px'
        }}>
          <ShieldAlert size={40} />
        </div>

        <h1 style={{ fontSize: '3rem', fontWeight: 800, margin: 0, color: 'var(--danger)', letterSpacing: '-0.03em' }}>
          403
        </h1>
        <h2 style={{ fontSize: '1.4rem', marginBottom: '10px' }}>Access Denied &bull; Insufficient Permissions</h2>
        <p className="text-secondary text-sm" style={{ marginBottom: '16px', lineHeight: 1.5 }}>
          Your current active role (<strong>{user?.activeRole || 'Guest'}</strong>) does not have the required RBAC permission scope to view or mutate this resource.
        </p>

        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
          fontSize: '0.8rem',
          color: 'var(--text-muted)',
          marginBottom: '24px',
          textAlign: 'left'
        }}>
          <strong>Demo Notice:</strong> Use the <strong>Role Switcher</strong> at the top bar to test as <strong>Platform Admin</strong>, <strong>LMS Admin</strong>, or <strong>Instructor</strong>.
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
          <Link to="/dashboard" className="btn btn-primary">
            <Home size={15} /> Back to My Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};
