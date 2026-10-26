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
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [roleSwitcherOpen, setRoleSwitcherOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Validate active route permissions against the active role on role switch, direct navigation, refresh, or history navigation
  useEffect(() => {
    if (isAuthenticated && user && !isLoading) {
      if (!isRouteAllowedForRole(location.pathname, user.activeRole)) {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user?.activeRole, location.pathname, isAuthenticated, isLoading, navigate]);

  // Allow guest browsing for publicly discoverable catalog and course preview pages
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
    <div className="app-shell">
      {/* Left Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Wrapper */}
      <div className="main-wrapper">
        <Navbar
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
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
