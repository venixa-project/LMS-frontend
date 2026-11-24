import { apiClient } from './apiClient';
import { proctoringSocket, getShortNumericId } from './proctoringSocket';
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
  status: 'connected' | 'reconnecting' | 'disconnected' | 'submitted' | 'completed' | 'terminated' | 'in_progress';
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
  latestSnapshot?: string;
  latestVideoUrl?: string;
  latestScreenSnapshot?: string;
  googleMeetUrl?: string;
  sessionId?: string;
  remoteStream?: MediaStream | null;
  faceVerificationStatus?: 'MATCH' | 'MISMATCH' | 'UNCERTAIN' | 'INCONCLUSIVE' | 'SCANNING' | 'no_face' | 'multiple_faces' | 'single_face';
  faceStatus?: string;
  similarityScore?: number;
  warningCount?: number;
  latestEvent?: {
    type: string;
    reason: string;
    source: 'automated' | 'manual';
    timestamp: string;
    severity?: string;
  };
  examDurationMinutes?: number;
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
const STORAGE_KEY_PROCTORING_PARTICIPANTS = 'venilearn_proctoring_participants_v3';
const STORAGE_KEY_PROCTORING_QUEUE_CACHE = 'venilearn_proctoring_queue_cache_v2';
const PROCTORING_BROADCAST_CHANNEL = 'venilearn_proctoring_sync_v2';

let proctoringBroadcastChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    proctoringBroadcastChannel = new BroadcastChannel(PROCTORING_BROADCAST_CHANNEL);
    proctoringBroadcastChannel.onmessage = (event) => {
      const data = event.data;
      if (!data) return;
      if (data.type === 'PARTICIPANTS_SYNC' && Array.isArray(data.participants)) {
        useProctoringStore.setState({ participants: data.participants });
      }
      if (data.type === 'SESSIONS_SYNC' && Array.isArray(data.sessions)) {
        useProctoringStore.setState({ sessions: data.sessions });
      }
      if (data.type === 'LIVE_FRAME' && data.learnerId && data.frame) {
        useProctoringStore.getState().setCandidateLiveFrame?.(data.learnerId, data.frame, data.audioLevel);
      }
      if (data.type === 'LIVE_VIDEO_CHUNK' && data.learnerId && data.videoUrl) {
        useProctoringStore.getState().setCandidateLiveVideoChunk?.(data.learnerId, data.videoUrl, data.audioLevel);
      }
    };
  } catch (err) {
    // Ignore BroadcastChannel errors in restricted sandboxes
  }
}

export function broadcastLiveFrame(learnerId: string, assessmentId: string, frame: string, audioLevel?: number) {
  try {
    proctoringBroadcastChannel?.postMessage({
      type: 'LIVE_FRAME',
      learnerId,
      assessmentId,
      frame,
      audioLevel,
    });
  } catch (e) {}
}

export function broadcastLiveVideoChunk(learnerId: string, assessmentId: string, videoUrl: string, audioLevel?: number) {
  try {
    proctoringBroadcastChannel?.postMessage({
      type: 'LIVE_VIDEO_CHUNK',
      learnerId,
      assessmentId,
      videoUrl,
      audioLevel,
    });
  } catch (e) {}
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY_PROCTORING_PARTICIPANTS && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        if (Array.isArray(parsed)) {
          useProctoringStore.setState({ participants: parsed });
        }
      } catch (err) {}
    }
    if (e.key === STORAGE_KEY_PROCTORING_SESSIONS && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        if (Array.isArray(parsed)) {
          useProctoringStore.setState({ sessions: parsed });
        }
      } catch (err) {}
    }
  });
}

function broadcastParticipants(participants: ProctorParticipant[]) {
  try {
    proctoringBroadcastChannel?.postMessage({ type: 'PARTICIPANTS_SYNC', participants });
  } catch (e) {}
}

function broadcastSessions(sessions: ProctoringSession[]) {
  try {
    proctoringBroadcastChannel?.postMessage({ type: 'SESSIONS_SYNC', sessions });
  } catch (e) {}
}

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

const initialParticipants: ProctorParticipant[] = [];

