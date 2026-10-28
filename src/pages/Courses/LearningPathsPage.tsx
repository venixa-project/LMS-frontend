import React, { useState, useMemo } from 'react';
import { useAuthStore } from '../../lib/store';
import { useCourseStore } from '../../lib/courseStore';
import { useCohortStore } from '../../lib/cohortStore';
import { usePeopleStore } from '../../lib/peopleStore';
import {
  useLearningPathStore,
  PATH_TEMPLATE_PRESETS,
  validateCircularPrerequisites,
  PathTemplatePreset,
} from '../../lib/learningPathStore';
import { mockDepartments, mockOrganizations } from '../../data/mockData';
import {
  LearningPath,
  LearningPathCourse,
  LearningPathInstitutionType,
  LearningPathDifficulty,
  EntityStatus,
  Course,
} from '../../types';
import { Link } from 'react-router-dom';
import { BackToCoursesButton } from '../../components/BackToCoursesButton';
import {
  Route,
  Plus,
  Search,
  BookOpen,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  X,
  Award,
  Play,
  Building2,
  GraduationCap,
  School,
  Briefcase,
  Layers,
  Lock,
  ArrowUp,
  ArrowDown,
  Trash2,
  Edit3,
  Eye,
  Archive,
  Users,
  Check,
  Sparkles,
  RefreshCw,
  Sliders,
  CheckCircle,
  FileCheck,
  Info,
} from 'lucide-react';

// Helper to detect institution type from organization name, slug, or profile
export const detectOrganizationType = (orgNameOrSlug?: string): LearningPathInstitutionType => {
  if (!orgNameOrSlug) return 'corporate';
  const lower = orgNameOrSlug.toLowerCase();
  if (lower.includes('school') || lower.includes('k12') || lower.includes('k-12')) return 'school';
  if (lower.includes('university') || lower.includes('college') || lower.includes('campus') || lower.includes('.edu')) return 'higher_ed';
  if (lower.includes('academy') || lower.includes('institute') || lower.includes('bootcamp') || lower.includes('training')) return 'training_institute';
  if (lower.includes('corp') || lower.includes('inc') || lower.includes('company') || lower.includes('enterprise')) return 'corporate';
  return 'corporate';
};

