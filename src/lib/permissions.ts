// ============================================================
// LMS - Centralized RBAC & Permission Helpers
// ============================================================
import { Permission, PermissionAction, PermissionResource, PermissionScope, RoleName } from '../types';

// Permission definitions by role - comprehensive matrix
const ROLE_PERMISSIONS: Record<RoleName, Permission[]> = {
  platform_admin: [
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
    { id: 'pa-18', resource: 'assessments', action: 'view', scope: 'global', description: 'View all assessments' },
    { id: 'pa-19', resource: 'notifications', action: 'configure', scope: 'global', description: 'Configure notifications' },
    { id: 'pa-20', resource: 'proctoring', action: 'configure', scope: 'global', description: 'Configure proctoring' },
    { id: 'pa-21', resource: 'certificates', action: 'configure', scope: 'global', description: 'Configure certificates' },
    { id: 'pa-22', resource: 'departments', action: 'view', scope: 'global', description: 'View departments' },
    { id: 'pa-23', resource: 'cohorts', action: 'view', scope: 'global', description: 'View cohorts' },
    { id: 'pa-24', resource: 'grading', action: 'view', scope: 'global', description: 'View grading', riskLevel: 'high' },
  ],
  org_admin: [
    { id: 'oa-1', resource: 'organizations', action: 'view', scope: 'organization', description: 'View own organization' },
    { id: 'oa-2', resource: 'organizations', action: 'edit', scope: 'organization', description: 'Edit own organization' },
    { id: 'oa-3', resource: 'users', action: 'view', scope: 'organization', description: 'View org users' },
    { id: 'oa-4', resource: 'users', action: 'create', scope: 'organization', description: 'Create org users' },
    { id: 'oa-5', resource: 'users', action: 'edit', scope: 'organization', description: 'Edit org users' },
    { id: 'oa-6', resource: 'users', action: 'invite', scope: 'organization', description: 'Invite users' },
    { id: 'oa-7', resource: 'users', action: 'archive', scope: 'organization', description: 'Deactivate / archive users' },
    { id: 'oa-8', resource: 'departments', action: 'view', scope: 'organization', description: 'View departments' },
    { id: 'oa-9', resource: 'departments', action: 'create', scope: 'organization', description: 'Create departments' },
    { id: 'oa-10', resource: 'departments', action: 'edit', scope: 'organization', description: 'Edit departments' },
    { id: 'oa-11', resource: 'cohorts', action: 'view', scope: 'organization', description: 'View cohorts' },
    { id: 'oa-12', resource: 'cohorts', action: 'create', scope: 'organization', description: 'Create cohorts' },
    { id: 'oa-13', resource: 'cohorts', action: 'edit', scope: 'organization', description: 'Edit cohorts' },
    { id: 'oa-14', resource: 'cohorts', action: 'assign', scope: 'organization', description: 'Assign learners to cohorts' },
    { id: 'oa-15', resource: 'courses', action: 'view', scope: 'organization', description: 'View courses' },
    { id: 'oa-16', resource: 'courses', action: 'create', scope: 'organization', description: 'Create courses' },
    { id: 'oa-17', resource: 'courses', action: 'edit', scope: 'organization', description: 'Edit courses' },
    { id: 'oa-18', resource: 'courses', action: 'assign', scope: 'organization', description: 'Assign faculty to courses' },
    { id: 'oa-19', resource: 'courses', action: 'publish', scope: 'organization', description: 'Publish / archive courses' },
    { id: 'oa-20', resource: 'paths', action: 'view', scope: 'organization', description: 'View learning paths' },
    { id: 'oa-21', resource: 'paths', action: 'create', scope: 'organization', description: 'Create learning paths' },
    { id: 'oa-22', resource: 'live_sessions', action: 'view', scope: 'organization', description: 'View classes and timetable' },
    { id: 'oa-23', resource: 'live_sessions', action: 'create', scope: 'organization', description: 'Schedule live sessions' },
    { id: 'oa-24', resource: 'live_sessions', action: 'edit', scope: 'organization', description: 'Manage attendance and recordings' },
    { id: 'oa-25', resource: 'assessments', action: 'view', scope: 'organization', description: 'View assessments' },
    { id: 'oa-26', resource: 'assessments', action: 'create', scope: 'organization', description: 'Create assessments' },
    { id: 'oa-27', resource: 'grading', action: 'view', scope: 'organization', description: 'View grading and results' },
    { id: 'oa-28', resource: 'users', action: 'enroll', scope: 'organization', description: 'Enroll users' },
    { id: 'oa-29', resource: 'reports', action: 'view', scope: 'organization', description: 'View reports' },
    { id: 'oa-30', resource: 'reports', action: 'export', scope: 'organization', description: 'Export reports' },
    { id: 'oa-31', resource: 'roles', action: 'view', scope: 'organization', description: 'View roles' },
    { id: 'oa-32', resource: 'roles', action: 'assign', scope: 'organization', description: 'Assign roles' },
    { id: 'oa-33', resource: 'notifications', action: 'view', scope: 'organization', description: 'View notifications' },
    { id: 'oa-34', resource: 'notifications', action: 'configure', scope: 'organization', description: 'Broadcast announcements' },
    { id: 'oa-35', resource: 'certificates', action: 'view', scope: 'organization', description: 'View certificates' },
    { id: 'oa-36', resource: 'platform_settings', action: 'view', scope: 'organization', description: 'View institution settings' },
    { id: 'oa-37', resource: 'platform_settings', action: 'configure', scope: 'organization', description: 'Configure institution settings' },
  ],
  lms_admin: [
    { id: 'la-1', resource: 'courses', action: 'view', scope: 'organization', description: 'View courses' },
    { id: 'la-2', resource: 'courses', action: 'create', scope: 'organization', description: 'Create courses' },
    { id: 'la-3', resource: 'courses', action: 'edit', scope: 'organization', description: 'Edit courses' },
    { id: 'la-4', resource: 'courses', action: 'publish', scope: 'organization', description: 'Publish courses' },
    { id: 'la-5', resource: 'courses', action: 'archive', scope: 'organization', description: 'Archive courses' },
    { id: 'la-6', resource: 'paths', action: 'view', scope: 'organization', description: 'View learning paths' },
    { id: 'la-7', resource: 'paths', action: 'create', scope: 'organization', description: 'Create learning paths' },
    { id: 'la-8', resource: 'paths', action: 'edit', scope: 'organization', description: 'Edit learning paths' },
    { id: 'la-9', resource: 'question_banks', action: 'view', scope: 'organization', description: 'View question banks' },
    { id: 'la-10', resource: 'assessments', action: 'view', scope: 'organization', description: 'View assessments' },
    { id: 'la-11', resource: 'assessments', action: 'create', scope: 'organization', description: 'Create assessments' },
    { id: 'la-12', resource: 'grading', action: 'view', scope: 'organization', description: 'View grading' },
    { id: 'la-13', resource: 'reports', action: 'view', scope: 'organization', description: 'View reports' },
    { id: 'la-14', resource: 'reports', action: 'export', scope: 'organization', description: 'Export reports' },
    { id: 'la-15', resource: 'live_sessions', action: 'view', scope: 'organization', description: 'View live sessions' },
    { id: 'la-16', resource: 'live_sessions', action: 'create', scope: 'organization', description: 'Create live sessions' },
    { id: 'la-17', resource: 'cohorts', action: 'view', scope: 'organization', description: 'View cohorts' },
    { id: 'la-18', resource: 'users', action: 'view', scope: 'organization', description: 'View users' },
    { id: 'la-19', resource: 'users', action: 'enroll', scope: 'organization', description: 'Enroll users' },
    { id: 'la-20', resource: 'proctoring', action: 'configure', scope: 'organization', description: 'Configure proctoring' },
    { id: 'la-21', resource: 'notifications', action: 'view', scope: 'organization', description: 'View notifications' },
    { id: 'la-22', resource: 'certificates', action: 'view', scope: 'organization', description: 'View certificates' },
    { id: 'la-23', resource: 'certificates', action: 'configure', scope: 'organization', description: 'Configure certificates' },
  ],
  instructor: [
    { id: 'in-1', resource: 'courses', action: 'view', scope: 'assigned', description: 'View assigned courses' },
    { id: 'in-2', resource: 'courses', action: 'create', scope: 'assigned', description: 'Create courses' },
    { id: 'in-3', resource: 'courses', action: 'edit', scope: 'assigned', description: 'Edit assigned courses' },
    { id: 'in-4', resource: 'courses', action: 'publish', scope: 'assigned', description: 'Submit for publish' },
    { id: 'in-5', resource: 'cohorts', action: 'view', scope: 'assigned', description: 'View assigned cohorts' },
    { id: 'in-6', resource: 'users', action: 'view', scope: 'assigned', description: 'View learners in assigned cohorts' },
    { id: 'in-7', resource: 'live_sessions', action: 'view', scope: 'assigned', description: 'View live sessions' },
    { id: 'in-8', resource: 'live_sessions', action: 'create', scope: 'assigned', description: 'Schedule live sessions' },
    { id: 'in-9', resource: 'live_sessions', action: 'edit', scope: 'assigned', description: 'Edit live sessions' },
    { id: 'in-10', resource: 'reports', action: 'view', scope: 'assigned', description: 'View assigned reports' },
    { id: 'in-11', resource: 'question_banks', action: 'view', scope: 'assigned', description: 'View question banks' },
    { id: 'in-12', resource: 'assessments', action: 'view', scope: 'assigned', description: 'View assessments' },
    { id: 'in-13', resource: 'assessments', action: 'create', scope: 'assigned', description: 'Create assessments' },
    { id: 'in-14', resource: 'assessments', action: 'edit', scope: 'assigned', description: 'Edit assessments' },
    { id: 'in-15', resource: 'grading', action: 'view', scope: 'assigned', description: 'View assigned grading' },
    { id: 'in-16', resource: 'grading', action: 'grade', scope: 'assigned', description: 'Grade student submissions' },
    { id: 'in-17', resource: 'submissions', action: 'view', scope: 'assigned', description: 'View student submissions' },
    { id: 'in-18', resource: 'lessons', action: 'create', scope: 'assigned', description: 'Create learning materials' },
    { id: 'in-19', resource: 'lessons', action: 'edit', scope: 'assigned', description: 'Edit learning materials' },
    { id: 'in-20', resource: 'notifications', action: 'view', scope: 'assigned', description: 'View notifications' },
  ],
  assessment_author: [
    { id: 'aa-1', resource: 'question_banks', action: 'view', scope: 'assigned', description: 'View question banks' },
    { id: 'aa-2', resource: 'question_banks', action: 'create', scope: 'assigned', description: 'Create question banks' },
    { id: 'aa-3', resource: 'question_banks', action: 'edit', scope: 'assigned', description: 'Edit question banks' },
    { id: 'aa-4', resource: 'assessments', action: 'view', scope: 'assigned', description: 'View assessments' },
    { id: 'aa-5', resource: 'assessments', action: 'create', scope: 'assigned', description: 'Create assessments' },
    { id: 'aa-6', resource: 'assessments', action: 'edit', scope: 'assigned', description: 'Edit assessments' },
    { id: 'aa-7', resource: 'assessments', action: 'publish', scope: 'assigned', description: 'Submit for publish' },
    { id: 'aa-8', resource: 'courses', action: 'view', scope: 'assigned', description: 'View assigned courses' },
  ],
  grader: [
    { id: 'gr-1', resource: 'grading', action: 'view', scope: 'assigned', description: 'View assigned grading' },
    { id: 'gr-2', resource: 'grading', action: 'grade', scope: 'assigned', description: 'Grade assigned work' },
    { id: 'gr-3', resource: 'submissions', action: 'view', scope: 'assigned', description: 'View submissions' },
    { id: 'gr-4', resource: 'proctoring', action: 'review', scope: 'assigned', description: 'Review proctoring' },
    { id: 'gr-5', resource: 'assessments', action: 'view', scope: 'assigned', description: 'View assessments' },
  ],
  learner: [
    { id: 'le-1', resource: 'courses', action: 'view', scope: 'own', description: 'View enrolled courses' },
    { id: 'le-2', resource: 'paths', action: 'view', scope: 'own', description: 'View learning paths' },
    { id: 'le-3', resource: 'assessments', action: 'view', scope: 'own', description: 'View assessments' },
    { id: 'le-4', resource: 'live_sessions', action: 'view', scope: 'own', description: 'View live sessions' },
    { id: 'le-5', resource: 'submissions', action: 'view', scope: 'own', description: 'View own submissions' },
    { id: 'le-6', resource: 'certificates', action: 'view', scope: 'own', description: 'View certificates' },
    { id: 'le-7', resource: 'notifications', action: 'view', scope: 'own', description: 'View notifications' },
  ],
  guest: [
    { id: 'gu-1', resource: 'courses', action: 'view', scope: 'assigned', description: 'Preview approved courses' },
    { id: 'gu-2', resource: 'reports', action: 'view', scope: 'assigned', description: 'View approved reports' },
  ],
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
  const allNav: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', path: '/dashboard', group: 'Main' },
    // LMS Admin / Platform Admin
    { id: 'organizations', label: 'Organizations', icon: 'Building2', path: '/organizations', requiredPermission: { action: 'view', resource: 'organizations' }, group: 'Administration' },
    { id: 'departments', label: 'Departments', icon: 'Network', path: '/departments', requiredPermission: { action: 'view', resource: 'departments' }, group: 'Administration' },
    { id: 'people', label: 'People', icon: 'Users', path: '/people', requiredPermission: { action: 'view', resource: 'users' }, group: 'People' },
    { id: 'cohorts', label: 'Cohorts', icon: 'UsersRound', path: '/cohorts', requiredPermission: { action: 'view', resource: 'cohorts' }, group: 'People' },
    { id: 'roles', label: 'Roles & Permissions', icon: 'Shield', path: '/roles', requiredPermission: { action: 'view', resource: 'roles' }, group: 'Administration' },
    { id: 'courses', label: 'Courses', icon: 'BookOpen', path: '/courses', requiredPermission: { action: 'view', resource: 'courses' }, group: 'Learning' },
    { id: 'paths', label: 'Learning Paths', icon: 'Route', path: '/learning-paths', requiredPermission: { action: 'view', resource: 'paths' }, group: 'Learning' },
    { id: 'live-sessions', label: 'Live Classes', icon: 'Video', path: '/live-sessions', requiredPermission: { action: 'view', resource: 'live_sessions' }, group: 'Learning' },
    { id: 'question-banks', label: 'Question Banks', icon: 'HelpCircle', path: '/question-banks', requiredPermission: { action: 'view', resource: 'question_banks' }, group: 'Assessment' },
    { id: 'assessments', label: 'Assessments', icon: 'ClipboardCheck', path: '/assessments', requiredPermission: { action: 'view', resource: 'assessments' }, group: 'Assessment' },
    { id: 'grading', label: 'Grading', icon: 'PenTool', path: '/grading', requiredPermission: { action: 'view', resource: 'grading' }, group: 'Assessment' },
    { id: 'proctoring', label: 'Proctoring', icon: 'Eye', path: '/proctoring', requiredPermission: { action: 'view', resource: 'proctoring' }, group: 'Assessment' },
    { id: 'certificates', label: 'Certificates', icon: 'Award', path: '/certificates', requiredPermission: { action: 'view', resource: 'certificates' }, group: 'Learning' },
    { id: 'reports', label: 'Reports', icon: 'BarChart3', path: '/reports', requiredPermission: { action: 'view', resource: 'reports' }, group: 'Analytics' },
    { id: 'notifications', label: 'Notifications', icon: 'Bell', path: '/notifications', requiredPermission: { action: 'view', resource: 'notifications' }, group: 'System' },
    { id: 'integrations', label: 'Integrations', icon: 'Plug', path: '/integrations', requiredPermission: { action: 'view', resource: 'integrations' }, group: 'System' },
    { id: 'settings', label: 'Settings', icon: 'Settings', path: '/settings', requiredPermission: { action: 'configure', resource: 'platform_settings' }, group: 'System' },
  ];

  // Learner-specific nav (Student Role)
  const learnerNav: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', path: '/dashboard', group: 'Main' },
    { id: 'my-learning', label: 'My Courses', icon: 'BookOpen', path: '/my-learning', group: 'Academics' },
    { id: 'learning-materials', label: 'Learning Materials', icon: 'PenTool', path: '/learning-materials', group: 'Academics' },
    { id: 'assignments', label: 'My Assignments', icon: 'ClipboardCheck', path: '/assignments', group: 'Evaluations' },
    { id: 'assessments', label: 'Assessments', icon: 'HelpCircle', path: '/my-assessments', group: 'Evaluations' },
    { id: 'timetable', label: 'Timetable / Live Classes', icon: 'Calendar', path: '/my-sessions', group: 'Schedule & Attendance' },
    { id: 'attendance', label: 'Attendance', icon: 'UserCheck', path: '/attendance', group: 'Schedule & Attendance' },
    { id: 'my-results', label: 'My Results', icon: 'Trophy', path: '/my-results', group: 'Evaluations' },
    { id: 'my-paths', label: 'Learning Progress', icon: 'Route', path: '/my-paths', group: 'Progress' },
    { id: 'my-certificates', label: 'Certificates', icon: 'Award', path: '/my-certificates', group: 'Credentials' },
    { id: 'announcements', label: 'Announcements', icon: 'Megaphone', path: '/notifications', group: 'Communications' },
    { id: 'notifications', label: 'Notifications', icon: 'Bell', path: '/notifications', group: 'Communications' },
    { id: 'profile', label: 'My Profile', icon: 'User', path: '/profile', group: 'Account' },
  ];

  // Institution Admin (org_admin) navigation
  const adminNav: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', path: '/dashboard', group: 'Main' },
    { id: 'students', label: 'Students', icon: 'Users', path: '/students', group: 'People & Directory' },
    { id: 'faculty', label: 'Faculty', icon: 'GraduationCap', path: '/faculty', group: 'People & Directory' },
    { id: 'departments', label: 'Departments', icon: 'Network', path: '/departments', group: 'Academic Structure' },
    { id: 'cohorts', label: 'Classes & Batches', icon: 'UsersRound', path: '/cohorts', group: 'Academic Structure' },
    { id: 'courses', label: 'Courses', icon: 'BookOpen', path: '/courses', group: 'Academics' },
    { id: 'enrollments', label: 'Enrollments', icon: 'Route', path: '/enrollments', group: 'Academics' },
    { id: 'attendance', label: 'Attendance & Timetable', icon: 'Calendar', path: '/attendance', group: 'Operations' },
    { id: 'assessments', label: 'Assessments & Results', icon: 'ClipboardCheck', path: '/assessments', group: 'Academics' },
    { id: 'reports', label: 'Reports & Certificates', icon: 'BarChart3', path: '/reports', group: 'Insights' },
    { id: 'announcements', label: 'Announcements', icon: 'Bell', path: '/notifications', group: 'Institution' },
    { id: 'settings', label: 'Institution Settings', icon: 'Settings', path: '/settings', group: 'Institution' },
  ];

  // Faculty (instructor) navigation
  const facultyNav: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', path: '/dashboard', group: 'Main' },
    { id: 'my-classes', label: 'My Classes', icon: 'UsersRound', path: '/cohorts', group: 'Teaching & Classes' },
    { id: 'my-courses', label: 'My Courses', icon: 'BookOpen', path: '/courses', group: 'Teaching & Classes' },
    { id: 'learning-materials', label: 'Learning Materials', icon: 'PenTool', path: '/course-builder', group: 'Teaching & Classes' },
    { id: 'attendance', label: 'Attendance & Timetable', icon: 'Calendar', path: '/attendance', group: 'Teaching & Classes' },
    { id: 'assignments', label: 'Assignments', icon: 'ClipboardCheck', path: '/assignments', group: 'Evaluations' },
    { id: 'assessments', label: 'Assessments', icon: 'HelpCircle', path: '/assessments', group: 'Evaluations' },
    { id: 'grading', label: 'Student Submissions', icon: 'PenTool', path: '/grading', group: 'Evaluations' },
    { id: 'students', label: 'Student Progress', icon: 'Users', path: '/students', group: 'Learner Insights' },
    { id: 'reports', label: 'Reports', icon: 'BarChart3', path: '/reports', group: 'Learner Insights' },
    { id: 'announcements', label: 'Announcements', icon: 'Bell', path: '/notifications', group: 'Communications' },
    { id: 'notifications', label: 'Notifications', icon: 'Bell', path: '/notifications', group: 'Communications' },
  ];

  if (role === 'org_admin') return adminNav;
  if (role === 'instructor') return facultyNav;
  if (role === 'learner') return learnerNav;

  const permissions = getPermissionsForRole(role);
  return allNav.filter((item) => {
    if (!item.requiredPermission) return true;
    return can(permissions, item.requiredPermission.action, item.requiredPermission.resource);
  });
}
