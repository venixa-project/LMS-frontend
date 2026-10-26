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
      {/* Top Banner & Module Breadcrumb */}
      <div
        style={{
          background: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)',
          borderRadius: '16px',
          padding: '1.5rem 1.75rem',
          color: '#ffffff',
          boxShadow: '0 10px 25px -5px rgba(6, 78, 59, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  background: 'rgba(255, 255, 255, 0.16)',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '20px',
                  backdropFilter: 'blur(4px)',
                }}
              >
                <Building size={12} /> Industrial Admin Console
              </span>
              <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>•</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, opacity: 0.9 }}>Organisation Management</span>
            </div>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
              {currentOption.label}
            </h1>
            <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.85rem', opacity: 0.9, maxWidth: '750px', lineHeight: 1.5 }}>
              {currentOption.description}
            </p>
          </div>
        </div>

        {/* Sub-navigation Tabs Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            overflowX: 'auto',
            paddingTop: '0.5rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.15)',
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
                  gap: '0.5rem',
                  padding: '0.55rem 1rem',
                  borderRadius: '10px',
                  border: 'none',
                  background: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.12)',
                  color: isActive ? '#064e3b' : '#ffffff',
                  fontSize: '0.825rem',
                  fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease-in-out',
                  whiteSpace: 'nowrap',
                  boxShadow: isActive ? '0 4px 12px rgba(0, 0, 0, 0.15)' : 'none',
                }}
              >
                <Icon size={15} color={isActive ? '#059669' : '#ffffff'} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
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
