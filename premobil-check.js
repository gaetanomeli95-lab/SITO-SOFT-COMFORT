const http = require('http');
http.get('http://www.premobil.it/camera-le-dune.php', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('HTML length:', data.length);
    const imgs = data.match(/<img[^>]+src="([^"]+)"/gi);
    console.log('Images found:', imgs ? imgs.length : 0);
    if (imgs) imgs.forEach(i => console.log('  ', i));
    const aLinks = data.match(/<a[^>]+href="([^"]+\.(jpg|png|jpeg))"/gi);
    console.log('A-img links:', aLinks ? aLinks.length : 0);
    const divBg = data.match(/background-image:\s*url\(([^)]+)\)/gi);
    console.log('BG images:', divBg ? divBg.length : 0);
    if (divBg) divBg.forEach(b => console.log('  ', b));
    const allSrc = data.match(/src="(images\/[^"]+)"/gi);
    console.log('All src:', allSrc ? allSrc.length : 0);
    if (allSrc) allSrc.forEach(s => console.log('  ', s));
  });
}).on('error', e => console.log('Error:', e.message));
