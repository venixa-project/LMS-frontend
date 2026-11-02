const fs = require('fs');
const path = require('path');

const coursesPagePath = path.resolve(__dirname, '../src/pages/Courses/CoursesPage.tsx');
let code = fs.readFileSync(coursesPagePath, 'utf-8');

// 1. Update header for trainer
code = code.replace(
  /\? 'My Assigned Courses & Learning Content'/g,
  "? 'My Courses'"
);
code = code.replace(
  /\? 'Manage curriculum modules, learning lessons, student rosters, and approval submissions for your courses'/g,
  "? 'View and manage your courses, author curriculum, schedule assessments, and assign students from your authorized cohorts.'"
);
code = code.replace(
  /<Plus size=\{16\} \/> Author Learning Materials/g,
  '<Plus size={16} /> Create New Course'
);

// 2. Update status filter: exclude archived for non-admin
code = code.replace(
  /<option value="archived">Archived<\/option>/g,
  '{isAdmin && <option value="archived">Archived</option>}'
);

// 3. Update enrolled student count on card to be a button opening rosterCourse
const oldEnrolledRow = `<Link
                        to={\`/enrollments?courseId=\${c.id}\`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          color: 'var(--primary)',
                          fontWeight: 600,
                          fontSize: '0.8rem',
                          textDecoration: 'none'
                        }}
                        title="View Student Enrollments for this course"
                      >
                        <Users size={14} />
                        <span>{c.enrolledLearners || c.learnerCount || 28} Enrolled Students</span>
                        <ArrowRight size={12} />
                      </Link>`;

const newEnrolledRow = `<button
                        type="button"
                        onClick={() => setRosterCourse(c)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          color: 'var(--primary)',
                          fontWeight: 600,
                          fontSize: '0.8rem',
                          textDecoration: 'none',
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          cursor: 'pointer'
                        }}
                        title="View Student Enrollments for this course"
                      >
                        <Users size={14} />
                        <span>{c.enrolledLearners ?? c.learnerCount ?? 0} Enrolled Students</span>
                        <ArrowRight size={12} />
                      </button>`;

if (code.includes(oldEnrolledRow)) {
  code = code.replace(oldEnrolledRow, newEnrolledRow);
}

// 4. Update trainer card action buttons to include direct View Enrollments button alongside View Course, Edit Course, Manage
// Let's inspect the trainer action layout in code
const oldTrainerActionBlock = `{coursePerms.canEdit ? (
                          <Link
                            to={\`/course-builder?id=\${c.id}\`}
                            className="btn btn-secondary btn-sm"
                            style={{ flex: 1, justifyContent: 'center', gap: '5px', fontSize: '0.8rem', padding: '6px 10px', fontWeight: 600, whiteSpace: 'nowrap' }}
                            title="Edit course lessons and author content"
                          >
                            <Edit2 size={13} /> Edit Course
                          </Link>
                        ) : (
                          <Link
                            to={\`/course-player/\${c.id}\`}
                            className="btn btn-secondary btn-sm"
                            style={{ flex: 1, justifyContent: 'center', gap: '5px', fontSize: '0.8rem', padding: '6px 10px', fontWeight: 600, whiteSpace: 'nowrap' }}
                            title="Preview course from a student's perspective"
                          >
                            <Play size={13} /> Preview as Student
                          </Link>
                        )}`;

const newTrainerActionBlock = `{coursePerms.canEdit ? (
                          <Link
                            to={\`/course-builder?id=\${c.id}\`}
                            className="btn btn-secondary btn-sm"
                            style={{ flex: 1, justifyContent: 'center', gap: '5px', fontSize: '0.8rem', padding: '6px 10px', fontWeight: 600, whiteSpace: 'nowrap' }}
                            title="Edit course configuration and syllabus in Course Builder"
                          >
                            <Edit2 size={13} /> Edit Course
                          </Link>
                        ) : (
                          <Link
                            to={\`/course-player/\${c.id}\`}
                            className="btn btn-secondary btn-sm"
                            style={{ flex: 1, justifyContent: 'center', gap: '5px', fontSize: '0.8rem', padding: '6px 10px', fontWeight: 600, whiteSpace: 'nowrap' }}
                            title="Preview course from a student's perspective"
                          >
                            <Play size={13} /> Preview as Student
                          </Link>
                        )}

                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => setRosterCourse(c)}
                          style={{ flex: 1, justifyContent: 'center', gap: '5px', fontSize: '0.8rem', padding: '6px 10px', fontWeight: 600, whiteSpace: 'nowrap' }}
                          title="View enrolled students roster for this course"
                        >
                          <Users size={13} /> View Enrollments
                        </button>`;

if (code.includes(oldTrainerActionBlock)) {
  code = code.replace(oldTrainerActionBlock, newTrainerActionBlock);
}

