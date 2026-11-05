import { apiClient } from './apiClient';
// ============================================================
// LMS - Assessment Store (Zustand with LocalStorage Persistence)
// Manages assessments, question sets, drafts, publication status,
// and role/course/cohort scoping.
// ============================================================
import { create } from 'zustand';
import { Assessment, Question } from '../types';


const STORAGE_KEY_ASSESSMENTS = 'venilearn_assessments_store';
const STORAGE_KEY_QUESTIONS = 'venilearn_questions_store';
const STORAGE_KEY_DRAFTS = 'venilearn_drafts_store';
const STORE_VERSION_KEY = 'venilearn_assessments_store_version';
const CURRENT_STORE_VERSION = 'v4_clean_production_sync';

// Automatically bust stale client-side caches from previous prototype/mock data
if (typeof window !== 'undefined') {
  try {
    const cachedVer = localStorage.getItem(STORE_VERSION_KEY);
    if (cachedVer !== CURRENT_STORE_VERSION) {
      localStorage.removeItem(STORAGE_KEY_ASSESSMENTS);
      localStorage.removeItem(STORAGE_KEY_QUESTIONS);
      localStorage.removeItem(STORAGE_KEY_DRAFTS);
      localStorage.removeItem('venilearn_assignments');
      localStorage.setItem(STORE_VERSION_KEY, CURRENT_STORE_VERSION);
    }
  } catch {}
}

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((item) => !item.id?.startsWith("asmt-00") && !item.id?.startsWith("q-00")) as unknown as T;
    }
    return parsed && typeof parsed === "object" ? parsed : fallback;
  } catch (err) {
    console.error(`Failed to load from localStorage (${key}):`, err);
    return fallback;
  }
}

function saveToStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error(`Failed to save to localStorage (${key}):`, err);
  }
}

export const MAX_ASSESSMENT_QUESTIONS = 100;

interface AssessmentStoreState {
  myAttempts: any[];
  isLoading: boolean;
  fetchAssessments: () => Promise<void>;
  fetchMyAttempts: () => Promise<void>;
  assessments: Assessment[];
  questions: Question[];
  drafts: Assessment[];

  // Selectors
  getAssessmentById: (id: string) => Assessment | undefined;
  getQuestionsForAssessment: (assessmentId: string) => Question[];
  getAssessmentsForCourse: (courseId: string) => Assessment[];

  // Actions
  addAssessment: (assessment: Assessment, questions?: Question[]) => { success: boolean; id: string; error?: string };
  updateAssessment: (assessment: Assessment, questions?: Question[]) => { success: boolean; error?: string };
  saveDraft: (draft: Assessment, questions?: Question[]) => { success: boolean; id: string; error?: string };
  publishAssessment: (assessmentId: string) => { success: boolean };
  deleteAssessment: (assessmentId: string) => { success: boolean };
  deleteDraft: (draftId: string) => { success: boolean };
  saveQuestionsForAssessment: (assessmentId: string, questions: Question[]) => void;
  resetToDefaults: () => void;
}

