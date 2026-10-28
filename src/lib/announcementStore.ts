// ============================================================
// LMS - Announcement & Notification Store (Zustand)
// Multi-role announcement lifecycle with tenant isolation,
// role-based scoping, delivery tracking, and localStorage sync.
// ============================================================
import { create } from 'zustand';
import {
  Announcement,
  AnnouncementCategory,
  AnnouncementPriority,
  AnnouncementStatus,
  AnnouncementScope,
  User,
  RoleName,
} from '../types';

export const STORAGE_KEY_ANNOUNCEMENTS = 'venilearn_announcements_v2';

const INITIAL_ANNOUNCEMENTS: Announcement[] = [
  // 1. Institution Admin: Examination announcement (Urgent, Published, Institution-wide)
  {
    id: 'ann-001',
    organizationId: 'org-001',
    title: 'Fall Semester 2026 Midterm Exam Schedule & Proctoring Protocols',
    content:
      'The official midterm proctored examination schedule has been finalized. All enrolled students must perform webcam and microphone validation 48 hours prior to test commencement. AI proctoring flags will be audited by the integrity committee.',
    category: 'Examination',
    priority: 'urgent',
    status: 'published',
    scope: 'institution',
    targetAudience: 'All Students & Faculty',
    audienceType: 'all',
    authorId: 'u-002',
    authorName: 'Marcus Johnson (Academic Dean Office)',
    authorRole: 'org_admin',
    createdAt: '2026-10-18T09:00:00Z',
    publishedAt: '2026-10-18T09:00:00Z',
    expiresAt: '2026-11-20T23:59:59Z',
    channels: ['in_app', 'email'],
    deliveryStatus: {
      inAppDelivered: true,
      emailSent: false, // SendGrid/SMTP not configured
      emailDeliveredCount: 0,
      totalTargetRecipients: 350,
    },
    readByUserIds: ['u-002'],
  },

  // 2. Institution Admin: Lab maintenance window (Important, Department specific)
  {
    id: 'ann-002',
    organizationId: 'org-001',
    title: 'Campus Cloud Computing Lab Maintenance Window',
    content:
      'Virtual sandbox environments, remote Docker daemons, and GPU compute clusters will undergo routine kernel security updates on Saturday, Oct 31st from 01:00 AM to 05:00 AM EST. Active terminal sessions will be paused gracefully.',
    category: 'Maintenance',
    priority: 'important',
    status: 'published',
    scope: 'department',
    targetAudience: 'Computer Science Department',
    audienceType: 'department',
    targetDepartmentId: 'dep-001',
    authorId: 'u-002',
    authorName: 'IT Infrastructure Operations',
    authorRole: 'org_admin',
    createdAt: '2026-10-17T14:30:00Z',
    publishedAt: '2026-10-17T14:30:00Z',
    expiresAt: '2026-11-05T23:59:59Z',
    channels: ['in_app'],
    deliveryStatus: {
      inAppDelivered: true,
      emailSent: false,
      emailDeliveredCount: 0,
      totalTargetRecipients: 120,
    },
    readByUserIds: ['u-002', 'u-004'],
  },

  // 3. Trainer (Dr. James Wilson): Course Update for JavaScript Fundamentals
  {
    id: 'ann-003',
    organizationId: 'org-001',
    title: 'Lab Session 4 Extension: Async Promises & Fetch API',
    content:
      'Based on our live discussion on microtasks and event loops, the Lab 4 deadline is extended by 48 hours to Friday at 11:59 PM. Please verify your automated unit test pass rate in the workbench before final git push.',
    category: 'Course Updates',
    priority: 'important',
    status: 'published',
    scope: 'course',
    targetAudience: 'Course: JavaScript Fundamentals',
    audienceType: 'course',
    targetCourseId: 'crs-001',
    authorId: 'u-004',
    authorName: 'Dr. James Wilson',
    authorRole: 'trainer',
    createdAt: '2026-10-20T10:15:00Z',
    publishedAt: '2026-10-20T10:15:00Z',
    expiresAt: '2026-11-15T23:59:59Z',
    channels: ['in_app', 'email'],
    deliveryStatus: {
      inAppDelivered: true,
      emailSent: false,
      emailDeliveredCount: 0,
      totalTargetRecipients: 42,
    },
    readByUserIds: ['u-004'],
    associatedAssessmentId: 'asm-1',
  },

  // 4. Trainer (Dr. James Wilson): Quiz Notice for Cohort Q4 2026
  {
    id: 'ann-004',
    organizationId: 'org-001',
    title: 'Midterm Practice Quiz Ready on Portal',
    content:
      'The diagnostic assessment covering Modules 1 through 3 is now unlocked on the Quizzes tab. Time limit is 45 minutes with 30 multiple-choice and code analysis questions. Passing grade is 70%.',
    category: 'Quiz & Assessment Notices',
    priority: 'urgent',
    status: 'published',
    scope: 'cohort',
    targetAudience: 'Class: Q4 2026 Engineering Onboarding',
    audienceType: 'cohort',
    targetCohortId: 'coh-001',
    targetCourseId: 'crs-001',
    authorId: 'u-004',
    authorName: 'Dr. James Wilson',
    authorRole: 'trainer',
    createdAt: '2026-10-22T08:00:00Z',
    publishedAt: '2026-10-22T08:00:00Z',
    expiresAt: '2026-11-10T23:59:59Z',
    channels: ['in_app'],
    deliveryStatus: {
      inAppDelivered: true,
      emailSent: false,
      emailDeliveredCount: 0,
      totalTargetRecipients: 8,
    },
    readByUserIds: ['u-004'],
    associatedAssessmentId: 'asm-1',
  },

  // 5. Trainer (Dr. James Wilson): Live Class Reminder linked to Timetable
  {
    id: 'ann-005',
    organizationId: 'org-001',
    title: 'Live Review Lecture: Event Loop & Closure Internals',
    content:
      'Join our interactive live coding session tomorrow at 10:00 AM. We will live debug memory leaks and implement custom event emitters. Zoom room link is active on your Live Sessions calendar.',
    category: 'Live Class Reminders',
    priority: 'normal',
    status: 'published',
    scope: 'course',
    targetAudience: 'Course: JavaScript Fundamentals',
    audienceType: 'course',
    targetCourseId: 'crs-001',
    authorId: 'u-004',
    authorName: 'Dr. James Wilson',
    authorRole: 'trainer',
    createdAt: '2026-10-24T11:00:00Z',
    publishedAt: '2026-10-24T11:00:00Z',
    expiresAt: '2026-11-01T23:59:59Z',
    channels: ['in_app'],
    deliveryStatus: {
      inAppDelivered: true,
      emailSent: false,
      emailDeliveredCount: 0,
      totalTargetRecipients: 42,
    },
    readByUserIds: ['u-004'],
    associatedSessionId: 'ls-001',
  },

  // 6. Institution Admin: Scheduled announcement (Future publication date)
  {
    id: 'ann-006',
    organizationId: 'org-001',
    title: 'Scheduled: Spring 2027 Course Registration System Cutover',
    content:
      'Preliminary course catalog for Spring 2027 degree pathways and certificate tracks will be visible for preview. Self-service advisor approvals open on Monday morning.',
    category: 'Academic',
    priority: 'normal',
    status: 'scheduled',
    scope: 'institution',
    targetAudience: 'All Students & Faculty',
    audienceType: 'all',
    authorId: 'u-002',
    authorName: 'Marcus Johnson (Academic Dean Office)',
    authorRole: 'org_admin',
    createdAt: '2026-10-25T12:00:00Z',
    scheduledAt: '2026-11-02T08:00:00Z',
    expiresAt: '2026-12-01T23:59:59Z',
    channels: ['in_app', 'email'],
    deliveryStatus: {
      inAppDelivered: false,
      emailSent: false,
      emailDeliveredCount: 0,
      totalTargetRecipients: 350,
    },
    readByUserIds: [],
  },

  // 7. Institution Admin: Draft Announcement (Unpublished work in progress)
  {
    id: 'ann-007',
    organizationId: 'org-001',
    title: 'Draft: Thanksgiving & Winter Break Campus Access Protocols',
    content:
      'Drafting the holiday schedule for the campus library, cafeteria, and student union. Remote lab servers will remain accessible 24/7 during the holiday period.',
    category: 'Holiday',
    priority: 'normal',
    status: 'draft',
    scope: 'institution',
    targetAudience: 'All Students & Faculty',
    audienceType: 'all',
    authorId: 'u-002',
    authorName: 'Marcus Johnson',
    authorRole: 'org_admin',
    createdAt: '2026-10-26T15:00:00Z',
    channels: ['in_app'],
    readByUserIds: ['u-002'],
  },

  // 8. Trainer: Draft Assignment Guideline (Trainer's draft)
  {
    id: 'ann-008',
    organizationId: 'org-001',
    title: 'Draft: React 19 Server Components Capstone Rubric',
    content:
      'Drafting rubric requirements for optimistic UI mutations, error boundaries, and streaming hydration test cases.',
    category: 'Assignment Deadlines',
    priority: 'normal',
    status: 'draft',
    scope: 'course',
    targetAudience: 'Course: Advanced React Patterns',
    audienceType: 'course',
    targetCourseId: 'crs-002',
    authorId: 'u-004',
    authorName: 'Dr. James Wilson',
    authorRole: 'trainer',
    createdAt: '2026-10-26T16:00:00Z',
    channels: ['in_app'],
    readByUserIds: ['u-004'],
  },

  // 9. Archived Announcement
  {
    id: 'ann-009',
    organizationId: 'org-001',
    title: 'Archived: Fall 2026 Welcome Week & Orientation Schedule',
    content:
      'Welcome week activities, faculty office hour allocations, and lab badge pickups concluded successfully on Sept 15, 2026.',
    category: 'General',
    priority: 'normal',
    status: 'archived',
    scope: 'institution',
    targetAudience: 'All Students & Faculty',
    audienceType: 'all',
    authorId: 'u-002',
    authorName: 'Marcus Johnson',
    authorRole: 'org_admin',
    createdAt: '2026-09-01T08:00:00Z',
    publishedAt: '2026-09-01T08:00:00Z',
    channels: ['in_app'],
    readByUserIds: ['u-002', 'u-004', 'u-007'],
  },
];

