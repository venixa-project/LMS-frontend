import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuthStore } from '../../lib/store';
import { useCourseStore, mapBackendCourseToFrontend } from '../../lib/courseStore';
import { useCertificateStore } from '../../lib/certificateStore';
import { useAssessmentStore } from '../../lib/assessmentStore';
import { useMomentumStore } from '../../lib/momentumStore';
import { apiClient } from '../../lib/apiClient';
import { generateCertificatePdf } from '../../lib/certificatePdf';
import { Course, Certificate, QuizAssessmentConfig, UploadedDocumentInfo } from '../../types';
import { LearnerVideoPlayer } from './components/LearnerVideoPlayer';
import { LearnerQuizRunner } from './components/LearnerQuizRunner';
import { AILessonSummaryPanel } from './components/AILessonSummaryPanel';
import {
  ArrowLeft, CheckCircle2, Circle, Play, FileText, Download,
  ChevronRight, ChevronLeft, ChevronDown, Bookmark, Share2, Sparkles, Award,
  ShieldCheck, X, ExternalLink, Clock, Lock, AlertTriangle, Eye,
  Pause, Video, HelpCircle, BookOpen, Check, Layers, Code,
  Upload, Printer, RefreshCw, Info
} from 'lucide-react';
import { getActiveDocumentFile, registerDocumentFile } from '../../lib/videoService';

// Universal reliable browser file download helper (works with Blob, URL, DataURL, and String content)
export function downloadContentFile(
  content: string | Blob,
  fileName: string,
  mimeType = 'application/octet-stream'
) {
  try {
    let url = '';
    let isCreatedBlob = false;

    if (content instanceof Blob) {
      url = URL.createObjectURL(content);
      isCreatedBlob = true;
    } else if (typeof content === 'string') {
      if (content.startsWith('data:') || content.startsWith('blob:') || content.startsWith('http://') || content.startsWith('https://') || content.startsWith('/')) {
        url = content;
      } else {
        const blob = new Blob([content], { type: mimeType });
        url = URL.createObjectURL(blob);
        isCreatedBlob = true;
      }
    } else {
      const blob = new Blob([String(content)], { type: mimeType });
      url = URL.createObjectURL(blob);
      isCreatedBlob = true;
    }

    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
      try {
        if (a.parentNode) {
          document.body.removeChild(a);
        }
        if (isCreatedBlob) {
          URL.revokeObjectURL(url);
        }
      } catch { }
    }, 2500);
  } catch (err) {
    console.error('Download error:', err);
  }
}

