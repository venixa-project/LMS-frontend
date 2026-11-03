// ============================================================
// LMS - Department Management Store (Zustand)
// Connected directly to backend API (/api/v1/admin/departments)
// ============================================================
import { create } from 'zustand';
import { organisationApi, DepartmentData } from './organisationApiService';

interface DepartmentState {
  departments: DepartmentData[];
  isLoading: boolean;
  error: string | null;
  fetchDepartments: () => Promise<void>;
  getDepartmentById: (id: string) => DepartmentData | undefined;
}

export const useDepartmentStore = create<DepartmentState>((set, get) => ({
  departments: [],
  isLoading: false,
  error: null,

  fetchDepartments: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await organisationApi.getDepartments();
      set({
        departments: Array.isArray(data) ? data : [],
        isLoading: false,
      });
    } catch (err: any) {
      console.error('Failed to fetch departments:', err);
      set({
        error: err?.message || 'Failed to fetch departments from server',
        isLoading: false,
      });
    }
  },

  getDepartmentById: (id: string) => {
    return get().departments.find((d) => d.id === id);
  },
}));
