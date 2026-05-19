import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { getSupplier } from '../src/suppliers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const scraperRoot = path.resolve(__dirname, '..');
const outputDir = path.join(scraperRoot, 'output');

const targetUrl = process.argv[2];
const supplier = process.argv[3] || 'supplier';
const supplierConfig = getSupplier(supplier);

if (!targetUrl) {
  console.error('Usage: npm run analyze -- <url> <supplier>');
  process.exit(1);
}

const slugify = (value) => String(value || '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 80);

const normalizeUrl = (value, baseUrl) => {
  if (!value) return '';
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return '';
  }
};

const unique = (items) => [...new Set(items.filter(Boolean))];

await fs.mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 1440, height: 1100 },
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
});

try {
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(2500);

  const data = await page.evaluate(() => {
    const text = (selector) => document.querySelector(selector)?.textContent?.trim() || '';
    const attr = (selector, name) => document.querySelector(selector)?.getAttribute(name)?.trim() || '';
    const title = text('h1') || document.title || '';
    const metaDescription = attr('meta[name="description"]', 'content') || attr('meta[property="og:description"]', 'content');
    const ogImage = attr('meta[property="og:image"]', 'content');

    const headings = [...document.querySelectorAll('h1, h2, h3')]
      .map((node) => node.textContent.trim())
      .filter(Boolean)
      .slice(0, 30);

    const paragraphs = [...document.querySelectorAll('p')]
      .map((node) => node.textContent.trim())
      .filter((value) => value.length > 35)
      .slice(0, 20);

    const images = [...document.images]
      .map((img) => ({
        src: img.currentSrc || img.src || img.getAttribute('data-src') || '',
        alt: img.alt || '',
        width: img.naturalWidth || 0,
        height: img.naturalHeight || 0
      }))
      .filter((img) => img.src && !img.src.startsWith('data:'))
      .sort((a, b) => (b.width * b.height) - (a.width * a.height))
      .slice(0, 30);

    const links = [...document.querySelectorAll('a[href]')]
      .map((link) => ({
        href: link.href,
        text: link.textContent.trim()
      }))
      .filter((link) => link.href && link.text)
      .slice(0, 80);

    return {
      title,
      metaDescription,
      ogImage,
      headings,
      paragraphs,
      images,
      links
    };
  });

  const productCandidate = {
    id: `${slugify(supplier)}-${slugify(data.title || 'pagina')}`,
    supplier: supplierConfig.name,
    sourceUrl: targetUrl,
    category: supplierConfig.defaultCategory,
    title: data.title,
    subtitle: '',
    description: data.metaDescription || data.paragraphs[0] || '',
    technicalFeatures: {
      materials: '',
      finishes: [],
      dimensions: '',
      modularity: '',
      notes: data.headings.slice(0, 8)
    },
    images: unique([
      normalizeUrl(data.ogImage, targetUrl),
      ...data.images.map((image) => normalizeUrl(image.src, targetUrl))
    ]).slice(0, 12),
    tags: supplierConfig.focus,
    rawAnalysis: {
      headings: data.headings,
      paragraphs: data.paragraphs,
      imageCandidates: data.images,
      linkCandidates: data.links
    },
    scrapedAt: new Date().toISOString()
  };

  const fileName = `${new Date().toISOString().replace(/[:.]/g, '-')}-${slugify(supplier)}-${slugify(data.title || 'analysis')}.json`;
  const outputPath = path.join(outputDir, fileName);

  await fs.writeFile(outputPath, JSON.stringify(productCandidate, null, 2), 'utf8');

  console.log(`Analysis saved: ${outputPath}`);
  console.log(`Title: ${productCandidate.title}`);
  console.log(`Images: ${productCandidate.images.length}`);
  console.log(`Links: ${productCandidate.rawAnalysis.linkCandidates.length}`);
} catch (error) {
  console.error(`Analysis failed for ${targetUrl}`);
  console.error(error);
  process.exitCode = 1;
} finally {
  await browser.close();
}
