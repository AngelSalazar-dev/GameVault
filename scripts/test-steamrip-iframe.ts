import * as cheerio from "cheerio";

async function main() {
  const url = "https://steamrip.com/100-orange-juice-free-download/";

  console.log("=== SECTION 1: Response Headers ===\n");
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
  });

  const headers: Record<string, string> = {};
  res.headers.forEach((v, k) => { headers[k] = v; });

  console.log("Status:", res.status);
  console.log("X-Frame-Options:", headers["x-frame-options"] || "NOT SET");
  console.log("Content-Security-Policy:", headers["content-security-policy"] || "NOT SET");
  console.log("All headers:");
  for (const [k, v] of Object.entries(headers)) {
    console.log(`  ${k}: ${v}`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  console.log("\n=== SECTION 2: Download Buttons ===\n");

  const buttons = $("a.shortc-button");
  console.log(`Found ${buttons.length} shortc-button links:\n`);

  buttons.each((i, el) => {
    const href = $(el).attr("href") || "";
    const text = $(el).text().trim();
    const parent = $(el).parent().text().trim().substring(0, 100);
    console.log(`${i + 1}. href: ${href}`);
    console.log(`   text: ${text}`);
    console.log(`   parent context: ${parent}`);
    console.log("");
  });

  console.log("=== SECTION 3: MegaDB Link Detection ===\n");

  const megadbLinks: string[] = [];
  $("a").each((_, el) => {
    const href = $(el).attr("href") || "";
    if (href.includes("megadb")) {
      megadbLinks.push(href);
    }
  });

  console.log(`MegaDB links found: ${megadbLinks.length}`);
  megadbLinks.forEach((l) => console.log(`  ${l}`));

  console.log("\n=== SECTION 4: Iframe viability ===\n");

  const xfo = headers["x-frame-options"]?.toUpperCase() || "";
  const csp = headers["content-security-policy"] || "";

  if (xfo.includes("DENY") || xfo.includes("SAMEORIGIN")) {
    console.log("CANNOT iframe: X-Frame-Options blocks it:", xfo);
  } else if (csp.includes("frame-ancestors") && (csp.includes("'none'") || csp.includes("'self'"))) {
    console.log("CANNOT iframe: CSP frame-ancestors blocks it:", csp);
  } else {
    console.log("CAN iframe: No frame-blocking headers detected");
    console.log("Solution: Embed SteamRip page in iframe, user clicks MegaDB from within iframe");
    console.log("Referrer will be steamrip.com -> MegaDB accepts it");
  }
}

main().catch(console.error);
