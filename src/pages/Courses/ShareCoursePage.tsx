import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../lib/store';
import { useCourseStore } from '../../lib/courseStore';
import { usePeopleStore } from '../../lib/peopleStore';
import { useCohortStore } from '../../lib/cohortStore';
import { mockDepartments } from '../../data/mockData';
import { mockUsers } from '../../data/mockUsers';
import { Course, Department, User, Cohort } from '../../types';
import {
  Share2, ArrowLeft, Link2, Copy, Check, ExternalLink, ShieldCheck,
  AlertCircle, Calendar, Users, Sliders, ToggleLeft, ToggleRight,
  Search, Filter, CheckSquare, Square, X, Send, BookOpen, Clock,
  Sparkles, CheckCircle2, ChevronRight, UserCheck, Layers, Info,
  Building, GraduationCap, Eye, UserPlus, RefreshCw
} from 'lucide-react';

export const ShareCoursePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { user, sendCourseInvitations } = useAuthStore();
  const { courses, getCourseById, updateCourseShareSettings, updateCourseStatus, isEnrolled } = useCourseStore();
  const { getStudents } = usePeopleStore();
  const { cohorts } = useCohortStore();

  // Find course either by param id or default to first published course
  const courseId = id || courses[0]?.id;
  const course = getCourseById(courseId || '');

  // Role permissions check
  const isPlatformAdmin = user?.activeRole === 'platform_admin';
  const isOrgAdmin = user?.activeRole === 'org_admin' || user?.activeRole === 'lms_admin' || (user?.activeRole as string) === 'industrial_admin';
  const isTrainer = user?.activeRole === 'trainer' || user?.activeRole === 'instructor' || user?.activeRole === 'assessment_author' || user?.activeRole === 'grader';
  const isStudent = user?.activeRole === 'student' || user?.activeRole === 'learner' || user?.activeRole === 'guest';

  // Trainer course assignment check
  const isTrainerAssignedCourse = useMemo(() => {
    if (!course || !isTrainer) return true;
    const trainerId = user?.id || '';
    const assignedIds = course.instructors || [];
    // Demo trainer u-004 fallback
    const isTrainerWilson = trainerId === 'u-004' || user?.email === 'trainer@lms.demo';
    const wilsonCourses = ['crs-001', 'crs-002', 'crs-004'];
    if (isTrainerWilson && wilsonCourses.includes(course.id)) return true;

    return assignedIds.includes(trainerId) || course.createdBy === trainerId;
  }, [course, isTrainer, user]);

  // Lead trainer name for display
  const assignedTrainer = useMemo(() => {
    if (!course) return null;
    const instructorId = course.instructors?.[0] || course.createdBy;
    return mockUsers.find(u => u.id === instructorId) || mockUsers.find(u => u.activeRole === 'trainer');
  }, [course]);

  // All active students from people store
  const allStudents = useMemo(() => {
    return getStudents().filter(s => s.status === 'active');
  }, [getStudents]);

  // Link & Access Configuration State
  const [linkActive, setLinkActive] = useState<boolean>(course?.shareableLinkEnabled ?? true);
  const [deadline, setDeadline] = useState<string>(course?.enrollmentDeadline || '');
  const [capacity, setCapacity] = useState<number>(course?.enrollmentCapacity || 100);
  const [requiresApproval, setRequiresApproval] = useState<boolean>(course?.enrollmentApprovalRequired ?? false);
  const [copied, setCopied] = useState<boolean>(false);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  // Recipient Modes: 'department' | 'cohort' | 'individual' | 'all'
  type RecipientMode = 'department' | 'cohort' | 'individual' | 'all';
  const [recipientMode, setRecipientMode] = useState<RecipientMode>('department');

  // Selected students across all departments/modes: Set of student IDs
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

  // Department Mode State
  const [selectedDeptId, setSelectedDeptId] = useState<string>(mockDepartments[0]?.id || 'dep-001');
  const [deptSearch, setDeptSearch] = useState<string>('');

  // Cohort Mode State
  const [selectedCohortId, setSelectedCohortId] = useState<string>(cohorts[0]?.id || 'coh-001');
  const [cohortSearch, setCohortSearch] = useState<string>('');

  // Individual Mode State
  const [individualSearch, setIndividualSearch] = useState<string>('');
  const [individualDeptFilter, setIndividualDeptFilter] = useState<string>('all');

  // Custom Invitation Note
  const [customNote, setCustomNote] = useState<string>('');

  // Dispatch Confirmation Modal & Delivery Status
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);
  const [dispatchStatus, setDispatchStatus] = useState<{
    sent: boolean;
    count: number;
    recipients: string[];
    timestamp: string;
  } | null>(null);

  // Synchronize link state if course changes
  useEffect(() => {
    if (course) {
      setLinkActive(course.shareableLinkEnabled ?? true);
      setDeadline(course.enrollmentDeadline || '');
      setCapacity(course.enrollmentCapacity || 100);
      setRequiresApproval(course.enrollmentApprovalRequired ?? false);
    }
  }, [course]);

  // Canonical shareable URL
  const shareableUrl = `${window.location.origin}/course/${course?.id || courseId}`;

  // Copy Link Handler
  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareableUrl);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = shareableUrl;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.warn('Failed to copy', err);
    }
  };

  // Save Settings Handler
  const handleSaveSettings = () => {
    if (!course) return;
    updateCourseShareSettings(course.id, {
      shareableLinkEnabled: linkActive,
      enrollmentDeadline: deadline || undefined,
      enrollmentCapacity: capacity,
      enrollmentApprovalRequired: requiresApproval,
    });
    setSaveNotice('Link & enrollment rules updated successfully!');
    setTimeout(() => setSaveNotice(null), 3000);
  };

  // 1. Department Filtered Students
  const selectedDepartment = useMemo(() => {
    return mockDepartments.find(d => d.id === selectedDeptId) || mockDepartments[0];
  }, [selectedDeptId]);

  const departmentStudents = useMemo(() => {
    return allStudents.filter(s => s.departmentId === selectedDeptId);
  }, [allStudents, selectedDeptId]);

  const filteredDeptStudents = useMemo(() => {
    const q = deptSearch.trim().toLowerCase();
    if (!q) return departmentStudents;
    return departmentStudents.filter(s =>
      s.displayName.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      (s.rollNo && s.rollNo.toLowerCase().includes(q)) ||
      s.id.toLowerCase().includes(q)
    );
  }, [departmentStudents, deptSearch]);

  // 2. Cohort Filtered Students
  const selectedCohort = useMemo(() => {
    return cohorts.find(c => c.id === selectedCohortId) || cohorts[0];
  }, [cohorts, selectedCohortId]);

  const cohortStudents = useMemo(() => {
    if (!selectedCohort || !selectedCohort.studentIds) return [];
    return allStudents.filter(s => selectedCohort.studentIds?.includes(s.id));
  }, [allStudents, selectedCohort]);

  const filteredCohortStudents = useMemo(() => {
    const q = cohortSearch.trim().toLowerCase();
    if (!q) return cohortStudents;
    return cohortStudents.filter(s =>
      s.displayName.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      (s.rollNo && s.rollNo.toLowerCase().includes(q))
    );
  }, [cohortStudents, cohortSearch]);

  // 3. Individual Search Filtered Students
  const filteredIndividualStudents = useMemo(() => {
    const q = individualSearch.trim().toLowerCase();
    return allStudents.filter(s => {
      const matchesDept = individualDeptFilter === 'all' || s.departmentId === individualDeptFilter;
      const matchesQuery = !q ||
        s.displayName.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        (s.rollNo && s.rollNo.toLowerCase().includes(q)) ||
        s.id.toLowerCase().includes(q);
      return matchesDept && matchesQuery;
    });
  }, [allStudents, individualSearch, individualDeptFilter]);

  // Selection toggle handlers
  const handleToggleStudent = (studentId: string) => {
    setSelectedStudentIds(prev => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  };

  const handleSelectAllInList = (students: User[]) => {
    setSelectedStudentIds(prev => {
      const next = new Set(prev);
      students.forEach(s => next.add(s.id));
      return next;
    });
  };

  const handleDeselectAllInList = (students: User[]) => {
    setSelectedStudentIds(prev => {
      const next = new Set(prev);
      students.forEach(s => next.delete(s.id));
      return next;
    });
  };

  const handleClearAllSelections = () => {
    setSelectedStudentIds(new Set());
  };

  // Selected student user objects
  const selectedStudentsList = useMemo(() => {
    return allStudents.filter(s => selectedStudentIds.has(s.id));
  }, [allStudents, selectedStudentIds]);

  // Inviter metadata
  const inviterName = user?.displayName || 'Campus Administrator';
  const inviterRole = isTrainer ? 'Faculty Trainer' : isPlatformAdmin ? 'Platform Administrator' : 'Institution Administrator';

  // Handle Dispatch Invitations
  const handleConfirmSend = () => {
    if (!course || selectedStudentIds.size === 0) return;

    const recipientIds = Array.from(selectedStudentIds);
    const result = sendCourseInvitations({
      courseId: course.id,
      courseTitle: course.title,
      courseShortDesc: course.shortDescription,
      inviterName,
      inviterRole,
      recipientIds,
      customMessage: customNote.trim() || undefined,
    });

    setIsConfirmModalOpen(false);
    setDispatchStatus({
      sent: true,
      count: result.count,
      recipients: result.recipients,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    });
  };

  // Unauthorized view for unauthorized roles (e.g. students)
  if (isStudent) {
    return (
      <div style={{ maxWidth: '800px', margin: '40px auto', textAlign: 'center', padding: '32px' }} className="card">
        <AlertCircle size={48} color="var(--danger)" style={{ margin: '0 auto 16px' }} />
        <h2 style={{ fontSize: '1.4rem', marginBottom: '8px' }}>Access Restricted</h2>
        <p className="text-secondary text-sm" style={{ marginBottom: '20px' }}>
          Course sharing and student invitation management is restricted to Institution Administrators and Assigned Faculty Trainers.
        </p>
        <Link to="/courses" className="btn btn-primary" style={{ width: 'fit-content', margin: '0 auto' }}>
          Return to Course Catalog
        </Link>
      </div>
    );
  }

  // Course not found fallback
  if (!course) {
    return (
      <div style={{ maxWidth: '800px', margin: '40px auto', textAlign: 'center', padding: '32px' }} className="card">
        <AlertCircle size={48} color="var(--warning)" style={{ margin: '0 auto 16px' }} />
        <h2 style={{ fontSize: '1.4rem', marginBottom: '8px' }}>Course Not Found</h2>
        <p className="text-secondary text-sm" style={{ marginBottom: '20px' }}>
          The requested course with identifier <code>{courseId}</code> could not be located in your institution catalog.
        </p>
        <Link to="/courses" className="btn btn-primary" style={{ width: 'fit-content', margin: '0 auto' }}>
          ← Back to Courses
        </Link>
      </div>
    );
  }

  // Trainer access restriction if course is not assigned to them
  if (isTrainer && !isTrainerAssignedCourse) {
    return (
      <div style={{ maxWidth: '800px', margin: '40px auto', textAlign: 'center', padding: '32px' }} className="card">
        <ShieldCheck size={48} color="var(--warning)" style={{ margin: '0 auto 16px' }} />
        <h2 style={{ fontSize: '1.4rem', marginBottom: '8px' }}>Faculty Access Restriction</h2>
        <p className="text-secondary text-sm" style={{ marginBottom: '14px', lineHeight: 1.5 }}>
          As a faculty trainer, you can only share and dispatch invitations for courses officially assigned to you.
          Course <strong>"{course.title}"</strong> ({course.id}) is assigned to{' '}
          <strong>{assignedTrainer?.displayName || 'another instructor'}</strong>.
        </p>
        <p className="text-muted text-xs" style={{ marginBottom: '24px' }}>
          Please select a course assigned to your faculty profile or contact your campus administrator.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <Link to="/courses" className="btn btn-secondary">
            ← Back to Course Builder
          </Link>
          <Link to="/my-learning" className="btn btn-primary">
            View My Assigned Courses
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '60px' }}>
      {/* Top Header & Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <Link
              to="/courses"
              className="text-muted text-xs"
              style={{ display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
            >
              <ArrowLeft size={13} /> Back to Courses
            </Link>
            <span className="text-muted text-xs">&bull;</span>
            <Link to={`/course/${course.id}`} className="text-muted text-xs" style={{ textDecoration: 'none' }}>
              Course Details ({course.id})
            </Link>
            <span className="text-muted text-xs">&bull;</span>
            <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>
              Course Sharing & Recipient Targeting
            </span>
          </div>

          <h1 style={{ fontSize: '1.75rem', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Share2 size={24} color="var(--primary)" />
            Share Course: {course.title}
          </h1>
          <p className="text-secondary text-sm" style={{ margin: 0 }}>
            Configure official access links, target student recipient groups by department or cohort, and dispatch invitations.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => navigate('/courses')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <ArrowLeft size={14} /> Back to Course Builder
          </button>
          <a
            href={`/course/${course.id}`}
            target="_blank"
            rel="noreferrer"
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <ExternalLink size={14} /> Preview Course Page
          </a>
        </div>
      </div>

      {/* Course Context & Publication Status Banner */}
      <div
        className="card"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          padding: '18px 22px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: 'var(--primary-light)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <BookOpen size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>{course.title}</span>
                <code style={{ fontSize: '0.75rem', background: 'var(--bg-input)', padding: '2px 6px', borderRadius: '4px' }}>
                  {course.id}
                </code>
                <span
                  className={`badge badge-${course.status === 'published' ? 'active' : course.status === 'draft' ? 'draft' : 'warning'}`}
                  style={{ textTransform: 'capitalize' }}
                >
                  {course.status}
                </span>
                <span className="badge badge-primary">{course.category}</span>
              </div>
              <div className="text-muted text-xs" style={{ marginTop: '4px' }}>
                Assigned Faculty: <strong>{assignedTrainer?.displayName || 'Assigned Instructor'}</strong> &bull; Duration:{' '}
                {course.durationHours || 40} hrs &bull; Level: {course.level || 'Intermediate'} &bull; Enrolled:{' '}
                <strong>{course.enrolledLearners || course.learnerCount || 0}</strong> / {course.enrollmentCapacity || 100} seats
              </div>
            </div>
          </div>

          {/* Quick Publish Action if course is not published */}
          {course.status !== 'published' && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => {
                updateCourseStatus(course.id, 'published');
                setSaveNotice('Course has been published and is now open for enrollment!');
                setTimeout(() => setSaveNotice(null), 3500);
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Sparkles size={14} /> Publish Course Now
            </button>
          )}
        </div>

        {course.status !== 'published' && (
          <div
            style={{
              background: 'var(--warning-bg)',
              border: '1px solid var(--warning-border)',
              color: 'var(--warning)',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '0.825rem',
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <div>
              <strong>Course is currently in {course.status} status.</strong> Only published courses permit active student self-enrollment. You can configure links and select recipients now; publishing will immediately unlock student enrollment.
            </div>
          </div>
        )}
      </div>

      {/* Main Sharing Layout Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
        {/* SECTION 1: COURSE LINK & ENROLLMENT RULES */}
        <div
          className="card"
          style={{
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Link2 size={18} color="var(--primary)" />
              <h2 style={{ fontSize: '1.15rem', margin: 0 }}>Official Course Link & Access Settings</h2>
            </div>
            <span className="text-muted text-xs">VeniLearn Canonical Enrollment Gateway</span>
          </div>

          {/* Link URL Bar */}
          <div>
            <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '6px' }}>
              Canonical Shareable Course URL
            </label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <input
                type="text"
                readOnly
                value={shareableUrl}
                className="form-input"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.85rem',
                  background: 'var(--bg-input)',
                  color: 'var(--primary)',
                  fontWeight: 600,
                  flex: 1,
                  minWidth: '280px',
                }}
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                type="button"
                className={`btn ${copied ? 'btn-success' : 'btn-primary'}`}
                onClick={handleCopyLink}
                style={{
                  minWidth: '130px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                {copied ? (
                  <>
                    <Check size={15} /> Copied!
                  </>
                ) : (
                  <>
                    <Copy size={15} /> Copy Link
                  </>
                )}
              </button>
              <a
                href={`/course/${course.id}`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <ExternalLink size={14} /> Open Course
              </a>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
              <span className="text-muted text-xs">
                Students opening this official URL will view course syllabus and can enroll directly.
              </span>
              <span className="text-muted text-xs" style={{ fontStyle: 'italic' }}>
                Copying the link does not automatically send invitations.
              </span>
            </div>
          </div>

          {/* Access Controls Grid */}
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Link Sharing Active State</div>
                <div className="text-muted text-xs">
                  {linkActive
                    ? 'Link is active: Anyone with this link can view details and register.'
                    : 'Link is deactivated: Students visiting this link will see an enrollment closed notice.'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLinkActive(!linkActive)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: linkActive ? 'var(--success)' : 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                }}
                title={linkActive ? 'Deactivate course link' : 'Activate course link'}
              >
                {linkActive ? <ToggleRight size={34} /> : <ToggleLeft size={34} />}
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>
                  <Calendar size={13} /> Enrollment Deadline
                </label>
                <input
                  type="date"
                  className="form-input"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  style={{ fontSize: '0.825rem' }}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>
                  <Users size={13} /> Max Seat Capacity
                </label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  className="form-input"
                  value={capacity}
                  onChange={(e) => setCapacity(parseInt(e.target.value, 10) || 100)}
                  style={{ fontSize: '0.825rem' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.75rem', margin: 0 }}>
                      Require Admin Approval
                    </label>
                    <span className="text-muted text-xs" style={{ display: 'block' }}>
                      {requiresApproval ? 'Manual approval required' : 'Instant automatic join'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRequiresApproval(!requiresApproval)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: requiresApproval ? 'var(--primary)' : 'var(--text-muted)',
                    }}
                  >
                    {requiresApproval ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                  </button>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px' }}>
              {saveNotice && (
                <span style={{ color: 'var(--success)', fontSize: '0.8rem', fontWeight: 600 }}>
                  ✓ {saveNotice}
                </span>
              )}
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleSaveSettings}>
                Save Link & Access Rules
              </button>
            </div>
          </div>
        </div>

        {/* SECTION 2: CHOOSE RECIPIENTS (THE 4 MODES) */}
        <div
          className="card"
          style={{
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={18} color="var(--primary)" />
                <h2 style={{ fontSize: '1.15rem', margin: 0 }}>Choose Recipients</h2>
              </div>
              <p className="text-muted text-xs" style={{ margin: '3px 0 0 0' }}>
                Target institutional learners by department, cohort, individual selection, or campus-wide.
              </p>
            </div>

            {/* Selected Count Indicator */}
            <div
              style={{
                background: selectedStudentIds.size > 0 ? 'var(--primary-light)' : 'var(--bg-input)',
                border: `1px solid ${selectedStudentIds.size > 0 ? 'var(--primary)' : 'var(--border-subtle)'}`,
                padding: '6px 14px',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <UserCheck size={16} color={selectedStudentIds.size > 0 ? 'var(--primary)' : 'var(--text-muted)'} />
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: selectedStudentIds.size > 0 ? 'var(--primary)' : 'var(--text-main)' }}>
                {selectedStudentIds.size} Student{selectedStudentIds.size === 1 ? '' : 's'} Selected
              </span>
              {selectedStudentIds.size > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllSelections}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    padding: 0,
                    marginLeft: '4px',
                  }}
                  title="Clear all selected recipients"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Mode Selector Tabs */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '10px',
            }}
          >
            {/* Mode 1: Department */}
            <button
              type="button"
              onClick={() => setRecipientMode('department')}
              style={{
                background: recipientMode === 'department' ? 'var(--bg-card)' : 'var(--bg-surface)',
                border: recipientMode === 'department' ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 14px',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                transition: 'var(--transition)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: recipientMode === 'department' ? 'var(--primary)' : 'var(--text-main)' }}>
                  By Department
                </span>
                <Building size={16} color={recipientMode === 'department' ? 'var(--primary)' : 'var(--text-muted)'} />
              </div>
              <span className="text-muted text-xs">
                Select an academic department and filter its students
              </span>
            </button>

            {/* Mode 2: Cohort */}
            <button
              type="button"
              onClick={() => setRecipientMode('cohort')}
              style={{
                background: recipientMode === 'cohort' ? 'var(--bg-card)' : 'var(--bg-surface)',
                border: recipientMode === 'cohort' ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 14px',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                transition: 'var(--transition)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: recipientMode === 'cohort' ? 'var(--primary)' : 'var(--text-main)' }}>
                  By Cohort / Batch
                </span>
                <GraduationCap size={16} color={recipientMode === 'cohort' ? 'var(--primary)' : 'var(--text-muted)'} />
              </div>
              <span className="text-muted text-xs">
                Target learners assigned to a specific batch code
              </span>
            </button>

            {/* Mode 3: Individual */}
            <button
              type="button"
              onClick={() => setRecipientMode('individual')}
              style={{
                background: recipientMode === 'individual' ? 'var(--bg-card)' : 'var(--bg-surface)',
                border: recipientMode === 'individual' ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 14px',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                transition: 'var(--transition)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: recipientMode === 'individual' ? 'var(--primary)' : 'var(--text-main)' }}>
                  Individual Students
                </span>
                <Search size={16} color={recipientMode === 'individual' ? 'var(--primary)' : 'var(--text-muted)'} />
              </div>
              <span className="text-muted text-xs">
                Search across all students by name, ID or email
              </span>
            </button>

            {/* Mode 4: All Institution Students */}
            <button
              type="button"
              onClick={() => setRecipientMode('all')}
              style={{
                background: recipientMode === 'all' ? 'var(--bg-card)' : 'var(--bg-surface)',
                border: recipientMode === 'all' ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 14px',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                transition: 'var(--transition)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: recipientMode === 'all' ? 'var(--primary)' : 'var(--text-main)' }}>
                  All Institution Students
                </span>
                <Users size={16} color={recipientMode === 'all' ? 'var(--primary)' : 'var(--text-muted)'} />
              </div>
              <span className="text-muted text-xs">
                Broad campus broadcast to all registered learners
              </span>
            </button>
          </div>

          {/* ======================================================== */}
          {/* MODE 1: DEPARTMENT TARGETING CONTENT */}
          {/* ======================================================== */}
          {recipientMode === 'department' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Department Dropdown & Back / Switch Controls */}
              <div
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div style={{ flex: 1, minWidth: '240px' }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '6px' }}>
                    <Building size={14} color="var(--primary)" /> Select Department
                  </label>
                  <select
                    className="form-select"
                    value={selectedDeptId}
                    onChange={(e) => {
                      setSelectedDeptId(e.target.value);
                      setDeptSearch('');
                    }}
                    style={{ fontSize: '0.875rem', fontWeight: 600 }}
                  >
                    {mockDepartments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name} ({dept.id}) &bull; {dept.memberCount || 50} members
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
                  <span className="text-muted text-xs">Active Filtered Department:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                    <span className="badge badge-primary" style={{ fontSize: '0.8rem', padding: '4px 10px' }}>
                      {selectedDepartment?.name}
                    </span>
                    <span className="text-muted text-xs">
                      ({departmentStudents.length} students found)
                    </span>
                  </div>
                </div>
              </div>

              {/* Department Student Filtering Bar */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
                  <Search size={15} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    placeholder={`Search students in ${selectedDepartment?.name} by name, roll no, or email...`}
                    value={deptSearch}
                    onChange={(e) => setDeptSearch(e.target.value)}
                    className="form-input"
                    style={{ paddingLeft: '34px', fontSize: '0.825rem' }}
                  />
                  {deptSearch && (
                    <button
                      type="button"
                      onClick={() => setDeptSearch('')}
                      style={{ position: 'absolute', right: '10px', top: '9px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleSelectAllInList(filteredDeptStudents)}
                    style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <CheckSquare size={13} /> Select All Filtered ({filteredDeptStudents.length})
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleDeselectAllInList(filteredDeptStudents)}
                    style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Square size={13} /> Deselect Filtered
                  </button>
                </div>
              </div>

              {/* Multi-Department Accumulation Notice */}
              <div
                style={{
                  background: 'rgba(59, 130, 246, 0.08)',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                  borderRadius: 'var(--radius-md)',
                  padding: '8px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.8rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Info size={14} color="var(--primary)" />
                  <span>
                    <strong>Multi-Department Selection:</strong> You can select students in <em>{selectedDepartment?.name}</em>, then select another department from the dropdown to accumulate recipients without losing prior selections.
                  </span>
                </div>
                <span className="badge badge-active" style={{ fontSize: '0.7rem' }}>
                  Duplicate Protected
                </span>
              </div>

              {/* Student List Table */}
              <div className="table-container" style={{ maxHeight: '380px', overflowY: 'auto' }}>
                <table className="table" style={{ fontSize: '0.825rem' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '40px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={filteredDeptStudents.length > 0 && filteredDeptStudents.every(s => selectedStudentIds.has(s.id))}
                          onChange={(e) => {
                            if (e.target.checked) {
                              handleSelectAllInList(filteredDeptStudents);
                            } else {
                              handleDeselectAllInList(filteredDeptStudents);
                            }
                          }}
                        />
                      </th>
                      <th>Student Name</th>
                      <th>Student ID / Roll No</th>
                      <th>Email Address</th>
                      <th>Course Enrollment Status</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDeptStudents.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                          No students found matching your search in {selectedDepartment?.name}.
                        </td>
                      </tr>
                    ) : (
                      filteredDeptStudents.map((st) => {
                        const isSelected = selectedStudentIds.has(st.id);
                        const alreadyEnrolled = isEnrolled(course.id) && st.id === user?.id; // check enrollment
                        return (
                          <tr
                            key={st.id}
                            onClick={() => handleToggleStudent(st.id)}
                            style={{
                              background: isSelected ? 'var(--primary-light)' : undefined,
                              cursor: 'pointer',
                            }}
                          >
                            <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleStudent(st.id)}
                              />
                            </td>
                            <td>
                              <div style={{ fontWeight: 600 }}>{st.displayName}</div>
                            </td>
                            <td>
                              <code>{st.rollNo || st.id}</code>
                            </td>
                            <td>
                              <span className="text-secondary">{st.email}</span>
                            </td>
                            <td>
                              {alreadyEnrolled ? (
                                <span className="badge badge-active" style={{ fontSize: '0.7rem' }}>
                                  ✓ Already Enrolled
                                </span>
                              ) : (
                                <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>
                                  Eligible for Invitation
                                </span>
                              )}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <button
                                type="button"
                                className={`btn ${isSelected ? 'btn-danger' : 'btn-secondary'} btn-sm`}
                                style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleStudent(st.id);
                                }}
                              >
                                {isSelected ? 'Remove' : '+ Select'}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* MODE 2: COHORT / BATCH TARGETING CONTENT */}
          {/* ======================================================== */}
          {recipientMode === 'cohort' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div style={{ flex: 1, minWidth: '240px' }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '6px' }}>
                    <GraduationCap size={14} color="var(--primary)" /> Select Cohort / Batch
                  </label>
                  <select
                    className="form-select"
                    value={selectedCohortId}
                    onChange={(e) => {
                      setSelectedCohortId(e.target.value);
                      setCohortSearch('');
                    }}
                    style={{ fontSize: '0.875rem', fontWeight: 600 }}
                  >
                    {cohorts.map((coh) => (
                      <option key={coh.id} value={coh.id}>
                        {coh.code} &bull; {coh.name} ({coh.learnerCount || 0} students)
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
                  <span className="text-muted text-xs">Assigned Cohort Schedule:</span>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginTop: '2px' }}>
                    {selectedCohort?.startDate} &rarr; {selectedCohort?.endDate}
                  </div>
                  <span className="text-muted text-xs">
                    Capacity: {selectedCohort?.capacity || 30} seats
                  </span>
                </div>
              </div>

              {/* Cohort Student Filter Bar */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
                  <Search size={15} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    placeholder={`Search students in cohort ${selectedCohort?.code}...`}
                    value={cohortSearch}
                    onChange={(e) => setCohortSearch(e.target.value)}
                    className="form-input"
                    style={{ paddingLeft: '34px', fontSize: '0.825rem' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleSelectAllInList(filteredCohortStudents)}
                    style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <CheckSquare size={13} /> Select All Cohort Students ({filteredCohortStudents.length})
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleDeselectAllInList(filteredCohortStudents)}
                    style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Square size={13} /> Deselect All
                  </button>
                </div>
              </div>

              {/* Cohort Student Table */}
              <div className="table-container" style={{ maxHeight: '380px', overflowY: 'auto' }}>
                <table className="table" style={{ fontSize: '0.825rem' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '40px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={filteredCohortStudents.length > 0 && filteredCohortStudents.every(s => selectedStudentIds.has(s.id))}
                          onChange={(e) => {
                            if (e.target.checked) {
                              handleSelectAllInList(filteredCohortStudents);
                            } else {
                              handleDeselectAllInList(filteredCohortStudents);
                            }
                          }}
                        />
                      </th>
                      <th>Student Name</th>
                      <th>Roll Number</th>
                      <th>Email</th>
                      <th>Department</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCohortStudents.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                          No students currently assigned to this cohort.
                        </td>
                      </tr>
                    ) : (
                      filteredCohortStudents.map((st) => {
                        const isSelected = selectedStudentIds.has(st.id);
                        const deptName = mockDepartments.find(d => d.id === st.departmentId)?.name || 'General';
                        return (
                          <tr
                            key={st.id}
                            onClick={() => handleToggleStudent(st.id)}
                            style={{
                              background: isSelected ? 'var(--primary-light)' : undefined,
                              cursor: 'pointer',
                            }}
                          >
                            <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleStudent(st.id)}
                              />
                            </td>
                            <td>
                              <div style={{ fontWeight: 600 }}>{st.displayName}</div>
                            </td>
                            <td>
                              <code>{st.rollNo || st.id}</code>
                            </td>
                            <td>
                              <span className="text-secondary">{st.email}</span>
                            </td>
                            <td>
                              <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>{deptName}</span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <button
                                type="button"
                                className={`btn ${isSelected ? 'btn-danger' : 'btn-secondary'} btn-sm`}
                                style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleStudent(st.id);
                                }}
                              >
                                {isSelected ? 'Remove' : '+ Select'}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* MODE 3: INDIVIDUAL STUDENTS TARGETING CONTENT */}
          {/* ======================================================== */}
          {recipientMode === 'individual' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
                  <Search size={15} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    placeholder="Search any student by name, student ID / roll number, or email..."
                    value={individualSearch}
                    onChange={(e) => setIndividualSearch(e.target.value)}
                    className="form-input"
                    style={{ paddingLeft: '34px', fontSize: '0.825rem' }}
                  />
                </div>

                <div style={{ minWidth: '200px' }}>
                  <select
                    className="form-select"
                    value={individualDeptFilter}
                    onChange={(e) => setIndividualDeptFilter(e.target.value)}
                    style={{ fontSize: '0.825rem' }}
                  >
                    <option value="all">All Departments ({mockDepartments.length})</option>
                    {mockDepartments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleSelectAllInList(filteredIndividualStudents)}
                    style={{ fontSize: '0.75rem' }}
                  >
                    Select Filtered ({filteredIndividualStudents.length})
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleDeselectAllInList(filteredIndividualStudents)}
                    style={{ fontSize: '0.75rem' }}
                  >
                    Deselect Filtered
                  </button>
                </div>
              </div>

              {/* Individual Students Table */}
              <div className="table-container" style={{ maxHeight: '380px', overflowY: 'auto' }}>
                <table className="table" style={{ fontSize: '0.825rem' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '40px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={filteredIndividualStudents.length > 0 && filteredIndividualStudents.every(s => selectedStudentIds.has(s.id))}
                          onChange={(e) => {
                            if (e.target.checked) {
                              handleSelectAllInList(filteredIndividualStudents);
                            } else {
                              handleDeselectAllInList(filteredIndividualStudents);
                            }
                          }}
                        />
                      </th>
                      <th>Student Name</th>
                      <th>Roll Number</th>
                      <th>Email</th>
                      <th>Department</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredIndividualStudents.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                          No students found matching your criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredIndividualStudents.map((st) => {
                        const isSelected = selectedStudentIds.has(st.id);
                        const deptName = mockDepartments.find(d => d.id === st.departmentId)?.name || 'General';
                        return (
                          <tr
                            key={st.id}
                            onClick={() => handleToggleStudent(st.id)}
                            style={{
                              background: isSelected ? 'var(--primary-light)' : undefined,
                              cursor: 'pointer',
                            }}
                          >
                            <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleStudent(st.id)}
                              />
                            </td>
                            <td>
                              <div style={{ fontWeight: 600 }}>{st.displayName}</div>
                            </td>
                            <td>
                              <code>{st.rollNo || st.id}</code>
                            </td>
                            <td>
                              <span className="text-secondary">{st.email}</span>
                            </td>
                            <td>
                              <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>{deptName}</span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <button
                                type="button"
                                className={`btn ${isSelected ? 'btn-danger' : 'btn-secondary'} btn-sm`}
                                style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleStudent(st.id);
                                }}
                              >
                                {isSelected ? 'Remove' : '+ Select'}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* MODE 4: ALL INSTITUTION STUDENTS CONTENT */}
          {/* ======================================================== */}
          {recipientMode === 'all' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {isTrainer ? (
                <div
                  style={{
                    background: 'var(--warning-bg)',
                    border: '1px solid var(--warning-border)',
                    color: 'var(--warning)',
                    padding: '16px',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    fontSize: '0.85rem',
                  }}
                >
                  <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <strong>Institution-Wide Broadcast Permission Notice:</strong>
                    <p style={{ margin: '4px 0 10px 0', fontSize: '0.8rem' }}>
                      Broadcasting course invitations to all students institution-wide requires Institution Administrator authority. As a faculty trainer, you can target students in your department, assigned cohorts, or individually selected students.
                    </p>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setRecipientMode('department')}
                    >
                      Switch to Department Targeting
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1rem' }}>
                        Institution-Wide Student Broadcast
                      </div>
                      <div className="text-muted text-xs">
                        Target all {allStudents.length} active registered students across all academic departments.
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => handleSelectAllInList(allStudents)}
                      >
                        <CheckSquare size={14} /> Select All {allStudents.length} Students
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleDeselectAllInList(allStudents)}
                      >
                        Deselect All
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                    {mockDepartments.map(d => {
                      const count = allStudents.filter(s => s.departmentId === d.id).length;
                      return (
                        <div
                          key={d.id}
                          style={{
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border-subtle)',
                            padding: '10px 12px',
                            borderRadius: 'var(--radius-sm)',
                          }}
                        >
                          <div style={{ fontWeight: 600, fontSize: '0.8rem' }}>{d.name}</div>
                          <div className="text-muted text-xs">{count} active students</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* ACCUMULATED RECIPIENTS SUMMARY PANEL */}
          {/* ======================================================== */}
          {selectedStudentIds.size > 0 && (
            <div
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <UserCheck size={16} color="var(--primary)" />
                  <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                    Selected Recipients Breakdown ({selectedStudentIds.size})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleClearAllSelections}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.75rem', padding: '3px 8px' }}
                >
                  Clear All
                </button>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '6px',
                  maxHeight: '140px',
                  overflowY: 'auto',
                  padding: '4px 0',
                }}
              >
                {selectedStudentsList.map((st) => {
                  const dept = mockDepartments.find(d => d.id === st.departmentId)?.name || 'General';
                  return (
                    <span
                      key={st.id}
                      style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '4px 8px',
                        fontSize: '0.75rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <strong>{st.displayName}</strong>
                      <span className="text-muted text-xs">({st.rollNo || st.id}) &bull; {dept}</span>
                      <button
                        type="button"
                        onClick={() => handleToggleStudent(st.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0,
                          color: 'var(--text-muted)',
                        }}
                        title="Remove student"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* SECTION 3: INVITATION MESSAGE & NOTIFICATION PREVIEW */}
        <div
          className="card"
          style={{
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Send size={18} color="var(--primary)" />
            <h2 style={{ fontSize: '1.15rem', margin: 0 }}>Course Invitation Message & Student Experience</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            {/* Custom Note Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '6px' }}>
                  Inviting Authority (Sender Identity)
                </label>
                <div
                  style={{
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{inviterName}</div>
                    <div className="text-muted text-xs">{inviterRole} &bull; VeniLearn LMS</div>
                  </div>
                  <span className="badge badge-primary">{user?.activeRole}</span>
                </div>
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '6px' }}>
                  Custom Invitation Note (Optional)
                </label>
                <textarea
                  className="form-textarea"
                  rows={4}
                  placeholder={`e.g. You have been selected for enrollment in ${course.title}. Please review the course syllabus and confirm your registration before the deadline.`}
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  style={{ fontSize: '0.85rem' }}
                />
                <span className="form-helper" style={{ fontSize: '0.725rem' }}>
                  Appended to the student notification message and in-app invitation banner.
                </span>
              </div>
            </div>

            {/* Live Student Notification Preview */}
            <div>
              <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '6px' }}>
                <Eye size={13} /> Live Student Notification Preview
              </label>
              <div
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '6px',
                        background: 'var(--primary-light)',
                        color: 'var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <BookOpen size={14} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                        Course Invitation: {course.title}
                      </div>
                      <div className="text-muted text-xs">
                        From: {inviterName} ({inviterRole}) &bull; Just now
                      </div>
                    </div>
                  </div>
                  <span className="badge badge-active" style={{ fontSize: '0.65rem' }}>New</span>
                </div>

                <div
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '10px 12px',
                    fontSize: '0.8rem',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.5,
                  }}
                >
                  {inviterName} ({inviterRole}) invited you to join "{course.title}".{' '}
                  {customNote.trim() ? `"${customNote.trim()}"` : course.shortDescription || 'Click below to review curriculum outcomes and join this course.'}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className="text-muted text-xs">Destination: /course/{course.id}</span>
                  <span className="btn btn-primary btn-sm" style={{ fontSize: '0.75rem', padding: '4px 10px', pointerEvents: 'none' }}>
                    View Course & Join &rarr;
                  </span>
                </div>
              </div>

              {/* Prototype Notice */}
              <div
                style={{
                  marginTop: '10px',
                  background: 'rgba(99, 102, 241, 0.08)',
                  border: '1px solid rgba(99, 102, 241, 0.2)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '8px 10px',
                  fontSize: '0.75rem',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Info size={14} color="var(--primary)" style={{ flexShrink: 0 }} />
                <span>
                  <strong>Frontend Prototype Notice:</strong> Invitations are stored to persistent local state and will immediately appear in the recipient students' notification drawer and student dashboard in this demo environment.
                </span>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div
            style={{
              marginTop: '10px',
              paddingTop: '16px',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div>
              <span className="text-muted text-xs">
                {selectedStudentIds.size === 0
                  ? 'Select at least one recipient above to dispatch invitations'
                  : `Ready to send official invitations to ${selectedStudentIds.size} student(s)`}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate('/courses')}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={selectedStudentIds.size === 0 || !linkActive}
                onClick={() => setIsConfirmModalOpen(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Send size={15} /> Send Course Invitation ({selectedStudentIds.size})
              </button>
            </div>
          </div>
        </div>

        {/* SECTION 4: DELIVERY SUCCESS REPORT BANNER */}
        {dispatchStatus && (
          <div
            className="card"
            style={{
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid var(--success-border)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle2 size={24} color="var(--success)" />
                <div>
                  <h3 style={{ fontSize: '1.15rem', margin: 0, color: 'var(--success)' }}>
                    Course Invitations Sent Successfully!
                  </h3>
                  <p className="text-muted text-xs" style={{ margin: '2px 0 0 0' }}>
                    Invitations dispatched to {dispatchStatus.count} student(s) at {dispatchStatus.timestamp}.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setDispatchStatus(null)}
              >
                Dismiss Report
              </button>
            </div>

            <div
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 16px',
                fontSize: '0.85rem',
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: '6px' }}>Recipient Delivery Summary:</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {dispatchStatus.recipients.map(rId => {
                  const student = allStudents.find(s => s.id === rId);
                  return (
                    <span key={rId} className="badge badge-active" style={{ fontSize: '0.75rem' }}>
                      ✓ {student?.displayName || rId} ({student?.rollNo || rId})
                    </span>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <span className="text-muted text-xs">
                To test the student experience, use the <strong>Role Switcher</strong> in the top header to switch to Student persona (Alex Thompson) and verify the notification bell!
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setSelectedStudentIds(new Set());
                    setDispatchStatus(null);
                  }}
                >
                  Send More Invitations
                </button>
                <Link to="/courses" className="btn btn-primary btn-sm">
                  Return to Course Builder
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CONFIRMATION MODAL */}
      {isConfirmModalOpen && (
        <div className="modal-overlay" onClick={() => setIsConfirmModalOpen(false)}>
          <div
            className="modal-card"
            style={{ maxWidth: '580px', width: '92%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Send size={18} color="var(--primary)" />
                <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Confirm Course Invitation Dispatch</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p className="text-secondary text-sm" style={{ margin: 0 }}>
                You are about to dispatch official course invitations for:
              </p>

              <div
                style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 16px',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{course.title}</div>
                <div className="text-muted text-xs" style={{ marginTop: '2px' }}>
                  ID: <code>{course.id}</code> &bull; Sender: <strong>{inviterName}</strong> ({inviterRole})
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Target Recipients:</span>
                <span className="badge badge-primary">{selectedStudentIds.size} student(s)</span>
              </div>

              <div
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px 12px',
                  maxHeight: '130px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '6px',
                }}
              >
                {selectedStudentsList.map(st => (
                  <span key={st.id} className="badge badge-draft" style={{ fontSize: '0.725rem' }}>
                    {st.displayName} ({st.rollNo || st.id})
                  </span>
                ))}
              </div>

              {customNote.trim() && (
                <div>
                  <span style={{ fontWeight: 600, fontSize: '0.8rem', display: 'block', marginBottom: '4px' }}>
                    Included Custom Message:
                  </span>
                  <div
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.8rem',
                      fontStyle: 'italic',
                    }}
                  >
                    "{customNote.trim()}"
                  </div>
                </div>
              )}

              <div className="text-muted text-xs" style={{ lineHeight: 1.4 }}>
                Recipients will immediately receive this notification with a direct link to view course outcomes and self-enroll.
              </div>
            </div>

            <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsConfirmModalOpen(false)}
              >
                Review & Edit
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirmSend}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Check size={16} /> Confirm & Dispatch ({selectedStudentIds.size})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
