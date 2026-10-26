// ============================================================
// VeniLearn LMS - Planner & Activity Store
// Supports LocalStorage persistence, LMS auto-sync, recurrence
// calculation, and reminder checks.
// ============================================================

import {
  PlannerActivity,
  ActivityFilterOptions,
  PlannerActivityType,
  PlannerPriority,
  PlannerStatus,
  PlannerReminderLead,
  PlannerRecurrence
} from '../types/planner';
import {
  mockCohorts,
  mockLiveSessions,
  mockAssessments,
  mockGradingTasks
} from '../data/mockData';

const STORAGE_KEY = 'venilearn_admin_planner_activities_v2';

// Helper to format Date to YYYY-MM-DD in local time
export const formatLocalDate = (d: Date = new Date()): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Seed realistic Admin Activities for October 2026
const getInitialSeedActivities = (): PlannerActivity[] => {
  return [
    {
      id: 'act-adm-001',
      title: 'Academic Leadership Morning Roll Call & Briefing',
      description: 'Review institutional student and faculty attendance turnouts with Department Heads.',
      type: 'meeting',
      date: '2026-10-22',
      startTime: '09:30',
      endTime: '10:15',
      priority: 'high',
      status: 'pending',
      reminder: '10_min',
      recurrence: 'daily',
      source: 'manual',
      relatedLmsType: 'attendance',
      relatedLmsTitle: 'Student Attendance Ledger',
      relatedLmsUrl: '/attendance',
      createdAt: '2026-10-20T08:00:00Z',
      updatedAt: '2026-10-20T08:00:00Z'
    },
    {
      id: 'act-adm-002',
      title: 'Review Q4 2026 Engineering Attendance Ledger',
      description: 'Examine attendance threshold compliance and verify medical leave notes for batch ENG-Q4-26.',
      type: 'task',
      date: '2026-10-22',
      startTime: '11:00',
      endTime: '12:00',
      priority: 'high',
      status: 'pending',
      reminder: '30_min',
      recurrence: 'none',
      source: 'manual',
      relatedLmsType: 'cohort',
      relatedLmsId: 'coh-001',
      relatedLmsTitle: 'Q4 2026 Engineering Batch',
      relatedLmsUrl: '/cohorts',
      createdAt: '2026-10-21T09:00:00Z',
      updatedAt: '2026-10-21T09:00:00Z'
    },
    {
      id: 'act-adm-003',
      title: 'Finalize Midterm Exam Proctoring Roster',
      description: 'Audit AI proctoring configuration and assign faculty invigilators for upcoming quizzes.',
      type: 'deadline',
      date: '2026-10-22',
      startTime: '15:00',
      endTime: '16:00',
      priority: 'high',
      status: 'pending',
      reminder: '1_hour',
      recurrence: 'none',
      source: 'manual',
      relatedLmsType: 'assessment',
      relatedLmsId: 'asm-001',
      relatedLmsTitle: 'JavaScript Fundamentals Quiz',
      relatedLmsUrl: '/proctoring',
      createdAt: '2026-10-18T10:00:00Z',
      updatedAt: '2026-10-18T10:00:00Z'
    },
    {
      id: 'act-adm-004',
      title: 'Follow-up on Unassigned Grading Submissions',
      description: 'Ensure double-marking stages have allocated graders for React Capstone attempts.',
      type: 'reminder',
      date: '2026-10-22',
      startTime: '16:30',
      endTime: '17:00',
      priority: 'medium',
      status: 'pending',
      reminder: '30_min',
      recurrence: 'none',
      source: 'manual',
      relatedLmsType: 'grading',
      relatedLmsTitle: 'Grading Oversight Queue',
      relatedLmsUrl: '/grading',
      createdAt: '2026-10-21T11:00:00Z',
      updatedAt: '2026-10-21T11:00:00Z'
    },
    {
      id: 'act-adm-005',
      title: 'Verify Student Medical Leaves for Oct 20 Session',
      description: 'Overdue task: Dean certification required for excused absence requests.',
      type: 'reminder',
      date: '2026-10-21',
      startTime: '14:00',
      priority: 'high',
      status: 'pending',
      reminder: '1_day',
      recurrence: 'none',
      source: 'manual',
      relatedLmsType: 'attendance',
      relatedLmsTitle: 'Attendance Verification',
      relatedLmsUrl: '/attendance',
      createdAt: '2026-10-19T09:00:00Z',
      updatedAt: '2026-10-19T09:00:00Z'
    },
    {
      id: 'act-adm-006',
      title: 'Bi-Weekly Department Chairs Council',
      description: 'Review accreditation requirements, course publishing pipeline, and faculty allocations.',
      type: 'meeting',
      date: '2026-10-23',
      startTime: '10:00',
      endTime: '11:30',
      priority: 'medium',
      status: 'pending',
      reminder: '1_day',
      recurrence: 'weekly',
      source: 'manual',
      relatedLmsType: 'department',
      relatedLmsTitle: 'Academic Departments',
      relatedLmsUrl: '/departments',
      createdAt: '2026-10-15T10:00:00Z',
      updatedAt: '2026-10-15T10:00:00Z'
    },
    {
      id: 'act-adm-007',
      title: 'Review Course Approval: Leadership and Communication',
      description: 'Validate course syllabus and learning outcomes before publishing to the main catalogue.',
      type: 'task',
      date: '2026-10-24',
      startTime: '13:00',
      endTime: '14:00',
      priority: 'medium',
      status: 'pending',
      reminder: '30_min',
      recurrence: 'none',
      source: 'manual',
      relatedLmsType: 'course',
      relatedLmsId: 'crs-005',
      relatedLmsTitle: 'Leadership and Communication',
      relatedLmsUrl: '/courses',
      createdAt: '2026-10-16T14:00:00Z',
      updatedAt: '2026-10-16T14:00:00Z'
    },
    {
      id: 'act-adm-008',
      title: 'Cloud Lab Infrastructure Maintenance Verification',
      description: 'Check Docker runner cluster availability before weekend engineering lab work.',
      type: 'reminder',
      date: '2026-10-25',
      startTime: '09:00',
      endTime: '09:30',
      priority: 'low',
      status: 'pending',
      reminder: '1_hour',
      recurrence: 'none',
      source: 'manual',
      relatedLmsType: 'general',
      relatedLmsTitle: 'IT Infrastructure Notice',
      relatedLmsUrl: '/notifications',
      createdAt: '2026-10-18T16:00:00Z',
      updatedAt: '2026-10-18T16:00:00Z'
    }
  ];
};

