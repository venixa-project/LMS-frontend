import { apiClient } from './apiClient';
// ============================================================
// LMS - Live Sessions Store (Zustand with LocalStorage)
// Manages real-time live classes, scheduling, status transitions,
// student eligibility, and automated in-app notifications.
// ============================================================
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
  ) => { success: boolean; session: LiveSession };
  updateSession: (
    updated: LiveSession,
    notifyStudents?: boolean
  ) => { success: boolean; session: LiveSession };
  cancelSession: (
    sessionId: string,
    reason?: string,
    notifyStudents?: boolean
  ) => { success: boolean };
  startBroadcast: (sessionId: string) => { success: boolean };
  endSession: (sessionId: string, recordingUrl?: string) => { success: boolean };
  deleteSession: (sessionId: string) => { success: boolean };
  toggleBookmark: (sessionId: string) => void;
}

const STORAGE_KEY_SESSIONS = 'venilearn_live_sessions';

const INITIAL_SESSIONS: LiveSession[] = [];

function loadInitialSessions(): LiveSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SESSIONS);
    if (raw) {
      const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const realSessions = parsed.filter((s) => !s.id?.startsWith("ls-live-") && !s.id?.startsWith("ls-rec-"));
          return realSessions;
        }
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Automatically upgrade any legacy Zoom/Jitsi/VeniLearn rooms to Google Meet
        const upgraded = parsed.map((s: LiveSession) => {
          const isLegacyProvider = s.provider && (s.provider.includes('Zoom') || s.provider.includes('VeniLearn Live') || s.provider.includes('Jitsi'));
          const isLegacyUrl = s.meetingUrl && (s.meetingUrl.includes('zoom.us') || s.meetingUrl.includes('meet.venilearn.com') || s.meetingUrl.includes('jit.si'));
          if (isLegacyProvider || isLegacyUrl) {
            const cleanId = (s.id || 'ses').replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(-6);
            const meetUrl = s.meetingUrl ? `https://meet.google.com/ven-${cleanId}` : '';
            return {
              ...s,
              provider: 'Google Meet',
              meetingUrl: meetUrl,
              joinLink: meetUrl,
            };
          }
          return s;
        });

        const existingIds = new Set(upgraded.map((s: LiveSession) => s.id));
        const missingInitial = INITIAL_SESSIONS.filter((init) => !existingIds.has(init.id));
        if (missingInitial.length > 0) {
          const merged = [...upgraded, ...missingInitial];
          localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(merged));
          return merged;
        }
        localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(upgraded));
        return upgraded;
      }
    }
  } catch (err) {
    console.warn('Failed to load live sessions from localStorage:', err);
  }
  return INITIAL_SESSIONS;
}

function persistSessions(sessions: LiveSession[]) {
  try {
    localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(sessions));
  } catch (err) {
    console.warn('Failed to save live sessions to localStorage:', err);
  }
}

export const useLiveSessionStore = create<LiveSessionState>((set, get) => ({
  isLoading: false,
  fetchSessions: async () => {
    set({ isLoading: true });
    try {
      const res = await apiClient.get<any[]>('/live-sessions');
      if (res && res.data && Array.isArray(res.data)) {
        const mapped: LiveSession[] = res.data.map((item: any) => ({
          id: item.id,
          title: item.title,
          description: item.description || '',
          courseId: item.courseId || undefined,
          cohortId: item.cohortId || undefined,
          date: item.startTime ? item.startTime.slice(0, 10) : new Date().toISOString().slice(0, 10),
          startTime: item.startTime ? new Date(item.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '10:00',
          endTime: item.endTime ? new Date(item.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '11:00',
          durationMinutes: item.durationMinutes || 60,
          status: item.status || 'scheduled',
          provider: item.provider || 'Google Meet',
          meetingUrl: item.meetingUrl || '',
          recordingUrl: item.recordingUrl || '',
          recordingLink: item.recordingUrl || '',
          instructorId: item.instructorId || item.trainerId || 'trainer-default',
          instructorName: item.instructorName || item.trainer?.displayName || 'Faculty Trainer',
          targetAudienceType: 'all_enrolled',
          attendance: item.attendance || [],
          createdAt: item.createdAt || new Date().toISOString(),
          updatedAt: item.updatedAt || new Date().toISOString(),
        }));
        set({ sessions: mapped, isLoading: false });
        persistSessions(mapped);
        return;
      }
    } catch (e) {
      console.warn('Failed to fetch live sessions from backend:', e);
    }
    set({ isLoading: false });
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
      // If student is explicitly in targetStudentIds
      if (s.targetStudentIds && s.targetStudentIds.includes(studentId)) {
        return true;
      }
      // If session is for a cohort the student belongs to
      if (s.cohortId && cohortIds.includes(s.cohortId)) {
        if (s.targetAudienceType === 'selected_students') {
          return s.targetStudentIds?.includes(studentId);
        }
        return true;
      }
      // If session is for an enrolled course with no restrictive cohort
      if (s.courseId && courseIds.includes(s.courseId) && !s.cohortId) {
        return true;
      }
      return false;
    });
  },

  addSession: (sessionData, notifyStudents = true) => {
    const newSession: LiveSession = {
      ...sessionData,
      id: `ls-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      attendance: [],
    };

    const updated = [newSession, ...get().sessions];
    set({ sessions: updated });
    persistSessions(updated);

    // Dispatch in-app notifications if requested
    if (notifyStudents && newSession.targetStudentIds && newSession.targetStudentIds.length > 0) {
      try {
        useAuthStore.getState().notifyLiveSession({
          sessionId: newSession.id,
          sessionTitle: newSession.title,
          instructorName: newSession.instructorName || 'Your Trainer',
          recipientIds: newSession.targetStudentIds,
          type: 'scheduled',
          date: newSession.date,
          startTime: newSession.startTime,
        });
      } catch (e) {
        console.warn('Failed to dispatch live session scheduled notification:', e);
      }
    }

    return { success: true, session: newSession };
  },

  updateSession: (updatedSession, notifyStudents = true) => {
    const sessionWithTimestamp: LiveSession = {
      ...updatedSession,
      updatedAt: new Date().toISOString(),
    };

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

  startBroadcast: (sessionId: string) => {
    const target = get().sessions.find((s) => s.id === sessionId);
    if (!target) return { success: false };

    const updated = get().sessions.map((s) =>
      s.id === sessionId
        ? {
            ...s,
            status: 'live' as const,
            updatedAt: new Date().toISOString(),
          }
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

  endSession: (sessionId: string, recordingUrl?: string) => {
    const updated = get().sessions.map((s) =>
      s.id === sessionId
        ? {
            ...s,
            status: 'ended' as const,
            recordingUrl: recordingUrl || s.recordingUrl || `https://venilearn.demo/recordings/${sessionId}`,
            recordingLink: recordingUrl || s.recordingLink || `https://venilearn.demo/recordings/${sessionId}`,
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
