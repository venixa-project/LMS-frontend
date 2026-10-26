// ============================================================
// LMS - Centralized RBAC & Permission Helpers
// ============================================================
import { Permission, PermissionAction, PermissionResource, PermissionScope, RoleName } from '../types';

// Permission definitions by role - comprehensive matrix
// Permission definitions by role - 3 Core Roles: platform_admin, trainer, student
const PLATFORM_ADMIN_PERMISSIONS: Permission[] = [
  { id: 'pa-1', resource: 'platform_settings', action: 'configure', scope: 'global', description: 'Configure platform settings' },
  { id: 'pa-2', resource: 'organizations', action: 'create', scope: 'global', description: 'Create organizations' },
  { id: 'pa-3', resource: 'organizations', action: 'edit', scope: 'global', description: 'Edit any organization' },
  { id: 'pa-4', resource: 'organizations', action: 'view', scope: 'global', description: 'View all organizations' },
  { id: 'pa-5', resource: 'organizations', action: 'archive', scope: 'global', description: 'Archive organizations' },
  { id: 'pa-6', resource: 'users', action: 'view', scope: 'global', description: 'View all users' },
  { id: 'pa-7', resource: 'users', action: 'create', scope: 'global', description: 'Create users' },
  { id: 'pa-8', resource: 'users', action: 'edit', scope: 'global', description: 'Edit users' },
  { id: 'pa-9', resource: 'roles', action: 'view', scope: 'global', description: 'View all roles' },
  { id: 'pa-10', resource: 'roles', action: 'create', scope: 'global', description: 'Create roles' },
  { id: 'pa-11', resource: 'roles', action: 'edit', scope: 'global', description: 'Edit roles' },
  { id: 'pa-12', resource: 'integrations', action: 'configure', scope: 'global', description: 'Configure integrations' },
  { id: 'pa-13', resource: 'integrations', action: 'view', scope: 'global', description: 'View integrations' },
  { id: 'pa-14', resource: 'reports', action: 'view', scope: 'global', description: 'View all reports' },
  { id: 'pa-15', resource: 'reports', action: 'export', scope: 'global', description: 'Export reports' },
  { id: 'pa-16', resource: 'courses', action: 'view', scope: 'global', description: 'View all courses' },
  { id: 'pa-17', resource: 'courses', action: 'publish', scope: 'global', description: 'Publish courses' },
  { id: 'pa-18', resource: 'courses', action: 'create', scope: 'global', description: 'Create courses' },
  { id: 'pa-19', resource: 'courses', action: 'edit', scope: 'global', description: 'Edit courses' },
  { id: 'pa-20', resource: 'assessments', action: 'view', scope: 'global', description: 'View all assessments' },
  { id: 'pa-21', resource: 'notifications', action: 'configure', scope: 'global', description: 'Configure notifications' },
  { id: 'pa-22', resource: 'proctoring', action: 'configure', scope: 'global', description: 'Configure proctoring' },
  { id: 'pa-23', resource: 'certificates', action: 'configure', scope: 'global', description: 'Configure certificates' },
  { id: 'pa-24', resource: 'departments', action: 'view', scope: 'global', description: 'View departments' },
  { id: 'pa-25', resource: 'cohorts', action: 'view', scope: 'global', description: 'View cohorts' },
  { id: 'pa-26', resource: 'grading', action: 'view', scope: 'global', description: 'View grading', riskLevel: 'high' },
];

