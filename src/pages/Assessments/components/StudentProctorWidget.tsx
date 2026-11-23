import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../../../lib/store';
import { useProctoringStore, broadcastLiveFrame, broadcastLiveVideoChunk } from '../../../lib/proctoringStore';
import { apiClient } from '../../../lib/apiClient';
import {
  Shield, Camera, Mic, MicOff, Monitor, AlertTriangle, CheckCircle2,
  X, Volume2, Eye, Lock
} from 'lucide-react';
import { yoloMobileDetector, YOLODetectionResult } from '../../../lib/yoloDetector';
import { byteObjectTracker, TrackedObject } from '../../../lib/objectTracker';
import { aiEventEngine, ProctoringAIEvent, MobilePhoneDetectedEvent } from '../../../lib/aiEventEngine';
import { arcFaceRecognizer, ArcFaceVerificationResult } from '../../../lib/arcFaceRecognizer';
import { proctoringSuites, PROCTORING_MODEL_SUITES, ProctoringSuiteType } from '../../../lib/proctoringSuites';
import { proctoringSocket } from '../../../lib/proctoringSocket';

interface StudentProctorWidgetProps {
  assessmentId: string;
  sessionId?: string;
  mediaStream?: MediaStream | null;
  screenStream?: MediaStream | null;
  isScreenSharing?: boolean;
  candidatePhoto?: string | null;
  candidateEmbedding?: Float32Array | null;
  learnerId?: string;
  learnerName?: string;
  isExamActive: boolean;
  onForceSubmit?: (reason: string) => void;
  onStreamChange?: (newStream: MediaStream) => void;
}

