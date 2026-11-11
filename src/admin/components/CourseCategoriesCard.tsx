import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Code2,
  LineChart,
  Database,
  Cloud,
  ArrowUpRight,
  Layers,
  BookOpen,
  Atom,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { apiClient } from '../../lib/apiClient';
import { useAuthStore } from '../../lib/store';
import { useCourseStore } from '../../lib/courseStore';

interface CategoryItem {
  id: string;
  name: string;
  courseCount: number;
  percentage: number;
  enrolledLearners: number;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  color: string;
  bgLight: string;
}

const CATEGORY_PALETTES = [
  { icon: Code2, color: '#2563EB', bgLight: 'rgba(37, 99, 235, 0.12)' },      /* Royal Blue */
  { icon: LineChart, color: '#10b981', bgLight: 'rgba(16, 185, 129, 0.12)' },  /* Success Green */
  { icon: Database, color: '#3B82F6', bgLight: 'rgba(59, 130, 246, 0.12)' },   /* Sky Blue */
  { icon: Cloud, color: '#5447FF', bgLight: 'rgba(84, 71, 255, 0.12)' },       /* Electric Indigo */
  { icon: Atom, color: '#818CF8', bgLight: 'rgba(129, 140, 248, 0.12)' },      /* Soft Indigo */
  { icon: Layers, color: '#EC4899', bgLight: 'rgba(236, 72, 153, 0.12)' },     /* Hot Pink */
];

function getCategoryPalette(categoryName: string, index: number) {
  const norm = categoryName.toLowerCase();
  if (norm.includes('web') || norm.includes('code') || norm.includes('software')) {
    return { icon: Code2, color: '#6366f1', bgLight: 'rgba(99, 102, 241, 0.12)' };
  }
  if (norm.includes('data') || norm.includes('analytics') || norm.includes('science')) {
    return { icon: LineChart, color: '#10b981', bgLight: 'rgba(16, 185, 129, 0.12)' };
  }
  if (norm.includes('database') || norm.includes('sql') || norm.includes('db')) {
    return { icon: Database, color: '#06b6d4', bgLight: 'rgba(6, 182, 212, 0.12)' };
  }
  if (norm.includes('cloud') || norm.includes('devops') || norm.includes('infra')) {
    return { icon: Cloud, color: '#f59e0b', bgLight: 'rgba(245, 158, 11, 0.12)' };
  }
  if (norm.includes('ai') || norm.includes('machine') || norm.includes('deep')) {
    return { icon: Atom, color: '#8b5cf6', bgLight: 'rgba(139, 92, 246, 0.12)' };
  }
  return CATEGORY_PALETTES[index % CATEGORY_PALETTES.length];
}

