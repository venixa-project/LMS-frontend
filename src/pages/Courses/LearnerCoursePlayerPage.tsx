import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuthStore } from '../../lib/store';
import { mockCourses } from '../../data/mockData';
import {
  ArrowLeft, CheckCircle2, Circle, Play, FileText, Download,
  ChevronRight, ChevronLeft, Bookmark, Share2, Sparkles, Award
} from 'lucide-react';

export const LearnerCoursePlayerPage: React.FC = () => {
  const { user } = useAuthStore();
  const { id } = useParams<{ id: string }>();
  const course = mockCourses.find((c) => c.id === id) || mockCourses[0];

  const allLessons = course.modules.flatMap((m) => m.lessons);
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>(['les-101', 'les-102']);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  const currentLesson = allLessons[currentLessonIndex] || allLessons[0];
  const isCompleted = completedLessonIds.includes(currentLesson.id);

  const progressPercent = Math.round((completedLessonIds.length / allLessons.length) * 100);

  const toggleComplete = () => {
    if (isCompleted) {
      setCompletedLessonIds(completedLessonIds.filter((id) => id !== currentLesson.id));
    } else {
      const nextList = [...completedLessonIds, currentLesson.id];
      setCompletedLessonIds(nextList);
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 2500);
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

  const exitLink = user?.activeRole === 'learner' ? '/my-learning' : '/courses';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Banner Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link to={exitLink} className="btn btn-secondary btn-sm" style={{ gap: '6px' }}>
          <ArrowLeft size={14} /> Exit to Courses
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
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

            <button
              className={`btn ${isCompleted ? 'btn-success' : 'btn-primary'}`}
              onClick={toggleComplete}
            >
              <CheckCircle2 size={16} />
              {isCompleted ? 'Completed (+10 Points)' : 'Mark as Complete'}
            </button>

            <button
              className="btn btn-secondary"
              onClick={handleNext}
              disabled={currentLessonIndex === allLessons.length - 1}
            >
              Next Lesson <ChevronRight size={16} />
            </button>
          </div>

          {/* Downloadable Resources & Discussion */}
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '12px' }}>Lesson Attachments & Notes</h3>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div
                style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer'
                }}
                onClick={() => alert("Downloading lecture_cheatsheet.pdf mock")}
              >
                <Download size={16} color="var(--primary)" />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Architectural-Guide.pdf</div>
                  <div className="text-muted text-xs">2.4 MB &bull; PDF document</div>
                </div>
              </div>

              <div
                style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer'
                }}
                onClick={() => alert("Opening sandbox workspace mock")}
              >
                <FileText size={16} color="var(--accent-cyan)" />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Starter-Repository.zip</div>
                  <div className="text-muted text-xs">850 KB &bull; Source code files</div>
                </div>
              </div>
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
    </div>
  );
};
