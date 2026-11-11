import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Award, ArrowUpRight, Star, Users, Code2, LineChart, Database, Atom, BookOpen, AlertCircle, RefreshCw } from 'lucide-react';
import { apiClient } from '../../lib/apiClient';
import { useAuthStore } from '../../lib/store';
import { useCourseStore, getDefaultCourseCover } from '../../lib/courseStore';
import { Course } from '../../types';

interface DisplayCourse {
  id: string;
  title: string;
  category: string;
  durationHours: number;
  enrolledLearners: number;
  completionRate: number | null;
  rating: number | null;
  status: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  gradient: string;
  glyph: string;
  thumbnail?: string;
}

const GRADIENTS = [
  'linear-gradient(135deg, #2563EB 0%, #F472B6 100%)', // Royal Blue to Soft Pink
  'linear-gradient(135deg, #2563EB 0%, #EC4899 100%)', // Royal Blue to Hot Pink
  'linear-gradient(135deg, #5447FF 0%, #F232A9 100%)', // Electric Blue to Neon Pink
  'linear-gradient(135deg, #2563EB 0%, #818CF8 50%, #F472B6 100%)', // 3-Color Flow
  'linear-gradient(135deg, #1D4ED8 0%, #DB2777 100%)', // Deep Blue to Deep Rose Pink
];

function getCourseIcon(category?: string) {
  const cat = (category || '').toLowerCase();
  if (cat.includes('web') || cat.includes('code') || cat.includes('front') || cat.includes('back')) return Code2;
  if (cat.includes('data') || cat.includes('analytics')) return LineChart;
  if (cat.includes('db') || cat.includes('database') || cat.includes('sql')) return Database;
  if (cat.includes('ai') || cat.includes('react') || cat.includes('ml')) return Atom;
  return BookOpen;
}

function getGlyph(title: string): string {
  const words = title.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return title.slice(0, 2).toUpperCase() || 'CR';
}

