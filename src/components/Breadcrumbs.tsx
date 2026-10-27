import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

const routeNames: Record<string, string> = {
  dashboard: 'Dashboard',
  organizations: 'Organizations & Tenants',
  organisation: 'Organisation Management',
  'company-profile': 'Company Profile',
  'branches-locations': 'Branches & Locations',
  'departments-designations': 'Departments & Designations',
  departments: 'Departments & Designations',
  people: 'People & Faculty',
  students: 'Students',
  faculty: 'Faculty & Trainers',
  cohorts: 'Classes, Sections & Cohort Batches',
  roles: 'Roles & Permissions',
  courses: 'Courses & Catalog',
  'course-builder': 'Course Studio',
  'learning-paths': 'Learning Paths',
  enrollments: 'Enrollments Roster',
  calendar: 'Activity & Planner',
  timetable: 'Classes & Timetable',
  'weekly-timetable': 'My Weekly Timetable',
  'classes-timetable': 'Classes & Timetable',
  'live-sessions': 'Live Sessions',
  'my-sessions': 'Timetable & Live Lessons',
  'recorded-classes': 'Recorded Classes',
  recordings: 'Recorded Classes',
  attendance: 'Attendance Ledger',
  'attendance-ledger': 'Attendance Ledger',
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
        const parentSegment = index > 0 ? pathnames[index - 1] : '';

        let displayName = routeNames[segment] || segment.replace(/-/g, ' ');
        if (segment === 'new') {
          if (parentSegment === 'cohorts') displayName = 'Create New Cohort';
          else if (parentSegment === 'people' || parentSegment === 'students' || parentSegment === 'faculty') displayName = 'Add Person';
          else displayName = 'Create';
        } else if (segment === 'edit') {
          displayName = 'Edit Profile';
        } else if (segment.startsWith('u-')) {
          displayName = 'Member Details';
        }

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
