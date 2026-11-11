import React from 'react';
import { Link } from 'react-router-dom';
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
import { Building2, Calendar, ShieldCheck, Sparkles, BookOpen } from 'lucide-react';

export const InstitutionDashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const adminName = user?.displayName || (user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Marcus Johnson');

  return (
    <DashboardFilterProvider>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
        {/* 1. Signature Hero Banner (as in the screenshot) */}
        <div
          style={{
            background: 'linear-gradient(90deg, #F232A9 0%, #EC4899 22%, #818CF8 65%, #2563EB 100%)',
            borderRadius: '16px',
            padding: '26px 30px',
            color: '#FFFFFF',
            boxShadow: '0 10px 30px -5px rgba(236, 72, 153, 0.32), 0 6px 16px -4px rgba(37, 99, 235, 0.28)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Subtle radial glow background overlay */}
          <div
            style={{
              position: 'absolute',
              top: '-40px',
              right: '-40px',
              width: '200px',
              height: '200px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,255,255,0.22) 0%, transparent 70%)',
              pointerEvents: 'none'
            }}
          />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <h1
              style={{
                fontSize: '2rem',
                fontWeight: 800,
                margin: '0 0 6px 0',
                letterSpacing: '-0.02em',
                color: '#FFFFFF'
              }}
            >
              Dashboard
            </h1>
            <p
              style={{
                margin: 0,
                fontSize: '0.88rem',
                color: 'rgba(255, 255, 255, 0.94)',
                fontWeight: 500
              }}
            >
              Real-time learning analytics, course enrollments, and academic performance overview
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
            <Link
              to="/assessments"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 18px',
                borderRadius: '9999px',
                background: 'rgba(255, 255, 255, 0.18)',
                border: '1px solid rgba(255, 255, 255, 0.45)',
                color: '#FFFFFF',
                fontSize: '0.84rem',
                fontWeight: 600,
                textDecoration: 'none',
                backdropFilter: 'blur(8px)',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.18)';
              }}
            >
              + New Assessment
            </Link>

            <Link
              to="/courses"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 18px',
                borderRadius: '9999px',
                background: '#FFFFFF',
                color: '#1D4ED8',
                fontSize: '0.84rem',
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 6px 18px rgba(0, 0, 0, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = '0 4px 14px rgba(0, 0, 0, 0.15)';
              }}
            >
              <BookOpen size={14} color="#1D4ED8" /> Course Catalog
            </Link>
          </div>
        </div>

        {/* 2. Top Dashboard Header & Compact Filters */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            paddingBottom: '2px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="badge badge-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Building2 size={12} /> Institution Analytics
            </span>
            <span className="text-muted text-xs font-medium">Logged in as {adminName}</span>
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
