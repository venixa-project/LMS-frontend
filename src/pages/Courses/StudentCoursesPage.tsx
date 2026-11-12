import React, { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BookOpen, Clock, RefreshCw, Search } from 'lucide-react';
import { ApiError, apiClient } from '../../lib/apiClient';
import { getDefaultCourseCover } from '../../lib/courseStore';

interface CourseItem {
  id: string;
  slug: string;
  title: string;
  shortDescription: string | null;
  description: string;
  category: string;
  level: string;
  estimatedDuration: number;
  thumbnail?: string | null;
  thumbnailUrl?: string | null;
}

interface CourseEnrollment {
  id: string;
  courseId: string;
  status: string;
  progressPercentage: number;
  lessonProgress: Array<{ lessonId: string; isCompleted: boolean }>;
  course: CourseItem & { modules: Array<{ lessons: Array<{ id: string }> }> };
}

export const StudentCoursesPage: React.FC = () => {
  const location = useLocation();
  const isMyLearning = location.pathname === '/my-learning' || location.pathname === '/my-courses';
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [enrollments, setEnrollments] = useState<CourseEnrollment[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadCourses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [catalogResponse, enrollmentResponse] = await Promise.all([
        isMyLearning
          ? Promise.resolve(null)
          : apiClient.get<CourseItem[]>('/courses?status=published&limit=100'),
        apiClient.get<CourseEnrollment[]>('/courses/my-enrollments'),
      ]);
      setCourses(catalogResponse?.data || []);
      setEnrollments(enrollmentResponse.data);
    } catch (loadError) {
      setError(loadError instanceof ApiError && loadError.statusCode < 500
        ? loadError.message
        : 'Unable to load courses. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [isMyLearning]);

  useEffect(() => {
    void loadCourses();
  }, [loadCourses]);

  const handleEnroll = async (courseId: string) => {
    setEnrollingId(courseId);
    setNotice(null);
    try {
      await apiClient.post(`/courses/${courseId}/enroll`, {});
      setNotice('You are enrolled. Your course is now available in My Learning.');
      await loadCourses();
    } catch (enrollError) {
      setNotice(enrollError instanceof ApiError && enrollError.statusCode < 500
        ? enrollError.message
        : 'Enrollment failed. Please try again.');
    } finally {
      setEnrollingId(null);
    }
  };

  const enrolledCourseIds = new Set(enrollments.map((enrollment) => enrollment.courseId));
  const availableCourses = isMyLearning
    ? enrollments.map((enrollment) => ({
        ...enrollment.course,
        progressPercentage: enrollment.progressPercentage,
        enrollmentStatus: enrollment.status,
      }))
    : courses.map((course) => ({ ...course, progressPercentage: 0, enrollmentStatus: '' }));
  const filteredCourses = availableCourses.filter((course) => {
    const query = search.trim().toLowerCase();
    return !query || `${course.title} ${course.description} ${course.category}`.toLowerCase().includes(query);
  });

  if (loading) {
    return <div role="status" style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>Loading courses...</div>;
  }

  if (error) {
    return (
      <div className="card" role="alert" style={{ maxWidth: 680, margin: '48px auto', textAlign: 'center' }}>
        <h1>Courses unavailable</h1>
        <p className="text-secondary">{error}</p>
        <button type="button" className="btn btn-primary" onClick={() => void loadCourses()}>
          <RefreshCw size={15} /> Try again
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <span className="badge badge-primary">{isMyLearning ? 'My Enrolled Courses' : 'Course Catalog'}</span>
          <h1 style={{ margin: '8px 0 4px' }}>{isMyLearning ? 'My Learning' : 'Explore Courses'}</h1>
          <p className="text-secondary text-sm" style={{ margin: 0 }}>
            {isMyLearning ? 'Resume courses and review your current progress.' : 'Explore published courses and enroll to begin learning.'}
          </p>
        </div>
        {!isMyLearning && <Link to="/my-learning" className="btn btn-secondary">My Learning</Link>}
      </header>

      <label className="card" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px' }}>
        <Search size={16} className="text-muted" />
        <input aria-label="Search courses" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search courses..." style={{ flex: 1, border: 0, background: 'transparent', color: 'inherit', outline: 0 }} />
      </label>

      {notice && <div role="status" className="card text-secondary">{notice}</div>}

      {filteredCourses.length ? (
        <section aria-label={isMyLearning ? 'Enrolled courses' : 'Available courses'} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: 16 }}>
          {filteredCourses.map((course) => {
            const isEnrolled = enrolledCourseIds.has(course.id);
            const courseCover = course.thumbnail || course.thumbnailUrl || getDefaultCourseCover(course.category, course.title);

            return (
              <article className="card" key={course.id} style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
                {/* 16:9 Course Cover Page */}
                <div style={{ width: '100%', height: '140px', position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg, #2563EB 0%, #EC4899 100%)' }}>
                  {courseCover && (
                    <img
                      src={courseCover}
                      alt={course.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  )}
                  <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 2 }}>
                    <span className="badge badge-secondary" style={{ background: 'rgba(5, 8, 22, 0.75)', backdropFilter: 'blur(6px)', color: '#FFFFFF', border: '1px solid rgba(255, 255, 255, 0.25)', fontSize: '0.68rem', fontWeight: 700 }}>
                      {course.category}
                    </span>
                  </div>
                </div>

                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                    <span className="badge badge-secondary">{course.category}</span>
                    <span className="text-muted text-xs">{course.level}</span>
                  </div>
                  <div>
                    <h2 style={{ fontSize: '1.05rem', margin: '0 0 6px' }}>{course.title}</h2>
                    <p className="text-secondary text-sm" style={{ margin: 0 }}>{course.shortDescription || course.description}</p>
                  </div>
                  <div className="text-muted text-xs"><Clock size={13} style={{ verticalAlign: 'middle' }} /> {course.estimatedDuration} minutes</div>
                  {isMyLearning ? (
                    <>
                      <div className="progress-bar-bg" role="progressbar" aria-label={`${course.title} progress`} aria-valuenow={course.progressPercentage} aria-valuemin={0} aria-valuemax={100} style={{ height: 6 }}>
                        <div className="progress-bar-fill" style={{ width: `${course.progressPercentage}%`, height: '100%' }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 'auto' }}>
                        <span className="text-muted text-xs">{course.progressPercentage}% complete</span>
                        <Link to={`/course-player/${course.id}`} className="btn btn-primary btn-sm">Continue <BookOpen size={14} /></Link>
                      </div>
                    </>
                  ) : (
                    <div style={{ marginTop: 'auto' }}>
                      {isEnrolled ? (
                        <Link to="/my-learning" className="btn btn-secondary btn-sm">Open My Learning</Link>
                      ) : (
                        <button type="button" className="btn btn-primary btn-sm" disabled={enrollingId === course.id} onClick={() => void handleEnroll(course.id)}>
                          {enrollingId === course.id ? 'Enrolling...' : 'Enroll'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: 36 }}>
          <h2>{isMyLearning ? 'No enrolled courses yet' : 'No courses found'}</h2>
          <p className="text-secondary">{isMyLearning ? 'Browse the catalog and enroll in a course to get started.' : 'Try a different search or check back later.'}</p>
          {isMyLearning && <Link to="/courses" className="btn btn-primary">Browse course catalog</Link>}
        </div>
      )}
    </div>
  );
};
