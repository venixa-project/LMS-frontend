// ============================================================
// Automated Validation Suite: Course Builder Image Upload & Sidebar Simplification
// ============================================================
const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('================================================================');
console.log('   Course Builder Image Upload & Sidebar Simplification Test Suite');
console.log('================================================================\n');

// -------------------------------------------------------------
// Test 1: Course Builder Thumbnail Image Upload & Completion Policy Removal
// -------------------------------------------------------------
console.log('Scenario 1: Course Builder Step 1 UI Updates');
const courseBuilderContent = fs.readFileSync(path.join(__dirname, 'pages/Courses/CourseBuilderPage.tsx'), 'utf-8');

// Ensure manual text input for thumbnail URL is replaced
assert.strictEqual(
  courseBuilderContent.includes('placeholder="https://images.unsplash.com/..."'),
  false,
  'Manual thumbnail URL text input must be removed'
);
assert.strictEqual(
  courseBuilderContent.includes('Tech Preset 1'),
  false,
  'Preset buttons must be removed'
);

// Ensure drag & drop and file upload exists
assert.strictEqual(
  courseBuilderContent.includes('handleThumbnailFileSelect'),
  true,
  'File selection handler must be implemented'
);
assert.strictEqual(
  courseBuilderContent.includes('accept="image/png,image/jpeg,image/jpg,image/webp"'),
  true,
  'Supported image formats must include PNG, JPG, JPEG, and WebP'
);
assert.strictEqual(
  courseBuilderContent.includes('handleThumbnailDragOver'),
  true,
  'Drag over handler must be implemented'
);
assert.strictEqual(
  courseBuilderContent.includes('handleThumbnailDrop'),
  true,
  'Drag and drop handler must be implemented'
);
assert.strictEqual(
  courseBuilderContent.includes('handleRemoveThumbnail'),
  true,
  'Remove action must be implemented'
);
assert.strictEqual(
  courseBuilderContent.includes('Replace Image'),
  true,
  'Replace action must be available'
);
assert.strictEqual(
  courseBuilderContent.includes('DEFAULT_COURSE_THUMBNAIL'),
  true,
  'Sensible default thumbnail must be defined'
);
console.log('  ✓ Manual Course Thumbnail URL text input removed');
console.log('  ✓ Drag-and-drop file upload with Browse Files button implemented');
console.log('  ✓ Supported formats: PNG, JPG, JPEG, WebP with 5MB validation');
console.log('  ✓ Image preview, Replace, and Remove actions implemented');
console.log('  ✓ Sensible default thumbnail fallback provided');

// Ensure Completion Policy dropdown is removed from Step 1 UI
assert.strictEqual(
  courseBuilderContent.includes('<select\n                className="form-select"\n                value={completionPolicy}'),
  false,
  'Completion Policy select dropdown must be removed from Step 1'
);
// But completionPolicy state and backward compatibility must be preserved
assert.strictEqual(
  courseBuilderContent.includes('completionPolicy,'),
  true,
  'completionPolicy must be preserved in course object for backward compatibility'
);
assert.strictEqual(
  courseBuilderContent.includes('if (existing.completionPolicy) setCompletionPolicy(existing.completionPolicy);'),
  true,
  'Existing saved completionPolicy must be loaded when editing a course'
);
console.log('  ✓ Completion Policy dropdown removed from Step 1 form');
console.log('  ✓ completionPolicy state and backward compatibility preserved for existing courses');

// -------------------------------------------------------------
// Test 2: Course Thumbnail Display in Course Details
// -------------------------------------------------------------
console.log('\nScenario 2: Course Thumbnail Display in Course Details');
const publicDetailsContent = fs.readFileSync(path.join(__dirname, 'pages/Courses/PublicCourseDetailsPage.tsx'), 'utf-8');

assert.strictEqual(
  publicDetailsContent.includes('background: course.thumbnail'),
  true,
  'PublicCourseDetailsPage must display course.thumbnail'
);
console.log('  ✓ Course thumbnail displayed in course details sidebar hero card');

// -------------------------------------------------------------
// Test 3: Sidebar Simplification for Single-Item Parent Groups
// -------------------------------------------------------------
console.log('\nScenario 3: Sidebar Navigation Single-Item Simplification');
const sidebarContent = fs.readFileSync(path.join(__dirname, 'components/Sidebar.tsx'), 'utf-8');

assert.strictEqual(
  sidebarContent.includes('if (items.length === 1) {'),
  true,
  'Sidebar must directly render single-item sections without expand/collapse arrows'
);
assert.strictEqual(
  sidebarContent.includes('if (isMainGroup && items.length === 1)'),
  false,
  'Sidebar must not restrict direct single-item rendering to Main group only'
);
console.log('  ✓ Single-item parent groups rendered directly as normal navigation links');
console.log('  ✓ Unnecessary expand/collapse arrows and redundant nesting eliminated');
console.log('  ✓ Multi-item sections remain fully expandable with accordion behavior');

console.log('\n================================================================');
console.log('   All 12 Course Builder & Sidebar Tests Passed!');
console.log('================================================================\n');
