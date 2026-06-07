import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve('.');
const DATA = JSON.parse(await fs.readFile(path.join(ROOT, 'complementi-build', 'stones-complementi-clean.json'), 'utf8'));
const TEMPLATE = await fs.readFile(path.join(ROOT, 'catalogo-divani.html'), 'utf8');
const OUT_DIR = path.join(ROOT, 'complementi-arredi');
const ITEMS_PER_PAGE = 12;

await fs.mkdir(OUT_DIR, { recursive: true });

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const labelMap = {
  tavoli: 'Tavoli',
  sedie: 'Sedie',
  sgabelli: 'Sgabelli'
};

const categoryIntro = {
  tavoli: 'Tavoli, consolle e soluzioni allungabili per ambienti pranzo e living.',
  sedie: 'Sedie selezionate per materiali, forme e finiture coordinate.',
  sgabelli: 'Sgabelli per penisole, banconi e zone conviviali contemporanee.'
};

const navHtml = `      <nav class="catalog-sticky-nav" aria-label="Navigazione cataloghi">
        <a href="index.html">Home</a>
        <a href="catalogo-cucine.html" data-catalog-nav="cucine">Cucine</a>
        <a href="catalogo-divani.html" data-catalog-nav="divani">Divani</a>
        <a href="catalogo-camere-camerette.html" data-catalog-nav="camerette">Camerette</a>
        <a href="catalogo-camere-da-letto.html" data-catalog-nav="camere">Camere da letto</a>
        <a href="catalogo-materassi.html" data-catalog-nav="materassi">Materassi</a>
        <a href="catalogo-complementi-arredi.html" data-catalog-nav="complementi" class="is-active">Tavoli e sedie</a>
      </nav>`;

const renderCard = (product, page) => {
  const id = `product-complementi-${product.slug}`;
  const image = product.images[0];
  const title = escapeHtml(product.name);
  const category = labelMap[product.category] || 'Complementi';
  const shortDetails = product.detailsText.split(' ').slice(0, 22).join(' ');
  return `
    <article class="product-card" id="${id}" data-catalog-item data-page="${page}">
      <a class="product-media" href="complementi-arredi/${product.slug}.html">
        <img src="${image}" alt="${title}" loading="lazy">
        <span>Soft Comfort · ${category}</span>
      </a>
      <div class="product-body">
        <p class="product-category">Tavoli e sedie · ${category}</p>
        <h2>${title}</h2>
        <h3>${escapeHtml(product.dimensioni || categoryIntro[product.category] || '')}</h3>
        <p>${escapeHtml(shortDetails)}${product.detailsText.split(' ').length > 22 ? '…' : ''}</p>
        <div class="chip-list"><span>${category}</span><span>Selezione Soft Comfort</span></div>
        <a class="product-detail-link" href="complementi-arredi/${product.slug}.html">Guarda dettagli e gallery</a>
        <a class="product-cta" href="https://wa.me/393929952453?text=Salve%20Soft%20Comfort%2C%20vorrei%20ricevere%20maggiori%20informazioni%20su%20questo%20complemento%20d%27arredo%3A%20${encodeURIComponent(product.name)}.%20Categoria%3A%20${encodeURIComponent(category)}." target="_blank" rel="noopener">Richiedi informazioni su WhatsApp</a>
      </div>
    </article>`;
};

const renderSection = (category) => {
  const items = DATA.products.filter((product) => product.category === category);
  const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);
  let html = `
  <section class="category-section" id="complementi-${category}" data-catalog-section data-current-page="1">
    <div class="category-heading">
      <div>
        <p>${items.length} modelli e varianti selezionati</p>
        <h2>${labelMap[category]}</h2>
      </div>
      ${totalPages > 1 ? `
        <div class="catalog-page-status" aria-live="polite">
          Pagina <span data-current-page-label>1</span> di ${totalPages}
        </div>` : ''}
    </div>
    <p class="catalog-section-intro">${categoryIntro[category]}</p>
    <div class="catalog-grid">`;

  items.forEach((product, index) => {
    html += renderCard(product, Math.floor(index / ITEMS_PER_PAGE) + 1);
  });

  html += '</div>';

  if (totalPages > 1) {
    html += `
      <nav class="catalog-pagination" aria-label="Paginazione ${labelMap[category]}">
        <button type="button" data-page-prev>Precedente</button>`;
    for (let page = 1; page <= totalPages; page += 1) {
      html += `
        <button type="button" data-page-target="${page}" ${page === 1 ? 'class="is-active"' : ''}>${page}</button>`;
    }
    html += `
        <button type="button" data-page-next>Successiva</button>
      </nav>`;
  }

  html += '\n  </section>';
  return html;
};

