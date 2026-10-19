import React from 'react';
import { useAuthStore } from '../lib/store';
import { RoleName } from '../types';
import { Shield, Check, X, User, GraduationCap } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const rolesList: {
  role: RoleName;
  title: string;
  icon: any;
  color: string;
}[] = [
  {
    role: 'platform_admin',
    title: 'Platform Admin',
    icon: Shield,
    color: '#ef4444'
  },
  {
    role: 'trainer',
    title: 'Trainer',
    icon: GraduationCap,
    color: '#06b6d4'
  },
  {
    role: 'student',
    title: 'Student',
    icon: User,
    color: '#8b5cf6'
  }
];

export const RoleSwitcherModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { user, switchRole } = useAuthStore();

  if (!isOpen) return null;

  // Normalize user active role for comparison
  const currentRole = user?.activeRole === 'trainer' || user?.activeRole === 'instructor' || user?.activeRole === 'assessment_author' || user?.activeRole === 'grader'
    ? 'trainer'
    : user?.activeRole === 'student' || user?.activeRole === 'learner'
    ? 'student'
    : 'platform_admin';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        style={{ maxWidth: '420px', borderRadius: 'var(--radius-xl)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>Select Role</h3>
          <button
            onClick={onClose}
            style={{
              color: 'var(--text-muted)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '4px'
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '16px 20px' }}>
          {rolesList.map((item) => {
            const Icon = item.icon;
            const isSelected = currentRole === item.role;

            return (
              <div
                key={item.role}
                onClick={() => {
                  switchRole(item.role);
                  onClose();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-lg)',
                  background: isSelected ? 'var(--primary-light)' : 'var(--bg-card)',
                  border: isSelected ? `2px solid ${item.color}` : '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = item.color;
                    e.currentTarget.style.background = 'var(--bg-surface)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = 'var(--border-subtle)';
                    e.currentTarget.style.background = 'var(--bg-card)';
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: `${item.color}20`,
                    color: item.color,
                    border: `1px solid ${item.color}40`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Icon size={20} />
                  </div>
                  <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                    {item.title}
                  </span>
                </div>

                {isSelected ? (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: item.color,
                    color: '#fff',
                    padding: '4px 10px',
                    borderRadius: '14px',
                    fontSize: '0.75rem',
                    fontWeight: 700
                  }}>
                    <Check size={13} /> Active
                  </div>
                ) : (
                  <span
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.75rem', padding: '4px 12px' }}
                  >
                    Select
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