function loadStoredAnnouncements(): Announcement[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ANNOUNCEMENTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to load announcements from storage:', err);
  }
  return INITIAL_ANNOUNCEMENTS;
}

function persistAnnouncements(announcements: Announcement[]) {
  try {
    localStorage.setItem(STORAGE_KEY_ANNOUNCEMENTS, JSON.stringify(announcements));
  } catch (err) {
    console.warn('Failed to persist announcements:', err);
  }
}

interface AnnouncementState {
  announcements: Announcement[];

  // Actions
  createAnnouncement: (
    data: Omit<Announcement, 'id' | 'createdAt' | 'readByUserIds'>
  ) => { success: boolean; message: string; announcement: Announcement };
  updateAnnouncement: (
    id: string,
    updates: Partial<Announcement>
  ) => { success: boolean; message: string };
  deleteAnnouncement: (id: string) => { success: boolean; message: string };
  archiveAnnouncement: (id: string) => { success: boolean; message: string };
  unarchiveAnnouncement: (id: string) => { success: boolean; message: string };
  publishDraft: (id: string) => { success: boolean; message: string };
  markAnnouncementRead: (id: string, userId: string) => void;
  markAllAnnouncementsRead: (userId: string, announcementIds?: string[]) => void;

  // Filtered queries
  getAnnouncementsForUser: (
    user: User | null,
    enrolledCourseIds?: string[],
    enrolledCohortIds?: string[]
  ) => Announcement[];
}

