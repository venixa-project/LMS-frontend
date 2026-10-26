// ============================================================
// VeniLearn LMS - Planner & Activity Types
// ============================================================

export type PlannerActivityType = 'task' | 'reminder' | 'meeting' | 'deadline' | 'lms_event';

export type PlannerPriority = 'high' | 'medium' | 'low';

export type PlannerStatus = 'pending' | 'in_progress' | 'completed';

export type PlannerReminderLead = 'none' | '10_min' | '30_min' | '1_hour' | '1_day';

export type PlannerRecurrence = 'none' | 'daily' | 'weekly' | 'monthly';

export type PlannerSource = 'manual' | 'lms_auto';

export type RelatedLMSType =
  | 'cohort'
  | 'course'
  | 'live_session'
  | 'assessment'
  | 'attendance'
  | 'grading'
  | 'department'
  | 'general';

export interface PlannerActivity {
  id: string;
  title: string;
  description?: string;
  type: PlannerActivityType;
  date: string; // YYYY-MM-DD in local time
  startTime?: string; // HH:mm (24hr or 12hr)
  endTime?: string; // HH:mm
  priority: PlannerPriority;
  status: PlannerStatus;
  reminder: PlannerReminderLead;
  recurrence?: PlannerRecurrence;
  source: PlannerSource; // 'manual' (admin created) vs 'lms_auto' (from LMS)
  
  // LMS Integration metadata
  relatedLmsType?: RelatedLMSType;
  relatedLmsId?: string;
  relatedLmsTitle?: string;
  relatedLmsUrl?: string;

  // Reminders & completion
  completedAt?: string;
  isOverdue?: boolean;
  createdAt: string;
  updatedAt: string;

  // For recurring virtual expansion instances
  isRecurringInstance?: boolean;
  originalActivityId?: string;
}

export interface ActivityFilterOptions {
  searchQuery?: string;
  type?: PlannerActivityType | 'all';
  priority?: PlannerPriority | 'all';
  status?: PlannerStatus | 'all';
  source?: PlannerSource | 'all';
  date?: string;
  startDate?: string;
  endDate?: string;
}

export interface PlannerNotificationState {
  hasWebNotificationSupport: boolean;
  permission: NotificationPermission | 'unsupported';
  isListening: boolean;
}
