// ============================================================
// LMS - Data Definitions (Clean / Empty Production State)
// All mock entities removed - data loads from PostgreSQL backend
// ============================================================
import {
  Organization, Department, Cohort, Course,
  LearningPath, Enrollment, LiveSession, QuestionBank, Question,
  Assessment, AssessmentAttempt, GradingTask, ProctoringIncident,
  Certificate, Integration, AuditEntry, Report, NotificationTemplate,
  Rubric, GamificationProfile, Role, DashboardMetric,
} from '../types';

// --- Organizations ---
export const mockOrganizations: Organization[] = [];

// --- Departments ---
export const mockDepartments: Department[] = [];

// --- Cohorts ---
export const mockCohorts: Cohort[] = [];

// --- Courses ---
export const mockCourses: Course[] = [];

// --- Enrollments ---
export const mockEnrollments: Enrollment[] = [];

// --- Learning Paths ---
export const mockLearningPaths: LearningPath[] = [];

// --- Live Sessions ---
export const mockLiveSessions: LiveSession[] = [];

// --- Question Banks ---
export const mockQuestionBanks: QuestionBank[] = [];

// --- Questions ---
export const mockQuestions: Question[] = [];

// --- Assessments ---
export const mockAssessments: Assessment[] = [];

// --- Assessment Attempts ---
export const mockAttempts: AssessmentAttempt[] = [];

// --- Rubrics ---
export const mockRubrics: Rubric[] = [];

// --- Grading Tasks ---
export const mockGradingTasks: GradingTask[] = [];

// --- Proctoring Incidents ---
export const mockProctoringIncidents: ProctoringIncident[] = [];

// --- Certificates ---
export const mockCertificates: Certificate[] = [];

// --- Integrations ---
export const mockIntegrations: Integration[] = [];

// --- Audit Entries ---
export const mockAuditEntries: AuditEntry[] = [];

// --- Reports ---
export const mockReports: Report[] = [];

// --- Notification Templates ---
export const mockNotificationTemplates: NotificationTemplate[] = [];

// --- Roles ---
export const mockRoles: Role[] = [];

// --- Gamification ---
export const mockGamificationProfile: GamificationProfile = {
  userId: '',
  totalPoints: 0,
  level: 1,
  streak: 0,
  badges: [],
  pointsHistory: [],
};

// --- Dashboard Metrics ---
export const adminDashboardMetrics: DashboardMetric[] = [
  { label: 'Active Learners', value: 0, change: 0, trend: 'stable', description: 'Users who accessed the platform in the last 30 days', link: '/people' },
  { label: 'Active Enrollments', value: 0, change: 0, trend: 'stable', description: 'Currently active course enrollments', link: '/courses' },
  { label: 'Course Completions', value: 0, change: 0, trend: 'stable', description: 'Courses completed this month', link: '/reports' },
  { label: 'Avg Completion Rate', value: '0%', change: 0, trend: 'stable', description: 'Average completion rate across all courses' },
  { label: 'Live Sessions This Week', value: 0, change: 0, trend: 'stable', description: 'Scheduled live sessions for current week', link: '/live-sessions' },
  { label: 'Assessments In Progress', value: 0, trend: 'stable', description: 'Currently active assessment attempts' },
  { label: 'Pending Approvals', value: 0, description: 'Items awaiting review and approval', link: '/courses' },
  { label: 'Grading Backlog', value: 0, change: 0, trend: 'stable', description: 'Submissions awaiting grading', link: '/grading' },
];

export const learnerDashboardMetrics: DashboardMetric[] = [
  { label: 'Courses In Progress', value: 0, description: 'Active courses you are enrolled in', link: '/my-learning' },
  { label: 'Courses Completed', value: 0, description: 'Successfully completed courses' },
  { label: 'Total Points', value: 0, description: 'Gamification points earned' },
  { label: 'Current Streak', value: '0 days', description: 'Consecutive days of learning' },
  { label: 'Certificates', value: 0, description: 'Active certificates earned', link: '/my-certificates' },
  { label: 'Assessments Due', value: 0, description: 'Upcoming assessment deadlines', link: '/my-assessments' },
];

export const mockAuditLog = mockAuditEntries;
