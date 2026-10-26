import React from 'react';
import { Link } from 'react-router-dom';
import { Award, ArrowUpRight, Star, Users, Code2, LineChart, Database, Atom } from 'lucide-react';
import { mockCourses } from '../../data/mockData';

interface TopCourse {
  id: string;
  title: string;
  category: string;
  durationHours: number;
  enrolledLearners: number;
  completionRate: number;
  rating: number;
  status: 'published' | 'draft';
  icon: React.ComponentType<{ size?: number; color?: string }>;
  gradient: string;
  glyph: string;
}

export const TopPerformingCourses: React.FC = () => {
  const courses: TopCourse[] = [
    {
      id: mockCourses[0]?.id || 'crs-001',
      title: mockCourses[0]?.title || 'JavaScript Fundamentals',
      category: 'Web Development',
      durationHours: 40,
      enrolledLearners: 342,
      completionRate: 78,
      rating: 4.9,
      status: 'published',
      icon: Code2,
      gradient: 'linear-gradient(135deg, #1e1b4b 0%, #3730a3 50%, #4f46e5 100%)',
      glyph: 'JS'
    },
    {
      id: mockCourses[2]?.id || 'crs-003',
      title: mockCourses[2]?.title || 'Python for Data Science',
      category: 'Data Science',
      durationHours: 80,
      enrolledLearners: 210,
      completionRate: 85,
      rating: 4.8,
      status: 'published',
      icon: LineChart,
      gradient: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #059669 100%)',
      glyph: 'PY'
    },
    {
      id: 'crs-004',
      title: 'Modern Database Design & SQL',
      category: 'Database Systems',
      durationHours: 50,
      enrolledLearners: 184,
      completionRate: 74,
      rating: 4.8,
      status: 'published',
      icon: Database,
      gradient: 'linear-gradient(135deg, #1e293b 0%, #334155 50%, #475569 100%)',
      glyph: 'SQL'
    },
    {
      id: mockCourses[1]?.id || 'crs-002',
      title: mockCourses[1]?.title || 'Advanced React Patterns',
      category: 'Web Development',
      durationHours: 60,
      enrolledLearners: 156,
      completionRate: 62,
      rating: 4.7,
      status: 'published',
      icon: Atom,
      gradient: 'linear-gradient(135deg, #0c4a6e 0%, #0369a1 50%, #0284c7 100%)',
      glyph: 'TS'
    }
  ];

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div className="dashboard-card-header">
        <div>
          <h3 style={{ fontSize: '1.15rem', margin: 0, fontWeight: 700 }}>Top Performing Courses</h3>
        </div>

        <Link
          to="/courses"
          className="btn btn-secondary btn-sm"
          style={{ fontSize: '0.75rem', padding: '5px 12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
        >
          View All Courses <ArrowUpRight size={12} />
        </Link>
      </div>

      {/* Courses List with 16:9 Thumbnails */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
        {courses.map((crs, index) => {
          const IconComp = crs.icon;
          const rateColor =
            crs.completionRate >= 80 ? 'var(--success)' :
            crs.completionRate >= 70 ? 'var(--primary)' : 'var(--warning)';

          return (
            <div
              key={crs.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '10px 12px',
                background: 'var(--bg-input)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                gap: '14px',
                flexWrap: 'wrap',
                transition: 'border-color 0.15s ease'
              }}
            >
              {/* 16:9 Aspect Ratio Thumbnail Cover Image */}
              <div
                style={{
                  width: '105px',
                  aspectRatio: '16 / 9',
                  borderRadius: 'var(--radius-md)',
                  background: crs.gradient,
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                }}
              >
                {/* Visual Icon & Glyph Watermark */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', zIndex: 1 }}>
                  <IconComp size={20} color="#ffffff" />
                  <span style={{ fontSize: '0.75rem', fontWeight: 900, color: 'rgba(255,255,255,0.9)', letterSpacing: '0.05em' }}>
                    {crs.glyph}
                  </span>
                </div>

                {/* Status Badge in corner */}
                <div style={{ position: 'absolute', top: '4px', right: '4px', zIndex: 2 }}>
                  <span
                    style={{
                      background: 'rgba(16, 185, 129, 0.9)',
                      color: '#fff',
                      fontSize: '0.55rem',
                      fontWeight: 700,
                      padding: '1px 4px',
                      borderRadius: '3px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em'
                    }}
                  >
                    {crs.status}
                  </span>
                </div>

                {/* Duration chip in corner */}
                <div style={{ position: 'absolute', bottom: '3px', left: '4px', zIndex: 2 }}>
                  <span
                    style={{
                      background: 'rgba(0,0,0,0.65)',
                      color: 'rgba(255,255,255,0.9)',
                      fontSize: '0.55rem',
                      fontWeight: 600,
                      padding: '1px 4px',
                      borderRadius: '3px'
                    }}
                  >
                    {crs.durationHours}h
                  </span>
                </div>

                {/* Background decorative ring */}
                <div
                  style={{
                    position: 'absolute',
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    border: '1px dashed rgba(255,255,255,0.15)',
                    top: '-10px',
                    right: '-10px'
                  }}
                />
              </div>

              {/* Title & Metadata */}
              <div style={{ flex: '1 1 180px', minWidth: '150px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                  <span
                    style={{
                      fontSize: '0.65rem',
                      fontWeight: 800,
                      color: index === 0 ? 'var(--primary)' : 'var(--text-muted)',
                      background: index === 0 ? 'var(--primary-light)' : 'transparent',
                      padding: '1px 5px',
                      borderRadius: '3px'
                    }}
                  >
                    #{index + 1}
                  </span>
                  <Link
                    to={`/course/${crs.id}`}
                    style={{
                      fontWeight: 700,
                      fontSize: '0.875rem',
                      color: 'var(--text-main)',
                      textDecoration: 'none'
                    }}
                    className="hover-underline"
                  >
                    {crs.title}
                  </Link>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span className="badge badge-neutral" style={{ fontSize: '0.625rem', padding: '1px 6px' }}>
                    {crs.category}
                  </span>
                  <span className="text-muted" style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '0.7rem' }}>
                    <Star size={10} color="#f59e0b" fill="#f59e0b" /> {crs.rating}
                  </span>
                </div>
              </div>

              {/* Metrics & Progress Bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
                {/* Enrolled Count */}
                <div style={{ textAlign: 'right', minWidth: '65px' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-main)' }}>
                    <Users size={12} color="var(--primary)" /> {crs.enrolledLearners}
                  </div>
                  <div className="text-muted" style={{ fontSize: '0.675rem' }}>
                    Enrolled
                  </div>
                </div>

                {/* Completion Progress */}
                <div style={{ width: '95px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px', fontSize: '0.7rem' }}>
                    <span className="text-muted">Pass Rate</span>
                    <strong style={{ color: rateColor }}>{crs.completionRate}%</strong>
                  </div>
                  <div className="progress-bar-bg" style={{ height: '4px', background: 'var(--border-subtle)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: `${crs.completionRate}%`,
                        height: '100%',
                        background: rateColor
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Info */}
      <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        <span>Showing top 4 enrolled syllabi in catalog</span>
        <Link to="/courses" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
          View All Courses &rarr;
        </Link>
      </div>
    </div>
  );
};
