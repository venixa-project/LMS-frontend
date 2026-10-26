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

// --- Roles & Permissions (4 Canonical Roles: platform_admin, org_admin, trainer, student) ---
export type CanonicalRole = 'platform_admin' | 'org_admin' | 'trainer' | 'student';
export type RoleName = 'platform_admin' | 'org_admin' | 'lms_admin' | 'industrial_admin' | 'trainer' | 'student' | 'instructor' | 'assessment_author' | 'grader' | 'learner' | 'guest' | 'bot_ai';
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
  rollNo?: string;
  specialization?: string;
  eligibleCourseIds?: string[];
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
  departmentId?: string;
  studentIds?: string[];
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
  departmentId?: string;
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
  learningOutcomes?: string[];
  prerequisites?: string[];
  shareableLinkEnabled?: boolean;
  enrollmentDeadline?: string;
  enrollmentCapacity?: number;
  enrollmentApprovalRequired?: boolean;
  createdBy?: string;
  createdAt: string;
  finalAssessment?: QuizAssessmentConfig;
  updatedAt: string;
}

// --- Assessment & Quiz Configuration Types for Course Builder ---
export interface QuizOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface QuizQuestionItem {
  id: string;
  prompt: string;
  type: 'single_choice' | 'multiple_choice' | 'true_false' | 'short_answer';
  options: QuizOption[];
  points: number;
  explanation?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  topic?: string;
  correctAnswerText?: string;
  needsReview?: boolean;
  source?: 'manual' | 'ai' | 'excel_csv' | 'pdf_word' | 'question_bank';
}

export interface UploadedDocumentInfo {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
  url?: string;
  text?: string;
  wordCount?: number;
  charCount?: number;
  pageCount?: number;
  isScannedOrImageOnly?: boolean;
}

export interface QuizAssessmentConfig {
  id: string;
  title: string;
  description?: string;
  scope: 'lesson_quiz' | 'module_assessment' | 'final_assessment';
  difficulty: 'easy' | 'medium' | 'hard';
  timeLimitMinutes: number;
  passingPercentage: number;
  allowedAttempts: number; // 0 for unlimited, 1, 2, 3...
  totalMarks: number;
  questions: QuizQuestionItem[];
  sourceDocumentNames?: string[];
  creationMode?: 'ai' | 'manual' | 'excel_csv' | 'pdf_word' | 'question_bank';
  status: 'draft' | 'ready';
  negativeMarkingEnabled?: boolean;
  negativeMarksPerQuestion?: number;
  randomizeQuestions?: boolean;
  randomQuestionCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CourseModule {
  id: string;
  title: string;
  description?: string;
  order: number;
  lessons: Lesson[];
  assessment?: QuizAssessmentConfig;
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
  quizConfig?: QuizAssessmentConfig;
  uploadedDocument?: UploadedDocumentInfo;
}

// --- Learning Path ---
export type LearningPathInstitutionType = 'school' | 'higher_ed' | 'corporate' | 'training_institute' | 'general';
export type LearningPathDifficulty = 'Beginner' | 'Intermediate' | 'Advanced';

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

  // Multi-Tenant Enterprise Enhancements
  institutionType?: LearningPathInstitutionType;
  category?: string;
  difficulty?: LearningPathDifficulty;
  departmentId?: string;
  targetGroup?: string;
  thumbnail?: string;
  createdBy?: string;
  creatorName?: string;
  creatorRole?: string;
  enforceSequence?: boolean;
  requirePassingAssessments?: boolean;
  certificateEligible?: boolean;
  certificateTitle?: string;
  assignedCohortIds?: string[];
  assignedUserIds?: string[];
  assignedDepartmentIds?: string[];
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
  status?: EntityStatus;
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
  departmentId?: string;
  description?: string;
  targetAudienceType?: 'all_cohort' | 'selected_students' | 'faculty_only' | 'combined' | string;
  targetStudentIds?: string[];
  targetStaffIds?: string[];
  audienceScope?: 'students' | 'faculty' | 'both';
  isDraft?: boolean;
  status: SessionStatus;
  attendance: AttendanceRecord[];
  recordingThumbnail?: string;
  recordingViews?: number;
  recordingChapters?: { time: string; title: string }[];
  recordingNotes?: string;
  isBookmarked?: boolean;
  watchProgressPercentage?: number;
  createdAt: string;
  updatedAt: string;
  room?: string;
  dayOfWeek?: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  cohortName?: string;
  courseTitle?: string;
  createdBy?: string;
  createdRole?: string;
}

export interface AttendanceRecord {
  userId: string;
  userName: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  joinedAt?: string;
  leftAt?: string;
}

// --- Employee Attendance (Faculty, Administrative Staff, Non-Teaching Staff) ---
export interface EmployeeAttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  role: 'faculty' | 'trainer' | 'admin_staff' | 'support_staff';
  roleTitle: string;
  department: string;
  departmentId: string;
  date: string;
  status: 'present' | 'absent' | 'on_leave' | 'late' | 'remote';
  checkInTime?: string;
  checkOutTime?: string;
  leaveType?: 'sick' | 'casual' | 'annual' | 'duty';
  notes?: string;
}

export interface EmployeeAttendanceSummary {
  reportingPeriod: string;
  totalEmployees: number;
  presentCount: number;
  absentCount: number;
  approvedLeaveCount: number;
  remoteCount: number;
  attendanceRate: number;
}

