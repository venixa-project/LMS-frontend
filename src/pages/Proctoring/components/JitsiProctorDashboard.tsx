import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../../../lib/store';
import { useProctoringStore, ProctorParticipant } from '../../../lib/proctoringStore';
import { mockAssessments } from '../../../data/mockData';
import {
  Shield, Eye, AlertTriangle, CheckCircle2, Clock, X,
  Filter, UserCheck, ShieldAlert, FileText, Camera, Video, Monitor,
  Mic, MicOff, Volume2, Send, RefreshCw, AlertCircle, Check, Copy, ExternalLink,
  ChevronRight, Play, Lock, UserX
} from 'lucide-react';

interface JitsiProctorDashboardProps {
  initialAssessmentId?: string;
  onClose?: () => void;
}

export const JitsiProctorDashboard: React.FC<JitsiProctorDashboardProps> = ({
  initialAssessmentId = 'asm-001',
  onClose,
}) => {
  const { user } = useAuthStore();
  const {
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
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(participants[0]?.id || null);

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

  const selectedAssessment = mockAssessments.find((a) => a.id === selectedAssessmentId) || mockAssessments[0];
  const jitsiRoomId = selectedAssessment?.jitsiRoomId || `vl-exam-${selectedAssessmentId}-live`;

  const sessionParticipants = participants.filter(
    (p) => !p.assessmentId || p.assessmentId === selectedAssessmentId
  );

  const selectedParticipant = participants.find((p) => p.id === selectedParticipantId) || sessionParticipants[0];

  const sessionIncidents = incidents.filter(
    (i) => i.assessmentId === selectedAssessmentId || i.assessmentId === 'asm-001'
  );

  const sessionWarnings = warnings.filter(
    (w) => w.assessmentId === selectedAssessmentId || w.assessmentId === 'asm-001'
  );

  // Request actual camera stream for demonstration/real proctor tile if permitted
  useEffect(() => {
    let stream: MediaStream | null = null;
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
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
          // Fallback if camera is unavailable or denied
          setIsLocalCameraActive(false);
        });
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handleCopyRoomId = () => {
    navigator.clipboard?.writeText(jitsiRoomId);
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
    setIsWarningSentNotice(`Exam session for ${forceSubmitModalParticipant.name} has been force-submitted.`);
    setTimeout(() => setIsWarningSentNotice(null), 3500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. Header Bar with Exam Information and SLA Status */}
      <div
        className="card"
        style={{
          margin: 0,
          padding: '18px 24px',
          background: 'var(--bg-card)',
          borderLeft: '4px solid var(--primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="badge badge-primary text-xs">Jitsi Hybrid Proctoring Active</span>
            <span className="badge badge-info text-xs">Live Audio/Video Telemetry</span>
            <span className="text-muted text-xs">AY 2026–2027 &bull; Acme Learning Corp</span>
          </div>

          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>
            Live Proctoring Room: {selectedAssessment.title}
          </h2>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px', fontSize: '0.85rem' }}>
            <span className="text-muted">
              Course: <strong>JavaScript Mastery (crs-001)</strong>
            </span>
            <span>&bull;</span>
            <span className="text-muted">
              Jitsi Room:{' '}
              <code style={{ color: 'var(--primary)', fontWeight: 600 }}>{jitsiRoomId}</code>
            </span>
            <button
              className="btn btn-secondary btn-sm"
              style={{ padding: '2px 8px', fontSize: '0.75rem' }}
              onClick={handleCopyRoomId}
              title="Copy Jitsi Room ID"
            >
              <Copy size={12} /> {copyNotice ? 'Copied!' : 'Copy ID'}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <select
            className="form-select"
            value={selectedAssessmentId}
            onChange={(e) => setSelectedAssessmentId(e.target.value)}
            style={{ fontSize: '0.825rem', height: '36px', minWidth: '220px' }}
          >
            {mockAssessments.map((a) => (
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
          <div className="text-muted text-xs font-semibold">Active Participants</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '4px' }}>
            {sessionParticipants.filter((p) => p.status === 'connected').length} / {sessionParticipants.length}
          </div>
          <div className="text-muted text-xs">All candidates joined</div>
        </div>

        <div className="card" style={{ padding: '14px', margin: 0, borderLeft: '3px solid var(--success)' }}>
          <div className="text-muted text-xs font-semibold">Camera Feeds Active</div>
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

      {/* 3. Main Proctoring Grid: Video Stream Tiles & Detail Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(320px, 1fr)', gap: '20px' }}>
        {/* Left Column: Participant Tiles & Video Feeds */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Video size={18} color="var(--primary)" /> Participant Monitoring Feeds ({sessionParticipants.length})
            </h3>
            <span className="text-muted text-xs">
              Click any tile to inspect signals or dispatch warnings
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: '14px',
            }}
          >
            {sessionParticipants.map((p, idx) => {
              const isSelected = selectedParticipant?.id === p.id;
              const hasWarnings = p.activeWarningCount > 0;
              const isDisconnected = p.status === 'disconnected';
              const isSubmitted = p.status === 'submitted';

              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedParticipantId(p.id)}
                  style={{
                    background: 'var(--bg-card)',
                    border: isSelected
                      ? '2px solid var(--primary)'
                      : hasWarnings
                      ? '2px solid var(--warning)'
                      : '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-lg)',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    boxShadow: isSelected ? '0 0 0 2px rgba(99, 102, 241, 0.2)' : 'none',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {/* Participant Video / Tile Box */}
                  <div
                    style={{
                      position: 'relative',
                      height: '145px',
                      background: '#0f172a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                    }}
                  >
                    {/* Real Video Stream for first participant if webcam is available */}
                    {idx === 0 && isLocalCameraActive && p.cameraActive ? (
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
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '6px',
                          color: p.cameraActive ? '#94a3b8' : '#ef4444',
                        }}
                      >
                        <div
                          style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '50%',
                            background: p.cameraActive ? 'rgba(255, 255, 255, 0.1)' : 'rgba(239, 68, 68, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '1.1rem',
                            color: '#fff',
                          }}
                        >
                          {p.name.charAt(0)}
                        </div>
                        <span style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>
                          {isSubmitted
                            ? 'Exam Submitted'
                            : p.cameraActive
                            ? 'Webcam Active (720p)'
                            : 'Camera Interrupted'}
                        </span>
                      </div>
                    )}

                    {/* Top status badges on tile */}
                    <div
                      style={{
                        position: 'absolute',
                        top: '8px',
                        left: '8px',
                        right: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        pointerEvents: 'none',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '0.65rem',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: isSubmitted
                            ? 'rgba(34, 197, 94, 0.85)'
                            : p.status === 'connected'
                            ? 'rgba(34, 197, 94, 0.85)'
                            : 'rgba(239, 68, 68, 0.85)',
                          color: '#fff',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                        }}
                      >
                        {isSubmitted ? 'SUBMITTED' : p.status}
                      </span>

                      {/* Warning counter badge */}
                      {p.activeWarningCount > 0 && (
                        <span
                          style={{
                            fontSize: '0.65rem',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: 'rgba(245, 158, 11, 0.95)',
                            color: '#000',
                            fontWeight: 700,
                          }}
                        >
                          {p.activeWarningCount} Warn
                        </span>
                      )}
                    </div>

                    {/* Live Audio Level Meter Bar at bottom of tile */}
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: '4px',
                        background: 'rgba(255, 255, 255, 0.2)',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${Math.min(100, Math.round(p.audioLevel * 100))}%`,
                          background: p.audioLevel > 0.4 ? 'var(--danger)' : p.audioLevel > 0.2 ? 'var(--warning)' : 'var(--success)',
                          transition: 'width 0.2s ease',
                        }}
                      />
                    </div>
                  </div>

                  {/* Tile Bottom Details */}
                  <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-main)' }}>
                        {p.name}
                      </span>
                      <span className="badge badge-neutral text-xs" style={{ fontSize: '0.65rem' }}>
                        {p.rollNo}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.725rem', marginTop: '2px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: p.cameraActive ? 'var(--success)' : 'var(--danger)' }}>
                        <Camera size={12} /> {p.cameraActive ? 'Cam' : 'No Cam'}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: p.micActive ? 'var(--success)' : 'var(--text-muted)' }}>
                        {p.micActive ? <Mic size={12} /> : <MicOff size={12} />} {p.micActive ? 'Mic' : 'Muted'}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: p.tabFocused ? 'var(--success)' : 'var(--warning)' }}>
                        <Monitor size={12} /> {p.tabFocused ? 'Focused' : 'Tab Blur'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Jitsi Meeting Deployment & Configuration Information Card */}
          <div
            style={{
              background: 'rgba(99, 102, 241, 0.05)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              borderRadius: 'var(--radius-md)',
              padding: '14px 18px',
              fontSize: '0.825rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, marginBottom: '6px' }}>
              <Shield size={16} color="var(--primary)" />
              <span>Jitsi Meet Deployment & Security Architecture</span>
            </div>
            <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Invigilator sessions connect securely via authenticated JWT room credentials. Participant camera tracks are monitored within the authorized tenant scope. Students have restricted access to proctor-only meeting controls.
            </p>
          </div>
        </div>

        {/* Right Column: Focused Participant Telemetry & Dispatch Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {selectedParticipant ? (
            <div
              className="card"
              style={{
                margin: 0,
                padding: '18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              {/* Participant Profile Banner */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '14px' }}>
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--primary), #818cf8)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '1.1rem',
                  }}
                >
                  {selectedParticipant.name.charAt(0)}
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
                    {selectedParticipant.name}
                  </h4>
                  <p className="text-muted text-xs" style={{ margin: '2px 0 0 0' }}>
                    {selectedParticipant.rollNo} &bull; Joined:{' '}
                    {new Date(selectedParticipant.joinedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              {/* Telemetry Status Breakdown */}
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  Live Signal Telemetry
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.8rem' }}>
                  <div style={{ background: 'var(--bg-input)', padding: '8px 10px', borderRadius: 'var(--radius-sm)' }}>
                    <div className="text-muted text-xs">Camera Feed</div>
                    <strong style={{ color: selectedParticipant.cameraActive ? 'var(--success)' : 'var(--danger)' }}>
                      {selectedParticipant.cameraActive ? 'Active (Continuous)' : 'Interrupted'}
                    </strong>
                  </div>

                  <div style={{ background: 'var(--bg-input)', padding: '8px 10px', borderRadius: 'var(--radius-sm)' }}>
                    <div className="text-muted text-xs">Browser Window</div>
                    <strong style={{ color: selectedParticipant.tabFocused ? 'var(--success)' : 'var(--warning)' }}>
                      {selectedParticipant.tabFocused ? 'Focused on Exam' : 'Tab Switched / Blurred'}
                    </strong>
                  </div>

                  <div style={{ background: 'var(--bg-input)', padding: '8px 10px', borderRadius: 'var(--radius-sm)' }}>
                    <div className="text-muted text-xs">Audio Activity RMS</div>
                    <strong style={{ color: selectedParticipant.audioLevel > 0.4 ? 'var(--danger)' : 'var(--success)' }}>
                      {Math.round(selectedParticipant.audioLevel * 100)}% ({selectedParticipant.audioLevel > 0.4 ? 'Elevated Noise' : 'Normal'})
                    </strong>
                  </div>

                  <div style={{ background: 'var(--bg-input)', padding: '8px 10px', borderRadius: 'var(--radius-sm)' }}>
                    <div className="text-muted text-xs">Status</div>
                    <strong style={{ textTransform: 'capitalize' }}>
                      {selectedParticipant.status}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Quick Warning Dispatcher */}
              <div
                style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.85rem', marginBottom: '10px' }}>
                  <Send size={14} color="var(--primary)" /> Dispatch Live Warning to Student
                </div>

                {/* Warning Templates */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.72rem', padding: '2px 8px' }}
                    onClick={() => {
                      setWarningMessage('Browser focus changed: please keep the exam window active at all times.');
                      setWarningReason('Tab switch detected');
                    }}
                  >
                    Tab Focus
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.72rem', padding: '2px 8px' }}
                    onClick={() => {
                      setWarningMessage('Unusual background audio detected: please ensure complete silence during the exam.');
                      setWarningReason('Audio spike detected');
                    }}
                  >
                    Audio Noise
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.72rem', padding: '2px 8px' }}
                    onClick={() => {
                      setWarningMessage('Webcam feed obstructed: please ensure your full face is visible to the proctor.');
                      setWarningReason('Face not visible');
                    }}
                  >
                    Camera Face
                  </button>
                </div>

                <div className="form-group" style={{ marginBottom: '8px' }}>
                  <textarea
                    rows={2}
                    className="form-textarea"
                    placeholder="Enter warning instruction to display on student exam screen..."
                    value={warningMessage}
                    onChange={(e) => setWarningMessage(e.target.value)}
                    style={{ fontSize: '0.825rem' }}
                  />
                </div>

                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  onClick={handleSendWarning}
                  disabled={!warningMessage.trim()}
                >
                  <Send size={13} /> Send Official Warning
                </button>
              </div>

              {/* Incidents & False Alarm Dismissal */}
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  Recent Signals & False-Alarm Resolution
                </div>

                {sessionIncidents.filter((i) => i.learnerId === selectedParticipant.id).length === 0 ? (
                  <div className="text-muted text-xs" style={{ padding: '8px 0' }}>
                    No flagged signals for this student.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {sessionIncidents
                      .filter((i) => i.learnerId === selectedParticipant.id)
                      .map((inc) => (
                        <div
                          key={inc.id}
                          style={{
                            background: inc.dismissed ? 'var(--bg-input)' : 'rgba(245, 158, 11, 0.08)',
                            border: inc.dismissed ? '1px solid var(--border-subtle)' : '1px solid rgba(245, 158, 11, 0.3)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '8px 10px',
                            fontSize: '0.78rem',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <strong style={{ textTransform: 'capitalize' }}>{inc.eventType.replace('_', ' ')}</strong>
                            <span className="text-muted text-xs">
                              {new Date(inc.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div style={{ color: 'var(--text-secondary)', marginBottom: '6px' }}>
                            {inc.description}
                          </div>

                          {!inc.dismissed && (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: '0.7rem', padding: '2px 8px' }}
                              onClick={() => dismissIncident(inc.id, 'Verified legitimate background noise or accidental cursor movement')}
                            >
                              <Check size={11} /> Dismiss as False Alarm
                            </button>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Explicit Force Submit Action */}
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '14px' }}>
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  onClick={() => setForceSubmitModalParticipant(selectedParticipant)}
                >
                  <UserX size={14} /> Explicit Force-Submit Exam...
                </button>
                <div className="text-muted text-xs" style={{ marginTop: '4px', textAlign: 'center' }}>
                  Requires proctor confirmation and creates permanent audit record.
                </div>
              </div>
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '40px 16px' }}>
              <Eye size={36} color="var(--text-muted)" style={{ margin: '0 auto 8px auto' }} />
              <p className="text-muted text-sm">Select a participant to view live telemetry</p>
            </div>
          )}

          {/* Audit History Timeline */}
          <div className="card" style={{ margin: 0, padding: '16px' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={15} /> Session Proctor Audit Trail
            </h4>

            <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {auditLogs.slice(0, 8).map((log) => (
                <div
                  key={log.id}
                  style={{
                    background: 'var(--bg-input)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '8px 10px',
                    fontSize: '0.75rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, color: 'var(--text-main)', marginBottom: '2px' }}>
                    <span>{log.performedBy}</span>
                    <span className="text-muted">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                  <div style={{ color: 'var(--text-secondary)' }}>{log.description}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Force Submit Confirmation Modal */}
      {forceSubmitModalParticipant && (
        <div className="modal-overlay" style={{ zIndex: 1200 }} onClick={() => setForceSubmitModalParticipant(null)}>
          <div className="modal-card" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <AlertTriangle size={24} color="var(--danger)" />
                <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Force-Submit Confirmation</h3>
              </div>
              <button onClick={() => setForceSubmitModalParticipant(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <p style={{ fontSize: '0.875rem', color: 'var(--text-main)', marginBottom: '12px' }}>
                Are you sure you want to force-submit the examination for{' '}
                <strong>{forceSubmitModalParticipant.name}</strong> ({forceSubmitModalParticipant.rollNo})?
              </p>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label font-semibold">Violation Justification / Reason</label>
                <textarea
                  rows={3}
                  className="form-textarea"
                  value={forceSubmitReason}
                  onChange={(e) => setForceSubmitReason(e.target.value)}
                  placeholder="Record justification for institutional audit logs..."
                />
              </div>

              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8rem',
                  color: 'var(--danger)',
                }}
              >
                All student responses answered thus far will be preserved and locked. A permanent audit entry will be generated under your proctor credentials.
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setForceSubmitModalParticipant(null)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={handleConfirmForceSubmit}>
                Confirm Force Submission
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
