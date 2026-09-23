const fs = require('fs');
const h = fs.readFileSync('scripts/filecrypt-container.html', 'utf8');
const attrs = ['data-session', 'data-worker', 'data-ext', 'data-sig', 'data-px', 'data-auto-solve', 'data-text-idle', 'data-text-working', 'data-text-done', 'data-text-fail'];
for (const a of attrs) {
  const re = new RegExp(a + '="([^"]+)"');
  const m = h.match(re);
  console.log(a + ':', m ? m[1] : 'NOT FOUND');
}

// Also extract the form action and method
const formMatch = h.match(/<form[^>]+action="([^"]+)"[^>]*>/);
console.log('\nForm action:', formMatch ? formMatch[1] : 'NOT FOUND');

// Find all link IDs mentioned
const linkMatches = h.match(/openLink\s*\(\s*(\d+)/g);
console.log('\nopenLink calls:', linkMatches);

// Find any /Link/ references
const linkRefs = h.match(/\/Link\/(\w+)/g);
console.log('Link refs:', linkRefs);