// --- Student Attendance (Enrolled Learners, Cohorts & Batches) ---
export interface StudentSessionAttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  rollNo: string;
  cohortId: string;
  cohortName: string;
  cohortCode: string;
  courseTitle: string;
  date: string;
  timeSlot: string;
  facultyName: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  method?: string;
  notes?: string;
}

export interface StudentAttendanceSummary {
  reportingPeriod: string;
  totalExpected: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  approvedLeaveCount: number;
  attendanceRate: number;
}

export interface CohortAttendanceSummary {
  cohortId: string;
  cohortName: string;
  cohortCode: string;
  courseTitle: string;
  facultyName: string;
  totalExpected: number;
  presentCount: number;
  absentCount: number;
  approvedLeaveCount: number;
  attendanceRate: number;
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
  bankId?: string;
  assessmentId?: string;
  type: QuestionType;
  prompt: string;
  instructions?: string;
  options?: QuestionOption[];
  correctAnswer?: string;
  correctAnswers?: string[];
  answerKey?: string;
  explanation?: string;
  rubric?: string;
  topic?: string;
  points: number;
  tags?: string[];
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
  proctoringPolicyLevel?: ProctoringPolicyLevel;
  proctoringPolicy?: ProctoringPolicy;
  aiGradingEnabled?: boolean;
  version?: number;
  status: EntityStatus;
  accommodations?: Accommodation[];
  rubricId?: string;
  createdAt: string;
  updatedAt: string;
  // Extended AI & Builder Properties
  creationMode?: 'ai_generated' | 'manual';
  sourceDocument?: {
    name: string;
    size: number;
    type: string;
    extractedWordCount: number;
  };
  difficultyDistribution?: {
    easy: number;
    medium: number;
    hard: number;
  };
  questionTypeDistribution?: Record<string, number>;
  questionsData?: Question[];
}

// --- AI Assessment Generation Types ---
export type AssessmentDifficultySetting = 'easy' | 'medium' | 'hard' | 'mixed';

export type AssessmentQuestionTypeSetting =
  | 'single_choice'
  | 'multiple_choice'
  | 'true_false'
  | 'short_answer'
  | 'essay';

export interface AIGenerationConfig {
  documentName: string;
  documentText: string;
  difficulty: AssessmentDifficultySetting;
  questionCount: number;
  questionTypes: AssessmentQuestionTypeSetting[];
  defaultMarksPerType?: Record<AssessmentQuestionTypeSetting, number>;
  courseId?: string;
  title?: string;
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
  studentExplanation?: string;
  policyLevel?: 'basic' | 'monitored' | 'strict';
}

export type ProctoringPolicyLevel = 'basic' | 'monitored' | 'strict';

export interface ProctoringPolicy {
  id: string;
  name: string;
  level: ProctoringPolicyLevel;
  description: string;
  requireScreenShare: boolean;
  requireMicrophone: boolean;
  requireWebcam: boolean;
  requireFullscreen: boolean;
  pauseOnScreenShareLoss: boolean;
  pauseOnTabSwitch: boolean;
  pauseOnNetworkLoss: boolean;
  disclosureText: string;
  retentionDays: number;
}

export type ProctoringEventCategory =
  | 'tab_visibility'
  | 'window_focus'
  | 'fullscreen_exit'
  | 'screen_share_interruption'
  | 'mic_interruption'
  | 'webcam_interruption'
  | 'network_interruption'
  | 'jitsi_conference'
  | 'timing_event';

export type ProctoringSeverity = 'informational' | 'warning' | 'critical' | 'review_required';

export interface ProctoringEvent {
  id: string;
  sessionId: string;
  assessmentId: string;
  learnerId: string;
  category: ProctoringEventCategory;
  timestamp: string;
  clientTimestamp: number;
  relativeSeconds: number;
  severity: ProctoringSeverity;
  title: string;
  description: string;
  technicalMetadata?: Record<string, unknown>;
  evidenceSnapshot?: string;
  evidenceType?: 'screenshot' | 'audio_sample' | 'telemetry_log';
  studentExplanation?: string;
  studentExplanationSubmittedAt?: string;
  instructorVerdict?: 'no_violation' | 'warning' | 'violation' | 'technical_accepted';
}

export type ProctoringSessionStatus =
  | 'pre_flight'
  | 'ready'
  | 'in_progress'
  | 'warning'
  | 'paused'
  | 'recovering'
  | 'submitted'
  | 'under_review'
  | 'reviewed';

export interface ProctoringSession {
  id: string;
  attemptId: string;
  assessmentId: string;
  assessmentTitle: string;
  learnerId: string;
  learnerName: string;
  policy: ProctoringPolicy;
  status: ProctoringSessionStatus;
  startedAt: string;
  endedAt?: string;
  totalDurationSeconds?: number;
  activeScreenShare: boolean;
  activeMic: boolean;
  activeWebcam: boolean;
  isFullscreen: boolean;
  isOnline: boolean;
  jitsiRoomName?: string;
  jitsiRoomUrl?: string;
  jitsiStatus?: 'connected' | 'connecting' | 'disconnected';
  events: ProctoringEvent[];
  recordingUrl?: string;
  recordingDuration?: number;
  isSimulatedRecording?: boolean;
  studentAppeal?: {
    appealId: string;
    explanation: string;
    submittedAt: string;
    status: 'pending' | 'reviewed';
  };
  reviewDecision?: {
    reviewerId: string;
    reviewerName: string;
    outcome:
      | 'no_violation'
      | 'warning_issued'
      | 'further_review'
      | 'violation_confirmed'
      | 'technical_incident_accepted';
    explanation: string;
    timestamp: string;
  };
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
