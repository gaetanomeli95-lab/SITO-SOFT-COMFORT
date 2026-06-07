import fs from 'node:fs/promises';
import path from 'node:path';
import https from 'node:https';

const ROOT = path.resolve('.');
const OUT_DIR = path.join(ROOT, 'complementi-build');
const OUT_FILE = path.join(OUT_DIR, 'stones-complementi-review.json');
const BASE = 'https://www.stones.it';
const PAGES = [1, 2, 3, 4, 5, 6, 7, 8];

const fetchText = (url) => new Promise((resolve, reject) => {
  https.get(url, { headers: { 'User-Agent': 'SoftComfortCatalogReview/1.0' } }, (res) => {
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      resolve(fetchText(new URL(res.headers.location, url).toString()));
      return;
    }
    if (res.statusCode !== 200) {
      reject(new Error(`${res.statusCode} ${url}`));
      res.resume();
      return;
    }
    let body = '';
    res.setEncoding('utf8');
    res.on('data', (chunk) => { body += chunk; });
    res.on('end', () => resolve(body));
  }).on('error', reject);
});

const decodeHtml = (value = '') => value
  .replace(/&amp;/g, '&')
  .replace(/&quot;/g, '"')
  .replace(/&#39;|&apos;/g, "'")
  .replace(/&nbsp;/g, ' ')
  .replace(/&egrave;/g, 'è')
  .replace(/&Egrave;/g, 'È')
  .replace(/&agrave;/g, 'à')
  .replace(/&Agrave;/g, 'À')
  .replace(/&igrave;/g, 'ì')
  .replace(/&Igrave;/g, 'Ì')
  .replace(/&ograve;/g, 'ò')
  .replace(/&Ograve;/g, 'Ò')
  .replace(/&ugrave;/g, 'ù')
  .replace(/&Ugrave;/g, 'Ù')
  .replace(/&rsquo;/g, '’')
  .replace(/&ldquo;|&rdquo;/g, '"')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]*>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const slugFromUrl = (url) => new URL(url).pathname.split('/').filter(Boolean).pop();

const unique = (items) => [...new Set(items.filter(Boolean))];

const extractCatalogLinks = async () => {
  const products = new Map();
  for (const page of PAGES) {
    const url = `${BASE}/t/cataloghi/tavoli-sedie-sgabelli?page=${page}&scope=stones`;
    const html = await fetchText(url);
    const matches = [...html.matchAll(/<a[^>]+href="((?:https:\/\/www\.stones\.it)?\/products\/[^"]+taxon_id=2527[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi)];
    for (const match of matches) {
      const productUrl = new URL(match[1], BASE).toString();
      const name = decodeHtml(match[2]);
      const slug = slugFromUrl(productUrl);
      if (!name || /scarica|prodotti|stones|contatti|seguici/i.test(name)) continue;
      products.set(productUrl, { name, slug, sourceUrl: productUrl, catalogPage: page });
    }
  }
  return [...products.values()];
};

const extractBetween = (text, start, end) => {
  const from = text.indexOf(start);
  if (from === -1) return '';
  const to = text.indexOf(end, from + start.length);
  return text.slice(from + start.length, to === -1 ? undefined : to).trim();
};

const classify = (text) => {
  const normalized = text.toLowerCase();
  if (/\bsgabello\b|\bsgabelli\b/.test(normalized)) return 'sgabelli';
  if (/\bsedia\b|\bsedie\b|\bseduta\b/.test(normalized)) return 'sedie';
  if (/\btavolo\b|\btavoli\b|\bconsolle\b/.test(normalized)) return 'tavoli';
  return 'da_verificare';
};

const extractProduct = async (item) => {
  const html = await fetchText(item.sourceUrl);
  const title = decodeHtml((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1]) || item.name;
  const pdf = (html.match(/href="([^"]+\.pdf)"/i) || [])[1];
  const imageMatches = [...html.matchAll(/https:\/\/d16tnwydrywcsj\.cloudfront\.net\/production\/spree\/products\/[^"'\s<>]+\/(?:original|product)\/[^"'\s<>]+\.(?:jpg|jpeg|png|webp)/gi)].map((m) => m[0]);
  const images = unique(imageMatches).filter((url) => !/\/small\/|\/thumb\/|\/large\//.test(url));
  const bodyText = decodeHtml(html);
  const detailText = extractBetween(bodyText, 'Descrizione Info tecniche Packaging', 'Prodotti Stones Contatti') || bodyText;
  const dimensioni = unique([...detailText.matchAll(/(?:\d+(?:[,.]\d+)?\s*cm\s*X\s*)?\d+(?:[,.]\d+)?(?:[-/]\d+(?:[,.]\d+)?)?\s*cm\s*H\.\s*\d+(?:[,.]\d+)?\s*cm|Lunghezza:\s*[^.\n]+?Altezza:\s*\d+(?:[,.]\d+)?/gi)].map((m) => m[0]));
  const categoria = classify(detailText);
  return {
    ...item,
    name: title,
    category: categoria,
    sourcePdf: pdf ? new URL(pdf, BASE).toString() : '',
    images,
    detailsText: detailText,
    dimensions: dimensioni,
    verification: categoria === 'da_verificare' ? 'categoria_da_verificare' : 'ok'
  };
};

await fs.mkdir(OUT_DIR, { recursive: true });
const catalogProducts = await extractCatalogLinks();
const results = [];
for (let index = 0; index < catalogProducts.length; index += 1) {
  const product = catalogProducts[index];
  console.log(`${index + 1}/${catalogProducts.length} ${product.slug}`);
  try {
    results.push(await extractProduct(product));
  } catch (error) {
    results.push({ ...product, category: 'da_verificare', images: [], detailsText: '', dimensions: [], verification: `errore: ${error.message}` });
  }
}
const summary = results.reduce((acc, item) => {
  acc[item.category] = (acc[item.category] || 0) + 1;
  return acc;
}, {});
await fs.writeFile(OUT_FILE, JSON.stringify({ source: `${BASE}/t/cataloghi/tavoli-sedie-sgabelli?scope=stones`, generatedAt: new Date().toISOString(), total: results.length, summary, products: results }, null, 2), 'utf8');
console.log(JSON.stringify({ total: results.length, summary, output: OUT_FILE }, null, 2));
