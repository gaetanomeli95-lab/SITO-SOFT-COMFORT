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
    const supplier = item.catalog.supplier || item.file;
    const current = latestBySupplier.get(supplier);
    if (!current || item.mtime > current.mtime) {
      latestBySupplier.set(supplier, item);
    }
  });

  const selectedCatalogs = [...latestBySupplier.values()].sort((a, b) => a.catalog.supplier.localeCompare(b.catalog.supplier, 'it'));
  const products = selectedCatalogs.flatMap((item) => item.catalog.products || []);

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
    const response = await fetch(source);
    if (!response.ok) return '';

    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.writeFile(filePath, buffer);
    return `assets/${fileName}`;
  }
};

const cacheGalleryImages = async (product) => {
  const category = product.publicCategory || product.category;
  const title = product.publicTitle || product.title;
  const sources = [...new Set((product.images || []).filter(Boolean))].slice(0, 10);
  const images = [];

  for (const [index, source] of sources.entries()) {
    const fileName = `soft-comfort-${slugify(category)}-${slugify(title)}-${String(index + 1).padStart(2, '0')}${getImageExtension(source)}`;
    const filePath = path.join(previewAssetsDir, fileName);

    try {
      await fs.access(filePath);
    } catch {
      const response = await fetch(source);
      if (!response.ok) continue;

      const buffer = Buffer.from(await response.arrayBuffer());
      await fs.writeFile(filePath, buffer);
    }

    images.push(`../assets/${fileName}`);
  }

  return images;
};

const renderProduct = (product) => {
  const cover = product.publicCover || '';
  const finishes = product.technicalFeatures?.finishes || [];
  const category = product.publicCategory || product.category;
  const title = sanitizePublicText(product.publicTitle || product.title);
  const subtitle = sanitizePublicText(product.subtitle);
  const description = sanitizePublicText(product.description);
  const detailUrl = product.detailUrl || '#';

  return `
    <article class="product-card">
      <a class="product-media" href="${escapeHtml(detailUrl)}">
        <img src="${escapeHtml(cover)}" alt="${escapeHtml(title)}" loading="lazy">
        <span>Collezione Soft Comfort</span>
      </a>
      <div class="product-body">
        <p class="product-category">${escapeHtml(category)}</p>
        <h2>${escapeHtml(title)}</h2>
        ${subtitle ? `<h3>${escapeHtml(subtitle)}</h3>` : ''}
        <p>${escapeHtml(description)}</p>
        <div class="finish-list">
          ${finishes.slice(0, 6).map((finish) => `<span>${escapeHtml(sanitizePublicText(finish))}</span>`).join('')}
        </div>
        <a class="product-detail-link" href="${escapeHtml(detailUrl)}">Guarda dettagli e gallery</a>
        <a class="product-cta" href="${createWhatsappUrl(product)}" target="_blank" rel="noopener">Richiedi informazioni su WhatsApp</a>
      </div>
    </article>
  `;
};

