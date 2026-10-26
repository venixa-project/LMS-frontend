import React from 'react';
import { Link } from 'react-router-dom';
import { Activity, ArrowUpRight, GraduationCap, Video, BookOpen, User, CheckCircle2, Clock, FileCheck } from 'lucide-react';

interface ActivityRecord {
  id: string;
  title: string;
  relatedPerson?: string;
  relatedCourse?: string;
  timestamp: string;
  statusText: string;
  statusVariant: 'success' | 'active' | 'warning' | 'info';
  icon: React.ComponentType<{ size?: number; color?: string }>;
  iconColor: string;
  iconBg: string;
}

export const InstitutionActivitiesFeed: React.FC = () => {
  const activities: ActivityRecord[] = [
    {
      id: 'act-1',
      title: 'New Student Admission',
      relatedPerson: 'Kwesi Mensah',
      relatedCourse: 'Spring 2026 Engineering',
      timestamp: '12 mins ago',
      statusText: 'Admitted',
      statusVariant: 'success',
      icon: User,
      iconColor: '#6366f1',
      iconBg: 'rgba(99, 102, 241, 0.12)'
    },
    {
      id: 'act-2',
      title: 'Exam Grades Finalized',
      relatedPerson: 'Dr. James Wilson',
      relatedCourse: 'React Fundamentals Midterm',
      timestamp: '45 mins ago',
      statusText: 'Graded',
      statusVariant: 'info',
      icon: GraduationCap,
      iconColor: '#8b5cf6',
      iconBg: 'rgba(139, 92, 246, 0.12)'
    },
    {
      id: 'act-3',
      title: 'Live Session Concluded',
      relatedPerson: 'Dr. James Wilson',
      relatedCourse: 'Cloud Microservices Lab',
      timestamp: '2 hours ago',
      statusText: '96.2% Turnout',
      statusVariant: 'active',
      icon: Video,
      iconColor: '#06b6d4',
      iconBg: 'rgba(6, 182, 212, 0.12)'
    },
    {
      id: 'act-4',
      title: 'Curriculum Review Approved',
      relatedPerson: 'CS Department Faculty',
      relatedCourse: 'Syllabus Standards Q4',
      timestamp: '5 hours ago',
      statusText: 'Approved',
      statusVariant: 'success',
      icon: FileCheck,
      iconColor: '#10b981',
      iconBg: 'rgba(16, 185, 129, 0.12)'
    },
    {
      id: 'act-5',
      title: 'Course Published to Catalog',
      relatedPerson: 'Academic Committee',
      relatedCourse: 'Full-Stack Web Architecture',
      timestamp: '1 day ago',
      statusText: 'Published',
      statusVariant: 'warning',
      icon: BookOpen,
      iconColor: '#f59e0b',
      iconBg: 'rgba(245, 158, 11, 0.12)'
    }
  ];

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div className="dashboard-card-header">
        <div>
          <h3 style={{ fontSize: '1.15rem', margin: 0, fontWeight: 700 }}>Recent Activities</h3>
        </div>

        <Link
          to="/reports"
          className="btn btn-secondary btn-sm"
          style={{ fontSize: '0.75rem', padding: '5px 12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
        >
          View All Activity <ArrowUpRight size={12} />
        </Link>
      </div>

      {/* Vertical Timeline Feed */}
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '14px', flex: 1, paddingLeft: '8px' }}>
        {/* Continuous Timeline Track Line */}
        <div
          style={{
            position: 'absolute',
            left: '21px',
            top: '16px',
            bottom: '16px',
            width: '2px',
            background: 'var(--border-subtle)',
            zIndex: 0
          }}
        />

        {activities.map((act) => {
          const IconComp = act.icon;

          return (
            <div
              key={act.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                position: 'relative',
                zIndex: 1
              }}
            >
              {/* Timeline Icon Node */}
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'var(--bg-card)',
                  border: `2px solid ${act.iconColor}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}
              >
                <IconComp size={13} color={act.iconColor} />
              </div>

              {/* Event Content Card */}
              <div
                style={{
                  flex: 1,
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '9px 12px',
                  minWidth: 0
                }}
              >
                {/* Title & Status Row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.825rem', color: 'var(--text-main)' }}>
                    {act.title}
                  </div>
                  <span
                    className={
                      act.statusVariant === 'success' ? 'badge badge-active' :
                      act.statusVariant === 'warning' ? 'badge badge-warning' :
                      'badge badge-neutral'
                    }
                    style={{ fontSize: '0.625rem', padding: '1px 6px' }}
                  >
                    {act.statusText}
                  </span>
                </div>

                {/* Related Person & Course Pills */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '5px', fontSize: '0.725rem' }}>
                  {act.relatedPerson && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: 'var(--text-secondary)' }}>
                      <User size={10} color="var(--primary)" />
                      <strong>{act.relatedPerson}</strong>
                    </span>
                  )}
                  {act.relatedPerson && act.relatedCourse && <span className="text-muted">&bull;</span>}
                  {act.relatedCourse && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: 'var(--text-secondary)' }}>
                      <BookOpen size={10} color="var(--accent-purple)" />
                      <span>{act.relatedCourse}</span>
                    </span>
                  )}
                </div>

                {/* Relative Timestamp */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.675rem', color: 'var(--text-muted)' }}>
                  <Clock size={10} />
                  <span>{act.timestamp}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Info */}
      <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        <span>Showing 5 latest verified chronological logs</span>
        <Link to="/reports" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
          Open Full Audit Trail &rarr;
        </Link>
      </div>
    </div>
  );
};
