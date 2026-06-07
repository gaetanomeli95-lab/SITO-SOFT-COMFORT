import fs from 'fs';

const files = fs.readdirSync('.').filter(f => f.startsWith('catalogo-') && f.endsWith('.html'));
let fixed = 0;
for (const f of files) {
  let c = fs.readFileSync(f, 'utf8');
  const oldStr = 'Tavoli e sedie</a>`n        <a href="catalogo-pareti-attrezzate.html" data-catalog-nav="pareti">Pareti attrezzate</a>';
  const newStr = 'Tavoli e sedie</a>\n        <a href="catalogo-pareti-attrezzate.html" data-catalog-nav="pareti">Pareti attrezzate</a>';
  if (c.includes(oldStr)) {
    c = c.replace(oldStr, newStr);
    fs.writeFileSync(f, c, 'utf8');
    fixed++;
  }
}
console.log('Fixed', fixed, 'files');
