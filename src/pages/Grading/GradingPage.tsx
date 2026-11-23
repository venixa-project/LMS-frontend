import React, { useState, useMemo, useEffect } from 'react';
import { useAuthStore } from '../../lib/store';
import { useGradingStore } from '../../lib/gradingStore';
import { GradingTask } from '../../types';
import { AiScoreSuggestionsDashboard } from './components/AiScoreSuggestionsDashboard';
import { StudentAssessmentDrawer } from './components/StudentAssessmentDrawer';
import { SubmissionEvaluationModal } from './components/SubmissionEvaluationModal';
import { ReleaseResultsDashboard } from './components/ReleaseResultsDashboard';
import { PenTool, Sparkles, CheckCircle2, Check, RefreshCw, AlertCircle, RotateCcw, Send } from 'lucide-react';

export const GradingPage: React.FC = () => {
  const { user } = useAuthStore();
  const isFaculty = user?.activeRole === 'trainer' || user?.activeRole === 'instructor' || user?.activeRole === 'grader';
  const isAdmin = user?.activeRole === 'platform_admin' || user?.activeRole === 'org_admin' || user?.activeRole === 'lms_admin';

  const {
    tasks,
    attempts,
    releaseQueue,
    isLoading,
    error,
    selectedStudentId,
    setSelectedStudentId,
    activeSubmissionModalAttempt,
    openSubmissionModal,
    closeSubmissionModal,
    acceptAiScore,
    triggerEvaluation,
    fetchQueue,
    fetchSuggestions,
    fetchStatistics,
    fetchReleaseQueue,
  } = useGradingStore();

  const [activeTab, setActiveTab] = useState<'queue' | 'ai_review' | 'release'>('queue');
  const [notice, setNotice] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [reEvaluatingTaskId, setReEvaluatingTaskId] = useState<string | null>(null);

  const showNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3500);
  };

  // Faculty course scope
  const authorizedCourseIds = useMemo(() => {
    if (isFaculty) {
      if (user?.eligibleCourseIds && user.eligibleCourseIds.length > 0) {
        return user.eligibleCourseIds;
      }
      return [];
    }
    return undefined;
  }, [isFaculty, user]);

  // Initial load from real PostgreSQL database
  useEffect(() => {
    const loadData = async () => {
      await Promise.all([
        fetchQueue(authorizedCourseIds ? { eligibleCourseIds: authorizedCourseIds } : {}),
        fetchSuggestions(authorizedCourseIds ? { eligibleCourseIds: authorizedCourseIds } : {}),
        fetchStatistics(authorizedCourseIds ? { eligibleCourseIds: authorizedCourseIds } : {}),
        fetchReleaseQueue(authorizedCourseIds ? { eligibleCourseIds: authorizedCourseIds } : {}),
      ]);
    };
    loadData();
  }, [authorizedCourseIds]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        fetchQueue(authorizedCourseIds ? { eligibleCourseIds: authorizedCourseIds } : {}),
        fetchSuggestions(authorizedCourseIds ? { eligibleCourseIds: authorizedCourseIds } : {}),
        fetchStatistics(authorizedCourseIds ? { eligibleCourseIds: authorizedCourseIds } : {}),
        fetchReleaseQueue(authorizedCourseIds ? { eligibleCourseIds: authorizedCourseIds } : {}),
      ]);
      showNotice('Grading queue & release records refreshed from PostgreSQL.');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Count unreleased submissions awaiting admin / creator release
  const unreleasedCount = useMemo(() => {
    return releaseQueue.filter((i) => i.status !== 'results_released' && i.evaluationStatus !== 'published').length;
  }, [releaseQueue]);

  // Scoped tasks for faculty
  const scopedTasks = useMemo(() => {
    if (isFaculty && authorizedCourseIds && authorizedCourseIds.length > 0) {
      return tasks.filter((t) => (t.courseId ? authorizedCourseIds.includes(t.courseId) : true));
    }
    return tasks;
  }, [tasks, isFaculty, authorizedCourseIds]);

  const handleOpenAttemptModalFromTask = (task: GradingTask) => {
    const matchingAttempt = attempts.find((a) => a.id === task.attemptId);
    if (matchingAttempt) {
      openSubmissionModal(matchingAttempt);
    } else {
      openSubmissionModal({
        id: task.attemptId || `att-${task.id}`,
        assessmentId: task.assessmentId,
        assessmentTitle: task.assessmentTitle,
        courseId: task.courseId,
        courseTitle: task.courseTitle,
        assessmentType: task.assessmentType || 'exam',
        attemptNumber: task.attemptNumber || 1,
        learnerId: task.learnerId,
        learnerName: task.learnerName,
        learnerRollNo: task.learnerRollNo || 'STU-ID',
        learnerEmail: task.learnerEmail || '',
        status: task.status === 'completed' ? 'results_released' : 'submitted',
        evaluationStatus: task.evaluationStatus || 'ai_review_required',
        score: task.score !== undefined ? task.score : task.aiPreliminaryScore,
        totalMarks: task.totalMarks || 100,
        percentage: Math.round(((task.score || task.aiPreliminaryScore || 0) / (task.totalMarks || 100)) * 100),
        feedback: task.feedback,
        aiSuggestion: task.aiSuggestion,
        submittedAt: task.submittedAt || task.createdAt,
        answers: [],
      });
    }
  };

  const handleQuickAcceptAi = async (task: GradingTask) => {
    try {
      await acceptAiScore(task.id, 'Verified and approved AI suggested score');
      showNotice(`AI suggested score for ${task.learnerName} approved and published to PostgreSQL!`);
    } catch (err: any) {
      showNotice(`Failed to approve score: ${err?.message || 'Server error'}`);
    }
  };

  const handleReEvaluate = async (task: GradingTask) => {
    setReEvaluatingTaskId(task.id);
    try {
      await triggerEvaluation(task.id);
      showNotice(`AI evaluation completed for ${task.learnerName}!`);
    } catch (err: any) {
      showNotice(`Evaluation failed: ${err?.message || 'AI service error'}`);
    } finally {
      setReEvaluatingTaskId(null);
    }
  };

  return (
    <div>
      {/* Page Title & Scope Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="badge badge-primary">
              {isFaculty ? 'Faculty Evaluation Scope' : 'Academic Evaluation & Grading'}
            </span>
            {isFaculty && (
              <span className="badge badge-draft">
                {user?.displayName || 'Faculty Member'}
              </span>
            )}
            {isAdmin && (
              <span className="badge badge-info">Institution Admin Access</span>
            )}
          </div>
          <h1 style={{ fontSize: '1.75rem', margin: 0, fontWeight: 800 }}>
            AI Evaluation Queue & Score Suggestions
          </h1>
          <p className="text-secondary text-sm" style={{ margin: '4px 0 0 0' }}>
            {isFaculty
              ? 'Review AI-generated preliminary scores, rubric feedback, and confidence indicators. Human approval is required to confirm final grades for assigned courses.'
              : 'Institution-wide student assessment queue, AI preliminary score suggestions, and grade verification records.'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            title="Refresh grading queue from PostgreSQL"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
          <span className="badge badge-primary">AI Evaluation Active</span>
          <span className="badge badge-secondary">Human Approval Required</span>
        </div>
      </div>

      {notice && (
        <div style={{
          background: 'var(--success-bg)',
          border: '1px solid var(--success-border)',
          color: 'var(--success)',
          padding: '10px 16px',
          borderRadius: 'var(--radius-md)',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.85rem'
        }}>
          <CheckCircle2 size={16} />
          <span>{notice}</span>
        </div>
      )}

      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          color: '#ef4444',
          padding: '12px 16px',
          borderRadius: 'var(--radius-md)',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.85rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
          <button onClick={handleRefresh} className="btn btn-secondary btn-sm" style={{ padding: '2px 8px', fontSize: '0.75rem' }}>
            Retry
          </button>
        </div>
      )}

      {/* Tabs Navigation (AI Evaluation Queue, AI Score Suggestions, and Release Results) */}
      <div className="tabs-nav" style={{ marginBottom: '20px' }}>
        <button
          className={`tab-btn ${activeTab === 'queue' ? 'active' : ''}`}
          onClick={() => setActiveTab('queue')}
        >
          <PenTool size={16} />
          AI Evaluation Queue ({scopedTasks.filter((t) => t.status !== 'completed').length})
        </button>

        <button
          className={`tab-btn ${activeTab === 'ai_review' ? 'active' : ''}`}
          onClick={() => setActiveTab('ai_review')}
        >
          <Sparkles size={16} />
          AI Score Suggestions ({scopedTasks.filter((t) => t.evaluationStatus === 'ai_review_required' || t.aiPreliminaryScore !== undefined).length})
        </button>

        <button
          className={`tab-btn ${activeTab === 'release' ? 'active' : ''}`}
          onClick={() => setActiveTab('release')}
        >
          <Send size={16} />
          Release Results & Scores ({unreleasedCount})
        </button>
      </div>

      {/* Tab 1: AI Evaluation Queue */}
      {activeTab === 'queue' && (
        <div className="card" style={{ margin: 0, padding: 0, overflow: 'hidden' }}>
          <div className="table-container" style={{ overflowX: 'hidden' }}>
            <table className="table" style={{ fontSize: '0.82rem', width: '100%', tableLayout: 'fixed', margin: 0 }}>
              <thead>
                <tr>
                  <th style={{ width: '22%' }}>Student Name</th>
                  <th style={{ width: '28%' }}>Assessment & Course</th>
                  <th style={{ width: '12%' }}>Submitted</th>
                  <th style={{ width: '18%' }}>AI Evaluation</th>
                  <th style={{ width: '10%' }}>Status</th>
                  <th style={{ width: '10%', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && scopedTasks.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '36px' }}>
                      <RefreshCw size={24} className="animate-spin text-primary" style={{ margin: '0 auto 8px' }} />
                      <div className="text-muted text-xs">Loading grading queue from PostgreSQL...</div>
                    </td>
                  </tr>
                ) : scopedTasks.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '48px 24px' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                        <Check size={24} />
                      </div>
                      <h4 style={{ fontSize: '1rem', marginBottom: '4px', fontWeight: 600 }}>All Submissions Evaluated</h4>
                      <p className="text-secondary text-xs" style={{ maxWidth: '360px', margin: '0 auto', lineHeight: 1.5 }}>
                        There are currently no student assessment submissions awaiting AI evaluation or instructor sign-off in your active grading queue.
                      </p>
                    </td>
                  </tr>
                ) : (
                  scopedTasks.map((t) => (
                    <tr key={t.id}>
                      <td style={{ overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div
                            style={{
                              width: '26px',
                              height: '26px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                              color: '#fff',
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {(t.learnerName || 'S').slice(0, 2).toUpperCase()}
                          </div>
                          <div style={{ minWidth: 0, overflow: 'hidden' }}>
                            <div style={{ fontWeight: 600, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {t.learnerName}
                            </div>
                            <div className="text-muted text-xs" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              ID: {t.learnerRollNo || t.submissionId || 'STU-ID'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ overflow: 'hidden' }}>
                        <div style={{ minWidth: 0, overflow: 'hidden' }}>
                          <div
                            style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-main)' }}
                            title={t.assessmentTitle}
                          >
                            {t.assessmentTitle}
                          </div>
                          <div className="text-muted text-xs" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={t.courseTitle || 'Enrolled Course'}>
                            {t.courseTitle || 'Enrolled Course'}
                          </div>
                        </div>
                      </td>
                      <td style={{ whiteSpace: 'nowrap', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        {t.submittedAt ? new Date(t.submittedAt).toLocaleDateString() : 'Recent'}
                      </td>
                      <td>
                        {t.aiPreliminaryScore !== undefined || t.aiSuggestion ? (
                          <span className="badge badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 6px', fontSize: '0.75rem' }}>
                            <Sparkles size={11} /> {t.aiPreliminaryScore !== undefined ? t.aiPreliminaryScore : t.aiSuggestion?.score}/{t.totalMarks}{' '}
                            <span className="text-muted text-xs" style={{ opacity: 0.85 }}>
                              ({Math.round((t.aiSuggestion?.confidence || 0.92) * 100)}%)
                            </span>
                          </span>
                        ) : (t.evaluationStatus as string) === 'unsupported_type' || (t.assessmentType as string) === 'unsupported_type' ? (
                          <span className="badge badge-secondary text-xs" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '2px 5px' }}>
                            Manual
                          </span>
                        ) : (
                          <span className="badge badge-warning text-xs" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '2px 5px' }}>
                            AI Review
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${t.status === 'completed' ? 'badge-completed' : 'badge-draft'} text-xs`} style={{ padding: '2px 6px' }}>
                          {t.status === 'completed' ? 'Completed' : t.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '4px 7px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '3px' }}
                            onClick={() => handleReEvaluate(t)}
                            disabled={reEvaluatingTaskId === t.id}
                            title="Re-run AI evaluation on student submission"
                          >
                            <RotateCcw size={11} className={reEvaluatingTaskId === t.id ? 'animate-spin' : ''} />
                          </button>
                          <button
                            className="btn btn-primary btn-sm"
                            style={{ padding: '4px 10px', fontSize: '0.74rem', gap: '4px', fontWeight: 600, whiteSpace: 'nowrap' }}
                            onClick={() => handleOpenAttemptModalFromTask(t)}
                            title={t.status === 'completed' ? 'Review & Edit Grade' : 'Review AI Evaluation'}
                          >
                            <Sparkles size={11} />
                            Review
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: AI Score Suggestions & Student Assessment Analytics Dashboard */}
      {activeTab === 'ai_review' && (
        <AiScoreSuggestionsDashboard
          onOpenStudentDrawer={(studentId) => setSelectedStudentId(studentId)}
          onOpenSubmissionModal={(attemptId) => {
            const att = attempts.find((a) => a.id === attemptId);
            if (att) openSubmissionModal(att);
          }}
        />
      )}

      {/* Tab 3: Score Release Center & Student Notification Gate */}
      {activeTab === 'release' && (
        <ReleaseResultsDashboard
          onOpenSubmissionModal={(attemptId) => {
            const att = attempts.find((a) => a.id === attemptId);
            if (att) {
              openSubmissionModal(att);
            } else {
              const rItem = releaseQueue.find((r) => r.id === attemptId);
              if (rItem) {
                openSubmissionModal({
                  id: rItem.id,
                  assessmentId: rItem.assessment.id,
                  assessmentTitle: rItem.assessment.title,
                  courseId: rItem.assessment.courseId,
                  courseTitle: rItem.assessment.course?.title || 'Enrolled Course',
                  assessmentType: 'exam',
                  attemptNumber: 1,
                  learnerId: rItem.learner.id,
                  learnerName: rItem.learner.displayName,
                  learnerRollNo: rItem.learner.rollNo || 'STU-ID',
                  learnerEmail: rItem.learner.email,
                  status: rItem.status as any,
                  evaluationStatus: rItem.evaluationStatus as any,
                  score: rItem.score ?? undefined,
                  totalMarks: rItem.totalMarks,
                  percentage: rItem.percentage ?? undefined,
                  feedback: rItem.feedback || undefined,
                  submittedAt: rItem.submittedAt,
                  answers: [],
                });
              }
            }
          }}
          authorizedCourseIds={authorizedCourseIds}
          isFaculty={isFaculty}
        />
      )}

      {/* Dedicated Student Assessment Drawer */}
      {selectedStudentId && (
        <StudentAssessmentDrawer
          studentId={selectedStudentId}
          onClose={() => setSelectedStudentId(null)}
          authorizedCourseIds={authorizedCourseIds}
          isFaculty={isFaculty}
        />
      )}

      {/* Individual Submission Evaluation & Scoring Modal */}
      {activeSubmissionModalAttempt && (
        <SubmissionEvaluationModal
          attempt={activeSubmissionModalAttempt}
          onClose={closeSubmissionModal}
          isFaculty={isFaculty}
        />
      )}
    </div>
  );
};
