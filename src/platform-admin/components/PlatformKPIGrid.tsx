import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, Users, GraduationCap, BookOpen, TrendingUp } from 'lucide-react';
import { useCourseStore } from '../../lib/courseStore';
import { AnimatedCounter } from '../../components/AnimatedCounter';

interface Props {
  facultyCount?: number;
}

export const PlatformKPIGrid: React.FC<Props> = ({ facultyCount = 0 }) => {
  const { courses } = useCourseStore();
  return (
    <div className="dashboard-kpi-grid">
      <Link to="/organizations" className="stat-card stat-card-link">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <span className="text-muted text-xs font-semibold stat-card-title">Total Institutions</span>
          <span className="text-success text-xs" style={{ display: 'flex', alignItems: 'center', gap: '2px', fontWeight: 700 }}>
            <TrendingUp size={14} /> +1 org
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '1.85rem', fontWeight: 800, color: '#2563EB', letterSpacing: '-0.02em' }}>
            <AnimatedCounter value={1} />
          </span>
          <Building2 size={22} color="#2563EB" />
        </div>
        <p className="text-muted text-xs">Active multi-tenant organizations</p>
      </Link>

      <Link to="/people" className="stat-card stat-card-link">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <span className="text-muted text-xs font-semibold stat-card-title">Active Learners</span>
          <span className="text-success text-xs" style={{ display: 'flex', alignItems: 'center', gap: '2px', fontWeight: 700 }}>
            <TrendingUp size={14} /> +12.5%
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '1.85rem', fontWeight: 800, color: '#10B981', letterSpacing: '-0.02em' }}>
            <AnimatedCounter value={0} />
          </span>
          <Users size={22} color="#10B981" />
        </div>
        <p className="text-muted text-xs">Registered learners across all institutions</p>
      </Link>

      <Link to="/faculty" className="stat-card stat-card-link">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <span className="text-muted text-xs font-semibold stat-card-title">Active Faculty</span>
          <span className="text-success text-xs" style={{ display: 'flex', alignItems: 'center', gap: '2px', fontWeight: 700 }}>
            <TrendingUp size={14} /> +2 new
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '1.85rem', fontWeight: 800, color: '#EC4899', letterSpacing: '-0.02em' }}>
            <AnimatedCounter value={facultyCount} />
          </span>
          <GraduationCap size={22} color="#EC4899" />
        </div>
        <p className="text-muted text-xs">Certified instructors & trainers</p>
      </Link>

      <Link to="/courses" className="stat-card stat-card-link">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <span className="text-muted text-xs font-semibold stat-card-title">Active Courses</span>
          <span className="text-success text-xs" style={{ display: 'flex', alignItems: 'center', gap: '2px', fontWeight: 700 }}>
            <TrendingUp size={14} /> +4 active
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '1.85rem', fontWeight: 800, color: '#5447FF', letterSpacing: '-0.02em' }}>
            <AnimatedCounter value={courses.filter(c => c.status === 'published').length} />
          </span>
          <BookOpen size={22} color="#5447FF" />
        </div>
        <p className="text-muted text-xs">Curriculum courses in catalog</p>
      </Link>
    </div>
  );
};
