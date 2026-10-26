import React, { useState, useMemo } from 'react';
import { useAuthStore } from '../../../lib/store';
import { useGradingStore, StudentAssessmentSummary } from '../../../lib/gradingStore';
import { mockCourses } from '../../../data/mockData';
import { mockUsers } from '../../../data/mockUsers';
import {
  Users, CheckCircle2, Clock, Sparkles, TrendingUp, Award,
  Search, Filter, X, ChevronRight, Eye, Calendar, RefreshCw, FileText
} from 'lucide-react';

interface AiScoreSuggestionsDashboardProps {
  onOpenStudentDrawer: (studentId: string) => void;
  onOpenSubmissionModal: (attemptId: string) => void;
}

export const AiScoreSuggestionsDashboard: React.FC<AiScoreSuggestionsDashboardProps> = ({
  onOpenStudentDrawer,
  onOpenSubmissionModal,
}) => {
  const { user } = useAuthStore();
  const { attempts, tasks, acceptAiScore } = useGradingStore();

  const isFaculty = user?.activeRole === 'trainer' || user?.activeRole === 'instructor' || user?.activeRole === 'grader';
  const isAdmin = user?.activeRole === 'platform_admin' || user?.activeRole === 'org_admin' || user?.activeRole === 'lms_admin';

  // Faculty course scope
  const authorizedCourseIds = useMemo(() => {
    if (isFaculty) {
      if (user?.eligibleCourseIds && user.eligibleCourseIds.length > 0) {
        return user.eligibleCourseIds;
      }
      return ['crs-001', 'crs-002', 'crs-004']; // Default for faculty demo
    }
    return undefined; // Admin can view all
  }, [isFaculty, user]);

  // Filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedScoreRange, setSelectedScoreRange] = useState<string>('all');
  const [selectedDateRange, setSelectedDateRange] = useState<string>('all');
  const [selectedFaculty, setSelectedFaculty] = useState<string>('all');

  // Instructor list for Admin dropdown
  const facultyList = useMemo(() => {
    return mockUsers.filter((u) => u.activeRole === 'trainer' || u.activeRole === 'instructor');
  }, []);

  // Filter courses available in dropdown
  const availableCourses = useMemo(() => {
    if (isFaculty && authorizedCourseIds) {
      return mockCourses.filter((c) => authorizedCourseIds.includes(c.id));
    }
    return mockCourses;
  }, [isFaculty, authorizedCourseIds]);

  // 1. First scope attempts by RBAC (Faculty vs Admin) and Admin faculty filter
  const scopedAttempts = useMemo(() => {
    return attempts.filter((att) => {
      // Faculty scope
      if (isFaculty && authorizedCourseIds && authorizedCourseIds.length > 0) {
        if (att.courseId && !authorizedCourseIds.includes(att.courseId)) {
          return false;
        }
      }

      // Admin faculty filter
      if (isAdmin && selectedFaculty !== 'all') {
        const targetFaculty = facultyList.find((f) => f.id === selectedFaculty);
        if (targetFaculty?.eligibleCourseIds && att.courseId) {
          if (!targetFaculty.eligibleCourseIds.includes(att.courseId)) {
            return false;
          }
        }
      }

      return true;
    });
  }, [attempts, isFaculty, authorizedCourseIds, isAdmin, selectedFaculty, facultyList]);

  // 2. Aggregate attempts per student to build unique student rows
  const studentSummaries = useMemo<StudentAssessmentSummary[]>(() => {
    const studentMap = new Map<string, typeof scopedAttempts>();

    scopedAttempts.forEach((att) => {
      if (!studentMap.has(att.learnerId)) {
        studentMap.set(att.learnerId, []);
      }
      studentMap.get(att.learnerId)!.push(att);
    });

    const summaries: StudentAssessmentSummary[] = [];

    studentMap.forEach((attList, studentId) => {
      const first = attList[0];
      const completedList = attList.filter(
        (a) => a.evaluationStatus === 'published' || a.status === 'results_released'
      );
      const pendingList = attList.filter(
        (a) => a.evaluationStatus !== 'published' && a.status !== 'results_released'
      );

      const hasAiReview = attList.some((a) => a.evaluationStatus === 'ai_review_required');
      const hasAwaitingApproval = attList.some((a) => a.evaluationStatus === 'awaiting_human_approval');
      const hasPendingEval = pendingList.length > 0 && !hasAiReview && !hasAwaitingApproval;

      // Determine overall status
      let overallStatus: StudentAssessmentSummary['overallStatus'] = 'Passed';
      if (hasAiReview) {
        overallStatus = 'AI Review Required';
      } else if (hasAwaitingApproval) {
        overallStatus = 'Awaiting Human Approval';
      } else if (hasPendingEval) {
        overallStatus = 'Pending Evaluation';
      } else if (completedList.some((a) => a.passed === false)) {
        overallStatus = 'Failed';
      } else {
        overallStatus = 'Passed';
      }

      // Average score among completed
      const avgScore =
        completedList.length > 0
          ? Math.round(
              completedList.reduce((acc, curr) => acc + (curr.percentage || 0), 0) /
                completedList.length
            )
          : attList.some((a) => a.percentage !== undefined)
          ? Math.round(
              attList.reduce((acc, curr) => acc + (curr.percentage || 0), 0) / attList.length
            )
          : 0;

      // Latest score & date
      const sortedByDate = [...attList].sort((a, b) => {
        const dateA = new Date(a.submittedAt || a.startedAt || 0).getTime();
        const dateB = new Date(b.submittedAt || b.startedAt || 0).getTime();
        return dateB - dateA;
      });

      const latestAtt = sortedByDate[0];
      const latestScore = latestAtt.percentage !== undefined ? latestAtt.percentage : latestAtt.score || 0;
      const latestDate = latestAtt.submittedAt || latestAtt.startedAt || '';

      const courseIds = Array.from(new Set(attList.map((a) => a.courseId).filter(Boolean))) as string[];
      const courseTitles = Array.from(new Set(attList.map((a) => a.courseTitle).filter(Boolean))) as string[];

      summaries.push({
        studentId,
        studentName: first.learnerName,
        studentEmail: first.learnerEmail || `${first.learnerId}@lms.demo`,
        studentRollNo: first.learnerRollNo || 'STU-ID',
        studentAvatar: first.learnerAvatar || '',
        department: first.learnerDepartment || 'Software Engineering',
        courseIds,
        courseTitles,
        totalAssigned: attList.length,
        completedCount: completedList.length,
        pendingCount: pendingList.length,
        averageScore: avgScore,
        latestScore,
        latestAssessmentDate: latestDate,
        overallStatus,
      });
    });

    return summaries;
  }, [scopedAttempts]);

  // 3. Apply Multi-Faceted Filters
  const filteredStudents = useMemo(() => {
    const now = new Date().getTime();

    return studentSummaries.filter((student) => {
      // Search: name, rollNo, email
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = student.studentName.toLowerCase().includes(q);
        const matchRoll = student.studentRollNo.toLowerCase().includes(q);
        const matchEmail = student.studentEmail.toLowerCase().includes(q);
        if (!matchName && !matchRoll && !matchEmail) return false;
      }

      // Course filter
      if (selectedCourse !== 'all') {
        if (!student.courseIds.includes(selectedCourse)) return false;
      }

      // Status filter
      if (selectedStatus !== 'all') {
        if (student.overallStatus !== selectedStatus) return false;
      }

      // Score range filter
      if (selectedScoreRange !== 'all') {
        const score = student.averageScore;
        if (selectedScoreRange === '90-100' && (score < 90 || score > 100)) return false;
        if (selectedScoreRange === '75-89' && (score < 75 || score > 89)) return false;
        if (selectedScoreRange === '60-74' && (score < 60 || score > 74)) return false;
        if (selectedScoreRange === 'lt-60' && score >= 60) return false;
      }

      // Assessment Type filter
      if (selectedType !== 'all') {
        const studentAtts = scopedAttempts.filter((a) => a.learnerId === student.studentId);
        const hasType = studentAtts.some((a) => a.assessmentType === selectedType);
        if (!hasType) return false;
      }

      // Date Range filter
      if (selectedDateRange !== 'all') {
        if (!student.latestAssessmentDate) return false;
        const itemDate = new Date(student.latestAssessmentDate).getTime();
        const diffDays = (now - itemDate) / (1000 * 3600 * 24);
        if (selectedDateRange === 'today' && diffDays > 1) return false;
        if (selectedDateRange === '7days' && diffDays > 7) return false;
        if (selectedDateRange === '30days' && diffDays > 30) return false;
      }

      return true;
    });
  }, [studentSummaries, searchQuery, selectedCourse, selectedStatus, selectedScoreRange, selectedType, selectedDateRange, scopedAttempts]);

  // 4. Calculate live summary metrics based on filtered records
  const metrics = useMemo(() => {
    const totalStudents = filteredStudents.length;

    // Filter scoped attempts for the filtered students
    const activeStudentIds = new Set(filteredStudents.map((s) => s.studentId));
    const relevantAttempts = scopedAttempts.filter((a) => activeStudentIds.has(a.learnerId));

    const completed = relevantAttempts.filter(
      (a) => a.evaluationStatus === 'published' || a.status === 'results_released'
    ).length;

    const pending = relevantAttempts.filter(
      (a) => a.evaluationStatus !== 'published' && a.status !== 'results_released'
    ).length;

    const aiSuggestionsAwaitingReview = relevantAttempts.filter(
      (a) => a.evaluationStatus === 'ai_review_required'
    ).length;

    const avgScore =
      filteredStudents.length > 0
        ? Math.round(
            filteredStudents.reduce((acc, curr) => acc + curr.averageScore, 0) /
              filteredStudents.length
          )
        : 0;

    const passedStudents = filteredStudents.filter((s) => s.overallStatus === 'Passed').length;
    const completedStudents = filteredStudents.filter(
      (s) => s.overallStatus === 'Passed' || s.overallStatus === 'Failed'
    ).length;

    const passRate =
      completedStudents > 0
        ? Math.round((passedStudents / completedStudents) * 100)
        : filteredStudents.length > 0
        ? Math.round((passedStudents / filteredStudents.length) * 100)
        : 0;

    return {
      totalStudents,
      completed,
      pending,
      aiSuggestionsAwaitingReview,
      avgScore,
      passRate,
    };
  }, [filteredStudents, scopedAttempts]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCourse('all');
    setSelectedType('all');
    setSelectedStatus('all');
    setSelectedScoreRange('all');
    setSelectedDateRange('all');
    setSelectedFaculty('all');
  };

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedCourse !== 'all' ||
    selectedType !== 'all' ||
    selectedStatus !== 'all' ||
    selectedScoreRange !== 'all' ||
    selectedDateRange !== 'all' ||
    selectedFaculty !== 'all';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. Summary Cards (6 Compact Metric Cards) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '14px',
        }}
      >
        {/* Total Students Assessed */}
        <div
          className="card"
          style={{
            padding: '16px',
            margin: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            borderLeft: '4px solid var(--primary)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span className="text-muted text-xs" style={{ fontWeight: 600, textTransform: 'uppercase' }}>
              Students Assessed
            </span>
            <Users size={16} color="var(--primary)" />
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1 }}>
            {metrics.totalStudents}
          </div>
          <div className="text-muted text-xs" style={{ marginTop: '6px' }}>
            In current filter scope
          </div>
        </div>

        {/* Assessments Completed */}
        <div
          className="card"
          style={{
            padding: '16px',
            margin: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            borderLeft: '4px solid var(--success)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span className="text-muted text-xs" style={{ fontWeight: 600, textTransform: 'uppercase' }}>
              Completed
            </span>
            <CheckCircle2 size={16} color="var(--success)" />
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--success)', lineHeight: 1 }}>
            {metrics.completed}
          </div>
          <div className="text-muted text-xs" style={{ marginTop: '6px' }}>
            Graded & released
          </div>
        </div>

        {/* Pending Evaluations */}
        <div
          className="card"
          style={{
            padding: '16px',
            margin: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            borderLeft: '4px solid var(--warning)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span className="text-muted text-xs" style={{ fontWeight: 600, textTransform: 'uppercase' }}>
              Pending Eval
            </span>
            <Clock size={16} color="var(--warning)" />
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--warning)', lineHeight: 1 }}>
            {metrics.pending}
          </div>
          <div className="text-muted text-xs" style={{ marginTop: '6px' }}>
            Awaiting human sign-off
          </div>
        </div>

        {/* AI Suggestions Awaiting Review */}
        <div
          className="card"
          style={{
            padding: '16px',
            margin: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            borderLeft: '4px solid #8b5cf6',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span className="text-muted text-xs" style={{ fontWeight: 600, textTransform: 'uppercase' }}>
              AI Review Ready
            </span>
            <Sparkles size={16} color="#8b5cf6" />
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#8b5cf6', lineHeight: 1 }}>
            {metrics.aiSuggestionsAwaitingReview}
          </div>
          <div className="text-muted text-xs" style={{ marginTop: '6px' }}>
            Acuity-LLM v2 scored
          </div>
        </div>

        {/* Average Score */}
        <div
          className="card"
          style={{
            padding: '16px',
            margin: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            borderLeft: '4px solid var(--info)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span className="text-muted text-xs" style={{ fontWeight: 600, textTransform: 'uppercase' }}>
              Average Score
            </span>
            <TrendingUp size={16} color="var(--info)" />
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1 }}>
            {metrics.avgScore}%
          </div>
          <div className="text-muted text-xs" style={{ marginTop: '6px' }}>
            Across all attempts
          </div>
        </div>

        {/* Pass Rate */}
        <div
          className="card"
          style={{
            padding: '16px',
            margin: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            borderLeft: '4px solid #10b981',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span className="text-muted text-xs" style={{ fontWeight: 600, textTransform: 'uppercase' }}>
              Pass Rate
            </span>
            <Award size={16} color="#10b981" />
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#10b981', lineHeight: 1 }}>
            {metrics.passRate}%
          </div>
          <div className="text-muted text-xs" style={{ marginTop: '6px' }}>
            Benchmark: 60%
          </div>
        </div>
      </div>

      {/* 2. Compact Multi-Filter Bar */}
      <div
        className="card"
        style={{
          padding: '14px 18px',
          margin: 0,
          background: 'var(--bg-card)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={16} color="var(--primary)" />
            <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>Assessment Analytics Filters</span>
            <span className="badge badge-neutral text-xs">
              Showing {filteredStudents.length} of {studentSummaries.length} Students
            </span>
          </div>

          {hasActiveFilters && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleClearFilters}
              style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', padding: '4px 8px' }}
            >
              <X size={12} /> Clear All Filters
            </button>
          )}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '10px',
            alignItems: 'center',
          }}
        >
          {/* Search by student name, rollNo, email */}
          <div style={{ position: 'relative', minWidth: '180px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search name, ID, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '32px', height: '34px', fontSize: '0.825rem' }}
            />
          </div>

          {/* Course filter */}
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="form-select"
            style={{ height: '34px', fontSize: '0.825rem' }}
          >
            <option value="all">All Courses</option>
            {availableCourses.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>

          {/* Assessment Type */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="form-select"
            style={{ height: '34px', fontSize: '0.825rem' }}
          >
            <option value="all">All Types</option>
            <option value="quiz">Quiz</option>
            <option value="assignment">Assignment</option>
            <option value="exam">Exam</option>
            <option value="capstone">Capstone</option>
          </select>

          {/* Assessment Status */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="form-select"
            style={{ height: '34px', fontSize: '0.825rem' }}
          >
            <option value="all">All Statuses</option>
            <option value="Passed">Passed</option>
            <option value="Failed">Failed</option>
            <option value="Pending Evaluation">Pending Evaluation</option>
            <option value="AI Review Required">AI Review Required</option>
            <option value="Awaiting Human Approval">Awaiting Human Approval</option>
          </select>

          {/* Score Range */}
          <select
            value={selectedScoreRange}
            onChange={(e) => setSelectedScoreRange(e.target.value)}
            className="form-select"
            style={{ height: '34px', fontSize: '0.825rem' }}
          >
            <option value="all">All Score Ranges</option>
            <option value="90-100">90% – 100% (High)</option>
            <option value="75-89">75% – 89% (Good)</option>
            <option value="60-74">60% – 74% (Pass)</option>
            <option value="lt-60">&lt; 60% (Below Pass)</option>
          </select>

          {/* Date Range */}
          <select
            value={selectedDateRange}
            onChange={(e) => setSelectedDateRange(e.target.value)}
            className="form-select"
            style={{ height: '34px', fontSize: '0.825rem' }}
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
          </select>

          {/* Faculty / Instructor filter for Institution Admin */}
          {isAdmin && (
            <select
              value={selectedFaculty}
              onChange={(e) => setSelectedFaculty(e.target.value)}
              className="form-select"
              style={{ height: '34px', fontSize: '0.825rem', borderColor: 'var(--primary)' }}
            >
              <option value="all">All Faculty (Institution Scope)</option>
              {facultyList.map((f) => (
                <option key={f.id} value={f.id}>{f.displayName || `${f.firstName} ${f.lastName}`}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* 3. Student Assessment Table */}
      <div className="card" style={{ margin: 0, padding: 0, overflow: 'hidden' }}>
        {filteredStudents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 16px' }}>
            <FileText size={40} color="var(--text-muted)" style={{ margin: '0 auto 12px auto' }} />
            <h4 style={{ fontSize: '1.05rem', margin: '0 0 6px 0', fontWeight: 700 }}>
              No Student Assessment Records Found
            </h4>
            <p className="text-secondary text-sm" style={{ margin: '0 0 16px 0' }}>
              No students match the current search or filter combinations.
            </p>
            <button className="btn btn-secondary btn-sm" onClick={handleClearFilters}>
              Clear All Filters
            </button>
          </div>
        ) : (
          <div className="table-container">
            <table className="table" style={{ fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th>Student Name & Profile</th>
                  <th>Student ID</th>
                  <th>Course Scope</th>
                  <th style={{ textAlign: 'center' }}>Completed</th>
                  <th style={{ textAlign: 'center' }}>Pending</th>
                  <th>Avg Score</th>
                  <th>Latest Score</th>
                  <th>Last Assessment Date</th>
                  <th>Overall Status</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((st) => {
                  let statusBadgeClass = 'badge-primary';
                  if (st.overallStatus === 'Passed') statusBadgeClass = 'badge-completed';
                  else if (st.overallStatus === 'Failed') statusBadgeClass = 'badge-failed';
                  else if (st.overallStatus === 'AI Review Required') statusBadgeClass = 'badge-warning';
                  else if (st.overallStatus === 'Awaiting Human Approval') statusBadgeClass = 'badge-draft';
                  else if (st.overallStatus === 'Pending Evaluation') statusBadgeClass = 'badge-info';

                  return (
                    <tr
                      key={st.studentId}
                      style={{ cursor: 'pointer' }}
                      onClick={() => onOpenStudentDrawer(st.studentId)}
                    >
                      {/* Student Name & Profile */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '34px',
                              height: '34px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, var(--primary), #818cf8)',
                              color: '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.85rem',
                              flexShrink: 0,
                            }}
                          >
                            {st.studentName.charAt(0)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                              {st.studentName}
                            </div>
                            <div className="text-muted text-xs">
                              {st.studentEmail}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Student ID */}
                      <td>
                        <span className="badge badge-neutral text-xs">
                          {st.studentRollNo}
                        </span>
                      </td>

                      {/* Course */}
                      <td>
                        <div style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {st.courseTitles.length > 0 ? (
                            <span title={st.courseTitles.join(', ')}>
                              {st.courseTitles[0]}
                              {st.courseTitles.length > 1 && (
                                <span className="text-muted text-xs" style={{ marginLeft: '4px' }}>
                                  (+{st.courseTitles.length - 1} more)
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-muted text-xs">—</span>
                          )}
                        </div>
                      </td>

                      {/* Completed */}
                      <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--success)' }}>
                        {st.completedCount}
                      </td>

                      {/* Pending */}
                      <td style={{ textAlign: 'center', fontWeight: 600, color: st.pendingCount > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>
                        {st.pendingCount}
                      </td>

                      {/* Average Score */}
                      <td>
                        <span style={{ fontWeight: 700, color: st.averageScore >= 75 ? 'var(--success)' : st.averageScore >= 60 ? 'var(--primary)' : 'var(--danger)' }}>
                          {st.averageScore}%
                        </span>
                      </td>

                      {/* Latest Score */}
                      <td>
                        <strong style={{ color: 'var(--text-main)' }}>
                          {st.latestScore}%
                        </strong>
                      </td>

                      {/* Last Assessment Date */}
                      <td>
                        {st.latestAssessmentDate ? (
                          new Date(st.latestAssessmentDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        ) : (
                          '—'
                        )}
                      </td>

                      {/* Overall Status */}
                      <td>
                        <span className={`badge ${statusBadgeClass} text-xs`}>
                          {st.overallStatus}
                        </span>
                      </td>

                      {/* Action */}
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '4px 10px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenStudentDrawer(st.studentId);
                          }}
                        >
                          <Eye size={12} /> View Details
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
    </div>
  );
};
