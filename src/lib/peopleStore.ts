// ============================================================
// LMS - People Management Store (Zustand)
// Connected directly to backend API (/api/v1/people)
// ============================================================
import { create } from 'zustand';
import { User, UserAccountStatus, RoleName } from '../types';
import { peopleApi, ListPeopleParams } from './peopleApiService';
import { AUTH_SESSION_KEY } from './store';

function isMockSessionToken(): boolean {
  try {
    const raw = localStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) return false;
    const session = JSON.parse(raw);
    const token = session?.token;
    return typeof token === 'string' && (token.startsWith('venilearn-token-') || token.startsWith('demo-') || token.length < 20 || !token.includes('.'));
  } catch {
    return false;
  }
}

interface PeopleState {
  users: User[];
  isLoading: boolean;
  totalUsers: number;

  // API Actions
  fetchPeople: (params?: ListPeopleParams) => Promise<void>;
  getUserById: (id: string) => User | undefined;
  getStudents: () => User[];
  getFaculty: () => User[];
  getStaff: () => User[];
  isEmailTaken: (email: string, excludeUserId?: string) => boolean;

  addUser: (newUser: User) => Promise<{ success: boolean; message: string; user?: User; temporaryPassword?: string }>;
  resetPassword: (id: string) => Promise<{ success: boolean; message: string; temporaryPassword?: string }>;
  updateUser: (updatedUser: User) => Promise<{ success: boolean; message: string; user?: User }>;
  toggleUserStatus: (id: string) => Promise<{ success: boolean; message: string; newStatus?: UserAccountStatus }>;
  deleteUser: (id: string) => Promise<{ success: boolean; message: string }>;
  inviteUser: (id: string) => Promise<{ success: boolean; message: string }>;
}

