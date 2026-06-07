import fs from 'fs/promises';
import path from 'path';

const ROOT = path.resolve('.');
const cards = JSON.parse(await fs.readFile(path.join(ROOT, 'premobil-data', 'pareti-cards.json'), 'utf8'));
const ASSETS = 'catalogo-assets/premobil';

const escapeHtml = (s) => (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

const categories = {
  'madie-joker': 'Madie Joker',
  'pareti-a-spalla': 'Pareti a spalla',
  'pareti-componibili': 'Pareti componibili',
  'pareti-bloccate': 'Pareti bloccate',
};

const sections = Object.entries(categories).map(([catSlug, catLabel]) => {
  const items = cards.filter(c => c.catSlug === catSlug);
  if (items.length === 0) return '';
  const cardsHtml = items.map(c => `    <article class="product-card" id="product-pareti-${c.slug}" data-catalog-item data-page="1">
      <a class="product-media" href="pareti-attrezzate/${c.slug}.html">
        <img src="${c.cover || ASSETS + '/LA-DUNE-TORTORA-001.jpg'}" alt="${c.title}" loading="lazy">
        <span>Selezione Soft Comfort</span>
      </a>
      <div class="product-body">
        <p class="product-category">Pareti attrezzate · ${c.catLabel}</p>
        <h2>${c.title}</h2>
        <h3>${c.dimensions || 'Design contemporaneo'}</h3>
        <p>${escapeHtml(c.desc || 'Parete attrezzata selezionata da Soft Comfort.')}</p>
        <div class="chip-list"><span>${c.catLabel}</span><span>Selezione Soft Comfort</span></div>
        <a class="product-detail-link" href="pareti-attrezzate/${c.slug}.html">Guarda dettagli e gallery</a>
        <a class="product-cta" href="https://wa.me/393929952453?text=Salve%20Soft%20Comfort%2C%20vorrei%20ricevere%20maggiori%20informazioni%20su%20questa%20parete%20attrezzata%3A%20${encodeURIComponent(c.title)}" target="_blank" rel="noopener">Richiedi informazioni su WhatsApp</a>
      </div>
    </article>`).join('\n\n');
  return `  <section class="category-section" id="${catSlug}" data-catalog-section data-current-page="1">
    <div class="category-heading"><div><p>${items.length} ${items.length === 1 ? 'modello selezionato' : 'modelli selezionati'}</p><h2>${catLabel}</h2></div><div class="catalog-page-status" aria-live="polite">Pagina <span data-current-page-label>1</span> di 1</div></div>
    <div class="catalog-grid">
${cardsHtml}
    </div>
    <nav class="catalog-pagination" aria-label="Paginazione ${catLabel}">
      <button type="button" data-page-prev disabled>Precedente</button>
      <div class="catalog-page-numbers">
        <button type="button" data-page-target="1" class="is-active">1</button>
      </div>
      <button type="button" data-page-next disabled>Successiva</button>
    </nav>
  </section>`;
}).filter(Boolean).join('\n\n');

const shortcuts = Object.entries(categories)
  .filter(([slug]) => cards.some(c => c.catSlug === slug))
  .map(([slug, label]) => `        <a href="#${slug}">${label}</a>`).join('\n');

const total = cards.length;

const html = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Catalogo Pareti attrezzate Soft Comfort</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Playfair+Display:wght@700;800&display=swap" rel="stylesheet">
  <style>
    :root { --black:#050505; --red:#f20f1f; --red-dark:#a90914; --gold:#d9a858; --text:#f8f4ee; --muted:rgba(248,244,238,.68); --line:rgba(255,255,255,.12); --font-body:'Inter',sans-serif; --font-display:'Playfair Display',serif; }
    * { box-sizing:border-box; }
    body { position:relative; margin:0; min-height:100vh; color:var(--text); font-family:var(--font-body); background:radial-gradient(circle at 16% 2%, rgba(217,168,88,.18), transparent 30%), radial-gradient(circle at 88% 7%, rgba(242,15,31,.14), transparent 31%), linear-gradient(180deg, #130909 0%, #080707 42%, #030303 100%); overflow-x:hidden; }
    body::before { content:''; position:fixed; inset:0; z-index:0; background-image:radial-gradient(circle at 50% 56%, rgba(242,15,31,.24), transparent 30%), radial-gradient(circle at 16% 72%, rgba(217,168,88,.16), transparent 34%), radial-gradient(circle at 86% 28%, rgba(242,15,31,.16), transparent 32%), url('ChatGPT Image 14 mag 2026, 18_40_10.png'); background-size:cover; background-position:center; opacity:.28; }
    a { color:inherit; }
    header { position:sticky; top:0; z-index:20; border-bottom:1px solid var(--line); background:linear-gradient(180deg, rgba(5,5,5,.92), rgba(5,5,5,.78)); backdrop-filter:blur(24px); }
    .catalog-sticky { display:flex; align-items:center; gap:16px; max-width:1320px; margin:0 auto; padding:14px 28px; }
    .catalog-sticky-brand { display:flex; align-items:center; gap:10px; color:var(--text); font-weight:900; letter-spacing:.06em; text-decoration:none; }
    .catalog-sticky-brand img { width:34px; height:34px; object-fit:cover; border-radius:10px; }
    .catalog-sticky-nav { display:flex; align-items:center; justify-content:center; gap:6px; flex:1; flex-wrap:wrap; }
    .catalog-sticky-nav a { padding:10px 12px; border-radius:999px; color:rgba(248,244,238,.78); font-size:.78rem; font-weight:900; letter-spacing:.04em; text-decoration:none; text-transform:uppercase; transition:.2s ease; }
    .catalog-sticky-nav a:hover, .catalog-sticky-nav a.is-active { color:#fff; background:rgba(242,15,31,.22); }
    .catalog-sticky-cta { min-height:44px; padding:0 18px; border-radius:999px; color:#fff; background:linear-gradient(135deg,var(--red),var(--red-dark)); box-shadow:0 14px 34px rgba(242,15,31,.24); font-weight:900; font-size:.78rem; text-decoration:none; }
    main { position:relative; z-index:1; width:min(1320px, calc(100% - 40px)); margin:0 auto; padding:70px 0; }
    .catalog-topline { display:flex; align-items:center; justify-content:space-between; margin-bottom:18px; }
    .catalog-back { color:var(--gold); font-size:.82rem; font-weight:900; letter-spacing:.12em; text-decoration:none; text-transform:uppercase; }
    .preview-hero, .category-section { background-color:rgba(8,7,7,.58); backdrop-filter:blur(5px); }
    .preview-hero { position:relative; display:grid; gap:20px; padding:52px 46px; border:1px solid var(--line); border-radius:38px; margin-bottom:28px; }
    .preview-hero .eyebrow { color:var(--gold); font-size:.72rem; font-weight:900; letter-spacing:.18em; text-transform:uppercase; }
    .preview-hero h1 { margin:0; font-family:var(--font-display); font-size:clamp(2.6rem,7vw,6rem); line-height:.9; letter-spacing:-.06em; }
    .preview-hero p { max-width:690px; margin:0; color:var(--muted); line-height:1.7; }
    .catalog-shortcuts { display:flex; flex-wrap:wrap; gap:10px; margin-top:8px; }
    .catalog-shortcuts a { padding:9px 14px; border:1px solid var(--line); border-radius:999px; color:rgba(248,244,238,.82); background:rgba(255,255,255,.04); font-size:.82rem; font-weight:800; text-decoration:none; transition:.2s ease; }
    .catalog-shortcuts a:hover { border-color:rgba(217,168,88,.45); color:#fff; }
    .category-section { display:grid; gap:24px; padding:28px; border:1px solid var(--line); border-radius:38px; margin-bottom:28px; }
    .category-heading { display:flex; flex-wrap:wrap; align-items:flex-end; justify-content:space-between; gap:14px; }
    .category-heading p { margin:0; color:var(--gold); font-size:.72rem; font-weight:900; letter-spacing:.16em; text-transform:uppercase; }
    .category-heading h2 { margin:0; font-family:var(--font-display); font-size:clamp(2rem,5vw,3.4rem); line-height:.95; letter-spacing:-.055em; }
    .catalog-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(min(100%, 300px), 1fr)); gap:24px; }
    .product-card { display:flex; flex-direction:column; min-height:100%; border:1px solid var(--line); border-radius:30px; background:linear-gradient(180deg, rgba(255,255,255,.07), rgba(255,255,255,.03)); backdrop-filter:blur(16px); overflow:hidden; transition:transform .35s ease, border-color .35s ease, box-shadow .35s ease; }
    .product-card:hover { transform:translateY(-8px); border-color:rgba(217,168,88,.42); box-shadow:0 36px 120px rgba(242,15,31,.16); }
    .product-media { position:relative; display:block; aspect-ratio:4/3; overflow:hidden; }
    .product-media img { width:100%; height:100%; object-fit:cover; transition:transform .55s ease, filter .55s ease; }
    .product-card:hover .product-media img { transform:scale(1.09); filter:saturate(1.08) contrast(1.04); }
    .product-media span { position:absolute; left:14px; top:14px; padding:7px 11px; border:1px solid rgba(255,255,255,.16); border-radius:999px; background:rgba(0,0,0,.45); backdrop-filter:blur(14px); font-size:.68rem; font-weight:900; letter-spacing:.12em; text-transform:uppercase; }
    .product-body { display:grid; gap:10px; padding:20px; }
    .product-category { margin:0; color:var(--gold); font-size:.72rem; font-weight:900; letter-spacing:.14em; text-transform:uppercase; }
    .product-body h2 { margin:0; font-family:var(--font-display); font-size:clamp(1.6rem,4vw,2.4rem); line-height:1.05; letter-spacing:-.045em; }
    .product-body h3 { margin:0; color:rgba(255,255,255,.72); font-size:.95rem; font-weight:600; }
    .product-body > p { margin:0; color:var(--muted); font-size:.92rem; line-height:1.65; }
    .chip-list { display:flex; flex-wrap:wrap; gap:8px; }
    .chip-list span { padding:6px 12px; border:1px solid var(--line); border-radius:999px; background:rgba(255,255,255,.04); font-size:.74rem; font-weight:700; }
    .product-detail-link { justify-self:start; padding:9px 16px; border:1px solid rgba(255,255,255,.14); border-radius:999px; background:rgba(255,255,255,.06); font-size:.82rem; font-weight:800; text-decoration:none; transition:.2s ease; }
    .product-detail-link:hover { border-color:rgba(217,168,88,.5); }
    .product-cta { justify-self:start; padding:10px 18px; border-radius:999px; color:#fff; background:linear-gradient(135deg,var(--red),var(--red-dark)); box-shadow:0 14px 34px rgba(242,15,31,.22); font-size:.82rem; font-weight:900; text-decoration:none; }
    .catalog-pagination { display:flex; align-items:center; justify-content:center; gap:10px; margin-top:8px; }
    .catalog-pagination button { min-height:46px; padding:0 16px; border:1px solid var(--line); border-radius:999px; background:rgba(255,255,255,.05); color:var(--text); font-weight:800; cursor:pointer; transition:.2s ease; }
    .catalog-pagination button:disabled { opacity:.35; cursor:not-allowed; }
    .catalog-page-numbers { display:flex; gap:8px; }
    .catalog-page-numbers button { width:48px; padding:0; }
    .catalog-page-numbers button.is-active { background:rgba(242,15,31,.22); border-color:rgba(242,15,31,.45); }
    @media (max-width:900px) { .catalog-sticky { padding:12px 16px; gap:10px; } .catalog-sticky-brand span { display:none; } .catalog-sticky-cta { display:none; } .preview-hero { padding:28px; } }
    @media (max-width:480px) { main { width:calc(100% - 20px); padding:32px 0; } .preview-hero { padding:24px; border-radius:26px; } .category-section { padding:18px; border-radius:26px; } .catalog-grid { gap:16px; } .product-body { padding:16px; } }
  </style>
</head>
<body>
  <header>
    <div class="catalog-sticky">
      <a class="catalog-sticky-brand" href="index.html">
        <img src="ChatGPT Image 14 mag 2026, 18_40_10.png" alt="Logo Soft Comfort">
        <span>Soft Comfort</span>
      </a>
      <nav class="catalog-sticky-nav" aria-label="Navigazione cataloghi">
        <a href="index.html">Home</a>
        <a href="catalogo-cucine.html" data-catalog-nav="cucine">Cucine</a>
        <a href="catalogo-divani.html" data-catalog-nav="divani">Divani</a>
        <a href="catalogo-camere-camerette.html" data-catalog-nav="camerette">Camerette</a>
        <a href="catalogo-camere-da-letto.html" data-catalog-nav="camere">Camere da letto</a>
        <a href="catalogo-materassi.html" data-catalog-nav="materassi">Materassi</a>
        <a href="catalogo-complementi-arredi.html" data-catalog-nav="complementi">Tavoli e sedie</a>
        <a href="catalogo-pareti-attrezzate.html" data-catalog-nav="pareti" class="is-active">Pareti attrezzate</a>
      </nav>
      <a class="catalog-sticky-cta" href="https://wa.me/393929952453?text=Salve%20Soft%20Comfort%2C%20vorrei%20una%20consulenza%20personalizzata." target="_blank" rel="noopener">Consulenza</a>
    </div>
  </header>
  <main>
    <div class="catalog-topline">
      <a class="catalog-back" href="index.html">← Torna al sito</a>
    </div>
    <section class="preview-hero">
      <span class="eyebrow">Preview catalogo</span>
      <h1>Pareti attrezzate Soft Comfort</h1>
      <p>Madie, pareti a spalla, componibili e bloccate per la zona living. Soluzioni moderne e versatili per arredare con stile e funzionalità.</p>
      <div class="catalog-shortcuts" aria-label="Vai alle categorie">
${shortcuts}
      </div>
    </section>
${sections}
  </main>
  <script>
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
      };
      targets.forEach((button) => button.addEventListener('click', () => setPage(Number(button.dataset.pageTarget), true)));
      if (previous) previous.addEventListener('click', () => setPage(Number(section.dataset.currentPage || 1) - 1, false));
      if (next) next.addEventListener('click', () => setPage(Number(section.dataset.currentPage || 1) + 1, false));
      setPage(1, false);
    });
    const returnId = getReturnTargetId();
    if (returnId) {
      const el = document.getElementById(returnId);
      if (el) { el.classList.add('is-return-focus'); el.scrollIntoView({ behavior:'smooth', block:'center' }); }
    }
    document.querySelectorAll('a[href^="camere-camerette/"], a[href^="pareti-attrezzate/"]').forEach((a) => {
      a.addEventListener('click', () => {
        const id = a.closest('[id]')?.id || '';
        if (id) sessionStorage.setItem('catalogReturnTarget', id);
      });
    });
  </script>
</body>
</html>`;

await fs.writeFile(path.join(ROOT, 'catalogo-pareti-attrezzate.html'), html, 'utf8');
console.log('Catalogo pareti creato: catalogo-pareti-attrezzate.html');
