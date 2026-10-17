import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

const routeNames: Record<string, string> = {
  dashboard: 'Dashboard',
  organizations: 'Organizations',
  departments: 'Departments & Hierarchy',
  people: 'People & Directory',
  cohorts: 'Cohorts',
  roles: 'Roles & Permissions',
  courses: 'Course Management',
  'learning-paths': 'Learning Paths',
  'live-sessions': 'Live Classes',
  'question-banks': 'Question Banks',
  assessments: 'Assessments & Quizzes',
  grading: 'Grading & Moderation',
  proctoring: 'Proctoring Center',
  certificates: 'Certificates & Credentials',
  reports: 'Reports & Analytics',
  notifications: 'Notification Center',
  integrations: 'Integrations & APIs',
  settings: 'Platform Settings',
  profile: 'My Profile',
  'my-learning': 'My Learning',
  'my-assessments': 'My Assessments',
  'my-sessions': 'My Live Classes',
  'my-certificates': 'My Certificates',
  'my-results': 'Assessment Results'
};

export const Breadcrumbs: React.FC = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  if (pathnames.length === 0 || pathnames[0] === 'dashboard') {
    return null;
  }

  return (
    <nav style={{
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      fontSize: '0.8rem',
      color: 'var(--text-muted)',
      marginBottom: '16px'
    }}>
      <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)' }}>
        <Home size={14} />
        <span>Home</span>
      </Link>

      {pathnames.map((segment, index) => {
        const routeTo = `/${pathnames.slice(0, index + 1).join('/')}`;
        const isLast = index === pathnames.length - 1;
        const displayName = routeNames[segment] || segment.replace(/-/g, ' ');

        return (
          <React.Fragment key={routeTo}>
            <ChevronRight size={14} />
            {isLast ? (
              <span style={{ color: 'var(--text-main)', fontWeight: 600, textTransform: 'capitalize' }}>
                {displayName}
              </span>
            ) : (
              <Link to={routeTo} style={{ color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                {displayName}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
