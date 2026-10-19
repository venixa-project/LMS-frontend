import React, { useState } from 'react';
import { useAuthStore } from '../../lib/store';
import { mockCourses, mockDepartments, mockCohorts } from '../../data/mockData';
import { mockUsers } from '../../data/mockUsers';
import { Course, EntityStatus } from '../../types';
import { Link, useNavigate } from 'react-router-dom';
import {
  BookOpen, Plus, Search, Filter, Eye, Edit2, Archive,
  Clock, Users, CheckCircle2, AlertCircle, Play, Layers,
  GraduationCap, Check, X, UserPlus, Award, Send
} from 'lucide-react';

export const CoursesPage: React.FC = () => {
  const { user } = useAuthStore();
  const isFaculty = user?.activeRole === 'trainer' || user?.activeRole === 'instructor';
  const isLearner = user?.activeRole === 'student' || user?.activeRole === 'learner';
  const [courses, setCourses] = useState<Course[]>(mockCourses);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [learnerTab, setLearnerTab] = useState<'all' | 'in_progress' | 'completed'>('all');

  const enrolledCourseIds = ['crs-001', 'crs-002', 'crs-004'];
  const progressData: Record<string, { progress: number; completedLessons: number; totalLessons: number; status: 'in_progress' | 'completed' }> = {
    'crs-001': { progress: 65, completedLessons: 8, totalLessons: 12, status: 'in_progress' },
    'crs-002': { progress: 30, completedLessons: 4, totalLessons: 12, status: 'in_progress' },
    'crs-004': { progress: 100, completedLessons: 10, totalLessons: 10, status: 'completed' },
  };

  // Modals
  const [assignFacultyCourse, setAssignFacultyCourse] = useState<Course | null>(null);
  const [selectedInstructor, setSelectedInstructor] = useState('Dr. James Wilson (u-004)');
  const [rosterCourse, setRosterCourse] = useState<Course | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const navigate = useNavigate();

  const showNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3500);
  };

  const filteredCourses = courses.filter((c) => {
    const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || c.category === categoryFilter;

    if (isLearner) {
      if (!enrolledCourseIds.includes(c.id) || c.status !== 'published') return false;
      const prog = progressData[c.id];
      if (learnerTab === 'in_progress' && prog?.status !== 'in_progress') return false;
      if (learnerTab === 'completed' && prog?.status !== 'completed') return false;
      return matchesSearch && matchesCategory;
    }

    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchesFaculty = !isFaculty || (
      c.instructors?.includes('u-004') ||
      c.instructors?.includes(user?.id || '') ||
      c.createdBy === user?.id ||
      c.id === 'crs-001' || c.id === 'crs-002' || c.id === 'crs-003' || c.id === 'crs-004'
    );
    return matchesSearch && matchesStatus && matchesCategory && matchesFaculty;
  });

  const handleArchive = (id: string) => {
    if (confirm('Archive this course? It will be hidden from new enrollments.')) {
      setCourses(courses.map((c) => c.id === id ? { ...c, status: 'archived' } : c));
      showNotice('Course moved to archived state.');
    }
  };

  const handleStatusChange = (courseId: string, newStatus: EntityStatus) => {
    setCourses(courses.map((c) => c.id === courseId ? { ...c, status: newStatus } : c));
    showNotice(`Course status updated to ${newStatus}.`);
  };

  const handleConfirmFacultyAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignFacultyCourse) return;
    const instructorName = selectedInstructor.split(' (')[0];
    showNotice(`Assigned ${instructorName} as Lead Faculty for "${assignFacultyCourse.title}".`);
    setAssignFacultyCourse(null);
  };

  // Mock course student enrollments for roster modal
  const courseRoster = [
    { id: '1', name: 'Alex Rivera', email: 'alex@lms.demo', cohort: 'Spring 2026 Engineering', progress: 68, attendance: '96.2%', enrolledAt: '2026-03-01' },
    { id: '2', name: 'Daniel Wu', email: 'daniel.wu@acmelearning.com', cohort: 'Spring 2026 Engineering', progress: 92, attendance: '94.0%', enrolledAt: '2026-03-01' },
    { id: '3', name: 'Sophia Patel', email: 'sophia.p@acmelearning.com', cohort: 'Spring 2026 Engineering', progress: 85, attendance: '98.0%', enrolledAt: '2026-03-05' },
    { id: '4', name: 'Kwame Mensah', email: 'kwame.m@acmelearning.com', cohort: 'Spring 2026 Engineering', progress: 54, attendance: '91.5%', enrolledAt: '2026-03-10' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="badge badge-primary">
              {isLearner ? 'Student Learning Portal' : isFaculty ? 'Faculty Teaching Scope' : 'Academic Offerings'}
            </span>
            <span className="text-muted text-xs">Acme Learning Corp &bull; AY 2026–2027</span>
            {isFaculty && <span className="badge badge-draft">Dr. James Wilson</span>}
          </div>
          <h1 style={{ fontSize: '1.75rem', margin: 0 }}>
            {isLearner
              ? 'My Enrolled Courses & Learning History'
              : isFaculty
              ? 'My Assigned Courses & Learning Content'
              : 'Course Management & Curriculum Catalog'}
          </h1>
          <p className="text-secondary text-sm">
            {isLearner
              ? 'Access your enrolled curriculum, track lesson completion, and resume learning.'
              : isFaculty
              ? 'Manage curriculum modules, learning lessons, student rosters, and approval submissions for your courses'
              : 'Oversee institutional syllabus, assign appointed faculty, manage student rosters, and publish courses'}
          </p>
        </div>

        {!isLearner && (
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {isFaculty ? (
              <Link to="/course-builder" className="btn btn-primary">
                <Plus size={16} /> Author Learning Materials
              </Link>
            ) : (
              <>
                <Link to="/enrollments" className="btn btn-secondary">
                  <Users size={16} /> View Enrollments
                </Link>
                <Link to="/learning-paths" className="btn btn-secondary">
                  <Layers size={16} /> Learning Paths
                </Link>
                <Link to="/course-builder" className="btn btn-primary">
                  <Plus size={16} /> Author New Course
                </Link>
              </>
            )}
          </div>
        )}
      </div>

      {notice && (
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
          <span>{notice}</span>
        </div>
      )}

      {/* Learner Tabs */}
      {isLearner && (
        <div className="tabs-nav" style={{ marginBottom: '20px' }}>
          <button
            className={`tab-btn ${learnerTab === 'all' ? 'active' : ''}`}
            onClick={() => setLearnerTab('all')}
          >
            <BookOpen size={16} /> All Enrolled Courses (3)
          </button>
          <button
            className={`tab-btn ${learnerTab === 'in_progress' ? 'active' : ''}`}
            onClick={() => setLearnerTab('in_progress')}
          >
            <Play size={16} /> In Progress (2)
          </button>
          <button
            className={`tab-btn ${learnerTab === 'completed' ? 'active' : ''}`}
            onClick={() => setLearnerTab('completed')}
          >
            <Award size={16} /> Completed &bull; Certificate Issued (1)
          </button>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="card" style={{ padding: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder={isLearner ? "Search enrolled courses or subjects..." : "Search courses by title or topic keywords..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '38px' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {!isLearner && (
              <select
                className="form-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ width: 'auto' }}
              >
                <option value="all">All Statuses</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="in_review">In Review</option>
                <option value="archived">Archived</option>
              </select>
            )}

            <select
              className="form-select"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{ width: 'auto' }}
            >
              <option value="all">All Disciplines</option>
              <option value="Frontend Development">Frontend Development</option>
              <option value="Backend Development">Backend Development</option>
              <option value="Data Science & ML">Data Science & ML</option>
              <option value="DevOps & Cloud">DevOps & Cloud</option>
            </select>
          </div>

          <span className="text-muted text-xs font-semibold">{filteredCourses.length} Courses Offered</span>
        </div>
      </div>

      {/* Courses Grid */}
      <div className="grid-3">
        {filteredCourses.map((c) => (
          <div
            key={c.id}
            className="card card-interactive"
            style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
          >
            <div>
              {/* Thumbnail / Header Mock */}
              <div style={{
                height: '140px',
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.3), rgba(139, 92, 246, 0.4))',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <BookOpen size={48} color="#fff" style={{ opacity: 0.8 }} />
                <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
                  <span className={`badge badge-${c.status}`}>{c.status}</span>
                </div>
                <div style={{ position: 'absolute', bottom: '10px', left: '10px', background: 'rgba(0,0,0,0.6)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', color: '#fff' }}>
                  v{c.version} &bull; {c.level}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span className="text-muted text-xs font-semibold">{c.category}</span>
                <span className="text-muted text-xs">{c.durationHours} hrs curriculum</span>
              </div>

              <h3 style={{ fontSize: '1.15rem', marginBottom: '8px', lineHeight: 1.3 }}>{c.title}</h3>
              <p className="text-secondary text-sm" style={{ marginBottom: '16px', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {c.description}
              </p>

              {/* Faculty Assignment Badge */}
              <div style={{
                background: 'var(--bg-input)',
                borderRadius: 'var(--radius-md)',
                padding: '8px 12px',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <GraduationCap size={15} color="var(--primary)" />
                  <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>Lead Faculty: Dr. James Wilson</span>
                </div>
              {!isFaculty && !isLearner && (
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setAssignFacultyCourse(c);
                    }}
                  >
                    Change
                  </button>
                )}
              </div>

              {/* Learner Progress Bar */}
              {isLearner && (
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '6px' }}>
                    <span className="text-muted">Curriculum Progress:</span>
                    <strong style={{ color: progressData[c.id]?.status === 'completed' ? 'var(--success)' : 'var(--primary)' }}>
                      {progressData[c.id]?.progress || 0}% ({progressData[c.id]?.completedLessons || 0}/{progressData[c.id]?.totalLessons || 12} Lessons)
                    </strong>
                  </div>
                  <div className="progress-bar-bg" style={{ height: '6px' }}>
                    <div className="progress-bar-fill" style={{ width: `${progressData[c.id]?.progress || 0}%` }} />
                  </div>
                </div>
              )}
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderTop: '1px solid var(--border-subtle)', marginBottom: '12px', fontSize: '0.8rem' }}>
                {!isLearner ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setRosterCourse(c);
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--primary)', fontWeight: 600, fontSize: '0.8rem' }}
                    title="View Student Roster"
                  >
                    <Users size={14} /> {c.enrolledLearners || 28} Enrolled Students &rarr;
                  </button>
                ) : (
                  <span className="text-muted text-xs">
                    Status: <strong style={{ color: progressData[c.id]?.status === 'completed' ? 'var(--success)' : 'var(--accent-cyan)' }}>
                      {progressData[c.id]?.status === 'completed' ? 'Completed' : 'Active Enrollment'}
                    </strong>
                  </span>
                )}
                <span className="text-muted">
                  {c.modules.length} Modules &bull; {c.modules.reduce((a, b) => a + b.lessons.length, 0)} Lessons
                </span>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {isLearner ? (
                  progressData[c.id]?.status === 'completed' ? (
                    <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                      <Link
                        to={`/course-player/${c.id}`}
                        className="btn btn-secondary btn-sm"
                        style={{ flex: 1, justifyContent: 'center' }}
                      >
                        <Play size={13} /> Review Lessons
                      </Link>
                      <Link
                        to="/my-certificates"
                        className="btn btn-primary btn-sm"
                        style={{ flex: 1, justifyContent: 'center' }}
                      >
                        <Award size={13} /> View Certificate
                      </Link>
                    </div>
                  ) : (
                    <Link
                      to={`/course-player/${c.id}`}
                      className="btn btn-primary btn-sm"
                      style={{ width: '100%', justifyContent: 'center', gap: '6px' }}
                    >
                      <Play size={13} /> Continue Learning &rarr;
                    </Link>
                  )
                ) : (
                  <>
                    <Link
                      to={`/course-player/${c.id}`}
                      className="btn btn-primary btn-sm"
                      style={{ flex: 1 }}
                    >
                      <Play size={13} /> {isFaculty ? 'Preview Content' : 'Learner Preview'}
                    </Link>
                    <Link
                      to={`/course-builder?id=${c.id}`}
                      className="btn btn-secondary btn-sm"
                      title="Edit curriculum & lessons"
                    >
                      <Edit2 size={13} /> {isFaculty ? 'Edit Materials' : 'Edit'}
                    </Link>

                    {/* Faculty Status Action vs Admin Dropdown */}
                    {isFaculty ? (
                      <>
                        {c.status === 'draft' && (
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ color: 'var(--primary)', borderColor: 'var(--primary)' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusChange(c.id, 'in_review');
                              showNotice('Course submitted to institution admin for publication review.');
                            }}
                            title="Submit course to institution admin for catalog publication"
                          >
                            <Send size={13} /> Submit for Review
                          </button>
                        )}
                        {c.status === 'in_review' && (
                          <span className="badge badge-warning" style={{ fontSize: '0.725rem', alignSelf: 'center' }}>
                            Under Admin Review
                          </span>
                        )}
                        {c.status === 'published' && (
                          <span className="badge badge-active" style={{ fontSize: '0.725rem', alignSelf: 'center' }}>
                            Published
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        <select
                          value={c.status}
                          onChange={(e) => handleStatusChange(c.id, e.target.value as EntityStatus)}
                          className="form-select"
                          style={{ width: 'auto', padding: '2px 8px', fontSize: '0.75rem' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <option value="draft">Draft</option>
                          <option value="in_review">In Review</option>
                          <option value="published">Published</option>
                          <option value="archived">Archived</option>
                        </select>

                        {c.status !== 'archived' && (
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleArchive(c.id);
                            }}
                            style={{ color: 'var(--danger)' }}
                            title="Archive course"
                          >
                            <Archive size={13} />
                          </button>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Assign Faculty Modal */}
      {assignFacultyCourse && (
        <div className="modal-overlay" onClick={() => setAssignFacultyCourse(null)}>
          <div className="modal-card" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <GraduationCap size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Assign Lead Faculty</h3>
                  <p className="text-muted text-xs">{assignFacultyCourse.title}</p>
                </div>
              </div>
              <button onClick={() => setAssignFacultyCourse(null)} style={{ color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleConfirmFacultyAssignment}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Select Appointed Instructor</label>
                  <select
                    className="form-select"
                    value={selectedInstructor}
                    onChange={(e) => setSelectedInstructor(e.target.value)}
                  >
                    <option value="Dr. James Wilson (u-004)">Dr. James Wilson &bull; Computer Science & Engineering</option>
                    <option value="Prof. Elena Rostova (u-008)">Prof. Elena Rostova &bull; Cloud & Infrastructure</option>
                    <option value="Dr. Marcus Bell (u-012)">Dr. Marcus Bell &bull; Artificial Intelligence & Data</option>
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
                  <strong>Governance Policy:</strong> Only appointed faculty can conduct live lectures, evaluate subjective assignments, and author exam questions for this course.
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setAssignFacultyCourse(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Faculty Assignment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enrolled Students Roster Modal */}
      {rosterCourse && (
        <div className="modal-overlay" onClick={() => setRosterCourse(null)}>
          <div className="modal-card" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: '1.15rem', margin: 0 }}>Enrolled Students &bull; {rosterCourse.title}</h3>
                <p className="text-muted text-xs">{rosterCourse.enrolledLearners} Total Enrolled Learners &bull; Section Spring 2026</p>
              </div>
              <button onClick={() => setRosterCourse(null)} style={{ color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="table-container" style={{ maxHeight: '280px', overflowY: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Class / Cohort</th>
                      <th>Progress</th>
                      <th>Attendance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {courseRoster.map((st) => (
                      <tr key={st.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{st.name}</div>
                          <div className="text-muted text-xs">{st.email}</div>
                        </td>
                        <td>
                          <span className="badge badge-secondary">{st.cohort}</span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '2px' }}>
                            <span>{st.progress}%</span>
                          </div>
                          <div className="progress-bar-bg" style={{ height: '5px' }}>
                            <div className="progress-bar-fill" style={{ width: `${st.progress}%` }} />
                          </div>
                        </td>
                        <td>
                          <span style={{ fontWeight: 700, color: 'var(--success)', fontSize: '0.8rem' }}>{st.attendance}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setRosterCourse(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
