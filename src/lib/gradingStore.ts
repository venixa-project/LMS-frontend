import { create } from 'zustand';
import { AssessmentAttempt, GradingTask, AISuggestion, StudentEvaluationStatus } from '../types';
import { apiClient } from './apiClient';

export interface StudentAssessmentSummary {
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentRollNo: string;
  studentAvatar: string;
  department: string;
  courseIds: string[];
  courseTitles: string[];
  totalAssigned: number;
  completedCount: number;
  pendingCount: number;
  averageScore: number;
  latestScore: number;
  latestAssessmentDate: string;
  overallStatus: 'Passed' | 'Failed' | 'Pending Evaluation' | 'AI Review Required' | 'Awaiting Human Approval';
}

export interface GradingStatistics {
  totalStudents: number;
  completed: number;
  pending: number;
  aiSuggestionsAwaitingReview: number;
  avgScore: number;
  passRate: number;
  totalTasks: number;
  pendingTasks: number;
  completedTasks: number;
  aiSuggestionsCount: number;
}

export interface TaskAuditLog {
  id: string;
  actorUserId?: string;
  actorName: string;
  action: string;
  resourceId: string;
  changeSummary: string;
  beforeState?: any;
  afterState?: any;
  timestamp: string;
  outcome: string;
}

export interface ReleaseQueueItem {
  id: string; // attemptId
  learnerId: string;
  learner: {
    id: string;
    displayName: string;
    firstName?: string;
    lastName?: string;
    email: string;
    rollNo?: string;
    avatarUrl?: string;
  };
  assessment: {
    id: string;
    title: string;
    totalMarks: number;
    passingPercentage: number;
    courseId?: string;
    createdBy?: string;
    course?: {
      id: string;
      title: string;
      slug?: string;
    };
  };
  score: number | null;
  totalMarks: number;
  percentage: number | null;
  passed: boolean | null;
  status: string; // submitted, under_review, results_released
  evaluationStatus: string; // auto_graded, ai_review_required, awaiting_human_approval, awaiting_release, graded, published, withheld
  submissionReason?: string | null;
  feedback?: string | null;
  submittedAt: string;
  evaluatedBy?: string | null;
  evaluatedAt?: string | null;
  gradingTasks?: Array<{
    id: string;
    status: string;
    evaluationStatus: string;
    score: number | null;
    feedback?: string | null;
    aiPreliminaryScore?: number | null;
  }>;
  aiSuggestion?: {
    id: string;
    score: number;
    confidence: number;
    status: string;
  } | null;
}

interface GradingStoreState {
  attempts: AssessmentAttempt[];
  tasks: GradingTask[];
  releaseQueue: ReleaseQueueItem[];
  isLoadingReleaseQueue: boolean;
  statistics: GradingStatistics | null;
  isLoading: boolean;
  error: string | null;
  selectedStudentId: string | null;
  selectedAttemptId: string | null;
  activeSubmissionModalAttempt: AssessmentAttempt | null;
  activeModalTask: any | null;
  taskAuditHistory: TaskAuditLog[];

  setSelectedStudentId: (studentId: string | null) => void;
  setSelectedAttemptId: (attemptId: string | null) => void;
  openSubmissionModal: (attempt: AssessmentAttempt) => void;
  closeSubmissionModal: () => void;

  fetchQueue: (filters?: Record<string, any>) => Promise<void>;
  fetchSuggestions: (filters?: Record<string, any>) => Promise<void>;
  fetchStatistics: (filters?: Record<string, any>) => Promise<GradingStatistics | null>;
  fetchTaskDetails: (taskId: string) => Promise<any>;
  fetchTaskHistory: (taskId: string) => Promise<TaskAuditLog[]>;
  fetchReleaseQueue: (filters?: Record<string, any>) => Promise<ReleaseQueueItem[]>;

