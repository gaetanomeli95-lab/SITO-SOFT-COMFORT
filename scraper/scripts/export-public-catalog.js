import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const scraperRoot = path.resolve(__dirname, '..');
const siteRoot = path.resolve(scraperRoot, '..');

const previewDir = path.join(scraperRoot, 'preview');
const previewAssetsDir = path.join(previewDir, 'assets');
const previewDetailsDir = path.join(previewDir, 'details');

const publicCatalogPath = path.join(siteRoot, 'catalogo-cucine.html');
const publicAssetsDir = path.join(siteRoot, 'catalogo-assets');
const publicDetailsDir = path.join(siteRoot, 'cucine');

const transformCatalogHtml = (html) => html
  .replace(/Preview Catalogo Soft Comfort/g, 'Catalogo Cucine Soft Comfort')
  .replace(/Preview catalogo/g, 'Catalogo cucine')
  .replace(/assets\//g, 'catalogo-assets/')
  .replace(/details\//g, 'cucine/');

const transformDetailHtml = (html) => html
  .replace(/\.\.\/catalog-preview\.html/g, '../catalogo-cucine.html')
  .replace(/\.\.\/assets\//g, '../catalogo-assets/');

const copySoftComfortAssets = async () => {
  await fs.mkdir(publicAssetsDir, { recursive: true });
  const files = await fs.readdir(previewAssetsDir);
  const publicFiles = files.filter((file) => file.startsWith('soft-comfort-'));

  for (const file of publicFiles) {
    await fs.copyFile(path.join(previewAssetsDir, file), path.join(publicAssetsDir, file));
  }

  return publicFiles.length;
};

const exportDetails = async () => {
  await fs.mkdir(publicDetailsDir, { recursive: true });
  const files = (await fs.readdir(previewDetailsDir)).filter((file) => file.endsWith('.html'));

  for (const file of files) {
    const source = await fs.readFile(path.join(previewDetailsDir, file), 'utf8');
    await fs.writeFile(path.join(publicDetailsDir, file), transformDetailHtml(source), 'utf8');
  }

  return files.length;
};

const catalogSource = await fs.readFile(path.join(previewDir, 'catalog-preview.html'), 'utf8');
await fs.writeFile(publicCatalogPath, transformCatalogHtml(catalogSource), 'utf8');

const assetsCount = await copySoftComfortAssets();
const detailsCount = await exportDetails();

console.log(`Public catalog exported: ${publicCatalogPath}`);
console.log(`Public detail pages: ${detailsCount}`);
console.log(`Public assets copied: ${assetsCount}`);
