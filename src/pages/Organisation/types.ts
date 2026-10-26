// ============================================================
// Organisation Management Types
// Extracted from HRMS Super Admin for LMS Industrial Admin
// ============================================================

export interface Company {
  id: string;
  name: string;
  code: string;
  logo: string;
  currency: string;
  timezone: string;
  plan: 'Starter' | 'Growth' | 'Enterprise';
  status: 'Active' | 'Suspended';
  createdAt: string;
  tradeName?: string;
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
  fiscalYear?: string;
  workWeek?: string;
  officialEmail?: string;
  phone?: string;
  website?: string;
}

export interface Branch {
  id: string;
  companyId: string;
  name: string;
  code: string;
  city: string;
  state?: string;
  country: string;
  isHeadquarters: boolean;
  address?: string;
  postalCode?: string;
  timezone?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  capacity?: number;
  status?: 'Operational' | 'Planned' | 'Inactive';
}

export interface Department {
  id: string;
  companyId: string;
  name: string;
  code: string;
  headId?: string;
  costCenter?: string;
  description?: string;
  parentId?: string;
  status?: 'Active' | 'Inactive' | 'active' | 'inactive';
}

export interface Designation {
  id: string;
  companyId: string;
  name: string;
  departmentId: string;
  gradeBand?: string;
  minSalary?: number;
  maxSalary?: number;
  description?: string;
}

export interface TeamPod {
  id: string;
  companyId: string;
  name: string;
  departmentId: string;
  leadId: string;
  memberIds: string[];
  objective: string;
  status: 'Active' | 'Formulating' | 'Completed';
}

export interface Employee {
  id: string;
  companyId: string;
  branchId?: string;
  employeeCode: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  phone?: string;
  avatar?: string;
  departmentId: string;
  designationId: string;
  managerId?: string | null;
  role: string;
  status: 'Active' | 'OnLeave' | 'Terminated';
  joinDate?: string;
}

export interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'warning' | 'error' | 'info';
}
