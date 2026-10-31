const fs = require('fs');
const path = require('path');

const builderPath = path.resolve(__dirname, '../src/pages/Courses/CourseBuilderPage.tsx');
let code = fs.readFileSync(builderPath, 'utf-8');

// 1. Add Trainer Authorized Scopes state & hooks right before STEP 3
const oldStep3Start = `  // -------------------------------------------------------------
  // STEP 3: Assign Faculty & Students
  // -------------------------------------------------------------
  // Lead Faculty selection state
  const [facultyDeptFilter, setFacultyDeptFilter] = useState<string>(departmentId);
  const [facultySearchQuery, setFacultySearchQuery] = useState('');
  const [selectedLeadFacultyId, setSelectedLeadFacultyId] = useState<string>('u-004'); // Prof. David Wilson default

  // Student assignment state (Optional)
  const [studentDeptFilter, setStudentDeptFilter] = useState<string>(departmentId);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set(['st-1', 'st-2', 'u-007']));
  const [selectedCohortId, setSelectedCohortId] = useState<string>('all');`;

const newStep3Start = `  // -------------------------------------------------------------
  // STEP 3: Assign Faculty & Students (Role-Scoped)
  // -------------------------------------------------------------
  // Authorized Cohorts for Trainer
  const trainerAuthorizedCohorts = useMemo(() => {
    if (!isFaculty) return cohorts;
    const currentUserId = user?.id || '';
    const isTrainerWilson = currentUserId === 'u-004' || user?.email === 'trainer@lms.demo';
    const isTrainerSharma = currentUserId === 'u-003' || user?.email === 'priya.sharma@lms.demo';
    const isTrainerRodriguez = currentUserId === 'u-005' || user?.email === 'emily.rodriguez@lms.demo';

    return cohorts.filter((coh) => {
      if (coh.instructors && coh.instructors.includes(currentUserId)) return true;
      if (coh.instructorIds && coh.instructorIds.includes(currentUserId)) return true;
      if ((coh as unknown as { instructorId?: string }).instructorId === currentUserId) return true;

      if (isTrainerWilson && (coh.id === 'coh-001' || coh.id === 'coh-002')) return true;
      if (isTrainerSharma && (coh.id === 'coh-003' || coh.id === 'coh-005')) return true;
      if (isTrainerRodriguez && coh.id === 'coh-004') return true;

      return false;
    });
  }, [cohorts, isFaculty, user]);

  // Authorized Departments for Trainer
  const trainerAuthorizedDepartments = useMemo(() => {
    if (!isFaculty) return mockDepartments;
    const deptIds = new Set<string>();
    if (user?.departmentId) deptIds.add(user.departmentId);
    trainerAuthorizedCohorts.forEach((c) => {
      if (c.departmentId) deptIds.add(c.departmentId);
    });
    const depts = mockDepartments.filter((d) => deptIds.has(d.id));
    return depts.length > 0 ? depts : mockDepartments.filter((d) => d.id === (user?.departmentId || 'dep-001'));
  }, [isFaculty, user, trainerAuthorizedCohorts]);

  // Authorized Student IDs for Trainer
  const trainerAuthorizedStudentIds = useMemo(() => {
    if (!isFaculty) return null;
    const setOfIds = new Set<string>();
    trainerAuthorizedCohorts.forEach((coh) => {
      coh.studentIds?.forEach((stId) => setOfIds.add(stId));
    });
    return setOfIds;
  }, [isFaculty, trainerAuthorizedCohorts]);

  // Already Enrolled Student IDs for the course being edited
  const alreadyEnrolledStudentIds = useMemo(() => {
    if (!editingCourseId) return new Set<string>();
    const { enrollments } = useCourseStore.getState();
    return new Set(
      enrollments.filter((e) => e.courseId.toLowerCase() === editingCourseId.toLowerCase()).map((e) => e.userId)
    );
  }, [editingCourseId]);

  // Lead Faculty selection state
  const [facultyDeptFilter, setFacultyDeptFilter] = useState<string>(departmentId);
  const [facultySearchQuery, setFacultySearchQuery] = useState('');
  const [selectedLeadFacultyId, setSelectedLeadFacultyId] = useState<string>(
    isFaculty ? (user?.id || 'u-004') : 'u-004'
  );

  // Auto-set lead faculty to logged-in trainer if faculty
  useEffect(() => {
    if (isFaculty && user?.id) {
      setSelectedLeadFacultyId(user.id);
    }
  }, [isFaculty, user?.id]);

  // Auto-restrict initial department to authorized departments if faculty
  useEffect(() => {
    if (isFaculty && trainerAuthorizedDepartments.length > 0) {
      if (!trainerAuthorizedDepartments.some((d) => d.id === departmentId)) {
        const firstDept = trainerAuthorizedDepartments[0].id;
        setDepartmentId(firstDept);
        setFacultyDeptFilter(firstDept);
        setStudentDeptFilter(firstDept);
      }
    }
  }, [isFaculty, trainerAuthorizedDepartments, departmentId]);

  // Student assignment state (Optional)
  const [studentDeptFilter, setStudentDeptFilter] = useState<string>(departmentId);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(
    isFaculty ? new Set() : new Set(['st-1', 'st-2', 'u-007'])
  );
  const [selectedCohortId, setSelectedCohortId] = useState<string>('all');`;

