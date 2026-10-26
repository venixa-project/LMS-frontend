import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

const routeNames: Record<string, string> = {
  dashboard: 'Dashboard',
  organizations: 'Organizations',
  departments: 'Departments & Hierarchy',
  people: 'People & Directory',
  students: 'Students Directory',
  faculty: 'Faculty Directory',
  cohorts: 'Cohorts',
  roles: 'Roles & Permissions',
  courses: 'Courses',
  'my-learning': 'My Enrolled Courses',
  'learning-paths': 'Learning Paths',
  'my-paths': 'My Learning Paths & Progress',
  leaderboard: 'Academic Leaderboard',
  'live-sessions': 'Live Classes & Webinars',
  'my-sessions': 'Timetable & Live Sessions',
  momentum: 'Your Learning Momentum',
  'login-history': 'Your Learning Momentum & Login History',
  attendance: 'Attendance Record',
  'question-banks': 'Question Banks',
  assignments: 'Course Assignments',
  assessments: 'Assessments & Quizzes',
  'my-assessments': 'Quizzes & Timed Exams',
  'my-results': 'Academic Results & Grades',
  grading: 'Grading & Moderation',
  proctoring: 'Proctoring Center',
  certificates: 'Certificates & Credentials',
  'my-certificates': 'Diplomas & Certificates',
  reports: 'Reports & Analytics',
  notifications: 'Notification Center',
  integrations: 'Integrations & APIs',
  settings: 'Platform Settings',
  profile: 'My Profile',
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
