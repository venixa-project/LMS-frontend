import { AcademicEvent, CategoryMeta, EventCategory } from './types';
import { formatDateKey, getStartOfWeek } from './dateHelpers';

export const CATEGORY_META: Record<EventCategory, CategoryMeta> = {
  live: {
    id: 'live',
    label: 'Live Class',
    color: '#818cf8',
    bg: 'rgba(99, 102, 241, 0.16)',
    border: '#6366f1',
    text: '#e0e7ff',
    dotColor: '#6366f1'
  },
  lab: {
    id: 'lab',
    label: 'Hands-on Lab',
    color: '#22d3ee',
    bg: 'rgba(6, 182, 212, 0.16)',
    border: '#06b6d4',
    text: '#cffafe',
    dotColor: '#06b6d4'
  },
  capstone: {
    id: 'capstone',
    label: 'Capstone & Review',
    color: '#fbbf24',
    bg: 'rgba(245, 158, 11, 0.16)',
    border: '#f59e0b',
    text: '#fef3c7',
    dotColor: '#f59e0b'
  },
  'office-hours': {
    id: 'office-hours',
    label: 'Faculty Office Hours',
    color: '#34d399',
    bg: 'rgba(16, 185, 129, 0.16)',
    border: '#10b981',
    text: '#d1fae5',
    dotColor: '#10b981'
  },
  study: {
    id: 'study',
    label: 'Peer Study & Review',
    color: '#f472b6',
    bg: 'rgba(236, 72, 153, 0.16)',
    border: '#ec4899',
    text: '#fce7f3',
    dotColor: '#ec4899'
  }
};

// Available courses for dropdowns
export const AVAILABLE_COURSES = [
  'Advanced React & Component Design Patterns',
  'Distributed Systems & Cloud Architecture',
  'Database Optimization & Indexing',
  'Machine Learning Pipelines & Data Prep',
  'Neural Networks & PyTorch Fundamentals',
  'Full-Stack Web Development Bootcamp',
  'Independent Study / Capstone Preparation'
];

export const AVAILABLE_INSTRUCTORS = [
  'Dr. James Wilson',
  'Prof. Elena Rostova',
  'Dr. Marcus Bell',
  'Aisha Patel',
  'All Faculty (Open Floor)'
];

export const AVAILABLE_LOCATIONS = [
  'Hall 101',
  'Hall 102',
  'Hall 201',
  'Lab A (Biometric)',
  'Lab B (Cloud Workstations)',
  'Virtual Room A (Google Meet)',
  'Virtual Room B (Google Meet)',
  'Auditorium',
  'Faculty Lounge'
];

