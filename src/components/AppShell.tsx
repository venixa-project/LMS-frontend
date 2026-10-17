import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { Breadcrumbs } from './Breadcrumbs';
import { RoleSwitcherModal } from './RoleSwitcherModal';
import { NotificationsDrawer } from './NotificationsDrawer';
import { GlobalSearchModal } from './GlobalSearchModal';

export const AppShell: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [roleSwitcherOpen, setRoleSwitcherOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-app)' }}>
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* Left Sidebar */}
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Main Content Area */}
        <div className="main-content">
          <Navbar
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            onOpenRoleSwitcher={() => setRoleSwitcherOpen(true)}
            onOpenNotifications={() => setNotificationsOpen(true)}
            onOpenSearch={() => setSearchOpen(true)}
          />

          <main className="page-body">
            <Breadcrumbs />
            <Outlet />
          </main>
        </div>
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
