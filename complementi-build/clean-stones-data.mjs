import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve('.');
const SRC = path.join(ROOT, 'complementi-build', 'stones-complementi-review.json');
const OUT = path.join(ROOT, 'complementi-build', 'stones-complementi-clean.json');

const raw = JSON.parse(await fs.readFile(SRC, 'utf8'));

const cleanText = (text = '') => text
  .replace(/\bStones\b/gi, '')
  .replace(/&times;\s*-->/g, '')
  .replace(/-->/g, '')
  .replace(/\bNota 1\b|\bNota 2\b|\bNota 3\b/g, '')
  .replace(/\. Cerca Inserisci: Mostra tutti Prodotti[\s\S]*$/i, '')
  .replace(/Le immagini e i colori dei prodotti visualizzati[\s\S]*$/i, '')
  .replace(/\s+/g, ' ')
  .trim();

const imageKey = (url) => url
  .replace('/product/', '/original/')
  .replace(/\?.*$/, '');

const cleanImages = (images = []) => {
  const byKey = new Map();
  for (const image of images) {
    const clean = image.replace(/\?.*$/, '');
    const key = imageKey(clean);
    if (!byKey.has(key) || clean.includes('/original/')) byKey.set(key, clean);
  }
  return [...byKey.values()].filter((image) => image.includes('/original/'));
};

const compactDimension = (dimensions = []) => dimensions.find((dimension) => /X|H\./i.test(dimension)) || dimensions[0] || '';

const classifyClean = (product) => {
  const text = cleanText(product.detailsText).toLowerCase();
  const firstPart = text.slice(0, 700);
  if (/\bsgabello\b|\bsgabelli\b/.test(firstPart)) return 'sgabelli';
  if (/\btavolo\b|\btavoli\b|\bconsolle\b/.test(firstPart)) return 'tavoli';
  if (/\bsedia\b|\bsedie\b|\bseduta\b/.test(firstPart)) return 'sedie';
  return product.category;
};

const products = raw.products.map((product) => ({
  name: product.name,
  slug: product.slug,
  category: classifyClean(product),
  sourceUrl: product.sourceUrl,
  sourcePdf: product.sourcePdf,
  catalogPage: product.catalogPage,
  images: cleanImages(product.images),
  dimensioni: compactDimension(product.dimensions),
  detailsText: cleanText(product.detailsText),
  verification: product.verification
}));

const summary = products.reduce((acc, product) => {
  acc[product.category] = (acc[product.category] || 0) + 1;
  return acc;
}, {});

const checks = {
  missingImages: products.filter((product) => product.images.length === 0).map((product) => product.slug),
  missingDetails: products.filter((product) => !product.detailsText).map((product) => product.slug),
  missingPdf: products.filter((product) => !product.sourcePdf).map((product) => product.slug),
  categoriesToVerify: products.filter((product) => product.category === 'da_verificare').map((product) => product.slug)
};

await fs.writeFile(OUT, JSON.stringify({
  source: raw.source,
  generatedAt: raw.generatedAt,
  cleanedAt: new Date().toISOString(),
  total: products.length,
  summary,
  checks,
  products
}, null, 2), 'utf8');

console.log(JSON.stringify({ output: OUT, total: products.length, summary, checks }, null, 2));