code = code.replace(oldStep3Start, newStep3Start);

// 2. Update filteredStudents & baseStudents
const oldFilteredStudentsBlock = `  // Filtered students for Step 3
  const filteredStudents = useMemo(() => {
    return allStudents.filter((st) => {
      // Department filter
      if (studentDeptFilter !== 'all' && st.departmentId !== studentDeptFilter) {
        return false;
      }
      // Cohort filter
      if (selectedCohortId !== 'all') {
        const targetCohort = cohorts.find((c) => c.id === selectedCohortId);
        if (!targetCohort || !targetCohort.studentIds?.includes(st.id)) {
          return false;
        }
      }
      // Search query (name, id, email)
      if (studentSearchQuery.trim()) {
        const q = studentSearchQuery.toLowerCase().trim();
        const nameMatch = (st.displayName || \`\${st.firstName} \${st.lastName}\`).toLowerCase().includes(q);
        const emailMatch = st.email.toLowerCase().includes(q);
        const idMatch = (st.rollNo || st.id).toLowerCase().includes(q);
        return nameMatch || emailMatch || idMatch;
      }
      return true;
    });
  }, [allStudents, studentDeptFilter, selectedCohortId, studentSearchQuery, cohorts]);`;

const newFilteredStudentsBlock = `  // Base student pool - strictly restricted for trainers!
  const baseStudents = useMemo(() => {
    if (!isFaculty || trainerAuthorizedStudentIds === null) {
      return allStudents;
    }
    return allStudents.filter((st) => trainerAuthorizedStudentIds.has(st.id));
  }, [allStudents, isFaculty, trainerAuthorizedStudentIds]);

  // Filtered students for Step 3
  const filteredStudents = useMemo(() => {
    return baseStudents.filter((st) => {
      // Department filter
      if (studentDeptFilter !== 'all' && st.departmentId !== studentDeptFilter) {
        return false;
      }
      // Cohort filter
      if (selectedCohortId !== 'all') {
        const pool = isFaculty ? trainerAuthorizedCohorts : cohorts;
        const targetCohort = pool.find((c) => c.id === selectedCohortId);
        if (!targetCohort || !targetCohort.studentIds?.includes(st.id)) {
          return false;
        }
      }
      // Search query (name, id, email)
      if (studentSearchQuery.trim()) {
        const q = studentSearchQuery.toLowerCase().trim();
        const nameMatch = (st.displayName || \`\${st.firstName} \${st.lastName}\`).toLowerCase().includes(q);
        const emailMatch = st.email.toLowerCase().includes(q);
        const idMatch = (st.rollNo || st.id).toLowerCase().includes(q);
        return nameMatch || emailMatch || idMatch;
      }
      return true;
    });
  }, [baseStudents, studentDeptFilter, selectedCohortId, studentSearchQuery, cohorts, isFaculty, trainerAuthorizedCohorts]);`;

