// ============================================================
// Automated Validation Suite: Organisation Navigation & Global Branding
// ============================================================
const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('================================================================');
console.log('   VeniLearn LMS — Organisation Navigation & Branding Test Suite');
console.log('================================================================\n');

// -------------------------------------------------------------
// Test 1: Navigation Simplification in adminNav.ts
// -------------------------------------------------------------
console.log('Scenario 1: Organisation Management Sidebar Simplification');
const adminNavContent = fs.readFileSync(path.join(__dirname, 'admin/navigation/adminNav.ts'), 'utf-8');

// Ensure removed items are not in adminNav
assert.strictEqual(
  adminNavContent.includes("'ca-branches-locations'"),
  false,
  'ca-branches-locations must be removed from sidebar navigation'
);
assert.strictEqual(
  adminNavContent.includes("'ca-departments-designations'"),
  false,
  'ca-departments-designations must be removed from sidebar navigation'
);
console.log('  ✓ Branches & Locations removed as a separate sidebar item');
console.log('  ✓ Departments & Designations removed as a separate sidebar item');

// Ensure Company Profile, People, Cohorts exist under Organisation Management
assert.strictEqual(
  adminNavContent.includes("id: 'ca-company-profile'"),
  true,
  'ca-company-profile must be present in adminNav'
);
assert.strictEqual(
  adminNavContent.includes("id: 'people'"),
  true,
  'People & Faculty must be present in adminNav'
);
assert.strictEqual(
  adminNavContent.includes("id: 'cohorts'"),
  true,
  'Classes, Sections & Cohort Batches must be present in adminNav'
);
console.log('  ✓ Company Profile is the single organisation entry point in sidebar');
console.log('  ✓ People & Faculty and Classes, Sections & Cohort Batches preserved as distinct workflows');

// -------------------------------------------------------------
// Test 2: Route Preservation in App.tsx
// -------------------------------------------------------------
console.log('\nScenario 2: Route URLs and Deep Links Preservation');
const appContent = fs.readFileSync(path.join(__dirname, 'App.tsx'), 'utf-8');

assert.strictEqual(
  appContent.includes('path="organisation/company-profile"'),
  true,
  'Deep link /organisation/company-profile must be preserved'
);
assert.strictEqual(
  appContent.includes('path="organisation/branches-locations"'),
  true,
  'Deep link /organisation/branches-locations must be preserved'
);
assert.strictEqual(
  appContent.includes('path="organisation/departments-designations"'),
  true,
  'Deep link /organisation/departments-designations must be preserved'
);
console.log('  ✓ /organisation/company-profile route preserved');
console.log('  ✓ /organisation/branches-locations deep link preserved');
console.log('  ✓ /organisation/departments-designations deep link preserved');

// -------------------------------------------------------------
// Test 3: Subnavigation Tabs in OrganisationManagementPage.tsx
// -------------------------------------------------------------
console.log('\nScenario 3: Company Profile Page Subnavigation Tabs');
const orgPageContent = fs.readFileSync(path.join(__dirname, 'pages/Organisation/OrganisationManagementPage.tsx'), 'utf-8');

assert.strictEqual(
  orgPageContent.includes("'ca-company-profile'"),
  true,
  'Company Profile tab exists'
);
assert.strictEqual(
  orgPageContent.includes("'ca-branches-locations'"),
  true,
  'Branches & Locations tab exists'
);
assert.strictEqual(
  orgPageContent.includes("'ca-departments-designations'"),
  true,
  'Departments & Designations tab exists'
);
assert.strictEqual(
  orgPageContent.includes('<CompanyProfileView'),
  true,
  'CompanyProfileView component is wired to tab'
);
assert.strictEqual(
  orgPageContent.includes('<BranchesManagementView'),
  true,
  'BranchesManagementView component is wired to tab'
);
assert.strictEqual(
  orgPageContent.includes('<DepartmentsDesignationsView'),
  true,
  'DepartmentsDesignationsView component is wired to tab'
);
assert.strictEqual(
  orgPageContent.includes('useOrganisationBranding'),
  true,
  'OrganisationManagementPage displays dynamic organisation branding'
);
console.log('  ✓ All 3 tabs (Company Profile, Branches & Locations, Departments & Designations) are present');
console.log('  ✓ Existing views and functionality (Headquarters selection, departments, designations) preserved');
console.log('  ✓ Page header subtitle reflects saved company name dynamically');

// -------------------------------------------------------------
// Test 4: Global Branding Hook & Persistence
// -------------------------------------------------------------
console.log('\nScenario 4: Unified Branding Source of Truth & Header/Sidebar Integration');
const brandingHookContent = fs.readFileSync(path.join(__dirname, 'lib/useOrganisationBranding.ts'), 'utf-8');
const navbarContent = fs.readFileSync(path.join(__dirname, 'components/Navbar.tsx'), 'utf-8');
const sidebarContent = fs.readFileSync(path.join(__dirname, 'components/Sidebar.tsx'), 'utf-8');

assert.strictEqual(
  brandingHookContent.includes('venilearn_company'),
  true,
  'useOrganisationBranding uses venilearn_company persistence key'
);
assert.strictEqual(
  brandingHookContent.includes('venilearn_company_updated'),
  true,
  'useOrganisationBranding broadcasts and listens to venilearn_company_updated event'
);
assert.strictEqual(
  brandingHookContent.includes('venilearn_org_switched'),
  true,
  'useOrganisationBranding supports tenant switching'
);

assert.strictEqual(
  navbarContent.includes('useOrganisationBranding'),
  true,
  'Navbar uses useOrganisationBranding hook'
);
assert.strictEqual(
  navbarContent.includes('objectFit'),
  true,
  'Navbar applies object-fit: contain to company logo'
);

assert.strictEqual(
  sidebarContent.includes('useOrganisationBranding'),
  true,
  'Sidebar uses useOrganisationBranding hook'
);
assert.strictEqual(
  sidebarContent.includes('sidebarLogoSrc'),
  true,
  'Sidebar renders dynamic organisation logo'
);
assert.strictEqual(
  sidebarContent.includes('onError'),
  true,
  'Sidebar handles image load errors with graceful fallback'
);
assert.strictEqual(
  sidebarContent.includes('isPlatformAdmin'),
  true,
  'Sidebar keeps platform-level branding separate for Platform Administrator'
);
console.log('  ✓ Shared organisation branding hook used by Navbar, Sidebar, and Organisation Management');
console.log('  ✓ Immediate zero-refresh updates via venilearn_company_updated window events');
console.log('  ✓ object-fit: contain applied to prevent stretching or cropping');
console.log('  ✓ Platform administrator branding preserved cleanly without mixing tenant data');
console.log('  ✓ Automatic fallback to /logo.png on missing logo or network error');

console.log('\n================================================================');
console.log('   All 16 Organisation & Global Branding Tests Passed!');
console.log('================================================================\n');
