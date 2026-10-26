// ============================================================
// LMS - People Management Store (Zustand)
// Manages Students, Faculty, Trainers, and Staff across
// unified directories, dedicated creation pages, and edit workflows.
// ============================================================
import { create } from 'zustand';
import { User, UserAccountStatus, RoleName } from '../types';
import { mockUsers } from '../data/mockUsers';

interface PeopleState {
  users: User[];

  // Selectors & Queries
  getUserById: (id: string) => User | undefined;
  getStudents: () => User[];
  getFaculty: () => User[];
  getStaff: () => User[];
  isEmailTaken: (email: string, excludeUserId?: string) => boolean;

  // Actions
  addUser: (newUser: User) => { success: boolean; message: string; user?: User };
  updateUser: (updatedUser: User) => { success: boolean; message: string; user?: User };
  toggleUserStatus: (id: string) => { success: boolean; message: string; newStatus?: UserAccountStatus };
  deleteUser: (id: string) => { success: boolean; message: string };
  resetToDefaults: () => void;
}

const STORAGE_KEY_PEOPLE = 'venilearn_people_data';

function loadInitialUsers(): User[] {
  try {
    const cached = localStorage.getItem(STORAGE_KEY_PEOPLE);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to parse cached people from storage', e);
  }
  return mockUsers;
}

function persistUsers(users: User[]) {
  try {
    localStorage.setItem(STORAGE_KEY_PEOPLE, JSON.stringify(users));
  } catch (e) {
    console.error('Failed to save people to storage', e);
  }
}

export const usePeopleStore = create<PeopleState>((set, get) => ({
  users: loadInitialUsers(),

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
    return get().users.filter((u) => 
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

  addUser: (newUser: User) => {
    const { users, isEmailTaken } = get();

    if (isEmailTaken(newUser.email)) {
      return {
        success: false,
        message: `Email address "${newUser.email}" is already registered in this institution.`
      };
    }

    const updated = [newUser, ...users];
    set({ users: updated });
    persistUsers(updated);
    return {
      success: true,
      message: `Member "${newUser.displayName}" added successfully.`,
      user: newUser
    };
  },

  updateUser: (updatedUser: User) => {
    const { users, isEmailTaken } = get();

    if (isEmailTaken(updatedUser.email, updatedUser.id)) {
      return {
        success: false,
        message: `Email address "${updatedUser.email}" is already used by another account.`
      };
    }

    const exists = users.some((u) => u.id === updatedUser.id);
    if (!exists) {
      return {
        success: false,
        message: `User with ID "${updatedUser.id}" was not found.`
      };
    }

    const updated = users.map((u) => (u.id === updatedUser.id ? { ...updatedUser, updatedAt: new Date().toISOString() } : u));
    set({ users: updated });
    persistUsers(updated);
    return {
      success: true,
      message: `Details updated for "${updatedUser.displayName}".`,
      user: updatedUser
    };
  },

  toggleUserStatus: (id: string) => {
    const { users } = get();
    const target = users.find((u) => u.id === id);
    if (!target) {
      return { success: false, message: 'User not found.' };
    }

    const nextStatus: UserAccountStatus = target.status === 'active' ? 'suspended' : 'active';
    const updated = users.map((u) => (u.id === id ? { ...u, status: nextStatus, updatedAt: new Date().toISOString() } : u));
    set({ users: updated });
    persistUsers(updated);
    return {
      success: true,
      message: `Account for "${target.displayName}" marked as ${nextStatus}.`,
      newStatus: nextStatus
    };
  },

  deleteUser: (id: string) => {
    const { users } = get();
    const target = users.find((u) => u.id === id);
    if (!target) {
      return { success: false, message: 'User not found.' };
    }
    const updated = users.filter((u) => u.id !== id);
    set({ users: updated });
    persistUsers(updated);
    return {
      success: true,
      message: `User "${target.displayName}" removed successfully.`
    };
  },

  resetToDefaults: () => {
    set({ users: mockUsers });
    persistUsers(mockUsers);
  }
}));
