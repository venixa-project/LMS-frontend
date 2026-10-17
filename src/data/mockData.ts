// ============================================================
// LMS - Mock Data for All Modules (Synthetic Demo Data)
// ============================================================
import {
  Organization, Department, Cohort, Course, CourseModule, Lesson,
  LearningPath, Enrollment, LiveSession, QuestionBank, Question,
  Assessment, AssessmentAttempt, GradingTask, ProctoringIncident,
  Certificate, Integration, AuditEntry, Report, NotificationTemplate,
  Rubric, GamificationProfile, Role, Badge, PointsEvent, DashboardMetric,
} from '../types';

// --- Organizations ---
export const mockOrganizations: Organization[] = [
  {
    id: 'org-001', name: 'Acme Learning Corp', slug: 'acme-learning', logo: '', locale: 'en-US',
    timezone: 'America/New_York', contactEmail: 'admin@acmelearning.com', contactPhone: '+1-555-0100',
    status: 'active', settings: { gamification: true, proctoring: true, aiAssistant: true },
    userCount: 1250, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-10-15T00:00:00Z',
  },
  {
    id: 'org-002', name: 'TechStart Academy', slug: 'techstart', logo: '', locale: 'en-US',
    timezone: 'America/Los_Angeles', contactEmail: 'info@techstart.edu', status: 'active',
    settings: { gamification: true, proctoring: false, aiAssistant: false },
    userCount: 480, createdAt: '2026-03-15T00:00:00Z', updatedAt: '2026-10-10T00:00:00Z',
  },
  {
    id: 'org-003', name: 'Global Education Partners', slug: 'gep', logo: '', locale: 'en-GB',
    timezone: 'Europe/London', contactEmail: 'contact@gep.org', status: 'active',
    settings: { gamification: false, proctoring: true, aiAssistant: true },
    userCount: 3200, createdAt: '2026-02-01T00:00:00Z', updatedAt: '2026-10-12T00:00:00Z',
  },
];

// --- Departments ---
export const mockDepartments: Department[] = [
  { id: 'dep-001', name: 'Engineering', organizationId: 'org-001', status: 'active', memberCount: 180, createdAt: '2026-01-15T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z' },
  { id: 'dep-002', name: 'Product & Design', organizationId: 'org-001', status: 'active', memberCount: 95, createdAt: '2026-01-15T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z' },
  { id: 'dep-003', name: 'Data Science', organizationId: 'org-001', parentId: 'dep-001', status: 'active', memberCount: 42, createdAt: '2026-02-01T00:00:00Z', updatedAt: '2026-09-15T00:00:00Z' },
  { id: 'dep-004', name: 'Frontend', organizationId: 'org-001', parentId: 'dep-001', status: 'active', memberCount: 65, createdAt: '2026-02-01T00:00:00Z', updatedAt: '2026-09-15T00:00:00Z' },
  { id: 'dep-005', name: 'Backend', organizationId: 'org-001', parentId: 'dep-001', status: 'active', memberCount: 73, createdAt: '2026-02-01T00:00:00Z', updatedAt: '2026-09-15T00:00:00Z' },
  { id: 'dep-006', name: 'Sales & Marketing', organizationId: 'org-001', status: 'active', memberCount: 120, createdAt: '2026-01-15T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z' },
  { id: 'dep-007', name: 'Human Resources', organizationId: 'org-001', status: 'active', memberCount: 35, createdAt: '2026-01-15T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z' },
];

