import React from 'react';
import { useAuthStore } from '../../lib/store';
import { DashboardFilterProvider } from '../context/DashboardFilterContext';
import { GlobalDashboardFilters } from '../components/GlobalDashboardFilters';
import { InstitutionKPIGrid } from '../components/InstitutionKPIGrid';
import { LearnerActivityGrowthChart } from '../components/LearnerActivityGrowthChart';
import { CourseEnrollmentStatsChart } from '../components/CourseEnrollmentStatsChart';
import { GamificationLeaderboard } from '../components/GamificationLeaderboard';
import { TopPerformingCourses } from '../components/TopPerformingCourses';
import { CourseCategoriesCard } from '../components/CourseCategoriesCard';
import { PlatformOverviewCard } from '../components/PlatformOverviewCard';
import { InstitutionActivitiesFeed } from '../components/InstitutionActivitiesFeed';
import { Building2, Calendar, ShieldCheck } from 'lucide-react';

export const InstitutionDashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const adminName = user?.displayName || (user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Marcus Johnson');

  return (
    <DashboardFilterProvider>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '26px' }}>
        {/* 1. Top Dashboard Header & Compact Filters */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            paddingBottom: '2px'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
              <span className="badge badge-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Building2 size={12} /> Institution Analytics
              </span>
            </div>

            <h1
              style={{
                fontSize: '1.75rem',
                fontWeight: 800,
                margin: 0,
                letterSpacing: '-0.02em',
                color: 'var(--text-main)'
              }}
            >
              Welcome back, {adminName}
            </h1>
          </div>

          {/* Compact Dashboard Filters Control in Header */}
          <GlobalDashboardFilters />
        </div>

        {/* 2. Primary KPI Cards */}
        <InstitutionKPIGrid />

        {/* 4. Analytics & Growth Velocity */}
        <div className="dashboard-2col-grid">
          <LearnerActivityGrowthChart />
          <CourseEnrollmentStatsChart />
        </div>

        {/* 5. Gamification & Leaderboard Section */}
        <GamificationLeaderboard />

        {/* 6. Visual Focus: Top Performing Courses (with 16:9 thumbnails) & Course Categories */}
        <div className="dashboard-split-grid">
          <TopPerformingCourses />
          <CourseCategoriesCard />
        </div>

        {/* 7. Visual Focus: Platform Overview (with Donut chart) & Recent Activities (Vertical Timeline) */}
        <div className="dashboard-split-grid">
          <PlatformOverviewCard />
          <InstitutionActivitiesFeed />
        </div>
      </div>
    </DashboardFilterProvider>
  );
};
