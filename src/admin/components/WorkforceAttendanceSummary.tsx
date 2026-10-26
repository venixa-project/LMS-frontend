import React from 'react';
import { Link } from 'react-router-dom';
import { UserCheck, ArrowUpRight, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { getEmployeeAttendanceSummary, mockEmployeeAttendanceRecords } from '../../data/mockEmployeeAttendance';

export const WorkforceAttendanceSummary: React.FC = () => {
  const hasData = mockEmployeeAttendanceRecords.length > 0;
  const summary = hasData ? getEmployeeAttendanceSummary('today') : null;

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div className="dashboard-card-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="badge badge-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <UserCheck size={11} /> Workforce Log
            </span>
            <span className="text-muted text-xs">Excludes Students</span>
          </div>
          <h3 style={{ fontSize: '1.15rem', margin: 0, fontWeight: 700 }}>Employee Attendance Summary</h3>
          <p className="text-secondary text-xs" style={{ margin: '2px 0 0 0' }}>
            Daily check-in verification for instructors, trainers, and staff
          </p>
        </div>

        <Link
          to="/attendance"
          className="btn btn-secondary btn-sm"
          style={{ fontSize: '0.75rem', padding: '5px 12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
        >
          Attendance Ledger <ArrowUpRight size={12} />
        </Link>
      </div>

      {summary ? (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
          {/* Main Stat Row */}
          <div style={{ background: 'var(--bg-input)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span className="text-muted text-xs font-semibold">Today's Workforce Turnout</span>
              <span className="badge badge-active" style={{ fontSize: '0.7rem' }}>
                {summary.attendanceRate}% Present
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--success)', letterSpacing: '-0.02em' }}>
                {summary.presentCount}
              </span>
              <span className="text-muted" style={{ fontSize: '0.85rem' }}>
                / {summary.totalEmployees} Faculty & Staff Logged
              </span>
            </div>

            {/* Attendance Progress Bar */}
            <div className="progress-bar-bg" style={{ height: '6px', background: 'var(--border-subtle)', borderRadius: '3px', overflow: 'hidden' }}>
              <div
                className="progress-bar-fill"
                style={{
                  width: `${summary.attendanceRate}%`,
                  height: '100%',
                  background: 'var(--success)'
                }}
              />
            </div>
          </div>

          {/* Breakdown Chips */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '14px' }}>
            <div style={{ background: 'var(--bg-input)', padding: '8px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--success)' }}>
                {summary.presentCount}
              </div>
              <div className="text-muted" style={{ fontSize: '0.675rem' }}>Present</div>
            </div>

            <div style={{ background: 'var(--bg-input)', padding: '8px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--warning)' }}>
                {summary.approvedLeaveCount}
              </div>
              <div className="text-muted" style={{ fontSize: '0.675rem' }}>Approved Leave</div>
            </div>

            <div style={{ background: 'var(--bg-input)', padding: '8px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--danger)' }}>
                {summary.absentCount}
              </div>
              <div className="text-muted" style={{ fontSize: '0.675rem' }}>Absent</div>
            </div>
          </div>

          {/* Context Footer */}
          <div style={{ paddingTop: '10px', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <span>Verified biometric & lab logins</span>
            <Link to="/attendance" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
              View Full Ledger &rarr;
            </Link>
          </div>
        </div>
      ) : (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
          No employee attendance data recorded for today.
        </div>
      )}
    </div>
  );
};
