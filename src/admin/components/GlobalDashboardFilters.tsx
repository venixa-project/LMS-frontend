import React, { useEffect, useState } from 'react';
import { RotateCcw, Calendar, Building2, BookOpen, Download } from 'lucide-react';
import { useDashboardFilters } from '../context/DashboardFilterContext';
import { apiClient } from '../../lib/apiClient';

interface DepartmentItem {
  id: string;
  name: string;
  parentId?: string | null;
}

export const GlobalDashboardFilters: React.FC = () => {
  const {
    departmentId,
    courseId,
    startDate,
    endDate,
    isFiltered,
    availableCourses,
    setDepartmentId,
    setCourseId,
    setStartDate,
    setEndDate,
    resetFilters,
  } = useDashboardFilters();

  const [departments, setDepartments] = useState<DepartmentItem[]>([]);

  useEffect(() => {
    let isMounted = true;
    apiClient
      .get<any[]>('/admin/departments')
      .then((res) => {
        if (!isMounted) return;
        const list = Array.isArray(res.data) ? res.data : (res.data as any)?.items || [];
        setDepartments(list);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  const handleExport = () => {
    // Generate simple CSV of summary data
    const rows = [
      ['Metric', 'Filter Department', 'Filter Course', 'Start Date', 'End Date'],
      ['Dashboard Analytics Export', departmentId, courseId, startDate || 'All', endDate || 'All'],
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `dashboard_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        flexWrap: 'wrap',
        width: '100%',
        padding: '6px 0',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        {/* FILTERS Label */}
        <span
          style={{
            fontSize: '0.74rem',
            fontWeight: 800,
            color: '#64748B',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          FILTERS
        </span>

        {/* Date Range: From ... To ... Pill */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '9999px',
            padding: '4px 14px',
            fontSize: '0.8rem',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <Calendar size={13} color="var(--primary)" />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>From:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{
              fontSize: '0.78rem',
              border: 'none',
              background: 'transparent',
              outline: 'none',
              color: 'var(--text-main)',
              cursor: 'pointer',
            }}
            title="Start Date"
          />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>To:</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{
              fontSize: '0.78rem',
              border: 'none',
              background: 'transparent',
              outline: 'none',
              color: 'var(--text-main)',
              cursor: 'pointer',
            }}
            title="End Date"
          />
        </div>

        {/* Classification / Department Dropdown Pill */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '9999px',
            padding: '4px 14px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <Building2 size={13} color="var(--primary)" />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Classification:</span>
          <select
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            style={{
              fontSize: '0.78rem',
              border: 'none',
              background: 'transparent',
              outline: 'none',
              color: 'var(--text-main)',
              cursor: 'pointer',
              fontWeight: 500,
            }}
            title="Filter by Department / Classification"
          >
            <option value="all">All Classifications</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.parentId ? `↳ ${d.name}` : d.name}
              </option>
            ))}
          </select>
        </div>

        {/* Course Dropdown Pill */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '9999px',
            padding: '4px 14px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <BookOpen size={13} color="var(--primary)" />
          <select
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            style={{
              fontSize: '0.78rem',
              border: 'none',
              background: 'transparent',
              outline: 'none',
              color: 'var(--text-main)',
              cursor: 'pointer',
              fontWeight: 500,
            }}
            title="Filter by Course"
          >
            <option value="all">All Courses ({availableCourses.length})</option>
            {availableCourses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>

        {/* Reset Button */}
        {isFiltered && (
          <button
            type="button"
            onClick={resetFilters}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.78rem',
              padding: '5px 12px',
              borderRadius: '9999px',
              background: 'rgba(236, 72, 153, 0.1)',
              border: '1px solid #EC4899',
              color: '#EC4899',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="Reset all filters to default"
          >
            <RotateCcw size={12} />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Export Filtered Data Action Button */}
      <button
        type="button"
        onClick={handleExport}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          background: 'transparent',
          border: 'none',
          color: '#64748B',
          fontSize: '0.82rem',
          fontWeight: 600,
          cursor: 'pointer',
          padding: '6px 12px',
          borderRadius: '9999px',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = '#2563EB';
          e.currentTarget.style.background = 'rgba(37, 99, 235, 0.08)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = '#64748B';
          e.currentTarget.style.background = 'transparent';
        }}
      >
        <Download size={14} />
        <span>Export Filtered Data</span>
      </button>
    </div>
  );
};
