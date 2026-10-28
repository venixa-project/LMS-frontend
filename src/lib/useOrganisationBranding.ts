// ============================================================
// LMS - Organisation Branding Hook & Persistence Store
// Single source of truth for global company branding (Logo & Name)
// Syncs in real-time between Company Profile editor, Topbar, and Sidebar
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from './store';

export const STORAGE_KEY_COMPANY = 'venilearn_company';

export interface CompanyBrandingData {
  id?: string;
  name?: string;
  tradeName?: string;
  code?: string;
  logo?: string;
  website?: string;
  status?: string;
}

export const defaultCompanyBranding: CompanyBrandingData = {
  id: 'comp-1',
  name: 'Venixa Private Limited',
  tradeName: 'Venixa Technologies',
  code: 'VNX',
  logo: 'https://images.unsplash.com/photo-1572021335469-31706a17aaef?w=150&auto=format&fit=crop&q=80',
  website: 'https://www.venixatech.com',
  status: 'Active',
};

/**
 * Returns tenant fallback branding for a given organization ID
 */
export function getFallbackForOrg(orgId?: string): CompanyBrandingData {
  if (orgId === 'org-002') {
    return {
      id: 'comp-2',
      name: 'TechStart Academy',
      tradeName: 'TechStart Academy',
      code: 'TSA',
      logo: '',
      website: 'https://techstart.edu',
      status: 'Active',
    };
  }
  if (orgId === 'org-003') {
    return {
      id: 'comp-3',
      name: 'Global Education Partners',
      tradeName: 'Global Education Partners',
      code: 'GEP',
      logo: '',
      website: 'https://gep.org',
      status: 'Active',
    };
  }
  return defaultCompanyBranding;
}

/**
 * Loads current company branding from persistent storage with default fallback
 */
export function getSavedCompanyBranding(orgId?: string): CompanyBrandingData {
  const effectiveOrgId = orgId || sessionStorage.getItem('venilearn_active_org_id') || 'org-001';
  const fallback = getFallbackForOrg(effectiveOrgId);

  try {
    // If tenant-specific key exists, check that first
    if (effectiveOrgId && effectiveOrgId !== 'org-001') {
      const tenantKey = `${STORAGE_KEY_COMPANY}_${effectiveOrgId}`;
      const tenantRaw = localStorage.getItem(tenantKey);
      if (tenantRaw) {
        const parsed = JSON.parse(tenantRaw);
        if (parsed && typeof parsed === 'object') {
          return { ...fallback, ...parsed };
        }
      }
    }

    const raw = localStorage.getItem(STORAGE_KEY_COMPANY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        if (effectiveOrgId === 'org-001') {
          return { ...fallback, ...parsed };
        }
      }
    }
  } catch (err) {
    console.error('Failed to parse saved company branding:', err);
  }
  return fallback;
}

/**
 * Saves company branding to persistent storage and broadcasts update event
 */
export function saveCompanyBranding(updates: Partial<CompanyBrandingData>, orgId?: string): CompanyBrandingData {
  const effectiveOrgId = orgId || sessionStorage.getItem('venilearn_active_org_id') || 'org-001';
  const current = getSavedCompanyBranding(effectiveOrgId);
  const next = { ...current, ...updates };

  try {
    localStorage.setItem(STORAGE_KEY_COMPANY, JSON.stringify(next));
    if (effectiveOrgId && effectiveOrgId !== 'org-001') {
      localStorage.setItem(`${STORAGE_KEY_COMPANY}_${effectiveOrgId}`, JSON.stringify(next));
    }
    // Broadcast custom event for immediate zero-refresh updates
    window.dispatchEvent(new CustomEvent('venilearn_company_updated', { detail: next }));
  } catch (err) {
    console.error('Failed to save company branding:', err);
  }

  return next;
}

export interface UseOrganisationBrandingReturn {
  companyName: string;
  legalName: string;
  companyLogo: string;
  hasCustomLogo: boolean;
  companyCode: string;
  rawCompany: CompanyBrandingData;
  isPlatformAdmin: boolean;
  updateBranding: (updates: Partial<CompanyBrandingData>) => void;
}

/**
 * Shared React hook for organization branding across Navbar, Sidebar, and Company Profile
 */
export function useOrganisationBranding(orgIdOverride?: string): UseOrganisationBrandingReturn {
  const { user } = useAuthStore();
  const isPlatformAdmin = user?.activeRole === 'platform_admin';
  const effectiveOrgId = orgIdOverride || (isPlatformAdmin ? sessionStorage.getItem('venilearn_active_org_id') || 'org-001' : user?.organizationId || 'org-001');

  const [branding, setBranding] = useState<CompanyBrandingData>(() => getSavedCompanyBranding(effectiveOrgId));

  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<CompanyBrandingData>;
      if (customEvent.detail) {
        setBranding(customEvent.detail);
      } else {
        const currentOrg = orgIdOverride || (isPlatformAdmin ? sessionStorage.getItem('venilearn_active_org_id') || 'org-001' : user?.organizationId || 'org-001');
        setBranding(getSavedCompanyBranding(currentOrg));
      }
    };

    const handleOrgSwitch = (e: Event) => {
      const customEvent = e as CustomEvent<{ orgId: string }>;
      const nextOrg = customEvent.detail?.orgId || 'org-001';
      setBranding(getSavedCompanyBranding(nextOrg));
    };

    window.addEventListener('venilearn_company_updated', handleUpdate);
    window.addEventListener('venilearn_org_switched', handleOrgSwitch);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('venilearn_company_updated', handleUpdate);
      window.removeEventListener('venilearn_org_switched', handleOrgSwitch);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [effectiveOrgId, isPlatformAdmin, orgIdOverride, user?.organizationId]);

  const updateBranding = useCallback(
    (updates: Partial<CompanyBrandingData>) => {
      const saved = saveCompanyBranding(updates, effectiveOrgId);
      setBranding(saved);
    },
    [effectiveOrgId]
  );

  const companyName = branding.tradeName || branding.name || 'Venixa Technologies';
  const legalName = branding.name || 'Venixa Private Limited';
  const companyLogo = branding.logo || '';
  const hasCustomLogo = Boolean(companyLogo && companyLogo.trim().length > 0);
  const companyCode = branding.code || 'VNX';

  return {
    companyName,
    legalName,
    companyLogo,
    hasCustomLogo,
    companyCode,
    rawCompany: branding,
    isPlatformAdmin,
    updateBranding,
  };
}