export const useAssessmentStore = create<AssessmentStoreState>((set, get) => ({
  myAttempts: [],
  isLoading: false,
  fetchAssessments: async () => {
    set({ isLoading: true });
    try {
      const res = await apiClient.get<any[]>('/assessments');
      if (res && res.data && Array.isArray(res.data)) {
        set({ assessments: res.data, isLoading: false });
        saveToStorage(STORAGE_KEY_ASSESSMENTS, res.data);
        return;
      }
    } catch (err) {
      console.warn('Failed to fetch assessments:', err);
    }
    set({ isLoading: false });
  },
  fetchMyAttempts: async () => {
    try {
      const res = await apiClient.get<any[]>('/assessments/my-attempts');
      if (res && res.data && Array.isArray(res.data)) {
        set({ myAttempts: res.data });
      }
    } catch (err) {
      console.warn('Failed to fetch my assessment attempts:', err);
    }
  },
  assessments: loadFromStorage<Assessment[]>(STORAGE_KEY_ASSESSMENTS, []),
  questions: loadFromStorage<Question[]>(STORAGE_KEY_QUESTIONS, []),
  drafts: loadFromStorage<Assessment[]>(STORAGE_KEY_DRAFTS, []),

  getAssessmentById: (id: string) => {
    return get().assessments.find((a) => a.id === id) || get().drafts.find((d) => d.id === id);
  },

  getQuestionsForAssessment: (assessmentId: string) => {
    const state = get();
    // 1. Direct question objects linked to this assessment
    const directlyLinked = state.questions.filter((q) => q.assessmentId === assessmentId);
    if (directlyLinked.length > 0) {
      return directlyLinked;
    }

    // 2. Check embedded questionsData in assessment object
    const assessment = state.assessments.find((a) => a.id === assessmentId) || state.drafts.find((d) => d.id === assessmentId);
    if (assessment?.questionsData && assessment.questionsData.length > 0) {
      return assessment.questionsData;
    }

    // 3. Fallback to question IDs in questionIds or questions array
    const qIds = assessment?.questionIds || assessment?.questions || [];
    if (qIds.length > 0) {
      const matched = state.questions.filter((q) => qIds.includes(q.id));
      if (matched.length > 0) return matched;
    }

    // 4. Default: return empty array if no questions configured yet
    return [];
  },

  getAssessmentsForCourse: (courseId: string) => {
    return get().assessments.filter((a) => a.courseId === courseId);
  },

  addAssessment: (assessment: Assessment, questions?: Question[]) => {
    const totalQCount = (questions ? questions.length : 0) || (assessment.questionIds ? assessment.questionIds.length : 0);
    if (totalQCount > MAX_ASSESSMENT_QUESTIONS) {
      return {
        success: false,
        id: '',
        error: `Assessment exceeds maximum allowed limit of ${MAX_ASSESSMENT_QUESTIONS} questions (attempted: ${totalQCount}).`
      };
    }

    const id = assessment.id || `asm-${Date.now()}`;
    const newAssessment: Assessment = {
      ...assessment,
      id,
      status: 'published',
      createdAt: assessment.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      questionIds: questions ? questions.map((q) => q.id) : assessment.questionIds,
      questionsData: questions || assessment.questionsData
    };

    set((state) => {
      const updatedAssessments = [newAssessment, ...state.assessments.filter((a) => a.id !== id)];
      const updatedDrafts = state.drafts.filter((d) => d.id !== id);

      let updatedQuestions = [...state.questions];
      if (questions && questions.length > 0) {
        const questionMap = new Map(updatedQuestions.map((q) => [q.id, q]));
        questions.forEach((q) => {
          questionMap.set(q.id, { ...q, assessmentId: id });
        });
        updatedQuestions = Array.from(questionMap.values());
      }

      saveToStorage(STORAGE_KEY_ASSESSMENTS, updatedAssessments);
      saveToStorage(STORAGE_KEY_DRAFTS, updatedDrafts);
      saveToStorage(STORAGE_KEY_QUESTIONS, updatedQuestions);

      return {
        assessments: updatedAssessments,
        drafts: updatedDrafts,
        questions: updatedQuestions
      };
    });

    return { success: true, id };
  },

  updateAssessment: (assessment: Assessment, questions?: Question[]) => {
    const totalQCount = (questions ? questions.length : 0) || (assessment.questionIds ? assessment.questionIds.length : 0);
    if (totalQCount > MAX_ASSESSMENT_QUESTIONS) {
      return {
        success: false,
        error: `Assessment exceeds maximum allowed limit of ${MAX_ASSESSMENT_QUESTIONS} questions (attempted: ${totalQCount}).`
      };
    }

    set((state) => {
      const updatedAssessments = state.assessments.map((a) =>
        a.id === assessment.id
          ? {
              ...assessment,
              updatedAt: new Date().toISOString(),
              questionIds: questions ? questions.map((q) => q.id) : a.questionIds,
              questionsData: questions || a.questionsData
            }
          : a
      );

      let updatedQuestions = [...state.questions];
      if (questions && questions.length > 0) {
        const questionMap = new Map(updatedQuestions.map((q) => [q.id, q]));
        questions.forEach((q) => {
          questionMap.set(q.id, { ...q, assessmentId: assessment.id });
        });
        updatedQuestions = Array.from(questionMap.values());
      }

      saveToStorage(STORAGE_KEY_ASSESSMENTS, updatedAssessments);
      saveToStorage(STORAGE_KEY_QUESTIONS, updatedQuestions);

      return {
        assessments: updatedAssessments,
        questions: updatedQuestions
      };
    });

    return { success: true };
  },

  saveDraft: (draft: Assessment, questions?: Question[]) => {
    const totalQCount = (questions ? questions.length : 0) || (draft.questionIds ? draft.questionIds.length : 0);
    if (totalQCount > MAX_ASSESSMENT_QUESTIONS) {
      return {
        success: false,
        id: '',
        error: `Draft exceeds maximum allowed limit of ${MAX_ASSESSMENT_QUESTIONS} questions (attempted: ${totalQCount}).`
      };
    }

    const id = draft.id || `draft-${Date.now()}`;
    const newDraft: Assessment = {
      ...draft,
      id,
      status: 'draft',
      createdAt: draft.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      questionIds: questions ? questions.map((q) => q.id) : draft.questionIds,
      questionsData: questions || draft.questionsData
    };

    set((state) => {
      const updatedDrafts = [newDraft, ...state.drafts.filter((d) => d.id !== id)];
      let updatedQuestions = [...state.questions];
      if (questions && questions.length > 0) {
        const questionMap = new Map(updatedQuestions.map((q) => [q.id, q]));
        questions.forEach((q) => {
          questionMap.set(q.id, { ...q, assessmentId: id });
        });
        updatedQuestions = Array.from(questionMap.values());
      }

      saveToStorage(STORAGE_KEY_DRAFTS, updatedDrafts);
      saveToStorage(STORAGE_KEY_QUESTIONS, updatedQuestions);

      return {
        drafts: updatedDrafts,
        questions: updatedQuestions
      };
    });

    return { success: true, id };
  },

  publishAssessment: (assessmentId: string) => {
    const state = get();
    const draft = state.drafts.find((d) => d.id === assessmentId);
    if (draft) {
      const published: Assessment = {
        ...draft,
        status: 'published',
        updatedAt: new Date().toISOString()
      };
      set((s) => {
        const updatedDrafts = s.drafts.filter((d) => d.id !== assessmentId);
        const updatedAssessments = [published, ...s.assessments.filter((a) => a.id !== assessmentId)];
        saveToStorage(STORAGE_KEY_DRAFTS, updatedDrafts);
        saveToStorage(STORAGE_KEY_ASSESSMENTS, updatedAssessments);
        return { drafts: updatedDrafts, assessments: updatedAssessments };
      });
      return { success: true };
    }

    // If already in assessments, ensure status is published
    set((s) => {
      const updated = s.assessments.map((a) => (a.id === assessmentId ? { ...a, status: 'published' as const } : a));
      saveToStorage(STORAGE_KEY_ASSESSMENTS, updated);
      return { assessments: updated };
    });

    return { success: true };
  },

  deleteAssessment: (assessmentId: string) => {
    set((state) => {
      const updatedAssessments = state.assessments.filter((a) => a.id !== assessmentId);
      saveToStorage(STORAGE_KEY_ASSESSMENTS, updatedAssessments);
      return { assessments: updatedAssessments };
    });
    return { success: true };
  },

  deleteDraft: (draftId: string) => {
    set((state) => {
      const updatedDrafts = state.drafts.filter((d) => d.id !== draftId);
      saveToStorage(STORAGE_KEY_DRAFTS, updatedDrafts);
      return { drafts: updatedDrafts };
    });
    return { success: true };
  },

  saveQuestionsForAssessment: (assessmentId: string, questions: Question[]) => {
    set((state) => {
      const existing = state.questions.filter((q) => q.assessmentId !== assessmentId);
      const linked = questions.map((q) => ({ ...q, assessmentId }));
      const updatedQuestions = [...existing, ...linked];
      saveToStorage(STORAGE_KEY_QUESTIONS, updatedQuestions);
      return { questions: updatedQuestions };
    });
  },

  resetToDefaults: () => {
    localStorage.removeItem(STORAGE_KEY_ASSESSMENTS);
    localStorage.removeItem(STORAGE_KEY_QUESTIONS);
    localStorage.removeItem(STORAGE_KEY_DRAFTS);
    set({
      assessments: [],
      questions: [],
      drafts: []
    });
  }
}));
