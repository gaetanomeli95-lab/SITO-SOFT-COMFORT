import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve('.');
const DATA = JSON.parse(await fs.readFile(path.join(ROOT, 'divani-build', 'divani-data.json'), 'utf8'));
const CUCINE = await fs.readFile(path.join(ROOT, 'catalogo-cucine.html'), 'utf8');

// Funzione per generare slug di categoria
const categorySlug = (name) => name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-');

// Raggruppa i divani nelle categorie Apulia Sofà: Componibili, Classici, Contemporanei
const classici = DATA.filter((d) => ['flavia', 'omar', 'ostuni'].includes(d.slug));
const contemporanei = DATA.filter((d) => ['estasi', 'kansas', 'rodi'].includes(d.slug));
const componibili = DATA.filter((d) => !['flavia', 'omar', 'ostuni', 'estasi', 'kansas', 'rodi'].includes(d.slug));

const categories = [
  { id: 'divani-componibili', title: 'Componibili', items: componibili },
  { id: 'divani-classici', title: 'Classici', items: classici },
  { id: 'divani-contemporanei', title: 'Contemporanei', items: contemporanei },
].filter((c) => c.items.length > 0);

// Paginazione: 8 prodotti per pagina
const ITEMS_PER_PAGE = 8;

const renderCard = (p, page) => {
  const cover = p.images[0];
  const id = `product-divani-${p.slug}`;
  const flagsHtml = p.flags.length > 0 ? p.flags.map((f) => `<span>${f}</span>`).join('') : '';
  return `
    <article class="product-card" id="${id}" data-catalog-item data-page="${page}">
      <a class="product-media" href="divani/${p.slug}.html">
        <img src="catalogo-assets/${cover}" alt="${p.name}" loading="lazy">
        <span>Collezione Soft Comfort</span>
      </a>
      <div class="product-body">
        <p class="product-category">Divani</p>
        <h2>${p.name}</h2>
        <h3>${p.flags.slice(0, 3).join(' · ') || 'Divano angolare componibile'}</h3>
        <p>${p.sedute ? `${p.sedute} sedute` : ''}${p.dimensioni ? ` · ${p.dimensioni} cm` : ''}</p>
        <div class="chip-list">${flagsHtml}</div>
        <a class="product-detail-link" href="divani/${p.slug}.html">Guarda dettagli e gallery</a>
        <a class="product-cta" href="https://wa.me/393929952453?text=Salve%20Soft%20Comfort%2C%20vorrei%20ricevere%20maggiori%20informazioni%20e%20una%20consulenza%20personalizzata%20per%20questa%20soluzione%3A%20${encodeURIComponent(p.name)}.%20Categoria%3A%20Divani." target="_blank" rel="noopener">Richiedi informazioni su WhatsApp</a>
      </div>
    </article>`;
};

const renderSection = (cat) => {
  const items = cat.items;
  const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);
  let html = `
  <section class="category-section" id="${cat.id}" data-catalog-section data-current-page="1">
    <div class="category-heading">
      <div>
        <p>${items.length} modelli selezionati</p>
        <h2>${cat.title}</h2>
      </div>
      ${totalPages > 1 ? `
        <div class="catalog-page-status" aria-live="polite">
          Pagina <span data-current-page-label>1</span> di ${totalPages}
        </div>` : ''}
    </div>
    <div class="catalog-grid">`;

  for (let i = 0; i < items.length; i++) {
    const page = Math.floor(i / ITEMS_PER_PAGE) + 1;
    html += renderCard(items[i], page);
  }

  html += '</div>';

  if (totalPages > 1) {
    html += `
      <nav class="catalog-pagination" aria-label="Paginazione ${cat.title}">
        <button type="button" data-page-prev>Precedente</button>`;
    for (let p = 1; p <= totalPages; p++) {
      html += `\n            <button type="button" data-page-target="${p}" ${p === 1 ? 'class="is-active"' : ''}>${p}</button>`;
    }
    html += `
        <button type="button" data-page-next>Successiva</button>
      </nav>`;
  }

  html += '\n  </section>';
  return html;
};

// Genera il contenuto HTML
let sectionsHtml = categories.map(renderSection).join('\n');

// Sostituzioni nel template cucine
let catalogo = CUCINE
  .replace(/<title>Catalogo Cucine Soft Comfort<\/title>/, '<title>Catalogo Divani Soft Comfort</title>')
  .replace(/Showroom digitale Soft Comfort<\/h1>\s*<p>Una selezione di soluzioni cucina pensata per accompagnare il cliente dalla prima ispirazione alla consulenza in showroom. Nessun prezzo online: ogni proposta viene progettata su misura da Soft Comfort.<\/p>/,
    'Showroom digitale Soft Comfort</h1>\n      <p>Una selezione di divani angolari, trasformabili e lineari pensata per accompagnare il cliente dalla prima ispirazione alla consulenza in showroom. Nessun prezzo online: ogni proposta viene progettata su misura da Soft Comfort.</p>')
  .replace(/<a href="catalogo-cucine\.html" data-catalog-nav="cucine" class="is-active">Cucine<\/a>/,
    '<a href="catalogo-cucine.html" data-catalog-nav="cucine">Cucine</a>')
  .replace(/<a href="catalogo-divani\.html" data-catalog-nav="divani">Divani<\/a>/,
    '<a href="catalogo-divani.html" data-catalog-nav="divani" class="is-active">Divani</a>')
  .replace(/<section class="category-section" id="cucine-moderne"[\s\S]*?<\/section>/g, '')
  .replace(/<section class="category-section" id="cucine-classiche"[\s\S]*?<\/section>/g, '')
  .replace(/<\/main>/, sectionsHtml + '\n  </main>');

// Inserisci lo script di scroll-return (già presente nel template cucine)
// Non serve modifica, è già identico

await fs.writeFile(path.join(ROOT, 'catalogo-divani.html'), catalogo, 'utf8');
console.log('CREATO catalogo-divani.html con', DATA.length, 'prodotti in', categories.length, 'categorie');
