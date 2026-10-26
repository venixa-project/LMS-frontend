import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AssessmentAttempt, GradingTask, AISuggestion, StudentEvaluationStatus } from '../types';

export interface StudentAssessmentSummary {
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentRollNo: string;
  studentAvatar: string;
  department: string;
  courseIds: string[];
  courseTitles: string[];
  totalAssigned: number;
  completedCount: number;
  pendingCount: number;
  averageScore: number;
  latestScore: number;
  latestAssessmentDate: string;
  overallStatus: 'Passed' | 'Failed' | 'Pending Evaluation' | 'AI Review Required' | 'Awaiting Human Approval';
}

const initialAttempts: AssessmentAttempt[] = [
  // --- Alex Thompson (u-007) ---
  {
    id: 'att-001',
    assessmentId: 'asm-001',
    assessmentTitle: 'JavaScript Fundamentals Quiz',
    courseId: 'crs-001',
    courseTitle: 'JavaScript Mastery & Architecture',
    assessmentType: 'quiz',
    attemptNumber: 1,
    learnerId: 'u-007',
    learnerName: 'Alex Thompson',
    learnerRollNo: 'STU-2026-007',
    learnerEmail: 'student@lms.demo',
    learnerDepartment: 'Software Engineering',
    status: 'results_released',
    evaluationStatus: 'auto_graded',
    startedAt: '2026-10-16T09:00:00Z',
    submittedAt: '2026-10-16T09:35:00Z',
    score: 25,
    totalMarks: 25,
    percentage: 100,
    passed: true,
    feedback: 'Excellent work! Demonstrated full mastery of core JS syntax and runtime semantics.',
    evaluatedBy: 'Automated Grading Engine',
    evaluatedAt: '2026-10-16T09:35:05Z',
    timeSpent: 35,
    answers: [
      { questionId: 'q-001', answer: 'const x = 5', isCorrect: true, points: 5, maxPoints: 5, flagged: false, feedback: 'Correct declaration syntax.' },
      { questionId: 'q-002', answer: 'String,Number,Boolean', isCorrect: true, points: 10, maxPoints: 10, flagged: false, feedback: 'All primitives accurately selected.' },
      { questionId: 'q-003', answer: 'false', isCorrect: true, points: 5, maxPoints: 5, flagged: false, feedback: 'Correct. JS is dynamically typed.' },
      { questionId: 'q-004', answer: 'class', isCorrect: true, points: 5, maxPoints: 5, flagged: false, feedback: 'Accurate ES6 class keyword.' },
    ],
  },
  {
    id: 'att-002',
    assessmentId: 'asm-002',
    assessmentTitle: 'Advanced React Capstone',
    courseId: 'crs-002',
    courseTitle: 'React Deep Dive & Architecture',
    assessmentType: 'capstone',
    attemptNumber: 1,
    learnerId: 'u-007',
    learnerName: 'Alex Thompson',
    learnerRollNo: 'STU-2026-007',
    learnerEmail: 'student@lms.demo',
    learnerDepartment: 'Software Engineering',
    status: 'submitted',
    evaluationStatus: 'ai_review_required',
    startedAt: '2026-10-22T14:00:00Z',
    submittedAt: '2026-10-22T16:45:00Z',
    score: 88,
    totalMarks: 100,
    percentage: 88,
    passed: true,
    feedback: 'AI Recommendation: Exceptional system architecture with clean hook encapsulation. Minor deduct on edge error boundary fallback.',
    aiSuggestion: {
      id: 'ai-002',
      score: 88,
      confidence: 0.94,
      evidence: [
        'Used Custom hooks for centralized server state mutation',
        'Implemented memoized selector cache using useMemo/useCallback',
        'Clean folder layout following feature-sliced architecture',
      ],
      rubricScores: {
        'rc-1': 28, // Code Quality (out of 30)
        'rc-2': 23, // Architecture (out of 25)
        'rc-3': 22, // Functionality (out of 25)
        'rc-4': 15, // Documentation (out of 20)
      },
      feedback: 'The submission clearly separates container components from UI presentation. Error handling covers 90% of edge network partitions.',
      model: 'Acuity-LLM-v2-Academic',
      version: '2.4.1',
      generatedAt: '2026-10-22T16:46:12Z',
      status: 'suggestion_ready',
    },
    timeSpent: 165,
    answers: [
      {
        questionId: 'q-005',
        answer: 'In our enterprise React capstone, we decoupled presentation views from business state using custom hooks and an event-driven domain store. var is avoided entirely due to function-scope hoisting vulnerabilities; let is reserved strictly for local iterator mutations, while const is used for immutable references. For global caching, we integrated optimistic UI reconcilers with rollback.',
        points: 18,
        maxPoints: 20,
        flagged: false,
        aiNotes: 'Comprehensive explanation with concrete architectural context. Awarded 18/20.',
      },
      {
        questionId: 'q-006',
        answer: 'useEffect',
        isCorrect: true,
        points: 5,
        maxPoints: 5,
        flagged: false,
        feedback: 'Correct hook selection.',
      },
    ],
  },
  {
    id: 'att-003',
    assessmentId: 'asm-004',
    assessmentTitle: 'TypeScript Type Challenges',
    courseId: 'crs-004',
    courseTitle: 'TypeScript Mastery',
    assessmentType: 'assignment',
    attemptNumber: 1,
    learnerId: 'u-007',
    learnerName: 'Alex Thompson',
    learnerRollNo: 'STU-2026-007',
    learnerEmail: 'student@lms.demo',
    learnerDepartment: 'Software Engineering',
    status: 'results_released',
    evaluationStatus: 'published',
    startedAt: '2026-10-18T11:00:00Z',
    submittedAt: '2026-10-18T11:45:00Z',
    score: 38,
    totalMarks: 40,
    percentage: 95,
    passed: true,
    feedback: 'Superb mastery of conditional types and mapped distributive operations.',
    evaluatedBy: 'Dr. James Wilson',
    evaluatedAt: '2026-10-18T15:20:00Z',
    timeSpent: 45,
    answers: [
      { questionId: 'q-001', answer: 'const x = 5', isCorrect: true, points: 5, maxPoints: 5, flagged: false },
      { questionId: 'q-002', answer: 'String,Number,Boolean', isCorrect: true, points: 10, maxPoints: 10, flagged: false },
    ],
  },

  // --- Maria Garcia (u-009) ---
  {
    id: 'att-004',
    assessmentId: 'asm-001',
    assessmentTitle: 'JavaScript Fundamentals Quiz',
    courseId: 'crs-001',
    courseTitle: 'JavaScript Mastery & Architecture',
    assessmentType: 'quiz',
    attemptNumber: 1,
    learnerId: 'u-009',
    learnerName: 'Maria Garcia',
    learnerRollNo: 'STU-2026-009',
    learnerEmail: 'maria.garcia@lms.demo',
    learnerDepartment: 'UI/UX Design',
    status: 'results_released',
    evaluationStatus: 'auto_graded',
    startedAt: '2026-10-16T10:00:00Z',
    submittedAt: '2026-10-16T10:40:00Z',
    score: 15,
    totalMarks: 25,
    percentage: 60,
    passed: true,
    feedback: 'Passed passmark threshold (60%). Recommendation: practice JS type coercion rules.',
    evaluatedBy: 'Automated Grading Engine',
    evaluatedAt: '2026-10-16T10:40:08Z',
    timeSpent: 40,
    answers: [
      { questionId: 'q-001', answer: 'const x = 5', isCorrect: true, points: 5, maxPoints: 5, flagged: false },
      { questionId: 'q-002', answer: 'String,Number', isCorrect: false, points: 5, maxPoints: 10, flagged: true, feedback: 'Missed Boolean primitive.' },
      { questionId: 'q-003', answer: 'true', isCorrect: false, points: 0, maxPoints: 5, flagged: false, feedback: 'Incorrect. JS is dynamically typed.' },
      { questionId: 'q-004', answer: 'class', isCorrect: true, points: 5, maxPoints: 5, flagged: false },
    ],
  },
  {
    id: 'att-005',
    assessmentId: 'asm-003',
    assessmentTitle: 'Python Data Analysis Midterm',
    courseId: 'crs-003',
    courseTitle: 'Python for Data Science',
    assessmentType: 'exam',
    attemptNumber: 1,
    learnerId: 'u-009',
    learnerName: 'Maria Garcia',
    learnerRollNo: 'STU-2026-009',
    learnerEmail: 'maria.garcia@lms.demo',
    learnerDepartment: 'UI/UX Design',
    status: 'submitted',
    evaluationStatus: 'ai_review_required',
    startedAt: '2026-10-24T13:00:00Z',
    submittedAt: '2026-10-24T14:25:00Z',
    score: 42,
    totalMarks: 50,
    percentage: 84,
    passed: true,
    feedback: 'AI Assessment: Good DataFrame wrangling, clear pandas aggregations, slightly incomplete seaborn styling.',
    aiSuggestion: {
      id: 'ai-003',
      score: 42,
      confidence: 0.91,
      evidence: ['Correct vectorized grouping with .groupby().agg()', 'Clean handling of NaN imputation'],
      rubricScores: { 'rc-1': 22, 'rc-2': 20 },
      feedback: 'Student implemented Pandas transformations with vectorized operations. Visualization could benefit from custom palette.',
      model: 'Acuity-LLM-v2-Academic',
      version: '2.4.1',
      generatedAt: '2026-10-24T14:26:00Z',
      status: 'suggestion_ready',
    },
    timeSpent: 85,
    answers: [
      {
        questionId: 'q-005',
        answer: 'Data cleansing was carried out by identifying missing values using df.isna().sum(). Imputed numerical columns with median and converted categorical dates using pd.to_datetime(). Then grouped customer churn by subscription tier.',
        points: 17,
        maxPoints: 20,
        flagged: false,
        aiNotes: 'Solid data hygiene methodology demonstrated.',
      },
    ],
  },

  // --- David Kim (u-010) ---
  {
    id: 'att-006',
    assessmentId: 'asm-001',
    assessmentTitle: 'JavaScript Fundamentals Quiz',
    courseId: 'crs-001',
    courseTitle: 'JavaScript Mastery & Architecture',
    assessmentType: 'quiz',
    attemptNumber: 1,
    learnerId: 'u-010',
    learnerName: 'David Kim',
    learnerRollNo: 'STU-2026-010',
    learnerEmail: 'david.kim@lms.demo',
    learnerDepartment: 'Software Engineering',
    status: 'results_released',
    evaluationStatus: 'published',
    startedAt: '2026-10-15T09:00:00Z',
    submittedAt: '2026-10-15T09:40:00Z',
    score: 22,
    totalMarks: 25,
    percentage: 88,
    passed: true,
    feedback: 'Great performance. Strong conceptual grasp of modern JS.',
    evaluatedBy: 'Dr. James Wilson',
    evaluatedAt: '2026-10-15T11:00:00Z',
    timeSpent: 40,
    answers: [
      { questionId: 'q-001', answer: 'const x = 5', isCorrect: true, points: 5, maxPoints: 5, flagged: false },
      { questionId: 'q-002', answer: 'String,Number,Boolean', isCorrect: true, points: 10, maxPoints: 10, flagged: false },
      { questionId: 'q-003', answer: 'false', isCorrect: true, points: 5, maxPoints: 5, flagged: false },
      { questionId: 'q-004', answer: 'function', isCorrect: false, points: 2, maxPoints: 5, flagged: true, feedback: 'class keyword expected.' },
    ],
  },
  {
    id: 'att-007',
    assessmentId: 'asm-002',
    assessmentTitle: 'Advanced React Capstone',
    courseId: 'crs-002',
    courseTitle: 'React Deep Dive & Architecture',
    assessmentType: 'capstone',
    attemptNumber: 1,
    learnerId: 'u-010',
    learnerName: 'David Kim',
    learnerRollNo: 'STU-2026-010',
    learnerEmail: 'david.kim@lms.demo',
    learnerDepartment: 'Software Engineering',
    status: 'submitted',
    evaluationStatus: 'awaiting_human_approval',
    startedAt: '2026-10-21T10:00:00Z',
    submittedAt: '2026-10-21T12:50:00Z',
    score: 72,
    totalMarks: 100,
    percentage: 72,
    passed: true,
    feedback: 'Divergence between initial automated scan (64) and instructor assessment (80). Flagged for second marking.',
    timeSpent: 170,
    answers: [
      {
        questionId: 'q-005',
        answer: 'Constructed an e-commerce dashboard with Zustand state slices and React Query for server synchronization. Var has function scoping which causes closure leaks in async loops; let is used when counter rebindings occur; const prevents re-assignment.',
        points: 15,
        maxPoints: 20,
        flagged: true,
        aiNotes: 'Good implementation, but requires manual confirmation of security patterns.',
      },
      { questionId: 'q-006', answer: 'useEffect', isCorrect: true, points: 5, maxPoints: 5, flagged: false },
    ],
  },

  // --- Aisha Patel (u-006) ---
  {
    id: 'att-008',
    assessmentId: 'asm-001',
    assessmentTitle: 'JavaScript Fundamentals Quiz',
    courseId: 'crs-001',
    courseTitle: 'JavaScript Mastery & Architecture',
    assessmentType: 'quiz',
    attemptNumber: 1,
    learnerId: 'u-006',
    learnerName: 'Aisha Patel',
    learnerRollNo: 'STU-2026-008',
    learnerEmail: 'aisha.patel@lms.demo',
    learnerDepartment: 'Software Engineering',
    status: 'results_released',
    evaluationStatus: 'published',
    startedAt: '2026-10-14T08:00:00Z',
    submittedAt: '2026-10-14T08:32:00Z',
    score: 25,
    totalMarks: 25,
    percentage: 100,
    passed: true,
    feedback: 'Flawless quiz completion.',
    evaluatedBy: 'Automated Grading Engine',
    evaluatedAt: '2026-10-14T08:32:10Z',
    timeSpent: 32,
    answers: [
      { questionId: 'q-001', answer: 'const x = 5', isCorrect: true, points: 5, maxPoints: 5, flagged: false },
      { questionId: 'q-002', answer: 'String,Number,Boolean', isCorrect: true, points: 10, maxPoints: 10, flagged: false },
      { questionId: 'q-003', answer: 'false', isCorrect: true, points: 5, maxPoints: 5, flagged: false },
      { questionId: 'q-004', answer: 'class', isCorrect: true, points: 5, maxPoints: 5, flagged: false },
    ],
  },
  {
    id: 'att-009',
    assessmentId: 'asm-004',
    assessmentTitle: 'TypeScript Type Challenges',
    courseId: 'crs-004',
    courseTitle: 'TypeScript Mastery',
    assessmentType: 'assignment',
    attemptNumber: 1,
    learnerId: 'u-006',
    learnerName: 'Aisha Patel',
    learnerRollNo: 'STU-2026-008',
    learnerEmail: 'aisha.patel@lms.demo',
    learnerDepartment: 'Software Engineering',
    status: 'submitted',
    evaluationStatus: 'ai_review_required',
    startedAt: '2026-10-23T15:00:00Z',
    submittedAt: '2026-10-23T15:58:00Z',
    score: 36,
    totalMarks: 40,
    percentage: 90,
    passed: true,
    feedback: 'AI Recommendation: Excellent implementation of recursive template literal types.',
    aiSuggestion: {
      id: 'ai-004',
      score: 36,
      confidence: 0.95,
      evidence: ['DeepPartial implementation handles nested objects and arrays', 'Tuple to union correctly handles readonly inputs'],
      rubricScores: { 'rc-1': 18, 'rc-2': 18 },
      feedback: 'Solution passes 100% of standard type-check suites. Extremely readable utility types.',
      model: 'Acuity-LLM-v2-Academic',
      version: '2.4.1',
      generatedAt: '2026-10-23T15:59:00Z',
      status: 'suggestion_ready',
    },
    timeSpent: 58,
    answers: [
      {
        questionId: 'q-005',
        answer: 'Implemented DeepReadonly<T> and LookUp<U, T> using distributive conditional types and infer keyword for pattern extraction.',
        points: 18,
        maxPoints: 20,
        flagged: false,
        aiNotes: 'Correctly inferred types for polymorphic structures.',
      },
    ],
  },

  // --- Sarah Connor (st-5) ---
  {
    id: 'att-010',
    assessmentId: 'asm-001',
    assessmentTitle: 'JavaScript Fundamentals Quiz',
    courseId: 'crs-001',
    courseTitle: 'JavaScript Mastery & Architecture',
    assessmentType: 'quiz',
    attemptNumber: 1,
    learnerId: 'st-5',
    learnerName: 'Sarah Connor',
    learnerRollNo: 'STU-2026-015',
    learnerEmail: 'sarah.c@lms.demo',
    learnerDepartment: 'Cloud Systems',
    status: 'results_released',
    evaluationStatus: 'published',
    startedAt: '2026-10-12T10:00:00Z',
    submittedAt: '2026-10-12T10:35:00Z',
    score: 20,
    totalMarks: 25,
    percentage: 80,
    passed: true,
    feedback: 'Strong performance on JS fundamentals.',
    evaluatedBy: 'Dr. James Wilson',
    evaluatedAt: '2026-10-12T14:00:00Z',
    timeSpent: 35,
    answers: [
      { questionId: 'q-001', answer: 'const x = 5', isCorrect: true, points: 5, maxPoints: 5, flagged: false },
      { questionId: 'q-002', answer: 'String,Number,Boolean', isCorrect: true, points: 10, maxPoints: 10, flagged: false },
      { questionId: 'q-003', answer: 'false', isCorrect: true, points: 5, maxPoints: 5, flagged: false },
    ],
  },
  {
    id: 'att-011',
    assessmentId: 'asm-003',
    assessmentTitle: 'Python Data Analysis Midterm',
    courseId: 'crs-003',
    courseTitle: 'Python for Data Science',
    assessmentType: 'exam',
    attemptNumber: 1,
    learnerId: 'st-5',
    learnerName: 'Sarah Connor',
    learnerRollNo: 'STU-2026-015',
    learnerEmail: 'sarah.c@lms.demo',
    learnerDepartment: 'Cloud Systems',
    status: 'submitted',
    evaluationStatus: 'auto_graded',
    startedAt: '2026-10-25T09:00:00Z',
    submittedAt: '2026-10-25T10:20:00Z',
    score: 22,
    totalMarks: 50,
    percentage: 44,
    passed: false,
    feedback: 'Below 50% pass threshold. Re-take available following tutoring review.',
    evaluatedBy: 'Automated Evaluation Engine',
    evaluatedAt: '2026-10-25T10:20:15Z',
    timeSpent: 80,
    answers: [
      { questionId: 'q-001', answer: 'let x = 5', isCorrect: false, points: 0, maxPoints: 5, flagged: false },
      { questionId: 'q-003', answer: 'true', isCorrect: false, points: 0, maxPoints: 5, flagged: false },
    ],
  },

  // --- Liam O'Connor (st-6) ---
  {
    id: 'att-012',
    assessmentId: 'asm-003',
    assessmentTitle: 'Python Data Analysis Midterm',
    courseId: 'crs-003',
    courseTitle: 'Python for Data Science',
    assessmentType: 'exam',
    attemptNumber: 1,
    learnerId: 'st-6',
    learnerName: "Liam O'Connor",
    learnerRollNo: 'STU-2026-016',
    learnerEmail: 'liam.o@lms.demo',
    learnerDepartment: 'AI & Data Science',
    status: 'submitted',
    evaluationStatus: 'ai_review_required',
    startedAt: '2026-10-24T16:00:00Z',
    submittedAt: '2026-10-24T17:15:00Z',
    score: 46,
    totalMarks: 50,
    percentage: 92,
    passed: true,
    feedback: 'AI Recommendation: Outstanding statistical modeling and Matplotlib plotting with error bands.',
    aiSuggestion: {
      id: 'ai-005',
      score: 46,
      confidence: 0.96,
      evidence: ['Implemented custom linear regression pipeline with scikit-learn', 'Residual plots correctly generated'],
      rubricScores: { 'rc-1': 24, 'rc-2': 22 },
      feedback: 'Excellent rigor in machine learning validation metrics. Proper 5-fold cross-validation.',
      model: 'Acuity-LLM-v2-Academic',
      version: '2.4.1',
      generatedAt: '2026-10-24T17:16:00Z',
      status: 'suggestion_ready',
    },
    timeSpent: 75,
    answers: [
      {
        questionId: 'q-005',
        answer: 'Constructed an end-to-end data pipeline using scikit-learn pipelines with StandardScaler and RidgeCV regression. Cross-validated RMSE was 0.23, outperforming simple baseline by 40%.',
        points: 19,
        maxPoints: 20,
        flagged: false,
        aiNotes: 'Impressive experimental rigor and statistical documentation.',
      },
    ],
  },
  {
    id: 'att-013',
    assessmentId: 'asm-004',
    assessmentTitle: 'TypeScript Type Challenges',
    courseId: 'crs-004',
    courseTitle: 'TypeScript Mastery',
    assessmentType: 'assignment',
    attemptNumber: 1,
    learnerId: 'st-6',
    learnerName: "Liam O'Connor",
    learnerRollNo: 'STU-2026-016',
    learnerEmail: 'liam.o@lms.demo',
    learnerDepartment: 'AI & Data Science',
    status: 'results_released',
    evaluationStatus: 'published',
    startedAt: '2026-10-19T13:00:00Z',
    submittedAt: '2026-10-19T13:45:00Z',
    score: 34,
    totalMarks: 40,
    percentage: 85,
    passed: true,
    feedback: 'Great solution on mapped types and key remapping.',
    evaluatedBy: 'Dr. James Wilson',
    evaluatedAt: '2026-10-19T16:00:00Z',
    timeSpent: 45,
    answers: [
      { questionId: 'q-001', answer: 'const x = 5', isCorrect: true, points: 5, maxPoints: 5, flagged: false },
    ],
  },

  // --- Chen Wei (st-7) ---
  {
    id: 'att-014',
    assessmentId: 'asm-002',
    assessmentTitle: 'Advanced React Capstone',
    courseId: 'crs-002',
    courseTitle: 'React Deep Dive & Architecture',
    assessmentType: 'capstone',
    attemptNumber: 1,
    learnerId: 'st-7',
    learnerName: 'Chen Wei',
    learnerRollNo: 'STU-2026-017',
    learnerEmail: 'chen.wei@lms.demo',
    learnerDepartment: 'Software Engineering',
    status: 'submitted',
    evaluationStatus: 'ai_review_required',
    startedAt: '2026-10-23T10:00:00Z',
    submittedAt: '2026-10-23T12:45:00Z',
    score: 91,
    totalMarks: 100,
    percentage: 91,
    passed: true,
    feedback: 'AI Recommendation: Exceptional component architecture with virtualized windowing for large lists.',
    aiSuggestion: {
      id: 'ai-006',
      score: 91,
      confidence: 0.95,
      evidence: ['High-performance virtualization implemented via TanStack Virtual', 'Custom accessibility ARIA landmark tags'],
      rubricScores: { 'rc-1': 28, 'rc-2': 24, 'rc-3': 23, 'rc-4': 16 },
      feedback: 'Production-ready code with comprehensive typing and unit test coverage exceeding 85%.',
      model: 'Acuity-LLM-v2-Academic',
      version: '2.4.1',
      generatedAt: '2026-10-23T12:46:00Z',
      status: 'suggestion_ready',
    },
    timeSpent: 165,
    answers: [
      {
        questionId: 'q-005',
        answer: 'Implemented a high-throughput stock trading ticket UI with React Server Components, WebSockets with backpressure control, and TanStack Virtual for rendering 50,000 live price ticks per second.',
        points: 19,
        maxPoints: 20,
        flagged: false,
        aiNotes: 'Extraordinary technical depth and real-world scalability considerations.',
      },
      { questionId: 'q-006', answer: 'useEffect', isCorrect: true, points: 5, maxPoints: 5, flagged: false },
    ],
  },

  // --- Fatima Zahra (st-8) ---
  {
    id: 'att-015',
    assessmentId: 'asm-002',
    assessmentTitle: 'Advanced React Capstone',
    courseId: 'crs-002',
    courseTitle: 'React Deep Dive & Architecture',
    assessmentType: 'capstone',
    attemptNumber: 1,
    learnerId: 'st-8',
    learnerName: 'Fatima Zahra',
    learnerRollNo: 'STU-2026-018',
    learnerEmail: 'fatima.z@lms.demo',
    learnerDepartment: 'UI/UX Design',
    status: 'submitted',
    evaluationStatus: 'awaiting_human_approval',
    startedAt: '2026-10-22T08:00:00Z',
    submittedAt: '2026-10-22T10:50:00Z',
    score: 76,
    totalMarks: 100,
    percentage: 76,
    passed: true,
    feedback: 'Awaiting primary marker review for design system tokens integration.',
    timeSpent: 170,
    answers: [
      {
        questionId: 'q-005',
        answer: 'Created an accessible design system using CSS variables, tokens, and React composition patterns. Handled color contrast compliance with WCAG AAA standards.',
        points: 16,
        maxPoints: 20,
        flagged: false,
        aiNotes: 'Design tokens and accessibility execution are high quality.',
      },
      { questionId: 'q-006', answer: 'useEffect', isCorrect: true, points: 5, maxPoints: 5, flagged: false },
    ],
  },
];

