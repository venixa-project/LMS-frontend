// ============================================================
// LMS - Auth Store (Zustand with Verified Session Persistence)
// ============================================================
import { create } from 'zustand';
import { User, RoleName, Notification } from '../types';
import { getPermissionsForRole, getNavigationForRole, can, type NavItem } from './permissions';
import type { Permission, PermissionAction, PermissionResource } from '../types';
import { mockUsers } from '../data/mockUsers';

export const AUTH_SESSION_KEY = 'venilearn_auth_session';
export const LOGGED_OUT_KEY = 'venilearn_logged_out';

interface StoredSession {
  userId: string;
  email: string;
  activeRole: RoleName;
  token?: string;
  expiresAt?: number;
}

/**
 * Safely restores and authorizes the session from localStorage against
 * trusted user directory (mockUsers). Never blindly trusts localStorage role strings.
 */
function restoreSessionFromStorage(): {
  user: User;
  permissions: Permission[];
  navigation: NavItem[];
} | null {
  try {
    const isExplicitlyLoggedOut = sessionStorage.getItem(LOGGED_OUT_KEY) === 'true';
    if (isExplicitlyLoggedOut) {
      return null;
    }

    const raw = localStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) {
      return null;
    }

    const session: StoredSession = JSON.parse(raw);
    if (!session || !session.userId) {
      localStorage.removeItem(AUTH_SESSION_KEY);
      return null;
    }

    // Verify session validity and expiration (7 days TTL)
    if (session.expiresAt && Date.now() > session.expiresAt) {
      localStorage.removeItem(AUTH_SESSION_KEY);
      return null;
    }

    // Lookup user in the trusted authority directory
    const trustedUser = mockUsers.find(
      (u) => u.id === session.userId || u.email.toLowerCase() === session.email?.toLowerCase()
    );

    if (!trustedUser) {
      localStorage.removeItem(AUTH_SESSION_KEY);
      return null;
    }

    // Validate account status
    if (trustedUser.status === 'suspended' || trustedUser.status === 'deactivated') {
      localStorage.removeItem(AUTH_SESSION_KEY);
      return null;
    }

    // Canonical role normalization
    let targetRole: RoleName = session.activeRole || trustedUser.activeRole;
    if (targetRole === 'instructor' || targetRole === 'assessment_author' || targetRole === 'grader') {
      targetRole = 'trainer';
    } else if (targetRole === 'learner' || targetRole === 'guest') {
      targetRole = 'student';
    } else if (targetRole === 'lms_admin' || (targetRole as string) === 'industrial_admin') {
      targetRole = 'org_admin';
    }

    // Ensure authorized canonical user persona matching the active role
    const canonicalUser = mockUsers.find((u) => u.activeRole === targetRole);
    const verifiedUser: User = canonicalUser
      ? { ...canonicalUser, activeRole: targetRole }
      : { ...trustedUser, activeRole: targetRole };

    const permissions = getPermissionsForRole(targetRole);
    const navigation = getNavigationForRole(targetRole);

    return {
      user: verifiedUser,
      permissions,
      navigation,
    };
  } catch (err) {
    console.error('Failed to restore auth session from storage:', err);
    try {
      localStorage.removeItem(AUTH_SESSION_KEY);
    } catch {}
    return null;
  }
}

/**
 * Persists verified session to localStorage
 */
function persistSession(user: User, role: RoleName) {
  try {
    const payload: StoredSession = {
      userId: user.id,
      email: user.email,
      activeRole: role,
      token: `venilearn-token-${user.id}-${Date.now()}`,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days expiration
    };
    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(payload));
    sessionStorage.removeItem(LOGGED_OUT_KEY);
  } catch (err) {
    console.warn('Failed to persist session to localStorage:', err);
  }
}

/**
 * Clears persisted session upon logout
 */
function clearPersistedSession() {
  try {
    localStorage.removeItem(AUTH_SESSION_KEY);
    sessionStorage.setItem(LOGGED_OUT_KEY, 'true');
  } catch (err) {
    console.warn('Failed to clear session from storage:', err);
  }
}

const STORAGE_KEY_NOTIFICATIONS = 'venilearn_notifications';

function loadStoredNotifications(): Notification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_NOTIFICATIONS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to load notifications from storage:', e);
  }
  return [];
}

function persistStoredNotifications(notifs: Notification[]) {
  try {
    localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(notifs));
  } catch (e) {
    console.warn('Failed to persist notifications to storage:', e);
  }
}

