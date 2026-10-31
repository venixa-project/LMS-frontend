import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../lib/store';
import { useCourseStore } from '../../lib/courseStore';
import { usePeopleStore } from '../../lib/peopleStore';
import { useCohortStore } from '../../lib/cohortStore';
import { mockDepartments } from '../../data/mockData';
import {
  Course, CourseModule, Lesson, EntityStatus,
  QuizAssessmentConfig, UploadedDocumentInfo, QuizQuestionItem
} from '../../types';
import { BackToCoursesButton } from '../../components/BackToCoursesButton';
import { AssessmentConfigModal } from './components/AssessmentConfigModal';
import { ConfirmationModal } from './components/ConfirmationModal';
import { DocumentUploadCard } from './components/DocumentUploadCard';
import { FinalAssessmentCard } from './components/FinalAssessmentCard';
import {
  BookOpen, Plus, Trash2, ArrowLeft, ArrowRight, Save, CheckCircle2,
  Video, FileText, HelpCircle, Link as LinkIcon, MoveUp, MoveDown,
  Eye, Check, AlertCircle, Sparkles, Send, Users, UserCheck, Search,
  GraduationCap, Clock, Award, Shield, CheckSquare, Square, X,
  Layers, ExternalLink, Share2, AlertTriangle, UserPlus, Info, Edit2, RefreshCw,
  Calendar, PenTool, Upload
} from 'lucide-react';
import { useSignatureStore } from '../../lib/signatureStore';

