import { NavItem } from '../../lib/permissions';

export const platformAdminNav: NavItem[] = [
  // Platform Telemetry & Controller
  { id: 'dashboard', label: 'Platform Dashboard', icon: 'LayoutDashboard', path: '/dashboard', group: 'Platform Ops' },

  // Multi-Tenant Structure & Organizations
  { id: 'structure-tenants', label: 'Structure & Tenants', icon: 'Building2', path: '/organizations', group: 'Multi-Tenancy' },

  // Identity & Access Oversight
  { id: 'people', label: 'Global Directory', icon: 'Users', path: '/people', group: 'Identity & Access' },
  { id: 'roles', label: 'Roles & RBAC Matrix', icon: 'Shield', path: '/roles', group: 'Identity & Access' },

  // Academic Curriculum & Templates Oversight
  { id: 'courses', label: 'Curriculum Oversight', icon: 'BookOpen', path: '/courses', group: 'Curriculum & Programs' },
  { id: 'paths', label: 'Learning Paths', icon: 'Route', path: '/learning-paths', group: 'Curriculum & Programs' },
  { id: 'certificates', label: 'Certificate Templates', icon: 'Award', path: '/certificates', group: 'Curriculum & Programs' },

  // Platform Intelligence & Governance
  { id: 'reports', label: 'Platform Reports & Audit', icon: 'BarChart3', path: '/reports', group: 'System & Insights' },
  { id: 'integrations', label: 'Integrations & APIs', icon: 'Plug', path: '/integrations', group: 'System & Insights' },
  { id: 'notifications', label: 'Platform Announcements', icon: 'Bell', path: '/notifications', group: 'System & Insights' },
  { id: 'settings', label: 'Platform Settings', icon: 'Settings', path: '/settings', group: 'System & Insights' },
  { id: 'profile', label: 'Admin Profile', icon: 'User', path: '/profile', group: 'Account' },
];
