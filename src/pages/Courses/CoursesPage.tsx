import React, { useState } from 'react';
import { mockCourses } from '../../data/mockData';
import { Course, EntityStatus } from '../../types';
import { Link, useNavigate } from 'react-router-dom';
import {
  BookOpen, Plus, Search, Filter, Eye, Edit2, Archive,
  Clock, Users, CheckCircle2, AlertCircle, Play, Layers
} from 'lucide-react';

export const CoursesPage: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>(mockCourses);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const navigate = useNavigate();

  const filteredCourses = courses.filter((c) => {
    const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || c.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const handleArchive = (id: string) => {
    if (confirm('Archive this course? It will be hidden from new enrollments.')) {
      setCourses(courses.map((c) => c.id === id ? { ...c, status: 'archived' } : c));
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '4px' }}>Course Management & Authoring</h1>
          <p className="text-secondary text-sm">Curriculum catalogue, modular lesson authoring, and version publishing lifecycle</p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <Link to="/learning-paths" className="btn btn-secondary">
            <Layers size={16} /> Learning Paths
          </Link>
          <Link to="/course-builder" className="btn btn-primary">
            <Plus size={16} /> Author New Course
          </Link>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="card" style={{ padding: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search courses by title or topic keywords..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '38px' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <select
              className="form-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ width: 'auto' }}
            >
              <option value="all">All Statuses</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="in_review">In Review</option>
              <option value="archived">Archived</option>
            </select>

            <select
              className="form-select"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{ width: 'auto' }}
            >
              <option value="all">All Categories</option>
              <option value="Frontend Development">Frontend Development</option>
              <option value="Backend Development">Backend Development</option>
              <option value="Data Science & ML">Data Science & ML</option>
              <option value="DevOps & Cloud">DevOps & Cloud</option>
            </select>
          </div>

          <span className="text-muted text-xs font-semibold">{filteredCourses.length} Courses</span>
        </div>
      </div>

      {/* Courses Grid */}
      <div className="grid-3">
        {filteredCourses.map((c) => (
          <div
            key={c.id}
            className="card card-interactive"
            style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
          >
            <div>
              {/* Thumbnail / Header Mock */}
              <div style={{
                height: '140px',
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.3), rgba(139, 92, 246, 0.4))',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <BookOpen size={48} color="#fff" style={{ opacity: 0.8 }} />
                <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
                  <span className={`badge badge-${c.status}`}>{c.status}</span>
                </div>
                <div style={{ position: 'absolute', bottom: '10px', left: '10px', background: 'rgba(0,0,0,0.6)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', color: '#fff' }}>
                  v{c.version}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span className="text-muted text-xs font-semibold">{c.category}</span>
                <span className="text-muted text-xs">&bull;</span>
                <span className="text-muted text-xs">{c.durationHours} hrs</span>
              </div>

              <h3 style={{ fontSize: '1.15rem', marginBottom: '8px', lineHeight: 1.3 }}>{c.title}</h3>
              <p className="text-secondary text-sm" style={{ marginBottom: '16px', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {c.description}
              </p>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderTop: '1px solid var(--border-subtle)', marginBottom: '12px', fontSize: '0.8rem' }}>
                <span className="text-muted" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Users size={14} /> {c.enrolledLearners} Learners
                </span>
                <span className="text-muted">
                  {c.modules.length} Modules &bull; {c.modules.reduce((a, b) => a + b.lessons.length, 0)} Lessons
                </span>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <Link
                  to={`/course-player/${c.id}`}
                  className="btn btn-primary btn-sm"
                  style={{ flex: 1 }}
                >
                  <Play size={13} /> Learner View
                </Link>
                <Link
                  to={`/course-builder?id=${c.id}`}
                  className="btn btn-secondary btn-sm"
                  title="Edit curriculum & lessons"
                >
                  <Edit2 size={13} /> Edit
                </Link>
                {c.status !== 'archived' && (
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleArchive(c.id)}
                    style={{ color: 'var(--danger)' }}
                    title="Archive course"
                  >
                    <Archive size={13} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
