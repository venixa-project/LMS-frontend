import React, { createContext, useContext, useState } from 'react';
import {
  Company,
  Branch,
  Department,
  Designation,
  TeamPod,
  Employee,
  ToastItem,
} from '../types';

export const defaultCompany: Company = {
  id: 'comp-1',
  name: 'Venixa Private Limited',
  tradeName: 'Venixa Technologies',
  code: 'VNX',
  logo: 'https://images.unsplash.com/photo-1572021335469-31706a17aaef?w=150&auto=format&fit=crop&q=80',
  cinNumber: 'U72200KA2023PTC178921',
  taxId: 'AABCV1234F',
  gstin: '29AABCV1234F1Z5',
  incorporationDate: '2023-01-15',
  streetAddress: 'Global Tech Park, Outer Ring Road',
  suite: 'Tower B, 7th Floor',
  city: 'Bengaluru',
  state: 'Karnataka',
  postalCode: '560103',
  country: 'India',
  currency: 'INR (₹)',
  timezone: 'Asia/Kolkata (IST, UTC+5:30)',
  fiscalYear: 'April 1 - March 31',
  workWeek: 'Monday - Friday (5 Days)',
  officialEmail: 'corporate@venixatech.com',
  phone: '+91 (80) 4123-9800',
  website: 'https://www.venixatech.com',
  plan: 'Enterprise',
  status: 'Active',
  createdAt: '2023-01-15',
};

export const defaultBranches: Branch[] = [
  {
    id: 'br-1',
    companyId: 'comp-1',
    name: 'Head Office - Hyderabad',
    code: 'HYD-HQ',
    city: 'Hyderabad',
    state: 'Telangana',
    country: 'India',
    isHeadquarters: true,
    address: 'Cyber Towers, HITEC City, Madhapur',
    postalCode: '500081',
    timezone: 'Asia/Kolkata (IST)',
    capacity: 350,
    status: 'Operational',
    phone: '+91 (40) 6789-1000',
    email: 'hyderabad.hq@venixatech.com',
  },
  {
    id: 'br-2',
    companyId: 'comp-1',
    name: 'Bangalore Tech Center',
    code: 'BLR-01',
    city: 'Bengaluru',
    state: 'Karnataka',
    country: 'India',
    isHeadquarters: false,
    address: 'Global Tech Park, Outer Ring Road, Bellandur',
    postalCode: '560103',
    timezone: 'Asia/Kolkata (IST)',
    capacity: 180,
    status: 'Operational',
    phone: '+91 (80) 4123-9800',
    email: 'bangalore.center@venixatech.com',
  },
  {
    id: 'br-3',
    companyId: 'comp-1',
    name: 'Mumbai Regional Innovation Hub',
    code: 'BOM-02',
    city: 'Mumbai',
    state: 'Maharashtra',
    country: 'India',
    isHeadquarters: false,
    address: 'Bandra Kurla Complex (BKC), Platina Building',
    postalCode: '400051',
    timezone: 'Asia/Kolkata (IST)',
    capacity: 120,
    status: 'Operational',
    phone: '+91 (22) 6789-2200',
    email: 'mumbai.hub@venixatech.com',
  },
  {
    id: 'br-4',
    companyId: 'comp-1',
    name: 'San Francisco Tech Center',
    code: 'SFO-HQ',
    city: 'San Francisco',
    state: 'California',
    country: 'United States',
    isHeadquarters: false,
    address: '100 Market St, Suite 400',
    postalCode: '94105',
    timezone: 'America/Los_Angeles (PST)',
    capacity: 85,
    status: 'Operational',
    phone: '+1 (415) 880-1200',
    email: 'sfo.office@venixatech.com',
  },
  {
    id: 'br-5',
    companyId: 'comp-1',
    name: 'Hyderabad Development Facility',
    code: 'HYD-03',
    city: 'Hyderabad',
    state: 'Telangana',
    country: 'India',
    isHeadquarters: false,
    address: 'HITEC City, WaveRock Tech Park',
    postalCode: '500081',
    timezone: 'Asia/Kolkata (IST)',
    capacity: 250,
    status: 'Planned',
    phone: '+91 (40) 4567-8900',
    email: 'hyderabad.ops@venixatech.com',
  },
];

