import http from 'http';
import https from 'https';
import fs from 'fs/promises';
import path from 'path';

const ROOT = path.resolve('.');
const OUT_DIR = path.join(ROOT, 'premobil-data');
await fs.mkdir(OUT_DIR, { recursive: true });

const fetchText = (url) => new Promise((resolve, reject) => {
  const client = url.startsWith('https') ? https : http;
  client.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => resolve(data));
  }).on('error', reject);
});

const extractData = (html, url) => {
  const titleMatch = html.match(/<title>(.*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].replace(' - PREMOBIL s.r.l.', '').trim() : '';
  
  // Estrai immagini galleria (thumb)
  const thumbs = [...html.matchAll(/src="(gallery\/[^"]+_thumb\.(?:png|jpg|jpeg))"/gi)]
    .map(m => 'http://www.premobil.it/' + m[1]);
  
  // Estrai immagini background (foto grandi)
  const bgs = [...html.matchAll(/background-image:\s*url\(([^)]+)\)/gi)]
    .map(m => {
      let src = m[1].trim();
      if (src.startsWith('http')) return src;
      if (src.startsWith('/')) return 'http://www.premobil.it' + src;
      return 'http://www.premobil.it/' + src;
    });
  
  // Estrai testo descrizione (tutto il testo nel body)
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  let description = '';
  if (bodyMatch) {
    description = bodyMatch[1]
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 800);
  }
  
  // Estrai eventuali dettagli tecnici dal testo
  const dimMatch = description.match(/(L\s*[:\.]?\s*\d+|lunghezza|larghezza|altezza|cm\s*\d+|\d+\s*x\s*\d+)/gi);
  const dimensions = dimMatch ? dimMatch.join(', ').substring(0, 200) : '';
  
  return { title, url, thumbs, bgs, description, dimensions };
};

// Pagine da scrapare
const pages = [
  // CAMERE DA LETTO
  'http://www.premobil.it/camera-le-dune.php',
  'http://www.premobil.it/camera-colorado.php',
  'http://www.premobil.it/camera-atlanta.php',
  'http://www.premobil.it/camera-alaska.php',
  'http://www.premobil.it/armadi-le-dune-colorado.php',
  // PARETI ATTREZZATE / ZONA LIVING
  'http://www.premobil.it/joker.php',
  'http://www.premobil.it/foster.php',
  'http://www.premobil.it/foster-componibili-e-madie.php',
  'http://www.premobil.it/merida.php',
  'http://www.premobil.it/formentera.php',
  'http://www.premobil.it/tago.php',
  'http://www.premobil.it/bilbao.php',
  'http://www.premobil.it/madrid.php',
  'http://www.premobil.it/toledo.php',
  'http://www.premobil.it/nelson.php',
  'http://www.premobil.it/vigo.php',
  'http://www.premobil.it/cordova.php',
  'http://www.premobil.it/granada.php',
  'http://www.premobil.it/argo.php',
  'http://www.premobil.it/omega.php',
  'http://www.premobil.it/ibiza.php',
  'http://www.premobil.it/leon.php',
  'http://www.premobil.it/newmaster.php',
  'http://www.premobil.it/alexandra.php',
];

const results = [];
for (const url of pages) {
  try {
    console.log('Scraping:', url);
    const html = await fetchText(url);
    const data = extractData(html, url);
    results.push(data);
    console.log('  ->', data.title, '| thumbs:', data.thumbs.length, '| bgs:', data.bgs.length);
  } catch (e) {
    console.log('  ERR:', url, e.message);
  }
}

await fs.writeFile(path.join(OUT_DIR, 'premobil-data.json'), JSON.stringify(results, null, 2), 'utf8');
console.log('\nSalvato in premobil-data/premobil-data.json');
console.log('Prodotti trovati:', results.length);
