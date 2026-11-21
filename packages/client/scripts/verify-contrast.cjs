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
  { name: 'Primary Ink (#242522) on Canvas (#F6F5F0)', fg: '#242522', bg: '#F6F5F0', min: 4.5 },
  { name: 'Primary Ink (#242522) on Surface (#FFFFFF)', fg: '#242522', bg: '#FFFFFF', min: 4.5 },
  { name: 'White (#FFFFFF) on Accent Action Button (#765448)', fg: '#FFFFFF', bg: '#765448', min: 4.5 },
  { name: 'Secondary Text (#706F68) on Canvas (#F6F5F0)', fg: '#706F68', bg: '#F6F5F0', min: 4.5 },
  { name: 'P1 Critical Text (#8A2222) on P1 Badge Bg (#FBEBEB)', fg: '#8A2222', bg: '#FBEBEB', min: 4.5 },
  { name: 'P2 High Text (#914811) on P2 Badge Bg (#FDF2E9)', fg: '#914811', bg: '#FDF2E9', min: 4.5 },
  { name: 'P3 Medium Text (#7A5B0B) on P3 Badge Bg (#FEF9E7)', fg: '#7A5B0B', bg: '#FEF9E7', min: 4.5 },
  { name: 'P4 Low Text (#306B48) on P4 Badge Bg (#EDF6F0)', fg: '#306B48', bg: '#EDF6F0', min: 4.5 },
  { name: 'Border (#E6E4DC) against Surface (#FFFFFF)', fg: '#E6E4DC', bg: '#FFFFFF', min: 1.1 },
  { name: 'Focus ring (#765448) against Canvas (#F6F5F0)', fg: '#765448', bg: '#F6F5F0', min: 3.0 },
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
    status: passed ? 'PASS' : 'FAIL',
  };
});

console.log(JSON.stringify({ allPassed, results }, null, 2));

if (!allPassed) {
  process.exit(1);
}