// Base schedule template that repeats for academic weeks
// 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday
export const BASE_WEEKLY_TEMPLATE: Omit<AcademicEvent, 'id' | 'date'>[] = [
  {
    title: 'React Hooks & State Architecture',
    course: 'Advanced React & Component Design Patterns',
    courseId: 'crs-002',
    instructor: 'Dr. James Wilson',
    instructorRole: 'Lead Instructor & Faculty Chair',
    cohort: 'Spring 2026 Engineering',
    startTime: '09:00',
    endTime: '10:30',
    durationMinutes: 90,
    location: 'Hall 101',
    category: 'live',
    isVirtual: false,
    description: 'Deep dive into concurrent rendering, custom hooks encapsulation, and optimistic UI synchronization.',
    materials: ['Slide Deck (Week 6)', 'Starter Codespace', 'Architecture Diagrams'],
    recurringWeekday: 1
  },
  {
    title: 'Microservices with Go & Docker',
    course: 'Distributed Systems & Cloud Architecture',
    courseId: 'crs-006',
    instructor: 'Prof. Elena Rostova',
    instructorRole: 'Associate Professor of Cloud Systems',
    cohort: 'Summer 2026 Cloud',
    startTime: '14:00',
    endTime: '15:30',
    durationMinutes: 90,
    location: 'Lab B (Cloud Workstations)',
    category: 'lab',
    isVirtual: false,
    description: 'Hands-on containerization of decoupled microservices and Docker Compose cluster networking.',
    materials: ['Docker Compose Spec', 'Go SDK Cheatsheet'],
    recurringWeekday: 1
  },
  {
    title: 'Machine Learning Pipelines & Data Prep',
    course: 'Machine Learning Pipelines & Data Prep',
    courseId: 'crs-003',
    instructor: 'Dr. Marcus Bell',
    instructorRole: 'Senior ML Researcher',
    cohort: 'Fall 2026 Data Science',
    startTime: '11:00',
    endTime: '12:30',
    durationMinutes: 90,
    location: 'Virtual Room A (Google Meet)',
    category: 'live',
    isVirtual: true,
    meetingUrl: 'https://meet.google.com/demo-ml-pipeline',
    description: 'Feature engineering, automated categorical encoding, and dataset partitioning for training.',
    materials: ['Jupyter Notebook', 'Cleaned Kaggle Dataset'],
    recurringWeekday: 2
  },
  {
    title: 'Database Optimization & Indexing',
    course: 'Database Optimization & Indexing',
    courseId: 'crs-005',
    instructor: 'Dr. James Wilson',
    instructorRole: 'Lead Instructor',
    cohort: 'Spring 2026 Engineering',
    startTime: '16:00',
    endTime: '17:30',
    durationMinutes: 90,
    location: 'Hall 102',
    category: 'live',
    isVirtual: false,
    description: 'B-tree vs LSM-tree indexing internals, EXPLAIN query planning, and connection pooling.',
    materials: ['SQL Profiling Queries', 'PostgreSQL Schema'],
    recurringWeekday: 2
  },
  {
    title: 'React Hooks & State Architecture (Lab)',
    course: 'Advanced React & Component Design Patterns',
    courseId: 'crs-002',
    instructor: 'Dr. James Wilson',
    instructorRole: 'Lead Instructor',
    cohort: 'Spring 2026 Engineering',
    startTime: '09:00',
    endTime: '10:30',
    durationMinutes: 90,
    location: 'Lab A (Biometric)',
    category: 'lab',
    isVirtual: false,
    description: 'Practical lab implementing useSyncExternalStore and TanStack Query cache invalidation.',
    materials: ['Lab 4 Task Rubric', 'Automated Jest Test Suite'],
    recurringWeekday: 3
  },
  {
    title: 'Kubernetes Cluster Deployment',
    course: 'Distributed Systems & Cloud Architecture',
    courseId: 'crs-006',
    instructor: 'Prof. Elena Rostova',
    instructorRole: 'Associate Professor',
    cohort: 'Summer 2026 Cloud',
    startTime: '14:00',
    endTime: '15:30',
    durationMinutes: 90,
    location: 'Virtual Room B (Teams)',
    category: 'lab',
    isVirtual: true,
    meetingUrl: 'https://teams.microsoft.com/l/meetup-join/demo-k8s',
    description: 'Configuring ingress controllers, persistent volume claims, and rolling update deployments on Minikube.',
    materials: ['K8s Manifests.yaml', 'Helm Chart'],
    recurringWeekday: 3
  },
  {
    title: 'Neural Networks & PyTorch Fundamentals',
    course: 'Neural Networks & PyTorch Fundamentals',
    courseId: 'crs-003',
    instructor: 'Dr. Marcus Bell',
    instructorRole: 'Senior ML Researcher',
    cohort: 'Fall 2026 Data Science',
    startTime: '11:00',
    endTime: '12:30',
    durationMinutes: 90,
    location: 'Hall 201',
    category: 'live',
    isVirtual: false,
    description: 'Forward propagation math, loss functions, backpropagation autograd, and GPU tensor acceleration.',
    materials: ['PyTorch Notebook', 'CUDA Diagnostic Guide'],
    recurringWeekday: 4
  },
  {
    title: 'Cloud Architecture Design Review',
    course: 'Distributed Systems & Cloud Architecture',
    courseId: 'crs-006',
    instructor: 'Prof. Elena Rostova',
    instructorRole: 'Associate Professor',
    cohort: 'Summer 2026 Cloud',
    startTime: '15:00',
    endTime: '16:30',
    durationMinutes: 90,
    location: 'Lab B (Cloud Workstations)',
    category: 'capstone',
    isVirtual: false,
    description: 'Peer design review of multi-region fault tolerance architectures and SLA compliance.',
    materials: ['Cloud Architecture Checklist'],
    recurringWeekday: 4
  },
  {
    title: 'Engineering Track Weekly Capstone Review',
    course: 'Full-Stack Web Development Bootcamp',
    courseId: 'crs-001',
    instructor: 'Dr. James Wilson',
    instructorRole: 'Capstone Faculty Advisor',
    cohort: 'Spring 2026 Engineering',
    startTime: '10:00',
    endTime: '11:30',
    durationMinutes: 90,
    location: 'Auditorium',
    category: 'capstone',
    isVirtual: false,
    description: 'Comprehensive milestone review of student full-stack capstone projects and live demos.',
    materials: ['Capstone Milestone 3 Spec', 'Rubric Evaluation Sheet'],
    recurringWeekday: 5
  },
  {
    title: 'Faculty Office Hours & Student Q&A',
    course: 'Full-Stack Web Development Bootcamp',
    courseId: 'crs-001',
    instructor: 'All Faculty (Open Floor)',
    instructorRole: 'Student Mentorship & Office Hours',
    cohort: 'All Cohorts',
    startTime: '15:00',
    endTime: '16:30',
    durationMinutes: 90,
    location: 'Faculty Lounge',
    category: 'office-hours',
    isVirtual: false,
    description: 'Open drop-in academic mentoring session for homework assistance, career advising, and exam prep.',
    materials: ['Q&A Slido Board', 'Discussion Notes'],
    recurringWeekday: 5
  }
];

// Helper to instantiate template events for a given week start (Monday)
export const generateEventsForWeek = (monday: Date): AcademicEvent[] => {
  return BASE_WEEKLY_TEMPLATE.map((tpl, idx) => {
    const eventDate = new Date(monday);
    // recurringWeekday: 1=Mon -> +0 days, 2=Tue -> +1 day, etc.
    eventDate.setDate(monday.getDate() + ((tpl.recurringWeekday || 1) - 1));
    const dateStr = formatDateKey(eventDate);
    return {
      ...tpl,
      id: `tmpl-${dateStr}-${idx}`,
      date: dateStr
    };
  });
};

// Initial default week: October 19, 2026 (Monday) to October 25, 2026
const initialMonday = new Date(2026, 9, 19); // Oct 19, 2026
export const INITIAL_ACADEMIC_EVENTS: AcademicEvent[] = [
  ...generateEventsForWeek(initialMonday),
  // Additional one-off study session on Saturday
  {
    id: 'custom-sat-study',
    title: 'Weekend Peer Study Group: React Patterns',
    course: 'Advanced React & Component Design Patterns',
    courseId: 'crs-002',
    instructor: 'Alex Thompson (Peer Lead)',
    cohort: 'Spring 2026 Engineering',
    date: '2026-10-24',
    startTime: '13:00',
    endTime: '15:00',
    durationMinutes: 120,
    location: 'Library Group Room 3',
    category: 'study',
    isVirtual: false,
    description: 'Collaborative code review and practice building compound components and custom hooks.',
    recurringWeekday: 6
  }
];