export const defaultDepartments: Department[] = [
  { id: 'dept-1', companyId: 'comp-1', name: 'Engineering & Product', code: 'ENG', headId: 'emp-sa', costCenter: 'CC-ENG-101', description: 'Core product development, cloud infrastructure, and distributed systems.', status: 'Active' },
  { id: 'dept-fe', companyId: 'comp-1', name: 'Frontend Architecture', code: 'ENG-FE', headId: 'emp-1', parentId: 'dept-1', costCenter: 'CC-ENG-102', description: 'Web client frameworks, design systems, and user interfaces.', status: 'Active' },
  { id: 'dept-qa', companyId: 'comp-1', name: 'Quality Assurance & Testing', code: 'QA', headId: 'emp-1', parentId: 'dept-1', costCenter: 'CC-QA-201', description: 'Software quality metrics, test automation, and release verification.', status: 'Active' },
  { id: 'dept-2', companyId: 'comp-1', name: 'Human Resources & People', code: 'HR', headId: 'emp-2', costCenter: 'CC-HR-102', description: 'People operations, talent acquisition, culture, and employee success.', status: 'Active' },
  { id: 'dept-3', companyId: 'comp-1', name: 'Finance & Payroll', code: 'FIN', headId: 'emp-3', costCenter: 'CC-FIN-103', description: 'Fiscal accounting, payroll processing, statutory compliance, and financial audits.', status: 'Active' },
  { id: 'dept-4', companyId: 'comp-1', name: 'Sales & Growth', code: 'SALES', headId: 'emp-4', costCenter: 'CC-SALES-104', description: 'Enterprise business development, client partnerships, and revenue expansion.', status: 'Active' },
  { id: 'dept-mktg', companyId: 'comp-1', name: 'Brand Marketing & PR', code: 'MKTG', headId: 'emp-6', parentId: 'dept-4', costCenter: 'CC-MKTG-301', description: 'Corporate brand positioning, demand generation, and media relations.', status: 'Active' },
  { id: 'dept-5', companyId: 'comp-1', name: 'Operations & Facilities', code: 'OPS', headId: 'emp-5', costCenter: 'CC-OPS-105', description: 'Global workspace management, facilities maintenance, and operational logisitcs.', status: 'Active' },
];

export const defaultDesignations: Designation[] = [
  { id: 'desig-1', companyId: 'comp-1', name: 'VP of Engineering', departmentId: 'dept-1', gradeBand: 'Band L5 (Executive)', minSalary: 18000, maxSalary: 25000, description: 'Leads the core engineering division, system architecture, and strategic technology direction.' },
  { id: 'desig-fe-sr', companyId: 'comp-1', name: 'Staff Frontend Engineer', departmentId: 'dept-1', gradeBand: 'Band L4 (Lead / Principal)', minSalary: 11000, maxSalary: 16000, description: 'Technical architecture of web interfaces and frontend performance.' },
  { id: 'desig-2', companyId: 'comp-1', name: 'Senior Software Engineer', departmentId: 'dept-1', gradeBand: 'Band L3 (Senior)', minSalary: 8500, maxSalary: 13000, description: 'Full-stack application development, distributed APIs, and code quality standards.' },
  { id: 'desig-3', companyId: 'comp-1', name: 'HR Director', departmentId: 'dept-2', gradeBand: 'Band L5 (Executive)', minSalary: 15000, maxSalary: 22000, description: 'Oversees company-wide talent acquisition, HR policies, and strategic personnel management.' },
  { id: 'desig-hr-spec', companyId: 'comp-1', name: 'People Experience Partner', departmentId: 'dept-2', gradeBand: 'Band L2 (Mid-Level)', minSalary: 6500, maxSalary: 9500, description: 'Employee onboarding, engagement programs, and culture initiatives.' },
  { id: 'desig-fin-analyst', companyId: 'comp-1', name: 'Senior Financial Controller', departmentId: 'dept-3', gradeBand: 'Band L4 (Lead / Principal)', minSalary: 12000, maxSalary: 18000, description: 'Corporate audit oversight, financial forecasting, and compliance.' },
  { id: 'desig-4', companyId: 'comp-1', name: 'Payroll Specialist', departmentId: 'dept-3', gradeBand: 'Band L2 (Mid-Level)', minSalary: 5500, maxSalary: 8000, description: 'Monthly payroll runs, tax deductions, and employee compensation schedules.' },
  { id: 'desig-5', companyId: 'comp-1', name: 'Account Executive', departmentId: 'dept-4', gradeBand: 'Band L3 (Senior)', minSalary: 7000, maxSalary: 11000, description: 'Managing prospective client portfolios and client contract negotiation.' },
  { id: 'desig-6', companyId: 'comp-1', name: 'Operations Lead', departmentId: 'dept-5', gradeBand: 'Band L3 (Senior)', minSalary: 6000, maxSalary: 9500, description: 'Facility security, lease agreements, and hardware procurement coordination.' },
];

