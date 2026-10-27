// ============================================================
// LMS - Adaptive Learning Paths Store (Zustand with LocalStorage Sync)
// Supports Schools, Colleges/Universities, Corporates & Training Institutes
// ============================================================
import { create } from 'zustand';
import {
  LearningPath,
  LearningPathCourse,
  LearningPathInstitutionType,
  LearningPathDifficulty,
  EntityStatus,
  User,
} from '../types';

export const STORAGE_KEY_LEARNING_PATHS = 'venilearn_learning_paths';

export interface PathTemplatePreset {
  id: string;
  name: string;
  institutionType: LearningPathInstitutionType;
  category: string;
  difficulty: LearningPathDifficulty;
  targetGroup: string;
  targetRole: string;
  objective: string;
  description: string;
  enforceSequence: boolean;
  requirePassingAssessments: boolean;
  completionThreshold: number;
  certificateEligible: boolean;
  certificateTitle: string;
  defaultCourseIds: string[];
}

export const PATH_TEMPLATE_PRESETS: PathTemplatePreset[] = [
  // Corporate Enterprise
  {
    id: 'tpl-corp-onboarding',
    name: 'Employee Onboarding & Tech Readiness',
    institutionType: 'corporate',
    category: 'Employee Onboarding',
    difficulty: 'Beginner',
    targetGroup: 'New Hires & Transferred Associates',
    targetRole: 'Associate Software Engineer',
    objective: 'Equip new hires with foundational toolchains, repository standards, and development workflows.',
    description: 'Structured onboarding track designed to ramp up new technical hires into production codebases within 30 days.',
    enforceSequence: true,
    requirePassingAssessments: true,
    completionThreshold: 80,
    certificateEligible: true,
    certificateTitle: 'Corporate Engineering Onboarding Credential',
    defaultCourseIds: ['crs-001', 'crs-004'],
  },
  {
    id: 'tpl-corp-compliance',
    name: 'Annual Security & Governance Compliance',
    institutionType: 'corporate',
    category: 'Compliance & Safety',
    difficulty: 'Beginner',
    targetGroup: 'All Enterprise Employees',
    targetRole: 'Enterprise Personnel',
    objective: 'Ensure mandatory regulatory adherence, data privacy, and workplace security compliance.',
    description: 'Mandatory annual learning journey verifying compliance with enterprise data governance and ethics policies.',
    enforceSequence: false,
    requirePassingAssessments: true,
    completionThreshold: 100,
    certificateEligible: true,
    certificateTitle: 'Certified Information Security & Governance Compliance',
    defaultCourseIds: ['crs-005'],
  },
  {
    id: 'tpl-corp-leadership',
    name: 'Leadership & Team Collaboration Accelerator',
    institutionType: 'corporate',
    category: 'Leadership & Management',
    difficulty: 'Intermediate',
    targetGroup: 'Aspiring Managers & Team Leads',
    targetRole: 'Engineering Lead / Team Manager',
    objective: 'Develop high-impact communication, constructive feedback, and cross-functional leadership skills.',
    description: 'Targeted skill-building journey for engineers transitioning to people and project leadership.',
    enforceSequence: false,
    requirePassingAssessments: false,
    completionThreshold: 75,
    certificateEligible: true,
    certificateTitle: 'Executive Leadership Excellence Certificate',
    defaultCourseIds: ['crs-005'],
  },

  // College / University
  {
    id: 'tpl-univ-major',
    name: 'Full-Stack Software Architecture Specialization',
    institutionType: 'higher_ed',
    category: 'Degree Specialization',
    difficulty: 'Advanced',
    targetGroup: 'B.Tech / B.S. Computer Science Semester 5-6',
    targetRole: 'Undergraduate Major Candidate',
    objective: 'Master end-to-end fullstack development, systems architecture, and modern application state.',
    description: 'Multi-semester curriculum sequence required for the Software Architecture academic degree specialization.',
    enforceSequence: true,
    requirePassingAssessments: true,
    completionThreshold: 75,
    certificateEligible: true,
    certificateTitle: 'University Degree Specialization in Systems Architecture',
    defaultCourseIds: ['crs-001', 'crs-004', 'crs-002'],
  },
  {
    id: 'tpl-univ-datascience',
    name: 'Applied Data Science & Machine Learning Sequence',
    institutionType: 'higher_ed',
    category: 'Semester Subject Sequence',
    difficulty: 'Intermediate',
    targetGroup: 'Data Science & Artificial Intelligence Majors',
    targetRole: 'Analytics & AI Scholar',
    objective: 'Build end-to-end predictive models, clean complex datasets, and analyze business intelligence trends.',
    description: 'Rigorous academic curriculum sequence providing mathematical grounding and practical Python data science.',
    enforceSequence: true,
    requirePassingAssessments: true,
    completionThreshold: 80,
    certificateEligible: true,
    certificateTitle: 'Academic Honors in Data Science & Machine Learning',
    defaultCourseIds: ['crs-003'],
  },

  // School (K-12 / Secondary)
  {
    id: 'tpl-school-grade',
    name: 'Grade 11 & 12 Computer Science & Logic Sequence',
    institutionType: 'school',
    category: 'Grade & Subject Sequence',
    difficulty: 'Beginner',
    targetGroup: 'High School Seniors (Grades 11-12)',
    targetRole: 'Secondary Student',
    objective: 'Establish core algorithmic thinking, computational problem-solving, and foundational coding.',
    description: 'Curriculum-aligned secondary school track covering standard board syllabus milestones in programming.',
    enforceSequence: true,
    requirePassingAssessments: true,
    completionThreshold: 70,
    certificateEligible: true,
    certificateTitle: 'High School STEM & Computer Science Completion',
    defaultCourseIds: ['crs-001'],
  },
  {
    id: 'tpl-school-remedial',
    name: 'Board Exam Preparation & Remedial Learning Journey',
    institutionType: 'school',
    category: 'Exam Preparation & Remedial',
    difficulty: 'Beginner',
    targetGroup: 'Students Requiring Board Exam Support',
    targetRole: 'Board Exam Candidate',
    objective: 'Provide targeted step-by-step remediation, practice problems, and concept reinforcement.',
    description: 'Personalized remedial learning journey to bridge skill gaps before mid-term and board evaluations.',
    enforceSequence: false,
    requirePassingAssessments: true,
    completionThreshold: 80,
    certificateEligible: false,
    certificateTitle: '',
    defaultCourseIds: ['crs-001'],
  },

  // Training Institute
  {
    id: 'tpl-inst-bootcamp',
    name: 'Certified Cloud & DevOps Solutions Architect',
    institutionType: 'training_institute',
    category: 'Certification Preparation',
    difficulty: 'Advanced',
    targetGroup: 'Industry Professionals & Career Switchers',
    targetRole: 'Cloud Solutions Architect',
    objective: 'Prepare learners for industry cloud certification and enterprise cloud deployment workloads.',
    description: 'Intensive certification preparation pathway covering infrastructure-as-code, scalable cloud services, and security.',
    enforceSequence: true,
    requirePassingAssessments: true,
    completionThreshold: 85,
    certificateEligible: true,
    certificateTitle: 'VeniLearn Certified Cloud Architect Credential',
    defaultCourseIds: ['crs-001', 'crs-004', 'crs-006'],
  },
  {
    id: 'tpl-inst-beginner',
    name: 'Full-Stack Web Foundations (Zero to Hero)',
    institutionType: 'training_institute',
    category: 'Career Track',
    difficulty: 'Beginner',
    targetGroup: 'New Developers & Bootcamp Learners',
    targetRole: 'Junior Web Developer',
    objective: 'Take beginner students from basic syntax to shipping complete, responsive applications.',
    description: 'Hands-on project-driven pathway focused on employment readiness and modern frontend toolchains.',
    enforceSequence: true,
    requirePassingAssessments: true,
    completionThreshold: 80,
    certificateEligible: true,
    certificateTitle: 'Professional Web Development Practitioner',
    defaultCourseIds: ['crs-001', 'crs-004', 'crs-002'],
  },
];

