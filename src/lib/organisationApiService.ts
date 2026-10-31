import { apiClient } from './apiClient';

export interface CompanyProfileData {
  id?: string;
  name?: string;
  legalName?: string;
  tradeName?: string;
  code?: string;
  website?: string;
  officialEmail?: string;
  phone?: string;
  hrEmail?: string;
  logo?: string;
  logoUrl?: string;
  cinNumber?: string;
  taxId?: string;
  gstin?: string;
  incorporationDate?: string;
  streetAddress?: string;
  suite?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  currency?: string;
  timezone?: string;
  fiscalYear?: string;
  fiscalYearStart?: string;
  workWeek?: string;
  workWeekPattern?: string;
  estDate?: string;
  status?: string;
}

export interface BranchData {
  id: string;
  companyId?: string;
  name: string;
  code: string;
  city: string;
  state?: string;
  country: string;
  isHeadquarters: boolean;
  address?: string;
  postalCode?: string;
  timezone?: string;
  capacity?: number;
  status?: string;
  phone?: string;
  email?: string;
  contactPerson?: string;
}

export interface DepartmentData {
  id: string;
  companyId?: string;
  name: string;
  code: string;
  headId?: string;
  headUserId?: string;
  headUser?: {
    id: string;
    displayName: string;
    email: string;
  };
  parentId?: string;
  costCenter?: string;
  description?: string;
  status?: string;
  memberCount?: number;
  _count?: {
    users?: number;
  };
  children?: DepartmentData[];
}

export interface DesignationData {
  id: string;
  companyId?: string;
  departmentId: string;
  department?: DepartmentData;
  name: string;
  code?: string;
  gradeBand?: string;
  minSalary?: number;
  maxSalary?: number;
  description?: string;
}

export const organisationApi = {
  // Company Profile
  getCompanyProfile: async () => {
    const res = await apiClient.get<CompanyProfileData>('/admin/organisation/company-profile');
    return res.data;
  },

  updateCompanyProfile: async (data: Partial<CompanyProfileData>) => {
    const res = await apiClient.patch<CompanyProfileData>('/admin/organisation/company-profile', data);
    return res.data;
  },

  uploadLogo: async (fileOrFormData: FormData | { logoUrl: string }) => {
    if (fileOrFormData instanceof FormData) {
      const res = await apiClient.upload<CompanyProfileData>('/admin/organisation/company-profile/logo', fileOrFormData);
      return res.data;
    } else {
      const res = await apiClient.post<CompanyProfileData>('/admin/organisation/company-profile/logo', fileOrFormData);
      return res.data;
    }
  },

  // Branches
  getBranches: async () => {
    const res = await apiClient.get<BranchData[]>('/admin/organisation/branches');
    return res.data;
  },

  createBranch: async (branch: Partial<BranchData>) => {
    const res = await apiClient.post<BranchData>('/admin/organisation/branches', branch);
    return res.data;
  },

  updateBranch: async (id: string, branch: Partial<BranchData>) => {
    const res = await apiClient.patch<BranchData>(`/admin/organisation/branches/${id}`, branch);
    return res.data;
  },

  deleteBranch: async (id: string) => {
    const res = await apiClient.delete(`/admin/organisation/branches/${id}`);
    return res.data;
  },

  // Departments
  getDepartments: async () => {
    const res = await apiClient.get<DepartmentData[]>('/admin/departments');
    return res.data;
  },

  createDepartment: async (dept: Partial<DepartmentData>) => {
    const res = await apiClient.post<DepartmentData>('/admin/departments', dept);
    return res.data;
  },

  updateDepartment: async (id: string, dept: Partial<DepartmentData>) => {
    const res = await apiClient.patch<DepartmentData>(`/admin/departments/${id}`, dept);
    return res.data;
  },

  deleteDepartment: async (id: string) => {
    const res = await apiClient.delete(`/admin/departments/${id}`);
    return res.data;
  },

  // Designations
  getDesignations: async (departmentId?: string) => {
    const query = departmentId ? `?departmentId=${encodeURIComponent(departmentId)}` : '';
    const res = await apiClient.get<DesignationData[]>(`/admin/designations${query}`);
    return res.data;
  },

  createDesignation: async (desig: Partial<DesignationData>) => {
    const res = await apiClient.post<DesignationData>('/admin/designations', desig);
    return res.data;
  },

  updateDesignation: async (id: string, desig: Partial<DesignationData>) => {
    const res = await apiClient.patch<DesignationData>(`/admin/designations/${id}`, desig);
    return res.data;
  },

  deleteDesignation: async (id: string) => {
    const res = await apiClient.delete(`/admin/designations/${id}`);
    return res.data;
  },
};

