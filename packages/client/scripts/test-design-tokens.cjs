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
  '#F6F5F0',
  '#FFFFFF',
  '#242522',
  '#706F68',
  '#E6E4DC',
  '#765448',
  '#8A2222',
  '#914811',
  '#7A5B0B',
  '#306B48',
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
console.log('PASS: All required color tokens verified in tailwind.config.js.');

console.log('\nAll frontend design system verification checks PASSED successfully!');
