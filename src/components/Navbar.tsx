import React, { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../lib/store';
import { useThemeStore } from '../lib/themeStore';
import { ThemeToggleSwitch } from './ThemeToggleSwitch';

import {
  Search, Bell, Shield, ChevronDown, User, LogOut,
  Settings, Menu, Building, HelpCircle
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useOrganisationBranding } from '../lib/useOrganisationBranding';
import { AnimatedAvatar } from './AnimatedAvatar';

interface Props {
  onToggleSidebar: () => void;
  onOpenRoleSwitcher: () => void;
  onOpenNotifications: () => void;
  isNotificationsOpen?: boolean;
  onOpenSearch: () => void;
}

export const Navbar: React.FC<Props> = ({
  onToggleSidebar,
  onOpenRoleSwitcher,
  onOpenNotifications,
  isNotificationsOpen = false,
  onOpenSearch
}) => {
  const { user, logout, unreadNotifications } = useAuthStore();
  const { preference, resolvedTheme, setTheme } = useThemeStore();
  const [selectedOrgId, setSelectedOrgId] = useState(() => sessionStorage.getItem('venilearn_active_org_id') || user?.organizationId || (typeof window !== 'undefined' ? localStorage.getItem('venilearn_active_tenant_id') : null) || 'org-001');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const navigate = useNavigate();

  const isPlatformAdmin = user?.activeRole === 'platform_admin';
  const { companyName, companyLogo } = useOrganisationBranding();
  const [navbarLogoSrc, setNavbarLogoSrc] = useState(companyLogo || '/logo.png');

  useEffect(() => {
    setNavbarLogoSrc(companyLogo || '/logo.png');
  }, [companyLogo]);

  const handleLogout = () => {
    sessionStorage.setItem('venilearn_logged_out', 'true');
    logout();
    navigate('/login');
  };

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

        {/* Unified Organization Brand Header */}
        <Link
          to="/"
          className="topbar-brand"
          style={{
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
          title={companyName}
        >
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '7px',
              background: '#ffffff',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              padding: '2px',
              flexShrink: 0,
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <img
              src={isPlatformAdmin ? '/logo.png' : navbarLogoSrc}
              alt={isPlatformAdmin ? 'VeniLearn Platform' : companyName}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                display: 'block',
              }}
              onError={() => setNavbarLogoSrc('/logo.png')}
            />
          </div>
          <span
            style={{
              fontWeight: 800,
              fontSize: '0.9rem',
              color: 'var(--text-main)',
              letterSpacing: '-0.01em',
              maxWidth: '220px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {isPlatformAdmin ? 'VeniLearn' : companyName}
          </span>
        </Link>

        {/* Tenant/Org Switcher (Authorized Platform Admins Only) */}
        {isPlatformAdmin && (
          <div className="nav-org-select-container" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building size={16} color="var(--primary)" />
            <select
              value={selectedOrgId}
              onChange={(e) => {
                const nextOrg = e.target.value;
                setSelectedOrgId(nextOrg);
                sessionStorage.setItem('venilearn_active_org_id', nextOrg);
                window.dispatchEvent(new CustomEvent('venilearn_org_switched', { detail: { orgId: nextOrg } }));
              }}
              className="form-select nav-org-select"
              style={{
                padding: '4px 8px',
                fontSize: '0.8rem',
                width: 'auto',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)'
              }}
            >
              {([].length > 0 ? [] : (user?.organizationId ? [{ id: user.organizationId, name: "Active Organization", slug: "active" }] : [])).map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name} ({org.slug})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Middle & Right Navigation actions */}
      <div className="topbar-actions">
        {/* Search trigger */}
        <button
          onClick={onOpenSearch}
          className="nav-search-btn"
          title="Search"
          aria-label="Search"
        >
          <Search size={15} style={{ color: '#94A3B8', strokeWidth: 2, flexShrink: 0 }} />
          <span className="nav-search-text">Search...</span>
        </button>

        {/* Neumorphic Light / Dark Mode Toggle Switch */}
        <ThemeToggleSwitch size="md" />

        {/* Liquid Glass Notification Bell */}
        <button
          className="liquid-glass-bell-btn"
          onClick={onOpenNotifications}
          style={{
            position: 'relative',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
            padding: 0,
            borderRadius: '12px',
            background: isNotificationsOpen
              ? 'linear-gradient(135deg, rgba(84, 71, 255, 0.28) 0%, rgba(244, 114, 182, 0.2) 100%)'
              : 'rgba(129, 140, 248, 0.08)',
            border: isNotificationsOpen
              ? '1px solid rgba(129, 140, 248, 0.55)'
              : '1px solid var(--border-subtle)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            boxShadow: isNotificationsOpen
              ? '0 0 16px rgba(84, 71, 255, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.25)'
              : 'var(--shadow-sm)',
            color: isNotificationsOpen ? 'var(--brand-indigo-soft, #818CF8)' : 'var(--text-main)',
            cursor: 'pointer',
          }}
          title={unreadNotifications > 0 ? `${unreadNotifications} unread notifications` : 'Notifications'}
          aria-label={unreadNotifications > 0 ? `${unreadNotifications} unread notifications` : 'Notifications'}
          aria-expanded={isNotificationsOpen}
          aria-haspopup="dialog"
        >
          <Bell size={17} />
          {unreadNotifications > 0 && (
            <span
              style={{
                position: 'absolute',
                top: '-3px',
                right: '-3px',
                minWidth: '17px',
                height: '17px',
                padding: '0 4px',
                borderRadius: '999px',
                background: 'linear-gradient(135deg, #EC4899 0%, #F232A9 100%)',
                color: '#ffffff',
                fontSize: '0.625rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                boxShadow: '0 2px 8px rgba(242, 50, 169, 0.5), 0 0 0 1.5px var(--bg-surface)',
                lineHeight: 1,
              }}
            >
              {unreadNotifications > 99 ? '99+' : unreadNotifications}
            </span>
          )}
        </button>

        {/* User profile dropdown or Log In button */}
        {!user ? (
          <Link
            to={`/login?redirect=${encodeURIComponent(window.location.pathname)}`}
            className="btn btn-primary btn-sm"
            style={{ fontWeight: 600, padding: '6px 14px' }}
          >
            Log In
          </Link>
        ) : (
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
              <AnimatedAvatar
                size={34}
                isCurrentUser={true}
                name={user.displayName}
                interactive={true}
              />
              <div className="nav-user-details" style={{ textAlign: 'left', display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-main)', lineHeight: 1.2 }}>
                  {user.displayName || 'Demo User'}
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  {user.email || 'user@lms.demo'}
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
                <button
                  type="button"
                  onClick={() => onOpenRoleSwitcher()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    padding: '8px 12px',
                    fontSize: '0.825rem',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--primary)',
                    fontWeight: 600,
                    width: '100%',
                    textAlign: 'left',
                    background: 'transparent',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Shield size={15} />
                    <span>Switch Role</span>
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                    {user?.activeRole === 'trainer' || user?.activeRole === 'instructor' || user?.activeRole === 'assessment_author' || user?.activeRole === 'grader'
                      ? 'Trainer'
                      : user?.activeRole === 'student' || user?.activeRole === 'learner'
                      ? 'Student'
                      : user?.activeRole === 'platform_admin'
                      ? 'Platform Admin'
                      : 'Admin'}
                  </span>
                </button>

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
      )}
      </div>
    </header>
  );
};
