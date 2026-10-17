import React, { useState } from 'react';
import { mockLearningPaths, mockCourses } from '../../data/mockData';
import { LearningPath } from '../../types';
import {
  Route, Plus, Search, BookOpen, Clock, AlertTriangle, CheckCircle2,
  ChevronRight, ArrowRight, X, ShieldAlert, Award
} from 'lucide-react';

export const LearningPathsPage: React.FC = () => {
  const [paths, setPaths] = useState<LearningPath[]>(mockLearningPaths);
  const [selectedPath, setSelectedPath] = useState<LearningPath>(mockLearningPaths[0]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetRole, setTargetRole] = useState('Fullstack Engineer');
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>(['c-001', 'c-002']);
  const [hasCircularWarning, setHasCircularWarning] = useState(false);

  const handleCreatePath = (e: React.FormEvent) => {
    e.preventDefault();
    const newPath: LearningPath = {
      id: `lp-${Date.now()}`,
      title,
      description,
      organizationId: 'org-001',
      courseIds: selectedCourseIds,
      courses: selectedCourseIds.map((cId, idx) => ({
        courseId: cId,
        order: idx + 1,
        isRequired: true
      })),
      prerequisites: [],
      targetRole,
      estimatedHours: 40,
      status: 'published',
      enrolledCount: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setPaths([newPath, ...paths]);
    setSelectedPath(newPath);
    setIsModalOpen(false);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '4px' }}>Adaptive Learning Paths</h1>
          <p className="text-secondary text-sm">Sequence multi-course tracks, configure prerequisite rules, and track career readiness milestones</p>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => {
            setTitle('');
            setDescription('');
            setHasCircularWarning(false);
            setIsModalOpen(true);
          }}
        >
          <Plus size={16} /> Create Learning Path
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '24px' }}>
        {/* Paths List Sidebar */}
        <div className="card" style={{ padding: '16px' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '14px' }}>Active Learning Tracks</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {paths.map((p) => {
              const isSelected = selectedPath.id === p.id;

              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedPath(p)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: isSelected ? 'var(--primary-light)' : 'var(--bg-input)',
                    border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    transition: 'var(--transition)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <Route size={16} color="var(--primary)" />
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: isSelected ? 'var(--primary)' : 'var(--text-main)' }}>
                      {p.title}
                    </span>
                  </div>
                  <div className="text-muted text-xs" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{p.courses.length} sequential courses</span>
                    <span>{p.estimatedHours} hrs</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Path Detail View */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid var(--border-subtle)' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span className="badge badge-active">{selectedPath.status}</span>
                <span className="badge badge-primary">Target: {selectedPath.targetRole}</span>
              </div>
              <h2 style={{ fontSize: '1.4rem', margin: 0 }}>{selectedPath.title}</h2>
              <p className="text-secondary text-sm" style={{ marginTop: '6px' }}>{selectedPath.description}</p>
            </div>

            <div style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 16px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary)' }}>
                {selectedPath.enrolledCount}
              </div>
              <div className="text-muted text-xs font-semibold">Active Learners</div>
            </div>
          </div>

          <h3 style={{ fontSize: '1.1rem', marginBottom: '14px' }}>Curriculum Step Sequence</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {selectedPath.courses.map((stepItem, idx) => {
              const fullCourse = mockCourses.find((c) => c.id === stepItem.courseId);
              const cTitle = fullCourse?.title || stepItem.title || `Course Module ${idx + 1}`;
              const cCategory = fullCourse?.category || 'Technical Training';
              const cDuration = fullCourse?.durationHours || Math.round((fullCourse?.estimatedDuration || 120) / 60);

              return (
                <div
                  key={stepItem.courseId || idx}
                  style={{
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: 'var(--primary)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.85rem'
                    }}>
                      {idx + 1}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{cTitle}</div>
                      <div className="text-muted text-xs">
                        {cCategory} &bull; {cDuration} hrs &bull; Passing Score: 70%
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {idx > 0 && (
                      <span className="badge badge-draft">
                        Prerequisite: Step {idx}
                      </span>
                    )}
                    <span className="badge badge-published">Published</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{
            marginTop: '24px',
            padding: '14px',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid var(--success-border)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <Award size={24} color="var(--success)" />
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--success)' }}>
                Milestone Certification Bound
              </div>
              <div className="text-muted text-xs">
                Upon completing all {selectedPath.courses.length} courses in sequence, learners automatically receive the verified credential.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Create Learning Track</h3>
              <button onClick={() => setIsModalOpen(false)} style={{ color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreatePath}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Learning Path Title <span className="required">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Cloud & DevOps Architect Path"
                    className="form-input"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Track Objective</label>
                  <textarea
                    rows={2}
                    className="form-textarea"
                    placeholder="Describe skill milestones..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Target Role / Career Milestone</label>
                  <input
                    type="text"
                    className="form-input"
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Select Ordered Courses</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {mockCourses.map((c) => (
                      <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                        <input
                          type="checkbox"
                          checked={selectedCourseIds.includes(c.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCourseIds([...selectedCourseIds, c.id]);
                            } else {
                              setSelectedCourseIds(selectedCourseIds.filter((id) => id !== c.id));
                            }
                          }}
                          style={{ accentColor: 'var(--primary)' }}
                        />
                        <span>{c.title} ({c.durationHours || Math.round((c.estimatedDuration || 120) / 60)} hrs)</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px',
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <CheckCircle2 size={16} color="var(--success)" />
                  <span>Circular dependency validator checked: No recursive prerequisites detected.</span>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Learning Path
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
