import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { usePeopleStore } from '../../lib/peopleStore';

export const PlatformOverviewCard: React.FC = () => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Subscribe reactively to the actual institution people store
  const users = usePeopleStore((state) => state.users);

  // Filter out global platform administrators and other tenants' users
  const institutionUsers = users.filter((u) => {
    const isGlobalPlatformUser = u.activeRole === 'platform_admin';
    const isOtherTenant = u.organizationId && u.organizationId !== 'org-001';
    return !isGlobalPlatformUser && !isOtherTenant;
  });

  // Calculate actual institution category counts from existing data model
  const studentsCount = institutionUsers.filter(
    (u) => u.activeRole === 'student' || u.activeRole === 'learner'
  ).length;

  const facultyCount = institutionUsers.filter(
    (u) => u.activeRole === 'trainer' || u.activeRole === 'instructor'
  ).length;

  const adminStaffCount = institutionUsers.filter(
    (u) => u.activeRole === 'org_admin' || u.activeRole === 'lms_admin'
  ).length;

  const otherStaffCount = institutionUsers.filter(
    (u) =>
      u.activeRole !== 'student' &&
      u.activeRole !== 'learner' &&
      u.activeRole !== 'trainer' &&
      u.activeRole !== 'instructor' &&
      u.activeRole !== 'org_admin' &&
      u.activeRole !== 'lms_admin'
  ).length;

  const totalMembers = institutionUsers.length;

  // Percentage helper with 1 decimal formatting when needed
  const getPercentage = (count: number): number => {
    if (totalMembers === 0) return 0;
    const pct = (count / totalMembers) * 100;
    return Number.isInteger(pct) ? pct : parseFloat(pct.toFixed(1));
  };

  // Category definitions with consistent theme-friendly colors
  const rawCategories = [
    {
      id: 'students',
      name: 'Students',
      count: studentsCount,
      color: 'var(--primary)',
      description: 'Enrolled learners across cohorts'
    },
    {
      id: 'faculty',
      name: 'Faculty',
      count: facultyCount,
      color: 'var(--accent-purple)',
      description: 'Instructors & subject trainers'
    },
    {
      id: 'admin_staff',
      name: 'Administrative Staff',
      count: adminStaffCount,
      color: 'var(--accent-cyan)',
      description: 'Institution & department managers'
    },
    {
      id: 'other_staff',
      name: 'Other Staff',
      count: otherStaffCount,
      color: 'var(--warning)',
      description: 'Operations, exam & lab staff'
    }
  ];

  // Circumference & Donut geometry: r = 62, viewBox = 180 x 180
  const radius = 62;
  const circ = 2 * Math.PI * radius; // ~389.56
  const activeSegmentsCount = rawCategories.filter((c) => c.count > 0).length;
  const gap = activeSegmentsCount > 1 ? 2.5 : 0;

  // Compute stroke offsets for each category
  let accumulatedStroke = 0;
  const categories = rawCategories.map((cat) => {
    const ratio = totalMembers > 0 ? cat.count / totalMembers : 0;
    const strokeLen = ratio * circ;
    const currentOffset = accumulatedStroke;
    accumulatedStroke += strokeLen;

    const visibleDash = Math.max(0, strokeLen - gap);

    return {
      ...cat,
      percentage: getPercentage(cat.count),
      strokeLen,
      visibleDash,
      offset: currentOffset,
      hasData: cat.count > 0
    };
  });

  const hoveredCategory = categories.find((c) => c.id === hoveredId);

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Card Header */}
      <div className="dashboard-card-header">
        <div>
          <h3 style={{ fontSize: '1.15rem', margin: 0, fontWeight: 700 }}>Platform Overview</h3>
        </div>

        <Link
          to="/people"
          className="btn btn-secondary btn-sm"
          style={{ fontSize: '0.75rem', padding: '5px 12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
        >
          People Directory <ArrowUpRight size={12} />
        </Link>
      </div>

      {/* Main Focus: Prominent Circular Donut Chart & Demographic Legend */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '24px',
          padding: '20px 18px',
          background: 'var(--bg-input)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          flex: 1,
          flexWrap: 'wrap'
        }}
      >
        {/* Left Side: Prominent Circular Donut Chart */}
        <div
          style={{
            position: 'relative',
            width: '180px',
            height: '180px',
            flexShrink: 0,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {/* Subtle Hover Tooltip */}
          {hoveredCategory && (
            <div
              style={{
                position: 'absolute',
                top: '-12px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'var(--bg-card)',
                color: 'var(--text-main)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '4px 10px',
                fontSize: '0.725rem',
                fontWeight: 600,
                boxShadow: 'var(--shadow-md)',
                pointerEvents: 'none',
                zIndex: 20,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap'
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: hoveredCategory.color
                }}
              />
              <span>{hoveredCategory.name}:</span>
              <strong>{hoveredCategory.count}</strong>
              <span className="badge badge-active" style={{ fontSize: '0.625rem', padding: '1px 5px' }}>
                {hoveredCategory.percentage}%
              </span>
            </div>
          )}

          {/* SVG Donut */}
          <svg
            viewBox="0 0 180 180"
            style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)', overflow: 'visible' }}
          >
            {/* Background Track Ring */}
            <circle
              cx="90"
              cy="90"
              r={radius}
              fill="transparent"
              stroke="var(--border-subtle)"
              strokeWidth="18"
              opacity="0.6"
            />

            {/* Dynamic Donut Segments */}
            {totalMembers > 0 &&
              categories.map((cat) => {
                if (!cat.hasData) return null;
                const isHovered = hoveredId === cat.id;
                const isOtherHovered = hoveredId !== null && !isHovered;

                return (
                  <circle
                    key={cat.id}
                    cx="90"
                    cy="90"
                    r={radius}
                    fill="transparent"
                    stroke={cat.color}
                    strokeWidth={isHovered ? 23 : 18}
                    strokeDasharray={`${cat.visibleDash} ${circ}`}
                    strokeDashoffset={-(cat.offset + gap / 2)}
                    strokeLinecap="butt"
                    opacity={isOtherHovered ? 0.45 : 1}
                    onMouseEnter={() => setHoveredId(cat.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    style={{
                      cursor: 'pointer',
                      transition: 'stroke-width 0.2s ease, opacity 0.2s ease'
                    }}
                  />
                );
              })}
          </svg>

          {/* Center Content: Total Count & Short Label */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              pointerEvents: 'none',
              width: '94px'
            }}
          >
            <div
              style={{
                fontSize: '1.65rem',
                fontWeight: 800,
                color: hoveredCategory ? hoveredCategory.color : 'var(--text-main)',
                lineHeight: 1.05,
                transition: 'color 0.18s ease'
              }}
            >
              {hoveredCategory ? hoveredCategory.count : totalMembers}
            </div>
            <div
              style={{
                fontSize: '0.625rem',
                fontWeight: 700,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginTop: '4px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {hoveredCategory
                ? hoveredCategory.name
                : totalMembers === 0
                ? 'No Members'
                : 'Total Members'}
            </div>
          </div>
        </div>

        {/* Right Side: Compact Demographic Legend */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            flex: '1 1 200px',
            minWidth: '190px'
          }}
        >
          {categories.map((cat) => {
            const isHovered = hoveredId === cat.id;
            const isOtherHovered = hoveredId !== null && !isHovered;

            return (
              <div
                key={cat.id}
                onMouseEnter={() => setHoveredId(cat.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '7px 10px',
                  borderRadius: 'var(--radius-md)',
                  background: isHovered ? 'var(--bg-card)' : 'transparent',
                  border: isHovered ? '1px solid var(--border-subtle)' : '1px solid transparent',
                  opacity: isOtherHovered ? 0.5 : 1,
                  transition: 'all 0.15s ease',
                  cursor: 'pointer'
                }}
              >
                {/* Dot & Category Name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      width: '9px',
                      height: '9px',
                      borderRadius: '50%',
                      backgroundColor: cat.color,
                      flexShrink: 0,
                      boxShadow: isHovered ? `0 0 8px ${cat.color}` : 'none',
                      transition: 'box-shadow 0.15s ease'
                    }}
                  />
                  <div>
                    <div
                      style={{
                        fontSize: '0.8rem',
                        fontWeight: isHovered ? 700 : 600,
                        color: isHovered ? 'var(--text-main)' : 'var(--text-secondary)'
                      }}
                    >
                      {cat.name}
                    </div>
                    <div className="text-muted" style={{ fontSize: '0.675rem' }}>
                      {cat.description}
                    </div>
                  </div>
                </div>

                {/* Count & Percentage */}
                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <strong
                    style={{
                      fontSize: '0.85rem',
                      color: 'var(--text-main)',
                      fontVariantNumeric: 'tabular-nums'
                    }}
                  >
                    {cat.count}
                  </strong>
                  <span
                    className="text-muted"
                    style={{
                      fontSize: '0.675rem',
                      fontWeight: 600,
                      fontVariantNumeric: 'tabular-nums'
                    }}
                  >
                    {cat.percentage}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Info */}
      <div
        style={{
          marginTop: '14px',
          paddingTop: '10px',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.75rem',
          color: 'var(--text-muted)'
        }}
      >
        <span>Scoped to tenant: <strong>org-001 (Acme Academy)</strong></span>
        <span style={{ color: 'var(--success)', fontWeight: 600 }}>Status: Online</span>
      </div>
    </div>
  );
};
