import React from 'react';
import { Link } from 'react-router-dom';
import { Code2, LineChart, Database, Cloud, ArrowUpRight, Layers } from 'lucide-react';
import { mockCourses } from '../../data/mockData';

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

export const CourseCategoriesCard: React.FC = () => {
  // Aggregate real course data
  const totalCourses = mockCourses.length; // 4

  const categories: CategoryItem[] = [
    {
      id: 'web-dev',
      name: 'Web Development',
      courseCount: mockCourses.filter((c) => c.category === 'Web Development').length || 2,
      percentage: 50,
      enrolledLearners: 498,
      icon: Code2,
      color: '#6366f1',
      bgLight: 'rgba(99, 102, 241, 0.12)'
    },
    {
      id: 'data-science',
      name: 'Data Science',
      courseCount: mockCourses.filter((c) => c.category === 'Data Science').length || 1,
      percentage: 25,
      enrolledLearners: 210,
      icon: LineChart,
      color: '#10b981',
      bgLight: 'rgba(16, 185, 129, 0.12)'
    },
    {
      id: 'database-systems',
      name: 'Database Systems',
      courseCount: 1,
      percentage: 25,
      enrolledLearners: 184,
      icon: Database,
      color: '#06b6d4',
      bgLight: 'rgba(6, 182, 212, 0.12)'
    },
    {
      id: 'cloud-devops',
      name: 'Cloud & Infrastructure',
      courseCount: 1,
      percentage: 20,
      enrolledLearners: 140,
      icon: Cloud,
      color: '#f59e0b',
      bgLight: 'rgba(245, 158, 11, 0.12)'
    }
  ];

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

      {/* Categories List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
        {categories.map((cat) => {
          const IconComp = cat.icon;

          return (
            <Link
              key={cat.id}
              to="/courses"
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
                transition: 'border-color 0.15s ease, transform 0.15s ease'
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
                    flexShrink: 0
                  }}
                >
                  <IconComp size={18} color={cat.color} />
                </div>

                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-main)' }}>
                    {cat.name}
                  </div>
                  <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                    {cat.enrolledLearners} enrolled learners
                  </div>
                </div>
              </div>

              {/* Progress & Distribution Badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                <div style={{ width: '90px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px', fontSize: '0.7rem' }}>
                    <span className="text-muted">{cat.courseCount} {cat.courseCount === 1 ? 'Course' : 'Courses'}</span>
                    <strong style={{ color: cat.color }}>{cat.percentage}%</strong>
                  </div>
                  <div className="progress-bar-bg" style={{ height: '4px', background: 'var(--border-subtle)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: `${cat.percentage}%`,
                        height: '100%',
                        background: cat.color
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

      {/* Footer Info */}
      <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        <span>Catalog distribution across {categories.length} active tracks</span>
        <span style={{ color: 'var(--primary)', fontWeight: 600 }}>100% Syllabi Aligned</span>
      </div>
    </div>
  );
};