export const defaultEmployees: Employee[] = [
  {
    id: 'emp-sa',
    companyId: 'comp-1',
    branchId: 'br-1',
    employeeCode: 'SA-001',
    firstName: 'Super',
    lastName: 'Admin',
    email: 'super.admin@venixatech.com',
    phone: '+91 (80) 4123-9801',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    departmentId: 'Engineering & Product',
    designationId: 'VP of Engineering',
    role: 'SuperAdmin',
    status: 'Active',
    joinDate: '2023-01-01',
  },
  {
    id: 'emp-1',
    companyId: 'comp-1',
    branchId: 'br-1',
    employeeCode: 'EMP-1001',
    firstName: 'Aarav',
    lastName: 'Sharma',
    email: 'aarav.sharma@venixatech.com',
    phone: '+91 98765 43210',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    departmentId: 'Engineering & Product',
    designationId: 'Staff Frontend Engineer',
    role: 'Employee',
    status: 'Active',
    joinDate: '2023-02-15',
  },
  {
    id: 'emp-2',
    companyId: 'comp-1',
    branchId: 'br-2',
    employeeCode: 'EMP-1002',
    firstName: 'Priya',
    lastName: 'Nair',
    email: 'priya.nair@venixatech.com',
    phone: '+91 98765 43211',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    departmentId: 'Human Resources & People',
    designationId: 'HR Director',
    role: 'HR',
    status: 'Active',
    joinDate: '2023-03-01',
  },
  {
    id: 'emp-3',
    companyId: 'comp-1',
    branchId: 'br-2',
    employeeCode: 'EMP-1003',
    firstName: 'Rohan',
    lastName: 'Verma',
    email: 'rohan.verma@venixatech.com',
    phone: '+91 98765 43212',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    departmentId: 'Finance & Payroll',
    designationId: 'Senior Financial Controller',
    role: 'PayrollAdmin',
    status: 'Active',
    joinDate: '2023-04-10',
  },
  {
    id: 'emp-4',
    companyId: 'comp-1',
    branchId: 'br-3',
    employeeCode: 'EMP-1004',
    firstName: 'Ananya',
    lastName: 'Patel',
    email: 'ananya.patel@venixatech.com',
    phone: '+91 98765 43213',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    departmentId: 'Sales & Growth',
    designationId: 'Account Executive',
    role: 'Manager',
    status: 'Active',
    joinDate: '2023-05-20',
  },
  {
    id: 'emp-5',
    companyId: 'comp-1',
    branchId: 'br-1',
    employeeCode: 'EMP-1005',
    firstName: 'Devendra',
    lastName: 'Kulkarni',
    email: 'devendra.k@venixatech.com',
    phone: '+91 98765 43214',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    departmentId: 'Operations & Facilities',
    designationId: 'Operations Lead',
    role: 'Employee',
    status: 'Active',
    joinDate: '2023-06-01',
  },
  {
    id: 'emp-6',
    companyId: 'comp-1',
    branchId: 'br-2',
    employeeCode: 'EMP-1006',
    firstName: 'Meera',
    lastName: 'Iyer',
    email: 'meera.iyer@venixatech.com',
    phone: '+91 98765 43215',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    departmentId: 'Brand Marketing & PR',
    designationId: 'People Experience Partner',
    role: 'Employee',
    status: 'Active',
    joinDate: '2023-07-15',
  },
];

