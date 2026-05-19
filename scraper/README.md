# Soft Comfort Scraper

Ambiente isolato per analizzare i siti fornitori e generare dati prodotto senza prezzi.

## Obiettivo

Creare uno showroom digitale Soft Comfort con prodotti organizzati per categoria, descrizioni curate e immagini dei fornitori, senza modificare il sito principale durante la fase di estrazione.

## Fornitori iniziali

- Mobilturi: `https://www.mobilturi.it/`
- Netcucine: `https://www.netcucine.it/`
- MCS Mobili Camerette: `https://www.mcsmobili.com/it/camerette`

## Installazione

Da terminale, dentro la cartella `scraper`:

```bash
npm install
npx playwright install chromium
```

## Analisi pagina

```bash
npm run analyze -- https://www.mobilturi.it/ mobilturi
npm run analyze -- https://www.netcucine.it/ netcucine
npm run analyze -- https://www.mcsmobili.com/it/camerette mcs
```

Lo script genera un file JSON dentro `scraper/output/`.

## Regole di sicurezza

- Non estrarre prezzi.
- Non fare richieste massive.
- Usare delay e user-agent realistico.
- Salvare sempre prima in JSON locale.
- Non importare Playwright nel sito principale.
