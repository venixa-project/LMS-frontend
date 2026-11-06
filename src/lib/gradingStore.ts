import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AssessmentAttempt, GradingTask, AISuggestion, StudentEvaluationStatus } from '../types';

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

// Automatically clear legacy mock evaluations from previous prototypes
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('venilearn-grading-store');
    localStorage.removeItem('venilearn_grading_store');
    localStorage.removeItem('venilearn-grading-store-v4');
    localStorage.removeItem('venilearn-grading-store-v3');
  } catch {}
}

const initialAttempts: AssessmentAttempt[] = [];
const initialTasks: GradingTask[] = [];

interface GradingStoreState {
  attempts: AssessmentAttempt[];
  tasks: GradingTask[];
  selectedStudentId: string | null;
  selectedAttemptId: string | null;
  activeSubmissionModalAttempt: AssessmentAttempt | null;
  setSelectedStudentId: (studentId: string | null) => void;
  setSelectedAttemptId: (attemptId: string | null) => void;
  openSubmissionModal: (attempt: AssessmentAttempt) => void;
  closeSubmissionModal: () => void;
  acceptAiScore: (attemptId: string, reviewerNotes?: string, reviewerName?: string) => void;
  overrideScore: (
    attemptId: string,
    params: {
      score: number;
      feedback: string;
      rubricScores?: Record<string, number>;
      privateNotes?: string;
      requestModeration?: boolean;
      graderName?: string;
    }
  ) => void;
  saveDraftGrade: (
    attemptId: string,
    params: {
      score: number;
      feedback: string;
      rubricScores?: Record<string, number>;
      privateNotes?: string;
    }
  ) => void;
  resetToDefaults: () => void;
}

