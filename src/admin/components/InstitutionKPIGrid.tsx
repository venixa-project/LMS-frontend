import React from 'react';
import { Link } from 'react-router-dom';
import { Users, GraduationCap, BookOpen, Activity, TrendingUp, UserCheck, Award } from 'lucide-react';
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

  const cardStyle: React.CSSProperties = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '16px',
    padding: '18px 20px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    gap: '12px',
    boxShadow: '0 4px 20px -2px rgba(84, 71, 255, 0.05)',
    textDecoration: 'none',
    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
    cursor: 'pointer',
  };

  return (
    <div
      className="dashboard-kpi-grid"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '16px',
        width: '100%',
      }}
    >
      {/* 1. Total Students */}
      <Link to="/students" style={cardStyle} className="stat-card-link">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', color: '#64748B', textTransform: 'uppercase' }}>
            Total Students
          </span>
          <Users size={16} color="#2563EB" />
        </div>
        <div style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
          {students.toLocaleString()}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: '#64748B' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#2563EB', flexShrink: 0 }} />
          <span>Active accounts</span>
        </div>
      </Link>

      {/* 2. Total Enrolled Students */}
      <Link to="/enrollments" style={cardStyle} className="stat-card-link">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', color: '#64748B', textTransform: 'uppercase' }}>
            Enrolled Students
          </span>
          <GraduationCap size={16} color="#10B981" />
        </div>
        <div style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
          {enrolledStudents.toLocaleString()}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: '#64748B' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981', flexShrink: 0 }} />
          <span>Course enrollments</span>
        </div>
      </Link>

      {/* 3. Total Faculty */}
      <Link to="/faculty" style={cardStyle} className="stat-card-link">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', color: '#64748B', textTransform: 'uppercase' }}>
            Total Faculty
          </span>
          <UserCheck size={16} color="#EC4899" />
        </div>
        <div style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
          {faculty}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: '#64748B' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#EC4899', flexShrink: 0 }} />
          <span>Certified instructors</span>
        </div>
      </Link>

      {/* 4. Active Courses */}
      <Link to="/courses" style={cardStyle} className="stat-card-link">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', color: '#64748B', textTransform: 'uppercase' }}>
            Active Courses
          </span>
          <BookOpen size={16} color="#5447FF" />
        </div>
        <div style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
          {coursesCount}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: '#64748B' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#5447FF', flexShrink: 0 }} />
          <span>Published curriculum</span>
        </div>
      </Link>

      {/* 5. Active Learners / Velocity */}
      <Link to="/students" style={cardStyle} className="stat-card-link">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', color: '#64748B', textTransform: 'uppercase' }}>
            Learning Velocity
          </span>
          <Activity size={16} color="#F59E0B" />
        </div>
        <div style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
          {activeLearners.toLocaleString()}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: '#64748B' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#F59E0B', flexShrink: 0 }} />
          <span>Active in 30 days</span>
        </div>
      </Link>

      {/* 6. Retention Rate */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', color: '#64748B', textTransform: 'uppercase' }}>
            Retention Rate
          </span>
          <Award size={16} color="#818CF8" />
        </div>
        <div style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
          {kpiSummary.retentionRate || '96.4%'}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: '#64748B' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#818CF8', flexShrink: 0 }} />
          <span>Term benchmark</span>
        </div>
      </div>
    </div>
  );
};
