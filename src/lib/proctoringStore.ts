// ============================================================
// VeniGuard - Explainable & Evidence-Based Proctoring Store
// Manages proctoring policies, sessions, real-time events,
// evidence associations, student appeals, and instructor verdicts.
// ============================================================

import { create } from 'zustand';
import {
  ProctoringPolicy,
  ProctoringPolicyLevel,
  ProctoringSession,
  ProctoringEvent,
  ProctoringSessionStatus,
  ProctoringEventCategory,
  ProctoringSeverity,
} from '../types';

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

const SEED_SESSIONS: ProctoringSession[] = [
  {
    id: 'psess-001',
    attemptId: 'att-003',
    assessmentId: 'asm-001',
    assessmentTitle: 'JavaScript Fundamentals Quiz',
    learnerId: 'u-009',
    learnerName: 'Maria Garcia',
    policy: DEFAULT_PROCTORING_POLICIES.monitored,
    status: 'under_review',
    startedAt: '2026-10-16T10:00:00Z',
    endedAt: '2026-10-16T10:45:00Z',
    totalDurationSeconds: 2700,
    activeScreenShare: true,
    activeMic: false,
    activeWebcam: false,
    isFullscreen: true,
    isOnline: true,
    isSimulatedRecording: true,
    recordingUrl: 'https://storage.venilearn.org/recordings/psess-001.webm',
    recordingDuration: 2700,
    events: [
      {
        id: 'pevt-101',
        sessionId: 'psess-001',
        assessmentId: 'asm-001',
        learnerId: 'u-009',
        category: 'timing_event',
        timestamp: '2026-10-16T10:00:00Z',
        clientTimestamp: Date.parse('2026-10-16T10:00:00Z'),
        relativeSeconds: 0,
        severity: 'informational',
        title: 'Assessment Started',
        description: 'Learner initialized assessment session with verified screen capture stream.',
        technicalMetadata: { browser: 'Chrome 131', os: 'Windows 11', resolution: '1920x1080' },
      },
      {
        id: 'pevt-102',
        sessionId: 'psess-001',
        assessmentId: 'asm-001',
        learnerId: 'u-009',
        category: 'tab_visibility',
        timestamp: '2026-10-16T10:15:23Z',
        clientTimestamp: Date.parse('2026-10-16T10:15:23Z'),
        relativeSeconds: 923,
        severity: 'warning',
        title: 'Exam Window Focus Lost',
        description: 'Document visibility state changed to hidden for 4 seconds.',
        technicalMetadata: { durationSeconds: 4, reason: 'visibilitychange' },
        evidenceSnapshot: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=600&q=80',
        evidenceType: 'screenshot',
        studentExplanation: 'A system antivirus notification popped up in the bottom right corner of my display.',
        studentExplanationSubmittedAt: '2026-10-16T10:50:00Z',
      },
      {
        id: 'pevt-103',
        sessionId: 'psess-001',
        assessmentId: 'asm-001',
        learnerId: 'u-009',
        category: 'fullscreen_exit',
        timestamp: '2026-10-16T10:20:00Z',
        clientTimestamp: Date.parse('2026-10-16T10:20:00Z'),
        relativeSeconds: 1200,
        severity: 'informational',
        title: 'Full-Screen Mode Exited',
        description: 'Student exited full-screen mode and returned 6 seconds later.',
        technicalMetadata: { returnedInSeconds: 6 },
        studentExplanation: 'Accidentally pressed the Escape key while reviewing question #4.',
        studentExplanationSubmittedAt: '2026-10-16T10:50:00Z',
      },
      {
        id: 'pevt-104',
        sessionId: 'psess-001',
        assessmentId: 'asm-001',
        learnerId: 'u-009',
        category: 'timing_event',
        timestamp: '2026-10-16T10:45:00Z',
        clientTimestamp: Date.parse('2026-10-16T10:45:00Z'),
        relativeSeconds: 2700,
        severity: 'informational',
        title: 'Assessment Submitted',
        description: 'Student finalized and submitted all answers.',
      },
    ],
    studentAppeal: {
      appealId: 'app-001',
      explanation:
        'My antivirus popped up an urgent security notification during the exam. I closed it immediately and continued working on the exam.',
      submittedAt: '2026-10-16T10:55:00Z',
      status: 'pending',
    },
  },
  {
    id: 'psess-002',
    attemptId: 'att-002',
    assessmentId: 'asm-002',
    assessmentTitle: 'Advanced React Capstone Exam',
    learnerId: 'u-007',
    learnerName: 'Alex Thompson',
    policy: DEFAULT_PROCTORING_POLICIES.monitored,
    status: 'reviewed',
    startedAt: '2026-10-15T15:00:00Z',
    endedAt: '2026-10-15T15:40:00Z',
    totalDurationSeconds: 2400,
    activeScreenShare: true,
    activeMic: false,
    activeWebcam: false,
    isFullscreen: true,
    isOnline: true,
    isSimulatedRecording: true,
    recordingUrl: 'https://storage.venilearn.org/recordings/psess-002.webm',
    recordingDuration: 2400,
    events: [
      {
        id: 'pevt-201',
        sessionId: 'psess-002',
        assessmentId: 'asm-002',
        learnerId: 'u-007',
        category: 'network_interruption',
        timestamp: '2026-10-15T15:30:00Z',
        clientTimestamp: Date.parse('2026-10-15T15:30:00Z'),
        relativeSeconds: 1800,
        severity: 'critical',
        title: 'Internet Connection Interrupted',
        description: 'Client network disconnected. Smart pause preserved answers until connection recovered.',
        technicalMetadata: { downtimeSeconds: 18, pingLatencyMs: 42 },
        studentExplanation: 'My Wi-Fi router momentarily rebooted.',
        studentExplanationSubmittedAt: '2026-10-15T15:45:00Z',
        instructorVerdict: 'technical_accepted',
      },
    ],
    reviewDecision: {
      reviewerId: 'u-006',
      reviewerName: 'Dr. Aisha Patel',
      outcome: 'technical_incident_accepted',
      explanation: 'Verified ISP router packet drop. Answers remained preserved and student completed exam upon reconnection.',
      timestamp: '2026-10-15T16:00:00Z',
    },
  },
];

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
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

