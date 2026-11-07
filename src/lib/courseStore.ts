// ============================================================
// LMS - Course & Shareable Enrollment Store (Zustand)
// Manages course persistence, curriculum, and multi-tenant enrollments.
// Synchronizes seamlessly with PostgreSQL backend API.
// ============================================================
import { create } from 'zustand';
import { Course, Enrollment, EntityStatus } from '../types';

import { apiClient } from './apiClient';

interface CourseState {
  courses: Course[];
  enrolledCourseIds: string[];
  requestedCourseIds: string[];
  enrollments: Enrollment[];
  adminEnrollments: any[];
  fetchAdminEnrollments: () => Promise<any[]>;
  isLoading: boolean;
  isCoursesLoading: boolean;
  error: string | null;

  // Actions
  getCourseById: (id: string) => Course | undefined;
  isEnrolled: (courseId: string) => boolean;
  hasRequested: (courseId: string) => boolean;
  updateCourseShareSettings: (courseId: string, settings: {
    shareableLinkEnabled?: boolean;
    enrollmentDeadline?: string;
    enrollmentCapacity?: number;
    enrollmentApprovalRequired?: boolean;
  }) => void;
  updateCourseStatus: (courseId: string, status: EntityStatus) => Promise<boolean>;
  enrollInCourse: (courseId: string, userId?: string) => {
    success: boolean;
    message: string;
    requiresApproval?: boolean;
  };
  enrollCourse: (courseId: string, userId?: string) => {
    success: boolean;
    message: string;
    requiresApproval?: boolean;
  };
  requestToJoinCourse: (courseId: string, userId?: string) => {
    success: boolean;
    message: string;
  };
  assignLeadFaculty: (courseId: string, facultyId: string) => {
    success: boolean;
    message: string;
  };
  assignStudentsToCourse: (courseId: string, studentIds: string[], cohortId?: string) => {
    success: boolean;
    addedCount: number;
    alreadyEnrolledCount: number;
    message: string;
  };
  fetchCourses: (force?: boolean) => Promise<Course[]>;
  saveCourse: (course: Course, studentIds?: string[], isEditMode?: boolean) => Promise<{
    success: boolean;
    course?: Course;
    error?: string;
  }>;
  addCourse: (course: Course) => Promise<Course>;
  updateCourse: (courseId: string, course: Partial<Course>, studentIds?: string[]) => Promise<Course>;
  deleteCourse: (courseId: string) => Promise<boolean>;
  updateCourseProgress: (courseId: string, progress: number) => void;
  recordLessonProgress: (courseId: string, lessonId: string, timeSpentSeconds?: number) => Promise<any>;
}

const STORAGE_KEY_COURSES = 'venilearn_courses';
const STORAGE_KEY_INITIALIZED = 'venilearn_courses_initialized';
const STORAGE_KEY_ENROLLED = 'venilearn_enrolled_courses';
const STORAGE_KEY_REQUESTED = 'venilearn_requested_courses';
const STORAGE_KEY_ENROLLMENTS = 'venilearn_enrollments';
const STORE_VERSION_KEY = 'venilearn_courses_store_version';
const CURRENT_STORE_VERSION = 'v4_clean_production_sync';

// Automatically bust stale client-side caches from previous prototype/mock data
if (typeof window !== 'undefined') {
  try {
    const cachedVer = localStorage.getItem(STORE_VERSION_KEY);
    if (cachedVer !== CURRENT_STORE_VERSION) {
      localStorage.removeItem(STORAGE_KEY_COURSES);
      localStorage.removeItem(STORAGE_KEY_INITIALIZED);
      localStorage.removeItem(STORAGE_KEY_ENROLLED);
      localStorage.removeItem(STORAGE_KEY_REQUESTED);
      localStorage.removeItem(STORAGE_KEY_ENROLLMENTS);
      // Clean up legacy completed lessons keys
      Object.keys(localStorage).forEach((k) => {
        if (k.startsWith('venilearn_completed_lessons_crs') || k.startsWith('venilearn_completed_lessons_kjl')) {
          localStorage.removeItem(k);
        }
      });
      localStorage.setItem(STORE_VERSION_KEY, CURRENT_STORE_VERSION);
    }
  } catch { }
}

