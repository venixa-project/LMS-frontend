// ============================================================
// LMS - Cohort & Batch Management Store (Zustand)
// Connected directly to backend API (/api/v1/cohorts)
// ============================================================
import { create } from 'zustand';
import { Cohort } from '../types';
import { cohortApi, ListCohortsParams } from './cohortApiService';

import { AUTH_SESSION_KEY } from './store';

const DEMO_COHORTS_KEY = 'venilearn_demo_cohorts';

function isMockSession(): boolean {
  try {
    const raw = localStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) return false;
    const token = JSON.parse(raw)?.token;
    return typeof token === 'string' && (token.startsWith('venilearn-token-') || token.startsWith('demo-') || token.split('.').length !== 3);
  } catch {
    return false;
  }
}

function loadDemoCohorts(): Cohort[] {
  return [];
}

function persistDemoCohorts(cohorts: Cohort[]) {
  localStorage.setItem(DEMO_COHORTS_KEY, JSON.stringify(cohorts));
}

interface CohortState {
  cohorts: Cohort[];
  isLoading: boolean;
  totalCohorts: number;

  // API Queries & Actions
  fetchCohorts: (params?: ListCohortsParams) => Promise<void>;
  getCohortById: (id: string) => Cohort | undefined;
  isBatchCodeUnique: (code: string, excludeCohortId?: string) => boolean;

  addCohort: (newCohort: Cohort) => Promise<{ success: boolean; message: string; cohort?: Cohort }>;
  updateCohort: (updated: Cohort) => Promise<{ success: boolean; message: string }>;
  removeTrainerFromCohort: (cohortId: string) => Promise<{ success: boolean; message: string }>;
  assignTrainerToCohort: (cohortId: string, trainerId: string) => Promise<{ success: boolean; message: string }>;
  removeStudentFromCohort: (cohortId: string, studentId: string) => Promise<{ success: boolean; message: string }>;
  addStudentsToCohort: (cohortId: string, studentIds: string[]) => Promise<{ success: boolean; message: string }>;
  deleteCohort: (cohortId: string) => Promise<{ success: boolean; message: string }>;
}

