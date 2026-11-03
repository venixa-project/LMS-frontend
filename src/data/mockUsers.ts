// ============================================================
// LMS - Demo Users & Role Personas (for Instant 1-Click Role Login)
// ============================================================
import { User, RoleName } from '../types';

export const mockUsers: User[] = [
  // --- 1. PLATFORM ADMINISTRATOR ---
  {
    id: 'u-001',
    email: 'admin@lms.demo',
    firstName: 'Sarah',
    lastName: 'Chen',
    displayName: 'Sarah Chen',
    avatar: '',
    phone: '+1 555-0101',
    locale: 'en-US',
    timezone: 'America/New_York',
    roles: [],
    activeRole: 'platform_admin' as RoleName,
    organizationId: 'org-001',
    status: 'active',
    lastLogin: new Date().toISOString(),
    mfaEnabled: true,
    createdAt: '2026-01-15T10:00:00Z',
    updatedAt: new Date().toISOString(),
  },
  // --- 2. ORG / INSTITUTION ADMINISTRATOR ---
  {
    id: 'u-002',
    email: 'orgadmin@lms.demo',
    firstName: 'Marcus',
    lastName: 'Johnson',
    displayName: 'Marcus Johnson',
    avatar: '',
    phone: '+1 555-0102',
    locale: 'en-US',
    timezone: 'America/Chicago',
    roles: [],
    activeRole: 'org_admin' as RoleName,
    organizationId: 'org-001',
    status: 'active',
    lastLogin: new Date().toISOString(),
    mfaEnabled: true,
    createdAt: '2026-02-01T10:00:00Z',
    updatedAt: new Date().toISOString(),
  },
  // --- 3. TRAINER / FACULTY LEAD ---
  {
    id: 'u-004',
    email: 'trainer@lms.demo',
    firstName: 'James',
    lastName: 'Wilson',
    displayName: 'Dr. James Wilson',
    avatar: '',
    locale: 'en-GB',
    timezone: 'Europe/London',
    roles: [],
    activeRole: 'trainer' as RoleName,
    organizationId: 'org-001',
    departmentId: 'dep-001',
    rollNo: 'FAC-2026-004',
    specialization: 'Full-Stack JavaScript & Systems Architecture',
    status: 'active',
    lastLogin: new Date().toISOString(),
    mfaEnabled: false,
    createdAt: '2026-04-01T10:00:00Z',
    updatedAt: new Date().toISOString(),
  },
  // --- 4. STUDENT / LEARNER ---
  {
    id: 'u-007',
    email: 'student@lms.demo',
    firstName: 'Alex',
    lastName: 'Thompson',
    displayName: 'Alex Thompson',
    avatar: '',
    locale: 'en-US',
    timezone: 'America/New_York',
    roles: [],
    activeRole: 'student' as RoleName,
    organizationId: 'org-001',
    departmentId: 'dep-001',
    rollNo: 'STU-2026-007',
    status: 'active',
    lastLogin: new Date().toISOString(),
    mfaEnabled: false,
    createdAt: '2026-07-01T10:00:00Z',
    updatedAt: new Date().toISOString(),
  },
];

// Quick Demo Login Accounts for the 4 Core Roles
export const demoAccounts = [
  {
    email: 'admin@lms.demo',
    role: 'Platform Admin',
    name: 'Sarah Chen',
    desc: 'System settings, multi-tenancy, user directory & global RBAC',
    badge: 'Super Admin',
    color: '#ef4444'
  },
  {
    email: 'orgadmin@lms.demo',
    role: 'Institution Admin',
    name: 'Marcus Johnson',
    desc: 'Institution dashboard, courses, students, faculty, batches & timetables',
    badge: 'Campus Admin',
    color: '#3b82f6'
  },
  {
    email: 'trainer@lms.demo',
    role: 'Trainer',
    name: 'Dr. James Wilson',
    desc: 'Course authoring, live webinars, attendance, quizzes & AI grading',
    badge: 'Faculty Lead',
    color: '#06b6d4'
  },
  {
    email: 'student@lms.demo',
    role: 'Student',
    name: 'Alex Thompson',
    desc: 'Course video player, live classes, assignment submit & proctored exams',
    badge: 'Enrolled Scholar',
    color: '#8b5cf6'
  },
];
