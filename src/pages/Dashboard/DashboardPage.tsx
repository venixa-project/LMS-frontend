import React from 'react';
import { useAuthStore } from '../../lib/store';
import { PlatformDashboardPage } from '../../platform-admin/pages/PlatformDashboardPage';
import { InstitutionDashboardPage } from '../../admin/pages/InstitutionDashboardPage';
import { TrainerDashboardPage } from './TrainerDashboardPage';
import { StudentDashboard } from './StudentDashboard';

export const DashboardPage: React.FC = () => {
  const { user, isLoading } = useAuthStore();

  if (isLoading || !user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="pulse-indicator" style={{ width: '14px', height: '14px', margin: '0 auto 12px' }} />
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Loading dashboard...</div>
        </div>
      </div>
    );
  }

  const rawRole = user.activeRole;
  const role = (rawRole === 'trainer' || rawRole === 'instructor' || rawRole === 'assessment_author' || rawRole === 'grader')
    ? 'trainer'
    : (rawRole === 'student' || rawRole === 'learner' || rawRole === 'guest')
      ? 'student'
      : (rawRole === 'org_admin' || rawRole === 'lms_admin')
        ? 'org_admin'
        : rawRole === 'platform_admin'
          ? 'platform_admin'
          : 'org_admin';

  // 1. STUDENT DASHBOARD VIEW
  if (role === 'student') {
    return <StudentDashboard />;
  }

  // 2. TRAINER / FACULTY DASHBOARD VIEW
  if (role === 'trainer') {
    return <TrainerDashboardPage />;
  }

  // 3. PLATFORM ADMINISTRATOR COMMAND CENTER
  if (role === 'platform_admin') {
    return <PlatformDashboardPage />;
  }

  // 4. REGULAR ADMIN / INSTITUTION ADMIN COMMAND CENTER
  return <InstitutionDashboardPage />;
};
