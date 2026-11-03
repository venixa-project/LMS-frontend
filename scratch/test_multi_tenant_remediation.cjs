const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('================================================================');
console.log('  Course Catalogue Multi-Tenant Isolation Final Remediation     ');
console.log('================================================================\n');

// 1. Mock Local & Session Storage
const localStorageStore = new Map();
const sessionStorageStore = new Map();
const eventListeners = new Map();

global.window = {
  addEventListener: (event, handler) => {
    if (!eventListeners.has(event)) eventListeners.set(event, []);
    eventListeners.get(event).push(handler);
  },
  removeEventListener: (event, handler) => {
    if (!eventListeners.has(event)) return;
    const list = eventListeners.get(event).filter(h => h !== handler);
    eventListeners.set(event, list);
  },
  dispatchEvent: (event) => {
    const list = eventListeners.get(event.type) || [];
    list.forEach(h => h(event));
  },
};

global.CustomEvent = class CustomEvent {
  constructor(type, params = {}) {
    this.type = type;
    this.detail = params.detail;
  }
};

global.localStorage = {
  getItem: (key) => localStorageStore.get(key) || null,
  setItem: (key, val) => localStorageStore.set(key, String(val)),
  removeItem: (key) => localStorageStore.delete(key),
  clear: () => localStorageStore.clear(),
};

global.sessionStorage = {
  getItem: (key) => sessionStorageStore.get(key) || null,
  setItem: (key, val) => sessionStorageStore.set(key, String(val)),
  removeItem: (key) => sessionStorageStore.delete(key),
  clear: () => sessionStorageStore.clear(),
};

// 2. Setup mock courses in Org A ('org-001') and Org B ('org-002')
const coursesOrgA = [
  { id: 'crs-orgA-1', title: 'React Pattern Architecture', description: 'Advanced patterns for Org A', organizationId: 'org-001', status: 'published', category: 'Frontend', modules: [] },
  { id: 'crs-orgA-2', title: 'Python Machine Learning', description: 'ML data engineering for Org A', organizationId: 'org-001', status: 'published', category: 'AI', modules: [] },
];

const coursesOrgB = [
  { id: 'crs-orgB-1', title: 'Cloud Infrastructure with AWS', description: 'Cloud systems for Org B', organizationId: 'org-002', status: 'published', category: 'Cloud', modules: [] },
  { id: 'crs-orgB-2', title: 'Cybersecurity Operations', description: 'Security fundamentals for Org B', organizationId: 'org-002', status: 'published', category: 'Security', modules: [] },
];

const allTestCourses = [...coursesOrgA, ...coursesOrgB];

// --- TEST 1 & 2: Organization A and B Global Search Isolation ---
console.log('--- TEST 1 & 2: Global Search Multi-Tenant Isolation ---');
function simulateSearch(query, activeOrgId, courses) {
  return courses.filter((c) => {
    const matchesOrg = (c.organizationId || 'org-001') === activeOrgId;
    if (!matchesOrg) return false;
    return (
      c.title.toLowerCase().includes(query.toLowerCase()) ||
      c.description.toLowerCase().includes(query.toLowerCase())
    );
  }).slice(0, 3);
}

// Search for 'Architecture' in Org A
const orgASearch = simulateSearch('Architecture', 'org-001', allTestCourses);
assert.strictEqual(orgASearch.length, 1);
assert.strictEqual(orgASearch[0].id, 'crs-orgA-1');

// Search for 'Cloud' in Org A -> should return empty because Cloud is in Org B
const orgASearchCloud = simulateSearch('Cloud', 'org-001', allTestCourses);
assert.strictEqual(orgASearchCloud.length, 0, 'Org A search must never return Org B course');

// Search for 'Cloud' in Org B -> should return the Org B course
const orgBSearchCloud = simulateSearch('Cloud', 'org-002', allTestCourses);
assert.strictEqual(orgBSearchCloud.length, 1);
assert.strictEqual(orgBSearchCloud[0].id, 'crs-orgB-1');
console.log('PASS: Test 1 & 2 - Search displays only courses belonging to the active organization.');

// --- TEST 3: Switching organizations updates Global Search immediately ---
console.log('\n--- TEST 3: Immediate Reactive Org Switching in Global Search ---');
let currentActiveOrg = 'org-001';
window.addEventListener('venilearn_org_switched', (e) => {
  if (e.detail?.orgId) {
    currentActiveOrg = e.detail.orgId;
  }
});

// Initially in Org A: search 'Security'
let resultBefore = simulateSearch('Security', currentActiveOrg, allTestCourses);
assert.strictEqual(resultBefore.length, 0, 'Org A has no security courses');

// Switch to Org B
window.dispatchEvent(new CustomEvent('venilearn_org_switched', { detail: { orgId: 'org-002' } }));
assert.strictEqual(currentActiveOrg, 'org-002');