const renderCategorySection = (category, products) => `
  <section class="category-section">
    <div class="category-heading">
      <span>${escapeHtml(String(products.length).padStart(2, '0'))}</span>
      <div>
        <p>Catalogo Soft Comfort</p>
        <h2>${escapeHtml(category)}</h2>
      </div>
    </div>
    <div class="catalog-grid">
      ${products.map(renderProduct).join('')}
    </div>
  </section>
`;

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
        radial-gradient(circle at 10% 0%, rgba(242, 15, 31, 0.2), transparent 30%),
        radial-gradient(circle at 90% 12%, rgba(217, 168, 88, 0.16), transparent 34%),
        linear-gradient(180deg, #080808, #030303);
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
      min-height: 640px;
      overflow: hidden;
      border: 1px solid var(--line);
      border-radius: 38px;
      background: #141414;
      box-shadow: 0 34px 120px rgba(0, 0, 0, 0.35);
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
      border-radius: 38px;
      background: rgba(255, 255, 255, 0.055);
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

    .gallery-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
    }

    .gallery-grid button {
      display: block;
      aspect-ratio: 4 / 3;
      width: 100%;
      padding: 0;
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 22px;
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
      .gallery-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .section-title { align-items: start; flex-direction: column; }
    }

    @media (max-width: 480px) {
      .detail-shell { width: calc(100% - 20px); padding-top: 18px; }
      .hero-image { min-height: 260px; }
      .detail-copy { padding: 18px; }
      .gallery-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
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
        <img data-main-gallery-image src="${escapeHtml(hero)}" alt="${escapeHtml(title)}">
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
      <div class="gallery-grid">
        ${gallery.map((image, index) => `
          <button type="button" data-gallery-image="${escapeHtml(image)}" class="${index === 0 ? 'is-active' : ''}" aria-label="${escapeHtml(`${title} vista ${index + 1}`)}">
            <img src="${escapeHtml(image)}" alt="${escapeHtml(`${title} vista ${index + 1}`)}" loading="lazy">
          </button>
        `).join('')}
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
      margin: 0;
      min-height: 100vh;
      color: var(--text);
      font-family: var(--font-body);
      background:
        radial-gradient(circle at 20% 0%, rgba(242, 15, 31, 0.2), transparent 34%),
        radial-gradient(circle at 80% 10%, rgba(217, 168, 88, 0.15), transparent 32%),
        linear-gradient(180deg, #080808, #030303);
    }

    main {
      width: min(1180px, calc(100% - 36px));
      margin: 0 auto;
      padding: 70px 0;
    }

    .preview-hero {
      display: grid;
      gap: 18px;
      margin-bottom: 42px;
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
    }

    .category-section {
      display: grid;
      gap: 22px;
      margin-top: 54px;
    }

    .category-heading {
      display: flex;
      align-items: end;
      justify-content: space-between;
      gap: 24px;
      padding-bottom: 18px;
      border-bottom: 1px solid var(--line);
    }

    .category-heading > span {
      color: rgba(217, 168, 88, 0.26);
      font-family: var(--font-display);
      font-size: clamp(3.2rem, 10vw, 8rem);
      line-height: 0.8;
      letter-spacing: -0.08em;
    }

    .category-heading p {
      margin: 0 0 8px;
      color: var(--gold);
      font-size: 0.72rem;
      font-weight: 900;
      letter-spacing: 0.18em;
      text-align: right;
      text-transform: uppercase;
    }

    .category-heading h2 {
      margin: 0;
      font-family: var(--font-display);
      font-size: clamp(2.2rem, 5vw, 4.8rem);
      line-height: 0.92;
      letter-spacing: -0.055em;
      text-align: right;
    }

    .product-card {
      overflow: hidden;
      border: 1px solid var(--line);
      border-radius: 32px;
      background: rgba(255, 255, 255, 0.055);
      box-shadow: 0 28px 90px rgba(0, 0, 0, 0.32);
      backdrop-filter: blur(16px);
      transition: transform 0.35s ease, border-color 0.35s ease, box-shadow 0.35s ease;
    }

    .product-card:hover {
      transform: translateY(-8px);
      border-color: rgba(217, 168, 88, 0.42);
      box-shadow: 0 36px 120px rgba(242, 15, 31, 0.16);
    }

    .product-media {
      position: relative;
      display: block;
      aspect-ratio: 4 / 3;
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
      gap: 14px;
      padding: 24px;
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
      margin: 0;
      color: var(--muted);
      font-size: 0.92rem;
      line-height: 1.7;
    }

    .finish-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      min-height: 35px;
    }

    .finish-list span {
      padding: 7px 10px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 999px;
      color: rgba(255, 255, 255, 0.72);
      background: rgba(255, 255, 255, 0.045);
      font-size: 0.72rem;
      font-weight: 700;
    }

    .product-cta {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 48px;
      padding: 0 18px;
      border-radius: 999px;
      color: #fff;
      background: linear-gradient(135deg, var(--red), var(--red-dark));
      box-shadow: 0 16px 38px rgba(242, 15, 31, 0.28);
      font-weight: 900;
      text-decoration: none;
      transition: transform 0.25s ease, box-shadow 0.25s ease;
    }

    .product-detail-link {
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

    @media (max-width: 900px) {
      main { width: min(100% - 28px, 560px); padding: 46px 0; }
      .catalog-topline { align-items: start; flex-direction: column; }
      .catalog-grid { grid-template-columns: 1fr; }
      .product-body { padding: 20px; }
      .category-heading { align-items: start; flex-direction: column; }
      .category-heading p,
      .category-heading h2 { text-align: left; }
    }

    @media (max-width: 480px) {
      main { width: calc(100% - 20px); padding: 32px 0; }
      .catalog-grid { gap: 16px; }
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
