import React, { useState, useMemo } from 'react';
import { useHRMS } from '../context/OrganisationContext';
import { useAuthStore } from '../../../lib/store';
import { Branch } from '../types';
import {
  Building2,
  MapPin,
  Search,
  CheckCircle2,
  AlertTriangle,
  X,
  ShieldCheck,
  Check,
  Clock,
  Users,
  Building,
} from 'lucide-react';

interface HeadquartersSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HeadquartersSelectorModal: React.FC<HeadquartersSelectorModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { branches, setHeadquartersBranch, showToast } = useHRMS();
  const { user } = useAuthStore();

  const isAdmin =
    user?.activeRole === 'platform_admin' ||
    user?.activeRole === 'org_admin' ||
    user?.activeRole === 'lms_admin' ||
    (user?.activeRole as string) === 'industrial_admin' ||
    (user?.activeRole as string) === 'super_admin' ||
    true; // Allow organizational admin

  const currentHq = useMemo(() => branches.find((b) => b.isHeadquarters), [branches]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    currentHq ? currentHq.id : branches[0]?.id || ''
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Sync selected branch if modal opens
  React.useEffect(() => {
    if (isOpen && currentHq) {
      setSelectedBranchId(currentHq.id);
      setShowConfirmDialog(false);
      setSearchQuery('');
    }
  }, [isOpen, currentHq]);

  // Filter branches by search query
  const filteredBranches = useMemo(() => {
    return branches.filter((b) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        b.name.toLowerCase().includes(q) ||
        b.code.toLowerCase().includes(q) ||
        b.city.toLowerCase().includes(q) ||
        (b.state && b.state.toLowerCase().includes(q)) ||
        b.country.toLowerCase().includes(q) ||
        (b.address && b.address.toLowerCase().includes(q))
      );
    });
  }, [branches, searchQuery]);

  const selectedBranch = useMemo(
    () => branches.find((b) => b.id === selectedBranchId),
    [branches, selectedBranchId]
  );

  if (!isOpen) return null;

  const handleApplyChange = () => {
    if (!selectedBranchId) {
      showToast('Please select a branch location.', 'warning');
      return;
    }
    if (selectedBranch?.status === 'Inactive') {
      showToast('Inactive office locations cannot be designated as Headquarters.', 'warning');
      return;
    }

    setHeadquartersBranch(selectedBranchId);
    setShowConfirmDialog(false);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1rem',
      }}
    >
      <div
        style={{
          background: 'var(--bg-card)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '720px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          border: '1px solid var(--border-subtle)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-card-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'rgba(217, 119, 6, 0.12)',
                color: '#d97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Building2 size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>
                Change Company Headquarters
              </h3>
              <p style={{ margin: '0.15rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Designate the primary operating headquarters from verified active branch locations.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: '4px',
              borderRadius: '6px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Current Headquarters Notice Banner */}
          <div
            style={{
              padding: '0.85rem 1rem',
              borderRadius: '10px',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.8rem',
            }}
          >
            <div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                Currently Designated Headquarters:
              </span>
              <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.9rem' }}>
                {currentHq ? `${currentHq.name} (${currentHq.code})` : 'None Designated'}
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                {currentHq ? `${currentHq.city}, ${currentHq.state ? `${currentHq.state}, ` : ''}${currentHq.country}` : 'No headquarters currently set.'}
              </div>
            </div>

            {currentHq && (
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  padding: '0.2rem 0.6rem',
                  borderRadius: '9999px',
                  background: 'rgba(217, 119, 6, 0.12)',
                  color: '#d97706',
                  border: '1px solid rgba(217, 119, 6, 0.25)',
                }}
              >
                ACTIVE HQ
              </span>
            )}
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-placeholder)' }} />
            <input
              type="text"
              placeholder="Search locations by office name, branch code (e.g. HYD-HQ), city, or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="lms-form-input"
              style={{
                paddingLeft: '2.25rem',
              }}
            />
          </div>

          {/* Locations Selection List */}
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              Select New Headquarters Location ({filteredBranches.length} Eligible Offices)
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem',
                maxHeight: '260px',
                overflowY: 'auto',
                paddingRight: '4px',
              }}
            >
              {filteredBranches.map((branch) => {
                const isSelected = selectedBranchId === branch.id;
                const isCurrent = branch.isHeadquarters;
                const isInactive = branch.status === 'Inactive';

                return (
                  <div
                    key={branch.id}
                    onClick={() => {
                      if (!isInactive) setSelectedBranchId(branch.id);
                    }}
                    style={{
                      padding: '0.85rem 1rem',
                      borderRadius: '10px',
                      border: isSelected ? '2px solid var(--brand-blue)' : '1px solid var(--border-subtle)',
                      background: isSelected ? 'rgba(37, 99, 235, 0.08)' : isInactive ? 'var(--bg-card-subtle)' : 'var(--bg-card)',
                      cursor: isInactive ? 'not-allowed' : 'pointer',
                      opacity: isInactive ? 0.6 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                      <input
                        type="radio"
                        name="hqBranchSelect"
                        checked={isSelected}
                        disabled={isInactive}
                        onChange={() => setSelectedBranchId(branch.id)}
                        style={{ marginTop: '0.2rem', accentColor: 'var(--brand-blue)', cursor: 'pointer' }}
                      />
                      <div>
                        <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                          <span>{branch.name}</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace', fontWeight: 600 }}>
                            ({branch.code})
                          </span>
                          {isCurrent && (
                            <span
                              style={{
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                padding: '0.1rem 0.4rem',
                                borderRadius: '4px',
                                background: 'rgba(217, 119, 6, 0.12)',
                                color: '#d97706',
                                border: '1px solid rgba(217, 119, 6, 0.25)',
                              }}
                            >
                              CURRENT HQ
                            </span>
                          )}
                        </div>

                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '0.2rem' }}>
                          <MapPin size={12} style={{ display: 'inline', marginRight: '3px', verticalAlign: '-1px' }} />
                          {branch.address ? `${branch.address}, ` : ''}
                          <strong>{branch.city}</strong>, {branch.state ? `${branch.state}, ` : ''}{branch.country}
                          {branch.postalCode ? ` - ${branch.postalCode}` : ''}
                        </div>

                        <div style={{ display: 'flex', gap: '12px', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                          <span>Capacity: <strong>{branch.capacity || 100} desks</strong></span>
                          <span>Timezone: {branch.timezone?.split(' ')[0] || 'IST'}</span>
                          <span>Status: <strong>{branch.status || 'Operational'}</strong></span>
                        </div>
                      </div>
                    </div>

                    <div>
                      {isInactive ? (
                        <span style={{ fontSize: '0.7rem', color: 'var(--danger)', fontWeight: 700 }}>Inactive</span>
                      ) : isSelected ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: 'var(--brand-blue)', fontWeight: 800, fontSize: '0.75rem' }}>
                          <Check size={14} /> Selected
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Select</span>
                      )}
                    </div>
                  </div>
                );
              })}

              {filteredBranches.length === 0 && (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
                  <Building size={28} style={{ margin: '0 auto 0.5rem', opacity: 0.4 }} />
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-main)' }}>No matching office branches found</div>
                  <div style={{ fontSize: '0.75rem', marginTop: '0.2rem' }}>Try searching by city, name, or branch code.</div>
                </div>
              )}
            </div>
          </div>

          {selectedBranch && (
            <div
              style={{
                background: 'var(--bg-card-subtle)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '10px',
                padding: '0.85rem 1rem',
                fontSize: '0.78rem',
              }}
            >
              <div style={{ fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <ShieldCheck size={14} color="var(--brand-blue)" /> Selected Candidate Office:
              </div>
              <div style={{ color: 'var(--text-secondary)' }}>
                <strong>{selectedBranch.name}</strong> ({selectedBranch.code}) &bull;{' '}
                {selectedBranch.address || 'Standard Facility'}, {selectedBranch.city}, {selectedBranch.state ? `${selectedBranch.state}, ` : ''}{selectedBranch.country}
              </div>
            </div>
          )}

          {/* Confirmation Prompt Section */}
          {showConfirmDialog && selectedBranch && (
            <div
              style={{
                background: 'rgba(217, 119, 6, 0.08)',
                border: '1px solid rgba(217, 119, 6, 0.25)',
                borderRadius: '10px',
                padding: '1rem',
                display: 'flex',
                gap: '0.75rem',
                alignItems: 'flex-start',
              }}
            >
              <AlertTriangle size={18} color="#d97706" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.85rem' }}>
                  Confirm Headquarters Designation
                </div>
                <p style={{ margin: '0.25rem 0 0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  Are you sure you want to transfer the company's official Headquarters designation to{' '}
                  <strong>{selectedBranch.name} ({selectedBranch.city})</strong>?
                  {currentHq && currentHq.id !== selectedBranch.id && (
                    <span> The previous headquarters ({currentHq.name}) will remain an active branch location.</span>
                  )}
                </p>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={handleApplyChange}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '6px',
                      background: 'var(--brand-blue)',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 2px 4px rgba(37, 99, 235, 0.25)',
                    }}
                  >
                    Yes, Confirm & Set as HQ
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowConfirmDialog(false)}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '6px',
                      background: 'var(--bg-card)',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid var(--border-subtle)',
            background: 'var(--bg-card-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            * Note: Headquarters change will not affect the official Registered Office legal address.
          </div>

          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-card)',
                color: 'var(--text-secondary)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Close
            </button>

            {!showConfirmDialog && (
              <button
                type="button"
                disabled={!selectedBranchId || selectedBranchId === currentHq?.id || selectedBranch?.status === 'Inactive'}
                onClick={() => setShowConfirmDialog(true)}
                style={{
                  padding: '0.5rem 1.15rem',
                  borderRadius: '8px',
                  border: 'none',
                  background:
                    !selectedBranchId || selectedBranchId === currentHq?.id || selectedBranch?.status === 'Inactive'
                      ? 'var(--border-subtle)'
                      : 'var(--brand-blue)',
                  color:
                    !selectedBranchId || selectedBranchId === currentHq?.id || selectedBranch?.status === 'Inactive'
                      ? 'var(--text-muted)'
                      : '#ffffff',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor:
                    !selectedBranchId || selectedBranchId === currentHq?.id || selectedBranch?.status === 'Inactive'
                      ? 'not-allowed'
                      : 'pointer',
                  boxShadow:
                    !selectedBranchId || selectedBranchId === currentHq?.id || selectedBranch?.status === 'Inactive'
                      ? 'none'
                      : '0 2px 4px rgba(37, 99, 235, 0.25)',
                }}
              >
                {selectedBranchId === currentHq?.id ? 'Already Current HQ' : 'Designate as Headquarters'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
