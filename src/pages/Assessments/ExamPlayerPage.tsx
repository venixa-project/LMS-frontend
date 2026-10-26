import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuthStore } from '../../lib/store';
import { mockAssessments, mockQuestions } from '../../data/mockData';
import { useAssessmentStore } from '../../lib/assessmentStore';
import { StudentProctorWidget } from './components/StudentProctorWidget';
import {
  Clock, Shield, AlertTriangle, CheckCircle2, Circle, Flag,
  ChevronLeft, ChevronRight, Save, Eye, ArrowLeft, Award, HelpCircle, X, Video, Mic
} from 'lucide-react';

export const ExamPlayerPage: React.FC = () => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const { id } = useParams<{ id: string }>();
  const { getAssessmentById, getQuestionsForAssessment } = useAssessmentStore();
  const storeAssessment = id ? getAssessmentById(id) : undefined;
  const assessment = storeAssessment || mockAssessments.find((a) => a.id === id) || mockAssessments[0];
  const navigate = useNavigate();

  // Lifecycle stage: 'readiness' -> 'in_exam' -> 'review' -> 'results'
  const [stage, setStage] = useState<'readiness' | 'in_exam' | 'results'>('readiness');

  // Exam questions
  const loadedQuestions = id ? getQuestionsForAssessment(assessment.id) : [];
  const questions = loadedQuestions.length > 0 ? loadedQuestions : mockQuestions.slice(0, 5);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [flaggedQIds, setFlaggedQIds] = useState<string[]>([]);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState((assessment.durationMinutes || assessment.duration || 45) * 60);
  const [saveStatus, setSaveStatus] = useState<'Saved' | 'Saving...'>('Saved');
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [forcedSubmissionReason, setForcedSubmissionReason] = useState<string | null>(null);

  // Proctoring checklist
  const [webcamPermitted, setWebcamPermitted] = useState(true);
  const [micPermitted, setMicPermitted] = useState(true);
  const [consentAcknowledged, setConsentAcknowledged] = useState(false);

  // Results calculation
  const [finalScore, setFinalScore] = useState(85);
  const [passed, setPassed] = useState(true);

  // Proctoring mode resolution
  const isProctored = assessment.proctoringRequired || (assessment.proctoringMode && assessment.proctoringMode !== 'none');
  const proctorMode = assessment.proctoringMode || (assessment.proctoringRequired ? 'combined' : 'none');
  const proctorSettings = assessment.proctoringSettings || {
    camera: true,
    mic: true,
    screenShare: false,
    faceDetection: true,
    noiseDetection: true,
    tabSwitchDetection: true,
  };

  // Live Timer Countdown
  useEffect(() => {
    if (stage !== 'in_exam') return;
    const timer = setInterval(() => {
      setTimeLeftSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [stage]);

  const currentQ = questions[currentQIndex];
  const answeredCount = Object.keys(selectedAnswers).length;
  const unansweredCount = questions.length - answeredCount;

  const handleSelectAnswer = (optId: string) => {
    setSelectedAnswers({ ...selectedAnswers, [currentQ.id]: optId });
    setSaveStatus('Saving...');
    setTimeout(() => setSaveStatus('Saved'), 600);
  };

  const toggleFlag = (qId: string) => {
    if (flaggedQIds.includes(qId)) {
      setFlaggedQIds(flaggedQIds.filter((id) => id !== qId));
    } else {
      setFlaggedQIds([...flaggedQIds, qId]);
    }
  };

  const handleSubmitExam = () => {
    setIsSubmitModalOpen(false);
    // calculate score simulation
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
  // STAGE 1: READINESS & PROCTORING CONSENT
  // -------------------------------------------------------------
  if (stage === 'readiness') {
    return (
      <div style={{ maxWidth: '680px', margin: '40px auto' }}>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'var(--primary-light)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Shield size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.4rem', margin: 0 }}>{assessment.title}</h1>
              <p className="text-muted text-xs">
                {isProctored ? 'Pre-Examination Proctoring & System Verification' : 'Standard Examination Verification'}
              </p>
            </div>
          </div>

          <div style={{
            background: 'var(--bg-input)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            marginBottom: '20px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
            gap: '12px',
            textAlign: 'center'
          }}>
            <div>
              <div className="text-muted text-xs font-semibold">Duration</div>
              <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{assessment.durationMinutes || assessment.duration || 45} Mins</div>
            </div>
            <div>
              <div className="text-muted text-xs font-semibold">Total Questions</div>
              <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{questions.length} Items</div>
            </div>
            <div>
              <div className="text-muted text-xs font-semibold">Pass Threshold</div>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--success)' }}>{assessment.passingMarks || 70} Pts</div>
            </div>
            <div>
              <div className="text-muted text-xs font-semibold">Proctoring Mode</div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: isProctored ? 'var(--primary)' : 'var(--text-muted)', textTransform: 'capitalize' }}>
                {proctorMode === 'combined' ? 'Combined (AI+Jitsi)' : proctorMode}
              </div>
            </div>
          </div>

          <h3 style={{ fontSize: '1rem', marginBottom: '12px' }}>System & Environment Readiness Checklist</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
            {isProctored ? (
              <>
                {proctorSettings.camera && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <CheckCircle2 size={18} color="var(--success)" />
                      <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Webcam & Video Feed Connection</span>
                    </div>
                    <span className="badge badge-active">Active</span>
                  </div>
                )}

                {proctorSettings.mic && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <CheckCircle2 size={18} color="var(--success)" />
                      <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Microphone & Audio Ambient Noise Sensor</span>
                    </div>
                    <span className="badge badge-active">Active</span>
                  </div>
                )}

                {proctorSettings.tabSwitchDetection && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <CheckCircle2 size={18} color="var(--success)" />
                      <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Browser Lockdown & Tab Switching Watcher</span>
                    </div>
                    <span className="badge badge-active">Enabled</span>
                  </div>
                )}

                {(proctorMode === 'manual' || proctorMode === 'combined') && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <CheckCircle2 size={18} color="var(--primary)" />
                      <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Jitsi Meet Proctor Room Session</span>
                    </div>
                    <span className="badge badge-primary">Authorized Room Associated</span>
                  </div>
                )}
              </>
            ) : (
              <div style={{ padding: '12px 16px', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Proctoring is disabled for this assessment per the institution's open examination policy. Standard honor code and academic integrity terms apply.
              </div>
            )}
          </div>

          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.8rem', color: 'var(--text-secondary)', cursor: 'pointer', marginBottom: '24px' }}>
            <input
              type="checkbox"
              checked={consentAcknowledged}
              onChange={(e) => setConsentAcknowledged(e.target.checked)}
              style={{ accentColor: 'var(--primary)', marginTop: '2px' }}
            />
            <span>
              {isProctored
                ? 'I understand this examination session is proctored for academic integrity. I consent to webcam, screen focus, and audio signal telemetry review in accordance with organizational policy.'
                : 'I certify that all responses submitted during this timed examination will be my own authentic work in adherence to the institutional academic honor code.'}
            </span>
          </label>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Link to="/assessments" className="btn btn-secondary">
              Cancel
            </Link>
            <button
              className="btn btn-primary btn-lg"
              disabled={!consentAcknowledged}
              onClick={() => setStage('in_exam')}
            >
              Start Timed Examination &rarr;
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // STAGE 2: LIVE EXAM DELIVERY WORKSPACE
  // -------------------------------------------------------------
  if (stage === 'in_exam') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Top Sticky Status Bar */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{assessment.title}</div>
            <div className="text-muted text-xs">
              Question {currentQIndex + 1} of {questions.length} &bull; {answeredCount} Answered ({unansweredCount} remaining)
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Autosave badge */}
            <span style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.75rem',
              color: saveStatus === 'Saved' ? 'var(--success)' : 'var(--warning)',
              fontWeight: 600
            }}>
              <Save size={12} /> {saveStatus}
            </span>

            {/* Countdown timer */}
            <div style={{
              background: timeLeftSeconds < 300 ? 'var(--danger-bg)' : 'var(--primary-light)',
              border: timeLeftSeconds < 300 ? '1px solid var(--danger-border)' : '1px solid rgba(99, 102, 241, 0.3)',
              color: timeLeftSeconds < 300 ? 'var(--danger)' : 'var(--primary)',
              padding: '6px 14px',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 800,
              fontSize: '1rem',
              fontFamily: 'var(--font-mono)'
            }}>
              <Clock size={16} />
              <span>{formatTimer(timeLeftSeconds)}</span>
            </div>

            <button
              className="btn btn-primary btn-sm"
              onClick={() => setIsSubmitModalOpen(true)}
            >
              Submit Exam
            </button>
          </div>
        </div>

        {/* Main Grid: Question Content on Left (75%), Navigator on Right (25%) */}
        <div className="exam-layout-grid">
          {/* Question Box */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '440px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <span className="badge badge-primary">Question {currentQIndex + 1} &bull; {currentQ.points} Points</span>
                <button
                  className={`btn btn-secondary btn-sm ${flaggedQIds.includes(currentQ.id) ? 'btn-outline' : ''}`}
                  onClick={() => toggleFlag(currentQ.id)}
                  style={{ gap: '4px', fontSize: '0.75rem' }}
                >
                  <Flag size={13} fill={flaggedQIds.includes(currentQ.id) ? 'var(--warning)' : 'none'} color={flaggedQIds.includes(currentQ.id) ? 'var(--warning)' : 'currentColor'} />
                  {flaggedQIds.includes(currentQ.id) ? 'Flagged for Review' : 'Flag Question'}
                </button>
              </div>

              <h2 style={{ fontSize: '1.2rem', marginBottom: '20px', lineHeight: 1.5 }}>
                {currentQ.prompt}
              </h2>

              {/* Answer options */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {currentQ.options?.map((opt, i) => {
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
                        background: isChecked ? 'var(--primary-light)' : 'var(--bg-input)',
                        border: isChecked ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
                        cursor: 'pointer',
                        transition: 'var(--transition)'
                      }}
                    >
                      <input
                        type="radio"
                        name={`question-${currentQ.id}`}
                        checked={isChecked}
                        onChange={() => {}}
                        style={{ accentColor: 'var(--primary)', width: '16px', height: '16px' }}
                      />
                      <span style={{ fontSize: '0.9rem', color: isChecked ? 'var(--primary)' : 'var(--text-main)', fontWeight: isChecked ? 600 : 400 }}>
                        {opt.text}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
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
          <div className="card" style={{ padding: '16px', height: 'fit-content' }}>
            <h3 style={{ fontSize: '0.95rem', marginBottom: '12px' }}>Question Navigator</h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(44px, 1fr))', gap: '8px', marginBottom: '16px' }}>
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
                      background: isCurrent ? 'var(--primary)' : isAnswered ? 'var(--success-bg)' : 'var(--bg-input)',
                      border: isCurrent ? '2px solid #fff' : isFlagged ? '2px solid var(--warning)' : '1px solid var(--border-subtle)',
                      color: isCurrent ? '#fff' : isAnswered ? 'var(--success)' : 'var(--text-secondary)',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative'
                    }}
                  >
                    {idx + 1}
                    {isFlagged && (
                      <span style={{
                        position: 'absolute',
                        top: '2px',
                        right: '2px',
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: 'var(--warning)'
                      }} />
                    )}
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', background: 'var(--primary)', borderRadius: '2px' }} />
                <span>Current Question</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', background: 'var(--success)', borderRadius: '2px' }} />
                <span>Answered</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', background: 'var(--warning)', borderRadius: '2px' }} />
                <span>Flagged for Review</span>
              </div>
            </div>
          </div>
        </div>

        {/* Confirmation Modal */}
        {isSubmitModalOpen && (
          <div className="modal-overlay" onClick={() => setIsSubmitModalOpen(false)}>
            <div className="modal-card" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Confirm Exam Submission</h3>
                <button onClick={() => setIsSubmitModalOpen(false)} style={{ color: 'var(--text-muted)' }}>
                  <X size={20} />
                </button>
              </div>

              <div className="modal-body">
                <p className="text-secondary text-sm" style={{ marginBottom: '16px' }}>
                  Are you ready to submit your attempt? Once submitted, you cannot change your answers.
                </p>

                <div style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '16px',
                  fontSize: '0.85rem'
                }}>
                  <div>
                    <span className="text-muted text-xs">Answered:</span>
                    <div style={{ fontWeight: 700, color: 'var(--success)' }}>{answeredCount} / {questions.length}</div>
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
                <button className="btn btn-primary" onClick={handleSubmitExam}>
                  Yes, Submit Final Answers
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Student-Facing Proctoring Telemetry & Warning Widget */}
        {isProctored && (
          <StudentProctorWidget
            assessmentId={assessment.id}
            learnerId={user?.id || 'u-007'}
            learnerName={user?.displayName || 'Alex Thompson'}
            isExamActive={stage === 'in_exam'}
            onForceSubmit={(reason) => {
              setForcedSubmissionReason(reason);
              handleSubmitExam();
            }}
          />
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // STAGE 3: RESULTS & INSTANT FEEDBACK
  // -------------------------------------------------------------
  return (
    <div style={{ maxWidth: '720px', margin: '30px auto' }}>
      <div className="card" style={{ textAlign: 'center', padding: '36px' }}>
        {forcedSubmissionReason && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 18px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: 'var(--danger)',
            textAlign: 'left'
          }}>
            <AlertTriangle size={22} style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Proctor Session Concluded</div>
              <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>
                {forcedSubmissionReason} All responses completed prior to session conclusion have been preserved and evaluated.
              </div>
            </div>
          </div>
        )}

        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          background: passed ? 'var(--success-bg)' : 'var(--danger-bg)',
          color: passed ? 'var(--success)' : 'var(--danger)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px'
        }}>
          {passed ? <Award size={40} /> : <AlertTriangle size={40} />}
        </div>

        <span className={`badge ${passed ? 'badge-passed' : 'badge-failed'}`} style={{ fontSize: '0.85rem', marginBottom: '8px' }}>
          {passed ? 'Passed Evaluation' : 'Score Below Threshold'}
        </span>

        <h1 style={{ fontSize: '1.8rem', marginBottom: '8px' }}>{assessment.title}</h1>
        <p className="text-secondary text-sm" style={{ marginBottom: '24px' }}>
          Attempt completed on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
        </p>

        {/* Score display */}
        <div style={{
          background: 'var(--bg-input)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-xl)',
          padding: '24px',
          marginBottom: '28px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '16px'
        }}>
          <div>
            <div className="text-muted text-xs font-semibold">Your Score</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: passed ? 'var(--success)' : 'var(--danger)' }}>
              {finalScore}%
            </div>
          </div>
          <div>
            <div className="text-muted text-xs font-semibold">Passing Requirement</div>
            <div style={{ fontSize: '2rem', fontWeight: 800 }}>
              {assessment.passingMarks}%
            </div>
          </div>
          <div>
            <div className="text-muted text-xs font-semibold">Proctoring Telemetry</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--success)', marginTop: '8px' }}>
              Clean (No Flags)
            </div>
          </div>
        </div>

        {/* Detailed Breakdown */}
        <div style={{ textAlign: 'left', marginBottom: '28px' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '14px' }}>Question-by-Question Breakdown</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {questions.map((q, idx) => (
              <div
                key={q.id}
                style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <CheckCircle2 size={16} color="var(--success)" />
                  <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Q{idx + 1}: {q.prompt.slice(0, 50)}...</span>
                </div>
                <span className="badge badge-active">{q.points}/{q.points} Pts</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
          <Link to="/assessments" className="btn btn-secondary">
            All Assessments
          </Link>
          <Link to="/dashboard" className="btn btn-primary">
            Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};
