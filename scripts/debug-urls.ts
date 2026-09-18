import fs from "fs";

const listings: { title: string; url: string }[] = JSON.parse(
  fs.readFileSync("scripts/steamrip-all-listings.json", "utf-8")
);

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Check specific games
const testTitles = [
  ".hack//G.U. Last Recode",
  "100% Orange Juice",
  "Anime Shop Simulator",
  "Stranger Things VR",
];

for (const title of testTitles) {
  const key = normalizeTitle(title);
  const match = listings.find(l => normalizeTitle(l.title) === key);
  if (match) {
    const cleanUrl = match.url.replace("steamrip.com//", "steamrip.com/");
    console.log(`${title}`);
    console.log(`  key: "${key}"`);
    console.log(`  raw URL: ${match.url}`);
    console.log(`  clean URL: ${cleanUrl}`);
    console.log();
  } else {
    console.log(`${title} -> NOT FOUND in listings`);
    console.log(`  key: "${key}"`);
    // Try partial match
    const partial = listings.filter(l => normalizeTitle(l.title).includes(key.substring(0, 10)));
    console.log(`  partial matches: ${partial.length}`);
    if (partial.length > 0) {
      partial.slice(0, 3).forEach(p => {
        console.log(`    "${normalizeTitle(p.title)}" -> ${p.url}`);
      });
    }
    console.log();
  }
}
