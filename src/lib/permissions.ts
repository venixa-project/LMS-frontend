// ============================================================
// LMS - Centralized RBAC & Permission Helpers
// ============================================================
import { Permission, PermissionAction, PermissionResource, PermissionScope, RoleName, CanonicalRole } from '../types';
import { platformAdminNav } from '../platform-admin/navigation/platformAdminNav';
import { adminNav } from '../admin/navigation/adminNav';

// Permission definitions by role - 4 Core Roles: platform_admin, org_admin, trainer, student
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

// Regular Admin / Institution Admin (Organization Scope)
const ORG_ADMIN_PERMISSIONS: Permission[] = [
  // Academic Structure & Users (Organization Scope)
  { id: 'oa-1', resource: 'departments', action: 'view', scope: 'organization', description: 'View departments' },
  { id: 'oa-2', resource: 'departments', action: 'create', scope: 'organization', description: 'Create departments' },
  { id: 'oa-3', resource: 'departments', action: 'edit', scope: 'organization', description: 'Edit departments' },
  { id: 'oa-4', resource: 'cohorts', action: 'view', scope: 'organization', description: 'View cohorts and batches' },
  { id: 'oa-5', resource: 'cohorts', action: 'create', scope: 'organization', description: 'Create cohorts and batches' },
  { id: 'oa-6', resource: 'cohorts', action: 'edit', scope: 'organization', description: 'Edit cohorts and batches' },
  { id: 'oa-7', resource: 'cohorts', action: 'assign', scope: 'organization', description: 'Assign learners to cohorts' },
  { id: 'oa-8', resource: 'users', action: 'view', scope: 'organization', description: 'View institution users' },
  { id: 'oa-9', resource: 'users', action: 'create', scope: 'organization', description: 'Create and invite learners and faculty' },
  { id: 'oa-10', resource: 'users', action: 'edit', scope: 'organization', description: 'Edit institution users' },
  { id: 'oa-11', resource: 'users', action: 'enroll', scope: 'organization', description: 'Enroll users into courses' },

  // Curriculum & Teaching
  { id: 'oa-12', resource: 'courses', action: 'view', scope: 'organization', description: 'View institution courses' },
  { id: 'oa-13', resource: 'courses', action: 'create', scope: 'organization', description: 'Create courses' },
  { id: 'oa-14', resource: 'courses', action: 'edit', scope: 'organization', description: 'Edit courses' },
  { id: 'oa-15', resource: 'courses', action: 'publish', scope: 'organization', description: 'Publish courses' },
  { id: 'oa-16', resource: 'lessons', action: 'view', scope: 'organization', description: 'View lessons' },
  { id: 'oa-17', resource: 'lessons', action: 'create', scope: 'organization', description: 'Create lessons' },
  { id: 'oa-18', resource: 'lessons', action: 'edit', scope: 'organization', description: 'Edit lessons' },
  { id: 'oa-19', resource: 'paths', action: 'view', scope: 'organization', description: 'View learning paths' },
  { id: 'oa-20', resource: 'paths', action: 'create', scope: 'organization', description: 'Create learning paths' },
  { id: 'oa-21', resource: 'paths', action: 'edit', scope: 'organization', description: 'Edit learning paths' },
  { id: 'oa-22', resource: 'live_sessions', action: 'view', scope: 'organization', description: 'View live classes' },
  { id: 'oa-23', resource: 'live_sessions', action: 'create', scope: 'organization', description: 'Schedule live sessions' },
  { id: 'oa-24', resource: 'live_sessions', action: 'edit', scope: 'organization', description: 'Manage attendance rosters' },

  // Assessments, Evaluations & Grading
  { id: 'oa-25', resource: 'assessments', action: 'view', scope: 'organization', description: 'View assessments' },
  { id: 'oa-26', resource: 'assessments', action: 'create', scope: 'organization', description: 'Create assessments' },
  { id: 'oa-27', resource: 'assessments', action: 'edit', scope: 'organization', description: 'Edit assessments' },
  { id: 'oa-28', resource: 'assessments', action: 'publish', scope: 'organization', description: 'Publish assessments' },
  { id: 'oa-29', resource: 'question_banks', action: 'view', scope: 'organization', description: 'View question banks' },
  { id: 'oa-30', resource: 'question_banks', action: 'create', scope: 'organization', description: 'Create question banks' },
  { id: 'oa-31', resource: 'grading', action: 'view', scope: 'organization', description: 'View grading queue' },
  { id: 'oa-32', resource: 'grading', action: 'grade', scope: 'organization', description: 'Grade submissions' },
  { id: 'oa-33', resource: 'grading', action: 'release_results', scope: 'organization', description: 'Release results' },
  { id: 'oa-34', resource: 'proctoring', action: 'view', scope: 'organization', description: 'View proctoring alerts' },
  { id: 'oa-35', resource: 'proctoring', action: 'review', scope: 'organization', description: 'Review proctoring incidents' },

  // Certificates, Reports & Notifications
  { id: 'oa-36', resource: 'certificates', action: 'view', scope: 'organization', description: 'View certificates' },
  { id: 'oa-37', resource: 'certificates', action: 'configure', scope: 'organization', description: 'Configure institution certificate templates' },
  { id: 'oa-38', resource: 'reports', action: 'view', scope: 'organization', description: 'View institution reports' },
  { id: 'oa-39', resource: 'reports', action: 'export', scope: 'organization', description: 'Export institution reports' },
  { id: 'oa-40', resource: 'notifications', action: 'view', scope: 'organization', description: 'View notifications' },
  { id: 'oa-41', resource: 'notifications', action: 'configure', scope: 'organization', description: 'Post institution announcements' },
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
  { id: 'tr-25', resource: 'paths', action: 'view', scope: 'assigned', description: 'View learning paths' },
  { id: 'tr-26', resource: 'paths', action: 'create', scope: 'assigned', description: 'Create and author learning paths' },
  { id: 'tr-27', resource: 'paths', action: 'edit', scope: 'assigned', description: 'Edit own learning paths' },
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
  // 4 Core Canonical Roles
  platform_admin: PLATFORM_ADMIN_PERMISSIONS,
  org_admin: ORG_ADMIN_PERMISSIONS,
  lms_admin: ORG_ADMIN_PERMISSIONS,
  industrial_admin: ORG_ADMIN_PERMISSIONS,
  trainer: TRAINER_PERMISSIONS,
  student: STUDENT_PERMISSIONS,

  // Role mappings for compatibility
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
  // 1. TRAINER NAVIGATION (Teaching, Assessments, Live Sessions, Grading)
  const trainerNav: NavItem[] = [
    { id: 'dashboard', label: 'Trainer Dashboard', icon: 'LayoutDashboard', path: '/dashboard', group: 'Main' },

    // Teaching & Curriculum
    { id: 'my-courses', label: 'My Courses', icon: 'BookOpen', path: '/courses', group: 'Teaching & Curriculum' },
    { id: 'learning-paths', label: 'Learning Paths', icon: 'Route', path: '/learning-paths', group: 'Teaching & Curriculum' },
    { id: 'course-builder', label: 'Course Builder', icon: 'PenTool', path: '/course-builder', group: 'Teaching & Curriculum' },
    { id: 'cohorts', label: 'Classes & Batches', icon: 'UsersRound', path: '/cohorts', group: 'Teaching & Curriculum' },
    { id: 'leaderboard', label: 'Academic Leaderboard', icon: 'Trophy', path: '/leaderboard', group: 'Teaching & Curriculum' },

    // Schedule & Attendance
    { id: 'calendar', label: 'Activity & Planner', icon: 'Calendar', path: '/calendar', group: 'Schedule & Attendance' },
    { id: 'timetable', label: 'Classes & Timetable', icon: 'Clock', path: '/classes-timetable', group: 'Schedule & Attendance' },
    { id: 'live-sessions', label: 'Live Sessions', icon: 'Video', path: '/live-sessions', group: 'Schedule & Attendance' },
    { id: 'recorded-classes', label: 'Recorded Classes', icon: 'Play', path: '/recorded-classes', group: 'Schedule & Attendance' },
    { id: 'attendance', label: 'Live Session Attendance', icon: 'UserCheck', path: '/attendance-ledger', group: 'Schedule & Attendance' },

    // Assessments & Evaluation
    { id: 'assessments', label: 'Assessments & Quizzes', icon: 'ClipboardCheck', path: '/assessments', group: 'Assessments & Evaluation' },
    { id: 'question-banks', label: 'Question Banks', icon: 'HelpCircle', path: '/question-banks', group: 'Assessments & Evaluation' },
    { id: 'assignments', label: 'Student Assignments', icon: 'Award', path: '/assignments', group: 'Assessments & Evaluation' },
    { id: 'grading', label: 'AI Evaluation Queue', icon: 'PenTool', path: '/grading', group: 'Assessments & Evaluation', badge: 5 },
    { id: 'proctoring', label: 'Proctoring Incident Center', icon: 'Eye', path: '/proctoring', group: 'Assessments & Evaluation' },
    { id: 'certificates', label: 'Certificates', icon: 'Award', path: '/certificates', group: 'Assessments & Evaluation' },

    // Learners & Insights
    { id: 'students', label: 'Student Progress', icon: 'Users', path: '/students', group: 'Learner Insights' },
    { id: 'reports', label: 'Performance Reports', icon: 'BarChart3', path: '/reports', group: 'Learner Insights' },
    { id: 'announcements', label: 'Course Announcements', icon: 'Megaphone', path: '/notifications', group: 'Communications' },
    { id: 'profile', label: 'Trainer Profile', icon: 'User', path: '/profile', group: 'Account' },
  ];

  // 2. STUDENT NAVIGATION (Learning, Quizzes, Schedule, Credentials)
  const studentNav: NavItem[] = [
    { id: 'dashboard', label: 'Student Dashboard', icon: 'LayoutDashboard', path: '/dashboard', group: 'Main' },

    // Academics & Learning
    { id: 'my-learning', label: 'My Courses', icon: 'BookOpen', path: '/my-learning', group: 'Academics & Learning' },
    { id: 'my-paths', label: 'Learning Paths', icon: 'Route', path: '/my-paths', group: 'Academics & Learning' },
    { id: 'courses', label: 'Course Catalogue', icon: 'Compass', path: '/courses', group: 'Academics & Learning' },
    { id: 'leaderboard', label: 'Academic Leaderboard', icon: 'Trophy', path: '/leaderboard', group: 'Academics & Learning' },

    // Schedule & Attendance
    { id: 'weekly-timetable', label: 'My Timetable', icon: 'Calendar', path: '/weekly-timetable', group: 'Schedule & Attendance' },
    { id: 'timetable', label: 'Live Sessions', icon: 'Video', path: '/my-sessions', group: 'Schedule & Attendance' },
    { id: 'recorded-classes', label: 'Recorded Classes', icon: 'Play', path: '/recorded-classes', group: 'Schedule & Attendance' },
    { id: 'momentum', label: 'Learning Momentum', icon: 'Flame', path: '/momentum', group: 'Schedule & Attendance' },

    // Assessments & Tests
    { id: 'assignments', label: 'My Assignments', icon: 'ClipboardCheck', path: '/assignments', group: 'Assessments & Tests' },
    { id: 'assessments', label: 'My Assessments & Quizzes', icon: 'HelpCircle', path: '/my-assessments', group: 'Assessments & Tests' },
    { id: 'my-results', label: 'Assessment Results', icon: 'Trophy', path: '/my-results', group: 'Assessments & Tests' },
    { id: 'my-proctoring-reports', label: 'My Proctoring Reports', icon: 'Shield', path: '/my-proctoring-reports', group: 'Assessments & Tests' },

    // Certificates & Profile
    { id: 'my-certificates', label: 'My Certificates', icon: 'Award', path: '/my-certificates', group: 'Certificates & Profile' },

    // Announcements & Notifications
    { id: 'announcements', label: 'Announcements & Alerts', icon: 'Bell', path: '/notifications', group: 'Announcements & Notifications' },

    // Account
    { id: 'profile', label: 'Student Profile', icon: 'User', path: '/profile', group: 'Account' },
  ];

  // 3. Dispatch to the dedicated role configurations
  if (role === 'platform_admin') {
    return platformAdminNav;
  }
  if (role === 'org_admin' || role === 'lms_admin' || (role as string) === 'industrial_admin') {
    return adminNav;
  }
  if (role === 'trainer' || role === 'instructor' || role === 'assessment_author' || role === 'grader') {
    return trainerNav;
  }
  if (role === 'student' || role === 'learner' || role === 'guest') {
    return studentNav;
  }
  return adminNav;
}

