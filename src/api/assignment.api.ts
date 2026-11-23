// =========================================================================
// LMS - Course Assignment Backend API Client (PostgreSQL Persistence)
// =========================================================================
import { apiClient } from '../lib/apiClient';
import { CourseAssignment, StudentSubmissionRecord } from '../pages/Assessments/components/AssignmentGradingModal';

export interface CreateAssignmentPayload {
  courseId: string;
  cohortId?: string;
  title: string;
  description: string;
  dueDate?: string;
  totalMarks?: number;
  submissionFormat?: 'file' | 'repo' | 'text';
}

export interface SubmitDeliverablePayload {
  submissionUrl: string;
  submissionNotes?: string;
}

export interface GradeSubmissionPayload {
  score: number;
  letterGrade?: string;
  feedback?: string;
}

/**
 * Fetch all course assignments with real submission counts and learner state from PostgreSQL
 */
export async function fetchAssignmentsApi(params?: { courseId?: string; cohortId?: string }): Promise<CourseAssignment[]> {
  const query = new URLSearchParams();
  if (params?.courseId) query.append('courseId', params.courseId);
  if (params?.cohortId) query.append('cohortId', params.cohortId);

  const endpoint = `/assignments${query.toString() ? `?${query.toString()}` : ''}`;
  const res = await apiClient.get<CourseAssignment[]>(endpoint);
  return (res as any)?.data || res || [];
}

/**
 * Create a new course assignment in PostgreSQL
 */
export async function createAssignmentApi(payload: CreateAssignmentPayload): Promise<CourseAssignment> {
  const res = await apiClient.post<CourseAssignment>('/assignments', payload);
  return (res as any)?.data || res;
}

/**
 * Student submits a deliverable (GitHub repo or archive link) to PostgreSQL
 */
export async function submitAssignmentDeliverableApi(
  assignmentId: string,
  payload: SubmitDeliverablePayload
): Promise<any> {
  const res = await apiClient.post(`/assignments/${assignmentId}/submit`, payload);
  return (res as any)?.data || res;
}

/**
 * Grader fetches all student submissions for an assignment
 */
export async function fetchAssignmentSubmissionsApi(assignmentId: string): Promise<StudentSubmissionRecord[]> {
  const res = await apiClient.get<StudentSubmissionRecord[]>(`/assignments/${assignmentId}/submissions`);
  return (res as any)?.data || res || [];
}

/**
 * Grader publishes marks, letter grade, and rubric critique to PostgreSQL
 */
export async function gradeAssignmentSubmissionApi(
  assignmentId: string,
  submissionId: string,
  payload: GradeSubmissionPayload
): Promise<any> {
  const res = await apiClient.post(
    `/assignments/${assignmentId}/submissions/${submissionId}/grade`,
    payload
  );
  return (res as any)?.data || res;
}
