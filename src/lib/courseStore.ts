// ============================================================
// LMS - Course Store (Zustand with localStorage persistence)
// Ensures courses created/edited by Admin appear in the
// "Courses" catalog for students to browse and enroll, but
// does NOT automatically enroll students without their action.
// ============================================================
import { create } from 'zustand';
import { Course, EntityStatus } from '../types';
import { mockCourses } from '../data/mockData';

const COURSES_STORAGE_KEY = 'lms_all_courses_v3';
const ENROLLED_STORAGE_KEY = 'lms_student_enrolled_courses_v3';

// Actual enrolled courses for student Alex Rivera (Alex Thompson)
// Student is initially enrolled only in crs-001, crs-002, and crs-004
const DEFAULT_ENROLLED_COURSE_IDS = ['crs-001', 'crs-002', 'crs-004'];

// Load saved courses or fallback to all mock courses
const loadInitialCourses = (): Course[] => {
  try {
    const raw = localStorage.getItem(COURSES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Could not read courses from localStorage:', err);
  }
  return mockCourses;
};

// Load only the courses the student explicitly enrolled in
const loadInitialEnrolledIds = (): string[] => {
  try {
    const raw = localStorage.getItem(ENROLLED_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Could not read enrolled course IDs from localStorage:', err);
  }
  return DEFAULT_ENROLLED_COURSE_IDS;
};

interface CourseState {
  courses: Course[];
  enrolledCourseIds: string[];
  addCourse: (newCourse: Course) => void;
  updateCourse: (id: string, updates: Partial<Course>) => void;
  archiveCourse: (id: string) => void;
  enrollCourse: (id: string) => void;
  unenrollCourse: (id: string) => void;
  resetToDefault: () => void;
}

export const useCourseStore = create<CourseState>((set, get) => ({
  courses: loadInitialCourses(),
  enrolledCourseIds: loadInitialEnrolledIds(),

  addCourse: (newCourse: Course) => {
    const { courses } = get();
    // Add new course to the catalog so students and faculty can see it in "Courses"
    const updatedCourses = [newCourse, ...courses.filter((c) => c.id !== newCourse.id)];

    try {
      localStorage.setItem(COURSES_STORAGE_KEY, JSON.stringify(updatedCourses));
    } catch (e) {
      console.warn('Failed to save course to localStorage', e);
    }

    // Notice: Does NOT auto-enroll the student. Student must enroll to add to "My Enrolled Courses".
    set({ courses: updatedCourses });
  },

  updateCourse: (id: string, updates: Partial<Course>) => {
    const { courses } = get();
    const updatedCourses = courses.map((c) => (c.id === id ? { ...c, ...updates } : c));

    try {
      localStorage.setItem(COURSES_STORAGE_KEY, JSON.stringify(updatedCourses));
    } catch (e) {
      console.warn('Failed to update course in localStorage', e);
    }

    set({ courses: updatedCourses });
  },

  archiveCourse: (id: string) => {
    const { courses } = get();
    const updatedCourses = courses.map((c) => (c.id === id ? { ...c, status: 'archived' as EntityStatus } : c));

    try {
      localStorage.setItem(COURSES_STORAGE_KEY, JSON.stringify(updatedCourses));
    } catch (e) {
      console.warn('Failed to archive course in localStorage', e);
    }

    set({ courses: updatedCourses });
  },

  enrollCourse: (id: string) => {
    const { enrolledCourseIds } = get();
    if (!enrolledCourseIds.includes(id)) {
      const updated = [...enrolledCourseIds, id];
      try {
        localStorage.setItem(ENROLLED_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to update enrollments in localStorage', e);
      }
      set({ enrolledCourseIds: updated });
    }
  },

  unenrollCourse: (id: string) => {
    const { enrolledCourseIds } = get();
    const updated = enrolledCourseIds.filter((courseId) => courseId !== id);
    try {
      localStorage.setItem(ENROLLED_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to update enrollments in localStorage', e);
    }
    set({ enrolledCourseIds: updated });
  },

  resetToDefault: () => {
    try {
      localStorage.removeItem(COURSES_STORAGE_KEY);
      localStorage.removeItem(ENROLLED_STORAGE_KEY);
    } catch (e) {
      // ignore
    }
    set({
      courses: mockCourses,
      enrolledCourseIds: DEFAULT_ENROLLED_COURSE_IDS,
    });
  },
}));
