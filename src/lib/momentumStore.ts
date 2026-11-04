import { create } from 'zustand';
import { apiClient } from './apiClient';
import {
  DayStudyRecord,
  DayActivityItem,
  MomentumMetrics,
  formatDate,
  parseDate,
} from '../pages/Momentum/momentumData';

interface ActiveSessionState {
  id: string;
  title: string;
  startedAt: string;
  elapsedSeconds: number;
}

interface MomentumStoreState {
  days: Record<string, DayStudyRecord>;
  metrics: MomentumMetrics | null;
  settings: {
    dailyGoalMinutes: number;
    weeklyGoalHours: number;
  };
  todayDate: string;
  selectedDateStr: string;
  isLoading: boolean;
  error: string | null;
  activeSession: ActiveSessionState | null;

  // Actions
  fetchMomentum: (startDate?: string, endDate?: string) => Promise<void>;
  fetchDayActivities: (dateStr: string) => Promise<DayStudyRecord | null>;
  setSelectedDate: (dateStr: string) => void;
  updateGoals: (dailyGoalMinutes?: number, weeklyGoalHours?: number) => Promise<void>;
  startSession: (title?: string, courseId?: string, lessonId?: string) => Promise<ActiveSessionState | null>;
  tickSession: () => void;
  endSession: (finalDurationMinutes?: number) => Promise<void>;
  recordActivity: (payload: {
    title: string;
    durationMinutes: number;
    activityType?: string;
    courseId?: string;
    lessonId?: string;
  }) => Promise<void>;
}

export const useMomentumStore = create<MomentumStoreState>((set, get) => ({
  days: {},
  metrics: null,
  settings: {
    dailyGoalMinutes: 45,
    weeklyGoalHours: 10,
  },
  todayDate: formatDate(new Date()),
  selectedDateStr: formatDate(new Date()),
  isLoading: false,
  error: null,
  activeSession: null,

  fetchMomentum: async (startDate?: string, endDate?: string) => {
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      const query = params.toString() ? `?${params.toString()}` : '';

      const res = await apiClient.get<any>(`/student/momentum${query}`);
      if (res.success && res.data) {
        const { days, metrics, todayDate, settings } = res.data;
        const currentSelected = get().selectedDateStr;
        const resolvedSelected = currentSelected || todayDate || formatDate(new Date());

        set({
          days: days || {},
          metrics: metrics || null,
          todayDate: todayDate || formatDate(new Date()),
          selectedDateStr: resolvedSelected,
          settings: settings || { dailyGoalMinutes: 45, weeklyGoalHours: 10 },
          isLoading: false,
        });
      }
    } catch (err: any) {
      console.warn('[MomentumStore] Failed to fetch momentum from backend:', err?.message);
      set({ isLoading: false, error: err?.message || 'Failed to load momentum data' });
    }
  },

  fetchDayActivities: async (dateStr: string) => {
    try {
      const res = await apiClient.get<DayStudyRecord>(`/student/momentum/day/${dateStr}`);
      if (res.success && res.data) {
        set((state) => ({
          days: {
            ...state.days,
            [dateStr]: res.data,
          },
          selectedDateStr: dateStr,
        }));
        return res.data;
      }
      return null;
    } catch (err: any) {
      console.warn('[MomentumStore] Failed to fetch day activities:', err?.message);
      return null;
    }
  },

  setSelectedDate: (dateStr: string) => {
    set({ selectedDateStr: dateStr });
  },

  updateGoals: async (dailyGoalMinutes?: number, weeklyGoalHours?: number) => {
    try {
      const res = await apiClient.patch<any>('/student/momentum/goals', {
        dailyGoalMinutes,
        weeklyGoalHours,
      });

      if (res.success && res.data) {
        set((state) => ({
          settings: {
            dailyGoalMinutes: res.data.dailyGoalMinutes ?? state.settings.dailyGoalMinutes,
            weeklyGoalHours: res.data.weeklyGoalHours ?? state.settings.weeklyGoalHours,
          },
        }));
        // Re-fetch range to recalculate goal-reached levels
        await get().fetchMomentum();
      }
    } catch (err: any) {
      console.error('[MomentumStore] Failed to update goals:', err);
    }
  },

  startSession: async (title = 'Study Session', courseId, lessonId) => {
    try {
      const res = await apiClient.post<any>('/student/momentum/sessions/start', {
        title,
        courseId,
        lessonId,
        activityType: 'study',
      });

      if (res.success && res.data) {
        const sessionState: ActiveSessionState = {
          id: res.data.id,
          title: res.data.title || title,
          startedAt: res.data.startedAt,
          elapsedSeconds: 0,
        };
        set({ activeSession: sessionState });
        return sessionState;
      }
      return null;
    } catch (err: any) {
      console.error('[MomentumStore] Failed to start study session:', err);
      return null;
    }
  },

  tickSession: () => {
    const session = get().activeSession;
    if (!session) return;
    const newSeconds = session.elapsedSeconds + 1;
    set({
      activeSession: {
        ...session,
        elapsedSeconds: newSeconds,
      },
    });

    // Send heartbeat every 60 seconds
    if (newSeconds > 0 && newSeconds % 60 === 0) {
      apiClient.post(`/student/momentum/sessions/${session.id}/heartbeat`, {
        durationSeconds: newSeconds,
      }).catch((e) => console.warn('[MomentumStore] Heartbeat failed:', e));
    }
  },

  endSession: async (finalDurationMinutes?: number) => {
    const session = get().activeSession;
    if (!session) return;

    try {
      const duration = finalDurationMinutes ?? Math.max(1, Math.round(session.elapsedSeconds / 60));
      await apiClient.post(`/student/momentum/sessions/${session.id}/end`, {
        durationMinutes: duration,
      });

      set({ activeSession: null });
      // Re-fetch momentum calendar to immediately reflect the completed session
      await get().fetchMomentum();
    } catch (err: any) {
      console.error('[MomentumStore] Failed to end study session:', err);
      set({ activeSession: null });
    }
  },

  recordActivity: async (payload) => {
    try {
      await apiClient.post('/student/momentum/activity', {
        title: payload.title,
        durationMinutes: payload.durationMinutes,
        activityType: payload.activityType || 'lesson',
        courseId: payload.courseId,
        lessonId: payload.lessonId,
      });
      await get().fetchMomentum();
    } catch (err) {
      console.error('[MomentumStore] Failed to record activity:', err);
    }
  },
}));

