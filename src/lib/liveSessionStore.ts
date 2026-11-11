// ============================================================
// LMS - Live Sessions Store (Zustand with LocalStorage)
// Manages real-time live classes, scheduling, status transitions,
// student eligibility, and automated in-app notifications.
// ============================================================
import { apiClient } from './apiClient';
import { create } from 'zustand';
import { LiveSession } from '../types';

import { useAuthStore } from './store';

interface LiveSessionState {
  isLoading: boolean;
  fetchSessions: () => Promise<void>;
  sessions: LiveSession[];

  // Selectors
  getSessionById: (id: string) => LiveSession | undefined;
  getSessionsForCohort: (cohortId: string) => LiveSession[];
  getSessionsForStudent: (studentId: string, cohortIds: string[], courseIds: string[]) => LiveSession[];

  // Actions
  addSession: (
    session: Omit<LiveSession, 'id' | 'createdAt' | 'updatedAt' | 'attendance'>,
    notifyStudents?: boolean
  ) => Promise<{ success: boolean; session: LiveSession }>;
  updateSession: (
    updated: LiveSession,
    notifyStudents?: boolean
  ) => Promise<{ success: boolean; session: LiveSession }>;
  cancelSession: (
    sessionId: string,
    reason?: string,
    notifyStudents?: boolean
  ) => { success: boolean };
  startBroadcast: (sessionId: string) => Promise<{ success: boolean }>;
  generateGoogleMeet: (sessionId: string) => Promise<{ success: boolean; meetingUrl?: string; message?: string; notConfigured?: boolean }>;
  attachGoogleMeet: (sessionId: string, meetingUrl: string) => Promise<{ success: boolean; meetingUrl?: string; message?: string }>;
  endSession: (sessionId: string, recordingUrl?: string) => Promise<{ success: boolean }>;
  updateRecordingUrl: (sessionId: string, recordingUrl: string) => Promise<{ success: boolean }>;
  deleteSession: (sessionId: string) => { success: boolean };
  toggleBookmark: (sessionId: string) => void;
}

const STORAGE_KEY_SESSIONS = 'venilearn_live_sessions';

function loadInitialSessions(): LiveSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SESSIONS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Filter out hardcoded demo seeds
        return parsed.filter((s) => !s.id?.startsWith('ls-live-') && !s.id?.startsWith('ls-rec-'));
      }
    }
  } catch (err) {
    console.warn('Failed to load live sessions from localStorage:', err);
  }
  return [];
}

function persistSessions(sessions: LiveSession[]) {
  try {
    localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(sessions));
  } catch (err) {
    console.warn('Failed to save live sessions to localStorage:', err);
  }
}

