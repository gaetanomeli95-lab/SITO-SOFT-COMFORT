import fs from 'node:fs/promises';
import path from 'node:path';
import https from 'node:https';

const ROOT = path.resolve('.');
const DATA_FILE = path.join(ROOT, 'complementi-build', 'stones-complementi-clean.json');
const OUT_DIR = path.join(ROOT, 'catalogo-assets', 'complementi-arredi');
const data = JSON.parse(await fs.readFile(DATA_FILE, 'utf8'));

const requestBuffer = (url) => new Promise((resolve, reject) => {
  https.get(url, { headers: { 'User-Agent': 'SoftComfortCatalog/1.0' } }, (res) => {
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      resolve(requestBuffer(new URL(res.headers.location, url).toString()));
      return;
    }
    if (res.statusCode !== 200) {
      reject(new Error(`${res.statusCode} ${url}`));
      res.resume();
      return;
    }
    const chunks = [];
    res.on('data', (chunk) => chunks.push(chunk));
    res.on('end', () => resolve(Buffer.concat(chunks)));
  }).on('error', reject);
});

const extensionFromUrl = (url) => {
  const ext = path.extname(new URL(url).pathname).toLowerCase();
  return ext && ext.length <= 6 ? ext : '.jpg';
};

const safeName = (value) => value
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

await fs.mkdir(OUT_DIR, { recursive: true });

let downloaded = 0;
let reused = 0;
for (const product of data.products) {
  const localImages = [];
  for (let index = 0; index < product.images.length; index += 1) {
    const remote = product.images[index];
    const filename = `${safeName(product.slug)}-${String(index + 1).padStart(2, '0')}${extensionFromUrl(remote)}`;
    const absolute = path.join(OUT_DIR, filename);
    const relative = `catalogo-assets/complementi-arredi/${filename}`;
    try {
      await fs.access(absolute);
      reused += 1;
    } catch {
      const buffer = await requestBuffer(remote);
      await fs.writeFile(absolute, buffer);
      downloaded += 1;
    }
    localImages.push(relative);
  }
  product.images = localImages;
}

await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
console.log(JSON.stringify({ products: data.products.length, downloaded, reused, output: OUT_DIR }, null, 2));
