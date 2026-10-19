// ============================================================
// LMS Platform - Core Type Definitions
// ============================================================

// --- Status Taxonomy ---
export type EntityStatus = 'draft' | 'in_review' | 'scheduled' | 'published' | 'active' | 'paused' | 'completed' | 'archived' | 'failed' | 'cancelled' | 'expired' | 'needs_review';
export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'failed' | 'cancelled';
export type UserAccountStatus = 'invited' | 'active' | 'suspended' | 'deactivated' | 'pending_approval';
export type AttemptStatus = 'not_started' | 'in_progress' | 'submitted' | 'auto_submitted' | 'interrupted' | 'under_review' | 'graded' | 'results_released' | 'expired';
export type AIStatus = 'not_enabled' | 'configured' | 'processing' | 'suggestion_ready' | 'needs_human_review' | 'failed' | 'overridden';
export type GradingStatus = 'unassigned' | 'assigned' | 'in_progress' | 'draft_graded' | 'submitted' | 'moderation' | 'completed' | 'released';
export type ProctoringIncidentStatus = 'new' | 'in_review' | 'cleared' | 'escalated' | 'confirmed';
export type SessionStatus = 'scheduled' | 'live' | 'ended' | 'cancelled' | 'failed' | 'rescheduled';
export type NotificationDeliveryStatus = 'queued' | 'sent' | 'delivered' | 'failed' | 'retrying' | 'bounced';

// --- Roles & Permissions (3 Core Platform Roles: platform_admin, trainer, student) ---
export type CanonicalRole = 'platform_admin' | 'trainer' | 'student';
export type RoleName = 'platform_admin' | 'trainer' | 'student' | 'org_admin' | 'lms_admin' | 'instructor' | 'assessment_author' | 'grader' | 'learner' | 'guest' | 'bot_ai';
export type PermissionAction = 'view' | 'create' | 'edit' | 'archive' | 'publish' | 'assign' | 'enroll' | 'invite' | 'grade' | 'moderate' | 'release_results' | 'export' | 'configure' | 'review' | 'revoke' | 'delete';
export type PermissionResource = 'users' | 'organizations' | 'cohorts' | 'courses' | 'lessons' | 'paths' | 'live_sessions' | 'question_banks' | 'assessments' | 'submissions' | 'grading' | 'proctoring' | 'reports' | 'notifications' | 'integrations' | 'platform_settings' | 'roles' | 'certificates' | 'departments';
export type PermissionScope = 'global' | 'organization' | 'department' | 'cohort' | 'course' | 'assessment' | 'assigned' | 'own';

export interface Permission {
  id: string;
  resource: PermissionResource;
  action: PermissionAction;
  scope: PermissionScope;
  description: string;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
}

export interface Role {
  id: string;
  name: string;
  displayName: string;
  description: string;
  isTemplate: boolean;
  isCustom: boolean;
  permissions: Permission[];
  memberCount: number;
  scope: PermissionScope;
  status: EntityStatus;
  createdAt: string;
  updatedAt: string;
}

// --- User & Profile ---
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  avatar?: string;
  phone?: string;
  locale?: string;
  timezone?: string;
  roles: Role[];
  activeRole: RoleName;
  organizationId: string;
  departmentId?: string;
  status: UserAccountStatus;
  lastLogin?: string;
  mfaEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

// --- Organization ---
export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  locale: string;
  timezone: string;
  contactEmail: string;
  contactPhone?: string;
  status: EntityStatus;
  settings: Record<string, unknown>;
  userCount: number;
  createdAt: string;
  updatedAt: string;
}

// --- Department ---
export interface Department {
  id: string;
  name: string;
  organizationId: string;
  parentId?: string;
  status: 'active' | 'inactive';
  memberCount: number;
  children?: Department[];
  createdAt: string;
  updatedAt: string;
}

// --- Cohort ---
export interface Cohort {
  id: string;
  name: string;
  code: string;
  organizationId: string;
  courseId?: string;
  programId?: string;
  instructors?: string[];
  instructorIds?: string[];
  startDate: string;
  endDate: string;
  learnerCount: number;
  capacity?: number;
  status: EntityStatus;
  createdAt: string;
  updatedAt: string;
}