export const useAnnouncementStore = create<AnnouncementState>((set, get) => ({
  announcements: loadStoredAnnouncements(),

  createAnnouncement: (data) => {
    const newAnnouncement: Announcement = {
      ...data,
      id: `ann-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
      readByUserIds: [data.authorId],
      publishedAt: data.status === 'published' ? new Date().toISOString() : data.publishedAt,
    };

    const updated = [newAnnouncement, ...get().announcements];
    persistAnnouncements(updated);
    set({ announcements: updated });

    return {
      success: true,
      message:
        data.status === 'published'
          ? 'Announcement published successfully to target audience.'
          : data.status === 'scheduled'
          ? 'Announcement scheduled for future publication.'
          : 'Announcement draft saved successfully.',
      announcement: newAnnouncement,
    };
  },

  updateAnnouncement: (id, updates) => {
    const existing = get().announcements.find((a) => a.id === id);
    if (!existing) {
      return { success: false, message: 'Announcement not found.' };
    }

    const updated = get().announcements.map((a) => {
      if (a.id === id) {
        const publishedAt =
          updates.status === 'published' && a.status !== 'published'
            ? new Date().toISOString()
            : updates.publishedAt || a.publishedAt;
        return { ...a, ...updates, publishedAt };
      }
      return a;
    });

    persistAnnouncements(updated);
    set({ announcements: updated });
    return { success: true, message: 'Announcement updated successfully.' };
  },

  deleteAnnouncement: (id) => {
    const updated = get().announcements.filter((a) => a.id !== id);
    persistAnnouncements(updated);
    set({ announcements: updated });
    return { success: true, message: 'Announcement deleted.' };
  },

  archiveAnnouncement: (id) => {
    return get().updateAnnouncement(id, { status: 'archived' });
  },

  unarchiveAnnouncement: (id) => {
    return get().updateAnnouncement(id, { status: 'published' });
  },

  publishDraft: (id) => {
    return get().updateAnnouncement(id, { status: 'published', publishedAt: new Date().toISOString() });
  },

  markAnnouncementRead: (id, userId) => {
    const updated = get().announcements.map((a) => {
      if (a.id === id && !a.readByUserIds.includes(userId)) {
        return { ...a, readByUserIds: [...a.readByUserIds, userId] };
      }
      return a;
    });
    persistAnnouncements(updated);
    set({ announcements: updated });
  },

  markAllAnnouncementsRead: (userId, announcementIds) => {
    const updated = get().announcements.map((a) => {
      if (!announcementIds || announcementIds.includes(a.id)) {
        if (!a.readByUserIds.includes(userId)) {
          return { ...a, readByUserIds: [...a.readByUserIds, userId] };
        }
      }
      return a;
    });
    persistAnnouncements(updated);
    set({ announcements: updated });
  },

  getAnnouncementsForUser: (user, enrolledCourseIds = [], enrolledCohortIds = []) => {
    if (!user) return [];
    const all = get().announcements;
    const now = new Date();

    const isPlatformAdmin = user.activeRole === 'platform_admin';
    const isOrgAdmin = user.activeRole === 'org_admin' || user.activeRole === 'lms_admin';
    const isTrainer =
      user.activeRole === 'trainer' ||
      user.activeRole === 'instructor' ||
      user.activeRole === 'assessment_author';
    const isStudent = user.activeRole === 'student' || user.activeRole === 'learner' || user.activeRole === 'guest';

    // 1. Institution Admin: sees all announcements within their organization
    if (isPlatformAdmin || isOrgAdmin) {
      return all.filter((a) => isPlatformAdmin || a.organizationId === (user.organizationId || 'org-001'));
    }

    // 2. Trainer: sees announcements they authored (all statuses) + published institution announcements targeted to all or faculty
    if (isTrainer) {
      return all.filter((a) => {
        // Tenant boundary
        if (a.organizationId && user.organizationId && a.organizationId !== user.organizationId) {
          return false;
        }
        // Trainer's own announcements
        if (a.authorId === user.id || a.authorName.includes(user.lastName)) {
          return true;
        }
        // Institution announcements published to faculty
        if (a.status === 'published' && (a.audienceType === 'all' || a.audienceType === 'faculty')) {
          if (a.expiresAt && new Date(a.expiresAt) < now) return false;
          if (a.scheduledAt && new Date(a.scheduledAt) > now) return false;
          return true;
        }
        return false;
      });
    }

    // 3. Student: strictly sees ONLY published, non-expired, currently effective announcements targeted to them
    if (isStudent) {
      return all.filter((a) => {
        // Strict status check: must be published
        if (a.status !== 'published') return false;

        // Tenant boundary
        if (a.organizationId && user.organizationId && a.organizationId !== user.organizationId) {
          return false;
        }

        // Timing checks: not expired, scheduled time already arrived
        if (a.expiresAt && new Date(a.expiresAt) < now) return false;
        if (a.scheduledAt && new Date(a.scheduledAt) > now) return false;

        // Audience matching:
        // Case A: Targeted to all or all students
        if (a.audienceType === 'all' || a.audienceType === 'students') {
          return true;
        }
        // Case B: Department targeting
        if (a.audienceType === 'department' && a.targetDepartmentId && a.targetDepartmentId === user.departmentId) {
          return true;
        }
        // Case C: Course targeting
        if (a.audienceType === 'course' && a.targetCourseId && enrolledCourseIds.includes(a.targetCourseId)) {
          return true;
        }
        // Case D: Cohort targeting
        if (a.audienceType === 'cohort' && a.targetCohortId && enrolledCohortIds.includes(a.targetCohortId)) {
          return true;
        }

        return false;
      });
    }

    return [];
  },
}));