export const usePeopleStore = create<PeopleState>((set, get) => ({
  users: [],
  isLoading: false,
  totalUsers: 0,

  fetchPeople: async (params?: ListPeopleParams) => {
    set({ isLoading: true });
    try {
      const res = await peopleApi.list(params);
      set({
        users: res.users || [],
        totalUsers: res.meta?.total || (res.users || []).length,
        isLoading: false,
      });
    } catch (err: any) {
      console.error('Failed to fetch people:', err);
      set({ isLoading: false });
    }
  },

  getUserById: (id: string) => {
    return get().users.find((u) => u.id === id);
  },

  getStudents: () => {
    return get().users.filter((u) => u.activeRole === 'student' || u.activeRole === 'learner');
  },

  getFaculty: () => {
    return get().users.filter((u) => u.activeRole === 'trainer' || u.activeRole === 'instructor');
  },

  getStaff: () => {
    return get().users.filter(
      (u) =>
        u.activeRole !== 'student' &&
        u.activeRole !== 'learner' &&
        u.activeRole !== 'trainer' &&
        u.activeRole !== 'instructor'
    );
  },

  isEmailTaken: (email: string, excludeUserId?: string) => {
    const normalized = email.trim().toLowerCase();
    return get().users.some(
      (u) => u.email.trim().toLowerCase() === normalized && u.id !== excludeUserId
    );
  },

  addUser: async (newUser: User) => {
    const { users, isEmailTaken } = get();

    if (isEmailTaken(newUser.email)) {
      return {
        success: false,
        message: `Email address "${newUser.email}" is already registered in this institution.`,
      };
    }

    try {
      const createdRes: any = await peopleApi.create({
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        displayName: newUser.displayName,
        activeRole: newUser.activeRole,
        departmentId: newUser.departmentId,
        rollNo: newUser.rollNo,
        phone: newUser.phone,
        specialization: newUser.specialization,
        status: newUser.status,
      });

      const returnedUser = createdRes?.user || createdRes;
      const temporaryPassword = createdRes?.temporaryPassword;
      const fallbackId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `member-${Date.now()}`;

      const userRecord: User = {
        ...newUser,
        ...returnedUser,
        id: returnedUser?.id || newUser.id || fallbackId,
        organizationId: returnedUser?.organizationId || newUser.organizationId || 'demo-org',
        status: returnedUser?.status || newUser.status || 'active',
        roles: returnedUser?.roles || newUser.roles || [],
        mfaEnabled: returnedUser?.mfaEnabled ?? newUser.mfaEnabled ?? false,
        createdAt: returnedUser?.createdAt || newUser.createdAt || new Date().toISOString(),
        updatedAt: returnedUser?.updatedAt || newUser.updatedAt || new Date().toISOString(),
      };

      set({ users: [userRecord, ...users], totalUsers: get().totalUsers + 1 });
      return {
        success: true,
        message: `Member "${newUser.displayName}" added successfully.`,
        user: userRecord,
        temporaryPassword,
      };
    } catch (err: any) {
      if (isMockSessionToken()) {
        const fallbackId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `member-${Date.now()}`;
        const mockedUser: User = {
          ...newUser,
          id: newUser.id || fallbackId,
          organizationId: newUser.organizationId || 'demo-org',
          roles: newUser.roles || [],
          status: newUser.status || 'active',
          mfaEnabled: newUser.mfaEnabled ?? false,
          createdAt: newUser.createdAt || new Date().toISOString(),
          updatedAt: newUser.updatedAt || new Date().toISOString(),
        };

        set({ users: [mockedUser, ...users], totalUsers: get().totalUsers + 1 });
        return {
          success: true,
          message: `Member "${newUser.displayName}" added successfully (Offline mode).`,
          user: mockedUser,
          temporaryPassword: 'Veni#' + Math.random().toString(36).slice(-6) + '9!',
        };
      }

      console.error('Failed to create user on backend:', err);
      return {
        success: false,
        message: err.message || 'Failed to add user to server.',
      };
    }
  },

  resetPassword: async (id: string) => {
    try {
      const res = await peopleApi.resetPassword(id);
      return {
        success: true,
        message: res.message || 'Temporary password reset successfully.',
        temporaryPassword: res.temporaryPassword,
      };
    } catch (err: any) {
      console.error('Failed to reset user password on backend:', err);
      return {
        success: false,
        message: err.message || 'Failed to reset password.',
      };
    }
  },

  updateUser: async (updatedUser: User) => {
    const { users, isEmailTaken } = get();

    if (isEmailTaken(updatedUser.email, updatedUser.id)) {
      return {
        success: false,
        message: `Email address "${updatedUser.email}" is already used by another account.`,
      };
    }

    try {
      await peopleApi.update(updatedUser.id, {
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        displayName: updatedUser.displayName,
        email: updatedUser.email,
        phone: updatedUser.phone,
        departmentId: updatedUser.departmentId,
        activeRole: updatedUser.activeRole,
        status: updatedUser.status,
        rollNo: updatedUser.rollNo,
        specialization: updatedUser.specialization,
      });

      const updated = users.map((u) => (u.id === updatedUser.id ? { ...updatedUser, updatedAt: new Date().toISOString() } : u));
      set({ users: updated });
      return {
        success: true,
        message: `Details updated for "${updatedUser.displayName}".`,
        user: updatedUser,
      };
    } catch (err: any) {
      console.error('Failed to update user on backend:', err);
      return {
        success: false,
        message: err.message || 'Failed to update user on server.',
      };
    }
  },

  toggleUserStatus: async (id: string) => {
    const { users } = get();
    const target = users.find((u) => u.id === id);
    if (!target) {
      return { success: false, message: 'User not found.' };
    }

    const nextStatus: UserAccountStatus = target.status === 'active' ? 'suspended' : 'active';
    try {
      const serverUser = await peopleApi.updateStatus(id, nextStatus);
      const actualStatus = serverUser?.status || nextStatus;
      const updated = users.map((u) => (u.id === id ? { ...u, status: actualStatus, updatedAt: new Date().toISOString() } : u));
      set({ users: updated });
      return {
        success: true,
        message: serverUser?.mustChangePassword
          ? target.status === 'pending_approval'
            ? `Approved ${target.displayName}; temporary login credentials were emailed to ${target.email}.`
            : `Temporary login credentials were resent to ${target.email}.`
          : `Account for "${target.displayName}" marked as ${actualStatus}.`,
        newStatus: actualStatus,
      };
    } catch (err: any) {
      console.error('Failed to toggle status on backend:', err);
      return {
        success: false,
        message: err.message || 'Failed to change user status.',
      };
    }
  },

  deleteUser: async (id: string) => {
    const { users } = get();
    const target = users.find((u) => u.id === id);
    if (!target) {
      return { success: false, message: 'User not found.' };
    }
    try {
      await peopleApi.delete(id);
      const updated = users.filter((u) => u.id !== id);
      set({ users: updated, totalUsers: Math.max(0, get().totalUsers - 1) });
      return {
        success: true,
        message: `User "${target.displayName}" removed successfully.`,
      };
    } catch (err: any) {
      console.error('Failed to delete user on backend:', err);
      return {
        success: false,
        message: err.message || 'Failed to remove user from server.',
      };
    }
  },

  inviteUser: async (id: string) => {
    try {
      const res = await peopleApi.invite(id);
      return {
        success: true,
        message: res.message || 'Invitation sent successfully.',
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Failed to send invitation.',
      };
    }
  },
}));
