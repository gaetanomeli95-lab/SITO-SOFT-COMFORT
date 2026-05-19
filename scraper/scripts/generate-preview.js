import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const scraperRoot = path.resolve(__dirname, '..');
const outputDir = path.join(scraperRoot, 'output');
const previewDir = path.join(scraperRoot, 'preview');
const previewAssetsDir = path.join(previewDir, 'assets');
const previewDetailsDir = path.join(previewDir, 'details');
const previewPath = path.join(previewDir, 'catalog-preview.html');
const catalogMode = process.argv[2] === 'camere' ? 'camere' : 'cucine';

const whatsappNumber = '393929952453';

const escapeHtml = (value) => String(value || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const sanitizePublicText = (value) => String(value || '')
  .replace(/\bMOBILTURI\b/gi, 'Soft Comfort')
  .replace(/\bGruppo Turi\b/gi, 'Soft Comfort')
  .replace(/\bMobilturi\b/gi, 'Soft Comfort')
  .replace(/\bNETCUCINE\b/gi, '')
  .replace(/\bNetcucine\b/gi, '')
  .replace(/\bMCS MOBILI\b/gi, '')
  .replace(/\bMCS\b/gi, '')
  .replace(/\bIl gruppo\b/gi, '')
  .replace(/\bFollow us\b/gi, '')
  .replace(/\bSfoglia il Catalogo\b/gi, '')
  .replace(/\bCucine moderne\b/gi, '')
  .replace(/\bCucine Classiche\b/gi, '')
  .replace(/\s+/g, ' ')
  .trim();

const slugify = (value) => String(value || '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 90);

const getImageExtension = (url) => {
  try {
    const ext = path.extname(new URL(url).pathname).toLowerCase();
    return ['.jpg', '.jpeg', '.png', '.webp', '.avif'].includes(ext) ? ext : '.jpg';
  } catch {
    return '.jpg';
  }
};

const getUnifiedCatalog = async () => {
  const files = await fs.readdir(outputDir);
  const catalogs = files.filter((file) => file.endsWith('-catalog.json'));

  if (catalogs.length === 0) {
    throw new Error('No catalog JSON found in scraper/output. Run an extraction first.');
  }

  const withStats = await Promise.all(catalogs.map(async (file) => {
    const filePath = path.join(outputDir, file);
    const stat = await fs.stat(filePath);
    const catalog = JSON.parse(await fs.readFile(filePath, 'utf8'));
    return { file, filePath, mtime: stat.mtimeMs, catalog };
  }));

  const latestBySupplier = new Map();

  withStats.forEach((item) => {
    const supplier = catalogMode === 'camere'
      ? `${item.catalog.supplier || item.file}-${item.catalog.category || ''}`
      : item.catalog.supplier || item.file;
    const current = latestBySupplier.get(supplier);
    if (!current || item.mtime > current.mtime) {
      latestBySupplier.set(supplier, item);
    }
  });

  const selectedCatalogs = [...latestBySupplier.values()].sort((a, b) => a.catalog.supplier.localeCompare(b.catalog.supplier, 'it'));
  const products = selectedCatalogs
    .flatMap((item) => item.catalog.products || [])
    .filter((product) => {
      const haystack = [
        product.supplier,
        product.category,
        product.sourceUrl,
        product.title,
        product.subtitle
      ].join(' ').toLowerCase();

      if (catalogMode === 'camere') {
        return /mcsmobili|camerette|camera|camere|omnia|afrodite|block|lyra|le-isole-camera/.test(haystack)
          && !/soggiorni|soggiorno|living/.test(haystack);
      }

      return /cucina|cucine|mobilturi|netcucine/.test(haystack);
    });

  return {
    supplier: 'Soft Comfort',
    category: 'Catalogo Soft Comfort',
    total: products.length,
    products,
    sources: selectedCatalogs.map((item) => ({
      supplier: item.catalog.supplier,
      total: item.catalog.total,
      file: item.file
    })),
    generatedAt: new Date().toISOString()
  };
};

const createWhatsappUrl = (product) => {
  const category = product.publicCategory || product.category;
  const message = `Salve Soft Comfort, vorrei ricevere maggiori informazioni e una consulenza personalizzata per questa soluzione: ${sanitizePublicText(product.publicTitle || product.title)}. Categoria: ${category}.`;
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
};

const getPublicTitle = (product) => {
  const url = String(product.sourceUrl || '');
  const mcsMatch = url.match(/\/it\/([^/?#]+)$/);

  if (mcsMatch && /mcsmobili\.com/.test(url)) {
    const slug = mcsMatch[1].replace(/-\d+$/, '');
    const formatted = slug
      .replace(/^omnia-(\d+)-(\d+)$/i, 'OMNIA $1.$2')
      .replace(/^afrodite-af(\d+)$/i, 'Afrodite AF$1')
      .replace(/^block-bk(\d+)$/i, 'BLOCK BK$1')
      .replace(/^lyra-ly(\d+)$/i, 'Lyra LY$1')
      .replace(/^le-isole-camera-(.+)$/i, (_, name) => `Le Isole - Camera ${name.replace(/-/g, ' ')}`);

    return formatted.replace(/\b\w/g, (letter) => letter.toUpperCase()).replace(/\bOMNIA\b/i, 'OMNIA').replace(/\bBLOCK\b/i, 'BLOCK');
  }

  const titleByUrl = {
    'cucina-old-england': 'AISHA',
    'cucina-con-gola': 'DIAMANTE',
    'cucina-in-pet': 'GAIA PET',
    'cucina-legno-massello-maniglia-integrata': 'INCANTO',
    'cucina-elegante-maniglia-integrata': 'LEA',
    'cucina-elegante/': 'LUNA',
    'cucina-rovere': 'NALA',
    'cucina-di-qualita': 'NEVADA',
    'cucina-in-legno-massello': 'NINA',
    'cucina-elegante-olimpia': 'OLIMPIA',
    'cucina-design-funzionale': 'ONDA',
    'cucina-minimal': 'POP',
    'cucina-di-design': 'STAR',
    'cucina-contemporanea-stratos': 'STRATOS',
    'tiffany': 'TIFFANY',
    'cucina-funzionale': 'ZANTE',
    'cucina-moderna-delizia': 'DELIZIA',
    'cucina-moderna-funzionale': 'DORA',
    'cucina-moderna-elsa': 'ELSA',
    'cucina-moderna-kelly': 'KELLY',
    'cucina-moderna-kira': 'KIRA',
    'sistema-gola-sandy': 'SANDY',
    'cucina-moderna-newsmart': 'SMART',
    'cucina-classica-bea': 'BEA'
  };

  const match = Object.entries(titleByUrl).find(([slug]) => url.includes(slug));
  return match?.[1] || sanitizePublicText(product.title);
};

const getPublicCategory = (product) => {
  const title = String(product.title || '').toUpperCase();
  const haystack = [
    product.title,
    product.subtitle,
    product.description,
    product.sourceUrl,
    ...(product.technicalFeatures?.notes || [])
  ].join(' ').toLowerCase();

  const classicTitles = new Set(['AISHA', 'INCANTO', 'NINA', 'OLIMPIA', 'TIFFANY']);

  if (catalogMode === 'camere') {
    if (/lyra|le-isole-camera|\/camere|camera /.test(haystack)) {
      return 'Camere da letto';
    }

    return 'Camerette';
  }

  if (
    classicTitles.has(title)
    || /cucina-classica|old england|classich|legno massello|tradizion|intagli|decori|country|shabby/.test(haystack)
  ) {
    return 'Cucine classiche';
  }

  if (/cucina-moderna|sistema-gola/.test(haystack)) {
    return 'Cucine moderne';
  }

  return 'Cucine moderne';
};

const cacheCoverImage = async (product) => {
  const source = product.images?.[0];
  if (!source) return '';

  const category = product.publicCategory || product.category;
  const title = product.publicTitle || product.title;
  const fileName = `soft-comfort-${slugify(category)}-${slugify(title)}-cover${getImageExtension(source)}`;
  const filePath = path.join(previewAssetsDir, fileName);

  try {
    await fs.access(filePath);
    return `assets/${fileName}`;
  } catch {
    try {
      const response = await fetch(source);
      if (!response.ok) return '';

      const buffer = Buffer.from(await response.arrayBuffer());
      await fs.writeFile(filePath, buffer);
      return `assets/${fileName}`;
    } catch {
      return '';
    }
  }
};

const cacheGalleryImages = async (product) => {
  const category = product.publicCategory || product.category;
  const title = product.publicTitle || product.title;
  const sources = [...new Set((product.images || []).filter(Boolean))].slice(0, catalogMode === 'camere' ? 4 : 10);
  const images = [];

  for (const [index, source] of sources.entries()) {
    const fileName = `soft-comfort-${slugify(category)}-${slugify(title)}-${String(index + 1).padStart(2, '0')}${getImageExtension(source)}`;
    const filePath = path.join(previewAssetsDir, fileName);

    try {
      await fs.access(filePath);
    } catch {
      try {
        const response = await fetch(source);
        if (!response.ok) continue;

        const buffer = Buffer.from(await response.arrayBuffer());
        await fs.writeFile(filePath, buffer);
      } catch {
        continue;
      }
    }

    images.push(`../assets/${fileName}`);
  }

  return images;
};

const renderProduct = (product, index = 0) => {
  const cover = product.publicCover || '';
  const category = product.publicCategory || product.category;
  const title = sanitizePublicText(product.publicTitle || product.title);
  const subtitle = sanitizePublicText(product.subtitle);
  const description = sanitizePublicText(product.description);
  const detailUrl = product.detailUrl || '#';
  const page = Math.floor(index / 12) + 1;

  return `
    <article class="product-card" data-catalog-item data-page="${page}">
      <a class="product-media" href="${escapeHtml(detailUrl)}">
        <img src="${escapeHtml(cover)}" alt="${escapeHtml(title)}" loading="lazy">
        <span>Collezione Soft Comfort</span>
      </a>
      <div class="product-body">
        <p class="product-category">${escapeHtml(category)}</p>
        <h2>${escapeHtml(title)}</h2>
        ${subtitle ? `<h3>${escapeHtml(subtitle)}</h3>` : ''}
        <p>${escapeHtml(description)}</p>
        <a class="product-detail-link" href="${escapeHtml(detailUrl)}">Guarda dettagli e gallery</a>
        <a class="product-cta" href="${createWhatsappUrl(product)}" target="_blank" rel="noopener">Richiedi informazioni su WhatsApp</a>
      </div>
    </article>
  `;
};

const renderCategorySection = (category, products) => {
  const totalPages = Math.ceil(products.length / 12);

  return `
  <section class="category-section" id="${escapeHtml(slugify(category))}" data-catalog-section data-current-page="1">
    <div class="category-heading">
      <div>
        <p>${escapeHtml(products.length)} modelli selezionati</p>
        <h2>${escapeHtml(category)}</h2>
      </div>
      ${totalPages > 1 ? `
        <div class="catalog-page-status" aria-live="polite">
          Pagina <span data-current-page-label>1</span> di ${totalPages}
        </div>
      ` : ''}
    </div>
    <div class="catalog-grid">
      ${products.map((product, index) => renderProduct(product, index)).join('')}
    </div>
    ${totalPages > 1 ? `
      <nav class="catalog-pagination" aria-label="Paginazione ${escapeHtml(category)}">
        <button type="button" data-page-prev>Precedente</button>
        <div class="catalog-page-numbers">
          ${Array.from({ length: totalPages }, (_, index) => `
            <button type="button" data-page-target="${index + 1}" class="${index === 0 ? 'is-active' : ''}">${index + 1}</button>
          `).join('')}
        </div>
        <button type="button" data-page-next>Successiva</button>
      </nav>
    ` : ''}
  </section>
`;
};

const renderDetailPage = (product) => {
  const category = product.publicCategory || product.category;
  const title = sanitizePublicText(product.publicTitle || product.title);
  const subtitle = sanitizePublicText(product.subtitle);
  const description = sanitizePublicText(product.description);
  const finishes = (product.technicalFeatures?.finishes || [])
    .map(sanitizePublicText)
    .filter(Boolean)
    .slice(0, 14);
  const notes = (product.technicalFeatures?.notes || [])
    .map(sanitizePublicText)
    .filter(Boolean)
    .slice(0, 12);
  const gallery = product.galleryImages?.length ? product.galleryImages : [product.publicCover].filter(Boolean);
  const hero = gallery[0] || '';

  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} | Soft Comfort</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Playfair+Display:wght@700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --black: #050505;
      --red: #f20f1f;
      --red-dark: #a90914;
      --gold: #d9a858;
      --text: #f8f4ee;
      --muted: rgba(248, 244, 238, 0.68);
      --line: rgba(255, 255, 255, 0.12);
      --font-body: 'Inter', sans-serif;
      --font-display: 'Playfair Display', serif;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      min-height: 100vh;
      color: var(--text);
      font-family: var(--font-body);
      background:
        radial-gradient(circle at 15% 0%, rgba(217, 168, 88, 0.16), transparent 28%),
        radial-gradient(circle at 86% 8%, rgba(242, 15, 31, 0.12), transparent 30%),
        linear-gradient(180deg, #120808 0%, #070707 42%, #030303 100%);
    }

    a { color: inherit; }

    .detail-shell {
      width: min(1220px, calc(100% - 36px));
      margin: 0 auto;
      padding: 34px 0 70px;
    }

    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 28px;
      color: var(--gold);
      font-size: 0.82rem;
      font-weight: 900;
      letter-spacing: 0.12em;
      text-decoration: none;
      text-transform: uppercase;
    }

    .detail-hero {
      display: grid;
      grid-template-columns: minmax(0, 1.05fr) minmax(360px, 0.95fr);
      gap: 28px;
      align-items: stretch;
    }

    .hero-image {
      position: relative;
      min-height: 620px;
      overflow: hidden;
      border: 1px solid var(--line);
      border-radius: 34px;
      background: #141414;
      box-shadow: 0 34px 110px rgba(0, 0, 0, 0.42);
    }

    .hero-image img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transform: scale(1.015);
      transition: opacity 0.24s ease, transform 0.45s ease;
    }

    .hero-image img.is-changing {
      opacity: 0;
      transform: scale(1.045);
    }

    .hero-image span {
      position: absolute;
      left: 20px;
      top: 20px;
      padding: 9px 13px;
      border: 1px solid rgba(255, 255, 255, 0.16);
      border-radius: 999px;
      background: rgba(0, 0, 0, 0.45);
      backdrop-filter: blur(14px);
      font-size: 0.72rem;
      font-weight: 900;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    .detail-copy {
      display: grid;
      align-content: center;
      gap: 18px;
      padding: 34px;
      border: 1px solid var(--line);
      border-radius: 34px;
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.072), rgba(255, 255, 255, 0.035));
      backdrop-filter: blur(18px);
    }

    .category {
      margin: 0;
      color: var(--gold);
      font-size: 0.74rem;
      font-weight: 900;
      letter-spacing: 0.18em;
      text-transform: uppercase;
    }

    h1 {
      margin: 0;
      font-family: var(--font-display);
      font-size: clamp(3.4rem, 8vw, 7.4rem);
      line-height: 0.86;
      letter-spacing: -0.07em;
    }

    h2 {
      margin: 0;
      color: rgba(255, 255, 255, 0.8);
      font-size: 1.12rem;
      line-height: 1.5;
    }

    .description {
      margin: 0;
      color: var(--muted);
      font-size: 1rem;
      line-height: 1.85;
    }

    .detail-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 6px;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 52px;
      padding: 0 20px;
      border-radius: 999px;
      color: #fff;
      background: linear-gradient(135deg, var(--red), var(--red-dark));
      box-shadow: 0 16px 38px rgba(242, 15, 31, 0.28);
      font-weight: 900;
      text-decoration: none;
    }

    .btn-secondary {
      border: 1px solid rgba(255, 255, 255, 0.14);
      background: rgba(255, 255, 255, 0.06);
      box-shadow: none;
    }

    .gallery-section,
    .detail-info {
      margin-top: 28px;
      padding: 28px;
      border: 1px solid var(--line);
      border-radius: 34px;
      background: rgba(255, 255, 255, 0.045);
    }

    .section-title {
      display: flex;
      align-items: end;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 18px;
    }

    .section-title p {
      margin: 0;
      color: var(--gold);
      font-size: 0.72rem;
      font-weight: 900;
      letter-spacing: 0.16em;
      text-transform: uppercase;
    }

    .section-title h2 {
      margin: 0;
      font-family: var(--font-display);
      font-size: clamp(2rem, 4vw, 4rem);
      line-height: 0.95;
      letter-spacing: -0.055em;
    }

    .gallery-viewer {
      display: grid;
      grid-template-columns: minmax(0, 1.25fr) minmax(260px, 0.75fr);
      gap: 16px;
      align-items: stretch;
    }

    .gallery-main {
      min-height: 520px;
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 28px;
      background: #111;
    }

    .gallery-main img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: opacity 0.24s ease, transform 0.45s ease;
    }

    .gallery-main img.is-changing {
      opacity: 0;
      transform: scale(1.035);
    }

    .gallery-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
      align-content: start;
    }

    .gallery-grid button {
      display: block;
      aspect-ratio: 4 / 3;
      width: 100%;
      padding: 0;
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 18px;
      background: #141414;
      cursor: pointer;
      transition: border-color 0.25s ease, transform 0.25s ease;
    }

    .gallery-grid img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.45s ease;
    }

    .gallery-grid button:hover,
    .gallery-grid button.is-active {
      border-color: rgba(217, 168, 88, 0.58);
      transform: translateY(-2px);
    }

    .gallery-grid button:hover img,
    .gallery-grid button.is-active img {
      transform: scale(1.08);
    }

    .chip-list {
      display: flex;
      flex-wrap: wrap;
      gap: 9px;
    }

    .chip-list span {
      padding: 9px 12px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 999px;
      color: rgba(255, 255, 255, 0.74);
      background: rgba(255, 255, 255, 0.045);
      font-size: 0.76rem;
      font-weight: 800;
    }

    @media (max-width: 960px) {
      .detail-shell { width: min(100% - 28px, 620px); padding-top: 22px; }
      .detail-hero { grid-template-columns: 1fr; }
      .hero-image { min-height: 320px; }
      .detail-copy { padding: 24px; }
      .gallery-viewer { grid-template-columns: 1fr; }
      .gallery-main { min-height: 360px; }
      .gallery-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
      .section-title { align-items: start; flex-direction: column; }
    }

    @media (max-width: 480px) {
      .detail-shell { width: calc(100% - 20px); padding-top: 18px; }
      .hero-image { min-height: 260px; }
      .detail-copy { padding: 18px; }
      .gallery-main { min-height: 280px; }
      .gallery-grid { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; scroll-snap-type: x mandatory; }
      .gallery-grid button { flex: 0 0 34%; scroll-snap-align: start; }
      h1 { font-size: clamp(2rem, 6vw, 3.2rem); }
      h2 { font-size: clamp(1.1rem, 4vw, 1.4rem); }
      .btn { padding: 12px 18px; font-size: 0.9rem; }
    }
  </style>