const script = `<script>
    const getReturnTargetId = () => {
      const fromHash = decodeURIComponent(window.location.hash.replace('#', '') || '');
      const id = fromHash || sessionStorage.getItem('catalogReturnTarget') || '';
      return id.startsWith('product-') ? id : '';
    };

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
        items.forEach((item) => { item.hidden = Number(item.dataset.page) !== nextPage; });
        targets.forEach((button) => { button.classList.toggle('is-active', Number(button.dataset.pageTarget) === nextPage); });
        if (previous) previous.disabled = nextPage === 1;
        if (next) next.disabled = nextPage === totalPages;
        if (label) label.textContent = String(nextPage);
        if (shouldScroll) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      };

      targets.forEach((button) => { button.addEventListener('click', () => setPage(Number(button.dataset.pageTarget), true)); });
      previous?.addEventListener('click', () => setPage(Number(section.dataset.currentPage || 1) - 1, true));
      next?.addEventListener('click', () => setPage(Number(section.dataset.currentPage || 1) + 1, true));
      const target = document.getElementById(getReturnTargetId());
      setPage(target && section.contains(target) ? Number(target.dataset.page || 1) : 1, false);
    });

    document.querySelectorAll('.product-card[id] .product-media, .product-card[id] .product-detail-link').forEach((link) => {
      link.addEventListener('click', () => {
        const card = link.closest('.product-card[id]');
        if (!card) return;
        sessionStorage.setItem('catalogReturnTarget', card.id);
        history.replaceState(null, '', \`#\${card.id}\`);
      });
    });

    window.addEventListener('load', () => {
      const target = document.getElementById(getReturnTargetId());
      if (!target) return;
      window.setTimeout(() => {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        target.classList.add('is-return-focus');
        window.setTimeout(() => target.classList.remove('is-return-focus'), 1800);
        sessionStorage.removeItem('catalogReturnTarget');
      }, 80);
    });
  </script>`;

const extraStyle = `<style>
    .catalog-section-intro {
      width: min(980px, calc(100% - 40px));
      margin: -18px auto 30px;
      color: var(--muted);
      line-height: 1.7;
    }
  </style>`;

const sections = ['tavoli', 'sedie', 'sgabelli'].map(renderSection).join('\n');
let catalog = TEMPLATE
  .replace(/<title>Catalogo Divani Soft Comfort<\/title>/, '<title>Complementi d\'arredi Soft Comfort</title>')
  .replace(/<\/head>/, `${extraStyle}\n</head>`)
  .replace(/<nav class="catalog-sticky-nav"[\s\S]*?<\/nav>/, navHtml)
  .replace(/<a class="catalog-sticky-cta"[\s\S]*?<\/a>/, '<a class="catalog-sticky-cta" href="https://wa.me/393929952453?text=Salve%20Soft%20Comfort%2C%20vorrei%20una%20consulenza%20su%20tavoli%20e%20sedie." target="_blank" rel="noopener">Consulenza</a>')
  .replace(/<section class="preview-hero">[\s\S]*?<\/section>/, `<section class="preview-hero">
      <span class="eyebrow">Tavoli e sedie</span>
      <h1>Tavoli, sedie e sgabelli</h1>
      <p>Una selezione di tavoli, sedie e sgabelli organizzata per sottocategorie. Immagini, colori, finiture e disponibilità sono da verificare in fase di consulenza con Soft Comfort.</p>
    </section>`)
  .replace(/<section class="category-section"[\s\S]*?\n  <\/main>/, `${sections}\n  </main>`)
  .replace(/<script>[\s\S]*?<\/script>\s*<\/body>/, `${script}\n</body>`);

