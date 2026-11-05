import { apiClient } from './apiClient';
// ============================================================
// VeniLearn Proctoring Store (Hybrid Google Meet Live + VeniGuard System)
// Manages real-time Google Meet participants, telemetry, warnings,
// audit logs, VeniGuard policies, sessions, incident reviews, and appeals.
// ============================================================

import { create } from 'zustand';
import {
  ProctoringIncident,
  ProctorWarning,
  ProctoringPolicy,
  ProctoringPolicyLevel,
  ProctoringSession,
  ProctoringEvent,
  ProctoringSessionStatus,
  ProctoringEventCategory,
  ProctoringSeverity,
} from '../types';


// Re-export proctoring types for convenience
export type {
  ProctoringPolicy,
  ProctoringPolicyLevel,
  ProctoringSession,
  ProctoringEvent,
  ProctoringSessionStatus,
  ProctoringEventCategory,
  ProctoringSeverity,
};

export interface ProctorParticipant {
  id: string; // studentId (e.g. u-007)
  name: string; // student name
  rollNo: string;
  avatar?: string;
  assessmentId: string;
  status: 'connected' | 'reconnecting' | 'disconnected' | 'submitted';
  cameraActive: boolean;
  micActive: boolean;
  audioLevel: number; // 0.0 to 1.0 (live RMS level)
  screenShareActive: boolean;
  tabFocused: boolean;
  faceDetected: boolean;
  joinedAt: string;
  lastPingAt: string;
  activeWarningCount: number;
  jitsiParticipantId?: string;
}

export interface ProctorAuditRecord {
  id: string;
  assessmentId: string;
  learnerId: string;
  learnerName: string;
  action: 'warning_sent' | 'warning_acknowledged' | 'incident_dismissed' | 'force_submitted' | 'proctor_joined';
  description: string;
  performedBy: string;
  timestamp: string;
}

const STORAGE_KEY_PROCTORING_SESSIONS = 'venilearn_proctoring_sessions_v3';
const STORAGE_KEY_PROCTORING_POLICIES = 'venilearn_proctoring_policies_v3';

export const DEFAULT_PROCTORING_POLICIES: Record<ProctoringPolicyLevel, ProctoringPolicy> = {
  basic: {
    id: 'pol-basic',
    name: 'VeniGuard Essential Proctored Assessment',
    level: 'basic',
    description: 'Continuous screen sharing, webcam presence, microphone monitor, and fullscreen focus verification.',
    requireScreenShare: true,
    requireMicrophone: true,
    requireWebcam: true,
    requireFullscreen: true,
    pauseOnScreenShareLoss: true,
    pauseOnTabSwitch: true,
    pauseOnNetworkLoss: true,
    disclosureText:
      'Standard proctored examination. All monitoring channels (Screen capture, webcam presence, microphone ambient level, and fullscreen lockdown) are required to safeguard test environment integrity.',
    retentionDays: 14,
  },
  monitored: {
    id: 'pol-monitored',
    name: 'VeniGuard Monitored Assessment',
    level: 'monitored',
    description: 'Comprehensive real-time monitoring: Screen sharing, webcam feed, microphone audio, and fullscreen lockdown.',
    requireScreenShare: true,
    requireMicrophone: true,
    requireWebcam: true,
    requireFullscreen: true,
    pauseOnScreenShareLoss: true,
    pauseOnTabSwitch: true,
    pauseOnNetworkLoss: true,
    disclosureText:
      'Monitored examination session. Screen sharing, webcam feed, ambient microphone monitoring, and fullscreen mode are all required. Any tab switching, window focus loss, or interruption is recorded with timestamps for fair human instructor review.',
    retentionDays: 30,
  },
  strict: {
    id: 'pol-strict',
    name: 'VeniGuard Strict High-Stakes Assessment',
    level: 'strict',
    description: 'Comprehensive multi-stream verification (Webcam, Ambient Mic, Screen & Fullscreen Lockdown).',
    requireScreenShare: true,
    requireMicrophone: true,
    requireWebcam: true,
    requireFullscreen: true,
    pauseOnScreenShareLoss: true,
    pauseOnTabSwitch: true,
    pauseOnNetworkLoss: true,
    disclosureText:
      'Strict monitored session for high-stakes certification. Requires continuous webcam feed, ambient audio monitor, browser screen sharing, and full window lockdown. Unresolved interruptions will pause your exam until re-verified. Review decisions are recorded in your academic ledger.',
    retentionDays: 60,
  },
};

