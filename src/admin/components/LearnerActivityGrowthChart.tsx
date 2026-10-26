import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Users,
  Activity,
  Calendar,
  Sparkles,
  Info,
  ChevronRight,
  CalendarRange,
} from 'lucide-react';
import { useDashboardFilters, DashboardDateRange, MonthlyGrowthPoint } from '../context/DashboardFilterContext';
import { mockDepartments, mockCourses } from '../../data/mockData';

export const LearnerActivityGrowthChart: React.FC = () => {
  const {
    monthlyGrowthData,
    periodLabel,
    kpiSummary,
  } = useDashboardFilters();

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // SVG Chart Dimensions
  const width = 600;
  const height = 210;
  const paddingLeft = 45;
  const paddingRight = 40;
  const paddingTop = 30;
  const paddingBottom = 40;
  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;
  const baselineY = height - paddingBottom;

  // Maximum value for scaling Y axis
  const maxActive = useMemo(() => {
    const maxVal = Math.max(...monthlyGrowthData.map((d) => d.activeLearners), 0);
    if (maxVal === 0) return 100;
    // Round up to nearest nice interval
    if (maxVal <= 50) return 60;
    if (maxVal <= 150) return 200;
    if (maxVal <= 400) return 500;
    return Math.ceil(maxVal / 100) * 100;
  }, [monthlyGrowthData]);

  // Generate calibrated points
  const points = useMemo(() => {
    const total = monthlyGrowthData.length;
    if (total === 0) return [];

    return monthlyGrowthData.map((pt, i) => {
      const x = total === 1 ? width / 2 : paddingLeft + (i / (total - 1)) * chartWidth;
      const y = pt.activeLearners === 0 ? baselineY : baselineY - (pt.activeLearners / maxActive) * chartHeight;
      return { ...pt, x, y };
    });
  }, [monthlyGrowthData, maxActive, chartWidth, chartHeight, baselineY, paddingLeft, width]);

  // Smooth SVG Line & Area paths
  const linePath = useMemo(() => {
    if (points.length === 0) return '';
    return `M ${points.map((p) => `${p.x},${p.y}`).join(' L ')}`;
  }, [points]);

  const areaPath = useMemo(() => {
    if (points.length === 0) return '';
    return `M ${points[0].x},${baselineY} L ${points.map((p) => `${p.x},${p.y}`).join(' L ')} L ${points[points.length - 1].x},${baselineY} Z`;
  }, [points, baselineY]);

  // Y-axis grid line increments
  const yTicks = useMemo(() => {
    const step = maxActive / 4;
    return [
      { val: maxActive, y: baselineY - chartHeight },
      { val: Math.round(step * 3), y: baselineY - chartHeight * 0.75 },
      { val: Math.round(step * 2), y: baselineY - chartHeight * 0.5 },
      { val: Math.round(step * 1), y: baselineY - chartHeight * 0.25 },
      { val: 0, y: baselineY },
    ];
  }, [maxActive, baselineY, chartHeight]);

  const hoveredPoint = hoveredIndex !== null ? points[hoveredIndex] : null;
  const isZeroData = kpiSummary.activeLearners === 0;

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* 1. Header */}
      <div className="dashboard-card-header" style={{ marginBottom: '12px' }}>
        <div>
          <h3 style={{ fontSize: '1.15rem', margin: 0, fontWeight: 700, color: 'var(--text-main)' }}>
            Learner Activity & Growth
          </h3>
        </div>
        <span className="text-muted text-xs">
          {periodLabel}
        </span>
      </div>

      {/* 2. Metric Summary Chips */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>
        <div className="chart-stat-chip">
          <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '0.85rem' }}>
            {kpiSummary.activeLearners.toLocaleString()}
          </span>
          <span>Active Learners</span>
        </div>
        <div className="chart-stat-chip">
          <TrendingUp size={13} color={isZeroData ? 'var(--text-muted)' : 'var(--success)'} />
          <span style={{ fontWeight: 700, color: isZeroData ? 'var(--text-muted)' : 'var(--success)' }}>
            {kpiSummary.velocityPct}
          </span>
          <span>Growth Velocity</span>
        </div>
        <div className="chart-stat-chip">
          <Sparkles size={13} color="var(--accent-purple, #8b5cf6)" />
          <span style={{ fontWeight: 700 }}>{kpiSummary.retentionRate}</span>
          <span>Retention</span>
        </div>
      </div>

      {/* 3. SVG Chart Area */}
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
              No Activity in Selected Scope
            </div>
            <p className="text-secondary text-xs" style={{ margin: 0, maxWidth: '420px' }}>
              Zero active learners were recorded during the selected period.
            </p>
          </div>
        ) : (
          <svg
            viewBox={`0 0 ${width} ${height}`}
            style={{ width: '100%', height: '100%', overflow: 'visible' }}
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="learnerGrowthGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.32" />
                <stop offset="65%" stopColor="var(--primary)" stopOpacity="0.08" />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Horizontal Gridlines & Y-Axis Labels */}
            {yTicks.map((tick, i) => (
              <g key={i}>
                <line
                  x1={paddingLeft}
                  y1={tick.y}
                  x2={width - paddingRight}
                  y2={tick.y}
                  stroke="var(--border-subtle)"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text
                  x={paddingLeft - 8}
                  y={tick.y + 3}
                  fill="var(--text-muted)"
                  fontSize="9"
                  textAnchor="end"
                  fontFamily="inherit"
                >
                  {tick.val}
                </text>
              </g>
            ))}

            {/* Area Fill */}
            <path d={areaPath} fill="url(#learnerGrowthGrad)" />

            {/* Line Stroke */}
            <path
              d={linePath}
              fill="none"
              stroke="var(--primary)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Data Points and X-Axis Month Labels */}
            {points.map((pt, i) => {
              const isHovered = hoveredIndex === i;

              return (
                <g
                  key={i}
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Subtle vertical indicator bar when hovered */}
                  {isHovered && (
                    <line
                      x1={pt.x}
                      y1={paddingTop}
                      x2={pt.x}
                      y2={baselineY}
                      stroke="var(--primary)"
                      strokeWidth="1"
                      strokeDasharray="3 3"
                      strokeOpacity="0.6"
                    />
                  )}

                  {/* Outer glow ring on hover */}
                  {isHovered && (
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="9"
                      fill="var(--primary)"
                      fillOpacity="0.25"
                    />
                  )}

                  {/* Data dot */}
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isHovered ? 5.5 : 4}
                    fill="var(--bg-card)"
                    stroke="var(--primary)"
                    strokeWidth={isHovered ? 3 : 2}
                  />

                    {/* X-axis month label */}
                  <text
                    x={pt.x}
                    y={baselineY + 16}
                    fill={isHovered ? 'var(--primary)' : 'var(--text-muted)'}
                    fontSize={points.length > 8 ? '9' : '10'}
                    fontWeight={isHovered ? 700 : 500}
                    textAnchor="middle"
                    fontFamily="inherit"
                  >
                    {pt.monthShort}
                  </text>
                </g>
              );
            })}
          </svg>
        )}

        {/* Hover Tooltip Overlay */}
        {hoveredPoint && !isZeroData && (
          <div
            style={{
              position: 'absolute',
              left: `${(hoveredPoint.x / width) * 100}%`,
              top: `${(hoveredPoint.y / height) * 100}%`,
              transform: 'translate(-50%, -125%)',
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
            <div style={{ fontWeight: 800, color: 'var(--primary)', marginBottom: '3px' }}>
              {hoveredPoint.periodName}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
              <span>Active Learners:</span>
              <strong style={{ color: 'var(--text-main)' }}>{hoveredPoint.activeLearners.toLocaleString()}</strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', color: 'var(--text-muted)', fontSize: '0.7rem' }}>
              <span>New Enrollments:</span>
              <strong>+{hoveredPoint.newEnrollments}</strong>
            </div>
            {hoveredPoint.growthRatePct !== 0 && (
              <div
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  marginTop: '3px',
                  color: hoveredPoint.growthRatePct > 0 ? 'var(--success)' : 'var(--danger)',
                }}
              >
                {hoveredPoint.growthRatePct > 0 ? `▲ +${hoveredPoint.growthRatePct}%` : `▼ ${hoveredPoint.growthRatePct}%`} vs prior period
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. Footer Legend */}
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
          Period: <strong style={{ color: 'var(--text-main)' }}>{monthlyGrowthData.length} recorded months</strong>
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--primary)', display: 'inline-block' }} />
          <span>Active Learners</span>
        </div>
      </div>
    </div>
  );
};