// Harvest automatically sourced LMS events without duplicating
export const getHarvestedLMSEvents = (): PlannerActivity[] => {
  const events: PlannerActivity[] = [];

  // 1. Cohort Start Dates from mockCohorts
  mockCohorts.forEach((coh) => {
    if (coh.startDate) {
      events.push({
        id: `lms-cohort-${coh.id}`,
        title: `Cohort Start: ${coh.name} (${coh.code})`,
        description: `Scheduled cohort start date. Capacity: ${coh.capacity} students. Faculty assigned: ${coh.instructors?.length || 1}.`,
        type: 'lms_event',
        date: coh.startDate,
        startTime: '09:00',
        endTime: '10:00',
        priority: coh.status === 'active' ? 'high' : 'medium',
        status: coh.status === 'completed' ? 'completed' : 'pending',
        reminder: '1_day',
        recurrence: 'none',
        source: 'lms_auto',
        relatedLmsType: 'cohort',
        relatedLmsId: coh.id,
        relatedLmsTitle: coh.name,
        relatedLmsUrl: '/cohorts',
        createdAt: coh.createdAt,
        updatedAt: coh.updatedAt
      });
    }
  });

  // 2. Scheduled Live Sessions
  mockLiveSessions.forEach((sess) => {
    if (sess.date) {
      events.push({
        id: `lms-session-${sess.id}`,
        title: `Live Session: ${sess.title}`,
        description: `Live interactive webinar. Instructor: ${sess.instructorName}. Duration: ${sess.duration} mins.`,
        type: 'meeting',
        date: sess.date,
        startTime: sess.startTime || '10:00',
        endTime: sess.endTime || '11:30',
        priority: 'high',
        status: sess.status === 'ended' ? 'completed' : 'pending',
        reminder: '30_min',
        recurrence: 'none',
        source: 'lms_auto',
        relatedLmsType: 'live_session',
        relatedLmsId: sess.id,
        relatedLmsTitle: sess.title,
        relatedLmsUrl: '/live-sessions',
        createdAt: sess.createdAt,
        updatedAt: sess.updatedAt
      });
    }
  });

  // 3. Assessment Deadlines
  mockAssessments.forEach((asm) => {
    if (asm.availabilityEnd) {
      const datePart = asm.availabilityEnd.split('T')[0];
      events.push({
        id: `lms-assessment-${asm.id}`,
        title: `Assessment Deadline: ${asm.title}`,
        description: `Examination closing window. Duration: ${asm.duration} mins, Total Marks: ${asm.totalMarks}.`,
        type: 'deadline',
        date: datePart,
        startTime: '23:59',
        priority: 'high',
        status: 'pending',
        reminder: '1_day',
        recurrence: 'none',
        source: 'lms_auto',
        relatedLmsType: 'assessment',
        relatedLmsId: asm.id,
        relatedLmsTitle: asm.title,
        relatedLmsUrl: '/assessments',
        createdAt: asm.createdAt,
        updatedAt: asm.updatedAt
      });
    }
  });

  // 4. Grading Tasks Due
  mockGradingTasks.forEach((gt) => {
    if (gt.dueDate && gt.status !== 'completed') {
      events.push({
        id: `lms-grading-${gt.id}`,
        title: `Grading Due: ${gt.assessmentTitle}`,
        description: `Submission evaluation for ${gt.learnerName}. Stage: ${gt.markingStage}.`,
        type: 'task',
        date: gt.dueDate,
        startTime: '17:00',
        priority: gt.priority === 'high' ? 'high' : 'medium',
        status: 'pending',
        reminder: '1_hour',
        recurrence: 'none',
        source: 'lms_auto',
        relatedLmsType: 'grading',
        relatedLmsId: gt.id,
        relatedLmsTitle: gt.assessmentTitle,
        relatedLmsUrl: '/grading',
        createdAt: gt.createdAt,
        updatedAt: gt.updatedAt
      });
    }
  });

  return events;
};

