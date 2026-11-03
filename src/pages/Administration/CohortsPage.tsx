import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../lib/store';
import { useCohortStore } from '../../lib/cohortStore';
import { usePeopleStore } from '../../lib/peopleStore';
import { mockCourses } from '../../data/mockData';
import { mockUsers } from '../../data/mockUsers';
import { Cohort, User } from '../../types';
import {
  UsersRound, Plus, Search, Calendar, BookOpen, User as UserIcon,
  CheckCircle2, X, Edit2, Users, Clock, Eye, Sparkles,
  MoreVertical, Trash2, ShieldCheck, GraduationCap, AlertTriangle
} from 'lucide-react';
import { CohortDetailsView } from './CohortDetailsView';

export const CohortsPage: React.FC = () => {
  const { user } = useAuthStore();
  const isFaculty = user?.activeRole === 'trainer' || user?.activeRole === 'instructor';
  const isStudent = user?.activeRole === 'student' || user?.activeRole === 'learner' || user?.activeRole === 'guest';
  const [searchParams, setSearchParams] = useSearchParams();

  // Cohorts State from Centralized Store
  const { cohorts, updateCohort, fetchCohorts, isLoading, deleteCohort } = useCohortStore();

  // Live Database People Store
  const { users: peopleUsers, fetchPeople } = usePeopleStore();

  useEffect(() => {
    fetchCohorts();
    fetchPeople();
  }, [fetchCohorts, fetchPeople]);

  // Combine live database users with mock users
  const allUsers = useMemo(() => {
    const live = peopleUsers || [];
    const liveIds = new Set(live.map(u => u.id));
    const liveEmails = new Set(live.map(u => u.email.toLowerCase()));
    const remainingMock = mockUsers.filter(u => !liveIds.has(u.id) && !liveEmails.has(u.email.toLowerCase()));
    return [...live, ...remainingMock];
  }, [peopleUsers]);

  const [search, setSearch] = useState('');
  const [filterCourse, setFilterCourse] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Active Cohort Details View
  const [viewingCohort, setViewingCohort] = useState<Cohort | null>(null);

  // 3-Dots Action Menu State
  const [activeActionMenuId, setActiveActionMenuId] = useState<string | null>(null);

  // Edit Single Cohort Modal
  const [isEditingModalOpen, setIsEditingModalOpen] = useState(false);
  const [editingCohort, setEditingCohort] = useState<Cohort | null>(null);
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editCourseId, setEditCourseId] = useState('crs-001');
  const [editStartDate, setEditStartDate] = useState('2026-03-01');
  const [editEndDate, setEditEndDate] = useState('2026-06-30');
  const [editCapacity, setEditCapacity] = useState(60);

  // Delete / Archive Confirmation Modal
  const [cohortToDelete, setCohortToDelete] = useState<Cohort | null>(null);

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

  // Close action menus when clicking outside
  useEffect(() => {
    const handleDocumentClick = () => {
      setActiveActionMenuId(null);
    };
    document.addEventListener('click', handleDocumentClick);
    return () => document.removeEventListener('click', handleDocumentClick);
  }, []);

  // Check URL query param: Handle creation toast notification without opening details view
  useEffect(() => {
    const createdParam = searchParams.get('created');

    if (createdParam === 'true') {
      showSuccessToast(
        'Cohort Created Successfully!',
        'The new cohort has been saved and is ready for instruction.'
      );
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('created');
      nextParams.delete('cohortId');
      setSearchParams(nextParams, { replace: true });
      return;
    }

    const cohortIdParam = searchParams.get('cohortId');
    if (cohortIdParam && !viewingCohort) {
      const found = cohorts.find(c => c.id === cohortIdParam);
      if (found) {
        setViewingCohort(found);
      }
    }
  }, [searchParams, cohorts, viewingCohort, setSearchParams]);

  const filteredCohorts = useMemo(() => {
    // Collect all identity tokens for current user to handle hybrid ID/UUID/email mapping
    const userTokens = new Set<string>();
    if (user?.id) userTokens.add(user.id.toLowerCase());
    if (user?.email) userTokens.add(user.email.toLowerCase());
    if (user?.rollNo) userTokens.add(user.rollNo.toLowerCase());
    if (user?.displayName) userTokens.add(user.displayName.toLowerCase());

    // Well-known demo persona cross-mappings for robust persistence
    if (
      user?.email?.toLowerCase() === 'trainer@lms.demo' ||
      user?.id === 'u-004' ||
      user?.id === 'b7db11e7-1f51-4a37-b965-c21819f4a350'
    ) {
      userTokens.add('b7db11e7-1f51-4a37-b965-c21819f4a350');
      userTokens.add('u-004');
      userTokens.add('trainer@lms.demo');
      userTokens.add('dr. james wilson');
      userTokens.add('dr. james wilson (trainer)');
      userTokens.add('james wilson');
    }
    if (
      user?.email?.toLowerCase() === 'student@lms.demo' ||
      user?.id === 'u-001' ||
      user?.id === 'f3d3c131-4b70-47d2-b3e2-ccd4d412e855'
    ) {
      userTokens.add('f3d3c131-4b70-47d2-b3e2-ccd4d412e855');
      userTokens.add('u-001');
      userTokens.add('student@lms.demo');
      userTokens.add('alex thompson');
    }

    return cohorts.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.code.toLowerCase().includes(search.toLowerCase());

      const matchesCourse = filterCourse === 'all' || c.courseId === filterCourse;
      const matchesStatus = filterStatus === 'all' || c.status === filterStatus;

      // Faculty filter: show cohorts assigned to this trainer
      let matchesFaculty = !isFaculty;
      if (isFaculty && user) {
        const rawInstructors = [
          ...(Array.isArray(c.instructors) ? c.instructors : c.instructors ? [c.instructors] : []),
          ...(Array.isArray(c.instructorIds) ? c.instructorIds : c.instructorIds ? [c.instructorIds] : []),
        ];

        const hasInstructorMatch = rawInstructors.some((item) => {
          if (!item) return false;
          if (typeof item === 'string') {
            return userTokens.has(item.toLowerCase());
          }
          if (typeof item === 'object') {
            const val = (item as any).id || (item as any).userId || (item as any).email || (item as any).name;
            return val && userTokens.has(String(val).toLowerCase());
          }
          return false;
        });

        const hasMemberInstructorMatch = Array.isArray((c as any).members) && (c as any).members.some((m: any) => {
          const mRole = (m.role || '').toLowerCase();
          const isTrainerRole = mRole === 'instructor' || mRole === 'trainer' || mRole === 'lead';
          if (!isTrainerRole) return false;
          const mId = m.userId || m.user?.id || m.user?.email;
          return mId && userTokens.has(String(mId).toLowerCase());
        });

        const isDefaultDemoMatch =
          userTokens.has('trainer@lms.demo') &&
          (c.id === 'coh-001' || c.id === 'coh-002' || c.id === 'coh-004');

        matchesFaculty = Boolean(hasInstructorMatch || hasMemberInstructorMatch || isDefaultDemoMatch);
      }

      // Student filter: show cohorts this student is enrolled in
      let matchesStudent = !isStudent;
      if (isStudent && user) {
        const studentIdsList = Array.isArray(c.studentIds) ? c.studentIds : [];
        const hasStudentIdMatch = studentIdsList.some((sid) => typeof sid === 'string' && userTokens.has(sid.toLowerCase()));
        const hasMemberStudentMatch = Array.isArray((c as any).members) && (c as any).members.some((m: any) => {
          const mId = m.userId || m.user?.id || m.user?.email || m.user?.rollNo;
          return mId && userTokens.has(String(mId).toLowerCase());
        });
        const isStudentDemoMatch = userTokens.has('student@lms.demo') && (c.id === 'coh-001' || studentIdsList.includes('u-001'));

        matchesStudent = Boolean(hasStudentIdMatch || hasMemberStudentMatch || isStudentDemoMatch);
      }

      return matchesSearch && matchesCourse && matchesStatus && matchesFaculty && matchesStudent;
    });
  }, [cohorts, search, filterCourse, filterStatus, isFaculty, isStudent, user]);

  // Statistics — Accurately scoped to current viewer role
  const stats = useMemo(() => {
    // When viewed by a Trainer (Faculty), stats must reflect assigned cohorts
    const targetCohorts = isFaculty ? filteredCohorts : cohorts;
    const total = targetCohorts.length;
    const active = targetCohorts.filter(c => c.status === 'active').length;
    const totalEnrolled = targetCohorts.reduce((acc, c) => acc + (c.studentIds ? c.studentIds.length : (c.learnerCount || 0)), 0);
    const withFaculty = targetCohorts.filter(c => {
      const trainerId = c.instructorIds?.[0] || c.instructors?.[0];
      return Boolean(trainerId);
    }).length;

    return { total, active, totalEnrolled, withFaculty };
  }, [cohorts, filteredCohorts, isFaculty]);

  // Handle Updates from Cohort Details View
  const handleUpdateCohort = (updated: Cohort) => {
    updateCohort(updated);
    if (viewingCohort?.id === updated.id) {
      setViewingCohort(updated);
    }
  };

  const handleOpenEdit = (c: Cohort) => {
    setActiveActionMenuId(null);
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

  const handleConfirmDelete = async () => {
    if (!cohortToDelete) return;
    const code = cohortToDelete.code;
    await deleteCohort(cohortToDelete.id);
    setCohortToDelete(null);
    showSuccessToast('Cohort Archived', `Cohort ${code} has been archived successfully.`);
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
          isFacultyViewer={isFaculty || isStudent}
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
            marginBottom: '20px',
            boxShadow: '0 10px 25px -5px rgba(16, 185, 129, 0.15)',
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
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#10b981',
                flexShrink: 0
              }}
            >
              <CheckCircle2 size={22} strokeWidth={2.5} />
            </div>
            <div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>
                {toastNotification.title}
              </div>
              {toastNotification.subtext && (
                <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {toastNotification.subtext}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => setToastNotification(null)}
            className="btn btn-ghost btn-sm"
            style={{ padding: '6px', color: 'var(--text-muted)' }}
            title="Dismiss notification"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Clean Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: 'var(--text-main)' }}>
            {isFaculty ? 'Assigned Classes & Cohorts' : isStudent ? 'My Enrolled Classes & Cohorts' : 'Classes & Cohorts'}
          </h1>
          <p className="text-secondary text-sm" style={{ margin: '4px 0 0 0' }}>
            {isFaculty
              ? 'View class schedules, student rosters, and instruction details for your batches'
              : isStudent
              ? 'View your enrolled academic batches, class schedules, and faculty leads'
              : 'Manage student cohorts, faculty leads, and enrollment capacity'}
          </p>
        </div>

        {isFaculty ? (
          <Link to="/attendance" className="btn btn-secondary">
            <Calendar size={16} /> View Timetable
          </Link>
        ) : isStudent ? null : (
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
            <Plus size={16} /> New Cohort
          </Link>
        )}
      </div>

      {/* Overview Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '22px' }}>
        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'var(--primary-light)',
            color: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <UsersRound size={22} />
          </div>
          <div>
            <div className="text-muted text-xs font-semibold" style={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Cohorts
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.2 }}>
              {stats.total}
            </div>
            <div className="text-xs" style={{ color: 'var(--success)', marginTop: '2px' }}>
              {stats.active} Active Batches
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'rgba(16, 185, 129, 0.12)',
            color: '#10b981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <GraduationCap size={22} />
          </div>
          <div>
            <div className="text-muted text-xs font-semibold" style={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Enrolled Students
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.2 }}>
              {stats.totalEnrolled}
            </div>
            <div className="text-muted text-xs" style={{ marginTop: '2px' }}>
              Across all cohorts
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'rgba(99, 102, 241, 0.12)',
            color: '#6366f1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <ShieldCheck size={22} />
          </div>
          <div>
            <div className="text-muted text-xs font-semibold" style={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Faculty Assigned
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.2 }}>
              {stats.withFaculty} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 500 }}>/ {stats.total}</span>
            </div>
            <div className="text-xs" style={{ color: stats.withFaculty === stats.total ? 'var(--success)' : 'var(--warning)', marginTop: '2px' }}>
              {stats.total > 0 ? Math.round((stats.withFaculty / stats.total) * 100) : 0}% Assigned
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '14px 18px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search by cohort name or batch code..."
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
              <option value="all">All Courses</option>
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

          <span className="badge badge-draft" style={{ fontWeight: 600, padding: '6px 12px' }}>
            {filteredCohorts.length} {filteredCohorts.length === 1 ? 'Cohort' : 'Cohorts'}
          </span>
        </div>
      </div>

      {/* Main Cohorts Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Cohort Batch</th>
              <th>Course Track</th>
              <th>Lead Faculty</th>
              <th>Academic Period</th>
              <th>Enrollment</th>
              <th>Status</th>
              <th style={{ textAlign: 'center', width: '80px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredCohorts.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '56px 20px', color: 'var(--text-muted)' }}>
                  <div style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 14px auto'
                  }}>
                    <UsersRound size={28} style={{ opacity: 0.6, color: 'var(--primary)' }} />
                  </div>
                  <p style={{ fontWeight: 700, margin: '0 0 6px 0', fontSize: '1.05rem', color: 'var(--text-main)' }}>
                    {isFaculty ? 'No Assigned Cohorts Found' : isStudent ? 'No Enrolled Cohorts Found' : 'No Cohorts Found'}
                  </p>
                  <p style={{ margin: '0 auto', fontSize: '0.875rem', maxWidth: '440px', lineHeight: 1.5 }}>
                    {isFaculty
                      ? 'You do not have any cohort batches assigned yet. When an institution admin appoints you to a batch, your roster and schedule will appear here.'
                      : isStudent
                      ? 'You are not enrolled in any academic batches yet. Contact your department administrator to get assigned.'
                      : 'No cohorts match your current filters. Adjust your search or create a new cohort batch.'}
                  </p>
                </td>
              </tr>
            ) : (
              filteredCohorts.map((c, index) => {
                const course = mockCourses.find((co) => co.id === c.courseId) || (c as any).course;
                const trainerId = c.instructorIds?.[0] || c.instructors?.[0];
                const trainer = trainerId
                  ? allUsers.find(u => u.id === trainerId || (u.email && u.email.toLowerCase() === String(trainerId).toLowerCase()))
                  : null;
                const currentEnrolled = c.studentIds ? c.studentIds.length : (c.learnerCount || 0);
                const maxCap = c.capacity || 30;
                const percent = Math.min(100, Math.round((currentEnrolled / maxCap) * 100));
                const isNearBottom = index >= filteredCohorts.length - 2;

                return (
                  <tr key={c.id}>
                    <td>
                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
                        onClick={() => {
                          setViewingCohort(c);
                          setSearchParams({ cohortId: c.id });
                        }}
                        title="Click to view full cohort details"
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
                          flexShrink: 0,
                          fontWeight: 700
                        }}>
                          <UsersRound size={18} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.925rem' }}>
                            {c.name}
                          </div>
                          <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--primary)', fontWeight: 600 }}>
                            {c.code}
                          </span>
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{
                            width: '26px',
                            height: '26px',
                            borderRadius: '50%',
                            background: 'var(--primary)',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            flexShrink: 0
                          }}>
                            {trainer.firstName?.[0] || 'T'}
                          </div>
                          <span className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>
                            {trainer.displayName}
                          </span>
                        </div>
                      ) : (
                        <span className="badge badge-draft" style={{ color: 'var(--danger)', borderColor: 'var(--danger-border)' }}>
                          No Faculty Lead
                        </span>
                      )}
                    </td>

                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                        <Calendar size={13} color="var(--text-muted)" />
                        <span>
                          {new Date(c.startDate).toLocaleDateString([], { month: 'short', year: 'numeric' })} &ndash;{' '}
                          {new Date(c.endDate).toLocaleDateString([], { month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </td>

                    <td style={{ minWidth: '150px' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px', fontWeight: 600 }}>
                          <span>{currentEnrolled} / {maxCap}</span>
                          <span className="text-muted text-xs">{percent}%</span>
                        </div>
                        <div className="progress-bar-bg" style={{ height: '6px', borderRadius: '3px' }}>
                          <div
                            className="progress-bar-fill"
                            style={{
                              width: `${percent}%`,
                              borderRadius: '3px',
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
                      <span className={`badge badge-${c.status === 'active' ? 'active' : 'draft'}`}>
                        {c.status}
                      </span>
                    </td>

                    <td style={{ textAlign: 'center' }}>
                      <div className="action-menu-container" style={{ display: 'inline-block' }}>
                        <button
                          type="button"
                          className={`action-menu-trigger ${activeActionMenuId === c.id ? 'active' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveActionMenuId(activeActionMenuId === c.id ? null : c.id);
                          }}
                          title="Actions"
                        >
                          <MoreVertical size={16} />
                        </button>

                        {activeActionMenuId === c.id && (
                          <div
                            className={`action-menu-dropdown ${isNearBottom ? 'position-top' : 'position-bottom'}`}
                            onClick={(e) => e.stopPropagation()}
                            style={{ minWidth: '160px' }}
                          >
                            <button
                              type="button"
                              className="action-menu-item"
                              onClick={() => {
                                setActiveActionMenuId(null);
                                setViewingCohort(c);
                                setSearchParams({ cohortId: c.id });
                              }}
                            >
                              <Eye size={14} />
                              <span>View Details</span>
                            </button>

                            {!isFaculty && !isStudent && (
                              <>
                                <button
                                  type="button"
                                  className="action-menu-item"
                                  onClick={() => handleOpenEdit(c)}
                                >
                                  <Edit2 size={14} />
                                  <span>Edit Cohort</span>
                                </button>

                                <button
                                  type="button"
                                  className="action-menu-item action-menu-item-danger"
                                  onClick={() => {
                                    setActiveActionMenuId(null);
                                    setCohortToDelete(c);
                                  }}
                                >
                                  <Trash2 size={14} />
                                  <span>Archive Cohort</span>
                                </button>
                              </>
                            )}

                            {isFaculty && (
                              <Link
                                to="/attendance"
                                className="action-menu-item"
                                onClick={() => setActiveActionMenuId(null)}
                              >
                                <Clock size={14} />
                                <span>Timetable</span>
                              </Link>
                            )}
                          </div>
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
          <div className="modal-card" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 700 }}>
                Edit Cohort &bull; {editingCohort.code}
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
                  <label className="form-label">Associated Course Track</label>
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

      {/* Archive / Delete Confirmation Modal */}
      {cohortToDelete && (
        <div className="modal-overlay" onClick={() => setCohortToDelete(null)}>
          <div className="modal-card" style={{ maxWidth: '440px', padding: '24px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              background: 'var(--danger-bg)',
              color: 'var(--danger)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto'
            }}>
              <AlertTriangle size={24} />
            </div>

            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 8px 0' }}>
              Archive Cohort {cohortToDelete.code}?
            </h3>

            <p className="text-secondary text-sm" style={{ margin: '0 0 24px 0' }}>
              Are you sure you want to archive <strong>{cohortToDelete.name}</strong>? Students and faculty records will remain preserved in historical academic archives.
            </p>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setCohortToDelete(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleConfirmDelete}
              >
                Archive Cohort
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
