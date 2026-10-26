import React, { useState, useMemo } from 'react';
import { BookOpen, CheckCircle2, TrendingUp, BarChart2, Calendar, Activity, Info } from 'lucide-react';
import { useDashboardFilters, DashboardDateRange, CourseStatBarItem } from '../context/DashboardFilterContext';
import { mockDepartments, mockCourses } from '../../data/mockData';

export const CourseEnrollmentStatsChart: React.FC = () => {
  const {
    enrollmentStatsData,
    dateRange,
    setDateRange,
    periodLabel,
    departmentId,
    courseId,
    kpiSummary,
  } = useDashboardFilters();

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const selectedDept = mockDepartments.find((d) => d.id === departmentId);
  const selectedCourse = mockCourses.find((c) => c.id === courseId);

  // Calculated aggregate metrics
  const totalEnrollments = enrollmentStatsData.reduce((acc, curr) => acc + curr.enrollments, 0);
  const totalCompletions = enrollmentStatsData.reduce((acc, curr) => acc + curr.completions, 0);
  const avgCompletionRate = totalEnrollments > 0 ? ((totalCompletions / totalEnrollments) * 100).toFixed(1) : '0';

  // SVG dimensions & dynamic responsive scaling
  const width = 560;
  const height = 210;
  const chartHeight = 135;
  const chartBottomY = 175;
  const leftMargin = 45;
  const rightMargin = 20;
  const usableWidth = width - leftMargin - rightMargin;
  const numItems = enrollmentStatsData.length;
  const colStep = usableWidth / Math.max(1, numItems);

  // Maximum value for scaling Y axis
  const maxDataVal = Math.max(...enrollmentStatsData.map((d) => Math.max(d.enrollments, d.completions)), 0);
  const yMax = maxDataVal === 0 ? 100 : Math.ceil((maxDataVal * 1.15) / 50) * 50;

  // Bar width adjusted based on density
  const barWidth = numItems > 8 ? 8 : numItems > 5 ? 14 : 20;
  const barSpacing = numItems > 8 ? 2 : 4;
  const totalBarGroupWidth = barWidth * 2 + barSpacing;

  const isZeroData = totalEnrollments === 0 && totalCompletions === 0;
  const hoveredItem = hoveredIndex !== null ? enrollmentStatsData[hoveredIndex] : null;

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header with Title and Legend */}
      <div className="dashboard-card-header" style={{ marginBottom: '12px' }}>
        <div>
          <h3 style={{ fontSize: '1.15rem', margin: 0, fontWeight: 700, color: 'var(--text-main)' }}>
            Course Enrollment Statistics
          </h3>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '0.75rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'var(--primary)' }} />
            <span className="text-muted">Enrollments</span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'var(--success)' }} />
            <span className="text-muted">Completions</span>
          </span>
        </div>
      </div>

      {/* Aggregate Metric Chips */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>
        <div className="chart-stat-chip">
          <BookOpen size={13} color="var(--primary)" />
          <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '0.85rem' }}>
            {totalEnrollments.toLocaleString()}
          </span>
          <span>Total Enrollments</span>
        </div>
        <div className="chart-stat-chip">
          <CheckCircle2 size={13} color="var(--success)" />
          <span style={{ fontWeight: 700, color: 'var(--success)' }}>
            {totalCompletions.toLocaleString()}
          </span>
          <span>Verified Completions</span>
        </div>
        <div className="chart-stat-chip">
          <TrendingUp size={13} color="var(--accent-cyan)" />
          <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>
            {avgCompletionRate}%
          </span>
          <span>Avg Completion Rate</span>
        </div>
      </div>

      {/* SVG Bar Chart Area */}
      <div style={{ position: 'relative', width: '100%', flex: 1, minHeight: '200px' }}>
        {isZeroData ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '190px',
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: 'var(--radius-md)',
              border: '1px dashed var(--border-subtle)',
              padding: '20px',
              textAlign: 'center',
            }}
          >
            <Activity size={32} color="var(--text-muted)" style={{ opacity: 0.5, marginBottom: '8px' }} />
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: '4px' }}>
              No Enrollment Data in Current Scope
            </div>
            <p className="text-secondary text-xs" style={{ margin: 0, maxWidth: '420px' }}>
              No enrollments or completions recorded for{' '}
              <strong>{selectedCourse ? selectedCourse.title : selectedDept?.name || 'the selected filter'}</strong>.
            </p>
          </div>
        ) : (
          <svg
            viewBox={`0 0 ${width} ${height}`}
            style={{ width: '100%', height: '100%', overflow: 'visible' }}
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="enrollBarGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity="1" />
                <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.85" />
              </linearGradient>
              <linearGradient id="completeBarGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--success)" stopOpacity="1" />
                <stop offset="100%" stopColor="#059669" stopOpacity="0.85" />
              </linearGradient>
            </defs>

            {/* Horizontal Gridlines & Y-Axis Scale */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
              const yPos = chartBottomY - chartHeight * pct;
              const val = Math.round(yMax * pct);
              return (
                <g key={i}>
                  <line
                    x1={leftMargin}
                    y1={yPos}
                    x2={width - rightMargin}
                    y2={yPos}
                    stroke="var(--border-subtle)"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />
                  <text
                    x={leftMargin - 8}
                    y={yPos + 3}
                    fill="var(--text-muted)"
                    fontSize="9"
                    textAnchor="end"
                    fontFamily="inherit"
                  >
                    {val}
                  </text>
                </g>
              );
            })}

            {/* Render Bar Groups */}
            {enrollmentStatsData.map((d, i) => {
              const isHovered = hoveredIndex === i;
              const colCenterX = leftMargin + i * colStep + colStep / 2;
              const groupLeft = colCenterX - totalBarGroupWidth / 2;

              // Enrollments bar
              const enrollHeight = (d.enrollments / yMax) * chartHeight;
              const enrollY = chartBottomY - enrollHeight;

              // Completions bar
              const compHeight = (d.completions / yMax) * chartHeight;
              const compY = chartBottomY - compHeight;

              return (
                <g
                  key={i}
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Subtle column hover background highlight */}
                  {isHovered && (
                    <rect
                      x={colCenterX - colStep / 2}
                      y={chartBottomY - chartHeight - 10}
                      width={colStep}
                      height={chartHeight + 15}
                      fill="var(--primary)"
                      fillOpacity="0.06"
                      rx="4"
                    />
                  )}

                  {/* 1. Enrollments Bar */}
                  <rect
                    x={groupLeft}
                    y={enrollY}
                    width={barWidth}
                    height={Math.max(2, enrollHeight)}
                    fill="url(#enrollBarGrad)"
                    rx="3"
                    style={{
                      transition: 'height 0.2s ease, y 0.2s ease',
                      filter: isHovered ? 'drop-shadow(0 0 4px var(--primary-glow))' : 'none',
                    }}
                  />

                  {/* 2. Completions Bar */}
                  <rect
                    x={groupLeft + barWidth + barSpacing}
                    y={compY}
                    width={barWidth}
                    height={Math.max(2, compHeight)}
                    fill="url(#completeBarGrad)"
                    rx="3"
                    style={{
                      transition: 'height 0.2s ease, y 0.2s ease',
                      filter: isHovered ? 'drop-shadow(0 0 4px rgba(16, 185, 129, 0.4))' : 'none',
                    }}
                  />

                  {/* X-axis Label */}
                  <text
                    x={colCenterX}
                    y={chartBottomY + 16}
                    fill={isHovered ? 'var(--primary)' : 'var(--text-muted)'}
                    fontSize={numItems > 8 ? '8.5' : '9.5'}
                    fontWeight={isHovered ? 700 : 500}
                    textAnchor="middle"
                    fontFamily="inherit"
                  >
                    {d.label}
                  </text>
                </g>
              );
            })}
          </svg>
        )}

        {/* Hover Tooltip Overlay */}
        {hoveredItem && !isZeroData && (
          <div
            style={{
              position: 'absolute',
              left: `${((leftMargin + hoveredIndex! * colStep + colStep / 2) / width) * 100}%`,
              top: '20px',
              transform: 'translateX(-50%)',
              background: 'var(--bg-card)',
              color: 'var(--text-main)',
              border: '1px solid var(--primary)',
              borderRadius: 'var(--radius-md)',
              padding: '8px 12px',
              fontSize: '0.75rem',
              boxShadow: 'var(--shadow-md)',
              pointerEvents: 'none',
              zIndex: 20,
              whiteSpace: 'nowrap',
            }}
          >
            <div style={{ fontWeight: 800, color: 'var(--text-main)', marginBottom: '3px' }}>
              {hoveredItem.periodName}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
              <span style={{ color: 'var(--primary)', fontWeight: 600 }}>Enrollments:</span>
              <strong>{hoveredItem.enrollments}</strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
              <span style={{ color: 'var(--success)', fontWeight: 600 }}>Completions:</span>
              <strong>{hoveredItem.completions}</strong>
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Completion Ratio:{' '}
              <strong>
                {hoveredItem.enrollments > 0
                  ? `${Math.round((hoveredItem.completions / hoveredItem.enrollments) * 100)}%`
                  : '0%'}
              </strong>
            </div>
          </div>
        )}
      </div>

      {/* Footer Insight */}
      <div
        style={{
          marginTop: '12px',
          paddingTop: '10px',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <span>
          &bull; Period Total:{' '}
          <strong style={{ color: 'var(--text-main)' }}>{totalEnrollments} Enrollments</strong> &bull;{' '}
          <strong style={{ color: 'var(--success)' }}>{totalCompletions} Completions</strong>
        </span>
        <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>
          Conversion: {avgCompletionRate}%
        </span>
      </div>
    </div>
  );
};
