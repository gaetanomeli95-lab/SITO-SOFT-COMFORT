import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { getSupplier } from '../src/suppliers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const scraperRoot = path.resolve(__dirname, '..');
const outputDir = path.join(scraperRoot, 'output');

const supplierKey = process.argv[2];
const categoryArg = process.argv[3]?.startsWith('http') ? '' : process.argv[3] || '';
const urls = process.argv.slice(categoryArg ? 4 : 3);
const supplierConfig = getSupplier(supplierKey);

if (!supplierKey || urls.length === 0) {
  console.error('Usage: node scripts/extract-products.js <supplier> [categoryName] <url1> <url2> ...');
  process.exit(1);
}

const slugify = (value) => String(value || '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 90);

const normalizeUrl = (value, baseUrl) => {
  if (!value) return '';
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return '';
  }
};

const unique = (items) => [...new Set(items.filter(Boolean))];

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const cleanText = (value) => String(value || '')
  .replace(/\s+/g, ' ')
  .replace(/\s+([,.!?;:])/g, '$1')
  .trim();

const inferProductName = (title, headings) => {
  const candidates = [
    ...headings.filter((heading) => heading.length <= 42),
    title
  ];

  return candidates.find((value) => /^[A-Z0-9À-Ü\s/-]{3,}$/.test(value)) || title;
};

const extractProduct = async (page, url) => {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(2200);

  const data = await page.evaluate(() => {
    const text = (selector) => document.querySelector(selector)?.textContent?.trim() || '';
    const attr = (selector, name) => document.querySelector(selector)?.getAttribute(name)?.trim() || '';

    const title = text('h1') || document.title || '';
    const metaDescription = attr('meta[name="description"]', 'content') || attr('meta[property="og:description"]', 'content');
    const ogImage = attr('meta[property="og:image"]', 'content');

    const headings = [...document.querySelectorAll('h1, h2, h3, h4')]
      .map((node) => node.textContent.trim())
      .filter(Boolean)
      .slice(0, 60);

    const paragraphs = [...document.querySelectorAll('p, li')]
      .map((node) => node.textContent.trim())
      .filter((value) => value.length > 28)
      .slice(0, 60);

    const images = [...document.images]
      .map((img) => ({
        src: img.currentSrc || img.src || img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || '',
        alt: img.alt || '',
        width: img.naturalWidth || 0,
        height: img.naturalHeight || 0
      }))
      .filter((img) => img.src && !img.src.startsWith('data:'))
      .sort((a, b) => (b.width * b.height) - (a.width * a.height))
      .slice(0, 40);

    return { title, metaDescription, ogImage, headings, paragraphs, images };
  });

  const title = cleanText(data.title);
  const headings = data.headings.map(cleanText).filter(Boolean);
  const paragraphs = data.paragraphs.map(cleanText).filter(Boolean);
  const productName = cleanText(inferProductName(title, headings));

  const description = cleanText(data.metaDescription || paragraphs[0] || title);
  const notes = unique(headings)
    .filter((heading) => heading.length > 2 && heading.length < 90)
    .slice(0, 16);

  const imageUrls = unique([
    normalizeUrl(data.ogImage, url),
    ...data.images.map((image) => normalizeUrl(image.src, url))
  ]).slice(0, 14);

  return {
    id: `${slugify(supplierKey)}-${slugify(productName)}`,
    supplier: supplierConfig.name,
    sourceUrl: url,
    category: categoryArg || supplierConfig.defaultCategory,
    title: productName,
    subtitle: title !== productName ? title : '',
    description,
    technicalFeatures: {
      materials: '',
      finishes: notes.filter((note) => /finitura|colore|legno|pet|laccato|opaco|lucido|pietra|noce|frassino|gres/i.test(note)).slice(0, 12),
      dimensions: '',
      modularity: 'Composizione modulare personalizzabile in showroom.',
      notes
    },
    images: imageUrls,
    tags: supplierConfig.focus,
    scrapedAt: new Date().toISOString()
  };
};

await fs.mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 1440, height: 1100 },
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
});

const products = [];

try {
  for (const [index, url] of urls.entries()) {
    console.log(`Extracting ${index + 1}/${urls.length}: ${url}`);
    const product = await extractProduct(page, url);
    products.push(product);
    await wait(1800 + Math.floor(Math.random() * 1200));
  }

  const catalog = {
    supplier: supplierConfig.name,
    category: categoryArg || supplierConfig.defaultCategory,
    total: products.length,
    products,
    generatedAt: new Date().toISOString()
  };

  const outputPath = path.join(outputDir, `${new Date().toISOString().replace(/[:.]/g, '-')}-${slugify(supplierKey)}-catalog.json`);
  await fs.writeFile(outputPath, JSON.stringify(catalog, null, 2), 'utf8');

  console.log(`Catalog saved: ${outputPath}`);
  console.log(`Products: ${products.length}`);
} catch (error) {
  console.error('Catalog extraction failed');
  console.error(error);
  process.exitCode = 1;
} finally {
  await browser.close();
}
