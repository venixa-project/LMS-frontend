import { NavItem } from '../../lib/permissions';

export const adminNav: NavItem[] = [
  // Institution Academic Dashboard
  { id: 'dashboard', label: 'Institution Dashboard', icon: 'LayoutDashboard', path: '/dashboard', group: 'Main' },

  // Organisation Management
  { id: 'ca-company-profile', label: 'Company Profile', icon: 'Building2', path: '/organisation/company-profile', group: 'Organisation Management' },
  { id: 'ca-branches-locations', label: 'Branches & Locations', icon: 'MapPin', path: '/organisation/branches-locations', group: 'Organisation Management' },
  { id: 'ca-departments-designations', label: 'Departments & Designations', icon: 'Briefcase', path: '/organisation/departments-designations', group: 'Organisation Management' },
  { id: 'people', label: 'People & Faculty', icon: 'Users', path: '/people', group: 'Organisation Management' },
  { id: 'cohorts', label: 'Classes, Sections & Cohort Batches', icon: 'UsersRound', path: '/cohorts', group: 'Organisation Management' },

  // Curriculum & Teaching
  { id: 'courses', label: 'Courses & Catalog', icon: 'BookOpen', path: '/courses', group: 'Curriculum & Teaching' },
  { id: 'course-builder', label: 'Course Studio', icon: 'PenTool', path: '/course-builder', group: 'Curriculum & Teaching' },
  { id: 'learning-paths', label: 'Learning Paths', icon: 'Route', path: '/learning-paths', group: 'Curriculum & Teaching' },
  { id: 'enrollments', label: 'Enrollments Roster', icon: 'GraduationCap', path: '/enrollments', group: 'Curriculum & Teaching' },

  // Schedule & Attendance
  { id: 'calendar', label: 'Activity & Planner', icon: 'Calendar', path: '/calendar', group: 'Schedule & Attendance' },
  { id: 'timetable', label: 'Classes & Timetable', icon: 'Clock', path: '/classes-timetable', group: 'Schedule & Attendance' },
  { id: 'live-sessions', label: 'Live Sessions', icon: 'Video', path: '/live-sessions', group: 'Schedule & Attendance' },
  { id: 'recorded-classes', label: 'Recorded Classes', icon: 'Play', path: '/recorded-classes', group: 'Schedule & Attendance' },
  { id: 'attendance', label: 'Attendance Ledger', icon: 'UserCheck', path: '/attendance-ledger', group: 'Schedule & Attendance' },

  // Assessments & Evaluations
  { id: 'assessments', label: 'Assessments & Exams', icon: 'ClipboardCheck', path: '/assessments', group: 'Assessments & Grading' },
  { id: 'question-banks', label: 'Question Banks', icon: 'HelpCircle', path: '/question-banks', group: 'Assessments & Grading' },
  { id: 'grading', label: 'Grading Oversight', icon: 'PenTool', path: '/grading', group: 'Assessments & Grading' },
  { id: 'proctoring', label: 'Proctoring Security', icon: 'Eye', path: '/proctoring', group: 'Assessments & Grading' },

  // Credentials & Insights
  { id: 'certificates', label: 'Certificates', icon: 'Award', path: '/certificates', group: 'Reports & Settings' },
  { id: 'reports', label: 'Institution Reports', icon: 'BarChart3', path: '/reports', group: 'Reports & Settings' },
  { id: 'notifications', label: 'Announcements', icon: 'Bell', path: '/notifications', group: 'Reports & Settings' },
  { id: 'profile', label: 'Admin Profile', icon: 'User', path: '/profile', group: 'Account' },
];
