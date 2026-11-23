import React, { useState, useEffect, useMemo } from 'react';
import { AssessmentAttempt, Rubric } from '../../../types';
import { useGradingStore } from '../../../lib/gradingStore';
import {
  X, Check, Sparkles, CheckCircle2, Clock, AlertTriangle,
  Award, ShieldAlert, ArrowRight, BookOpen, Layers, History,
  RotateCcw, ThumbsDown
} from 'lucide-react';

interface SubmissionEvaluationModalProps {
  attempt: AssessmentAttempt;
  onClose: () => void;
  isFaculty?: boolean;
}

export const SubmissionEvaluationModal: React.FC<SubmissionEvaluationModalProps> = ({
  attempt,
  onClose,
  isFaculty = true,
}) => {
  const {
    tasks,
    activeModalTask,
    taskAuditHistory,
    acceptAiScore,
    rejectAiScore,
    overrideScore,
    saveDraftGrade,
    triggerEvaluation,
    fetchTaskDetails,
    fetchTaskHistory,
  } = useGradingStore();

  const [activeModalTab, setActiveModalTab] = useState<'evaluation' | 'rubric' | 'history'>('evaluation');
  const [score, setScore] = useState<number>(attempt.score !== undefined ? attempt.score : (attempt.aiSuggestion?.score || 0));
  const [feedback, setFeedback] = useState<string>(
    attempt.feedback ||
    attempt.aiSuggestion?.feedback ||
    'Assessment evaluated. Answers demonstrate solid understanding of core concepts.'
  );
  const [privateNotes, setPrivateNotes] = useState<string>(
    attempt.privateNotes || 'Graded in AI Evaluation Queue.'
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [showRejectPrompt, setShowRejectPrompt] = useState<boolean>(false);
  const [rejectionReason, setRejectionReason] = useState<string>('AI score does not accurately reflect descriptive depth.');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Identify matching task
  const matchingTask = useMemo(() => {
    return tasks.find((t) => t.attemptId === attempt.id || t.id === attempt.id);
  }, [tasks, attempt.id]);

  const taskId = matchingTask?.id || attempt.id;

  // Rubric score state
  const [rubricScores, setRubricScores] = useState<Record<string, number>>(
    attempt.rubricScores || attempt.aiSuggestion?.rubricScores || {}
  );

  // Proactively fetch full task questions, answers, and audit log from PostgreSQL
  useEffect(() => {
    if (taskId) {
      fetchTaskDetails(taskId);
      fetchTaskHistory(taskId);
    }
  }, [taskId]);

  useEffect(() => {
    if (attempt.score !== undefined) {
      setScore(attempt.score);
    } else if (attempt.aiSuggestion?.score !== undefined) {
      setScore(attempt.aiSuggestion.score);
    }
  }, [attempt]);

  // Extract real questions from the backend task
  const assessmentQuestions = useMemo(() => {
    if (activeModalTask?.assessment?.questions && activeModalTask.assessment.questions.length > 0) {
      return activeModalTask.assessment.questions;
    }
    return [];
  }, [activeModalTask]);

  // Extract real rubric criteria from backend task
  const rubricCriteria = useMemo(() => {
    if (activeModalTask?.assessment?.rubric?.criteria && activeModalTask.assessment.rubric.criteria.length > 0) {
      return activeModalTask.assessment.rubric.criteria;
    }
    return [];
  }, [activeModalTask]);

  const showNotification = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3500);
  };

  const handleLevelSelect = (critId: string, pts: number) => {
    const updated = { ...rubricScores, [critId]: pts };
    setRubricScores(updated);
    const sum = Object.values(updated).reduce((acc, curr) => acc + curr, 0);
    setScore(sum);
  };

  const handleAcceptAI = async () => {
    setIsSubmitting(true);
    try {
      await acceptAiScore(taskId, feedback);
      showNotification('AI score recommendation approved and saved to PostgreSQL!');
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      showNotification(`Failed to approve AI score: ${err?.message || 'Server error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectAI = async () => {
    if (!rejectionReason.trim()) {
      showNotification('Please enter a specific rejection reason.');
      return;
    }
    setIsSubmitting(true);
    try {
      await rejectAiScore(taskId, rejectionReason.trim());
      showNotification('AI score recommendation rejected and routed for human grading.');
      setShowRejectPrompt(false);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      showNotification(`Failed to reject score: ${err?.message || 'Server error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    setIsSubmitting(true);
    try {
      await saveDraftGrade(taskId, {
        score,
        feedback,
        rubricScores,
        privateNotes,
      });
      showNotification('Grading progress saved as draft in PostgreSQL.');
    } catch (err: any) {
      showNotification(`Save draft error: ${err?.message || 'Server error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    try {
      await overrideScore(taskId, {
        score,
        feedback,
        rubricScores,
        privateNotes,
      });
      showNotification('Final grade confirmed, approved, and released in PostgreSQL!');
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      showNotification(`Submission error: ${err?.message || 'Server error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReEvaluate = async () => {
    setIsSubmitting(true);
    try {
      await triggerEvaluation(taskId);
      showNotification('AI evaluation re-executed successfully!');
      if (taskId) {
        fetchTaskDetails(taskId);
        fetchTaskHistory(taskId);
      }
    } catch (err: any) {
      showNotification(`Evaluation error: ${err?.message || 'AI service error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isPublished = attempt.evaluationStatus === 'published' || attempt.status === 'results_released';

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        className="modal-card"
        style={{ maxWidth: '980px', width: '95%', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header" style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--primary), #818cf8)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '1rem',
              }}
            >
              {attempt.learnerName ? attempt.learnerName.charAt(0) : 'S'}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 700 }}>
                  {attempt.learnerName}
                </h3>
                <span className="badge badge-info text-xs">{attempt.learnerRollNo || 'STU-ID'}</span>
                <span className="badge badge-primary text-xs" style={{ textTransform: 'capitalize' }}>
                  {attempt.assessmentType || 'Assessment'} (Attempt #{attempt.attemptNumber || 1})
                </span>
                {isPublished ? (
                  <span className="badge badge-completed text-xs">Grade Published</span>
                ) : attempt.aiSuggestion ? (
                  <span className="badge badge-warning text-xs">AI Suggestion Awaiting Review</span>
                ) : (
                  <span className="badge badge-draft text-xs">Pending Evaluation</span>
                )}
              </div>
              <p className="text-secondary text-xs" style={{ margin: '4px 0 0 0' }}>
                <strong>{attempt.assessmentTitle}</strong> &bull; {attempt.courseTitle || 'Enrolled Course'} &bull; Submitted on{' '}
                {attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleString() : 'Recent'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn-icon"
            style={{ color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}
          >
            <X size={22} />
          </button>
        </div>

        {notice && (
          <div
            style={{
              background: 'var(--success-bg)',
              borderBottom: '1px solid var(--success-border)',
              color: 'var(--success)',
              padding: '10px 24px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.85rem',
            }}
          >
            <CheckCircle2 size={16} />
            <span>{notice}</span>
          </div>
        )}

        {/* Modal Navigation Tabs (Evaluation, Rubrics, Audit History) */}
        <div style={{ display: 'flex', gap: '12px', padding: '12px 24px 0 24px', borderBottom: '1px solid var(--border-subtle)' }}>
          <button
            className={`btn btn-sm ${activeModalTab === 'evaluation' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveModalTab('evaluation')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <BookOpen size={14} /> Questions & Answers
          </button>

          {rubricCriteria.length > 0 && (
            <button
              className={`btn btn-sm ${activeModalTab === 'rubric' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveModalTab('rubric')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Layers size={14} /> Rubric Matrix ({rubricCriteria.length})
            </button>
          )}

          <button
            className={`btn btn-sm ${activeModalTab === 'history' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveModalTab('history')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <History size={14} /> Audit Trail ({taskAuditHistory.length})
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="modal-body" style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Quick Score Overview Banner */}
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div>
                <div className="text-muted text-xs">Evaluated Score</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--primary)' }}>
                  {score} / {attempt.totalMarks}{' '}
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    ({attempt.totalMarks > 0 ? Math.round((score / attempt.totalMarks) * 100) : 0}%)
                  </span>
                </div>
              </div>

              <div style={{ height: '32px', width: '1px', background: 'var(--border-subtle)' }} />

              <div>
                <div className="text-muted text-xs">Passing Requirement</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>
                  60% (Pass Status:{' '}
                  <span style={{ color: (score / attempt.totalMarks) * 100 >= 60 ? 'var(--success)' : 'var(--danger)' }}>
                    {(score / attempt.totalMarks) * 100 >= 60 ? 'PASSED' : 'NEEDS IMPROVEMENT'}
                  </span>
                  )
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {attempt.aiSuggestion && (
                <div
                  style={{
                    background: 'rgba(99, 102, 241, 0.08)',
                    border: '1px solid rgba(99, 102, 241, 0.25)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '8px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <Sparkles size={16} color="var(--primary)" />
                  <div style={{ fontSize: '0.8rem' }}>
                    <strong>AI Confidence: {Math.round(attempt.aiSuggestion.confidence * 100)}%</strong>
                    <span className="text-muted"> ({attempt.aiSuggestion.model || 'Local Model'})</span>
                  </div>
                </div>
              )}

              <button
                className="btn btn-secondary btn-sm"
                onClick={handleReEvaluate}
                disabled={isSubmitting}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                title="Re-run AI evaluation on candidate submission"
              >
                <RotateCcw size={14} className={isSubmitting ? 'animate-spin' : ''} />
                Re-evaluate
              </button>
            </div>
          </div>

          {/* AI Score Suggestion Card if available */}
          {attempt.aiSuggestion && (
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(168, 85, 247, 0.05))',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={18} color="var(--primary)" />
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>
                    AI-Assisted Preliminary Score Recommendation
                  </h4>
                </div>
                <span className="badge badge-primary">
                  Suggested: {attempt.aiSuggestion.score} / {attempt.totalMarks} pts
                </span>
              </div>

              <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', margin: '0 0 10px 0', lineHeight: 1.5 }}>
                {attempt.aiSuggestion.feedback}
              </p>

              {attempt.aiSuggestion.evidence && attempt.aiSuggestion.evidence.length > 0 && (
                <div style={{ background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: '12px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Key Evaluated Evidence & Observations:
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {attempt.aiSuggestion.evidence.map((ev, i) => (
                      <li key={i} style={{ marginBottom: '3px' }}>{ev}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                <div className="text-muted text-xs">
                  Preliminary score generated from marking scheme. Final publication requires human approval.
                </div>
                {!isPublished && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setShowRejectPrompt(!showRejectPrompt)}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ef4444' }}
                    >
                      <ThumbsDown size={14} /> Reject AI Score
                    </button>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={handleAcceptAI}
                      disabled={isSubmitting}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Check size={14} /> Accept AI Score ({attempt.aiSuggestion.score} pts)
                    </button>
                  </div>
                )}
              </div>

              {/* Rejection Prompt Box */}
              {showRejectPrompt && (
                <div style={{ marginTop: '14px', padding: '12px', background: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '6px' }}>
                  <label className="form-label text-xs" style={{ fontWeight: 700, color: '#ef4444' }}>
                    Rejection Reason (Required for Audit Trail):
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Provide specific justification for rejecting the AI score suggestion..."
                    style={{ marginBottom: '8px', fontSize: '0.85rem' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => setShowRejectPrompt(false)}>
                      Cancel
                    </button>
                    <button className="btn btn-primary btn-sm" style={{ background: '#ef4444' }} onClick={handleRejectAI} disabled={isSubmitting}>
                      Confirm Rejection
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 1: Real Questions & Student Submission Analysis */}
          {activeModalTab === 'evaluation' && (
            <div>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BookOpen size={18} /> Student Submission & Answer Analysis
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {assessmentQuestions.length > 0 ? (
                  assessmentQuestions.map((q: any, idx: number) => {
                    const ans = (attempt.answers || []).find((a) => a.questionId === q.id);
                    const isObjective = ['single_choice', 'multiple_choice', 'true_false'].includes(q.type);

                    return (
                      <div
                        key={q.id || idx}
                        style={{
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-md)',
                          padding: '16px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="badge badge-neutral text-xs">Q{idx + 1}</span>
                            <span className="badge badge-info text-xs" style={{ textTransform: 'capitalize' }}>
                              {(q.type || 'question').replace('_', ' ')}
                            </span>
                            {ans && ans.isCorrect !== undefined && (
                              <span className={`badge ${ans.isCorrect ? 'badge-completed' : 'badge-failed'} text-xs`}>
                                {ans.isCorrect ? 'Correct' : 'Partial / Incorrect'}
                              </span>
                            )}
                          </div>
                          <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                            {ans?.points !== undefined ? ans.points : '—'} / {q.points || 1} pts
                          </div>
                        </div>

                        {/* Question Prompt */}
                        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '10px' }}>
                          {q.prompt || 'Question Prompt'}
                        </div>

                        {/* Student Response */}
                        <div
                          style={{
                            background: 'var(--bg-input)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '12px',
                            marginBottom: '10px',
                          }}
                        >
                          <div style={{ fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                            Student Submitted Answer:
                          </div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                            {ans?.answer ? ans.answer : '— No answer response submitted —'}
                          </div>
                        </div>

                        {/* Instructor Correct Answer Key */}
                        {isObjective && q.options && (
                          <div
                            style={{
                              background: 'rgba(34, 197, 94, 0.05)',
                              border: '1px solid rgba(34, 197, 94, 0.2)',
                              borderRadius: 'var(--radius-sm)',
                              padding: '10px 12px',
                              fontSize: '0.8rem',
                              marginBottom: '8px',
                            }}
                          >
                            <span style={{ fontWeight: 600, color: 'var(--success)' }}>Correct Answer Key: </span>
                            {q.options.filter((o: any) => o.isCorrect).map((o: any) => o.text).join('; ') || q.correctAnswerText || 'Marked by criteria'}
                          </div>
                        )}

                        {/* Feedback / AI Notes */}
                        {(ans?.feedback || ans?.aiNotes) && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontWeight: 600 }}>Evaluation Notes:</span> {ans.feedback || ans.aiNotes}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  (attempt.answers || []).map((ans, idx) => (
                    <div
                      key={ans.questionId || idx}
                      style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        padding: '16px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span className="badge badge-neutral text-xs">Question #{idx + 1}</span>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                          {ans.points !== undefined ? ans.points : '—'} / {ans.maxPoints || 10} pts
                        </div>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', padding: '10px', background: 'var(--bg-input)', borderRadius: '4px' }}>
                        <strong>Student Response: </strong> {ans.answer || '— No answer provided —'}
                      </div>
                      {ans.feedback && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
                          <strong>Notes: </strong> {ans.feedback}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Rubric Matrix Scoring */}
          {activeModalTab === 'rubric' && rubricCriteria.length > 0 && (
            <div>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={18} /> Rubric-Based Scoring Matrix
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {rubricCriteria.map((c: any) => {
                  const currentCriterionScore = rubricScores[c.id] || 0;
                  const levels = c.levels || [
                    { points: Math.round(c.maxPoints * 0.25), label: 'Developing' },
                    { points: Math.round(c.maxPoints * 0.5), label: 'Proficient' },
                    { points: Math.round(c.maxPoints * 0.75), label: 'Advanced' },
                    { points: c.maxPoints, label: 'Exemplary' },
                  ];

                  return (
                    <div
                      key={c.id}
                      style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        padding: '14px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <div>
                          <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{c.name || c.title}</span>
                          <span className="text-muted text-xs" style={{ marginLeft: '8px' }}>
                            (Max {c.maxPoints || 25} pts)
                          </span>
                        </div>
                        <span className="badge badge-primary">
                          Assigned: {currentCriterionScore} pts
                        </span>
                      </div>
                      <p className="text-muted text-xs" style={{ margin: '0 0 10px 0' }}>{c.description}</p>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
                        {levels.map((lvl: any) => {
                          const isSelected = currentCriterionScore === lvl.points;

                          return (
                            <div
                              key={lvl.points}
                              onClick={() => handleLevelSelect(c.id, lvl.points)}
                              style={{
                                background: isSelected ? 'rgba(99, 102, 241, 0.12)' : 'var(--bg-input)',
                                border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                                borderRadius: 'var(--radius-sm)',
                                padding: '8px 10px',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <div style={{ fontWeight: 700, fontSize: '0.8rem', color: isSelected ? 'var(--primary)' : 'var(--text-main)' }}>
                                {lvl.name || lvl.label} ({lvl.points} pts)
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: Audit Trail & Grading History */}
          {activeModalTab === 'history' && (
            <div>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <History size={18} /> Grading & Evaluation Audit History
              </h4>

              {taskAuditHistory.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)' }}>
                  <Clock size={24} style={{ color: 'var(--text-muted)', margin: '0 auto 8px' }} />
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>No Modification Records Logged Yet</div>
                  <div className="text-muted text-xs" style={{ marginTop: '4px' }}>
                    Any human grade approval, score override, or rejection will record an immutable audit entry in PostgreSQL.
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {taskAuditHistory.map((log) => (
                    <div
                      key={log.id}
                      style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '12px 16px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span className="badge badge-primary text-xs" style={{ textTransform: 'uppercase' }}>
                          {log.action.replace('_', ' ')}
                        </span>
                        <span className="text-muted text-xs">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginTop: '4px' }}>
                        {log.changeSummary}
                      </div>
                      <div className="text-muted text-xs" style={{ marginTop: '2px' }}>
                        Evaluator / Actor: <strong>{log.actorName}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Grader Form: Overall Score, Learner Feedback & Notes */}
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '18px',
            }}
          >
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 14px 0' }}>
              Final Evaluator Assessment & Grading Controls
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '16px', marginBottom: '14px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Total Score (/{attempt.totalMarks})</label>
                <input
                  type="number"
                  min="0"
                  max={attempt.totalMarks}
                  className="form-input"
                  value={score}
                  onChange={(e) => setScore(Math.min(attempt.totalMarks, Math.max(0, parseInt(e.target.value) || 0)))}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Learner-Visible Feedback & Remarks</label>
                <textarea
                  rows={2}
                  className="form-textarea"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Provide constructive feedback visible on student portal..."
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label" style={{ fontWeight: 600 }}>Internal Grader & Moderator Notes (Private)</label>
              <input
                type="text"
                className="form-input"
                value={privateNotes}
                onChange={(e) => setPrivateNotes(e.target.value)}
                placeholder="Internal audit notes, rubric checks, or discrepancy comments..."
              />
            </div>

            <div className="text-muted text-xs" style={{ marginTop: '8px' }}>
              Final grade approval will publish marks and feedback to the student portal and unlock credential evaluations.
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div
          className="modal-footer"
          style={{
            padding: '14px 24px',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-card)',
          }}
        >
          <div className="text-muted text-xs">
            {isFaculty ? 'Faculty Role: Authorized Course Scope' : 'Institution Admin Evaluation View'}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button className="btn btn-secondary" onClick={handleSaveDraft} disabled={isSubmitting}>
              Save Draft
            </button>
            <button
              className="btn btn-primary"
              onClick={handleFinalSubmit}
              disabled={isSubmitting}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <CheckCircle2 size={16} /> Confirm & Approve Final Grade
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
