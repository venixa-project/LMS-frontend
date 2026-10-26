import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../lib/store';
import { useCohortStore } from '../../lib/cohortStore';
import { mockCourses } from '../../data/mockData';
import { mockUsers } from '../../data/mockUsers';
import { Cohort } from '../../types';
import {
  UsersRound, Plus, Search, Calendar, BookOpen, User,
  CheckCircle2, X, Edit2, Users, Clock, Eye, Sparkles
} from 'lucide-react';
import { CohortDetailsView } from './CohortDetailsView';

export const CohortsPage: React.FC = () => {
  const { user } = useAuthStore();
  const isFaculty = user?.activeRole === 'trainer' || user?.activeRole === 'instructor';
  const [searchParams, setSearchParams] = useSearchParams();

  // Cohorts State from Centralized Store
  const { cohorts, updateCohort } = useCohortStore();
  const [search, setSearch] = useState('');
  const [filterCourse, setFilterCourse] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Active Cohort Details View
  const [viewingCohort, setViewingCohort] = useState<Cohort | null>(null);

  // Edit Single Cohort Modal
  const [isEditingModalOpen, setIsEditingModalOpen] = useState(false);
  const [editingCohort, setEditingCohort] = useState<Cohort | null>(null);
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editCourseId, setEditCourseId] = useState('crs-001');
  const [editStartDate, setEditStartDate] = useState('2026-03-01');
  const [editEndDate, setEditEndDate] = useState('2026-06-30');
  const [editCapacity, setEditCapacity] = useState(60);

  // Professional Toast Notification
  const [toastNotification, setToastNotification] = useState<{
    title: string;
    subtext?: string;
  } | null>(null);

  const showSuccessToast = (title: string, subtext?: string) => {
    setToastNotification({ title, subtext });
    const timer = setTimeout(() => {
      setToastNotification(prev => (prev?.title === title ? null : prev));
    }, 6000);
    return timer;
  };

  // Check URL query param: Handle creation toast notification without opening details view
  useEffect(() => {
    const createdParam = searchParams.get('created');

    if (createdParam === 'true') {
      showSuccessToast(
        'Cohort Created Successfully!',
        'The new cohort has been created successfully.'
      );
      // Clean query params so refresh doesn't keep showing the toast or retain created/cohortId params
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('created');
      nextParams.delete('cohortId');
      setSearchParams(nextParams, { replace: true });
      return;
    }

    // Only restore viewing cohort if intentionally navigating via cohortId (and not currently viewing)
    const cohortIdParam = searchParams.get('cohortId');
    if (cohortIdParam && !viewingCohort) {
      const found = cohorts.find(c => c.id === cohortIdParam);
      if (found) {
        setViewingCohort(found);
      }
    }
  }, [searchParams, cohorts, viewingCohort, setSearchParams]);

  const filteredCohorts = cohorts.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase());

    const matchesCourse = filterCourse === 'all' || c.courseId === filterCourse;
    const matchesStatus = filterStatus === 'all' || c.status === filterStatus;

    const matchesFaculty = !isFaculty || (
      c.instructors?.includes('u-004') ||
      c.instructors?.includes(user?.id || '') ||
      c.id === 'coh-001' || c.id === 'coh-002' || c.id === 'coh-004'
    );

    return matchesSearch && matchesCourse && matchesStatus && matchesFaculty;
  });

  // Handle Updates from Cohort Details View
  const handleUpdateCohort = (updated: Cohort) => {
    updateCohort(updated);
    if (viewingCohort?.id === updated.id) {
      setViewingCohort(updated);
    }
  };

  const handleOpenEdit = (c: Cohort) => {
    setEditingCohort(c);
    setEditName(c.name);
    setEditCode(c.code);
    setEditCourseId(c.courseId || 'crs-001');
    setEditStartDate(c.startDate.split('T')[0]);
    setEditEndDate(c.endDate.split('T')[0]);
    setEditCapacity(c.capacity || 60);
    setIsEditingModalOpen(true);
  };

  const handleSaveEditModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCohort) return;
    const updated: Cohort = {
      ...editingCohort,
      name: editName,
      code: editCode.toUpperCase(),
      courseId: editCourseId,
      startDate: editStartDate,
      endDate: editEndDate,
      capacity: editCapacity,
      updatedAt: new Date().toISOString()
    };
    handleUpdateCohort(updated);
    setIsEditingModalOpen(false);
    showSuccessToast(
      'Cohort Updated Successfully!',
      `Updated details for cohort ${updated.code}.`
    );
  };

  const handleCloseCohortDetails = () => {
    setViewingCohort(null);
    setSearchParams({});
  };

  // If currently viewing a specific cohort in detail mode:
  if (viewingCohort) {
    return (
      <div>
        <CohortDetailsView
          cohort={viewingCohort}
          onBack={handleCloseCohortDetails}
          onUpdateCohort={handleUpdateCohort}
          isFacultyViewer={isFaculty}
        />
      </div>
    );
  }

  return (
    <div>
      {/* Success Toast Notification */}
      {toastNotification && (
        <div
          role="status"
          aria-live="polite"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            borderLeft: '5px solid #10b981',
            borderRadius: '10px',
            padding: '14px 20px',
            marginBottom: '24px',
            boxShadow: '0 10px 25px -5px rgba(16, 185, 129, 0.15), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            animation: 'fadeIn 0.25s ease-out'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#10b981',
                flexShrink: 0
              }}
            >
              <CheckCircle2 size={24} strokeWidth={2.5} />
            </div>
            <div>
              <div style={{ fontSize: '0.975rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.01em' }}>
                {toastNotification.title}
              </div>
              {toastNotification.subtext && (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {toastNotification.subtext}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => setToastNotification(null)}
            className="btn btn-ghost btn-sm"
            style={{
              padding: '6px',
              borderRadius: '6px',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Dismiss notification"
            aria-label="Dismiss notification"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Header and Action Button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="badge badge-primary">{isFaculty ? 'Faculty Teaching Scope' : 'Organisation Management'}</span>
            <span className="text-muted text-xs">Acme Learning Corp &bull; AY 2026–2027</span>
            {isFaculty && <span className="badge badge-draft">Dr. James Wilson</span>}
          </div>
          <h1 style={{ fontSize: '1.75rem', margin: 0 }}>
            {isFaculty ? 'My Assigned Classes & Batches' : 'Classes, Sections & Cohort Batches'}
          </h1>
          <p className="text-secondary text-sm" style={{ margin: '4px 0 0 0' }}>
            {isFaculty
              ? 'View class schedules, student rosters, and attendance records for batches under your instruction'
              : 'Organize student cohorts, allocate section capacity, assign certified faculty, and manage cross-department enrollment rosters'}
          </p>
        </div>

        {isFaculty ? (
          <Link to="/attendance" className="btn btn-secondary">
            <Calendar size={16} /> View Teaching Timetable
          </Link>
        ) : (
          <Link
            to="/cohorts/new"
            className="btn btn-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.25)'
            }}
          >
            <Plus size={16} /> Create Class / Cohort
          </Link>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search cohorts by name or batch code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '38px' }}
            />
          </div>

          <div style={{ minWidth: '180px' }}>
            <select
              className="form-select"
              value={filterCourse}
              onChange={(e) => setFilterCourse(e.target.value)}
            >
              <option value="all">All Curriculum Courses</option>
              {mockCourses.map(c => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>

          <div style={{ minWidth: '140px' }}>
            <select
              className="form-select"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <span className="text-muted text-xs font-semibold">{filteredCohorts.length} Cohorts Active</span>
        </div>
      </div>

      {/* Main Cohorts Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Class / Cohort Batch</th>
              <th>Curriculum Track</th>
              <th>Assigned Faculty</th>
              <th>Academic Period</th>
              <th>Enrollment & Capacity</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredCohorts.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-muted)' }}>
                  <UsersRound size={32} style={{ margin: '0 auto 8px auto', display: 'block' }} />
                  <p style={{ fontWeight: 600, margin: '0 0 4px 0' }}>No cohorts found</p>
                  <p style={{ margin: 0, fontSize: '0.8rem' }}>Adjust your search terms or create a new class cohort.</p>
                </td>
              </tr>
            ) : (
              filteredCohorts.map((c) => {
                const course = mockCourses.find((co) => co.id === c.courseId);
                const trainerId = c.instructorIds?.[0] || c.instructors?.[0];
                const trainer = trainerId ? mockUsers.find(u => u.id === trainerId) : null;
                const currentEnrolled = c.studentIds ? c.studentIds.length : (c.learnerCount || 0);
                const maxCap = c.capacity || 30;
                const percent = Math.min(100, Math.round((currentEnrolled / maxCap) * 100));

                return (
                  <tr key={c.id}>
                    <td>
                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
                        onClick={() => {
                          setViewingCohort(c);
                          setSearchParams({ cohortId: c.id });
                        }}
                        title="Click to view cohort details and student roster"
                      >
                        <div style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '10px',
                          background: 'var(--primary-light)',
                          color: 'var(--primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <UsersRound size={18} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                            {c.name}
                          </div>
                          <code style={{ fontSize: '0.75rem', color: 'var(--primary)' }}>{c.code}</code>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <BookOpen size={14} color="var(--primary)" />
                        <span className="text-sm font-semibold">{course ? course.title : 'Full Track'}</span>
                      </div>
                    </td>

                    <td>
                      {trainer ? (
                        <span className="badge badge-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <User size={12} /> {trainer.displayName}
                        </span>
                      ) : (
                        <span className="badge badge-draft" style={{ color: 'var(--danger)', borderColor: 'var(--danger-border)' }}>
                          No Trainer Assigned
                        </span>
                      )}
                    </td>

                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.825rem' }}>
                        <Calendar size={13} color="var(--text-muted)" />
                        <span>
                          {new Date(c.startDate).toLocaleDateString([], { month: 'short', year: 'numeric' })} &ndash;{' '}
                          {new Date(c.endDate).toLocaleDateString([], { month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </td>

                    <td style={{ minWidth: '150px' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                          <span>{currentEnrolled} / {maxCap}</span>
                          <span className="text-muted text-xs">{percent}%</span>
                        </div>
                        <div className="progress-bar-bg" style={{ height: '6px' }}>
                          <div
                            className="progress-bar-fill"
                            style={{
                              width: `${percent}%`,
                              background: percent >= 100
                                ? 'var(--danger)'
                                : percent >= 80
                                ? 'var(--warning)'
                                : 'var(--primary)'
                            }}
                          />
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className={`badge badge-${c.status}`}>{c.status}</span>
                    </td>

                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setViewingCohort(c);
                            setSearchParams({ cohortId: c.id });
                          }}
                          title="View complete cohort details, trainer, and student roster"
                          style={{ color: 'var(--primary)', borderColor: 'var(--primary)' }}
                        >
                          <Eye size={13} /> View Details
                        </button>

                        {isFaculty ? (
                          <Link to="/attendance" className="btn btn-secondary btn-sm">
                            <Clock size={13} /> Timetable
                          </Link>
                        ) : (
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleOpenEdit(c)}
                            title="Quick edit cohort info"
                          >
                            <Edit2 size={13} /> Edit
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>



      {/* Quick Edit Single Cohort Modal */}
      {isEditingModalOpen && editingCohort && (
        <div className="modal-overlay" onClick={() => setIsEditingModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '540px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', margin: 0 }}>
                Edit Cohort Details &bull; {editingCohort.code}
              </h3>
              <button onClick={() => setIsEditingModalOpen(false)} style={{ color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEditModal}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Cohort Name <span className="required">*</span></label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Batch Code <span className="required">*</span></label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={editCode}
                    onChange={(e) => setEditCode(e.target.value.toUpperCase())}
                    style={{ textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Associated Course Program</label>
                  <select
                    className="form-select"
                    value={editCourseId}
                    onChange={(e) => setEditCourseId(e.target.value)}
                  >
                    {mockCourses.map((co) => (
                      <option key={co.id} value={co.id}>{co.title}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Start Date</label>
                    <input
                      type="date"
                      required
                      className="form-input"
                      value={editStartDate}
                      onChange={(e) => setEditStartDate(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Date</label>
                    <input
                      type="date"
                      required
                      className="form-input"
                      value={editEndDate}
                      onChange={(e) => setEditEndDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Capacity (Max Seats)</label>
                  <input
                    type="number"
                    min="1"
                    className="form-input"
                    value={editCapacity}
                    onChange={(e) => setEditCapacity(parseInt(e.target.value, 10) || 30)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsEditingModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
