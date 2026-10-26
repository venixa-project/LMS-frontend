// ============================================================
// LMS - Cohort & Batch Management Store (Zustand)
// Manages cohorts, batch codes, trainer assignments,
// student roster enrollments, and multi-tab synchronization.
// ============================================================
import { create } from 'zustand';
import { Cohort } from '../types';
import { mockCohorts } from '../data/mockData';
import { mockUsers } from '../data/mockUsers';

interface CohortState {
  cohorts: Cohort[];

  // Selectors & Queries
  getCohortById: (id: string) => Cohort | undefined;
  isBatchCodeUnique: (code: string, excludeCohortId?: string) => boolean;

  // Actions
  addCohort: (newCohort: Cohort) => { success: boolean; message: string; cohort?: Cohort };
  updateCohort: (updated: Cohort) => { success: boolean; message: string };
  removeTrainerFromCohort: (cohortId: string) => { success: boolean; message: string };
  assignTrainerToCohort: (cohortId: string, trainerId: string) => { success: boolean; message: string };
  removeStudentFromCohort: (cohortId: string, studentId: string) => { success: boolean; message: string };
  addStudentsToCohort: (cohortId: string, studentIds: string[]) => { success: boolean; message: string };
  deleteCohort: (cohortId: string) => { success: boolean; message: string };
}

const STORAGE_KEY_COHORTS = 'venilearn_cohorts_data';

// Load cohorts from localStorage or fallback to mockCohorts
function loadInitialCohorts(): Cohort[] {
  try {
    const cached = localStorage.getItem(STORAGE_KEY_COHORTS);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to parse cached cohorts from storage', e);
  }
  return mockCohorts;
}

function persistCohorts(cohorts: Cohort[]) {
  try {
    localStorage.setItem(STORAGE_KEY_COHORTS, JSON.stringify(cohorts));
  } catch (e) {
    console.error('Failed to save cohorts to storage', e);
  }
}

