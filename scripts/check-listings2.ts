import fs from "fs";

const listings = JSON.parse(fs.readFileSync("scripts/steamrip-all-listings.json", "utf-8"));
console.log(`Total listings: ${listings.length}`);

// Check what keys each entry has
console.log("Keys in first entry:", Object.keys(listings[0]));
console.log("First entry:", JSON.stringify(listings[0], null, 2));

// Check URL format
listings.slice(0, 5).forEach((l: any) => {
  console.log(`  title: ${l.title}`);
  console.log(`  url: ${l.url}`);
  console.log();
});