const initialTasks: GradingTask[] = [
  {
    id: 'gt-001',
    attemptId: 'att-002',
    submissionId: 'SUB-2026-002',
    assessmentId: 'asm-002',
    assessmentTitle: 'Advanced React Capstone',
    courseId: 'crs-002',
    courseTitle: 'React Deep Dive & Architecture',
    assessmentType: 'capstone',
    attemptNumber: 1,
    learnerId: 'u-007',
    learnerName: 'Alex Thompson',
    learnerRollNo: 'STU-2026-007',
    learnerEmail: 'student@lms.demo',
    graderId: 'u-004',
    graderName: 'Dr. James Wilson',
    status: 'assigned',
    evaluationStatus: 'ai_review_required',
    dueDate: '2026-10-28',
    priority: 'high',
    isDoubleMarking: false,
    markingStage: 'first',
    score: 88,
    totalMarks: 100,
    maxScore: 100,
    aiPreliminaryScore: 88,
    aiSuggestion: initialAttempts[1].aiSuggestion,
    submittedAt: '2026-10-22T16:45:00Z',
    createdAt: '2026-10-22T16:46:00Z',
    updatedAt: '2026-10-22T16:46:00Z',
  },
  {
    id: 'gt-002',
    attemptId: 'att-005',
    submissionId: 'SUB-2026-005',
    assessmentId: 'asm-003',
    assessmentTitle: 'Python Data Analysis Midterm',
    courseId: 'crs-003',
    courseTitle: 'Python for Data Science',
    assessmentType: 'exam',
    attemptNumber: 1,
    learnerId: 'u-009',
    learnerName: 'Maria Garcia',
    learnerRollNo: 'STU-2026-009',
    learnerEmail: 'maria.garcia@lms.demo',
    graderId: 'u-003',
    graderName: 'Prof. Priya Sharma',
    status: 'assigned',
    evaluationStatus: 'ai_review_required',
    dueDate: '2026-10-29',
    priority: 'medium',
    isDoubleMarking: false,
    markingStage: 'first',
    score: 42,
    totalMarks: 50,
    maxScore: 50,
    aiPreliminaryScore: 42,
    aiSuggestion: initialAttempts[4].aiSuggestion,
    submittedAt: '2026-10-24T14:25:00Z',
    createdAt: '2026-10-24T14:26:00Z',
    updatedAt: '2026-10-24T14:26:00Z',
  },
  {
    id: 'gt-003',
    attemptId: 'att-007',
    submissionId: 'SUB-2026-007',
    assessmentId: 'asm-002',
    assessmentTitle: 'Advanced React Capstone',
    courseId: 'crs-002',
    courseTitle: 'React Deep Dive & Architecture',
    assessmentType: 'capstone',
    attemptNumber: 1,
    learnerId: 'u-010',
    learnerName: 'David Kim',
    learnerRollNo: 'STU-2026-010',
    learnerEmail: 'david.kim@lms.demo',
    graderId: 'u-004',
    graderName: 'Dr. James Wilson',
    status: 'moderation',
    evaluationStatus: 'awaiting_human_approval',
    dueDate: '2026-10-29',
    priority: 'high',
    isDoubleMarking: true,
    markingStage: 'second',
    score: 72,
    totalMarks: 100,
    maxScore: 100,
    submittedAt: '2026-10-21T12:50:00Z',
    createdAt: '2026-10-21T13:00:00Z',
    updatedAt: '2026-10-21T14:00:00Z',
  },
  {
    id: 'gt-004',
    attemptId: 'att-009',
    submissionId: 'SUB-2026-009',
    assessmentId: 'asm-004',
    assessmentTitle: 'TypeScript Type Challenges',
    courseId: 'crs-004',
    courseTitle: 'TypeScript Mastery',
    assessmentType: 'assignment',
    attemptNumber: 1,
    learnerId: 'u-006',
    learnerName: 'Aisha Patel',
    learnerRollNo: 'STU-2026-008',
    learnerEmail: 'aisha.patel@lms.demo',
    graderId: 'u-004',
    graderName: 'Dr. James Wilson',
    status: 'assigned',
    evaluationStatus: 'ai_review_required',
    dueDate: '2026-10-30',
    priority: 'medium',
    isDoubleMarking: false,
    markingStage: 'first',
    score: 36,
    totalMarks: 40,
    maxScore: 40,
    aiPreliminaryScore: 36,
    aiSuggestion: initialAttempts[8].aiSuggestion,
    submittedAt: '2026-10-23T15:58:00Z',
    createdAt: '2026-10-23T16:00:00Z',
    updatedAt: '2026-10-23T16:00:00Z',
  },
  {
    id: 'gt-005',
    attemptId: 'att-012',
    submissionId: 'SUB-2026-012',
    assessmentId: 'asm-003',
    assessmentTitle: 'Python Data Analysis Midterm',
    courseId: 'crs-003',
    courseTitle: 'Python for Data Science',
    assessmentType: 'exam',
    attemptNumber: 1,
    learnerId: 'st-6',
    learnerName: "Liam O'Connor",
    learnerRollNo: 'STU-2026-016',
    learnerEmail: 'liam.o@lms.demo',
    graderId: 'u-003',
    graderName: 'Prof. Priya Sharma',
    status: 'assigned',
    evaluationStatus: 'ai_review_required',
    dueDate: '2026-10-30',
    priority: 'high',
    isDoubleMarking: false,
    markingStage: 'first',
    score: 46,
    totalMarks: 50,
    maxScore: 50,
    aiPreliminaryScore: 46,
    aiSuggestion: initialAttempts[11].aiSuggestion,
    submittedAt: '2026-10-24T17:15:00Z',
    createdAt: '2026-10-24T17:20:00Z',
    updatedAt: '2026-10-24T17:20:00Z',
  },
  {
    id: 'gt-006',
    attemptId: 'att-014',
    submissionId: 'SUB-2026-014',
    assessmentId: 'asm-002',
    assessmentTitle: 'Advanced React Capstone',
    courseId: 'crs-002',
    courseTitle: 'React Deep Dive & Architecture',
    assessmentType: 'capstone',
    attemptNumber: 1,
    learnerId: 'st-7',
    learnerName: 'Chen Wei',
    learnerRollNo: 'STU-2026-017',
    learnerEmail: 'chen.wei@lms.demo',
    graderId: 'u-004',
    graderName: 'Dr. James Wilson',
    status: 'assigned',
    evaluationStatus: 'ai_review_required',
    dueDate: '2026-10-31',
    priority: 'urgent',
    isDoubleMarking: false,
    markingStage: 'first',
    score: 91,
    totalMarks: 100,
    maxScore: 100,
    aiPreliminaryScore: 91,
    aiSuggestion: initialAttempts[13].aiSuggestion,
    submittedAt: '2026-10-23T12:45:00Z',
    createdAt: '2026-10-23T12:50:00Z',
    updatedAt: '2026-10-23T12:50:00Z',
  },
  {
    id: 'gt-007',
    attemptId: 'att-015',
    submissionId: 'SUB-2026-015',
    assessmentId: 'asm-002',
    assessmentTitle: 'Advanced React Capstone',
    courseId: 'crs-002',
    courseTitle: 'React Deep Dive & Architecture',
    assessmentType: 'capstone',
    attemptNumber: 1,
    learnerId: 'st-8',
    learnerName: 'Fatima Zahra',
    learnerRollNo: 'STU-2026-018',
    learnerEmail: 'fatima.z@lms.demo',
    graderId: 'u-005',
    graderName: 'Emily Rodriguez',
    status: 'moderation',
    evaluationStatus: 'awaiting_human_approval',
    dueDate: '2026-10-31',
    priority: 'medium',
    isDoubleMarking: true,
    markingStage: 'second',
    score: 76,
    totalMarks: 100,
    maxScore: 100,
    submittedAt: '2026-10-22T10:50:00Z',
    createdAt: '2026-10-22T11:00:00Z',
    updatedAt: '2026-10-22T11:00:00Z',
  },
];

