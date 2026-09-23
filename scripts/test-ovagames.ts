import axios from "axios";
import * as cheerio from "cheerio";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const GAME_PAGE =
  "https://ovagames.com/947977-cities-skylines-ii-ultimate-edition-multi12-elamigos.html";
const HOMEPAGE = "https://ovagames.com/";

// ─── Utility ───────────────────────────────────────────────────────
function printHeaders(headers: Record<string, string>) {
  const interesting = [
    "server",
    "x-frame-options",
    "content-security-policy",
    "cf-ray",
    "cf-cache-status",
    "x-powered-by",
    "set-cookie",
    "location",
    "x-redirect-by",
    "strict-transport-security",
    "x-content-type-options",
    "x-xss-protection",
  ];
  console.log("All headers:");
  for (const [k, v] of Object.entries(headers)) {
    console.log(`  ${k}: ${v}`);
  }
  console.log("\nInteresting header checks:");
  for (const key of interesting) {
    const val = headers[key.toLowerCase()] || "NOT SET";
    console.log(`  ${key}: ${val}`);
  }
  const isCloudflare = !!headers["cf-ray"];
  console.log(`\n  => Cloudflare detected: ${isCloudflare}`);
}

function extractHost(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return "unknown";
  }
}

// ─── SECTION A: Game Page Analysis ─────────────────────────────────
async function analyzeGamePage() {
  console.log("=".repeat(80));
  console.log("SECTION A: GAME PAGE");
  console.log("URL:", GAME_PAGE);
  console.log("=".repeat(80));

  const start = Date.now();
  let res: Awaited<ReturnType<typeof axios.get>>;

  try {
    res = await axios.get(GAME_PAGE, {
      headers: { "User-Agent": USER_AGENT },
      timeout: 30000,
      maxRedirects: 10,
      validateStatus: () => true, // don't throw on non-2xx
    });
  } catch (err: any) {
    console.error("REQUEST FAILED:", err.message);
    return;
  }

  const elapsed = Date.now() - start;
  console.log(`\nStatus: ${res.status} (${res.statusText})`);
  console.log(`Response time: ${elapsed}ms`);
  console.log(`Response size: ${JSON.stringify(res.data).length} bytes`);

  // Headers
  console.log("\n--- RESPONSE HEADERS ---");
  const headers: Record<string, string> = {};
  if (res.headers && typeof res.headers === "object") {
    for (const [k, v] of Object.entries(res.headers)) {
      headers[k] = String(v);
    }
  }
  printHeaders(headers);

  // If status is 403/503, likely Cloudflare challenge
  if (res.status === 403 || res.status === 503) {
    console.log("\n*** CLOUDFLARE BLOCK DETECTED ***");
    console.log("Page content preview (first 2000 chars):");
    console.log(String(res.data).substring(0, 2000));
    return;
  }

  const html = String(res.data);
  const $ = cheerio.load(html);

  // ─── HTML structure overview ───
  console.log("\n--- HTML STRUCTURE ---");
  console.log(`Title tag: ${$("title").text().trim()}`);
  console.log(`Meta description: ${$('meta[name="description"]').attr("content") || "NONE"}`);
  console.log(`Meta keywords: ${$('meta[name="keywords"]').attr("content") || "NONE"}`);
  console.log(`Canonical URL: ${$('link[rel="canonical"]').attr("href") || "NONE"}`);

  // Check for Cloudflare JS challenges in body
  const bodyText = $("body").text().substring(0, 500);
  if (bodyText.includes("challenge") || bodyText.includes("Just a moment")) {
    console.log("\n*** CLOUDFLARE JS CHALLENGE PAGE ***");
    console.log("Body preview:", bodyText);
    return;
  }

  // ─── Game Metadata ───
  console.log("\n--- GAME METADATA ---");

  // Title - try multiple selectors
  const titleSelectors = [
    "h1.post-title",
    "h1.entry-title",
    "h1.page-title",
    "h1.game-title",
    "h1",
    ".game-info h1",
    'h1[class*="title"]',
  ];
  for (const sel of titleSelectors) {
    const txt = $(sel).first().text().trim();
    if (txt) console.log(`  Title (from ${sel}): ${txt}`);
  }

  // Look for metadata in various common patterns
  const metadata: Record<string, string> = {};

  // Pattern 1: dt/dd pairs
  $("dl dt").each((_, dt) => {
    const key = $(dt).text().trim().toLowerCase().replace(/[:\s]+$/, "");
    const val = $(dt).next("dd").text().trim();
    if (key && val) metadata[key] = val;
  });

  // Pattern 2: table rows
  $("table tr").each((_, tr) => {
    const cells = $(tr).find("td, th");
    if (cells.length >= 2) {
      const key = $(cells[0]).text().trim().toLowerCase().replace(/[:\s]+$/, "");
      const val = $(cells[1]).text().trim();
      if (key && val && key.length < 30) metadata[key] = val;
    }
  });

  // Pattern 3: info boxes with label/value classes
  $(
    ".game-info-item, .info-box, .detail-info, .post-meta, .entry-meta, .game-meta"
  ).each((_, el) => {
    const text = $(el).text().trim();
    const match = text.match(/^([^:]+):\s*(.+)$/);
    if (match) {
      metadata[match[1].trim().toLowerCase()] = match[2].trim();
    }
  });

  // Pattern 4: list items with bold/strong labels
  $("li, p, div").each((_, el) => {
    const $el = $(el);
    const strong = $el.find("strong, b, span.label, span.bold").first();
    if (strong.length) {
      const key = strong.text().trim().toLowerCase().replace(/[:\s]+$/, "");
      const fullText = $el.text().trim();
      const val = fullText.replace(strong.text(), "").trim().replace(/^[:\s]+/, "");
      if (key && val && key.length < 30 && !metadata[key]) {
        metadata[key] = val;
      }
    }
  });

  // Pattern 5: schema.org / JSON-LD
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const json = JSON.parse($(el).html() || "");
      console.log("\n  JSON-LD schema found:");
      console.log(JSON.stringify(json, null, 2));
    } catch {}
  });

  console.log("\nExtracted metadata:");
  if (Object.keys(metadata).length === 0) {
    console.log("  (none found via standard patterns)");
  } else {
    for (const [k, v] of Object.entries(metadata)) {
      console.log(`  ${k}: ${v}`);
    }
  }

  // ─── Screenshot / Main Image ───
  console.log("\n--- MAIN IMAGE ---");
  const imageSelectors = [
    "figure.post-image img",
    "figure.single-featured-image img",
    "img.wp-post-image",
    "img.game-poster",
    "img.game-cover",
    ".game-thumb img",
    ".post-thumb img",
    'article img[alt*="cover"]',
    'article img[alt*="game"]',
    "article img",
    ".entry-content img",
  ];
  for (const sel of imageSelectors) {
    const imgs = $(sel);
    if (imgs.length) {
      imgs.each((i, img) => {
        const src =
          $(img).attr("src") ||
          $(img).attr("data-src") ||
          $(img).attr("data-lazy-src") ||
          $(img).attr("data-original") ||
          "";
        const alt = $(img).attr("alt") || "";
        if (src && !src.includes("data:image")) {
          console.log(`  [${sel}] ${src}`);
          if (alt) console.log(`    alt: ${alt}`);
        }
      });
    }
  }

  // Also check <meta> og:image
  const ogImage =
    $('meta[property="og:image"]').attr("content") || "NONE";
  console.log(`  og:image meta: ${ogImage}`);

  // ─── Download Links ───
  console.log("\n--- DOWNLOAD LINKS ---");

  // Look for download-related containers
  const downloadContainerSelectors = [
    ".download-links",
    ".dl-links",
    ".entry-content a",
    ".post-content a",
    "article a",
    ".download",
    "#download",
    ".mega-link",
    ".upload-links",
    ".file-hosting",
    "p a",
  ];

  const allDownloadLinks: { url: string; host: string; text: string; context: string }[] = [];
  const seenUrls = new Set<string>();

  // Pattern: links with download-related classes
  for (const sel of [
    "a.shortc-button",
    "a.dl-button",
    "a.download-btn",
    'a[class*="download"]',
    'a[class*="mega"]',
    'a[class*="link-"]',
    'a[href*="mega"]',
    'a[href*="gofile"]',
    'a[href*="1fichier"]',
    'a[href*="buzz"]',
    'a[href*="fileditch"]',
    'a[href*="katfile"]',
    'a[href*="rapidgator"]',
    'a[href*="filefactory"]',
    'a[href*="nitroflare"]',
    'a[href*="alfafile"]',
    'a[href*="uptobox"]',
    'a[href*="turbo"]',
    'a[href*="kshared"]',
    'a[href*="up-4"]',
    'a[href*="megaup"]',
    'a[href*="anonfiles"]',
    'a[href*="bayfiles"]',
    'a[href*="letsupload"]',
    'a[href*="krakenfiles"]',
    'a[href*="streamtape"]',
    'a[href*="pixeldrain"]',
    'a[href*="mediafire"]',
    'a[href*="zippyshare"]',
    'a[href*="hitfile"]',
    'a[href*="turbobit"]',
    'a[href*="uploaded"]',
    'a[href*="oboom"]',
    'a[href*="keep2share"]',
    'a[href*="share-online"]',
    'a[href*="filerio"]',
  ]) {
    $(sel).each((_, el) => {
      const href = $(el).attr("href") || "";
      if (!href || href === "#" || seenUrls.has(href)) return;
      if (href.startsWith("javascript:") || href.startsWith("mailto:")) return;
      seenUrls.add(href);

      const text = $(el).text().trim();
      const context =
        $(el).parent().text().trim().substring(0, 120) || "(no context)";
      const host = extractHost(href);
      allDownloadLinks.push({ url: href, host, text, context });
    });
  }

  // Also scan ALL <a> tags for any hosting service URLs
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") || "";
    if (!href || seenUrls.has(href)) return;
    if (href.startsWith("javascript:") || href.startsWith("mailto:")) return;
    const host = extractHost(href);
    const hostingPatterns = [
      "mega.nz",
      "mega.co.nz",
      "gofile.io",
      "1fichier.com",
      "buzzheavier.com",
      "buzz",
      "fileditch.com",
      "katfile.com",
      "rapidgator.net",
      "filefactory.com",
      "nitroflare.com",
      "alfafile.net",
      "uptobox.com",
      "turbobit.net",
      "hitfile.net",
      "uploaded.net",
      "oboom.com",
      "keep2share.cc",
      "share-online.biz",
      "mediafire.com",
      "zippyshare.com",
      "kshared.com",
      "up-4.net",
      "megaup.net",
      "anonfiles.com",
      "bayfiles.com",
      "letsupload.cc",
      "krakenfiles.com",
      "streamtape.com",
      "pixeldrain.com",
      "filerio.com",
    ];
    if (hostingPatterns.some((p) => href.includes(p) || host.includes(p.split(".")[0]))) {
      seenUrls.add(href);
      const text = $(el).text().trim();
      const context =
        $(el).parent().text().trim().substring(0, 120) || "(no context)";
      allDownloadLinks.push({ url: href, host, text, context });
    }
  });

  console.log(`Total download links found: ${allDownloadLinks.length}`);
  for (const link of allDownloadLinks) {
    console.log(`\n  Host: ${link.host}`);
    console.log(`  URL: ${link.url}`);
    console.log(`  Text: ${link.text}`);
    console.log(`  Context: ${link.context}`);
  }

  // ─── Categories / Tags ───
  console.log("\n--- CATEGORIES ---");
  const catSelectors = [
    ".category a",
    ".tag a",
    ".categories a",
    ".post-categories a",
    'a[rel="tag"]',
    ".entry-meta a",
    'a[href*="/category/"]',
    'a[href*="/tag/"]',
    "a[rel='category tag']",
  ];
  for (const sel of catSelectors) {
    const cats = $(sel);
    if (cats.length) {
      console.log(`  [${sel}]`);
      cats.each((_, el) => {
        console.log(`    - ${$(el).text().trim()} => ${$(el).attr("href") || ""}`);
      });
    }
  }

  // ─── Content structure for reference ───
  console.log("\n--- POST CONTENT STRUCTURE (first 3000 chars) ---");
  const content = $(
    ".entry-content, .post-content, .game-content, article .content, .single-content"
  )
    .first()
    .html();
  if (content) {
    console.log(content.substring(0, 3000));
  } else {
    console.log("  (content container not found)");
    console.log("  Trying body children:");
    $("body")
      .children()
      .slice(0, 10)
      .each((i, el) => {
        console.log(`  <${el.tagName}> class="${$(el).attr("class") || ""}" id="${$(el).attr("id") || ""}"`);
      });
  }
}

