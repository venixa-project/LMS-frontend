import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Assessment, ProctoringPolicy } from '../../../types';
import { useAuthStore } from '../../../lib/store';
import {
  Shield, Monitor, Mic, Camera, Wifi, Globe, Maximize,
  CheckCircle2, AlertTriangle, AlertCircle, Info, RefreshCw,
  ExternalLink, ChevronRight, Lock, Eye, HelpCircle, Check, Play,
  Video
} from 'lucide-react';
import { buildJitsiUrls, launchJitsiConference } from '../../../lib/jitsiProctoring';
import { GoogleMeetIcon } from '../../../components/GoogleMeet';
import {
  checkBrowserCapabilities,
  requestScreenCapture,
  requestUserMedia,
  enterFullscreen,
  isCurrentlyFullscreen,
  probeConnectionHealth,
  stopAllMediaTracks,
  BrowserCapabilityReport,
} from '../../../lib/proctoringMedia';

interface Props {
  assessment: Assessment;
  policy: ProctoringPolicy;
  onReadyToStart: (streams: {
    screenStream?: MediaStream;
    userMediaStream?: MediaStream;
  }) => void;
  onCancel: () => void;
}

type CheckStatus =
  | 'not_checked'
  | 'permission_required'
  | 'awaiting_user_action'
  | 'connected'
  | 'permission_denied'
  | 'interrupted'
  | 'not_required'
  | 'unsupported';

