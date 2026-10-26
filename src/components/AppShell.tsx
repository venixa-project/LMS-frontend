import React, { useState, useEffect } from 'react';
import { Outlet, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../lib/store';
import { isRouteAllowedForRole } from '../lib/permissions';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { Breadcrumbs } from './Breadcrumbs';
import { RoleSwitcherModal } from './RoleSwitcherModal';
import { NotificationsDrawer } from './NotificationsDrawer';
import { GlobalSearchModal } from './GlobalSearchModal';

export const AppShell: React.FC = () => {
  // 1. Auth & Router Hooks (always called at top level)
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  // 2. UI Layout States
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [roleSwitcherOpen, setRoleSwitcherOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // 3. Responsive Resize Handler
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 1024) {
        setMobileOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 4. Sidebar Toggle Handler
  const handleToggleSidebar = () => {
    if (window.innerWidth <= 1024) {
      setMobileOpen((prev) => !prev);
    } else {
      setDesktopCollapsed((prev) => !prev);
    }
  };

  // 5. Global Keyboard Shortcuts: Ctrl+K (Search), Ctrl+B (Sidebar)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        handleToggleSidebar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 6. Role Permission Validation
  useEffect(() => {
    if (isAuthenticated && user && !isLoading) {
      if (!isRouteAllowedForRole(location.pathname, user.activeRole)) {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user?.activeRole, location.pathname, isAuthenticated, isLoading, navigate]);

  // Public Routes (allowed for unauthenticated preview)
  const isPublicRoute =
    location.pathname.startsWith('/course/') ||
    location.pathname.startsWith('/courses/') ||
    location.pathname === '/catalog' ||
    location.pathname === '/join-course';

  // Render centered loading state while session restoration completes
  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-app)',
        color: 'var(--text-main)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div className="pulse-indicator" style={{ width: '16px', height: '16px', margin: '0 auto 16px' }} />
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Restoring secure session...</div>
        </div>
      </div>
    );
  }

  // If not authenticated and accessing a protected route, safely redirect to login with intended return URL
  if (!isAuthenticated && !isPublicRoute) {
    const redirectParam = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${redirectParam}`} replace />;
  }

  return (
    <div className={`app-shell ${desktopCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Left Sidebar */}
      <Sidebar
        isOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      {/* Main Wrapper */}
      <div className="main-wrapper">
        <Navbar
          onToggleSidebar={handleToggleSidebar}
          onOpenRoleSwitcher={() => setRoleSwitcherOpen(true)}
          onOpenNotifications={() => setNotificationsOpen(true)}
          onOpenSearch={() => setSearchOpen(true)}
        />

        {/* Independently Scrollable Main Content Area */}
        <main className="main-content">
          <div className="page-body">
            <Breadcrumbs />
            <Outlet />
          </div>
        </main>
      </div>

      {/* Overlays / Modals */}
      <RoleSwitcherModal
        isOpen={roleSwitcherOpen}
        onClose={() => setRoleSwitcherOpen(false)}
      />

      <NotificationsDrawer
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
      />

      <GlobalSearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
      />
    </div>
  );
};