function getUserNotifications(user: User): Notification[] {
  const stored = loadStoredNotifications();
  // Filter notifications belonging to this user
  const userStored = stored.filter(
    (n) => n.userId === user.id || n.userId === user.email || (user.rollNo && n.userId === user.rollNo)
  );

  const defaults: Notification[] = [
    {
      id: `sys-1-${user.id}`,
      userId: user.id,
      title: 'Session Verified',
      message: `Welcome to VeniLearn LMS, ${user.displayName}!`,
      category: 'system',
      isRead: false,
      timestamp: new Date().toISOString(),
    },
    ...(user.activeRole === 'student' || user.activeRole === 'learner'
      ? [
          {
            id: `sys-2-${user.id}`,
            userId: user.id,
            title: 'Assessment Due Soon',
            message: 'React Fundamentals Quiz is due in 2 days.',
            category: 'assessment',
            link: '/my-assessments',
            isRead: false,
            timestamp: new Date(Date.now() - 3600000).toISOString(),
          },
          {
            id: `sys-3-${user.id}`,
            userId: user.id,
            title: 'Live Class Tomorrow',
            message: 'Advanced TypeScript Patterns session scheduled for tomorrow at 10:00 AM.',
            category: 'live_class',
            link: '/my-sessions',
            isRead: false,
            timestamp: new Date(Date.now() - 7200000).toISOString(),
          },
        ]
      : []),
  ];

  const combined = [...userStored, ...defaults.filter((d) => !userStored.some((u) => u.id === d.id))];
  return combined.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

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
  sendCourseInvitations: (invitation: {
    courseId: string;
    courseTitle: string;
    courseShortDesc?: string;
    inviterName: string;
    inviterRole: string;
    recipientIds: string[];
    customMessage?: string;
  }) => { success: boolean; count: number; recipients: string[] };
  notifyLiveSession: (payload: {
    sessionId: string;
    sessionTitle: string;
    instructorName: string;
    recipientIds: string[];
    type: 'scheduled' | 'updated' | 'starting_soon' | 'live' | 'cancelled';
    date?: string;
    startTime?: string;
    message?: string;
  }) => { success: boolean; count: number };
}

// Synchronously hydrate initial session before components mount
const initialSession = restoreSessionFromStorage();
const initialUserNotifications = initialSession ? getUserNotifications(initialSession.user) : [];

