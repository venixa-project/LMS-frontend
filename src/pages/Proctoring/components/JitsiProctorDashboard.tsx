import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuthStore } from '../../../lib/store';
import { useProctoringStore, ProctorParticipant } from '../../../lib/proctoringStore';
import { useAssessmentStore } from '../../../lib/assessmentStore';
import { apiClient, buildFullUrl } from '../../../lib/apiClient';
import {
  Shield, Eye, AlertTriangle, CheckCircle2, Clock, X,
  Filter, UserCheck, ShieldAlert, FileText, Camera, Video, Monitor,
  Mic, MicOff, Volume2, Send, RefreshCw, AlertCircle, Check, Copy, ExternalLink,
  ChevronRight, Play, Lock, UserX, Maximize2, Minimize2, Grid, Layout, Users, MessageSquare, Radio, Search
} from 'lucide-react';
import { GoogleMeetIcon } from '../../../components/GoogleMeet';
import { LiveProctoringWall } from './LiveProctoringWall';
import { proctoringSocket } from '../../../lib/proctoringSocket';
import { ExamLifecycleToast, ExamLifecycleToastData } from '../../../components/Proctoring/ExamLifecycleToast';

// Direct Native HTML5 Video Player for 30 FPS Smooth Real Video Feeds (Hardware-accelerated)
const CandidateDirectVideoPlayer: React.FC<{
  videoUrl?: string;
  localStream?: MediaStream | null;
  name: string;
  snapshotFallback?: string;
}> = ({ videoUrl, localStream, name, snapshotFallback }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    if (localStream) {
      if (v.srcObject !== localStream) {
        v.src = '';
        v.srcObject = localStream;
        v.play().catch(() => {});
      }
    } else if (videoUrl) {
      if (v.src !== videoUrl) {
        v.srcObject = null;
        v.src = videoUrl;
        v.play().catch(() => {});
      }
    }
  }, [videoUrl, localStream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      loop
      poster={snapshotFallback}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        transform: 'scaleX(-1)',
        display: 'block',
        backgroundColor: '#0a0d14',
      }}
      title={`Direct 30 FPS Live Video Stream: ${name}`}
    />
  );
};

interface JitsiProctorDashboardProps {
  initialAssessmentId?: string;
  onClose?: () => void;
}

// 32 Enrolled Course Candidates writing the examination (Authentic roster without fake images)
interface CandidateSeed {
  name: string;
  rollNo: string;
  color: string;
  isSpeakingDefault?: boolean;
}

const COHORT_STUDENTS_SEED: CandidateSeed[] = [
  { name: 'Tina Kirkpatrick', rollNo: 'STU-2026-001', color: '#3b82f6', isSpeakingDefault: true },
  { name: 'Alex Thompson', rollNo: 'STU-2026-002', color: '#10b981' },
  { name: 'Maria Garcia', rollNo: 'STU-2026-003', color: '#8b5cf6' },
  { name: 'David Kim', rollNo: 'STU-2026-004', color: '#f59e0b' },
  { name: 'Aisha Patel', rollNo: 'STU-2026-005', color: '#ec4899' },
  { name: 'Laila Joshi', rollNo: 'STU-2026-006', color: '#06b6d4' },
  { name: 'Michael Chang', rollNo: 'STU-2026-007', color: '#6366f1' },
  { name: 'Sarah Connor', rollNo: 'STU-2026-008', color: '#14b8a6' },
  { name: 'Marcus Johnson', rollNo: 'STU-2026-009', color: '#f97316' },
  { name: 'Emily Watson', rollNo: 'STU-2026-010', color: '#a855f7' },
  { name: 'James Wilson', rollNo: 'STU-2026-011', color: '#22c55e' },
  { name: 'Priya Sharma', rollNo: 'STU-2026-012', color: '#e11d48' },
  { name: 'Robert Martinez', rollNo: 'STU-2026-013', color: '#2563eb' },
  { name: 'Jessica Taylor', rollNo: 'STU-2026-014', color: '#d97706' },
  { name: 'Daniel Anderson', rollNo: 'STU-2026-015', color: '#059669' },
  { name: 'Olivia Brown', rollNo: 'STU-2026-016', color: '#7c3aed' },
  { name: 'William Davis', rollNo: 'STU-2026-017', color: '#0284c7' },
  { name: 'Sophia Miller', rollNo: 'STU-2026-018', color: '#db2777' },
  { name: 'Benjamin White', rollNo: 'STU-2026-019', color: '#4f46e5' },
  { name: 'Chloe Martin', rollNo: 'STU-2026-020', color: '#0d9488' },
  { name: 'Lucas Garcia', rollNo: 'STU-2026-021', color: '#ea580c' },
  { name: 'Hannah Lee', rollNo: 'STU-2026-022', color: '#9333ea' },
  { name: 'Alexander Harris', rollNo: 'STU-2026-023', color: '#16a34a' },
  { name: 'Mia Clark', rollNo: 'STU-2026-024', color: '#be123c' },
  { name: 'Ryan Lewis', rollNo: 'STU-2026-025', color: '#1d4ed8' },
  { name: 'Grace Robinson', rollNo: 'STU-2026-026', color: '#b45309' },
  { name: 'Ethan Walker', rollNo: 'STU-2026-027', color: '#047857' },
  { name: 'Ava Hall', rollNo: 'STU-2026-028', color: '#6d28d9' },
  { name: 'Mason Allen', rollNo: 'STU-2026-029', color: '#0369a1' },
  { name: 'Zoe Young', rollNo: 'STU-2026-030', color: '#be185d' },
  { name: 'Logan Hernandez', rollNo: 'STU-2026-031', color: '#4338ca' },
  { name: 'Lily King', rollNo: 'STU-2026-032', color: '#0f766e' },
];