// Initial Multi-Tenant Seed Data
export const initialLearningPaths: LearningPath[] = [
  {
    id: 'lp-001',
    title: 'New Hire Engineering Onboarding & Cloud Readiness',
    objective: 'Equip newly joined engineers with core JavaScript, TypeScript, and cloud deployment foundations.',
    description: 'Standard technical onboarding pathway for new engineering personnel at the organization.',
    institutionType: 'corporate',
    category: 'Employee Onboarding',
    targetGroup: 'Engineering & Technology',
    targetRole: 'Software Engineer / DevOps Associate',
    difficulty: 'Beginner',
    estimatedHours: 120,
    organizationId: 'org-001',
    status: 'published',
    createdBy: 'u-004',
    creatorName: 'Dr. James Wilson',
    creatorRole: 'Faculty / Lead Trainer',
    enforceSequence: true,
    requirePassingAssessments: true,
    completionThreshold: 80,
    certificateEligible: true,
    certificateTitle: 'Enterprise Cloud Developer Onboarding Credential',
    assignedCohortIds: ['coh-001'],
    assignedUserIds: ['u-007', 'u-009', 'u-010'],
    assignedDepartmentIds: ['dep-001'],
    learnerCount: 8,
    courses: [
      { courseId: 'crs-001', order: 1, isRequired: true, prerequisiteCourseIds: [] },
      { courseId: 'crs-004', order: 2, isRequired: true, prerequisiteCourseIds: ['crs-001'] },
      { courseId: 'crs-006', order: 3, isRequired: true, prerequisiteCourseIds: ['crs-004'] },
    ],
    prerequisites: [],
    createdAt: '2026-06-01T10:00:00Z',
    updatedAt: '2026-10-15T12:00:00Z',
  },
  {
    id: 'lp-002',
    title: 'Full-Stack Software Architecture Specialization',
    objective: 'Rigorous multi-course sequence preparing computer science students for enterprise architecture roles.',
    description: 'Official academic curriculum track for Computer Science & Engineering degree requirements.',
    institutionType: 'higher_ed',
    category: 'Degree Specialization',
    targetGroup: 'B.Tech / B.S. Computer Science (Semesters 5-6)',
    targetRole: 'Undergraduate Major Candidate',
    difficulty: 'Advanced',
    estimatedHours: 130,
    organizationId: 'org-001',
    status: 'published',
    createdBy: 'u-004',
    creatorName: 'Dr. James Wilson',
    creatorRole: 'Faculty / Lead Trainer',
    enforceSequence: true,
    requirePassingAssessments: true,
    completionThreshold: 75,
    certificateEligible: true,
    certificateTitle: 'University Degree Specialization in Systems Architecture',
    assignedCohortIds: ['coh-002'],
    assignedUserIds: ['u-007', 'u-008'],
    assignedDepartmentIds: ['dep-001'],
    learnerCount: 14,
    courses: [
      { courseId: 'crs-001', order: 1, isRequired: true, prerequisiteCourseIds: [] },
      { courseId: 'crs-004', order: 2, isRequired: true, prerequisiteCourseIds: ['crs-001'] },
      { courseId: 'crs-002', order: 3, isRequired: true, prerequisiteCourseIds: ['crs-004'] },
    ],
    prerequisites: [],
    createdAt: '2026-07-10T09:00:00Z',
    updatedAt: '2026-10-16T14:30:00Z',
  },
  {
    id: 'lp-003',
    title: 'Applied Data Science & Machine Learning Sequence',
    objective: 'Build analytical models, clean real-world data, and learn fundamental machine learning workflows.',
    description: 'Data Science department sequence for analysts and aspiring machine learning practitioners.',
    institutionType: 'higher_ed',
    category: 'Semester Subject Sequence',
    targetGroup: 'Data Science & Analytics Department',
    targetRole: 'Data Analyst / Junior Scientist',
    difficulty: 'Intermediate',
    estimatedHours: 80,
    organizationId: 'org-001',
    status: 'published',
    createdBy: 'u-003',
    creatorName: 'Prof. Priya Sharma',
    creatorRole: 'Faculty / Data Science',
    enforceSequence: true,
    requirePassingAssessments: true,
    completionThreshold: 80,
    certificateEligible: true,
    certificateTitle: 'Academic Certificate in Applied Python & Analytics',
    assignedCohortIds: ['coh-003'],
    assignedUserIds: ['u-009'],
    assignedDepartmentIds: ['dep-003'],
    learnerCount: 18,
    courses: [
      { courseId: 'crs-003', order: 1, isRequired: true, prerequisiteCourseIds: [] },
    ],
    prerequisites: [],
    createdAt: '2026-08-01T08:30:00Z',
    updatedAt: '2026-10-12T11:00:00Z',
  },
  {
    id: 'lp-004',
    title: 'Executive Leadership & Team Collaboration Accelerator',
    objective: 'Strengthen communication, constructive feedback frameworks, and cross-functional team execution.',
    description: 'Professional development journey for emerging leads and tech managers.',
    institutionType: 'corporate',
    category: 'Leadership & Management',
    targetGroup: 'Team Leads & Project Managers',
    targetRole: 'Engineering Lead / Manager',
    difficulty: 'Intermediate',
    estimatedHours: 20,
    organizationId: 'org-001',
    status: 'published',
    createdBy: 'u-005',
    creatorName: 'Emily Rodriguez',
    creatorRole: 'Faculty / UI & Leadership',
    enforceSequence: false,
    requirePassingAssessments: false,
    completionThreshold: 75,
    certificateEligible: true,
    certificateTitle: 'Executive Leadership Excellence Certificate',
    assignedCohortIds: ['coh-004'],
    assignedUserIds: ['u-007', 'u-009'],
    assignedDepartmentIds: ['dep-002'],
    learnerCount: 2,
    courses: [
      { courseId: 'crs-005', order: 1, isRequired: true, prerequisiteCourseIds: [] },
    ],
    prerequisites: [],
    createdAt: '2026-09-01T11:00:00Z',
    updatedAt: '2026-10-14T16:00:00Z',
  },
  {
    id: 'lp-005',
    title: 'Secondary STEM: Code & Computational Thinking Foundation',
    objective: 'Introduce secondary school learners to computational logic, syntax basics, and program construction.',
    description: 'School curriculum journey aligned with secondary grade computer science standards.',
    institutionType: 'school',
    category: 'Grade & Subject Sequence',
    targetGroup: 'Grade 11 Science & Technology Section',
    targetRole: 'Secondary Student',
    difficulty: 'Beginner',
    estimatedHours: 40,
    organizationId: 'org-001',
    status: 'published',
    createdBy: 'u-002',
    creatorName: 'Marcus Johnson',
    creatorRole: 'Institution Admin',
    enforceSequence: true,
    requirePassingAssessments: true,
    completionThreshold: 70,
    certificateEligible: true,
    certificateTitle: 'Secondary School Computational Thinking Badge',
    assignedCohortIds: [],
    assignedUserIds: [],
    assignedDepartmentIds: ['dep-001'],
    learnerCount: 24,
    courses: [
      { courseId: 'crs-001', order: 1, isRequired: true, prerequisiteCourseIds: [] },
    ],
    prerequisites: [],
    createdAt: '2026-09-15T13:00:00Z',
    updatedAt: '2026-10-10T10:00:00Z',
  },
  {
    id: 'lp-006',
    title: 'Board Exam Preparation & Remedial Problem Solving',
    objective: 'Targeted reinforcement and concept practice for learners preparing for standardized academic exams.',
    description: 'School remedial journey with targeted modules to bridge learning gaps before final assessments.',
    institutionType: 'school',
    category: 'Exam Preparation & Remedial',
    targetGroup: 'Class 12 Board Exam Prep Group',
    targetRole: 'Board Exam Candidate',
    difficulty: 'Beginner',
    estimatedHours: 40,
    organizationId: 'org-001',
    status: 'draft',
    createdBy: 'u-003',
    creatorName: 'Prof. Priya Sharma',
    creatorRole: 'Faculty / Data Science',
    enforceSequence: false,
    requirePassingAssessments: true,
    completionThreshold: 75,
    certificateEligible: false,
    certificateTitle: '',
    assignedCohortIds: [],
    assignedUserIds: [],
    learnerCount: 0,
    courses: [
      { courseId: 'crs-001', order: 1, isRequired: true, prerequisiteCourseIds: [] },
    ],
    prerequisites: [],
    createdAt: '2026-10-01T15:00:00Z',
    updatedAt: '2026-10-05T09:00:00Z',
  },
  {
    id: 'lp-007',
    title: 'Certified Cloud & DevOps Solutions Architect',
    objective: 'Prepare professional candidates for cloud practitioner and systems architecture credentials.',
    description: 'Intensive certification preparation track designed for training institute cohorts.',
    institutionType: 'training_institute',
    category: 'Certification Preparation',
    targetGroup: 'Professional Certification Cohort',
    targetRole: 'Cloud Solutions Architect',
    difficulty: 'Advanced',
    estimatedHours: 120,
    organizationId: 'org-001',
    status: 'published',
    createdBy: 'u-004',
    creatorName: 'Dr. James Wilson',
    creatorRole: 'Faculty / Lead Trainer',
    enforceSequence: true,
    requirePassingAssessments: true,
    completionThreshold: 85,
    certificateEligible: true,
    certificateTitle: 'VeniLearn Certified Cloud Solutions Architect (CCSA)',
    assignedCohortIds: ['coh-001'],
    assignedUserIds: ['u-007'],
    learnerCount: 35,
    courses: [
      { courseId: 'crs-001', order: 1, isRequired: true, prerequisiteCourseIds: [] },
      { courseId: 'crs-004', order: 2, isRequired: true, prerequisiteCourseIds: ['crs-001'] },
      { courseId: 'crs-006', order: 3, isRequired: true, prerequisiteCourseIds: ['crs-004'] },
    ],
    prerequisites: [],
    createdAt: '2026-08-15T14:00:00Z',
    updatedAt: '2026-10-18T10:00:00Z',
  },
];

