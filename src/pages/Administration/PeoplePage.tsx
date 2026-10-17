import React, { useState } from 'react';
import { mockUsers } from '../../data/mockUsers';
import { mockDepartments, mockCohorts } from '../../data/mockData';
import { User, RoleName } from '../../types';
import {
  Users, UserPlus, Upload, Search, Filter, Mail, CheckCircle2,
  Clock, AlertCircle, X, Download, Shield, Eye, MoreHorizontal
} from 'lucide-react';

export const PeoplePage: React.FC = () => {
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [selectedUserDetail, setSelectedUserDetail] = useState<User | null>(null);

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteFirstName, setInviteFirstName] = useState('');
  const [inviteLastName, setInviteLastName] = useState('');
  const [inviteRole, setInviteRole] = useState<RoleName>('learner');
  const [inviteDept, setInviteDept] = useState('dep-001');

  // CSV Import state
  const [csvStep, setCsvStep] = useState<'upload' | 'preview' | 'complete'>('upload');
  const [csvFileName, setCsvFileName] = useState<string | null>(null);

  const filteredUsers = users.filter((u) => {
    const matchesSearch = u.displayName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.activeRole === roleFilter;
    const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    const newUser: User = {
      id: `u-${Date.now()}`,
      email: inviteEmail,
      firstName: inviteFirstName,
      lastName: inviteLastName,
      displayName: `${inviteFirstName} ${inviteLastName}`,
      activeRole: inviteRole,
      roles: [],
      organizationId: 'org-001',
      departmentId: inviteDept,
      status: 'invited',
      mfaEnabled: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setUsers([newUser, ...users]);
    setIsInviteModalOpen(false);
    setInviteEmail('');
    setInviteFirstName('');
    setInviteLastName('');
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '4px' }}>People Directory & Access Management</h1>
          <p className="text-secondary text-sm">Manage enterprise users, role grants, bulk CSV onboarding, and active invitations</p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={() => { setCsvStep('upload'); setIsCsvModalOpen(true); }}>
            <Upload size={16} /> Bulk CSV Import
          </button>
          <button className="btn btn-primary" onClick={() => setIsInviteModalOpen(true)}>
            <UserPlus size={16} /> Invite User
          </button>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="card" style={{ padding: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search by name or email address..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '38px' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <select className="form-select" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} style={{ width: 'auto' }}>
              <option value="all">All Roles</option>
              <option value="platform_admin">Platform Admin</option>
              <option value="org_admin">Org Admin</option>
              <option value="lms_admin">LMS Admin</option>
              <option value="instructor">Instructor</option>
              <option value="assessment_author">Assessment Author</option>
              <option value="grader">Grader</option>
              <option value="learner">Learner</option>
            </select>

            <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ width: 'auto' }}>
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="invited">Invited / Pending</option>
              <option value="suspended">Suspended</option>
              <option value="deactivated">Deactivated</option>
            </select>
          </div>

          <span className="text-muted text-xs font-semibold">{filteredUsers.length} Users found</span>
        </div>
      </div>

      {/* Users Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>User Name</th>
              <th>Email</th>
              <th>Assigned Role</th>
              <th>Department</th>
              <th>Status</th>
              <th>Last Active</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((u) => {
              const dept = mockDepartments.find((d) => d.id === u.departmentId);

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
                      <span style={{ fontWeight: 600 }}>{u.displayName}</span>
                    </div>
                  </td>
                  <td>{u.email}</td>
                  <td>
                    <span className="badge badge-primary" style={{ textTransform: 'capitalize' }}>
                      {u.activeRole.replace('_', ' ')}
                    </span>
                  </td>
                  <td>{dept ? dept.name : 'Corporate Headquarters'}</td>
                  <td>
                    <span className={`badge badge-${u.status}`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="text-muted text-xs">
                    {u.lastLogin ? new Date(u.lastLogin).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Never'}
                  </td>
                  <td>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setSelectedUserDetail(u)}
                      title="Inspect user details and enrollment scopes"
                    >
                      <Eye size={13} /> View
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Invite Modal */}
      {isInviteModalOpen && (
        <div className="modal-overlay" onClick={() => setIsInviteModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Invite Team Member / Learner</h3>
              <button onClick={() => setIsInviteModalOpen(false)} style={{ color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSendInvite}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">First Name <span className="required">*</span></label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Jordan"
                      className="form-input"
                      value={inviteFirstName}
                      onChange={(e) => setInviteFirstName(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Last Name <span className="required">*</span></label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Blake"
                      className="form-input"
                      value={inviteLastName}
                      onChange={(e) => setInviteLastName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Work Email <span className="required">*</span></label>
                  <input
                    type="email"
                    required
                    placeholder="user@acmelearning.com"
                    className="form-input"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Initial Role</label>
                    <select
                      className="form-select"
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as RoleName)}
                    >
                      <option value="learner">Learner</option>
                      <option value="instructor">Instructor</option>
                      <option value="assessment_author">Assessment Author</option>
                      <option value="grader">Grader</option>
                      <option value="lms_admin">LMS Admin</option>
                      <option value="org_admin">Org Admin</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Department</label>
                    <select
                      className="form-select"
                      value={inviteDept}
                      onChange={(e) => setInviteDept(e.target.value)}
                    >
                      {mockDepartments.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px',
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)'
                }}>
                  <strong>Invitation Behavior:</strong> An automated setup invitation will be generated with an initial 7-day token expiry. The recipient can set their password and accept terms.
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsInviteModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk CSV Import Modal */}
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
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>File: {csvFileName}</div>
                      <div className="text-muted text-xs">4 Rows detected: 3 Valid, 1 Warning</div>
                    </div>
                    <span className="badge badge-warning">Validation Simulated</span>
                  </div>

                  <div className="table-container" style={{ maxHeight: '220px', marginBottom: '16px' }}>
                    <table className="table" style={{ fontSize: '0.8rem' }}>
                      <thead>
                        <tr>
                          <th>Row</th>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Role</th>
                          <th>Status</th>
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

      {/* User Detail Drawer / Modal */}
      {selectedUserDetail && (
        <div className="modal-overlay" onClick={() => setSelectedUserDetail(null)}>
          <div className="modal-card" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'var(--primary)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700
                }}>
                  {selectedUserDetail.firstName[0]}
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', margin: 0 }}>{selectedUserDetail.displayName}</h3>
                  <p className="text-muted text-xs">{selectedUserDetail.email}</p>
                </div>
              </div>
              <button onClick={() => setSelectedUserDetail(null)} style={{ color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span className="text-muted text-sm">Assigned Role</span>
                <span className="badge badge-primary">{selectedUserDetail.activeRole}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span className="text-muted text-sm">Account Status</span>
                <span className={`badge badge-${selectedUserDetail.status}`}>{selectedUserDetail.status}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span className="text-muted text-sm">Timezone / Locale</span>
                <span className="text-sm font-semibold">{selectedUserDetail.timezone} ({selectedUserDetail.locale})</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span className="text-muted text-sm">MFA Protection</span>
                <span className="text-sm">{selectedUserDetail.mfaEnabled ? 'Enabled' : 'Disabled'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0' }}>
                <span className="text-muted text-sm">Created At</span>
                <span className="text-sm">{new Date(selectedUserDetail.createdAt).toLocaleDateString()}</span>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  alert(`Resent onboarding invitation link to ${selectedUserDetail.email}`);
                }}
              >
                Resend Invitation Link
              </button>
              <button className="btn btn-secondary" onClick={() => setSelectedUserDetail(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
