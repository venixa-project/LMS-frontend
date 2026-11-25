import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, X, BookOpen, ClipboardCheck, Users, Shield, ArrowRight,
  LayoutDashboard, Award, Calendar, Video, FileText, CheckCircle2,
  Building, Settings, UserCheck, Flame, Bell, Sparkles, Sun, Moon,
  LogOut, PlusCircle, ExternalLink, CornerDownLeft, Command, Layers,
  Compass, BarChart3, HelpCircle
} from 'lucide-react';
import { useAuthStore } from '../lib/store';
import { useThemeStore } from '../lib/themeStore';
import { useCourseStore } from '../lib/courseStore';
import { useAssessmentStore } from '../lib/assessmentStore';
import { usePeopleStore } from '../lib/peopleStore';
import { useCohortStore } from '../lib/cohortStore';
import { useDepartmentStore } from '../lib/departmentStore';
import { useCertificateStore } from '../lib/certificateStore';
import { useAnnouncementStore } from '../lib/announcementStore';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export type SearchCategory = 'all' | 'pages' | 'courses' | 'assessments' | 'people' | 'cohorts' | 'actions';

export interface SearchItem {
  id: string;
  title: string;
  subtitle: string;
  category: SearchCategory;
  categoryLabel: string;
  icon: React.ComponentType<{ size?: number; color?: string; className?: string }>;
  iconColor: string;
  iconBg: string;
  badge?: string;
  keywords?: string[];
  action: () => void;
}

/**
 * Letter Highlighting Helper
 * Emphasizes the exact characters/letters that the user typed inside search results
 */
const HighlightLetters: React.FC<{ text: string; query: string; isSelected?: boolean }> = ({
  text,
  query,
  isSelected = false,
}) => {
  const q = query.trim();
  if (!q) return <>{text}</>;

  try {
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    const parts = text.split(regex);

    return (
      <>
        {parts.map((part, i) =>
          regex.test(part) ? (
            <span
              key={i}
              style={{
                color: 'var(--primary)',
                fontWeight: 800,
                backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.28)' : 'rgba(99, 102, 241, 0.15)',
                borderRadius: '3px',
                padding: '0 2px',
              }}
            >
              {part}
            </span>
          ) : (
            part
          )
        )}
      </>
    );
  } catch {
    return <>{text}</>;
  }
};

