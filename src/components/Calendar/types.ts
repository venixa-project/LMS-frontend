export type CalendarView = 'day' | 'week' | 'month';

export type EventCategory = 'live' | 'lab' | 'capstone' | 'office-hours' | 'study';

export interface AcademicEvent {
  id: string;
  title: string;
  course: string;
  courseId?: string;
  instructor: string;
  instructorRole?: string;
  cohort: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  durationMinutes: number;
  location: string;
  category: EventCategory;
  description?: string;
  meetingUrl?: string;
  isVirtual?: boolean;
  materials?: string[];
  recurringWeekday?: number; // 1 = Monday, 2 = Tuesday, ..., 7 = Sunday
  isUserCreated?: boolean;
}

export interface EventFormData {
  title: string;
  category: EventCategory;
  date: string;
  startTime: string;
  endTime: string;
  course: string;
  instructor: string;
  location: string;
  description: string;
}

export interface FormErrors {
  title?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  course?: string;
}

export interface EventPosition {
  top: number;
  height: number;
  leftPercent: number;
  widthPercent: number;
}

export interface CategoryMeta {
  id: EventCategory;
  label: string;
  color: string;
  bg: string;
  border: string;
  text: string;
  dotColor: string;
}
