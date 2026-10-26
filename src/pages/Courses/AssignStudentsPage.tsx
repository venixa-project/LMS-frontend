import React, { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../lib/store';
import { useCourseStore } from '../../lib/courseStore';
import { usePeopleStore } from '../../lib/peopleStore';
import { useCohortStore } from '../../lib/cohortStore';
import { mockDepartments } from '../../data/mockData';
import {
  ArrowLeft,
  Users,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  CheckSquare,
  Square,
  X,
  UserCheck,
  UserPlus,
  Clock,
  Layers,
  GraduationCap,
  Sparkles,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

export const AssignStudentsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { user } = useAuthStore();
  const { courses, getCourseById, enrollments, assignStudentsToCourse } = useCourseStore();
  const { getStudents } = usePeopleStore();
  const { cohorts } = useCohortStore();

  // Role permissions check
  const isPlatformAdmin = user?.activeRole === 'platform_admin';
  const isOrgAdmin =
    user?.activeRole === 'org_admin' ||
    user?.activeRole === 'lms_admin' ||
    (user?.activeRole as string) === 'industrial_admin';
  const isFaculty = user?.activeRole === 'trainer' || user?.activeRole === 'instructor';
  const isLearner = user?.activeRole === 'student' || user?.activeRole === 'learner';
  const isAdmin = isPlatformAdmin || isOrgAdmin || (!isFaculty && !isLearner);

  // Target course resolution
  const targetCourseId = id || courses[0]?.id;
  const course = getCourseById(targetCourseId || '') || courses[0];

  // Faculty access check
  const isTrainerAssignedCourse = useMemo(() => {
    if (!course || !isFaculty) return true;
    const trainerId = user?.id || '';
    const assignedIds = course.instructors || [];
    const isTrainerWilson = trainerId === 'u-004' || user?.email === 'trainer@lms.demo';
    const wilsonCourses = ['crs-001', 'crs-002', 'crs-004'];
    if (isTrainerWilson && wilsonCourses.includes(course.id)) return true;
    return assignedIds.includes(trainerId) || course.createdBy === trainerId;
  }, [course, isFaculty, user]);

  // All students from people store
  const allStudents = useMemo(() => {
    return getStudents();
  }, [getStudents]);

  // Filter & Search states
  const [selectedDeptId, setSelectedDeptId] = useState<string>('all');
  const [selectedCohortId, setSelectedCohortId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

  // Confirmation Modal & Results State
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assignmentResult, setAssignmentResult] = useState<{
    success: boolean;
    addedCount: number;
    alreadyEnrolledCount: number;
    message: string;
  } | null>(null);

  // Cohort lookup helper
  const getStudentCohort = (studentId: string) => {
    const foundCohort = cohorts.find(
      (c) => c.studentIds && c.studentIds.includes(studentId)
    );
    return foundCohort;
  };

  // Department lookup helper
  const getDepartmentName = (deptId?: string) => {
    if (!deptId) return 'General';
    const found = mockDepartments.find((d) => d.id === deptId);
    return found ? found.name : deptId;
  };

  // Enrolled student IDs for this course
  const enrolledStudentIdsForCourse = useMemo(() => {
    if (!course) return new Set<string>();
    return new Set(
      enrollments.filter((e) => e.courseId === course.id).map((e) => e.userId)
    );
  }, [course, enrollments]);

  // Cohort options filtered by department (if department is selected)
  const availableCohorts = useMemo(() => {
    if (selectedDeptId === 'all') return cohorts;
    return cohorts.filter((c) => c.departmentId === selectedDeptId);
  }, [cohorts, selectedDeptId]);

  // Filtered students list
  const filteredStudents = useMemo(() => {
    return allStudents.filter((st) => {
      // 1. Department Filter
      if (selectedDeptId !== 'all') {
        if (st.departmentId !== selectedDeptId) {
          return false;
        }
      }

      // 2. Cohort Filter
      if (selectedCohortId !== 'all') {
        const targetCohort = cohorts.find((c) => c.id === selectedCohortId);
        if (!targetCohort || !targetCohort.studentIds?.includes(st.id)) {
          return false;
        }
      }

      // 3. Search Query (Name, ID / Roll No, Email)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatches =
          (st.displayName && st.displayName.toLowerCase().includes(q)) ||
          `${st.firstName} ${st.lastName}`.toLowerCase().includes(q);
        const emailMatches = st.email && st.email.toLowerCase().includes(q);
        const idMatches =
          (st.rollNo && st.rollNo.toLowerCase().includes(q)) ||
          st.id.toLowerCase().includes(q);

        if (!nameMatches && !emailMatches && !idMatches) {
          return false;
        }
      }

      return true;
    });
  }, [allStudents, selectedDeptId, selectedCohortId, searchQuery, cohorts]);

  // Eligible students in currently filtered view
  const eligibleStudentsInView = useMemo(() => {
    return filteredStudents.filter(
      (s) => s.status === 'active' && !enrolledStudentIdsForCourse.has(s.id)
    );
  }, [filteredStudents, enrolledStudentIdsForCourse]);

  // Bulk selection handlers
  const handleToggleStudent = (studentId: string) => {
    if (enrolledStudentIdsForCourse.has(studentId)) return;
    const targetStudent = allStudents.find((s) => s.id === studentId);
    if (targetStudent?.status !== 'active') return;

    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  };

  const handleSelectAllEligible = () => {
    const next = new Set(selectedStudentIds);
    eligibleStudentsInView.forEach((s) => next.add(s.id));
    setSelectedStudentIds(next);
  };

  const handleDeselectAll = () => {
    setSelectedStudentIds(new Set());
  };

  const isAllEligibleSelected =
    eligibleStudentsInView.length > 0 &&
    eligibleStudentsInView.every((s) => selectedStudentIds.has(s.id));

  const handleToggleSelectAllInView = () => {
    if (isAllEligibleSelected) {
      // Unselect only those in current view
      setSelectedStudentIds((prev) => {
        const next = new Set(prev);
        eligibleStudentsInView.forEach((s) => next.delete(s.id));
        return next;
      });
    } else {
      handleSelectAllEligible();
    }
  };

  // Execute Assignment
  const handleConfirmAssignment = () => {
    if (!course || selectedStudentIds.size === 0) return;
    setIsSubmitting(true);

    const idsToAssign = Array.from(selectedStudentIds);
    const cohortToAttach = selectedCohortId !== 'all' ? selectedCohortId : undefined;

    const res = assignStudentsToCourse(course.id, idsToAssign, cohortToAttach);

    setIsSubmitting(false);
    setIsConfirmOpen(false);
    setSelectedStudentIds(new Set());
    setAssignmentResult(res);
  };

  // If user is a student or unauthorized trainer, restrict access
  if (isLearner) {
    return (
      <div style={{ padding: '3rem 1rem', textAlign: 'center' }}>
        <AlertCircle size={48} color="var(--danger)" style={{ marginBottom: '1rem' }} />
        <h2>Access Restricted</h2>
        <p className="text-secondary" style={{ maxWidth: '480px', margin: '0 auto 1.5rem auto' }}>
          Student accounts do not have administrative permissions to assign course enrollments.
        </p>
        <Link to="/courses" className="btn btn-primary">
          Return to Course Catalog
        </Link>
      </div>
    );
  }

  if (isFaculty && !isTrainerAssignedCourse) {
    return (
      <div style={{ padding: '3rem 1rem', textAlign: 'center' }}>
        <AlertCircle size={48} color="var(--warning)" style={{ marginBottom: '1rem' }} />
        <h2>Course Assignment Restricted</h2>
        <p className="text-secondary" style={{ maxWidth: '480px', margin: '0 auto 1.5rem auto' }}>
          Trainers can only assign students to courses where they are appointed as lead instructor.
        </p>
        <Link to="/courses" className="btn btn-primary">
          Return to My Assigned Courses
        </Link>
      </div>
    );
  }

  if (!course) {
    return (
      <div style={{ padding: '3rem 1rem', textAlign: 'center' }}>
        <h2>Course Not Found</h2>
        <p className="text-secondary" style={{ marginBottom: '1.5rem' }}>
          The requested course ID could not be located in the curriculum database.
        </p>
        <Link to="/courses" className="btn btn-primary">
          Back to Courses
        </Link>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Breadcrumb & Back Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.825rem' }}>
          <Link
            to="/courses"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              color: 'var(--primary)',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <ArrowLeft size={15} /> Courses & Catalog
          </Link>
          <span style={{ color: 'var(--text-muted)' }}>/</span>
          <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
            {course.title}
          </span>
          <span style={{ color: 'var(--text-muted)' }}>/</span>
          <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
            Assign Students
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link to={`/enrollments?courseId=${course.id}`} className="btn btn-secondary btn-sm">
            <Users size={14} /> View Enrollments Roster
          </Link>
          <Link to="/courses" className="btn btn-secondary btn-sm">
            Cancel
          </Link>
        </div>
      </div>

      {/* Target Course Header Banner */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(to right, rgba(5, 150, 105, 0.08), rgba(16, 185, 129, 0.03))',
          borderColor: 'rgba(5, 150, 105, 0.25)',
          padding: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #059669, #10b981)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 4px 10px rgba(5, 150, 105, 0.3)',
                flexShrink: 0,
              }}
            >
              <BookOpen size={26} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                <span className="badge badge-primary">{course.category}</span>
                <span className={`badge badge-${course.status}`}>{course.status}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  ID: {course.id} &bull; v{course.version} &bull; {course.level || 'Intermediate'}
                </span>
              </div>

              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 0.35rem 0', color: 'var(--text-primary)' }}>
                {course.title}
              </h1>

              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '780px', lineHeight: 1.4 }}>
                {course.shortDescription || course.description}
              </p>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              background: 'var(--card-bg)',
              padding: '0.75rem 1.25rem',
              borderRadius: '10px',
              border: '1px solid var(--border-color)',
              minWidth: '180px',
            }}
          >
            <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Enrolled Students
            </span>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#059669' }}>
              {course.enrolledLearners ?? course.learnerCount ?? 0}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Active Participants
            </span>
          </div>
        </div>
      </div>

      {/* Assignment Success Notification */}
      {assignmentResult && (
        <div
          style={{
            background: assignmentResult.success ? '#ecfdf5' : '#fef2f2',
            border: `1px solid ${assignmentResult.success ? '#a7f3d0' : '#fecaca'}`,
            borderRadius: '12px',
            padding: '1rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {assignmentResult.success ? (
              <CheckCircle2 size={24} color="#059669" />
            ) : (
              <AlertCircle size={24} color="#dc2626" />
            )}
            <div>
              <div style={{ fontWeight: 700, color: assignmentResult.success ? '#065f46' : '#991b1b', fontSize: '0.9rem' }}>
                {assignmentResult.message}
              </div>
              {assignmentResult.success && (
                <div style={{ fontSize: '0.75rem', color: '#047857', marginTop: '0.15rem' }}>
                  The course headcount and learner rosters have been updated across the LMS.
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Link to={`/enrollments?courseId=${course.id}`} className="btn btn-primary btn-sm">
              <Users size={14} /> View Course Enrollments &rarr;
            </Link>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setAssignmentResult(null)}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Workflow Filter Toolbar */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Users size={18} color="var(--primary)" /> Student Selection & Targeting
              </h2>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Filter students by academic department or batch cohort, search by name, ID, or email, and enroll in bulk.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleSelectAllEligible}
                disabled={eligibleStudentsInView.length === 0}
                style={{ fontSize: '0.75rem' }}
                title="Select all eligible students in the current view"
              >
                <CheckSquare size={14} /> Select All Eligible ({eligibleStudentsInView.length})
              </button>

              {selectedStudentIds.size > 0 && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleDeselectAll}
                  style={{ fontSize: '0.75rem' }}
                >
                  <Square size={14} /> Deselect All
                </button>
              )}
            </div>
          </div>

          {/* Filtering Dropdowns & Search Input */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
            {/* 1. Select Department */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                Filter by Department
              </label>
              <select
                className="form-select"
                value={selectedDeptId}
                onChange={(e) => {
                  setSelectedDeptId(e.target.value);
                  setSelectedCohortId('all'); // reset cohort when department changes
                }}
                style={{ width: '100%', fontSize: '0.825rem' }}
              >
                <option value="all">All Departments ({allStudents.length} Students)</option>
                {mockDepartments.map((dept) => {
                  const count = allStudents.filter((s) => s.departmentId === dept.id).length;
                  return (
                    <option key={dept.id} value={dept.id}>
                      {dept.name} ({count} students)
                    </option>
                  );
                })}
              </select>
            </div>

            {/* 2. Select Cohort / Batch */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                Filter by Cohort / Batch
              </label>
              <select
                className="form-select"
                value={selectedCohortId}
                onChange={(e) => setSelectedCohortId(e.target.value)}
                style={{ width: '100%', fontSize: '0.825rem' }}
              >
                <option value="all">All Cohorts / Batches</option>
                {availableCohorts.map((coh) => (
                  <option key={coh.id} value={coh.id}>
                    {coh.name} ({coh.code})
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Search Students (Name, ID, Email) */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                Search Students
              </label>
              <div style={{ position: 'relative' }}>
                <Search
                  size={15}
                  style={{
                    position: 'absolute',
                    left: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                  }}
                />
                <input
                  type="text"
                  placeholder="Search by student name, student ID (e.g. STU-2026-001), or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', paddingLeft: '34px', fontSize: '0.825rem' }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                    }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Roster Table Card */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div
          style={{
            padding: '1rem 1.25rem',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            background: 'var(--bg-subtle, rgba(0,0,0,0.02))',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
              Candidate Students ({filteredStudents.length})
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Showing {filteredStudents.length} of {allStudents.length} total students
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span
              style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                color: selectedStudentIds.size > 0 ? '#059669' : 'var(--text-muted)',
                background: selectedStudentIds.size > 0 ? '#ecfdf5' : 'transparent',
                padding: '0.2rem 0.6rem',
                borderRadius: '6px',
                border: selectedStudentIds.size > 0 ? '1px solid #a7f3d0' : 'none',
              }}
            >
              {selectedStudentIds.size} student{selectedStudentIds.size === 1 ? '' : 's'} selected
            </span>

            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={selectedStudentIds.size === 0}
              onClick={() => setIsConfirmOpen(true)}
              style={{
                background: selectedStudentIds.size > 0 ? '#059669' : undefined,
                fontWeight: 700,
              }}
            >
              <UserPlus size={14} /> Assign Selected Students ({selectedStudentIds.size})
            </button>
          </div>
        </div>

        {/* Students Table */}
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', margin: 0, fontSize: '0.825rem' }}>
            <thead>
              <tr>
                <th style={{ width: '40px', textAlign: 'center', padding: '0.75rem' }}>
                  <input
                    type="checkbox"
                    checked={isAllEligibleSelected}
                    onChange={handleToggleSelectAllInView}
                    disabled={eligibleStudentsInView.length === 0}
                    style={{ cursor: 'pointer' }}
                    title={
                      isAllEligibleSelected
                        ? 'Deselect all eligible in view'
                        : 'Select all eligible in view'
                    }
                  />
                </th>
                <th style={{ padding: '0.75rem 1rem' }}>STUDENT NAME</th>
                <th style={{ padding: '0.75rem 1rem' }}>STUDENT ID</th>
                <th style={{ padding: '0.75rem 1rem' }}>EMAIL ADDRESS</th>
                <th style={{ padding: '0.75rem 1rem' }}>DEPARTMENT</th>
                <th style={{ padding: '0.75rem 1rem' }}>COHORT / BATCH</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>CURRENT ENROLLMENT STATUS</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Users size={36} color="var(--border-color)" style={{ marginBottom: '0.75rem' }} />
                    <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                      No students found matching your criteria.
                    </div>
                    <p style={{ fontSize: '0.78rem', marginTop: '0.25rem' }}>
                      Try broadening your search keywords or resetting the department/cohort filters.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((st) => {
                  const isAlreadyEnrolled = enrolledStudentIdsForCourse.has(st.id);
                  const isSuspended = st.status !== 'active';
                  const isSelected = selectedStudentIds.has(st.id);
                  const studentCohort = getStudentCohort(st.id);
                  const deptName = getDepartmentName(st.departmentId);
                  const studentCode = st.rollNo || `STU-${st.id.toUpperCase()}`;

                  return (
                    <tr
                      key={st.id}
                      style={{
                        background: isSelected
                          ? 'rgba(5, 150, 105, 0.05)'
                          : isAlreadyEnrolled
                          ? 'rgba(0, 0, 0, 0.015)'
                          : undefined,
                        cursor: isAlreadyEnrolled || isSuspended ? 'default' : 'pointer',
                      }}
                      onClick={() => {
                        if (!isAlreadyEnrolled && !isSuspended) {
                          handleToggleStudent(st.id);
                        }
                      }}
                    >
                      <td
                        style={{ textAlign: 'center', padding: '0.75rem' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={isAlreadyEnrolled || isSuspended}
                          onChange={() => handleToggleStudent(st.id)}
                          style={{ cursor: isAlreadyEnrolled || isSuspended ? 'not-allowed' : 'pointer' }}
                        />
                      </td>

                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              background: 'var(--primary-light, #e0e7ff)',
                              color: 'var(--primary, #4338ca)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.75rem',
                              flexShrink: 0,
                            }}
                          >
                            {st.firstName?.charAt(0) || st.displayName?.charAt(0) || 'S'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                              {st.displayName || `${st.firstName} ${st.lastName}`}
                            </div>
                            {st.specialization && (
                              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                                {st.specialization}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '0.15rem 0.45rem',
                            borderRadius: '4px',
                            background: 'var(--bg-subtle, rgba(0,0,0,0.05))',
                            color: 'var(--text-secondary)',
                            border: '1px solid var(--border-color)',
                          }}
                        >
                          {studentCode}
                        </span>
                      </td>

                      <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>
                        {st.email}
                      </td>

                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: 'var(--text-secondary)',
                          }}
                        >
                          {deptName}
                        </span>
                      </td>

                      <td style={{ padding: '0.75rem 1rem' }}>
                        {studentCohort ? (
                          <span
                            className="badge badge-secondary"
                            style={{ fontSize: '0.7rem', fontWeight: 600 }}
                          >
                            {studentCohort.code} &bull; {studentCohort.name}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            General Batch
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                        {isAlreadyEnrolled ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '0.2rem 0.6rem',
                              borderRadius: '999px',
                              background: '#ecfdf5',
                              color: '#059669',
                              border: '1px solid #a7f3d0',
                            }}
                          >
                            <CheckCircle2 size={13} color="#059669" /> Already Enrolled
                          </span>
                        ) : isSuspended ? (
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '0.2rem 0.6rem',
                              borderRadius: '999px',
                              background: '#fef2f2',
                              color: '#dc2626',
                              border: '1px solid #fecaca',
                            }}
                          >
                            Account Inactive
                          </span>
                        ) : isSelected ? (
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '0.2rem 0.6rem',
                              borderRadius: '999px',
                              background: '#eff6ff',
                              color: '#2563eb',
                              border: '1px solid #bfdbfe',
                            }}
                          >
                            Selected for Enrollment
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              padding: '0.2rem 0.6rem',
                              borderRadius: '999px',
                              background: 'var(--bg-subtle, rgba(0,0,0,0.04))',
                              color: 'var(--text-muted)',
                            }}
                          >
                            Eligible
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Sticky Bottom Summary & Action Bar */}
        <div
          style={{
            padding: '1rem 1.25rem',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            background: 'var(--card-bg)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Selected: <strong>{selectedStudentIds.size}</strong> candidate student{selectedStudentIds.size === 1 ? '' : 's'}
            </span>
            {selectedStudentIds.size > 0 && (
              <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>
                &bull; Ready for course roster assignment
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Link to="/courses" className="btn btn-secondary">
              Back to Courses
            </Link>

            <button
              type="button"
              className="btn btn-primary"
              disabled={selectedStudentIds.size === 0}
              onClick={() => setIsConfirmOpen(true)}
              style={{
                background: selectedStudentIds.size > 0 ? '#059669' : undefined,
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <UserPlus size={16} /> Assign Selected Students ({selectedStudentIds.size})
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {isConfirmOpen && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
          onClick={() => setIsConfirmOpen(false)}
        >
          <div
            className="modal-card"
            style={{
              maxWidth: '560px',
              width: '100%',
              background: 'var(--card-bg)',
              borderRadius: '16px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
              border: '1px solid var(--border-color)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header" style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: '#ecfdf5',
                    color: '#059669',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <UserPlus size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    Confirm Course Assignment
                  </h3>
                  <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {course.title}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsConfirmOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div
                style={{
                  background: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  borderRadius: '10px',
                  padding: '1rem',
                  fontSize: '0.825rem',
                  color: '#065f46',
                }}
              >
                You are about to assign <strong>{selectedStudentIds.size} student{selectedStudentIds.size === 1 ? '' : 's'}</strong> to{' '}
                <strong>"{course.title}"</strong>.
                <div style={{ marginTop: '0.35rem', fontSize: '0.75rem', color: '#047857' }}>
                  Students will receive instant enrollment access, have their lesson progress tracked, and appear in the course roster.
                </div>
              </div>

              {/* Selected Students Preview List */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  Selected Students ({selectedStudentIds.size}):
                </label>
                <div
                  style={{
                    maxHeight: '160px',
                    overflowY: 'auto',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '0.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.4rem',
                    background: 'var(--bg-subtle, rgba(0,0,0,0.02))',
                  }}
                >
                  {Array.from(selectedStudentIds).map((sId) => {
                    const st = allStudents.find((s) => s.id === sId);
                    if (!st) return null;
                    return (
                      <div
                        key={sId}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.35rem 0.6rem',
                          background: 'var(--card-bg)',
                          borderRadius: '6px',
                          border: '1px solid var(--border-color)',
                          fontSize: '0.78rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                            {st.displayName || `${st.firstName} ${st.lastName}`}
                          </span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                            ({st.email})
                          </span>
                        </div>
                        <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#059669' }}>
                          {st.rollNo || st.id}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <strong>Duplicate Prevention:</strong> If any student was previously enrolled, their enrollment will be preserved without duplicate records.
              </div>
            </div>

            <div
              className="modal-footer"
              style={{
                padding: '1rem 1.5rem',
                borderTop: '1px solid var(--border-color)',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.75rem',
              }}
            >
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsConfirmOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirmAssignment}
                disabled={isSubmitting}
                style={{ background: '#059669', fontWeight: 700 }}
              >
                {isSubmitting ? 'Assigning...' : `Confirm & Assign ${selectedStudentIds.size} Students`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
