import React, { useState } from 'react';
import { useAuthStore } from '../../lib/store';
import { mockAssessments, mockCourses, mockCohorts } from '../../data/mockData';
import { Assessment } from '../../types';
import { Link, useNavigate } from 'react-router-dom';
import {
  ClipboardCheck, Plus, Clock, Award, Shield, Eye,
  Play, CheckCircle2, X, AlertTriangle, Sparkles, HelpCircle,
  FileText, Upload, Calendar, PenTool, Check, Filter
} from 'lucide-react';

interface Props {
  defaultTab?: 'assessments' | 'assignments' | 'results';
}

interface CourseAssignment {
  id: string;
  title: string;
  description: string;
  courseId: string;
  cohortId: string;
  dueDate: string;
  totalMarks: number;
  submissionFormat: 'file' | 'repo' | 'text';
  submissionsCount: number;
  gradedCount: number;
  status: 'active' | 'closed' | 'draft';
  // Learner-specific metadata
  learnerStatus?: 'pending' | 'submitted' | 'graded';
  learnerScore?: number;
  learnerFeedback?: string;
  learnerSubmissionUrl?: string;
  learnerSubmittedAt?: string;
}

export const AssessmentsPage: React.FC<Props> = ({ defaultTab = 'assessments' }) => {
  const { user } = useAuthStore();
  const isFaculty = user?.activeRole === 'trainer' || user?.activeRole === 'instructor';
  const isLearner = user?.activeRole === 'student' || user?.activeRole === 'learner';
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'assessments' | 'assignments' | 'results'>(defaultTab);
  const [assessments, setAssessments] = useState<Assessment[]>(mockAssessments);
  const [isAssessmentModalOpen, setIsAssessmentModalOpen] = useState(false);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [selectedCourseFilter, setSelectedCourseFilter] = useState('all');
  const [notice, setNotice] = useState<string | null>(null);

  // Student assignment submission modal state
  const [submittingAssignment, setSubmittingAssignment] = useState<CourseAssignment | null>(null);
  const [viewingAssignment, setViewingAssignment] = useState<CourseAssignment | null>(null);
  const [submissionDeliverable, setSubmissionDeliverable] = useState('');
  const [submissionNotes, setSubmissionNotes] = useState('');
  const [honorCodeAgreed, setHonorCodeAgreed] = useState(false);
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'pending' | 'submitted' | 'graded'>('all');

  const showNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 4000);
  };

  // Faculty & Learner course filter logic
  const assignedCourses = isFaculty
    ? mockCourses.filter((c) => c.instructors?.includes('u-004') || c.createdBy === 'u-004' || c.id === 'crs-001' || c.id === 'crs-002')
    : isLearner
    ? mockCourses.filter((c) => ['crs-001', 'crs-002', 'crs-004'].includes(c.id))
    : mockCourses;

  // Assignments mock data
  const [assignments, setAssignments] = useState<CourseAssignment[]>([
    {
      id: 'asg-1',
      title: 'Distributed System Architecture & Microservices Capstone',
      description: 'Implement a resilient microservices backend with Docker containerization, Kafka event bus, and OpenAPI documentation.',
      courseId: 'crs-001',
      cohortId: 'coh-001',
      dueDate: '2026-10-28',
      totalMarks: 100,
      submissionFormat: 'repo',
      submissionsCount: 24,
      gradedCount: 18,
      status: 'active',
      learnerStatus: 'graded',
      learnerScore: 92,
      learnerFeedback: 'Outstanding decomposition of microservices and clean Docker orchestration. Kafka consumer retry topic logic is well-architected. Minus 8 marks for lack of integration stress-test scripts.',
      learnerSubmissionUrl: 'https://github.com/alex-thompson/distributed-services-capstone',
      learnerSubmittedAt: '2026-10-15'
    },
    {
      id: 'asg-2',
      title: 'Advanced React State Management & Custom Hooks Implementation',
      description: 'Design an offline-capable Kanban task board utilizing Zustand, TanStack Query, and optimistic UI mutations.',
      courseId: 'crs-002',
      cohortId: 'coh-002',
      dueDate: '2026-10-31',
      totalMarks: 100,
      submissionFormat: 'repo',
      submissionsCount: 19,
      gradedCount: 14,
      status: 'active',
      learnerStatus: 'pending'
    },
    {
      id: 'asg-3',
      title: 'TypeScript Type-Level Programming & Generics Challenge',
      description: 'Construct type-safe JSON schema validators and compile-time utility types without runtime overhead.',
      courseId: 'crs-004',
      cohortId: 'coh-001',
      dueDate: '2026-11-05',
      totalMarks: 50,
      submissionFormat: 'file',
      submissionsCount: 12,
      gradedCount: 0,
      status: 'active',
      learnerStatus: 'submitted',
      learnerSubmissionUrl: 'typescript-type-validator-capstone.zip (4.2 MB)',
      learnerSubmittedAt: '2026-10-16',
      learnerFeedback: 'Deliverable received on time. Awaiting evaluation by Dr. James Wilson.'
    }
  ]);

  const handleSubmitDeliverable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!submittingAssignment || !submissionDeliverable.trim()) return;

    setAssignments(assignments.map((a) => {
      if (a.id === submittingAssignment.id) {
        return {
          ...a,
          learnerStatus: 'submitted',
          learnerSubmissionUrl: submissionDeliverable.trim(),
          learnerSubmittedAt: new Date().toISOString().split('T')[0],
          submissionsCount: a.submissionsCount + 1,
          learnerFeedback: 'Deliverable submitted successfully. Awaiting faculty review and scoring.'
        };
      }
      return a;
    }));

    showNotice(`Deliverable for "${submittingAssignment.title}" submitted successfully! (Demonstration state updated — changes will not persist across browser refresh)`);
    setSubmittingAssignment(null);
    setSubmissionDeliverable('');
    setSubmissionNotes('');
    setHonorCodeAgreed(false);
  };

  // Form states for Quiz/Exam
  const [examTitle, setExamTitle] = useState('');
  const [examCourseId, setExamCourseId] = useState(assignedCourses[0]?.id || 'crs-001');
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [examTotalMarks, setExamTotalMarks] = useState(100);
  const [passingMarks, setPassingMarks] = useState(70);
  const [maxAttempts, setMaxAttempts] = useState(2);
  const [proctoringRequired, setProctoringRequired] = useState(true);
  const [aiScoringEnabled, setAiScoringEnabled] = useState(true);

  // Form states for Assignment
  const [asgTitle, setAsgTitle] = useState('');
  const [asgDesc, setAsgDesc] = useState('');
  const [asgCourseId, setAsgCourseId] = useState(assignedCourses[0]?.id || 'crs-001');
  const [asgCohortId, setAsgCohortId] = useState('coh-001');
  const [asgDueDate, setAsgDueDate] = useState('2026-11-10');
  const [asgMarks, setAsgMarks] = useState(100);
  const [asgFormat, setAsgFormat] = useState<'file' | 'repo' | 'text'>('repo');

  const handleCreateAssessment = (e: React.FormEvent) => {
    e.preventDefault();
    const newAss: Assessment = {
      id: `ass-${Date.now()}`,
      title: examTitle,
      courseId: examCourseId,
      totalMarks: examTotalMarks,
      passingMarks,
      durationMinutes,
      maxAttempts,
      proctoringRequired,
      aiGradingEnabled: aiScoringEnabled,
      questionIds: ['q-101', 'q-102'],
      status: 'published',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setAssessments([newAss, ...assessments]);
    setIsAssessmentModalOpen(false);
    showNotice(`Assessment "${examTitle}" published to course syllabus!`);
    setExamTitle('');
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
    setIsAssignmentModalOpen(false);
    showNotice(`Assignment "${asgTitle}" created and broadcast to cohort students!`);
    setAsgTitle('');
    setAsgDesc('');
  };

  const filteredAssessments = assessments.filter((a) => {
    const matchesCourse = selectedCourseFilter === 'all' || a.courseId === selectedCourseFilter;
    const matchesFaculty = !isFaculty || assignedCourses.some((c) => c.id === a.courseId);
    return matchesCourse && matchesFaculty;
  });

  const filteredAssignments = assignments.filter((asg) => {
    const matchesCourse = selectedCourseFilter === 'all' || asg.courseId === selectedCourseFilter;
    const matchesFaculty = !isFaculty || assignedCourses.some((c) => c.id === asg.courseId);
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
            <span className="text-muted text-xs">Acme Learning Corp &bull; AY 2026–2027</span>
            {isFaculty && <span className="badge badge-draft">Dr. James Wilson</span>}
            {isLearner && <span className="badge badge-active">Alex Thompson</span>}
          </div>
          <h1 style={{ fontSize: '1.75rem', margin: 0 }}>
            {activeTab === 'assignments'
              ? isLearner ? 'My Course Assignments & Capstones' : 'Course Assignments & Deliverables'
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

        {!isLearner && (
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {activeTab === 'assignments' ? (
              <button className="btn btn-primary" onClick={() => setIsAssignmentModalOpen(true)}>
                <Plus size={16} /> Create Assignment
              </button>
            ) : (
              <button className="btn btn-primary" onClick={() => setIsAssessmentModalOpen(true)}>
                <Plus size={16} /> Create Quiz / Exam
              </button>
            )}
            <Link to="/grading" className="btn btn-secondary">
              <PenTool size={16} /> Grading Queue
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

      {/* Tabs Nav */}
      <div className="tabs-nav">
        <button
          className={`tab-btn ${activeTab === 'assignments' ? 'active' : ''}`}
          onClick={() => setActiveTab('assignments')}
        >
          <ClipboardCheck size={16} />
          {isLearner ? 'My Assignments' : 'Course Assignments'} ({assignments.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'assessments' ? 'active' : ''}`}
          onClick={() => setActiveTab('assessments')}
        >
          <Clock size={16} />
          Quizzes & Exams ({filteredAssessments.length})
        </button>
        {isLearner && (
          <button
            className={`tab-btn ${activeTab === 'results' ? 'active' : ''}`}
            onClick={() => setActiveTab('results')}
          >
            <Award size={16} />
            My Results & Grades (3)
          </button>
        )}
      </div>

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
          <div className="grid-3">
            {filteredAssignments.map((asg) => {
              const course = mockCourses.find((c) => c.id === asg.courseId);
              const cohort = mockCohorts.find((c) => c.id === asg.cohortId);

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
                        <span style={{ fontWeight: 600 }}>{course?.title || 'Advanced React'}</span>
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
                        <Link to="/grading" className="btn btn-primary btn-sm" style={{ width: '100%', justifyContent: 'center', gap: '6px' }}>
                          <PenTool size={13} /> Grade Submissions ({asg.submissionsCount - asg.gradedCount} Pending)
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: QUIZZES & EXAMS */}
      {activeTab === 'assessments' && (
        <div className="grid-3">
          {filteredAssessments.map((a) => {
            const course = mockCourses.find((c) => c.id === a.courseId);
            const isCompletedByLearner = a.id === 'a-001';

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
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {a.proctoringRequired && (
                        <span className="badge badge-error" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Shield size={12} /> Proctored
                        </span>
                      )}
                      {a.aiGradingEnabled && (
                        <span className="badge badge-primary" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Sparkles size={12} /> AI Assisted
                        </span>
                      )}
                    </div>

                    {isLearner && isCompletedByLearner ? (
                      <span className="badge badge-success">PASSED &bull; 25/25 PTS</span>
                    ) : (
                      <span className="badge badge-active">{a.status}</span>
                    )}
                  </div>

                  <h3 style={{ fontSize: '1.15rem', marginBottom: '6px' }}>{a.title}</h3>
                  <p className="text-muted text-xs" style={{ marginBottom: '16px' }}>
                    Course: <strong>{course?.title || 'Advanced Web Development'}</strong>
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
                      <span className="text-muted text-xs">Duration:</span>
                      <div style={{ fontWeight: 600 }}>{a.durationMinutes} Minutes</div>
                    </div>
                    <div>
                      <span className="text-muted text-xs">Total Marks:</span>
                      <div style={{ fontWeight: 600 }}>{a.totalMarks} Points</div>
                    </div>
                    <div>
                      <span className="text-muted text-xs">Passing Score:</span>
                      <div style={{ fontWeight: 600, color: 'var(--success)' }}>
                        {a.passingMarks || 70} pts
                      </div>
                    </div>
                    <div>
                      <span className="text-muted text-xs">Allowed Attempts:</span>
                      <div style={{ fontWeight: 600 }}>{a.maxAttempts}</div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  {isLearner ? (
                    isCompletedByLearner ? (
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ flex: 1, gap: '6px', justifyContent: 'center' }}
                        onClick={() => setActiveTab('results')}
                      >
                        <Award size={13} /> View Result (100%)
                      </button>
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
                      <Link
                        to={`/exam/${a.id}`}
                        className="btn btn-secondary btn-sm"
                        style={{ flex: 1, gap: '6px', justifyContent: 'center' }}
                      >
                        <Play size={13} /> Preview Exam
                      </Link>
                      <Link
                        to="/grading"
                        className="btn btn-primary btn-sm"
                        style={{ flex: 1, gap: '6px', justifyContent: 'center' }}
                      >
                        <PenTool size={13} /> View Grades
                      </Link>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 3: STUDENT RESULTS */}
      {isLearner && activeTab === 'results' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Results KPI Summary */}
          <div className="grid-4">
            <div className="stat-card">
              <span className="text-muted text-xs font-semibold">Cumulative Average</span>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--success)' }}>95.7%</div>
              <p className="text-success text-xs">&uarr; Grade: A+ (Honors Track)</p>
            </div>
            <div className="stat-card">
              <span className="text-muted text-xs font-semibold">Quizzes / Exams Passed</span>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)' }}>2 / 2</div>
              <p className="text-muted text-xs">100% assessment clearance</p>
            </div>
            <div className="stat-card">
              <span className="text-muted text-xs font-semibold">Assignments Graded</span>
              <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>92.0%</div>
              <p className="text-muted text-xs">92 / 100 points obtained</p>
            </div>
            <div className="stat-card">
              <span className="text-muted text-xs font-semibold">Earned Certificates</span>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--accent-purple)' }}>1 Active</div>
              <p className="text-muted text-xs">Verified digital credential</p>
            </div>
          </div>

          {/* Academic Evaluations Table */}
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>Published Examination & Assignment Transcript</h3>
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
                  <tr>
                    <td style={{ fontWeight: 600 }}>JavaScript & TypeScript Fundamentals Quiz</td>
                    <td>Distributed Systems & Cloud Architecture</td>
                    <td><span className="badge badge-primary">Proctored Quiz</span></td>
                    <td className="text-muted text-xs">Oct 14, 2026</td>
                    <td><strong>25 / 25</strong></td>
                    <td style={{ color: 'var(--success)', fontWeight: 700 }}>100%</td>
                    <td><span className="badge badge-success">PASSED</span></td>
                    <td>
                      <button
                        className="btn btn-secondary btn-xs"
                        onClick={() => showNotice('Quiz Score Breakdown: Section 1 (ES6+): 10/10, Section 2 (Generics): 10/10, Section 3 (Async): 5/5.')}
                      >
                        <Eye size={12} /> View Breakdown
                      </button>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Distributed System Architecture & Microservices Capstone</td>
                    <td>Distributed Systems & Cloud Architecture</td>
                    <td><span className="badge badge-info">Project Deliverable</span></td>
                    <td className="text-muted text-xs">Oct 15, 2026</td>
                    <td><strong>92 / 100</strong></td>
                    <td style={{ color: 'var(--success)', fontWeight: 700 }}>92%</td>
                    <td><span className="badge badge-success">GRADED (A)</span></td>
                    <td>
                      <button
                        className="btn btn-secondary btn-xs"
                        onClick={() => setViewingAssignment(assignments[0])}
                      >
                        <Eye size={12} /> View Feedback
                      </button>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Full-Stack Web Architecture Comprehensive Exam</td>
                    <td>Full-Stack Web Development Bootcamp</td>
                    <td><span className="badge badge-primary">Final Exam</span></td>
                    <td className="text-muted text-xs">Oct 02, 2026</td>
                    <td><strong>95 / 100</strong></td>
                    <td style={{ color: 'var(--success)', fontWeight: 700 }}>95%</td>
                    <td><span className="badge badge-success">PASSED &bull; CERTIFIED</span></td>
                    <td>
                      <Link to="/my-certificates" className="btn btn-secondary btn-xs">
                        <Award size={12} /> View Certificate
                      </Link>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Create Assessment Modal (Quiz / Exam) */}
      {isAssessmentModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAssessmentModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Configure New Quiz / Examination</h3>
              <button onClick={() => setIsAssessmentModalOpen(false)} style={{ color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateAssessment}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Assessment Title <span className="required">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Distributed Systems Midterm Examination"
                    className="form-input"
                    value={examTitle}
                    onChange={(e) => setExamTitle(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Linked Course</label>
                  <select className="form-select" value={examCourseId} onChange={(e) => setExamCourseId(e.target.value)}>
                    {assignedCourses.map((c) => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Duration (Mins)</label>
                    <input
                      type="number"
                      min="5"
                      className="form-input"
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 30)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Total Marks</label>
                    <input
                      type="number"
                      min="10"
                      className="form-input"
                      value={examTotalMarks}
                      onChange={(e) => setExamTotalMarks(parseInt(e.target.value) || 100)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Pass Marks</label>
                    <input
                      type="number"
                      min="1"
                      className="form-input"
                      value={passingMarks}
                      onChange={(e) => setPassingMarks(parseInt(e.target.value) || 70)}
                    />
                  </div>
                </div>

                <div style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={proctoringRequired}
                      onChange={(e) => setProctoringRequired(e.target.checked)}
                      style={{ accentColor: 'var(--primary)' }}
                    />
                    <div>
                      <div style={{ fontWeight: 600 }}>Enable Automated Proctoring Protocol</div>
                      <div className="text-muted text-xs">Enforces webcam permissions, tab focus monitoring, and incident timeline logging</div>
                    </div>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={aiScoringEnabled}
                      onChange={(e) => setAiScoringEnabled(e.target.checked)}
                      style={{ accentColor: 'var(--primary)' }}
                    />
                    <div>
                      <div style={{ fontWeight: 600 }}>Enable BOT / AI Evaluation Assistance</div>
                      <div className="text-muted text-xs">Generates preliminary rubric score recommendations for human reviewer sign-off</div>
                    </div>
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsAssessmentModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Publish Assessment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                        ? 'https://github.com/alex-thompson/my-capstone-project'
                        : 'react-kanban-offline-demo.zip (or enter cloud document link)'
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

                <div className="text-muted text-xs" style={{ marginTop: '10px', fontStyle: 'italic' }}>
                  * Demo Notice: Deliverable will update your local student session state. Changes do not permanently persist after page reload.
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
                  Submitted on: <strong>{viewingAssignment.learnerSubmittedAt || 'Oct 15, 2026'}</strong>
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
                  {viewingAssignment.learnerSubmissionUrl || 'https://github.com/alex-thompson/distributed-services-capstone'}
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
                    <span className="text-muted">Graded by: <strong>Dr. James Wilson</strong></span>
                    <span style={{ fontWeight: 700, color: 'var(--success)' }}>Letter Grade: A (92.0%)</span>
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
    </div>
  );
};
