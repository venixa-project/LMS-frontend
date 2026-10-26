import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { usePeopleStore } from '../../lib/peopleStore';
import { useCohortStore } from '../../lib/cohortStore';
import { mockDepartments, mockCourses } from '../../data/mockData';
import { User, RoleName, UserAccountStatus } from '../../types';
import {
  UserPlus, GraduationCap, Shield, Users, ArrowLeft,
  CheckCircle2, AlertCircle, Sparkles, Building, BookOpen,
  Briefcase, Mail, Phone, Hash, Award, Check, X
} from 'lucide-react';

export const PersonCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { addUser, isEmailTaken } = usePeopleStore();
  const { cohorts } = useCohortStore();

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
  const [departmentId, setDepartmentId] = useState(mockDepartments[0]?.id || 'dep-001');
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
  const [selectedCourses, setSelectedCourses] = useState<string[]>([mockCourses[0]?.id || 'crs-001']);

  // Staff specific
  const [staffEmpId, setStaffEmpId] = useState('');
  const [staffRoleTitle, setStaffRoleTitle] = useState('Academic Operations Coordinator');
  const [officeLocation, setOfficeLocation] = useState('Building B, Room 204');

  // UI States
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDiscardPrompt, setShowDiscardPrompt] = useState(false);

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
      errs.email = 'Please provide a valid email format (e.g., scholar@acmelearning.edu).';
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

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);

    const activeRole: RoleName =
      activeRoleType === 'student' ? 'learner' : activeRoleType === 'faculty' ? 'trainer' : 'org_admin';

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
      departmentId,
      status,
      mfaEnabled: false,
      rollNo: activeRoleType === 'student' ? rollNo.trim() : undefined,
      specialization: activeRoleType === 'faculty' ? specialization.trim() : undefined,
      eligibleCourseIds: activeRoleType === 'faculty' ? selectedCourses : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const res = addUser(newUser);

    setTimeout(() => {
      setIsSubmitting(false);
      if (res.success) {
        const targetTab = activeRoleType === 'student' ? 'students' : activeRoleType === 'faculty' ? 'faculty' : 'staff';
        navigate(`/people?tab=${targetTab}&created=true&name=${encodeURIComponent(newUser.displayName)}`);
      } else {
        setErrors({ form: res.message });
      }
    }, 400);
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
              <span className="text-muted text-xs">Acme Learning Corp &bull; Academic Year 2026–2027</span>
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
              onClick={() => setActiveRoleType('student')}
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
              onClick={() => setActiveRoleType('faculty')}
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
              onClick={() => setActiveRoleType('staff')}
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
                  placeholder="m.angelou@acmelearning.edu"
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
            <div className="form-group">
              <label className="form-label">
                Department / Academic Division <span className="required">*</span>
              </label>
              <select
                className="form-select"
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
              >
                {mockDepartments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name} &bull; {dept.memberCount} active members
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Account Provisioning Status</label>
              <select
                className="form-select"
                value={status}
                onChange={(e) => setStatus(e.target.value as UserAccountStatus)}
              >
                <option value="active">Active (Immediate Login Permitted)</option>
                <option value="invited">Invited (Send Onboarding Email Link)</option>
                <option value="pending_approval">Pending Dean / Admin Review</option>
              </select>
            </div>
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
                  {mockCourses.map((crs) => {
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
    </div>
  );
};
