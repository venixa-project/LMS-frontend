import React from 'react';
import { Link } from 'react-router-dom';
import { Route, ArrowUpRight, CheckCircle2, Clock, Users } from 'lucide-react';

interface EnrollmentRecord {
  id: string;
  studentName: string;
  studentEmail: string;
  courseTitle: string;
  courseCategory: string;
  enrolledAt: string;
  progressPercent: number;
  status: 'active' | 'completed';
}

export const RecentEnrollmentsTable: React.FC = () => {
  const recentEnrollments: EnrollmentRecord[] = [
    {
      id: 'enr-101',
      studentName: 'Alex Rivera',
      studentEmail: 'alex@lms.demo',
      courseTitle: 'Advanced React Patterns',
      courseCategory: 'Web Development',
      enrolledAt: 'Oct 20, 2026',
      progressPercent: 68,
      status: 'active'
    },
    {
      id: 'enr-102',
      studentName: 'Daniel Wu',
      studentEmail: 'daniel.wu@acmelearning.com',
      courseTitle: 'JavaScript Fundamentals',
      courseCategory: 'Web Development',
      enrolledAt: 'Oct 19, 2026',
      progressPercent: 45,
      status: 'active'
    },
    {
      id: 'enr-103',
      studentName: 'Maria Garcia',
      studentEmail: 'maria.g@acmelearning.com',
      courseTitle: 'Python for Data Science',
      courseCategory: 'Data Science',
      enrolledAt: 'Oct 18, 2026',
      progressPercent: 82,
      status: 'active'
    },
    {
      id: 'enr-104',
      studentName: 'Priya Sharma',
      studentEmail: 'priya.s@acmelearning.com',
      courseTitle: 'Cloud Native Microservices',
      courseCategory: 'Cloud & Infrastructure',
      enrolledAt: 'Oct 16, 2026',
      progressPercent: 100,
      status: 'completed'
    },
    {
      id: 'enr-105',
      studentName: 'James Chen',
      studentEmail: 'james.c@acmelearning.com',
      courseTitle: 'JavaScript Fundamentals',
      courseCategory: 'Web Development',
      enrolledAt: 'Oct 15, 2026',
      progressPercent: 24,
      status: 'active'
    }
  ];

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div className="dashboard-card-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="badge badge-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Route size={11} /> Student Intake
            </span>
            <span className="text-muted text-xs">Roster Feed</span>
          </div>
          <h3 style={{ fontSize: '1.15rem', margin: 0, fontWeight: 700 }}>Recent Enrollments</h3>
          <p className="text-secondary text-xs" style={{ margin: '2px 0 0 0' }}>
            Latest admitted learners and their real-time syllabus milestones
          </p>
        </div>

        <Link
          to="/enrollments"
          className="btn btn-secondary btn-sm"
          style={{ fontSize: '0.75rem', padding: '5px 12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
        >
          View All Enrollments <ArrowUpRight size={12} />
        </Link>
      </div>

      {/* Responsive Table */}
      <div className="table-responsive" style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', overflowX: 'auto', flex: 1 }}>
        <table className="data-table" style={{ fontSize: '0.775rem', margin: 0, width: '100%' }}>
          <thead>
            <tr style={{ background: 'var(--bg-input)' }}>
              <th style={{ padding: '9px 12px' }}>Student</th>
              <th style={{ padding: '9px 12px' }}>Course</th>
              <th style={{ padding: '9px 12px' }}>Enrolled Date</th>
              <th style={{ padding: '9px 12px' }}>Progress</th>
              <th style={{ padding: '9px 12px' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {recentEnrollments.map((enr) => {
              const initials = enr.studentName
                .split(' ')
                .map((n) => n[0])
                .join('')
                .substring(0, 2)
                .toUpperCase();

              return (
                <tr key={enr.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  {/* Student with Avatar */}
                  <td style={{ padding: '8px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '50%',
                          background: 'var(--primary-light)',
                          color: 'var(--primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          flexShrink: 0
                        }}
                      >
                        {initials}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap' }}>
                          {enr.studentName}
                        </div>
                        <div className="text-muted text-xs" style={{ fontSize: '0.675rem' }}>
                          {enr.studentEmail}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Course Title & Category */}
                  <td style={{ padding: '8px 12px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap' }}>
                      {enr.courseTitle}
                    </div>
                    <span className="badge badge-neutral" style={{ fontSize: '0.625rem', padding: '1px 5px', marginTop: '2px' }}>
                      {enr.courseCategory}
                    </span>
                  </td>

                  {/* Enrolled Date */}
                  <td style={{ padding: '8px 12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                    {enr.enrolledAt}
                  </td>

                  {/* Progress Bar & Percentage */}
                  <td style={{ padding: '8px 12px', minWidth: '100px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 600, color: enr.status === 'completed' ? 'var(--success)' : 'var(--text-main)' }}>
                        {enr.progressPercent}%
                      </span>
                    </div>
                    <div className="progress-bar-bg" style={{ height: '4px', background: 'var(--border-subtle)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div
                        className="progress-bar-fill"
                        style={{
                          width: `${enr.progressPercent}%`,
                          height: '100%',
                          background: enr.status === 'completed' ? 'var(--success)' : 'var(--primary)',
                          transition: 'width 0.3s ease'
                        }}
                      />
                    </div>
                  </td>

                  {/* Status Badge */}
                  <td style={{ padding: '8px 12px' }}>
                    {enr.status === 'completed' ? (
                      <span className="badge badge-active" style={{ fontSize: '0.65rem', padding: '2px 6px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <CheckCircle2 size={10} /> Completed
                      </span>
                    ) : (
                      <span className="badge badge-neutral" style={{ fontSize: '0.65rem', padding: '2px 6px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <Clock size={10} /> In Progress
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer Info */}
      <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        <span>Showing 5 latest student admissions</span>
        <Link to="/enrollments" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
          Open Full Roster &rarr;
        </Link>
      </div>
    </div>
  );
};
