import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowUpRight,
  GraduationCap,
  Video,
  BookOpen,
  User,
  Clock,
  FileCheck,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { apiClient } from '../../lib/apiClient';
import { useAuthStore } from '../../lib/store';

interface ActivityRecord {
  id: string;
  title: string;
  relatedPerson?: string;
  relatedCourse?: string;
  timestamp: string;
  rawTimestamp: string;
  statusText: string;
  statusVariant: 'success' | 'active' | 'warning' | 'info';
  icon: React.ComponentType<{ size?: number; color?: string }>;
  iconColor: string;
  iconBg: string;
}

function formatActivityTime(timestampStr?: string): string {
  if (!timestampStr) return 'Just now';
  try {
    const date = new Date(timestampStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (isNaN(diffMs) || diffMs < 0) {
      return date.toLocaleDateString();
    }
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins === 1 ? '' : 's'} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return 'Recently';
  }
}

export const InstitutionActivitiesFeed: React.FC = () => {
  const { user } = useAuthStore();
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivities = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch genuine audit trail activities from backend API
      const res = await apiClient.get<any[]>('/system/audit-logs?limit=10');
      const rawLogs: any[] = Array.isArray(res.data)
        ? res.data
        : (res.data as any)?.items || [];

      const formatted: ActivityRecord[] = rawLogs.map((entry: any) => {
        const action = (entry.action || 'activity').toLowerCase();
        const resource = (entry.resource || '').toLowerCase();
        const summary = entry.changeSummary || '';
        const actor = entry.actorName || entry.actorEmail || 'Authorized Staff';

        let title = summary;
        if (!title || title.length > 60) {
          if (action === 'create' && resource === 'course') {
            title = 'New Course Created';
          } else if (action === 'publish' && resource === 'course') {
            title = 'Course Published to Catalog';
          } else if (action === 'enroll' || resource === 'enrollment') {
            title = 'Student Enrolled in Course';
          } else if (resource === 'user' || resource === 'student' || action === 'create_student') {
            title = 'New Student Admission';
          } else if (resource === 'grading' || resource === 'assessment') {
            title = 'Assessment Grades Finalized';
          } else if (resource === 'live_session' || resource === 'class') {
            title = 'Live Session Concluded';
          } else {
            const actCapital = action.charAt(0).toUpperCase() + action.slice(1);
            const resCapital = resource ? resource.charAt(0).toUpperCase() + resource.slice(1) : 'Action';
            title = `${actCapital} ${resCapital}`.trim();
          }
        }

        let icon = Activity;
        let iconColor = '#6366f1';
        let iconBg = 'rgba(99, 102, 241, 0.12)';

        if (resource.includes('student') || resource.includes('user') || action.includes('admission')) {
          icon = User;
          iconColor = '#6366f1';
          iconBg = 'rgba(99, 102, 241, 0.12)';
        } else if (resource.includes('grade') || resource.includes('assessment') || resource.includes('exam')) {
          icon = GraduationCap;
          iconColor = '#8b5cf6';
          iconBg = 'rgba(139, 92, 246, 0.12)';
        } else if (resource.includes('session') || resource.includes('video') || resource.includes('class')) {
          icon = Video;
          iconColor = '#06b6d4';
          iconBg = 'rgba(6, 182, 212, 0.12)';
        } else if (resource.includes('course') || resource.includes('curriculum')) {
          icon = BookOpen;
          iconColor = '#f59e0b';
          iconBg = 'rgba(245, 158, 11, 0.12)';
        } else if (resource.includes('review') || resource.includes('syllabus')) {
          icon = FileCheck;
          iconColor = '#10b981';
          iconBg = 'rgba(16, 185, 129, 0.12)';
        }

        const isFailure = entry.outcome === 'failure' || entry.outcome === 'denied';
        const statusVariant: 'success' | 'active' | 'warning' | 'info' = isFailure
          ? 'warning'
          : action === 'publish'
          ? 'warning'
          : action === 'create'
          ? 'active'
          : 'success';

        const statusText = entry.outcome
          ? entry.outcome.charAt(0).toUpperCase() + entry.outcome.slice(1)
          : action.toUpperCase();

        const timestampStr = entry.timestamp || entry.createdAt || new Date().toISOString();

        return {
          id: entry.id || `act-${Math.random()}`,
          title,
          relatedPerson: actor,
          relatedCourse: resource === 'course' ? entry.resourceId || summary : undefined,
          timestamp: formatActivityTime(timestampStr),
          rawTimestamp: timestampStr,
          statusText,
          statusVariant,
          icon,
          iconColor,
          iconBg,
        };
      });

      // Sort chronologically, newest first
      formatted.sort(
        (a, b) => new Date(b.rawTimestamp).getTime() - new Date(a.rawTimestamp).getTime()
      );

      setActivities(formatted);
    } catch (err: any) {
      console.warn('Failed to retrieve institution activities:', err);
      // If endpoint is unavailable or returns an error, set error state instead of showing fake mock records
      setError(err?.message || 'Activity log is currently unavailable.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivities();

    const handleOrgSwitch = () => {
      fetchActivities();
    };

    window.addEventListener('venilearn_org_switched', handleOrgSwitch);
    return () => {
      window.removeEventListener('venilearn_org_switched', handleOrgSwitch);
    };
  }, [fetchActivities]);

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

      {/* Body States */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1, padding: '12px 8px' }}>
          {[1, 2, 3].map((n) => (
            <div key={n} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'var(--border-subtle)',
                  animation: 'pulse 1.5s infinite ease-in-out',
                  flexShrink: 0,
                }}
              />
              <div
                style={{
                  flex: 1,
                  height: '56px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  animation: 'pulse 1.5s infinite ease-in-out',
                }}
              />
            </div>
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
            padding: '32px 16px',
            textAlign: 'center',
            gap: '12px',
          }}
        >
          <AlertCircle size={28} style={{ color: 'var(--warning)', opacity: 0.8 }} />
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
              Activity Feed Unavailable
            </div>
            <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', maxWidth: '280px' }}>
              {error}
            </div>
          </div>
          <button
            onClick={fetchActivities}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}
          >
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      ) : activities.length === 0 ? (
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
          <Activity size={32} style={{ color: 'var(--text-muted)', marginBottom: '12px', opacity: 0.4 }} />
          <h4 style={{ margin: '0 0 6px 0', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>
            No Recent Activities
          </h4>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '280px', lineHeight: 1.4 }}>
            New institutional activities will appear here.
          </p>
        </div>
      ) : (
        /* Vertical Timeline Feed */
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
              zIndex: 0,
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
                  zIndex: 1,
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
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
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
                    minWidth: 0,
                  }}
                >
                  {/* Title & Status Row */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                      marginBottom: '4px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '0.825rem', color: 'var(--text-main)' }}>
                      {act.title}
                    </div>
                    <span
                      className={
                        act.statusVariant === 'success'
                          ? 'badge badge-active'
                          : act.statusVariant === 'warning'
                          ? 'badge badge-warning'
                          : 'badge badge-neutral'
                      }
                      style={{ fontSize: '0.625rem', padding: '1px 6px' }}
                    >
                      {act.statusText}
                    </span>
                  </div>

                  {/* Related Person & Course Pills */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      flexWrap: 'wrap',
                      marginBottom: '5px',
                      fontSize: '0.725rem',
                    }}
                  >
                    {act.relatedPerson && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        <User size={10} color="var(--primary)" />
                        <strong>{act.relatedPerson}</strong>
                      </span>
                    )}
                    {act.relatedPerson && act.relatedCourse && <span className="text-muted">&bull;</span>}
                    {act.relatedCourse && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        <BookOpen size={10} color="var(--accent-purple)" />
                        <span>{act.relatedCourse}</span>
                      </span>
                    )}
                  </div>

                  {/* Relative Timestamp */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.675rem',
                      color: 'var(--text-muted)',
                    }}
                  >
                    <Clock size={10} />
                    <span>{act.timestamp}</span>
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
          marginTop: '14px',
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
          {activities.length > 0
            ? `Showing ${activities.length} verified chronological log${activities.length === 1 ? '' : 's'}`
            : 'Audit feed synchronized'}
        </span>
        <Link to="/reports" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
          Open Full Audit Trail &rarr;
        </Link>
      </div>
    </div>
  );
};