code = code.replace(oldFilteredStudentsBlock, newFilteredStudentsBlock);

// 3. Update handleToggleStudent and handleSelectAllFilteredStudents to avoid alreadyEnrolled and inactive
const oldSelectionHelpers = `  // Student selection helpers
  const handleToggleStudent = (studentId: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  };

  const handleSelectAllFilteredStudents = () => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      filteredStudents.forEach((st) => {
        // Only select active/eligible students
        if (st.status !== 'suspended' && st.status !== 'deactivated') {
          next.add(st.id);
        }
      });
      return next;
    });
  };`;

const newSelectionHelpers = `  // Student selection helpers
  const handleToggleStudent = (studentId: string) => {
    if (alreadyEnrolledStudentIds.has(studentId)) return;
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  };

  const handleSelectAllFilteredStudents = () => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      filteredStudents.forEach((st) => {
        const isInactive = st.status === 'suspended' || st.status === 'deactivated';
        const isAlreadyEnrolled = alreadyEnrolledStudentIds.has(st.id);
        if (!isInactive && !isAlreadyEnrolled) {
          next.add(st.id);
        }
      });
      return next;
    });
  };`;

code = code.replace(oldSelectionHelpers, newSelectionHelpers);

// 4. Update Step 1 Department selection
const oldStep1DeptSelect = `<select
                className="form-select"
                value={departmentId}
                onChange={(e) => handleDepartmentChange(e.target.value)}
                style={{ fontWeight: 600 }}
              >
                {mockDepartments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name} ({dept.id})
                  </option>
                ))}
              </select>
              <span className="text-muted text-xs" style={{ display: 'block', marginTop: '4px' }}>
                Used to filter and prioritize faculty & students in Step 3
              </span>`;

const newStep1DeptSelect = `<select
                className="form-select"
                value={departmentId}
                onChange={(e) => handleDepartmentChange(e.target.value)}
                style={{ fontWeight: 600 }}
              >
                {(isFaculty ? trainerAuthorizedDepartments : mockDepartments).map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name} ({dept.id})
                  </option>
                ))}
              </select>
              <span className="text-muted text-xs" style={{ display: 'block', marginTop: '4px' }}>
                {isFaculty
                  ? 'Restricted to your authorized academic departments'
                  : 'Used to filter and prioritize faculty & students in Step 3'}
              </span>`;

code = code.replace(oldStep1DeptSelect, newStep1DeptSelect);

// 5. Update Stepper Step 3 title
code = code.replace(
  "{ stepNum: 3, title: '3. Assign Faculty & Students', subtitle: 'Lead faculty & pre-enroll' }",
  "{ stepNum: 3, title: isFaculty ? '3. Assign Students' : '3. Assign Faculty & Students', subtitle: isFaculty ? 'Pre-enroll cohort students' : 'Lead faculty & pre-enroll' }"
);

// 6. Update Section A in Step 3
const sectionARegex = /\{\/\* SECTION A: SELECT LEAD FACULTY \*\/\}[\s\S]*?\{\/\* SECTION B: SELECT STUDENTS \(OPTIONAL\) \*\/\}/;

