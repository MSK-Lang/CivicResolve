const fs = require('fs');
const path = require('path');

function checkFileForEmDash(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return content.includes('\u2014');
}

function checkEmDashes(targetPath) {
  const stat = fs.statSync(targetPath);
  if (!stat.isDirectory()) {
    return checkFileForEmDash(targetPath) ? [targetPath] : [];
  }

  const files = fs.readdirSync(targetPath, { withFileTypes: true });
  const violations = [];

  for (const file of files) {
    const fullPath = path.join(targetPath, file.name);
    if (file.isDirectory()) {
      if (file.name !== 'node_modules' && file.name !== 'dist' && file.name !== '.git') {
        violations.push(...checkEmDashes(fullPath));
      }
    } else if (
      file.name.endsWith('.ts') ||
      file.name.endsWith('.tsx') ||
      file.name.endsWith('.css') ||
      file.name.endsWith('.html') ||
      file.name.endsWith('.md')
    ) {
      if (checkFileForEmDash(fullPath)) {
        violations.push(fullPath);
      }
    }
  }

  return violations;
}

console.log('--- Anti-Slop R-02 Em Dash Verification ---');
const srcViolations = checkEmDashes(path.resolve(__dirname, '../src'));
const rootDesignViolations = checkEmDashes(path.resolve(__dirname, '../../../DESIGN.md'));

if (srcViolations.length > 0 || rootDesignViolations.length > 0) {
  console.error('FAIL: Found em dashes in files:', [...srcViolations, ...rootDesignViolations]);
  process.exit(1);
} else {
  console.log('PASS: Zero em dashes found across all client source files and DESIGN.md.');
}

console.log('--- Design System Tokens Verification ---');
const tailwindConfigPath = path.resolve(__dirname, '../tailwind.config.js');
const tailwindConfig = fs.readFileSync(tailwindConfigPath, 'utf8');

const requiredTokens = [
  '#0C241B', // civic-950
  '#112A1F', // civic-900
  '#1B4332', // civic-800
  '#2D6A4F', // civic-700
  '#9C4221', // terracotta-700
  '#C05621', // terracotta-600
  '#FDF6ED', // terracotta-50
  '#FBF9F5', // paper-bg
  '#FFFFFF', // paper-card
  '#F3EFE6', // paper-subtle
  '#E2DCD2', // border-subtle
  '#B8AFA0', // border-strong
  '#0F172A', // text-primary
  '#475569', // text-secondary
  '#FEF2F2', // P1 bg
  '#991B1B', // P1 text
  '#FFF7ED', // P2 bg
  '#9A3412', // P2 text
  '#FEFCE8', // P3 bg
  '#854D0E', // P3 text
  '#F0FDF4', // P4 bg
  '#166534', // P4 text
];

let allTokensFound = true;
for (const token of requiredTokens) {
  if (!tailwindConfig.toLowerCase().includes(token.toLowerCase())) {
    console.error(`FAIL: Required token ${token} not found in tailwind.config.js`);
    allTokensFound = false;
  }
}

if (!allTokensFound) {
  process.exit(1);
}
console.log('PASS: All 22 required color tokens from DESIGN.md verified in tailwind.config.js.');

console.log('--- Touch Target and Focus Verification ---');
const indexCssPath = path.resolve(__dirname, '../src/index.css');
const indexCss = fs.readFileSync(indexCssPath, 'utf8');

if (!indexCss.includes(':focus-visible') || !indexCss.includes('#1B4332')) {
  console.error('FAIL: Missing high-contrast focus-visible outline in index.css');
  process.exit(1);
}
console.log('PASS: High-contrast focus-visible ring verified.');

if (!indexCss.includes('prefers-reduced-motion')) {
  console.error('FAIL: Missing prefers-reduced-motion media query in index.css');
  process.exit(1);
}
console.log('PASS: Reduced-motion media query verified.');

console.log('\nAll frontend design system verification checks PASSED successfully!');