export const TopPerformingCourses: React.FC = () => {
  const { user } = useAuthStore();
  const [courses, setCourses] = useState<DisplayCourse[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [activeOrgId, setActiveOrgId] = useState<string>(() => {
    return (
      sessionStorage.getItem('venilearn_active_org_id') ||
      localStorage.getItem('venilearn_active_org_id') ||
      user?.organizationId ||
      'org-001'
    );
  });

  const loadCourses = useCallback(async (tenantId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch genuine courses from backend
      const res = await apiClient.get<any[]>('/courses?limit=50');
      let rawCourses: any[] = [];
      if (Array.isArray(res.data)) {
        rawCourses = res.data;
      } else if (res.data && Array.isArray((res.data as any).items)) {
        rawCourses = (res.data as any).items;
      }

      // If backend returns empty or unavailable, check useCourseStore
      if (rawCourses.length === 0) {
        const storeCourses = useCourseStore.getState().courses;
        if (storeCourses && storeCourses.length > 0) {
          rawCourses = storeCourses;
        }
      }

      // Filter by active tenant & exclude archived
      const tenantCourses = rawCourses.filter((c: any) => {
        const cOrg = c.organizationId || c.tenantId;
        const orgMatch = !cOrg || !tenantId || cOrg === tenantId ||
          ((cOrg === 'org-001' || cOrg === '871abf8a-e563-4d0f-afc7-416d8da3df14') &&
           (tenantId === 'org-001' || tenantId === '871abf8a-e563-4d0f-afc7-416d8da3df14'));
        return orgMatch && c.status !== 'archived';
      });

      // Map to display courses using genuine metrics
      const displayList: DisplayCourse[] = tenantCourses.map((c: any, index: number) => {
        const enrolled =
          c._count?.enrollments ??
          c.learnerCount ??
          (Array.isArray(c.enrollments) ? c.enrollments.length : 0);

        const completion =
          typeof c.completionRate === 'number' && c.completionRate >= 0 ? c.completionRate : null;

        const rating = typeof c.rating === 'number' && c.rating > 0 ? c.rating : null;

        const duration =
          typeof c.durationHours === 'number'
            ? c.durationHours
            : typeof c.estimatedHours === 'number'
            ? c.estimatedHours
            : 0;

        const thumbnail = c.thumbnailUrl || c.thumbnail || c.coverImage || getDefaultCourseCover(c.category, c.title);

        return {
          id: c.id,
          title: c.title,
          category: c.category || 'General Curriculum',
          durationHours: duration,
          enrolledLearners: enrolled,
          completionRate: completion,
          rating,
          status: c.status || 'published',
          icon: getCourseIcon(c.category),
          gradient: GRADIENTS[index % GRADIENTS.length],
          glyph: getGlyph(c.title),
          thumbnail,
        };
      });

      // Rank primarily by genuine enrolled learners count, secondarily by completion rate
      displayList.sort((a, b) => {
        if (b.enrolledLearners !== a.enrolledLearners) {
          return b.enrolledLearners - a.enrolledLearners;
        }
        return (b.completionRate ?? 0) - (a.completionRate ?? 0);
      });

      // Keep top 4 performing courses
      setCourses(displayList.slice(0, 4));
    } catch (err: any) {
      console.warn('Failed to load top performing courses:', err);
      // Fall back to store if available
      const storeCourses = useCourseStore.getState().courses.filter((c) => {
        const orgMatch = c.organizationId ? c.organizationId === tenantId : tenantId === 'org-001';
        return orgMatch && c.status !== 'archived';
      });

      if (storeCourses.length > 0) {
        const mapped: DisplayCourse[] = storeCourses.map((c, idx) => ({
          id: c.id,
          title: c.title,
          category: c.category || 'General Curriculum',
          durationHours: c.durationHours || 0,
          enrolledLearners: c.learnerCount || 0,
          completionRate: typeof c.completionRate === 'number' ? c.completionRate : null,
          rating: typeof (c as any).rating === 'number' ? (c as any).rating : null,
          status: c.status || 'published',
          icon: getCourseIcon(c.category),
          gradient: GRADIENTS[idx % GRADIENTS.length],
          glyph: getGlyph(c.title),
          thumbnail: c.thumbnail || (c as any).thumbnailUrl || getDefaultCourseCover(c.category, c.title),
        }));
        mapped.sort((a, b) => b.enrolledLearners - a.enrolledLearners);
        setCourses(mapped.slice(0, 4));
      } else {
        setError(err?.message || 'Unable to retrieve course performance data.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCourses(activeOrgId);

    const handleOrgSwitch = (e: Event) => {
      const customEvent = e as CustomEvent<{ orgId: string }>;
      const nextOrg = customEvent.detail?.orgId || sessionStorage.getItem('venilearn_active_org_id') || 'org-001';
      setActiveOrgId(nextOrg);
      loadCourses(nextOrg);
    };

    window.addEventListener('venilearn_org_switched', handleOrgSwitch);
    return () => {
      window.removeEventListener('venilearn_org_switched', handleOrgSwitch);
    };
  }, [activeOrgId, loadCourses]);

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

      {/* Body */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '10px 12px',
                background: 'var(--bg-input)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                gap: '14px',
                animation: 'pulse 1.5s infinite ease-in-out',
                height: '76px',
              }}
            />
          ))}
        </div>
      ) : error ? (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '36px 16px',
            textAlign: 'center',
            gap: '12px',
          }}
        >
          <AlertCircle size={28} style={{ color: 'var(--warning)', opacity: 0.8 }} />
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
              Performance Data Unavailable
            </div>
            <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', maxWidth: '280px' }}>
              {error}
            </div>
          </div>
          <button
            onClick={() => loadCourses(activeOrgId)}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      ) : courses.length === 0 ? (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '36px 16px',
            textAlign: 'center',
          }}
        >
          <Award size={36} style={{ color: 'var(--text-muted)', marginBottom: '12px', opacity: 0.4 }} />
          <h4 style={{ margin: '0 0 6px 0', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>
            No Course Performance Data Available
          </h4>
          <p style={{ margin: '0 0 16px 0', fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '280px', lineHeight: 1.4 }}>
            Courses created for this institution will appear here.
          </p>
          <Link to="/courses" className="btn btn-primary btn-sm" style={{ fontSize: '0.75rem' }}>
            Browse Courses
          </Link>
        </div>
      ) : (
        /* Courses List with 16:9 Thumbnails */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
          {courses.map((crs, index) => {
            const IconComp = crs.icon;
            const completionPct = crs.completionRate ?? 0;
            const rateColor =
              completionPct >= 80 ? 'var(--success)' : completionPct >= 70 ? 'var(--primary)' : 'var(--warning)';

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
                  transition: 'border-color 0.15s ease',
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
                    boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                  }}
                >
                  {/* Real Course Cover Image */}
                  {crs.thumbnail && (
                    <img
                      src={crs.thumbnail}
                      alt={crs.title}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        zIndex: 1,
                      }}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  )}

                  {/* Visual Icon & Glyph Watermark (Fallback when image isn't loaded) */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      zIndex: 0,
                    }}
                  >
                    <IconComp size={20} color="#ffffff" />
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 900,
                        color: 'rgba(255,255,255,0.9)',
                        letterSpacing: '0.05em',
                      }}
                    >
                      {crs.glyph}
                    </span>
                  </div>

                  {/* Subtle dark gradient overlay so corner badges remain crisp */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 60%)',
                      pointerEvents: 'none',
                      zIndex: 2,
                    }}
                  />

                  {/* Status Badge in corner */}
                  <div style={{ position: 'absolute', top: '4px', right: '4px', zIndex: 3 }}>
                    <span
                      style={{
                        background: 'rgba(16, 185, 129, 0.9)',
                        color: '#fff',
                        fontSize: '0.55rem',
                        fontWeight: 700,
                        padding: '1px 4px',
                        borderRadius: '3px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {crs.status}
                    </span>
                  </div>

                  {/* Duration chip in corner */}
                  {crs.durationHours > 0 && (
                    <div style={{ position: 'absolute', bottom: '3px', left: '4px', zIndex: 3 }}>
                      <span
                        style={{
                          background: 'rgba(0,0,0,0.65)',
                          color: 'rgba(255,255,255,0.9)',
                          fontSize: '0.55rem',
                          fontWeight: 600,
                          padding: '1px 4px',
                          borderRadius: '3px',
                        }}
                      >
                        {crs.durationHours}h
                      </span>
                    </div>
                  )}
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
                        borderRadius: '3px',
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
                        textDecoration: 'none',
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
                    {crs.rating ? (
                      <span
                        className="text-muted"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '0.7rem' }}
                      >
                        <Star size={10} color="#f59e0b" fill="#f59e0b" /> {crs.rating}
                      </span>
                    ) : (
                      <span className="text-muted" style={{ fontSize: '0.675rem' }}>
                        No reviews yet
                      </span>
                    )}
                  </div>
                </div>

                {/* Metrics & Progress Bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
                  {/* Enrolled Count */}
                  <div style={{ textAlign: 'right', minWidth: '65px' }}>
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        color: 'var(--text-main)',
                      }}
                    >
                      <Users size={12} color="var(--primary)" /> {crs.enrolledLearners}
                    </div>
                    <div className="text-muted" style={{ fontSize: '0.675rem' }}>
                      Enrolled
                    </div>
                  </div>

                  {/* Completion Progress */}
                  <div style={{ width: '95px' }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '3px',
                        fontSize: '0.7rem',
                      }}
                    >
                      <span className="text-muted">Completion</span>
                      {crs.completionRate !== null ? (
                        <strong style={{ color: rateColor }}>{crs.completionRate}%</strong>
                      ) : (
                        <span className="text-muted" style={{ fontSize: '0.65rem' }}>
                          N/A
                        </span>
                      )}
                    </div>
                    <div
                      className="progress-bar-bg"
                      style={{
                        height: '4px',
                        background: 'var(--border-subtle)',
                        borderRadius: '2px',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        className="progress-bar-fill"
                        style={{
                          width: `${crs.completionRate ?? 0}%`,
                          height: '100%',
                          background: rateColor,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer Info */}
      <div
        style={{
          marginTop: '12px',
          paddingTop: '10px',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
        }}
      >
        <span>
          {courses.length > 0
            ? `Showing top ${courses.length} enrolled ${courses.length === 1 ? 'syllabus' : 'syllabi'} in catalog`
            : 'Catalog rankings synchronized'}
        </span>
        <Link to="/courses" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
          View All Courses &rarr;
        </Link>
      </div>
    </div>
  );
};
