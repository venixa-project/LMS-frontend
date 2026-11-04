import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { usePeopleStore } from '../../lib/peopleStore';
import { useCohortStore } from '../../lib/cohortStore';
import { useCourseStore } from '../../lib/courseStore';
import { useDepartmentStore } from '../../lib/departmentStore';
import { User, RoleName, UserAccountStatus } from '../../types';
import {
  UserPlus, GraduationCap, Shield, Users, ArrowLeft,
  CheckCircle2, AlertCircle, Sparkles, Building, BookOpen,
  Briefcase, Mail, Phone, Hash, Award, Check, X, GitBranch
} from 'lucide-react';

export const PersonCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { addUser, isEmailTaken } = usePeopleStore();
  const { cohorts } = useCohortStore();
  const { departments, fetchDepartments, isLoading: isDeptsLoading } = useDepartmentStore();

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  // Role Type from Query or Default
  const initialRole = searchParams.get('role');
  const roleMode: 'student' | 'faculty' | 'staff' =
    initialRole === 'faculty' || initialRole === 'trainer'
      ? 'faculty'
      : initialRole === 'staff'
      ? 'staff'
      : 'student';

  const [activeRoleType, setActiveRoleType] = useState<'student' | 'faculty' | 'staff'>(roleMode);

  // Form Fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  
  // Two-tiered Department & Sub-Department selection state
  const mainDepartments = useMemo(() => {
    return departments.filter((d) => !d.parentId);
  }, [departments]);

  const [selectedMainDeptId, setSelectedMainDeptId] = useState<string>('');
  const [selectedSubDeptId, setSelectedSubDeptId] = useState<string>('');

  const availableSubDepartments = useMemo(() => {
    if (!selectedMainDeptId) return [];
    return departments.filter((d) => d.parentId === selectedMainDeptId);
  }, [departments, selectedMainDeptId]);

  // Auto-initialize first main department and sub-department when departments load
  useEffect(() => {
    if (departments.length > 0) {
      if (!selectedMainDeptId || !departments.some((d) => d.id === selectedMainDeptId)) {
        const firstMain = departments.find((d) => !d.parentId) || departments[0];
        if (firstMain) {
          setSelectedMainDeptId(firstMain.id);
          const children = departments.filter((d) => d.parentId === firstMain.id);
          setSelectedSubDeptId(children.length > 0 ? children[0].id : '');
        }
      }
    }
  }, [departments, selectedMainDeptId]);

  const handleMainDeptChange = (newMainId: string) => {
    setSelectedMainDeptId(newMainId);
    const children = departments.filter((d) => d.parentId === newMainId);
    setSelectedSubDeptId(children.length > 0 ? children[0].id : '');
    if (errors.subDepartmentId || errors.departmentId) {
      setErrors((prev) => ({ ...prev, subDepartmentId: '', departmentId: '' }));
    }
  };

  const selectedMainDept = useMemo(() => {
    return departments.find((d) => d.id === selectedMainDeptId);
  }, [departments, selectedMainDeptId]);

  const selectedSubDept = useMemo(() => {
    return departments.find((d) => d.id === selectedSubDeptId);
  }, [departments, selectedSubDeptId]);

  const [status, setStatus] = useState<UserAccountStatus>('active');

  // Student specific
  const [rollNo, setRollNo] = useState('');
  const [cohortName, setCohortName] = useState(cohorts[0]?.name || 'Spring 2026 Engineering');
  const [admissionDate, setAdmissionDate] = useState('2026-10-22');
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');

  // Faculty specific
  const [facultyEmpId, setFacultyEmpId] = useState('');
  const [facultyTitle, setFacultyTitle] = useState('Lead Trainer / Professor');
  const [specialization, setSpecialization] = useState('Full-Stack Software Architecture');
  const [selectedCourses, setSelectedCourses] = useState<string[]>([useCourseStore.getState().courses[0]?.id || '']);

  // Staff specific
  const [staffEmpId, setStaffEmpId] = useState('');
  const [staffRoleTitle, setStaffRoleTitle] = useState('Academic Operations Coordinator');
  const [officeLocation, setOfficeLocation] = useState('Building B, Room 204');

  // UI States
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDiscardPrompt, setShowDiscardPrompt] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{
    name: string;
    email: string;
    role: string;
    temporaryPassword?: string;
    targetTab: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Sync role type if query param changes
  useEffect(() => {
    if (initialRole === 'faculty' || initialRole === 'trainer') {
      setActiveRoleType('faculty');
    } else if (initialRole === 'staff') {
      setActiveRoleType('staff');
    } else if (initialRole === 'student') {
      setActiveRoleType('student');
    }
  }, [initialRole]);

  // Track if form is dirty
  const isDirty = firstName.trim() !== '' || lastName.trim() !== '' || email.trim() !== '';

  const resetAllFormState = (nextRoleType: 'student' | 'faculty' | 'staff') => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
    const firstMain = departments.find((d) => !d.parentId) || departments[0];
    if (firstMain) {
      setSelectedMainDeptId(firstMain.id);
      const children = departments.filter((d) => d.parentId === firstMain.id);
      setSelectedSubDeptId(children.length > 0 ? children[0].id : '');
    }
    setStatus('active');

    setRollNo('');
    setCohortName(cohorts[0]?.name || 'Spring 2026 Engineering');
    setAdmissionDate('2026-10-22');
    setGuardianName('');
    setGuardianPhone('');

    setFacultyEmpId('');
    setFacultyTitle('Lead Trainer / Professor');
    setSpecialization('Full-Stack Software Architecture');
    setSelectedCourses([useCourseStore.getState().courses[0]?.id || '']);

    setStaffEmpId('');
    setStaffRoleTitle('Academic Operations Coordinator');
    setOfficeLocation('Building B, Room 204');

    setErrors({});
    setShowDiscardPrompt(false);

    if (nextRoleType === 'student') {
      setCohortName(cohorts[0]?.name || 'Spring 2026 Engineering');
      setAdmissionDate('2026-10-22');
    }
  };

  const handleRoleSwitch = (nextRoleType: 'student' | 'faculty' | 'staff') => {
    if (nextRoleType === activeRoleType) return;
    setActiveRoleType(nextRoleType);
    resetAllFormState(nextRoleType);
  };

  const handleCancel = () => {
    if (isDirty) {
      setShowDiscardPrompt(true);
    } else {
      navigateBackToPeople();
    }
  };

  const navigateBackToPeople = () => {
    const returnTab = activeRoleType === 'student' ? 'students' : activeRoleType === 'faculty' ? 'faculty' : 'staff';
    navigate(`/people?tab=${returnTab}`);
  };

  const toggleCourseSelection = (courseId: string) => {
    if (selectedCourses.includes(courseId)) {
      setSelectedCourses(selectedCourses.filter((id) => id !== courseId));
    } else {
      setSelectedCourses([...selectedCourses, courseId]);
    }
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!firstName.trim()) {
      errs.firstName = 'First name is required.';
    }
    if (!lastName.trim()) {
      errs.lastName = 'Last name is required.';
    }
    if (!email.trim()) {
      errs.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = 'Please provide a valid email format (e.g., scholar@university.edu).';
    } else if (isEmailTaken(email.trim())) {
      errs.email = 'This email address is already in use by another person.';
    }

    if (activeRoleType === 'student' && !rollNo.trim()) {
      errs.rollNo = 'Student Roll Number / Scholar ID is required.';
    }

    if (activeRoleType === 'faculty' && !facultyEmpId.trim()) {
      errs.facultyEmpId = 'Faculty / Employee ID is required.';
    }

    if (activeRoleType === 'staff' && !staffEmpId.trim()) {
      errs.staffEmpId = 'Staff Employee ID is required.';
    }

    if (!selectedMainDeptId) {
      errs.departmentId = 'Please select an academic department / division.';
    }

    if (activeRoleType === 'student' && availableSubDepartments.length > 0 && !selectedSubDeptId) {
      errs.subDepartmentId = 'Please select an academic branch / sub-department for this student.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);

    const activeRole: RoleName =
      activeRoleType === 'student' ? 'learner' : activeRoleType === 'faculty' ? 'trainer' : 'staff';

    const effectiveDepartmentId = selectedSubDeptId || selectedMainDeptId;

    const newUser: User = {
      id: `u-${Date.now()}`,
      email: email.trim(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      displayName: `${firstName.trim()} ${lastName.trim()}`,
      phone: phone.trim() || undefined,
      activeRole,
      roles: [],
      organizationId: 'org-001',
      departmentId: effectiveDepartmentId,
      status,
      mfaEnabled: false,
      rollNo: activeRoleType === 'student' ? rollNo.trim() : undefined,
      specialization: activeRoleType === 'faculty' ? specialization.trim() : (activeRoleType === 'student' && selectedSubDept ? selectedSubDept.name : undefined),
      eligibleCourseIds: activeRoleType === 'faculty' ? selectedCourses : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const res = await addUser(newUser);
    setIsSubmitting(false);

    if (res.success) {
      const targetTab = activeRoleType === 'student' ? 'students' : activeRoleType === 'faculty' ? 'faculty' : 'staff';
      const roleLabel = activeRoleType === 'student' ? 'Student / Scholar' : activeRoleType === 'faculty' ? 'Faculty / Trainer' : 'Administrative Staff';
      if (res.temporaryPassword) {
        setCreatedCredentials({
          name: newUser.displayName,
          email: newUser.email,
          role: roleLabel,
          temporaryPassword: res.temporaryPassword,
          targetTab,
        });
      } else {
        navigate(`/people?tab=${targetTab}&created=true&name=${encodeURIComponent(newUser.displayName)}`);
      }
    } else {
      setErrors({ form: res.message });
    }
  };

  const roleMeta = {
    student: {
      title: 'Enroll New Student / Learner',
      subtitle: 'Create a permanent scholar record, allocate an academic cohort, and provision course access.',
      icon: UserPlus,
      badge: 'Student Onboarding',
      badgeClass: 'badge-primary'
    },
    faculty: {
      title: 'Appoint Faculty / Trainer',
      subtitle: 'Register instructor credentials, designate department chair, and allocate teaching course scopes.',
      icon: GraduationCap,
      badge: 'Faculty Appointment',
      badgeClass: 'badge-warning'
    },
    staff: {
      title: 'Add Administrative Staff Member',
      subtitle: 'Provision administrative access for campus coordinators, examination staff, and academic registrars.',
      icon: Shield,
      badge: 'Staff Provisioning',
      badgeClass: 'badge-draft'
    }
  }[activeRoleType];

  return (
    <div style={{ maxWidth: '980px', margin: '0 auto', paddingBottom: '48px' }}>
      {/* Breadcrumb & Navigation */}
      <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <button
          type="button"
          onClick={handleCancel}
          className="btn btn-secondary btn-sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <ArrowLeft size={14} /> Back to People & Faculty
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          <Link to="/people" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>People & Faculty</Link>
          <span>/</span>
          <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{roleMeta.title}</span>
        </div>
      </div>

      {/* Header Card */}
      <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span className={`badge ${roleMeta.badgeClass}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <roleMeta.icon size={13} /> {roleMeta.badge}
              </span>
            </div>
            <h1 style={{ fontSize: '1.75rem', margin: 0, fontWeight: 700 }}>{roleMeta.title}</h1>
            <p className="text-secondary text-sm" style={{ margin: '4px 0 0 0' }}>{roleMeta.subtitle}</p>
          </div>

          {/* Quick Role Switcher Tabs */}
          <div style={{
            display: 'inline-flex',
            background: 'var(--bg-input)',
            padding: '4px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)'
          }}>
            <button
              type="button"
              onClick={() => handleRoleSwitch('student')}
              style={{
                padding: '6px 14px',
                fontSize: '0.8rem',
                fontWeight: activeRoleType === 'student' ? 700 : 500,
                color: activeRoleType === 'student' ? '#fff' : 'var(--text-muted)',
                background: activeRoleType === 'student' ? 'var(--primary)' : 'transparent',
                borderRadius: 'var(--radius-sm)',
                transition: 'all 0.15s ease'
              }}
            >
              Student
            </button>
            <button
              type="button"
              onClick={() => handleRoleSwitch('faculty')}
              style={{
                padding: '6px 14px',
                fontSize: '0.8rem',
                fontWeight: activeRoleType === 'faculty' ? 700 : 500,
                color: activeRoleType === 'faculty' ? '#fff' : 'var(--text-muted)',
                background: activeRoleType === 'faculty' ? 'var(--primary)' : 'transparent',
                borderRadius: 'var(--radius-sm)',
                transition: 'all 0.15s ease'
              }}
            >
              Faculty / Trainer
            </button>
            <button
              type="button"
              onClick={() => handleRoleSwitch('staff')}
              style={{
                padding: '6px 14px',
                fontSize: '0.8rem',
                fontWeight: activeRoleType === 'staff' ? 700 : 500,
                color: activeRoleType === 'staff' ? '#fff' : 'var(--text-muted)',
                background: activeRoleType === 'staff' ? 'var(--primary)' : 'transparent',
                borderRadius: 'var(--radius-sm)',
                transition: 'all 0.15s ease'
              }}
            >
              Staff Member
            </button>
          </div>
        </div>
      </div>

      {errors.form && (
        <div style={{
          background: 'var(--danger-bg)',
          border: '1px solid var(--danger-border)',
          color: 'var(--danger)',
          padding: '12px 18px',
          borderRadius: 'var(--radius-md)',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '0.875rem'
        }}>
          <AlertCircle size={18} />
          <span>{errors.form}</span>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit}>
        {/* Section 1: Personal & Identification Information */}
        <div className="card" style={{ padding: '24px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px', paddingBottom: '12px', borderBottom: '1px solid var(--border-subtle)' }}>
            <Users size={18} color="var(--primary)" />
            <h3 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 700 }}>Personal & Account Information</h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '16px' }}>
            <div className="form-group">
              <label className="form-label">
                First Name <span className="required">*</span>
              </label>
              <input
                type="text"
                className={`form-input ${errors.firstName ? 'input-error' : ''}`}
                placeholder="e.g. Maya"
                value={firstName}
                onChange={(e) => {
                  setFirstName(e.target.value);
                  if (errors.firstName) setErrors({ ...errors, firstName: '' });
                }}
              />
              {errors.firstName && <span className="form-error-msg">{errors.firstName}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">
                Last Name <span className="required">*</span>
              </label>
              <input
                type="text"
                className={`form-input ${errors.lastName ? 'input-error' : ''}`}
                placeholder="e.g. Angelou"
                value={lastName}
                onChange={(e) => {
                  setLastName(e.target.value);
                  if (errors.lastName) setErrors({ ...errors, lastName: '' });
                }}
              />
              {errors.lastName && <span className="form-error-msg">{errors.lastName}</span>}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">
                Institution Email Address <span className="required">*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="email"
                  className={`form-input ${errors.email ? 'input-error' : ''}`}
                  placeholder="m.angelou@university.edu"
                  style={{ paddingLeft: '36px' }}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors({ ...errors, email: '' });
                  }}
                />
              </div>
              {errors.email ? (
                <span className="form-error-msg">{errors.email}</span>
              ) : (
                <span className="text-muted text-xs">Used for system authentication, MFA codes, and coursework notifications.</span>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Contact Phone Number (Optional)</label>
              <div style={{ position: 'relative' }}>
                <Phone size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="tel"
                  className="form-input"
                  placeholder="+1 (555) 019-2834"
                  style={{ paddingLeft: '36px' }}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Department & Academic Allocation */}
        <div className="card" style={{ padding: '24px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px', paddingBottom: '12px', borderBottom: '1px solid var(--border-subtle)' }}>
            <Building size={18} color="var(--primary)" />
            <h3 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 700 }}>Institutional & Academic Allocation</h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '16px' }}>
            {/* Primary Department / Academic Division */}
            <div className="form-group">
              <label className="form-label">
                Academic Division / Main Department <span className="required">*</span>
              </label>
              <select
                className={`form-select ${errors.departmentId ? 'input-error' : ''}`}
                value={selectedMainDeptId}
                onChange={(e) => handleMainDeptChange(e.target.value)}
                disabled={isDeptsLoading}
              >
                {isDeptsLoading ? (
                  <option value="">Loading academic divisions...</option>
                ) : mainDepartments.length === 0 ? (
                  <option value="">No main departments available</option>
                ) : (
                  mainDepartments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name} ({dept.code}) &bull; {dept._count?.users ?? dept.memberCount ?? 0} active members
                    </option>
                  ))
                )}
              </select>
              {errors.departmentId && <span className="form-error-msg">{errors.departmentId}</span>}
              {mainDepartments.length === 0 && !isDeptsLoading && (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  No departments found. Go to <Link to="/organisation/departments-designations" style={{ color: 'var(--brand-blue)', fontWeight: 600 }}>Departments & Hierarchy</Link> to create one.
                </span>
              )}
            </div>

            {/* Sub-Department / Academic Branch (Specialization) */}
            <div className="form-group">
              <label className="form-label">
                Sub-Department / Academic Branch
                {activeRoleType === 'student' && availableSubDepartments.length > 0 && (
                  <span className="required" style={{ marginLeft: '4px' }}>*</span>
                )}
              </label>
              <select
                className={`form-select ${errors.subDepartmentId ? 'input-error' : ''}`}
                value={selectedSubDeptId}
                onChange={(e) => {
                  setSelectedSubDeptId(e.target.value);
                  if (errors.subDepartmentId) setErrors((prev) => ({ ...prev, subDepartmentId: '' }));
                }}
                disabled={isDeptsLoading || availableSubDepartments.length === 0}
              >
                {availableSubDepartments.length === 0 ? (
                  <option value="">No sub-units &mdash; Direct division enrollment</option>
                ) : (
                  <>
                    <option value="">
                      {activeRoleType === 'student'
                        ? 'Select Academic Branch / Sub-Department *'
                        : 'General Division (No Sub-Unit)'}
                    </option>
                    {availableSubDepartments.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name} ({sub.code}) [Sub-Unit] &bull; {sub._count?.users ?? sub.memberCount ?? 0} active members
                      </option>
                    ))}
                  </>
                )}
              </select>
              {errors.subDepartmentId && <span className="form-error-msg">{errors.subDepartmentId}</span>}
              <span className="text-muted text-xs">
                {availableSubDepartments.length > 0
                  ? 'Assigns scholar to a specific academic branch under the parent division.'
                  : 'This academic division has no sub-units; enrollment is directly under the division.'}
              </span>
            </div>

            {/* Account Status */}
            <div className="form-group">
              <label className="form-label">Account Provisioning Status</label>
              <select
                className="form-select"
                value={status}
                onChange={(e) => setStatus(e.target.value as UserAccountStatus)}
              >
                <option value="pending_approval">Pending Dean / Admin Review</option>
                <option value="invited">Invited (Awaiting Password Setup)</option>
              </select>
            </div>
          </div>

          {/* Academic Hierarchy Path Confirmation */}
          <div style={{
            marginTop: '8px',
            marginBottom: '20px',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md, 8px)',
            background: 'var(--bg-input, rgba(255,255,255,0.03))',
            border: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
            fontSize: '0.85rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <GitBranch size={16} color="var(--primary, #6366f1)" />
              <span style={{ color: 'var(--text-secondary)' }}>Assigned Academic Path:</span>
              <strong style={{ color: 'var(--text-main)' }}>
                {selectedMainDept ? `${selectedMainDept.name} (${selectedMainDept.code})` : 'Unassigned'}
              </strong>
              {selectedSubDept ? (
                <>
                  <span style={{ color: 'var(--primary)', fontWeight: 700 }}>&rarr;</span>
                  <span className="badge badge-primary" style={{ fontWeight: 600 }}>
                    {selectedSubDept.name} ({selectedSubDept.code})
                  </span>
                </>
              ) : (
                <span className="badge badge-secondary" style={{ fontStyle: 'italic' }}>
                  Main Division Only (No Sub-Unit)
                </span>
              )}
            </div>

            <span className="text-muted text-xs">
              {selectedSubDept
                ? `Scholar record will be filed under branch "${selectedSubDept.name}" reporting to "${selectedMainDept?.name}".`
                : `Scholar will be enrolled at the top-level "${selectedMainDept?.name || 'Department'}" division.`}
            </span>
          </div>

          {/* Conditional Role-Specific Fields */}
          {activeRoleType === 'student' && (
            <div style={{ background: 'var(--bg-input)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px', color: 'var(--primary)', fontWeight: 700, fontSize: '0.85rem' }}>
                <Hash size={14} /> Student Academic Records
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginBottom: '14px' }}>
                <div className="form-group">
                  <label className="form-label">
                    Roll Number / Scholar ID <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    className={`form-input ${errors.rollNo ? 'input-error' : ''}`}
                    placeholder="e.g. STU-2026-104"
                    value={rollNo}
                    onChange={(e) => {
                      setRollNo(e.target.value);
                      if (errors.rollNo) setErrors({ ...errors, rollNo: '' });
                    }}
                  />
                  {errors.rollNo && <span className="form-error-msg">{errors.rollNo}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Primary Cohort / Batch Section</label>
                  <select
                    className="form-select"
                    value={cohortName}
                    onChange={(e) => setCohortName(e.target.value)}
                  >
                    {cohorts.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name} ({c.code}) &bull; Cap: {c.capacity}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Admission / Enrollment Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={admissionDate}
                    onChange={(e) => setAdmissionDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Guardian / Contact info */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Emergency / Guardian Contact Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Robert Angelou (Parent)"
                    value={guardianName}
                    onChange={(e) => setGuardianName(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Guardian Emergency Phone</label>
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="+1 555-019-9988"
                    value={guardianPhone}
                    onChange={(e) => setGuardianPhone(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {activeRoleType === 'faculty' && (
            <div style={{ background: 'var(--bg-input)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px', color: 'var(--primary)', fontWeight: 700, fontSize: '0.85rem' }}>
                <Award size={14} /> Faculty Appointment & Teaching Credentials
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginBottom: '16px' }}>
                <div className="form-group">
                  <label className="form-label">
                    Faculty Employee ID <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    className={`form-input ${errors.facultyEmpId ? 'input-error' : ''}`}
                    placeholder="e.g. FAC-2026-055"
                    value={facultyEmpId}
                    onChange={(e) => {
                      setFacultyEmpId(e.target.value);
                      if (errors.facultyEmpId) setErrors({ ...errors, facultyEmpId: '' });
                    }}
                  />
                  {errors.facultyEmpId && <span className="form-error-msg">{errors.facultyEmpId}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Academic Title / Designation</label>
                  <select
                    className="form-select"
                    value={facultyTitle}
                    onChange={(e) => setFacultyTitle(e.target.value)}
                  >
                    <option value="Lead Trainer / Professor">Lead Trainer / Professor</option>
                    <option value="Associate Professor">Associate Professor</option>
                    <option value="Assistant Professor">Assistant Professor</option>
                    <option value="Adjunct Lecturer">Adjunct Lecturer</option>
                    <option value="Industry Fellow">Industry Fellow</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Primary Research / Subject Specialization</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. High-Performance Distributed Computing"
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                  />
                </div>
              </div>

              {/* Permitted Courses Allocation */}
              <div>
                <label className="form-label" style={{ marginBottom: '8px' }}>
                  Permitted Curriculum Teaching Scopes (Select all that apply)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '8px' }}>
                  {useCourseStore.getState().courses.map((crs) => {
                    const isSelected = selectedCourses.includes(crs.id);
                    return (
                      <div
                        key={crs.id}
                        onClick={() => toggleCourseSelection(crs.id)}
                        style={{
                          background: isSelected ? 'rgba(99, 102, 241, 0.1)' : 'var(--bg-card)',
                          border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border-subtle)'}`,
                          borderRadius: 'var(--radius-sm)',
                          padding: '10px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '4px',
                          border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border-subtle)'}`,
                          background: isSelected ? 'var(--primary)' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          flexShrink: 0
                        }}>
                          {isSelected && <Check size={12} strokeWidth={3} />}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {crs.title}
                          </div>
                          <span className="text-muted text-xs">{crs.level} &bull; {crs.category}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeRoleType === 'staff' && (
            <div style={{ background: 'var(--bg-input)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px', color: 'var(--primary)', fontWeight: 700, fontSize: '0.85rem' }}>
                <Briefcase size={14} /> Staff Responsibilities & Office Allocation
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">
                    Staff Employee ID <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    className={`form-input ${errors.staffEmpId ? 'input-error' : ''}`}
                    placeholder="e.g. STF-2026-019"
                    value={staffEmpId}
                    onChange={(e) => {
                      setStaffEmpId(e.target.value);
                      if (errors.staffEmpId) setErrors({ ...errors, staffEmpId: '' });
                    }}
                  />
                  {errors.staffEmpId && <span className="form-error-msg">{errors.staffEmpId}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Administrative Role Title</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Department Academic Registrar"
                    value={staffRoleTitle}
                    onChange={(e) => setStaffRoleTitle(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Assigned Campus Office Location</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Main Administrative Wing, Suite 102"
                    value={officeLocation}
                    onChange={(e) => setOfficeLocation(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="card" style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            Cancel & Return
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
              style={{ minWidth: '170px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              {isSubmitting ? (
                <>Provisioning Member...</>
              ) : (
                <>
                  <CheckCircle2 size={16} /> Complete & Register
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Discard Confirmation Modal */}
      {showDiscardPrompt && (
        <div className="modal-overlay" onClick={() => setShowDiscardPrompt(false)}>
          <div className="modal-card" style={{ maxWidth: '460px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Discard Unsaved Information?</h3>
              <button onClick={() => setShowDiscardPrompt(false)} style={{ color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p className="text-secondary text-sm">
                You have entered details for this new {activeRoleType}. If you leave this page now, your entries will be lost.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowDiscardPrompt(false)}>
                Stay on Form
              </button>
              <button className="btn btn-danger" style={{ background: 'var(--danger)', color: '#fff' }} onClick={navigateBackToPeople}>
                Discard & Leave
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Account Created Successfully - Admin Credential Confirmation Modal */}
      {createdCredentials && (
        <div className="modal-overlay" style={{ zIndex: 1200, backdropFilter: 'blur(6px)', background: 'rgba(5, 7, 18, 0.8)' }}>
          <div
            className="modal-card"
            style={{
              maxWidth: '520px',
              border: '1px solid var(--border-accent)',
              boxShadow: '0 20px 40px -15px rgba(0,0,0,0.7)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header" style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: 'var(--success, #10b981)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 700, color: 'var(--text-main)' }}>Account Created Successfully</h3>
                  <span className="text-muted text-xs">Persistent login credentials provisioned in database</span>
                </div>
              </div>
            </div>

            <div className="modal-body" style={{ padding: '20px 0' }}>
              <div style={{
                background: 'var(--bg-input)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                border: '1px solid var(--border-subtle)',
                marginBottom: '16px'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', rowGap: '10px', fontSize: '0.875rem' }}>
                  <span className="text-muted">Member Name:</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{createdCredentials.name}</span>

                  <span className="text-muted">Login Email:</span>
                  <span style={{ fontWeight: 600, color: 'var(--primary)', wordBreak: 'break-all' }}>{createdCredentials.email}</span>

                  <span className="text-muted">Assigned Role:</span>
                  <span><span className="badge badge-primary">{createdCredentials.role}</span></span>
                </div>
              </div>

              {createdCredentials.temporaryPassword && (
                <div style={{
                  background: 'rgba(99, 102, 241, 0.08)',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  marginBottom: '16px'
                }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Temporary Initial Password
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="text"
                      readOnly
                      value={createdCredentials.temporaryPassword}
                      style={{
                        flex: 1,
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '10px 12px',
                        fontFamily: 'monospace',
                        fontSize: '1.05rem',
                        fontWeight: 700,
                        color: 'var(--text-main)',
                        letterSpacing: '0.05em'
                      }}
                    />
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => {
                        if (createdCredentials.temporaryPassword) {
                          navigator.clipboard.writeText(createdCredentials.temporaryPassword);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2500);
                        }
                      }}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', padding: '10px 16px' }}
                    >
                      {copied ? (
                        <>
                          <Check size={16} /> Copied!
                        </>
                      ) : (
                        <>
                          Copy Password
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              <div style={{
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px 14px',
                display: 'flex',
                gap: '10px',
                fontSize: '0.8rem',
                color: '#fbbf24'
              }}>
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong>Mandatory First-Login Password Change:</strong> The member will be required to set a permanent password upon first sign-in. This temporary password is only visible once and cannot be viewed again after closing this window.
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  const targetTab = createdCredentials.targetTab;
                  const name = createdCredentials.name;
                  setCreatedCredentials(null);
                  navigate(`/people?tab=${targetTab}&created=true&name=${encodeURIComponent(name)}`);
                }}
                style={{ minWidth: '180px' }}
              >
                Done & View in Directory
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
