// ============================================================
// LMS - Assessment Backend API Client (PostgreSQL Persistence)
// ============================================================
import { QuizAssessmentConfig, QuizQuestionItem } from '../types';
import { apiClient } from '../lib/apiClient';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

export interface BackendAssessmentPayload {
  id?: string;
  title: string;
  instructions?: string;
  courseId?: string;
  moduleId?: string;
  lessonId?: string;
  scope: 'lesson_quiz' | 'module_assessment' | 'final_assessment';
  totalMarks: number;
  durationMinutes: number;
  maxAttempts: number;
  passingPercentage: number;
  status: 'published' | 'draft' | 'archived';
  negativeMarkingEnabled?: boolean;
  negativeMarksPerQuestion?: number;
  randomizeQuestions?: boolean;
  certificateConfig?: Record<string, any>;
  questions?: Array<{
    id?: string;
    prompt: string;
    type: 'single_choice' | 'multiple_choice' | 'true_false' | 'short_answer' | 'essay' | 'file_upload';
    points: number;
    difficulty: 'easy' | 'medium' | 'hard';
    explanation?: string;
    topic?: string;
    correctAnswerText?: string;
    instructions?: string;
    options?: Array<{
      id?: string;
      text: string;
      isCorrect: boolean;
      order?: number;
    }>;
  }>;
}

export interface BackendAssessmentResponse {
  id: string;
  tenantId: string;
  title: string;
  instructions?: string;
  courseId?: string;
  moduleId?: string;
  lessonId?: string;
  scope: 'lesson_quiz' | 'module_assessment' | 'final_assessment';
  totalMarks: number;
  durationMinutes: number;
  maxAttempts: number;
  passingPercentage: number;
  status: 'published' | 'draft' | 'archived';
  questions: Array<{
    id: string;
    prompt: string;
    type: string;
    points: number;
    difficulty: string;
    explanation?: string;
    topic?: string;
    correctAnswerText?: string;
    options: Array<{
      id: string;
      text: string;
      isCorrect?: boolean;
      order?: number;
    }>;
  }>;
  createdAt: string;
  updatedAt: string;
}

function getAuthHeaders(): Record<string, string> {
  const token =
    typeof window !== 'undefined'
      ? sessionStorage.getItem('venilearn_auth_token') ||
        localStorage.getItem('venilearn_auth_token') ||
        'venilearn-token-trainer-dev'
      : 'venilearn-token-trainer-dev';

  const tenantId =
    typeof window !== 'undefined'
      ? sessionStorage.getItem('venilearn_active_org_id') ||
        localStorage.getItem('venilearn_active_org_id') ||
        '66206e39-2029-4ce6-8be1-cfa7176fb79f'
      : '66206e39-2029-4ce6-8be1-cfa7176fb79f';

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    'X-Tenant-ID': tenantId,
  };
}

/**
 * Convert frontend QuizAssessmentConfig into backend-compatible Assessment payload
 */
export function mapConfigToBackendPayload(
  config: QuizAssessmentConfig,
  context?: { courseId?: string; moduleId?: string; lessonId?: string }
): BackendAssessmentPayload {
  return {
    id: config.id && config.id.length === 36 ? config.id : undefined,
    title: config.title,
    instructions: config.description,
    courseId: context?.courseId,
    moduleId: context?.moduleId,
    lessonId: context?.lessonId,
    scope: config.scope,
    totalMarks: config.totalMarks || 100,
    durationMinutes: config.timeLimitMinutes || 60,
    maxAttempts: config.allowedAttempts ?? 1,
    passingPercentage: config.passingPercentage || 70,
    status: config.status === 'draft' ? 'draft' : 'published',
    negativeMarkingEnabled: config.negativeMarkingEnabled,
    negativeMarksPerQuestion: config.negativeMarksPerQuestion,
    randomizeQuestions: config.randomizeQuestions,
    questions: (config.questions || []).map((q, idx) => ({
      id: q.id && q.id.length === 36 ? q.id : undefined,
      prompt: q.prompt,
      type: q.type,
      points: q.points || 1,
      difficulty: q.difficulty || 'medium',
      explanation: q.explanation,
      topic: q.topic,
      correctAnswerText: q.correctAnswerText,
      options: (q.options || []).map((o, optIdx) => ({
        id: o.id && o.id.length === 36 ? o.id : undefined,
        text: o.text,
        isCorrect: Boolean(o.isCorrect),
        order: optIdx + 1,
      })),
    })),
  };
}

/**
 * Convert backend Assessment response into frontend QuizAssessmentConfig
 */
export function mapBackendResponseToConfig(resp: BackendAssessmentResponse): QuizAssessmentConfig {
  const questions: QuizQuestionItem[] = (resp.questions || []).map((q) => ({
    id: q.id,
    prompt: q.prompt,
    type: q.type as any,
    points: q.points || 1,
    difficulty: (q.difficulty as any) || 'medium',
    explanation: q.explanation,
    topic: q.topic,
    correctAnswerText: q.correctAnswerText,
    source: 'ai',
    options: (q.options || []).map((o) => ({
      id: o.id,
      text: o.text,
      isCorrect: Boolean(o.isCorrect),
    })),
  }));

  return {
    id: resp.id,
    title: resp.title,
    description: resp.instructions || '',
    scope: resp.scope,
    difficulty: 'medium',
    timeLimitMinutes: resp.durationMinutes,
    passingPercentage: resp.passingPercentage,
    allowedAttempts: resp.maxAttempts,
    totalMarks: resp.totalMarks,
    questions,
    status: resp.status === 'draft' ? 'draft' : 'ready',
    createdAt: resp.createdAt,
    updatedAt: resp.updatedAt,
  };
}