</head>
<body>
  <main class="detail-shell">
    <a class="back-link" href="../catalog-preview.html">← Torna al catalogo</a>
    <section class="detail-hero">
      <div class="hero-image">
        <img src="${escapeHtml(hero)}" alt="${escapeHtml(title)}">
        <span>Collezione Soft Comfort</span>
      </div>
      <div class="detail-copy">
        <p class="category">${escapeHtml(category)}</p>
        <h1>${escapeHtml(title)}</h1>
        ${subtitle ? `<h2>${escapeHtml(subtitle)}</h2>` : ''}
        <p class="description">${escapeHtml(description)}</p>
        <div class="detail-actions">
          <a class="btn" href="${createWhatsappUrl(product)}" target="_blank" rel="noopener">Richiedi consulenza WhatsApp</a>
          <a class="btn btn-secondary" href="../catalog-preview.html">Vedi altre cucine</a>
        </div>
      </div>
    </section>
    <section class="gallery-section">
      <div class="section-title">
        <div>
          <p>Dettagli e angolazioni</p>
          <h2>Gallery ambiente</h2>
        </div>
      </div>
      <div class="gallery-viewer">
        <div class="gallery-main">
          <img data-main-gallery-image src="${escapeHtml(hero)}" alt="${escapeHtml(title)} selezione gallery">
        </div>
        <div class="gallery-grid">
        ${gallery.map((image, index) => `
          <button type="button" data-gallery-image="${escapeHtml(image)}" class="${index === 0 ? 'is-active' : ''}" aria-label="${escapeHtml(`${title} vista ${index + 1}`)}">
            <img src="${escapeHtml(image)}" alt="${escapeHtml(`${title} vista ${index + 1}`)}" loading="lazy">
          </button>
        `).join('')}
        </div>
      </div>
    </section>
    <section class="detail-info">
      <div class="section-title">
        <div>
          <p>Finiture e possibilità</p>
          <h2>Personalizzazione</h2>
        </div>
      </div>
      <div class="chip-list">
        ${[...finishes, ...notes].slice(0, 18).map((item) => `<span>${escapeHtml(item)}</span>`).join('')}
      </div>
    </section>
  </main>
  <script>
    const mainGalleryImage = document.querySelector('[data-main-gallery-image]');
    const galleryButtons = document.querySelectorAll('[data-gallery-image]');

    galleryButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const nextImage = button.getAttribute('data-gallery-image');
        if (!mainGalleryImage || !nextImage || mainGalleryImage.getAttribute('src') === nextImage) return;

        galleryButtons.forEach((item) => item.classList.remove('is-active'));
        button.classList.add('is-active');
        mainGalleryImage.classList.add('is-changing');

        window.setTimeout(() => {
          mainGalleryImage.setAttribute('src', nextImage);
          mainGalleryImage.classList.remove('is-changing');
        }, 160);
      });
    });

    (function() {
      const backLink = document.querySelector('.back-link');
      if (!backLink) return;

      backLink.addEventListener('click', () => {
        sessionStorage.setItem('catalogScrollPosition', window.scrollY);
      });
    })();
  </script>
