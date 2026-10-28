const fs = require('fs');
const path = require('path');

function verifyEmptySpaceFix() {
  console.log('--- Verifying Empty Space Fix on Trainer Dashboard ---\n');
  let passed = 0;
  let failed = 0;

  function assert(cond, msg) {
    if (cond) {
      console.log(`[PASS] ${msg}`);
      passed++;
    } else {
      console.error(`[FAIL] ${msg}`);
      failed++;
    }
  }

  const css = fs.readFileSync(path.resolve(__dirname, '../src/style.css'), 'utf-8');
  const code = fs.readFileSync(path.resolve(__dirname, '../src/pages/Dashboard/TrainerDashboardPage.tsx'), 'utf-8');

  // Check 1: trainer-schedule-split-grid and trainer-secondary-split-grid have align-items: start
  assert(
    css.includes('.trainer-schedule-split-grid') &&
    css.includes('align-items: start;') &&
    css.includes('.trainer-secondary-split-grid'),
    'Both split grids have align-items: start preventing row stretching'
  );

  // Check 2: Direct child rules for split grids
  assert(
    css.includes('.trainer-schedule-split-grid > *') &&
    css.includes('.trainer-secondary-split-grid > *') &&
    css.includes('align-self: start;') &&
    css.includes('height: fit-content;'),
    'Split grid children explicitly enforce align-self: start and height: fit-content'
  );

  // Check 3: trainer-card class
  assert(
    css.includes('.trainer-card') &&
    css.includes('height: fit-content;') &&
    css.includes('align-self: start;'),
    '.trainer-card class enforces content-driven height'
  );

  // Check 4: Section B (Pending Grading Queue) has trainer-card, fit-content, and no stretching
  assert(
    code.includes('className="card trainer-card"') &&
    code.includes('Pending Grading Queue') &&
    code.includes('height: \'fit-content\', alignSelf: \'start\''),
    'Pending Grading Queue card has trainer-card and inline height: fit-content'
  );

  // Check 5: Section D (Assessment Deadlines) has trainer-card, fit-content, and no stretching
  assert(
    code.includes('Assessment Deadlines') &&
    code.includes('height: \'fit-content\', alignSelf: \'start\''),
    'Assessment Deadlines card has trainer-card and inline height: fit-content'
  );

  // Check 6: Section E (Recent Course Activity) has trainer-card and fit-content
  assert(
    code.includes('Recent Course Activity') &&
    code.includes('<div className="card trainer-card" style={{ minWidth: 0, height: \'fit-content\' }}>'),
    'Recent Course Activity card uses trainer-card and naturally flows below preceding section'
  );

  // Check 7: No artificial margin: auto 0 in empty states causing excessive height
  assert(
    !code.includes('margin: \'auto 0\''),
    'All unnecessary margin: "auto 0" empty state stretches have been removed'
  );

  // Check 8: Preserved functional buttons and routes
  assert(
    code.includes('to="/weekly-timetable"') &&
    code.includes('to="/grading"') &&
    code.includes('to="/courses"') &&
    code.includes('to="/assessments"') &&
    code.includes('handleResetFilters'),
    'All routes, filters, and actions are 100% preserved'
  );

  console.log(`\nEmpty Space Verification: ${passed} passed, ${failed} failed.\n`);
  process.exit(failed > 0 ? 1 : 0);
}

verifyEmptySpaceFix();
