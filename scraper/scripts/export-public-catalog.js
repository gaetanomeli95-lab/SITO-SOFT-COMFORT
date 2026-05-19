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
const catalogMode = process.argv[2] === 'camere' ? 'camere' : 'cucine';

const publicCatalogPath = path.join(siteRoot, catalogMode === 'camere' ? 'catalogo-camere-camerette.html' : 'catalogo-cucine.html');
const publicAssetsDir = path.join(siteRoot, 'catalogo-assets');
const publicDetailsDir = path.join(siteRoot, catalogMode === 'camere' ? 'camere-camerette' : 'cucine');

const transformCatalogHtml = (html) => html
  .replace(/Preview Catalogo Soft Comfort/g, catalogMode === 'camere' ? 'Catalogo Camere e Camerette Soft Comfort' : 'Catalogo Cucine Soft Comfort')
  .replace(/Catalogo cucine/g, catalogMode === 'camere' ? 'Catalogo camere e camerette' : 'Catalogo cucine')
  .replace(/catalogo cucine/g, catalogMode === 'camere' ? 'catalogo camere e camerette' : 'catalogo cucine')
  .replace(/Showroom digitale Soft Comfort/g, catalogMode === 'camere' ? 'Camere e camerette Soft Comfort' : 'Showroom digitale Soft Comfort')
  .replace(/Una selezione di soluzioni cucina/g, catalogMode === 'camere' ? 'Una selezione di camere e camerette' : 'Una selezione di soluzioni cucina')
  .replace(/assets\//g, 'catalogo-assets/')
  .replace(/details\//g, catalogMode === 'camere' ? 'camere-camerette/' : 'cucine/');

const transformDetailHtml = (html) => html
  .replace(/\.\.\/catalog-preview\.html/g, catalogMode === 'camere' ? '../catalogo-camere-camerette.html' : '../catalogo-cucine.html')
  .replace(/Vedi altre cucine/g, catalogMode === 'camere' ? 'Vedi altre soluzioni' : 'Vedi altre cucine')
  .replace(/\.\.\/assets\//g, '../catalogo-assets/');

const getReferencedAssets = (htmlValues) => {
  const assets = new Set();

  htmlValues.forEach((html) => {
    [...html.matchAll(/(?:src|href|data-gallery-image)="(?:\.\.\/)?assets\/([^"]+)"/g)]
      .forEach((match) => assets.add(match[1]));
  });

  return assets;
};

const copySoftComfortAssets = async (referencedAssets) => {
  await fs.mkdir(publicAssetsDir, { recursive: true });
  const files = await fs.readdir(previewAssetsDir);
  const publicFiles = files.filter((file) => file.startsWith('soft-comfort-') && referencedAssets.has(file));

  for (const file of publicFiles) {
    await fs.copyFile(path.join(previewAssetsDir, file), path.join(publicAssetsDir, file));
  }

  return publicFiles.length;
};

const exportDetails = async () => {
  await fs.mkdir(publicDetailsDir, { recursive: true });
  const files = (await fs.readdir(previewDetailsDir)).filter((file) => file.endsWith('.html'));
  const detailSources = [];

  for (const file of files) {
    const source = await fs.readFile(path.join(previewDetailsDir, file), 'utf8');
    detailSources.push(source);
    await fs.writeFile(path.join(publicDetailsDir, file), transformDetailHtml(source), 'utf8');
  }

  return { count: files.length, sources: detailSources };
};

const catalogSource = await fs.readFile(path.join(previewDir, 'catalog-preview.html'), 'utf8');
await fs.writeFile(publicCatalogPath, transformCatalogHtml(catalogSource), 'utf8');

const details = await exportDetails();
const assetsCount = await copySoftComfortAssets(getReferencedAssets([catalogSource, ...details.sources]));

console.log(`Public catalog exported: ${publicCatalogPath}`);
console.log(`Public detail pages: ${details.count}`);
console.log(`Public assets copied: ${assetsCount}`);
