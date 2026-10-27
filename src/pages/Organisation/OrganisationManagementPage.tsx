import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Building2, MapPin, Briefcase, Network, Building } from 'lucide-react';
import { OrganisationProvider } from './context/OrganisationContext';
import { CompanyProfileView } from './components/CompanyProfileView';
import { BranchesManagementView } from './components/BranchesManagementView';
import { DepartmentsDesignationsView } from './components/DepartmentsDesignationsView';
import { TeamsHierarchyView } from './components/TeamsHierarchyView';
import { ToastContainer } from './components/ToastContainer';

interface Props {
  subNav?: 'ca-company-profile' | 'ca-branches-locations' | 'ca-departments-designations';
}

type SubNavKey = 'ca-company-profile' | 'ca-branches-locations' | 'ca-departments-designations';

interface NavOption {
  id: SubNavKey;
  label: string;
  path: string;
  icon: any;
  description: string;
}

const subNavItems: NavOption[] = [
  {
    id: 'ca-company-profile',
    label: 'Company Profile',
    path: '/organisation/company-profile',
    icon: Building2,
    description: 'Corporate entity parameters, CIN, GSTIN, registered office address, and operating currencies.',
  },
  {
    id: 'ca-branches-locations',
    label: 'Branches & Locations',
    path: '/organisation/branches-locations',
    icon: MapPin,
    description: 'Multi-city headquarters, branch networks, seating capacities, and timezones.',
  },
  {
    id: 'ca-departments-designations',
    label: 'Departments & Designations',
    path: '/organisation/departments-designations',
    icon: Briefcase,
    description: 'Functional business units, academic departments, and organizational hierarchy.',
  },
];

const OrganisationContent: React.FC<Props> = ({ subNav }) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Determine current active sub navigation from prop or URL
  const determineActiveSubNav = (): SubNavKey => {
    if (subNav) return subNav;
    const path = location.pathname;
    if (path.includes('branches')) return 'ca-branches-locations';
    if (path.includes('departments')) return 'ca-departments-designations';
    return 'ca-company-profile';
  };

  const [activeSubNav, setActiveSubNav] = useState<SubNavKey>(determineActiveSubNav);

  useEffect(() => {
    setActiveSubNav(determineActiveSubNav());
  }, [location.pathname, subNav]);

  const handleSubNavChange = (item: NavOption) => {
    setActiveSubNav(item.id);
    navigate(item.path);
  };

  const currentOption = subNavItems.find((i) => i.id === activeSubNav) || subNavItems[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingBottom: '2.5rem' }}>
      {/* Clean Page Header & Module Breadcrumb (Matching People & Faculty and Cohorts) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '3px 10px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 700,
                background: 'rgba(129, 140, 248, 0.12)',
                color: 'var(--brand-indigo, #5447FF)',
                border: '1px solid rgba(129, 140, 248, 0.25)',
              }}
            >
              Organisation Management
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Acme Learning Corp &bull; org-001</span>
          </div>
          <h1 style={{ fontSize: '1.75rem', margin: 0, fontWeight: 800, color: 'var(--text-main)' }}>
            {currentOption.label}
          </h1>
          <p style={{ margin: '4px 0 0 0', maxWidth: '780px', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            {currentOption.description}
          </p>
        </div>
      </div>

      {/* Sub-navigation Tabs Bar */}
      <div
        className="tabs-nav"
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '12px',
          marginBottom: '20px',
          overflowX: 'auto',
        }}
      >
        {subNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSubNav === item.id;

          return (
            <button
              key={item.id}
              type="button"
              id={`org-subnav-${item.id}`}
              onClick={() => handleSubNavChange(item)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 18px',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'var(--transition)',
                background: isActive
                  ? 'var(--brand-blue)'
                  : 'var(--bg-card)',
                color: isActive ? '#ffffff' : 'var(--text-secondary)',
                border: isActive
                  ? '1px solid var(--brand-blue)'
                  : '1px solid var(--border-subtle)',
                boxShadow: isActive ? '0 2px 8px rgba(37, 99, 235, 0.25)' : 'none',
                whiteSpace: 'nowrap',
              }}
            >
              <Icon size={16} color={isActive ? '#ffffff' : 'currentColor'} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Content View Container */}
      <div style={{ marginTop: '0.25rem' }}>
        {activeSubNav === 'ca-company-profile' && <CompanyProfileView />}
        {activeSubNav === 'ca-branches-locations' && <BranchesManagementView />}
        {activeSubNav === 'ca-departments-designations' && <DepartmentsDesignationsView />}
      </div>

      {/* Toast Notification Layer */}
      <ToastContainer />
    </div>
  );
};

export const OrganisationManagementPage: React.FC<Props> = (props) => {
  return (
    <OrganisationProvider>
      <OrganisationContent {...props} />
    </OrganisationProvider>
  );
};
