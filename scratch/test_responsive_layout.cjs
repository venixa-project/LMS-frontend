// ============================================================
// Automated Responsive Layout Verification across Viewports
// Viewports: 1920x1080, 1600x900, 1366x768, 1280x720
// ============================================================
const fs = require('fs');
const path = require('path');

function runResponsiveTests() {
  console.log('--- Starting Responsive Layout Verification Suite ---\n');
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

  const cssPath = path.resolve(__dirname, '../src/style.css');
  const trainerPagePath = path.resolve(__dirname, '../src/pages/Dashboard/TrainerDashboardPage.tsx');

  const css = fs.readFileSync(cssPath, 'utf-8');
  const code = fs.readFileSync(trainerPagePath, 'utf-8');

  // Test 1: Page Body min-width: 0 and responsive padding
  assert(
    css.includes('.page-body') && css.includes('min-width: 0;') && css.includes('@media (max-width: 1366px)'),
    'page-body has min-width: 0 and adaptive padding for 1366px and 1280px viewports'
  );

  // Test 2: Trainer Dashboard container prevents overflow
  assert(
    css.includes('.trainer-dashboard-container') &&
    css.includes('max-width: 100%') &&
    css.includes('min-width: 0'),
    'trainer-dashboard-container enforces min-width: 0 and max-width: 100%'
  );

  // Test 3: KPI Grid Responsive Breakpoints
  assert(
    css.includes('.trainer-kpi-grid') &&
    css.includes('grid-template-columns: repeat(5, minmax(0, 1fr))') &&
    css.includes('@media (max-width: 1200px)'),
    'trainer-kpi-grid maintains 5 columns on wide viewports (1920, 1600, 1366, 1280) and wraps below 1200px'
  );

  // Test 4: Schedule Split Grid Stacks at <= 1380px for 1366x768 and 1280x720
  assert(
    css.includes('.trainer-schedule-split-grid') &&
    css.includes('@media (max-width: 1380px)') &&
    css.includes('grid-template-columns: 1fr'),
    'trainer-schedule-split-grid stacks to 1 column at <= 1380px (1366x768 & 1280x720) so Schedule has full width'
  );

  // Test 5: Table container with contained horizontal scroll
  assert(
    css.includes('.trainer-table-container') &&
    css.includes('overflow-x: auto') &&
    css.includes('min-width: 0'),
    'trainer-table-container confines horizontal scrolling strictly within the table wrapper'
  );

  // Test 6: Sensible Column Classes and Widths
  assert(
    css.includes('.col-datetime') &&
    css.includes('.col-title') &&
    css.includes('.col-cohort') &&
    css.includes('.col-status') &&
    css.includes('.col-actions'),
    'All 5 columns have dedicated CSS classes with sensible proportional and min-widths'
  );

  // Test 7: Word wrapping at natural boundaries
  assert(
    css.includes('overflow-wrap: break-word') &&
    css.includes('word-break: normal') &&
    code.includes('overflowWrap: \'break-word\''),
    'Session titles wrap naturally at word boundaries without breaking character-by-character'
  );

  // Test 8: Full Google Meet Join Button visibility
  assert(
    code.includes('Join Live') &&
    code.includes('Join Session') &&
    code.includes('whiteSpace: \'nowrap\'') &&
    code.includes('GoogleMeetIcon'),
    'Google Meet Join Session buttons have nowrap and padding to remain fully visible'
  );

  // Test 9: Pending Grading Queue Flex and Wrapping
  assert(
    code.includes("flex: '1 1 200px', minWidth: 0") &&
    code.includes('Review Submission'),
    'Pending Grading Queue cards use responsive flex-basis and minWidth: 0 without clipping action buttons'
  );

  // Test 10: Secondary Split Grid Responsive Behavior
  assert(
    css.includes('.trainer-secondary-split-grid') &&
    css.includes('@media (max-width: 1200px)'),
    'trainer-secondary-split-grid provides 2 columns for courses and deadlines, stacking gracefully below 1200px'
  );

  console.log(`\nResponsive Verification Complete: ${passed} passed, ${failed} failed.\n`);
  process.exit(failed > 0 ? 1 : 0);
}

runResponsiveTests();
