import React, { useState, useEffect, useMemo, useRef } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../lib/store';
import {
  LayoutDashboard, BookOpen, Route, Video, HelpCircle,
  ClipboardCheck, PenTool, Eye, Award, BarChart3, Bell,
  Plug, Settings, Building2, Building, Briefcase, MapPin, Network, Users, UsersRound,
  Shield, Search, Trophy, GraduationCap, Calendar, Clock,
  UserCheck, User, Megaphone, Compass, Library, Layers, X, Play, Flame,
  Link2, Share2, ChevronDown, ChevronRight, FileText, CheckCircle
} from 'lucide-react';
import { getNavigationForRole, type NavItem } from '../lib/permissions';
import { useOrganisationBranding } from '../lib/useOrganisationBranding';
import { AnimatedAvatar } from './AnimatedAvatar';

const iconMap: Record<string, any> = {
  LayoutDashboard,
  Building2,
  Building,
  Briefcase,
  MapPin,
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
  Clock,
  UserCheck,
  User,
  Megaphone,
  Compass,
  Library,
  Layers,
  Play,
  Flame,
  Link2,
  Share2,
  ChevronDown,
  ChevronRight,
  FileText,
  CheckCircle,
};

// Canonical Parent Menu Icon Mapping
const groupIconMap: Record<string, any> = {
  'Main': LayoutDashboard,
  'Platform Ops': LayoutDashboard,
  'Organisation Management': Building2,
  'Multi-Tenancy': Building,
  'Identity & Access': Shield,
  'Curriculum & Teaching': BookOpen,
  'Teaching & Curriculum': BookOpen,
  'Curriculum & Programs': Route,
  'Academics & Learning': BookOpen,
  'Explore Courses': Compass,
  'Schedule & Attendance': Calendar,
  'Assessments & Evaluation': ClipboardCheck,
  'Assessments & Grading': ClipboardCheck,
  'Evaluations & Grading': ClipboardCheck,
  'Assessments & Quizzes': ClipboardCheck,
  'Assessments & Tests': ClipboardCheck,
  'Reports & Analytics': BarChart3,
  'Reports & Settings': BarChart3,
  'Learner Insights': BarChart3,
  'System & Insights': Settings,
  'Certificates & Credentials': Award,
  'Certificates & Profile': Award,
  'Credentials & Profile': Award,
  'Communications': Megaphone,
  'Announcements & Notifications': Bell,
  'Account': User,
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<Props> = ({ isOpen, onClose }) => {
  const { navigation, user } = useAuthStore();
  const isPlatformAdmin = user?.activeRole === 'platform_admin';
  const { companyName, companyLogo } = useOrganisationBranding();
  const [sidebarLogoSrc, setSidebarLogoSrc] = useState(companyLogo || '/logo.png');

  useEffect(() => {
    setSidebarLogoSrc(companyLogo || '/logo.png');
  }, [companyLogo]);

  const location = useLocation();
  const currentPath = location.pathname;

  // Fallback navigation for guests / unauthenticated users
  const guestNav: NavItem[] = [
    { id: 'guest-catalog', label: 'Browse Courses', path: '/catalog', icon: 'Compass', group: 'Explore Courses' },
    { id: 'guest-join', label: 'Join with Link', path: '/join-course', icon: 'Link2', group: 'Explore Courses' },
  ];

  const activeNav: NavItem[] = user ? navigation : guestNav;

  // Active route matching helper
  const isItemActive = (item: NavItem): boolean => {
    if (item.id === 'dashboard') {
      return currentPath === '/' || currentPath === '/dashboard';
    }
    if (item.id === 'ca-company-profile') {
      return (
        currentPath === '/organisation' ||
        currentPath.startsWith('/organisation/') ||
        currentPath === '/departments' ||
        currentPath.startsWith('/departments/')
      );
    }
    if (item.id === 'ca-branches-locations') {
      return currentPath === '/organisation/branches-locations' || currentPath.startsWith('/organisation/branches-locations/');
    }
    if (item.id === 'ca-departments-designations') {
      return (
        currentPath === '/organisation/departments-designations' ||
        currentPath.startsWith('/organisation/departments-designations/') ||
        currentPath === '/departments' ||
        currentPath.startsWith('/departments/')
      );
    }
    if (item.id === 'people' || item.id === 'people-faculty') {
      return ['/people', '/students', '/faculty'].some((p) => currentPath === p || currentPath.startsWith(`${p}/`));
    }
    if (item.id === 'cohorts') {
      return currentPath === '/cohorts' || currentPath.startsWith('/cohorts/');
    }
    const queryTab = new URLSearchParams(location.search).get('tab');

    if (item.id === 'courses' || item.id === 'my-courses') {
      if (currentPath === '/my-learning') return false;
      return (
        ['/courses', '/catalog', '/join-course'].some((p) => currentPath === p || currentPath.startsWith(`${p}/`)) ||
        (currentPath.startsWith('/course/') && !currentPath.startsWith('/course-builder'))
      );
    }
    if (item.id === 'my-learning') {
      return (
        currentPath === '/my-learning' ||
        currentPath.startsWith('/my-learning/') ||
        currentPath === '/my-courses' ||
        currentPath.startsWith('/course-player')
      );
    }
    if (item.id === 'course-builder') {
      return currentPath === '/course-builder' || currentPath.startsWith('/course-builder/');
    }
    if (item.id === 'learning-paths' || item.id === 'my-paths' || item.id === 'paths') {
      return currentPath === '/learning-paths' || currentPath === '/my-paths' || currentPath.startsWith('/learning-paths/');
    }
    if (item.id === 'enrollments') {
      return currentPath === '/enrollments' || currentPath.startsWith('/enrollments/');
    }
    if (item.id === 'calendar') {
      return currentPath === '/calendar' || currentPath === '/planner';
    }
    if (item.id === 'weekly-timetable') {
      return (
        currentPath === '/weekly-timetable' ||
        currentPath.startsWith('/weekly-timetable/') ||
        ((currentPath === '/my-sessions' || currentPath === '/live-sessions' || currentPath === '/timetable' || currentPath === '/classes-timetable') &&
          (queryTab === 'timetable' || queryTab === 'weekly-timetable'))
      );
    }
    if (item.id === 'recorded-classes' || item.id === 'recordings') {
      return (
        currentPath === '/recorded-classes' ||
        currentPath.startsWith('/recorded-classes/') ||
        currentPath === '/recordings' ||
        currentPath.startsWith('/recordings/') ||
        ((currentPath === '/my-sessions' || currentPath === '/live-sessions' || currentPath === '/timetable' || currentPath === '/classes-timetable') &&
          (queryTab === 'recordings' || queryTab === 'recorded-classes'))
      );
    }
    if (item.id === 'timetable' || item.id === 'classes-timetable') {
      if (queryTab === 'timetable' || queryTab === 'weekly-timetable' || queryTab === 'recordings' || queryTab === 'recorded-classes') {
        return false;
      }
      if (currentPath === '/weekly-timetable' || currentPath === '/recorded-classes' || currentPath === '/recordings') {
        return false;
      }
      if (item.path === '/my-sessions') {
        return currentPath === '/my-sessions' || currentPath.startsWith('/my-sessions/') || currentPath === '/live-sessions';
      }
      return (
        currentPath === '/timetable' || currentPath.startsWith('/timetable/') ||
        currentPath === '/classes-timetable' || currentPath.startsWith('/classes-timetable/')
      );
    }
    if (item.id === 'live-sessions') {
      if (queryTab === 'timetable' || queryTab === 'weekly-timetable' || queryTab === 'recordings' || queryTab === 'recorded-classes') {
        return false;
      }
      if (currentPath === '/weekly-timetable' || currentPath === '/recorded-classes' || currentPath === '/recordings') {
        return false;
      }
      return (
        currentPath === '/live-sessions' || currentPath.startsWith('/live-sessions/') ||
        currentPath === '/my-sessions' || currentPath.startsWith('/my-sessions/')
      );
    }
    if (item.id === 'momentum') {
      return currentPath === '/momentum' || currentPath.startsWith('/momentum/');
    }
    if (item.id === 'leaderboard') {
      return currentPath === '/leaderboard' || currentPath.startsWith('/leaderboard/');
    }
    if (item.id === 'attendance' || item.id === 'attendance-ledger') {
      return (
        currentPath === '/attendance' || currentPath.startsWith('/attendance/') ||
        currentPath === '/attendance-ledger' || currentPath.startsWith('/attendance-ledger/')
      );
    }
    if (item.id === 'assignments') {
      return currentPath === '/assignments' || currentPath.startsWith('/assignments/');
    }
    if (item.id === 'my-results') {
      return currentPath === '/my-results' || currentPath.startsWith('/my-results/');
    }
    if (item.id === 'assessments') {
      if (currentPath === '/assignments' || currentPath === '/my-results') return false;
      return currentPath === '/assessments' || currentPath === '/my-assessments' || currentPath.startsWith('/assessments/');
    }
    if (item.id === 'assignments') {
      return currentPath === '/assignments' || currentPath.startsWith('/assignments/');
    }
    if (item.id === 'my-results') {
      return currentPath === '/my-results' || currentPath.startsWith('/my-results/');
    }
    if (item.id === 'my-proctoring-reports') {
      return (
        currentPath === '/my-proctoring-reports' ||
        currentPath.startsWith('/my-proctoring-reports/') ||
        currentPath === '/my-proctoring-report' ||
        currentPath.startsWith('/my-proctoring-report/')
      );
    }
    if (item.id === 'question-banks') {
      return currentPath === '/question-banks' || currentPath.startsWith('/question-banks/');
    }
    if (item.id === 'grading') {
      return currentPath === '/grading' || currentPath.startsWith('/grading/');
    }
    if (item.id === 'proctoring') {
      return currentPath === '/proctoring' || currentPath.startsWith('/proctoring/');
    }
    if (item.id === 'certificates' || item.id === 'my-certificates') {
      return currentPath === '/certificates' || currentPath === '/my-certificates' || currentPath.startsWith('/certificates/');
    }
    if (item.id === 'reports') {
      return currentPath === '/reports' || currentPath.startsWith('/reports/');
    }
    if (item.id === 'notifications' || item.id === 'announcements') {
      return currentPath === '/notifications' || currentPath.startsWith('/notifications/');
    }
    if (item.id === 'profile') {
      return currentPath === '/profile' || currentPath.startsWith('/profile/');
    }
    if (item.id === 'structure-tenants') {
      return currentPath === '/organizations' || currentPath.startsWith('/organizations/');
    }
    if (item.id === 'roles') {
      return currentPath === '/roles' || currentPath.startsWith('/roles/');
    }
    if (item.id === 'integrations') {
      return currentPath === '/integrations' || currentPath.startsWith('/integrations/');
    }
    if (item.id === 'settings') {
      return currentPath === '/settings' || currentPath.startsWith('/settings/');
    }
    return currentPath === item.path || (item.path !== '/' && currentPath.startsWith(`${item.path}/`));
  };

  // Group nav items by their defined group property
  const groupedNav = useMemo(() => {
    const groups: Record<string, NavItem[]> = {};
    activeNav.forEach((item) => {
      const grp = item.group || 'Other';
      if (!groups[grp]) groups[grp] = [];
      groups[grp].push(item);
    });
    return groups;
  }, [activeNav]);

  // Find which group currently contains the active path
  const activeGroupName = useMemo(() => {
    for (const [grpName, items] of Object.entries(groupedNav)) {
      if (items.some((item) => isItemActive(item))) {
        return grpName;
      }
    }
    return 'Main';
  }, [groupedNav, currentPath]);

  // Collapsible Accordion & Hover States
  // Tracks the default expanded group (defaults to active group to identify current location)
  const [openGroup, setOpenGroup] = useState<string | null>(activeGroupName);

  // Tracks group currently hovered by desktop fine pointer
  const [hoveredGroup, setHoveredGroup] = useState<string | null>(null);

  // Tracks group focused by keyboard navigation
  const [focusedGroup, setFocusedGroup] = useState<string | null>(null);

  // Timer ref for smooth, flicker-free mouse leave collapse
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Detect whether device supports hover and fine pointer (desktop mouse)
  const [hasHover, setHasHover] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    }
    return true;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia('(hover: hover) and (pointer: fine)');
    const onChange = (e: MediaQueryListEvent) => setHasHover(e.matches);
    if (mql.addEventListener) {
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    } else if (mql.addListener) {
      mql.addListener(onChange);
      return () => mql.removeListener(onChange);
    }
  }, []);

  // Clean up any pending leave timeout when unmounting
  useEffect(() => {
    return () => {
      if (leaveTimerRef.current) {
        clearTimeout(leaveTimerRef.current);
      }
    };
  }, []);

  // Automatically expand parent group when route changes or direct URL navigation occurs
  useEffect(() => {
    if (activeGroupName) {
      setOpenGroup(activeGroupName);
    }
  }, [activeGroupName, currentPath]);

  // Handle pointer enter on group container (parent button + submenu)
  const handleGroupMouseEnter = (groupName: string) => {
    if (!hasHover) return;
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
    setHoveredGroup(groupName);
  };

  // Handle pointer leave with a 250ms buffer to prevent accidental closing
  const handleGroupMouseLeave = (_groupName: string) => {
    if (!hasHover) return;
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
    }
    leaveTimerRef.current = setTimeout(() => {
      setHoveredGroup(null);
      leaveTimerRef.current = null;
    }, 250);
  };

  // Keyboard navigation focus handlers
  const handleGroupFocus = (groupName: string) => {
    setFocusedGroup(groupName);
  };

  const handleGroupBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setFocusedGroup(null);
    }
  };

  // Toggle group accordion (for click, mobile tap, or keyboard Enter/Space activation)
  const toggleGroup = (groupName: string) => {
    const isCurrentlyExpanded =
      focusedGroup === groupName ||
      hoveredGroup === groupName ||
      (hoveredGroup === null && focusedGroup === null && openGroup === groupName);

    if (isCurrentlyExpanded) {
      setOpenGroup(null);
      setHoveredGroup(null);
      setFocusedGroup(null);
    } else {
      setOpenGroup(groupName);
      setHoveredGroup(groupName);
    }
  };

  // Scroll active item into view smoothly
  const activeItemRef = useRef<HTMLAnchorElement | null>(null);
  useEffect(() => {
    if (activeItemRef.current) {
      activeItemRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [currentPath]);

  return (
    <>
      {/* Mobile backdrop - only visible on mobile screens <= 768px */}
      {isOpen && (
        <div
          className="sidebar-backdrop"
          onClick={onClose}
          aria-label="Close navigation sidebar"
        />
      )}

      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        {/* ======================================================== */}
        {/* FIXED BRAND HEADER                                      */}
        {/* ======================================================== */}
        <div
          style={{
            height: 'var(--navbar-height, 64px)',
            padding: '0 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'var(--bg-sidebar)',
            flexShrink: 0,
            gap: '8px',
          }}
        >
          <Link
            to="/"
            onClick={onClose}
            style={{
              display: 'flex',
              alignItems: 'center',
              textDecoration: 'none',
              color: 'inherit',
              minWidth: 0,
              maxWidth: 'calc(100% - 36px)',
            }}
          >
            {isPlatformAdmin ? (
              <div className="brand-logo-card">
                <img
                  src="/logo.png"
                  alt="VeniLearn Platform"
                  className="brand-logo-img"
                  style={{
                    height: '34px',
                    width: 'auto',
                    maxWidth: '165px',
                    objectFit: 'contain',
                  }}
                />
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                <div
                  style={{
                    height: '36px',
                    width: '36px',
                    minWidth: '36px',
                    borderRadius: '8px',
                    background: '#ffffff',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    padding: '2px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                    flexShrink: 0,
                  }}
                >
                  <img
                    src={sidebarLogoSrc}
                    alt={companyName}
                    style={{
                      maxHeight: '100%',
                      maxWidth: '100%',
                      width: 'auto',
                      height: 'auto',
                      objectFit: 'contain',
                      display: 'block',
                    }}
                    onError={() => setSidebarLogoSrc('/logo.png')}
                  />
                </div>
                <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                  <span
                    style={{
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      color: 'var(--text-main)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      lineHeight: 1.25,
                    }}
                    title={companyName}
                  >
                    {companyName}
                  </span>
                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 600,
                      color: 'var(--brand-indigo, #5447FF)',
                      letterSpacing: '0.02em',
                      lineHeight: 1.2,
                      marginTop: '1px',
                    }}
                  >
                    LMS Workspace
                  </span>
                </div>
              </div>
            )}
          </Link>

          {/* Close button for mobile drawer */}
          <button
            onClick={onClose}
            className="mobile-sidebar-close-btn"
            style={{
              display: 'none',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-muted)',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              cursor: 'pointer'
            }}
            title="Close menu"
            aria-label="Close navigation"
          >
            <X size={16} />
          </button>
        </div>

        {/* ======================================================== */}
        {/* INDEPENDENTLY SCROLLABLE NAVIGATION AREA                 */}
        {/* ======================================================== */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '16px 10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {Object.entries(groupedNav).map(([groupName, items]) => {
            const isMainGroup = groupName === 'Main' || groupName === 'Platform Ops';
            const GroupIcon = groupIconMap[groupName] || LayoutDashboard;
            const hasActiveChild = items.some((item) => isItemActive(item));
            const groupSlug = groupName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

            // Determine if this group is currently expanded based on keyboard focus, mouse hover, or default route active state
            const isExpanded =
              focusedGroup !== null
                ? focusedGroup === groupName
                : hoveredGroup !== null
                  ? hoveredGroup === groupName
                  : openGroup === groupName || (isMainGroup && hasActiveChild);

            // Compute total badge count for this group if items have badges
            const groupBadgeCount = items.reduce((acc, curr) => acc + (curr.badge || 0), 0);

            // Case A: Single item group or Main/Dashboard:
            // Display directly as a normal navigation item without unnecessary expand/collapse arrows or redundant nesting
            if (items.length === 1) {
              const mainItem = items[0];
              const Icon = iconMap[mainItem.icon] || GroupIcon;
              const active = isItemActive(mainItem);

              return (
                <div key={groupName} style={{ marginBottom: '4px' }}>
                  <NavLink
                    to={mainItem.path}
                    onClick={() => {
                      if (leaveTimerRef.current) {
                        clearTimeout(leaveTimerRef.current);
                        leaveTimerRef.current = null;
                      }
                      setHoveredGroup(null);
                      onClose();
                    }}
                    ref={active ? activeItemRef : null}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '9px 12px',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.85rem',
                      fontWeight: active ? 700 : 600,
                      color: active ? '#fff' : 'var(--text-main)',
                      background: active
                        ? 'linear-gradient(135deg, #2563EB 0%, #818CF8 100%)'
                        : 'transparent',
                      borderLeft: active ? '3px solid #F472B6' : '3px solid transparent',
                      boxShadow: active ? '0 4px 14px rgba(37, 99, 235, 0.45)' : 'none',
                      transition: 'all 0.18s ease',
                      textDecoration: 'none',
                    }}
                    onMouseEnter={(e) => {
                      if (!active) {
                        e.currentTarget.style.background = 'var(--bg-card-hover)';
                      }
                      if (hasHover) {
                        if (leaveTimerRef.current) {
                          clearTimeout(leaveTimerRef.current);
                          leaveTimerRef.current = null;
                        }
                        setHoveredGroup(null);
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!active) {
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Icon
                        size={18}
                        style={{
                          color: active ? '#fff' : 'var(--primary)',
                          flexShrink: 0,
                        }}
                      />
                      <span>{mainItem.label}</span>
                    </div>

                    {mainItem.badge !== undefined && mainItem.badge > 0 && (
                      <span
                        style={{
                          background: 'var(--primary)',
                          color: '#fff',
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: '10px',
                        }}
                      >
                        {mainItem.badge}
                      </span>
                    )}
                  </NavLink>
                </div>
              );
            }

            // Case B: Collapsible Parent Menu with Child Links (Hover & Accordion)
            return (
              <div
                key={groupName}
                className={`nav-group-container ${isExpanded ? 'expanded' : ''}`}
                onMouseEnter={() => handleGroupMouseEnter(groupName)}
                onMouseLeave={() => handleGroupMouseLeave(groupName)}
                onFocus={() => handleGroupFocus(groupName)}
                onBlur={handleGroupBlur}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: 'var(--radius-md)',
                  background: isExpanded ? 'rgba(255, 255, 255, 0.02)' : 'transparent',
                  transition: 'background 0.2s ease',
                }}
              >
                {/* Collapsible Parent Header Button */}
                <button
                  type="button"
                  id={`nav-group-${groupSlug}`}
                  aria-expanded={isExpanded}
                  aria-controls={`nav-submenu-${groupSlug}`}
                  aria-haspopup="true"
                  onClick={() => toggleGroup(groupName)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleGroup(groupName);
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '9px 12px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.85rem',
                    fontWeight: hasActiveChild ? 700 : 600,
                    color: hasActiveChild
                      ? '#818CF8'
                      : isExpanded
                        ? 'var(--text-main)'
                        : 'var(--text-secondary)',
                    background: hasActiveChild
                      ? 'rgba(37, 99, 235, 0.18)'
                      : isExpanded
                        ? 'var(--bg-input)'
                        : 'transparent',
                    border: 'none',
                    borderLeft: hasActiveChild ? '3px solid #F472B6' : '3px solid transparent',
                    width: '100%',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.18s ease',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (!hasActiveChild) {
                      e.currentTarget.style.background = 'var(--bg-card-hover)';
                      e.currentTarget.style.color = 'var(--text-main)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!hasActiveChild) {
                      e.currentTarget.style.background = isExpanded ? 'var(--bg-input)' : 'transparent';
                      e.currentTarget.style.color = isExpanded ? 'var(--text-main)' : 'var(--text-secondary)';
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                    <GroupIcon
                      size={18}
                      style={{
                        flexShrink: 0,
                        color: hasActiveChild
                          ? 'var(--primary)'
                          : isExpanded
                            ? 'var(--text-main)'
                            : 'var(--text-muted)',
                        transition: 'color 0.18s ease',
                      }}
                    />
                    <span
                      style={{
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {groupName}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    {/* Badge Indicator when parent is collapsed */}
                    {!isExpanded && groupBadgeCount > 0 && (
                      <span
                        style={{
                          background: 'var(--primary)',
                          color: '#fff',
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: '10px',
                        }}
                      >
                        {groupBadgeCount}
                      </span>
                    )}

                    {/* Smooth Rotating Chevron */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                        transition: 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
                        color: hasActiveChild ? 'var(--primary)' : 'var(--text-muted)',
                      }}
                    >
                      <ChevronRight size={15} />
                    </div>
                  </div>
                </button>

                {/* Collapsible Submenu Child Links Container with smooth CSS grid transition */}
                <div
                  id={`nav-submenu-${groupSlug}`}
                  role="region"
                  aria-label={`${groupName} sub-navigation`}
                  aria-labelledby={`nav-group-${groupSlug}`}
                  className={`sidebar-submenu-wrapper ${isExpanded ? 'expanded' : ''}`}
                >
                  <div
                    className="sidebar-submenu-inner"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                      paddingLeft: '14px',
                      marginTop: isExpanded ? '3px' : '0px',
                      marginBottom: isExpanded ? '6px' : '0px',
                      marginLeft: '12px',
                      borderLeft: '1px dashed var(--border-subtle)',
                      transition: 'margin 0.22s ease',
                    }}
                  >
                    {items.map((sub) => {
                      const SubIcon = iconMap[sub.icon] || BookOpen;
                      const isSubActive = isItemActive(sub);

                      return (
                        <NavLink
                          key={sub.id}
                          id={`subnav-${sub.id}`}
                          to={sub.path}
                          onClick={() => {
                            if (leaveTimerRef.current) {
                              clearTimeout(leaveTimerRef.current);
                              leaveTimerRef.current = null;
                            }
                            setHoveredGroup(null);
                            onClose();
                          }}
                          ref={isSubActive ? activeItemRef : null}
                          className={isSubActive ? 'active' : ''}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '7px 10px',
                            borderRadius: 'var(--radius-md)',
                            fontSize: '0.81rem',
                            fontWeight: isSubActive ? 700 : 500,
                            color: isSubActive ? '#fff' : 'var(--text-secondary)',
                            background: isSubActive ? 'linear-gradient(135deg, rgba(37, 99, 235, 0.4) 0%, rgba(244, 114, 182, 0.25) 100%)' : 'transparent',
                            borderLeft: isSubActive ? '2.5px solid #F472B6' : '2.5px solid transparent',
                            textDecoration: 'none',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            if (!isSubActive) {
                              e.currentTarget.style.background = 'var(--bg-card-hover)';
                              e.currentTarget.style.color = 'var(--text-main)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isSubActive) {
                              e.currentTarget.style.background = 'transparent';
                              e.currentTarget.style.color = 'var(--text-secondary)';
                            }
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              overflow: 'hidden',
                            }}
                          >
                            <SubIcon
                              size={15}
                              style={{
                                flexShrink: 0,
                                color: isSubActive ? 'var(--primary)' : 'var(--text-muted)',
                              }}
                            />
                            <span
                              style={{
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {sub.label}
                            </span>
                          </div>

                          {sub.badge !== undefined && sub.badge > 0 && (
                            <span
                              style={{
                                background: 'var(--primary)',
                                color: '#fff',
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                padding: '1px 5px',
                                borderRadius: '8px',
                                flexShrink: 0,
                              }}
                            >
                              {sub.badge}
                            </span>
                          )}
                        </NavLink>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ======================================================== */}
        {/* FIXED LOGGED-IN USER FOOTER PROFILE                      */}
        {/* ======================================================== */}
        <div
          style={{
            padding: '14px 16px',
            borderTop: '1px solid var(--border-subtle)',
            background: 'var(--bg-surface)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            flexShrink: 0,
          }}
        >
          {!user ? (
            <Link
              to={`/login?redirect=${encodeURIComponent(location.pathname)}`}
              className="btn btn-primary btn-sm"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              Sign In to LMS
            </Link>
          ) : (
            <>
              <AnimatedAvatar
                size={34}
                isCurrentUser={true}
                name={user?.displayName}
                interactive={true}
              />
              <div style={{ overflow: 'hidden', flex: 1 }}>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: '0.8rem',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                    overflow: 'hidden',
                    color: 'var(--text-main)',
                  }}
                >
                  {user?.displayName || 'User'}
                </div>
                <div
                  style={{
                    fontSize: '0.72rem',
                    color: 'var(--text-secondary)',
                    textTransform: 'capitalize',
                    fontWeight: 500,
                  }}
                >
                  {!user
                    ? 'Guest'
                    : user.activeRole === 'trainer' || user.activeRole === 'instructor' || user.activeRole === 'assessment_author' || user.activeRole === 'grader'
                      ? 'Faculty / Trainer'
                      : user.activeRole === 'student' || user.activeRole === 'learner'
                        ? 'Enrolled Student'
                        : user.activeRole === 'org_admin' || user.activeRole === 'lms_admin'
                          ? 'Institution Admin'
                          : user.activeRole === 'platform_admin'
                            ? 'Platform Admin'
                            : 'Authorized User'}
                </div>
              </div>
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: 'var(--success)',
                  flexShrink: 0,
                }}
                title="Status: Online"
              />
            </>
          )}
        </div>
      </aside>
    </>
  );
};
