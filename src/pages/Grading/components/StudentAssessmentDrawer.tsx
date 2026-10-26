import React, { useState, useMemo } from 'react';
import { AssessmentAttempt } from '../../../types';
import { useGradingStore } from '../../../lib/gradingStore';
import {
  X, CheckCircle2, Clock, AlertTriangle, Eye, ArrowRight,
  Filter, Search, Calendar, Award, FileText, Check, ChevronDown
} from 'lucide-react';

interface StudentAssessmentDrawerProps {
  studentId: string;
  onClose: () => void;
  authorizedCourseIds?: string[];
  isFaculty?: boolean;
}

export const StudentAssessmentDrawer: React.FC<StudentAssessmentDrawerProps> = ({
  studentId,
  onClose,
  authorizedCourseIds,
  isFaculty = true,
}) => {
  const { attempts, openSubmissionModal } = useGradingStore();

  // Internal drawer filter state
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // All student attempts scoped by faculty authorization
  const studentAllAttempts = useMemo(() => {
    return attempts.filter((att) => {
      if (att.learnerId !== studentId) return false;
      // If faculty, limit strictly to authorized courses
      if (isFaculty && authorizedCourseIds && authorizedCourseIds.length > 0) {
        return att.courseId ? authorizedCourseIds.includes(att.courseId) : true;
      }
      return true;
    });
  }, [attempts, studentId, isFaculty, authorizedCourseIds]);

  // Representative student profile info
  const studentProfile = useMemo(() => {
    if (studentAllAttempts.length > 0) {
      const first = studentAllAttempts[0];
      return {
        id: first.learnerId,
        name: first.learnerName,
        rollNo: first.learnerRollNo || 'STU-ID',
        email: first.learnerEmail || 'student@lms.demo',
        department: first.learnerDepartment || 'Computer Science & Engineering',
        avatar: first.learnerAvatar,
      };
    }
    return {
      id: studentId,
      name: 'Enrolled Student',
      rollNo: 'STU-2026',
      email: 'student@lms.demo',
      department: 'Software Engineering',
      avatar: undefined,
    };
  }, [studentAllAttempts, studentId]);

  // Distinct courses for student
  const studentCourses = useMemo(() => {
    const map = new Map<string, string>();
    studentAllAttempts.forEach((a) => {
      if (a.courseId && a.courseTitle) {
        map.set(a.courseId, a.courseTitle);
      }
    });
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
  }, [studentAllAttempts]);

  // Metrics computation for student
  const metrics = useMemo(() => {
    const totalAssigned = studentAllAttempts.length;
    const completedAttempts = studentAllAttempts.filter(
      (a) => a.evaluationStatus === 'published' || a.status === 'results_released'
    );
    const pendingAttempts = studentAllAttempts.filter(
      (a) => a.evaluationStatus !== 'published' && a.status !== 'results_released'
    );
    const passedCount = completedAttempts.filter((a) => a.passed).length;
    const failedCount = completedAttempts.filter((a) => a.passed === false).length;

    const avgScore =
      completedAttempts.length > 0
        ? Math.round(
            completedAttempts.reduce((acc, curr) => acc + (curr.percentage || 0), 0) /
              completedAttempts.length
          )
        : 0;

    const passRate =
      completedAttempts.length > 0
        ? Math.round((passedCount / completedAttempts.length) * 100)
        : 0;

    // Find latest activity date
    let lastActivity = '—';
    if (studentAllAttempts.length > 0) {
      const dates = studentAllAttempts
        .map((a) => a.submittedAt || a.startedAt)
        .filter(Boolean) as string[];
      if (dates.length > 0) {
        dates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
        lastActivity = new Date(dates[0]).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
      }
    }

    return {
      totalAssigned,
      completedCount: completedAttempts.length,
      pendingCount: pendingAttempts.length,
      passedCount,
      failedCount,
      avgScore,
      passRate,
      lastActivity,
    };
  }, [studentAllAttempts]);

  // Filtered and sorted assessment history
  const filteredHistory = useMemo(() => {
    const now = new Date().getTime();

    const filtered = studentAllAttempts.filter((att) => {
      // Course filter
      if (courseFilter !== 'all' && att.courseId !== courseFilter) {
        return false;
      }
      // Type filter
      if (typeFilter !== 'all' && att.assessmentType !== typeFilter) {
        return false;
      }
      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'passed' && !att.passed) return false;
        if (statusFilter === 'failed' && att.passed !== false) return false;
        if (statusFilter === 'pending' && att.evaluationStatus === 'published') return false;
        if (statusFilter === 'ai_review' && att.evaluationStatus !== 'ai_review_required') return false;
      }
      // Date filter
      if (dateFilter !== 'all') {
        const itemDate = new Date(att.submittedAt || att.startedAt || 0).getTime();
        const diffDays = (now - itemDate) / (1000 * 3600 * 24);
        if (dateFilter === 'today' && diffDays > 1) return false;
        if (dateFilter === '7days' && diffDays > 7) return false;
        if (dateFilter === '30days' && diffDays > 30) return false;
      }
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (att.assessmentTitle || '').toLowerCase().includes(q);
        const matchCourse = (att.courseTitle || '').toLowerCase().includes(q);
        if (!matchTitle && !matchCourse) return false;
      }
      return true;
    });

    // Default: Sort by latest submission date
    return filtered.sort((a, b) => {
      const dateA = new Date(a.submittedAt || a.startedAt || 0).getTime();
      const dateB = new Date(b.submittedAt || b.startedAt || 0).getTime();
      return dateB - dateA;
    });
  }, [studentAllAttempts, courseFilter, typeFilter, statusFilter, dateFilter, searchQuery]);

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{ zIndex: 1050, justifyContent: 'flex-end', background: 'rgba(15, 23, 42, 0.45)' }}
    >
      <div
        className="drawer-panel"
        style={{
          width: '900px',
          maxWidth: '96vw',
          height: '100vh',
          background: 'var(--bg-card)',
          boxShadow: '-8px 0 25px rgba(0, 0, 0, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideInRight 0.25s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header with Student Profile Info */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'var(--bg-card)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--primary), #818cf8)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '1.35rem',
                flexShrink: 0,
              }}
            >
              {studentProfile.name.charAt(0)}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0 }}>
                  {studentProfile.name}
                </h2>
                <span className="badge badge-primary">{studentProfile.rollNo}</span>
                {isFaculty && (
                  <span className="badge badge-info text-xs">Assigned Faculty Scope</span>
                )}
              </div>
              <p className="text-secondary text-xs" style={{ margin: '4px 0 8px 0' }}>
                {studentProfile.email} &bull; {studentProfile.department} &bull; Acme Learning Corp
              </p>

              {/* Enrolled Courses Badges */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span className="text-muted text-xs" style={{ fontWeight: 600 }}>Courses:</span>
                {studentCourses.map((c) => (
                  <span key={c.id} className="badge badge-neutral text-xs">
                    {c.title}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn-icon"
            style={{
              color: 'var(--text-muted)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '6px',
            }}
          >
            <X size={24} />
          </button>
        </div>

        {/* Student Overview Compact Stats */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '12px',
            padding: '16px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'var(--bg-input)',
          }}
        >
          <div style={{ background: 'var(--bg-card)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
            <div className="text-muted text-xs">Total Assigned</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{metrics.totalAssigned}</div>
          </div>

          <div style={{ background: 'var(--bg-card)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
            <div className="text-muted text-xs">Completed</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--success)' }}>{metrics.completedCount}</div>
          </div>

          <div style={{ background: 'var(--bg-card)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
            <div className="text-muted text-xs">Pending Eval</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--warning)' }}>{metrics.pendingCount}</div>
          </div>

          <div style={{ background: 'var(--bg-card)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
            <div className="text-muted text-xs">Average Score</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)' }}>{metrics.avgScore}%</div>
          </div>

          <div style={{ background: 'var(--bg-card)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
            <div className="text-muted text-xs">Pass Rate</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: metrics.passRate >= 70 ? 'var(--success)' : 'var(--danger)' }}>
              {metrics.passRate}%
            </div>
          </div>

          <div style={{ background: 'var(--bg-card)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
            <div className="text-muted text-xs">Last Activity</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, marginTop: '4px' }}>{metrics.lastActivity}</div>
          </div>
        </div>

        {/* Drawer Filter Controls Bar */}
        <div
          style={{
            padding: '12px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'var(--bg-card)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            flexWrap: 'wrap',
          }}
        >
          {/* Search */}
          <div style={{ position: 'relative', flex: 1, minWidth: '160px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search assessment..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '32px', paddingRight: '12px', height: '34px', fontSize: '0.825rem' }}
            />
          </div>

          {/* Course Filter */}
          <select
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            className="form-select"
            style={{ height: '34px', fontSize: '0.825rem', minWidth: '150px' }}
          >
            <option value="all">All Courses</option>
            {studentCourses.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>

          {/* Assessment Type */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="form-select"
            style={{ height: '34px', fontSize: '0.825rem', minWidth: '120px' }}
          >
            <option value="all">All Types</option>
            <option value="quiz">Quiz</option>
            <option value="assignment">Assignment</option>
            <option value="exam">Exam</option>
            <option value="capstone">Capstone</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="form-select"
            style={{ height: '34px', fontSize: '0.825rem', minWidth: '130px' }}
          >
            <option value="all">All Statuses</option>
            <option value="passed">Passed</option>
            <option value="failed">Failed</option>
            <option value="pending">Pending Eval</option>
            <option value="ai_review">AI Review Required</option>
          </select>

          {/* Date Filter */}
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="form-select"
            style={{ height: '34px', fontSize: '0.825rem', minWidth: '120px' }}
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
          </select>
        </div>

        {/* Assessment History Table */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>
              Assessment Submissions ({filteredHistory.length})
            </h4>
            <span className="text-muted text-xs">Sorted by latest submission</span>
          </div>

          {filteredHistory.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '48px 16px',
                background: 'var(--bg-input)',
                borderRadius: 'var(--radius-md)',
                border: '1px dashed var(--border-subtle)',
              }}
            >
              <FileText size={36} color="var(--text-muted)" style={{ margin: '0 auto 12px auto' }} />
              <h4 style={{ fontSize: '1rem', margin: '0 0 6px 0' }}>No Assessment Records Found</h4>
              <p className="text-muted text-xs" style={{ margin: '0 0 16px 0' }}>
                No assessment attempts match the selected filter criteria for this student.
              </p>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setCourseFilter('all');
                  setTypeFilter('all');
                  setStatusFilter('all');
                  setDateFilter('all');
                  setSearchQuery('');
                }}
              >
                Clear Drawer Filters
              </button>
            </div>
          ) : (
            <div className="table-container" style={{ background: 'var(--bg-card)' }}>
              <table className="table" style={{ fontSize: '0.825rem' }}>
                <thead>
                  <tr>
                    <th>Assessment & Course</th>
                    <th>Type</th>
                    <th>Attempt</th>
                    <th>Submitted At</th>
                    <th>Evaluated At</th>
                    <th>Score / Max</th>
                    <th>Result</th>
                    <th>Evaluation Status</th>
                    <th>Evaluated By</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map((att) => {
                    const isPassed = att.passed === true;
                    const isFailed = att.passed === false;
                    const isPublished = att.evaluationStatus === 'published' || att.status === 'results_released';

                    return (
                      <tr key={att.id}>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                            {att.assessmentTitle}
                          </div>
                          <div className="text-muted text-xs">
                            {att.courseTitle || 'Course'}
                          </div>
                        </td>

                        <td>
                          <span className="badge badge-neutral text-xs" style={{ textTransform: 'capitalize' }}>
                            {att.assessmentType || 'Quiz'}
                          </span>
                        </td>

                        <td>#{att.attemptNumber || 1}</td>

                        <td>
                          {att.submittedAt
                            ? new Date(att.submittedAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '—'}
                        </td>

                        <td>
                          {att.evaluatedAt
                            ? new Date(att.evaluatedAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })
                            : '—'}
                        </td>

                        <td>
                          <strong style={{ color: 'var(--primary)' }}>
                            {att.score !== undefined ? att.score : '—'}
                          </strong>{' '}
                          / {att.totalMarks}
                          {att.percentage !== undefined && (
                            <span className="text-muted text-xs" style={{ marginLeft: '4px' }}>
                              ({att.percentage}%)
                            </span>
                          )}
                        </td>

                        <td>
                          {isPublished ? (
                            isPassed ? (
                              <span className="badge badge-completed text-xs">Passed</span>
                            ) : isFailed ? (
                              <span className="badge badge-failed text-xs">Failed</span>
                            ) : (
                              <span className="badge badge-draft text-xs">—</span>
                            )
                          ) : (
                            <span className="badge badge-draft text-xs">In Review</span>
                          )}
                        </td>

                        <td>
                          {att.evaluationStatus === 'auto_graded' ? (
                            <span className="badge badge-info text-xs">Auto-Graded</span>
                          ) : att.evaluationStatus === 'ai_review_required' ? (
                            <span className="badge badge-warning text-xs">AI Review Required</span>
                          ) : att.evaluationStatus === 'awaiting_human_approval' ? (
                            <span className="badge badge-draft text-xs">Awaiting Approval</span>
                          ) : isPublished ? (
                            <span className="badge badge-completed text-xs">Approved & Graded</span>
                          ) : (
                            <span className="badge badge-draft text-xs">Submitted</span>
                          )}
                        </td>

                        <td>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {att.evaluatedBy || 'Pending'}
                          </div>
                        </td>

                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                            onClick={() => openSubmissionModal(att)}
                          >
                            View Submission
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid var(--border-subtle)',
            background: 'var(--bg-input)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div className="text-muted text-xs">
            Showing {filteredHistory.length} of {studentAllAttempts.length} authorized assessment records
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            Close Profile
          </button>
        </div>
      </div>
    </div>
  );
};
