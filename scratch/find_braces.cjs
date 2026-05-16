const fs = require('fs');
const content = fs.readFileSync('/Users/cristiano/POKEMPAGNA/src/components/master/LivePokemonCard.jsx', 'utf8');
let stack = [];
let line = 1;
let col = 1;
for (let i = 0; i < content.length; i++) {
    const char = content[i];
    if (char === '\n') {
        line++;
        col = 1;
    } else {
        col++;
    }
    if (char === '{') {
        stack.push({ line, col, char });
    } else if (char === '}') {
        if (stack.length === 0) {
            console.log(`Extra } at line ${line}, col ${col}`);
        } else {
            stack.pop();
        }
    }
}
if (stack.length > 0) {
    stack.forEach(s => console.log(`Unclosed ${s.char} at line ${s.line}, col ${s.col}`));
}