const newSectionA = `{/* SECTION A: LEAD FACULTY */}
          {!isFaculty ? (
            /* Admin Lead Faculty Selector */
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: 'var(--primary-light, rgba(99, 102, 241, 0.15))',
                      color: 'var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Award size={18} />
                  </span>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', margin: 0, fontWeight: 700 }}>A. Select Lead Faculty</h3>
                    <p className="text-secondary text-xs" style={{ margin: 0 }}>
                      Select one certified lead faculty member to oversee curriculum and grading.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label className="text-xs text-muted" style={{ fontWeight: 600 }}>
                    Faculty Department:
                  </label>
                  <select
                    className="form-select"
                    value={facultyDeptFilter}
                    onChange={(e) => setFacultyDeptFilter(e.target.value)}
                    style={{ fontSize: '0.82rem', padding: '5px 10px', minWidth: '180px' }}
                  >
                    <option value="all">All Departments ({mockDepartments.length})</option>
                    {mockDepartments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} {d.id === departmentId ? '(Course Dept)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ position: 'relative', marginBottom: '16px' }}>
                <Search
                  size={16}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)'
                  }}
                />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search faculty by name, employee/faculty ID (e.g. FAC-2026-004), or email..."
                  value={facultySearchQuery}
                  onChange={(e) => setFacultySearchQuery(e.target.value)}
                  style={{ paddingLeft: '36px' }}
                />
                {facultySearchQuery && (
                  <button
                    type="button"
                    onClick={() => setFacultySearchQuery('')}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)'
                    }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: '12px',
                  maxHeight: '280px',
                  overflowY: 'auto',
                  padding: '4px'
                }}
              >
                {filteredFaculty.map((fac) => {
                  const isSelected = selectedLeadFacultyId === fac.id;
                  const isInactive = fac.status === 'suspended' || fac.status === 'deactivated';

                  return (
                    <div
                      key={fac.id}
                      onClick={() => {
                        if (!isInactive) {
                          setSelectedLeadFacultyId(fac.id);
                        }
                      }}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 'var(--radius-md)',
                        background: isSelected
                          ? 'var(--primary-light, rgba(99, 102, 241, 0.12))'
                          : isInactive
                            ? 'var(--bg-input)'
                            : 'var(--bg-card)',
                        border: isSelected
                          ? '2px solid var(--primary)'
                          : isInactive
                            ? '1px dashed var(--border-subtle)'
                            : '1px solid var(--border-subtle)',
                        cursor: isInactive ? 'not-allowed' : 'pointer',
                        opacity: isInactive ? 0.6 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: isSelected ? 'var(--primary)' : 'var(--bg-input)',
                            color: isSelected ? '#fff' : 'var(--text-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.85rem'
                          }}
                        >
                          {fac.displayName ? fac.displayName.slice(0, 1) : fac.firstName.slice(0, 1)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>
                            {fac.displayName || \`\${fac.firstName} \${fac.lastName}\`}
                          </div>
                          <div className="text-secondary text-xs">
                            {fac.rollNo || fac.id} &bull; {getDepartmentName(fac.departmentId)}
                          </div>
                          <div className="text-muted text-xs">{fac.email}</div>
                        </div>
                      </div>

                      {isSelected && (
                        <span
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            background: 'var(--primary)',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <Check size={14} />
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Trainer Workflow: Automatic Appointed Lead Faculty Card (Read-Only) */
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: 'var(--primary-light, rgba(99, 102, 241, 0.15))',
                      color: 'var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Award size={18} />
                  </span>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', margin: 0, fontWeight: 700 }}>A. Appointed Lead Faculty</h3>
                    <p className="text-secondary text-xs" style={{ margin: 0 }}>
                      As the course creator, you are automatically designated as Lead Faculty to direct curriculum content and oversee grading.
                    </p>
                  </div>
                </div>
                <span className="badge badge-active" style={{ fontSize: '0.75rem' }}>
                  Automatic Lead Assignment
                </span>
              </div>

              <div
                style={{
                  padding: '16px 20px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--primary-light, rgba(99, 102, 241, 0.08))',
                  border: '2px solid var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '16px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '50%',
                      background: 'var(--primary)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '1rem',
                      boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)'
                    }}
                  >
                    <GraduationCap size={22} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h4 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                        {user?.displayName || \`\${user?.firstName || 'Dr.'} \${user?.lastName || 'Wilson'}\`}
                      </h4>
                      <span className="badge badge-primary" style={{ fontSize: '0.68rem', fontWeight: 700 }}>
                        Lead Faculty
                      </span>
                    </div>
                    <div className="text-secondary text-xs" style={{ marginTop: '2px' }}>
                      <strong>Faculty ID:</strong> {user?.rollNo || 'FAC-2026-004'} &bull; <strong>Department:</strong> {getDepartmentName(departmentId || user?.departmentId)}
                    </div>
                    <div className="text-muted text-xs" style={{ marginTop: '2px' }}>
                      {user?.email} &bull; {user?.specialization || 'Full-Stack Systems & Architecture'}
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div className="badge badge-neutral" style={{ fontSize: '0.72rem', border: '1px solid var(--border-subtle)' }}>
                    Assigned Scope: Authorized Cohorts Only
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION B: SELECT STUDENTS (OPTIONAL) */}`;

