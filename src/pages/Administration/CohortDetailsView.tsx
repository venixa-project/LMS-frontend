import React, { useState, useMemo } from 'react';
import { Cohort, User } from '../../types';
import { mockDepartments, mockCourses } from '../../data/mockData';
import { mockUsers } from '../../data/mockUsers';
import { useCohortStore } from '../../lib/cohortStore';
import {
  ArrowLeft, BookOpen, Calendar, UsersRound, User as UserIcon,
  ShieldCheck, Plus, Trash2, Search, Filter, Edit2, AlertCircle,
  CheckCircle2, Clock, Check, AlertTriangle, X, GraduationCap,
  Sparkles, Layers, UserMinus, UserPlus
} from 'lucide-react';

interface Props {
  cohort: Cohort;
  onBack: () => void;
  onUpdateCohort: (updated: Cohort) => void;
  isFacultyViewer?: boolean;
}

export const CohortDetailsView: React.FC<Props> = ({
  cohort,
  onBack,
  onUpdateCohort,
  isFacultyViewer = false
}) => {
  const {
    removeTrainerFromCohort,
    assignTrainerToCohort,
    removeStudentFromCohort,
    addStudentsToCohort,
    updateCohort
  } = useCohortStore();

  // Modals inside details view
  const [isChangeTrainerModalOpen, setIsChangeTrainerModalOpen] = useState(false);
  const [isAddStudentsModalOpen, setIsAddStudentsModalOpen] = useState(false);
  const [isEditCohortModalOpen, setIsEditCohortModalOpen] = useState(false);
  const [showRemoveTrainerConfirm, setShowRemoveTrainerConfirm] = useState(false);
  const [studentToRemove, setStudentToRemove] = useState<User | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  // Search & Filter for Enrolled Table
  const [enrolledSearch, setEnrolledSearch] = useState('');
  const [enrolledDeptFilter, setEnrolledDeptFilter] = useState('all');

  // Change Trainer Modal States
  const [trainerDeptFilter, setTrainerDeptFilter] = useState('all');
  const [trainerSearch, setTrainerSearch] = useState('');
  const [selectedTrainerIdToAssign, setSelectedTrainerIdToAssign] = useState<string | null>(null);

  // Add Students Modal States
  const [addStudentDeptFilter, setAddStudentDeptFilter] = useState(mockDepartments[0]?.id || 'dep-001');
  const [addStudentSearch, setAddStudentSearch] = useState('');
  const [newlySelectedStudentIds, setNewlySelectedStudentIds] = useState<string[]>([]);
  const [addStudentError, setAddStudentError] = useState<string | null>(null);

  // Edit Basic Details Form States
  const [editName, setEditName] = useState(cohort.name);
  const [editCode, setEditCode] = useState(cohort.code);
  const [editStartDate, setEditStartDate] = useState(cohort.startDate.split('T')[0]);
  const [editEndDate, setEditEndDate] = useState(cohort.endDate.split('T')[0]);
  const [editCapacity, setEditCapacity] = useState(cohort.capacity || 30);
  const [editError, setEditError] = useState<string | null>(null);

  const showNotice = (msg: string) => {
    setNoticeMessage(msg);
    setTimeout(() => setNoticeMessage(null), 4500);
  };

  const associatedCourse = useMemo(() => {
    return mockCourses.find(c => c.id === cohort.courseId);
  }, [cohort.courseId]);

  // Properly check if a trainer is assigned - DO NOT fallback to u-004 when empty!
  const assignedTrainer = useMemo(() => {
    const trainerId = cohort.instructorIds?.[0] || cohort.instructors?.[0];
    if (!trainerId) return null;
    return mockUsers.find(u => u.id === trainerId) || null;
  }, [cohort.instructorIds, cohort.instructors]);

  // All faculty members for reassignment
  const allFaculty = useMemo(() => {
    return mockUsers.filter(u =>
      (u.activeRole === 'trainer' || u.activeRole === 'instructor') &&
      u.status !== 'suspended'
    );
  }, []);

  // Filtered faculty for Change Trainer modal
  const candidateTrainers = useMemo(() => {
    return allFaculty.filter(trainer => {
      const matchesDept = trainerDeptFilter === 'all' || trainer.departmentId === trainerDeptFilter;
      const query = trainerSearch.toLowerCase().trim();
      const matchesSearch =
        !query ||
        trainer.displayName.toLowerCase().includes(query) ||
        trainer.id.toLowerCase().includes(query) ||
        (trainer.specialization && trainer.specialization.toLowerCase().includes(query));
      return matchesDept && matchesSearch;
    });
  }, [allFaculty, trainerDeptFilter, trainerSearch]);

  // All enrolled students full objects
  const enrolledStudents = useMemo(() => {
    const ids = cohort.studentIds || [];
    return ids
      .map(id => mockUsers.find(u => u.id === id))
      .filter((u): u is User => Boolean(u));
  }, [cohort.studentIds]);

  // Filtered enrolled students for the main table
  const displayedEnrolledStudents = useMemo(() => {
    return enrolledStudents.filter(student => {
      const matchesDept = enrolledDeptFilter === 'all' || student.departmentId === enrolledDeptFilter;
      const query = enrolledSearch.toLowerCase().trim();
      const matchesSearch =
        !query ||
        student.displayName.toLowerCase().includes(query) ||
        student.id.toLowerCase().includes(query) ||
        student.email.toLowerCase().includes(query) ||
        (student.rollNo && student.rollNo.toLowerCase().includes(query));
      return matchesDept && matchesSearch;
    });
  }, [enrolledStudents, enrolledDeptFilter, enrolledSearch]);

  // Non-enrolled students available for the "Add Students" modal
  const eligibleNonEnrolledStudents = useMemo(() => {
    const currentEnrolledIds = new Set(cohort.studentIds || []);
    return mockUsers.filter(u =>
      (u.activeRole === 'student' || u.activeRole === 'learner') &&
      !currentEnrolledIds.has(u.id)
    );
  }, [cohort.studentIds]);

  const candidateStudentsForAdd = useMemo(() => {
    return eligibleNonEnrolledStudents.filter(student => {
      const matchesDept = addStudentDeptFilter === 'all' || student.departmentId === addStudentDeptFilter;
      const query = addStudentSearch.toLowerCase().trim();
      const matchesSearch =
        !query ||
        student.displayName.toLowerCase().includes(query) ||
        student.id.toLowerCase().includes(query) ||
        student.email.toLowerCase().includes(query) ||
        (student.rollNo && student.rollNo.toLowerCase().includes(query));
      return matchesDept && matchesSearch;
    });
  }, [eligibleNonEnrolledStudents, addStudentDeptFilter, addStudentSearch]);

  // Department counts breakdown
  const departmentBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    enrolledStudents.forEach(st => {
      const deptId = st.departmentId || 'unassigned';
      const deptName = mockDepartments.find(d => d.id === deptId)?.name || 'General';
      map.set(deptName, (map.get(deptName) || 0) + 1);
    });
    return Array.from(map.entries()).map(([deptName, count]) => ({ deptName, count }));
  }, [enrolledStudents]);

  const currentCapacity = cohort.capacity || 30;
  const currentCount = enrolledStudents.length;
  const remainingSeats = Math.max(0, currentCapacity - currentCount);
  const capacityPercent = Math.min(100, Math.round((currentCount / currentCapacity) * 100));

  // --------------------------------------------------------------------------
  // Trainer Management Handlers
  // --------------------------------------------------------------------------
  const handleConfirmRemoveTrainer = () => {
    if (!assignedTrainer) return;
    const trainerName = assignedTrainer.displayName;

    const res = removeTrainerFromCohort(cohort.id);
    if (res.success) {
      const updatedCohort: Cohort = {
        ...cohort,
        instructors: [],
        instructorIds: [],
        updatedAt: new Date().toISOString()
      };
      onUpdateCohort(updatedCohort);
      showNotice(res.message);
    }
    setShowRemoveTrainerConfirm(false);
  };

  const handleConfirmChangeTrainer = () => {
    if (!selectedTrainerIdToAssign) return;
    const newTrainer = mockUsers.find(u => u.id === selectedTrainerIdToAssign);
    if (!newTrainer) return;

    const res = assignTrainerToCohort(cohort.id, selectedTrainerIdToAssign);
    if (res.success) {
      const updatedCohort: Cohort = {
        ...cohort,
        instructors: [selectedTrainerIdToAssign],
        instructorIds: [selectedTrainerIdToAssign],
        departmentId: newTrainer.departmentId || cohort.departmentId,
        updatedAt: new Date().toISOString()
      };
      onUpdateCohort(updatedCohort);
      showNotice(res.message);
    }
    setIsChangeTrainerModalOpen(false);
    setSelectedTrainerIdToAssign(null);
  };

  // --------------------------------------------------------------------------
  // Student Management Handlers
  // --------------------------------------------------------------------------
  const handleConfirmRemoveStudent = () => {
    if (!studentToRemove) return;
    const studentName = studentToRemove.displayName;

    const res = removeStudentFromCohort(cohort.id, studentToRemove.id);
    if (res.success) {
      const updatedStudentIds = (cohort.studentIds || []).filter(id => id !== studentToRemove.id);
      const updatedCohort: Cohort = {
        ...cohort,
        studentIds: updatedStudentIds,
        learnerCount: updatedStudentIds.length,
        updatedAt: new Date().toISOString()
      };
      onUpdateCohort(updatedCohort);
      showNotice(res.message);
    }
    setStudentToRemove(null);
  };

  const handleToggleAddStudent = (student: User) => {
    if (student.status === 'suspended') return;

    if (newlySelectedStudentIds.includes(student.id)) {
      setNewlySelectedStudentIds(prev => prev.filter(id => id !== student.id));
      setAddStudentError(null);
    } else {
      const totalAfterAdd = currentCount + newlySelectedStudentIds.length + 1;
      if (totalAfterAdd > currentCapacity) {
        setAddStudentError(`Cannot add more students. Reaches maximum section capacity of ${currentCapacity}.`);
        return;
      }
      setNewlySelectedStudentIds(prev => [...prev, student.id]);
      setAddStudentError(null);
    }
  };

  const handleConfirmAddStudents = () => {
    if (newlySelectedStudentIds.length === 0) return;

    const res = addStudentsToCohort(cohort.id, newlySelectedStudentIds);
    if (res.success) {
      const updatedStudentIds = [...(cohort.studentIds || []), ...newlySelectedStudentIds];
      const updatedCohort: Cohort = {
        ...cohort,
        studentIds: updatedStudentIds,
        learnerCount: updatedStudentIds.length,
        updatedAt: new Date().toISOString()
      };
      onUpdateCohort(updatedCohort);
      showNotice(res.message);
      setIsAddStudentsModalOpen(false);
      setNewlySelectedStudentIds([]);
      setAddStudentError(null);
    } else {
      setAddStudentError(res.message);
    }
  };

  // --------------------------------------------------------------------------
  // Basic Cohort Details Edit
  // --------------------------------------------------------------------------
  const handleSaveEditInfo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      setEditError('Cohort name cannot be empty.');
      return;
    }
    if (!editCode.trim()) {
      setEditError('Batch code cannot be empty.');
      return;
    }
    if (new Date(editEndDate) < new Date(editStartDate)) {
      setEditError('End date cannot be earlier than start date.');
      return;
    }
    if (editCapacity < currentCount) {
      setEditError(`Capacity cannot be lower than current enrolled student count (${currentCount}).`);
      return;
    }

    const updatedCohort: Cohort = {
      ...cohort,
      name: editName.trim(),
      code: editCode.trim().toUpperCase(),
      startDate: editStartDate,
      endDate: editEndDate,
      capacity: editCapacity,
      updatedAt: new Date().toISOString()
    };

    const res = updateCohort(updatedCohort);
    if (res.success) {
      onUpdateCohort(updatedCohort);
      showNotice(res.message);
      setIsEditCohortModalOpen(false);
      setEditError(null);
    } else {
      setEditError(res.message);
    }
  };

  return (
    <div>
      {/* Feedback Notice Toast */}
      {noticeMessage && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '24px',
            zIndex: 200,
            background: 'var(--bg-surface)',
            border: '1px solid var(--success-border)',
            borderLeft: '4px solid var(--success)',
            color: 'var(--text-main)',
            padding: '12px 18px',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.875rem',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <CheckCircle2 size={18} color="var(--success)" />
          <span>{noticeMessage}</span>
        </div>
      )}

      {/* Top Navigation & Action Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
        <button
          onClick={onBack}
          className="btn btn-secondary btn-sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <ArrowLeft size={15} /> Back to Cohort Directory
        </button>

        {!isFacultyViewer && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setEditName(cohort.name);
                setEditCode(cohort.code);
                setEditStartDate(cohort.startDate.split('T')[0]);
                setEditEndDate(cohort.endDate.split('T')[0]);
                setEditCapacity(cohort.capacity || 30);
                setIsEditCohortModalOpen(true);
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Edit2 size={14} /> Edit Batch Info
            </button>

            {assignedTrainer ? (
              <>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setSelectedTrainerIdToAssign(assignedTrainer.id);
                    setIsChangeTrainerModalOpen(true);
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <ShieldCheck size={14} /> Change Trainer
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowRemoveTrainerConfirm(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--danger)', borderColor: 'var(--danger-border)' }}
                  title="Remove trainer from this cohort only"
                >
                  <UserMinus size={14} /> Remove Trainer
                </button>
              </>
            ) : (
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  setSelectedTrainerIdToAssign(null);
                  setIsChangeTrainerModalOpen(true);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <UserPlus size={14} /> Assign Faculty Lead
              </button>
            )}

            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                setNewlySelectedStudentIds([]);
                setAddStudentError(null);
                setIsAddStudentsModalOpen(true);
              }}
              disabled={remainingSeats <= 0}
              title={remainingSeats <= 0 ? 'Batch is at maximum capacity' : 'Enroll more students'}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={14} /> Enroll Students
            </button>
          </div>
        )}
      </div>

      {/* Main Cohort Header Banner */}
      <div
        className="card"
        style={{
          padding: '24px',
          marginBottom: '20px',
          background: 'linear-gradient(135deg, var(--bg-card) 0%, rgba(99, 102, 241, 0.08) 100%)',
          border: '1px solid var(--border-light)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <span className="badge badge-primary" style={{ fontFamily: 'var(--font-mono)' }}>
                {cohort.code}
              </span>
              <span className={`badge badge-${cohort.status}`}>
                {cohort.status}
              </span>
              <span className="text-muted text-xs">
                Academic Section
              </span>
            </div>
            <h1 style={{ fontSize: '1.75rem', margin: '0 0 6px 0' }}>
              {cohort.name}
            </h1>
            <p className="text-secondary text-sm" style={{ margin: 0, maxWidth: '680px' }}>
              {associatedCourse?.description || 'Active curriculum program cohort section for enrolled students and assigned instructional team.'}
            </p>
          </div>

          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 18px',
            textAlign: 'right',
            minWidth: '160px'
          }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>
              {currentCount} / {currentCapacity}
            </div>
            <div className="text-muted text-xs font-semibold">
              Enrolled Learners ({remainingSeats} Open Seats)
            </div>
          </div>
        </div>
      </div>

      {/* Warning Notice if NO trainer is assigned */}
      {!assignedTrainer && !isFacultyViewer && (
        <div
          style={{
            background: 'var(--warning-bg)',
            border: '1px solid var(--warning-border)',
            color: 'var(--warning)',
            padding: '14px 18px',
            borderRadius: 'var(--radius-md)',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertTriangle size={20} style={{ flexShrink: 0 }} />
            <div>
              <strong style={{ fontSize: '0.9rem' }}>No Lead Faculty Assigned</strong>
              <div style={{ fontSize: '0.8rem', marginTop: '2px' }}>
                This cohort currently has no assigned instructor. Lectures, evaluations, and grading cannot proceed until a trainer is appointed.
              </div>
            </div>
          </div>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => {
              setSelectedTrainerIdToAssign(null);
              setIsChangeTrainerModalOpen(true);
            }}
          >
            <UserPlus size={14} /> Assign Faculty Now
          </button>
        </div>
      )}

      {/* 4 Metric KPI Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {/* KPI 1: Enrollment Capacity */}
        <div className="card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span className="text-muted text-xs font-semibold">CAPACITY ALLOCATION</span>
            <UsersRound size={16} color="var(--primary)" />
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '6px' }}>
            {capacityPercent}% Filled
          </div>
          <div className="progress-bar-bg" style={{ height: '6px', marginBottom: '6px' }}>
            <div
              className="progress-bar-fill"
              style={{
                width: `${capacityPercent}%`,
                background: capacityPercent >= 100
                  ? 'var(--danger)'
                  : capacityPercent >= 80
                  ? 'var(--warning)'
                  : 'var(--primary)'
              }}
            />
          </div>
          <div className="text-muted text-xs">
            {currentCount} of {currentCapacity} maximum seats taken
          </div>
        </div>

        {/* KPI 2: Assigned Trainer */}
        <div className="card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span className="text-muted text-xs font-semibold">ASSIGNED FACULTY</span>
            <ShieldCheck size={16} color={assignedTrainer ? 'var(--success)' : 'var(--warning)'} />
          </div>
          {assignedTrainer ? (
            <>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {assignedTrainer.displayName}
              </div>
              <div className="text-muted text-xs">
                {mockDepartments.find(d => d.id === assignedTrainer.departmentId)?.name || 'Engineering'} &bull;{' '}
                <code style={{ color: 'var(--text-main)' }}>{assignedTrainer.id}</code>
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--danger)', marginBottom: '2px' }}>
                No Trainer Assigned
              </div>
              <div className="text-muted text-xs">
                Click "Assign Lead Faculty" above
              </div>
            </>
          )}
        </div>

        {/* KPI 3: Associated Course */}
        <div className="card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span className="text-muted text-xs font-semibold">CURRICULUM TRACK</span>
            <BookOpen size={16} color="var(--accent-cyan)" />
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {associatedCourse?.title || 'Course Curriculum'}
          </div>
          <div className="text-muted text-xs">
            {associatedCourse?.category || 'General'} &bull; {associatedCourse?.modules?.length || 3} Modules
          </div>
        </div>

        {/* KPI 4: Academic Period */}
        <div className="card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span className="text-muted text-xs font-semibold">ACADEMIC PERIOD</span>
            <Calendar size={16} color="var(--accent-purple)" />
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '2px' }}>
            {new Date(cohort.startDate).toLocaleDateString([], { month: 'short', year: 'numeric' })} &ndash;{' '}
            {new Date(cohort.endDate).toLocaleDateString([], { month: 'short', year: 'numeric' })}
          </div>
          <div className="text-muted text-xs">
            Status: <span style={{ textTransform: 'capitalize' }}>{cohort.status}</span>
          </div>
        </div>
      </div>

      {/* Trainer Information Card */}
      <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: assignedTrainer ? 'var(--primary-light)' : 'var(--bg-input)',
              color: assignedTrainer ? 'var(--primary)' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '1.1rem'
            }}>
              {assignedTrainer ? `${assignedTrainer.firstName[0]}${assignedTrainer.lastName[0]}` : <UserIcon size={22} />}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '1.1rem', margin: 0 }}>
                  {assignedTrainer ? assignedTrainer.displayName : 'No Lead Instructor Assigned'}
                </h3>
                {assignedTrainer && (
                  <span className="badge badge-active" style={{ fontSize: '0.65rem' }}>
                    Lead Faculty
                  </span>
                )}
              </div>
              <div className="text-muted text-xs" style={{ marginTop: '2px' }}>
                {assignedTrainer ? (
                  <>
                    {mockDepartments.find(d => d.id === assignedTrainer.departmentId)?.name || 'Department'} &bull;{' '}
                    <code>{assignedTrainer.id}</code> &bull; {assignedTrainer.email}
                  </>
                ) : (
                  'Assign a certified trainer to conduct lectures and manage course grading for this cohort.'
                )}
              </div>
            </div>
          </div>

          {!isFacultyViewer && (
            <div style={{ display: 'flex', gap: '8px' }}>
              {assignedTrainer ? (
                <>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setSelectedTrainerIdToAssign(assignedTrainer.id);
                      setIsChangeTrainerModalOpen(true);
                    }}
                  >
                    <ShieldCheck size={13} /> Change Trainer
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setShowRemoveTrainerConfirm(true)}
                    style={{ color: 'var(--danger)', borderColor: 'var(--danger-border)' }}
                    title="Remove trainer from this cohort only"
                  >
                    <UserMinus size={13} /> Remove Trainer
                  </button>
                </>
              ) : (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    setSelectedTrainerIdToAssign(null);
                    setIsChangeTrainerModalOpen(true);
                  }}
                >
                  <UserPlus size={13} /> Assign Trainer
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Enrolled Students Directory & Management Section */}
      <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <GraduationCap size={20} color="var(--primary)" />
              <h2 style={{ fontSize: '1.2rem', margin: 0 }}>
                Enrolled Students Roster
              </h2>
              <span className="badge badge-primary">{enrolledStudents.length} Students</span>
            </div>
            <p className="text-muted text-xs" style={{ margin: '4px 0 0 0' }}>
              Students actively enrolled in this cohort batch across institution departments
            </p>
          </div>

          {/* Department Breakdown Badges */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {departmentBreakdown.map(db => (
              <span key={db.deptName} className="badge badge-draft" style={{ fontSize: '0.725rem' }}>
                {db.deptName}: <strong>{db.count}</strong>
              </span>
            ))}
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search enrolled students by name, email, roll no, or ID..."
              className="form-input"
              style={{ paddingLeft: '36px' }}
              value={enrolledSearch}
              onChange={(e) => setEnrolledSearch(e.target.value)}
            />
          </div>

          <div style={{ minWidth: '200px' }}>
            <select
              className="form-select"
              value={enrolledDeptFilter}
              onChange={(e) => setEnrolledDeptFilter(e.target.value)}
            >
              <option value="all">All Departments ({enrolledStudents.length})</option>
              {mockDepartments.map(d => {
                const count = enrolledStudents.filter(s => s.departmentId === d.id).length;
                return (
                  <option key={d.id} value={d.id}>
                    {d.name} ({count})
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Enrolled Students Table */}
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Student Scholar</th>
                <th>Student ID / Roll No</th>
                <th>Department</th>
                <th>Institutional Email</th>
                <th>Academic Status</th>
                {!isFacultyViewer && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {displayedEnrolledStudents.length === 0 ? (
                <tr>
                  <td colSpan={isFacultyViewer ? 5 : 6} style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <UsersRound size={28} />
                      <span style={{ fontWeight: 600 }}>No students found matching your search.</span>
                      {enrolledStudents.length === 0 && (
                        <p style={{ margin: 0, fontSize: '0.8rem' }}>
                          This batch is currently empty. Click "Enroll Students" to add students across departments.
                        </p>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                displayedEnrolledStudents.map((st) => {
                  const dept = mockDepartments.find(d => d.id === st.departmentId);
                  return (
                    <tr key={st.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: 'var(--primary-light)',
                            color: 'var(--primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.8rem'
                          }}>
                            {st.firstName?.[0] || 'S'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600 }}>{st.displayName}</div>
                            <div className="text-muted text-xs">{st.phone || 'Campus Student'}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <code style={{ fontSize: '0.8rem' }}>{st.rollNo || st.id}</code>
                      </td>
                      <td>
                        <span className="badge badge-draft">
                          {dept?.name || 'General Department'}
                        </span>
                      </td>
                      <td className="text-muted text-xs">
                        {st.email}
                      </td>
                      <td>
                        <span className={`badge badge-${st.status === 'active' ? 'active' : 'draft'}`}>
                          {st.status}
                        </span>
                      </td>
                      {!isFacultyViewer && (
                        <td>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => setStudentToRemove(st)}
                            style={{ color: 'var(--danger)', borderColor: 'var(--danger-border)' }}
                            title="Remove student from this cohort only"
                          >
                            <Trash2 size={13} /> Remove from Cohort
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Change / Assign Trainer Modal */}
      {isChangeTrainerModalOpen && (
        <div className="modal-overlay" onClick={() => setIsChangeTrainerModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: '1.15rem', margin: 0 }}>
                  {assignedTrainer ? 'Reassign Lead Faculty' : 'Appoint Lead Faculty'} for {cohort.name}
                </h3>
                <p className="text-muted text-xs" style={{ margin: '2px 0 0 0' }}>
                  Select an eligible faculty member to take over instruction of this cohort batch
                </p>
              </div>
              <button onClick={() => setIsChangeTrainerModalOpen(false)} style={{ color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '10px' }}>
                <select
                  className="form-select"
                  value={trainerDeptFilter}
                  onChange={(e) => setTrainerDeptFilter(e.target.value)}
                >
                  <option value="all">All Departments</option>
                  {mockDepartments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>

                <input
                  type="text"
                  placeholder="Search faculty by name or ID..."
                  className="form-input"
                  value={trainerSearch}
                  onChange={(e) => setTrainerSearch(e.target.value)}
                />
              </div>

              <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {candidateTrainers.map((trainer) => {
                  const isSelected = selectedTrainerIdToAssign === trainer.id;
                  const isCurrent = (cohort.instructorIds?.[0] || cohort.instructors?.[0]) === trainer.id;
                  const dept = mockDepartments.find(d => d.id === trainer.departmentId);

                  return (
                    <div
                      key={trainer.id}
                      onClick={() => setSelectedTrainerIdToAssign(trainer.id)}
                      style={{
                        padding: '12px 16px',
                        borderRadius: 'var(--radius-md)',
                        background: isSelected ? 'var(--primary-light)' : 'var(--bg-card)',
                        border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          background: isSelected ? 'var(--primary)' : 'var(--bg-surface)',
                          color: isSelected ? '#ffffff' : 'var(--text-main)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700
                        }}>
                          {trainer.firstName?.[0] || 'T'}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{trainer.displayName}</span>
                            <code>{trainer.id}</code>
                            {isCurrent && <span className="badge badge-draft">Current Lead</span>}
                          </div>
                          <div className="text-muted text-xs">
                            {dept?.name || 'General'} &bull; {trainer.specialization || trainer.email}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                      >
                        {isSelected ? <Check size={14} /> : 'Select'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsChangeTrainerModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!selectedTrainerIdToAssign}
                onClick={handleConfirmChangeTrainer}
              >
                Confirm Appointment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION: Remove Trainer Dialog */}
      {showRemoveTrainerConfirm && assignedTrainer && (
        <div className="modal-overlay" onClick={() => setShowRemoveTrainerConfirm(false)}>
          <div className="modal-card" style={{ maxWidth: '440px', padding: '24px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: 'var(--danger-bg)',
              color: 'var(--danger)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px auto'
            }}>
              <UserMinus size={22} />
            </div>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '1.15rem' }}>
              Remove Assigned Trainer?
            </h4>
            <p className="text-secondary text-sm" style={{ margin: '0 0 20px 0' }}>
              Are you sure you want to remove <strong>{assignedTrainer.displayName}</strong> (ID: {assignedTrainer.id}) from cohort <strong>{cohort.name} ({cohort.code})</strong>?
            </p>
            <div style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              marginBottom: '20px',
              textAlign: 'left'
            }}>
              <strong>Account Safety:</strong> The trainer's user account, faculty privileges, and assignments in other courses or cohorts will not be deleted or affected.
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
              <button className="btn btn-secondary" onClick={() => setShowRemoveTrainerConfirm(false)}>
                Keep Trainer
              </button>
              <button className="btn btn-danger" onClick={handleConfirmRemoveTrainer}>
                Yes, Remove Trainer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Add Students Modal */}
      {isAddStudentsModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddStudentsModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '720px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: '1.15rem', margin: 0 }}>Enroll Students into {cohort.name}</h3>
                <p className="text-muted text-xs" style={{ margin: '2px 0 0 0' }}>
                  Available Section Capacity: <strong>{remainingSeats} seats remaining</strong> (Max: {currentCapacity})
                </p>
              </div>
              <button onClick={() => setIsAddStudentsModalOpen(false)} style={{ color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {addStudentError && (
                <div style={{
                  background: 'var(--danger-bg)',
                  border: '1px solid var(--danger-border)',
                  color: 'var(--danger)',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.85rem'
                }}>
                  {addStudentError}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '10px' }}>
                <select
                  className="form-select"
                  value={addStudentDeptFilter}
                  onChange={(e) => setAddStudentDeptFilter(e.target.value)}
                >
                  <option value="all">All Departments</option>
                  {mockDepartments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>

                <input
                  type="text"
                  placeholder="Search scholars by name, roll no, or ID..."
                  className="form-input"
                  value={addStudentSearch}
                  onChange={(e) => setAddStudentSearch(e.target.value)}
                />
              </div>

              <div className="table-container" style={{ maxHeight: '280px', overflowY: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}>Select</th>
                      <th>Scholar</th>
                      <th>Student ID</th>
                      <th>Department</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {candidateStudentsForAdd.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                          No eligible non-enrolled students found for this department.
                        </td>
                      </tr>
                    ) : (
                      candidateStudentsForAdd.map(st => {
                        const isSelected = newlySelectedStudentIds.includes(st.id);
                        const dept = mockDepartments.find(d => d.id === st.departmentId);

                        return (
                          <tr
                            key={st.id}
                            onClick={() => handleToggleAddStudent(st)}
                            style={{
                              cursor: 'pointer',
                              background: isSelected ? 'var(--primary-light)' : undefined
                            }}
                          >
                            <td>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleAddStudent(st)}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </td>
                            <td>
                              <div style={{ fontWeight: 600 }}>{st.displayName}</div>
                              <div className="text-muted text-xs">{st.email}</div>
                            </td>
                            <td>
                              <code>{st.rollNo || st.id}</code>
                            </td>
                            <td>
                              <span className="badge badge-draft">{dept?.name || 'General'}</span>
                            </td>
                            <td>
                              <span className={`badge badge-${st.status === 'active' ? 'active' : 'draft'}`}>
                                {st.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
                <span className="text-muted text-xs">
                  Selected: <strong>{newlySelectedStudentIds.length}</strong> / Max Allowed: <strong>{remainingSeats}</strong>
                </span>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setIsAddStudentsModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={newlySelectedStudentIds.length === 0}
                    onClick={handleConfirmAddStudents}
                  >
                    Enroll {newlySelectedStudentIds.length} Student(s)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Edit Batch Info Modal */}
      {isEditCohortModalOpen && (
        <div className="modal-overlay" onClick={() => setIsEditCohortModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '540px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.15rem', margin: 0 }}>Edit Cohort Information</h3>
              <button onClick={() => setIsEditCohortModalOpen(false)} style={{ color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEditInfo}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {editError && (
                  <div style={{
                    background: 'var(--danger-bg)',
                    border: '1px solid var(--danger-border)',
                    color: 'var(--danger)',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.85rem'
                  }}>
                    {editError}
                  </div>
                )}

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Cohort Name <span className="required">*</span></label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Start Date</label>
                    <input
                      type="date"
                      required
                      className="form-input"
                      value={editStartDate}
                      onChange={(e) => setEditStartDate(e.target.value)}
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
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

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Seat Capacity Limit</label>
                  <input
                    type="number"
                    min={currentCount}
                    className="form-input"
                    value={editCapacity}
                    onChange={(e) => setEditCapacity(parseInt(e.target.value, 10) || currentCount)}
                  />
                  <span className="form-helper">
                    Cannot be set lower than currently enrolled students ({currentCount}).
                  </span>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsEditCohortModalOpen(false)}>
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

      {/* CONFIRMATION: Remove Student Dialog */}
      {studentToRemove && (
        <div className="modal-overlay" onClick={() => setStudentToRemove(null)}>
          <div className="modal-card" style={{ maxWidth: '440px', padding: '24px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: 'var(--danger-bg)',
              color: 'var(--danger)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px auto'
            }}>
              <Trash2 size={20} />
            </div>
            <h4 style={{ margin: '0 0 6px 0', fontSize: '1.1rem' }}>
              Remove Student from Batch?
            </h4>
            <p className="text-secondary text-xs" style={{ margin: '0 0 16px 0' }}>
              Are you sure you want to remove <strong>{studentToRemove.displayName}</strong> (Student ID: {studentToRemove.rollNo || studentToRemove.id}) from cohort <strong>{cohort.name} ({cohort.code})</strong>?
            </p>
            <div style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 12px',
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              marginBottom: '20px',
              textAlign: 'left'
            }}>
              <strong>Account Safety:</strong> This student will be removed from this cohort only. Their account, grades in other courses, and other cohort memberships will remain intact.
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
              <button className="btn btn-secondary" onClick={() => setStudentToRemove(null)}>
                Keep Student
              </button>
              <button className="btn btn-danger" onClick={handleConfirmRemoveStudent}>
                Yes, Remove Student
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
