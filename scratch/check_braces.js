const fs = require('fs');
const content = fs.readFileSync('webapp/src/components/AdminDashboard.jsx', 'utf-8');
const lines = content.split('\n');
let openBraces = 0;
let openParens = 0;
let openBrackets = 0;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (let char of line) {
        if (char === '{') openBraces++;
        if (char === '}') openBraces--;
        if (char === '(') openParens++;
        if (char === ')') openParens--;
        if (char === '[') openBrackets++;
        if (char === ']') openBrackets--;
    }
    if (openBraces < 0 || openParens < 0 || openBrackets < 0) {
        console.log(`Error at line ${i + 1}: Unbalanced closing character`);
        process.exit(1);
    }
}
console.log(`Final state: Braces: ${openBraces}, Parens: ${openParens}, Brackets: ${openBrackets}`);
if (openBraces !== 0 || openParens !== 0 || openBrackets !== 0) {
    console.log('Unbalanced at end of file');
}