export const CourseCategoriesCard: React.FC = () => {
  const { user } = useAuthStore();
  const [categories, setCategories] = useState<CategoryItem[]>([]);
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

  const loadCategories = useCallback(async (tenantId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch genuine courses from backend
      const res = await apiClient.get<any[]>('/courses?limit=100');
      let rawCourses: any[] = [];
      if (Array.isArray(res.data)) {
        rawCourses = res.data;
      } else if (res.data && Array.isArray((res.data as any).items)) {
        rawCourses = (res.data as any).items;
      }

      // Fall back to useCourseStore if backend returned empty
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

      // Dynamically group categories with whitespace & case normalization
      const categoryMap = new Map<
        string,
        { id: string; name: string; courseCount: number; enrolledLearners: number }
      >();

      for (const c of tenantCourses) {
        const raw = (c.category || '').trim();
        if (!raw) continue;
        const normalizedKey = raw.toLowerCase();
        const enrolled =
          c._count?.enrollments ??
          c.learnerCount ??
          (Array.isArray(c.enrollments) ? c.enrollments.length : 0);

        if (categoryMap.has(normalizedKey)) {
          const item = categoryMap.get(normalizedKey)!;
          item.courseCount += 1;
          item.enrolledLearners += enrolled;
        } else {
          categoryMap.set(normalizedKey, {
            id: `cat-${normalizedKey.replace(/[^a-z0-9]/g, '-')}`,
            name: raw,
            courseCount: 1,
            enrolledLearners: enrolled,
          });
        }
      }

      const totalCourses = tenantCourses.length;
      const aggregated: CategoryItem[] = Array.from(categoryMap.values()).map((item, index) => {
        const palette = getCategoryPalette(item.name, index);
        const percentage = totalCourses > 0 ? Math.round((item.courseCount / totalCourses) * 100) : 0;

        return {
          id: item.id,
          name: item.name,
          courseCount: item.courseCount,
          percentage,
          enrolledLearners: item.enrolledLearners,
          icon: palette.icon,
          color: palette.color,
          bgLight: palette.bgLight,
        };
      });

      // Sort by course count descending, then enrolled learners
      aggregated.sort((a, b) => {
        if (b.courseCount !== a.courseCount) {
          return b.courseCount - a.courseCount;
        }
        return b.enrolledLearners - a.enrolledLearners;
      });

      setCategories(aggregated);
    } catch (err: any) {
      console.warn('Failed to aggregate course categories:', err);
      // Fallback from store
      const storeCourses = useCourseStore.getState().courses.filter((c) => {
        const orgMatch = c.organizationId ? c.organizationId === tenantId : tenantId === 'org-001';
        return orgMatch && c.status !== 'archived';
      });

      if (storeCourses.length > 0) {
        const categoryMap = new Map<
          string,
          { id: string; name: string; courseCount: number; enrolledLearners: number }
        >();

        for (const c of storeCourses) {
          const raw = (c.category || '').trim();
          if (!raw) continue;
          const normalizedKey = raw.toLowerCase();
          const enrolled = c.learnerCount || 0;

          if (categoryMap.has(normalizedKey)) {
            const item = categoryMap.get(normalizedKey)!;
            item.courseCount += 1;
            item.enrolledLearners += enrolled;
          } else {
            categoryMap.set(normalizedKey, {
              id: `cat-${normalizedKey.replace(/[^a-z0-9]/g, '-')}`,
              name: raw,
              courseCount: 1,
              enrolledLearners: enrolled,
            });
          }
        }

        const totalCourses = storeCourses.length;
        const fallbackAgg = Array.from(categoryMap.values()).map((item, index) => {
          const palette = getCategoryPalette(item.name, index);
          return {
            id: item.id,
            name: item.name,
            courseCount: item.courseCount,
            percentage: totalCourses > 0 ? Math.round((item.courseCount / totalCourses) * 100) : 0,
            enrolledLearners: item.enrolledLearners,
            icon: palette.icon,
            color: palette.color,
            bgLight: palette.bgLight,
          };
        });

        fallbackAgg.sort((a, b) => b.courseCount - a.courseCount);
        setCategories(fallbackAgg);
      } else {
        setError(err?.message || 'Unable to retrieve course categories.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories(activeOrgId);

    const handleOrgSwitch = (e: Event) => {
      const customEvent = e as CustomEvent<{ orgId: string }>;
      const nextOrg = customEvent.detail?.orgId || sessionStorage.getItem('venilearn_active_org_id') || 'org-001';
      setActiveOrgId(nextOrg);
      loadCategories(nextOrg);
    };

    window.addEventListener('venilearn_org_switched', handleOrgSwitch);
    return () => {
      window.removeEventListener('venilearn_org_switched', handleOrgSwitch);
    };
  }, [activeOrgId, loadCategories]);

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div className="dashboard-card-header">
        <div>
          <h3 style={{ fontSize: '1.15rem', margin: 0, fontWeight: 700 }}>Course Categories</h3>
        </div>

        <Link
          to="/courses"
          className="btn btn-secondary btn-sm"
          style={{ fontSize: '0.75rem', padding: '5px 12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
        >
          View Catalog <ArrowUpRight size={12} />
        </Link>
      </div>

      {/* Body */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              style={{
                height: '58px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                animation: 'pulse 1.5s infinite ease-in-out',
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
              Categories Unavailable
            </div>
            <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', maxWidth: '280px' }}>
              {error}
            </div>
          </div>
          <button
            onClick={() => loadCategories(activeOrgId)}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      ) : categories.length === 0 ? (
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
          <Layers size={36} style={{ color: 'var(--text-muted)', marginBottom: '12px', opacity: 0.4 }} />
          <h4 style={{ margin: '0 0 6px 0', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>
            No Course Categories Available
          </h4>
          <p style={{ margin: '0 0 16px 0', fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '280px', lineHeight: 1.4 }}>
            Course categories will be displayed once courses are added to the catalog.
          </p>
          <Link to="/courses" className="btn btn-primary btn-sm" style={{ fontSize: '0.75rem' }}>
            Go to Course Catalog
          </Link>
        </div>
      ) : (
        /* Categories List */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
          {categories.map((cat) => {
            const IconComp = cat.icon;

            return (
              <Link
                key={cat.id}
                to={`/courses?category=${encodeURIComponent(cat.name)}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: 'var(--bg-input)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  gap: '12px',
                  textDecoration: 'none',
                  color: 'inherit',
                  transition: 'border-color 0.15s ease, transform 0.15s ease',
                }}
                className="hover-card-border"
              >
                {/* Icon & Category Name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '160px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      background: cat.bgLight,
                      color: cat.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <IconComp size={18} color={cat.color} />
                  </div>

                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-main)' }}>
                      {cat.name}
                    </div>
                    <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                      {cat.enrolledLearners} enrolled {cat.enrolledLearners === 1 ? 'learner' : 'learners'}
                    </div>
                  </div>
                </div>

                {/* Progress & Distribution Badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                  <div style={{ width: '90px' }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '3px',
                        fontSize: '0.7rem',
                      }}
                    >
                      <span className="text-muted">
                        {cat.courseCount} {cat.courseCount === 1 ? 'Course' : 'Courses'}
                      </span>
                      <strong style={{ color: cat.color }}>{cat.percentage}%</strong>
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
                          width: `${cat.percentage}%`,
                          height: '100%',
                          background: cat.color,
                        }}
                      />
                    </div>
                  </div>

                  <span
                    className="badge badge-neutral"
                    style={{ fontSize: '0.65rem', padding: '2px 8px', minWidth: '45px', textAlign: 'center' }}
                  >
                    Active
                  </span>
                </div>
              </Link>
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
          {categories.length > 0
            ? `Catalog distribution across ${categories.length} active track${categories.length === 1 ? '' : 's'}`
            : 'Catalog tracks synchronized'}
        </span>
        <Link to="/courses" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
          View Catalog &rarr;
        </Link>
      </div>
    </div>
  );
};
