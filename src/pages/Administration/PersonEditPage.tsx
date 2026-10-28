import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { usePeopleStore } from '../../lib/peopleStore';
import { mockDepartments, mockCourses } from '../../data/mockData';
import { User, RoleName, UserAccountStatus } from '../../types';
import {
  ArrowLeft, CheckCircle2, AlertCircle, Building, Mail,
  Phone, Users, Shield, GraduationCap, Award, Check, X
} from 'lucide-react';

export const PersonEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getUserById, updateUser, isEmailTaken } = usePeopleStore();

  const existingPerson = id ? getUserById(id) : undefined;

  // Form Fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [departmentId, setDepartmentId] = useState('dep-001');
  const [activeRole, setActiveRole] = useState<RoleName>('learner');
  const [status, setStatus] = useState<UserAccountStatus>('active');
  const [rollNo, setRollNo] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);

  // UI state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDiscardPrompt, setShowDiscardPrompt] = useState(false);

  // Initialize fields from existing person
  useEffect(() => {
    if (existingPerson) {
      setFirstName(existingPerson.firstName || '');
      setLastName(existingPerson.lastName || '');
      setEmail(existingPerson.email || '');
      setPhone(existingPerson.phone || '');
      setDepartmentId(existingPerson.departmentId || 'dep-001');
      setActiveRole(existingPerson.activeRole);
      setStatus(existingPerson.status);
      setRollNo(existingPerson.rollNo || '');
      setSpecialization(existingPerson.specialization || '');
      setSelectedCourses(existingPerson.eligibleCourseIds || [mockCourses[0]?.id || 'crs-001']);
    }
  }, [existingPerson]);

  const isStudent = activeRole === 'student' || activeRole === 'learner';
  const isFaculty = activeRole === 'trainer' || activeRole === 'instructor';
  const isStaff = !isStudent && !isFaculty;

  const targetTab = isStudent ? 'students' : isFaculty ? 'faculty' : 'staff';

  const navigateBack = () => {
    navigate(`/people?tab=${targetTab}`);
  };

  const handleCancel = () => {
    // If dirty, confirm
    const isDirty =
      existingPerson &&
      (firstName !== existingPerson.firstName ||
        lastName !== existingPerson.lastName ||
        email !== existingPerson.email ||
        phone !== (existingPerson.phone || '') ||
        status !== existingPerson.status ||
        departmentId !== (existingPerson.departmentId || 'dep-001'));

    if (isDirty) {
      setShowDiscardPrompt(true);
    } else {
      navigateBack();
    }
  };

  const toggleCourseSelection = (courseId: string) => {
    if (selectedCourses.includes(courseId)) {
      setSelectedCourses(selectedCourses.filter((c) => c !== courseId));
    } else {
      setSelectedCourses([...selectedCourses, courseId]);
    }
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!firstName.trim()) errs.firstName = 'First name is required.';
    if (!lastName.trim()) errs.lastName = 'Last name is required.';
    if (!email.trim()) {
      errs.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = 'Please provide a valid email format.';
    } else if (isEmailTaken(email.trim(), id)) {
      errs.email = 'This email address is already registered to another account.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !existingPerson) return;

    setIsSubmitting(true);

    const updatedUser: User = {
      ...existingPerson,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      displayName: `${firstName.trim()} ${lastName.trim()}`,
      email: email.trim(),
      phone: phone.trim() || undefined,
      departmentId,
      status,
      rollNo: isStudent ? rollNo.trim() || undefined : undefined,
      specialization: isFaculty ? specialization.trim() || undefined : undefined,
      eligibleCourseIds: isFaculty ? selectedCourses : undefined,
      updatedAt: new Date().toISOString()
    };

    const res = updateUser(updatedUser);

    setTimeout(() => {
      setIsSubmitting(false);
      if (res.success) {
        navigate(`/people?tab=${targetTab}&updated=true&name=${encodeURIComponent(updatedUser.displayName)}`);
      } else {
        setErrors({ form: res.message });
      }
    }, 400);
  };

  if (!existingPerson) {
    return (
      <div style={{ maxWidth: '640px', margin: '40px auto', textAlign: 'center' }} className="card">
        <AlertCircle size={44} color="var(--danger)" style={{ margin: '0 auto 12px' }} />
        <h2 style={{ fontSize: '1.4rem', margin: '0 0 8px' }}>Member Record Not Found</h2>
        <p className="text-secondary text-sm" style={{ marginBottom: '20px' }}>
          The requested member identifier <code style={{ background: 'var(--bg-input)', padding: '2px 6px', borderRadius: '4px' }}>{id}</code> could not be located in the directory.
        </p>
        <Link to="/people" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <ArrowLeft size={14} /> Return to People & Faculty Directory
        </Link>
      </div>
    );
  }

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
          <ArrowLeft size={14} /> Back to Directory
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          <Link to="/people" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>People & Faculty</Link>
          <span>/</span>
          <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>Edit Member: {existingPerson.displayName}</span>
        </div>
      </div>

      {/* Header Card */}
      <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              background: isFaculty
                ? 'linear-gradient(135deg, #06b6d4, #3b82f6)'
                : isStudent
                ? 'linear-gradient(135deg, var(--primary), var(--accent-purple))'
                : 'linear-gradient(135deg, #f59e0b, #ef4444)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '1.25rem',
              boxShadow: 'var(--shadow-md)'
            }}>
              {existingPerson.firstName?.[0] || 'U'}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span className="badge badge-primary">{activeRole.replace('_', ' ')}</span>
                <span className={`badge badge-${status}`}>{status}</span>
                <span className="text-muted text-xs">ID: {existingPerson.id}</span>
              </div>
              <h1 style={{ fontSize: '1.75rem', margin: 0, fontWeight: 700 }}>
                Edit Profile: {existingPerson.displayName}
              </h1>
              <p className="text-secondary text-sm" style={{ margin: '2px 0 0 0' }}>
                Update institutional credentials, departmental appointments, status, and learning scopes.
              </p>
            </div>
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

      {/* Edit Form */}
      <form onSubmit={handleSubmit}>
        {/* Section 1: Personal Details */}
        <div className="card" style={{ padding: '24px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px', paddingBottom: '12px', borderBottom: '1px solid var(--border-subtle)' }}>
            <Users size={18} color="var(--primary)" />
            <h3 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 700 }}>Personal Information</h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '16px' }}>
            <div className="form-group">
              <label className="form-label">
                First Name <span className="required">*</span>
              </label>
              <input
                type="text"
                className={`form-input ${errors.firstName ? 'input-error' : ''}`}
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
                Email Address <span className="required">*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="email"
                  className={`form-input ${errors.email ? 'input-error' : ''}`}
                  style={{ paddingLeft: '36px' }}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors({ ...errors, email: '' });
                  }}
                />
              </div>
              {errors.email && <span className="form-error-msg">{errors.email}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Contact Phone Number</label>
              <div style={{ position: 'relative' }}>
                <Phone size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="tel"
                  className="form-input"
                  placeholder="+1 (555) 000-0000"
                  style={{ paddingLeft: '36px' }}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Department & Status Settings */}
        <div className="card" style={{ padding: '24px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px', paddingBottom: '12px', borderBottom: '1px solid var(--border-subtle)' }}>
            <Building size={18} color="var(--primary)" />
            <h3 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 700 }}>Department & Account Status</h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '16px' }}>
            <div className="form-group">
              <label className="form-label">Department</label>
              <select
                className="form-select"
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
              >
                {mockDepartments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Account Status</label>
              <select
                className="form-select"
                value={status}
                onChange={(e) => setStatus(e.target.value as UserAccountStatus)}
              >
                <option value="active">Active (Access Enabled)</option>
                <option value="invited">Invited / Pending Verification</option>
                <option value="suspended">Suspended (Access Temporarily Paused)</option>
                <option value="deactivated">Deactivated (Archived Account)</option>
              </select>
            </div>
          </div>

          {isStudent && (
            <div className="form-group">
              <label className="form-label">Student Roll Number / Scholar ID</label>
              <input
                type="text"
                className="form-input"
                placeholder="STU-2026-001"
                value={rollNo}
                onChange={(e) => setRollNo(e.target.value)}
              />
            </div>
          )}

          {isFaculty && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Academic Specialization</label>
                <input
                  type="text"
                  className="form-input"
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  placeholder="e.g. Distributed Cloud Systems"
                />
              </div>

              <div>
                <label className="form-label" style={{ marginBottom: '8px' }}>
                  Permitted Teaching Course Allocations
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '8px' }}>
                  {mockCourses.map((crs) => {
                    const isSelected = selectedCourses.includes(crs.id);
                    return (
                      <div
                        key={crs.id}
                        onClick={() => toggleCourseSelection(crs.id)}
                        style={{
                          background: isSelected ? 'rgba(99, 102, 241, 0.1)' : 'var(--bg-input)',
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
        </div>

        {/* Action Controls */}
        <div className="card" style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
            style={{ minWidth: '160px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            {isSubmitting ? 'Saving Changes...' : (
              <>
                <CheckCircle2 size={16} /> Save Changes
              </>
            )}
          </button>
        </div>
      </form>

      {/* Discard Confirmation Modal */}
      {showDiscardPrompt && (
        <div className="modal-overlay" onClick={() => setShowDiscardPrompt(false)}>
          <div className="modal-card" style={{ maxWidth: '460px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Discard Unsaved Modifications?</h3>
              <button onClick={() => setShowDiscardPrompt(false)} style={{ color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p className="text-secondary text-sm">
                You have unsaved changes to this member profile. Leaving will discard any edits made.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowDiscardPrompt(false)}>
                Continue Editing
              </button>
              <button className="btn btn-danger" style={{ background: 'var(--danger)', color: '#fff' }} onClick={navigateBack}>
                Discard Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
