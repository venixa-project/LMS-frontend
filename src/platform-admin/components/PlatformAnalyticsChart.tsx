import React, { useState } from 'react';

export const PlatformAnalyticsChart: React.FC = () => {
  const [analyticsRange, setAnalyticsRange] = useState<'6months' | 'ytd'>('6months');

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Learner Enrollment & Course Completion Analytics</h3>
          <p className="text-muted text-xs">Multi-cohort performance and milestone velocity across all institutions</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <select
            className="form-select"
            value={analyticsRange}
            onChange={(e) => setAnalyticsRange(e.target.value as '6months' | 'ytd')}
            style={{ width: 'auto', padding: '5px 10px', fontSize: '0.8rem', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}
          >
            <option value="6months">Last 6 Months</option>
            <option value="ytd">Year to Date (Quarterly)</option>
          </select>
        </div>
      </div>

      {/* Bar Chart Representation */}
      <div style={{ overflowX: 'auto', paddingBottom: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '190px', minWidth: '320px', padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
          {(analyticsRange === '6months'
            ? [
                { label: 'May', enrolled: 180, completed: 110 },
                { label: 'Jun', enrolled: 240, completed: 160 },
                { label: 'Jul', enrolled: 310, completed: 210 },
                { label: 'Aug', enrolled: 290, completed: 230 },
                { label: 'Sep', enrolled: 420, completed: 340 },
                { label: 'Oct', enrolled: 490, completed: 410 },
              ]
            : [
                { label: 'Q1 (Jan–Mar)', enrolled: 520, completed: 380 },
                { label: 'Q2 (Apr–Jun)', enrolled: 740, completed: 590 },
                { label: 'Q3 (Jul–Sep)', enrolled: 1020, completed: 780 },
                { label: 'Q4 (Oct–Dec)', enrolled: 490, completed: 410 },
              ]
          ).map((d) => {
            const maxVal = analyticsRange === '6months' ? 520 : 1100;
            return (
              <div key={d.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '140px' }}>
                  <div
                    title={`${d.label} Enrolled: ${d.enrolled}`}
                    style={{
                      width: '22px',
                      height: `${Math.max(12, (d.enrolled / maxVal) * 130)}px`,
                      background: 'linear-gradient(180deg, var(--primary), var(--accent-purple))',
                      borderRadius: '4px 4px 0 0',
                      transition: 'height 0.3s ease'
                    }}
                  />
                  <div
                    title={`${d.label} Completed: ${d.completed}`}
                    style={{
                      width: '22px',
                      height: `${Math.max(12, (d.completed / maxVal) * 130)}px`,
                      background: 'linear-gradient(180deg, var(--success), #059669)',
                      borderRadius: '4px 4px 0 0',
                      transition: 'height 0.3s ease'
                    }}
                  />
                </div>
                <span className="text-muted text-xs font-semibold" style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                  {d.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend and Summary Stats */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px', flexWrap: 'wrap', gap: '12px', fontSize: '0.8rem' }}>
        <div style={{ display: 'flex', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '12px', height: '12px', background: 'var(--primary)', borderRadius: '2px' }} />
            <span style={{ fontWeight: 500 }}>New Enrollments</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '12px', height: '12px', background: 'var(--success)', borderRadius: '2px' }} />
            <span style={{ fontWeight: 500 }}>Graduated / Completed</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '14px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <span>Total Enrolled: <strong style={{ color: 'var(--text-main)' }}>{analyticsRange === '6months' ? '1,930' : '2,770'}</strong></span>
          <span>&bull;</span>
          <span>Total Completed: <strong style={{ color: 'var(--text-main)' }}>{analyticsRange === '6months' ? '1,460' : '2,160'}</strong></span>
          <span>&bull;</span>
          <span>Avg Completion: <strong style={{ color: 'var(--success)' }}>{analyticsRange === '6months' ? '75.6%' : '78.0%'}</strong></span>
        </div>
      </div>
    </div>
  );
};