  acceptAiScore: (taskIdOrAttemptId: string, reviewerNotes?: string, reviewerName?: string) => Promise<void>;
  rejectAiScore: (taskIdOrAttemptId: string, reason: string, reviewerName?: string) => Promise<void>;
  overrideScore: (
    taskIdOrAttemptId: string,
    params: {
      score: number;
      feedback: string;
      rubricScores?: Record<string, number>;
      privateNotes?: string;
      requestModeration?: boolean;
      graderName?: string;
    }
  ) => Promise<void>;
  saveDraftGrade: (
    taskIdOrAttemptId: string,
    params: {
      score: number;
      feedback: string;
      rubricScores?: Record<string, number>;
      privateNotes?: string;
    }
  ) => Promise<void>;
  triggerEvaluation: (taskId: string) => Promise<void>;
  releaseSingleResult: (attemptIdOrTaskId: string) => Promise<{ success: boolean; message: string }>;
  releaseAssessmentResults: (
    assessmentId: string,
    excludedAttemptIds?: string[]
  ) => Promise<{ success: boolean; message: string; releasedCount: number; withheldCount?: number }>;
  toggleScoreHold: (
    attemptId: string,
    hold: boolean,
    reason?: string
  ) => Promise<{ success: boolean; message: string; held: boolean }>;
  resetToDefaults: () => void;
}

function mapTaskFromBackend(t: any): GradingTask {
  return {
    id: t.id,
    attemptId: t.attemptId,
    submissionId: t.attemptId ? t.attemptId.slice(-6) : t.id.slice(-6),
    assessmentId: t.assessmentId,
    assessmentTitle: t.assessment?.title || 'Assessment',
    courseId: t.assessment?.courseId,
    courseTitle: t.assessment?.course?.title || 'Enrolled Course',
    assessmentType: t.assessment?.mode || 'exam',
    attemptNumber: t.attempt?.attemptNumber || 1,
    learnerId: t.learnerId,
    learnerName: t.learner?.displayName || `${t.learner?.firstName || ''} ${t.learner?.lastName || ''}`.trim() || 'Student',
    learnerRollNo: t.learner?.rollNo || `STU-${(t.learnerId || '').slice(-4)}`,
    learnerEmail: t.learner?.email || '',
    learnerAvatar: t.learner?.avatarUrl,
    graderId: t.graderId,
    status: t.status,
    evaluationStatus: t.evaluationStatus as any,
    dueDate: t.dueDate,
    priority: t.priority,
    isDoubleMarking: t.isDoubleMarking,
    markingStage: t.markingStage,
    score: t.score !== null && t.score !== undefined ? Number(t.score) : undefined,
    totalMarks: t.totalMarks || t.assessment?.totalMarks || 100,
    rubricScores: t.rubricScores || {},
    feedback: t.feedback || '',
    privateNotes: t.privateNotes || '',
    aiPreliminaryScore: t.aiPreliminaryScore !== null && t.aiPreliminaryScore !== undefined ? Number(t.aiPreliminaryScore) : undefined,
    aiSuggestion: t.attempt?.aiSuggestion ? {
      id: t.attempt.aiSuggestion.id,
      score: Number(t.attempt.aiSuggestion.score),
      confidence: Number(t.attempt.aiSuggestion.confidence || 0.92),
      evidence: Array.isArray(t.attempt.aiSuggestion.evidence?.questionBreakdown)
        ? t.attempt.aiSuggestion.evidence.questionBreakdown.map((q: any) => `${q.isCorrect ? '✓' : '✗'} ${q.feedback}`)
        : (Array.isArray(t.attempt.aiSuggestion.evidence) ? t.attempt.aiSuggestion.evidence : []),
      rubricScores: t.attempt.aiSuggestion.rubricScores || {},
      feedback: t.attempt.aiSuggestion.feedback || '',
      model: t.attempt.aiSuggestion.model || 'Local Grounded Semantic Engine',
      version: t.attempt.aiSuggestion.version || '3.0.0',
      generatedAt: t.attempt.aiSuggestion.createdAt,
      status: t.attempt.aiSuggestion.status,
      reviewerAction: t.attempt.aiSuggestion.reviewerAction,
      reviewerReason: t.attempt.aiSuggestion.reviewerReason,
    } : undefined,
    submittedAt: t.submittedAt || t.createdAt,
    createdAt: t.createdAt || new Date().toISOString(),
    updatedAt: t.updatedAt || new Date().toISOString(),
  };
}

