import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../lib/store';
import { RoleName } from '../types';
import { Shield, Check, X, User, GraduationCap, Building2, ChevronRight } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const rolesList: {
  role: RoleName;
  title: string;
  description: string;
  icon: any;
  color: string;
  bgGradient: string;
}[] = [
  {
    role: 'platform_admin',
    title: 'Platform Admin',
    description: 'Global infrastructure, multi-tenancy & governance',
    icon: Shield,
    color: '#EF4444',
    bgGradient: 'rgba(239, 68, 68, 0.12)',
  },
  {
    role: 'org_admin',
    title: 'Institution Admin',
    description: 'Academic operations, departments, faculty & exams',
    icon: Building2,
    color: '#2563EB',
    bgGradient: 'rgba(37, 99, 235, 0.12)',
  },
  {
    role: 'trainer',
    title: 'Trainer / Faculty',
    description: 'Course authoring, student evaluations & live classes',
    icon: GraduationCap,
    color: '#0D9488',
    bgGradient: 'rgba(13, 148, 136, 0.12)',
  },
  {
    role: 'student',
    title: 'Student / Learner',
    description: 'Enrolled courses, interactive quizzes & achievements',
    icon: User,
    color: '#8B5CF6',
    bgGradient: 'rgba(139, 92, 246, 0.12)',
  },
];

export const RoleSwitcherModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { user, switchRole } = useAuthStore();
  const navigate = useNavigate();

  if (!isOpen) return null;

  // Normalize user active role for comparison
  const currentRole =
    user?.activeRole === 'trainer' ||
    user?.activeRole === 'instructor' ||
    user?.activeRole === 'assessment_author' ||
    user?.activeRole === 'grader'
      ? 'trainer'
      : user?.activeRole === 'student' || user?.activeRole === 'learner'
      ? 'student'
      : user?.activeRole === 'org_admin' || user?.activeRole === 'lms_admin'
      ? 'org_admin'
      : 'platform_admin';

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.15s ease-out',
      }}
    >
      <div
        className="modal-card"
        style={{
          maxWidth: '460px',
          width: '100%',
          background: 'var(--bg-card)',
          borderRadius: '20px',
          border: '1px solid var(--border-subtle)',
          boxShadow: '0 20px 48px -10px rgba(0, 0, 0, 0.35)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sleek Header */}
        <div
          style={{
            padding: '20px 24px 16px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-card)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, rgba(37,99,235,0.12) 0%, rgba(236,72,153,0.12) 100%)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                flexShrink: 0,
              }}
            >
              <Shield size={19} />
            </div>
            <div>
              <h3
                style={{
                  fontSize: '1.1rem',
                  fontWeight: 800,
                  margin: 0,
                  color: 'var(--text-main)',
                  letterSpacing: '-0.02em',
                }}
              >
                Switch Portal Role
              </h3>
              <p
                style={{
                  margin: '2px 0 0',
                  fontSize: '0.78rem',
                  color: 'var(--text-secondary)',
                }}
              >
                Select perspective to test access permissions
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            title="Close"
            style={{
              background: 'var(--bg-card-subtle)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              padding: '6px',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--text-main)';
              e.currentTarget.style.background = 'var(--bg-surface)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-muted)';
              e.currentTarget.style.background = 'var(--bg-card-subtle)';
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Roles List */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            padding: '16px 20px',
            background: 'var(--bg-card)',
          }}
        >
          {rolesList.map((item) => {
            const Icon = item.icon;
            const isSelected = currentRole === item.role;

            return (
              <div
                key={item.role}
                onClick={async () => {
                  if (isSelected) {
                    onClose();
                    return;
                  }
                  await switchRole(item.role);
                  onClose();
                  const isStudent = item.role === 'student' || item.role === 'learner' || item.role === 'guest';
                  if (isStudent) {
                    sessionStorage.setItem('show_student_leaderboard_popup', 'true');
                    window.dispatchEvent(new CustomEvent('open-student-leaderboard-popup'));
                  }
                  navigate('/dashboard', { replace: true });
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  borderRadius: '14px',
                  background: isSelected
                    ? 'rgba(37, 99, 235, 0.08)'
                    : 'var(--bg-card)',
                  border: isSelected
                    ? '1.5px solid var(--primary)'
                    : '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: isSelected
                    ? '0 2px 10px rgba(37, 99, 235, 0.12)'
                    : 'none',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.35)';
                    e.currentTarget.style.background = 'var(--bg-card-subtle)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = 'var(--border-subtle)';
                    e.currentTarget.style.background = 'var(--bg-card)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }
                }}
              >
                {/* Left: Icon & Text */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      background: item.bgGradient,
                      color: item.color,
                      border: `1px solid ${item.color}30`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={19} />
                  </div>

                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        color: 'var(--text-main)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      {item.title}
                    </div>
                    <div
                      style={{
                        fontSize: '0.74rem',
                        color: 'var(--text-secondary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        marginTop: '1px',
                      }}
                    >
                      {item.description}
                    </div>
                  </div>
                </div>

                {/* Right: Active Badge or Switch Trigger */}
                <div style={{ flexShrink: 0, marginLeft: '12px' }}>
                  {isSelected ? (
                    <span
                      className="badge badge-primary"
                      style={{
                        padding: '4px 10px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                        color: '#FFFFFF',
                        border: 'none',
                        boxShadow: '0 2px 6px rgba(37, 99, 235, 0.35)',
                      }}
                    >
                      <Check size={12} strokeWidth={2.8} /> Active
                    </span>
                  ) : (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: 'var(--text-muted)',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        transition: 'color 0.15s ease',
                      }}
                    >
                      Switch <ChevronRight size={13} />
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Note */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--border-subtle)',
            background: 'var(--bg-card-subtle)',
            fontSize: '0.72rem',
            color: 'var(--text-muted)',
            textAlign: 'center',
          }}
        >
          Session perspective updates immediately across navigation, exams, and dashboards.
        </div>
      </div>
    </div>
  );
};

export default RoleSwitcherModal;
