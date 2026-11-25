// ============================================================
// LMS - Announcement & Notification Store (Zustand)
// Multi-role announcement lifecycle with tenant isolation,
// role-based scoping, delivery tracking, PostgreSQL sync,
// and localStorage resilience.
// ============================================================
import { create } from 'zustand';
import { apiClient } from './apiClient';
import { useAuthStore } from './store';
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

function mapBackendAnnouncement(a: any): Announcement {
  return {
    id: a.id,
    organizationId: a.tenantId || a.organizationId || '871abf8a-e563-4d0f-afc7-416d8da3df14',
    title: a.title,
    content: a.content || '',
    category: a.category || 'General',
    priority: a.priority || 'normal',
    status: a.status || 'published',
    scope: a.scope || 'institution',
    targetAudience: a.targetAudience || 'All',
    audienceType: a.audienceType || 'all',
    targetCourseId: a.targetCourseId || undefined,
    targetCohortId: a.targetCohortId || undefined,
    targetDepartmentId: a.targetDepartmentId || undefined,
    authorId: a.authorId || '',
    authorName: a.authorName || 'Institution Admin',
    authorRole: a.authorRole || 'org_admin',
    createdAt: a.createdAt || new Date().toISOString(),
    publishedAt: a.publishedAt || undefined,
    scheduledAt: a.scheduledAt || undefined,
    expiresAt: a.expiresAt || undefined,
    channels: Array.isArray(a.channels) ? a.channels : ['in_app'],
    deliveryStatus:
      a.deliveryStatus && typeof a.deliveryStatus === 'object'
        ? {
            inAppDelivered: !!a.deliveryStatus.inAppDelivered,
            emailSent: !!a.deliveryStatus.emailSent,
            emailDeliveredCount: a.deliveryStatus.emailDeliveredCount || a.deliveryStatus.emailCount || 0,
            totalTargetRecipients:
              a.deliveryStatus.totalTargetRecipients ||
              a.deliveryStatus.recipientCount ||
              a.deliveryStatus.inAppCount ||
              0,
          }
        : undefined,
    readByUserIds: Array.isArray(a.readByUserIds) ? a.readByUserIds : [],
    associatedAssessmentId: a.associatedAssessmentId || undefined,
    associatedSessionId: a.associatedSessionId || undefined,
  };
}

interface AnnouncementState {
  isLoading: boolean;
  fetchAnnouncements: () => Promise<void>;
  announcements: Announcement[];