interface GradingStoreState {
  attempts: AssessmentAttempt[];
  tasks: GradingTask[];
  selectedStudentId: string | null;
  selectedAttemptId: string | null;
  activeSubmissionModalAttempt: AssessmentAttempt | null;
  setSelectedStudentId: (studentId: string | null) => void;
  setSelectedAttemptId: (attemptId: string | null) => void;
  openSubmissionModal: (attempt: AssessmentAttempt) => void;
  closeSubmissionModal: () => void;
  acceptAiScore: (attemptId: string, reviewerNotes?: string, reviewerName?: string) => void;
  overrideScore: (
    attemptId: string,
    params: {
      score: number;
      feedback: string;
      rubricScores?: Record<string, number>;
      privateNotes?: string;
      requestModeration?: boolean;
      graderName?: string;
    }
  ) => void;
  saveDraftGrade: (
    attemptId: string,
    params: {
      score: number;
      feedback: string;
      rubricScores?: Record<string, number>;
      privateNotes?: string;
    }
  ) => void;
  resetToDefaults: () => void;
}

export const useGradingStore = create<GradingStoreState>()(
  persist(
    (set, get) => ({
      attempts: initialAttempts,
      tasks: initialTasks,
      selectedStudentId: null,
      selectedAttemptId: null,
      activeSubmissionModalAttempt: null,

      setSelectedStudentId: (studentId) => set({ selectedStudentId: studentId }),
      setSelectedAttemptId: (attemptId) => set({ selectedAttemptId: attemptId }),

      openSubmissionModal: (attempt) => set({ activeSubmissionModalAttempt: attempt }),
      closeSubmissionModal: () => set({ activeSubmissionModalAttempt: null }),

      acceptAiScore: (attemptId, reviewerNotes = 'Accepted AI suggested score following human verification', reviewerName = 'Dr. James Wilson') => {
        const now = new Date().toISOString();
        set((state) => {
          const updatedAttempts = state.attempts.map((att) => {
            if (att.id === attemptId) {
              const finalScore = att.aiSuggestion ? att.aiSuggestion.score : (att.score || 0);
              const percentage = Math.round((finalScore / att.totalMarks) * 100);
              const isPassed = percentage >= 60; // Standard 60% threshold

              return {
                ...att,
                score: finalScore,
                percentage,
                passed: isPassed,
                evaluationStatus: 'published' as StudentEvaluationStatus,
                status: 'results_released' as const,
                feedback: att.aiSuggestion?.feedback || att.feedback || reviewerNotes,
                evaluatedBy: `${reviewerName} (Verified AI Score)`,
                evaluatedAt: now,
                aiSuggestion: att.aiSuggestion
                  ? {
                      ...att.aiSuggestion,
                      reviewerAction: 'accepted' as const,
                      reviewerReason: reviewerNotes,
                    }
                  : undefined,
              };
            }
            return att;
          });

          const updatedTasks = state.tasks.map((task) => {
            if (task.attemptId === attemptId) {
              const finalScore = task.aiSuggestion ? task.aiSuggestion.score : (task.aiPreliminaryScore || task.score || 0);
              return {
                ...task,
                status: 'completed' as const,
                evaluationStatus: 'published' as StudentEvaluationStatus,
                score: finalScore,
                feedback: reviewerNotes,
                updatedAt: now,
              };
            }
            return task;
          });

          // Also update active modal if currently open
          const currentModal = state.activeSubmissionModalAttempt;
          const updatedModal = currentModal?.id === attemptId
            ? updatedAttempts.find((a) => a.id === attemptId) || null
            : currentModal;

          return {
            attempts: updatedAttempts,
            tasks: updatedTasks,
            activeSubmissionModalAttempt: updatedModal,
          };
        });
      },

      overrideScore: (attemptId, params) => {
        const now = new Date().toISOString();
        const { score, feedback, rubricScores, privateNotes, requestModeration, graderName = 'Dr. James Wilson' } = params;

        set((state) => {
          const updatedAttempts = state.attempts.map((att) => {
            if (att.id === attemptId) {
              const percentage = Math.round((score / att.totalMarks) * 100);
              const isPassed = percentage >= 60;
              const newEvalStatus: StudentEvaluationStatus = requestModeration
                ? 'awaiting_human_approval'
                : 'published';

              return {
                ...att,
                score,
                percentage,
                passed: isPassed,
                evaluationStatus: newEvalStatus,
                status: requestModeration ? 'submitted' as const : 'results_released' as const,
                feedback,
                privateNotes,
                rubricScores: rubricScores || att.rubricScores,
                evaluatedBy: graderName,
                evaluatedAt: now,
                aiSuggestion: att.aiSuggestion
                  ? {
                      ...att.aiSuggestion,
                      reviewerAction: 'edited' as const,
                      reviewerReason: 'Human override applied.',
                    }
                  : undefined,
              };
            }
            return att;
          });

          const updatedTasks = state.tasks.map((task) => {
            if (task.attemptId === attemptId) {
              return {
                ...task,
                status: requestModeration ? 'moderation' as const : 'completed' as const,
                evaluationStatus: requestModeration ? 'awaiting_human_approval' as const : 'published' as const,
                score,
                feedback,
                privateNotes,
                rubricScores: rubricScores || task.rubricScores,
                isDoubleMarking: requestModeration ? true : task.isDoubleMarking,
                markingStage: requestModeration ? 'second' as const : task.markingStage,
                updatedAt: now,
              };
            }
            return task;
          });

          const currentModal = state.activeSubmissionModalAttempt;
          const updatedModal = currentModal?.id === attemptId
            ? updatedAttempts.find((a) => a.id === attemptId) || null
            : currentModal;

          return {
            attempts: updatedAttempts,
            tasks: updatedTasks,
            activeSubmissionModalAttempt: updatedModal,
          };
        });
      },

      saveDraftGrade: (attemptId, params) => {
        const now = new Date().toISOString();
        const { score, feedback, rubricScores, privateNotes } = params;

        set((state) => {
          const updatedAttempts = state.attempts.map((att) => {
            if (att.id === attemptId) {
              return {
                ...att,
                score,
                feedback,
                rubricScores: rubricScores || att.rubricScores,
                privateNotes,
                evaluatedAt: now,
              };
            }
            return att;
          });

          const updatedTasks = state.tasks.map((task) => {
            if (task.attemptId === attemptId) {
              return {
                ...task,
                status: 'draft_graded' as const,
                score,
                feedback,
                privateNotes,
                rubricScores: rubricScores || task.rubricScores,
                updatedAt: now,
              };
            }
            return task;
          });

          const currentModal = state.activeSubmissionModalAttempt;
          const updatedModal = currentModal?.id === attemptId
            ? updatedAttempts.find((a) => a.id === attemptId) || null
            : currentModal;

          return {
            attempts: updatedAttempts,
            tasks: updatedTasks,
            activeSubmissionModalAttempt: updatedModal,
          };
        });
      },

      resetToDefaults: () => {
        set({
          attempts: initialAttempts,
          tasks: initialTasks,
          selectedStudentId: null,
          selectedAttemptId: null,
          activeSubmissionModalAttempt: null,
        });
      },
    }),
    {
      name: 'venilearn-grading-store',
      partialize: (state) => ({
        attempts: state.attempts,
        tasks: state.tasks,
      }),
    }
  )
);
