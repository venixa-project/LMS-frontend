import React, { useState } from 'react';
import { mockCohorts, mockCourses } from '../../data/mockData';
import { Cohort } from '../../types';
import {
  UsersRound, Plus, Search, Calendar, BookOpen, User,
  CheckCircle2, X, Edit2, Users
} from 'lucide-react';

export const CohortsPage: React.FC = () => {
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

  const filteredCohorts = cohorts.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.code.toLowerCase().includes(search.toLowerCase())
  );

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

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '4px' }}>Cohorts & Group Administration</h1>
          <p className="text-secondary text-sm">Schedule learner batches, align instructors, and enforce seat capacities</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenCreate}>
          <Plus size={16} /> Create Cohort
        </button>
      </div>

      <div className="card" style={{ padding: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
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
          <span className="text-muted text-xs font-semibold">{filteredCohorts.length} Cohorts</span>
        </div>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Cohort Name & Code</th>
              <th>Linked Course</th>
              <th>Timeline</th>
              <th>Learner Capacity</th>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                      <Calendar size={14} color="var(--text-muted)" />
                      <span>{new Date(c.startDate).toLocaleDateString()} &ndash; {new Date(c.endDate).toLocaleDateString()}</span>
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
                    <button className="btn btn-secondary btn-sm" onClick={() => handleOpenEdit(c)}>
                      <Edit2 size={13} /> Edit
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', margin: 0 }}>
                {isEditing ? 'Edit Cohort' : 'Create New Cohort'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} style={{ color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Cohort Name <span className="required">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Fall 2026 Cloud Architects"
                    className="form-input"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (!isEditing) {
                        setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '-').slice(0, 16));
                      }
                    }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Batch Code <span className="required">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. FALL-2026-CLOUD"
                    className="form-input"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                  />
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
