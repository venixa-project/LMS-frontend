import React, { useState, useMemo } from 'react';
import { useAuthStore } from '../../lib/store';
import {
  BarChart3, Download, Calendar, Filter, Clock, CheckCircle2,
  TrendingUp, Users, BookOpen, Award, RefreshCw, FileSpreadsheet,
  Search, RotateCcw, FileText, AlertCircle, GraduationCap, Building2,
  CheckCircle, ChevronDown
} from 'lucide-react';
import {
  ReportType, DateRangePreset, ReportFilterState,
  getReportEntities, getCourseCompletionSummaryRecords,
  getLearnerProgressRecords, getAssessmentPerformanceRecords,
  getCourseEnrollmentRecords, getPendingSubmissionsRecords,
  calculateReportMetrics, exportReportToCsv, exportReportToExcel,
  CourseCompletionRow, LearnerProgressRow, AssessmentPerformanceRow,
  CourseEnrollmentRow, PendingSubmissionRow
} from '../../lib/reportsService';

export const ReportsPage: React.FC = () => {
  const { user } = useAuthStore();

  const isTrainer = user?.activeRole === 'trainer' || user?.activeRole === 'instructor';
  const isAdmin = user?.activeRole === 'org_admin' || user?.activeRole === 'platform_admin' || user?.activeRole === 'lms_admin';
  const isStudent = user?.activeRole === 'student' || user?.activeRole === 'learner';

  // Active Report Type selection
  const [activeReport, setActiveReport] = useState<ReportType>('enrollment');

  // Multi-dimensional filters
  const [dateRange, setDateRange] = useState<DateRangePreset>('30d');
  const [customStart, setCustomStart] = useState('2026-09-27');
  const [customEnd, setCustomEnd] = useState('2026-10-27');
  const [selectedDept, setSelectedDept] = useState('all');
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [selectedTrainer, setSelectedTrainer] = useState('all');
  const [selectedCohort, setSelectedCohort] = useState('all');
  const [selectedAssessment, setSelectedAssessment] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // UI States
  const [isExporting, setIsExporting] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Load available entities from stores
  const { users, courses, cohorts, departments } = useMemo(() => getReportEntities(), []);

  // Filter available options based on user role (Security & Scope enforcement)
  const trainerAssignedCourseIds = useMemo(() => {
    if (!isTrainer) return [];
    return courses
      .filter(c => c.instructors?.includes(user?.id || '') || user?.eligibleCourseIds?.includes(c.id))
      .map(c => c.id);
  }, [courses, isTrainer, user]);

  const availableCourses = useMemo(() => {
    if (isTrainer) {
      return courses.filter(c => trainerAssignedCourseIds.includes(c.id));
    }
    return courses;
  }, [courses, isTrainer, trainerAssignedCourseIds]);

  const availableCohorts = useMemo(() => {
    if (isTrainer) {
      return cohorts.filter(ch =>
        ch.instructors?.includes(user?.id || '') ||
        ch.instructorIds?.includes(user?.id || '') ||
        (ch.courseId && trainerAssignedCourseIds.includes(ch.courseId))
      );
    }
    return cohorts;
  }, [cohorts, isTrainer, user, trainerAssignedCourseIds]);

  const availableTrainers = useMemo(() => {
    return users.filter(u => u.activeRole === 'trainer' || u.activeRole === 'instructor');
  }, [users]);

  // Construct consolidated filter state
  const filterState: ReportFilterState = useMemo(() => ({
    dateRange,
    startDate: dateRange === 'custom' ? customStart : undefined,
    endDate: dateRange === 'custom' ? customEnd : undefined,
    departmentId: selectedDept,
    courseId: selectedCourse,
    trainerId: selectedTrainer,
    cohortId: selectedCohort,
    studentId: 'all',
    assessmentId: selectedAssessment,
    searchQuery,
  }), [dateRange, customStart, customEnd, selectedDept, selectedCourse, selectedTrainer, selectedCohort, selectedAssessment, searchQuery]);

  // Compute records for all report types backed strictly by real LMS data
  const completionRows = useMemo(() => getCourseCompletionSummaryRecords(user, filterState), [user, filterState]);
  const progressRows = useMemo(() => getLearnerProgressRecords(user, filterState), [user, filterState]);
  const assessmentRows = useMemo(() => getAssessmentPerformanceRecords(user, filterState), [user, filterState]);
  const enrollmentRows = useMemo(() => getCourseEnrollmentRecords(user, filterState), [user, filterState]);
  const pendingRows = useMemo(() => getPendingSubmissionsRecords(user, filterState), [user, filterState]);

  // Summary KPI Metrics
  const metrics = useMemo(() => {
    return calculateReportMetrics(completionRows, assessmentRows, enrollmentRows, pendingRows);
  }, [completionRows, assessmentRows, enrollmentRows, pendingRows]);

  // Reset Filters to default scope
  const handleResetFilters = () => {
    setDateRange('30d');
    setCustomStart('2026-09-27');
    setCustomEnd('2026-10-27');
    setSelectedDept('all');
    setSelectedCourse('all');
    setSelectedTrainer('all');
    setSelectedCohort('all');
    setSelectedAssessment('all');
    setSearchQuery('');
  };

  const isFilterActive =
    dateRange !== '30d' ||
    selectedDept !== 'all' ||
    selectedCourse !== 'all' ||
    selectedTrainer !== 'all' ||
    selectedCohort !== 'all' ||
    selectedAssessment !== 'all' ||
    searchQuery.trim().length > 0;

  const activeRecordsCount = useMemo(() => {
    switch (activeReport) {
      case 'completion': return completionRows.length;
      case 'progress': return progressRows.length;
      case 'assessment': return assessmentRows.length;
      case 'enrollment': return enrollmentRows.length;
      case 'submissions': return pendingRows.length;
    }
  }, [activeReport, completionRows, progressRows, assessmentRows, enrollmentRows, pendingRows]);

  const activeReportName = useMemo(() => {
    switch (activeReport) {
      case 'completion': return 'Course Completion Summary';
      case 'progress': return 'Learner Progress Report';
      case 'assessment': return 'Assessment Performance';
      case 'enrollment': return 'Course Enrollment Summary';
      case 'submissions': return 'Pending Submissions';
    }
  }, [activeReport]);

  const getExportMeta = () => {
    const scopeParts: string[] = [];
    if (selectedDept !== 'all') {
      const d = departments.find(dep => dep.id === selectedDept);
      scopeParts.push(`Department: ${d?.name || selectedDept}`);
    }
    if (selectedCourse !== 'all') {
      const c = courses.find(crs => crs.id === selectedCourse);
      scopeParts.push(`Course: ${c?.title || selectedCourse}`);
    }
    if (selectedCohort !== 'all') {
      const ch = cohorts.find(coh => coh.id === selectedCohort);
      scopeParts.push(`Cohort: ${ch?.name || selectedCohort}`);
    }
    if (isTrainer) {
      scopeParts.push(`Trainer: ${user?.displayName} (Assigned Courses)`);
    } else {
      scopeParts.push('Scope: Institution-Wide');
    }

    const dateLabels: Record<DateRangePreset, string> = {
      today: 'Today (2026-10-27)',
      '7d': 'Last 7 Days',
      '30d': 'Last 30 Days (Rolling)',
      this_month: 'This Month (October 2026)',
      prev_month: 'Previous Month (September 2026)',
      custom: `Custom: ${customStart} to ${customEnd}`,
    };

    return {
      reportName: activeReportName,
      generatedBy: user?.displayName || 'Authorized User',
      scopeDescription: scopeParts.join(' | '),
      dateRangeLabel: dateLabels[dateRange],
      totalRecords: activeRecordsCount,
    };
  };

  const handleExport = (format: 'csv' | 'xlsx', targetReport = activeReport) => {
    setIsExporting(true);
    setShowExportMenu(false);

    setTimeout(() => {
      let rows: unknown[] = [];
      switch (targetReport) {
        case 'completion': rows = completionRows; break;
        case 'progress': rows = progressRows; break;
        case 'assessment': rows = assessmentRows; break;
        case 'enrollment': rows = enrollmentRows; break;
        case 'submissions': rows = pendingRows; break;
      }

      const meta = getExportMeta();

      if (format === 'csv') {
        exportReportToCsv(targetReport, rows, meta);
        setExportNotice(`Exported ${rows.length} records to CSV format with UTF-8 BOM.`);
      } else {
        exportReportToExcel(targetReport, rows, meta);
        setExportNotice(`Generated Excel spreadsheet (.xlsx) with auto-filtered columns.`);
      }

      setIsExporting(false);
      setTimeout(() => setExportNotice(null), 4000);
    }, 400);
  };

  // Student Access Barrier (Data Security & Tenant Isolation)
  if (isStudent) {
    return (
      <div style={{ maxWidth: '640px', margin: '48px auto', textAlign: 'center', padding: '32px' }} className="card">
        <AlertCircle size={48} color="var(--warning)" style={{ margin: '0 auto 16px' }} />
        <h2 style={{ fontSize: '1.4rem', marginBottom: '8px' }}>Administrative Reporting Restricted</h2>
        <p className="text-secondary text-sm" style={{ marginBottom: '24px' }}>
          Performance metrics, institutional progress ledgers, and export facilities are reserved for Institution Administrators and Faculty members.
        </p>
        <a href="/my-learning" className="btn btn-primary">
          Return to My Enrolled Courses
        </a>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: '40px' }}>
      {/* Top Banner Notice */}
      {exportNotice && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 9999,
          background: 'var(--bg-surface-elevated, #1a1738)',
          border: '1px solid var(--success)',
          color: 'var(--text-primary)',
          borderRadius: '8px',
          padding: '12px 18px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '0.9rem',
          fontWeight: 600
        }}>
          <CheckCircle size={18} color="var(--success)" />
          {exportNotice}
        </div>
      )}

      {/* Header Section */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span className={`badge ${isAdmin ? 'badge-primary' : 'badge-secondary'}`}>
              {isAdmin ? 'Institution-Wide Governance' : 'Faculty Course Scoped'}
            </span>
            <span className="text-muted text-xs">Simulated Anchor: Oct 27, 2026</span>
          </div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, marginBottom: '4px' }}>
            {isTrainer ? 'My Teaching Analytics & Performance Reports' : 'Institution Reports & Analytics'}
          </h1>
          <p className="text-secondary text-sm">
            {isTrainer
              ? `Authorized student completion rates, assessment pass distribution, and enrollment records for your assigned courses (${availableCourses.length}) and cohorts (${availableCohorts.length}).`
              : 'Enterprise learning progress, course completion rates, assessment score distribution, and audit-ready data exports across all departments.'}
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', position: 'relative' }}>
          <button
            className="btn btn-secondary"
            onClick={() => setShowScheduleModal(true)}
          >
            <Clock size={16} /> {isTrainer ? 'Class Digest Schedule' : 'Schedule Delivery'}
          </button>

          {/* Export Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              className="btn btn-primary"
              disabled={isExporting}
              onClick={() => setShowExportMenu(!showExportMenu)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Download size={16} />
              <span>{isExporting ? 'Exporting...' : 'Export Report'}</span>
              <ChevronDown size={14} />
            </button>

            {showExportMenu && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '6px',
                  background: 'var(--bg-surface-elevated, #1e1b4b)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '8px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                  minWidth: '220px',
                  zIndex: 100,
                  padding: '6px',
                }}
              >
                <button
                  onClick={() => handleExport('xlsx')}
                  className="btn btn-sm"
                  style={{
                    width: '100%',
                    justifyContent: 'flex-start',
                    gap: '10px',
                    padding: '10px 12px',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-primary)',
                    textAlign: 'left'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <FileSpreadsheet size={16} color="var(--success)" />
                  <div>
                    <div style={{ fontWeight: 600 }}>Export to Excel (.xlsx)</div>
                    <div className="text-muted text-xs">Formatted spreadsheet with filters</div>
                  </div>
                </button>

                <button
                  onClick={() => handleExport('csv')}
                  className="btn btn-sm"
                  style={{
                    width: '100%',
                    justifyContent: 'flex-start',
                    gap: '10px',
                    padding: '10px 12px',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-primary)',
                    textAlign: 'left'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <FileText size={16} color="var(--primary)" />
                  <div>
                    <div style={{ fontWeight: 600 }}>Export to CSV (.csv)</div>
                    <div className="text-muted text-xs">UTF-8 BOM comma-separated values</div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={18} color="var(--primary)" />
            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>
              {isTrainer ? 'Trainer Scoped Filters:' : 'Multi-Dimensional Institution Filters:'}
            </span>
            {isFilterActive && (
              <span className="badge badge-primary" style={{ fontSize: '0.75rem' }}>
                Filters Active
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={handleResetFilters}
              className="btn btn-secondary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}
              title="Reset all filters to default rolling 30 days scope"
            >
              <RotateCcw size={13} /> Reset Filters
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <RefreshCw size={13} /> Live synced
            </div>
          </div>
        </div>

        {/* Filter Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', alignItems: 'flex-end' }}>
          {/* Date Range Preset */}
          <div>
            <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '4px' }}>
              <Calendar size={13} style={{ display: 'inline', marginRight: '4px' }} /> Date Period
            </label>
            <select
              className="form-select"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRangePreset)}
            >
              <option value="today">Today (Oct 27, 2026)</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days (Rolling)</option>
              <option value="this_month">This Month (October 2026)</option>
              <option value="prev_month">Previous Month (September 2026)</option>
              <option value="custom">Custom Date Range...</option>
            </select>
          </div>

          {/* Custom Date Pickers */}
          {dateRange === 'custom' && (
            <>
              <div>
                <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '4px' }}>Start Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '4px' }}>End Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                />
              </div>
            </>
          )}

          {/* Department Filter (Admin only) */}
          {isAdmin && (
            <div>
              <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '4px' }}>
                <Building2 size={13} style={{ display: 'inline', marginRight: '4px' }} /> Department
              </label>
              <select
                className="form-select"
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
              >
                <option value="all">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Course Filter */}
          <div>
            <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '4px' }}>
              <BookOpen size={13} style={{ display: 'inline', marginRight: '4px' }} /> {isTrainer ? 'Assigned Course' : 'Course'}
            </label>
            <select
              className="form-select"
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
            >
              <option value="all">{isTrainer ? 'All My Assigned Courses' : 'All Courses'}</option>
              {availableCourses.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>

          {/* Cohort / Batch Filter */}
          <div>
            <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '4px' }}>
              <Users size={13} style={{ display: 'inline', marginRight: '4px' }} /> {isTrainer ? 'Assigned Cohort / Batch' : 'Cohort / Batch'}
            </label>
            <select
              className="form-select"
              value={selectedCohort}
              onChange={(e) => setSelectedCohort(e.target.value)}
            >
              <option value="all">{isTrainer ? 'All My Assigned Cohorts' : 'All Cohorts'}</option>
              {availableCohorts.map((ch) => (
                <option key={ch.id} value={ch.id}>{ch.name} ({ch.code || ch.id})</option>
              ))}
            </select>
          </div>

          {/* Trainer Filter (Admin only) */}
          {isAdmin && (
            <div>
              <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '4px' }}>
                <GraduationCap size={13} style={{ display: 'inline', marginRight: '4px' }} /> Trainer / Faculty
              </label>
              <select
                className="form-select"
                value={selectedTrainer}
                onChange={(e) => setSelectedTrainer(e.target.value)}
              >
                <option value="all">All Trainers & Faculty</option>
                {availableTrainers.map((tr) => (
                  <option key={tr.id} value={tr.id}>{tr.displayName || tr.firstName}</option>
                ))}
              </select>
            </div>
          )}

          {/* Quick Search */}
          <div>
            <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '4px' }}>
              <Search size={13} style={{ display: 'inline', marginRight: '4px' }} /> Search Filter
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="Search by student name, ID, or course..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Key Metric Highlights (Calculated from Real Filtered Records) */}
      <div className="grid-4" style={{ marginBottom: '24px', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span className="text-muted text-xs font-semibold">Total Enrolled Students</span>
            <Users size={16} color="var(--primary)" />
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: 800 }}>{metrics.totalEnrolledStudents}</div>
          <span className="text-secondary text-xs">In filtered scope</span>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span className="text-muted text-xs font-semibold">Course Completion Rate</span>
            <Award size={16} color="var(--success)" />
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--success)' }}>
            {metrics.courseCompletionRate}%
          </div>
          <span className="text-success text-xs">&uarr; Based on 100% syllabus</span>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span className="text-muted text-xs font-semibold">Assessment Pass Rate</span>
            <CheckCircle2 size={16} color="var(--primary)" />
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--primary)' }}>
            {metrics.assessmentPassRate}%
          </div>
          <span className="text-muted text-xs">Threshold &ge; 70%</span>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span className="text-muted text-xs font-semibold">Average Assessment Score</span>
            <TrendingUp size={16} color="var(--accent-cyan, #06b6d4)" />
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--accent-cyan, #06b6d4)' }}>
            {metrics.averageAssessmentScore}%
          </div>
          <span className="text-muted text-xs">Across completed attempts</span>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span className="text-muted text-xs font-semibold">Pending Submissions</span>
            <Clock size={16} color="var(--warning)" />
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: 800, color: metrics.pendingSubmissionsCount > 0 ? 'var(--warning)' : 'inherit' }}>
            {metrics.pendingSubmissionsCount}
          </div>
          <span className="text-muted text-xs">Awaiting evaluation</span>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span className="text-muted text-xs font-semibold">Active Enrollments</span>
            <BookOpen size={16} color="var(--primary)" />
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--primary)' }}>
            {metrics.activeEnrollmentsCount}
          </div>
          <span className="text-muted text-xs">Active learning pathways</span>
        </div>
      </div>

      {/* Report Types Tabs Navigation */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '4px' }}>
        {[
          { id: 'enrollment' as ReportType, label: 'Course Enrollment Summary', icon: GraduationCap, count: enrollmentRows.length },
          { id: 'completion' as ReportType, label: 'Course Completion Summary', icon: Award, count: completionRows.length },
          { id: 'progress' as ReportType, label: 'Learner Progress Report', icon: TrendingUp, count: progressRows.length },
          { id: 'assessment' as ReportType, label: 'Assessment Performance', icon: CheckCircle2, count: assessmentRows.length },
          { id: 'submissions' as ReportType, label: 'Pending Submissions', icon: Clock, count: pendingRows.length },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeReport === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveReport(tab.id)}
              className={`btn ${isActive ? 'btn-primary' : 'btn-secondary'}`}
              style={{
                borderRadius: '8px',
                padding: '10px 16px',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                whiteSpace: 'nowrap',
              }}
            >
              <Icon size={15} />
              <span>{tab.label}</span>
              <span
                style={{
                  background: isActive ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)',
                  padding: '2px 7px',
                  borderRadius: '10px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                }}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Report Table & Live Preview */}
      <div className="card" style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
              {activeReportName}
            </h3>
            <p className="text-secondary text-xs" style={{ margin: '4px 0 0' }}>
              Showing {activeRecordsCount} matching records for selected date range and scope filters.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => handleExport('xlsx')}
              disabled={isExporting || activeRecordsCount === 0}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <FileSpreadsheet size={14} color="var(--success)" /> Export Excel (.xlsx)
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => handleExport('csv')}
              disabled={isExporting || activeRecordsCount === 0}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Download size={14} color="var(--primary)" /> Export CSV (.csv)
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="table-container" style={{ overflowX: 'auto' }}>
          {activeRecordsCount === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center' }}>
              <AlertCircle size={36} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontWeight: 600, marginBottom: '4px' }}>No Matching Records Found</div>
              <p className="text-secondary text-sm" style={{ maxWidth: '400px', margin: '0 auto 16px' }}>
                No records match your selected date range or scope criteria. Try broadening your date range or resetting filters.
              </p>
              <button onClick={handleResetFilters} className="btn btn-secondary btn-sm">
                <RotateCcw size={13} /> Reset Filters
              </button>
            </div>
          ) : activeReport === 'completion' ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Student ID</th>
                  <th>Course Name</th>
                  <th>Cohort / Batch</th>
                  <th>Syllabus Progress</th>
                  <th>Avg Assessment Score</th>
                  <th>Pending Submissions</th>
                  <th>Completion Status</th>
                  <th>Last Activity Date</th>
                </tr>
              </thead>
              <tbody>
                {(completionRows as CourseCompletionRow[]).map((r, i) => (
                  <tr key={`${r.studentId}-${r.courseId}-${i}`}>
                    <td style={{ fontWeight: 600 }}>{r.studentName}</td>
                    <td><span className="badge badge-secondary" style={{ fontSize: '0.75rem' }}>{r.studentId}</span></td>
                    <td style={{ maxWidth: '220px' }}>
                      <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.courseName}</div>
                      <div className="text-muted text-xs">{r.departmentName}</div>
                    </td>
                    <td>{r.cohortName}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '60px', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${r.syllabusProgress}%`, height: '100%', background: r.syllabusProgress >= 100 ? 'var(--success)' : 'var(--primary)' }} />
                        </div>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{r.syllabusProgress}%</span>
                      </div>
                    </td>
                    <td>
                      {r.avgAssessmentScore !== null ? (
                        <span style={{ fontWeight: 600, color: r.avgAssessmentScore >= 70 ? 'var(--success)' : 'var(--warning)' }}>
                          {r.avgAssessmentScore}%
                        </span>
                      ) : (
                        <span className="text-muted text-xs">No Attempts</span>
                      )}
                    </td>
                    <td>
                      {r.pendingSubmissionsCount > 0 ? (
                        <span className="badge badge-warning">{r.pendingSubmissionsCount} pending</span>
                      ) : (
                        <span className="text-muted text-xs">0</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${
                        r.completionStatus === 'Completed' ? 'badge-success' :
                        r.completionStatus === 'At Risk' ? 'badge-danger' :
                        'badge-primary'
                      }`}>
                        {r.completionStatus}
                      </span>
                    </td>
                    <td className="text-muted text-xs">
                      {new Date(r.lastActivityDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : activeReport === 'progress' ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Student ID</th>
                  <th>Department</th>
                  <th>Cohort</th>
                  <th>Enrolled Courses</th>
                  <th>Completed Courses</th>
                  <th>Avg Progress</th>
                  <th>Avg Score</th>
                  <th>Certificates</th>
                  <th>Standing</th>
                  <th>Last Active</th>
                </tr>
              </thead>
              <tbody>
                {(progressRows as LearnerProgressRow[]).map((r, i) => (
                  <tr key={`${r.studentId}-${i}`}>
                    <td style={{ fontWeight: 600 }}>{r.studentName}</td>
                    <td><span className="badge badge-secondary" style={{ fontSize: '0.75rem' }}>{r.studentId}</span></td>
                    <td>{r.departmentName}</td>
                    <td>{r.cohortName}</td>
                    <td>{r.enrolledCoursesCount}</td>
                    <td>{r.completedCoursesCount}</td>
                    <td>
                      <span style={{ fontWeight: 600 }}>{r.avgSyllabusProgress}%</span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: r.avgAssessmentScore >= 75 ? 'var(--success)' : 'inherit' }}>
                        {r.avgAssessmentScore}%
                      </span>
                    </td>
                    <td>
                      {r.certificatesEarnedCount > 0 ? (
                        <span className="badge badge-success"><Award size={11} style={{ marginRight: '3px' }} />{r.certificatesEarnedCount}</span>
                      ) : (
                        <span className="text-muted text-xs">0</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${
                        r.overallStanding === 'Dean\'s List' ? 'badge-primary' :
                        r.overallStanding === 'Good Standing' ? 'badge-success' :
                        'badge-warning'
                      }`}>
                        {r.overallStanding}
                      </span>
                    </td>
                    <td className="text-muted text-xs">{new Date(r.lastActivityDate).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : activeReport === 'assessment' ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Assessment Title</th>
                  <th>Course</th>
                  <th>Student Name</th>
                  <th>Student ID</th>
                  <th>Cohort</th>
                  <th>Score / Total</th>
                  <th>Percentage</th>
                  <th>Result</th>
                  <th>Evaluation Status</th>
                  <th>Submitted At</th>
                </tr>
              </thead>
              <tbody>
                {(assessmentRows as AssessmentPerformanceRow[]).map((r, i) => (
                  <tr key={`${r.attemptId}-${i}`}>
                    <td style={{ fontWeight: 600 }}>{r.assessmentTitle}</td>
                    <td>{r.courseTitle}</td>
                    <td>{r.studentName}</td>
                    <td><span className="badge badge-secondary" style={{ fontSize: '0.75rem' }}>{r.studentRollNo}</span></td>
                    <td>{r.cohortName}</td>
                    <td>{r.score} / {r.totalMarks}</td>
                    <td>
                      <span style={{ fontWeight: 700, color: r.percentage >= 70 ? 'var(--success)' : 'var(--danger)' }}>
                        {r.percentage}%
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${r.passed ? 'badge-success' : 'badge-danger'}`}>
                        {r.passed ? 'Passed' : 'Failed'}
                      </span>
                    </td>
                    <td><span className="badge badge-secondary">{r.evaluationStatus}</span></td>
                    <td className="text-muted text-xs">{new Date(r.submittedAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : activeReport === 'enrollment' ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Student ID</th>
                  <th>Course Name</th>
                  <th>Cohort / Batch</th>
                  <th>Department</th>
                  <th>Enrollment Date</th>
                  <th>Status</th>
                  <th>Syllabus Progress</th>
                  <th>Target Due Date</th>
                  <th>Assigned Faculty</th>
                </tr>
              </thead>
              <tbody>
                {(enrollmentRows as CourseEnrollmentRow[]).map((r, i) => (
                  <tr key={`${r.enrollmentId}-${i}`}>
                    <td style={{ fontWeight: 600 }}>{r.studentName}</td>
                    <td><span className="badge badge-secondary" style={{ fontSize: '0.75rem' }}>{r.rollNo}</span></td>
                    <td style={{ fontWeight: 600 }}>{r.courseName}</td>
                    <td>{r.cohortName}</td>
                    <td>{r.departmentName}</td>
                    <td className="text-muted text-xs">{new Date(r.enrolledAt).toLocaleDateString()}</td>
                    <td>
                      <span className={`badge ${r.status === 'Completed' ? 'badge-success' : 'badge-primary'}`}>
                        {r.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '60px', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${r.syllabusProgress}%`, height: '100%', background: r.syllabusProgress >= 100 ? 'var(--success)' : 'var(--primary)' }} />
                        </div>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{r.syllabusProgress}%</span>
                      </div>
                    </td>
                    <td className="text-muted text-xs">{r.dueDate}</td>
                    <td>{r.assignedFacultyName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Assessment Title</th>
                  <th>Course</th>
                  <th>Student Name</th>
                  <th>Student ID</th>
                  <th>Cohort</th>
                  <th>Status</th>
                  <th>Due Date</th>
                  <th>Days Pending</th>
                  <th>Assigned Grader</th>
                </tr>
              </thead>
              <tbody>
                {(pendingRows as PendingSubmissionRow[]).map((r, i) => (
                  <tr key={`${r.taskId}-${i}`}>
                    <td style={{ fontWeight: 600 }}>{r.assessmentTitle}</td>
                    <td>{r.courseTitle}</td>
                    <td>{r.studentName}</td>
                    <td><span className="badge badge-secondary" style={{ fontSize: '0.75rem' }}>{r.studentRollNo}</span></td>
                    <td>{r.cohortName}</td>
                    <td>
                      <span className={`badge ${r.status === 'assigned' ? 'badge-primary' : 'badge-warning'}`}>
                        {r.status === 'assigned' ? 'Assigned' : 'Unassigned in Queue'}
                      </span>
                    </td>
                    <td className="text-muted text-xs">{r.dueDate}</td>
                    <td>
                      <span className="badge badge-danger">{r.daysPending} days</span>
                    </td>
                    <td>{r.assignedGraderName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Curated Operational Reports Directory (Existing LMS Data) */}
      <div className="card">
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '6px' }}>Curated Operational Reports Directory</h3>
        <p className="text-secondary text-sm" style={{ marginBottom: '16px' }}>
          Standardized institutional reports available for direct spreadsheet export and instant audit review.
        </p>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Report Title</th>
                <th>Category</th>
                <th>Definition & Scope</th>
                <th>Matching Records</th>
                <th>Quick Actions</th>
              </tr>
            </thead>
            <tbody>
              {[
                { id: 'completion' as ReportType, title: 'Course Completion Summary', category: 'Academic Progress', desc: 'Student-level completion rates, syllabus progress, and course statuses across authorized cohorts.', count: completionRows.length },
                { id: 'progress' as ReportType, title: 'Learner Progress Report', category: 'Student Insights', desc: 'Consolidated learner performance across multiple courses, average grades, and standing.', count: progressRows.length },
                { id: 'assessment' as ReportType, title: 'Assessment Performance', category: 'Evaluations', desc: 'Exam and quiz attempt records, percentage distributions, and pass/fail statuses.', count: assessmentRows.length },
                { id: 'enrollment' as ReportType, title: 'Course Enrollment Summary', category: 'Enrollments & Roster', desc: 'Active student enrollments, cohort assignments, target deadlines, and syllabus progress.', count: enrollmentRows.length },
                { id: 'submissions' as ReportType, title: 'Pending Submissions', category: 'Grading Oversight', desc: 'Unmarked assignments and quiz submissions with SLA turnaround tracking.', count: pendingRows.length },
              ].map((r) => (
                <tr key={r.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{r.title}</div>
                    <div className="text-muted text-xs">Type: {r.id}</div>
                  </td>
                  <td>
                    <span className="badge badge-primary">{r.category}</span>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.85rem' }}>{r.desc}</div>
                  </td>
                  <td>
                    <span className="badge badge-secondary">{r.count} records</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          setActiveReport(r.id);
                          window.scrollTo({ top: 300, behavior: 'smooth' });
                        }}
                      >
                        Preview
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleExport('xlsx', r.id)}
                        disabled={isExporting || r.count === 0}
                        title="Download formatted Excel (.xlsx)"
                      >
                        <FileSpreadsheet size={13} color="var(--success)" /> .xlsx
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleExport('csv', r.id)}
                        disabled={isExporting || r.count === 0}
                        title="Download CSV (.csv)"
                      >
                        <Download size={13} /> .csv
                      </button>
                    </div>
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
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p className="text-secondary text-sm" style={{ marginBottom: '16px' }}>
                Receive automated summaries delivered directly to designated administrator inboxes on a recurring cron cadence.
              </p>
              <div className="form-group">
                <label className="form-label">Report Type</label>
                <select className="form-select">
                  <option>Course Completion Summary</option>
                  <option>Learner Progress Report</option>
                  <option>Assessment Performance</option>
                  <option>Course Enrollment Summary</option>
                  <option>Pending Submissions Digest</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Delivery Cadence</label>
                <select className="form-select">
                  <option>Every Monday at 08:00 AM (Weekly Digest)</option>
                  <option>1st Day of Each Month (Monthly Governance Summary)</option>
                  <option>Daily Incident & Proctoring Digest</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Export Format</label>
                <select className="form-select">
                  <option>Excel Workbook (.xlsx)</option>
                  <option>Comma-Separated Values (.csv)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Recipient Distribution Emails</label>
                <input
                  type="text"
                  defaultValue={isAdmin ? "leadership@acmelearning.com, admin@lms.demo" : user?.email || "trainer@lms.demo"}
                  className="form-input"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowScheduleModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => {
                setExportNotice("Automated scheduled delivery registered successfully.");
                setShowScheduleModal(false);
                setTimeout(() => setExportNotice(null), 3500);
              }}>
                Save Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
