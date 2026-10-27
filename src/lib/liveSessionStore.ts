// ============================================================
// LMS - Live Sessions Store (Zustand with LocalStorage)
// Manages real-time live classes, scheduling, status transitions,
// student eligibility, and automated in-app notifications.
// ============================================================
import { create } from 'zustand';
import { LiveSession } from '../types';
import { mockLiveSessions } from '../data/mockData';
import { useAuthStore } from './store';

interface LiveSessionState {
  sessions: LiveSession[];

  // Selectors
  getSessionById: (id: string) => LiveSession | undefined;
  getSessionsForCohort: (cohortId: string) => LiveSession[];
  getSessionsForStudent: (studentId: string, cohortIds: string[], courseIds: string[]) => LiveSession[];

  // Actions
  addSession: (
    session: Omit<LiveSession, 'id' | 'createdAt' | 'updatedAt' | 'attendance'>,
    notifyStudents?: boolean
  ) => { success: boolean; session: LiveSession };
  updateSession: (
    updated: LiveSession,
    notifyStudents?: boolean
  ) => { success: boolean; session: LiveSession };
  cancelSession: (
    sessionId: string,
    reason?: string,
    notifyStudents?: boolean
  ) => { success: boolean };
  startBroadcast: (sessionId: string) => { success: boolean };
  endSession: (sessionId: string, recordingUrl?: string) => { success: boolean };
  deleteSession: (sessionId: string) => { success: boolean };
  toggleBookmark: (sessionId: string) => void;
}

const STORAGE_KEY_SESSIONS = 'venilearn_live_sessions';

