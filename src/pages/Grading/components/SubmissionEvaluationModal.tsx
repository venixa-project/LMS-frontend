import React, { useState, useEffect } from 'react';
import { AssessmentAttempt, Rubric } from '../../../types';
import { mockRubrics, mockQuestions } from '../../../data/mockData';
import { useGradingStore } from '../../../lib/gradingStore';
import {
  X, Check, Sparkles, CheckCircle2, Clock, AlertTriangle,
  Award, ShieldAlert, ArrowRight, BookOpen, Layers
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
  const { acceptAiScore, overrideScore, saveDraftGrade } = useGradingStore();

  const rubric: Rubric = mockRubrics[0];
  const [score, setScore] = useState<number>(attempt.score || attempt.aiSuggestion?.score || 80);
  const [feedback, setFeedback] = useState<string>(
    attempt.feedback ||
    attempt.aiSuggestion?.feedback ||
    'Solid structural breakdown with accurate technical implementation. Demonstrated clear understanding of required architectural patterns.'
  );
  const [privateNotes, setPrivateNotes] = useState<string>(
    attempt.privateNotes || 'Checked against course rubric guidelines. Verified code syntax and pattern consistency.'
  );
  const [notice, setNotice] = useState<string | null>(null);

  // Rubric score state
  const [rubricScores, setRubricScores] = useState<Record<string, number>>(
    attempt.rubricScores ||
    attempt.aiSuggestion?.rubricScores || {
      'rc-1': 28,
      'rc-2': 23,
      'rc-3': 22,
      'rc-4': 15,
    }
  );

  useEffect(() => {
    if (attempt.score !== undefined) {
      setScore(attempt.score);
    } else if (attempt.aiSuggestion?.score) {
      setScore(attempt.aiSuggestion.score);
    }
  }, [attempt]);

  const showNotification = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3000);
  };

  const handleLevelSelect = (critId: string, pts: number) => {
    const updated = { ...rubricScores, [critId]: pts };
    setRubricScores(updated);
    const sum = Object.values(updated).reduce((acc, curr) => acc + curr, 0);
    setScore(sum);
  };

  const handleAcceptAI = () => {
    acceptAiScore(attempt.id, feedback);
    showNotification('AI score recommendation verified and accepted! Grade released.');
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const handleSaveDraft = () => {
    saveDraftGrade(attempt.id, {
      score,
      feedback,
      rubricScores,
      privateNotes,
    });
    showNotification('Grading progress saved as draft.');
  };

  const handleFinalSubmit = () => {
    overrideScore(attempt.id, {
      score,
      feedback,
      rubricScores,
      privateNotes,
      requestModeration: false,
    });
    showNotification('Final grade confirmed, approved, and released to student portal!');
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const isPublished = attempt.evaluationStatus === 'published' || attempt.status === 'results_released';

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        className="modal-card"
        style={{ maxWidth: '960px', width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
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
              {attempt.learnerName.charAt(0)}
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
                {attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleString() : 'Recent'} &bull; Duration:{' '}
                {attempt.timeSpent ? `${attempt.timeSpent} mins` : '—'}
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
                    ({Math.round((score / attempt.totalMarks) * 100)}%)
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
                  <span className="text-muted"> ({attempt.aiSuggestion.model})</span>
                </div>
              </div>
            )}
          </div>

          {/* AI Score Suggestion Card if available */}
          {attempt.aiSuggestion ? (
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(168, 85, 247, 0.05))',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
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
                  Preliminary score generated from configured rubrics. Final grade approval remains with the human trainer.
                </div>
                {!isPublished && (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={handleAcceptAI}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Check size={14} /> Accept AI Score ({attempt.aiSuggestion.score} pts)
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div
              style={{
                background: 'rgba(234, 179, 8, 0.08)',
                border: '1px solid rgba(234, 179, 8, 0.35)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}
            >
              <AlertTriangle size={22} color="var(--warning)" style={{ flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                  AI Review Required &bull; Unsupported Response Type
                </div>
                <div className="text-secondary text-xs" style={{ marginTop: '2px' }}>
                  This assessment format cannot be evaluated by automated AI scoring. Please review student answers manually and confirm the final grade.
                </div>
              </div>
            </div>
          )}

          {/* Question Breakdown Section */}
          <div>
            <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BookOpen size={18} /> Student Submission & Answer Analysis
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {attempt.answers.map((ans, idx) => {
                const questionData = mockQuestions.find((q) => q.id === ans.questionId);
                const isObjective = questionData?.type !== 'essay';

                return (
                  <div
                    key={ans.questionId || idx}
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
                          {questionData?.type.replace('_', ' ') || 'Question'}
                        </span>
                        {ans.isCorrect !== undefined && (
                          <span className={`badge ${ans.isCorrect ? 'badge-completed' : 'badge-failed'} text-xs`}>
                            {ans.isCorrect ? 'Correct' : 'Partial / Incorrect'}
                          </span>
                        )}
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                        {ans.points !== undefined ? ans.points : '—'} / {ans.maxPoints || questionData?.points || 10} pts
                      </div>
                    </div>

                    {/* Question Prompt */}
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '10px' }}>
                      {questionData?.prompt || 'Assessment Question Prompt'}
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
                        {ans.answer || '— No response provided —'}
                      </div>
                    </div>

                    {/* Instructor View: Correct Answer Key (when permitted) */}
                    {isObjective && (questionData?.options || questionData?.correctAnswer) && (
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
                        {questionData.correctAnswer ||
                          questionData.options?.filter((o) => o.isCorrect).map((o) => o.text).join('; ')}
                      </div>
                    )}

                    {/* Feedback / AI Notes */}
                    {(ans.feedback || ans.aiNotes) && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 600 }}>Evaluation Notes:</span> {ans.feedback || ans.aiNotes}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Rubric Matrix Scoring for Subjective Submissions */}
          {rubric && (
            <div>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={18} /> Rubric-Based Scoring ({rubric.name})
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {rubric.criteria.map((c) => {
                  const currentCriterionScore = rubricScores[c.id] || 0;

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
                            ({c.weight}% Weight &bull; Max {c.maxPoints || 25} pts)
                          </span>
                        </div>
                        <span className="badge badge-primary">
                          Assigned: {currentCriterionScore} pts
                        </span>
                      </div>
                      <p className="text-muted text-xs" style={{ margin: '0 0 10px 0' }}>{c.description}</p>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
                        {c.levels.map((lvl) => {
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
                              <div className="text-muted text-xs" style={{ marginTop: '2px', lineHeight: 1.3 }}>
                                {lvl.descriptor || lvl.description}
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
            <button className="btn btn-secondary" onClick={handleSaveDraft}>
              Save Draft
            </button>
            <button
              className="btn btn-primary"
              onClick={handleFinalSubmit}
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
