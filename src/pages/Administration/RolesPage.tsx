import React, { useState } from 'react';
import { useAuthStore } from '../../lib/store';
import { getPermissionsForRole, getNavigationForRole } from '../../lib/permissions';
import { RoleName, PermissionResource, PermissionAction, PermissionScope } from '../../types';
import {
  Shield, Plus, Search, Edit2, Copy, AlertTriangle, Check,
  Eye, CheckCircle2, X, Lock, History, ShieldAlert, ArrowRight
} from 'lucide-react';

interface RoleItem {
  id: string;
  role: RoleName;
  name: string;
  description: string;
  isTemplate: boolean;
  memberCount: number;
  scope: string;
  status: string;
  updatedAt: string;
}

const initialRoles: RoleItem[] = [
  { id: 'r-1', role: 'platform_admin', name: 'Platform Administrator', description: 'Full system-wide administrative control across multi-tenant organizations, departments, user directory, global RBAC, and system integrations', isTemplate: true, memberCount: 2, scope: 'Global & Organization', status: 'active', updatedAt: '2026-10-18' },
  { id: 'r-2', role: 'trainer', name: 'Trainer / Faculty', description: 'Course authoring studio, live webinar hosting, attendance rosters, question banks, quizzes, grading queue, and AI evaluation review', isTemplate: true, memberCount: 28, scope: 'Assigned Cohorts & Classes', status: 'active', updatedAt: '2026-10-18' },
  { id: 'r-3', role: 'student', name: 'Student / Learner', description: 'Interactive course player, live classes, assignment deliverable submission, timed proctored exam engine, and verifiable digital credentials', isTemplate: true, memberCount: 940, scope: 'Own Records & Enrolled Cohorts', status: 'active', updatedAt: '2026-10-18' },
];

const modulesList: { resource: PermissionResource; label: string }[] = [
  { resource: 'organizations', label: 'Organizations & Multi-Tenancy' },
  { resource: 'departments', label: 'Departments & Hierarchy' },
  { resource: 'users', label: 'People & Identity' },
  { resource: 'cohorts', label: 'Cohorts & Batches' },
  { resource: 'roles', label: 'Roles & RBAC Policies' },
  { resource: 'courses', label: 'Courses & Curriculum' },
  { resource: 'paths', label: 'Learning Paths' },
  { resource: 'live_sessions', label: 'Live Sessions' },
  { resource: 'question_banks', label: 'Question Banks' },
  { resource: 'assessments', label: 'Assessments & Quizzes' },
  { resource: 'grading', label: 'Grading & Rubrics' },
  { resource: 'proctoring', label: 'Proctoring Center' },
  { resource: 'certificates', label: 'Certificates' },
  { resource: 'reports', label: 'Analytics & Reports' },
  { resource: 'integrations', label: 'Integrations & APIs' },
  { resource: 'platform_settings', label: 'Platform Settings' },
];

