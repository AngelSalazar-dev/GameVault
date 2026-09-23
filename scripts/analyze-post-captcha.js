const fs = require('fs');
const h = fs.readFileSync('scripts/filecrypt-post-captcha.html', 'utf8');

// Find all openLink IDs
const re1 = /openLink\s*\(\s*['"]?(\w+)['"]?/g;
const ids = new Set();
let m;
while ((m = re1.exec(h)) !== null) ids.add(m[1]);
console.log('openLink IDs:', Array.from(ids));

// Find all /Link/ references
const re2 = /\/Link\/(\w+)/g;
const refs = new Set();
while ((m = re2.exec(h)) !== null) refs.add(m[1]);
console.log('Link refs:', Array.from(refs));

// Find download buttons/links
const re3 = /class="[^"]*(?:btn|button|download|link-btn)[^"]*"/gi;
const classes = [];
while ((m = re3.exec(h)) !== null) classes.push(m[0]);
console.log('Button classes:', classes);

// Find anchor tags with Link
const re4 = /<a[^>]*href="[^"]*Link[^"]*"[^>]*>/gi;
const anchors = [];
while ((m = re4.exec(h)) !== null) anchors.push(m[0]);
console.log('Link anchors:', anchors);

// Check for iframes
const re5 = /<iframe[^>]*>/gi;
const iframes = [];
while ((m = re5.exec(h)) !== null) iframes.push(m[0]);
console.log('Iframes:', iframes.length > 0 ? iframes.slice(0, 5) : 'none');

// Search for file hosting keywords near URLs
const hosts = ['datanodes', 'filekeeper', 'fileq', 'gdrive', 'mediafire', 'mega.nz', '1fichier', 'rapidgator', 'buzzheavier', 'pixeldrain', 'krakenfiles'];
for (const host of hosts) {
  if (h.toLowerCase().includes(host)) {
    const idx = h.toLowerCase().indexOf(host);
    console.log(`Found "${host}" at pos ${idx}: ...${h.substring(Math.max(0, idx - 100), idx + host.length + 100)}...`);
  }
}

// Find all onclick handlers
const re6 = /onclick="([^"]+)"/gi;
const onclicks = new Set();
while ((m = re6.exec(h)) !== null) {
  const val = m[1];
  if (val.includes('Link') || val.includes('open') || val.includes('download')) {
    onclicks.add(val.substring(0, 200));
  }
}
console.log('Relevant onclicks:', Array.from(onclicks));
