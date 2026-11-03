import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Company,
  Branch,
  Department,
  Designation,
  TeamPod,
  Employee,
  ToastItem,
} from '../types';
import { organisationApi } from '../../../lib/organisationApiService';
import { peopleApi } from '../../../lib/peopleApiService';
import { saveCompanyBranding } from '../../../lib/useOrganisationBranding';

const initialCompany: Company = {
  id: '',
  name: '',
  tradeName: '',
  code: '',
  logo: '',
  cinNumber: '',
  taxId: '',
  gstin: '',
  incorporationDate: '',
  streetAddress: '',
  suite: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'India',
  currency: 'INR (â‚¹)',
  timezone: 'Asia/Kolkata (IST, UTC+5:30)',
  fiscalYear: 'April 1 - March 31',
  workWeek: 'Monday - Friday (5 Days)',
  officialEmail: '',
  phone: '',
  website: '',
  plan: 'Enterprise',
  status: 'Active',
  createdAt: new Date().toISOString(),
};

interface OrganisationContextType {
  currentCompany: Company;
  updateCompany: (updates: Partial<Company>) => Promise<void>;
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
  isLoading: boolean;
  refreshData: () => Promise<void>;
}

const OrganisationContext = createContext<OrganisationContextType | null>(null);

export const useOrganisation = () => {
  const context = useContext(OrganisationContext);
  if (!context) {
    throw new Error('useOrganisation must be used within an OrganisationProvider');
  }
  return context;
};

