import React, { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '../../lib/store';
import { useCourseStore } from '../../lib/courseStore';
import { usePeopleStore } from '../../lib/peopleStore';
import { mockDepartments, mockCohorts } from '../../data/mockData';
import { mockUsers } from '../../data/mockUsers';
import { Course, EntityStatus } from '../../types';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  BookOpen, Plus, Search, Filter, Eye, Edit2, Archive,
  Clock, Users, CheckCircle2, AlertCircle, Play, Layers,
  GraduationCap, Check, X, UserPlus, Award, Send, Share2,
  Link2, Compass, ShieldCheck, Sparkles, Building,
  MoreVertical, ChevronDown, Trash2, ArrowRight, RotateCcw,
  AlertTriangle, CheckCircle, Info
} from 'lucide-react';
import { ShareCourseModal } from '../../components/ShareCourseModal';

export const CoursesPage: React.FC = () => {
  const { user } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  const isPlatformAdmin = user?.activeRole === 'platform_admin';
  const isOrgAdmin =
    user?.activeRole === 'org_admin' ||
    user?.activeRole === 'lms_admin' ||
    (user?.activeRole as string) === 'industrial_admin';
  const isFaculty = user?.activeRole === 'trainer' || user?.activeRole === 'instructor';
  const isLearner = user?.activeRole === 'student' || user?.activeRole === 'learner';
  const isAdmin = isPlatformAdmin || isOrgAdmin || (!isFaculty && !isLearner);
  const isCatalog = location.pathname === '/catalog';
  const isMyLearning = location.pathname === '/my-courses' || location.pathname === '/my-learning';

  const { courses, enrolledCourseIds, updateCourseStatus, assignLeadFaculty, deleteCourse, enrollCourse } = useCourseStore();
  const { getFaculty } = usePeopleStore();
  const allFaculty = getFaculty();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [learnerTab, setLearnerTab] = useState<'all' | 'in_progress' | 'completed'>('all');

  // Manage Dropdown Menu State
  const [activeManageMenuCourseId, setActiveManageMenuCourseId] = useState<string | null>(null);

  // Status Change Modal State
  const [statusModalCourse, setStatusModalCourse] = useState<Course | null>(null);
  const [targetStatus, setTargetStatus] = useState<EntityStatus>('draft');

  // Delete Course Confirmation Modal State
  const [deleteModalCourse, setDeleteModalCourse] = useState<Course | null>(null);

  // Close manage dropdown when clicking outside
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.course-manage-menu-container')) {
        setActiveManageMenuCourseId(null);
      }
    };
    document.addEventListener('mousedown', handleGlobalClick);
    return () => document.removeEventListener('mousedown', handleGlobalClick);
  }, []);

  const progressData: Record<string, { progress: number; completedLessons: number; totalLessons: number; status: 'in_progress' | 'completed' }> = {
    'crs-001': { progress: 65, completedLessons: 8, totalLessons: 12, status: 'in_progress' },
    'crs-002': { progress: 30, completedLessons: 4, totalLessons: 12, status: 'in_progress' },
    'crs-003': { progress: 20, completedLessons: 2, totalLessons: 10, status: 'in_progress' },
    'crs-004': { progress: 100, completedLessons: 10, totalLessons: 10, status: 'completed' },
    'crs-005': { progress: 40, completedLessons: 3, totalLessons: 8, status: 'in_progress' },
    'crs-006': { progress: 15, completedLessons: 2, totalLessons: 14, status: 'in_progress' },
  };

  const getCourseProgress = (courseId: string) => {
    return progressData[courseId] || { progress: 0, completedLessons: 0, totalLessons: 10, status: 'in_progress' as const };
  };

  // Modals
  const [assignFacultyCourse, setAssignFacultyCourse] = useState<Course | null>(null);
  const [facultySearchTerm, setFacultySearchTerm] = useState('');
  const [facultyDeptFilter, setFacultyDeptFilter] = useState('all');
  const [selectedFacultyId, setSelectedFacultyId] = useState('');
  const [rosterCourse, setRosterCourse] = useState<Course | null>(null);
  const [shareModalCourse, setShareModalCourse] = useState<Course | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Helper to resolve lead faculty details for a course
  const getLeadFacultyInfo = (c: Course) => {
    const instructorId = c.instructors?.[0] || 'u-004';
    const found =
      allFaculty.find((f) => f.id === instructorId) ||
      mockUsers.find((u) => u.id === instructorId);

    if (found) {
      const deptName =
        mockDepartments.find((d) => d.id === found.departmentId)?.name ||
        found.specialization ||
        'Engineering';
      return {
        id: found.id,
        name: found.displayName || `${found.firstName} ${found.lastName}`,
        email: found.email,
        facultyId: found.rollNo || `FAC-${found.id.toUpperCase()}`,
        department: deptName,
        departmentId: found.departmentId,
        specialization: found.specialization,
        status: found.status,
      };
    }
    return {
      id: 'u-004',
      name: 'Dr. James Wilson',
      email: 'trainer@lms.demo',
      facultyId: 'FAC-2026-004',
      department: 'Engineering',
      departmentId: 'dep-001',
      specialization: 'Full-Stack JavaScript & Systems Architecture',
      status: 'active',
    };
  };

  const openFacultyModal = (c: Course) => {
    setAssignFacultyCourse(c);
    setFacultySearchTerm('');
    setFacultyDeptFilter('all');
    setSelectedFacultyId(c.instructors?.[0] || 'u-004');
  };

  // Filtered & Prioritized Faculty list for the assignment modal
  const filteredFacultyForAssignment = React.useMemo(() => {
    if (!assignFacultyCourse) return [];

    return allFaculty.filter((f) => {
      // 1. Department filter
      if (facultyDeptFilter !== 'all') {
        if (f.departmentId !== facultyDeptFilter) {
          return false;
        }
      }

      // 2. Search term (Name, ID, Email)
      if (facultySearchTerm.trim()) {
        const q = facultySearchTerm.toLowerCase().trim();
        const nameMatches =
          (f.displayName && f.displayName.toLowerCase().includes(q)) ||
          `${f.firstName} ${f.lastName}`.toLowerCase().includes(q);
        const emailMatches = f.email && f.email.toLowerCase().includes(q);
        const idMatches =
          (f.rollNo && f.rollNo.toLowerCase().includes(q)) ||
          f.id.toLowerCase().includes(q);

        if (!nameMatches && !emailMatches && !idMatches) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      // Prioritize matching course department
      const courseDept = assignFacultyCourse.departmentId;
      if (courseDept) {
        if (a.departmentId === courseDept && b.departmentId !== courseDept) return -1;
        if (b.departmentId === courseDept && a.departmentId !== courseDept) return 1;
      }
      return (a.displayName || a.firstName).localeCompare(b.displayName || b.firstName);
    });
  }, [allFaculty, assignFacultyCourse, facultyDeptFilter, facultySearchTerm]);

  const handleConfirmFacultyAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignFacultyCourse || !selectedFacultyId) return;

    const chosenFaculty =
      allFaculty.find((f) => f.id === selectedFacultyId) ||
      mockUsers.find((u) => u.id === selectedFacultyId);

    if (!chosenFaculty) return;

    if (chosenFaculty.status !== 'active') {
      showNotice(`Cannot appoint inactive faculty member "${chosenFaculty.displayName}".`);
      return;
    }

    assignLeadFaculty(assignFacultyCourse.id, selectedFacultyId);
    showNotice(
      `Assigned ${chosenFaculty.displayName || chosenFaculty.firstName} (${chosenFaculty.rollNo || chosenFaculty.id}) as Lead Faculty for "${assignFacultyCourse.title}".`
    );
    setAssignFacultyCourse(null);
  };

  const showNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3500);
  };

  const handleEnrollCourse = (course: Course) => {
    enrollCourse(course.id);
    showNotice(`Enrolled in "${course.title}" successfully! You can now access curriculum and materials.`);
  };

  // Dynamic counts for learner tabs
  const nonArchivedCourses = courses.filter((c) => c.status !== 'archived');
  const enrolledCourses = nonArchivedCourses.filter((c) => enrolledCourseIds.includes(c.id));
  const inProgressCourses = enrolledCourses.filter((c) => getCourseProgress(c.id).status === 'in_progress');
  const completedCourses = enrolledCourses.filter((c) => getCourseProgress(c.id).status === 'completed');

  const filteredCourses = courses.filter((c) => {
    const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || c.category === categoryFilter;

    // When student browses the catalog (/catalog), show all published courses
    if (isCatalog) {
      if (c.status !== 'published') return false;
      return matchesSearch && matchesCategory;
    }

    if (isLearner) {
      // In student portal: show all courses added by admin (exclude only archived)
      if (c.status === 'archived') return false;

      // On /my-learning: only show enrolled courses and respect learnerTab
      if (isMyLearning) {
        if (!enrolledCourseIds.includes(c.id)) return false;
        const prog = getCourseProgress(c.id);
        if (learnerTab === 'in_progress' && prog.status !== 'in_progress') return false;
        if (learnerTab === 'completed' && prog.status !== 'completed') return false;
      }

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

  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    courses.forEach((c) => {
      if (c.category) cats.add(c.category);
    });
    ['Frontend Development', 'Backend Development', 'Data Science & ML', 'DevOps & Cloud'].forEach((cat) => cats.add(cat));
    return Array.from(cats);
  }, [courses]);

  const getPublishingValidationErrors = (course: Course): string[] => {
    const errors: string[] = [];
    if (!course.title || course.title.trim().length === 0) {
      errors.push('Course title cannot be empty.');
    }
    if (!course.modules || course.modules.length === 0) {
      errors.push('Course must contain at least 1 curriculum module before publication.');
    } else {
      const totalLessons = course.modules.reduce((sum, m) => sum + (m.lessons?.length || 0), 0);
      if (totalLessons === 0) {
        errors.push('Course curriculum must contain at least 1 lesson before publication.');
      }
    }
    if (!course.instructors || course.instructors.length === 0) {
      errors.push('Lead faculty instructor must be appointed before publication.');
    }
    return errors;
  };

  const getValidStatusTransitions = (currentStatus: EntityStatus): { status: EntityStatus; label: string; desc: string }[] => {
    switch (currentStatus) {
      case 'draft':
        return [
          { status: 'in_review', label: 'In Review', desc: 'Submit curriculum for administrative review' },
          { status: 'published', label: 'Published', desc: 'Publish immediately to active student catalog' },
          { status: 'archived', label: 'Archived', desc: 'Archive this draft course' },
        ];
      case 'in_review':
        return [
          { status: 'published', label: 'Published', desc: 'Approve and publish course to active catalog' },
          { status: 'draft', label: 'Draft', desc: 'Return curriculum to draft for author revisions' },
          { status: 'archived', label: 'Archived', desc: 'Archive without publishing' },
        ];
      case 'published':
        return [
          { status: 'draft', label: 'Draft', desc: 'Unpublish course and return to draft for maintenance' },
          { status: 'archived', label: 'Archived', desc: 'Archive course and hide from future student enrollments' },
        ];
      case 'archived':
        return [
          { status: 'draft', label: 'Draft', desc: 'Restore archived course as an editable draft' },
          { status: 'published', label: 'Published', desc: 'Republish course back to active student catalog' },
        ];
      default:
        return [
          { status: 'draft', label: 'Draft', desc: 'Move to draft' },
          { status: 'published', label: 'Published', desc: 'Move to published' },
        ];
    }
  };

  const openStatusModal = (c: Course) => {
    setStatusModalCourse(c);
    const valid = getValidStatusTransitions(c.status);
    setTargetStatus(valid[0]?.status || 'draft');
  };

  const handleConfirmStatusChange = () => {
    if (!statusModalCourse) return;
    if (targetStatus === 'published') {
      const errs = getPublishingValidationErrors(statusModalCourse);
      if (errs.length > 0) {
        showNotice(`Cannot publish: ${errs[0]}`);
        return;
      }
    }
    updateCourseStatus(statusModalCourse.id, targetStatus);
    showNotice(`Course "${statusModalCourse.title}" status updated to ${targetStatus.replace('_', ' ')}.`);
    setStatusModalCourse(null);
  };

  const openDeleteModal = (c: Course) => {
    setDeleteModalCourse(c);
  };

  const handleConfirmDelete = () => {
    if (!deleteModalCourse) return;
    const title = deleteModalCourse.title;
    deleteCourse(deleteModalCourse.id);
    showNotice(`Course "${title}" has been permanently deleted.`);
    setDeleteModalCourse(null);
  };

  const handleArchive = (id: string) => {
    if (confirm('Archive this course? It will be hidden from new enrollments.')) {
      updateCourseStatus(id, 'archived');
      showNotice('Course moved to archived state.');
    }
  };

  const handleStatusChange = (courseId: string, newStatus: EntityStatus) => {
    updateCourseStatus(courseId, newStatus);
    showNotice(`Course status updated to ${newStatus}.`);
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
              {isCatalog
                ? 'Curriculum Catalog'
                : isLearner
                  ? (isMyLearning ? 'My Enrolled Courses' : 'Course Catalog')
                  : isFaculty
                    ? 'Faculty Teaching Scope'
                    : 'Academic Offerings'}
            </span>
            {isFaculty && <span className="badge badge-draft">Dr. James Wilson</span>}
            {isLearner && <span className="badge badge-active">Alex Thompson</span>}
          </div>
          <h1 style={{ fontSize: '1.75rem', margin: 0 }}>
            {isCatalog
              ? 'Course Catalog & Discovery'
              : isLearner
                ? (isMyLearning ? 'My Enrolled Courses & Learning History' : 'Course Catalog & Academic Programs')
                : isFaculty
                  ? 'My Assigned Courses & Learning Content'
                  : 'Course Management & Curriculum Catalog'}
          </h1>
          <p className="text-secondary text-sm">
            {isCatalog
              ? 'Explore open curriculum courses, preview syllabi, and enroll directly in academic programs.'
              : isLearner
                ? (isMyLearning ? 'Access your enrolled curriculum, track lesson completion, and resume learning.' : 'Explore available courses, search disciplines, preview syllabi, and enroll in new programs.')
                : isFaculty
                  ? 'Manage curriculum modules, learning lessons, student rosters, and approval submissions for your courses'
                  : 'Oversee institutional syllabus, assign appointed faculty, generate shareable links, and publish courses'}
          </p>
        </div>

        {isCatalog ? (
          <div style={{ display: 'flex', gap: '10px' }}>
            <Link to="/join-course" className="btn btn-primary">
              <Link2 size={16} /> Join with Link
            </Link>
          </div>
        ) : !isLearner ? (
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
        ) : (
          <div style={{ display: 'flex', gap: '10px' }}>
            <Link to="/join-course" className="btn btn-primary">
              <Link2 size={16} /> Join with Link
            </Link>
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

      {/* Sub-filters strictly when on My Enrolled Courses (/my-learning) */}
      {isLearner && isMyLearning && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              className={`tab-btn ${learnerTab === 'all' ? 'active' : ''}`}
              onClick={() => setLearnerTab('all')}
            >
              <BookOpen size={14} /> All Enrolled Courses ({enrolledCourses.length})
            </button>
            <button
              className={`tab-btn ${learnerTab === 'in_progress' ? 'active' : ''}`}
              onClick={() => setLearnerTab('in_progress')}
            >
              <Play size={14} /> In Progress ({inProgressCourses.length})
            </button>
            <button
              className={`tab-btn ${learnerTab === 'completed' ? 'active' : ''}`}
              onClick={() => setLearnerTab('completed')}
            >
              <Award size={14} /> Completed &bull; Certificate Issued ({completedCourses.length})
            </button>
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="card" style={{ padding: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', flex: 1, minWidth: '280px' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder={isLearner ? "Search enrolled courses or subjects..." : "Search courses by title or topic keywords..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '38px', width: '100%' }}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer'
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              {!isLearner && (
                <select
                  className="form-select"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{ width: 'auto', minWidth: '130px' }}
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
                style={{ width: 'auto', minWidth: '150px' }}
              >
                <option value="all">All Disciplines</option>
                {availableCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              {(search || statusFilter !== 'all' || categoryFilter !== 'all') && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setSearch('');
                    setStatusFilter('all');
                    setCategoryFilter('all');
                  }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 12px', fontSize: '0.78rem' }}
                  title="Reset all active search and filter criteria"
                >
                  <RotateCcw size={13} /> Reset Filters
                </button>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              className="badge badge-neutral"
              style={{
                fontWeight: 700,
                fontSize: '0.75rem',
                padding: '5px 10px',
                border: '1px solid var(--border-subtle)'
              }}
            >
              {filteredCourses.length} of {courses.length} Courses
            </span>
          </div>
        </div>
      </div>

      {/* Courses Grid or Empty State */}
      {filteredCourses.length === 0 ? (
        <div className="card" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'var(--bg-subtle, rgba(255,255,255,0.05))',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            border: '1px solid var(--border-subtle)'
          }}>
            <Search size={26} />
          </div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 8px 0', color: 'var(--text-main)' }}>
            {isLearner && isMyLearning && enrolledCourses.length === 0
              ? 'No enrolled courses found'
              : 'No courses match your search or filters'}
          </h3>
          <p className="text-secondary text-sm" style={{ maxWidth: '440px', margin: '0 auto 20px', lineHeight: 1.5 }}>
            {isLearner && isMyLearning && enrolledCourses.length === 0
              ? 'You have not enrolled in any academic courses yet. Browse the curriculum catalog to discover and join courses.'
              : search
                ? `No curriculum offerings matched the search "${search}".`
                : 'No courses found matching the selected status or discipline filters. Try adjusting your keywords or clearing all filters.'}
          </p>
          {isLearner && isMyLearning && enrolledCourses.length === 0 ? (
            <Link to="/courses" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Compass size={14} /> Browse Course Catalog &rarr;
            </Link>
          ) : (
            <button
              type="button"
              className="btn btn-secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              onClick={() => {
                setSearch('');
                setStatusFilter('all');
                setCategoryFilter('all');
              }}
            >
              <RotateCcw size={14} /> Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid-3">
          {filteredCourses.map((c) => {
            const leadFacultyInfo = getLeadFacultyInfo(c);
            const courseDeptName = mockDepartments.find((d) => d.id === c.departmentId)?.name || c.category;
            const totalLessons = c.modules.reduce((sum, m) => sum + (m.lessons?.length || 0), 0);
            const isManageMenuOpen = activeManageMenuCourseId === c.id;

            return (
              <div
                key={c.id}
                className="card card-interactive"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  position: 'relative',
                  overflow: 'visible',
                  minHeight: '485px'
                }}
              >
                <div>
                  {/* 1. Thumbnail / Cover Image + Status Badge */}
                  <div
                    style={{
                      height: '140px',
                      borderRadius: 'var(--radius-md)',
                      background: c.thumbnail
                        ? `url(${c.thumbnail}) center/cover no-repeat`
                        : 'linear-gradient(135deg, rgba(37, 99, 235, 0.45) 0%, rgba(84, 71, 255, 0.35) 50%, rgba(244, 114, 182, 0.25) 100%)',
                      marginBottom: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    {!c.thumbnail && <BookOpen size={44} color="#ffffff" style={{ opacity: 0.85 }} />}

                    {/* Category pill */}
                    <div
                      style={{
                        position: 'absolute',
                        top: '10px',
                        left: '10px',
                        background: 'rgba(15, 23, 42, 0.75)',
                        backdropFilter: 'blur(4px)',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '0.68rem',
                        color: '#ffffff',
                        fontWeight: 600
                      }}
                    >
                      {c.category}
                    </div>

                    {/* Compact Status Badge */}
                    <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
                      <span
                        className={`badge badge-${c.status === 'published'
                          ? 'active'
                          : c.status === 'in_review'
                            ? 'warning'
                            : c.status === 'archived'
                              ? 'danger'
                              : 'draft'
                          }`}
                        style={{ fontWeight: 700, textTransform: 'capitalize' }}
                      >
                        {c.status.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Version & Level pill */}
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '8px',
                        left: '10px',
                        background: 'rgba(0, 0, 0, 0.65)',
                        backdropFilter: 'blur(4px)',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '0.68rem',
                        color: '#e2e8f0'
                      }}
                    >
                      v{c.version} &bull; {c.level || 'Intermediate'}
                    </div>
                  </div>

                  {/* 2. Department / Discipline Meta */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span className="text-muted text-xs font-semibold" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Building size={12} /> {courseDeptName}
                    </span>
                    <span className="text-muted text-xs font-medium" style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <Clock size={12} /> {c.durationHours || 40} hrs curriculum
                    </span>
                  </div>

                  {/* 3. Course Title */}
                  <h3
                    style={{
                      fontSize: '1.08rem',
                      fontWeight: 700,
                      marginBottom: '6px',
                      lineHeight: 1.35,
                      color: 'var(--text-main)'
                    }}
                    title={c.title}
                  >
                    {c.title}
                  </h3>

                  {/* 4. Short Description (Strictly Max 2 Lines) */}
                  <p
                    className="text-secondary text-sm"
                    style={{
                      marginBottom: '12px',
                      lineHeight: 1.45,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      minHeight: '2.8em'
                    }}
                  >
                    {c.shortDescription || c.description}
                  </p>

                  {/* 5. Duration, Modules, and Lessons Row */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 10px',
                      background: 'var(--bg-card-hover, rgba(0,0,0,0.02))',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      marginBottom: '10px',
                      fontSize: '0.74rem',
                      color: 'var(--text-secondary)'
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} color="var(--primary)" /> {c.durationHours || 40}h
                    </span>
                    <span style={{ color: 'var(--border-subtle)' }}>&bull;</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Layers size={12} color="var(--primary)" /> {c.modules.length} Modules
                    </span>
                    <span style={{ color: 'var(--border-subtle)' }}>&bull;</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <BookOpen size={12} color="var(--primary)" /> {totalLessons} Lessons
                    </span>
                  </div>

                  {/* 6. Lead Faculty & Small Change Action */}
                  <div
                    style={{
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '6px 10px',
                      marginBottom: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '6px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '50%',
                          background: 'var(--primary-light, #e0e7ff)',
                          color: 'var(--primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.72rem',
                          flexShrink: 0
                        }}
                      >
                        <GraduationCap size={14} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            color: 'var(--text-main)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          Lead: {leadFacultyInfo.name}
                        </div>
                        <div style={{ fontSize: '0.67rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                          {leadFacultyInfo.facultyId} &bull; {leadFacultyInfo.department}
                        </div>
                      </div>
                    </div>
                    {isAdmin && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '2px 8px', fontSize: '0.7rem', fontWeight: 600, flexShrink: 0 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          openFacultyModal(c);
                        }}
                        title="Change appointed Lead Faculty"
                      >
                        Change
                      </button>
                    )}
                  </div>

                  {/* Learner Progress Bar for student mode */}
                  {isLearner && enrolledCourseIds.includes(c.id) && (
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
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
                  {isLearner && !enrolledCourseIds.includes(c.id) && (
                    <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', padding: '6px 10px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-subtle)' }}>
                      <span className="text-muted">Enrollment Status:</span>
                      <span className="badge badge-draft" style={{ fontSize: '0.7rem' }}>Open for Enrollment</span>
                    </div>
                  )}
                </div>

                {/* Card Bottom: Enrolled Students Count + Simplified Actions */}
                <div>
                  {/* 7. Enrolled Students Count */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 0',
                      borderTop: '1px solid var(--border-subtle)',
                      marginBottom: '10px',
                      fontSize: '0.8rem'
                    }}
                  >
                    {!isLearner ? (
                      <Link
                        to={`/enrollments?courseId=${c.id}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          color: 'var(--primary)',
                          fontWeight: 600,
                          fontSize: '0.8rem',
                          textDecoration: 'none'
                        }}
                        title="View Student Enrollments for this course"
                      >
                        <Users size={14} />
                        <span>{c.enrolledLearners || c.learnerCount || 28} Enrolled Students</span>
                        <ArrowRight size={12} />
                      </Link>
                    ) : (
                      <span className="text-muted text-xs">
                        Enrollment: <strong style={{ color: !enrolledCourseIds.includes(c.id) ? 'var(--text-muted)' : progressData[c.id]?.status === 'completed' ? 'var(--success)' : 'var(--accent-cyan)' }}>
                          {!enrolledCourseIds.includes(c.id) ? 'Not Enrolled' : progressData[c.id]?.status === 'completed' ? 'Completed' : 'Active Student'}
                        </strong>
                      </span>
                    )}
                    <span className="text-muted text-xs">
                      {c.completionRate ? `${c.completionRate}% completion` : 'Standard Track'}
                    </span>
                  </div>

                  {/* 8. Reduced & Clean Action Buttons */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {isCatalog ? (
                      enrolledCourseIds.includes(c.id) ? (
                        <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                          <Link
                            to={`/course-player/${c.id}`}
                            className="btn btn-secondary btn-sm"
                            style={{ flex: 1, justifyContent: 'center' }}
                          >
                            <Play size={13} /> Continue
                          </Link>
                          <Link
                            to={`/course/${c.id}`}
                            className="btn btn-primary btn-sm"
                            style={{ flex: 1, justifyContent: 'center' }}
                          >
                            <Eye size={13} /> Details
                          </Link>
                        </div>
                      ) : (
                        <Link
                          to={`/course/${c.id}`}
                          className="btn btn-primary btn-sm"
                          style={{ width: '100%', justifyContent: 'center', gap: '6px' }}
                        >
                          <Eye size={13} /> View Details & Enroll &rarr;
                        </Link>
                      )
                    ) : isLearner ? (
                      !enrolledCourseIds.includes(c.id) ? (
                        <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                          <button
                            type="button"
                            onClick={() => handleEnrollCourse(c)}
                            className="btn btn-primary btn-sm"
                            style={{ flex: 1, justifyContent: 'center', gap: '6px' }}
                          >
                            <Plus size={13} /> Enroll in Course
                          </button>
                          <Link
                            to={`/course/${c.id}`}
                            className="btn btn-secondary btn-sm"
                            title="View Course Syllabus & Details"
                          >
                            <Eye size={13} /> Syllabus
                          </Link>
                        </div>
                      ) : progressData[c.id]?.status === 'completed' ? (
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
                        <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                          <Link
                            to={`/course-player/${c.id}`}
                            className="btn btn-primary btn-sm"
                            style={{ flex: 1, justifyContent: 'center', gap: '6px' }}
                          >
                            <Play size={13} /> Continue Learning &rarr;
                          </Link>
                          <Link
                            to={`/course/${c.id}`}
                            className="btn btn-secondary btn-sm"
                            title="View Course Syllabus & Details"
                          >
                            <Eye size={13} />
                          </Link>
                        </div>
                      )
                    ) : (
                      <>
                        {/* Action 1: Continue Learning / View Materials */}
                        <Link
                          to={`/course-player/${c.id}`}
                          className="btn btn-primary btn-sm"
                          style={{ flex: 1.2, justifyContent: 'center', gap: '5px', fontSize: '0.8rem', padding: '6px 10px', fontWeight: 600 }}
                          title="Open course learning experience, video lessons, and curriculum materials"
                        >
                          <Play size={13} /> Continue Learning
                        </Link>

                        {/* Action 2: Course Builder Edit */}
                        <Link
                          to={`/course-builder?id=${c.id}`}
                          className="btn btn-secondary btn-sm"
                          style={{ flex: 1, justifyContent: 'center', gap: '6px', fontSize: '0.8rem', padding: '6px 10px' }}
                          title="Edit course in Course Builder"
                        >
                          <Edit2 size={13} /> {isFaculty ? 'Edit' : 'Edit'}
                        </Link>

                        {/* Primary Action: Manage Menu Trigger */}
                        <div className="course-manage-menu-container" style={{ position: 'relative' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveManageMenuCourseId(isManageMenuOpen ? null : c.id);
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '6px 10px',
                              fontWeight: 600,
                              fontSize: '0.8rem',
                              background: isManageMenuOpen ? 'var(--bg-card-hover)' : undefined
                            }}
                            title="More course management options"
                            aria-expanded={isManageMenuOpen}
                          >
                            <span>Manage</span>
                            <ChevronDown
                              size={13}
                              style={{
                                transform: isManageMenuOpen ? 'rotate(180deg)' : 'none',
                                transition: 'transform 0.15s ease'
                              }}
                            />
                          </button>

                          {/* Manage Dropdown Menu */}
                          {isManageMenuOpen && (
                            <div
                              style={{
                                position: 'absolute',
                                right: 0,
                                bottom: 'calc(100% + 8px)',
                                minWidth: '220px',
                                background: 'var(--bg-card)',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: 'var(--radius-md)',
                                boxShadow: '0 12px 28px rgba(0, 0, 0, 0.28), 0 4px 10px rgba(0, 0, 0, 0.15)',
                                zIndex: 100,
                                padding: '6px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '2px',
                                backdropFilter: 'blur(8px)'
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Link
                                to={`/course/${c.id}`}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  padding: '7px 10px',
                                  borderRadius: 'var(--radius-sm)',
                                  fontSize: '0.8rem',
                                  color: 'var(--text-main)',
                                  textDecoration: 'none',
                                  cursor: 'pointer'
                                }}
                                onClick={() => setActiveManageMenuCourseId(null)}
                              >
                                <Eye size={14} color="var(--primary)" /> View Details & Syllabus
                              </Link>

                              <Link
                                to={`/course-player/${c.id}`}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  padding: '7px 10px',
                                  borderRadius: 'var(--radius-sm)',
                                  fontSize: '0.8rem',
                                  color: 'var(--text-main)',
                                  textDecoration: 'none',
                                  cursor: 'pointer'
                                }}
                                onClick={() => setActiveManageMenuCourseId(null)}
                              >
                                <Play size={14} color="var(--primary)" /> Open Course Player
                              </Link>

                              <Link
                                to={`/courses/${c.id}/assign-students`}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  padding: '7px 10px',
                                  borderRadius: 'var(--radius-sm)',
                                  fontSize: '0.8rem',
                                  color: 'var(--text-main)',
                                  textDecoration: 'none',
                                  cursor: 'pointer'
                                }}
                                onClick={() => setActiveManageMenuCourseId(null)}
                              >
                                <UserPlus size={14} color="var(--primary)" /> Assign Students
                              </Link>

                              <Link
                                to={`/enrollments?courseId=${c.id}`}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  padding: '7px 10px',
                                  borderRadius: 'var(--radius-sm)',
                                  fontSize: '0.8rem',
                                  color: 'var(--text-main)',
                                  textDecoration: 'none',
                                  cursor: 'pointer'
                                }}
                                onClick={() => setActiveManageMenuCourseId(null)}
                              >
                                <Users size={14} color="var(--primary)" /> View Enrollments
                              </Link>

                              <Link
                                to={`/courses/${c.id}/assign-students`}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  padding: '7px 10px',
                                  borderRadius: 'var(--radius-sm)',
                                  fontSize: '0.8rem',
                                  color: 'var(--text-main)',
                                  textDecoration: 'none',
                                  cursor: 'pointer'
                                }}
                                onClick={() => setActiveManageMenuCourseId(null)}
                              >
                                <UserPlus size={14} color="var(--primary)" /> Assign Students
                              </Link>

                              <button
                                type="button"
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  padding: '7px 10px',
                                  borderRadius: 'var(--radius-sm)',
                                  fontSize: '0.8rem',
                                  color: 'var(--text-main)',
                                  background: 'none',
                                  border: 'none',
                                  width: '100%',
                                  textAlign: 'left',
                                  cursor: 'pointer'
                                }}
                                onClick={() => {
                                  setActiveManageMenuCourseId(null);
                                  setShareModalCourse(c);
                                }}
                              >
                                <Share2 size={14} color="var(--primary)" /> Share Course
                              </button>

                              <Link
                                to={`/course-player/${c.id}`}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  padding: '7px 10px',
                                  borderRadius: 'var(--radius-sm)',
                                  fontSize: '0.8rem',
                                  color: 'var(--text-main)',
                                  textDecoration: 'none',
                                  cursor: 'pointer'
                                }}
                                onClick={() => setActiveManageMenuCourseId(null)}
                              >
                                <Play size={14} color="var(--primary)" /> Preview as Student
                              </Link>

                              <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '4px 0' }} />

                              {isAdmin && (
                                <button
                                  type="button"
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '7px 10px',
                                    borderRadius: 'var(--radius-sm)',
                                    fontSize: '0.8rem',
                                    color: 'var(--text-main)',
                                    background: 'none',
                                    border: 'none',
                                    width: '100%',
                                    textAlign: 'left',
                                    cursor: 'pointer'
                                  }}
                                  onClick={() => {
                                    setActiveManageMenuCourseId(null);
                                    openFacultyModal(c);
                                  }}
                                >
                                  <GraduationCap size={14} color="var(--primary)" /> Change Lead Faculty
                                </button>
                              )}

                              <button
                                type="button"
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  padding: '7px 10px',
                                  borderRadius: 'var(--radius-sm)',
                                  fontSize: '0.8rem',
                                  color: 'var(--text-main)',
                                  background: 'none',
                                  border: 'none',
                                  width: '100%',
                                  textAlign: 'left',
                                  cursor: 'pointer'
                                }}
                                onClick={() => {
                                  setActiveManageMenuCourseId(null);
                                  openStatusModal(c);
                                }}
                              >
                                <CheckCircle2 size={14} color="var(--primary)" /> Change Course Status
                              </button>

                              {isAdmin && (
                                <>
                                  <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '4px 0' }} />
                                  <button
                                    type="button"
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '8px',
                                      padding: '7px 10px',
                                      borderRadius: 'var(--radius-sm)',
                                      fontSize: '0.8rem',
                                      color: 'var(--danger)',
                                      background: 'none',
                                      border: 'none',
                                      width: '100%',
                                      textAlign: 'left',
                                      cursor: 'pointer'
                                    }}
                                    onClick={() => {
                                      setActiveManageMenuCourseId(null);
                                      openDeleteModal(c);
                                    }}
                                  >
                                    <Trash2 size={14} color="var(--danger)" /> Delete Course
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Searchable Lead Faculty Assignment Modal */}
      {assignFacultyCourse && (() => {
        const currentLead = getLeadFacultyInfo(assignFacultyCourse);
        const courseDept = mockDepartments.find((d) => d.id === assignFacultyCourse.departmentId);
        const isSelectedSameAsCurrent = selectedFacultyId === (assignFacultyCourse.instructors?.[0] || 'u-004');
        const selectedFacultyObj = allFaculty.find((f) => f.id === selectedFacultyId) || mockUsers.find((u) => u.id === selectedFacultyId);
        const isSelectedInactive = selectedFacultyObj?.status !== 'active';

        return (
          <div className="modal-overlay" onClick={() => setAssignFacultyCourse(null)}>
            <div
              className="modal-card"
              style={{ maxWidth: '640px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      background: 'var(--primary-light, #e0e7ff)',
                      color: 'var(--primary, #4338ca)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <GraduationCap size={20} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                      Assign Lead Faculty
                    </h3>
                    <p className="text-muted text-xs" style={{ margin: '0.15rem 0 0 0' }}>
                      {assignFacultyCourse.title} &bull; {assignFacultyCourse.category}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAssignFacultyCourse(null)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleConfirmFacultyAssignment}>
                <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '1.25rem 1.5rem' }}>
                  {/* Current Lead Faculty Banner */}
                  <div
                    style={{
                      background: 'var(--bg-subtle, rgba(0,0,0,0.03))',
                      border: '1px solid var(--border-color)',
                      borderRadius: '10px',
                      padding: '0.75rem 1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.5rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #4338ca, #6366f1)',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                        }}
                      >
                        {currentLead.name.charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                          CURRENT APPOINTED FACULTY
                        </div>
                        <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                          {currentLead.name}{' '}
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                            ({currentLead.facultyId})
                          </span>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                          {currentLead.email} &bull; {currentLead.department}
                        </div>
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '0.2rem 0.5rem',
                        borderRadius: '999px',
                        background: '#ecfdf5',
                        color: '#059669',
                        border: '1px solid #a7f3d0',
                      }}
                    >
                      Currently Active
                    </span>
                  </div>

                  {/* Search and Department Filter Toolbar */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '0.6rem' }}>
                    <div style={{ position: 'relative' }}>
                      <Search
                        size={14}
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
                        placeholder="Search by faculty name, ID (e.g. FAC-2026-004), or email..."
                        value={facultySearchTerm}
                        onChange={(e) => setFacultySearchTerm(e.target.value)}
                        className="form-input"
                        style={{ width: '100%', paddingLeft: '32px', fontSize: '0.8rem' }}
                      />
                      {facultySearchTerm && (
                        <button
                          type="button"
                          onClick={() => setFacultySearchTerm('')}
                          style={{
                            position: 'absolute',
                            right: '8px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                          }}
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>

                    <select
                      className="form-select"
                      value={facultyDeptFilter}
                      onChange={(e) => setFacultyDeptFilter(e.target.value)}
                      style={{ fontSize: '0.8rem' }}
                    >
                      <option value="all">All Departments ({allFaculty.length} Faculty)</option>
                      {mockDepartments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Department Alignment Helper Badge */}
                  {courseDept && (
                    <div
                      style={{
                        fontSize: '0.75rem',
                        color: '#047857',
                        background: '#ecfdf5',
                        padding: '0.35rem 0.65rem',
                        borderRadius: '6px',
                        border: '1px solid #a7f3d0',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                      }}
                    >
                      <Building size={13} />
                      <span>
                        Course Discipline: <strong>{courseDept.name}</strong> &bull; Eligible faculty from this department are prioritized.
                      </span>
                    </div>
                  )}

                  {/* Searchable Faculty List */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                      Select Faculty Member ({filteredFacultyForAssignment.length} Available):
                    </label>

                    <div
                      style={{
                        maxHeight: '260px',
                        overflowY: 'auto',
                        border: '1px solid var(--border-color)',
                        borderRadius: '10px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.4rem',
                        padding: '0.4rem',
                        background: 'var(--bg-subtle, rgba(0,0,0,0.02))',
                      }}
                    >
                      {filteredFacultyForAssignment.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                          <Users size={28} color="var(--border-color)" style={{ marginBottom: '0.4rem' }} />
                          <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                            No faculty members found matching "{facultySearchTerm}"
                          </div>
                          <p style={{ fontSize: '0.75rem', margin: '0.2rem 0 0 0' }}>
                            Try adjusting your search keywords or switching to "All Departments".
                          </p>
                        </div>
                      ) : (
                        filteredFacultyForAssignment.map((fac) => {
                          const isSelected = selectedFacultyId === fac.id;
                          const isCurrent = (assignFacultyCourse.instructors?.[0] || 'u-004') === fac.id;
                          const isDeptMatch = assignFacultyCourse.departmentId === fac.departmentId;
                          const isInactive = fac.status !== 'active';
                          const facCode = fac.rollNo || `FAC-${fac.id.toUpperCase()}`;
                          const deptName = mockDepartments.find((d) => d.id === fac.departmentId)?.name || 'Academic Division';

                          return (
                            <div
                              key={fac.id}
                              onClick={() => {
                                if (!isInactive) {
                                  setSelectedFacultyId(fac.id);
                                }
                              }}
                              style={{
                                padding: '0.65rem 0.85rem',
                                borderRadius: '8px',
                                border: isSelected
                                  ? '2px solid var(--primary)'
                                  : '1px solid var(--border-color)',
                                background: isSelected
                                  ? 'rgba(99, 102, 241, 0.08)'
                                  : isInactive
                                    ? 'rgba(0, 0, 0, 0.02)'
                                    : 'var(--card-bg)',
                                cursor: isInactive ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <input
                                  type="radio"
                                  name="selectedFaculty"
                                  checked={isSelected}
                                  disabled={isInactive}
                                  onChange={() => setSelectedFacultyId(fac.id)}
                                  style={{ cursor: isInactive ? 'not-allowed' : 'pointer' }}
                                />

                                <div
                                  style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    background: isSelected ? 'var(--primary)' : 'var(--primary-light, #e0e7ff)',
                                    color: isSelected ? '#ffffff' : 'var(--primary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 700,
                                    fontSize: '0.8rem',
                                    flexShrink: 0,
                                  }}
                                >
                                  {fac.firstName?.charAt(0) || fac.displayName?.charAt(0) || 'F'}
                                </div>

                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                                    <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                                      {fac.displayName || `${fac.firstName} ${fac.lastName}`}
                                    </span>
                                    <span
                                      style={{
                                        fontFamily: 'monospace',
                                        fontSize: '0.68rem',
                                        fontWeight: 700,
                                        padding: '0.1rem 0.35rem',
                                        borderRadius: '4px',
                                        background: 'var(--bg-subtle, rgba(0,0,0,0.06))',
                                        color: 'var(--text-secondary)',
                                      }}
                                    >
                                      {facCode}
                                    </span>
                                  </div>

                                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                                    <span>{fac.email}</span>
                                    <span style={{ margin: '0 0.3rem', color: 'var(--text-muted)' }}>&bull;</span>
                                    <strong>{deptName}</strong>
                                  </div>

                                  {fac.specialization && (
                                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                                      {fac.specialization}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                                {isCurrent && (
                                  <span
                                    style={{
                                      fontSize: '0.68rem',
                                      fontWeight: 700,
                                      padding: '0.15rem 0.45rem',
                                      borderRadius: '4px',
                                      background: '#dbeafe',
                                      color: '#1d4ed8',
                                    }}
                                  >
                                    Appointed
                                  </span>
                                )}

                                {isDeptMatch && (
                                  <span
                                    style={{
                                      fontSize: '0.68rem',
                                      fontWeight: 700,
                                      padding: '0.15rem 0.45rem',
                                      borderRadius: '4px',
                                      background: '#ecfdf5',
                                      color: '#059669',
                                    }}
                                  >
                                    Dept Match
                                  </span>
                                )}

                                {isInactive && (
                                  <span
                                    style={{
                                      fontSize: '0.68rem',
                                      fontWeight: 700,
                                      padding: '0.15rem 0.45rem',
                                      borderRadius: '4px',
                                      background: '#fef2f2',
                                      color: '#dc2626',
                                    }}
                                  >
                                    Suspended
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div
                    style={{
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '10px 12px',
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <ShieldCheck size={16} color="var(--primary)" />
                    <span>
                      <strong>Governance Policy:</strong> Appointed Lead Faculty hold primary academic responsibility for course syllabus authoring, live lectures, student assessment, and final grading.
                    </span>
                  </div>
                </div>

                <div className="modal-footer" style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setAssignFacultyCourse(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isSelectedSameAsCurrent || isSelectedInactive || !selectedFacultyId}
                  >
                    Confirm Lead Faculty Assignment
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

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

      {/* Share Course Modal */}
      <ShareCourseModal
        course={shareModalCourse}
        isOpen={Boolean(shareModalCourse)}
        onClose={() => setShareModalCourse(null)}
      />

      {/* Change Course Status Modal */}
      {statusModalCourse && (() => {
        const validTransitions = getValidStatusTransitions(statusModalCourse.status);
        const publishingErrors = targetStatus === 'published' ? getPublishingValidationErrors(statusModalCourse) : [];
        const isPublishBlocked = targetStatus === 'published' && publishingErrors.length > 0;

        return (
          <div className="modal-overlay" onClick={() => setStatusModalCourse(null)}>
            <div
              className="modal-card"
              style={{ maxWidth: '540px', width: '100%' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                    Change Course Status
                  </h3>
                  <p className="text-muted text-xs" style={{ margin: '4px 0 0 0' }}>
                    {statusModalCourse.title} &bull; {statusModalCourse.category}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setStatusModalCourse(null)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '1.25rem 1.5rem' }}>
                {/* Current Status banner */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    background: 'var(--bg-subtle, rgba(255,255,255,0.03))',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)'
                  }}
                >
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    Current Lifecycle State:
                  </div>
                  <span
                    className={`badge badge-${statusModalCourse.status === 'published'
                      ? 'active'
                      : statusModalCourse.status === 'in_review'
                        ? 'warning'
                        : statusModalCourse.status === 'archived'
                          ? 'danger'
                          : 'draft'
                      }`}
                    style={{ fontWeight: 700, textTransform: 'capitalize' }}
                  >
                    {statusModalCourse.status.replace('_', ' ')}
                  </span>
                </div>

                {/* Available Transitions */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    Select Target Status:
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {validTransitions.map((item) => {
                      const isSelected = targetStatus === item.status;
                      return (
                        <div
                          key={item.status}
                          onClick={() => setTargetStatus(item.status)}
                          style={{
                            padding: '10px 14px',
                            borderRadius: 'var(--radius-md)',
                            border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
                            background: isSelected ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-card)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <input
                              type="radio"
                              name="targetStatus"
                              checked={isSelected}
                              onChange={() => setTargetStatus(item.status)}
                              style={{ cursor: 'pointer' }}
                            />
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-main)', textTransform: 'capitalize' }}>
                                {item.label}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                {item.desc}
                              </div>
                            </div>
                          </div>
                          <span
                            className={`badge badge-${item.status === 'published'
                              ? 'active'
                              : item.status === 'in_review'
                                ? 'warning'
                                : item.status === 'archived'
                                  ? 'danger'
                                  : 'draft'
                              }`}
                            style={{ fontSize: '0.7rem' }}
                          >
                            {item.status}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Validation warnings for publishing */}
                {targetStatus === 'published' && isPublishBlocked && (
                  <div
                    style={{
                      padding: '12px 14px',
                      background: 'rgba(239, 68, 68, 0.08)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.78rem',
                      color: 'var(--danger)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, marginBottom: '6px' }}>
                      <AlertCircle size={16} /> Cannot publish course yet:
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      {publishingErrors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Success checkmark if publishing criteria met */}
                {targetStatus === 'published' && !isPublishBlocked && (
                  <div
                    style={{
                      padding: '10px 14px',
                      background: 'rgba(16, 185, 129, 0.08)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.78rem',
                      color: 'var(--success)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <CheckCircle2 size={16} />
                    <span>Course curriculum meets all requirements for publication in the student catalog.</span>
                  </div>
                )}

                {/* Confirmation note for archiving */}
                {targetStatus === 'archived' && (
                  <div
                    style={{
                      padding: '10px 14px',
                      background: 'rgba(245, 158, 11, 0.08)',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.78rem',
                      color: '#d97706',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <AlertTriangle size={16} />
                    <span>Archiving will hide this course from new enrollments. Existing enrolled learners will retain access to historical materials.</span>
                  </div>
                )}
              </div>

              <div className="modal-footer" style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setStatusModalCourse(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={isPublishBlocked || targetStatus === statusModalCourse.status}
                  onClick={handleConfirmStatusChange}
                >
                  Update Status
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Delete Course Confirmation Modal */}
      {deleteModalCourse && (
        <div className="modal-overlay" onClick={() => setDeleteModalCourse(null)}>
          <div
            className="modal-card"
            style={{ maxWidth: '480px', width: '100%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    color: 'var(--danger)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                    Delete Course
                  </h3>
                  <p className="text-muted text-xs" style={{ margin: '2px 0 0 0' }}>
                    Permanent Curriculum Removal
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeleteModalCourse(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p style={{ margin: 0, fontSize: '0.875rem', lineHeight: 1.5, color: 'var(--text-main)' }}>
                Are you sure you want to permanently delete <strong>"{deleteModalCourse.title}"</strong>?
              </p>

              {(deleteModalCourse.enrolledLearners || 0) > 0 && (
                <div
                  style={{
                    padding: '10px 14px',
                    background: 'rgba(245, 158, 11, 0.08)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.78rem',
                    color: '#d97706',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px'
                  }}
                >
                  <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <strong>Warning:</strong> This course has <strong>{deleteModalCourse.enrolledLearners} active enrolled students</strong>. If you want to preserve student records while hiding the course from new enrollments, choose <strong>Archive Instead</strong>.
                  </div>
                </div>
              )}

              <p className="text-muted text-xs" style={{ margin: 0 }}>
                This action will delete all modules, lessons, and configuration. This cannot be undone.
              </p>
            </div>

            <div className="modal-footer" style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDeleteModalCourse(null)}
              >
                Cancel
              </button>
              {deleteModalCourse.status !== 'archived' && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    const id = deleteModalCourse.id;
                    setDeleteModalCourse(null);
                    handleArchive(id);
                  }}
                >
                  Archive Instead
                </button>
              )}
              <button
                type="button"
                className="btn btn-primary"
                style={{ background: 'var(--danger)', borderColor: 'var(--danger)', color: '#fff' }}
                onClick={handleConfirmDelete}
              >
                Delete Course
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