</body>
</html>`;
};

const renderPreview = (catalog) => `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview Catalogo Soft Comfort</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Playfair+Display:wght@700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --black: #050505;
      --panel: #111;
      --red: #f20f1f;
      --red-dark: #a90914;
      --gold: #d9a858;
      --text: #f8f4ee;
      --muted: rgba(248, 244, 238, 0.68);
      --line: rgba(255, 255, 255, 0.12);
      --font-body: 'Inter', sans-serif;
      --font-display: 'Playfair Display', serif;
    }

    * { box-sizing: border-box; }

    body {
      position: relative;
      margin: 0;
      min-height: 100vh;
      color: var(--text);
      font-family: var(--font-body);
      background:
        radial-gradient(circle at 16% 2%, rgba(217, 168, 88, 0.18), transparent 30%),
        radial-gradient(circle at 88% 7%, rgba(242, 15, 31, 0.14), transparent 31%),
        linear-gradient(180deg, #130909 0%, #080707 42%, #030303 100%);
      overflow-x: hidden;
    }

    body::before {
      content: '';
      position: fixed;
      inset: 0;
      z-index: -2;
      background: url('ChatGPT Image 14 mag 2026, 18_40_10.png') center 18vh / min(560px, 78vw) auto no-repeat;
      opacity: 0.055;
      filter: blur(1px) saturate(0.7);
      pointer-events: none;
    }

    body::after {
      content: '';
      position: fixed;
      inset: 0;
      z-index: -1;
      background:
        linear-gradient(90deg, rgba(5, 5, 5, 0.92), rgba(5, 5, 5, 0.62) 48%, rgba(5, 5, 5, 0.92)),
        radial-gradient(circle at 50% 22%, transparent 0, rgba(5, 5, 5, 0.6) 48%, rgba(5, 5, 5, 0.92) 100%);
      pointer-events: none;
    }

    main {
      width: min(1180px, calc(100% - 36px));
      margin: 0 auto;
      padding: 70px 0;
    }

    .preview-hero {
      position: relative;
      display: grid;
      gap: 20px;
      margin-bottom: 52px;
      padding: 44px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 34px;
      overflow: hidden;
      background:
        linear-gradient(135deg, rgba(255, 255, 255, 0.09), rgba(255, 255, 255, 0.025)),
        radial-gradient(circle at 82% 24%, rgba(217, 168, 88, 0.18), transparent 36%),
        radial-gradient(circle at 12% 90%, rgba(242, 15, 31, 0.18), transparent 36%);
      box-shadow: 0 30px 110px rgba(0, 0, 0, 0.25);
    }

    .preview-hero::after {
      content: '';
      position: absolute;
      right: -80px;
      bottom: -110px;
      width: min(420px, 72vw);
      aspect-ratio: 1;
      background: url('ChatGPT Image 14 mag 2026, 18_40_10.png') center / contain no-repeat;
      opacity: 0.09;
      filter: grayscale(0.25) blur(0.2px);
      pointer-events: none;
    }

    .catalog-topline {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
      margin-bottom: 28px;
    }

    .catalog-back {
      color: var(--gold);
      font-size: 0.8rem;
      font-weight: 900;
      letter-spacing: 0.12em;
      text-decoration: none;
      text-transform: uppercase;
    }

    .eyebrow {
      display: inline-flex;
      width: fit-content;
      gap: 10px;
      align-items: center;
      color: var(--gold);
      font-size: 0.76rem;
      font-weight: 900;
      letter-spacing: 0.18em;
      text-transform: uppercase;
    }

    .eyebrow::before {
      content: '';
      width: 42px;
      height: 3px;
      border-radius: 99px;
      background: var(--red);
    }

    h1 {
      max-width: 820px;
      margin: 0;
      font-family: var(--font-display);
      font-size: clamp(2.6rem, 7vw, 6.4rem);
      line-height: 0.92;
      letter-spacing: -0.055em;
    }

    .preview-hero p {
      max-width: 690px;
      margin: 0;
      color: var(--muted);
      font-size: 1.04rem;
      line-height: 1.8;
    }

    .catalog-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 18px;
      align-items: stretch;
    }

    .category-section {
      position: relative;
      display: grid;
      gap: 24px;
      margin-top: 64px;
      padding: 28px;
      border: 1px solid rgba(255, 255, 255, 0.095);
      border-radius: 34px;
      overflow: hidden;
      background:
        linear-gradient(135deg, rgba(255, 255, 255, 0.052), rgba(255, 255, 255, 0.02)),
        radial-gradient(circle at 92% 12%, rgba(217, 168, 88, 0.12), transparent 32%);
      box-shadow: 0 28px 100px rgba(0, 0, 0, 0.24);
    }

    .category-section:nth-of-type(odd) {
      background:
        linear-gradient(135deg, rgba(255, 255, 255, 0.052), rgba(255, 255, 255, 0.02)),
        radial-gradient(circle at 12% 18%, rgba(242, 15, 31, 0.13), transparent 34%),
        radial-gradient(circle at 88% 88%, rgba(217, 168, 88, 0.1), transparent 32%);
    }

    .category-section::before {
      content: '';
      position: absolute;
      right: -64px;
      top: 18px;
      width: min(280px, 58vw);
      aspect-ratio: 1;
      background: url('ChatGPT Image 14 mag 2026, 18_40_10.png') center / contain no-repeat;
      opacity: 0.045;
      pointer-events: none;
    }

    .category-heading {
      display: flex;
      align-items: start;
      justify-content: flex-start;
      gap: 24px;
      padding-bottom: 20px;
      border-bottom: 1px solid var(--line);
    }

    .catalog-page-status {
      margin-left: auto;
      padding: 12px 16px;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 999px;
      color: rgba(248, 244, 238, 0.78);
      background: rgba(255, 255, 255, 0.045);
      font-size: 0.82rem;
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      white-space: nowrap;
    }

    .category-heading > span {
      display: none;
    }

    .category-heading p {
      margin: 0 0 10px;
      color: var(--gold);
      font-size: 0.76rem;
      font-weight: 900;
      letter-spacing: 0.18em;
      text-align: left;
      text-transform: uppercase;
    }

    .category-heading h2 {
      margin: 0;
      font-family: var(--font-display);
      font-size: clamp(2.2rem, 5vw, 4.8rem);
      line-height: 0.92;
      letter-spacing: -0.055em;
      text-align: left;
    }

    .product-card {
      display: flex;
      flex-direction: column;
      min-height: 100%;
      overflow: hidden;
      border: 1px solid var(--line);
      border-radius: 30px;
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.068), rgba(255, 255, 255, 0.03));
      box-shadow: 0 24px 80px rgba(0, 0, 0, 0.28);
      backdrop-filter: blur(16px);
      transition: transform 0.35s ease, border-color 0.35s ease, box-shadow 0.35s ease;
    }

    .product-card:hover {
      transform: translateY(-8px);
      border-color: rgba(217, 168, 88, 0.42);
      box-shadow: 0 36px 120px rgba(242, 15, 31, 0.16);
    }

    .product-card[hidden] {
      display: none;
    }

    .product-media {
      position: relative;
      display: block;
      aspect-ratio: 1.08 / 1;
      overflow: hidden;
      color: inherit;
      text-decoration: none;
      background: #161616;
    }

    .product-media img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transform: scale(1.02);
      transition: transform 0.55s ease, filter 0.55s ease;
    }

    .product-card:hover .product-media img {
      transform: scale(1.09);
      filter: saturate(1.08) contrast(1.04);
    }

    .product-media span {
      position: absolute;
      top: 16px;
      left: 16px;
      padding: 8px 12px;
      border: 1px solid rgba(255, 255, 255, 0.18);
      border-radius: 999px;
      background: rgba(0, 0, 0, 0.48);
      backdrop-filter: blur(12px);
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .product-body {
      display: grid;
      grid-template-rows: auto auto auto 1fr auto auto;
      gap: 14px;
      padding: 22px;
      flex: 1;
    }

    .product-category {
      margin: 0;
      color: var(--gold);
      font-size: 0.72rem;
      font-weight: 900;
      letter-spacing: 0.16em;
      text-transform: uppercase;
    }

    h2 {
      margin: 0;
      font-family: var(--font-display);
      font-size: 2rem;
      line-height: 1;
    }

    h3 {
      margin: -6px 0 0;
      color: rgba(255, 255, 255, 0.78);
      font-size: 0.95rem;
      line-height: 1.45;
    }

    .product-body > p:not(.product-category) {
      display: -webkit-box;
      margin: 0;
      overflow: hidden;
      color: var(--muted);
      font-size: 0.92rem;
      line-height: 1.7;
      -webkit-line-clamp: 4;
      -webkit-box-orient: vertical;
    }

    .finish-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      min-height: 0;
    }

    .finish-list span {
      padding: 7px 10px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 18px;
      color: rgba(255, 255, 255, 0.72);
      background: rgba(255, 255, 255, 0.045);
      font-size: 0.72rem;
      font-weight: 700;
    }

    .product-cta {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 52px;
      padding: 0 18px;
      border-radius: 18px;
      color: #fff;
      background: linear-gradient(135deg, var(--red), var(--red-dark));
      box-shadow: 0 16px 38px rgba(242, 15, 31, 0.28);
      font-weight: 900;
      text-decoration: none;
      transition: transform 0.25s ease, box-shadow 0.25s ease;
    }

    .product-detail-link {
      align-self: end;
      color: var(--gold);
      font-size: 0.82rem;
      font-weight: 900;
      letter-spacing: 0.08em;
      text-decoration: none;
      text-transform: uppercase;
    }

    .product-detail-link:hover {
      color: #fff;
    }

    .product-cta:hover {
      transform: translateY(-2px);
      box-shadow: 0 20px 48px rgba(242, 15, 31, 0.4);
    }

    .catalog-pagination {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      flex-wrap: wrap;
      padding-top: 4px;
    }

    .catalog-pagination button {
      min-height: 46px;
      border: 1px solid rgba(255, 255, 255, 0.13);
      border-radius: 999px;
      padding: 0 16px;
      color: var(--text);
      background: rgba(255, 255, 255, 0.055);
      font-family: var(--font-body);
      font-weight: 900;
      cursor: pointer;
      transition: 0.22s ease;
    }

    .catalog-page-numbers {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      justify-content: center;
    }

    .catalog-page-numbers button {
      width: 46px;
      padding: 0;
    }

    .catalog-pagination button:hover,
    .catalog-pagination button.is-active {
      border-color: rgba(217, 168, 88, 0.52);
      background: linear-gradient(135deg, rgba(242, 15, 31, 0.72), rgba(156, 6, 16, 0.88));
      transform: translateY(-2px);
    }

    .catalog-pagination button:disabled {
      opacity: 0.42;
      cursor: not-allowed;
      transform: none;
    }

    @media (max-width: 900px) {
      main { width: min(100% - 28px, 560px); padding: 46px 0; }
      .catalog-topline { align-items: start; flex-direction: column; }
      .catalog-grid { grid-template-columns: 1fr; }
      .product-body { padding: 20px; }
      .category-heading { align-items: start; flex-direction: column; }
      .catalog-page-status { margin-left: 0; }
      .category-heading p,
      .category-heading h2 { text-align: left; }
    }

    @media (max-width: 480px) {
      main { width: calc(100% - 20px); padding: 32px 0; }
      .preview-hero { padding: 24px; border-radius: 26px; }
      .category-section { padding: 18px; border-radius: 26px; }
      .catalog-grid { gap: 16px; }
      .catalog-pagination { gap: 8px; }
      .catalog-pagination button { min-height: 44px; padding: 0 12px; font-size: 0.82rem; }
      .catalog-page-numbers button { width: 42px; }
      .product-body { padding: 16px; }
      .preview-hero h1 { font-size: clamp(2rem, 6vw, 3.2rem); }
      .preview-hero p { font-size: 0.95rem; }
      .category-heading h2 { font-size: clamp(1.6rem, 5vw, 2.2rem); }
      .category-heading p { font-size: 0.85rem; }
    }
  </style>