// ─── SECTION B: Homepage Analysis ──────────────────────────────────
async function analyzeHomepage() {
  console.log("\n\n" + "=".repeat(80));
  console.log("SECTION B: HOMEPAGE");
  console.log("URL:", HOMEPAGE);
  console.log("=".repeat(80));

  const start = Date.now();
  let res: Awaited<ReturnType<typeof axios.get>>;

  try {
    res = await axios.get(HOMEPAGE, {
      headers: { "User-Agent": USER_AGENT },
      timeout: 30000,
      maxRedirects: 10,
      validateStatus: () => true,
    });
  } catch (err: any) {
    console.error("REQUEST FAILED:", err.message);
    return;
  }

  const elapsed = Date.now() - start;
  console.log(`\nStatus: ${res.status} (${res.statusText})`);
  console.log(`Response time: ${elapsed}ms`);
  console.log(`Response size: ${JSON.stringify(res.data).length} bytes`);

  // Headers
  console.log("\n--- RESPONSE HEADERS ---");
  const headers: Record<string, string> = {};
  if (res.headers && typeof res.headers === "object") {
    for (const [k, v] of Object.entries(res.headers)) {
      headers[k] = String(v);
    }
  }
  printHeaders(headers);

  if (res.status === 403 || res.status === 503) {
    console.log("\n*** CLOUDFLARE BLOCK DETECTED ***");
    console.log("Page content preview (first 2000 chars):");
    console.log(String(res.data).substring(0, 2000));
    return;
  }

  const html = String(res.data);
  const $ = cheerio.load(html);

  console.log("\n--- PAGE TITLE ---");
  console.log($("title").text().trim());

  // ─── Game Listing Structure ───
  console.log("\n--- GAME LISTING STRUCTURE ---");

  // Find the main content container
  const listSelectors = [
    ".post-item",
    ".game-item",
    ".entry",
    "article",
    ".post",
    ".game",
    ".listing-item",
    ".content-item",
    ".item",
    "li.item",
    ".grid-item",
    ".card",
    ".game-card",
  ];

  for (const sel of listSelectors) {
    const items = $(sel);
    if (items.length > 0) {
      console.log(`\n  Selector "${sel}": ${items.length} items`);

      // Analyze first 3 items
      items.slice(0, 3).each((i, el) => {
        const $item = $(el);
        console.log(`\n  --- Item ${i + 1} ---`);
        console.log(`  Tag: <${el.tagName}>`);
        console.log(`  Classes: ${$item.attr("class") || "none"}`);
        console.log(`  HTML (first 500 chars):`);
        console.log($item.html()?.substring(0, 500) || "  (empty)");

        // Extract link
        const link = $item.find("a").first();
        console.log(`  First link: ${link.attr("href") || "none"}`);
        console.log(`  Link text: ${link.text().trim().substring(0, 100)}`);

        // Extract image
        const img = $item.find("img").first();
        console.log(
          `  Image src: ${img.attr("src") || img.attr("data-src") || img.attr("data-lazy-src") || "none"}`
        );
      });
    }
  }

  // ─── URL Patterns ───
  console.log("\n--- URL PATTERNS ---");
  const gameLinks: string[] = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") || "";
    // Game pages typically end with .html or have numeric IDs
    if (
      href.includes(".html") &&
      (href.includes("ovagames.com") || href.startsWith("/"))
    ) {
      gameLinks.push(href);
    }
  });
  console.log(`Game-like links found: ${gameLinks.length}`);
  console.log("Sample URLs (first 10):");
  gameLinks.slice(0, 10).forEach((u) => console.log(`  ${u}`));

  // Detect URL pattern
  if (gameLinks.length > 0) {
    const patterns = gameLinks.slice(0, 5).map((u) => {
      const cleaned = u.replace(/https?:\/\/[^/]+/, "");
      return cleaned;
    });
    console.log("\nURL path patterns:");
    patterns.forEach((p) => console.log(`  ${p}`));
  }

  // ─── Pagination ───
  console.log("\n--- PAGINATION ---");
  const paginationSelectors = [
    ".pagination",
    ".nav-links",
    ".page-numbers",
    ".pager",
    ".wp-pagenavi",
    'nav[role="navigation"]',
    ".pages",
    ".paginate",
    'a[href*="/page/"]',
    'a[href*="page="]',
    'a[href*="p="]',
    'a[href*="offset="]',
  ];
  for (const sel of paginationSelectors) {
    const items = $(sel);
    if (items.length) {
      console.log(`  [${sel}]:`);
      console.log(`    HTML: ${items.first().html()?.substring(0, 500) || "(empty)"}`);
    }
  }

  // Also look for page links in the body
  const pageLinks: string[] = [];
  $('a[href]').each((_, el) => {
    const href = $(el).attr("href") || "";
    if (/\/page\/\d+/.test(href) || /[?&]page=\d+/.test(href) || /[?&]p=\d+/.test(href)) {
      pageLinks.push(href);
    }
  });
  console.log(`\nPage navigation links found: ${pageLinks.length}`);
  const uniquePages = [...new Set(pageLinks)];
  console.log("Unique page URLs (first 10):");
  uniquePages.slice(0, 10).forEach((u) => console.log(`  ${u}`));

  // ─── Categories / Tags on Homepage ───
  console.log("\n--- CATEGORIES / TAGS ---");
  const catSelectors = [
    ".category a",
    ".tag a",
    ".categories a",
    'a[rel="tag"]',
    'a[href*="/category/"]',
    'a[href*="/tag/"]',
    ".menu a",
    "nav a",
    ".sidebar a",
    ".widget a",
  ];
  const allCats = new Set<string>();
  for (const sel of catSelectors) {
    $(sel).each((_, el) => {
      const text = $(el).text().trim();
      const href = $(el).attr("href") || "";
      if (text && text.length < 60) {
        allCats.add(`${text} => ${href}`);
      }
    });
  }
  if (allCats.size > 0) {
    console.log(`Found ${allCats.size} category/tag links:`);
    [...allCats]
      .slice(0, 30)
      .forEach((c) => console.log(`  ${c}`));
  } else {
    console.log("  (none found via standard selectors)");
  }

  // ─── Overall HTML structure ───
  console.log("\n--- BODY CHILDREN (first-level structure) ---");
  $("body")
    .children()
    .slice(0, 20)
    .each((i, el) => {
      const $el = $(el);
      console.log(
        `  <${el.tagName}> class="${$el.attr("class") || ""}" id="${$el.attr("id") || ""}" children=${$el.children().length}`
      );
    });
}

// ─── Main ──────────────────────────────────────────────────────────
async function main() {
  await analyzeGamePage();
  await analyzeHomepage();

  console.log("\n\n" + "=".repeat(80));
  console.log("DONE");
  console.log("=".repeat(80));
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