const initialParticipants: ProctorParticipant[] = [
  {
    id: 'u-007',
    name: 'Alex Thompson',
    rollNo: 'STU-2026-007',
    assessmentId: 'asm-001',
    status: 'connected',
    cameraActive: true,
    micActive: true,
    audioLevel: 0.12,
    screenShareActive: false,
    tabFocused: true,
    faceDetected: true,
    joinedAt: new Date(Date.now() - 25 * 60000).toISOString(),
    lastPingAt: new Date().toISOString(),
    activeWarningCount: 0,
  },
  {
    id: 'u-009',
    name: 'Maria Garcia',
    rollNo: 'STU-2026-009',
    assessmentId: 'asm-001',
    status: 'connected',
    cameraActive: true,
    micActive: true,
    audioLevel: 0.45,
    screenShareActive: false,
    tabFocused: false,
    faceDetected: true,
    joinedAt: new Date(Date.now() - 30 * 60000).toISOString(),
    lastPingAt: new Date().toISOString(),
    activeWarningCount: 1,
  },
  {
    id: 'u-010',
    name: 'David Kim',
    rollNo: 'STU-2026-010',
    assessmentId: 'asm-001',
    status: 'connected',
    cameraActive: true,
    micActive: false,
    audioLevel: 0.05,
    screenShareActive: false,
    tabFocused: true,
    faceDetected: true,
    joinedAt: new Date(Date.now() - 20 * 60000).toISOString(),
    lastPingAt: new Date().toISOString(),
    activeWarningCount: 0,
  },
  {
    id: 'u-006',
    name: 'Aisha Patel',
    rollNo: 'STU-2026-008',
    assessmentId: 'asm-001',
    status: 'connected',
    cameraActive: true,
    micActive: true,
    audioLevel: 0.18,
    screenShareActive: false,
    tabFocused: true,
    faceDetected: true,
    joinedAt: new Date(Date.now() - 15 * 60000).toISOString(),
    lastPingAt: new Date().toISOString(),
    activeWarningCount: 0,
  },
  {
    id: 'st-5',
    name: 'Sarah Connor',
    rollNo: 'STU-2026-015',
    assessmentId: 'asm-001',
    status: 'reconnecting',
    cameraActive: false,
    micActive: true,
    audioLevel: 0.02,
    screenShareActive: false,
    tabFocused: true,
    faceDetected: false,
    joinedAt: new Date(Date.now() - 10 * 60000).toISOString(),
    lastPingAt: new Date().toISOString(),
    activeWarningCount: 1,
  },
];

const initialWarnings: ProctorWarning[] = [
  {
    id: 'wrn-001',
    assessmentId: 'asm-001',
    learnerId: 'u-009',
    learnerName: 'Maria Garcia',
    message: 'Browser focus changed: please keep the examination window active at all times.',
    reason: 'Tab switch detected (2 occurrences)',
    sentAt: new Date(Date.now() - 8 * 60000).toISOString(),
    sentBy: 'Dr. James Wilson (Proctor)',
    acknowledged: true,
    acknowledgedAt: new Date(Date.now() - 7 * 60000).toISOString(),
  },
  {
    id: 'wrn-002',
    assessmentId: 'asm-001',
    learnerId: 'st-5',
    learnerName: 'Sarah Connor',
    message: 'Webcam feed disconnected. Please verify your camera connection immediately.',
    reason: 'Camera interrupted',
    sentAt: new Date(Date.now() - 4 * 60000).toISOString(),
    sentBy: 'Dr. James Wilson (Proctor)',
    acknowledged: false,
  },
];

