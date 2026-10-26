import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../../../lib/store';
import { useProctoringStore } from '../../../lib/proctoringStore';
import {
  Shield, Camera, Mic, MicOff, Monitor, AlertTriangle, CheckCircle2,
  X, Volume2, Eye, Lock
} from 'lucide-react';

interface StudentProctorWidgetProps {
  assessmentId: string;
  learnerId?: string;
  learnerName?: string;
  isExamActive: boolean;
  onForceSubmit?: (reason: string) => void;
}

export const StudentProctorWidget: React.FC<StudentProctorWidgetProps> = ({
  assessmentId,
  learnerId = 'u-007',
  learnerName = 'Alex Thompson',
  isExamActive,
  onForceSubmit,
}) => {
  const { user } = useAuthStore();
  const currentLearnerId = user?.id || learnerId;
  const currentLearnerName = user?.displayName || learnerName;

  const {
    warnings,
    acknowledgeWarning,
    recordIncident,
    updateParticipantTelemetry,
    participants,
  } = useProctoringStore();

  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [micActive, setMicActive] = useState<boolean>(false);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [tabFocused, setTabFocused] = useState<boolean>(true);
  const [unacknowledgedWarning, setUnacknowledgedWarning] = useState<any | null>(null);

  // Audio Analyser ref
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Initialize MediaStream (Camera & Mic)
  useEffect(() => {
    let localStream: MediaStream | null = null;

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({
          video: { width: 320, height: 240, facingMode: 'user' },
          audio: true,
        })
        .then((s) => {
          localStream = s;
          setStream(s);
          setCameraActive(true);
          setMicActive(true);

          if (videoRef.current) {
            videoRef.current.srcObject = s;
          }

          // Setup Web Audio API RMS noise meter
          try {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            const audioCtx = new AudioContextClass();
            audioContextRef.current = audioCtx;
            const source = audioCtx.createMediaStreamSource(s);
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);
            analyserRef.current = analyser;

            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            const checkAudio = () => {
              if (analyserRef.current) {
                analyserRef.current.getByteFrequencyData(dataArray);
                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) {
                  sum += dataArray[i];
                }
                const avg = sum / dataArray.length;
                const normalized = Math.min(1.0, avg / 128);
                setAudioLevel(normalized);

                // Check for noise spike
                if (normalized > 0.45 && isExamActive) {
                  // Audio noise event
                  recordIncident({
                    attemptId: `att-${currentLearnerId}-${assessmentId}`,
                    learnerId: currentLearnerId,
                    learnerName: currentLearnerName,
                    assessmentId,
                    assessmentTitle: 'Proctored Assessment',
                    eventType: 'audio_spike',
                    severity: 'medium',
                    description: `Unusual ambient sound level detected (${Math.round(normalized * 100)}% RMS)`,
                    timestamp: new Date().toISOString(),
                    status: 'new',
                  });
                }
              }
              animationFrameRef.current = requestAnimationFrame(checkAudio);
            };
            checkAudio();
          } catch (e) {
            console.warn('Web Audio API not supported for RMS analysis:', e);
          }

          // Track ended / mute listeners
          const videoTrack = s.getVideoTracks()[0];
          if (videoTrack) {
            videoTrack.onended = () => {
              setCameraActive(false);
              recordIncident({
                attemptId: `att-${currentLearnerId}-${assessmentId}`,
                learnerId: currentLearnerId,
                learnerName: currentLearnerName,
                assessmentId,
                assessmentTitle: 'Proctored Assessment',
                eventType: 'camera_interrupted',
                severity: 'high',
                description: 'Camera video track ended or was disconnected by user device.',
                timestamp: new Date().toISOString(),
                status: 'new',
              });
            };
          }
        })
        .catch((err) => {
          console.warn('Camera/mic access was not granted:', err);
          setCameraActive(false);
          setMicActive(false);
        });
    }

    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isExamActive, currentLearnerId, assessmentId]);

  // Tab switch / Window focus monitoring
  useEffect(() => {
    if (!isExamActive) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabFocused(false);
        recordIncident({
          attemptId: `att-${currentLearnerId}-${assessmentId}`,
          learnerId: currentLearnerId,
          learnerName: currentLearnerName,
          assessmentId,
          assessmentTitle: 'Proctored Assessment',
          eventType: 'tab_switch',
          severity: 'medium',
          description: 'Learner navigated away or switched browser tabs during live exam.',
          timestamp: new Date().toISOString(),
          status: 'new',
        });
        updateParticipantTelemetry(currentLearnerId, { tabFocused: false });
      } else {
        setTabFocused(true);
        updateParticipantTelemetry(currentLearnerId, { tabFocused: true });
      }
    };

    const handleWindowBlur = () => {
      setTabFocused(false);
      updateParticipantTelemetry(currentLearnerId, { tabFocused: false });
    };

    const handleWindowFocus = () => {
      setTabFocused(true);
      updateParticipantTelemetry(currentLearnerId, { tabFocused: true });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [isExamActive, currentLearnerId, assessmentId]);

  // Sync telemetry to proctor store periodically
  useEffect(() => {
    if (!isExamActive) return;

    const interval = setInterval(() => {
      updateParticipantTelemetry(currentLearnerId, {
        cameraActive,
        micActive,
        audioLevel,
        tabFocused,
        status: 'connected',
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [isExamActive, currentLearnerId, cameraActive, micActive, audioLevel, tabFocused]);

  // Check for proctor warnings addressed to this student
  useEffect(() => {
    const studentWarnings = warnings.filter(
      (w) => w.learnerId === currentLearnerId && !w.acknowledged
    );
    if (studentWarnings.length > 0) {
      setUnacknowledgedWarning(studentWarnings[0]);
    } else {
      setUnacknowledgedWarning(null);
    }
  }, [warnings, currentLearnerId]);

  // Check if participant was force-submitted by proctor
  useEffect(() => {
    const me = participants.find((p) => p.id === currentLearnerId);
    if (me?.status === 'submitted' && onForceSubmit) {
      onForceSubmit('Proctor initiated force-submission for academic integrity review.');
    }
  }, [participants, currentLearnerId, onForceSubmit]);

  const handleAcknowledge = () => {
    if (unacknowledgedWarning) {
      acknowledgeWarning(unacknowledgedWarning.id);
      setUnacknowledgedWarning(null);
    }
  };

  return (
    <>
      {/* Floating Discreet Student Proctoring Monitor in Bottom Corner */}
      <div
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '180px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.18)',
          zIndex: 1000,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Camera stream view */}
        <div style={{ position: 'relative', width: '100%', height: '110px', background: '#0f172a' }}>
          {cameraActive ? (
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
              }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ef4444',
                fontSize: '0.75rem',
                gap: '4px',
              }}
            >
              <Camera size={20} />
              <span>Camera Inactive</span>
            </div>
          )}

          {/* Active status indicator */}
          <div
            style={{
              position: 'absolute',
              top: '6px',
              left: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              background: 'rgba(0, 0, 0, 0.7)',
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '0.65rem',
              color: '#fff',
            }}
          >
            <div
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: cameraActive ? '#22c55e' : '#ef4444',
              }}
            />
            <span>{cameraActive ? 'PROCTORED' : 'CAMERA OFF'}</span>
          </div>

          {/* Mic audio meter */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '3px',
              background: 'rgba(255, 255, 255, 0.2)',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${Math.min(100, Math.round(audioLevel * 100))}%`,
                background: audioLevel > 0.4 ? 'var(--danger)' : '#22c55e',
                transition: 'width 0.15s ease',
              }}
            />
          </div>
        </div>

        {/* Small footer information */}
        <div style={{ padding: '6px 8px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="text-muted" style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <Shield size={11} color="var(--primary)" /> Integrity Active
          </span>
          <span style={{ color: tabFocused ? 'var(--success)' : 'var(--warning)', fontWeight: 600 }}>
            {tabFocused ? 'Focused' : 'Unfocused'}
          </span>
        </div>
      </div>

      {/* Official Proctor Warning Banner Modal (Shown to student when proctor issues a warning) */}
      {unacknowledgedWarning && (
        <div
          className="modal-overlay"
          style={{
            zIndex: 2000,
            background: 'rgba(15, 23, 42, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            className="modal-card"
            style={{
              maxWidth: '500px',
              width: '90%',
              border: '2px solid var(--warning)',
              background: 'var(--bg-card)',
            }}
          >
            <div style={{ padding: '20px 24px', textAlign: 'center' }}>
              <div
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '50%',
                  background: 'rgba(245, 158, 11, 0.15)',
                  color: 'var(--warning)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 14px auto',
                }}
              >
                <AlertTriangle size={28} />
              </div>

              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 6px 0', color: 'var(--text-main)' }}>
                Official Invigilator Warning
              </h3>

              <div className="badge badge-warning text-xs" style={{ marginBottom: '14px' }}>
                Issued by {unacknowledgedWarning.sentBy}
              </div>

              <div
                style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px',
                  fontSize: '0.9rem',
                  lineHeight: 1.5,
                  color: 'var(--text-main)',
                  fontWeight: 500,
                  marginBottom: '14px',
                  textAlign: 'left',
                }}
              >
                &ldquo;{unacknowledgedWarning.message}&rdquo;
              </div>

              {unacknowledgedWarning.reason && (
                <div className="text-muted text-xs" style={{ marginBottom: '18px' }}>
                  Reason: <strong>{unacknowledgedWarning.reason}</strong>
                </div>
              )}

              <p className="text-secondary text-xs" style={{ marginBottom: '20px' }}>
                Please adhere strictly to examination guidelines. Continued integrity signals may result in invigilator intervention or examination cancellation.
              </p>

              <button
                type="button"
                className="btn btn-primary"
                style={{ width: '100%', padding: '10px' }}
                onClick={handleAcknowledge}
              >
                I Acknowledge and Will Comply
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