export const CourseBuilderPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editingCourseId = searchParams.get('id') || searchParams.get('edit');

  const { user } = useAuthStore();
  const { addCourse, assignStudentsToCourse, courses, enrollments } = useCourseStore();
  const { getFaculty, getStudents } = usePeopleStore();
  const { cohorts } = useCohortStore();
  const { getApprovedSignatories, getDefaultSignatoryForUser, hasConfiguredSignature } = useSignatureStore();

  const isPlatformAdmin = user?.activeRole === 'platform_admin';
  const isOrgAdmin =
    user?.activeRole === 'org_admin' ||
    user?.activeRole === 'lms_admin' ||
    (user?.activeRole as string) === 'industrial_admin';
  const isFaculty = user?.activeRole === 'trainer' || user?.activeRole === 'instructor';
  const isAdmin = isPlatformAdmin || isOrgAdmin || (!isFaculty && user?.activeRole !== 'student');

  // Stepper state (1 to 4)
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // -------------------------------------------------------------
  // STEP 1: Basic Information
  // -------------------------------------------------------------
  const [title, setTitle] = useState('');
  const [courseCode, setCourseCode] = useState(() => `CRS-2026-${Math.floor(100 + Math.random() * 900)}`);
  const [description, setDescription] = useState('');
  const [departmentId, setDepartmentId] = useState<string>('');
  const [category, setCategory] = useState('');
  const [difficultyLevel, setDifficultyLevel] = useState<'beginner' | 'intermediate' | 'advanced' | ''>('');
  const [durationHours, setDurationHours] = useState<number | ''>('');
  const [completionPolicy, setCompletionPolicy] = useState('all_lessons_and_passing_assessment');
  const DEFAULT_COURSE_THUMBNAIL = 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=600&q=80';
  const [thumbnailUrl, setThumbnailUrl] = useState<string>('');
  const [thumbnailError, setThumbnailError] = useState<string | null>(null);
  const [isDraggingThumbnail, setIsDraggingThumbnail] = useState(false);
  const thumbnailFileInputRef = useRef<HTMLInputElement>(null);

  const handleThumbnailFileSelect = (file: File) => {
    setThumbnailError(null);

    // Accept common image formats: PNG, JPG, JPEG, and WebP
    const validMimeTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    const validExtensions = ['.png', '.jpg', '.jpeg', '.webp'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!validMimeTypes.includes(file.type.toLowerCase()) && !validExtensions.includes(ext)) {
      setThumbnailError('Unsupported file format. Please upload a PNG, JPG, JPEG, or WebP image.');
      if (thumbnailFileInputRef.current) thumbnailFileInputRef.current.value = '';
      return;
    }

    // Maximum file size: 5 MB
    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      const sizeInMb = (file.size / (1024 * 1024)).toFixed(2);
      setThumbnailError(`File size exceeds 5 MB limit (selected: ${sizeInMb} MB). Please choose a smaller image.`);
      if (thumbnailFileInputRef.current) thumbnailFileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        setThumbnailUrl(result);
        setThumbnailError(null);
      }
    };
    reader.onerror = () => {
      setThumbnailError('Failed to read image file. Please try again.');
    };
    reader.readAsDataURL(file);

    if (thumbnailFileInputRef.current) thumbnailFileInputRef.current.value = '';
  };

  const handleThumbnailDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingThumbnail(true);
  };

  const handleThumbnailDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingThumbnail(false);
  };

  const handleThumbnailDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingThumbnail(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleThumbnailFileSelect(file);
    }
  };

  const handleRemoveThumbnail = () => {
    setThumbnailUrl('');
    setThumbnailError(null);
    if (thumbnailFileInputRef.current) thumbnailFileInputRef.current.value = '';
  };

  const handleResetDefaultThumbnail = () => {
    setThumbnailUrl(DEFAULT_COURSE_THUMBNAIL);
    setThumbnailError(null);
    if (thumbnailFileInputRef.current) thumbnailFileInputRef.current.value = '';
  };

  const [step1Error, setStep1Error] = useState<string | null>(null);

  // Course Availability Window (Start Date & End Date)
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // -------------------------------------------------------------
  // Completion, Certificate & Rewards State
  // -------------------------------------------------------------
  const [certificateEnabled, setCertificateEnabled] = useState(true);
  const [certTitle, setCertTitle] = useState('Certificate of Course Completion');
  const [certIssuingOrg, setCertIssuingOrg] = useState('Acme Learning Corp');
  const [certRequireAllLessons, setCertRequireAllLessons] = useState(true);
  const [certRequireAssessment, setCertRequireAssessment] = useState(true);
  const [certMinScore, setCertMinScore] = useState(70);
  const [certMinPercentage, setCertMinPercentage] = useState(100);
  const [certPoints, setCertPoints] = useState<number>(100);
  const [certTemplateId, setCertTemplateId] = useState<'standard' | 'executive' | 'distinction' | 'technical'>('standard');
  const [certValidityMonths, setCertValidityMonths] = useState<number>(0);

  // Authorized Signatory states
  const approvedSignatories = useMemo(() => getApprovedSignatories(), [getApprovedSignatories]);
  const creatorDefaultSig = useMemo(() => getDefaultSignatoryForUser(user), [getDefaultSignatoryForUser, user]);
  const isCreatorSigConfigured = useMemo(() => hasConfiguredSignature(user), [hasConfiguredSignature, user]);

  const [selectedSignatoryOption, setSelectedSignatoryOption] = useState<string>('creator_default');
  const [certSignerName, setCertSignerName] = useState(creatorDefaultSig.name || 'Dr. James Wilson');
  const [certSignerTitle, setCertSignerTitle] = useState(creatorDefaultSig.designation || 'Lead Instructor & Curriculum Director');
  const [certSignerSignatureImage, setCertSignerSignatureImage] = useState<string | undefined>(creatorDefaultSig.signatureImage);
  const [showCertPreviewModal, setShowCertPreviewModal] = useState(false);

  useEffect(() => {
    if (selectedSignatoryOption === 'creator_default') {
      setCertSignerName(creatorDefaultSig.name);
      setCertSignerTitle(creatorDefaultSig.designation);
      setCertSignerSignatureImage(creatorDefaultSig.signatureImage);
    }
  }, [selectedSignatoryOption, creatorDefaultSig]);

    // -------------------------------------------------------------
  // STEP 2: Curriculum & Lessons (Fresh Empty Outline in Create Mode)
  // -------------------------------------------------------------
  const [modules, setModules] = useState<CourseModule[]>([]);

  // Section C: Final Course Assessment (Unconfigured in Create Mode)
  const [finalAssessment, setFinalAssessment] = useState<QuizAssessmentConfig | undefined>(undefined);

  const [activeModuleIndex, setActiveModuleIndex] = useState(0);
  const [step2Error, setStep2Error] = useState<string | null>(null);

  // Assessment Config Modal State
  const [assessmentModalState, setAssessmentModalState] = useState<{
    isOpen: boolean;
    scope: 'lesson_quiz' | 'module_assessment' | 'final_assessment';
    modIndex: number | null;
    lessonIndex: number | null;
    config?: QuizAssessmentConfig;
  }>({
    isOpen: false,
    scope: 'lesson_quiz',
    modIndex: null,
    lessonIndex: null,
  });

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
  });

    // Resolved existing course for Edit Mode
  const editingCourse = useMemo(() => {
    if (!editingCourseId) return undefined;
    return courses.find((c) => c.id.toLowerCase() === editingCourseId.toLowerCase());
  }, [editingCourseId, courses]);

  const isEditing = Boolean(editingCourseId && editingCourse);

  // Helper to populate form when editing an existing course
  const loadCourseIntoForm = useCallback((existing: Course) => {
    setStep(1);
    setTitle(existing.title || '');
    setCourseCode(existing.id ? existing.id.toUpperCase().replace('CRS-', 'CRS-2026-') : `CRS-2026-${Math.floor(100 + Math.random() * 900)}`);
    setDescription(existing.description || '');
    setDepartmentId(existing.departmentId || '');
    setCategory(existing.category || '');
    setDifficultyLevel((existing.level as any) || 'intermediate');
    setDurationHours(existing.durationHours !== undefined ? existing.durationHours : '');
    setThumbnailUrl(existing.thumbnail || '');
    setStartDate(existing.startDate || '');
    setEndDate(existing.endDate || '');
    if (existing.completionPolicy) setCompletionPolicy(existing.completionPolicy);

    if (existing.modules && existing.modules.length > 0) {
      setModules(JSON.parse(JSON.stringify(existing.modules)));
      setActiveModuleIndex(0);
    } else {
      setModules([]);
      setActiveModuleIndex(0);
    }

    if (existing.finalAssessment) {
      setFinalAssessment(JSON.parse(JSON.stringify(existing.finalAssessment)));
    } else {
      setFinalAssessment(undefined);
    }

    if (existing.certificateConfig) {
      setCertificateEnabled(existing.certificateConfig.enabled ?? true);
      if (existing.certificateConfig.title) setCertTitle(existing.certificateConfig.title);
      if (existing.certificateConfig.issuingOrganization) setCertIssuingOrg(existing.certificateConfig.issuingOrganization);
      if (existing.certificateConfig.requireAllLessons !== undefined) setCertRequireAllLessons(existing.certificateConfig.requireAllLessons);
      if (existing.certificateConfig.requirePassingAssessment !== undefined) setCertRequireAssessment(existing.certificateConfig.requirePassingAssessment);
      if (existing.certificateConfig.minimumAssessmentScore !== undefined) setCertMinScore(existing.certificateConfig.minimumAssessmentScore);
      if (existing.certificateConfig.requiredCompletionPercentage !== undefined) setCertMinPercentage(existing.certificateConfig.requiredCompletionPercentage);
      if (existing.certificateConfig.completionPoints !== undefined) setCertPoints(existing.certificateConfig.completionPoints);
      if (existing.certificateConfig.templateId) setCertTemplateId(existing.certificateConfig.templateId as any);
      if (existing.certificateConfig.validityMonths !== undefined) setCertValidityMonths(existing.certificateConfig.validityMonths);
      if (existing.certificateConfig.authorizedSignerName) setCertSignerName(existing.certificateConfig.authorizedSignerName);
      if (existing.certificateConfig.authorizedSignerTitle) setCertSignerTitle(existing.certificateConfig.authorizedSignerTitle);
      if (existing.certificateConfig.authorizedSignatureImage) setCertSignerSignatureImage(existing.certificateConfig.authorizedSignatureImage);
    }

    if (existing.instructors && existing.instructors.length > 0) {
      setSelectedLeadFacultyId(existing.instructors[0]);
    } else {
      setSelectedLeadFacultyId(isFaculty ? (user?.id || 'u-004') : (user?.id || 'u-004'));
    }

    setPublishStatus(existing.status || 'draft');

    const enrolledIds = enrollments
      .filter((e) => e.courseId?.toLowerCase() === existing.id.toLowerCase())
      .map((e) => e.userId);
    setSelectedStudentIds(new Set(enrolledIds));

    setStep1Error(null);
    setStep2Error(null);
    setPublishError(null);
    setPublishedCourse(null);
    setSaveDraftNotice(null);
  }, [enrollments, isFaculty, user]);

  // Helper to reset form to pristine, fresh state for Create Mode
  const resetToEmptyForm = useCallback(() => {
    setStep(1);
    setTitle('');
    setCourseCode(`CRS-2026-${Math.floor(100 + Math.random() * 900)}`);
    setDescription('');
    setDepartmentId('');
    setCategory('');
    setDifficultyLevel('');
    setDurationHours('');
    setThumbnailUrl('');
    setStartDate('');
    setEndDate('');
    setCompletionPolicy('all_lessons_and_passing_assessment');
    setModules([]);
    setFinalAssessment(undefined);
    setActiveModuleIndex(0);
    setSelectedStudentIds(new Set());
    setPublishStatus('draft');
    setStep1Error(null);
    setStep2Error(null);
    setPublishError(null);
    setPublishedCourse(null);
    setSaveDraftNotice(null);
    setSelectedLeadFacultyId(isFaculty ? (user?.id || 'u-004') : (user?.id || 'u-004'));
    setFacultyDeptFilter('all');
    setStudentDeptFilter('all');
    setSelectedCohortId('all');
    setStudentSearchQuery('');
    setFacultySearchQuery('');
    setCertificateEnabled(true);
    setCertTitle('Certificate of Course Completion');
    setCertIssuingOrg('Acme Learning Corp');
    setCertRequireAllLessons(true);
    setCertRequireAssessment(true);
    setCertMinScore(70);
    setCertMinPercentage(100);
    setCertPoints(100);
    setCertTemplateId('standard');
    setCertValidityMonths(0);
    setSelectedSignatoryOption('creator_default');
  }, [isFaculty, user]);

  // Track previous editing ID to isolate state between Create and Edit modes
  const prevEditingIdRef = useRef<string | null>(editingCourseId);

  useEffect(() => {
    if (editingCourseId) {
      const existing = courses.find((c) => c.id.toLowerCase() === editingCourseId.toLowerCase());
      if (existing) {
        loadCourseIntoForm(existing);
      }
    } else {
      // Transitioning from Edit mode to Create mode or loading fresh: ensure pristine empty state
      if (prevEditingIdRef.current !== null) {
        resetToEmptyForm();
      }
    }
    prevEditingIdRef.current = editingCourseId;
  }, [editingCourseId, courses, loadCourseIntoForm, resetToEmptyForm]);

  // -------------------------------------------------------------
  // STEP 3: Assign Faculty & Students
  // -------------------------------------------------------------
  // Lead Faculty selection state
  const [facultyDeptFilter, setFacultyDeptFilter] = useState<string>(departmentId);
  const [facultySearchQuery, setFacultySearchQuery] = useState('');
  const [selectedLeadFacultyId, setSelectedLeadFacultyId] = useState<string>('u-004'); // Prof. David Wilson default

  // Student assignment state (Optional)
  const [studentDeptFilter, setStudentDeptFilter] = useState<string>(departmentId);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [selectedCohortId, setSelectedCohortId] = useState<string>('all');

  // Synchronize Step 3 department defaults when Step 1 department changes
  const handleDepartmentChange = (newDeptId: string) => {
    setDepartmentId(newDeptId);
    setFacultyDeptFilter(newDeptId);
    setStudentDeptFilter(newDeptId);
  };

  // All faculty members from store
  const allFaculty = useMemo(() => getFaculty(), [getFaculty]);

  // All students from store
  const allStudents = useMemo(() => getStudents(), [getStudents]);

  // Filtered faculty for Step 3
  const filteredFaculty = useMemo(() => {
    return allFaculty.filter((fac) => {
      // Department filter
      if (facultyDeptFilter !== 'all' && fac.departmentId !== facultyDeptFilter) {
        return false;
      }
      // Search query (name, id, email)
      if (facultySearchQuery.trim()) {
        const q = facultySearchQuery.toLowerCase().trim();
        const nameMatch = (fac.displayName || `${fac.firstName} ${fac.lastName}`).toLowerCase().includes(q);
        const emailMatch = fac.email.toLowerCase().includes(q);
        const idMatch = (fac.rollNo || fac.id).toLowerCase().includes(q);
        return nameMatch || emailMatch || idMatch;
      }
      return true;
    });
  }, [allFaculty, facultyDeptFilter, facultySearchQuery]);

  // Selected lead faculty details
  const selectedFacultyMember = useMemo(() => {
    return allFaculty.find((f) => f.id === selectedLeadFacultyId);
  }, [allFaculty, selectedLeadFacultyId]);

    // Trainer authorized academic departments
  const trainerAuthorizedDepartments = useMemo(() => {
    if (!isFaculty) return mockDepartments;
    const userDeptId = user?.departmentId || (user?.id === 'u-004' ? 'dep-001' : user?.id === 'u-003' ? 'dep-002' : 'dep-001');
    return mockDepartments.filter((d) => d.id === userDeptId);
  }, [isFaculty, user]);

  // Trainer authorized cohorts/batches
  const trainerAuthorizedCohorts = useMemo(() => {
    if (!isFaculty) return cohorts;
    const trainerId = user?.id || 'u-004';
    return cohorts.filter((coh) => {
      if (coh.instructors && coh.instructors.includes(trainerId)) return true;
      if (coh.instructorIds && coh.instructorIds.includes(trainerId)) return true;
      if (trainerId === 'u-004' && (coh.id === 'coh-001' || coh.id === 'coh-002')) return true;
      if (trainerId === 'u-003' && (coh.id === 'coh-003' || coh.id === 'coh-005')) return true;
      if (trainerId === 'u-005' && coh.id === 'coh-004') return true;
      if (editingCourseId && coh.courseId === editingCourseId) return true;
      return false;
    });
  }, [isFaculty, cohorts, user, editingCourseId]);

  // Trainer authorized student IDs (strictly restricted to assigned cohorts)
  const trainerAuthorizedStudentIds = useMemo(() => {
    if (!isFaculty) return null;
    const ids = new Set<string>();
    trainerAuthorizedCohorts.forEach((c) => {
      c.studentIds?.forEach((stId) => ids.add(stId));
    });
    return ids;
  }, [isFaculty, trainerAuthorizedCohorts]);

  // Already enrolled student IDs (prevents duplicate assignment)
  const alreadyEnrolledStudentIds = useMemo(() => {
    if (!editingCourseId) return new Set<string>();
    const enrolled = enrollments
      .filter((e) => e.courseId?.toLowerCase() === editingCourseId.toLowerCase())
      .map((e) => e.userId);
    return new Set<string>(enrolled);
  }, [editingCourseId, enrollments]);

  // Filtered students for Step 3
  const filteredStudents = useMemo(() => {
    return allStudents.filter((st) => {
      // Trainer isolation: must belong to trainer's authorized department & cohorts
      if (isFaculty) {
        if (trainerAuthorizedStudentIds && !trainerAuthorizedStudentIds.has(st.id)) {
          return false;
        }
        if (trainerAuthorizedDepartments.length > 0 && !trainerAuthorizedDepartments.some((d) => d.id === st.departmentId)) {
          return false;
        }
      }

      // Department filter
      if (studentDeptFilter !== 'all' && st.departmentId !== studentDeptFilter) {
        return false;
      }
      // Cohort filter
      if (selectedCohortId !== 'all') {
        const targetCohort = cohorts.find((c) => c.id === selectedCohortId);
        if (!targetCohort || !targetCohort.studentIds?.includes(st.id)) {
          return false;
        }
      }
      // Search query (name, id, email)
      if (studentSearchQuery.trim()) {
        const q = studentSearchQuery.toLowerCase().trim();
        const nameMatch = (st.displayName || `${st.firstName} ${st.lastName}`).toLowerCase().includes(q);
        const emailMatch = st.email.toLowerCase().includes(q);
        const idMatch = (st.rollNo || st.id).toLowerCase().includes(q);
        return nameMatch || emailMatch || idMatch;
      }
      return true;
    });
  }, [allStudents, isFaculty, trainerAuthorizedStudentIds, trainerAuthorizedDepartments, studentDeptFilter, selectedCohortId, studentSearchQuery, cohorts]);

  // Student selection helpers
  const handleToggleStudent = (studentId: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  };

  const handleSelectAllFilteredStudents = () => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      filteredStudents.forEach((st) => {
        // Only select active/eligible students
        if (st.status !== 'suspended' && st.status !== 'deactivated') {
          next.add(st.id);
        }
      });
      return next;
    });
  };

  const handleDeselectAllFilteredStudents = () => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      filteredStudents.forEach((st) => next.delete(st.id));
      return next;
    });
  };

  // -------------------------------------------------------------
  // STEP 4: Final Preview & Publish
  // -------------------------------------------------------------
  const [publishStatus, setPublishStatus] = useState<EntityStatus>('draft');
  const [shareableLinkEnabled, setShareableLinkEnabled] = useState(true);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishedCourse, setPublishedCourse] = useState<Course | null>(null);
  const [saveDraftNotice, setSaveDraftNotice] = useState<string | null>(null);

  // Helper: Department Name
  const getDepartmentName = (deptId?: string) => {
    if (!deptId) return 'General';
    const dept = mockDepartments.find((d) => d.id === deptId);
    return dept ? dept.name : deptId;
  };

  // Helper: Cohort Name
  const getStudentCohort = (studentId: string) => {
    const ch = cohorts.find((c) => c.studentIds?.includes(studentId));
    return ch?.name || 'General Batch';
  };

  // Total curriculum statistics
  const totalLessonsCount = useMemo(() => {
    return modules.reduce((acc, m) => acc + m.lessons.length, 0);
  }, [modules]);

  const totalCurriculumMinutes = useMemo(() => {
    return modules.reduce(
      (acc, m) => acc + m.lessons.reduce((lAcc, l) => lAcc + (l.durationMinutes || 0), 0),
      0
    );
  }, [modules]);

  // Step 1 Validation
  const validateStep1 = (): boolean => {
    setStep1Error(null);
    if (!title.trim()) {
      setStep1Error('Course Title is required.');
      return false;
    }
    if (!courseCode.trim()) {
      setStep1Error('Course Code is required.');
      return false;
    }
    if (!description.trim()) {
      setStep1Error('Course Description / Summary is required.');
      return false;
    }
    if (!departmentId) {
      setStep1Error('Department selection is required.');
      return false;
    }
    if (!category) {
      setStep1Error('Course Category selection is required.');
      return false;
    }
    if (!difficultyLevel) {
      setStep1Error('Difficulty Level selection is required.');
      return false;
    }
    if (durationHours === '' || Number(durationHours) < 1) {
      setStep1Error('Estimated Duration in hours is required.');
      return false;
    }
    if (startDate && endDate && new Date(endDate) <= new Date(startDate)) {
      setStep1Error('Course End Date & Time must be later than Start Date & Time.');
      return false;
    }
    if (certificateEnabled) {
      if (certMinPercentage < 1 || certMinPercentage > 100) {
        setStep1Error('Required course completion percentage must be between 1% and 100%.');
        return false;
      }
      if (certPoints < 0 || isNaN(certPoints)) {
        setStep1Error('Reward points on completion must be a non-negative whole number.');
        return false;
      }
      if (!certSignerName.trim()) {
        setStep1Error('An authorized signatory name is required when certificates are enabled.');
        return false;
      }
    }
    return true;
  };

  // Step 2 Validation
  const validateStep2 = (): boolean => {
    setStep2Error(null);
    if (modules.length === 0) {
      setStep2Error('Please add at least one module before proceeding.');
      return false;
    }
    const hasEmptyModule = modules.some((m) => m.lessons.length === 0);
    if (hasEmptyModule) {
      setStep2Error('Each module should contain at least one lesson or assessment.');
      return false;
    }
    return true;
  };

  const handleNextFromStep1 = () => {
    if (validateStep1()) {
      setStep(2);
    }
  };

  const handleNextFromStep2 = () => {
    if (validateStep2()) {
      setStep(3);
    }
  };

  const handleNextFromStep3 = () => {
    setStep(4);
  };

  // Curriculum manipulation handlers
  // Module reordering
  const handleMoveModule = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === modules.length - 1) return;

    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const updated = [...modules];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIdx, 0, moved);

    const reordered = updated.map((m, idx) => ({ ...m, order: idx + 1 }));
    setModules(reordered);
    setActiveModuleIndex(targetIdx);
  };

  // Lesson reordering
  const handleMoveLesson = (modIndex: number, lessonIndex: number, direction: 'up' | 'down') => {
    const mod = modules[modIndex];
    if (!mod) return;
    if (direction === 'up' && lessonIndex === 0) return;
    if (direction === 'down' && lessonIndex === mod.lessons.length - 1) return;

    const targetIdx = direction === 'up' ? lessonIndex - 1 : lessonIndex + 1;
    const updatedLessons = [...mod.lessons];
    const [moved] = updatedLessons.splice(lessonIndex, 1);
    updatedLessons.splice(targetIdx, 0, moved);

    const reorderedLessons = updatedLessons.map((l, idx) => ({ ...l, order: idx + 1 }));
    const updatedModules = [...modules];
    updatedModules[modIndex] = {
      ...mod,
      lessons: reorderedLessons
    };
    setModules(updatedModules);
  };

  const handleAddModule = () => {
    const newMod: CourseModule = {
      id: `mod-${Date.now()}`,
      title: `Module ${modules.length + 1}: Core Concepts`,
      order: modules.length + 1,
      lessons: []
    };
    setModules([...modules, newMod]);
    setActiveModuleIndex(modules.length);
  };

  const requestDeleteModule = (idx: number) => {
    if (modules.length <= 1) {
      alert('A course must retain at least one module.');
      return;
    }
    const targetModule = modules[idx];
    setConfirmModal({
      isOpen: true,
      title: 'Delete Module',
      message: `Are you sure you want to delete "${targetModule.title}"? All contained lessons (${targetModule.lessons.length}) and any attached module assessment will be permanently removed.`,
      onConfirm: () => {
        const updated = modules.filter((_, i) => i !== idx).map((m, i) => ({ ...m, order: i + 1 }));
        setModules(updated);
        if (activeModuleIndex >= updated.length) {
          setActiveModuleIndex(Math.max(0, updated.length - 1));
        }
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleAddLesson = (modIndex: number, type: 'video' | 'document' | 'quiz') => {
    const targetMod = modules[modIndex];
    const newLesson: Lesson = {
      id: `les-${Date.now()}-${targetMod.lessons.length + 1}`,
      title: `Lesson ${targetMod.lessons.length + 1}: ${type === 'video' ? 'Video Lecture' : type === 'document' ? 'Reading Material' : 'Knowledge Check'
        }`,
      type,
      durationMinutes: type === 'quiz' ? 15 : 20,
      isCompleted: false,
      order: targetMod.lessons.length + 1
    };
    const updated = [...modules];
    updated[modIndex] = {
      ...updated[modIndex],
      lessons: [...updated[modIndex].lessons, newLesson]
    };
    setModules(updated);
  };

  const requestDeleteLesson = (modIndex: number, lessonIdx: number) => {
    const targetLesson = modules[modIndex]?.lessons[lessonIdx];
    if (!targetLesson) return;

    setConfirmModal({
      isOpen: true,
      title: 'Delete Lesson',
      message: `Are you sure you want to remove "${targetLesson.title}" from this module? Any uploaded document or quiz configuration will be discarded.`,
      onConfirm: () => {
        const updated = [...modules];
        updated[modIndex] = {
          ...updated[modIndex],
          lessons: updated[modIndex].lessons.filter((_, lI) => lI !== lessonIdx).map((l, i) => ({ ...l, order: i + 1 }))
        };
        setModules(updated);
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Document management in lessons
  const handleLessonDocumentUpload = (modIndex: number, lessonIndex: number, doc: UploadedDocumentInfo) => {
    const updated = [...modules];
    updated[modIndex].lessons[lessonIndex] = {
      ...updated[modIndex].lessons[lessonIndex],
      uploadedDocument: doc
    };
    setModules(updated);
  };

  const handleLessonDocumentRemove = (modIndex: number, lessonIndex: number) => {
    const updated = [...modules];
    updated[modIndex].lessons[lessonIndex] = {
      ...updated[modIndex].lessons[lessonIndex],
      uploadedDocument: undefined
    };
    setModules(updated);
  };

  // Assessment modal triggers
  const handleOpenLessonQuizModal = (modIndex: number, lessonIndex: number) => {
    const targetLesson = modules[modIndex]?.lessons[lessonIndex];
    if (!targetLesson) return;
    setAssessmentModalState({
      isOpen: true,
      scope: 'lesson_quiz',
      modIndex,
      lessonIndex,
      config: targetLesson.quizConfig
    });
  };

  const handleOpenModuleAssessmentModal = (modIndex: number) => {
    const targetMod = modules[modIndex];
    if (!targetMod) return;
    setAssessmentModalState({
      isOpen: true,
      scope: 'module_assessment',
      modIndex,
      lessonIndex: null,
      config: targetMod.assessment
    });
  };

  const handleOpenFinalAssessmentModal = () => {
    setAssessmentModalState({
      isOpen: true,
      scope: 'final_assessment',
      modIndex: null,
      lessonIndex: null,
      config: finalAssessment
    });
  };

  // Assessment removals with confirmation
  const requestRemoveLessonQuiz = (modIndex: number, lessonIndex: number) => {
    setConfirmModal({
      isOpen: true,
      title: 'Remove Lesson Quiz',
      message: 'Are you sure you want to reset and clear the quiz configuration for this lesson?',
      onConfirm: () => {
        const updated = [...modules];
        updated[modIndex].lessons[lessonIndex] = {
          ...updated[modIndex].lessons[lessonIndex],
          quizConfig: undefined
        };
        setModules(updated);
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      }
    });
  };

  const requestRemoveModuleAssessment = (modIndex: number) => {
    const targetMod = modules[modIndex];
    setConfirmModal({
      isOpen: true,
      title: 'Remove Module Assessment',
      message: `Are you sure you want to delete the assessment attached to "${targetMod.title}"?`,
      onConfirm: () => {
        const updated = [...modules];
        updated[modIndex] = {
          ...updated[modIndex],
          assessment: undefined
        };
        setModules(updated);
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      }
    });
  };

  const requestRemoveFinalAssessment = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Remove Final Course Assessment',
      message: 'Are you sure you want to remove the Final Course Assessment? Learners will not be evaluated on an overarching course examination.',
      onConfirm: () => {
        setFinalAssessment(undefined);
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Saving assessment from modal
  const handleSaveAssessmentConfig = (savedConfig: QuizAssessmentConfig) => {
    const { scope, modIndex, lessonIndex } = assessmentModalState;

    if (scope === 'lesson_quiz' && modIndex !== null && lessonIndex !== null) {
      const updated = [...modules];
      updated[modIndex].lessons[lessonIndex] = {
        ...updated[modIndex].lessons[lessonIndex],
        quizConfig: savedConfig
      };
      setModules(updated);
    } else if (scope === 'module_assessment' && modIndex !== null) {
      const updated = [...modules];
      updated[modIndex] = {
        ...updated[modIndex],
        assessment: savedConfig
      };
      setModules(updated);
    } else if (scope === 'final_assessment') {
      setFinalAssessment(savedConfig);
    }

    setAssessmentModalState((prev) => ({ ...prev, isOpen: false }));
  };

  // Pre-publish validation check
  const validateForPublish = (): { isValid: boolean; warnings: string[]; errors: string[] } => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!title.trim()) errors.push('Course title is required.');
    if (!courseCode.trim()) errors.push('Course code is required.');
    if (modules.length === 0) errors.push('At least one module is required.');

    modules.forEach((m, mIdx) => {
      if (m.lessons.length === 0) {
        errors.push(`Module ${mIdx + 1} ("${m.title}") contains no lessons.`);
      }

      m.lessons.forEach((l) => {
        if (l.type === 'quiz' && (!l.quizConfig || !l.quizConfig.questions || l.quizConfig.questions.length === 0)) {
          warnings.push(`Lesson "${l.title}" in Module ${mIdx + 1} is set as Quiz but has no configured questions.`);
        }
      });

      if (m.assessment && (!m.assessment.questions || m.assessment.questions.length === 0)) {
        warnings.push(`Module assessment for "${m.title}" has no questions.`);
      }
    });

    if (startDate && endDate && new Date(endDate) <= new Date(startDate)) {
      errors.push('Course End Date & Time must be strictly later than Start Date & Time.');
    }

    if (certificateEnabled) {
      if (certMinPercentage < 1 || certMinPercentage > 100) {
        errors.push('Required course completion percentage must be between 1% and 100%.');
      }
      if (certPoints < 0 || isNaN(certPoints)) {
        errors.push('Reward points must be a non-negative whole number (0 or more).');
      }
      if (!certSignerName.trim()) {
        errors.push('An authorized certificate signatory is required when certificate issuance is enabled.');
      }
      if (!certSignerSignatureImage) {
        warnings.push('The selected signatory has no digital signature image configured in profile. It is recommended to configure a signature before publishing.');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  };

  // Aggregated course documents available across all modules
  const allCourseDocuments = useMemo(() => {
    const docs: UploadedDocumentInfo[] = [];
    modules.forEach((m) => {
      m.lessons.forEach((l) => {
        if (l.uploadedDocument) {
          docs.push(l.uploadedDocument);
        }
      });
    });
    return docs;
  }, [modules]);

  // Overall assessment evaluation statistics
  const evaluationStats = useMemo(() => {
    let lessonQuizzesCount = 0;
    let moduleAssessmentsCount = 0;
    let totalMarks = 0;
    let totalQuestions = 0;

    modules.forEach((m) => {
      if (m.assessment && m.assessment.questions && m.assessment.questions.length > 0) {
        moduleAssessmentsCount += 1;
        totalMarks += m.assessment.totalMarks || 0;
        totalQuestions += m.assessment.questions.length;
      }
      m.lessons.forEach((l) => {
        if (l.quizConfig && l.quizConfig.questions && l.quizConfig.questions.length > 0) {
          lessonQuizzesCount += 1;
          totalMarks += l.quizConfig.totalMarks || 0;
          totalQuestions += l.quizConfig.questions.length;
        }
      });
    });

    const hasFinal = Boolean(finalAssessment && finalAssessment.questions && finalAssessment.questions.length > 0);
    if (hasFinal && finalAssessment) {
      totalMarks += finalAssessment.totalMarks || 0;
      totalQuestions += finalAssessment.questions.length;
    }

    return {
      lessonQuizzesCount,
      moduleAssessmentsCount,
      hasFinal,
      totalAssessments: lessonQuizzesCount + moduleAssessmentsCount + (hasFinal ? 1 : 0),
      totalMarks,
      totalQuestions
    };
  }, [modules, finalAssessment]);

  // Save draft notification
  const handleSaveDraft = () => {
    setSaveDraftNotice('Course draft autosaved in your local builder session.');
    setTimeout(() => setSaveDraftNotice(null), 4000);
  };

  // Final Publish Handler
  const handleConfirmPublish = () => {
    const preCheck = validateForPublish();
    if (!preCheck.isValid) {
      setPublishError(preCheck.errors.join(' '));
      return;
    }

    setIsPublishing(true);
    setPublishError(null);

    try {
      const generatedId = editingCourseId || `crs-${courseCode.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now().toString().slice(-4)}`;
      const assignedInstructors = isFaculty ? [user?.id || 'u-004'] : (selectedLeadFacultyId ? [selectedLeadFacultyId] : ['u-004']);
      const enrolledCount = selectedStudentIds.size;

      const newCourse: Course = {
        createdBy: user?.id || (isFaculty ? 'u-004' : 'u-001'),
        id: generatedId,
        title: title.trim(),
        description: description.trim(),
        shortDescription: description.trim().slice(0, 140) + '...',
        category,
        departmentId,
        level: (difficultyLevel as any) || 'beginner',
        durationHours: Number(durationHours) || 1,
        completionPolicy,
        thumbnail: thumbnailUrl,
        status: publishStatus,
        version: 1,
        modules,
        finalAssessment,
        instructors: assignedInstructors,
        learnerCount: enrolledCount,
        enrolledLearners: enrolledCount,
        completionRate: 0,
        shareableLinkEnabled,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        completionPercentageRequired: certMinPercentage,
        completionPoints: certPoints,
        certificateConfig: {
          enabled: certificateEnabled,
          title: certTitle.trim() || 'Certificate of Course Completion',
          issuingOrganization: certIssuingOrg.trim() || 'Acme Learning Corp',
          templateId: certTemplateId,
          requireAllLessons: certRequireAllLessons,
          requirePassingAssessment: certRequireAssessment,
          minimumAssessmentScore: certMinScore,
          requiredCompletionPercentage: certMinPercentage,
          completionPoints: certPoints,
          validityMonths: certValidityMonths,
          authorizedSignerName: certSignerName.trim() || 'Dr. James Wilson',
          authorizedSignerTitle: certSignerTitle.trim() || 'Lead Instructor & Curriculum Director',
          authorizedSignatureImage: certSignerSignatureImage,
          secondarySignerName: 'Sarah Chen',
          secondarySignerTitle: 'Dean of Academic Affairs',
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // 1. Persist new course in store
      addCourse(newCourse);

      // 2. If students selected, register enrollments
      if (selectedStudentIds.size > 0) {
        assignStudentsToCourse(newCourse.id, Array.from(selectedStudentIds));
      }

      setPublishedCourse(newCourse);
      setIsConfirmModalOpen(false);
      setIsPublishing(false);
    } catch (err: any) {
      console.error('Publishing error:', err);
      setPublishError(err?.message || 'An unexpected error occurred while publishing the course.');
      setIsPublishing(false);
    }
  };

  // If course was successfully published, show the dedicated Success View
  if (publishedCourse) {
    return (
      <div style={{ maxWidth: '820px', margin: '0 auto', padding: '32px 16px' }}>
        <div
          className="card"
          style={{
            textAlign: 'center',
            padding: '40px 32px',
            borderTop: '5px solid var(--success)'
          }}
        >
          <div
            style={{
              width: '76px',
              height: '76px',
              borderRadius: '50%',
              background: 'var(--success-bg, rgba(16, 185, 129, 0.15))',
              color: 'var(--success)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              boxShadow: '0 0 0 10px rgba(16, 185, 129, 0.08)'
            }}
          >
            <CheckCircle2 size={44} />
          </div>

          <span className="badge badge-success" style={{ marginBottom: '12px', fontSize: '0.85rem' }}>
            Lifecycle: Published & Active
          </span>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '10px' }}>
            Course Published Successfully!
          </h1>
          <p className="text-secondary" style={{ maxWidth: '560px', margin: '0 auto 24px', fontSize: '0.95rem' }}>
            <strong>"{publishedCourse.title}"</strong> ({courseCode}) is now active in the catalog.
            Eligible students and faculty can access curriculum materials immediately.
          </p>

          {/* Quick Metrics Bar */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: '16px',
              background: 'var(--bg-input)',
              borderRadius: 'var(--radius-lg)',
              padding: '18px 24px',
              marginBottom: '32px',
              textAlign: 'left'
            }}
          >
            <div>
              <div className="text-muted text-xs">Department</div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{getDepartmentName(publishedCourse.departmentId)}</div>
            </div>
            <div>
              <div className="text-muted text-xs">Lead Faculty</div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                {selectedFacultyMember ? selectedFacultyMember.displayName || selectedFacultyMember.firstName : 'Assigned Faculty'}
              </div>
            </div>
            <div>
              <div className="text-muted text-xs">Pre-Enrolled Students</div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--primary)' }}>
                {selectedStudentIds.size > 0 ? `${selectedStudentIds.size} Students Enrolled` : '0 (Open for Enrollment)'}
              </div>
            </div>
            <div>
              <div className="text-muted text-xs">Curriculum Scope</div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                {publishedCourse.modules.length} Modules &bull; {totalLessonsCount} Lessons
              </div>
            </div>
          </div>

          {/* Next Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <button
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px' }}
              onClick={() => navigate('/courses')}
            >
              <BookOpen size={16} /> {isFaculty ? 'Go to My Courses' : 'View in Courses & Catalog'}
            </button>

            <button
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px' }}
              onClick={() => navigate(`/courses/${publishedCourse.id}/share`)}
            >
              <Share2 size={16} /> Share Course Link
            </button>

            {isAdmin && (
              <button
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px' }}
                onClick={() => navigate(`/courses/${publishedCourse.id}/assign-students`)}
              >
                <UserPlus size={16} /> Assign More Students
              </button>
            )}

            <button
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 18px' }}
              onClick={() => {
                setPublishedCourse(null);
                setStep(1);
                setTitle('');
                setCourseCode(`CRS-2026-${Math.floor(100 + Math.random() * 900)}`);
                setDescription('');
                setSelectedStudentIds(new Set());
              }}
            >
              <Plus size={16} /> Create Another Course
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: '60px' }}>
      {/* Top Header Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <BackToCoursesButton />

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {saveDraftNotice && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--success-bg, rgba(16, 185, 129, 0.15))',
                color: 'var(--success)',
                fontSize: '0.8rem',
                fontWeight: 600
              }}
            >
              <CheckCircle2 size={14} /> {saveDraftNotice}
            </div>
          )}

          {isEditing ? (
            <span className="badge badge-primary" style={{ fontWeight: 600 }}>
              Edit Mode: {editingCourse?.title || editingCourseId}
            </span>
          ) : (
            <span className="badge badge-draft" style={{ fontWeight: 600 }}>
              Create Mode &bull; New Course
            </span>
          )}

          <span className="badge badge-warning" style={{ fontWeight: 600, textTransform: 'capitalize' }}>
            Lifecycle: {publishStatus} (v{isEditing ? (editingCourse?.version || 1) : '1.0'})
          </span>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleSaveDraft}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Save size={14} /> Save Draft
          </button>
        </div>
      </div>

      {/* 4-STEP PROGRESS INDICATOR */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '8px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '10px 16px',
          marginBottom: '24px'
        }}
      >
        {[
          { stepNum: 1, title: '1. Basic Information', subtitle: 'Title, code & department' },
          { stepNum: 2, title: '2. Curriculum & Lessons', subtitle: 'Modules, lessons & format' },
          { stepNum: 3, title: isFaculty ? '3. Assign Students' : '3. Assign Faculty & Students', subtitle: isFaculty ? 'Pre-enroll cohort students' : 'Lead faculty & pre-enroll' },
          { stepNum: 4, title: '4. Preview & Publish', subtitle: 'Audit & publish live' }
        ].map((s) => {
          const isActive = step === s.stepNum;
          const isCompleted = step > s.stepNum;

          return (
            <button
              key={s.stepNum}
              type="button"
              onClick={() => {
                // Allow navigating backwards freely, or forward if validated
                if (s.stepNum < step) {
                  setStep(s.stepNum as any);
                } else if (s.stepNum === 2 && validateStep1()) {
                  setStep(2);
                } else if (s.stepNum === 3 && validateStep1() && validateStep2()) {
                  setStep(3);
                } else if (s.stepNum === 4 && validateStep1() && validateStep2()) {
                  setStep(4);
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                background: isActive ? 'var(--primary-light, rgba(99, 102, 241, 0.1))' : 'transparent',
                border: isActive ? '1px solid var(--primary)' : '1px solid transparent',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: isCompleted ? 'var(--success)' : isActive ? 'var(--primary)' : 'var(--bg-input)',
                  color: isCompleted || isActive ? '#fff' : 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  flexShrink: 0
                }}
              >
                {isCompleted ? <Check size={16} /> : s.stepNum}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    color: isActive ? 'var(--primary)' : isCompleted ? 'var(--text-primary)' : 'var(--text-muted)',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {s.title}
                </div>
                <div
                  className="text-muted text-xs"
                  style={{ fontSize: '0.72rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}
                >
                  {s.subtitle}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* ========================================================= */}
      {/* STEP 1: BASIC INFORMATION                                 */}
      {/* ========================================================= */}
      {step === 1 && (
        <div className="card" style={{ maxWidth: '880px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'var(--primary-light, rgba(99, 102, 241, 0.15))',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <BookOpen size={18} />
            </span>
            <div>
              <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 700 }}>Step 1: Course Basic Information</h2>
              <p className="text-secondary text-sm" style={{ margin: 0 }}>
                Define core academic attributes, code, department ownership, and credential policies.
              </p>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)', margin: '16px 0 20px' }} />

          {step1Error && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--danger-bg, rgba(239, 68, 68, 0.1))',
                border: '1px solid var(--danger, #ef4444)',
                color: 'var(--danger, #ef4444)',
                fontSize: '0.85rem',
                marginBottom: '20px'
              }}
            >
              <AlertCircle size={16} />
              <span>{step1Error}</span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontWeight: 600 }}>
                Course Title <span className="required" style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Advanced Microservices & Distributed Systems"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (step1Error) setStep1Error(null);
                }}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontWeight: 600 }}>
                Course Code / Identifier <span className="required" style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. CRS-2026-401"
                value={courseCode}
                onChange={(e) => {
                  setCourseCode(e.target.value);
                  if (step1Error) setStep1Error(null);
                }}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label" style={{ fontWeight: 600 }}>
              Course Description & Summary <span className="required" style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <textarea
              className="form-textarea"
              rows={3}
              placeholder="Provide a clear description of the course content, expected learning outcomes, and technical prerequisites..."
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (step1Error) setStep1Error(null);
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '16px' }}>
            {/* Department Selection - Critical for Step 3 filtering */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontWeight: 600 }}>
                Department <span className="required" style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <select
                className="form-select"
                value={departmentId}
                onChange={(e) => {
                  handleDepartmentChange(e.target.value);
                  if (step1Error) setStep1Error(null);
                }}
                style={{ fontWeight: 600 }}
              >
                <option value="">Select Department...</option>
                {trainerAuthorizedDepartments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name} ({dept.id})
                  </option>
                ))}
              </select>
              <span className="text-muted text-xs" style={{ display: 'block', marginTop: '4px' }}>
                Used to filter and prioritize faculty & students in Step 3
              </span>
            </div>

            {/* Course Category */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontWeight: 600 }}>
                Course Category / Domain
              </label>
              <select
                className="form-select"
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  if (step1Error) setStep1Error(null);
                }}
              >
                <option value="">Select Course Category / Domain...</option>
                <option value="Frontend Development">Frontend Development</option>
                <option value="Backend Development">Backend Development</option>
                <option value="Data Science & ML">Data Science & ML</option>
                <option value="DevOps & Cloud">DevOps & Cloud</option>
                <option value="AI & Deep Learning">AI & Deep Learning</option>
                <option value="Cybersecurity">Cybersecurity</option>
                <option value="System Architecture">System Architecture</option>
              </select>
            </div>

            {/* Difficulty Level */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontWeight: 600 }}>
                Difficulty Level
              </label>
              <select
                className="form-select"
                value={difficultyLevel}
                onChange={(e) => {
                  setDifficultyLevel(e.target.value as any);
                  if (step1Error) setStep1Error(null);
                }}
              >
                <option value="">Select Difficulty Level...</option>
                <option value="beginner">Beginner (Foundational)</option>
                <option value="intermediate">Intermediate (Core Skills)</option>
                <option value="advanced">Advanced (Mastery)</option>
              </select>
            </div>

            {/* Estimated Duration */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontWeight: 600 }}>
                Estimated Duration (Hours)
              </label>
              <input
                type="number"
                min="1"
                max="300"
                className="form-input"
                placeholder="e.g. 24"
                value={durationHours}
                onChange={(e) => {
                  const val = e.target.value;
                  setDurationHours(val === '' ? '' : parseInt(val) || 1);
                  if (step1Error) setStep1Error(null);
                }}
              />
            </div>
          </div>

          {/* Course Cover / Thumbnail Image Upload (Replaces manual URL & Completion Policy) */}
          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label className="form-label" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Course Cover & Thumbnail Image</span>
              <span className="text-muted text-xs" style={{ fontWeight: 400 }}>
                PNG, JPG, JPEG, WebP &bull; Max 5 MB &bull; 16:9 Aspect Ratio
              </span>
            </label>

            <input
              type="file"
              ref={thumbnailFileInputRef}
              accept="image/png,image/jpeg,image/jpg,image/webp"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleThumbnailFileSelect(file);
              }}
            />

            {thumbnailError && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: 'var(--danger)',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.825rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '12px',
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{thumbnailError}</span>
              </div>
            )}

            {thumbnailUrl ? (
              /* Image Preview Box with Replace & Remove actions */
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '20px',
                  alignItems: 'center',
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div
                  style={{
                    width: '240px',
                    height: '135px',
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                    background: '#0f172a',
                    border: '1px solid var(--border-subtle)',
                    boxShadow: 'var(--shadow-sm)',
                    position: 'relative',
                    flexShrink: 0,
                  }}
                >
                  <img
                    src={thumbnailUrl}
                    alt="Course Thumbnail Preview"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={() => setThumbnailError('Failed to display thumbnail image. Please replace with a valid image.')}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: '6px',
                      left: '6px',
                      background: 'rgba(0,0,0,0.65)',
                      color: '#fff',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      backdropFilter: 'blur(2px)',
                    }}
                  >
                    Preview
                  </div>
                </div>

                <div style={{ flex: 1, minWidth: '240px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    Cover Image Selected
                  </div>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    This image will appear on course catalogue cards, student learning dashboards, search results, and course overview pages.
                  </p>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '6px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => thumbnailFileInputRef.current?.click()}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}
                    >
                      <RefreshCw size={14} /> Replace Image
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger-outline btn-sm"
                      onClick={handleRemoveThumbnail}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.8rem',
                        color: 'var(--danger)',
                        border: '1px solid var(--danger)',
                        background: 'transparent',
                        borderRadius: 'var(--radius-sm)',
                        padding: '6px 12px',
                        cursor: 'pointer',
                      }}
                    >
                      <Trash2 size={14} /> Remove Image
                    </button>
                    {thumbnailUrl !== DEFAULT_COURSE_THUMBNAIL && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={handleResetDefaultThumbnail}
                        style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}
                      >
                        Reset to Default Cover
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* Drag and Drop Upload Area */
              <div
                onDragOver={handleThumbnailDragOver}
                onDragLeave={handleThumbnailDragLeave}
                onDrop={handleThumbnailDrop}
                onClick={() => thumbnailFileInputRef.current?.click()}
                style={{
                  border: isDraggingThumbnail ? '2px dashed var(--primary)' : '2px dashed var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '32px 20px',
                  textAlign: 'center',
                  background: isDraggingThumbnail ? 'rgba(37, 99, 235, 0.06)' : 'var(--bg-input)',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: 'rgba(37, 99, 235, 0.12)',
                    color: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Upload size={22} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--text-main)', marginBottom: '3px' }}>
                    Drag & Drop your course cover image here, or <span style={{ color: 'var(--primary)', textDecoration: 'underline' }}>Browse Files</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    Supports PNG, JPG, JPEG, and WebP (Max 5 MB)
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }} onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => thumbnailFileInputRef.current?.click()}
                    style={{ fontSize: '0.8rem' }}
                  >
                    Upload Image
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={handleResetDefaultThumbnail}
                    style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}
                  >
                    Use Default Cover
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ------------------------------------------------------------- */}
          {/* COURSE AVAILABILITY WINDOW                                     */}
          {/* ------------------------------------------------------------- */}
          <div
            style={{
              marginBottom: '24px',
              padding: '22px',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: 'rgba(99, 102, 241, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--primary)'
                }}>
                  <Clock size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', margin: 0, fontWeight: 700 }}>Course Availability — Start & End Dates</h3>
                  <p className="text-secondary text-xs" style={{ margin: 0 }}>
                    Configure the access schedule. Standard timezone: <strong>{user?.timezone || 'America/New_York'}</strong>
                  </p>
                </div>
              </div>

              {(startDate || endDate) && (
                <span className="badge badge-primary" style={{ fontSize: '0.75rem' }}>
                  Scheduled Window Configured
                </span>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '14px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                  Start Date & Time (Optional)
                </label>
                <input
                  type="datetime-local"
                  className="form-input"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (step1Error) setStep1Error(null);
                  }}
                  style={{ width: '100%' }}
                />
                <span className="text-muted text-xs" style={{ display: 'block', marginTop: '4px' }}>
                  Before start date, students cannot open or start the course.
                </span>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                  End Date & Time (Optional)
                </label>
                <input
                  type="datetime-local"
                  className="form-input"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    if (step1Error) setStep1Error(null);
                  }}
                  style={{ width: '100%' }}
                />
                <span className="text-muted text-xs" style={{ display: 'block', marginTop: '4px' }}>
                  After end date, course enters read-only mode for enrolled learners.
                </span>
              </div>
            </div>

            <div style={{
              background: 'var(--bg-input)',
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.8rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.5
            }}>
              <strong>Access Lifecycle Rules:</strong>
              <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                <li><strong>Before Start Date:</strong> Students see an informative opening notice. Instructors/Admins may preview or edit.</li>
                <li><strong>Between Dates:</strong> Enrolled students access lessons, submit assignments, and take proctored quizzes.</li>
                <li><strong>After End Date:</strong> Content remains available in read-only mode. Further lesson completions, submissions, and progress changes are disabled. Previously earned certificates remain downloadable.</li>
              </ul>
            </div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* COMPLETION, CERTIFICATE & REWARDS SECTION                     */}
          {/* ------------------------------------------------------------- */}
          <div
            style={{
              marginBottom: '24px',
              padding: '22px',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: certificateEnabled ? 'rgba(37, 99, 235, 0.15)' : 'var(--bg-input)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: certificateEnabled ? 'var(--primary)' : 'var(--text-muted)'
                }}>
                  <Award size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', margin: 0, fontWeight: 700 }}>Completion, Certificate & Rewards</h3>
                  <p className="text-secondary text-xs" style={{ margin: 0 }}>
                    Configure certificate eligibility rules, completion percentage threshold, reward points, and authorized digital signature.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={certificateEnabled}
                    onChange={(e) => setCertificateEnabled(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
                  />
                  Issue Certificate: {certificateEnabled ? 'Yes' : 'No'}
                </label>
                {certificateEnabled && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setShowCertPreviewModal(true)}
                    style={{ gap: '6px', fontSize: '0.78rem' }}
                  >
                    <Eye size={14} /> Preview Certificate
                  </button>
                )}
              </div>
            </div>

            {certificateEnabled && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
                {/* Basic Certificate Attributes */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 600 }}>
                      Certificate Title
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={certTitle}
                      onChange={(e) => setCertTitle(e.target.value)}
                      placeholder="Certificate of Course Completion"
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 600 }}>
                      Issuing Organization
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={certIssuingOrg}
                      onChange={(e) => setCertIssuingOrg(e.target.value)}
                      placeholder="Acme Learning Corp"
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 600 }}>
                      Certificate Template
                    </label>
                    <select
                      className="form-select"
                      value={certTemplateId}
                      onChange={(e) => setCertTemplateId(e.target.value as any)}
                    >
                      <option value="standard">Standard Executive Gold (Official Seal)</option>
                      <option value="distinction">Academic Distinction (Crimson Ribbon)</option>
                      <option value="technical">Technical Mastery (Cyber Navy & Cyan)</option>
                      <option value="executive">Corporate Executive (Silver & Navy)</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 600 }}>
                      Validity Period
                    </label>
                    <select
                      className="form-select"
                      value={certValidityMonths}
                      onChange={(e) => setCertValidityMonths(parseInt(e.target.value) || 0)}
                    >
                      <option value={0}>Lifetime Credential (No Expiry)</option>
                      <option value={12}>1 Year (12 Months)</option>
                      <option value={24}>2 Years (24 Months)</option>
                      <option value={36}>3 Years (36 Months)</option>
                    </select>
                  </div>
                </div>

                {/* Completion Percentage & Reward Points Panel */}
                <div style={{
                  background: 'var(--bg-input)',
                  padding: '16px 20px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px'
                }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    Completion Percentage & Reward Points Rules
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                    {/* Completion Percentage */}
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                        Required Course Completion:
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={certMinPercentage}
                          onChange={(e) => setCertMinPercentage(Math.max(1, Math.min(100, parseInt(e.target.value) || 100)))}
                          style={{
                            width: '100px',
                            padding: '6px 12px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-subtle)',
                            background: 'var(--bg-card)',
                            color: 'var(--text-main)',
                            fontSize: '0.9rem',
                            fontWeight: 700
                          }}
                        />
                        <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>%</span>
                        <span className="badge badge-secondary" style={{ fontSize: '0.75rem' }}>Default: 100%</span>
                      </div>
                      <p className="text-muted text-xs" style={{ margin: '4px 0 0', lineHeight: 1.35 }}>
                        Learner must achieve this percentage of curriculum progress to earn completion and the certificate. (Clearly distinguished from assessment passing scores).
                      </p>
                    </div>

                    {/* Reward Points */}
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                        Points on Successful Completion:
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="number"
                          min="0"
                          step="10"
                          value={certPoints}
                          onChange={(e) => setCertPoints(Math.max(0, parseInt(e.target.value) || 0))}
                          style={{
                            width: '120px',
                            padding: '6px 12px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-subtle)',
                            background: 'var(--bg-card)',
                            color: 'var(--primary)',
                            fontSize: '0.9rem',
                            fontWeight: 700
                          }}
                        />
                        <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Points</span>
                        <span className="badge badge-primary" style={{ fontSize: '0.75rem' }}>Gamification</span>
                      </div>
                      <p className="text-muted text-xs" style={{ margin: '4px 0 0', lineHeight: 1.35 }}>
                        These points are awarded once when the learner meets the course completion requirements. Deduplicated to prevent multiple rewards.
                      </p>
                    </div>
                  </div>

                  {/* Assessment Pass Requirement Toggle */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '10px', borderTop: '1px dashed var(--border-subtle)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}>
                        <input
                          type="checkbox"
                          checked={certRequireAssessment}
                          onChange={(e) => setCertRequireAssessment(e.target.checked)}
                          style={{ accentColor: 'var(--primary)', width: '16px', height: '16px' }}
                        />
                        <span>Require passing course assessment / capstone examination</span>
                      </label>

                      {certRequireAssessment && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Minimum Assessment Pass Mark:</span>
                          <input
                            type="number"
                            min="50"
                            max="100"
                            value={certMinScore}
                            onChange={(e) => setCertMinScore(parseInt(e.target.value) || 70)}
                            style={{
                              width: '70px',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              border: '1px solid var(--border-subtle)',
                              background: 'var(--bg-card)',
                              color: 'var(--text-main)',
                              fontSize: '0.85rem',
                              fontWeight: 700
                            }}
                          />
                          <span style={{ fontSize: '0.8rem' }}>%</span>
                        </div>
                      )}
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.825rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={certRequireAllLessons}
                        onChange={(e) => setCertRequireAllLessons(e.target.checked)}
                        style={{ accentColor: 'var(--primary)' }}
                      />
                      <span>Enforce completion of all mandatory curriculum lesson units</span>
                    </label>
                  </div>
                </div>

                {/* Authorized Signatory Section */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.9rem', margin: 0 }}>
                      Certificate Signatory & Digital Signature
                    </label>
                    <Link to="/profile" style={{ fontSize: '0.75rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>
                      Manage Profile Signature &rarr;
                    </Link>
                  </div>

                  {!isCreatorSigConfigured && selectedSignatoryOption === 'creator_default' && (
                    <div style={{
                      background: '#fffbeb',
                      border: '1px solid #fde68a',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      color: '#92400e',
                      fontSize: '0.825rem'
                    }}>
                      <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                      <div>
                        <strong>Signature Notice:</strong> You have not configured an authorized signature in your profile.
                        Certificates published with your account will show your title and name with an unconfigured signature mark.
                        {' '}<Link to="/profile" style={{ color: 'var(--primary)', fontWeight: 700 }}>Click here to configure your digital signature in Profile Settings</Link>.
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                        Select Signatory Authority
                      </label>
                      <select
                        className="form-select"
                        value={selectedSignatoryOption}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSelectedSignatoryOption(val);
                          if (val === 'creator_default') {
                            setCertSignerName(creatorDefaultSig.name);
                            setCertSignerTitle(creatorDefaultSig.designation);
                            setCertSignerSignatureImage(creatorDefaultSig.signatureImage);
                          } else if (val === 'custom') {
                            // keep custom
                          } else {
                            const found = approvedSignatories.find((s) => s.id === val);
                            if (found) {
                              setCertSignerName(found.name);
                              setCertSignerTitle(found.designation);
                              setCertSignerSignatureImage(found.signatureImage);
                            }
                          }
                        }}
                      >
                        <option value="creator_default">
                          My Profile Signature ({creatorDefaultSig.name || 'Current Creator'}) [Default]
                        </option>
                        {approvedSignatories.map((sig) => (
                          <option key={sig.id} value={sig.id}>
                            {sig.name} &bull; {sig.designation} ({sig.department || 'Authority'})
                          </option>
                        ))}
                        <option value="custom">Custom Signatory (Manual Entry)</option>
                      </select>
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                        Authorized Signer Name
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        value={certSignerName}
                        onChange={(e) => {
                          setCertSignerName(e.target.value);
                          if (selectedSignatoryOption !== 'custom') setSelectedSignatoryOption('custom');
                        }}
                        placeholder="e.g. Dr. James Wilson"
                      />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                        Signer Designation / Title
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        value={certSignerTitle}
                        onChange={(e) => {
                          setCertSignerTitle(e.target.value);
                          if (selectedSignatoryOption !== 'custom') setSelectedSignatoryOption('custom');
                        }}
                        placeholder="e.g. Principal Faculty & Curriculum Director"
                      />
                    </div>
                  </div>

                  {/* Signatory Snapshot Preview Box */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 18px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{
                        width: '120px',
                        height: '48px',
                        background: '#ffffff',
                        border: '1px dashed var(--border-subtle)',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        padding: '2px 6px'
                      }}>
                        {certSignerSignatureImage ? (
                          <img
                            src={certSignerSignatureImage}
                            alt="Signature Preview"
                            style={{ maxHeight: '42px', maxWidth: '110px', objectFit: 'contain' }}
                          />
                        ) : (
                          <span style={{ fontFamily: 'Georgia, cursive', fontStyle: 'italic', fontSize: '0.9rem', color: '#1e293b' }}>
                            {certSignerName || 'Signatory'}
                          </span>
                        )}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{certSignerName || 'Unassigned Signatory'}</div>
                        <div className="text-muted text-xs">{certSignerTitle || 'Official Title'}</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className={`badge ${certSignerSignatureImage ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.72rem' }}>
                        {certSignerSignatureImage ? 'Digital Signature Affixed' : 'Signature Image Pending'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Step 1 Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleNextFromStep1}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 22px' }}
            >
              Continue to Curriculum Builder <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* STEP 2: CURRICULUM & LESSONS                              */}
      {/* ========================================================= */}
      {step === 2 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 700 }}>Step 2: Curriculum & Lessons Builder</h2>
              <p className="text-secondary text-sm" style={{ margin: 0 }}>
                Build structured modules, lessons, video content, and interactive assessments.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span className="badge badge-secondary">
                {modules.length} Modules &bull; {totalLessonsCount} Lessons ({totalCurriculumMinutes} Mins)
              </span>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleAddModule}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Plus size={14} /> Add New Module
              </button>
            </div>
          </div>

          {step2Error && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--danger-bg, rgba(239, 68, 68, 0.1))',
                border: '1px solid var(--danger, #ef4444)',
                color: 'var(--danger, #ef4444)',
                fontSize: '0.85rem',
                marginBottom: '16px'
              }}
            >
              <AlertCircle size={16} />
              <span>{step2Error}</span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 320px) 1fr', gap: '20px', marginBottom: '24px' }}>
            {/* Left Column: Modules Navigation */}
            <div className="card" style={{ padding: '16px', height: 'fit-content' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>Syllabus Modules</h3>
                <span className="text-muted text-xs">{modules.length} total</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {modules.map((m, idx) => (
                  <div
                    key={m.id}
                    onClick={() => setActiveModuleIndex(idx)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-md)',
                      background: activeModuleIndex === idx ? 'var(--primary-light, rgba(99, 102, 241, 0.12))' : 'var(--bg-input)',
                      border: activeModuleIndex === idx ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ overflow: 'hidden', flex: 1, marginRight: '8px' }}>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: '0.85rem',
                          color: activeModuleIndex === idx ? 'var(--primary)' : 'inherit',
                          whiteSpace: 'nowrap',
                          textOverflow: 'ellipsis',
                          overflow: 'hidden'
                        }}
                      >
                        {m.title}
                      </div>
                      <div className="text-muted text-xs" style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '2px', flexWrap: 'wrap' }}>
                        <span>
                          {m.lessons.length} {m.lessons.length === 1 ? 'lesson' : 'lessons'} &bull;{' '}
                          {m.lessons.reduce((a, l) => a + (l.durationMinutes || 0), 0)}m
                        </span>
                        {m.assessment && (
                          <span
                            className="badge badge-warning"
                            style={{ fontSize: '0.65rem', padding: '1px 5px' }}
                            title="Module Assessment Attached"
                          >
                            Assessment ({m.assessment.questions?.length || 0} Qs)
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }} onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleMoveModule(idx, 'up')}
                        disabled={idx === 0}
                        className="btn-icon"
                        title="Move Module Up"
                        style={{ padding: '3px', opacity: idx === 0 ? 0.3 : 1 }}
                      >
                        <MoveUp size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveModule(idx, 'down')}
                        disabled={idx === modules.length - 1}
                        className="btn-icon"
                        title="Move Module Down"
                        style={{ padding: '3px', opacity: idx === modules.length - 1 ? 0.3 : 1 }}
                      >
                        <MoveDown size={13} />
                      </button>
                      {modules.length > 1 && (
                        <button
                          type="button"
                          onClick={() => requestDeleteModule(idx)}
                          className="btn-icon"
                          title="Delete Module"
                          style={{ color: 'var(--danger, #ef4444)', padding: '3px' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleAddModule}
                style={{ width: '100%', marginTop: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <Plus size={14} /> Add Another Module
              </button>
            </div>

            {/* Right Column: Active Module Lessons Editor */}
            <div className="card">
              {modules.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                  <Layers size={44} style={{ color: 'var(--text-muted)', margin: '0 auto 12px', opacity: 0.6 }} />
                  <h3 style={{ fontSize: '1.1rem', margin: '0 0 8px' }}>Your Curriculum is Empty</h3>
                  <p className="text-secondary text-sm" style={{ maxWidth: '420px', margin: '0 auto 20px', lineHeight: 1.5 }}>
                    Start structuring your course syllabus by adding your first learning module. Each module can hold video lessons, documents, and interactive quizzes.
                  </p>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleAddModule}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                  >
                    <Plus size={16} /> Add First Module
                  </button>
                </div>
              ) : modules[activeModuleIndex] ? (
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '16px',
                      flexWrap: 'wrap',
                      gap: '12px'
                    }}
                  >
                    <div style={{ flex: 1, minWidth: '240px' }}>
                      <input
                        type="text"
                        className="form-input"
                        value={modules[activeModuleIndex].title}
                        onChange={(e) => {
                          const updated = [...modules];
                          updated[activeModuleIndex].title = e.target.value;
                          setModules(updated);
                        }}
                        style={{ fontWeight: 700, fontSize: '1.1rem', padding: '6px 10px' }}
                      />
                      <p className="text-muted text-xs" style={{ margin: '4px 0 0 2px' }}>
                        Manage lessons, attach learning material, and configure module-level assessments
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleAddLesson(activeModuleIndex, 'video')}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Video size={13} color="var(--primary)" /> + Video
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleAddLesson(activeModuleIndex, 'document')}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <FileText size={13} color="var(--accent-cyan, #06b6d4)" /> + Document
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleAddLesson(activeModuleIndex, 'quiz')}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <HelpCircle size={13} color="var(--warning, #f59e0b)" /> + Quiz
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleOpenModuleAssessmentModal(activeModuleIndex)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          borderColor: 'var(--accent-purple, #a855f7)',
                          color: 'var(--accent-purple, #a855f7)'
                        }}
                      >
                        <Award size={13} /> {modules[activeModuleIndex].assessment ? 'Edit Assessment' : '+ Module Assessment'}
                      </button>
                    </div>
                  </div>

                  {/* Lessons List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {modules[activeModuleIndex].lessons.map((lesson, lIdx) => (
                      <div
                        key={lesson.id}
                        style={{
                          padding: '14px 16px',
                          borderRadius: 'var(--radius-md)',
                          background: 'var(--bg-input)',
                          border: '1px solid var(--border-subtle)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px'
                        }}
                      >
                        {/* Top row: Lesson info, reordering, delete */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                            {/* Reordering Controls */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <button
                                type="button"
                                onClick={() => handleMoveLesson(activeModuleIndex, lIdx, 'up')}
                                disabled={lIdx === 0}
                                className="btn-icon"
                                title="Move Lesson Up"
                                style={{ padding: '2px', opacity: lIdx === 0 ? 0.3 : 1 }}
                              >
                                <MoveUp size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMoveLesson(activeModuleIndex, lIdx, 'down')}
                                disabled={lIdx === modules[activeModuleIndex].lessons.length - 1}
                                className="btn-icon"
                                title="Move Lesson Down"
                                style={{ padding: '2px', opacity: lIdx === modules[activeModuleIndex].lessons.length - 1 ? 0.3 : 1 }}
                              >
                                <MoveDown size={12} />
                              </button>
                            </div>

                            <span
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '6px',
                                background:
                                  lesson.type === 'video'
                                    ? 'rgba(99, 102, 241, 0.12)'
                                    : lesson.type === 'document'
                                      ? 'rgba(6, 182, 212, 0.12)'
                                      : 'rgba(245, 158, 11, 0.12)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                              }}
                            >
                              {lesson.type === 'video' && <Video size={16} color="var(--primary)" />}
                              {lesson.type === 'document' && <FileText size={16} color="var(--accent-cyan, #06b6d4)" />}
                              {lesson.type === 'quiz' && <HelpCircle size={16} color="var(--warning, #f59e0b)" />}
                            </span>

                            <div style={{ flex: 1 }}>
                              <input
                                type="text"
                                className="form-input"
                                value={lesson.title}
                                onChange={(e) => {
                                  const updated = [...modules];
                                  updated[activeModuleIndex].lessons[lIdx].title = e.target.value;
                                  setModules(updated);
                                }}
                                style={{ fontWeight: 600, fontSize: '0.88rem', padding: '4px 8px' }}
                              />
                              <div className="text-muted text-xs" style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>
                                  Type: <strong style={{ textTransform: 'capitalize' }}>{lesson.type}</strong>
                                </span>
                                &bull;
                                <span>
                                  Duration:{' '}
                                  <input
                                    type="number"
                                    min="1"
                                    max="180"
                                    value={lesson.durationMinutes}
                                    onChange={(e) => {
                                      const updated = [...modules];
                                      updated[activeModuleIndex].lessons[lIdx].durationMinutes =
                                        parseInt(e.target.value) || 5;
                                      setModules(updated);
                                    }}
                                    style={{
                                      width: '45px',
                                      padding: '1px 4px',
                                      fontSize: '0.75rem',
                                      borderRadius: '4px',
                                      border: '1px solid var(--border-subtle)',
                                      background: 'var(--bg-surface)'
                                    }}
                                  />{' '}
                                  mins
                                </span>
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                              type="button"
                              onClick={() => requestDeleteLesson(activeModuleIndex, lIdx)}
                              className="btn-icon"
                              title="Delete Lesson"
                              style={{ color: 'var(--danger, #ef4444)' }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Document Upload Area when type === 'document' */}
                        {lesson.type === 'document' && (
                          <div style={{ paddingLeft: '44px' }}>
                            <DocumentUploadCard
                              document={lesson.uploadedDocument}
                              onUpload={(doc) => handleLessonDocumentUpload(activeModuleIndex, lIdx, doc)}
                              onRemove={() => handleLessonDocumentRemove(activeModuleIndex, lIdx)}
                            />
                          </div>
                        )}

                        {/* Quiz Configuration Panel when type === 'quiz' */}
                        {lesson.type === 'quiz' && (
                          <div style={{ paddingLeft: '44px' }}>
                            {lesson.quizConfig && lesson.quizConfig.questions && lesson.quizConfig.questions.length > 0 ? (
                              <div
                                style={{
                                  padding: '12px 14px',
                                  background: 'var(--bg-surface)',
                                  borderRadius: 'var(--radius-md)',
                                  border: '1px solid var(--border-subtle)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  flexWrap: 'wrap',
                                  gap: '10px'
                                }}
                              >
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                    <span className="badge badge-success" style={{ fontSize: '0.72rem' }}>
                                      <CheckCircle2 size={11} style={{ marginRight: '3px' }} /> Quiz Configured
                                    </span>
                                    <span className="badge badge-secondary" style={{ fontSize: '0.7rem', textTransform: 'capitalize' }}>
                                      {lesson.quizConfig.difficulty}
                                    </span>
                                  </div>
                                  <div style={{ fontWeight: 600, fontSize: '0.84rem' }}>{lesson.quizConfig.title}</div>
                                  <div className="text-muted text-xs" style={{ marginTop: '2px' }}>
                                    <strong>{lesson.quizConfig.questions.length} Questions</strong> &bull; Total Marks: {lesson.quizConfig.totalMarks} &bull; Pass: {lesson.quizConfig.passingPercentage}% &bull; Time: {lesson.quizConfig.timeLimitMinutes}m &bull; Attempts: {lesson.quizConfig.allowedAttempts}
                                  </div>
                                </div>

                                <div style={{ display: 'flex', gap: '6px' }}>
                                  <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => handleOpenLessonQuizModal(activeModuleIndex, lIdx)}
                                    style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem' }}
                                  >
                                    <Edit2 size={13} /> Edit Quiz
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => requestRemoveLessonQuiz(activeModuleIndex, lIdx)}
                                    style={{ color: 'var(--danger, #ef4444)', fontSize: '0.78rem' }}
                                    title="Reset Quiz"
                                  >
                                    Reset
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div
                                style={{
                                  padding: '12px 14px',
                                  background: 'rgba(245, 158, 11, 0.08)',
                                  borderRadius: 'var(--radius-md)',
                                  border: '1px dashed var(--warning, #f59e0b)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  flexWrap: 'wrap',
                                  gap: '10px'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <AlertCircle size={16} color="var(--warning, #f59e0b)" />
                                  <div>
                                    <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                      Quiz not yet configured
                                    </div>
                                    <div className="text-muted text-xs">
                                      Generate questions with AI assistance from lesson documents or compose questions manually.
                                    </div>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  className="btn btn-primary btn-sm"
                                  onClick={() => handleOpenLessonQuizModal(activeModuleIndex, lIdx)}
                                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem' }}
                                >
                                  <Sparkles size={13} /> Configure Quiz (AI / Manual)
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}

                    {modules[activeModuleIndex].lessons.length === 0 && (
                      <div
                        style={{
                          textAlign: 'center',
                          padding: '32px 16px',
                          border: '2px dashed var(--border-subtle)',
                          borderRadius: 'var(--radius-md)',
                          color: 'var(--text-muted)'
                        }}
                      >
                        <Layers size={24} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>No lessons in this module yet</div>
                        <p className="text-xs" style={{ marginTop: '4px' }}>
                          Click the + Video, + Document, or + Quiz buttons above to add content.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Section B: Module Assessment Card within Active Module */}
                  <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Award size={16} color="var(--accent-purple, #a855f7)" />
                        <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>
                          Module Assessment Checkpoint
                        </span>
                      </div>
                      <span className="text-muted text-xs">Evaluates all lessons in {modules[activeModuleIndex].title}</span>
                    </div>

                    {modules[activeModuleIndex].assessment ? (
                      <div
                        style={{
                          padding: '14px 18px',
                          background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.08), rgba(99, 102, 241, 0.05))',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid rgba(168, 85, 247, 0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '12px'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                            <span className="badge badge-primary" style={{ fontSize: '0.72rem', background: 'var(--accent-purple, #a855f7)' }}>
                              Module Assessment Active
                            </span>
                            <span className="badge badge-secondary" style={{ fontSize: '0.7rem', textTransform: 'capitalize' }}>
                              Difficulty: {modules[activeModuleIndex].assessment?.difficulty}
                            </span>
                          </div>
                          <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>
                            {modules[activeModuleIndex].assessment?.title}
                          </div>
                          <p className="text-secondary text-xs" style={{ margin: '3px 0 6px', maxWidth: '520px' }}>
                            {modules[activeModuleIndex].assessment?.description}
                          </p>
                          <div className="text-muted text-xs">
                            <strong>{modules[activeModuleIndex].assessment?.questions?.length || 0} Questions</strong> &bull; Total Marks: {modules[activeModuleIndex].assessment?.totalMarks} &bull; Pass: {modules[activeModuleIndex].assessment?.passingPercentage}% &bull; Time: {modules[activeModuleIndex].assessment?.timeLimitMinutes}m &bull; Max Attempts: {modules[activeModuleIndex].assessment?.allowedAttempts}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleOpenModuleAssessmentModal(activeModuleIndex)}
                            style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}
                          >
                            <Edit2 size={13} /> Edit Assessment
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => requestRemoveModuleAssessment(activeModuleIndex)}
                            style={{ color: 'var(--danger, #ef4444)', fontSize: '0.8rem' }}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        style={{
                          padding: '14px 16px',
                          borderRadius: 'var(--radius-md)',
                          border: '1px dashed var(--border-subtle)',
                          background: 'var(--bg-input)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '12px'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>No module assessment configured</div>
                          <div className="text-muted text-xs">
                            Attach a comprehensive test evaluating all lessons & documents in this module.
                          </div>
                        </div>

                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleOpenModuleAssessmentModal(activeModuleIndex)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            borderColor: 'var(--accent-purple, #a855f7)',
                            color: 'var(--accent-purple, #a855f7)',
                            fontSize: '0.8rem'
                          }}
                        >
                          <Plus size={13} /> Add Module Assessment (AI / Manual)
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              {/* Navigation buttons */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: '24px',
                  borderTop: '1px solid var(--border-subtle)',
                  paddingTop: '16px'
                }}
              >
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setStep(1)}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <ArrowLeft size={16} /> Back to Basic Information
                </button>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleNextFromStep2}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 22px' }}
                >
                  Continue to Assign Faculty & Students <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* SECTION C: DEDICATED FINAL COURSE ASSESSMENT SECTION */}
          <FinalAssessmentCard
            assessment={finalAssessment}
            courseTitle={title}
            onConfigure={handleOpenFinalAssessmentModal}
            onRemove={requestRemoveFinalAssessment}
          />
        </div>
      )}

      {/* ========================================================= */}
      {/* STEP 3: ASSIGN FACULTY & STUDENTS                         */}
      {/* ========================================================= */}
      {step === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Header Banner */}
          <div
            className="card"
            style={{
              padding: '18px 24px',
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(59, 130, 246, 0.04))',
              border: '1px solid var(--border-subtle)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <span className="badge badge-primary" style={{ marginBottom: '6px' }}>
                  Target Department: {getDepartmentName(departmentId)}
                </span>
                <h2 style={{ fontSize: '1.3rem', margin: '4px 0', fontWeight: 800 }}>
                  Step 3: Assign Faculty & Students
                </h2>
                <p className="text-secondary text-sm" style={{ margin: 0 }}>
                  Assign the Lead Faculty member and pre-enroll eligible students from the department.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ textAlign: 'right' }}>
                  <div className="text-muted text-xs">Course Reference</div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{courseCode}</div>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION A: LEAD FACULTY */}
          {!isFaculty ? (
            /* Admin Lead Faculty Selector */
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: 'var(--primary-light, rgba(99, 102, 241, 0.15))',
                      color: 'var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Award size={18} />
                  </span>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', margin: 0, fontWeight: 700 }}>A. Select Lead Faculty</h3>
                    <p className="text-secondary text-xs" style={{ margin: 0 }}>
                      Select one certified lead faculty member to oversee curriculum and grading.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label className="text-xs text-muted" style={{ fontWeight: 600 }}>
                    Faculty Department:
                  </label>
                  <select
                    className="form-select"
                    value={facultyDeptFilter}
                    onChange={(e) => setFacultyDeptFilter(e.target.value)}
                    style={{ fontSize: '0.82rem', padding: '5px 10px', minWidth: '180px' }}
                  >
                    {!isFaculty && <option value="all">All Departments ({mockDepartments.length})</option>}
                    {trainerAuthorizedDepartments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} {d.id === departmentId ? '(Course Dept)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ position: 'relative', marginBottom: '16px' }}>
                <Search
                  size={16}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)'
                  }}
                />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search faculty by name, employee/faculty ID (e.g. FAC-2026-004), or email..."
                  value={facultySearchQuery}
                  onChange={(e) => setFacultySearchQuery(e.target.value)}
                  style={{ paddingLeft: '36px' }}
                />
                {facultySearchQuery && (
                  <button
                    type="button"
                    onClick={() => setFacultySearchQuery('')}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)'
                    }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: '12px',
                  maxHeight: '280px',
                  overflowY: 'auto',
                  padding: '4px'
                }}
              >
                {filteredFaculty.map((fac) => {
                  const isSelected = selectedLeadFacultyId === fac.id;
                  const isInactive = fac.status === 'suspended' || fac.status === 'deactivated';

                  return (
                    <div
                      key={fac.id}
                      onClick={() => {
                        if (!isInactive) {
                          setSelectedLeadFacultyId(fac.id);
                        }
                      }}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 'var(--radius-md)',
                        background: isSelected
                          ? 'var(--primary-light, rgba(99, 102, 241, 0.12))'
                          : isInactive
                            ? 'var(--bg-input)'
                            : 'var(--bg-card)',
                        border: isSelected
                          ? '2px solid var(--primary)'
                          : isInactive
                            ? '1px dashed var(--border-subtle)'
                            : '1px solid var(--border-subtle)',
                        cursor: isInactive ? 'not-allowed' : 'pointer',
                        opacity: isInactive ? 0.6 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: isSelected ? 'var(--primary)' : 'var(--bg-input)',
                            color: isSelected ? '#fff' : 'var(--text-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.85rem'
                          }}
                        >
                          {fac.displayName ? fac.displayName.slice(0, 1) : fac.firstName.slice(0, 1)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>
                            {fac.displayName || `${fac.firstName} ${fac.lastName}`}
                          </div>
                          <div className="text-secondary text-xs">
                            {fac.rollNo || fac.id} &bull; {getDepartmentName(fac.departmentId)}
                          </div>
                          <div className="text-muted text-xs">{fac.email}</div>
                        </div>
                      </div>

                      {isSelected && (
                        <span
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            background: 'var(--primary)',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <Check size={14} />
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Trainer Workflow: Automatic Appointed Lead Faculty Card (Read-Only) */
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: 'var(--primary-light, rgba(99, 102, 241, 0.15))',
                      color: 'var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Award size={18} />
                  </span>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', margin: 0, fontWeight: 700 }}>A. Appointed Lead Faculty</h3>
                    <p className="text-secondary text-xs" style={{ margin: 0 }}>
                      As the course creator, you are automatically designated as Lead Faculty to direct curriculum content and oversee grading.
                    </p>
                  </div>
                </div>
                <span className="badge badge-active" style={{ fontSize: '0.75rem' }}>
                  Automatic Lead Assignment
                </span>
              </div>

              <div
                style={{
                  padding: '16px 20px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--primary-light, rgba(99, 102, 241, 0.08))',
                  border: '2px solid var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '16px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '50%',
                      background: 'var(--primary)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '1rem',
                      boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)'
                    }}
                  >
                    <GraduationCap size={22} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h4 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                        {user?.displayName || `${user?.firstName || 'Dr.'} ${user?.lastName || 'Wilson'}`}
                      </h4>
                      <span className="badge badge-primary" style={{ fontSize: '0.68rem', fontWeight: 700 }}>
                        Lead Faculty
                      </span>
                    </div>
                    <div className="text-secondary text-xs" style={{ marginTop: '2px' }}>
                      <strong>Faculty ID:</strong> {user?.rollNo || 'FAC-2026-004'} &bull; <strong>Department:</strong> {getDepartmentName(departmentId || user?.departmentId)}
                    </div>
                    <div className="text-muted text-xs" style={{ marginTop: '2px' }}>
                      {user?.email} &bull; {user?.specialization || 'Full-Stack Systems & Architecture'}
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div className="badge badge-neutral" style={{ fontSize: '0.72rem', border: '1px solid var(--border-subtle)' }}>
                    Assigned Scope: Authorized Cohorts Only
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION B: SELECT STUDENTS (OPTIONAL) */}
          < div className="card" >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'var(--accent-cyan-light, rgba(6, 182, 212, 0.15))',
                    color: 'var(--accent-cyan, #06b6d4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Users size={18} />
                </span>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ fontSize: '1.05rem', margin: 0, fontWeight: 700 }}>
                      B. Select Students for Initial Pre-Enrollment
                    </h3>
                    <span className="badge badge-secondary" style={{ fontSize: '0.7rem' }}>
                      Optional
                    </span>
                  </div>
                  <p className="text-secondary text-xs" style={{ margin: 0 }}>
                    Select students to enroll immediately upon publishing, or leave empty to invite learners later.
                  </p>
                </div>
              </div>

              {/* Department & Cohort Filters */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <label className="text-xs text-muted" style={{ fontWeight: 600 }}>
                    Dept:
                  </label>
                  <select
                    className="form-select"
                    value={studentDeptFilter}
                    onChange={(e) => setStudentDeptFilter(e.target.value)}
                    style={{ fontSize: '0.82rem', padding: '5px 8px', minWidth: '150px' }}
                  >
                    <option value="all">All Departments ({mockDepartments.length})</option>
                    {mockDepartments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} {d.id === departmentId ? '(Course Dept)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <label className="text-xs text-muted" style={{ fontWeight: 600 }}>
                    Cohort:
                  </label>
                  <select
                    className="form-select"
                    value={selectedCohortId}
                    onChange={(e) => setSelectedCohortId(e.target.value)}
                    style={{ fontSize: '0.82rem', padding: '5px 8px', minWidth: '150px' }}
                  >
                    <option value="all">
                      {isFaculty ? `Authorized Cohorts (${trainerAuthorizedCohorts.length})` : 'All Cohorts / Batches'}
                    </option>
                    {trainerAuthorizedCohorts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Info notice about optionality */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(59, 130, 246, 0.06)',
                border: '1px solid rgba(59, 130, 246, 0.15)',
                fontSize: '0.78rem',
                color: 'var(--text-secondary)',
                marginBottom: '14px'
              }}
            >
              <Info size={15} color="var(--primary)" style={{ flexShrink: 0 }} />
              <span>
                <strong>Note:</strong> Pre-enrollment is optional. If no students are selected, the course publishes with 0 enrollments and learners can join later via <strong>Share Course Link</strong> or the <strong>Assign Students</strong> roster.
              </span>
            </div>

            {/* Selected Students Summary Chips */}
            {selectedStudentIds.size > 0 && (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '6px',
                  marginBottom: '12px',
                  padding: '10px 14px',
                  background: 'var(--bg-input)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  alignItems: 'center'
                }}
              >
                <span className="text-xs text-muted" style={{ fontWeight: 700, marginRight: '4px' }}>
                  Selected Learners ({selectedStudentIds.size}):
                </span>
                {Array.from(selectedStudentIds).map((sId) => {
                  const st = allStudents.find((s) => s.id === sId);
                  if (!st) return null;
                  return (
                    <span
                      key={st.id}
                      className="badge badge-secondary"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.74rem',
                        padding: '3px 8px'
                      }}
                    >
                      <span>{st.displayName || `${st.firstName} ${st.lastName}`}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleStudent(st.id);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          cursor: 'pointer',
                          color: 'var(--text-muted)',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                        title={`Remove ${st.displayName || st.firstName}`}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            {/* Student Search & Bulk Selection Toolbar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                marginBottom: '12px',
                flexWrap: 'wrap'
              }}
            >
              <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
                <Search
                  size={15}
                  style={{
                    position: 'absolute',
                    left: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)'
                  }}
                />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search students by name, roll no / ID, or email..."
                  value={studentSearchQuery}
                  onChange={(e) => setStudentSearchQuery(e.target.value)}
                  style={{ paddingLeft: '32px', fontSize: '0.85rem', padding: '6px 32px' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleSelectAllFilteredStudents}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem' }}
                >
                  <CheckSquare size={13} /> Select All Eligible ({filteredStudents.length})
                </button>

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleDeselectAllFilteredStudents}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem' }}
                >
                  <Square size={13} /> Deselect All
                </button>

                <span
                  className="badge badge-primary"
                  style={{ fontWeight: 700, fontSize: '0.8rem', padding: '4px 10px' }}
                >
                  {selectedStudentIds.size} Selected
                </span>
              </div>
            </div>

            {/* Student Table */}
            <div
              style={{
                maxHeight: '340px',
                overflowY: 'auto',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)'
              }}
            >
              <table className="table" style={{ margin: 0, width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-input)', fontSize: '0.78rem', textTransform: 'uppercase' }}>
                    <th style={{ width: '40px', textAlign: 'center', padding: '8px' }}></th>
                    <th style={{ padding: '8px 12px' }}>Student Name</th>
                    <th style={{ padding: '8px 12px' }}>Student ID</th>
                    <th style={{ padding: '8px 12px' }}>Email</th>
                    <th style={{ padding: '8px 12px' }}>Department</th>
                    <th style={{ padding: '8px 12px' }}>Cohort / Batch</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center' }}>Eligibility</th>
                  </tr>
                </thead>
                <tbody>
                                    {filteredStudents.map((st) => {
                    const isAlreadyEnrolled = alreadyEnrolledStudentIds.has(st.id);
                    const isChecked = selectedStudentIds.has(st.id);
                    const isInactive = st.status === 'suspended' || st.status === 'deactivated';
                    const isDisabled = isInactive || isAlreadyEnrolled;

                    return (
                      <tr
                        key={st.id}
                        onClick={() => {
                          if (!isDisabled) handleToggleStudent(st.id);
                        }}
                        style={{
                          background: isChecked ? 'var(--primary-light, rgba(99, 102, 241, 0.08))' : 'transparent',
                          cursor: isDisabled ? 'not-allowed' : 'pointer',
                          opacity: isInactive ? 0.6 : 1,
                          borderBottom: '1px solid var(--border-subtle)',
                          fontSize: '0.85rem'
                        }}
                      >
                        <td style={{ textAlign: 'center', padding: '8px' }}>
                          <input
                            type="checkbox"
                            checked={isChecked || isAlreadyEnrolled}
                            disabled={isDisabled}
                            onChange={() => !isDisabled && handleToggleStudent(st.id)}
                            style={{ accentColor: 'var(--primary)', cursor: isDisabled ? 'not-allowed' : 'pointer' }}
                          />
                        </td>
                        <td style={{ padding: '8px 12px', fontWeight: 600 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div
                              style={{
                                width: '26px',
                                height: '26px',
                                borderRadius: '50%',
                                background: 'var(--bg-input)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.72rem',
                                fontWeight: 700
                              }}
                            >
                              {st.displayName ? st.displayName.slice(0, 1) : st.firstName.slice(0, 1)}
                            </div>
                            <span>{st.displayName || `${st.firstName} ${st.lastName}`}</span>
                          </div>
                        </td>
                        <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                          {st.rollNo || st.id}
                        </td>
                        <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>{st.email}</td>
                        <td style={{ padding: '8px 12px' }}>
                          <span className="badge badge-secondary" style={{ fontSize: '0.7rem' }}>
                            {getDepartmentName(st.departmentId)}
                          </span>
                        </td>
                        <td style={{ padding: '8px 12px', fontSize: '0.8rem' }}>{getStudentCohort(st.id)}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                          {isAlreadyEnrolled ? (
                            <span className="badge badge-primary" style={{ fontSize: '0.68rem' }}>
                              Already Enrolled
                            </span>
                          ) : isInactive ? (
                            <span className="badge badge-danger" style={{ fontSize: '0.68rem' }}>
                              Suspended
                            </span>
                          ) : (
                            <span className="badge badge-active" style={{ fontSize: '0.68rem' }}>
                              Eligible
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {filteredStudents.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                        No eligible students found for the current department and search criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div >

          {/* SECTION C: ASSIGNMENT SUMMARY CARD */}
          < div
            className="card"
            style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              padding: '16px 20px'
            }}
          >
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 10px' }}>Assignment Configuration Summary</h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '14px',
                fontSize: '0.85rem'
              }}
            >
              <div>
                <span className="text-muted text-xs">Target Course:</span>
                <div style={{ fontWeight: 700 }}>
                  {title} ({courseCode})
                </div>
              </div>
              <div>
                <span className="text-muted text-xs">Department:</span>
                <div style={{ fontWeight: 700 }}>{getDepartmentName(departmentId)}</div>
              </div>
              <div>
                <span className="text-muted text-xs">Lead Faculty:</span>
                <div style={{ fontWeight: 700, color: 'var(--primary)' }}>
                  {selectedFacultyMember ? selectedFacultyMember.displayName || selectedFacultyMember.firstName : 'Unassigned'}
                </div>
              </div>
              <div>
                <span className="text-muted text-xs">Pre-Enrolled Students:</span>
                <div style={{ fontWeight: 700, color: 'var(--success)' }}>
                  {selectedStudentIds.size > 0 ? `${selectedStudentIds.size} Students Selected` : 'None (Optional)'}
                </div>
              </div>
            </div>

            {/* Selected student name preview pills */}
            {
              selectedStudentIds.size > 0 && (
                <div style={{ marginTop: '12px', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
                  <span className="text-muted text-xs" style={{ display: 'block', marginBottom: '6px' }}>
                    Selected Students Preview:
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '70px', overflowY: 'auto' }}>
                    {Array.from(selectedStudentIds).map((sId) => {
                      const st = allStudents.find((s) => s.id === sId);
                      if (!st) return null;
                      return (
                        <span
                          key={st.id}
                          className="badge badge-secondary"
                          style={{
                            fontSize: '0.72rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '2px 8px'
                          }}
                        >
                          {st.displayName || st.firstName} ({st.rollNo || st.id})
                          <button
                            type="button"
                            onClick={() => handleToggleStudent(st.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: 0,
                              color: 'inherit',
                              marginLeft: '2px'
                            }}
                          >
                            &times;
                          </button>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )
            }
          </div >

          {/* Step 3 Action Navigation */}
          < div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '16px'
            }}
          >
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setStep(2)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <ArrowLeft size={16} /> Back to Curriculum
            </button>

            <button
              type="button"
              className="btn btn-primary"
              onClick={handleNextFromStep3}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px' }}
            >
              Continue to Preview & Publish <ArrowRight size={16} />
            </button>
          </div >
        </div >
      )}

      {/* ========================================================= */}
      {/* STEP 4: FINAL PREVIEW & PUBLISH                           */}
      {/* ========================================================= */}
      {
        step === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px'
              }}
            >
              <div>
                <span className="badge badge-primary" style={{ marginBottom: '6px' }}>
                  Step 4 of 4: Final Review
                </span>
                <h2 style={{ fontSize: '1.35rem', margin: '4px 0', fontWeight: 800 }}>Preview & Publish Course</h2>
                <p className="text-secondary text-sm" style={{ margin: 0 }}>
                  Perform the final governance audit. Review curriculum structure, faculty assignment, and enrolled learners.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setStep(1)}
                  style={{ fontSize: '0.78rem' }}
                >
                  Edit Basic Info
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setStep(2)}
                  style={{ fontSize: '0.78rem' }}
                >
                  Edit Curriculum
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setStep(3)}
                  style={{ fontSize: '0.78rem' }}
                >
                  Edit Assignments
                </button>
              </div>
            </div>

            {publishError && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--danger-bg, rgba(239, 68, 68, 0.1))',
                  border: '1px solid var(--danger, #ef4444)',
                  color: 'var(--danger, #ef4444)',
                  fontSize: '0.85rem'
                }}
              >
                <AlertCircle size={16} />
                <span>{publishError}</span>
              </div>
            )}

            {/* Full Course Preview Card */}
            <div
              className="card"
              style={{
                padding: 0,
                overflow: 'hidden',
                border: '1px solid var(--border-light)'
              }}
            >
              {/* Hero Banner with Thumbnail and Metadata */}
              <div
                style={{
                  padding: '28px',
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(59, 130, 246, 0.1))',
                  borderBottom: '1px solid var(--border-subtle)',
                  display: 'grid',
                  gridTemplateColumns: thumbnailUrl ? '180px 1fr' : '1fr',
                  gap: '24px',
                  alignItems: 'center'
                }}
              >
                {thumbnailUrl && (
                  <div
                    style={{
                      width: '100%',
                      height: '120px',
                      borderRadius: 'var(--radius-lg)',
                      overflow: 'hidden',
                      background: 'var(--bg-input)',
                      boxShadow: 'var(--shadow-md)'
                    }}
                  >
                    <img
                      src={thumbnailUrl}
                      alt={title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        (e.target as any).style.display = 'none';
                      }}
                    />
                  </div>
                )}

                <div>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                    <span className="badge badge-primary">{category}</span>
                    <span className="badge badge-secondary" style={{ textTransform: 'capitalize' }}>
                      Level: {difficultyLevel}
                    </span>
                    <span className="badge badge-secondary">Dept: {getDepartmentName(departmentId)}</span>
                  </div>

                  <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0 0 8px' }}>
                    {title} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>({courseCode})</span>
                  </h1>
                  <p className="text-secondary text-sm" style={{ margin: 0, maxWidth: '780px' }}>
                    {description}
                  </p>

                  <div
                    style={{
                      display: 'flex',
                      gap: '16px',
                      marginTop: '14px',
                      fontSize: '0.82rem',
                      color: 'var(--text-muted)',
                      flexWrap: 'wrap'
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={14} /> {durationHours} Hours Duration
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Layers size={14} /> {modules.length} Modules &bull; {totalLessonsCount} Lessons
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Award size={14} /> Certificate Eligible
                    </span>
                  </div>
                </div>
              </div>

              {/* Evaluation Metrics Summary Bar */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                  gap: '12px',
                  padding: '16px 24px',
                  background: 'var(--bg-input)',
                  borderBottom: '1px solid var(--border-subtle)'
                }}
              >
                <div>
                  <span className="text-muted text-xs">Curriculum Units</span>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                    <Layers size={14} color="var(--primary)" />
                    {modules.length} Modules &bull; {totalLessonsCount} Lessons
                  </div>
                </div>

                <div>
                  <span className="text-muted text-xs">Evaluative Assessments</span>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                    <HelpCircle size={14} color="var(--warning, #f59e0b)" />
                    {evaluationStats.totalAssessments} Total ({evaluationStats.lessonQuizzesCount} Quizzes, {evaluationStats.moduleAssessmentsCount} Mod)
                  </div>
                </div>

                <div>
                  <span className="text-muted text-xs">Final Course Capstone</span>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                    <Award size={14} color="var(--accent-purple, #a855f7)" />
                    {evaluationStats.hasFinal ? 'Configured & Active' : 'None Configured'}
                  </div>
                </div>

                <div>
                  <span className="text-muted text-xs">Total Evaluative Marks</span>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                    <Sparkles size={14} />
                    {evaluationStats.totalMarks} Marks ({evaluationStats.totalQuestions} Qs)
                  </div>
                </div>
              </div>

              {/* Split Details: Left Syllabus, Right Governance & Roster */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', padding: '24px' }}>
                {/* Left Column: Syllabus Breakdown with Assessments */}
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <BookOpen size={16} color="var(--primary)" /> Course Syllabus & Evaluation Blueprint
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {modules.map((m) => (
                      <div
                        key={m.id}
                        style={{
                          background: 'var(--bg-input)',
                          borderRadius: 'var(--radius-md)',
                          padding: '14px',
                          border: '1px solid var(--border-subtle)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                            {m.title}
                          </div>
                          <span className="text-muted text-xs">
                            {m.lessons.length} {m.lessons.length === 1 ? 'lesson' : 'lessons'}
                          </span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {m.lessons.map((l) => (
                            <div
                              key={l.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                fontSize: '0.82rem',
                                padding: '5px 8px',
                                background: 'var(--bg-surface)',
                                borderRadius: '4px',
                                border: '1px solid var(--border-subtle)'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                                {l.type === 'video' && <Video size={13} color="var(--primary)" />}
                                {l.type === 'document' && <FileText size={13} color="var(--accent-cyan, #06b6d4)" />}
                                {l.type === 'quiz' && <HelpCircle size={13} color="var(--warning, #f59e0b)" />}
                                <span style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {l.title}
                                </span>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                {l.type === 'quiz' && l.quizConfig && (
                                  <span className="badge badge-warning" style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                                    {l.quizConfig.questions?.length || 0} Qs &bull; {l.quizConfig.totalMarks} Marks
                                  </span>
                                )}
                                {l.type === 'document' && l.uploadedDocument && (
                                  <span className="badge badge-secondary" style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                                    PDF/Doc attached
                                  </span>
                                )}
                                <span className="text-muted text-xs">{l.durationMinutes}m</span>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Attached Module Assessment in preview */}
                        {m.assessment && (
                          <div
                            style={{
                              marginTop: '10px',
                              padding: '10px 12px',
                              borderRadius: 'var(--radius-md)',
                              background: 'rgba(168, 85, 247, 0.08)',
                              border: '1px solid rgba(168, 85, 247, 0.25)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              flexWrap: 'wrap',
                              gap: '8px',
                              fontSize: '0.8rem'
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 700, color: 'var(--accent-purple, #a855f7)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Award size={13} /> Module Assessment: {m.assessment.title}
                              </div>
                              <div className="text-muted text-xs" style={{ marginTop: '2px' }}>
                                <strong>{m.assessment.questions?.length || 0} Questions</strong> &bull; Total Marks: {m.assessment.totalMarks} &bull; Pass: {m.assessment.passingPercentage}% &bull; Time: {m.assessment.timeLimitMinutes}m &bull; Attempts: {m.assessment.allowedAttempts}
                              </div>
                            </div>
                            <span className="badge badge-secondary" style={{ fontSize: '0.68rem', textTransform: 'capitalize' }}>
                              {m.assessment.difficulty}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Final Course Assessment Preview Card in Syllabus */}
                    {finalAssessment ? (
                      <div
                        style={{
                          padding: '14px 16px',
                          borderRadius: 'var(--radius-md)',
                          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.08))',
                          border: '1px solid var(--primary)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span className="badge badge-primary" style={{ fontSize: '0.72rem' }}>
                            Final Course Capstone Exam
                          </span>
                          <span className="badge badge-secondary" style={{ fontSize: '0.7rem', textTransform: 'capitalize' }}>
                            Difficulty: {finalAssessment.difficulty}
                          </span>
                        </div>
                        <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{finalAssessment.title}</div>
                        <p className="text-secondary text-xs" style={{ margin: 0 }}>
                          {finalAssessment.description}
                        </p>
                        <div className="text-muted text-xs" style={{ marginTop: '4px' }}>
                          <strong>{finalAssessment.questions?.length || 0} Questions</strong> &bull; Total Marks: {finalAssessment.totalMarks} &bull; Passing Score: {finalAssessment.passingPercentage}% &bull; Time Limit: {finalAssessment.timeLimitMinutes} mins &bull; Allowed Attempts: {finalAssessment.allowedAttempts}
                        </div>
                      </div>
                    ) : (
                      <div
                        style={{
                          padding: '12px 14px',
                          borderRadius: 'var(--radius-md)',
                          border: '1px dashed var(--border-subtle)',
                          background: 'var(--bg-input)',
                          fontSize: '0.82rem',
                          color: 'var(--text-muted)'
                        }}
                      >
                        No Final Course Assessment configured. You can configure one in Step 2 if required.
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: Faculty & Enrollment Summary */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  {/* Lead Faculty Card */}
                  <div
                    style={{
                      background: 'var(--bg-input)',
                      borderRadius: 'var(--radius-md)',
                      padding: '16px',
                      border: '1px solid var(--border-subtle)'
                    }}
                  >
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Award size={15} color="var(--primary)" /> Assigned Lead Faculty
                    </h4>

                    {selectedFacultyMember ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: 'var(--primary)',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700
                          }}
                        >
                          {selectedFacultyMember.displayName
                            ? selectedFacultyMember.displayName.slice(0, 2).toUpperCase()
                            : selectedFacultyMember.firstName.slice(0, 1)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>
                            {selectedFacultyMember.displayName || `${selectedFacultyMember.firstName} ${selectedFacultyMember.lastName}`}
                          </div>
                          <div className="text-muted text-xs">
                            ID: <strong style={{ color: 'var(--text-primary)' }}>{selectedFacultyMember.rollNo || selectedFacultyMember.id}</strong> &bull;{' '}
                            {getDepartmentName(selectedFacultyMember.departmentId)}
                          </div>
                          <div className="text-muted text-xs">{selectedFacultyMember.email}</div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-muted text-xs">No faculty member assigned. (A default instructor will be assigned).</div>
                    )}
                  </div>

                  {/* Pre-Enrolled Students Summary */}
                  <div
                    style={{
                      background: 'var(--bg-input)',
                      borderRadius: 'var(--radius-md)',
                      padding: '16px',
                      border: '1px solid var(--border-subtle)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Users size={15} color="var(--accent-cyan, #06b6d4)" /> Pre-Enrolled Learners
                      </h4>
                      <span className="badge badge-primary" style={{ fontSize: '0.75rem' }}>
                        {selectedStudentIds.size} Enrolled
                      </span>
                    </div>

                    {selectedStudentIds.size > 0 ? (
                      <div>
                        <p className="text-secondary text-xs" style={{ margin: '0 0 10px' }}>
                          These students will be registered into the course immediately upon publishing:
                        </p>
                        <div
                          style={{
                            maxHeight: '120px',
                            overflowY: 'auto',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px'
                          }}
                        >
                          {Array.from(selectedStudentIds).map((sId) => {
                            const st = allStudents.find((s) => s.id === sId);
                            if (!st) return null;
                            return (
                              <div
                                key={st.id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  fontSize: '0.8rem',
                                  padding: '4px 8px',
                                  background: 'var(--bg-surface)',
                                  borderRadius: '4px'
                                }}
                              >
                                <span style={{ fontWeight: 600 }}>{st.displayName || st.firstName}</span>
                                <span className="text-muted text-xs">{st.rollNo || st.id} &bull; {getDepartmentName(st.departmentId)}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div style={{ padding: '8px 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        No students pre-assigned. The course will be published with 0 enrolled learners. You can invite learners later using <strong>Share Course</strong> or the <strong>Assign Students</strong> roster.
                      </div>
                    )}
                  </div>

                  {/* Completion, Certificate & Rewards Review Card */}
                  <div
                    style={{
                      borderRadius: 'var(--radius-md)',
                      padding: '16px',
                      border: certificateEnabled ? '1px solid rgba(16, 185, 129, 0.4)' : '1px dashed var(--border-subtle)',
                      background: certificateEnabled ? 'rgba(16, 185, 129, 0.05)' : 'var(--bg-input)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Award size={15} color={certificateEnabled ? 'var(--success)' : 'var(--text-muted)'} /> Completion, Certificate & Rewards
                      </h4>
                      <span className={`badge ${certificateEnabled ? 'badge-active' : 'badge-secondary'}`} style={{ fontSize: '0.75rem' }}>
                        {certificateEnabled ? 'Certificate Enabled' : 'No Certificate'}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div>
                        <strong>Availability Window:</strong>{' '}
                        {startDate || endDate ? (
                          <span>
                            {startDate ? new Date(startDate).toLocaleString() : 'Immediate'} &rarr;{' '}
                            {endDate ? new Date(endDate).toLocaleString() : 'Open (No End Date)'}{' '}
                            <span className="text-muted text-xs">({user?.timezone || 'America/New_York'})</span>
                          </span>
                        ) : (
                          <span className="text-muted">Open access (No date restrictions)</span>
                        )}
                      </div>

                      <div>
                        <strong>Completion Rule:</strong>{' '}
                        <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{certMinPercentage}% Progress</span>
                        {certRequireAllLessons ? ' &bull; All Lessons Mandatory' : ''}
                      </div>

                      <div>
                        <strong>Assessment Requirement:</strong>{' '}
                        {certRequireAssessment ? `Examination Passed (>=${certMinScore}%)` : 'None required'}
                      </div>

                      <div>
                        <strong>Gamification Reward:</strong>{' '}
                        <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{certPoints} Points</span>{' '}
                        <span className="text-muted text-xs">(Awarded once upon completion)</span>
                      </div>

                      {certificateEnabled && (
                        <>
                          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '6px', marginTop: '2px' }}>
                            <strong>Template:</strong> <span style={{ textTransform: 'capitalize' }}>{certTemplateId}</span> &bull; <strong>Issuing Org:</strong> {certIssuingOrg}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                              <strong>Signatory:</strong> {certSignerName} ({certSignerTitle})
                            </div>
                            <span className={`badge ${certSignerSignatureImage ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.68rem' }}>
                              {certSignerSignatureImage ? 'Signature Attached' : 'Pending'}
                            </span>
                          </div>
                          <div style={{ marginTop: '6px' }}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => setShowCertPreviewModal(true)}
                              style={{ gap: '6px', width: '100%', justifyContent: 'center', fontSize: '0.78rem' }}
                            >
                              <Eye size={14} /> Preview Certificate Diploma
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Governance & Publication Settings */}
                  <div
                    style={{
                      background: 'var(--bg-input)',
                      borderRadius: 'var(--radius-md)',
                      padding: '16px',
                      border: '1px solid var(--border-subtle)'
                    }}
                  >
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Shield size={15} color="var(--success)" /> Publication & Enrollment Settings
                    </h4>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="publishStatus"
                          checked={publishStatus === 'published'}
                          onChange={() => setPublishStatus('published')}
                          style={{ accentColor: 'var(--primary)' }}
                        />
                        <div>
                          <strong>Publish Immediately (Live in Catalog)</strong>
                          <div className="text-muted text-xs">Visible to enrolled students and catalog discovery</div>
                        </div>
                      </label>

                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="publishStatus"
                          checked={publishStatus === 'draft'}
                          onChange={() => setPublishStatus('draft')}
                          style={{ accentColor: 'var(--primary)' }}
                        />
                        <div>
                          <strong>Save as Private Draft</strong>
                          <div className="text-muted text-xs">Keeps materials private for continuing revisions</div>
                        </div>
                      </label>

                      <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '10px', marginTop: '4px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={shareableLinkEnabled}
                            onChange={(e) => setShareableLinkEnabled(e.target.checked)}
                            style={{ accentColor: 'var(--primary)' }}
                          />
                          <span>Enable instant public/shareable enrollment link</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Actions Bar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '20px 24px',
                  borderTop: '1px solid var(--border-subtle)',
                  background: 'var(--bg-input)',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}
              >
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setStep(3)}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <ArrowLeft size={16} /> Back to Faculty & Students
                </button>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setPublishStatus('draft');
                      setIsConfirmModalOpen(true);
                    }}
                  >
                    Save as Draft
                  </button>

                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      setPublishStatus('published');
                      setIsConfirmModalOpen(true);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '12px 28px',
                      fontWeight: 700,
                      fontSize: '0.95rem'
                    }}
                  >
                    <Send size={16} /> Publish Course
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* ========================================================= */}
      {/* PUBLISH CONFIRMATION DIALOG MODAL                         */}
      {/* ========================================================= */}
      {
        isConfirmModalOpen && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.65)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '16px'
            }}
          >
            <div
              className="card"
              style={{
                maxWidth: '520px',
                width: '100%',
                padding: '28px',
                boxShadow: 'var(--shadow-xl)',
                animation: 'modalSlideUp 0.2s ease-out'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    background: 'var(--primary-light, rgba(99, 102, 241, 0.15))',
                    color: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <Send size={22} />
                </div>

                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>
                    Publish Course
                  </h3>
                  <p className="text-secondary text-xs" style={{ margin: 0 }}>
                    Please confirm publishing details before releasing to the catalog.
                  </p>
                </div>
              </div>

              <div
                style={{
                  background: 'var(--bg-input)',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px 16px',
                  marginBottom: '20px',
                  fontSize: '0.85rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-muted">Course Title:</span>
                  <strong>{title}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-muted">Course Code:</span>
                  <strong>{courseCode}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-muted">Department:</span>
                  <strong>{getDepartmentName(departmentId)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-muted">Lead Faculty:</span>
                  <strong>
                    {selectedFacultyMember ? selectedFacultyMember.displayName || selectedFacultyMember.firstName : 'Unassigned'}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-muted">Pre-Enrolled Students:</span>
                  <strong style={{ color: selectedStudentIds.size > 0 ? 'var(--primary)' : 'inherit' }}>
                    {selectedStudentIds.size > 0 ? `${selectedStudentIds.size} Students` : 'None (Optional)'}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-muted">Curriculum Content:</span>
                  <strong>{modules.length} Modules &bull; {totalLessonsCount} Lessons</strong>
                </div>
              </div>

              <p className="text-secondary text-xs" style={{ marginBottom: '24px' }}>
                Once published, the course will be discoverable in the course catalog. Pre-assigned students will have immediate access to all curriculum modules.
              </p>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={isPublishing}
                  onClick={() => setIsConfirmModalOpen(false)}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={isPublishing}
                  onClick={handleConfirmPublish}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px' }}
                >
                  {isPublishing ? (
                    <span>Publishing...</span>
                  ) : (
                    <>
                      <CheckCircle2 size={16} /> Confirm Publish
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* ========================================================= */}
      {/* REUSABLE ASSESSMENT CONFIGURATION MODAL (AI / MANUAL)      */}
      {/* ========================================================= */}
      {
        assessmentModalState.isOpen && (
          <AssessmentConfigModal
            isOpen={assessmentModalState.isOpen}
            onClose={() => setAssessmentModalState((prev) => ({ ...prev, isOpen: false }))}
            scope={assessmentModalState.scope}
            courseTitle={title}
            moduleTitle={
              assessmentModalState.modIndex !== null ? modules[assessmentModalState.modIndex]?.title : ''
            }
            lessonTitle={
              assessmentModalState.modIndex !== null && assessmentModalState.lessonIndex !== null
                ? modules[assessmentModalState.modIndex]?.lessons[assessmentModalState.lessonIndex]?.title
                : ''
            }
            category={category}
            availableDocuments={
              assessmentModalState.scope === 'lesson_quiz' &&
                assessmentModalState.modIndex !== null &&
                assessmentModalState.lessonIndex !== null
                ? modules[assessmentModalState.modIndex]?.lessons[assessmentModalState.lessonIndex]?.uploadedDocument
                  ? [modules[assessmentModalState.modIndex].lessons[assessmentModalState.lessonIndex].uploadedDocument!]
                  : allCourseDocuments
                : assessmentModalState.scope === 'module_assessment' && assessmentModalState.modIndex !== null
                  ? modules[assessmentModalState.modIndex]?.lessons
                    .filter((l) => Boolean(l.uploadedDocument))
                    .map((l) => l.uploadedDocument!)
                  : allCourseDocuments
            }
            initialConfig={assessmentModalState.config}
            onSave={handleSaveAssessmentConfig}
          />
        )
      }

      {/* ========================================================= */}
      {/* REUSABLE DELETION & RESET CONFIRMATION MODAL              */}
      {/* ========================================================= */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        isDestructive={true}
      />

      {/* ========================================================= */}
      {/* CERTIFICATE PREVIEW MODAL                                 */}
      {/* ========================================================= */}
      {showCertPreviewModal && (
        <div className="modal-overlay" onClick={() => setShowCertPreviewModal(false)}>
          <div className="modal-card" style={{ maxWidth: '780px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Award size={20} color="var(--primary)" />
                <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Certificate Preview — {certTitle}</h3>
              </div>
              <button onClick={() => setShowCertPreviewModal(false)} style={{ color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: '24px', textAlign: 'center' }}>
              <div style={{
                border: '3px double #d97706',
                borderRadius: 'var(--radius-lg)',
                padding: '30px 24px',
                background: 'radial-gradient(ellipse at center, rgba(254, 243, 199, 0.15) 0%, transparent 80%), var(--bg-card)',
                boxShadow: 'inset 0 0 24px rgba(0, 0, 0, 0.2)',
                position: 'relative'
              }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
                  <img
                    src="/logo.png"
                    alt="VeniLearn"
                    style={{ height: '38px', objectFit: 'contain' }}
                  />
                </div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  {certIssuingOrg} &bull; Official Credentials Registry
                </div>
                <div style={{ width: '80px', height: '2px', background: 'linear-gradient(90deg, transparent, #d97706, transparent)', margin: '8px auto 14px' }} />

                <div style={{ fontSize: '1.35rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-main)' }}>
                  {certTitle}
                </div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#d97706', marginBottom: '14px' }}>
                  Template: {certTemplateId.toUpperCase()} &bull; Verified Academic Credential
                </div>

                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  This credential is officially conferred upon
                </div>
                <div style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--primary)', fontFamily: 'Georgia, serif', margin: '6px 0 10px' }}>
                  Alex Thompson (Learner Name Preview)
                </div>

                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '540px', margin: '0 auto 12px', lineHeight: 1.5 }}>
                  for successfully satisfying all completion requirements, proctored examinations, and applied competencies in
                </div>

                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--accent-cyan)', marginBottom: '4px' }}>
                  {title || 'Course Title Preview'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: '22px' }}>
                  Demonstrating advanced engineering rigor, technical competency, and verified professional excellence.
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px', paddingLeft: '20px', paddingRight: '20px' }}>
                  <div style={{ textAlign: 'center', width: '160px' }}>
                    {certSignerSignatureImage ? (
                      <div style={{ height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2px' }}>
                        <img src={certSignerSignatureImage} alt="Signature" style={{ maxHeight: '34px', maxWidth: '140px', objectFit: 'contain' }} />
                      </div>
                    ) : (
                      <div style={{ fontFamily: 'Georgia, cursive', fontStyle: 'italic', fontSize: '1.1rem', color: 'var(--text-main)', marginBottom: '2px' }}>
                        {certSignerName}
                      </div>
                    )}
                    <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '4px', fontWeight: 700, fontSize: '0.75rem', color: 'var(--text-main)' }}>
                      {certSignerName}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{certSignerTitle}</div>
                  </div>

                  <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    border: '3px solid #d97706',
                    background: 'rgba(217, 119, 6, 0.15)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 10px'
                  }}>
                    <Award size={18} color="#d97706" />
                    <span style={{ fontSize: '0.5rem', fontWeight: 800, color: '#d97706', textTransform: 'uppercase' }}>OFFICIAL</span>
                  </div>

                  <div style={{ textAlign: 'center', width: '160px' }}>
                    <div style={{ fontFamily: 'Georgia, cursive', fontStyle: 'italic', fontSize: '1.1rem', color: 'var(--text-main)', marginBottom: '2px' }}>
                      Sarah Chen
                    </div>
                    <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '4px', fontWeight: 700, fontSize: '0.75rem', color: 'var(--text-main)' }}>
                      Sarah Chen, M.Sc.
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Dean of Academic Affairs</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowCertPreviewModal(false)}>
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