const initialAuditLogs: ProctorAuditRecord[] = [
  {
    id: 'aud-001',
    assessmentId: 'asm-001',
    learnerId: 'u-009',
    learnerName: 'Maria Garcia',
    action: 'warning_sent',
    description: 'Proctor issued focus warning after secondary tab switch signal was flagged.',
    performedBy: 'Dr. James Wilson',
    timestamp: new Date(Date.now() - 8 * 60000).toISOString(),
  },
  {
    id: 'aud-002',
    assessmentId: 'asm-001',
    learnerId: 'u-009',
    learnerName: 'Maria Garcia',
    action: 'warning_acknowledged',
    description: 'Student confirmed receipt and returned focus to the exam window.',
    performedBy: 'Maria Garcia',
    timestamp: new Date(Date.now() - 7 * 60000).toISOString(),
  },
];

const SEED_SESSIONS: ProctoringSession[] = [];

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((item: any) => !item.id?.startsWith('psess-00')) as unknown as T;
    }
    return parsed && (Array.isArray(parsed) || typeof parsed === 'object') ? parsed : fallback;
  } catch (err) {
    console.warn(`Failed to read from localStorage (${key}):`, err);
    return fallback;
  }
}

function saveToStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.warn(`Failed to write to localStorage (${key}):`, err);
  }
}

export interface ProctoringStoreState {
  isLoadingSessions: boolean;
  fetchMySessions: () => Promise<void>;
  // Real-time Jitsi State
  incidents: ProctoringIncident[];
  warnings: ProctorWarning[];
  auditLogs: ProctorAuditRecord[];
  participants: ProctorParticipant[];
  activeExamSessionId: string | null;

  // Real-time Jitsi Actions
  setActiveExamSessionId: (sessionId: string | null) => void;
  recordIncident: (incident: Omit<ProctoringIncident, 'id'>) => void;
  dismissIncident: (incidentId: string, reason: string, reviewerId?: string) => void;
  sendWarning: (params: {
    assessmentId: string;
    learnerId: string;
    learnerName: string;
    message: string;
    reason?: string;
    sentBy: string;
  }) => void;
  acknowledgeWarning: (warningId: string) => void;
  forceSubmitExam: (params: {
    assessmentId: string;
    learnerId: string;
    learnerName: string;
    reason: string;
    proctorName: string;
  }) => void;
  updateParticipantTelemetry: (
    participantId: string,
    telemetry: Partial<ProctorParticipant>
  ) => void;
  resetToDefaults: () => void;

  // VeniGuard Sessions & Policies State
  sessions: ProctoringSession[];
  policies: Record<ProctoringPolicyLevel, ProctoringPolicy>;
  activeSessionId: string | null;

  // VeniGuard Actions
  getActiveSession: () => ProctoringSession | undefined;
  getSessionById: (id: string) => ProctoringSession | undefined;
  getSessionsForLearner: (learnerId: string) => ProctoringSession[];
  getSessionsForAssessment: (assessmentId: string) => ProctoringSession[];

  initiateSession: (params: {
    assessmentId: string;
    assessmentTitle: string;
    learnerId: string;
    learnerName: string;
    policyLevel?: ProctoringPolicyLevel;
  }) => ProctoringSession;
  setSessionStatus: (sessionId: string, status: ProctoringSessionStatus) => void;
  updateChecklistState: (
    sessionId: string,
    updates: Partial<{
      activeScreenShare: boolean;
      activeMic: boolean;
      activeWebcam: boolean;
      isFullscreen: boolean;
      isOnline: boolean;
      jitsiRoomName: string;
      jitsiRoomUrl: string;
      jitsiStatus: 'connected' | 'connecting' | 'disconnected';
    }>
  ) => void;