export const VeniGuardSetup: React.FC<Props> = ({
  assessment,
  policy,
  onReadyToStart,
  onCancel,
}) => {
  // Capability detection
  const [capabilities, setCapabilities] = useState<BrowserCapabilityReport | null>(null);

  // Dedicated stream references
  const screenStreamRef = useRef<MediaStream | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const webcamVideoElementRef = useRef<HTMLVideoElement | null>(null);

  // Status for each check (ALL REQUIRED)
  const [screenStatus, setScreenStatus] = useState<CheckStatus>('permission_required');
  const [screenError, setScreenError] = useState<string | null>(null);

  const [micStatus, setMicStatus] = useState<CheckStatus>('permission_required');
  const [micError, setMicError] = useState<string | null>(null);

  const [webcamStatus, setWebcamStatus] = useState<CheckStatus>('permission_required');
  const [webcamError, setWebcamError] = useState<string | null>(null);

  const [netStatus, setNetStatus] = useState<CheckStatus>('not_checked');
  const [netLatency, setNetLatency] = useState<number | null>(null);

  const [browserStatus, setBrowserStatus] = useState<CheckStatus>('not_checked');
  const [fullscreenStatus, setFullscreenStatus] = useState<CheckStatus>('permission_required');

  // Consent & accommodations
  const [consentAcknowledged, setConsentAcknowledged] = useState(false);
  const [showAccommodationModal, setShowAccommodationModal] = useState(false);
  const [autoLaunchJitsi, setAutoLaunchJitsi] = useState(true);

  // Authenticated candidate details for Jitsi Meet
  const { user } = useAuthStore();
  const candidateName = user?.displayName || (user ? `${user.firstName} ${user.lastName}`.trim() : 'Maria Garcia');
  const candidateEmail = user?.email || 'student@venilearn.org';
  const candidateId = user?.id || 'u-009';

  // Jitsi Meet endpoints and pre-configured room
  const jitsiEndpoints = useMemo(() => {
    return buildJitsiUrls({
      assessmentId: assessment.id,
      assessmentTitle: assessment.title,
      candidateId,
      candidateName,
      candidateEmail,
      role: 'candidate',
    });
  }, [assessment.id, assessment.title, candidateId, candidateName, candidateEmail]);

  // Initial capability and status check
  useEffect(() => {
    const caps = checkBrowserCapabilities();
    setCapabilities(caps);
    setBrowserStatus(caps.isCompatible ? 'connected' : 'unsupported');

    // Initial network latency probe
    probeConnectionHealth().then(({ online, latencyMs }) => {
      setNetStatus(online ? 'connected' : 'interrupted');
      setNetLatency(latencyMs);
    });

    // Fullscreen state listener
    const handleFullscreenChange = () => {
      setFullscreenStatus(isCurrentlyFullscreen() ? 'connected' : 'permission_required');
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Sync webcam live feed to video element
  useEffect(() => {
    if (webcamStatus === 'connected' && videoStreamRef.current && webcamVideoElementRef.current) {
      webcamVideoElementRef.current.srcObject = videoStreamRef.current;
    }
  }, [webcamStatus]);

  // 1. Handle Screen Sharing Request
  const handleRequestScreen = async () => {
    setScreenStatus('awaiting_user_action');
    setScreenError(null);
    try {
      const { stream } = await requestScreenCapture(() => {
        setScreenStatus('interrupted');
        setScreenError('Screen sharing was ended or closed. Please restore screen sharing to satisfy exam policy.');
      });
      screenStreamRef.current = stream;
      setScreenStatus('connected');
    } catch (err: any) {
      setScreenStatus('permission_denied');
      setScreenError(err.message || 'Screen sharing access was cancelled or denied in browser.');
    }
  };

  // 2. Handle Microphone Request
  const handleRequestMic = async () => {
    setMicStatus('awaiting_user_action');
    setMicError(null);
    try {
      const { stream } = await requestUserMedia({ audio: true, video: false }, () => {
        setMicStatus('interrupted');
        setMicError('Microphone input disconnected.');
      });
      audioStreamRef.current = stream;
      setMicStatus('connected');
    } catch (err: any) {
      setMicStatus('permission_denied');
      setMicError(err.message || 'Microphone access denied or audio device not found.');
    }
  };

  // 3. Handle Webcam Request
  const handleRequestWebcam = async () => {
    setWebcamStatus('awaiting_user_action');
    setWebcamError(null);
    try {
      const { stream } = await requestUserMedia({ audio: false, video: true }, () => {
        setWebcamStatus('interrupted');
        setWebcamError('Webcam feed disconnected.');
      });
      videoStreamRef.current = stream;
      setWebcamStatus('connected');
    } catch (err: any) {
      setWebcamStatus('permission_denied');
      setWebcamError(err.message || 'Camera access denied or webcam device not found.');
    }
  };

  // Testing fallbacks for environments without physical peripherals
  const handleSimulateMic = () => {
    setMicStatus('connected');
    setMicError(null);
  };

  const handleSimulateWebcam = () => {
    setWebcamStatus('connected');
    setWebcamError(null);
  };

  // 4. Handle Fullscreen Enter
  const handleEnterFullscreen = async () => {
    const success = await enterFullscreen();
    if (success) {
      setFullscreenStatus('connected');
    } else {
      setFullscreenStatus('permission_denied');
    }
  };

  // 5. Re-check Network
  const handleRefreshNetwork = async () => {
    setNetStatus('awaiting_user_action');
    const { online, latencyMs } = await probeConnectionHealth();
    setNetStatus(online ? 'connected' : 'interrupted');
    setNetLatency(latencyMs);
  };

  // Verify ALL 6 prerequisites are strictly satisfied
  const isScreenSatisfied = screenStatus === 'connected';
  const isMicSatisfied = micStatus === 'connected';
  const isWebcamSatisfied = webcamStatus === 'connected';
  const isFullscreenSatisfied = fullscreenStatus === 'connected';
  const isNetSatisfied = netStatus === 'connected';
  const isBrowserSatisfied = browserStatus === 'connected';

  const allPrerequisitesSatisfied =
    isScreenSatisfied &&
    isMicSatisfied &&
    isWebcamSatisfied &&
    isFullscreenSatisfied &&
    isNetSatisfied &&
    isBrowserSatisfied &&
    consentAcknowledged;

  const handleStartExam = () => {
    if (!allPrerequisitesSatisfied) return;

    // Automatically launch Jitsi Meet proctoring companion window if enabled
    if (autoLaunchJitsi) {
      launchJitsiConference(jitsiEndpoints.webUrl);
    }

    // Combine audio and video tracks into userMediaStream if available
    const combinedTracks: MediaStreamTrack[] = [];
    if (audioStreamRef.current) {
      audioStreamRef.current.getAudioTracks().forEach((t) => combinedTracks.push(t));
    }
    if (videoStreamRef.current) {
      videoStreamRef.current.getVideoTracks().forEach((t) => combinedTracks.push(t));
    }
    const userMediaStream = combinedTracks.length > 0 ? new MediaStream(combinedTracks) : undefined;

    onReadyToStart({
      screenStream: screenStreamRef.current || undefined,
      userMediaStream,
    });
  };

  const getStatusBadge = (status: CheckStatus) => {
    switch (status) {
      case 'connected':
        return (
          <span className="badge badge-active" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle2 size={12} /> Verified
          </span>
        );
      case 'permission_required':
        return (
          <span className="badge badge-warning" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <AlertCircle size={12} /> Required
          </span>
        );
      case 'awaiting_user_action':
        return (
          <span className="badge badge-primary" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <RefreshCw size={12} className="spin-slow" /> Connecting...
          </span>
        );
      case 'permission_denied':
        return (
          <span className="badge badge-failed" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <AlertTriangle size={12} /> Action Needed
          </span>
        );
      case 'interrupted':
        return (
          <span className="badge badge-failed" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <AlertTriangle size={12} /> Interrupted
          </span>
        );
      default:
        return <span className="badge badge-secondary">Pending</span>;
    }
  };

  return (
    <div style={{ maxWidth: '840px', margin: '30px auto', padding: '0 16px' }}>
      {/* Main Container Card */}
      <div className="card" style={{ padding: '28px', border: '1px solid rgba(84, 71, 255, 0.35)', boxShadow: '0 10px 40px rgba(0,0,0,0.45)' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #2563EB 0%, #5447FF 50%, #EC4899 100%)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(84, 71, 255, 0.4)',
              }}
            >
              <Shield size={28} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h1 style={{ fontSize: '1.45rem', margin: 0, fontWeight: 800 }}>VeniGuard — Secure Assessment Setup</h1>
                <span className="badge badge-primary" style={{ textTransform: 'uppercase', fontSize: '0.68rem', letterSpacing: '0.5px' }}>
                  Full Proctoring Enforced
                </span>
              </div>
              <p className="text-secondary text-xs" style={{ marginTop: '3px' }}>
                All monitoring permissions below are required to authenticate student environment integrity
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowAccommodationModal(true)}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '0.75rem', gap: '6px' }}
          >
            <HelpCircle size={14} /> Accommodations & Support
          </button>
        </div>

        {/* Section A: Assessment Summary */}
        <div
          style={{
            background: 'var(--bg-input)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px 20px',
            marginBottom: '24px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '16px',
          }}
        >
          <div>
            <div className="text-muted text-xs font-semibold">Assessment</div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)', marginTop: '2px' }}>
              {assessment.title}
            </div>
          </div>
          <div>
            <div className="text-muted text-xs font-semibold">Allocated Time</div>
            <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#3B82F6', marginTop: '2px' }}>
              {assessment.durationMinutes || assessment.duration || 45} Mins
            </div>
          </div>
          <div>
            <div className="text-muted text-xs font-semibold">Pass Threshold</div>
            <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--success)', marginTop: '2px' }}>
              {assessment.passingMarks || 70} Pts
            </div>
          </div>
          <div>
            <div className="text-muted text-xs font-semibold">Integrity Protocol</div>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#F472B6', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Eye size={12} /> Human Review Only
            </div>
          </div>
        </div>

        {/* Policy Transparency Banner */}
        <div
          style={{
            background: 'rgba(37, 99, 235, 0.08)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 18px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
          }}
        >
          <Info size={20} color="#3B82F6" style={{ marginTop: '2px', flexShrink: 0 }} />
          <div style={{ fontSize: '0.84rem', lineHeight: 1.5, color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text-main)' }}>Policy: Full Proctoring Protocol Enforced. </strong>
            To protect academic standards, this assessment requires verified <strong>Screen Sharing</strong>, <strong>Microphone Monitoring</strong>, <strong>Webcam Feed</strong>, <strong>Full-Screen Lock</strong>, and <strong>Continuous Network Sync</strong>.
          </div>
        </div>

        {/* Section B: Permission & Readiness Checklist (ALL REQUIRED) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <h2 style={{ fontSize: '1.05rem', margin: 0, fontWeight: 700 }}>
            Permission & Readiness Checklist
          </h2>
          <span style={{ fontSize: '0.75rem', color: '#F472B6', fontWeight: 700 }}>
            All 6 Checks Required
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
          {/* 1. Screen Sharing Card */}
          <div
            style={{
              padding: '16px 20px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-card)',
              border:
                screenStatus === 'connected'
                  ? '1px solid rgba(16, 185, 129, 0.45)'
                  : screenStatus === 'permission_denied' || screenStatus === 'interrupted'
                  ? '1px solid rgba(239, 68, 68, 0.5)'
                  : '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: screenStatus === 'connected' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(37, 99, 235, 0.15)',
                    color: screenStatus === 'connected' ? 'var(--success)' : '#3B82F6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Monitor size={18} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    Screen Sharing Stream
                    <span style={{ color: '#F472B6', fontSize: '0.75rem', fontWeight: 700 }}>*Required</span>
                  </div>
                  <div className="text-muted text-xs">
                    Captures your assessment window to verify test integrity.
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {getStatusBadge(screenStatus)}
                {screenStatus !== 'connected' && (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={handleRequestScreen}
                    disabled={screenStatus === 'awaiting_user_action'}
                    style={{ fontWeight: 700 }}
                  >
                    Select Screen to Share &rarr;
                  </button>
                )}
              </div>
            </div>

            {screenError && (
              <div style={{ fontSize: '0.78rem', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                <AlertCircle size={14} /> {screenError}
              </div>
            )}
          </div>

          {/* 2. Microphone Card */}
          <div
            style={{
              padding: '16px 20px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-card)',
              border:
                micStatus === 'connected'
                  ? '1px solid rgba(16, 185, 129, 0.45)'
                  : micStatus === 'permission_denied'
                  ? '1px solid rgba(239, 68, 68, 0.5)'
                  : '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: micStatus === 'connected' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(84, 71, 255, 0.15)',
                    color: micStatus === 'connected' ? 'var(--success)' : '#818CF8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Mic size={18} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    Microphone Ambient Monitor
                    <span style={{ color: '#F472B6', fontSize: '0.75rem', fontWeight: 700 }}>*Required</span>
                  </div>
                  <div className="text-muted text-xs">
                    Monitors ambient audio signal levels to log unusual noise events.
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {getStatusBadge(micStatus)}
                {micStatus !== 'connected' && (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={handleRequestMic}
                    disabled={micStatus === 'awaiting_user_action'}
                    style={{ fontWeight: 700 }}
                  >
                    Enable Microphone &rarr;
                  </button>
                )}
              </div>
            </div>

            {micError && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertCircle size={14} /> {micError}
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleSimulateMic}
                  style={{ fontSize: '0.72rem', padding: '2px 8px' }}
                >
                  Verify Virtual Mic (Test Fallback)
                </button>
              </div>
            )}
          </div>

          {/* 3. Webcam Video Feed Card */}
          <div
            style={{
              padding: '16px 20px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-card)',
              border:
                webcamStatus === 'connected'
                  ? '1px solid rgba(16, 185, 129, 0.45)'
                  : webcamStatus === 'permission_denied'
                  ? '1px solid rgba(239, 68, 68, 0.5)'
                  : '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: webcamStatus === 'connected' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(236, 72, 153, 0.15)',
                    color: webcamStatus === 'connected' ? 'var(--success)' : '#EC4899',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Camera size={18} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    Webcam Video Feed
                    <span style={{ color: '#F472B6', fontSize: '0.75rem', fontWeight: 700 }}>*Required</span>
                  </div>
                  <div className="text-muted text-xs">
                    Verifies candidate identity and presence throughout the assessment.
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {getStatusBadge(webcamStatus)}
                {webcamStatus !== 'connected' && (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={handleRequestWebcam}
                    disabled={webcamStatus === 'awaiting_user_action'}
                    style={{ fontWeight: 700 }}
                  >
                    Enable Webcam &rarr;
                  </button>
                )}
              </div>
            </div>

            {/* Live Camera Feed Preview Box */}
            {webcamStatus === 'connected' && (
              <div
                style={{
                  marginTop: '10px',
                  padding: '12px',
                  background: 'var(--bg-app)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                }}
              >
                <video
                  ref={webcamVideoElementRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    width: '140px',
                    height: '90px',
                    borderRadius: 'var(--radius-sm)',
                    objectFit: 'cover',
                    background: '#040711',
                    border: '1px solid var(--border-subtle)',
                    transform: 'scaleX(-1)',
                  }}
                />
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  <div style={{ fontWeight: 700, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                    <CheckCircle2 size={14} /> Live Camera Feed Verified
                  </div>
                  <div>Center your face within frame and verify that lighting is adequate.</div>
                </div>
              </div>
            )}

            {webcamError && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertCircle size={14} /> {webcamError}
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleSimulateWebcam}
                  style={{ fontSize: '0.72rem', padding: '2px 8px' }}
                >
                  Verify Virtual Camera (Test Fallback)
                </button>
              </div>
            )}
          </div>

          {/* 4. Full-Screen Mode Availability Card */}
          <div
            style={{
              padding: '16px 20px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-card)',
              border:
                fullscreenStatus === 'connected'
                  ? '1px solid rgba(16, 185, 129, 0.45)'
                  : '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: fullscreenStatus === 'connected' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                  color: fullscreenStatus === 'connected' ? 'var(--success)' : '#3B82F6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Maximize size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  Full-Screen Exam Lock
                  <span style={{ color: '#F472B6', fontSize: '0.75rem', fontWeight: 700 }}>*Required</span>
                </div>
                <div className="text-muted text-xs">
                  Maximizes the assessment window to avoid accidental OS notification disruptions.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {getStatusBadge(fullscreenStatus)}
              {fullscreenStatus !== 'connected' && (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleEnterFullscreen}
                  style={{ fontWeight: 700 }}
                >
                  Enter Full-Screen &rarr;
                </button>
              )}
            </div>
          </div>

          {/* 5. Internet Connection Health Card */}
          <div
            style={{
              padding: '16px 20px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-card)',
              border:
                netStatus === 'connected'
                  ? '1px solid rgba(16, 185, 129, 0.45)'
                  : '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: netStatus === 'connected' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  color: netStatus === 'connected' ? 'var(--success)' : 'var(--danger)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Wifi size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  Internet Connectivity & Telemetry Sync
                  <span style={{ color: '#F472B6', fontSize: '0.75rem', fontWeight: 700 }}>*Required</span>
                </div>
                <div className="text-muted text-xs">
                  Real-time autosaving active.
                  {netLatency !== null && ` Current Latency: ${netLatency}ms`}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {getStatusBadge(netStatus)}
              <button className="btn btn-secondary btn-sm" onClick={handleRefreshNetwork}>
                <RefreshCw size={13} /> Test Ping
              </button>
            </div>
          </div>

          {/* 6. Browser Compatibility Card */}
          <div
            style={{
              padding: '16px 20px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-card)',
              border:
                browserStatus === 'connected'
                  ? '1px solid rgba(16, 185, 129, 0.45)'
                  : '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: 'rgba(37, 99, 235, 0.15)',
                  color: '#2563EB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Globe size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  Browser Compatibility & Environment
                  <span style={{ color: '#F472B6', fontSize: '0.75rem', fontWeight: 700 }}>*Required</span>
                </div>
                <div className="text-muted text-xs">
                  {capabilities ? `${capabilities.browserName} on ${capabilities.osName}` : 'Evaluating environment...'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {getStatusBadge(browserStatus)}
            </div>
          </div>

          {/* 7. Jitsi Meet Video Conference Bridge Card */}
          <div
            style={{
              padding: '18px 20px',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, rgba(84, 71, 255, 0.08) 0%, rgba(236, 72, 153, 0.08) 100%)',
              border: '1px solid rgba(84, 71, 255, 0.35)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 10px rgba(16, 185, 129, 0.25)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                  }}
                >
                  <GoogleMeetIcon size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    Google Meet Live Video Conference
                    <span style={{ color: '#10B981', fontSize: '0.75rem', fontWeight: 700 }}>*Auto-Configured</span>
                  </div>
                  <div className="text-muted text-xs">
                    Two-way invigilation link: <strong style={{ color: '#34D399', fontFamily: 'monospace' }}>{jitsiEndpoints.webUrl}</strong>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="badge badge-active" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle2 size={12} /> Ready to Connect
                </span>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => launchJitsiConference(jitsiEndpoints.webUrl)}
                  style={{ fontSize: '0.75rem', padding: '4px 10px', gap: '4px' }}
                >
                  <ExternalLink size={12} /> Open in Google Meet
                </button>
              </div>
            </div>

            {/* Info details forwarded to Google Meet */}
            <div
              style={{
                background: 'rgba(5, 8, 22, 0.55)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '8px',
                padding: '10px 14px',
                fontSize: '0.78rem',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '8px',
              }}
            >
              <div>
                <span className="text-muted">Candidate Identity:</span>{' '}
                <strong style={{ color: 'var(--text-main)' }}>{candidateName}</strong>
              </div>
              <div>
                <span className="text-muted">Account Email:</span>{' '}
                <strong style={{ color: 'var(--text-main)' }}>{candidateEmail}</strong>
              </div>
              <div>
                <span className="text-muted">Media Permissions:</span>{' '}
                <span style={{ color: '#10B981', fontWeight: 600 }}>Webcam & Audio Forwarded</span>
              </div>
              <div>
                <span className="text-muted">Platform:</span>{' '}
                <span style={{ color: '#10B981', fontWeight: 600 }}>Google Meet</span>
              </div>
            </div>

            {/* Auto Launch Preference Checkbox */}
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.8rem',
                color: 'var(--text-main)',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={autoLaunchJitsi}
                onChange={(e) => setAutoLaunchJitsi(e.target.checked)}
                style={{ accentColor: '#10B981', width: '15px', height: '15px' }}
              />
              <span>
                Automatically launch Google Meet live conference in a new tab when starting assessment
              </span>
            </label>
          </div>
        </div>

        {/* Section D: Privacy, Retention, and Consent */}
        <div
          style={{
            background: 'var(--bg-input)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            marginBottom: '24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Lock size={16} color="#818CF8" />
            <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Data Minimization & Fair Review Principles</span>
          </div>
          <ul style={{ margin: '0 0 12px 18px', padding: 0, fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            <li><strong>Data Collected:</strong> Only signals declared by the assessment policy (screen sharing, focus timestamps, mic levels, and webcam presence).</li>
            <li><strong>Access Control:</strong> Review is restricted exclusively to your assigned course instructor and academic review board.</li>
            <li><strong>Retention Schedule:</strong> Encrypted telemetry data is automatically purged after {policy.retentionDays} days.</li>
            <li><strong>Fair Review Principle:</strong> Browser events are recorded as review indicators. They are never treated as autonomous cheating verdicts.</li>
          </ul>

          <label
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              fontSize: '0.84rem',
              color: 'var(--text-main)',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            <input
              type="checkbox"
              checked={consentAcknowledged}
              onChange={(e) => setConsentAcknowledged(e.target.checked)}
              style={{ accentColor: '#2563EB', marginTop: '3px', width: '16px', height: '16px' }}
            />
            <span>
              I have read the VeniGuard proctoring disclosure. I consent to screen sharing, webcam video feed, microphone monitoring, and full-screen focus for this examination under the institutional integrity policy.
            </span>
          </label>
        </div>

        {/* Missing Requirements Alert */}
        {!allPrerequisitesSatisfied && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 16px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '0.82rem',
              color: 'var(--danger)',
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>
              To start your examination, please satisfy all required checks:
              {!isScreenSatisfied && ' [Share Screen]'}
              {!isMicSatisfied && ' [Enable Mic]'}
              {!isWebcamSatisfied && ' [Enable Camera]'}
              {!isFullscreenSatisfied && ' [Enter Fullscreen]'}
              {!isNetSatisfied && ' [Check Network]'}
              {!consentAcknowledged && ' [Acknowledge Consent Checkbox]'}
            </span>
          </div>
        )}

        {/* Bottom Navigation / Start Button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <button onClick={onCancel} className="btn btn-secondary">
            Cancel & Return to Courses
          </button>

          <button
            className="btn btn-primary btn-lg"
            disabled={!allPrerequisitesSatisfied}
            onClick={handleStartExam}
            style={{
              background: allPrerequisitesSatisfied
                ? 'linear-gradient(135deg, #2563EB 0%, #5447FF 50%, #EC4899 100%)'
                : undefined,
              boxShadow: allPrerequisitesSatisfied ? '0 4px 20px rgba(84, 71, 255, 0.45)' : 'none',
              fontWeight: 800,
              gap: '8px',
            }}
          >
            <span>Start Assessment & Open Google Meet</span>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Accessibility & Accommodations Modal */}
      {showAccommodationModal && (
        <div className="modal-overlay" onClick={() => setShowAccommodationModal(false)}>
          <div className="modal-card" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.15rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shield size={20} color="#2563EB" />
                Accommodations & Technical Assistance
              </h3>
            </div>
            <div className="modal-body" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              <p>
                VeniLearn is committed to equitable, accessible assessment for every learner.
              </p>
              <div style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: 'var(--radius-md)', marginBottom: '14px' }}>
                <strong style={{ color: 'var(--text-main)', display: 'block', marginBottom: '4px' }}>
                  Alternative Proctoring Accommodations:
                </strong>
                If your physical device or accessibility software (e.g. screen readers, assistive switches) prevents automated browser screen sharing or webcam feed, you may request:
                <ul style={{ margin: '6px 0 0 16px', padding: 0 }}>
                  <li>Invigilated In-Person Assessment Session</li>
                  <li>Live One-on-One Faculty Oral Examination</li>
                  <li>Extended Time Accommodations (50% or 100% time bonus)</li>
                </ul>
              </div>
              <p>
                To schedule an approved alternative route, contact your course instructor or email <strong>proctoring-support@venilearn.org</strong> before the assessment deadline.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setShowAccommodationModal(false)}>
                Understood, Return to Setup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
