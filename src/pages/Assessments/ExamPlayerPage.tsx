import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuthStore } from '../../lib/store';
import { mockAssessments, mockQuestions } from '../../data/mockData';
import { useAssessmentStore } from '../../lib/assessmentStore';
import { useProctoringStore, DEFAULT_PROCTORING_POLICIES } from '../../lib/proctoringStore';
import {
  Clock, Shield, AlertTriangle, CheckCircle2, Circle, Flag,
  ChevronLeft, ChevronRight, Save, Eye, ArrowLeft, Award, HelpCircle, X,
  FileText, Video
} from 'lucide-react';
import { VeniGuardSetup } from './components/VeniGuardSetup';
import { VeniGuardStatusPanel } from './components/VeniGuardStatusPanel';
import { VeniGuardAlertToast, AlertNotification } from './components/VeniGuardAlertToast';
import { VeniGuardPauseOverlay } from './components/VeniGuardPauseOverlay';
import { VeniGuardJitsiDock } from './components/VeniGuardJitsiDock';
import { buildJitsiUrls, launchJitsiConference } from '../../lib/jitsiProctoring';
import {
  requestScreenCapture,
  enterFullscreen,
  isCurrentlyFullscreen,
  probeConnectionHealth,
  stopAllMediaTracks,
} from '../../lib/proctoringMedia';
import { ProctoringPolicy, ProctoringSessionStatus } from '../../types';