code = code.replace(sectionARegex, newSectionA);

// 7. Update Section B filters for Trainer (only authorized departments & cohorts)
const oldSectionBDeptCohortFilters = `<div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <label className="text-xs text-muted" style={{ fontWeight: 600 }}>
                    Dept:
                  </label>
                  <select
                    className="form-select"
                    value={studentDeptFilter}
                    onChange={(e) => setStudentDeptFilter(e.target.value)}
                    style={{ fontSize: '0.82rem', padding: '5px 8px', minWidth: '150px' }}
                  >
                    <option value="all">All Departments ({mockDepartments.length})</option>
                    {mockDepartments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} {d.id === departmentId ? '(Course Dept)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <label className="text-xs text-muted" style={{ fontWeight: 600 }}>
                    Cohort:
                  </label>
                  <select
                    className="form-select"
                    value={selectedCohortId}
                    onChange={(e) => setSelectedCohortId(e.target.value)}
                    style={{ fontSize: '0.82rem', padding: '5px 8px', minWidth: '150px' }}
                  >
                    <option value="all">All Cohorts / Batches</option>
                    {cohorts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>`;

const newSectionBDeptCohortFilters = `<div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <label className="text-xs text-muted" style={{ fontWeight: 600 }}>
                    Dept:
                  </label>
                  <select
                    className="form-select"
                    value={studentDeptFilter}
                    onChange={(e) => setStudentDeptFilter(e.target.value)}
                    style={{ fontSize: '0.82rem', padding: '5px 8px', minWidth: '150px' }}
                  >
                    <option value="all">
                      {isFaculty ? \`All Authorized Depts (\${trainerAuthorizedDepartments.length})\` : \`All Departments (\${mockDepartments.length})\`}
                    </option>
                    {(isFaculty ? trainerAuthorizedDepartments : mockDepartments).map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} {d.id === departmentId ? '(Course Dept)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <label className="text-xs text-muted" style={{ fontWeight: 600 }}>
                    Cohort:
                  </label>
                  <select
                    className="form-select"
                    value={selectedCohortId}
                    onChange={(e) => setSelectedCohortId(e.target.value)}
                    style={{ fontSize: '0.82rem', padding: '5px 8px', minWidth: '150px' }}
                  >
                    <option value="all">
                      {isFaculty ? \`All Assigned Cohorts (\${trainerAuthorizedCohorts.length})\` : 'All Cohorts / Batches'}
                    </option>
                    {(isFaculty ? trainerAuthorizedCohorts : cohorts).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>`;

code = code.replace(oldSectionBDeptCohortFilters, newSectionBDeptCohortFilters);

