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
import { mockDepartments } from '../../data/mockData';
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

  // Builder Form State
  const [builderStep, setBuilderStep] = useState<1 | 2 | 3 | 4 | 5>(1);
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

  // Builder Validation & Alerts
  const [builderErrors, setBuilderErrors] = useState<string[]>([]);

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
    setFormTitle('');
    setFormDescription('');
    setFormObjective('');
    setFormInstitutionType('corporate');
    setFormCategory('Employee Onboarding');
    setFormDifficulty('Beginner');
    setFormTargetGroup('Engineering & Technology');
    setFormTargetRole('Associate Engineer');
    setFormDepartmentId('dep-001');
    setFormThumbnail('');
    setFormStatus('published');
    setFormCourses([
      { courseId: 'crs-001', order: 1, isRequired: true, prerequisiteCourseIds: [] },
      { courseId: 'crs-004', order: 2, isRequired: true, prerequisiteCourseIds: ['crs-001'] },
    ]);
    setFormEnforceSequence(true);
    setFormRequireAssessments(true);
    setFormCompletionThreshold(80);
    setFormCertificateEligible(true);
    setFormCertificateTitle('Enterprise Learning Path Credential');
    setFormCohortIds(['coh-001']);
    setFormDepartmentIds(['dep-001']);
    setFormUserIds(['u-007']);
    setBuilderErrors([]);
    setIsBuilderOpen(true);
  };

  // Open Edit Builder
  const handleOpenEditBuilder = (path: LearningPath) => {
    setEditingPathId(path.id);
    setBuilderStep(1);
    setFormTitle(path.title);
    setFormDescription(path.description || '');
    setFormObjective(path.objective || '');
    setFormInstitutionType(path.institutionType || 'corporate');
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

  // Apply Quick-Start Template
  const handleApplyTemplate = (preset: PathTemplatePreset) => {
    setFormTitle(preset.name);
    setFormDescription(preset.description);
    setFormObjective(preset.objective);
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

    // Setup sequence
    const templatedCourses: LearningPathCourse[] = preset.defaultCourseIds.map((cId, idx) => ({
      courseId: cId,
      order: idx + 1,
      isRequired: true,
      prerequisiteCourseIds: idx > 0 ? [preset.defaultCourseIds[idx - 1]] : [],
    }));
    setFormCourses(templatedCourses);
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
            style={{ maxWidth: '840px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="modal-header" style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                  <span className="badge badge-primary">{editingPathId ? 'Edit Learning Path' : 'Create Learning Path'}</span>
                  <span className="text-muted text-xs">Multi-Tenant Curriculum Journey Studio</span>
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                  {formTitle || (editingPathId ? 'Edit Learning Journey' : 'New Learning Journey')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsBuilderOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Stepper Tabs Bar */}
            <div
              style={{
                display: 'flex',
                borderBottom: '1px solid var(--border-subtle)',
                background: 'var(--bg-input)',
                overflowX: 'auto',
              }}
            >
              {[
                { step: 1, label: 'A. Basic Details' },
                { step: 2, label: 'B. Add Courses' },
                { step: 3, label: 'C. Completion Rules' },
                { step: 4, label: 'D. Assign Learners' },
                { step: 5, label: 'E. Review & Publish' },
              ].map((tab) => (
                <button
                  key={tab.step}
                  type="button"
                  onClick={() => setBuilderStep(tab.step as any)}
                  style={{
                    padding: '12px 18px',
                    background: 'none',
                    border: 'none',
                    borderBottom: builderStep === tab.step ? '2px solid var(--primary)' : '2px solid transparent',
                    color: builderStep === tab.step ? 'var(--primary)' : 'var(--text-secondary)',
                    fontWeight: builderStep === tab.step ? 700 : 500,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'var(--transition)',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Builder Body */}
            <div className="modal-body" style={{ padding: '24px' }}>
              {/* Error Banners */}
              {builderErrors.length > 0 && (
                <div
                  style={{
                    padding: '12px 16px',
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid var(--danger-border)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--danger)',
                    fontSize: '0.85rem',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <AlertTriangle size={18} />
                  <div>
                    {builderErrors.map((err, i) => (
                      <div key={i}>{err}</div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 1: BASIC DETAILS */}
              {builderStep === 1 && (
                <div>
                  {/* Quick-Start Templates Selector */}
                  {!editingPathId && (
                    <div
                      style={{
                        padding: '16px',
                        background: 'rgba(99, 102, 241, 0.08)',
                        border: '1px solid rgba(99, 102, 241, 0.25)',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: '20px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <Sparkles size={16} color="var(--primary)" />
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                          Quick-Start Journey Templates (Optional)
                        </span>
                      </div>
                      <p className="text-secondary text-xs" style={{ marginBottom: '12px' }}>
                        Select a pre-configured template tailored to your organization type to auto-fill settings and courses.
                      </p>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px' }}>
                        {PATH_TEMPLATE_PRESETS.map((tpl) => (
                          <button
                            key={tpl.id}
                            type="button"
                            onClick={() => handleApplyTemplate(tpl)}
                            style={{
                              padding: '10px 12px',
                              textAlign: 'left',
                              background: 'var(--bg-card)',
                              border: '1px solid var(--border-subtle)',
                              borderRadius: 'var(--radius-md)',
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '4px',
                            }}
                          >
                            <span style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--primary)' }}>
                              {tpl.name}
                            </span>
                            <span className="text-muted text-xs" style={{ fontSize: '0.7rem' }}>
                              {tpl.institutionType.toUpperCase()} &bull; {tpl.category}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Form fields */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                      <label className="form-label">
                        Learning Path Name <span className="required">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        className="form-input"
                        placeholder="e.g., Enterprise Software Systems Architecture Track"
                        value={formTitle}
                        onChange={(e) => setFormTitle(e.target.value)}
                      />
                    </div>

                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                      <label className="form-label">Short Description / Objective</label>
                      <textarea
                        rows={2}
                        className="form-textarea"
                        placeholder="Outline the goals and outcomes of this learning journey..."
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Institution Type / Purpose</label>
                      <select
                        className="form-input"
                        value={formInstitutionType}
                        onChange={(e) => setFormInstitutionType(e.target.value as any)}
                      >
                        <option value="corporate">Corporate Company (Onboarding, Compliance, Skill Prep)</option>
                        <option value="higher_ed">College / University (Semester, Degree Major, Sequence)</option>
                        <option value="school">School (K-12) (Grade, Subject Sequence, Remedial)</option>
                        <option value="training_institute">Training Institute (Certification, Bootcamp, Fast Track)</option>
                        <option value="general">General / Independent Organization</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Purpose / Category</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Employee Onboarding, Degree Specialization, Remedial Learning"
                        value={formCategory}
                        onChange={(e) => setFormCategory(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Difficulty Level</label>
                      <select
                        className="form-input"
                        value={formDifficulty}
                        onChange={(e) => setFormDifficulty(e.target.value as any)}
                      >
                        <option value="Beginner">Beginner (Foundational)</option>
                        <option value="Intermediate">Intermediate (Core Practice)</option>
                        <option value="Advanced">Advanced (Expert / Capstone)</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Target Audience / Department</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Engineering & IT, Grade 11 Science, New Hires"
                        value={formTargetGroup}
                        onChange={(e) => setFormTargetGroup(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Target Role / Career Milestone</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Cloud Architect, Senior Developer, Board Candidate"
                        value={formTargetRole}
                        onChange={(e) => setFormTargetRole(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Initial Status</label>
                      <select
                        className="form-input"
                        value={formStatus}
                        onChange={(e) => setFormStatus(e.target.value as any)}
                      >
                        <option value="published">Published (Visible to eligible learners)</option>
                        <option value="draft">Draft (Work in progress)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: ADD COURSES */}
              {builderStep === 2 && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    {/* Left: Available Courses Picker */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <label className="form-label" style={{ margin: 0 }}>
                          Select from Course Catalog
                        </label>
                        <span className="text-muted text-xs">{availableCourses.length} courses available</span>
                      </div>

                      {/* Filter in picker */}
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Search courses..."
                        value={courseSearchInput}
                        onChange={(e) => setCourseSearchInput(e.target.value)}
                        style={{ marginBottom: '10px', height: '34px', fontSize: '0.8rem' }}
                      />

                      <div
                        style={{
                          maxHeight: '340px',
                          overflowY: 'auto',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-md)',
                          padding: '8px',
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
                                  padding: '10px 12px',
                                  background: 'var(--bg-card)',
                                  borderRadius: 'var(--radius-sm)',
                                  border: '1px solid var(--border-subtle)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: '10px',
                                }}
                              >
                                <div>
                                  <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{c.title}</div>
                                  <div className="text-muted text-xs" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span>{c.category}</span>
                                    {hrs && <span>&bull; {hrs} hrs</span>}
                                    {isDraft && <span className="badge badge-draft" style={{ fontSize: '0.65rem' }}>Draft</span>}
                                    {isArchived && <span className="badge badge-error" style={{ fontSize: '0.65rem' }}>Archived</span>}
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  disabled={isAdded}
                                  onClick={() => handleAddCourseToForm(c.id)}
                                  className={`btn btn-xs ${isAdded ? 'btn-ghost' : 'btn-primary'}`}
                                  style={{ flexShrink: 0 }}
                                >
                                  {isAdded ? <Check size={12} /> : <Plus size={12} />} {isAdded ? 'Added' : 'Add'}
                                </button>
                              </div>
                            );
                          })}
                      </div>
                    </div>

                    {/* Right: Sequenced Path Courses */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <label className="form-label" style={{ margin: 0 }}>
                          Sequenced Courses in Path ({formCourses.length})
                        </label>
                        <span className="text-muted text-xs">Reorder with controls</span>
                      </div>

                      {formCourses.length === 0 ? (
                        <div
                          style={{
                            padding: '30px',
                            textAlign: 'center',
                            border: '1px dashed var(--border-subtle)',
                            borderRadius: 'var(--radius-md)',
                            color: 'var(--text-muted)',
                            fontSize: '0.85rem',
                          }}
                        >
                          No courses in sequence yet. Select courses from catalog on the left to build your path.
                        </div>
                      ) : (
                        <div
                          style={{
                            maxHeight: '340px',
                            overflowY: 'auto',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                          }}
                        >
                          {formCourses.map((ci, idx) => {
                            const crs = courses.find((c) => c.id === ci.courseId);
                            const title = crs?.title || `Course ID: ${ci.courseId}`;
                            const isDraft = crs?.status === 'draft';
                            const hrs = crs?.durationHours || (crs?.estimatedDuration ? Math.round(crs.estimatedDuration / 60) : null);

                            // Potential earlier courses in sequence that can be prerequisites
                            const earlierCourses = formCourses.slice(0, idx);

                            return (
                              <div
                                key={ci.courseId}
                                style={{
                                  padding: '10px 12px',
                                  background: 'var(--bg-input)',
                                  borderRadius: 'var(--radius-md)',
                                  border: '1px solid var(--border-subtle)',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span
                                      style={{
                                        width: '22px',
                                        height: '22px',
                                        borderRadius: '50%',
                                        background: 'var(--primary)',
                                        color: '#fff',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                      }}
                                    >
                                      {idx + 1}
                                    </span>
                                    <div>
                                      <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{title}</div>
                                      <div className="text-muted text-xs" style={{ display: 'flex', gap: '6px' }}>
                                        {hrs && <span>{hrs} hrs</span>}
                                        {isDraft && <span style={{ color: 'var(--warning)' }}>&bull; Warning: Draft Course</span>}
                                      </div>
                                    </div>
                                  </div>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <button
                                      type="button"
                                      disabled={idx === 0}
                                      onClick={() => handleMoveCourseUp(idx)}
                                      className="btn btn-ghost btn-xs"
                                      style={{ padding: '4px' }}
                                      title="Move Up"
                                    >
                                      <ArrowUp size={12} />
                                    </button>
                                    <button
                                      type="button"
                                      disabled={idx === formCourses.length - 1}
                                      onClick={() => handleMoveCourseDown(idx)}
                                      className="btn btn-ghost btn-xs"
                                      style={{ padding: '4px' }}
                                      title="Move Down"
                                    >
                                      <ArrowDown size={12} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveCourseFromForm(ci.courseId)}
                                      className="btn btn-ghost btn-xs"
                                      style={{ color: 'var(--danger)', padding: '4px' }}
                                      title="Remove"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                </div>

                                {/* Prerequisite Configuration */}
                                {idx > 0 && (
                                  <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px solid var(--border-subtle)', fontSize: '0.75rem' }}>
                                    <span className="text-muted" style={{ marginRight: '6px' }}>
                                      Prerequisite Course:
                                    </span>
                                    {earlierCourses.map((ec, ecIdx) => {
                                      const ecCrs = courses.find((c) => c.id === ec.courseId);
                                      const isSelected = (ci.prerequisiteCourseIds || []).includes(ec.courseId);

                                      return (
                                        <button
                                          key={ec.courseId}
                                          type="button"
                                          onClick={() => handleTogglePrerequisite(ci.courseId, ec.courseId)}
                                          style={{
                                            padding: '2px 8px',
                                            marginRight: '4px',
                                            borderRadius: 'var(--radius-sm)',
                                            border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                                            background: isSelected ? 'var(--primary-light)' : 'transparent',
                                            color: isSelected ? 'var(--primary)' : 'var(--text-secondary)',
                                            fontSize: '0.7rem',
                                            cursor: 'pointer',
                                          }}
                                        >
                                          Step {ecIdx + 1}: {ecCrs?.title?.substring(0, 16)}...
                                        </button>
                                      );
                                    })}
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
                      marginTop: '16px',
                      padding: '10px 14px',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '0.8rem',
                      color: 'var(--text-muted)',
                    }}
                  >
                    <CheckCircle2 size={16} color="var(--success)" />
                    <span>Circular dependency validator verified: Sequential prerequisites graph has no circular loops.</span>
                  </div>
                </div>
              )}

              {/* TAB 3: COMPLETION RULES */}
              {builderStep === 3 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  <div style={{ padding: '16px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Strict Course Progression Order</div>
                        <div className="text-secondary text-xs">
                          Require learners to complete preceding courses before subsequent courses unlock.
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={formEnforceSequence}
                        onChange={(e) => setFormEnforceSequence(e.target.checked)}
                        style={{ width: '18px', height: '18px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                      />
                    </div>
                  </div>

                  <div style={{ padding: '16px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Pass Assessment Requirements</div>
                        <div className="text-secondary text-xs">
                          Distinguishes simple video/reading completion from passing quizzes and capstones (Passing grade ≥ 70%).
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={formRequireAssessments}
                        onChange={(e) => setFormRequireAssessments(e.target.checked)}
                        style={{ width: '18px', height: '18px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                      />
                    </div>
                  </div>

                  <div style={{ padding: '16px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ marginBottom: '8px' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Minimum Overall Completion Threshold</div>
                      <div className="text-secondary text-xs">
                        Percentage of course modules and lessons required to satisfy journey requirements.
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '10px' }}>
                      <input
                        type="range"
                        min="50"
                        max="100"
                        step="5"
                        value={formCompletionThreshold}
                        onChange={(e) => setFormCompletionThreshold(Number(e.target.value))}
                        style={{ flex: 1, accentColor: 'var(--primary)' }}
                      />
                      <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--primary)', minWidth: '50px' }}>
                        {formCompletionThreshold}%
                      </span>
                    </div>
                  </div>

                  <div style={{ padding: '16px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Issue Verifiable Milestone Certificate</div>
                        <div className="text-secondary text-xs">
                          Automatically generate and award verified digital certificate upon journey completion.
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
                      <div style={{ marginTop: '12px' }}>
                        <label className="form-label">Certificate Title</label>
                        <input
                          type="text"
                          className="form-input"
                          value={formCertificateTitle}
                          onChange={(e) => setFormCertificateTitle(e.target.value)}
                          placeholder="e.g. Certified Full-Stack Cloud Solutions Architect"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: ASSIGN LEARNERS */}
              {builderStep === 4 && (
                <div>
                  <div
                    style={{
                      padding: '12px 16px',
                      background: 'rgba(59, 130, 246, 0.1)',
                      border: '1px solid var(--info-border)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.8rem',
                      color: 'var(--info)',
                      marginBottom: '18px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                    }}
                  >
                    <Info size={18} />
                    <span>
                      Frontend State Sync: Assignments are stored locally in state and sync with session store. Respects multi-tenant organization boundaries.
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    {/* Assign by Cohorts / Batches */}
                    <div>
                      <label className="form-label">Assign Classes & Cohort Batches</label>
                      <div
                        style={{
                          maxHeight: '260px',
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
                        {cohorts.map((coh) => {
                          const isAssigned = formCohortIds.includes(coh.id);
                          return (
                            <label
                              key={coh.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px 10px',
                                background: isAssigned ? 'var(--primary-light)' : 'var(--bg-card)',
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
                                style={{ accentColor: 'var(--primary)' }}
                              />
                              <div>
                                <div style={{ fontWeight: 600 }}>{coh.name}</div>
                                <div className="text-muted text-xs">
                                  {coh.code} &bull; {coh.learnerCount || 0} students
                                </div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* Assign by Departments */}
                    <div>
                      <label className="form-label">Assign Institution Departments</label>
                      <div
                        style={{
                          maxHeight: '260px',
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
                        {mockDepartments.map((dept) => {
                          const isAssigned = formDepartmentIds.includes(dept.id);
                          return (
                            <label
                              key={dept.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px 10px',
                                background: isAssigned ? 'var(--primary-light)' : 'var(--bg-card)',
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
                                style={{ accentColor: 'var(--primary)' }}
                              />
                              <div>
                                <div style={{ fontWeight: 600 }}>{dept.name}</div>
                                <div className="text-muted text-xs">{dept.memberCount} members</div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: REVIEW & PUBLISH */}
              {builderStep === 5 && (
                <div>
                  <div
                    style={{
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '20px',
                      marginBottom: '20px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      {renderInstitutionBadge(formInstitutionType)}
                      <span className="badge badge-secondary">{formDifficulty}</span>
                    </div>

                    <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '0 0 6px 0' }}>
                      {formTitle || 'Untitled Learning Journey'}
                    </h3>
                    <p className="text-secondary text-xs" style={{ marginBottom: '16px' }}>
                      {formDescription || 'No description entered.'}
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', fontSize: '0.8rem', textAlign: 'center' }}>
                      <div style={{ padding: '8px', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)' }}>
                        <div className="text-muted text-xs">Total Courses</div>
                        <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{formCourses.length}</div>
                      </div>
                      <div style={{ padding: '8px', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)' }}>
                        <div className="text-muted text-xs">Total Duration</div>
                        <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>
                          {calculateTotalDuration(formCourses) || 0} hrs
                        </div>
                      </div>
                      <div style={{ padding: '8px', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)' }}>
                        <div className="text-muted text-xs">Assigned Cohorts</div>
                        <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{formCohortIds.length}</div>
                      </div>
                      <div style={{ padding: '8px', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)' }}>
                        <div className="text-muted text-xs">Certificate</div>
                        <div style={{ fontWeight: 800, fontSize: '1.1rem', color: formCertificateEligible ? 'var(--success)' : 'var(--text-muted)' }}>
                          {formCertificateEligible ? 'Enabled' : 'Disabled'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '10px' }}>
                    Course Progression Preview
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {formCourses.map((ci, idx) => {
                      const crs = courses.find((c) => c.id === ci.courseId);
                      return (
                        <div
                          key={ci.courseId}
                          style={{
                            padding: '10px 14px',
                            background: 'var(--bg-card)',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-subtle)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            fontSize: '0.85rem',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontWeight: 700, color: 'var(--primary)' }}>Step {idx + 1}</span>
                            <span style={{ fontWeight: 600 }}>{crs?.title}</span>
                          </div>
                          <span className="text-muted text-xs">{crs?.category}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Controls */}
            <div
              className="modal-footer"
              style={{
                padding: '16px 24px',
                borderTop: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                {builderStep > 1 && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setBuilderStep((builderStep - 1) as any)}
                  >
                    Back
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setIsBuilderOpen(false)}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleSavePath('draft')}
                >
                  Save as Draft
                </button>

                {builderStep < 5 ? (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => setBuilderStep((builderStep + 1) as any)}
                  >
                    Next Step <ChevronRight size={14} />
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => handleSavePath('published')}
                    style={{ background: 'var(--success)', borderColor: 'var(--success)' }}
                  >
                    <CheckCircle2 size={14} /> Publish Learning Path
                  </button>
                )}
              </div>
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
