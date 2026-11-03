import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiError, apiClient } from '../../lib/apiClient';
import { ArrowLeft, CheckCircle2, ChevronLeft, ChevronRight, Circle, RefreshCw } from 'lucide-react';

interface Lesson {
  id: string;
  title: string;
  type: string;
  content: string | null;
  contentUrl: string | null;
  durationMinutes: number;
}

interface Course {
  id: string;
  title: string;
  description: string;
  modules: Array<{ id: string; title: string; lessons: Lesson[] }>;
}

interface Enrollment {
  courseId: string;
  status: string;
  progressPercentage: number;
  lessonProgress: Array<{ lessonId: string; isCompleted: boolean }>;
}

export const StudentCoursePlayer: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [lessonIndex, setLessonIndex] = useState(0);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCourse = useCallback(async () => {
    if (!id) {
      setError('Course was not specified.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [courseResponse, enrollmentsResponse] = await Promise.all([
        apiClient.get<Course>(`/courses/${encodeURIComponent(id)}`),
        apiClient.get<Enrollment[]>('/courses/my-enrollments'),
      ]);
      const courseEnrollment = enrollmentsResponse.data.find((item) => item.courseId === courseResponse.data.id);
      if (!courseEnrollment) {
        setError('You are not enrolled in this course. Browse the catalog to enroll.');
        setCourse(courseResponse.data);
        setEnrollment(null);
        return;
      }
      setCourse(courseResponse.data);
      setEnrollment(courseEnrollment);
      setCompletedIds(new Set(courseEnrollment.lessonProgress.filter((progress) => progress.isCompleted).map((progress) => progress.lessonId)));
    } catch (loadError) {
      setError(loadError instanceof ApiError && loadError.statusCode < 500
        ? loadError.message
        : 'Unable to load course content.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadCourse();
  }, [loadCourse]);

  const lessons = useMemo(() => course?.modules.flatMap((module) => module.lessons) || [], [course]);
  const currentLesson = lessons[lessonIndex];

  const markCurrentLessonComplete = async () => {
    if (!course || !currentLesson || !enrollment || saving) return;
    setSaving(true);
    setError(null);
    try {
      const response = await apiClient.post<{ progressPercentage: number }>(
        `/courses/${course.id}/lessons/${currentLesson.id}/progress`,
        { timeSpentSeconds: 0, completed: true },
      );
      setCompletedIds((previous) => new Set(previous).add(currentLesson.id));
      setEnrollment({ ...enrollment, progressPercentage: response.data.progressPercentage });
    } catch (saveError) {
      setError(saveError instanceof ApiError && saveError.statusCode < 500
        ? saveError.message
        : 'Could not save your lesson progress.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div role="status" style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>Loading course...</div>;
  }

  if (error && !course) {
    return (
      <div className="card" role="alert" style={{ maxWidth: 680, margin: '48px auto', textAlign: 'center' }}>
        <h1>Course unavailable</h1>
        <p className="text-secondary">{error}</p>
        <button type="button" className="btn btn-primary" onClick={() => void loadCourse()}><RefreshCw size={15} /> Try again</button>
        <Link to="/my-learning" className="btn btn-secondary">Back to My Learning</Link>
      </div>
    );
  }

  if (!course || !enrollment) {
    return (
      <div className="card" role="alert" style={{ maxWidth: 680, margin: '48px auto', textAlign: 'center' }}>
        <h1>Course access unavailable</h1>
        <p className="text-secondary">{error || 'Enrollment is required to access this course.'}</p>
        <Link to="/courses" className="btn btn-primary">Browse courses</Link>
      </div>
    );
  }

  const isComplete = currentLesson ? completedIds.has(currentLesson.id) : false;
  const completionPercentage = lessons.length ? Math.round((completedIds.size / lessons.length) * 100) : 0;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(230px, 300px) minmax(0, 1fr)', gap: 20 }}>
      <aside className="card">
        <Link to="/my-learning" className="text-primary text-sm"><ArrowLeft size={14} style={{ verticalAlign: 'middle' }} /> My Learning</Link>
        <h1 style={{ fontSize: '1.2rem', margin: '14px 0 6px' }}>{course.title}</h1>
        <p className="text-secondary text-xs">{completionPercentage}% complete</p>
        {course.modules.map((module) => (
          <section key={module.id} style={{ marginTop: 16 }}>
            <h2 className="text-sm">{module.title}</h2>
            <div style={{ display: 'grid', gap: 4 }}>
              {module.lessons.map((lesson) => {
                const index = lessons.findIndex((item) => item.id === lesson.id);
                const complete = completedIds.has(lesson.id);
                return (
                  <button
                    key={lesson.id}
                    type="button"
                    className="btn btn-secondary btn-sm"
                    aria-current={index === lessonIndex ? 'step' : undefined}
                    onClick={() => setLessonIndex(index)}
                    style={{ textAlign: 'left', justifyContent: 'flex-start', whiteSpace: 'normal' }}
                  >
                    {complete ? <CheckCircle2 size={14} color="var(--success)" /> : <Circle size={14} />}
                    {lesson.title}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </aside>

      <main style={{ display: 'grid', alignContent: 'start', gap: 16 }}>
        <header className="card">
          <h1 style={{ margin: 0 }}>{currentLesson?.title || course.title}</h1>
          <p className="text-secondary text-sm" style={{ marginBottom: 0 }}>{course.title}</p>
        </header>
        {error && <div role="alert" className="card" style={{ borderColor: 'var(--danger)' }}>{error}</div>}
        <article className="card" style={{ minHeight: 260 }}>
          {currentLesson ? (
            <>
              {currentLesson.content && <div className="text-secondary" style={{ whiteSpace: 'pre-wrap' }}>{currentLesson.content}</div>}
              {currentLesson.contentUrl && (
                <p><a href={currentLesson.contentUrl} target="_blank" rel="noreferrer">Open lesson material</a></p>
              )}
              {!currentLesson.content && !currentLesson.contentUrl && <p className="text-secondary">No lesson material has been published yet.</p>}
              <p className="text-muted text-xs">Lesson duration: {currentLesson.durationMinutes} minutes</p>
              <button type="button" className={isComplete ? 'btn btn-secondary' : 'btn btn-primary'} disabled={saving || isComplete} onClick={() => void markCurrentLessonComplete()}>
                {saving ? 'Saving progress...' : isComplete ? 'Lesson completed' : 'Mark lesson complete'}
              </button>
            </>
          ) : <p className="text-secondary">This course does not have any published lessons yet.</p>}
        </article>
        <nav className="card" aria-label="Lesson navigation" style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <button type="button" className="btn btn-secondary" disabled={lessonIndex === 0} onClick={() => setLessonIndex((index) => Math.max(0, index - 1))}>
            <ChevronLeft size={15} /> Previous
          </button>
          <span className="text-muted text-xs" style={{ alignSelf: 'center' }}>{lessons.length ? `${lessonIndex + 1} of ${lessons.length}` : 'No lessons'}</span>
          <button type="button" className="btn btn-primary" disabled={lessonIndex >= lessons.length - 1} onClick={() => setLessonIndex((index) => Math.min(lessons.length - 1, index + 1))}>
            Next <ChevronRight size={15} />
          </button>
        </nav>
      </main>
    </div>
  );
};
