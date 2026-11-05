import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuthStore } from '../../lib/store';
import { useCourseStore } from '../../lib/courseStore';
import { useCertificateStore } from '../../lib/certificateStore';
import { useMomentumStore } from '../../lib/momentumStore';
import { apiClient } from '../../lib/apiClient';
import { generateCertificatePdf } from '../../lib/certificatePdf';
import { Certificate, QuizAssessmentConfig, UploadedDocumentInfo } from '../../types';
import { LearnerVideoPlayer } from './components/LearnerVideoPlayer';
import { LearnerQuizRunner } from './components/LearnerQuizRunner';
import {
  ArrowLeft, CheckCircle2, Circle, Play, FileText, Download,
  ChevronRight, ChevronLeft, Bookmark, Share2, Sparkles, Award,
  ShieldCheck, X, ExternalLink, Clock, Lock, AlertTriangle, Eye,
  Pause, Video, HelpCircle, BookOpen, Check, Layers, Code,
  Upload, Printer, RefreshCw
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
      if (content.startsWith('data:') || content.startsWith('blob:') || content.startsWith('http://') || content.startsWith('https://')) {
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
      } catch {}
    }, 2500);
  } catch (err) {
    console.error('Download error:', err);
  }
}

export const LearnerCoursePlayerPage: React.FC = () => {
  const { user } = useAuthStore();
  const { courses } = useCourseStore();
  const { issueCourseCertificate, getCertificatesByLearner } = useCertificateStore();
  const { id } = useParams<{ id: string }>();

  // Resolve course from store
  const course = courses.find((c) => c.id === id);
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
    } catch {}
    return {};
  });

  const completedLessonIds = useMemo(() => {
    if (!course) return [];
    if (courseCompletionMap[course.id] && courseCompletionMap[course.id].length > 0) {
      return courseCompletionMap[course.id];
    }
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(`venilearn_completed_lessons_${course.id}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) return parsed;
        }
      }
    } catch {}
    return [];
  }, [course?.id, courseCompletionMap]);

  const persistCompletions = (nextList: string[]) => {
    if (!course) return;
    setCourseCompletionMap((prev) => {
      const updated = { ...prev, [course.id]: nextList };
      try {
        localStorage.setItem('venilearn_course_completions', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    try {
      localStorage.setItem(`venilearn_completed_lessons_${course.id}`, JSON.stringify(nextList));
    } catch {}
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
  const isStudent = user?.activeRole === 'student' || user?.activeRole === 'learner';
  const isPrivileged = !isStudent; // Admins and Trainers
  const exitLink = isStudent ? '/my-learning' : '/courses';

  const currentLesson = allLessons[currentLessonIndex] || allLessons[0];
  const isCompleted = currentLesson ? completedLessonIds.includes(currentLesson.id) : false;

  // Find module containing current lesson
  const currentModule = course.modules.find((m) => m.lessons.some((l) => l.id === currentLesson?.id)) || course.modules[0];
  const currentModuleIndex = course.modules.findIndex((m) => m.id === currentModule?.id);

  // Active document resolution for reading material
  const activeDoc: UploadedDocumentInfo = useMemo(() => {
    if (currentLesson && localDocMap[currentLesson.id]) {
      return localDocMap[currentLesson.id];
    }
    if (currentLesson?.uploadedDocument) {
      return currentLesson.uploadedDocument;
    }
    const courseDoc = course.modules?.flatMap((m) => m.lessons).find((l) => l.uploadedDocument)?.uploadedDocument;
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
      const updated = { ...prev, [course.id]: nextList };
      try {
        localStorage.setItem('venilearn_course_completions', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    try {
      localStorage.setItem(`venilearn_completed_lessons_${course.id}`, JSON.stringify(nextList));
    } catch {}

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

        if (issueResult.success && issueResult.certificate) {
          setUnlockedCert(issueResult.certificate);
          setShowCertModal(true);
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

      {/* Main Player Grid: Content on Left (75%), Curriculum on Right (25%) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px' }}>
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
          ) : currentLesson.type === 'video' ? (
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
          ) : currentLesson.type === 'quiz' || Boolean(currentLesson.quizConfig) ? (
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
              position: 'relative'
            }}>
              <div style={{ padding: '32px 36px', minHeight: '420px', background: 'var(--bg-card)' }}>
                {/* Header & Meta Bar */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span className="badge badge-primary" style={{ fontSize: '0.72rem', padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <BookOpen size={12} /> Reading Material &bull; {currentModule?.title || 'Core Curriculum'}
                      </span>
                      <span className="text-muted text-xs" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} /> {currentLesson.durationMinutes || 20} mins reading
                      </span>
                    </div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                      {currentLesson.title}
                    </h2>
                  </div>

                  {!isCompleted && !isAfterEnd && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={toggleComplete}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', borderColor: 'var(--accent-cyan)' }}
                    >
                      <Check size={14} color="var(--accent-cyan)" /> Mark Reading as Completed
                    </button>
                  )}
                  {isCompleted && (
                    <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 12px', fontSize: '0.78rem' }}>
                      <CheckCircle2 size={14} /> Completed
                    </span>
                  )}
                </div>

                {/* Hidden Local Document Picker for Reading Lesson */}
                <input
                  type="file"
                  ref={docFileInputRef}
                  accept=".pdf,.doc,.docx,.txt,.md,.java,.json"
                  onChange={handleCustomDocSelect}
                  style={{ display: 'none' }}
                />

                {/* Attached Document Card (Always available for reading materials) */}
                {activeDoc && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '16px 20px',
                      borderRadius: 'var(--radius-lg)',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-subtle)',
                      marginBottom: '24px',
                      flexWrap: 'wrap',
                      gap: '14px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
                      <div
                        style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '10px',
                          background: 'rgba(6, 182, 212, 0.12)',
                          color: 'var(--accent-cyan)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <FileText size={22} />
                      </div>
                      <div style={{ minWidth: 0, overflow: 'hidden' }}>
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: '0.95rem',
                            color: 'var(--text-main)',
                            wordBreak: 'break-all',
                          }}
                          title={activeDoc.name}
                        >
                          {activeDoc.name}
                        </div>
                        <div className="text-muted text-xs" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px', flexWrap: 'wrap' }}>
                          <span>
                            {activeDoc.size
                              ? activeDoc.size < 1024 * 1024
                                ? `${(activeDoc.size / 1024).toFixed(1)} KB`
                                : `${(activeDoc.size / (1024 * 1024)).toFixed(1)} MB`
                              : '2.4 MB'}
                          </span>
                          <span>&bull;</span>
                          <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>Verified Curriculum Source</span>
                          <span>&bull;</span>
                          <span>Ready for Offline Study</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => docFileInputRef.current?.click()}
                        className="btn btn-secondary btn-sm"
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}
                        title="Upload or replace with a local document from your computer"
                      >
                        <Upload size={13} /> Choose / Replace Doc
                      </button>

                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="btn btn-secondary btn-sm"
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}
                        title="Print or save as PDF"
                      >
                        <Printer size={13} /> Print / Save PDF
                      </button>

                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}
                        onClick={handleDownloadActiveDoc}
                      >
                        <Download size={13} /> Download Document
                      </button>
                    </div>
                  </div>
                )}

                {/* Embedded Document Viewer if URL is available */}
                {activeDoc?.url && (activeDoc.url.startsWith('data:application/pdf') || activeDoc.url.endsWith('.pdf')) && (
                  <div style={{ marginBottom: '24px', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                    <iframe
                      src={activeDoc.url}
                      title={activeDoc.name}
                      style={{ width: '100%', height: '480px', border: 'none', background: '#ffffff' }}
                    />
                  </div>
                )}

                {/* Document Body Content */}
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.8, display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  {activeDoc?.text ? (
                    <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                      {activeDoc.text}
                    </div>
                  ) : currentLesson.content ? (
                    <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                      {currentLesson.content}
                    </div>
                  ) : course.title.toLowerCase().includes('java') ? (
                    /* Deep-dive Enterprise Java Curriculum Notes */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      <p>
                        Welcome to <strong>{currentLesson.title}</strong> for the <strong>{course.title}</strong> curriculum. This reading unit covers the foundational architecture, object-oriented paradigms, memory lifecycle, and clean code conventions required to architect robust, scalable enterprise Java applications.
                      </p>

                      <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '20px 24px' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 12px', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Layers size={18} /> 1. JVM Architecture & Runtime Memory Model
                        </h3>
                        <p style={{ margin: '0 0 12px' }}>
                          The Java Virtual Machine (JVM) abstracts underlying hardware architectures through bytecode execution, providing cross-platform portability (&ldquo;Write Once, Run Anywhere&rdquo;). Key memory segments include:
                        </p>
                        <ul style={{ margin: '0 0 10px', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <li><strong>Heap Memory:</strong> Shared runtime data area where all class instances and arrays are allocated. Partitioned into the Young Generation (Eden and Survivor spaces) and Old/Tenured Generation.</li>
                          <li><strong>JVM Stack:</strong> Thread-isolated memory holding stack frames for active method invocations, primitive local variables, and object references.</li>
                          <li><strong>Metaspace:</strong> Off-heap native memory containing class metadata, static variables, and runtime constant pools (replacing the legacy PermGen in Java 8+).</li>
                          <li><strong>Garbage Collection (GC):</strong> Generational automated memory reclamation (e.g., G1 GC, ZGC) identifying unreachable objects via root set traversal.</li>
                        </ul>
                      </div>

                      <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '20px 24px' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 12px', color: 'var(--accent-purple)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Code size={18} /> 2. Object-Oriented Principles & Modern Syntax
                        </h3>
                        <p style={{ margin: '0 0 12px' }}>
                          Enterprise Java enforces strict type safety and object-oriented encapsulation. Core architectural pillars include:
                        </p>
                        <ul style={{ margin: '0 0 12px', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <li><strong>Dynamic Method Dispatch:</strong> Runtime polymorphism where overridden method resolution occurs dynamically according to the actual runtime instance type.</li>
                          <li><strong>Interfaces vs Abstract Classes:</strong> Interfaces define contracts with support for <code>default</code> and <code>static</code> methods since Java 8, enabling flexible multiple-interface composition without class hierarchy coupling.</li>
                          <li><strong>Resource Management:</strong> Always employ <code>try-with-resources</code> with objects implementing <code>AutoCloseable</code> to prevent resource and socket leaks.</li>
                        </ul>

                        <div style={{
                          background: '#040711',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: 'var(--radius-md)',
                          padding: '16px',
                          fontFamily: 'var(--font-mono, monospace)',
                          fontSize: '0.85rem',
                          color: '#e2e8f0',
                          lineHeight: 1.6,
                          overflowX: 'auto',
                        }}>
                          <span style={{ color: '#818cf8' }}>// Enterprise Java Pattern: Safe Resource Management & Streams</span><br />
                          <span style={{ color: '#ec4899' }}>public</span> <span style={{ color: '#ec4899' }}>final</span> <span style={{ color: '#ec4899' }}>class</span> <span style={{ color: '#38bdf8' }}>DataPipelineService</span> &#123;<br />
                          &nbsp;&nbsp;<span style={{ color: '#ec4899' }}>public</span> List&lt;String&gt; <span style={{ color: '#34d399' }}>processValidRecords</span>(Path path) <span style={{ color: '#ec4899' }}>throws</span> IOException &#123;<br />
                          &nbsp;&nbsp;&nbsp;&nbsp;<span style={{ color: '#94a3b8' }}>// Deterministic automatic resource cleanup via try-with-resources</span><br />
                          &nbsp;&nbsp;&nbsp;&nbsp;<span style={{ color: '#ec4899' }}>try</span> (BufferedReader reader = Files.newBufferedReader(path, StandardCharsets.UTF_8)) &#123;<br />
                          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style={{ color: '#ec4899' }}>return</span> reader.lines()<br />
                          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;.filter(line -&gt; !line.isBlank() &amp;&amp; !line.startsWith(<span style={{ color: '#f59e0b' }}>&quot;#&quot;</span>))<br />
                          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;.map(String::trim)<br />
                          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;.distinct()<br />
                          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;.collect(Collectors.toUnmodifiableList());<br />
                          &nbsp;&nbsp;&nbsp;&nbsp;&#125;<br />
                          &nbsp;&nbsp;&#125;<br />
                          &#125;
                        </div>
                      </div>

                      <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '20px 24px' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 10px', color: 'var(--text-main)' }}>
                          3. Study Checkpoints & Assessment Preparation
                        </h3>
                        <p style={{ margin: '0 0 10px' }}>
                          Ensure you have mastered these concepts prior to launching the module assessment:
                        </p>
                        <ol style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <li>Distinguish clearly between Checked exceptions (compile-time enforced) and Unchecked RuntimeExceptions.</li>
                          <li>Understand how <code>HashMap</code> resolves hash collisions via bucket linked lists and treeification to red-black trees when threshold &gt; 8.</li>
                          <li>Understand the <code>volatile</code> keyword ensuring CPU cache coherency and preventing instruction reordering in multithreaded environments.</li>
                        </ol>
                      </div>
                    </div>
                  ) : (
                    /* General Curriculum Reading Notes */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                      <p>
                        In this lesson, we study the core curriculum guidelines and operational standards for <strong>{course.title}</strong> &mdash; <em>{currentLesson.title}</em>.
                      </p>
                      <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '20px 24px' }}>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 10px', color: 'var(--text-main)' }}>
                          Curriculum Foundations & Objectives
                        </h3>
                        <p style={{ margin: '0 0 10px' }}>
                          Mastery of this module requires deep conceptual understanding and practical implementation rigor:
                        </p>
                        <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <li>Systematic adherence to architectural design specifications and enterprise patterns.</li>
                          <li>Implementation of comprehensive error handling, input validation, and boundary verification.</li>
                          <li>Reproducible testing methodologies and observability instrumentation.</li>
                        </ul>
                      </div>
                      <p>
                        Review the supplementary downloadable materials below before taking the module knowledge assessment.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Action Row & Navigation Controls (No manual Mark as Complete button) */}
          <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', flexWrap: 'wrap', gap: '12px' }}>
            <button
              className="btn btn-secondary"
              onClick={handlePrev}
              disabled={currentLessonIndex === 0}
              style={{ gap: '6px' }}
            >
              <ChevronLeft size={16} /> Previous Lesson
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
              <Link
                to="/my-certificates"
                className="btn btn-primary"
                style={{ gap: '6px', fontWeight: 700, background: 'linear-gradient(135deg, #10b981, #059669)' }}
                onClick={() => {
                  const currentCompleted = courseCompletionMap[course.id] || [];
                  if (!currentCompleted.includes(currentLesson.id)) {
                    setCourseCompletionMap({
                      ...courseCompletionMap,
                      [course.id]: [...currentCompleted, currentLesson.id]
                    });
                  }
                }}
              >
                <Award size={16} /> Complete Course & View Certificate &rarr;
              </Link>
            )}
          </div>

          {/* Downloadable Resources & Lesson Notes */}
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

            {/* Interactive Personal Notes Box */}
            <div style={{ background: 'var(--bg-input)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Personal Study Notes ({currentLesson.title})
                </label>
                <span className="text-muted text-xs">Auto-saved to your profile</span>
              </div>
              <textarea
                rows={3}
                className="form-textarea"
                style={{ width: '100%', fontSize: '0.85rem', resize: 'vertical' }}
                placeholder="Jot down key takeaways, questions, or architectural ideas for this lesson..."
                value={lessonNotes[currentLesson.id] || ''}
                onChange={(e) => handleSaveNote(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* 4. RIGHT SIDEBAR: Module Curriculum Playlist for Selected Course */}
        <div className="card" style={{ padding: '20px', height: 'fit-content' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <h3 style={{ fontSize: '1.05rem', margin: 0 }}>Curriculum Playlist</h3>
            <span className="badge badge-secondary" style={{ fontSize: '0.68rem' }}>
              {course.modules.length} Modules
            </span>
          </div>

          <p className="text-muted text-xs" style={{ marginBottom: '16px' }}>
            {completedLessonIds.length} of {allLessons.length} items completed ({progressPercent}%)
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {course.modules.map((module, mIdx) => (
              <div key={module.id}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.04em' }}>
                  Module {mIdx + 1}: {module.title}
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
                        }}
                        style={{
                          padding: '10px 12px',
                          borderRadius: 'var(--radius-sm)',
                          background: isSelected ? 'var(--primary-light)' : 'transparent',
                          border: isSelected ? '1px solid var(--primary)' : '1px solid transparent',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          cursor: 'pointer',
                          transition: 'var(--transition)'
                        }}
                      >
                        <button
                          type="button"
                          onClick={(e) => toggleLessonCompletion(lesson.id, e)}
                          title={isDone ? 'Marked complete' : 'Click to toggle completion'}
                          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        >
                          {isDone ? (
                            <CheckCircle2 size={16} color="var(--success)" style={{ flexShrink: 0 }} />
                          ) : (
                            <Circle size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                          )}
                        </button>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontWeight: isSelected ? 700 : 500,
                            fontSize: '0.825rem',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            color: isSelected ? 'var(--primary)' : 'var(--text-main)'
                          }}>
                            {lesson.title}
                          </div>
                          <div className="text-muted text-xs" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {lesson.type === 'video' ? (
                              <Video size={11} color="var(--primary)" />
                            ) : lesson.type === 'quiz' || Boolean(lesson.quizConfig) ? (
                              <HelpCircle size={11} color="var(--primary)" />
                            ) : (
                              <FileText size={11} color="var(--accent-cyan)" />
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
                      padding: '8px 12px',
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
                    <HelpCircle size={14} color="var(--primary)" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: '0.8rem',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          color: 'var(--primary)',
                        }}
                      >
                        {module.assessment.title || `Module ${mIdx + 1} Assessment`}
                      </div>
                      <div className="text-muted text-xs">
                        {module.assessment.questions?.length || 0} Questions &bull; Checkpoint
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Course Final Assessment */}
            {course.finalAssessment && (
              <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid var(--border-subtle)' }}>
                <div
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: 'var(--accent-purple)',
                    textTransform: 'uppercase',
                    marginBottom: '8px',
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
                    padding: '12px',
                    borderRadius: 'var(--radius-md)',
                    background:
                      selectedAssessment?.scope === 'final_assessment'
                        ? 'rgba(168, 85, 247, 0.15)'
                        : 'var(--bg-input)',
                    border:
                      selectedAssessment?.scope === 'final_assessment'
                        ? '2px solid var(--accent-purple)'
                        : '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                  }}
                >
                  <Award size={20} color="var(--accent-purple)" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                      {course.finalAssessment.title || 'Comprehensive Final Assessment'}
                    </div>
                    <div className="text-muted text-xs">
                      {course.finalAssessment.questions?.length || 0} Questions &bull; Passing{' '}
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
