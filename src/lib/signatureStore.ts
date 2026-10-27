// ============================================================
// LMS - Digital Signature Store (Zustand + LocalStorage)
// Manages creator authorized signatory profiles, signature image assets,
// approved institution signatories, and certificate snapshotting.
// ============================================================
import { create } from 'zustand';
import { UserSignatureSettings, User } from '../types';

const STORAGE_KEY_SIGNATURES = 'venilearn_user_signatures';

export interface ApprovedSignatory {
  id: string;
  userId?: string;
  name: string;
  designation: string;
  department?: string;
  signatureImage?: string;
  isDefault?: boolean;
}

const DEFAULT_APPROVED_SIGNATORIES: ApprovedSignatory[] = [
  {
    id: 'sig-001',
    userId: 'u-002', // Dr. James Wilson
    name: 'Dr. James Wilson',
    designation: 'Principal Faculty & Curriculum Director',
    department: 'Computer Science & Engineering',
    signatureImage: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="220" height="60" viewBox="0 0 220 60"><path d="M15 42 C 30 20, 50 15, 65 35 C 75 48, 90 20, 110 25 C 130 30, 140 45, 160 30 C 180 15, 195 35, 205 38" fill="none" stroke="%231e293b" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    isDefault: true,
  },
  {
    id: 'sig-002',
    userId: 'u-001', // Sarah Chen
    name: 'Sarah Chen',
    designation: 'Dean of Academic Affairs',
    department: 'Academic Operations',
    signatureImage: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="220" height="60" viewBox="0 0 220 60"><path d="M20 35 C 35 15, 55 12, 70 38 C 85 45, 100 25, 125 22 C 145 20, 165 42, 185 28 C 195 22, 205 32, 210 35" fill="none" stroke="%231e293b" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    isDefault: false,
  },
  {
    id: 'sig-003',
    userId: 'u-003', // Marcus Vance
    name: 'Marcus Vance',
    designation: 'Director of Industry Partnerships',
    department: 'Industry Relations',
    signatureImage: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="220" height="60" viewBox="0 0 220 60"><path d="M18 40 C 40 18, 60 22, 80 42 C 95 48, 120 18, 145 30 C 170 42, 185 20, 205 25" fill="none" stroke="%231e293b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    isDefault: false,
  },
];

interface SignatureStoreState {
  userSignatures: Record<string, UserSignatureSettings>;
  approvedSignatories: ApprovedSignatory[];
  
  // Actions
  getUserSignature: (userId: string) => UserSignatureSettings | undefined;
  saveUserSignature: (userId: string, settings: UserSignatureSettings) => void;
  getApprovedSignatories: () => ApprovedSignatory[];
  addApprovedSignatory: (signatory: ApprovedSignatory) => void;
  hasConfiguredSignature: (user?: User | null) => boolean;
  getDefaultSignatoryForUser: (user?: User | null) => {
    name: string;
    designation: string;
    signatureImage?: string;
    isConfigured: boolean;
  };
}

function loadSignaturesFromStorage(): Record<string, UserSignatureSettings> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SIGNATURES);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('Failed to load user signatures from storage:', err);
  }
  return {
    'u-002': {
      signatoryName: 'Dr. James Wilson',
      designationTitle: 'Principal Faculty & Curriculum Director',
      signatureImage: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="220" height="60" viewBox="0 0 220 60"><path d="M15 42 C 30 20, 50 15, 65 35 C 75 48, 90 20, 110 25 C 130 30, 140 45, 160 30 C 180 15, 195 35, 205 38" fill="none" stroke="%231e293b" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      isConfigured: true,
      configuredAt: '2026-09-01T10:00:00Z',
    },
    'u-001': {
      signatoryName: 'Sarah Chen',
      designationTitle: 'Dean of Academic Affairs',
      signatureImage: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="220" height="60" viewBox="0 0 220 60"><path d="M20 35 C 35 15, 55 12, 70 38 C 85 45, 100 25, 125 22 C 145 20, 165 42, 185 28 C 195 22, 205 32, 210 35" fill="none" stroke="%231e293b" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      isConfigured: true,
      configuredAt: '2026-09-01T10:00:00Z',
    },
  };
}

export const useSignatureStore = create<SignatureStoreState>((set, get) => ({
  userSignatures: loadSignaturesFromStorage(),
  approvedSignatories: DEFAULT_APPROVED_SIGNATORIES,

  getUserSignature: (userId: string) => {
    return get().userSignatures[userId];
  },

  saveUserSignature: (userId: string, settings: UserSignatureSettings) => {
    const updated = {
      ...get().userSignatures,
      [userId]: {
        ...settings,
        isConfigured: Boolean(settings.signatoryName && settings.signatureImage),
        lastUpdated: new Date().toISOString(),
      },
    };
    set({ userSignatures: updated });
    try {
      localStorage.setItem(STORAGE_KEY_SIGNATURES, JSON.stringify(updated));
    } catch (err) {
      console.warn('Failed to persist signature to storage:', err);
    }
  },

  getApprovedSignatories: () => {
    return get().approvedSignatories;
  },

  addApprovedSignatory: (signatory: ApprovedSignatory) => {
    set((state) => ({
      approvedSignatories: [...state.approvedSignatories, signatory],
    }));
  },

  hasConfiguredSignature: (user?: User | null) => {
    if (!user) return false;
    const sig = get().userSignatures[user.id] || user.signatureSettings;
    return Boolean(sig && sig.isConfigured && sig.signatureImage);
  },

  getDefaultSignatoryForUser: (user?: User | null) => {
    if (!user) {
      return {
        name: 'Dr. James Wilson',
        designation: 'Principal Faculty',
        signatureImage: undefined,
        isConfigured: false,
      };
    }

    const sig = get().userSignatures[user.id] || user.signatureSettings;
    if (sig && sig.isConfigured) {
      return {
        name: sig.signatoryName,
        designation: sig.designationTitle,
        signatureImage: sig.signatureImage,
        isConfigured: true,
      };
    }

    // If unconfigured, provide their name & role title but mark isConfigured as false
    return {
      name: user.displayName || `${user.firstName} ${user.lastName}`,
      designation: user.activeRole === 'trainer' ? 'Lead Faculty' : 'Course Creator',
      signatureImage: undefined,
      isConfigured: false,
    };
  },
}));
