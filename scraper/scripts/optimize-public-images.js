import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const siteRoot = path.resolve(__dirname, '..', '..');
const publicAssetsDir = path.join(siteRoot, 'catalogo-assets');
const catalogMode = process.argv[2] === 'camere' ? 'camere' : 'cucine';
const publicDetailsDir = path.join(siteRoot, catalogMode === 'camere' ? 'camere-camerette' : 'cucine');
const publicCatalogPath = path.join(siteRoot, catalogMode === 'camere' ? 'catalogo-camere-camerette.html' : 'catalogo-cucine.html');

const imageExtensions = new Set(['.jpg', '.jpeg', '.png']);
const mimeTypes = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png'
};

const toWebpName = (fileName) => fileName.replace(/\.(jpg|jpeg|png)$/i, '.webp');

const encodeImage = async (page, filePath, mimeType) => {
  const buffer = await fs.readFile(filePath);
  const dataUrl = `data:${mimeType};base64,${buffer.toString('base64')}`;

  return page.evaluate(async ({ dataUrl: source }) => {
    const image = new Image();
    image.decoding = 'async';
    image.src = source;
    await image.decode();

    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;

    const context = canvas.getContext('2d', { alpha: false });
    context.drawImage(image, 0, 0);

    return canvas.toDataURL('image/webp', 0.82).split(',')[1];
  }, { dataUrl });
};

const replaceAssetReferences = async () => {
  const files = [publicCatalogPath];
  const detailFiles = (await fs.readdir(publicDetailsDir))
    .filter((file) => file.endsWith('.html'))
    .map((file) => path.join(publicDetailsDir, file));

  files.push(...detailFiles);

  for (const filePath of files) {
    let html = await fs.readFile(filePath, 'utf8');
    html = html.replace(/(catalogo-assets\/soft-comfort-[^"'\s<>]+?)\.(jpg|jpeg|png)/gi, '$1.webp');
    await fs.writeFile(filePath, html, 'utf8');
  }
};

const assets = (await fs.readdir(publicAssetsDir))
  .filter((file) => imageExtensions.has(path.extname(file).toLowerCase()) && file.startsWith('soft-comfort-'));

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
let converted = 0;
let skipped = 0;
let removedOriginals = 0;

try {
  for (const asset of assets) {
    const sourcePath = path.join(publicAssetsDir, asset);
    const targetPath = path.join(publicAssetsDir, toWebpName(asset));

    try {
      await fs.access(targetPath);
      skipped += 1;
      continue;
    } catch {
      const ext = path.extname(asset).toLowerCase();
      const base64 = await encodeImage(page, sourcePath, mimeTypes[ext]);
      await fs.writeFile(targetPath, Buffer.from(base64, 'base64'));
      converted += 1;
    }
  }

  await replaceAssetReferences();

  for (const asset of assets) {
    await fs.rm(path.join(publicAssetsDir, asset), { force: true });
    removedOriginals += 1;
  }

  console.log(`Images converted to WebP: ${converted}`);
  console.log(`Images already optimized: ${skipped}`);
  console.log(`Original JPG/PNG images removed: ${removedOriginals}`);
} finally {
  await browser.close();
}
