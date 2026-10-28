import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Cohort, User } from '../../types';
import { mockDepartments, mockCourses } from '../../data/mockData';
import { mockUsers } from '../../data/mockUsers';
import { useCohortStore } from '../../lib/cohortStore';
import {
  ArrowLeft, Check, ChevronRight, ChevronLeft, Calendar, BookOpen,
  User as UserIcon, UsersRound, Search, AlertCircle, Plus,
  Trash2, ShieldCheck, CheckCircle2, AlertTriangle, Layers,
  GraduationCap, Sparkles, X, UserPlus, Filter
} from 'lucide-react';

type WizardStep = 'details' | 'trainer' | 'students' | 'review';

export const CohortCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { addCohort, isBatchCodeUnique } = useCohortStore();

  // Wizard Step State
  const [currentStep, setCurrentStep] = useState<WizardStep>('details');

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

  // Step 3: Student Enrollment
  const [studentDeptFilter, setStudentDeptFilter] = useState<string>(mockDepartments[0]?.id || 'dep-001');
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [studentCapacityNotice, setStudentCapacityNotice] = useState<string | null>(null);

  // Submission error
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filtered Faculty & Students
  const allFaculty = useMemo(() => {
    return mockUsers.filter(u =>
      (u.activeRole === 'trainer' || u.activeRole === 'instructor') &&
      u.status !== 'suspended'
    );
  }, []);

  const allStudents = useMemo(() => {
    return mockUsers.filter(u =>
      (u.activeRole === 'student' || u.activeRole === 'learner')
    );
  }, []);

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
      const deptName = mockDepartments.find(d => d.id === deptId)?.name || 'General / Unassigned';

      if (!map.has(deptId)) {
        map.set(deptId, { departmentName: deptName, students: [] });
      }
      map.get(deptId)!.students.push(student);
    });

    return Array.from(map.values());
  }, [selectedStudentsList]);

  // Filtered Faculty for Step 2
  const filteredFaculty = useMemo(() => {
    return allFaculty.filter(faculty => {
      const matchesDept = trainerDeptFilter === 'all' || faculty.departmentId === trainerDeptFilter;
      const query = trainerSearch.toLowerCase().trim();
      const matchesSearch =
        !query ||
        faculty.displayName.toLowerCase().includes(query) ||
        faculty.id.toLowerCase().includes(query) ||
        (faculty.specialization && faculty.specialization.toLowerCase().includes(query));
      return matchesDept && matchesSearch;
    });
  }, [allFaculty, trainerDeptFilter, trainerSearch]);

  // Filtered Students for Step 3
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

  // --------------------------------------------------------------------------
  // Step 1 Validation & Proceed
  // --------------------------------------------------------------------------
  const validateStep1 = (): boolean => {
    const errors: Record<string, string> = {};

    if (!name.trim()) {
      errors.name = 'Cohort name is required.';
    } else if (name.trim().length < 3) {
      errors.name = 'Cohort name must be at least 3 characters long.';
    }

    if (!code.trim()) {
      errors.code = 'Batch code is required.';
    } else {
      const normalizedCode = code.trim().toUpperCase();
      if (!isBatchCodeUnique(normalizedCode)) {
        errors.code = `Batch code "${normalizedCode}" is already in use. Please enter a unique code.`;
      }
    }

    if (!startDate) {
      errors.startDate = 'Start date is required.';
    }

    if (!endDate) {
      errors.endDate = 'End date is required.';
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (end <= start) {
        errors.endDate = 'End date must be strictly after start date.';
      }
    }

    if (!capacity || capacity < 1) {
      errors.capacity = 'Capacity must be at least 1 student seat.';
    } else if (capacity > 500) {
      errors.capacity = 'Maximum recommended section capacity is 500.';
    }

    setStep1Errors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleProceedFromStep1 = () => {
    if (validateStep1()) {
      setCurrentStep('trainer');
    }
  };

  // --------------------------------------------------------------------------
  // Step 3 Student Toggle & Multi-select
  // --------------------------------------------------------------------------
  const handleToggleStudent = (student: User) => {
    if (student.status === 'suspended') return;

    if (selectedStudentIds.includes(student.id)) {
      setSelectedStudentIds(prev => prev.filter(id => id !== student.id));
      setStudentCapacityNotice(null);
    } else {
      if (selectedStudentIds.length >= capacity) {
        setStudentCapacityNotice(
          `Section capacity limit reached (${capacity} seats). Adjust capacity in Step 1 or remove other students first.`
        );
        return;
      }
      setSelectedStudentIds(prev => [...prev, student.id]);
      setStudentCapacityNotice(null);
    }
  };

  const handleSelectAllVisibleInDept = () => {
    const availableEligible = filteredStudents.filter(s => s.status !== 'suspended');
    const remainingSeats = capacity - selectedStudentIds.length;

    if (remainingSeats <= 0) {
      setStudentCapacityNotice(`Cohort capacity of ${capacity} seats has already been met.`);
      return;
    }

    const toAdd: string[] = [];
    for (const student of availableEligible) {
      if (!selectedStudentIds.includes(student.id)) {
        if (toAdd.length < remainingSeats) {
          toAdd.push(student.id);
        } else {
          break;
        }
      }
    }

    if (toAdd.length > 0) {
      setSelectedStudentIds(prev => [...prev, ...toAdd]);
      if (toAdd.length < availableEligible.length) {
        setStudentCapacityNotice(`Added ${toAdd.length} students up to the maximum capacity of ${capacity} seats.`);
      } else {
        setStudentCapacityNotice(null);
      }
    }
  };

  const handleDeselectAllVisibleInDept = () => {
    const visibleIds = new Set(filteredStudents.map(s => s.id));
    setSelectedStudentIds(prev => prev.filter(id => !visibleIds.has(id)));
    setStudentCapacityNotice(null);
  };

  const handleRemoveSelectedStudent = (studentId: string) => {
    setSelectedStudentIds(prev => prev.filter(id => id !== studentId));
  };

  // --------------------------------------------------------------------------
  // Final Submission
  // --------------------------------------------------------------------------
  const handleFinalSubmit = async () => {
    if (!validateStep1()) {
      setCurrentStep('details');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const newId = `coh-${Date.now().toString().slice(-4)}`;
    const newCohort: Cohort = {
      id: newId,
      name: name.trim(),
      code: code.trim().toUpperCase(),
      organizationId: 'org-001',
      courseId: courseId,
      departmentId: assignedTrainer?.departmentId || studentDeptFilter,
      instructors: assignedTrainerId ? [assignedTrainerId] : [],
      instructorIds: assignedTrainerId ? [assignedTrainerId] : [],
      studentIds: selectedStudentIds,
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate).toISOString(),
      learnerCount: selectedStudentIds.length,
      capacity: capacity,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const res = addCohort(newCohort);
    if (!res.success) {
      setSubmitError(res.message);
      setIsSubmitting(false);
      return;
    }

    // Navigate back to cohorts directory with success status flag (without cohortId so it does not auto-open details)
    navigate('/cohorts?created=true');
  };

  return (
    <div style={{ maxWidth: '1160px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* Top Breadcrumb Navigation & Cancel Action */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <Link
          to="/cohorts"
          className="btn btn-secondary btn-sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <ArrowLeft size={15} /> Back to Classes & Cohorts
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="badge badge-primary">Organisation Management</span>
        </div>
      </div>

      {/* Page Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '2rem', margin: '0 0 6px 0', fontWeight: 800 }}>
          Create New Cohort
        </h1>
        <p className="text-secondary text-sm" style={{ margin: 0 }}>
          Configure class structure, appoint certified lead faculty, and enroll students across academic departments.
        </p>
      </div>

      {/* Stepper Progress Bar */}
      <div className="card" style={{ padding: '16px 24px', marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
          {/* Step 1 */}
          <div
            onClick={() => setCurrentStep('details')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
              opacity: currentStep === 'details' ? 1 : 0.8
            }}
          >
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: currentStep === 'details'
                ? 'var(--primary)'
                : 'var(--success)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.9rem',
              boxShadow: currentStep === 'details' ? '0 0 0 4px var(--primary-light)' : 'none'
            }}>
              {currentStep !== 'details' ? <Check size={18} /> : '1'}
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: currentStep === 'details' ? 'var(--primary)' : 'var(--text-main)' }}>
                Basic Details
              </div>
              <div className="text-muted text-xs">Name, Code, Course & Capacity</div>
            </div>
          </div>

          <ChevronRight size={18} className="text-muted" />

          {/* Step 2 */}
          <div
            onClick={() => {
              if (validateStep1()) setCurrentStep('trainer');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
              opacity: currentStep === 'trainer' ? 1 : 0.8
            }}
          >
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: currentStep === 'trainer'
                ? 'var(--primary)'
                : (currentStep === 'students' || currentStep === 'review')
                ? 'var(--success)'
                : 'var(--bg-input)',
              color: (currentStep === 'trainer' || currentStep === 'students' || currentStep === 'review') ? '#fff' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.9rem',
              boxShadow: currentStep === 'trainer' ? '0 0 0 4px var(--primary-light)' : 'none'
            }}>
              {(currentStep === 'students' || currentStep === 'review') ? <Check size={18} /> : '2'}
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: currentStep === 'trainer' ? 'var(--primary)' : 'var(--text-main)' }}>
                Assign Trainer
              </div>
              <div className="text-muted text-xs">
                {assignedTrainer ? assignedTrainer.displayName : 'Faculty Assignment'}
              </div>
            </div>
          </div>

          <ChevronRight size={18} className="text-muted" />

          {/* Step 3 */}
          <div
            onClick={() => {
              if (validateStep1()) setCurrentStep('students');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
              opacity: currentStep === 'students' ? 1 : 0.8
            }}
          >
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: currentStep === 'students'
                ? 'var(--primary)'
                : currentStep === 'review'
                ? 'var(--success)'
                : 'var(--bg-input)',
              color: (currentStep === 'students' || currentStep === 'review') ? '#fff' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.9rem',
              boxShadow: currentStep === 'students' ? '0 0 0 4px var(--primary-light)' : 'none'
            }}>
              {currentStep === 'review' ? <Check size={18} /> : '3'}
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: currentStep === 'students' ? 'var(--primary)' : 'var(--text-main)' }}>
                Select Students
              </div>
              <div className="text-muted text-xs">
                {selectedStudentIds.length} / {capacity} Enrolled
              </div>
            </div>
          </div>

          <ChevronRight size={18} className="text-muted" />

          {/* Step 4 */}
          <div
            onClick={() => {
              if (validateStep1()) setCurrentStep('review');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
              opacity: currentStep === 'review' ? 1 : 0.8
            }}
          >
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: currentStep === 'review' ? 'var(--primary)' : 'var(--bg-input)',
              color: currentStep === 'review' ? '#fff' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.9rem',
              boxShadow: currentStep === 'review' ? '0 0 0 4px var(--primary-light)' : 'none'
            }}>
              4
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: currentStep === 'review' ? 'var(--primary)' : 'var(--text-main)' }}>
                Review & Confirm
              </div>
              <div className="text-muted text-xs">Final Validation</div>
            </div>
          </div>
        </div>
      </div>

      {/* Error Message Toast */}
      {submitError && (
        <div style={{
          background: 'var(--danger-bg)',
          border: '1px solid var(--danger-border)',
          color: 'var(--danger)',
          padding: '12px 18px',
          borderRadius: 'var(--radius-md)',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <AlertCircle size={18} />
          <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{submitError}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 1: BASIC COHORT DETAILS                                              */}
      {/* ========================================================================= */}
      {currentStep === 'details' && (
        <div className="card" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Layers size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Step 1: Basic Cohort & Batch Details</h2>
              <p className="text-muted text-xs" style={{ margin: '2px 0 0 0' }}>
                Define class identifiers, curriculum track, academic duration, and student seat capacity.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Cohort Name & Batch Code */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) minmax(0, 1.2fr)', gap: '18px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">
                  Cohort / Class Name <span className="required">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Spring 2027 Full-Stack Engineering Cohort"
                  className={`form-input ${step1Errors.name ? 'input-error' : ''}`}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (step1Errors.name) setStep1Errors(prev => ({ ...prev, name: '' }));
                  }}
                />
                {step1Errors.name ? (
                  <span className="form-error" style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
                    {step1Errors.name}
                  </span>
                ) : (
                  <span className="form-helper">The descriptive title shown on student timetables and faculty portals.</span>
                )}
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">
                  Unique Batch Code <span className="required">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. BATCH-2027-CS"
                  className={`form-input ${step1Errors.code ? 'input-error' : ''}`}
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.toUpperCase());
                    if (step1Errors.code) setStep1Errors(prev => ({ ...prev, code: '' }));
                  }}
                  style={{ textTransform: 'uppercase', fontFamily: 'var(--font-mono)', fontWeight: 600 }}
                />
                {step1Errors.code ? (
                  <span className="form-error" style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
                    {step1Errors.code}
                  </span>
                ) : (
                  <span className="form-helper">Unique institutional identifier for transcripts & attendance.</span>
                )}
              </div>
            </div>

            {/* Course Program Selection */}
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
                    {c.title} &bull; {c.category} ({c.status.toUpperCase()})
                  </option>
                ))}
              </select>
              {selectedCourse && (
                <div style={{
                  marginTop: '10px',
                  background: 'var(--bg-input)',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{selectedCourse.title}</div>
                    <div className="text-muted text-xs">{selectedCourse.description}</div>
                  </div>
                  <span className="badge badge-primary">{selectedCourse.category}</span>
                </div>
              )}
            </div>

            {/* Dates & Capacity */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '18px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">
                  Start Date <span className="required">*</span>
                </label>
                <input
                  type="date"
                  className={`form-input ${step1Errors.startDate ? 'input-error' : ''}`}
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (step1Errors.startDate) setStep1Errors(prev => ({ ...prev, startDate: '' }));
                  }}
                />
                {step1Errors.startDate && (
                  <span className="form-error" style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
                    {step1Errors.startDate}
                  </span>
                )}
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">
                  End Date <span className="required">*</span>
                </label>
                <input
                  type="date"
                  className={`form-input ${step1Errors.endDate ? 'input-error' : ''}`}
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    if (step1Errors.endDate) setStep1Errors(prev => ({ ...prev, endDate: '' }));
                  }}
                />
                {step1Errors.endDate && (
                  <span className="form-error" style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
                    {step1Errors.endDate}
                  </span>
                )}
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">
                  Maximum Seat Capacity <span className="required">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  className={`form-input ${step1Errors.capacity ? 'input-error' : ''}`}
                  value={capacity}
                  onChange={(e) => {
                    setCapacity(parseInt(e.target.value, 10) || 0);
                    if (step1Errors.capacity) setStep1Errors(prev => ({ ...prev, capacity: '' }));
                  }}
                />
                {step1Errors.capacity ? (
                  <span className="form-error" style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
                    {step1Errors.capacity}
                  </span>
                ) : (
                  <span className="form-helper">Limit student enrollments for section governance.</span>
                )}
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '32px', paddingTop: '20px', borderTop: '1px solid var(--border-subtle)' }}>
            <Link to="/cohorts" className="btn btn-secondary">
              Cancel
            </Link>

            <button
              type="button"
              className="btn btn-primary"
              onClick={handleProceedFromStep1}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px' }}
            >
              Next: Assign Lead Trainer <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: ASSIGN TRAINER                                                    */}
      {/* ========================================================================= */}
      {currentStep === 'trainer' && (
        <div className="card" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldCheck size={20} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Step 2: Assign Lead Faculty / Trainer</h2>
                <p className="text-muted text-xs" style={{ margin: '2px 0 0 0' }}>
                  Filter instructors by department or search certified faculty to conduct live lectures & evaluations.
                </p>
              </div>
            </div>

            {assignedTrainer && (
              <span className="badge badge-active" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
                Assigned: {assignedTrainer.displayName}
              </span>
            )}
          </div>

          {/* Filter & Search Bar */}
          <div style={{ display: 'flex', gap: '14px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <div style={{ minWidth: '220px' }}>
              <select
                className="form-select"
                value={trainerDeptFilter}
                onChange={(e) => setTrainerDeptFilter(e.target.value)}
              >
                <option value="all">All Departments ({allFaculty.length} Instructors)</option>
                {mockDepartments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search trainers by name, ID, or specialization..."
                className="form-input"
                style={{ paddingLeft: '38px' }}
                value={trainerSearch}
                onChange={(e) => setTrainerSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Trainers Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px', maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
            {filteredFaculty.map((faculty) => {
              const isSelected = assignedTrainerId === faculty.id;
              const dept = mockDepartments.find(d => d.id === faculty.departmentId);

              return (
                <div
                  key={faculty.id}
                  onClick={() => setAssignedTrainerId(isSelected ? null : faculty.id)}
                  style={{
                    border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
                    background: isSelected ? 'var(--primary-light)' : 'var(--bg-surface)',
                    borderRadius: 'var(--radius-md)',
                    padding: '16px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px'
                  }}
                >
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    background: isSelected ? 'var(--primary)' : 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    flexShrink: 0
                  }}>
                    {faculty.firstName[0]}{faculty.lastName[0]}
                  </div>

                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem', color: isSelected ? 'var(--primary)' : 'var(--text-main)' }}>
                        {faculty.displayName}
                      </span>
                      {isSelected && (
                        <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>
                          Selected
                        </span>
                      )}
                    </div>
                    <div className="text-muted text-xs" style={{ margin: '2px 0' }}>
                      {dept?.name || 'Computer Science'} &bull; <code>{faculty.id}</code>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {faculty.specialization || 'Certified Academic Faculty'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '32px', paddingTop: '20px', borderTop: '1px solid var(--border-subtle)' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setCurrentStep('details')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <ChevronLeft size={16} /> Back: Basic Details
            </button>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setAssignedTrainerId(null);
                  setCurrentStep('students');
                }}
              >
                Skip Trainer Assignment
              </button>

              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setCurrentStep('students')}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px' }}
              >
                Next: Select Students <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 3: STUDENT ENROLLMENT                                                */}
      {/* ========================================================================= */}
      {currentStep === 'students' && (
        <div className="card" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <GraduationCap size={20} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Step 3: Student Selection & Multi-Department Roster</h2>
                <p className="text-muted text-xs" style={{ margin: '2px 0 0 0' }}>
                  Filter students by department, verify roll numbers, and populate section roster within the {capacity}-seat limit.
                </p>
              </div>
            </div>

            <div style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '8px 16px',
              textAlign: 'right'
            }}>
              <span style={{ fontSize: '1.15rem', fontWeight: 800, color: selectedStudentIds.length >= capacity ? 'var(--danger)' : 'var(--primary)' }}>
                {selectedStudentIds.length} / {capacity}
              </span>
              <span className="text-muted text-xs" style={{ display: 'block' }}>
                Seats Allocated ({Math.max(0, capacity - selectedStudentIds.length)} Open)
              </span>
            </div>
          </div>

          {/* Capacity warning alert */}
          {studentCapacityNotice && (
            <div style={{
              background: 'var(--warning-bg)',
              border: '1px solid var(--warning-border)',
              color: 'var(--warning)',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              marginBottom: '16px',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <AlertTriangle size={16} />
              <span>{studentCapacityNotice}</span>
            </div>
          )}

          {/* Department breakdown pills */}
          {selectedStudentsByDepartment.length > 0 && (
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <span className="text-muted text-xs font-semibold" style={{ alignSelf: 'center' }}>
                Roster Distribution:
              </span>
              {selectedStudentsByDepartment.map(dept => (
                <span key={dept.departmentName} className="badge badge-draft" style={{ fontSize: '0.75rem' }}>
                  {dept.departmentName}: <strong>{dept.students.length}</strong>
                </span>
              ))}
            </div>
          )}

          {/* Filter & Batch Actions */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ minWidth: '220px' }}>
              <select
                className="form-select"
                value={studentDeptFilter}
                onChange={(e) => setStudentDeptFilter(e.target.value)}
              >
                <option value="all">All Departments ({allStudents.length} Scholars)</option>
                {mockDepartments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
              <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search scholars by name, roll no, or ID..."
                className="form-input"
                style={{ paddingLeft: '36px' }}
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
              />
            </div>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleSelectAllVisibleInDept}
              disabled={selectedStudentIds.length >= capacity}
            >
              Select All Visible
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleDeselectAllVisibleInDept}
            >
              Deselect All Visible
            </button>
          </div>

          {/* Candidate Students Table */}
          <div className="table-container" style={{ maxHeight: '360px', overflowY: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>Select</th>
                  <th>Student Scholar</th>
                  <th>Student ID / Roll No</th>
                  <th>Department</th>
                  <th>Institutional Email</th>
                  <th>Academic Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                      No scholars found matching the selected department filter.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((st) => {
                    const isSelected = selectedStudentIds.includes(st.id);
                    const dept = mockDepartments.find(d => d.id === st.departmentId);

                    return (
                      <tr
                        key={st.id}
                        onClick={() => handleToggleStudent(st)}
                        style={{
                          cursor: 'pointer',
                          background: isSelected ? 'var(--primary-light)' : undefined
                        }}
                      >
                        <td>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleStudent(st)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                              width: '30px',
                              height: '30px',
                              borderRadius: '50%',
                              background: isSelected ? 'var(--primary)' : 'var(--bg-input)',
                              color: isSelected ? '#fff' : 'var(--text-main)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.8rem'
                            }}>
                              {st.firstName[0]}
                            </div>
                            <span style={{ fontWeight: 600 }}>{st.displayName}</span>
                          </div>
                        </td>
                        <td>
                          <code style={{ fontSize: '0.8rem' }}>{st.rollNo || st.id}</code>
                        </td>
                        <td>
                          <span className="badge badge-draft">{dept?.name || 'General Department'}</span>
                        </td>
                        <td className="text-muted text-xs">{st.email}</td>
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

          {/* Action Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '32px', paddingTop: '20px', borderTop: '1px solid var(--border-subtle)' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setCurrentStep('trainer')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <ChevronLeft size={16} /> Back: Assign Trainer
            </button>

            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setCurrentStep('review')}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px' }}
            >
              Next: Final Review & Confirmation <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 4: FINAL REVIEW & CONFIRMATION                                       */}
      {/* ========================================================================= */}
      {currentStep === 'review' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Summary KPI Banner */}
          <div
            className="card"
            style={{
              padding: '24px',
              background: 'linear-gradient(135deg, var(--bg-card) 0%, rgba(99, 102, 241, 0.08) 100%)',
              border: '1px solid var(--border-light)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span className="badge badge-primary" style={{ fontFamily: 'var(--font-mono)' }}>
                    {code.toUpperCase()}
                  </span>
                  <span className="badge badge-active">Ready for Activation</span>
                </div>
                <h2 style={{ fontSize: '1.75rem', margin: '0 0 6px 0' }}>
                  {name}
                </h2>
                <p className="text-secondary text-sm" style={{ margin: 0 }}>
                  Associated with <strong>{selectedCourse?.title}</strong> ({selectedCourse?.category})
                </p>
              </div>

              <div style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 18px',
                textAlign: 'right'
              }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>
                  {selectedStudentIds.length} / {capacity}
                </div>
                <div className="text-muted text-xs font-semibold">
                  Initial Enrolled Scholars
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Verification Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {/* Cohort Schedule Card */}
            <div className="card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <Calendar size={18} color="var(--primary)" />
                <h3 style={{ fontSize: '1.05rem', margin: 0 }}>Cohort Academic Timeline</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px' }}>
                  <span className="text-muted">Start Date:</span>
                  <strong>{new Date(startDate).toLocaleDateString([], { dateStyle: 'medium' })}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px' }}>
                  <span className="text-muted">End Date:</span>
                  <strong>{new Date(endDate).toLocaleDateString([], { dateStyle: 'medium' })}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px' }}>
                  <span className="text-muted">Maximum Seats:</span>
                  <strong>{capacity} Students</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-muted">Curriculum Modules:</span>
                  <strong>{selectedCourse?.modules?.length || 3} Instructional Modules</strong>
                </div>
              </div>
            </div>

            {/* Assigned Trainer Card */}
            <div className="card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <ShieldCheck size={18} color="var(--success)" />
                <h3 style={{ fontSize: '1.05rem', margin: 0 }}>Lead Faculty Instructor</h3>
              </div>
              {assignedTrainer ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '50%',
                    background: 'var(--primary-light)',
                    color: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '1rem'
                  }}>
                    {assignedTrainer.firstName[0]}{assignedTrainer.lastName[0]}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1rem' }}>{assignedTrainer.displayName}</div>
                    <div className="text-muted text-xs">
                      {mockDepartments.find(d => d.id === assignedTrainer.departmentId)?.name || 'Engineering'} &bull; <code>{assignedTrainer.id}</code>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {assignedTrainer.specialization || 'Lead Instructor'}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{
                  background: 'var(--warning-bg)',
                  border: '1px solid var(--warning-border)',
                  color: 'var(--warning)',
                  padding: '12px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.85rem'
                }}>
                  No faculty appointed yet. You can assign a certified trainer later from the cohort management view.
                </div>
              )}
            </div>
          </div>

          {/* Enrolled Students Roster Review */}
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UsersRound size={18} color="var(--primary)" />
                <h3 style={{ fontSize: '1.05rem', margin: 0 }}>
                  Enrolled Students Summary ({selectedStudentIds.length} of {capacity})
                </h3>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setCurrentStep('students')}
              >
                Modify Student List
              </button>
            </div>

            {selectedStudentsList.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No students enrolled in this initial draft. You can add students at any time from the cohort details page.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {selectedStudentsByDepartment.map(dept => (
                  <div key={dept.departmentName} style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '12px' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '8px', color: 'var(--primary)' }}>
                      {dept.departmentName} ({dept.students.length} Students)
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {dept.students.map(st => (
                        <span
                          key={st.id}
                          className="badge badge-secondary"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 8px',
                            fontSize: '0.75rem'
                          }}
                        >
                          {st.displayName} ({st.rollNo || st.id})
                          <button
                            type="button"
                            onClick={() => handleRemoveSelectedStudent(st.id)}
                            style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--text-muted)' }}
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Creation Error Alert */}
          {submitError && (
            <div
              role="alert"
              style={{
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderLeft: '4px solid #ef4444',
                color: 'var(--text-main)',
                padding: '14px 18px',
                borderRadius: '8px',
                marginTop: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}
            >
              <AlertCircle size={20} color="#ef4444" style={{ flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#ef4444' }}>
                  Creation Failed
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {submitError}
                </div>
              </div>
            </div>
          )}

          {/* Action Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '20px', borderTop: '1px solid var(--border-subtle)' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setCurrentStep('students')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <ChevronLeft size={16} /> Back: Edit Students
            </button>

            <div style={{ display: 'flex', gap: '12px' }}>
              <Link to="/cohorts" className="btn btn-secondary">
                Cancel
              </Link>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleFinalSubmit}
                disabled={isSubmitting}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 28px',
                  fontWeight: 700
                }}
              >
                <CheckCircle2 size={16} />
                {isSubmitting ? 'Creating Cohort...' : 'Confirm & Create Cohort'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
