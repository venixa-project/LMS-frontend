import React from 'react';
import { NavLink } from 'react-router-dom';
import { Building2, Network, UsersRound } from 'lucide-react';
import { useAuthStore } from '../lib/store';

interface StructureTenantsNavProps {
  className?: string;
}

export const StructureTenantsNav: React.FC<StructureTenantsNavProps> = ({ className = '' }) => {
  const { user } = useAuthStore();
  const isPlatformAdmin = user?.activeRole === 'platform_admin';

  // Only Platform Admin has access to global Organizations & Tenants.
  // Regular Admin / Institution Admin only manages institution-level Departments and Cohorts.
  const navTabs = isPlatformAdmin
    ? [
        { label: 'Organizations & Tenants', path: '/organizations', icon: Building2 },
        { label: 'Departments & Organization Hierarchy', path: '/departments', icon: Network },
        { label: 'Cohorts & Batches', path: '/cohorts', icon: UsersRound },
      ]
    : [
        { label: 'Departments & Organization Hierarchy', path: '/departments', icon: Network },
        { label: 'Cohorts & Batches', path: '/cohorts', icon: UsersRound },
      ];

  return (
    <nav
      aria-label="Structure & Tenants Navigation"
      className={`structure-tenants-nav ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '24px',
        flexWrap: 'wrap',
        borderBottom: '1px solid var(--border-subtle)',
        paddingBottom: '16px'
      }}
    >
      {navTabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <NavLink
            key={tab.path}
            to={tab.path}
            className={({ isActive }) => `btn structure-nav-btn ${isActive ? 'btn-primary active' : 'btn-secondary'}`}
            style={({ isActive }) => ({
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 18px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.875rem',
              fontWeight: 600,
              textDecoration: 'none',
              transition: 'var(--transition)',
              background: isActive
                ? 'linear-gradient(135deg, var(--primary), var(--accent-purple))'
                : 'var(--bg-card)',
              color: isActive ? '#ffffff' : 'var(--text-secondary)',
              border: isActive ? '1px solid transparent' : '1px solid var(--border-subtle)',
              boxShadow: isActive ? '0 2px 8px var(--primary-glow)' : 'none',
              cursor: 'pointer'
            })}
          >
            <Icon size={16} />
            <span>{tab.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
};