// Helper to validate circular dependencies in course prerequisites
export function validateCircularPrerequisites(courses: LearningPathCourse[]): {
  hasCycle: boolean;
  cycleCourseIds: string[];
  message: string;
} {
  const adjList = new Map<string, string[]>();
  courses.forEach((c) => {
    adjList.set(c.courseId, c.prerequisiteCourseIds || []);
  });

  const visited = new Set<string>();
  const recStack = new Set<string>();
  let cycleNodes: string[] = [];

  function dfs(courseId: string, path: string[]): boolean {
    visited.add(courseId);
    recStack.add(courseId);

    const neighbors = adjList.get(courseId) || [];
    for (const prereqId of neighbors) {
      if (!visited.has(prereqId)) {
        if (dfs(prereqId, [...path, prereqId])) {
          return true;
        }
      } else if (recStack.has(prereqId)) {
        cycleNodes = [...path, prereqId];
        return true;
      }
    }

    recStack.delete(courseId);
    return false;
  }

  for (const c of courses) {
    if (!visited.has(c.courseId)) {
      if (dfs(c.courseId, [c.courseId])) {
        return {
          hasCycle: true,
          cycleCourseIds: cycleNodes,
          message: `Circular dependency detected between courses: ${cycleNodes.join(' -> ')}`,
        };
      }
    }
  }

  return {
    hasCycle: false,
    cycleCourseIds: [],
    message: 'Prerequisite dependencies are valid and loop-free.',
  };
}