export const RolesPage: React.FC = () => {
  const [roles, setRoles] = useState<RoleItem[]>(initialRoles);
  const [selectedRole, setSelectedRole] = useState<RoleItem>(initialRoles[0]);
  const [activeTab, setActiveTab] = useState<'matrix' | 'simulator' | 'audit'>('matrix');
  const [search, setSearch] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Simulation role picker
  const [simRole, setSimRole] = useState<RoleName>('trainer');

  const permissions = getPermissionsForRole(selectedRole.role);
  const simulatedNav = getNavigationForRole(simRole);

  const hasPermission = (resource: PermissionResource, action: PermissionAction) => {
    return permissions.some((p) => p.resource === resource && p.action === action);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '4px' }}>Dynamic Roles & RBAC Matrix</h1>
          <p className="text-secondary text-sm">Fine-grained permission controls, scope boundaries, and role simulation</p>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => alert("Custom Role Builder: Choose a template role to clone and customize its resource permissions.")}
        >
          <Plus size={16} /> Create Custom Role
        </button>
      </div>

      {/* Tabs */}
      <div className="tabs-nav">
        <button
          className={`tab-btn ${activeTab === 'matrix' ? 'active' : ''}`}
          onClick={() => setActiveTab('matrix')}
        >
          <Shield size={16} />
          Permission Matrix
        </button>
        <button
          className={`tab-btn ${activeTab === 'simulator' ? 'active' : ''}`}
          onClick={() => setActiveTab('simulator')}
        >
          <Eye size={16} />
          Role Simulator / Preview
        </button>
        <button
          className={`tab-btn ${activeTab === 'audit' ? 'active' : ''}`}
          onClick={() => setActiveTab('audit')}
        >
          <History size={16} />
          Audit Trail
        </button>
      </div>

      {activeTab === 'matrix' && (
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px' }}>
          {/* Roles Selector Sidebar */}
          <div className="card" style={{ padding: '16px' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '12px' }}>Standard & Custom Roles</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {roles.map((r) => {
                const isSelected = selectedRole.id === r.id;
                return (
                  <div
                    key={r.id}
                    onClick={() => setSelectedRole(r)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      background: isSelected ? 'var(--primary-light)' : 'transparent',
                      border: isSelected ? '1px solid var(--primary)' : '1px solid transparent',
                      cursor: 'pointer',
                      transition: 'var(--transition)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.85rem', color: isSelected ? 'var(--primary)' : 'var(--text-main)' }}>
                        {r.name}
                      </span>
                      <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>{r.scope}</span>
                    </div>
                    <div className="text-muted text-xs" style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{r.memberCount} members</span>
                      <span>{r.isTemplate ? 'Template' : 'Custom'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Permission Matrix for Selected Role */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid var(--border-subtle)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ fontSize: '1.2rem', margin: 0 }}>{selectedRole.name}</h3>
                  <span className="badge badge-active">{selectedRole.status}</span>
                </div>
                <p className="text-muted text-xs" style={{ marginTop: '4px' }}>{selectedRole.description}</p>
              </div>

              {selectedRole.role === 'platform_admin' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--danger)', fontSize: '0.75rem', fontWeight: 600 }}>
                  <ShieldAlert size={16} />
                  <span>Super Admin Privilege Notice</span>
                </div>
              )}
            </div>

            <div className="table-container">
              <table className="table" style={{ fontSize: '0.825rem' }}>
                <thead>
                  <tr>
                    <th>Module / Resource</th>
                    <th style={{ textAlign: 'center' }}>View</th>
                    <th style={{ textAlign: 'center' }}>Create</th>
                    <th style={{ textAlign: 'center' }}>Edit</th>
                    <th style={{ textAlign: 'center' }}>Publish/Assign</th>
                    <th style={{ textAlign: 'center' }}>Configure/Admin</th>
                  </tr>
                </thead>
                <tbody>
                  {modulesList.map((m) => {
                    const canView = hasPermission(m.resource, 'view');
                    const canCreate = hasPermission(m.resource, 'create');
                    const canEdit = hasPermission(m.resource, 'edit');
                    const canPublish = hasPermission(m.resource, 'publish') || hasPermission(m.resource, 'assign');
                    const canConfig = hasPermission(m.resource, 'configure') || hasPermission(m.resource, 'archive');

                    return (
                      <tr key={m.resource}>
                        <td style={{ fontWeight: 600 }}>{m.label}</td>
                        <td style={{ textAlign: 'center' }}>
                          {canView ? <Check size={16} color="var(--success)" style={{ margin: '0 auto' }} /> : <span className="text-muted">&ndash;</span>}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {canCreate ? <Check size={16} color="var(--success)" style={{ margin: '0 auto' }} /> : <span className="text-muted">&ndash;</span>}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {canEdit ? <Check size={16} color="var(--success)" style={{ margin: '0 auto' }} /> : <span className="text-muted">&ndash;</span>}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {canPublish ? <Check size={16} color="var(--success)" style={{ margin: '0 auto' }} /> : <span className="text-muted">&ndash;</span>}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {canConfig ? <Check size={16} color="var(--success)" style={{ margin: '0 auto' }} /> : <span className="text-muted">&ndash;</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'simulator' && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Role Simulation Preview</h3>
              <p className="text-secondary text-sm">Preview visible navigation items and operational guard boundaries for any role</p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="text-sm font-semibold">Simulate Role:</span>
              <select
                className="form-select"
                value={simRole}
                onChange={(e) => setSimRole(e.target.value as RoleName)}
                style={{ width: 'auto' }}
              >
                <option value="platform_admin">Platform Admin</option>
                <option value="trainer">Trainer / Faculty</option>
                <option value="student">Student / Learner</option>
              </select>
            </div>
          </div>

          <div style={{
            background: 'var(--bg-input)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px',
            marginBottom: '20px'
          }}>
            <h4 style={{ fontSize: '0.95rem', marginBottom: '12px' }}>
              Accessible Navigation Menu ({simulatedNav.length} items visible)
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              {simulatedNav.map((item) => (
                <div
                  key={item.id}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}
                >
                  <CheckCircle2 size={16} color="var(--success)" />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{item.label}</div>
                    <div className="text-muted text-xs">{item.path} &bull; {item.group}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="card">
          <h3 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>Role Policy & RBAC Change Audit Log</h3>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Target Role</th>
                  <th>Summary</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>2026-10-15 14:22:01</td>
                  <td>Sarah Chen (admin@lms.demo)</td>
                  <td><span className="badge badge-active">EDIT_POLICY</span></td>
                  <td>Instructor</td>
                  <td>Granted live_sessions:create with assigned cohort scope</td>
                </tr>
                <tr>
                  <td>2026-10-12 09:15:30</td>
                  <td>Marcus Johnson (orgadmin@lms.demo)</td>
                  <td><span className="badge badge-active">ASSIGN_ROLE</span></td>
                  <td>Grader</td>
                  <td>Assigned Robert Vance to grading moderation queue</td>
                </tr>
                <tr>
                  <td>2026-10-01 11:00:00</td>
                  <td>System (Bootstrap)</td>
                  <td><span className="badge badge-primary">INITIALIZE</span></td>
                  <td>System Templates</td>
                  <td>Initialized 7 core enterprise role templates</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
