import React, { useState } from 'react';
import { useAuthStore } from '../../lib/store';
import { mockUsers } from '../../data/mockUsers';
import { mockDepartments, mockCohorts, mockCourses } from '../../data/mockData';
import { User, RoleName, UserAccountStatus } from '../../types';
import {
  Users, UserPlus, Upload, Search, Filter, Mail, CheckCircle2,
  Clock, AlertCircle, X, Download, Shield, Eye, MoreHorizontal,
  GraduationCap, Edit2, UserMinus, UserCheck, BookOpen, Award,
  Calendar, Activity, ArrowRight, Check
} from 'lucide-react';

interface Props {
  initialMode?: 'all' | 'students' | 'faculty';
}

export const PeoplePage: React.FC<Props> = ({ initialMode = 'all' }) => {
  const { user } = useAuthStore();
  const isFacultyViewer = user?.activeRole === 'trainer' || user?.activeRole === 'instructor';
  const [activeTab, setActiveTab] = useState<'all' | 'students' | 'faculty' | 'staff'>(
    isFacultyViewer || initialMode === 'students' ? 'students' : initialMode === 'faculty' ? 'faculty' : 'all'
  );

  const [users, setUsers] = useState<User[]>(mockUsers);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [cohortFilter, setCohortFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals & Drawers
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [isAddFacultyModalOpen, setIsAddFacultyModalOpen] = useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [selectedUserDetail, setSelectedUserDetail] = useState<User | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [statusChangeUser, setStatusChangeUser] = useState<User | null>(null);
  const [facultyAssignUser, setFacultyAssignUser] = useState<User | null>(null);
  const [selectedCourseToAssign, setSelectedCourseToAssign] = useState(mockCourses[0]?.id || 'c-001');

  // Feedback notifications
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // General Invite state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteFirstName, setInviteFirstName] = useState('');
  const [inviteLastName, setInviteLastName] = useState('');
  const [inviteRole, setInviteRole] = useState<RoleName>('student');
  const [inviteDept, setInviteDept] = useState('dep-001');

  // Student Form state
  const [studentFirstName, setStudentFirstName] = useState('');
  const [studentLastName, setStudentLastName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [studentRollNo, setStudentRollNo] = useState('');
  const [studentDept, setStudentDept] = useState('dep-001');
  const [studentCohort, setStudentCohort] = useState('Spring 2026 Engineering');

  // Faculty Form state
  const [facultyFirstName, setFacultyFirstName] = useState('');
  const [facultyLastName, setFacultyLastName] = useState('');
  const [facultyEmail, setFacultyEmail] = useState('');
  const [facultyEmpId, setFacultyEmpId] = useState('');
  const [facultyDept, setFacultyDept] = useState('dep-001');
  const [facultySpecialization, setFacultySpecialization] = useState('Software Systems & Cloud');

  // CSV Import state
  const [csvStep, setCsvStep] = useState<'upload' | 'preview' | 'complete'>('upload');
  const [csvFileName, setCsvFileName] = useState<string | null>(null);

  const showNotice = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 4000);
  };

  // Filter users based on active tab & filters
  const filteredUsers = users.filter((u) => {
    // Faculty only views students
    if (isFacultyViewer && u.activeRole !== 'student' && u.activeRole !== 'learner') return false;

    // Tab filter
    if (activeTab === 'students' && u.activeRole !== 'student' && u.activeRole !== 'learner') return false;
    if (activeTab === 'faculty' && u.activeRole !== 'trainer' && u.activeRole !== 'instructor') return false;
    if (activeTab === 'staff' && u.activeRole !== 'platform_admin') return false;

    // Search query
    const matchesSearch =
      u.displayName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());

    // Role filter
    const matchesRole = roleFilter === 'all' || u.activeRole === roleFilter;

    // Department filter
    const matchesDept = deptFilter === 'all' || u.departmentId === deptFilter;

    // Status filter
    const matchesStatus = statusFilter === 'all' || u.status === statusFilter;

    return matchesSearch && matchesRole && matchesDept && matchesStatus;
  });

  // Handle Add Student
  const handleCreateStudent = (e: React.FormEvent) => {
    e.preventDefault();
    const newStudent: User = {
      id: `u-${Date.now()}`,
      email: studentEmail,
      firstName: studentFirstName,
      lastName: studentLastName,
      displayName: `${studentFirstName} ${studentLastName}`,
      activeRole: 'learner',
      roles: [],
      organizationId: 'org-001',
      departmentId: studentDept,
      status: 'active',
      mfaEnabled: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setUsers([newStudent, ...users]);
    setIsAddStudentModalOpen(false);
    showNotice(`Student ${newStudent.displayName} successfully enrolled in ${studentCohort}!`);
    setStudentFirstName('');
    setStudentLastName('');
    setStudentEmail('');
    setStudentRollNo('');
  };

  // Handle Add Faculty
  const handleCreateFaculty = (e: React.FormEvent) => {
    e.preventDefault();
    const newFaculty: User = {
      id: `u-${Date.now()}`,
      email: facultyEmail,
      firstName: facultyFirstName,
      lastName: facultyLastName,
      displayName: `${facultyFirstName} ${facultyLastName}`,
      activeRole: 'trainer',
      roles: [],
      organizationId: 'org-001',
      departmentId: facultyDept,
      status: 'active',
      mfaEnabled: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setUsers([newFaculty, ...users]);
    setIsAddFacultyModalOpen(false);
    showNotice(`Faculty member ${newFaculty.displayName} appointed and assigned to department!`);
    setFacultyFirstName('');
    setFacultyLastName('');
    setFacultyEmail('');
    setFacultyEmpId('');
  };

  // Handle Edit User Save
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setUsers(users.map((u) => u.id === editingUser.id ? { ...editingUser, updatedAt: new Date().toISOString() } : u));
    if (selectedUserDetail?.id === editingUser.id) {
      setSelectedUserDetail(editingUser);
    }
    setEditingUser(null);
    showNotice(`Profile details updated for ${editingUser.displayName}.`);
  };

  // Handle Status Toggle (Activate / Deactivate)
  const handleConfirmStatusChange = () => {
    if (!statusChangeUser) return;
    const newStatus: UserAccountStatus = statusChangeUser.status === 'active' ? 'suspended' : 'active';
    setUsers(users.map((u) => u.id === statusChangeUser.id ? { ...u, status: newStatus } : u));
    if (selectedUserDetail?.id === statusChangeUser.id) {
      setSelectedUserDetail({ ...selectedUserDetail, status: newStatus });
    }
    showNotice(`Account for ${statusChangeUser.displayName} marked as ${newStatus}.`);
    setStatusChangeUser(null);
  };

  // Handle Assign Course to Faculty
  const handleAssignCourse = () => {
    if (!facultyAssignUser) return;
    const course = mockCourses.find((c) => c.id === selectedCourseToAssign);
    showNotice(`Assigned "${course?.title || 'Course'}" to faculty ${facultyAssignUser.displayName}.`);
    setFacultyAssignUser(null);
  };

  const getPageTitle = () => {
    if (isFacultyViewer) return 'My Assigned Students & Learning Progress';
    if (activeTab === 'students') return 'Student Directory & Academic Progress';
    if (activeTab === 'faculty') return 'Faculty Directory & Workload Management';
    return 'People Directory & Access Management';
  };

  const getPageSubtitle = () => {
    if (isFacultyViewer) return 'Monitor syllabus completion, attendance rates, and assessment scores for students in your assigned courses';
    if (activeTab === 'students') return 'Oversee enrolled student profiles, academic progress, cohort allocations, and status';
    if (activeTab === 'faculty') return 'Manage faculty profiles, department appointments, teaching workloads, and course allocations';
    return 'Manage enterprise users, student enrollments, faculty assignments, and role access';
  };

  return (
    <div>
      {/* Header and Quick Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="badge badge-primary">{isFacultyViewer ? 'Faculty Scope' : 'People'}</span>
            <span className="text-muted text-xs">Acme Learning Corp &bull; org-001</span>
            {isFacultyViewer && <span className="badge badge-draft">Dr. James Wilson</span>}
          </div>
          <h1 style={{ fontSize: '1.75rem', margin: 0 }}>{getPageTitle()}</h1>
          <p className="text-secondary text-sm">{getPageSubtitle()}</p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {isFacultyViewer ? (
            <span className="badge badge-draft" style={{ padding: '8px 14px', fontSize: '0.85rem' }}>
              Enrolled Course Mentorship Active
            </span>
          ) : (
            <>
              <button className="btn btn-secondary" onClick={() => { setCsvStep('upload'); setIsCsvModalOpen(true); }}>
                <Upload size={16} /> Bulk CSV Import
              </button>
              {activeTab === 'students' ? (
                <button className="btn btn-primary" onClick={() => setIsAddStudentModalOpen(true)}>
                  <UserPlus size={16} /> Add Student
                </button>
              ) : activeTab === 'faculty' ? (
                <button className="btn btn-primary" onClick={() => setIsAddFacultyModalOpen(true)}>
                  <GraduationCap size={16} /> Add Faculty
                </button>
              ) : (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-secondary" onClick={() => setIsAddStudentModalOpen(true)}>
                    <UserPlus size={15} /> Add Student
                  </button>
                  <button className="btn btn-primary" onClick={() => setIsAddFacultyModalOpen(true)}>
                    <GraduationCap size={15} /> Add Faculty
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {actionNotice && (
        <div style={{
          background: 'var(--success-bg)',
          border: '1px solid var(--success-border)',
          color: 'var(--success)',
          padding: '12px 18px',
          borderRadius: 'var(--radius-md)',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '0.85rem'
        }}>
          <CheckCircle2 size={18} />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Directory Category Tabs (Admin Only) */}
      {!isFacultyViewer && (
        <div className="tabs-nav" style={{ marginBottom: '20px' }}>
          <button
            className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            <Users size={16} />
            All People ({users.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'students' ? 'active' : ''}`}
            onClick={() => setActiveTab('students')}
          >
            <UserCheck size={16} />
            Students ({users.filter((u) => u.activeRole === 'student' || u.activeRole === 'learner').length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'faculty' ? 'active' : ''}`}
            onClick={() => setActiveTab('faculty')}
          >
            <GraduationCap size={16} />
            Trainers ({users.filter((u) => u.activeRole === 'trainer' || u.activeRole === 'instructor').length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'staff' ? 'active' : ''}`}
            onClick={() => setActiveTab('staff')}
          >
            <Shield size={16} />
            Platform Admins ({users.filter((u) => u.activeRole === 'platform_admin').length})
          </button>
        </div>
      )}

      {/* Filter toolbar */}
      <div className="card" style={{ padding: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder={`Search ${activeTab === 'students' ? 'students by name or roll number' : activeTab === 'faculty' ? 'faculty by name or specialization' : 'people by name or email'}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '38px' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {/* Department Filter */}
            <select
              className="form-select"
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              style={{ width: 'auto' }}
            >
              <option value="all">All Departments</option>
              {mockDepartments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              className="form-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ width: 'auto' }}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="invited">Invited / Pending</option>
              <option value="suspended">Suspended</option>
              <option value="deactivated">Deactivated</option>
            </select>
          </div>

          <span className="text-muted text-xs font-semibold">{filteredUsers.length} Records found</span>
        </div>
      </div>

      {/* Users Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Department</th>
              <th>Status</th>
              <th>Last Active</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((u) => {
              const dept = mockDepartments.find((d) => d.id === u.departmentId);
              const isStudent = u.activeRole === 'student' || u.activeRole === 'learner';
              const isFaculty = u.activeRole === 'trainer' || u.activeRole === 'instructor';

              return (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '34px',
                        height: '34px',
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
                        fontWeight: 700,
                        fontSize: '0.8rem'
                      }}>
                        {u.firstName?.[0]}{u.lastName?.[0]}
                      </div>
                      <div>
                        <span style={{ fontWeight: 600 }}>{u.displayName}</span>
                        {isStudent && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Roll: STU-2026-0{u.id.slice(-2)}</div>
                        )}
                        {isFaculty && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)' }}>Lead Trainer</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>{u.email}</td>
                  <td>
                    <span className="badge badge-primary" style={{ textTransform: 'capitalize' }}>
                      {isFaculty ? 'Trainer' : isStudent ? 'Student' : 'Platform Admin'}
                    </span>
                  </td>
                  <td>{dept ? dept.name : 'Engineering & Technology'}</td>
                  <td>
                    <span className={`badge badge-${u.status}`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="text-muted text-xs">
                    {u.lastLogin ? new Date(u.lastLogin).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Never'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setSelectedUserDetail(u)}
                        title="View profile, attendance, and progress"
                      >
                        <Eye size={13} /> {isFacultyViewer ? 'View Progress' : 'View'}
                      </button>

                      {!isFacultyViewer && (
                        <>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => setEditingUser(u)}
                            title="Edit profile"
                          >
                            <Edit2 size={13} /> Edit
                          </button>

                          {isFaculty && (
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => setFacultyAssignUser(u)}
                              title="Assign Course"
                              style={{ color: 'var(--primary)', borderColor: 'var(--primary)' }}
                            >
                              <BookOpen size={13} /> Assign Course
                            </button>
                          )}

                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => setStatusChangeUser(u)}
                            title={u.status === 'active' ? 'Suspend / Deactivate' : 'Reactivate'}
                            style={{ color: u.status === 'active' ? 'var(--danger)' : 'var(--success)' }}
                          >
                            {u.status === 'active' ? <UserMinus size={13} /> : <UserCheck size={13} />}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add Student Modal */}
      {isAddStudentModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddStudentModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '580px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <UserPlus size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Enroll New Student</h3>
                  <p className="text-muted text-xs">Register student into institution cohort and provision credentials</p>
                </div>
              </div>
              <button onClick={() => setIsAddStudentModalOpen(false)} style={{ color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateStudent}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">First Name <span className="required">*</span></label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Jordan"
                      className="form-input"
                      value={studentFirstName}
                      onChange={(e) => setStudentFirstName(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Last Name <span className="required">*</span></label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Blake"
                      className="form-input"
                      value={studentLastName}
                      onChange={(e) => setStudentLastName(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Student Email <span className="required">*</span></label>
                    <input
                      type="email"
                      required
                      placeholder="student@acmelearning.edu"
                      className="form-input"
                      value={studentEmail}
                      onChange={(e) => setStudentEmail(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Roll / Reg Number</label>
                    <input
                      type="text"
                      placeholder="STU-2026-108"
                      className="form-input"
                      value={studentRollNo}
                      onChange={(e) => setStudentRollNo(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Academic Department</label>
                    <select
                      className="form-select"
                      value={studentDept}
                      onChange={(e) => setStudentDept(e.target.value)}
                    >
                      {mockDepartments.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Assign Class / Batch</label>
                    <select
                      className="form-select"
                      value={studentCohort}
                      onChange={(e) => setStudentCohort(e.target.value)}
                    >
                      {mockCohorts.map((co) => (
                        <option key={co.id} value={co.name}>{co.name} ({co.code})</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddStudentModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Complete Student Enrollment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Faculty Modal */}
      {isAddFacultyModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddFacultyModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '580px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <GraduationCap size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Appoint Faculty Member</h3>
                  <p className="text-muted text-xs">Register instructor into department faculty and allocate teaching scopes</p>
                </div>
              </div>
              <button onClick={() => setIsAddFacultyModalOpen(false)} style={{ color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateFaculty}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">First Name <span className="required">*</span></label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Alan"
                      className="form-input"
                      value={facultyFirstName}
                      onChange={(e) => setFacultyFirstName(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Last Name <span className="required">*</span></label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Turing"
                      className="form-input"
                      value={facultyLastName}
                      onChange={(e) => setFacultyLastName(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Institution Email <span className="required">*</span></label>
                    <input
                      type="email"
                      required
                      placeholder="faculty@acmelearning.edu"
                      className="form-input"
                      value={facultyEmail}
                      onChange={(e) => setFacultyEmail(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Faculty / Staff ID</label>
                    <input
                      type="text"
                      placeholder="FAC-2026-033"
                      className="form-input"
                      value={facultyEmpId}
                      onChange={(e) => setFacultyEmpId(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Appointed Department</label>
                    <select
                      className="form-select"
                      value={facultyDept}
                      onChange={(e) => setFacultyDept(e.target.value)}
                    >
                      {mockDepartments.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Academic Specialization</label>
                    <input
                      type="text"
                      placeholder="e.g. Distributed Systems"
                      className="form-input"
                      value={facultySpecialization}
                      onChange={(e) => setFacultySpecialization(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddFacultyModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Appoint Faculty</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="modal-overlay" onClick={() => setEditingUser(null)}>
          <div className="modal-card" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Edit Member Profile</h3>
              <button onClick={() => setEditingUser(null)} style={{ color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">First Name</label>
                    <input
                      type="text"
                      required
                      className="form-input"
                      value={editingUser.firstName}
                      onChange={(e) => setEditingUser({ ...editingUser, firstName: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Last Name</label>
                    <input
                      type="text"
                      required
                      className="form-input"
                      value={editingUser.lastName}
                      onChange={(e) => setEditingUser({ ...editingUser, lastName: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    required
                    className="form-input"
                    value={editingUser.email}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Department</label>
                    <select
                      className="form-select"
                      value={editingUser.departmentId || 'dep-001'}
                      onChange={(e) => setEditingUser({ ...editingUser, departmentId: e.target.value })}
                    >
                      {mockDepartments.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select
                      className="form-select"
                      value={editingUser.status}
                      onChange={(e) => setEditingUser({ ...editingUser, status: e.target.value as UserAccountStatus })}
                    >
                      <option value="active">Active</option>
                      <option value="invited">Invited / Pending</option>
                      <option value="suspended">Suspended</option>
                      <option value="deactivated">Deactivated</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setEditingUser(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Activation / Deactivation */}
      {statusChangeUser && (
        <div className="modal-overlay" onClick={() => setStatusChangeUser(null)}>
          <div className="modal-card" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', margin: 0 }}>
                {statusChangeUser.status === 'active' ? 'Suspend Account Access' : 'Reactivate Account'}
              </h3>
              <button onClick={() => setStatusChangeUser(null)} style={{ color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <p className="text-secondary text-sm" style={{ marginBottom: '16px' }}>
                Are you sure you want to <strong>{statusChangeUser.status === 'active' ? 'suspend' : 'reactivate'}</strong> the account for <strong>{statusChangeUser.displayName}</strong> ({statusChangeUser.email})?
              </p>
              {statusChangeUser.status === 'active' ? (
                <div style={{
                  background: 'var(--danger-bg)',
                  border: '1px solid var(--danger-border)',
                  color: 'var(--danger)',
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.8rem'
                }}>
                  Suspending this user will temporarily pause their login session, course access, and live class roster eligibility.
                </div>
              ) : (
                <div style={{
                  background: 'var(--success-bg)',
                  border: '1px solid var(--success-border)',
                  color: 'var(--success)',
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.8rem'
                }}>
                  Reactivating this account will restore full coursework access and attendance tracking.
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setStatusChangeUser(null)}>Cancel</button>
              <button
                className={`btn ${statusChangeUser.status === 'active' ? 'btn-danger' : 'btn-primary'}`}
                style={statusChangeUser.status === 'active' ? { background: 'var(--danger)', color: '#fff' } : undefined}
                onClick={handleConfirmStatusChange}
              >
                Confirm {statusChangeUser.status === 'active' ? 'Suspension' : 'Reactivation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Course to Faculty Modal */}
      {facultyAssignUser && (
        <div className="modal-overlay" onClick={() => setFacultyAssignUser(null)}>
          <div className="modal-card" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Assign Course to Faculty</h3>
              <button onClick={() => setFacultyAssignUser(null)} style={{ color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p className="text-secondary text-sm">
                Assign a curriculum course to <strong>{facultyAssignUser.displayName}</strong> as lead instructor:
              </p>

              <div className="form-group">
                <label className="form-label">Available Courses</label>
                <select
                  className="form-select"
                  value={selectedCourseToAssign}
                  onChange={(e) => setSelectedCourseToAssign(e.target.value)}
                >
                  {mockCourses.map((c) => (
                    <option key={c.id} value={c.id}>{c.title} ({c.level})</option>
                  ))}
                </select>
              </div>

              <div style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '12px',
                fontSize: '0.75rem',
                color: 'var(--text-muted)'
              }}>
                <strong>Instructor Scoping:</strong> Faculty will only be granted grading, live broadcast, and student progress rights for their permitted course assignments.
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setFacultyAssignUser(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAssignCourse}>Confirm Course Assignment</button>
            </div>
          </div>
        </div>
      )}

      {/* User Details Drawer / Modal */}
      {selectedUserDetail && (
        <div className="modal-overlay" onClick={() => setSelectedUserDetail(null)}>
          <div className="modal-card" style={{ maxWidth: '580px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: (selectedUserDetail.activeRole === 'trainer' || selectedUserDetail.activeRole === 'instructor')
                    ? 'linear-gradient(135deg, #06b6d4, #3b82f6)'
                    : 'linear-gradient(135deg, var(--primary), var(--accent-purple))',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '1rem'
                }}>
                  {selectedUserDetail.firstName?.[0]}
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', margin: 0 }}>{selectedUserDetail.displayName}</h3>
                  <p className="text-muted text-xs">{selectedUserDetail.email}</p>
                </div>
              </div>
              <button onClick={() => setSelectedUserDetail(null)} style={{ color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Meta tags */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <span className="badge badge-primary">{selectedUserDetail.activeRole.replace('_', ' ')}</span>
                <span className={`badge badge-${selectedUserDetail.status}`}>{selectedUserDetail.status}</span>
                <span className="badge badge-secondary">
                  {mockDepartments.find((d) => d.id === selectedUserDetail.departmentId)?.name || 'Engineering'}
                </span>
              </div>

              {/* Student Academic Progress View */}
              {(selectedUserDetail.activeRole === 'student' || selectedUserDetail.activeRole === 'learner') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '8px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Academic Summary
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                      <div style={{ background: 'var(--bg-input)', padding: '10px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--success)' }}>96.2%</div>
                        <div className="text-muted text-xs">Attendance Rate</div>
                      </div>
                      <div style={{ background: 'var(--bg-input)', padding: '10px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)' }}>3</div>
                        <div className="text-muted text-xs">Enrolled Courses</div>
                      </div>
                      <div style={{ background: 'var(--bg-input)', padding: '10px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>92 / 100</div>
                        <div className="text-muted text-xs">Avg Exam Score</div>
                      </div>
                    </div>
                  </div>

                  {/* Course Progress breakdown */}
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '8px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Course Syllabus Progress
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ background: 'var(--bg-input)', padding: '10px 12px', borderRadius: 'var(--radius-md)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 600 }}>Advanced React & TypeScript Architecture</span>
                          <strong>68% Completed</strong>
                        </div>
                        <div className="progress-bar-bg" style={{ height: '6px' }}>
                          <div className="progress-bar-fill" style={{ width: '68%' }} />
                        </div>
                      </div>

                      <div style={{ background: 'var(--bg-input)', padding: '10px 12px', borderRadius: 'var(--radius-md)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 600 }}>Introduction to Modern PostgreSQL</span>
                          <strong style={{ color: 'var(--success)' }}>100% Completed</strong>
                        </div>
                        <div className="progress-bar-bg" style={{ height: '6px' }}>
                          <div className="progress-bar-fill" style={{ width: '100%', background: 'var(--success)' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Faculty Workload View */}
              {(selectedUserDetail.activeRole === 'trainer' || selectedUserDetail.activeRole === 'instructor') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '8px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Faculty Teaching Workload
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                      <div style={{ background: 'var(--bg-input)', padding: '10px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)' }}>2 Courses</div>
                        <div className="text-muted text-xs">Assigned Teaching</div>
                      </div>
                      <div style={{ background: 'var(--bg-input)', padding: '10px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>142</div>
                        <div className="text-muted text-xs">Total Students</div>
                      </div>
                      <div style={{ background: 'var(--bg-input)', padding: '10px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--warning)' }}>2 Sessions</div>
                        <div className="text-muted text-xs">Scheduled This Week</div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        Permitted Course Assignments
                      </span>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          setFacultyAssignUser(selectedUserDetail);
                        }}
                      >
                        + Assign Course
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.825rem' }}>Advanced React & TypeScript Architecture</div>
                          <span className="text-muted text-xs">Spring 2026 Engineering Batch</span>
                        </div>
                        <span className="badge badge-active">Lead Faculty</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.825rem' }}>Cloud Native Microservices with Go</div>
                          <span className="text-muted text-xs">Summer 2026 Cloud Architects</span>
                        </div>
                        <span className="badge badge-active">Co-Instructor</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setEditingUser(selectedUserDetail);
                }}
              >
                <Edit2 size={14} /> Edit Profile
              </button>

              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setSelectedUserDetail(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk CSV Modal (Preserved from existing implementation) */}
      {isCsvModalOpen && (
        <div className="modal-overlay" onClick={() => setIsCsvModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '680px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Bulk People & Enrollment CSV Import</h3>
              <button onClick={() => setIsCsvModalOpen(false)} style={{ color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              {csvStep === 'upload' && (
                <div>
                  <p className="text-secondary text-sm" style={{ marginBottom: '16px' }}>
                    Upload a CSV file containing user names, emails, roles, department codes, and optional cohort assignments.
                  </p>

                  <div
                    style={{
                      border: '2px dashed var(--border-light)',
                      borderRadius: 'var(--radius-lg)',
                      padding: '36px 20px',
                      textAlign: 'center',
                      background: 'var(--bg-input)',
                      cursor: 'pointer',
                      marginBottom: '16px'
                    }}
                    onClick={() => {
                      setCsvFileName('users_batch_q4_2026.csv');
                      setCsvStep('preview');
                    }}
                  >
                    <Upload size={36} color="var(--primary)" style={{ margin: '0 auto 12px' }} />
                    <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '4px' }}>
                      Click to choose or drag & drop CSV file
                    </div>
                    <div className="text-muted text-xs">Supports .csv or .xlsx up to 10MB</div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => alert("Downloading mock template: first_name, last_name, email, role, department, cohort_code")}
                    >
                      <Download size={14} /> Download Sample CSV Template
                    </button>
                  </div>
                </div>
              )}

              {csvStep === 'preview' && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>File: {csvFileName}</span>
                    <span className="badge badge-primary">4 Records Parsed</span>
                  </div>

                  <div className="table-container" style={{ maxHeight: '220px', overflowY: 'auto', marginBottom: '14px' }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Role</th>
                          <th>Validation</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>1</td>
                          <td>Daniel Wu</td>
                          <td>daniel.wu@acmelearning.com</td>
                          <td>Learner</td>
                          <td><span className="badge badge-active">Valid</span></td>
                        </tr>
                        <tr>
                          <td>2</td>
                          <td>Elena Rostova</td>
                          <td>elena.r@acmelearning.com</td>
                          <td>Instructor</td>
                          <td><span className="badge badge-active">Valid</span></td>
                        </tr>
                        <tr>
                          <td>3</td>
                          <td>Kwame Mensah</td>
                          <td>kwame.m@acmelearning.com</td>
                          <td>Learner</td>
                          <td><span className="badge badge-active">Valid</span></td>
                        </tr>
                        <tr style={{ background: 'var(--danger-bg)' }}>
                          <td>4</td>
                          <td>Alex Rivera</td>
                          <td>alex@lms.demo</td>
                          <td>Learner</td>
                          <td><span className="badge badge-failed">Duplicate Email</span></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div style={{
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px',
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)'
                  }}>
                    <strong>Row-Level Handling:</strong> Duplicate row #4 will be skipped automatically. 3 new accounts will be provisioned with pending activation tokens.
                  </div>
                </div>
              )}

              {csvStep === 'complete' && (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <CheckCircle2 size={48} color="var(--success)" style={{ margin: '0 auto 16px' }} />
                  <h3 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>Import Completed!</h3>
                  <p className="text-secondary text-sm" style={{ marginBottom: '16px' }}>
                    Successfully imported 3 users into Acme Learning Corp. 1 duplicate row was ignored.
                  </p>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => alert("Simulated download of import_errors_report.csv")}
                  >
                    <Download size={14} /> Download Error Log (.csv)
                  </button>
                </div>
              )}
            </div>

            <div className="modal-footer">
              {csvStep === 'upload' && (
                <button className="btn btn-secondary" onClick={() => setIsCsvModalOpen(false)}>Cancel</button>
              )}
              {csvStep === 'preview' && (
                <>
                  <button className="btn btn-secondary" onClick={() => setCsvStep('upload')}>Back</button>
                  <button className="btn btn-primary" onClick={() => setCsvStep('complete')}>Confirm & Import 3 Rows</button>
                </>
              )}
              {csvStep === 'complete' && (
                <button className="btn btn-primary" onClick={() => setIsCsvModalOpen(false)}>Done</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