const TRAINER_PERMISSIONS: Permission[] = [
  { id: 'tr-1', resource: 'courses', action: 'view', scope: 'assigned', description: 'View assigned courses' },
  { id: 'tr-2', resource: 'courses', action: 'create', scope: 'assigned', description: 'Create and author courses' },
  { id: 'tr-3', resource: 'courses', action: 'edit', scope: 'assigned', description: 'Edit assigned courses' },
  { id: 'tr-4', resource: 'courses', action: 'publish', scope: 'assigned', description: 'Publish courses' },
  { id: 'tr-5', resource: 'cohorts', action: 'view', scope: 'assigned', description: 'View assigned classes & cohorts' },
  { id: 'tr-6', resource: 'users', action: 'view', scope: 'assigned', description: 'View students in assigned classes' },
  { id: 'tr-7', resource: 'live_sessions', action: 'view', scope: 'assigned', description: 'View live classes' },
  { id: 'tr-8', resource: 'live_sessions', action: 'create', scope: 'assigned', description: 'Schedule live sessions' },
  { id: 'tr-9', resource: 'live_sessions', action: 'edit', scope: 'assigned', description: 'Manage attendance and rosters' },
  { id: 'tr-10', resource: 'reports', action: 'view', scope: 'assigned', description: 'View student performance reports' },
  { id: 'tr-11', resource: 'question_banks', action: 'view', scope: 'assigned', description: 'View question banks' },
  { id: 'tr-12', resource: 'question_banks', action: 'create', scope: 'assigned', description: 'Create question banks' },
  { id: 'tr-13', resource: 'question_banks', action: 'edit', scope: 'assigned', description: 'Edit question banks' },
  { id: 'tr-14', resource: 'assessments', action: 'view', scope: 'assigned', description: 'View assessments' },
  { id: 'tr-15', resource: 'assessments', action: 'create', scope: 'assigned', description: 'Create quizzes and exams' },
  { id: 'tr-16', resource: 'assessments', action: 'edit', scope: 'assigned', description: 'Edit assessments' },
  { id: 'tr-17', resource: 'assessments', action: 'publish', scope: 'assigned', description: 'Publish assessments' },
  { id: 'tr-18', resource: 'grading', action: 'view', scope: 'assigned', description: 'View grading queue' },
  { id: 'tr-19', resource: 'grading', action: 'grade', scope: 'assigned', description: 'Grade student submissions & AI review' },
  { id: 'tr-20', resource: 'submissions', action: 'view', scope: 'assigned', description: 'View student submissions' },
  { id: 'tr-21', resource: 'lessons', action: 'create', scope: 'assigned', description: 'Create learning materials' },
  { id: 'tr-22', resource: 'lessons', action: 'edit', scope: 'assigned', description: 'Edit learning materials' },
  { id: 'tr-23', resource: 'proctoring', action: 'review', scope: 'assigned', description: 'Review proctoring incidents' },
  { id: 'tr-24', resource: 'notifications', action: 'view', scope: 'assigned', description: 'View and post notifications' },
];

const STUDENT_PERMISSIONS: Permission[] = [
  { id: 'st-1', resource: 'courses', action: 'view', scope: 'own', description: 'View enrolled courses' },
  { id: 'st-2', resource: 'lessons', action: 'view', scope: 'own', description: 'View lesson materials and videos' },
  { id: 'st-3', resource: 'paths', action: 'view', scope: 'own', description: 'View learning paths and progress' },
  { id: 'st-4', resource: 'assessments', action: 'view', scope: 'own', description: 'Take scheduled assessments & exams' },
  { id: 'st-5', resource: 'live_sessions', action: 'view', scope: 'own', description: 'View live classes and join webinars' },
  { id: 'st-6', resource: 'submissions', action: 'view', scope: 'own', description: 'Submit assignments and view grades' },
  { id: 'st-7', resource: 'certificates', action: 'view', scope: 'own', description: 'View and download earned certificates' },
  { id: 'st-8', resource: 'notifications', action: 'view', scope: 'own', description: 'View academic notifications' },
];

