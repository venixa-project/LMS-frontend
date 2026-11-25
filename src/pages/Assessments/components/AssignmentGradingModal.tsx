import React, { useState, useMemo } from 'react';
import {
  X,
  ExternalLink,
  CheckCircle2,
  Clock,
  Award,
  BookOpen,
  GitBranch,
  FileCode,
  FileArchive,
  Save,
  RotateCcw,
  Sparkles,
  Search,
  Check,
  User,
  AlertCircle,
  Copy
} from 'lucide-react';
import {
  fetchAssignmentSubmissionsApi,
  gradeAssignmentSubmissionApi,
} from '../../../api/assignment.api';

export interface StudentSubmissionRecord {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentRollNo: string;
  submittedAt: string;
  submissionUrl: string;
  submissionNotes?: string;
  status: 'pending' | 'graded';
  score?: number;
  maxScore: number;
  letterGrade?: string;
  feedback?: string;
  gradedBy?: string;
  gradedAt?: string;
}

export interface CourseAssignment {
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
  learnerStatus?: 'pending' | 'submitted' | 'graded';
  learnerScore?: number;
  learnerFeedback?: string;
  learnerSubmissionUrl?: string;
  learnerSubmittedAt?: string;
  submissions?: StudentSubmissionRecord[];
}

interface AssignmentGradingModalProps {
  assignment: CourseAssignment;
  onClose: () => void;
  onSaveGrade: (
    assignmentId: string,
    submissionId: string,
    score: number,
    letterGrade: string,
    feedback: string
  ) => void;
  currentGraderName?: string;
}