// --- Cohorts ---
export const mockCohorts: Cohort[] = [
  { id: 'coh-001', name: 'Q4 2026 Engineering Onboarding', code: 'ENG-Q4-26', organizationId: 'org-001', courseId: 'crs-001', instructors: ['u-004'], startDate: '2026-10-01', endDate: '2026-12-31', learnerCount: 28, capacity: 35, status: 'active', createdAt: '2026-09-15T00:00:00Z', updatedAt: '2026-10-15T00:00:00Z' },
  { id: 'coh-002', name: 'Advanced React Bootcamp', code: 'REACT-ADV', organizationId: 'org-001', courseId: 'crs-002', instructors: ['u-004'], startDate: '2026-10-15', endDate: '2026-11-30', learnerCount: 22, capacity: 30, status: 'active', createdAt: '2026-09-20T00:00:00Z', updatedAt: '2026-10-14T00:00:00Z' },
  { id: 'coh-003', name: 'Data Science Foundation', code: 'DS-FND', organizationId: 'org-001', courseId: 'crs-003', instructors: ['u-004'], startDate: '2026-11-01', endDate: '2027-01-31', learnerCount: 0, capacity: 40, status: 'scheduled', createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-10T00:00:00Z' },
  { id: 'coh-004', name: 'Leadership Development 2026', code: 'LEAD-26', organizationId: 'org-001', instructors: ['u-004'], startDate: '2026-09-01', endDate: '2026-12-15', learnerCount: 15, status: 'active', createdAt: '2026-08-15T00:00:00Z', updatedAt: '2026-10-15T00:00:00Z' },
  { id: 'coh-005', name: 'Summer Python Intensive', code: 'PY-SUM', organizationId: 'org-001', courseId: 'crs-004', instructors: ['u-004'], startDate: '2026-06-01', endDate: '2026-08-31', learnerCount: 30, capacity: 30, status: 'completed', createdAt: '2026-05-15T00:00:00Z', updatedAt: '2026-09-01T00:00:00Z' },
];

// --- Courses ---
const makeLessons = (moduleId: string, titles: string[]): Lesson[] =>
  titles.map((t, i) => ({
    id: `${moduleId}-les-${i + 1}`, title: t, type: i % 3 === 0 ? 'video' : i % 3 === 1 ? 'rich_text' : 'document',
    content: `Content for ${t}`, duration: 15 + i * 5, order: i + 1, status: 'published', isRequired: true,
  }));

export const mockCourses: Course[] = [
  {
    id: 'crs-001', title: 'JavaScript Fundamentals', shortDescription: 'Master the building blocks of modern web development',
    description: 'A comprehensive course covering JavaScript from variables and data types to async programming and modern ES2025+ features. Includes hands-on projects and assessments.',
    category: 'Web Development', tags: ['javascript', 'frontend', 'beginner'], language: 'English',
    audience: 'New developers and career changers', estimatedDuration: 2400, instructors: ['u-004'],
    status: 'published', visibility: 'public', version: 3, completionPolicy: 'Complete all required lessons and pass final assessment with 70%+',
    modules: [
      { id: 'mod-001', title: 'Getting Started', description: 'Introduction to JavaScript and setup', order: 1, lessons: makeLessons('mod-001', ['What is JavaScript?', 'Setting Up Your Environment', 'Your First Program', 'Variables and Data Types']) },
      { id: 'mod-002', title: 'Control Flow', description: 'Conditionals, loops and functions', order: 2, lessons: makeLessons('mod-002', ['If/Else Statements', 'Switch Statements', 'For and While Loops', 'Functions Basics', 'Arrow Functions']) },
      { id: 'mod-003', title: 'Objects and Arrays', description: 'Working with complex data', order: 3, lessons: makeLessons('mod-003', ['Arrays Deep Dive', 'Object Fundamentals', 'Destructuring', 'Spread and Rest']) },
    ],
    learnerCount: 342, completionRate: 78, createdBy: 'u-004', createdAt: '2026-03-01T00:00:00Z', updatedAt: '2026-10-10T00:00:00Z',
  },
  {
    id: 'crs-002', title: 'Advanced React Patterns', shortDescription: 'Level up your React skills with advanced patterns and best practices',
    description: 'Deep dive into React hooks, context, suspense, server components, and advanced state management patterns used in production applications.',
    category: 'Web Development', tags: ['react', 'frontend', 'advanced'], language: 'English',
    audience: 'Intermediate React developers', estimatedDuration: 3600, instructors: ['u-004'],
    status: 'published', visibility: 'public', version: 2, completionPolicy: 'Complete all modules and submit capstone project',
    modules: [
      { id: 'mod-004', title: 'Advanced Hooks', description: 'Custom hooks and patterns', order: 1, lessons: makeLessons('mod-004', ['useReducer Deep Dive', 'Custom Hook Patterns', 'useRef and Forwarding Refs', 'useMemo vs useCallback']) },
      { id: 'mod-005', title: 'State Management', description: 'Beyond useState', order: 2, lessons: makeLessons('mod-005', ['Context API Patterns', 'Zustand Introduction', 'Server State with TanStack Query', 'Optimistic Updates']) },
      { id: 'mod-006', title: 'Performance', description: 'React performance optimization', order: 3, lessons: makeLessons('mod-006', ['React DevTools Profiler', 'Code Splitting', 'Virtualization', 'Suspense and Lazy Loading']) },
    ],
    learnerCount: 156, completionRate: 62, createdBy: 'u-004', createdAt: '2026-05-15T00:00:00Z', updatedAt: '2026-10-12T00:00:00Z',
  },
  {
    id: 'crs-003', title: 'Python for Data Science', shortDescription: 'Learn Python through the lens of data analysis and machine learning',
    description: 'Covers Python programming, NumPy, Pandas, Matplotlib, scikit-learn basics, and real-world data analysis projects.',
    category: 'Data Science', tags: ['python', 'data-science', 'ml'], language: 'English',
    audience: 'Aspiring data scientists', estimatedDuration: 4800, instructors: ['u-004'],
    status: 'published', visibility: 'public', version: 1, completionPolicy: 'Complete 80% of lessons and pass 3 quizzes',
    modules: [
      { id: 'mod-007', title: 'Python Basics', description: 'Core Python for data work', order: 1, lessons: makeLessons('mod-007', ['Python Setup and Jupyter', 'Variables and Types', 'Lists and Dictionaries', 'Functions and Modules']) },
      { id: 'mod-008', title: 'Data Analysis', description: 'NumPy and Pandas', order: 2, lessons: makeLessons('mod-008', ['NumPy Arrays', 'Pandas DataFrames', 'Data Cleaning', 'Exploratory Analysis']) },
    ],
    learnerCount: 89, completionRate: 45, createdBy: 'u-004', createdAt: '2026-07-01T00:00:00Z', updatedAt: '2026-10-08T00:00:00Z',
  },
  {
    id: 'crs-004', title: 'TypeScript Mastery', shortDescription: 'Type-safe JavaScript for scalable applications',
    description: 'From TypeScript basics to advanced generics, conditional types, and integration with React. Build type-safe APIs and components.',
    category: 'Web Development', tags: ['typescript', 'frontend', 'intermediate'], language: 'English',
    audience: 'JavaScript developers transitioning to TypeScript', estimatedDuration: 1800, instructors: ['u-004'],
    status: 'published', visibility: 'public', version: 1, completionPolicy: 'Complete all modules',
    modules: [
      { id: 'mod-009', title: 'TypeScript Fundamentals', description: 'Core types and features', order: 1, lessons: makeLessons('mod-009', ['Types and Interfaces', 'Enums and Unions', 'Generics', 'Utility Types']) },
    ],
    learnerCount: 204, completionRate: 71, createdBy: 'u-004', createdAt: '2026-04-15T00:00:00Z', updatedAt: '2026-10-05T00:00:00Z',
  },
  {
    id: 'crs-005', title: 'Leadership and Communication', shortDescription: 'Essential leadership skills for tech managers',
    description: 'Develop leadership presence, communication skills, conflict resolution, and team management strategies for technology leaders.',
    category: 'Leadership', tags: ['leadership', 'management', 'soft-skills'], language: 'English',
    audience: 'Tech leads and aspiring managers', estimatedDuration: 1200, instructors: ['u-004'],
    status: 'draft', visibility: 'private', version: 1, completionPolicy: 'Attend all sessions and submit reflection',
    modules: [
      { id: 'mod-010', title: 'Leadership Foundations', description: 'Core leadership principles', order: 1, lessons: makeLessons('mod-010', ['Leadership Styles', 'Emotional Intelligence', 'Giving Feedback']) },
    ],
    learnerCount: 0, completionRate: 0, createdBy: 'u-004', createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-14T00:00:00Z',
  },
  {
    id: 'crs-006', title: 'Cloud Architecture with AWS', shortDescription: 'Design and deploy scalable cloud solutions',
    description: 'Learn AWS services, architectural patterns, cost optimization, and security best practices for building production cloud infrastructure.',
    category: 'Cloud Computing', tags: ['aws', 'cloud', 'devops', 'advanced'], language: 'English',
    audience: 'Backend developers and DevOps engineers', estimatedDuration: 3000, instructors: ['u-004'],
    status: 'in_review', visibility: 'restricted', version: 1, completionPolicy: 'Pass all labs and final exam',
    modules: [
      { id: 'mod-011', title: 'AWS Fundamentals', description: 'Core AWS services', order: 1, lessons: makeLessons('mod-011', ['IAM and Security', 'EC2 and VPC', 'S3 and Storage', 'RDS and DynamoDB']) },
    ],
    learnerCount: 0, completionRate: 0, createdBy: 'u-004', createdAt: '2026-09-15T00:00:00Z', updatedAt: '2026-10-13T00:00:00Z',
  },
];

// --- Enrollments ---
export const mockEnrollments: Enrollment[] = [
  { id: 'enr-001', userId: 'u-007', courseId: 'crs-001', status: 'active', progress: 65, enrolledAt: '2026-09-01T00:00:00Z', dueDate: '2026-12-31' },
  { id: 'enr-002', userId: 'u-007', courseId: 'crs-002', status: 'active', progress: 30, enrolledAt: '2026-10-01T00:00:00Z', dueDate: '2026-11-30' },
  { id: 'enr-003', userId: 'u-007', courseId: 'crs-004', status: 'completed', progress: 100, enrolledAt: '2026-06-01T00:00:00Z', completedAt: '2026-08-15T00:00:00Z' },
  { id: 'enr-004', userId: 'u-009', courseId: 'crs-001', status: 'active', progress: 42, enrolledAt: '2026-09-15T00:00:00Z', dueDate: '2026-12-31' },
  { id: 'enr-005', userId: 'u-010', courseId: 'crs-002', status: 'active', progress: 18, enrolledAt: '2026-10-05T00:00:00Z', dueDate: '2026-12-15' },
  { id: 'enr-006', userId: 'u-009', courseId: 'crs-003', status: 'active', progress: 10, enrolledAt: '2026-10-10T00:00:00Z', dueDate: '2027-01-31' },
  { id: 'enr-007', userId: 'u-010', courseId: 'crs-001', status: 'completed', progress: 100, enrolledAt: '2026-07-01T00:00:00Z', completedAt: '2026-09-20T00:00:00Z' },
];

// --- Learning Paths ---
export const mockLearningPaths: LearningPath[] = [
  {
    id: 'lp-001', title: 'Full-Stack Web Developer', objective: 'Become a proficient full-stack developer with modern JavaScript, React, and cloud skills',
    audience: 'Career changers and junior developers', courses: [
      { courseId: 'crs-001', order: 1, isRequired: true, prerequisiteCourseIds: [] },
      { courseId: 'crs-004', order: 2, isRequired: true, prerequisiteCourseIds: ['crs-001'] },
      { courseId: 'crs-002', order: 3, isRequired: true, prerequisiteCourseIds: ['crs-004'] },
      { courseId: 'crs-006', order: 4, isRequired: false, prerequisiteCourseIds: ['crs-001'] },
    ],
    prerequisites: [], completionThreshold: 75, dueDate: '2027-06-30', reEnrollmentPolicy: 'Allowed after 30 days',
    status: 'published', learnerCount: 84, createdAt: '2026-06-01T00:00:00Z', updatedAt: '2026-10-12T00:00:00Z',
  },
  {
    id: 'lp-002', title: 'Data Science Essentials', objective: 'Build foundational data science and analytics skills',
    audience: 'Analysts and aspiring data scientists', courses: [
      { courseId: 'crs-003', order: 1, isRequired: true, prerequisiteCourseIds: [] },
    ],
    prerequisites: [], completionThreshold: 80, reEnrollmentPolicy: 'Not allowed',
    status: 'published', learnerCount: 45, createdAt: '2026-07-15T00:00:00Z', updatedAt: '2026-10-08T00:00:00Z',
  },
];

// --- Live Sessions ---
export const mockLiveSessions: LiveSession[] = [
  {
    id: 'ls-001', title: 'Advanced TypeScript Patterns Workshop', courseId: 'crs-004', cohortId: 'coh-002',
    instructorId: 'u-004', instructorName: 'Dr. James Wilson', date: '2026-10-17', startTime: '10:00',
    endTime: '11:30', duration: 90, timezone: 'America/New_York', capacity: 30, enrolledCount: 22,
    provider: 'Zoom (Demo)', joinLink: '#demo-join', recordingPolicy: 'Allowed with consent',
    agenda: 'Advanced generics, conditional types, and template literal types', materials: ['TypeScript Handbook', 'Exercise Files'],
    status: 'scheduled', attendance: [], createdAt: '2026-10-10T00:00:00Z', updatedAt: '2026-10-15T00:00:00Z',
  },
  {
    id: 'ls-002', title: 'React Server Components Deep Dive', courseId: 'crs-002', cohortId: 'coh-002',
    instructorId: 'u-004', instructorName: 'Dr. James Wilson', date: '2026-10-18', startTime: '14:00',
    endTime: '15:30', duration: 90, timezone: 'America/New_York', capacity: 30, enrolledCount: 18,
    provider: 'Zoom (Demo)', joinLink: '#demo-join', recordingPolicy: 'Not recorded',
    agenda: 'Server components, streaming, and data fetching patterns', materials: ['React 19 Docs'],
    status: 'scheduled', attendance: [], createdAt: '2026-10-10T00:00:00Z', updatedAt: '2026-10-14T00:00:00Z',
  },
  {
    id: 'ls-003', title: 'JavaScript Q&A Session', courseId: 'crs-001', cohortId: 'coh-001',
    instructorId: 'u-004', instructorName: 'Dr. James Wilson', date: '2026-10-15', startTime: '09:00',
    endTime: '10:00', duration: 60, timezone: 'America/New_York', capacity: 35, enrolledCount: 28,
    provider: 'Zoom (Demo)', recordingLink: '#demo-recording', recordingPolicy: 'Available for 30 days',
    status: 'ended', attendance: [
      { userId: 'u-007', userName: 'Alex Thompson', status: 'present', joinedAt: '2026-10-15T09:02:00Z', leftAt: '2026-10-15T10:00:00Z' },
      { userId: 'u-009', userName: 'Maria Garcia', status: 'late', joinedAt: '2026-10-15T09:15:00Z', leftAt: '2026-10-15T10:00:00Z' },
      { userId: 'u-010', userName: 'David Kim', status: 'absent' },
    ], createdAt: '2026-10-08T00:00:00Z', updatedAt: '2026-10-15T10:05:00Z',
  },
  {
    id: 'ls-004', title: 'Python Data Visualization', courseId: 'crs-003',
    instructorId: 'u-004', instructorName: 'Dr. James Wilson', date: '2026-10-20', startTime: '11:00',
    endTime: '12:30', duration: 90, timezone: 'America/New_York', capacity: 40, enrolledCount: 12,
    provider: 'Google Meet (Demo)', recordingPolicy: 'Allowed with consent',
    agenda: 'Matplotlib, Seaborn, and Plotly for data visualization', materials: ['Jupyter Notebooks', 'Sample Datasets'],
    status: 'scheduled', attendance: [], createdAt: '2026-10-12T00:00:00Z', updatedAt: '2026-10-14T00:00:00Z',
  },
];

// --- Question Banks ---
export const mockQuestionBanks: QuestionBank[] = [
  { id: 'qb-001', name: 'JavaScript Basics', owner: 'Emily Rodriguez', subject: 'JavaScript', tags: ['variables', 'functions', 'loops'], questionCount: 45, version: 3, status: 'published', scope: 'organization', createdAt: '2026-04-01T00:00:00Z', updatedAt: '2026-10-10T00:00:00Z' },
  { id: 'qb-002', name: 'React Advanced Concepts', owner: 'Emily Rodriguez', subject: 'React', tags: ['hooks', 'state', 'performance'], questionCount: 32, version: 2, status: 'published', scope: 'organization', createdAt: '2026-06-15T00:00:00Z', updatedAt: '2026-10-08T00:00:00Z' },
  { id: 'qb-003', name: 'Python Data Analysis', owner: 'Emily Rodriguez', subject: 'Python', tags: ['numpy', 'pandas', 'visualization'], questionCount: 28, version: 1, status: 'draft', scope: 'organization', createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-10-14T00:00:00Z' },
  { id: 'qb-004', name: 'TypeScript Type System', owner: 'Emily Rodriguez', subject: 'TypeScript', tags: ['types', 'generics', 'utility-types'], questionCount: 20, version: 1, status: 'in_review', scope: 'organization', createdAt: '2026-08-15T00:00:00Z', updatedAt: '2026-10-12T00:00:00Z' },
];

// --- Questions ---
export const mockQuestions: Question[] = [
  { id: 'q-001', bankId: 'qb-001', type: 'single_choice', prompt: 'What is the correct way to declare a constant in JavaScript?', options: [{ id: 'o1', text: 'var x = 5', isCorrect: false, order: 1 }, { id: 'o2', text: 'let x = 5', isCorrect: false, order: 2 }, { id: 'o3', text: 'const x = 5', isCorrect: true, order: 3 }, { id: 'o4', text: 'constant x = 5', isCorrect: false, order: 4 }], explanation: 'The const keyword is used to declare constants in JavaScript.', points: 5, tags: ['variables'], difficulty: 'easy', version: 1, status: 'published', createdAt: '2026-04-01T00:00:00Z', updatedAt: '2026-04-01T00:00:00Z' },
  { id: 'q-002', bankId: 'qb-001', type: 'multiple_choice', prompt: 'Which of the following are valid JavaScript data types? (Select all that apply)', options: [{ id: 'o5', text: 'String', isCorrect: true, order: 1 }, { id: 'o6', text: 'Number', isCorrect: true, order: 2 }, { id: 'o7', text: 'Float', isCorrect: false, order: 3 }, { id: 'o8', text: 'Boolean', isCorrect: true, order: 4 }, { id: 'o9', text: 'Character', isCorrect: false, order: 5 }], explanation: 'JavaScript has String, Number, Boolean, null, undefined, Symbol, and BigInt.', points: 10, tags: ['data-types'], difficulty: 'easy', version: 1, status: 'published', createdAt: '2026-04-01T00:00:00Z', updatedAt: '2026-04-01T00:00:00Z' },
  { id: 'q-003', bankId: 'qb-001', type: 'true_false', prompt: 'JavaScript is a statically typed language.', correctAnswer: 'false', explanation: 'JavaScript is dynamically typed.', points: 5, tags: ['fundamentals'], difficulty: 'easy', version: 1, status: 'published', createdAt: '2026-04-01T00:00:00Z', updatedAt: '2026-04-01T00:00:00Z' },
  { id: 'q-004', bankId: 'qb-001', type: 'short_answer', prompt: 'What keyword is used to create a class in JavaScript?', correctAnswer: 'class', explanation: 'The class keyword was introduced in ES6.', points: 5, tags: ['classes'], difficulty: 'medium', version: 1, status: 'published', createdAt: '2026-04-01T00:00:00Z', updatedAt: '2026-04-01T00:00:00Z' },
  { id: 'q-005', bankId: 'qb-001', type: 'essay', prompt: 'Explain the difference between var, let, and const in JavaScript. Include examples of when you would use each.', points: 20, tags: ['variables', 'scope'], difficulty: 'medium', version: 1, status: 'published', createdAt: '2026-04-01T00:00:00Z', updatedAt: '2026-04-01T00:00:00Z' },
  { id: 'q-006', bankId: 'qb-002', type: 'single_choice', prompt: 'Which hook is used to manage side effects in React?', options: [{ id: 'o10', text: 'useState', isCorrect: false, order: 1 }, { id: 'o11', text: 'useEffect', isCorrect: true, order: 2 }, { id: 'o12', text: 'useContext', isCorrect: false, order: 3 }, { id: 'o13', text: 'useReducer', isCorrect: false, order: 4 }], explanation: 'useEffect is designed for side effects like API calls and subscriptions.', points: 5, tags: ['hooks'], difficulty: 'easy', version: 1, status: 'published', createdAt: '2026-06-15T00:00:00Z', updatedAt: '2026-06-15T00:00:00Z' },
];

// --- Assessments ---
export const mockAssessments: Assessment[] = [
  { id: 'asm-001', title: 'JavaScript Fundamentals Quiz', instructions: 'Answer all questions. You have 45 minutes. Open book is not allowed.', courseId: 'crs-001', questions: ['q-001', 'q-002', 'q-003', 'q-004'], totalMarks: 25, duration: 45, attempts: 2, randomize: true, passmark: 60, availabilityStart: '2026-10-15T00:00:00Z', availabilityEnd: '2026-10-31T23:59:59Z', feedbackVisibility: 'after_window', resultReleasePolicy: 'after_window', mode: 'automated', proctoringRequired: false, version: 1, status: 'published', accommodations: [], createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-10-14T00:00:00Z' },
  { id: 'asm-002', title: 'Advanced React Capstone', instructions: 'Build a React application following the specifications. Submit your code and a written explanation of your architecture decisions.', courseId: 'crs-002', questions: ['q-005', 'q-006'], totalMarks: 100, duration: 180, attempts: 1, randomize: false, passmark: 70, feedbackVisibility: 'manual', resultReleasePolicy: 'manual', mode: 'human', proctoringRequired: false, version: 1, status: 'published', accommodations: [{ id: 'acc-001', learnerId: 'u-007', type: 'extra_time', value: '30 minutes additional', approvedBy: 'u-003', approvedAt: '2026-10-10T00:00:00Z' }], rubricId: 'rub-001', createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-13T00:00:00Z' },
  { id: 'asm-003', title: 'Python Data Analysis Midterm', instructions: 'Complete the data analysis tasks using Python. Show all work.', courseId: 'crs-003', questions: [], totalMarks: 50, duration: 90, attempts: 1, randomize: false, passmark: 50, feedbackVisibility: 'immediate', resultReleasePolicy: 'immediate', mode: 'ai_assisted', proctoringRequired: true, version: 1, status: 'scheduled', accommodations: [], createdAt: '2026-10-05T00:00:00Z', updatedAt: '2026-10-12T00:00:00Z' },
  { id: 'asm-004', title: 'TypeScript Type Challenges', instructions: 'Solve the type challenges. Each challenge tests a different TypeScript concept.', courseId: 'crs-004', questions: [], totalMarks: 40, duration: 60, attempts: 3, randomize: true, passmark: 75, feedbackVisibility: 'immediate', resultReleasePolicy: 'immediate', mode: 'automated', proctoringRequired: false, version: 2, status: 'published', accommodations: [], createdAt: '2026-08-01T00:00:00Z', updatedAt: '2026-10-10T00:00:00Z' },
];

// --- Assessment Attempts ---
export const mockAttempts: AssessmentAttempt[] = [
  { id: 'att-001', assessmentId: 'asm-001', learnerId: 'u-007', learnerName: 'Alex Thompson', status: 'graded', startedAt: '2026-10-16T09:00:00Z', submittedAt: '2026-10-16T09:35:00Z', answers: [{ questionId: 'q-001', answer: 'const x = 5', isCorrect: true, points: 5, flagged: false }, { questionId: 'q-002', answer: 'String,Number,Boolean', isCorrect: true, points: 10, flagged: false }, { questionId: 'q-003', answer: 'false', isCorrect: true, points: 5, flagged: false }, { questionId: 'q-004', answer: 'class', isCorrect: true, points: 5, flagged: false }], score: 25, totalMarks: 25, passed: true, feedback: 'Excellent work! Perfect score.', timeSpent: 35 },
  { id: 'att-002', assessmentId: 'asm-002', learnerId: 'u-007', learnerName: 'Alex Thompson', status: 'submitted', startedAt: '2026-10-15T14:00:00Z', submittedAt: '2026-10-15T16:45:00Z', answers: [{ questionId: 'q-005', answer: 'var has function scope, let has block scope, const is block-scoped and cannot be reassigned...', flagged: false }, { questionId: 'q-006', answer: 'useEffect', isCorrect: true, points: 5, flagged: false }], totalMarks: 100, timeSpent: 165 },
  { id: 'att-003', assessmentId: 'asm-001', learnerId: 'u-009', learnerName: 'Maria Garcia', status: 'results_released', startedAt: '2026-10-16T10:00:00Z', submittedAt: '2026-10-16T10:40:00Z', answers: [{ questionId: 'q-001', answer: 'const x = 5', isCorrect: true, points: 5, flagged: false }, { questionId: 'q-002', answer: 'String,Number', isCorrect: false, points: 5, flagged: true }, { questionId: 'q-003', answer: 'true', isCorrect: false, points: 0, flagged: false }, { questionId: 'q-004', answer: 'class', isCorrect: true, points: 5, flagged: false }], score: 15, totalMarks: 25, passed: true, feedback: 'Good attempt. Review data types and type system.', timeSpent: 40, gradedBy: 'u-006', gradedAt: '2026-10-16T11:30:00Z' },
];

// --- Rubrics ---
export const mockRubrics: Rubric[] = [
  {
    id: 'rub-001', name: 'React Capstone Rubric', criteria: [
      { id: 'rc-1', name: 'Code Quality', description: 'Clean, readable, well-structured code', weight: 30, levels: [{ id: 'rl-1', label: 'Excellent', description: 'Exceptionally clean with consistent patterns', points: 30 }, { id: 'rl-2', label: 'Good', description: 'Clean with minor issues', points: 22 }, { id: 'rl-3', label: 'Satisfactory', description: 'Functional but needs improvement', points: 15 }, { id: 'rl-4', label: 'Needs Work', description: 'Significant issues', points: 8 }] },
      { id: 'rc-2', name: 'Architecture', description: 'Component design and state management', weight: 25, levels: [{ id: 'rl-5', label: 'Excellent', description: 'Well-designed component hierarchy', points: 25 }, { id: 'rl-6', label: 'Good', description: 'Reasonable architecture', points: 18 }, { id: 'rl-7', label: 'Satisfactory', description: 'Basic structure', points: 12 }, { id: 'rl-8', label: 'Needs Work', description: 'Poor structure', points: 5 }] },
      { id: 'rc-3', name: 'Functionality', description: 'Features work as specified', weight: 25, levels: [{ id: 'rl-9', label: 'Excellent', description: 'All features work perfectly', points: 25 }, { id: 'rl-10', label: 'Good', description: 'Most features work', points: 18 }, { id: 'rl-11', label: 'Satisfactory', description: 'Core features work', points: 12 }, { id: 'rl-12', label: 'Needs Work', description: 'Many features missing', points: 5 }] },
      { id: 'rc-4', name: 'Documentation', description: 'Code comments and README', weight: 20, levels: [{ id: 'rl-13', label: 'Excellent', description: 'Comprehensive docs', points: 20 }, { id: 'rl-14', label: 'Good', description: 'Good docs', points: 15 }, { id: 'rl-15', label: 'Satisfactory', description: 'Basic docs', points: 10 }, { id: 'rl-16', label: 'Needs Work', description: 'Missing docs', points: 3 }] },
    ], totalPoints: 100, version: 1, createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z',
  },
];

// --- Grading Tasks ---
export const mockGradingTasks: GradingTask[] = [
  { id: 'gt-001', attemptId: 'att-002', assessmentId: 'asm-002', assessmentTitle: 'Advanced React Capstone', learnerId: 'u-007', learnerName: 'Alex Thompson', graderId: 'u-006', graderName: 'Aisha Patel', status: 'assigned', dueDate: '2026-10-20', priority: 'high', isDoubleMarking: false, markingStage: 'first', totalMarks: 100, createdAt: '2026-10-15T17:00:00Z', updatedAt: '2026-10-15T17:00:00Z' },
  { id: 'gt-002', attemptId: 'att-003', assessmentId: 'asm-001', assessmentTitle: 'JavaScript Fundamentals Quiz', learnerId: 'u-009', learnerName: 'Maria Garcia', graderId: 'u-006', graderName: 'Aisha Patel', status: 'completed', dueDate: '2026-10-18', priority: 'medium', isDoubleMarking: false, markingStage: 'first', score: 15, totalMarks: 25, feedback: 'Good attempt. Review data types.', createdAt: '2026-10-16T11:00:00Z', updatedAt: '2026-10-16T11:30:00Z' },
  { id: 'gt-003', attemptId: 'att-002', assessmentId: 'asm-002', assessmentTitle: 'Advanced React Capstone', learnerId: 'u-007', learnerName: 'Alex Thompson', status: 'unassigned', dueDate: '2026-10-22', priority: 'medium', isDoubleMarking: true, markingStage: 'second', totalMarks: 100, createdAt: '2026-10-15T17:00:00Z', updatedAt: '2026-10-15T17:00:00Z' },
  { id: 'gt-004', attemptId: 'att-003', assessmentId: 'asm-001', assessmentTitle: 'JavaScript Fundamentals Quiz', learnerId: 'u-010', learnerName: 'David Kim', status: 'unassigned', dueDate: '2026-10-19', priority: 'low', isDoubleMarking: false, markingStage: 'first', totalMarks: 25, createdAt: '2026-10-16T12:00:00Z', updatedAt: '2026-10-16T12:00:00Z', aiSuggestion: { id: 'ai-001', score: 18, confidence: 0.85, evidence: ['Correct answer for Q1', 'Partial credit for Q2'], rubricScores: {}, feedback: 'Good understanding of basics. Some gaps in data types.', model: 'LMS-Grader-v2', version: '2.1.0', generatedAt: '2026-10-16T12:05:00Z', status: 'suggestion_ready' } },
];

// --- Proctoring Incidents ---
export const mockProctoringIncidents: ProctoringIncident[] = [
  { id: 'pi-001', attemptId: 'att-003', learnerId: 'u-009', learnerName: 'Maria Garcia', assessmentId: 'asm-001', assessmentTitle: 'JavaScript Fundamentals Quiz', eventType: 'Tab Switch', severity: 'medium', description: 'Learner switched browser tabs during the exam (2 occurrences)', timestamp: '2026-10-16T10:15:00Z', status: 'new', evidence: ['Tab switch at 10:15:23', 'Tab switch at 10:22:45'] },
  { id: 'pi-002', attemptId: 'att-003', learnerId: 'u-009', learnerName: 'Maria Garcia', assessmentId: 'asm-001', assessmentTitle: 'JavaScript Fundamentals Quiz', eventType: 'Fullscreen Exit', severity: 'low', description: 'Learner exited fullscreen mode briefly', timestamp: '2026-10-16T10:20:00Z', status: 'cleared', reviewerId: 'u-006', reviewerNotes: 'Accidental exit, returned immediately', decision: 'No issue' },
  { id: 'pi-003', attemptId: 'att-002', learnerId: 'u-007', learnerName: 'Alex Thompson', assessmentId: 'asm-002', assessmentTitle: 'Advanced React Capstone', eventType: 'Network Interruption', severity: 'low', description: 'Brief network interruption detected', timestamp: '2026-10-15T15:30:00Z', status: 'cleared', reviewerId: 'u-006', reviewerNotes: 'Network glitch, exam continued normally', decision: 'No issue' },
];

// --- Certificates ---
export const mockCertificates: Certificate[] = [
  { id: 'cert-001', learnerId: 'u-007', learnerName: 'Alex Thompson', courseId: 'crs-004', courseName: 'TypeScript Mastery', issueDate: '2026-08-15', status: 'active', verificationUrl: '#verify/cert-001', templateId: 'tpl-001' },
  { id: 'cert-002', learnerId: 'u-010', learnerName: 'David Kim', courseId: 'crs-001', courseName: 'JavaScript Fundamentals', issueDate: '2026-09-20', status: 'active', verificationUrl: '#verify/cert-002', templateId: 'tpl-001' },
  { id: 'cert-003', learnerId: 'u-009', learnerName: 'Maria Garcia', courseId: 'crs-004', courseName: 'TypeScript Mastery', issueDate: '2026-07-01', expiryDate: '2027-07-01', status: 'active', verificationUrl: '#verify/cert-003', templateId: 'tpl-001' },
];

// --- Integrations ---
export const mockIntegrations: Integration[] = [
  { id: 'int-001', name: 'Zoom', type: 'video', status: 'not_configured', provider: 'Zoom', owner: 'Platform Admin', documentationUrl: '#docs/zoom', healthState: 'Not connected', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-10-15T00:00:00Z' },
  { id: 'int-002', name: 'Okta SSO', type: 'identity_sso', status: 'not_configured', provider: 'Okta', owner: 'Platform Admin', documentationUrl: '#docs/okta', healthState: 'Not connected', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-10-15T00:00:00Z' },
  { id: 'int-003', name: 'SendGrid', type: 'email_sms', status: 'not_configured', provider: 'SendGrid', owner: 'Platform Admin', documentationUrl: '#docs/sendgrid', healthState: 'Not connected', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-10-15T00:00:00Z' },
  { id: 'int-004', name: 'OpenAI GPT-4', type: 'ai', status: 'not_configured', provider: 'OpenAI', owner: 'Platform Admin', documentationUrl: '#docs/openai', healthState: 'Not connected', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-10-15T00:00:00Z' },
  { id: 'int-005', name: 'AWS S3', type: 'storage', status: 'not_configured', provider: 'AWS', owner: 'Platform Admin', documentationUrl: '#docs/s3', healthState: 'Not connected', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-10-15T00:00:00Z' },
  { id: 'int-006', name: 'Webhooks', type: 'webhook', status: 'not_configured', provider: 'Custom', owner: 'Platform Admin', documentationUrl: '#docs/webhooks', healthState: 'Not connected', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-10-15T00:00:00Z' },
];

// --- Audit Entries ---
export const mockAuditEntries: AuditEntry[] = [
  { id: 'ae-001', actor: 'u-001', actorName: 'Sarah Chen', action: 'create', resource: 'organization', resourceId: 'org-001', timestamp: '2026-01-01T00:00:00Z', changeSummary: 'Created organization Acme Learning Corp', outcome: 'success' },
  { id: 'ae-002', actor: 'u-002', actorName: 'Marcus Johnson', action: 'invite', resource: 'user', resourceId: 'u-004', timestamp: '2026-04-01T00:00:00Z', changeSummary: 'Invited James Wilson as Instructor', outcome: 'success' },
  { id: 'ae-003', actor: 'u-004', actorName: 'Dr. James Wilson', action: 'publish', resource: 'course', resourceId: 'crs-001', timestamp: '2026-03-15T00:00:00Z', changeSummary: 'Published JavaScript Fundamentals v3', outcome: 'success' },
  { id: 'ae-004', actor: 'u-003', actorName: 'Priya Sharma', action: 'enroll', resource: 'user', resourceId: 'u-007', timestamp: '2026-09-01T00:00:00Z', changeSummary: 'Enrolled Alex Thompson in JavaScript Fundamentals', outcome: 'success' },
  { id: 'ae-005', actor: 'u-006', actorName: 'Aisha Patel', action: 'grade', resource: 'submission', resourceId: 'att-003', timestamp: '2026-10-16T11:30:00Z', changeSummary: 'Graded Maria Garcia\'s JavaScript Quiz: 15/25', outcome: 'success' },
  { id: 'ae-006', actor: 'u-001', actorName: 'Sarah Chen', action: 'edit', resource: 'role', resourceId: 'role-instructor', timestamp: '2026-10-14T09:00:00Z', changeSummary: 'Updated Instructor role permissions: added live_sessions.create', reason: 'Instructors need to schedule their own sessions', outcome: 'success', before: { permissions: ['courses.view', 'courses.edit'] }, after: { permissions: ['courses.view', 'courses.edit', 'live_sessions.create'] } },
];

// --- Reports ---
export const mockReports: Report[] = [
  { id: 'rpt-001', name: 'Course Completion Summary', type: 'completion', description: 'Overview of course completion rates across all active courses', filters: { organization: 'org-001' }, dateRange: { start: '2026-09-01', end: '2026-10-16' }, status: 'ready', generatedAt: '2026-10-16T08:00:00Z', dataAsOf: '2026-10-16T07:55:00Z' },
  { id: 'rpt-002', name: 'Learner Progress Report', type: 'progress', description: 'Detailed learner progress across enrolled courses and paths', filters: { organization: 'org-001', cohort: 'coh-001' }, dateRange: { start: '2026-10-01', end: '2026-10-16' }, status: 'ready', generatedAt: '2026-10-16T08:00:00Z', dataAsOf: '2026-10-16T07:55:00Z' },
  { id: 'rpt-003', name: 'Assessment Performance', type: 'assessment', description: 'Assessment scores, pass rates, and grading turnaround', filters: { organization: 'org-001' }, dateRange: { start: '2026-09-01', end: '2026-10-16' }, status: 'ready', generatedAt: '2026-10-16T08:00:00Z', dataAsOf: '2026-10-16T07:55:00Z' },
  { id: 'rpt-004', name: 'Attendance Report', type: 'attendance', description: 'Live session attendance rates and patterns', filters: { organization: 'org-001' }, dateRange: { start: '2026-09-01', end: '2026-10-16' }, status: 'ready', generatedAt: '2026-10-16T08:00:00Z', dataAsOf: '2026-10-16T07:55:00Z' },
  { id: 'rpt-005', name: 'Certificate Issuance', type: 'certificates', description: 'Certificates issued, active, expired, and revoked', filters: { organization: 'org-001' }, dateRange: { start: '2026-01-01', end: '2026-10-16' }, status: 'ready', generatedAt: '2026-10-16T08:00:00Z', dataAsOf: '2026-10-16T07:55:00Z' },
];

// --- Notification Templates ---
export const mockNotificationTemplates: NotificationTemplate[] = [
  { id: 'nt-001', name: 'Welcome Email', eventTrigger: 'user.invited', channel: 'email', language: 'en', subject: 'Welcome to {{organization.name}}!', body: 'Hi {{user.firstName}},\n\nYou\'ve been invited to join {{organization.name}} on our learning platform.\n\nClick here to accept: {{invitation.link}}\n\nThis invitation expires on {{invitation.expiryDate}}.', variables: ['user.firstName', 'organization.name', 'invitation.link', 'invitation.expiryDate'], version: 2, enabled: true, createdAt: '2026-01-15T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z' },
  { id: 'nt-002', name: 'Assessment Reminder', eventTrigger: 'assessment.due_soon', channel: 'in_app', language: 'en', subject: 'Assessment Due Soon', body: '{{assessment.title}} is due on {{assessment.dueDate}}. You have {{assessment.attemptsRemaining}} attempt(s) remaining.', variables: ['assessment.title', 'assessment.dueDate', 'assessment.attemptsRemaining'], version: 1, enabled: true, createdAt: '2026-03-01T00:00:00Z', updatedAt: '2026-09-15T00:00:00Z' },
  { id: 'nt-003', name: 'Live Class Starting', eventTrigger: 'live_session.starting_soon', channel: 'in_app', language: 'en', subject: 'Live Class Starting in {{minutes}} minutes', body: '{{session.title}} with {{session.instructor}} starts at {{session.startTime}} {{session.timezone}}.', variables: ['session.title', 'session.instructor', 'session.startTime', 'session.timezone', 'minutes'], version: 1, enabled: true, createdAt: '2026-03-01T00:00:00Z', updatedAt: '2026-09-15T00:00:00Z' },
  { id: 'nt-004', name: 'Results Released', eventTrigger: 'assessment.results_released', channel: 'email', language: 'en', subject: 'Your results for {{assessment.title}} are available', body: 'Hi {{user.firstName}},\n\nYour results for {{assessment.title}} have been released.\n\nView your results: {{results.link}}', variables: ['user.firstName', 'assessment.title', 'results.link'], version: 1, enabled: true, createdAt: '2026-05-01T00:00:00Z', updatedAt: '2026-09-15T00:00:00Z' },
];

// --- Roles (for admin management) ---
export const mockRoles: Role[] = [
  { id: 'role-pa', name: 'platform_admin', displayName: 'Platform Super Admin', description: 'Full platform access with global scope. MFA mandatory.', isTemplate: true, isCustom: false, permissions: [], memberCount: 1, scope: 'global', status: 'active', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-10-14T00:00:00Z' },
  { id: 'role-oa', name: 'org_admin', displayName: 'Organization Admin', description: 'Manage organization users, cohorts, enrollments, and settings.', isTemplate: true, isCustom: false, permissions: [], memberCount: 2, scope: 'organization', status: 'active', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-10-14T00:00:00Z' },
  { id: 'role-la', name: 'lms_admin', displayName: 'LMS Admin', description: 'Manage courses, paths, assessments, and reports within scope.', isTemplate: true, isCustom: false, permissions: [], memberCount: 3, scope: 'organization', status: 'active', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-10-14T00:00:00Z' },
  { id: 'role-in', name: 'instructor', displayName: 'Instructor / Trainer', description: 'Build courses, schedule live classes, and track learner progress.', isTemplate: true, isCustom: false, permissions: [], memberCount: 8, scope: 'assigned', status: 'active', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-10-14T00:00:00Z' },
  { id: 'role-aa', name: 'assessment_author', displayName: 'Assessment Author', description: 'Create questions, rubrics, and assessments.', isTemplate: true, isCustom: false, permissions: [], memberCount: 4, scope: 'assigned', status: 'active', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-10-14T00:00:00Z' },
  { id: 'role-gr', name: 'grader', displayName: 'Human Grader / Reviewer', description: 'Grade submissions and review proctoring flags.', isTemplate: true, isCustom: false, permissions: [], memberCount: 6, scope: 'assigned', status: 'active', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-10-14T00:00:00Z' },
  { id: 'role-le', name: 'learner', displayName: 'Learner / Student', description: 'Access enrolled courses, take assessments, and view own results.', isTemplate: true, isCustom: false, permissions: [], memberCount: 1200, scope: 'own', status: 'active', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-10-14T00:00:00Z' },
  { id: 'role-gu', name: 'guest', displayName: 'Guest / Auditor', description: 'Read-only access to approved resources.', isTemplate: true, isCustom: false, permissions: [], memberCount: 5, scope: 'assigned', status: 'active', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-10-14T00:00:00Z' },
  { id: 'role-custom-1', name: 'course_reviewer', displayName: 'Course Reviewer', description: 'Custom role for reviewing and approving course content.', isTemplate: false, isCustom: true, permissions: [], memberCount: 3, scope: 'organization', status: 'active', createdAt: '2026-06-01T00:00:00Z', updatedAt: '2026-10-10T00:00:00Z' },
];

// --- Gamification ---
export const mockGamificationProfile: GamificationProfile = {
  userId: 'u-007',
  totalPoints: 1450,
  level: 5,
  streak: 12,
  badges: [
    { id: 'b-001', name: 'Quick Learner', description: 'Completed first course within 2 weeks', icon: '🚀', earnedAt: '2026-07-15T00:00:00Z' },
    { id: 'b-002', name: 'Perfect Score', description: 'Scored 100% on an assessment', icon: '🏆', earnedAt: '2026-10-16T09:35:00Z' },
    { id: 'b-003', name: 'Consistent', description: 'Maintained a 7-day learning streak', icon: '🔥', earnedAt: '2026-10-10T00:00:00Z' },
    { id: 'b-004', name: 'Certified', description: 'Earned first certificate', icon: '📜', earnedAt: '2026-08-15T00:00:00Z' },
  ],
  pointsHistory: [
    { id: 'pe-001', activity: 'Complete a lesson', points: 10, earnedAt: '2026-10-16T08:30:00Z', source: 'JavaScript Fundamentals' },
    { id: 'pe-002', activity: 'Pass a quiz', points: 50, earnedAt: '2026-10-16T09:35:00Z', source: 'JS Fundamentals Quiz' },
    { id: 'pe-003', activity: 'Score 90%+', points: 75, earnedAt: '2026-10-16T09:35:00Z', source: 'JS Fundamentals Quiz' },
    { id: 'pe-004', activity: 'Complete a lesson', points: 10, earnedAt: '2026-10-15T14:00:00Z', source: 'Advanced React Patterns' },
    { id: 'pe-005', activity: 'Maintain 7-day streak', points: 100, earnedAt: '2026-10-10T00:00:00Z', source: 'System' },
    { id: 'pe-006', activity: 'Earn certificate', points: 150, earnedAt: '2026-08-15T00:00:00Z', source: 'TypeScript Mastery' },
    { id: 'pe-007', activity: 'Complete a course', points: 100, earnedAt: '2026-08-15T00:00:00Z', source: 'TypeScript Mastery' },
  ],
};

// --- Dashboard Metrics ---
export const adminDashboardMetrics: DashboardMetric[] = [
  { label: 'Active Learners', value: 892, change: 12.5, trend: 'up', description: 'Users who accessed the platform in the last 30 days', link: '/people' },
  { label: 'Active Enrollments', value: 2340, change: 8.3, trend: 'up', description: 'Currently active course enrollments', link: '/courses' },
  { label: 'Course Completions', value: 456, change: 15.2, trend: 'up', description: 'Courses completed this month', link: '/reports' },
  { label: 'Avg Completion Rate', value: '72%', change: 3.1, trend: 'up', description: 'Average completion rate across all courses' },
  { label: 'Live Sessions This Week', value: 12, change: -2, trend: 'down', description: 'Scheduled live sessions for current week', link: '/live-sessions' },
  { label: 'Assessments In Progress', value: 34, trend: 'stable', description: 'Currently active assessment attempts' },
  { label: 'Pending Approvals', value: 7, description: 'Items awaiting review and approval', link: '/courses' },
  { label: 'Grading Backlog', value: 18, change: -5, trend: 'down', description: 'Submissions awaiting grading', link: '/grading' },
];

export const learnerDashboardMetrics: DashboardMetric[] = [
  { label: 'Courses In Progress', value: 2, description: 'Active courses you are enrolled in', link: '/my-learning' },
  { label: 'Courses Completed', value: 1, description: 'Successfully completed courses' },
  { label: 'Total Points', value: 1450, description: 'Gamification points earned' },
  { label: 'Current Streak', value: '12 days', description: 'Consecutive days of learning' },
  { label: 'Certificates', value: 1, description: 'Active certificates earned', link: '/my-certificates' },
  { label: 'Assessments Due', value: 1, description: 'Upcoming assessment deadlines', link: '/my-assessments' },
];

export const mockAuditLog = mockAuditEntries;