const ROLE_PERMISSIONS: Record<RoleName, Permission[]> = {
  // 3 Core Canonical Roles
  platform_admin: PLATFORM_ADMIN_PERMISSIONS,
  trainer: TRAINER_PERMISSIONS,
  student: STUDENT_PERMISSIONS,

  // Legacy mappings for backward compatibility
  org_admin: PLATFORM_ADMIN_PERMISSIONS,
  lms_admin: PLATFORM_ADMIN_PERMISSIONS,
  instructor: TRAINER_PERMISSIONS,
  assessment_author: TRAINER_PERMISSIONS,
  grader: TRAINER_PERMISSIONS,
  learner: STUDENT_PERMISSIONS,
  guest: STUDENT_PERMISSIONS,
  bot_ai: [],
};

// All permissions grouped by module for the permission matrix
export const PERMISSION_GROUPS: Record<string, { resource: PermissionResource; actions: PermissionAction[] }> = {
  'User Management': { resource: 'users', actions: ['view', 'create', 'edit', 'archive', 'invite', 'enroll'] },
  'Organizations': { resource: 'organizations', actions: ['view', 'create', 'edit', 'archive'] },
  'Departments': { resource: 'departments', actions: ['view', 'create', 'edit', 'archive'] },
  'Cohorts': { resource: 'cohorts', actions: ['view', 'create', 'edit', 'archive', 'assign'] },
  'Courses': { resource: 'courses', actions: ['view', 'create', 'edit', 'archive', 'publish', 'assign'] },
  'Lessons': { resource: 'lessons', actions: ['view', 'create', 'edit', 'archive'] },
  'Learning Paths': { resource: 'paths', actions: ['view', 'create', 'edit', 'archive', 'assign'] },
  'Live Sessions': { resource: 'live_sessions', actions: ['view', 'create', 'edit', 'archive'] },
  'Question Banks': { resource: 'question_banks', actions: ['view', 'create', 'edit', 'archive'] },
  'Assessments': { resource: 'assessments', actions: ['view', 'create', 'edit', 'publish', 'archive'] },
  'Submissions': { resource: 'submissions', actions: ['view', 'review'] },
  'Grading': { resource: 'grading', actions: ['view', 'grade', 'moderate', 'release_results'] },
  'Proctoring': { resource: 'proctoring', actions: ['view', 'configure', 'review'] },
  'Reports': { resource: 'reports', actions: ['view', 'export'] },
  'Notifications': { resource: 'notifications', actions: ['view', 'configure'] },
  'Integrations': { resource: 'integrations', actions: ['view', 'configure'] },
  'Platform Settings': { resource: 'platform_settings', actions: ['view', 'configure'] },
  'Roles': { resource: 'roles', actions: ['view', 'create', 'edit', 'assign', 'archive'] },
  'Certificates': { resource: 'certificates', actions: ['view', 'configure'] },
};

export function getPermissionsForRole(role: RoleName): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

export function can(
  userPermissions: Permission[],
  action: PermissionAction,
  resource: PermissionResource,
  scope?: PermissionScope
): boolean {
  return userPermissions.some(
    (p) =>
      p.resource === resource &&
      p.action === action &&
      (scope === undefined || p.scope === scope || p.scope === 'global')
  );
}

// Navigation config driven by permissions
export interface NavItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  requiredPermission?: { action: PermissionAction; resource: PermissionResource };
  children?: NavItem[];
  badge?: number;
  group: string;
}