const INITIAL_SESSIONS: LiveSession[] = [
  {
    id: 'ls-live-01',
    title: 'Advanced React 19: Optimistic Mutations & Server Actions',
    courseId: 'crs-002',
    cohortId: 'coh-001',
    departmentId: 'dep-001',
    instructorId: 'u-004',
    instructorName: 'Dr. James Wilson',
    date: '2026-10-23',
    startTime: '13:00',
    endTime: '14:30',
    duration: 90,
    durationMinutes: 90,
    timezone: 'America/New_York',
    capacity: 35,
    enrolledCount: 28,
    provider: 'Google Meet',
    meetingUrl: 'https://meet.google.com/ven-r19-live',
    joinLink: 'https://meet.google.com/ven-r19-live',
    recordingPolicy: 'Cloud Recorded with automated AI transcript',
    recordingEnabled: true,
    description: 'Interactive live coding session on React 19 server actions, useOptimistic hook, and streaming suspense boundaries.',
    agenda: '1. Server Action Form Submissions\n2. Optimistic UI Rollbacks\n3. Q&A and Code Review',
    materials: ['React 19 Architecture Guide', 'GitHub Starter Repo'],
    targetAudienceType: 'all_cohort',
    targetStudentIds: ['st-1', 'st-2', 'st-3', 'st-4', 'st-5', 'u-007', 'u-009', 'u-010'],
    status: 'live',
    attendance: [
      { userId: 'u-007', userName: 'Alex Thompson', status: 'present', joinedAt: '2026-10-23T13:02:00Z' },
      { userId: 'u-009', userName: 'Maria Garcia', status: 'present', joinedAt: '2026-10-23T13:05:00Z' },
    ],
    createdAt: '2026-10-20T10:00:00Z',
    updatedAt: '2026-10-23T13:00:00Z',
  },
  {
    id: 'ls-001',
    title: 'Advanced TypeScript Patterns & Conditional Types Workshop',
    courseId: 'crs-004',
    cohortId: 'coh-002',
    departmentId: 'dep-001',
    instructorId: 'u-004',
    instructorName: 'Dr. James Wilson',
    date: '2026-10-24',
    startTime: '10:00',
    endTime: '11:30',
    duration: 90,
    durationMinutes: 90,
    timezone: 'America/New_York',
    capacity: 30,
    enrolledCount: 22,
    provider: 'Google Meet',
    joinLink: 'https://meet.google.com/abc-demo-xyz',
    meetingUrl: 'https://meet.google.com/abc-demo-xyz',
    recordingPolicy: 'Allowed with participant consent',
    recordingEnabled: true,
    description: 'Deep dive into recursive conditional types, infer keyword, and high-performance type-level computation.',
    agenda: 'Conditional Types, Inferred Tuples, Template Literal Generics',
    materials: ['TypeScript Handbook', 'Exercise Files'],
    targetAudienceType: 'all_cohort',
    targetStudentIds: ['st-6', 'u-006', 'u-008', 'st-7', 'u-007'],
    status: 'scheduled',
    attendance: [],
    createdAt: '2026-10-10T00:00:00Z',
    updatedAt: '2026-10-15T00:00:00Z',
  },
  {
    id: 'ls-002',
    title: 'Distributed Systems: Microservices Event Sourcing with Kafka',
    courseId: 'crs-001',
    cohortId: 'coh-001',
    departmentId: 'dep-001',
    instructorId: 'u-004',
    instructorName: 'Dr. James Wilson',
    date: '2026-10-25',
    startTime: '15:00',
    endTime: '16:30',
    duration: 90,
    durationMinutes: 90,
    timezone: 'America/New_York',
    capacity: 40,
    enrolledCount: 32,
    provider: 'Google Meet',
    joinLink: 'https://meet.google.com/kqw-psdo-jkl',
    meetingUrl: 'https://meet.google.com/kqw-psdo-jkl',
    recordingPolicy: 'Recorded for enrolled cohort archival',
    recordingEnabled: true,
    description: 'Practical walkthrough of message brokers, idempotency keys, and CQRS patterns for resilient cloud services.',
    agenda: 'Kafka Consumer Groups, Rebalancing, Dead Letter Queues',
    materials: ['Architecture Diagrams', 'Docker Compose Specs'],
    targetAudienceType: 'all_cohort',
    targetStudentIds: ['st-1', 'st-2', 'st-3', 'st-4', 'st-5', 'u-007', 'u-009', 'u-010'],
    status: 'scheduled',
    attendance: [],
    createdAt: '2026-10-12T00:00:00Z',
    updatedAt: '2026-10-18T00:00:00Z',
  },
  {
    id: 'ls-004-unlinked',
    title: 'Cloud Architecture & Microservices Clinic (Link Pending)',
    courseId: 'crs-001',
    cohortId: 'coh-001',
    departmentId: 'dep-001',
    instructorId: 'u-004',
    instructorName: 'Dr. James Wilson',
    date: '2026-10-27',
    startTime: '16:00',
    endTime: '17:00',
    duration: 60,
    durationMinutes: 60,
    timezone: 'America/New_York',
    capacity: 25,
    enrolledCount: 14,
    provider: 'Google Meet',
    joinLink: '',
    meetingUrl: '',
    recordingPolicy: 'Not recorded',
    recordingEnabled: false,
    description: 'Special discussion group on event-driven infrastructure. Meeting link will be configured prior to start time.',
    agenda: 'Student Project Walkthroughs and AWS Architecture Critiques',
    materials: ['Cloud Whitepapers'],
    targetAudienceType: 'all_cohort',
    targetStudentIds: ['st-1', 'st-2', 'u-007'],
    status: 'scheduled',
    attendance: [],
    createdAt: '2026-10-24T10:00:00Z',
    updatedAt: '2026-10-24T10:00:00Z',
  },
  {
    id: 'ls-003',
    title: 'Full-Stack JavaScript Q&A & Code Clinic',
    courseId: 'crs-001',
    courseTitle: 'Full-Stack JavaScript Essentials',
    cohortId: 'coh-001',
    cohortName: 'Spring 2026 Engineering',
    departmentId: 'dep-001',
    instructorId: 'u-004',
    instructorName: 'Dr. James Wilson',
    date: '2026-10-15',
    startTime: '09:00',
    endTime: '10:00',
    duration: 60,
    durationMinutes: 60,
    timezone: 'America/New_York',
    capacity: 35,
    enrolledCount: 28,
    provider: 'Google Meet',
    joinLink: 'https://meet.google.com/js-qa-clinic',
    meetingUrl: 'https://meet.google.com/js-qa-clinic',
    recordingLink: 'https://venilearn.demo/recordings/ls-003',
    recordingUrl: 'https://venilearn.demo/recordings/ls-003',
    recordingPolicy: 'Available for 30 days',
    recordingEnabled: true,
    recordingViews: 110,
    watchProgressPercentage: 100,
    isBookmarked: true,
    description: 'Weekly student open clinic reviewing async event loop questions, closure pitfalls, and DOM performance.',
    agenda: 'Student Questions, Live Refactoring, Exam Guidance',
    materials: ['Slide Deck PDF', 'Demo Repo Link'],
    targetAudienceType: 'all_cohort',
    targetStudentIds: ['st-1', 'st-2', 'st-3', 'st-4', 'st-5', 'u-007', 'u-009', 'u-010'],
    status: 'ended',
    attendance: [
      { userId: 'u-007', userName: 'Alex Thompson', status: 'present', joinedAt: '2026-10-15T09:02:00Z', leftAt: '2026-10-15T10:00:00Z' },
      { userId: 'u-009', userName: 'Maria Garcia', status: 'late', joinedAt: '2026-10-15T09:15:00Z', leftAt: '2026-10-15T10:00:00Z' },
      { userId: 'u-010', userName: 'David Kim', status: 'absent' },
    ],
    createdAt: '2026-10-08T00:00:00Z',
    updatedAt: '2026-10-15T10:05:00Z',
  },
  {
    id: 'rec-001',
    title: 'Advanced React 19: Concurrent Rendering & Transitions Deep-Dive',
    courseId: 'crs-002',
    courseTitle: 'Advanced React Patterns',
    cohortId: 'coh-001',
    cohortName: 'Spring 2026 Engineering',
    departmentId: 'dep-001',
    instructorId: 'u-004',
    instructorName: 'Dr. James Wilson',
    date: '2026-10-18',
    startTime: '14:00',
    endTime: '15:30',
    duration: 90,
    durationMinutes: 90,
    timezone: 'America/New_York',
    capacity: 40,
    enrolledCount: 34,
    provider: 'Google Meet',
    meetingUrl: 'https://meet.google.com/r19-conc-deep',
    joinLink: 'https://meet.google.com/r19-conc-deep',
    recordingLink: 'https://venilearn.demo/recordings/react19-concurrent',
    recordingUrl: 'https://venilearn.demo/recordings/react19-concurrent',
    recordingPolicy: 'Cloud HD Recording Available',
    recordingEnabled: true,
    recordingViews: 142,
    watchProgressPercentage: 100,
    isBookmarked: true,
    description: 'In-depth exploration of useTransition, Suspense boundaries, streaming SSR, and avoiding layout thrashing in high-frequency applications.',
    agenda: '1. React 19 Concurrent Primitives\n2. useDeferredValue vs useTransition\n3. Memory leak audits in useEffect',
    materials: ['React 19 Concurrent Slides (PDF)', 'CodeSandbox Demo Repository', 'Performance Benchmark Guide'],
    targetAudienceType: 'all_cohort',
    targetStudentIds: ['st-1', 'st-2', 'st-3', 'st-4', 'st-5', 'u-007', 'u-009', 'u-010'],
    status: 'ended',
    attendance: [
      { userId: 'u-007', userName: 'Alex Thompson', status: 'present', joinedAt: '2026-10-18T14:00:00Z' }
    ],
    createdAt: '2026-10-15T09:00:00Z',
    updatedAt: '2026-10-18T15:35:00Z',
  },
  {
    id: 'rec-002',
    title: 'Microservices Architecture: Event-Driven Kafka Consumers & CQRS',
    courseId: 'crs-001',
    courseTitle: 'Full-Stack JavaScript Essentials',
    cohortId: 'coh-001',
    cohortName: 'Spring 2026 Engineering',
    departmentId: 'dep-001',
    instructorId: 'u-004',
    instructorName: 'Dr. James Wilson',
    date: '2026-10-14',
    startTime: '10:00',
    endTime: '11:25',
    duration: 85,
    durationMinutes: 85,
    timezone: 'America/New_York',
    capacity: 35,
    enrolledCount: 30,
    provider: 'Google Meet',
    meetingUrl: 'https://meet.google.com/kafka-cqrs-demo',
    joinLink: 'https://meet.google.com/kafka-cqrs-demo',
    recordingLink: 'https://venilearn.demo/recordings/kafka-cqrs',
    recordingUrl: 'https://venilearn.demo/recordings/kafka-cqrs',
    recordingPolicy: 'Cloud Recorded with automated AI transcript',
    recordingEnabled: true,
    recordingViews: 98,
    watchProgressPercentage: 65,
    isBookmarked: false,
    description: 'Hands-on implementation of partition offsets, dead-letter queues, idempotent retry loops, and outbox event publishing patterns.',
    agenda: '1. Event Sourcing Basics\n2. Partition Rebalancing & Consumer Lag\n3. Distributed Tracing with OpenTelemetry',
    materials: ['Kafka Architecture Diagrams (PDF)', 'Docker Compose Cluster Setup', 'Node.js Kafka Client Boilerplate'],
    targetAudienceType: 'all_cohort',
    targetStudentIds: ['st-1', 'st-2', 'st-3', 'st-4', 'st-5', 'u-007'],
    status: 'ended',
    attendance: [
      { userId: 'u-007', userName: 'Alex Thompson', status: 'present', joinedAt: '2026-10-14T10:02:00Z' }
    ],
    createdAt: '2026-10-10T12:00:00Z',
    updatedAt: '2026-10-14T11:30:00Z',
  },
  {
    id: 'rec-003',
    title: 'PostgreSQL Query Optimization, Index Scans & Vacuum Tuning',
    courseId: 'crs-001',
    courseTitle: 'Full-Stack JavaScript Essentials',
    cohortId: 'coh-001',
    cohortName: 'Spring 2026 Engineering',
    departmentId: 'dep-001',
    instructorId: 'u-008',
    instructorName: 'Prof. Elena Rostova',
    date: '2026-10-11',
    startTime: '15:00',
    endTime: '16:15',
    duration: 75,
    durationMinutes: 75,
    timezone: 'America/New_York',
    capacity: 30,
    enrolledCount: 27,
    provider: 'Google Meet',
    meetingUrl: 'https://meet.google.com/postgres-opt-demo',
    joinLink: 'https://meet.google.com/postgres-opt-demo',
    recordingLink: 'https://venilearn.demo/recordings/postgres-opt',
    recordingUrl: 'https://venilearn.demo/recordings/postgres-opt',
    recordingPolicy: 'Available for Semester',
    recordingEnabled: true,
    recordingViews: 184,
    watchProgressPercentage: 100,
    isBookmarked: false,
    description: 'Detailed examination of EXPLAIN ANALYZE execution trees, B-Tree vs BRIN indexes, lock contention, and connection pool sizing.',
    agenda: '1. Index Selection & Composite Columns\n2. Table Bloat & Autovacuum Tuning\n3. PgBouncer Transaction Pooling',
    materials: ['Query Tuning Cheat Sheet', 'Sample 10M Row Database Dump', 'Benchmark Scripts'],
    targetAudienceType: 'all_cohort',
    targetStudentIds: ['st-1', 'st-2', 'st-3', 'st-4', 'st-5', 'u-007', 'u-009'],
    status: 'ended',
    attendance: [
      { userId: 'u-007', userName: 'Alex Thompson', status: 'present', joinedAt: '2026-10-11T15:01:00Z' }
    ],
    createdAt: '2026-10-06T08:00:00Z',
    updatedAt: '2026-10-11T16:20:00Z',
  },
  {
    id: 'rec-004',
    title: 'TypeScript 5.x: Recursive Types & Type-Level State Machines',
    courseId: 'crs-004',
    courseTitle: 'Modern Web Development with Next.js',
    cohortId: 'coh-002',
    cohortName: 'Summer 2026 Cloud',
    departmentId: 'dep-001',
    instructorId: 'u-004',
    instructorName: 'Dr. James Wilson',
    date: '2026-10-09',
    startTime: '11:00',
    endTime: '12:10',
    duration: 70,
    durationMinutes: 70,
    timezone: 'America/New_York',
    capacity: 35,
    enrolledCount: 25,
    provider: 'Google Meet',
    meetingUrl: 'https://meet.google.com/ts-rec-types',
    joinLink: 'https://meet.google.com/ts-rec-types',
    recordingLink: 'https://venilearn.demo/recordings/ts-recursive-types',
    recordingUrl: 'https://venilearn.demo/recordings/ts-recursive-types',
    recordingPolicy: 'Cloud Recorded with automated AI transcript',
    recordingEnabled: true,
    recordingViews: 76,
    watchProgressPercentage: 30,
    isBookmarked: true,
    description: 'Mastering distributive conditional types, template string literal parsers, and building compiler-checked finite state machines.',
    agenda: '1. Type-Level Recursion Caps\n2. Template Literals for Route Validations\n3. Infer Constraints in Tuples',
    materials: ['Type Challenges Solution Notebook', 'Compiler Performance Tips'],
    targetAudienceType: 'all_cohort',
    targetStudentIds: ['st-6', 'u-006', 'u-008', 'u-007'],
    status: 'ended',
    attendance: [
      { userId: 'u-007', userName: 'Alex Thompson', status: 'present', joinedAt: '2026-10-09T11:05:00Z' }
    ],
    createdAt: '2026-10-05T10:00:00Z',
    updatedAt: '2026-10-09T12:15:00Z',
  },
  {
    id: 'rec-005',
    title: 'Python Data Science: Advanced Pandas Aggregations & Vectorization',
    courseId: 'crs-003',
    courseTitle: 'Python for Data Science',
    cohortId: 'coh-003',
    cohortName: 'Fall 2026 Data Science',
    departmentId: 'dep-003',
    instructorId: 'u-005',
    instructorName: 'Emily Rodriguez',
    date: '2026-10-07',
    startTime: '13:00',
    endTime: '14:35',
    duration: 95,
    durationMinutes: 95,
    timezone: 'America/New_York',
    capacity: 40,
    enrolledCount: 32,
    provider: 'Google Meet',
    meetingUrl: 'https://meet.google.com/pandas-adv-demo',
    joinLink: 'https://meet.google.com/pandas-adv-demo',
    recordingLink: 'https://venilearn.demo/recordings/pandas-advanced',
    recordingUrl: 'https://venilearn.demo/recordings/pandas-advanced',
    recordingPolicy: 'Cloud HD Recording Available',
    recordingEnabled: true,
    recordingViews: 115,
    watchProgressPercentage: 0,
    isBookmarked: false,
    description: 'Techniques for blazing-fast data wrangling with NumPy vectorization, categorical memory optimization, and MultiIndex slicing.',
    agenda: '1. Memory Profiling of DataFrames\n2. Custom Cython/Numba UDFs\n3. Time-Series Resampling',
    materials: ['Jupyter Notebook with Exercises', 'Real-World E-commerce Dataset (CSV)'],
    targetAudienceType: 'all_cohort',
    targetStudentIds: ['st-8', 'st-9', 'st-10', 'u-007'],
    status: 'ended',
    attendance: [
      { userId: 'u-007', userName: 'Alex Thompson', status: 'present', joinedAt: '2026-10-07T13:00:00Z' }
    ],
    createdAt: '2026-10-02T14:00:00Z',
    updatedAt: '2026-10-07T14:40:00Z',
  },
  {
    id: 'rec-006',
    title: 'Cloud Security, OAuth2 & JWT Token Revocation Strategies',
    courseId: 'crs-005',
    courseTitle: 'Cloud Architecture & DevOps',
    cohortId: 'coh-001',
    cohortName: 'Spring 2026 Engineering',
    departmentId: 'dep-001',
    instructorId: 'u-008',
    instructorName: 'Sarah Jenkins',
    date: '2026-10-03',
    startTime: '16:00',
    endTime: '17:20',
    duration: 80,
    durationMinutes: 80,
    timezone: 'America/New_York',
    capacity: 35,
    enrolledCount: 31,
    provider: 'Google Meet',
    meetingUrl: 'https://meet.google.com/sec-auth-demo',
    joinLink: 'https://meet.google.com/sec-auth-demo',
    recordingLink: 'https://venilearn.demo/recordings/oauth2-security',
    recordingUrl: 'https://venilearn.demo/recordings/oauth2-security',
    recordingPolicy: 'Cloud Recorded with automated AI transcript',
    recordingEnabled: true,
    recordingViews: 210,
    watchProgressPercentage: 85,
    isBookmarked: true,
    description: 'Security auditing of authorization servers, token rotation, Redis blacklists, PKCE flows for SPAs, and OWASP Top 10 API defenses.',
    agenda: '1. Access vs Refresh Token Security\n2. Stateless Revocation with Redis Bloom Filters\n3. Rate Limiting Brute Force Attacks',
    materials: ['OAuth2 Architecture RFCs', 'Security Checklist (PDF)', 'Express.js Auth Middleware'],
    targetAudienceType: 'all_cohort',
    targetStudentIds: ['st-1', 'st-2', 'st-3', 'st-4', 'st-5', 'u-007'],
    status: 'ended',
    attendance: [
      { userId: 'u-007', userName: 'Alex Thompson', status: 'present', joinedAt: '2026-10-03T16:02:00Z' }
    ],
    createdAt: '2026-09-28T11:00:00Z',
    updatedAt: '2026-10-03T17:25:00Z',
  },
  {
    id: 'rec-007',
    title: 'Full-Stack System Design: Scalable URL Shortener & Rate Limiter',
    courseId: 'crs-001',
    courseTitle: 'Full-Stack JavaScript Essentials',
    cohortId: 'coh-001',
    cohortName: 'Spring 2026 Engineering',
    departmentId: 'dep-001',
    instructorId: 'u-004',
    instructorName: 'Dr. James Wilson',
    date: '2026-09-29',
    startTime: '09:30',
    endTime: '11:20',
    duration: 110,
    durationMinutes: 110,
    timezone: 'America/New_York',
    capacity: 50,
    enrolledCount: 46,
    provider: 'Google Meet',
    meetingUrl: 'https://meet.google.com/sys-design-shortener',
    joinLink: 'https://meet.google.com/sys-design-shortener',
    recordingLink: 'https://venilearn.demo/recordings/system-design-shortener',
    recordingUrl: 'https://venilearn.demo/recordings/system-design-shortener',
    recordingPolicy: 'Cloud HD Recording Available',
    recordingEnabled: true,
    recordingViews: 320,
    watchProgressPercentage: 100,
    isBookmarked: false,
    description: 'Comprehensive architecture interview walkthrough: capacity estimations, Base62 hashing, sliding window rate limiters with Redis, and CDN caching.',
    agenda: '1. High-Level Requirements & Calculations\n2. Database Schema: Relational vs Key-Value\n3. Scalability: Sharding, Caching & Geo-DNS',
    materials: ['System Architecture Diagram (Excalidraw)', 'Whitepaper Summary', 'Node Redis Rate Limiter Repo'],
    targetAudienceType: 'all_cohort',
    targetStudentIds: ['st-1', 'st-2', 'st-3', 'st-4', 'st-5', 'u-007'],
    status: 'ended',
    attendance: [
      { userId: 'u-007', userName: 'Alex Thompson', status: 'present', joinedAt: '2026-09-29T09:30:00Z' }
    ],
    createdAt: '2026-09-24T10:00:00Z',
    updatedAt: '2026-09-29T11:25:00Z',
  },
  {
    id: 'ls-live-01',
    title: 'Advanced React 19: Optimistic Mutations & Server Actions',
    courseId: 'crs-002',
    cohortId: 'coh-001',
    departmentId: 'dep-001',
    instructorId: 'u-004',
    instructorName: 'Dr. James Wilson',
    date: '2026-10-23',
    startTime: '13:00',
    endTime: '14:30',
    duration: 90,
    durationMinutes: 90,
    timezone: 'America/New_York',
    capacity: 35,
    enrolledCount: 28,
    provider: 'Google Meet',
    meetingUrl: 'https://meet.google.com/ven-r19-live',
    joinLink: 'https://meet.google.com/ven-r19-live',
    recordingPolicy: 'Cloud Recorded with automated AI transcript',
    recordingEnabled: true,
    description: 'Interactive live coding session on React 19 server actions, useOptimistic hook, and streaming suspense boundaries.',
    agenda: '1. Server Action Form Submissions\n2. Optimistic UI Rollbacks\n3. Q&A and Code Review',
    materials: ['React 19 Architecture Guide', 'GitHub Starter Repo'],
    targetAudienceType: 'all_cohort',
    targetStudentIds: ['st-1', 'st-2', 'st-3', 'st-4', 'st-5', 'u-007', 'u-009', 'u-010'],
    status: 'live',
    attendance: [
      { userId: 'u-007', userName: 'Alex Thompson', status: 'present', joinedAt: '2026-10-23T13:02:00Z' },
      { userId: 'u-009', userName: 'Maria Garcia', status: 'present', joinedAt: '2026-10-23T13:05:00Z' },
    ],
    createdAt: '2026-10-20T10:00:00Z',
    updatedAt: '2026-10-23T13:00:00Z',
  },
  {
    id: 'ls-001',
    title: 'Advanced TypeScript Patterns & Conditional Types Workshop',
    courseId: 'crs-004',
    cohortId: 'coh-002',
    departmentId: 'dep-001',
    instructorId: 'u-004',
    instructorName: 'Dr. James Wilson',
    date: '2026-10-24',
    startTime: '10:00',
    endTime: '11:30',
    duration: 90,
    durationMinutes: 90,
    timezone: 'America/New_York',
    capacity: 30,
    enrolledCount: 22,
    provider: 'Google Meet',
    joinLink: 'https://meet.google.com/abc-demo-xyz',
    meetingUrl: 'https://meet.google.com/abc-demo-xyz',
    recordingPolicy: 'Allowed with participant consent',
    recordingEnabled: true,
    description: 'Deep dive into recursive conditional types, infer keyword, and high-performance type-level computation.',
    agenda: 'Conditional Types, Inferred Tuples, Template Literal Generics',
    materials: ['TypeScript Handbook', 'Exercise Files'],
    targetAudienceType: 'all_cohort',
    targetStudentIds: ['st-6', 'u-006', 'u-008', 'st-7', 'u-007'],
    status: 'scheduled',
    attendance: [],
    createdAt: '2026-10-10T00:00:00Z',
    updatedAt: '2026-10-15T00:00:00Z',
  },
  {
    id: 'ls-002',
    title: 'Distributed Systems: Microservices Event Sourcing with Kafka',
    courseId: 'crs-001',
    cohortId: 'coh-001',
    departmentId: 'dep-001',
    instructorId: 'u-004',
    instructorName: 'Dr. James Wilson',
    date: '2026-10-25',
    startTime: '15:00',
    endTime: '16:30',
    duration: 90,
    durationMinutes: 90,
    timezone: 'America/New_York',
    capacity: 40,
    enrolledCount: 32,
    provider: 'Google Meet',
    joinLink: 'https://meet.google.com/abc-demo-xyz',
    meetingUrl: 'https://meet.google.com/abc-demo-xyz',
    recordingPolicy: 'Recorded for enrolled cohort archival',
    recordingEnabled: true,
    description: 'Practical walkthrough of message brokers, idempotency keys, and CQRS patterns for resilient cloud services.',
    agenda: 'Kafka Consumer Groups, Rebalancing, Dead Letter Queues',
    materials: ['Architecture Diagrams', 'Docker Compose Specs'],
    targetAudienceType: 'all_cohort',
    targetStudentIds: ['st-1', 'st-2', 'st-3', 'st-4', 'st-5', 'u-007', 'u-009', 'u-010'],
    status: 'scheduled',
    attendance: [],
    createdAt: '2026-10-12T00:00:00Z',
    updatedAt: '2026-10-18T00:00:00Z',
  },
  {
    id: 'ls-003',
    title: 'Full-Stack JavaScript Q&A & Code Clinic',
    courseId: 'crs-001',
    cohortId: 'coh-001',
    departmentId: 'dep-001',
    instructorId: 'u-004',
    instructorName: 'Dr. James Wilson',
    date: '2026-10-15',
    startTime: '09:00',
    endTime: '10:00',
    duration: 60,
    durationMinutes: 60,
    timezone: 'America/New_York',
    capacity: 35,
    enrolledCount: 28,
    provider: 'Google Meet',
    joinLink: 'https://meet.google.com/js-qa-clinic',
    meetingUrl: 'https://meet.google.com/js-qa-clinic',
    recordingLink: 'https://venilearn.demo/recordings/ls-003',
    recordingUrl: 'https://venilearn.demo/recordings/ls-003',
    recordingPolicy: 'Available for 30 days',
    recordingEnabled: true,
    description: 'Weekly student open clinic reviewing async event loop questions, closure pitfalls, and DOM performance.',
    agenda: 'Student Questions, Live Refactoring, Exam Guidance',
    materials: ['Slide Deck PDF', 'Demo Repo Link'],
    targetAudienceType: 'all_cohort',
    targetStudentIds: ['st-1', 'st-2', 'st-3', 'st-4', 'st-5', 'u-007', 'u-009', 'u-010'],
    status: 'ended',
    attendance: [
      { userId: 'u-007', userName: 'Alex Thompson', status: 'present', joinedAt: '2026-10-15T09:02:00Z', leftAt: '2026-10-15T10:00:00Z' },
      { userId: 'u-009', userName: 'Maria Garcia', status: 'late', joinedAt: '2026-10-15T09:15:00Z', leftAt: '2026-10-15T10:00:00Z' },
      { userId: 'u-010', userName: 'David Kim', status: 'absent' },
    ],
    createdAt: '2026-10-08T00:00:00Z',
    updatedAt: '2026-10-15T10:05:00Z',
  },
  {
    id: 'ls-004',
    title: 'Python for Data Science: Pandas & Exploratory Data Analysis',
    courseId: 'crs-003',
    cohortId: 'coh-003',
    departmentId: 'dep-003',
    instructorId: 'u-005',
    instructorName: 'Emily Rodriguez',
    date: '2026-10-26',
    startTime: '11:00',
    endTime: '12:30',
    duration: 90,
    durationMinutes: 90,
    timezone: 'America/New_York',
    capacity: 40,
    enrolledCount: 16,
    provider: 'Google Meet',
    joinLink: 'https://meet.google.com/pds-demo-442',
    meetingUrl: 'https://meet.google.com/pds-demo-442',
    recordingPolicy: 'Allowed with participant consent',
    recordingEnabled: true,
    description: 'Practical data cleaning, handling missing values, and group-by aggregations on real-world datasets.',
    agenda: 'Pandas DataFrames, Vectorized Operations, Plotly Visualizations',
    materials: ['Jupyter Notebooks', 'Sample Datasets'],
    targetAudienceType: 'all_cohort',
    targetStudentIds: ['st-8', 'st-9', 'st-10'],
    status: 'scheduled',
    attendance: [],
    room: 'Lab C (Google Meet)',
    dayOfWeek: 'Monday',
    cohortName: 'Fall 2026 Data Science',
    courseTitle: 'Python for Data Science',
    createdBy: 'u-005',
    createdRole: 'trainer',
    createdAt: '2026-10-12T00:00:00Z',
    updatedAt: '2026-10-14T00:00:00Z',
  },

  // --- Synchronized Institutional Timetable Schedules ---
  {
    id: 'tt-mon-01',
    title: 'React Hooks & State Architecture',
    courseId: 'crs-002',
    courseTitle: 'Advanced React Patterns',
    cohortId: 'coh-001',
    cohortName: 'Spring 2026 Engineering',
    departmentId: 'dep-001',
    instructorId: 'u-004',
    instructorName: 'Dr. James Wilson',
    dayOfWeek: 'Monday',
    date: '2026-10-19',
    startTime: '09:00',
    endTime: '10:30',
    duration: 90,
    durationMinutes: 90,
    room: 'Hall 101 (Google Meet)',
    provider: 'Google Meet',
    meetingUrl: 'https://meet.google.com/tt-mon-01',
    joinLink: 'https://meet.google.com/tt-mon-01',
    targetAudienceType: 'all_cohort',
    targetStudentIds: ['st-1', 'st-2', 'st-3', 'st-4', 'st-5', 'u-007'],
    status: 'scheduled',
    createdBy: 'u-002',
    createdRole: 'org_admin',
    createdAt: '2026-10-10T08:00:00Z',
    updatedAt: '2026-10-10T08:00:00Z',
    attendance: [],
  },
  {
    id: 'tt-mon-02',
    title: 'Microservices with Go & Docker',
    courseId: 'crs-001',
    courseTitle: 'JavaScript Fundamentals',
    cohortId: 'coh-002',
    cohortName: 'Summer 2026 Cloud',
    departmentId: 'dep-001',
    instructorId: 'u-008',
    instructorName: 'Prof. Elena Rostova',
    dayOfWeek: 'Monday',
    date: '2026-10-19',
    startTime: '14:00',
    endTime: '15:30',
    duration: 90,
    durationMinutes: 90,
    room: 'Lab B',
    provider: 'In-Person Campus Lab',
    meetingUrl: 'https://meet.venilearn.com/room/tt-mon-02',
    joinLink: 'https://meet.venilearn.com/room/tt-mon-02',
    targetAudienceType: 'all_cohort',
    targetStudentIds: ['st-6', 'u-006', 'u-008'],
    status: 'scheduled',
    createdBy: 'u-002',
    createdRole: 'org_admin',
    createdAt: '2026-10-10T08:00:00Z',
    updatedAt: '2026-10-10T08:00:00Z',
    attendance: [],
  },
  {
    id: 'tt-tue-01',
    title: 'Machine Learning Pipelines & Data Prep',
    courseId: 'crs-003',
    courseTitle: 'Python for Data Science',
    cohortId: 'coh-003',
    cohortName: 'Fall 2026 Data Science',
    departmentId: 'dep-003',
    instructorId: 'u-012',
    instructorName: 'Dr. Marcus Bell',
    dayOfWeek: 'Tuesday',
    date: '2026-10-20',
    startTime: '11:00',
    endTime: '12:30',
    duration: 90,
    durationMinutes: 90,
    room: 'Virtual Room A (Google Meet)',
    provider: 'Google Meet',
    meetingUrl: 'https://meet.google.com/demo-ml-pipelines',
    joinLink: 'https://meet.google.com/demo-ml-pipelines',
    targetAudienceType: 'all_cohort',
    targetStudentIds: ['st-8', 'st-9', 'st-10'],
    status: 'scheduled',
    createdBy: 'u-002',
    createdRole: 'org_admin',
    createdAt: '2026-10-10T08:00:00Z',
    updatedAt: '2026-10-10T08:00:00Z',
    attendance: [],
  },
  {
    id: 'tt-tue-02',
    title: 'Database Optimization & Indexing',
    courseId: 'crs-001',
    courseTitle: 'JavaScript Fundamentals',
    cohortId: 'coh-001',
    cohortName: 'Spring 2026 Engineering',
    departmentId: 'dep-001',
    instructorId: 'u-004',
    instructorName: 'Dr. James Wilson',
    dayOfWeek: 'Tuesday',
    date: '2026-10-20',
    startTime: '16:00',
    endTime: '17:30',
    duration: 90,
    durationMinutes: 90,
    room: 'Hall 102',
    provider: 'Campus Lecture Hall',
    meetingUrl: 'https://meet.venilearn.com/room/tt-tue-02',
    joinLink: 'https://meet.venilearn.com/room/tt-tue-02',
    targetAudienceType: 'all_cohort',
    targetStudentIds: ['st-1', 'st-2', 'st-3', 'st-4', 'st-5', 'u-007'],
    status: 'scheduled',
    createdBy: 'u-004',
    createdRole: 'trainer',
    createdAt: '2026-10-10T08:00:00Z',
    updatedAt: '2026-10-10T08:00:00Z',
    attendance: [],
  },
  {
    id: 'tt-wed-01',
    title: 'React Hooks & State Architecture (Lab)',
    courseId: 'crs-002',
    courseTitle: 'Advanced React Patterns',
    cohortId: 'coh-001',
    cohortName: 'Spring 2026 Engineering',
    departmentId: 'dep-001',
    instructorId: 'u-004',
    instructorName: 'Dr. James Wilson',
    dayOfWeek: 'Wednesday',
    date: '2026-10-21',
    startTime: '09:00',
    endTime: '10:30',
    duration: 90,
    durationMinutes: 90,
    room: 'Lab A',
    provider: 'Computer Lab A',
    meetingUrl: 'https://meet.venilearn.com/room/tt-wed-01',
    joinLink: 'https://meet.venilearn.com/room/tt-wed-01',
    targetAudienceType: 'all_cohort',
    targetStudentIds: ['st-1', 'st-2', 'st-3', 'st-4', 'st-5', 'u-007'],
    status: 'scheduled',
    createdBy: 'u-004',
    createdRole: 'trainer',
    createdAt: '2026-10-10T08:00:00Z',
    updatedAt: '2026-10-10T08:00:00Z',
    attendance: [],
  },
  {
    id: 'tt-wed-02',
    title: 'Kubernetes Cluster Deployment',
    courseId: 'crs-001',
    courseTitle: 'JavaScript Fundamentals',
    cohortId: 'coh-002',
    cohortName: 'Summer 2026 Cloud',
    departmentId: 'dep-001',
    instructorId: 'u-008',
    instructorName: 'Prof. Elena Rostova',
    dayOfWeek: 'Wednesday',
    date: '2026-10-21',
    startTime: '14:00',
    endTime: '15:30',
    duration: 90,
    durationMinutes: 90,
    room: 'Virtual Room B',
    provider: 'Google Meet',
    meetingUrl: 'https://meet.google.com/k8s-cloud-demo',
    joinLink: 'https://meet.google.com/k8s-cloud-demo',
    targetAudienceType: 'all_cohort',
    targetStudentIds: ['st-6', 'u-006', 'u-008'],
    status: 'scheduled',
    createdBy: 'u-002',
    createdRole: 'org_admin',
    createdAt: '2026-10-10T08:00:00Z',
    updatedAt: '2026-10-10T08:00:00Z',
    attendance: [],
  },
  {
    id: 'tt-thu-01',
    title: 'Neural Networks & PyTorch Fundamentals',
    courseId: 'crs-003',
    courseTitle: 'Python for Data Science',
    cohortId: 'coh-003',
    cohortName: 'Fall 2026 Data Science',
    departmentId: 'dep-003',
    instructorId: 'u-012',
    instructorName: 'Dr. Marcus Bell',
    dayOfWeek: 'Thursday',
    date: '2026-10-22',
    startTime: '11:00',
    endTime: '12:30',
    duration: 90,
    durationMinutes: 90,
    room: 'Hall 201',
    provider: 'Lecture Hall 201',
    meetingUrl: 'https://meet.venilearn.com/room/tt-thu-01',
    joinLink: 'https://meet.venilearn.com/room/tt-thu-01',
    targetAudienceType: 'all_cohort',
    targetStudentIds: ['st-8', 'st-9', 'st-10'],
    status: 'scheduled',
    createdBy: 'u-012',
    createdRole: 'trainer',
    createdAt: '2026-10-10T08:00:00Z',
    updatedAt: '2026-10-10T08:00:00Z',
    attendance: [],
  },
  {
    id: 'tt-fri-01',
    title: 'Engineering Track Weekly Capstone Review',
    courseId: 'crs-002',
    courseTitle: 'Advanced React Patterns',
    cohortId: 'coh-001',
    cohortName: 'Spring 2026 Engineering',
    departmentId: 'dep-001',
    instructorId: 'u-004',
    instructorName: 'Dr. James Wilson',
    dayOfWeek: 'Friday',
    date: '2026-10-23',
    startTime: '10:00',
    endTime: '11:30',
    duration: 90,
    durationMinutes: 90,
    room: 'Auditorium',
    provider: 'Main Campus Auditorium',
    meetingUrl: 'https://meet.venilearn.com/room/tt-fri-01',
    joinLink: 'https://meet.venilearn.com/room/tt-fri-01',
    targetAudienceType: 'all_cohort',
    targetStudentIds: ['st-1', 'st-2', 'st-3', 'st-4', 'st-5', 'u-007'],
    status: 'scheduled',
    createdBy: 'u-004',
    createdRole: 'trainer',
    createdAt: '2026-10-10T08:00:00Z',
    updatedAt: '2026-10-10T08:00:00Z',
    attendance: [],
  },
  {
    id: 'tt-fri-02',
    title: 'Faculty Office Hours & Student Q&A',
    courseId: 'crs-001',
    courseTitle: 'JavaScript Fundamentals',
    cohortId: 'coh-001',
    cohortName: 'All Cohorts',
    departmentId: 'dep-001',
    instructorId: 'u-004',
    instructorName: 'Dr. James Wilson',
    dayOfWeek: 'Friday',
    date: '2026-10-23',
    startTime: '15:00',
    endTime: '16:30',
    duration: 90,
    durationMinutes: 90,
    room: 'Faculty Lounge',
    provider: 'Faculty Lounge / Virtual',
    meetingUrl: 'https://meet.venilearn.com/room/tt-fri-02',
    joinLink: 'https://meet.venilearn.com/room/tt-fri-02',
    targetAudienceType: 'all_faculty',
    targetStudentIds: ['st-1', 'st-2', 'st-3', 'st-4', 'st-5', 'u-007', 'u-009'],
    status: 'scheduled',
    createdBy: 'u-002',
    createdRole: 'org_admin',
    createdAt: '2026-10-10T08:00:00Z',
    updatedAt: '2026-10-10T08:00:00Z',
    attendance: [],
  },
];

