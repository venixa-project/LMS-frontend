import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuthStore } from '../../../lib/store';
import { useProctoringStore, ProctorParticipant } from '../../../lib/proctoringStore';
import { useAssessmentStore } from '../../../lib/assessmentStore';
import { proctoringSocket } from '../../../lib/proctoringSocket';
import { apiClient } from '../../../lib/apiClient';
import { ExamLifecycleToast, ExamLifecycleToastData } from '../../../components/Proctoring/ExamLifecycleToast';
import {
  Shield, Eye, AlertTriangle, CheckCircle2, Clock, X,
  Filter, ShieldAlert, FileText, Camera, Video, Monitor,
  Mic, MicOff, Volume2, Send, RefreshCw, AlertCircle, Check, Copy, ExternalLink,
  ChevronRight, Play, Lock, UserX, Maximize2, Minimize2, Grid, Layout, Users, MessageSquare, Radio, Search,
  Award, ShieldCheck, Square
} from 'lucide-react';

interface LiveProctoringWallProps {
  assessmentId: string;
  assessmentTitle?: string;
  onClose?: () => void;
}

// -------------------------------------------------------------
// Real-Time Video Player (WebRTC MediaStream + Seamless Live Frame Fallback)
// -------------------------------------------------------------
const CandidateLiveVideoTile: React.FC<{
  stream?: MediaStream | null;
  snapshotFallback?: string;
  videoUrl?: string;
  name: string;
}> = ({ stream, snapshotFallback, videoUrl, name }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    if (stream) {
      if (v.srcObject !== stream) {
        v.src = '';
        v.srcObject = stream;
        v.play().catch(() => {});
      }
    } else if (videoUrl) {
      if (v.src !== videoUrl) {
        v.srcObject = null;
        v.src = videoUrl;
        v.play().catch(() => {});
      }
    }
  }, [stream, videoUrl]);

  if (!stream && !videoUrl && snapshotFallback) {
    return (
      <img
        src={snapshotFallback}
        alt={`Live Frame: ${name}`}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: 'scaleX(-1)',
          display: 'block',
          backgroundColor: '#0a0d14',
        }}
      />
    );
  }

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        transform: 'scaleX(-1)',
        display: 'block',
        backgroundColor: '#0a0d14',
      }}
      title={`Live Webcam Stream: ${name}`}
    />
  );
};