const initialWarnings: ProctorWarning[] = [];

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
      if (key === STORAGE_KEY_PROCTORING_PARTICIPANTS) {
        const now = Date.now();
        // Discard stale or ended candidate sessions entirely from live store
        return parsed.filter((p: any) => {
          if (p.status === 'submitted' || p.status === 'completed' || p.status === 'terminated' || p.status === 'disconnected') {
            return false;
          }
          const pingTime = new Date(p.lastPingAt || 0).getTime();
          const isFresh = !isNaN(pingTime) && pingTime > 0 && (now - pingTime) < 35000;
          return isFresh;
        }) as unknown as T;
      }
      if (key === STORAGE_KEY_PROCTORING_QUEUE_CACHE) {
        return (Array.isArray(parsed) ? parsed : fallback) as unknown as T;
      }
      if (key === STORAGE_KEY_PROCTORING_SESSIONS) {
        const now = Date.now();
        return parsed.filter((s: any) => {
          if (!s || s.id?.startsWith('psess-00')) return false;
          if (s.status === 'submitted' || s.status === 'completed' || s.status === 'terminated' || s.status === 'disconnected') {
            return false;
          }
          const latestEvTime = (s.events || []).reduce((max: number, ev: any) => {
            const t = (ev.createdAt || ev.timestamp) ? new Date(ev.createdAt || ev.timestamp).getTime() : (ev.clientTimestamp ? Number(ev.clientTimestamp) : 0);
            return t > max ? t : max;
          }, 0);
          const rawPing = latestEvTime > 0 ? latestEvTime : (s.lastPingAt ? new Date(s.lastPingAt).getTime() : (s.startedAt ? new Date(s.startedAt).getTime() : 0));
          const isFresh = !isNaN(rawPing) && rawPing > 0 && (now - rawPing) < 35000;
          return isFresh && s.status === 'in_progress';
        }) as unknown as T;
      }
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
  fetchAssessmentActiveSessions: (assessmentId: string) => Promise<void>;
  syncFromStorage: () => void;
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
  setCandidateLiveFrame: (learnerId: string, frame: string, audioLevel?: number) => void;
  setCandidateLiveVideoChunk: (learnerId: string, videoUrl: string, audioLevel?: number) => void;
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
  ) => Promise<void>;

  updatePolicy: (level: ProctoringPolicyLevel, updates: Partial<ProctoringPolicy>) => Promise<void>;
  clearAssessmentSessions: (assessmentId: string) => void;
  setCandidateRemoteStream: (learnerId: string, stream: MediaStream | null) => void;
  upsertLiveCandidate: (candidate: Partial<ProctorParticipant> & { id: string; name: string; assessmentId: string }) => void;
  removeLiveCandidate: (studentId: string, assessmentId?: string) => void;
  forceStopCandidateExam: (sessionId: string, studentId: string, assessmentId: string, reason: string) => Promise<void>;
  sendManualCandidateWarning: (sessionId: string, studentId: string, assessmentId: string, reason: string) => Promise<void>;
  fetchActiveCandidates: (assessmentId: string) => Promise<void>;

  // Real Database-Driven Proctoring Dashboard State
  dashboardStats: {
    totalSessions: number;
    sessionsWithSignals: number;
    pendingReviews: number;
    clearedSessions: number;
    acceptedTechnical: number;
    pendingAppeals: number;
  };
  isLoadingStats: boolean;
  isLoadingQueue: boolean;
  queueTotal: number;
  queuePage: number;
  appeals: any[];
  isLoadingAppeals: boolean;
  isSavingDecision: boolean;

  fetchStatistics: (assessmentId?: string) => Promise<void>;
  fetchQueueSessions: (params?: {
    search?: string;
    assessmentId?: string;
    severity?: string;
    status?: string;
    category?: string;
    page?: number;
    limit?: number;
  }) => Promise<void>;
  fetchPolicies: () => Promise<void>;
  fetchAppeals: (assessmentId?: string) => Promise<void>;
  reviewAppeal: (sessionId: string, decision: 'accepted' | 'rejected', notes?: string) => Promise<void>;
}

// Persistent module-level cache for candidate WebRTC remote video streams
const remoteStreamCache = new Map<string, MediaStream>();