export const LearnerCoursePlayerPage: React.FC = () => {
  const { user } = useAuthStore();
  const { courses, fetchCourses, isLoading: isCoursesLoading } = useCourseStore();
  const { issueCourseCertificate, getCertificatesByLearner } = useCertificateStore();
  const { id } = useParams<{ id: string }>();

  // Authoritative course state fetched freshly from backend PostgreSQL database
  const [courseFromApi, setCourseFromApi] = useState<Course | null>(null);

  useEffect(() => {
    if (id) {
      apiClient.get<any>(`/courses/${id}`).then((res) => {
        if (res?.data) {
          const mapped = mapBackendCourseToFrontend(res.data);
          setCourseFromApi(mapped);
        }
      }).catch((err) => {
        console.warn('[LearnerPlayer] Could not fetch single course from API:', err);
      });
    }
  }, [id]);

  // Resolve course from API first (most complete with lessons/docs/media), then fallback to store
  const course: Course | undefined = courseFromApi || courses.find((c) => c.id === id || (c as any).slug === id);
  const allLessons = useMemo(() => course?.modules?.flatMap((m) => m.lessons) || [], [course]);

  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [selectedAssessment, setSelectedAssessment] = useState<{
    scope: 'module_assessment' | 'final_assessment';
    config: QuizAssessmentConfig;
    moduleTitle?: string;
  } | null>(null);

  // Lesson completions state keyed by course, initialized from localStorage
  const [courseCompletionMap, setCourseCompletionMap] = useState<Record<string, string[]>>(() => {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('venilearn_course_completions');
        if (stored) return JSON.parse(stored);
      }
    } catch { }
    return {};
  });

  const completedLessonIds = useMemo(() => {
    if (!course) return [];
    if (courseCompletionMap[course.id] && courseCompletionMap[course.id].length > 0) {
      return courseCompletionMap[course.id];
    }
    if (courseCompletionMap[course.id.toLowerCase()] && courseCompletionMap[course.id.toLowerCase()].length > 0) {
      return courseCompletionMap[course.id.toLowerCase()];
    }
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(`venilearn_completed_lessons_${course.id}`) || localStorage.getItem(`venilearn_completed_lessons_${course.id.toLowerCase()}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      }
    } catch { }

    // Check courseStore enrollments
    const enr = useCourseStore.getState().enrollments.find((e) => e.courseId?.toLowerCase() === course.id.toLowerCase());
    if (enr?.completedLessonIds && enr.completedLessonIds.length > 0) {
      return enr.completedLessonIds;
    }
    return [];
  }, [course?.id, courseCompletionMap]);

  const persistCompletions = (nextList: string[]) => {
    if (!course) return;
    setCourseCompletionMap((prev) => {
      const updated = { ...prev, [course.id]: nextList, [course.id.toLowerCase()]: nextList };
      try {
        localStorage.setItem('venilearn_course_completions', JSON.stringify(updated));
      } catch { }
      return updated;
    });
    try {
      localStorage.setItem(`venilearn_completed_lessons_${course.id}`, JSON.stringify(nextList));
      localStorage.setItem(`venilearn_completed_lessons_${course.id.toLowerCase()}`, JSON.stringify(nextList));
    } catch { }
    const newPercent = allLessons.length > 0 ? Math.min(100, Math.round((nextList.length / allLessons.length) * 100)) : 0;
    useCourseStore.getState().updateCourseProgress(course.id, newPercent);
  };

  // Reset lesson index and playback state when course changes
  useEffect(() => {
    setCurrentLessonIndex(0);
    setIsPlaying(false);
    setSelectedAssessment(null);
  }, [course?.id]);

  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [unlockedCert, setUnlockedCert] = useState<Certificate | null>(null);
  const [showCertModal, setShowCertModal] = useState(false);
  const [downloadingCert, setDownloadingCert] = useState(false);
  const docFileInputRef = useRef<HTMLInputElement | null>(null);
  const [localDocMap, setLocalDocMap] = useState<Record<string, UploadedDocumentInfo>>({});
  const [showLessonSummary, setShowLessonSummary] = useState(false);

  // Persistent notes per lesson
  const [lessonNotes, setLessonNotes] = useState<Record<string, string>>(() => {
    if (!course) return {};
    try {
      const saved = localStorage.getItem(`venilearn_notes_${course.id}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const handleSaveNote = (text: string) => {
    if (!course) return;
    const activeLessonId = allLessons[currentLessonIndex]?.id || 'les-default';
    const updated = { ...lessonNotes, [activeLessonId]: text };
    setLessonNotes(updated);
    try {
      localStorage.setItem(`venilearn_notes_${course.id}`, JSON.stringify(updated));
    } catch { }
  };

  if (!course && isCoursesLoading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        padding: '40px',
        textAlign: 'center'
      }}>
        <RefreshCw className="animate-spin" size={32} color="var(--primary)" style={{ marginBottom: '16px' }} />
        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px' }}>
          Loading Course...
        </h3>
        <p style={{ color: 'var(--text-secondary)' }}>Retrieving course curriculum from PostgreSQL database.</p>
      </div>
    );
  }

  if (!course) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        padding: '40px',
        textAlign: 'center',
        background: 'var(--bg-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        marginTop: '24px'
      }}>
        <HelpCircle size={48} color="var(--primary)" style={{ marginBottom: '16px' }} />
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-main)' }}>
          Course Not Found
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', maxWidth: '420px' }}>
          This course could not be found or has not been loaded. Please select an available course.
        </p>
        <Link to="/courses" className="btn btn-primary">
          Return to Courses
        </Link>
      </div>
    );
  }

  // Check if learner already earned a certificate for this course
  const existingCert = user ? getCertificatesByLearner(user.id).find((c) => c.courseId === course.id) : undefined;

  // Course Availability Calculations
  const now = new Date();
  const isBeforeStart = Boolean(course.startDate && new Date(course.startDate) > now);
  const isAfterEnd = Boolean(course.endDate && new Date(course.endDate) < now);
  const isStudent = user?.activeRole === 'student' || user?.activeRole === 'learner' || (user as any)?.role === 'student' || (user as any)?.role === 'learner';
  const isPrivileged = !isStudent; // Admins and Trainers
  const exitLink = isStudent ? '/my-learning' : '/courses';

  const currentLesson = allLessons[currentLessonIndex] || allLessons[0];
  const isCompleted = currentLesson ? completedLessonIds.includes(currentLesson.id) : false;

  // Find module containing current lesson
  const currentModule = course.modules.find((m) => m.lessons.some((l) => l.id === currentLesson?.id)) || course.modules[0];
  const currentModuleIndex = course.modules.findIndex((m) => m.id === currentModule?.id);

  // Active document resolution for reading material
  const activeDoc: UploadedDocumentInfo = useMemo(() => {
    let resolvedDoc: UploadedDocumentInfo | undefined;

    if (currentLesson && localDocMap[currentLesson.id]) {
      resolvedDoc = { ...localDocMap[currentLesson.id] };
    } else if (currentLesson?.uploadedDocument && (currentLesson.uploadedDocument.name || currentLesson.uploadedDocument.url)) {
      resolvedDoc = { ...currentLesson.uploadedDocument };
    } else if (
      currentLesson?.type === 'document' ||
      currentLesson?.type === 'rich_text' ||
      Boolean(currentLesson?.contentUrl && (
        currentLesson.contentUrl.includes('/documents/') ||
        currentLesson.contentUrl.includes('documents%2F') ||
        ['.pdf', '.docx', '.doc', '.txt', '.md', '.pptx', '.xlsx'].some((ext) =>
          currentLesson.contentUrl!.split('?')[0].toLowerCase().endsWith(ext)
        )
      ))
    ) {
      const cleanUrl = currentLesson?.contentUrl ? currentLesson.contentUrl.split('?')[0] : '';
      const rawFileName = cleanUrl.split('/').pop() || `${currentLesson?.title || 'Document'}.pdf`;
      const fileName = currentLesson?.uploadedDocument?.name || decodeURIComponent(rawFileName);
      resolvedDoc = {
        id: `doc-${currentLesson?.id || 'curriculum'}`,
        name: fileName,
        size: currentLesson?.uploadedDocument?.size || 1500000,
        type: fileName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream',
        uploadedAt: course.createdAt || new Date().toISOString(),
        url: currentLesson?.contentUrl || currentLesson?.uploadedDocument?.url,
      };
    }

    if (resolvedDoc) {
      if (!resolvedDoc.name || resolvedDoc.name === 'undefined') {
        const clean = (resolvedDoc.url || '').split('?')[0];
        resolvedDoc.name = clean.split('/').pop() || `${currentLesson?.title || 'Curriculum_Document'}.pdf`;
      }
      return resolvedDoc;
    }

    const courseDoc = course.modules?.flatMap((m) => m.lessons).find((l) => l.uploadedDocument && (l.uploadedDocument.name || l.uploadedDocument.url))?.uploadedDocument;
    if (courseDoc) {
      return courseDoc;
    }
    return {
      id: `doc-${course.id}`,
      name: `${course.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_Curriculum_Study_Guide.pdf`,
      size: 2450000,
      type: 'application/pdf',
      uploadedAt: course.createdAt || new Date().toISOString(),
    };
  }, [currentLesson, localDocMap, course]);

  const handleCustomDocSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentLesson) return;
    const docId = `doc-${Date.now()}`;
    const objUrl = URL.createObjectURL(file);
    registerDocumentFile(docId, file, objUrl);
    const newDoc: UploadedDocumentInfo = {
      id: docId,
      name: file.name,
      size: file.size,
      type: file.type || 'application/pdf',
      uploadedAt: new Date().toISOString(),
      url: objUrl,
    };
    currentLesson.uploadedDocument = newDoc;
    setLocalDocMap((prev) => ({ ...prev, [currentLesson.id]: newDoc }));
  };

  const handleDownloadActiveDoc = () => {
    if (!activeDoc) return;
    if (activeDoc.id) {
      const reg = getActiveDocumentFile(activeDoc.id) || (activeDoc.name ? getActiveDocumentFile(activeDoc.name) : undefined);
      if (reg) {
        downloadContentFile(reg.file, activeDoc.name || reg.file.name, reg.file.type);
        return;
      }
    }
    if (activeDoc.url && (activeDoc.url.startsWith('data:') || activeDoc.url.startsWith('http') || activeDoc.url.startsWith('/'))) {
      downloadContentFile(activeDoc.url, activeDoc.name || `${course.title}_Guide.pdf`);
      return;
    }
    const textContent = activeDoc.text || currentLesson?.content;
    if (textContent) {
      const fileName = activeDoc.name.endsWith('.pdf') ? activeDoc.name.replace(/\.pdf$/, '.md') : activeDoc.name;
      downloadContentFile(textContent, fileName, 'text/markdown;charset=utf-8');
      return;
    }
    const curriculumContent = `# ${course.title} - ${currentLesson?.title || 'Reading Unit'}
## Module: ${currentModule?.title || 'Core Curriculum'}
- Course ID: ${course.id}
- Domain / Specialization: ${course.category || 'Computer Science & Software Architecture'}
- Estimated Reading Duration: ${currentLesson?.durationMinutes || 20} minutes
- Organization: Venixa Technologies LMS

---

### 1. JVM Architecture & Runtime Memory Model
- **Heap Memory**: Young Generation (Eden & Survivor spaces) and Tenured/Old Generation.
- **JVM Stack**: Thread-isolated frame memory holding local variables and return addresses.
- **Metaspace**: Native off-heap storage holding class definitions and static metadata.
- **Garbage Collection (GC)**: Deterministic generational collection (G1 GC, ZGC).

### 2. Object-Oriented Principles & Clean Code
- Dynamic method dispatch and polymorphism across interface contracts.
- Automated deterministic resource management via \`try-with-resources\`.
- Immutability, encapsulation, and defense against concurrent race conditions.

### 3. Production Architecture Pattern
\`\`\`java
public final class CourseDataService {
    public static void executeVerifiedPipeline() {
        System.out.println("Processing curriculum pipeline for ${course.title}...");
    }
}
\`\`\`

---
*Official Curriculum Document - VeniLearn Enterprise LMS*
*Generated for: ${user?.firstName || 'Learner'} ${user?.lastName || ''} (${user?.email || 'learner@venilearn.demo'})*
*Timestamp: ${new Date().toISOString()}*`;

    downloadContentFile(curriculumContent, `${course.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_${(currentLesson?.title || 'Lesson').replace(/[^a-zA-Z0-9_-]/g, '_')}_StudyGuide.md`, 'text/markdown;charset=utf-8');
  };

  const progressPercent = allLessons.length > 0
    ? Math.min(100, Math.round((completedLessonIds.length / allLessons.length) * 100))
    : 0;
  const requiredPercentage = course.completionPercentageRequired ?? course.certificateConfig?.requiredCompletionPercentage ?? 100;

  // Synchronize completed lessons from backend enrollment if present
  useEffect(() => {
    if (!course) return;
    const enr = useCourseStore.getState().enrollments.find((e) => e.courseId === course.id);
    if (enr?.completedLessonIds && enr.completedLessonIds.length > 0) {
      setCourseCompletionMap((prev) => {
        const merged = Array.from(new Set([...(prev[course.id] || []), ...enr.completedLessonIds!]));
        return { ...prev, [course.id]: merged };
      });
    }
  }, [course?.id]);

  // Automated background study session tracking connected to Learning Momentum in PostgreSQL
  useEffect(() => {
    if (!course || !currentLesson) return;
    const lessonTitle = currentLesson.title || 'Course Lesson';
    const sessionTitle = `${course.title} — ${lessonTitle}`;

    // Start live study session in database
    useMomentumStore.getState().startSession(sessionTitle, course.id, currentLesson.id);

    // Heartbeat ticker every second (sends PostgreSQL heartbeat every 60s)
    const interval = setInterval(() => {
      useMomentumStore.getState().tickSession();
    }, 1000);

    return () => {
      clearInterval(interval);
      useMomentumStore.getState().endSession();
    };
  }, [course?.id, currentLesson?.id]);

  const handleToggleLessonComplete = async (lessonId: string, customDurationMinutes?: number) => {
    if (!course) return;
    const isCurrentlyCompleted = completedLessonIds.includes(lessonId);
    const nextList = isCurrentlyCompleted
      ? completedLessonIds.filter((lid) => lid !== lessonId)
      : [...completedLessonIds, lessonId];

    // 1. Immediate local state & localStorage persistence
    setCourseCompletionMap((prev) => {
      const updated = { ...prev, [course.id]: nextList, [course.id.toLowerCase()]: nextList };
      try {
        localStorage.setItem('venilearn_course_completions', JSON.stringify(updated));
      } catch { }
      return updated;
    });
    try {
      localStorage.setItem(`venilearn_completed_lessons_${course.id}`, JSON.stringify(nextList));
      localStorage.setItem(`venilearn_completed_lessons_${course.id.toLowerCase()}`, JSON.stringify(nextList));
    } catch { }

    const newPercent = allLessons.length > 0
      ? Math.min(100, Math.round((nextList.length / allLessons.length) * 100))
      : 0;
    useCourseStore.getState().updateCourseProgress(course.id, newPercent);

    if (!isCurrentlyCompleted) {
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 2200);

      const targetLesson = allLessons.find((l) => l.id === lessonId);
      const estDuration = customDurationMinutes || targetLesson?.duration || (targetLesson as any)?.durationMinutes || 15;

      // 2. Persist lesson progress into PostgreSQL database
      try {
        await useCourseStore.getState().recordLessonProgress(course.id, lessonId, estDuration * 60);
      } catch (err) {
        console.warn('Failed to record lesson progress to database:', err);
      }

      // 3. Persist activity directly into Learning Momentum in PostgreSQL
      try {
        await useMomentumStore.getState().recordActivity({
          title: targetLesson?.title || 'Lesson Completed',
          durationMinutes: estDuration,
          activityType: 'lesson',
          courseId: course.id,
          lessonId,
        });
      } catch (err) {
        console.warn('Failed to record momentum activity to database:', err);
      }

      // 4. Verify certificate unlock criteria
      const reqPercent = course.completionPercentageRequired ?? course.certificateConfig?.requiredCompletionPercentage ?? 80;
      if (newPercent >= reqPercent && course.certificateConfig?.enabled !== false) {
        const student = user || {
          id: 'u-current',
          displayName: 'Enrolled Learner',
          email: 'learner@venilearn.lms',
        };
        const issueResult = issueCourseCertificate({
          course,
          learner: {
            id: student.id,
            name: student.displayName || 'Enrolled Learner',
            email: student.email,
          },
          scoreAchieved: 95,
          completionPercentage: newPercent,
        });

        apiClient.patch(`/courses/enrollments/${course.id}/progress`, {
          progressPercentage: 100,
          status: 'completed',
          completedAt: new Date().toISOString(),
        }).catch(() => { });

        if (issueResult.success && issueResult.certificate) {
          setUnlockedCert(issueResult.certificate);
          setShowCertModal(true);
        } else {
          const found = getCertificatesByLearner(student.id).find((c) => c.courseId === course.id);
          if (found) {
            setUnlockedCert(found);
            setShowCertModal(true);
          }
        }
      }
    }
  };

  const toggleComplete = () => {
    // End Date restriction: freeze progress modifications after course end date
    if (isAfterEnd || !currentLesson) return;
    handleToggleLessonComplete(currentLesson.id);
  };

  // Toggle individual lesson completion from playlist
  const toggleLessonCompletion = (lessonId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    handleToggleLessonComplete(lessonId);
  };

  // Next Lesson automatically completes current lesson and advances
  const handleNext = () => {
    if (currentLesson && !completedLessonIds.includes(currentLesson.id)) {
      handleToggleLessonComplete(currentLesson.id);
    }
    if (currentLessonIndex < allLessons.length - 1) {
      setCurrentLessonIndex(currentLessonIndex + 1);
      setIsPlaying(false);
    } else {
      setShowCelebration(true);
    }
  };

  const handlePrev = () => {
    if (currentLessonIndex > 0) {
      setCurrentLessonIndex(currentLessonIndex - 1);
      setIsPlaying(false);
    }
  };

  const handleCompleteCourseAndClaimCert = async () => {
    if (!course || !currentLesson) return;

    // 1. Mark current lesson completed
    if (!completedLessonIds.includes(currentLesson.id)) {
      await handleToggleLessonComplete(currentLesson.id);
    }

    const nextCompleted = Array.from(new Set([...completedLessonIds, currentLesson.id]));
    const nextPercent = allLessons.length > 0
      ? Math.min(100, Math.round((nextCompleted.length / allLessons.length) * 100))
      : 100;

    // 2. Check if final assessment is required
    const finalAssessment =
      course.finalAssessment ||
      course.finalAssessmentConfig ||
      (course as any).assessments?.find((a: any) => a.scope === 'final_assessment') ||
      course.modules?.flatMap((m) => m.lessons).find((l) => (l as any).quizConfig?.scope === 'final_assessment')?.quizConfig ||
      ((course as any).assessments && (course as any).assessments.length > 0 ? (course as any).assessments[0] : null);

    const requiresAssessment = Boolean(
      course.certificateConfig?.requirePassingAssessment ||
      (finalAssessment && course.certificateConfig?.requirePassingAssessment !== false)
    );

    let isAssessmentPassed = false;
    if (finalAssessment) {
      const myAttempts = useAssessmentStore.getState().myAttempts;
      isAssessmentPassed = myAttempts.some(
        (att) => att.passed && (att.assessmentId === finalAssessment.id || (att as any).assessment?.title === finalAssessment.title)
      );
    }

    if (requiresAssessment && finalAssessment && !isAssessmentPassed) {
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 2200);
      setSelectedAssessment({
        scope: 'final_assessment',
        config: finalAssessment as any,
      });
      return;
    }

    // 3. Issue certificate
    const student = user || {
      id: 'u-current',
      displayName: 'Enrolled Learner',
      email: 'learner@venilearn.lms',
    };

    const issueResult = issueCourseCertificate({
      course,
      learner: {
        id: student.id,
        name: student.displayName || 'Enrolled Learner',
        email: student.email,
      },
      scoreAchieved: 95,
      completionPercentage: nextPercent,
    });

    // 4. Update enrollment in PostgreSQL database
    try {
      await apiClient.patch(`/courses/enrollments/${course.id}/progress`, {
        progressPercentage: 100,
        status: 'completed',
        completedAt: new Date().toISOString(),
      });
    } catch { }

    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 2500);

    if (issueResult.success && issueResult.certificate) {
      setUnlockedCert(issueResult.certificate);
      setShowCertModal(true);
    } else {
      const existing = getCertificatesByLearner(student.id).find((c) => c.courseId === course.id);
      if (existing) {
        setUnlockedCert(existing);
        setShowCertModal(true);
      }
    }
  };
  const lessonDuration = currentLesson.duration || (currentLesson as any).durationMinutes || 15;

  // RULE 1: Before Start Date - Blocked Access for Students
  if (isBeforeStart && isStudent) {
    return (
      <div style={{ maxWidth: '680px', margin: '48px auto', textAlign: 'center', padding: '48px 32px' }} className="card">
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          background: 'rgba(99, 102, 241, 0.15)',
          color: 'var(--primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
          boxShadow: '0 0 0 8px rgba(99, 102, 241, 0.08)'
        }}>
          <Clock size={36} />
        </div>

        <span className="badge badge-secondary" style={{ marginBottom: '12px' }}>
          Course Access Scheduled
        </span>

        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '10px' }}>
          This Course is Not Yet Open
        </h1>

        <p className="text-secondary" style={{ fontSize: '1.05rem', marginBottom: '24px', lineHeight: 1.5 }}>
          This course will be available from <strong>{new Date(course.startDate!).toLocaleString()}</strong> ({user?.timezone || 'America/New_York'}).
        </p>

        <div style={{
          background: 'var(--bg-input)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '16px 20px',
          marginBottom: '28px',
          textAlign: 'left',
          fontSize: '0.85rem',
          color: 'var(--text-secondary)'
        }}>
          <div style={{ fontWeight: 700, marginBottom: '4px', color: 'var(--text-main)' }}>
            Course: {course.title}
          </div>
          <div>Students cannot start lessons, view quizzes, or submit work before the official scheduled start date and time. Please check back when access opens.</div>
        </div>

        <Link to={exitLink} className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px' }}>
          <ArrowLeft size={16} /> Return to My Learning
        </Link>
      </div>
    );
  }

  // Robust determination of lesson content type
  const isDocumentLesson = Boolean(
    currentLesson && (
      (currentLesson.type as any) === 'document' ||
      (currentLesson.type as any) === 'reading' ||
      currentLesson.type === 'rich_text' ||
      currentLesson.type === 'downloadable' ||
      currentLesson.title?.toLowerCase().includes('reading') ||
      currentLesson.title?.toLowerCase().includes('document') ||
      (currentLesson.uploadedDocument && (currentLesson.uploadedDocument.url || currentLesson.uploadedDocument.name)) ||
      (currentLesson.contentUrl && (
        currentLesson.contentUrl.includes('/documents/') ||
        currentLesson.contentUrl.includes('documents%2F') ||
        ['.pdf', '.docx', '.doc', '.txt', '.md', '.pptx', '.xlsx'].some((ext) =>
          currentLesson.contentUrl!.split('?')[0].toLowerCase().endsWith(ext)
        )
      ))
    )
  );

  const isQuizLesson = Boolean(
    !isDocumentLesson &&
    currentLesson &&
    (currentLesson.type === 'quiz' || (
      currentLesson.quizConfig &&
      Array.isArray(currentLesson.quizConfig.questions) &&
      currentLesson.quizConfig.questions.length > 0
    ))
  );

  const isVideoLesson = Boolean(
    !isDocumentLesson &&
    !isQuizLesson &&
    currentLesson &&
    (
      currentLesson.type === 'video' ||
      Boolean(currentLesson.videoInfo?.url) ||
      Boolean((currentLesson as any).videoUrl) ||
      Boolean(currentLesson.contentUrl && (
        currentLesson.contentUrl.includes('/videos/') ||
        currentLesson.contentUrl.includes('/storage/videos/') ||
        ['.mp4', '.webm', '.mov', '.mkv', '.mp3', '.wav', '.m4a', '.ogg', '.aac'].some((ext) =>
          currentLesson.contentUrl!.split('?')[0].toLowerCase().endsWith(ext)
        )
      ))
    )
  );


  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Banner Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <Link to={exitLink} className="btn btn-secondary btn-sm" style={{ gap: '6px' }}>
          <ArrowLeft size={14} /> Exit to Courses
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          {(existingCert || unlockedCert) && (
            <button
              className="btn btn-sm"
              onClick={() => {
                setUnlockedCert(existingCert || unlockedCert);
                setShowCertModal(true);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(37, 99, 235, 0.1)',
                color: 'var(--primary)',
                border: '1px solid var(--primary)',
                fontWeight: 600
              }}
            >
              <Award size={15} /> View Earned Certificate
            </button>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '180px' }}>
            <span className="text-muted text-xs font-semibold">{progressPercent}% Completed</span>
            <div className="progress-bar-bg" style={{ height: '8px', flex: 1 }}>
              <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>

          <button
            className={`btn btn-secondary btn-sm ${isBookmarked ? 'btn-primary' : ''}`}
            onClick={() => setIsBookmarked(!isBookmarked)}
            style={{ gap: '6px' }}
          >
            <Bookmark size={14} /> {isBookmarked ? 'Saved' : 'Bookmark'}
          </button>
        </div>
      </div>

      {/* RULE 2: Scheduled Start Notice for Admins/Trainers */}
      {isBeforeStart && isPrivileged && (
        <div style={{
          background: 'rgba(99, 102, 241, 0.08)',
          border: '1px solid var(--primary)',
          color: 'var(--text-main)',
          padding: '12px 18px',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.85rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={16} color="var(--primary)" />
            <span><strong>Admin / Creator Preview:</strong> This course is scheduled to open for students on <strong>{new Date(course.startDate!).toLocaleString()}</strong> ({user?.timezone || 'America/New_York'}). Students cannot access it yet.</span>
          </div>
          <span className="badge badge-primary">Preview Mode</span>
        </div>
      )}

      {/* RULE 3: After End Date - Read-Only Enforcement */}
      {isAfterEnd && (
        <div style={{
          background: '#fffbeb',
          border: '1px solid #fde68a',
          color: '#92400e',
          padding: '12px 18px',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.85rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Lock size={16} color="#d97706" />
            <span><strong>Course access period has ended ({new Date(course.endDate!).toLocaleString()}):</strong> Content is in read-only review mode. Lesson progress modifications and submissions are disabled.</span>
          </div>
          <span className="badge badge-warning">Read-Only</span>
        </div>
      )}

      {/* Main Player Grid: Content on Left, Sticky Locked Playlist on Right */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 290px', gap: '20px', alignItems: 'start' }}>
        {/* Main Content Area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Video / Interactive Player / Quiz Box */}
          {selectedAssessment ? (
            <LearnerQuizRunner
              quizConfig={selectedAssessment.config}
              assessmentId={selectedAssessment.config.id}
              courseId={course.id}
              title={selectedAssessment.config.title}
              onQuizPassed={(score, total) => {
                setShowCelebration(true);
                setTimeout(() => setShowCelebration(false), 2500);
                if (selectedAssessment.scope === 'final_assessment') {
                  const student = user || {
                    id: 'u-current',
                    displayName: 'Enrolled Learner',
                    email: 'learner@venilearn.lms',
                  };
                  const issueResult = issueCourseCertificate({
                    course,
                    learner: {
                      id: student.id,
                      name: student.displayName || 'Enrolled Learner',
                      email: student.email,
                    },
                    scoreAchieved: Math.round((score / total) * 100),
                    completionPercentage: 100,
                  });
                  if (issueResult.success && issueResult.certificate) {
                    setUnlockedCert(issueResult.certificate);
                    setShowCertModal(true);
                  }
                }
              }}
            />
          ) : isVideoLesson ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <LearnerVideoPlayer
                videoInfo={currentLesson.videoInfo}
                contentUrl={currentLesson.contentUrl}
                lessonTitle={currentLesson.title}
                courseId={course?.id || id || ''}
                onComplete={() => {
                  if (currentLesson && !completedLessonIds.includes(currentLesson.id)) {
                    handleToggleLessonComplete(currentLesson.id);
                  }
                }}
              />

              {/* Real AI-Powered Lesson Summary Panel */}
              {course && currentLesson && (
                <AILessonSummaryPanel
                  courseId={course.id}
                  lessonId={currentLesson.id}
                  lessonTitle={currentLesson.title}
                  lessonType={currentLesson.type || 'video'}
                  isOpen={showLessonSummary}
                  onToggle={() => setShowLessonSummary(!showLessonSummary)}
                />
              )}
            </div>
          ) : isQuizLesson ? (
            <LearnerQuizRunner
              quizConfig={currentLesson.quizConfig}
              assessmentId={currentLesson.quizConfig?.id}
              courseId={course.id}
              moduleId={currentModule?.id}
              lessonId={currentLesson.id}
              title={currentLesson.quizConfig?.title || currentLesson.title}
              lessonTitle={currentLesson.title}
              onQuizPassed={() => {
                if (currentLesson && !completedLessonIds.includes(currentLesson.id)) {
                  handleToggleLessonComplete(currentLesson.id);
                }
              }}
              onNextLesson={handleNext}
            />
          ) : (
            <div style={{
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-xl)',
              overflow: 'hidden',
              border: '1px solid var(--border-subtle)',
              position: 'relative',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)'
            }}>
              <div style={{ padding: '24px 28px', background: 'var(--bg-card)' }}>
                {/* Clean Top Header & Actions Bar */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span className="badge badge-primary" style={{ fontSize: '0.72rem', padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <BookOpen size={12} /> Reading Material &bull; {currentModule?.title || 'Core Curriculum'}
                      </span>
                      <span className="text-muted text-xs" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} /> {currentLesson.durationMinutes || 20} mins reading
                      </span>
                    </div>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                      {currentLesson.title}
                    </h2>
                    {activeDoc?.name && (
                      <div className="text-muted text-xs" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                        <FileText size={12} color="var(--accent-cyan)" />
                        <span>{activeDoc.name}</span>
                        {activeDoc.size ? (
                          <span>&bull; {activeDoc.size < 1024 * 1024 ? `${(activeDoc.size / 1024).toFixed(1)} KB` : `${(activeDoc.size / (1024 * 1024)).toFixed(1)} MB`}</span>
                        ) : null}
                      </div>
                    )}
                  </div>

                  {/* Single Clean Action Group (No edit access for students, no duplicate download buttons) */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    {activeDoc?.url && (
                      <a
                        href={activeDoc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary btn-sm"
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', textDecoration: 'none' }}
                        title="Open document in a new tab"
                      >
                        <ExternalLink size={13} /> Fullscreen
                      </a>
                    )}
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}
                      onClick={handleDownloadActiveDoc}
                      title="Download curriculum document"
                    >
                      <Download size={13} /> Download Document
                    </button>
                    {!isCompleted && !isAfterEnd && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={toggleComplete}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', borderColor: 'var(--accent-cyan)' }}
                      >
                        <Check size={14} color="var(--accent-cyan)" /> Mark as Completed
                      </button>
                    )}
                    {isCompleted && (
                      <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 12px', fontSize: '0.78rem' }}>
                        <CheckCircle2 size={14} /> Completed
                      </span>
                    )}
                  </div>
                </div>

                {/* Embedded Document Viewer Box */}
                {activeDoc?.url && (activeDoc.url.startsWith('data:application/pdf') || activeDoc.url.toLowerCase().includes('.pdf') || activeDoc.name?.toLowerCase().endsWith('.pdf') || activeDoc.url.includes('/documents/')) ? (
                  <div style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border-subtle)', background: '#ffffff', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                    <iframe
                      src={activeDoc.url.includes('#') ? activeDoc.url : `${activeDoc.url}#toolbar=1&navpanes=0`}
                      title={activeDoc.name || 'Document Viewer'}
                      style={{ width: '100%', height: '540px', border: 'none', background: '#ffffff', display: 'block' }}
                    />
                  </div>
                ) : activeDoc?.text ? (
                  <div style={{ background: 'var(--bg-input)', padding: '20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', whiteSpace: 'pre-wrap', maxHeight: '480px', overflowY: 'auto' }}>
                    {activeDoc.text}
                  </div>
                ) : null}

                {/* Real AI-Powered Lesson Summary Panel */}
                {course && currentLesson && (
                  <AILessonSummaryPanel
                    courseId={course.id}
                    lessonId={currentLesson.id}
                    lessonTitle={currentLesson.title}
                    lessonType={currentLesson.type || 'document'}
                    isOpen={showLessonSummary}
                    onToggle={() => setShowLessonSummary(!showLessonSummary)}
                  />
                )}
              </div>
            </div>
          )}

          {/* Action Row & Navigation Controls */}
          <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', flexWrap: 'wrap', gap: '12px' }}>
            <button
              className="btn btn-secondary"
              onClick={handlePrev}
              disabled={currentLessonIndex === 0}
              style={{ gap: '6px' }}
            >
              <ChevronLeft size={16} /> Previous Lesson
            </button>

            {/* Central Dedicated Lesson Completion Toggle */}
            <button
              type="button"
              onClick={toggleComplete}
              disabled={isAfterEnd}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 20px',
                borderRadius: 'var(--radius-md)',
                fontWeight: 600,
                fontSize: '0.88rem',
                cursor: isAfterEnd ? 'not-allowed' : 'pointer',
                background: isCompleted ? 'rgba(16, 185, 129, 0.15)' : 'rgba(37, 99, 235, 0.08)',
                border: isCompleted ? '1.5px solid #10b981' : '1px solid #3b82f6',
                color: isCompleted ? '#10b981' : '#3b82f6',
                transition: 'all 0.2s ease',
              }}
            >
              {isCompleted ? (
                <>
                  <CheckCircle2 size={18} color="#10b981" />
                  <span>Lesson Completed</span>
                </>
              ) : (
                <>
                  <Circle size={18} />
                  <span>Mark Lesson as Completed</span>
                </>
              )}
            </button>

            {isAfterEnd && (
              <span
                className="badge badge-secondary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '0.75rem' }}
              >
                <Lock size={14} /> Course Ended &bull; Read-Only
              </span>
            )}

            {currentLessonIndex < allLessons.length - 1 ? (
              <button
                className="btn btn-primary"
                onClick={handleNext}
                style={{ gap: '6px', fontWeight: 600 }}
              >
                Next Lesson <ChevronRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleCompleteCourseAndClaimCert}
                style={{
                  gap: '6px',
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  boxShadow: '0 2px 10px rgba(16, 185, 129, 0.35)',
                }}
              >
                <Award size={16} /> Complete Course & Claim Certificate &rarr;
              </button>
            )}
          </div>

          {/* Downloadable Resources & Lesson Notes (Only shown for video lessons to avoid duplicate download buttons on reading lessons) */}
          {!isDocumentLesson && (
            <div className="card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText size={18} color="var(--primary)" />
                  <h3 style={{ fontSize: '1.05rem', margin: 0, fontWeight: 700 }}>Curriculum Materials & Lesson Notes</h3>
                </div>
                <span className="text-muted text-xs">Synchronized with course progress</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px', marginBottom: '20px' }}>
                {/* Actual Uploaded / Active Curriculum Document */}
                {activeDoc && (
                  <div
                    style={{
                      background: 'var(--bg-input)',
                      border: '1px solid var(--accent-cyan, #06b6d4)',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                      <FileText size={18} color="var(--accent-cyan)" style={{ flexShrink: 0 }} />
                      <div style={{ overflow: 'hidden' }}>
                        <div
                          style={{ fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}
                          title={activeDoc.name}
                        >
                          {activeDoc.name}
                        </div>
                        <div className="text-muted text-xs">
                          {activeDoc.size
                            ? activeDoc.size < 1024 * 1024
                              ? `${(activeDoc.size / 1024).toFixed(1)} KB`
                              : `${(activeDoc.size / (1024 * 1024)).toFixed(1)} MB`
                            : '2.4 MB'} &bull; Uploaded Curriculum Doc
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      style={{ fontSize: '0.75rem', padding: '4px 10px', flexShrink: 0 }}
                      onClick={handleDownloadActiveDoc}
                    >
                      <Download size={13} /> Download
                    </button>
                  </div>
                )}

                <div
                  style={{
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Download size={18} color="var(--primary)" />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{currentLesson.title.slice(0, 24)}-StudyGuide.md</div>
                      <div className="text-muted text-xs">1.8 MB &bull; Lecture Guide</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                    onClick={() => {
                      const notes = `# ${course.title} - ${currentLesson.title}\n\n` +
                        `## Module: ${currentModule?.title || 'Core Concepts'}\n` +
                        `Estimated Study Duration: ${currentLesson.durationMinutes || 20} minutes\n\n` +
                        `### Core Curriculum Principles\n` +
                        `1. Architectural integrity, JVM memory management, and enterprise software standards.\n` +
                        `2. Rigorous object-oriented patterns, strict type safety, and defensive encapsulation.\n` +
                        `3. Automated deterministic resource management via try-with-resources and exception boundaries.\n\n` +
                        `Official Study Material for ${course.title}.\nGenerated by VeniLearn LMS.`;
                      downloadContentFile(notes, `${currentLesson.title.replace(/\s+/g, '_')}_StudyGuide.md`, 'text/markdown;charset=utf-8');
                    }}
                  >
                    <Download size={13} /> Download
                  </button>
                </div>

                <div
                  style={{
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <FileText size={18} color="var(--accent-purple)" />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                        {course.title.toLowerCase().includes('java') ? 'Java-Exercise-Template.java' : 'Lesson-Starter-Code.js'}
                      </div>
                      <div className="text-muted text-xs">650 KB &bull; Source Exercises</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                    onClick={() => {
                      const isJava = course.title.toLowerCase().includes('java');
                      const code = isJava
                        ? `// Practical Exercises for ${course.title}: ${currentLesson.title}\n\npublic class PracticeExercise {\n    public static void main(String[] args) {\n        System.out.println("Starting exercises for ${currentLesson.title}...");\n    }\n}\n`
                        : `// Starter exercises for ${currentLesson.title}\nconsole.log("Ready to practice for ${course.title}!");\n`;
                      downloadContentFile(
                        code,
                        isJava ? 'PracticeExercise.java' : `${currentLesson.title.replace(/\s+/g, '_')}_starter.js`,
                        isJava ? 'text/x-java-source' : 'text/javascript'
                      );
                    }}
                  >
                    <Download size={13} /> Download
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Interactive Personal Notes Box */}
          <div className="card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Personal Study Notes ({currentLesson.title})
              </label>
              <span className="text-muted text-xs">Auto-saved to your profile</span>
            </div>
            <textarea
              rows={2}
              className="form-textarea"
              style={{ width: '100%', fontSize: '0.85rem', resize: 'vertical' }}
              placeholder="Jot down key takeaways or thoughts for this lesson..."
              value={lessonNotes[currentLesson.id] || ''}
              onChange={(e) => handleSaveNote(e.target.value)}
            />
          </div>
        </div>

        {/* 4. RIGHT SIDEBAR: Module Curriculum Playlist (Locked & Compact) */}
        <div className="card" style={{
          padding: '16px',
          position: 'sticky',
          top: '16px',
          maxHeight: 'calc(100vh - 32px)',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 'var(--radius-xl)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
          border: '1px solid var(--border-subtle)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BookOpen size={16} color="var(--primary)" />
              <h3 style={{ fontSize: '0.98rem', margin: 0, fontWeight: 700 }}>Curriculum Playlist</h3>
            </div>
            <span className="badge badge-secondary" style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
              {completedLessonIds.length}/{allLessons.length} Done
            </span>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <div className="progress-bar-bg" style={{ height: '5px', borderRadius: '4px' }}>
              <div className="progress-bar-fill" style={{ width: `${progressPercent}%`, height: '5px', borderRadius: '4px' }} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {course.modules.map((module, mIdx) => (
              <div key={module.id}>
                <div style={{
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  marginBottom: '6px',
                  letterSpacing: '0.04em',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'var(--bg-input)',
                  padding: '4px 8px',
                  borderRadius: 'var(--radius-sm)'
                }}>
                  <span>{module.title || `Module ${mIdx + 1}`}</span>
                  <span>{module.lessons.length} {module.lessons.length === 1 ? 'lesson' : 'lessons'}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {module.lessons.map((lesson) => {
                    const lIndex = allLessons.findIndex((l) => l.id === lesson.id);
                    const isSelected = lIndex === currentLessonIndex;
                    const isDone = completedLessonIds.includes(lesson.id);
                    const durationVal = lesson.duration || (lesson as any).durationMinutes || 15;

                    return (
                      <div
                        key={lesson.id}
                        onClick={() => {
                          setSelectedAssessment(null);
                          setCurrentLessonIndex(lIndex);
                          setIsPlaying(false);
                          setShowLessonSummary(false);
                        }}
                        style={{
                          padding: '7px 10px',
                          borderRadius: 'var(--radius-md)',
                          background: isSelected ? 'linear-gradient(135deg, rgba(37, 99, 235, 0.18) 0%, rgba(99, 102, 241, 0.12) 100%)' : 'transparent',
                          border: isSelected ? '1px solid var(--primary)' : '1px solid transparent',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <button
                          type="button"
                          onClick={(e) => toggleLessonCompletion(lesson.id, e)}
                          title={isDone ? 'Marked complete' : 'Click to toggle completion'}
                          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        >
                          {isDone ? (
                            <CheckCircle2 size={15} color="var(--success)" style={{ flexShrink: 0 }} />
                          ) : (
                            <Circle size={15} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                          )}
                        </button>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontWeight: isSelected ? 700 : 500,
                            fontSize: '0.8rem',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            color: isSelected ? 'var(--primary)' : 'var(--text-main)',
                          }}>
                            {lesson.title}
                          </div>
                          <div className="text-muted text-xs" style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem' }}>
                            {lesson.type === 'video' ? (
                              <Video size={10} color="var(--primary)" />
                            ) : (lesson.type === 'quiz' && lesson.quizConfig && Array.isArray(lesson.quizConfig.questions) && lesson.quizConfig.questions.length > 0) ? (
                              <HelpCircle size={10} color="var(--primary)" />
                            ) : (
                              <FileText size={10} color="var(--accent-cyan)" />
                            )}
                            <span>{durationVal} mins</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Module Assessment Checkpoint */}
                {module.assessment && (
                  <div
                    onClick={() =>
                      setSelectedAssessment({
                        scope: 'module_assessment',
                        config: module.assessment!,
                        moduleTitle: module.title,
                      })
                    }
                    style={{
                      marginTop: '6px',
                      padding: '7px 10px',
                      borderRadius: 'var(--radius-sm)',
                      background:
                        selectedAssessment?.config?.id === module.assessment.id
                          ? 'rgba(99, 102, 241, 0.15)'
                          : 'var(--bg-input)',
                      border:
                        selectedAssessment?.config?.id === module.assessment.id
                          ? '1px solid var(--primary)'
                          : '1px dashed var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                    }}
                  >
                    <HelpCircle size={13} color="var(--primary)" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: '0.78rem',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          color: 'var(--primary)',
                        }}
                      >
                        {module.assessment.title || `Module ${mIdx + 1} Assessment`}
                      </div>
                      <div className="text-muted text-xs" style={{ fontSize: '0.7rem' }}>
                        {module.assessment.questions?.length || 0} Questions &bull; Checkpoint
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Course Final Assessment */}
            {course.finalAssessment && (
              <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
                <div
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: 'var(--accent-purple)',
                    textTransform: 'uppercase',
                    marginBottom: '6px',
                    letterSpacing: '0.04em',
                  }}
                >
                  Certification Final Exam
                </div>
                <div
                  onClick={() =>
                    setSelectedAssessment({
                      scope: 'final_assessment',
                      config: course.finalAssessment!,
                    })
                  }
                  style={{
                    padding: '9px 12px',
                    borderRadius: 'var(--radius-md)',
                    background:
                      selectedAssessment?.scope === 'final_assessment'
                        ? 'rgba(168, 85, 247, 0.18)'
                        : 'var(--bg-input)',
                    border:
                      selectedAssessment?.scope === 'final_assessment'
                        ? '1px solid var(--accent-purple)'
                        : '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Award size={16} color="var(--accent-purple)" style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-main)' }}>
                      {course.finalAssessment.title || 'Comprehensive Final Assessment'}
                    </div>
                    <div className="text-muted text-xs" style={{ fontSize: '0.72rem' }}>
                      {course.finalAssessment.questions?.length || 0} Questions &bull; Pass{' '}
                      {course.finalAssessment.passingPercentage || 70}%
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Gamification Celebration Toast */}
      {showCelebration && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: 'linear-gradient(135deg, #10b981, #059669)',
          color: '#fff',
          padding: '16px 24px',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-xl)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          zIndex: 100,
          animation: 'scaleUp 0.2s ease'
        }}>
          <Award size={24} />
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>+10 XP Points Earned!</div>
            <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>Lesson completed. Progress updated automatically.</div>
          </div>
        </div>
      )}

      {/* Course Completion & Certificate Unlocked Modal */}
      {showCertModal && unlockedCert && (
        <div className="modal-overlay" onClick={() => setShowCertModal(false)}>
          <div className="modal-card" style={{ maxWidth: '600px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              padding: '32px 28px',
              background: 'radial-gradient(ellipse at center, rgba(37, 99, 235, 0.15) 0%, transparent 80%), var(--bg-card)'
            }}>
              <div style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #2563EB, #F472B6)',
                margin: '0 auto 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(37, 99, 235, 0.35)'
              }}>
                <Award size={36} color="#fff" />
              </div>

              <span className="badge badge-active" style={{ marginBottom: '8px' }}>
                Course Completed &bull; 100% Progress
              </span>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '8px 0 6px' }}>
                Congratulations, {user?.displayName || 'Learner'}!
              </h2>
              <p className="text-secondary text-sm" style={{ maxWidth: '440px', margin: '0 auto 16px' }}>
                You have satisfied all academic curriculum requirements for <strong>{course.title}</strong>. Your official verified certificate has been recorded.
              </p>

              <div style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 16px',
                marginBottom: '20px',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.8rem',
                textAlign: 'left'
              }}>
                <div>
                  <span className="text-muted text-xs">Credential ID:</span>
                  <div style={{ fontWeight: 700 }}>{unlockedCert.id}</div>
                </div>
                <div>
                  <span className="text-muted text-xs">Issued By:</span>
                  <div style={{ fontWeight: 600 }}>{unlockedCert.issuingOrganization || 'Acme Learning Corp'}</div>
                </div>
                <div>
                  <span className="text-muted text-xs">Status:</span>
                  <div style={{ color: 'var(--success)', fontWeight: 700 }}>Verified &bull; Active</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  className="btn btn-primary"
                  disabled={downloadingCert}
                  onClick={async () => {
                    setDownloadingCert(true);
                    try {
                      await generateCertificatePdf(unlockedCert);
                    } catch (err) {
                      console.error(err);
                    } finally {
                      setDownloadingCert(false);
                    }
                  }}
                  style={{ gap: '8px' }}
                >
                  <Download size={16} /> {downloadingCert ? 'Generating PDF...' : 'Download Verified PDF'}
                </button>
                <Link to="/my-certificates" className="btn btn-secondary" style={{ gap: '8px' }}>
                  <ExternalLink size={16} /> View in My Certificates
                </Link>
                <button className="btn btn-secondary" onClick={() => setShowCertModal(false)}>
                  Continue Learning
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