// Load saved manual activities
export const getStoredActivities = (): PlannerActivity[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = getInitialSeedActivities();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to parse planner activities from localStorage:', err);
    return getInitialSeedActivities();
  }
};

// Save manual activities
export const saveStoredActivities = (activities: PlannerActivity[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(activities));
  } catch (err) {
    console.error('Failed to save planner activities to localStorage:', err);
  }
};

// Get all combined activities (Manual + LMS Auto-synced)
export const getAllPlannerActivities = (): PlannerActivity[] => {
  const manual = getStoredActivities();
  const lmsEvents = getHarvestedLMSEvents();

  // Combine and deduplicate
  const manualIds = new Set(manual.map((a) => a.id));
  const merged: PlannerActivity[] = [...manual];

  for (const event of lmsEvents) {
    if (!manualIds.has(event.id)) {
      merged.push(event);
    }
  }

  // Sort by date, then startTime
  return merged.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    const timeA = a.startTime || '00:00';
    const timeB = b.startTime || '00:00';
    return timeA.localeCompare(timeB);
  });
};

// Expand recurring activities within a date range (e.g. for Month or Week view)
export const expandRecurringActivities = (
  activities: PlannerActivity[],
  startDate: string,
  endDate: string
): PlannerActivity[] => {
  const result: PlannerActivity[] = [];
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T23:59:59`);

  for (const act of activities) {
    const actDate = new Date(`${act.date}T00:00:00`);

    // If non-recurring
    if (!act.recurrence || act.recurrence === 'none') {
      if (actDate >= start && actDate <= end) {
        result.push(act);
      }
      continue;
    }

    // For recurring activities: generate virtual occurrences within [startDate, endDate]
    const cur = new Date(actDate);

    // Limit maximum occurrences to prevent infinite loops
    let count = 0;
    const maxOccurrences = 60;

    while (cur <= end && count < maxOccurrences) {
      if (cur >= start) {
        const curDateStr = formatLocalDate(cur);
        if (curDateStr === act.date) {
          result.push(act);
        } else {
          result.push({
            ...act,
            id: `${act.id}-rec-${curDateStr}`,
            date: curDateStr,
            isRecurringInstance: true,
            originalActivityId: act.id
          });
        }
      }

      // Increment according to rule
      if (act.recurrence === 'daily') {
        cur.setDate(cur.getDate() + 1);
      } else if (act.recurrence === 'weekly') {
        cur.setDate(cur.getDate() + 7);
      } else if (act.recurrence === 'monthly') {
        cur.setMonth(cur.getMonth() + 1);
      } else {
        break;
      }
      count++;
    }
  }

  return result.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    const timeA = a.startTime || '00:00';
    const timeB = b.startTime || '00:00';
    return timeA.localeCompare(timeB);
  });
};

// Top 3 Focus Tasks for the Admin
export const getTopFocusTasks = (referenceDate: string = '2026-10-22'): PlannerActivity[] => {
  const all = getAllPlannerActivities();

  // Find high priority, pending tasks/deadlines on or around today
  const candidateTasks = all.filter((a) => {
    if (a.status === 'completed') return false;
    return a.priority === 'high' || a.type === 'task' || a.type === 'deadline';
  });

  // Sort candidate tasks: today's tasks first, then by priority (high > medium > low), then time
  candidateTasks.sort((a, b) => {
    const aIsToday = a.date === referenceDate ? 1 : 0;
    const bIsToday = b.date === referenceDate ? 1 : 0;
    if (aIsToday !== bIsToday) return bIsToday - aIsToday;

    const prioScore = (p: PlannerPriority) => (p === 'high' ? 3 : p === 'medium' ? 2 : 1);
    const prioDiff = prioScore(b.priority) - prioScore(a.priority);
    if (prioDiff !== 0) return prioDiff;

    return (a.startTime || '00:00').localeCompare(b.startTime || '00:00');
  });

  return candidateTasks.slice(0, 3);
};

// Overdue Reminders
export const getOverdueReminders = (referenceDate: string = '2026-10-22'): PlannerActivity[] => {
  const all = getAllPlannerActivities();
  return all.filter((a) => {
    if (a.status === 'completed') return false;
    return a.date < referenceDate;
  });
};

// Upcoming 7 Days Activities
export const getUpcoming7Days = (referenceDate: string = '2026-10-22'): PlannerActivity[] => {
  const ref = new Date(`${referenceDate}T00:00:00`);
  const nextWeek = new Date(ref);
  nextWeek.setDate(ref.getDate() + 7);

  const startStr = referenceDate;
  const endStr = formatLocalDate(nextWeek);

  const all = getAllPlannerActivities();
  return expandRecurringActivities(all, startStr, endStr);
};

// Add a new activity
export const addPlannerActivity = (
  activityData: Omit<PlannerActivity, 'id' | 'createdAt' | 'updatedAt' | 'source'>
): PlannerActivity => {
  const current = getStoredActivities();
  const now = new Date().toISOString();
  const newActivity: PlannerActivity = {
    ...activityData,
    id: `act-manual-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    source: 'manual',
    createdAt: now,
    updatedAt: now
  };

  const updated = [newActivity, ...current];
  saveStoredActivities(updated);
  return newActivity;
};