  logEvent: (
    sessionId: string,
    event: {
      category: ProctoringEventCategory;
      severity: ProctoringSeverity;
      title: string;
      description: string;
      technicalMetadata?: Record<string, unknown>;
      evidenceSnapshot?: string;
      evidenceType?: 'screenshot' | 'audio_sample' | 'telemetry_log';
    }
  ) => ProctoringEvent;

  attachRecording: (
    sessionId: string,
    payload: { recordingUrl: string; duration: number; isSimulated?: boolean }
  ) => void;

  submitStudentExplanation: (sessionId: string, eventId: string, explanation: string) => void;
  submitStudentAppeal: (sessionId: string, explanation: string) => void;
  submitInstructorDecision: (
    sessionId: string,
    decision: {
      reviewerId: string;
      reviewerName: string;
      outcome:
        | 'no_violation'
        | 'warning_issued'
        | 'further_review'
        | 'violation_confirmed'
        | 'technical_incident_accepted';
      explanation: string;
    }
  ) => void;

  updatePolicy: (level: ProctoringPolicyLevel, updates: Partial<ProctoringPolicy>) => void;
}

export const useProctoringStore = create<ProctoringStoreState>((set, get) => ({
  isLoadingSessions: false,
  fetchMySessions: async () => {
    set({ isLoadingSessions: true });
    try {
      const res = await apiClient.get<any[]>('/proctoring/my-sessions');
      if (res && res.data && Array.isArray(res.data)) {
        const mapped: ProctoringSession[] = res.data.map((item: any) => ({
          id: item.id,
          attemptId: item.attemptId,
          assessmentId: item.assessmentId,
          assessmentTitle: item.attempt?.assessment?.title || item.assessmentTitle || 'Proctored Assessment',
          learnerId: item.learnerId,
          learnerName: item.learnerName || 'Student',
          policy: item.policy || DEFAULT_PROCTORING_POLICIES.basic,
          status: item.status || 'reviewed',
          startedAt: item.startedAt,
          endedAt: item.endedAt,
          totalDurationSeconds: item.totalDurationSec || 0,
          activeScreenShare: item.activeScreenShare ?? true,
          activeMic: item.activeMic ?? true,
          activeWebcam: item.activeWebcam ?? true,
          isFullscreen: item.isFullscreen ?? true,
          isOnline: true,
          events: (item.events || []).map((ev: any) => ({
            id: ev.id,
            sessionId: ev.sessionId,
            assessmentId: item.assessmentId,
            learnerId: item.learnerId,
            category: ev.category,
            timestamp: ev.createdAt,
            clientTimestamp: ev.clientTimestamp ? Number(ev.clientTimestamp) : Date.now(),
            relativeSeconds: ev.relativeSeconds || 0,
            severity: ev.severity || 'warning',
            title: ev.title,
            description: ev.description,
            evidenceSnapshot: ev.evidenceSnapshot,
            evidenceType: 'screenshot',
          })),
          warnings: item.warnings || [],
          incidents: item.incidents || [],
          reviewDecision: item.reviewOutcome ? {
            reviewerId: 'faculty',
            reviewerName: 'Instructor',
            outcome: item.reviewOutcome,
            explanation: item.appealExplanation || 'Proctoring review finalized.',
            timestamp: item.updatedAt,
          } : undefined,
        }));
        set({ sessions: mapped, isLoadingSessions: false });
        saveToStorage(STORAGE_KEY_PROCTORING_SESSIONS, mapped);
        return;
      }
    } catch (e) {
      console.warn('Failed to fetch proctoring sessions:', e);
    }
    set({ isLoadingSessions: false });
  },
  // Real-time Jitsi Initial State
  incidents: [],
  warnings: initialWarnings,
  auditLogs: initialAuditLogs,
  participants: initialParticipants,
  activeExamSessionId: 'asm-001',

  setActiveExamSessionId: (sessionId) => set({ activeExamSessionId: sessionId }),

  recordIncident: (incident) => {
    const newInc: ProctoringIncident = {
      ...incident,
      id: `inc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    };
    set((state) => ({
      incidents: [newInc, ...state.incidents],
    }));
  },

  dismissIncident: (incidentId, reason, reviewerId = 'Dr. James Wilson') => {
    const now = new Date().toISOString();
    set((state) => {
      const target = state.incidents.find((i) => i.id === incidentId);
      const updatedIncidents = state.incidents.map((i) => {
        if (i.id === incidentId) {
          return {
            ...i,
            status: 'cleared' as const,
            dismissed: true,
            dismissedReason: reason,
            reviewerId,
            reviewerNotes: `Dismissed: ${reason}`,
          };
        }
        return i;
      });

      const newAudit: ProctorAuditRecord = {
        id: `aud-${Date.now()}`,
        assessmentId: target?.assessmentId || 'asm-001',
        learnerId: target?.learnerId || '',
        learnerName: target?.learnerName || 'Student',
        action: 'incident_dismissed',
        description: `Dismissed false alarm (${target?.eventType}): ${reason}`,
        performedBy: reviewerId,
        timestamp: now,
      };

      return {
        incidents: updatedIncidents,
        auditLogs: [newAudit, ...state.auditLogs],
      };
    });
  },

  sendWarning: ({ assessmentId, learnerId, learnerName, message, reason, sentBy }) => {
    const now = new Date().toISOString();
    const newWarning: ProctorWarning = {
      id: `wrn-${Date.now()}`,
      assessmentId,
      learnerId,
      learnerName,
      message,
      reason,
      sentAt: now,
      sentBy,
      acknowledged: false,
    };

    const newAudit: ProctorAuditRecord = {
      id: `aud-${Date.now()}`,
      assessmentId,
      learnerId,
      learnerName,
      action: 'warning_sent',
      description: `Warning issued: "${message}" (${reason || 'Proctor instruction'})`,
      performedBy: sentBy,
      timestamp: now,
    };

    set((state) => {
      const updatedParticipants = state.participants.map((p) => {
        if (p.id === learnerId) {
          return {
            ...p,
            activeWarningCount: p.activeWarningCount + 1,
          };
        }
        return p;
      });

      return {
        warnings: [newWarning, ...state.warnings],
        auditLogs: [newAudit, ...state.auditLogs],
        participants: updatedParticipants,
      };
    });
  },

  acknowledgeWarning: (warningId) => {
    const now = new Date().toISOString();
    set((state) => {
      const target = state.warnings.find((w) => w.id === warningId);
      const updatedWarnings = state.warnings.map((w) => {
        if (w.id === warningId) {
          return {
            ...w,
            acknowledged: true,
            acknowledgedAt: now,
          };
        }
        return w;
      });

      const newAudit: ProctorAuditRecord = {
        id: `aud-${Date.now()}`,
        assessmentId: target?.assessmentId || 'asm-001',
        learnerId: target?.learnerId || '',
        learnerName: target?.learnerName || 'Student',
        action: 'warning_acknowledged',
        description: 'Student acknowledged receipt of proctor warning.',
        performedBy: target?.learnerName || 'Student',
        timestamp: now,
      };

      return {
        warnings: updatedWarnings,
        auditLogs: [newAudit, ...state.auditLogs],
      };
    });
  },

  forceSubmitExam: ({ assessmentId, learnerId, learnerName, reason, proctorName }) => {
    const now = new Date().toISOString();
    set((state) => {
      const updatedParticipants = state.participants.map((p) => {
        if (p.id === learnerId) {
          return {
            ...p,
            status: 'submitted' as const,
          };
        }
        return p;
      });

      const newAudit: ProctorAuditRecord = {
        id: `aud-${Date.now()}`,
        assessmentId,
        learnerId,
        learnerName,
        action: 'force_submitted',
        description: `EXPLICIT PROCTOR FORCE-SUBMIT: Exam session terminated. Reason: ${reason}`,
        performedBy: proctorName,
        timestamp: now,
      };

      return {
        participants: updatedParticipants,
        auditLogs: [newAudit, ...state.auditLogs],
      };
    });
  },

  updateParticipantTelemetry: (participantId, telemetry) => {
    set((state) => ({
      participants: state.participants.map((p) => {
        if (p.id === participantId) {
          return { ...p, ...telemetry, lastPingAt: new Date().toISOString() };
        }
        return p;
      }),
    }));
  },

  resetToDefaults: () => {
    set({
      incidents: [],
      warnings: initialWarnings,
      auditLogs: initialAuditLogs,
      participants: initialParticipants,
      activeExamSessionId: 'asm-001',
    });
  },

  // VeniGuard Sessions & Policies Initial State
  sessions: loadFromStorage<ProctoringSession[]>(STORAGE_KEY_PROCTORING_SESSIONS, SEED_SESSIONS),
  policies: loadFromStorage<Record<ProctoringPolicyLevel, ProctoringPolicy>>(
    STORAGE_KEY_PROCTORING_POLICIES,
    DEFAULT_PROCTORING_POLICIES
  ),
  activeSessionId: null,

  getActiveSession: () => {
    const { sessions, activeSessionId } = get();
    if (!activeSessionId) return undefined;
    return sessions.find((s) => s.id === activeSessionId);
  },

  getSessionById: (id: string) => {
    return get().sessions.find((s) => s.id === id);
  },

  getSessionsForLearner: (learnerId: string) => {
    return get().sessions.filter((s) => s.learnerId === learnerId);
  },

  getSessionsForAssessment: (assessmentId: string) => {
    return get().sessions.filter((s) => s.assessmentId === assessmentId);
  },

  initiateSession: ({ assessmentId, assessmentTitle, learnerId, learnerName, policyLevel = 'monitored' }) => {
    const policy = get().policies[policyLevel] || DEFAULT_PROCTORING_POLICIES.monitored;
    const newSessionId = `psess-${Date.now()}`;
    const newSession: ProctoringSession = {
      id: newSessionId,
      attemptId: `att-${Date.now()}`,
      assessmentId,
      assessmentTitle,
      learnerId,
      learnerName,
      policy,
      status: 'pre_flight',
      startedAt: new Date().toISOString(),
      activeScreenShare: false,
      activeMic: false,
      activeWebcam: false,
      isFullscreen: false,
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      events: [
        {
          id: `pevt-init-${Date.now()}`,
          sessionId: newSessionId,
          assessmentId,
          learnerId,
          category: 'timing_event',
          timestamp: new Date().toISOString(),
          clientTimestamp: Date.now(),
          relativeSeconds: 0,
          severity: 'informational',
          title: 'Proctored Session Initialized',
          description: `VeniGuard ${policy.name} pre-flight checks started.`,
        },
      ],
    };

    set((state) => {
      const nextSessions = [newSession, ...state.sessions];
      saveToStorage(STORAGE_KEY_PROCTORING_SESSIONS, nextSessions);
      return {
        sessions: nextSessions,
        activeSessionId: newSessionId,
      };
    });

    return newSession;
  },

  setSessionStatus: (sessionId, status) => {
    set((state) => {
      const nextSessions = state.sessions.map((s) => {
        if (s.id !== sessionId) return s;
        const updated: ProctoringSession = {
          ...s,
          status,
          endedAt: status === 'submitted' ? new Date().toISOString() : s.endedAt,
        };
        return updated;
      });
      saveToStorage(STORAGE_KEY_PROCTORING_SESSIONS, nextSessions);
      return { sessions: nextSessions };
    });
  },

  updateChecklistState: (sessionId, updates) => {
    set((state) => {
      const nextSessions = state.sessions.map((s) => (s.id === sessionId ? { ...s, ...updates } : s));
      saveToStorage(STORAGE_KEY_PROCTORING_SESSIONS, nextSessions);
      return { sessions: nextSessions };
    });
  },

  logEvent: (sessionId, eventPayload) => {
    const { sessions } = get();
    const current = sessions.find((s) => s.id === sessionId);
    const startMs = current ? new Date(current.startedAt).getTime() : Date.now();
    const nowMs = Date.now();
    const relativeSeconds = Math.max(0, Math.floor((nowMs - startMs) / 1000));

    const newEvent: ProctoringEvent = {
      id: `pevt-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      sessionId,
      assessmentId: current?.assessmentId || 'unknown',
      learnerId: current?.learnerId || 'unknown',
      timestamp: new Date().toISOString(),
      clientTimestamp: nowMs,
      relativeSeconds,
      ...eventPayload,
    };

    set((state) => {
      const nextSessions = state.sessions.map((s) => {
        if (s.id !== sessionId) return s;
        return {
          ...s,
          events: [...s.events, newEvent],
        };
      });
      saveToStorage(STORAGE_KEY_PROCTORING_SESSIONS, nextSessions);
      return { sessions: nextSessions };
    });

    return newEvent;
  },

  attachRecording: (sessionId, payload) => {
    set((state) => {
      const nextSessions = state.sessions.map((s) => {
        if (s.id !== sessionId) return s;
        return {
          ...s,
          recordingUrl: payload.recordingUrl,
          recordingDuration: payload.duration,
          isSimulatedRecording: payload.isSimulated ?? false,
        };
      });
      saveToStorage(STORAGE_KEY_PROCTORING_SESSIONS, nextSessions);
      return { sessions: nextSessions };
    });
  },

  submitStudentExplanation: (sessionId, eventId, explanation) => {
    set((state) => {
      const nextSessions = state.sessions.map((s) => {
        if (s.id !== sessionId) return s;
        const updatedEvents = s.events.map((evt) => {
          if (evt.id !== eventId) return evt;
          return {
            ...evt,
            studentExplanation: explanation,
            studentExplanationSubmittedAt: new Date().toISOString(),
          };
        });
        return { ...s, events: updatedEvents };
      });
      saveToStorage(STORAGE_KEY_PROCTORING_SESSIONS, nextSessions);
      return { sessions: nextSessions };
    });
  },

  submitStudentAppeal: (sessionId, explanation) => {
    set((state) => {
      const nextSessions: ProctoringSession[] = state.sessions.map((s) => {
        if (s.id !== sessionId) return s;
        return {
          ...s,
          studentAppeal: {
            appealId: `app-${Date.now()}`,
            explanation,
            submittedAt: new Date().toISOString(),
            status: 'pending' as const,
          },
        };
      });
      saveToStorage(STORAGE_KEY_PROCTORING_SESSIONS, nextSessions);
      return { sessions: nextSessions };
    });
  },

  submitInstructorDecision: (sessionId, decision) => {
    set((state) => {
      const nextSessions: ProctoringSession[] = state.sessions.map((s) => {
        if (s.id !== sessionId) return s;
        const reviewedSession: ProctoringSession = {
          ...s,
          status: 'reviewed',
          reviewDecision: {
            ...decision,
            timestamp: new Date().toISOString(),
          },
          studentAppeal: s.studentAppeal
            ? { ...s.studentAppeal, status: 'reviewed' as const }
            : undefined,
        };
        return reviewedSession;
      });
      saveToStorage(STORAGE_KEY_PROCTORING_SESSIONS, nextSessions);
      return { sessions: nextSessions };
    });
  },

  updatePolicy: (level, updates) => {
    set((state) => {
      const currentPolicy = state.policies[level];
      const updatedPolicy = { ...currentPolicy, ...updates };
      const nextPolicies = { ...state.policies, [level]: updatedPolicy };
      saveToStorage(STORAGE_KEY_PROCTORING_POLICIES, nextPolicies);
      return { policies: nextPolicies };
    });
  },
}));