// 8. Add selected students summary chips right above Student Search
const searchToolbarTarget = `{/* Student Search & Bulk Selection Toolbar */}`;
const selectedSummaryChips = `{/* Selected Students Summary Chips */}
            {selectedStudentIds.size > 0 && (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '6px',
                  marginBottom: '12px',
                  padding: '10px 14px',
                  background: 'var(--bg-input)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  alignItems: 'center'
                }}
              >
                <span className="text-xs text-muted" style={{ fontWeight: 700, marginRight: '4px' }}>
                  Selected Learners ({selectedStudentIds.size}):
                </span>
                {Array.from(selectedStudentIds).map((sId) => {
                  const st = allStudents.find((s) => s.id === sId);
                  if (!st) return null;
                  return (
                    <span
                      key={st.id}
                      className="badge badge-secondary"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.74rem',
                        padding: '3px 8px'
                      }}
                    >
                      <span>{st.displayName || \`\${st.firstName} \${st.lastName}\`}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleStudent(st.id);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          cursor: 'pointer',
                          color: 'var(--text-muted)',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                        title={\`Remove \${st.displayName || st.firstName}\`}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            {/* Student Search & Bulk Selection Toolbar */}`;

code = code.replace(searchToolbarTarget, selectedSummaryChips);

// 9. Update Student Row in Table to display Already Enrolled status and disable duplicate checkbox
const oldTableRow = `                  {filteredStudents.map((st) => {
                    const isChecked = selectedStudentIds.has(st.id);
                    const isInactive = st.status === 'suspended' || st.status === 'deactivated';

                    return (
                      <tr
                        key={st.id}
                        onClick={() => {
                          if (!isInactive) handleToggleStudent(st.id);
                        }}
                        style={{
                          background: isChecked ? 'var(--primary-light, rgba(99, 102, 241, 0.08))' : 'transparent',
                          cursor: isInactive ? 'not-allowed' : 'pointer',
                          opacity: isInactive ? 0.6 : 1,
                          borderBottom: '1px solid var(--border-subtle)',
                          fontSize: '0.85rem'
                        }}
                      >
                        <td style={{ textAlign: 'center', padding: '8px' }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={isInactive}
                            onChange={() => handleToggleStudent(st.id)}
                            style={{ accentColor: 'var(--primary)', cursor: 'pointer' }}
                          />
                        </td>
                        <td style={{ padding: '8px 12px', fontWeight: 600 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div
                              style={{
                                width: '26px',
                                height: '26px',
                                borderRadius: '50%',
                                background: 'var(--bg-input)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyCenter: 'center',
                                fontSize: '0.72rem',
                                fontWeight: 700
                              }}
                            >
                              {st.displayName ? st.displayName.slice(0, 1) : st.firstName.slice(0, 1)}
                            </div>
                            <span>{st.displayName || \`\${st.firstName} \${st.lastName}\`}</span>
                          </div>
                        </td>
                        <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                          {st.rollNo || st.id}
                        </td>
                        <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>{st.email}</td>
                        <td style={{ padding: '8px 12px' }}>
                          <span className="badge badge-secondary" style={{ fontSize: '0.7rem' }}>
                            {getDepartmentName(st.departmentId)}
                          </span>
                        </td>
                        <td style={{ padding: '8px 12px', fontSize: '0.8rem' }}>{getStudentCohort(st.id)}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                          {isInactive ? (
                            <span className="badge badge-danger" style={{ fontSize: '0.68rem' }}>
                              Suspended
                            </span>
                          ) : (
                            <span className="badge badge-active" style={{ fontSize: '0.68rem' }}>
                              Eligible
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}`;