export const GlobalSearchModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<SearchCategory>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { preference, toggleTheme } = useThemeStore();
  const { courses, fetchCourses } = useCourseStore();
  const { assessments, fetchAssessments } = useAssessmentStore();
  const { users, fetchPeople } = usePeopleStore();
  const { cohorts, fetchCohorts } = useCohortStore();
  const { departments, fetchDepartments } = useDepartmentStore();
  const { certificates, fetchCertificates } = useCertificateStore();
  const { announcements, fetchAnnouncements } = useAnnouncementStore();

  const isPlatformAdmin = user?.activeRole === 'platform_admin';
  const activeOrgId = (isPlatformAdmin && typeof window !== 'undefined' ? sessionStorage.getItem('venilearn_active_org_id') : null) || user?.organizationId || 'org-001';

  // Load stores when modal is opened if empty
  useEffect(() => {
    if (isOpen) {
      if (courses.length === 0) fetchCourses().catch(() => {});
      if (assessments.length === 0) fetchAssessments().catch(() => {});
      if (users.length === 0) fetchPeople().catch(() => {});
      if (cohorts.length === 0) fetchCohorts().catch(() => {});
      if (departments.length === 0) fetchDepartments().catch(() => {});
      if (certificates.length === 0) fetchCertificates().catch(() => {});
      if (announcements.length === 0) fetchAnnouncements().catch(() => {});
      
      // Auto-focus search input
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setQuery('');
      setActiveCategory('all');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const handleSelect = (action: () => void) => {
    action();
    onClose();
  };

  // Build the unified application search index
  const allSearchItems = useMemo<SearchItem[]>(() => {
    const items: SearchItem[] = [];

    // ==========================================
    // 1. Navigation Pages & System Modules (22+)
    // ==========================================
    const pagesList: Array<{
      title: string;
      path: string;
      desc: string;
      keywords: string[];
      icon: any;
      color: string;
      bg: string;
    }> = [
      { title: 'Institution Dashboard', path: '/dashboard', desc: 'Real-time analytics, learning velocity, and KPIs', keywords: ['home', 'kpi', 'metrics', 'stats', 'analytics', 'overview'], icon: LayoutDashboard, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)' },
      { title: 'Courses & Curriculum', path: '/courses', desc: 'Browse course catalog, syllabus, and modules', keywords: ['courses', 'curriculum', 'learning', 'lessons', 'classes', 'teaching'], icon: BookOpen, color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' },
      { title: 'Course Builder', path: '/courses/builder', desc: 'Author interactive video modules, quizzes, and materials', keywords: ['builder', 'create course', 'author', 'curriculum editor', 'upload video'], icon: PlusCircle, color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.12)' },
      { title: 'Learning Paths', path: '/learning-paths', desc: 'Structured competency tracks and learning sequences', keywords: ['tracks', 'paths', 'career path', 'roadmap', 'certifications'], icon: Compass, color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.12)' },
      { title: 'Assessments & Quizzes', path: '/assessments', desc: 'Manage quizzes, exams, AI evaluation, and invigilation', keywords: ['exams', 'quizzes', 'tests', 'evaluations', 'mcq', 'quiz'], icon: ClipboardCheck, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' },
      { title: 'Question Banks', path: '/question-banks', desc: 'Taxonomy-aligned MCQ and coding question repository', keywords: ['questions', 'pool', 'bank', 'mcq bank', 'items', 'problems'], icon: Layers, color: '#6366f1', bg: 'rgba(99, 102, 241, 0.12)' },
      { title: 'Student Assignments', path: '/assignments', desc: 'Hands-on projects, homework tasks, and submissions', keywords: ['homework', 'tasks', 'submissions', 'projects', 'review'], icon: FileText, color: '#14b8a6', bg: 'rgba(20, 184, 166, 0.12)' },
      { title: 'AI Evaluation & Grading Queue', path: '/grading', desc: 'AI auto-score suggestions, rubric grading, and moderation', keywords: ['grading', 'marks', 'scoring', 'rubric', 'evaluation queue', 'moderation', 'ai score'], icon: Shield, color: '#ec4899', bg: 'rgba(236, 72, 153, 0.12)' },
      { title: 'Live Proctoring Wall', path: '/proctoring?tab=live_monitor', desc: 'Supervised 30 FPS multi-grid video invigilation & proctor controls', keywords: ['proctoring', 'live video', 'webcam', 'cheating', 'invigilator', 'strikes', 'telemetry', 'camera'], icon: Video, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)' },
      { title: 'Proctoring Incident Center', path: '/proctoring?tab=incidents', desc: 'Audit logs, red flag reports, and proctoring violation proofs', keywords: ['violations', 'incidents', 'red flags', 'warnings', 'cheating logs'], icon: Shield, color: '#f97316', bg: 'rgba(249, 115, 22, 0.12)' },
      { title: 'Institution Reports & Analytics', path: '/reports', desc: 'Exportable attendance, course completion, and grade ledgers', keywords: ['reports', 'download excel', 'export', 'attendance report', 'completion', 'analytics'], icon: BarChart3, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)' },
      { title: 'Attendance Ledger', path: '/attendance', desc: 'Digital roll call, attendance percentage, and session records', keywords: ['attendance', 'presence', 'absent', 'roll call', 'ledger', 'sessions'], icon: UserCheck, color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' },
      { title: 'Schedule & Timetable', path: '/schedule', desc: 'Academic calendar, class slots, and lecture schedule', keywords: ['calendar', 'slots', 'timetable', 'schedule', 'classes'], icon: Calendar, color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.12)' },
      { title: 'Live Interactive Sessions', path: '/live-sessions', desc: 'Integrated Google Meet, webinars, and real-time classes', keywords: ['google meet', 'video call', 'webinar', 'conference', 'meeting', 'live stream'], icon: Video, color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.12)' },
      { title: 'Cohorts & Batches', path: '/cohorts', desc: 'Student batches, intake groups, and enrollment classes', keywords: ['cohorts', 'batches', 'intake', 'sections', 'groups', 'class'], icon: Users, color: '#6366f1', bg: 'rgba(99, 102, 241, 0.12)' },
      { title: 'People & User Directory', path: '/people', desc: 'Student accounts, faculty trainers, and administrator profiles', keywords: ['people', 'users', 'students', 'trainers', 'faculty', 'instructors', 'directory'], icon: Users, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)' },
      { title: 'Departments & Academics', path: '/departments', desc: 'Faculties, academic units, and institutional classifications', keywords: ['departments', 'faculty', 'school', 'engineering', 'science', 'academic units'], icon: Building, color: '#14b8a6', bg: 'rgba(20, 184, 166, 0.12)' },
      { title: 'Organizations & Campuses', path: '/organizations', desc: 'Multi-tenant institutional campuses and organizational units', keywords: ['organization', 'tenants', 'campuses', 'branches', 'institution'], icon: Building, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' },
      { title: 'Roles & Permissions', path: '/roles', desc: 'RBAC role definitions, capability matrices, and privileges', keywords: ['roles', 'permissions', 'access control', 'rbac', 'privileges'], icon: Shield, color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.12)' },
      { title: 'Certificate Management', path: '/certificates', desc: 'Automated digital awards, verification keys, and templates', keywords: ['certificates', 'credentials', 'diploma', 'awards', 'templates', 'badges'], icon: Award, color: '#eab308', bg: 'rgba(234, 179, 8, 0.12)' },
      { title: 'Verify Certificate', path: '/verify-certificate', desc: 'Public cryptographic validation tool for credentials', keywords: ['verify', 'validate certificate', 'authenticity', 'qr verification'], icon: CheckCircle2, color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' },
      { title: 'Announcements & Bulletins', path: '/announcements', desc: 'Institution broadcasts, notice boards, and student alerts', keywords: ['announcements', 'news', 'bulletins', 'alerts', 'broadcast', 'notices'], icon: Bell, color: '#ec4899', bg: 'rgba(236, 72, 153, 0.12)' },
      { title: 'Gamification Leaderboard', path: '/leaderboard', desc: 'Top students, XP points, weekly streaks, and rank tiers', keywords: ['leaderboard', 'ranks', 'xp', 'points', 'trophy', 'gamification', 'podium'], icon: Sparkles, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' },
      { title: 'Learner Momentum', path: '/momentum', desc: 'Daily learning habits, study momentum, and attendance streaks', keywords: ['momentum', 'streak', 'habits', 'daily goal', 'activity velocity'], icon: Flame, color: '#f97316', bg: 'rgba(249, 115, 22, 0.12)' },
      { title: 'My Profile & Account', path: '/profile', desc: 'Personal details, avatar, signature, and security preferences', keywords: ['profile', 'account', 'password', 'avatar', 'signature', 'theme settings'], icon: Settings, color: '#64748b', bg: 'rgba(100, 116, 139, 0.12)' },
    ];

    pagesList.forEach((p, idx) => {
      items.push({
        id: `page-${idx}`,
        title: p.title,
        subtitle: p.desc,
        category: 'pages',
        categoryLabel: 'Navigation',
        icon: p.icon,
        iconColor: p.color,
        iconBg: p.bg,
        badge: 'Page',
        keywords: p.keywords,
        action: () => navigate(p.path),
      });
    });

    // ==========================================
    // 2. Courses
    // ==========================================
    courses.forEach((c) => {
      items.push({
        id: `course-${c.id}`,
        title: c.title,
        subtitle: `${c.category || 'General'} • ${c.level || 'All Levels'} • ${c.status || 'Active'}`,
        category: 'courses',
        categoryLabel: 'Courses',
        icon: BookOpen,
        iconColor: '#10b981',
        iconBg: 'rgba(16, 185, 129, 0.12)',
        badge: 'Course',
        keywords: [c.description || '', c.category || '', ...(c.tags || [])],
        action: () => navigate(`/courses`),
      });
    });

    // ==========================================
    // 3. Assessments & Quizzes
    // ==========================================
    assessments.forEach((a) => {
      items.push({
        id: `asm-${a.id}`,
        title: a.title,
        subtitle: `${a.proctoringMode && a.proctoringMode !== 'none' ? 'Proctored Exam' : 'Standard Quiz'} • ${a.durationMinutes || 60}m • ${a.totalMarks || 100} Marks`,
        category: 'assessments',
        categoryLabel: 'Assessments',
        icon: ClipboardCheck,
        iconColor: '#f59e0b',
        iconBg: 'rgba(245, 158, 11, 0.12)',
        badge: a.proctoringMode === 'combined' ? 'AI+Manual' : a.proctoringMode === 'manual' ? 'Manual' : 'Exam',
        keywords: [(a as any).description || '', (a as any).category || '', a.proctoringMode || '', a.mode || ''],
        action: () => navigate(`/assessments`),
      });
    });

    // ==========================================
    // 4. People Directory
    // ==========================================
    users.forEach((u) => {
      const rolePretty = (u.activeRole || 'User').replace('_', ' ').toUpperCase();
      items.push({
        id: `user-${u.id}`,
        title: u.displayName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Learner',
        subtitle: `${u.email} • ${u.rollNo ? `ID: ${u.rollNo} • ` : ''}${rolePretty}`,
        category: 'people',
        categoryLabel: 'People',
        icon: Users,
        iconColor: '#8b5cf6',
        iconBg: 'rgba(139, 92, 246, 0.12)',
        badge: rolePretty,
        keywords: [u.email || '', u.rollNo || '', u.activeRole || '', u.departmentId || ''],
        action: () => navigate(`/people`),
      });
    });

    // ==========================================
    // 5. Cohorts & Batches
    // ==========================================
    cohorts.forEach((ch) => {
      items.push({
        id: `cohort-${ch.id}`,
        title: ch.name,
        subtitle: `${ch.code ? `Code: ${ch.code} • ` : ''}${ch.status || 'Active Batch'}`,
        category: 'cohorts',
        categoryLabel: 'Cohorts',
        icon: Users,
        iconColor: '#06b6d4',
        iconBg: 'rgba(6, 182, 212, 0.12)',
        badge: 'Cohort',
        keywords: [ch.code || '', (ch as any).description || ''],
        action: () => navigate(`/cohorts`),
      });
    });

    // ==========================================
    // 6. Quick Interactive Actions
    // ==========================================
    const isDark = preference === 'dark';
    items.push({
      id: 'act-theme',
      title: isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme',
      subtitle: `Currently active: ${isDark ? 'Dark Mode' : 'Light Mode'}`,
      category: 'actions',
      categoryLabel: 'Quick Action',
      icon: isDark ? Sun : Moon,
      iconColor: isDark ? '#f59e0b' : '#6366f1',
      iconBg: isDark ? 'rgba(245, 158, 11, 0.14)' : 'rgba(99, 102, 241, 0.14)',
      badge: 'Theme',
      keywords: ['theme', 'dark mode', 'light mode', 'appearance', 'toggle', 'color scheme'],
      action: () => toggleTheme(),
    });

    items.push({
      id: 'act-new-assessment',
      title: 'Create New Assessment / Quiz',
      subtitle: 'Open the 4-step wizard to configure questions, rubrics, and proctoring',
      category: 'actions',
      categoryLabel: 'Quick Action',
      icon: PlusCircle,
      iconColor: '#10b981',
      iconBg: 'rgba(16, 185, 129, 0.14)',
      badge: 'Action',
      keywords: ['create quiz', 'new test', 'new exam', 'author assessment', 'add assessment'],
      action: () => navigate('/assessments'),
    });

    items.push({
      id: 'act-new-course',
      title: 'Create New Course',
      subtitle: 'Build interactive modules, add videos, and publish curriculum',
      category: 'actions',
      categoryLabel: 'Quick Action',
      icon: PlusCircle,
      iconColor: '#3b82f6',
      iconBg: 'rgba(59, 130, 246, 0.14)',
      badge: 'Action',
      keywords: ['create course', 'new course', 'add course', 'author curriculum'],
      action: () => navigate('/courses/builder'),
    });

    items.push({
      id: 'act-live-wall',
      title: 'Launch Live Proctoring Wall',
      subtitle: 'Open real-time 30 FPS candidate video monitoring and proctor controls',
      category: 'actions',
      categoryLabel: 'Quick Action',
      icon: Video,
      iconColor: '#ef4444',
      iconBg: 'rgba(239, 68, 68, 0.14)',
      badge: 'Live',
      keywords: ['proctoring wall', 'live stream', 'invigilator', 'webcam wall'],
      action: () => navigate('/proctoring?tab=live_monitor'),
    });

    items.push({
      id: 'act-export-reports',
      title: 'Download & Export Reports',
      subtitle: 'Export institutional attendance, completion, and grade sheets to Excel',
      category: 'actions',
      categoryLabel: 'Quick Action',
      icon: BarChart3,
      iconColor: '#06b6d4',
      iconBg: 'rgba(6, 182, 212, 0.14)',
      badge: 'Export',
      keywords: ['export excel', 'download reports', 'spreadsheets', 'marksheet'],
      action: () => navigate('/reports'),
    });

    items.push({
      id: 'act-logout',
      title: 'Sign Out / Log Out',
      subtitle: `Currently logged in as ${user?.displayName || 'User'}`,
      category: 'actions',
      categoryLabel: 'Account',
      icon: LogOut,
      iconColor: '#ef4444',
      iconBg: 'rgba(239, 68, 68, 0.14)',
      badge: 'Logout',
      keywords: ['sign out', 'logout', 'exit', 'switch account'],
      action: () => logout(),
    });

    return items;
  }, [courses, assessments, users, cohorts, preference, user]);

  // Filter items strictly when user types; NO suggestions when input is empty
  const filteredItems = useMemo<SearchItem[]>(() => {
    const q = query.trim().toLowerCase();

    // Do NOT show suggestions until the user starts typing!
    if (!q) {
      return [];
    }

    const matches = allSearchItems.filter((item) => {
      // Category tab filter
      if (activeCategory !== 'all' && item.category !== activeCategory) {
        return false;
      }

      // Match title, subtitle, category label, or keyword array
      const titleMatch = item.title.toLowerCase().includes(q);
      const subMatch = item.subtitle.toLowerCase().includes(q);
      const catMatch = item.categoryLabel.toLowerCase().includes(q);
      const kwMatch = item.keywords?.some((k) => k.toLowerCase().includes(q)) ?? false;

      return titleMatch || subMatch || catMatch || kwMatch;
    });

    // Rank prefix matches first so as user types letters, the exact starting suggestions appear first
    return matches.sort((a, b) => {
      const aStarts = a.title.toLowerCase().startsWith(q) ? 1 : 0;
      const bStarts = b.title.toLowerCase().startsWith(q) ? 1 : 0;
      if (aStarts !== bStarts) return bStarts - aStarts;

      const aTitleInc = a.title.toLowerCase().includes(q) ? 1 : 0;
      const bTitleInc = b.title.toLowerCase().includes(q) ? 1 : 0;
      if (aTitleInc !== bTitleInc) return bTitleInc - aTitleInc;

      return 0;
    });
  }, [allSearchItems, query, activeCategory]);

  // Reset selected index when query or tab changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, activeCategory]);

  // Keyboard navigation handler (ArrowUp, ArrowDown, Enter, Escape)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }

    if (filteredItems.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const current = filteredItems[selectedIndex];
      if (current) {
        handleSelect(current.action);
      }
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const activeEl = listRef.current.querySelector<HTMLElement>('.global-search-row.selected');
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedIndex]);

  // Real-time category counts for current typed query
  const categoryCounts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return { all: 0, pages: 0, courses: 0, assessments: 0, people: 0, cohorts: 0, actions: 0 };
    }

    const matches = allSearchItems.filter((item) => {
      const titleMatch = item.title.toLowerCase().includes(q);
      const subMatch = item.subtitle.toLowerCase().includes(q);
      const catMatch = item.categoryLabel.toLowerCase().includes(q);
      const kwMatch = item.keywords?.some((k) => k.toLowerCase().includes(q)) ?? false;
      return titleMatch || subMatch || catMatch || kwMatch;
    });

    return {
      all: matches.length,
      pages: matches.filter((i) => i.category === 'pages').length,
      courses: matches.filter((i) => i.category === 'courses').length,
      assessments: matches.filter((i) => i.category === 'assessments').length,
      people: matches.filter((i) => i.category === 'people').length,
      cohorts: matches.filter((i) => i.category === 'cohorts').length,
      actions: matches.filter((i) => i.category === 'actions').length,
    };
  }, [allSearchItems, query]);

  if (!isOpen) return null;

  const hasTyped = query.trim().length > 0;

  return (
    <div className="global-search-backdrop" onClick={onClose}>
      <div
        className="global-search-container"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Header */}
        <div className={`global-search-header ${!hasTyped ? 'border-none' : ''}`}>
          <Search size={22} color="var(--primary)" style={{ flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            className="global-search-input"
            placeholder="Search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            spellCheck={false}
          />
          {hasTyped ? (
            <button
              onClick={() => setQuery('')}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '4px',
              }}
              title="Clear search"
            >
              <X size={17} />
            </button>
          ) : (
            <span className="global-search-badge" title="Press Escape to exit">
              ESC
            </span>
          )}
        </div>

        {/* Filter Category Tabs (Visible when typing to filter results) */}
        {hasTyped && (
          <div className="global-search-tabs">
            {[
              { id: 'all' as SearchCategory, label: 'All', count: categoryCounts.all },
              { id: 'pages' as SearchCategory, label: 'Pages', count: categoryCounts.pages },
              { id: 'courses' as SearchCategory, label: 'Courses', count: categoryCounts.courses },
              { id: 'assessments' as SearchCategory, label: 'Assessments', count: categoryCounts.assessments },
              { id: 'people' as SearchCategory, label: 'People', count: categoryCounts.people },
              { id: 'cohorts' as SearchCategory, label: 'Cohorts', count: categoryCounts.cohorts },
              { id: 'actions' as SearchCategory, label: 'Actions', count: categoryCounts.actions },
            ].map((tab) => {
              const isActive = activeCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  className={`global-search-tab ${isActive ? 'active' : ''}`}
                  onClick={() => setActiveCategory(tab.id)}
                >
                  {tab.label} {tab.count > 0 && <span style={{ opacity: 0.75, fontSize: '0.68rem', marginLeft: '3px' }}>{tab.count}</span>}
                </button>
              );
            })}
          </div>
        )}

        {/* Search Results List (Appears as user types letters) */}
        {hasTyped && (
          <div ref={listRef} className="global-search-body">
            {filteredItems.length === 0 ? (
              /* No Results Found for typed query */
              <div
                style={{
                  textAlign: 'center',
                  padding: '40px 20px',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    background: 'var(--bg-surface)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <HelpCircle size={22} color="var(--text-muted)" />
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.92rem' }}>
                    No matches found for "{query}"
                  </div>
                  <div style={{ fontSize: '0.78rem', marginTop: '4px' }}>
                    Try typing different letters or switch tabs to broaden your search.
                  </div>
                </div>
              </div>
            ) : (
              /* Matching Suggestions List with Typed Letters Highlighted */
              <div>
                <div className="global-search-section-title">
                  <span>Matching Results ({filteredItems.length})</span>
                </div>

                {filteredItems.slice(0, 35).map((item, index) => {
                  const IconComp = item.icon;
                  const isSelected = index === selectedIndex;

                  return (
                    <div
                      key={item.id}
                      className={`global-search-row ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleSelect(item.action)}
                      onMouseEnter={() => setSelectedIndex(index)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                        {/* Icon Badge */}
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            backgroundColor: item.iconBg,
                            border: `1px solid ${item.iconColor}25`,
                          }}
                        >
                          <IconComp size={18} color={item.iconColor} />
                        </div>

                        {/* Title & Subtitle with Highlighted Letters */}
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span
                              style={{
                                fontWeight: isSelected ? 700 : 600,
                                fontSize: '0.88rem',
                                color: isSelected ? 'var(--primary)' : 'var(--text-main)',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              <HighlightLetters text={item.title} query={query} isSelected={isSelected} />
                            </span>
                            {item.badge && (
                              <span
                                style={{
                                  fontSize: '0.64rem',
                                  fontWeight: 700,
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  backgroundColor: isSelected ? 'var(--primary-light)' : 'var(--bg-surface)',
                                  color: isSelected ? 'var(--primary)' : 'var(--text-muted)',
                                  border: '1px solid var(--border-subtle)',
                                  flexShrink: 0,
                                }}
                              >
                                {item.badge}
                              </span>
                            )}
                          </div>
                          <div
                            style={{
                              fontSize: '0.74rem',
                              color: 'var(--text-muted)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              marginTop: '2px',
                            }}
                          >
                            <HighlightLetters text={item.subtitle} query={query} isSelected={isSelected} />
                          </div>
                        </div>
                      </div>

                      {/* Right Action Hint */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          marginLeft: '12px',
                          flexShrink: 0,
                          opacity: isSelected ? 1 : 0.35,
                          transition: 'opacity 0.15s ease',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '0.70rem',
                            fontWeight: 600,
                            color: isSelected ? 'var(--primary)' : 'var(--text-muted)',
                          }}
                        >
                          Select
                        </span>
                        <CornerDownLeft size={13} color={isSelected ? 'var(--primary)' : 'var(--text-muted)'} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default GlobalSearchModal;
