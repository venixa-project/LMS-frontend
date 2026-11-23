import React, { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '../../../lib/store';
import { useGradingStore, ReleaseQueueItem } from '../../../lib/gradingStore';
import {
  Send,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Search,
  Filter,
  RefreshCw,
  Award,
  UserCheck,
  ShieldAlert,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

interface ReleaseResultsDashboardProps {
  onOpenSubmissionModal: (attemptId: string) => void;
  authorizedCourseIds?: string[];
  isFaculty?: boolean;
}

export const ReleaseResultsDashboard: React.FC<ReleaseResultsDashboardProps> = ({
  onOpenSubmissionModal,
  authorizedCourseIds,
  isFaculty,
}) => {
  const { user } = useAuthStore();
  const isAdmin = user?.activeRole === 'platform_admin' || user?.activeRole === 'org_admin' || user?.activeRole === 'lms_admin';

  const {
    releaseQueue,
    isLoadingReleaseQueue,
    fetchReleaseQueue,
    releaseSingleResult,
    releaseAssessmentResults,
  } = useGradingStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'awaiting_release' | 'published'>('all');
  const [isReleasingId, setIsReleasingId] = useState<string | null>(null);
  const [isBatchReleasing, setIsBatchReleasing] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [batchConfirmAssessmentId, setBatchConfirmAssessmentId] = useState<string | null>(null);

  const showNotice = (msg: string) => {
    setActionNotice(msg);
    setActionError(null);
    setTimeout(() => setActionNotice(null), 4500);
  };

  const showError = (msg: string) => {
    setActionError(msg);
    setActionNotice(null);
    setTimeout(() => setActionError(null), 5500);
  };

  useEffect(() => {
    fetchReleaseQueue();
  }, []);

  // Filter distinct assessments for the dropdown
  const assessmentsList = useMemo(() => {
    const map = new Map<string, { id: string; title: string; count: number; unreleasedCount: number; createdBy?: string }>();
    for (const item of releaseQueue) {
      const a = item.assessment;
      if (!map.has(a.id)) {
        map.set(a.id, { id: a.id, title: a.title, count: 0, unreleasedCount: 0, createdBy: a.createdBy });
      }
      const entry = map.get(a.id)!;
      entry.count += 1;
      const isUnreleased = item.status !== 'results_released' && item.evaluationStatus !== 'published';
      if (isUnreleased) {
        entry.unreleasedCount += 1;
      }
    }
    return Array.from(map.values());
  }, [releaseQueue]);

  // Filtered queue items
  const filteredQueue = useMemo(() => {
    return releaseQueue.filter((item) => {
      // 1. Assessment filter
      if (selectedAssessmentId !== 'all' && item.assessment.id !== selectedAssessmentId) {
        return false;
      }

      // 2. Status filter
      const isPublished = item.status === 'results_released' || item.evaluationStatus === 'published';
      if (selectedStatus === 'awaiting_release' && isPublished) return false;
      if (selectedStatus === 'published' && !isPublished) return false;

      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const studentMatch =
          item.learner.displayName?.toLowerCase().includes(q) ||
          item.learner.email?.toLowerCase().includes(q) ||
          item.learner.rollNo?.toLowerCase().includes(q);
        const assessmentMatch = item.assessment.title?.toLowerCase().includes(q);
        if (!studentMatch && !assessmentMatch) return false;
      }

      // 4. Faculty scope
      if (isFaculty && authorizedCourseIds && authorizedCourseIds.length > 0 && item.assessment.courseId) {
        if (!authorizedCourseIds.includes(item.assessment.courseId)) return false;
      }

      return true;
    });
  }, [releaseQueue, selectedAssessmentId, selectedStatus, searchQuery, isFaculty, authorizedCourseIds]);

  // Quick statistics
  const stats = useMemo(() => {
    const total = releaseQueue.length;
    const awaiting = releaseQueue.filter((i) => i.status !== 'results_released' && i.evaluationStatus !== 'published').length;
    const published = total - awaiting;
    const scoredItems = releaseQueue.filter((i) => i.score !== null);
    const avgScore =
      scoredItems.length > 0
        ? Math.round(scoredItems.reduce((acc, c) => acc + (c.percentage || 0), 0) / scoredItems.length)
        : 0;
    return { total, awaiting, published, avgScore };
  }, [releaseQueue]);

  // Check if current user can release a specific item
  const canReleaseItem = (item: ReleaseQueueItem) => {
    if (isAdmin) return true;
    if (!item.assessment.createdBy) return true;
    return item.assessment.createdBy === user?.id;
  };

  // Selected assessment's unreleased count for batch button
  const currentAssessmentBatchCount = useMemo(() => {
    if (selectedAssessmentId === 'all') {
      return stats.awaiting;
    }
    const found = assessmentsList.find((a) => a.id === selectedAssessmentId);
    return found ? found.unreleasedCount : 0;
  }, [selectedAssessmentId, assessmentsList, stats.awaiting]);

  const handleReleaseSingle = async (item: ReleaseQueueItem) => {
    setIsReleasingId(item.id);
    try {
      const res = await releaseSingleResult(item.id);
      showNotice(res.message || `Score released to ${item.learner.displayName}! Student received an in-app notification.`);
    } catch (err: any) {
      showError(err?.response?.data?.message || err?.message || 'Failed to release score');
    } finally {
      setIsReleasingId(null);
    }
  };

  const handleBatchRelease = async (assessmentId: string) => {
    setIsBatchReleasing(true);
    setBatchConfirmAssessmentId(null);
    try {
      const res = await releaseAssessmentResults(assessmentId);
      showNotice(res.message || `Results released to ${res.releasedCount} candidates! Notifications dispatched.`);
    } catch (err: any) {
      showError(err?.response?.data?.message || err?.message || 'Batch score release failed');
    } finally {
      setIsBatchReleasing(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Notifications / Alerts */}
      {actionNotice && (
        <div
          style={{
            background: 'var(--success-bg)',
            border: '1px solid var(--success-border)',
            color: 'var(--success)',
            padding: '12px 18px',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.88rem',
            fontWeight: 500,
          }}
        >
          <CheckCircle2 size={18} />
          <span>{actionNotice}</span>
        </div>
      )}

      {actionError && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#ef4444',
            padding: '12px 18px',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.88rem',
          }}
        >
          <AlertCircle size={18} />
          <span>{actionError}</span>
        </div>
      )}

      {/* KPI Metric Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '16px',
        }}
      >
        <div className="card" style={{ padding: '18px 20px', margin: 0 }}>
          <div className="text-secondary text-xs" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Total Assessed
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '4px', color: 'var(--text-main)' }}>
            {stats.total}
          </div>
          <div className="text-muted text-xs" style={{ marginTop: '4px' }}>
            Submissions evaluated by AI/Human
          </div>
        </div>

        <div className="card" style={{ padding: '18px 20px', margin: 0, borderLeft: '4px solid #f59e0b' }}>
          <div className="text-secondary text-xs" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Awaiting Release
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '4px', color: '#f59e0b' }}>
            {stats.awaiting}
          </div>
          <div className="text-muted text-xs" style={{ marginTop: '4px' }}>
            Scores withheld pending instructor release
          </div>
        </div>

        <div className="card" style={{ padding: '18px 20px', margin: 0, borderLeft: '4px solid #10b981' }}>
          <div className="text-secondary text-xs" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Published to Students
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '4px', color: '#10b981' }}>
            {stats.published}
          </div>
          <div className="text-muted text-xs" style={{ marginTop: '4px' }}>
            Released & student notified
          </div>
        </div>

        <div className="card" style={{ padding: '18px 20px', margin: 0, borderLeft: '4px solid #6366f1' }}>
          <div className="text-secondary text-xs" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Cohort Average Score
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '4px', color: '#6366f1' }}>
            {stats.avgScore}%
          </div>
          <div className="text-muted text-xs" style={{ marginTop: '4px' }}>
            Across all verified submissions
          </div>
        </div>
      </div>

      {/* Control Bar: Filters & Batch Release */}
      <div
        className="card"
        style={{
          padding: '16px 20px',
          margin: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', flex: 1 }}>
          {/* Search */}
          <div style={{ position: 'relative', minWidth: '240px', flex: 1, maxWidth: '320px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search student, roll no, assessment..."
              className="form-control form-control-sm"
              style={{ paddingLeft: '32px', fontSize: '0.82rem' }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Assessment Filter */}
          <select
            className="form-control form-control-sm"
            style={{ width: 'auto', minWidth: '180px', fontSize: '0.82rem' }}
            value={selectedAssessmentId}
            onChange={(e) => setSelectedAssessmentId(e.target.value)}
          >
            <option value="all">All Assessments ({assessmentsList.length})</option>
            {assessmentsList.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title} ({a.unreleasedCount} unreleased)
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            className="form-control form-control-sm"
            style={{ width: 'auto', minWidth: '160px', fontSize: '0.82rem' }}
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as any)}
          >
            <option value="all">All Release States</option>
            <option value="awaiting_release">Awaiting Release Only ({stats.awaiting})</option>
            <option value="published">Published Only ({stats.published})</option>
          </select>

          <button
            onClick={() => fetchReleaseQueue()}
            disabled={isLoadingReleaseQueue}
            className="btn btn-secondary btn-sm"
            title="Reload release records"
            style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}
          >
            <RefreshCw size={13} className={isLoadingReleaseQueue ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Batch Release Action Button */}
        {selectedAssessmentId !== 'all' && currentAssessmentBatchCount > 0 && (
          <div>
            <button
              onClick={() => setBatchConfirmAssessmentId(selectedAssessmentId)}
              disabled={isBatchReleasing}
              className="btn btn-primary btn-sm"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: 700,
                fontSize: '0.82rem',
                padding: '6px 14px',
                boxShadow: '0 2px 8px rgba(99, 102, 241, 0.25)',
              }}
            >
              <Send size={13} />
              Release All {currentAssessmentBatchCount} Results & Notify Students
            </button>
          </div>
        )}
      </div>

      {/* Confirmation Modal for Batch Release */}
      {batchConfirmAssessmentId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(3px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: '480px',
              width: '100%',
              padding: '24px',
              borderRadius: 'var(--radius-lg)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: 'rgba(99, 102, 241, 0.12)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Send size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Confirm Score Publication</h3>
                <p className="text-secondary text-xs" style={{ margin: 0 }}>
                  Academic grade release & candidate notification
                </p>
              </div>
            </div>

            <p style={{ fontSize: '0.86rem', color: 'var(--text-main)', lineHeight: 1.5, marginBottom: '20px' }}>
              You are about to release verified examination results for{' '}
              <strong>{assessmentsList.find((a) => a.id === batchConfirmAssessmentId)?.title}</strong> to{' '}
              <strong>{currentAssessmentBatchCount} candidates</strong>.
              <br />
              <br />
              <span className="text-secondary text-xs">
                Students will immediately receive in-app notifications and will be able to view their final scores, percentage, pass/fail status, and instructor feedback.
              </span>
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setBatchConfirmAssessmentId(null)}
                disabled={isBatchReleasing}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => handleBatchRelease(batchConfirmAssessmentId)}
                disabled={isBatchReleasing}
                style={{ fontWeight: 700 }}
              >
                {isBatchReleasing ? 'Releasing & Notifying...' : 'Confirm & Release Results'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Submissions Release Table */}
      <div className="card" style={{ margin: 0, padding: 0 }}>
        <div className="table-container">
          <table className="table" style={{ fontSize: '0.84rem' }}>
            <thead>
              <tr>
                <th>Student</th>
                <th>Assessment & Course</th>
                <th>Submitted Date</th>
                <th>Verified Score</th>
                <th>AI & Evaluator Context</th>
                <th>Release Status</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoadingReleaseQueue && filteredQueue.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '36px' }}>
                    <RefreshCw size={24} className="animate-spin text-primary" style={{ margin: '0 auto 8px' }} />
                    <div className="text-muted text-xs">Loading release records from PostgreSQL database...</div>
                  </td>
                </tr>
              ) : filteredQueue.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '48px 24px' }}>
                    <div
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        background: 'rgba(16, 185, 129, 0.1)',
                        color: '#10b981',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 12px',
                      }}
                    >
                      <CheckCircle2 size={24} />
                    </div>
                    <h4 style={{ fontSize: '1rem', marginBottom: '4px', fontWeight: 600 }}>No Submissions Found</h4>
                    <p className="text-secondary text-xs" style={{ maxWidth: '360px', margin: '0 auto', lineHeight: 1.5 }}>
                      No evaluation records match your filter criteria. All completed assessments may have already been released to students.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredQueue.map((item) => {
                  const isPublished = item.status === 'results_released' || item.evaluationStatus === 'published';
                  const isReleasing = isReleasingId === item.id;
                  const canRelease = canReleaseItem(item);
                  const effectiveScore = item.score !== null ? Number(item.score) : (item.gradingTasks?.[0]?.score !== null && item.gradingTasks?.[0]?.score !== undefined ? Number(item.gradingTasks[0].score) : null);
                  const effectivePct = item.percentage !== null ? Number(item.percentage) : (effectiveScore !== null && item.totalMarks > 0 ? Math.round((effectiveScore / item.totalMarks) * 100) : null);
                  const isPass = item.passed ?? (effectivePct !== null ? effectivePct >= 60 : false);

                  return (
                    <tr key={item.id}>
                      {/* Student Info */}
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{item.learner.displayName}</div>
                        <div className="text-muted text-xs">ID: {item.learner.rollNo || `STU-${item.learner.id.slice(-4)}`}</div>
                        {item.learner.email && <div className="text-muted text-xs">{item.learner.email}</div>}
                      </td>

                      {/* Assessment Info */}
                      <td>
                        <div style={{ fontWeight: 600 }}>{item.assessment.title}</div>
                        <div className="text-muted text-xs">{item.assessment.course?.title || 'Enrolled Course'}</div>
                        {item.assessment.createdBy === user?.id && (
                          <span className="badge badge-info text-xs" style={{ fontSize: '0.68rem', padding: '1px 6px', marginTop: '2px' }}>
                            Created by You
                          </span>
                        )}
                      </td>

                      {/* Submitted Date */}
                      <td>
                        {item.submittedAt ? new Date(item.submittedAt).toLocaleDateString() : 'Recent'}
                        <div className="text-muted text-xs">
                          {item.submittedAt ? new Date(item.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </div>
                      </td>

                      {/* Verified Score */}
                      <td>
                        {effectiveScore !== null ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <div style={{ fontWeight: 700, fontSize: '0.92rem', color: isPass ? '#10b981' : '#ef4444' }}>
                              {effectiveScore} / {item.totalMarks}{' '}
                              <span style={{ fontSize: '0.78rem', opacity: 0.85 }}>({effectivePct}%)</span>
                            </div>
                            <span className={`badge ${isPass ? 'badge-passed' : 'badge-failed'} text-xs`} style={{ width: 'fit-content', padding: '1px 7px', fontSize: '0.7rem' }}>
                              {isPass ? 'Pass' : 'Retake Required'}
                            </span>
                          </div>
                        ) : (
                          <span className="badge badge-warning text-xs">Pending Score Entry</span>
                        )}
                      </td>

                      {/* AI & Evaluator Context */}
                      <td>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-main)' }}>
                          {item.evaluatedBy ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <UserCheck size={12} color="#10b981" /> {item.evaluatedBy}
                            </span>
                          ) : (
                            <span className="text-muted">Awaiting Evaluator Sign-off</span>
                          )}
                        </div>
                        {item.aiSuggestion && (
                          <div className="text-muted text-xs" style={{ display: 'flex', alignItems: 'center', gap: '3px', marginTop: '3px' }}>
                            <Sparkles size={11} color="#6366f1" /> AI: {item.aiSuggestion.score} ({Math.round(Number(item.aiSuggestion.confidence || 0.9) * 100)}%)
                          </div>
                        )}
                      </td>

                      {/* Release Status */}
                      <td>
                        {isPublished ? (
                          <div>
                            <span className="badge badge-completed text-xs" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px' }}>
                              <CheckCircle2 size={12} /> Published to Student
                            </span>
                            {item.evaluatedAt && (
                              <div className="text-muted text-xs" style={{ marginTop: '3px' }}>
                                Released on {new Date(item.evaluatedAt).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="badge badge-warning text-xs" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px' }}>
                            <Clock size={12} /> Awaiting Release
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                            onClick={() => onOpenSubmissionModal(item.id)}
                            title="Inspect detailed answers, rubric scores and AI rationale"
                          >
                            Inspect
                          </button>

                          {!isPublished ? (
                            <button
                              className="btn btn-primary btn-sm"
                              style={{
                                padding: '4px 10px',
                                fontSize: '0.75rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontWeight: 700,
                              }}
                              disabled={isReleasing || !canRelease}
                              onClick={() => handleReleaseSingle(item)}
                              title={
                                !canRelease
                                  ? 'Only the creator trainer or an institution administrator can release this result'
                                  : 'Release score and send real-time notification to student'
                              }
                            >
                              <Send size={12} className={isReleasing ? 'animate-spin' : ''} />
                              {isReleasing ? 'Releasing...' : 'Release Score'}
                            </button>
                          ) : (
                            <span className="text-muted text-xs" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '0 4px' }}>
                              <CheckCircle2 size={14} color="#10b981" /> Student Notified
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