const newTableRow = `                  {filteredStudents.map((st) => {
                    const isAlreadyEnrolled = alreadyEnrolledStudentIds.has(st.id);
                    const isChecked = selectedStudentIds.has(st.id);
                    const isInactive = st.status === 'suspended' || st.status === 'deactivated';
                    const isDisabled = isInactive || isAlreadyEnrolled;

                    return (
                      <tr
                        key={st.id}
                        onClick={() => {
                          if (!isDisabled) handleToggleStudent(st.id);
                        }}
                        style={{
                          background: isChecked ? 'var(--primary-light, rgba(99, 102, 241, 0.08))' : 'transparent',
                          cursor: isDisabled ? 'not-allowed' : 'pointer',
                          opacity: isInactive ? 0.6 : 1,
                          borderBottom: '1px solid var(--border-subtle)',
                          fontSize: '0.85rem'
                        }}
                      >
                        <td style={{ textAlign: 'center', padding: '8px' }}>
                          <input
                            type="checkbox"
                            checked={isChecked || isAlreadyEnrolled}
                            disabled={isDisabled}
                            onChange={() => !isDisabled && handleToggleStudent(st.id)}
                            style={{ accentColor: 'var(--primary)', cursor: isDisabled ? 'not-allowed' : 'pointer' }}
                          />
                        </td>
                        <td style={{ padding: '8px 12px', fontWeight: 600 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div
                              style={{
                                width: '26px',
                                height: '26px',
                                borderRadius: '50%',
                                background: 'var(--bg-input)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.72rem',
                                fontWeight: 700
                              }}
                            >
                              {st.displayName ? st.displayName.slice(0, 1) : st.firstName.slice(0, 1)}
                            </div>
                            <span>{st.displayName || \`\${st.firstName} \${st.lastName}\`}</span>
                          </div>
                        </td>
                        <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                          {st.rollNo || st.id}
                        </td>
                        <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>{st.email}</td>
                        <td style={{ padding: '8px 12px' }}>
                          <span className="badge badge-secondary" style={{ fontSize: '0.7rem' }}>
                            {getDepartmentName(st.departmentId)}
                          </span>
                        </td>
                        <td style={{ padding: '8px 12px', fontSize: '0.8rem' }}>{getStudentCohort(st.id)}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                          {isAlreadyEnrolled ? (
                            <span className="badge badge-primary" style={{ fontSize: '0.68rem' }}>
                              Already Enrolled
                            </span>
                          ) : isInactive ? (
                            <span className="badge badge-danger" style={{ fontSize: '0.68rem' }}>
                              Suspended
                            </span>
                          ) : (
                            <span className="badge badge-active" style={{ fontSize: '0.68rem' }}>
                              Eligible
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}`;

// Replace table row with regex to tolerate CRLF
code = code.replace(
  /\{filteredStudents\.map\(\(st\) => \{[\s\S]*?return \(\s*<tr[\s\S]*?<\/tr>\s*\);\s*\}\)\}/,
  newTableRow
);

// 10. Update handleConfirmPublish to set lead faculty to logged-in trainer if faculty
code = code.replace(
  "const assignedInstructors = selectedLeadFacultyId ? [selectedLeadFacultyId] : ['u-004'];",
  "const assignedInstructors = isFaculty ? [user?.id || 'u-004'] : (selectedLeadFacultyId ? [selectedLeadFacultyId] : ['u-004']);"
);

code = code.replace(
  "createdBy: 'u-001',",
  "createdBy: user?.id || (isFaculty ? 'u-004' : 'u-001'),"
);

// 11. Update Step 4 preview lead faculty name
code = code.replace(
  "<strong>{selectedFacultyMember ? selectedFacultyMember.displayName || selectedFacultyMember.firstName : 'Unassigned'}</strong>",
  "<strong>{isFaculty ? (user?.displayName || 'Dr. James Wilson') : (selectedFacultyMember ? selectedFacultyMember.displayName || selectedFacultyMember.firstName : 'Unassigned')}</strong>"
);

// 12. Update Success View button
code = code.replace(
  "<BookOpen size={16} /> View in Courses & Catalog",
  "<BookOpen size={16} /> {isFaculty ? 'Go to My Courses' : 'View in Courses & Catalog'}"
);

fs.writeFileSync(builderPath, code, 'utf-8');
console.log('Successfully updated CourseBuilderPage.tsx');

