const fs = require('fs');
let c = fs.readFileSync('d:/recall/frontend/src/pages/Homepage.js', 'utf8');

const r = [
  ['width: "min(1120px, 92vw)"', 'width: "min(1280px, 94vw)"'],
  ['padding: "78px 0 72px"', 'padding: "110px 0 100px"'],
  ['padding: "52px 0 68px"', 'padding: "96px 0 112px"'],
  ['padding: "20px 0 62px"', 'padding: "60px 0 96px"'],
  ['padding: "68px 0",', 'padding: "100px 0",'],
  ['padding: "74px 0 90px"', 'padding: "110px 0 130px"'],
  ['padding: "clamp(24px, 5vw, 42px)"', 'padding: "clamp(48px, 7vw, 80px)"'],
  ['padding: "26px 0 18px"', 'padding: "52px 0 36px"'],
  ['marginBottom: 34', 'marginBottom: 60'],
  ['marginTop: 22,', 'marginTop: 52,'],
  ['padding: "16px 18px",', 'padding: "28px 32px",'],
  ['height: 180,', 'height: 220,'],
  ['padding: "14px 16px 16px"', 'padding: "22px 24px 28px"'],
];

for (const [from, to] of r) c = c.split(from).join(to);

// stat value font size
c = c.replace('fontSize: 28,\r\n  color: "#ffd390"', 'fontSize: 38,\r\n  color: "#ffd390"');

fs.writeFileSync('d:/recall/frontend/src/pages/Homepage.js', c, 'utf8');
