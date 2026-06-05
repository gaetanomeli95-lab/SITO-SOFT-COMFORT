import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve('.');
const DATA = JSON.parse(await fs.readFile(path.join(ROOT, 'divani-build', 'divani-data.json'), 'utf8'));
const TEMPLATE = await fs.readFile(path.join(ROOT, 'cucine', 'cucine-classiche-tiffany.html'), 'utf8');

await fs.mkdir(path.join(ROOT, 'divani'), { recursive: true });

const cleanDesc = (raw) => {
  if (!raw) return '';
  let d = raw
    .replace(/Tessuto:.*?Colore:.*?Sedute:/gi, '')
    .replace(/Dimensioni\s*\(cm\):/gi, '')
    .replace(/Letto a Carrello/gi, 'Funzione letto')
    .replace(/Letto a Ribalta/gi, 'Funzione letto')
    .replace(/Letto a capello/gi, 'Funzione letto')
    .replace(/CL contenitore/gi, 'Vano contenitore')
    .replace(/Poggiatesta reclinabile a cricchetto/gi, 'Poggiatesta reclinabile')
    .replace(/Poggiatesta regolabile/gi, 'Poggiatesta reclinabile')
    .replace(/Piedi in acciaio/gi, 'Piedi in acciaio')
    .replace(/Piede \(h\/cm\):/gi, 'Altezza piedi')
    .replace(/Posti:/gi, 'Sedute')
    .replace(/3P/gi, '3 posti')
    .replace(/2 posti/gi, '2 posti')
    .replace(/&#215;/g, 'x')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/Tessuto:.*?Colore:/gi, '')
    .replace(/Sedute: \d+½/gi, (m) => 'Sedute: ' + m.replace('½', ' e mezzo'))
    .replace(/Sedute: \d+P/gi, (m) => 'Sedute: ' + m.replace('P', ' posti'))
    .replace(/Sedute: \d+/gi, (m) => 'Sedute: ' + m + ' posti')
    .replace(/Dimensioni \(cm\):/gi, 'Dimensioni')
    .replace(/Dimensioni\s*\(cm\):/gi, 'Dimensioni')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&#215;/g, 'x')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return d || 'Divano angolare componibile con design moderno e comfort elevato.';
};

const renderGallery = (images, slug) => {
  if (images.length === 0) return '';
  let html = `<section class="gallery-section">
      <div class="section-title">
        <div>
          <p>Dettagli e angolazioni</p>
          <h2>Gallery ambiente</h2>
        </div>
      </div>
      <div class="gallery-viewer">
        <div class="gallery-main">
          <img data-main-gallery-image src="../catalogo-assets/${images[0]}" alt="${slug} selezione gallery">
        </div>
        <div class="gallery-grid">`;
  images.forEach((img, i) => {
    html += `\n          <button type="button" data-gallery-image="../catalogo-assets/${img}" ${i === 0 ? 'class="is-active"' : ''} aria-label="${slug} vista ${i + 1}">
            <img src="../catalogo-assets/${img}" alt="${slug} vista ${i + 1}" loading="lazy">
          </button>`;
  });
  html += '\n        </div>\n      </div>\n    </section>';
  return html;
};

for (const p of DATA) {
  const id = `product-divani-${p.slug}`;
  const cover = p.images[0];
  const galleryImages = p.images.slice(1);
  const desc = cleanDesc(p.rawInFoto);
  const flagsHtml = p.flags.length > 0 ? p.flags.map((f) => `<span>${f}</span>`).join('') : '';
  const techDesc = p.rawTech
    ? p.rawTech
        .replace(/Designer: centro studi interno/gi, '')
        .replace(/Struttura:/gi, 'Struttura:')
        .replace(/Sistema di molleggio:/gi, 'Sistema di molleggio:')
        .replace(/Imbottitura seduta:/gi, 'Imbottitura seduta:')
        .replace(/Imbottitura spalliera:/gi, 'Imbottitura spalliera:')
        .replace(/Braccioli:/gi, 'Braccioli:')
        .replace(/Poggiatesta:/gi, 'Poggiatesta:')
        .replace(/Piedi:/gi, 'Piedi:')
        .replace(/Cuciture:/gi, 'Cuciture:')
        .replace(/Versioni letto:/gi, 'Versioni letto:')
        .replace(/Meccanismi:/gi, 'Meccanismi:')
        .replace(/Disponibili altre tipologia di piedi su richiesta\./gi, '')
        .replace(/La versione Recliner prevede meccanismi elettrici\./gi, 'Versione Recliner con meccanismi elettrici.')
        .replace(/le versioni con cl contenitore prevedono un meccanismo ad apertura frontale con sollevamento tramite molle\./gi, 'Versioni con contenitore prevedono meccanismo ad apertura frontale con sollevamento tramite molle.')
        .replace(/è possibile realizzare un piano letto con un semplice movimento grazie al meccanismo\./gi, 'Piano letto realizzabile con semplice movimento.')
        .replace(/\.\s+/g, '. ')
        .trim()
    : '';

  let html = TEMPLATE
    .replace(/<title>TIFFANY \| Soft Comfort<\/title>/, `<title>${p.name.toUpperCase()} | Soft Comfort</title>`)
    .replace(/<a class="back-link" href="[^"]+">← Torna al catalogo<\/a>/,
      `<a class="back-link" href="../catalogo-divani.html#${id}">← Torna al catalogo divani</a>`)
    .replace(/<div class="hero-image">\s*<img src="[^"]+" alt="TIFFANY">\s*<span>/,
      `<div class="hero-image" style="background: #161616; position: relative; overflow: hidden;">
        <img src="../catalogo-assets/${cover}" alt="${p.name}" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover;">
        <span>`)
    .replace(/<span>Materassi Soft Comfort<\/span>/, '<span>Divani Soft Comfort</span>')
    .replace(/<p class="category">Cucine classiche<\/p>/, '<p class="category">Divani</p>')
    .replace(/<h1>TIFFANY<\/h1>/, `<h1>${p.name.toUpperCase()}</h1>`)
    .replace(/<h2>Cucina con maniglia e sistema gola<\/h2>/,
      `<h2>${p.flags.slice(0, 3).join(' · ') || 'Divano angolare componibile'}</h2>`)
    .replace(/<p class="description">Soft Comfort aggiunge alla sua collezione il modello Tiffany<\/p>/,
      `<p class="description">${desc}${p.dimensioni ? ` · ${p.dimensioni} cm` : ''}</p>`)
    .replace(/<div class="chip-list"><span>Sistema gola<\/span><\/div>/,
      `<div class="chip-list">${flagsHtml}</div>`)
    .replace(/<a class="btn" href="[^"]+">Richiedi consulenza WhatsApp<\/a>/,
      `<a class="btn" href="https://wa.me/393929952453?text=Salve%20Soft%20Comfort%2C%20vorrei%20ricevere%20maggiori%20informazioni%20e%20una%20consulenza%20personalizzata%20per%20questa%20soluzione%3A%20${encodeURIComponent(p.name)}.%20Categoria%3A%20Divani." target="_blank" rel="noopener">Richiedi consulenza WhatsApp</a>`)
    .replace(/<a class="btn btn-secondary" href="[^"]+">Vedi altre cucine<\/a>/,
      `<a class="btn btn-secondary" href="../catalogo-divani.html#${id}">Vedi altri divani</a>`)
    .replace(/const returnTarget = 'product-cucine-classiche-tiffany';/,
      `const returnTarget = '${id}';`)
    .replace(/<section class="gallery-section">[\s\S]*?<\/section>/g, renderGallery(p.images, p.slug))
    .replace(/<section class="detail-info">[\s\S]*?<\/section>/g,
      techDesc
        ? `<section class="detail-info">
      <div class="section-title">
        <div>
          <p>Materiali e comfort</p>
          <h2>Caratteristiche tecniche</h2>
        </div>
      </div>
      <p>${techDesc}</p>
    </section>`
        : '');

  await fs.writeFile(path.join(ROOT, 'divani', `${p.slug}.html`), html, 'utf8');
  console.log(`CREATO divani/${p.slug}.html`);
}

console.log(`\nSchede dettaglio create: ${DATA.length}`);