const STORAGE_KEY_BRANCHES = 'venilearn_branches';
const STORAGE_KEY_COMPANY = 'venilearn_company';

function loadInitialBranches(): Branch[] {
  try {
    const cached = localStorage.getItem(STORAGE_KEY_BRANCHES);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {}
  return defaultBranches;
}

function loadInitialCompany(): Company {
  try {
    const cached = localStorage.getItem(STORAGE_KEY_COMPANY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && typeof parsed === 'object') {
        return { ...defaultCompany, ...parsed };
      }
    }
  } catch (e) {}
  return defaultCompany;
}

interface OrganisationContextType {
  currentCompany: Company;
  updateCompany: (updates: Partial<Company>) => void;
  branches: Branch[];
  setBranches: React.Dispatch<React.SetStateAction<Branch[]>>;
  setHeadquartersBranch: (branchId: string) => { success: boolean; message: string };
  departments: Department[];
  setDepartments: React.Dispatch<React.SetStateAction<Department[]>>;
  designations: Designation[];
  setDesignations: React.Dispatch<React.SetStateAction<Designation[]>>;
  employees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  toasts: ToastItem[];
  showToast: (message: string, type?: ToastItem['type']) => void;
  removeToast: (id: string) => void;
}

const OrganisationContext = createContext<OrganisationContextType | null>(null);

export const OrganisationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentCompany, setCurrentCompany] = useState<Company>(loadInitialCompany);
  const [branches, setBranchesState] = useState<Branch[]>(loadInitialBranches);
  const [departments, setDepartments] = useState<Department[]>(defaultDepartments);
  const [designations, setDesignations] = useState<Designation[]>(defaultDesignations);
  const [employees, setEmployees] = useState<Employee[]>(defaultEmployees);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const setBranches: React.Dispatch<React.SetStateAction<Branch[]>> = (action) => {
    setBranchesState((prev) => {
      const next = typeof action === 'function' ? action(prev) : action;
      try {
        localStorage.setItem(STORAGE_KEY_BRANCHES, JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  const showToast = (message: string, type: ToastItem['type'] = 'info') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const updateCompany = (updates: Partial<Company>) => {
    setCurrentCompany((prev) => {
      const next = { ...prev, ...updates };
      try {
        localStorage.setItem(STORAGE_KEY_COMPANY, JSON.stringify(next));
        window.dispatchEvent(new CustomEvent('venilearn_company_updated', { detail: next }));
      } catch (e) {}
      return next;
    });
  };

  const setHeadquartersBranch = (branchId: string) => {
    const target = branches.find((b) => b.id === branchId);
    if (!target) {
      return { success: false, message: 'Selected branch location not found.' };
    }
    if (target.status === 'Inactive') {
      return { success: false, message: 'Inactive branch cannot be designated as Headquarters.' };
    }
    const previousHq = branches.find((b) => b.isHeadquarters);
    const updated = branches.map((b) => ({
      ...b,
      isHeadquarters: b.id === branchId,
    }));

    setBranches(updated);

    const message = previousHq && previousHq.id !== branchId
      ? `Headquarters successfully transferred from ${previousHq.name} to ${target.name} (${target.city})!`
      : `${target.name} (${target.city}) designated as Company Headquarters!`;

    showToast(message, 'success');
    return { success: true, message };
  };

  return (
    <OrganisationContext.Provider
      value={{
        currentCompany,
        updateCompany,
        branches,
        setBranches,
        setHeadquartersBranch,
        departments,
        setDepartments,
        designations,
        setDesignations,
        employees,
        setEmployees,
        toasts,
        showToast,
        removeToast,
      }}
    >
      {children}
    </OrganisationContext.Provider>
  );
};

export const useOrganisation = (): OrganisationContextType => {
  const context = useContext(OrganisationContext);
  if (!context) {
    throw new Error('useOrganisation must be used within an OrganisationProvider');
  }
  return context;
};

// Aliases for 100% drop-in compatibility with HRMS code
export const useHRMS = useOrganisation;
