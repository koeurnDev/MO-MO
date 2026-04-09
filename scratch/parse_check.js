const parser = require('@babel/parser');
const fs = require('fs');
const code = fs.readFileSync('webapp/src/components/AdminDashboard.jsx', 'utf-8');
try {
  parser.parse(code, {
    sourceType: 'module',
    plugins: ['jsx']
  });
  console.log('Parsed successfully');
} catch (e) {
  console.log(`Error at line ${e.loc.line}, column ${e.loc.column}: ${e.message}`);
}
