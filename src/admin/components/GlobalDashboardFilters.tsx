import React from 'react';
import { RotateCcw, Calendar, Building2, BookOpen } from 'lucide-react';
import { useDashboardFilters } from '../context/DashboardFilterContext';
import { mockDepartments } from '../../data/mockData';

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

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexWrap: 'wrap',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        padding: '6px 10px',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {/* Department Dropdown */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
        <Building2 size={13} color="var(--primary)" />
        <select
          className="form-select"
          value={departmentId}
          onChange={(e) => setDepartmentId(e.target.value)}
          style={{
            fontSize: '0.8rem',
            padding: '4px 8px',
            minWidth: '140px',
            maxWidth: '180px',
            height: '32px',
          }}
          title="Filter by Department"
        >
          <option value="all">All Departments</option>
          {mockDepartments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.parentId ? `↳ ${d.name}` : d.name}
            </option>
          ))}
        </select>
      </div>

      {/* Course Dropdown (cascaded by department) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
        <BookOpen size={13} color="var(--primary)" />
        <select
          className="form-select"
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
          style={{
            fontSize: '0.8rem',
            padding: '4px 8px',
            minWidth: '140px',
            maxWidth: '180px',
            height: '32px',
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

      {/* Date Range: Start Date & End Date */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
        <Calendar size={13} color="var(--primary)" />
        <input
          type="date"
          className="form-input"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          style={{
            fontSize: '0.78rem',
            padding: '4px 6px',
            width: '125px',
            height: '32px',
          }}
          title="Start Date"
        />
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>to</span>
        <input
          type="date"
          className="form-input"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          style={{
            fontSize: '0.78rem',
            padding: '4px 6px',
            width: '125px',
            height: '32px',
          }}
          title="End Date"
        />
      </div>

      {/* Reset Button */}
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={resetFilters}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '0.78rem',
          padding: '4px 10px',
          height: '32px',
          color: isFiltered ? 'var(--primary)' : 'var(--text-secondary)',
          borderColor: isFiltered ? 'var(--primary)' : undefined,
          fontWeight: isFiltered ? 700 : 500,
        }}
        title="Reset all filters to default"
      >
        <RotateCcw size={12} />
        <span>Reset</span>
      </button>
    </div>
  );
};
