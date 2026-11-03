import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  QuizAssessmentConfig,
  QuizQuestionItem,
  QuizOption
} from '../../../types';
import {
  getAssessmentApi,
  startAttemptApi,
  saveAnswerApi,
  submitAttemptApi,
  getAttemptResultApi,
  mapBackendResponseToConfig
} from '../../../api/assessment.api';
import {
  HelpCircle, CheckCircle2, XCircle, AlertCircle, Clock,
  ChevronRight, ChevronLeft, RotateCcw, Award, CheckSquare,
  Square, Radio, Flag, ArrowRight, Sparkles, BookOpen
} from 'lucide-react';

export interface LearnerQuizRunnerProps {
  quizConfig?: QuizAssessmentConfig;
  assessmentId?: string;
  courseId: string;
  moduleId?: string;
  lessonId?: string;
  title: string;
  lessonTitle?: string;
  onQuizPassed: (score: number, totalMarks: number) => void;
  onNextLesson?: () => void;
  readOnly?: boolean;
}

interface AttemptResultData {
  score: number;
  totalMarks: number;
  percentage: number;
  passed: boolean;
  questionResults?: Array<{
    questionId: string;
    prompt: string;
    type: string;
    points: number;
    earnedPoints?: number;
    isCorrect?: boolean;
    studentAnswer?: string;
    correctAnswerText?: string;
    explanation?: string;
    options?: Array<{ id: string; text: string; isCorrect?: boolean }>;
  }>;
}

