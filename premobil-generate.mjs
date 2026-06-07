import fs from 'fs/promises';
import path from 'path';

const ROOT = path.resolve('.');
const DATA = JSON.parse(await fs.readFile(path.join(ROOT, 'premobil-data', 'premobil-data.json'), 'utf8'));
const ASSETS = 'catalogo-assets/premobil';

const slugify = (s) => s.toLowerCase()
  .replace(/\s+/g, '-')
  .replace(/[^a-z0-9-]/g, '')
  .replace(/-+/g, '-')
  .substring(0, 60);

const escapeHtml = (s) => (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

// Clean description: remove menu/nav text, Premobil references, etc.
const cleanDesc = (raw, title, isCamera) => {
  let t = raw;
  // Remove everything before the actual product description
  const idx = t.indexOf('PRODOTTI');
  if (idx !== -1) t = t.substring(idx);
  // Remove after SCARICA LA SCHEDA or SPECIFICHE TECNICHE
  const endIdx = t.search(/SCARICA LA SCHEDA|SPECIFICHE TECNICHE|PRODUZIONE Made in Italy|CONTATTA L'AZIENDA/);
  if (endIdx !== -1) t = t.substring(0, endIdx);
  // Remove product name and "PRODOTTI" prefix
  const titleClean = title.replace(/PREMOBIL\s*\d{4}/i, '').replace(/CAMERA|ARMADI/i, '').trim();
  t = t.replace(new RegExp('PRODOTTI\\s*' + titleClean.replace(/[-\s]/g, '[-\\s]?'), 'i'), '');
  t = t.replace(/COMPOSIZIONE TIPO:?/gi, '');
  t = t.replace(/FINITURE CASSA[^]*$/, '');
  t = t.replace(/FINITURA CASSA[^]*$/, '');
  t = t.replace(/PROGETTAZIONE[^]*$/, '');
  t = t.replace(/DATE \d{4}/, '');
  t = t.replace(/Made in Italy/, '');
  t = t.replace(/DIMENSIONI[^]*$/, '');
  t = t.replace(/Premobil s\.r\.l?/gi, 'Soft Comfort');
  t = t.replace(/&times;/g, '×');
  t = t.replace(/&#39;/g, "'");
  // Remove common nav/menu text patterns
  t = t.replace(/HOME|AZIENDA|EXTRA|CONTATTI|PRIVACY POLICY|ETICHETTATURA AMBIENTALE|CARATTERISTICHE TECNICHE|CONDIZIONI GENERALI|ESEMPIO DI COMPONIBILITA/gi, '');
  t = t.replace(/MADIE JOKER|PARETI A SPALLA|PARETI COMPONIBILI|PARETI BLOCCATE|NOTTE|COLLEZIONE THEO/gi, '');
  t = t.replace(/JOKER|FOSTER|MERIDA|FORMENTERA|TAGO|BILBAO|MADRID|TOLEDO|NELSON|VIGO|CORDOVA|GRANADA|ARGO|OMEGA|IBIZA|LEON|NEWMASTER|ALEXANDRA/gi, '');
  t = t.replace(/CAMERA LE DUNE|CAMERA COLORADO|CAMERA ATLANTA|ARMADI LE DUNE-COLORADO|CAMERA DAFNE|CAMERA ALASKA/gi, '');
  t = t.replace(/GIORNO KENIA|COOPER DIVA SPECIAL/gi, '');
  t = t.replace(/Cerca|Fb|Ig|In/gi, '');
  t = t.replace(/▼/g, '');
  // Clean up
  t = t.replace(/\s+/g, ' ').trim();
  if (t.length < 20) return '';
  // For cameras, if description is still poor, return empty so we use default
  if (isCamera && t.includes('PRODOTTI')) return '';
  return t.substring(0, 350);
};

// ===== CAMERE DA LETTO =====
const camere = DATA.filter(p => 
  p.title.includes('CAMERA') || p.title.includes('ARMADI')
);

const cameraTemplate = (p, slug, images, desc) => `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${p.title} | Camere da letto Soft Comfort</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Playfair+Display:wght@700;800&display=swap" rel="stylesheet">
  <style>
    :root { --black:#050505; --red:#f20f1f; --red-dark:#a90914; --gold:#d9a858; --text:#f8f4ee; --muted:rgba(248,244,238,.68); --line:rgba(255,255,255,.12); --font-body:'Inter',sans-serif; --font-display:'Playfair Display',serif; }
    * { box-sizing:border-box; }
    body { margin:0; min-height:100vh; color:var(--text); font-family:var(--font-body); background:radial-gradient(circle at 15% 0%, rgba(217,168,88,.16), transparent 28%), radial-gradient(circle at 86% 8%, rgba(242,15,31,.12), transparent 30%), linear-gradient(180deg,#120808 0%,#070707 42%,#030303 100%); }
    a { color:inherit; }
    .detail-shell { width:min(1220px, calc(100% - 36px)); margin:0 auto; padding:34px 0 70px; }
    .back-link { display:inline-flex; align-items:center; gap:10px; margin-bottom:28px; color:var(--gold); font-size:.82rem; font-weight:900; letter-spacing:.12em; text-decoration:none; text-transform:uppercase; }
    .detail-hero { display:grid; grid-template-columns:minmax(0,1.05fr) minmax(360px,.95fr); gap:28px; align-items:stretch; }
    .hero-image { position:relative; min-height:620px; overflow:hidden; border:1px solid var(--line); border-radius:34px; background:#141414; box-shadow:0 34px 110px rgba(0,0,0,.42); }
    .hero-image img { width:100%; height:100%; object-fit:cover; }
    .hero-image span { position:absolute; left:20px; top:20px; padding:9px 13px; border:1px solid rgba(255,255,255,.16); border-radius:999px; background:rgba(0,0,0,.45); backdrop-filter:blur(14px); font-size:.72rem; font-weight:900; letter-spacing:.12em; text-transform:uppercase; }
    .detail-copy, .gallery-section, .detail-info { border:1px solid var(--line); border-radius:34px; background:linear-gradient(180deg, rgba(255,255,255,.072), rgba(255,255,255,.035)); backdrop-filter:blur(18px); }
    .detail-copy { display:grid; align-content:center; gap:18px; padding:34px; }
    .category { margin:0; color:var(--gold); font-size:.74rem; font-weight:900; letter-spacing:.18em; text-transform:uppercase; }
    h1 { margin:0; font-family:var(--font-display); font-size:clamp(3.4rem,8vw,7.4rem); line-height:.86; letter-spacing:-.07em; }
    h2 { margin:0; color:rgba(255,255,255,.8); font-size:1.12rem; line-height:1.5; }
    .description { margin:0; color:var(--muted); font-size:1rem; line-height:1.85; }
    .detail-actions { display:flex; flex-wrap:wrap; gap:12px; margin-top:6px; }
    .btn { display:inline-flex; align-items:center; justify-content:center; min-height:52px; padding:0 20px; border-radius:999px; color:#fff; background:linear-gradient(135deg,var(--red),var(--red-dark)); box-shadow:0 16px 38px rgba(242,15,31,.28); font-weight:900; text-decoration:none; }
    .btn-secondary { border:1px solid rgba(255,255,255,.14); background:rgba(255,255,255,.06); box-shadow:none; }
    .gallery-section, .detail-info { margin-top:28px; padding:28px; }
    .section-title { display:flex; align-items:end; justify-content:space-between; gap:16px; margin-bottom:18px; }
    .section-title p { margin:0; color:var(--gold); font-size:.72rem; font-weight:900; letter-spacing:.16em; text-transform:uppercase; }
    .section-title h2 { margin:0; font-family:var(--font-display); font-size:clamp(2rem,4vw,4rem); line-height:.95; letter-spacing:-.055em; }
    .gallery-viewer { display:grid; grid-template-columns:minmax(0,1.25fr) minmax(260px,.75fr); gap:16px; align-items:stretch; }
    .gallery-main { min-height:520px; overflow:hidden; border:1px solid rgba(255,255,255,.12); border-radius:28px; background:#111; }
    .gallery-main img { width:100%; height:100%; object-fit:cover; }
    .gallery-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; align-content:start; }
    .gallery-grid button { display:block; aspect-ratio:4/3; width:100%; padding:0; overflow:hidden; border:1px solid rgba(255,255,255,.1); border-radius:18px; background:#141414; cursor:pointer; }
    .gallery-grid img { width:100%; height:100%; object-fit:cover; }
    .detail-info p { margin:0; color:var(--muted); line-height:1.8; }
    @media (max-width:900px) { .detail-hero, .gallery-viewer { grid-template-columns:1fr; } .hero-image, .gallery-main { min-height:420px; } .detail-copy { padding:24px; } }
  </style>
</head>
<body>
  <main class="detail-shell">
    <a class="back-link" href="../catalogo-camere-da-letto.html#product-camere-da-letto-${slug}">← Torna al catalogo</a>
    <section class="detail-hero">
      <div class="hero-image">
        <img src="../${images[0]}" alt="${p.title}">
        <span>Soft Comfort</span>
      </div>
      <div class="detail-copy">
        <p class="category">Camere da letto</p>
        <h1>${p.title}</h1>
        <h2>${p.dimensions || 'Design contemporaneo'}</h2>
        <p class="description">${escapeHtml(desc || 'Camera da letto selezionata da Soft Comfort. Dettagli, finiture e disponibilità sono da confermare in showroom.')}</p>
        <div class="detail-actions">
          <a class="btn" href="https://wa.me/393929952453?text=Salve%20Soft%20Comfort%2C%20vorrei%20ricevere%20maggiori%20informazioni%20su%20questa%20camera%3A%20${encodeURIComponent(p.title)}" target="_blank" rel="noopener">Richiedi informazioni</a>
          <a class="btn btn-secondary" href="../catalogo-camere-da-letto.html#product-camere-da-letto-${slug}">Torna al catalogo</a>
        </div>
      </div>
    </section>
    <section class="gallery-section">
      <div class="section-title"><div><p>Gallery</p><h2>Dettagli e finiture</h2></div></div>
      <div class="gallery-viewer">
        <div class="gallery-main"><img data-gallery-main src="../${images[0]}" alt="${p.title} gallery"></div>
        <div class="gallery-grid">
${images.slice(0, 8).map((img, i) => `          <button type="button" data-gallery-thumb="${img}" class="${i === 0 ? 'is-active' : ''}">
            <img src="../${img}" alt="${p.title} immagine ${i+1}" loading="lazy">
          </button>`).join('\n')}
        </div>
      </div>
    </section>
    <section class="detail-info"><p>${escapeHtml(desc || 'Camera da letto selezionata da Soft Comfort. Dettagli, finiture e disponibilità sono da confermare in showroom.')}</p></section>
  </main>
  <script>
    const main = document.querySelector('[data-gallery-main]');
    document.querySelectorAll('[data-gallery-thumb]').forEach(btn => {
      btn.addEventListener('click', () => {
        main.src = '../' + btn.dataset.galleryThumb;
        document.querySelectorAll('.gallery-grid button').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
      });
    });
  </script>
</body>
</html>`;

// Generate camera detail pages
const cameraDir = path.join(ROOT, 'camere-camerette');
await fs.mkdir(cameraDir, { recursive: true });
const cameraCards = [];

for (const p of camere) {
  const slug = 'premobil-' + slugify(p.title);
  const desc = cleanDesc(p.description, p.title, true);
  const images = p.bgs.length > 0 ? p.bgs.map(u => {
    const fname = path.basename(u).replace(/[^a-zA-Z0-9._-]/g, '_');
    return `${ASSETS}/${fname}`;
  }) : [];
  if (images.length === 0 && p.thumbs.length > 0) {
    images.push(...p.thumbs.map(u => {
      const fname = path.basename(u).replace(/[^a-zA-Z0-9._-]/g, '_');
      return `${ASSETS}/${fname}`;
    }));
  }
  if (images.length === 0) continue;

  const html = cameraTemplate(p, slug, images, desc);
  const filename = `camere-da-letto-${slug}.html`;
  await fs.writeFile(path.join(cameraDir, filename), html, 'utf8');
  console.log('Created:', filename);

  const nameClean = p.title.replace(/CAMERA|ARMADI/i, '').trim();
  const cover = images[0];
  const shortDesc = (desc || '').substring(0, 120) + ((desc || '').length > 120 ? '...' : '');
  cameraCards.push(`    <article class="product-card" id="product-camere-da-letto-${slug}" data-catalog-item data-page="1">
      <a class="product-media" href="camere-camerette/${filename}">
        <img src="${cover}" alt="${nameClean}" loading="lazy">
        <span>Selezione Soft Comfort</span>
      </a>
      <div class="product-body">
        <p class="product-category">Camere da letto · ${nameClean}</p>
        <h2>${nameClean}</h2>
        <h3>${p.dimensions || 'Design contemporaneo'}</h3>
        <p>${escapeHtml(shortDesc || 'Camera da letto selezionata da Soft Comfort.')}</p>
        <div class="chip-list"><span>Camera</span><span>Selezione Soft Comfort</span></div>
        <a class="product-detail-link" href="camere-camerette/${filename}">Guarda dettagli e gallery</a>
        <a class="product-cta" href="https://wa.me/393929952453?text=Salve%20Soft%20Comfort%2C%20vorrei%20ricevere%20maggiori%20informazioni%20su%20questa%20camera%3A%20${encodeURIComponent(nameClean)}" target="_blank" rel="noopener">Richiedi informazioni su WhatsApp</a>
      </div>
    </article>`);
}

console.log('\nCamere create:', cameraCards.length);

// Write camera cards snippet for manual insertion
await fs.writeFile(path.join(ROOT, 'premobil-data', 'camera-cards.html'), cameraCards.join('\n\n'), 'utf8');
console.log('Cards snippet saved to premobil-data/camera-cards.html');
