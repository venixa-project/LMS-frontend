import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ProctoringIncident, ProctorWarning, ProctoringMode, ProctoringSettings } from '../types';
import { mockProctoringIncidents } from '../data/mockData';

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

interface ProctoringStoreState {
  incidents: ProctoringIncident[];
  warnings: ProctorWarning[];
  auditLogs: ProctorAuditRecord[];
  participants: ProctorParticipant[];
  activeExamSessionId: string | null;

  // Actions
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
}

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

export const useProctoringStore = create<ProctoringStoreState>()(
  persist(
    (set, get) => ({
      incidents: mockProctoringIncidents,
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
          incidents: mockProctoringIncidents,
          warnings: initialWarnings,
          auditLogs: initialAuditLogs,
          participants: initialParticipants,
          activeExamSessionId: 'asm-001',
        });
      },
    }),
    {
      name: 'venilearn-proctoring-store',
      partialize: (state) => ({
        incidents: state.incidents,
        warnings: state.warnings,
        auditLogs: state.auditLogs,
        participants: state.participants,
      }),
    }
  )
);
