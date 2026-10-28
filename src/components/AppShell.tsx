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
import { StudentLeaderboardWelcomeModal } from './StudentLeaderboardWelcomeModal';
import { useGamificationStore } from '../lib/gamificationStore';
import { RankUpModal } from './Gamification/RankUpModal';
import { LoginRewardToast, LoginRewardToastData } from './Gamification/LoginRewardToast';

export const AppShell: React.FC = () => {
  // 1. Auth & Router Hooks (always called at top level)
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const { recordDailyLogin } = useGamificationStore();

  // 2. UI Layout States
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [roleSwitcherOpen, setRoleSwitcherOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [leaderboardModalOpen, setLeaderboardModalOpen] = useState(false);
  const [loginRewardToast, setLoginRewardToast] = useState<LoginRewardToastData | null>(null);

  const isStudent = user?.activeRole === 'student' || user?.activeRole === 'learner' || user?.activeRole === 'guest';

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

  // 7. Student Leaderboard Welcome Pop-Up on Login
  useEffect(() => {
    if (!isAuthenticated || !user || isLoading) return;
    if (!isStudent) return;

    // Check if triggered explicitly upon login or first session load
    const shouldShow = sessionStorage.getItem('show_student_leaderboard_popup');
    const todayStr = new Date().toISOString().slice(0, 10);
    const dismissedDay = localStorage.getItem('venilearn_dismiss_leaderboard_popup');

    if (shouldShow === 'true' || (!dismissedDay || dismissedDay !== todayStr)) {
      if (shouldShow === 'true' || !sessionStorage.getItem('venilearn_student_leaderboard_shown')) {
        setLeaderboardModalOpen(true);
        sessionStorage.setItem('venilearn_student_leaderboard_shown', 'true');
        sessionStorage.removeItem('show_student_leaderboard_popup');
      }
    }

    const handleTrigger = () => {
      setLeaderboardModalOpen(true);
    };
    window.addEventListener('open-student-leaderboard-popup', handleTrigger);
    return () => window.removeEventListener('open-student-leaderboard-popup', handleTrigger);
  }, [isAuthenticated, user?.id, isStudent, isLoading]);

  // 8. Automatic Daily Login Rewards & Streaks
  useEffect(() => {
    if (!isAuthenticated || !user || isLoading || !isStudent) return;
    try {
      const res = recordDailyLogin(user.id);
      if (res.awarded) {
        setLoginRewardToast({
          dailyPoints: res.dailyPoints ?? res.pointsAwarded ?? 5,
          streak: res.streak ?? res.newStreak ?? 1,
          milestoneBonus: res.milestoneBonus,
          milestoneDays: res.milestoneDays,
        });
      }
    } catch (e) {
      console.warn('Gamification daily login error:', e);
    }
  }, [isAuthenticated, user?.id, isStudent, isLoading, recordDailyLogin]);

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

      {/* Student Leaderboard Welcome Pop-Up */}
      {isStudent && (
        <StudentLeaderboardWelcomeModal
          isOpen={leaderboardModalOpen}
          onClose={() => setLeaderboardModalOpen(false)}
        />
      )}

      {/* Student Rank Up Celebration Modal */}
      {isStudent && user && (
        <RankUpModal studentId={user.id} />
      )}

      {/* Floating Login Reward Toast */}
      {loginRewardToast && (
        <LoginRewardToast
          data={loginRewardToast}
          onClose={() => setLoginRewardToast(null)}
        />
      )}
    </div>
  );
};
