export interface SupportSubNavOption {
  id: string;
  label: string;
}

export interface SupportScreenOption {
  id: string;
  label: string;
  subNavs: SupportSubNavOption[];
}

export interface SupportRoleOption {
  id: 'org_admin' | 'platform_admin' | 'trainer' | 'student';
  label: string;
  screens: SupportScreenOption[];
}

export const SUPPORT_ROLE_PATH_MAP: SupportRoleOption[] = [
  {
    id: 'org_admin',
    label: 'Institution Admin',
    screens: [
      {
        id: 'dashboard',
        label: 'Institution Dashboard',
        subNavs: [
          { id: 'kpi-cards', label: 'KPI Summary Cards' },
          { id: 'activity-growth', label: 'Learner Activity & Growth Chart' },
          { id: 'enrollment-stats', label: 'Course Enrollment Statistics' },
          { id: 'leaderboard', label: 'Gamification & Leaderboard' },
          { id: 'platform-overview', label: 'Platform Overview & Recent Activities' },
          { id: 'export-excel', label: 'Filters & Export Filtered Data (Excel)' },
        ],
      },
      {
        id: 'organisation',
        label: 'Organisation Management',
        subNavs: [
          { id: 'company-profile', label: 'Company Profile' },
          { id: 'branches-locations', label: 'Branches & Locations' },
          { id: 'departments-designations', label: 'Departments & Designations' },
          { id: 'people-faculty', label: 'People & Faculty Directory' },
          { id: 'cohorts', label: 'Classes, Sections & Cohort Batches' },
        ],
      },
      {
        id: 'curriculum',
        label: 'Curriculum & Teaching',
        subNavs: [
          { id: 'course-catalogue', label: 'Course Catalogue' },
          { id: 'course-builder', label: 'Course Builder (Modules & Lessons)' },
          { id: 'learning-paths', label: 'Learning Paths' },
          { id: 'enrollments-roster', label: 'Enrollments Roster' },
          { id: 'academic-leaderboard', label: 'Academic Leaderboard' },
        ],
      },
      {
        id: 'schedule',
        label: 'Schedule & Attendance',
        subNavs: [
          { id: 'activity-planner', label: 'Activity & Planner' },
          { id: 'classes-timetable', label: 'Classes & Timetable' },
          { id: 'live-sessions', label: 'Live Sessions' },
          { id: 'recorded-classes', label: 'Recorded Classes' },
          { id: 'attendance-ledger', label: 'Live Session Attendance Ledger' },
        ],
      },
      {
        id: 'assessments',
        label: 'Assessments & Evaluation',
        subNavs: [
          { id: 'assessments-quizzes', label: 'Assessments & Quizzes' },
          { id: 'question-banks', label: 'Question Banks' },
          { id: 'student-assignments', label: 'Student Assignments' },
          { id: 'ai-grading', label: 'AI Evaluation / Grading Oversight' },
          { id: 'proctoring-center', label: 'Proctoring Incident Center (Live Monitor / Review)' },
          { id: 'proctoring-videos', label: 'Proctoring Videos' },
        ],
      },
      {
        id: 'reports',
        label: 'Institution Reports',
        subNavs: [
          { id: 'enrollment-reports', label: 'Enrollment & Completion Reports' },
          { id: 'assessment-reports', label: 'Assessment & Grade Reports' },
          { id: 'attendance-reports', label: 'Attendance Reports' },
        ],
      },
      {
        id: 'certificates',
        label: 'Certificate Management',
        subNavs: [
          { id: 'certificate-templates', label: 'Certificate Templates' },
          { id: 'issued-certificates', label: 'Issued Certificates & Verification' },
        ],
      },
      {
        id: 'announcements',
        label: 'Announcements & Notifications',
        subNavs: [
          { id: 'announcements-feed', label: 'Announcements Feed' },
          { id: 'delivery-logs', label: 'Delivery & Channel Logs' },
          { id: 'notification-templates', label: 'Notification Templates' },
          { id: 'channel-providers', label: 'Channel Providers' },
        ],
      },
      {
        id: 'profile',
        label: 'Admin Profile',
        subNavs: [
          { id: 'general-profile', label: 'General Profile' },
          { id: 'password-security', label: 'Password & Security' },
          { id: 'theme-notifications', label: 'Theme & Notifications' },
          { id: 'authorized-signature', label: 'Authorized Signature' },
        ],
      },
    ],
  },
  {
    id: 'platform_admin',
    label: 'Platform Admin',
    screens: [
      {
        id: 'platform-dashboard',
        label: 'Platform Dashboard',
        subNavs: [
          { id: 'telemetry', label: 'Platform Telemetry & Health' },
          { id: 'tenant-metrics', label: 'Tenant Adoption Metrics' },
        ],
      },
      {
        id: 'multi-tenancy',
        label: 'Structure & Tenants',
        subNavs: [
          { id: 'organizations-list', label: 'Organizations & Tenants' },
          { id: 'subscription-plans', label: 'Subscription Plans' },
        ],
      },
      {
        id: 'identity-access',
        label: 'Identity & Access',
        subNavs: [
          { id: 'global-directory', label: 'Global User Directory' },
          { id: 'roles-rbac', label: 'Roles & RBAC Matrix' },
        ],
      },
      {
        id: 'system-insights',
        label: 'System & Insights',
        subNavs: [
          { id: 'platform-reports', label: 'Platform Reports & Audit' },
          { id: 'integrations-apis', label: 'Integrations & APIs' },
          { id: 'platform-announcements', label: 'Platform Announcements' },
          { id: 'platform-settings', label: 'Platform Settings' },
        ],
      },
      {
        id: 'profile',
        label: 'Admin Profile',
        subNavs: [
          { id: 'general-profile', label: 'General Profile' },
          { id: 'password-security', label: 'Password & Security' },
          { id: 'theme-notifications', label: 'Theme & Notifications' },
          { id: 'authorized-signature', label: 'Authorized Signature' },
        ],
      },
    ],
  },
  {
    id: 'trainer',
    label: 'Trainer / Faculty',
    screens: [
      {
        id: 'trainer-dashboard',
        label: 'Trainer Dashboard',
        subNavs: [
          { id: 'trainer-kpis', label: 'Trainer KPI Cards' },
          { id: 'course-progress', label: 'Assigned Course Analytics' },
        ],
      },
      {
        id: 'teaching',
        label: 'Teaching & Curriculum',
        subNavs: [
          { id: 'my-courses', label: 'My Courses & Course Builder' },
          { id: 'learning-paths', label: 'Learning Paths' },
          { id: 'classes-batches', label: 'Classes & Batches' },
          { id: 'leaderboard', label: 'Academic Leaderboard' },
        ],
      },
      {
        id: 'schedule',
        label: 'Schedule & Attendance',
        subNavs: [
          { id: 'activity-planner', label: 'Activity & Planner' },
          { id: 'timetable', label: 'Classes & Timetable' },
          { id: 'live-sessions', label: 'Live Sessions' },
          { id: 'recorded-classes', label: 'Recorded Classes' },
          { id: 'attendance', label: 'Live Session Attendance' },
        ],
      },
      {
        id: 'evaluations',
        label: 'Assessments & Evaluation',
        subNavs: [
          { id: 'assessments', label: 'Assessments & Quizzes' },
          { id: 'question-banks', label: 'Question Banks' },
          { id: 'assignments', label: 'Student Assignments' },
          { id: 'ai-grading', label: 'AI Evaluation Queue' },
          { id: 'proctoring', label: 'Proctoring Incident Center' },
          { id: 'proctoring-videos', label: 'Proctoring Videos' },
        ],
      },
      {
        id: 'profile',
        label: 'Trainer Profile',
        subNavs: [
          { id: 'general-profile', label: 'General Profile' },
          { id: 'password-security', label: 'Password & Security' },
          { id: 'theme-notifications', label: 'Theme & Notifications' },
          { id: 'authorized-signature', label: 'Authorized Signature' },
        ],
      },
    ],
  },
  {
    id: 'student',
    label: 'Student / Learner',
    screens: [
      {
        id: 'student-dashboard',
        label: 'Student Dashboard',
        subNavs: [
          { id: 'overview', label: 'Overview & KPI Cards' },
          { id: 'leaderboard-standing', label: 'Leaderboard & XP Standing' },
        ],
      },
      {
        id: 'academics',
        label: 'Academics & Learning',
        subNavs: [
          { id: 'courses', label: 'Courses Catalog' },
          { id: 'my-learning', label: 'My Enrolled Courses & Player' },
          { id: 'my-paths', label: 'My Learning Paths & Progress' },
          { id: 'leaderboard', label: 'Leaderboard' },
        ],
      },
      {
        id: 'schedule',
        label: 'Schedule & Attendance',
        subNavs: [
          { id: 'planner', label: 'Activity & Planner' },
          { id: 'weekly-timetable', label: 'My Timetable' },
          { id: 'live-sessions', label: 'Live Sessions' },
          { id: 'recorded-classes', label: 'Recorded Classes' },
          { id: 'momentum', label: 'Learning Momentum' },
        ],
      },
      {
        id: 'assessments',
        label: 'Assessments & Quizzes',
        subNavs: [
          { id: 'my-assignments', label: 'My Assignments' },
          { id: 'quizzes-exams', label: 'Quizzes & Timed Exams (Exam Player)' },
          { id: 'my-results', label: 'Academic Results & Grades' },
          { id: 'proctoring-reports', label: 'My Proctoring Reports' },
        ],
      },
      {
        id: 'certificates',
        label: 'My Certificates',
        subNavs: [
          { id: 'earned-certificates', label: 'Earned Certificates & PDF Download' },
          { id: 'verify-certificate', label: 'Public Certificate Verification' },
        ],
      },
      {
        id: 'announcements',
        label: 'Announcements & Alerts',
        subNavs: [
          { id: 'inbox', label: 'Campus Announcements & Reminders' },
          { id: 'bell-dropdown', label: 'Top Bar Notification Bell' },
        ],
      },
      {
        id: 'profile',
        label: 'Student Profile',
        subNavs: [
          { id: 'general-profile', label: 'General Profile & Edit Avatar' },
          { id: 'password-security', label: 'Password & Security' },
          { id: 'theme-notifications', label: 'Theme & Notifications' },
          { id: 'authorized-signature', label: 'Authorized Signature' },
        ],
      },
    ],
  },
];
