import React, { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../../lib/store';
import { useAssessmentStore } from '../../lib/assessmentStore';
import { useCourseStore } from '../../lib/courseStore';
import { useCohortStore } from '../../lib/cohortStore';
import { Assessment } from '../../types';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { CreateAssessmentModal } from './components/CreateAssessmentModal';
import { ExamPaperPreviewModal } from './components/ExamPaperPreviewModal';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { AssignmentGradingModal, CourseAssignment, StudentSubmissionRecord } from './components/AssignmentGradingModal';
import {
  fetchAssignmentsApi,
  createAssignmentApi,
  submitAssignmentDeliverableApi,
  gradeAssignmentSubmissionApi,
} from '../../api/assignment.api';
import {
  ClipboardCheck, Plus, Clock, Award, Shield, Eye,
  Play, CheckCircle2, X, AlertTriangle, Sparkles, HelpCircle,
  FileText, Upload, Calendar, PenTool, Check, Filter, Trash2, Edit3, ArrowUpRight, Video, Copy, Share2, RefreshCw
} from 'lucide-react';

interface Props {
  defaultTab?: 'assessments' | 'assignments' | 'results';
}

export const AssessmentsPage: React.FC<Props> = ({ defaultTab = 'assessments' }) => {
  const { user } = useAuthStore();
  const isFaculty = user?.activeRole === 'trainer' || user?.activeRole === 'instructor';
  const isLearner = user?.activeRole === 'student' || user?.activeRole === 'learner';
  const navigate = useNavigate();
  const location = useLocation();

  const getTabFromPath = (path: string): 'assessments' | 'assignments' | 'results' => {
    if (path.includes('assignments')) return 'assignments';
    if (path.includes('results')) return 'results';
    if (path.includes('assessments')) return 'assessments';
    return defaultTab;
  };

  const [activeTab, setActiveTab] = useState<'assessments' | 'assignments' | 'results'>(() => getTabFromPath(location.pathname));

  useEffect(() => {
    const tabFromPath = getTabFromPath(location.pathname);
    setActiveTab(tabFromPath);
  }, [location.pathname, defaultTab]);

  const {
    assessments,
    drafts,
    addAssessment,
    saveDraft,
    deleteAssessment,
    deleteDraft,
    publishAssessment,
    myAttempts,
    fetchAssessments,
    fetchMyAttempts
  } = useAssessmentStore();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingDraft, setEditingDraft] = useState<Assessment | null>(null);
  const [previewAssessment, setPreviewAssessment] = useState<Assessment | null>(null);
  const [publishedPopupAssessment, setPublishedPopupAssessment] = useState<Assessment | null>(null);
  const [assessmentStatusFilter, setAssessmentStatusFilter] = useState<'published' | 'drafts'>('published');
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [selectedCourseFilter, setSelectedCourseFilter] = useState('all');
  const [notice, setNotice] = useState<string | null>(null);

  // Custom Delete Confirmation Modal State
  const [deleteModalConfig, setDeleteModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Student assignment submission modal state
  const [submittingAssignment, setSubmittingAssignment] = useState<CourseAssignment | null>(null);
  const [viewingAssignment, setViewingAssignment] = useState<CourseAssignment | null>(null);
  const [gradingAssignment, setGradingAssignment] = useState<CourseAssignment | null>(null);
  const [submissionDeliverable, setSubmissionDeliverable] = useState('');
  const [submissionNotes, setSubmissionNotes] = useState('');
  const [honorCodeAgreed, setHonorCodeAgreed] = useState(false);
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'pending' | 'submitted' | 'graded'>('all');

  useEffect(() => {
    fetchAssessments();
    if (isLearner) {
      fetchMyAttempts();
    }
  }, [fetchAssessments, fetchMyAttempts, isLearner]);

  const showNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 4000);
  };

  // Faculty & Learner course reactive subscription
  const { courses: assignedCourses, fetchCourses: fetchAllCourses } = useCourseStore();
  useEffect(() => {
    fetchAllCourses();
  }, [fetchAllCourses]);

  const [assignments, setAssignments] = useState<CourseAssignment[]>([]);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);

  const loadBackendAssignments = useCallback(async () => {
    try {
      setIsLoadingAssignments(true);
      const data = await fetchAssignmentsApi();
      if (Array.isArray(data)) {
        setAssignments(data);
      }
    } catch (err) {
      console.warn('Could not load assignments from backend API:', err);
    } finally {
      setIsLoadingAssignments(false);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.removeItem('venilearn_assignments');
    } catch {}
    loadBackendAssignments();
  }, [loadBackendAssignments]);

  const handleSubmitDeliverable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!submittingAssignment || !submissionDeliverable.trim()) return;

    const nextAssignments = assignments.map((a) => {
      if (a.id === submittingAssignment.id) {
        const existingSubs: StudentSubmissionRecord[] = a.submissions ? [...a.submissions] : [];
        const studentSubIndex = existingSubs.findIndex(
          (s) => s.studentId === (user?.id || 'u-007') || s.studentName === (user?.displayName || 'Alex Thompson')
        );
        const newRecord: StudentSubmissionRecord = {
          id: studentSubIndex >= 0 ? existingSubs[studentSubIndex].id : `sub-${a.id}-${user?.id || 'alex'}`,
          studentId: user?.id || 'u-007',
          studentName: user?.displayName || 'Alex Thompson',
          studentEmail: user?.email || 'student@lms.demo',
          studentRollNo: user?.rollNo || 'STU-2026-007',
          submittedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          submissionUrl: submissionDeliverable.trim(),
          submissionNotes: submissionNotes.trim() || undefined,
          status: 'pending',
          maxScore: a.totalMarks,
        };

        if (studentSubIndex >= 0) {
          existingSubs[studentSubIndex] = newRecord;
        } else {
          existingSubs.unshift(newRecord);
        }

        return {
          ...a,
          learnerStatus: 'submitted' as const,
          learnerSubmissionUrl: submissionDeliverable.trim(),
          learnerSubmittedAt: new Date().toISOString().split('T')[0],
          submissionsCount: Math.max(a.submissionsCount + 1, existingSubs.length),
          submissions: existingSubs,
          learnerFeedback: 'Deliverable submitted successfully. Awaiting faculty review and scoring.',
        };
      }
      return a;
    });

    setAssignments(nextAssignments);

    // Persist to PostgreSQL backend database asynchronously
    submitAssignmentDeliverableApi(submittingAssignment.id, {
      submissionUrl: submissionDeliverable.trim(),
      submissionNotes: submissionNotes.trim() || undefined,
    })
      .then(() => {
        loadBackendAssignments();
      })
      .catch((err) => {
        console.warn('Failed to persist deliverable to PostgreSQL API:', err);
      });

    showNotice(`Deliverable for "${submittingAssignment.title}" submitted successfully!`);
    setSubmittingAssignment(null);
    setSubmissionDeliverable('');
    setSubmissionNotes('');
    setHonorCodeAgreed(false);
  };

  const handleSaveAssignmentGrade = (
    assignmentId: string,
    submissionId: string,
    score: number,
    letterGrade: string,
    feedback: string
  ) => {
    const nextAssignments = assignments.map((a) => {
      if (a.id === assignmentId) {
        const existingSubs: StudentSubmissionRecord[] = a.submissions ? [...a.submissions] : [];
        const subIndex = existingSubs.findIndex((s) => s.id === submissionId);
        const updatedRecord: StudentSubmissionRecord = subIndex >= 0
          ? {
              ...existingSubs[subIndex],
              status: 'graded' as const,
              score,
              letterGrade,
              feedback,
              gradedBy: user?.displayName || 'Faculty Grader',
              gradedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            }
          : {
              id: submissionId,
              studentId: 'u-007',
              studentName: 'Alex Thompson',
              studentEmail: 'student@lms.demo',
              studentRollNo: 'STU-2026-007',
              submittedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
              submissionUrl: a.learnerSubmissionUrl || 'https://github.com/alex-thompson/hero-capstone-project',
              status: 'graded' as const,
              score,
              maxScore: a.totalMarks,
              letterGrade,
              feedback,
              gradedBy: user?.displayName || 'Faculty Grader',
              gradedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            };

        if (subIndex >= 0) {
          existingSubs[subIndex] = updatedRecord;
        } else {
          existingSubs.push(updatedRecord);
        }

        const totalGraded = existingSubs.filter((s) => s.status === 'graded').length;
        const newGradedCount = Math.max(a.gradedCount, totalGraded);

        // Check if this graded submission applies to the student view
        const isStudentSub = submissionId.includes('alex') || submissionId.includes(user?.id || '');

        return {
          ...a,
          gradedCount: newGradedCount,
          submissions: existingSubs,
          ...(isStudentSub
            ? {
                learnerStatus: 'graded' as const,
                learnerScore: score,
                learnerFeedback: feedback,
              }
            : {}),
        };
      }
      return a;
    });

    setAssignments(nextAssignments);

    // Persist published grade to PostgreSQL backend database asynchronously
    gradeAssignmentSubmissionApi(assignmentId, submissionId, {
      score,
      letterGrade,
      feedback,
    })
      .then(() => {
        loadBackendAssignments();
      })
      .catch((err) => {
        console.warn('Failed to publish grade to PostgreSQL API:', err);
      });

    const updatedCurrent = nextAssignments.find((a) => a.id === assignmentId);
    if (updatedCurrent) {
      setGradingAssignment(updatedCurrent);
    }
    showNotice(`Grade published successfully for deliverable!`);
  };

  // Form states for Assignment
  const [asgTitle, setAsgTitle] = useState('');
  const [asgDesc, setAsgDesc] = useState('');
  const [asgCourseId, setAsgCourseId] = useState(assignedCourses[0]?.id || '');
  const [asgCohortId, setAsgCohortId] = useState('');
  const [asgDueDate, setAsgDueDate] = useState(() => new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]);
  const [asgMarks, setAsgMarks] = useState(100);
  const [asgFormat, setAsgFormat] = useState<'file' | 'repo' | 'text'>('repo');

  const handleAssessmentSaved = async (newAss: Assessment, status: 'published' | 'draft'): Promise<{ success: boolean; error?: string }> => {
    if (status === 'published') {
      const res = await addAssessment(newAss, newAss.questionsData);
      if (res.success) {
        setAssessmentStatusFilter('published');
        setPublishedPopupAssessment({ ...newAss, id: res.id });
        await fetchAssessments();
        setIsCreateModalOpen(false);
        setEditingDraft(null);
        return { success: true };
      }
      return { success: false, error: res.error };
    } else {
      const res = await saveDraft(newAss, newAss.questionsData);
      if (res.success) {
        showNotice(`Draft "${newAss.title}" saved successfully to database!`);
        setAssessmentStatusFilter('drafts');
        await fetchAssessments();
        setIsCreateModalOpen(false);
        setEditingDraft(null);
        return { success: true };
      }
      return { success: false, error: res.error };
    }
  };

  const handleCreateAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    const newAsg: CourseAssignment = {
      id: `asg-${Date.now()}`,
      title: asgTitle,
      description: asgDesc,
      courseId: asgCourseId,
      cohortId: asgCohortId,
      dueDate: asgDueDate,
      totalMarks: asgMarks,
      submissionFormat: asgFormat,
      submissionsCount: 0,
      gradedCount: 0,
      status: 'active'
    };
    setAssignments([newAsg, ...assignments]);
    createAssignmentApi({
      courseId: asgCourseId,
      cohortId: asgCohortId || undefined,
      title: asgTitle.trim(),
      description: asgDesc.trim(),
      dueDate: asgDueDate,
      totalMarks: asgMarks,
      submissionFormat: asgFormat,
    })
      .then(() => loadBackendAssignments())
      .catch((err) => {
        console.warn('Failed to persist created assignment to PostgreSQL API:', err);
      });

    setIsAssignmentModalOpen(false);
    showNotice(`Assignment "${asgTitle}" created and broadcast to cohort students!`);
    setAsgTitle('');
    setAsgDesc('');
  };

  const filteredAssessments = assessments.filter((a) => {
    const matchesCourse = selectedCourseFilter === 'all' || a.courseId === selectedCourseFilter || a.courseId === 'all';
    const matchesFaculty = !isFaculty || a.courseId === 'all' || assignedCourses.some((c) => c.id === a.courseId);
    return matchesCourse && matchesFaculty;
  });

  const filteredDrafts = drafts.filter((d) => {
    const matchesCourse = selectedCourseFilter === 'all' || d.courseId === selectedCourseFilter || d.courseId === 'all';
    const matchesFaculty = !isFaculty || d.courseId === 'all' || assignedCourses.some((c) => c.id === d.courseId);
    return matchesCourse && matchesFaculty;
  });

  const filteredAssignments = assignments.filter((asg) => {
    const matchesCourse = selectedCourseFilter === 'all' || asg.courseId === selectedCourseFilter || asg.courseId === 'all';
    const matchesFaculty = !isFaculty || asg.courseId === 'all' || assignedCourses.some((c) => c.id === asg.courseId);
    const matchesLearnerStatus = !isLearner || assignmentFilter === 'all' || asg.learnerStatus === assignmentFilter;
    return matchesCourse && matchesFaculty && matchesLearnerStatus;
  });

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="badge badge-primary">
              {isFaculty ? 'Faculty Teaching Scope' : isLearner ? 'Student Academic Portal' : 'Academic Evaluations'}
            </span>
            {isFaculty && <span className="badge badge-draft">{user?.displayName || 'Faculty Member'}</span>}
            {isLearner && <span className="badge badge-active">{user?.displayName || 'Enrolled Student'}</span>}
          </div>
          <h1 style={{ fontSize: '1.75rem', margin: 0 }}>
            {activeTab === 'assignments'
              ? isLearner ? 'My Course Assignments & Capstone Projects' : 'Course Assignments & Deliverables'
              : activeTab === 'results'
                ? 'My Academic Results & Grades'
                : isLearner ? 'Quizzes & Scheduled Examinations' : 'Assessments & Timed Examinations'}
          </h1>
          <p className="text-secondary text-sm">
            {isFaculty
              ? 'Create course assignments, schedule proctored quizzes, and view learner assessment submissions'
              : isLearner
                ? activeTab === 'assignments'
                  ? 'Review project requirements, submit GitHub repositories or project files, and view instructor feedback.'
                  : activeTab === 'results'
                    ? 'Verified transcript of completed quizzes, midterms, capstone evaluations, and faculty remarks.'
                    : 'Take timed course evaluations and proctored quizzes. Ensure your system meets proctoring criteria.'
                : 'Configured quizzes, high-stakes proctored exams, rubrics, and release policies'}
          </p>
        </div>

        {!isLearner ? (
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {activeTab === 'assignments' ? (
              <button className="btn btn-primary" onClick={() => setIsAssignmentModalOpen(true)}>
                <Plus size={16} /> Create Assignment
              </button>
            ) : (
              <button
                className="btn btn-primary"
                onClick={() => {
                  setEditingDraft(null);
                  setIsCreateModalOpen(true);
                }}
              >
                <Plus size={16} /> Create Quiz / Exam
              </button>
            )}
            <Link to="/grading" className="btn btn-secondary">
              <PenTool size={16} /> Grading Queue
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                fetchAssessments();
                fetchMyAttempts();
                showNotice('Assessments refreshed from server.');
              }}
              style={{ gap: '6px' }}
            >
              <RefreshCw size={14} /> Refresh List
            </button>
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

      {/* Filter Toolbar */}
      {activeTab !== 'results' && (
        <div className="card" style={{ padding: '14px 18px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Filter size={15} color="var(--primary)" />
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Filter by Course:</span>
              </div>

              <select
                className="form-select"
                value={selectedCourseFilter}
                onChange={(e) => setSelectedCourseFilter(e.target.value)}
                style={{ width: 'auto', minWidth: '220px' }}
              >
                <option value="all">
                  {isLearner ? `All Enrolled Courses (${assignedCourses.length})` : `All Assigned Courses (${assignedCourses.length})`}
                </option>
                {assignedCourses.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>

            {isLearner && activeTab === 'assignments' && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  className={`btn btn-sm ${assignmentFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setAssignmentFilter('all')}
                >
                  All ({assignments.length})
                </button>
                <button
                  className={`btn btn-sm ${assignmentFilter === 'pending' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setAssignmentFilter('pending')}
                >
                  Pending ({assignments.filter((a) => a.learnerStatus === 'pending').length})
                </button>
                <button
                  className={`btn btn-sm ${assignmentFilter === 'submitted' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setAssignmentFilter('submitted')}
                >
                  Submitted ({assignments.filter((a) => a.learnerStatus === 'submitted').length})
                </button>
                <button
                  className={`btn btn-sm ${assignmentFilter === 'graded' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setAssignmentFilter('graded')}
                >
                  Graded ({assignments.filter((a) => a.learnerStatus === 'graded').length})
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 1: ASSIGNMENTS */}
      {activeTab === 'assignments' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredAssignments.length === 0 ? (
            <div className="card" style={{ padding: '48px 24px', textAlign: 'center', background: 'var(--bg-surface)' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <ClipboardCheck size={28} />
              </div>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>No Deliverable Assignments Found</h3>
              <p className="text-secondary text-sm" style={{ maxWidth: '480px', margin: '0 auto 20px', lineHeight: 1.5 }}>
                {selectedCourseFilter !== 'all'
                  ? `There are no standalone assignments matching the selected filter. Interactive lessons, video lectures, and module checkpoints are ready inside your Course Player!`
                  : `You have completed all active assignments or no submissions have been assigned to your cohort yet.`}
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link to="/courses" className="btn btn-primary btn-sm" style={{ gap: '6px' }}>
                  <Play size={14} /> Resume Course Lessons
                </Link>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => navigate('/my-assessments')}
                  style={{ gap: '6px' }}
                >
                  <FileText size={14} /> View Quizzes & Exams
                </button>
              </div>
            </div>
          ) : (
            <div className="grid-3">
              {filteredAssignments.map((asg) => {
                const course = useCourseStore.getState().courses.find((c) => c.id === asg.courseId);
                const cohort = useCohortStore.getState().cohorts.find((c) => c.id === asg.cohortId);

                return (
                <div key={asg.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span className="badge badge-primary">{asg.submissionFormat.toUpperCase()} SUBMISSION</span>
                      {isLearner ? (
                        asg.learnerStatus === 'graded' ? (
                          <span className="badge badge-success">
                            GRADED &bull; {asg.learnerScore}/{asg.totalMarks} PTS
                          </span>
                        ) : asg.learnerStatus === 'submitted' ? (
                          <span className="badge badge-info">SUBMITTED &bull; UNDER REVIEW</span>
                        ) : (
                          <span className="badge badge-warning">PENDING SUBMISSION</span>
                        )
                      ) : (
                        <span className="badge badge-active">{asg.status.toUpperCase()}</span>
                      )}
                    </div>

                    <h3 style={{ fontSize: '1.05rem', marginBottom: '6px', lineHeight: 1.4 }}>
                      {asg.title}
                    </h3>
                    <p className="text-secondary text-sm" style={{ marginBottom: '16px', lineHeight: 1.5 }}>
                      {asg.description}
                    </p>

                    <div style={{
                      background: 'var(--bg-input)',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      fontSize: '0.8rem',
                      marginBottom: '16px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span className="text-muted">Target Course:</span>
                        <span style={{ fontWeight: 600 }}>{course?.title || 'Course Deliverable'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span className="text-muted">Assigned Batch:</span>
                        <span style={{ fontWeight: 600 }}>{cohort?.name || 'Spring 2026'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span className="text-muted">Due Date:</span>
                        <span style={{ fontWeight: 700, color: 'var(--warning)' }}>{asg.dueDate}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span className="text-muted">Total Marks:</span>
                        <span style={{ fontWeight: 700, color: 'var(--success)' }}>{asg.totalMarks} Points</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
                    {isLearner ? (
                      asg.learnerStatus === 'pending' ? (
                        <button
                          className="btn btn-primary btn-sm"
                          style={{ width: '100%', justifyContent: 'center', gap: '6px' }}
                          onClick={() => setSubmittingAssignment(asg)}
                        >
                          <Upload size={13} /> Submit Deliverable
                        </button>
                      ) : (
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ width: '100%', justifyContent: 'center', gap: '6px' }}
                          onClick={() => setViewingAssignment(asg)}
                        >
                          <Eye size={13} /> View Submission & Feedback
                        </button>
                      )
                    ) : (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '10px' }}>
                          <span>Submissions: <strong>{asg.submissionsCount} Students</strong></span>
                          <span className="text-muted">Graded: {asg.gradedCount}/{asg.submissionsCount}</span>
                        </div>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          style={{ width: '100%', justifyContent: 'center', gap: '6px' }}
                          onClick={() => setGradingAssignment(asg)}
                        >
                          <PenTool size={13} /> Grade Submissions ({Math.max(0, asg.submissionsCount - asg.gradedCount)} Pending)
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          )}
        </div>
      )}

      {/* TAB 2: QUIZZES & EXAMS */}
      {activeTab === 'assessments' && (
        <div>
          {/* Sub-status Switcher for Faculty & Admin (Published vs Drafts) */}
          {!isLearner && (
            <div style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
              <button
                type="button"
                className={`btn btn-sm ${assessmentStatusFilter === 'published' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setAssessmentStatusFilter('published')}
              >
                <CheckCircle2 size={14} /> Published Assessments ({filteredAssessments.length})
              </button>
              <button
                type="button"
                className={`btn btn-sm ${assessmentStatusFilter === 'drafts' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setAssessmentStatusFilter('drafts')}
              >
                <FileText size={14} /> In-Progress Drafts ({filteredDrafts.length})
              </button>
            </div>
          )}

          {/* DRAFTS LIST */}
          {!isLearner && assessmentStatusFilter === 'drafts' ? (
            filteredDrafts.length === 0 ? (
              <div
                className="card"
                style={{
                  textAlign: 'center',
                  padding: '48px 24px',
                  background: 'var(--bg-card)'
                }}
              >
                <FileText size={44} color="var(--text-muted)" style={{ margin: '0 auto 12px auto' }} />
                <h3 style={{ fontSize: '1.1rem', margin: '0 0 6px 0' }}>No In-Progress Assessment Drafts</h3>
                <p className="text-muted text-sm" style={{ maxWidth: '420px', margin: '0 auto 16px auto' }}>
                  When you save an incomplete quiz or AI question generation session, it will persist here securely until you are ready to publish.
                </p>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setEditingDraft(null);
                    setIsCreateModalOpen(true);
                  }}
                >
                  <Plus size={16} /> Create New Quiz / Exam
                </button>
              </div>
            ) : (
              <div className="grid-3">
                {filteredDrafts.map((d) => {
                  const course = d.courseId === 'all'
                    ? { title: '🌐 All Courses (All Students)' }
                    : (useCourseStore.getState().courses.find((c) => c.id === d.courseId || c.title?.toLowerCase() === d.courseId?.toLowerCase()) || (d as any).course || (d.courseId ? { title: d.courseId } : undefined));
                  const qCount = d.questionsData?.length || d.questionIds?.length || (Array.isArray(d.questions) ? d.questions.length : 0);

                  return (
                    <div
                      key={d.id}
                      className="card"
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        borderTop: '3px solid var(--warning)'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <span className="badge badge-warning">DRAFT &bull; UNPUBLISHED</span>
                          <span className="text-muted text-xs">
                            {d.updatedAt ? new Date(d.updatedAt).toLocaleDateString() : 'Recent'}
                          </span>
                        </div>

                        <h3 style={{ fontSize: '1.15rem', marginBottom: '6px' }}>{d.title}</h3>
                        <p className="text-muted text-xs" style={{ marginBottom: '16px' }}>
                          Course: <strong>{course?.title || 'General Curriculum'}</strong>
                        </p>

                        <div
                          style={{
                            background: 'var(--bg-input)',
                            borderRadius: 'var(--radius-md)',
                            padding: '12px',
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, 1fr)',
                            gap: '12px',
                            marginBottom: '20px',
                            fontSize: '0.85rem'
                          }}
                        >
                          <div>
                            <span className="text-muted text-xs">Questions:</span>
                            <div style={{ fontWeight: 600 }}>{qCount} Items</div>
                          </div>
                          <div>
                            <span className="text-muted text-xs">Total Marks:</span>
                            <div style={{ fontWeight: 600 }}>{d.totalMarks} Points</div>
                          </div>
                          <div>
                            <span className="text-muted text-xs">Duration:</span>
                            <div style={{ fontWeight: 600 }}>{d.durationMinutes || d.duration || 45}m</div>
                          </div>
                          <div>
                            <span className="text-muted text-xs">Mode:</span>
                            <div style={{ fontWeight: 600, textTransform: 'capitalize' }}>
                              {d.creationMode === 'ai_generated' ? 'AI Generated' : 'Manual'}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          style={{ flex: 1, gap: '6px', justifyContent: 'center' }}
                          onClick={() => {
                            setEditingDraft(d);
                            setIsCreateModalOpen(true);
                          }}
                        >
                          <Edit3 size={13} /> Resume Editing
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ gap: '6px', justifyContent: 'center' }}
                          onClick={() => {
                            publishAssessment(d.id);
                            setAssessmentStatusFilter('published');
                            setPublishedPopupAssessment({ ...d, status: 'published' });
                          }}
                        >
                          <CheckCircle2 size={13} color="var(--success)" /> Publish
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setDeleteModalConfig({
                              isOpen: true,
                              title: 'Delete Assessment Draft',
                              message: `Are you sure you want to permanently remove the draft "${d.title}"? This action cannot be undone.`,
                              onConfirm: () => {
                                deleteDraft(d.id);
                                showNotice('Draft removed.');
                              },
                            });
                          }}
                          title="Delete draft"
                        >
                          <Trash2 size={13} color="var(--danger)" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            /* PUBLISHED ASSESSMENTS GRID */
            <div className="grid-3">
              {filteredAssessments.map((a) => {
                const course = a.courseId === 'all'
                  ? { title: '🌐 All Courses (All Students)' }
                  : (assignedCourses.find((c) => c.id === a.courseId || c.title?.toLowerCase() === a.courseId?.toLowerCase()) || (a as any).course || (a.courseId ? { title: a.courseId } : undefined));
                const learnerAttempt = myAttempts.find((at) => at.assessmentId === a.id || at.assessment?.id === a.id);
                const isCompletedByLearner = !!learnerAttempt;
                const qCount = a.questionsData?.length || a.questionIds?.length || (Array.isArray(a.questions) ? a.questions.length : 0);

                return (
                  <div
                    key={a.id}
                    className="card"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      borderTop: a.proctoringRequired ? '3px solid var(--danger)' : '3px solid var(--primary)'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {(a.proctoringRequired || (a.proctoringMode && a.proctoringMode !== 'none')) && (
                            <span className="badge badge-error" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Shield size={12} />
                              {a.proctoringMode === 'combined'
                                ? 'AI + Google Meet Proctor'
                                : a.proctoringMode === 'manual'
                                ? 'Manual Google Meet Proctor'
                                : a.proctoringMode === 'automated'
                                ? 'AI Telemetry Proctor'
                                : 'Proctored'}
                            </span>
                          )}
                          {a.aiGradingEnabled && (
                            <span className="badge badge-primary" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Sparkles size={12} /> AI Assisted
                            </span>
                          )}
                          {a.creationMode === 'ai_generated' && (
                            <span className="badge badge-draft" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Sparkles size={12} color="var(--primary)" /> AI Generated
                            </span>
                          )}
                        </div>

                        {isLearner && isCompletedByLearner ? (
                          <span className={`badge ${learnerAttempt?.passed ? 'badge-success' : 'badge-warning'}`}>{learnerAttempt?.passed ? 'PASSED' : 'COMPLETED'} &bull; {learnerAttempt?.score ?? 0}/{a.totalMarks} PTS</span>
                        ) : (
                          <span className="badge badge-active">{a.status}</span>
                        )}
                      </div>

                      <h3 style={{ fontSize: '1.15rem', marginBottom: '6px' }}>{a.title}</h3>
                      <p className="text-muted text-xs" style={{ marginBottom: '16px' }}>
                        Course: <strong>{course?.title || 'General Curriculum'}</strong>
                      </p>

                      <div style={{
                        background: 'var(--bg-input)',
                        borderRadius: 'var(--radius-md)',
                        padding: '12px',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: '12px',
                        marginBottom: '20px',
                        fontSize: '0.85rem'
                      }}>
                        <div>
                          <span className="text-muted text-xs">Questions:</span>
                          <div style={{ fontWeight: 600 }}>{qCount} Items</div>
                        </div>
                        <div>
                          <span className="text-muted text-xs">Duration:</span>
                          <div style={{ fontWeight: 600 }}>{a.durationMinutes || a.duration || 45} Minutes</div>
                        </div>
                        <div>
                          <span className="text-muted text-xs">Total Marks:</span>
                          <div style={{ fontWeight: 600 }}>{a.totalMarks} Points</div>
                        </div>
                        <div>
                          <span className="text-muted text-xs">Passing Score:</span>
                          <div style={{ fontWeight: 600, color: 'var(--success)' }}>
                            {a.passingMarks || a.passmark || 70} pts
                          </div>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {isLearner ? (
                        isCompletedByLearner ? (
                          <div style={{ display: 'flex', gap: '6px', width: '100%' }}>
                            <button
                              className="btn btn-secondary btn-sm"
                              style={{ flex: 1, gap: '6px', justifyContent: 'center' }}
                              onClick={() => setActiveTab('results')}
                            >
                              <Award size={13} /> View Result ({learnerAttempt?.percentage ?? 0}%)
                            </button>
                            {a.proctoringRequired && (
                              <Link
                                to="/my-proctoring-reports"
                                className="btn btn-secondary btn-sm"
                                style={{ flex: 1, gap: '6px', justifyContent: 'center' }}
                              >
                                <Shield size={13} color="#3B82F6" /> Proctoring Report
                              </Link>
                            )}
                          </div>
                        ) : (
                          <Link
                            to={`/exam/${a.id}`}
                            className="btn btn-primary btn-sm"
                            style={{ flex: 1, gap: '6px', justifyContent: 'center' }}
                          >
                            <Play size={13} /> Start Assessment
                          </Link>
                        )
                      ) : (
                        <>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ flex: 1, gap: '6px', justifyContent: 'center' }}
                            onClick={() => setPreviewAssessment(a)}
                            title="Inspect Question Paper, Answers & Rubrics"
                          >
                            <Eye size={13} /> Check Exam Paper
                          </button>
                          {(a.proctoringMode === 'manual' || a.proctoringMode === 'combined') && (
                            <Link
                              to={`/proctoring?tab=live_monitor&assessmentId=${a.id}`}
                              className="btn btn-secondary btn-sm"
                              style={{ gap: '6px', justifyContent: 'center' }}
                              title="Monitor Live Google Meet / Jitsi Exam Session"
                            >
                              <Video size={13} color="var(--primary)" /> Monitor Live
                            </Link>
                          )}
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ gap: '6px', justifyContent: 'center' }}
                            onClick={() => {
                              const examUrl = `${window.location.origin}/exam/${a.id}`;
                              navigator.clipboard.writeText(examUrl);
                              showNotice(`Direct exam link for "${a.title}" copied to clipboard!`);
                            }}
                            title="Copy Direct Exam Link to Share with Students on any Device"
                          >
                            <Copy size={13} color="var(--primary)" /> Copy Link
                          </button>
                          <Link
                            to="/grading"
                            className="btn btn-primary btn-sm"
                            style={{ flex: 1, gap: '6px', justifyContent: 'center' }}
                          >
                            <PenTool size={13} /> View Grades
                          </Link>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                              setDeleteModalConfig({
                                isOpen: true,
                                title: 'Delete Assessment',
                                message: `Are you sure you want to permanently delete "${a.title}"? All associated questions, rubrics, and learner examination records will be removed. This action cannot be undone.`,
                                onConfirm: () => {
                                  deleteAssessment(a.id);
                                  showNotice(`Assessment "${a.title}" deleted.`);
                                },
                              });
                            }}
                            title="Delete assessment"
                          >
                            <Trash2 size={13} color="var(--danger)" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: STUDENT RESULTS */}
      {isLearner && activeTab === 'results' && (() => {
        const submittedAssignments = assignments.filter((a) => a.learnerStatus === 'submitted' || a.learnerStatus === 'graded');
        const gradedAssignments = assignments.filter((a) => a.learnerStatus === 'graded');
        const avgPercentage = myAttempts.length > 0
          ? Math.round(myAttempts.reduce((acc, a) => acc + (Number(a.percentage) || 0), 0) / myAttempts.length)
          : gradedAssignments.length > 0
            ? Math.round(gradedAssignments.reduce((acc, a) => acc + (((a.learnerScore || 0) / a.totalMarks) * 100), 0) / gradedAssignments.length)
            : 0;
        const passedAttemptsCount = myAttempts.filter((a) => a.passed).length;
        const totalEvaluationsCount = myAttempts.length + submittedAssignments.length;

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Results KPI Summary */}
            <div className="grid-4">
              <div className="stat-card">
                <span className="text-muted text-xs font-semibold">Cumulative Average</span>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: avgPercentage > 0 ? 'var(--success)' : 'var(--text-main)' }}>
                  {avgPercentage > 0 ? `${avgPercentage}%` : '0%'}
                </div>
                <p className="text-muted text-xs">
                  {avgPercentage > 0 ? 'Official evaluated grade transcript' : 'No evaluations graded yet'}
                </p>
              </div>
              <div className="stat-card">
                <span className="text-muted text-xs font-semibold">Quizzes / Exams Passed</span>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)' }}>
                  {passedAttemptsCount} / {myAttempts.length}
                </div>
                <p className="text-muted text-xs">
                  {myAttempts.length > 0 ? `${Math.round((passedAttemptsCount / myAttempts.length) * 100)}% assessment clearance` : '0 evaluations cleared'}
                </p>
              </div>
              <div className="stat-card">
                <span className="text-muted text-xs font-semibold">Assignments Graded</span>
                <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>
                  {gradedAssignments.length} / {submittedAssignments.length}
                </div>
                <p className="text-muted text-xs">
                  {submittedAssignments.length - gradedAssignments.length} pending instructor review
                </p>
              </div>
              <div className="stat-card">
                <span className="text-muted text-xs font-semibold">Earned Certificates</span>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--accent-purple)' }}>
                  {myAttempts.filter((a) => a.passed && a.assessment?.scope === 'final_assessment').length} Active
                </div>
                <p className="text-muted text-xs">Verified digital credentials</p>
              </div>
            </div>

            {/* Academic Evaluations Table */}
            <div className="card">
              <h3 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>Published Examination & Assignment Transcript</h3>
              {totalEvaluationsCount === 0 ? (
                <div style={{ padding: '48px 24px', textAlign: 'center' }}>
                  <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <Award size={26} />
                  </div>
                  <h4 style={{ fontSize: '1.15rem', marginBottom: '8px' }}>No Evaluation Results Recorded Yet</h4>
                  <p className="text-secondary text-sm" style={{ maxWidth: '460px', margin: '0 auto 20px', lineHeight: 1.5 }}>
                    You have not submitted any course quizzes or project deliverables yet. Complete curriculum checkpoints and assessments to generate your verified academic grade transcript.
                  </p>
                  {assessments.filter((a) => a.status === 'published').length > 0 && (() => {
                    const pub = assessments.find((a) => a.status === 'published')!;
                    return (
                      <div
                        style={{
                          maxWidth: '540px',
                          margin: '0 auto 24px',
                          background: 'rgba(99, 102, 241, 0.08)',
                          border: '1px solid rgba(99, 102, 241, 0.25)',
                          borderRadius: '12px',
                          padding: '14px 18px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px',
                          textAlign: 'left',
                          flexWrap: 'wrap',
                        }}
                      >
                        <div>
                          <span className="badge badge-primary" style={{ fontSize: '0.65rem', marginBottom: '4px', textTransform: 'uppercase' }}>
                            Assessment Waiting
                          </span>
                          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                            {pub.title}
                          </div>
                          <div className="text-muted text-xs">
                            Duration: {pub.durationMinutes}m &bull; Total Marks: {pub.totalMarks}
                          </div>
                        </div>
                        <Link to={`/exam/${pub.id}`} className="btn btn-primary btn-sm" style={{ gap: '6px' }}>
                          <Play size={13} /> Start Assessment
                        </Link>
                      </div>
                    );
                  })()}
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                    <Link to="/courses" className="btn btn-primary btn-sm" style={{ gap: '6px' }}>
                      <Play size={14} /> Resume Course Lessons
                    </Link>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setActiveTab('assessments')}
                      style={{ gap: '6px' }}
                    >
                      <FileText size={14} /> View Quizzes & Exams
                    </button>
                  </div>
                </div>
              ) : (
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Evaluation Title</th>
                        <th>Course</th>
                        <th>Type</th>
                        <th>Date Evaluated</th>
                        <th>Score / Total</th>
                        <th>Percentage</th>
                        <th>Outcome</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {myAttempts.map((at) => {
                        const course = assignedCourses.find((c) => c.id === at.assessment?.courseId) || assignedCourses[0];
                        return (
                          <tr key={at.id}>
                            <td style={{ fontWeight: 600 }}>{at.assessment?.title || 'Course Assessment'}</td>
                            <td>{course?.title || 'Curriculum Course'}</td>
                            <td>
                              <span className="badge badge-primary">
                                {at.assessment?.scope === 'final_assessment' ? 'Final Exam' : 'Knowledge Check'}
                              </span>
                            </td>
                            <td className="text-muted text-xs">
                              {at.submittedAt ? new Date(at.submittedAt).toLocaleDateString() : 'Recent'}
                            </td>
                            <td>
                              <strong>{at.score ?? 0} / {at.assessment?.totalMarks || 100}</strong>
                            </td>
                            <td style={{ color: at.passed ? 'var(--success)' : 'var(--danger)', fontWeight: 700 }}>
                              {at.percentage ?? 0}%
                            </td>
                            <td>
                              <span className={`badge ${at.passed ? 'badge-success' : 'badge-danger'}`}>
                                {at.passed ? 'PASSED' : 'RETAKE REQUIRED'}
                              </span>
                            </td>
                            <td>
                              <button
                                className="btn btn-secondary btn-xs"
                                onClick={() => showNotice(`Assessment "${at.assessment?.title}": Score ${at.score}/${at.assessment?.totalMarks || 100} (${at.percentage}%)`)}
                              >
                                <Eye size={12} /> View Breakdown
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {submittedAssignments.map((asg) => {
                        const course = assignedCourses.find((c) => c.id === asg.courseId) || assignedCourses[0];
                        return (
                          <tr key={asg.id}>
                            <td style={{ fontWeight: 600 }}>{asg.title}</td>
                            <td>{course?.title || 'Curriculum Course'}</td>
                            <td>
                              <span className="badge badge-info">Project Deliverable</span>
                            </td>
                            <td className="text-muted text-xs">
                              {asg.learnerSubmittedAt || 'Recent'}
                            </td>
                            <td>
                              <strong>{asg.learnerStatus === 'graded' ? `${asg.learnerScore || 0} / ${asg.totalMarks}` : `Pending / ${asg.totalMarks}`}</strong>
                            </td>
                            <td style={{ color: asg.learnerStatus === 'graded' ? 'var(--success)' : 'var(--warning)', fontWeight: 700 }}>
                              {asg.learnerStatus === 'graded' ? `${Math.round(((asg.learnerScore || 0) / asg.totalMarks) * 100)}%` : 'Under Review'}
                            </td>
                            <td>
                              <span className={`badge ${asg.learnerStatus === 'graded' ? 'badge-success' : 'badge-warning'}`}>
                                {asg.learnerStatus === 'graded' ? 'GRADED' : 'SUBMITTED'}
                              </span>
                            </td>
                            <td>
                              <button
                                className="btn btn-secondary btn-xs"
                                onClick={() => setViewingAssignment(asg)}
                              >
                                <Eye size={12} /> View Feedback
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
      })()}

      {/* Create Assessment Modal (Quiz & Exam Builder: AI or Manual) */}
      <CreateAssessmentModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingDraft(null);
        }}
        onAssessmentSaved={handleAssessmentSaved}
        initialDraft={editingDraft}
        defaultCourseId={assignedCourses[0]?.id}
      />

      {/* Create Assignment Modal */}
      {isAssignmentModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAssignmentModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '620px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ClipboardCheck size={20} color="var(--primary)" />
                <h3 style={{ fontSize: '1.15rem', margin: 0 }}>Create Course Assignment / Project</h3>
              </div>
              <button onClick={() => setIsAssignmentModalOpen(false)} style={{ color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateAssignment}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Assignment Title <span className="required">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Distributed Event-Driven Architecture Project"
                    className="form-input"
                    value={asgTitle}
                    onChange={(e) => setAsgTitle(e.target.value)}
                  />
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Course</label>
                    <select
                      className="form-select"
                      value={asgCourseId}
                      onChange={(e) => setAsgCourseId(e.target.value)}
                    >
                      {assignedCourses.map((c) => (
                        <option key={c.id} value={c.id}>{c.title}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Target Cohort / Batch</label>
                    <select
                      className="form-select"
                      value={asgCohortId}
                      onChange={(e) => setAsgCohortId(e.target.value)}
                    >
                      <option value="coh-001">Q4 2026 Engineering Onboarding</option>
                      <option value="coh-002">Advanced React Bootcamp</option>
                      <option value="coh-004">Leadership Development 2026</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Problem Statement & Rubric Guidelines <span className="required">*</span></label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Describe deliverables, architecture constraints, evaluation criteria, and edge cases to handle..."
                    className="form-textarea"
                    value={asgDesc}
                    onChange={(e) => setAsgDesc(e.target.value)}
                  />
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Submission Due Date</label>
                    <input
                      type="date"
                      required
                      className="form-input"
                      value={asgDueDate}
                      onChange={(e) => setAsgDueDate(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Total Points / Marks</label>
                    <input
                      type="number"
                      min="10"
                      max="1000"
                      className="form-input"
                      value={asgMarks}
                      onChange={(e) => setAsgMarks(parseInt(e.target.value) || 100)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Submission Format</label>
                  <select
                    className="form-select"
                    value={asgFormat}
                    onChange={(e) => setAsgFormat(e.target.value as any)}
                  >
                    <option value="repo">GitHub / GitLab Repository URL</option>
                    <option value="file">File Upload (.zip, .pdf, .docx)</option>
                    <option value="text">Rich Text / Essay Response</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsAssignmentModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Broadcast Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student: Submit Deliverable Modal */}
      {submittingAssignment && (
        <div className="modal-overlay" onClick={() => setSubmittingAssignment(null)}>
          <div className="modal-card" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Upload size={20} color="var(--primary)" />
                <h3 style={{ fontSize: '1.15rem', margin: 0 }}>Submit Assignment Deliverable</h3>
              </div>
              <button onClick={() => setSubmittingAssignment(null)} style={{ color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitDeliverable}>
              <div className="modal-body">
                <div style={{
                  background: 'var(--bg-input)',
                  padding: '14px',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '16px'
                }}>
                  <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '4px' }}>
                    {submittingAssignment.title}
                  </div>
                  <div className="text-muted text-xs" style={{ marginBottom: '8px' }}>
                    Due: <strong>{submittingAssignment.dueDate}</strong> &bull; Total Points: <strong>{submittingAssignment.totalMarks}</strong>
                  </div>
                  <p className="text-secondary text-xs" style={{ margin: 0, lineHeight: 1.5 }}>
                    {submittingAssignment.description}
                  </p>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    {submittingAssignment.submissionFormat === 'repo'
                      ? 'Git Repository URL (GitHub, GitLab, Bitbucket)'
                      : submittingAssignment.submissionFormat === 'file'
                        ? 'Attachment File (Archive or Document)'
                        : 'Response Content'}
                    <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={
                      submittingAssignment.submissionFormat === 'repo'
                        ? 'https://github.com/username/project-repository'
                        : 'project-submission.zip (or cloud document URL)'
                    }
                    className="form-input"
                    value={submissionDeliverable}
                    onChange={(e) => setSubmissionDeliverable(e.target.value)}
                  />
                  <span className="text-muted text-xs" style={{ marginTop: '4px', display: 'block' }}>
                    Ensure repository is public or access granted to course faculty.
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label">Notes for Grader / Faculty (Optional)</label>
                  <textarea
                    rows={3}
                    placeholder="Mention test accounts, environment variables, known limitations, or architecture highlights..."
                    className="form-textarea"
                    value={submissionNotes}
                    onChange={(e) => setSubmissionNotes(e.target.value)}
                  />
                </div>

                <div style={{
                  background: 'rgba(59, 130, 246, 0.08)',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 14px',
                  marginTop: '12px'
                }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', fontSize: '0.85rem' }}>
                    <input
                      type="checkbox"
                      required
                      checked={honorCodeAgreed}
                      onChange={(e) => setHonorCodeAgreed(e.target.checked)}
                      style={{ marginTop: '3px' }}
                    />
                    <span>
                      <strong>Academic Honor Pledge:</strong> I confirm that this submission is my own original work and adheres to the institution&apos;s academic integrity standards.
                    </span>
                  </label>
                </div>


              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setSubmittingAssignment(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={!honorCodeAgreed || !submissionDeliverable.trim()}>
                  <Check size={16} /> Submit for Grading
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student: View Submission & Feedback Modal */}
      {viewingAssignment && (
        <div className="modal-overlay" onClick={() => setViewingAssignment(null)}>
          <div className="modal-card" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Award size={20} color="var(--primary)" />
                <h3 style={{ fontSize: '1.15rem', margin: 0 }}>Submission Evaluation & Feedback</h3>
              </div>
              <button onClick={() => setViewingAssignment(null)} style={{ color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <h4 style={{ fontSize: '1.1rem', margin: 0 }}>{viewingAssignment.title}</h4>
                  {viewingAssignment.learnerStatus === 'graded' ? (
                    <span className="badge badge-success">
                      SCORE: {viewingAssignment.learnerScore} / {viewingAssignment.totalMarks}
                    </span>
                  ) : (
                    <span className="badge badge-info">UNDER FACULTY REVIEW</span>
                  )}
                </div>
                <p className="text-muted text-xs">
                  Submitted on: <strong>{viewingAssignment.learnerSubmittedAt || 'Recently submitted'}</strong>
                </p>
              </div>

              <div style={{
                background: 'var(--bg-input)',
                padding: '14px',
                borderRadius: 'var(--radius-md)',
                marginBottom: '16px'
              }}>
                <div className="text-muted text-xs font-semibold" style={{ marginBottom: '4px' }}>
                  Submitted Deliverable:
                </div>
                <code style={{ fontSize: '0.85rem', color: 'var(--primary)', wordBreak: 'break-all' }}>
                  {viewingAssignment.learnerSubmissionUrl || 'No deliverable link specified'}
                </code>
              </div>

              {viewingAssignment.learnerStatus === 'graded' ? (
                <div style={{
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid var(--success-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <CheckCircle2 size={18} color="var(--success)" />
                    <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--success)' }}>
                      Faculty Evaluation & Rubric Feedback
                    </span>
                  </div>
                  <p style={{ fontSize: '0.88rem', lineHeight: 1.6, margin: 0 }}>
                    {viewingAssignment.learnerFeedback}
                  </p>
                  <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(16, 185, 129, 0.2)', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                    <span className="text-muted">Graded by: <strong>{viewingAssignment.submissions?.find((s) => s.status === 'graded')?.gradedBy || 'Faculty Lead'}</strong></span>
                    <span style={{ fontWeight: 700, color: 'var(--success)' }}>
                      Letter Grade: {viewingAssignment.submissions?.find((s) => s.status === 'graded')?.letterGrade || (viewingAssignment.learnerScore && viewingAssignment.learnerScore >= 90 ? 'A (Outstanding)' : 'B (Proficient)')} ({viewingAssignment.learnerScore ? Math.round((viewingAssignment.learnerScore / viewingAssignment.totalMarks) * 100) : 92}%)
                    </span>
                  </div>
                </div>
              ) : (
                <div style={{
                  background: 'rgba(59, 130, 246, 0.08)',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <Clock size={18} color="var(--primary)" />
                  <span style={{ fontSize: '0.85rem' }}>
                    {viewingAssignment.learnerFeedback || 'Your submission has been queued for faculty evaluation. Marks and feedback will appear here once published.'}
                  </span>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setViewingAssignment(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Question Paper Inspection Modal for Admin / Trainer */}
      <ExamPaperPreviewModal
        isOpen={Boolean(previewAssessment)}
        onClose={() => setPreviewAssessment(null)}
        assessment={previewAssessment}
        onEditAssessment={(asm) => {
          setEditingDraft(asm);
          setIsCreateModalOpen(true);
        }}
      />

      {/* Assessment / Quiz Published Success Popup Modal */}
      {publishedPopupAssessment && (
        <div
          className="modal-overlay"
          style={{
            zIndex: 9999,
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            background: 'rgba(5, 8, 22, 0.8)',
            backdropFilter: 'blur(8px)',
            animation: 'fadeIn 0.15s ease-out',
          }}
          onClick={() => setPublishedPopupAssessment(null)}
        >
          <div
            className="modal-card"
            style={{
              maxWidth: '540px',
              width: '100%',
              background: 'var(--bg-card)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              borderRadius: '20px',
              overflow: 'hidden',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6), 0 0 35px rgba(16, 185, 129, 0.18)',
              textAlign: 'center',
              padding: '32px 28px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Animated Green Check Badge */}
            <div
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.12)',
                color: '#10B981',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
                border: '2px solid rgba(16, 185, 129, 0.4)',
                boxShadow: '0 0 30px rgba(16, 185, 129, 0.25)',
              }}
            >
              <CheckCircle2 size={42} />
            </div>

            <div>
              <span
                className="badge badge-success"
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '8px',
                  display: 'inline-block',
                }}
              >
                Live &bull; Published to Syllabus
              </span>
            </div>

            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '8px 0 6px 0', color: 'var(--text-main)' }}>
              Assessment Published Successfully!
            </h3>

            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '22px', lineHeight: 1.5 }}>
              <strong style={{ color: 'var(--text-main)' }}>{publishedPopupAssessment.title}</strong> is now live. All enrolled learners can view and start this evaluation according to schedule.
            </p>

            {/* Assessment Key Parameters Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '12px',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '24px',
                textAlign: 'left',
              }}
            >
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>
                  Total Questions
                </span>
                <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>
                  {publishedPopupAssessment.questionsData?.length || publishedPopupAssessment.questionIds?.length || (Array.isArray(publishedPopupAssessment.questions) ? publishedPopupAssessment.questions.length : 0)} Items
                </strong>
              </div>

              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>
                  Total / Pass Marks
                </span>
                <strong style={{ fontSize: '0.95rem', color: 'var(--success)' }}>
                  {publishedPopupAssessment.totalMarks} pts (Pass: {publishedPopupAssessment.passingMarks || publishedPopupAssessment.passmark || 1} pts)
                </strong>
              </div>

              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>
                  Duration
                </span>
                <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>
                  {publishedPopupAssessment.durationMinutes || 45} Minutes
                </strong>
              </div>

              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>
                  Proctoring Mode
                </span>
                <strong style={{ fontSize: '0.95rem', color: 'var(--primary)' }}>
                  {publishedPopupAssessment.proctoringMode === 'automated'
                    ? 'AI Telemetry (Auto)'
                    : publishedPopupAssessment.proctoringMode === 'manual'
                    ? 'Google Meet Live'
                    : publishedPopupAssessment.proctoringMode === 'combined'
                    ? 'AI + Google Meet'
                    : 'Unproctored'}
                </strong>
              </div>
            </div>

            {/* Direct Student Network Link */}
            <div
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-accent)',
                borderRadius: '12px',
                padding: '12px 14px',
                marginBottom: '20px',
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>
                  Student Direct Exam Link (Network / Wi-Fi)
                </span>
                <span className="text-muted text-xs">Share with students on any device</span>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  readOnly
                  value={`${window.location.origin}/exam/${publishedPopupAssessment.id}`}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    fontSize: '0.82rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-input)',
                    color: 'var(--text-main)',
                    fontFamily: 'monospace',
                  }}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  style={{ gap: '6px', whiteSpace: 'nowrap' }}
                  onClick={() => {
                    const examUrl = `${window.location.origin}/exam/${publishedPopupAssessment.id}`;
                    navigator.clipboard.writeText(examUrl);
                    showNotice('Exam link copied! Share this link with students on other devices.');
                  }}
                >
                  <Copy size={13} /> Copy Link
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  const targetAss = publishedPopupAssessment;
                  setPublishedPopupAssessment(null);
                  setPreviewAssessment(targetAss);
                }}
                style={{ gap: '6px' }}
              >
                <Eye size={15} /> Check Exam Paper
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setPublishedPopupAssessment(null)}
                style={{
                  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  border: 'none',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  padding: '10px 24px',
                  boxShadow: '0 4px 16px rgba(16, 185, 129, 0.3)',
                }}
              >
                Close &amp; View Assessments
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Faculty: Assignment Submissions & Grading Modal */}
      {gradingAssignment && (
        <AssignmentGradingModal
          assignment={gradingAssignment}
          onClose={() => setGradingAssignment(null)}
          onSaveGrade={handleSaveAssignmentGrade}
          currentGraderName={user?.displayName || 'Marcus Johnson (Org Admin)'}
        />
      )}

      {/* Styled Confirmation Popup Modal */}
      <ConfirmationModal
        isOpen={deleteModalConfig.isOpen}
        title={deleteModalConfig.title}
        message={deleteModalConfig.message}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isDestructive={true}
        icon="trash"
        onConfirm={deleteModalConfig.onConfirm}
        onCancel={() => setDeleteModalConfig((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
