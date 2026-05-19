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
const categoryName = process.argv[3] || '';
const urls = process.argv.slice(4);
const supplierConfig = getSupplier(supplierKey);

if (!supplierKey || urls.length === 0) {
  console.error('Usage: node scripts/discover-products.js <supplier> <categoryName> <categoryUrl1> <categoryUrl2> ...');
  process.exit(1);
}

const slugify = (value) => String(value || '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 90);

const uniqueByHref = (items) => {
  const seen = new Set();
  return items.filter((item) => {
    if (!item.href || seen.has(item.href)) return false;
    seen.add(item.href);
    return true;
  });
};

await fs.mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 1440, height: 1200 },
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
});

const discovered = [];

try {
  for (const url of urls) {
    console.log(`Discovering products from: ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(2500);

    const links = await page.evaluate(() => [...document.querySelectorAll('a[href]')]
      .map((link) => ({
        href: link.href,
        text: link.textContent.trim().replace(/\s+/g, ' ')
      }))
      .filter((link) => link.href.includes('/cucina/'))
      .filter((link) => !/contatti|rivenditori|promozioni|blog|privacy|cookie/i.test(link.href))
      .filter((link) => link.text.length > 1));

    discovered.push(...links.map((link) => ({
      ...link,
      category: categoryName || supplierConfig.defaultCategory,
      sourceCategoryUrl: url
    })));
  }

  const products = uniqueByHref(discovered)
    .sort((a, b) => a.text.localeCompare(b.text, 'it'));

  const output = {
    supplier: supplierConfig.name,
    publicBrand: 'Soft Comfort',
    category: categoryName || supplierConfig.defaultCategory,
    total: products.length,
    products,
    generatedAt: new Date().toISOString()
  };

  const outputPath = path.join(outputDir, `${new Date().toISOString().replace(/[:.]/g, '-')}-${slugify(supplierKey)}-${slugify(categoryName || supplierConfig.defaultCategory)}-discovery.json`);
  await fs.writeFile(outputPath, JSON.stringify(output, null, 2), 'utf8');

  console.log(`Discovery saved: ${outputPath}`);
  console.log(`Products discovered: ${products.length}`);
  products.slice(0, 30).forEach((product) => console.log(`- ${product.text}: ${product.href}`));
} catch (error) {
  console.error('Discovery failed');
  console.error(error);
  process.exitCode = 1;
} finally {
  await browser.close();
}