await fs.writeFile(path.join(ROOT, 'catalogo-complementi-arredi.html'), catalog, 'utf8');

const detailCss = `
    body { overflow-x: hidden; }
    .detail-page {
      width: min(1180px, calc(100% - 32px));
      margin: 0 auto;
      padding: 26px 0 54px;
    }
    .back-link {
      display: inline-flex;
      margin: 0 0 22px;
    }
    .detail-hero {
      display: grid;
      grid-template-columns: minmax(0, 0.95fr) minmax(320px, 1.05fr);
      gap: 28px;
      align-items: stretch;
    }
    .hero-copy,
    .hero-image,
    .gallery-section,
    .detail-info {
      border-radius: 28px;
      border: 1px solid rgba(255, 255, 255, 0.12);
      background: rgba(255, 255, 255, 0.055);
      box-shadow: 0 22px 70px rgba(0, 0, 0, 0.28);
    }
    .hero-copy {
      padding: clamp(24px, 4vw, 46px);
    }
    .hero-copy h1 {
      margin-bottom: 12px;
      line-height: 0.98;
    }
    .hero-copy h2 {
      color: rgba(248, 244, 238, 0.82);
      font-size: clamp(1.05rem, 2vw, 1.45rem);
      line-height: 1.35;
    }
    .hero-copy .description {
      max-width: 58ch;
      line-height: 1.75;
    }
    .hero-image {
      min-height: 420px;
      padding: 22px;
      display: grid;
      place-items: center;
      overflow: hidden;
      background: linear-gradient(145deg, rgba(255,255,255,0.09), rgba(255,255,255,0.025));
    }
    .hero-image img {
      width: 100%;
      height: 100%;
      max-height: 520px;
      object-fit: contain;
      object-position: center;
      border-radius: 20px;
      background: rgba(255,255,255,0.96);
    }
    .hero-image span {
      display: none;
    }
    .gallery-section,
    .detail-info {
      margin-top: 28px;
      padding: clamp(22px, 4vw, 38px);
    }
    .gallery-viewer {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 170px;
      gap: 20px;
      align-items: start;
    }
    .gallery-main {
      min-height: 520px;
      border-radius: 24px;
      overflow: hidden;
      background: rgba(255,255,255,0.96);
      display: grid;
      place-items: center;
    }
    .gallery-main img {
      width: 100%;
      height: 100%;
      max-height: 620px;
      object-fit: contain;
      object-position: center;
    }
    .gallery-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 12px;
      max-height: 620px;
      overflow: auto;
      padding-right: 4px;
    }
    .gallery-grid button {
      border: 1px solid rgba(255,255,255,0.18);
      border-radius: 16px;
      padding: 6px;
      background: rgba(255,255,255,0.08);
      cursor: pointer;
      transition: 0.2s ease;
      aspect-ratio: 1 / 1;
    }
    .gallery-grid button.is-active,
    .gallery-grid button:hover {
      border-color: rgba(242, 15, 31, 0.82);
      transform: translateY(-1px);
    }
    .gallery-grid img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      border-radius: 12px;
      background: rgba(255,255,255,0.96);
    }
    .detail-info p {
      margin: 0 0 14px;
      color: rgba(248, 244, 238, 0.78);
      line-height: 1.78;
    }
    .detail-info p strong {
      color: #fff;
    }
    .source-note {
      margin-top: 20px;
      padding: 16px 18px;
      border-radius: 18px;
      background: rgba(242, 15, 31, 0.12);
      color: rgba(248, 244, 238, 0.76);
      font-size: 0.92rem;
      line-height: 1.65;
    }
    @media (max-width: 900px) {
      .detail-hero,
      .gallery-viewer {
        grid-template-columns: 1fr;
      }
      .hero-image,
      .gallery-main {
        min-height: 320px;
      }
      .gallery-grid {
        grid-template-columns: repeat(4, minmax(0, 1fr));
        max-height: none;
      }
    }
`;

