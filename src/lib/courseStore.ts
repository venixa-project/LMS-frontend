// ============================================================
// LMS - Course & Shareable Enrollment Store (Zustand)
// Manages course sharing configuration, public link access,
// and cross-role student enrollment state.
// ============================================================
import { create } from 'zustand';
import { Course, Enrollment, EntityStatus } from '../types';
import { mockCourses, mockEnrollments } from '../data/mockData';

interface CourseState {
  courses: Course[];
  enrolledCourseIds: string[];
  requestedCourseIds: string[];
  enrollments: Enrollment[];

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
  addCourse: (course: Course) => void;
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
    const isInitialized = typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY_INITIALIZED) === 'true';
    const cached = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_COURSES) : null;

    if (cached !== null) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) {
        if (!isInitialized && typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY_INITIALIZED, 'true');
        }
        return parsed.map((c: Course) => ({
          ...c,
          organizationId: c.organizationId || 'org-001',
        }));
      }
    }

    // If marked initialized already, preserve empty catalogue (do NOT resurrect deleted demo courses!)
    if (isInitialized) {
      return [];
    }

    // Brand new clean installation: initialize with mockCourses tagged with default org-001
    const seededCourses: Course[] = mockCourses.map((c) => ({
      ...c,
      organizationId: c.organizationId || 'org-001',
    }));
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_INITIALIZED, 'true');
      localStorage.setItem(STORAGE_KEY_COURSES, JSON.stringify(seededCourses));
    }
    return seededCourses;
  } catch (e) {
    console.error('Failed to parse courses from storage', e);
  }
  return [];
}

function loadInitialEnrolled(): string[] {
  try {
    const isInitialized = typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY_INITIALIZED) === 'true';
    const cached = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_ENROLLED) : null;
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
    console.error('Failed to parse enrolled courses from storage', e);
  }
  return ['crs-001', 'crs-002', 'crs-004'];
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
  return mockEnrollments;
}

export const useCourseStore = create<CourseState>((set, get) => ({
  courses: loadInitialCourses(),
  enrolledCourseIds: loadInitialEnrolled(),
  requestedCourseIds: loadInitialRequested(),
  enrollments: loadInitialEnrollments(),

  getCourseById: (id: string) => {
    const { courses } = get();
    return courses.find((c) => c.id.toLowerCase() === id.toLowerCase());
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
    } catch (e) { }

    return {
      success: true,
      addedCount: eligibleIdsToEnroll.length,
      alreadyEnrolledCount,
      message: `Successfully enrolled ${eligibleIdsToEnroll.length} student${eligibleIdsToEnroll.length === 1 ? '' : 's'} in "${targetCourse.title}".`,
    };
  },

  addCourse: (course: Course) => {
    set((state) => {
      const fallbackOrg = typeof window !== 'undefined'
        ? (sessionStorage.getItem('venilearn_active_org_id') || 'org-001')
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

  deleteCourse: (courseId: string) => {
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