function loadInitialSessions(): LiveSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SESSIONS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Automatically upgrade any legacy Zoom/Jitsi/VeniLearn rooms to Google Meet
        const upgraded = parsed.map((s: LiveSession) => {
          const isLegacyProvider = s.provider && (s.provider.includes('Zoom') || s.provider.includes('VeniLearn Live') || s.provider.includes('Jitsi'));
          const isLegacyUrl = s.meetingUrl && (s.meetingUrl.includes('zoom.us') || s.meetingUrl.includes('meet.venilearn.com') || s.meetingUrl.includes('jit.si'));
          if (isLegacyProvider || isLegacyUrl) {
            const cleanId = (s.id || 'ses').replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(-6);
            const meetUrl = s.meetingUrl ? `https://meet.google.com/ven-${cleanId}` : '';
            return {
              ...s,
              provider: 'Google Meet',
              meetingUrl: meetUrl,
              joinLink: meetUrl,
            };
          }
          return s;
        });

        const existingIds = new Set(upgraded.map((s: LiveSession) => s.id));
        const missingInitial = INITIAL_SESSIONS.filter((init) => !existingIds.has(init.id));
        if (missingInitial.length > 0) {
          const merged = [...upgraded, ...missingInitial];
          localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(merged));
          return merged;
        }
        localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(upgraded));
        return upgraded;
      }
    }
  } catch (err) {
    console.warn('Failed to load live sessions from localStorage:', err);
  }
  return INITIAL_SESSIONS;
}

