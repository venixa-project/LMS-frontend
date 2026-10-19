import React, { useState } from 'react';
import { useAuthStore } from '../../lib/store';
import { mockGradingTasks, mockRubrics } from '../../data/mockData';
import { GradingTask, Rubric } from '../../types';
import {
  PenTool, CheckCircle2, Clock, Sparkles, AlertTriangle, Eye,
  Save, ArrowRight, X, ShieldAlert, Award, Check, RefreshCw
} from 'lucide-react';

export const GradingPage: React.FC = () => {
  const { user } = useAuthStore();
  const isFaculty = user?.activeRole === 'trainer' || user?.activeRole === 'instructor' || user?.activeRole === 'grader';
  const [tasks, setTasks] = useState<GradingTask[]>(mockGradingTasks);
  const [selectedTask, setSelectedTask] = useState<GradingTask | null>(null);
  const [activeTab, setActiveTab] = useState<'queue' | 'ai_review' | 'moderation'>('queue');
  const [notice, setNotice] = useState<string | null>(null);

  const showNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3500);
  };

  // Grading form state
  const [score, setScore] = useState<number>(85);
  const [feedback, setFeedback] = useState<string>('Comprehensive analysis with accurate architecture diagrams. Minor improvements needed in error handling.');
  const [graderNotes, setGraderNotes] = useState<string>('Double-checked criterion #2 against rubric.');
  const [requestModeration, setRequestModeration] = useState(false);

  const rubric = mockRubrics[0];

  const handleOpenGrade = (task: GradingTask) => {
    setSelectedTask(task);
    setScore(task.aiPreliminaryScore || 80);
    setRequestModeration(task.status === 'moderation');
  };

  const handleSaveGrade = (isDraft: boolean) => {
    if (!selectedTask) return;
    setTasks(tasks.map((t) => t.id === selectedTask.id ? {
      ...t,
      score,
      feedback,
      status: isDraft ? 'draft_graded' : requestModeration ? 'moderation' : 'completed'
    } : t));
    setSelectedTask(null);
    showNotice(isDraft ? 'Grade draft saved successfully.' : 'Grade and rubric feedback released to student portal (active session)!');
  };

  const handleAcceptAiScore = (task: GradingTask) => {
    setTasks(tasks.map((t) => t.id === task.id ? {
      ...t,
      score: task.aiPreliminaryScore || task.maxScore,
      status: 'completed',
      feedback: 'Accepted AI suggested score following human rubric verification.'
    } : t));
    showNotice('AI suggested score verified and accepted.');
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="badge badge-primary">{isFaculty ? 'Faculty Evaluation Scope' : 'Academic Evaluation'}</span>
            <span className="text-muted text-xs">Acme Learning Corp &bull; AY 2026–2027</span>
            {isFaculty && <span className="badge badge-draft">Dr. James Wilson</span>}
          </div>
          <h1 style={{ fontSize: '1.75rem', margin: 0 }}>
            {isFaculty ? 'Student Submissions & Evaluation Queue' : 'Human Grading, Moderation & AI Review'}
          </h1>
          <p className="text-secondary text-sm">
            {isFaculty
              ? 'Evaluate student homework, review AI rubric suggestions, and publish grades for your assigned courses'
              : 'Subjective essay assessment, rubric scoring, double-marking, and AI-assisted preliminary evaluation'}
          </p>
        </div>

        <span className="badge badge-primary">SLA Turnaround: 24h</span>
      </div>

      {notice && (
        <div style={{
          background: 'var(--success-bg)',
          border: '1px solid var(--success-border)',
          color: 'var(--success)',
          padding: '10px 16px',
          borderRadius: 'var(--radius-md)',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.85rem'
        }}>
          <CheckCircle2 size={16} />
          <span>{notice}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs-nav">
        <button
          className={`tab-btn ${activeTab === 'queue' ? 'active' : ''}`}
          onClick={() => setActiveTab('queue')}
        >
          <PenTool size={16} />
          Evaluation Queue ({tasks.filter((t) => t.status !== 'completed').length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'ai_review' ? 'active' : ''}`}
          onClick={() => setActiveTab('ai_review')}
        >
          <Sparkles size={16} />
          AI Score Suggestions ({tasks.filter((t) => t.aiPreliminaryScore !== undefined).length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'moderation' ? 'active' : ''}`}
          onClick={() => setActiveTab('moderation')}
        >
          <ShieldAlert size={16} />
          Second Marking & Moderation ({tasks.filter((t) => t.status === 'moderation').length})
        </button>
      </div>

      {/* Queue View */}
      {activeTab === 'queue' && (
        <div className="card">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Assessment</th>
                  <th>Submitted Date</th>
                  <th>AI Preliminary Score</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{t.learnerName}</div>
                      <div className="text-muted text-xs">ID: {t.submissionId}</div>
                    </td>
                    <td>{t.submittedAt ? new Date(t.submittedAt).toLocaleDateString() : 'Recent'}</td>
                    <td>
                      {t.aiPreliminaryScore !== undefined || t.aiSuggestion ? (
                        <span className="badge badge-info" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Sparkles size={12} /> {t.aiPreliminaryScore || t.aiSuggestion?.score} / {t.maxScore || t.totalMarks} (92% Conf.)
                        </span>
                      ) : (
                        <span className="text-muted text-xs">Human-led Only</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge badge-${t.status}`}>
                        {t.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleOpenGrade(t)}
                      >
                        {t.status === 'completed' ? 'Review Grade' : 'Grade Submission'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* AI Review View */}
      {activeTab === 'ai_review' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(139, 92, 246, 0.12))',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Sparkles size={24} color="var(--primary)" />
              <div>
                <h3 style={{ fontSize: '1rem', margin: 0 }}>BOT / AI Evaluator: Acuity-LLM v2</h3>
                <p className="text-muted text-xs">AI suggestions require verified human evaluator sign-off before grades release to learners per PRD 5.10.</p>
              </div>
            </div>
          </div>

          <div className="grid-2">
            {tasks.filter((t) => t.aiPreliminaryScore !== undefined).map((t) => (
              <div key={t.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span className="badge badge-primary">Model: Claude-3.5-LMS</span>
                  <span className="text-muted text-xs">Generated: 1 hour ago</span>
                </div>

                <h3 style={{ fontSize: '1.1rem', marginBottom: '4px' }}>{t.learnerName}</h3>
                <p className="text-secondary text-sm" style={{ marginBottom: '12px' }}>
                  {t.assessmentTitle}
                </p>

                <div style={{
                  background: 'var(--bg-input)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px',
                  marginBottom: '16px',
                  fontSize: '0.85rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span className="text-muted text-xs">AI Score Recommendation:</span>
                    <strong style={{ color: 'var(--primary)', fontSize: '1rem' }}>{t.aiPreliminaryScore} / {t.maxScore}</strong>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Justification: Learner demonstrates thorough comprehension of microservices patterns with accurate API definitions. Deducted 5 points for omitting TLS certificate rotation.
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ flex: 1 }}
                    onClick={() => handleAcceptAiScore(t)}
                  >
                    <Check size={14} /> Accept AI Score
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleOpenGrade(t)}
                  >
                    Edit / Override
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Moderation View */}
      {activeTab === 'moderation' && (
        <div className="card">
          <h3 style={{ fontSize: '1.1rem', marginBottom: '14px' }}>Discrepancy & Moderation Review</h3>
          <p className="text-secondary text-sm" style={{ marginBottom: '16px' }}>
            Flagged submissions where primary grader and secondary marker scores diverged by &gt; 15%.
          </p>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Learner</th>
                  <th>Assessment</th>
                  <th>First Marker</th>
                  <th>Second Marker</th>
                  <th>Discrepancy</th>
                  <th>Moderator Action</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ fontWeight: 600 }}>Kwame Mensah</td>
                  <td>System Architecture Case Study</td>
                  <td>68 / 100 (Grader A)</td>
                  <td>86 / 100 (Grader B)</td>
                  <td><span className="badge badge-failed">+18 pts (Discrepancy)</span></td>
                  <td>
                    <button className="btn btn-primary btn-sm" onClick={() => alert("Opening double marking reconciliation panel")}>
                      Finalize Moderate Score
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Grade Submission Drawer / Modal */}
      {selectedTask && (
        <div className="modal-overlay" onClick={() => setSelectedTask(null)}>
          <div className="modal-card" style={{ maxWidth: '840px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: '1.15rem', margin: 0 }}>Grading: {selectedTask.learnerName}</h3>
                <p className="text-muted text-xs">{selectedTask.assessmentTitle}</p>
              </div>
              <button onClick={() => setSelectedTask(null)} style={{ color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body" style={{ maxHeight: '68vh', overflowY: 'auto' }}>
              {/* Student Response Mock */}
              <div style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                marginBottom: '20px'
              }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Student Submitted Essay Response
                </div>
                <p style={{ fontSize: '0.875rem', lineHeight: 1.6, color: 'var(--text-main)' }}>
                  In microservices architecture, breaking monolithic shared databases is paramount. We implemented an asynchronous transactional outbox pattern using Apache Kafka to decouple order processing from notification dispatchers. Each domain service publishes state events through a dedicated Debezium change-data-capture feed, ensuring at-least-once delivery semantics without distributed 2PC locks.
                </p>
              </div>

              {/* Rubric Matrix */}
              <h4 style={{ fontSize: '1rem', marginBottom: '12px' }}>Evaluation Rubric: {rubric.title}</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                {rubric.criteria.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '14px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{c.title}</span>
                      <span className="badge badge-primary">{c.weight}% Weight &bull; Max {c.maxPoints} pts</span>
                    </div>
                    <p className="text-muted text-xs" style={{ marginBottom: '10px' }}>{c.description}</p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                      {c.levels.map((lvl) => (
                        <div
                          key={lvl.points}
                          style={{
                            background: 'var(--bg-input)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '8px 10px',
                            cursor: 'pointer'
                          }}
                        >
                          <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--primary)' }}>
                            {lvl.name} ({lvl.points} pts)
                          </div>
                          <div className="text-muted text-xs">{lvl.descriptor}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Score Input & Feedback */}
              <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Total Score (/100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="form-input"
                    value={score}
                    onChange={(e) => setScore(parseInt(e.target.value) || 0)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Learner-Visible Feedback</label>
                  <textarea
                    rows={2}
                    className="form-textarea"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Private Grader Notes (Internal)</label>
                <input
                  type="text"
                  className="form-input"
                  value={graderNotes}
                  onChange={(e) => setGraderNotes(e.target.value)}
                />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.825rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={requestModeration}
                  onChange={(e) => setRequestModeration(e.target.checked)}
                  style={{ accentColor: 'var(--primary)' }}
                />
                <span>Request Double Marking / Second Evaluator Moderation</span>
              </label>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => handleSaveGrade(true)}>
                Save as Draft
              </button>
              <button className="btn btn-primary" onClick={() => handleSaveGrade(false)}>
                Submit Final Score & Release
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
