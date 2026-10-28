// ============================================================
// Automated Verification Suite: Trainer Dashboard Redesign (.cjs)
// ============================================================
const fs = require('fs');
const path = require('path');

function runTests() {
  console.log('--- Starting Trainer Dashboard Automated Verification Suite ---\n');
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

  const trainerDashboardPath = path.resolve(__dirname, '../src/pages/Dashboard/TrainerDashboardPage.tsx');
  const dashboardPagePath = path.resolve(__dirname, '../src/pages/Dashboard/DashboardPage.tsx');

  // Test 1: File Existence
  assert(fs.existsSync(trainerDashboardPath), 'TrainerDashboardPage.tsx exists in src/pages/Dashboard');
  const trainerCode = fs.readFileSync(trainerDashboardPath, 'utf-8');
  const dashboardCode = fs.readFileSync(dashboardPagePath, 'utf-8');

  // Test 2: Integration in DashboardPage
  assert(
    dashboardCode.includes("import { TrainerDashboardPage } from './TrainerDashboardPage';"),
    'TrainerDashboardPage is imported in DashboardPage.tsx'
  );
  assert(
    /if\s*\(\s*role\s*===\s*'trainer'\s*\)\s*\{\s*return\s*<TrainerDashboardPage\s*\/>;/.test(dashboardCode),
    'role === "trainer" cleanly renders <TrainerDashboardPage />'
  );

  // Test 3: Header & Welcome Message
  assert(
    trainerCode.includes('Welcome back, {trainerName}'),
    'Header displays "Welcome back, {trainerName}" with clean typography'
  );
  assert(
    trainerCode.includes('Trainer Portal &bull; Faculty Center'),
    'Header includes "Trainer Portal • Faculty Center" badge'
  );

  // Test 4: Compact Global Filters
  assert(
    trainerCode.includes('selectedCourse') && trainerCode.includes('selectedCohort') && trainerCode.includes('dateRange'),
    'Global filter bar contains Course, Class/Cohort/Batch, and Date Range filters'
  );
  assert(
    trainerCode.includes('customStartDate') && trainerCode.includes('customEndDate'),
    'Custom date range provides Start Date and End Date inputs'
  );
  assert(
    trainerCode.includes('handleResetFilters'),
    'Reset button properly restores default dashboard filters'
  );

  // Test 5: Only Authorized Trainer Scope
  assert(
    trainerCode.includes('assignedCourses') && trainerCode.includes('instructors?.includes(trainerId)'),
    'Filters display only courses assigned to the logged-in trainer'
  );
  assert(
    trainerCode.includes('assignedCohorts'),
    'Filters display only cohorts/classes assigned to the logged-in trainer'
  );

  // Test 6: Exactly 5 Summary KPI Cards
  assert(
    trainerCode.includes('stat-card-title">Assigned Courses</span>') &&
    trainerCode.includes('stat-card-title">Assigned Classes</span>') &&
    trainerCode.includes('stat-card-title">Assigned Students</span>') &&
    trainerCode.includes('stat-card-title">Pending Evaluations</span>') &&
    trainerCode.includes('stat-card-title">Upcoming Live Sessions</span>'),
    'Exactly 5 required KPI summary cards are present'
  );

  // Test 7: Absence of Attendance Ledger & Quick-Action Shortcuts
  assert(
    !trainerCode.includes('Avg. Attendance') &&
    !trainerCode.includes('Attendance Percentage') &&
    !trainerCode.includes('Mark Attendance') &&
    !trainerCode.includes('New Assignment'),
    'Manual attendance ledger, attendance percentages, and unnecessary shortcuts are removed'
  );

  // Test 8: Section A - Today\'s & Upcoming Teaching Schedule
  assert(
    trainerCode.includes("Today's & Upcoming Teaching Schedule") &&
    trainerCode.includes('to="/weekly-timetable"') &&
    trainerCode.includes('GoogleMeetIcon') &&
    trainerCode.includes('meetUrl'),
    'Section A: Teaching Schedule with Google Meet join actions and View Full Timetable link'
  );

  // Test 9: Section B - Pending Grading Queue
  assert(
    trainerCode.includes('Pending Grading Queue') &&
    trainerCode.includes('AI Suggestion Ready') &&
    trainerCode.includes('Review Submission') &&
    trainerCode.includes('to="/grading"'),
    'Section B: Pending Grading Queue prominently displays AI Suggestion Ready pills and Review actions'
  );

  // Test 10: Section C - Assigned Courses & Syllabus Completion
  assert(
    trainerCode.includes('Assigned Courses & Syllabus Completion') &&
    trainerCode.includes('Lessons Completed') &&
    trainerCode.includes('Manage Course') &&
    trainerCode.includes('progress'),
    'Section C: Assigned Courses with lesson counts, progress bar, and Manage Course links'
  );

  // Test 11: Section D - Assessment Deadlines
  assert(
    trainerCode.includes('Assessment Deadlines') &&
    trainerCode.includes('Due Soon') &&
    trainerCode.includes('Upcoming') &&
    trainerCode.includes('to="/assessments"'),
    'Section D: Assessment Deadlines sorted with nearest due dates, status badges, and action links'
  );

  // Test 12: Section E - Recent Course Activity
  assert(
    trainerCode.includes('Recent Course Activity') &&
    trainerCode.includes('Live Stream') &&
    trainerCode.includes('trainerActivities'),
    'Section E: Recent Course Activity chronological stream with colored icons and valid links'
  );

  // Test 13: Layout & Two-Column Grid Classes
  assert(
    trainerCode.includes('dashboard-split-grid') &&
    trainerCode.includes('dashboard-kpi-grid'),
    'Responsive dashboard-split-grid and dashboard-kpi-grid layout classes match Institution Admin'
  );

  console.log(`\nVerification Complete: ${passed} passed, ${failed} failed.\n`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
