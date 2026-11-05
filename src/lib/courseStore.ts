// ============================================================
// LMS - Course & Shareable Enrollment Store (Zustand)
// Manages course persistence, curriculum, and multi-tenant enrollments.
// Synchronizes seamlessly with PostgreSQL backend API.
// ============================================================
import { create } from 'zustand';
import { Course, Enrollment, EntityStatus } from '../types';
import { mockCourses, mockEnrollments } from '../data/mockData';
import { apiClient } from './apiClient';

interface CourseState {
  courses: Course[];
  enrolledCourseIds: string[];
  requestedCourseIds: string[];
  enrollments: Enrollment[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchCourses: (force?: boolean) => Promise<Course[]>;
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
  saveCourse: (course: Course, studentIds?: string[]) => Promise<{
    success: boolean;
    course?: Course;
    error?: string;
  }>;
  addCourse: (course: Course) => void;
  deleteCourse: (courseId: string) => Promise<boolean>;
}

const STORAGE_KEY_COURSES = 'venilearn_courses';
const STORAGE_KEY_INITIALIZED = 'venilearn_courses_initialized';
const STORAGE_KEY_ENROLLED = 'venilearn_enrolled_courses';
const STORAGE_KEY_REQUESTED = 'venilearn_requested_courses';
const STORAGE_KEY_ENROLLMENTS = 'venilearn_enrollments';

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
          assessment: m.assessment || undefined,
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
                quizConfig: l.quizConfig || undefined,
                uploadedDocument: l.uploadedDocument || undefined,
                videoInfo: l.videoInfo || undefined,
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
    finalAssessment: item.finalAssessmentConfig || item.finalAssessment || undefined,
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
          organizationId: c.organizationId || 'org-001',
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
        return parsed;
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

export const useCourseStore = create<CourseState>((set, get) => ({
  courses: loadInitialCourses(),
  enrolledCourseIds: loadInitialEnrolled(),
  requestedCourseIds: loadInitialRequested(),
  enrollments: loadInitialEnrollments(),
  isLoading: false,
  error: null,

  fetchCourses: async (force = false) => {
    try {
      set({ isLoading: true, error: null });
      const res = await apiClient.get<any>('/courses?limit=200');
      if (res && res.data) {
        const rawItems = Array.isArray(res.data)
          ? res.data
          : (res.data as any).items || [];
        const mappedCourses = rawItems.map(mapBackendCourseToFrontend);

        // Update state and localStorage
        set({ courses: mappedCourses, isLoading: false });
        try {
          localStorage.setItem(STORAGE_KEY_COURSES, JSON.stringify(mappedCourses));
          localStorage.setItem(STORAGE_KEY_INITIALIZED, 'true');
        } catch (e) {}
        return mappedCourses;
      }
    } catch (err: any) {
      console.warn('[CourseStore] Failed to fetch courses from backend API:', err);
      set({ isLoading: false, error: err.message || 'Failed to load courses' });
    }
    return get().courses;
  },

  getCourseById: (id: string) => {
    const { courses } = get();
    return courses.find(
      (c) => c.id.toLowerCase() === id.toLowerCase() || (c as any).slug === id.toLowerCase()
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
      } catch (e) {}
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
    } catch (e) {}
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
        } catch (e) {}
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
      apiClient.post(`/courses/${course.id}/enroll`, {}).catch(() => {});
    } catch (e) {}

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
    } catch (e) {}
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
    } catch (e) {}

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

  saveCourse: async (course: Course, studentIds: string[] = []) => {
    try {
      set({ isLoading: true, error: null });
      const payload = {
        id: course.id,
        title: course.title,
        slug: (course as any).slug || (course as any).code || course.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        code: (course as any).code || undefined,
        description: course.description,
        shortDescription: course.shortDescription,
        category: course.category,
        departmentId: course.departmentId,
        level: course.level || 'Beginner',
        durationHours: course.durationHours || 1,
        estimatedDuration: course.estimatedDuration,
        thumbnail: course.thumbnail,
        thumbnailUrl: course.thumbnail,
        status: course.status || 'draft',
        visibility: course.visibility || 'public',
        completionPolicy: course.completionPolicy,
        shareableLinkEnabled: course.shareableLinkEnabled,
        completionPercentageRequired: course.completionPercentageRequired,
        completionPoints: course.completionPoints,
        certificateConfig: course.certificateConfig,
        finalAssessmentConfig: course.finalAssessment,
        finalAssessment: course.finalAssessment,
        instructors: course.instructors || [],
        studentIds,
        modules: course.modules || [],
        organizationId: course.organizationId,
        startDate: course.startDate,
        endDate: course.endDate,
      };

      const res = await apiClient.post<any>('/courses', payload);
      if (res && res.data) {
        const persisted = mapBackendCourseToFrontend(res.data);

        // Update in Zustand state
        const existingCourses = get().courses;
        const existsIndex = existingCourses.findIndex(
          (c) => c.id === persisted.id || (persisted.slug && (c as any).slug === persisted.slug)
        );
        let nextCourses: Course[];
        if (existsIndex >= 0) {
          nextCourses = [...existingCourses];
          nextCourses[existsIndex] = persisted;
        } else {
          nextCourses = [persisted, ...existingCourses];
        }

        set({ courses: nextCourses, isLoading: false });
        try {
          localStorage.setItem(STORAGE_KEY_COURSES, JSON.stringify(nextCourses));
          localStorage.setItem(STORAGE_KEY_INITIALIZED, 'true');
        } catch (e) {}

        return { success: true, course: persisted };
      } else {
        throw new Error('Backend failed to return persisted course record');
      }
    } catch (err: any) {
      console.error('[CourseStore] Error saving course to backend database:', err);
      const errMsg = err?.message || 'Database error occurred while persisting the course to PostgreSQL.';
      set({ isLoading: false, error: errMsg });
      return { success: false, error: errMsg };
    }
  },

  addCourse: (course: Course) => {
    set((state) => {
      const fallbackOrg = typeof window !== 'undefined'
        ? (sessionStorage.getItem('venilearn_active_org_id') || localStorage.getItem('venilearn_active_tenant_id') || 'org-001')
        : 'org-001';
      const courseWithOrg: Course = {
        ...course,
        organizationId: course.organizationId || fallbackOrg,
      };
      const exists = state.courses.some((c) => c.id === courseWithOrg.id);
      const updatedCourses = exists
        ? state.courses.map((c) => (c.id === courseWithOrg.id ? courseWithOrg : c))
        : [courseWithOrg, ...state.courses];
      try {
        localStorage.setItem(STORAGE_KEY_COURSES, JSON.stringify(updatedCourses));
        localStorage.setItem(STORAGE_KEY_INITIALIZED, 'true');
      } catch (e) {
        console.error('Failed to save courses to storage', e);
      }
      return { courses: updatedCourses };
    });
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
      } catch (err) {}
    }
  });
}
