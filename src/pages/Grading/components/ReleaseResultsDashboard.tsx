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
  Eye,
  StopCircle,
  PlayCircle,
  X,
  Users,
  Check,
  FileText,
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
    toggleScoreHold,
  } = useGradingStore();

  const [viewMode, setViewMode] = useState<'assessments' | 'students'>('assessments');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'awaiting_release' | 'published' | 'withheld'>('all');
  const [isReleasingId, setIsReleasingId] = useState<string | null>(null);
  const [isTogglingHoldId, setIsTogglingHoldId] = useState<string | null>(null);
  const [isBatchReleasing, setIsBatchReleasing] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [batchConfirmAssessmentId, setBatchConfirmAssessmentId] = useState<string | null>(null);

  // Modal for Viewing Candidates of an Assessment
  const [viewModalAssessmentId, setViewModalAssessmentId] = useState<string | null>(null);
  const [modalSearch, setModalSearch] = useState('');
  const [modalFilter, setModalFilter] = useState<'all' | 'ready' | 'stopped' | 'published'>('all');

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

  // Grouped Assessments for total assessment results publishing
  const groupedAssessments = useMemo(() => {
    const map = new Map<
      string,
      {
        assessment: ReleaseQueueItem['assessment'];
        attempts: ReleaseQueueItem[];
        totalCount: number;
        awaitingCount: number;
        publishedCount: number;
        withheldCount: number;
        avgScore: number;
        passRate: number;
      }
    >();

    for (const item of releaseQueue) {
      if (isFaculty && authorizedCourseIds && authorizedCourseIds.length > 0 && item.assessment.courseId) {
        if (!authorizedCourseIds.includes(item.assessment.courseId)) continue;
      }

      const aId = item.assessment.id;
      if (!map.has(aId)) {
        map.set(aId, {
          assessment: item.assessment,
          attempts: [],
          totalCount: 0,
          awaitingCount: 0,
          publishedCount: 0,
          withheldCount: 0,
          avgScore: 0,
          passRate: 0,
        });
      }
      const group = map.get(aId)!;
      group.attempts.push(item);
      group.totalCount += 1;

      const isPublished = item.status === 'results_released' || item.evaluationStatus === 'published';
      const isWithheld = item.evaluationStatus === 'withheld' || item.submissionReason === 'SCORE_WITHHELD';

      if (isPublished) {
        group.publishedCount += 1;
      } else if (isWithheld) {
        group.withheldCount += 1;
      } else {
        group.awaitingCount += 1;
      }
    }

    // Calculate avgScore and passRate per assessment
    map.forEach((group) => {
      const scored = group.attempts.filter((i) => i.score !== null);
      if (scored.length > 0) {
        const totalPct = scored.reduce((acc, c) => acc + Number(c.percentage || 0), 0);
        group.avgScore = Math.round(totalPct / scored.length);
        const passed = scored.filter((i) => i.passed ?? (Number(i.percentage || 0) >= 60));
        group.passRate = Math.round((passed.length / scored.length) * 100);
      }
    });

    let list = Array.from(map.values());

    // Search filter for grouped view
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (g) =>
          g.assessment.title?.toLowerCase().includes(q) ||
          g.assessment.course?.title?.toLowerCase().includes(q)
      );
    }

    // Status filter for grouped view
    if (selectedStatus === 'awaiting_release') {
      list = list.filter((g) => g.awaitingCount > 0);
    } else if (selectedStatus === 'published') {
      list = list.filter((g) => g.awaitingCount === 0 && g.publishedCount > 0);
    } else if (selectedStatus === 'withheld') {
      list = list.filter((g) => g.withheldCount > 0);
    }

    return list;
  }, [releaseQueue, isFaculty, authorizedCourseIds, searchQuery, selectedStatus]);

  // Filtered queue items for all candidates view
  const filteredQueue = useMemo(() => {
    return releaseQueue.filter((item) => {
      // 1. Assessment filter
      if (selectedAssessmentId !== 'all' && item.assessment.id !== selectedAssessmentId) {
        return false;
      }

      // 2. Status filter
      const isPublished = item.status === 'results_released' || item.evaluationStatus === 'published';
      const isWithheld = item.evaluationStatus === 'withheld' || item.submissionReason === 'SCORE_WITHHELD';
      if (selectedStatus === 'awaiting_release' && (isPublished || isWithheld)) return false;
      if (selectedStatus === 'published' && !isPublished) return false;
      if (selectedStatus === 'withheld' && !isWithheld) return false;

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

  // Quick statistics with fixed Decimal-to-Number average calculation
  const stats = useMemo(() => {
    const total = releaseQueue.length;
    const published = releaseQueue.filter(
      (i) => i.status === 'results_released' || i.evaluationStatus === 'published'
    ).length;
    const withheld = releaseQueue.filter(
      (i) => i.evaluationStatus === 'withheld' || i.submissionReason === 'SCORE_WITHHELD'
    ).length;
    const awaiting = total - published - withheld;
    const scoredItems = releaseQueue.filter((i) => i.score !== null);
    const avgScore =
      scoredItems.length > 0
        ? Math.round(scoredItems.reduce((acc, c) => acc + Number(c.percentage || 0), 0) / scoredItems.length)
        : 0;
    return { total, awaiting, published, withheld, avgScore };
  }, [releaseQueue]);

  // Check if current user can release a specific item or assessment
  const canReleaseAssessment = (assessmentCreatedBy?: string) => {
    if (isAdmin) return true;
    if (!assessmentCreatedBy) return true;
    return assessmentCreatedBy === user?.id;
  };

  const handleToggleHold = async (item: ReleaseQueueItem, hold: boolean) => {
    setIsTogglingHoldId(item.id);
    try {
      const res = await toggleScoreHold(
        item.id,
        hold,
        hold ? 'Withheld by instructor review' : undefined
      );
      showNotice(res.message);
    } catch (err: any) {
      showError(err?.response?.data?.message || err?.message || 'Failed to update score hold status');
    } finally {
      setIsTogglingHoldId(null);
    }
  };

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
      showNotice(
        res.message ||
          `Results released to ${res.releasedCount} candidates!${
            res.withheldCount ? ` (${res.withheldCount} scores withheld)` : ''
          } Notifications dispatched.`
      );
    } catch (err: any) {
      showError(err?.response?.data?.message || err?.message || 'Batch score release failed');
    } finally {
      setIsBatchReleasing(false);
    }
  };

  // Currently inspected assessment in modal
  const activeModalGroup = useMemo(() => {
    if (!viewModalAssessmentId) return null;
    return groupedAssessments.find((g) => g.assessment.id === viewModalAssessmentId) || null;
  }, [viewModalAssessmentId, groupedAssessments]);

  // Candidates in modal with filtering
  const modalCandidates = useMemo(() => {
    if (!activeModalGroup) return [];
    return activeModalGroup.attempts.filter((item) => {
      const isPublished = item.status === 'results_released' || item.evaluationStatus === 'published';
      const isWithheld = item.evaluationStatus === 'withheld' || item.submissionReason === 'SCORE_WITHHELD';

      if (modalFilter === 'ready' && (isPublished || isWithheld)) return false;
      if (modalFilter === 'stopped' && !isWithheld) return false;
      if (modalFilter === 'published' && !isPublished) return false;

      if (modalSearch.trim()) {
        const q = modalSearch.toLowerCase();
        const match =
          item.learner.displayName?.toLowerCase().includes(q) ||
          item.learner.email?.toLowerCase().includes(q) ||
          item.learner.rollNo?.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [activeModalGroup, modalSearch, modalFilter]);

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
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
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
            Scores ready pending batch publish
          </div>
        </div>

        <div className="card" style={{ padding: '18px 20px', margin: 0, borderLeft: '4px solid #ef4444' }}>
          <div className="text-secondary text-xs" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Scores Stopped
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '4px', color: '#ef4444' }}>
            {stats.withheld}
          </div>
          <div className="text-muted text-xs" style={{ marginTop: '4px' }}>
            Withheld from release by instructor
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

      {/* Control Bar: View Toggle, Filters & Search */}
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
          {/* View Mode Toggle */}
          <div
            style={{
              display: 'inline-flex',
              background: 'var(--bg-subtle, rgba(255,255,255,0.06))',
              borderRadius: 'var(--radius-md)',
              padding: '3px',
              border: '1px solid var(--border-color)',
            }}
          >
            <button
              onClick={() => setViewMode('assessments')}
              className={`btn btn-sm ${viewMode === 'assessments' ? 'btn-primary' : 'btn-ghost'}`}
              style={{
                fontSize: '0.78rem',
                padding: '5px 12px',
                borderRadius: 'var(--radius-sm)',
                fontWeight: viewMode === 'assessments' ? 700 : 500,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <FileText size={14} />
              Assessments to Publish ({groupedAssessments.length})
            </button>
            <button
              onClick={() => setViewMode('students')}
              className={`btn btn-sm ${viewMode === 'students' ? 'btn-primary' : 'btn-ghost'}`}
              style={{
                fontSize: '0.78rem',
                padding: '5px 12px',
                borderRadius: 'var(--radius-sm)',
                fontWeight: viewMode === 'students' ? 700 : 500,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Users size={14} />
              All Submissions ({releaseQueue.length})
            </button>
          </div>

          {/* Search */}
          <div style={{ position: 'relative', minWidth: '220px', flex: 1, maxWidth: '300px' }}>
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
              placeholder={
                viewMode === 'assessments'
                  ? 'Search assessment or course...'
                  : 'Search student, roll no, assessment...'
              }
              className="form-control form-control-sm"
              style={{ paddingLeft: '32px', fontSize: '0.82rem' }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Status Filter */}
          <select
            className="form-control form-control-sm"
            style={{ width: 'auto', minWidth: '160px', fontSize: '0.82rem' }}
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as any)}
          >
            <option value="all">All Release States</option>
            <option value="awaiting_release">Awaiting Release ({stats.awaiting})</option>
            <option value="withheld">Scores Stopped ({stats.withheld})</option>
            <option value="published">Published ({stats.published})</option>
          </select>

          {viewMode === 'students' && (
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
          )}

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
      </div>

      {/* ASSESSMENT GROUPED VIEW (PRIMARY: Publish Total Assessment Result) */}
      {viewMode === 'assessments' && (
        <div className="card" style={{ margin: 0, padding: 0 }}>
          <div className="table-container">
            <table className="table" style={{ fontSize: '0.84rem' }}>
              <thead>
                <tr>
                  <th>Assessment & Course</th>
                  <th>Total Candidates</th>
                  <th>Publication Status</th>
                  <th>Cohort Average</th>
                  <th>Pass Rate</th>
                  <th style={{ textAlign: 'right', minWidth: '220px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingReleaseQueue && groupedAssessments.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '36px' }}>
                      <RefreshCw size={24} className="animate-spin text-primary" style={{ margin: '0 auto 8px' }} />
                      <div className="text-muted text-xs">Loading assessment results from database...</div>
                    </td>
                  </tr>
                ) : groupedAssessments.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '48px 24px' }}>
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
                      <h4 style={{ fontSize: '1rem', marginBottom: '4px', fontWeight: 600 }}>No Assessments Found</h4>
                      <p className="text-secondary text-xs" style={{ maxWidth: '360px', margin: '0 auto', lineHeight: 1.5 }}>
                        No assessments currently match your criteria or are waiting for release.
                      </p>
                    </td>
                  </tr>
                ) : (
                  groupedAssessments.map((group) => {
                    const isAllPublished = group.awaitingCount === 0 && group.withheldCount === 0 && group.publishedCount > 0;
                    const canPublish = canReleaseAssessment(group.assessment.createdBy) && group.awaitingCount > 0;

                    return (
                      <tr key={group.assessment.id}>
                        {/* Assessment Info */}
                        <td>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                            {group.assessment.title}
                          </div>
                          <div className="text-muted text-xs">
                            {group.assessment.course?.title || 'Enrolled Course'}
                          </div>
                          {group.assessment.createdBy === user?.id && (
                            <span
                              className="badge badge-info text-xs"
                              style={{ fontSize: '0.68rem', padding: '1px 6px', marginTop: '2px' }}
                            >
                              Created by You
                            </span>
                          )}
                        </td>

                        {/* Total Candidates & Breakdown */}
                        <td>
                          <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>
                            {group.totalCount} {group.totalCount === 1 ? 'Student' : 'Students'}
                          </div>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              marginTop: '4px',
                              fontSize: '0.72rem',
                            }}
                          >
                            {group.awaitingCount > 0 && (
                              <span style={{ color: '#f59e0b', fontWeight: 600 }}>
                                {group.awaitingCount} Awaiting
                              </span>
                            )}
                            {group.withheldCount > 0 && (
                              <span style={{ color: '#ef4444', fontWeight: 600 }}>
                                • {group.withheldCount} Stopped
                              </span>
                            )}
                            {group.publishedCount > 0 && (
                              <span style={{ color: '#10b981', fontWeight: 600 }}>
                                • {group.publishedCount} Published
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Publication Status Badge */}
                        <td>
                          {isAllPublished ? (
                            <span
                              className="badge badge-completed text-xs"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px' }}
                            >
                              <CheckCircle2 size={12} /> All Published
                            </span>
                          ) : group.awaitingCount > 0 ? (
                            <span
                              className="badge badge-warning text-xs"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px' }}
                            >
                              <Clock size={12} /> {group.awaitingCount} Ready to Publish
                            </span>
                          ) : group.withheldCount > 0 ? (
                            <span
                              className="badge badge-failed text-xs"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px' }}
                            >
                              <StopCircle size={12} /> All Remaining Stopped
                            </span>
                          ) : (
                            <span className="badge badge-neutral text-xs">No Submissions</span>
                          )}
                        </td>

                        {/* Cohort Average */}
                        <td>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#6366f1' }}>
                            {group.avgScore}%
                          </div>
                          <div className="text-muted text-xs">Based on {group.attempts.length} attempts</div>
                        </td>

                        {/* Pass Rate */}
                        <td>
                          <div
                            style={{
                              fontWeight: 700,
                              fontSize: '0.9rem',
                              color: group.passRate >= 60 ? '#10b981' : '#ef4444',
                            }}
                          >
                            {group.passRate}%
                          </div>
                          <div className="text-muted text-xs">Passing score &ge; 60%</div>
                        </td>

                        {/* Actions: View Students & Publish Results */}
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                            {/* VIEW BUTTON */}
                            <button
                              className="btn btn-secondary btn-sm"
                              style={{
                                padding: '5px 12px',
                                fontSize: '0.78rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                fontWeight: 600,
                              }}
                              onClick={() => {
                                setViewModalAssessmentId(group.assessment.id);
                                setModalSearch('');
                                setModalFilter('all');
                              }}
                              title="View students and their scores, stop specific scores from release"
                            >
                              <Eye size={13} />
                              View Students ({group.totalCount})
                            </button>

                            {/* PUBLISH BUTTON */}
                            {group.awaitingCount > 0 ? (
                              <button
                                className="btn btn-primary btn-sm"
                                style={{
                                  padding: '5px 14px',
                                  fontSize: '0.78rem',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  fontWeight: 700,
                                  boxShadow: '0 2px 6px rgba(99, 102, 241, 0.25)',
                                }}
                                disabled={!canPublish || isBatchReleasing}
                                onClick={() => setBatchConfirmAssessmentId(group.assessment.id)}
                                title={
                                  !canPublish
                                    ? 'Only the creator trainer or institution administrator can publish results'
                                    : `Publish results for ${group.awaitingCount} students (excluding stopped scores)`
                                }
                              >
                                <Send size={13} />
                                Publish Results
                              </button>
                            ) : isAllPublished ? (
                              <span
                                className="text-muted text-xs"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '0 6px' }}
                              >
                                <CheckCircle2 size={14} color="#10b981" /> Published
                              </span>
                            ) : null}
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
      )}

      {/* CANDIDATES TABLE VIEW (FLAT VIEW) */}
      {viewMode === 'students' && (
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
                        No evaluation records match your filter criteria.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredQueue.map((item) => {
                    const isPublished = item.status === 'results_released' || item.evaluationStatus === 'published';
                    const isWithheld = item.evaluationStatus === 'withheld' || item.submissionReason === 'SCORE_WITHHELD';
                    const isReleasing = isReleasingId === item.id;
                    const isToggling = isTogglingHoldId === item.id;
                    const canRelease = canReleaseAssessment(item.assessment.createdBy);
                    const effectiveScore =
                      item.score !== null
                        ? Number(item.score)
                        : item.gradingTasks?.[0]?.score !== null && item.gradingTasks?.[0]?.score !== undefined
                        ? Number(item.gradingTasks[0].score)
                        : null;
                    const effectivePct =
                      item.percentage !== null
                        ? Number(item.percentage)
                        : effectiveScore !== null && item.totalMarks > 0
                        ? Math.round((effectiveScore / item.totalMarks) * 100)
                        : null;
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
                              <span
                                className={`badge ${isPass ? 'badge-passed' : 'badge-failed'} text-xs`}
                                style={{ width: 'fit-content', padding: '1px 7px', fontSize: '0.7rem' }}
                              >
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
                          ) : isWithheld ? (
                            <span
                              className="badge badge-failed text-xs"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px' }}
                            >
                              <StopCircle size={12} /> Score Stopped
                            </span>
                          ) : (
                            <span className="badge badge-warning text-xs" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px' }}>
                              <Clock size={12} /> Ready to Release
                            </span>
                          )}
                        </td>

                        {/* Actions: Stop/Resume, Inspect, Release */}
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

                            {/* STOP / RESUME BUTTON */}
                            {!isPublished && (
                              <button
                                className={`btn btn-sm ${isWithheld ? 'btn-outline-success' : 'btn-outline-danger'}`}
                                style={{
                                  padding: '4px 8px',
                                  fontSize: '0.75rem',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontWeight: 600,
                                }}
                                disabled={isToggling}
                                onClick={() => handleToggleHold(item, !isWithheld)}
                                title={
                                  isWithheld
                                    ? 'Resume score release for this student'
                                    : 'Stop/withhold this student score from being published'
                                }
                              >
                                {isWithheld ? (
                                  <>
                                    <PlayCircle size={12} />
                                    Resume
                                  </>
                                ) : (
                                  <>
                                    <StopCircle size={12} />
                                    Stop
                                  </>
                                )}
                              </button>
                            )}

                            {!isPublished && !isWithheld ? (
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
                                {isReleasing ? 'Releasing...' : 'Release'}
                              </button>
                            ) : null}
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
      )}

      {/* CANDIDATES INSPECTION & MODERATION MODAL (TRIGGERED BY "VIEW STUDENTS") */}
      {viewModalAssessmentId && activeModalGroup && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: '920px',
              width: '100%',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              padding: 0,
              borderRadius: 'var(--radius-lg)',
              boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
              overflow: 'hidden',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'var(--bg-card)',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                    {activeModalGroup.assessment.title}
                  </h3>
                  <span className="badge badge-info text-xs">
                    {activeModalGroup.totalCount} {activeModalGroup.totalCount === 1 ? 'Student' : 'Students'}
                  </span>
                </div>
                <p className="text-secondary text-xs" style={{ margin: '4px 0 0 0' }}>
                  Course: {activeModalGroup.assessment.course?.title || 'Enrolled Course'} • Review scores and stop any individual student score before publishing.
                </p>
              </div>

              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setViewModalAssessmentId(null)}
                style={{ padding: '6px', borderRadius: '50%' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Toolbar: Search & Candidate Filter */}
            <div
              style={{
                padding: '12px 24px',
                background: 'var(--bg-subtle, rgba(255,255,255,0.03))',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '220px' }}>
                <div style={{ position: 'relative', width: '100%', maxWidth: '280px' }}>
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
                    placeholder="Search candidate name or ID..."
                    className="form-control form-control-sm"
                    style={{ paddingLeft: '32px', fontSize: '0.8rem' }}
                    value={modalSearch}
                    onChange={(e) => setModalSearch(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => setModalFilter('all')}
                    className={`btn btn-sm ${modalFilter === 'all' ? 'btn-secondary' : 'btn-ghost'}`}
                    style={{ fontSize: '0.74rem', padding: '3px 8px' }}
                  >
                    All ({activeModalGroup.totalCount})
                  </button>
                  <button
                    onClick={() => setModalFilter('ready')}
                    className={`btn btn-sm ${modalFilter === 'ready' ? 'btn-secondary' : 'btn-ghost'}`}
                    style={{ fontSize: '0.74rem', padding: '3px 8px', color: '#f59e0b' }}
                  >
                    Ready ({activeModalGroup.awaitingCount})
                  </button>
                  <button
                    onClick={() => setModalFilter('stopped')}
                    className={`btn btn-sm ${modalFilter === 'stopped' ? 'btn-secondary' : 'btn-ghost'}`}
                    style={{ fontSize: '0.74rem', padding: '3px 8px', color: '#ef4444' }}
                  >
                    Stopped ({activeModalGroup.withheldCount})
                  </button>
                  <button
                    onClick={() => setModalFilter('published')}
                    className={`btn btn-sm ${modalFilter === 'published' ? 'btn-secondary' : 'btn-ghost'}`}
                    style={{ fontSize: '0.74rem', padding: '3px 8px', color: '#10b981' }}
                  >
                    Published ({activeModalGroup.publishedCount})
                  </button>
                </div>
              </div>

              {/* Status summary pill */}
              <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                Avg Score: <strong style={{ color: '#6366f1' }}>{activeModalGroup.avgScore}%</strong> • Pass Rate:{' '}
                <strong style={{ color: activeModalGroup.passRate >= 60 ? '#10b981' : '#ef4444' }}>
                  {activeModalGroup.passRate}%
                </strong>
              </div>
            </div>

            {/* Modal Body / Candidates List */}
            <div style={{ overflowY: 'auto', flex: 1, padding: 0 }}>
              <table className="table" style={{ fontSize: '0.82rem', margin: 0 }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--bg-card)' }}>
                  <tr>
                    <th>Candidate</th>
                    <th>Submitted</th>
                    <th>Score & Performance</th>
                    <th>Release State</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {modalCandidates.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '36px' }}>
                        <div className="text-muted text-xs">No candidates match your search or filter.</div>
                      </td>
                    </tr>
                  ) : (
                    modalCandidates.map((c) => {
                      const isPublished = c.status === 'results_released' || c.evaluationStatus === 'published';
                      const isWithheld = c.evaluationStatus === 'withheld' || c.submissionReason === 'SCORE_WITHHELD';
                      const isToggling = isTogglingHoldId === c.id;
                      const scoreVal =
                        c.score !== null
                          ? Number(c.score)
                          : c.gradingTasks?.[0]?.score !== null && c.gradingTasks?.[0]?.score !== undefined
                          ? Number(c.gradingTasks[0].score)
                          : null;
                      const pctVal =
                        c.percentage !== null
                          ? Number(c.percentage)
                          : scoreVal !== null && c.totalMarks > 0
                          ? Math.round((scoreVal / c.totalMarks) * 100)
                          : null;
                      const isPass = c.passed ?? (pctVal !== null ? pctVal >= 60 : false);

                      return (
                        <tr
                          key={c.id}
                          style={{
                            background: isWithheld
                              ? 'rgba(239, 68, 68, 0.04)'
                              : isPublished
                              ? 'rgba(16, 185, 129, 0.02)'
                              : 'transparent',
                          }}
                        >
                          {/* Student */}
                          <td>
                            <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{c.learner.displayName}</div>
                            <div className="text-muted text-xs">
                              {c.learner.rollNo || `STU-${c.learner.id.slice(-4)}`} • {c.learner.email}
                            </div>
                          </td>

                          {/* Submitted */}
                          <td>
                            <div style={{ fontSize: '0.78rem' }}>
                              {c.submittedAt ? new Date(c.submittedAt).toLocaleDateString() : 'Recent'}
                            </div>
                            <div className="text-muted text-xs">
                              {c.submittedAt
                                ? new Date(c.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                : ''}
                            </div>
                          </td>

                          {/* Score & Performance */}
                          <td>
                            {scoreVal !== null ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: isPass ? '#10b981' : '#ef4444' }}>
                                  {scoreVal} / {c.totalMarks} ({pctVal}%)
                                </div>
                                <span
                                  className={`badge ${isPass ? 'badge-passed' : 'badge-failed'} text-xs`}
                                  style={{ padding: '1px 6px', fontSize: '0.68rem' }}
                                >
                                  {isPass ? 'Pass' : 'Retake'}
                                </span>
                              </div>
                            ) : (
                              <span className="badge badge-warning text-xs">Pending Score</span>
                            )}
                          </td>

                          {/* Release State */}
                          <td>
                            {isPublished ? (
                              <span
                                className="badge badge-completed text-xs"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px' }}
                              >
                                <CheckCircle2 size={11} /> Published
                              </span>
                            ) : isWithheld ? (
                              <span
                                className="badge badge-failed text-xs"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '2px 8px',
                                  background: 'rgba(239, 68, 68, 0.15)',
                                  color: '#ef4444',
                                  border: '1px solid rgba(239, 68, 68, 0.3)',
                                  fontWeight: 700,
                                }}
                              >
                                <StopCircle size={11} /> Score Stopped
                              </span>
                            ) : (
                              <span
                                className="badge badge-warning text-xs"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px' }}
                              >
                                <Clock size={11} /> Ready to Publish
                              </span>
                            )}
                          </td>

                          {/* Actions: Stop/Resume & Inspect */}
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                              <button
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                                onClick={() => onOpenSubmissionModal(c.id)}
                                title="Inspect submission details"
                              >
                                Inspect
                              </button>

                              {!isPublished && (
                                <button
                                  className={`btn btn-sm ${
                                    isWithheld ? 'btn-outline-success' : 'btn-outline-danger'
                                  }`}
                                  style={{
                                    padding: '3px 10px',
                                    fontSize: '0.72rem',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontWeight: 700,
                                  }}
                                  disabled={isToggling}
                                  onClick={() => handleToggleHold(c, !isWithheld)}
                                  title={
                                    isWithheld
                                      ? 'Allow score to be released when publishing'
                                      : 'Stop score from being released to this student'
                                  }
                                >
                                  {isWithheld ? (
                                    <>
                                      <PlayCircle size={12} />
                                      Resume
                                    </>
                                  ) : (
                                    <>
                                      <StopCircle size={12} />
                                      Stop
                                    </>
                                  )}
                                </button>
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

            {/* Modal Footer */}
            <div
              style={{
                padding: '16px 24px',
                borderTop: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'var(--bg-card)',
              }}
            >
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                <strong style={{ color: '#f59e0b' }}>{activeModalGroup.awaitingCount} ready</strong> to publish
                {activeModalGroup.withheldCount > 0 && (
                  <span>
                    {' '}
                    • <strong style={{ color: '#ef4444' }}>{activeModalGroup.withheldCount} stopped</strong> (will not
                    be published)
                  </span>
                )}
                {activeModalGroup.publishedCount > 0 && (
                  <span>
                    {' '}
                    • <strong style={{ color: '#10b981' }}>{activeModalGroup.publishedCount} already published</strong>
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setViewModalAssessmentId(null)}
                >
                  Close
                </button>

                {activeModalGroup.awaitingCount > 0 && (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontWeight: 700,
                      boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
                    }}
                    disabled={isBatchReleasing}
                    onClick={() => {
                      setViewModalAssessmentId(null);
                      setBatchConfirmAssessmentId(activeModalGroup.assessment.id);
                    }}
                  >
                    <Send size={13} />
                    Publish Now ({activeModalGroup.awaitingCount} Students)
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL FOR BATCH PUBLISHING */}
      {batchConfirmAssessmentId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(3px)',
            zIndex: 1200,
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
            {(() => {
              const targetGroup = groupedAssessments.find((g) => g.assessment.id === batchConfirmAssessmentId);
              const awaitingCount = targetGroup ? targetGroup.awaitingCount : 0;
              const stoppedCount = targetGroup ? targetGroup.withheldCount : 0;

              return (
                <>
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
                      <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Publish Assessment Results</h3>
                      <p className="text-secondary text-xs" style={{ margin: 0 }}>
                        Official academic grade publication & learner alert
                      </p>
                    </div>
                  </div>

                  <p style={{ fontSize: '0.86rem', color: 'var(--text-main)', lineHeight: 1.5, marginBottom: '16px' }}>
                    You are publishing official verified examination results for{' '}
                    <strong>{targetGroup?.assessment.title || 'this assessment'}</strong> to{' '}
                    <strong>{awaitingCount} students</strong>.
                  </p>

                  {stoppedCount > 0 && (
                    <div
                      style={{
                        background: 'rgba(239, 68, 68, 0.08)',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '0.8rem',
                        color: '#ef4444',
                      }}
                    >
                      <StopCircle size={16} />
                      <span>
                        <strong>{stoppedCount} student score(s) are stopped/withheld</strong> and will NOT be released.
                      </span>
                    </div>
                  )}

                  <p className="text-secondary text-xs" style={{ marginBottom: '20px', lineHeight: 1.5 }}>
                    Students will immediately receive in-app notifications and see their verified score, percentage, and pass/retake status.
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
                      disabled={isBatchReleasing || awaitingCount === 0}
                      style={{ fontWeight: 700 }}
                    >
                      {isBatchReleasing ? 'Publishing & Notifying...' : `Confirm & Publish (${awaitingCount} Students)`}
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
export default ReleaseResultsDashboard;
