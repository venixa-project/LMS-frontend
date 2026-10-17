import React, { useState } from 'react';
import { mockDepartments } from '../../data/mockData';
import { Department } from '../../types';
import { Network, Plus, Edit2, Trash2, Users, ChevronRight, X, AlertTriangle } from 'lucide-react';

export const DepartmentsPage: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>(mockDepartments);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<string>('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Build tree hierarchy
  const rootDepartments = departments.filter((d) => !d.parentId);
  const getSubDepartments = (parent: string) => departments.filter((d) => d.parentId === parent);

  const handleOpenCreate = () => {
    setIsEditing(false);
    setSelectedDept(null);
    setName('');
    setParentId('');
    setStatus('active');
    setValidationError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (dept: Department) => {
    setIsEditing(true);
    setSelectedDept(dept);
    setName(dept.name);
    setParentId(dept.parentId || '');
    setStatus(dept.status);
    setValidationError(null);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent circular hierarchy
    if (isEditing && selectedDept && parentId === selectedDept.id) {
      setValidationError('A department cannot be its own parent. Please select a valid parent department.');
      return;
    }

    if (isEditing && selectedDept) {
      setDepartments(departments.map((d) => d.id === selectedDept.id ? {
        ...d, name, parentId: parentId || undefined, status, updatedAt: new Date().toISOString()
      } : d));
    } else {
      const newDept: Department = {
        id: `dep-${Date.now()}`,
        name,
        organizationId: 'org-001',
        parentId: parentId || undefined,
        status,
        memberCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setDepartments([...departments, newDept]);
    }
    setIsModalOpen(false);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '4px' }}>Departments & Organization Hierarchy</h1>
          <p className="text-secondary text-sm">Organize teams, reporting units, and assign cohort enrollment boundaries</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenCreate}>
          <Plus size={16} /> Add Department
        </button>
      </div>

      <div className="grid-3" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <span className="text-muted text-xs font-semibold">Total Departments</span>
          <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>{departments.length}</div>
          <p className="text-muted text-xs">Across Acme Learning Corp</p>
        </div>
        <div className="stat-card">
          <span className="text-muted text-xs font-semibold">Total Assigned Staff</span>
          <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>
            {departments.reduce((acc, curr) => acc + curr.memberCount, 0)}
          </div>
          <p className="text-muted text-xs">Instructors & Learners</p>
        </div>
        <div className="stat-card">
          <span className="text-muted text-xs font-semibold">Active Status</span>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--success)' }}>
            {departments.filter((d) => d.status === 'active').length} Active
          </div>
          <p className="text-muted text-xs">All divisions operational</p>
        </div>
      </div>

      {/* Department Tree / List View */}
      <div className="card">
        <h3 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>Organizational Structure</h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {rootDepartments.map((root) => {
            const subDepts = getSubDepartments(root.id);

            return (
              <div
                key={root.id}
                style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: 'var(--primary-light)',
                      color: 'var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Network size={16} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{root.name}</div>
                      <div className="text-muted text-xs">
                        {root.memberCount} members &bull; Status: <span className="text-success">{root.status}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="badge badge-active">{subDepts.length} Sub-teams</span>
                    <button className="btn btn-secondary btn-sm" onClick={() => handleOpenEdit(root)}>
                      <Edit2 size={13} /> Edit
                    </button>
                  </div>
                </div>

                {/* Sub-departments */}
                {subDepts.length > 0 && (
                  <div style={{ marginTop: '14px', paddingLeft: '24px', borderLeft: '2px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {subDepts.map((sub) => (
                      <div
                        key={sub.id}
                        style={{
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '10px 14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <ChevronRight size={14} color="var(--primary)" />
                          <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{sub.name}</span>
                          <span className="text-muted text-xs">({sub.memberCount} members)</span>
                        </div>
                        <button className="btn btn-secondary btn-sm" onClick={() => handleOpenEdit(sub)}>
                          <Edit2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', margin: 0 }}>
                {isEditing ? 'Edit Department' : 'Create Department'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} style={{ color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="modal-body">
                {validationError && (
                  <div style={{
                    background: 'var(--danger-bg)',
                    border: '1px solid var(--danger-border)',
                    color: 'var(--danger)',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.85rem',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <AlertTriangle size={16} />
                    <span>{validationError}</span>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Department Name <span className="required">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Data Engineering"
                    className="form-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Parent Department</label>
                  <select
                    className="form-select"
                    value={parentId}
                    onChange={(e) => setParentId(e.target.value)}
                  >
                    <option value="">(None - Top Level Department)</option>
                    {departments
                      .filter((d) => !selectedDept || d.id !== selectedDept.id)
                      .map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                  </select>
                  <span className="form-helper">Prevents circular parent hierarchy dependencies</span>
                </div>

                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    className="form-select"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {isEditing ? 'Save Changes' : 'Create Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
