# Soft Comfort

Sito statico HTML/CSS/JavaScript per Soft Comfort.

## Avvio locale

Il progetto non richiede installazione di dipendenze.

Con Node installato, dalla cartella del progetto puoi avviare un server locale con:

```powershell
node -e "const http=require('http'),fs=require('fs'),path=require('path');const root=process.cwd();const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml'};http.createServer((req,res)=>{let u=decodeURIComponent(req.url.split('?')[0]);if(u==='/' )u='/index.html';const f=path.join(root,u);if(!f.startsWith(root)){res.writeHead(403);return res.end('Forbidden')}fs.readFile(f,(e,d)=>{if(e){res.writeHead(404);return res.end('Not found')}res.writeHead(200,{'Content-Type':types[path.extname(f).toLowerCase()]||'application/octet-stream'});res.end(d)})}).listen(8080,()=>console.log('Soft Comfort locale: http://localhost:8080'))"
```

Poi apri:

```text
http://localhost:8080
```

## Struttura principale

- `index.html`: homepage.
- `styles.css`: stile principale della homepage.
- `script.js`: interazioni generali del sito.
- `catalogo-cucine.html`: catalogo cucine.
- `catalogo-divani.html`: catalogo divani.
- `catalogo-camere-camerette.html`: catalogo camerette.
- `catalogo-camere-da-letto.html`: catalogo camere da letto.
- `catalogo-materassi.html`: catalogo materassi.
- `catalogo-assets/`: immagini dei cataloghi.
- `cucine/`, `divani/`, `materassi/`, `camere-camerette/`: schede prodotto.
- `divani-build/`: script per rigenerare il catalogo divani.

## Note importanti

- Il sito funziona già come statico, anche senza `package.json`.
- Per rigenerare il catalogo divani serve il file `divani-build/divani-data.json`.
- Su questo PC Git non risulta disponibile nel terminale: installare Git for Windows o aggiungerlo al PATH.

## Navigazione cataloghi

La voce `Divani` nel menu cataloghi deve comparire una sola volta. Il file `catalogo-divani.html` e lo script `divani-build/generate-catalogo.mjs` sono stati sistemati per evitare il doppione.
