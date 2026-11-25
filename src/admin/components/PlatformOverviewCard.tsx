import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Users, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuthStore } from '../../lib/store';
import { usePeopleStore } from '../../lib/peopleStore';
import { peopleApi } from '../../lib/peopleApiService';
import { useOrganisationBranding } from '../../lib/useOrganisationBranding';
import { User } from '../../types';

export const PlatformOverviewCard: React.FC = () => {
  const { user } = useAuthStore();
  const { companyName } = useOrganisationBranding();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const [activeOrgId, setActiveOrgId] = useState<string>(() => {
    return (
      sessionStorage.getItem('venilearn_active_org_id') ||
      localStorage.getItem('venilearn_active_org_id') ||
      user?.organizationId ||
      'org-001'
    );
  });

  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadPeople = useCallback(async (tenantId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch genuine tenant members from backend
      const res = await peopleApi.list({ limit: 1000 });
      const fetchedUsers = res.users || [];
      setUsers(fetchedUsers);
    } catch (err: any) {
      console.warn('Failed to fetch people for platform overview:', err);
      // Fall back to users already in peopleStore if available
      const storeUsers = usePeopleStore.getState().users;
      if (storeUsers && storeUsers.length > 0) {
        setUsers(storeUsers);
      } else {
        setError(err?.message || 'Failed to retrieve member demographic data.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPeople(activeOrgId);

    const handleOrgSwitch = (e: Event) => {
      const customEvent = e as CustomEvent<{ orgId: string }>;
      const nextOrg = customEvent.detail?.orgId || sessionStorage.getItem('venilearn_active_org_id') || 'org-001';
      setActiveOrgId(nextOrg);
      loadPeople(nextOrg);
    };

    window.addEventListener('venilearn_org_switched', handleOrgSwitch);
    return () => {
      window.removeEventListener('venilearn_org_switched', handleOrgSwitch);
    };
  }, [activeOrgId, loadPeople]);

  // Filter out global platform administrators and users from other tenants
  const institutionUsers = users.filter((u) => {
    const isGlobalPlatformUser = u.activeRole === 'platform_admin';
    const isOtherTenant = u.organizationId && u.organizationId !== activeOrgId;
    return !isGlobalPlatformUser && !isOtherTenant;
  });

  // Calculate mutually exclusive category counts from genuine tenant-scoped records
  const studentsCount = institutionUsers.filter(
    (u) => u.activeRole === 'student' || u.activeRole === 'learner' || u.activeRole === 'guest'
  ).length;

  const facultyCount = institutionUsers.filter(
    (u) => u.activeRole === 'trainer' || u.activeRole === 'instructor' || u.activeRole === 'grader'
  ).length;

  const adminStaffCount = institutionUsers.filter(
    (u) => u.activeRole === 'org_admin' || u.activeRole === 'lms_admin'
  ).length;

  // Other staff covers remaining roles, strictly avoiding double-counting
  const otherStaffCount = Math.max(
    0,
    institutionUsers.length - studentsCount - facultyCount - adminStaffCount
  );

  // Total members strictly equals sum of all mutually exclusive categories
  const totalMembers = studentsCount + facultyCount + adminStaffCount + otherStaffCount;

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
      color: '#2563EB', /* Royal Blue */
      description: 'Enrolled learners across cohorts',
    },
    {
      id: 'faculty',
      name: 'Faculty',
      count: facultyCount,
      color: '#EC4899', /* Hot Pink */
      description: 'Instructors & subject trainers',
    },
    {
      id: 'admin_staff',
      name: 'Administrative Staff',
      count: adminStaffCount,
      color: '#5447FF', /* Electric Indigo Blue */
      description: 'Institution & department managers',
    },
    {
      id: 'other_staff',
      name: 'Other Staff',
      count: otherStaffCount,
      color: '#818CF8', /* Soft Indigo / Periwinkle */
      description: 'Operations, exam & lab staff',
    },
  ];

  // Circumference & Donut geometry: compact r = 46, viewBox = 136 x 136
  const radius = 46;
  const circ = 2 * Math.PI * radius; // ~289.03
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
      hasData: cat.count > 0,
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
      {isLoading ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '24px',
            padding: '40px 18px',
            background: 'var(--bg-input)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            flex: 1,
          }}
        >
          <div
            style={{
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              border: '12px solid var(--border-subtle)',
              borderTopColor: 'var(--primary)',
              animation: 'spin 1s linear infinite',
            }}
          />
        </div>
      ) : error ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '36px 18px',
            background: 'var(--bg-input)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            flex: 1,
            textAlign: 'center',
            gap: '12px',
          }}
        >
          <AlertCircle size={28} style={{ color: 'var(--warning)', opacity: 0.8 }} />
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
              Platform Data Unavailable
            </div>
            <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', maxWidth: '280px' }}>
              {error}
            </div>
          </div>
          <button
            onClick={() => loadPeople(activeOrgId)}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      ) : totalMembers === 0 ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '36px 18px',
            background: 'var(--bg-input)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            flex: 1,
            textAlign: 'center',
          }}
        >
          <Users size={36} style={{ color: 'var(--text-muted)', marginBottom: '12px', opacity: 0.4 }} />
          <h4 style={{ margin: '0 0 6px 0', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>
            No Platform Members Found
          </h4>
          <p style={{ margin: '0 0 16px 0', fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '280px' }}>
            No student, faculty, or staff records exist in this organization yet.
          </p>
          <Link to="/people" className="btn btn-primary btn-sm" style={{ fontSize: '0.75rem' }}>
            Add Members to Directory
          </Link>
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            padding: '12px 14px',
            background: 'var(--bg-input)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            flexWrap: 'wrap',
          }}
        >
          {/* Left Side: Compact Circular Donut Chart */}
          <div
            style={{
              position: 'relative',
              width: '132px',
              height: '132px',
              flexShrink: 0,
              margin: '0 auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Subtle Hover Tooltip */}
            {hoveredCategory && (
              <div
                className="chart-bar-tooltip-animated"
                style={{
                  position: 'absolute',
                  top: '-14px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-main)',
                  border: `1px solid ${hoveredCategory.color}`,
                  borderRadius: 'var(--radius-md)',
                  padding: '3px 8px',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  boxShadow: 'var(--shadow-md)',
                  pointerEvents: 'none',
                  zIndex: 20,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  whiteSpace: 'nowrap',
                }}
              >
                <span
                  style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    backgroundColor: hoveredCategory.color,
                  }}
                />
                <span>{hoveredCategory.name}:</span>
                <strong>{hoveredCategory.count}</strong>
                <span className="badge badge-active" style={{ fontSize: '0.6rem', padding: '1px 5px' }}>
                  {hoveredCategory.percentage}%
                </span>
              </div>
            )}

            {/* SVG Donut */}
            <svg
              className="donut-svg-animated"
              viewBox="0 0 136 136"
              style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)', overflow: 'visible' }}
            >
              {/* Background Track Ring */}
              <circle
                cx="68"
                cy="68"
                r={radius}
                fill="transparent"
                stroke="var(--border-subtle)"
                strokeWidth="14"
                opacity="0.55"
              />

              {/* Dynamic Donut Segments (CSS Progress Ring Fill on Load) */}
              {totalMembers > 0 &&
                categories.map((cat, idx) => {
                  if (!cat.hasData) return null;
                  const isHovered = hoveredId === cat.id;
                  const isOtherHovered = hoveredId !== null && !isHovered;

                  return (
                    <circle
                      key={`${cat.id}-${totalMembers}`}
                      className="progress-ring-segment"
                      cx="68"
                      cy="68"
                      r={radius}
                      fill="transparent"
                      stroke={cat.color}
                      strokeWidth={isHovered ? 18 : 14}
                      strokeDasharray={`${cat.visibleDash} ${circ}`}
                      strokeDashoffset={-(cat.offset + gap / 2)}
                      strokeLinecap="butt"
                      opacity={isOtherHovered ? 0.42 : 1}
                      onMouseEnter={() => setHoveredId(cat.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      style={{
                        ['--ring-dash' as string]: `${cat.visibleDash} ${circ}`,
                        animationDelay: `${idx * 120}ms`,
                        cursor: 'pointer',
                        filter: isHovered ? `drop-shadow(0 0 6px ${cat.color})` : 'none',
                        transition: 'stroke-width 0.2s ease, opacity 0.2s ease, filter 0.2s ease',
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
                width: '76px',
              }}
            >
              <div
                style={{
                  fontSize: '1.35rem',
                  fontWeight: 800,
                  color: hoveredCategory ? hoveredCategory.color : 'var(--text-main)',
                  lineHeight: 1.05,
                  transition: 'color 0.18s ease',
                }}
              >
                {hoveredCategory ? hoveredCategory.count : totalMembers}
              </div>
              <div
                style={{
                  fontSize: '0.58rem',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  marginTop: '3px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {hoveredCategory ? hoveredCategory.name : 'Members'}
              </div>
            </div>
          </div>

          {/* Right Side: Compact Demographic Legend */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              flex: '1 1 180px',
              minWidth: '170px',
            }}
          >
            {categories.map((cat, idx) => {
              const isHovered = hoveredId === cat.id;
              const isOtherHovered = hoveredId !== null && !isHovered;

              return (
                <div
                  key={cat.id}
                  className="leaderboard-row-animated"
                  onMouseEnter={() => setHoveredId(cat.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '5px 9px',
                    borderRadius: 'var(--radius-sm)',
                    background: isHovered ? 'var(--bg-card)' : 'transparent',
                    border: isHovered ? `1px solid ${cat.color}` : '1px solid transparent',
                    opacity: isOtherHovered ? 0.5 : 1,
                    transition: 'all 0.15s ease',
                    cursor: 'pointer',
                    animationDelay: `${idx * 60}ms`,
                  }}
                >
                  {/* Dot & Category Name */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: cat.color,
                        flexShrink: 0,
                        boxShadow: isHovered ? `0 0 8px ${cat.color}` : 'none',
                        transition: 'box-shadow 0.15s ease',
                      }}
                    />
                    <span
                      style={{
                        fontSize: '0.78rem',
                        fontWeight: isHovered ? 700 : 600,
                        color: isHovered ? 'var(--text-main)' : 'var(--text-secondary)',
                      }}
                    >
                      {cat.name}
                    </span>
                  </div>

                  {/* Count & Percentage */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <strong
                      style={{
                        fontSize: '0.8rem',
                        color: 'var(--text-main)',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {cat.count}
                    </strong>
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        color: cat.color,
                        minWidth: '34px',
                        textAlign: 'right',
                        fontVariantNumeric: 'tabular-nums',
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
      )}

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
          color: 'var(--text-muted)',
        }}
      >
        <span>
          Scoped to tenant: <strong>{companyName || activeOrgId}</strong>
        </span>
        <span style={{ color: 'var(--success)', fontWeight: 600 }}>Status: Online</span>
      </div>
    </div>
  );
};
