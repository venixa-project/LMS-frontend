import React, { useState, useMemo, useEffect } from 'react';
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
  Layers, ExternalLink, Share2, AlertTriangle, UserPlus, Info, Edit2, RefreshCw
} from 'lucide-react';

export const CourseBuilderPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editingCourseId = searchParams.get('id') || searchParams.get('edit');

  const { user } = useAuthStore();
  const { addCourse, assignStudentsToCourse, courses } = useCourseStore();
  const { getFaculty, getStudents } = usePeopleStore();
  const { cohorts } = useCohortStore();

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
  const [title, setTitle] = useState('Advanced Microservices & Distributed Systems');
  const [courseCode, setCourseCode] = useState('CRS-2026-401');
  const [description, setDescription] = useState(
    'Architect resilient, event-driven enterprise architectures using Kafka, Docker, Kubernetes, and Domain-Driven Design principles.'
  );
  const [departmentId, setDepartmentId] = useState<string>(mockDepartments[0]?.id || 'dep-001');
  const [category, setCategory] = useState('Backend Development');
  const [difficultyLevel, setDifficultyLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('advanced');
  const [durationHours, setDurationHours] = useState(24);
  const [completionPolicy, setCompletionPolicy] = useState('all_lessons_and_passing_assessment');
  const [thumbnailUrl, setThumbnailUrl] = useState(
    'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=600&q=80'
  );
  const [step1Error, setStep1Error] = useState<string | null>(null);

  // -------------------------------------------------------------
  // STEP 2: Curriculum & Lessons (with Quizzes, Documents & Assessments)
  // -------------------------------------------------------------
  const [modules, setModules] = useState<CourseModule[]>([
    {
      id: 'mod-1',
      title: 'Module 1: Domain-Driven Design Fundamentals',
      order: 1,
      lessons: [
        {
          id: 'les-1',
          title: '1.1 Strategic Design & Bounded Contexts',
          type: 'video',
          durationMinutes: 20,
          isCompleted: false,
          order: 1,
          contentUrl: 'https://demo.video/1',
        },
        {
          id: 'les-2',
          title: '1.2 Aggregates, Entities & Domain Events',
          type: 'document',
          durationMinutes: 15,
          isCompleted: false,
          order: 2,
          uploadedDocument: {
            id: 'doc-init-1',
            name: 'domain-driven-design-primer.pdf',
            size: 2450000,
            type: 'application/pdf',
            uploadedAt: '2026-10-20T10:00:00Z',
          },
        },
      ],
    },
    {
      id: 'mod-2',
      title: 'Module 2: Event-Driven Communication with Kafka',
      order: 2,
      assessment: {
        id: 'asm-mod-2',
        title: 'Module 2: Kafka & Resilient Messaging Assessment Checkpoint',
        description: 'Comprehensive evaluation of message partitions, consumer lag, and Outbox persistence patterns.',
        scope: 'module_assessment',
        difficulty: 'medium',
        timeLimitMinutes: 30,
        passingPercentage: 75,
        allowedAttempts: 2,
        totalMarks: 40,
        status: 'ready',
        questions: [
          {
            id: 'q-mod2-1',
            prompt: 'In Kafka architecture, what is the primary role of a partition within a topic?',
            type: 'single_choice',
            difficulty: 'medium',
            points: 10,
            explanation: 'Partitions provide horizontal parallelism and strictly ordered message logs.',
            options: [
              { id: 'opt-m1', text: 'To encrypt network payloads across brokers', isCorrect: false },
              { id: 'opt-m2', text: 'To provide the unit of parallelism and ordered log storage', isCorrect: true },
              { id: 'opt-m3', text: 'To run distributed SQL queries', isCorrect: false },
              { id: 'opt-m4', text: 'To discard unacknowledged consumer messages', isCorrect: false },
            ],
          },
          {
            id: 'q-mod2-2',
            prompt: 'How does the Outbox Pattern prevent dual-write inconsistencies between database transactions and message brokers?',
            type: 'single_choice',
            difficulty: 'medium',
            points: 10,
            explanation: 'It persists outgoing events in an outbox table within the same ACID database transaction.',
            options: [
              { id: 'opt-m5', text: 'By using synchronous HTTP REST webhooks', isCorrect: false },
              { id: 'opt-m6', text: 'By storing events atomically in an outbox table within the same relational transaction', isCorrect: true },
              { id: 'opt-m7', text: 'By disabling transaction rollbacks', isCorrect: false },
              { id: 'opt-m8', text: 'By discarding failed message retries silently', isCorrect: false },
            ],
          },
          {
            id: 'q-mod2-3',
            prompt: 'Which settings in Kafka ensure zero message loss for mission-critical event delivery? (Select all that apply)',
            type: 'multiple_choice',
            difficulty: 'medium',
            points: 10,
            explanation: 'Producer acks=all, min.insync.replicas >= 2, and idempotence ensure message delivery guarantees.',
            options: [
              { id: 'opt-m9', text: 'Producer acks configured to "all" (-1)', isCorrect: true },
              { id: 'opt-m10', text: 'Broker min.insync.replicas configured to 2 or greater', isCorrect: true },
              { id: 'opt-m11', text: 'enable.idempotence set to true on producer client', isCorrect: true },
              { id: 'opt-m12', text: 'auto.offset.reset set to "none"', isCorrect: false },
            ],
          },
          {
            id: 'q-mod2-4',
            prompt: 'Kafka consumers in the same consumer group can concurrently read the exact same partition of a topic.',
            type: 'true_false',
            difficulty: 'easy',
            points: 10,
            explanation: 'False. Each partition is assigned to at most one consumer instance per group.',
            options: [
              { id: 'opt-tf-m1', text: 'True', isCorrect: false },
              { id: 'opt-tf-m2', text: 'False', isCorrect: true },
            ],
          },
        ],
      },
      lessons: [
        {
          id: 'les-3',
          title: '2.1 Kafka Broker Architecture & Partitions',
          type: 'video',
          durationMinutes: 30,
          isCompleted: false,
          order: 1,
        },
        {
          id: 'les-4',
          title: '2.2 Microservices Resiliency Quiz Checkpoint',
          type: 'quiz',
          durationMinutes: 15,
          isCompleted: false,
          order: 2,
          quizConfig: {
            id: 'quiz-les-4',
            title: 'Lesson 2.2: Microservices Resiliency Quiz',
            description: 'Verify your understanding of Kafka partitions and resiliency patterns.',
            scope: 'lesson_quiz',
            difficulty: 'medium',
            timeLimitMinutes: 15,
            passingPercentage: 70,
            allowedAttempts: 3,
            totalMarks: 25,
            status: 'ready',
            questions: [
              {
                id: 'q-l4-1',
                prompt: 'What happens when a Kafka producer sends a record with a null key using the default partitioner?',
                type: 'single_choice',
                difficulty: 'easy',
                points: 5,
                explanation: 'Kafka employs sticky partitioning to batch records into available partitions efficiently.',
                options: [
                  { id: 'opt-l1', text: 'The record is routed using sticky partitioning across available partitions', isCorrect: true },
                  { id: 'opt-l2', text: 'The producer rejects the record with an error', isCorrect: false },
                  { id: 'opt-l3', text: 'The record is duplicated across all partitions', isCorrect: false },
                  { id: 'opt-l4', text: 'The record is held in memory forever', isCorrect: false },
                ],
              },
              {
                id: 'q-l4-2',
                prompt: 'Which architectural characteristics define resilient distributed microservices? (Select all that apply)',
                type: 'multiple_choice',
                difficulty: 'medium',
                points: 10,
                explanation: 'Circuit breakers, independent databases, and idempotent handlers prevent cascading failure.',
                options: [
                  { id: 'opt-l5', text: 'Circuit breakers and graceful fallback strategies for downstream timeouts', isCorrect: true },
                  { id: 'opt-l6', text: 'Autonomous database per microservice pattern', isCorrect: true },
                  { id: 'opt-l7', text: 'Idempotent consumer message handlers', isCorrect: true },
                  { id: 'opt-l8', text: 'Synchronous blocking chains across all endpoints', isCorrect: false },
                ],
              },
              {
                id: 'q-l4-3',
                prompt: 'The CAP Theorem states that in the presence of a network partition, a distributed system must choose between Consistency and Availability.',
                type: 'true_false',
                difficulty: 'medium',
                points: 10,
                explanation: 'True. Under network partition, a distributed system cannot guarantee both C and A.',
                options: [
                  { id: 'opt-tf-l1', text: 'True', isCorrect: true },
                  { id: 'opt-tf-l2', text: 'False', isCorrect: false },
                ],
              },
            ],
          },
        },
      ],
    },
  ]);

  // Section C: Final Course Assessment
  const [finalAssessment, setFinalAssessment] = useState<QuizAssessmentConfig | undefined>({
    id: 'asm-final-course',
    title: 'Advanced Microservices & Distributed Systems Final Capstone Exam',
    description: 'Comprehensive evaluation covering all course modules, domain-driven design, and event-driven architectures.',
    scope: 'final_assessment',
    difficulty: 'hard',
    timeLimitMinutes: 60,
    passingPercentage: 75,
    allowedAttempts: 2,
    totalMarks: 50,
    status: 'ready',
    questions: [
      {
        id: 'q-fin-1',
        prompt: 'When decomposing an enterprise monolith into microservices, which pattern effectively coordinates distributed transactions with compensating steps?',
        type: 'single_choice',
        difficulty: 'hard',
        points: 15,
        explanation: 'The Saga pattern coordinates local transactions with compensating rollbacks upon failure.',
        options: [
          { id: 'opt-f1', text: 'Saga Pattern with compensating transactions for rollback', isCorrect: true },
          { id: 'opt-f2', text: 'Shared database tables with pessimistic locking', isCorrect: false },
          { id: 'opt-f3', text: 'Synchronous nested RPC calls across 10 downstream services', isCorrect: false },
          { id: 'opt-f4', text: 'Manual database restoration from backup tapes', isCorrect: false },
        ],
      },
      {
        id: 'q-fin-2',
        prompt: 'Which operational pillars are recommended for production microservices observability? (Select all that apply)',
        type: 'multiple_choice',
        difficulty: 'hard',
        points: 15,
        explanation: 'Distributed tracing, centralized structured logging, and metrics monitoring form the core observability pillars.',
        options: [
          { id: 'opt-f5', text: 'Distributed tracing with unique trace ID propagation across all RPC boundaries', isCorrect: true },
          { id: 'opt-f6', text: 'Centralized log aggregation with structured JSON logging and correlation IDs', isCorrect: true },
          { id: 'opt-f7', text: 'Time-series metric monitoring with health probes (liveness & readiness)', isCorrect: true },
          { id: 'opt-f8', text: 'Disabling logging in production to save network bandwidth', isCorrect: false },
        ],
      },
      {
        id: 'q-fin-3',
        prompt: 'In Domain-Driven Design (DDD), an Aggregate Root is the only entry point through which external entities may access internal boundary objects.',
        type: 'true_false',
        difficulty: 'medium',
        points: 10,
        explanation: 'True. The Aggregate Root guarantees the consistency and invariants of all internal entities.',
        options: [
          { id: 'opt-tf-f1', text: 'True', isCorrect: true },
          { id: 'opt-tf-f2', text: 'False', isCorrect: false },
        ],
      },
      {
        id: 'q-fin-4',
        prompt: 'In CQRS (Command Query Responsibility Segregation), what is the primary benefit of separating read and write models?',
        type: 'single_choice',
        difficulty: 'medium',
        points: 10,
        explanation: 'CQRS allows read models to be optimized and scaled independently from write business rules.',
        options: [
          { id: 'opt-f9', text: 'It permits independent scaling and tailored data schemas for writes versus read queries', isCorrect: true },
          { id: 'opt-f10', text: 'It eliminates the need for database backups', isCorrect: false },
          { id: 'opt-f11', text: 'It guarantees that writes are immediately visible with zero latency', isCorrect: false },
          { id: 'opt-f12', text: 'It forces all client applications to write queries in assembly language', isCorrect: false },
        ],
      },
    ],
  });

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

  // Load existing course if editing
  useEffect(() => {
    if (editingCourseId) {
      const existing = courses.find((c) => c.id.toLowerCase() === editingCourseId.toLowerCase());
      if (existing) {
        setTitle(existing.title);
        setCourseCode(existing.id.toUpperCase().replace('CRS-', 'CRS-2026-'));
        setDescription(existing.description || '');
        if (existing.departmentId) setDepartmentId(existing.departmentId);
        if (existing.category) setCategory(existing.category);
        if (existing.durationHours) setDurationHours(existing.durationHours);
        if (existing.thumbnail) setThumbnailUrl(existing.thumbnail);
        if (existing.modules && existing.modules.length > 0) {
          setModules(existing.modules);
          setActiveModuleIndex(0);
        }
        if (existing.finalAssessment) {
          setFinalAssessment(existing.finalAssessment);
        }
      }
    }
  }, [editingCourseId, courses]);

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
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set(['st-1', 'st-2', 'u-007']));
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

  // Filtered students for Step 3
  const filteredStudents = useMemo(() => {
    return allStudents.filter((st) => {
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
  }, [allStudents, studentDeptFilter, selectedCohortId, studentSearchQuery, cohorts]);

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
  const [publishStatus, setPublishStatus] = useState<EntityStatus>('published');
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

    if (!finalAssessment) {
      warnings.push('No Final Course Assessment is configured. You may publish without one, but learners will not have a capstone evaluation.');
    } else if (!finalAssessment.questions || finalAssessment.questions.length === 0) {
      warnings.push('Final Course Assessment has 0 questions configured.');
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
      const generatedId = `crs-${courseCode.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now().toString().slice(-4)}`;
      const assignedInstructors = selectedLeadFacultyId ? [selectedLeadFacultyId] : ['u-004'];
      const enrolledCount = selectedStudentIds.size;

      const newCourse: Course = {
        id: generatedId,
        title: title.trim(),
        description: description.trim(),
        shortDescription: description.trim().slice(0, 140) + '...',
        category,
        departmentId,
        level: difficultyLevel,
        durationHours,
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
              <BookOpen size={16} /> View in Courses & Catalog
            </button>

            <button
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px' }}
              onClick={() => navigate(`/courses/${publishedCourse.id}/share`)}
            >
              <Share2 size={16} /> Share Course Link
            </button>

            <button
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px' }}
              onClick={() => navigate(`/courses/${publishedCourse.id}/assign-students`)}
            >
              <UserPlus size={16} /> Assign More Students
            </button>

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

          <span className="badge badge-warning" style={{ fontWeight: 600 }}>
            Lifecycle: {publishStatus} (v1.0)
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
          { stepNum: 3, title: '3. Assign Faculty & Students', subtitle: 'Lead faculty & pre-enroll' },
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
                onChange={(e) => handleDepartmentChange(e.target.value)}
                style={{ fontWeight: 600 }}
              >
                {mockDepartments.map((dept) => (
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
              <select className="form-select" value={category} onChange={(e) => setCategory(e.target.value)}>
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
                onChange={(e) => setDifficultyLevel(e.target.value as any)}
              >
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
                value={durationHours}
                onChange={(e) => setDurationHours(parseInt(e.target.value) || 1)}
              />
            </div>
          </div>

          {/* Thumbnail & Certification Policy */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontWeight: 600 }}>
                Course Thumbnail URL
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="https://images.unsplash.com/..."
                value={thumbnailUrl}
                onChange={(e) => setThumbnailUrl(e.target.value)}
              />
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.72rem', padding: '2px 8px' }}
                  onClick={() =>
                    setThumbnailUrl(
                      'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=600&q=80'
                    )
                  }
                >
                  Tech Preset 1
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.72rem', padding: '2px 8px' }}
                  onClick={() =>
                    setThumbnailUrl(
                      'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=600&q=80'
                    )
                  }
                >
                  Code Preset 2
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.72rem', padding: '2px 8px' }}
                  onClick={() =>
                    setThumbnailUrl(
                      'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=600&q=80'
                    )
                  }
                >
                  Cloud Preset 3
                </button>
              </div>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontWeight: 600 }}>
                Completion & Certification Policy
              </label>
              <select
                className="form-select"
                value={completionPolicy}
                onChange={(e) => setCompletionPolicy(e.target.value)}
              >
                <option value="all_lessons_and_passing_assessment">
                  Require 100% lesson completion and passing assessment score
                </option>
                <option value="lessons_only">Require all lessons viewed/completed only</option>
                <option value="passing_assessment_only">Pass final assessment only</option>
              </select>
            </div>
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
              {modules[activeModuleIndex] ? (
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

          {/* SECTION A: SELECT LEAD FACULTY */}
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

              {/* Department Selector for Faculty (defaults to Step 1 dept) */}
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
                  <option value="all">All Departments ({mockDepartments.length})</option>
                  {mockDepartments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} {d.id === departmentId ? '(Course Dept)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Real-time search bar for faculty */}
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

            {/* Faculty List Grid */}
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
                const isCourseDept = fac.departmentId === departmentId;

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
                        {fac.displayName ? fac.displayName.slice(0, 2).toUpperCase() : fac.firstName.slice(0, 1)}
                      </div>

                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>
                          {fac.displayName || `${fac.firstName} ${fac.lastName}`}
                        </div>
                        <div className="text-muted text-xs">
                          ID: <strong style={{ color: 'var(--text-primary)' }}>{fac.rollNo || fac.id}</strong> &bull;{' '}
                          {getDepartmentName(fac.departmentId)}
                        </div>
                        <div className="text-muted text-xs" style={{ fontSize: '0.72rem' }}>
                          {fac.email}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      {isInactive ? (
                        <span className="badge badge-danger" style={{ fontSize: '0.68rem' }}>
                          Inactive
                        </span>
                      ) : isSelected ? (
                        <span
                          className="badge badge-primary"
                          style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem' }}
                        >
                          <Check size={12} /> Assigned
                        </span>
                      ) : (
                        <span className="badge badge-secondary" style={{ fontSize: '0.72rem' }}>
                          Select
                        </span>
                      )}

                      {isCourseDept && !isInactive && !isSelected && (
                        <div
                          style={{
                            fontSize: '0.65rem',
                            color: 'var(--primary)',
                            fontWeight: 600,
                            marginTop: '2px'
                          }}
                        >
                          Dept Match
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {filteredFaculty.length === 0 && (
                <div
                  style={{
                    gridColumn: '1 / -1',
                    textAlign: 'center',
                    padding: '24px',
                    color: 'var(--text-muted)'
                  }}
                >
                  <Search size={20} style={{ margin: '0 auto 6px', opacity: 0.5 }} />
                  <div style={{ fontSize: '0.85rem' }}>No faculty matching your query</div>
                </div>
              )}
            </div>

            {/* Currently selected lead faculty confirmation bar */}
            {
              selectedFacultyMember && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: '14px',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.85rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Shield size={16} color="var(--primary)" />
                    <span>
                      Selected Lead Faculty:{' '}
                      <strong>{selectedFacultyMember.displayName || selectedFacultyMember.firstName}</strong> (
                      {selectedFacultyMember.rollNo || selectedFacultyMember.id}) &bull;{' '}
                      <span className="text-muted">{selectedFacultyMember.email}</span>
                    </span>
                  </div>
                  <span className="badge badge-success" style={{ fontSize: '0.72rem' }}>
                    Active & Certified
                  </span>
                </div>
              )
            }
          </div >

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
                    <option value="all">All Cohorts / Batches</option>
                    {cohorts.map((c) => (
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
                    const isChecked = selectedStudentIds.has(st.id);
                    const isInactive = st.status === 'suspended' || st.status === 'deactivated';

                    return (
                      <tr
                        key={st.id}
                        onClick={() => {
                          if (!isInactive) handleToggleStudent(st.id);
                        }}
                        style={{
                          background: isChecked ? 'var(--primary-light, rgba(99, 102, 241, 0.08))' : 'transparent',
                          cursor: isInactive ? 'not-allowed' : 'pointer',
                          opacity: isInactive ? 0.6 : 1,
                          borderBottom: '1px solid var(--border-subtle)',
                          fontSize: '0.85rem'
                        }}
                      >
                        <td style={{ textAlign: 'center', padding: '8px' }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={isInactive}
                            onChange={() => handleToggleStudent(st.id)}
                            style={{ accentColor: 'var(--primary)', cursor: 'pointer' }}
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
                          {isInactive ? (
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
    </div >
  );
};