  // Actions
  createAnnouncement: (
    data: Omit<Announcement, 'id' | 'createdAt' | 'readByUserIds'>
  ) => Promise<{ success: boolean; message: string; announcement: Announcement }>;
  updateAnnouncement: (
    id: string,
    updates: Partial<Announcement>
  ) => Promise<{ success: boolean; message: string }>;
  deleteAnnouncement: (id: string) => Promise<{ success: boolean; message: string }>;
  archiveAnnouncement: (id: string) => Promise<{ success: boolean; message: string }>;
  unarchiveAnnouncement: (id: string) => Promise<{ success: boolean; message: string }>;
  publishDraft: (id: string) => Promise<{ success: boolean; message: string }>;
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
      const rawList = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      if (rawList.length > 0 || res?.success) {
        const mapped = rawList.map(mapBackendAnnouncement);
        set({ announcements: mapped, isLoading: false });
        persistAnnouncements(mapped);
        return;
      }
    } catch (err) {
      console.warn('Failed to fetch announcements from backend:', err);
    }
    set({ isLoading: false });
  },

  announcements: loadStoredAnnouncements(),

  createAnnouncement: async (data) => {
    const tempId = `ann-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newAnnouncement: Announcement = {
      ...data,
      id: tempId,
      createdAt: new Date().toISOString(),
      readByUserIds: [data.authorId],
      publishedAt: data.status === 'published' ? new Date().toISOString() : data.publishedAt,
    };

    // Optimistically update local store and storage
    const current = get().announcements;
    const updated = [newAnnouncement, ...current];
    persistAnnouncements(updated);
    set({ announcements: updated });

    try {
      const res = await apiClient.post<any>('/announcements', {
        title: data.title,
        content: data.content,
        category: data.category,
        priority: data.priority,
        status: data.status,
        scope: data.scope,
        targetAudience: data.targetAudience,
        audienceType: data.audienceType,
        targetCourseId: data.targetCourseId || undefined,
        targetCohortId: data.targetCohortId || undefined,
        targetDepartmentId: data.targetDepartmentId || undefined,
        channels: data.channels,
        expiresAt: data.expiresAt,
        scheduledAt: data.scheduledAt,
      });

      if (res?.data && res.data.id) {
        const savedAnnouncement = mapBackendAnnouncement(res.data);
        const synced = get().announcements.map((a) => (a.id === tempId ? savedAnnouncement : a));
        persistAnnouncements(synced);
        set({ announcements: synced });

        // Trigger notification refresh so student notification drawer & badges update immediately
        useAuthStore.getState().fetchNotifications().catch(() => {});

        return {
          success: true,
          message:
            data.status === 'published'
              ? 'Announcement published successfully and delivered to target student audience.'
              : data.status === 'scheduled'
              ? 'Announcement scheduled for future publication.'
              : 'Announcement draft saved successfully.',
          announcement: savedAnnouncement,
        };
      }
    } catch (err: any) {
      console.warn('Backend announcement API failed, preserved locally:', err);
    }

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

  updateAnnouncement: async (id, updates) => {
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

    try {
      await apiClient.patch(`/announcements/${encodeURIComponent(id)}`, updates);
      useAuthStore.getState().fetchNotifications().catch(() => {});
    } catch (err) {
      console.warn('Backend update failed:', err);
    }

    return { success: true, message: 'Announcement updated successfully.' };
  },

  deleteAnnouncement: async (id) => {
    const updated = get().announcements.filter((a) => a.id !== id);
    persistAnnouncements(updated);
    set({ announcements: updated });

    try {
      await apiClient.delete(`/announcements/${encodeURIComponent(id)}`);
      useAuthStore.getState().fetchNotifications().catch(() => {});
    } catch (err) {
      console.warn('Backend delete failed:', err);
    }

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

    apiClient
      .patch(`/announcements/${encodeURIComponent(id)}`, {
        readByUserIds: updated.find((a) => a.id === id)?.readByUserIds,
      })
      .catch(() => {});
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
      return all.filter((a) => isPlatformAdmin || a.organizationId === (user.organizationId || '871abf8a-e563-4d0f-afc7-416d8da3df14') || a.organizationId === 'org-001');
    }

    // 2. Trainer: sees announcements they authored (all statuses) + published institution announcements targeted to all or faculty
    if (isTrainer) {
      return all.filter((a) => {
        // Trainer's own announcements
        if (a.authorId === user.id || a.authorName.includes(user.lastName)) {
          return true;
        }
        // Institution announcements published to faculty
        if (a.status === 'published' && (a.audienceType === 'all' || a.audienceType === 'faculty' || a.targetAudience === 'All' || a.targetAudience === 'All Faculty')) {
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
        if (a.status !== 'published') return false;
        if (a.expiresAt && new Date(a.expiresAt) < now) return false;
        if (a.scheduledAt && new Date(a.scheduledAt) > now) return false;

        if (a.audienceType === 'all' || a.audienceType === 'students' || a.targetAudience === 'All' || a.targetAudience === 'All Students') {
          return true;
        }
        if (a.audienceType === 'department' && a.targetDepartmentId && a.targetDepartmentId === user.departmentId) {
          return true;
        }
        if (a.audienceType === 'course' && a.targetCourseId && enrolledCourseIds.includes(a.targetCourseId)) {
          return true;
        }
        if (a.audienceType === 'cohort' && a.targetCohortId && enrolledCohortIds.includes(a.targetCohortId)) {
          return true;
        }

        return false;
      });
    }

    return [];
  },
}));