/**
 * Normalizes any role variant into one of the 4 canonical roles:
 * 'platform_admin' | 'org_admin' | 'trainer' | 'student'
 */
export function normalizeCanonicalRole(rawRole?: string): CanonicalRole {
  if (!rawRole) return 'student';
  if (rawRole === 'trainer' || rawRole === 'instructor' || rawRole === 'assessment_author' || rawRole === 'grader') {
    return 'trainer';
  }
  if (rawRole === 'student' || rawRole === 'learner' || rawRole === 'guest') {
    return 'student';
  }
  if (rawRole === 'org_admin' || rawRole === 'lms_admin' || rawRole === 'industrial_admin' || rawRole === 'admin') {
    return 'org_admin';
  }
  if (rawRole === 'platform_admin' || rawRole === 'super_admin') {
    return 'platform_admin';
  }
  return 'student';
}

/**
 * Centralized Route Permission Validator
 * Checks whether a given path is authorized for the given user role.
 */
export function isRouteAllowedForRole(pathname: string, rawRole?: string): boolean {
  const role = normalizeCanonicalRole(rawRole);
  const cleanPath = pathname.split('?')[0].replace(/\/$/, '') || '/';

  // 1. Universal routes allowed for all authenticated roles
  if (
    cleanPath === '' ||
    cleanPath === '/' ||
    cleanPath === '/dashboard' ||
    cleanPath === '/courses' ||
    cleanPath === '/my-courses' ||
    cleanPath === '/momentum' ||
    cleanPath === '/leaderboard' ||
    cleanPath === '/profile' ||
    cleanPath === '/notifications' ||
    cleanPath === '/timetable' ||
    cleanPath === '/weekly-timetable' ||
    cleanPath === '/classes-timetable' ||
    cleanPath === '/live-sessions' ||
    cleanPath === '/my-sessions' ||
    cleanPath === '/recorded-classes' ||
    cleanPath === '/recordings' ||
    cleanPath === '/attendance' ||
    cleanPath === '/attendance-ledger' ||
    cleanPath === '/join-course' ||
    cleanPath === '/catalog' ||
    cleanPath === '/my-learning' ||
    cleanPath === '/my-paths' ||
    cleanPath === '/learning-paths' ||
    cleanPath === '/my-assessments' ||
    cleanPath === '/my-results' ||
    cleanPath === '/my-proctoring-reports' ||
    cleanPath.startsWith('/my-proctoring-report') ||
    cleanPath === '/my-certificates' ||
    cleanPath === '/assignments' ||
    cleanPath === '/certificates' ||
    cleanPath === '/verify-certificate' ||
    cleanPath.startsWith('/verify-certificate') ||
    cleanPath.startsWith('/course-player') ||
    cleanPath.startsWith('/learning-materials') ||
    cleanPath.startsWith('/exam/')
  ) {
    return true;
  }

  // 2. Public / discoverable course details
  if (cleanPath.startsWith('/course/') || cleanPath.startsWith('/courses/')) {
    // Specifically restricted faculty/admin subpaths:
    if (
      cleanPath.includes('/share') ||
      cleanPath.includes('/assign-students')
    ) {
      return role === 'platform_admin' || role === 'org_admin' || role === 'trainer';
    }
    return true;
  }

  // 3. Platform Admin Only routes
  if (
    cleanPath === '/organizations' ||
    cleanPath === '/roles' ||
    cleanPath === '/integrations' ||
    cleanPath === '/settings'
  ) {
    return role === 'platform_admin';
  }

  // 4. Organisation Management & Admin Directory (Admin & Platform Admin only)
  if (
    cleanPath.startsWith('/organisation') ||
    cleanPath === '/departments' ||
    cleanPath.startsWith('/departments/') ||
    cleanPath === '/people' ||
    cleanPath.startsWith('/people/') ||
    cleanPath === '/faculty' ||
    cleanPath.startsWith('/faculty/') ||
    cleanPath === '/students/new' ||
    cleanPath === '/cohorts/new' ||
    cleanPath === '/enrollments'
  ) {
    return role === 'platform_admin' || role === 'org_admin';
  }

  // 5. Teaching & Academic Operations (Platform Admin, Org Admin, and Trainer)
  if (
    cleanPath === '/cohorts' ||
    cleanPath.startsWith('/cohorts/') ||
    cleanPath === '/students' ||
    cleanPath === '/course-builder' ||
    cleanPath === '/learning-paths' ||
    cleanPath === '/calendar' ||
    cleanPath === '/planner' ||
    cleanPath === '/assessments' ||
    cleanPath === '/question-banks' ||
    cleanPath === '/grading' ||
    cleanPath === '/proctoring' ||
    cleanPath === '/reports'
  ) {
    return role === 'platform_admin' || role === 'org_admin' || role === 'trainer';
  }

  return true;
}
