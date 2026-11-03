// ============================================================
// LMS - Course & Shareable Enrollment Store (Zustand)
// Manages course sharing configuration, public link access,
// and cross-role student enrollment state.
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
  isCoursesLoading: boolean;

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
  updateCourseStatus: (courseId: string, status: EntityStatus) => void;
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
  fetchCourses: () => Promise<void>;
  addCourse: (course: Course) => Promise<Course>;
  deleteCourse: (courseId: string) => void;
}

const STORAGE_KEY_COURSES = 'venilearn_courses';
const STORAGE_KEY_INITIALIZED = 'venilearn_courses_initialized';
const STORAGE_KEY_ENROLLED = 'venilearn_enrolled_courses';
const STORAGE_KEY_REQUESTED = 'venilearn_requested_courses';
const STORAGE_KEY_ENROLLMENTS = 'venilearn_enrollments';

// Safely load cached state from localStorage with persistence of deletions and empty catalogues
function loadInitialCourses(): Course[] {
  try {
    const cached = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_COURSES) : null;

    if (cached !== null) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) {
        return parsed.filter((c: Course) => !c.id.startsWith('crs-00')).map((c: Course) => ({
          ...c,
          organizationId: c.organizationId || '871abf8a-e563-4d0f-afc7-416d8da3df14',
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
          .filter((id: string) => typeof id === 'string' && !id.startsWith('crs-00'));
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
    const isInitialized = typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY_INITIALIZED) === 'true';
    const cached = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_ENROLLMENTS) : null;
    if (cached !== null) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
    if (isInitialized) {
      return [];
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
  isCoursesLoading: false,

  getCourseById: (id: string) => {
    const { courses } = get();
    return courses.find((c) => c.id.toLowerCase() === id.toLowerCase());
    return courses.find((c) => c.id.toLowerCase() === id.toLowerCase() || (c.slug && c.slug.toLowerCase() === id.toLowerCase()));
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
      } catch (e) {
        // localStorage fallback
      }
      return { courses: updatedCourses };
    });
  },

  updateCourseStatus: (courseId, status) => {
    set((state) => {
      const updatedCourses = state.courses.map((c) =>
        c.id === courseId
          ? {
            ...c,
            status,
            // If unpublishing, optionally reflect link restriction
            shareableLinkEnabled: status === 'published' ? (c.shareableLinkEnabled ?? true) : false,
            updatedAt: new Date().toISOString(),
          }
          : c
      );
      try {
        localStorage.setItem(STORAGE_KEY_COURSES, JSON.stringify(updatedCourses));
      } catch (e) {
        // storage fallback
      }
      return { courses: updatedCourses };
    });
  },

  enrollInCourse: (courseId, userId = 'u-007') => {
    const { courses, enrolledCourseIds } = get();
    const course = courses.find((c) => c.id === courseId);

    if (!course) {
      return { success: false, message: 'Course not found.' };
    }

    if (course.status !== 'published') {
      return { success: false, message: 'Course is not published for open enrollment.' };
    }

    if (course.shareableLinkEnabled === false) {
      return { success: false, message: 'Course link has been deactivated by administrator.' };
    }

    if (enrolledCourseIds.includes(courseId)) {
      return { success: false, message: 'You are already enrolled in this course.' };
    }

    // Check enrollment deadline if set
    if (course.enrollmentDeadline) {
      const deadline = new Date(course.enrollmentDeadline);
      const today = new Date();
      if (today > deadline) {
        return { success: false, message: 'Enrollment deadline for this course has expired.' };
      }
    }

    // Check capacity if set
    const currentEnrolled = course.enrolledLearners ?? course.learnerCount ?? 0;
    const capacityLimit = course.enrollmentCapacity ?? 100;
    if (currentEnrolled >= capacityLimit) {
      return { success: false, message: 'This course has reached its maximum seat capacity.' };
    }

    // If requires approval, route to approval flow
    if (course.enrollmentApprovalRequired) {
      const { requestedCourseIds } = get();
      if (!requestedCourseIds.includes(courseId)) {
        const nextRequested = [...requestedCourseIds, courseId];
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

    // Instant successful enrollment
    const nextEnrolled = [...enrolledCourseIds, courseId];
    const newEnrollment: Enrollment = {
      id: `enr-${Date.now()}`,
      userId,
      courseId,
      status: 'active',
      progress: 0,
      enrolledAt: new Date().toISOString(),
    };

    const updatedCourses = courses.map((c) =>
      c.id === courseId
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
      apiClient.post(`/courses/${courseId}/enroll`, {}).catch((err) => {
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
    const target = courses.find((c) => c.id === courseId);
    if (!target) {
      return { success: false, message: 'Course not found.' };
    }

    const updatedCourses = courses.map((c) => {
      if (c.id === courseId) {
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
    const targetCourse = courses.find((c) => c.id === courseId);
    if (!targetCourse) {
      return {
        success: false,
        addedCount: 0,
        alreadyEnrolledCount: 0,
        message: 'Course not found.',
      };
    }

    // Existing enrolled user IDs for this course
    const existingEnrolledIds = new Set(
      enrollments.filter((e) => e.courseId === courseId).map((e) => e.userId)
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
      courseId,
      cohortId: cohortId || undefined,
      status: 'active',
      progress: 0,
      enrolledAt: new Date().toISOString(),
    }));

    const nextEnrollments = [...newEnrollments, ...enrollments];

    const updatedCourses = courses.map((c) => {
      if (c.id === courseId) {
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
      apiClient.post(`/courses/${courseId}/assign-students`, {
        studentIds: eligibleIdsToEnroll,
        cohortId
      }).catch((syncErr) => console.warn('Background course sync note:', syncErr));
    } catch (e) { }

    return {
      success: true,
      addedCount: eligibleIdsToEnroll.length,
      alreadyEnrolledCount,
      message: `Successfully enrolled ${eligibleIdsToEnroll.length} student${eligibleIdsToEnroll.length === 1 ? '' : 's'} in "${targetCourse.title}".`,
    };
  },

  fetchCourses: async () => {
    set({ isCoursesLoading: true });
    try {
      const [coursesRes, enrollmentsRes] = await Promise.all([
        apiClient.get('/courses?limit=100').catch(() => null),
        apiClient.get('/courses/my-enrollments').catch(() => null),
      ]);

      if (coursesRes && coursesRes.data && Array.isArray(coursesRes.data)) {
        const backendCourses: Course[] = (coursesRes.data as any[]).map((c: any) => ({
          id: c.id,
          title: c.title,
          slug: c.slug,
          shortDescription: c.shortDescription || c.description?.slice(0, 120),
          description: c.description || '',
          thumbnail: c.thumbnailUrl || c.thumbnail,
          category: c.category || 'General',
          departmentId: c.departmentId,
          level: c.level || 'Beginner',
          durationHours: c.durationHours || Math.round((c.estimatedDuration || 60) / 60) || 10,
          status: c.status || 'draft',
          version: c.version || 1,
          instructors: Array.isArray(c.instructors) ? c.instructors : [],
          modules: Array.isArray(c.modules) ? c.modules.map((m: any, mIdx: number) => ({
            id: m.id,
            title: m.title || `Module ${mIdx + 1}`,
            description: m.description,
            order: m.order || mIdx + 1,
            lessons: Array.isArray(m.lessons) ? m.lessons.map((l: any, lIdx: number) => ({
              id: l.id,
              title: l.title || `Lesson ${lIdx + 1}`,
              description: l.description,
              type: l.type || 'rich_text',
              content: l.content,
              videoUrl: l.contentUrl,
              durationMinutes: l.durationMinutes || 15,
              order: l.order || lIdx + 1,
              isRequired: l.isRequired ?? true,
              isPreview: l.isPreview ?? false,
              status: l.status || 'published',
              quizConfig: l.quizConfig,
              uploadedDocument: l.uploadedDocument,
            })) : [],
          })) : [],
          enrolledLearners: c.learnerCount || (c._count?.enrollments) || 0,
          learnerCount: c.learnerCount || (c._count?.enrollments) || 0,
          organizationId: c.tenantId || 'org-001',
          shareableLinkEnabled: c.shareableLinkEnabled ?? true,
          enrollmentCapacity: c.enrollmentCapacity,
          enrollmentDeadline: c.enrollmentDeadline,
          enrollmentApprovalRequired: c.enrollmentApprovalRequired,
          completionPercentageRequired: c.completionPercentageRequired || 80,
          finalAssessmentConfig: c.finalAssessmentConfig,
          certificateConfig: c.certificateConfig,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
        }));

        set((state) => {
          const cleanLocal = state.courses.filter((c) => !c.id.startsWith('crs-00'));
          const existingMap = new Map(cleanLocal.map((c) => [c.id, c]));
          backendCourses.forEach((bc) => existingMap.set(bc.id, bc));
          const merged = Array.from(existingMap.values());
          try {
            localStorage.setItem(STORAGE_KEY_COURSES, JSON.stringify(merged));
            localStorage.setItem(STORAGE_KEY_INITIALIZED, 'true');
          } catch (e) { }
          return { courses: merged };
        });
      }

      if (enrollmentsRes && enrollmentsRes.data && Array.isArray(enrollmentsRes.data)) {
        const backendEnrolledIds = (enrollmentsRes.data as any[]).map((e: any) => e.courseId);
        const mappedEnrollments: Enrollment[] = (enrollmentsRes.data as any[]).map((e: any) => ({
          id: e.id,
          userId: e.userId,
          courseId: e.courseId,
          cohortId: e.cohortId,
          status: e.status || 'active',
          progress: e.progressPercentage || 0,
          enrolledAt: e.enrolledAt || e.assignedAt || new Date().toISOString(),
        }));

        set((state) => {
          const uniqueIds = Array.from(new Set([...state.enrolledCourseIds, ...backendEnrolledIds]));
          try {
            localStorage.setItem(STORAGE_KEY_ENROLLED, JSON.stringify(uniqueIds));
            localStorage.setItem(STORAGE_KEY_ENROLLMENTS, JSON.stringify(mappedEnrollments));
          } catch (e) { }
          return {
            enrolledCourseIds: uniqueIds,
            enrollments: mappedEnrollments,
          };
        });
      }
    } catch (err) {
      console.warn('Failed to fetch courses from backend API:', err);
    } finally {
      set({ isCoursesLoading: false });
    }
  },

  addCourse: async (course: Course): Promise<Course> => {
    const fallbackOrg = typeof window !== 'undefined'
      ? (sessionStorage.getItem('venilearn_active_org_id') || 'org-001')
      : 'org-001';

    let persistedCourse: Course = {
      ...course,
      organizationId: course.organizationId || fallbackOrg,
    };

    try {
      const payload = {
        title: course.title,
        slug: course.slug || course.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
        description: course.description || 'Comprehensive course syllabus and curriculum modules.',
        shortDescription: course.shortDescription,
        category: course.category || 'General',
        level: course.level || 'Beginner',
        durationHours: course.durationHours || 10,
        status: course.status || 'draft',
        thumbnailUrl: course.thumbnail,
        shareableLinkEnabled: course.shareableLinkEnabled ?? true,
        enrollmentCapacity: course.enrollmentCapacity,
        enrollmentDeadline: course.enrollmentDeadline,
        enrollmentApprovalRequired: course.enrollmentApprovalRequired,
        completionPercentageRequired: course.completionPercentageRequired || 80,
        instructors: course.instructors || [],
        modules: (course.modules || []).map((m, mIdx) => ({
          title: m.title || `Module ${mIdx + 1}`,
          description: m.description,
          order: m.order || mIdx + 1,
          lessons: (m.lessons || []).map((l, lIdx) => ({
            title: l.title || `Lesson ${lIdx + 1}`,
            description: l.description,
            type: l.type || 'rich_text',
            content: l.content,
            contentUrl: l.videoUrl || (l as any).contentUrl,
            durationMinutes: l.durationMinutes || 15,
            order: l.order || lIdx + 1,
            isRequired: l.isRequired ?? true,
            isPreview: l.isPreview ?? false,
            status: l.status || 'published',
            quizConfig: (l as any).quizConfig || {},
            uploadedDocument: (l as any).uploadedDocument || {},
          })),
        })),
        finalAssessmentConfig: course.finalAssessmentConfig,
        certificateConfig: course.certificateConfig,
        evaluationCriteria: (course as any).evaluationCriteria,
      };

      const res = await apiClient.post<any>('/courses', payload);
      if (res && res.data) {
        const c = res.data;
        persistedCourse = {
          ...persistedCourse,
          id: c.id,
          slug: c.slug,
          status: c.status || persistedCourse.status,
          organizationId: c.tenantId || persistedCourse.organizationId,
          modules: Array.isArray(c.modules) ? c.modules.map((m: any, mIdx: number) => ({
            id: m.id,
            title: m.title || `Module ${mIdx + 1}`,
            description: m.description,
            order: m.order || mIdx + 1,
            lessons: Array.isArray(m.lessons) ? m.lessons.map((l: any, lIdx: number) => ({
              id: l.id,
              title: l.title || `Lesson ${lIdx + 1}`,
              description: l.description,
              type: l.type || 'rich_text',
              content: l.content,
              videoUrl: l.contentUrl,
              durationMinutes: l.durationMinutes || 15,
              order: l.order || lIdx + 1,
              isRequired: l.isRequired ?? true,
              isPreview: l.isPreview ?? false,
              status: l.status || 'published',
              quizConfig: l.quizConfig,
              uploadedDocument: l.uploadedDocument,
            })) : [],
          })) : persistedCourse.modules,
        };
      }
    } catch (apiErr) {
      console.warn('Backend API course creation note (storing in client state):', apiErr);
    }

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

  deleteCourse: (courseId: string) => {
    apiClient.delete(`/courses/${courseId}`).catch((err) => {
      console.warn('Backend API delete note:', err);
    });
    set((state) => {
      const updatedCourses = state.courses.filter((c) => c.id !== courseId);
      const updatedEnrolled = state.enrolledCourseIds.filter((id) => id !== courseId);
      const updatedEnrollments = state.enrollments.filter((e) => e.courseId !== courseId);
      try {
        localStorage.setItem(STORAGE_KEY_COURSES, JSON.stringify(updatedCourses));
        localStorage.setItem(STORAGE_KEY_ENROLLED, JSON.stringify(updatedEnrolled));
        localStorage.setItem(STORAGE_KEY_ENROLLMENTS, JSON.stringify(updatedEnrollments));
        localStorage.setItem(STORAGE_KEY_INITIALIZED, 'true');
      } catch (e) {
        console.error('Failed to save courses to storage', e);
      }
      return {
        courses: updatedCourses,
        enrolledCourseIds: updatedEnrolled,
        enrollments: updatedEnrollments,
      };
    });
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
