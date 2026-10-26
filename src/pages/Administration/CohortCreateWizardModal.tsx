import React, { useState, useMemo } from 'react';
import { Cohort, Course, Department, User } from '../../types';
import { mockDepartments, mockCourses } from '../../data/mockData';
import { mockUsers } from '../../data/mockUsers';
import {
  X, Check, ChevronRight, ChevronLeft, Calendar, BookOpen,
  User as UserIcon, UsersRound, Search, AlertCircle, Plus,
  Trash2, ShieldCheck, CheckCircle2, AlertTriangle, Layers,
  GraduationCap, Sparkles
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCohortCreated: (newCohort: Cohort) => void;
  existingCohorts: Cohort[];
  currentOrganizationId?: string;
}

type WizardStep = 'details' | 'trainer' | 'students' | 'review';

export const CohortCreateWizardModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onCohortCreated,
  existingCohorts,
  currentOrganizationId = 'org-001'
}) => {
  // Wizard Navigation
  const [currentStep, setCurrentStep] = useState<WizardStep>('details');
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Step 1: Basic Details
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [courseId, setCourseId] = useState<string>(mockCourses[0]?.id || 'crs-001');
  const [startDate, setStartDate] = useState('2026-11-01');
  const [endDate, setEndDate] = useState('2027-02-28');
  const [capacity, setCapacity] = useState<number>(30);
  const [step1Errors, setStep1Errors] = useState<Record<string, string>>({});

  // Step 2: Trainer Assignment
  const [trainerDeptFilter, setTrainerDeptFilter] = useState<string>('all');
  const [trainerSearch, setTrainerSearch] = useState('');
  const [assignedTrainerId, setAssignedTrainerId] = useState<string | null>(null);
  const [trainerError, setTrainerError] = useState<string | null>(null);

  // Step 3: Student Enrollment
  const [studentDeptFilter, setStudentDeptFilter] = useState<string>(mockDepartments[0]?.id || 'dep-001');
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [studentCapacityNotice, setStudentCapacityNotice] = useState<string | null>(null);

  // Institution Departments & All Users
  const institutionDepartments = useMemo(() => {
    return mockDepartments.filter(d => !d.organizationId || d.organizationId === currentOrganizationId);
  }, [currentOrganizationId]);

  const allFaculty = useMemo(() => {
    return mockUsers.filter(u =>
      (u.activeRole === 'trainer' || u.activeRole === 'instructor') &&
      (!u.organizationId || u.organizationId === currentOrganizationId) &&
      u.status !== 'suspended'
    );
  }, [currentOrganizationId]);

  const allStudents = useMemo(() => {
    return mockUsers.filter(u =>
      (u.activeRole === 'student' || u.activeRole === 'learner') &&
      (!u.organizationId || u.organizationId === currentOrganizationId)
    );
  }, [currentOrganizationId]);

  const selectedCourse = useMemo(() => {
    return mockCourses.find(c => c.id === courseId);
  }, [courseId]);

  const assignedTrainer = useMemo(() => {
    return allFaculty.find(f => f.id === assignedTrainerId) || null;
  }, [allFaculty, assignedTrainerId]);

  // Selected students full objects
  const selectedStudentsList = useMemo(() => {
    return selectedStudentIds
      .map(id => allStudents.find(s => s.id === id))
      .filter((s): s is User => Boolean(s));
  }, [selectedStudentIds, allStudents]);

  // Selected students grouped by department
  const selectedStudentsByDepartment = useMemo(() => {
    const map = new Map<string, { departmentName: string; students: User[] }>();

    selectedStudentsList.forEach(student => {
      const deptId = student.departmentId || 'unassigned';
      const deptName = institutionDepartments.find(d => d.id === deptId)?.name || 'General / Unassigned';

      if (!map.has(deptId)) {
        map.set(deptId, { departmentName: deptName, students: [] });
      }
      map.get(deptId)!.students.push(student);
    });

    return Array.from(map.values());
  }, [selectedStudentsList, institutionDepartments]);

  // Filtered trainers for Step 2
  const filteredTrainers = useMemo(() => {
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

  // Filtered students for Step 3
  const filteredStudents = useMemo(() => {
    return allStudents.filter(student => {
      const matchesDept = studentDeptFilter === 'all' || student.departmentId === studentDeptFilter;
      const query = studentSearch.toLowerCase().trim();
      const matchesSearch =
        !query ||
        student.displayName.toLowerCase().includes(query) ||
        student.id.toLowerCase().includes(query) ||
        student.email.toLowerCase().includes(query) ||
        (student.rollNo && student.rollNo.toLowerCase().includes(query));
      return matchesDept && matchesSearch;
    });
  }, [allStudents, studentDeptFilter, studentSearch]);

  // Reset wizard to initial blank state
  const resetForm = () => {
    setCurrentStep('details');
    setName('');
    setCode('');
    setCourseId(mockCourses[0]?.id || 'crs-001');
    setStartDate('2026-11-01');
    setEndDate('2027-02-28');
    setCapacity(30);
    setStep1Errors({});
    setTrainerDeptFilter('all');
    setTrainerSearch('');
    setAssignedTrainerId(null);
    setTrainerError(null);
    setStudentDeptFilter(mockDepartments[0]?.id || 'dep-001');
    setStudentSearch('');
    setSelectedStudentIds([]);
    setStudentCapacityNotice(null);
    setShowDiscardConfirm(false);
  };

  const isFormDirty = Boolean(
    name || code || assignedTrainerId || selectedStudentIds.length > 0
  );

  const handleAttemptClose = () => {
    if (isFormDirty) {
      setShowDiscardConfirm(true);
    } else {
      resetForm();
      onClose();
    }
  };

  const handleConfirmDiscard = () => {
    setShowDiscardConfirm(false);
    resetForm();
    onClose();
  };

  // Step 1 Validation
  const validateStep1 = (): boolean => {
    const errors: Record<string, string> = {};

    if (!name.trim()) {
      errors.name = 'Cohort / Class Name is required.';
    }

    const trimmedCode = code.trim().toUpperCase();
    if (!trimmedCode) {
      errors.code = 'Batch Code is required.';
    } else {
      const isDuplicate = existingCohorts.some(
        c => c.code.trim().toUpperCase() === trimmedCode
      );
      if (isDuplicate) {
        errors.code = `Batch Code "${trimmedCode}" is already in use by an existing cohort.`;
      }
    }

    if (!startDate) {
      errors.startDate = 'Start Date is required.';
    }

    if (!endDate) {
      errors.endDate = 'End Date is required.';
    }

    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      errors.endDate = 'End Date cannot be earlier than Start Date.';
    }

    if (!capacity || capacity < 1) {
      errors.capacity = 'Maximum seat capacity must be at least 1.';
    }

    setStep1Errors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNextFromStep1 = () => {
    if (validateStep1()) {
      // Suggest department for trainer based on course or default
      if (trainerDeptFilter === 'all') {
        setTrainerDeptFilter('dep-001');
      }
      setCurrentStep('trainer');
    }
  };

  // Step 2 Next
  const handleNextFromStep2 = () => {
    if (!assignedTrainerId) {
      setTrainerError('Please select and assign a trainer for this cohort before proceeding.');
      return;
    }
    setTrainerError(null);
    setCurrentStep('students');
  };

  // Step 3 Add / Remove Student
  const handleToggleStudent = (student: User) => {
    if (student.status === 'suspended') {
      return;
    }

    const isAlreadySelected = selectedStudentIds.includes(student.id);

    if (isAlreadySelected) {
      // Remove student
      setSelectedStudentIds(prev => prev.filter(id => id !== student.id));
      setStudentCapacityNotice(null);
    } else {
      // Check maximum seat capacity
      if (selectedStudentIds.length >= capacity) {
        setStudentCapacityNotice(
          `Maximum seat capacity of ${capacity} students has been reached. Increase capacity in Step 1 or remove students to add more.`
        );
        return;
      }
      setSelectedStudentIds(prev => [...prev, student.id]);
      setStudentCapacityNotice(null);
    }
  };

  const handleRemoveSelectedStudent = (studentId: string) => {
    setSelectedStudentIds(prev => prev.filter(id => id !== studentId));
    setStudentCapacityNotice(null);
  };

  // Final Step 4 Submission
  const handleCreateCohort = () => {
    if (!validateStep1()) {
      setCurrentStep('details');
      return;
    }

    if (!assignedTrainerId) {
      setCurrentStep('trainer');
      setTrainerError('Trainer assignment is required.');
      return;
    }

    if (selectedStudentIds.length > capacity) {
      setCurrentStep('students');
      setStudentCapacityNotice(`Selected students (${selectedStudentIds.length}) exceed maximum capacity (${capacity}).`);
      return;
    }

    const newCohort: Cohort = {
      id: `coh-${Date.now()}`,
      name: name.trim(),
      code: code.trim().toUpperCase(),
      organizationId: currentOrganizationId,
      courseId: courseId,
      instructors: [assignedTrainerId],
      instructorIds: [assignedTrainerId],
      departmentId: assignedTrainer?.departmentId || 'dep-001',
      studentIds: selectedStudentIds,
      startDate,
      endDate,
      learnerCount: selectedStudentIds.length,
      capacity,
      status: new Date(startDate) > new Date() ? 'scheduled' : 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onCohortCreated(newCohort);
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  const remainingSeats = Math.max(0, capacity - selectedStudentIds.length);
  const capacityPercent = Math.min(100, Math.round((selectedStudentIds.length / (capacity || 1)) * 100));

  return (
    <div className="modal-overlay" onClick={handleAttemptClose}>
      <div
        className="modal-card"
        style={{
          maxWidth: '840px',
          width: '94%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header" style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent-purple) 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px var(--primary-light)'
              }}
            >
              <UsersRound size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 700 }}>
                  Create New Cohort / Batch
                </h3>
                <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>
                  Multi-Step Workflow
                </span>
              </div>
              <p className="text-muted text-xs" style={{ margin: '2px 0 0 0' }}>
                Configure academic section details, assign certified faculty, and enroll students across departments
              </p>
            </div>
          </div>
          <button
            onClick={handleAttemptClose}
            className="btn btn-secondary btn-sm"
            style={{ padding: '6px', borderRadius: '50%', color: 'var(--text-muted)' }}
            title="Close dialog"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Step Indicator Header */}
        <div
          style={{
            background: 'var(--bg-card)',
            padding: '14px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            overflowX: 'auto'
          }}
        >
          {/* Step 1 Pill */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              opacity: currentStep === 'details' ? 1 : 0.8,
              cursor: 'pointer'
            }}
            onClick={() => setCurrentStep('details')}
          >
            <div
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                background: currentStep === 'details'
                  ? 'var(--primary)'
                  : (name && code ? 'var(--success)' : 'var(--bg-input)'),
                color: currentStep === 'details' || (name && code) ? '#ffffff' : 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: 700,
                border: currentStep === 'details' ? '2px solid var(--primary-light)' : '1px solid var(--border-subtle)'
              }}
            >
              {name && code && currentStep !== 'details' ? <Check size={14} /> : '1'}
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{
                fontSize: '0.8rem',
                fontWeight: 700,
                color: currentStep === 'details' ? 'var(--primary)' : 'var(--text-main)'
              }}>
                1. Cohort Details
              </div>
              <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                Name, course & dates
              </div>
            </div>
          </div>

          <ChevronRight size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />

          {/* Step 2 Pill */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              opacity: currentStep === 'trainer' ? 1 : 0.8,
              cursor: name && code ? 'pointer' : 'default'
            }}
            onClick={() => {
              if (validateStep1()) setCurrentStep('trainer');
            }}
          >
            <div
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                background: currentStep === 'trainer'
                  ? 'var(--primary)'
                  : (assignedTrainerId ? 'var(--success)' : 'var(--bg-input)'),
                color: currentStep === 'trainer' || assignedTrainerId ? '#ffffff' : 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: 700,
                border: currentStep === 'trainer' ? '2px solid var(--primary-light)' : '1px solid var(--border-subtle)'
              }}
            >
              {assignedTrainerId && currentStep !== 'trainer' ? <Check size={14} /> : '2'}
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{
                fontSize: '0.8rem',
                fontWeight: 700,
                color: currentStep === 'trainer' ? 'var(--primary)' : 'var(--text-main)'
              }}>
                2. Assign Trainer
              </div>
              <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                {assignedTrainer ? assignedTrainer.displayName.split(' ')[0] : 'Department faculty'}
              </div>
            </div>
          </div>

          <ChevronRight size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />

          {/* Step 3 Pill */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              opacity: currentStep === 'students' ? 1 : 0.8,
              cursor: assignedTrainerId ? 'pointer' : 'default'
            }}
            onClick={() => {
              if (validateStep1() && assignedTrainerId) setCurrentStep('students');
            }}
          >
            <div
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                background: currentStep === 'students'
                  ? 'var(--primary)'
                  : (selectedStudentIds.length > 0 ? 'var(--success)' : 'var(--bg-input)'),
                color: currentStep === 'students' || selectedStudentIds.length > 0 ? '#ffffff' : 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: 700,
                border: currentStep === 'students' ? '2px solid var(--primary-light)' : '1px solid var(--border-subtle)'
              }}
            >
              {selectedStudentIds.length > 0 && currentStep !== 'students' ? <Check size={14} /> : '3'}
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{
                fontSize: '0.8rem',
                fontWeight: 700,
                color: currentStep === 'students' ? 'var(--primary)' : 'var(--text-main)'
              }}>
                3. Enroll Students
              </div>
              <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                {selectedStudentIds.length} added ({remainingSeats} seats left)
              </div>
            </div>
          </div>

          <ChevronRight size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />

          {/* Step 4 Pill */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              opacity: currentStep === 'review' ? 1 : 0.8,
              cursor: (name && assignedTrainerId) ? 'pointer' : 'default'
            }}
            onClick={() => {
              if (validateStep1() && assignedTrainerId) setCurrentStep('review');
            }}
          >
            <div
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                background: currentStep === 'review' ? 'var(--primary)' : 'var(--bg-input)',
                color: currentStep === 'review' ? '#ffffff' : 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: 700,
                border: currentStep === 'review' ? '2px solid var(--primary-light)' : '1px solid var(--border-subtle)'
              }}
            >
              4
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{
                fontSize: '0.8rem',
                fontWeight: 700,
                color: currentStep === 'review' ? 'var(--primary)' : 'var(--text-main)'
              }}>
                4. Review & Create
              </div>
              <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                Final verification
              </div>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
          {/* STEP 1: Basic Cohort Details */}
          {currentStep === 'details' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{
                background: 'var(--primary-light)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                padding: '14px 16px',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px'
              }}>
                <Sparkles size={20} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                    Step 1: Define Cohort & Academic Scope
                  </h4>
                  <p className="text-secondary text-xs" style={{ margin: '4px 0 0 0' }}>
                    Provide the official cohort name, unique batch registration code, target curriculum, and seat capacity.
                  </p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '16px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">
                    Cohort / Class Name <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Fall 2026 Full-Stack Web Development Batch A"
                    className="form-input"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (step1Errors.name) setStep1Errors({ ...step1Errors, name: '' });
                    }}
                  />
                  {step1Errors.name && (
                    <span className="form-error">
                      <AlertCircle size={12} /> {step1Errors.name}
                    </span>
                  )}
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">
                    Unique Batch Code <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. FSWD-2026-A"
                    className="form-input"
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value.toUpperCase());
                      if (step1Errors.code) setStep1Errors({ ...step1Errors, code: '' });
                    }}
                    style={{ textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}
                  />
                  {step1Errors.code ? (
                    <span className="form-error">
                      <AlertCircle size={12} /> {step1Errors.code}
                    </span>
                  ) : (
                    <span className="form-helper">
                      Unique identifier for schedules & student transcript mapping
                    </span>
                  )}
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">
                  Associated Course Program <span className="required">*</span>
                </label>
                <select
                  className="form-select"
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                >
                  {mockCourses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} ({c.category} &bull; {c.modules?.length || 0} Modules)
                    </option>
                  ))}
                </select>
                {selectedCourse && (
                  <div style={{
                    marginTop: '8px',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.8rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <BookOpen size={14} color="var(--primary)" />
                      <span>{selectedCourse.shortDescription || selectedCourse.description.slice(0, 80) + '...'}</span>
                    </div>
                    <span className="badge badge-primary">{selectedCourse.category}</span>
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">
                    Start Date <span className="required">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    className="form-input"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      if (step1Errors.startDate || step1Errors.endDate) {
                        setStep1Errors({ ...step1Errors, startDate: '', endDate: '' });
                      }
                    }}
                  />
                  {step1Errors.startDate && (
                    <span className="form-error">
                      <AlertCircle size={12} /> {step1Errors.startDate}
                    </span>
                  )}
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">
                    End Date <span className="required">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    className="form-input"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      if (step1Errors.endDate) setStep1Errors({ ...step1Errors, endDate: '' });
                    }}
                  />
                  {step1Errors.endDate && (
                    <span className="form-error">
                      <AlertCircle size={12} /> {step1Errors.endDate}
                    </span>
                  )}
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">
                    Max Seat Capacity <span className="required">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    required
                    className="form-input"
                    value={capacity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setCapacity(isNaN(val) ? 1 : Math.max(1, val));
                      if (step1Errors.capacity) setStep1Errors({ ...step1Errors, capacity: '' });
                    }}
                  />
                  {step1Errors.capacity ? (
                    <span className="form-error">
                      <AlertCircle size={12} /> {step1Errors.capacity}
                    </span>
                  ) : (
                    <span className="form-helper">
                      Maximum student enrollment threshold
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Assign Trainer */}
          {currentStep === 'trainer' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{
                background: 'var(--primary-light)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                padding: '14px 16px',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px'
              }}>
                <ShieldCheck size={20} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                    Step 2: Assign Certified Faculty or Trainer
                  </h4>
                  <p className="text-secondary text-xs" style={{ margin: '4px 0 0 0' }}>
                    Select a department to filter faculty, or search by trainer name or ID. System highlights course eligibility.
                  </p>
                </div>
              </div>

              {trainerError && (
                <div style={{
                  background: 'var(--danger-bg)',
                  border: '1px solid var(--danger-border)',
                  color: 'var(--danger)',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '0.85rem'
                }}>
                  <AlertCircle size={16} />
                  <span>{trainerError}</span>
                </div>
              )}

              {/* Department & Trainer Search Bar */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1.2fr 1.8fr',
                gap: '12px',
                background: 'var(--bg-card)',
                padding: '14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)'
              }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.775rem' }}>
                    Select Department
                  </label>
                  <select
                    className="form-select"
                    value={trainerDeptFilter}
                    onChange={(e) => setTrainerDeptFilter(e.target.value)}
                  >
                    <option value="all">All Institution Departments</option>
                    {institutionDepartments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '0.775rem' }}>
                    Search Trainer (by name or ID)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      placeholder="e.g. Dr. James Wilson, u-004, Python..."
                      className="form-input"
                      style={{ paddingLeft: '36px' }}
                      value={trainerSearch}
                      onChange={(e) => setTrainerSearch(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Assigned Trainer Banner if selected */}
              {assignedTrainer && (
                <div style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid var(--success-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: 'var(--success)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Check size={18} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                        Assigned Trainer: {assignedTrainer.displayName}
                      </div>
                      <div className="text-muted text-xs">
                        ID: <code style={{ color: 'var(--text-main)' }}>{assignedTrainer.id}</code> &bull;{' '}
                        {institutionDepartments.find(d => d.id === assignedTrainer.departmentId)?.name || 'Faculty Department'}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setAssignedTrainerId(null)}
                    style={{ color: 'var(--danger)' }}
                  >
                    Unassign
                  </button>
                </div>
              )}

              {/* Trainer Cards List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '320px', overflowY: 'auto' }}>
                {filteredTrainers.length === 0 ? (
                  <div style={{
                    padding: '36px 20px',
                    textAlign: 'center',
                    background: 'var(--bg-input)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px dashed var(--border-subtle)'
                  }}>
                    <UserIcon size={32} color="var(--text-muted)" style={{ margin: '0 auto 8px auto', display: 'block' }} />
                    <p style={{ fontWeight: 600, margin: '0 0 4px 0', fontSize: '0.9rem' }}>
                      No trainers found
                    </p>
                    <p className="text-muted text-xs" style={{ margin: 0 }}>
                      No faculty members match the selected department or search keyword. Try selecting "All Institution Departments".
                    </p>
                  </div>
                ) : (
                  filteredTrainers.map((trainer) => {
                    const isSelected = assignedTrainerId === trainer.id;
                    const deptName = institutionDepartments.find(d => d.id === trainer.departmentId)?.name || 'General Faculty';
                    const isCourseExpert =
                      trainer.eligibleCourseIds?.includes(courseId) ||
                      selectedCourse?.instructors?.includes(trainer.id);

                    return (
                      <div
                        key={trainer.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '14px 18px',
                          borderRadius: 'var(--radius-md)',
                          background: isSelected ? 'var(--primary-light)' : 'var(--bg-card)',
                          border: isSelected
                            ? '2px solid var(--primary)'
                            : '1px solid var(--border-subtle)',
                          transition: 'var(--transition)',
                          boxShadow: isSelected ? '0 0 12px var(--primary-glow)' : 'none'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <div style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '50%',
                            background: isSelected ? 'var(--primary)' : 'var(--bg-surface)',
                            color: isSelected ? '#ffffff' : 'var(--primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.9rem',
                            border: '1px solid var(--border-subtle)'
                          }}>
                            {trainer.firstName?.[0] || 'T'}{trainer.lastName?.[0] || 'F'}
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontWeight: 700, fontSize: '0.925rem' }}>
                                {trainer.displayName}
                              </span>
                              <code style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {trainer.id}
                              </code>
                              {isCourseExpert ? (
                                <span className="badge badge-active" style={{ fontSize: '0.675rem' }}>
                                  ✓ Course Specialist
                                </span>
                              ) : (
                                <span className="badge badge-primary" style={{ fontSize: '0.675rem' }}>
                                  Eligible Faculty
                                </span>
                              )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
                              <span className="badge badge-draft" style={{ fontSize: '0.7rem' }}>
                                {deptName}
                              </span>
                              <span className="text-muted text-xs">
                                {trainer.specialization || trainer.email}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div>
                          {isSelected ? (
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                              onClick={() => setAssignedTrainerId(null)}
                            >
                              <Check size={14} /> Assigned
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => {
                                setAssignedTrainerId(trainer.id);
                                setTrainerError(null);
                              }}
                            >
                              Assign Trainer
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* STEP 3: Add Students to Cohort */}
          {currentStep === 'students' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{
                background: 'var(--primary-light)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                padding: '14px 16px',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px'
              }}>
                <GraduationCap size={20} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                    Step 3: Multi-Department Student Enrollment
                  </h4>
                  <p className="text-secondary text-xs" style={{ margin: '4px 0 0 0' }}>
                    Select Department A, add students, switch to Department B, and add more. All selections remain safely preserved!
                  </p>
                </div>
              </div>

              {studentCapacityNotice && (
                <div style={{
                  background: 'var(--warning-bg)',
                  border: '1px solid var(--warning-border)',
                  color: 'var(--warning)',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '0.85rem'
                }}>
                  <AlertTriangle size={16} />
                  <span>{studentCapacityNotice}</span>
                </div>
              )}

              {/* Capacity & Selection Metric Bar */}
              <div style={{
                background: 'var(--bg-card)',
                padding: '14px 18px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px'
              }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 700 }}>
                      Selected Students: <span style={{ color: 'var(--primary)' }}>{selectedStudentIds.length}</span> / {capacity}
                    </span>
                    <span className="text-muted text-xs">
                      {remainingSeats} seats remaining ({capacityPercent}% filled)
                    </span>
                  </div>
                  <div className="progress-bar-bg" style={{ height: '7px' }}>
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
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span className="badge badge-primary">
                    {selectedStudentsByDepartment.length} Depts Represented
                  </span>
                  {selectedStudentIds.length > 0 && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        setSelectedStudentIds([]);
                        setStudentCapacityNotice(null);
                      }}
                      style={{ color: 'var(--danger)', fontSize: '0.75rem' }}
                    >
                      Clear All
                    </button>
                  )}
                </div>
              </div>

              {/* Department Dropdown and Student Search */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1.2fr 1.8fr',
                gap: '12px',
                background: 'var(--bg-card)',
                padding: '14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)'
              }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.775rem' }}>
                    Select Department to Browse
                  </label>
                  <select
                    className="form-select"
                    value={studentDeptFilter}
                    onChange={(e) => setStudentDeptFilter(e.target.value)}
                  >
                    <option value="all">All Departments</option>
                    {institutionDepartments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '0.775rem' }}>
                    Search Students (name, roll no, or ID)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      placeholder="e.g. Alex, STU-2026-001, u-007..."
                      className="form-input"
                      style={{ paddingLeft: '36px' }}
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Student Candidate List */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    Available Candidates ({filteredStudents.length} Students Found)
                  </span>
                  <span className="text-muted text-xs">
                    Persistent selection active &bull; Click "+ Add" to enroll
                  </span>
                </div>

                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  maxHeight: '260px',
                  overflowY: 'auto',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '8px',
                  background: 'var(--bg-input)'
                }}>
                  {filteredStudents.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      No students found in this department matching "{studentSearch}".
                    </div>
                  ) : (
                    filteredStudents.map((st) => {
                      const isSelected = selectedStudentIds.includes(st.id);
                      const isSuspended = st.status === 'suspended';
                      const deptName = institutionDepartments.find(d => d.id === st.departmentId)?.name || 'General';
                      const atCapacity = selectedStudentIds.length >= capacity && !isSelected;

                      return (
                        <div
                          key={st.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 14px',
                            borderRadius: 'var(--radius-sm)',
                            background: isSelected ? 'var(--primary-light)' : 'var(--bg-card)',
                            border: isSelected
                              ? '1px solid var(--primary)'
                              : '1px solid var(--border-subtle)',
                            opacity: isSuspended ? 0.6 : 1
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: isSelected ? 'var(--primary)' : 'var(--bg-surface)',
                              color: isSelected ? '#ffffff' : 'var(--text-main)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.8rem'
                            }}>
                              {st.firstName?.[0] || 'S'}
                            </div>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                                  {st.displayName}
                                </span>
                                <code style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                                  {st.rollNo || st.id}
                                </code>
                                {isSuspended && (
                                  <span className="badge badge-danger" style={{ fontSize: '0.65rem' }}>
                                    Suspended
                                  </span>
                                )}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                <span className="badge badge-draft" style={{ fontSize: '0.65rem', padding: '1px 6px' }}>
                                  {deptName}
                                </span>
                                <span>{st.email}</span>
                              </div>
                            </div>
                          </div>

                          <div>
                            {isSelected ? (
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                onClick={() => handleToggleStudent(st)}
                                style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--success)' }}
                              >
                                <Check size={12} /> Added
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                disabled={isSuspended || atCapacity}
                                onClick={() => handleToggleStudent(st)}
                                title={atCapacity ? 'Capacity limit reached' : 'Add student to cohort'}
                              >
                                {atCapacity ? 'Capacity Full' : '+ Add'}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Persistent Selected Students Summary */}
              {selectedStudentsList.length > 0 && (
                <div style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Layers size={15} color="var(--primary)" />
                      <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                        Currently Selected Across Departments ({selectedStudentsList.length} Students)
                      </span>
                    </div>
                    <span className="text-muted text-xs font-semibold">
                      {remainingSeats} seats available
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '120px', overflowY: 'auto' }}>
                    {selectedStudentsList.map((st) => {
                      const deptName = institutionDepartments.find(d => d.id === st.departmentId)?.name || 'General';
                      return (
                        <div
                          key={st.id}
                          style={{
                            background: 'var(--bg-input)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-full)',
                            padding: '4px 10px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '0.75rem'
                          }}
                        >
                          <span style={{ fontWeight: 600 }}>{st.displayName}</span>
                          <span className="badge badge-draft" style={{ fontSize: '0.625rem', padding: '1px 5px' }}>
                            {deptName}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSelectedStudent(st.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--danger)',
                              cursor: 'pointer',
                              padding: 0,
                              display: 'flex',
                              alignItems: 'center'
                            }}
                            title={`Remove ${st.displayName}`}
                          >
                            <X size={12} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: Review and Create Cohort */}
          {currentStep === 'review' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                padding: '16px 20px',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="badge badge-primary">{code}</span>
                    <span className="badge badge-active">Ready to Initialize</span>
                  </div>
                  <h3 style={{ margin: '6px 0 2px 0', fontSize: '1.25rem' }}>{name}</h3>
                  <p className="text-secondary text-xs" style={{ margin: 0 }}>
                    Academic Batch &bull; Acme Learning Corp &bull; Section Registration Review
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>
                    {selectedStudentIds.length} / {capacity}
                  </div>
                  <div className="text-muted text-xs">Total Enrolled Seats</div>
                </div>
              </div>

              {/* Review Parameters Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                {/* Course Details Card */}
                <div style={{
                  background: 'var(--bg-card)',
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <BookOpen size={16} color="var(--primary)" />
                    <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Associated Curriculum</span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                    {selectedCourse?.title || 'Course Program'}
                  </div>
                  <div className="text-muted text-xs" style={{ marginTop: '4px' }}>
                    Category: {selectedCourse?.category} &bull; Modules: {selectedCourse?.modules?.length || 0}
                  </div>
                </div>

                {/* Assigned Trainer Card */}
                <div style={{
                  background: 'var(--bg-card)',
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <ShieldCheck size={16} color="var(--success)" />
                    <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Assigned Faculty Lead</span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                    {assignedTrainer?.displayName || 'No trainer assigned'}
                  </div>
                  <div className="text-muted text-xs" style={{ marginTop: '4px' }}>
                    ID: <code>{assignedTrainer?.id}</code> &bull; Department:{' '}
                    {institutionDepartments.find(d => d.id === assignedTrainer?.departmentId)?.name || 'General'}
                  </div>
                </div>

                {/* Timeline Card */}
                <div style={{
                  background: 'var(--bg-card)',
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <Calendar size={16} color="var(--text-muted)" />
                    <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Academic Period</span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                    {new Date(startDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} &ndash;{' '}
                    {new Date(endDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                  <div className="text-muted text-xs" style={{ marginTop: '4px' }}>
                    Term Duration: {Math.max(1, Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24 * 7)))} weeks
                  </div>
                </div>

                {/* Capacity Card */}
                <div style={{
                  background: 'var(--bg-card)',
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <UsersRound size={16} color="var(--primary)" />
                    <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Seat Allocation</span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                    {selectedStudentIds.length} Students Enrolled ({remainingSeats} Available Seats)
                  </div>
                  <div className="text-muted text-xs" style={{ marginTop: '4px' }}>
                    Max Section Limit: {capacity} Seats
                  </div>
                </div>
              </div>

              {/* Grouped Students Review Table */}
              <div style={{
                background: 'var(--bg-card)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                padding: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <GraduationCap size={16} color="var(--primary)" />
                    <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                      Enrolled Students Grouped by Department ({selectedStudentsList.length})
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setCurrentStep('students')}
                    style={{ fontSize: '0.75rem' }}
                  >
                    Modify Selection
                  </button>
                </div>

                {selectedStudentsByDepartment.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    No students currently added. You can create the cohort now and enroll students later.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {selectedStudentsByDepartment.map((group) => (
                      <div key={group.departmentName} style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          <span className="badge badge-primary" style={{ fontSize: '0.75rem' }}>
                            {group.departmentName}
                          </span>
                          <span className="text-muted text-xs">
                            {group.students.length} student{group.students.length !== 1 ? 's' : ''}
                          </span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px' }}>
                          {group.students.map((st) => (
                            <div
                              key={st.id}
                              style={{
                                background: 'var(--bg-input)',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: 'var(--radius-sm)',
                                padding: '8px 12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                              }}
                            >
                              <div style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                background: 'var(--primary-light)',
                                color: 'var(--primary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.7rem',
                                fontWeight: 700
                              }}>
                                {st.firstName?.[0] || 'S'}
                              </div>
                              <div style={{ overflow: 'hidden' }}>
                                <div style={{ fontWeight: 600, fontSize: '0.8rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                  {st.displayName}
                                </div>
                                <code style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                  {st.rollNo || st.id}
                                </code>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer / Navigation Controls */}
        <div
          className="modal-footer"
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-surface)'
          }}
        >
          <div>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleAttemptClose}
            >
              Cancel
            </button>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            {currentStep !== 'details' && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  if (currentStep === 'trainer') setCurrentStep('details');
                  if (currentStep === 'students') setCurrentStep('trainer');
                  if (currentStep === 'review') setCurrentStep('students');
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <ChevronLeft size={16} /> Back
              </button>
            )}

            {currentStep === 'details' && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleNextFromStep1}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                Next: Assign Trainer <ChevronRight size={16} />
              </button>
            )}

            {currentStep === 'trainer' && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleNextFromStep2}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                Next: Enroll Students <ChevronRight size={16} />
              </button>
            )}

            {currentStep === 'students' && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setCurrentStep('review')}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                Next: Review Batch <ChevronRight size={16} />
              </button>
            )}

            {currentStep === 'review' && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleCreateCohort}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent-purple) 100%)',
                  boxShadow: '0 4px 14px var(--primary-light)'
                }}
              >
                <CheckCircle2 size={16} /> Create Cohort
              </button>
            )}
          </div>
        </div>

        {/* Discard Confirmation Dialog */}
        {showDiscardConfirm && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(5, 8, 16, 0.85)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 110,
              padding: '20px'
            }}
          >
            <div
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-lg)',
                padding: '24px',
                maxWidth: '420px',
                boxShadow: 'var(--shadow-xl)',
                textAlign: 'center'
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'var(--warning-bg)',
                  color: 'var(--warning)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px auto'
                }}
              >
                <AlertTriangle size={24} />
              </div>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '1.1rem' }}>
                Discard Cohort Setup?
              </h4>
              <p className="text-secondary text-xs" style={{ margin: '0 0 20px 0' }}>
                You have unsaved details and student enrollments. Exiting now will discard this configuration.
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowDiscardConfirm(false)}
                >
                  Keep Editing
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleConfirmDiscard}
                >
                  Discard & Exit
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
