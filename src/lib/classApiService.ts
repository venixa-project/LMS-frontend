import { apiClient } from './apiClient';

export interface AcademicClassData {
  id: string;
  tenantId?: string;
  name: string;
  code: string;
  departmentId?: string;
  department?: {
    id: string;
    name: string;
    code: string;
  };
  description?: string;
  academicYear?: string;
  status: string;
  sections?: SectionData[];
  createdAt?: string;
  updatedAt?: string;
}

export interface SectionData {
  id: string;
  tenantId?: string;
  classId: string;
  class?: AcademicClassData;
  name: string;
  code: string;
  teacherId?: string;
  teacher?: {
    id: string;
    firstName: string;
    lastName: string;
    displayName: string;
    email: string;
  };
  capacity: number;
  studentCount: number;
  roomNumber?: string;
  status: string;
  members?: SectionMemberData[];
  _count?: {
    members?: number;
  };
}

export interface SectionMemberData {
  id: string;
  sectionId: string;
  userId: string;
  rollNo?: string;
  joinedAt?: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    displayName: string;
    email: string;
    rollNo?: string;
    avatarUrl?: string;
  };
}

export const classApi = {
  // Classes
  listClasses: async (params?: { departmentId?: string; academicYear?: string; status?: string; search?: string }) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '' && val !== 'all') {
          searchParams.append(key, String(val));
        }
      });
    }
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    const res = await apiClient.get<AcademicClassData[]>(`/classes${query}`);
    return {
      classes: res.data || [],
      meta: res.meta,
    };
  },

  getClass: async (id: string) => {
    const res = await apiClient.get<AcademicClassData>(`/classes/${id}`);
    return res.data;
  },

  createClass: async (data: Partial<AcademicClassData>) => {
    const res = await apiClient.post<AcademicClassData>('/classes', data);
    return res.data;
  },

  updateClass: async (id: string, data: Partial<AcademicClassData>) => {
    const res = await apiClient.patch<AcademicClassData>(`/classes/${id}`, data);
    return res.data;
  },

  deleteClass: async (id: string) => {
    const res = await apiClient.delete(`/classes/${id}`);
    return res.data;
  },

  // Sections
  listSections: async (classId?: string, params?: { teacherId?: string; status?: string; search?: string }) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '' && val !== 'all') {
          searchParams.append(key, String(val));
        }
      });
    }
    const endpoint = classId ? `/classes/${classId}/sections` : `/classes/sections/all`;
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    const res = await apiClient.get<SectionData[]>(`${endpoint}${query}`);
    return res.data || [];
  },

  getSection: async (id: string) => {
    const res = await apiClient.get<SectionData>(`/classes/sections/${id}`);
    return res.data;
  },

  createSection: async (classId: string, data: Partial<SectionData>) => {
    const res = await apiClient.post<SectionData>(`/classes/${classId}/sections`, data);
    return res.data;
  },

  updateSection: async (id: string, data: Partial<SectionData>) => {
    const res = await apiClient.patch<SectionData>(`/classes/sections/${id}`, data);
    return res.data;
  },

  deleteSection: async (id: string) => {
    const res = await apiClient.delete(`/classes/sections/${id}`);
    return res.data;
  },

  // Members
  getSectionMembers: async (sectionId: string) => {
    const res = await apiClient.get<SectionMemberData[]>(`/classes/sections/${sectionId}/members`);
    return res.data || [];
  },

  addSectionMember: async (sectionId: string, userId: string, rollNo?: string) => {
    const res = await apiClient.post<{ success: boolean; message: string }>(`/classes/sections/${sectionId}/members`, {
      userId,
      rollNo,
    });
    return res.data;
  },

  removeSectionMember: async (sectionId: string, userId: string) => {
    const res = await apiClient.delete(`/classes/sections/${sectionId}/members/${userId}`);
    return res.data;
  },
};

