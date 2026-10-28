const fs = require('fs');
const path = require('path');

function runCourseCatalogueAuditTests() {
  console.log('--- Starting Course Catalogue UI Audit & Role Actions Verification ---\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  const coursesPagePath = path.resolve(__dirname, '../src/pages/Courses/CoursesPage.tsx');
  const publicDetailsPath = path.resolve(__dirname, '../src/pages/Courses/PublicCourseDetailsPage.tsx');
  const courseBuilderPath = path.resolve(__dirname, '../src/pages/Courses/CourseBuilderPage.tsx');
  const cssPath = path.resolve(__dirname, '../src/style.css');

  const coursesPageCode = fs.readFileSync(coursesPagePath, 'utf-8');
  const publicDetailsCode = fs.readFileSync(publicDetailsPath, 'utf-8');
  const courseBuilderCode = fs.readFileSync(courseBuilderPath, 'utf-8');
  const cssCode = fs.readFileSync(cssPath, 'utf-8');

  // Test 1: Duplicate Assign Students removed from Manage dropdown
  const assignStudentsMatches = (coursesPageCode.match(/to=\{`\/courses\/\$\{c\.id\}\/assign-students`\}/g) || []).length;
  assert(
    assignStudentsMatches === 2,
    `"Assign Students" link appears exactly once in Admin Manage and once in Trainer Manage (found ${assignStudentsMatches})`
  );

  // Test 2: Admin course cards action layout: View Details, Edit, Manage
  assert(
    coursesPageCode.includes('isAdmin ? (') &&
    coursesPageCode.includes('to={`/course/${c.id}`}') &&
    coursesPageCode.includes('View Details') &&
    coursesPageCode.includes('to={`/course-builder?id=${c.id}`}') &&
    coursesPageCode.includes('Edit') &&
    coursesPageCode.includes('<span>Manage</span>'),
    'Admin card layout provides inline View Details, Edit, and Manage dropdown button'
  );

  // Test 3: Continue Learning removed from Admin cards
  // Check that inside the isAdmin section, there is no "Continue Learning"
  const adminSection = coursesPageCode.substring(
    coursesPageCode.indexOf('isAdmin ? ('),
    coursesPageCode.indexOf('// Trainer / Faculty Action Layout')
  );
  assert(
    !adminSection.includes('Continue Learning') &&
    !adminSection.includes('Open Course Player'),
    'Continue Learning and Open Course Player are completely removed from Admin course cards'
  );

  // Test 4: Admin Manage Dropdown contains all valid administrative actions
  assert(
    adminSection.includes('/assign-students') &&
    adminSection.includes('/enrollments?courseId=') &&
    adminSection.includes('setShareModalCourse(c)') &&
    adminSection.includes('Preview as Student') &&
    adminSection.includes('openFacultyModal(c)') &&
    adminSection.includes('openStatusModal(c)') &&
    adminSection.includes('openDeleteModal(c)'),
    'Admin Manage dropdown contains Assign Students, View Enrollments, Share Course, Preview as Student, Change Lead Faculty, Change Course Status, and Delete Course'
  );

  // Test 5: Avoid duplicating inline actions inside Admin Manage dropdown
  assert(
    !adminSection.includes('View Details & Syllabus') &&
    !adminSection.includes('> Edit in Course Builder<'),
    'Inline buttons View Details and Edit are not duplicated inside the Admin Manage dropdown'
  );

  // Test 6: Trainer action layout: View Course, Edit Course, Manage
  const trainerSection = coursesPageCode.substring(
    coursesPageCode.indexOf('// Trainer / Faculty Action Layout'),
    coursesPageCode.lastIndexOf('</div>')
  );
  assert(
    trainerSection.includes('View Course') &&
    trainerSection.includes('Edit Course') &&
    trainerSection.includes('<span>Manage</span>'),
    'Trainer card layout provides inline View Course, Edit Course, and Manage dropdown button'
  );

  // Test 7: Continue Learning removed from Trainer course-management cards
  assert(
    !trainerSection.includes('Continue Learning'),
    'Continue Learning is completely removed from Trainer course-management cards'
  );

  // Test 8: Trainer Manage Dropdown contains authorized actions including Assign Students and Delete Course
  assert(
    trainerSection.includes('coursePerms.canAssignStudents') &&
    trainerSection.includes('Manage Lessons / Content') &&
    trainerSection.includes('View Enrollments') &&
    trainerSection.includes('Share Course') &&
    trainerSection.includes('Preview as Student') &&
    trainerSection.includes('coursePerms.canDelete'),
    'Trainer Manage dropdown contains Assign Students, Manage Lessons / Content, View Enrollments, Share Course, Preview as Student, and Delete Course (for owned courses)'
  );

  // Test 9: Trainer does NOT have institution-wide faculty reassignment or arbitrary status override
  assert(
    !trainerSection.includes('openStatusModal') &&
    !trainerSection.includes('openFacultyModal'),
    'Trainer does not have unauthorized institution-wide status changes or faculty reassignment'
  );

  // Test 10: Student actions keep Continue Learning only in course-learning context
  const studentSection = coursesPageCode.substring(
    coursesPageCode.indexOf('{isLearner || !isAuth ? ('),
    coursesPageCode.indexOf(') : isAdmin ? (')
  );
  assert(
    studentSection.includes('Continue Learning &rarr;') &&
    studentSection.includes('Enroll in Course') &&
    studentSection.includes('Review Lessons') &&
    studentSection.includes('View Certificate'),
    'Student card actions provide Continue Learning when in progress, Enroll in Course when not enrolled, and Review Lessons / Certificate when completed'
  );

  // Test 11: Students must not see administrative actions
  assert(
    !studentSection.includes('course-manage-dropdown') &&
    !studentSection.includes('/course-builder') &&
    !studentSection.includes('/assign-students') &&
    !studentSection.includes('openFacultyModal') &&
    !studentSection.includes('openDeleteModal'),
    'Students do not see Edit Course, Assign Students, Change Lead Faculty, Change Course Status, Delete Course, or Manage dropdown'
  );

  // Test 12: Course Details Page (PublicCourseDetailsPage) cleaned for Admin and Trainer
  assert(
    !publicDetailsCode.includes('Continue Learning / Course Player') &&
    publicDetailsCode.includes('Preview Course as Student'),
    'PublicCourseDetailsPage replaces "Continue Learning / Course Player" with "Preview Course as Student"'
  );
  assert(
    publicDetailsCode.includes('isAdmin ? (') &&
    publicDetailsCode.includes('/assign-students'),
    'PublicCourseDetailsPage provides Assign Students exclusively for Admins'
  );

  // Test 13: CourseBuilderPage post-publish modal guards student assignment
  assert(
    courseBuilderCode.includes('{isAdmin && (') &&
    courseBuilderCode.includes('Assign More Students'),
    'CourseBuilderPage guards "Assign More Students" so only Admins see it'
  );

  // Test 14: Card z-index elevated on active Manage menu to prevent clipping
  assert(
    coursesPageCode.includes('zIndex: isManageMenuOpen ? 60 : 1'),
    'Card element dynamically elevates z-index to 60 when Manage dropdown is open to prevent overlapping'
  );

  // Test 15: CSS rules for .course-manage-dropdown
  assert(
    cssCode.includes('.course-manage-dropdown a') &&
    cssCode.includes('.course-manage-dropdown button') &&
    cssCode.includes('dropdown-danger'),
    'style.css contains dedicated rules and hover states for .course-manage-dropdown'
  );

  console.log(`\nCourse Catalogue Audit Verification Complete: ${passed} passed, ${failed} failed.\n`);
  process.exit(failed > 0 ? 1 : 0);
}

runCourseCatalogueAuditTests();
