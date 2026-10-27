import React, { useState } from 'react';
import { useHRMS } from '../context/OrganisationContext';
import { useAuthStore } from '../../../lib/store';
import { Branch } from '../types';
import { HeadquartersSelectorModal } from './HeadquartersSelectorModal';
import {
  MapPin,
  Building2,
  PlusCircle,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Edit,
  Trash2,
  X,
  Save,
  Phone,
  Mail,
  Users,
  AlertTriangle,
  Building,
} from 'lucide-react';

export const BranchesManagementView: React.FC = () => {
  const { currentCompany, branches, setBranches, setHeadquartersBranch, showToast } = useHRMS();
  const { user } = useAuthStore();
  const isAdmin = true; // Authorized Admin scope

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);

  // Dedicated HQ Change / Confirmation states
  const [isHqSelectorModalOpen, setIsHqSelectorModalOpen] = useState(false);
  const [confirmHqBranch, setConfirmHqBranch] = useState<Branch | null>(null);

  // Form State for Add / Edit Branch
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formState, setFormState] = useState('');
  const [formCountry, setFormCountry] = useState('India');
  const [formAddress, setFormAddress] = useState('');
  const [formPostalCode, setFormPostalCode] = useState('');
  const [formTimezone, setFormTimezone] = useState('Asia/Kolkata (IST)');
  const [formIsHQ, setFormIsHQ] = useState(false);
  const [formCapacity, setFormCapacity] = useState(100);
  const [formStatus, setFormStatus] = useState<'Operational' | 'Planned' | 'Inactive'>('Operational');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');

  const openAddModal = () => {
    setEditingBranch(null);
    setFormName('');
    setFormCode(`BR-${Math.floor(10 + Math.random() * 90)}`);
    setFormCity('');
    setFormState('');
    setFormCountry('India');
    setFormAddress('');
    setFormPostalCode('');
    setFormTimezone('Asia/Kolkata (IST)');
    setFormIsHQ(false);
    setFormCapacity(100);
    setFormStatus('Operational');
    setFormPhone('');
    setFormEmail('');
    setIsModalOpen(true);
  };

  const openEditModal = (b: Branch) => {
    setEditingBranch(b);
    setFormName(b.name);
    setFormCode(b.code);
    setFormCity(b.city);
    setFormState(b.state || '');
    setFormCountry(b.country);
    setFormAddress(b.address || '');
    setFormPostalCode(b.postalCode || '');
    setFormTimezone(b.timezone || 'Asia/Kolkata (IST)');
    setFormIsHQ(b.isHeadquarters);
    setFormCapacity(b.capacity || 100);
    setFormStatus(b.status || 'Operational');
    setFormPhone(b.phone || '');
    setFormEmail(b.email || '');
    setIsModalOpen(true);
  };

  const handleSaveBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formCode.trim() || !formCity.trim()) {
      showToast('Branch Name, Code, and City are required.', 'warning');
      return;
    }

    if (editingBranch) {
      const updated = branches.map((b) =>
        b.id === editingBranch.id
          ? {
              ...b,
              name: formName.trim(),
              code: formCode.trim().toUpperCase(),
              city: formCity.trim(),
              state: formState.trim() || undefined,
              country: formCountry.trim(),
              address: formAddress.trim() || undefined,
              postalCode: formPostalCode.trim() || undefined,
              timezone: formTimezone,
              isHeadquarters: formIsHQ,
              capacity: formCapacity,
              status: formStatus,
              phone: formPhone.trim() || undefined,
              email: formEmail.trim() || undefined,
            }
          : formIsHQ ? { ...b, isHeadquarters: false } : b
      );
      setBranches(updated);
      showToast(`Branch '${formName}' updated successfully!`, 'success');
    } else {
      const newBranch: Branch = {
        id: `br-${Date.now()}`,
        companyId: currentCompany.id,
        name: formName.trim(),
        code: formCode.trim().toUpperCase(),
        city: formCity.trim(),
        state: formState.trim() || undefined,
        country: formCountry.trim(),
        address: formAddress.trim() || undefined,
        postalCode: formPostalCode.trim() || undefined,
        timezone: formTimezone,
        isHeadquarters: formIsHQ,
        capacity: formCapacity,
        status: formStatus,
        phone: formPhone.trim() || undefined,
        email: formEmail.trim() || undefined,
      };

      const updated = [
        newBranch,
        ...(formIsHQ ? branches.map((b) => ({ ...b, isHeadquarters: false })) : branches),
      ];
      setBranches(updated);
      showToast(`Branch '${newBranch.name}' onboarded successfully!`, 'success');
    }

    setIsModalOpen(false);
  };

  // Direct confirmation of HQ designation
  const handleConfirmSetHq = () => {
    if (!confirmHqBranch) return;
    setHeadquartersBranch(confirmHqBranch.id);
    setConfirmHqBranch(null);
  };

  const filteredBranches = branches.filter((b) => {
    const q = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !searchTerm ||
      b.name.toLowerCase().includes(q) ||
      b.code.toLowerCase().includes(q) ||
      b.city.toLowerCase().includes(q) ||
      (b.state && b.state.toLowerCase().includes(q)) ||
      b.country.toLowerCase().includes(q) ||
      (b.address && b.address.toLowerCase().includes(q));

    const matchesStatus = statusFilter === 'All' || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const hqBranch = branches.find((b) => b.isHeadquarters) || null;
  const totalCapacity = branches.reduce((acc, curr) => acc + (curr.capacity || 100), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header and KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div style={{ background: 'var(--bg-card)', borderRadius: '14px', border: '1px solid var(--border-subtle)', padding: '1.25rem', boxShadow: 'var(--shadow-sm)' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
            TOTAL BRANCHES
          </span>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>{branches.length} Locations</div>
          <span style={{ fontSize: '0.75rem', color: 'var(--brand-blue)', fontWeight: 600 }}>Active Enterprise Footprint</span>
        </div>

        {/* HEADQUARTERS KPI CARD */}
        <div style={{ background: 'var(--bg-card)', borderRadius: '14px', border: '1px solid var(--border-subtle)', padding: '1.25rem', position: 'relative', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
              HEADQUARTERS
            </span>
            {hqBranch && (
              <span
                style={{
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  padding: '0.1rem 0.4rem',
                  borderRadius: '4px',
                  background: 'rgba(217, 119, 6, 0.12)',
                  color: '#d97706',
                  border: '1px solid rgba(217, 119, 6, 0.25)',
                }}
              >
                HQ
              </span>
            )}
          </div>

          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>
            {hqBranch ? hqBranch.city : 'Not Designated'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {hqBranch ? `${hqBranch.name} (${hqBranch.code})` : 'Designate a location below'}
          </div>

          {isAdmin && (
            <button
              type="button"
              onClick={() => setIsHqSelectorModalOpen(true)}
              style={{
                marginTop: '0.65rem',
                padding: '0.3rem 0.65rem',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-card-subtle)',
                color: 'var(--text-main)',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
              }}
            >
              <Building2 size={11} color="#d97706" /> Change Headquarters
            </button>
          )}
        </div>

        <div style={{ background: 'var(--bg-card)', borderRadius: '14px', border: '1px solid var(--border-subtle)', padding: '1.25rem', boxShadow: 'var(--shadow-sm)' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
            SEATING CAPACITY
          </span>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--brand-blue)' }}>{totalCapacity.toLocaleString()} Desks</div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Across all operating facilities</span>
        </div>
      </div>

      {/* Main Table Card */}
      <div style={{ background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-subtle)', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '260px' }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: '340px' }}>
              <Search size={15} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-placeholder)' }} />
              <input
                type="text"
                placeholder="Search branches by name, city, code, address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="lms-form-input"
                style={{ paddingLeft: '2.25rem' }}
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.825rem', background: '#fff' }}
            >
              <option value="All">All Statuses</option>
              <option value="Operational">Operational</option>
              <option value="Planned">Planned</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <button
            type="button"
            onClick={openAddModal}
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
            <PlusCircle size={15} /> Add Office Branch
          </button>
        </div>

        <div className="dept-table-container">
          <table className="dept-table">
            <thead>
              <tr>
                <th style={{ padding: '0.75rem 1rem' }}>BRANCH & CODE</th>
                <th style={{ padding: '0.75rem 1rem' }}>LOCATION</th>
                <th style={{ padding: '0.75rem 1rem' }}>ADDRESS</th>
                <th style={{ padding: '0.75rem 1rem' }}>TIMEZONE</th>
                <th style={{ padding: '0.75rem 1rem' }}>CAPACITY</th>
                <th style={{ padding: '0.75rem 1rem' }}>STATUS</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredBranches.map((branch) => {
                const isHq = branch.isHeadquarters;
                const isInactive = branch.status === 'Inactive';

                return (
                  <tr key={branch.id} className="dept-row-main" style={{ background: isHq ? 'rgba(217, 119, 6, 0.08)' : undefined }}>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Building2 size={16} color={isHq ? '#d97706' : 'var(--brand-blue, #2563EB)'} />
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <span>{branch.name}</span>
                            {isHq && (
                              <span
                                style={{
                                  fontSize: '0.68rem',
                                  fontWeight: 800,
                                  padding: '0.15rem 0.45rem',
                                  borderRadius: '4px',
                                  background: 'rgba(217, 119, 6, 0.15)',
                                  color: '#f59e0b',
                                  border: '1px solid rgba(217, 119, 6, 0.3)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '2px',
                                }}
                              >
                                HQ
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{branch.code}</span>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                        {branch.city}, {branch.country}
                      </div>
                      {branch.state && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{branch.state}</div>}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', maxWidth: '240px', color: 'var(--text-secondary)' }}>
                      {branch.address || '—'}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Clock size={13} color="var(--text-muted)" />
                        {branch.timezone?.split(' ')[0] || 'Asia/Kolkata'}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontWeight: 600, color: 'var(--text-main)' }}>
                        <Users size={13} color="var(--text-muted)" />
                        {branch.capacity || 100} Desks
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '0.2rem 0.55rem',
                          borderRadius: '9999px',
                          background:
                            branch.status === 'Operational'
                              ? '#dcfce7'
                              : branch.status === 'Planned'
                              ? '#e0e7ff'
                              : '#f1f5f9',
                          color:
                            branch.status === 'Operational'
                              ? '#15803d'
                              : branch.status === 'Planned'
                              ? '#4338ca'
                              : '#64748b',
                        }}
                      >
                        {branch.status || 'Operational'}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        {/* HQ Action Controls */}
                        {isHq ? (
                          <span
                            style={{
                              fontSize: '0.7rem',
                              fontWeight: 800,
                              padding: '0.25rem 0.55rem',
                              borderRadius: '6px',
                              background: '#fef3c7',
                              color: '#b45309',
                              border: '1px solid #fde68a',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                            }}
                          >
                            <CheckCircle2 size={12} /> Current HQ
                          </span>
                        ) : isInactive ? (
                          <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Inactive (Ineligible)</span>
                        ) : (
                          isAdmin && (
                            <button
                              type="button"
                              onClick={() => setConfirmHqBranch(branch)}
                              style={{
                                padding: '0.35rem 0.7rem',
                                borderRadius: '6px',
                                border: '1px solid #d97706',
                                background: '#fffbeb',
                                color: '#b45309',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                transition: 'all 0.15s ease',
                              }}
                              title={`Set ${branch.name} as primary company Headquarters`}
                            >
                              <Building2 size={12} /> Set as HQ
                            </button>
                          )
                        )}

                        <button
                          type="button"
                          onClick={() => openEditModal(branch)}
                          style={{
                            padding: '0.35rem 0.75rem',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            background: '#fff',
                            color: '#475569',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                          }}
                        >
                          <Edit size={12} /> Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredBranches.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#64748b' }}>
                    <Building size={28} style={{ margin: '0 auto 0.5rem', opacity: 0.4 }} />
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
                      {branches.length === 0 ? 'No office branch locations created yet.' : 'No matching locations found.'}
                    </div>
                    <p style={{ margin: '0.25rem 0 0.8rem', fontSize: '0.75rem' }}>
                      {branches.length === 0
                        ? 'Click "Add Office Branch" above to onboard your enterprise offices and designate a Headquarters.'
                        : 'Try searching by a different name, city, or branch code.'}
                    </p>
                    {branches.length === 0 && (
                      <button
                        type="button"
                        onClick={openAddModal}
                        style={{
                          padding: '0.4rem 0.85rem',
                          borderRadius: '6px',
                          border: 'none',
                          background: '#059669',
                          color: '#fff',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        + Add First Location
                      </button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Dialog Modal for In-Table "Set as Headquarters" */}
      {confirmHqBranch && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '1.5rem',
              maxWidth: '480px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: '#fef3c7',
                  color: '#b45309',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Building2 size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                  Confirm Headquarters Designation
                </h3>
                <p style={{ margin: '0.15rem 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                  Update primary operating office across company profile and branches
                </p>
              </div>
            </div>

            <div
              style={{
                background: '#f8fafc',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                padding: '0.85rem 1rem',
                marginBottom: '1rem',
                fontSize: '0.8rem',
              }}
            >
              <div style={{ marginBottom: '0.4rem' }}>
                <span className="text-muted" style={{ fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700 }}>
                  New Headquarters Location:
                </span>
                <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem' }}>
                  {confirmHqBranch.name} ({confirmHqBranch.code})
                </div>
                <div style={{ color: '#475569' }}>
                  {confirmHqBranch.address || 'Standard Address'}, {confirmHqBranch.city}, {confirmHqBranch.state ? `${confirmHqBranch.state}, ` : ''}{confirmHqBranch.country}
                </div>
              </div>

              {hqBranch && (
                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.4rem', fontSize: '0.75rem', color: '#64748b' }}>
                  Previous HQ ({hqBranch.name}) will remain an active operational branch.
                </div>
              )}
            </div>

            <p style={{ fontSize: '0.75rem', color: '#64748b', lineHeight: 1.4, margin: '0 0 1.25rem' }}>
              * This will designate this branch as the company's official Headquarters. Note that this change does not alter the company's legal Registered Office address.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
              <button
                type="button"
                onClick={() => setConfirmHqBranch(null)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#fff',
                  color: '#475569',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSetHq}
                style={{
                  padding: '0.5rem 1.15rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#059669',
                  color: '#fff',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Confirm & Designate HQ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Headquarters Selector Modal */}
      <HeadquartersSelectorModal
        isOpen={isHqSelectorModalOpen}
        onClose={() => setIsHqSelectorModalOpen(false)}
      />

      {/* Add / Edit Branch Modal */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '560px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #e2e8f0',
            }}
          >
            <div
              style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                {editingBranch ? 'Edit Office Branch' : 'Add New Office Branch'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveBranch} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>
                  Branch Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bangalore Tech Center"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>
                    Branch Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BLR-01"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>
                    Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#fff' }}
                  >
                    <option value="Operational">Operational</option>
                    <option value="Planned">Planned</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bengaluru"
                    value={formCity}
                    onChange={(e) => setFormCity(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>
                    State / Region
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Karnataka"
                    value={formState}
                    onChange={(e) => setFormState(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>
                  Street Address
                </label>
                <input
                  type="text"
                  placeholder="e.g. Outer Ring Road, Bellandur"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>
                    Country
                  </label>
                  <input
                    type="text"
                    value={formCountry}
                    onChange={(e) => setFormCountry(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>
                    Postal Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 560103"
                    value={formPostalCode}
                    onChange={(e) => setFormPostalCode(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>
                    Seating Capacity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formCapacity}
                    onChange={(e) => setFormCapacity(parseInt(e.target.value) || 50)}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>
                    Timezone
                  </label>
                  <input
                    type="text"
                    value={formTimezone}
                    onChange={(e) => setFormTimezone(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              {/* Designate as HQ Checkbox */}
              <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.825rem', fontWeight: 600, color: '#0f172a' }}>
                  <input
                    type="checkbox"
                    checked={formIsHQ}
                    onChange={(e) => setFormIsHQ(e.target.checked)}
                    style={{ accentColor: 'var(--brand-blue, #2563EB)', width: '16px', height: '16px' }}
                  />
                  <span>Designate as Company Headquarters</span>
                </label>
                <p style={{ margin: '0.25rem 0 0 1.5rem', fontSize: '0.7rem', color: '#64748b' }}>
                  Setting this location as Headquarters will update the company's primary operating office and remove HQ designation from any previously designated location.
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#fff',
                    color: '#475569',
                    fontSize: '0.825rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '0.5rem 1.25rem',
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
                  {editingBranch ? 'Update Branch' : 'Add Branch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
