const fs = require('fs');
const h = fs.readFileSync('scripts/filecrypt-post-v4.html', 'utf8');
console.log('Size:', h.length);
console.log('Has captcha:', h.indexOf('pow-captcha') >= 0);
console.log('Has Verificación:', h.indexOf('Verificación') >= 0);
const linkRefs = h.match(/Link\/[A-Fa-f0-9]{4,}/g);
console.log('Link refs:', linkRefs);
const openLinks = h.match(/openLink\([^)]+/g);
console.log('openLink calls:', openLinks);
// Check if there are link buttons
const linkBtns = h.match(/class="[^"]*link[^"]*"/gi);
console.log('Link classes:', linkBtns ? linkBtns.slice(0, 10) : 'none');
// Check for hidden link
const hiddenLink = h.match(/href="\/Link\/[^"]+"/g);
console.log('Link hrefs:', hiddenLink);
