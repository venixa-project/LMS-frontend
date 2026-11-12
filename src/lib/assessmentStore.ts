import { apiClient } from './apiClient';
import { useAuthStore } from './store';
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
const STORAGE_KEY_DELETED_ASSESSMENTS = 'venilearn_deleted_assessment_ids';
const STORE_VERSION_KEY = 'venilearn_assessments_store_version';
const CURRENT_STORE_VERSION = 'v4_clean_production_sync';

function getDeletedAssessmentIds(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DELETED_ASSESSMENTS);
    if (raw) return new Set(JSON.parse(raw));
  } catch {}
  return new Set();
}

function recordDeletedAssessmentId(id: string) {
  try {
    const set = getDeletedAssessmentIds();
    set.add(id);
    localStorage.setItem(STORAGE_KEY_DELETED_ASSESSMENTS, JSON.stringify(Array.from(set)));
  } catch {}
}

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
        const deleted = getDeletedAssessmentIds();
        const activeRaw = res.data.filter(
          (a: any) => !deleted.has(a.id) && (!a.slug || !deleted.has(a.slug))
        );

        const extractedQuestions: Question[] = [];

        const mappedList: Assessment[] = activeRaw.map((a: any) => {
          // Backend returns questions as an array of question records with options
          const rawQList: any[] = Array.isArray(a.questions) ? a.questions : [];
          const hasQObjects = rawQList.length > 0 && typeof rawQList[0] === 'object';

          const qObjs: Question[] = hasQObjects
            ? rawQList.map((q: any) => ({
                id: q.id,
                assessmentId: a.id,
                prompt: q.prompt,
                type: q.type || 'single_choice',
                points: Number(q.points) || 1,
                difficulty: q.difficulty || 'medium',
                explanation: q.explanation || '',
                instructions: q.instructions || '',
                topic: q.topic || '',
                correctAnswer: q.correctAnswerText || q.answerKey,
                options: Array.isArray(q.options)
                  ? q.options.map((opt: any, optIdx: number) => ({
                      id: opt.id,
                      text: opt.text,
                      isCorrect: Boolean(opt.isCorrect),
                      order: opt.order ?? optIdx
                    }))
                  : []
              }))
            : (Array.isArray(a.questionsData) ? a.questionsData : []);

          qObjs.forEach((q) => extractedQuestions.push(q));
          const qIds = qObjs.map((q) => q.id);

          const tot = Number(a.totalMarks) || 100;
          const passPct = Number(a.passingPercentage) || 70;
          const passPts = a.passingMarks || Math.round((passPct / 100) * tot);

          return {
            ...a,
            id: a.id,
            slug: a.slug,
            title: a.title,
            instructions: a.instructions,
            courseId: a.courseId || a.course?.id,
            cohortId: a.cohortId || 'coh-001',
            totalMarks: tot,
            duration: Number(a.durationMinutes || a.duration) || 60,
            durationMinutes: Number(a.durationMinutes || a.duration) || 60,
            passingMarks: passPts,
            passmark: passPct,
            maxAttempts: Number(a.maxAttempts) || 1,
            status: (a.status === 'draft' ? 'draft' : 'published') as 'draft' | 'published',
            proctoringRequired: Boolean(a.proctoringRequired),
            aiGradingEnabled: Boolean(a.aiGradingEnabled),
            certificateConfig: a.certificateConfig || {},
            questionIds: qIds,
            questions: qIds,
            questionsData: qObjs
          };
        });

        const published = mappedList.filter((item) => item.status === 'published');
        const draftsFromBackend = mappedList.filter((item) => item.status === 'draft');

        // Merge with existing local drafts
        const localDrafts = loadFromStorage<Assessment[]>(STORAGE_KEY_DRAFTS, []).filter(
          (d) => !deleted.has(d.id)
        );
        const draftMap = new Map(localDrafts.map((d) => [d.id, d]));
        draftsFromBackend.forEach((d) => draftMap.set(d.id, d));
        const mergedDrafts = Array.from(draftMap.values());

        // Merge questions pool
        const existingLocalQ = loadFromStorage<Question[]>(STORAGE_KEY_QUESTIONS, []);
        const qMap = new Map(existingLocalQ.map((q) => [q.id, q]));
        extractedQuestions.forEach((q) => qMap.set(q.id, q));
        const mergedQuestions = Array.from(qMap.values());

        set({
          assessments: published,
          drafts: mergedDrafts,
          questions: mergedQuestions,
          isLoading: false
        });

        saveToStorage(STORAGE_KEY_ASSESSMENTS, published);
        saveToStorage(STORAGE_KEY_DRAFTS, mergedDrafts);
        saveToStorage(STORAGE_KEY_QUESTIONS, mergedQuestions);
        return;
      }
    } catch (err) {
      console.warn('Failed to fetch assessments:', err);
    }
    const deleted = getDeletedAssessmentIds();
    const local = loadFromStorage<Assessment[]>(STORAGE_KEY_ASSESSMENTS, []).filter(
      (a) => !deleted.has(a.id) && (!a.slug || !deleted.has(a.slug))
    );
    set({ assessments: local, isLoading: false });
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
    // 1. Check embedded questionsData in assessment or draft
    const assessment = state.assessments.find((a) => a.id === assessmentId) || state.drafts.find((d) => d.id === assessmentId);
    if (assessment?.questionsData && assessment.questionsData.length > 0) {
      return assessment.questionsData;
    }

    // 2. If assessment.questions contains full Question objects, return it directly
    if (assessment?.questions && assessment.questions.length > 0 && typeof (assessment.questions[0] as any) === 'object') {
      return assessment.questions as unknown as Question[];
    }

    // 3. Direct question objects linked to this assessment in state.questions
    const directlyLinked = state.questions.filter((q) => q.assessmentId === assessmentId);
    if (directlyLinked.length > 0) {
      return directlyLinked;
    }

    // 4. Fallback to matching question IDs in questionIds or questions array
    const qIds = assessment?.questionIds || assessment?.questions || [];
    if (qIds.length > 0) {
      const matched = state.questions.filter((q) => qIds.includes(q.id));
      if (matched.length > 0) return matched;
    }

    // 5. Check localStorage fallback for stored questions
    const localQ = loadFromStorage<Question[]>(STORAGE_KEY_QUESTIONS, []);
    const localLinked = localQ.filter((q) => q.assessmentId === assessmentId);
    if (localLinked.length > 0) {
      return localLinked;
    }

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
    const qList = questions || assessment.questionsData || [];
    const newAssessment: Assessment = {
      ...assessment,
      id,
      status: 'published',
      createdAt: assessment.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      questionIds: qList.map((q) => q.id),
      questions: qList.map((q) => q.id),
      questionsData: qList
    };

    set((state) => {
      const updatedAssessments = [newAssessment, ...state.assessments.filter((a) => a.id !== id)];
      const updatedDrafts = state.drafts.filter((d) => d.id !== id);

      let updatedQuestions = [...state.questions];
      if (qList.length > 0) {
        const questionMap = new Map(updatedQuestions.map((q) => [q.id, q]));
        qList.forEach((q) => {
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

    // Calculate passing percentage safely (clamped 1-100)
    const totMarks = Number(newAssessment.totalMarks) || 100;
    const passMarks = Number(newAssessment.passingMarks) || Number(newAssessment.passmark) || 70;
    const passPercentage = Math.min(100, Math.max(1, Math.round(newAssessment.passmark ? Number(newAssessment.passmark) : (passMarks / totMarks) * 100)));

    const backendPayload = {
      title: newAssessment.title,
      instructions: newAssessment.instructions || 'Answer all questions to the best of your ability.',
      courseId: (newAssessment.courseId && newAssessment.courseId !== 'all') ? newAssessment.courseId : undefined,
      durationMinutes: Number(newAssessment.durationMinutes || newAssessment.duration || 60),
      totalMarks: totMarks,
      passingPercentage: passPercentage,
      scope: 'final_assessment',
      status: 'published',
      mode: 'automated',
      proctoringRequired: Boolean(newAssessment.proctoringRequired),
      certificateConfig: newAssessment.certificateConfig || {},
      questions: qList.map((q, idx) => ({
        prompt: q.prompt,
        type: q.type || 'single_choice',
        points: Math.max(1, Math.round(Number(q.points) || 1)),
        difficulty: q.difficulty || 'medium',
        explanation: q.explanation || '',
        options: (q.options || []).map((opt: any, optIdx: number) => ({
          text: typeof opt === 'string' ? opt : (opt.text || `Option ${optIdx + 1}`),
          isCorrect: typeof opt === 'string' ? optIdx === 0 : Boolean(opt.isCorrect),
          order: optIdx
        }))
      }))
    };

    // Synchronize to PostgreSQL backend
    apiClient.post<any>('/assessments', backendPayload).then((res) => {
      if (res?.data && res.data.id) {
        const backendId = res.data.id;
        const backendQuestions: Question[] = Array.isArray(res.data.questions)
          ? res.data.questions.map((q: any) => ({
              id: q.id,
              assessmentId: backendId,
              prompt: q.prompt,
              type: q.type,
              points: Number(q.points) || 1,
              difficulty: q.difficulty || 'medium',
              explanation: q.explanation || '',
              options: (q.options || []).map((o: any, idx: number) => ({
                id: o.id,
                text: o.text,
                isCorrect: Boolean(o.isCorrect),
                order: o.order ?? idx
              }))
            }))
          : qList;

        set((state) => {
          const syncedAssessments = state.assessments.map((a) =>
            a.id === id ? { ...a, id: backendId, questionsData: backendQuestions, questionIds: backendQuestions.map(bq => bq.id) } : a
          );
          const qMap = new Map(state.questions.map(q => [q.id, q]));
          backendQuestions.forEach(bq => qMap.set(bq.id, bq));
          const syncedQuestions = Array.from(qMap.values());

          saveToStorage(STORAGE_KEY_ASSESSMENTS, syncedAssessments);
          saveToStorage(STORAGE_KEY_QUESTIONS, syncedQuestions);
          return { assessments: syncedAssessments, questions: syncedQuestions };
        });
      }
    }).catch((err) => {
      console.warn('Backend assessment creation sync note:', err);
    });

    // Notify students of new published assessment
    try {
      useAuthStore.getState().notifyAssessmentPublished({
        assessmentId: id,
        assessmentTitle: newAssessment.title,
        courseId: newAssessment.courseId,
        durationMinutes: Number(newAssessment.durationMinutes || newAssessment.duration || 60),
        totalMarks: totMarks,
      });
    } catch (e) {
      console.warn('Local student assessment notification notice:', e);
    }

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

    // Sync update to backend
    apiClient.patch(`/assessments/${assessment.id}`, {
      title: assessment.title,
      instructions: assessment.instructions,
      durationMinutes: assessment.durationMinutes || assessment.duration,
      totalMarks: assessment.totalMarks,
      certificateConfig: assessment.certificateConfig || {},
    }).catch((err) => console.warn('Backend update sync note:', err));

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
    const qList = questions || draft.questionsData || [];
    const newDraft: Assessment = {
      ...draft,
      id,
      status: 'draft',
      createdAt: draft.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      questionIds: qList.map((q) => q.id),
      questions: qList.map((q) => q.id),
      questionsData: qList
    };

    set((state) => {
      const updatedDrafts = [newDraft, ...state.drafts.filter((d) => d.id !== id)];
      let updatedQuestions = [...state.questions];
      if (qList.length > 0) {
        const questionMap = new Map(updatedQuestions.map((q) => [q.id, q]));
        qList.forEach((q) => {
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

    // Synchronize draft to PostgreSQL database
    const totMarks = Number(newDraft.totalMarks) || 100;
    const passMarks = Number(newDraft.passingMarks) || Number(newDraft.passmark) || 70;
    const passPercentage = Math.min(100, Math.max(1, Math.round(newDraft.passmark ? Number(newDraft.passmark) : (passMarks / totMarks) * 100)));

    const draftPayload = {
      title: newDraft.title,
      instructions: newDraft.instructions || 'Draft assessment instructions.',
      courseId: (newDraft.courseId && newDraft.courseId !== 'all') ? newDraft.courseId : undefined,
      durationMinutes: Number(newDraft.durationMinutes || newDraft.duration || 60),
      totalMarks: totMarks,
      passingPercentage: passPercentage,
      scope: 'final_assessment',
      status: 'draft',
      mode: 'automated',
      proctoringRequired: Boolean(newDraft.proctoringRequired),
      certificateConfig: newDraft.certificateConfig || {},
      questions: qList.map((q, idx) => ({
        prompt: q.prompt,
        type: q.type || 'single_choice',
        points: Math.max(1, Math.round(Number(q.points) || 1)),
        difficulty: q.difficulty || 'medium',
        explanation: q.explanation || '',
        options: (q.options || []).map((opt: any, optIdx: number) => ({
          text: typeof opt === 'string' ? opt : (opt.text || `Option ${optIdx + 1}`),
          isCorrect: typeof opt === 'string' ? optIdx === 0 : Boolean(opt.isCorrect),
          order: optIdx
        }))
      }))
    };

    apiClient.post<any>('/assessments', draftPayload).then((res) => {
      if (res?.data && res.data.id) {
        const backendId = res.data.id;
        set((state) => {
          const syncedDrafts = state.drafts.map((d) =>
            d.id === id ? { ...d, id: backendId } : d
          );
          saveToStorage(STORAGE_KEY_DRAFTS, syncedDrafts);
          return { drafts: syncedDrafts };
        });
      }
    }).catch((err) => {
      console.warn('Backend draft assessment sync note:', err);
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
      apiClient.patch(`/assessments/${assessmentId}/publish`).catch((err) => {
        console.warn('Backend publish sync note:', err);
      });

      // Notify students of published assessment
      try {
        useAuthStore.getState().notifyAssessmentPublished({
          assessmentId: published.id,
          assessmentTitle: published.title,
          courseId: published.courseId,
          durationMinutes: Number(published.durationMinutes || published.duration || 60),
          totalMarks: Number(published.totalMarks) || 100,
        });
      } catch (e) {
        console.warn('Local student assessment notification notice:', e);
      }

      return { success: true };
    }

    // If already in assessments, ensure status is published
    set((s) => {
      const updated = s.assessments.map((a) => (a.id === assessmentId ? { ...a, status: 'published' as const } : a));
      saveToStorage(STORAGE_KEY_ASSESSMENTS, updated);
      return { assessments: updated };
    });
    apiClient.patch(`/assessments/${assessmentId}/publish`).catch(() => {});

    const existingTarget = state.assessments.find((a) => a.id === assessmentId);
    if (existingTarget) {
      try {
        useAuthStore.getState().notifyAssessmentPublished({
          assessmentId: existingTarget.id,
          assessmentTitle: existingTarget.title,
          courseId: existingTarget.courseId,
          durationMinutes: Number(existingTarget.durationMinutes || existingTarget.duration || 60),
          totalMarks: Number(existingTarget.totalMarks) || 100,
        });
      } catch (e) {
        console.warn('Local student assessment notification notice:', e);
      }
    }

    return { success: true };
  },

  deleteAssessment: (assessmentId: string) => {
    // 1. Immediately record in deleted blacklist so browser refresh never restores it
    recordDeletedAssessmentId(assessmentId);

    // 2. Immediately update local state & localStorage
    set((state) => {
      const target = state.assessments.find((a) => a.id === assessmentId);
      if (target?.slug) recordDeletedAssessmentId(target.slug);
      const updatedAssessments = state.assessments.filter((a) => a.id !== assessmentId);
      saveToStorage(STORAGE_KEY_ASSESSMENTS, updatedAssessments);
      return { assessments: updatedAssessments };
    });

    // 3. Persist deletion to PostgreSQL backend API
    apiClient.delete(`/assessments/${assessmentId}`).catch((err) => {
      console.warn('Backend assessment deletion sync note:', err);
    });

    return { success: true };
  },

  deleteDraft: (draftId: string) => {
    recordDeletedAssessmentId(draftId);
    set((state) => {
      const updatedDrafts = state.drafts.filter((d) => d.id !== draftId);
      saveToStorage(STORAGE_KEY_DRAFTS, updatedDrafts);
      return { drafts: updatedDrafts };
    });
    apiClient.delete(`/assessments/${draftId}`).catch(() => {});
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