function persistSessions(sessions: LiveSession[]) {
  try {
    localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(sessions));
  } catch (err) {
    console.warn('Failed to save live sessions to localStorage:', err);
  }
}

export const useLiveSessionStore = create<LiveSessionState>((set, get) => ({
  sessions: loadInitialSessions(),

  getSessionById: (id: string) => {
    return get().sessions.find((s) => s.id === id);
  },

  getSessionsForCohort: (cohortId: string) => {
    return get().sessions.filter((s) => s.cohortId === cohortId);
  },

  getSessionsForStudent: (studentId: string, cohortIds: string[], courseIds: string[]) => {
    const { sessions } = get();
    return sessions.filter((s) => {
      // If student is explicitly in targetStudentIds
      if (s.targetStudentIds && s.targetStudentIds.includes(studentId)) {
        return true;
      }
      // If session is for a cohort the student belongs to
      if (s.cohortId && cohortIds.includes(s.cohortId)) {
        if (s.targetAudienceType === 'selected_students') {
          return s.targetStudentIds?.includes(studentId);
        }
        return true;
      }
      // If session is for an enrolled course with no restrictive cohort
      if (s.courseId && courseIds.includes(s.courseId) && !s.cohortId) {
        return true;
      }
      return false;
    });
  },

  addSession: (sessionData, notifyStudents = true) => {
    const newSession: LiveSession = {
      ...sessionData,
      id: `ls-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      attendance: [],
    };

    const updated = [newSession, ...get().sessions];
    set({ sessions: updated });
    persistSessions(updated);

    // Dispatch in-app notifications if requested
    if (notifyStudents && newSession.targetStudentIds && newSession.targetStudentIds.length > 0) {
      try {
        useAuthStore.getState().notifyLiveSession({
          sessionId: newSession.id,
          sessionTitle: newSession.title,
          instructorName: newSession.instructorName || 'Your Trainer',
          recipientIds: newSession.targetStudentIds,
          type: 'scheduled',
          date: newSession.date,
          startTime: newSession.startTime,
        });
      } catch (e) {
        console.warn('Failed to dispatch live session scheduled notification:', e);
      }
    }

    return { success: true, session: newSession };
  },

  updateSession: (updatedSession, notifyStudents = true) => {
    const sessionWithTimestamp: LiveSession = {
      ...updatedSession,
      updatedAt: new Date().toISOString(),
    };

    const updated = get().sessions.map((s) =>
      s.id === updatedSession.id ? sessionWithTimestamp : s
    );

    set({ sessions: updated });
    persistSessions(updated);

    if (notifyStudents && sessionWithTimestamp.targetStudentIds && sessionWithTimestamp.targetStudentIds.length > 0) {
      try {
        useAuthStore.getState().notifyLiveSession({
          sessionId: sessionWithTimestamp.id,
          sessionTitle: sessionWithTimestamp.title,
          instructorName: sessionWithTimestamp.instructorName || 'Your Trainer',
          recipientIds: sessionWithTimestamp.targetStudentIds,
          type: 'updated',
          date: sessionWithTimestamp.date,
          startTime: sessionWithTimestamp.startTime,
        });
      } catch (e) {
        console.warn('Failed to dispatch session updated notification:', e);
      }
    }

    return { success: true, session: sessionWithTimestamp };
  },

  cancelSession: (sessionId: string, reason?: string, notifyStudents = true) => {
    const target = get().sessions.find((s) => s.id === sessionId);
    if (!target) return { success: false };

    const updated = get().sessions.map((s) =>
      s.id === sessionId
        ? {
            ...s,
            status: 'cancelled' as const,
            description: reason ? `[CANCELLED: ${reason}] ${s.description || ''}` : s.description,
            updatedAt: new Date().toISOString(),
          }
        : s
    );

    set({ sessions: updated });
    persistSessions(updated);

    if (notifyStudents && target.targetStudentIds && target.targetStudentIds.length > 0) {
      try {
        useAuthStore.getState().notifyLiveSession({
          sessionId: target.id,
          sessionTitle: target.title,
          instructorName: target.instructorName || 'Your Trainer',
          recipientIds: target.targetStudentIds,
          type: 'cancelled',
          message: reason ? `Session was cancelled. Reason: ${reason}` : undefined,
        });
      } catch (e) {
        console.warn('Failed to dispatch cancellation notification:', e);
      }
    }

    return { success: true };
  },

  startBroadcast: (sessionId: string) => {
    const target = get().sessions.find((s) => s.id === sessionId);
    if (!target) return { success: false };

    const updated = get().sessions.map((s) =>
      s.id === sessionId
        ? {
            ...s,
            status: 'live' as const,
            updatedAt: new Date().toISOString(),
          }
        : s
    );

    set({ sessions: updated });
    persistSessions(updated);

    if (target.targetStudentIds && target.targetStudentIds.length > 0) {
      try {
        useAuthStore.getState().notifyLiveSession({
          sessionId: target.id,
          sessionTitle: target.title,
          instructorName: target.instructorName || 'Your Trainer',
          recipientIds: target.targetStudentIds,
          type: 'live',
        });
      } catch (e) {
        console.warn('Failed to dispatch live notification:', e);
      }
    }

    return { success: true };
  },

  endSession: (sessionId: string, recordingUrl?: string) => {
    const updated = get().sessions.map((s) =>
      s.id === sessionId
        ? {
            ...s,
            status: 'ended' as const,
            recordingUrl: recordingUrl || s.recordingUrl || `https://venilearn.demo/recordings/${sessionId}`,
            recordingLink: recordingUrl || s.recordingLink || `https://venilearn.demo/recordings/${sessionId}`,
            updatedAt: new Date().toISOString(),
          }
        : s
    );

    set({ sessions: updated });
    persistSessions(updated);
    return { success: true };
  },

  deleteSession: (sessionId: string) => {
    const updated = get().sessions.filter((s) => s.id !== sessionId);
    set({ sessions: updated });
    persistSessions(updated);
    return { success: true };
  },

  toggleBookmark: (sessionId: string) => {
    const updated = get().sessions.map((s) =>
      s.id === sessionId ? { ...s, isBookmarked: !s.isBookmarked } : s
    );
    set({ sessions: updated });
    persistSessions(updated);
  },
}));
