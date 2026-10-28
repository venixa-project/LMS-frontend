import React, { useState } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../lib/store';
import { useCourseStore } from '../../lib/courseStore';
import { mockDepartments } from '../../data/mockData';
import { mockUsers } from '../../data/mockUsers';
import { ShareCourseModal } from '../../components/ShareCourseModal';
import { BackToCoursesButton } from '../../components/BackToCoursesButton';
import {
  BookOpen, Clock, Users, ShieldCheck, CheckCircle2, Lock,
  Play, ArrowLeft, AlertCircle, Calendar, GraduationCap,
  Award, Check, ExternalLink, Sparkles, Share2, Layers,
  AlertTriangle, FileText, ChevronRight, UserPlus
} from 'lucide-react';

export const PublicCourseDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const { user, isAuthenticated } = useAuthStore();
  const {
    getCourseById,
    isEnrolled,
    hasRequested,
    enrollInCourse,
    requestToJoinCourse
  } = useCourseStore();

  const [enrollmentNotice, setEnrollmentNotice] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Normalize course id lookup
  const course = id ? getCourseById(id) : undefined;

  if (!course) {
    return (
      <div style={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 20px',
        textAlign: 'center'
      }}>
        <div className="card" style={{ maxWidth: '520px', padding: '40px 32px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.15)',
            color: 'var(--danger)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px auto'
          }}>
            <AlertCircle size={32} />
          </div>
          <h2 style={{ fontSize: '1.4rem', margin: '0 0 8px 0' }}>Course Not Found</h2>
          <p className="text-secondary text-sm" style={{ margin: '0 0 24px 0' }}>
            The course identifier <code>{id}</code> does not exist or has been permanently removed. Please check the URL or browse available offerings in the curriculum catalog.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <Link to="/catalog" className="btn btn-primary">
              <BookOpen size={15} /> Browse Course Catalog
            </Link>
            <Link to="/" className="btn btn-secondary">
              Go to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isPublished = course.status === 'published';
  const isStudent = user?.activeRole === 'student' || user?.activeRole === 'learner';
  const isAdmin = user?.activeRole === 'platform_admin' ||
    user?.activeRole === 'org_admin' ||
    user?.activeRole === 'lms_admin' ||
    (user?.activeRole as string) === 'industrial_admin';
  const isFaculty = user?.activeRole === 'trainer' || user?.activeRole === 'instructor';
  const isTrainerOrAdmin = isAdmin || isFaculty;

  const isAuthorizedTrainer = Boolean(
    isAdmin ||
    course.createdBy === user?.id ||
    course.instructors?.includes(user?.id || '') ||
    (user?.id === 'u-004' && ['crs-001', 'crs-002', 'crs-004', 'crs-006'].includes(course.id)) ||
    (user?.id === 'u-003' && ['crs-003'].includes(course.id)) ||
    (user?.id === 'u-005' && ['crs-005'].includes(course.id))
  );

  const alreadyEnrolled = isEnrolled(course.id);
  const pendingApproval = hasRequested(course.id);

  // Check enrollment deadlines & capacity
  const isLinkDeactivated = course.shareableLinkEnabled === false;
  const isDeadlinePassed = course.enrollmentDeadline
    ? new Date() > new Date(course.enrollmentDeadline)
    : false;
  const currentLearners = course.enrolledLearners ?? course.learnerCount ?? 0;
  const maxCapacity = course.enrollmentCapacity ?? 100;
  const isCapacityFull = currentLearners >= maxCapacity;

  const canJoin = isPublished && !isLinkDeactivated && !isDeadlinePassed && !isCapacityFull && !alreadyEnrolled;

  // Lead Trainer lookup
  const trainerId = course.instructors?.[0] || 'u-004';
  const leadTrainer = mockUsers.find(u => u.id === trainerId);
  const trainerDept = mockDepartments.find(d => d.id === leadTrainer?.departmentId);

  const totalLessons = course.modules?.reduce((acc, m) => acc + (m.lessons?.length || 0), 0) || 0;

  // Handle Enrollment Action
  const handleEnrollClick = () => {
    if (!isAuthenticated) {
      // Preserve intended course destination through redirect query
      navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`);
      return;
    }

    if (course.enrollmentApprovalRequired) {
      const res = requestToJoinCourse(course.id, user?.id);
      setEnrollmentNotice(res.message);
      return;
    }

    const res = enrollInCourse(course.id, user?.id);
    if (res.success) {
      setShowSuccessModal(true);
    } else {
      setEnrollmentNotice(res.message);
    }
  };

  return (
    <div style={{ maxWidth: '1180px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* Top Breadcrumb Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <BackToCoursesButton />

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {isTrainerOrAdmin && (
            <Link
              to={`/courses/${course.id}/share`}
              className="btn btn-secondary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Share2 size={14} /> Share Course & Recipients
            </Link>
          )}

          {isAuthenticated ? (
            <span className="badge badge-draft" style={{ fontSize: '0.75rem' }}>
              Logged in: <strong>{user?.displayName}</strong> ({user?.activeRole})
            </span>
          ) : (
            <Link
              to={`/login?redirect=${encodeURIComponent(location.pathname)}`}
              className="btn btn-primary btn-sm"
            >
              Sign In to Your Account
            </Link>
          )}
        </div>
      </div>

      {/* Unpublished Course Preview Notice */}
      {!isPublished && (
        <div
          style={{
            background: 'var(--warning-bg)',
            border: '1px solid var(--warning-border)',
            color: 'var(--warning)',
            padding: '14px 18px',
            borderRadius: 'var(--radius-md)',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <AlertTriangle size={20} style={{ flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
              Course Status: {course.status.toUpperCase()} &bull; Not Open for Public Enrollment
            </div>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem' }}>
              {isTrainerOrAdmin
                ? 'You are viewing an administrative preview of this curriculum. Learners cannot register until this course is Published.'
                : 'This course is currently in authoring/review and is not accepting student registrations.'}
            </p>
          </div>
        </div>
      )}

      {/* Main Grid: Left Details (65%), Right Sticky Enrollment Card (35%) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) minmax(320px, 1.2fr)', gap: '28px', alignItems: 'start' }}>
        {/* Left Column: Full Course Curriculum Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Header Card */}
          <div
            className="card"
            style={{
              padding: '28px',
              background: 'linear-gradient(135deg, var(--bg-card) 0%, rgba(99, 102, 241, 0.09) 100%)',
              border: '1px solid var(--border-light)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
              <span className="badge badge-primary">{course.category}</span>
              <span className="badge badge-draft">{course.level || 'Intermediate'} Level</span>
              <span className="badge badge-secondary">{course.language || 'English'}</span>
              <span className="text-muted text-xs font-semibold">Track ID: {course.id}</span>
            </div>

            <h1 style={{ fontSize: '2rem', margin: '0 0 12px 0', lineHeight: 1.25 }}>
              {course.title}
            </h1>

            <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 20px 0' }}>
              {course.shortDescription || course.description}
            </p>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '24px',
              paddingTop: '16px',
              borderTop: '1px solid var(--border-subtle)',
              flexWrap: 'wrap',
              fontSize: '0.875rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={16} color="var(--primary)" />
                <span><strong>{course.durationHours || 40} Hours</strong> Curriculum</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={16} color="var(--accent-purple)" />
                <span><strong>{course.modules?.length || 0} Modules</strong> &bull; {totalLessons} Lessons</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Award size={16} color="var(--success)" />
                <span>Verified Certificate of Completion</span>
              </div>
            </div>
          </div>

          {/* Lead Trainer / Faculty Card */}
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <ShieldCheck size={20} color="var(--primary)" />
              <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Lead Course Instructor</h2>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent-purple) 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.2rem',
                fontWeight: 700,
                boxShadow: '0 4px 12px var(--primary-light)',
                flexShrink: 0
              }}>
                {leadTrainer?.firstName?.[0] || 'D'}{leadTrainer?.lastName?.[0] || 'W'}
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ fontSize: '1.1rem', margin: 0 }}>{leadTrainer?.displayName || 'Dr. James Wilson'}</h3>
                  <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>Faculty Lead</span>
                </div>
                <div className="text-secondary text-sm" style={{ marginTop: '2px' }}>
                  {trainerDept?.name || 'Academic Faculty'} &bull; {leadTrainer?.specialization || 'Curriculum Architect'}
                </div>
                <p className="text-muted text-xs" style={{ margin: '6px 0 0 0' }}>
                  Institutional course supervisor responsible for syllabus delivery, evaluation design, and live session facilitation.
                </p>
              </div>
            </div>
          </div>

          {/* What You Will Learn (Learning Outcomes) */}
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <Sparkles size={20} color="var(--primary)" />
              <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Learning Outcomes & Key Competencies</h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
              {(course.learningOutcomes && course.learningOutcomes.length > 0
                ? course.learningOutcomes
                : [
                    'Master foundational and advanced principles in ' + course.category,
                    'Apply hands-on skills through real-world labs and evaluated exercises',
                    'Structure enterprise-grade solutions following industry standards',
                    'Demonstrate competency required for academic credit and certificate issuance'
                  ]
              ).map((outcome, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.875rem'
                  }}
                >
                  <Check size={16} color="var(--success)" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>{outcome}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Course Curriculum & Syllabus Structure Preview */}
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <BookOpen size={20} color="var(--primary)" />
                <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Curriculum Syllabus Outline</h2>
              </div>
              <span className="text-muted text-xs">
                {course.modules?.length || 0} Modules &bull; {totalLessons} Lessons
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {course.modules?.map((mod, mIdx) => (
                <div
                  key={mod.id || mIdx}
                  style={{
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-input)',
                    overflow: 'hidden'
                  }}
                >
                  <div style={{
                    padding: '12px 16px',
                    background: 'var(--bg-surface)',
                    borderBottom: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                      Module {mIdx + 1}: {mod.title}
                    </span>
                    <span className="text-muted text-xs">
                      {mod.lessons?.length || 0} Lessons
                    </span>
                  </div>

                  <div style={{ padding: '8px 16px' }}>
                    {mod.lessons?.map((les, lIdx) => (
                      <div
                        key={les.id || lIdx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 0',
                          borderBottom: lIdx === mod.lessons.length - 1 ? 'none' : '1px dashed var(--border-subtle)',
                          fontSize: '0.825rem'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Play size={13} color="var(--text-muted)" />
                          <span>{les.title}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="text-muted text-xs">{les.duration || 15}m</span>
                          <span
                            className="badge badge-draft"
                            style={{ fontSize: '0.675rem', display: 'flex', alignItems: 'center', gap: '3px' }}
                            title="Enroll to unlock full lesson video and assignments"
                          >
                            <Lock size={10} /> Enrolled Only
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Prerequisites Card */}
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <GraduationCap size={20} color="var(--accent-purple)" />
              <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Prerequisites & Enrollment Requirements</h2>
            </div>
            <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.7 }}>
              {(course.prerequisites && course.prerequisites.length > 0
                ? course.prerequisites
                : ['Basic computer literacy and active institutional account', 'Completed high school algebra or equivalent fundamentals']
              ).map((prereq, pIdx) => (
                <li key={pIdx}>{prereq}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right Column: Sticky Action & Enrollment Summary Card */}
        <div style={{ position: 'sticky', top: '80px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            className="card"
            style={{
              padding: '24px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-light)',
              boxShadow: 'var(--shadow-lg)'
            }}
          >
            {/* Thumbnail Header in Sidebar */}
            <div
              style={{
                height: '160px',
                borderRadius: 'var(--radius-md)',
                background: course.thumbnail
                  ? `url(${course.thumbnail}) center/cover no-repeat`
                  : 'linear-gradient(135deg, rgba(99, 102, 241, 0.35) 0%, rgba(139, 92, 246, 0.45) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {!course.thumbnail && <BookOpen size={54} color="#ffffff" style={{ opacity: 0.9 }} />}
              <div style={{
                position: 'absolute',
                bottom: '10px',
                right: '10px',
                background: 'rgba(0,0,0,0.6)',
                padding: '3px 8px',
                borderRadius: '4px',
                fontSize: '0.725rem',
                color: '#fff',
                fontWeight: 600
              }}>
                {course.durationHours || 40} Hours
              </div>
            </div>

            {/* Access Status & Availability */}
            <div style={{ marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span className="text-muted text-xs font-semibold">ENROLLMENT STATUS</span>
                {alreadyEnrolled ? (
                  <span className="badge badge-active">Already Enrolled</span>
                ) : !isPublished ? (
                  <span className="badge badge-warning">Unpublished</span>
                ) : isLinkDeactivated ? (
                  <span className="badge badge-danger">Link Deactivated</span>
                ) : isDeadlinePassed ? (
                  <span className="badge badge-danger">Deadline Expired</span>
                ) : isCapacityFull ? (
                  <span className="badge badge-warning">Capacity Full</span>
                ) : (
                  <span className="badge badge-active">Open for Enrollment</span>
                )}
              </div>

              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)' }}>
                Institutional Access
              </div>
              <p className="text-muted text-xs" style={{ margin: '2px 0 0 0' }}>
                Covered under your VeniLearn academic subscription
              </p>
            </div>

            {/* Notice / Feedback Banner */}
            {enrollmentNotice && (
              <div
                style={{
                  background: 'var(--info-bg)',
                  border: '1px solid var(--info-border)',
                  color: 'var(--text-main)',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.825rem',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <AlertCircle size={15} color="var(--info)" />
                <span>{enrollmentNotice}</span>
              </div>
            )}

            {/* Key Enrollment Parameters */}
            <div style={{
              background: 'var(--bg-input)',
              borderRadius: 'var(--radius-md)',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              marginBottom: '20px',
              fontSize: '0.825rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-muted">Enrolled Students:</span>
                <strong>{currentLearners} / {maxCapacity}</strong>
              </div>

              {course.enrollmentDeadline && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-muted">Registration Deadline:</span>
                  <strong style={{ color: isDeadlinePassed ? 'var(--danger)' : 'var(--text-main)' }}>
                    {new Date(course.enrollmentDeadline).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                  </strong>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-muted">Enrollment Type:</span>
                <strong>{course.enrollmentApprovalRequired ? 'Approval Required' : 'Instant Automatic'}</strong>
              </div>
            </div>

            {/* Main Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {alreadyEnrolled ? (
                <>
                  <Link
                    to={`/course-player/${course.id}`}
                    className="btn btn-primary"
                    style={{
                      justifyContent: 'center',
                      padding: '12px',
                      fontSize: '0.95rem',
                      fontWeight: 700,
                      gap: '8px'
                    }}
                  >
                    <Play size={16} /> Continue Learning &rarr;
                  </Link>
                  <Link
                    to="/my-learning"
                    className="btn btn-secondary"
                    style={{ justifyContent: 'center', fontSize: '0.85rem' }}
                  >
                    View in My Enrolled Courses
                  </Link>
                </>
              ) : isStudent || !isAuthenticated ? (
                canJoin ? (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleEnrollClick}
                    style={{
                      justifyContent: 'center',
                      padding: '14px',
                      fontSize: '1rem',
                      fontWeight: 700,
                      gap: '8px',
                      background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent-purple) 100%)',
                      boxShadow: '0 4px 16px var(--primary-light)'
                    }}
                  >
                    {!isAuthenticated ? (
                      <>
                        <Lock size={16} /> Sign In to Join Course
                      </>
                    ) : course.enrollmentApprovalRequired ? (
                      pendingApproval ? (
                        <>
                          <Clock size={16} /> Request Pending Approval
                        </>
                      ) : (
                        <>
                          <Sparkles size={16} /> Request to Join Course
                        </>
                      )
                    ) : (
                      <>
                        <CheckCircle2 size={16} /> Join Course Now
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="btn btn-secondary"
                    style={{ justifyContent: 'center', padding: '12px', opacity: 0.7 }}
                  >
                    {isLinkDeactivated
                      ? 'Enrollment Deactivated'
                      : isDeadlinePassed
                      ? 'Registration Deadline Expired'
                      : isCapacityFull
                      ? 'Section Limit Reached'
                      : 'Enrollment Unavailable'}
                  </button>
                )
              ) : isAdmin ? (
                /* Institution Admin Options */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <Link
                    to={`/course-builder?id=${course.id}`}
                    className="btn btn-primary"
                    style={{ justifyContent: 'center', gap: '6px', fontWeight: 600 }}
                  >
                    <FileText size={15} /> Edit in Course Builder
                  </Link>
                  <Link
                    to={`/course-player/${course.id}`}
                    className="btn btn-secondary"
                    style={{ justifyContent: 'center', gap: '6px' }}
                  >
                    <Play size={15} /> Preview Course as Student
                  </Link>
                  <Link
                    to={`/courses/${course.id}/assign-students`}
                    className="btn btn-secondary"
                    style={{ justifyContent: 'center', gap: '6px' }}
                  >
                    <UserPlus size={15} /> Assign Students
                  </Link>
                </div>
              ) : (
                /* Trainer Options */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {isAuthorizedTrainer ? (
                    <>
                      <Link
                        to={`/course-builder?id=${course.id}`}
                        className="btn btn-primary"
                        style={{ justifyContent: 'center', gap: '6px', fontWeight: 600 }}
                      >
                        <FileText size={15} /> Edit Course / Lessons
                      </Link>
                      <Link
                        to={`/courses/${course.id}/assign-students`}
                        className="btn btn-secondary"
                        style={{ justifyContent: 'center', gap: '6px' }}
                      >
                        <UserPlus size={15} /> Assign Students
                      </Link>
                      <Link
                        to={`/enrollments?courseId=${course.id}`}
                        className="btn btn-secondary"
                        style={{ justifyContent: 'center', gap: '6px' }}
                      >
                        <Users size={15} /> View Enrollments
                      </Link>
                      <Link
                        to={`/course-player/${course.id}`}
                        className="btn btn-secondary"
                        style={{ justifyContent: 'center', gap: '6px' }}
                      >
                        <Play size={15} /> Preview Course as Student
                      </Link>
                    </>
                  ) : (
                    <>
                      <div
                        style={{
                          padding: '8px 12px',
                          background: 'var(--bg-input)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.78rem',
                          color: 'var(--text-muted)',
                          textAlign: 'center',
                          border: '1px solid var(--border-subtle)',
                          marginBottom: '4px'
                        }}
                      >
                        Course created by {leadTrainer?.displayName || 'another faculty member'} (Read-Only)
                      </div>
                      <Link
                        to={`/course-player/${course.id}`}
                        className="btn btn-secondary"
                        style={{ justifyContent: 'center', gap: '6px' }}
                      >
                        <Play size={15} /> Preview Course as Student
                      </Link>
                      <Link
                        to="/courses"
                        className="btn btn-secondary"
                        style={{ justifyContent: 'center', gap: '6px' }}
                      >
                        <BookOpen size={15} /> Back to Course Catalog
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>

            <p className="text-muted text-xs" style={{ textAlign: 'center', marginTop: '16px', margin: '16px 0 0 0' }}>
              🔒 Protected enrollment &bull; Official VeniLearn Course Gateway
            </p>
          </div>
        </div>
      </div>

      {/* SUCCESS CONFIRMATION MODAL */}
      {showSuccessModal && (
        <div className="modal-overlay" onClick={() => setShowSuccessModal(false)}>
          <div
            className="modal-card"
            style={{ maxWidth: '480px', padding: '32px', textAlign: 'center' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: 'var(--success-bg)',
              color: 'var(--success)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto'
            }}>
              <CheckCircle2 size={32} />
            </div>

            <h3 style={{ fontSize: '1.35rem', margin: '0 0 8px 0' }}>
              Enrollment Successful!
            </h3>
            <p className="text-secondary text-sm" style={{ margin: '0 0 24px 0' }}>
              You are now officially enrolled in <strong>"{course.title}"</strong>. All modules and lesson materials have been unlocked for your account.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Link
                to={`/course-player/${course.id}`}
                className="btn btn-primary"
                style={{ justifyContent: 'center', padding: '12px', fontWeight: 700 }}
              >
                Start Learning Now &rarr;
              </Link>
              <Link
                to="/my-learning"
                className="btn btn-secondary"
                style={{ justifyContent: 'center' }}
              >
                Go to My Enrolled Courses
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* SHARE SETTINGS MODAL */}
      {isShareModalOpen && (
        <ShareCourseModal
          course={course}
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
        />
      )}
    </div>
  );
};
