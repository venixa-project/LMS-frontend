import React, { useState, useEffect } from 'react';
import { useHRMS } from '../context/OrganisationContext';
import { Department } from '../types';
import {
  Building,
  PlusCircle,
  Search,
  Users,
  Layers,
  Edit,
  X,
  ChevronDown,
  ChevronRight,
  GitFork,
  ArrowLeft,
  AlertCircle,
  FolderTree,
  Plus,
  CheckCircle2,
} from 'lucide-react';

export const DepartmentsDesignationsView: React.FC = () => {
  const {
    currentCompany,
    departments: contextDepts,
    setDepartments: updateContextDepts,
    employees,
    showToast,
  } = useHRMS();

  // Local state for departments synced with context
  const [departments, setDepartments] = useState<Department[]>(contextDepts);

  useEffect(() => {
    setDepartments(contextDepts);
  }, [contextDepts]);

  // Search
  const [searchTerm, setSearchTerm] = useState('');

  // Department Modal state
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);

  // Department Form state
  const [deptMode, setDeptMode] = useState<'main' | 'sub'>('main');
  const [deptParentId, setDeptParentId] = useState('');
  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [deptHeadId, setDeptHeadId] = useState('');
  const [deptDescription, setDeptDescription] = useState('');
  const [parentSearchTerm, setParentSearchTerm] = useState('');
  const [deptValidationErrors, setDeptValidationErrors] = useState<{
    name?: string;
    code?: string;
    parentId?: string;
  }>({});

  // Expand / Collapse state for main departments in the hierarchy view
  const [expandedDeptIds, setExpandedDeptIds] = useState<Set<string>>(() => {
    // Automatically expand all parent departments that have sub-departments
    const parentIdsWithChildren = contextDepts
      .filter((d) => !d.parentId && contextDepts.some((c) => c.parentId === d.id))
      .map((d) => d.id);
    return new Set(parentIdsWithChildren);
  });

  // Helpers
  const companyEmployees = employees.filter(
    (e) => e.companyId === currentCompany.id || e.companyId === 'comp-1'
  );

  const mainDepartments = departments.filter((d) => !d.parentId);
  const subDepartments = departments.filter((d) => !!d.parentId);

  const getSubDepartments = (parentId: string) => {
    return departments.filter((d) => d.parentId === parentId);
  };

  const getDeptHeadCount = (deptNameOrId: string) => {
    return companyEmployees.filter(
      (e) =>
        e.departmentId === deptNameOrId ||
        e.departmentId.toLowerCase().includes(deptNameOrId.toLowerCase())
    ).length;
  };

  const getMainDeptTotalHeadcount = (mainDept: Department) => {
    const subs = getSubDepartments(mainDept.id);
    const direct = getDeptHeadCount(mainDept.name);
    const subTotal = subs.reduce((sum, s) => sum + getDeptHeadCount(s.name), 0);
    return { direct, subTotal, total: direct + subTotal, subCount: subs.length };
  };

  const toggleExpand = (deptId: string) => {
    setExpandedDeptIds((prev) => {
      const next = new Set(prev);
      if (next.has(deptId)) {
        next.delete(deptId);
      } else {
        next.add(deptId);
      }
      return next;
    });
  };

  const expandAll = () => {
    const allParentIds = mainDepartments.map((d) => d.id);
    setExpandedDeptIds(new Set(allParentIds));
  };

  const collapseAll = () => {
    setExpandedDeptIds(new Set());
  };

  // Open Create Department Modal
  const openAddDeptModal = (preselectedParentId?: string, forceMode?: 'main' | 'sub') => {
    setEditingDept(null);
    setDeptValidationErrors({});
    setParentSearchTerm('');

    const randomSuffix = Math.floor(10 + Math.random() * 90);

    if (preselectedParentId) {
      setDeptMode('sub');
      setDeptParentId(preselectedParentId);
      setDeptName('');
      setDeptCode(`SUB-${randomSuffix}`);
      setDeptHeadId('');
      setDeptDescription('');
    } else if (forceMode === 'sub') {
      setDeptMode('sub');
      setDeptParentId(mainDepartments[0]?.id || '');
      setDeptName('');
      setDeptCode(`SUB-${randomSuffix}`);
      setDeptHeadId('');
      setDeptDescription('');
    } else {
      setDeptMode('main');
      setDeptParentId('');
      setDeptName('');
      setDeptCode(`DPT-${randomSuffix}`);
      setDeptHeadId('');
      setDeptDescription('');
    }

    setIsDeptModalOpen(true);
  };

  // Open Edit Department Modal
  const openEditDeptModal = (d: Department) => {
    setEditingDept(d);
    setDeptValidationErrors({});
    setParentSearchTerm('');

    if (d.parentId) {
      setDeptMode('sub');
      setDeptParentId(d.parentId);
    } else {
      setDeptMode('main');
      setDeptParentId('');
    }

    setDeptName(d.name);
    setDeptCode(d.code);
    setDeptHeadId(d.headId || '');
    setDeptDescription(d.description || '');
    setIsDeptModalOpen(true);
  };

  // Department Form Save & Validation
  const handleSaveDept = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { name?: string; code?: string; parentId?: string } = {};

    const trimmedName = deptName.trim();
    const trimmedCode = deptCode.trim().toUpperCase();

    // 1. Validate required name
    if (!trimmedName) {
      errors.name = 'Department Name is required.';
    }

    // 2. Validate required code & uniqueness
    if (!trimmedCode) {
      errors.code = 'Department Code is required.';
    } else {
      const isDuplicate = departments.some(
        (d) => d.code.toUpperCase() === trimmedCode && d.id !== editingDept?.id
      );
      if (isDuplicate) {
        errors.code = `Department code "${trimmedCode}" is already in use. Codes must be unique.`;
      }
    }

    // 3. Sub-department validation
    if (deptMode === 'sub') {
      if (!deptParentId) {
        errors.parentId = 'Parent Department is required for a sub-department.';
      } else if (editingDept && deptParentId === editingDept.id) {
        errors.parentId = 'A department cannot be its own parent.';
      } else {
        // Prevent circular department relationship: parent cannot be a child of this department
        const targetParent = departments.find((d) => d.id === deptParentId);
        if (targetParent?.parentId === editingDept?.id) {
          errors.parentId = 'Invalid circular department relationship detected.';
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      setDeptValidationErrors(errors);
      showToast('Please fix the errors before saving.', 'warning');
      return;
    }

    if (editingDept) {
      // Preserve existing department records and relationships
      const updated = departments.map((d) =>
        d.id === editingDept.id
          ? {
              ...d,
              name: trimmedName,
              code: trimmedCode,
              parentId: deptMode === 'sub' ? deptParentId : undefined,
              headId: deptHeadId || undefined,
              description: deptDescription.trim() || undefined,
              status: d.status || 'Active',
            }
          : d
      );
      setDepartments(updated);
      updateContextDepts(updated);

      if (deptMode === 'sub' && deptParentId) {
        setExpandedDeptIds((prev) => new Set([...prev, deptParentId]));
      }

      showToast(
        `${deptMode === 'sub' ? 'Sub-Department' : 'Main Department'} "${trimmedName}" updated.`,
        'success'
      );
    } else {
      const newDept: Department = {
        id: `dept-${Date.now()}`,
        companyId: currentCompany.id,
        name: trimmedName,
        code: trimmedCode,
        parentId: deptMode === 'sub' ? deptParentId : undefined,
        headId: deptHeadId || undefined,
        description: deptDescription.trim() || undefined,
        status: 'Active',
      };
      const updated = [newDept, ...departments];
      setDepartments(updated);
      updateContextDepts(updated);

      // If sub-department, auto-expand parent row so the user immediately sees it
      if (newDept.parentId) {
        setExpandedDeptIds((prev) => new Set([...prev, newDept.parentId!]));
      }

      showToast(
        `${deptMode === 'sub' ? 'Sub-Department' : 'Main Department'} "${newDept.name}" created successfully!`,
        'success'
      );
    }

    setIsDeptModalOpen(false);
  };

  // Valid Parent Candidates for Sub-Departments:
  // Must be main departments (!d.parentId) and not the department being edited or its descendants
  const validParentCandidates = mainDepartments.filter(
    (d) => !editingDept || (d.id !== editingDept.id && d.parentId !== editingDept.id)
  );

  const filteredParentCandidates = validParentCandidates.filter(
    (d) =>
      !parentSearchTerm ||
      d.name.toLowerCase().includes(parentSearchTerm.toLowerCase()) ||
      d.code.toLowerCase().includes(parentSearchTerm.toLowerCase())
  );

  // Selected parent department object
  const selectedParentDept = mainDepartments.find((d) => d.id === deptParentId);

  // Hierarchy search filtering logic
  const normalizedSearch = searchTerm.trim().toLowerCase();

  // Determine which main departments match or have matching children
  const matchingMainDepts = mainDepartments.filter((mainDept) => {
    if (!normalizedSearch) return true;

    const mainMatches =
      mainDept.name.toLowerCase().includes(normalizedSearch) ||
      mainDept.code.toLowerCase().includes(normalizedSearch);

    const subs = getSubDepartments(mainDept.id);
    const subMatches = subs.some(
      (s) =>
        s.name.toLowerCase().includes(normalizedSearch) ||
        s.code.toLowerCase().includes(normalizedSearch)
    );

    return mainMatches || subMatches;
  });

  // When searching, auto-expand parents that have matching sub-departments
  useEffect(() => {
    if (normalizedSearch) {
      const matchingParentIds = new Set<string>();
      mainDepartments.forEach((m) => {
        const subs = getSubDepartments(m.id);
        const hasMatchingChild = subs.some(
          (s) =>
            s.name.toLowerCase().includes(normalizedSearch) ||
            s.code.toLowerCase().includes(normalizedSearch)
        );
        if (hasMatchingChild) {
          matchingParentIds.add(m.id);
        }
      });
      if (matchingParentIds.size > 0) {
        setExpandedDeptIds((prev) => new Set([...prev, ...matchingParentIds]));
      }
    }
  }, [normalizedSearch]);

  const totalMainCount = mainDepartments.length;
  const totalSubCount = subDepartments.length;
  const allParentsExpanded =
    mainDepartments.length > 0 &&
    mainDepartments.every((m) => getSubDepartments(m.id).length === 0 || expandedDeptIds.has(m.id));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* KPI Counters */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
        }}
      >
        <div
          style={{
            background: 'var(--bg-card)',
            borderRadius: '14px',
            border: '1px solid var(--border-subtle)',
            padding: '1.25rem',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: 'var(--text-muted)',
              display: 'block',
              marginBottom: '0.25rem',
              letterSpacing: '0.04em',
            }}
          >
            DEPARTMENT HIERARCHY
          </span>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>
            {departments.length}{' '}
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted)' }}>Units</span>
          </div>
          <div
            style={{
              fontSize: '0.75rem',
              color: 'var(--brand-blue)',
              fontWeight: 600,
              display: 'flex',
              gap: '0.5rem',
              marginTop: '0.2rem',
            }}
          >
            <span>{totalMainCount} Main</span>
            <span>•</span>
            <span>{totalSubCount} Sub-Departments</span>
          </div>
        </div>

        <div
          style={{
            background: 'var(--bg-card)',
            borderRadius: '14px',
            border: '1px solid var(--border-subtle)',
            padding: '1.25rem',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: 'var(--text-muted)',
              display: 'block',
              marginBottom: '0.25rem',
              letterSpacing: '0.04em',
            }}
          >
            MAIN DIVISIONS
          </span>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>
            {totalMainCount}{' '}
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted)' }}>Departments</span>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Primary operational organizational branches
          </span>
        </div>

        <div
          style={{
            background: 'var(--bg-card)',
            borderRadius: '14px',
            border: '1px solid var(--border-subtle)',
            padding: '1.25rem',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: 'var(--text-muted)',
              display: 'block',
              marginBottom: '0.25rem',
              letterSpacing: '0.04em',
            }}
          >
            ORGANIZATION HEADCOUNT
          </span>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--brand-indigo)' }}>
            {companyEmployees.length} Staff
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Active workforce allocation</span>
        </div>
      </div>

      {/* Main Card */}
      <div
        style={{
          background: 'var(--bg-card)',
          borderRadius: '16px',
          border: '1px solid var(--border-subtle)',
          padding: '1.5rem',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        {/* Header and Actions */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border-subtle)',
            paddingBottom: '1rem',
            marginBottom: '1.25rem',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'rgba(37, 99, 235, 0.08)',
                border: '1px solid rgba(37, 99, 235, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FolderTree size={20} color="var(--brand-blue)" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                  Departments & Hierarchy
                </h3>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '0.15rem 0.5rem',
                    borderRadius: '999px',
                    background: 'var(--bg-input)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  {departments.length} Units
                </span>
              </div>
              <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Manage main divisions, nested sub-departments, and reporting lines
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => openAddDeptModal(undefined, 'sub')}
              title="Add a nested sub-department under a parent"
            >
              <GitFork size={14} color="var(--brand-indigo)" /> + Sub-Department
            </button>

            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => openAddDeptModal(undefined, 'main')}
            >
              <PlusCircle size={15} /> Create Department
            </button>
          </div>
        </div>

        {/* Filters & Hierarchy Controls */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            marginBottom: '1.25rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ position: 'relative', width: '100%', maxWidth: '360px' }}>
            <Search
              size={15}
              style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }}
            />
            <input
              type="text"
              placeholder="Search department name, code, or hierarchy..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem 0.5rem 2rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.825rem',
                outline: 'none',
              }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '8px',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={allParentsExpanded ? collapseAll : expandAll}
              style={{
                padding: '0.45rem 0.85rem',
                borderRadius: '7px',
                border: '1px solid #e2e8f0',
                background: '#f8fafc',
                color: '#475569',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              {allParentsExpanded ? (
                <>
                  <ChevronRight size={13} /> Collapse All
                </>
              ) : (
                <>
                  <ChevronDown size={13} /> Expand All
                </>
              )}
            </button>

            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Showing <strong>{matchingMainDepts.length}</strong> main divisions
            </span>
          </div>
        </div>

        {/* DEPARTMENTS HIERARCHY TABLE */}
        <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'left',
                fontSize: '0.825rem',
              }}
            >
              <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <tr>
                  <th style={{ padding: '0.85rem 1.25rem', color: '#64748b', minWidth: '300px' }}>
                    DEPARTMENT & HIERARCHY
                  </th>
                  <th style={{ padding: '0.85rem 1.25rem', color: '#64748b', width: '130px' }}>
                    TYPE
                  </th>
                  <th style={{ padding: '0.85rem 1.25rem', color: '#64748b', minWidth: '220px' }}>
                    HEAD OF DEPARTMENT
                  </th>
                  <th style={{ padding: '0.85rem 1.25rem', color: '#64748b', width: '140px' }}>
                    HEADCOUNT
                  </th>
                  <th style={{ padding: '0.85rem 1.25rem', color: '#64748b', width: '110px' }}>
                    STATUS
                  </th>
                  <th
                    style={{
                      padding: '0.85rem 1.25rem',
                      color: '#64748b',
                      textAlign: 'right',
                      minWidth: '160px',
                    }}
                  >
                    ACTIONS
                  </th>
                </tr>
              </thead>
              <tbody>
                {matchingMainDepts.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b' }}
                    >
                      <Building size={32} color="#cbd5e1" style={{ marginBottom: '0.5rem' }} />
                      <div style={{ fontWeight: 600, color: '#334155' }}>
                        No departments found matching "{searchTerm}"
                      </div>
                      <p style={{ fontSize: '0.78rem', marginTop: '0.25rem', color: '#94a3b8' }}>
                        Try clearing your search or create a new department above.
                      </p>
                    </td>
                  </tr>
                ) : (
                  matchingMainDepts.map((mainDept) => {
                    const isExpanded = expandedDeptIds.has(mainDept.id);
                    const headEmp = companyEmployees.find((e) => e.id === mainDept.headId);
                    const subs = getSubDepartments(mainDept.id);
                    const { direct, total, subCount } = getMainDeptTotalHeadcount(mainDept);

                    // If user is searching, optionally highlight filtered sub-departments
                    const matchingSubs = subs.filter((s) => {
                      if (!normalizedSearch) return true;
                      return (
                        s.name.toLowerCase().includes(normalizedSearch) ||
                        s.code.toLowerCase().includes(normalizedSearch) ||
                        mainDept.name.toLowerCase().includes(normalizedSearch)
                      );
                    });

                    return (
                      <React.Fragment key={mainDept.id}>
                        {/* MAIN DEPARTMENT ROW */}
                        <tr
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            background: isExpanded ? '#fafcfb' : '#ffffff',
                            transition: 'background 0.15s ease',
                          }}
                        >
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
                              {subs.length > 0 ? (
                                <button
                                  type="button"
                                  onClick={() => toggleExpand(mainDept.id)}
                                  title={isExpanded ? 'Collapse sub-departments' : 'Expand sub-departments'}
                                  style={{
                                    marginTop: '2px',
                                    padding: '0.2rem',
                                    borderRadius: '5px',
                                    border: '1px solid var(--border-subtle)',
                                    background: isExpanded ? 'rgba(37, 99, 235, 0.08)' : 'var(--bg-card)',
                                    color: isExpanded ? 'var(--brand-blue)' : 'var(--text-muted)',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                </button>
                              ) : (
                                <div
                                  style={{
                                    width: '20px',
                                    height: '20px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  <span
                                    style={{
                                      width: '6px',
                                      height: '6px',
                                      borderRadius: '50%',
                                      background: '#cbd5e1',
                                    }}
                                  />
                                </div>
                              )}

                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                  <span style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.875rem' }}>
                                    {mainDept.name}
                                  </span>
                                  <span
                                    style={{
                                      fontSize: '0.7rem',
                                      fontWeight: 700,
                                      padding: '0.1rem 0.4rem',
                                      borderRadius: '4px',
                                      background: 'rgba(37, 99, 235, 0.08)',
                                      color: 'var(--brand-blue)',
                                      border: '1px solid rgba(37, 99, 235, 0.2)',
                                    }}
                                  >
                                    {mainDept.code}
                                  </span>
                                </div>

                                {mainDept.description && (
                                  <div
                                    style={{
                                      fontSize: '0.72rem',
                                      color: 'var(--text-muted)',
                                      marginTop: '0.2rem',
                                      maxWidth: '420px',
                                    }}
                                  >
                                    {mainDept.description}
                                  </div>
                                )}

                                {subs.length > 0 && (
                                  <div
                                    style={{
                                      fontSize: '0.7rem',
                                      color: 'var(--brand-indigo)',
                                      fontWeight: 600,
                                      marginTop: '0.3rem',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.3rem',
                                    }}
                                  >
                                    <GitFork size={12} />
                                    {subs.length} {subs.length === 1 ? 'Sub-Department' : 'Sub-Departments'}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          <td style={{ padding: '0.85rem 1.25rem' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                padding: '0.2rem 0.5rem',
                                borderRadius: '6px',
                                background: 'rgba(37, 99, 235, 0.06)',
                                color: 'var(--brand-blue)',
                                border: '1px solid rgba(37, 99, 235, 0.18)',
                              }}
                            >
                              <Layers size={12} color="var(--brand-blue)" /> Main Dept
                            </span>
                          </td>

                          <td style={{ padding: '0.85rem 1.25rem' }}>
                            {headEmp ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                                <img
                                  src={headEmp.avatar}
                                  alt={headEmp.firstName}
                                  style={{
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '50%',
                                    border: '1px solid #e2e8f0',
                                  }}
                                />
                                <div>
                                  <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                                    {headEmp.firstName} {headEmp.lastName}
                                  </div>
                                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                                    {headEmp.email}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Unassigned</span>
                            )}
                          </td>

                          <td style={{ padding: '0.85rem 1rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                  fontWeight: 700,
                                  color: 'var(--text-main)',
                                }}
                              >
                                <Users size={14} color="var(--text-muted)" /> {direct} Direct
                              </span>
                              {subCount > 0 && (
                                <span style={{ fontSize: '0.68rem', color: 'var(--brand-indigo)', fontWeight: 600 }}>
                                  ({total} across division)
                                </span>
                              )}
                            </div>
                          </td>

                          <td style={{ padding: '0.85rem 1rem' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                padding: '0.15rem 0.45rem',
                                borderRadius: '999px',
                                background: 'var(--success-bg)',
                                color: 'var(--success)',
                                border: '1px solid var(--success-border)',
                              }}
                            >
                              <span
                                style={{
                                  width: '5px',
                                  height: '5px',
                                  borderRadius: '50%',
                                  background: 'var(--success)',
                                }}
                              />
                              Active
                            </span>
                          </td>

                          <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                            <div
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                justifyContent: 'flex-end',
                              }}
                            >
                              <button
                                type="button"
                                onClick={() => openAddDeptModal(mainDept.id)}
                                title="Add a sub-department under this main department"
                                style={{
                                  padding: '0.35rem 0.6rem',
                                  borderRadius: '6px',
                                  border: '1px solid rgba(37, 99, 235, 0.22)',
                                  background: 'rgba(37, 99, 235, 0.08)',
                                  color: 'var(--brand-blue)',
                                  fontSize: '0.73rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                }}
                              >
                                <Plus size={12} /> Sub-dept
                              </button>

                              <button
                                type="button"
                                onClick={() => openEditDeptModal(mainDept)}
                                style={{
                                  padding: '0.35rem 0.75rem',
                                  borderRadius: '6px',
                                  border: '1px solid var(--border-subtle)',
                                  background: 'var(--bg-card)',
                                  color: 'var(--text-main)',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.3rem',
                                }}
                              >
                                <Edit size={12} /> Edit
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* NESTED SUB-DEPARTMENTS (Rendered when expanded) */}
                        {isExpanded &&
                          matchingSubs.map((subDept, subIdx) => {
                            const subHead = companyEmployees.find((e) => e.id === subDept.headId);
                            const subStaffCount = getDeptHeadCount(subDept.name);
                            const isLastSub = subIdx === matchingSubs.length - 1;

                            return (
                              <tr
                                key={subDept.id}
                                style={{
                                  borderBottom: '1px solid var(--border-subtle)',
                                  background: 'rgba(37, 99, 235, 0.02)',
                                }}
                              >
                                <td style={{ padding: '0.75rem 1rem 0.75rem 2.8rem' }}>
                                  <div
                                    style={{
                                      display: 'flex',
                                      alignItems: 'flex-start',
                                      gap: '0.5rem',
                                      position: 'relative',
                                    }}
                                  >
                                    {/* Tree connector indicator */}
                                    <span
                                      style={{
                                        color: 'var(--brand-indigo-soft)',
                                        fontSize: '0.9rem',
                                        lineHeight: 1,
                                        marginTop: '1px',
                                        userSelect: 'none',
                                      }}
                                    >
                                      └──
                                    </span>

                                    <div>
                                      <div
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '0.45rem',
                                          flexWrap: 'wrap',
                                        }}
                                      >
                                        <span
                                          style={{
                                            fontWeight: 700,
                                            color: '#1e293b',
                                            fontSize: '0.825rem',
                                          }}
                                        >
                                          {subDept.name}
                                        </span>
                                        <span
                                          style={{
                                            fontSize: '0.68rem',
                                            fontWeight: 700,
                                            padding: '0.1rem 0.35rem',
                                            borderRadius: '4px',
                                            background: '#f1f5f9',
                                            color: '#0284c7',
                                            border: '1px solid #bae6fd',
                                          }}
                                        >
                                          {subDept.code}
                                        </span>
                                      </div>

                                      <div
                                        style={{
                                          fontSize: '0.68rem',
                                          color: '#64748b',
                                          marginTop: '0.15rem',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '0.35rem',
                                        }}
                                      >
                                        <span>Parent:</span>
                                        <strong style={{ color: '#334155' }}>{mainDept.name}</strong>
                                      </div>

                                      {subDept.description && (
                                        <div
                                          style={{
                                            fontSize: '0.7rem',
                                            color: '#64748b',
                                            marginTop: '0.15rem',
                                            maxWidth: '380px',
                                          }}
                                        >
                                          {subDept.description}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </td>

                                <td style={{ padding: '0.75rem 1rem' }}>
                                  <span
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.3rem',
                                      fontSize: '0.68rem',
                                      fontWeight: 700,
                                      padding: '0.15rem 0.45rem',
                                      borderRadius: '6px',
                                      background: 'rgba(84, 71, 255, 0.08)',
                                      color: 'var(--brand-indigo, #5447FF)',
                                      border: '1px solid rgba(84, 71, 255, 0.2)',
                                    }}
                                  >
                                    <GitFork size={11} /> Sub-Unit
                                  </span>
                                </td>

                                <td style={{ padding: '0.75rem 1.25rem' }}>
                                  {subHead ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                      <img
                                        src={subHead.avatar}
                                        alt={subHead.firstName}
                                        style={{
                                          width: '20px',
                                          height: '20px',
                                          borderRadius: '50%',
                                          border: '1px solid #e2e8f0',
                                        }}
                                      />
                                      <div>
                                        <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.78rem' }}>
                                          {subHead.firstName} {subHead.lastName}
                                        </div>
                                        <span style={{ fontSize: '0.65rem', color: '#64748b' }}>
                                          {subHead.email}
                                        </span>
                                      </div>
                                    </div>
                                  ) : (
                                    <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                                      Unassigned
                                    </span>
                                  )}
                                </td>

                                <td style={{ padding: '0.75rem 1rem' }}>
                                  <span
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.35rem',
                                      fontWeight: 600,
                                      color: '#334155',
                                    }}
                                  >
                                    <Users size={13} color="#94a3b8" /> {subStaffCount} Members
                                  </span>
                                </td>

                                <td style={{ padding: '0.75rem 1rem' }}>
                                  <span
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.3rem',
                                      fontSize: '0.7rem',
                                      fontWeight: 600,
                                      padding: '0.1rem 0.4rem',
                                      borderRadius: '999px',
                                      background: '#f1f5f9',
                                      color: '#475569',
                                    }}
                                  >
                                    Active
                                  </span>
                                </td>

                                <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                                  <button
                                    type="button"
                                    onClick={() => openEditDeptModal(subDept)}
                                    style={{
                                      padding: '0.25rem 0.65rem',
                                      borderRadius: '5px',
                                      border: '1px solid #cbd5e1',
                                      background: '#fff',
                                      color: '#475569',
                                      fontSize: '0.72rem',
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.25rem',
                                    }}
                                  >
                                    <Edit size={11} /> Edit
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL 1: CREATE / EDIT DEPARTMENT (TWO MODES) */}
      {/* ========================================================= */}
      {isDeptModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
            backdropFilter: 'blur(3px)',
          }}
          onClick={() => setIsDeptModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '580px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              maxHeight: '90vh',
              overflowY: 'auto',
              border: '1px solid #e2e8f0',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid #e2e8f0',
              }}
            >
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  {editingDept
                    ? editingDept.parentId
                      ? 'Edit Sub-Department'
                      : 'Edit Main Department'
                    : deptMode === 'sub'
                    ? 'Create Sub-Department'
                    : 'Create Main Department'}
                </h3>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                  {editingDept
                    ? `Update structural details for ${editingDept.name}`
                    : deptMode === 'sub'
                    ? 'Create a nested department reporting to a parent organizational unit'
                    : 'Create a top-level independent division or corporate department'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsDeptModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  borderRadius: '6px',
                }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveDept} style={{ padding: '1.5rem' }}>
              {/* 1. SEPARATE DEPARTMENT CREATION INTO TWO MODES (SEGMENTED SELECTOR CARDS) */}
              {!editingDept ? (
                <div style={{ marginBottom: '1.25rem' }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: '#475569',
                      marginBottom: '0.5rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    Select Department Mode *
                  </label>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '0.75rem',
                    }}
                  >
                    {/* Card 1: Main Department */}
                    <button
                      type="button"
                      onClick={() => {
                        setDeptMode('main');
                        setDeptParentId('');
                        setDeptValidationErrors((prev) => ({ ...prev, parentId: undefined }));
                      }}
                      style={{
                        padding: '0.85rem',
                        borderRadius: '10px',
                        border: deptMode === 'main' ? '2px solid var(--brand-blue)' : '1px solid var(--border-subtle)',
                        background: deptMode === 'main' ? 'rgba(37, 99, 235, 0.06)' : 'var(--bg-card)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        position: 'relative',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '0.25rem',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            fontWeight: 700,
                            color: deptMode === 'main' ? 'var(--brand-blue)' : 'var(--text-main)',
                            fontSize: '0.85rem',
                          }}
                        >
                          <Building size={16} color={deptMode === 'main' ? 'var(--brand-blue)' : 'var(--text-muted)'} />
                          Create Main Department
                        </div>
                        {deptMode === 'main' && (
                          <CheckCircle2 size={16} color="var(--brand-blue)" />
                        )}
                      </div>
                      <p
                        style={{
                          margin: 0,
                          fontSize: '0.72rem',
                          color: deptMode === 'main' ? 'var(--brand-blue-deep)' : 'var(--text-muted)',
                          lineHeight: 1.3,
                        }}
                      >
                        Top-level division. Does not require a parent.
                      </p>
                    </button>

                    {/* Card 2: Sub-Department */}
                    <button
                      type="button"
                      onClick={() => {
                        setDeptMode('sub');
                        if (!deptParentId && mainDepartments.length > 0) {
                          setDeptParentId(mainDepartments[0].id);
                        }
                      }}
                      style={{
                        padding: '0.85rem',
                        borderRadius: '10px',
                        border: deptMode === 'sub' ? '2px solid var(--brand-indigo)' : '1px solid var(--border-subtle)',
                        background: deptMode === 'sub' ? 'rgba(84, 71, 255, 0.06)' : 'var(--bg-card)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        position: 'relative',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '0.25rem',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            fontWeight: 700,
                            color: deptMode === 'sub' ? 'var(--brand-indigo)' : 'var(--text-main)',
                            fontSize: '0.85rem',
                          }}
                        >
                          <GitFork size={16} color={deptMode === 'sub' ? 'var(--brand-indigo)' : 'var(--text-muted)'} />
                          Create Sub-Department
                        </div>
                        {deptMode === 'sub' && (
                          <CheckCircle2 size={16} color="var(--brand-indigo)" />
                        )}
                      </div>
                      <p
                        style={{
                          margin: 0,
                          fontSize: '0.72rem',
                          color: deptMode === 'sub' ? 'var(--brand-indigo)' : 'var(--text-muted)',
                          lineHeight: 1.3,
                        }}
                      >
                        Nested branch linked to a parent division.
                      </p>
                    </button>
                  </div>
                </div>
              ) : (
                /* Editing Mode Notice */
                <div
                  style={{
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    padding: '0.75rem 1rem',
                    marginBottom: '1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {deptMode === 'sub' ? (
                      <GitFork size={16} color="var(--brand-indigo)" />
                    ) : (
                      <Layers size={16} color="var(--brand-blue)" />
                    )}
                    <span style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-main)' }}>
                      Current Classification:{' '}
                      <strong>{deptMode === 'sub' ? 'Sub-Department' : 'Main Department'}</strong>
                    </span>
                  </div>
                  {deptMode === 'sub' && (
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      You can modify its parent below
                    </span>
                  )}
                </div>
              )}

              {/* 3. SUB-DEPARTMENT PARENT SELECTION (WHEN SUB-MODE IS ACTIVE) */}
              {deptMode === 'sub' && (
                <div
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '12px',
                    padding: '1rem',
                    marginBottom: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.5rem',
                    }}
                  >
                    <label
                      style={{
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        color: 'var(--text-main)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                      }}
                    >
                      <FolderTree size={14} color="var(--brand-blue)" /> Parent Department *
                    </label>

                    {/* Back option to return to main department mode */}
                    {!editingDept && (
                      <button
                        type="button"
                        onClick={() => {
                          setDeptMode('main');
                          setDeptParentId('');
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--brand-blue)',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          padding: 0,
                        }}
                      >
                        <ArrowLeft size={12} /> Switch to Main Department Mode
                      </button>
                    )}
                  </div>

                  {/* Warning if no main departments exist */}
                  {validParentCandidates.length === 0 ? (
                    <div
                      style={{
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        borderRadius: '8px',
                        padding: '0.75rem',
                        color: '#b91c1c',
                        fontSize: '0.78rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                      }}
                    >
                      <AlertCircle size={16} />
                      <div style={{ flex: 1 }}>
                        <strong>No Main Departments exist yet.</strong> You must create a Main
                        Department first before creating any sub-departments.
                      </div>
                      <button
                        type="button"
                        onClick={() => setDeptMode('main')}
                        style={{
                          padding: '0.35rem 0.65rem',
                          borderRadius: '6px',
                          border: 'none',
                          background: '#dc2626',
                          color: '#fff',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Create Main Dept
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Search parent departments if list is large */}
                      {validParentCandidates.length > 3 && (
                        <div style={{ position: 'relative' }}>
                          <Search
                            size={13}
                            style={{
                              position: 'absolute',
                              left: '8px',
                              top: '8px',
                              color: '#94a3b8',
                            }}
                          />
                          <input
                            type="text"
                            placeholder="Filter parent departments by name or code..."
                            value={parentSearchTerm}
                            onChange={(e) => setParentSearchTerm(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '0.4rem 0.6rem 0.4rem 1.8rem',
                              borderRadius: '6px',
                              border: '1px solid #cbd5e1',
                              fontSize: '0.75rem',
                              background: '#ffffff',
                              outline: 'none',
                            }}
                          />
                        </div>
                      )}

                      {/* Parent Department Dropdown */}
                      <select
                        value={deptParentId}
                        onChange={(e) => {
                          setDeptParentId(e.target.value);
                          if (deptValidationErrors.parentId) {
                            setDeptValidationErrors((prev) => ({ ...prev, parentId: undefined }));
                          }
                        }}
                        style={{
                          width: '100%',
                          padding: '0.6rem',
                          borderRadius: '8px',
                          border: deptValidationErrors.parentId
                            ? '1.5px solid #ef4444'
                            : '1px solid #cbd5e1',
                          fontSize: '0.85rem',
                          background: '#ffffff',
                          fontWeight: 600,
                          color: '#0f172a',
                        }}
                      >
                        <option value="">-- Choose a Parent Department --</option>
                        {filteredParentCandidates.map((parent) => (
                          <option key={parent.id} value={parent.id}>
                            {parent.name} ({parent.code})
                          </option>
                        ))}
                      </select>

                      {deptValidationErrors.parentId && (
                        <span
                          style={{
                            fontSize: '0.72rem',
                            color: '#ef4444',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                          }}
                        >
                          <AlertCircle size={12} /> {deptValidationErrors.parentId}
                        </span>
                      )}

                      {/* Hierarchy Breadcrumb Preview */}
                      <div
                        style={{
                          background: 'rgba(37, 99, 235, 0.05)',
                          borderRadius: '8px',
                          padding: '0.6rem 0.85rem',
                          border: '1px solid rgba(37, 99, 235, 0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          fontSize: '0.75rem',
                          flexWrap: 'wrap',
                        }}
                      >
                        <span style={{ color: 'var(--brand-blue, #2563EB)', fontWeight: 600 }}>
                          Hierarchy Path:
                        </span>
                        <span
                          style={{
                            fontWeight: 700,
                            color: selectedParentDept ? 'var(--brand-blue-deep, #1D4ED8)' : '#94a3b8',
                          }}
                        >
                          {selectedParentDept ? selectedParentDept.name : '[Select Parent]'}
                        </span>
                        <span style={{ color: 'var(--brand-indigo, #5447FF)', fontWeight: 800 }}>→</span>
                        <span
                          style={{
                            fontWeight: 700,
                            color: deptName.trim() ? '#0f172a' : '#64748b',
                            background: '#ffffff',
                            padding: '0.15rem 0.45rem',
                            borderRadius: '4px',
                            border: '1px solid #cbd5e1',
                          }}
                        >
                          {deptName.trim() || 'New Sub-Department'}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* CORE FIELDS */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Department Name */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: '#334155',
                      marginBottom: '0.3rem',
                    }}
                  >
                    {deptMode === 'sub' ? 'Sub-Department Name *' : 'Department Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={
                      deptMode === 'sub'
                        ? 'e.g. Frontend Architecture, QA Automation, PR'
                        : 'e.g. Engineering & Product, Sales & Growth'
                    }
                    value={deptName}
                    onChange={(e) => {
                      setDeptName(e.target.value);
                      if (deptValidationErrors.name) {
                        setDeptValidationErrors((prev) => ({ ...prev, name: undefined }));
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '0.55rem',
                      borderRadius: '8px',
                      border: deptValidationErrors.name
                        ? '1.5px solid #ef4444'
                        : '1px solid #cbd5e1',
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                  />
                  {deptValidationErrors.name && (
                    <span
                      style={{
                        fontSize: '0.72rem',
                        color: '#ef4444',
                        fontWeight: 600,
                        marginTop: '0.2rem',
                        display: 'block',
                      }}
                    >
                      {deptValidationErrors.name}
                    </span>
                  )}
                </div>

                {/* Department Code */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: '#334155',
                      marginBottom: '0.3rem',
                    }}
                  >
                    {deptMode === 'sub' ? 'Sub-Department Code *' : 'Department Code *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={deptMode === 'sub' ? 'e.g. ENG-FE' : 'e.g. ENG'}
                    value={deptCode}
                    onChange={(e) => {
                      setDeptCode(e.target.value.toUpperCase());
                      if (deptValidationErrors.code) {
                        setDeptValidationErrors((prev) => ({ ...prev, code: undefined }));
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '0.55rem',
                      borderRadius: '8px',
                      border: deptValidationErrors.code
                        ? '1.5px solid #ef4444'
                        : '1px solid #cbd5e1',
                      fontSize: '0.85rem',
                      outline: 'none',
                      textTransform: 'uppercase',
                    }}
                  />
                  {deptValidationErrors.code && (
                    <span
                      style={{
                        fontSize: '0.72rem',
                        color: '#ef4444',
                        fontWeight: 600,
                        marginTop: '0.2rem',
                        display: 'block',
                      }}
                    >
                      {deptValidationErrors.code}
                    </span>
                  )}
                </div>

                {/* Leader / Head Selection */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: '#334155',
                      marginBottom: '0.3rem',
                    }}
                  >
                    {deptMode === 'sub'
                      ? 'Sub-Department Head (optional)'
                      : 'Head of Department (HOD, optional)'}
                  </label>
                  <select
                    value={deptHeadId}
                    onChange={(e) => setDeptHeadId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.85rem',
                      background: '#fff',
                    }}
                  >
                    <option value="">
                      {deptMode === 'sub' ? 'Select Sub-Unit Lead' : 'Select Department Leader'}
                    </option>
                    {companyEmployees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.firstName} {e.lastName} ({e.employeeCode})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Objective / Description */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: '#334155',
                      marginBottom: '0.3rem',
                    }}
                  >
                    Objective / Description <span style={{ color: '#94a3b8', fontWeight: 400 }}>(optional)</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Outline specific responsibilities, mandates, and scope..."
                    value={deptDescription}
                    onChange={(e) => setDeptDescription(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Form Buttons */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '0.75rem',
                  marginTop: '1.25rem',
                  paddingTop: '1rem',
                  borderTop: '1px solid #e2e8f0',
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsDeptModalOpen(false)}
                  style={{
                    padding: '0.55rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#fff',
                    color: '#475569',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deptMode === 'sub' && validParentCandidates.length === 0}
                  style={{
                    padding: '0.55rem 1.4rem',
                    borderRadius: '8px',
                    border: 'none',
                    background:
                      deptMode === 'sub' && validParentCandidates.length === 0
                        ? '#94a3b8'
                        : 'var(--brand-blue, #2563EB)',
                    color: '#fff',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor:
                      deptMode === 'sub' && validParentCandidates.length === 0
                        ? 'not-allowed'
                        : 'pointer',
                    boxShadow: '0 2px 4px rgba(37, 99, 235, 0.25)',
                  }}
                >
                  {editingDept
                    ? 'Save Changes'
                    : deptMode === 'sub'
                    ? 'Create Sub-Department'
                    : 'Create Main Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
