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
  } catch { }
  return new Set();
}

function recordDeletedAssessmentId(id: string) {
  try {
    const set = getDeletedAssessmentIds();
    set.add(id);
    localStorage.setItem(STORAGE_KEY_DELETED_ASSESSMENTS, JSON.stringify(Array.from(set)));
  } catch { }
}

function unmarkDeletedAssessmentId(id: string) {
  try {
    const set = getDeletedAssessmentIds();
    if (set.has(id)) {
      set.delete(id);
      localStorage.setItem(STORAGE_KEY_DELETED_ASSESSMENTS, JSON.stringify(Array.from(set)));
    }
  } catch { }
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
  } catch { }
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
  addAssessment: (assessment: Assessment, questions?: Question[]) => Promise<{ success: boolean; id: string; error?: string }>;
  updateAssessment: (assessment: Assessment, questions?: Question[]) => Promise<{ success: boolean; error?: string }>;
  saveDraft: (draft: Assessment, questions?: Question[]) => Promise<{ success: boolean; id: string; error?: string }>;
  publishAssessment: (assessmentId: string) => Promise<{ success: boolean; error?: string }>;
  deleteAssessment: (assessmentId: string) => Promise<{ success: boolean; error?: string }>;
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

        const existingLocalAssessments = loadFromStorage<Assessment[]>(STORAGE_KEY_ASSESSMENTS, []);
        const existingLocalMap = new Map(existingLocalAssessments.map((item) => [item.id, item]));
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
          const existing = existingLocalMap.get(a.id);
          const certCfg = (typeof a.certificateConfig === 'object' && a.certificateConfig) ? a.certificateConfig : {};
          const passPts = certCfg.passingMarks || a.passingMarks || existing?.passingMarks || Math.max(1, Math.round((passPct / 100) * tot));
          const resolvedMeetUrl = a.googleMeetUrl || a.jitsiRoomId || existing?.googleMeetUrl || existing?.jitsiRoomId;
          const resolvedProctoringMode = a.proctoringMode || existing?.proctoringMode || (a.proctoringRequired ? 'combined' : 'none');

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
            proctoringMode: resolvedProctoringMode,
            googleMeetUrl: resolvedMeetUrl,
            jitsiRoomId: resolvedMeetUrl || a.jitsiRoomId,
            aiGradingEnabled: Boolean(a.aiGradingEnabled),
            certificateConfig: a.certificateConfig || {},
            questionIds: qIds,
            questions: qIds,
            questionsData: qObjs
          };
        });

        const published = mappedList.filter((item) => item.status === 'published');
        const draftsFromBackend = mappedList.filter((item) => item.status === 'draft');

        set({
          assessments: published,
          drafts: draftsFromBackend,
          questions: extractedQuestions,
          isLoading: false
        });

        saveToStorage(STORAGE_KEY_ASSESSMENTS, published);
        saveToStorage(STORAGE_KEY_DRAFTS, draftsFromBackend);
        saveToStorage(STORAGE_KEY_QUESTIONS, extractedQuestions);
        return;
      }
    } catch (err) {
      console.warn('Failed to fetch assessments from database:', err);
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

  addAssessment: async (assessment: Assessment, questions?: Question[]) => {
    const totalQCount = (questions ? questions.length : 0) || (assessment.questionIds ? assessment.questionIds.length : 0);
    if (totalQCount > MAX_ASSESSMENT_QUESTIONS) {
      return {
        success: false,
        id: '',
        error: `Assessment exceeds maximum allowed limit of ${MAX_ASSESSMENT_QUESTIONS} questions (attempted: ${totalQCount}).`
      };
    }

    const id = (assessment.id && assessment.id.length === 36)
      ? assessment.id
      : (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : undefined);
    if (id) unmarkDeletedAssessmentId(id);

    const qList = questions || assessment.questionsData || [];
    const totMarks = Number(assessment.totalMarks) || 100;
    const passMarks = Number(assessment.passingMarks) !== undefined && !isNaN(Number(assessment.passingMarks))
      ? Number(assessment.passingMarks)
      : (Number(assessment.passmark) || 70);
    const passPercentage = Math.min(100, Math.max(1, Math.round((passMarks / totMarks) * 100)));

    const backendPayload = {
      ...(id ? { id } : {}),
      title: assessment.title,
      instructions: assessment.instructions || 'Answer all questions to the best of your ability.',
      courseId: (assessment.courseId && assessment.courseId !== 'all') ? assessment.courseId : undefined,
      durationMinutes: Number(assessment.durationMinutes || assessment.duration || 60),
      totalMarks: totMarks,
      passingPercentage: passPercentage,
      scope: 'final_assessment',
      status: 'published',
      mode: 'automated',
      proctoringRequired: Boolean(assessment.proctoringRequired),
      proctoringMode: assessment.proctoringMode,
      googleMeetUrl: assessment.googleMeetUrl,
      jitsiRoomId: assessment.jitsiRoomId,
      sourceDocument: assessment.sourceDocument,
      creationMode: assessment.creationMode,
      mediaUrl: assessment.mediaUrl,
      videoUrl: assessment.videoUrl,
      certificateConfig: {
        ...(assessment.certificateConfig || {}),
        passingMarks: passMarks,
        sourceDocument: assessment.sourceDocument,
        creationMode: assessment.creationMode,
        mediaUrl: assessment.mediaUrl,
        videoUrl: assessment.videoUrl,
      },
      questions: qList.map((q, idx) => ({
        ...(q.id && q.id.length === 36 ? { id: q.id } : {}),
        prompt: q.prompt,
        type: q.type || 'single_choice',
        points: Math.max(1, Math.round(Number(q.points) || 1)),
        difficulty: q.difficulty || 'medium',
        explanation: q.explanation || '',
        instructions: q.instructions || '',
        topic: q.topic || '',
        correctAnswerText: q.correctAnswer || undefined,
        mediaUrl: (q as any).mediaUrl || undefined,
        options: (q.options || []).map((opt: any, optIdx: number) => ({
          ...(opt.id && opt.id.length === 36 ? { id: opt.id } : {}),
          text: typeof opt === 'string' ? opt : (opt.text || `Option ${optIdx + 1}`),
          isCorrect: typeof opt === 'string' ? optIdx === 0 : Boolean(opt.isCorrect),
          order: optIdx
        }))
      }))
    };

    try {
      const res = await apiClient.post<any>('/assessments', backendPayload);
      if (!res || !res.data || !res.data.id) {
        throw new Error(res?.message || 'Server did not return created assessment');
      }

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
            instructions: q.instructions || '',
            topic: q.topic || '',
            correctAnswer: q.correctAnswerText || q.answerKey,
            options: (q.options || []).map((o: any, idx: number) => ({
              id: o.id,
              text: o.text,
              isCorrect: Boolean(o.isCorrect),
              order: o.order ?? idx
            }))
          }))
        : qList;

      const createdAss: Assessment = {
        ...assessment,
        id: backendId,
        status: 'published',
        createdAt: res.data.createdAt || new Date().toISOString(),
        updatedAt: res.data.updatedAt || new Date().toISOString(),
        totalMarks: totMarks,
        passingMarks: passMarks,
        passmark: passPercentage,
        questionIds: backendQuestions.map((bq) => bq.id),
        questions: backendQuestions.map((bq) => bq.id),
        questionsData: backendQuestions
      };

      set((state) => {
        const nextList = [createdAss, ...state.assessments.filter((a) => a.id !== backendId && a.id !== id)];
        const nextDrafts = state.drafts.filter((d) => d.id !== backendId && d.id !== id);
        const qMap = new Map(state.questions.map((q) => [q.id, q]));
        backendQuestions.forEach((bq) => qMap.set(bq.id, bq));
        const nextQ = Array.from(qMap.values());

        saveToStorage(STORAGE_KEY_ASSESSMENTS, nextList);
        saveToStorage(STORAGE_KEY_DRAFTS, nextDrafts);
        saveToStorage(STORAGE_KEY_QUESTIONS, nextQ);

        return {
          assessments: nextList,
          drafts: nextDrafts,
          questions: nextQ
        };
      });

      // Notify students of new published assessment
      try {
        useAuthStore.getState().notifyAssessmentPublished({
          assessmentId: backendId,
          assessmentTitle: createdAss.title,
          courseId: createdAss.courseId,
          durationMinutes: Number(createdAss.durationMinutes || createdAss.duration || 60),
          totalMarks: totMarks,
        });
      } catch (e) {
        console.warn('Local student assessment notification notice:', e);
      }

      return { success: true, id: backendId };
    } catch (err: any) {
      console.error('Failed to create assessment in database:', err);
      const errMsg = err?.message || 'Database error: failed to create assessment on server.';
      return { success: false, id: '', error: errMsg };
    }
  },

  updateAssessment: async (assessment: Assessment, questions?: Question[]) => {
    unmarkDeletedAssessmentId(assessment.id);
    const totalQCount = (questions ? questions.length : 0) || (assessment.questionIds ? assessment.questionIds.length : 0);
    if (totalQCount > MAX_ASSESSMENT_QUESTIONS) {
      return {
        success: false,
        error: `Assessment exceeds maximum allowed limit of ${MAX_ASSESSMENT_QUESTIONS} questions (attempted: ${totalQCount}).`
      };
    }

    try {
      if (assessment.id && assessment.id.length === 36) {
        await apiClient.patch(`/assessments/${assessment.id}`, {
          title: assessment.title,
          instructions: assessment.instructions,
          durationMinutes: assessment.durationMinutes || assessment.duration,
          totalMarks: assessment.totalMarks,
          sourceDocument: assessment.sourceDocument,
          creationMode: assessment.creationMode,
          mediaUrl: assessment.mediaUrl,
          videoUrl: assessment.videoUrl,
          certificateConfig: assessment.certificateConfig || {},
        });
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
    } catch (err: any) {
      console.error('Failed to update assessment in database:', err);
      return { success: false, error: err?.message || 'Failed to update assessment in database.' };
    }
  },

  saveDraft: async (draft: Assessment, questions?: Question[]) => {
    const totalQCount = (questions ? questions.length : 0) || (draft.questionIds ? draft.questionIds.length : 0);
    if (totalQCount > MAX_ASSESSMENT_QUESTIONS) {
      return {
        success: false,
        id: '',
        error: `Draft exceeds maximum allowed limit of ${MAX_ASSESSMENT_QUESTIONS} questions (attempted: ${totalQCount}).`
      };
    }

    const id = (draft.id && draft.id.length === 36)
      ? draft.id
      : (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : undefined);
    if (id) unmarkDeletedAssessmentId(id);

    const qList = questions || draft.questionsData || [];
    const totMarks = Number(draft.totalMarks) || 100;
    const passMarks = Number(draft.passingMarks) !== undefined && !isNaN(Number(draft.passingMarks))
      ? Number(draft.passingMarks)
      : (Number(draft.passmark) || 70);
    const passPercentage = Math.min(100, Math.max(1, Math.round((passMarks / totMarks) * 100)));

    const draftPayload = {
      ...(id ? { id } : {}),
      title: draft.title || 'Untitled Assessment Draft',
      instructions: draft.instructions || 'Draft assessment instructions.',
      courseId: (draft.courseId && draft.courseId !== 'all') ? draft.courseId : undefined,
      durationMinutes: Number(draft.durationMinutes || draft.duration || 60),
      totalMarks: totMarks,
      passingPercentage: passPercentage,
      scope: 'final_assessment',
      status: 'draft',
      mode: 'automated',
      proctoringRequired: Boolean(draft.proctoringRequired),
      proctoringMode: draft.proctoringMode,
      googleMeetUrl: draft.googleMeetUrl,
      jitsiRoomId: draft.jitsiRoomId,
      sourceDocument: draft.sourceDocument,
      creationMode: draft.creationMode,
      mediaUrl: draft.mediaUrl,
      videoUrl: draft.videoUrl,
      certificateConfig: {
        ...(draft.certificateConfig || {}),
        passingMarks: passMarks,
        sourceDocument: draft.sourceDocument,
        creationMode: draft.creationMode,
        mediaUrl: draft.mediaUrl,
        videoUrl: draft.videoUrl,
      },
      questions: qList.map((q, idx) => ({
        ...(q.id && q.id.length === 36 ? { id: q.id } : {}),
        prompt: q.prompt,
        type: q.type || 'single_choice',
        points: Math.max(1, Math.round(Number(q.points) || 1)),
        difficulty: q.difficulty || 'medium',
        explanation: q.explanation || '',
        instructions: q.instructions || '',
        topic: q.topic || '',
        correctAnswerText: q.correctAnswer || undefined,
        mediaUrl: (q as any).mediaUrl || undefined,
        options: (q.options || []).map((opt: any, optIdx: number) => ({
          ...(opt.id && opt.id.length === 36 ? { id: opt.id } : {}),
          text: typeof opt === 'string' ? opt : (opt.text || `Option ${optIdx + 1}`),
          isCorrect: typeof opt === 'string' ? optIdx === 0 : Boolean(opt.isCorrect),
          order: optIdx
        }))
      }))
    };

    try {
      const res = await apiClient.post<any>('/assessments', draftPayload);
      if (!res || !res.data || !res.data.id) {
        throw new Error(res?.message || 'Server did not return created draft');
      }

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
            instructions: q.instructions || '',
            topic: q.topic || '',
            correctAnswer: q.correctAnswerText || q.answerKey,
            options: (q.options || []).map((o: any, idx: number) => ({
              id: o.id,
              text: o.text,
              isCorrect: Boolean(o.isCorrect),
              order: o.order ?? idx
            }))
          }))
        : qList;

      const createdDraft: Assessment = {
        ...draft,
        id: backendId,
        status: 'draft',
        createdAt: res.data.createdAt || new Date().toISOString(),
        updatedAt: res.data.updatedAt || new Date().toISOString(),
        totalMarks: totMarks,
        passingMarks: passMarks,
        passmark: passPercentage,
        questionIds: backendQuestions.map((bq) => bq.id),
        questions: backendQuestions.map((bq) => bq.id),
        questionsData: backendQuestions
      };

      set((state) => {
        const nextDrafts = [createdDraft, ...state.drafts.filter((d) => d.id !== backendId && d.id !== id)];
        saveToStorage(STORAGE_KEY_DRAFTS, nextDrafts);
        return { drafts: nextDrafts };
      });

      return { success: true, id: backendId };
    } catch (err: any) {
      console.error('Failed to save draft to database:', err);
      const errMsg = err?.message || 'Database error: failed to save draft on server.';
      return { success: false, id: '', error: errMsg };
    }
  },

  publishAssessment: async (assessmentId: string) => {
    try {
      if (assessmentId.length === 36) {
        await apiClient.patch(`/assessments/${assessmentId}/publish`);
      }

      const state = get();
      const draft = state.drafts.find((d) => d.id === assessmentId);
      const existing = draft || state.assessments.find((a) => a.id === assessmentId);
      if (!existing) return { success: false, error: 'Assessment not found' };

      const published: Assessment = {
        ...existing,
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
    } catch (err: any) {
      console.error('Failed to publish assessment in database:', err);
      return { success: false, error: err?.message || 'Failed to publish assessment in database.' };
    }
  },

  deleteAssessment: async (assessmentId: string) => {
    recordDeletedAssessmentId(assessmentId);
    try {
      if (assessmentId.length === 36) {
        await apiClient.delete(`/assessments/${assessmentId}`);
      }
      set((state) => {
        const target = state.assessments.find((a) => a.id === assessmentId);
        if (target?.slug) recordDeletedAssessmentId(target.slug);
        const updatedAssessments = state.assessments.filter((a) => a.id !== assessmentId);
        saveToStorage(STORAGE_KEY_ASSESSMENTS, updatedAssessments);
        return { assessments: updatedAssessments };
      });
      return { success: true };
    } catch (err: any) {
      console.error('Failed to delete assessment in database:', err);
      return { success: false, error: err?.message || 'Failed to delete assessment.' };
    }
  },

  deleteDraft: (draftId: string) => {
    recordDeletedAssessmentId(draftId);
    set((state) => {
      const updatedDrafts = state.drafts.filter((d) => d.id !== draftId);
      saveToStorage(STORAGE_KEY_DRAFTS, updatedDrafts);
      return { drafts: updatedDrafts };
    });
    apiClient.delete(`/assessments/${draftId}`).catch(() => { });
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
