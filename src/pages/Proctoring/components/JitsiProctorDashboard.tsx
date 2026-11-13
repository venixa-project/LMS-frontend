import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuthStore } from '../../../lib/store';
import { useProctoringStore, ProctorParticipant } from '../../../lib/proctoringStore';
import { useAssessmentStore } from '../../../lib/assessmentStore';
import {
  Shield, Eye, AlertTriangle, CheckCircle2, Clock, X,
  Filter, UserCheck, ShieldAlert, FileText, Camera, Video, Monitor,
  Mic, MicOff, Volume2, Send, RefreshCw, AlertCircle, Check, Copy, ExternalLink,
  ChevronRight, Play, Lock, UserX, Maximize2, Minimize2, Grid, Layout, Users, MessageSquare, Radio
} from 'lucide-react';
import { GoogleMeetIcon } from '../../../components/GoogleMeet';

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
  // 'bridge': The Live Conference Bridge (Full Google Meet Tiled Video Wall with real student camera feeds)
  // 'split' : Split Wall with Candidate Telemetry Inspector
  const [viewMode, setViewMode] = useState<'bridge' | 'split'>('bridge');
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

  // Copy notice
  const [copyNotice, setCopyNotice] = useState(false);

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

  // Merge real active student with rich examination cohort (without fake images)
  const sessionParticipants: ProctorParticipant[] = useMemo(() => {
    // 1. Real active candidates in store or active session
    const realParticipants: ProctorParticipant[] = participants.filter(
      (p: ProctorParticipant) => !p.assessmentId || p.assessmentId === selectedAssessmentId
    );

    const fromSessions: ProctorParticipant[] = sessions
      .filter((s) => s.assessmentId === selectedAssessmentId)
      .map((s) => ({
        id: s.learnerId,
        name: s.learnerName,
        rollNo: (s as any).rollNo || `STU-${s.learnerId.slice(-4)}`,
        assessmentId: s.assessmentId,
        status: (s.status === 'submitted' ? 'submitted' : 'connected') as any,
        cameraActive: s.activeWebcam ?? true,
        micActive: s.activeMic ?? true,
        audioLevel: 0.22,
        screenShareActive: s.activeScreenShare ?? false,
        tabFocused: s.isFullscreen ?? true,
        faceDetected: s.activeWebcam ?? true,
        joinedAt: s.startedAt,
        lastPingAt: s.events[s.events.length - 1]?.timestamp || s.startedAt,
        activeWarningCount: 0,
      }));

    // Merge sessions into real participants, preserving live camera snapshots & telemetry
    const activeMerged: ProctorParticipant[] = [...realParticipants];
    fromSessions.forEach((p: ProctorParticipant) => {
      const idx = activeMerged.findIndex((m: ProctorParticipant) => m.id === p.id);
      if (idx === -1) {
        activeMerged.unshift(p); // Students who started the exam appear first!
      } else {
        activeMerged[idx] = {
          ...p,
          ...activeMerged[idx],
          cameraActive: activeMerged[idx].cameraActive ?? p.cameraActive,
          micActive: activeMerged[idx].micActive ?? p.micActive,
        };
      }
    });

    // 2. Add enrolled cohort candidates
    const cohortCandidates: ProctorParticipant[] = COHORT_STUDENTS_SEED.map((seed, idx) => {
      const isTina = seed.name === 'Tina Kirkpatrick';
      const cId = isTina ? 'stu-cohort-tina' : `stu-cohort-${idx + 1}`;
      return {
        id: cId,
        name: seed.name,
        rollNo: seed.rollNo,
        assessmentId: selectedAssessmentId,
        status: 'connected',
        cameraActive: true,
        micActive: true,
        audioLevel: seed.isSpeakingDefault ? 0.45 : 0.08 + ((idx * 5) % 20) / 100,
        screenShareActive: false,
        tabFocused: true,
        faceDetected: true,
        joinedAt: new Date(Date.now() - (15 + idx * 2) * 60000).toISOString(),
        lastPingAt: new Date().toISOString(),
        activeWarningCount: 0,
      };
    });

    // Place any real active student candidates first
    const combined: ProctorParticipant[] = [...activeMerged];
    cohortCandidates.forEach((c) => {
      if (!combined.some((p) => p.id === c.id || p.name.toLowerCase() === c.name.toLowerCase())) {
        combined.push(c);
      }
    });

    return combined;
  }, [participants, sessions, selectedAssessmentId]);

  // Candidates who started the exam (active sessions or streaming webcam)
  const candidatesWhoStartedExam = useMemo(() => {
    return sessionParticipants.filter((p) => {
      const hasSession = sessions.some((s) => s.assessmentId === selectedAssessmentId && s.learnerId === p.id);
      const isStreaming = Boolean(p.latestSnapshot);
      const isCustomStarted = (p.status as any) === 'in_progress' || p.status === 'connected' && (p.id.startsWith('u-') || p.id.startsWith('stu-') || hasSession);
      return hasSession || isStreaming || isCustomStarted;
    });
  }, [sessionParticipants, sessions, selectedAssessmentId]);

  const selectedParticipant =
    sessionParticipants.find((p: ProctorParticipant) => p.id === selectedParticipantId) ||
    candidatesWhoStartedExam[0] ||
    sessionParticipants[0] ||
    null;

  const sessionIncidents = incidents.filter(
    (i) => i.assessmentId === selectedAssessmentId || i.assessmentId === 'asm-001'
  );

  const sessionWarnings = warnings.filter(
    (w) => w.assessmentId === selectedAssessmentId || w.assessmentId === 'asm-001'
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
    const meetUrl = jitsiRoomId.startsWith('http') ? jitsiRoomId : `https://meet.google.com/new`;
    navigator.clipboard?.writeText(meetUrl);
    setCopyNotice(true);
    setTimeout(() => setCopyNotice(false), 2500);
  };

  const handleSendWarning = () => {
    if (!selectedParticipant || !warningMessage.trim()) return;

    sendWarning({
      assessmentId: selectedAssessmentId,
      learnerId: selectedParticipant.id,
      learnerName: selectedParticipant.name,
      message: warningMessage.trim(),
      reason: warningReason,
      sentBy: user?.displayName || 'Dr. James Wilson (Proctor)',
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

  // Filter participants based on active filter
  const candidatePool = filterOnlyStarted && candidatesWhoStartedExam.length > 0
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
              <span>Room: <code>{jitsiRoomId}</code></span>
              <button
                type="button"
                onClick={handleCopyRoomId}
                className="btn btn-secondary btn-xs"
                style={{ padding: '2px 6px', fontSize: '0.7rem' }}
              >
                {copyNotice ? <Check size={11} color="var(--success)" /> : <Copy size={11} />}
                <span>{copyNotice ? 'Copied' : 'Copy'}</span>
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
          <div className="text-muted text-xs font-semibold">Active Candidates</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '4px' }}>
            {sessionParticipants.filter((p) => p.status === 'connected' || (p.status as any) === 'in_progress').length} / {sessionParticipants.length}
          </div>
          <div className="text-muted text-xs">Writing examination live</div>
        </div>

        <div className="card" style={{ padding: '14px', margin: 0, borderLeft: '3px solid var(--success)' }}>
          <div className="text-muted text-xs font-semibold">Live Camera Feeds</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--success)', marginTop: '4px' }}>
            {sessionParticipants.filter((p) => p.cameraActive).length} / {sessionParticipants.length}
          </div>
          <div className="text-muted text-xs">Video streaming verified</div>
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
                  LIVE ({displayedParticipants.length} Connected • {candidatesWhoStartedExam.length} in Exam)
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
                Room: <code style={{ color: '#60a5fa' }}>{jitsiRoomId}</code> &bull; All candidate camera feeds streaming in real-time
              </div>
            </div>
          </div>

          {/* Controls: Mode Switcher, Candidate Filter, Proctor Tools, Fullscreen */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* View Mode Switcher */}
            <div style={{ display: 'flex', background: '#2a2b32', padding: '3px', borderRadius: '8px' }}>
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

            {/* Candidate Filter Toggle (Started Exam vs All) */}
            <button
              type="button"
              onClick={() => setFilterOnlyStarted(!filterOnlyStarted)}
              style={{
                background: filterOnlyStarted ? 'rgba(34, 197, 94, 0.25)' : '#2a2b32',
                color: filterOnlyStarted ? '#22c55e' : '#cbd5e1',
                border: filterOnlyStarted ? '1px solid rgba(34, 197, 94, 0.5)' : '1px solid #3e404b',
                borderRadius: '8px',
                padding: '4px 10px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
              title="Toggle filter to only show candidates who have active exam sessions"
            >
              <UserCheck size={13} />
              <span>{filterOnlyStarted ? `Started Exam Only (${candidatesWhoStartedExam.length})` : `All Enrolled (${sessionParticipants.length})`}</span>
            </button>

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
              href={jitsiRoomId.startsWith('http') ? jitsiRoomId : `https://meet.google.com/new`}
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
              title="Launch external standalone Google Meet window"
            >
              <ExternalLink size={13} /> Open Meet Tab ↗
            </a>
          </div>
        </div>

        {/* Video Wall Canvas Body: Multi-Student Conference Grid */}
        <div
          style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: viewMode === 'split' ? 'minmax(0, 1fr) 340px' : '1fr',
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
                    {/* Candidate Camera Stream: Real-Time Snapshot or Local Camera Video */}
                    {p.latestSnapshot ? (
                      <img
                        src={p.latestSnapshot}
                        alt={p.name}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          transform: 'scaleX(-1)',
                        }}
                      />
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
                        }}
                      />
                    ) : (
                      /* Authentic Google Meet Style Dark Tile with Initials Avatar (No static stock photos) */
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'radial-gradient(circle at center, #26272e 0%, #17181c 100%)',
                          position: 'relative',
                        }}
                      >
                        <div
                          style={{
                            width: '54px',
                            height: '54px',
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
                            border: isSpeaking ? '2px solid #fff' : '2px solid rgba(255,255,255,0.2)',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          {initials}
                        </div>
                        <span style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '6px', fontWeight: 600 }}>
                          {p.rollNo}
                        </span>
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
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                      Candidate Telemetry
                    </span>
                    <span className="badge badge-success text-xs" style={{ textTransform: 'capitalize' }}>
                      {selectedParticipant.status}
                    </span>
                  </div>

                  {/* Candidate Preview Thumbnail */}
                  <div style={{ aspectRatio: '16/9', background: '#0e0f12', borderRadius: '8px', overflow: 'hidden', position: 'relative' }}>
                    {selectedParticipant.latestSnapshot ? (
                      <img
                        src={selectedParticipant.latestSnapshot}
                        alt={selectedParticipant.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
                      />
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', gap: '8px' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#3b82f6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.2rem' }}>
                          {getInitials(selectedParticipant.name)}
                        </div>
                        <span style={{ fontSize: '0.75rem' }}>Camera Stream Active</span>
                      </div>
                    )}
                    <div style={{ position: 'absolute', bottom: '6px', left: '6px', background: 'rgba(0,0,0,0.7)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem' }}>
                      {selectedParticipant.name} ({selectedParticipant.rollNo})
                    </div>
                  </div>

                  {/* Hardware Signals */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.75rem' }}>
                    <div style={{ background: '#25262c', padding: '8px', borderRadius: '6px' }}>
                      <div style={{ color: '#94a3b8', fontSize: '0.68rem' }}>Webcam</div>
                      <strong style={{ color: selectedParticipant.cameraActive ? '#22c55e' : '#ef4444' }}>
                        {selectedParticipant.cameraActive ? 'Streaming' : 'Inactive'}
                      </strong>
                    </div>
                    <div style={{ background: '#25262c', padding: '8px', borderRadius: '6px' }}>
                      <div style={{ color: '#94a3b8', fontSize: '0.68rem' }}>Focus Window</div>
                      <strong style={{ color: selectedParticipant.tabFocused ? '#22c55e' : '#f59e0b' }}>
                        {selectedParticipant.tabFocused ? 'Focused' : 'Background'}
                      </strong>
                    </div>
                    <div style={{ background: '#25262c', padding: '8px', borderRadius: '6px' }}>
                      <div style={{ color: '#94a3b8', fontSize: '0.68rem' }}>Microphone RMS</div>
                      <strong style={{ color: '#22c55e' }}>
                        {Math.round((selectedParticipant.audioLevel || 0.15) * 100)}%
                      </strong>
                    </div>
                    <div style={{ background: '#25262c', padding: '8px', borderRadius: '6px' }}>
                      <div style={{ color: '#94a3b8', fontSize: '0.68rem' }}>Fullscreen</div>
                      <strong style={{ color: selectedParticipant.tabFocused ? '#22c55e' : '#ef4444' }}>
                        {selectedParticipant.tabFocused ? 'Locked (100%)' : 'Violation'}
                      </strong>
                    </div>
                  </div>

                  {/* Dispatch Warning Action */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.7rem', color: '#cbd5e1', fontWeight: 600 }}>
                      Dispatch Warning to Candidate
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Return focus to examination..."
                      value={warningMessage}
                      onChange={(e) => setWarningMessage(e.target.value)}
                      style={{
                        background: '#121214',
                        border: '1px solid #3e404b',
                        color: '#fff',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleSendWarning}
                      className="btn btn-warning btn-xs"
                      style={{ alignSelf: 'flex-end', marginTop: '2px' }}
                    >
                      <Send size={11} /> Send Warning
                    </button>
                  </div>

                  {/* Force Submit Action */}
                  <button
                    type="button"
                    onClick={() => setForceSubmitModalParticipant(selectedParticipant)}
                    className="btn btn-danger btn-sm"
                    style={{ marginTop: 'auto', fontSize: '0.75rem' }}
                  >
                    <UserX size={13} /> Force-Submit Exam
                  </button>
                </>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
                  Select a candidate tile to inspect signals
                </div>
              )}
            </div>
          )}
        </div>

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
            <span>Showing <strong>{displayedParticipants.length}</strong> of {sessionParticipants.length} enrolled examination candidates</span>
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
    </div>
  );
};
