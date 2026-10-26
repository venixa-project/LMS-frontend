import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCourseStore } from '../../lib/courseStore';
import { useAuthStore } from '../../lib/store';
import {
  Link2, BookOpen, Search, ArrowRight, AlertCircle,
  CheckCircle2, Sparkles, Clock, Layers, Award, Check
} from 'lucide-react';

export const JoinCourseWithLinkPage: React.FC = () => {
  const [inputUrl, setInputUrl] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const navigate = useNavigate();
  const { courses, isEnrolled } = useCourseStore();
  const { user } = useAuthStore();

  // Published courses open for enrollment
  const openCourses = courses.filter((c) => c.status === 'published');

  // Parses and validates input string (full URL, relative path, or course ID)
  const extractCourseId = (input: string): string | null => {
    const trimmed = input.trim();
    if (!trimmed) return null;

    // Direct course ID match (e.g. crs-001, CRS-002)
    const directMatch = courses.find(
      (c) => c.id.toLowerCase() === trimmed.toLowerCase()
    );
    if (directMatch) return directMatch.id;

    // Pattern for /course/:id or /courses/:id
    try {
      // Check if relative or full URL
      const path = trimmed.startsWith('http')
        ? new URL(trimmed).pathname
        : trimmed;

      const segments = path.split('/').filter(Boolean);
      // e.g. ['course', 'crs-001'] or ['courses', 'crs-001']
      const courseIndex = segments.findIndex(
        (seg) => seg.toLowerCase() === 'course' || seg.toLowerCase() === 'courses'
      );

      if (courseIndex !== -1 && segments[courseIndex + 1]) {
        const potentialId = segments[courseIndex + 1];
        const match = courses.find(
          (c) => c.id.toLowerCase() === potentialId.toLowerCase()
        );
        if (match) return match.id;
      }
    } catch (e) {
      // URL parsing failed
    }

    return null;
  };

  const handleOpenCourse = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!inputUrl.trim()) {
      setErrorMessage('Please enter or paste a valid course URL or Course ID.');
      return;
    }

    const courseId = extractCourseId(inputUrl);

    if (courseId) {
      navigate(`/course/${courseId}`);
    } else {
      setErrorMessage(
        'Unrecognized course link. Please ensure the link is an official VeniLearn LMS URL (e.g., http://.../course/crs-001 or course code like crs-001).'
      );
    }
  };

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Banner */}
      <div
        className="card"
        style={{
          padding: '32px',
          background: 'linear-gradient(135deg, var(--bg-card) 0%, rgba(99, 102, 241, 0.12) 100%)',
          border: '1px solid var(--border-light)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span className="badge badge-primary">Course Discovery & Direct Access</span>
          <span className="text-muted text-xs">VeniLearn Academic Gateway</span>
        </div>

        <h1 style={{ fontSize: '1.85rem', margin: '0 0 8px 0' }}>
          Join Course with Shareable Link
        </h1>
        <p className="text-secondary text-sm" style={{ margin: 0, maxWidth: '640px', lineHeight: 1.5 }}>
          Paste an official invitation link shared by your instructor or campus administrator to immediately inspect course outcomes and enroll.
        </p>
      </div>

      {/* URL Input Form Card */}
      <div className="card" style={{ padding: '28px' }}>
        <form onSubmit={handleOpenCourse}>
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label" style={{ fontSize: '0.9rem', marginBottom: '8px' }}>
              <Link2 size={16} color="var(--primary)" /> Paste Course Link or Course Code
            </label>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
                <input
                  type="text"
                  placeholder="e.g. http://localhost:5173/course/crs-003 or crs-003"
                  className="form-input"
                  style={{
                    paddingLeft: '14px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.9rem'
                  }}
                  value={inputUrl}
                  onChange={(e) => {
                    setInputUrl(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  autoFocus
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 22px',
                  boxShadow: '0 4px 14px var(--primary-light)'
                }}
              >
                Open Course <ArrowRight size={16} />
              </button>
            </div>
            <span className="form-helper" style={{ marginTop: '6px' }}>
              Supports both full URL formats (http://.../course/crs-001) and direct course codes.
            </span>
          </div>

          {errorMessage && (
            <div
              style={{
                background: 'var(--danger-bg)',
                border: '1px solid var(--danger-border)',
                color: 'var(--danger)',
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '0.85rem'
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>
          )}
        </form>
      </div>

      {/* Quick Access to Active Published Courses */}
      <div className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', margin: '0 0 2px 0' }}>
              Available Open Courses ({openCourses.length})
            </h2>
            <p className="text-muted text-xs" style={{ margin: 0 }}>
              Curriculum programs currently published and open for link enrollment
            </p>
          </div>
          <Link to="/catalog" className="btn btn-secondary btn-sm" style={{ gap: '6px' }}>
            <BookOpen size={14} /> View Full Catalog
          </Link>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {openCourses.map((c) => {
            const enrolled = isEnrolled(c.id);

            return (
              <div
                key={c.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 18px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '8px',
                      background: 'var(--primary-light)',
                      color: 'var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    <BookOpen size={18} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.925rem' }}>{c.title}</span>
                      <code style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>{c.id}</code>
                      {enrolled && (
                        <span className="badge badge-active" style={{ fontSize: '0.675rem' }}>
                          ✓ Enrolled
                        </span>
                      )}
                    </div>
                    <div className="text-muted text-xs" style={{ marginTop: '2px' }}>
                      {c.category} &bull; {c.durationHours || 40} hrs curriculum &bull; {c.level || 'Intermediate'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setInputUrl(`${window.location.origin}/course/${c.id}`);
                    }}
                    style={{ fontSize: '0.75rem' }}
                  >
                    Paste Link
                  </button>
                  <Link
                    to={`/course/${c.id}`}
                    className="btn btn-primary btn-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    Open Course <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
