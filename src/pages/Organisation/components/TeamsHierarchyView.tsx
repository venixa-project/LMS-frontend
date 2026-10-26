import React, { useState } from 'react';
import { useHRMS } from '../context/OrganisationContext';
import { TeamPod } from '../types';
import {
  Network,
  Users,
  PlusCircle,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Target,
  Edit,
  X,
  Save,
  Layers,
  Sparkles,
} from 'lucide-react';

export const TeamsHierarchyView: React.FC = () => {
  const { currentCompany, departments, employees, showToast } = useHRMS();

  const companyEmployees = employees.filter(
    (e) => e.companyId === currentCompany.id || e.companyId === 'comp-1'
  );

  // Initial mock teams
  const [teams, setTeams] = useState<TeamPod[]>([
    {
      id: 'team-1',
      companyId: currentCompany.id,
      name: 'Platform Core & Cloud Squad',
      departmentId: departments[0]?.name || 'Engineering & Product',
      leadId: companyEmployees[0]?.id || 'emp-sa',
      memberIds: [companyEmployees[0]?.id, companyEmployees[1]?.id, companyEmployees[5]?.id].filter(Boolean),
      objective: 'Scalable distributed backend services, authentication tokens, and multi-tenant isolation.',
      status: 'Active',
    },
    {
      id: 'team-2',
      companyId: currentCompany.id,
      name: 'Design System & UX Pod',
      departmentId: departments[0]?.name || 'Engineering & Product',
      leadId: companyEmployees[1]?.id || 'emp-1',
      memberIds: [companyEmployees[1]?.id, companyEmployees[6]?.id].filter(Boolean),
      objective: 'Enterprise UI design system tokens, responsive navigation layouts, and micro-interactions.',
      status: 'Active',
    },
    {
      id: 'team-3',
      companyId: currentCompany.id,
      name: 'Talent Acquisition & People Ops',
      departmentId: departments[1]?.name || 'Human Resources & People',
      leadId: companyEmployees[2]?.id || 'emp-2',
      memberIds: [companyEmployees[2]?.id, companyEmployees[3]?.id].filter(Boolean),
      objective: 'End-to-end recruitment pipelines, onboarding automation, and probation confirmation tracking.',
      status: 'Active',
    },
    {
      id: 'team-4',
      companyId: currentCompany.id,
      name: 'Enterprise Revenue & CRM Squad',
      departmentId: departments[3]?.name || 'Sales & Growth',
      leadId: companyEmployees[4]?.id || 'emp-4',
      memberIds: [companyEmployees[4]?.id].filter(Boolean),
      objective: 'Sales pipeline stage transitions, enterprise accounts follow-up, and deal closing analytics.',
      status: 'Active',
    },
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<TeamPod | null>(null);

  // Form State
  const [teamName, setTeamName] = useState('');
  const [teamDept, setTeamDept] = useState(departments[0]?.name || 'Engineering & Product');
  const [teamLeadId, setTeamLeadId] = useState(companyEmployees[0]?.id || '');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [teamObjective, setTeamObjective] = useState('');
  const [teamStatus, setTeamStatus] = useState<'Active' | 'Formulating' | 'Completed'>('Active');

  const openCreateModal = () => {
    setEditingTeam(null);
    setTeamName('');
    setTeamDept(departments[0]?.name || 'Engineering & Product');
    setTeamLeadId(companyEmployees[0]?.id || '');
    setSelectedMemberIds([companyEmployees[0]?.id || '']);
    setTeamObjective('');
    setTeamStatus('Active');
    setIsModalOpen(true);
  };

  const openEditModal = (t: TeamPod) => {
    setEditingTeam(t);
    setTeamName(t.name);
    setTeamDept(t.departmentId);
    setTeamLeadId(t.leadId);
    setSelectedMemberIds(t.memberIds);
    setTeamObjective(t.objective);
    setTeamStatus(t.status);
    setIsModalOpen(true);
  };

  const toggleMemberSelection = (empId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId]
    );
  };

  const handleSaveTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim() || !teamLeadId) {
      showToast('Team Name and Team Lead are required.', 'warning');
      return;
    }

    if (editingTeam) {
      setTeams((prev) =>
        prev.map((t) =>
          t.id === editingTeam.id
            ? {
                ...t,
                name: teamName.trim(),
                departmentId: teamDept,
                leadId: teamLeadId,
                memberIds: selectedMemberIds,
                objective: teamObjective.trim(),
                status: teamStatus,
              }
            : t
        )
      );
      showToast(`Team Pod '${teamName}' updated successfully!`, 'success');
    } else {
      const newTeam: TeamPod = {
        id: `team-${Date.now()}`,
        companyId: currentCompany.id,
        name: teamName.trim(),
        departmentId: teamDept,
        leadId: teamLeadId,
        memberIds: selectedMemberIds,
        objective: teamObjective.trim(),
        status: teamStatus,
      };
      setTeams((prev) => [newTeam, ...prev]);
      showToast(`Team Pod '${newTeam.name}' activated!`, 'success');
    }

    setIsModalOpen(false);
  };

  const filteredTeams = teams.filter((t) => {
    const matchesSearch =
      !searchTerm ||
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.objective.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = deptFilter === 'All' || t.departmentId === deptFilter;
    return matchesSearch && matchesDept;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* KPI Counters */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div style={{ background: 'var(--bg-card, #ffffff)', borderRadius: '14px', border: '1px solid var(--border-subtle, #e2e8f0)', padding: '1.25rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '0.25rem' }}>
            ACTIVE SQUADS & PODS
          </span>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>{teams.length} Teams</div>
          <span style={{ fontSize: '0.75rem', color: 'var(--brand-blue, #2563EB)', fontWeight: 600 }}>Cross-functional agile units</span>
        </div>

        <div style={{ background: 'var(--bg-card, #ffffff)', borderRadius: '14px', border: '1px solid var(--border-subtle, #e2e8f0)', padding: '1.25rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '0.25rem' }}>
            ASSIGNED STAFF
          </span>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--brand-blue, #2563EB)' }}>
            {new Set(teams.flatMap((t) => t.memberIds)).size} Specialists
          </div>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Allocated across core projects</span>
        </div>

        <div style={{ background: 'var(--bg-card, #ffffff)', borderRadius: '14px', border: '1px solid var(--border-subtle, #e2e8f0)', padding: '1.25rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '0.25rem' }}>
            ORGANIZATION SQUADS
          </span>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
            {new Set(teams.map((t) => t.departmentId)).size} Departments
          </div>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Functional squad alignments</span>
        </div>
      </div>

      {/* Action and Filter Bar */}
      <div style={{ background: 'var(--bg-card, #ffffff)', borderRadius: '16px', border: '1px solid var(--border-subtle, #e2e8f0)', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '260px' }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: '320px' }}>
              <Search size={15} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search teams, objectives..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '0.5rem 0.75rem 0.5rem 2rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.825rem' }}
              />
            </div>

            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.825rem', background: '#fff' }}
            >
              <option value="All">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: 'none',
              background: 'var(--brand-blue, #2563EB)',
              color: '#fff',
              fontSize: '0.825rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(37, 99, 235, 0.25)',
            }}
          >
            <PlusCircle size={15} /> Create Team / Pod
          </button>
        </div>

        {/* Card Grid of Teams */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {filteredTeams.map((team) => {
            const lead = companyEmployees.find((e) => e.id === team.leadId) || companyEmployees[0];
            const members = companyEmployees.filter((e) => team.memberIds.includes(e.id));

            return (
              <div
                key={team.id}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '14px',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 2px 4px rgba(15, 23, 42, 0.02)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.65rem' }}>
                    <div>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.2rem 0' }}>
                        {team.name}
                      </h4>
                      <span style={{ fontSize: '0.72rem', color: 'var(--brand-blue, #2563EB)', fontWeight: 600 }}>
                        {team.departmentId}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          padding: '0.2rem 0.5rem',
                          borderRadius: '9999px',
                          background: team.status === 'Active' ? '#dcfce7' : '#fef3c7',
                          color: team.status === 'Active' ? '#15803d' : '#b45309',
                        }}
                      >
                        {team.status}
                      </span>
                      <button
                        type="button"
                        onClick={() => openEditModal(team)}
                        style={{
                          background: '#fff',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          padding: '0.3rem 0.5rem',
                          color: '#475569',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                        }}
                      >
                        <Edit size={12} />
                      </button>
                    </div>
                  </div>

                  <p style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.5, margin: '0 0 1rem 0' }}>
                    {team.objective}
                  </p>
                </div>

                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.85rem' }}>
                  {/* Lead */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.65rem' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b' }}>LEAD:</span>
                    {lead ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <img src={lead.avatar} alt={lead.firstName} style={{ width: '20px', height: '20px', borderRadius: '50%' }} />
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0f172a' }}>{lead.firstName} {lead.lastName}</span>
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Unassigned</span>
                    )}
                  </div>

                  {/* Members */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      {members.slice(0, 4).map((m, idx) => (
                        <img
                          key={m.id}
                          src={m.avatar}
                          alt={m.firstName}
                          title={`${m.firstName} ${m.lastName}`}
                          style={{
                            width: '26px',
                            height: '26px',
                            borderRadius: '50%',
                            border: '2px solid #ffffff',
                            marginLeft: idx > 0 ? '-8px' : 0,
                          }}
                        />
                      ))}
                      {members.length > 4 && (
                        <span
                          style={{
                            width: '26px',
                            height: '26px',
                            borderRadius: '50%',
                            background: '#e2e8f0',
                            color: '#475569',
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '2px solid #ffffff',
                            marginLeft: '-8px',
                          }}
                        >
                          +{members.length - 4}
                        </span>
                      )}
                    </div>

                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                      {team.memberIds.length} Squad Members
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL: CREATE / EDIT TEAM */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
          onClick={() => setIsModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '620px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {editingTeam ? 'Edit Team / Pod' : 'Create Functional Squad / Pod'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveTeam} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>Pod / Squad Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Identity Architecture Pod"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>Department Alignment *</label>
                  <select
                    value={teamDept}
                    onChange={(e) => setTeamDept(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#fff' }}
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>Pod Status</label>
                  <select
                    value={teamStatus}
                    onChange={(e) => setTeamStatus(e.target.value as any)}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#fff' }}
                  >
                    <option value="Active">Active</option>
                    <option value="Formulating">Formulating</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>Team / Technical Lead *</label>
                <select
                  value={teamLeadId}
                  onChange={(e) => setTeamLeadId(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#fff' }}
                >
                  {companyEmployees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.firstName} {e.lastName} ({e.designationId})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                  Assign Squad Members ({selectedMemberIds.length} selected)
                </label>
                <div style={{ maxHeight: '160px', overflowY: 'auto', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.5rem' }}>
                  {companyEmployees.map((e) => {
                    const isChecked = selectedMemberIds.includes(e.id);
                    return (
                      <label
                        key={e.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.65rem',
                          padding: '0.35rem 0.5rem',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          background: isChecked ? '#f0fdf4' : 'transparent',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleMemberSelection(e.id)}
                          style={{ accentColor: '#059669' }}
                        />
                        <img src={e.avatar} alt={e.firstName} style={{ width: '22px', height: '22px', borderRadius: '50%' }} />
                        <span style={{ fontSize: '0.8rem', fontWeight: isChecked ? 700 : 500, color: '#0f172a' }}>
                          {e.firstName} {e.lastName}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: '#64748b', marginLeft: 'auto' }}>
                          {e.departmentId}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>Mission & Strategic Objective</label>
                <textarea
                  rows={2}
                  placeholder="Define deliverables, milestone target, and KPIs..."
                  value={teamObjective}
                  onChange={(e) => setTeamObjective(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{ padding: '0.55rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontSize: '0.85rem', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '0.55rem 1.25rem', borderRadius: '8px', border: 'none', background: 'var(--brand-blue, #2563EB)', color: '#fff', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 4px rgba(37, 99, 235, 0.25)' }}
                >
                  {editingTeam ? 'Save Pod Settings' : 'Create Squad Pod'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