export function getNavigationForRole(role: RoleName): NavItem[] {
  // 1. PLATFORM ADMIN NAVIGATION
  const platformAdminNav: NavItem[] = [
    { id: 'dashboard', label: 'Admin Dashboard', icon: 'LayoutDashboard', path: '/dashboard', group: 'Main' },
    
    // Academic Structure & Organizations
    { id: 'organizations', label: 'Organizations & Tenants', icon: 'Building2', path: '/organizations', group: 'Structure & Tenants' },
    { id: 'departments', label: 'Departments Hierarchy', icon: 'Network', path: '/departments', group: 'Structure & Tenants' },
    { id: 'cohorts', label: 'Cohorts & Batches', icon: 'UsersRound', path: '/cohorts', group: 'Structure & Tenants' },

    // Identity & Access Control
    { id: 'people', label: 'People & Directory', icon: 'Users', path: '/people', group: 'Identity & Access' },
    { id: 'roles', label: 'Roles & RBAC Matrix', icon: 'Shield', path: '/roles', group: 'Identity & Access' },

    // Academic Curriculum & Credentials
    { id: 'courses', label: 'Courses Oversight', icon: 'BookOpen', path: '/courses', group: 'Curriculum & Programs' },
    { id: 'paths', label: 'Learning Paths', icon: 'Route', path: '/learning-paths', group: 'Curriculum & Programs' },
    { id: 'certificates', label: 'Certificate Templates', icon: 'Award', path: '/certificates', group: 'Curriculum & Programs' },
    { id: 'enrollments', label: 'Enrollments', icon: 'UserCheck', path: '/enrollments', group: 'Curriculum & Programs' },
    { id: 'leaderboard', label: 'Academic Leaderboard', icon: 'Trophy', path: '/leaderboard', group: 'Curriculum & Programs' },

    // Assessment & Quality Control
    { id: 'assessments', label: 'Assessments & Quizzes', icon: 'ClipboardCheck', path: '/assessments', group: 'Assessment & Moderation' },
    { id: 'question-banks', label: 'Question Banks', icon: 'HelpCircle', path: '/question-banks', group: 'Assessment & Moderation' },
    { id: 'live-sessions', label: 'Live Classes & Timetable', icon: 'Video', path: '/live-sessions', group: 'Assessment & Moderation' },
    { id: 'grading', label: 'Grading Oversight', icon: 'PenTool', path: '/grading', group: 'Assessment & Moderation' },
    { id: 'proctoring', label: 'Proctoring Security', icon: 'Eye', path: '/proctoring', group: 'Assessment & Moderation' },

    // Platform Intelligence & Settings
    { id: 'reports', label: 'Platform Reports', icon: 'BarChart3', path: '/reports', group: 'System & Insights' },
    { id: 'integrations', label: 'Integrations & APIs', icon: 'Plug', path: '/integrations', group: 'System & Insights' },
    { id: 'notifications', label: 'Announcements & Alerts', icon: 'Bell', path: '/notifications', group: 'System & Insights' },
    { id: 'settings', label: 'Platform Settings', icon: 'Settings', path: '/settings', group: 'System & Insights' },
    { id: 'profile', label: 'Admin Profile', icon: 'User', path: '/profile', group: 'Account' },
  ];

  // 2. TRAINER NAVIGATION (Teaching, Assessments, Live Sessions, Grading)
  const trainerNav: NavItem[] = [
    { id: 'dashboard', label: 'Trainer Dashboard', icon: 'LayoutDashboard', path: '/dashboard', group: 'Main' },

    // Teaching & Classes
    { id: 'my-courses', label: 'My Courses', icon: 'BookOpen', path: '/courses', group: 'Teaching & Curriculum' },
    { id: 'course-builder', label: 'Course Studio', icon: 'PenTool', path: '/course-builder', group: 'Teaching & Curriculum' },
    { id: 'learning-materials', label: 'Learning Materials', icon: 'FileText', path: '/learning-materials', group: 'Teaching & Curriculum' },
    { id: 'cohorts', label: 'Classes & Batches', icon: 'UsersRound', path: '/cohorts', group: 'Teaching & Curriculum' },
    { id: 'leaderboard', label: 'Academic Leaderboard', icon: 'Trophy', path: '/leaderboard', group: 'Teaching & Curriculum' },

    // Live Classes & Attendance
    { id: 'live-sessions', label: 'Live Classes & Webinars', icon: 'Video', path: '/live-sessions', group: 'Live Sessions' },
    { id: 'attendance', label: 'Attendance Roster', icon: 'UserCheck', path: '/attendance', group: 'Live Sessions' },

    // Evaluations & Grading
    { id: 'assessments', label: 'Assessments & Quizzes', icon: 'ClipboardCheck', path: '/assessments', group: 'Evaluations & Grading' },
    { id: 'question-banks', label: 'Question Banks Studio', icon: 'HelpCircle', path: '/question-banks', group: 'Evaluations & Grading' },
    { id: 'assignments', label: 'Student Assignments', icon: 'Award', path: '/assignments', group: 'Evaluations & Grading' },
    { id: 'grading', label: 'Grading Queue & AI Review', icon: 'PenTool', path: '/grading', group: 'Evaluations & Grading', badge: 5 },
    { id: 'proctoring', label: 'Proctoring Incident Center', icon: 'Eye', path: '/proctoring', group: 'Evaluations & Grading' },

    // Learners & Insights
    { id: 'students', label: 'Student Progress & Directory', icon: 'Users', path: '/students', group: 'Learner Insights' },
    { id: 'reports', label: 'Performance Reports', icon: 'BarChart3', path: '/reports', group: 'Learner Insights' },
    { id: 'announcements', label: 'Announcements', icon: 'Megaphone', path: '/notifications', group: 'Communications' },
    { id: 'profile', label: 'Trainer Profile', icon: 'User', path: '/profile', group: 'Account' },
  ];

  // 3. STUDENT NAVIGATION (Learning, Assignments, Assessments, Attendance, Credentials)
  const studentNav: NavItem[] = [
    { id: 'dashboard', label: 'Student Dashboard', icon: 'LayoutDashboard', path: '/dashboard', group: 'Main' },

    // Academics & Learning Player
    { id: 'courses', label: 'Courses', icon: 'Compass', path: '/courses', group: 'Academics & Learning' },
    { id: 'my-learning', label: 'My Enrolled Courses', icon: 'BookOpen', path: '/my-learning', group: 'Academics & Learning' },
    { id: 'learning-materials', label: 'Course Player & Materials', icon: 'Play', path: '/learning-materials', group: 'Academics & Learning' },
    { id: 'my-paths', label: 'My Learning Paths & Progress', icon: 'Route', path: '/my-paths', group: 'Academics & Learning' },
    { id: 'leaderboard', label: 'Leaderboard', icon: 'Trophy', path: '/leaderboard', group: 'Academics & Learning' },

    // Schedule & Attendance
    { id: 'timetable', label: 'Timetable & Live Sessions', icon: 'Calendar', path: '/my-sessions', group: 'Schedule & Attendance' },
    { id: 'momentum', label: 'Momentum', icon: 'Flame', path: '/momentum', group: 'Schedule & Attendance' },

    // Evaluations & Results
    { id: 'assignments', label: 'My Assignments', icon: 'ClipboardCheck', path: '/assignments', group: 'Assessments & Tests' },
    { id: 'assessments', label: 'Quizzes & Timed Exams', icon: 'HelpCircle', path: '/my-assessments', group: 'Assessments & Tests' },
    { id: 'my-results', label: 'Academic Transcript & Marks', icon: 'Trophy', path: '/my-results', group: 'Assessments & Tests' },

    // Credentials & Communication
    { id: 'my-certificates', label: 'Diplomas & Certificates', icon: 'Award', path: '/my-certificates', group: 'Credentials & Profile' },
    { id: 'announcements', label: 'Announcements & Alerts', icon: 'Bell', path: '/notifications', group: 'Credentials & Profile' },
    { id: 'profile', label: 'Student Profile', icon: 'User', path: '/profile', group: 'Credentials & Profile' },
  ];

  // Dispatch strictly to the three canonical roles
  if (role === 'trainer' || role === 'instructor' || role === 'assessment_author' || role === 'grader') {
    return trainerNav;
  }
  if (role === 'student' || role === 'learner' || role === 'guest') {
    return studentNav;
  }
  return platformAdminNav;
}
