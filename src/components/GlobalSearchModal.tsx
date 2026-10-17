import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, BookOpen, ClipboardCheck, Users, Video, Shield, ArrowRight } from 'lucide-react';
import { mockCourses, mockAssessments } from '../data/mockData';
import { mockUsers } from '../data/mockUsers';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalSearchModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  if (!isOpen) return null;

  const filteredCourses = mockCourses.filter((c) =>
    c.title.toLowerCase().includes(query.toLowerCase()) ||
    c.description.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 3);

  const filteredAssessments = mockAssessments.filter((a) =>
    a.title.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 3);

  const filteredUsers = mockUsers.filter((u) =>
    u.displayName.toLowerCase().includes(query.toLowerCase()) ||
    u.email.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 3);

  const handleSelect = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <Search size={20} color="var(--primary)" />
          <input
            type="text"
            placeholder="Search courses, assessments, users, cohorts, or settings..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-main)',
              fontSize: '1rem'
            }}
          />
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ maxHeight: '420px', overflowY: 'auto', padding: '16px 20px' }}>
          {query.trim() === '' ? (
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '10px' }}>
                Quick Navigation
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                <button
                  className="btn btn-secondary"
                  style={{ justifyContent: 'flex-start', padding: '10px 14px' }}
                  onClick={() => handleSelect('/courses')}
                >
                  <BookOpen size={16} color="var(--primary)" />
                  <span>Course Management</span>
                </button>
                <button
                  className="btn btn-secondary"
                  style={{ justifyContent: 'flex-start', padding: '10px 14px' }}
                  onClick={() => handleSelect('/assessments')}
                >
                  <ClipboardCheck size={16} color="var(--warning)" />
                  <span>Assessments & Quizzes</span>
                </button>
                <button
                  className="btn btn-secondary"
                  style={{ justifyContent: 'flex-start', padding: '10px 14px' }}
                  onClick={() => handleSelect('/people')}
                >
                  <Users size={16} color="var(--accent-cyan)" />
                  <span>People Directory</span>
                </button>
                <button
                  className="btn btn-secondary"
                  style={{ justifyContent: 'flex-start', padding: '10px 14px' }}
                  onClick={() => handleSelect('/grading')}
                >
                  <Shield size={16} color="var(--success)" />
                  <span>Grading & Moderation</span>
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {filteredCourses.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Courses
                  </div>
                  {filteredCourses.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => handleSelect('/courses')}
                      style={{
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        background: 'var(--bg-input)',
                        marginBottom: '4px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <BookOpen size={16} color="var(--primary)" />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{c.title}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.category} &bull; {c.status}</div>
                        </div>
                      </div>
                      <ArrowRight size={14} color="var(--text-muted)" />
                    </div>
                  ))}
                </div>
              )}

              {filteredAssessments.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Assessments
                  </div>
                  {filteredAssessments.map((a) => (
                    <div
                      key={a.id}
                      onClick={() => handleSelect('/assessments')}
                      style={{
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        background: 'var(--bg-input)',
                        marginBottom: '4px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <ClipboardCheck size={16} color="var(--warning)" />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{a.title}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{a.durationMinutes} mins &bull; {a.totalMarks} marks</div>
                        </div>
                      </div>
                      <ArrowRight size={14} color="var(--text-muted)" />
                    </div>
                  ))}
                </div>
              )}

              {filteredUsers.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Users
                  </div>
                  {filteredUsers.map((u) => (
                    <div
                      key={u.id}
                      onClick={() => handleSelect('/people')}
                      style={{
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        background: 'var(--bg-input)',
                        marginBottom: '4px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Users size={16} color="var(--accent-cyan)" />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{u.displayName}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.email} &bull; {u.activeRole}</div>
                        </div>
                      </div>
                      <ArrowRight size={14} color="var(--text-muted)" />
                    </div>
                  ))}
                </div>
              )}

              {filteredCourses.length === 0 && filteredAssessments.length === 0 && filteredUsers.length === 0 && (
                <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  No results found for "{query}"
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{
          padding: '10px 20px',
          background: 'var(--bg-input)',
          borderTop: '1px solid var(--border-subtle)',
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          display: 'flex',
          justifyContent: 'space-between'
        }}>
          <span>Press <strong>ESC</strong> to close</span>
          <span>Tip: Navigate using quick buttons</span>
        </div>
      </div>
    </div>
  );
};
