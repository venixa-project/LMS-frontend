import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCap, AlertCircle, ArrowUpRight,
  UsersRound, ChevronDown, ChevronUp
} from 'lucide-react';
import {
  mockStudentAttendanceRecords,
  getStudentAttendanceSummary,
  getCohortStudentAttendance
} from '../../data/mockStudentAttendance';

export const InstitutionStudentAttendanceWidget: React.FC = () => {
  // Period filter
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');

  // Cohort section state
  const [showAllCohorts, setShowAllCohorts] = useState(false);
  const [expandedCohortIds, setExpandedCohortIds] = useState<Set<string>>(new Set());

  const summary = getStudentAttendanceSummary(period);
  const cohortBreakdown = getCohortStudentAttendance();
  const hasData = mockStudentAttendanceRecords.length > 0;

  // Toggle cohort expand/collapse
  const toggleCohortExpand = (cohortId: string) => {
    setExpandedCohortIds(prev => {
      const next = new Set(prev);
      if (next.has(cohortId)) {
        next.delete(cohortId);
      } else {
        next.add(cohortId);
      }
      return next;
    });
  };

  // Preview cohorts (top 3 or all)
  const displayedCohorts = useMemo(() => {
    return showAllCohorts ? cohortBreakdown : cohortBreakdown.slice(0, 3);
  }, [showAllCohorts, cohortBreakdown]);

  return (
    <div className="card" id="student-attendance" style={{ padding: '20px' }}>
      {/* 1. Header with Title and Reporting Period Selector */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="badge badge-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4', borderColor: 'rgba(6, 182, 212, 0.3)' }}>
              <GraduationCap size={12} /> Student Academic Attendance
            </span>
            <span className="text-muted text-xs">Enrolled Cohorts &bull; Excludes Staff</span>
          </div>
          <h3 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 700 }}>Student Attendance Overview</h3>
          <p className="text-secondary text-xs" style={{ margin: '2px 0 0 0' }}>
            Daily session turnouts, verified check-ins, and cohort-level lecture participation
          </p>
        </div>

        {/* Reporting Period Selector & Ledger Link */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <select
            className="form-select"
            value={period}
            onChange={(e) => setPeriod(e.target.value as 'today' | 'week' | 'month')}
            aria-label="Select reporting period"
            style={{ width: 'auto', padding: '5px 10px', fontSize: '0.8rem', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}
          >
            <option value="today">Today (Oct 21, 2026)</option>
            <option value="week">This Week (Weekly Avg)</option>
            <option value="month">This Month (October 2026)</option>
          </select>

          <Link
            to="/attendance"
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '0.75rem', padding: '5px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            title="Open Full Academic Attendance Ledger"
          >
            Attendance Ledger <ArrowUpRight size={12} />
          </Link>
        </div>
      </div>

      {!hasData ? (
        // Empty / Unavailable State
        <div style={{
          padding: '32px 20px',
          textAlign: 'center',
          background: 'var(--bg-input)',
          borderRadius: 'var(--radius-lg)',
          border: '1px dashed var(--border-subtle)',
          margin: '12px 0'
        }}>
          <AlertCircle size={32} color="var(--text-muted)" style={{ margin: '0 auto 10px' }} />
          <h4 style={{ fontSize: '0.95rem', fontWeight: 600, margin: '0 0 4px' }}>No Student Attendance Data Available</h4>
          <p className="text-muted text-xs" style={{ maxWidth: '420px', margin: '0 auto' }}>
            Student attendance records have not been recorded or synchronized for this reporting period. Instructors can record roll calls via the session console.
          </p>
        </div>
      ) : (
        <>
          {/* 1. Compact Attendance Summary (4 Consistently Sized KPI Cards) */}
          <div className="dashboard-mini-kpi-grid" style={{ marginBottom: '18px' }}>
            {/* Total Expected */}
            <div style={{
              background: 'var(--bg-input)',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="text-muted text-xs font-semibold">Expected</span>
                <UsersRound size={14} color="var(--text-muted)" />
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)', margin: '4px 0 2px' }}>
                {summary.totalExpected}
              </div>
              <span className="text-muted text-xs">Enrolled learners</span>
            </div>

            {/* Present */}
            <div style={{
              background: 'var(--bg-input)',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="text-muted text-xs font-semibold">Present</span>
                <span className="badge badge-active" style={{ fontSize: '0.65rem', padding: '1px 5px' }}>
                  {summary.attendanceRate}%
                </span>
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--success)', margin: '4px 0 2px' }}>
                {summary.presentCount}
              </div>
              <span className="text-muted text-xs">Checked in</span>
            </div>

            {/* Absent */}
            <div style={{
              background: 'var(--bg-input)',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="text-muted text-xs font-semibold">Absent</span>
                <span className="badge badge-danger" style={{ fontSize: '0.65rem', padding: '1px 5px' }}>
                  {Math.round((summary.absentCount / (summary.totalExpected || 1)) * 100)}%
                </span>
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--danger)', margin: '4px 0 2px' }}>
                {summary.absentCount}
              </div>
              <span className="text-muted text-xs">Unexcused</span>
            </div>

            {/* Approved Leave */}
            <div style={{
              background: 'var(--bg-input)',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="text-muted text-xs font-semibold">Approved Leave</span>
                <span className="badge badge-warning" style={{ fontSize: '0.65rem', padding: '1px 5px' }}>
                  {summary.approvedLeaveCount}
                </span>
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--warning)', margin: '4px 0 2px' }}>
                {summary.approvedLeaveCount}
              </div>
              <span className="text-muted text-xs">Medical / official</span>
            </div>
          </div>

          {/* 2. Expandable Cohort Attendance Breakdown */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0 }}>
                  Cohort Attendance Rates
                </h4>
                <span className="text-muted text-xs">
                  Showing {displayedCohorts.length} of {cohortBreakdown.length} cohorts &bull; Click any cohort to view breakdown
                </span>
              </div>

              {cohortBreakdown.length > 3 && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowAllCohorts(!showAllCohorts)}
                  style={{ fontSize: '0.75rem', padding: '3px 8px', height: '26px' }}
                >
                  {showAllCohorts ? 'Show Top 3 Cohorts' : `View All Cohorts (${cohortBreakdown.length})`}
                </button>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {displayedCohorts.map((coh) => {
                const isExpanded = expandedCohortIds.has(coh.cohortId);
                const rateColor =
                  coh.attendanceRate >= 85 ? 'var(--success)' :
                  coh.attendanceRate >= 70 ? 'var(--warning)' : 'var(--danger)';

                return (
                  <div
                    key={coh.cohortId}
                    style={{
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '10px 14px',
                      cursor: 'pointer',
                      transition: 'border-color 0.15s ease'
                    }}
                    onClick={() => toggleCohortExpand(coh.cohortId)}
                  >
                    {/* Summary Row */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '180px' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-main)' }}>
                          {coh.cohortName}
                        </span>
                        <span className="badge badge-neutral" style={{ fontSize: '0.65rem', padding: '1px 6px' }}>
                          {coh.cohortCode}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: rateColor }}>
                          {coh.attendanceRate}%
                        </span>
                        <span className="text-muted text-xs">
                          ({coh.presentCount}/{coh.totalExpected})
                        </span>
                        {isExpanded ? <ChevronUp size={14} color="var(--text-muted)" /> : <ChevronDown size={14} color="var(--text-muted)" />}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div
                      className="progress-bar-bg"
                      style={{ height: '5px', marginTop: '8px', background: 'var(--border-subtle)', borderRadius: '3px', overflow: 'hidden' }}
                    >
                      <div
                        className="progress-bar-fill"
                        style={{
                          width: `${coh.attendanceRate}%`,
                          background: rateColor,
                          height: '100%',
                          transition: 'width 0.3s ease'
                        }}
                      />
                    </div>

                    {/* Expandable Details */}
                    {isExpanded && (
                      <div
                        style={{
                          marginTop: '10px',
                          paddingTop: '8px',
                          borderTop: '1px dashed var(--border-subtle)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '10px',
                          fontSize: '0.75rem'
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                          <span style={{ color: 'var(--success)', fontWeight: 600 }}>
                            Present: {coh.presentCount}
                          </span>
                          <span style={{ color: 'var(--danger)', fontWeight: 600 }}>
                            &bull; Absent: {coh.absentCount}
                          </span>
                          <span style={{ color: 'var(--warning)', fontWeight: 600 }}>
                            &bull; Leave: {coh.approvedLeaveCount}
                          </span>
                          <span className="text-muted">
                            &bull; Course: {coh.courseTitle}
                          </span>
                        </div>

                        {/* Quick View in Ledger Action */}
                        <Link
                          to={`/attendance?cohortId=${coh.cohortId}`}
                          className="btn btn-secondary btn-sm"
                          style={{
                            fontSize: '0.7rem',
                            padding: '2px 8px',
                            height: '24px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          title="Open cohort records in Attendance Ledger"
                        >
                          <ArrowUpRight size={10} /> View Attendance Records
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer Ledger Link */}
          <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <span className="text-muted text-xs">
              Showing attendance rates across {cohortBreakdown.length} active class cohorts
            </span>
            <Link
              to="/attendance"
              style={{
                color: 'var(--primary)',
                fontWeight: 600,
                fontSize: '0.8rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                textDecoration: 'none'
              }}
            >
              Open Full Academic Attendance Ledger <ArrowUpRight size={12} />
            </Link>
          </div>
        </>
      )}
    </div>
  );
};
