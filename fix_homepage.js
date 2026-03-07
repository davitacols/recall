const fs = require('fs');
let c = fs.readFileSync('d:/recall/frontend/src/pages/Homepage.js', 'utf8');

c = c
  .replace(
    '<button onClick={() => navigate("/privacy")} style={footerMutedButton}>Privacy</button>',
    '<a href="/privacy" style={footerMutedLink}>Privacy</a>'
  )
  .replace(
    '<button onClick={() => navigate("/terms")} style={footerMutedButton}>Terms</button>',
    '<a href="/terms" style={footerMutedLink}>Terms</a>'
  )
  .replace(
    '<button onClick={() => navigate("/security-annex")} style={footerMutedButton}>Security</button>',
    '<a href="/security-annex" style={footerMutedLink}>Security</a>'
  )
  .replace(
    'const footerMutedButton = {',
    'const footerMutedLink = {\r\n  color: "rgba(244,239,230,0.58)",\r\n  fontSize: 12,\r\n  textDecoration: "none",\r\n};\r\n\r\nconst footerMutedButton = {'
  );

fs.writeFileSync('d:/recall/frontend/src/pages/Homepage.js', c, 'utf8');
fs.writeFileSync('d:/recall/fix_result.txt', 'has_link:' + c.includes('href="/privacy"') + '\nhas_style:' + c.includes('footerMutedLink'));
