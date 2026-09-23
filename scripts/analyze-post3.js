const fs = require('fs');
const h = fs.readFileSync('scripts/filecrypt-post-captcha.html', 'utf8');

// Look for all window protection sections
const protSections = [];
const re = /window protection[^<]*/gi;
let m;
while ((m = re.exec(h)) !== null) {
  protSections.push({ pos: m.index, text: m[0].substring(0, 100) });
}
console.log('Protection sections found:', protSections.length);

// Look for download link sections
const dlIdx = h.indexOf('download');
if (dlIdx >= 0) {
  console.log('\nFirst "download" context:');
  console.log(h.substring(Math.max(0, dlIdx - 200), dlIdx + 500));
}

// Look for the hidden link
const hiddenLink = h.indexOf('display:none');
if (hiddenLink >= 0) {
  console.log('\n\nHidden element context:');
  console.log(h.substring(Math.max(0, hiddenLink - 300), hiddenLink + 300));
}

// Find all div.content sections
const contentDivs = [];
const re2 = /class="content[^"]*"/gi;
while ((m = re2.exec(h)) !== null) {
  contentDivs.push({ pos: m.index, text: m[0] });
}
console.log('\nContent divs:', contentDivs.length);

// Check if there are link buttons outside the captcha
const linkBtnSection = h.indexOf('class="link-button"');
if (linkBtnSection >= 0) {
  console.log('\nLink button section:');
  console.log(h.substring(linkBtnSection, linkBtnSection + 1000));
}

// Check if the page has a second form or a different section after captcha
const afterCaptcha = h.indexOf('</form>');
if (afterCaptcha >= 0) {
  console.log('\n\nContent after form close:');
  console.log(h.substring(afterCaptcha, afterCaptcha + 3000));
}

// Look for the actual link list
const linkListIdx = h.indexOf('class="link-list"');
const linkItemIdx = h.indexOf('class="link-item"');
const linkBtnIdx = h.indexOf('class="link-btn"');
console.log('\nlink-list:', linkListIdx >= 0 ? 'found' : 'not found');
console.log('link-item:', linkItemIdx >= 0 ? 'found' : 'not found');
console.log('link-btn:', linkBtnIdx >= 0 ? 'found' : 'not found');

// Search for all unique class names containing 'link'
const classRe = /class="([^"]*link[^"]*)"/gi;
const linkClasses = new Set();
while ((m = classRe.exec(h)) !== null) {
  linkClasses.add(m[1]);
}
console.log('\nClasses with "link":', Array.from(linkClasses));

// Check what's between the form and the end
const formEnd = h.lastIndexOf('</form>');
if (formEnd >= 0) {
  const after = h.substring(formEnd, formEnd + 5000);
  console.log('\n\n5000 chars after </form>:');
  console.log(after.substring(0, 2000));
}
