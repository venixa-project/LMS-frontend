import React, { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../lib/store';
import { useThemeStore, ThemePreference } from '../lib/themeStore';

import {
  Search, Bell, Sun, Moon, Monitor, Check, Shield, ChevronDown, User, LogOut,
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
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const themeMenuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const isPlatformAdmin = user?.activeRole === 'platform_admin';
  const { companyName, companyLogo } = useOrganisationBranding();
  const [navbarLogoSrc, setNavbarLogoSrc] = useState(companyLogo || '/logo.png');

  useEffect(() => {
    setNavbarLogoSrc(companyLogo || '/logo.png');
  }, [companyLogo]);

  // Close theme menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (themeMenuRef.current && !themeMenuRef.current.contains(event.target as Node)) {
        setShowThemeMenu(false);
      }
    };
    if (showThemeMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showThemeMenu]);

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

        {/* Mobile Brand Logo */}
        <Link
          to="/"
          className="mobile-header-logo"
          style={{
            textDecoration: 'none'
          }}
        >
          <div className="brand-logo-card" style={{ padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img
              src={isPlatformAdmin ? '/logo.png' : navbarLogoSrc}
              alt={isPlatformAdmin ? 'VeniLearn Platform' : companyName}
              className="brand-logo-img"
              style={{
                height: '26px',
                width: 'auto',
                maxWidth: '90px',
                objectFit: 'contain'
              }}
              onError={() => setNavbarLogoSrc('/logo.png')}
            />
            {!isPlatformAdmin && (
              <span
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: 'var(--text-main)',
                  maxWidth: '120px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={companyName}
              >
                {companyName}
              </span>
            )}
          </div>
        </Link>

        {/* Tenant/Org Switcher (Authorized admins) */}
        {isPlatformAdmin ? (
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
        ) : (
          <div
            className="nav-org-select-container"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.85rem',
              color: 'var(--text-secondary)',
              maxWidth: '320px',
            }}
          >
            <div
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '6px',
                background: '#ffffff',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                padding: '2px',
                flexShrink: 0,
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
              }}
              title={companyName}
            >
              <img
                src={navbarLogoSrc}
                alt={companyName}
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
                fontWeight: 700,
                color: 'var(--text-main)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={companyName}
            >
              {companyName}
            </span>
          </div>
        )}
      </div>

      {/* Middle & Right Navigation actions */}
      <div className="topbar-actions">
        {/* Search trigger */}
        <button
          onClick={onOpenSearch}
          className="nav-search-btn"
        >
          <Search size={14} />
          <span className="nav-search-text">Search everything...</span>
          <kbd className="nav-search-kbd" style={{
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
          <span className="nav-role-text" style={{ textTransform: 'capitalize' }}>
            Role: {
              !user
                ? 'Guest'
                : user.activeRole === 'trainer' || user.activeRole === 'instructor' || user.activeRole === 'assessment_author' || user.activeRole === 'grader'
                ? 'Trainer'
                : user.activeRole === 'student' || user.activeRole === 'learner'
                ? 'Student'
                : user.activeRole === 'org_admin' || user.activeRole === 'lms_admin'
                ? 'Institution Admin'
                : user.activeRole === 'platform_admin'
                ? 'Platform Admin'
                : 'User'
            }
          </span>
          <ChevronDown size={12} />
        </button>

        {/* Theme Selector (Light, Dark, System) */}
        <div style={{ position: 'relative' }} ref={themeMenuRef}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setShowThemeMenu(!showThemeMenu)}
            style={{
              padding: '6px 8px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px'
            }}
            title={`Theme: ${preference === 'system' ? `System (${resolvedTheme})` : preference === 'light' ? 'Light' : 'Dark'}`}
            aria-label="Select color theme"
            aria-haspopup="true"
            aria-expanded={showThemeMenu}
          >
            {preference === 'light' ? (
              <Sun size={15} color="var(--warning)" />
            ) : preference === 'dark' ? (
              <Moon size={15} color="var(--primary)" />
            ) : (
              <Monitor size={15} color="var(--accent-cyan)" />
            )}
            <ChevronDown size={11} className="text-muted" />
          </button>

          {showThemeMenu && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '6px',
                width: '190px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-lg)',
                padding: '6px',
                zIndex: 60,
                animation: 'scaleUp 0.15s ease'
              }}
            >
              <div style={{ padding: '6px 10px 4px', fontSize: '0.675rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Appearance Theme
              </div>

              {[
                { id: 'dark', label: 'Dark', desc: 'Cosmic midnight theme', icon: Moon, color: 'var(--brand-indigo)' },
                { id: 'light', label: 'Light', desc: 'Crisp day theme', icon: Sun, color: 'var(--brand-pink-soft)' },
                { id: 'system', label: 'System (Device)', desc: `Follow OS (${resolvedTheme})`, icon: Monitor, color: 'var(--brand-blue-sky)' }
              ].map((opt) => {
                const IconComp = opt.icon;
                const isSelected = preference === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setTheme(opt.id as ThemePreference);
                      setShowThemeMenu(false);
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '7px 10px',
                      fontSize: '0.8rem',
                      borderRadius: 'var(--radius-md)',
                      border: 'none',
                      background: isSelected ? 'var(--primary-light)' : 'transparent',
                      color: isSelected ? 'var(--primary)' : 'var(--text-main)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                      marginBottom: '2px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <IconComp size={15} color={opt.color} />
                      <div>
                        <div style={{ fontWeight: isSelected ? 700 : 500, lineHeight: 1.2 }}>
                          {opt.label}
                        </div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                          {opt.desc}
                        </div>
                      </div>
                    </div>
                    {isSelected && <Check size={14} color="var(--primary)" strokeWidth={2.5} />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

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
