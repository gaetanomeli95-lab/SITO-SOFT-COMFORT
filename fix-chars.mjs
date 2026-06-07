import fs from 'fs';
import path from 'path';

const fixChars = (s) => s
  .replace(/←/g, '&larr;')
  .replace(/→/g, '&rarr;')
  .replace(/·/g, ' &middot; ')
  .replace(/’/g, "'")
  .replace(/'/g, "'")
  .replace(/"/g, '"')
  .replace(/"/g, '"')
  .replace(/…/g, '...')
  .replace(/–/g, '-')
  .replace(/—/g, '-')
  .replace(/ /g, ' ');

const files = [
  'catalogo-pareti-attrezzate.html',
  ...fs.readdirSync('camere-camerette').filter(f => f.startsWith('camere-da-letto-premobil-')).map(f => path.join('camere-camerette', f)),
  ...fs.readdirSync('pareti-attrezzate').filter(f => f.endsWith('.html')).map(f => path.join('pareti-attrezzate', f)),
];

let fixed = 0;
for (const f of files) {
  if (!fs.existsSync(f)) continue;
  let content = fs.readFileSync(f, 'utf8');
  const newContent = fixChars(content);
  if (newContent !== content) {
    fs.writeFileSync(f, newContent, 'utf8');
    fixed++;
    console.log('Fixed:', f);
  }
}
console.log('Total fixed:', fixed);
