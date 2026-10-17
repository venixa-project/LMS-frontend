import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../lib/store';
import { mockCourses } from '../../data/mockData';
import { Course, CourseModule, Lesson } from '../../types';
import {
  BookOpen, Plus, Trash2, ArrowLeft, ArrowRight, Save, CheckCircle2,
  Video, FileText, HelpCircle, Link as LinkIcon, MoveUp, MoveDown,
  Eye, Check, AlertCircle, Sparkles, Send
} from 'lucide-react';

export const CourseBuilderPage: React.FC = () => {
  const { user } = useAuthStore();
  const isFaculty = user?.activeRole === 'instructor';
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Course metadata
  const [title, setTitle] = useState('Advanced Microservices Architecture');
  const [description, setDescription] = useState('Design robust distributed architectures using event-driven communication and Docker/K8s.');
  const [category, setCategory] = useState('Backend Development');
  const [durationHours, setDurationHours] = useState(24);
  const [completionPolicy, setCompletionPolicy] = useState('all_lessons_and_passing_assessment');

  // Modules & lessons
  const [modules, setModules] = useState<CourseModule[]>([
    {
      id: 'mod-1',
      title: 'Module 1: Domain-Driven Design Fundamentals',
      order: 1,
      lessons: [
        { id: 'les-1', title: '1.1 Strategic Design & Bounded Contexts', type: 'video', durationMinutes: 20, isCompleted: false, order: 1, contentUrl: 'https://demo.video/1' },
        { id: 'les-2', title: '1.2 Aggregates & Domain Events', type: 'document', durationMinutes: 15, isCompleted: false, order: 2 }
      ]
    },
    {
      id: 'mod-2',
      title: 'Module 2: Event-Driven Communication with Kafka',
      order: 2,
      lessons: [
        { id: 'les-3', title: '2.1 Kafka Broker Architecture', type: 'video', durationMinutes: 30, isCompleted: false, order: 1 },
        { id: 'les-4', title: '2.2 Microservices Quiz Checkpoint', type: 'quiz', durationMinutes: 15, isCompleted: false, order: 2 }
      ]
    }
  ]);

  const [activeModuleIndex, setActiveModuleIndex] = useState(0);
  const [publishStatus, setPublishStatus] = useState<'draft' | 'in_review' | 'published'>('draft');

  // Handlers for modules
  const handleAddModule = () => {
    const newMod: CourseModule = {
      id: `mod-${Date.now()}`,
      title: `Module ${modules.length + 1}: New Topic`,
      order: modules.length + 1,
      lessons: []
    };
    setModules([...modules, newMod]);
    setActiveModuleIndex(modules.length);
  };

  const handleAddLesson = (modIndex: number, type: 'video' | 'document' | 'quiz') => {
    const targetMod = modules[modIndex];
    const newLesson: Lesson = {
      id: `les-${Date.now()}`,
      title: `Lesson ${targetMod.lessons.length + 1}: New ${type}`,
      type,
      durationMinutes: 15,
      isCompleted: false,
      order: targetMod.lessons.length + 1
    };
    const updatedModules = [...modules];
    updatedModules[modIndex].lessons.push(newLesson);
    setModules(updatedModules);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <button
          onClick={() => navigate('/courses')}
          className="btn btn-secondary btn-sm"
          style={{ gap: '6px' }}
        >
          <ArrowLeft size={14} /> Back to Courses
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="badge badge-warning">Lifecycle: {publishStatus} (v1.0)</span>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => alert("Draft autosaved to local session.")}
          >
            <Save size={14} /> Save Draft
          </button>
        </div>
      </div>

      {/* Stepper Navigation */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        padding: '12px 24px',
        marginBottom: '24px'
      }}>
        {[
          { stepNum: 1, title: '1. Basic Information' },
          { stepNum: 2, title: '2. Curriculum & Lessons' },
          { stepNum: 3, title: '3. Learner Experience Preview' },
          { stepNum: 4, title: '4. Publish & Governance' },
        ].map((s) => (
          <button
            key={s.stepNum}
            onClick={() => setStep(s.stepNum as any)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 600,
              fontSize: '0.85rem',
              color: step === s.stepNum ? 'var(--primary)' : 'var(--text-muted)',
              cursor: 'pointer'
            }}
          >
            <span style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: step === s.stepNum ? 'var(--primary)' : 'var(--bg-input)',
              color: step === s.stepNum ? '#fff' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              fontWeight: 700
            }}>
              {s.stepNum}
            </span>
            <span>{s.title}</span>
          </button>
        ))}
      </div>

      {/* STEP 1: Basic Information */}
      {step === 1 && (
        <div className="card">
          <h2 style={{ fontSize: '1.25rem', marginBottom: '16px' }}>Course Basic Information & Access Rules</h2>

          <div className="form-group">
            <label className="form-label">Course Title <span className="required">*</span></label>
            <input
              type="text"
              className="form-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Short Summary & Objectives <span className="required">*</span></label>
            <textarea
              className="form-textarea"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Category / Domain</label>
              <select className="form-select" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="Frontend Development">Frontend Development</option>
                <option value="Backend Development">Backend Development</option>
                <option value="Data Science & ML">Data Science & ML</option>
                <option value="DevOps & Cloud">DevOps & Cloud</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Estimated Duration (Hours)</label>
              <input
                type="number"
                min="1"
                className="form-input"
                value={durationHours}
                onChange={(e) => setDurationHours(parseInt(e.target.value) || 1)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Completion & Certification Policy</label>
            <select
              className="form-select"
              value={completionPolicy}
              onChange={(e) => setCompletionPolicy(e.target.value)}
            >
              <option value="all_lessons_and_passing_assessment">Require 100% lesson completion and passing assessment score</option>
              <option value="lessons_only">Require all lessons viewed/completed only</option>
              <option value="passing_assessment_only">Pass final assessment only</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
            <button className="btn btn-primary" onClick={() => setStep(2)}>
              Next: Curriculum Builder <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Curriculum Builder */}
      {step === 2 && (
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px' }}>
          {/* Modules List */}
          <div className="card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '1rem', margin: 0 }}>Modules ({modules.length})</h3>
              <button className="btn btn-secondary btn-sm" onClick={handleAddModule}>
                <Plus size={14} /> Add
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {modules.map((m, idx) => (
                <div
                  key={m.id}
                  onClick={() => setActiveModuleIndex(idx)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    background: activeModuleIndex === idx ? 'var(--primary-light)' : 'var(--bg-input)',
                    border: activeModuleIndex === idx ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{m.title}</div>
                  <div className="text-muted text-xs">{m.lessons.length} lessons</div>
                </div>
              ))}
            </div>
          </div>

          {/* Active Module Lesson Editor */}
          <div className="card">
            {modules[activeModuleIndex] && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', margin: 0 }}>{modules[activeModuleIndex].title}</h3>
                    <p className="text-muted text-xs">Organize lessons, video lectures, and knowledge checks</p>
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => handleAddLesson(activeModuleIndex, 'video')}>
                      <Video size={13} /> + Video
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => handleAddLesson(activeModuleIndex, 'document')}>
                      <FileText size={13} /> + Document
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => handleAddLesson(activeModuleIndex, 'quiz')}>
                      <HelpCircle size={13} /> + Quiz
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {modules[activeModuleIndex].lessons.map((lesson, lIdx) => (
                    <div
                      key={lesson.id}
                      style={{
                        padding: '12px 16px',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--bg-input)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {lesson.type === 'video' && <Video size={16} color="var(--primary)" />}
                        {lesson.type === 'document' && <FileText size={16} color="var(--accent-cyan)" />}
                        {lesson.type === 'quiz' && <HelpCircle size={16} color="var(--warning)" />}
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{lesson.title}</div>
                          <div className="text-muted text-xs">
                            {lesson.durationMinutes} mins &bull; Format: {lesson.type}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="badge badge-active">Accessibility Checked</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
              <button className="btn btn-secondary" onClick={() => setStep(1)}>
                <ArrowLeft size={16} /> Back
              </button>
              <button className="btn btn-primary" onClick={() => setStep(3)}>
                Next: Learner Preview <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: Learner Preview */}
      {step === 3 && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Learner Experience Preview</h2>
              <p className="text-secondary text-sm">Preview how enrolled students will experience this course structure</p>
            </div>
            <span className="badge badge-primary">Preview Mode</span>
          </div>

          <div style={{
            border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            background: 'var(--bg-surface)'
          }}>
            <div style={{
              padding: '24px',
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.2))',
              borderBottom: '1px solid var(--border-subtle)'
            }}>
              <span className="badge badge-primary" style={{ marginBottom: '8px' }}>{category}</span>
              <h1 style={{ fontSize: '1.6rem', marginBottom: '8px' }}>{title}</h1>
              <p className="text-secondary text-sm" style={{ maxWidth: '720px' }}>{description}</p>
              <div style={{ display: 'flex', gap: '16px', marginTop: '16px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <span>⏱ {durationHours} Hours to Complete</span>
                <span>📚 {modules.length} Modules</span>
                <span>🎓 Certificate of Completion Eligible</span>
              </div>
            </div>

            <div style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '14px' }}>Course Syllabus</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {modules.map((m) => (
                  <div key={m.id} style={{ background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', padding: '14px' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '8px' }}>{m.title}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {m.lessons.map((l) => (
                        <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                          <CheckCircle2 size={14} color="var(--primary)" />
                          <span>{l.title} ({l.durationMinutes} min)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
            <button className="btn btn-secondary" onClick={() => setStep(2)}>
              <ArrowLeft size={16} /> Back
            </button>
            <button className="btn btn-primary" onClick={() => setStep(4)}>
              Next: Publishing & Governance <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Publish & Governance */}
      {step === 4 && (
        <div className="card" style={{ maxWidth: '680px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'var(--success-bg)',
              color: 'var(--success)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <CheckCircle2 size={36} />
            </div>
            <h2 style={{ fontSize: '1.4rem', marginBottom: '8px' }}>Ready for Publishing</h2>
            <p className="text-secondary text-sm">
              All accessibility checks passed. Select lifecycle status to make available to learners.
            </p>
          </div>

          {isFaculty ? (
            <div style={{
              background: 'rgba(59, 130, 246, 0.08)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 16px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontSize: '0.85rem'
            }}>
              <Send size={18} style={{ color: 'var(--primary)', flexShrink: 0 }} />
              <div>
                <strong>Faculty Publishing Workflow:</strong> New courses and curriculum modules are submitted to the Institution Administrator for catalog review and publication approval.
              </div>
            </div>
          ) : null}

          <div style={{
            background: 'var(--bg-input)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            marginBottom: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            {!isFaculty && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="lifecycle"
                  checked={publishStatus === 'published'}
                  onChange={() => setPublishStatus('published')}
                  style={{ accentColor: 'var(--primary)' }}
                />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Publish Immediately (v1.0)</div>
                  <div className="text-muted text-xs">Visible to all enrolled learners in target cohorts</div>
                </div>
              </label>
            )}

            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input
                type="radio"
                name="lifecycle"
                checked={publishStatus === 'in_review'}
                onChange={() => setPublishStatus('in_review')}
                style={{ accentColor: 'var(--primary)' }}
              />
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                  {isFaculty ? 'Submit for Institution Admin Review & Approval' : 'Submit for Peer / LMS Admin Review'}
                </div>
                <div className="text-muted text-xs">
                  {isFaculty ? 'Sends notification to the Acme Learning Corp academic approval queue' : 'Sends notification to LMS Curriculum approval queue'}
                </div>
              </div>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input
                type="radio"
                name="lifecycle"
                checked={publishStatus === 'draft'}
                onChange={() => setPublishStatus('draft')}
                style={{ accentColor: 'var(--primary)' }}
              />
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Save as Private Draft</div>
                <div className="text-muted text-xs">Keep work-in-progress materials private for continued editing</div>
              </div>
            </label>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setStep(3)}>
              Back
            </button>
            <button
              className="btn btn-primary"
              style={{ flex: 2 }}
              onClick={() => {
                alert(isFaculty
                  ? (publishStatus === 'in_review' ? 'Course learning materials submitted for Institution Admin approval!' : 'Course draft saved successfully!')
                  : `Course successfully updated to status: ${publishStatus}!`
                );
                navigate('/courses');
              }}
            >
              {isFaculty ? (publishStatus === 'in_review' ? 'Submit for Admin Review' : 'Save Draft') : 'Confirm & Save Course'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