const renderDetail = (product) => {
  const title = escapeHtml(product.name);
  const category = labelMap[product.category] || 'Complementi';
  const detailImage = (image) => image.startsWith('catalogo-assets/') ? `../${image}` : image;
  const galleryButtons = product.images.map((image, index) => `
          <button type="button" data-gallery-image="${detailImage(image)}" ${index === 0 ? 'class="is-active"' : ''} aria-label="${title} vista ${index + 1}">
            <img src="${detailImage(image)}" alt="${title} vista ${index + 1}" loading="lazy">
          </button>`).join('');
  const paragraphs = product.detailsText.split(/(?=Caratteristiche prodotto|Materiale|Colore|Dimensioni ingombro|Misure prodotto|Utile da sapere|Manutenzione)/g)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => `<p>${escapeHtml(part)}</p>`)
    .join('\n      ');

  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} | Tavoli e sedie Soft Comfort</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Playfair+Display:wght@700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../materassi/materassi.css?v=20260604_cover">
  <style>${detailCss}</style>
</head>
<body>
  <main class="detail-page">
    <a class="back-link" href="../catalogo-complementi-arredi.html#product-complementi-${product.slug}">← Torna a tavoli e sedie</a>
    <section class="detail-hero">
      <div class="hero-copy">
        <p class="category">Tavoli e sedie · ${category}</p>
        <h1>${title}</h1>
        <h2>${escapeHtml(product.dimensioni || categoryIntro[product.category] || '')}</h2>
        <p class="description">Scheda prodotto selezionata da Soft Comfort. Dettagli, finiture e disponibilità sono da confermare in showroom.</p>
        <div class="chip-list"><span>${category}</span><span>Selezione Soft Comfort</span></div>
        <div class="detail-actions">
          <a class="btn" href="https://wa.me/393929952453?text=Salve%20Soft%20Comfort%2C%20vorrei%20ricevere%20maggiori%20informazioni%20su%20questo%20complemento%20d%27arredo%3A%20${encodeURIComponent(product.name)}.%20Categoria%3A%20${encodeURIComponent(category)}." target="_blank" rel="noopener">Richiedi consulenza WhatsApp</a>
          <a class="btn btn-secondary" href="../catalogo-complementi-arredi.html#product-complementi-${product.slug}">Vedi altri complementi</a>
        </div>
      </div>
      <div class="hero-image">
        <img src="${detailImage(product.images[0])}" alt="${title}">
        <span>Soft Comfort</span>
      </div>
    </section>
    <section class="gallery-section">
      <div class="section-title">
        <div>
          <p>Gallery prodotto</p>
          <h2>Immagini prodotto</h2>
        </div>
      </div>
      <div class="gallery-viewer">
        <div class="gallery-main">
          <img data-main-gallery-image src="${detailImage(product.images[0])}" alt="${title} gallery">
        </div>
        <div class="gallery-grid">${galleryButtons}
        </div>
      </div>
    </section>
    <section class="detail-info">
      <div class="section-title">
        <div>
          <p>Informazioni prodotto</p>
          <h2>Dettagli tecnici</h2>
        </div>
      </div>
      ${paragraphs}
      <p class="source-note">Le immagini e i colori sono indicativi e possono variare in base al dispositivo. Disponibilità, finiture e caratteristiche vanno confermate con Soft Comfort in fase di consulenza.</p>
    </section>
  </main>
  <script>
    const returnTarget = 'product-complementi-${product.slug}';
    document.querySelectorAll('[data-gallery-image]').forEach((button) => {
      button.addEventListener('click', () => {
        const main = document.querySelector('[data-main-gallery-image]');
        if (!main) return;
        main.src = button.dataset.galleryImage;
        document.querySelectorAll('[data-gallery-image]').forEach((item) => item.classList.remove('is-active'));
        button.classList.add('is-active');
      });
    });
    document.querySelectorAll('.back-link, .btn-secondary').forEach((link) => {
      link.addEventListener('click', () => sessionStorage.setItem('catalogReturnTarget', returnTarget));
    });
  </script>
</body>
</html>`;
};

for (const product of DATA.products) {
  await fs.writeFile(path.join(OUT_DIR, `${product.slug}.html`), renderDetail(product), 'utf8');
}

console.log(JSON.stringify({ catalog: 'catalogo-complementi-arredi.html', details: DATA.products.length, summary: DATA.summary }, null, 2));
