import { apiClient } from './apiClient';
import { Cohort, User } from '../types';

export interface ListCohortsParams {
  page?: number;
  limit?: number;
  departmentId?: string;
  courseId?: string;
  status?: string;
  search?: string;
}

export const cohortApi = {
  list: async (params?: ListCohortsParams) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '' && val !== 'all') {
          searchParams.append(key, String(val));
        }
      });
    }
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    const res = await apiClient.get<Cohort[]>(`/cohorts${query}`);
    return {
      cohorts: res.data || [],
      meta: res.meta,
    };
  },

  get: async (id: string) => {
    const res = await apiClient.get<Cohort>(`/cohorts/${id}`);
    return res.data;
  },

  create: async (cohortData: Partial<Cohort>) => {
    const res = await apiClient.post<Cohort>('/cohorts', cohortData);
    return res.data;
  },

  update: async (id: string, cohortData: Partial<Cohort>) => {
    const res = await apiClient.patch<Cohort>(`/cohorts/${id}`, cohortData);
    return res.data;
  },

  delete: async (id: string) => {
    const res = await apiClient.delete(`/cohorts/${id}`);
    return res.data;
  },

  getMembers: async (id: string) => {
    const res = await apiClient.get<{ user: User; role: string; joinedAt: string }[]>(`/cohorts/${id}/members`);
    return res.data;
  },

  addMembers: async (id: string, userIds: string[]) => {
    const res = await apiClient.post<{ success: boolean; message: string }>(`/cohorts/${id}/members`, { userIds });
    return res.data;
  },

  removeMember: async (id: string, userId: string) => {
    const res = await apiClient.delete(`/cohorts/${id}/members/${userId}`);
    return res.data;
  },
};