export const useCohortStore = create<CohortState>((set, get) => ({
  cohorts: loadInitialCohorts(),

  getCohortById: (id: string) => {
    return get().cohorts.find(c => c.id === id);
  },

  isBatchCodeUnique: (code: string, excludeCohortId?: string) => {
    const normalized = code.trim().toUpperCase();
    return !get().cohorts.some(
      c => c.code.trim().toUpperCase() === normalized && c.id !== excludeCohortId
    );
  },

  addCohort: (newCohort: Cohort) => {
    const { cohorts, isBatchCodeUnique } = get();

    if (!isBatchCodeUnique(newCohort.code)) {
      return {
        success: false,
        message: `Batch code "${newCohort.code.toUpperCase()}" is already in use by another cohort.`
      };
    }

    const updated = [newCohort, ...cohorts];
    set({ cohorts: updated });
    persistCohorts(updated);

    return {
      success: true,
      message: `Cohort "${newCohort.name}" (${newCohort.code}) created successfully!`,
      cohort: newCohort
    };
  },

  updateCohort: (updatedCohort: Cohort) => {
    const { cohorts, isBatchCodeUnique } = get();

    if (!isBatchCodeUnique(updatedCohort.code, updatedCohort.id)) {
      return {
        success: false,
        message: `Batch code "${updatedCohort.code.toUpperCase()}" is already in use by another cohort.`
      };
    }

    const updated = cohorts.map(c => c.id === updatedCohort.id ? updatedCohort : c);
    set({ cohorts: updated });
    persistCohorts(updated);

    return {
      success: true,
      message: `Cohort "${updatedCohort.name}" updated successfully.`
    };
  },

  removeTrainerFromCohort: (cohortId: string) => {
    const { cohorts } = get();
    const target = cohorts.find(c => c.id === cohortId);
    if (!target) {
      return { success: false, message: 'Cohort not found.' };
    }

    const trainerId = target.instructorIds?.[0] || target.instructors?.[0];
    const trainerName = mockUsers.find(u => u.id === trainerId)?.displayName || 'Assigned trainer';

    const updatedCohort: Cohort = {
      ...target,
      instructors: [],
      instructorIds: [],
      updatedAt: new Date().toISOString()
    };

    const updatedList = cohorts.map(c => c.id === cohortId ? updatedCohort : c);
    set({ cohorts: updatedList });
    persistCohorts(updatedList);

    return {
      success: true,
      message: `${trainerName} removed from cohort ${target.code}. Trainer account and other course assignments remain active.`
    };
  },

  assignTrainerToCohort: (cohortId: string, trainerId: string) => {
    const { cohorts } = get();
    const target = cohorts.find(c => c.id === cohortId);
    if (!target) {
      return { success: false, message: 'Cohort not found.' };
    }

    const trainer = mockUsers.find(u => u.id === trainerId);
    if (!trainer) {
      return { success: false, message: 'Trainer not found.' };
    }

    const updatedCohort: Cohort = {
      ...target,
      instructors: [trainerId],
      instructorIds: [trainerId],
      departmentId: trainer.departmentId || target.departmentId,
      updatedAt: new Date().toISOString()
    };

    const updatedList = cohorts.map(c => c.id === cohortId ? updatedCohort : c);
    set({ cohorts: updatedList });
    persistCohorts(updatedList);

    return {
      success: true,
      message: `Assigned ${trainer.displayName} as lead faculty for ${target.code}.`
    };
  },

  removeStudentFromCohort: (cohortId: string, studentId: string) => {
    const { cohorts } = get();
    const target = cohorts.find(c => c.id === cohortId);
    if (!target) {
      return { success: false, message: 'Cohort not found.' };
    }

    const student = mockUsers.find(u => u.id === studentId);
    const updatedStudentIds = (target.studentIds || []).filter(id => id !== studentId);

    const updatedCohort: Cohort = {
      ...target,
      studentIds: updatedStudentIds,
      learnerCount: updatedStudentIds.length,
      updatedAt: new Date().toISOString()
    };

    const updatedList = cohorts.map(c => c.id === cohortId ? updatedCohort : c);
    set({ cohorts: updatedList });
    persistCohorts(updatedList);

    const studentName = student?.displayName || studentId;
    return {
      success: true,
      message: `Removed ${studentName} from cohort ${target.code}. Student account and other enrollments remain intact.`
    };
  },

  addStudentsToCohort: (cohortId: string, studentIdsToAdd: string[]) => {
    const { cohorts } = get();
    const target = cohorts.find(c => c.id === cohortId);
    if (!target) {
      return { success: false, message: 'Cohort not found.' };
    }

    const currentIds = target.studentIds || [];
    const maxCapacity = target.capacity || 30;

    // Filter out duplicate IDs
    const newUniqueIds = studentIdsToAdd.filter(id => !currentIds.includes(id));
    const totalCount = currentIds.length + newUniqueIds.length;

    if (totalCount > maxCapacity) {
      return {
        success: false,
        message: `Cannot enroll ${newUniqueIds.length} students. Exceeds max seat capacity of ${maxCapacity} (currently ${currentIds.length} enrolled).`
      };
    }

    const updatedCohort: Cohort = {
      ...target,
      studentIds: [...currentIds, ...newUniqueIds],
      learnerCount: totalCount,
      updatedAt: new Date().toISOString()
    };

    const updatedList = cohorts.map(c => c.id === cohortId ? updatedCohort : c);
    set({ cohorts: updatedList });
    persistCohorts(updatedList);

    return {
      success: true,
      message: `Successfully enrolled ${newUniqueIds.length} student(s) into ${target.code}.`
    };
  },

  deleteCohort: (cohortId: string) => {
    const { cohorts } = get();
    const updated = cohorts.filter(c => c.id !== cohortId);
    set({ cohorts: updated });
    persistCohorts(updated);
    return {
      success: true,
      message: 'Cohort removed successfully.'
    };
  }
}));

// Multi-tab synchronization
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY_COHORTS && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        if (Array.isArray(parsed)) {
          useCohortStore.setState({ cohorts: parsed });
        }
      } catch (err) {
        console.error('Failed to sync cohorts across tabs', err);
      }
    }
  });
}
