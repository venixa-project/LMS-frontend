import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Assessment, ProctoringPolicy } from '../../../types';
import { useAuthStore } from '../../../lib/store';
import {
  Shield, Monitor, Mic, Camera, Wifi, Globe, Maximize,
  CheckCircle2, AlertTriangle, AlertCircle, Info, RefreshCw,
  ExternalLink, ChevronRight, Lock, Eye, HelpCircle, Check, Play,
  Video, X
} from 'lucide-react';
import { buildJitsiUrls, launchJitsiConference } from '../../../lib/jitsiProctoring';
import { GoogleMeetIcon } from '../../../components/GoogleMeet';
import {
  checkBrowserCapabilities,
  requestScreenCapture,
  requestUserMedia,
  probeConnectedHardware,
  isInsecureLanOrigin,
  getLocalhostEquivalentUrl,
  getCollegeLanHttpsUrl,
  getPublicHttpsUrl,
  getSecurityContextReport,
  probeIsLocalhostAvailable,
  SecurityContextReport,
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
  const [securityReport, setSecurityReport] = useState<SecurityContextReport>(() => getSecurityContextReport());

  // Dedicated stream references
  const screenStreamRef = useRef<MediaStream | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const webcamVideoElementRef = useRef<HTMLVideoElement | null>(null);

  // Dynamically resolve required permissions from assessment settings
  const needsScreen = Boolean(assessment?.proctoringSettings?.screenShare ?? policy.requireScreenShare);
  const needsMic = assessment?.proctoringSettings?.mic !== undefined ? Boolean(assessment.proctoringSettings.mic) : Boolean(policy.requireMicrophone);
  const needsWebcam = assessment?.proctoringSettings?.camera !== undefined ? Boolean(assessment.proctoringSettings.camera) : Boolean(policy.requireWebcam);
  const needsFullscreen = Boolean(policy.requireFullscreen ?? true);

  // Status for each check (Dynamic based on settings)
  const [screenStatus, setScreenStatus] = useState<CheckStatus>(() => needsScreen ? 'permission_required' : 'not_required');
  const [screenError, setScreenError] = useState<string | null>(null);
  const [screenDeviceLabel, setScreenDeviceLabel] = useState<string>('');

  const [micStatus, setMicStatus] = useState<CheckStatus>(() => needsMic ? 'permission_required' : 'not_required');
  const [micError, setMicError] = useState<string | null>(null);
  const [audioDeviceLabel, setAudioDeviceLabel] = useState<string>('');
  const [audioLevel, setAudioLevel] = useState<number>(0);

  const [webcamStatus, setWebcamStatus] = useState<CheckStatus>(() => needsWebcam ? 'permission_required' : 'not_required');
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const [videoDeviceLabel, setVideoDeviceLabel] = useState<string>('');

  const [netStatus, setNetStatus] = useState<CheckStatus>('not_checked');
  const [netLatency, setNetLatency] = useState<number | null>(null);

  const [browserStatus, setBrowserStatus] = useState<CheckStatus>('not_checked');
  const [fullscreenStatus, setFullscreenStatus] = useState<CheckStatus>('permission_required');
  const [customMeetInput, setCustomMeetInput] = useState<string>('');

  // Real AudioContext and Analyser for Live VU Meter
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const audioMeterBarRef = useRef<HTMLDivElement | null>(null);
  const audioMeterTextRef = useRef<HTMLSpanElement | null>(null);
  const isTransitioningToExamRef = useRef<boolean>(false);

  // Check if manual or combined Google Meet invigilation is configured
  const isMeetProctoring =
    assessment.proctoringMode === 'manual' ||
    assessment.proctoringMode === 'combined' ||
    Boolean(assessment.jitsiRoomId) ||
    Boolean((assessment as any).googleMeetUrl);

  // Consent & accommodations
  const [consentAcknowledged, setConsentAcknowledged] = useState(false);
  const [showAccommodationModal, setShowAccommodationModal] = useState(false);

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
      customMeetUrl: (assessment as any).googleMeetUrl,
      jitsiRoomId: assessment.jitsiRoomId,
    });
  }, [assessment.id, assessment.title, assessment.jitsiRoomId, (assessment as any).googleMeetUrl, candidateId, candidateName, candidateEmail]);

  // Initial capability and status check
  useEffect(() => {
    const caps = checkBrowserCapabilities();
    const sec = getSecurityContextReport();
    setCapabilities(caps);
    setSecurityReport(sec);
    const isSec = sec.isSecureContext;
    setBrowserStatus((caps.isCompatible && isSec) ? 'connected' : (!isSec ? 'permission_denied' : 'unsupported'));

    // If viewing via insecure LAN IP on the host machine, proactively transition to localhost:5173
    if (!isSec && typeof window !== 'undefined') {
      probeIsLocalhostAvailable().then((isAvailable) => {
        if (isAvailable) {
          window.location.replace(getLocalhostEquivalentUrl());
        }
      });
    }

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

  // Handle auto-trigger intent after redirection to secure context (e.g. from insecure LAN to localhost)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.isSecureContext) return;

    const urlParams = new URLSearchParams(window.location.search);
    const autoTrigger = urlParams.get('autoTrigger') || sessionStorage.getItem('veniguard_auto_trigger');

    if (autoTrigger) {
      sessionStorage.removeItem('veniguard_auto_trigger');
      if (urlParams.has('autoTrigger')) {
        urlParams.delete('autoTrigger');
        const cleanSearch = urlParams.toString() ? `?${urlParams.toString()}` : '';
        window.history.replaceState({}, '', `${window.location.pathname}${cleanSearch}${window.location.hash}`);
      }

      // Automatically execute requested hardware action without requiring a second click
      const timer = setTimeout(() => {
        if (autoTrigger === 'mic') {
          handleRequestMic();
        } else if (autoTrigger === 'webcam') {
          handleRequestWebcam();
        }
      }, 350);

      return () => clearTimeout(timer);
    }
  }, []);

  // Real-time hardware device monitoring (enumerateDevices & ondevicechange)
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices || typeof navigator.mediaDevices.addEventListener !== 'function') {
      return;
    }

    const handleDeviceChange = async () => {
      try {
        const { hasAudioHardware, hasVideoHardware } = await probeConnectedHardware();

        if (needsMic && micStatus === 'connected' && !hasAudioHardware) {
          stopAllMediaTracks(audioStreamRef.current);
          audioStreamRef.current = null;
          setMicStatus('interrupted');
          setMicError('Physical microphone hardware was disconnected from your system.');
          setAudioLevel(0);
        }

        if (needsWebcam && webcamStatus === 'connected' && !hasVideoHardware) {
          stopAllMediaTracks(videoStreamRef.current);
          videoStreamRef.current = null;
          setWebcamStatus('interrupted');
          setWebcamError('Physical webcam hardware was disconnected from your system.');
          if (webcamVideoElementRef.current) {
            webcamVideoElementRef.current.srcObject = null;
          }
        }
      } catch (err) {
        console.warn('Hardware device change probe notice:', err);
      }
    };

    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    };
  }, [needsMic, needsWebcam, micStatus, webcamStatus]);

  // Clean up media streams and AudioContext on unmount (unless transitioning into live exam)
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
      if (!isTransitioningToExamRef.current) {
        stopAllMediaTracks(audioStreamRef.current);
        stopAllMediaTracks(videoStreamRef.current);
        stopAllMediaTracks(screenStreamRef.current);
      }
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
      const { stream, track } = await requestScreenCapture(() => {
        setScreenStatus('interrupted');
        setScreenError('Screen sharing was ended or closed. Please restore screen sharing to satisfy exam policy.');
      });
      screenStreamRef.current = stream;
      setScreenDeviceLabel(track?.label || 'Active Display Stream');
      setScreenStatus('connected');
    } catch (err: any) {
      setScreenStatus('permission_denied');
      setScreenError(err.message || 'Screen sharing access was cancelled or denied in browser.');
    }
  };

  // 2. Start Real-Time Physical Audio VU Meter
  const startAudioMeter = (stream: MediaStream, _track?: MediaStreamTrack) => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) {
        setAudioLevel(0);
        return;
      }

      const ctx = new AudioCtx();
      audioContextRef.current = ctx;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.2;
      analyserRef.current = analyser;

      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      const hasFloat = typeof analyser.getFloatTimeDomainData === 'function';
      const floatData = hasFloat ? new Float32Array(analyser.fftSize) : null;
      const byteData = !hasFloat ? new Uint8Array(analyser.fftSize) : null;

      let smoothedLevel = 0;
      let lastThrottleUpdate = 0;

      const updateMeter = (timestamp: number) => {
        if (!analyserRef.current) return;

        let sumSquares = 0;
        if (hasFloat && floatData) {
          analyserRef.current.getFloatTimeDomainData(floatData);
          for (let i = 0; i < floatData.length; i++) {
            const val = floatData[i];
            sumSquares += val * val;
          }
        } else if (byteData) {
          analyserRef.current.getByteTimeDomainData(byteData);
          for (let i = 0; i < byteData.length; i++) {
            const val = (byteData[i] - 128) / 128;
            sumSquares += val * val;
          }
        }
        const sampleCount = floatData?.length || byteData?.length || 512;
        const rms = Math.sqrt(sumSquares / sampleCount);

        // Acoustic Decibel & Dynamic Range Calibration:
        // Ambient room silence / fan noise: RMS < 0.007 (-43 dB) -> 0% (Clean baseline, no stuck 13%)
        // Whisper / quiet voice: RMS 0.015 - 0.035 (-36 dB to -29 dB) -> 20% - 40%
        // Normal conversational speech: RMS 0.04 - 0.16 (-28 dB to -16 dB) -> 50% - 75%
        // Loud vocal projection / clap: RMS > 0.20 (-14 dB to 0 dB) -> 85% - 100%
        let targetLevel = 0;
        if (rms > 0.007) {
          const db = 20 * Math.log10(rms);
          const minDb = -45; // Silence floor threshold
          const maxDb = -13; // Max vocal range
          const ratio = (db - minDb) / (maxDb - minDb);
          targetLevel = Math.max(0, Math.min(100, Math.round(ratio * 100)));
        }

        // Fast attack (immediate jump when student speaks), smooth decay (gentle release between words)
        if (targetLevel > smoothedLevel) {
          smoothedLevel = Math.round(smoothedLevel * 0.25 + targetLevel * 0.75);
        } else {
          smoothedLevel = Math.round(smoothedLevel * 0.82 + targetLevel * 0.18);
          if (smoothedLevel < 1) smoothedLevel = 0;
        }

        // 1. Direct DOM update (hardware-accelerated 60fps with zero React re-render stutter)
        if (audioMeterBarRef.current) {
          audioMeterBarRef.current.style.width = `${Math.max(0, smoothedLevel)}%`;
          audioMeterBarRef.current.style.background =
            smoothedLevel > 65
              ? 'linear-gradient(90deg, #10B981, #F59E0B)'
              : 'linear-gradient(90deg, #3B82F6, #10B981)';
        }
        if (audioMeterTextRef.current) {
          audioMeterTextRef.current.textContent = `Live Input: ${smoothedLevel}%`;
        }

        // 2. Throttled React state update (~120ms) to keep state in sync
        if (timestamp - lastThrottleUpdate > 120) {
          setAudioLevel(smoothedLevel);
          lastThrottleUpdate = timestamp;
        }

        animFrameRef.current = requestAnimationFrame(updateMeter);
      };

      animFrameRef.current = requestAnimationFrame(updateMeter);
    } catch (audioErr) {
      console.warn('AudioContext initialization notice:', audioErr);
      setAudioLevel(0);
    }
  };

  // 2. Handle Genuine Physical Microphone Request
  const handleRequestMic = async () => {
    // If on insecure origin and localhost dev environment is reachable, seamlessly redirect and auto-trigger
    if (typeof window !== 'undefined' && window.isSecureContext === false) {
      const isLanDev = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
      if (isLanDev) {
        sessionStorage.setItem('veniguard_auto_trigger', 'mic');
        const sep = window.location.search ? '&' : '?';
        window.location.href = getLocalhostEquivalentUrl() + `${sep}autoTrigger=mic`;
        return;
      }
    }

    if (audioStreamRef.current) {
      stopAllMediaTracks(audioStreamRef.current);
      audioStreamRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setAudioLevel(0);
    setMicStatus('awaiting_user_action');
    setMicError(null);

    try {
      const { stream } = await requestUserMedia(
        { audio: true, video: false },
        {
          onEnded: () => {
            setMicStatus('interrupted');
            setMicError('Microphone hardware disconnected or stream ended. Please reconnect your microphone and retry.');
            setAudioLevel(0);
          },
          onMute: () => {
            setAudioDeviceLabel((prev) => (prev ? `${prev.replace(' (Muted)', '')} (Muted)` : 'Microphone (Muted)'));
          },
          onUnmute: () => {
            setAudioDeviceLabel((prev) => prev.replace(' (Muted)', ''));
          },
        }
      );

      audioStreamRef.current = stream;
      const track = stream.getAudioTracks()[0];
      const rawAudio = track?.label || 'Active System Microphone';
      setAudioDeviceLabel(rawAudio);
      setMicStatus('connected');
      setMicError(null);
      startAudioMeter(stream, track);
    } catch (err: any) {
      setMicStatus('permission_denied');
      setMicError(err.message || 'Microphone access could not be acquired.');
    }
  };

  // 3. Handle Genuine Physical Webcam Request
  const handleRequestWebcam = async () => {
    // If on insecure origin and localhost dev environment is reachable, seamlessly redirect and auto-trigger
    if (typeof window !== 'undefined' && window.isSecureContext === false) {
      const isLanDev = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
      if (isLanDev) {
        sessionStorage.setItem('veniguard_auto_trigger', 'webcam');
        const sep = window.location.search ? '&' : '?';
        window.location.href = getLocalhostEquivalentUrl() + `${sep}autoTrigger=webcam`;
        return;
      }
    }

    if (videoStreamRef.current) {
      stopAllMediaTracks(videoStreamRef.current);
      videoStreamRef.current = null;
    }
    setWebcamStatus('awaiting_user_action');
    setWebcamError(null);

    try {
      const { stream } = await requestUserMedia(
        { audio: false, video: true },
        {
          onEnded: () => {
            setWebcamStatus('interrupted');
            setWebcamError('Webcam hardware disconnected or video feed ended. Please reconnect your camera and retry.');
            if (webcamVideoElementRef.current) {
              webcamVideoElementRef.current.srcObject = null;
            }
          },
          onMute: () => {
            setVideoDeviceLabel((prev) => (prev ? `${prev.replace(' (Muted)', '')} (Muted)` : 'Camera (Muted)'));
          },
          onUnmute: () => {
            setVideoDeviceLabel((prev) => prev.replace(' (Muted)', ''));
          },
        }
      );

      videoStreamRef.current = stream;
      const track = stream.getVideoTracks()[0];
      const rawVid = track?.label || 'Integrated Physical Camera';
      setVideoDeviceLabel(rawVid);
      setWebcamStatus('connected');
      setWebcamError(null);

      if (webcamVideoElementRef.current) {
        webcamVideoElementRef.current.srcObject = stream;
        webcamVideoElementRef.current.onloadedmetadata = () => {
          webcamVideoElementRef.current?.play().catch(() => {});
        };
        webcamVideoElementRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      setWebcamStatus('permission_denied');
      setWebcamError(err.message || 'Webcam access could not be acquired.');
    }
  };

  // Safe Cancel Setup Handler
  const handleCancelSetup = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
    }
    stopAllMediaTracks(audioStreamRef.current);
    stopAllMediaTracks(videoStreamRef.current);
    stopAllMediaTracks(screenStreamRef.current);
    onCancel();
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

  // Verify active prerequisites based on assessment configuration
  const isScreenSatisfied = !needsScreen || screenStatus === 'connected' || screenStatus === 'not_required';
  const isMicSatisfied = !needsMic || micStatus === 'connected' || micStatus === 'not_required';
  const isWebcamSatisfied = !needsWebcam || webcamStatus === 'connected' || webcamStatus === 'not_required';
  const isFullscreenSatisfied = !needsFullscreen || fullscreenStatus === 'connected';
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

  const totalRequiredChecks = [
    needsScreen,
    needsMic,
    needsWebcam,
    needsFullscreen,
    true, // Network
    true, // Browser
  ].filter(Boolean).length;

  // Calculate pass percentage safely
  const totalMarks = Number(assessment.totalMarks) || 100;
  const rawPass = Number(assessment.passingMarks) || 0;
  const passPercent = assessment.passmark
    ? Number(assessment.passmark)
    : (assessment as any).passingPercentage
    ? Number((assessment as any).passingPercentage)
    : rawPass > 0 && totalMarks > 0
    ? Math.min(100, Math.round((rawPass / totalMarks) * 100))
    : 70;

  const handleStartExam = () => {
    if (!allPrerequisitesSatisfied) return;

    // Mark transition to live exam to protect media streams from unmount cleanup
    isTransitioningToExamRef.current = true;

    // Ensure fullscreen is active when student starts the exam
    if (!isCurrentlyFullscreen()) {
      enterFullscreen().catch(() => {});
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
      case 'not_required':
        return (
          <span className="badge badge-secondary" style={{ display: 'flex', alignItems: 'center', gap: '4px', opacity: 0.85 }}>
            <Check size={12} /> Not Required
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
    <div style={{ maxWidth: '1020px', margin: '24px auto', padding: '0 16px' }}>
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
                <span
                  className="badge badge-primary"
                  style={{
                    background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.25) 0%, rgba(84, 71, 255, 0.25) 100%)',
                    border: '1px solid rgba(129, 140, 248, 0.4)',
                    color: '#818CF8',
                    textTransform: 'uppercase',
                    fontSize: '0.68rem',
                    letterSpacing: '0.5px',
                    fontWeight: 700,
                  }}
                >
                  Secure Assessment Active
                </span>
              </div>
              <p className="text-secondary text-xs" style={{ marginTop: '3px' }}>
                Please complete the environment verification below to begin your examination.
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
              {passPercent}%
            </div>
          </div>
          <div>
            <div className="text-muted text-xs font-semibold">Session Security</div>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#F472B6', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Eye size={12} /> Online Verified Session
            </div>
          </div>
        </div>

        {/* Section B: Permission & Readiness Checklist */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <h2 style={{ fontSize: '1.05rem', margin: 0, fontWeight: 700 }}>
            Permission & Readiness Checklist
          </h2>
          <span style={{ fontSize: '0.75rem', color: '#F472B6', fontWeight: 700 }}>
            All {totalRequiredChecks} Checks Required
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '14px', marginBottom: '20px' }}>
                    {/* 2. Microphone Card with Live VU Meter */}
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
                    style={{ fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    {micStatus === 'awaiting_user_action' ? (
                      <>
                        <RefreshCw size={13} className="spin-slow" /> Connecting...
                      </>
                    ) : micStatus === 'permission_denied' || micStatus === 'interrupted' ? (
                      <>
                        <RefreshCw size={13} /> Retry Microphone &rarr;
                      </>
                    ) : (
                      'Enable Microphone →'
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Live Audio Visualizer VU Meter */}
            {micStatus === 'connected' && (
              <div
                style={{
                  marginTop: '10px',
                  padding: '10px 14px',
                  background: 'var(--bg-app)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle2 size={13} /> Live System Microphone Connected: {audioDeviceLabel || 'Active Audio Input'}
                  </span>
                  <span ref={audioMeterTextRef} style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Live Input: {audioLevel}%
                  </span>
                </div>
                {/* Audio Level Bar */}
                <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div
                    ref={audioMeterBarRef}
                    style={{
                      width: `${Math.max(0, audioLevel)}%`,
                      height: '100%',
                      background: audioLevel > 65 ? 'linear-gradient(90deg, #10B981, #F59E0B)' : 'linear-gradient(90deg, #3B82F6, #10B981)',
                      transition: 'width 0.05s ease-out',
                      borderRadius: '4px',
                    }}
                  />
                </div>
              </div>
            )}

            {micError && (
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  fontSize: '0.78rem',
                  color: 'var(--danger)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '8px',
                  marginTop: '4px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: '1 1 220px' }}>
                  <AlertCircle size={15} style={{ flexShrink: 0 }} />
                  <span>{micError}</span>
                </div>
                {(isInsecureLanOrigin() || securityReport.isInsecureHttp) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', flexShrink: 0 }}>
                    {securityReport.collegeLanHttpsUrl && (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => { window.location.href = securityReport.collegeLanHttpsUrl!; }}
                        style={{ fontSize: '0.74rem', padding: '4px 10px', fontWeight: 700 }}
                        title="Access through trusted College LAN HTTPS domain"
                      >
                        Switch to College HTTPS &rarr;
                      </button>
                    )}
                    {securityReport.publicHttpsUrl && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => { window.location.href = securityReport.publicHttpsUrl!; }}
                        style={{ fontSize: '0.74rem', padding: '4px 10px' }}
                      >
                        Switch to Public HTTPS &rarr;
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        sessionStorage.setItem('veniguard_auto_trigger', 'mic');
                        const sep = window.location.search ? '&' : '?';
                        window.location.href = getLocalhostEquivalentUrl() + `${sep}autoTrigger=mic`;
                      }}
                      style={{ fontSize: '0.74rem', padding: '4px 10px' }}
                    >
                      Switch to localhost:5173 &rarr;
                    </button>
                  </div>
                )}
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
                    style={{ fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    {webcamStatus === 'awaiting_user_action' ? (
                      <>
                        <RefreshCw size={13} className="spin-slow" /> Connecting...
                      </>
                    ) : webcamStatus === 'permission_denied' || webcamStatus === 'interrupted' ? (
                      <>
                        <RefreshCw size={13} /> Retry Camera &rarr;
                      </>
                    ) : (
                      'Enable Webcam →'
                    )}
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
                  ref={(el) => {
                    webcamVideoElementRef.current = el;
                    if (el && videoStreamRef.current && el.srcObject !== videoStreamRef.current) {
                      el.srcObject = videoStreamRef.current;
                      el.play().catch(() => {});
                    }
                  }}
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
                    <CheckCircle2 size={14} /> Live System Camera Feed Verified
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '3px' }}>
                    Active Device: {videoDeviceLabel || 'Integrated Camera'}
                  </div>
                  <div>Center your face within frame and verify that lighting is adequate.</div>
                </div>
              </div>
            )}

            {webcamError && (
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  fontSize: '0.78rem',
                  color: 'var(--danger)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '8px',
                  marginTop: '4px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: '1 1 220px' }}>
                  <AlertCircle size={15} style={{ flexShrink: 0 }} />
                  <span>{webcamError}</span>
                </div>
                {(isInsecureLanOrigin() || securityReport.isInsecureHttp) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', flexShrink: 0 }}>
                    {securityReport.collegeLanHttpsUrl && (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => { window.location.href = securityReport.collegeLanHttpsUrl!; }}
                        style={{ fontSize: '0.74rem', padding: '4px 10px', fontWeight: 700 }}
                        title="Access through trusted College LAN HTTPS domain"
                      >
                        Switch to College HTTPS &rarr;
                      </button>
                    )}
                    {securityReport.publicHttpsUrl && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => { window.location.href = securityReport.publicHttpsUrl!; }}
                        style={{ fontSize: '0.74rem', padding: '4px 10px' }}
                      >
                        Switch to Public HTTPS &rarr;
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        sessionStorage.setItem('veniguard_auto_trigger', 'mic');
                        const sep = window.location.search ? '&' : '?';
                        window.location.href = getLocalhostEquivalentUrl() + `${sep}autoTrigger=mic`;
                      }}
                      style={{ fontSize: '0.74rem', padding: '4px 10px' }}
                    >
                      Switch to localhost:5173 &rarr;
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 1. Screen Sharing Card (Only active if requested by author) */}
          {needsScreen ? (
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
                      Captures your assessment window to verify test environment.
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
                      style={{ fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      {screenStatus === 'awaiting_user_action' ? (
                        <>
                          <RefreshCw size={13} className="spin-slow" /> Connecting...
                        </>
                      ) : screenStatus === 'permission_denied' || screenStatus === 'interrupted' ? (
                        <>
                          <RefreshCw size={13} /> Retry Screen Share &rarr;
                        </>
                      ) : (
                        'Select Screen to Share →'
                      )}
                    </button>
                  )}
                </div>
              </div>

              {screenStatus === 'connected' && (
                <div style={{ marginTop: '4px', fontSize: '0.8rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={13} /> Active Display: {screenDeviceLabel || 'Assessment Screen Window'}
                </div>
              )}

              {screenError && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertCircle size={14} /> {screenError}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div
              style={{
                padding: '12px 20px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                opacity: 0.85,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'rgba(59, 130, 246, 0.1)',
                    color: '#3B82F6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Monitor size={17} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>Screen Sharing Stream</div>
                  <div className="text-muted text-xs">Not required for this assessment.</div>
                </div>
              </div>
              <span className="badge badge-secondary" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Check size={12} /> Not Required
              </span>
            </div>
          )}

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
                  {' • '}
                  <span style={{ color: securityReport.isSecureContext ? '#10B981' : '#F59E0B', fontWeight: 600 }}>
                    {securityReport.isSecureContext ? 'Secure Context (HTTPS)' : 'Insecure Origin (HTTPS Required for Devices)'}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {getStatusBadge(browserStatus)}
            </div>
          </div>

                    {/* 7. Google Meet Video Conference Bridge Card */}
          <div
            style={{
              gridColumn: '1 / -1',
              padding: '16px 20px',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, rgba(84, 71, 255, 0.08) 0%, rgba(16, 185, 129, 0.08) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 10px rgba(16, 185, 129, 0.25)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    flexShrink: 0,
                  }}
                >
                  <GoogleMeetIcon size={22} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.94rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    Google Meet Live Video Conference
                    <span style={{ color: '#10B981', fontSize: '0.75rem', fontWeight: 700 }}>*Ready to Join</span>
                  </div>
                  <div className="text-muted text-xs" style={{ marginTop: '2px' }}>
                    {jitsiEndpoints.webUrl === 'https://meet.google.com/new'
                      ? 'Launch an instant Google Meet room (creates active video call with live camera & microphone).'
                      : <span>Live meeting room: <strong style={{ color: '#34D399', fontFamily: 'monospace' }}>{jitsiEndpoints.webUrl}</strong></span>}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    const target = customMeetInput.trim() || jitsiEndpoints.webUrl;
                    const finalUrl = target.startsWith('http') ? target : `https://meet.google.com/${target.replace(/^meet\.google\.com\//, '')}`;
                    launchJitsiConference(finalUrl);
                  }}
                  style={{
                    fontSize: '0.8rem',
                    padding: '7px 16px',
                    fontWeight: 700,
                    gap: '6px',
                    background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                    border: 'none',
                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                  }}
                >
                  <ExternalLink size={14} /> Open in Google Meet &rarr;
                </button>
              </div>
            </div>

            {/* Custom Meet Code or Link Join Bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(5, 8, 22, 0.45)',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                flexWrap: 'wrap',
              }}
            >
              <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                Join with teacher's code:
              </span>
              <input
                type="text"
                value={customMeetInput}
                onChange={(e) => setCustomMeetInput(e.target.value)}
                placeholder="e.g. abc-defg-hij or meet.google.com/abc-defg-hij"
                style={{
                  flex: '1 1 200px',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  fontSize: '0.78rem',
                  color: '#fff',
                }}
              />
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  if (!customMeetInput.trim()) {
                    launchJitsiConference('https://meet.google.com/new');
                    return;
                  }
                  const target = customMeetInput.trim();
                  const finalUrl = target.startsWith('http') ? target : `https://meet.google.com/${target.replace(/^meet\.google\.com\//, '')}`;
                  launchJitsiConference(finalUrl);
                }}
                style={{ fontSize: '0.74rem', padding: '4px 10px', gap: '4px' }}
              >
                Join Code
              </button>
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
                <span style={{ color: '#10B981', fontWeight: 600 }}>Webcam & Audio Ready</span>
              </div>
              <div>
                <span className="text-muted">Platform:</span>{' '}
                <span style={{ color: '#10B981', fontWeight: 600 }}>Google Meet</span>
              </div>
            </div>
          </div>
        
</div>

        {/* Policy Transparency Banner (Moved down below Checklist) */}
        <div
          style={{
            background: 'rgba(37, 99, 235, 0.08)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 18px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
          }}
        >
          <Info size={20} color="#3B82F6" style={{ marginTop: '2px', flexShrink: 0 }} />
          <div style={{ fontSize: '0.84rem', lineHeight: 1.5, color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text-main)' }}>Policy: Examination Integrity Guidelines. </strong>
            To protect academic standards and ensure fair testing, this assessment requires verified{' '}
            {needsScreen && <span><strong>Screen Sharing</strong>, </span>}
            {needsMic && <span><strong>Microphone Monitoring</strong>, </span>}
            {needsWebcam && <span><strong>Webcam Feed</strong>, </span>}
            <strong>Full-Screen Lock</strong>, and <strong>Continuous Network Sync</strong>.
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
            <li><strong>Data Collected:</strong> Only signals declared by the assessment policy ({needsScreen ? 'screen sharing, ' : ''}focus timestamps{needsMic ? ', mic levels' : ''}{needsWebcam ? ', and webcam presence' : ''}).</li>
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
              I have reviewed the assessment environment guidelines. I agree to maintain active focus in full-screen mode and comply with institutional academic integrity policies throughout this examination.
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
              {needsScreen && !isScreenSatisfied && ' [Share Screen]'}
              {needsMic && !isMicSatisfied && ' [Enable Mic]'}
              {needsWebcam && !isWebcamSatisfied && ' [Enable Camera]'}
              {needsFullscreen && !isFullscreenSatisfied && ' [Enter Fullscreen]'}
              {!isNetSatisfied && ' [Check Network]'}
              {!consentAcknowledged && ' [Acknowledge Consent Checkbox]'}
            </span>
          </div>
        )}

        {/* Bottom Navigation / Start Button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <button onClick={handleCancelSetup} className="btn btn-secondary">
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
            <span>Start Assessment</span>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Accessibility & Accommodations Modal */}
      {showAccommodationModal && (
        <div className="modal-overlay" onClick={() => setShowAccommodationModal(false)}>
          <div className="modal-card" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.15rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#FFFFFF' }}>
                <Shield size={20} color="#FFFFFF" />
                Accommodations & Technical Assistance
              </h3>
              <button
                type="button"
                onClick={() => setShowAccommodationModal(false)}
                title="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              <p>
                VeniLearn is committed to equitable, accessible assessment for every learner.
              </p>
              <div style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: 'var(--radius-md)', marginBottom: '14px' }}>
                <strong style={{ color: 'var(--text-main)', display: 'block', marginBottom: '4px' }}>
                  Alternative Examination Accommodations:
                </strong>
                If your physical device or accessibility software (e.g. screen readers, assistive switches) prevents automated browser verification, you may request:
                <ul style={{ margin: '6px 0 0 16px', padding: 0 }}>
                  <li>Invigilated In-Person Assessment Session</li>
                  <li>Live One-on-One Faculty Oral Examination</li>
                  <li>Extended Time Accommodations (50% or 100% time bonus)</li>
                </ul>
              </div>
              <p>
                To schedule an approved alternative route, contact your course instructor or email <strong>support@venilearn.org</strong> before the assessment deadline.
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
        