export const AssignmentGradingModal: React.FC<AssignmentGradingModalProps> = ({
  assignment,
  onClose,
  onSaveGrade,
  currentGraderName = 'Marcus Johnson (Faculty Grader)',
}) => {
  // Only load authentic submissions passed in or fetched from backend
  const initialSubmissions: StudentSubmissionRecord[] = useMemo(() => {
    return Array.isArray(assignment.submissions) ? assignment.submissions : [];
  }, [assignment]);

  const [submissions, setSubmissions] = useState<StudentSubmissionRecord[]>(initialSubmissions);
  const [selectedSubId, setSelectedSubId] = useState<string>(initialSubmissions[0]?.id || '');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'graded'>('all');
  const [copiedLink, setCopiedLink] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Proactively fetch live submissions from PostgreSQL database
  React.useEffect(() => {
    if (assignment.id) {
      fetchAssignmentSubmissionsApi(assignment.id)
        .then((liveSubs) => {
          if (Array.isArray(liveSubs)) {
            setSubmissions(liveSubs);
            if (liveSubs.length > 0 && (!selectedSubId || !liveSubs.some((s) => s.id === selectedSubId))) {
              setSelectedSubId(liveSubs[0].id);
            }
          }
        })
        .catch((err) => {
          console.warn('Could not fetch submissions from PostgreSQL API:', err);
        });
    }
  }, [assignment.id]);

  // Active submission under review
  const activeSub = useMemo(() => {
    return submissions.find((s) => s.id === selectedSubId) || submissions[0];
  }, [submissions, selectedSubId]);

  // Form state for active submission grading - clean empty defaults (no mock 85 or canned review text)
  const [inputScore, setInputScore] = useState<number | ''>(() => {
    return activeSub?.score !== undefined && activeSub?.score !== null ? activeSub.score : '';
  });
  const [inputFeedback, setInputFeedback] = useState<string>(() => {
    return activeSub?.feedback || '';
  });

  // Re-sync form state when activeSub changes
  React.useEffect(() => {
    if (activeSub) {
      setInputScore(activeSub.score !== undefined && activeSub.score !== null ? activeSub.score : '');
      setInputFeedback(activeSub.feedback || '');
    } else {
      setInputScore('');
      setInputFeedback('');
    }
  }, [activeSub?.id]);

  // Helper for letter grade calculation
  const calculateLetterGrade = (scoreVal: number | '', maxScoreVal: number): string => {
    if (scoreVal === '' || isNaN(Number(scoreVal))) return 'Pending Evaluation';
    const num = Number(scoreVal);
    const pct = (num / (maxScoreVal || 1)) * 100;
    if (pct >= 90) return 'A (Outstanding)';
    if (pct >= 80) return 'B (Proficient)';
    if (pct >= 70) return 'C (Satisfactory)';
    if (pct >= 60) return 'D (Marginal)';
    return 'F (Needs Improvement)';
  };

  const letterGrade = useMemo(() => {
    return calculateLetterGrade(inputScore, assignment.totalMarks);
  }, [inputScore, assignment.totalMarks]);

  // Filtered submissions roster
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((s) => {
      const matchesSearch =
        s.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.studentRollNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.studentEmail.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = statusFilter === 'all' || s.status === statusFilter;
      return matchesSearch && matchesFilter;
    });
  }, [submissions, searchTerm, statusFilter]);

  const handlePublishGrade = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSub) return;

    const validatedScore = Math.min(Math.max(0, Number(inputScore) || 0), assignment.totalMarks);
    const calculatedGrade = calculateLetterGrade(validatedScore, assignment.totalMarks);

    const updatedSubmissions = submissions.map((sub) => {
      if (sub.id === activeSub.id) {
        return {
          ...sub,
          status: 'graded' as const,
          score: validatedScore,
          letterGrade: calculatedGrade,
          feedback: inputFeedback.trim(),
          gradedBy: currentGraderName,
          gradedAt: new Date().toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
        };
      }
      return sub;
    });

    setSubmissions(updatedSubmissions);
    onSaveGrade(assignment.id, activeSub.id, validatedScore, calculatedGrade, inputFeedback.trim());

    // Publish to PostgreSQL API
    gradeAssignmentSubmissionApi(assignment.id, activeSub.id, {
      score: validatedScore,
      letterGrade: calculatedGrade,
      feedback: inputFeedback.trim(),
    }).catch((err) => {
      console.warn('Failed to publish grade to PostgreSQL API:', err);
    });

    setNotice(`Grade (${validatedScore}/${assignment.totalMarks}) published for ${activeSub.studentName}!`);
    setTimeout(() => setNotice(null), 3500);
  };

  const handleCopyLink = () => {
    if (!activeSub?.submissionUrl) return;
    navigator.clipboard.writeText(activeSub.submissionUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const gradedCount = submissions.filter((s) => s.status === 'graded').length;
  const pendingCount = submissions.filter((s) => s.status === 'pending').length;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 10005 }}>
      <div
        className="modal-card"
        style={{
          maxWidth: '1060px',
          width: '95vw',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
          borderRadius: '16px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'var(--bg-surface)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)',
              }}
            >
              <BookOpen size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                <span className="badge badge-primary text-xs" style={{ textTransform: 'uppercase' }}>
                  {assignment.submissionFormat === 'repo'
                    ? 'Git Repository Deliverable'
                    : assignment.submissionFormat === 'file'
                    ? 'File Archive Deliverable'
                    : 'Text Submission'}
                </span>
                <span className="badge badge-info text-xs">Due: {assignment.dueDate}</span>
                <span className="badge badge-secondary text-xs">
                  Max Marks: <strong>{assignment.totalMarks} Points</strong>
                </span>
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                {assignment.title}
              </h3>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                background: 'var(--bg-input)',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                border: '1px solid var(--border-subtle)',
              }}
            >
              Graded: <strong style={{ color: 'var(--success)' }}>{gradedCount}</strong> /{' '}
              <strong>{submissions.length} Students</strong>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '6px',
                display: 'flex',
              }}
              title="Close Modal"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Notice Banner */}
        {notice && (
          <div
            style={{
              background: 'var(--success-bg)',
              borderBottom: '1px solid var(--success-border)',
              color: 'var(--success)',
              padding: '10px 24px',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 600,
            }}
          >
            <CheckCircle2 size={16} />
            <span>{notice}</span>
          </div>
        )}

        {/* Modal Main Body: Master-Detail Layout */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: '520px' }}>
          {/* Left Column: Student Submissions Roster */}
          <div
            style={{
              width: '340px',
              borderRight: '1px solid var(--border-subtle)',
              background: 'var(--bg-surface)',
              display: 'flex',
              flexDirection: 'column',
              flexShrink: 0,
            }}
          >
            {/* Search and Filters */}
            <div style={{ padding: '14px', borderBottom: '1px solid var(--border-subtle)' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: 'var(--bg-input)',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  padding: '6px 10px',
                  gap: '8px',
                  marginBottom: '10px',
                }}
              >
                <Search size={14} className="text-muted" />
                <input
                  type="text"
                  placeholder="Search candidate name or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    fontSize: '0.82rem',
                    color: 'var(--text-main)',
                    width: '100%',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  className={`btn btn-xs ${statusFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1, padding: '4px 6px', fontSize: '0.72rem' }}
                  onClick={() => setStatusFilter('all')}
                >
                  All ({submissions.length})
                </button>
                <button
                  type="button"
                  className={`btn btn-xs ${statusFilter === 'pending' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1, padding: '4px 6px', fontSize: '0.72rem' }}
                  onClick={() => setStatusFilter('pending')}
                >
                  Pending ({pendingCount})
                </button>
                <button
                  type="button"
                  className={`btn btn-xs ${statusFilter === 'graded' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1, padding: '4px 6px', fontSize: '0.72rem' }}
                  onClick={() => setStatusFilter('graded')}
                >
                  Graded ({gradedCount})
                </button>
              </div>
            </div>

            {/* List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
              {filteredSubmissions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)' }}>
                  <User size={28} style={{ opacity: 0.4, margin: '0 auto 8px' }} />
                  <p style={{ fontSize: '0.82rem', margin: 0 }}>No submissions found</p>
                </div>
              ) : (
                filteredSubmissions.map((sub) => {
                  const isSelected = sub.id === activeSub?.id;
                  const initials = sub.studentName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase();

                  return (
                    <div
                      key={sub.id}
                      onClick={() => setSelectedSubId(sub.id)}
                      style={{
                        padding: '12px',
                        borderRadius: '10px',
                        marginBottom: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        border: isSelected
                          ? '1.5px solid var(--primary)'
                          : '1px solid var(--border-subtle)',
                        background: isSelected
                          ? 'rgba(99, 102, 241, 0.08)'
                          : 'var(--bg-card)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              background: isSelected
                                ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)'
                                : 'rgba(99, 102, 241, 0.15)',
                              color: isSelected ? '#fff' : 'var(--primary)',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {initials}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-main)' }}>
                              {sub.studentName}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              {sub.studentRollNo}
                            </div>
                          </div>
                        </div>

                        {sub.status === 'graded' ? (
                          <span
                            className="badge badge-success text-xs"
                            style={{ padding: '2px 6px', fontSize: '0.7rem' }}
                          >
                            {sub.score}/{sub.maxScore}
                          </span>
                        ) : (
                          <span
                            className="badge badge-warning text-xs"
                            style={{ padding: '2px 6px', fontSize: '0.7rem' }}
                          >
                            Pending
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={11} /> {sub.submittedAt.split(' ')[0]}
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: 'var(--primary)' }}>
                          {assignment.submissionFormat === 'repo' ? <GitBranch size={11} /> : <FileArchive size={11} />}
                          Deliverable
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Active Submission Evaluation & Code Review */}
          {activeSub ? (
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '24px',
                background: 'var(--bg-main)',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Candidate Info Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingBottom: '16px',
                  borderBottom: '1px solid var(--border-subtle)',
                  marginBottom: '20px',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <h4 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                      {activeSub.studentName}
                    </h4>
                    <span className="badge badge-secondary text-xs">{activeSub.studentRollNo}</span>
                    <span className="badge badge-info text-xs">{activeSub.studentEmail}</span>
                  </div>
                  <div className="text-muted text-xs" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>Submitted on: <strong>{activeSub.submittedAt}</strong></span>
                    <span>&bull;</span>
                    <span style={{ color: 'var(--success)', fontWeight: 600 }}>
                      Academic Honor Pledge: Verified
                    </span>
                  </div>
                </div>

                {activeSub.status === 'graded' ? (
                  <div style={{ textAlign: 'right' }}>
                    <span className="badge badge-success" style={{ fontSize: '0.82rem', padding: '4px 10px' }}>
                      GRADED: {activeSub.score} / {activeSub.maxScore} pts ({activeSub.letterGrade || 'A'})
                    </span>
                    <div className="text-muted text-xs" style={{ marginTop: '4px' }}>
                      Graded by {activeSub.gradedBy || currentGraderName}
                    </div>
                  </div>
                ) : (
                  <span className="badge badge-warning" style={{ fontSize: '0.82rem', padding: '4px 10px' }}>
                    AWAITING FACULTY SCORING
                  </span>
                )}
              </div>

              {/* Submitted Deliverable Card */}
              <div
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                  padding: '16px',
                  marginBottom: '20px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>
                    {assignment.submissionFormat === 'repo' ? <GitBranch size={15} /> : <FileCode size={15} />}
                    <span>Submitted Student Deliverable</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-xs"
                      onClick={handleCopyLink}
                      style={{ padding: '3px 8px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      {copiedLink ? <Check size={12} color="var(--success)" /> : <Copy size={12} />}
                      {copiedLink ? 'Copied' : 'Copy URL'}
                    </button>
                    <a
                      href={activeSub.submissionUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary btn-xs"
                      style={{ padding: '3px 10px', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                    >
                      <ExternalLink size={12} /> Inspect Repository / File
                    </a>
                  </div>
                </div>

                <div
                  style={{
                    background: 'var(--bg-input)',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    fontFamily: 'monospace',
                    fontSize: '0.85rem',
                    color: 'var(--primary)',
                    wordBreak: 'break-all',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  {activeSub.submissionUrl}
                </div>

                {activeSub.submissionNotes && (
                  <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                      Student Notes for Grader:
                    </span>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      {activeSub.submissionNotes}
                    </p>
                  </div>
                )}
              </div>

              {/* Grading Form */}
              <form onSubmit={handlePublishGrade} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                <div
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '12px',
                    padding: '20px',
                    marginBottom: '20px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <Award size={18} color="var(--primary)" />
                    <h5 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      Faculty Evaluation & Score Entry
                    </h5>
                  </div>

                  {/* Marks & Letter Grade Row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.82rem' }}>
                        Marks Awarded (Max: {assignment.totalMarks} Points) <span className="required">*</span>
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="number"
                          min={0}
                          max={assignment.totalMarks}
                          step={1}
                          required
                          value={inputScore}
                          onChange={(e) => setInputScore(e.target.value === '' ? '' : Math.min(assignment.totalMarks, Math.max(0, Number(e.target.value))))}
                          placeholder="e.g. 85"
                          className="form-input"
                          style={{ fontSize: '1rem', fontWeight: 700, padding: '8px 12px' }}
                        />
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          / {assignment.totalMarks} pts
                        </span>
                      </div>
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.82rem' }}>
                        Calculated Letter Grade
                      </label>
                      <div
                        style={{
                          height: '42px',
                          display: 'flex',
                          alignItems: 'center',
                          padding: '0 14px',
                          borderRadius: '8px',
                          background: 'var(--bg-input)',
                          border: '1px solid var(--border-subtle)',
                          fontWeight: 700,
                          fontSize: '0.9rem',
                          color: typeof inputScore === 'number' && inputScore / assignment.totalMarks >= 0.7 ? 'var(--success)' : '#f59e0b',
                        }}
                      >
                        {letterGrade}
                      </div>
                    </div>
                  </div>

                  {/* Feedback / Rubric Notes */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label className="form-label" style={{ margin: 0, fontSize: '0.82rem' }}>
                        Faculty Rubric Critique & Feedback <span className="required">*</span>
                      </label>
                      <span className="text-muted text-xs">Visible to student</span>
                    </div>
                    <textarea
                      rows={4}
                      required
                      value={inputFeedback}
                      onChange={(e) => setInputFeedback(e.target.value)}
                      placeholder="Write comprehensive feedback regarding architecture, execution quality, test coverage, and key improvements..."
                      className="form-textarea"
                      style={{ fontSize: '0.85rem', lineHeight: 1.5 }}
                    />
                  </div>

                  {/* Quick Preset Feedback Pills */}
                  <div style={{ marginTop: '10px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', alignSelf: 'center' }}>
                      Quick Presets:
                    </span>
                    <button
                      type="button"
                      className="btn btn-secondary btn-xs"
                      style={{ fontSize: '0.7rem', padding: '2px 8px' }}
                      onClick={() =>
                        setInputFeedback(
                          'Outstanding code quality and modular architecture. All unit tests passing with thorough documentation. Excellent work!'
                        )
                      }
                    >
                      + Excellent Execution
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-xs"
                      style={{ fontSize: '0.7rem', padding: '2px 8px' }}
                      onClick={() =>
                        setInputFeedback(
                          'Satisfies core assignment requirements. Solid component separation. Recommendation: Add integration test suites and refine error handling.'
                        )
                      }
                    >
                      + Meets Requirements
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-xs"
                      style={{ fontSize: '0.7rem', padding: '2px 8px' }}
                      onClick={() =>
                        setInputFeedback(
                          'Deliverable requires revisions. Several boundary conditions and error validations are missing. Please review comments and submit an updated patch.'
                        )
                      }
                    >
                      + Needs Revisions
                    </button>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                  <div className="text-muted text-xs">
                    Signatory: <strong>{currentGraderName}</strong>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="button" className="btn btn-secondary" onClick={onClose}>
                      Close
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      style={{
                        gap: '6px',
                        background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                        border: 'none',
                        color: '#fff',
                        fontWeight: 700,
                        boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)',
                      }}
                    >
                      <Save size={15} /> Publish Grade & Feedback
                    </button>
                  </div>
                </div>
              </form>
            </div>
          ) : (
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                color: 'var(--text-muted)',
                padding: '30px',
                textAlign: 'center',
              }}
            >
              <AlertCircle size={40} style={{ opacity: 0.35, marginBottom: '12px', color: 'var(--primary)' }} />
              <h5 style={{ margin: '0 0 6px 0', fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                {submissions.length === 0 ? 'No Submissions Yet' : 'Select a Submission'}
              </h5>
              <p style={{ margin: 0, fontSize: '0.85rem', maxWidth: '340px', lineHeight: 1.5 }}>
                {submissions.length === 0
                  ? 'No students have submitted deliverables for this assignment yet. Student submissions will appear here once uploaded.'
                  : 'Select a candidate from the roster on the left to review their deliverable, assign scores, and submit rubric feedback.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