interface ProctoringStoreState {
  sessions: ProctoringSession[];
  policies: Record<ProctoringPolicyLevel, ProctoringPolicy>;
  activeSessionId: string | null;

  // Active Session Getters
  getActiveSession: () => ProctoringSession | undefined;
  getSessionById: (id: string) => ProctoringSession | undefined;
  getSessionsForLearner: (learnerId: string) => ProctoringSession[];
  getSessionsForAssessment: (assessmentId: string) => ProctoringSession[];

  // Session Lifecycle Actions
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

  // Telemetry & Event Logging
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

  // Evidence & Media Recording
  attachRecording: (
    sessionId: string,
    payload: { recordingUrl: string; duration: number; isSimulated?: boolean }
  ) => void;

  // Fairness & Reviews
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

  // Policy Management
  updatePolicy: (level: ProctoringPolicyLevel, updates: Partial<ProctoringPolicy>) => void;
}

export const useProctoringStore = create<ProctoringStoreState>((set, get) => ({
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
          title: 'VeniGuard Pre-Flight Setup Initiated',
          description: `Initialized system verification checklist under policy: ${policy.name}`,
          technicalMetadata: {
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
            screenResolution:
              typeof window !== 'undefined' ? `${window.screen.width}x${window.screen.height}` : 'Unknown',
          },
        },
      ],
    };

    set((state) => {
      const nextSessions = [newSession, ...state.sessions];
      saveToStorage(STORAGE_KEY_PROCTORING_SESSIONS, nextSessions);
      return { sessions: nextSessions, activeSessionId: newSessionId };
    });

    return newSession;
  },

  setSessionStatus: (sessionId: string, status: ProctoringSessionStatus) => {
    set((state) => {
      const nextSessions = state.sessions.map((s) => {
        if (s.id !== sessionId) return s;
        const updates: Partial<ProctoringSession> = { status };
        if (status === 'submitted') {
          updates.endedAt = new Date().toISOString();
          const startMs = Date.parse(s.startedAt);
          if (!isNaN(startMs)) {
            updates.totalDurationSeconds = Math.round((Date.now() - startMs) / 1000);
          }
        }
        return { ...s, ...updates };
      });
      saveToStorage(STORAGE_KEY_PROCTORING_SESSIONS, nextSessions);
      return { sessions: nextSessions };
    });
  },

  updateChecklistState: (sessionId, updates) => {
    set((state) => {
      const nextSessions = state.sessions.map((s) => {
        if (s.id !== sessionId) return s;
        return { ...s, ...updates };
      });
      saveToStorage(STORAGE_KEY_PROCTORING_SESSIONS, nextSessions);
      return { sessions: nextSessions };
    });
  },

  logEvent: (sessionId, eventPayload) => {
    const session = get().getSessionById(sessionId);
    const startMs = session ? Date.parse(session.startedAt) : Date.now();
    const relativeSeconds = Math.max(0, Math.round((Date.now() - startMs) / 1000));

    const newEvent: ProctoringEvent = {
      id: `pevt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      sessionId,
      assessmentId: session ? session.assessmentId : '',
      learnerId: session ? session.learnerId : '',
      timestamp: new Date().toISOString(),
      clientTimestamp: Date.now(),
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
