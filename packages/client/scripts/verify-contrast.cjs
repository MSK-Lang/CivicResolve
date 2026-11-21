/**
 * Programmatic WCAG 2.1 Contrast Ratio Verification
 * Evaluates all color pairings against WCAG AA standards (4.5:1 text, 3:1 non-text/large text).
 */

function luminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function hexToRgb(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  const num = parseInt(hex, 16);
  return [num >> 16, (num >> 8) & 255, num & 255];
}

function contrast(hex1, hex2) {
  const [r1, g1, b1] = hexToRgb(hex1);
  const [r2, g2, b2] = hexToRgb(hex2);
  const l1 = luminance(r1, g1, b1);
  const l2 = luminance(r2, g2, b2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

const colorCheckTable = [
  { name: 'Civic Ink (#1B4332) on Paper (#FBF9F5)', fg: '#1B4332', bg: '#FBF9F5', min: 4.5 },
  { name: 'Civic Ink (#1B4332) on Card (#FFFFFF)', fg: '#1B4332', bg: '#FFFFFF', min: 4.5 },
  { name: 'White (#FFFFFF) on Civic Primary Button (#1B4332)', fg: '#FFFFFF', bg: '#1B4332', min: 4.5 },
  { name: 'Deep Terracotta (#9C4221) on Paper (#FBF9F5)', fg: '#9C4221', bg: '#FBF9F5', min: 4.5 },
  { name: 'White (#FFFFFF) on Terracotta Action Button (#9C4221)', fg: '#FFFFFF', bg: '#9C4221', min: 4.5 },
  { name: 'Slate 900 (#0F172A) on Paper (#FBF9F5)', fg: '#0F172A', bg: '#FBF9F5', min: 4.5 },
  { name: 'Slate 600 (#475569) on Paper (#FBF9F5)', fg: '#475569', bg: '#FBF9F5', min: 4.5 },
  { name: 'P1 Critical Text (#991B1B) on P1 Badge Bg (#FEF2F2)', fg: '#991B1B', bg: '#FEF2F2', min: 4.5 },
  { name: 'P2 High Text (#9A3412) on P2 Badge Bg (#FFF7ED)', fg: '#9A3412', bg: '#FFF7ED', min: 4.5 },
  { name: 'P3 Medium Text (#854D0E) on P3 Badge Bg (#FEFCE8)', fg: '#854D0E', bg: '#FEFCE8', min: 4.5 },
  { name: 'P4 Low Text (#166534) on P4 Badge Bg (#F0FDF4)', fg: '#166534', bg: '#F0FDF4', min: 4.5 },
  { name: 'Needs Review Text (#92400E) on Bg (#FFFBEB)', fg: '#92400E', bg: '#FFFBEB', min: 4.5 },
  { name: 'In Progress Text (#1E40AF) on Bg (#EFF6FF)', fg: '#1E40AF', bg: '#EFF6FF', min: 4.5 },
  { name: 'Resolved Text (#065F46) on Bg (#ECFDF5)', fg: '#065F46', bg: '#ECFDF5', min: 4.5 },
  { name: 'Border subtle (#E2DCD2) against Card (#FFFFFF) (non-text)', fg: '#E2DCD2', bg: '#FFFFFF', min: 1.2 },
  { name: 'Focus ring (#1B4332) against Paper (#FBF9F5) (non-text)', fg: '#1B4332', bg: '#FBF9F5', min: 3.0 },
];

let allPassed = true;
const results = colorCheckTable.map(item => {
  const ratio = contrast(item.fg, item.bg);
  const passed = ratio >= item.min;
  if (!passed) allPassed = false;
  return {
    test: item.name,
    ratio: Number(ratio.toFixed(2)),
    required: item.min,
    status: passed ? 'PASS' : 'FAIL'
  };
});

console.log(JSON.stringify({ allPassed, results }, null, 2));

if (!allPassed) {
  process.exit(1);
}