export const LearningPathsPage: React.FC = () => {
  const { user } = useAuthStore();
  const { courses } = useCourseStore();
  const { cohorts } = useCohortStore();
  const { users: peopleList } = usePeopleStore();
  const {
    paths,
    createPath,
    updatePath,
    deletePath,
    archivePath,
    publishPath,
    unpublishPath,
    assignLearners,
    resetToDefaults,
  } = useLearningPathStore();

  // Role permissions
  const activeRole = user?.activeRole || 'student';
  const isPlatformAdmin = activeRole === 'platform_admin';
  const isOrgAdmin = activeRole === 'org_admin' || activeRole === 'lms_admin' || (activeRole as string) === 'industrial_admin';
  const isTrainer = activeRole === 'trainer' || activeRole === 'instructor' || activeRole === 'assessment_author';
  const isLearner = activeRole === 'student' || activeRole === 'learner' || activeRole === 'guest';

  // Permission helpers
  const canCreatePath = !isLearner;
  const canManagePath = (path: LearningPath) => {
    if (isLearner) return false;
    if (isPlatformAdmin) return true;
    if (isOrgAdmin && path.organizationId === (user?.organizationId || 'org-001')) return true;
    if (isTrainer && path.createdBy === user?.id) return true;
    return false;
  };

  // State: Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft' | 'archived'>('all');
  const [institutionFilter, setInstitutionFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [creatorFilter, setCreatorFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // State: Modals & Drawers
  const [selectedPath, setSelectedPath] = useState<LearningPath | null>(paths[0] || null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [editingPathId, setEditingPathId] = useState<string | null>(null);

  // State: Confirmation Modals
  const [pathToAction, setPathToAction] = useState<LearningPath | null>(null);
  const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  // Organization detection from active user organization profile
  const userOrg = useMemo(() => {
    return mockOrganizations.find((o) => o.id === (user?.organizationId || 'org-001'));
  }, [user]);

  const detectedOrgType: LearningPathInstitutionType = useMemo(() => {
    return detectOrganizationType(userOrg?.name || userOrg?.slug);
  }, [userOrg]);

  // Builder Form State (4 Steps Workflow)
  const [builderStep, setBuilderStep] = useState<1 | 2 | 3 | 4>(1);
  const [templateOrgType, setTemplateOrgType] = useState<LearningPathInstitutionType>(detectedOrgType);
  const [suggestionOffset, setSuggestionOffset] = useState<number>(0);
  const [showAllTemplatesModal, setShowAllTemplatesModal] = useState<boolean>(false);
  const [showAdvancedRules, setShowAdvancedRules] = useState<boolean>(false);
  const [assignLearnerSearch, setAssignLearnerSearch] = useState<string>('');

  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formObjective, setFormObjective] = useState('');
  const [formInstitutionType, setFormInstitutionType] = useState<LearningPathInstitutionType>('corporate');
  const [formCategory, setFormCategory] = useState('Employee Onboarding');
  const [formDifficulty, setFormDifficulty] = useState<LearningPathDifficulty>('Beginner');
  const [formTargetGroup, setFormTargetGroup] = useState('Engineering & Technology');
  const [formTargetRole, setFormTargetRole] = useState('Associate Engineer');
  const [formDepartmentId, setFormDepartmentId] = useState('dep-001');
  const [formThumbnail, setFormThumbnail] = useState('');
  const [formStatus, setFormStatus] = useState<EntityStatus>('published');

  // Builder Courses State
  const [formCourses, setFormCourses] = useState<LearningPathCourse[]>([]);
  const [courseSearchInput, setCourseSearchInput] = useState('');
  const [courseCategoryFilter, setCourseCategoryFilter] = useState('all');

  // Builder Rules State
  const [formEnforceSequence, setFormEnforceSequence] = useState(true);
  const [formRequireAssessments, setFormRequireAssessments] = useState(true);
  const [formCompletionThreshold, setFormCompletionThreshold] = useState(80);
  const [formCertificateEligible, setFormCertificateEligible] = useState(true);
  const [formCertificateTitle, setFormCertificateTitle] = useState('Verified Learning Path Credential');

  // Builder Assignment State
  const [formCohortIds, setFormCohortIds] = useState<string[]>([]);
  const [formDepartmentIds, setFormDepartmentIds] = useState<string[]>([]);
  const [formUserIds, setFormUserIds] = useState<string[]>([]);

  // Builder Validation & Navigation
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [visitedSteps, setVisitedSteps] = useState<number[]>([1]);
  const [builderErrors, setBuilderErrors] = useState<string[]>([]);

  // Filter presets by templateOrgType
  const relevantTemplates = useMemo(() => {
    return PATH_TEMPLATE_PRESETS.filter((t) => t.institutionType === templateOrgType);
  }, [templateOrgType]);

  // Exactly 3 suggestions displayed at a time (cycles cleanly without repeating until exhausted)
  const currentSuggestions = useMemo(() => {
    if (relevantTemplates.length <= 3) return relevantTemplates;
    const startIndex = suggestionOffset % relevantTemplates.length;
    const result: PathTemplatePreset[] = [];
    for (let i = 0; i < 3; i++) {
      const idx = (startIndex + i) % relevantTemplates.length;
      result.push(relevantTemplates[idx]);
    }
    return result;
  }, [relevantTemplates, suggestionOffset]);

  // Refresh suggestions action
  const handleRefreshSuggestions = () => {
    if (relevantTemplates.length <= 3) return;
    setSuggestionOffset((prev) => (prev + 3) % relevantTemplates.length);
  };

  // Create from scratch action
  const handleSelectCreateFromScratch = () => {
    setSelectedTemplateId('scratch');
    if (PATH_TEMPLATE_PRESETS.some((p) => p.name === formTitle.trim())) {
      setFormTitle('');
    }
    if (PATH_TEMPLATE_PRESETS.some((p) => p.description === formDescription.trim())) {
      setFormDescription('');
    }
    setFormCourses([]);
    setBuilderErrors([]);
  };

  // Courses accessible to current user for builder
  const availableCourses = useMemo(() => {
    return courses.filter((c) => {
      if (isPlatformAdmin || isOrgAdmin) return true;
      if (isTrainer) {
        // Faculty can add courses they authored or that are public within their organization
        const isAuthor = c.createdBy === user?.id || (c.instructors && c.instructors.includes(user?.id || ''));
        const isOrgPublic = c.visibility === 'public';
        return isAuthor || isOrgPublic;
      }
      return c.status === 'published';
    });
  }, [courses, isPlatformAdmin, isOrgAdmin, isTrainer, user]);

  // Filtered Paths for view
  const filteredPaths = useMemo(() => {
    return paths.filter((p) => {
      // 1. Role Boundary: Learners only see published paths assigned or relevant to them
      if (isLearner && p.status !== 'published') {
        return false;
      }
      // Institution Boundary: non-platform admins only see their own org
      if (!isPlatformAdmin && user?.organizationId && p.organizationId && p.organizationId !== user.organizationId) {
        return false;
      }

      // 2. Status Filter
      if (statusFilter !== 'all' && p.status !== statusFilter) {
        return false;
      }

      // 3. Institution Type Filter
      if (institutionFilter !== 'all') {
        const pType = p.institutionType || 'general';
        if (pType !== institutionFilter) return false;
      }

      // 4. Category Filter
      if (categoryFilter !== 'all' && p.category !== categoryFilter) {
        return false;
      }

      // 5. Creator Filter
      if (creatorFilter === 'me' && p.createdBy !== user?.id) {
        return false;
      }
      if (creatorFilter === 'faculty' && p.creatorRole && !p.creatorRole.toLowerCase().includes('faculty') && !p.creatorRole.toLowerCase().includes('trainer')) {
        return false;
      }
      if (creatorFilter === 'admin' && p.creatorRole && !p.creatorRole.toLowerCase().includes('admin')) {
        return false;
      }

      // 6. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = p.title.toLowerCase().includes(q);
        const matchesDesc = (p.description || '').toLowerCase().includes(q);
        const matchesCat = (p.category || '').toLowerCase().includes(q);
        const matchesCreator = (p.creatorName || '').toLowerCase().includes(q);
        const matchesRole = (p.targetRole || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesCat && !matchesCreator && !matchesRole) {
          return false;
        }
      }

      return true;
    });
  }, [paths, isLearner, isPlatformAdmin, user, statusFilter, institutionFilter, categoryFilter, creatorFilter, searchQuery]);

  // Categories list extracted dynamically
  const uniqueCategories = useMemo(() => {
    const set = new Set<string>();
    paths.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [paths]);

  // Calculate live hours for a course list
  const calculateTotalDuration = (courseItems: LearningPathCourse[]) => {
    let totalHrs = 0;
    courseItems.forEach((ci) => {
      const c = courses.find((crs) => crs.id === ci.courseId);
      if (c) {
        const hrs = c.durationHours || (c.estimatedDuration ? Math.round(c.estimatedDuration / 60) : 0);
        totalHrs += hrs;
      }
    });
    return totalHrs;
  };

  // Helper for Institution Type formatting & badge
  const renderInstitutionBadge = (type?: LearningPathInstitutionType) => {
    switch (type) {
      case 'school':
        return (
          <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)', gap: '4px' }}>
            <School size={12} /> School (K-12)
          </span>
        );
      case 'higher_ed':
        return (
          <span className="badge" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#c084fc', border: '1px solid rgba(139, 92, 246, 0.3)', gap: '4px' }}>
            <GraduationCap size={12} /> University & College
          </span>
        );
      case 'corporate':
        return (
          <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)', gap: '4px' }}>
            <Building2 size={12} /> Corporate Company
          </span>
        );
      case 'training_institute':
        return (
          <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)', gap: '4px' }}>
            <Award size={12} /> Training Institute
          </span>
        );
      default:
        return (
          <span className="badge" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#a5b4fc', border: '1px solid rgba(99, 102, 241, 0.3)', gap: '4px' }}>
            <Route size={12} /> General Track
          </span>
        );
    }
  };

  // Helper for Status badge
  const renderStatusBadge = (status: EntityStatus) => {
    switch (status) {
      case 'published':
        return <span className="badge badge-success">Published</span>;
      case 'draft':
        return <span className="badge badge-draft">Draft</span>;
      case 'archived':
        return <span className="badge badge-error">Archived</span>;
      default:
        return <span className="badge badge-secondary">{status}</span>;
    }
  };

  // Open Create Builder
  const handleOpenCreateBuilder = () => {
    setEditingPathId(null);
    setBuilderStep(1);
    setSelectedTemplateId(null);
    setVisitedSteps([1]);
    setTemplateOrgType(detectedOrgType);
    setSuggestionOffset(0);
    setShowAllTemplatesModal(false);
    setShowAdvancedRules(false);
    setFormTitle('');
    setFormDescription('');
    setFormObjective('');
    setFormInstitutionType(detectedOrgType);
    setFormCategory(
      detectedOrgType === 'corporate'
        ? 'Employee Onboarding'
        : detectedOrgType === 'higher_ed'
        ? 'Department-Specific Subjects'
        : detectedOrgType === 'school'
        ? 'Grade-Wise Learning Paths'
        : 'Certification Preparation'
    );
    setFormDifficulty('Beginner');
    setFormTargetGroup('');
    setFormTargetRole('');
    setFormDepartmentId('dep-001');
    setFormThumbnail('');
    setFormStatus('published');
    setFormCourses([]);
    setFormEnforceSequence(true);
    setFormRequireAssessments(true);
    setFormCompletionThreshold(80);
    setFormCertificateEligible(true);
    setFormCertificateTitle('Verified Learning Path Credential');
    setFormCohortIds([]);
    setFormDepartmentIds([]);
    setFormUserIds([]);
    setBuilderErrors([]);
    setIsBuilderOpen(true);
  };

  // Open Edit Builder
  const handleOpenEditBuilder = (path: LearningPath) => {
    setEditingPathId(path.id);
    setBuilderStep(1);
    setSelectedTemplateId(null);
    setVisitedSteps([1, 2, 3, 4]);
    setTemplateOrgType(path.institutionType || detectedOrgType);
    setSuggestionOffset(0);
    setShowAllTemplatesModal(false);
    setShowAdvancedRules(false);
    setFormTitle(path.title);
    setFormDescription(path.description || '');
    setFormObjective(path.objective || '');
    setFormInstitutionType(path.institutionType || detectedOrgType);
    setFormCategory(path.category || 'General Curriculum');
    setFormDifficulty(path.difficulty || 'Beginner');
    setFormTargetGroup(path.targetGroup || path.audience || '');
    setFormTargetRole(path.targetRole || '');
    setFormDepartmentId(path.departmentId || 'dep-001');
    setFormThumbnail(path.thumbnail || '');
    setFormStatus(path.status);
    setFormCourses([...path.courses]);
    setFormEnforceSequence(path.enforceSequence !== false);
    setFormRequireAssessments(path.requirePassingAssessments !== false);
    setFormCompletionThreshold(path.completionThreshold || 80);
    setFormCertificateEligible(path.certificateEligible !== false);
    setFormCertificateTitle(path.certificateTitle || `${path.title} Credential`);
    setFormCohortIds(path.assignedCohortIds || []);
    setFormDepartmentIds(path.assignedDepartmentIds || []);
    setFormUserIds(path.assignedUserIds || []);
    setBuilderErrors([]);
    setIsBuilderOpen(true);
  };

  // Step validation helpers (4-step model)
  const isStep1Valid = Boolean(formTitle.trim());
  const isStep2Valid = formCourses.length > 0 && !validateCircularPrerequisites(formCourses).hasCycle;
  const isStep3Valid = true;
  const isStep4Valid = isStep1Valid && isStep2Valid;
  const isAllRequiredValid = isStep1Valid && isStep2Valid;

  const getStepValidationMessage = (step: number): string | null => {
    if (step === 1 && !isStep1Valid) {
      return 'Enter a Learning Path Name to proceed';
    }
    if (step === 2) {
      if (formCourses.length === 0) return 'Add at least 1 course to proceed';
      const cycle = validateCircularPrerequisites(formCourses);
      if (cycle.hasCycle) return cycle.message;
    }
    return null;
  };

  const isCurrentStepValid = (step: number): boolean => {
    if (step === 1) return isStep1Valid;
    if (step === 2) return isStep2Valid;
    return true;
  };

  const handleStepNavigation = (targetStep: 1 | 2 | 3 | 4) => {
    if (targetStep === builderStep) return;

    // Moving backward is always allowed
    if (targetStep < builderStep) {
      setBuilderStep(targetStep);
      return;
    }

    // Moving forward requires current step validity
    const currentError = getStepValidationMessage(builderStep);
    if (currentError) {
      setBuilderErrors([currentError]);
      return;
    }

    setBuilderErrors([]);
    setVisitedSteps((prev) => (prev.includes(targetStep) ? prev : [...prev, targetStep]));
    setBuilderStep(targetStep);
  };

  // Apply Quick-Start Template
  const handleApplyTemplate = (preset: PathTemplatePreset) => {
    setSelectedTemplateId(preset.id);

    // Only auto-populate title/description/objective if empty or currently matching a template name
    const isTitleEmptyOrTemplate = !formTitle.trim() || PATH_TEMPLATE_PRESETS.some((p) => p.name === formTitle.trim());
    if (isTitleEmptyOrTemplate) {
      setFormTitle(preset.name);
    }
    const isDescEmptyOrTemplate = !formDescription.trim() || PATH_TEMPLATE_PRESETS.some((p) => p.description === formDescription.trim());
    if (isDescEmptyOrTemplate) {
      setFormDescription(preset.description);
    }
    const isObjEmptyOrTemplate = !formObjective.trim() || PATH_TEMPLATE_PRESETS.some((p) => p.objective === formObjective.trim());
    if (isObjEmptyOrTemplate) {
      setFormObjective(preset.objective);
    }

    setFormInstitutionType(preset.institutionType);
    setFormCategory(preset.category);
    setFormDifficulty(preset.difficulty);
    setFormTargetGroup(preset.targetGroup);
    setFormTargetRole(preset.targetRole);
    setFormEnforceSequence(preset.enforceSequence);
    setFormRequireAssessments(preset.requirePassingAssessments);
    setFormCompletionThreshold(preset.completionThreshold);
    setFormCertificateEligible(preset.certificateEligible);
    setFormCertificateTitle(preset.certificateTitle || `${preset.name} Certificate`);

    // Setup sequence if courses are empty or unchanged default seed
    const isDefaultSeedCourses = formCourses.length === 2 && formCourses[0]?.courseId === 'crs-001' && formCourses[1]?.courseId === 'crs-004';
    if (formCourses.length === 0 || isDefaultSeedCourses) {
      const templatedCourses: LearningPathCourse[] = preset.defaultCourseIds.map((cId, idx) => ({
        courseId: cId,
        order: idx + 1,
        isRequired: true,
        prerequisiteCourseIds: idx > 0 ? [preset.defaultCourseIds[idx - 1]] : [],
      }));
      setFormCourses(templatedCourses);
    }

    setBuilderErrors([]);
  };

  // Add course to form
  const handleAddCourseToForm = (courseId: string) => {
    if (formCourses.some((c) => c.courseId === courseId)) {
      setBuilderErrors(['This course is already added to the learning path sequence.']);
      return;
    }
    const newOrder = formCourses.length + 1;
    const newCourseItem: LearningPathCourse = {
      courseId,
      order: newOrder,
      isRequired: true,
      prerequisiteCourseIds: [],
    };
    setFormCourses([...formCourses, newCourseItem]);
    setBuilderErrors([]);
  };

  // Remove course from form
  const handleRemoveCourseFromForm = (courseId: string) => {
    const filtered = formCourses.filter((c) => c.courseId !== courseId);
    // Re-index order and clean up prerequisites that referenced the removed course
    const reindexed = filtered.map((c, idx) => ({
      ...c,
      order: idx + 1,
      prerequisiteCourseIds: (c.prerequisiteCourseIds || []).filter((id) => id !== courseId),
    }));
    setFormCourses(reindexed);
  };

  // Move course up
  const handleMoveCourseUp = (index: number) => {
    if (index <= 0) return;
    const updated = [...formCourses];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    // Re-index orders
    const reindexed = updated.map((c, idx) => ({ ...c, order: idx + 1 }));
    setFormCourses(reindexed);
  };

  // Move course down
  const handleMoveCourseDown = (index: number) => {
    if (index >= formCourses.length - 1) return;
    const updated = [...formCourses];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    // Re-index orders
    const reindexed = updated.map((c, idx) => ({ ...c, order: idx + 1 }));
    setFormCourses(reindexed);
  };

  // Update prerequisites for a specific course step
  const handleTogglePrerequisite = (courseId: string, prereqId: string) => {
    const updated = formCourses.map((c) => {
      if (c.courseId === courseId) {
        const currentPrereqs = c.prerequisiteCourseIds || [];
        const exists = currentPrereqs.includes(prereqId);
        const newPrereqs = exists
          ? currentPrereqs.filter((id) => id !== prereqId)
          : [...currentPrereqs, prereqId];
        return { ...c, prerequisiteCourseIds: newPrereqs };
      }
      return c;
    });

    const cycleResult = validateCircularPrerequisites(updated);
    if (cycleResult.hasCycle) {
      setBuilderErrors([cycleResult.message]);
    } else {
      setBuilderErrors([]);
    }
    setFormCourses(updated);
  };

  // Save Path (Draft or Published)
  const handleSavePath = (targetStatus: 'draft' | 'published') => {
    setBuilderErrors([]);

    // Required field validation
    if (!formTitle.trim()) {
      setBuilderErrors(['Learning Path Name is required.']);
      setBuilderStep(1);
      return;
    }

    if (targetStatus === 'published' && formCourses.length === 0) {
      setBuilderErrors(['A published Learning Path must contain at least 1 course. Add courses before publishing.']);
      setBuilderStep(2);
      return;
    }

    // Circular dependency check
    const cycleCheck = validateCircularPrerequisites(formCourses);
    if (cycleCheck.hasCycle) {
      setBuilderErrors([cycleCheck.message]);
      setBuilderStep(2);
      return;
    }

    const calculatedHrs = calculateTotalDuration(formCourses);

    // Calculate realistic learner count from selected cohorts/users
    let totalLearners = 0;
    formCohortIds.forEach((cId) => {
      const coh = cohorts.find((c) => c.id === cId);
      if (coh) totalLearners += coh.learnerCount || (coh.studentIds?.length || 0);
    });
    totalLearners += formUserIds.length;

    if (editingPathId) {
      // Editing existing path
      const existing = paths.find((p) => p.id === editingPathId);
      const res = updatePath(editingPathId, {
        title: formTitle.trim(),
        description: formDescription.trim(),
        objective: formObjective.trim(),
        institutionType: formInstitutionType,
        category: formCategory,
        difficulty: formDifficulty,
        targetGroup: formTargetGroup,
        targetRole: formTargetRole,
        departmentId: formDepartmentId,
        thumbnail: formThumbnail,
        status: targetStatus,
        courses: formCourses,
        courseIds: formCourses.map((c) => c.courseId),
        estimatedHours: calculatedHrs,
        enforceSequence: formEnforceSequence,
        requirePassingAssessments: formRequireAssessments,
        completionThreshold: formCompletionThreshold,
        certificateEligible: formCertificateEligible,
        certificateTitle: formCertificateTitle,
        assignedCohortIds: formCohortIds,
        assignedDepartmentIds: formDepartmentIds,
        assignedUserIds: formUserIds,
        learnerCount: totalLearners > 0 ? totalLearners : existing?.learnerCount || 0,
      });

      if (!res.success) {
        setBuilderErrors([res.message]);
        return;
      }
      setIsBuilderOpen(false);
      const updated = paths.find((p) => p.id === editingPathId);
      if (updated) setSelectedPath(updated);
    } else {
      // Creating new path
      const creatorRoleString = isTrainer
        ? 'Faculty / Lead Trainer'
        : isOrgAdmin
        ? 'Institution Admin'
        : 'Platform Administrator';

      const newPath: LearningPath = {
        id: `lp-${Date.now()}`,
        title: formTitle.trim(),
        description: formDescription.trim(),
        objective: formObjective.trim(),
        institutionType: formInstitutionType,
        category: formCategory,
        difficulty: formDifficulty,
        targetGroup: formTargetGroup,
        targetRole: formTargetRole,
        departmentId: formDepartmentId,
        thumbnail: formThumbnail,
        status: targetStatus,
        organizationId: user?.organizationId || 'org-001',
        createdBy: user?.id || 'u-004',
        creatorName: user?.displayName || 'Faculty Member',
        creatorRole: creatorRoleString,
        courses: formCourses,
        courseIds: formCourses.map((c) => c.courseId),
        prerequisites: [],
        estimatedHours: calculatedHrs,
        enforceSequence: formEnforceSequence,
        requirePassingAssessments: formRequireAssessments,
        completionThreshold: formCompletionThreshold,
        certificateEligible: formCertificateEligible,
        certificateTitle: formCertificateTitle,
        assignedCohortIds: formCohortIds,
        assignedDepartmentIds: formDepartmentIds,
        assignedUserIds: formUserIds,
        learnerCount: totalLearners > 0 ? totalLearners : 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const res = createPath(newPath);
      if (!res.success) {
        setBuilderErrors([res.message]);
        return;
      }
      setIsBuilderOpen(false);
      setSelectedPath(newPath);
    }
  };

  // Perform Archive Action with confirmation
  const handleArchiveConfirm = () => {
    if (!pathToAction) return;
    archivePath(pathToAction.id);
    setIsArchiveConfirmOpen(false);
    setPathToAction(null);
    if (selectedPath?.id === pathToAction.id) {
      setSelectedPath({ ...selectedPath, status: 'archived' });
    }
  };

  // Perform Delete Action with confirmation
  const handleDeleteConfirm = () => {
    if (!pathToAction) return;
    deletePath(pathToAction.id);
    setIsDeleteConfirmOpen(false);
    setPathToAction(null);
    if (selectedPath?.id === pathToAction.id) {
      setSelectedPath(paths.find((p) => p.id !== pathToAction.id) || null);
    }
  };

  // Check if any course in a path is draft/archived
  const getCourseWarningInfo = (courseId: string) => {
    const crs = courses.find((c) => c.id === courseId);
    if (!crs) return { isMissing: true, isDraft: false, status: 'missing' };
    return {
      isMissing: false,
      isDraft: crs.status === 'draft',
      isArchived: crs.status === 'archived',
      status: crs.status,
      title: crs.title,
    };
  };

  return (
    <div className="learning-paths-container" style={{ paddingBottom: '40px' }}>
      {/* Navigation & Header */}
      <div style={{ marginBottom: '16px' }}>
        <BackToCoursesButton />
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span className="badge badge-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Route size={14} /> Multi-Tenant Learning Paths
            </span>
            <span className="text-muted text-xs">
              Role: <strong style={{ color: 'var(--text-main)' }}>{activeRole.replace('_', ' ').toUpperCase()}</strong>
            </span>
          </div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
            Learning Paths
          </h1>
          <p className="text-secondary text-sm" style={{ marginTop: '4px', marginBottom: 0 }}>
            Organize courses into structured learning journeys.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {canCreatePath ? (
            <button
              className="btn btn-primary"
              id="create-learning-path-btn"
              onClick={handleOpenCreateBuilder}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px' }}
            >
              <Plus size={16} /> Create Learning Path
            </button>
          ) : (
            <Link to="/my-learning" className="btn btn-primary" style={{ gap: '6px' }}>
              <BookOpen size={16} /> View Enrolled Courses
            </Link>
          )}
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '14px',
          marginBottom: '24px',
        }}
      >
        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(99, 102, 241, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary)',
            }}
          >
            <Route size={22} />
          </div>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.1 }}>
              {paths.length}
            </div>
            <div className="text-muted text-xs font-semibold" style={{ marginTop: '2px' }}>
              Total Learning Paths
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(16, 185, 129, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--success)',
            }}
          >
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.1 }}>
              {paths.filter((p) => p.status === 'published').length}
            </div>
            <div className="text-muted text-xs font-semibold" style={{ marginTop: '2px' }}>
              Active Published Journeys
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(6, 182, 212, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-cyan)',
            }}
          >
            <Layers size={22} />
          </div>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.1 }}>
              {courses.length}
            </div>
            <div className="text-muted text-xs font-semibold" style={{ marginTop: '2px' }}>
              Catalog Courses Available
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(245, 158, 11, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--warning)',
            }}
          >
            <Users size={22} />
          </div>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.1 }}>
              {paths.reduce((acc, p) => acc + (p.learnerCount || 0), 0)}
            </div>
            <div className="text-muted text-xs font-semibold" style={{ marginTop: '2px' }}>
              Active Enrolled Learners
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div
        className="card"
        style={{
          padding: '16px 20px',
          marginBottom: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          {/* Search Field */}
          <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: '420px' }}>
            <Search
              size={16}
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
            />
            <input
              type="text"
              className="form-input"
              placeholder="Search by title, description, category, or creator..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '36px', height: '38px', fontSize: '0.875rem' }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Quick Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Institution Filter */}
            <select
              className="form-input"
              value={institutionFilter}
              onChange={(e) => setInstitutionFilter(e.target.value)}
              style={{ width: 'auto', minWidth: '160px', height: '38px', fontSize: '0.85rem' }}
              aria-label="Filter by Institution Purpose"
            >
              <option value="all">All Institutions</option>
              <option value="corporate">Corporate Companies</option>
              <option value="higher_ed">Colleges & Universities</option>
              <option value="school">Schools (K-12)</option>
              <option value="training_institute">Training Institutes</option>
            </select>

            {/* Status Filter */}
            <select
              className="form-input"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              style={{ width: 'auto', minWidth: '130px', height: '38px', fontSize: '0.85rem' }}
              aria-label="Filter by Status"
            >
              <option value="all">All Statuses</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>

            {/* Category Filter */}
            {uniqueCategories.length > 0 && (
              <select
                className="form-input"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                style={{ width: 'auto', minWidth: '140px', height: '38px', fontSize: '0.85rem' }}
                aria-label="Filter by Category"
              >
                <option value="all">All Categories</option>
                {uniqueCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            )}

            {/* Creator Filter (for non-learners) */}
            {!isLearner && (
              <select
                className="form-input"
                value={creatorFilter}
                onChange={(e) => setCreatorFilter(e.target.value)}
                style={{ width: 'auto', minWidth: '140px', height: '38px', fontSize: '0.85rem' }}
                aria-label="Filter by Creator"
              >
                <option value="all">All Creators</option>
                <option value="me">Created by Me</option>
                <option value="faculty">Faculty / Trainers</option>
                <option value="admin">Institution Admins</option>
              </select>
            )}

            {/* View Mode Toggle */}
            <div
              style={{
                display: 'flex',
                background: 'var(--bg-input)',
                borderRadius: 'var(--radius-md)',
                padding: '2px',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <button
                type="button"
                className={`btn btn-xs ${viewMode === 'grid' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setViewMode('grid')}
                style={{ padding: '6px 10px' }}
                title="Grid Card View"
              >
                Grid
              </button>
              <button
                type="button"
                className={`btn btn-xs ${viewMode === 'list' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setViewMode('list')}
                style={{ padding: '6px 10px' }}
                title="Compact List View"
              >
                List
              </button>
            </div>
          </div>
        </div>

        {/* Active Filters Summary if filtered */}
        {(statusFilter !== 'all' || institutionFilter !== 'all' || categoryFilter !== 'all' || creatorFilter !== 'all' || searchQuery) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
            <span>Active filters:</span>
            {searchQuery && <span className="badge badge-secondary">Search: "{searchQuery}"</span>}
            {institutionFilter !== 'all' && <span className="badge badge-primary">Type: {institutionFilter}</span>}
            {statusFilter !== 'all' && <span className="badge badge-secondary">Status: {statusFilter}</span>}
            {categoryFilter !== 'all' && <span className="badge badge-secondary">Category: {categoryFilter}</span>}
            {creatorFilter !== 'all' && <span className="badge badge-secondary">Creator: {creatorFilter}</span>}
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setInstitutionFilter('all');
                setCategoryFilter('all');
                setCreatorFilter('all');
              }}
              style={{ color: 'var(--primary)', cursor: 'pointer', padding: '2px 6px' }}
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area: Cards/List + Detail Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedPath ? '1fr 420px' : '1fr', gap: '24px', alignItems: 'start' }}>
        {/* Left Column: Learning Paths Collection */}
        <div>
          {filteredPaths.length === 0 ? (
            <div
              className="card"
              style={{
                padding: '48px 24px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Route size={48} color="var(--text-muted)" style={{ marginBottom: '16px', opacity: 0.6 }} />
              <h3 style={{ fontSize: '1.15rem', marginBottom: '8px' }}>No Learning Paths Found</h3>
              <p className="text-muted text-sm" style={{ maxWidth: '420px', marginBottom: '20px' }}>
                No learning paths match the selected criteria. Try adjusting your search term, clearing status filters, or create a new learning journey.
              </p>
              {canCreatePath && (
                <button className="btn btn-primary" onClick={handleOpenCreateBuilder}>
                  <Plus size={16} /> Create Learning Path
                </button>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            /* Grid View */
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
              {filteredPaths.map((p) => {
                const isSelected = selectedPath?.id === p.id;
                const totalHrs = calculateTotalDuration(p.courses) || p.estimatedHours;
                const canManage = canManagePath(p);

                return (
                  <div
                    key={p.id}
                    className="card"
                    onClick={() => setSelectedPath(p)}
                    style={{
                      padding: '18px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      borderRadius: 'var(--radius-lg)',
                      border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
                      background: isSelected ? 'var(--bg-card-hover)' : 'var(--bg-card)',
                      cursor: 'pointer',
                      transition: 'var(--transition)',
                      position: 'relative',
                    }}
                  >
                    <div>
                      {/* Top Badges */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', gap: '8px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          {renderInstitutionBadge(p.institutionType)}
                          {p.category && <span className="badge badge-secondary">{p.category}</span>}
                        </div>
                        {renderStatusBadge(p.status)}
                      </div>

                      {/* Path Title */}
                      <h3
                        style={{
                          fontSize: '1.1rem',
                          fontWeight: 700,
                          marginBottom: '8px',
                          color: isSelected ? 'var(--primary)' : 'var(--text-main)',
                          lineHeight: 1.3,
                        }}
                      >
                        {p.title}
                      </h3>

                      {/* Description */}
                      <p
                        className="text-secondary text-xs"
                        style={{
                          marginBottom: '14px',
                          lineHeight: 1.5,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {p.description || p.objective || 'Structured sequence of courses organized into a focused learning journey.'}
                      </p>

                      {/* Course Sequence Metrics */}
                      <div
                        style={{
                          background: 'var(--bg-input)',
                          padding: '10px 12px',
                          borderRadius: 'var(--radius-md)',
                          marginBottom: '14px',
                          display: 'grid',
                          gridTemplateColumns: 'repeat(3, 1fr)',
                          gap: '8px',
                          textAlign: 'center',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                            {p.courses.length}
                          </div>
                          <div className="text-muted text-xs" style={{ fontSize: '0.7rem' }}>
                            Courses
                          </div>
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                            {totalHrs && totalHrs > 0 ? `${totalHrs} hrs` : 'Self-paced'}
                          </div>
                          <div className="text-muted text-xs" style={{ fontSize: '0.7rem' }}>
                            Duration
                          </div>
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                            {p.difficulty || 'All Levels'}
                          </div>
                          <div className="text-muted text-xs" style={{ fontSize: '0.7rem' }}>
                            Level
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Metadata & Actions */}
                    <div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingTop: '12px',
                          borderTop: '1px solid var(--border-subtle)',
                          fontSize: '0.75rem',
                          color: 'var(--text-muted)',
                        }}
                      >
                        <div>
                          <span>By </span>
                          <strong style={{ color: 'var(--text-secondary)' }}>{p.creatorName || 'Faculty Lead'}</strong>
                          {p.creatorRole && (
                            <span style={{ display: 'block', fontSize: '0.7rem', opacity: 0.8 }}>
                              {p.creatorRole}
                            </span>
                          )}
                        </div>

                        {p.learnerCount !== undefined && p.learnerCount > 0 ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-main)' }}>
                            <Users size={12} color="var(--primary)" />
                            <span>{p.learnerCount} learners</span>
                          </div>
                        ) : (
                          <span className="text-muted" style={{ fontSize: '0.7rem' }}>Open Enrollment</span>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px', marginTop: '12px' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPath(p);
                            setIsDetailDrawerOpen(true);
                          }}
                          style={{ gap: '4px' }}
                        >
                          <Eye size={12} /> Inspect
                        </button>

                        {canManage && (
                          <>
                            <button
                              type="button"
                              className="btn btn-ghost btn-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEditBuilder(p);
                              }}
                              style={{ color: 'var(--primary)', gap: '4px' }}
                              title="Edit Learning Path"
                            >
                              <Edit3 size={12} /> Edit
                            </button>

                            {p.status === 'published' ? (
                              <button
                                type="button"
                                className="btn btn-ghost btn-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  unpublishPath(p.id);
                                }}
                                style={{ color: 'var(--warning)', gap: '4px' }}
                                title="Unpublish / Move to Draft"
                              >
                                Draft
                              </button>
                            ) : p.status === 'draft' ? (
                              <button
                                type="button"
                                className="btn btn-ghost btn-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  publishPath(p.id);
                                }}
                                style={{ color: 'var(--success)', gap: '4px' }}
                                title="Publish Path"
                              >
                                Publish
                              </button>
                            ) : null}

                            {p.status !== 'archived' && (
                              <button
                                type="button"
                                className="btn btn-ghost btn-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPathToAction(p);
                                  setIsArchiveConfirmOpen(true);
                                }}
                                style={{ color: 'var(--text-muted)' }}
                                title="Archive Path"
                              >
                                <Archive size={12} />
                              </button>
                            )}

                            <button
                              type="button"
                              className="btn btn-ghost btn-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPathToAction(p);
                                setIsDeleteConfirmOpen(true);
                              }}
                              style={{ color: 'var(--danger)' }}
                              title="Delete Path"
                            >
                              <Trash2 size={12} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* List / Table View */
            <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-input)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '12px 16px', fontWeight: 600 }}>Learning Path</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600 }}>Purpose & Category</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600 }}>Courses</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600 }}>Creator</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600 }}>Learners</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600 }}>Status</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPaths.map((p) => {
                      const isSelected = selectedPath?.id === p.id;
                      const totalHrs = calculateTotalDuration(p.courses) || p.estimatedHours;
                      const canManage = canManagePath(p);

                      return (
                        <tr
                          key={p.id}
                          onClick={() => setSelectedPath(p)}
                          style={{
                            borderBottom: '1px solid var(--border-subtle)',
                            background: isSelected ? 'var(--bg-card-hover)' : 'transparent',
                            cursor: 'pointer',
                            transition: 'var(--transition)',
                          }}
                        >
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.9rem' }}>
                              {p.title}
                            </div>
                            <div className="text-muted text-xs" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                              <span>{p.difficulty || 'All Levels'}</span>
                              {totalHrs && totalHrs > 0 ? <span>&bull; {totalHrs} hrs</span> : null}
                            </div>
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                              {renderInstitutionBadge(p.institutionType)}
                              <span className="text-secondary text-xs">{p.category || 'General Curriculum'}</span>
                            </div>
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <span style={{ fontWeight: 700 }}>{p.courses.length}</span>
                            <span className="text-muted text-xs"> sequenced</span>
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ color: 'var(--text-main)', fontWeight: 600 }}>{p.creatorName || 'Faculty Member'}</div>
                            <div className="text-muted text-xs">{p.creatorRole || 'Creator'}</div>
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            {p.learnerCount !== undefined && p.learnerCount > 0 ? (
                              <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{p.learnerCount}</span>
                            ) : (
                              <span className="text-muted text-xs">0 assigned</span>
                            )}
                          </td>
                          <td style={{ padding: '14px 16px' }}>{renderStatusBadge(p.status)}</td>
                          <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                              <button
                                type="button"
                                className="btn btn-secondary btn-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedPath(p);
                                  setIsDetailDrawerOpen(true);
                                }}
                              >
                                View
                              </button>
                              {canManage && (
                                <button
                                  type="button"
                                  className="btn btn-ghost btn-xs"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenEditBuilder(p);
                                  }}
                                  style={{ color: 'var(--primary)' }}
                                >
                                  Edit
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Selected Path Detailed Inspector */}
        {selectedPath && (
          <div
            className="card"
            style={{
              padding: '20px',
              position: 'sticky',
              top: '80px',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            {/* Detail Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px', gap: '10px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', flexWrap: 'wrap' }}>
                  {renderInstitutionBadge(selectedPath.institutionType)}
                  {renderStatusBadge(selectedPath.status)}
                </div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, lineHeight: 1.3 }}>
                  {selectedPath.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPath(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                }}
                title="Close Inspector"
              >
                <X size={18} />
              </button>
            </div>

            {/* Description & Objective */}
            <p className="text-secondary text-xs" style={{ lineHeight: 1.5, marginBottom: '16px' }}>
              {selectedPath.description || selectedPath.objective || 'No description provided.'}
            </p>

            {/* Path Key Specifications */}
            <div
              style={{
                background: 'var(--bg-input)',
                borderRadius: 'var(--radius-md)',
                padding: '12px',
                marginBottom: '16px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px',
                fontSize: '0.8rem',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div>
                <span className="text-muted" style={{ fontSize: '0.7rem', display: 'block' }}>Target Audience</span>
                <strong style={{ color: 'var(--text-main)' }}>{selectedPath.targetGroup || selectedPath.audience || 'All Eligible'}</strong>
              </div>
              <div>
                <span className="text-muted" style={{ fontSize: '0.7rem', display: 'block' }}>Difficulty Level</span>
                <strong style={{ color: 'var(--text-main)' }}>{selectedPath.difficulty || 'All Levels'}</strong>
              </div>
              <div>
                <span className="text-muted" style={{ fontSize: '0.7rem', display: 'block' }}>Course Sequence</span>
                <strong style={{ color: 'var(--text-main)' }}>
                  {selectedPath.enforceSequence !== false ? 'Strict Sequence' : 'Flexible Order'}
                </strong>
              </div>
              <div>
                <span className="text-muted" style={{ fontSize: '0.7rem', display: 'block' }}>Passing Requirement</span>
                <strong style={{ color: 'var(--text-main)' }}>
                  {selectedPath.completionThreshold || 80}% Completion
                </strong>
              </div>
              <div>
                <span className="text-muted" style={{ fontSize: '0.7rem', display: 'block' }}>Creator / Author</span>
                <strong style={{ color: 'var(--text-main)' }}>{selectedPath.creatorName || 'Faculty Lead'}</strong>
              </div>
              <div>
                <span className="text-muted" style={{ fontSize: '0.7rem', display: 'block' }}>Assigned Learners</span>
                <strong style={{ color: 'var(--text-main)' }}>
                  {selectedPath.learnerCount !== undefined && selectedPath.learnerCount > 0
                    ? `${selectedPath.learnerCount} Learners`
                    : 'Open / Unassigned'}
                </strong>
              </div>
            </div>

            {/* Course Sequence Timeline */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Layers size={14} color="var(--primary)" />
                  Ordered Curriculum Sequence ({selectedPath.courses.length})
                </h4>
                {selectedPath.enforceSequence !== false ? (
                  <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>Sequential</span>
                ) : (
                  <span className="badge badge-secondary" style={{ fontSize: '0.65rem' }}>Flexible</span>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {selectedPath.courses.map((ci, idx) => {
                  const crs = courses.find((c) => c.id === ci.courseId);
                  const title = crs?.title || ci.title || `Course Module ${idx + 1}`;
                  const category = crs?.category || 'Curriculum';
                  const hrs = crs?.durationHours || (crs?.estimatedDuration ? Math.round(crs.estimatedDuration / 60) : null);
                  const isDraft = crs?.status === 'draft';
                  const isArchived = crs?.status === 'archived';

                  // Student Progress simulation
                  const isStudentCompleted = isLearner && (idx === 0 || ci.courseId === 'crs-004');
                  const isStudentInProgress = isLearner && idx === 1 && !isStudentCompleted;
                  const isStudentLocked = isLearner && idx > 1 && selectedPath.enforceSequence !== false;

                  return (
                    <div
                      key={ci.courseId || idx}
                      style={{
                        padding: '12px',
                        background: 'var(--bg-input)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                      }}
                    >
                      <div
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '50%',
                          background: isStudentCompleted
                            ? 'var(--success)'
                            : isStudentLocked
                            ? 'var(--border-light)'
                            : 'var(--primary)',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          flexShrink: 0,
                          marginTop: '2px',
                        }}
                      >
                        {isStudentCompleted ? <Check size={14} /> : isStudentLocked ? <Lock size={12} /> : idx + 1}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                          <span
                            style={{
                              fontWeight: 700,
                              fontSize: '0.85rem',
                              color: isStudentLocked ? 'var(--text-muted)' : 'var(--text-main)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {title}
                          </span>
                          {hrs && (
                            <span className="text-muted text-xs" style={{ fontSize: '0.7rem', flexShrink: 0 }}>
                              {hrs} hrs
                            </span>
                          )}
                        </div>

                        <div className="text-muted text-xs" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', flexWrap: 'wrap' }}>
                          <span>{category}</span>
                          {ci.prerequisiteCourseIds && ci.prerequisiteCourseIds.length > 0 && (
                            <span style={{ color: 'var(--accent-purple)' }}>
                              &bull; Prerequisite: Step {idx}
                            </span>
                          )}
                        </div>

                        {/* Warnings if course is unavailable */}
                        {isDraft && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--warning)', fontSize: '0.7rem', marginTop: '4px' }}>
                            <AlertTriangle size={11} /> Course is in Draft (unpublished)
                          </div>
                        )}
                        {isArchived && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--danger)', fontSize: '0.7rem', marginTop: '4px' }}>
                            <AlertTriangle size={11} /> Course is Archived
                          </div>
                        )}

                        {/* Learner Interaction Controls */}
                        {isLearner && (
                          <div style={{ marginTop: '6px' }}>
                            {isStudentCompleted ? (
                              <span className="badge badge-success" style={{ fontSize: '0.7rem', gap: '4px' }}>
                                <CheckCircle size={10} /> Completed
                              </span>
                            ) : isStudentInProgress ? (
                              <Link
                                to={`/course-player/${ci.courseId}`}
                                className="btn btn-primary btn-xs"
                                style={{ gap: '4px', fontSize: '0.7rem' }}
                              >
                                <Play size={10} /> Continue Learning (65%)
                              </Link>
                            ) : (
                              <span className="badge badge-draft" style={{ fontSize: '0.7rem', gap: '4px' }}>
                                <Lock size={10} /> Complete Previous Step to Unlock
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Certificate Indicator */}
            {selectedPath.certificateEligible !== false && (
              <div
                style={{
                  padding: '12px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid var(--success-border)',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <Award size={20} color="var(--success)" style={{ flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--success)' }}>
                    Verifiable Milestone Credential
                  </div>
                  <div className="text-muted text-xs" style={{ fontSize: '0.7rem' }}>
                    {selectedPath.certificateTitle || 'Certificate awarded automatically upon successful path completion.'}
                  </div>
                </div>
              </div>
            )}

            {/* Admin / Creator Action Controls */}
            {canManagePath(selectedPath) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '14px', borderTop: '1px solid var(--border-subtle)', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => handleOpenEditBuilder(selectedPath)}
                  style={{ gap: '6px', flex: 1 }}
                >
                  <Edit3 size={14} /> Edit Path
                </button>

                {selectedPath.status === 'published' ? (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => unpublishPath(selectedPath.id)}
                  >
                    Unpublish
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => publishPath(selectedPath.id)}
                  >
                    Publish
                  </button>
                )}

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setPathToAction(selectedPath);
                    setIsArchiveConfirmOpen(true);
                  }}
                  title="Archive Path"
                >
                  <Archive size={14} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* LEARNING PATH BUILDER MODAL (Create / Edit 5-Step Flow) */}
      {/* ======================================================== */}
      {isBuilderOpen && (
        <div className="modal-overlay" onClick={() => setIsBuilderOpen(false)}>
          <div
            className="modal-card"
            style={{
              maxWidth: '960px',
              width: '95%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              padding: 0,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header - Pinned */}
            <div
              className="modal-header"
              style={{
                padding: '20px 28px',
                borderBottom: '1px solid var(--border-subtle)',
                background: 'var(--bg-card)',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span className="badge badge-primary" style={{ fontSize: '0.8rem', padding: '3px 10px', fontWeight: 700 }}>
                    {editingPathId ? 'Edit Learning Path' : 'Create Learning Path'}
                  </span>
                  <span style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                    Curriculum Journey Studio
                  </span>
                </div>
                <h3
                  style={{
                    fontSize: '1.45rem',
                    fontWeight: 800,
                    margin: 0,
                    color: 'var(--text-main)',
                    lineHeight: 1.3,
                    wordBreak: 'break-word',
                  }}
                >
                  {formTitle.trim() || (editingPathId ? 'Edit Learning Journey' : 'New Learning Journey')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsBuilderOpen(false)}
                aria-label="Close modal"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={22} />
              </button>
            </div>

            {/* Stepper Tabs Bar - 4 Steps Horizontal Stepper */}
            <div
              role="tablist"
              aria-label="Learning Path Steps"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                background: 'var(--bg-input)',
                borderBottom: '1px solid var(--border-subtle)',
                padding: '12px 24px',
                gap: '12px',
                flexShrink: 0,
              }}
            >
              {[
                { step: 1 as const, shortLabel: 'Details', fullName: 'Step 1: Basic Details' },
                { step: 2 as const, shortLabel: 'Courses', fullName: 'Step 2: Add Courses' },
                { step: 3 as const, shortLabel: 'Completion', fullName: 'Step 3: Completion Rules' },
                { step: 4 as const, shortLabel: 'Assign & Publish', fullName: 'Step 4: Assign & Publish' },
              ].map((item) => {
                const isStepFinished =
                  (builderStep > item.step && (item.step === 1 ? isStep1Valid : item.step === 2 ? isStep2Valid : true)) ||
                  (visitedSteps.includes(item.step) && builderStep !== item.step && (item.step === 1 ? isStep1Valid : item.step === 2 ? isStep2Valid : true));
                const isActive = builderStep === item.step;
                const isUpcoming = !isActive && !isStepFinished;
                const canClick =
                  item.step <= builderStep ||
                  (item.step === builderStep + 1 && isCurrentStepValid(builderStep)) ||
                  visitedSteps.includes(item.step);

                return (
                  <button
                    key={item.step}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    title={item.fullName + (isStepFinished ? ' (Completed - click to revisit)' : isActive ? ' (Current Step)' : '')}
                    disabled={!canClick}
                    onClick={() => handleStepNavigation(item.step)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-md)',
                      border: isActive
                        ? '2px solid var(--primary)'
                        : isStepFinished
                        ? '1px solid rgba(37, 99, 235, 0.35)'
                        : '1px solid var(--border-subtle)',
                      background: isActive
                        ? 'var(--primary-light)'
                        : isStepFinished
                        ? 'rgba(37, 99, 235, 0.06)'
                        : 'var(--bg-card)',
                      color: isActive
                        ? 'var(--text-main)'
                        : isStepFinished
                        ? 'var(--primary)'
                        : 'var(--text-secondary)',
                      cursor: canClick ? 'pointer' : 'not-allowed',
                      opacity: isUpcoming && !canClick ? 0.6 : 1,
                      transition: 'all 0.2s ease',
                      textAlign: 'left',
                      minWidth: 0,
                    }}
                  >
                    {/* Step Number or Completion Checkmark */}
                    <span
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        fontSize: '0.825rem',
                        fontWeight: 800,
                        background: isActive
                          ? 'var(--primary)'
                          : isStepFinished
                          ? 'var(--primary)'
                          : 'var(--border-subtle)',
                        color: isActive || isStepFinished ? '#ffffff' : 'var(--text-muted)',
                        boxShadow: isActive ? '0 0 0 2px var(--primary-light)' : 'none',
                      }}
                    >
                      {isStepFinished ? <Check size={14} strokeWidth={3} /> : item.step}
                    </span>

                    {/* Step Label and Current Status */}
                    <div style={{ minWidth: 0, overflow: 'hidden' }}>
                      <div
                        style={{
                          fontSize: '0.925rem',
                          fontWeight: isActive ? 700 : isStepFinished ? 600 : 500,
                          whiteSpace: 'nowrap',
                          textOverflow: 'ellipsis',
                          overflow: 'hidden',
                          lineHeight: 1.3,
                        }}
                      >
                        {item.shortLabel}
                      </div>
                      <div
                        style={{
                          fontSize: '0.75rem',
                          color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                          fontWeight: isActive ? 600 : 400,
                          lineHeight: 1.2,
                        }}
                      >
                        {isActive ? 'In Progress' : isStepFinished ? 'Completed' : 'Upcoming'}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Builder Body - Scrollable Content */}
            <div className="modal-body" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '26px 28px' }}>
              {/* Error Banners */}
              {builderErrors.length > 0 && (
                <div
                  style={{
                    padding: '14px 18px',
                    background: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid var(--danger-border)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--danger)',
                    fontSize: '0.9rem',
                    marginBottom: '22px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    lineHeight: 1.45,
                  }}
                >
                  <AlertTriangle size={20} style={{ flexShrink: 0 }} />
                  <div>
                    {builderErrors.map((err, i) => (
                      <div key={i}>{err}</div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 1: BASIC DETAILS & RECOMMENDED TEMPLATES */}
              {builderStep === 1 && (
                <div>
                  {/* Recommended for Your Organization Section */}
                  {!editingPathId && (
                    <div
                      style={{
                        padding: '20px 22px',
                        background: 'rgba(99, 102, 241, 0.05)',
                        border: '1px solid rgba(99, 102, 241, 0.2)',
                        borderRadius: 'var(--radius-lg)',
                        marginBottom: '28px',
                      }}
                    >
                      {/* Section Header with Context & Actions */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '12px',
                          marginBottom: '12px',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Sparkles size={18} color="var(--primary)" />
                            <h4 style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-main)', margin: 0 }}>
                              Recommended for Your Organization
                            </h4>
                          </div>
                          <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                            Tailored for <strong>{userOrg?.name || 'Your Organization'}</strong> ({templateOrgType === 'corporate' ? 'Company / Corporate' : templateOrgType === 'higher_ed' ? 'College / University' : templateOrgType === 'school' ? 'School (K-12)' : 'Training Institute'})
                          </p>
                        </div>

                        {/* Top Controls: Category Switcher, Refresh, View All */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <select
                            value={templateOrgType}
                            onChange={(e) => {
                              setTemplateOrgType(e.target.value as any);
                              setSuggestionOffset(0);
                            }}
                            className="form-input"
                            aria-label="Switch recommendation category"
                            style={{
                              fontSize: '0.825rem',
                              padding: '4px 10px',
                              height: '32px',
                              width: 'auto',
                              fontWeight: 600,
                            }}
                          >
                            <option value="corporate">Corporate / Company</option>
                            <option value="higher_ed">College / University</option>
                            <option value="school">School (K-12)</option>
                            <option value="training_institute">Training Institute</option>
                          </select>

                          <button
                            type="button"
                            className="btn btn-secondary btn-xs"
                            onClick={handleRefreshSuggestions}
                            title="Show next 3 relevant templates"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '0.825rem',
                              padding: '5px 12px',
                              fontWeight: 600,
                            }}
                          >
                            <RefreshCw size={13} /> Refresh Suggestions
                          </button>

                          <button
                            type="button"
                            className="btn btn-ghost btn-xs"
                            onClick={() => setShowAllTemplatesModal(true)}
                            style={{
                              fontSize: '0.825rem',
                              color: 'var(--primary)',
                              fontWeight: 700,
                              padding: '5px 10px',
                            }}
                          >
                            View All ({relevantTemplates.length})
                          </button>
                        </div>
                      </div>

                      {/* 3 Template Suggestions + Create from Scratch Grid */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(215px, 1fr))',
                          gap: '12px',
                        }}
                      >
                        {/* Option: Create from Scratch */}
                        <button
                          type="button"
                          onClick={handleSelectCreateFromScratch}
                          style={{
                            padding: '14px 16px',
                            textAlign: 'left',
                            background: selectedTemplateId === 'scratch' ? 'var(--primary-light)' : 'var(--bg-card)',
                            border: selectedTemplateId === 'scratch' ? '2px solid var(--primary)' : '1px dashed var(--border-subtle)',
                            borderRadius: 'var(--radius-md)',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            gap: '8px',
                            transition: 'var(--transition)',
                            boxShadow: selectedTemplateId === 'scratch' ? '0 0 0 1px var(--primary)' : 'none',
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                              <span
                                style={{
                                  fontWeight: 700,
                                  fontSize: '0.925rem',
                                  color: selectedTemplateId === 'scratch' ? 'var(--primary)' : 'var(--text-main)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                }}
                              >
                                <Sliders size={15} /> Create from Scratch
                              </span>
                              {selectedTemplateId === 'scratch' && (
                                <span
                                  style={{
                                    width: '18px',
                                    height: '18px',
                                    borderRadius: '50%',
                                    background: 'var(--primary)',
                                    color: '#fff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                  }}
                                >
                                  <Check size={12} strokeWidth={3} />
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px', fontWeight: 500 }}>
                              Blank canvas
                            </div>
                          </div>
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                            Build an empty journey from the ground up without preselected courses or rules.
                          </p>
                        </button>

                        {/* 3 Relevant Templates */}
                        {currentSuggestions.map((tpl) => {
                          const isSelected = selectedTemplateId === tpl.id;
                          return (
                            <button
                              key={tpl.id}
                              type="button"
                              onClick={() => handleApplyTemplate(tpl)}
                              style={{
                                padding: '14px 16px',
                                textAlign: 'left',
                                background: isSelected ? 'var(--primary-light)' : 'var(--bg-card)',
                                border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
                                borderRadius: 'var(--radius-md)',
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                gap: '8px',
                                transition: 'var(--transition)',
                                boxShadow: isSelected ? '0 0 0 1px var(--primary)' : 'none',
                              }}
                            >
                              <div>
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '6px' }}>
                                  <span
                                    style={{
                                      fontWeight: 700,
                                      fontSize: '0.925rem',
                                      color: isSelected ? 'var(--primary)' : 'var(--text-main)',
                                      lineHeight: 1.35,
                                      whiteSpace: 'normal',
                                      wordBreak: 'break-word',
                                    }}
                                  >
                                    {tpl.name}
                                  </span>
                                  {isSelected && (
                                    <span
                                      style={{
                                        width: '18px',
                                        height: '18px',
                                        borderRadius: '50%',
                                        background: 'var(--primary)',
                                        color: '#fff',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                      }}
                                    >
                                      <Check size={12} strokeWidth={3} />
                                    </span>
                                  )}
                                </div>
                                <div
                                  style={{
                                    fontSize: '0.78rem',
                                    color: 'var(--text-secondary)',
                                    marginTop: '4px',
                                    fontWeight: 500,
                                  }}
                                >
                                  {tpl.category} &bull; {tpl.difficulty}
                                </div>
                              </div>

                              <p
                                style={{
                                  fontSize: '0.8rem',
                                  color: 'var(--text-secondary)',
                                  lineHeight: 1.4,
                                  margin: 0,
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                }}
                              >
                                {tpl.description}
                              </p>
                            </button>
                          );
                        })}
                      </div>

                      {/* Selected State Notice */}
                      {selectedTemplateId && selectedTemplateId !== 'scratch' && (
                        <div
                          style={{
                            marginTop: '14px',
                            padding: '8px 14px',
                            background: 'var(--primary-light)',
                            borderRadius: 'var(--radius-md)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '0.825rem',
                            color: 'var(--primary)',
                            fontWeight: 600,
                          }}
                        >
                          <CheckCircle2 size={16} />
                          <span>
                            Template pre-populated. You can adjust the path name, courses, and completion settings at any time.
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Essential Fields */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div className="form-group">
                      <label
                        className="form-label"
                        style={{
                          fontSize: '0.95rem',
                          fontWeight: 700,
                          marginBottom: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        Learning Path Name <span style={{ color: 'var(--danger)', fontWeight: 800 }}>*</span>
                      </label>
                      <input
                        type="text"
                        required
                        className="form-input"
                        placeholder="e.g., Enterprise Software Systems Architecture Track"
                        value={formTitle}
                        onChange={(e) => {
                          setFormTitle(e.target.value);
                          if (builderErrors.length > 0) setBuilderErrors([]);
                        }}
                        style={{
                          fontSize: '0.95rem',
                          padding: '10px 14px',
                          border: !formTitle.trim() && builderErrors.length > 0 ? '1px solid var(--danger)' : undefined,
                        }}
                      />
                      {!formTitle.trim() ? (
                        <span style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
                          Give this learning path a clear title visible to students and trainers.
                        </span>
                      ) : null}
                      {!formTitle.trim() && builderErrors.length > 0 && (
                        <div style={{ color: 'var(--danger)', fontSize: '0.825rem', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <AlertTriangle size={14} /> Learning Path Name is required to proceed.
                        </div>
                      )}
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '6px' }}>
                        Short Description / Learning Objective (Optional)
                      </label>
                      <textarea
                        rows={3}
                        className="form-textarea"
                        placeholder="Outline the core goals, expected outcomes, and target competencies for this path..."
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                        style={{ fontSize: '0.925rem', padding: '10px 14px', lineHeight: 1.5 }}
                      />
                    </div>

                    {/* Derived Context Clarification Badge */}
                    <div
                      style={{
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-subtle)',
                        fontSize: '0.8rem',
                        color: 'var(--text-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <Info size={15} color="var(--primary)" style={{ flexShrink: 0 }} />
                      <span>
                        Organization tenant (<strong>{userOrg?.name || 'Current Organization'}</strong>) and creator permissions (<strong>{user?.displayName || 'Active User'}</strong>) are automatically applied.
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: ADD COURSES */}
              {builderStep === 2 && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '22px' }}>
                    {/* Left: Available Courses Picker */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <label className="form-label" style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>
                          Select from Course Catalog
                        </label>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {availableCourses.length} courses available
                        </span>
                      </div>

                      {/* Filter in picker */}
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Search courses by name or category..."
                        value={courseSearchInput}
                        onChange={(e) => setCourseSearchInput(e.target.value)}
                        style={{ marginBottom: '12px', height: '40px', fontSize: '0.9rem' }}
                      />

                      <div
                        style={{
                          maxHeight: '360px',
                          overflowY: 'auto',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-md)',
                          padding: '10px',
                          background: 'var(--bg-input)',
                        }}
                      >
                        {availableCourses
                          .filter((c) => {
                            if (!courseSearchInput.trim()) return true;
                            const q = courseSearchInput.toLowerCase();
                            return c.title.toLowerCase().includes(q) || c.category.toLowerCase().includes(q);
                          })
                          .map((c) => {
                            const isAdded = formCourses.some((fc) => fc.courseId === c.id);
                            const hrs = c.durationHours || (c.estimatedDuration ? Math.round(c.estimatedDuration / 60) : null);
                            const isDraft = c.status === 'draft';
                            const isArchived = c.status === 'archived';

                            return (
                              <div
                                key={c.id}
                                style={{
                                  padding: '12px 14px',
                                  background: 'var(--bg-card)',
                                  borderRadius: 'var(--radius-sm)',
                                  border: '1px solid var(--border-subtle)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: '12px',
                                }}
                              >
                                <div>
                                  <div style={{ fontWeight: 700, fontSize: '0.925rem', color: 'var(--text-main)', lineHeight: 1.35 }}>
                                    {c.title}
                                  </div>
                                  <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                    <span>{c.category}</span>
                                    {hrs && <span>&bull; {hrs} hrs</span>}
                                    {isDraft && <span className="badge badge-draft" style={{ fontSize: '0.725rem' }}>Draft</span>}
                                    {isArchived && <span className="badge badge-error" style={{ fontSize: '0.725rem' }}>Archived</span>}
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  disabled={isAdded}
                                  onClick={() => handleAddCourseToForm(c.id)}
                                  className={`btn btn-xs ${isAdded ? 'btn-ghost' : 'btn-primary'}`}
                                  style={{ flexShrink: 0, padding: '6px 14px', fontSize: '0.85rem', fontWeight: 600 }}
                                >
                                  {isAdded ? <Check size={14} /> : <Plus size={14} />} {isAdded ? 'Added' : 'Add'}
                                </button>
                              </div>
                            );
                          })}
                      </div>
                    </div>

                    {/* Right: Sequenced Path Courses */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <label className="form-label" style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>
                          Sequenced Courses in Path ({formCourses.length})
                        </label>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Reorder with controls</span>
                      </div>

                      {formCourses.length === 0 ? (
                        <div
                          style={{
                            padding: '36px 20px',
                            textAlign: 'center',
                            border: '2px dashed var(--border-subtle)',
                            borderRadius: 'var(--radius-md)',
                            color: 'var(--text-secondary)',
                            fontSize: '0.925rem',
                            lineHeight: 1.5,
                          }}
                        >
                          No courses in sequence yet. Select courses from the catalog on the left to build your path.
                          <div style={{ color: 'var(--warning)', fontSize: '0.85rem', marginTop: '8px', fontWeight: 600 }}>
                            * At least 1 course is required to proceed past this step.
                          </div>
                        </div>
                      ) : (
                        <div
                          style={{
                            maxHeight: '360px',
                            overflowY: 'auto',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px',
                          }}
                        >
                          {formCourses.map((ci, idx) => {
                            const crs = courses.find((c) => c.id === ci.courseId);
                            const title = crs?.title || `Course ID: ${ci.courseId}`;
                            const isDraft = crs?.status === 'draft';
                            const hrs = crs?.durationHours || (crs?.estimatedDuration ? Math.round(crs.estimatedDuration / 60) : null);
                            const earlierCourses = formCourses.slice(0, idx);

                            return (
                              <div
                                key={ci.courseId}
                                style={{
                                  padding: '12px 14px',
                                  background: 'var(--bg-card)',
                                  borderRadius: 'var(--radius-md)',
                                  border: '1px solid var(--border-subtle)',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span
                                      style={{
                                        width: '26px',
                                        height: '26px',
                                        borderRadius: '50%',
                                        background: 'var(--primary)',
                                        color: '#fff',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '0.85rem',
                                        fontWeight: 800,
                                        flexShrink: 0,
                                      }}
                                    >
                                      {idx + 1}
                                    </span>
                                    <div>
                                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)', lineHeight: 1.35 }}>
                                        {title}
                                      </div>
                                      <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', display: 'flex', gap: '8px', marginTop: '3px' }}>
                                        {hrs && <span>{hrs} hrs</span>}
                                        {isDraft && <span style={{ color: 'var(--warning)', fontWeight: 600 }}>&bull; Warning: Draft Course</span>}
                                      </div>
                                    </div>
                                  </div>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <button
                                      type="button"
                                      disabled={idx === 0}
                                      onClick={() => handleMoveCourseUp(idx)}
                                      className="btn btn-ghost btn-xs"
                                      style={{ padding: '6px' }}
                                      title="Move Up"
                                    >
                                      <ArrowUp size={14} />
                                    </button>
                                    <button
                                      type="button"
                                      disabled={idx === formCourses.length - 1}
                                      onClick={() => handleMoveCourseDown(idx)}
                                      className="btn btn-ghost btn-xs"
                                      style={{ padding: '6px' }}
                                      title="Move Down"
                                    >
                                      <ArrowDown size={14} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveCourseFromForm(ci.courseId)}
                                      className="btn btn-ghost btn-xs"
                                      style={{ color: 'var(--danger)', padding: '6px' }}
                                      title="Remove from Sequence"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </div>

                                {/* Prerequisite Configuration */}
                                {idx > 0 && (
                                  <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)', fontSize: '0.825rem' }}>
                                    <span style={{ color: 'var(--text-secondary)', marginRight: '8px', fontWeight: 600 }}>
                                      Prerequisites:
                                    </span>
                                    <div style={{ display: 'inline-flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                                      {earlierCourses.map((ec, ecIdx) => {
                                        const ecCrs = courses.find((c) => c.id === ec.courseId);
                                        const isSelected = (ci.prerequisiteCourseIds || []).includes(ec.courseId);

                                        return (
                                          <button
                                            key={ec.courseId}
                                            type="button"
                                            onClick={() => handleTogglePrerequisite(ci.courseId, ec.courseId)}
                                            style={{
                                              padding: '4px 10px',
                                              borderRadius: 'var(--radius-sm)',
                                              border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                                              background: isSelected ? 'var(--primary-light)' : 'var(--bg-input)',
                                              color: isSelected ? 'var(--primary)' : 'var(--text-secondary)',
                                              fontSize: '0.8rem',
                                              fontWeight: isSelected ? 700 : 500,
                                              cursor: 'pointer',
                                            }}
                                          >
                                            Step {ecIdx + 1}: {ecCrs?.title || ec.courseId}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Circular Dependency Check Status */}
                  <div
                    style={{
                      marginTop: '20px',
                      padding: '12px 16px',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      fontSize: '0.875rem',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    <CheckCircle2 size={18} color="var(--success)" style={{ flexShrink: 0 }} />
                    <span>Prerequisites validator verified: Sequential course path contains no circular dependency loops.</span>
                  </div>
                </div>
              )}

              {/* TAB 3: COMPLETION (SIMPLIFIED RULES) */}
              {builderStep === 3 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Default Option: Complete All Courses */}
                  <div
                    style={{
                      padding: '18px 20px',
                      background: 'var(--bg-card)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)', marginBottom: '4px' }}>
                          Complete all courses in this path (Default)
                        </div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                          Learners must complete preceding courses and prerequisites in sequence to unlock subsequent learning modules.
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={formEnforceSequence}
                        onChange={(e) => setFormEnforceSequence(e.target.checked)}
                        style={{ width: '20px', height: '20px', accentColor: 'var(--primary)', cursor: 'pointer', flexShrink: 0 }}
                      />
                    </div>
                  </div>

                  {/* Optional: Require Passing Assessments */}
                  <div
                    style={{
                      padding: '18px 20px',
                      background: 'var(--bg-card)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)', marginBottom: '4px' }}>
                          Require assessments to be passed
                        </div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                          Requires learners to achieve a passing evaluation score on all required module quizzes and capstones.
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={formRequireAssessments}
                        onChange={(e) => setFormRequireAssessments(e.target.checked)}
                        style={{ width: '20px', height: '20px', accentColor: 'var(--primary)', cursor: 'pointer', flexShrink: 0 }}
                      />
                    </div>
                  </div>

                  {/* Optional: Minimum Overall Completion Percentage */}
                  <div
                    style={{
                      padding: '18px 20px',
                      background: 'var(--bg-card)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)', marginBottom: '4px' }}>
                        Minimum overall completion percentage
                      </div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        Specify the overall progress percentage required across lessons and activities to mark the journey completed.
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '18px', marginTop: '14px' }}>
                      <input
                        type="range"
                        min="50"
                        max="100"
                        step="5"
                        value={formCompletionThreshold}
                        onChange={(e) => setFormCompletionThreshold(Number(e.target.value))}
                        style={{ flex: 1, accentColor: 'var(--primary)', height: '8px' }}
                      />
                      <span style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--primary)', minWidth: '60px' }}>
                        {formCompletionThreshold}%
                      </span>
                    </div>
                  </div>

                  {/* Collapsible Advanced Settings */}
                  <div
                    style={{
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-card)',
                      overflow: 'hidden',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setShowAdvancedRules(!showAdvancedRules)}
                      style={{
                        width: '100%',
                        padding: '14px 20px',
                        background: 'none',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        color: 'var(--text-main)',
                        fontWeight: 700,
                        fontSize: '0.95rem',
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Sliders size={16} color="var(--primary)" />
                        Advanced Settings (Optional)
                      </span>
                      {showAdvancedRules ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>

                    {showAdvancedRules && (
                      <div style={{ padding: '0 20px 20px 20px', borderTop: '1px solid var(--border-subtle)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', paddingTop: '16px' }}>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.925rem', color: 'var(--text-main)' }}>
                              Issue Verifiable Digital Certificate
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                              Award a tamper-proof digital completion credential when all completion rules are met.
                            </div>
                          </div>
                          <input
                            type="checkbox"
                            checked={formCertificateEligible}
                            onChange={(e) => setFormCertificateEligible(e.target.checked)}
                            style={{ width: '18px', height: '18px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                          />
                        </div>

                        {formCertificateEligible && (
                          <div style={{ marginTop: '14px' }}>
                            <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                              Certificate Credential Title
                            </label>
                            <input
                              type="text"
                              className="form-input"
                              value={formCertificateTitle}
                              onChange={(e) => setFormCertificateTitle(e.target.value)}
                              placeholder="e.g. Certified Full-Stack Cloud Solutions Architect"
                              style={{ fontSize: '0.875rem', padding: '8px 12px' }}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: ASSIGN & PUBLISH (COMBINED STEP 4) */}
              {builderStep === 4 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {/* Section 1: Target Audience Assignment */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
                      <div>
                        <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                          1. Assign Target Audience (Optional)
                        </h4>
                        <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', margin: '3px 0 0 0' }}>
                          Assign cohort batches, departments, or individual learners now, or publish immediately and assign later.
                        </p>
                      </div>

                      {/* Selected Count Indicator */}
                      <span
                        style={{
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          padding: '4px 12px',
                          borderRadius: 'var(--radius-full)',
                          background: 'var(--primary-light)',
                          color: 'var(--primary)',
                        }}
                      >
                        {formCohortIds.length} cohorts, {formDepartmentIds.length} depts, {formUserIds.length} learners
                      </span>
                    </div>

                    {/* Quick Search across assignments */}
                    <div style={{ marginBottom: '12px' }}>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Filter cohorts, departments, or learners..."
                        value={assignLearnerSearch}
                        onChange={(e) => setAssignLearnerSearch(e.target.value)}
                        style={{ height: '36px', fontSize: '0.875rem' }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                      {/* Cohort Batches */}
                      <div>
                        <label className="form-label" style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '6px' }}>
                          Cohort Batches ({cohorts.length})
                        </label>
                        <div
                          style={{
                            maxHeight: '220px',
                            overflowY: 'auto',
                            background: 'var(--bg-input)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-md)',
                            padding: '8px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px',
                          }}
                        >
                          {cohorts
                            .filter((coh) => {
                              if (!assignLearnerSearch.trim()) return true;
                              const q = assignLearnerSearch.toLowerCase();
                              return coh.name.toLowerCase().includes(q) || coh.code.toLowerCase().includes(q);
                            })
                            .map((coh) => {
                              const isAssigned = formCohortIds.includes(coh.id);
                              return (
                                <label
                                  key={coh.id}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '8px 10px',
                                    background: isAssigned ? 'var(--primary-light)' : 'var(--bg-card)',
                                    border: isAssigned ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: 'pointer',
                                    fontSize: '0.85rem',
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isAssigned}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setFormCohortIds([...formCohortIds, coh.id]);
                                      } else {
                                        setFormCohortIds(formCohortIds.filter((id) => id !== coh.id));
                                      }
                                    }}
                                    style={{ width: '16px', height: '16px', accentColor: 'var(--primary)', flexShrink: 0 }}
                                  />
                                  <div style={{ minWidth: 0 }}>
                                    <div style={{ fontWeight: 600, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {coh.name}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                      {coh.code} &bull; {coh.learnerCount || 0} students
                                    </div>
                                  </div>
                                </label>
                              );
                            })}
                        </div>
                      </div>

                      {/* Departments */}
                      <div>
                        <label className="form-label" style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '6px' }}>
                          Departments ({mockDepartments.length})
                        </label>
                        <div
                          style={{
                            maxHeight: '220px',
                            overflowY: 'auto',
                            background: 'var(--bg-input)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-md)',
                            padding: '8px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px',
                          }}
                        >
                          {mockDepartments
                            .filter((dept) => {
                              if (!assignLearnerSearch.trim()) return true;
                              return dept.name.toLowerCase().includes(assignLearnerSearch.toLowerCase());
                            })
                            .map((dept) => {
                              const isAssigned = formDepartmentIds.includes(dept.id);
                              return (
                                <label
                                  key={dept.id}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '8px 10px',
                                    background: isAssigned ? 'var(--primary-light)' : 'var(--bg-card)',
                                    border: isAssigned ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: 'pointer',
                                    fontSize: '0.85rem',
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isAssigned}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setFormDepartmentIds([...formDepartmentIds, dept.id]);
                                      } else {
                                        setFormDepartmentIds(formDepartmentIds.filter((id) => id !== dept.id));
                                      }
                                    }}
                                    style={{ width: '16px', height: '16px', accentColor: 'var(--primary)', flexShrink: 0 }}
                                  />
                                  <div style={{ minWidth: 0 }}>
                                    <div style={{ fontWeight: 600, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {dept.name}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                      {dept.memberCount} members
                                    </div>
                                  </div>
                                </label>
                              );
                            })}
                        </div>
                      </div>

                      {/* Individual Learners */}
                      <div>
                        <label className="form-label" style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '6px' }}>
                          Individual Learners
                        </label>
                        <div
                          style={{
                            maxHeight: '220px',
                            overflowY: 'auto',
                            background: 'var(--bg-input)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-md)',
                            padding: '8px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px',
                          }}
                        >
                          {peopleList
                            .filter((u) => {
                              const isStudent = u.roles?.some((r) => r.name === 'student' || r.name === 'learner') || u.activeRole === 'student';
                              if (!isStudent) return false;
                              if (!assignLearnerSearch.trim()) return true;
                              const q = assignLearnerSearch.toLowerCase();
                              return u.displayName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
                            })
                            .slice(0, 20)
                            .map((u) => {
                              const isAssigned = formUserIds.includes(u.id);
                              return (
                                <label
                                  key={u.id}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '8px 10px',
                                    background: isAssigned ? 'var(--primary-light)' : 'var(--bg-card)',
                                    border: isAssigned ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: 'pointer',
                                    fontSize: '0.85rem',
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isAssigned}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setFormUserIds([...formUserIds, u.id]);
                                      } else {
                                        setFormUserIds(formUserIds.filter((id) => id !== u.id));
                                      }
                                    }}
                                    style={{ width: '16px', height: '16px', accentColor: 'var(--primary)', flexShrink: 0 }}
                                  />
                                  <div style={{ minWidth: 0 }}>
                                    <div style={{ fontWeight: 600, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {u.displayName}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                      {u.email}
                                    </div>
                                  </div>
                                </label>
                              );
                            })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Review Summary Before Publishing */}
                  <div>
                    <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '10px' }}>
                      2. Review Summary
                    </h4>

                    <div
                      style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        padding: '20px 22px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        {renderInstitutionBadge(formInstitutionType)}
                        <span className="badge badge-secondary" style={{ fontSize: '0.78rem', padding: '2px 8px' }}>
                          {formDifficulty}
                        </span>
                        <span className="badge badge-primary" style={{ fontSize: '0.78rem', padding: '2px 8px' }}>
                          {formCategory}
                        </span>
                      </div>

                      <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '0 0 6px 0', color: 'var(--text-main)' }}>
                        {formTitle || 'Untitled Learning Journey'}
                      </h3>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '16px' }}>
                        {formDescription || 'No description entered.'}
                      </p>

                      {/* Stat Metrics Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', textAlign: 'center', marginBottom: '16px' }}>
                        <div style={{ padding: '10px', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>Total Courses</div>
                          <div style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--text-main)' }}>{formCourses.length}</div>
                        </div>
                        <div style={{ padding: '10px', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>Total Duration</div>
                          <div style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--text-main)' }}>
                            {calculateTotalDuration(formCourses) || 0} hrs
                          </div>
                        </div>
                        <div style={{ padding: '10px', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>Completion Req.</div>
                          <div style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--primary)' }}>
                            {formCompletionThreshold}%
                          </div>
                        </div>
                        <div style={{ padding: '10px', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>Certificate</div>
                          <div style={{ fontWeight: 800, fontSize: '1.15rem', color: formCertificateEligible ? 'var(--success)' : 'var(--text-muted)' }}>
                            {formCertificateEligible ? 'Enabled' : 'Disabled'}
                          </div>
                        </div>
                      </div>

                      {/* Sequenced Courses Mini List */}
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>
                        Curriculum Sequence ({formCourses.length} courses):
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {formCourses.map((ci, idx) => {
                          const crs = courses.find((c) => c.id === ci.courseId);
                          return (
                            <div
                              key={ci.courseId}
                              style={{
                                padding: '8px 12px',
                                background: 'var(--bg-input)',
                                borderRadius: 'var(--radius-sm)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                fontSize: '0.825rem',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontWeight: 700, color: 'var(--primary)' }}>Step {idx + 1}:</span>
                                <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{crs?.title || ci.courseId}</span>
                              </div>
                              <span style={{ color: 'var(--text-secondary)' }}>{crs?.category}</span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Validation / Ready Status */}
                      <div style={{ marginTop: '16px' }}>
                        {isAllRequiredValid ? (
                          <div
                            style={{
                              padding: '12px 14px',
                              background: 'rgba(16, 185, 129, 0.1)',
                              border: '1px solid rgba(16, 185, 129, 0.3)',
                              borderRadius: 'var(--radius-md)',
                              color: 'var(--success)',
                              fontSize: '0.85rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              fontWeight: 600,
                            }}
                          >
                            <CheckCircle2 size={16} /> All requirements met. Ready to publish or save as draft.
                          </div>
                        ) : (
                          <div
                            style={{
                              padding: '12px 14px',
                              background: 'rgba(239, 68, 68, 0.1)',
                              border: '1px solid var(--danger-border)',
                              borderRadius: 'var(--radius-md)',
                              color: 'var(--danger)',
                              fontSize: '0.85rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                            }}
                          >
                            <AlertTriangle size={16} />
                            <div>
                              Please complete required items:
                              {!isStep1Valid && <div>&bull; Learning Path Name is required in Step 1.</div>}
                              {formCourses.length === 0 && <div>&bull; At least 1 course must be added in Step 2.</div>}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Controls - 4-Step Navigation */}
            <div
              className="modal-footer"
              style={{
                padding: '16px 28px',
                borderTop: '1px solid var(--border-subtle)',
                background: 'var(--bg-card)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                flexShrink: 0,
                flexWrap: 'wrap',
                position: 'sticky',
                bottom: 0,
                zIndex: 10,
              }}
            >
              {/* Left: Back button & Step Progress */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {builderStep > 1 && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleStepNavigation((builderStep - 1) as any)}
                    style={{ fontSize: '0.875rem', fontWeight: 600, padding: '7px 14px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <ChevronLeft size={16} /> Back
                  </button>
                )}

                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '4px 12px',
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: 'var(--text-main)',
                  }}
                >
                  Step {builderStep} of 4
                </div>

                {/* Inline Validation Alert if Next is Blocked */}
                {!isCurrentStepValid(builderStep) && (
                  <span
                    style={{
                      fontSize: '0.825rem',
                      color: 'var(--warning)',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <AlertTriangle size={14} />
                    {getStepValidationMessage(builderStep)}
                  </span>
                )}
              </div>

              {/* Right: Cancel, Save as Draft, Next / Publish */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setIsBuilderOpen(false)}
                  style={{ fontSize: '0.875rem', padding: '7px 14px' }}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleSavePath('draft')}
                  style={{ fontSize: '0.875rem', fontWeight: 600, padding: '7px 14px' }}
                >
                  Save as Draft
                </button>

                {builderStep < 4 ? (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={!isCurrentStepValid(builderStep)}
                    onClick={() => handleStepNavigation((builderStep + 1) as any)}
                    title={getStepValidationMessage(builderStep) || 'Proceed to next step'}
                    style={{
                      fontSize: '0.875rem',
                      fontWeight: 700,
                      padding: '7px 18px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      opacity: !isCurrentStepValid(builderStep) ? 0.6 : 1,
                      cursor: !isCurrentStepValid(builderStep) ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Next Step <ChevronRight size={16} />
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={!isAllRequiredValid}
                    onClick={() => handleSavePath('published')}
                    title={!isAllRequiredValid ? 'Please resolve missing requirements before publishing' : 'Publish Learning Path'}
                    style={{
                      fontSize: '0.875rem',
                      fontWeight: 700,
                      padding: '7px 20px',
                      background: isAllRequiredValid ? 'var(--success)' : 'var(--text-muted)',
                      borderColor: isAllRequiredValid ? 'var(--success)' : 'var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: !isAllRequiredValid ? 'not-allowed' : 'pointer',
                      opacity: !isAllRequiredValid ? 0.6 : 1,
                    }}
                  >
                    <CheckCircle2 size={16} /> Publish Learning Path
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW ALL TEMPLATES MODAL */}
      {showAllTemplatesModal && (
        <div className="modal-overlay" onClick={() => setShowAllTemplatesModal(false)} style={{ zIndex: 120 }}>
          <div
            className="modal-card"
            style={{
              maxWidth: '860px',
              width: '90%',
              maxHeight: '85vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="modal-header"
              style={{
                padding: '18px 24px',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                  All Recommended Learning Path Templates
                </h3>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Select any curriculum template to pre-populate courses and completion criteria.
                </div>
              </div>
              <button
                type="button"
                className="btn-icon"
                onClick={() => setShowAllTemplatesModal(false)}
                aria-label="Close templates modal"
              >
                <X size={20} />
              </button>
            </div>

            {/* Filter Tabs */}
            <div
              style={{
                display: 'flex',
                gap: '8px',
                padding: '12px 24px',
                background: 'var(--bg-input)',
                borderBottom: '1px solid var(--border-subtle)',
                flexWrap: 'wrap',
              }}
            >
              {[
                { type: 'corporate' as const, label: 'Company / Corporate' },
                { type: 'higher_ed' as const, label: 'College / University' },
                { type: 'school' as const, label: 'School (K-12)' },
                { type: 'training_institute' as const, label: 'Training Institute' },
              ].map((cat) => (
                <button
                  key={cat.type}
                  type="button"
                  onClick={() => setTemplateOrgType(cat.type)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.825rem',
                    fontWeight: 600,
                    border: templateOrgType === cat.type ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                    background: templateOrgType === cat.type ? 'var(--primary-light)' : 'var(--bg-card)',
                    color: templateOrgType === cat.type ? 'var(--primary)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  {cat.label} ({PATH_TEMPLATE_PRESETS.filter((p) => p.institutionType === cat.type).length})
                </button>
              ))}
            </div>

            {/* Templates Grid */}
            <div
              className="modal-body"
              style={{
                padding: '20px 24px',
                overflowY: 'auto',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                gap: '14px',
              }}
            >
              {relevantTemplates.map((tpl) => {
                const isSelected = selectedTemplateId === tpl.id;
                return (
                  <div
                    key={tpl.id}
                    style={{
                      padding: '16px',
                      background: isSelected ? 'var(--primary-light)' : 'var(--bg-card)',
                      border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '10px',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: isSelected ? 'var(--primary)' : 'var(--text-main)', marginBottom: '4px' }}>
                        {tpl.name}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                        {tpl.category} &bull; {tpl.difficulty}
                      </div>
                      <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.45 }}>
                        {tpl.description}
                      </p>
                    </div>

                    <button
                      type="button"
                      className={`btn btn-xs ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => {
                        handleApplyTemplate(tpl);
                        setShowAllTemplatesModal(false);
                      }}
                      style={{ width: '100%', fontWeight: 700 }}
                    >
                      {isSelected ? 'Currently Applied' : 'Use This Template'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Archive */}
      {isArchiveConfirmOpen && pathToAction && (
        <div className="modal-overlay" onClick={() => setIsArchiveConfirmOpen(false)}>
          <div
            className="modal-card"
            style={{ maxWidth: '440px', padding: '24px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px', color: 'var(--warning)' }}>
              <Archive size={28} />
              <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Archive Learning Path?</h3>
            </div>
            <p className="text-secondary text-sm" style={{ marginBottom: '20px' }}>
              Are you sure you want to archive <strong>"{pathToAction.title}"</strong>? Archived paths are hidden from learner catalogs but can be restored later.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsArchiveConfirmOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleArchiveConfirm}
                style={{ background: 'var(--warning)', borderColor: 'var(--warning)' }}
              >
                Archive Path
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Delete */}
      {isDeleteConfirmOpen && pathToAction && (
        <div className="modal-overlay" onClick={() => setIsDeleteConfirmOpen(false)}>
          <div
            className="modal-card"
            style={{ maxWidth: '440px', padding: '24px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px', color: 'var(--danger)' }}>
              <Trash2 size={28} />
              <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Delete Learning Path?</h3>
            </div>
            <p className="text-secondary text-sm" style={{ marginBottom: '20px' }}>
              Are you sure you want to permanently delete <strong>"{pathToAction.title}"</strong>? This will remove the sequence from your institution. Course catalog records will not be deleted.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsDeleteConfirmOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDeleteConfirm}
              >
                Delete Path
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
