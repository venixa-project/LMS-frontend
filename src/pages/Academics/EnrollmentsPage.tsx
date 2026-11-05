import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCourseStore } from '../../lib/courseStore';
import { useCohortStore } from '../../lib/cohortStore';
import { useDepartmentStore } from '../../lib/departmentStore';
import { usePeopleStore } from '../../lib/peopleStore';
import { Enrollment } from '../../types';
import { BackToCoursesButton } from '../../components/BackToCoursesButton';
import {
  Route, Plus, Search, Filter, CheckCircle2, Clock,
  BookOpen, Users, AlertCircle, X, ArrowRight, UserCheck
} from 'lucide-react';

interface ExtendedEnrollment extends Omit<Enrollment, 'progress'> {
  studentName?: string;
  studentEmail?: string;
  courseTitle?: string;
  cohortName?: string;
  departmentName?: string;
  progressPercent: number;
  progress?: number;
  completedLessons?: string[];
  updatedAt?: string;
}

export const EnrollmentsPage: React.FC = () => {
  const { courses, fetchCourses } = useCourseStore();
  const { cohorts, fetchCohorts } = useCohortStore();
  const { departments } = useDepartmentStore();
  const { users, fetchPeople } = usePeopleStore();
  useEffect(() => { fetchCourses(); fetchCohorts(); fetchPeople(); }, []);
  const { enrollments: storeEnrollments, courses: storeCourses } = useCourseStore();
  const { getStudents } = usePeopleStore();

  const [searchParams] = useSearchParams();
  const initialCourse = searchParams.get('courseId') || searchParams.get('course') || 'all';

  const [enrollments, setEnrollments] = useState<ExtendedEnrollment[]>([]);
  const [search, setSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState(initialCourse);
  const [statusFilter, setStatusFilter] = useState('all');
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);

  useEffect(() => {
    const cParam = searchParams.get('courseId') || searchParams.get('course');
    if (cParam) {
      setCourseFilter(cParam);
    }
  }, [searchParams]);

  useEffect(() => {
    const allStudents = getStudents();

    const mappedEnrollments: ExtendedEnrollment[] = storeEnrollments.map((se) => {
      const student =
        allStudents.find((s) => s.id === se.userId) ||
        users.find((u) => u.id === se.userId);
      const course = storeCourses.find((c) => c.id === se.courseId);
      const cohort = cohorts.find((c) => c.id === se.cohortId);

      return {
        id: se.id,
        userId: se.userId,
        studentName:
          student?.displayName || (student ? `${student.firstName || ''} ${student.lastName || ''}`.trim() : 'Enrolled Student'),
        studentEmail: student?.email || 'student@lms.demo',
        courseId: se.courseId,
        courseTitle: course?.title || 'Enrolled Course',
        cohortName: cohort?.name || 'Standard Track',
        departmentName: 'Engineering & Technology',
        status: se.status || 'active',
        progressPercent: se.progress || 0,
        enrolledAt: se.enrolledAt || new Date().toISOString(),
      };
    });

    setEnrollments(mappedEnrollments);
  }, [storeEnrollments, storeCourses, users, cohorts, getStudents]);

  // Form states
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedCourse, setSelectedCourse] = useState(courses[0]?.id || '');
  const [selectedCohort, setSelectedCohort] = useState(cohorts[0]?.name || '');
  const [enrollSuccessMessage, setEnrollSuccessMessage] = useState<string | null>(null);

  const filteredEnrollments = enrollments.filter((e) => {
    const matchesSearch =
      (e.studentName || '').toLowerCase().includes(search.toLowerCase()) ||
      (e.studentEmail || '').toLowerCase().includes(search.toLowerCase()) ||
      (e.courseTitle || '').toLowerCase().includes(search.toLowerCase());
    const matchesCourse =
      courseFilter === 'all' ||
      e.courseId === courseFilter ||
      (courseFilter === 'crs-001' && e.courseId === 'c-001') ||
      (courseFilter === 'c-001' && e.courseId === 'crs-001');
    const matchesStatus = statusFilter === 'all' || e.status === statusFilter;
    return matchesSearch && matchesCourse && matchesStatus;
  });

  const handleEnrollStudent = (e: React.FormEvent) => {
    e.preventDefault();
    const courseObj = courses.find((c) => c.id === selectedCourse);
    const newEnr: ExtendedEnrollment = {
      id: `enr-${Date.now()}`,
      userId: `u-${Date.now()}`,
      studentName: selectedStudent.split(' (')[0],
      studentEmail: selectedStudent.includes('(') ? selectedStudent.split('(')[1].replace(')', '') : 'student@lms.demo',
      courseId: selectedCourse,
      courseTitle: courseObj ? courseObj.title : 'Selected Course',
      cohortName: selectedCohort,
      departmentName: 'Computer Science & Engineering',
      status: 'active',
      progressPercent: 0,
      enrolledAt: new Date().toISOString(),
      completedLessons: [],
      updatedAt: new Date().toISOString()
    };

    setEnrollments([newEnr, ...enrollments]);
    setIsEnrollModalOpen(false);
    setEnrollSuccessMessage(`Successfully enrolled ${newEnr.studentName} in "${newEnr.courseTitle}".`);
    setTimeout(() => setEnrollSuccessMessage(null), 4000);
  };

  return (
    <div>
      <div style={{ marginBottom: '16px' }}>
        <BackToCoursesButton />
      </div>

      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="badge badge-primary">Academics</span>
          </div>
          <h1 style={{ fontSize: '1.75rem', margin: 0 }}>Student Course Enrollments</h1>
          <p className="text-secondary text-sm">Manage curriculum enrollments, track individual syllabus velocity, and assign students to classes</p>
        </div>

        <button className="btn btn-primary" onClick={() => setIsEnrollModalOpen(true)}>
          <Plus size={16} /> Enroll Student in Course
        </button>
      </div>

      {enrollSuccessMessage && (
        <div style={{
          background: 'var(--success-bg)',
          border: '1px solid var(--success-border)',
          color: 'var(--success)',
          padding: '12px 18px',
          borderRadius: 'var(--radius-md)',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '0.85rem'
        }}>
          <CheckCircle2 size={18} />
          <span>{enrollSuccessMessage}</span>
        </div>
      )}

      {/* KPI Summary Cards */}
      <div className="grid-4" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <span className="text-muted text-xs font-semibold">Total Enrollments</span>
          <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>{enrollments.length}</div>
          <p className="text-muted text-xs">Across all academic programs</p>
        </div>
        <div className="stat-card">
          <span className="text-muted text-xs font-semibold">Active In-Progress</span>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)' }}>
            {enrollments.filter((e) => e.status === 'active').length}
          </div>
          <p className="text-muted text-xs">Active curriculum pace</p>
        </div>
        <div className="stat-card">
          <span className="text-muted text-xs font-semibold">Completed / Graduated</span>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--success)' }}>
            {enrollments.filter((e) => e.status === 'completed').length}
          </div>
          <p className="text-muted text-xs">Full certificates issued</p>
        </div>
        <div className="stat-card">
          <span className="text-muted text-xs font-semibold">Average Progress</span>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>
            {enrollments.length > 0
              ? Math.round(enrollments.reduce((sum, e) => sum + (e.progressPercent || 0), 0) / enrollments.length)
              : 0}%
          </div>
          <p className="text-muted text-xs">Curriculum syllabus pace</p>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="card" style={{ padding: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search by student name, email, or course..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '38px' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <select
              className="form-select"
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              style={{ width: 'auto' }}
            >
              <option value="all">All Courses</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>

            <select
              className="form-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ width: 'auto' }}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="paused">Paused</option>
            </select>
          </div>

          <span className="text-muted text-xs font-semibold">{filteredEnrollments.length} Records</span>
        </div>
      </div>

      {/* Enrollments Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Student Name</th>
              <th>Enrolled Course</th>
              <th>Class / Batch</th>
              <th>Department</th>
              <th>Enrolled Date</th>
              <th style={{ width: '180px' }}>Progress</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredEnrollments.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '48px 16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <Users size={36} color="var(--text-muted)" style={{ marginBottom: '12px' }} />
                    <h4 style={{ fontSize: '1.1rem', margin: '0 0 6px 0' }}>No Course Enrollments Found</h4>
                    <p className="text-muted text-sm" style={{ margin: '0 0 16px 0', maxWidth: '420px' }}>
                      {search || courseFilter !== 'all' || statusFilter !== 'all'
                        ? 'No enrollments match the selected filters or search terms.'
                        : 'No students have been enrolled in courses yet.'}
                    </p>
                    <button className="btn btn-primary btn-sm" onClick={() => setIsEnrollModalOpen(true)}>
                      <Plus size={14} /> Enroll Student in Course
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
            filteredEnrollments.map((enr) => (
              <tr key={enr.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, var(--primary), var(--accent-purple))',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.75rem'
                    }}>
                      {enr.studentName?.[0] || 'S'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{enr.studentName}</div>
                      <div className="text-muted text-xs">{enr.studentEmail}</div>
                    </div>
                  </div>
                </td>
                <td style={{ fontWeight: 600 }}>{enr.courseTitle}</td>
                <td>
                  <span className="badge badge-secondary">{enr.cohortName}</span>
                </td>
                <td className="text-muted text-xs">{enr.departmentName}</td>
                <td className="text-muted text-xs">
                  {new Date(enr.enrolledAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                </td>
                <td>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px' }}>
                    <span>{enr.progressPercent}%</span>
                    <span className="text-muted text-xs">{enr.progressPercent === 100 ? 'Completed' : 'In Progress'}</span>
                  </div>
                  <div className="progress-bar-bg" style={{ height: '6px' }}>
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: `${enr.progressPercent}%`,
                        background: enr.progressPercent === 100 ? 'var(--success)' : undefined
                      }}
                    />
                  </div>
                </td>
                <td>
                  <span className={`badge badge-${enr.status}`}>{enr.status}</span>
                </td>
                <td>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => alert(`Student: ${enr.studentName}\nCourse: ${enr.courseTitle}\nProgress: ${enr.progressPercent}%\nCompleted Lessons: ${enr.completedLessons?.length || 0}`)}
                  >
                    View Details
                  </button>
                </td>
              </tr>
            )))}
          </tbody>
        </table>
      </div>

      {/* Manual Enroll Modal */}
      {isEnrollModalOpen && (
        <div className="modal-overlay" onClick={() => setIsEnrollModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '540px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Enroll Student in Course</h3>
              <button onClick={() => setIsEnrollModalOpen(false)} style={{ color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEnrollStudent}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Select Student <span className="required">*</span></label>
                  <select
                    className="form-select"
                    value={selectedStudent}
                    onChange={(e) => setSelectedStudent(e.target.value)}
                  >
                    <option value="">-- Choose Student --</option>
                    {getStudents().map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.displayName || s.email} ({s.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Target Course <span className="required">*</span></label>
                  <select
                    className="form-select"
                    value={selectedCourse}
                    onChange={(e) => setSelectedCourse(e.target.value)}
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>{c.title} ({c.level})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Assign Class / Batch</label>
                  <select
                    className="form-select"
                    value={selectedCohort}
                    onChange={(e) => setSelectedCohort(e.target.value)}
                  >
                    {cohorts.map((co) => (
                      <option key={co.id} value={co.name}>{co.name} ({co.code})</option>
                    ))}
                  </select>
                </div>

                <div style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px',
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)'
                }}>
                  <strong>Access Policy:</strong> Enrolling the student immediately grants access to course materials, scheduled live sessions, and upcoming assessments for this class batch.
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsEnrollModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Confirm Enrollment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