/**
 * Create Assessment in PostgreSQL
 */
export async function createAssessmentApi(
  payload: BackendAssessmentPayload
): Promise<BackendAssessmentResponse> {
  const res = await apiClient.post<BackendAssessmentResponse>('/assessments', payload);
  return res.data;
}

/**
 * Update Assessment in PostgreSQL
 */
export async function updateAssessmentApi(
  id: string,
  payload: Partial<BackendAssessmentPayload>
): Promise<BackendAssessmentResponse> {
  const res = await apiClient.patch<BackendAssessmentResponse>(`/assessments/${id}`, payload);
  return res.data;
}

/**
 * Get Assessment by ID from PostgreSQL
 */
export async function getAssessmentApi(id: string): Promise<BackendAssessmentResponse> {
  const res = await apiClient.get<BackendAssessmentResponse>(`/assessments/${id}`);
  return res.data;
}

/**
 * List Assessments by course/module/lesson
 */
export async function listAssessmentsApi(params?: {
  courseId?: string;
  moduleId?: string;
  lessonId?: string;
  scope?: string;
  status?: string;
}): Promise<BackendAssessmentResponse[]> {
  const query = new URLSearchParams();
  if (params?.courseId) query.set('courseId', params.courseId);
  if (params?.moduleId) query.set('moduleId', params.moduleId);
  if (params?.lessonId) query.set('lessonId', params.lessonId);
  if (params?.scope) query.set('scope', params.scope);
  if (params?.status) query.set('status', params.status);

  const endpoint = query.toString() ? `/assessments?${query.toString()}` : '/assessments';
  const res = await apiClient.get<BackendAssessmentResponse[]>(endpoint);
  return (res.data || []) as BackendAssessmentResponse[];
}

/**
 * Publish Assessment
 */
export async function publishAssessmentApi(id: string): Promise<{ success: boolean; status: string }> {
  const res = await apiClient.patch<{ success: boolean; status: string }>(`/assessments/${id}/publish`);
  return res.data;
}

/**
 * Unpublish Assessment (Draft)
 */
export async function unpublishAssessmentApi(id: string): Promise<{ success: boolean; status: string }> {
  const res = await apiClient.patch<{ success: boolean; status: string }>(`/assessments/${id}/unpublish`);
  return res.data;
}

/**
 * Delete Assessment (Soft-delete / Archive)
 */
export async function deleteAssessmentApi(id: string): Promise<{ success: boolean }> {
  const res = await apiClient.delete<{ success: boolean }>(`/assessments/${id}`);
  return res.data;
}

/**
 * Start Student Assessment Attempt
 */
export async function startAttemptApi(assessmentId: string): Promise<{
  attemptId: string;
  assessment: {
    id: string;
    title: string;
    instructions?: string;
    durationMinutes: number;
    totalMarks: number;
    scope: string;
    passingPercentage: number;
    questions: Array<{
      id: string;
      prompt: string;
      type: string;
      points: number;
      difficulty: string;
      topic?: string;
      options: Array<{ id: string; text: string }>;
    }>;
  };
  startedAt: string;
}> {
  const res = await apiClient.post<{
    attemptId: string;
    assessment: any;
    startedAt: string;
  }>(`/assessments/${assessmentId}/start`);

  return res.data;
}

/**
 * Save Student Answer to Attempt
 */
export async function saveAnswerApi(
  attemptId: string,
  questionId: string,
  answer: string,
  isFlagged = false
): Promise<any> {
  const res = await apiClient.post(`/assessments/attempts/${attemptId}/answer`, {
    questionId,
    answer,
    isFlagged,
  });
  return res.data;
}

/**
 * Submit Student Attempt
 */
export async function submitAttemptApi(attemptId: string): Promise<{
  attemptId: string;
  score: number;
  totalMarks: number;
  percentage: number;
  passed: boolean;
  evaluationStatus: string;
  submittedAt: string;
}> {
  const res = await apiClient.post<{
    attemptId: string;
    score: number;
    totalMarks: number;
    percentage: number;
    passed: boolean;
    evaluationStatus: string;
    submittedAt: string;
  }>(`/assessments/attempts/${attemptId}/submit`, { attemptId });

  return res.data;
}

/**
 * Get Student Attempt Result
 */
export async function getAttemptResultApi(attemptId: string): Promise<{
  attemptId: string;
  assessmentId: string;
  assessmentTitle: string;
  score: number;
  totalMarks: number;
  percentage: number;
  passed: boolean;
  status: string;
  evaluationStatus: string;
  submittedAt: string;
  feedback?: string;
  questions: Array<{
    id: string;
    prompt: string;
    type: string;
    points: number;
    explanation?: string;
    studentAnswer?: string | null;
    correctAnswerText?: string;
    options: Array<{ id: string; text: string; isCorrect?: boolean }>;
  }>;
}> {
  const res = await apiClient.get<any>(`/assessments/attempts/${attemptId}/result`);
  return res.data;
}