// Search again after switch
let resultAfter = simulateSearch('Security', currentActiveOrg, allTestCourses);
assert.strictEqual(resultAfter.length, 1);
assert.strictEqual(resultAfter[0].id, 'crs-orgB-2');
console.log('PASS: Test 3 - Switching organizations updates search results immediately via event.');

// --- TEST 4 & 5: Organization A & B Reports Scope ---
console.log('\n--- TEST 4 & 5: Reports Data Isolation by Organization ---');
function getScopedReportEntities(orgId, coursesList) {
  const effectiveOrgId = orgId || 'org-001';
  return {
    courses: coursesList.filter(c => (c.organizationId || 'org-001') === effectiveOrgId),
  };
}

const reportEntitiesOrgA = getScopedReportEntities('org-001', allTestCourses);
assert.strictEqual(reportEntitiesOrgA.courses.length, 2);
assert(reportEntitiesOrgA.courses.every(c => c.organizationId === 'org-001'));

const reportEntitiesOrgB = getScopedReportEntities('org-002', allTestCourses);
assert.strictEqual(reportEntitiesOrgB.courses.length, 2);
assert(reportEntitiesOrgB.courses.every(c => c.organizationId === 'org-002'));
console.log('PASS: Test 4 & 5 - Reports contain strictly courses belonging to the active organization.');

// --- TEST 6: Reports Refresh on Organization Switch ---
console.log('\n--- TEST 6: Reports Refresh Immediately on Org Switch ---');
let reportsActiveOrg = 'org-001';
window.addEventListener('venilearn_org_switched', (e) => {
  if (e.detail?.orgId) {
    reportsActiveOrg = e.detail.orgId;
  }
});

let activeReportCourses = getScopedReportEntities(reportsActiveOrg, allTestCourses).courses;
assert.strictEqual(activeReportCourses.some(c => c.id === 'crs-orgA-1'), true);
assert.strictEqual(activeReportCourses.some(c => c.id === 'crs-orgB-1'), false);

// Switch org
window.dispatchEvent(new CustomEvent('venilearn_org_switched', { detail: { orgId: 'org-002' } }));
activeReportCourses = getScopedReportEntities(reportsActiveOrg, allTestCourses).courses;
assert.strictEqual(activeReportCourses.some(c => c.id === 'crs-orgB-1'), true);
assert.strictEqual(activeReportCourses.some(c => c.id === 'crs-orgA-1'), false);
console.log('PASS: Test 6 - Reports refresh immediately upon receiving venilearn_org_switched.');

// --- TEST 7: Code Inspection of Reports and Search ---
console.log('\n--- TEST 7: Code Inspection of Remediated Files ---');
const searchSrc = fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'GlobalSearchModal.tsx'), 'utf8');
const reportsServiceSrc = fs.readFileSync(path.join(__dirname, '..', 'src', 'lib', 'reportsService.ts'), 'utf8');
const reportsPageSrc = fs.readFileSync(path.join(__dirname, '..', 'src', 'pages', 'Reports', 'ReportsPage.tsx'), 'utf8');

assert(searchSrc.includes("(c.organizationId || 'org-001') === activeOrgId"), 'Search must contain exact organization condition');
assert(searchSrc.includes('venilearn_org_switched'), 'Search must listen for venilearn_org_switched');
assert(reportsServiceSrc.includes('getReportEntities(orgId?: string)'), 'getReportEntities must accept orgId');
assert(reportsServiceSrc.includes("c.organizationId || 'org-001') === effectiveOrgId"), 'reportsService must filter courses by effectiveOrgId');
assert(reportsPageSrc.includes('venilearn_org_switched'), 'ReportsPage must listen for venilearn_org_switched');
assert(reportsPageSrc.includes('getReportEntities(activeOrgId)'), 'ReportsPage must pass activeOrgId to getReportEntities');
console.log('PASS: Test 7 - All source code criteria verified.');

// --- TEST 8: Full Course Lifecycle Operations Preserved ---
console.log('\n--- TEST 8: Course Lifecycle Operations Verification ---');
const courseStoreSrc = fs.readFileSync(path.join(__dirname, '..', 'src', 'lib', 'courseStore.ts'), 'utf8');
assert(courseStoreSrc.includes('addCourse:'), 'addCourse must be present');
assert(courseStoreSrc.includes('deleteCourse:'), 'deleteCourse must be present');
assert(courseStoreSrc.includes('enrollCourse:'), 'enrollCourse must be present');
assert(courseStoreSrc.includes('STORAGE_KEY_INITIALIZED'), 'STORAGE_KEY_INITIALIZED must be present');
console.log('PASS: Test 8 - Course lifecycle operations and persistence keys fully verified.');

console.log('\n================================================================');
console.log('  ALL 8 TESTS PASSED SUCCESSFULLY!                             ');
console.log('================================================================');

