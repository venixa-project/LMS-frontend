import React, { useState, useEffect } from 'react';
import { useLocation, useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../lib/store';
import { usePeopleStore } from '../../lib/peopleStore';
import { mockDepartments, mockCohorts, mockCourses } from '../../data/mockData';
import { User, RoleName, UserAccountStatus } from '../../types';
import {
  Users, UserPlus, Upload, Search, Filter, Mail, CheckCircle2,
  Clock, AlertCircle, X, Download, Shield, Eye, MoreHorizontal,
  GraduationCap, Edit2, UserMinus, UserCheck, BookOpen, Award,
  Calendar, Activity, ArrowRight, Check, Flame, Zap, Trophy, Sparkles
} from 'lucide-react';
import { useGamificationStore } from '../../lib/gamificationStore';
import { RANK_TIERS, getRankForPoints, getRankProgress, getNextRank, PointAwardEvent } from '../../lib/gamificationConfig';
import { RankBadge } from '../../components/Gamification/RankBadge';
import { AwardPointsModal } from '../../components/Gamification/AwardPointsModal';
import { AdminRankOverview } from '../../components/Gamification/AdminRankOverview';

interface Props {
  initialMode?: 'all' | 'students' | 'faculty' | 'staff';
}

export const PeoplePage: React.FC<Props> = ({ initialMode = 'all' }) => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const isFacultyViewer = user?.activeRole === 'trainer' || user?.activeRole === 'instructor';
  const [searchParams, setSearchParams] = useSearchParams();

  const { users, toggleUserStatus } = usePeopleStore();
  const { profiles } = useGamificationStore();

  const [isAwardModalOpen, setIsAwardModalOpen] = useState(false);
  const [awardTargetStudentId, setAwardTargetStudentId] = useState<string>('u-007');
  const [awardTargetStudentName, setAwardTargetStudentName] = useState<string>('');
  const [rankFilter, setRankFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'default' | 'points' | 'streak'>('default');

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
  const [selectedCourseToAssign, setSelectedCourseToAssign] = useState(mockCourses[0]?.id || 'c-001');

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
      u.email.toLowerCase().includes(search.toLowerCase());

    // Role filter
    const matchesRole = roleFilter === 'all' || u.activeRole === roleFilter;

    // Department filter
    const matchesDept = deptFilter === 'all' || u.departmentId === deptFilter;

    // Status filter
    const matchesStatus = statusFilter === 'all' || u.status === statusFilter;

    // Rank Tier filter (students tab)
    if (activeTab === 'students' && rankFilter !== 'all') {
      const p = profiles[u.id] || { totalPoints: 0 };
      const tier = getRankForPoints(p.totalPoints);
      if (tier.id !== rankFilter) return false;
    }

    return matchesSearch && matchesRole && matchesDept && matchesStatus;
  });

  // Apply sorting for students
  if (activeTab === 'students' && sortBy !== 'default') {
    filteredUsers.sort((a, b) => {
      const profA = profiles[a.id];
      const profB = profiles[b.id];
      const pointsA = profA ? profA.totalPoints : 0;
      const pointsB = profB ? profB.totalPoints : 0;
      if (sortBy === 'points') {
        return pointsB - pointsA;
      }
      if (sortBy === 'streak') {
        const streakA = profA ? (profA.streakData?.currentStreak ?? profA.currentStreak) : 0;
        const streakB = profB ? (profB.streakData?.currentStreak ?? profB.currentStreak) : 0;
        return streakB - streakA;
      }
      return 0;
    });
  }

  // Handle Status Toggle (Activate / Deactivate) via Store
  const handleConfirmStatusChange = () => {
    if (!statusChangeUser) return;
    const res = toggleUserStatus(statusChangeUser.id);
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
    const course = mockCourses.find((c) => c.id === selectedCourseToAssign);
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

      {/* Gamification & Learning Points Overview (When viewing students) */}
      {activeTab === 'students' && (
        <div style={{ marginBottom: '20px' }}>
          <AdminRankOverview
            onOpenAwardModal={(studentId) => {
              if (studentId) {
                setAwardTargetStudentId(studentId);
                const found = users.find((u) => u.id === studentId);
                if (found) setAwardTargetStudentName(found.displayName);
              }
              setIsAwardModalOpen(true);
            }}
            onViewStudent={(studentId) => {
              const found = users.find((u) => u.id === studentId);
              if (found) setSelectedUserDetail(found);
            }}
          />
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
            {/* Rank Filter (for students tab) */}
            {activeTab === 'students' && (
              <>
                <select
                  className="form-select"
                  value={rankFilter}
                  onChange={(e) => setRankFilter(e.target.value)}
                  style={{ width: 'auto' }}
                >
                  <option value="all">All Ranks</option>
                  {RANK_TIERS.map((t) => (
                    <option key={t.id} value={t.id}>{t.name} Rank</option>
                  ))}
                </select>

                <select
                  className="form-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  style={{ width: 'auto' }}
                >
                  <option value="default">Sort: Default</option>
                  <option value="points">Sort: XP (High to Low)</option>
                  <option value="streak">Sort: Streak (High to Low)</option>
                </select>
              </>
            )}

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
            {activeTab === 'students' ? (
              <tr>
                <th>Scholar Name</th>
                <th>Current Rank</th>
                <th>Learning Points</th>
                <th>Login Streak</th>
                <th>Rank Progress</th>
                <th>Department</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            ) : (
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Department</th>
                <th>Status</th>
                <th>Last Active</th>
                <th>Actions</th>
              </tr>
            )}
          </thead>
          <tbody>
            {filteredUsers.map((u) => {
              const dept = mockDepartments.find((d) => d.id === u.departmentId);
              const isStudent = u.activeRole === 'student' || u.activeRole === 'learner';
              const isFaculty = u.activeRole === 'trainer' || u.activeRole === 'instructor';

              if (activeTab === 'students') {
                const prof = profiles[u.id] || profiles['u-007'] || { totalPoints: 0, currentStreak: 0, streakData: { currentStreak: 0 } };
                const tier = getRankForPoints(prof.totalPoints);
                const nxt = getNextRank(tier.tier);
                const prog = getRankProgress(prof.totalPoints);

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
                          fontSize: '0.8rem'
                        }}>
                          {u.firstName?.[0]}{u.lastName?.[0]}
                        </div>
                        <div>
                          <span style={{ fontWeight: 600 }}>{u.displayName}</span>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Roll: STU-2026-0{u.id.slice(-2)} &bull; {u.email}</div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <RankBadge tier={tier} size="xs" />
                        <span style={{ fontWeight: 800, color: tier.color, fontSize: '0.82rem' }}>
                          {tier.name}
                        </span>
                      </div>
                    </td>

                    <td>
                      <div style={{ fontWeight: 800, color: '#ffd700', fontSize: '0.88rem' }}>
                        {prof.totalPoints.toLocaleString()} XP
                      </div>
                    </td>

                    <td>
                      <span style={{ color: '#f97316', fontWeight: 700, fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <Flame size={13} /> {prof.streakData?.currentStreak ?? prof.currentStreak ?? 0}d
                      </span>
                    </td>

                    <td>
                      <div style={{ minWidth: '95px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', marginBottom: '2px' }}>
                          <span style={{ color: 'var(--text-muted)' }}>{nxt ? nxt.name : 'MAX'}</span>
                          <span style={{ fontWeight: 700, color: tier.color }}>{prog.progressPercent}%</span>
                        </div>
                        <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '999px', overflow: 'hidden' }}>
                          <div style={{ width: `${prog.progressPercent}%`, height: '100%', background: tier.color, borderRadius: '999px' }} />
                        </div>
                      </div>
                    </td>

                    <td>{dept ? dept.name : 'Engineering & Technology'}</td>

                    <td>
                      <span className={`badge badge-${u.status}`}>
                        {u.status}
                      </span>
                    </td>

                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setSelectedUserDetail(u)}
                          title="View profile and gamification standing"
                        >
                          <Eye size={13} /> View
                        </button>

                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => {
                            setAwardTargetStudentId(u.id);
                            setAwardTargetStudentName(u.displayName);
                            setIsAwardModalOpen(true);
                          }}
                          title="Award Learning Points"
                          style={{
                            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontWeight: 700,
                            padding: '4px 8px',
                          }}
                        >
                          <Award size={13} /> Award
                        </button>
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
                        fontSize: '0.8rem'
                      }}>
                        {u.firstName?.[0]}{u.lastName?.[0]}
                      </div>
                      <div>
                        <span style={{ fontWeight: 600 }}>{u.displayName}</span>
                        {isFaculty && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)' }}>Lead Trainer</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>{u.email}</td>
                  <td>
                    <span className="badge badge-primary" style={{ textTransform: 'capitalize' }}>
                      {isFaculty ? 'Trainer' : 'Platform Admin'}
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
                        title="View profile and teaching details"
                      >
                        <Eye size={13} /> {isFacultyViewer ? 'View Progress' : 'View'}
                      </button>

                      {!isFacultyViewer && (
                        <>
                          <Link
                            to={`/people/${u.id}/edit`}
                            className="btn btn-secondary btn-sm"
                            title="Edit profile"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Edit2 size={13} /> Edit
                          </Link>

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

                  {/* Gamification Standing & Audit Trail */}
                  {(() => {
                    const prof = profiles[selectedUserDetail.id] || profiles['u-007'] || {
                      totalPoints: 0,
                      currentStreak: 0,
                      bestStreak: 0,
                      streakData: { currentStreak: 0, bestStreak: 0 },
                      events: [] as PointAwardEvent[],
                      history: [] as PointAwardEvent[],
                    };
                    const tier = getRankForPoints(prof.totalPoints);
                    const nxt = getNextRank(tier.tier);
                    const prog = getRankProgress(prof.totalPoints);
                    const pointEvents: PointAwardEvent[] = prof.events || prof.history || [];

                    return (
                      <div
                        style={{
                          background: 'rgba(15, 23, 42, 0.75)',
                          border: `1.5px solid ${tier.color}40`,
                          borderRadius: 'var(--radius-md)',
                          padding: '14px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <RankBadge tier={tier} size="xs" />
                            <span style={{ fontWeight: 800, fontSize: '0.85rem', color: tier.color }}>
                              {tier.name.toUpperCase()} RANK
                            </span>
                            <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#ffd700' }}>
                              &bull; {prof.totalPoints.toLocaleString()} Points
                            </span>
                          </div>

                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => {
                              setAwardTargetStudentId(selectedUserDetail.id);
                              setAwardTargetStudentName(selectedUserDetail.displayName);
                              setIsAwardModalOpen(true);
                            }}
                            style={{ padding: '4px 10px', fontSize: '0.72rem', borderRadius: '8px' }}
                          >
                            <Award size={12} /> Award Points
                          </button>
                        </div>

                        {/* Streak & Next Tier Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.75rem', marginBottom: '8px' }}>
                          <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '6px 8px', borderRadius: '6px' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Streak: </span>
                            <strong style={{ color: '#f97316' }}>🔥 {prof.streakData?.currentStreak ?? prof.currentStreak ?? 0}d</strong>
                            <span style={{ color: 'var(--text-muted)' }}> (Best: {prof.streakData?.bestStreak ?? prof.bestStreak ?? 0}d)</span>
                          </div>
                          <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '6px 8px', borderRadius: '6px' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Next Rank: </span>
                            <strong style={{ color: nxt ? nxt.color : '#ffd700' }}>
                              {nxt ? `${nxt.name} (${prog.pointsToNextRank} pts)` : 'MAX RANK (Legend)'}
                            </strong>
                          </div>
                        </div>

                        {/* Next Rank Progress */}
                        {nxt && (
                          <div style={{ marginBottom: '10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', marginBottom: '3px' }}>
                              <span style={{ color: 'var(--text-secondary)' }}>Progress to {nxt.name}</span>
                              <span style={{ color: tier.color, fontWeight: 700 }}>{prog.progressPercent}%</span>
                            </div>
                            <div style={{ height: '5px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '999px', overflow: 'hidden' }}>
                              <div style={{ width: `${prog.progressPercent}%`, height: '100%', background: tier.color, borderRadius: '999px' }} />
                            </div>
                          </div>
                        )}

                        {/* Recent Points Events History */}
                        <div>
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                            Recent Point-Award History
                          </span>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                            {pointEvents.length === 0 ? (
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>No point awards recorded yet.</div>
                            ) : (
                              pointEvents.slice(-3).reverse().map((ev: PointAwardEvent) => (
                                <div
                                  key={ev.id}
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    fontSize: '0.7rem',
                                    background: 'rgba(0, 0, 0, 0.25)',
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                  }}
                                >
                                  <span>{ev.reason || ev.description} ({ev.awardingSource || ev.source || ev.category})</span>
                                  <strong style={{ color: '#10b981' }}>+{ev.points} pts</strong>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

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
              <Link
                to={`/people/${selectedUserDetail.id}/edit`}
                className="btn btn-secondary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Edit2 size={14} /> Edit Profile
              </Link>

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

      {/* Trainer & Admin Award Learning Points Modal */}
      <AwardPointsModal
        isOpen={isAwardModalOpen}
        onClose={() => setIsAwardModalOpen(false)}
        preselectedStudentId={awardTargetStudentId}
        preselectedStudentName={awardTargetStudentName}
        authorizedStudents={users
          .filter((u) => u.activeRole === 'student' || u.activeRole === 'learner')
          .map((u) => ({ id: u.id, name: u.displayName, email: u.email }))}
        awardingRole={user?.activeRole === 'trainer' || user?.activeRole === 'instructor' ? 'trainer' : 'admin'}
        awardingUserId={user?.id || 'staff-01'}
        awardingUserName={user?.displayName || 'Faculty Member'}
        onAwardSuccess={(sId, pts) => {
          showNotice(`Successfully recorded +${pts} learning points for scholar.`);
        }}
      />
    </div>
  );
};