export const LearnerQuizRunner: React.FC<LearnerQuizRunnerProps> = ({
  quizConfig,
  assessmentId,
  courseId,
  moduleId,
  lessonId,
  title,
  lessonTitle,
  onQuizPassed,
  onNextLesson,
  readOnly = false,
}) => {
  // Resolved config and questions
  const [activeConfig, setActiveConfig] = useState<QuizAssessmentConfig | null>(quizConfig || null);
  const [questions, setQuestions] = useState<QuizQuestionItem[]>(quizConfig?.questions || []);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Quiz state machine: 'intro' | 'active' | 'evaluating' | 'results'
  const [quizState, setQuizState] = useState<'intro' | 'active' | 'evaluating' | 'results'>('intro');

  // Attempt & Progress tracking
  const [currentAttemptId, setCurrentAttemptId] = useState<string | null>(null);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [flaggedQuestionIds, setFlaggedQuestionIds] = useState<Set<string>>(new Set());
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [resultData, setResultData] = useState<AttemptResultData | null>(null);
  const [attemptsCount, setAttemptsCount] = useState(0);
  const timerRef = useRef<any>(null);

  // Sync / Fetch assessment from PostgreSQL if ID is present
  useEffect(() => {
    const targetId = assessmentId || quizConfig?.id;
    if (targetId && targetId.length === 36) {
      setIsLoading(true);
      getAssessmentApi(targetId)
        .then((resp) => {
          const cfg = mapBackendResponseToConfig(resp);
          setActiveConfig(cfg);
          if (cfg.questions && cfg.questions.length > 0) {
            setQuestions(cfg.questions);
          }
          setIsLoading(false);
        })
        .catch((err) => {
          console.warn('Notice: Could not load PostgreSQL assessment, using fallback config:', err);
          setIsLoading(false);
          // Fall back gracefully to passed quizConfig
          if (quizConfig) {
            setActiveConfig(quizConfig);
            setQuestions(quizConfig.questions || []);
          }
        });
    } else if (quizConfig) {
      setActiveConfig(quizConfig);
      setQuestions(quizConfig.questions || []);
    }
  }, [assessmentId, quizConfig]);

  // Countdown timer when quiz is active
  useEffect(() => {
    if (quizState === 'active' && secondsRemaining !== null && secondsRemaining > 0) {
      timerRef.current = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(timerRef.current);
            handleAutoSubmitOnTimeOut();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [quizState, secondsRemaining]);

  // Format seconds to mm:ss
  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Start the quiz
  const handleStartQuiz = async () => {
    setErrorMessage(null);
    setIsLoading(true);

    const targetId = activeConfig?.id || assessmentId;

    try {
      if (targetId && targetId.length === 36) {
        // Start live attempt in PostgreSQL
        const startRes = await startAttemptApi(targetId);
        setCurrentAttemptId(startRes.attemptId);
        if (startRes.assessment && startRes.assessment.questions && startRes.assessment.questions.length > 0) {
          // Questions returned with answers stripped for student security
          setQuestions(
            startRes.assessment.questions.map((q) => ({
              id: q.id,
              prompt: q.prompt,
              type: q.type as any,
              points: q.points || 1,
              difficulty: (q.difficulty as any) || 'medium',
              topic: q.topic,
              source: 'ai',
              options: (q.options || []).map((o: any) => ({ id: o.id, text: o.text, isCorrect: false })),
            }))
          );
        }
      }
    } catch (err: any) {
      console.warn('Backend attempt start failed, running locally:', err);
      // Fallback: generate local attempt id
      setCurrentAttemptId(`local-att-${Date.now()}`);
    }

    // Set time limit
    const limitMinutes = activeConfig?.timeLimitMinutes || 0;
    if (limitMinutes > 0) {
      setSecondsRemaining(limitMinutes * 60);
    } else {
      setSecondsRemaining(null);
    }

    setActiveQuestionIndex(0);
    setAnswers({});
    setFlaggedQuestionIds(new Set());
    setQuizState('active');
    setIsLoading(false);
  };

  // Select answer for current question
  const handleAnswerSelect = (questionId: string, value: string, isMultiSelect = false) => {
    if (readOnly) return;

    setAnswers((prev) => {
      if (isMultiSelect) {
        const currentVals = Array.isArray(prev[questionId]) ? (prev[questionId] as string[]) : [];
        const nextVals = currentVals.includes(value)
          ? currentVals.filter((v) => v !== value)
          : [...currentVals, value];
        return { ...prev, [questionId]: nextVals };
      } else {
        return { ...prev, [questionId]: value };
      }
    });

    // Fire non-blocking background save to PostgreSQL attempt if active
    if (currentAttemptId && !currentAttemptId.startsWith('local-')) {
      const payloadAnswer = isMultiSelect
        ? JSON.stringify(
            Array.isArray(answers[questionId])
              ? [...(answers[questionId] as string[]), value]
              : [value]
          )
        : value;
      saveAnswerApi(currentAttemptId, questionId, payloadAnswer).catch(() => {});
    }
  };

  // Toggle Flag
  const handleToggleFlag = (questionId: string) => {
    setFlaggedQuestionIds((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  };

  // Time-out auto submit
  const handleAutoSubmitOnTimeOut = () => {
    handleSubmitQuiz(true);
  };

  // Submit and grade quiz
  const handleSubmitQuiz = async (forcedByTimeOut = false) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setQuizState('evaluating');
    setIsLoading(true);

    const passThreshold = activeConfig?.passingPercentage || 70;
    let finalScore = 0;
    let finalTotal = activeConfig?.totalMarks || questions.length || 10;
    let finalPercent = 0;
    let isPassed = false;
    let detailedReview: AttemptResultData['questionResults'] = [];

    try {
      if (currentAttemptId && !currentAttemptId.startsWith('local-')) {
        // 1. Submit answers to PostgreSQL
        for (const [qId, ansVal] of Object.entries(answers)) {
          const stringVal = Array.isArray(ansVal) ? JSON.stringify(ansVal) : String(ansVal);
          await saveAnswerApi(currentAttemptId, qId, stringVal).catch(() => {});
        }

        // 2. Submit attempt in PostgreSQL
        const submitRes = await submitAttemptApi(currentAttemptId);
        finalScore = submitRes.score;
        finalTotal = submitRes.totalMarks || finalTotal;
        finalPercent = submitRes.percentage;
        isPassed = submitRes.passed;

        // 3. Fetch detailed review from PostgreSQL
        try {
          const resultReview = await getAttemptResultApi(currentAttemptId);
          if (resultReview && resultReview.questions) {
            detailedReview = resultReview.questions.map((q: any) => ({
              questionId: q.questionId,
              prompt: q.prompt || '',
              type: q.type || 'single_choice',
              points: q.points || 1,
              earnedPoints: q.earnedPoints ?? (q.isCorrect ? q.points : 0),
              isCorrect: q.isCorrect,
              studentAnswer: q.studentAnswer,
              correctAnswerText: q.correctAnswerText,
              explanation: q.explanation,
              options: q.options || [],
            }));
          }
        } catch (revErr) {
          console.warn('Could not fetch full attempt review:', revErr);
        }
      } else {
        throw new Error('Local fallback evaluation');
      }
    } catch (err) {
      // Local evaluation fallback
      let pointsEarned = 0;
      let totalPts = 0;

      detailedReview = questions.map((q) => {
        const qPts = q.points || 1;
        totalPts += qPts;
        const studentAns = answers[q.id];
        let correct = false;

        if (q.type === 'single_choice' || q.type === 'true_false') {
          const correctOption = q.options?.find((o) => o.isCorrect);
          if (correctOption && studentAns === correctOption.id) {
            correct = true;
          } else if (q.correctAnswerText && String(studentAns).toLowerCase() === q.correctAnswerText.toLowerCase()) {
            correct = true;
          }
        } else if (q.type === 'multiple_choice') {
          const correctIds = (q.options?.filter((o) => o.isCorrect) || []).map((o) => o.id);
          const studentList = Array.isArray(studentAns) ? studentAns : [];
          if (
            correctIds.length === studentList.length &&
            correctIds.every((id) => studentList.includes(id))
          ) {
            correct = true;
          }
        } else if (q.type === 'short_answer') {
          if (
            q.correctAnswerText &&
            studentAns &&
            String(studentAns).trim().toLowerCase() === q.correctAnswerText.trim().toLowerCase()
          ) {
            correct = true;
          }
        }

        if (correct) pointsEarned += qPts;

        return {
          questionId: q.id,
          prompt: q.prompt,
          type: q.type,
          points: qPts,
          earnedPoints: correct ? qPts : 0,
          isCorrect: correct,
          studentAnswer: Array.isArray(studentAns) ? studentAns.join(', ') : String(studentAns || ''),
          correctAnswerText: q.correctAnswerText || q.options?.filter((o) => o.isCorrect).map((o) => o.text).join(', '),
          explanation: q.explanation || 'Reviewed against curriculum criteria.',
          options: q.options || [],
        };
      });

      finalScore = pointsEarned;
      finalTotal = totalPts || 10;
      finalPercent = Math.round((finalScore / finalTotal) * 100);
      isPassed = finalPercent >= passThreshold;
    }

    setResultData({
      score: finalScore,
      totalMarks: finalTotal,
      percentage: finalPercent,
      passed: isPassed,
      questionResults: detailedReview,
    });

    setAttemptsCount((c) => c + 1);
    setQuizState('results');
    setIsLoading(false);

    if (isPassed) {
      onQuizPassed(finalScore, finalTotal);
    }
  };

  // Retake quiz
  const handleRetake = () => {
    const maxAttempts = activeConfig?.allowedAttempts ?? 0;
    if (maxAttempts > 0 && attemptsCount >= maxAttempts) {
      setErrorMessage(`Maximum allowed attempts (${maxAttempts}) reached for this assessment.`);
      return;
    }
    handleStartQuiz();
  };

  const currentQ = questions[activeQuestionIndex];
  const answeredCount = Object.keys(answers).length;

  // --------------------------------------------------------------------------
  // 1. INTRO VIEW
  // --------------------------------------------------------------------------
  if (quizState === 'intro') {
    return (
      <div
        style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border-subtle)',
          padding: '36px',
          boxShadow: 'var(--shadow-md)',
          maxWidth: '820px',
          margin: '0 auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'rgba(37, 99, 235, 0.12)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <HelpCircle size={28} />
          </div>
          <div>
            <span
              className="badge badge-primary"
              style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}
            >
              {activeConfig?.scope === 'lesson_quiz'
                ? 'Lesson Knowledge Check'
                : activeConfig?.scope === 'module_assessment'
                ? 'Module Assessment Checkpoint'
                : 'Course Assessment'}
            </span>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '4px 0 0', color: 'var(--text-main)' }}>
              {activeConfig?.title || title}
            </h2>
          </div>
        </div>

        {activeConfig?.description && (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '24px' }}>
            {activeConfig.description}
          </p>
        )}

        {/* Assessment Parameters Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '16px',
            marginBottom: '32px',
            background: 'var(--bg-input)',
            padding: '20px',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div>
            <div className="text-muted text-xs font-semibold" style={{ textTransform: 'uppercase' }}>
              Total Questions
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px' }}>
              {questions.length}
            </div>
          </div>

          <div>
            <div className="text-muted text-xs font-semibold" style={{ textTransform: 'uppercase' }}>
              Time Limit
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px' }}>
              {activeConfig?.timeLimitMinutes ? `${activeConfig.timeLimitMinutes} Mins` : 'Untimed'}
            </div>
          </div>

          <div>
            <div className="text-muted text-xs font-semibold" style={{ textTransform: 'uppercase' }}>
              Passing Score
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--success)', marginTop: '4px' }}>
              {activeConfig?.passingPercentage || 70}%
            </div>
          </div>

          <div>
            <div className="text-muted text-xs font-semibold" style={{ textTransform: 'uppercase' }}>
              Allowed Attempts
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px' }}>
              {!activeConfig?.allowedAttempts || activeConfig.allowedAttempts === 0
                ? 'Unlimited'
                : activeConfig.allowedAttempts}
            </div>
          </div>
        </div>

        {errorMessage && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid var(--danger)',
              color: 'var(--danger)',
              fontSize: '0.9rem',
              marginBottom: '20px',
            }}
          >
            {errorMessage}
          </div>
        )}

        {/* Start Action */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div className="text-muted text-xs">
            Answers are auto-evaluated and saved to PostgreSQL. You can review your solutions upon completion.
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleStartQuiz}
            disabled={isLoading || questions.length === 0}
            style={{ padding: '12px 28px', fontSize: '1rem', fontWeight: 600, gap: '8px' }}
          >
            {isLoading ? 'Starting Assessment...' : 'Start Assessment'}
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // 2. EVALUATING VIEW
  // --------------------------------------------------------------------------
  if (quizState === 'evaluating') {
    return (
      <div
        style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border-subtle)',
          padding: '60px 36px',
          textAlign: 'center',
          maxWidth: '680px',
          margin: '0 auto',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(37, 99, 235, 0.12)',
            color: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            animation: 'spin 2s linear infinite',
          }}
        >
          <Sparkles size={32} />
        </div>
        <h3 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '8px' }}>Evaluating Your Quiz...</h3>
        <p className="text-muted" style={{ fontSize: '0.95rem' }}>
          Validating submissions against PostgreSQL database and computing marks.
        </p>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // 3. RESULTS VIEW
  // --------------------------------------------------------------------------
  if (quizState === 'results' && resultData) {
    const isPassed = resultData.passed;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '880px', margin: '0 auto' }}>
        {/* Results Banner Card */}
        <div
          className="card"
          style={{
            padding: '36px',
            textAlign: 'center',
            borderTop: `6px solid ${isPassed ? 'var(--success)' : 'var(--danger)'}`,
            background: 'var(--bg-card)',
          }}
        >
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              background: isPassed ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              color: isPassed ? 'var(--success)' : 'var(--danger)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            {isPassed ? <Award size={40} /> : <AlertCircle size={40} />}
          </div>

          <span
            className={`badge ${isPassed ? 'badge-success' : 'badge-danger'}`}
            style={{ fontSize: '0.85rem', marginBottom: '8px' }}
          >
            {isPassed ? 'Assessment Passed' : 'Assessment Not Passed'}
          </span>

          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '8px 0 6px' }}>
            {isPassed ? 'Outstanding Work!' : 'Keep Practicing!'}
          </h2>

          <p className="text-muted" style={{ fontSize: '0.95rem', maxWidth: '540px', margin: '0 auto 24px' }}>
            {isPassed
              ? `You scored ${resultData.percentage}%, exceeding the ${activeConfig?.passingPercentage || 70}% passing benchmark. Lesson progress has been updated!`
              : `You scored ${resultData.percentage}%. The passing benchmark is ${activeConfig?.passingPercentage || 70}%. Review the feedback below and try again.`}
          </p>

          {/* Metric Stats */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '24px',
              flexWrap: 'wrap',
              marginBottom: '28px',
            }}
          >
            <div style={{ background: 'var(--bg-input)', padding: '12px 24px', borderRadius: 'var(--radius-md)' }}>
              <div className="text-muted text-xs">Total Score</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>
                {resultData.score} / {resultData.totalMarks}
              </div>
            </div>

            <div style={{ background: 'var(--bg-input)', padding: '12px 24px', borderRadius: 'var(--radius-md)' }}>
              <div className="text-muted text-xs">Grade</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: isPassed ? 'var(--success)' : 'var(--danger)' }}>
                {resultData.percentage}%
              </div>
            </div>

            <div style={{ background: 'var(--bg-input)', padding: '12px 24px', borderRadius: 'var(--radius-md)' }}>
              <div className="text-muted text-xs">Requirement</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>
                {activeConfig?.passingPercentage || 70}% Required
              </div>
            </div>
          </div>

          {/* Navigation Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
            {(!activeConfig?.allowedAttempts || attemptsCount < activeConfig.allowedAttempts) && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleRetake}
                style={{ gap: '8px', padding: '10px 22px' }}
              >
                <RotateCcw size={16} /> Retake Assessment
              </button>
            )}

            {isPassed && onNextLesson && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={onNextLesson}
                style={{ gap: '8px', padding: '10px 24px', fontWeight: 600 }}
              >
                Proceed to Next Lesson <ChevronRight size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Detailed Question Review List */}
        {resultData.questionResults && resultData.questionResults.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '8px 0 0' }}>
              Curriculum Review & Verified Solutions
            </h3>

            {resultData.questionResults.map((qRes, idx) => (
              <div
                key={qRes.questionId || idx}
                className="card"
                style={{
                  padding: '20px',
                  borderLeft: `4px solid ${qRes.isCorrect ? 'var(--success)' : 'var(--danger)'}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {qRes.isCorrect ? (
                      <CheckCircle2 size={18} color="var(--success)" />
                    ) : (
                      <XCircle size={18} color="var(--danger)" />
                    )}
                    <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Question {idx + 1}</span>
                    <span className="badge badge-secondary" style={{ fontSize: '0.7rem' }}>
                      {qRes.type.replace('_', ' ')}
                    </span>
                  </div>
                  <span className="text-muted text-xs font-semibold">
                    {qRes.earnedPoints ?? (qRes.isCorrect ? qRes.points : 0)} / {qRes.points} Pts
                  </span>
                </div>

                <p style={{ fontWeight: 600, fontSize: '0.95rem', margin: '4px 0 14px', color: 'var(--text-main)' }}>
                  {qRes.prompt}
                </p>

                {/* Question Options or Text Review */}
                {qRes.options && qRes.options.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
                    {qRes.options.map((opt) => {
                      const isStudentChoice =
                        qRes.studentAnswer === opt.id ||
                        qRes.studentAnswer === opt.text ||
                        (Array.isArray(answers[qRes.questionId]) && (answers[qRes.questionId] as string[]).includes(opt.id));
                      const isOptionCorrect = Boolean(opt.isCorrect);

                      let bg = 'var(--bg-input)';
                      let border = 'var(--border-subtle)';
                      if (isOptionCorrect) {
                        bg = 'rgba(16, 185, 129, 0.1)';
                        border = 'var(--success)';
                      } else if (isStudentChoice && !isOptionCorrect) {
                        bg = 'rgba(239, 68, 68, 0.1)';
                        border = 'var(--danger)';
                      }

                      return (
                        <div
                          key={opt.id}
                          style={{
                            padding: '8px 12px',
                            borderRadius: 'var(--radius-sm)',
                            background: bg,
                            border: `1px solid ${border}`,
                            fontSize: '0.85rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <span style={{ fontWeight: isOptionCorrect || isStudentChoice ? 600 : 400 }}>
                            {opt.text}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {isStudentChoice && (
                              <span className="badge badge-secondary" style={{ fontSize: '0.65rem' }}>
                                Your Answer
                              </span>
                            )}
                            {isOptionCorrect && (
                              <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>
                                Correct Answer
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ marginBottom: '14px', fontSize: '0.85rem' }}>
                    <div style={{ color: 'var(--text-muted)' }}>
                      Your Answer: <strong>{qRes.studentAnswer || '(No answer provided)'}</strong>
                    </div>
                    {qRes.correctAnswerText && (
                      <div style={{ color: 'var(--success)', marginTop: '4px' }}>
                        Model Answer: <strong>{qRes.correctAnswerText}</strong>
                      </div>
                    )}
                  </div>
                )}

                {/* Explanation */}
                {qRes.explanation && (
                  <div
                    style={{
                      background: 'rgba(99, 102, 241, 0.06)',
                      border: '1px solid rgba(99, 102, 241, 0.2)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '10px 14px',
                      fontSize: '0.825rem',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.5,
                    }}
                  >
                    <strong>Explanation:</strong> {qRes.explanation}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // 4. ACTIVE QUIZ RUNNER VIEW
  // --------------------------------------------------------------------------
  if (!currentQ) {
    return (
      <div className="card" style={{ padding: '36px', textAlign: 'center' }}>
        <p className="text-muted">No questions available in this assessment.</p>
        <button type="button" className="btn btn-secondary" onClick={() => setQuizState('intro')}>
          Return to Intro
        </button>
      </div>
    );
  }

  const isMultiSelect = currentQ.type === 'multiple_choice';
  const currentAnswer = answers[currentQ.id];
  const isFlagged = flaggedQuestionIds.has(currentQ.id);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '880px', margin: '0 auto' }}>
      {/* Quiz Top Action Bar: Timer, Question Count, Flag Toggle */}
      <div
        className="card"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 20px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className="badge badge-primary" style={{ fontSize: '0.75rem' }}>
            Question {activeQuestionIndex + 1} of {questions.length}
          </span>
          <span className="text-muted text-xs">
            {answeredCount} of {questions.length} answered
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {secondsRemaining !== null && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: 'var(--radius-md)',
                background: secondsRemaining < 60 ? 'rgba(239, 68, 68, 0.15)' : 'var(--bg-input)',
                color: secondsRemaining < 60 ? 'var(--danger)' : 'var(--text-main)',
                fontWeight: 700,
                fontSize: '0.85rem',
              }}
            >
              <Clock size={16} />
              <span>{formatTimer(secondsRemaining)}</span>
            </div>
          )}

          <button
            type="button"
            className={`btn btn-sm ${isFlagged ? 'btn-warning' : 'btn-secondary'}`}
            onClick={() => handleToggleFlag(currentQ.id)}
            style={{ gap: '6px', fontSize: '0.78rem' }}
          >
            <Flag size={14} />
            {isFlagged ? 'Flagged' : 'Flag'}
          </button>
        </div>
      </div>

      {/* Progress Track */}
      <div className="progress-bar-bg" style={{ height: '6px' }}>
        <div
          className="progress-bar-fill"
          style={{ width: `${Math.round(((activeQuestionIndex + 1) / questions.length) * 100)}%` }}
        />
      </div>

      {/* Main Question Card */}
      <div
        className="card"
        style={{
          padding: '32px',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-xl)',
          minHeight: '340px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div>
          {/* Question Type & Points Banner */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <span
              className="badge badge-secondary"
              style={{ fontSize: '0.72rem', textTransform: 'capitalize' }}
            >
              {currentQ.type.replace('_', ' ')}
              {isMultiSelect ? ' (Select all that apply)' : ''}
            </span>
            <span className="text-muted text-xs font-semibold">{currentQ.points || 1} Points</span>
          </div>

          {/* Question Prompt */}
          <h3
            style={{
              fontSize: '1.25rem',
              fontWeight: 700,
              lineHeight: 1.5,
              marginBottom: '24px',
              color: 'var(--text-main)',
            }}
          >
            {currentQ.prompt}
          </h3>

          {/* Options Renderer */}
          {currentQ.type === 'short_answer' ? (
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>
                Your Answer:
              </label>
              <textarea
                rows={4}
                className="form-textarea"
                style={{ width: '100%', fontSize: '0.95rem' }}
                placeholder="Type your response here..."
                value={typeof currentAnswer === 'string' ? currentAnswer : ''}
                onChange={(e) => handleAnswerSelect(currentQ.id, e.target.value)}
              />
            </div>
          ) : currentQ.type === 'true_false' ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {['True', 'False'].map((tfVal) => {
                const optId = currentQ.options?.find((o) => o.text.toLowerCase() === tfVal.toLowerCase())?.id || tfVal;
                const isSelected = currentAnswer === optId || currentAnswer === tfVal;

                return (
                  <button
                    key={tfVal}
                    type="button"
                    onClick={() => handleAnswerSelect(currentQ.id, optId)}
                    style={{
                      padding: '24px',
                      borderRadius: 'var(--radius-lg)',
                      background: isSelected ? 'var(--primary-light)' : 'var(--bg-input)',
                      border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '1.1rem', color: isSelected ? 'var(--primary)' : 'var(--text-main)' }}>
                      {tfVal}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {(currentQ.options || []).map((opt, optIndex) => {
                const optionKey = ['A', 'B', 'C', 'D', 'E', 'F'][optIndex] || `${optIndex + 1}`;
                const isSelected = isMultiSelect
                  ? Array.isArray(currentAnswer) && currentAnswer.includes(opt.id)
                  : currentAnswer === opt.id;

                return (
                  <div
                    key={opt.id}
                    onClick={() => handleAnswerSelect(currentQ.id, opt.id, isMultiSelect)}
                    style={{
                      padding: '14px 18px',
                      borderRadius: 'var(--radius-md)',
                      background: isSelected ? 'var(--primary-light)' : 'var(--bg-input)',
                      border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: isMultiSelect ? '6px' : '50%',
                        border: isSelected ? '2px solid var(--primary)' : '2px solid var(--border-main)',
                        background: isSelected ? 'var(--primary)' : 'transparent',
                        color: isSelected ? '#fff' : 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '0.78rem',
                        flexShrink: 0,
                      }}
                    >
                      {optionKey}
                    </div>
                    <div
                      style={{
                        fontSize: '0.925rem',
                        fontWeight: isSelected ? 600 : 400,
                        color: isSelected ? 'var(--primary)' : 'var(--text-main)',
                        flex: 1,
                      }}
                    >
                      {opt.text}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Question Navigator Actions */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '32px',
            paddingTop: '20px',
            borderTop: '1px solid var(--border-subtle)',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <button
            type="button"
            className="btn btn-secondary"
            disabled={activeQuestionIndex === 0}
            onClick={() => setActiveQuestionIndex((i) => Math.max(0, i - 1))}
            style={{ gap: '6px' }}
          >
            <ChevronLeft size={16} /> Previous
          </button>

          {/* Question Indicator Pills */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', maxWidth: '420px', justifyContent: 'center' }}>
            {questions.map((q, idx) => {
              const isCurrent = idx === activeQuestionIndex;
              const hasAnswer = Boolean(answers[q.id]);
              const flagged = flaggedQuestionIds.has(q.id);

              let pillBg = 'var(--bg-input)';
              let pillBorder = 'var(--border-subtle)';
              let pillColor = 'var(--text-muted)';

              if (isCurrent) {
                pillBorder = 'var(--primary)';
                pillBg = 'var(--primary-light)';
                pillColor = 'var(--primary)';
              } else if (flagged) {
                pillBorder = 'var(--warning)';
                pillBg = 'rgba(245, 158, 11, 0.15)';
                pillColor = 'var(--warning)';
              } else if (hasAnswer) {
                pillBg = 'rgba(16, 185, 129, 0.15)';
                pillBorder = 'var(--success)';
                pillColor = 'var(--success)';
              }

              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setActiveQuestionIndex(idx)}
                  title={`Question ${idx + 1}${flagged ? ' (Flagged)' : hasAnswer ? ' (Answered)' : ''}`}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '6px',
                    border: `1px solid ${pillBorder}`,
                    background: pillBg,
                    color: pillColor,
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                  }}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          {activeQuestionIndex < questions.length - 1 ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setActiveQuestionIndex((i) => Math.min(questions.length - 1, i + 1))}
              style={{ gap: '6px' }}
            >
              Next <ChevronRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-success"
              onClick={() => handleSubmitQuiz(false)}
              disabled={isLoading}
              style={{
                gap: '8px',
                background: 'var(--success)',
                color: '#fff',
                borderColor: 'var(--success)',
                fontWeight: 700,
                padding: '10px 20px',
              }}
            >
              Submit Assessment <CheckCircle2 size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
