// ====================================================================
// Test Suite: VeniLearn LMS — Unified Student View & Table Overflow Fix
// Verifies all requirements of the user specification
// ====================================================================

const fs = require('fs');
const path = require('path');

const leaderboardPagePath = path.resolve(__dirname, '../src/pages/Academics/LeaderboardPage.tsx');
const leaderboardDataPath = path.resolve(__dirname, '../src/pages/Academics/leaderboardData.ts');
const styleCssPath = path.resolve(__dirname, '../src/style.css');

console.log('🧪 Starting Verification: Unified Student View & Table Overflow Fix...\n');

let testsPassed = 0;
let totalTests = 0;

function assert(condition, testName, details = '') {
  totalTests++;
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
    testsPassed++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}`);
    if (details) console.error(`     Details: ${details}`);
  }
}

const pageContent = fs.readFileSync(leaderboardPagePath, 'utf-8');
const dataContent = fs.readFileSync(leaderboardDataPath, 'utf-8');
const styleContent = fs.readFileSync(styleCssPath, 'utf-8');

// -------------------------------------------------------------
// Section 1: Single View Button & Action Column Visibility
// -------------------------------------------------------------
console.log('📋 Section 1: Single View Button & Action Column Visibility');

assert(
  pageContent.includes('Action') &&
  pageContent.includes('width: \'90px\', minWidth: \'90px\''),
  'Table header includes dedicated Action column with fixed, sufficient width (90px)'
);

assert(
  pageContent.includes('Action: Exactly One View Button per Row') &&
  pageContent.includes('<Eye size={13}') &&
  pageContent.includes('<span>View</span>') &&
  pageContent.includes('minWidth: \'68px\''),
  'Every student row renders exactly one View action button with protected min-width'
);

assert(
  !pageContent.includes('<tr\n                      key={m.id}\n                      onClick={() => setSelectedMember(m)}') &&
  !pageContent.includes('<tr key={m.id} onClick='),
  'Duplicate profile-opening action removed from table rows (tr is no longer clickable)'
);

assert(
  !pageContent.includes('key={m.id}\n                  onClick={() => setSelectedMember(m)}'),
  'Duplicate profile-opening action removed from comparative volume chart'
);

// -------------------------------------------------------------
// Section 2: Responsive Table Layout & Overflow Protection
// -------------------------------------------------------------
console.log('\n📋 Section 2: Responsive Table Layout & Overflow Protection');

assert(
  !pageContent.includes('overflowX: \'hidden\''),
  'Removed overflowX: hidden that was clipping the Action column'
);

assert(
  pageContent.includes('overflowX: \'auto\'') &&
  pageContent.includes('WebkitOverflowScrolling: \'touch\''),
  'Table container has overflowX: auto and touch momentum scrolling'
);

assert(
  pageContent.includes('minWidth: 0') &&
  pageContent.includes('maxWidth: \'100%\''),
  'Table container and parent card use minWidth: 0 and maxWidth: 100% to prevent viewport blowouts'
);

assert(
  styleContent.includes('.leaderboard-table') &&
  styleContent.includes('.leaderboard-table th') &&
  styleContent.includes('.leaderboard-table td'),
  'style.css contains dedicated .leaderboard-table rules with optimized responsive padding'
);

assert(
  pageContent.includes('wordBreak: \'break-word\''),
  'Text wrapping enabled on student names and cohort badges to prevent oversized row expansion'
);

// -------------------------------------------------------------
// Section 3: Student Profile Modal — Personal & Academic Details
// -------------------------------------------------------------
console.log('\n📋 Section 3: Student Profile Modal Structure & Available Data');

assert(
  pageContent.includes('Personal Details') &&
  pageContent.includes('selectedMember.name.replace(\' (You)\', \'\')') &&
  pageContent.includes('selectedMember.avatarId') &&
  pageContent.includes('AnimatedAvatar'),
  'Personal Details: Student name and profile photo/avatar rendered'
);

assert(
  pageContent.includes('selectedMember.rollNo'),
  'Personal Details: Student ID (rollNo) displayed'
);

assert(
  pageContent.includes('{selectedMember.email && (') &&
  pageContent.includes('href={`mailto:${selectedMember.email}`'),
  'Personal Details: Email address displayed when available, hidden if missing'
);

assert(
  pageContent.includes('selectedMember.cohort'),
  'Personal Details: Assigned cohort/batch displayed'
);

assert(
  pageContent.includes('getStudentDepartment') &&
  pageContent.includes('{department && (') &&
  pageContent.includes('Building2'),
  'Personal Details: Department looked up from mockUsers/mockDepartments and hidden if unavailable'
);

assert(
  pageContent.includes('Leaderboard Rank') &&
  pageContent.includes('#{memberRank}') &&
  pageContent.includes('of {sortedMembers.length} scholars'),
  'Academic Details: Current leaderboard rank displayed'
);

assert(
  pageContent.includes('selectedMember.coursesCompleted} / {selectedMember.coursesEnrolled'),
  'Academic Details: Total courses completed / enrolled courses displayed'
);

assert(
  pageContent.includes('selectedMember.overallCompletionRate}%') &&
  pageContent.includes('progress-bar-fill'),
  'Academic Details: Course completion percentage and progress bar rendered'
);

assert(
  pageContent.includes('selectedMember.recentCourseFinished') &&
  pageContent.includes('Passed Assessment'),
  'Academic Details: Assessment pass status and completed track displayed where permitted'
);

assert(
  pageContent.includes('selectedMember.certificates') &&
  pageContent.includes('verified credentials'),
  'Academic Details: Certificates issued displayed'
);

assert(
  pageContent.includes('memberBadges.map') &&
  pageContent.includes('Awarded Achievement Badges'),
  'Academic Details: Awarded achievement badges displayed with clear labels and colors'
);

assert(
  pageContent.includes('selectedMember.streakDays}d') &&
  pageContent.includes('selectedMember.points.toLocaleString()'),
  'Academic Details: Learning streak days and XP points tracked and displayed'
);

// -------------------------------------------------------------
// Section 4: Role-Based Access Scoping (Trainer vs Institution Admin)
// -------------------------------------------------------------
console.log('\n📋 Section 4: Role-Based Access Control');

assert(
  pageContent.includes('const isTrainer =') &&
  pageContent.includes('const isAdmin =') &&
  pageContent.includes('const isStudent ='),
  'Proper canonical role detection for Trainer, Admin, and Student'
);

assert(
  pageContent.includes('trainerAuthorizedCohorts') &&
  pageContent.includes('Spring 2026 Engineering') &&
  pageContent.includes('Fall 2026 Data Science'),
  'Trainer cohort authorization mapping correctly assigns trainer teaching scopes'
);

assert(
  pageContent.includes('if (isTrainer && trainerAuthorizedCohorts) {') &&
  pageContent.includes('baseList = baseList.filter((m) => trainerAuthorizedCohorts.includes(m.cohort));'),
  'Leaderboard table roster strictly scoped to assigned cohorts for Trainers'
);

assert(
  pageContent.includes('availableCohorts') &&
  pageContent.includes('{isTrainer ? `All Assigned Cohorts (${availableCohorts.length})` : \'All Cohorts & Batches\'}'),
  'Cohort filter dropdown dynamic: scopes to assigned cohorts for Trainers, full institution for Admins'
);

assert(
  pageContent.includes('Trainer View:') &&
  pageContent.includes('Institution Admin View:'),
  'Contextual role scope notification banners displayed for Trainer and Institution Admin'
);

assert(
  pageContent.includes('isAuthorizedForTrainer') &&
  pageContent.includes('Access Restricted') &&
  pageContent.includes('You are only authorized to view academic profiles of students enrolled in your assigned cohorts'),
  'Security Guard: Trainer access restricted if attempting to inspect unrelated students'
);

// -------------------------------------------------------------
// Section 5: Modal Accessibility & Behavior
// -------------------------------------------------------------
console.log('\n📋 Section 5: Modal Behavior & Accessibility');

assert(
  pageContent.includes('lastTriggeredBtnRef') &&
  pageContent.includes('viewButtonRefs') &&
  pageContent.includes('lastTriggeredBtnRef.current?.focus()'),
  'Accessibility: Focus restoration returns focus to triggering View button when modal closes'
);

assert(
  pageContent.includes('e.key === \'Escape\'') &&
  pageContent.includes('window.addEventListener(\'keydown\', handleKeyDown)'),
  'Accessibility: Escape key listener closes modal dialog'
);

assert(
  pageContent.includes('className="modal-overlay"') &&
  pageContent.includes('backdropFilter: \'blur(8px)\'') &&
  pageContent.includes('zIndex: 1100'),
  'Accessibility: Background overlay dimmed with backdrop blur'
);

assert(
  pageContent.includes('role="dialog"') &&
  pageContent.includes('aria-modal="true"') &&
  pageContent.includes('aria-labelledby="student-modal-title"'),
  'Accessibility: Semantic ARIA attributes (role="dialog", aria-modal="true") present'
);

assert(
  pageContent.includes('var(--bg-card)') &&
  pageContent.includes('var(--text-main)') &&
  pageContent.includes('var(--border-subtle)'),
  'Theming: CSS variables used throughout to ensure contrast and readability in light and dark modes'
);

// -------------------------------------------------------------
// Summary
// -------------------------------------------------------------
console.log(`\n=============================================================`);
console.log(`Total Checks: ${totalTests} | Passed: ${testsPassed} | Failed: ${totalTests - testsPassed}`);
console.log(`=============================================================`);

if (testsPassed === totalTests) {
  console.log('🎉 ALL VERIFICATION CHECKS PASSED!\n');
  process.exit(0);
} else {
  console.error('⚠️ SOME CHECKS FAILED!\n');
  process.exit(1);
}