export const useAuthStore = create<AuthState>((set, get) => ({
  user: initialSession?.user ?? null,
  permissions: initialSession?.permissions ?? [],
  navigation: initialSession?.navigation ?? [],
  isAuthenticated: !!initialSession,
  isLoading: false,
  error: null,
  notifications: initialUserNotifications,
  unreadNotifications: initialUserNotifications.filter((n) => !n.isRead).length,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });

    // Simulate network authentication
    await new Promise((resolve) => setTimeout(resolve, 350));

    // Support legacy and alias emails
    let normalizedEmail = email.toLowerCase().trim();
    if (normalizedEmail === 'instructor@lms.demo' || normalizedEmail === 'author@lms.demo' || normalizedEmail === 'grader@lms.demo') {
      normalizedEmail = 'trainer@lms.demo';
    } else if (normalizedEmail === 'learner@lms.demo' || normalizedEmail === 'alex@lms.demo' || normalizedEmail === 'alex.rivera@lms.demo') {
      normalizedEmail = 'student@lms.demo';
    } else if (normalizedEmail === 'marcus@lms.demo' || normalizedEmail === 'lmsadmin@lms.demo') {
      normalizedEmail = 'orgadmin@lms.demo';
    }

    const foundUser = mockUsers.find(
      (u) => u.email.toLowerCase() === normalizedEmail
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

    // Save session to localStorage
    persistSession(foundUser, foundUser.activeRole);

    const notifications = getUserNotifications(foundUser);

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
    clearPersistedSession();
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

    // Normalize to the 4 canonical roles
    let targetRole: RoleName = role;
    if (role === 'instructor' || role === 'assessment_author' || role === 'grader') {
      targetRole = 'trainer';
    } else if (role === 'learner' || role === 'guest') {
      targetRole = 'student';
    } else if (role === 'lms_admin' || (role as string) === 'industrial_admin') {
      targetRole = 'org_admin';
    }

    // Load canonical persona from mockUsers if available for the role
    const canonicalUser = mockUsers.find((u) => u.activeRole === targetRole);
    const updatedUser = canonicalUser
      ? { ...canonicalUser, activeRole: targetRole }
      : { ...user, activeRole: targetRole };

    // Persist verified switched role session
    persistSession(updatedUser, targetRole);

    const permissions = getPermissionsForRole(targetRole);
    const navigation = getNavigationForRole(targetRole);
    const notifications = getUserNotifications(updatedUser);

    set({
      user: updatedUser,
      permissions,
      navigation,
      notifications,
      unreadNotifications: notifications.filter((n) => !n.isRead).length,
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

    const stored = loadStoredNotifications();
    const updatedStored = stored.map((n) => (n.id === id ? { ...n, isRead: true } : n));
    persistStoredNotifications(updatedStored);
  },

  markAllNotificationsRead: () => {
    const { notifications } = get();
    const updated = notifications.map((n) => ({ ...n, isRead: true }));
    set({ notifications: updated, unreadNotifications: 0 });

    const stored = loadStoredNotifications();
    const userIds = new Set(notifications.map((n) => n.id));
    const updatedStored = stored.map((n) => (userIds.has(n.id) ? { ...n, isRead: true } : n));
    persistStoredNotifications(updatedStored);
  },

  sendCourseInvitations: (invitation) => {
    const stored = loadStoredNotifications();
    const timestamp = new Date().toISOString();

    const newNotifs: Notification[] = invitation.recipientIds.map((studentId) => ({
      id: `notif-inv-${Date.now()}-${studentId}`,
      userId: studentId,
      title: `Course Invitation: ${invitation.courseTitle}`,
      message: `${invitation.inviterName} (${invitation.inviterRole}) invited you to join "${invitation.courseTitle}". ${
        invitation.customMessage ? `"${invitation.customMessage}"` : invitation.courseShortDesc || 'Click to view details and enroll.'
      }`,
      category: 'course',
      link: `/course/${invitation.courseId}`,
      isRead: false,
      timestamp,
    }));

    const updatedStored = [...newNotifs, ...stored];
    persistStoredNotifications(updatedStored);

    const currentUser = get().user;
    if (currentUser) {
      const refreshed = getUserNotifications(currentUser);
      set({
        notifications: refreshed,
        unreadNotifications: refreshed.filter((n) => !n.isRead).length,
      });
    }

    return {
      success: true,
      count: newNotifs.length,
      recipients: invitation.recipientIds,
    };
  },

  notifyLiveSession: ({ sessionId, sessionTitle, instructorName, recipientIds, type, date, startTime, message }) => {
    const stored = loadStoredNotifications();
    const timestamp = new Date().toISOString();

    let title = `Live Session: ${sessionTitle}`;
    let body = message || `Live class session with ${instructorName}.`;

    if (type === 'scheduled') {
      title = `New Live Session: ${sessionTitle}`;
      body = `Live session scheduled for ${date || 'upcoming date'} at ${startTime || 'scheduled time'} with ${instructorName}. Click to view details.`;
    } else if (type === 'updated') {
      title = `Session Updated: ${sessionTitle}`;
      body = message || `Timetable or meeting room details for "${sessionTitle}" have been updated by ${instructorName}.`;
    } else if (type === 'starting_soon') {
      title = `Starting Soon: ${sessionTitle}`;
      body = `Live session starts in 10 minutes with ${instructorName}. Join room early to test your audio & video.`;
    } else if (type === 'live') {
      title = `🔴 LIVE NOW: ${sessionTitle}`;
      body = `Session is live and broadcasting now! Click to join room with ${instructorName}.`;
    } else if (type === 'cancelled') {
      title = `Session Cancelled: ${sessionTitle}`;
      body = message || `The scheduled session "${sessionTitle}" was cancelled by ${instructorName}.`;
    }

    // Deduplicate: avoid creating the exact same notification event within the same minute
    const recentNotifKey = (userId: string) => `${userId}-${sessionId}-${type}`;
    const recentKeys = new Set(
      stored
        .filter((n) => Date.now() - new Date(n.timestamp).getTime() < 120000)
        .map((n) => `${n.userId}-${sessionId}-${type}`)
    );

    const eligibleRecipients = recipientIds.filter((id) => !recentKeys.has(recentNotifKey(id)));

    const newNotifs: Notification[] = eligibleRecipients.map((studentId) => ({
      id: `notif-live-${Date.now()}-${studentId}-${type}`,
      userId: studentId,
      title,
      message: body,
      category: 'live_class',
      link: `/live-sessions?sessionId=${sessionId}`,
      isRead: false,
      timestamp,
    }));

    if (newNotifs.length > 0) {
      const updatedStored = [...newNotifs, ...stored];
      persistStoredNotifications(updatedStored);

      const currentUser = get().user;
      if (currentUser) {
        const refreshed = getUserNotifications(currentUser);
        set({
          notifications: refreshed,
          unreadNotifications: refreshed.filter((n) => !n.isRead).length,
        });
      }
    }

    return {
      success: true,
      count: newNotifs.length,
    };
  },
}));