export const useProctoringStore = create<ProctoringStoreState>((set, get) => ({
  dashboardStats: {
    totalSessions: 0,
    sessionsWithSignals: 0,
    pendingReviews: 0,
    clearedSessions: 0,
    acceptedTechnical: 0,
    pendingAppeals: 0,
  },
  isLoadingStats: false,
  isLoadingQueue: false,
  queueTotal: 0,
  queuePage: 1,
  appeals: [],
  isLoadingAppeals: false,
  isSavingDecision: false,

  fetchStatistics: async (assessmentId?: string) => {
    set({ isLoadingStats: true });
    try {
      const url = assessmentId && assessmentId !== 'all'
        ? `/proctoring/statistics?assessmentId=${encodeURIComponent(assessmentId)}`
        : '/proctoring/statistics';
      const res = await apiClient.get<any>(url);
      if (res && res.data) {
        set({
          dashboardStats: {
            totalSessions: Number(res.data.totalSessions || 0),
            sessionsWithSignals: Number(res.data.sessionsWithSignals || 0),
            pendingReviews: Number(res.data.pendingReviews || 0),
            clearedSessions: Number(res.data.clearedSessions || 0),
            acceptedTechnical: Number(res.data.acceptedTechnical || 0),
            pendingAppeals: Number(res.data.pendingAppeals || 0),
          },
        });
      }
    } catch (e) {
      console.warn('Failed to fetch proctoring statistics:', e);
    } finally {
      set({ isLoadingStats: false });
    }
  },

  fetchQueueSessions: async (params?: {
    search?: string;
    assessmentId?: string;
    severity?: string;
    status?: string;
    category?: string;
    page?: number;
    limit?: number;
  }) => {
    set({ isLoadingQueue: true });
    try {
      const queryParts: string[] = [];
      if (params?.search) queryParts.push(`search=${encodeURIComponent(params.search)}`);
      if (params?.assessmentId && params.assessmentId !== 'all') queryParts.push(`assessmentId=${encodeURIComponent(params.assessmentId)}`);
      if (params?.severity && params.severity !== 'all') queryParts.push(`severity=${encodeURIComponent(params.severity)}`);
      if (params?.status && params.status !== 'all') queryParts.push(`status=${encodeURIComponent(params.status)}`);
      if (params?.category && params.category !== 'all') queryParts.push(`category=${encodeURIComponent(params.category)}`);
      if (params?.page) queryParts.push(`page=${params.page}`);
      if (params?.limit) queryParts.push(`limit=${params.limit}`);

      const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
      const res = await apiClient.get<any>(`/proctoring/queue${queryString}`);

      if (res && res.data) {
        const rawList = Array.isArray(res.data) ? res.data : (res.data.sessions || []);
        const total = typeof res.data.total === 'number' ? res.data.total : rawList.length;
        const page = typeof res.data.page === 'number' ? res.data.page : (params?.page || 1);

        const mapped: ProctoringSession[] = rawList.map((raw: any) => {
          const learner = raw.attempt?.learner;
          const learnerName = learner
            ? `${learner.firstName || ''} ${learner.lastName || ''}`.trim() || learner.email
            : raw.learnerId;
          const assessmentTitle = raw.attempt?.assessment?.title || (raw.assessmentId ? `Assessment (${raw.assessmentId.slice(0, 8)})` : 'Proctored Assessment');

          const rawEvents = (raw.events || []).map((e: any) => ({
            id: e.id,
            sessionId: e.sessionId || raw.id,
            assessmentId: raw.assessmentId,
            learnerId: raw.learnerId,
            category: e.category,
            severity: e.severity || 'warning',
            title: e.title,
            description: e.description,
            timestamp: e.createdAt ? new Date(e.createdAt).toISOString() : new Date().toISOString(),
            clientTimestamp: Number(e.clientTimestamp || 0),
            relativeSeconds: e.relativeSeconds || 0,
            evidenceSnapshot: e.evidenceSnapshot,
            studentExplanation: e.studentExplanation,
          }));

          const rawIncidents = (raw.incidents || []).map((inc: any) => ({
            id: inc.id,
            sessionId: inc.sessionId || raw.id,
            attemptId: inc.attemptId || raw.attemptId || raw.id,
            assessmentId: raw.assessmentId,
            learnerId: inc.learnerId || raw.learnerId,
            eventType: inc.eventType,
            severity: inc.severity,
            description: inc.description,
            status: inc.status,
            reviewerId: inc.reviewerId,
            reviewerNotes: inc.reviewerNotes,
            decision: inc.decision,
            studentExplanation: inc.studentExplanation,
            createdAt: inc.createdAt ? new Date(inc.createdAt).toISOString() : new Date().toISOString(),
          }));

          // Merge incidents as signal events if they aren't already represented in events
          const incidentEvents = rawIncidents
            .filter((inc: any) => !rawEvents.some((e: any) => e.title === inc.eventType || e.category === (inc.eventType || '').toLowerCase()))
            .map((inc: any) => ({
              id: `inc-ev-${inc.id}`,
              sessionId: inc.sessionId || raw.id,
              assessmentId: raw.assessmentId,
              learnerId: inc.learnerId,
              category: (inc.eventType || 'incident').toLowerCase(),
              severity: (inc.severity as any) || 'critical',
              title: inc.eventType || 'Proctoring Incident',
              description: inc.description || 'Flagged security violation',
              timestamp: inc.createdAt,
              clientTimestamp: new Date(inc.createdAt).getTime() || Date.now(),
              relativeSeconds: 0,
              studentExplanation: inc.studentExplanation,
            }));

          const combinedEvents = [...rawEvents, ...incidentEvents];

          return {
            id: raw.id,
            attemptId: raw.attemptId || raw.id,
            assessmentId: raw.assessmentId,
            assessmentTitle,
            learnerId: raw.learnerId,
            learnerName: learnerName || 'Candidate',
            policy: raw.policy || DEFAULT_PROCTORING_POLICIES.monitored,
            status: raw.status || 'in_progress',
            startedAt: raw.startedAt ? new Date(raw.startedAt).toISOString() : new Date().toISOString(),
            endedAt: raw.endedAt ? new Date(raw.endedAt).toISOString() : undefined,
            totalDurationSeconds: raw.totalDurationSec || 0,
            activeScreenShare: raw.activeScreenShare ?? true,
            activeMic: raw.activeMic ?? true,
            activeWebcam: raw.activeWebcam ?? true,
            isFullscreen: raw.isFullscreen ?? true,
            isOnline: true,
            jitsiRoomName: raw.jitsiRoomName,
            recordingUrl: raw.recordingUrl,
            reviewOutcome: raw.reviewOutcome,
            appealExplanation: raw.appealExplanation,
            appealStatus: raw.appealStatus,
            reviewDecision: raw.reviewOutcome ? {
              reviewerId: 'faculty',
              reviewerName: 'Instructor',
              outcome: raw.reviewOutcome,
              explanation: raw.appealExplanation || 'Decision recorded',
              timestamp: raw.updatedAt ? new Date(raw.updatedAt).toISOString() : new Date().toISOString(),
            } : undefined,
            studentAppeal: raw.appealExplanation ? {
              appealId: `app-${raw.id}`,
              explanation: raw.appealExplanation,
              submittedAt: raw.updatedAt ? new Date(raw.updatedAt).toISOString() : new Date().toISOString(),
              status: (raw.appealStatus as any) || 'pending',
            } : undefined,
            events: combinedEvents,
            warnings: (raw.warnings || []).map((w: any) => ({
              id: w.id,
              sessionId: w.sessionId || raw.id,
              warningNumber: 1,
              reason: w.message,
              severity: 'warning' as const,
              timestamp: w.createdAt ? new Date(w.createdAt).toISOString() : new Date().toISOString(),
              acknowledged: Boolean(w.acknowledged),
            })),
            incidents: rawIncidents,
          };
        });

        set({
          sessions: mapped,
          queueTotal: total,
          queuePage: page,
        });

        // Safely cache a lightweight version without base64 strings to prevent localStorage QuotaExceededError
        const storageCleaned = mapped.map((s) => ({
          ...s,
          events: s.events.map((e) => ({
            ...e,
            evidenceSnapshot:
              e.evidenceSnapshot && e.evidenceSnapshot.startsWith('data:') ? undefined : e.evidenceSnapshot,
          })),
        }));
        saveToStorage(STORAGE_KEY_PROCTORING_QUEUE_CACHE, storageCleaned);
        saveToStorage(STORAGE_KEY_PROCTORING_SESSIONS, storageCleaned);
      }
    } catch (e) {
      console.warn('Failed to fetch proctoring queue sessions:', e);
    } finally {
      set({ isLoadingQueue: false });
    }
  },

  fetchPolicies: async () => {
    try {
      const res = await apiClient.get<any[]>('/proctoring/policies');
      if (res && res.data && Array.isArray(res.data) && res.data.length > 0) {
        const policyMap = { ...DEFAULT_PROCTORING_POLICIES };
        res.data.forEach((p: any) => {
          const lvl = p.level as ProctoringPolicyLevel;
          if (lvl && policyMap[lvl]) {
            policyMap[lvl] = {
              ...policyMap[lvl],
              id: p.id,
              name: p.name,
              level: lvl,
              description: p.description || policyMap[lvl].description,
              requireScreenShare: p.requireScreenShare ?? true,
              requireMicrophone: p.requireMicrophone ?? true,
              requireWebcam: p.requireWebcam ?? true,
              requireFullscreen: p.requireFullscreen ?? true,
              pauseOnScreenShareLoss: p.pauseOnScreenShareLoss ?? true,
              pauseOnTabSwitch: p.pauseOnTabSwitch ?? true,
              pauseOnNetworkLoss: p.pauseOnNetworkLoss ?? true,
              retentionDays: p.retentionDays || 30,
            };
          }
        });
        set({ policies: policyMap });
        saveToStorage(STORAGE_KEY_PROCTORING_POLICIES, policyMap);
      }
    } catch (e) {
      console.warn('Failed to fetch proctoring policies:', e);
    }
  },

  fetchAppeals: async (assessmentId?: string) => {
    set({ isLoadingAppeals: true });
    try {
      const url = assessmentId && assessmentId !== 'all'
        ? `/proctoring/appeals?assessmentId=${encodeURIComponent(assessmentId)}`
        : '/proctoring/appeals';
      const res = await apiClient.get<any[]>(url);
      if (res && res.data && Array.isArray(res.data)) {
        set({ appeals: res.data });
      }
    } catch (e) {
      console.warn('Failed to fetch proctoring appeals:', e);
    } finally {
      set({ isLoadingAppeals: false });
    }
  },

  reviewAppeal: async (sessionId: string, decision: 'accepted' | 'rejected', notes?: string) => {
    try {
      await apiClient.post(`/proctoring/appeals/${sessionId}/decision`, { decision, notes });
      await get().fetchAppeals();
      await get().fetchStatistics();
      await get().fetchQueueSessions();
    } catch (e) {
      console.warn('Failed to review appeal:', e);
    }
  },
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

  fetchAssessmentActiveSessions: async (assessmentId: string) => {
    if (!assessmentId) return;
    try {
      const res = await apiClient.get<any[]>(`/proctoring/assessments/${assessmentId}/active-sessions`);
      if (res && res.data && Array.isArray(res.data)) {
        set((state) => {
          const now = Date.now();
          const fetchedSessions: ProctoringSession[] = res.data.map((raw: any) => {
            const learner = raw.attempt?.learner;
            const learnerName = learner
              ? `${learner.firstName || ''} ${learner.lastName || ''}`.trim() || learner.email
              : raw.learnerId;
            return {
              id: raw.id,
              attemptId: raw.attemptId || raw.id,
              assessmentId: raw.assessmentId,
              assessmentTitle: raw.attempt?.assessment?.title || 'Live Proctored Examination',
              learnerId: raw.learnerId,
              learnerName: learnerName || 'Candidate',
              policy: raw.policy || state.policies?.monitored || DEFAULT_PROCTORING_POLICIES.monitored,
              status: raw.status || 'in_progress',
              startedAt: raw.startedAt ? new Date(raw.startedAt).toISOString() : '',
              endedAt: raw.endedAt ? new Date(raw.endedAt).toISOString() : undefined,
              totalDurationSeconds: raw.totalDurationSec || 0,
              activeWebcam: raw.activeWebcam ?? true,
              activeMic: raw.activeMic ?? true,
              activeScreenShare: raw.activeScreenShare ?? false,
              isFullscreen: raw.isFullscreen ?? true,
              isOnline: true,
              events: (raw.events || []).map((e: any) => ({
                id: e.id,
                sessionId: e.sessionId,
                category: e.category,
                severity: e.severity,
                title: e.title,
                description: e.description,
                timestamp: e.createdAt ? new Date(e.createdAt).toISOString() : '',
                clientTimestamp: Number(e.clientTimestamp || 0),
                relativeSeconds: e.relativeSeconds || 0,
                evidenceSnapshot: e.evidenceSnapshot,
              })),
            };
          });

          // Keep other assessment sessions intact, and filter for only genuinely fresh sessions for this assessment
          const otherSessions = state.sessions.filter((s) => s.assessmentId !== assessmentId);
          const genuinelyActiveSessions: ProctoringSession[] = [];

          fetchedSessions.forEach((fs) => {
            const latestEvTime = (fs.events || []).reduce((max: number, ev: any) => {
              const t = (ev.createdAt || ev.timestamp) ? new Date(ev.createdAt || ev.timestamp).getTime() : (ev.clientTimestamp ? Number(ev.clientTimestamp) : 0);
              return t > max ? t : max;
            }, 0);
            const startedMs = fs.startedAt ? new Date(fs.startedAt).getTime() : 0;
            const rawPing = latestEvTime > 0 ? latestEvTime : startedMs;
            const isFresh = fs.status === 'in_progress' && !fs.endedAt && rawPing > 0 && (now - rawPing) < 35000;

            if (isFresh) {
              genuinelyActiveSessions.push({
                ...fs,
                status: 'in_progress',
                isOnline: true,
              });
            }
          });

          const mergedSessions = [...otherSessions, ...genuinelyActiveSessions];

          // Reconcile participants: remove stale participants for this assessment
          const otherParticipants = state.participants.filter((p) => p.assessmentId !== assessmentId);
          const activeParticipants: ProctorParticipant[] = [];

          genuinelyActiveSessions.forEach((fs) => {
            const latestSnapshot = (fs.events || []).find(
              (e: any) => e.evidenceSnapshot && typeof e.evidenceSnapshot === 'string' && e.evidenceSnapshot.startsWith('data:image')
            )?.evidenceSnapshot;
            const existingP = state.participants.find(
              (p) => p.assessmentId === assessmentId && (p.id === fs.learnerId || (p.name && fs.learnerName && p.name.trim().toLowerCase() === fs.learnerName.trim().toLowerCase()))
            );

            activeParticipants.push({
              id: fs.learnerId,
              name: fs.learnerName,
              rollNo: (fs as any).rollNo || getShortNumericId(fs.learnerId),
              assessmentId: fs.assessmentId,
              status: 'connected',
              cameraActive: fs.activeWebcam ?? true,
              micActive: fs.activeMic ?? true,
              audioLevel: 0.2,
              screenShareActive: fs.activeScreenShare ?? false,
              tabFocused: fs.isFullscreen ?? true,
              faceDetected: fs.activeWebcam ?? true,
              joinedAt: fs.startedAt,
              lastPingAt: existingP?.lastPingAt || new Date().toISOString(),
              activeWarningCount: 0,
              latestSnapshot: latestSnapshot || existingP?.latestSnapshot,
              sessionId: fs.id,
            });
          });

          const mergedParticipants = [...otherParticipants, ...activeParticipants];

          saveToStorage(STORAGE_KEY_PROCTORING_SESSIONS, mergedSessions);
          saveToStorage(STORAGE_KEY_PROCTORING_PARTICIPANTS, mergedParticipants);
          return { sessions: mergedSessions, participants: mergedParticipants };
        });
      }
    } catch (e) {
      // Graceful fallback for offline / test environments
    }
  },

  syncFromStorage: () => {
    try {
      const localSessions = loadFromStorage<ProctoringSession[]>(STORAGE_KEY_PROCTORING_SESSIONS, []);
      const localParticipants = loadFromStorage<ProctorParticipant[]>(STORAGE_KEY_PROCTORING_PARTICIPANTS, []);
      const now = Date.now();

      // Prune participants whose heartbeat expired (> 60 seconds)
      const freshParticipants = localParticipants.map((p) => {
        const pingTime = new Date(p.lastPingAt || 0).getTime();
        const isFresh = !isNaN(pingTime) && pingTime > 0 && (now - pingTime) < 60000;
        if (!isFresh && (p.status === 'connected' || p.cameraActive)) {
          return { ...p, status: 'disconnected' as const, cameraActive: false, micActive: false };
        }
        return p;
      });

      set((state) => {
        let changed = false;
        const newSessions = [...state.sessions];
        localSessions.forEach((ls) => {
          const idx = newSessions.findIndex((s) => s.id === ls.id);
          if (idx >= 0) {
            newSessions[idx] = { ...newSessions[idx], ...ls };
          } else {
            newSessions.unshift(ls);
            changed = true;
          }
        });

        const newParticipants = [...state.participants];
        freshParticipants.forEach((lp) => {
          const idx = newParticipants.findIndex((p) => p.id === lp.id);
          if (idx >= 0) {
            newParticipants[idx] = {
              ...newParticipants[idx],
              ...lp,
              latestSnapshot: lp.latestSnapshot || newParticipants[idx].latestSnapshot,
            };
          } else {
            newParticipants.unshift(lp);
            changed = true;
          }
        });

        const sanitizedParticipants = newParticipants.map((p) => {
          const pingTime = new Date(p.lastPingAt || 0).getTime();
          const isFresh = !isNaN(pingTime) && pingTime > 0 && (now - pingTime) < 60000;
          if (!isFresh && (p.status === 'connected' || p.cameraActive)) {
            changed = true;
            return { ...p, status: 'disconnected' as const, cameraActive: false, micActive: false };
          }
          return p;
        });

        if (changed || newSessions.length !== state.sessions.length || sanitizedParticipants.length !== state.participants.length) {
          return { sessions: newSessions, participants: sanitizedParticipants };
        }
        return state;
      });
    } catch (e) {}
  },
  // Real-time Jitsi Initial State
  incidents: [],
  warnings: initialWarnings,
  auditLogs: initialAuditLogs,
  participants: loadFromStorage<ProctorParticipant[]>(STORAGE_KEY_PROCTORING_PARTICIPANTS, initialParticipants),
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
    set((state) => {
      const exists = state.participants.some((p) => p.id === participantId);
      let updatedParticipants: ProctorParticipant[];
      if (exists) {
        updatedParticipants = state.participants.map((p) => {
          if (p.id === participantId) {
            return {
              ...p,
              ...telemetry,
              latestSnapshot: telemetry.latestSnapshot || p.latestSnapshot,
              lastPingAt: new Date().toISOString(),
            };
          }
          return p;
        });
      } else {
        const newP: ProctorParticipant = {
          id: participantId,
          name: (telemetry as any).name || 'Student Candidate',
          rollNo: (telemetry as any).rollNo || getShortNumericId(participantId),
          assessmentId: (telemetry as any).assessmentId || 'asm-001',
          status: 'connected',
          cameraActive: telemetry.cameraActive ?? true,
          micActive: telemetry.micActive ?? true,
          audioLevel: telemetry.audioLevel ?? 0.1,
          screenShareActive: telemetry.screenShareActive ?? false,
          tabFocused: telemetry.tabFocused ?? true,
          faceDetected: telemetry.faceDetected ?? true,
          joinedAt: new Date().toISOString(),
          lastPingAt: new Date().toISOString(),
          activeWarningCount: 0,
          ...telemetry,
        };
        updatedParticipants = [newP, ...state.participants];
      }
      saveToStorage(STORAGE_KEY_PROCTORING_PARTICIPANTS, updatedParticipants);
      broadcastParticipants(updatedParticipants);
      return { participants: updatedParticipants };
    });
  },

  setCandidateLiveFrame: (learnerId: string, frame: string, audioLevel?: number) => {
    set((state) => {
      const idx = state.participants.findIndex((p) => p.id === learnerId);
      if (idx >= 0) {
        const currentP = state.participants[idx];
        if (currentP.latestSnapshot === frame && (audioLevel === undefined || currentP.audioLevel === audioLevel)) {
          return state;
        }
        const updated = [...state.participants];
        updated[idx] = {
          ...currentP,
          latestSnapshot: frame,
          audioLevel: audioLevel !== undefined ? audioLevel : currentP.audioLevel,
          cameraActive: true,
          status: 'connected',
          lastPingAt: new Date().toISOString(),
        };
        return { participants: updated };
      }
      return state;
    });
  },

  setCandidateLiveVideoChunk: (learnerId: string, videoUrl: string, audioLevel?: number) => {
    set((state) => {
      const idx = state.participants.findIndex((p) => p.id === learnerId);
      if (idx >= 0) {
        const currentP = state.participants[idx];
        const updated = [...state.participants];
        updated[idx] = {
          ...currentP,
          latestVideoUrl: videoUrl,
          audioLevel: audioLevel !== undefined ? audioLevel : currentP.audioLevel,
          cameraActive: true,
          status: 'connected',
          lastPingAt: new Date().toISOString(),
        };
        return { participants: updated };
      }
      return state;
    });
  },

  setCandidateRemoteStream: (learnerId: string, stream: MediaStream | null) => {
    const key = learnerId.toLowerCase();
    if (stream) {
      remoteStreamCache.set(key, stream);
    } else {
      remoteStreamCache.delete(key);
    }
    set((state) => {
      const idx = state.participants.findIndex((p) => {
        const pId = p.id.toLowerCase();
        const pRoll = (p.rollNo || '').toLowerCase();
        return (
          pId === key ||
          pRoll === key ||
          (pId.length > 4 && key.includes(pId)) ||
          (key.length > 4 && pId.includes(key)) ||
          (pRoll.length > 4 && key.includes(pRoll)) ||
          (key.length > 4 && pRoll.includes(key))
        );
      });
      if (idx >= 0) {
        const updated = [...state.participants];
        updated[idx] = {
          ...updated[idx],
          remoteStream: stream,
          cameraActive: Boolean(stream),
          status: stream ? 'connected' : updated[idx].status,
        };
        return { participants: updated };
      }
      return state;
    });
  },

  upsertLiveCandidate: (candidate) => {
    set((state) => {
      const key = candidate.id.toLowerCase();
      const rollKey = (candidate.rollNo || '').toLowerCase();
      const idx = state.participants.findIndex((p) => {
        const pId = p.id.toLowerCase();
        const pRoll = (p.rollNo || '').toLowerCase();
        const idMatches =
          pId === key ||
          pRoll === key ||
          (rollKey && (pId === rollKey || pRoll === rollKey)) ||
          (pId.length > 4 && key.includes(pId)) ||
          (key.length > 4 && pId.includes(key));
        return idMatches && (!candidate.assessmentId || p.assessmentId === candidate.assessmentId);
      });

      const cachedStream =
        candidate.remoteStream ||
        remoteStreamCache.get(key) ||
        (rollKey ? remoteStreamCache.get(rollKey) : null) ||
        proctoringSocket.getRemoteStream(candidate.id) ||
        (candidate.rollNo ? proctoringSocket.getRemoteStream(candidate.rollNo) : null) ||
        null;

      if (idx >= 0) {
        const updated = [...state.participants];
        const prev = updated[idx];
        const effectiveStream = candidate.remoteStream !== undefined ? candidate.remoteStream : (prev.remoteStream || cachedStream);
        if (effectiveStream) {
          remoteStreamCache.set(key, effectiveStream);
          if (rollKey) remoteStreamCache.set(rollKey, effectiveStream);
        }
        updated[idx] = {
          ...prev,
          ...candidate,
          status: candidate.status || prev.status,
          remoteStream: effectiveStream,
          cameraActive: effectiveStream ? true : (candidate.cameraActive ?? prev.cameraActive),
          lastPingAt: candidate.lastPingAt || new Date().toISOString(),
        };
        return { participants: updated };
      } else {
        if (cachedStream) {
          remoteStreamCache.set(key, cachedStream);
          if (rollKey) remoteStreamCache.set(rollKey, cachedStream);
        }
        const fullCandidate: ProctorParticipant = {
          id: candidate.id,
          name: candidate.name,
          rollNo: candidate.rollNo || getShortNumericId(candidate.id),
          assessmentId: candidate.assessmentId,
          status: candidate.status || 'connected',
          cameraActive: cachedStream ? true : (candidate.cameraActive ?? true),
          micActive: candidate.micActive ?? true,
          audioLevel: candidate.audioLevel || 0.15,
          screenShareActive: candidate.screenShareActive || false,
          tabFocused: candidate.tabFocused ?? true,
          faceDetected: candidate.faceDetected ?? true,
          joinedAt: candidate.joinedAt || new Date().toISOString(),
          lastPingAt: candidate.lastPingAt || new Date().toISOString(),
          activeWarningCount: candidate.activeWarningCount || 0,
          remoteStream: cachedStream,
          faceVerificationStatus: candidate.faceVerificationStatus || 'SCANNING',
          latestEvent: candidate.latestEvent,
          latestSnapshot: candidate.latestSnapshot,
          sessionId: candidate.sessionId,
        };
        return { participants: [fullCandidate, ...state.participants] };
      }
    });
  },

  forceStopCandidateExam: async (sessionId: string, studentId: string, assessmentId: string, reason: string) => {
    try {
      await apiClient.post(`/proctoring/sessions/${sessionId}/force-stop`, {
        reason,
        studentId,
        examId: assessmentId,
      });
    } catch (e) {
      console.warn('API force-stop notice:', e);
    }
    set((state) => ({
      participants: state.participants.map((p) =>
        p.id === studentId
          ? {
              ...p,
              status: 'terminated' as const,
              cameraActive: false,
              micActive: false,
              latestEvent: {
                type: 'EXAM_TERMINATED',
                reason,
                source: 'manual',
                timestamp: new Date().toISOString(),
                severity: 'critical',
              },
            }
          : p
      ),
    }));
  },

  sendManualCandidateWarning: async (sessionId: string, studentId: string, assessmentId: string, reason: string) => {
    try {
      await apiClient.post(`/proctoring/sessions/${sessionId}/manual-warning`, {
        reason,
        learnerId: studentId,
        assessmentId,
      });
    } catch (e) {
      console.warn('API manual warning notice:', e);
    }
    set((state) => ({
      participants: state.participants.map((p) =>
        p.id === studentId
          ? {
              ...p,
              activeWarningCount: p.activeWarningCount + 1,
              latestEvent: {
                type: 'MANUAL_WARNING',
                reason,
                source: 'manual',
                timestamp: new Date().toISOString(),
                severity: 'warning',
              },
            }
          : p
      ),
    }));
  },

  removeLiveCandidate: (studentId: string, assessmentId?: string) => {
    set((state) => {
      const target = (studentId || '').trim().toLowerCase();
      const filteredP = state.participants.filter((p) => {
        const matchesId = p.id?.trim().toLowerCase() === target;
        const matchesName = p.name && p.name.trim().toLowerCase() === target;
        if (matchesId || matchesName) {
          if (p.status === 'terminated') return true;
          if (!assessmentId || p.assessmentId === assessmentId) return false;
        }
        return true;
      });
      const filteredS = state.sessions.filter((s) => {
        const matchesId = s.learnerId?.trim().toLowerCase() === target;
        const matchesName = s.learnerName && s.learnerName.trim().toLowerCase() === target;
        if (matchesId || matchesName) {
          if (!assessmentId || s.assessmentId === assessmentId) return false;
        }
        return true;
      });
      saveToStorage(STORAGE_KEY_PROCTORING_PARTICIPANTS, filteredP);
      saveToStorage(STORAGE_KEY_PROCTORING_SESSIONS, filteredS);
      broadcastParticipants(filteredP);
      return { participants: filteredP, sessions: filteredS };
    });
  },

  fetchActiveCandidates: async (assessmentId: string) => {
    try {
      const res = await apiClient.get<any[]>(`/proctoring/assessments/${assessmentId}/live-candidates`);
      const now = Date.now();
      if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
        const activeIds = new Set(res.data.map((c: any) => (c.studentId || c.id || '').toLowerCase()));
        set((state) => {
          // Never purge participants who have an active WebRTC remoteStream or recent activity (< 60s)
          const retainedParticipants = state.participants.filter((p) => {
            if (p.assessmentId !== assessmentId) return true;
            if (activeIds.has(p.id.toLowerCase())) return true;
            if (p.status === 'submitted' || p.status === 'terminated' || p.status === 'completed') return false;
            if (p.remoteStream && p.remoteStream.getVideoTracks().some((t) => t.readyState === 'live')) return true;
            const lastPing = new Date(p.lastPingAt || 0).getTime();
            if (!isNaN(lastPing) && (now - lastPing) < 60000) return true;
            return false;
          });

          saveToStorage(STORAGE_KEY_PROCTORING_PARTICIPANTS, retainedParticipants);
          return { participants: retainedParticipants };
        });

        res.data.forEach((c: any) => {
          const studentId = c.studentId || c.id;
          const cachedStream = remoteStreamCache.get((studentId || '').toLowerCase()) || proctoringSocket.getRemoteStream(studentId);
          get().upsertLiveCandidate({
            id: studentId,
            name: c.studentName || c.name,
            rollNo: c.rollNo,
            assessmentId: c.examId || assessmentId,
            sessionId: c.sessionId,
            status: c.status,
            cameraActive: cachedStream ? true : c.cameraActive,
            micActive: c.micActive,
            audioLevel: c.audioLevel,
            remoteStream: cachedStream || undefined,
            faceVerificationStatus: c.faceStatus || c.faceVerificationStatus,
            faceStatus: c.faceStatus || c.faceVerificationStatus,
            activeWarningCount: c.warningCount || c.activeWarningCount,
            warningCount: c.warningCount || c.activeWarningCount,
            latestEvent: c.latestEvent,
            latestSnapshot: c.latestSnapshot,
            joinedAt: c.joinedAt,
            lastPingAt: c.lastPingAt,
          });
        });
      } else if (res?.data && Array.isArray(res.data) && res.data.length === 0) {
        // Backend returned empty array: only clear candidates that are truly timed out (> 60s) or terminated
        set((state) => {
          const retainedParticipants = state.participants.filter((p) => {
            if (p.assessmentId !== assessmentId) return true;
            if (p.status === 'submitted' || p.status === 'terminated' || p.status === 'completed') return false;
            if (p.remoteStream && p.remoteStream.getVideoTracks().some((t) => t.readyState === 'live')) return true;
            const lastPing = new Date(p.lastPingAt || 0).getTime();
            if (!isNaN(lastPing) && (now - lastPing) < 60000) return true;
            return false;
          });
          saveToStorage(STORAGE_KEY_PROCTORING_PARTICIPANTS, retainedParticipants);
          return { participants: retainedParticipants };
        });
      }
    } catch (e) {}
  },

  resetToDefaults: () => {
    set({
      incidents: [],
      warnings: initialWarnings,
      auditLogs: initialAuditLogs,
      participants: initialParticipants,
      activeExamSessionId: 'asm-001',
    });
    saveToStorage(STORAGE_KEY_PROCTORING_PARTICIPANTS, initialParticipants);
    broadcastParticipants(initialParticipants);
  },

  // VeniGuard Sessions & Policies Initial State
  sessions: loadFromStorage<ProctoringSession[]>(STORAGE_KEY_PROCTORING_QUEUE_CACHE, loadFromStorage<ProctoringSession[]>(STORAGE_KEY_PROCTORING_SESSIONS, SEED_SESSIONS)),
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
    return get().sessions.filter((s) => s.learnerId?.toLowerCase() === learnerId?.toLowerCase() || (s as any).userId?.toLowerCase() === learnerId?.toLowerCase());
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
      status: 'in_progress',
      startedAt: new Date().toISOString(),
      activeScreenShare: false,
      activeMic: true,
      activeWebcam: true,
      isFullscreen: true,
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
          description: `VeniGuard ${policy.name} pre-flight checks verified. Exam session started.`,
        },
      ],
    };

    const newParticipant: ProctorParticipant = {
      id: learnerId,
      name: learnerName,
      rollNo: getShortNumericId(learnerId),
      assessmentId,
      status: 'connected',
      cameraActive: true,
      micActive: true,
      audioLevel: 0.15,
      screenShareActive: false,
      tabFocused: true,
      faceDetected: true,
      joinedAt: new Date().toISOString(),
      lastPingAt: new Date().toISOString(),
      activeWarningCount: 0,
    };

    set((state) => {
      const nextSessions = [newSession, ...state.sessions.filter((s) => s.id !== newSessionId)];
      saveToStorage(STORAGE_KEY_PROCTORING_SESSIONS, nextSessions);
      broadcastSessions(nextSessions);

      const existingIndex = state.participants.findIndex(
        (p) => p.id === learnerId && p.assessmentId === assessmentId
      );
      let nextParticipants: ProctorParticipant[];
      if (existingIndex >= 0) {
        nextParticipants = state.participants.map((p, idx) =>
          idx === existingIndex ? { ...p, ...newParticipant } : p
        );
      } else {
        nextParticipants = [newParticipant, ...state.participants];
      }
      saveToStorage(STORAGE_KEY_PROCTORING_PARTICIPANTS, nextParticipants);
      broadcastParticipants(nextParticipants);

      return {
        sessions: nextSessions,
        participants: nextParticipants,
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
      broadcastSessions(nextSessions);
      return { sessions: nextSessions };
    });
  },

  updateChecklistState: (sessionId, updates) => {
    set((state) => {
      const session = state.sessions.find((s) => s.id === sessionId);
      const nextSessions = state.sessions.map((s) => (s.id === sessionId ? { ...s, ...updates } : s));
      saveToStorage(STORAGE_KEY_PROCTORING_SESSIONS, nextSessions);
      broadcastSessions(nextSessions);

      let nextParticipants = state.participants;
      if (session) {
        nextParticipants = state.participants.map((p) => {
          if (p.id === session.learnerId && (!p.assessmentId || p.assessmentId === session.assessmentId)) {
            return {
              ...p,
              cameraActive: updates.activeWebcam !== undefined ? updates.activeWebcam : p.cameraActive,
              micActive: updates.activeMic !== undefined ? updates.activeMic : p.micActive,
              screenShareActive: updates.activeScreenShare !== undefined ? updates.activeScreenShare : p.screenShareActive,
              tabFocused: updates.isFullscreen !== undefined ? updates.isFullscreen : p.tabFocused,
              lastPingAt: new Date().toISOString(),
            };
          }
          return p;
        });
        saveToStorage(STORAGE_KEY_PROCTORING_PARTICIPANTS, nextParticipants);
        broadcastParticipants(nextParticipants);
      }

      return { sessions: nextSessions, participants: nextParticipants };
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
    if (eventId && eventId.length === 36) {
      apiClient.post(`/proctoring/events/${eventId}/explanation`, { explanation }).catch(() => {});
    }
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
    if (sessionId && sessionId.length === 36) {
      apiClient.post(`/proctoring/sessions/${sessionId}/appeal`, { explanation }).catch(() => {});
    }
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

  submitInstructorDecision: async (sessionId, decision) => {
    set({ isSavingDecision: true });
    try {
      if (sessionId && sessionId.length === 36) {
        await apiClient.post(`/proctoring/sessions/${sessionId}/decision`, {
          outcome: decision.outcome,
          notes: decision.explanation,
        });
      }
    } catch (apiErr) {
      console.warn('Backend decision registration notice:', apiErr);
    } finally {
      set({ isSavingDecision: false });
    }

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

    // Refresh real database metrics
    get().fetchStatistics().catch(() => {});
  },

  updatePolicy: async (level, updates) => {
    try {
      const targetPolicy = get().policies[level];
      const targetId = targetPolicy?.id || level;
      await apiClient.patch(`/proctoring/policies/${targetId}`, updates);
    } catch (policyErr) {
      console.warn('Backend policy update notice:', policyErr);
    }

    set((state) => {
      const currentPolicy = state.policies[level];
      const updatedPolicy = { ...currentPolicy, ...updates };
      const nextPolicies = { ...state.policies, [level]: updatedPolicy };
      saveToStorage(STORAGE_KEY_PROCTORING_POLICIES, nextPolicies);
      return { policies: nextPolicies };
    });
  },

  clearAssessmentSessions: (assessmentId: string) => {
    set((state) => {
      const nextSessions = state.sessions.filter((s) => s.assessmentId !== assessmentId);
      const nextParticipants = state.participants.filter((p) => p.assessmentId !== assessmentId);
      saveToStorage(STORAGE_KEY_PROCTORING_SESSIONS, nextSessions);
      saveToStorage(STORAGE_KEY_PROCTORING_PARTICIPANTS, nextParticipants);
      return { sessions: nextSessions, participants: nextParticipants };
    });
  },
}));
