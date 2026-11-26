// ============================================================
// LMS - Organisation Branding Hook & Persistence Store
// Single source of truth for global company branding (Logo & Name)
// Syncs in real-time between Company Profile editor, Topbar, and Sidebar
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from './store';

export const STORAGE_KEY_COMPANY = 'venilearn_company';
export const STORAGE_KEY_BRANDING_VERSION = 'venilearn_branding_version';
export const CURRENT_BRANDING_VERSION = 'v5_fresh_reset';

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
  name: 'VeniLearn Academic Institution',
  tradeName: 'VeniLearn Academic Institution',
  code: 'VENI-001',
  logo: '/logo.png',
  website: 'https://venilearn.com',
  status: 'Active',
};

/**
 * Returns tenant fallback branding for a given organization ID
 */
export function getFallbackForOrg(orgId?: string): CompanyBrandingData {
  return defaultCompanyBranding;
}

/**
 * Loads current company branding from persistent storage with default fallback
 */
export function getSavedCompanyBranding(orgId?: string): CompanyBrandingData {
  const effectiveOrgId = orgId || sessionStorage.getItem('venilearn_active_org_id') || 'org-001';
  const fallback = getFallbackForOrg(effectiveOrgId);

  try {
    const version = localStorage.getItem(STORAGE_KEY_BRANDING_VERSION);
    if (version !== CURRENT_BRANDING_VERSION) {
      // Clear out legacy RAPA TECH or old demo company caches
      localStorage.removeItem(STORAGE_KEY_COMPANY);
      Object.keys(localStorage)
        .filter((k) => k.startsWith(`${STORAGE_KEY_COMPANY}_`))
        .forEach((k) => localStorage.removeItem(k));
      localStorage.setItem(STORAGE_KEY_BRANDING_VERSION, CURRENT_BRANDING_VERSION);
      return fallback;
    }

    // If tenant-specific key exists, check that first
    if (effectiveOrgId && effectiveOrgId !== 'org-001') {
      const tenantKey = `${STORAGE_KEY_COMPANY}_${effectiveOrgId}`;
      const tenantRaw = localStorage.getItem(tenantKey);
      if (tenantRaw) {
        const parsed = JSON.parse(tenantRaw);
        if (parsed && typeof parsed === 'object') {
          if (parsed.name?.includes('RAPA') || parsed.tradeName?.includes('RAPA')) {
            localStorage.removeItem(tenantKey);
          } else {
            return { ...fallback, ...parsed };
          }
        }
      }
    }

    const raw = localStorage.getItem(STORAGE_KEY_COMPANY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        if (parsed.name?.includes('RAPA') || parsed.tradeName?.includes('RAPA')) {
          localStorage.removeItem(STORAGE_KEY_COMPANY);
          return fallback;
        }
        return { ...fallback, ...parsed };
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

  const companyName = branding.tradeName || branding.name || 'VeniLearn Academic Institution';
  const legalName = branding.name || 'VeniLearn Academic Institution';
  const companyLogo = branding.logo || '/logo.png';
  const hasCustomLogo = Boolean(companyLogo && companyLogo.trim().length > 0 && companyLogo !== '/logo.png');
  const companyCode = branding.code || 'VENI-001';

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