// Helper to normalize and map backend API course record into frontend Course object
export function mapBackendCourseToFrontend(item: any): Course {
  const fallbackOrg = typeof window !== 'undefined'
    ? (sessionStorage.getItem('venilearn_active_org_id') || localStorage.getItem('venilearn_active_tenant_id') || 'org-001')
    : 'org-001';

  return {
    id: item.id,
    title: item.title,
    shortDescription: item.shortDescription || (item.description ? item.description.slice(0, 140) + '...' : ''),
    description: item.description || '',
    thumbnail: item.thumbnailUrl || item.thumbnail || '',
    category: item.category || 'General',
    departmentId: item.departmentId || undefined,
    tags: Array.isArray(item.tags) ? item.tags : [],
    language: item.language || 'English',
    audience: item.audience || undefined,
    estimatedDuration: item.estimatedDuration || (item.durationHours ? item.durationHours * 60 : 60),
    durationHours: item.durationHours || 1,
    instructors: Array.isArray(item.instructors) ? item.instructors : [],
    status: (item.status as EntityStatus) || 'draft',
    visibility: item.visibility || 'public',
    version: item.version || 1,
    completionPolicy: item.completionPolicy || undefined,
    modules: Array.isArray(item.modules)
      ? item.modules.map((m: any, mIdx: number) => ({
        id: m.id || `mod-${mIdx + 1}`,
        title: m.title || `Module ${mIdx + 1}`,
        description: m.description || undefined,
        order: m.order || mIdx + 1,
        assessment: m.assessment ? {
          ...m.assessment,
          questions: Array.isArray(m.assessment.questions) ? m.assessment.questions : []
        } : undefined,
        lessons: Array.isArray(m.lessons)
          ? m.lessons.map((l: any, lIdx: number) => ({
            id: l.id || `les-${mIdx + 1}-${lIdx + 1}`,
            title: l.title || `Lesson ${lIdx + 1}`,
            type: l.type || 'video',
            content: l.content || undefined,
            contentUrl: l.contentUrl || undefined,
            duration: l.durationMinutes || l.duration || 15,
            durationMinutes: l.durationMinutes || l.duration || 15,
            order: l.order || lIdx + 1,
            isRequired: l.isRequired !== false,
            isPreview: Boolean(l.isPreview),
            status: l.status || 'published',
            quizConfig: l.quizConfig ? {
              ...l.quizConfig,
              questions: Array.isArray(l.quizConfig.questions) ? l.quizConfig.questions : []
            } : undefined,
            uploadedDocument: (l.uploadedDocument && (l.uploadedDocument.name || l.uploadedDocument.url))
              ? l.uploadedDocument
              : (l.type === 'document' && l.contentUrl
                ? {
                    id: `doc-${l.id || lIdx + 1}`,
                    name: l.contentUrl.split('?')[0].split('/').pop() || `${l.title || 'Curriculum'}.pdf`,
                    url: l.contentUrl,
                    type: l.contentUrl.toLowerCase().includes('.pdf') ? 'application/pdf' : 'application/octet-stream',
                    size: 1500000,
                  }
                : undefined),
            videoInfo: l.videoInfo || (l.contentUrl ? { id: l.id, url: l.contentUrl, title: l.title, sourceType: 'upload' } : undefined),
          }))
          : [],
      }))
      : [],
    learnerCount: item.learnerCount || item._count?.enrollments || 0,
    enrolledLearners: item.learnerCount || item._count?.enrollments || 0,
    completionRate: item.completionRate || 0,
    level: item.level || 'Beginner',
    learningOutcomes: Array.isArray(item.learningOutcomes) ? item.learningOutcomes : [],
    prerequisites: Array.isArray(item.prerequisites) ? item.prerequisites : [],
    shareableLinkEnabled: Boolean(item.shareableLinkEnabled),
    enrollmentDeadline: item.enrollmentDeadline || undefined,
    enrollmentCapacity: item.enrollmentCapacity || undefined,
    enrollmentApprovalRequired: Boolean(item.enrollmentApprovalRequired),
    createdBy: item.createdBy || undefined,
    startDate: item.startDate || undefined,
    endDate: item.endDate || undefined,
    completionPercentageRequired: item.completionPercentageRequired || 80,
    completionPoints: item.completionPoints || 100,
    finalAssessment: (item.finalAssessmentConfig || item.finalAssessment) ? {
      ...(item.finalAssessmentConfig || item.finalAssessment),
      questions: Array.isArray((item.finalAssessmentConfig || item.finalAssessment).questions)
        ? (item.finalAssessmentConfig || item.finalAssessment).questions
        : []
    } : undefined,
    certificateConfig: item.certificateConfig || undefined,
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: item.updatedAt || new Date().toISOString(),
    organizationId: item.tenantId || item.organizationId || fallbackOrg,
  };
}