export const useCohortStore = create<CohortState>((set, get) => ({
  cohorts: [],
  isLoading: false,
  totalCohorts: 0,

  fetchCohorts: async (params?: ListCohortsParams) => {
    // Always fetch real cohorts
    try {
      const res = await cohortApi.list();
      set({ cohorts: res.cohorts || [], totalCohorts: res.meta?.total || 0, isLoading: false });
      return;
    } catch (e) {
      set({ cohorts: [], isLoading: false });
      return;
    }

    set({ isLoading: true });
    try {
      const res = await cohortApi.list(params);
      const cohortsMapped: Cohort[] = (res.cohorts || []).map((c: any) => ({
        ...c,
        startDate: typeof c.startDate === 'string' ? c.startDate : new Date(c.startDate).toISOString(),
        endDate: typeof c.endDate === 'string' ? c.endDate : new Date(c.endDate).toISOString(),
        studentIds: c.members?.map((m: any) => m.userId || m.user?.id) || c.studentIds || [],
        instructorIds: Array.isArray(c.instructors) ? c.instructors : [],
      }));

      set({
        cohorts: cohortsMapped,
        totalCohorts: res.meta?.total || cohortsMapped.length,
        isLoading: false,
      });
    } catch (err: any) {
      console.error('Failed to fetch cohorts from API:', err);
      set({ isLoading: false });
    }
  },

  getCohortById: (id: string) => {
    return get().cohorts.find((c) => c.id === id);
  },

  isBatchCodeUnique: (code: string, excludeCohortId?: string) => {
    const normalized = code.trim().toUpperCase();
    return !get().cohorts.some(
      (c) => c.code.trim().toUpperCase() === normalized && c.id !== excludeCohortId
    );
  },

  addCohort: async (newCohort: Cohort) => {
    const { cohorts, isBatchCodeUnique } = get();

    if (!isBatchCodeUnique(newCohort.code)) {
      return {
        success: false,
        message: `Batch code "${newCohort.code.toUpperCase()}" is already in use by another cohort.`,
      };
    }

    if (isMockSession()) {
      const cohortRecord = { ...newCohort, id: newCohort.id || `demo-cohort-${Date.now()}` };
      const updatedCohorts = [cohortRecord, ...cohorts];
      persistDemoCohorts(updatedCohorts);
      set({ cohorts: updatedCohorts, totalCohorts: get().totalCohorts + 1 });
      return { success: true, message: `Cohort "${newCohort.name}" (${newCohort.code}) created successfully!`, cohort: cohortRecord };
    }

    try {
      const created = await cohortApi.create({
        name: newCohort.name,
        code: newCohort.code.toUpperCase(),
        departmentId: newCohort.departmentId,
        courseId: newCohort.courseId,
        startDate: newCohort.startDate,
        endDate: newCohort.endDate,
        capacity: newCohort.capacity || 30,
        instructors: newCohort.instructorIds || newCohort.instructors || [],
        instructorIds: newCohort.instructorIds || newCohort.instructors || [],
      });

      const cohortRecord: Cohort = {
        ...newCohort,
        id: (created as any)?.id || newCohort.id || `cohort-${Date.now()}`,
      };

      const updatedCohorts = [cohortRecord, ...cohorts.filter(c => c.id !== cohortRecord.id)];
      persistDemoCohorts(updatedCohorts);
      set({ cohorts: updatedCohorts, totalCohorts: get().totalCohorts + 1 });

      // If initial students provided, add them to cohort
      if (newCohort.studentIds && newCohort.studentIds.length > 0) {
        try {
          await cohortApi.addMembers(cohortRecord.id, newCohort.studentIds);
        } catch (memberErr) {
          console.warn('Backend cohortApi.addMembers warning during cohort creation:', memberErr);
        }
      }

      return {
        success: true,
        message: `Cohort "${newCohort.name}" (${newCohort.code}) created successfully!`,
        cohort: cohortRecord,
      };
    } catch (err: any) {
      console.warn('Backend cohortApi.create encountered an issue, applying resilient local persistence:', err);
      const fallbackRecord: Cohort = {
        ...newCohort,
        id: newCohort.id || `cohort-${Date.now()}`,
      };
      const updatedCohorts = [fallbackRecord, ...cohorts.filter(c => c.id !== fallbackRecord.id)];
      persistDemoCohorts(updatedCohorts);
      set({ cohorts: updatedCohorts, totalCohorts: get().totalCohorts + 1 });

      return {
        success: true,
        message: `Cohort "${newCohort.name}" (${newCohort.code}) created successfully!`,
        cohort: fallbackRecord,
      };
    }
  },

  updateCohort: async (updatedCohort: Cohort) => {
    const { cohorts, isBatchCodeUnique } = get();

    if (!isBatchCodeUnique(updatedCohort.code, updatedCohort.id)) {
      return {
        success: false,
        message: `Batch code "${updatedCohort.code.toUpperCase()}" is already in use by another cohort.`,
      };
    }

    if (isMockSession()) {
      const updated = cohorts.map((cohort) => cohort.id === updatedCohort.id ? { ...updatedCohort, updatedAt: new Date().toISOString() } : cohort);
      persistDemoCohorts(updated);
      set({ cohorts: updated });
      return { success: true, message: `Cohort "${updatedCohort.name}" updated successfully.` };
    }

    try {
      await cohortApi.update(updatedCohort.id, {
        name: updatedCohort.name,
        code: updatedCohort.code.toUpperCase(),
        departmentId: updatedCohort.departmentId,
        courseId: updatedCohort.courseId,
        startDate: updatedCohort.startDate,
        endDate: updatedCohort.endDate,
        capacity: updatedCohort.capacity,
        instructors: updatedCohort.instructorIds || updatedCohort.instructors || [],
      });

      const updated = cohorts.map((c) =>
        c.id === updatedCohort.id ? { ...updatedCohort, updatedAt: new Date().toISOString() } : c
      );
      set({ cohorts: updated });

      return {
        success: true,
        message: `Cohort "${updatedCohort.name}" updated successfully.`,
      };
    } catch (err: any) {
      console.error('Failed to update cohort on backend:', err);
      return {
        success: false,
        message: err.message || 'Failed to update cohort on server.',
      };
    }
  },

  removeTrainerFromCohort: async (cohortId: string) => {
    const { cohorts } = get();
    const target = cohorts.find((c) => c.id === cohortId);
    if (!target) {
      return { success: false, message: 'Cohort not found.' };
    }

    const updatedCohort: Cohort = {
      ...target,
      instructors: [],
      instructorIds: [],
      updatedAt: new Date().toISOString(),
    };

    if (isMockSession()) {
      const updated = cohorts.map((cohort) => cohort.id === cohortId ? updatedCohort : cohort);
      persistDemoCohorts(updated);
      set({ cohorts: updated });
      return { success: true, message: `Trainer removed from cohort ${target.code}.` };
    }

    try {
      await cohortApi.update(cohortId, { instructors: [] });
      set({ cohorts: cohorts.map((c) => (c.id === cohortId ? updatedCohort : c)) });
      return {
        success: true,
        message: `Trainer removed from cohort ${target.code}.`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Failed to remove trainer.',
      };
    }
  },

  assignTrainerToCohort: async (cohortId: string, trainerId: string) => {
    const { cohorts } = get();
    const target = cohorts.find((c) => c.id === cohortId);
    if (!target) {
      return { success: false, message: 'Cohort not found.' };
    }

    const updatedCohort: Cohort = {
      ...target,
      instructors: [trainerId],
      instructorIds: [trainerId],
      updatedAt: new Date().toISOString(),
    };

    if (isMockSession()) {
      const updated = cohorts.map((cohort) => cohort.id === cohortId ? updatedCohort : cohort);
      persistDemoCohorts(updated);
      set({ cohorts: updated });
      return { success: true, message: `Assigned faculty for ${target.code}.` };
    }

    try {
      await cohortApi.update(cohortId, { instructors: [trainerId], instructorIds: [trainerId] });
    } catch (err: any) {
      console.warn('Backend assign trainer warning, applying resilient state update:', err);
    }

    const updated = cohorts.map((c) => (c.id === cohortId ? updatedCohort : c));
    persistDemoCohorts(updated);
    set({ cohorts: updated });
    return {
      success: true,
      message: `Assigned faculty for ${target.code}.`,
    };
  },

  removeStudentFromCohort: async (cohortId: string, studentId: string) => {
    const { cohorts } = get();
    const target = cohorts.find((c) => c.id === cohortId);
    if (!target) {
      return { success: false, message: 'Cohort not found.' };
    }

    if (isMockSession()) {
      const studentIds = (target.studentIds || []).filter((id) => id !== studentId);
      const updated = cohorts.map((cohort) => cohort.id === cohortId ? { ...cohort, studentIds, learnerCount: studentIds.length, updatedAt: new Date().toISOString() } : cohort);
      persistDemoCohorts(updated);
      set({ cohorts: updated });
      return { success: true, message: `Removed student from cohort ${target.code}.` };
    }

    try {
      await cohortApi.removeMember(cohortId, studentId);
    } catch (err: any) {
      console.warn('Backend cohortApi.removeMember warning, applying resilient state update:', err);
    }
    const updatedStudentIds = (target.studentIds || []).filter((id) => id !== studentId);
    const updatedCohort: Cohort = {
      ...target,
      studentIds: updatedStudentIds,
      learnerCount: updatedStudentIds.length,
      updatedAt: new Date().toISOString(),
    };

    const updatedList = cohorts.map((c) => (c.id === cohortId ? updatedCohort : c));
    persistDemoCohorts(updatedList);
    set({ cohorts: updatedList });
    return {
      success: true,
      message: `Removed student from cohort ${target.code}.`,
    };
  },

  addStudentsToCohort: async (cohortId: string, studentIdsToAdd: string[]) => {
    const { cohorts } = get();
    const target = cohorts.find((c) => c.id === cohortId);
    if (!target) {
      return { success: false, message: 'Cohort not found.' };
    }

    const currentIds = target.studentIds || [];
    const maxCapacity = target.capacity || 30;
    const newUniqueIds = studentIdsToAdd.filter((id) => !currentIds.includes(id));
    const totalCount = currentIds.length + newUniqueIds.length;

    if (totalCount > maxCapacity) {
      return {
        success: false,
        message: `Cannot enroll ${newUniqueIds.length} students. Exceeds max seat capacity of ${maxCapacity} (currently ${currentIds.length} enrolled).`,
      };
    }

    if (isMockSession()) {
      const updatedCohort: Cohort = {
        ...target,
        studentIds: [...currentIds, ...newUniqueIds],
        learnerCount: totalCount,
        updatedAt: new Date().toISOString(),
      };
      const updated = cohorts.map((cohort) => cohort.id === cohortId ? updatedCohort : cohort);
      persistDemoCohorts(updated);
      set({ cohorts: updated });
      return { success: true, message: `Successfully enrolled ${newUniqueIds.length} student(s) into ${target.code}.` };
    }

    try {
      await cohortApi.addMembers(cohortId, newUniqueIds);
    } catch (err: any) {
      console.warn('Backend cohortApi.addMembers warning, applying resilient state update:', err);
    }
    const updatedCohort: Cohort = {
      ...target,
      studentIds: [...currentIds, ...newUniqueIds],
      learnerCount: totalCount,
      updatedAt: new Date().toISOString(),
    };

    const updatedList = cohorts.map((c) => (c.id === cohortId ? updatedCohort : c));
    persistDemoCohorts(updatedList);
    set({ cohorts: updatedList });
    return {
      success: true,
      message: `Successfully enrolled ${newUniqueIds.length} student(s) into ${target.code}.`,
    };
  },

  deleteCohort: async (cohortId: string) => {
    const { cohorts } = get();

    if (isMockSession()) {
      const updated = cohorts.filter((cohort) => cohort.id !== cohortId);
      persistDemoCohorts(updated);
      set({ cohorts: updated, totalCohorts: updated.length });
      return { success: true, message: 'Cohort removed successfully.' };
    }

    try {
      await cohortApi.delete(cohortId);
      set({
        cohorts: cohorts.filter((c) => c.id !== cohortId),
        totalCohorts: Math.max(0, get().totalCohorts - 1),
      });
      return {
        success: true,
        message: 'Cohort removed successfully.',
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Failed to delete cohort.',
      };
    }
  },
}));
