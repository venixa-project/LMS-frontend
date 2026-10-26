import React from 'react';
import { Link } from 'react-router-dom';
import { Users, GraduationCap, BookOpen, Activity, TrendingUp, UserCheck } from 'lucide-react';
import { useDashboardFilters } from '../context/DashboardFilterContext';

interface Props {
  studentCount?: number;
  facultyCount?: number;
  activeLearnersCount?: number;
}

export const InstitutionKPIGrid: React.FC<Props> = ({
  studentCount,
  facultyCount,
  activeLearnersCount,
}) => {
  const { kpiSummary, isFiltered, availableCourses } = useDashboardFilters();

  const students = studentCount ?? kpiSummary.totalStudents;
  const enrolledStudents = kpiSummary.totalEnrolledStudents;
  const faculty = facultyCount ?? kpiSummary.totalFaculty;
  const activeLearners = activeLearnersCount ?? kpiSummary.activeLearners;
  const coursesCount = availableCourses.filter((c) => c.status === 'published' || c.status === 'in_review').length;

  return (
    <div
      className="dashboard-kpi-grid"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        width: '100%',
      }}
    >
      {/* 1. Total Students */}
      <Link to="/students" className="stat-card stat-card-link">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <span className="text-muted text-xs font-semibold stat-card-title">Total Students</span>
          <span className="text-success text-xs" style={{ display: 'flex', alignItems: 'center', gap: '2px', fontWeight: 700 }}>
            <TrendingUp size={13} /> {isFiltered ? 'Filtered' : '+12 new'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            {students.toLocaleString()}
          </span>
          <Users size={22} color="var(--primary)" />
        </div>
        <p className="text-muted text-xs" style={{ margin: 0 }}>
          Unique student accounts
        </p>
      </Link>

      {/* 2. Total Enrolled Students (New Required KPI) */}
      <Link to="/enrollments" className="stat-card stat-card-link">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <span className="text-muted text-xs font-semibold stat-card-title">Total Enrolled Students</span>
          <span className="text-muted text-xs font-medium">
            Enrollments
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            {enrolledStudents.toLocaleString()}
          </span>
          <GraduationCap size={22} color="var(--accent-purple, #8b5cf6)" />
        </div>
        <p className="text-muted text-xs" style={{ margin: 0 }}>
          Across selected courses
        </p>
      </Link>

      {/* 3. Total Faculty */}
      <Link to="/faculty" className="stat-card stat-card-link">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <span className="text-muted text-xs font-semibold stat-card-title">Total Faculty</span>
          <span className="text-muted text-xs font-medium">
            Instructors
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            {faculty}
          </span>
          <UserCheck size={22} color="var(--accent-cyan, #06b6d4)" />
        </div>
        <p className="text-muted text-xs" style={{ margin: 0 }}>
          Certified instructors & trainers
        </p>
      </Link>

      {/* 4. Active Courses */}
      <Link to="/courses" className="stat-card stat-card-link">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <span className="text-muted text-xs font-semibold stat-card-title">Active Courses</span>
          <span className="text-muted text-xs font-medium">
            Curriculum
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            {coursesCount}
          </span>
          <BookOpen size={22} color="var(--accent-cyan, #0284c7)" />
        </div>
        <p className="text-muted text-xs" style={{ margin: 0 }}>
          Published curriculum courses
        </p>
      </Link>

      {/* 5. Active Learners */}
      <Link to="/students" className="stat-card stat-card-link">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <span className="text-muted text-xs font-semibold stat-card-title">Active Learners</span>
          <span className="text-success text-xs" style={{ display: 'flex', alignItems: 'center', gap: '2px', fontWeight: 700 }}>
            <TrendingUp size={13} /> {kpiSummary.velocityPct}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            {activeLearners.toLocaleString()}
          </span>
          <Activity size={22} color="var(--primary)" />
        </div>
        <p className="text-muted text-xs" style={{ margin: 0 }}>
          Active in selected period
        </p>
      </Link>
    </div>
  );
};