// --- Course ---
export interface Course {
  id: string;
  title: string;
  shortDescription?: string;
  description: string;
  thumbnail?: string;
  category: string;
  tags?: string[];
  language?: string;
  audience?: string;
  estimatedDuration?: number; // minutes
  durationHours?: number;
  instructors?: string[];
  status: EntityStatus;
  visibility?: 'public' | 'private' | 'restricted';
  version: number;
  completionPolicy?: string;
  modules: CourseModule[];
  learnerCount?: number;
  enrolledLearners?: number;
  completionRate?: number;
  level?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CourseModule {
  id: string;
  title: string;
  description?: string;
  order: number;
  lessons: Lesson[];
}

export interface Lesson {
  id: string;
  title: string;
  type: 'video' | 'document' | 'rich_text' | 'external_link' | 'quiz' | 'assignment' | 'live_session' | 'downloadable';
  content?: string;
  duration?: number;
  durationMinutes?: number;
  order: number;
  status?: EntityStatus;
  isRequired?: boolean;
  isCompleted?: boolean;
  contentUrl?: string;
}

// --- Learning Path ---
export interface LearningPath {
  id: string;
  title: string;
  objective?: string;
  description?: string;
  audience?: string;
  targetRole?: string;
  estimatedHours?: number;
  courses: LearningPathCourse[];
  courseIds?: string[];
  prerequisites: string[];
  completionThreshold?: number;
  dueDate?: string;
  expiryDate?: string;
  reEnrollmentPolicy?: string;
  status: EntityStatus;
  learnerCount?: number;
  enrolledCount?: number;
  createdAt: string;
  updatedAt: string;
  organizationId?: string;
}

export interface LearningPathCourse {
  courseId: string;
  order: number;
  isRequired?: boolean;
  prerequisiteCourseIds?: string[];
  id?: string;
  title?: string;
  category?: string;
  durationHours?: number;
}

// --- Enrollment ---
export interface Enrollment {
  id: string;
  userId: string;
  courseId?: string;
  pathId?: string;
  cohortId?: string;
  status: 'active' | 'completed' | 'dropped' | 'expired' | 'waitlisted';
  progress: number;
  enrolledAt: string;
  completedAt?: string;
  dueDate?: string;
}

// --- Live Session ---
export interface LiveSession {
  id: string;
  title: string;
  courseId?: string;
  cohortId?: string;
  instructorId: string;
  instructorName?: string;
  date?: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  durationMinutes?: number;
  timezone?: string;
  capacity?: number;
  enrolledCount?: number;
  provider: string;
  joinLink?: string;
  meetingUrl?: string;
  recordingLink?: string;
  recordingPolicy?: string;
  recordingEnabled?: boolean;
  recordingUrl?: string;
  agenda?: string;
  materials?: string[];
  status: SessionStatus;
  attendance: AttendanceRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceRecord {
  userId: string;
  userName: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  joinedAt?: string;
  leftAt?: string;
}

// --- Question Bank ---
export interface QuestionBank {
  id: string;
  name: string;
  owner?: string;
  subject: string;
  tags: string[];
  questionCount?: number;
  version: number;
  status: EntityStatus;
  scope: PermissionScope;
  createdAt: string;
  updatedAt: string;
}

export type QuestionType = 'single_choice' | 'multiple_choice' | 'true_false' | 'fill_blank' | 'numeric' | 'matching' | 'ordering' | 'short_answer' | 'short_text' | 'long_text' | 'essay' | 'file_upload';

export interface Question {
  id: string;
  bankId: string;
  type: QuestionType;
  prompt: string;
  instructions?: string;
  options?: QuestionOption[];
  correctAnswer?: string;
  answerKey?: string;
  explanation?: string;
  points: number;
  tags: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  media?: string;
  accessibilityNotes?: string;
  version?: number;
  status?: EntityStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
  order?: number;
}

// --- Assessment ---
export interface Assessment {
  id: string;
  title: string;
  instructions?: string;
  courseId?: string;
  cohortId?: string;
  questions?: string[]; // question IDs
  questionIds?: string[];
  totalMarks: number;
  duration?: number; // minutes
  durationMinutes?: number;
  attempts?: number;
  maxAttempts?: number;
  randomize?: boolean;
  passmark?: number;
  passingMarks?: number;
  availabilityStart?: string;
  availabilityEnd?: string;
  feedbackVisibility?: 'immediate' | 'after_window' | 'manual' | 'never';
  resultReleasePolicy?: 'immediate' | 'after_window' | 'manual';
  mode?: 'human' | 'ai_assisted' | 'automated';
  proctoringRequired: boolean;
  aiGradingEnabled?: boolean;
  version?: number;
  status: EntityStatus;
  accommodations?: Accommodation[];
  rubricId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Accommodation {
  id: string;
  learnerId: string;
  type: 'extra_time' | 'breaks' | 'large_text' | 'screen_reader' | 'alternative_proctoring';
  value: string;
  approvedBy: string;
  approvedAt: string;
}

// --- Rubric ---
export interface Rubric {
  id: string;
  name: string;
  title?: string;
  criteria: RubricCriterion[];
  totalPoints: number;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface RubricCriterion {
  id: string;
  name: string;
  title?: string;
  description: string;
  weight: number;
  maxPoints?: number;
  levels: RubricLevel[];
}

export interface RubricLevel {
  id?: string;
  label: string;
  name?: string;
  description: string;
  descriptor?: string;
  points: number;
}

// --- Assessment Attempt ---
export interface AssessmentAttempt {
  id: string;
  assessmentId: string;
  learnerId: string;
  learnerName: string;
  status: AttemptStatus;
  startedAt?: string;
  submittedAt?: string;
  answers: AttemptAnswer[];
  score?: number;
  totalMarks: number;
  passed?: boolean;
  feedback?: string;
  gradedBy?: string;
  gradedAt?: string;
  timeSpent?: number;
}

export interface AttemptAnswer {
  questionId: string;
  answer: string;
  isCorrect?: boolean;
  points?: number;
  feedback?: string;
  flagged: boolean;
}

// --- Grading ---
export interface GradingTask {
  id: string;
  attemptId?: string;
  submissionId?: string;
  assessmentId: string;
  assessmentTitle: string;
  learnerId: string;
  learnerName: string;
  graderId?: string;
  graderName?: string;
  status: GradingStatus;
  dueDate?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  isDoubleMarking?: boolean;
  markingStage?: 'first' | 'second' | 'moderation' | 'final';
  score?: number;
  totalMarks: number;
  maxScore?: number;
  rubricScores?: Record<string, number>;
  feedback?: string;
  privateNotes?: string;
  aiSuggestion?: AISuggestion;
  aiPreliminaryScore?: number;
  submittedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AISuggestion {
  id: string;
  score: number;
  confidence: number;
  evidence: string[];
  rubricScores: Record<string, number>;
  feedback: string;
  model: string;
  version: string;
  generatedAt: string;
  status: AIStatus;
  reviewerAction?: 'accepted' | 'edited' | 'rejected' | 'escalated';
  reviewerReason?: string;
}

// --- Proctoring ---
export interface ProctoringIncident {
  id: string;
  attemptId: string;
  learnerId: string;
  learnerName: string;
  assessmentId: string;
  assessmentTitle: string;
  eventType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  timestamp: string;
  status: ProctoringIncidentStatus;
  reviewerId?: string;
  reviewerNotes?: string;
  decision?: string;
  evidence?: string[];
}

// --- Certificate ---
export interface Certificate {
  id: string;
  learnerId: string;
  learnerName: string;
  courseId: string;
  courseName?: string;
  courseTitle?: string;
  issueDate?: string;
  issuedAt?: string;
  expiryDate?: string;
  status: 'active' | 'expired' | 'revoked';
  verificationUrl?: string;
  verificationHash?: string;
  templateId?: string;
}

// --- Notification ---
export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  category: string;
  link?: string;
  isRead: boolean;
  timestamp: string;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  eventTrigger: string;
  channel: 'in_app' | 'email' | 'sms';
  channels?: string[];
  language: string;
  subject: string;
  body: string;
  bodyTemplate?: string;
  variables: string[];
  version: number;
  enabled: boolean;
  isEnabled?: boolean;
  createdAt: string;
  updatedAt: string;
}

// --- Integration ---
export interface Integration {
  id: string;
  name: string;
  type: 'identity_sso' | 'video' | 'email_sms' | 'ai' | 'storage' | 'hris_sis' | 'webhook';
  status: 'configured' | 'not_configured' | 'error' | 'healthy' | 'degraded';
  provider: string;
  lastChecked?: string;
  lastSync?: string;
  owner: string;
  description?: string;
  documentationUrl?: string;
  healthState: string;
  createdAt: string;
  updatedAt: string;
}

// --- Audit ---
export interface AuditEntry {
  id: string;
  actor: string;
  actorName: string;
  actorEmail?: string;
  action: string;
  resource: string;
  resourceType?: string;
  resourceId: string;
  timestamp: string;
  changeSummary: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  reason?: string;
  ipAddress?: string;
  outcome: 'success' | 'failure' | 'denied';
}

// --- Gamification ---
export interface GamificationProfile {
  userId: string;
  totalPoints: number;
  level: number;
  streak: number;
  badges: Badge[];
  pointsHistory: PointsEvent[];
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: string;
}

export interface PointsEvent {
  id: string;
  activity: string;
  points: number;
  earnedAt: string;
  source: string;
}

// --- Dashboard Metrics ---
export interface DashboardMetric {
  label: string;
  value: number | string;
  change?: number;
  trend?: 'up' | 'down' | 'stable';
  description: string;
  link?: string;
}

// --- Report ---
export interface Report {
  id: string;
  name: string;
  title?: string;
  category?: string;
  type: string;
  description: string;
  filters: Record<string, unknown>;
  dateRange: { start: string; end: string };
  status: 'ready' | 'generating' | 'failed';
  generatedAt?: string;
  dataAsOf?: string;
}