function loadInitialPaths(): LearningPath[] {
  try {
    const cached = localStorage.getItem(STORAGE_KEY_LEARNING_PATHS);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to parse cached learning paths from storage', e);
  }
  return initialLearningPaths;
}

function persistPaths(paths: LearningPath[]) {
  try {
    localStorage.setItem(STORAGE_KEY_LEARNING_PATHS, JSON.stringify(paths));
  } catch (e) {
    console.error('Failed to save learning paths to storage', e);
  }
}

interface LearningPathState {
  paths: LearningPath[];
  selectedPathId: string | null;

  // Actions
  getPathById: (id: string) => LearningPath | undefined;
  setSelectedPathId: (id: string | null) => void;
  createPath: (newPath: LearningPath) => { success: boolean; message: string; path?: LearningPath };
  updatePath: (id: string, updates: Partial<LearningPath>) => { success: boolean; message: string };
  deletePath: (id: string) => { success: boolean; message: string };
  archivePath: (id: string) => { success: boolean; message: string };
  publishPath: (id: string) => { success: boolean; message: string };
  unpublishPath: (id: string) => { success: boolean; message: string };
  assignLearners: (
    id: string,
    assignments: {
      cohortIds?: string[];
      departmentIds?: string[];
      userIds?: string[];
      estimatedLearnersCount?: number;
    }
  ) => { success: boolean; message: string };
  resetToDefaults: () => void;
}