// Update an existing activity
export const updatePlannerActivity = (
  id: string,
  updates: Partial<PlannerActivity>
): PlannerActivity | null => {
  const current = getStoredActivities();
  const targetId = id.includes('-rec-') ? id.split('-rec-')[0] : id;

  const idx = current.findIndex((a) => a.id === targetId);
  if (idx === -1) {
    // If it's an LMS auto event, create a manual override record
    const lmsEvents = getHarvestedLMSEvents();
    const lmsTarget = lmsEvents.find((e) => e.id === targetId);
    if (lmsTarget) {
      const newOverride: PlannerActivity = {
        ...lmsTarget,
        ...updates,
        source: 'manual',
        updatedAt: new Date().toISOString()
      };
      saveStoredActivities([newOverride, ...current]);
      return newOverride;
    }
    return null;
  }

  const updatedItem: PlannerActivity = {
    ...current[idx],
    ...updates,
    updatedAt: new Date().toISOString()
  };

  current[idx] = updatedItem;
  saveStoredActivities(current);
  return updatedItem;
};

// Delete an activity
export const deletePlannerActivity = (id: string): boolean => {
  const current = getStoredActivities();
  const targetId = id.includes('-rec-') ? id.split('-rec-')[0] : id;
  const filtered = current.filter((a) => a.id !== targetId);

  if (filtered.length !== current.length) {
    saveStoredActivities(filtered);
    return true;
  }
  return false;
};

// Toggle task complete / pending
export const toggleTaskCompleted = (id: string): PlannerActivity | null => {
  const current = getStoredActivities();
  const targetId = id.includes('-rec-') ? id.split('-rec-')[0] : id;
  const target = current.find((a) => a.id === targetId);

  if (target) {
    const nextStatus: PlannerStatus = target.status === 'completed' ? 'pending' : 'completed';
    return updatePlannerActivity(targetId, {
      status: nextStatus,
      completedAt: nextStatus === 'completed' ? new Date().toISOString() : undefined
    });
  } else {
    // Check LMS auto items
    const lmsEvents = getHarvestedLMSEvents();
    const lmsTarget = lmsEvents.find((e) => e.id === targetId);
    if (lmsTarget) {
      const nextStatus: PlannerStatus = lmsTarget.status === 'completed' ? 'pending' : 'completed';
      return updatePlannerActivity(targetId, {
        status: nextStatus,
        completedAt: nextStatus === 'completed' ? new Date().toISOString() : undefined
      });
    }
  }

  return null;
};

// Browser notifications helper
export const requestWebNotificationPermission = async (): Promise<NotificationPermission | 'unsupported'> => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  try {
    const perm = await Notification.requestPermission();
    return perm;
  } catch (err) {
    console.error('Notification permission request error:', err);
    return 'denied';
  }
};

// Check if browser notifications are currently granted
export const getWebNotificationStatus = (): {
  supported: boolean;
  permission: NotificationPermission | 'unsupported';
} => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return { supported: false, permission: 'unsupported' };
  }
  return { supported: true, permission: Notification.permission };
};

// Send browser notification if permitted
export const dispatchWebNotification = (title: string, body: string): boolean => {
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: '/favicon.ico'
      });
      return true;
    } catch (e) {
      console.warn('Browser notification dispatch failed:', e);
      return false;
    }
  }
  return false;
};
