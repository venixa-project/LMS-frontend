import React, { useState, useMemo } from 'react';
import { useAuthStore } from '../../../lib/store';
import { useLiveSessionStore } from '../../../lib/liveSessionStore';
import { mockCourses } from '../../../data/mockData';
import { LiveSession } from '../../../types';
import {
  Play, Video, Search, Filter, BookOpen, Clock, Users,
  Bookmark, Share2, Download, CheckCircle2, Sparkles,
  FileText, Award, Eye, Calendar, ArrowUpDown, List, Grid,
  SlidersHorizontal, Check, RefreshCw
} from 'lucide-react';

interface Props {
  sessions: LiveSession[];
  onPlayRecording: (session: LiveSession) => void;
  showNotice?: (msg: string) => void;
}

export const RecordedClassesView: React.FC<Props> = ({
  sessions,
  onPlayRecording,
  showNotice = () => {},
}) => {
  const { user } = useAuthStore();
  const { toggleBookmark } = useLiveSessionStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [courseFilter, setCourseFilter] = useState('all');
  const [instructorFilter, setInstructorFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'in_progress' | 'unwatched' | 'bookmarked'>('all');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'duration' | 'views'>('date_desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [copiedSessionId, setCopiedSessionId] = useState<string | null>(null);

  // Filter only recorded sessions (either status === 'ended' or has recordingUrl)
  const recordedSessions = useMemo(() => {
    return sessions.filter((s) => s.status === 'ended' || Boolean(s.recordingUrl));
  }, [sessions]);

  // Unique instructors list
  const instructorsList = useMemo(() => {
    const map = new Map<string, string>();
    recordedSessions.forEach((s) => {
      if (s.instructorId && s.instructorName) {
        map.set(s.instructorId, s.instructorName);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [recordedSessions]);

  // Unique courses list
  const recordedCoursesList = useMemo(() => {
    const map = new Map<string, string>();
    recordedSessions.forEach((s) => {
      const courseId = s.courseId || 'general';
      const courseTitle = s.courseTitle || mockCourses.find((c) => c.id === s.courseId)?.title || 'General Curriculum';
      map.set(courseId, courseTitle);
    });
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
  }, [recordedSessions]);

  // Filtered & Sorted Sessions
  const displayedRecordings = useMemo(() => {
    return recordedSessions
      .filter((s) => {
        // Course filter
        if (courseFilter !== 'all' && s.courseId !== courseFilter) return false;

        // Instructor filter
        if (instructorFilter !== 'all' && s.instructorId !== instructorFilter) return false;

        // Watch status filter
        const progress = s.watchProgressPercentage ?? 0;
        if (statusFilter === 'completed' && progress < 100) return false;
        if (statusFilter === 'in_progress' && (progress <= 0 || progress >= 100)) return false;
        if (statusFilter === 'unwatched' && progress > 0) return false;
        if (statusFilter === 'bookmarked' && !s.isBookmarked) return false;

        // Search Query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = s.title.toLowerCase().includes(q);
          const matchTrainer = (s.instructorName || '').toLowerCase().includes(q);
          const matchCourse = (s.courseTitle || '').toLowerCase().includes(q);
          const matchDesc = (s.description || '').toLowerCase().includes(q);
          if (!matchTitle && !matchTrainer && !matchCourse && !matchDesc) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'date_desc') {
          return new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime();
        }
        if (sortBy === 'date_asc') {
          return new Date(a.date || a.createdAt).getTime() - new Date(b.date || b.createdAt).getTime();
        }
        if (sortBy === 'duration') {
          return (b.durationMinutes || b.duration || 60) - (a.durationMinutes || a.duration || 60);
        }
        if (sortBy === 'views') {
          return (b.recordingViews || 0) - (a.recordingViews || 0);
        }
        return 0;
      });
  }, [recordedSessions, courseFilter, instructorFilter, statusFilter, searchQuery, sortBy]);

  // Overall Stats
  const stats = useMemo(() => {
    const totalCount = recordedSessions.length;
    const totalMinutes = recordedSessions.reduce((acc, curr) => acc + (curr.durationMinutes || curr.duration || 60), 0);
    const totalHours = (totalMinutes / 60).toFixed(1);
    const completedCount = recordedSessions.filter((s) => (s.watchProgressPercentage ?? 0) === 100).length;
    const inProgressCount = recordedSessions.filter((s) => {
      const p = s.watchProgressPercentage ?? 0;
      return p > 0 && p < 100;
    }).length;
    const bookmarkedCount = recordedSessions.filter((s) => Boolean(s.isBookmarked)).length;

    return { totalCount, totalHours, completedCount, inProgressCount, bookmarkedCount };
  }, [recordedSessions]);

  // Share link handler
  const handleShare = (session: LiveSession) => {
    const link = session.recordingUrl || `https://meet.venilearn.com/recordings/${session.id}`;
    navigator.clipboard.writeText(link);
    setCopiedSessionId(session.id);
    showNotice(`Recorded class link copied: ${link}`);
    setTimeout(() => setCopiedSessionId(null), 3000);
  };

  // Course Color Helper
  const getCourseBadgeColor = (courseId?: string) => {
    if (courseId === 'crs-001') return { bg: 'rgba(99, 102, 241, 0.12)', text: '#6366f1', border: 'rgba(99, 102, 241, 0.3)' };
    if (courseId === 'crs-002') return { bg: 'rgba(6, 182, 212, 0.12)', text: '#06b6d4', border: 'rgba(6, 182, 212, 0.3)' };
    if (courseId === 'crs-003') return { bg: 'rgba(16, 185, 129, 0.12)', text: '#10b981', border: 'rgba(16, 185, 129, 0.3)' };
    if (courseId === 'crs-004') return { bg: 'rgba(139, 92, 246, 0.12)', text: '#8b5cf6', border: 'rgba(139, 92, 246, 0.3)' };
    if (courseId === 'crs-005') return { bg: 'rgba(245, 158, 11, 0.12)', text: '#f59e0b', border: 'rgba(245, 158, 11, 0.3)' };
    return { bg: 'rgba(59, 130, 246, 0.12)', text: '#3b82f6', border: 'rgba(59, 130, 246, 0.3)' };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Metric Stat Cards */}
      <div className="grid-4" style={{ gap: '16px' }}>
        <div className="stat-card" style={{ borderLeft: '4px solid var(--primary)', padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span className="text-muted text-xs font-semibold">Available Recordings</span>
            <Video size={18} color="var(--primary)" />
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-main)' }}>
            {stats.totalCount}
          </div>
          <span className="text-xs text-muted">Full HD on-demand lecture replays</span>
        </div>

        <div className="stat-card" style={{ borderLeft: '4px solid #06b6d4', padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span className="text-muted text-xs font-semibold">Total Video Material</span>
            <Clock size={18} color="#06b6d4" />
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#06b6d4' }}>
            {stats.totalHours} hrs
          </div>
          <span className="text-xs text-muted">With timestamped chapters & AI notes</span>
        </div>

        <div className="stat-card" style={{ borderLeft: '4px solid var(--success)', padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span className="text-muted text-xs font-semibold">Watched & Completed</span>
            <CheckCircle2 size={18} color="var(--success)" />
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--success)' }}>
            {stats.completedCount}
          </div>
          <span className="text-xs text-muted">{stats.inProgressCount} classes in progress</span>
        </div>

        <div className="stat-card" style={{ borderLeft: '4px solid var(--accent-purple)', padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span className="text-muted text-xs font-semibold">Saved / Bookmarked</span>
            <Bookmark size={18} color="var(--accent-purple)" />
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--accent-purple)' }}>
            {stats.bookmarkedCount}
          </div>
          <span className="text-xs text-muted">Bookmarked for exam revision</span>
        </div>
      </div>

      {/* Control & Filter Toolbar */}
      <div
        className="card"
        style={{
          padding: '16px',
          background: 'var(--bg-surface)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          border: '1px solid var(--border-subtle)',
        }}
      >
        {/* Top Row: Search & Filters */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ position: 'relative', flex: '1 1 260px', maxWidth: '420px' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              className="input"
              placeholder="Search recorded lectures by topic, faculty or key concepts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '38px', height: '40px', fontSize: '0.84rem' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Course Filter */}
            <select
              className="input"
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              style={{ width: 'auto', height: '40px', fontSize: '0.84rem' }}
            >
              <option value="all">All Courses</option>
              {recordedCoursesList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>

            {/* Instructor Filter */}
            <select
              className="input"
              value={instructorFilter}
              onChange={(e) => setInstructorFilter(e.target.value)}
              style={{ width: 'auto', height: '40px', fontSize: '0.84rem' }}
            >
              <option value="all">All Instructors</option>
              {instructorsList.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.name}
                </option>
              ))}
            </select>

            {/* Sort Dropdown */}
            <select
              className="input"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              style={{ width: 'auto', height: '40px', fontSize: '0.84rem' }}
            >
              <option value="date_desc">Latest Recorded</option>
              <option value="date_asc">Oldest First</option>
              <option value="duration">Longest Duration</option>
              <option value="views">Most Viewed</option>
            </select>

            {/* Grid / List Switcher */}
            <div
              style={{
                display: 'inline-flex',
                background: 'var(--bg-card)',
                padding: '3px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <button
                className={`btn btn-sm ${viewMode === 'grid' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setViewMode('grid')}
                title="Grid view"
                style={{ padding: '6px 12px' }}
              >
                <Grid size={15} />
              </button>
              <button
                className={`btn btn-sm ${viewMode === 'list' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setViewMode('list')}
                title="List view"
                style={{ padding: '6px 12px' }}
              >
                <List size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Row: Watch Status Badges */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', paddingTop: '4px', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span className="text-muted text-xs font-semibold">Filter by status:</span>
            {[
              { id: 'all', label: 'All Recordings' },
              { id: 'completed', label: 'Watched' },
              { id: 'in_progress', label: 'In Progress' },
              { id: 'unwatched', label: 'Unwatched' },
              { id: 'bookmarked', label: '★ Bookmarked' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`btn btn-sm ${statusFilter === tab.id ? 'btn-primary' : 'btn-secondary'}`}
                style={{
                  fontSize: '0.78rem',
                  padding: '4px 12px',
                  borderRadius: '20px',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {(searchQuery || courseFilter !== 'all' || instructorFilter !== 'all' || statusFilter !== 'all') && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setSearchQuery('');
                setCourseFilter('all');
                setInstructorFilter('all');
                setStatusFilter('all');
              }}
              style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* RECORDINGS GALLERY */}
      {displayedRecordings.length === 0 ? (
        <div className="card" style={{ padding: '48px 24px', textAlign: 'center', background: 'var(--bg-surface)' }}>
          <Video size={48} color="var(--text-muted)" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', fontWeight: 700 }}>No Recorded Classes Found</h3>
          <p className="text-secondary text-sm" style={{ maxWidth: '460px', margin: '0 auto 20px' }}>
            No lecture replays match your selected filters. Try broadening your search or resetting filters.
          </p>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setSearchQuery('');
              setCourseFilter('all');
              setInstructorFilter('all');
              setStatusFilter('all');
            }}
          >
            Clear All Filters
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID CARDS VIEW */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
          {displayedRecordings.map((s) => {
            const badgeStyle = getCourseBadgeColor(s.courseId);
            const progress = s.watchProgressPercentage ?? 0;
            const isCompleted = progress === 100;
            const isInProgress = progress > 0 && progress < 100;

            return (
              <div
                key={s.id}
                className="card recorded-class-card"
                style={{
                  padding: 0,
                  background: 'var(--bg-surface)',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-subtle)',
                  boxShadow: 'var(--shadow-sm)',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  position: 'relative',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                }}
              >
                {/* Video Thumbnail Header */}
                <div
                  style={{
                    position: 'relative',
                    height: '180px',
                    background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    overflow: 'hidden',
                  }}
                  onClick={() => onPlayRecording(s)}
                >
                  {/* Subtle Background Pattern */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      opacity: 0.15,
                      backgroundImage: 'radial-gradient(circle at 20% 50%, var(--primary) 0%, transparent 60%), radial-gradient(circle at 80% 30%, var(--accent-purple) 0%, transparent 60%)',
                    }}
                  />

                  {/* Play Button Icon */}
                  <div
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      background: 'rgba(255, 255, 255, 0.2)',
                      backdropFilter: 'blur(8px)',
                      border: '1.5px solid rgba(255, 255, 255, 0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
                      transition: 'transform 0.15s ease',
                      zIndex: 2,
                    }}
                  >
                    <Play size={24} style={{ marginLeft: '3px' }} />
                  </div>

                  {/* Duration Pill */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '12px',
                      right: '12px',
                      background: 'rgba(15, 23, 42, 0.85)',
                      backdropFilter: 'blur(4px)',
                      color: '#ffffff',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      zIndex: 2,
                    }}
                  >
                    <Clock size={12} />
                    <span>{s.durationMinutes || s.duration || 60}m</span>
                  </div>

                  {/* Quality & HD Pill */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '12px',
                      left: '12px',
                      background: 'rgba(15, 23, 42, 0.75)',
                      backdropFilter: 'blur(4px)',
                      color: '#38bdf8',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      zIndex: 2,
                    }}
                  >
                    1080p Full HD
                  </div>

                  {/* Bookmark Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleBookmark(s.id);
                      showNotice(s.isBookmarked ? `Removed "${s.title}" from saved bookmarks.` : `Saved "${s.title}" to bookmarks!`);
                    }}
                    title={s.isBookmarked ? 'Remove bookmark' : 'Bookmark this lecture'}
                    style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      background: s.isBookmarked ? 'var(--accent-purple)' : 'rgba(15, 23, 42, 0.75)',
                      backdropFilter: 'blur(4px)',
                      border: 'none',
                      color: '#ffffff',
                      borderRadius: '50%',
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      zIndex: 2,
                      transition: 'transform 0.15s ease',
                    }}
                  >
                    <Bookmark size={15} fill={s.isBookmarked ? '#ffffff' : 'none'} />
                  </button>

                  {/* Progress Line */}
                  {progress > 0 && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: '4px',
                        background: 'rgba(255, 255, 255, 0.2)',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${progress}%`,
                          background: isCompleted ? 'var(--success)' : 'var(--primary)',
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Content Body */}
                <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, justifyContent: 'space-between' }}>
                  <div>
                    {/* Course Category Badge & Date */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '4px',
                          background: badgeStyle.bg,
                          color: badgeStyle.text,
                          border: `1px solid ${badgeStyle.border}`,
                          textOverflow: 'ellipsis',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                          maxWidth: '220px',
                        }}
                      >
                        {s.courseTitle || mockCourses.find((c) => c.id === s.courseId)?.title || 'General Curriculum'}
                      </span>

                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                        {s.date || 'Recent Lecture'}
                      </span>
                    </div>

                    {/* Class Title */}
                    <h3
                      onClick={() => onPlayRecording(s)}
                      style={{
                        margin: '0 0 6px 0',
                        fontSize: '1.05rem',
                        fontWeight: 800,
                        lineHeight: 1.35,
                        cursor: 'pointer',
                        color: 'var(--text-main)',
                      }}
                    >
                      {s.title}
                    </h3>

                    {/* Description preview */}
                    {s.description && (
                      <p
                        className="text-secondary text-xs"
                        style={{
                          margin: '0 0 12px 0',
                          lineHeight: 1.5,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {s.description}
                      </p>
                    )}

                    {/* Faculty & View Metadata */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <span
                          style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            background: 'var(--primary)',
                            color: '#fff',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.65rem',
                            fontWeight: 800,
                          }}
                        >
                          {s.instructorName ? s.instructorName.slice(0, 1) : 'F'}
                        </span>
                        <strong style={{ color: 'var(--text-main)' }}>{s.instructorName || 'Faculty Trainer'}</strong>
                      </span>

                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Eye size={12} />
                        <span>{s.recordingViews || 120} views</span>
                      </span>
                    </div>

                    {/* Materials tags if any */}
                    {s.materials && s.materials.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                        {s.materials.slice(0, 2).map((m, idx) => (
                          <span
                            key={idx}
                            style={{
                              fontSize: '0.68rem',
                              background: 'var(--bg-card)',
                              border: '1px solid var(--border-subtle)',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              color: 'var(--text-secondary)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <FileText size={10} color="var(--primary)" />
                            {m}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Card Bottom: Progress Status & Actions */}
                  <div style={{ paddingTop: '10px', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                      {isCompleted ? (
                        <span style={{ color: 'var(--success)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle2 size={13} /> Completed
                        </span>
                      ) : isInProgress ? (
                        <span style={{ color: 'var(--primary)' }}>
                          {progress}% Watched
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>
                          Not started
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleShare(s)}
                        title="Copy recording link"
                        style={{ padding: '6px 8px' }}
                      >
                        {copiedSessionId === s.id ? <Check size={14} color="var(--success)" /> : <Share2 size={14} />}
                      </button>

                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => onPlayRecording(s)}
                        style={{ gap: '6px', fontWeight: 700, padding: '6px 14px' }}
                      >
                        <Play size={14} /> Watch
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* LIST VIEW */
        <div
          className="card"
          style={{
            padding: 0,
            overflow: 'hidden',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-secondary)' }}>Lecture Recording</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-secondary)' }}>Course</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-secondary)' }}>Instructor</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-secondary)' }}>Duration</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-secondary)' }}>Date</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-secondary)' }}>Progress</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-secondary)', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {displayedRecordings.map((s) => {
                  const progress = s.watchProgressPercentage ?? 0;
                  const isCompleted = progress === 100;

                  return (
                    <tr
                      key={s.id}
                      onClick={() => onPlayRecording(s)}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        cursor: 'pointer',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-card)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '14px 16px', fontWeight: 800, color: 'var(--text-main)', maxWidth: '300px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '6px',
                              background: 'rgba(99, 102, 241, 0.15)',
                              color: 'var(--primary)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <Play size={16} />
                          </div>
                          <div>
                            <div>{s.title}</div>
                            {s.agenda && (
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                                {s.agenda.split('\n')[0]}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                        {s.courseTitle || mockCourses.find((c) => c.id === s.courseId)?.title || 'General Curriculum'}
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-main)', fontWeight: 600 }}>
                        {s.instructorName || 'Faculty Trainer'}
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-muted)' }}>
                        {s.durationMinutes || s.duration || 60}m
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {s.date || 'Recent'}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {isCompleted ? (
                          <span className="badge badge-success" style={{ fontSize: '0.72rem' }}>Watched</span>
                        ) : progress > 0 ? (
                          <span className="badge badge-secondary" style={{ fontSize: '0.72rem' }}>{progress}%</span>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Unwatched</span>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleBookmark(s.id);
                              showNotice(s.isBookmarked ? 'Removed from bookmarks' : 'Added to bookmarks');
                            }}
                            title="Bookmark"
                            style={{ padding: '4px 8px' }}
                          >
                            <Bookmark size={14} fill={s.isBookmarked ? 'var(--accent-purple)' : 'none'} color={s.isBookmarked ? 'var(--accent-purple)' : 'currentColor'} />
                          </button>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onPlayRecording(s);
                            }}
                            style={{ padding: '4px 12px', fontSize: '0.78rem' }}
                          >
                            Play
                          </button>
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
  );
};
