import { apiClient } from './apiClient';
import { User, UserAccountStatus, RoleName } from '../types';

export interface ListPeopleParams {
  page?: number;
  limit?: number;
  role?: string;
  departmentId?: string;
  cohortId?: string;
  status?: string;
  search?: string;
}

export const peopleApi = {
  list: async (params?: ListPeopleParams) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '' && val !== 'all') {
          searchParams.append(key, String(val));
        }
      });
    }
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    const res = await apiClient.get<User[]>(`/people${query}`);
    return {
      users: res.data || [],
      meta: res.meta,
    };
  },

  get: async (id: string) => {
    const res = await apiClient.get<User>(`/people/${id}`);
    return res.data;
  },

  create: async (userData: Partial<User> & { activeRole: RoleName }) => {
    const res = await apiClient.post<{ user?: User; temporaryPassword?: string } | User>('/people', userData);
    return res.data;
  },

  resetPassword: async (id: string) => {
    const res = await apiClient.post<{ success: boolean; user?: User; temporaryPassword: string; message: string }>(`/people/${id}/reset-password`);
    return res.data;
  },

  update: async (id: string, userData: Partial<User>) => {
    const res = await apiClient.patch<User>(`/people/${id}`, userData);
    return res.data;
  },

  updateStatus: async (id: string, status: UserAccountStatus) => {
    const res = await apiClient.patch<User>(`/people/${id}/status`, { status });
    return res.data;
  },

  invite: async (id: string) => {
    const res = await apiClient.post<{ success: boolean; message: string }>(`/people/${id}/invite`);
    return res.data;
  },

  delete: async (id: string) => {
    const res = await apiClient.delete(`/people/${id}`);
    return res.data;
  },

  bulkImport: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.upload<{
      totalProcessed: number;
      importedCount: number;
      failedCount: number;
      invalidRows: any[];
    }>('/people/bulk-import', formData);
    return res.data;
  },
};

