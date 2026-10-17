import React from 'react';
import { useAuthStore } from '../lib/store';
import { RoleName } from '../types';
import { Shield, Check, X, User, Briefcase, GraduationCap, Award, BookOpen, PenTool, Eye } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const rolesList: { role: RoleName; title: string; desc: string; icon: any; color: string }[] = [
  {
    role: 'platform_admin',
    title: 'Platform Administrator',
    desc: 'Multi-tenant settings, global orgs, integrations, full security matrix',
    icon: Shield,
    color: '#ef4444'
  },
  {
    role: 'org_admin',
    title: 'Admin (School / College / Org)',
    desc: 'Manage institution learners, faculty, academic structure, courses, attendance & reports',
    icon: Briefcase,
    color: '#f59e0b'
  },
  {
    role: 'lms_admin',
    title: 'LMS Administrator',
    desc: 'Course management, learning paths, reports, question banks, certificates',
    icon: BookOpen,
    color: '#8b5cf6'
  },
  {
    role: 'instructor',
    title: 'Faculty / Instructor',
    desc: 'Manage assigned classes, courses, student progress, live lectures & grading',
    icon: GraduationCap,
    color: '#06b6d4'
  },
  {
    role: 'assessment_author',
    title: 'Assessment Author',
    desc: 'Question banks, quiz creation, rubrics, exam configurations',
    icon: PenTool,
    color: '#ec4899'
  },
  {
    role: 'grader',
    title: 'Grader / Evaluator',
    desc: 'Human grading queue, rubric evaluations, double marking, AI score review',
    icon: Award,
    color: '#10b981'
  },
  {
    role: 'learner',
    title: 'Student / Learner',
    desc: 'Course consumption, live sessions, timed exam delivery, certificates & badges',
    icon: User,
    color: '#6366f1'
  }
];

export const RoleSwitcherModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { user, switchRole } = useAuthStore();

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
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
              <Shield size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Role Simulation Switcher</h3>
              <p className="text-muted text-xs">Switch persona to test role-specific RBAC, navigation and dashboards</p>
            </div>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '16px 24px' }}>
          {rolesList.map((item) => {
            const Icon = item.icon;
            const isSelected = user?.activeRole === item.role;

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
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: isSelected ? 'var(--primary-light)' : 'var(--bg-card)',
                  border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  transition: 'var(--transition)'
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.borderColor = 'var(--border-light)';
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.borderColor = 'var(--border-subtle)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '8px',
                    background: `${item.color}20`,
                    color: item.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Icon size={20} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: isSelected ? 'var(--primary)' : 'var(--text-main)' }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {item.desc}
                    </div>
                  </div>
                </div>

                {isSelected ? (
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: 'var(--primary)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Check size={14} />
                  </div>
                ) : (
                  <span className="btn btn-secondary btn-sm" style={{ fontSize: '0.75rem' }}>Switch</span>
                )}
              </div>
            );
          })}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};