export const StudentProctorWidget: React.FC<StudentProctorWidgetProps> = ({
  assessmentId,
  sessionId,
  mediaStream,
  screenStream,
  isScreenSharing = false,
  candidatePhoto,
  candidateEmbedding,
  learnerId = 'u-007',
  learnerName = 'Alex Thompson',
  isExamActive,
  onForceSubmit,
  onStreamChange,
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
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);
  const screenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const latestScreenSnapshotRef = useRef<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [micActive, setMicActive] = useState<boolean>(false);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [tabFocused, setTabFocused] = useState<boolean>(true);
  const [unacknowledgedWarning, setUnacknowledgedWarning] = useState<any | null>(null);

  // Warning Strike System state (Automated + Manual)
  const [automatedStrikes, setAutomatedStrikes] = useState<number>(0);
  const [activeStrikeModal, setActiveStrikeModal] = useState<{
    strike: number;
    totalAllowed?: number;
    remainingWarnings?: number;
    warningIntervalSeconds?: number;
    title: string;
    message: string;
    category: string;
    source?: 'automated' | 'manual';
    adminName?: string;
    timestamp?: string;
    autoSubmitted?: boolean;
  } | null>(null);
  const lastSeenEventIdRef = useRef<string | null>(null);
  const onForceSubmitRef = useRef(onForceSubmit);
  useEffect(() => {
    onForceSubmitRef.current = onForceSubmit;
  }, [onForceSubmit]);

  // Administrative exam termination state
  const [terminatedState, setTerminatedState] = useState<{
    isTerminated: boolean;
    reason: string;
    adminName: string;
  }>({
    isTerminated: false,
    reason: '',
    adminName: '',
  });

  // Face & Room Integrity analysis tracking
  const [faceStatus, setFaceStatus] = useState<'single_face' | 'no_face' | 'multiple_faces' | 'device_detected' | 'scanning' | 'camera_covered'>('scanning');
  const lastViolationTimeRef = useRef<number>(0);
  const consecutiveAbsentSecondsRef = useRef<number>(0);
  const consecutiveMultiFaceSecondsRef = useRef<number>(0);
  const consecutiveDeviceSecondsRef = useRef<number>(0);

  // YOLO Face & Mobile Phone Detection, Object Tracking & ArcFace state
  const [yoloStatus, setYoloStatus] = useState<string>('ready');
  const [trackedPhones, setTrackedPhones] = useState<TrackedObject[]>([]);
  const [trackedFaces, setTrackedFaces] = useState<TrackedObject[]>([]);
  const [faceVerificationStatus, setFaceVerificationStatus] = useState<'MATCH' | 'MISMATCH' | 'UNCERTAIN' | 'INCONCLUSIVE' | 'SCANNING'>('SCANNING');
  const [similarityScore, setSimilarityScore] = useState<number>(0);
  const [latestPhoneEvent, setLatestPhoneEvent] = useState<MobilePhoneDetectedEvent | null>(null);
  const [uncertainGuidance, setUncertainGuidance] = useState<string | null>(null);

  // AI Proctoring Model Suites (Recommended: YuNet+AdaFace+ByteTrack+MiniFASNet+MediaPipe+YOLO+ONNX / Alternative: SCRFD+ArcFace+SORT+AntiSpoof+6DRepNet+RT-DETR+OpenVINO)
  const [activeSuiteType, setActiveSuiteType] = useState<ProctoringSuiteType>(proctoringSuites.getActiveSuite());
  const [suiteTelemetry, setSuiteTelemetry] = useState<any>(null);
  const [showSuiteModal, setShowSuiteModal] = useState<boolean>(false);

  const toggleSuite = () => {
    const nextSuite: ProctoringSuiteType = activeSuiteType === 'recommended' ? 'alternative' : 'recommended';
    proctoringSuites.setActiveSuite(nextSuite);
    setActiveSuiteType(nextSuite);
  };

  // Helper to determine if a MediaStream has genuine live unmuted video
  const isVideoTrackLive = (s: MediaStream | null | undefined): boolean => {
    if (!s || !s.active) return false;
    const vts = s.getVideoTracks();
    if (vts.length === 0) return false;
    return vts.some((t) => t.readyState === 'live' && !t.muted);
  };

  // Helper to resolve currently active live stream giving local/resynced stream top priority
  const getActiveStream = (): MediaStream | null => {
    if (stream && isVideoTrackLive(stream)) return stream;
    if (activeStreamRef.current && isVideoTrackLive(activeStreamRef.current)) return activeStreamRef.current;
    if (mediaStream && isVideoTrackLive(mediaStream)) return mediaStream;
    return stream || activeStreamRef.current || mediaStream || null;
  };

  const consecutiveBlackFramesRef = useRef<number>(0);
  const hasAutoRecoveredRef = useRef<boolean>(false);

  const handleResyncCamera = async () => {
    try {
      // Stop old tracks cleanly
      if (activeStreamRef.current) {
        activeStreamRef.current.getVideoTracks().forEach((t) => t.stop());
      }
      if (stream) {
        stream.getVideoTracks().forEach((t) => t.stop());
      }
      if (mediaStream) {
        mediaStream.getVideoTracks().forEach((t) => t.stop());
      }
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, frameRate: { ideal: 30, max: 30 }, facingMode: 'user' },
          audio: true,
        });
        s.getTracks().forEach((t) => { t.enabled = true; });
        activeStreamRef.current = s;
        setStream(s);
        setCameraActive(true);
        onStreamChange?.(s);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().catch(() => {});
          };
          videoRef.current.play().catch(() => {});
        }
      }
    } catch (e) {
      console.warn('Re-sync camera notice:', e);
    }
  };

  // Lock reference biometric identity
  useEffect(() => {
    if (candidateEmbedding) {
      arcFaceRecognizer.setReferenceEmbedding(candidateEmbedding);
    } else if (candidatePhoto) {
      arcFaceRecognizer.generateEmbedding(candidatePhoto).then((emb) => {
        arcFaceRecognizer.setReferenceEmbedding(emb);
      }).catch(() => {});
    } else if (sessionId) {
      // Reconnect/refresh recovery: retrieve locked reference embedding and photo from backend
      apiClient
        .get(`/proctoring/sessions/${sessionId}/reference-embedding`)
        .then((res: any) => {
          const emb = res.data?.data?.embedding || res.data?.embedding;
          if (emb && Array.isArray(emb)) {
            arcFaceRecognizer.setReferenceEmbedding(new Float32Array(emb));
          }
        })
        .catch(() => {});

      apiClient
        .get(`/proctoring/sessions/${sessionId}/reference-photo`)
        .then((res: any) => {
          const photoUrl = res.data?.data?.photoUrl || res.data?.photoUrl;
          if (photoUrl && !arcFaceRecognizer.isLocked() && arcFaceRecognizer.isModelReady()) {
            arcFaceRecognizer.generateEmbedding(photoUrl).then((emb) => {
              arcFaceRecognizer.setReferenceEmbedding(emb);
            }).catch(() => {});
          }
        })
        .catch(() => {});
    }
  }, [candidateEmbedding, candidatePhoto, sessionId]);

  useEffect(() => {
    yoloMobileDetector.initialize().then(() => {
      setYoloStatus(yoloMobileDetector.getStatus());
    });
    arcFaceRecognizer.initialize();

    const unsubscribe = aiEventEngine.onEvent((event) => {
      if (event.eventType === 'MOBILE_PHONE_DETECTED') {
        setLatestPhoneEvent(event);
        triggerAutomatedStrike(
          'unauthorized_device',
          'Unauthorized Mobile Phone Detected',
          event.message
        );

        if (sessionId) {
          apiClient
            .post(`/proctoring/sessions/${sessionId}/mobile-incident`, {
              learnerId: currentLearnerId,
              learnerName: currentLearnerName,
              trackingId: event.trackingId,
              confidence: event.confidence,
              boundingBox: event.boundingBox,
              detectionTimestamp: event.detectionTimestamp,
              detectionCount: event.detectionCount,
              evidenceSnapshot: event.evidenceSnapshot,
            })
            .catch(() => {});
        }
      } else if (event.eventType === 'FACE_NOT_DETECTED') {
        triggerAutomatedStrike(
          'face_absent',
          'Candidate Face Absent',
          event.message
        );

        if (sessionId) {
          apiClient
            .post(`/proctoring/sessions/${sessionId}/face-incident`, {
              learnerId: currentLearnerId,
              learnerName: currentLearnerName,
              eventType: 'FACE_NOT_DETECTED',
              trackingId: event.trackingId,
              confidence: event.confidence,
              faceCount: event.faceCount,
              boundingBox: event.boundingBox,
              detectionTimestamp: event.detectionTimestamp,
              evidenceSnapshot: event.evidenceSnapshot,
              message: event.message,
            })
            .catch(() => {});
        }
      } else if (event.eventType === 'FACE_MISMATCH') {
        triggerAutomatedStrike(
          'face_mismatch',
          'Identity Mismatch Detected',
          event.message
        );

        if (sessionId) {
          apiClient
            .post(`/proctoring/sessions/${sessionId}/face-incident`, {
              learnerId: currentLearnerId,
              learnerName: currentLearnerName,
              eventType: 'FACE_MISMATCH',
              trackingId: event.trackingId,
              confidence: event.confidence,
              similarityScore: event.similarityScore,
              faceCount: event.faceCount,
              boundingBox: event.boundingBox,
              detectionTimestamp: event.detectionTimestamp,
              evidenceSnapshot: event.evidenceSnapshot,
              message: event.message,
            })
            .catch(() => {});
        }
      } else if (event.eventType === 'MULTIPLE_FACES_DETECTED') {
        triggerAutomatedStrike(
          'multiple_faces',
          'Multiple Persons Detected',
          event.message
        );

        if (sessionId) {
          apiClient
            .post(`/proctoring/sessions/${sessionId}/face-incident`, {
              learnerId: currentLearnerId,
              learnerName: currentLearnerName,
              eventType: 'MULTIPLE_FACES_DETECTED',
              trackingId: event.trackingId,
              confidence: event.confidence,
              faceCount: event.faceCount,
              isRegisteredStudentPresent: event.isRegisteredStudentPresent,
              boundingBox: event.boundingBox,
              detectionTimestamp: event.detectionTimestamp,
              evidenceSnapshot: event.evidenceSnapshot,
              message: event.message,
            })
            .catch(() => {});
        }
      } else if (event.eventType === 'FACE_UNCERTAIN') {
        // Non-punitive: Guidance advisory only, strictly 0 strikes
        setUncertainGuidance(event.message);
        if (sessionId) {
          apiClient
            .post(`/proctoring/sessions/${sessionId}/telemetry`, {
              category: 'face_uncertain',
              severity: 'informational',
              title: 'Face Position Uncertain',
              description: event.message,
              clientTimestamp: event.detectionTimestamp,
            })
            .catch(() => {});
        }
      } else if (event.eventType === 'FACE_RECOVERED' || event.eventType === 'FACE_VERIFIED') {
        setUncertainGuidance(null);
        if (sessionId) {
          apiClient
            .post(`/proctoring/sessions/${sessionId}/telemetry`, {
              category: event.eventType.toLowerCase(),
              severity: 'informational',
              title: event.eventType.replace(/_/g, ' '),
              description: event.message,
              clientTimestamp: event.detectionTimestamp,
            })
            .catch(() => {});
        }
      }
    });

    return () => {
      unsubscribe();
      byteObjectTracker.reset();
      aiEventEngine.reset();
      arcFaceRecognizer.reset();
    };
  }, [sessionId, currentLearnerId, currentLearnerName]);

  // Audio Analyser ref
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastValidSnapshotRef = useRef<string | undefined>(undefined);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeStreamRef = useRef<MediaStream | null>(null);

  // Audio Proof Recorder (Captures 3.5s incident clip when audio violation strikes)
  const rollingVideoBufferRef = useRef<Array<{ blob: Blob; timestamp: number }>>([]);

  // Upload 15-second video evidence captured right before (15s pre-roll) and during the warning strike
  const captureWarningVideoProof = (strikeNum: number, reasonTitle: string, reasonDesc: string) => {
    if (!sessionId) return;
    try {
      const now = Date.now();
      // Extract video chunks from the last 16.5 seconds (full 15-second pre-roll leading up to warning)
      const recentChunks = rollingVideoBufferRef.current
        .filter((c) => now - c.timestamp <= 16500)
        .map((c) => c.blob);

      if (recentChunks.length === 0) return;

      const videoBlob = new Blob(recentChunks, { type: 'video/webm' });
      const formData = new FormData();
      formData.append('video', videoBlob, `warning_strike_${strikeNum}.webm`);
      formData.append('strikeNumber', String(strikeNum));
      formData.append('reason', reasonTitle);
      formData.append('description', reasonDesc);
      formData.append('assessmentId', assessmentId);
      formData.append('learnerId', currentLearnerId);
      formData.append('learnerName', currentLearnerName);

      apiClient
        .post(`/proctoring/sessions/${sessionId}/warning-video`, formData)
        .catch((err) => console.warn('Could not upload warning video proof:', err));
    } catch (e) {
      console.warn('captureWarningVideoProof notice:', e);
    }
  };

  const captureAudioProof = (reason: string, transcript?: string) => {
    const active = activeStreamRef.current || mediaStream || stream;
    if (!active || !sessionId) return;
    const audioTrack = active.getAudioTracks().find((t) => t.readyState === 'live');
    if (!audioTrack) return;

    try {
      const audioOnlyStream = new MediaStream([audioTrack]);
      const mime = typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
      const recorder = mime ? new MediaRecorder(audioOnlyStream, { mimeType: mime }) : new MediaRecorder(audioOnlyStream);
      const audioChunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunks.push(e.data);
      };

      recorder.onstop = () => {
        if (audioChunks.length === 0) return;
        const blob = new Blob(audioChunks, { type: recorder.mimeType || 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          apiClient
            .post(`/proctoring/sessions/${sessionId}/audio-incident`, {
              audio: base64Audio,
              candidateName: currentLearnerName,
              transcript: transcript || reason,
              durationMs: 3500,
            })
            .catch(() => {});
        };
        reader.readAsDataURL(blob);
      };

      recorder.start();
      setTimeout(() => {
        if (recorder.state === 'recording') {
          try { recorder.stop(); } catch (e) {}
        }
      }, 3500);
    } catch (e) {}
  };

  // Audio Chime Player
  const playAlertChime = (strikeNum: number) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = strikeNum >= 2 ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(strikeNum >= 2 ? 880 : 440, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch (e) {}
  };

  // Automated Proctoring Violation Dispatcher
  // Forwards violation to backend; backend strictly validates server-side cooldown interval
  // and issues confirmed warnings/strikes back via WebSocket
  const triggerAutomatedStrike = (category: string, title: string, message: string) => {
    // If audio or speech violation, record audio proof clip immediately
    if (category.startsWith('audio_') || category.startsWith('speech_')) {
      captureAudioProof(title, message);
    }

    // Transmit detection violation to backend for server-side cooldown interval validation
    proctoringSocket.emit('PROCTORING_WARNING', {
      studentId: currentLearnerId,
      studentName: currentLearnerName,
      assessmentId,
      sessionId,
      eventType: category,
      title,
      message,
      source: 'automated',
      evidenceSnapshot: lastValidSnapshotRef.current,
      clientTimestamp: Date.now(),
    });
  };

  // Real-time proctoring socket connection for live monitoring, WebRTC, and proctor control
  useEffect(() => {
    const rawAuth = typeof localStorage !== 'undefined' ? localStorage.getItem('venilearn_auth_session') : null;
    let token = '';
    if (rawAuth) {
      try {
        token = JSON.parse(rawAuth).token || '';
      } catch {}
    }
    proctoringSocket.connect(token || 'student-token', assessmentId, 'student');

    if (isExamActive) {
      proctoringSocket.emit('STUDENT_EXAM_STARTED', {
        studentId: currentLearnerId,
        studentName: currentLearnerName,
        rollNo: (user as any)?.rollNo || `STU-${currentLearnerId.slice(-4)}`,
        assessmentId,
        sessionId,
        startedAt: new Date().toISOString(),
      });
    }

    // Listen for confirmed proctoring warnings (automated or manual) from server
    const unsubWarning = proctoringSocket.on('PROCTORING_WARNING', (data: any) => {
      if (data && (data.studentId === currentLearnerId || !data.studentId)) {
        // Prevent duplicate popups for the exact same event ID
        if (data.eventId && lastSeenEventIdRef.current === data.eventId) {
          return;
        }
        if (data.eventId) {
          lastSeenEventIdRef.current = data.eventId;
        }

        const strikeNum = Number(data.warningNumber || data.warningCount || 1);
        const totalAllowed = Number(data.totalAllowed || 3);
        const remaining = typeof data.remainingWarnings === 'number' ? data.remainingWarnings : Math.max(0, totalAllowed - strikeNum);

        setAutomatedStrikes(strikeNum);
        playAlertChime(strikeNum);

        // Upload 10-second video evidence captured right before and during THIS warning strike
        captureWarningVideoProof(strikeNum, data.title || `Warning ${strikeNum} of ${totalAllowed}`, data.reason || data.message || '');

        setActiveStrikeModal({
          strike: strikeNum,
          totalAllowed,
          remainingWarnings: remaining,
          warningIntervalSeconds: data.warningIntervalSeconds || 120,
          title: `Warning ${strikeNum} of ${totalAllowed}`,
          message: data.reason || data.message || 'Proctoring violation detected. Please adhere to examination integrity guidelines.',
          category: data.eventType || 'proctoring_warning',
          source: data.source || 'automated',
          adminName: data.issuedBy || (data.source === 'manual' ? 'Exam Proctor' : undefined),
          timestamp: data.timestamp || new Date().toISOString(),
          autoSubmitted: Boolean(data.autoSubmitted || strikeNum >= totalAllowed),
        });

        // Record in local store for audit
        recordIncident({
          attemptId: `att-${currentLearnerId}-${assessmentId}`,
          learnerId: currentLearnerId,
          learnerName: currentLearnerName,
          assessmentId,
          assessmentTitle: 'Automated Proctored Exam',
          eventType: data.eventType || 'PROCTORING_WARNING',
          severity: strikeNum >= 3 ? 'critical' : 'high',
          description: `Warning ${strikeNum} of ${totalAllowed}: ${data.reason || data.message}`,
          timestamp: data.timestamp || new Date().toISOString(),
          status: 'new',
        });

        // If 3rd strike reached: Execute automatic exam submission
        if (data.autoSubmitted || strikeNum >= totalAllowed) {
          setTimeout(() => {
            onForceSubmitRef.current?.('PROCTORING_THIRD_WARNING');
          }, 3500);
        }
      }
    });

    // Listen for manual proctor warnings issued by the administrator
    const unsubManual = proctoringSocket.on('MANUAL_WARNING', (data: any) => {
      if (data && (data.studentId === currentLearnerId || !data.studentId)) {
        // Handled through unified PROCTORING_WARNING handler with exact strike counts
      }
    });

    const unsubAutoSubmit = proctoringSocket.on('EXAM_AUTO_SUBMITTED', (data: any) => {
      if (data && (data.studentId === currentLearnerId || !data.studentId)) {
        setTerminatedState({
          isTerminated: true,
          reason: 'Your examination was automatically submitted due to reaching the maximum 3 proctoring warnings (Three-Strike Policy).',
          adminName: 'Automated Proctor Policy Engine',
        });
        setTimeout(() => {
          onForceSubmitRef.current?.('PROCTORING_THIRD_WARNING');
        }, 3000);
      }
    });

    // Listen for admin force-stop examination
    const unsubTerminated = proctoringSocket.on('EXAM_TERMINATED', (data: any) => {
      if (data && (data.studentId === currentLearnerId || !data.studentId)) {
        setTerminatedState({
          isTerminated: true,
          reason: data.reason || 'Your examination was concluded by the examination administrator.',
          adminName: data.adminName || 'Exam Proctor',
        });
        setTimeout(() => {
          onForceSubmitRef.current?.(data.reason || 'Exam terminated by administrator.');
        }, 1500);
      }
    });

    // Listen for admin stream request
    const unsubAdminRequest = proctoringSocket.on('ADMIN_REQUEST_STREAM', () => {
      if (assessmentId && currentLearnerId) {
        proctoringSocket.initiatePeerOfferToAdmin(assessmentId, currentLearnerId);
      }
    });

    return () => {
      unsubWarning();
      unsubManual();
      unsubAutoSubmit();
      unsubTerminated();
      unsubAdminRequest();
    };
  }, [assessmentId, currentLearnerId, isExamActive, sessionId]);

  // Initialize MediaStream (Camera & Mic) - reuse passed mediaStream if present
  useEffect(() => {
    let localStream: MediaStream | null = null;

    const setupStream = (s: MediaStream, isOwnedLocally: boolean) => {
      if (isOwnedLocally) {
        localStream = s;
      }
      activeStreamRef.current = s;
      setStream(s);
      s.getTracks().forEach((t) => { t.enabled = true; });
      const hasLiveVideo = s.getVideoTracks().some((t) => t.readyState === 'live');
      const hasLiveAudio = s.getAudioTracks().some((t) => t.readyState === 'live');
      setCameraActive(hasLiveVideo);
      setMicActive(hasLiveAudio);

      if (videoRef.current) {
        videoRef.current.srcObject = s;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(() => {});
        };
        videoRef.current.play().catch(() => {});
      }

      // Register local media stream with WebRTC Hub to stream directly to Admin Video Wall
      proctoringSocket.registerLocalMediaStream(s, {
        studentId: currentLearnerId,
        studentName: currentLearnerName,
        assessmentId,
        sessionId,
      });

      s.getVideoTracks().forEach((track) => {
        track.onended = () => {
          proctoringSocket.emit('STUDENT_VIDEO_DISCONNECTED', {
            studentId: currentLearnerId,
            assessmentId,
            sessionId,
            reason: 'Camera track ended',
            timestamp: new Date().toISOString(),
          });
        };
        track.onmute = () => {
          proctoringSocket.emit('STUDENT_VIDEO_DISCONNECTED', {
            studentId: currentLearnerId,
            assessmentId,
            sessionId,
            reason: 'Camera muted',
            timestamp: new Date().toISOString(),
          });
        };
        track.onunmute = () => {
          proctoringSocket.emit('STUDENT_VIDEO_RECONNECTED', {
            studentId: currentLearnerId,
            assessmentId,
            sessionId,
            timestamp: new Date().toISOString(),
          });
        };
      });

      // Setup Web Audio API RMS & Frequency VAD Voice Formant Analyzer
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioContextClass();
        audioContextRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(s);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.2;
        source.connect(analyser);
        analyserRef.current = analyser;

        const hasFloat = typeof analyser.getFloatTimeDomainData === 'function';
        const floatData = hasFloat ? new Float32Array(analyser.fftSize) : null;
        const byteData = !hasFloat ? new Uint8Array(analyser.fftSize) : null;
        const freqData = new Uint8Array(analyser.frequencyBinCount);

        const baselineStored = typeof window !== 'undefined' ? sessionStorage.getItem('veniguard_audio_baseline') : null;
        const ambientNoiseFloor = baselineStored ? Math.max(0.05, parseInt(baselineStored, 10) / 100) : 0.12;

        let smoothedLevel = 0;
        let lastUpdate = 0;
        let consecutiveVoiceMs = 0;
        let lastAudioCheckTime = 0;

        const checkAudio = (timestamp: number) => {
          if (analyserRef.current) {
            let elapsedDelta = 0;
            if (lastAudioCheckTime > 0) {
              elapsedDelta = Math.min(250, timestamp - lastAudioCheckTime);
            }
            lastAudioCheckTime = timestamp;

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

            let target = 0;
            if (rms > 0.008) {
              const db = 20 * Math.log10(rms);
              const minDb = -45;
              const maxDb = -13;
              const ratio = (db - minDb) / (maxDb - minDb);
              target = Math.max(0, Math.min(1.0, ratio));
            }

            if (target > smoothedLevel) {
              smoothedLevel = smoothedLevel * 0.3 + target * 0.7;
            } else {
              smoothedLevel = smoothedLevel * 0.85 + target * 0.15;
              if (smoothedLevel < 0.01) smoothedLevel = 0;
            }

            // Frequency Domain Voice Activity Detection (VAD)
            analyserRef.current.getByteFrequencyData(freqData);

            // Bins 0-2 (< 280 Hz): low-frequency mechanical rumble (AC, fan, engine)
            // Bins 3-34 (280 Hz - 3200 Hz): human vocal fundamental frequencies & speech formants
            let lowEnergy = 0;
            for (let i = 0; i <= 2; i++) lowEnergy += freqData[i];

            let vocalEnergy = 0;
            for (let i = 3; i <= 34; i++) vocalEnergy += freqData[i];

            let totalEnergy = 0;
            for (let i = 0; i < freqData.length; i++) totalEnergy += freqData[i];

            const vocalRatio = vocalEnergy / (totalEnergy + 0.001);
            const lowRatio = lowEnergy / (totalEnergy + 0.001);

            // Sensitive vocal speech & dictation detection:
            // 1. Detects conversational speech, answers spoken from nearby, or questions read aloud
            // 2. Level exceeds room ambient baseline (+0.04) and at least 0.12 RMS
            // 3. Vocal energy in human speech band > 180
            // 4. Vocal energy ratio > 0.30 (human voice formants)
            const isVoiceSignal = (
              smoothedLevel > Math.max(0.12, ambientNoiseFloor + 0.04) &&
              vocalEnergy > 180 &&
              lowRatio < 0.70 &&
              vocalRatio > 0.30
            );

            if (isVoiceSignal && isExamActive) {
              consecutiveVoiceMs += elapsedDelta;
              // If someone speaks answers or questions for >= 1.6 seconds, trigger warning!
              if (consecutiveVoiceMs >= 1600) {
                consecutiveVoiceMs = 0;
                triggerAutomatedStrike(
                  'audio_voice_detected',
                  'Voice / Speech Detected in Room',
                  'Spoken voice or answer dictation was detected in your room (> 1.5s). Speaking or receiving spoken answers is strictly prohibited.'
                );
              }
            } else {
              // Gradual decay (35ms per step) allows natural pauses between spoken words without wiping detection
              consecutiveVoiceMs = Math.max(0, consecutiveVoiceMs - 35);
            }

            if (timestamp - lastUpdate > 120) {
              setAudioLevel(smoothedLevel);
              lastUpdate = timestamp;

              // Non-vocal ambient noise spike (e.g. loud door slam or passing vehicle) - logged passively, NO strike
              if (smoothedLevel > 0.80 && isExamActive && !isVoiceSignal) {
                recordIncident({
                  attemptId: `att-${currentLearnerId}-${assessmentId}`,
                  learnerId: currentLearnerId,
                  learnerName: currentLearnerName,
                  assessmentId,
                  assessmentTitle: 'Proctored Assessment',
                  eventType: 'ambient_noise_spike',
                  severity: 'low',
                  description: `Transient ambient room sound detected (${Math.round(smoothedLevel * 100)}% RMS) - Filtered as non-vocal background noise.`,
                  timestamp: new Date().toISOString(),
                  status: 'new',
                });
              }
            }
          }
          animationFrameRef.current = requestAnimationFrame(checkAudio);
        };
        animationFrameRef.current = requestAnimationFrame(checkAudio);
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
    };

    const hasLiveVideoTrack = mediaStream && isVideoTrackLive(mediaStream);
    if (mediaStream && hasLiveVideoTrack) {
      setupStream(mediaStream, false);
    } else if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({
          video: { width: 640, height: 480, frameRate: { ideal: 30, max: 30 }, facingMode: 'user' },
          audio: true,
        })
        .then((s) => {
          setupStream(s, true);
          onStreamChange?.(s);
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
  }, [mediaStream, isExamActive, currentLearnerId, assessmentId]);

  // Ensure video element srcObject is bound whenever stream or camera status changes
  useEffect(() => {
    const active = getActiveStream();
    if (videoRef.current && active) {
      active.getVideoTracks().forEach((t) => { t.enabled = true; });
      if (videoRef.current.srcObject !== active) {
        videoRef.current.srcObject = active;
      }
      videoRef.current.onloadedmetadata = () => {
        videoRef.current?.play().catch(() => {});
      };
      videoRef.current.play().catch(() => {});
    }
  }, [mediaStream, stream, cameraActive]);

  // Screen stream initialization and lifecycle listener
  useEffect(() => {
    if (!screenStream) return;
    if (!screenVideoRef.current && typeof document !== 'undefined') {
      const v = document.createElement('video');
      v.autoplay = true;
      v.playsInline = true;
      v.muted = true;
      screenVideoRef.current = v;
    }
    const sv = screenVideoRef.current;
    if (sv) {
      sv.srcObject = screenStream;
      sv.play().catch(() => {});
    }

    screenStream.getVideoTracks().forEach((track) => {
      track.onended = () => {
        proctoringSocket.emit('STUDENT_SCREEN_STATUS', {
          studentId: currentLearnerId,
          assessmentId,
          sessionId,
          active: false,
          reason: 'Screen track ended',
          timestamp: new Date().toISOString(),
        });
      };
    });

    proctoringSocket.emit('STUDENT_SCREEN_STATUS', {
      studentId: currentLearnerId,
      assessmentId,
      sessionId,
      active: true,
      timestamp: new Date().toISOString(),
    });
  }, [screenStream, currentLearnerId, assessmentId, sessionId]);

  // Tab switch / Window focus monitoring with Automated 3-Warning Rule
  useEffect(() => {
    if (!isExamActive) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabFocused(false);
        updateParticipantTelemetry(currentLearnerId, { tabFocused: false });
        triggerAutomatedStrike(
          'tab_switch',
          'Tab Switch Detected',
          'You navigated away from the exam window or switched browser tabs. Navigating outside is strictly prohibited.'
        );
      } else {
        setTabFocused(true);
        updateParticipantTelemetry(currentLearnerId, { tabFocused: true });
      }
    };

    const handleWindowBlur = () => {
      setTabFocused(false);
      updateParticipantTelemetry(currentLearnerId, { tabFocused: false });
      triggerAutomatedStrike(
        'tab_switch',
        'Window Focus Lost (Alt+Tab / App Switch)',
        'You navigated away from the exam window or switched browser tabs using Alt+Tab. Navigating outside the examination is strictly prohibited.'
      );
    };

    const handleWindowFocus = () => {
      setTabFocused(true);
      updateParticipantTelemetry(currentLearnerId, { tabFocused: true });
    };

    const handleWidgetKeyDown = (e: KeyboardEvent) => {
      const isAltTab = e.altKey && (e.key === 'Tab' || e.code === 'Tab' || e.keyCode === 9);
      const isCtrlTab = e.ctrlKey && (e.key === 'Tab' || e.code === 'Tab' || e.keyCode === 9);
      const isWinKey = e.key === 'Meta' || e.metaKey || e.code === 'MetaLeft' || e.code === 'MetaRight';
      const isAltEsc = e.altKey && (e.key === 'Escape' || e.code === 'Escape');

      if (isAltTab || isCtrlTab || isWinKey || isAltEsc) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        setTabFocused(false);
        updateParticipantTelemetry(currentLearnerId, { tabFocused: false });
        triggerAutomatedStrike(
          'tab_switch',
          'Alt+Tab / Tab Switch Intercepted',
          'Alt+Tab and tab switching are strictly disabled during this examination.'
        );
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('keydown', handleWidgetKeyDown, { capture: true, passive: false });

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('keydown', handleWidgetKeyDown, { capture: true } as any);
    };
  }, [isExamActive, currentLearnerId, assessmentId, automatedStrikes]);

  // Real-Time Browser-Native Speech Recognition (Captures human words/phrases)
  useEffect(() => {
    if (!isExamActive) return;
    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionClass) return;

    let recognition: any = null;
    let isStoppedExplicitly = false;

    try {
      recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = (typeof navigator !== 'undefined' && navigator.language) ? navigator.language : 'en-US';

      recognition.onresult = (event: any) => {
        if (!event.results || event.results.length === 0) return;
        const lastResult = event.results[event.results.length - 1];
        if (lastResult.isFinal && lastResult[0]?.transcript) {
          const spokenText = lastResult[0].transcript.trim();
          const words = spokenText.split(/\s+/).filter(Boolean);

          // Catch any spoken answer dictation or question reading (>= 2 words or phrase >= 5 chars)
          const isSpokenAnswerOrDialogue = words.length >= 2 || spokenText.length >= 5;

          if (isSpokenAnswerOrDialogue) {
            triggerAutomatedStrike(
              'speech_detected',
              'Verbal Communication / Answer Dictation Detected',
              `Speech was detected in the exam session: "${spokenText.slice(0, 60)}". Speaking questions or receiving spoken answers is strictly prohibited.`
            );
          }
        }
      };

      recognition.onerror = () => {};
      recognition.onend = () => {
        if (!isStoppedExplicitly && isExamActive) {
          try {
            recognition.start();
          } catch (e) {}
        }
      };

      recognition.start();
    } catch (e) {
      console.warn('SpeechRecognition initialization notice:', e);
    }

    return () => {
      isStoppedExplicitly = true;
      if (recognition) {
        try {
          recognition.stop();
        } catch (e) {}
      }
    };
  }, [isExamActive, currentLearnerId, assessmentId, sessionId]);

  // Real-Time Video Computer Vision: Multi-Person, Device & Absence Detection (YOLO + ByteTrack + ArcFace)
  useEffect(() => {
    if (!isExamActive) return;

    const faceCheckTimer = setInterval(async () => {
      const v = videoRef.current;
      if (!v) return;
      if (v.paused && (mediaStream || stream || activeStreamRef.current)) {
        v.play().catch(() => {});
      }
      if (v.videoWidth === 0 || v.videoHeight === 0) return;

      try {
        // Step 1: YOLO Multi-Class Object Detection (Faces & Phones) & ByteTrack
        let yoloDetections: YOLODetectionResult[] = [];
        try {
          yoloDetections = await yoloMobileDetector.detect(v);
        } catch (e) {}

        const activeTracks = byteObjectTracker.update(yoloDetections, Date.now());
        const phoneTracks = activeTracks.filter((t) => t.classId === 67 || t.className === 'cell phone');
        const faceTracks = activeTracks.filter((t) => t.classId === 0 || t.className === 'face');

        setTrackedPhones(phoneTracks);
        setTrackedFaces(faceTracks);

        // Step 2: ArcFace Identity Verification on Detected Face Tracks
        const faceVerificationMap = new Map<string, ArcFaceVerificationResult>();
        for (const ft of faceTracks) {
          try {
            const quality = arcFaceRecognizer.assessFaceQuality(v, ft.box);
            const candidateEmb = await arcFaceRecognizer.generateEmbedding(v, ft.box);
            const ver = arcFaceRecognizer.verifyAgainstReference(candidateEmb, quality);
            faceVerificationMap.set(ft.trackingId, ver);

            if (ft === faceTracks[0]) {
              setSimilarityScore(ver.similarity);
              setFaceVerificationStatus(ver.status);
            }
          } catch (e) {}
        }

        // Step 3: Run AI Event Engine (Absence, Multiple Faces, ArcFace Identity)
        aiEventEngine.processTracks(
          activeTracks,
          {
            sessionId: sessionId || `local-sess-${assessmentId}`,
            learnerId: currentLearnerId,
            learnerName: currentLearnerName,
            trackFaceAbsence: true,
          } as any,
          v,
          Date.now(),
          faceVerificationMap
        );

        // Periodically sync frame features with the active AI Model Suite (Recommended vs Alternative)
        if (v.videoWidth > 0 && Math.random() < 0.25) {
          proctoringSuites.analyzeActiveFrame({
            sessionId: sessionId || `local-sess-${assessmentId}`,
            frameIndex: Date.now(),
            timestamp: Date.now(),
            imageWidth: v.videoWidth,
            imageHeight: v.videoHeight,
            detectedFaces: faceTracks.map((ft) => ({ box: ft.box, confidence: ft.confidence })),
            detectedObjects: phoneTracks.map((pt) => ({ box: pt.box, confidence: pt.confidence, classId: 67, className: 'cell phone' })),
          }).then((res) => {
            if (res?.telemetry) {
              setSuiteTelemetry(res.telemetry);
            }
          }).catch(() => {});
        }

        const confirmedFaces = byteObjectTracker.getConfirmedFaceTracks();
        const effectiveFaceCount = faceTracks.length;
        const confirmedPhone = phoneTracks.find((t) => t.state === 'confirmed' && (t.isTemporallyConfirmed || t.hits >= 8));
        const isDeviceVisible = Boolean(confirmedPhone);

        // Check for pitch-black frames (covered lens, closed hardware shutter, or completely dark room)
        let isPitchBlack = false;
        try {
          const offscreen = offscreenCanvasRef.current;
          if (offscreen && v.videoWidth > 0 && v.videoHeight > 0) {
            const ctx = offscreen.getContext('2d');
            if (ctx) {
              offscreen.width = 16;
              offscreen.height = 16;
              ctx.drawImage(v, 0, 0, 16, 16);
              const px = ctx.getImageData(0, 0, 16, 16).data;
              let sum = 0;
              for (let i = 0; i < px.length; i += 4) {
                sum += 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
              }
              const avg = sum / 64;
              if (avg < 8) {
                isPitchBlack = true;
              }
            }
          }
        } catch (e) {}

        // --- STEP 4: Prioritized Alert State Machine ---

        // Priority 0: Camera Lens Blocked / Pitch Black (Physical shutter closed or zero light)
        if (isPitchBlack) {
          consecutiveBlackFramesRef.current += 1;
          // Auto-recovery: If camera produces pitch-black frames continuously on startup (> 2.4s), automatically re-sync once
          if (consecutiveBlackFramesRef.current >= 3 && !hasAutoRecoveredRef.current) {
            hasAutoRecoveredRef.current = true;
            console.warn('Pitch black camera detected on exam startup. Triggering automatic camera re-sync...');
            handleResyncCamera();
          }
          consecutiveDeviceSecondsRef.current = 0;
          consecutiveMultiFaceSecondsRef.current = 0;
          consecutiveAbsentSecondsRef.current = 0; // Do NOT issue false absence strike
          setFaceStatus('camera_covered');
        }
        // Priority 1: Candidate Absence (Student is away from camera / empty chair > 5 seconds)
        // If effectiveFaceCount === 0 (candidate absent), NEVER trigger mobile phone warning!
        else if (effectiveFaceCount === 0) {
          consecutiveBlackFramesRef.current = 0;
          consecutiveDeviceSecondsRef.current = 0;
          consecutiveMultiFaceSecondsRef.current = 0;
          consecutiveAbsentSecondsRef.current += 0.8;

          setFaceStatus('no_face');

          // Exactly 5.0 seconds of absence triggers warning strike!
          if (consecutiveAbsentSecondsRef.current >= 5.0) {
            consecutiveAbsentSecondsRef.current = 0; // Reset counter for next 5s interval
            triggerAutomatedStrike(
              'face_absent',
              'Candidate Face Absent (> 5s)',
              'Your face was not detected in the camera frame for > 5 seconds. You must remain seated in front of the camera.'
            );
          }
        }
        // Priority 2: Unauthorized Mobile Phone (Strictly after temporal confirmation 8/12 frames)
        else if (isDeviceVisible) {
          consecutiveBlackFramesRef.current = 0;
          consecutiveAbsentSecondsRef.current = 0;
          consecutiveMultiFaceSecondsRef.current = 0;
          setFaceStatus('device_detected');
          // Note: Automatic strike is triggered exclusively via AIEventEngine verified event listener
          // preventing premature strikes for unconfirmed, transient, or non-phone objects.
        }
        // Priority 3: Multiple Persons (Candidate IS present and another person is confirmed)
        else if (confirmedFaces.length > 1) {
          consecutiveBlackFramesRef.current = 0;
          consecutiveAbsentSecondsRef.current = 0;
          consecutiveDeviceSecondsRef.current = 0;
          setFaceStatus('multiple_faces');
          // Note: Automatic warning strikes are triggered exclusively via AIEventEngine
          // after rigorous 8/12 temporal validation, preventing false-positive strikes.
        }
        // Priority 4: Candidate Seated & Normal (Single Face)
        else {
          consecutiveBlackFramesRef.current = 0;
          setFaceStatus('single_face');
          consecutiveAbsentSecondsRef.current = 0;
          consecutiveDeviceSecondsRef.current = 0;
          consecutiveMultiFaceSecondsRef.current = 0;
        }
      } catch (err) {}
    }, 800);

    return () => clearInterval(faceCheckTimer);
  }, [isExamActive, sessionId, currentLearnerId, assessmentId]);

  // 30 FPS Hardware Compressed Video Recording & Low-Latency Streaming Loop (WebM / VP8)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  useEffect(() => {
    const activeStream = getActiveStream();
    if (!isExamActive || !activeStream || activeStream.getVideoTracks().length === 0) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch (e) {}
      }
      return;
    }

    try {
      const isWebmSupported = typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus');
      const isPlainWebm = typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('video/webm');
      const isMp4Supported = typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('video/mp4');

      const mimeType = isWebmSupported
        ? 'video/webm;codecs=vp8,opus'
        : isPlainWebm
        ? 'video/webm'
        : isMp4Supported
        ? 'video/mp4'
        : '';

      const recorderOptions: MediaRecorderOptions = {
        videoBitsPerSecond: 400_000, // 400 kbps compressed 30 FPS stream
      };
      if (mimeType) {
        recorderOptions.mimeType = mimeType;
      }

      const recorder = new MediaRecorder(activeStream, recorderOptions);

      recorder.ondataavailable = async (e) => {
        if (e.data && e.data.size > 0) {
          const videoBlob = e.data;
          const blobUrl = URL.createObjectURL(videoBlob);

          // Maintain rolling buffer of video chunks covering the last 18 seconds (minimum 15s pre-roll before warning)
          rollingVideoBufferRef.current.push({ blob: videoBlob, timestamp: Date.now() });
          const cutoff = Date.now() - 18000;
          rollingVideoBufferRef.current = rollingVideoBufferRef.current.filter((c) => c.timestamp >= cutoff);

          // 1. Instant zero-latency local broadcast (< 10ms memory transfer)
          broadcastLiveVideoChunk(currentLearnerId, assessmentId, blobUrl, audioLevel);
          updateParticipantTelemetry(currentLearnerId, {
            latestVideoUrl: blobUrl,
            cameraActive: true,
            status: 'connected',
          });

          // 2. Transmit compressed video chunk to backend storage for 7-day retention proof
          if (sessionId) {
            const formData = new FormData();
            formData.append('video', videoBlob, `chunk_${Date.now()}.webm`);
            formData.append('assessmentId', assessmentId);
            formData.append('learnerId', currentLearnerId);
            formData.append('learnerName', currentLearnerName);
            formData.append('audioLevel', String(audioLevel));

            apiClient
              .post(`/proctoring/sessions/${sessionId}/video-chunk`, formData)
              .catch(() => {});
          }
        }
      };

      recorder.start(1500); // 1.5-second continuous rolling segments
      mediaRecorderRef.current = recorder;
    } catch (err) {
      console.warn('MediaRecorder not available or failed to start:', err);
    }

    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch (e) {}
      }
    };
  }, [mediaStream, stream, isExamActive, sessionId, currentLearnerId, currentLearnerName, assessmentId, audioLevel]);

  // High-frequency live video streaming loop (8 FPS for fluid real-time camera)
  useEffect(() => {
    if (!isExamActive) return;

    if (!offscreenCanvasRef.current && typeof document !== 'undefined') {
      const c = document.createElement('canvas');
      c.width = 320;
      c.height = 240;
      offscreenCanvasRef.current = c;
    }

    let lastNetworkPost = 0;

    const captureFrame = () => {
      const v = videoRef.current;
      const canvas = offscreenCanvasRef.current;
      if (v && canvas && v.videoWidth > 0 && v.videoHeight > 0) {
        try {
          const ctx = canvas.getContext('2d', { alpha: false });
          if (ctx) {
            ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
            const frame = canvas.toDataURL('image/jpeg', 0.55);
            lastValidSnapshotRef.current = frame;

            // 1. Ultra-fast local broadcast (8-10 FPS, instantaneous memory transfer)
            broadcastLiveFrame(currentLearnerId, assessmentId, frame, audioLevel);

            // 2. Real-time WebSocket live camera frame broadcast (continuous, sub-second latency)
            proctoringSocket.emit('STUDENT_VIDEO_FRAME', {
              studentId: currentLearnerId,
              assessmentId,
              sessionId,
              frame,
              audioLevel,
              timestamp: new Date().toISOString(),
            });

            // 3. Real-time screen sharing frame capture & broadcast
            const sv = screenVideoRef.current;
            if (sv && sv.videoWidth > 0 && sv.videoHeight > 0) {
              if (!screenCanvasRef.current && typeof document !== 'undefined') {
                const sc = document.createElement('canvas');
                sc.width = 640;
                sc.height = 360;
                screenCanvasRef.current = sc;
              }
              const sCanvas = screenCanvasRef.current;
              if (sCanvas) {
                const sCtx = sCanvas.getContext('2d', { alpha: false });
                if (sCtx) {
                  sCtx.drawImage(sv, 0, 0, sCanvas.width, sCanvas.height);
                  const screenFrame = sCanvas.toDataURL('image/jpeg', 0.5);
                  latestScreenSnapshotRef.current = screenFrame;
                  proctoringSocket.emit('STUDENT_SCREEN_FRAME', {
                    studentId: currentLearnerId,
                    assessmentId,
                    sessionId,
                    screenFrame,
                    timestamp: new Date().toISOString(),
                  });
                }
              }
            }

            // 2. High-speed network live frame transmission (approx 2.5 FPS for cross-machine)
            const now = Date.now();
            if (sessionId && now - lastNetworkPost > 350) {
              lastNetworkPost = now;
              apiClient
                .post(`/proctoring/sessions/${sessionId}/live-frame`, {
                  assessmentId,
                  learnerId: currentLearnerId,
                  learnerName: currentLearnerName,
                  frame,
                  audioLevel,
                })
                .catch(() => {});
            }
          }
        } catch (e) {}
      }
    };

    const streamTimer = setInterval(captureFrame, 125);
    return () => clearInterval(streamTimer);
  }, [isExamActive, currentLearnerId, currentLearnerName, assessmentId, sessionId, audioLevel]);

  // Sync telemetry to proctor store periodically (presence & audit log checkpoints)
  useEffect(() => {
    if (!isExamActive) return;

    const syncHeartbeat = () => {
      let dataUrl: string | undefined = undefined;
      const v = videoRef.current;
      if (v) {
        if (v.paused && getActiveStream()) {
          v.play().catch(() => {});
        }
        if (v.videoWidth > 0 && v.videoHeight > 0) {
          try {
            const canvas = offscreenCanvasRef.current || document.createElement('canvas');
            canvas.width = 320;
            canvas.height = 240;
            const ctx = canvas.getContext('2d', { alpha: false });
            if (ctx) {
              ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
              dataUrl = canvas.toDataURL('image/jpeg', 0.6);
              lastValidSnapshotRef.current = dataUrl;
            }
          } catch (e) {}
        }
      }

      const effectiveSnapshot = dataUrl || lastValidSnapshotRef.current;
      const currentActiveStream = getActiveStream();

      const hasLiveScreen = Boolean(isScreenSharing && (screenStream?.getVideoTracks()?.some((t) => t.readyState === 'live') ?? false));

      updateParticipantTelemetry(currentLearnerId, {
        assessmentId,
        name: currentLearnerName,
        rollNo: user?.rollNo || `STU-${currentLearnerId.slice(-4)}`,
        cameraActive: cameraActive || Boolean(currentActiveStream?.getVideoTracks()?.some((t) => t.enabled)),
        micActive: micActive || Boolean(currentActiveStream?.getAudioTracks()?.some((t) => t.enabled)),
        audioLevel,
        tabFocused,
        screenShareActive: hasLiveScreen,
        status: 'connected',
        ...(latestScreenSnapshotRef.current ? { latestScreenSnapshot: latestScreenSnapshotRef.current } : {}),
        ...(effectiveSnapshot ? { latestSnapshot: effectiveSnapshot } : {}),
      });

      // Transmit to backend live telemetry API if session is active
      const snapshotToSend = dataUrl || lastValidSnapshotRef.current;
      if (sessionId && snapshotToSend) {
        apiClient
          .post(`/proctoring/sessions/${sessionId}/telemetry`, {
            category: 'camera_monitoring',
            severity: 'info',
            title: 'Live Camera Telemetry Feed',
            description: `Continuous webcam frame captured at ${new Date().toLocaleTimeString()}`,
            clientTimestamp: Date.now(),
            evidenceSnapshot: snapshotToSend,
          })
          .catch(() => {});
      }
    };

    syncHeartbeat();
    const interval = setInterval(syncHeartbeat, 3000);
    return () => clearInterval(interval);
  }, [
    isExamActive,
    currentLearnerId,
    currentLearnerName,
    assessmentId,
    sessionId,
    cameraActive,
    micActive,
    audioLevel,
    tabFocused,
    stream,
    mediaStream,
  ]);

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
          border: faceStatus === 'multiple_faces' || faceStatus === 'device_detected'
            ? '2px solid #ef4444'
            : faceStatus === 'no_face'
            ? '2px solid #f59e0b'
            : '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          boxShadow: faceStatus === 'multiple_faces' || faceStatus === 'device_detected'
            ? '0 0 16px rgba(239, 68, 68, 0.55)'
            : '0 8px 24px rgba(0, 0, 0, 0.18)',
          zIndex: 1000,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          transition: 'border 0.2s, box-shadow 0.2s',
        }}
      >
        {/* Camera stream view */}
        <div style={{ position: 'relative', width: '100%', height: '110px', background: '#0f172a' }}>
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
              display: cameraActive ? 'block' : 'none',
            }}
          />
          {!cameraActive && (
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

          {faceStatus === 'camera_covered' && cameraActive && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(15, 23, 42, 0.88)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '6px 8px',
                textAlign: 'center',
                zIndex: 10,
              }}
            >
              <AlertTriangle size={18} color="#f59e0b" style={{ marginBottom: '2px' }} />
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#f59e0b', marginBottom: '2px' }}>
                Camera Blocked / Dark
              </div>
              <div style={{ fontSize: '0.58rem', color: '#94a3b8', lineHeight: '1.2', marginBottom: '4px' }}>
                1. Open laptop camera shutter/slider<br />
                2. Close Google Meet tab if open
              </div>
              <button
                type="button"
                onClick={handleResyncCamera}
                style={{
                  background: '#10b981',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '3px',
                  padding: '2px 8px',
                  fontSize: '0.62rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Restart Camera
              </button>
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
              background: faceStatus === 'multiple_faces' || faceStatus === 'device_detected'
                ? 'rgba(239, 68, 68, 0.92)'
                : faceStatus === 'no_face' || faceStatus === 'camera_covered'
                ? 'rgba(245, 158, 11, 0.92)'
                : 'rgba(0, 0, 0, 0.7)',
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '0.65rem',
              color: '#fff',
              fontWeight: 600,
            }}
          >
            <div
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: !cameraActive
                  ? '#ef4444'
                  : faceStatus === 'multiple_faces' || faceStatus === 'device_detected'
                  ? '#ffffff'
                  : faceStatus === 'no_face' || faceStatus === 'camera_covered'
                  ? '#fef08a'
                  : '#22c55e',
              }}
            />
            <span>
              {!cameraActive
                ? 'CAMERA OFF'
                : faceStatus === 'camera_covered'
                ? '⚠️ SHUTTER / DARK'
                : faceStatus === 'multiple_faces'
                ? '⚠️ 2 PERSONS'
                : faceStatus === 'device_detected'
                ? '⚠️ DEVICE'
                : faceStatus === 'no_face'
                ? '⚠️ NO FACE'
                : 'PROCTORED'}
            </span>
          </div>

          {/* YOLO Face & Object Detection Visual Overlay */}
          {(trackedPhones.length > 0 || trackedFaces.length > 0) && (
            <svg
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
              }}
            >
              {/* Face tracks */}
              {trackedFaces.map((track, idx) => {
                const mirroredX = (1 - (track.normalizedBox.x + track.normalizedBox.width)) * 100;
                const topY = track.normalizedBox.y * 100;
                const widthPct = track.normalizedBox.width * 100;
                const heightPct = track.normalizedBox.height * 100;

                const isMainFace = idx === 0;
                const isVerified = isMainFace && (faceVerificationStatus === 'MATCH' || similarityScore >= 0.65);
                const isMismatch = isMainFace && faceVerificationStatus === 'MISMATCH';
                const isExtra = !isMainFace;
                const isExtraConfirmed = isExtra && (track.isTemporallyConfirmed || track.hits >= 8);

                const strokeColor = isExtraConfirmed || isMismatch ? '#EF4444' : (isVerified ? '#10B981' : '#F59E0B');
                const labelText = isExtraConfirmed
                  ? `EXTRA [${track.trackingId}]`
                  : isExtra
                  ? `ANALYZING...`
                  : isMismatch
                  ? `MISMATCH ${Math.round(similarityScore * 100)}%`
                  : isVerified
                  ? `${currentLearnerName.split(' ')[0]} ${Math.round(similarityScore * 100)}%`
                  : `FACE [${track.trackingId}]`;

                return (
                  <g key={track.trackingId}>
                    <rect
                      x={`${mirroredX}%`}
                      y={`${topY}%`}
                      width={`${widthPct}%`}
                      height={`${heightPct}%`}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth="2"
                    />
                    <rect
                      x={`${mirroredX}%`}
                      y={`${Math.max(0, topY - 11)}%`}
                      width="76px"
                      height="12px"
                      fill={strokeColor}
                      rx="2"
                    />
                    <text
                      x={`${mirroredX + 1}%`}
                      y={`${Math.max(8, topY - 2)}%`}
                      fill="#FFFFFF"
                      fontSize="8px"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      {labelText}
                    </text>
                  </g>
                );
              })}

              {/* Phone tracks */}
              {trackedPhones.map((track) => {
                const mirroredX = (1 - (track.normalizedBox.x + track.normalizedBox.width)) * 100;
                const topY = track.normalizedBox.y * 100;
                const widthPct = track.normalizedBox.width * 100;
                const heightPct = track.normalizedBox.height * 100;

                return (
                  <g key={track.trackingId}>
                    <rect
                      x={`${mirroredX}%`}
                      y={`${topY}%`}
                      width={`${widthPct}%`}
                      height={`${heightPct}%`}
                      fill="none"
                      stroke={track.state === 'confirmed' ? '#EF4444' : '#F59E0B'}
                      strokeWidth="2"
                      strokeDasharray={track.state === 'confirmed' ? 'none' : '3 3'}
                    />
                    <rect
                      x={`${mirroredX}%`}
                      y={`${Math.max(0, topY - 11)}%`}
                      width="68px"
                      height="12px"
                      fill={track.state === 'confirmed' ? '#EF4444' : '#F59E0B'}
                      rx="2"
                    />
                    <text
                      x={`${mirroredX + 1}%`}
                      y={`${Math.max(8, topY - 2)}%`}
                      fill="#FFFFFF"
                      fontSize="8.5px"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      {track.trackingId} {Math.round(track.confidence * 100)}%
                    </text>
                  </g>
                );
              })}
            </svg>
          )}

          {/* AI Proctoring Suite & YOLO / RT-DETR Status Pill */}
          <div
            style={{
              position: 'absolute',
              top: '6px',
              right: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            {/* AI Suite Selector Pill (Primary vs Failover Standby) */}
            <button
              type="button"
              onClick={toggleSuite}
              title={
                activeSuiteType === 'recommended'
                  ? 'Primary AI Suite Active: Recommended (YuNet + AdaFace + ONNX Runtime). Alternative Suite is on standby.'
                  : 'Failover Active: Alternative (SCRFD + ArcFace + OpenVINO) is engaged. Click to switch or restore primary.'
              }
              style={{
                background: activeSuiteType === 'recommended' ? 'rgba(30, 58, 138, 0.92)' : 'rgba(120, 53, 15, 0.95)',
                border: activeSuiteType === 'recommended' ? '1px solid #60A5FA' : '1px solid #F59E0B',
                color: activeSuiteType === 'recommended' ? '#93C5FD' : '#FDE68A',
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '0.60rem',
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'monospace',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
              }}
            >
              <span>{activeSuiteType === 'recommended' ? 'PRIMARY (ONNX):' : 'STANDBY (OpenVINO):'}</span>
              <span>{activeSuiteType === 'recommended' ? 'YuNet+Ada' : 'SCRFD+Arc'}</span>
            </button>

            {/* Object Detection Pill */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                background: 'rgba(15, 23, 42, 0.88)',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                padding: '2px 5px',
                borderRadius: '4px',
                fontSize: '0.60rem',
                color: '#38BDF8',
                fontWeight: 600,
                fontFamily: 'monospace',
              }}
            >
              <span>{activeSuiteType === 'recommended' ? 'YOLO:' : 'RT-DETR:'}</span>
              {(() => {
                const confirmedTrack = trackedPhones.find((t) => t.state === 'confirmed' && (t.isTemporallyConfirmed || t.hits >= 8));
                const tentativeTrack = trackedPhones.find((t) => t.state === 'tentative');
                if (confirmedTrack) {
                  return (
                    <span style={{ color: '#F87171' }}>
                      {confirmedTrack.trackingId} ({Math.round(confirmedTrack.confidence * 100)}%)
                    </span>
                  );
                }
                if (tentativeTrack) {
                  return (
                    <span style={{ color: '#F59E0B' }}>
                      Verifying ({tentativeTrack.hits}/8)
                    </span>
                  );
                }
                return <span style={{ color: '#4ADE80' }}>Active</span>;
              })()}
            </div>
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
          {faceStatus === 'multiple_faces' ? (
            <span style={{ color: '#ef4444', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
              <AlertTriangle size={11} color="#ef4444" /> Multiple Persons Confirmed ({trackedFaces.length})
            </span>
          ) : faceVerificationStatus === 'MISMATCH' ? (
            <span style={{ color: '#ef4444', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
              <AlertTriangle size={11} color="#ef4444" /> Identity Mismatch ({Math.round(similarityScore * 100)}%)
            </span>
          ) : (faceStatus === 'device_detected' || trackedPhones.length > 0) ? (
            <span style={{ color: '#ef4444', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
              <AlertTriangle size={11} color="#ef4444" /> Mobile Phone ({trackedPhones[0]?.trackingId || 'Detected'})
            </span>
          ) : faceStatus === 'camera_covered' ? (
            <span style={{ color: '#f59e0b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
              <AlertTriangle size={11} color="#f59e0b" /> Camera Covered / Low Light
            </span>
          ) : faceStatus === 'no_face' ? (
            <span style={{ color: '#f59e0b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
              <AlertTriangle size={11} color="#f59e0b" /> Face Absent
            </span>
          ) : faceVerificationStatus === 'MATCH' ? (
            <span style={{ color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
              <CheckCircle2 size={11} color="#10b981" /> Face Verified ({Math.round(similarityScore * 100)}%)
            </span>
          ) : (faceVerificationStatus === 'UNCERTAIN' || faceVerificationStatus === 'INCONCLUSIVE') ? (
            <span style={{ color: '#f59e0b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
              <AlertTriangle size={11} color="#f59e0b" /> Position Face ({Math.round(similarityScore * 100)}%)
            </span>
          ) : (
            <span style={{ color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
              <CheckCircle2 size={11} color="#10b981" /> Integrity Active
            </span>
          )}
          <span style={{ color: tabFocused ? 'var(--success)' : 'var(--warning)', fontWeight: 600 }}>
            {tabFocused ? 'Focused' : 'Unfocused'}
          </span>
        </div>

        {/* Active AI Proctoring Pipeline Spec Badge */}
        <div style={{ padding: '3px 8px 6px', fontSize: '0.60rem', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#94a3b8' }}>
          <span style={{ fontFamily: 'monospace' }}>
            {activeSuiteType === 'recommended'
              ? 'YuNet • AdaFace • ByteTrack • YOLO (ONNX)'
              : 'SCRFD • ArcFace • SORT • RT-DETR (OpenVINO)'}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={handleResyncCamera}
              title="Restart webcam pipeline or re-acquire hardware feed"
              style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', fontSize: '0.60rem', padding: 0, textDecoration: 'underline' }}
            >
              Re-sync Cam
            </button>
            <button
              type="button"
              onClick={() => setShowSuiteModal(true)}
              style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', fontSize: '0.60rem', padding: 0, textDecoration: 'underline' }}
            >
              Config
            </button>
          </div>
        </div>
      </div>

      {/* AI Proctoring Suite Specifications Modal */}
      {showSuiteModal && (
        <div
          className="modal-overlay"
          style={{
            zIndex: 3000,
            background: 'rgba(15, 23, 42, 0.82)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            className="modal-card"
            style={{
              maxWidth: '560px',
              width: '92%',
              background: '#0f172a',
              color: '#f8fafc',
              border: '1px solid #334155',
              borderRadius: '12px',
              padding: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shield size={18} color="#38bdf8" />
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>AI Proctoring Architecture Specifications</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSuiteModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Primary & Standby Architecture Notice */}
            <div
              style={{
                background: 'rgba(30, 41, 59, 0.7)',
                border: '1px solid #334155',
                borderRadius: '8px',
                padding: '10px 12px',
                marginBottom: '14px',
                fontSize: '0.72rem',
                lineHeight: 1.5,
                color: '#cbd5e1',
              }}
            >
              <div style={{ fontWeight: 700, color: '#38bdf8', marginBottom: '3px' }}>
                Operational Architecture: Primary Suite with Standby Failover
              </div>
              The system prioritizes the <strong>Recommended Suite (YuNet + AdaFace + ByteTrack + YOLO + ONNX)</strong> as the primary engine. The <strong>Alternative Suite (SCRFD + ArcFace + SORT + RT-DETR + OpenVINO)</strong> is kept on standby and will automatically engage if the primary suite encounters performance degradation or network anomalies.
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
              <button
                type="button"
                onClick={() => {
                  proctoringSuites.restorePrimarySuite();
                  setActiveSuiteType('recommended');
                }}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '6px',
                  background: activeSuiteType === 'recommended' ? '#1e3a8a' : '#1e293b',
                  border: activeSuiteType === 'recommended' ? '2px solid #3b82f6' : '1px solid #334155',
                  color: '#fff',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#93c5fd' }}>Recommended Suite (Primary Active)</div>
                <div style={{ fontSize: '0.70rem', color: '#cbd5e1' }}>YuNet + AdaFace + ByteTrack + ONNX</div>
              </button>
              <button
                type="button"
                onClick={() => {
                  proctoringSuites.triggerManualFailover('Candidate / Proctor manual selection');
                  setActiveSuiteType('alternative');
                }}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '6px',
                  background: activeSuiteType === 'alternative' ? '#581c87' : '#1e293b',
                  border: activeSuiteType === 'alternative' ? '2px solid #a855f7' : '1px solid #334155',
                  color: '#fff',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#d8b4fe' }}>Alternative Suite (Standby / Failover)</div>
                <div style={{ fontSize: '0.70rem', color: '#cbd5e1' }}>SCRFD + ArcFace + SORT + OpenVINO</div>
              </button>
            </div>

            {/* Model Architecture Comparison Table */}
            <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                    <th style={{ textAlign: 'left', padding: '6px 8px' }}>Component</th>
                    <th style={{ textAlign: 'left', padding: '6px 8px', color: activeSuiteType === 'recommended' ? '#60a5fa' : '#94a3b8' }}>Recommended Model</th>
                    <th style={{ textAlign: 'left', padding: '6px 8px', color: activeSuiteType === 'alternative' ? '#c084fc' : '#94a3b8' }}>Alternative Model</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '6px 8px', fontWeight: 600 }}>Face detection</td>
                    <td style={{ padding: '6px 8px', color: activeSuiteType === 'recommended' ? '#38bdf8' : '#e2e8f0' }}>YuNet</td>
                    <td style={{ padding: '6px 8px', color: activeSuiteType === 'alternative' ? '#e879f9' : '#e2e8f0' }}>SCRFD</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '6px 8px', fontWeight: 600 }}>Face recognition</td>
                    <td style={{ padding: '6px 8px', color: activeSuiteType === 'recommended' ? '#38bdf8' : '#e2e8f0' }}>AdaFace</td>
                    <td style={{ padding: '6px 8px', color: activeSuiteType === 'alternative' ? '#e879f9' : '#e2e8f0' }}>ArcFace</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '6px 8px', fontWeight: 600 }}>Face alignment</td>
                    <td style={{ padding: '6px 8px', color: activeSuiteType === 'recommended' ? '#38bdf8' : '#e2e8f0' }}>5-point landmarks</td>
                    <td style={{ padding: '6px 8px', color: activeSuiteType === 'alternative' ? '#e879f9' : '#e2e8f0' }}>RetinaFace landmarks</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '6px 8px', fontWeight: 600 }}>Face tracking</td>
                    <td style={{ padding: '6px 8px', color: activeSuiteType === 'recommended' ? '#38bdf8' : '#e2e8f0' }}>ByteTrack</td>
                    <td style={{ padding: '6px 8px', color: activeSuiteType === 'alternative' ? '#e879f9' : '#e2e8f0' }}>SORT</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '6px 8px', fontWeight: 600 }}>Face liveness</td>
                    <td style={{ padding: '6px 8px', color: activeSuiteType === 'recommended' ? '#38bdf8' : '#e2e8f0' }}>MiniFASNet</td>
                    <td style={{ padding: '6px 8px', color: activeSuiteType === 'alternative' ? '#e879f9' : '#e2e8f0' }}>Fourier Texture PAD</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '6px 8px', fontWeight: 600 }}>Head pose</td>
                    <td style={{ padding: '6px 8px', color: activeSuiteType === 'recommended' ? '#38bdf8' : '#e2e8f0' }}>MediaPipe Landmarker</td>
                    <td style={{ padding: '6px 8px', color: activeSuiteType === 'alternative' ? '#e879f9' : '#e2e8f0' }}>6DRepNet</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '6px 8px', fontWeight: 600 }}>Object detection</td>
                    <td style={{ padding: '6px 8px', color: activeSuiteType === 'recommended' ? '#38bdf8' : '#e2e8f0' }}>YOLO</td>
                    <td style={{ padding: '6px 8px', color: activeSuiteType === 'alternative' ? '#e879f9' : '#e2e8f0' }}>RT-DETR</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '6px 8px', fontWeight: 600 }}>Inference engine</td>
                    <td style={{ padding: '6px 8px', color: activeSuiteType === 'recommended' ? '#38bdf8' : '#e2e8f0' }}>ONNX Runtime</td>
                    <td style={{ padding: '6px 8px', color: activeSuiteType === 'alternative' ? '#e879f9' : '#e2e8f0' }}>OpenVINO</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowSuiteModal(false)}
                className="btn btn-primary"
                style={{ padding: '6px 14px', fontSize: '0.8rem' }}
              >
                Apply & Close
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* 3-Warning Automated Proctor Alert Modal */}
      {activeStrikeModal && (
        <div
          className="modal-overlay"
          style={{
            zIndex: 3000,
            background: 'rgba(15, 23, 42, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            className="modal-card"
            style={{
              maxWidth: '520px',
              width: '92%',
              border: activeStrikeModal.strike >= 3 ? '3px solid var(--danger)' : '2px solid var(--warning)',
              background: 'var(--bg-card)',
              boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5)',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '24px 28px', textAlign: 'center' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: activeStrikeModal.strike >= 3 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                  color: activeStrikeModal.strike >= 3 ? 'var(--danger)' : 'var(--warning)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px auto',
                }}
              >
                <AlertTriangle size={34} />
              </div>

              <h3 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0 0 8px 0', color: activeStrikeModal.strike >= (activeStrikeModal.totalAllowed || 3) ? 'var(--danger)' : '#F59E0B' }}>
                Warning {activeStrikeModal.strike} of {activeStrikeModal.totalAllowed || 3}
              </h3>

              {/* Visual Warning Count, Timestamp & Source Badges */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <span
                  style={{
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    background: activeStrikeModal.strike >= (activeStrikeModal.totalAllowed || 3) ? 'var(--danger)' : '#F59E0B',
                    color: '#fff',
                  }}
                >
                  Strike {activeStrikeModal.strike} / {activeStrikeModal.totalAllowed || 3}
                </span>

                <span
                  style={{
                    padding: '3px 10px',
                    borderRadius: '12px',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    background: activeStrikeModal.source === 'manual' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                    color: activeStrikeModal.source === 'manual' ? '#60A5FA' : '#FBBF24',
                    border: '1px solid currentColor',
                  }}
                >
                  {activeStrikeModal.source === 'manual' ? 'Manual Proctor Observation' : 'Automated Violation Signal'}
                </span>

                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {activeStrikeModal.timestamp ? new Date(activeStrikeModal.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString()}
                </span>
                {activeStrikeModal.adminName && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    by {activeStrikeModal.adminName}
                  </span>
                )}
              </div>

              {/* Violation Reason Card */}
              <div
                style={{
                  background: 'var(--bg-input)',
                  border: `1px solid ${activeStrikeModal.strike >= 3 ? 'rgba(239, 68, 68, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`,
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  fontSize: '0.92rem',
                  lineHeight: 1.5,
                  color: 'var(--text-main)',
                  fontWeight: 600,
                  marginBottom: '14px',
                  textAlign: 'left',
                }}
              >
                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Violation Reason:
                </div>
                {activeStrikeModal.message}
              </div>

              {/* Policy & Remaining Warnings Notice */}
              <div
                style={{
                  background: activeStrikeModal.strike >= (activeStrikeModal.totalAllowed || 3) ? 'rgba(239, 68, 68, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                  border: `1px solid ${activeStrikeModal.strike >= (activeStrikeModal.totalAllowed || 3) ? 'rgba(239, 68, 68, 0.25)' : 'rgba(245, 158, 11, 0.25)'}`,
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px 14px',
                  marginBottom: '20px',
                  fontSize: '0.8rem',
                  lineHeight: 1.45,
                  textAlign: 'left',
                  color: 'var(--text-secondary)',
                }}
              >
                <div style={{ fontWeight: 700, color: activeStrikeModal.strike >= (activeStrikeModal.totalAllowed || 3) ? 'var(--danger)' : '#F59E0B', marginBottom: '2px' }}>
                  {activeStrikeModal.strike >= (activeStrikeModal.totalAllowed || 3)
                    ? 'Final warning. Your examination will be automatically submitted according to the configured policy.'
                    : `${activeStrikeModal.remainingWarnings ?? Math.max(0, 3 - activeStrikeModal.strike)} warning(s) remaining before automatic exam submission.`}
                </div>
                <div>
                  Academic Policy: Three confirmed proctoring strikes will automatically submit the examination with all completed answers preserved.
                </div>
              </div>

              {activeStrikeModal.strike >= (activeStrikeModal.totalAllowed || 3) ? (
                <div
                  style={{
                    padding: '12px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--danger)',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    textAlign: 'center',
                  }}
                >
                  Final Warning Reached — Auto-Submitting Exam...
                </div>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    proctoringSocket.acknowledgeWarning({
                      studentId: currentLearnerId,
                      assessmentId,
                      sessionId,
                      warningCount: activeStrikeModal.strike,
                      timestamp: new Date().toISOString(),
                    });
                    setActiveStrikeModal(null);
                  }}
                  style={{ width: '100%', fontWeight: 700, padding: '10px 0' }}
                >
                  I Acknowledge & Return to Exam
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Admin Force-Stop Examination Modal */}
      {terminatedState.isTerminated && (
        <div
          className="modal-overlay"
          style={{
            zIndex: 10000,
            background: 'rgba(15, 23, 42, 0.94)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            className="modal-card"
            style={{
              maxWidth: '500px',
              width: '92%',
              border: '2px solid var(--danger)',
              background: 'var(--bg-card)',
              boxShadow: '0 16px 50px rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-lg)',
              padding: '28px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.15)',
                color: 'var(--danger)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
              }}
            >
              <Lock size={32} />
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 8px 0', color: 'var(--danger)' }}>
              Examination Concluded by Proctor
            </h3>

            <p style={{ fontSize: '0.88rem', color: 'var(--text-main)', marginBottom: '16px' }}>
              Your examination session was ended by invigilator <strong>{terminatedState.adminName}</strong>.
            </p>

            <div
              style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 14px',
                fontSize: '0.85rem',
                color: 'var(--text-main)',
                textAlign: 'left',
                marginBottom: '18px',
              }}
            >
              <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>Reason:</span>{' '}
              {terminatedState.reason}
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                color: 'var(--success)',
                fontSize: '0.82rem',
                fontWeight: 600,
              }}
            >
              <CheckCircle2 size={16} /> All responses recorded up to this point have been safely preserved.
            </div>
          </div>
        </div>
      )}
    </>
  );
};
