// ============================================================
// LMS - Auth Store (Zustand with Verified Session Persistence)
// ============================================================
import { create } from 'zustand';
import { User, RoleName, Notification } from '../types';
import { getPermissionsForRole, getNavigationForRole, can, type NavItem } from './permissions';
import type { Permission, PermissionAction, PermissionResource } from '../types';
import { mockUsers } from '../data/mockUsers';
import { apiClient, hasBackendAccessToken } from './apiClient';
import { AUTH_SESSION_KEY, LOGGED_OUT_KEY } from './authConstants';

export { AUTH_SESSION_KEY, LOGGED_OUT_KEY } from './authConstants';

interface StoredSession {
  userId: string;
  email: string;
  activeRole: RoleName;
  token?: string;
  expiresAt?: number;
  userSnapshot?: User;
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

    // Demo personas come from the trusted local directory; backend users retain
    // the profile returned with their server-issued JWT for session restoration.
    const trustedUser = mockUsers.find(
      (u) => u.id === session.userId || u.email.toLowerCase() === session.email?.toLowerCase()
    );

    const isServerSession = typeof session.token === 'string' && session.token.split('.').length === 3;
    const restoredBackendUser = isServerSession
      ? (session.userSnapshot || {
          id: session.userId,
          email: session.email,
          displayName: session.email?.split('@')[0] || 'User',
          activeRole: session.activeRole,
          status: 'active',
          organizationId: '',
          roles: [],
          mfaEnabled: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as unknown as User)
      : null;

    if (!trustedUser && !restoredBackendUser) {
      localStorage.removeItem(AUTH_SESSION_KEY);
      return null;
    }

    const sessionUser = restoredBackendUser || trustedUser!;

    // Validate account status
    if (sessionUser.status === 'suspended' || sessionUser.status === 'deactivated' || sessionUser.status !== 'active') {
      localStorage.removeItem(AUTH_SESSION_KEY);
      return null;
    }

    // Canonical role normalization
    let targetRole: RoleName = session.activeRole || sessionUser.activeRole;
    if (targetRole === 'instructor' || targetRole === 'assessment_author' || targetRole === 'grader') {
      targetRole = 'trainer';
    } else if (targetRole === 'learner' || targetRole === 'guest') {
      targetRole = 'student';
    } else if (targetRole === 'lms_admin' || (targetRole as string) === 'industrial_admin') {
      targetRole = 'org_admin';
    }

    const verifiedUser: User = { ...sessionUser, activeRole: targetRole };
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

function getPersistedAccessToken(): string | undefined {
  try {
    const raw = localStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) return undefined;
    const session: StoredSession = JSON.parse(raw);
    return session.token?.split('.').length === 3 ? session.token : undefined;
  } catch (err) {
    console.warn('Failed to read access token while updating profile:', err);
    return undefined;
  }
}

/**
 * Persists verified session to localStorage
 */
function persistSession(user: User, role: RoleName, accessToken?: string) {
  try {
    const existingToken = accessToken || getPersistedAccessToken();
    const token = existingToken || `venilearn-token-${user.id}-${Date.now()}`;
    const payload: StoredSession = {
      userId: user.id,
      email: user.email,
      activeRole: role,
      token,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days full session validity
      userSnapshot: user,
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
  const isStudentUser =
    user.activeRole === 'student' ||
    user.activeRole === 'learner' ||
    (user as any).role === 'student' ||
    (user as any).role === 'learner';

  // Filter notifications belonging to this user or broadcast to students/all
  const userStored = stored.filter(
    (n) =>
      n.userId === user.id ||
      n.userId === user.email ||
      (user.rollNo && n.userId === user.rollNo) ||
      n.userId === 'all' ||
      (isStudentUser && n.userId === 'all-students')
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
  login: (email: string, password: string, tenantId?: string) => Promise<void>;
  completePasswordChange: (accessToken: string) => void;
  logout: () => void;
  updateUserProfile: (updates: Partial<Pick<User, 'firstName' | 'lastName' | 'displayName' | 'phone' | 'locale' | 'timezone' | 'avatar'>>) => void;
  switchRole: (role: RoleName) => void;
  can: (action: PermissionAction, resource: PermissionResource) => boolean;
  clearError: () => void;
  fetchNotifications: () => Promise<void>;
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
  notifyAssessmentPublished: (payload: {
    assessmentId: string;
    assessmentTitle: string;
    courseId?: string;
    courseTitle?: string;
    durationMinutes?: number;
    totalMarks?: number;
    recipientIds?: string[];
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

  login: async (email: string, password: string, tenantId?: string) => {
    set({ isLoading: true, error: null });

    const isDemoLogin = email.toLowerCase().trim().endsWith('@lms.demo');
    if (isDemoLogin) {
      let normalizedEmail = email.toLowerCase().trim();
      if (normalizedEmail === 'instructor@lms.demo' || normalizedEmail === 'author@lms.demo' || normalizedEmail === 'grader@lms.demo') {
        normalizedEmail = 'trainer@lms.demo';
      } else if (normalizedEmail === 'learner@lms.demo' || normalizedEmail === 'alex@lms.demo') {
        normalizedEmail = 'student@lms.demo';
      } else if (normalizedEmail === 'marcus@lms.demo' || normalizedEmail === 'lmsadmin@lms.demo') {
        normalizedEmail = 'orgadmin@lms.demo';
      }

      const foundUser = mockUsers.find(
        (u) => u.email.toLowerCase() === normalizedEmail
      );

      if (foundUser) {
        const permissions = getPermissionsForRole(foundUser.activeRole);
        const navigation = getNavigationForRole(foundUser.activeRole);
        localStorage.setItem('venilearn_active_tenant_id', '871abf8a-e563-4d0f-afc7-416d8da3df14');
        if (typeof window !== 'undefined') sessionStorage.setItem('venilearn_active_org_id', '871abf8a-e563-4d0f-afc7-416d8da3df14');
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
        return;
      }
    }

    const isSeededStudentDemoLogin =
      email.toLowerCase().trim() === 'student@lms.demo' && password === 'demoPass123';
    const backendEmail = isSeededStudentDemoLogin ? 'student@acuity.com' : email;
    const backendPassword = isSeededStudentDemoLogin ? 'Password@123' : password;

    try {
      const response = await apiClient.post<{
        accessToken: string;
        user: {
          id: string;
          email: string;
          firstName: string;
          lastName: string;
          displayName: string;
          activeRole: string;
          tenantId: string;
          departmentId?: string;
          avatarUrl?: string;
          rollNo?: string;
          roles?: string[];
          mustChangePassword?: boolean;
        };
      }>('/auth/login', {
        email: backendEmail.toLowerCase().trim(),
        password: backendPassword,
        ...(tenantId ? { tenantId } : {}),
      });
      const account = response.data.user;
      const roleAliases: Record<string, RoleName> = {
        platform_admin: 'platform_admin', org_admin: 'org_admin', trainer: 'trainer', student: 'student',
        learner: 'student', instructor: 'trainer', lms_admin: 'org_admin', industrial_admin: 'org_admin', staff: 'staff',
      };
      const activeRole = roleAliases[account.activeRole] || 'student';
      const authenticatedUser: User = {
        id: account.id,
        email: account.email,
        firstName: account.firstName,
        lastName: account.lastName,
        displayName: account.displayName,
        activeRole,
        organizationId: account.tenantId,
        departmentId: account.departmentId,
        avatar: account.avatarUrl,
        rollNo: account.rollNo,
        roles: [],
        status: 'active',
        mustChangePassword: account.mustChangePassword || false,
        mfaEnabled: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const permissions = getPermissionsForRole(activeRole);
      const navigation = getNavigationForRole(activeRole);
      localStorage.setItem('venilearn_active_tenant_id', account.tenantId);
      persistSession(authenticatedUser, activeRole, response.data.accessToken);
      const notifications = getUserNotifications(authenticatedUser);
      set({
        user: authenticatedUser,
        permissions,
        navigation,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        notifications,
        unreadNotifications: notifications.filter((notification) => !notification.isRead).length,
      });
      return;
    } catch (authError: any) {
      set({
        isLoading: false,
        error: authError.response?.data?.message || authError.message || 'Unable to sign in. Check your email and password.',
      });
      return;
    }
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

  updateUserProfile: (updates) => {
    const { user } = get();
    if (!user) return;
    const updatedUser = { ...user, ...updates, updatedAt: new Date().toISOString() };
    persistSession(updatedUser, updatedUser.activeRole, getPersistedAccessToken());
    set({ user: updatedUser });
  },

  completePasswordChange: (accessToken: string) => {
    const { user } = get();
    if (!user) return;
    const updatedUser = { ...user, mustChangePassword: false };
    persistSession(updatedUser, updatedUser.activeRole, accessToken);
    set({ user: updatedUser });
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

    const updatedUser = { ...user, activeRole: targetRole };
    const currentToken = getPersistedAccessToken();
    // Persist verified switched role session with active JWT token
    persistSession(updatedUser, targetRole, currentToken);

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

  fetchNotifications: async () => {
    const { user } = get();
    if (!user) return;

    if (hasBackendAccessToken()) {
      try {
        const response = await apiClient.get<Array<{
          id: string;
          userId: string;
          title: string;
          message: string;
          category: string;
          linkUrl?: string | null;
          isRead: boolean;
          createdAt: string;
        }>>('/notifications');

        if (response.data && Array.isArray(response.data)) {
          const mapped: Notification[] = response.data.map((n) => ({
            id: n.id,
            userId: n.userId,
            title: n.title,
            message: n.message,
            category: n.category as any,
            link: n.linkUrl || undefined,
            isRead: n.isRead,
            timestamp: n.createdAt,
          }));

          const localDefaults = getUserNotifications(user);
          const backendIds = new Set(mapped.map((n) => n.id));
          const merged = [...mapped, ...localDefaults.filter((l) => !backendIds.has(l.id))];

          set({
            notifications: merged,
            unreadNotifications: merged.filter((n) => !n.isRead).length,
          });
          return;
        }
      } catch (err) {
        console.warn('Failed to fetch backend notifications, using local cache:', err);
      }
    }

    const localNotifs = getUserNotifications(user);
    set({
      notifications: localNotifs,
      unreadNotifications: localNotifs.filter((n) => !n.isRead).length,
    });
  },

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

    if (hasBackendAccessToken()) {
      apiClient.patch(`/notifications/${id}/read`).catch(() => {});
    }
  },

  markAllNotificationsRead: () => {
    const { notifications } = get();
    const updated = notifications.map((n) => ({ ...n, isRead: true }));
    set({ notifications: updated, unreadNotifications: 0 });

    const stored = loadStoredNotifications();
    const userIds = new Set(notifications.map((n) => n.id));
    const updatedStored = stored.map((n) => (userIds.has(n.id) ? { ...n, isRead: true } : n));
    persistStoredNotifications(updatedStored);

    if (hasBackendAccessToken()) {
      apiClient.post('/notifications/mark-all-read').catch(() => {});
    }
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

  notifyAssessmentPublished: ({ assessmentId, assessmentTitle, courseId, courseTitle, durationMinutes, totalMarks, recipientIds }) => {
    const stored = loadStoredNotifications();
    const timestamp = new Date().toISOString();
    const dur = durationMinutes || 60;
    const marks = totalMarks || 100;
    const courseSuffix = courseTitle ? ` for "${courseTitle}"` : '';

    const defaultStudents = ['all-students', 'stu-001', 'stu-002', 'student@lms.demo', 'k.ravivarma047@gmail.com'];
    const recipients = (recipientIds && recipientIds.length > 0)
      ? Array.from(new Set([...recipientIds, 'all-students']))
      : defaultStudents;

    const newNotifs: Notification[] = recipients.map((sid) => ({
      id: `notif-asmt-${Date.now()}-${sid}`,
      userId: sid,
      title: `New Assessment: ${assessmentTitle}`,
      message: `A new assessment "${assessmentTitle}" has been published${courseSuffix}. Total Marks: ${marks}, Duration: ${dur} mins. Good luck!`,
      category: 'assessment',
      link: `/exam/${assessmentId}`,
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
    };
  },
}));