export const OrganisationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentCompany, setCurrentCompany] = useState<Company>(initialCompany);
  const [branches, setBranchesState] = useState<Branch[]>([]);
  const [departments, setDepartmentsState] = useState<Department[]>([]);
  const [designations, setDesignationsState] = useState<Designation[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

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

  // Fetch real data from backend API
  const refreshData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [profileRes, branchesRes, deptsRes, desigsRes, peopleRes] = await Promise.allSettled([
        organisationApi.getCompanyProfile(),
        organisationApi.getBranches(),
        organisationApi.getDepartments(),
        organisationApi.getDesignations(),
        peopleApi.list({ limit: 100 }),
      ]);

      if (profileRes.status === 'fulfilled' && profileRes.value) {
        const p = profileRes.value;
        setCurrentCompany({
          id: p.id || '',
          name: p.legalName || p.name || 'Enterprise LMS',
          tradeName: p.tradeName || p.name || '',
          code: p.code || 'ORG-01',
          logo: p.logoUrl || p.logo || '',
          cinNumber: p.cinNumber || '',
          taxId: p.taxId || '',
          gstin: p.gstin || '',
          incorporationDate: p.incorporationDate ? p.incorporationDate.split('T')[0] : '',
          streetAddress: p.streetAddress || '',
          suite: p.suite || '',
          city: p.city || '',
          state: p.state || '',
          postalCode: p.postalCode || '',
          country: p.country || 'India',
          currency: p.currency || 'INR (â‚¹)',
          timezone: p.timezone || 'Asia/Kolkata (IST, UTC+5:30)',
          fiscalYear: p.fiscalYearStart || p.fiscalYear || 'April 1 - March 31',
          workWeek: p.workWeekPattern || p.workWeek || 'Monday - Friday (5 Days)',
          officialEmail: p.officialEmail || '',
          phone: p.phone || '',
          website: p.website || '',
          plan: 'Enterprise',
          status: 'Active',
          createdAt: p.estDate || new Date().toISOString(),
        });
      }

      if (branchesRes.status === 'fulfilled' && Array.isArray(branchesRes.value)) {
        setBranchesState(
          branchesRes.value.map((b) => ({
            id: b.id,
            companyId: b.companyId || 'comp-1',
            name: b.name,
            code: b.code,
            city: b.city,
            state: b.state || '',
            country: b.country || 'India',
            isHeadquarters: !!b.isHeadquarters,
            address: b.address || '',
            postalCode: b.postalCode || '',
            timezone: b.timezone || 'Asia/Kolkata (IST)',
            capacity: b.capacity || 0,
            status: (b.status as any) || 'Operational',
            phone: b.phone || '',
            email: b.email || '',
            contactPerson: b.contactPerson || '',
          }))
        );
      }

      if (deptsRes.status === 'fulfilled' && Array.isArray(deptsRes.value)) {
        setDepartmentsState(
          deptsRes.value.map((d) => ({
            id: d.id,
            companyId: d.companyId || 'comp-1',
            name: d.name,
            code: d.code,
            headId: d.headUserId || d.headId || '',
            costCenter: d.costCenter || '',
            description: d.description || '',
            parentId: d.parentId || '',
            status: (d.status as any) || 'Active',
          }))
        );
      }

      if (desigsRes.status === 'fulfilled' && Array.isArray(desigsRes.value)) {
        setDesignationsState(
          desigsRes.value.map((ds) => ({
            id: ds.id,
            companyId: ds.companyId || 'comp-1',
            name: ds.name,
            departmentId: ds.departmentId,
            gradeBand: ds.gradeBand || '',
            minSalary: ds.minSalary ? Number(ds.minSalary) : undefined,
            maxSalary: ds.maxSalary ? Number(ds.maxSalary) : undefined,
            description: ds.description || '',
          }))
        );
      }

      if (peopleRes.status === 'fulfilled' && peopleRes.value?.users) {
        setEmployees(
          peopleRes.value.users.map((u: any) => ({
            id: u.id,
            companyId: 'comp-1',
            branchId: u.branchId || undefined,
            employeeCode: u.rollNo || u.id.slice(0, 8),
            firstName: u.firstName || '',
            lastName: u.lastName || '',
            email: u.email || '',
            phone: u.phone || '',
            avatar: u.avatarUrl || u.avatar || '',
            departmentId: u.departmentId || '',
            designationId: u.designationId || '',
            role: u.activeRole || 'Employee',
            status: u.status === 'active' ? 'Active' : u.status === 'suspended' ? 'OnLeave' : 'Active',
            joinDate: u.createdAt ? u.createdAt.split('T')[0] : '',
          }))
        );
      }
    } catch (err: any) {
      console.error('Failed to load organisation data from API:', err);
      showToast('Failed to connect to backend server', 'error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Update company profile through API
  const updateCompany = async (updates: Partial<Company>) => {
    try {
      setCurrentCompany((prev) => ({ ...prev, ...updates }));

      const payload = {
        legalName: updates.name,
        tradeName: updates.tradeName,
        code: updates.code,
        website: updates.website,
        officialEmail: updates.officialEmail,
        phone: updates.phone,
        hrEmail: (updates as any).hrEmail,
        logoUrl: updates.logo,
        cinNumber: updates.cinNumber,
        taxId: updates.taxId,
        gstin: updates.gstin,
        incorporationDate: updates.incorporationDate,
        streetAddress: updates.streetAddress,
        suite: updates.suite,
        city: updates.city,
        state: updates.state,
        postalCode: updates.postalCode,
        country: updates.country,
        currency: updates.currency,
        timezone: updates.timezone,
        fiscalYearStart: updates.fiscalYear,
        workWeekPattern: updates.workWeek,
      };

      try {
        const updated = await organisationApi.updateCompanyProfile(payload);
        if (updated) {
          saveCompanyBranding({ name: updates.name, tradeName: updates.tradeName, code: updates.code, logo: updates.logo, website: updates.website });
        }
      } catch (err: any) {
        saveCompanyBranding({ name: updates.name, tradeName: updates.tradeName, code: updates.code, logo: updates.logo, website: updates.website });
        throw err;
      }
    } catch (err: any) {
      console.error('Failed to save company profile:', err);
      throw err;
    }
  };

  // Set Branches and persist
  const setBranches: React.Dispatch<React.SetStateAction<Branch[]>> = (action) => {
    setBranchesState((prev) => {
      const next = typeof action === 'function' ? action(prev) : action;

      // Check if item added
      if (next.length > prev.length) {
        const added = next.find((n) => !prev.some((p) => p.id === n.id));
        if (added) {
          organisationApi
            .createBranch({
              name: added.name,
              code: added.code,
              city: added.city,
              state: added.state,
              country: added.country,
              isHeadquarters: added.isHeadquarters,
              address: added.address,
              postalCode: added.postalCode,
              timezone: added.timezone,
              capacity: added.capacity,
              phone: added.phone,
              email: added.email,
              contactPerson: added.contactPerson,
            })
            .then((created) => {
              if (created?.id) {
                setBranchesState((curr) => curr.map((b) => (b.id === added.id ? { ...b, id: created.id } : b)));
              }
            })
            .catch((err) => console.error('Failed to create branch on backend:', err));
        }
      } else if (next.length < prev.length) {
        // Item removed
        const removed = prev.find((p) => !next.some((n) => n.id === p.id));
        if (removed && !removed.id.startsWith('temp-')) {
          organisationApi
            .deleteBranch(removed.id)
            .catch((err) => console.error('Failed to delete branch on backend:', err));
        }
      }

      return next;
    });
  };

  // Set headquarters branch
  const setHeadquartersBranch = (branchId: string): { success: boolean; message: string } => {
    const targetBranch = branches.find((b) => b.id === branchId);
    if (!targetBranch) {
      return { success: false, message: 'Branch not found' };
    }

    setBranchesState((prev) =>
      prev.map((b) => ({
        ...b,
        isHeadquarters: b.id === branchId,
      }))
    );

    organisationApi
      .updateBranch(branchId, { isHeadquarters: true })
      .then(() => {
        showToast(`${targetBranch.name} designated as corporate headquarters`, 'success');
      })
      .catch((err) => {
        console.error('Failed to update headquarters branch:', err);
        showToast('Failed to update headquarters on server', 'error');
      });

    return { success: true, message: `${targetBranch.name} set as headquarters` };
  };

  // Set Departments and persist
  const setDepartments: React.Dispatch<React.SetStateAction<Department[]>> = (action) => {
    setDepartmentsState((prev) => {
      const next = typeof action === 'function' ? action(prev) : action;

      if (next.length > prev.length) {
        const added = next.find((n) => !prev.some((p) => p.id === n.id));
        if (added) {
          organisationApi
            .createDepartment({
              name: added.name,
              code: added.code,
              headUserId: added.headId || undefined,
              costCenter: added.costCenter,
              description: added.description,
              parentId: added.parentId || undefined,
            })
            .then((created) => {
              if (created?.id) {
                setDepartmentsState((curr) => curr.map((d) => (d.id === added.id ? { ...d, id: created.id } : d)));
              }
            })
            .catch((err) => console.error('Failed to create department on backend:', err));
        }
      } else if (next.length < prev.length) {
        const removed = prev.find((p) => !next.some((n) => n.id === p.id));
        if (removed && !removed.id.startsWith('temp-')) {
          organisationApi
            .deleteDepartment(removed.id)
            .catch((err) => console.error('Failed to delete department on backend:', err));
        }
      }

      return next;
    });
  };

  // Set Designations and persist
  const setDesignations: React.Dispatch<React.SetStateAction<Designation[]>> = (action) => {
    setDesignationsState((prev) => {
      const next = typeof action === 'function' ? action(prev) : action;

      if (next.length > prev.length) {
        const added = next.find((n) => !prev.some((p) => p.id === n.id));
        if (added) {
          organisationApi
            .createDesignation({
              name: added.name,
              departmentId: added.departmentId,
              gradeBand: added.gradeBand,
              minSalary: added.minSalary,
              maxSalary: added.maxSalary,
              description: added.description,
            })
            .then((created) => {
              if (created?.id) {
                setDesignationsState((curr) => curr.map((d) => (d.id === added.id ? { ...d, id: created.id } : d)));
              }
            })
            .catch((err) => console.error('Failed to create designation on backend:', err));
        }
      } else if (next.length < prev.length) {
        const removed = prev.find((p) => !next.some((n) => n.id === p.id));
        if (removed && !removed.id.startsWith('temp-')) {
          organisationApi
            .deleteDesignation(removed.id)
            .catch((err) => console.error('Failed to delete designation on backend:', err));
        }
      }

      return next;
    });
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
        isLoading,
        refreshData,
      }}
    >
      {children}
    </OrganisationContext.Provider>
  );
};

export const useHRMS = (): OrganisationContextType => {
  const context = useContext(OrganisationContext);
  if (!context) {
    throw new Error('useHRMS must be used within an OrganisationProvider');
  }
  return context;
};