function mapAttemptFromTask(t: any): AssessmentAttempt {
  const scoreVal = t.score !== null && t.score !== undefined
    ? Number(t.score)
    : (t.attempt?.score !== null && t.attempt?.score !== undefined ? Number(t.attempt.score) : undefined);
  const total = t.totalMarks || t.assessment?.totalMarks || 100;
  const pct = t.attempt?.percentage !== null && t.attempt?.percentage !== undefined
    ? Number(t.attempt.percentage)
    : (scoreVal !== undefined && total > 0 ? Math.round((scoreVal / total) * 100) : 0);

  return {
    id: t.attemptId || t.id,
    assessmentId: t.assessmentId,
    assessmentTitle: t.assessment?.title || 'Assessment',
    courseId: t.assessment?.courseId,
    courseTitle: t.assessment?.course?.title || 'Enrolled Course',
    assessmentType: t.assessment?.mode || 'exam',
    attemptNumber: t.attempt?.attemptNumber || 1,
    learnerId: t.learnerId,
    learnerName: t.learner?.displayName || `${t.learner?.firstName || ''} ${t.learner?.lastName || ''}`.trim() || 'Student',
    learnerRollNo: t.learner?.rollNo || `STU-${(t.learnerId || '').slice(-4)}`,
    learnerEmail: t.learner?.email || '',
    learnerAvatar: t.learner?.avatarUrl,
    learnerDepartment: 'Engineering',
    status: t.status === 'completed' ? 'results_released' : (t.attempt?.status || 'submitted'),
    evaluationStatus: (t.evaluationStatus || t.attempt?.evaluationStatus || 'ai_review_required') as any,
    startedAt: t.attempt?.startedAt || t.createdAt,
    submittedAt: t.submittedAt || t.attempt?.submittedAt || t.createdAt,
    score: scoreVal,
    totalMarks: total,
    percentage: pct,
    passed: t.attempt?.passed ?? (pct >= 60),
    feedback: t.feedback || t.attempt?.feedback || '',
    privateNotes: t.privateNotes || '',
    rubricScores: t.rubricScores || {},
    aiSuggestion: t.attempt?.aiSuggestion ? {
      id: t.attempt.aiSuggestion.id,
      score: Number(t.attempt.aiSuggestion.score),
      confidence: Number(t.attempt.aiSuggestion.confidence || 0.92),
      evidence: Array.isArray(t.attempt.aiSuggestion.evidence?.questionBreakdown)
        ? t.attempt.aiSuggestion.evidence.questionBreakdown.map((q: any) => `${q.isCorrect ? '✓' : '✗'} ${q.feedback}`)
        : (Array.isArray(t.attempt.aiSuggestion.evidence) ? t.attempt.aiSuggestion.evidence : []),
      rubricScores: t.attempt.aiSuggestion.rubricScores || {},
      feedback: t.attempt.aiSuggestion.feedback || '',
      model: t.attempt.aiSuggestion.model || 'Local Grounded Semantic Engine',
      version: t.attempt.aiSuggestion.version || '3.0.0',
      generatedAt: t.attempt.aiSuggestion.createdAt,
      status: t.attempt.aiSuggestion.status,
      reviewerAction: t.attempt.aiSuggestion.reviewerAction,
      reviewerReason: t.attempt.aiSuggestion.reviewerReason,
    } : undefined,
    answers: (t.attempt?.answers || []).map((ans: any) => ({
      questionId: ans.questionId,
      answer: ans.answer,
      isCorrect: ans.isCorrect,
      points: ans.points !== null ? Number(ans.points) : 0,
      maxPoints: ans.maxPoints !== null ? Number(ans.maxPoints) : 10,
      feedback: ans.feedback,
      aiNotes: ans.aiNotes,
    })),
  };
}