export const useLearningPathStore = create<LearningPathState>((set, get) => ({
  paths: loadInitialPaths(),
  selectedPathId: 'lp-001',

  getPathById: (id: string) => {
    return get().paths.find((p) => p.id === id);
  },

  setSelectedPathId: (id: string | null) => {
    set({ selectedPathId: id });
  },

  createPath: (newPath: LearningPath) => {
    const { paths } = get();
    // Validate duplicate ID
    if (paths.some((p) => p.id === newPath.id)) {
      newPath.id = `lp-${Date.now()}`;
    }

    // Validate circular dependency
    const cycleCheck = validateCircularPrerequisites(newPath.courses);
    if (cycleCheck.hasCycle) {
      return { success: false, message: cycleCheck.message };
    }

    const updated = [newPath, ...paths];
    set({ paths: updated, selectedPathId: newPath.id });
    persistPaths(updated);
    return { success: true, message: 'Learning Path created successfully.', path: newPath };
  },

  updatePath: (id: string, updates: Partial<LearningPath>) => {
    const { paths } = get();
    const existing = paths.find((p) => p.id === id);
    if (!existing) {
      return { success: false, message: 'Learning Path not found.' };
    }

    // If courses changed, check circular dependency
    if (updates.courses) {
      const cycleCheck = validateCircularPrerequisites(updates.courses);
      if (cycleCheck.hasCycle) {
        return { success: false, message: cycleCheck.message };
      }
    }

    const updated = paths.map((p) => {
      if (p.id === id) {
        return {
          ...p,
          ...updates,
          updatedAt: new Date().toISOString(),
        };
      }
      return p;
    });

    set({ paths: updated });
    persistPaths(updated);
    return { success: true, message: 'Learning Path updated successfully.' };
  },

  deletePath: (id: string) => {
    const { paths, selectedPathId } = get();
    const updated = paths.filter((p) => p.id !== id);
    const newSelectedId = selectedPathId === id ? (updated[0]?.id || null) : selectedPathId;
    set({ paths: updated, selectedPathId: newSelectedId });
    persistPaths(updated);
    return { success: true, message: 'Learning Path deleted successfully.' };
  },

  archivePath: (id: string) => {
    return get().updatePath(id, { status: 'archived' });
  },

  publishPath: (id: string) => {
    const path = get().getPathById(id);
    if (!path) return { success: false, message: 'Path not found.' };
    if (!path.courses || path.courses.length === 0) {
      return { success: false, message: 'Cannot publish a Learning Path with zero courses. Add at least one course.' };
    }
    return get().updatePath(id, { status: 'published' });
  },

  unpublishPath: (id: string) => {
    return get().updatePath(id, { status: 'draft' });
  },

  assignLearners: (id: string, assignments) => {
    const { paths } = get();
    const path = paths.find((p) => p.id === id);
    if (!path) return { success: false, message: 'Path not found.' };

    const assignedCohortIds = assignments.cohortIds ?? path.assignedCohortIds ?? [];
    const assignedDepartmentIds = assignments.departmentIds ?? path.assignedDepartmentIds ?? [];
    const assignedUserIds = assignments.userIds ?? path.assignedUserIds ?? [];
    const learnerCount = assignments.estimatedLearnersCount ?? path.learnerCount ?? 0;

    const updated = paths.map((p) => {
      if (p.id === id) {
        return {
          ...p,
          assignedCohortIds,
          assignedDepartmentIds,
          assignedUserIds,
          learnerCount,
          updatedAt: new Date().toISOString(),
        };
      }
      return p;
    });

    set({ paths: updated });
    persistPaths(updated);
    return {
      success: true,
      message: `Assigned ${learnerCount} learners across selected cohorts and departments.`,
    };
  },

  resetToDefaults: () => {
    set({ paths: initialLearningPaths, selectedPathId: 'lp-001' });
    persistPaths(initialLearningPaths);
  },
}));
