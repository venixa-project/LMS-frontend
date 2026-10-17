import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../lib/store';
import { mockCohorts, mockCourses } from '../../data/mockData';
import { Cohort } from '../../types';
import {
  UsersRound, Plus, Search, Calendar, BookOpen, User,
  CheckCircle2, X, Edit2, Users, Clock
} from 'lucide-react';

export const CohortsPage: React.FC = () => {
  const { user } = useAuthStore();
  const isFaculty = user?.activeRole === 'instructor';
  const [cohorts, setCohorts] = useState<Cohort[]>(mockCohorts);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedCohort, setSelectedCohort] = useState<Cohort | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [courseId, setCourseId] = useState('c-001');
  const [startDate, setStartDate] = useState('2026-03-01');
  const [endDate, setEndDate] = useState('2026-06-30');
  const [capacity, setCapacity] = useState(60);

  // Class Roster Modal State
  const [rosterCohort, setRosterCohort] = useState<Cohort | null>(null);
  const [newStudentEmail, setNewStudentEmail] = useState('');
  const [rosterStudents, setRosterStudents] = useState([
    { id: 'st-1', name: 'Alex Rivera', email: 'alex@lms.demo', attendance: '96.2%', status: 'active', enrolledDate: '2026-03-01' },
    { id: 'st-2', name: 'Daniel Wu', email: 'daniel.wu@acmelearning.com', attendance: '94.0%', status: 'active', enrolledDate: '2026-03-01' },
    { id: 'st-3', name: 'Sophia Patel', email: 'sophia.p@acmelearning.com', attendance: '98.5%', status: 'active', enrolledDate: '2026-03-05' },
    { id: 'st-4', name: 'Kwame Mensah', email: 'kwame.m@acmelearning.com', attendance: '91.8%', status: 'active', enrolledDate: '2026-03-10' },
  ]);

  const filteredCohorts = cohorts.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase());
    const matchesFaculty = !isFaculty || (
      c.instructors?.includes('u-004') ||
      c.instructors?.includes(user?.id || '') ||
      c.id === 'coh-001' || c.id === 'coh-002' || c.id === 'coh-004'
    );
    return matchesSearch && matchesFaculty;
  });

  const handleOpenCreate = () => {
    setIsEditing(false);
    setSelectedCohort(null);
    setName('');
    setCode('');
    setCourseId('c-001');
    setStartDate('2026-03-01');
    setEndDate('2026-06-30');
    setCapacity(60);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: Cohort) => {
    setIsEditing(true);
    setSelectedCohort(c);
    setName(c.name);
    setCode(c.code);
    setCourseId(c.courseId || 'c-001');
    setStartDate(c.startDate.split('T')[0]);
    setEndDate(c.endDate.split('T')[0]);
    setCapacity(c.capacity || 60);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing && selectedCohort) {
      setCohorts(cohorts.map((c) => c.id === selectedCohort.id ? {
        ...c, name, code, courseId, startDate, endDate, capacity, updatedAt: new Date().toISOString()
      } : c));
    } else {
      const newCohort: Cohort = {
        id: `coh-${Date.now()}`,
        name,
        code,
        organizationId: 'org-001',
        courseId,
        startDate,
        endDate,
        instructorIds: ['u-004'],
        learnerCount: 0,
        capacity,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setCohorts([newCohort, ...cohorts]);
    }
    setIsModalOpen(false);
  };

  const handleAssignStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentEmail) return;
    const newEntry = {
      id: `st-${Date.now()}`,
      name: newStudentEmail.split('@')[0].replace('.', ' '),
      email: newStudentEmail,
      attendance: '100%',
      status: 'active',
      enrolledDate: new Date().toISOString().slice(0, 10)
    };
    setRosterStudents([...rosterStudents, newEntry]);
    setNewStudentEmail('');
    if (rosterCohort) {
      setCohorts(cohorts.map((c) => c.id === rosterCohort.id ? { ...c, learnerCount: (c.learnerCount || 0) + 1 } : c));
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="badge badge-primary">{isFaculty ? 'Faculty Teaching Scope' : 'Academic Structure'}</span>
            <span className="text-muted text-xs">Acme Learning Corp &bull; AY 2026–2027</span>
            {isFaculty && <span className="badge badge-draft">Dr. James Wilson</span>}
          </div>
          <h1 style={{ fontSize: '1.75rem', margin: 0 }}>
            {isFaculty ? 'My Assigned Classes & Batches' : 'Classes, Sections & Cohort Batches'}
          </h1>
          <p className="text-secondary text-sm">
            {isFaculty
              ? 'View class schedules, student rosters, and attendance records for batches under your instruction'
              : 'Organize student cohorts, allocate section capacity, assign faculty, and manage class rosters'}
          </p>
        </div>
        {isFaculty ? (
          <Link to="/attendance" className="btn btn-secondary">
            <Calendar size={16} /> View Teaching Timetable
          </Link>
        ) : (
          <button className="btn btn-primary" onClick={handleOpenCreate}>
            <Plus size={16} /> Create Class / Cohort
          </button>
        )}
      </div>

      <div className="card" style={{ padding: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search cohorts by name or batch code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '38px' }}
            />
          </div>
          <span className="text-muted text-xs font-semibold">{filteredCohorts.length} Cohorts Active</span>
        </div>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Class / Cohort</th>
              <th>Curriculum Course</th>
              <th>Assigned Faculty</th>
              <th>Academic Period</th>
              <th>Seat Capacity</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredCohorts.map((c) => {
              const course = mockCourses.find((co) => co.id === c.courseId);

              return (
                <tr key={c.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        background: 'var(--primary-light)',
                        color: 'var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <UsersRound size={18} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600 }}>{c.name}</div>
                        <code style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.code}</code>
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
                    <span className="badge badge-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <User size={12} /> Dr. James Wilson
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.825rem' }}>
                      <Calendar size={13} color="var(--text-muted)" />
                      <span>{new Date(c.startDate).toLocaleDateString([], { month: 'short', year: 'numeric' })} &ndash; {new Date(c.endDate).toLocaleDateString([], { month: 'short', year: 'numeric' })}</span>
                    </div>
                  </td>
                  <td>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                        <span>{c.learnerCount} / {c.capacity}</span>
                        <span className="text-muted text-xs">{Math.round((c.learnerCount / (c.capacity || 1)) * 100)}%</span>
                      </div>
                      <div className="progress-bar-bg" style={{ height: '6px' }}>
                        <div
                          className="progress-bar-fill"
                          style={{ width: `${Math.min(100, Math.round((c.learnerCount / (c.capacity || 1)) * 100))}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`badge badge-${c.status}`}>{c.status}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setRosterCohort(c)}
                        title="View Class Students Roster"
                        style={{ color: 'var(--primary)', borderColor: 'var(--primary)' }}
                      >
                        <Users size={13} /> Class Roster
                      </button>
                      {isFaculty ? (
                        <Link to="/attendance" className="btn btn-secondary btn-sm">
                          <Clock size={13} /> Timetable
                        </Link>
                      ) : (
                        <button className="btn btn-secondary btn-sm" onClick={() => handleOpenEdit(c)}>
                          <Edit2 size={13} /> Edit
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Class Students Roster Modal */}
      {rosterCohort && (
        <div className="modal-overlay" onClick={() => setRosterCohort(null)}>
          <div className="modal-card" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: '1.15rem', margin: 0 }}>Class Roster &bull; {rosterCohort.name}</h3>
                <p className="text-muted text-xs">Section Code: {rosterCohort.code} &bull; Capacity: {rosterStudents.length} / {rosterCohort.capacity} Enrolled</p>
              </div>
              <button onClick={() => setRosterCohort(null)} style={{ color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Quick Add Student to Batch Form (Admin only) */}
              {!isFaculty && (
                <form onSubmit={handleAssignStudent} style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="email"
                    required
                    placeholder="Enter student email to add to this batch..."
                    className="form-input"
                    value={newStudentEmail}
                    onChange={(e) => setNewStudentEmail(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button type="submit" className="btn btn-primary btn-sm">
                    <Plus size={14} /> Assign Student
                  </button>
                </form>
              )}

              {/* Roster List Table */}
              <div className="table-container" style={{ maxHeight: '280px', overflowY: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Email</th>
                      <th>Attendance</th>
                      <th>Enrolled Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rosterStudents.map((st) => (
                      <tr key={st.id}>
                        <td style={{ fontWeight: 600 }}>{st.name}</td>
                        <td className="text-muted text-xs">{st.email}</td>
                        <td>
                          <span style={{ fontWeight: 700, color: 'var(--success)' }}>{st.attendance}</span>
                        </td>
                        <td className="text-muted text-xs">{st.enrolledDate}</td>
                        <td>
                          <span className="badge badge-active">{st.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setRosterCohort(null)}>Close Roster</button>
            </div>
          </div>
        </div>
      )}

      {/* Cohort Create / Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '560px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', margin: 0 }}>
                {isEditing ? 'Edit Class / Cohort' : 'Create New Class Batch'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} style={{ color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Cohort / Class Name <span className="required">*</span></label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Fall 2026 Computer Science Section A"
                      className="form-input"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Batch Code <span className="required">*</span></label>
                    <input
                      type="text"
                      required
                      placeholder="CS-2026-A"
                      className="form-input"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Associated Course Program</label>
                  <select className="form-select" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
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
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Date</label>
                    <input
                      type="date"
                      required
                      className="form-input"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Capacity (Max Seats)</label>
                  <input
                    type="number"
                    min="1"
                    className="form-input"
                    value={capacity}
                    onChange={(e) => setCapacity(parseInt(e.target.value) || 50)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {isEditing ? 'Save Changes' : 'Create Cohort'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
