import React, { useState } from 'react';
import { mockAssessments, mockCourses } from '../../data/mockData';
import { Assessment } from '../../types';
import { Link, useNavigate } from 'react-router-dom';
import {
  ClipboardCheck, Plus, Clock, Award, Shield, Eye,
  Play, CheckCircle2, X, AlertTriangle, Sparkles, HelpCircle
} from 'lucide-react';

export const AssessmentsPage: React.FC = () => {
  const [assessments, setAssessments] = useState<Assessment[]>(mockAssessments);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();

  // New assessment form states
  const [title, setTitle] = useState('');
  const [courseId, setCourseId] = useState('c-001');
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [totalMarks, setTotalMarks] = useState(100);
  const [passingMarks, setPassingMarks] = useState(70);
  const [maxAttempts, setMaxAttempts] = useState(2);
  const [proctoringRequired, setProctoringRequired] = useState(true);
  const [aiScoringEnabled, setAiScoringEnabled] = useState(true);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const newAss: Assessment = {
      id: `ass-${Date.now()}`,
      title,
      courseId,
      totalMarks,
      passingMarks,
      durationMinutes,
      maxAttempts,
      proctoringRequired,
      aiGradingEnabled: aiScoringEnabled,
      questionIds: ['q-101', 'q-102'],
      status: 'published',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setAssessments([newAss, ...assessments]);
    setIsModalOpen(false);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '4px' }}>Assessments & Timed Examinations</h1>
          <p className="text-secondary text-sm">Configured quizzes, high-stakes proctored exams, rubrics, and release policies</p>
        </div>

        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={16} /> Create Assessment
        </button>
      </div>

      <div className="grid-3">
        {assessments.map((a) => {
          const course = mockCourses.find((c) => c.id === a.courseId);

          return (
            <div
              key={a.id}
              className="card"
              style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span className={`badge badge-${a.status}`}>{a.status}</span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {a.proctoringRequired && (
                      <span className="badge badge-warning" title="Webcam & Tab Monitoring Enabled">
                        <Shield size={11} /> Proctored
                      </span>
                    )}
                    {a.aiGradingEnabled && (
                      <span className="badge badge-primary" title="AI Preliminary Grading Enabled">
                        <Sparkles size={11} /> AI Scored
                      </span>
                    )}
                  </div>
                </div>

                <h3 style={{ fontSize: '1.15rem', marginBottom: '6px' }}>{a.title}</h3>
                <p className="text-muted text-xs" style={{ marginBottom: '16px' }}>
                  Linked to: {course ? course.title : 'Full Program'}
                </p>

                <div style={{
                  background: 'var(--bg-input)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '10px',
                  fontSize: '0.8rem',
                  marginBottom: '16px'
                }}>
                  <div>
                    <span className="text-muted text-xs">Duration:</span>
                    <div style={{ fontWeight: 600 }}>{a.durationMinutes} Minutes</div>
                  </div>
                  <div>
                    <span className="text-muted text-xs">Total Marks:</span>
                    <div style={{ fontWeight: 600 }}>{a.totalMarks} Points</div>
                  </div>
                  <div>
                    <span className="text-muted text-xs">Passing Score:</span>
                    <div style={{ fontWeight: 600, color: 'var(--success)' }}>
                      {a.passingMarks || a.passmark || 70} pts ({Math.round(((a.passingMarks || a.passmark || 70) / a.totalMarks) * 100)}%)
                    </div>
                  </div>
                  <div>
                    <span className="text-muted text-xs">Allowed Attempts:</span>
                    <div style={{ fontWeight: 600 }}>{a.maxAttempts}</div>
                  </div>
                </div>
              </div>

              <div>
                <Link
                  to={`/exam/${a.id}`}
                  className="btn btn-primary"
                  style={{ width: '100%', gap: '8px' }}
                >
                  <Play size={15} /> Launch Student Exam Engine
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Assessment Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Configure New Assessment</h3>
              <button onClick={() => setIsModalOpen(false)} style={{ color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Assessment Title <span className="required">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Distributed Systems Final Evaluation"
                    className="form-input"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Linked Course</label>
                  <select className="form-select" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
                    {mockCourses.map((c) => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Duration (Mins)</label>
                    <input
                      type="number"
                      min="5"
                      className="form-input"
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 30)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Total Marks</label>
                    <input
                      type="number"
                      min="10"
                      className="form-input"
                      value={totalMarks}
                      onChange={(e) => setTotalMarks(parseInt(e.target.value) || 100)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Pass Marks</label>
                    <input
                      type="number"
                      min="1"
                      className="form-input"
                      value={passingMarks}
                      onChange={(e) => setPassingMarks(parseInt(e.target.value) || 70)}
                    />
                  </div>
                </div>

                <div style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={proctoringRequired}
                      onChange={(e) => setProctoringRequired(e.target.checked)}
                      style={{ accentColor: 'var(--primary)' }}
                    />
                    <div>
                      <div style={{ fontWeight: 600 }}>Enable Automated Proctoring Protocol</div>
                      <div className="text-muted text-xs">Enforces webcam permissions, tab focus monitoring, and incident timeline logging</div>
                    </div>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={aiScoringEnabled}
                      onChange={(e) => setAiScoringEnabled(e.target.checked)}
                      style={{ accentColor: 'var(--primary)' }}
                    />
                    <div>
                      <div style={{ fontWeight: 600 }}>Enable BOT / AI Evaluation Assistance</div>
                      <div className="text-muted text-xs">Generates preliminary rubric score recommendations for human reviewer sign-off</div>
                    </div>
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Publish Assessment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