// Safely load cached state from localStorage
function loadInitialCourses(): Course[] {
  try {
    const cached = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_COURSES) : null;
    if (cached !== null) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((c: Course) => ({
          ...c,
          organizationId: c.organizationId || '871abf8a-e563-4d0f-afc7-416d8da3df14',
          modules: (c.modules || []).map((m: any) => ({
            ...m,
            assessment: m.assessment ? {
              ...m.assessment,
              questions: Array.isArray(m.assessment.questions) ? m.assessment.questions : []
            } : undefined,
            lessons: Array.isArray(m.lessons) ? m.lessons.map((l: any) => ({
              ...l,
              quizConfig: l.quizConfig ? {
                ...l.quizConfig,
                questions: Array.isArray(l.quizConfig.questions) ? l.quizConfig.questions : []
              } : undefined
            })) : [],
          })),
          finalAssessment: c.finalAssessment ? {
            ...c.finalAssessment,
            questions: Array.isArray(c.finalAssessment.questions) ? c.finalAssessment.questions : []
          } : undefined,
        }));
      }
    }
  } catch (e) {
    console.error('Failed to parse courses from storage', e);
  }
  return [];
}

function loadInitialEnrolled(): string[] {
  try {
    const cached = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_ENROLLED) : null;
    if (cached !== null) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) {
        return parsed
          .map((e: any) => (typeof e === 'string' ? e : e.courseId || e.id))
          .filter((id: string) => typeof id === 'string');
      }
    }
  } catch (e) {
    console.error('Failed to parse enrolled courses from storage', e);
  }
  return [];
}

function loadInitialRequested(): string[] {
  try {
    const cached = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_REQUESTED) : null;
    if (cached !== null) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to parse requested courses from storage', e);
  }
  return [];
}

function loadInitialEnrollments(): Enrollment[] {
  try {
    const cached = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_ENROLLMENTS) : null;
    if (cached !== null) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to parse enrollments from storage', e);
  }
  return [];
}

let inFlightFetchCoursesPromise: Promise<Course[]> | null = null;