export const LiveProctoringWall: React.FC<LiveProctoringWallProps> = ({
  assessmentId,
  assessmentTitle = 'Proctored Examination',
  onClose,
}) => {
  const { user } = useAuthStore();
  const rawAuth = typeof localStorage !== 'undefined' ? localStorage.getItem('venilearn_auth_session') : null;
  let token = '';
  if (rawAuth) {
    try {
      token = JSON.parse(rawAuth).token || '';
    } catch {}
  }
  const {
    participants,
    sessions,
    incidents,
    setCandidateRemoteStream,
    upsertLiveCandidate,
    forceStopCandidateExam,
    sendManualCandidateWarning,
    fetchActiveCandidates,
  } = useProctoringStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<
    'all' | 'live' | 'warnings' | 'critical' | 'manual' | 'automated' | 'pending' | 'terminated'
  >('all');
  const [enlargedCandidateId, setEnlargedCandidateId] = useState<string | null>(null);
  const [gridDensity, setGridDensity] = useState<'compact' | 'standard' | 'large'>('standard');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Manual Warning Modal State
  const [warningModalTarget, setWarningModalTarget] = useState<ProctorParticipant | null>(null);
  const [customWarningReason, setCustomWarningReason] = useState('Please look directly at your screen.');
  const [isSubmittingWarning, setIsSubmittingWarning] = useState(false);

  // Force Stop Confirmation Modal State
  const [stopModalTarget, setStopModalTarget] = useState<ProctorParticipant | null>(null);
  const [stopReason, setStopReason] = useState('Unauthorized mobile phone usage during examination.');
  const [isSubmittingStop, setIsSubmittingStop] = useState(false);

  // Bottom-Right Real-Time Exam Lifecycle Popup Notifications
  const [lifecycleToasts, setLifecycleToasts] = useState<ExamLifecycleToastData[]>([]);

  // Dynamic heartbeat ticker that triggers automatic re-filtration of candidates when heartbeats expire
  const [heartbeatTick, setHeartbeatTick] = useState<number>(Date.now());
  useEffect(() => {
    const timer = setInterval(() => {
      setHeartbeatTick(Date.now());
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  const addLifecycleToast = (type: 'start' | 'end', data: Partial<ExamLifecycleToastData>) => {
    const newToast: ExamLifecycleToastData = {
      id: `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type,
      studentId: data.studentId || 'unknown',
      studentName: data.studentName || 'Student',
      rollNo: data.rollNo,
      assessmentTitle: data.assessmentTitle || assessmentTitle,
      assessmentId: data.assessmentId || assessmentId,
      timestamp: data.timestamp || new Date().toISOString(),
      reason: data.reason,
    };
    setLifecycleToasts((prev) => [...prev.slice(-4), newToast]);
  };

  const dismissLifecycleToast = (id: string) => {
    setLifecycleToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // -------------------------------------------------------------
  // 1. CONNECT REAL-TIME SOCKET & WEBRTC FOR ADMIN VIDEO WALL
  // -------------------------------------------------------------
  useEffect(() => {
    if (!assessmentId) return;

    // Connect as Admin to receive all candidates for this assessment
    proctoringSocket.connect(token || '', assessmentId, 'admin');

    // Fetch initial active candidates from backend
    fetchActiveCandidates(assessmentId);

    // Listen for WebRTC remote streams from candidates
    const unsubStream = proctoringSocket.onRemoteStream((studentId, remoteStream) => {
      setCandidateRemoteStream(studentId, remoteStream);
    });

    // Listen for newly joined candidates
    const unsubJoined = proctoringSocket.on('STUDENT_EXAM_JOINED', (data) => {
      if (data && data.studentId) {
        upsertLiveCandidate({
          id: data.studentId,
          name: data.studentName || 'Student',
          rollNo: data.rollNo,
          assessmentId: data.examId || assessmentId,
          sessionId: data.sessionId,
          status: 'in_progress',
          cameraActive: true,
          micActive: true,
          joinedAt: data.joinedAt || new Date().toISOString(),
          lastPingAt: new Date().toISOString(),
        });
      }
    });

    // Listen for student exam started event (Displays bottom-right popup)
    const unsubStarted = proctoringSocket.on('STUDENT_EXAM_STARTED', (data) => {
      if (data && data.studentId) {
        addLifecycleToast('start', {
          studentId: data.studentId,
          studentName: data.studentName || 'Student',
          rollNo: data.rollNo,
          assessmentTitle,
          assessmentId: data.assessmentId || assessmentId,
          timestamp: data.startedAt || new Date().toISOString(),
        });
        upsertLiveCandidate({
          id: data.studentId,
          name: data.studentName || 'Student',
          rollNo: data.rollNo,
          assessmentId: data.examId || assessmentId,
          sessionId: data.sessionId,
          status: 'in_progress',
          cameraActive: true,
          micActive: true,
          joinedAt: data.startedAt || new Date().toISOString(),
          lastPingAt: new Date().toISOString(),
        });
      }
    });

    // Listen for student exam submitted event (Displays bottom-right popup & removes from live wall)
    const unsubSubmitted = proctoringSocket.on('STUDENT_EXAM_SUBMITTED', (data) => {
      if (data && data.studentId) {
        addLifecycleToast('end', {
          studentId: data.studentId,
          studentName: data.studentName || 'Student',
          rollNo: data.rollNo,
          assessmentTitle,
          assessmentId: data.assessmentId || assessmentId,
          timestamp: data.submittedAt || new Date().toISOString(),
          reason: data.reason || 'Candidate submitted examination',
        });
        // Immediately remove student from the live monitoring wall
        useProctoringStore.getState().removeLiveCandidate(data.studentId, assessmentId);
      }
    });

    // Alias EXAM_SUBMITTED
    const unsubExamSubmitted = proctoringSocket.on('EXAM_SUBMITTED', (data) => {
      if (data && data.studentId) {
        addLifecycleToast('end', {
          studentId: data.studentId,
          studentName: data.studentName || 'Student',
          rollNo: data.rollNo,
          assessmentTitle,
          assessmentId: data.assessmentId || assessmentId,
          timestamp: data.submittedAt || new Date().toISOString(),
          reason: data.reason || 'Candidate finalized examination',
        });
        useProctoringStore.getState().removeLiveCandidate(data.studentId, assessmentId);
      }
    });

    // Listen for candidates ready with video stream
    const unsubReady = proctoringSocket.on('STUDENT_VIDEO_STREAM_READY', (data) => {
      if (data && data.studentId) {
        upsertLiveCandidate({
          id: data.studentId,
          name: data.studentName || 'Student',
          assessmentId: data.assessmentId || assessmentId,
          sessionId: data.sessionId,
          status: 'in_progress',
          cameraActive: true,
          latestSnapshot: data.latestSnapshot,
          lastPingAt: new Date().toISOString(),
        });
      }
    });

    // Listen for candidate video disconnected (Immediately remove from active wall)
    const unsubDisconnect = proctoringSocket.on('STUDENT_VIDEO_DISCONNECTED', (data) => {
      if (data && data.studentId) {
        useProctoringStore.getState().removeLiveCandidate(data.studentId, assessmentId);
      }
    });

    // Listen for candidate video reconnected
    const unsubReconnect = proctoringSocket.on('STUDENT_VIDEO_RECONNECTED', (data) => {
      if (data && data.studentId) {
        upsertLiveCandidate({
          id: data.studentId,
          name: data.studentName || 'Student',
          assessmentId: data.assessmentId || assessmentId,
          status: 'in_progress',
          cameraActive: true,
          lastPingAt: new Date().toISOString(),
        });
      }
    });

    // Listen for incoming proctoring warnings (automated or manual)
    const unsubWarning = proctoringSocket.on('PROCTORING_WARNING', (data) => {
      if (data && data.studentId) {
        upsertLiveCandidate({
          id: data.studentId,
          name: data.studentName || 'Student',
          assessmentId: data.assessmentId || assessmentId,
          sessionId: data.sessionId,
          activeWarningCount: data.warningCount || 1,
          latestSnapshot: data.evidenceSnapshot,
          latestEvent: {
            type: data.eventType || 'PROCTORING_WARNING',
            reason: data.message || data.title || data.reason || 'Proctoring violation',
            source: data.source || 'automated',
            timestamp: data.timestamp || new Date().toISOString(),
            severity: data.severity || 'warning',
          },
        });
      }
    });

    // Listen for warning acknowledged by student
    const unsubAck = proctoringSocket.on('WARNING_ACKNOWLEDGED', (data) => {
      if (data && data.studentId) {
        upsertLiveCandidate({
          id: data.studentId,
          name: data.studentName || 'Student',
          assessmentId: data.assessmentId || assessmentId,
          latestEvent: {
            type: 'WARNING_ACKNOWLEDGED',
            reason: 'Student acknowledged warning and returned to exam',
            source: 'automated',
            timestamp: new Date().toISOString(),
            severity: 'informational',
          },
        });
      }
    });

    // Listen for exam termination
    const unsubTerminated = proctoringSocket.on('EXAM_TERMINATED', (data) => {
      if (data && data.studentId) {
        addLifecycleToast('end', {
          studentId: data.studentId,
          studentName: data.studentName || 'Student',
          rollNo: data.rollNo,
          assessmentTitle,
          assessmentId: data.assessmentId || assessmentId,
          timestamp: data.terminatedAt || new Date().toISOString(),
          reason: data.reason || 'Examination terminated by Administrator',
        });
        useProctoringStore.getState().removeLiveCandidate(data.studentId, assessmentId);
      }
    });

    // Listen for suppressed proctoring violation during cooldown
    const unsubSuppressed = proctoringSocket.on('PROCTORING_VIOLATION_SUPPRESSED', (data) => {
      if (data && data.studentId) {
        upsertLiveCandidate({
          id: data.studentId,
          name: data.studentName || 'Student',
          assessmentId: data.assessmentId || assessmentId,
          latestEvent: {
            type: 'VIOLATION_SUPPRESSED',
            reason: `Violation suppressed: ${data.remainingCooldown || 0}s cooldown remaining (${data.violationType})`,
            source: 'automated',
            timestamp: data.timestamp || new Date().toISOString(),
            severity: 'informational',
          },
        });
      }
    });

    // Listen for three-strike auto-submitted examination
    const unsubAutoSubmit = proctoringSocket.on('EXAM_AUTO_SUBMITTED', (data) => {
      if (data && data.studentId) {
        addLifecycleToast('end', {
          studentId: data.studentId,
          studentName: data.studentName || 'Student',
          rollNo: data.rollNo,
          assessmentTitle,
          assessmentId: data.assessmentId || assessmentId,
          timestamp: data.submittedAt || new Date().toISOString(),
          reason: 'Auto-submitted after 3rd proctoring warning strike',
        });
        useProctoringStore.getState().removeLiveCandidate(data.studentId, assessmentId);
      }
    });

    // Periodic candidate list refresher
    const pollInterval = setInterval(() => {
      fetchActiveCandidates(assessmentId);
    }, 4000);

    return () => {
      unsubStream();
      unsubJoined();
      unsubStarted();
      unsubSubmitted();
      unsubExamSubmitted();
      unsubReady();
      unsubDisconnect();
      unsubReconnect();
      unsubWarning();
      unsubAck();
      unsubTerminated();
      unsubSuppressed();
      unsubAutoSubmit();
      clearInterval(pollInterval);
    };
  }, [assessmentId, token]);

  // -------------------------------------------------------------
  // 2. CANDIDATES ROSTER & FILTERING
  // Strictly filters for candidates who are actively writing the exam
  // -------------------------------------------------------------
  const allExamCandidates = useMemo(() => {
    const list: ProctorParticipant[] = [];
    const seen = new Set<string>();
    const now = Date.now();

    // 1. From real participants state for this assessment (must be active with recent heartbeat)
    participants
      .filter((p) => {
        if (p.assessmentId !== assessmentId || p.id === user?.id) return false;
        if (
          p.status === 'submitted' ||
          p.status === 'completed' ||
          p.status === 'terminated' ||
          p.status === 'disconnected'
        ) {
          return false;
        }
        const pingTime = new Date(p.lastPingAt || 0).getTime();
        const isFresh = !isNaN(pingTime) && pingTime > 0 && (now - pingTime) < 35000;
        return isFresh && (p.status === 'in_progress' || p.status === 'connected');
      })
      .forEach((p) => {
        if (!seen.has(p.id)) {
          seen.add(p.id);
          list.push(p);
        }
      });

    // 2. From sessions actively in progress (STRICT: Requires active fresh heartbeat < 35s)
    sessions
      .filter((s) => {
        if (s.assessmentId !== assessmentId || s.learnerId === user?.id) return false;
        if (s.status !== 'in_progress' || s.endedAt) return false;

        const latestEvTime = (s.events || []).reduce((max: number, ev: any) => {
          const t = (ev.createdAt || ev.timestamp) ? new Date(ev.createdAt || ev.timestamp).getTime() : (ev.clientTimestamp ? Number(ev.clientTimestamp) : 0);
          return t > max ? t : max;
        }, 0);
        const startedMs = s.startedAt ? new Date(s.startedAt).getTime() : 0;
        const pingTime = latestEvTime > 0 ? latestEvTime : startedMs;
        const isFresh = !isNaN(pingTime) && pingTime > 0 && (now - pingTime) < 35000;
        return isFresh;
      })
      .forEach((s) => {
        if (!seen.has(s.learnerId)) {
          seen.add(s.learnerId);
          const latestEvTime = (s.events || []).reduce((max: number, ev: any) => {
            const t = (ev.createdAt || ev.timestamp) ? new Date(ev.createdAt || ev.timestamp).getTime() : (ev.clientTimestamp ? Number(ev.clientTimestamp) : 0);
            return t > max ? t : max;
          }, 0);
          const lastPingIso = latestEvTime > 0 ? new Date(latestEvTime).toISOString() : (s.startedAt || new Date().toISOString());
          list.push({
            id: s.learnerId,
            name: s.learnerName,
            rollNo: (s as any).rollNo || `STU-${s.learnerId.slice(-4)}`,
            assessmentId: s.assessmentId,
            status: 'connected',
            cameraActive: s.activeWebcam ?? true,
            micActive: s.activeMic ?? true,
            audioLevel: 0.15,
            screenShareActive: s.activeScreenShare ?? false,
            tabFocused: s.isFullscreen ?? true,
            faceDetected: true,
            joinedAt: s.startedAt || new Date().toISOString(),
            lastPingAt: lastPingIso,
            activeWarningCount: s.warnings?.length || 0,
            sessionId: s.id,
          });
        }
      });

    return list;
  }, [participants, sessions, assessmentId, user?.id, heartbeatTick]);

  // Apply Search & Filters
  const filteredCandidates = useMemo(() => {
    return allExamCandidates.filter((c) => {
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = c.name.toLowerCase().includes(q);
        const matchesId = c.id.toLowerCase().includes(q);
        const matchesRoll = c.rollNo?.toLowerCase().includes(q);
        if (!matchesName && !matchesId && !matchesRoll) return false;
      }

      // Mode filter
      switch (filterMode) {
        case 'live':
          return c.status === 'connected' && c.cameraActive;
        case 'warnings':
          return c.activeWarningCount > 0;
        case 'critical':
          return c.activeWarningCount >= 3 || c.latestEvent?.severity === 'critical';
        case 'manual':
          return c.latestEvent?.source === 'manual';
        case 'automated':
          return c.latestEvent?.source === 'automated';
        case 'terminated':
          return c.status === 'terminated';
        case 'pending':
          return c.status === 'reconnecting' || c.status === 'disconnected';
        default:
          return true;
      }
    });
  }, [allExamCandidates, searchQuery, filterMode]);

  // Selected Candidate for Enlarged / Zoom View
  const enlargedCandidate = useMemo(() => {
    if (!enlargedCandidateId) return null;
    return allExamCandidates.find((c) => c.id === enlargedCandidateId) || null;
  }, [allExamCandidates, enlargedCandidateId]);

  // -------------------------------------------------------------
  // 3. ADMIN ACTION HANDLERS
  // -------------------------------------------------------------
  const handleOpenManualWarning = (candidate: ProctorParticipant, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setWarningModalTarget(candidate);
    setCustomWarningReason('Suspicious eye gaze or movement detected. Please face the screen directly.');
  };

  const handleSendManualWarning = async () => {
    if (!warningModalTarget) return;
    setIsSubmittingWarning(true);
    try {
      const sessionId = warningModalTarget.sessionId || `session-${warningModalTarget.id}`;
      await sendManualCandidateWarning(
        sessionId,
        warningModalTarget.id,
        assessmentId,
        customWarningReason
      );

      // Emit via real-time proctoring socket
      proctoringSocket.emit('MANUAL_WARNING', {
        assessmentId,
        studentId: warningModalTarget.id,
        sessionId,
        reason: customWarningReason,
      });

      setWarningModalTarget(null);
    } catch (err: any) {
      console.warn('Failed to issue manual warning:', err);
    } finally {
      setIsSubmittingWarning(false);
    }
  };

  const handleOpenStopExam = (candidate: ProctorParticipant, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setStopModalTarget(candidate);
    setStopReason('Unauthorized mobile phone usage during examination.');
  };

  const handleConfirmStopExam = async () => {
    if (!stopModalTarget) return;
    setIsSubmittingStop(true);
    try {
      const sessionId = stopModalTarget.sessionId || `session-${stopModalTarget.id}`;
      await forceStopCandidateExam(
        sessionId,
        stopModalTarget.id,
        assessmentId,
        stopReason
      );

      // Emit via real-time proctoring socket
      proctoringSocket.emit('ADMIN_FORCE_STOP', {
        assessmentId,
        studentId: stopModalTarget.id,
        sessionId,
        reason: stopReason,
      });

      setStopModalTarget(null);
      if (enlargedCandidateId === stopModalTarget.id) {
        setEnlargedCandidateId(null);
      }
    } catch (err: any) {
      console.warn('Failed to stop exam:', err);
    } finally {
      setIsSubmittingStop(false);
    }
  };

  // Helper to calculate exam duration in minutes
  const getExamDuration = (joinedAt?: string) => {
    if (!joinedAt) return '0m';
    const joined = new Date(joinedAt).getTime();
    if (isNaN(joined)) return '0m';
    const mins = Math.max(0, Math.floor((Date.now() - joined) / 60000));
    return `${mins}m`;
  };

  // Grid style based on density
  const gridColumns = useMemo(() => {
    switch (gridDensity) {
      case 'compact':
        return 'repeat(auto-fill, minmax(240px, 1fr))';
      case 'large':
        return 'repeat(auto-fill, minmax(420px, 1fr))';
      default:
        return 'repeat(auto-fill, minmax(320px, 1fr))';
    }
  }, [gridDensity]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '18px',
        background: 'var(--bg-main)',
        minHeight: '600px',
      }}
    >
      {/* ------------------------------------------------------------- */}
      {/* HEADER CONTROLS & LIVE TELEMETRY BAR                          */}
      {/* ------------------------------------------------------------- */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px',
          background: 'var(--bg-card)',
          padding: '16px 20px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #2563EB 0%, #EC4899 100%)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.35)',
            }}
          >
            <Video size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                Live Admin Proctoring Wall
              </h2>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '3px 8px',
                  borderRadius: '12px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  color: '#10b981',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                }}
              >
                <span
                  style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    background: '#10b981',
                    boxShadow: '0 0 8px #10b981',
                    display: 'inline-block',
                  }}
                />
                Live WebRTC Wall
              </span>
            </div>
            <p className="text-secondary text-xs" style={{ margin: '2px 0 0 0' }}>
              Monitoring candidate video streams for <strong style={{ color: 'var(--text-main)' }}>{assessmentTitle}</strong>
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Policy Interval Badge */}
          <div
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              fontSize: '0.78rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: '#F59E0B',
            }}
          >
            <AlertTriangle size={13} />
            <span>Policy: 3 Strikes (Auto-Submit)</span>
          </div>

          {/* Candidates Count Pill */}
          <div
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.8rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: 'var(--text-main)',
            }}
          >
            <Users size={14} color="#3b82f6" />
            <span>Connected Candidates: <strong>{filteredCandidates.length}</strong></span>
          </div>

          {/* Density Toggles */}
          <div style={{ display: 'flex', background: 'var(--bg-input)', borderRadius: '6px', padding: '2px', border: '1px solid var(--border-subtle)' }}>
            <button
              type="button"
              className={`btn btn-xs ${gridDensity === 'compact' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setGridDensity('compact')}
              title="Compact View"
              style={{ fontSize: '0.72rem', padding: '4px 8px' }}
            >
              Compact
            </button>
            <button
              type="button"
              className={`btn btn-xs ${gridDensity === 'standard' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setGridDensity('standard')}
              title="Standard View"
              style={{ fontSize: '0.72rem', padding: '4px 8px' }}
            >
              Standard
            </button>
            <button
              type="button"
              className={`btn btn-xs ${gridDensity === 'large' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setGridDensity('large')}
              title="Large View"
              style={{ fontSize: '0.72rem', padding: '4px 8px' }}
            >
              Large
            </button>
          </div>

          {/* Refresh Candidates */}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => fetchActiveCandidates(assessmentId)}
            title="Refresh Candidate Feeds"
            style={{ fontSize: '0.78rem', gap: '6px' }}
          >
            <RefreshCw size={13} />
            Refresh
          </button>

          {onClose && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={onClose}
              title="Close Proctor Wall"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* FILTER BAR & REAL-TIME SEARCH                                 */}
      {/* ------------------------------------------------------------- */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          background: 'var(--bg-card)',
          padding: '12px 18px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: '340px' }}>
          <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search candidate name or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              paddingLeft: '32px',
              paddingRight: '12px',
              height: '34px',
              fontSize: '0.8rem',
              borderRadius: '6px',
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-input)',
              color: 'var(--text-main)',
            }}
          />
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`btn btn-xs ${filterMode === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilterMode('all')}
            style={{ fontSize: '0.75rem', fontWeight: 600 }}
          >
            All Candidates ({allExamCandidates.length})
          </button>
          <button
            type="button"
            className={`btn btn-xs ${filterMode === 'live' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilterMode('live')}
            style={{ fontSize: '0.75rem', fontWeight: 600 }}
          >
            Live Video ({allExamCandidates.filter((c) => c.status === 'connected' && c.cameraActive).length})
          </button>
          <button
            type="button"
            className={`btn btn-xs ${filterMode === 'warnings' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilterMode('warnings')}
            style={{ fontSize: '0.75rem', fontWeight: 600, color: filterMode !== 'warnings' ? '#f59e0b' : undefined }}
          >
            Active Warnings ({allExamCandidates.filter((c) => c.activeWarningCount > 0).length})
          </button>
          <button
            type="button"
            className={`btn btn-xs ${filterMode === 'critical' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilterMode('critical')}
            style={{ fontSize: '0.75rem', fontWeight: 600, color: filterMode !== 'critical' ? '#ef4444' : undefined }}
          >
            Critical Flags ({allExamCandidates.filter((c) => c.activeWarningCount >= 3 || c.latestEvent?.severity === 'critical').length})
          </button>
          <button
            type="button"
            className={`btn btn-xs ${filterMode === 'manual' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilterMode('manual')}
            style={{ fontSize: '0.75rem', fontWeight: 600 }}
          >
            Manual Flags ({allExamCandidates.filter((c) => c.latestEvent?.source === 'manual').length})
          </button>
          <button
            type="button"
            className={`btn btn-xs ${filterMode === 'automated' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilterMode('automated')}
            style={{ fontSize: '0.75rem', fontWeight: 600 }}
          >
            Automated Events ({allExamCandidates.filter((c) => c.latestEvent?.source === 'automated').length})
          </button>
          <button
            type="button"
            className={`btn btn-xs ${filterMode === 'terminated' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilterMode('terminated')}
            style={{ fontSize: '0.75rem', fontWeight: 600, color: filterMode !== 'terminated' ? '#94a3b8' : undefined }}
          >
            Terminated ({allExamCandidates.filter((c) => c.status === 'terminated').length})
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* CANDIDATE VIDEO GRID                                          */}
      {/* ------------------------------------------------------------- */}
      {filteredCandidates.length === 0 ? (
        <div
          style={{
            padding: '60px 20px',
            textAlign: 'center',
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <Camera size={44} color="#64748b" style={{ margin: '0 auto 14px', opacity: 0.7 }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 6px 0', color: '#f8fafc' }}>
            No Students Currently Writing Exam
          </h3>
          <p className="text-secondary text-xs" style={{ maxWidth: '460px', margin: '0 auto', lineHeight: 1.5 }}>
            Candidates will automatically reflect on this live video wall the moment they click <strong>"Start Assessment"</strong>, and will disappear immediately upon completing or submitting their exam.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: gridColumns,
            gap: '16px',
          }}
        >
          {filteredCandidates.map((candidate) => {
            const isLive = candidate.status === 'connected' && candidate.cameraActive;
            const isTerminated = candidate.status === 'terminated';
            const warningCount = candidate.activeWarningCount || 0;
            const isCritical = warningCount >= 3 || candidate.latestEvent?.severity === 'critical';
            const isSuspicious = warningCount > 0 && !isCritical;
            const duration = getExamDuration(candidate.joinedAt);

            // Border styling based on proctor status
            const borderColor = isTerminated
              ? '#6b7280'
              : isCritical
              ? '#ef4444'
              : isSuspicious
              ? '#f59e0b'
              : isLive
              ? 'rgba(16, 185, 129, 0.4)'
              : 'var(--border-subtle)';

            return (
              <div
                key={candidate.id}
                style={{
                  background: 'var(--bg-card)',
                  borderRadius: 'var(--radius-md)',
                  border: `2px solid ${borderColor}`,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: isCritical
                    ? '0 0 16px rgba(239, 68, 68, 0.25)'
                    : isSuspicious
                    ? '0 0 12px rgba(245, 158, 11, 0.2)'
                    : '0 2px 10px rgba(0, 0, 0, 0.2)',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                }}
              >
                {/* VIDEO CONTAINER */}
                <div
                  style={{
                    position: 'relative',
                    aspectRatio: '16/9',
                    background: '#090c15',
                    cursor: 'pointer',
                  }}
                  onClick={() => setEnlargedCandidateId(candidate.id)}
                >
                  <CandidateLiveVideoTile
                    stream={candidate.remoteStream}
                    snapshotFallback={candidate.latestSnapshot}
                    videoUrl={candidate.latestVideoUrl}
                    name={candidate.name}
                  />

                  {/* TOP OVERLAYS: Connection status & Enlarge button */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '8px',
                      left: '8px',
                      right: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      pointerEvents: 'none',
                    }}
                  >
                    {/* Live connection badge */}
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '2px 7px',
                        borderRadius: '4px',
                        background: 'rgba(0, 0, 0, 0.75)',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        color: isTerminated
                          ? '#ef4444'
                          : isLive
                          ? '#10b981'
                          : '#f59e0b',
                        backdropFilter: 'blur(4px)',
                      }}
                    >
                      <span
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: isTerminated
                            ? '#ef4444'
                            : isLive
                            ? '#10b981'
                            : '#f59e0b',
                          boxShadow: isLive ? '0 0 6px #10b981' : 'none',
                        }}
                      />
                      {isTerminated ? 'Terminated' : isLive ? 'Live WebRTC' : 'Reconnecting'}
                    </span>

                    {/* Enlarge button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEnlargedCandidateId(candidate.id);
                      }}
                      style={{
                        pointerEvents: 'auto',
                        background: 'rgba(0, 0, 0, 0.65)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        color: '#fff',
                        borderRadius: '4px',
                        padding: '3px 6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.68rem',
                        cursor: 'pointer',
                        backdropFilter: 'blur(4px)',
                      }}
                    >
                      <Maximize2 size={11} />
                      Enlarge
                    </button>
                  </div>

                  {/* BOTTOM OVERLAYS: Mic & Duration */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '6px',
                      left: '8px',
                      right: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      pointerEvents: 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {/* Audio Level Indicator */}
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          background: 'rgba(0, 0, 0, 0.7)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '0.65rem',
                          color: candidate.micActive ? '#10b981' : '#ef4444',
                        }}
                      >
                        {candidate.micActive ? <Mic size={10} /> : <MicOff size={10} />}
                        {/* Audio VU meter level bar */}
                        <div
                          style={{
                            width: '24px',
                            height: '5px',
                            background: 'rgba(255, 255, 255, 0.2)',
                            borderRadius: '2px',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              width: `${Math.min(100, Math.round((candidate.audioLevel || 0.1) * 100))}%`,
                              height: '100%',
                              background: '#10b981',
                              transition: 'width 0.1s linear',
                            }}
                          />
                        </div>
                      </div>

                      {/* Face verification badge */}
                      <span
                        style={{
                          background: 'rgba(0, 0, 0, 0.7)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '0.62rem',
                          fontWeight: 700,
                          color:
                            candidate.faceVerificationStatus === 'MATCH'
                              ? '#10b981'
                              : candidate.faceVerificationStatus === 'MISMATCH'
                              ? '#ef4444'
                              : (candidate.faceVerificationStatus as string) === 'ABSENT' || candidate.faceVerificationStatus === 'no_face'
                              ? '#f59e0b'
                              : '#60a5fa',
                        }}
                      >
                        {candidate.faceVerificationStatus || 'SCANNING'}
                      </span>
                    </div>

                    <span
                      style={{
                        background: 'rgba(0, 0, 0, 0.7)',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.65rem',
                        fontWeight: 600,
                        color: 'rgba(255, 255, 255, 0.85)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                      }}
                    >
                      <Clock size={9} />
                      {duration}
                    </span>
                  </div>
                </div>

                {/* TILE DETAILS & EVENT STATUS */}
                <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {/* Candidate Name & ID */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 800,
                          fontSize: '0.92rem',
                          color: 'var(--text-main)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {candidate.name}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {candidate.rollNo || `ID: ${candidate.id.slice(0, 8)}`} • {assessmentTitle}
                      </div>
                    </div>

                    {/* Warning Count Badge */}
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        background: isCritical
                          ? 'rgba(239, 68, 68, 0.15)'
                          : isSuspicious
                          ? 'rgba(245, 158, 11, 0.15)'
                          : 'rgba(16, 185, 129, 0.12)',
                        color: isCritical
                          ? '#ef4444'
                          : isSuspicious
                          ? '#f59e0b'
                          : '#10b981',
                        border: `1px solid ${
                          isCritical
                            ? 'rgba(239, 68, 68, 0.35)'
                            : isSuspicious
                            ? 'rgba(245, 158, 11, 0.35)'
                            : 'rgba(16, 185, 129, 0.25)'
                        }`,
                        flexShrink: 0,
                      }}
                      title="Proctoring Warning Strikes (Investigation Signals)"
                    >
                      <AlertTriangle size={11} />
                      {warningCount} {warningCount === 1 ? 'Warning' : 'Warnings'}
                    </div>
                  </div>

                  {/* Latest Proctoring Event / Indicator */}
                  {candidate.latestEvent ? (
                    <div
                      style={{
                        background:
                          candidate.latestEvent.severity === 'critical'
                            ? 'rgba(239, 68, 68, 0.08)'
                            : candidate.latestEvent.source === 'manual'
                            ? 'rgba(99, 102, 241, 0.08)'
                            : 'rgba(245, 158, 11, 0.08)',
                        border: `1px solid ${
                          candidate.latestEvent.severity === 'critical'
                            ? 'rgba(239, 68, 68, 0.3)'
                            : candidate.latestEvent.source === 'manual'
                            ? 'rgba(99, 102, 241, 0.3)'
                            : 'rgba(245, 158, 11, 0.3)'
                        }`,
                        borderRadius: '6px',
                        padding: '6px 8px',
                        fontSize: '0.72rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span
                          style={{
                            fontWeight: 700,
                            color:
                              candidate.latestEvent.severity === 'critical'
                                ? '#ef4444'
                                : candidate.latestEvent.source === 'manual'
                                ? '#818cf8'
                                : '#f59e0b',
                            textTransform: 'uppercase',
                            fontSize: '0.62rem',
                          }}
                        >
                          {candidate.latestEvent.source === 'manual' ? 'Admin Manual Warning' : 'Automated AI Event'}
                        </span>
                        <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>
                          {new Date(candidate.latestEvent.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                      <div style={{ color: 'var(--text-main)', lineHeight: 1.3, fontWeight: 500 }}>
                        {candidate.latestEvent.reason}
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        padding: '6px 8px',
                        borderRadius: '6px',
                        background: 'var(--bg-input)',
                        fontSize: '0.72rem',
                        color: 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <ShieldCheck size={13} color="#10b981" />
                      Candidate activity normal. Zero active violations.
                    </div>
                  )}

                  {/* ACTION CONTROLS: Issue Warning & Stop Exam */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '8px',
                      marginTop: '4px',
                      paddingTop: '8px',
                      borderTop: '1px solid var(--border-subtle)',
                    }}
                  >
                    <button
                      type="button"
                      className="btn btn-secondary btn-xs"
                      onClick={(e) => handleOpenManualWarning(candidate, e)}
                      disabled={isTerminated}
                      style={{
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        gap: '4px',
                        justifyContent: 'center',
                        padding: '6px 0',
                      }}
                    >
                      <Send size={12} />
                      Issue Warning
                    </button>

                    <button
                      type="button"
                      className="btn btn-danger btn-xs"
                      onClick={(e) => handleOpenStopExam(candidate, e)}
                      disabled={isTerminated}
                      style={{
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        gap: '4px',
                        justifyContent: 'center',
                        padding: '6px 0',
                        background: isTerminated ? '#6b7280' : undefined,
                      }}
                    >
                      <UserX size={12} />
                      {isTerminated ? 'Exam Stopped' : 'STOP EXAM'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 1: ENLARGED / ZOOM CANDIDATE INSPECTOR MODAL            */}
      {/* ------------------------------------------------------------- */}
      {enlargedCandidate && (
        <div className="modal-overlay" onClick={() => setEnlargedCandidateId(null)}>
          <div
            className="modal-card"
            style={{ maxWidth: '840px', width: '95%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Video size={20} color="#3b82f6" />
                <h3 style={{ fontSize: '1.15rem', margin: 0, fontWeight: 800 }}>
                  Candidate Live Stream Inspector: {enlargedCandidate.name} ({enlargedCandidate.rollNo})
                </h3>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setEnlargedCandidateId(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* High-res Video Stream */}
              <div
                style={{
                  position: 'relative',
                  aspectRatio: '16/9',
                  background: '#040711',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <CandidateLiveVideoTile
                  stream={enlargedCandidate.remoteStream}
                  snapshotFallback={enlargedCandidate.latestSnapshot}
                  videoUrl={enlargedCandidate.latestVideoUrl}
                  name={enlargedCandidate.name}
                />

                <div
                  style={{
                    position: 'absolute',
                    bottom: '10px',
                    left: '12px',
                    background: 'rgba(0,0,0,0.75)',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <span style={{ color: '#10b981', fontWeight: 700 }}>● 30 FPS Live Feed</span>
                  <span>Face Status: <strong>{enlargedCandidate.faceVerificationStatus || 'SCANNING'}</strong></span>
                  <span>Audio Level: <strong>{Math.round((enlargedCandidate.audioLevel || 0.1) * 100)}%</strong></span>
                </div>
              </div>

              {/* Candidate Metadata Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '12px',
                  background: 'var(--bg-input)',
                  padding: '14px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.8rem',
                }}
              >
                <div>
                  <div className="text-muted text-xs font-semibold">Student ID</div>
                  <div style={{ fontWeight: 700, marginTop: '2px' }}>{enlargedCandidate.id}</div>
                </div>
                <div>
                  <div className="text-muted text-xs font-semibold">Examination Duration</div>
                  <div style={{ fontWeight: 700, marginTop: '2px' }}>{getExamDuration(enlargedCandidate.joinedAt)}</div>
                </div>
                <div>
                  <div className="text-muted text-xs font-semibold">Warning Strikes</div>
                  <div style={{ fontWeight: 700, marginTop: '2px', color: (enlargedCandidate.activeWarningCount || 0) >= 3 ? '#ef4444' : '#f59e0b' }}>
                    {enlargedCandidate.activeWarningCount || 0} Strikes
                  </div>
                </div>
                <div>
                  <div className="text-muted text-xs font-semibold">Connection Status</div>
                  <div style={{ fontWeight: 700, marginTop: '2px', color: enlargedCandidate.status === 'connected' ? '#10b981' : '#ef4444' }}>
                    {enlargedCandidate.status.toUpperCase()}
                  </div>
                </div>
              </div>

              {/* Quick Moderator Action Bar */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => handleOpenManualWarning(enlargedCandidate)}
                  disabled={enlargedCandidate.status === 'terminated'}
                  style={{ gap: '6px' }}
                >
                  <Send size={14} />
                  Issue Manual Warning
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => handleOpenStopExam(enlargedCandidate)}
                  disabled={enlargedCandidate.status === 'terminated'}
                  style={{ gap: '6px' }}
                >
                  <UserX size={14} />
                  {enlargedCandidate.status === 'terminated' ? 'Exam Terminated' : 'STOP EXAMINATION'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 2: ISSUE MANUAL PROCTOR WARNING MODAL                   */}
      {/* ------------------------------------------------------------- */}
      {warningModalTarget && (
        <div className="modal-overlay" onClick={() => setWarningModalTarget(null)}>
          <div
            className="modal-card"
            style={{ maxWidth: '480px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 style={{ fontSize: '1.15rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={20} color="#f59e0b" />
                Issue Manual Warning
              </h3>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setWarningModalTarget(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p className="text-secondary text-xs" style={{ margin: 0, lineHeight: 1.5 }}>
                Issue an immediate proctor warning to <strong>{warningModalTarget.name}</strong> ({warningModalTarget.rollNo || warningModalTarget.id}). The student will receive a real-time warning popup on their exam screen.
              </p>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
                  Select Preset or Type Custom Warning Reason:
                </label>
                <select
                  value={customWarningReason}
                  onChange={(e) => setCustomWarningReason(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-input)',
                    color: 'var(--text-main)',
                    fontSize: '0.82rem',
                    marginBottom: '10px',
                  }}
                >
                  <option value="Suspicious eye gaze or movement detected. Please face the screen directly.">
                    Suspicious eye gaze / turning head away
                  </option>
                  <option value="Unauthorized person detected nearby. Please ensure you are alone.">
                    Unauthorized person in room
                  </option>
                  <option value="Excessive background noise or speaking detected.">
                    Excessive noise or speaking
                  </option>
                  <option value="Please adjust your lighting to ensure your face is clearly visible.">
                    Face unclear / inadequate lighting
                  </option>
                  <option value="Unauthorized devices or materials detected on your desk.">
                    Unauthorized materials on desk
                  </option>
                  <option value="Custom">Type custom reason below...</option>
                </select>

                <textarea
                  rows={3}
                  value={customWarningReason}
                  onChange={(e) => setCustomWarningReason(e.target.value)}
                  placeholder="Enter exact warning reason displayed to candidate..."
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-input)',
                    color: 'var(--text-main)',
                    fontSize: '0.84rem',
                    resize: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setWarningModalTarget(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSendManualWarning}
                  disabled={isSubmittingWarning || !customWarningReason.trim()}
                  style={{ gap: '6px', fontWeight: 700 }}
                >
                  <Send size={14} />
                  {isSubmittingWarning ? 'Sending...' : 'Dispatch Warning'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 3: FORCE STOP EXAMINATION CONFIRMATION MODAL            */}
      {/* ------------------------------------------------------------- */}
      {stopModalTarget && (
        <div className="modal-overlay" onClick={() => setStopModalTarget(null)}>
          <div
            className="modal-card"
            style={{ maxWidth: '500px', border: '1px solid rgba(239, 68, 68, 0.4)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 style={{ fontSize: '1.15rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--danger)' }}>
                <ShieldAlert size={20} color="var(--danger)" />
                Confirm Force Stop Examination
              </h3>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setStopModalTarget(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 14px',
                  fontSize: '0.84rem',
                  lineHeight: 1.5,
                  color: 'var(--text-main)',
                }}
              >
                <strong>Warning:</strong> You are about to permanently terminate the examination session for{' '}
                <strong>{stopModalTarget.name}</strong> ({stopModalTarget.rollNo || stopModalTarget.id}).
                <p style={{ margin: '6px 0 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  • The student will receive an immediate exam termination popup.<br />
                  • All answers completed prior to this stop will be preserved in the database.<br />
                  • Other candidates writing this examination will continue normally.
                </p>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
                  Mandatory Termination Reason:
                </label>
                <textarea
                  rows={3}
                  value={stopReason}
                  onChange={(e) => setStopReason(e.target.value)}
                  placeholder="Specify violation reason (e.g. Unauthorized mobile phone usage during examination)..."
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-input)',
                    color: 'var(--text-main)',
                    fontSize: '0.84rem',
                    resize: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setStopModalTarget(null)}
                  disabled={isSubmittingStop}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleConfirmStopExam}
                  disabled={isSubmittingStop || !stopReason.trim()}
                  style={{ gap: '6px', fontWeight: 800 }}
                >
                  <UserX size={15} />
                  {isSubmittingStop ? 'Stopping Exam...' : 'Confirm Force Stop Exam'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Real-Time Bottom-Right Exam Start & End Popup Notifications */}
      <ExamLifecycleToast
        toasts={lifecycleToasts}
        onDismiss={dismissLifecycleToast}
      />
    </div>
  );
};

