import React, { useState, useMemo } from 'react';
import { useAuthStore } from '../../lib/store';
import { useGradingStore } from '../../lib/gradingStore';
import { GradingTask } from '../../types';
import { AiScoreSuggestionsDashboard } from './components/AiScoreSuggestionsDashboard';
import { StudentAssessmentDrawer } from './components/StudentAssessmentDrawer';
import { SubmissionEvaluationModal } from './components/SubmissionEvaluationModal';
import { PenTool, Sparkles, CheckCircle2, Check } from 'lucide-react';

export const GradingPage: React.FC = () => {
  const { user } = useAuthStore();
  const isFaculty = user?.activeRole === 'trainer' || user?.activeRole === 'instructor' || user?.activeRole === 'grader';
  const isAdmin = user?.activeRole === 'platform_admin' || user?.activeRole === 'org_admin' || user?.activeRole === 'lms_admin';

  const {
    tasks,
    attempts,
    selectedStudentId,
    setSelectedStudentId,
    activeSubmissionModalAttempt,
    openSubmissionModal,
    closeSubmissionModal,
    acceptAiScore,
  } = useGradingStore();

  const [activeTab, setActiveTab] = useState<'queue' | 'ai_review'>('queue');
  const [notice, setNotice] = useState<string | null>(null);

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
      return ['crs-001', 'crs-002', 'crs-004'];
    }
    return undefined;
  }, [isFaculty, user]);

  // Scoped tasks for faculty
  const scopedTasks = useMemo(() => {
    if (isFaculty && authorizedCourseIds) {
      return tasks.filter((t) => (t.courseId ? authorizedCourseIds.includes(t.courseId) : true));
    }
    return tasks;
  }, [tasks, isFaculty, authorizedCourseIds]);

  const handleOpenAttemptModalFromTask = (task: GradingTask) => {
    // Find matching attempt or synthesize one
    const matchingAttempt = attempts.find((a) => a.id === task.attemptId);
    if (matchingAttempt) {
      openSubmissionModal(matchingAttempt);
    } else {
      // Fallback synthesis
      openSubmissionModal({
        id: task.attemptId || `att-${task.id}`,
        assessmentId: task.assessmentId,
        assessmentTitle: task.assessmentTitle,
        courseId: task.courseId,
        courseTitle: task.courseTitle,
        assessmentType: task.assessmentType || 'capstone',
        attemptNumber: task.attemptNumber || 1,
        learnerId: task.learnerId,
        learnerName: task.learnerName,
        learnerRollNo: task.learnerRollNo || 'STU-ID',
        learnerEmail: task.learnerEmail || 'student@lms.demo',
        status: task.status === 'completed' ? 'results_released' : 'submitted',
        evaluationStatus: task.evaluationStatus || 'ai_review_required',
        score: task.score || task.aiPreliminaryScore,
        totalMarks: task.totalMarks || 100,
        percentage: Math.round(((task.score || task.aiPreliminaryScore || 0) / (task.totalMarks || 100)) * 100),
        feedback: task.feedback,
        aiSuggestion: task.aiSuggestion,
        submittedAt: task.submittedAt || task.createdAt,
        answers: [],
      });
    }
  };

  const handleQuickAcceptAi = (task: GradingTask) => {
    if (task.attemptId) {
      acceptAiScore(task.attemptId, 'Verified and approved AI suggested score');
      showNotice(`AI suggested score for ${task.learnerName} accepted and released!`);
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
                {user?.displayName || 'Dr. James Wilson'}
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

      {/* Tabs Navigation (AI Evaluation Queue and AI Score Suggestions) */}
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
      </div>

      {/* Tab 1: AI Evaluation Queue */}
      {activeTab === 'queue' && (
        <div className="card" style={{ margin: 0, padding: 0 }}>
          <div className="table-container">
            <table className="table" style={{ fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Assessment & Course</th>
                  <th>Submitted Date</th>
                  <th>AI Evaluation & Score</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {scopedTasks.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{t.learnerName}</div>
                      <div className="text-muted text-xs">ID: {t.learnerRollNo || t.submissionId || 'STU-ID'}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{t.assessmentTitle}</div>
                      <div className="text-muted text-xs">{t.courseTitle || 'Enrolled Course'}</div>
                    </td>
                    <td>{t.submittedAt ? new Date(t.submittedAt).toLocaleDateString() : 'Recent'}</td>
                    <td>
                      {t.aiPreliminaryScore !== undefined || t.aiSuggestion ? (
                        <span className="badge badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Sparkles size={12} /> {t.aiPreliminaryScore || t.aiSuggestion?.score} / {t.maxScore || t.totalMarks}{' '}
                          <span className="text-muted text-xs">
                            ({Math.round((t.aiSuggestion?.confidence || 0.92) * 100)}% Conf.)
                          </span>
                        </span>
                      ) : (t.evaluationStatus as string) === 'unsupported_type' || (t.assessmentType as string) === 'unsupported_type' ? (
                        <span className="badge badge-secondary text-xs" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          Unsupported response type
                        </span>
                      ) : (
                        <span className="badge badge-warning text-xs" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          AI review required
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${t.status === 'completed' ? 'badge-completed' : 'badge-draft'} text-xs`}>
                        {t.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        {t.aiPreliminaryScore && t.status !== 'completed' && (
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '4px 8px', fontSize: '0.75rem', gap: '4px' }}
                            onClick={() => handleQuickAcceptAi(t)}
                            title="Quickly approve AI score recommendation"
                          >
                            <Check size={12} /> Approve AI Score
                          </button>
                        )}
                        <button
                          className="btn btn-primary btn-sm"
                          style={{ padding: '4px 10px', fontSize: '0.75rem', gap: '4px' }}
                          onClick={() => handleOpenAttemptModalFromTask(t)}
                        >
                          <Sparkles size={12} />
                          {t.status === 'completed' ? 'Review & Edit Grade' : 'Review AI Evaluation'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
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