export const useCourseStore = create<CourseState>((set, get) => ({
  courses: loadInitialCourses(),
  enrolledCourseIds: loadInitialEnrolled(),
  requestedCourseIds: loadInitialRequested(),
  enrollments: loadInitialEnrollments(),
  adminEnrollments: [],
  fetchAdminEnrollments: async () => {
    try {
      const res = await apiClient.get<any>('/courses/admin/enrollments');
      const items = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res)
        ? res
        : (res?.data as any)?.items || [];
      if (Array.isArray(items)) {
        set({ adminEnrollments: items });
        return items;
      }
    } catch (e) {
      console.warn('Failed to fetch admin enrollments:', e);
    }
    return [];
  },
  isLoading: false,
  isCoursesLoading: false,
  error: null,

  fetchCourses: async (force = false) => {
    if (inFlightFetchCoursesPromise && !force) {
      return inFlightFetchCoursesPromise;
    }

    set({ isLoading: true, isCoursesLoading: true, error: null });

    inFlightFetchCoursesPromise = (async () => {
      try {
        const [coursesRes, enrollmentsRes] = await Promise.all([
          apiClient.get<any>('/courses?limit=200').catch((err) => {
            console.warn('[CourseStore] Courses request error:', err);
            return null;
          }),
          apiClient.get<any>('/courses/my-enrollments').catch((err) => {
            console.warn('[CourseStore] Enrollments request error:', err);
            return null;
          }),
        ]);

        let backendCourses: Course[] = [];
        if (coursesRes && coursesRes.data) {
          const rawItems = Array.isArray(coursesRes.data)
            ? coursesRes.data
            : (coursesRes.data as any).items || [];
          backendCourses = rawItems.map(mapBackendCourseToFrontend);

          set({ courses: backendCourses });
          try {
            localStorage.setItem(STORAGE_KEY_COURSES, JSON.stringify(backendCourses));
            localStorage.setItem(STORAGE_KEY_INITIALIZED, 'true');
          } catch (e) { }
        } else {
          // If network failed or rate limited, ensure existing courses or localStorage cache are loaded
          const cached = loadInitialCourses();
          if (cached && cached.length > 0 && get().courses.length === 0) {
            set({ courses: cached });
          }
        }

        if (enrollmentsRes && enrollmentsRes.data && Array.isArray(enrollmentsRes.data)) {
          const backendEnrolledIds = (enrollmentsRes.data as any[]).map((e: any) => e.courseId);
          const mappedEnrollments: Enrollment[] = (enrollmentsRes.data as any[]).map((e: any) => {
            const completedLids: string[] = Array.isArray(e.lessonProgress)
              ? e.lessonProgress.filter((lp: any) => lp.isCompleted).map((lp: any) => lp.lessonId)
              : [];
            if (e.courseId && completedLids.length > 0) {
              try {
                localStorage.setItem(`venilearn_completed_lessons_${e.courseId}`, JSON.stringify(completedLids));
              } catch { }
            }
            return {
              id: e.id,
              userId: e.userId,
              courseId: e.courseId,
              cohortId: e.cohortId,
              status: e.status || 'active',
              progress: e.progressPercentage || (completedLids.length > 0 ? Math.round((completedLids.length / 10) * 100) : 0),
              enrolledAt: e.enrolledAt || e.assignedAt || new Date().toISOString(),
              completedLessonIds: completedLids,
            };
          });

          set({
            enrolledCourseIds: backendEnrolledIds,
            enrollments: mappedEnrollments,
          });
          try {
            localStorage.setItem(STORAGE_KEY_ENROLLED, JSON.stringify(backendEnrolledIds));
            localStorage.setItem(STORAGE_KEY_ENROLLMENTS, JSON.stringify(mappedEnrollments));
          } catch (e) { }
        }
        return get().courses;
      } catch (err: any) {
        console.warn('[CourseStore] Failed to fetch courses from backend API:', err);
        set({ error: err.message || 'Failed to load courses' });
        return get().courses;
      } finally {
        set({ isLoading: false, isCoursesLoading: false });
        inFlightFetchCoursesPromise = null;
      }
    })();

    return inFlightFetchCoursesPromise;
  },

  getCourseById: (id: string) => {
    const { courses } = get();
    return courses.find(
      (c) =>
        c.id.toLowerCase() === id.toLowerCase() ||
        (c.slug && c.slug.toLowerCase() === id.toLowerCase()) ||
        ((c as any).code && (c as any).code.toLowerCase() === id.toLowerCase())
    );
  },

  isEnrolled: (courseId: string) => {
    const { enrolledCourseIds } = get();
    return enrolledCourseIds.includes(courseId);
  },

  hasRequested: (courseId: string) => {
    const { requestedCourseIds } = get();
    return requestedCourseIds.includes(courseId);
  },

  updateCourseShareSettings: (courseId, settings) => {
    set((state) => {
      const updatedCourses = state.courses.map((c) =>
        c.id === courseId
          ? {
            ...c,
            ...settings,
            updatedAt: new Date().toISOString(),
          }
          : c
      );
      try {
        localStorage.setItem(STORAGE_KEY_COURSES, JSON.stringify(updatedCourses));
      } catch (e) { }
      return { courses: updatedCourses };
    });
  },

  updateCourseStatus: async (courseId, status) => {
    try {
      await apiClient.patch(`/courses/${courseId}/status`, { status });
    } catch (err) {
      console.warn('Backend updateStatus note:', err);
    }
    const updatedCourses = get().courses.map((c) =>
      c.id === courseId
        ? {
          ...c,
          status,
          shareableLinkEnabled: status === 'published' ? (c.shareableLinkEnabled ?? true) : false,
          updatedAt: new Date().toISOString(),
        }
        : c
    );
    set({ courses: updatedCourses });
    try {
      localStorage.setItem(STORAGE_KEY_COURSES, JSON.stringify(updatedCourses));
    } catch (e) { }
    return true;
  },

  enrollInCourse: (courseId, userId = 'u-007') => {
    const { courses, enrolledCourseIds } = get();
    const course = courses.find((c) => c.id === courseId || (c as any).slug === courseId);

    if (!course) {
      return { success: false, message: 'Course not found.' };
    }

    if (course.status !== 'published') {
      return { success: false, message: 'Course is not published for open enrollment.' };
    }

    if (course.shareableLinkEnabled === false) {
      return { success: false, message: 'Course link has been deactivated by administrator.' };
    }

    if (enrolledCourseIds.includes(course.id)) {
      return { success: false, message: 'You are already enrolled in this course.' };
    }

    if (course.enrollmentDeadline) {
      const deadline = new Date(course.enrollmentDeadline);
      const today = new Date();
      if (today > deadline) {
        return { success: false, message: 'Enrollment deadline for this course has expired.' };
      }
    }

    const currentEnrolled = course.enrolledLearners ?? course.learnerCount ?? 0;
    const capacityLimit = course.enrollmentCapacity ?? 100;
    if (currentEnrolled >= capacityLimit) {
      return { success: false, message: 'This course has reached its maximum seat capacity.' };
    }

    if (course.enrollmentApprovalRequired) {
      const { requestedCourseIds } = get();
      if (!requestedCourseIds.includes(course.id)) {
        const nextRequested = [...requestedCourseIds, course.id];
        set({ requestedCourseIds: nextRequested });
        try {
          localStorage.setItem(STORAGE_KEY_REQUESTED, JSON.stringify(nextRequested));
        } catch (e) { }
      }
      return {
        success: true,
        requiresApproval: true,
        message: 'Enrollment request submitted to institution admin for approval.',
      };
    }

    const nextEnrolled = [...enrolledCourseIds, course.id];
    const newEnrollment: Enrollment = {
      id: `enr-${Date.now()}`,
      userId,
      courseId: course.id,
      status: 'active',
      progress: 0,
      enrolledAt: new Date().toISOString(),
    };

    const updatedCourses = courses.map((c) =>
      c.id === course.id
        ? {
          ...c,
          learnerCount: (c.learnerCount || 0) + 1,
          enrolledLearners: (c.enrolledLearners || 0) + 1,
          updatedAt: new Date().toISOString(),
        }
        : c
    );

    set((state) => ({
      enrolledCourseIds: nextEnrolled,
      courses: updatedCourses,
      enrollments: [newEnrollment, ...state.enrollments],
    }));

    try {
      localStorage.setItem(STORAGE_KEY_ENROLLED, JSON.stringify(nextEnrolled));
      localStorage.setItem(STORAGE_KEY_COURSES, JSON.stringify(updatedCourses));
      apiClient.post(`/courses/${course.id}/enroll`, {}).catch((err) => {
        console.warn('Backend enrollment sync note:', err);
      });
    } catch (e) { }

    return {
      success: true,
      requiresApproval: false,
      message: `Successfully enrolled in "${course.title}". Welcome to the course!`,
    };
  },

  enrollCourse: (courseId, userId) => get().enrollInCourse(courseId, userId),

  requestToJoinCourse: (courseId) => {
    const { requestedCourseIds } = get();
    if (requestedCourseIds.includes(courseId)) {
      return { success: true, message: 'Your request is already pending administrator approval.' };
    }
    const nextRequested = [...requestedCourseIds, courseId];
    set({ requestedCourseIds: nextRequested });
    try {
      localStorage.setItem(STORAGE_KEY_REQUESTED, JSON.stringify(nextRequested));
    } catch (e) { }
    return { success: true, message: 'Join request submitted to campus administrator.' };
  },

  assignLeadFaculty: (courseId, facultyId) => {
    const { courses } = get();
    const target = courses.find((c) => c.id === courseId || (c as any).slug === courseId);
    if (!target) {
      return { success: false, message: 'Course not found.' };
    }

    const updatedCourses = courses.map((c) => {
      if (c.id === target.id) {
        const existing = c.instructors || [];
        const nextInstructors = [facultyId, ...existing.filter((id) => id !== facultyId)];
        return {
          ...c,
          instructors: nextInstructors,
          updatedAt: new Date().toISOString(),
        };
      }
      return c;
    });

    set({ courses: updatedCourses });
    try {
      localStorage.setItem(STORAGE_KEY_COURSES, JSON.stringify(updatedCourses));
    } catch (e) { }

    return { success: true, message: 'Lead faculty assigned successfully.' };
  },

  assignStudentsToCourse: (courseId, studentIds, cohortId) => {
    const { courses, enrollments } = get();
    const targetCourse = courses.find((c) => c.id === courseId || (c as any).slug === courseId);
    if (!targetCourse) {
      return {
        success: false,
        addedCount: 0,
        alreadyEnrolledCount: 0,
        message: 'Course not found.',
      };
    }

    const actualCourseId = targetCourse.id;
    const existingEnrolledIds = new Set(
      enrollments.filter((e) => e.courseId === actualCourseId).map((e) => e.userId)
    );

    const eligibleIdsToEnroll = studentIds.filter((sId) => !existingEnrolledIds.has(sId));
    const alreadyEnrolledCount = studentIds.length - eligibleIdsToEnroll.length;

    if (eligibleIdsToEnroll.length === 0) {
      return {
        success: false,
        addedCount: 0,
        alreadyEnrolledCount,
        message: 'All selected students are already enrolled in this course.',
      };
    }

    const newEnrollments: Enrollment[] = eligibleIdsToEnroll.map((sId, idx) => ({
      id: `enr-${Date.now()}-${idx}`,
      userId: sId,
      courseId: actualCourseId,
      cohortId: cohortId || undefined,
      status: 'active',
      progress: 0,
      enrolledAt: new Date().toISOString(),
    }));

    const nextEnrollments = [...newEnrollments, ...enrollments];

    const updatedCourses = courses.map((c) => {
      if (c.id === actualCourseId) {
        const currentCount = c.enrolledLearners ?? c.learnerCount ?? 0;
        const newTotal = currentCount + eligibleIdsToEnroll.length;
        return {
          ...c,
          learnerCount: newTotal,
          enrolledLearners: newTotal,
          updatedAt: new Date().toISOString(),
        };
      }
      return c;
    });

    set({
      courses: updatedCourses,
      enrollments: nextEnrollments,
    });

    try {
      localStorage.setItem(STORAGE_KEY_COURSES, JSON.stringify(updatedCourses));
      localStorage.setItem(STORAGE_KEY_ENROLLMENTS, JSON.stringify(nextEnrollments));
      apiClient.post(`/courses/${actualCourseId}/assign-students`, {
        studentIds: eligibleIdsToEnroll,
        cohortId
      }).catch((syncErr) => console.warn("Background course sync note:", syncErr));
    } catch (syncErr) {
      console.warn('Background course sync note:', syncErr);
    }

    return {
      success: true,
      addedCount: eligibleIdsToEnroll.length,
      alreadyEnrolledCount,
      message: `Successfully enrolled ${eligibleIdsToEnroll.length} student${eligibleIdsToEnroll.length === 1 ? '' : 's'} in "${targetCourse.title}".`,
    };
  },

  addCourse: async (course: Course): Promise<Course> => {
    const fallbackOrg = typeof window !== 'undefined'
      ? (sessionStorage.getItem('venilearn_active_org_id') || localStorage.getItem('venilearn_active_tenant_id') || '871abf8a-e563-4d0f-afc7-416d8da3df14')
      : '871abf8a-e563-4d0f-afc7-416d8da3df14';

    let persistedCourse: Course = {
      ...course,
      organizationId: course.organizationId || fallbackOrg,
    };

    // Sanitize departmentId: only send if valid UUID
    const sanitizedDeptId = course.departmentId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(course.departmentId)
      ? course.departmentId
      : undefined;

    const payload = {
      title: course.title,
      slug: course.slug || course.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
      description: course.description || 'Comprehensive course syllabus and curriculum modules.',
      shortDescription: course.shortDescription,
      category: course.category || 'General',
      departmentId: sanitizedDeptId,
      level: course.level || 'Beginner',
      durationHours: course.durationHours || 10,
      status: course.status || 'draft',
      thumbnailUrl: course.thumbnail || (course as any).thumbnailUrl,
      shareableLinkEnabled: course.shareableLinkEnabled ?? true,
      enrollmentCapacity: course.enrollmentCapacity,
      enrollmentDeadline: course.enrollmentDeadline,
      enrollmentApprovalRequired: course.enrollmentApprovalRequired,
      completionPercentageRequired: course.completionPercentageRequired || 80,
      completionPoints: course.completionPoints || 100,
      instructors: course.instructors || [],
      modules: (course.modules || []).map((m, mIdx) => ({
        ...(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(m.id) ? { id: m.id } : {}),
        title: m.title || `Module ${mIdx + 1}`,
        description: m.description,
        order: m.order || mIdx + 1,
        assessment: m.assessment,
        lessons: (m.lessons || []).map((l, lIdx) => ({
          ...(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(l.id) ? { id: l.id } : {}),
          title: l.title || `Lesson ${lIdx + 1}`,
          description: l.description,
          type: l.type || 'rich_text',
          content: l.content,
          contentUrl: (l as any).videoInfo?.url || (l as any).uploadedDocument?.url || l.videoUrl || (l as any).contentUrl,
          durationMinutes: l.durationMinutes || 15,
          order: l.order || lIdx + 1,
          isRequired: l.isRequired ?? true,
          isPreview: l.isPreview ?? false,
          status: l.status || 'published',
          quizConfig: (l as any).quizConfig || {},
          uploadedDocument: (l as any).uploadedDocument || {},
        })),
      })),
      finalAssessmentConfig: course.finalAssessmentConfig || course.finalAssessment,
      certificateConfig: course.certificateConfig,
      evaluationCriteria: (course as any).evaluationCriteria,
    };

    // 1. Authoritative write to PostgreSQL
    const res = await apiClient.post<any>('/courses', payload);
    if (res && res.data) {
      const c = res.data;
      persistedCourse = mapBackendCourseToFrontend(c);
    } else {
      throw new Error('Course creation failed: empty response from backend database API');
    }

    // 2. Synchronize store & local storage cache
    set((state) => {
      const exists = state.courses.some((c) => c.id === persistedCourse.id);
      const updatedCourses = exists
        ? state.courses.map((c) => (c.id === persistedCourse.id ? persistedCourse : c))
        : [persistedCourse, ...state.courses];
      try {
        localStorage.setItem(STORAGE_KEY_COURSES, JSON.stringify(updatedCourses));
        localStorage.setItem(STORAGE_KEY_INITIALIZED, 'true');
      } catch (e) {
        console.error('Failed to save courses to storage', e);
      }
      return { courses: updatedCourses };
    });

    return persistedCourse;
  },

  updateCourse: async (courseId: string, course: Partial<Course>, studentIds: string[] = []) => {
    if (!courseId) {
      throw new Error('Course ID is required for updating an existing course.');
    }

    const sanitizedDeptId = course.departmentId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(course.departmentId)
      ? course.departmentId
      : undefined;

    const payload = {
      id: courseId,
      title: course.title,
      slug: course.slug,
      description: course.description,
      shortDescription: course.shortDescription,
      category: course.category,
      departmentId: sanitizedDeptId,
      level: course.level,
      durationHours: course.durationHours,
      status: course.status,
      thumbnailUrl: course.thumbnail || (course as any).thumbnailUrl,
      shareableLinkEnabled: course.shareableLinkEnabled,
      enrollmentCapacity: course.enrollmentCapacity,
      enrollmentDeadline: course.enrollmentDeadline,
      enrollmentApprovalRequired: course.enrollmentApprovalRequired,
      completionPercentageRequired: course.completionPercentageRequired,
      completionPoints: course.completionPoints,
      instructors: course.instructors || [],
      studentIds,
      modules: (course.modules || []).map((m, mIdx) => ({
        ...(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(m.id) ? { id: m.id } : {}),
        title: m.title || `Module ${mIdx + 1}`,
        description: m.description,
        order: m.order || mIdx + 1,
        assessment: m.assessment,
        lessons: (m.lessons || []).map((l, lIdx) => ({
          ...(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(l.id) ? { id: l.id } : {}),
          title: l.title || `Lesson ${lIdx + 1}`,
          description: l.description,
          type: l.type || 'rich_text',
          content: l.content,
          contentUrl: (l as any).videoInfo?.url || (l as any).uploadedDocument?.url || l.videoUrl || (l as any).contentUrl,
          durationMinutes: l.durationMinutes || 15,
          order: l.order || lIdx + 1,
          isRequired: l.isRequired ?? true,
          isPreview: l.isPreview ?? false,
          status: l.status || 'published',
          quizConfig: (l as any).quizConfig || {},
          uploadedDocument: (l as any).uploadedDocument || {},
        })),
      })),
      finalAssessmentConfig: course.finalAssessmentConfig || course.finalAssessment,
      certificateConfig: course.certificateConfig,
      evaluationCriteria: (course as any).evaluationCriteria,
    };

    // Authoritative update to PostgreSQL
    const res = await apiClient.put<any>(`/courses/${courseId}`, payload);
    if (!res || !res.data) {
      throw new Error('Course update failed: empty response from backend database API');
    }

    const updatedCourse = mapBackendCourseToFrontend(res.data);

    // Update store state and cache in-place (no duplicates)
    set((state) => {
      const exists = state.courses.some((c) => c.id === updatedCourse.id);
      const updatedCourses = exists
        ? state.courses.map((c) => (c.id === updatedCourse.id ? updatedCourse : c))
        : [updatedCourse, ...state.courses];
      try {
        localStorage.setItem(STORAGE_KEY_COURSES, JSON.stringify(updatedCourses));
        localStorage.setItem(STORAGE_KEY_INITIALIZED, 'true');
      } catch (e) {
        console.error('Failed to save updated courses to storage', e);
      }
      return { courses: updatedCourses };
    });

    const safeStudentIds = Array.isArray(studentIds) ? studentIds : [];
    if (safeStudentIds.length > 0) {
      await get().assignStudentsToCourse(updatedCourse.id, safeStudentIds);
    }

    return updatedCourse;
  },

  saveCourse: async (course: Course, studentIds: string[] = [], isEditMode: boolean = false) => {
    try {
      set({ isLoading: true, error: null });
      const safeStudentIds = Array.isArray(studentIds) ? studentIds : [];
      const isExistingUuid = Boolean(course.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(course.id));
      const isKnownInStore = Boolean(course.id && get().courses.some((c) => c?.id && c.id.toLowerCase() === course.id.toLowerCase()));
      const shouldUpdate = isEditMode || isExistingUuid || isKnownInStore;

      let persisted: Course;
      if (shouldUpdate && course.id) {
        persisted = await get().updateCourse(course.id, course, safeStudentIds);
      } else {
        persisted = await get().addCourse(course);
        if (safeStudentIds.length > 0) {
          await get().assignStudentsToCourse(persisted.id, safeStudentIds);
        }
      }

      set({ isLoading: false });
      return { success: true, course: persisted };
    } catch (err: any) {
      console.error('[CourseStore] Error saving course to backend database:', err);
      const errMsg = err?.message || 'Database error occurred while persisting the course to PostgreSQL.';
      set({ isLoading: false, error: errMsg });
      return { success: false, error: errMsg };
    }
  },

  deleteCourse: async (courseId: string) => {
    try {
      await apiClient.delete(`/courses/${courseId}`);
    } catch (err) {
      console.warn('Backend course delete note:', err);
    }
    const updatedCourses = get().courses.filter((c) => c.id !== courseId);
    const updatedEnrolled = get().enrolledCourseIds.filter((id) => id !== courseId);
    const updatedEnrollments = get().enrollments.filter((e) => e.courseId !== courseId);
    set({
      courses: updatedCourses,
      enrolledCourseIds: updatedEnrolled,
      enrollments: updatedEnrollments,
    });
    try {
      localStorage.setItem(STORAGE_KEY_COURSES, JSON.stringify(updatedCourses));
      localStorage.setItem(STORAGE_KEY_ENROLLED, JSON.stringify(updatedEnrolled));
      localStorage.setItem(STORAGE_KEY_ENROLLMENTS, JSON.stringify(updatedEnrollments));
      localStorage.setItem(STORAGE_KEY_INITIALIZED, 'true');
    } catch (e) {
      console.error('Failed to save courses to storage', e);
    }
    return true;
  },

  updateCourseProgress: (courseId: string, progress: number) => {
    set((state) => {
      const existing = state.enrollments.find((e) => e.courseId?.toLowerCase() === courseId?.toLowerCase());
      const isCompleted = progress >= 100;
      let nextEnrollments: Enrollment[];
      if (existing) {
        nextEnrollments = state.enrollments.map((e) =>
          e.courseId?.toLowerCase() === courseId?.toLowerCase()
            ? { ...e, progress, status: isCompleted ? 'completed' : e.status }
            : e
        );
      } else {
        nextEnrollments = [
          ...state.enrollments,
          {
            id: `enr-${Date.now()}`,
            courseId,
            userId: 'current-user',
            cohortId: undefined,
            status: isCompleted ? 'completed' : 'active',
            progress,
            enrolledAt: new Date().toISOString(),
          },
        ];
      }
      try {
        localStorage.setItem(STORAGE_KEY_ENROLLMENTS, JSON.stringify(nextEnrollments));
      } catch (e) { }
      return { enrollments: nextEnrollments };
    });
  },

  recordLessonProgress: async (courseId: string, lessonId: string, timeSpentSeconds: number = 60) => {
    try {
      const res = await apiClient.post<any>(`/courses/${courseId}/lessons/${lessonId}/progress`, {
        timeSpentSeconds,
      });
      if (res && res.data && typeof res.data.progressPercentage === 'number') {
        get().updateCourseProgress(courseId, res.data.progressPercentage);
        return res.data;
      }
    } catch (err) {
      console.warn('Backend progress recording failed, falling back to local state:', err);
    }
    return null;
  },
}));

// Cross-tab synchronization
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY_COURSES && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        if (Array.isArray(parsed)) {
          useCourseStore.setState({
            courses: parsed.map((c: Course) => ({
              ...c,
              organizationId: c.organizationId || 'org-001',
            })),
          });
        }
      } catch (err) { }
    }
  });
}
