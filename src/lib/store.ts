// ============================================================
// LMS - Auth Store (Zustand)
// ============================================================
import { create } from 'zustand';
import { User, RoleName, Notification } from '../types';
import { getPermissionsForRole, getNavigationForRole, can, type NavItem } from './permissions';
import type { Permission, PermissionAction, PermissionResource } from '../types';
import { mockUsers } from '../data/mockUsers';

interface AuthState {
  user: User | null;
  permissions: Permission[];
  navigation: NavItem[];
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  notifications: Notification[];
  unreadNotifications: number;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  switchRole: (role: RoleName) => void;
  can: (action: PermissionAction, resource: PermissionResource) => boolean;
  clearError: () => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  permissions: [],
  navigation: [],
  isAuthenticated: false,
  isLoading: false,
  error: null,
  notifications: [],
  unreadNotifications: 0,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1200));

    const foundUser = mockUsers.find(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );

    if (!foundUser || password.length < 3) {
      set({
        isLoading: false,
        error: 'Invalid email or password. Please check your credentials and try again.',
      });
      return;
    }

    if (foundUser.status === 'suspended') {
      set({
        isLoading: false,
        error: 'Your account has been suspended. Please contact your administrator.',
      });
      return;
    }

    if (foundUser.status === 'deactivated') {
      set({
        isLoading: false,
        error: 'Your account has been deactivated. Please contact support.',
      });
      return;
    }

    const permissions = getPermissionsForRole(foundUser.activeRole);
    const navigation = getNavigationForRole(foundUser.activeRole);

    // Generate mock notifications
    const notifications: Notification[] = [
      { id: 'n1', userId: foundUser.id, title: 'Welcome back!', message: 'You have new course updates available.', category: 'system', isRead: false, timestamp: new Date().toISOString() },
      { id: 'n2', userId: foundUser.id, title: 'Assessment Due', message: 'React Fundamentals Quiz is due in 2 days.', category: 'assessment', link: '/my-assessments', isRead: false, timestamp: new Date(Date.now() - 3600000).toISOString() },
      { id: 'n3', userId: foundUser.id, title: 'Live Class Tomorrow', message: 'Advanced TypeScript Patterns session scheduled for tomorrow at 10:00 AM.', category: 'live_class', link: '/my-sessions', isRead: false, timestamp: new Date(Date.now() - 7200000).toISOString() },
      { id: 'n4', userId: foundUser.id, title: 'Certificate Earned', message: 'You earned a certificate for completing JavaScript Basics.', category: 'certificate', link: '/my-certificates', isRead: true, timestamp: new Date(Date.now() - 86400000).toISOString() },
      { id: 'n5', userId: foundUser.id, title: 'New Course Available', message: 'Python Data Science has been added to your learning path.', category: 'course', link: '/my-learning', isRead: true, timestamp: new Date(Date.now() - 172800000).toISOString() },
    ];

    set({
      user: foundUser,
      permissions,
      navigation,
      isAuthenticated: true,
      isLoading: false,
      error: null,
      notifications,
      unreadNotifications: notifications.filter((n) => !n.isRead).length,
    });
  },

  logout: () => {
    set({
      user: null,
      permissions: [],
      navigation: [],
      isAuthenticated: false,
      isLoading: false,
      error: null,
      notifications: [],
      unreadNotifications: 0,
    });
  },

  switchRole: (role: RoleName) => {
    const { user } = get();
    if (!user) return;

    const permissions = getPermissionsForRole(role);
    const navigation = getNavigationForRole(role);

    set({
      user: { ...user, activeRole: role },
      permissions,
      navigation,
    });
  },

  can: (action: PermissionAction, resource: PermissionResource) => {
    const { permissions } = get();
    return can(permissions, action, resource);
  },

  clearError: () => set({ error: null }),

  markNotificationRead: (id: string) => {
    const { notifications } = get();
    const updated = notifications.map((n) =>
      n.id === id ? { ...n, isRead: true } : n
    );
    set({
      notifications: updated,
      unreadNotifications: updated.filter((n) => !n.isRead).length,
    });
  },

  markAllNotificationsRead: () => {
    const { notifications } = get();
    const updated = notifications.map((n) => ({ ...n, isRead: true }));
    set({ notifications: updated, unreadNotifications: 0 });
  },
}));
