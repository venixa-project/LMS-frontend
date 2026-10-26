import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../lib/store';
import { RoleName } from '../types';
import { normalizeCanonicalRole } from '../lib/permissions';

interface Props {
  allowedRoles: RoleName[];
  children?: React.ReactNode;
}

export const RoleGuard: React.FC<Props> = ({ allowedRoles, children }) => {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();

  // If session verification is in-flight, show clean non-redirecting loading state
  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div className="pulse-indicator" style={{ width: '14px', height: '14px', margin: '0 auto 12px' }} />
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Verifying role authorization...</div>
        </div>
      </div>
    );
  }

  // If not authenticated or user profile missing, redirect to login while preserving return path
  if (!isAuthenticated || !user) {
    const redirectParam = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${redirectParam}`} replace />;
  }

  // Canonical role normalization
  const role = normalizeCanonicalRole(user.activeRole);
  const isAllowed = allowedRoles.includes(role) || allowedRoles.includes(user.activeRole);

  if (!isAllowed) {
    return <Navigate to="/dashboard" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};
