import fs from "fs";

const listings = JSON.parse(fs.readFileSync("scripts/steamrip-all-listings.json", "utf-8"));
console.log(`Total listings: ${listings.length}`);

// Check first 3
console.log("\nSample entries:");
listings.slice(0, 3).forEach((l: any) => {
  console.log(`  title: ${l.title}`);
  console.log(`  url: ${l.url}`);
  console.log(`  slug: ${l.slug}`);
  console.log();
});

// Count how many have URLs
const withUrls = listings.filter((l: any) => l.url);
console.log(`With URLs: ${withUrls.length}`);

// Check URL patterns
const urlPatterns = new Map<string, number>();
listings.forEach((l: any) => {
  if (l.url) {
    // Extract the slug from the URL
    const match = l.url.match(/steamrip\.com\/([^/]+)/);
    if (match) {
      const pattern = match[1];
      urlPatterns.set(pattern, (urlPatterns.get(pattern) || 0) + 1);
    }
  }
});
console.log(`\nUnique URL slugs: ${urlPatterns.size}`);
