import { NavItem } from '../../lib/permissions';

export const adminNav: NavItem[] = [
  // 1. Institution Dashboard
  { id: 'dashboard', label: 'Institution Dashboard', icon: 'LayoutDashboard', path: '/dashboard', group: 'Main' },

  // 2. Organisation Management
  { id: 'ca-company-profile', label: 'Company Profile', icon: 'Building2', path: '/organisation/company-profile', group: 'Organisation Management' },
  { id: 'people', label: 'People & Faculty', icon: 'Users', path: '/people', group: 'Organisation Management' },
  { id: 'cohorts', label: 'Classes, Sections & Cohort Batches', icon: 'UsersRound', path: '/cohorts', group: 'Organisation Management' },

  // 3. Curriculum & Teaching
  { id: 'courses', label: 'Course Catalogue', icon: 'BookOpen', path: '/courses', group: 'Curriculum & Teaching' },
  { id: 'course-builder', label: 'Course Builder', icon: 'PenTool', path: '/course-builder', group: 'Curriculum & Teaching' },
  { id: 'learning-paths', label: 'Learning Paths', icon: 'Route', path: '/learning-paths', group: 'Curriculum & Teaching' },
  { id: 'enrollments', label: 'Enrollments Roster', icon: 'GraduationCap', path: '/enrollments', group: 'Curriculum & Teaching' },
  { id: 'leaderboard', label: 'Academic Leaderboard', icon: 'Trophy', path: '/leaderboard', group: 'Curriculum & Teaching' },

  // 4. Schedule & Attendance
  { id: 'calendar', label: 'Activity & Planner', icon: 'Calendar', path: '/calendar', group: 'Schedule & Attendance' },
  { id: 'timetable', label: 'Classes & Timetable', icon: 'Clock', path: '/classes-timetable', group: 'Schedule & Attendance' },
  { id: 'live-sessions', label: 'Live Sessions', icon: 'Video', path: '/live-sessions', group: 'Schedule & Attendance' },
  { id: 'recorded-classes', label: 'Recorded Classes', icon: 'Play', path: '/recorded-classes', group: 'Schedule & Attendance' },
  { id: 'attendance', label: 'Live Session Attendance', icon: 'UserCheck', path: '/attendance-ledger', group: 'Schedule & Attendance' },

  // 5. Assessments & Evaluation
  { id: 'assessments', label: 'Assessments & Quizzes', icon: 'ClipboardCheck', path: '/assessments', group: 'Assessments & Evaluation' },
  { id: 'question-banks', label: 'Question Banks', icon: 'HelpCircle', path: '/question-banks', group: 'Assessments & Evaluation' },
  { id: 'assignments', label: 'Student Assignments', icon: 'Award', path: '/assignments', group: 'Assessments & Evaluation' },
  { id: 'grading', label: 'AI Evaluation / Grading Oversight', icon: 'PenTool', path: '/grading', group: 'Assessments & Evaluation' },
  { id: 'proctoring', label: 'Proctoring Incident Center', icon: 'Eye', path: '/proctoring', group: 'Assessments & Evaluation' },

  // 6. Reports & Analytics
  { id: 'reports', label: 'Institution Reports', icon: 'BarChart3', path: '/reports', group: 'Reports & Analytics' },

  // 7. Certificates & Credentials
  { id: 'certificates', label: 'Certificate Management', icon: 'Award', path: '/certificates', group: 'Certificates & Credentials' },

  // 8. Communications
  { id: 'notifications', label: 'Announcements', icon: 'Bell', path: '/notifications', group: 'Communications' },

  // 9. Account
  { id: 'profile', label: 'Admin Profile', icon: 'User', path: '/profile', group: 'Account' },
];