export const useGradingStore = create<GradingStoreState>()(
  persist(
    (set, get) => ({
      attempts: initialAttempts,
      tasks: initialTasks,
      selectedStudentId: null,
      selectedAttemptId: null,
      activeSubmissionModalAttempt: null,

      setSelectedStudentId: (studentId) => set({ selectedStudentId: studentId }),
      setSelectedAttemptId: (attemptId) => set({ selectedAttemptId: attemptId }),

      openSubmissionModal: (attempt) => set({ activeSubmissionModalAttempt: attempt }),
      closeSubmissionModal: () => set({ activeSubmissionModalAttempt: null }),

      acceptAiScore: (attemptId, reviewerNotes = 'Accepted AI suggested score following human verification', reviewerName = 'Dr. James Wilson') => {
        const now = new Date().toISOString();
        set((state) => {
          const updatedAttempts = state.attempts.map((att) => {
            if (att.id === attemptId) {
              const finalScore = att.aiSuggestion ? att.aiSuggestion.score : (att.score || 0);
              const percentage = Math.round((finalScore / att.totalMarks) * 100);
              const isPassed = percentage >= 60; // Standard 60% threshold

              return {
                ...att,
                score: finalScore,
                percentage,
                passed: isPassed,
                evaluationStatus: 'published' as StudentEvaluationStatus,
                status: 'results_released' as const,
                feedback: att.aiSuggestion?.feedback || att.feedback || reviewerNotes,
                evaluatedBy: `${reviewerName} (Verified AI Score)`,
                evaluatedAt: now,
                aiSuggestion: att.aiSuggestion
                  ? {
                      ...att.aiSuggestion,
                      reviewerAction: 'accepted' as const,
                      reviewerReason: reviewerNotes,
                    }
                  : undefined,
              };
            }
            return att;
          });

          const updatedTasks = state.tasks.map((task) => {
            if (task.attemptId === attemptId) {
              const finalScore = task.aiSuggestion ? task.aiSuggestion.score : (task.aiPreliminaryScore || task.score || 0);
              return {
                ...task,
                status: 'completed' as const,
                evaluationStatus: 'published' as StudentEvaluationStatus,
                score: finalScore,
                feedback: reviewerNotes,
                updatedAt: now,
              };
            }
            return task;
          });

          // Also update active modal if currently open
          const currentModal = state.activeSubmissionModalAttempt;
          const updatedModal = currentModal?.id === attemptId
            ? updatedAttempts.find((a) => a.id === attemptId) || null
            : currentModal;

          return {
            attempts: updatedAttempts,
            tasks: updatedTasks,
            activeSubmissionModalAttempt: updatedModal,
          };
        });
      },

      overrideScore: (attemptId, params) => {
        const now = new Date().toISOString();
        const { score, feedback, rubricScores, privateNotes, requestModeration, graderName = 'Dr. James Wilson' } = params;

        set((state) => {
          const updatedAttempts = state.attempts.map((att) => {
            if (att.id === attemptId) {
              const percentage = Math.round((score / att.totalMarks) * 100);
              const isPassed = percentage >= 60;
              const newEvalStatus: StudentEvaluationStatus = requestModeration
                ? 'awaiting_human_approval'
                : 'published';

              return {
                ...att,
                score,
                percentage,
                passed: isPassed,
                evaluationStatus: newEvalStatus,
                status: requestModeration ? 'submitted' as const : 'results_released' as const,
                feedback,
                privateNotes,
                rubricScores: rubricScores || att.rubricScores,
                evaluatedBy: graderName,
                evaluatedAt: now,
                aiSuggestion: att.aiSuggestion
                  ? {
                      ...att.aiSuggestion,
                      reviewerAction: 'edited' as const,
                      reviewerReason: 'Human override applied.',
                    }
                  : undefined,
              };
            }
            return att;
          });

          const updatedTasks = state.tasks.map((task) => {
            if (task.attemptId === attemptId) {
              return {
                ...task,
                status: requestModeration ? 'moderation' as const : 'completed' as const,
                evaluationStatus: requestModeration ? 'awaiting_human_approval' as const : 'published' as const,
                score,
                feedback,
                privateNotes,
                rubricScores: rubricScores || task.rubricScores,
                isDoubleMarking: requestModeration ? true : task.isDoubleMarking,
                markingStage: requestModeration ? 'second' as const : task.markingStage,
                updatedAt: now,
              };
            }
            return task;
          });

          const currentModal = state.activeSubmissionModalAttempt;
          const updatedModal = currentModal?.id === attemptId
            ? updatedAttempts.find((a) => a.id === attemptId) || null
            : currentModal;

          return {
            attempts: updatedAttempts,
            tasks: updatedTasks,
            activeSubmissionModalAttempt: updatedModal,
          };
        });
      },

      saveDraftGrade: (attemptId, params) => {
        const now = new Date().toISOString();
        const { score, feedback, rubricScores, privateNotes } = params;

        set((state) => {
          const updatedAttempts = state.attempts.map((att) => {
            if (att.id === attemptId) {
              return {
                ...att,
                score,
                feedback,
                rubricScores: rubricScores || att.rubricScores,
                privateNotes,
                evaluatedAt: now,
              };
            }
            return att;
          });

          const updatedTasks = state.tasks.map((task) => {
            if (task.attemptId === attemptId) {
              return {
                ...task,
                status: 'draft_graded' as const,
                score,
                feedback,
                privateNotes,
                rubricScores: rubricScores || task.rubricScores,
                updatedAt: now,
              };
            }
            return task;
          });

          const currentModal = state.activeSubmissionModalAttempt;
          const updatedModal = currentModal?.id === attemptId
            ? updatedAttempts.find((a) => a.id === attemptId) || null
            : currentModal;

          return {
            attempts: updatedAttempts,
            tasks: updatedTasks,
            activeSubmissionModalAttempt: updatedModal,
          };
        });
      },

      resetToDefaults: () => {
        set({
          attempts: initialAttempts,
          tasks: initialTasks,
          selectedStudentId: null,
          selectedAttemptId: null,
          activeSubmissionModalAttempt: null,
        });
      },
    }),
    {
      name: 'venilearn-grading-store-v4',
      partialize: (state) => ({
        attempts: state.attempts,
        tasks: state.tasks,
      }),
    }
  )
);
