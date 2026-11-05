import { apiClient } from './apiClient';
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

const INITIAL_ANNOUNCEMENTS: Announcement[] = [];

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
  isLoading: boolean;
  fetchAnnouncements: () => Promise<void>;
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
  isLoading: false,
  fetchAnnouncements: async () => {
    set({ isLoading: true });
    try {
      const res = await apiClient.get<any[]>('/announcements');
      if (res && res.data && Array.isArray(res.data)) {
        set({ announcements: res.data, isLoading: false });
        persistAnnouncements(res.data);
        return;
      }
    } catch (err) {
      console.warn('Failed to fetch announcements:', err);
    }
    set({ isLoading: false });
  },
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