export const useGradingStore = create<GradingStoreState>()((set, get) => ({
  attempts: [],
  tasks: [],
  releaseQueue: [],
  isLoadingReleaseQueue: false,
  statistics: null,
  isLoading: false,
  error: null,
  selectedStudentId: null,
  selectedAttemptId: null,
  activeSubmissionModalAttempt: null,
  activeModalTask: null,
  taskAuditHistory: [],

  setSelectedStudentId: (studentId) => set({ selectedStudentId: studentId }),
  setSelectedAttemptId: (attemptId) => set({ selectedAttemptId: attemptId }),

  openSubmissionModal: (attempt) => {
    set({ activeSubmissionModalAttempt: attempt });
    // Also proactively fetch full task details and history
    const task = get().tasks.find((t) => t.attemptId === attempt.id || t.id === attempt.id);
    if (task) {
      get().fetchTaskDetails(task.id);
      get().fetchTaskHistory(task.id);
    }
  },
  closeSubmissionModal: () => set({ activeSubmissionModalAttempt: null, activeModalTask: null, taskAuditHistory: [] }),

  fetchQueue: async (filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const qParams = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== 'all' && v !== '') {
          qParams.set(k, String(v));
        }
      });
      const queryStr = qParams.toString() ? `?${qParams.toString()}` : '';
      const res = await apiClient.get<any>(`/grading/queue${queryStr}`);
      const rawTasks = res?.data || [];

      const mappedTasks = rawTasks.map(mapTaskFromBackend);
      const mappedAttempts = rawTasks.map(mapAttemptFromTask);

      set((state) => {
        // Merge attempts with existing to preserve any distinct suggestion-only attempts
        const existingAttemptIds = new Set(mappedAttempts.map((a: any) => a.id));
        const mergedAttempts = [
          ...mappedAttempts,
          ...state.attempts.filter((a) => !existingAttemptIds.has(a.id)),
        ];

        return {
          tasks: mappedTasks,
          attempts: mergedAttempts,
          isLoading: false,
          error: null,
        };
      });
    } catch (err: any) {
      set({ isLoading: false, error: err?.message || 'Failed to load grading queue' });
    }
  },

  fetchSuggestions: async (filters = {}) => {
    try {
      const qParams = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== 'all' && v !== '') {
          qParams.set(k, String(v));
        }
      });
      const queryStr = qParams.toString() ? `?${qParams.toString()}` : '';
      const res = await apiClient.get<any>(`/grading/suggestions${queryStr}`);
      const rawSuggestions = res?.data || [];

      const suggestionAttempts: AssessmentAttempt[] = rawSuggestions
        .map((s: any) => {
          if (!s.attempt) return null;
          const t = {
            id: s.attempt.gradingTasks?.[0]?.id || `task-${s.attempt.id}`,
            attemptId: s.attempt.id,
            assessmentId: s.attempt.assessment?.id,
            assessment: s.attempt.assessment,
            learnerId: s.attempt.learner?.id,
            learner: s.attempt.learner,
            attempt: {
              ...s.attempt,
              aiSuggestion: s,
            },
            score: s.attempt.score,
            totalMarks: s.attempt.assessment?.totalMarks || 100,
            rubricScores: s.rubricScores || {},
            feedback: s.feedback,
            status: s.attempt.status === 'results_released' ? 'completed' : 'unassigned',
            evaluationStatus: s.attempt.evaluationStatus || 'ai_review_required',
            submittedAt: s.attempt.submittedAt || s.createdAt,
            createdAt: s.createdAt,
          };
          return mapAttemptFromTask(t);
        })
        .filter(Boolean) as AssessmentAttempt[];

      set((state) => {
        const existingAttemptIds = new Set(suggestionAttempts.map((a) => a.id));
        const mergedAttempts = [
          ...suggestionAttempts,
          ...state.attempts.filter((a) => !existingAttemptIds.has(a.id)),
        ];
        return { attempts: mergedAttempts };
      });
    } catch (err: any) {
      console.warn('Failed to load AI suggestions:', err);
    }
  },

  fetchStatistics: async (filters = {}) => {
    try {
      const qParams = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== 'all' && v !== '') {
          qParams.set(k, String(v));
        }
      });
      const queryStr = qParams.toString() ? `?${qParams.toString()}` : '';
      const res = await apiClient.get<any>(`/grading/statistics${queryStr}`);
      const stats = res?.data || null;
      set({ statistics: stats });
      return stats;
    } catch (err: any) {
      console.warn('Failed to load grading statistics:', err);
      return null;
    }
  },

  fetchTaskDetails: async (taskId: string) => {
    try {
      const res = await apiClient.get<any>(`/grading/tasks/${taskId}`);
      const task = res?.data || null;
      set({ activeModalTask: task });
      return task;
    } catch (err: any) {
      console.warn('Failed to load task details:', err);
      return null;
    }
  },

  fetchTaskHistory: async (taskId: string) => {
    try {
      const res = await apiClient.get<any>(`/grading/tasks/${taskId}/history`);
      const logs = res?.data || [];
      set({ taskAuditHistory: logs });
      return logs;
    } catch {
      return [];
    }
  },

  acceptAiScore: async (taskIdOrAttemptId, reviewerNotes = 'Verified and approved AI suggested score', reviewerName = 'Authorized Evaluator') => {
    const state = get();
    const task = state.tasks.find((t) => t.id === taskIdOrAttemptId || t.attemptId === taskIdOrAttemptId);
    const targetTaskId = task ? task.id : taskIdOrAttemptId;
    const targetScore = task ? (task.aiPreliminaryScore || task.score) : undefined;

    await apiClient.post(`/grading/tasks/${targetTaskId}/approve`, {
      score: targetScore,
      notes: reviewerNotes,
    });

    // Refresh queue, suggestions, and statistics directly from PostgreSQL
    await Promise.all([get().fetchQueue(), get().fetchSuggestions(), get().fetchStatistics()]);
  },

  rejectAiScore: async (taskIdOrAttemptId, reason, reviewerName = 'Authorized Reviewer') => {
    const state = get();
    const task = state.tasks.find((t) => t.id === taskIdOrAttemptId || t.attemptId === taskIdOrAttemptId);
    const targetTaskId = task ? task.id : taskIdOrAttemptId;

    await apiClient.post(`/grading/tasks/${targetTaskId}/reject`, {
      reason,
    });

    await Promise.all([get().fetchQueue(), get().fetchSuggestions(), get().fetchStatistics()]);
  },

  overrideScore: async (taskIdOrAttemptId, params) => {
    const state = get();
    const task = state.tasks.find((t) => t.id === taskIdOrAttemptId || t.attemptId === taskIdOrAttemptId);
    const targetTaskId = task ? task.id : taskIdOrAttemptId;

    await apiClient.post(`/grading/tasks/${targetTaskId}/grade`, {
      score: params.score,
      feedback: params.feedback,
      rubricScores: params.rubricScores,
      privateNotes: params.privateNotes,
    });

    await Promise.all([get().fetchQueue(), get().fetchSuggestions(), get().fetchStatistics()]);
  },

  saveDraftGrade: async (taskIdOrAttemptId, params) => {
    const state = get();
    const task = state.tasks.find((t) => t.id === taskIdOrAttemptId || t.attemptId === taskIdOrAttemptId);
    const targetTaskId = task ? task.id : taskIdOrAttemptId;

    await apiClient.post(`/grading/tasks/${targetTaskId}/grade`, {
      score: params.score,
      feedback: params.feedback,
      rubricScores: params.rubricScores,
      privateNotes: params.privateNotes,
    });

    await Promise.all([get().fetchQueue(), get().fetchSuggestions(), get().fetchStatistics()]);
  },

  triggerEvaluation: async (taskId: string) => {
    await apiClient.post(`/grading/tasks/${taskId}/evaluate`);
    await Promise.all([get().fetchQueue(), get().fetchSuggestions(), get().fetchStatistics()]);
  },

  fetchReleaseQueue: async (filters = {}) => {
    set({ isLoadingReleaseQueue: true });
    try {
      const qParams = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== 'all' && v !== '') {
          qParams.set(k, String(v));
        }
      });
      const queryStr = qParams.toString() ? `?${qParams.toString()}` : '';
      const res = await apiClient.get<any>(`/grading/release-queue${queryStr}`);
      const items = res.data || [];
      set({ releaseQueue: items, isLoadingReleaseQueue: false });
      return items;
    } catch (e: any) {
      set({ isLoadingReleaseQueue: false });
      return [];
    }
  },

  releaseSingleResult: async (attemptIdOrTaskId: string) => {
    const res = await apiClient.post<{ success: boolean; message: string }>(`/grading/tasks/${attemptIdOrTaskId}/release-result`);
    // Update local state
    set((state) => ({
      releaseQueue: state.releaseQueue.map((item) =>
        item.id === attemptIdOrTaskId || item.gradingTasks?.[0]?.id === attemptIdOrTaskId
          ? { ...item, status: 'results_released', evaluationStatus: 'published' }
          : item
      ),
      tasks: state.tasks.map((task) =>
        task.id === attemptIdOrTaskId || task.attemptId === attemptIdOrTaskId
          ? { ...task, evaluationStatus: 'published' }
          : task
      ),
    }));
    await Promise.all([get().fetchQueue(), get().fetchStatistics()]);
    return res.data;
  },

  releaseAssessmentResults: async (assessmentId: string, excludedAttemptIds?: string[]) => {
    const res = await apiClient.post<{ success: boolean; message: string; releasedCount: number; withheldCount?: number }>(
      `/grading/assessments/${assessmentId}/release-results`,
      { excludedAttemptIds }
    );
    set((state) => ({
      releaseQueue: state.releaseQueue.map((item) => {
        if (item.assessment.id !== assessmentId) return item;
        const isWithheld = item.evaluationStatus === 'withheld' || item.submissionReason === 'SCORE_WITHHELD';
        const isExcluded = excludedAttemptIds && excludedAttemptIds.includes(item.id);
        if (isWithheld || isExcluded) return item;
        return { ...item, status: 'results_released', evaluationStatus: 'published' };
      }),
      tasks: state.tasks.map((task) => {
        if (task.assessmentId !== assessmentId) return task;
        const attempt = state.releaseQueue.find((i) => i.id === task.attemptId || i.gradingTasks?.[0]?.id === task.id);
        if (attempt && (attempt.evaluationStatus === 'withheld' || attempt.submissionReason === 'SCORE_WITHHELD')) {
          return task;
        }
        return { ...task, evaluationStatus: 'published' };
      }),
    }));
    await Promise.all([get().fetchQueue(), get().fetchStatistics()]);
    return res.data;
  },

  toggleScoreHold: async (attemptId: string, hold: boolean, reason?: string) => {
    const res = await apiClient.post<{ success: boolean; message: string; held: boolean }>(
      `/grading/attempts/${attemptId}/toggle-hold`,
      { hold, reason }
    );
    // Update local state
    set((state) => ({
      releaseQueue: state.releaseQueue.map((item) =>
        item.id === attemptId
          ? {
              ...item,
              evaluationStatus: hold ? 'withheld' : 'awaiting_release',
              submissionReason: hold ? (reason || 'SCORE_WITHHELD') : null,
            }
          : item
      ),
      tasks: state.tasks.map((task) =>
        task.attemptId === attemptId || task.id === attemptId
          ? { ...task, evaluationStatus: hold ? ('withheld' as any) : ('awaiting_release' as any) }
          : task
      ),
    }));
    return res.data;
  },

  resetToDefaults: () => {
    set({
      attempts: [],
      tasks: [],
      releaseQueue: [],
      isLoadingReleaseQueue: false,
      statistics: null,
      selectedStudentId: null,
      selectedAttemptId: null,
      activeSubmissionModalAttempt: null,
      activeModalTask: null,
      taskAuditHistory: [],
    });
  },
}));