</head>
<body>
  <main>
    <div class="catalog-topline">
      <a class="catalog-back" href="index.html">← Torna al sito</a>
    </div>
    <section class="preview-hero">
      <span class="eyebrow">Preview catalogo</span>
      <h1>Showroom digitale Soft Comfort</h1>
      <p>Una selezione di soluzioni cucina pensata per accompagnare il cliente dalla prima ispirazione alla consulenza in showroom. Nessun prezzo online: ogni proposta viene progettata su misura da Soft Comfort.</p>
    </section>
    ${Object.entries(catalog.groupedProducts).map(([category, products]) => renderCategorySection(category, products)).join('')}
  </main>
  <script>
    (function() {
      const savedScroll = sessionStorage.getItem('catalogScrollPosition');
      if (savedScroll) {
        window.scrollTo(0, parseInt(savedScroll, 10));
        sessionStorage.removeItem('catalogScrollPosition');
      }
    })();

    document.querySelectorAll('[data-catalog-section]').forEach((section) => {
      const items = [...section.querySelectorAll('[data-catalog-item]')];
      const targets = [...section.querySelectorAll('[data-page-target]')];
      const previous = section.querySelector('[data-page-prev]');
      const next = section.querySelector('[data-page-next]');
      const label = section.querySelector('[data-current-page-label]');
      const totalPages = Math.max(...items.map((item) => Number(item.dataset.page || 1)));

      const setPage = (page, shouldScroll) => {
        const nextPage = Math.min(Math.max(page, 1), totalPages);
        section.dataset.currentPage = String(nextPage);

        items.forEach((item) => {
          item.hidden = Number(item.dataset.page) !== nextPage;
        });

        targets.forEach((button) => {
          button.classList.toggle('is-active', Number(button.dataset.pageTarget) === nextPage);
        });

        if (previous) previous.disabled = nextPage === 1;
        if (next) next.disabled = nextPage === totalPages;
        if (label) label.textContent = String(nextPage);

        if (shouldScroll) {
          section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      };

      targets.forEach((button) => {
        button.addEventListener('click', () => setPage(Number(button.dataset.pageTarget), true));
      });

      previous?.addEventListener('click', () => setPage(Number(section.dataset.currentPage || 1) - 1, true));
      next?.addEventListener('click', () => setPage(Number(section.dataset.currentPage || 1) + 1, true));
      setPage(1, false);
    });
  </script>
</body>
</html>`;

const catalog = await getUnifiedCatalog();

await fs.mkdir(previewDir, { recursive: true });
await fs.mkdir(previewAssetsDir, { recursive: true });
await fs.mkdir(previewDetailsDir, { recursive: true });

catalog.products = await Promise.all(catalog.products.map(async (product) => {
  const publicTitle = getPublicTitle(product);
  const publicCategory = getPublicCategory(product);
  const enrichedProduct = {
    ...product,
    publicTitle,
    publicCategory
  };
  const detailFileName = `${slugify(publicCategory)}-${slugify(publicTitle)}.html`;

  enrichedProduct.detailUrl = `details/${detailFileName}`;
  enrichedProduct.publicCover = await cacheCoverImage(enrichedProduct);
  enrichedProduct.galleryImages = await cacheGalleryImages(enrichedProduct);

  await fs.writeFile(
    path.join(previewDetailsDir, detailFileName),
    renderDetailPage(enrichedProduct),
    'utf8'
  );

  return enrichedProduct;
}));
catalog.groupedProducts = catalog.products.reduce((groups, product) => {
  const category = product.publicCategory;
  groups[category] = groups[category] || [];
  groups[category].push(product);
  return groups;
}, {});
await fs.writeFile(previewPath, renderPreview(catalog), 'utf8');

console.log(`Preview generated: ${previewPath}`);
