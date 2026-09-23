const fs = require('fs');
const h = fs.readFileSync('scripts/filecrypt-post-captcha.html', 'utf8');

// Find the buttons section
const section = h.indexOf('class="buttons"');
if (section >= 0) {
  console.log('Buttons section (2000 chars):');
  console.log(h.substring(section, section + 2000));
} else {
  console.log('No buttons section found');
}

// Look for the window.protection section
const protIdx = h.indexOf('window protection');
if (protIdx >= 0) {
  console.log('\n\nProtection section:');
  console.log(h.substring(protIdx, protIdx + 3000));
}

// Look for any form submission results
const formIdx = h.indexOf('cform');
if (formIdx >= 0) {
  console.log('\n\nForm section:');
  console.log(h.substring(Math.max(0, formIdx - 200), formIdx + 2000));
}
