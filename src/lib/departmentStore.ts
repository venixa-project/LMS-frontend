// ============================================================
// LMS - Department Management Store (Zustand)
// Connected directly to backend API (/api/v1/admin/departments)
// ============================================================
import { create } from 'zustand';
import { organisationApi, DepartmentData } from './organisationApiService';

const DEPARTMENTS_CACHE_KEY = 'venilearn_departments_cache';

function loadCachedDepartments(): DepartmentData[] {
  try {
    const raw = localStorage.getItem(DEPARTMENTS_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return [];
}

function persistDepartments(depts: DepartmentData[]) {
  try {
    localStorage.setItem(DEPARTMENTS_CACHE_KEY, JSON.stringify(depts));
  } catch {}
}

interface DepartmentState {
  departments: DepartmentData[];
  isLoading: boolean;
  error: string | null;
  fetchDepartments: () => Promise<void>;
  getDepartmentById: (id: string) => DepartmentData | undefined;
}

export const useDepartmentStore = create<DepartmentState>((set, get) => ({
  departments: loadCachedDepartments(),
  isLoading: false,
  error: null,

  fetchDepartments: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await organisationApi.getDepartments();
      const list = Array.isArray(data) ? data : [];
      if (list.length > 0) {
        persistDepartments(list);
      }
      set({
        departments: list,
        isLoading: false,
      });
    } catch (err: any) {
      console.error('Failed to fetch departments:', err);
      const cached = loadCachedDepartments();
      set({
        departments: cached,
        error: err?.message || 'Failed to fetch departments from server',
        isLoading: false,
      });
    }
  },

  getDepartmentById: (id: string) => {
    return get().departments.find((d) => d.id === id);
  },
}));
