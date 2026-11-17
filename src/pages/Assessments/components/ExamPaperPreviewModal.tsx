import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  Clock,
  Award,
  CheckCircle2,
  Shield,
  HelpCircle,
  Printer,
  Eye,
  EyeOff,
  AlertCircle,
  Video,
  FileQuestion,
  Sparkles,
  Layers,
  ChevronRight
} from 'lucide-react';
import { Assessment, Question, QuestionOption } from '../../../types';
import { useAssessmentStore } from '../../../lib/assessmentStore';
import { getAssessmentApi } from '../../../api/assessment.api';

interface ExamPaperPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  assessment: Assessment | null;
  onEditAssessment?: (assessment: Assessment) => void;
}

export const ExamPaperPreviewModal: React.FC<ExamPaperPreviewModalProps> = ({
  isOpen,
  onClose,
  assessment,
  onEditAssessment,
}) => {
  const { getQuestionsForAssessment } = useAssessmentStore();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAnswerKeys, setShowAnswerKeys] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>('all');

  useEffect(() => {
    if (!isOpen || !assessment) {
      setQuestions([]);
      return;
    }

    setIsLoading(true);

    // 1. Check embedded questionsData
    if (assessment.questionsData && assessment.questionsData.length > 0) {
      setQuestions(assessment.questionsData);
      setIsLoading(false);
      return;
    }

    // 2. Check full question objects inside questions array
    if (
      assessment.questions &&
      assessment.questions.length > 0 &&
      typeof (assessment.questions[0] as any) === 'object'
    ) {
      setQuestions(assessment.questions as unknown as Question[]);
      setIsLoading(false);
      return;
    }

    // 3. Check store resolution
    const storeQuestions = getQuestionsForAssessment(assessment.id);
    if (storeQuestions && storeQuestions.length > 0) {
      setQuestions(storeQuestions);
      setIsLoading(false);
      return;
    }

    // 4. Fallback to API if UUID exists
    if (assessment.id && assessment.id.length === 36) {
      getAssessmentApi(assessment.id)
        .then((data) => {
          if (data && data.questions && data.questions.length > 0) {
            const mapped: Question[] = data.questions.map((q: any) => ({
              id: q.id,
              assessmentId: data.id,
              prompt: q.prompt,
              type: q.type,
              points: q.points || 1,
              difficulty: q.difficulty || 'medium',
              explanation: q.explanation,
              rubric: q.rubric,
              options: (q.options || []).map((o: any) => ({
                id: o.id,
                text: o.text,
                isCorrect: Boolean(o.isCorrect),
              })),
            }));
            setQuestions(mapped);
          } else {
            setQuestions([]);
          }
        })
        .catch((err) => {
          console.warn('Failed to load questions from backend API:', err);
          setQuestions([]);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setQuestions([]);
      setIsLoading(false);
    }
  }, [isOpen, assessment, getQuestionsForAssessment]);

  if (!isOpen || !assessment) return null;

  const totalCalculatedMarks = questions.reduce(
    (acc, q) => acc + (Number(q.points) || 1),
    0
  );
  const displayTotalMarks = assessment.totalMarks || totalCalculatedMarks || 100;
  const passingScore = assessment.passingMarks || assessment.passmark || Math.round(displayTotalMarks * 0.7);

  const filteredQuestions = questions.filter((q) => {
    if (activeFilter === 'all') return true;
    return q.type === activeFilter;
  });

  const handlePrint = () => {
    window.print();
  };

  const getProctoringLabel = () => {
    if (assessment.proctoringMode === 'combined') {
      return {
        label: 'AI + Google Meet Proctor',
        detail: 'Automated AI telemetry plus live Google Meet/Jitsi invigilation',
        color: 'var(--primary)',
      };
    }
    if (assessment.proctoringMode === 'manual') {
      return {
        label: 'Manual Google Meet Proctor',
        detail: 'Live invigilation room via Google Meet / Jitsi',
        color: '#3B82F6',
      };
    }
    if (assessment.proctoringMode === 'automated') {
      return {
        label: 'AI Telemetry Proctor (Auto)',
        detail: 'Background AI monitoring (tab switch, face & audio telemetry) - No live human invigilator needed',
        color: '#10B981',
      };
    }
    return {
      label: 'Standard (Unproctored)',
      detail: 'No camera or screen monitoring required',
      color: 'var(--text-muted)',
    };
  };

  const procInfo = getProctoringLabel();

  return (
    <div
      className="modal-overlay"
      style={{
        zIndex: 9999,
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        background: 'rgba(5, 8, 22, 0.75)',
        backdropFilter: 'blur(8px)',
      }}
      onClick={onClose}
    >
      <div
        className="modal-card print-container"
        style={{
          maxWidth: '920px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(168, 85, 247, 0.04) 100%)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span
                className="badge badge-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                <FileText size={12} /> Question Paper Inspection
              </span>
              <span
                style={{
                  fontSize: '0.72rem',
                  color: 'var(--text-muted)',
                  background: 'var(--bg-input)',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                Admin / Trainer Review Mode (No Attempt Recorded)
              </span>
            </div>
            <h2 style={{ margin: '0 0 4px 0', fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)' }}>
              {assessment.title}
            </h2>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Course: <strong style={{ color: 'var(--text-main)' }}>{assessment.courseId || 'General Curriculum'}</strong>
              {(assessment as any).topic && <span> &bull; Topic: {(assessment as any).topic}</span>}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handlePrint}
              style={{ gap: '6px' }}
              title="Print / Save Paper as PDF"
            >
              <Printer size={14} /> Print Paper
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Close Preview"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Paper Overview Metrics Bar */}
        <div
          style={{
            padding: '14px 24px',
            background: 'var(--bg-input)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={16} color="var(--primary)" />
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Time Allowed
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                {assessment.durationMinutes || 45} Minutes
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileQuestion size={16} color="var(--primary)" />
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Total Questions
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                {questions.length > 0 ? questions.length : assessment.questions?.length || 0} Items
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Award size={16} color="var(--primary)" />
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Total Marks
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                {displayTotalMarks} Points
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={16} color="var(--success)" />
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Passing Score
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--success)' }}>
                {passingScore} pts ({Math.round(((assessment.passingMarks || passingScore) / (displayTotalMarks || 100)) * 100)}%)
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={16} color={procInfo.color} />
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Proctoring Mode
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: procInfo.color }}>
                {procInfo.label}
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar: Answer Keys Toggle & Filter */}
        <div
          style={{
            padding: '10px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            background: 'var(--bg-card)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setShowAnswerKeys(!showAnswerKeys)}
              className="btn btn-secondary btn-sm"
              style={{
                gap: '6px',
                fontSize: '0.8rem',
                borderColor: showAnswerKeys ? 'var(--primary)' : 'var(--border-subtle)',
                color: showAnswerKeys ? 'var(--primary)' : 'var(--text-muted)',
              }}
            >
              {showAnswerKeys ? <Eye size={14} /> : <EyeOff size={14} />}
              {showAnswerKeys ? 'Answer Keys Visible (Trainer Mode)' : 'Answer Keys Hidden'}
            </button>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {showAnswerKeys
                ? 'Correct answers are highlighted in green for trainer inspection'
                : 'Showing paper as learner sees it'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Filter:</span>
            <select
              className="form-input text-xs"
              style={{ padding: '4px 8px', borderRadius: '6px', width: 'auto' }}
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
            >
              <option value="all">All Questions ({questions.length})</option>
              <option value="single_choice">Single Choice</option>
              <option value="multiple_choice">Multiple Choice</option>
              <option value="true_false">True / False</option>
              <option value="short_answer">Short Answer</option>
              <option value="essay">Essay</option>
            </select>
          </div>
        </div>

        {/* Scrollable Questions Content */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          {/* Assessment Instructions Callout */}
          {assessment.instructions && (
            <div
              style={{
                background: 'rgba(99, 102, 241, 0.05)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                borderRadius: '10px',
                padding: '14px 18px',
                fontSize: '0.85rem',
                color: 'var(--text-main)',
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertCircle size={15} color="var(--primary)" /> Candidate Examination Instructions:
              </div>
              <div style={{ lineHeight: 1.5, color: 'var(--text-muted)' }}>{assessment.instructions}</div>
            </div>
          )}

          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              <div className="spinner" style={{ margin: '0 auto 12px auto' }} />
              <div>Loading examination questions and answer keys...</div>
            </div>
          ) : questions.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '48px 20px',
                background: 'var(--bg-input)',
                borderRadius: '12px',
                border: '1px dashed var(--border-subtle)',
              }}
            >
              <FileQuestion size={36} color="var(--text-muted)" style={{ margin: '0 auto 12px auto' }} />
              <h4 style={{ margin: '0 0 6px 0', fontSize: '1rem', color: 'var(--text-main)' }}>
                No questions configured in this assessment paper
              </h4>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                This assessment has not yet had question items added or they are linked via an external question bank.
              </p>
              {onEditAssessment && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  style={{ marginTop: '16px', gap: '6px' }}
                  onClick={() => {
                    onClose();
                    onEditAssessment(assessment);
                  }}
                >
                  <Sparkles size={14} /> Add Questions via Quiz Builder
                </button>
              )}
            </div>
          ) : (
            filteredQuestions.map((q, index) => {
              const questionNumber = index + 1;
              const hasOptions = q.options && q.options.length > 0;

              return (
                <div
                  key={q.id || `q-${index}`}
                  style={{
                    padding: '20px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '12px',
                    position: 'relative',
                  }}
                >
                  {/* Question Header */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '8px',
                      marginBottom: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '8px',
                          background: 'var(--primary)',
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '0.85rem',
                        }}
                      >
                        {questionNumber}
                      </span>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                        Question {questionNumber}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span
                        className="badge badge-secondary"
                        style={{ textTransform: 'capitalize', fontSize: '0.72rem' }}
                      >
                        {q.type.replace('_', ' ')}
                      </span>
                      {q.difficulty && (
                        <span
                          className={`badge ${
                            q.difficulty === 'hard'
                              ? 'badge-error'
                              : q.difficulty === 'medium'
                              ? 'badge-warning'
                              : 'badge-success'
                          }`}
                          style={{ textTransform: 'capitalize', fontSize: '0.72rem' }}
                        >
                          {q.difficulty}
                        </span>
                      )}
                      <span
                        className="badge badge-primary"
                        style={{ fontWeight: 700, fontSize: '0.75rem' }}
                      >
                        {q.points || 1} {Number(q.points) === 1 ? 'Point' : 'Points'}
                      </span>
                    </div>
                  </div>

                  {/* Question Prompt */}
                  <div
                    style={{
                      fontSize: '0.95rem',
                      lineHeight: 1.5,
                      fontWeight: 600,
                      color: 'var(--text-main)',
                      marginBottom: '16px',
                    }}
                  >
                    {q.prompt}
                  </div>

                  {/* Options List */}
                  {hasOptions && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {q.options!.map((opt, optIdx) => {
                        const optionLetter = String.fromCharCode(65 + optIdx);
                        const isCorrect = Boolean(opt.isCorrect);
                        const isHighlighted = showAnswerKeys && isCorrect;

                        return (
                          <div
                            key={opt.id || `opt-${optIdx}`}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '10px 14px',
                              borderRadius: '8px',
                              background: isHighlighted ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-card)',
                              border: isHighlighted
                                ? '1.5px solid #10B981'
                                : '1px solid var(--border-subtle)',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span
                                style={{
                                  width: '22px',
                                  height: '22px',
                                  borderRadius: '6px',
                                  background: isHighlighted ? '#10B981' : 'var(--bg-input)',
                                  color: isHighlighted ? '#FFFFFF' : 'var(--text-muted)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 700,
                                  fontSize: '0.75rem',
                                  border: isHighlighted ? 'none' : '1px solid var(--border-subtle)',
                                }}
                              >
                                {optionLetter}
                              </span>
                              <span
                                style={{
                                  fontSize: '0.88rem',
                                  color: isHighlighted ? 'var(--text-main)' : 'var(--text-muted)',
                                  fontWeight: isHighlighted ? 600 : 400,
                                }}
                              >
                                {opt.text}
                              </span>
                            </div>

                            {isHighlighted && (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  color: '#10B981',
                                  background: 'rgba(16, 185, 129, 0.15)',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                }}
                              >
                                <CheckCircle2 size={12} /> Correct Answer Key
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Short Answer / Essay Model Answer */}
                  {(q.type === 'short_answer' || q.type === 'essay') && (
                    <div
                      style={{
                        padding: '12px 14px',
                        background: 'var(--bg-card)',
                        borderRadius: '8px',
                        border: '1px dashed var(--border-subtle)',
                        marginTop: '8px',
                      }}
                    >
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                        {q.type === 'short_answer' ? 'Expected Text Response:' : 'Candidate Submission Type: Extended Essay'}
                      </div>
                      {showAnswerKeys && (q.correctAnswer || q.rubric) ? (
                        <div style={{ fontSize: '0.85rem', color: '#10B981', fontWeight: 600 }}>
                          <span style={{ fontWeight: 700 }}>Evaluator Rubric / Key:</span> {q.correctAnswer || q.rubric}
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          Learner types response into free-form editor during live session.
                        </div>
                      )}
                    </div>
                  )}

                  {/* Explanation Callout */}
                  {showAnswerKeys && q.explanation && (
                    <div
                      style={{
                        marginTop: '12px',
                        padding: '10px 14px',
                        background: 'rgba(99, 102, 241, 0.05)',
                        borderLeft: '3px solid var(--primary)',
                        borderRadius: '4px',
                        fontSize: '0.82rem',
                        color: 'var(--text-muted)',
                      }}
                    >
                      <strong style={{ color: 'var(--primary)' }}>Explanation / Grading Note: </strong>
                      {q.explanation}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--border-subtle)',
            background: 'var(--bg-card)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Viewing <strong>{filteredQuestions.length}</strong> of <strong>{questions.length}</strong> questions &bull;{' '}
            Total Score: <strong>{displayTotalMarks} Points</strong>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Close Paper
            </button>
            {onEditAssessment && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  onClose();
                  onEditAssessment(assessment);
                }}
                style={{ gap: '6px' }}
              >
                Edit in Quiz Builder <ChevronRight size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
