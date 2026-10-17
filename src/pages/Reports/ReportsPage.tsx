import React, { useState } from 'react';
import { useAuthStore } from '../../lib/store';
import { mockReports, mockCohorts, mockCourses } from '../../data/mockData';
import { Report } from '../../types';
import {
  BarChart3, Download, Calendar, Filter, Clock, CheckCircle2,
  TrendingUp, TrendingDown, Users, BookOpen, Video, Award, RefreshCw, FileSpreadsheet
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const { user } = useAuthStore();
  const isFaculty = user?.activeRole === 'instructor';

  const [reports, setReports] = useState<Report[]>(mockReports);
  const [selectedCohort, setSelectedCohort] = useState('all');
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [dateRange, setDateRange] = useState('30d');
  const [isExporting, setIsExporting] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // Faculty assigned cohorts and courses
  const facultyCohorts = mockCohorts.filter((c) => ['coh-001', 'coh-002', 'coh-004'].includes(c.id));
  const facultyCourses = mockCourses.filter((c) => ['crs-001', 'crs-002', 'crs-004'].includes(c.id));

  const availableCohorts = isFaculty ? facultyCohorts : mockCohorts;
  const availableCourses = isFaculty ? facultyCourses : mockCourses;

  const handleExport = (reportName: string) => {
    setIsExporting(true);
    setTimeout(() => {
      // Generate actual CSV content
      const csvHeader = 'Student Name,Student ID,Assigned Course,Cohort / Batch,Syllabus Progress,Attendance Rate,Average Assessment Score,Pending Submissions\n';
      const sampleRows = [
        '"Alex Thompson","STU-2026-001","Advanced React & TypeScript Architecture","Spring 2026 Engineering","68%","96.2%","92%","0"',
        '"Maria Garcia","STU-2026-002","Advanced React & TypeScript Architecture","Spring 2026 Engineering","74%","91.5%","88%","1"',
        '"David Kim","STU-2026-003","JavaScript Fundamentals v3","Spring 2026 Engineering","92%","98.0%","94%","0"',
        '"Sarah Jenkins","STU-2026-004","Cloud Infrastructure Engineering","Summer 2026 Cloud Architects","55%","89.4%","84%","2"',
        '"Michael Brown","STU-2026-005","Advanced React & TypeScript Architecture","Spring 2026 Engineering","81%","94.0%","90%","0"'
      ].join('\n');

      const blob = new Blob([csvHeader + sampleRows], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${reportName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setIsExporting(false);
    }, 600);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '4px' }}>
            {isFaculty ? 'My Teaching Analytics & Progress Reports' : 'Analytics & Compliance Reports'}
          </h1>
          <p className="text-secondary text-sm">
            {isFaculty
              ? 'Student completion rates, assignment performance, and attendance records for your assigned classes & batches'
              : 'Role-filtered learning progress, attendance rates, assessment distributions, and automated schedules'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className="btn btn-secondary"
            onClick={() => setShowScheduleModal(true)}
          >
            <Clock size={16} /> {isFaculty ? 'Subscribe to Class Digest' : 'Schedule Recurring Delivery'}
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ padding: '16px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={16} color="var(--primary)" />
            <span className="text-sm font-semibold">Scope Filters:</span>
          </div>

          <select className="form-select" value={selectedCohort} onChange={(e) => setSelectedCohort(e.target.value)} style={{ width: 'auto' }}>
            <option value="all">{isFaculty ? 'All Assigned Classes & Batches' : 'All Cohorts (Spring & Summer 2026)'}</option>
            {availableCohorts.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select className="form-select" value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)} style={{ width: 'auto' }}>
            <option value="all">{isFaculty ? 'All Assigned Courses' : 'All Institution Courses'}</option>
            {availableCourses.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>

          <select className="form-select" value={dateRange} onChange={(e) => setDateRange(e.target.value)} style={{ width: 'auto' }}>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days (Rolling)</option>
            <option value="90d">Last 90 Days (Quarter to Date)</option>
            <option value="ytd">Year to Date (2026)</option>
          </select>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <RefreshCw size={13} /> Updated 10 minutes ago
          </div>
        </div>
      </div>

      {/* Key Metric Highlights */}
      <div className="grid-4" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <span className="text-muted text-xs font-semibold">Average Course Completion</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--success)' }}>72.4%</div>
          <span className="text-success text-xs">&uarr; +4.2% vs previous quarter</span>
        </div>

        <div className="stat-card">
          <span className="text-muted text-xs font-semibold">Assessment Pass Rate</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary)' }}>88.1%</div>
          <span className="text-muted text-xs">Passing score &ge; 70%</span>
        </div>

        <div className="stat-card">
          <span className="text-muted text-xs font-semibold">Live Class Attendance</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>84.6%</div>
          <span className="text-muted text-xs">Across Zoom/Meet sessions</span>
        </div>

        <div className="stat-card">
          <span className="text-muted text-xs font-semibold">Average Grading SLA</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>18.2 hrs</div>
          <span className="text-success text-xs">&darr; 3.5 hrs faster turnaround</span>
        </div>
      </div>

      {/* Reports Directory & Export Table */}
      <div className="card">
        <h3 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>Curated Operational Reports</h3>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Report Title</th>
                <th>Metric Category</th>
                <th>Definition & Scope</th>
                <th>Last Generated</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{r.title || r.name}</div>
                    <div className="text-muted text-xs">ID: {r.id}</div>
                  </td>
                  <td>
                    <span className="badge badge-primary">{r.category || r.type}</span>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.85rem' }}>{r.description}</div>
                  </td>
                  <td className="text-muted text-xs">
                    {new Date(r.generatedAt || Date.now()).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                  <td>
                    <button
                      className="btn btn-secondary btn-sm"
                      disabled={isExporting}
                      onClick={() => handleExport(r.title || r.name)}
                    >
                      <Download size={13} /> {isExporting ? 'Generating...' : 'Export (.csv)'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Scheduled Reports Modal */}
      {showScheduleModal && (
        <div className="modal-overlay" onClick={() => setShowScheduleModal(false)}>
          <div className="modal-card" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Configure Automated Report Delivery</h3>
              <button onClick={() => setShowScheduleModal(false)} style={{ color: 'var(--text-muted)' }}>
                X
              </button>
            </div>
            <div className="modal-body">
              <p className="text-secondary text-sm" style={{ marginBottom: '16px' }}>
                Receive automated executive summaries delivered directly to designated administrator inboxes.
              </p>
              <div className="form-group">
                <label className="form-label">Delivery Cadence</label>
                <select className="form-select">
                  <option>Every Monday at 08:00 AM (Weekly Digest)</option>
                  <option>1st Day of Each Month (Monthly Governance Summary)</option>
                  <option>Daily Incident & Proctoring Digest</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Recipient Distribution Emails</label>
                <input
                  type="text"
                  defaultValue="leadership@acmelearning.com, admin@lms.demo"
                  className="form-input"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowScheduleModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => { alert("Scheduled report cron registered."); setShowScheduleModal(false); }}>
                Save Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
