import fsPromises from 'fs/promises';
import fs from 'fs';
import path from 'path';
import http from 'http';
import https from 'https';

const ROOT = path.resolve('.');
const DATA = JSON.parse(await fsPromises.readFile(path.join(ROOT, 'premobil-data', 'premobil-data.json'), 'utf8'));
const ASSETS_DIR = path.join(ROOT, 'catalogo-assets', 'premobil');
await fsPromises.mkdir(ASSETS_DIR, { recursive: true });

const download = (url, dest) => new Promise((resolve) => {
  const client = url.startsWith('https') ? https : http;
  const file = fs.createWriteStream(dest);
  client.get(url, (res) => {
    if (res.statusCode !== 200) { file.close(); resolve(false); return; }
    res.pipe(file);
    file.on('finish', () => { file.close(); resolve(true); });
  }).on('error', () => { file.close(); resolve(false); });
});

// Collect all unique image URLs
const allImages = new Set();
for (const p of DATA) {
  for (const img of p.bgs) allImages.add(img);
  for (const img of p.thumbs) allImages.add(img);
}

let done = 0;
let failed = 0;
for (const url of allImages) {
  const filename = path.basename(url).replace(/[^a-zA-Z0-9._-]/g, '_');
  const dest = path.join(ASSETS_DIR, filename);
  const ok = await download(url, dest);
  if (ok) done++; else failed++;
  process.stdout.write(`\r${done} OK | ${failed} FAIL`);
}
console.log(`\nDownload completato: ${done} immagini scaricate, ${failed} fallite`);
