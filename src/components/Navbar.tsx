import React, { useState } from 'react';
import { useAuthStore } from '../lib/store';
import { mockOrganizations } from '../data/mockData';
import {
  Search, Bell, Sun, Moon, Shield, ChevronDown, User, LogOut,
  Settings, Menu, Building, HelpCircle
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

interface Props {
  onToggleSidebar: () => void;
  onOpenRoleSwitcher: () => void;
  onOpenNotifications: () => void;
  onOpenSearch: () => void;
}

export const Navbar: React.FC<Props> = ({
  onToggleSidebar,
  onOpenRoleSwitcher,
  onOpenNotifications,
  onOpenSearch
}) => {
  const { user, logout, unreadNotifications } = useAuthStore();
  const [selectedOrgId, setSelectedOrgId] = useState('org-001');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isLightMode, setIsLightMode] = useState(false);
  const navigate = useNavigate();

  const toggleTheme = () => {
    const nextTheme = !isLightMode;
    setIsLightMode(nextTheme);
    if (nextTheme) {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isPlatformAdmin = user?.activeRole === 'platform_admin';

  return (
    <header className="topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <button
          className="btn btn-secondary btn-sm"
          onClick={onToggleSidebar}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px' }}
          title="Toggle sidebar navigation (Ctrl+B)"
          aria-label="Toggle sidebar navigation"
        >
          <Menu size={18} />
        </button>

        {/* Mobile Brand Logo */}
        <Link
          to="/"
          className="mobile-header-logo"
          style={{
            textDecoration: 'none'
          }}
        >
          <div className="brand-logo-card" style={{ padding: '4px 10px' }}>
            <img
              src="/logo.png"
              alt="VeniLearn Logo"
              className="brand-logo-img"
              style={{
                height: '26px',
                width: 'auto',
                maxWidth: '120px',
                objectFit: 'contain'
              }}
            />
          </div>
        </Link>

        {/* Tenant/Org Switcher (Authorized admins) */}
        {isPlatformAdmin ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building size={16} color="var(--primary)" />
            <select
              value={selectedOrgId}
              onChange={(e) => setSelectedOrgId(e.target.value)}
              className="form-select"
              style={{
                padding: '4px 8px',
                fontSize: '0.8rem',
                width: 'auto',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)'
              }}
            >
              {mockOrganizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name} ({org.slug})
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <Building size={14} color="var(--primary)" />
            <span style={{ fontWeight: 600 }}>Acme Learning Corp</span>
          </div>
        )}
      </div>

      {/* Middle & Right Navigation actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Search trigger */}
        <button
          onClick={onOpenSearch}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--bg-input)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '6px 14px',
            color: 'var(--text-muted)',
            fontSize: '0.825rem',
            cursor: 'pointer'
          }}
        >
          <Search size={14} />
          <span>Search everything...</span>
          <kbd style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '4px',
            padding: '1px 5px',
            fontSize: '0.65rem'
          }}>
            ⌘K
          </kbd>
        </button>

        {/* Quick Role Switcher pill */}
        <button
          onClick={onOpenRoleSwitcher}
          className="btn btn-secondary btn-sm"
          style={{
            background: 'var(--primary-light)',
            borderColor: 'var(--primary)',
            color: 'var(--primary)',
            gap: '6px',
            fontWeight: 700,
            fontSize: '0.75rem'
          }}
          title="Switch role perspective for testing"
        >
          <Shield size={14} />
          <span style={{ textTransform: 'capitalize' }}>
            Role: {
              user?.activeRole === 'trainer' || user?.activeRole === 'instructor' || user?.activeRole === 'assessment_author' || user?.activeRole === 'grader'
                ? 'Trainer'
                : user?.activeRole === 'student' || user?.activeRole === 'learner'
                ? 'Student'
                : 'Platform Admin'
            }
          </span>
          <ChevronDown size={12} />
        </button>

        {/* Theme toggle */}
        <button
          className="btn btn-secondary btn-sm"
          onClick={toggleTheme}
          style={{ padding: '7px' }}
          title={isLightMode ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
        >
          {isLightMode ? <Moon size={16} /> : <Sun size={16} />}
        </button>

        {/* Notifications Center button */}
        <button
          className="btn btn-secondary btn-sm"
          onClick={onOpenNotifications}
          style={{ position: 'relative', padding: '7px' }}
          title="Notifications"
        >
          <Bell size={16} />
          {unreadNotifications > 0 && (
            <span
              style={{
                position: 'absolute',
                top: '-2px',
                right: '-2px',
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                background: 'var(--primary)',
                color: '#fff',
                fontSize: '0.65rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700
              }}
            >
              {unreadNotifications}
            </span>
          )}
        </button>

        {/* User profile dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '4px 8px',
              borderRadius: 'var(--radius-md)',
              background: 'transparent'
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--primary), var(--accent-purple))',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.85rem'
              }}
            >
              {user ? `${user.firstName[0]}${user.lastName[0]}` : 'U'}
            </div>
            <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-main)', lineHeight: 1.2 }}>
                {user?.displayName || 'Demo User'}
              </span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                {user?.email || 'user@lms.demo'}
              </span>
            </div>
            <ChevronDown size={14} color="var(--text-muted)" />
          </button>

          {showProfileMenu && (
            <>
              <div
                style={{ position: 'fixed', inset: 0, zIndex: 45 }}
                onClick={() => setShowProfileMenu(false)}
              />
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '8px',
                  width: '220px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: 'var(--shadow-lg)',
                  padding: '6px',
                  zIndex: 50,
                  animation: 'scaleUp 0.15s ease'
                }}
                onClick={() => setShowProfileMenu(false)}
              >
              <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-subtle)' }}>
                <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{user?.displayName}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user?.email}</div>
                <span className="badge badge-primary" style={{ marginTop: '4px', fontSize: '0.65rem' }}>
                  {user?.activeRole}
                </span>
              </div>

              <div style={{ padding: '4px 0' }}>
                <Link
                  to="/profile"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 12px',
                    fontSize: '0.825rem',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-main)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <User size={15} />
                  <span>Profile & Security</span>
                </Link>

                <Link
                  to="/settings"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 12px',
                    fontSize: '0.825rem',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-main)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <Settings size={15} />
                  <span>Preferences</span>
                </Link>

                <a
                  href="#help"
                  onClick={(e) => { e.preventDefault(); alert("Acuity LMS: Use the Role Switcher at the top to test Platform Admin, Trainer, and Student perspectives."); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 12px',
                    fontSize: '0.825rem',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-main)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <HelpCircle size={15} />
                  <span>Help & Walkthrough</span>
                </a>
              </div>

              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '4px' }}>
                <button
                  onClick={handleLogout}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 12px',
                    fontSize: '0.825rem',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--danger)',
                    width: '100%',
                    textAlign: 'left'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--danger-bg)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <LogOut size={15} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </>
        )}
        </div>
      </div>
    </header>
  );
};