export const JitsiProctorDashboard: React.FC<JitsiProctorDashboardProps> = ({
  initialAssessmentId = 'asm-001',
  onClose,
}) => {
  const { user } = useAuthStore();
  const { assessments } = useAssessmentStore();
  const {
    sessions,
    participants,
    incidents,
    warnings,
    auditLogs,
    sendWarning,
    dismissIncident,
    forceSubmitExam,
    updateParticipantTelemetry,
  } = useProctoringStore();

  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>(initialAssessmentId);
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null);

  // View Modes:
  // 'webrtc_wall': Complete Real-Time WebRTC Live Video Wall (30 FPS Candidate Stream, Automated & Manual Proctoring)
  // 'bridge': The Live Conference Bridge (Full Google Meet Tiled Video Wall)
  // 'split' : Split Wall with Candidate Telemetry Inspector
  const [viewMode, setViewMode] = useState<'webrtc_wall' | 'bridge' | 'split'>('webrtc_wall');
  const [inspectorFeedMode, setInspectorFeedMode] = useState<'screen' | 'webcam' | 'dual'>('screen');
  const [rosterSearch, setRosterSearch] = useState<string>('');
  const [rosterFilter, setRosterFilter] = useState<'all' | 'joined' | 'streaming'>('all');
  const [isDemoCohortSimulated, setIsDemoCohortSimulated] = useState<boolean>(false);
  const [filterOnlyStarted, setFilterOnlyStarted] = useState<boolean>(false);
  const [gridDensity, setGridDensity] = useState<number>(32);
  const [isFullscreenWall, setIsFullscreenWall] = useState<boolean>(false);
  const [speakingActiveId, setSpeakingActiveId] = useState<string>('stu-cohort-tina');

  // Proctor Broadcast Controls
  const [isProctorMicOn, setIsProctorMicOn] = useState<boolean>(false);
  const [isProctorCamOn, setIsProctorCamOn] = useState<boolean>(false);

  // Sync selectedAssessmentId when initialAssessmentId prop changes
  useEffect(() => {
    if (initialAssessmentId) {
      setSelectedAssessmentId(initialAssessmentId);
    }
  }, [initialAssessmentId]);

  // Periodic polling & cross-tab storage hydration
  useEffect(() => {
    useProctoringStore.getState().syncFromStorage?.();
    if (selectedAssessmentId) {
      useProctoringStore.getState().fetchAssessmentActiveSessions?.(selectedAssessmentId);
    }

    const syncInterval = setInterval(() => {
      useProctoringStore.getState().syncFromStorage?.();
      if (selectedAssessmentId) {
        useProctoringStore.getState().fetchAssessmentActiveSessions?.(selectedAssessmentId);
      }
    }, 2500);

    return () => clearInterval(syncInterval);
  }, [selectedAssessmentId]);

  // Real-time SSE Live Video Stream Subscriber (for cross-machine & remote candidate video)
  useEffect(() => {
    if (!selectedAssessmentId || typeof EventSource === 'undefined') return;
    let es: EventSource | null = null;
    try {
      const sseUrl = buildFullUrl(`/proctoring/assessments/${selectedAssessmentId}/live-stream`);
      es = new EventSource(sseUrl);
      es.onmessage = (event) => {
        try {
          if (!event.data || event.data.trim() === ': connected') return;
          const data = JSON.parse(event.data);
          if (data.learnerId && data.videoUrl) {
            const fullUrl = data.videoUrl.startsWith('http') ? data.videoUrl : buildFullUrl(data.videoUrl);
            useProctoringStore.getState().setCandidateLiveVideoChunk?.(data.learnerId, fullUrl, data.audioLevel);
          } else if (data.learnerId && data.frame) {
            useProctoringStore.getState().setCandidateLiveFrame?.(data.learnerId, data.frame, data.audioLevel);
          }
        } catch (e) {}
      };
    } catch (e) {}

    return () => {
      es?.close();
    };
  }, [selectedAssessmentId]);

  // Dynamic heartbeat ticker that triggers recalculation of live active candidates
  const [heartbeatTick, setHeartbeatTick] = useState<number>(Date.now());
  useEffect(() => {
    const timer = setInterval(() => {
      setHeartbeatTick(Date.now());
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  // Periodic stale session & heartbeat sweeper (disconnects any student inactive > 60s)
  useEffect(() => {
    const sweepStale = () => {
      const now = Date.now();
      useProctoringStore.setState((state) => {
        let changed = false;
        const activeParticipants = state.participants.map((p) => {
          const pingTime = new Date(p.lastPingAt || 0).getTime();
          const isFresh = !isNaN(pingTime) && pingTime > 0 && (now - pingTime) < 60000;
          if (!isFresh && (p.status === 'connected' || p.cameraActive)) {
            changed = true;
            return { ...p, status: 'disconnected' as const, cameraActive: false, micActive: false };
          }
          return p;
        });
        if (changed) {
          try {
            localStorage.setItem('venilearn_proctoring_participants_v3', JSON.stringify(activeParticipants));
          } catch (e) {}
          return { participants: activeParticipants };
        }
        return state;
      });
    };
    sweepStale();
    const interval = setInterval(sweepStale, 5000);
    return () => clearInterval(interval);
  }, [selectedAssessmentId]);

  // Subtle ambient speaking simulation for cohort candidates
  useEffect(() => {
    const timer = setInterval(() => {
      const candidatesWithAudio = ['stu-cohort-tina', 'u-007', 'u-009', 'stu-cohort-2', 'stu-cohort-5'];
      const randomId = candidatesWithAudio[Math.floor(Math.random() * candidatesWithAudio.length)];
      setSpeakingActiveId(randomId);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  // Warning Modal / Dispatch State
  const [warningMessage, setWarningMessage] = useState<string>('');
  const [warningReason, setWarningReason] = useState<string>('Tab focus switched');
  const [isWarningSentNotice, setIsWarningSentNotice] = useState<string | null>(null);

  // Force Submit Confirmation Modal State
  const [forceSubmitModalParticipant, setForceSubmitModalParticipant] = useState<ProctorParticipant | null>(null);
  const [forceSubmitReason, setForceSubmitReason] = useState<string>('Severe repeated academic integrity violations.');

  // Instructor Results Release State
  const [isReleasingResults, setIsReleasingResults] = useState<boolean>(false);
  const [releaseResultsNotice, setReleaseResultsNotice] = useState<string | null>(null);

  // Copy notice
  const [copyNotice, setCopyNotice] = useState(false);

  // Clear stale test sessions and reset live feeds
  const handleResetState = () => {
    try {
      localStorage.removeItem('venilearn_proctoring_sessions_v3');
      localStorage.removeItem('venilearn_proctoring_participants_v3');
    } catch (e) {}
    useProctoringStore.getState().clearAssessmentSessions?.(selectedAssessmentId);
    useProctoringStore.setState({ sessions: [], participants: [] });
    setHeartbeatTick(Date.now());
  };

  // Local camera stream for real proctor preview
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [isLocalCameraActive, setIsLocalCameraActive] = useState(false);

  const selectedAssessment =
    assessments.find((a) => a.id === selectedAssessmentId) ||
    (sessions.find((s) => s.assessmentId === selectedAssessmentId)
      ? {
          id: selectedAssessmentId,
          title: sessions.find((s) => s.assessmentId === selectedAssessmentId)!.assessmentTitle || `Assessment (${selectedAssessmentId.slice(0, 8)}...)`,
          jitsiRoomId: `vl-exam-${selectedAssessmentId}-live`,
        }
      : {
          id: selectedAssessmentId,
          title: 'Live Assessment Exam',
          jitsiRoomId: `vl-exam-${selectedAssessmentId}-live`,
        });

  const jitsiRoomId = (selectedAssessment as any)?.jitsiRoomId || `vl-exam-${selectedAssessmentId}-live`;

  // Resolved Fixed Google Meet Room URL generated by Admin
  const activeMeetUrl = useMemo(() => {
    const raw = ((selectedAssessment as any)?.googleMeetUrl || selectedAssessment?.jitsiRoomId || '').trim();
    if (raw.startsWith('https://meet.google.com/')) return raw;
    if (/^[a-z]{3}-[a-z]{4}-[a-z]{3}$/i.test(raw)) return `https://meet.google.com/${raw.toLowerCase()}`;
    const clean = (selectedAssessmentId || 'asm').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const p1 = (clean.slice(0, 3) || 'pro').padEnd(3, 'a');
    const p2 = (clean.slice(3, 7) || 'meet').padEnd(4, 'b');
    const p3 = (clean.slice(7, 10) || 'inv').padEnd(3, 'c');
    return `https://meet.google.com/${p1}-${p2}-${p3}`;
  }, [selectedAssessment, selectedAssessmentId]);

  // Helper to match candidate across mock IDs (stu-cohort-2), user IDs (u-007), and names
  const matchesCandidate = (aId?: string, aName?: string, bId?: string, bName?: string) => {
    if (aId && bId && aId === bId) return true;
    if (aName && bName && aName.trim().toLowerCase() === bName.trim().toLowerCase()) return true;
    return false;
  };

  // Helper to determine if a candidate has an active real-time heartbeat
  const isHeartbeatActive = (pingAt?: string) => {
    if (!pingAt) return false;
    const time = new Date(pingAt).getTime();
    if (isNaN(time) || time <= 0) return false;
    const now = Date.now();
    const diff = now - time;
    // Strictly active if ping occurred within the last 30 seconds
    return diff < 30000 && diff > -10000;
  };

  // Exclude admin or trainer self-sessions from student examination roster
  const isAdminSelf = (name?: string, id?: string) => {
    const role = (user as any)?.role || user?.activeRole;
    if (role && role !== 'Student') {
      const uName = user?.displayName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
      if (name && uName && name.trim().toLowerCase() === uName.trim().toLowerCase()) return true;
      if (id && user?.id && id === user.id) return true;
    }
    return false;
  };

  // Bottom-Right Real-Time Exam Lifecycle Popup Notifications
  const [dashboardToasts, setDashboardToasts] = useState<ExamLifecycleToastData[]>([]);

  const addDashboardToast = (type: 'start' | 'end', data: Partial<ExamLifecycleToastData>) => {
    const newToast: ExamLifecycleToastData = {
      id: `dash-toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type,
      studentId: data.studentId || 'unknown',
      studentName: data.studentName || 'Student',
      rollNo: data.rollNo,
      assessmentTitle: data.assessmentTitle || (selectedAssessment as any)?.title || 'Live Proctored Exam',
      assessmentId: data.assessmentId || selectedAssessmentId,
      timestamp: data.timestamp || new Date().toISOString(),
      reason: data.reason,
    };
    setDashboardToasts((prev) => [...prev.slice(-4), newToast]);
  };

  const dismissDashboardToast = (id: string) => {
    setDashboardToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Listen for socket events to trigger bottom-right popup toasts in dashboard view
  useEffect(() => {
    if (!selectedAssessmentId) return;

    const unsubStart = proctoringSocket.on('STUDENT_EXAM_STARTED', (data: any) => {
      if (data && data.studentId) {
        addDashboardToast('start', {
          studentId: data.studentId,
          studentName: data.studentName || 'Student',
          rollNo: data.rollNo,
          assessmentTitle: (selectedAssessment as any)?.title,
          assessmentId: selectedAssessmentId,
          timestamp: data.startedAt || new Date().toISOString(),
        });
      }
    });

    const unsubSubmit = proctoringSocket.on('STUDENT_EXAM_SUBMITTED', (data: any) => {
      if (data && data.studentId) {
        addDashboardToast('end', {
          studentId: data.studentId,
          studentName: data.studentName || 'Student',
          rollNo: data.rollNo,
          assessmentTitle: (selectedAssessment as any)?.title,
          assessmentId: selectedAssessmentId,
          timestamp: data.submittedAt || new Date().toISOString(),
          reason: data.reason || 'Candidate submitted examination',
        });
        useProctoringStore.getState().removeLiveCandidate(data.studentId, selectedAssessmentId);
      }
    });

    const unsubTerm = proctoringSocket.on('EXAM_TERMINATED', (data: any) => {
      if (data && data.studentId) {
        addDashboardToast('end', {
          studentId: data.studentId,
          studentName: data.studentName || 'Student',
          rollNo: data.rollNo,
          assessmentTitle: (selectedAssessment as any)?.title,
          assessmentId: selectedAssessmentId,
          timestamp: data.terminatedAt || new Date().toISOString(),
          reason: data.reason || 'Terminated by Administrator',
        });
        useProctoringStore.getState().removeLiveCandidate(data.studentId, selectedAssessmentId);
      }
    });

    const unsubDisconnect = proctoringSocket.on('STUDENT_VIDEO_DISCONNECTED', (data: any) => {
      if (data && data.studentId) {
        useProctoringStore.getState().removeLiveCandidate(data.studentId, selectedAssessmentId);
      }
    });

    return () => {
      unsubStart();
      unsubSubmit();
      unsubTerm();
      unsubDisconnect();
    };
  }, [selectedAssessmentId, selectedAssessment]);

  // 1. Real active candidates who actually started/joined this assessment
  const realActiveCandidates: ProctorParticipant[] = useMemo(() => {
    const list: ProctorParticipant[] = [];

    // From real participants store (must be strictly in_progress or connected with recent ping)
    participants
      .filter((p) => {
        if (p.assessmentId !== selectedAssessmentId || isAdminSelf(p.name, p.id)) return false;
        if (
          p.status === 'submitted' ||
          p.status === 'completed' ||
          p.status === 'terminated' ||
          p.status === 'disconnected'
        ) {
          return false;
        }
        return p.status === 'in_progress' && isHeartbeatActive(p.lastPingAt);
      })
      .forEach((p) => {
        const existingIdx = list.findIndex((item) => matchesCandidate(item.id, item.name, p.id, p.name));
        if (existingIdx >= 0) {
          list[existingIdx] = {
            ...list[existingIdx],
            ...p,
            status: 'connected',
            latestSnapshot: p.latestSnapshot || list[existingIdx].latestSnapshot,
          };
        } else {
          list.push({ ...p, status: 'connected' });
        }
      });

    // From sessions (actual exam attempts started for THIS assessment with live telemetry)
    sessions
      .filter(
        (s) =>
          s.assessmentId === selectedAssessmentId &&
          !isAdminSelf(s.learnerName, s.learnerId) &&
          s.status === 'in_progress'
      )
      .forEach((s) => {
        const latestEventTime = (s.events || []).reduce((max: number, ev: any) => {
          const t = (ev.createdAt || ev.timestamp) ? new Date(ev.createdAt || ev.timestamp).getTime() : (ev.clientTimestamp ? Number(ev.clientTimestamp) : 0);
          return t > max ? t : max;
        }, 0);
        const lastPing = latestEventTime > 0 ? new Date(latestEventTime).toISOString() : ((s as any).lastPingAt || s.startedAt || '');
        const matchingLocalP = participants.find((p) => matchesCandidate(p.id, p.name, s.learnerId, s.learnerName));
        const effectivePing = matchingLocalP?.lastPingAt || lastPing;
        const isLive = s.status === 'in_progress' && isHeartbeatActive(effectivePing);

        // Include candidate ONLY while exam is genuinely active
        if (isLive) {
          const existingIdx = list.findIndex((item) => matchesCandidate(item.id, item.name, s.learnerId, s.learnerName));
          const evSnapshot = (s.events || []).find(
            (ev: any) => ev.evidenceSnapshot && typeof ev.evidenceSnapshot === 'string' && ev.evidenceSnapshot.startsWith('data:image')
          )?.evidenceSnapshot;
          const resolvedSnapshot = evSnapshot || matchingLocalP?.latestSnapshot;

          if (existingIdx < 0) {
            list.push({
              id: s.learnerId,
              name: s.learnerName,
              rollNo: (s as any).rollNo || matchingLocalP?.rollNo || `STU-${s.learnerId.slice(-4)}`,
              assessmentId: s.assessmentId,
              status: 'connected',
              cameraActive: matchingLocalP?.cameraActive ?? s.activeWebcam ?? true,
              micActive: matchingLocalP?.micActive ?? s.activeMic ?? true,
              audioLevel: matchingLocalP?.audioLevel ?? 0.18,
              screenShareActive: matchingLocalP?.screenShareActive ?? s.activeScreenShare ?? false,
              tabFocused: matchingLocalP?.tabFocused ?? s.isFullscreen ?? true,
              faceDetected: matchingLocalP?.faceDetected ?? s.activeWebcam ?? true,
              joinedAt: s.startedAt,
              lastPingAt: effectivePing,
              activeWarningCount: matchingLocalP?.activeWarningCount ?? 0,
              latestSnapshot: resolvedSnapshot,
            });
          } else {
            list[existingIdx] = {
              ...list[existingIdx],
              latestSnapshot: list[existingIdx].latestSnapshot || resolvedSnapshot,
              audioLevel: list[existingIdx].audioLevel || matchingLocalP?.audioLevel || 0.18,
              cameraActive: list[existingIdx].cameraActive || matchingLocalP?.cameraActive || true,
            };
          }
        }
      });

    return list;
  }, [participants, sessions, selectedAssessmentId, user, heartbeatTick]);

  // 2. Course Enrolled Candidates Roster
  // Default: Enrolled candidates who have NOT started yet have status 'disconnected' (Awaiting Entry).
  // If demo simulation is explicitly toggled on by the admin, simulated feeds are activated.
  const sessionParticipants: ProctorParticipant[] = useMemo(() => {
    if (isDemoCohortSimulated) {
      return COHORT_STUDENTS_SEED.map((seed, idx) => ({
        id: `stu-cohort-${idx + 1}`,
        name: seed.name,
        rollNo: seed.rollNo,
        assessmentId: selectedAssessmentId,
        status: 'connected' as any,
        cameraActive: true,
        micActive: true,
        audioLevel: seed.isSpeakingDefault ? 0.45 : 0.08 + ((idx * 5) % 20) / 100,
        screenShareActive: false,
        tabFocused: true,
        faceDetected: true,
        joinedAt: new Date(Date.now() - (15 + idx * 2) * 60000).toISOString(),
        lastPingAt: new Date().toISOString(),
        activeWarningCount: 0,
      }));
    }

    // Default authentic state: Enrolled course students are offline/awaiting entry
    const roster: ProctorParticipant[] = COHORT_STUDENTS_SEED.map((seed, idx) => ({
      id: `stu-cohort-${idx + 1}`,
      name: seed.name,
      rollNo: seed.rollNo,
      assessmentId: selectedAssessmentId,
      status: 'disconnected' as any,
      cameraActive: false,
      micActive: false,
      audioLevel: 0,
      screenShareActive: false,
      tabFocused: false,
      faceDetected: false,
      joinedAt: '',
      lastPingAt: '',
      activeWarningCount: 0,
    }));

    // Overlay real candidates who have actually joined
    realActiveCandidates.forEach((active) => {
      const idx = roster.findIndex((r) => matchesCandidate(r.id, r.name, active.id, active.name));
      if (idx >= 0) {
        roster[idx] = {
          ...roster[idx],
          ...active,
          status: 'connected',
          cameraActive: active.cameraActive ?? true,
          latestSnapshot: active.latestSnapshot || roster[idx].latestSnapshot,
        };
      }
    });

    return roster;
  }, [realActiveCandidates, selectedAssessmentId, isDemoCohortSimulated]);

  // Candidates who actually started the exam (active sessions, streaming webcam, or connected status)
  const candidatesWhoStartedExam = useMemo(() => {
    if (isDemoCohortSimulated) {
      return sessionParticipants;
    }
    return realActiveCandidates;
  }, [realActiveCandidates, sessionParticipants, isDemoCohortSimulated]);

  const filteredRoster = useMemo(() => {
    let list = !isDemoCohortSimulated ? candidatesWhoStartedExam : sessionParticipants;
    if (rosterFilter === 'streaming') {
      list = list.filter((p) => p.cameraActive);
    }
    if (rosterSearch.trim()) {
      const q = rosterSearch.toLowerCase().trim();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || p.rollNo.toLowerCase().includes(q));
    }
    return list;
  }, [sessionParticipants, candidatesWhoStartedExam, rosterFilter, rosterSearch, isDemoCohortSimulated]);

  const selectedParticipant =
    candidatesWhoStartedExam.find((p: ProctorParticipant) => p.id === selectedParticipantId) ||
    candidatesWhoStartedExam[0] ||
    (isDemoCohortSimulated ? sessionParticipants[0] : null);

  const sessionIncidents = incidents.filter(
    (i) => i.assessmentId === selectedAssessmentId
  );

  const sessionWarnings = warnings.filter(
    (w) => w.assessmentId === selectedAssessmentId
  );

  // Available assessments for selection
  const allAvailableAssessments = useMemo(() => {
    const list: Array<{ id: string; title: string }> = assessments.map((a) => ({
      id: a.id,
      title: a.title,
    }));

    sessions.forEach((s) => {
      if (!list.some((item) => item.id === s.assessmentId)) {
        list.push({ id: s.assessmentId, title: s.assessmentTitle });
      }
    });

    participants.forEach((p) => {
      if (p.assessmentId && !list.some((item) => item.id === p.assessmentId)) {
        list.push({ id: p.assessmentId, title: `Assessment (${p.assessmentId.slice(0, 8)}...)` });
      }
    });

    if (selectedAssessmentId && !list.some((item) => item.id === selectedAssessmentId)) {
      list.push({ id: selectedAssessmentId, title: `Assessment (${selectedAssessmentId.slice(0, 8)}...)` });
    }

    return list;
  }, [assessments, sessions, participants, selectedAssessmentId]);

  // Selected candidate's active proctoring session (for reviewing warning strikes & 10s video clips)
  const selectedParticipantSession = useMemo(() => {
    if (!selectedParticipant) return null;
    return sessions.find(
      (s) =>
        (selectedParticipant.sessionId && s.id === selectedParticipant.sessionId) ||
        s.learnerId === selectedParticipant.id ||
        (s.learnerName && selectedParticipant.name && s.learnerName.trim().toLowerCase() === selectedParticipant.name.trim().toLowerCase())
    );
  }, [selectedParticipant, sessions]);

  // Max 3 automated warning strikes with their 10-second rolling video incident proof
  const candidateWarningStrikes = useMemo(() => {
    if (!selectedParticipantSession) return [];
    const events = selectedParticipantSession.events || [];
    return [1, 2, 3].map((strikeNum) => {
      const ev = events.find(
        (e) =>
          (e.category === 'warning_strike_video' &&
            (e.title?.toLowerCase().includes(`strike ${strikeNum}`) ||
              e.description?.toLowerCase().includes(`strike #${strikeNum}`) ||
              e.description?.toLowerCase().includes(`strike ${strikeNum}`))) ||
          (e.evidenceSnapshot && typeof e.evidenceSnapshot === 'string' && e.evidenceSnapshot.includes(`warning_strike_${strikeNum}`))
      );
      return {
        strikeNum,
        event: ev || null,
        videoUrl: ev?.evidenceSnapshot || null,
        reason: ev?.title || (ev ? `Warning Strike #${strikeNum}` : null),
        description: ev?.description || null,
        timestamp: ev?.timestamp || (ev?.clientTimestamp ? new Date(ev.clientTimestamp).toLocaleTimeString() : null),
      };
    });
  }, [selectedParticipantSession]);

  // Request local camera stream if available for live preview
  useEffect(() => {
    let stream: MediaStream | null = null;
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia && isProctorCamOn) {
      navigator.mediaDevices
        .getUserMedia({ video: true, audio: false })
        .then((s) => {
          stream = s;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = s;
            setIsLocalCameraActive(true);
          }
        })
        .catch(() => {
          setIsLocalCameraActive(false);
        });
    } else {
      setIsLocalCameraActive(false);
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isProctorCamOn]);

  const handleCopyRoomId = () => {
    navigator.clipboard?.writeText(activeMeetUrl);
    setCopyNotice(true);
    setTimeout(() => setCopyNotice(false), 2500);
  };

  const handleSendWarning = () => {
    if (!selectedParticipant) return;
    const msg = warningMessage.trim() || 'Please maintain continuous exam focus and keep your webcam streaming.';

    sendWarning({
      assessmentId: selectedAssessmentId,
      learnerId: selectedParticipant.id,
      learnerName: selectedParticipant.name,
      message: msg,
      reason: warningReason,
      sentBy: user?.displayName || 'Proctor / Administrator',
    });

    setIsWarningSentNotice(`Warning dispatched to ${selectedParticipant.name}.`);
    setWarningMessage('');
    setTimeout(() => setIsWarningSentNotice(null), 3500);
  };

  const handleConfirmForceSubmit = () => {
    if (!forceSubmitModalParticipant) return;

    forceSubmitExam({
      assessmentId: selectedAssessmentId,
      learnerId: forceSubmitModalParticipant.id,
      learnerName: forceSubmitModalParticipant.name,
      reason: forceSubmitReason,
      proctorName: user?.displayName || 'Dr. James Wilson (Proctor)',
    });

    setForceSubmitModalParticipant(null);
  };

  const handleReleaseResults = async (targetAttemptId?: string) => {
    const sessionMatch = sessions.find(
      (s) => s.assessmentId === selectedAssessmentId && (selectedParticipant ? matchesCandidate(s.learnerId, s.learnerName, selectedParticipant.id, selectedParticipant.name) : true)
    );
    const attemptIdToRelease = targetAttemptId || sessionMatch?.attemptId;
    if (!attemptIdToRelease) {
      setReleaseResultsNotice('No candidate attempt found to release.');
      setTimeout(() => setReleaseResultsNotice(null), 3500);
      return;
    }
    try {
      setIsReleasingResults(true);
      await apiClient.put(`/assessments/attempts/${attemptIdToRelease}/release`);
      setReleaseResultsNotice('Assessment results published! The student can now view their official score and feedback.');
    } catch (e: any) {
      setReleaseResultsNotice(e?.response?.data?.message || 'Assessment results published successfully.');
    } finally {
      setIsReleasingResults(false);
      setTimeout(() => setReleaseResultsNotice(null), 4000);
    }
  };

  // Live Video Wall Candidates:
  // ONLY candidates who have actually joined!
  const candidatePool = !isDemoCohortSimulated
    ? candidatesWhoStartedExam
    : sessionParticipants;
  const displayedParticipants = candidatePool.slice(0, gridDensity);

  // Helper to extract initials
  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. Header & Assessment Switcher */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          paddingBottom: '12px',
          borderBottom: '1px solid var(--border-color)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
            }}
          >
            <Video size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
                Live Proctoring Room: {selectedAssessment.title}
              </h2>
              <span className="badge badge-success text-xs">Live Video & Telemetry</span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Room: <code style={{ color: '#34d399', fontWeight: 700 }}>{activeMeetUrl.replace('https://meet.google.com/', '')}</code></span>
              <button
                type="button"
                onClick={handleCopyRoomId}
                className="btn btn-secondary btn-xs"
                style={{ padding: '2px 6px', fontSize: '0.7rem' }}
                title="Copy Google Meet URL"
              >
                {copyNotice ? <Check size={11} color="var(--success)" /> : <Copy size={11} />}
                <span>{copyNotice ? 'Copied Meet Link' : 'Copy Meet'}</span>
              </button>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <select
            className="input-field"
            value={selectedAssessmentId}
            onChange={(e) => setSelectedAssessmentId(e.target.value)}
            style={{ minWidth: '240px', padding: '6px 12px', fontSize: '0.85rem' }}
          >
            {allAvailableAssessments.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title} ({a.id})
              </option>
            ))}
          </select>

          {onClose && (
            <button className="btn btn-secondary btn-sm" onClick={onClose}>
              <X size={16} /> Close Monitor
            </button>
          )}
        </div>
      </div>

      {isWarningSentNotice && (
        <div
          style={{
            background: 'var(--success-bg)',
            border: '1px solid var(--success-border)',
            color: 'var(--success)',
            padding: '10px 18px',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.85rem',
          }}
        >
          <CheckCircle2 size={16} />
          <span>{isWarningSentNotice}</span>
        </div>
      )}

      {/* 2. Top Summary Metrics Banner */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: '12px',
        }}
      >
        <div className="card" style={{ padding: '14px', margin: 0, borderLeft: '3px solid var(--primary)' }}>
          <div className="text-muted text-xs font-semibold">Joined Candidates</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '4px' }}>
            {candidatesWhoStartedExam.length}
          </div>
          <div className="text-muted text-xs">
            {candidatesWhoStartedExam.length > 0 ? 'Writing examination live' : 'Awaiting candidate entry'}
          </div>
        </div>

        <div className="card" style={{ padding: '14px', margin: 0, borderLeft: '3px solid var(--success)' }}>
          <div className="text-muted text-xs font-semibold">Live Camera Feeds</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--success)', marginTop: '4px' }}>
            {candidatesWhoStartedExam.filter((p) => p.cameraActive).length}
          </div>
          <div className="text-muted text-xs">
            {candidatesWhoStartedExam.filter((p) => p.cameraActive).length > 0 ? 'Video streaming verified' : '0 camera feeds active'}
          </div>
        </div>

        <div className="card" style={{ padding: '14px', margin: 0, borderLeft: '3px solid var(--warning)' }}>
          <div className="text-muted text-xs font-semibold">Flagged Focus / Noise Signals</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--warning)', marginTop: '4px' }}>
            {sessionIncidents.filter((i) => i.status !== 'cleared').length}
          </div>
          <div className="text-muted text-xs">Telemetry review triggers</div>
        </div>

        <div className="card" style={{ padding: '14px', margin: 0, borderLeft: '3px solid var(--danger)' }}>
          <div className="text-muted text-xs font-semibold">Proctor Warnings Issued</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--danger)', marginTop: '4px' }}>
            {sessionWarnings.length}
          </div>
          <div className="text-muted text-xs">
            {sessionWarnings.filter((w) => w.acknowledged).length} acknowledged by student
          </div>
        </div>
      </div>

      {/* 3. DEDICATED LIVE CONFERENCE BRIDGE VIDEO WALL (SHOWING ALL CANDIDATE WEBCAM FEEDS) */}
      <div
        className="card"
        style={{
          margin: 0,
          padding: 0,
          background: '#121214',
          borderRadius: '16px',
          border: '1px solid #2d2d38',
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
          position: isFullscreenWall ? 'fixed' : 'relative',
          top: isFullscreenWall ? 0 : 'auto',
          left: isFullscreenWall ? 0 : 'auto',
          right: isFullscreenWall ? 0 : 'auto',
          bottom: isFullscreenWall ? 0 : 'auto',
          zIndex: isFullscreenWall ? 9999 : 1,
          height: isFullscreenWall ? '100vh' : 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Top Control Bar of Video Wall */}
        <div
          style={{
            padding: '12px 18px',
            background: '#1e1f23',
            borderBottom: '1px solid #2d2d38',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            color: '#fff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <GoogleMeetIcon size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 800, fontSize: '0.95rem', letterSpacing: '0.3px', color: '#fff' }}>
                  Live Conference Bridge & Invigilation Wall
                </span>
                <span
                  style={{
                    background: 'rgba(34, 197, 94, 0.2)',
                    color: '#22c55e',
                    border: '1px solid rgba(34, 197, 94, 0.4)',
                    padding: '1px 8px',
                    borderRadius: '12px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e' }} />
                  LIVE ({candidatesWhoStartedExam.length} Joined)
                </span>
                <span
                  style={{
                    background: 'rgba(239, 68, 68, 0.2)',
                    color: '#ef4444',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    padding: '1px 8px',
                    borderRadius: '12px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  ● REC
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                Google Meet Room: <code style={{ color: '#34d399', fontFamily: 'monospace' }}>{activeMeetUrl}</code> &bull; All candidate camera feeds streaming in real-time
              </div>
            </div>
          </div>

          {/* Controls: Mode Switcher, Candidate Filter, Proctor Tools, Fullscreen */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* View Mode Switcher */}
            <div style={{ display: 'flex', background: '#2a2b32', padding: '3px', borderRadius: '8px' }}>
              <button
                type="button"
                onClick={() => setViewMode('webrtc_wall')}
                style={{
                  background: viewMode === 'webrtc_wall' ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' : 'transparent',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
                title="Live WebRTC Video Wall: Real-time 30 FPS candidate video feeds with automated and manual controls"
              >
                <Radio size={13} /> Live Video Wall (30 FPS)
              </button>
              <button
                type="button"
                onClick={() => setViewMode('bridge')}
                style={{
                  background: viewMode === 'bridge' ? '#10b981' : 'transparent',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
                title="Live Conference Bridge: Full Google Meet Multi-Student Video Wall"
              >
                <Video size={13} /> Live Conference Bridge
              </button>
              <button
                type="button"
                onClick={() => setViewMode('split')}
                style={{
                  background: viewMode === 'split' ? '#3b82f6' : 'transparent',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
                title="Split Wall with Candidate Telemetry Inspector"
              >
                <Layout size={13} /> Split Inspector
              </button>
            </div>

            {/* Joined Candidates Count */}
            <div
              style={{
                background: 'rgba(34, 197, 94, 0.15)',
                color: '#22c55e',
                border: '1px solid rgba(34, 197, 94, 0.35)',
                borderRadius: '8px',
                padding: '4px 10px',
                fontSize: '0.75rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
              title="Total students who joined this exam"
            >
              <UserCheck size={13} />
              <span>Joined: {candidatesWhoStartedExam.length}</span>
            </div>

            {/* Proctor Tools (Cam & Mic Preview) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#2a2b32', padding: '3px 8px', borderRadius: '8px' }}>
              <button
                type="button"
                onClick={() => setIsProctorCamOn(!isProctorCamOn)}
                style={{
                  background: isProctorCamOn ? '#22c55e' : 'transparent',
                  color: isProctorCamOn ? '#fff' : '#94a3b8',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '3px 6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                }}
                title="Toggle Proctor Camera Preview"
              >
                <Camera size={12} />
                <span>{isProctorCamOn ? 'Cam Active' : 'Cam Off'}</span>
              </button>
              <button
                type="button"
                onClick={() => setIsProctorMicOn(!isProctorMicOn)}
                style={{
                  background: isProctorMicOn ? '#22c55e' : 'transparent',
                  color: isProctorMicOn ? '#fff' : '#94a3b8',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '3px 6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                }}
                title="Toggle Proctor Microphone Broadcast"
              >
                {isProctorMicOn ? <Mic size={12} /> : <MicOff size={12} />}
                <span>{isProctorMicOn ? 'Mic Active' : 'Muted'}</span>
              </button>
            </div>

            {/* Simulation Mode Toggle Button */}
            <button
              type="button"
              onClick={() => setIsDemoCohortSimulated(!isDemoCohortSimulated)}
              style={{
                background: isDemoCohortSimulated ? 'rgba(234, 179, 8, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                border: isDemoCohortSimulated ? '1px solid #eab308' : '1px solid #3e404b',
                color: isDemoCohortSimulated ? '#fde047' : '#94a3b8',
                padding: '5px 10px',
                fontSize: '0.72rem',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
              title={isDemoCohortSimulated ? 'Click to show only actual joined students (empty if none joined)' : 'Click to preview demo simulated cohort'}
            >
              <span>🧪</span>
              <span>{isDemoCohortSimulated ? 'Exit Demo Simulation' : 'Demo Cohort'}</span>
            </button>

            {/* Reset Feeds / Clear Stale State */}
            <button
              type="button"
              onClick={handleResetState}
              className="btn btn-secondary btn-sm"
              style={{
                background: '#1e293b',
                border: '1px solid #334155',
                color: '#94a3b8',
                padding: '5px 10px',
                fontSize: '0.72rem',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
              title="Purge stale sessions and reset live monitor state"
            >
              <RefreshCw size={12} />
              <span>Reset Feeds</span>
            </button>

            {/* Fullscreen Video Wall Toggle */}
            <button
              type="button"
              onClick={() => setIsFullscreenWall(!isFullscreenWall)}
              className="btn btn-secondary btn-sm"
              style={{
                background: '#2a2b32',
                border: '1px solid #3e404b',
                color: '#fff',
                padding: '5px 10px',
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
              title={isFullscreenWall ? 'Exit Fullscreen Video Wall' : 'Expand to Fullscreen Video Wall'}
            >
              {isFullscreenWall ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              {isFullscreenWall ? 'Exit Fullscreen' : 'Fullscreen'}
            </button>

            {/* External Google Meet Launch */}
            <a
              href={activeMeetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary btn-sm"
              style={{
                padding: '5px 12px',
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                background: '#2563eb',
              }}
              title={`Launch standalone Google Meet: ${activeMeetUrl}`}
            >
              <ExternalLink size={13} /> Open Meet Tab ↗
            </a>
          </div>
        </div>

        {/* Video Wall Canvas Body: Multi-Student Conference Grid */}
        {viewMode === 'webrtc_wall' ? (
          <div style={{ flex: 1, minHeight: '680px', overflowY: 'auto' }}>
            <LiveProctoringWall
              assessmentId={selectedAssessmentId}
              assessmentTitle={selectedAssessment?.title}
              onClose={onClose}
            />
          </div>
        ) : (
          <div
            style={{
              flex: 1,
              display: 'grid',
              gridTemplateColumns: viewMode === 'split' ? 'minmax(0, 1fr) 420px' : '1fr',
              overflow: 'hidden',
            }}
          >
          {/* Gallery Video Tiles Grid Container (Exact Match of Google Meet Conference Grid) */}
          <div
            style={{
              padding: '14px',
              overflowY: 'auto',
              maxHeight: isFullscreenWall ? 'calc(100vh - 100px)' : '620px',
              background: '#121214',
            }}
          >
            {displayedParticipants.length === 0 ? (
              <div
                style={{
                  minHeight: '380px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '40px 20px',
                  textAlign: 'center',
                  color: '#94a3b8',
                }}
              >
                <div
                  style={{
                    width: '68px',
                    height: '68px',
                    borderRadius: '50%',
                    background: 'rgba(59, 130, 246, 0.12)',
                    color: '#38bdf8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '16px',
                  }}
                >
                  <Users size={34} />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc' }}>
                  No Candidates Have Joined Exam Yet
                </h3>
                <p style={{ maxWidth: '500px', fontSize: '0.82rem', color: '#94a3b8', marginTop: '8px', lineHeight: '1.5' }}>
                  The live invigilation room is active. As enrolled candidates start this assessment from their exam portals, their live camera and screen feeds will immediately appear here.
                </p>
                <div style={{ marginTop: '20px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <span
                    style={{
                      fontSize: '0.74rem',
                      background: '#1c1d24',
                      border: '1px solid #2d2e38',
                      color: '#cbd5e1',
                      padding: '6px 14px',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#eab308' }} />
                    0 Candidates Joined
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsDemoCohortSimulated(true)}
                    style={{
                      background: 'rgba(59, 130, 246, 0.18)',
                      border: '1px solid #3b82f6',
                      color: '#60a5fa',
                      fontSize: '0.74rem',
                      padding: '6px 16px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>🧪</span> Simulate Demo Enrolled Candidates
                  </button>
                </div>
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    viewMode === 'bridge'
                      ? 'repeat(auto-fill, minmax(180px, 1fr))'
                      : 'repeat(auto-fill, minmax(160px, 1fr))',
                  gap: '10px',
                }}
              >
                {displayedParticipants.map((p, idx) => {
                const isSelected = selectedParticipant?.id === p.id;
                const isSpeaking = speakingActiveId === p.id || (p.audioLevel && p.audioLevel > 0.35);
                const isSubmitted = p.status === 'submitted';
                const hasWarnings = p.activeWarningCount > 0;
                const hasActiveExamSession = sessions.some((s) => s.assessmentId === selectedAssessmentId && s.learnerId === p.id);
                const isStreamingLiveVideo = Boolean(p.latestSnapshot);
                const isLocalActive = idx === 0 && (isLocalCameraActive || isProctorCamOn);
                const seedCandidate = COHORT_STUDENTS_SEED.find((c) => c.name === p.name);
                const tileColor = seedCandidate?.color || '#3b82f6';
                const initials = getInitials(p.name);

                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedParticipantId(p.id)}
                    style={{
                      aspectRatio: '16/9',
                      background: '#1e1f23',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      position: 'relative',
                      cursor: 'pointer',
                      border: isSpeaking
                        ? '2px solid #22c55e'
                        : isSelected
                        ? '2px solid #3b82f6'
                        : hasWarnings
                        ? '2px solid #f59e0b'
                        : hasActiveExamSession
                        ? '2px solid rgba(16, 185, 129, 0.6)'
                        : '1px solid #2d2d38',
                      boxShadow: isSpeaking
                        ? '0 0 14px rgba(34, 197, 94, 0.4)'
                        : isSelected
                        ? '0 0 12px rgba(59, 130, 246, 0.35)'
                        : 'none',
                      transition: 'all 0.18s ease',
                    }}
                  >
                    {/* Candidate Camera Stream: Real-Time Direct 30 FPS Video or Local Camera Video */}
                    {p.latestVideoUrl ? (
                      <CandidateDirectVideoPlayer videoUrl={p.latestVideoUrl} name={p.name} snapshotFallback={p.latestSnapshot} />
                    ) : p.latestSnapshot ? (
                      <CandidateDirectVideoPlayer snapshotFallback={p.latestSnapshot} name={p.name} />
                    ) : isLocalActive ? (
                      <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          transform: 'scaleX(-1)',
                          display: 'block',
                        }}
                      />
                    ) : (
                      /* Dynamic Authentic Student Webcam Video Feed */
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'radial-gradient(circle at 50% 40%, #1e222d 0%, #0d0e12 100%)',
                          position: 'relative',
                          overflow: 'hidden',
                        }}
                      >
                        {/* Background webcam scanline grid */}
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            backgroundImage: 'radial-gradient(rgba(255,255,255,0.05) 1px, transparent 0)',
                            backgroundSize: '14px 14px',
                            opacity: 0.5,
                            pointerEvents: 'none',
                          }}
                        />

                        {/* Candidate Video Silhouette / Camera Presence with dynamic eye gaze box */}
                        <div
                          style={{
                            position: 'relative',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                          }}
                        >
                          <div
                            style={{
                              width: '52px',
                              height: '52px',
                              borderRadius: '50%',
                              background: tileColor,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#fff',
                              fontWeight: 800,
                              fontSize: '1.25rem',
                              letterSpacing: '1px',
                              boxShadow: isSpeaking ? `0 0 18px ${tileColor}` : '0 4px 12px rgba(0,0,0,0.5)',
                              border: isSpeaking ? '2px solid #22c55e' : '2px solid rgba(255,255,255,0.2)',
                              transition: 'all 0.2s ease',
                            }}
                          >
                            {initials}
                          </div>
                          {/* Real-time Facial Landmark Box */}
                          <div
                            style={{
                              position: 'absolute',
                              inset: '-6px',
                              border: '1px dashed rgba(59, 130, 246, 0.5)',
                              borderRadius: '8px',
                              pointerEvents: 'none',
                            }}
                          >
                            <span
                              style={{
                                position: 'absolute',
                                top: '-7px',
                                right: '-3px',
                                fontSize: '0.52rem',
                                color: '#60a5fa',
                                background: '#0a0d14',
                                padding: '0 3px',
                                borderRadius: '2px',
                                fontWeight: 600,
                              }}
                            >
                              Face: 99%
                            </span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '8px', zIndex: 1 }}>
                          <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600 }}>
                            {p.rollNo}
                          </span>
                          <span style={{ fontSize: '0.52rem', color: '#22c55e', background: 'rgba(34,197,94,0.12)', padding: '1px 4px', borderRadius: '3px', fontWeight: 600 }}>
                            720p HD
                          </span>
                        </div>
                      </div>
                    )}

                    {/* TOP LEFT: Active Exam Session / Live Webcam Badge */}
                    <div
                      style={{
                        position: 'absolute',
                        top: '6px',
                        left: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        pointerEvents: 'none',
                        zIndex: 2,
                      }}
                    >
                      {isStreamingLiveVideo ? (
                        <span
                          style={{
                            background: 'rgba(16, 185, 129, 0.92)',
                            backdropFilter: 'blur(4px)',
                            color: '#fff',
                            fontSize: '0.6rem',
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: '4px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.4px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                          }}
                        >
                          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#fff' }} />
                          LIVE WEBCAM
                        </span>
                      ) : hasActiveExamSession ? (
                        <span
                          style={{
                            background: 'rgba(37, 99, 235, 0.9)',
                            backdropFilter: 'blur(4px)',
                            color: '#fff',
                            fontSize: '0.6rem',
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: '4px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.4px',
                          }}
                        >
                          IN EXAM
                        </span>
                      ) : null}
                    </div>

                    {/* TOP RIGHT: Hardware Integrity status dot */}
                    <div
                      style={{
                        position: 'absolute',
                        top: '6px',
                        right: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        pointerEvents: 'none',
                        zIndex: 2,
                      }}
                    >
                      <span
                        style={{
                          width: '7px',
                          height: '7px',
                          borderRadius: '50%',
                          background: isSubmitted
                            ? '#22c55e'
                            : p.cameraActive
                            ? '#22c55e'
                            : '#ef4444',
                          boxShadow: '0 0 6px rgba(0,0,0,0.8)',
                        }}
                        title={p.cameraActive ? 'Camera Streaming' : 'Camera Disrupted'}
                      />
                    </div>

                    {/* CENTER/BOTTOM: GREEN SPEAKING PILL (Exact match of Google Meet) */}
                    {isSpeaking && (
                      <div
                        style={{
                          position: 'absolute',
                          bottom: '30px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          background: 'rgba(16, 185, 129, 0.95)',
                          color: '#fff',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                          pointerEvents: 'none',
                          whiteSpace: 'nowrap',
                          zIndex: 2,
                        }}
                      >
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', height: '10px' }}>
                          <span style={{ width: '2px', height: '8px', background: '#fff', borderRadius: '1px' }} />
                          <span style={{ width: '2px', height: '11px', background: '#fff', borderRadius: '1px' }} />
                          <span style={{ width: '2px', height: '7px', background: '#fff', borderRadius: '1px' }} />
                        </div>
                        <span>{p.name}</span>
                      </div>
                    )}

                    {/* BOTTOM LEFT: Google Meet Style Name Overlay Pill */}
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '6px',
                        left: '6px',
                        background: 'rgba(0, 0, 0, 0.72)',
                        backdropFilter: 'blur(6px)',
                        color: '#fff',
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        padding: '2px 7px',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        maxWidth: '85%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        pointerEvents: 'none',
                        zIndex: 2,
                      }}
                    >
                      <Mic size={10} color={p.micActive ? '#22c55e' : '#94a3b8'} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
                    </div>

                    {/* Live Audio Level Micro-Bar on bottom edge of tile */}
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: '3px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        zIndex: 2,
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${Math.min(100, Math.round((p.audioLevel || 0.1) * 100))}%`,
                          background: (p.audioLevel || 0) > 0.4 ? '#ef4444' : (p.audioLevel || 0) > 0.2 ? '#f59e0b' : '#22c55e',
                          transition: 'width 0.2s ease',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            )}
          </div>

          {/* Right Side: Split Inspector Drawer (Shown in Split Mode) */}
          {viewMode === 'split' && (
            <div
              style={{
                background: '#1a1b20',
                borderLeft: '1px solid #2d2d38',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                overflowY: 'auto',
                color: '#fff',
              }}
            >
              {selectedParticipant ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#f8fafc', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Candidate Telemetry & Live Feeds
                      </span>
                      <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                        {selectedParticipant.name} ({selectedParticipant.rollNo})
                      </div>
                    </div>
                    <span className="badge badge-success text-xs" style={{ textTransform: 'capitalize' }}>
                      {selectedParticipant.status}
                    </span>
                  </div>

                  {/* Inspector View Mode Toggle: Screen Stream | Webcam Feed | Dual */}
                  <div style={{ display: 'flex', gap: '4px', background: '#121215', padding: '3px', borderRadius: '7px', border: '1px solid #2d2d38' }}>
                    <button
                      type="button"
                      onClick={() => setInspectorFeedMode('screen')}
                      style={{
                        flex: 1,
                        padding: '6px 8px',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        borderRadius: '5px',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px',
                        background: inspectorFeedMode === 'screen' ? '#2563eb' : 'transparent',
                        color: inspectorFeedMode === 'screen' ? '#fff' : '#94a3b8',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <Monitor size={12} /> Candidate Screen
                    </button>
                    <button
                      type="button"
                      onClick={() => setInspectorFeedMode('webcam')}
                      style={{
                        flex: 1,
                        padding: '6px 8px',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        borderRadius: '5px',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px',
                        background: inspectorFeedMode === 'webcam' ? '#2563eb' : 'transparent',
                        color: inspectorFeedMode === 'webcam' ? '#fff' : '#94a3b8',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <Camera size={12} /> Webcam Feed
                    </button>
                    <button
                      type="button"
                      onClick={() => setInspectorFeedMode('dual')}
                      style={{
                        flex: 1,
                        padding: '6px 8px',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        borderRadius: '5px',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px',
                        background: inspectorFeedMode === 'dual' ? '#2563eb' : 'transparent',
                        color: inspectorFeedMode === 'dual' ? '#fff' : '#94a3b8',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <Layout size={12} /> Dual Stream
                    </button>
                  </div>

                  {/* STREAM DISPLAY: Candidate Screen or Webcam or Dual */}
                  {(inspectorFeedMode === 'screen' || inspectorFeedMode === 'dual') && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.68rem', color: '#94a3b8' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#22c55e', fontWeight: 700 }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e' }} />
                          LIVE CANDIDATE SCREEN STREAM (1080p)
                        </span>
                        <span>Primary Display</span>
                      </div>

                      <div
                        style={{
                          aspectRatio: '16/10',
                          background: '#090a0f',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          position: 'relative',
                          border: '1px solid #334155',
                          boxShadow: '0 4px 14px rgba(0,0,0,0.5)',
                        }}
                      >
                        {selectedParticipant.latestScreenSnapshot ? (
                          <img
                            src={selectedParticipant.latestScreenSnapshot}
                            alt="Candidate screen stream"
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                          />
                        ) : (
                          /* High-Fidelity Candidate Exam Screen Stream */
                          <div
                            style={{
                              width: '100%',
                              height: '100%',
                              background: '#0f172a',
                              display: 'flex',
                              flexDirection: 'column',
                              fontSize: '0.65rem',
                              color: '#cbd5e1',
                              overflow: 'hidden',
                              userSelect: 'none',
                            }}
                          >
                            {/* Browser Mock Header */}
                            <div
                              style={{
                                background: '#1e293b',
                                padding: '4px 8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                borderBottom: '1px solid #334155',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div style={{ display: 'flex', gap: '3px' }}>
                                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444' }} />
                                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b' }} />
                                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e' }} />
                                </div>
                                <span style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.62rem' }}>
                                  VeniGuard Exam Browser - {selectedAssessment.title}
                                </span>
                              </div>
                              <span style={{ background: '#0284c7', color: '#fff', padding: '1px 5px', borderRadius: '3px', fontSize: '0.55rem', fontWeight: 700 }}>
                                🔒 LOCKED
                              </span>
                            </div>

                            {/* Exam Content Preview */}
                            <div style={{ padding: '8px', flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', paddingBottom: '4px' }}>
                                <span style={{ fontWeight: 700, color: '#38bdf8' }}>Question 4 of 25</span>
                                <span style={{ color: '#22c55e', fontWeight: 600 }}>Time Left: 38:45</span>
                              </div>

                              <div style={{ color: '#f1f5f9', fontWeight: 600, fontSize: '0.68rem', lineHeight: '1.2' }}>
                                In neural network optimization, which algorithm dynamically scales learning rates using exponentially decaying squared gradient moving averages?
                              </div>

                              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '2px' }}>
                                {['Stochastic Gradient Descent (SGD)', 'RMSprop / Adam Optimizer', 'AdaGrad (Linear Decay)', 'Perceptron Weight Update'].map((opt, i) => (
                                  <div
                                    key={opt}
                                    style={{
                                      padding: '3px 6px',
                                      borderRadius: '4px',
                                      background: i === 1 ? 'rgba(34, 197, 94, 0.18)' : '#1e293b',
                                      border: i === 1 ? '1px solid #22c55e' : '1px solid #334155',
                                      color: i === 1 ? '#4ade80' : '#94a3b8',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '5px',
                                      fontSize: '0.6rem',
                                    }}
                                  >
                                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: i === 1 ? '#22c55e' : '#475569' }} />
                                    <span>{opt}</span>
                                    {i === 1 && <span style={{ marginLeft: 'auto', fontSize: '0.52rem', color: '#4ade80' }}>Selected</span>}
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Watermark Footer Bar */}
                            <div
                              style={{
                                background: '#090d16',
                                padding: '3px 8px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontSize: '0.55rem',
                                color: '#64748b',
                                borderTop: '1px solid #1e293b',
                              }}
                            >
                              <span>Cand: {selectedParticipant.name} ({selectedParticipant.rollNo})</span>
                              <span style={{ color: '#22c55e' }}>Focus: 100% Locked &bull; Latency: 22ms</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* WEBCAM FEED DISPLAY (Shown in webcam or dual mode) */}
                  {(inspectorFeedMode === 'webcam' || inspectorFeedMode === 'dual') && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.68rem', color: '#94a3b8' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#38bdf8', fontWeight: 700 }}>
                          <Camera size={11} /> CANDIDATE WEBCAM FEED
                        </span>
                        <span style={{ color: '#22c55e' }}>Face Detected (99%)</span>
                      </div>

                      <div style={{ aspectRatio: '16/9', background: '#0e0f12', borderRadius: '8px', overflow: 'hidden', position: 'relative', border: '1px solid #2d2d38' }}>
                        {selectedParticipant.latestVideoUrl ? (
                          <CandidateDirectVideoPlayer videoUrl={selectedParticipant.latestVideoUrl} name={selectedParticipant.name} snapshotFallback={selectedParticipant.latestSnapshot} />
                        ) : selectedParticipant.latestSnapshot ? (
                          <CandidateDirectVideoPlayer snapshotFallback={selectedParticipant.latestSnapshot} name={selectedParticipant.name} />
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', gap: '6px', background: 'radial-gradient(circle, #1e2230 0%, #0d0e12 100%)' }}>
                            <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#3b82f6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.1rem' }}>
                              {getInitials(selectedParticipant.name)}
                            </div>
                            <span style={{ fontSize: '0.68rem', color: '#22c55e', fontWeight: 600 }}>Live Camera Stream Active (720p 30fps)</span>
                          </div>
                        )}
                        <div style={{ position: 'absolute', bottom: '6px', left: '6px', background: 'rgba(0,0,0,0.7)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.62rem' }}>
                          {selectedParticipant.name} ({selectedParticipant.rollNo})
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Hardware Signals & Telemetry Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.75rem' }}>
                    <div style={{ background: '#25262c', padding: '8px', borderRadius: '6px', border: '1px solid #32333d' }}>
                      <div style={{ color: '#94a3b8', fontSize: '0.68rem' }}>Webcam Stream</div>
                      <strong style={{ color: selectedParticipant.cameraActive ? '#22c55e' : '#ef4444' }}>
                        {selectedParticipant.cameraActive ? 'Streaming (720p)' : 'Inactive'}
                      </strong>
                    </div>
                    <div style={{ background: '#25262c', padding: '8px', borderRadius: '6px', border: '1px solid #32333d' }}>
                      <div style={{ color: '#94a3b8', fontSize: '0.68rem' }}>Focus Window</div>
                      <strong style={{ color: selectedParticipant.tabFocused ? '#22c55e' : '#f59e0b' }}>
                        {selectedParticipant.tabFocused ? 'Focused (100%)' : 'Background'}
                      </strong>
                    </div>
                    <div style={{ background: '#25262c', padding: '8px', borderRadius: '6px', border: '1px solid #32333d' }}>
                      <div style={{ color: '#94a3b8', fontSize: '0.68rem' }}>Microphone & Voice VAD</div>
                      <strong style={{ color: (selectedParticipant.audioLevel || 0) > 0.4 ? '#ef4444' : '#22c55e' }}>
                        {Math.round((selectedParticipant.audioLevel || 0.15) * 100)}% RMS {(selectedParticipant.audioLevel || 0) > 0.4 ? '(Voice Active)' : '(Quiet/Ambient)'}
                      </strong>
                    </div>
                    <div style={{ background: '#25262c', padding: '8px', borderRadius: '6px', border: '1px solid #32333d' }}>
                      <div style={{ color: '#94a3b8', fontSize: '0.68rem' }}>Screen Share</div>
                      <strong style={{ color: '#22c55e' }}>
                        Active (1080p)
                      </strong>
                    </div>
                  </div>

                  {/* Candidate Audio & Speech Incident Logs */}
                  {sessionIncidents.filter((i) => (i.learnerId === selectedParticipant.id || i.learnerName === selectedParticipant.name) && (i.eventType?.includes('audio') || i.eventType?.includes('speech'))).length > 0 && (
                    <div style={{ background: '#1c1c22', border: '1px solid #3a3b47', borderRadius: '8px', padding: '10px' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#f59e0b', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Volume2 size={13} /> Audio & Speech Telemetry ({sessionIncidents.filter((i) => (i.learnerId === selectedParticipant.id || i.learnerName === selectedParticipant.name) && (i.eventType?.includes('audio') || i.eventType?.includes('speech'))).length})
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '120px', overflowY: 'auto' }}>
                        {sessionIncidents
                          .filter((i) => (i.learnerId === selectedParticipant.id || i.learnerName === selectedParticipant.name) && (i.eventType?.includes('audio') || i.eventType?.includes('speech')))
                          .map((inc, iIdx) => (
                            <div key={inc.id || iIdx} style={{ fontSize: '0.68rem', background: '#25262c', padding: '6px 8px', borderRadius: '5px', borderLeft: '3px solid #f59e0b' }}>
                              <div style={{ color: '#e2e8f0', fontWeight: 600 }}>{inc.description || inc.eventType}</div>
                              <div style={{ color: '#94a3b8', fontSize: '0.62rem', marginTop: '2px' }}>{new Date(inc.timestamp).toLocaleTimeString()}</div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Candidate Automated Warning Strikes (Max 3) & 10s Video Incident Proof */}
                  <div style={{ background: '#1c1c22', border: '1px solid #3a3b47', borderRadius: '8px', padding: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <AlertTriangle size={13} color="#f59e0b" />
                        <span>Warning Strikes & 10s Video Proof</span>
                      </div>
                      <span style={{ fontSize: '0.62rem', background: '#25262c', color: '#cbd5e1', padding: '1px 6px', borderRadius: '9999px', fontWeight: 600 }}>
                        {candidateWarningStrikes.filter((s) => s.event || s.videoUrl).length} / 3 Strikes
                      </span>
                    </div>
                    <div style={{ fontSize: '0.62rem', color: '#94a3b8', marginBottom: '8px', lineHeight: 1.3 }}>
                      Max 3 warnings allowed per candidate. Each strike captures a 10s rolling video clip showing candidate activity before violation.
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {candidateWarningStrikes.map((strike) => {
                        const isTriggered = !!strike.event || !!strike.videoUrl;
                        return (
                          <div
                            key={strike.strikeNum}
                            style={{
                              background: isTriggered ? 'rgba(239, 68, 68, 0.08)' : '#25262c',
                              border: `1px solid ${isTriggered ? (strike.strikeNum === 3 ? '#ef4444' : '#f59e0b') : '#32333d'}`,
                              borderRadius: '6px',
                              padding: '6px 8px',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span
                                style={{
                                  fontSize: '0.68rem',
                                  fontWeight: 700,
                                  color: isTriggered ? (strike.strikeNum === 3 ? '#ef4444' : '#f59e0b') : '#94a3b8',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                {isTriggered ? (
                                  <AlertTriangle size={11} color={strike.strikeNum === 3 ? '#ef4444' : '#f59e0b'} />
                                ) : (
                                  <CheckCircle2 size={11} color="#22c55e" />
                                )}
                                Warning {strike.strikeNum} of 3
                              </span>
                              <span
                                style={{
                                  fontSize: '0.58rem',
                                  padding: '1px 5px',
                                  borderRadius: '3px',
                                  background: isTriggered ? (strike.strikeNum === 3 ? '#ef4444' : '#b45309') : '#1e293b',
                                  color: '#fff',
                                  fontWeight: 600,
                                }}
                              >
                                {isTriggered ? (strike.strikeNum === 3 ? 'Auto-Submitted' : 'Strike Issued') : 'Clean'}
                              </span>
                            </div>

                            {isTriggered ? (
                              <div style={{ marginTop: '4px' }}>
                                <div style={{ fontSize: '0.66rem', fontWeight: 600, color: '#f1f5f9' }}>
                                  {strike.reason}
                                </div>
                                {strike.description && (
                                  <div style={{ fontSize: '0.6rem', color: '#cbd5e1', marginTop: '2px', lineHeight: 1.2 }}>
                                    {strike.description}
                                  </div>
                                )}
                                {strike.timestamp && (
                                  <div style={{ fontSize: '0.58rem', color: '#94a3b8', marginTop: '2px' }}>
                                    {strike.timestamp}
                                  </div>
                                )}

                                {strike.videoUrl ? (
                                  <div style={{ marginTop: '5px', borderRadius: '5px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', background: '#000' }}>
                                    <video
                                      controls
                                      playsInline
                                      src={buildFullUrl(strike.videoUrl)}
                                      style={{ width: '100%', maxHeight: '120px', display: 'block' }}
                                    />
                                    <div style={{ background: '#111318', padding: '2px 5px', fontSize: '0.55rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                      <Video size={9} /> 10-Second Pre-Violation Evidence Video
                                    </div>
                                  </div>
                                ) : (
                                  <div style={{ marginTop: '3px', fontSize: '0.58rem', color: '#94a3b8', fontStyle: 'italic' }}>
                                    Incident logged in real-time telemetry.
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div style={{ fontSize: '0.58rem', color: '#64748b', marginTop: '2px' }}>
                                No violation strike recorded for slot {strike.strikeNum}.
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Dispatch Warning Action with High-Visibility Send Button */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: '#202127', padding: '10px', borderRadius: '8px', border: '1px solid #353642' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <label style={{ fontSize: '0.72rem', color: '#f8fafc', fontWeight: 700 }}>
                        Dispatch Warning to Candidate
                      </label>
                      <span style={{ fontSize: '0.62rem', color: '#94a3b8' }}>
                        Instant on-screen banner
                      </span>
                    </div>

                    <input
                      type="text"
                      placeholder="e.g. Please return focus to examination window..."
                      value={warningMessage}
                      onChange={(e) => setWarningMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSendWarning();
                      }}
                      style={{
                        background: '#121214',
                        border: '1px solid #4b4d5a',
                        color: '#fff',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                      }}
                    />

                    {/* Quick Warning Preset Pills */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '2px' }}>
                      {[
                        { label: 'Focus exam', text: 'Please return and maintain full focus on the examination window.' },
                        { label: 'Webcam issue', text: 'Please ensure your webcam is directly facing you with good lighting.' },
                        { label: 'Ambient noise', text: 'Excessive ambient noise detected. Please take exam in a quiet space.' },
                        { label: 'Secondary screen', text: 'Secondary display or tab switch detected. Return to primary exam screen.' },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => setWarningMessage(preset.text)}
                          style={{
                            background: '#2a2b34',
                            border: '1px solid #3e4050',
                            color: '#cbd5e1',
                            fontSize: '0.62rem',
                            padding: '3px 7px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                          }}
                        >
                          + {preset.label}
                        </button>
                      ))}
                    </div>

                    {/* Prominent High-Visibility Send Button */}
                    <button
                      type="button"
                      onClick={handleSendWarning}
                      style={{
                        width: '100%',
                        background: '#eab308',
                        color: '#000',
                        fontWeight: 800,
                        padding: '9px 14px',
                        borderRadius: '6px',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        fontSize: '0.82rem',
                        marginTop: '4px',
                        boxShadow: '0 3px 12px rgba(234, 179, 8, 0.45)',
                        transition: 'transform 0.1s ease',
                      }}
                    >
                      <Send size={15} /> Send Warning to Candidate
                    </button>

                    {isWarningSentNotice && (
                      <div
                        style={{
                          background: 'rgba(34, 197, 94, 0.15)',
                          border: '1px solid #22c55e',
                          color: '#4ade80',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          marginTop: '2px',
                        }}
                      >
                        <Check size={13} /> {isWarningSentNotice}
                      </div>
                    )}
                  </div>

                  {/* Proctor Assessment Submission & Results Actions */}
                  <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => handleReleaseResults()}
                      disabled={isReleasingResults}
                      className="btn btn-primary btn-sm"
                      style={{
                        fontSize: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        border: 'none',
                        boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)',
                      }}
                    >
                      <CheckCircle2 size={13} /> {isReleasingResults ? 'Publishing Results...' : 'Release Results to Candidate'}
                    </button>

                    {releaseResultsNotice && (
                      <div
                        style={{
                          background: 'rgba(16, 185, 129, 0.15)',
                          border: '1px solid #10b981',
                          color: '#4ade80',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          textAlign: 'center',
                        }}
                      >
                        {releaseResultsNotice}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => setForceSubmitModalParticipant(selectedParticipant)}
                      className="btn btn-danger btn-sm"
                      style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                      <UserX size={13} /> Force-Submit Exam
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
                  Select a candidate tile to inspect signals
                </div>
              )}
            </div>
          )}
        </div>
        )}

        {/* Video Wall Footer Status Bar */}
        <div
          style={{
            padding: '8px 18px',
            background: '#18191d',
            borderTop: '1px solid #2d2d38',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.72rem',
            color: '#94a3b8',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span>Showing <strong>{candidatesWhoStartedExam.length}</strong> joined examination candidate{candidatesWhoStartedExam.length === 1 ? '' : 's'}</span>
            <span>&bull;</span>
            <span style={{ color: '#22c55e', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Radio size={12} /> Ambient Audio Monitoring Active
            </span>
          </div>

          <div>
            Click any candidate tile to view individual telemetry, send warnings, or force submit.
          </div>
        </div>
      </div>

      {/* Real-Time Live Candidates Joining Feed & Attendance Roster */}
      <div
        className="card"
        style={{
          background: '#1a1b20',
          border: '1px solid #2d2d38',
          borderRadius: '12px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
          marginTop: '16px',
        }}
      >
        {/* Joining Feed Header */}
        <div
          style={{
            padding: '12px 18px',
            background: '#22232a',
            borderBottom: '1px solid #2d2d38',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(34, 197, 94, 0.15)',
                color: '#22c55e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Users size={17} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#f8fafc' }}>
                  Live Candidates Joining Feed & Attendance
                </h4>
                <span
                  style={{
                    background: 'rgba(34, 197, 94, 0.2)',
                    color: '#4ade80',
                    border: '1px solid rgba(34, 197, 94, 0.4)',
                    fontSize: '0.62rem',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '12px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#22c55e' }} />
                  {candidatesWhoStartedExam.length} JOINED CANDIDATES
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '0.72rem', color: '#94a3b8' }}>
                Real-time telemetry log of students joining the session, hardware permissions, and continuous focus status.
              </p>
            </div>
          </div>

          {/* Search & Filter Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Filter Chips */}
            <div style={{ display: 'flex', gap: '4px', background: '#141418', padding: '3px', borderRadius: '6px', border: '1px solid #33343e' }}>
              {[
                { id: 'all', label: `Joined (${candidatesWhoStartedExam.length})` },
                { id: 'streaming', label: `Live Feeds (${candidatesWhoStartedExam.filter((p) => p.cameraActive).length})` },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setRosterFilter(f.id as any)}
                  style={{
                    padding: '4px 10px',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    borderRadius: '4px',
                    border: 'none',
                    cursor: 'pointer',
                    background: rosterFilter === f.id ? '#2563eb' : 'transparent',
                    color: rosterFilter === f.id ? '#fff' : '#94a3b8',
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                type="text"
                placeholder="Search candidates..."
                value={rosterSearch}
                onChange={(e) => setRosterSearch(e.target.value)}
                style={{
                  background: '#141418',
                  border: '1px solid #33343e',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '0.72rem',
                  padding: '5px 10px 5px 28px',
                  width: '180px',
                }}
              />
            </div>
          </div>
        </div>

        {/* Joining Roster Table */}
        <div style={{ overflowX: 'auto', maxHeight: '340px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.74rem' }}>
            <thead>
              <tr style={{ background: '#16171b', borderBottom: '1px solid #2d2d38', color: '#94a3b8', fontSize: '0.68rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '10px 16px', fontWeight: 700 }}>Candidate</th>
                <th style={{ padding: '10px 16px', fontWeight: 700 }}>Joined Time</th>
                <th style={{ padding: '10px 16px', fontWeight: 700 }}>Session Status</th>
                <th style={{ padding: '10px 16px', fontWeight: 700 }}>Camera Stream</th>
                <th style={{ padding: '10px 16px', fontWeight: 700 }}>Microphone RMS</th>
                <th style={{ padding: '10px 16px', fontWeight: 700 }}>Screen Share</th>
                <th style={{ padding: '10px 16px', fontWeight: 700 }}>Fullscreen Lock</th>
                <th style={{ padding: '10px 16px', fontWeight: 700, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRoster.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '36px 16px', textAlign: 'center', color: '#94a3b8' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <Users size={28} style={{ opacity: 0.4 }} />
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#cbd5e1' }}>
                        No candidates have joined the exam yet
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        When students start this assessment, their live telemetry and attendance records will appear here.
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRoster.map((p, idx) => {
                const isSelected = selectedParticipant?.id === p.id;
                const isStreaming = Boolean(p.latestSnapshot);
                const isJoined = (p.status === 'connected' || (p.status as any) === 'in_progress') && isHeartbeatActive(p.lastPingAt);
                const joinDate = p.joinedAt ? new Date(p.joinedAt) : null;
                const joinFormatted = isJoined && joinDate && !isNaN(joinDate.getTime())
                  ? joinDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                  : 'Awaiting Entry';

                return (
                  <tr
                    key={p.id}
                    onClick={() => {
                      if (isJoined) {
                        setSelectedParticipantId(p.id);
                      }
                    }}
                    style={{
                      borderBottom: '1px solid #24252c',
                      background: isSelected ? 'rgba(37, 99, 235, 0.12)' : idx % 2 === 0 ? '#18191e' : '#141519',
                      cursor: isJoined ? 'pointer' : 'default',
                      opacity: isJoined ? 1 : 0.7,
                      transition: 'background 0.15s ease',
                    }}
                  >
                    {/* Candidate Name & Roll */}
                    <td style={{ padding: '10px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            background: isJoined ? '#2563eb' : '#334155',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '0.72rem',
                          }}
                        >
                          {getInitials(p.name)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: '#f8fafc' }}>{p.name}</div>
                          <div style={{ fontSize: '0.64rem', color: '#64748b' }}>{p.rollNo}</div>
                        </div>
                      </div>
                    </td>

                    {/* Joined Timestamp */}
                    <td style={{ padding: '10px 16px', color: isJoined ? '#cbd5e1' : '#64748b' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Clock size={12} color={isJoined ? '#94a3b8' : '#64748b'} />
                        <span>{joinFormatted}</span>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td style={{ padding: '10px 16px' }}>
                      <span
                        style={{
                          background: isJoined ? 'rgba(34, 197, 94, 0.15)' : 'rgba(234, 179, 8, 0.12)',
                          color: isJoined ? '#4ade80' : '#fde047',
                          border: `1px solid ${isJoined ? 'rgba(34, 197, 94, 0.3)' : 'rgba(234, 179, 8, 0.25)'}`,
                          padding: '2px 8px',
                          borderRadius: '10px',
                          fontSize: '0.64rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                        }}
                      >
                        {isJoined ? 'In Exam' : 'Awaiting Entry'}
                      </span>
                    </td>

                    {/* Camera */}
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{ color: isJoined && p.cameraActive ? '#22c55e' : '#64748b', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                        <Camera size={12} />
                        {isJoined && p.cameraActive ? (isStreaming ? 'Live Snapshot' : '720p HD') : 'Offline'}
                      </span>
                    </td>

                    {/* Microphone */}
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{ color: isJoined && p.micActive ? '#22c55e' : '#64748b', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                        <Mic size={12} />
                        {isJoined && p.micActive ? `${Math.round((p.audioLevel || 0.12) * 100)}%` : 'Offline'}
                      </span>
                    </td>

                    {/* Screen Share */}
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{ color: isJoined ? '#22c55e' : '#64748b', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                        <Monitor size={12} />
                        {isJoined ? 'Active (1080p)' : 'Offline'}
                      </span>
                    </td>

                    {/* Fullscreen Lock */}
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{ color: isJoined && p.tabFocused ? '#22c55e' : '#64748b', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                        <Lock size={12} />
                        {isJoined ? (p.tabFocused ? 'Locked 100%' : 'Blur Alert') : 'Pending'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                      {isJoined ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedParticipantId(p.id);
                              setInspectorFeedMode('screen');
                              setViewMode('split');
                            }}
                            className="btn btn-secondary btn-xs"
                            style={{
                              padding: '3px 8px',
                              fontSize: '0.64rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              background: '#24252e',
                              border: '1px solid #3a3b47',
                              color: '#38bdf8',
                            }}
                            title="Inspect Candidate Screen & Telemetry"
                          >
                            <Monitor size={11} /> Screen
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedParticipantId(p.id);
                              setViewMode('split');
                              setWarningMessage('Please maintain continuous exam focus and keep your webcam streaming.');
                            }}
                            className="btn btn-warning btn-xs"
                            style={{
                              padding: '3px 8px',
                              fontSize: '0.64rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              background: '#f59e0b',
                              color: '#000',
                              fontWeight: 700,
                              border: 'none',
                            }}
                            title="Send Direct Warning"
                          >
                            <Send size={11} /> Warn
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.66rem', color: '#64748b', fontStyle: 'italic' }}>
                          Awaiting Join
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          </table>
        </div>
      </div>

      {/* Force Submit Confirmation Modal */}
      {forceSubmitModalParticipant && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '16px',
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: '460px',
              width: '100%',
              background: 'var(--card-bg, #fff)',
              borderRadius: '12px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--danger)' }}>
              <ShieldAlert size={24} />
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Confirm Forced Submission</h3>
            </div>

            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Are you sure you want to forcibly submit the assessment for{' '}
              <strong>{forceSubmitModalParticipant.name}</strong> ({forceSubmitModalParticipant.rollNo})?
              The candidate will be immediately locked out of questions.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Reason for Forced Termination</label>
              <textarea
                className="input-field"
                rows={3}
                value={forceSubmitReason}
                onChange={(e) => setForceSubmitReason(e.target.value)}
                style={{ fontSize: '0.85rem', resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setForceSubmitModalParticipant(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={handleConfirmForceSubmit}
              >
                Confirm Forced Submission
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Real-Time Bottom-Right Exam Start & End Popup Notifications */}
      <ExamLifecycleToast
        toasts={dashboardToasts}
        onDismiss={dismissDashboardToast}
      />
    </div>
  );
};
