import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  UserCheck, Users, Calendar, AlertCircle, Clock,
  Briefcase, CheckCircle2, XCircle, ArrowUpRight, Search
} from 'lucide-react';
import { mockLiveSessions, mockCohorts } from '../../data/mockData';
import {
  mockEmployeeAttendanceRecords,
  getEmployeeAttendanceSummary,
  getDepartmentEmployeeAttendance
} from '../../data/mockEmployeeAttendance';

export const InstitutionAttendanceWidget: React.FC = () => {
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [roleFilter, setRoleFilter] = useState<'all' | 'faculty' | 'admin_staff' | 'support_staff'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'present' | 'absent' | 'on_leave'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const summary = getEmployeeAttendanceSummary(period);
  const departmentBreakdown = getDepartmentEmployeeAttendance();
  const hasData = mockEmployeeAttendanceRecords.length > 0;

  // Filter employee attendance records (strictly excludes students)
  const filteredRecords = mockEmployeeAttendanceRecords.filter((emp) => {
    // Role filter
    if (roleFilter !== 'all') {
      if (roleFilter === 'faculty' && emp.role !== 'faculty' && emp.role !== 'trainer') return false;
      if (roleFilter === 'admin_staff' && emp.role !== 'admin_staff') return false;
      if (roleFilter === 'support_staff' && emp.role !== 'support_staff') return false;
    }

    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'present' && emp.status !== 'present' && emp.status !== 'remote') return false;
      if (statusFilter === 'absent' && emp.status !== 'absent') return false;
      if (statusFilter === 'on_leave' && emp.status !== 'on_leave') return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        emp.employeeName.toLowerCase().includes(q) ||
        emp.roleTitle.toLowerCase().includes(q) ||
        emp.department.toLowerCase().includes(q) ||
        emp.employeeEmail.toLowerCase().includes(q);
      if (!match) return false;
    }

    return true;
  });

  return (
    <div className="card" id="employee-attendance">
      {/* Header with Title and Reporting Period Selector */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="badge badge-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <UserCheck size={12} /> Institutional Workforce
            </span>
            <span className="text-muted text-xs">Excludes Students</span>
          </div>
          <h3 style={{ fontSize: '1.2rem', margin: 0 }}>Employee Attendance Overview</h3>
          <p className="text-secondary text-xs" style={{ marginTop: '2px' }}>
            Verified daily attendance, leaves, and department logs for faculty, trainers, administrative, and support staff
          </p>
        </div>

        {/* Reporting Period Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <select
            className="form-select"
            value={period}
            onChange={(e) => setPeriod(e.target.value as 'today' | 'week' | 'month')}
            style={{ width: 'auto', padding: '6px 12px', fontSize: '0.8rem', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}
          >
            <option value="today">Today (Oct 21, 2026)</option>
            <option value="week">This Week (Weekly Avg)</option>
            <option value="month">This Month (October 2026)</option>
          </select>
        </div>
      </div>

      {!hasData ? (
        // Empty / Unavailable State
        <div style={{
          padding: '36px 20px',
          textAlign: 'center',
          background: 'var(--bg-input)',
          borderRadius: 'var(--radius-lg)',
          border: '1px dashed var(--border-subtle)',
          margin: '12px 0'
        }}>
          <AlertCircle size={36} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
          <h4 style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 6px' }}>No Employee Attendance Data Available</h4>
          <p className="text-muted text-xs" style={{ maxWidth: '420px', margin: '0 auto' }}>
            Employee attendance records have not been recorded or imported for this reporting period. Ensure campus biometric or HRIS logging is connected.
          </p>
        </div>
      ) : (
        <>
          {/* Key Metric Summary Cards */}
          <div className="dashboard-mini-kpi-grid" style={{ marginBottom: '22px' }}>
            {/* Total Employees */}
            <div style={{ background: 'var(--bg-input)', padding: '14px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="text-muted text-xs font-semibold">Total Employees</span>
                <Users size={16} color="var(--primary)" />
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px' }}>
                {summary.totalEmployees}
              </div>
              <span className="text-muted text-xs">8 Faculty &bull; 5 Admin &bull; 5 Support</span>
            </div>

            {/* Present Count & Rate */}
            <div style={{ background: 'var(--bg-input)', padding: '14px 16px', borderRadius: 'var(--radius-md)', borderLeft: '4px solid var(--success)', borderTop: '1px solid var(--border-subtle)', borderRight: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="text-muted text-xs font-semibold">Present Today</span>
                <span className="badge badge-active" style={{ fontSize: '0.65rem' }}>{summary.attendanceRate}%</span>
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--success)', marginTop: '4px' }}>
                {summary.presentCount}
              </div>
              <span className="text-success text-xs">
                {summary.remoteCount > 0 ? `${summary.presentCount - summary.remoteCount} On-Site + ${summary.remoteCount} Remote` : 'All On-Site'}
              </span>
            </div>

            {/* Unplanned Absent Count */}
            <div style={{ background: 'var(--bg-input)', padding: '14px 16px', borderRadius: 'var(--radius-md)', borderLeft: '4px solid var(--danger)', borderTop: '1px solid var(--border-subtle)', borderRight: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="text-muted text-xs font-semibold">Unplanned Absent</span>
                <XCircle size={16} color="var(--danger)" />
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--danger)', marginTop: '4px' }}>
                {summary.absentCount}
              </div>
              <span className="text-muted text-xs">
                {summary.absentCount === 0 ? 'Full attendance registered' : '1 Examination Staff'}
              </span>
            </div>

            {/* Approved Leave Count */}
            <div style={{ background: 'var(--bg-input)', padding: '14px 16px', borderRadius: 'var(--radius-md)', borderLeft: '4px solid var(--warning)', borderTop: '1px solid var(--border-subtle)', borderRight: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="text-muted text-xs font-semibold">Approved Leave</span>
                <Clock size={16} color="var(--warning)" />
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--warning)', marginTop: '4px' }}>
                {summary.approvedLeaveCount}
              </div>
              <span className="text-muted text-xs">Official Duty / Conference</span>
            </div>
          </div>

          {/* Department-Wise Employee Attendance Progress Bars */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>
                Department Workforce Attendance
              </span>
              <span className="text-muted text-xs">Faculty, Admin, & Operations Units</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '10px' }}>
              {departmentBreakdown.map((dept) => (
                <div
                  key={dept.department}
                  style={{
                    background: 'var(--bg-input)',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{dept.department}</span>
                    <strong style={{ color: dept.rate >= 90 ? 'var(--success)' : dept.rate >= 75 ? 'var(--info)' : 'var(--warning)' }}>
                      {dept.rate}%
                    </strong>
                  </div>
                  <div className="progress-bar-bg" style={{ height: '6px' }}>
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: `${dept.rate}%`,
                        background: dept.rate >= 90 ? 'var(--success)' : dept.rate >= 75 ? 'var(--primary)' : 'var(--warning)'
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    <span>{dept.present} of {dept.total} Present</span>
                    {dept.leave > 0 && <span style={{ color: 'var(--warning)' }}>{dept.leave} Leave</span>}
                    {dept.absent > 0 && <span style={{ color: 'var(--danger)' }}>{dept.absent} Absent</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Filter Bar & Employee Daily Roster Table */}
          <div style={{ marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>
                  Employee Daily Check-In Roster ({filteredRecords.length})
                </span>
              </div>

              {/* Filters */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {/* Search */}
                <div style={{ position: 'relative', width: '180px' }}>
                  <Search size={13} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    placeholder="Search staff..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="form-input"
                    style={{ padding: '4px 8px 4px 26px', fontSize: '0.75rem', height: '28px' }}
                  />
                </div>

                {/* Role Filter */}
                <select
                  className="form-select"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as any)}
                  style={{ width: 'auto', padding: '4px 8px', fontSize: '0.75rem', height: '28px' }}
                >
                  <option value="all">All Roles</option>
                  <option value="faculty">Faculty & Trainers</option>
                  <option value="admin_staff">Administrative Staff</option>
                  <option value="support_staff">Non-Teaching Staff</option>
                </select>

                {/* Status Filter */}
                <select
                  className="form-select"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  style={{ width: 'auto', padding: '4px 8px', fontSize: '0.75rem', height: '28px' }}
                >
                  <option value="all">All Statuses</option>
                  <option value="present">Present (On-Site/Remote)</option>
                  <option value="absent">Absent</option>
                  <option value="on_leave">Approved Leave</option>
                </select>
              </div>
            </div>

            {/* Roster Table */}
            <div className="table-container" style={{ maxHeight: '290px', overflowY: 'auto' }}>
              <table className="table" style={{ fontSize: '0.8rem' }}>
                <thead>
                  <tr>
                    <th>Employee Name & Email</th>
                    <th>Staff Role</th>
                    <th>Department</th>
                    <th>Check-In</th>
                    <th>Status</th>
                    <th>Notes / Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((emp) => (
                    <tr key={emp.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{emp.employeeName}</div>
                        <span className="text-muted text-xs">{emp.employeeEmail}</span>
                      </td>
                      <td>
                        <span className="text-secondary text-xs" style={{ fontWeight: 500 }}>
                          {emp.roleTitle}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-secondary" style={{ fontSize: '0.7rem' }}>
                          {emp.department}
                        </span>
                      </td>
                      <td>
                        {emp.checkInTime ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)' }}>
                            <Clock size={12} color="var(--primary)" /> {emp.checkInTime}
                          </span>
                        ) : (
                          <span className="text-muted text-xs">&mdash;</span>
                        )}
                      </td>
                      <td>
                        {emp.status === 'present' ? (
                          <span className="badge badge-active" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <CheckCircle2 size={11} /> Present
                          </span>
                        ) : emp.status === 'remote' ? (
                          <span className="badge badge-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <CheckCircle2 size={11} /> Remote
                          </span>
                        ) : emp.status === 'on_leave' ? (
                          <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <Clock size={11} /> On Leave
                          </span>
                        ) : (
                          <span className="badge badge-error" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <XCircle size={11} /> Absent
                          </span>
                        )}
                      </td>
                      <td>
                        <span className="text-muted text-xs" style={{ fontStyle: emp.notes ? 'normal' : 'italic' }}>
                          {emp.notes || 'Normal daily check-in'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', fontSize: '0.725rem', color: 'var(--text-muted)' }}>
              <span>Strictly computed from campus workforce logs (students are excluded from calculations).</span>
              <Link to="/people" style={{ color: 'var(--primary)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                View Full Employee Directory <ArrowUpRight size={12} />
              </Link>
            </div>
          </div>
        </>
      )}

      {/* Separate Section: Today's Class Schedule (Student Academic Schedule) */}
      <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>
              Today's Class Schedule (Student Academic Schedule)
            </h4>
            <p className="text-muted text-xs" style={{ margin: '2px 0 0' }}>
              Student cohort timetable and lecture sessions overseen by assigned faculty
            </p>
          </div>
          <Link to="/attendance" className="btn btn-secondary btn-sm" style={{ fontSize: '0.75rem', padding: '4px 10px' }}>
            Open Student Attendance Ledger &rarr;
          </Link>
        </div>

        <div className="table-container">
          <table className="table" style={{ fontSize: '0.8rem' }}>
            <thead>
              <tr>
                <th>Time</th>
                <th>Class & Course</th>
                <th>Cohort</th>
                <th>Assigned Faculty</th>
                <th>Room / Link</th>
                <th>Session Status</th>
              </tr>
            </thead>
            <tbody>
              {mockLiveSessions.slice(0, 3).map((s, idx) => (
                <tr key={s.id || idx}>
                  <td style={{ fontWeight: 600 }}>
                    {idx === 0 ? '10:00 AM' : idx === 1 ? '02:00 PM' : '04:30 PM'}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{s.title}</div>
                    <span className="text-muted text-xs">{s.durationMinutes} mins &bull; Lecture</span>
                  </td>
                  <td>
                    <span className="badge badge-secondary">{mockCohorts[idx % mockCohorts.length]?.name || 'Batch A'}</span>
                  </td>
                  <td>Dr. James Wilson</td>
                  <td>
                    <span className="text-primary text-xs" style={{ fontWeight: 600 }}>Zoom Room 102</span>
                  </td>
                  <td>
                    <span className={`badge badge-${s.status}`}>{s.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
