const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

async function main() {
  // Full game page HTML analysis for metadata + images
  const res = await fetch("https://hshop.erista.me/t/2482", { headers: { "User-Agent": UA } });
  const html = await res.text();

  // Images
  const imgs = [...html.matchAll(/<img[^>]+src="([^"]+)"/g)].map(m => m[1]);
  console.log("=== images ===");
  console.log(imgs.join("\n"));

  // Meta tags
  const metas = [...html.matchAll(/<meta[^>]+>/g)].map(m => m[0]);
  console.log("\n=== meta ===");
  console.log(metas.join("\n"));

  // og:image etc
  const og = [...html.matchAll(/property="og:[^"]+" content="([^"]+)"/g)].map(m => m[0]);
  console.log("\n=== og ===");
  console.log(og.join("\n"));

  // Title + key detail fields
  const title = html.match(/<title>([^<]+)<\/title>/);
  console.log("\nTitle:", title?.[1]);

  // Look for icon/banner endpoints
  const iconPatterns = [...html.matchAll(/["'](\/(?:icon|banner|img|media|cover)[^"']*)["']/gi)].map(m => m[1]);
  console.log("\n=== icon-ish paths ===");
  console.log(iconPatterns.join("\n"));

  // Probe icon endpoints by title id 0004000000055E00
  const tid = "0004000000055E00";
  const probes = [
    `https://hshop.erista.me/img/titles/${tid}.png`,
    `https://hshop.erista.me/img/titles/${tid}.jpg`,
    `https://hshop.erista.me/icon/${tid}`,
    `https://hshop.erista.me/t/2482/icon`,
    `https://hshop.erista.me/t/2482/img`,
    `https://api.hshop.erista.me/icon/${tid}`,
    `https://hshop.erista.me/api/icon/${tid}`,
  ];
  console.log("\n=== icon probes ===");
  for (const p of probes) {
    try {
      const r = await fetch(p, { headers: { "User-Agent": UA }, redirect: "manual" });
      console.log(`${r.status} ${r.headers.get("content-type") || ""} ${p}`);
    } catch (e: any) {
      console.log(`ERR ${p}`);
    }
  }

  // Category page: parse one game entry structure
  const cat = await fetch("https://hshop.erista.me/c/games/s/north-america?count=10&offset=0", {
    headers: { "User-Agent": UA },
  });
  const catHtml = await cat.text();
  // Find first list-entry
  const entryIdx = catHtml.indexOf('list-entry');
  console.log("\n=== first list-entry snippet ===");
  console.log(catHtml.slice(entryIdx - 50, entryIdx + 1200));
}

main().then(() => process.exit(0));