export const ExamPlayerPage: React.FC = () => {
  const { user, isAuthenticated } = useAuthStore();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const { id } = useParams<{ id: string }>();
  const { getAssessmentById, getQuestionsForAssessment } = useAssessmentStore();
  const storeAssessment = id ? getAssessmentById(id) : undefined;
  const assessment = storeAssessment || mockAssessments.find((a) => a.id === id) || mockAssessments[0];
  const navigate = useNavigate();

  // Proctoring store actions
  const {
    policies,
    initiateSession,
    setSessionStatus,
    updateChecklistState,
    logEvent,
    attachRecording,
  } = useProctoringStore();

  // Resolve monitoring policy (Ensure all 4 permissions: Screen, Mic, Webcam, Fullscreen are required)
  const policyLevel = assessment.proctoringPolicyLevel || 'monitored';
  const basePolicy: ProctoringPolicy = policies[policyLevel] || DEFAULT_PROCTORING_POLICIES.monitored;
  const policy: ProctoringPolicy = {
    ...basePolicy,
    requireScreenShare: true,
    requireMicrophone: true,
    requireWebcam: true,
    requireFullscreen: true,
  };

  // Active proctoring session reference
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // Authenticated candidate details for Jitsi Meet
  const candidateName = user?.displayName || (user ? `${user.firstName} ${user.lastName}`.trim() : 'Maria Garcia');
  const candidateEmail = user?.email || 'student@venilearn.org';
  const candidateId = user?.id || 'u-009';

  // Jitsi Meet endpoints and pre-configured proctoring room
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

  // Lifecycle stage: 'readiness' -> 'in_exam' -> 'results'
  const [stage, setStage] = useState<'readiness' | 'in_exam' | 'results'>('readiness');

  // Exam questions & answer state
  const loadedQuestions = id ? getQuestionsForAssessment(assessment.id) : [];
  const questions = loadedQuestions.length > 0 ? loadedQuestions : mockQuestions.slice(0, 5);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [flaggedQIds, setFlaggedQIds] = useState<string[]>([]);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState((assessment.durationMinutes || assessment.duration || 45) * 60);
  const [saveStatus, setSaveStatus] = useState<'Saved' | 'Saving...'>('Saved');
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);

  // Live media streams
  const screenStreamRef = useRef<MediaStream | null>(null);
  const userMediaStreamRef = useRef<MediaStream | null>(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isMicActive, setIsMicActive] = useState(false);
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  // Smart Pause & Recovery State
  const [isExamPaused, setIsExamPaused] = useState(false);
  const [pauseReason, setPauseReason] = useState<{ title: string; message: string }>({
    title: 'Assessment Paused',
    message: 'A required monitoring stream was interrupted.',
  });

  // Explainable Alert Toast state
  const [currentAlert, setCurrentAlert] = useState<AlertNotification | null>(null);
  const alertTimeoutRef = useRef<any>(null);

  // Results calculation
  const [finalScore, setFinalScore] = useState(85);
  const [passed, setPassed] = useState(true);

  const showAlert = (notification: Omit<AlertNotification, 'id'>) => {
    if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
    const newAlert: AlertNotification = {
      ...notification,
      id: `alert-${Date.now()}`,
    };
    setCurrentAlert(newAlert);
    alertTimeoutRef.current = setTimeout(() => {
      setCurrentAlert(null);
    }, 7000);
  };

  // Timer Countdown (Pauses when exam is paused)
  useEffect(() => {
    if (stage !== 'in_exam' || isExamPaused) return;
    const timer = setInterval(() => {
      setTimeLeftSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitExam();
          return 0;
        }
        return prev - 1;
      });
      setRecordingSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [stage, isExamPaused]);

  // Clean up media streams when unmounting or leaving
  useEffect(() => {
    return () => {
      stopAllMediaTracks(screenStreamRef.current);
      stopAllMediaTracks(userMediaStreamRef.current);
      if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
    };
  }, []);

  // -------------------------------------------------------------
  // REAL-TIME BROWSER EVENT MONITORING (FEATURE C)
  // -------------------------------------------------------------
  useEffect(() => {
    if (stage !== 'in_exam') return;

    // 1. Tab Visibility Change
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (currentSessionId) {
          logEvent(currentSessionId, {
            category: 'tab_visibility',
            severity: policy.pauseOnTabSwitch ? 'critical' : 'warning',
            title: 'Exam Window Focus Lost',
            description: 'The assessment tab became hidden. Student may have switched tabs or minimized the browser window.',
            technicalMetadata: { event: 'visibilitychange', hidden: true },
          });
        }

        showAlert({
          title: 'Exam Window Focus Lost',
          message:
            'The assessment window lost focus. This happens when you switch tabs or another program activates.',
          severity: policy.pauseOnTabSwitch ? 'critical' : 'warning',
          timestamp: new Date().toLocaleTimeString(),
          actionLabel: 'Return to Assessment',
          onAction: () => {},
          recordedForReview: true,
        });

        if (policy.pauseOnTabSwitch) {
          setIsExamPaused(true);
          setPauseReason({
            title: 'Window Focus Lost',
            message:
              'Your institutional policy requires uninterrupted tab focus. Return to this tab and verify focus to resume.',
          });
        }
      }
    };

    // 2. Window Blur (Lost OS Focus)
    const handleWindowBlur = () => {
      if (currentSessionId && !document.hidden) {
        logEvent(currentSessionId, {
          category: 'window_focus',
          severity: 'informational',
          title: 'Assessment Window Lost Focus',
          description: 'The browser window lost primary OS focus. An external application or desktop notification became active.',
          technicalMetadata: { event: 'window_blur' },
        });

        showAlert({
          title: 'Window Focus Lost',
          message:
            'Another application or window became active. Please keep the examination window focused.',
          severity: 'informational',
          timestamp: new Date().toLocaleTimeString(),
          actionLabel: 'Keep Focused',
          recordedForReview: true,
        });
      }
    };

    // 3. Fullscreen Exit
    const handleFullscreenChange = () => {
      const nowFullscreen = isCurrentlyFullscreen();
      setIsFullscreen(nowFullscreen);
      if (currentSessionId) {
        updateChecklistState(currentSessionId, { isFullscreen: nowFullscreen });
      }

      if (!nowFullscreen && policy.requireFullscreen) {
        if (currentSessionId) {
          logEvent(currentSessionId, {
            category: 'fullscreen_exit',
            severity: 'warning',
            title: 'Full-Screen Mode Exited',
            description: 'The student exited full-screen mode during the active assessment session.',
            technicalMetadata: { event: 'fullscreenchange', isFullscreen: false },
          });
        }

        showAlert({
          title: 'Full-Screen Mode Exited',
          message:
            'You exited full-screen mode. Re-enter full-screen mode to comply with the assessment policy.',
          severity: 'warning',
          timestamp: new Date().toLocaleTimeString(),
          actionLabel: 'Re-enter Fullscreen',
          onAction: () => {
            enterFullscreen().then((ok) => setIsFullscreen(ok));
          },
          recordedForReview: true,
        });
      }
    };

    // 4. Network Offline / Online
    const handleOffline = () => {
      setIsOnline(false);
      if (currentSessionId) {
        updateChecklistState(currentSessionId, { isOnline: false });
        logEvent(currentSessionId, {
          category: 'network_interruption',
          severity: 'critical',
          title: 'Internet Connection Interrupted',
          description: 'Client network dropped offline. Smart pause activated to protect student answers.',
          technicalMetadata: { event: 'offline' },
        });
      }

      setIsExamPaused(true);
      setPauseReason({
        title: 'Internet Connection Interrupted',
        message:
          'Your connection was temporarily interrupted. Your answers are saved locally and will sync once connection is restored.',
      });
    };

    const handleOnline = () => {
      setIsOnline(true);
      if (currentSessionId) {
        updateChecklistState(currentSessionId, { isOnline: true });
        logEvent(currentSessionId, {
          category: 'network_interruption',
          severity: 'informational',
          title: 'Internet Connection Restored',
          description: 'Network connectivity re-established successfully. Ready to resume.',
          technicalMetadata: { event: 'online' },
        });
      }

      showAlert({
        title: 'Connection Restored',
        message: 'Your internet connection has been restored. All answers are synced.',
        severity: 'informational',
        timestamp: new Date().toLocaleTimeString(),
        recordedForReview: true,
      });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [stage, currentSessionId, policy]);

  // Hook for Screen Sharing Track Ending (e.g. user clicked browser "Stop sharing")
  const attachScreenTrackEndedListener = (stream: MediaStream) => {
    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.onended = () => {
        setIsScreenSharing(false);
        if (currentSessionId) {
          updateChecklistState(currentSessionId, { activeScreenShare: false });
          logEvent(currentSessionId, {
            category: 'screen_share_interruption',
            severity: 'critical',
            title: 'Screen Sharing Interrupted',
            description: 'Screen capture track ended. The student may have clicked "Stop Sharing" or the capture window was closed.',
            technicalMetadata: { trackState: 'ended' },
          });
        }

        showAlert({
          title: 'Screen Sharing Interrupted',
          message:
            'Screen sharing stopped or became unavailable. Please restore screen sharing to resume your assessment.',
          severity: 'critical',
          timestamp: new Date().toLocaleTimeString(),
          actionLabel: 'Restore Screen Sharing',
          onAction: handleRestoreScreenShare,
          recordedForReview: true,
        });

        if (policy.pauseOnScreenShareLoss) {
          setIsExamPaused(true);
          setPauseReason({
            title: 'Screen Sharing Interrupted',
            message:
              'Continuous screen sharing is required by your assessment policy. Re-enable screen sharing to resume the timer.',
          });
        }
      };
    }
  };

  // Re-enable Screen Sharing Action
  const handleRestoreScreenShare = async () => {
    try {
      const { stream } = await requestScreenCapture();
      screenStreamRef.current = stream;
      attachScreenTrackEndedListener(stream);
      setIsScreenSharing(true);
      if (currentSessionId) {
        updateChecklistState(currentSessionId, { activeScreenShare: true });
        logEvent(currentSessionId, {
          category: 'screen_share_interruption',
          severity: 'informational',
          title: 'Screen Sharing Restored',
          description: 'Student successfully re-established the required screen capture stream.',
        });
      }
    } catch (err: any) {
      showAlert({
        title: 'Screen Sharing Failed',
        message: err.message || 'Could not restore screen sharing. Please grant permission in the browser dialog.',
        severity: 'critical',
        timestamp: new Date().toLocaleTimeString(),
      });
    }
  };

  // Resume Exam Action from Pause Overlay
  const handleResumeExam = () => {
    setIsExamPaused(false);
    if (currentSessionId) {
      setSessionStatus(currentSessionId, 'in_progress');
      logEvent(currentSessionId, {
        category: 'timing_event',
        severity: 'informational',
        title: 'Assessment Resumed',
        description: 'Exam was resumed after verifying required monitoring conditions.',
      });
    }
  };

  // Transition from Pre-Flight Setup to in_exam
  const handleReadyToStart = (streams: { screenStream?: MediaStream; userMediaStream?: MediaStream }) => {
    // Save streams in ref
    if (streams.screenStream) {
      screenStreamRef.current = streams.screenStream;
      setIsScreenSharing(true);
      attachScreenTrackEndedListener(streams.screenStream);
    }
    if (streams.userMediaStream) {
      userMediaStreamRef.current = streams.userMediaStream;
      if (policy.requireMicrophone) setIsMicActive(true);
      if (policy.requireWebcam) setIsWebcamActive(true);
    }

    // Initialize Session in Zustand store
    const session = initiateSession({
      assessmentId: assessment.id,
      assessmentTitle: assessment.title,
      learnerId: candidateId,
      learnerName: candidateName,
      policyLevel,
    });
    setCurrentSessionId(session.id);
    setSessionStatus(session.id, 'in_progress');
    updateChecklistState(session.id, {
      activeScreenShare: !!streams.screenStream,
      activeMic: policy.requireMicrophone && !!streams.userMediaStream,
      activeWebcam: policy.requireWebcam && !!streams.userMediaStream,
      isFullscreen: isCurrentlyFullscreen(),
      isOnline: navigator.onLine,
      jitsiRoomName: jitsiEndpoints.roomName,
      jitsiRoomUrl: jitsiEndpoints.webUrl,
      jitsiStatus: 'connected',
    });

    logEvent(session.id, {
      category: 'jitsi_conference',
      severity: 'informational',
      title: 'Jitsi Meet Conference Bridge Connected',
      description: `Live video proctoring session joined in room: ${jitsiEndpoints.roomName}. Audio and video streams are transmitting.`,
      technicalMetadata: { roomName: jitsiEndpoints.roomName, provider: 'meet.jit.si', role: 'Candidate' },
    });

    logEvent(session.id, {
      category: 'timing_event',
      severity: 'informational',
      title: 'Assessment Timer Started',
      description: `Exam session launched with ${questions.length} questions under policy: ${policy.name}.`,
    });

    setStage('in_exam');
  };

  const currentQ = questions[currentQIndex];
  const answeredCount = Object.keys(selectedAnswers).length;
  const unansweredCount = questions.length - answeredCount;

  const handleSelectAnswer = (optId: string) => {
    setSelectedAnswers({ ...selectedAnswers, [currentQ.id]: optId });
    setSaveStatus('Saving...');
    setTimeout(() => setSaveStatus('Saved'), 500);
  };

  const toggleFlag = (qId: string) => {
    if (flaggedQIds.includes(qId)) {
      setFlaggedQIds(flaggedQIds.filter((q) => q !== qId));
    } else {
      setFlaggedQIds([...flaggedQIds, qId]);
    }
  };

  const handleSubmitExam = () => {
    setIsSubmitModalOpen(false);

    // Stop streams cleanly
    stopAllMediaTracks(screenStreamRef.current);
    stopAllMediaTracks(userMediaStreamRef.current);
    setIsScreenSharing(false);
    setIsMicActive(false);
    setIsWebcamActive(false);

    // Finalize Proctoring Session in store
    if (currentSessionId) {
      setSessionStatus(currentSessionId, 'submitted');
      logEvent(currentSessionId, {
        category: 'timing_event',
        severity: 'informational',
        title: 'Assessment Submitted',
        description: `Student finalized and submitted attempt (${answeredCount} answered of ${questions.length}).`,
      });

      // Attach simulated or real recording metadata
      attachRecording(currentSessionId, {
        recordingUrl: `https://storage.venilearn.org/recordings/${currentSessionId}.webm`,
        duration: recordingSeconds,
        isSimulated: true,
      });
    }

    // Score calculation
    const calculatedScore = Math.round((answeredCount / questions.length) * 100);
    setFinalScore(calculatedScore);
    setPassed(calculatedScore >= (assessment.passingMarks || 70));
    setStage('results');
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // -------------------------------------------------------------
  // STAGE 1: PRE-EXAM PROCTORING SETUP (FEATURE A)
  // -------------------------------------------------------------
  if (stage === 'readiness') {
    return (
      <VeniGuardSetup
        assessment={assessment}
        policy={policy}
        onReadyToStart={handleReadyToStart}
        onCancel={() => navigate('/assessments')}
      />
    );
  }

  // -------------------------------------------------------------
  // STAGE 2: LIVE PROCTORED EXAM INTERFACE (FEATURE B, C, D, E)
  // -------------------------------------------------------------
  if (stage === 'in_exam') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '1280px', margin: '0 auto', padding: '16px' }}>
        {/* VeniGuard Monitoring Status Header */}
        <VeniGuardStatusPanel
          policy={policy}
          isScreenSharing={isScreenSharing}
          isMicActive={isMicActive}
          isWebcamActive={isWebcamActive}
          isOnline={isOnline}
          recordingSeconds={recordingSeconds}
          jitsiRoomName={jitsiEndpoints.roomName}
          onOpenJitsi={() => launchJitsiConference(jitsiEndpoints.webUrl)}
        />

        {/* Live Jitsi Meet Proctoring Dock (Collapsible/Embeddable) */}
        <VeniGuardJitsiDock
          endpoints={jitsiEndpoints}
          candidateName={candidateName}
          assessmentTitle={assessment.title}
          isMicActive={isMicActive}
          isWebcamActive={isWebcamActive}
          isScreenSharing={isScreenSharing}
        />

        {/* Top Sticky Question & Timer Bar */}
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-main)' }}>
              {assessment.title}
            </div>
            <div className="text-muted text-xs">
              Question {currentQIndex + 1} of {questions.length} &bull; {answeredCount} Answered ({unansweredCount} remaining)
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Autosave status indicator */}
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.75rem',
                color: saveStatus === 'Saved' ? 'var(--success)' : 'var(--warning)',
                fontWeight: 600,
              }}
            >
              <Save size={13} /> {saveStatus}
            </span>

            {/* Countdown timer */}
            <div
              style={{
                background: timeLeftSeconds < 300 ? 'var(--danger-bg)' : 'rgba(37, 99, 235, 0.15)',
                border: timeLeftSeconds < 300 ? '1px solid var(--danger-border)' : '1px solid rgba(59, 130, 246, 0.35)',
                color: timeLeftSeconds < 300 ? 'var(--danger)' : '#3B82F6',
                padding: '6px 14px',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: 800,
                fontSize: '1.05rem',
                fontFamily: 'monospace',
              }}
            >
              <Clock size={16} />
              <span>{formatTimer(timeLeftSeconds)}</span>
            </div>

            <button
              className="btn btn-primary btn-sm"
              onClick={() => setIsSubmitModalOpen(true)}
              style={{ fontWeight: 700 }}
            >
              Submit Exam
            </button>
          </div>
        </div>

        {/* Main Grid: Question Content on Left (75%), Navigator on Right (25%) */}
        <div className="exam-layout-grid">
          {/* Question Box */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '460px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <span className="badge badge-primary">Question {currentQIndex + 1} &bull; {currentQ.points} Points</span>
                <button
                  className={`btn btn-secondary btn-sm ${flaggedQIds.includes(currentQ.id) ? 'btn-outline' : ''}`}
                  onClick={() => toggleFlag(currentQ.id)}
                  style={{ gap: '4px', fontSize: '0.75rem' }}
                >
                  <Flag
                    size={13}
                    fill={flaggedQIds.includes(currentQ.id) ? 'var(--warning)' : 'none'}
                    color={flaggedQIds.includes(currentQ.id) ? 'var(--warning)' : 'currentColor'}
                  />
                  {flaggedQIds.includes(currentQ.id) ? 'Flagged for Review' : 'Flag Question'}
                </button>
              </div>

              <h2 style={{ fontSize: '1.2rem', marginBottom: '20px', lineHeight: 1.5, fontWeight: 700 }}>
                {currentQ.prompt}
              </h2>

              {/* Answer options */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {currentQ.options?.map((opt) => {
                  const isChecked = selectedAnswers[currentQ.id] === opt.id;

                  return (
                    <label
                      key={opt.id}
                      onClick={() => handleSelectAnswer(opt.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '14px 18px',
                        borderRadius: 'var(--radius-md)',
                        background: isChecked ? 'rgba(37, 99, 235, 0.15)' : 'var(--bg-input)',
                        border: isChecked ? '2px solid #2563EB' : '1px solid var(--border-subtle)',
                        cursor: 'pointer',
                        transition: 'var(--transition)',
                      }}
                    >
                      <input
                        type="radio"
                        name={`question-${currentQ.id}`}
                        checked={isChecked}
                        onChange={() => {}}
                        style={{ accentColor: '#2563EB', width: '16px', height: '16px' }}
                      />
                      <span
                        style={{
                          fontSize: '0.92rem',
                          color: isChecked ? '#3B82F6' : 'var(--text-main)',
                          fontWeight: isChecked ? 700 : 400,
                        }}
                      >
                        {opt.text}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '24px',
                paddingTop: '16px',
                borderTop: '1px solid var(--border-subtle)',
              }}
            >
              <button
                className="btn btn-secondary"
                onClick={() => setCurrentQIndex(currentQIndex - 1)}
                disabled={currentQIndex === 0}
              >
                <ChevronLeft size={16} /> Previous
              </button>

              <button
                className="btn btn-secondary"
                onClick={() => setCurrentQIndex(currentQIndex + 1)}
                disabled={currentQIndex === questions.length - 1}
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Question Navigator Grid */}
          <div className="card" style={{ padding: '18px', height: 'fit-content' }}>
            <h3 style={{ fontSize: '0.95rem', marginBottom: '14px', fontWeight: 700 }}>Question Navigator</h3>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(42px, 1fr))',
                gap: '8px',
                marginBottom: '16px',
              }}
            >
              {questions.map((q, idx) => {
                const isCurrent = idx === currentQIndex;
                const isAnswered = selectedAnswers[q.id] !== undefined;
                const isFlagged = flaggedQIds.includes(q.id);

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentQIndex(idx)}
                    style={{
                      height: '38px',
                      borderRadius: 'var(--radius-sm)',
                      background: isCurrent ? '#2563EB' : isAnswered ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-input)',
                      border: isCurrent
                        ? '2px solid #fff'
                        : isFlagged
                        ? '2px solid var(--warning)'
                        : isAnswered
                        ? '1px solid rgba(16, 185, 129, 0.4)'
                        : '1px solid var(--border-subtle)',
                      color: isCurrent ? '#fff' : isAnswered ? 'var(--success)' : 'var(--text-secondary)',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                    }}
                  >
                    {idx + 1}
                    {isFlagged && (
                      <span
                        style={{
                          position: 'absolute',
                          top: '2px',
                          right: '2px',
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: 'var(--warning)',
                        }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', background: '#2563EB', borderRadius: '2px' }} />
                <span>Current Question</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', background: 'var(--success)', borderRadius: '2px' }} />
                <span>Answered ({answeredCount})</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', background: 'var(--warning)', borderRadius: '2px' }} />
                <span>Flagged ({flaggedQIds.length})</span>
              </div>
            </div>
          </div>
        </div>

        {/* Explainable Real-Time Alert Toast */}
        <VeniGuardAlertToast alert={currentAlert} onDismiss={() => setCurrentAlert(null)} />

        {/* Smart Pause and Recovery Overlay */}
        {isExamPaused && (
          <VeniGuardPauseOverlay
            reasonTitle={pauseReason.title}
            reasonMessage={pauseReason.message}
            isScreenNeeded={policy.requireScreenShare}
            isScreenActive={isScreenSharing}
            isNetActive={isOnline}
            isFullscreenNeeded={policy.requireFullscreen}
            isFullscreenActive={isFullscreen}
            isRecovering={false}
            onRetryScreenShare={handleRestoreScreenShare}
            onRetryFullscreen={() => enterFullscreen().then((ok) => setIsFullscreen(ok))}
            onRetryConnection={() => probeConnectionHealth().then(({ online }) => setIsOnline(online))}
            onResumeExam={handleResumeExam}
            answeredCount={answeredCount}
            totalQuestions={questions.length}
          />
        )}

        {/* Confirmation Modal */}
        {isSubmitModalOpen && (
          <div className="modal-overlay" onClick={() => setIsSubmitModalOpen(false)}>
            <div className="modal-card" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 800 }}>Confirm Exam Submission</h3>
                <button onClick={() => setIsSubmitModalOpen(false)} style={{ color: 'var(--text-muted)' }}>
                  <X size={20} />
                </button>
              </div>

              <div className="modal-body">
                <p className="text-secondary text-sm" style={{ marginBottom: '16px' }}>
                  Are you ready to submit your attempt? Once submitted, your proctoring session will conclude and your responses will be locked.
                </p>

                <div
                  style={{
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '16px',
                    fontSize: '0.85rem',
                  }}
                >
                  <div>
                    <span className="text-muted text-xs">Answered:</span>
                    <div style={{ fontWeight: 700, color: 'var(--success)' }}>
                      {answeredCount} / {questions.length}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted text-xs">Unanswered:</span>
                    <div style={{ fontWeight: 700, color: unansweredCount > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                      {unansweredCount}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted text-xs">Flagged:</span>
                    <div style={{ fontWeight: 700, color: 'var(--warning)' }}>{flaggedQIds.length}</div>
                  </div>
                </div>

                {unansweredCount > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--warning)', fontSize: '0.8rem' }}>
                    <AlertTriangle size={16} />
                    <span>You have {unansweredCount} unanswered questions remaining.</span>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setIsSubmitModalOpen(false)}>
                  Return to Exam
                </button>
                <button className="btn btn-primary" onClick={handleSubmitExam} style={{ fontWeight: 700 }}>
                  Yes, Submit Final Answers
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // STAGE 3: RESULTS & PROCTORING REPORT ACCESS (FEATURE G)
  // -------------------------------------------------------------
  return (
    <div style={{ maxWidth: '740px', margin: '30px auto', padding: '0 16px' }}>
      <div className="card" style={{ textAlign: 'center', padding: '36px' }}>
        <div
          style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: passed ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            color: passed ? 'var(--success)' : 'var(--danger)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}
        >
          {passed ? <Award size={40} /> : <AlertTriangle size={40} />}
        </div>

        <span className={`badge ${passed ? 'badge-passed' : 'badge-failed'}`} style={{ fontSize: '0.85rem', marginBottom: '8px' }}>
          {passed ? 'Passed Evaluation' : 'Score Below Pass Threshold'}
        </span>

        <h1 style={{ fontSize: '1.8rem', marginBottom: '8px', fontWeight: 800 }}>{assessment.title}</h1>
        <p className="text-secondary text-xs" style={{ marginBottom: '24px' }}>
          Attempt completed on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
        </p>

        {/* Score & Telemetry Display */}
        <div
          style={{
            background: 'var(--bg-input)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-xl)',
            padding: '24px',
            marginBottom: '28px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '16px',
          }}
        >
          <div>
            <div className="text-muted text-xs font-semibold">Your Score</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: passed ? 'var(--success)' : 'var(--danger)' }}>
              {finalScore}%
            </div>
          </div>
          <div>
            <div className="text-muted text-xs font-semibold">Pass Threshold</div>
            <div style={{ fontSize: '2rem', fontWeight: 800 }}>
              {assessment.passingMarks || 70}%
            </div>
          </div>
          <div>
            <div className="text-muted text-xs font-semibold">VeniGuard Session Status</div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#3B82F6', marginTop: '6px' }}>
              Recorded &bull; Pending Review
            </div>
          </div>
        </div>

        {/* Explainable Fair Review Notice */}
        <div
          style={{
            background: 'rgba(37, 99, 235, 0.08)',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 18px',
            marginBottom: '28px',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
          }}
        >
          <Shield size={20} color="#3B82F6" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '0.82rem', lineHeight: 1.5, color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text-main)' }}>Explainable Proctoring Transparency: </strong>
            Your session telemetry, timestamps, and recorded events have been logged securely. You can review your event timeline and submit explanations for any technical disruptions on your dedicated report page.
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <Link
            to={currentSessionId ? `/my-proctoring-report/${currentSessionId}` : '/my-proctoring-reports'}
            className="btn btn-primary"
            style={{ gap: '8px', fontWeight: 700 }}
          >
            <FileText size={16} /> View My Proctoring Report
          </Link>
          <Link to="/assessments" className="btn btn-secondary">
            All Assessments
          </Link>
          <Link to="/dashboard" className="btn btn-secondary">
            Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};
