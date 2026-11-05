import React, { useState, useEffect } from 'react';
import { useLocation, useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../lib/store';
import { usePeopleStore } from '../../lib/peopleStore';
import { useCourseStore } from '../../lib/courseStore';
import { useCohortStore } from '../../lib/cohortStore';
import { useDepartmentStore } from '../../lib/departmentStore';
import { User, RoleName, UserAccountStatus } from '../../types';
import {
  Users, UserPlus, Upload, Search, Filter, Mail, CheckCircle2,
  Clock, AlertCircle, X, Download, Shield, Eye, MoreHorizontal, MoreVertical,
  GraduationCap, Edit2, UserMinus, UserCheck, BookOpen, Award,
  Calendar, Activity, ArrowRight, Check, Key
} from 'lucide-react';

interface Props {
  initialMode?: 'all' | 'students' | 'faculty' | 'staff';
}

export const PeoplePage: React.FC<Props> = ({ initialMode = 'all' }) => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const isFacultyViewer = user?.activeRole === 'trainer' || user?.activeRole === 'instructor';
  const [searchParams, setSearchParams] = useSearchParams();

  const { users, toggleUserStatus, fetchPeople, isLoading, deleteUser, inviteUser, resetPassword } = usePeopleStore();
  const { departments, fetchDepartments } = useDepartmentStore();

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  useEffect(() => {
    fetchPeople();
  }, [fetchPeople]);

  const [resetConfirmation, setResetConfirmation] = useState<{ user: User; temporaryPassword: string } | null>(null);
  const [copiedReset, setCopiedReset] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [activeActionMenuId, setActiveActionMenuId] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!(event.target as HTMLElement).closest('.action-menu-container')) {
        setActiveActionMenuId(null);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveActionMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleResetPassword = async (targetUser: User) => {
    setIsResetting(true);
    const res = await resetPassword(targetUser.id);
    setIsResetting(false);
    if (res.success && res.temporaryPassword) {
      setResetConfirmation({
        user: targetUser,
        temporaryPassword: res.temporaryPassword,
      });
    } else {
      showNotice(res.message || 'Failed to reset password.');
    }
  };

  // Determine active tab from search params, location, or initial mode (defaults to students)
  const resolveTab = (): 'students' | 'faculty' | 'staff' => {
    if (isFacultyViewer) return 'students';
    const tabParam = searchParams.get('tab');
    if (tabParam === 'students' || tabParam === 'faculty' || tabParam === 'staff') {
      return tabParam;
    }
    if (location.pathname === '/students' || initialMode === 'students') return 'students';
    if (location.pathname === '/faculty' || initialMode === 'faculty') return 'faculty';
    if (initialMode === 'staff') return 'staff';
    return 'students';
  };

  const [activeTab, setActiveTabState] = useState<'students' | 'faculty' | 'staff'>(resolveTab);

  useEffect(() => {
    if (isFacultyViewer) {
      setActiveTabState('students');
      return;
    }
    const tabParam = searchParams.get('tab');
    if (tabParam === 'students' || tabParam === 'faculty' || tabParam === 'staff') {
      setActiveTabState(tabParam);
    } else if (location.pathname === '/students') {
      setActiveTabState('students');
    } else if (location.pathname === '/faculty') {
      setActiveTabState('faculty');
    }
  }, [searchParams, location.pathname, isFacultyViewer]);

  const handleTabChange = (newTab: 'students' | 'faculty' | 'staff') => {
    setActiveActionMenuId(null);
    setActiveTabState(newTab);
    setSearchParams({ tab: newTab });
  };

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [cohortFilter, setCohortFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Lightweight Modals & Drawers
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [selectedUserDetail, setSelectedUserDetail] = useState<User | null>(null);
  const [statusChangeUser, setStatusChangeUser] = useState<User | null>(null);
  const [facultyAssignUser, setFacultyAssignUser] = useState<User | null>(null);
  const [selectedCourseToAssign, setSelectedCourseToAssign] = useState(useCourseStore.getState().courses[0]?.id || '');

  // Feedback notifications
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // CSV Import state
  const [csvStep, setCsvStep] = useState<'upload' | 'preview' | 'complete'>('upload');
  const [csvFileName, setCsvFileName] = useState<string | null>(null);

  const showNotice = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 5000);
  };

  // Check URL params for banner messages from full pages
  useEffect(() => {
    const created = searchParams.get('created');
    const updated = searchParams.get('updated');
    const name = searchParams.get('name');

    if (created === 'true') {
      const decodedName = name ? decodeURIComponent(name) : 'New member';
      showNotice(`"${decodedName}" has been successfully added to the institution directory.`);
    } else if (updated === 'true') {
      const decodedName = name ? decodeURIComponent(name) : 'Member';
      showNotice(`Profile details updated successfully for "${decodedName}".`);
    }
  }, [searchParams]);

  const studentCount = users.filter((u) => u.activeRole === 'student' || u.activeRole === 'learner').length;
  const facultyCount = users.filter((u) => u.activeRole === 'trainer' || u.activeRole === 'instructor').length;
  const staffCount = users.filter((u) => u.activeRole !== 'student' && u.activeRole !== 'learner' && u.activeRole !== 'trainer' && u.activeRole !== 'instructor').length;

  // Filter users based on active tab & filters
  const filteredUsers = users.filter((u) => {
    // Faculty only views students
    if (isFacultyViewer && u.activeRole !== 'student' && u.activeRole !== 'learner') return false;

    // Tab filter: Students, Faculty & Trainers, All Staff
    if (activeTab === 'students' && u.activeRole !== 'student' && u.activeRole !== 'learner') return false;
    if (activeTab === 'faculty' && u.activeRole !== 'trainer' && u.activeRole !== 'instructor') return false;
    if (activeTab === 'staff') {
      const isStudent = u.activeRole === 'student' || u.activeRole === 'learner';
      const isFaculty = u.activeRole === 'trainer' || u.activeRole === 'instructor';
      if (isStudent || isFaculty) return false;
    }

    // Search query
    const matchesSearch =
      u.displayName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.rollNo && u.rollNo.toLowerCase().includes(search.toLowerCase()));

    // Role filter
    const matchesRole = roleFilter === 'all' || u.activeRole === roleFilter;

    // Department filter (matches direct assignment OR sub-departments under this parent)
    const matchesDept =
      deptFilter === 'all' ||
      u.departmentId === deptFilter ||
      departments.find((d) => d.id === u.departmentId)?.parentId === deptFilter;

    // Status filter
    const matchesStatus = statusFilter === 'all' || u.status === statusFilter;

    return matchesSearch && matchesRole && matchesDept && matchesStatus;
  });

  // Handle Status Toggle (Activate / Deactivate) via Store
  const handleConfirmStatusChange = async () => {
    if (!statusChangeUser) return;
    const res = await toggleUserStatus(statusChangeUser.id);
    if (res.success) {
      showNotice(res.message);
      if (selectedUserDetail?.id === statusChangeUser.id) {
        setSelectedUserDetail({ ...selectedUserDetail, status: res.newStatus || 'active' });
      }
    }
    setStatusChangeUser(null);
  };

  // Handle Assign Course to Faculty
  const handleAssignCourse = () => {
    if (!facultyAssignUser) return;
    const course = useCourseStore.getState().courses.find((c) => c.id === selectedCourseToAssign);
    showNotice(`Assigned "${course?.title || 'Course'}" to faculty ${facultyAssignUser.displayName}.`);
    setFacultyAssignUser(null);
  };

  const getPageTitle = () => {
    if (isFacultyViewer) return 'My Assigned Students & Learning Progress';
    if (activeTab === 'students') return 'Student Directory & Academic Progress';
    if (activeTab === 'faculty') return 'Faculty & Trainers Directory';
    return 'Staff Directory & Administrative Access';
  };

  const getPageSubtitle = () => {
    if (isFacultyViewer) return 'Monitor syllabus completion, attendance rates, and assessment scores for students in your assigned courses';
    if (activeTab === 'students') return 'Oversee enrolled student profiles, academic progress, cohort allocations, and status';
    if (activeTab === 'faculty') return 'Manage faculty profiles, department appointments, teaching workloads, and course allocations';
    return 'Oversee campus administrators, operational coordinators, support staff, and administrative privileges';
  };

  return (
    <div>
      {/* Header and Quick Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="badge badge-primary">{isFacultyViewer ? 'Faculty Scope' : 'People & Faculty'}</span>
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
                <Link to="/people/new?role=student" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <UserPlus size={16} /> Add Student
                </Link>
              ) : activeTab === 'faculty' ? (
                <Link to="/people/new?role=faculty" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <GraduationCap size={16} /> Add Faculty / Trainer
                </Link>
              ) : (
                <Link to="/people/new?role=staff" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <UserPlus size={16} /> Add Staff Member
                </Link>
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

      {/* Unified People & Faculty 3 Tabs (Admin Only) */}
      {!isFacultyViewer && (
        <div
          className="tabs-nav"
          style={{
            marginBottom: '20px',
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
            borderBottom: '1px solid var(--border-subtle)',
            paddingBottom: '12px'
          }}
        >
          <button
            className={`tab-btn ${activeTab === 'students' ? 'active' : ''}`}
            onClick={() => handleTabChange('students')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 18px',
              borderRadius: 'var(--radius-md, 8px)',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'var(--transition)',
              background: activeTab === 'students'
                ? 'var(--brand-blue, #2563EB)'
                : 'var(--bg-card)',
              color: activeTab === 'students' ? '#ffffff' : 'var(--text-secondary)',
              border: activeTab === 'students' ? '1px solid var(--brand-blue, #2563EB)' : '1px solid var(--border-subtle)',
              boxShadow: activeTab === 'students' ? '0 2px 8px rgba(37, 99, 235, 0.25)' : 'none'
            }}
          >
            <UserCheck size={16} />
            Students ({studentCount})
          </button>

          <button
            className={`tab-btn ${activeTab === 'faculty' ? 'active' : ''}`}
            onClick={() => handleTabChange('faculty')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 18px',
              borderRadius: 'var(--radius-md, 8px)',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'var(--transition)',
              background: activeTab === 'faculty'
                ? 'var(--brand-blue, #2563EB)'
                : 'var(--bg-card)',
              color: activeTab === 'faculty' ? '#ffffff' : 'var(--text-secondary)',
              border: activeTab === 'faculty' ? '1px solid var(--brand-blue, #2563EB)' : '1px solid var(--border-subtle)',
              boxShadow: activeTab === 'faculty' ? '0 2px 8px rgba(37, 99, 235, 0.25)' : 'none'
            }}
          >
            <GraduationCap size={16} />
            Faculty & Trainers ({facultyCount})
          </button>

          <button
            className={`tab-btn ${activeTab === 'staff' ? 'active' : ''}`}
            onClick={() => handleTabChange('staff')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 18px',
              borderRadius: 'var(--radius-md, 8px)',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'var(--transition)',
              background: activeTab === 'staff'
                ? 'var(--brand-blue, #2563EB)'
                : 'var(--bg-card)',
              color: activeTab === 'staff' ? '#ffffff' : 'var(--text-secondary)',
              border: activeTab === 'staff' ? '1px solid var(--brand-blue, #2563EB)' : '1px solid var(--border-subtle)',
              boxShadow: activeTab === 'staff' ? '0 2px 8px rgba(37, 99, 235, 0.25)' : 'none'
            }}
          >
            <Shield size={16} />
            All Staff ({staffCount})
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
              placeholder={`Search ${activeTab === 'students' ? 'students by name or roll number' : activeTab === 'faculty' ? 'faculty by name or specialization' : 'staff members by name or email'}...`}
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
              <option value="all">All Departments &amp; Branches</option>
              {departments
                .filter((d) => !d.parentId)
                .map((main) => {
                  const subDepts = departments.filter((d) => d.parentId === main.id);
                  return (
                    <React.Fragment key={main.id}>
                      <option value={main.id}>
                        {main.name} ({main.code}) {subDepts.length > 0 ? `[All Branches]` : ''}
                      </option>
                      {subDepts.map((sub) => (
                        <option key={sub.id} value={sub.id}>
                          &nbsp;&nbsp;&nbsp;&nbsp;↳ {sub.name} ({sub.code})
                        </option>
                      ))}
                    </React.Fragment>
                  );
                })}
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
      <div className={`table-container people-table-container ${activeTab === 'students' ? 'people-student-table-container' : ''}`}>
        <table className={`table ${activeTab === 'students' ? 'people-student-table' : ''}`}>
          <thead>
            {activeTab === 'students' ? (
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Roll / Scholar ID</th>
                <th>Department</th>
                <th>Status</th>
                <th style={{ textAlign: 'center', width: '60px' }}>Actions</th>
              </tr>
            ) : (
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Department</th>
                <th>Status</th>
                <th style={{ textAlign: 'center', width: '60px' }}>Actions</th>
              </tr>
            )}
          </thead>
          <tbody>
            {filteredUsers.map((u, index) => {
              const dept = departments.find((d) => d.id === u.departmentId);
              const isStudent = u.activeRole === 'student' || u.activeRole === 'learner';
              const isFaculty = u.activeRole === 'trainer' || u.activeRole === 'instructor';
              const isNearBottom = filteredUsers.length > 2 && index >= filteredUsers.length - 2;

              if (activeTab === 'students') {
                return (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, var(--primary), var(--accent-purple))',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          flexShrink: 0
                        }}>
                          {u.firstName?.[0]}{u.lastName?.[0]}
                        </div>
                        <span style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{u.displayName}</span>
                      </div>
                    </td>

                    <td style={{ whiteSpace: 'nowrap' }}>{u.email}</td>

                    <td>
                      <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-main)', fontSize: '0.82rem' }}>
                        {u.rollNo || `STU-2026-${u.id.slice(-4)}`}
                      </span>
                    </td>

                    <td>
                      {dept ? (
                        dept.parentId ? (
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.85rem' }}>
                              {dept.name} <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>({dept.code})</span>
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                              ↳ {departments.find((d) => d.id === dept.parentId)?.name || 'Parent Division'}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.85rem' }}>{dept.name}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>({dept.code}) &bull; Main Division</div>
                          </div>
                        )
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.82rem' }}>General / Unassigned</span>
                      )}
                    </td>

                    <td>
                      <span className={`badge badge-${u.status}`}>
                        {u.status}
                      </span>
                    </td>

                    <td style={{ textAlign: 'center', position: 'relative' }}>
                      <div className="action-menu-container">
                        <button
                          type="button"
                          className={`action-menu-trigger ${activeActionMenuId === u.id ? 'active' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveActionMenuId(activeActionMenuId === u.id ? null : u.id);
                          }}
                          title="Actions"
                        >
                          <MoreVertical size={16} />
                        </button>

                        {activeActionMenuId === u.id && (
                          <div
                            className={`action-menu-dropdown ${isNearBottom ? 'position-top' : 'position-bottom'}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              className="action-menu-item"
                              onClick={() => {
                                setActiveActionMenuId(null);
                                setSelectedUserDetail(u);
                              }}
                            >
                              <Eye size={14} />
                              <span>View Details</span>
                            </button>

                            {!isFacultyViewer && (
                              <>
                                <Link
                                  to={`/people/${u.id}/edit`}
                                  className="action-menu-item"
                                  onClick={() => setActiveActionMenuId(null)}
                                >
                                  <Edit2 size={14} />
                                  <span>Edit Details</span>
                                </Link>

                                <button
                                  type="button"
                                  className="action-menu-item action-menu-item-warning"
                                  onClick={() => {
                                    setActiveActionMenuId(null);
                                    handleResetPassword(u);
                                  }}
                                >
                                  <Key size={14} />
                                  <span>Reset Password</span>
                                </button>

                                <button
                                  type="button"
                                  className={`action-menu-item ${u.status === 'active' ? 'action-menu-item-danger' : 'action-menu-item-success'}`}
                                  onClick={() => {
                                    setActiveActionMenuId(null);
                                    setStatusChangeUser(u);
                                  }}
                                >
                                  {u.status === 'active' ? <UserMinus size={14} /> : <UserCheck size={14} />}
                                  <span>{u.status === 'active' ? 'Suspend Account' : 'Activate Account'}</span>
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              }

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
                          : 'linear-gradient(135deg, #f59e0b, #ef4444)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        flexShrink: 0
                      }}>
                        {u.firstName?.[0]}{u.lastName?.[0]}
                      </div>
                      <span style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{u.displayName}</span>
                    </div>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>{u.email}</td>
                  <td>
                    <span className="badge badge-primary" style={{ textTransform: 'capitalize' }}>
                      {isFaculty ? 'Trainer' : 'Platform Admin'}
                    </span>
                  </td>
                  <td>
                    {dept ? (
                      dept.parentId ? (
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.85rem' }}>
                            {dept.name} <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>({dept.code})</span>
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                            ↳ {departments.find((d) => d.id === dept.parentId)?.name || 'Parent Division'}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.85rem' }}>{dept.name}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>({dept.code}) &bull; Main Division</div>
                        </div>
                      )
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.82rem' }}>General / Unassigned</span>
                    )}
                  </td>
                  <td>
                    <span className={`badge badge-${u.status}`}>
                      {u.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center', position: 'relative' }}>
                    <div className="action-menu-container">
                      <button
                        type="button"
                        className={`action-menu-trigger ${activeActionMenuId === u.id ? 'active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveActionMenuId(activeActionMenuId === u.id ? null : u.id);
                        }}
                        title="Actions"
                      >
                        <MoreVertical size={16} />
                      </button>

                      {activeActionMenuId === u.id && (
                        <div
                          className={`action-menu-dropdown ${isNearBottom ? 'position-top' : 'position-bottom'}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            className="action-menu-item"
                            onClick={() => {
                              setActiveActionMenuId(null);
                              setSelectedUserDetail(u);
                            }}
                          >
                            <Eye size={14} />
                            <span>{isFacultyViewer ? 'View Progress' : 'View Details'}</span>
                          </button>

                          {!isFacultyViewer && (
                            <>
                              <Link
                                to={`/people/${u.id}/edit`}
                                className="action-menu-item"
                                onClick={() => setActiveActionMenuId(null)}
                              >
                                <Edit2 size={14} />
                                <span>Edit Profile</span>
                              </Link>

                              {isFaculty && (
                                <button
                                  type="button"
                                  className="action-menu-item"
                                  style={{ color: 'var(--primary)' }}
                                  onClick={() => {
                                    setActiveActionMenuId(null);
                                    setFacultyAssignUser(u);
                                  }}
                                >
                                  <BookOpen size={14} />
                                  <span>Assign Course</span>
                                </button>
                              )}

                              <button
                                type="button"
                                className="action-menu-item action-menu-item-warning"
                                onClick={() => {
                                  setActiveActionMenuId(null);
                                  handleResetPassword(u);
                                }}
                              >
                                <Key size={14} />
                                <span>Reset Password</span>
                              </button>

                              <button
                                type="button"
                                className={`action-menu-item ${u.status === 'active' ? 'action-menu-item-danger' : 'action-menu-item-success'}`}
                                onClick={() => {
                                  setActiveActionMenuId(null);
                                  setStatusChangeUser(u);
                                }}
                              >
                                {u.status === 'active' ? <UserMinus size={14} /> : <UserCheck size={14} />}
                                <span>{u.status === 'active' ? 'Suspend Account' : 'Activate Account'}</span>
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

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
                {statusChangeUser.status === 'active'
                  ? <>Are you sure you want to <strong>suspend</strong> <strong>{statusChangeUser.displayName}</strong> ({statusChangeUser.email})?</>
                  : statusChangeUser.status === 'pending_approval'
                    ? <>Approve <strong>{statusChangeUser.displayName}</strong>? We will email their student login email and a temporary password. They must replace it at first sign-in.</>
                    : statusChangeUser.status === 'invited'
                      ? <>Resend temporary login credentials to <strong>{statusChangeUser.displayName}</strong> ({statusChangeUser.email})?</>
                    : <>Reactivate <strong>{statusChangeUser.displayName}</strong> ({statusChangeUser.email})?</>}
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
                {statusChangeUser.status === 'active' ? 'Confirm Suspension' : statusChangeUser.status === 'pending_approval' ? 'Approve & Email Login' : statusChangeUser.status === 'invited' ? 'Resend Login Credentials' : 'Confirm Reactivation'}
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
                  {useCourseStore.getState().courses.map((c) => (
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
                  {(() => {
                    const d = departments.find((dept) => dept.id === selectedUserDetail.departmentId);
                    if (!d) return 'General / Unassigned';
                    if (d.parentId) {
                      const parent = departments.find((p) => p.id === d.parentId);
                      return `${parent ? parent.name + ' → ' : ''}${d.name} (${d.code})`;
                    }
                    return `${d.name} (${d.code})`;
                  })()}
                </span>
              </div>

              {/* Student Academic Progress View */}
              {(selectedUserDetail.activeRole === 'student' || selectedUserDetail.activeRole === 'learner') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '8px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Academic Summary
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '10px' }}>
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

                  {/* Account & Enrollment Details */}
                  <div
                    style={{
                      background: 'rgba(15, 23, 42, 0.75)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '14px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-main)' }}>
                        Academic Enrollment & Account Status
                      </span>
                      <span className={`badge badge-${selectedUserDetail.status}`}>
                        {selectedUserDetail.status}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.8rem' }}>
                      <div style={{ background: 'var(--bg-input)', padding: '8px 10px', borderRadius: '6px' }}>
                        <span className="text-muted" style={{ display: 'block', fontSize: '0.72rem' }}>Roll Number</span>
                        <strong style={{ color: 'var(--text-main)', fontFamily: 'monospace' }}>
                          {selectedUserDetail.rollNo || `STU-2026-${selectedUserDetail.id.slice(-4)}`}
                        </strong>
                      </div>
                      <div style={{ background: 'var(--bg-input)', padding: '8px 10px', borderRadius: '6px' }}>
                        <span className="text-muted" style={{ display: 'block', fontSize: '0.72rem' }}>Academic Batch</span>
                        <strong style={{ color: 'var(--primary)' }}>Spring 2026 Engineering</strong>
                      </div>
                      <div style={{ background: 'var(--bg-input)', padding: '8px 10px', borderRadius: '6px' }}>
                        <span className="text-muted" style={{ display: 'block', fontSize: '0.72rem' }}>Authentication</span>
                        <strong style={{ color: selectedUserDetail.status === 'active' ? 'var(--success)' : 'var(--warning)' }}>
                          {selectedUserDetail.status === 'active' ? 'Login Enabled' : 'Access Suspended'}
                        </strong>
                      </div>
                      <div style={{ background: 'var(--bg-input)', padding: '8px 10px', borderRadius: '6px' }}>
                        <span className="text-muted" style={{ display: 'block', fontSize: '0.72rem' }}>Last Login</span>
                        <strong style={{ color: 'var(--text-main)' }}>
                          {selectedUserDetail.lastLogin ? new Date(selectedUserDetail.lastLogin).toLocaleDateString() : 'Never'}
                        </strong>
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
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '10px' }}>
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
              <div style={{ display: 'flex', gap: '8px' }}>
                <Link
                  to={`/people/${selectedUserDetail.id}/edit`}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Edit2 size={14} /> Edit Profile
                </Link>

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--warning, #f59e0b)' }}
                  onClick={() => handleResetPassword(selectedUserDetail)}
                  disabled={isResetting}
                >
                  <Key size={14} /> Reset Password
                </button>
              </div>

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
                    Successfully imported 3 users into the directory. 1 duplicate row was ignored.
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

      {/* Reset Password Confirmation Modal */}
      {resetConfirmation && (
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
                  background: 'rgba(245, 158, 11, 0.15)',
                  color: 'var(--warning, #f59e0b)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Shield size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 700, color: 'var(--text-main)' }}>Temporary Password Reset</h3>
                  <span className="text-muted text-xs">New credentials generated for {resetConfirmation.user.displayName}</span>
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
                  <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{resetConfirmation.user.displayName}</span>

                  <span className="text-muted">Login Email:</span>
                  <span style={{ fontWeight: 600, color: 'var(--primary)', wordBreak: 'break-all' }}>{resetConfirmation.user.email}</span>

                  <span className="text-muted">Assigned Role:</span>
                  <span><span className="badge badge-primary" style={{ textTransform: 'capitalize' }}>{resetConfirmation.user.activeRole}</span></span>
                </div>
              </div>

              <div style={{
                background: 'rgba(99, 102, 241, 0.08)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                marginBottom: '16px'
              }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  New Temporary Password
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="text"
                    readOnly
                    value={resetConfirmation.temporaryPassword}
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
                      navigator.clipboard.writeText(resetConfirmation.temporaryPassword);
                      setCopiedReset(true);
                      setTimeout(() => setCopiedReset(false), 2500);
                    }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', padding: '10px 16px' }}
                  >
                    {copiedReset ? (
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
                  <strong>Mandatory Password Change Enforced:</strong> The member will be required to change this password on their next sign-in. This temporary password cannot be viewed again once this modal is closed.
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setResetConfirmation(null)}
                style={{ minWidth: '140px' }}
              >
                Close & Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
