import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuthStore } from '../../lib/store';
import { useCourseStore } from '../../lib/courseStore';
import { useCertificateStore } from '../../lib/certificateStore';
import { generateCertificatePdf } from '../../lib/certificatePdf';
import { mockCourses } from '../../data/mockData';
import { Certificate } from '../../types';
import {
  ArrowLeft, CheckCircle2, Circle, Play, FileText, Download,
  ChevronRight, ChevronLeft, Bookmark, Share2, Sparkles, Award,
  ShieldCheck, X, ExternalLink, Clock, Lock, AlertTriangle, Eye
} from 'lucide-react';

export const LearnerCoursePlayerPage: React.FC = () => {
  const { user } = useAuthStore();
  const { courses } = useCourseStore();
  const { issueCourseCertificate, getCertificatesByLearner } = useCertificateStore();
  const { id } = useParams<{ id: string }>();

  // Resolve course from store first, fallback to mockCourses
  const course = courses.find((c) => c.id === id) || mockCourses.find((c) => c.id === id) || mockCourses[0];

  const allLessons = course.modules.flatMap((m) => m.lessons);
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>(['les-101', 'les-102']);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [unlockedCert, setUnlockedCert] = useState<Certificate | null>(null);
  const [showCertModal, setShowCertModal] = useState(false);
  const [downloadingCert, setDownloadingCert] = useState(false);

  // Persistent notes per lesson
  const [lessonNotes, setLessonNotes] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem(`venilearn_notes_${course.id}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const handleSaveNote = (text: string) => {
    const activeLessonId = allLessons[currentLessonIndex]?.id || 'les-default';
    const updated = { ...lessonNotes, [activeLessonId]: text };
    setLessonNotes(updated);
    try {
      localStorage.setItem(`venilearn_notes_${course.id}`, JSON.stringify(updated));
    } catch {}
  };

  // Check if learner already earned a certificate for this course
  const existingCert = user ? getCertificatesByLearner(user.id).find((c) => c.courseId === course.id) : undefined;

  // Course Availability Calculations
  const now = new Date();
  const isBeforeStart = Boolean(course.startDate && new Date(course.startDate) > now);
  const isAfterEnd = Boolean(course.endDate && new Date(course.endDate) < now);
  const isStudent = user?.activeRole === 'student' || user?.activeRole === 'learner';
  const isPrivileged = !isStudent; // Admins and Trainers

  const currentLesson = allLessons[currentLessonIndex] || allLessons[0];
  const isCompleted = completedLessonIds.includes(currentLesson.id);

  const progressPercent = allLessons.length > 0 ? Math.round((completedLessonIds.length / allLessons.length) * 100) : 100;
  const requiredPercentage = course.completionPercentageRequired ?? course.certificateConfig?.requiredCompletionPercentage ?? 100;

  const toggleComplete = () => {
    // End Date restriction: freeze progress modifications after course end date
    if (isAfterEnd) return;

    if (isCompleted) {
      setCompletedLessonIds(completedLessonIds.filter((id) => id !== currentLesson.id));
    } else {
      const nextList = [...completedLessonIds, currentLesson.id];
      setCompletedLessonIds(nextList);
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 2500);

      // Verify completion percentage eligibility for certificate issuance
      const newPercent = Math.round((nextList.length / allLessons.length) * 100);
      if (newPercent >= requiredPercentage && course.certificateConfig?.enabled !== false) {
        const student = user || {
          id: 'u-007',
          displayName: 'Alex Thompson',
          email: 'alex.thompson@student.acmelearning.com',
        };
        const issueResult = issueCourseCertificate({
          course,
          learner: {
            id: student.id,
            name: student.displayName || 'Alex Thompson',
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

  const handleNext = () => {
    if (currentLessonIndex < allLessons.length - 1) {
      setCurrentLessonIndex(currentLessonIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentLessonIndex > 0) {
      setCurrentLessonIndex(currentLessonIndex - 1);
    }
  };

  const exitLink = (user?.activeRole === 'student' || user?.activeRole === 'learner') ? '/my-learning' : '/courses';

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
          {/* Video / Interactive Player Box */}
          <div style={{
            background: '#040711',
            borderRadius: 'var(--radius-xl)',
            overflow: 'hidden',
            border: '1px solid var(--border-subtle)',
            position: 'relative'
          }}>
            {currentLesson.type === 'video' ? (
              <div style={{
                height: '420px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'radial-gradient(circle at center, #1e1b4b 0%, #060913 70%)',
                position: 'relative'
              }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--primary), var(--accent-purple))',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-glow)'
                }}>
                  <Play size={28} fill="#fff" style={{ marginLeft: '4px' }} />
                </div>
                <div style={{ marginTop: '16px', fontWeight: 600, fontSize: '0.95rem' }}>
                  {currentLesson.title}
                </div>
                <div className="text-muted text-xs">Simulated HD 1080p Stream &bull; Captions Available</div>

                {/* Video controls mock bar */}
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  padding: '12px 20px',
                  background: 'rgba(0,0,0,0.85)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.75rem',
                  color: '#cbd5e1'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Play size={14} fill="#cbd5e1" />
                    <span>04:12 / {currentLesson.durationMinutes}:00</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span>1.0x</span>
                    <span>CC</span>
                    <span>1080p</span>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding: '36px', minHeight: '360px', background: 'var(--bg-card)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                  <FileText size={24} color="var(--accent-cyan)" />
                  <h2 style={{ fontSize: '1.4rem', margin: 0 }}>{currentLesson.title}</h2>
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.7, display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <p>
                    In this lesson, we explore foundational principles of distributed state, bounded contexts, and the decoupled domain event loop. When designing large-scale enterprise microservices, state must remain isolated behind explicit transactional boundaries.
                  </p>
                  <div style={{
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '16px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.85rem'
                  }}>
                    // Domain Event Example<br />
                    interface OrderCreatedEvent &#123;<br />
                    &nbsp;&nbsp;eventId: string;<br />
                    &nbsp;&nbsp;timestamp: number;<br />
                    &nbsp;&nbsp;aggregateId: string;<br />
                    &nbsp;&nbsp;payload: OrderData;<br />
                    &#125;
                  </div>
                  <p>
                    Ensure you review the supplementary downloadable architectural pattern diagram below before proceeding to the quiz checkpoint.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Action Row & Navigation Controls */}
          <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button
              className="btn btn-secondary"
              onClick={handlePrev}
              disabled={currentLessonIndex === 0}
            >
              <ChevronLeft size={16} /> Previous Lesson
            </button>

            {isAfterEnd ? (
              <button
                className="btn btn-secondary"
                disabled
                title="Course access period has ended"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', opacity: 0.8, cursor: 'not-allowed' }}
              >
                <Lock size={16} /> Course Ended &bull; Read-Only
              </button>
            ) : (
              <button
                className={`btn ${isCompleted ? 'btn-success' : 'btn-primary'}`}
                onClick={toggleComplete}
              >
                <CheckCircle2 size={16} />
                {isCompleted ? 'Completed' : 'Mark as Complete'}
              </button>
            )}

            <button
              className="btn btn-secondary"
              onClick={handleNext}
              disabled={currentLessonIndex === allLessons.length - 1}
            >
              Next Lesson <ChevronRight size={16} />
            </button>
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

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginBottom: '20px' }}>
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
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{currentLesson.title.slice(0, 24)}-Guide.pdf</div>
                    <div className="text-muted text-xs">2.4 MB &bull; Lecture Document</div>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                  onClick={() => {
                    const blob = new Blob([`# VeniLearn LMS\nCourse: ${course.title}\nLesson: ${currentLesson.title}\nDuration: ${currentLesson.durationMinutes || 30} mins\n\nOfficial Course Study Guide & Materials.`], { type: 'text/markdown' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${currentLesson.title.replace(/\s+/g, '_')}_StudyGuide.md`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  Download
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
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Lesson-Starter-Code.zip</div>
                    <div className="text-muted text-xs">850 KB &bull; Source Exercises</div>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                  onClick={() => {
                    const blob = new Blob([`// Starter exercises for ${currentLesson.title}\nconsole.log("Ready to practice!");\n`], { type: 'text/javascript' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${currentLesson.title.replace(/\s+/g, '_')}_starter.js`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  Download
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

        {/* Right Sidebar: Module Curriculum Checklist */}
        <div className="card" style={{ padding: '20px', height: 'fit-content' }}>
          <h3 style={{ fontSize: '1.05rem', marginBottom: '6px' }}>Curriculum Playlist</h3>
          <p className="text-muted text-xs" style={{ marginBottom: '16px' }}>
            {completedLessonIds.length} of {allLessons.length} items completed
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {course.modules.map((module) => (
              <div key={module.id}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
                  {module.title}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {module.lessons.map((lesson) => {
                    const lIndex = allLessons.findIndex((l) => l.id === lesson.id);
                    const isSelected = lIndex === currentLessonIndex;
                    const isDone = completedLessonIds.includes(lesson.id);

                    return (
                      <div
                        key={lesson.id}
                        onClick={() => setCurrentLessonIndex(lIndex)}
                        style={{
                          padding: '8px 10px',
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
                        {isDone ? (
                          <CheckCircle2 size={16} color="var(--success)" style={{ flexShrink: 0 }} />
                        ) : (
                          <Circle size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                        )}
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
                          <div className="text-muted text-xs">
                            {lesson.durationMinutes} mins
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
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
            <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>Lesson marked complete. Learning streak maintained.</div>
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
                Congratulations, {user?.displayName || 'Alex'}!
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