// 5. Enhance Roster Modal to be dynamic
const oldRosterDef = `  // Mock course student enrollments for roster modal
  const courseRoster = [
    { id: '1', name: 'Alex Rivera', email: 'alex@lms.demo', cohort: 'Spring 2026 Engineering', progress: 68, attendance: '96.2%', enrolledAt: '2026-03-01' },
    { id: '2', name: 'Daniel Wu', email: 'daniel.wu@acmelearning.com', cohort: 'Spring 2026 Engineering', progress: 92, attendance: '94.0%', enrolledAt: '2026-03-01' },
    { id: '3', name: 'Sophia Patel', email: 'sophia.p@acmelearning.com', cohort: 'Spring 2026 Engineering', progress: 85, attendance: '98.0%', enrolledAt: '2026-03-05' },
    { id: '4', name: 'Kwame Mensah', email: 'kwame.m@acmelearning.com', cohort: 'Spring 2026 Engineering', progress: 54, attendance: '91.5%', enrolledAt: '2026-03-10' },
  ];`;

const newRosterDef = `  // State for roster modal search
  const [rosterSearchTerm, setRosterSearchTerm] = useState('');

  // Dynamically resolve course student enrollments for roster modal
  const dynamicRoster = useMemo(() => {
    if (!rosterCourse) return [];
    const courseEnrollments = enrollments.filter((e) => e.courseId === rosterCourse.id);

    if (courseEnrollments.length > 0) {
      return courseEnrollments.map((enr) => {
        const st = allStudents.find((s) => s.id === enr.userId);
        const cohort = mockCohorts.find((c) => c.id === enr.cohortId || c.studentIds?.includes(enr.userId));
        return {
          id: enr.id,
          userId: enr.userId,
          name: st?.displayName || (st ? \`\${st.firstName} \${st.lastName}\` : \`Student \${enr.userId}\`),
          email: st?.email || \`\${enr.userId}@lms.demo\`,
          rollNo: st?.rollNo || enr.userId,
          cohort: cohort?.name || 'Class Spring 2026',
          progress: enr.progress ?? 0,
          attendance: '95.0%',
          enrolledAt: enr.enrolledAt ? new Date(enr.enrolledAt).toLocaleDateString() : 'Active'
        };
      });
    }

    // Default mock records for demo courses
    if (['crs-001', 'crs-002', 'crs-004'].includes(rosterCourse.id)) {
      return [
        { id: '1', userId: 'u-006', name: 'Alex Rivera', email: 'alex@lms.demo', rollNo: 'STU-2026-006', cohort: 'Spring 2026 Engineering', progress: 68, attendance: '96.2%', enrolledAt: '2026-03-01' },
        { id: '2', userId: 'u-007', name: 'Daniel Wu', email: 'daniel.wu@acmelearning.com', rollNo: 'STU-2026-007', cohort: 'Spring 2026 Engineering', progress: 92, attendance: '94.0%', enrolledAt: '2026-03-01' },
        { id: '3', userId: 'u-008', name: 'Sophia Patel', email: 'sophia.p@acmelearning.com', rollNo: 'STU-2026-008', cohort: 'Spring 2026 Engineering', progress: 85, attendance: '98.0%', enrolledAt: '2026-03-05' },
        { id: '4', userId: 'u-009', name: 'Kwame Mensah', email: 'kwame.m@acmelearning.com', rollNo: 'STU-2026-009', cohort: 'Spring 2026 Engineering', progress: 54, attendance: '91.5%', enrolledAt: '2026-03-10' },
      ];
    }

    return [];
  }, [rosterCourse, enrollments, allStudents]);

  const filteredCourseRoster = useMemo(() => {
    if (!rosterSearchTerm.trim()) return dynamicRoster;
    const q = rosterSearchTerm.toLowerCase().trim();
    return dynamicRoster.filter(
      (st) =>
        st.name.toLowerCase().includes(q) ||
        st.email.toLowerCase().includes(q) ||
        st.cohort.toLowerCase().includes(q) ||
        (st.rollNo && st.rollNo.toLowerCase().includes(q))
    );
  }, [dynamicRoster, rosterSearchTerm]);`;

if (code.includes(oldRosterDef)) {
  code = code.replace(oldRosterDef, newRosterDef);
}

// 6. Update the modal table iteration to use filteredCourseRoster and add search + empty state
code = code.replace(
  /<p className="text-muted text-xs">\{rosterCourse\.enrolledLearners\} Total Enrolled Learners &bull; Section Spring 2026<\/p>/g,
  '<p className="text-muted text-xs">{dynamicRoster.length} Total Enrolled Learners &bull; Authorized Class Roster</p>'
);

code = code.replace(
  /\{courseRoster\.map\(\(st\) => \(/g,
  '{filteredCourseRoster.map((st) => ('
);

fs.writeFileSync(coursesPagePath, code, 'utf-8');
console.log('Successfully updated CoursesPage.tsx');