/** Map a backend LiveSession row to the frontend LiveSession type */
function mapBackendSession(item: any): LiveSession {
  let room = item.room;
  let dayOfWeek = item.dayOfWeek;

  if (Array.isArray(item.materials)) {
    const meta = item.materials.find(
      (m: any) => m && (m.type === 'timetable_meta' || m.room !== undefined || m.dayOfWeek !== undefined)
    );
    if (meta) {
      if (!room && meta.room) room = meta.room;
      if (!dayOfWeek && meta.dayOfWeek) dayOfWeek = meta.dayOfWeek;
    }
  }

  return {
    id: item.id,
    title: item.title,
    description: item.description || '',
    courseId: item.courseId || undefined,
    courseTitle: item.course?.title || item.courseTitle || undefined,
    cohortId: item.cohortId || undefined,
    cohortName: item.cohort?.name || item.cohortName || undefined,
    departmentId: item.departmentId || undefined,
    date: item.date
      ? (typeof item.date === 'string' ? item.date.slice(0, 10) : new Date(item.date).toISOString().slice(0, 10))
      : new Date().toISOString().slice(0, 10),
    startTime: item.startTime
      ? (item.startTime.includes('T')
        ? new Date(item.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
        : item.startTime)
      : '10:00',
    endTime: item.endTime
      ? (item.endTime.includes('T')
        ? new Date(item.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
        : item.endTime)
      : '11:00',
    durationMinutes: item.durationMinutes || 60,
    status: item.status || 'scheduled',
    provider: item.provider || 'In-Person Class',
    meetingUrl: item.meetingUrl || '',
    joinLink: item.joinLink || item.meetingUrl || '',
    recordingUrl: item.recordingUrl || '',
    recordingLink: item.recordingUrl || '',
    instructorId: item.instructorId || item.trainerId || '',
    instructorName: item.instructorName || item.trainer?.displayName || 'Faculty',
    targetAudienceType: item.targetAudienceType || 'all_enrolled',
    targetStudentIds: item.targetStudentIds || [],
    targetStaffIds: item.targetStaffIds || [],
    audienceScope: item.audienceScope || 'students',
    enrolledCount: item._count?.attendance ?? item.enrolledCount ?? 0,
    attendance: item.attendance || [],
    room: room || (item.provider === 'In-Person Class' ? 'Campus Hall' : 'Online'),
    dayOfWeek: dayOfWeek || undefined,
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: item.updatedAt || new Date().toISOString(),
  };
}

export const useLiveSessionStore = create<LiveSessionState>((set, get) => ({
  isLoading: false,
  fetchSessions: async () => {
    set({ isLoading: true });
    try {
      const res = await apiClient.get<any[]>('/live-sessions');
      if (res && res.data && Array.isArray(res.data)) {
        const mapped: LiveSession[] = res.data.map(mapBackendSession);
        set({ sessions: mapped, isLoading: false });
        persistSessions(mapped);
        return;
      }
    } catch (e) {
      console.warn('Failed to fetch live sessions from backend:', e);
    }
    // Fallback to localStorage cache
    set({ sessions: loadInitialSessions(), isLoading: false });
  },
  sessions: loadInitialSessions(),

  getSessionById: (id: string) => {
    return get().sessions.find((s) => s.id === id);
  },

  getSessionsForCohort: (cohortId: string) => {
    return get().sessions.filter((s) => s.cohortId === cohortId);
  },

  getSessionsForStudent: (studentId: string, cohortIds: string[], courseIds: string[]) => {
    const { sessions } = get();
    return sessions.filter((s) => {
      if (s.targetStudentIds && s.targetStudentIds.includes(studentId)) return true;
      if (s.cohortId && cohortIds.includes(s.cohortId)) {
        if (s.targetAudienceType === 'selected_students') {
          return s.targetStudentIds?.includes(studentId);
        }
        return true;
      }
      if (s.courseId && courseIds.includes(s.courseId) && !s.cohortId) return true;
      return false;
    });
  },

  addSession: async (sessionData, notifyStudents = true) => {
    const currentUserId = useAuthStore.getState().user?.id;

    // Build payload for backend
    const payload = {
      ...sessionData,
      instructorId: sessionData.instructorId || currentUserId,
    };

    let persisted: LiveSession;

    try {
      const res = await apiClient.post<any>('/live-sessions', payload);
      if (res?.data) {
        persisted = mapBackendSession(res.data);
      } else {
        // API returned unexpected shape — build local fallback
        persisted = {
          ...sessionData,
          id: `ls-${Date.now()}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          attendance: [],
        } as LiveSession;
      }
    } catch (e) {
      console.error('Failed to create live session in backend:', e);
      // Local fallback so UI still works
      persisted = {
        ...sessionData,
        id: `ls-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        attendance: [],
      } as LiveSession;
    }

    const updated = [persisted, ...get().sessions];
    set({ sessions: updated });
    persistSessions(updated);

    if (notifyStudents && persisted.targetStudentIds && persisted.targetStudentIds.length > 0) {
      try {
        useAuthStore.getState().notifyLiveSession({
          sessionId: persisted.id,
          sessionTitle: persisted.title,
          instructorName: persisted.instructorName || 'Your Trainer',
          recipientIds: persisted.targetStudentIds,
          type: 'scheduled',
          date: persisted.date,
          startTime: persisted.startTime,
        });
      } catch (e) {
        console.warn('Failed to dispatch live session scheduled notification:', e);
      }
    }

    return { success: true, session: persisted };
  },

  updateSession: async (updatedSession, notifyStudents = true) => {
    const sessionWithTimestamp: LiveSession = {
      ...updatedSession,
      updatedAt: new Date().toISOString(),
    };

    // Persist to backend
    try {
      await apiClient.put(`/live-sessions/${updatedSession.id}`, updatedSession);
    } catch (e) {
      console.warn('Failed to update live session in backend:', e);
    }

    const updated = get().sessions.map((s) =>
      s.id === updatedSession.id ? sessionWithTimestamp : s
    );
    set({ sessions: updated });
    persistSessions(updated);

    if (notifyStudents && sessionWithTimestamp.targetStudentIds && sessionWithTimestamp.targetStudentIds.length > 0) {
      try {
        useAuthStore.getState().notifyLiveSession({
          sessionId: sessionWithTimestamp.id,
          sessionTitle: sessionWithTimestamp.title,
          instructorName: sessionWithTimestamp.instructorName || 'Your Trainer',
          recipientIds: sessionWithTimestamp.targetStudentIds,
          type: 'updated',
          date: sessionWithTimestamp.date,
          startTime: sessionWithTimestamp.startTime,
        });
      } catch (e) {
        console.warn('Failed to dispatch session updated notification:', e);
      }
    }

    return { success: true, session: sessionWithTimestamp };
  },

  cancelSession: (sessionId: string, reason?: string, notifyStudents = true) => {
    const target = get().sessions.find((s) => s.id === sessionId);
    if (!target) return { success: false };

    const updated = get().sessions.map((s) =>
      s.id === sessionId
        ? {
            ...s,
            status: 'cancelled' as const,
            description: reason ? `[CANCELLED: ${reason}] ${s.description || ''}` : s.description,
            updatedAt: new Date().toISOString(),
          }
        : s
    );

    set({ sessions: updated });
    persistSessions(updated);

    // Fire and forget backend cancel
    apiClient.put(`/live-sessions/${sessionId}`, { status: 'cancelled' }).catch((e) =>
      console.warn('Failed to cancel session in backend:', e)
    );

    if (notifyStudents && target.targetStudentIds && target.targetStudentIds.length > 0) {
      try {
        useAuthStore.getState().notifyLiveSession({
          sessionId: target.id,
          sessionTitle: target.title,
          instructorName: target.instructorName || 'Your Trainer',
          recipientIds: target.targetStudentIds,
          type: 'cancelled',
          message: reason ? `Session was cancelled. Reason: ${reason}` : undefined,
        });
      } catch (e) {
        console.warn('Failed to dispatch cancellation notification:', e);
      }
    }

    return { success: true };
  },

  startBroadcast: async (sessionId: string) => {
    const target = get().sessions.find((s) => s.id === sessionId);
    if (!target) return { success: false };

    try {
      await apiClient.post(`/live-sessions/${sessionId}/broadcast/start`, {});
    } catch (e) {
      console.warn('Failed to start broadcast in backend:', e);
    }

    const updated = get().sessions.map((s) =>
      s.id === sessionId
        ? { ...s, status: 'live' as const, updatedAt: new Date().toISOString() }
        : s
    );
    set({ sessions: updated });
    persistSessions(updated);

    if (target.targetStudentIds && target.targetStudentIds.length > 0) {
      try {
        useAuthStore.getState().notifyLiveSession({
          sessionId: target.id,
          sessionTitle: target.title,
          instructorName: target.instructorName || 'Your Trainer',
          recipientIds: target.targetStudentIds,
          type: 'live',
        });
      } catch (e) {
        console.warn('Failed to dispatch live notification:', e);
      }
    }

    return { success: true };
  },

  generateGoogleMeet: async (sessionId: string) => {
    try {
      const res = await apiClient.post<any>(`/live-sessions/${sessionId}/generate-meet`);
      if (res && res.data && res.data.meetingUrl) {
        const { meetingUrl, joinLink } = res.data;
        const updated = get().sessions.map((s) =>
          s.id === sessionId ? { ...s, meetingUrl, joinLink } : s
        );
        set({ sessions: updated });
        persistSessions(updated);
        return { success: true, meetingUrl, message: res.data.message };
      }
      return { success: false, message: res?.message || 'Failed to generate Google Meet' };
    } catch (e: any) {
      const notConfigured = e?.response?.data?.code === 'GOOGLE_INTEGRATION_NOT_CONFIGURED' ||
        e?.code === 'GOOGLE_INTEGRATION_NOT_CONFIGURED';
      return {
        success: false,
        notConfigured,
        message: e?.response?.data?.message || e.message || 'Error generating Google Meet',
      };
    }
  },

  attachGoogleMeet: async (sessionId: string, meetingUrl: string) => {
    try {
      const res = await apiClient.post<any>(`/live-sessions/${sessionId}/attach-meet-url`, { meetingUrl });
      if (res && res.data && res.data.meetingUrl) {
        const url = res.data.meetingUrl;
        const updated = get().sessions.map((s) =>
          s.id === sessionId ? { ...s, meetingUrl: url, joinLink: url, provider: 'Google Meet' } : s
        );
        set({ sessions: updated });
        persistSessions(updated);
        return { success: true, meetingUrl: url, message: res.data.message };
      }
      return { success: false, message: res?.message || 'Failed to attach Google Meet URL' };
    } catch (e: any) {
      return {
        success: false,
        message: e?.response?.data?.message || e.message || 'Error attaching Google Meet URL',
      };
    }
  },

  endSession: async (sessionId: string, recordingUrl?: string) => {
    const target = get().sessions.find((s) => s.id === sessionId);
    const finalRecordingUrl = recordingUrl && recordingUrl.trim() ? recordingUrl.trim() : (target?.recordingUrl || '');

    try {
      await apiClient.post(`/live-sessions/${sessionId}/broadcast/end`, {
        recordingUrl: finalRecordingUrl || undefined,
      });
    } catch (e) {
      console.warn('Failed to end session in backend:', e);
    }

    const updated = get().sessions.map((s) =>
      s.id === sessionId
        ? {
            ...s,
            status: 'ended' as const,
            recordingUrl: finalRecordingUrl,
            recordingLink: finalRecordingUrl,
            updatedAt: new Date().toISOString(),
          }
        : s
    );
    set({ sessions: updated });
    persistSessions(updated);
    return { success: true };
  },

  updateRecordingUrl: async (sessionId: string, recordingUrl: string) => {
    const cleanUrl = recordingUrl ? recordingUrl.trim() : '';
    try {
      await apiClient.put(`/live-sessions/${sessionId}`, { recordingUrl: cleanUrl });
    } catch (e) {
      console.warn('Failed to update recording URL in backend:', e);
    }

    const updated = get().sessions.map((s) =>
      s.id === sessionId
        ? {
            ...s,
            recordingUrl: cleanUrl,
            recordingLink: cleanUrl,
            updatedAt: new Date().toISOString(),
          }
        : s
    );
    set({ sessions: updated });
    persistSessions(updated);
    return { success: true };
  },

  deleteSession: (sessionId: string) => {
    const updated = get().sessions.filter((s) => s.id !== sessionId);
    set({ sessions: updated });
    persistSessions(updated);
    // Fire and forget
    apiClient.delete(`/live-sessions/${sessionId}`).catch((e) =>
      console.warn('Failed to delete session in backend:', e)
    );
    return { success: true };
  },

  toggleBookmark: (sessionId: string) => {
    const updated = get().sessions.map((s) =>
      s.id === sessionId ? { ...s, isBookmarked: !s.isBookmarked } : s
    );
    set({ sessions: updated });
    persistSessions(updated);
  },
}));
