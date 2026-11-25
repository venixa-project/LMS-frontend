import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, GraduationCap, BookOpen, Activity, UserCheck, Award } from 'lucide-react';
import { useDashboardFilters } from '../context/DashboardFilterContext';

interface Props {
  studentCount?: number;
  facultyCount?: number;
  activeLearnersCount?: number;
}

const AnimatedCounter: React.FC<{ value: number | string; suffix?: string }> = ({ value, suffix = '' }) => {
  const numericTarget = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.]/g, '')) || 0;
  const hasDecimal = typeof value === 'string' && String(value).includes('.');
  const [displayVal, setDisplayVal] = useState(0);
  const prevTargetRef = useRef(0);

  useEffect(() => {
    const startVal = prevTargetRef.current;
    prevTargetRef.current = numericTarget;
    const duration = 750;
    let startTime: number | null = null;
    let rafId = 0;

    const step = (timestamp: number) => {
      if (startTime === null) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startVal + (numericTarget - startVal) * eased;
      setDisplayVal(current);
      if (progress < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        setDisplayVal(numericTarget);
      }
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [numericTarget]);

  const formatted = hasDecimal ? displayVal.toFixed(1) : Math.round(displayVal).toLocaleString();
  return (
    <>
      {formatted}
      {suffix}
    </>
  );
};

export const InstitutionKPIGrid: React.FC<Props> = ({
  studentCount,
  facultyCount,
  activeLearnersCount,
}) => {
  const { kpiSummary, availableCourses } = useDashboardFilters();

  const students = studentCount ?? kpiSummary.totalStudents;
  const enrolledStudents = kpiSummary.totalEnrolledStudents;
  const faculty = facultyCount ?? kpiSummary.totalFaculty;
  const activeLearners = activeLearnersCount ?? kpiSummary.activeLearners;
  const coursesCount = availableCourses.filter((c) => c.status === 'published' || c.status === 'in_review').length;
  const retentionRaw = kpiSummary.retentionRate || '96.4%';

  const cards = [
    {
      key: 'students',
      to: '/students',
      label: 'Total Students',
      value: students,
      suffix: '',
      subtitle: 'Active accounts',
      color: '#2563EB',
      bgTint: 'linear-gradient(145deg, rgba(37, 99, 235, 0.08) 0%, var(--bg-card) 65%)',
      iconBg: 'rgba(37, 99, 235, 0.14)',
      borderColor: 'rgba(37, 99, 235, 0.28)',
      icon: Users,
    },
    {
      key: 'enrolled',
      to: '/enrollments',
      label: 'Enrolled Students',
      value: enrolledStudents,
      suffix: '',
      subtitle: 'Course enrollments',
      color: '#10B981',
      bgTint: 'linear-gradient(145deg, rgba(16, 185, 129, 0.08) 0%, var(--bg-card) 65%)',
      iconBg: 'rgba(16, 185, 129, 0.14)',
      borderColor: 'rgba(16, 185, 129, 0.28)',
      icon: GraduationCap,
    },
    {
      key: 'faculty',
      to: '/faculty',
      label: 'Total Faculty',
      value: faculty,
      suffix: '',
      subtitle: 'Certified instructors',
      color: '#EC4899',
      bgTint: 'linear-gradient(145deg, rgba(236, 72, 153, 0.08) 0%, var(--bg-card) 65%)',
      iconBg: 'rgba(236, 72, 153, 0.14)',
      borderColor: 'rgba(236, 72, 153, 0.28)',
      icon: UserCheck,
    },
    {
      key: 'courses',
      to: '/courses',
      label: 'Active Courses',
      value: coursesCount,
      suffix: '',
      subtitle: 'Published curriculum',
      color: '#5447FF',
      bgTint: 'linear-gradient(145deg, rgba(84, 71, 255, 0.08) 0%, var(--bg-card) 65%)',
      iconBg: 'rgba(84, 71, 255, 0.14)',
      borderColor: 'rgba(84, 71, 255, 0.28)',
      icon: BookOpen,
    },
    {
      key: 'velocity',
      to: '/students',
      label: 'Learning Velocity',
      value: activeLearners,
      suffix: '',
      subtitle: 'Active in 30 days',
      color: '#F59E0B',
      bgTint: 'linear-gradient(145deg, rgba(245, 158, 11, 0.09) 0%, var(--bg-card) 65%)',
      iconBg: 'rgba(245, 158, 11, 0.15)',
      borderColor: 'rgba(245, 158, 11, 0.3)',
      icon: Activity,
    },
    {
      key: 'retention',
      to: null,
      label: 'Retention Rate',
      value: retentionRaw,
      suffix: '%',
      subtitle: 'Term benchmark',
      color: '#8B5CF6',
      bgTint: 'linear-gradient(145deg, rgba(139, 92, 246, 0.09) 0%, var(--bg-card) 65%)',
      iconBg: 'rgba(139, 92, 246, 0.15)',
      borderColor: 'rgba(139, 92, 246, 0.3)',
      icon: Award,
    },
  ];

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
      {cards.map((c, idx) => {
        const Icon = c.icon;
        const style: React.CSSProperties = {
          background: c.bgTint,
          border: `1px solid ${c.borderColor}`,
          borderTop: `3px solid ${c.color}`,
          borderRadius: '16px',
          padding: '16px 18px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '10px',
          boxShadow: `0 6px 20px -4px ${c.iconBg}`,
          textDecoration: 'none',
          transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease',
          cursor: c.to ? 'pointer' : 'default',
          animationDelay: `${idx * 65}ms`,
        };

        const inner = (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  letterSpacing: '0.06em',
                  color: 'var(--text-secondary)',
                  textTransform: 'uppercase',
                }}
              >
                {c.label}
              </span>
              <span
                className="kpi-icon-badge"
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '10px',
                  background: c.iconBg,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: `0 2px 8px ${c.iconBg}`,
                }}
              >
                <Icon size={15} color={c.color} />
              </span>
            </div>
            <div
              style={{
                fontSize: '1.9rem',
                fontWeight: 800,
                color: c.color,
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              <AnimatedCounter value={c.value} suffix={c.suffix} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: c.color,
                  boxShadow: `0 0 6px ${c.color}`,
                  flexShrink: 0,
                }}
              />
              <span>{c.subtitle}</span>
            </div>
          </>
        );

        return c.to ? (
          <Link key={c.key} to={c.to} style={style} className="stat-card-link kpi-card-animated">
            {inner}
          </Link>
        ) : (
          <div key={c.key} style={style} className="kpi-card-animated">
            {inner}
          </div>
        );
      })}
    </div>
  );
};
