import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuthStore } from '../lib/store';
import {
  LayoutDashboard, BookOpen, Route, Video, HelpCircle,
  ClipboardCheck, PenTool, Eye, Award, BarChart3, Bell,
  Plug, Settings, Building2, Network, Users, UsersRound,
  Shield, Search, Trophy, GraduationCap, Calendar,
  UserCheck, User, Megaphone
} from 'lucide-react';

const iconMap: Record<string, any> = {
  LayoutDashboard,
  Building2,
  Network,
  Users,
  UsersRound,
  Shield,
  BookOpen,
  Route,
  Video,
  HelpCircle,
  ClipboardCheck,
  PenTool,
  Eye,
  Award,
  BarChart3,
  Bell,
  Plug,
  Settings,
  Search,
  Trophy,
  GraduationCap,
  Calendar,
  UserCheck,
  User,
  Megaphone
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<Props> = ({ isOpen, onClose }) => {
  const { navigation, user } = useAuthStore();

  // Group nav items by group property
  const groups: Record<string, typeof navigation> = {};
  navigation.forEach((item) => {
    const grp = item.group || 'Other';
    if (!groups[grp]) groups[grp] = [];
    groups[grp].push(item);
  });

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="modal-overlay"
          style={{ zIndex: 29 }}
          onClick={onClose}
        />
      )}

      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        {/* Brand header */}
        <div style={{
          height: 'var(--navbar-height, 64px)',
          padding: '0 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-sidebar)',
          flexShrink: 0
        }}>
          <Link
            to="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              textDecoration: 'none',
              color: 'inherit',
              maxWidth: '100%'
            }}
          >
            <div className="brand-logo-card">
              <img
                src="/logo.png"
                alt="VeniLearn Logo"
                className="brand-logo-img"
                style={{
                  height: '34px',
                  width: 'auto',
                  maxWidth: '165px',
                  objectFit: 'contain'
                }}
              />
            </div>
          </Link>
        </div>

        {/* Navigation list */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          {Object.entries(groups).map(([groupName, items]) => (
            <div key={groupName}>
              <div style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--text-muted)',
                padding: '4px 10px 6px',
              }}>
                {groupName}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {items.map((item) => {
                  const Icon = iconMap[item.icon] || BookOpen;

                  return (
                    <NavLink
                      key={item.id}
                      to={item.path}
                      onClick={onClose}
                      style={({ isActive }) => ({
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.85rem',
                        fontWeight: isActive ? 600 : 500,
                        color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                        background: isActive ? 'var(--primary-light)' : 'transparent',
                        transition: 'var(--transition)'
                      })}
                      onMouseEnter={(e) => {
                        const target = e.currentTarget;
                        if (!target.classList.contains('active')) {
                          target.style.background = 'var(--bg-card-hover)';
                          target.style.color = 'var(--text-main)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        const target = e.currentTarget;
                        if (!target.classList.contains('active')) {
                          target.style.background = 'transparent';
                          target.style.color = 'var(--text-secondary)';
                        }
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Icon size={17} style={{ flexShrink: 0 }} />
                        <span>{item.label}</span>
                      </div>

                      {item.badge !== undefined && item.badge > 0 && (
                        <span style={{
                          background: 'var(--primary)',
                          color: '#fff',
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: '10px'
                        }}>
                          {item.badge}
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* User Mini Bar at bottom of sidebar */}
        <div style={{
          padding: '14px 16px',
          borderTop: '1px solid var(--border-subtle)',
          background: 'var(--bg-surface)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          flexShrink: 0
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: '0.8rem'
          }}>
            {user?.firstName?.[0] || 'U'}
          </div>
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: '0.8rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
              {user?.displayName || 'User'}
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
              {user?.activeRole === 'trainer' || user?.activeRole === 'instructor' || user?.activeRole === 'assessment_author' || user?.activeRole === 'grader'
                ? 'Trainer'
                : user?.activeRole === 'student' || user?.activeRole === 'learner'
                ? 'Student'
                : 'Platform Admin'}
            </div>
          </div>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: 'var(--success)'
          }} title="Status: Online" />
        </div>
      </aside>
    </>
  );
};
